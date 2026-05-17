# Query key factory — deep dive

The query-key factory is the single most load-bearing pattern in this skill. Get it right and every other convention falls out naturally. Get it wrong and you'll be fighting the cache for the lifetime of the project.

## Anatomy of a factory

```ts
// src/api/auth/auth.keys.ts
import { queryOptions } from "@tanstack/react-query";
import {
  fetchAccount,
  fetchAccountMinimalInfo,
  searchAccounts,
  fetchAccountCard,
} from "./auth.requests";

export const authQueries = {
  // 1. Single-entity, no params
  account: () =>
    queryOptions({
      queryKey: ["account"] as const,
      queryFn: fetchAccount,
      staleTime: 1000 * 60 * 15,
      meta: { persist: true } as const,
    }),

  // 2. Single-entity, optional id
  minimalAccount: (accountId?: number) =>
    queryOptions({
      queryKey: ["account", "minimal", accountId] as const,
      queryFn: () => fetchAccountMinimalInfo(accountId),
      enabled: !!accountId,
    }),

  // 3. Search/filter — every variant becomes its own cache entry
  searchAccounts: (term: string, verifiedOnly?: boolean) =>
    queryOptions({
      queryKey: ["accounts", "search", term, verifiedOnly] as const,
      queryFn: () => searchAccounts(term, verifiedOnly),
      enabled: term.length > 0,
    }),

  // 4. Lookup by alternate id
  accountCard: (encryptedPhone: string) =>
    queryOptions({
      queryKey: ["accountCard", encryptedPhone] as const,
      queryFn: () => fetchAccountCard(encryptedPhone),
      enabled: !!encryptedPhone,
    }),
};
```

Notice: **every entry is a function**, even the no-arg ones. That's because `queryOptions({ ... })` has to be a fresh object per call — sharing it would mean `enabled` decisions get cached. Functions are also the only thing TS can derive a useful type from (`typeof authQueries.account` is a function type; `ReturnType<typeof ...>` gives you the options object).

## Hierarchy: entity → id → filters

Keys are designed to be **prefix-invalidatable**. The shape that makes that work:

```
[entity]                              ← root of a feature
[entity, id]                          ← one item
[entity, id, "subresource"]           ← related sub-data
[entity, "list"]                      ← lists at large
[entity, "list", { filters, sort }]   ← specific list variant
```

A prefix-only `invalidateQueries({ queryKey: ["posts"] })` then matches every post-related query. A more targeted `invalidateQueries({ queryKey: ["posts", postId] })` matches one post and its subresources but leaves lists alone.

## The "Constants" pattern — prefix functions for broad invalidation

Lists with filters generate many cache entries:

```
["trees", { filters: "scope=mine&order=newest" }]
["trees", { filters: "scope=all&order=oldest"  }]
["trees", { filters: ""                          }]
```

After a write, you usually want to invalidate **all** of them. Define a prefix function:

```ts
export const treeQueries = {
  treesList: () => ["trees"] as const,                    // ← the prefix
  infiniteTreesConstant: () => ["infiniteTrees"] as const,
  treesCountConstant: () => ["treesCount"] as const,

  trees: (filters?: string) =>
    queryOptions({
      queryKey: [...treeQueries.treesList(), filters] as const,
      queryFn: () => fetchTrees(filters),
    }),

  infiniteTrees: (filters?: string) =>
    infiniteQueryOptions({
      queryKey: [...treeQueries.infiniteTreesConstant(), { filters, limit: 40 }] as const,
      queryFn: ({ pageParam }) => fetchInfiniteTrees(40, filters, pageParam),
      initialPageParam: null,
      getNextPageParam: (last) => (last.length < 40 ? undefined : last[last.length - 1].id),
      gcTime: 0,
    }),

  treesCount: ({ filters }: { filters?: string } = {}) =>
    queryOptions({
      queryKey: [...treeQueries.treesCountConstant(), filters] as const,
      queryFn: () => fetchTreesCount({ filters }),
    }),
};
```

In a mutation, the broad invalidate is one line:

```ts
queryClient.invalidateQueries({ queryKey: treeQueries.treesList() });
queryClient.invalidateQueries({ queryKey: treeQueries.infiniteTreesConstant() });
queryClient.invalidateQueries({ queryKey: treeQueries.treesCountConstant() });
```

**Naming**: the prefix function ends in `Constant` (or `List` for "the list of") and returns the bare array `as const`. The full key spreads it.

## Serializable everything

Query keys are serialized via `JSON.stringify`-equivalent equality. That means:

| OK                                       | Not OK                                |
|------------------------------------------|---------------------------------------|
| Primitives (`string`, `number`, `boolean`) | Functions                             |
| `null`                                    | `undefined` ← see below              |
| Plain objects (deeply nested OK)         | `Map`, `Set`, `Date`                  |
| Arrays                                    | Class instances                       |
|                                           | DOM nodes                             |

`undefined` in a key gets stripped, so `["x", undefined]` and `["x"]` are the *same* cache entry. That's fine when intentional (a missing filter == "no filter") but a footgun when accidental. If a key part is "definitely a value or nothing meaningful," prefer `null` or omit it from the array entirely.

Dates: convert with `.toISOString()` before putting in a key. Sets/Maps: convert to arrays/objects.

## Include every dependency

If two calls to `queryFn` would produce different data, every input that drives that difference must be in the key. Easy to miss:

- An auth header / current user (rarely in the key — usually `queryClient.clear()` on logout instead)
- A locale / `lang` param
- Sort order
- Pagination cursor

```ts
// ❌ same key, different data — cache returns the wrong locale's content
fetchPost: (id: string, lang: string) =>
  queryOptions({ queryKey: ["post", id], queryFn: () => fetch(id, lang) }),

// ✅
fetchPost: (id: string, lang: string) =>
  queryOptions({ queryKey: ["post", id, lang], queryFn: () => fetch(id, lang) }),
```

## Typing the factory result

`queryOptions()` gives you a fully-typed return. You almost never need to annotate the function:

```ts
const opts = authQueries.account();
opts.queryKey;   // readonly ["account"]
opts.queryFn;    // () => Promise<AccountProfile>
```

That's what makes `QueryConfig<typeof authQueries.account>` and `queryClient.setQueryData<AccountProfile>(authQueries.account().queryKey, ...)` work — the types flow through.

## When you have helpers across features

Two patterns work; pick one per project and stick with it:

**A. Sibling re-imports** (most common). One feature's mutation invalidates another feature's queries by importing the other feature's keys directly:

```ts
// gift.mutations.ts
import { treeQueries } from "../tree";
// ...
onSuccess: () => queryClient.invalidateQueries({ queryKey: treeQueries.treesList() }),
```

**B. Cross-feature "summary" key file**. For genuinely shared concepts (e.g. a dashboard that aggregates many features), make a `dashboard/dashboard.keys.ts` that owns those keys. Don't redefine.

## Anti-patterns to grep for

- `queryKey: ["..."]` outside of `*.keys.ts` files → factory wasn't used
- Repeated literal `["account"]` in mutations → invalidate via `authQueries.account().queryKey` instead
- A key like `["search", { term, options }]` where `options` is a class instance / Set → serialization will break
- A query that *should* re-run on locale change but doesn't include locale in its key → silent staleness

Run periodically: `rg --no-heading 'queryKey: \[' src/ | rg -v '\.keys\.ts'` — anything that surfaces is a candidate to move into a factory.
