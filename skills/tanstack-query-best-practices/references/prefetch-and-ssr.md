# Prefetch and SSR — deep dive

Prefetching is "fetch the data **before** the component that needs it mounts." It's a perceived-performance feature: the network round-trip happens during otherwise-idle time, and by the time `useQuery` mounts, the cache already has the answer.

All prefetch APIs accept a `queryOptions()` return directly — that's the whole reason you defined the factory.

## On user intent (hover, focus, mousedown)

The cheapest big win:

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { postQueries } from "@/api/post";

function PostLink({ id, children }: { id: string; children: React.ReactNode }) {
  const qc = useQueryClient();
  const prefetch = () => qc.prefetchQuery(postQueries.post(id));
  return (
    <Link to={`/posts/${id}`} onMouseEnter={prefetch} onFocus={prefetch}>
      {children}
    </Link>
  );
}
```

`prefetchQuery` is a no-op if the data is fresh (within `staleTime`). On hover it kicks off a request; by the time the user clicks (~200ms later), the data is usually ready. Reasonably free perceived-performance.

For lists where every row is a link, debounce or limit (you don't want to prefetch 50 items because the user scrolled past).

## On route transition

For route-based frameworks (TanStack Router, Next.js App Router, Expo Router) prefetch in the route's loader:

```ts
// TanStack Router
export const Route = createFileRoute("/posts/$postId")({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(postQueries.post(params.postId)),
  component: PostScreen,
});
```

`ensureQueryData` is the "fetch if missing, return cache if present" primitive — exactly what a route loader wants. It returns the resolved data, so the route can also use it directly (e.g. for the page title) without re-subscribing.

## `prefetchQuery` vs. `ensureQueryData` vs. `fetchQuery`

| API                  | What it does                                     | Returns           | Use for                          |
|----------------------|--------------------------------------------------|-------------------|----------------------------------|
| `prefetchQuery`      | Fetch into cache. No-op if fresh. Never throws.  | `Promise<void>`   | Hover/focus prefetch (best-effort) |
| `ensureQueryData`    | Return cached data if fresh, otherwise fetch.    | `Promise<TData>`  | Route loaders, async boundaries  |
| `fetchQuery`         | Always fetch, throws on error.                   | `Promise<TData>`  | Imperative one-off fetches       |
| `setQueryData`       | Write into cache from data you already have.     | `TData`           | Seed from another endpoint       |

Almost always: **`prefetchQuery` for user intent, `ensureQueryData` for route loaders.** Reach for `fetchQuery` only when you specifically need the throw-on-error behavior.

## Why prefetch needs `staleTime`

```ts
// Best practice: same staleTime as the eventual useQuery
qc.prefetchQuery(postQueries.post(id));
```

`postQueries.post(id)` carries its own `staleTime` (defined in the factory). Prefetched data immediately enters the cache with that `staleTime`. If you prefetch with no `staleTime` and use a `staleTime` later, the prefetched data is already considered "fresh" only until the next render, and you might refetch anyway. Defining `staleTime` in the factory makes both sides agree by construction.

## SSR — dehydrate / hydrate

For server-rendered apps (Next.js, Remix, TanStack Start), the flow is:

1. On the server, render with a fresh `QueryClient`, prefetch all the queries the page needs, then dehydrate.
2. Embed the dehydrated state in the HTML.
3. On the client, create a new `QueryClient`, hydrate it with the embedded state, then render.

```tsx
// Next.js App Router example
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";

export default async function PostPage({ params }: { params: { id: string } }) {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery(postQueries.post(params.id));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostView />
    </HydrationBoundary>
  );
}
```

Three things that catch people:

1. **One `QueryClient` per request on the server.** A shared client leaks data between users. Either create one per request, or pass it via React context that's created per request.
2. **Higher `staleTime` on the server.** SSR-fetched data shouldn't immediately refetch on hydrate. `staleTime: 1000 * 60` (1m) is a reasonable floor — anything less than the round-trip time makes the prefetch pointless.
3. **The dehydrated state has to be `JSON.stringify`-safe.** Same serialization rules as query keys: no `Date`, `Map`, `Set`, class instances.

### `HydrationBoundary` and per-component prefetch

You can also prefetch per-component on the server (instead of in the route loader). Wrap each chunk that prefetches its own data in a `HydrationBoundary`. Useful when different parts of a page have different data needs and you don't want to wait for all of them in a single loader. The shape is the same — `prefetchQuery` then `dehydrate` then pass through state.

## Critical SSR notes from upstream

- **`staleTime` on server should be > 0** so the client doesn't immediately refetch the same data you just prefetched. (`ssr-stale-time-server`)
- **Use `<HydrationBoundary>`, not the older `<Hydrate>` API** (renamed in v5). (`ssr-hydration-boundary`)
- **Stream-friendly hydration**: if your framework streams (Next.js App Router, TanStack Start), nested `HydrationBoundary` components hydrate as their HTML arrives. Works out of the box with the per-component prefetch pattern above.

See `references/upstream/rules/ssr-*.md` for full details.

## Anti-patterns

```ts
// ❌ Inlining the query definition in the prefetch call — duplicates the staleTime / queryFn
qc.prefetchQuery({ queryKey: ["post", id], queryFn: () => fetch(...) });

// ❌ Prefetching everything in a single big loader and blocking the page
loader: async () => Promise.all([
  qc.ensureQueryData(postQueries.post(id)),
  qc.ensureQueryData(commentQueries.byPost(id)),
  qc.ensureQueryData(userQueries.recommended()),       // ← not needed for first paint
]),

// ❌ Sharing one QueryClient across SSR requests
const queryClient = new QueryClient(); // module-level — leaks users' data

// ❌ Forgetting staleTime on server, then refetching on hydrate
// → kills the perceived-performance benefit of SSR
```
