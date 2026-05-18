---
name: tanstack-query-best-practices
description: >
  Production conventions for TanStack Query: five-file feature folder
  (types/requests/keys/queries/mutations), `queryOptions()` factory keys with
  a "Constants" prefix for broad invalidation, `QueryConfig`/`MutationConfig`
  helpers, optimistic updates with rollback, and `useInfiniteQuery` patterns.
  Triggers on tanstack query, react-query, useQuery, useMutation,
  useInfiniteQuery, queryOptions, queryKey, invalidateQueries, queryClient,
  optimistic updates, queries.ts, mutations.ts, server state, or any task
  that adds, refactors, or reviews data-fetching hooks — even when the user
  doesn't name the library.
allowed-tools: Read, Grep, Glob, Edit, Write
---

# TanStack Query — Production Conventions

This skill captures the conventions for using **TanStack Query** (formerly React Query) in a real production codebase. It sits **on top of** the upstream rules-by-category skill written by [@DeckardGer](https://github.com/DeckardGer) — that skill covers the *what* and *why* of each individual rule (query keys, caching, mutations, error handling, prefetching, infinite queries, SSR, parallel queries, performance, offline). This skill covers the **how** of organizing all of that day-to-day in an app: where each piece lives, what the file looks like, how mutations talk to queries, what the defaults are.

When working on tasks involving data fetching, server state, `useQuery`, `useMutation`, `queryClient`, or anything else in the TanStack Query surface area, apply these conventions by default. For anything not covered here (individual rule rationale, SSR edge cases, offline persistence config, retry tuning), read the upstream rules under `references/upstream/rules/*.md`.

---

## The big picture

TanStack Query is the source of truth for **server state**. Local UI state belongs in `useState` / Zustand / context. The mental model:

- **One feature, one folder.** Everything about a domain (auth, posts, comments, trees, orders) lives together — types, request functions, key factory, query hooks, mutation hooks — so future-you can grep one path and see the whole shape.
- **Keys are objects, not strings.** `queryOptions({ queryKey, queryFn, ... })` is the only place a key gets defined. Hooks consume the factory; mutations invalidate via the factory. No `["users", id]` literal ever appears at a call site.
- **Hooks call typed functions, not `fetch`.** A `<feature>.requests.ts` file exposes typed async functions. Hooks compose `useQuery` / `useMutation` around them. This keeps network details, retries, and auth headers out of components.
- **Mutations own invalidation.** After a successful write, the mutation hook invalidates the queries it touched — via the key factory, never via stringly-typed keys. Optimistic updates follow the cancel → snapshot → update → rollback-on-error pattern.

If you're tempted to call `fetch` inside a component, or paste `["users"]` into a `queryKey` somewhere in a screen file, stop — those are both signals that one of the conventions below isn't being applied.

---

## The conventions (with rationale)

### 1. One folder per feature, five files (+ barrel)

```
src/api/<feature>/
├── <feature>.types.ts      # Types (preferably inferred from a Zod schema or OpenAPI)
├── <feature>.requests.ts   # Typed async functions — the only place network calls live
├── <feature>.keys.ts       # Query-key factory using queryOptions() / infiniteQueryOptions()
├── <feature>.queries.ts    # useQuery / useInfiniteQuery hooks
├── <feature>.mutations.ts  # useMutation hooks + invalidation
└── index.ts                # Barrel: `export *` from each file
```

**Why:** Putting all of a domain's network surface in one folder gives you a single grep target ("show me everything we do with orders"), keeps changes local (a new endpoint touches only its feature folder), and prevents the slow drift where query keys, request functions, and types end up scattered across unrelated screen files. The split into five files matters because each file answers a different question — "what shape?" "how do I fetch?" "how do I cache?" "how do I read?" "how do I write?" — and conflating them grows monolith files that nobody wants to edit.

**How to apply:** When you need a new endpoint, create or extend the matching feature folder. If you're adding the third call to a feature, the folder almost always already exists. Don't create `useFetchX` hooks in random component folders.

### 2. Every key goes through a `queryOptions()` factory — never a literal at the call site

```ts
// ✅ <feature>.keys.ts
import { queryOptions } from "@tanstack/react-query";
import { fetchAccount, searchAccounts } from "./auth.requests";

export const authQueries = {
  // Constant prefix — `as const` lives ONLY here (see rule 3).
  all: () => ["auth"] as const,

  account: () =>
    queryOptions({
      queryKey: [...authQueries.all(), "account"],
      queryFn: fetchAccount,
      staleTime: 1000 * 60 * 15, // 15 min — account data is stable
    }),

  searchAccounts: (term: string, verifiedOnly?: boolean) =>
    queryOptions({
      queryKey: [...authQueries.all(), "search", term, verifiedOnly],
      queryFn: () => searchAccounts(term, verifiedOnly),
      enabled: term.length > 0,
    }),
};
```

```ts
// ✅ <feature>.queries.ts — spread the factory into useQuery
export const useAccount = ({ queryConfig = {} }: UseAccountOptions = {}) =>
  useQuery({ ...authQueries.account(), ...queryConfig });

// ❌ never inline a key — even "just this one time"
useQuery({ queryKey: ["account"], queryFn: fetchAccount });
```

**Why:** `queryOptions()` makes the definition reusable everywhere TanStack accepts options — `useQuery`, `useSuspenseQuery`, `prefetchQuery`, `ensureQueryData`, `getQueryData`, `setQueryData`. Stringly-typed keys at the call site fragment the cache: one typo (`["accounts"]` vs `["account"]`) and you have two queries instead of one. The factory also gives you exact types: `authQueries.account().queryKey` is typed as `readonly ["account"]`, not `QueryKey`. Anything that takes a `queryKey` or `queryOptions` (invalidate, setQueryData, prefetchQuery) gets typed inputs for free.

**How to apply:** Anywhere you'd write a literal `queryKey`, define it in the factory instead and spread the factory result. The hook file should never contain a `queryKey` line of its own.

### 3. Use the "Constants" prefix pattern for broad invalidation — `as const` only on the prefix

```ts
export const treeQueries = {
  // The Constant — return *just the prefix*. `as const` lives HERE and only here.
  all: () => ["trees"] as const,

  // The Variants — full keys spread the constant and add their own params.
  // No `as const` on these: the readonly tuple is inherited from `all()` and
  // queryOptions() infers the rest. Adding `as const` is redundant noise.
  trees: (filters?: string) =>
    queryOptions({
      queryKey: [...treeQueries.all(), "list", filters],
      queryFn: () => fetchTrees(filters),
    }),
  infiniteTrees: (filters?: string) =>
    infiniteQueryOptions({
      queryKey: [...treeQueries.all(), "infinite", { filters, limit: 40 }],
      queryFn: ({ pageParam }) => fetchInfiniteTrees(40, filters, pageParam),
      // ...
    }),
  treesCount: ({ filters }: { filters?: string } = {}) =>
    queryOptions({
      queryKey: [...treeQueries.all(), "count", filters],
      queryFn: () => fetchTreesCount({ filters }),
    }),
};
```

In a mutation, invalidate the whole family in one line:

```ts
queryClient.invalidateQueries({ queryKey: treeQueries.all() });
// → invalidates every cached `["trees", ...]` variant: list, infinite, count, everything
```

Or invalidate one sub-tree:

```ts
queryClient.invalidateQueries({ queryKey: [...treeQueries.all(), "infinite"] });
// → only the infinite variants
```

**Why:** Real list endpoints have filter/sort/pagination args, so you end up with N cached variants of the same logical list. After a write (delete/transfer/assign), you want to invalidate **all** of them — passing a prefix array to `invalidateQueries` does exactly that. The `as const` on `all()` is what gives you the typed readonly tuple every variant inherits via spread; repeating `as const` on each variant adds nothing because `queryOptions()` already infers a precise key type from its argument. Keeping the assertion in exactly one place is the rule that makes the pattern self-evident — when you see `as const`, you know you're looking at a prefix.

**How to apply:** For every feature folder, the key factory has an `all: () => [<feature>] as const` entry. Every other entry spreads `all()` and appends its own segments (`"list"`, `"detail"`, `"infinite"`, etc.) without `as const`. Mutations invalidate via `all()` or `[...all(), "subtree"]`; reads call the specific factory.

### 4. Type helpers: `QueryConfig` and `MutationConfig` — define once, reuse everywhere

```ts
// src/lib/react-query.ts (or wherever your shared lib lives)
import type { UseMutationOptions } from "@tanstack/react-query";

export type QueryConfig<T extends (...args: any[]) => any> =
  Omit<ReturnType<T>, "queryKey" | "queryFn">;

export type InfiniteQueryConfig<T extends (...args: any[]) => any> =
  Omit<ReturnType<T>, "queryKey" | "queryFn" | "getNextPageParam" | "initialPageParam">;

export type ApiFnReturnType<Fn extends (...args: any) => Promise<any>> =
  Awaited<ReturnType<Fn>>;

export type MutationConfig<Fn extends (...args: any) => Promise<any>> =
  UseMutationOptions<
    ApiFnReturnType<Fn>,
    Error,
    Parameters<Fn>["length"] extends 0 ? void : Parameters<Fn>[0]
  >;
```

Then in every hook:

```ts
type UseAccountOptions = { queryConfig?: QueryConfig<typeof authQueries.account> };

export const useAccount = ({ queryConfig = {} }: UseAccountOptions = {}) =>
  useQuery({ ...authQueries.account(), ...queryConfig });
```

```ts
type UseUpdateAccountOptions = { mutationConfig?: MutationConfig<typeof updateAccount> };

export const useUpdateAccount = ({ mutationConfig }: UseUpdateAccountOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};
  return useMutation({
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: authQueries.account().queryKey });
      onSuccess?.(...args);
    },
    ...rest,
    mutationFn: updateAccount,
  });
};
```

**Why:** Without these helpers, every hook reinvents the same option type by hand — `Omit<UseQueryOptions<...>, "queryKey" | "queryFn">` repeated dozens of times, with the generic args wrong half the time. With the helpers, the call site gets fully-typed `data`, `variables`, and `error` inferred from the request function's signature, and consumers can pass any normal `useQuery` / `useMutation` option (e.g. `staleTime`, `retry`, `enabled`, `onSuccess`) without leaking the request function's internals.

**How to apply:** Drop the four helpers into a shared `lib/react-query.ts` once per project. Every query hook accepts `{ queryConfig }`; every mutation hook accepts `{ mutationConfig }`. Don't pass loose params for things `useQuery` already accepts (`enabled`, `staleTime`, etc.) — they belong inside `queryConfig`.

### 5. Hooks call typed request functions — never inline `fetch` or `axios.get`

```ts
// ✅ <feature>.requests.ts
import { api } from "../../lib/axios";
import type { AccountProfile, UpdateAccountFields } from "./auth.types";

export const fetchAccount = async () => {
  const res = await api.get<AccountProfile>("/account");
  return res.data.data;
};

export const updateAccount = async (data: UpdateAccountFields) => {
  const res = await api.patch<AccountProfile>("/account", data);
  return res.data.data;
};
```

```ts
// ❌ never inline a network call in a hook or component
useQuery({
  queryKey: ["account"],
  queryFn: async () => (await fetch("/api/account")).json(),
});
```

**Why:** Inline calls bypass your axios/fetch wrapper, which is where base URLs, auth headers, error normalization, response unwrapping, retry, and logging live. They also mean the return type is `any` unless you remember to annotate every call site. A typed `requests.ts` function is grep-able, reusable across queries/mutations/prefetch, and has one source of truth for the network contract.

**How to apply:** Whenever you reach for `fetch`/`axios` inside a `queryFn` or `mutationFn`, stop and add a function in `<feature>.requests.ts` instead. Hooks should look declarative; they should not contain `await fetch(...)`.

### 6. Hooks export named `useX`, accept an options object, never positional args for query config

```ts
// ✅
type UseTreeOptions = { queryConfig?: QueryConfig<typeof treeQueries.tree> };

export const useTree = (publicId: string, { queryConfig = {} }: UseTreeOptions = {}) =>
  useQuery({
    ...treeQueries.tree(publicId),
    ...queryConfig,
    enabled: !!publicId && queryConfig.enabled !== false,
  });

// ❌
export function useTree(publicId, enabled, staleTime) { /* ... */ }
export default useTree;
```

**Why:** Required *domain* args (the thing you're fetching by — `publicId`, `userId`, `filter`) are first-class positional/destructured params. Anything that's a knob on the query itself (`enabled`, `staleTime`, `refetchInterval`, `select`) goes inside `queryConfig`. Mixing them produces hooks with five positional booleans nobody can read.

**How to apply:** When a hook needs to combine a default `enabled` (e.g. "only run when token exists") with a user-provided one, use `enabled: !!token && queryConfig.enabled !== false` — let the consumer turn it off explicitly, but never on (the precondition still has to hold).

### 7. Mutation `onSuccess`: do the default work first, then call the user's callback

```ts
export const useUpdateAccount = ({ mutationConfig }: UseUpdateAccountOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};

  return useMutation({
    onSuccess: (...args) => {
      // 1. Default behavior owned by the hook
      queryClient.invalidateQueries({ queryKey: authQueries.account().queryKey });

      // 2. User-supplied callback (e.g. close a modal, show a toast)
      onSuccess?.(...args);
    },
    ...rest,
    mutationFn: updateAccount,
  });
};
```

**Why:** Two things happen on a successful mutation: cache reconciliation (the hook's job) and UX (the consumer's job — toast, navigation, modal close). If you spread `mutationConfig` raw, the consumer's `onSuccess` replaces yours and the cache never invalidates. Pulling `onSuccess` out, running yours first, then calling theirs, preserves both.

**How to apply:** Every mutation hook destructures `{ onSuccess, ...rest }` from `mutationConfig`, runs invalidation/setQueryData, then `onSuccess?.(...args)`. Same pattern works for `onError` if the hook owns rollback. Place `...rest` **before** `mutationFn` so consumers can't accidentally overwrite the function.

### 8. Optimistic updates: cancel → snapshot → update → rollback on error → reconcile on success

```ts
type UpdateContext = { previous?: TreeProfile };

useMutation({
  onMutate: async ({ publicId, data }): Promise<UpdateContext> => {
    // Stop any in-flight refetches that could overwrite our optimistic write
    await queryClient.cancelQueries({ queryKey: treeQueries.tree(publicId).queryKey });

    // Snapshot — what we'll roll back to if the request fails
    const previous = queryClient.getQueryData<TreeProfile>(treeQueries.tree(publicId).queryKey);

    // Optimistic write
    if (previous) {
      queryClient.setQueryData<TreeProfile>(treeQueries.tree(publicId).queryKey, {
        ...previous,
        ...data,
      });
    }

    return { previous };
  },

  onError: (_err, { publicId }, context) => {
    if (context?.previous) {
      queryClient.setQueryData(treeQueries.tree(publicId).queryKey, context.previous);
    }
  },

  onSuccess: (server, { publicId }) => {
    // Reconcile with the server's authoritative shape
    queryClient.setQueryData(treeQueries.tree(publicId).queryKey, server);
    queryClient.invalidateQueries({ queryKey: treeQueries.treesList() }); // refresh lists
  },

  mutationFn: updateTreeInfo,
});
```

**Why:** Without `cancelQueries`, an in-flight refetch can land after your optimistic write and overwrite it. Without a snapshot, you can't roll back on error. Without `onSuccess` reconciliation, the optimistic data sits in the cache even if the server returned something different (server-side timestamps, computed fields, normalized strings). Skipping any of the three steps produces UI that "looks right until you refresh" — a classic source of trust-eroding bugs.

**How to apply:** Reach for optimistic updates when the result is predictable (toggle, rename, reorder, like/unlike). Skip them when the server's response shape is hard to predict (server-generated IDs that the next view needs, validation that may transform input) — `onSuccess` invalidation is simpler and still feels instant on a fast network.

### 9. Invalidate via the key factory — never with a stringly-typed prefix

```ts
// ✅
queryClient.invalidateQueries({ queryKey: authQueries.account().queryKey });
queryClient.invalidateQueries({ queryKey: treeQueries.infiniteTreesConstant() });

// ❌
queryClient.invalidateQueries({ queryKey: ["account"] });
queryClient.invalidateQueries({ queryKey: ["infiniteTrees"] });
```

**Why:** Stringly-typed prefixes break silently. Rename the feature, change a key shape, change an arg's serialization — the literal in the mutation file stays valid TypeScript and silently invalidates nothing. The factory call goes through the type system, so a rename refactor flags every call site.

**How to apply:** If you find yourself writing a `queryKey: [...]` literal anywhere outside the keys file, stop and route it through the factory. The exceptions are extremely rare (e.g. a generic logout that calls `queryClient.clear()` and doesn't need keys at all).

### 10. Sensible defaults at the QueryClient level — override per-query only when needed

```ts
// src/lib/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,           // 1 min — most data is "fresh enough" for a minute
      gcTime: 1000 * 60 * 10,         // 10 min — inactive cache survives navigation
      retry: 2,
      refetchOnWindowFocus: false,    // RN apps; for web, decide per app
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,                       // mutations are usually not safe to retry blindly
    },
  },
});
```

Per-query overrides for the exceptions:

```ts
// Stable reference data — invalidated only via mutations
species: () => queryOptions({ queryKey: ["species"], queryFn: fetchSpecies,
  staleTime: 1000 * 60 * 60, meta: { persist: true } as const }),

// Filter/pagination results — don't survive unmount
mapTrees: (params) => queryOptions({ queryKey: [...], queryFn: ..., gcTime: 0 }),

// Real-time-ish data
liveCount: () => queryOptions({ queryKey: ["liveCount"], queryFn: ..., staleTime: 0 }),
```

**Why:** App-wide defaults shape behavior for the 80% case; per-query overrides handle the long tail. With `staleTime: 0` (the library default), every mount refetches — bad UX, wasted network. With `staleTime: Infinity`, data never updates without an explicit invalidate — also bad. A minute or so is the sweet spot for most apps, with longer values for true reference data and `0` for queries that should always refetch on mount.

**How to apply:** Set defaults once at the client. Set per-query `staleTime` only when the volatility is meaningfully different from the default — and document why with a one-line comment if it's not obvious.

### 11. `meta: { persist: true } as const` for queries that should survive cold start

```ts
species: () =>
  queryOptions({
    queryKey: ["species"],
    queryFn: fetchSpecies,
    meta: { persist: true } as const,
  }),
```

With a persister configured to filter on `query.meta?.persist`:

```ts
const persister = createAsyncStoragePersister({ storage: AsyncStorage });

persistQueryClient({
  queryClient,
  persister,
  dehydrateOptions: {
    shouldDehydrateQuery: (q) => q.meta?.persist === true,
  },
});
```

**Why:** Persisting *everything* fills storage with transient data (search results, paginated views, ephemeral filters). Persisting *nothing* gives you a blank app for two seconds on every cold start. Opting in per-query via `meta.persist` keeps reference/profile/list-of-things data warm and leaves the noisy stuff out. `as const` narrows the literal so TS won't widen `meta` to `Record<string, unknown>` and lose the boolean.

**How to apply:** Mark a query `meta: { persist: true } as const` when (a) it's data you'd want visible immediately on cold start, and (b) it's not so volatile that stale data is worse than no data. Account info, reference lists, user preferences: yes. Search results, infinite scroll pages, map viewport queries: no.

### 12. Prefer `queryOptions()` for **all** read paths — `prefetchQuery`, `ensureQueryData`, `setQueryData`

```ts
// Prefetch on hover/intent — same factory, no duplication
await queryClient.prefetchQuery(treeQueries.tree(publicId));

// Read-or-fetch — used in route loaders / async boundaries
const tree = await queryClient.ensureQueryData(treeQueries.tree(publicId));

// Read what's already cached, no fetch
const cached = queryClient.getQueryData<TreeProfile>(treeQueries.tree(publicId).queryKey);

// Write — after a mutation, or to seed from another endpoint
queryClient.setQueryData(treeQueries.tree(publicId).queryKey, fullTree);
```

**Why:** `queryOptions()` is the only definition of "what is this query, how do I run it, what are its settings." Every API that takes options accepts the factory result directly — no second definition, no mismatched staleTime between a `useQuery` and a `prefetchQuery`. This single-source-of-truth property is the entire reason `queryOptions` exists.

**How to apply:** In route loaders, in `onMutate` (`getQueryData`), in mutation `onSuccess` (`setQueryData`), in hover prefetches — always reach for the factory. If you're typing `queryKey: [...]` by hand outside the keys file, you're doing it wrong.

### 13. `useInfiniteQuery` via `infiniteQueryOptions()` with explicit `pageParam` typing

```ts
infiniteTrees: (filters?: string) => {
  const limit = 40;
  return infiniteQueryOptions({
    queryKey: [...treeQueries.infiniteTreesConstant(), { filters, limit }] as const,
    queryFn: ({ pageParam }) => fetchInfiniteTrees(limit, filters, pageParam),
    initialPageParam: null as { id: number; cursor: string | number | null } | null,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < limit) return undefined;
      const last = lastPage[lastPage.length - 1];
      return { id: last.id, cursor: last.createdAt };
    },
    gcTime: 0, // infinite scroll caches grow unboundedly — drop when unmounted
  });
};
```

**Why:** `infiniteQueryOptions()` typechecks the relationship between `initialPageParam`, `getNextPageParam`'s return, and `queryFn`'s `pageParam` arg — get one wrong and TS will tell you. Putting `gcTime: 0` on infinite queries is a default unless you have a reason to keep paged data around: every filter change creates a new cache entry, and they pile up.

**How to apply:** Cursor-based pagination is almost always the right default — return `undefined` from `getNextPageParam` when the last page is short. For offset/page-number APIs, the page param can just be a number; the structure is the same.

### 14. One feature domain per file — never mix `auth.queries.ts` with order code

```ts
// ✅ auth.queries.ts contains only account/auth hooks
// ✅ order.queries.ts contains only order hooks

// ❌ "shared" queries file that drifts into a god-module
//    Symptom: file > 500 lines, multiple unrelated feature names, mixed imports
```

**Why:** Domain colocation is the whole reason this folder layout works. Once a file mixes domains, refactoring one becomes a merge-conflict factory, and the file's purpose ("anything network-y") provides no useful signal.

**How to apply:** When unsure where a new endpoint goes, ask "what feature does this belong to?" If you'd describe it to another engineer as "the orders endpoints," it goes in `order/`. Cross-feature aggregations (e.g. dashboard summary) get their own feature folder (`dashboard/`).

### 15. `enabled` guards: always boolean, always handle the "not ready yet" case

```ts
// ✅ guard chained dependencies
export const useAccount = ({ queryConfig = {} }: UseAccountOptions = {}) => {
  const token = useAuthToken();
  return useQuery({
    ...authQueries.account(),
    ...queryConfig,
    enabled: !!token && queryConfig.enabled !== false,
  });
};

// ✅ guard on a string param
export const useTree = (publicId: string, { queryConfig = {} }: UseTreeOptions = {}) =>
  useQuery({
    ...treeQueries.tree(publicId),
    ...queryConfig,
    enabled: !!publicId && queryConfig.enabled !== false,
  });
```

**Why:** TanStack runs a query as soon as it's mounted unless `enabled` is `false`. If you don't guard a query that depends on something (a token, an id, a filter), it fires immediately, hits an error, and retries — visible as 401s in the console and a flicker of error UI before the data is actually requested. Coercing to boolean (`!!x`) handles `undefined` / `""` / `0` cleanly.

**How to apply:** Any query whose `queryFn` would fail without a particular value gets an `enabled` guard for that value. Combine with the consumer's `queryConfig.enabled` using `&&` so they can turn it off but not on.

---

## Default settings cheat sheet

| Setting                | Default            | When to override                                                                 |
|------------------------|--------------------|----------------------------------------------------------------------------------|
| `staleTime`            | `1000 * 60` (1m)   | Reference data → `1000 * 60 * 15` (15m) or longer. Real-time → `0`.              |
| `gcTime`               | `1000 * 60 * 10`   | Infinite scroll / large lists → `0` (drop on unmount).                           |
| `retry`                | `2`                | Mutations → `0`. Idempotent reads with flaky network → `3`.                      |
| `refetchOnWindowFocus` | `false` (RN) / per-app (web) | Web apps where multi-tab freshness matters → `true`.                   |
| `refetchOnReconnect`   | `true`             | Almost never override.                                                            |
| `placeholderData`      | unset              | Paginated / filtered views → `keepPreviousData` to avoid flicker on filter change.|
| `meta.persist`         | unset              | Set `true` for reference data / profile / lists you want warm on cold start.     |

---

## When to read which reference

Conventions in this skill cover the *how*. The upstream skill covers the *why* at the rule level — read it for deeper detail on any one topic.

```
Need full rationale on a specific rule (caching, invalidation, prefetching, SSR, retry, offline)
└─ references/upstream/SKILL.md           (rule index)
└─ references/upstream/rules/<rule>.md    (one rule per file)

Designing or refactoring a query-key factory
└─ references/query-key-factory.md

Writing a mutation, especially with optimistic updates
└─ references/mutations-and-invalidation.md

Prefetching on hover/route transitions, ensureQueryData, SSR hydration
└─ references/prefetch-and-ssr.md

Infinite scrolling / cursor pagination
└─ references/infinite-queries.md

Looking at a real file layout end-to-end
└─ examples/auth.{requests,keys,queries,mutations}.ts
└─ examples/posts.queries.ts
```

---

## Critical rules from upstream (echoed for visibility)

These are inherited from the upstream skill — they're the rules that *silently* cause cache bugs if violated. Worth keeping in mind even when you're "just" applying conventions:

1. **Query keys are arrays, fully serializable, and include every dependency.** A query whose result depends on `userId` and `filter` must have both in the key. (`qk-array-structure`, `qk-include-dependencies`, `qk-serializable`)
2. **Keys are organized hierarchically** — entity → id → filters — so prefix-based invalidation works. (`qk-hierarchical-organization`)
3. **`staleTime` and `gcTime` are not the same.** Stale = "may refetch on next use"; gc = "evict from cache after N ms of being unused." (`cache-stale-time`, `cache-gc-time`)
4. **Targeted invalidation > broad invalidation.** Invalidate the smallest scope that matches what you changed. (`cache-invalidation`)
5. **Optimistic updates require rollback context returned from `onMutate`.** (`mut-optimistic-updates`, `mut-rollback-context`)
6. **`getNextPageParam` must return `undefined` to signal "no more pages."** Returning `null` keeps fetching. (`inf-page-params`)
7. **For SSR: one `QueryClient` per request**, dehydrate on server, hydrate on client. (`ssr-client-per-request`, `ssr-dehydration`)
8. **`select` is for transforming, not filtering** — it runs after structural sharing and won't reduce re-renders if the input changes. (`perf-select-transform`)

Full text + many more rules in `references/upstream/rules/`.

---

## Decision questions when writing data-fetching code

Run through these before finishing a hook or mutation — they catch the most common mistakes:

- Is this query in the right `<feature>/` folder, or did I drop it somewhere ad-hoc?
- Does the key live in `<feature>.keys.ts` via `queryOptions()`, not as a literal in the hook file?
- Does the hook accept `{ queryConfig }` / `{ mutationConfig }` typed with `QueryConfig<typeof keys.x>` / `MutationConfig<typeof requestFn>`?
- Is the network call in `<feature>.requests.ts` as a typed function — not inlined?
- Does this mutation invalidate via the key factory (not a stringly-typed prefix)?
- For list mutations: am I invalidating via a `<thing>Constant` prefix so every filter variant clears?
- For optimistic updates: cancel → snapshot → update → rollback in `onError` → reconcile in `onSuccess`?
- Did I destructure `{ onSuccess, ...rest }` from `mutationConfig` so the consumer's callback fires *after* my invalidation?
- Does this query need `enabled` guarded on its dependencies? (`!!dep && queryConfig.enabled !== false`)
- Is `staleTime` set intentionally, not by accident?
- For infinite queries: is `gcTime: 0` set unless I have a reason to keep paged data around?
- Should this query be `meta: { persist: true } as const`?

---

## Attribution

The `references/upstream/` directory contains the **TanStack Query Best Practices** agent skill written by [@DeckardGer](https://github.com/DeckardGer). Source: <https://github.com/DeckardGer/tanstack-agent-skills>. Bundled here so this skill works offline and so the rule-by-rule rationale travels with the conventions. Credit for that material goes to the upstream author.
