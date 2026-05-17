# Infinite queries — deep dive

`useInfiniteQuery` is for any list where you load more pages as the user scrolls (or clicks "load more"). The factory pattern is the same as for regular queries, but with `infiniteQueryOptions()` instead of `queryOptions()`.

## The standard shape (cursor-based)

```ts
// src/api/post/post.keys.ts
import { infiniteQueryOptions } from "@tanstack/react-query";
import { fetchPostsPage } from "./post.requests";

export const postQueries = {
  infinitePostsConstant: () => ["infinitePosts"] as const,

  infinitePosts: (filters?: { authorId?: string; sort?: "new" | "top" }) => {
    const limit = 40;
    return infiniteQueryOptions({
      queryKey: [...postQueries.infinitePostsConstant(), { filters, limit }] as const,
      initialPageParam: null as { id: string; createdAt: string } | null,
      queryFn: ({ pageParam }) => fetchPostsPage({ limit, filters, cursor: pageParam }),
      getNextPageParam: (lastPage) => {
        if (lastPage.length < limit) return undefined; // ← signals "no more pages"
        const last = lastPage[lastPage.length - 1];
        return { id: last.id, createdAt: last.createdAt };
      },
      gcTime: 0, // infinite caches grow per filter — drop on unmount
    });
  },
};
```

The hook:

```ts
// src/api/post/post.queries.ts
type UseInfinitePostsOptions = {
  queryConfig?: InfiniteQueryConfig<typeof postQueries.infinitePosts>;
  filters?: { authorId?: string; sort?: "new" | "top" };
};

export const useInfinitePosts = ({ queryConfig = {}, filters }: UseInfinitePostsOptions = {}) =>
  useInfiniteQuery({ ...postQueries.infinitePosts(filters), ...queryConfig });
```

## `getNextPageParam` rules

- **Return `undefined`** to signal "no more pages." Returning `null` keeps fetching — that's an easy bug.
- **Look at the last *fetched* page's length**, not its `length === limit`. If the API returns 39 items when `limit === 40`, you're at the end.
- **Cursor type matches** what you put in `initialPageParam`. Annotate `initialPageParam` with `as { id: string; cursor: string | null } | null` so the type flows into `queryFn`'s `pageParam`.
- **Cursor field type must match the API's sort key type.** If sort = createdAt (date string) but cursor is sent as a number, the server's pagination breaks.

## When the API uses offsets, not cursors

```ts
infinitePosts: () =>
  infiniteQueryOptions({
    queryKey: [...postQueries.infinitePostsConstant()] as const,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchPostsPage({ offset: pageParam, limit: 40 }),
    getNextPageParam: (lastPage, _allPages, lastOffset) =>
      lastPage.length < 40 ? undefined : lastOffset + 40,
  });
```

Same structure; just simpler. Cursors are preferred (no off-by-one bugs when items are inserted/deleted at the start of the list), but offsets are fine for read-mostly UIs.

## Updating an infinite list from a mutation

The data shape is `InfiniteData<TPage>`:

```ts
type InfiniteData<TPage> = {
  pages: TPage[];
  pageParams: unknown[];
};
```

To patch a single item across all pages:

```ts
queryClient.setQueryData<InfiniteData<Post[]>>(
  postQueries.infinitePosts(filters).queryKey,
  (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) =>
        page.map((p) => (p.id === updated.id ? updated : p))
      ),
    };
  }
);
```

To patch across **every variant** of an infinite list (different filters):

```ts
queryClient.getQueryCache()
  .findAll({ queryKey: postQueries.infinitePostsConstant() })
  .forEach((query) => {
    const data = queryClient.getQueryData<InfiniteData<Post[]>>(query.queryKey);
    if (!data) return;
    queryClient.setQueryData(query.queryKey, {
      ...data,
      pages: data.pages.map((page) =>
        page.map((p) => (p.id === updated.id ? updated : p))
      ),
    });
  });
```

Wrap that in a helper if you find yourself doing it more than twice.

To add a new item to the start of every variant:

```ts
queryClient.setQueryData<InfiniteData<Post[]>>(
  postQueries.infinitePosts(filters).queryKey,
  (old) => {
    if (!old) return { pages: [[newItem]], pageParams: [null] };
    return {
      ...old,
      pages: [[newItem, ...(old.pages[0] ?? [])], ...old.pages.slice(1)],
    };
  }
);
```

Then **invalidate** in `onSettled` to bring back the canonical server state once the optimistic write was confirmed:

```ts
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: postQueries.infinitePostsConstant() });
}
```

## `gcTime: 0` for infinite queries — almost always the right default

Every filter variant becomes its own cache entry, and each entry holds all the pages the user scrolled through. Over the lifetime of a session, that's a lot of memory.

`gcTime: 0` makes the cache evict the entry as soon as no component is subscribed to it (i.e. when the user navigates away). Pages refetch from the start next time the user opens the list — usually what you want for "feed"-style UIs.

Keep `gcTime` non-zero only when:
- Going back to the list should resume scroll position with the same pages loaded (e.g. a search results view where the user briefly inspects an item).
- The data is genuinely expensive to refetch and rarely changes.

## Loading state guards

```tsx
const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useInfinitePosts();

const handleEndReached = () => {
  if (hasNextPage && !isFetchingNextPage) fetchNextPage();
};
```

Without the `!isFetchingNextPage` check, a fast scroll can fire `fetchNextPage` multiple times before the first request returns. Some APIs cope; many duplicate items or return the same page twice.

For a `<FlatList>` / `<FlashList>`:

```tsx
<FlashList
  data={data?.pages.flat() ?? []}
  onEndReached={handleEndReached}
  onEndReachedThreshold={0.5}
/>
```

## `maxPages` for very long sessions

For chat apps, social feeds, or anything where the user might scroll for hours:

```ts
infinitePosts: () =>
  infiniteQueryOptions({
    // ...
    maxPages: 5,                              // keep only the 5 most recent pages
    getPreviousPageParam: (firstPage) => ...  // required when maxPages is set + scrolling up
  });
```

With `maxPages`, when a new page loads, the oldest page is discarded. Bounded memory at the cost of "scroll back up to the start" requiring re-fetches.

Skip `maxPages` for finite lists (search results, paginated tables) — there's no upside.

## Anti-patterns

```ts
// ❌ Returning null instead of undefined → infinite loop of fetches
getNextPageParam: (last) => (last.length < limit ? null : nextCursor),

// ❌ Cursor type drift — API sorts by date, you return number
getNextPageParam: (last) => last.length < limit ? undefined : last[last.length - 1].id,

// ❌ Calling fetchNextPage in a tight loop without isFetchingNextPage guard
useEffect(() => { if (hasNextPage) fetchNextPage(); }, [hasNextPage]); // → bursts

// ❌ Inlining the queryKey at the call site — same factory-duplication anti-pattern
useInfiniteQuery({ queryKey: ["posts"], queryFn: ... });

// ❌ Keeping gcTime: Infinity on every infinite list → memory grows forever
```
