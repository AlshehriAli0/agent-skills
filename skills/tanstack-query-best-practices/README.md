# tanstack-query-best-practices

[![skills.sh](https://skills.sh/b/AlshehriAli0/agent-skills/tanstack-query-best-practices)](https://skills.sh/AlshehriAli0/agent-skills/tanstack-query-best-practices)

> Part of [`AlshehriAli0/agent-skills`](https://github.com/AlshehriAli0/agent-skills) — see the [root README](../../README.md) for the full skill index.

An opinionated agent skill for [TanStack Query](https://tanstack.com/query) (formerly React Query) in production React, React Native, and Next.js apps. It teaches Claude / Cursor / any agent the conventions used to ship a real codebase at scale: a strict per-feature folder split, `queryOptions()` key factories with a single `all()` root per feature for hierarchical invalidation, shared `QueryConfig` / `MutationConfig` type helpers, typed request functions (never inline `fetch`), and the cancel → snapshot → update → rollback → reconcile optimistic-update lifecycle.

This skill is **layered on top of** the [TanStack Query Best Practices](https://www.skills.sh/deckardger/tanstack-agent-skills/tanstack-query-best-practices) skill by [@DeckardGer](https://github.com/DeckardGer) — 32 rules across 10 categories (query keys, caching, mutations, error handling, prefetching, infinite queries, SSR, parallel queries, performance, offline). The upstream rules are bundled under `references/upstream/` so this skill works offline.

## What this skill does

- Tells the agent **where every file goes**: `src/api/<feature>/{types,requests,keys,queries,mutations}.ts` + a barrel `index.ts`.
- Tells it **how to define keys**: always through a `queryOptions()` / `infiniteQueryOptions()` factory — never a literal `["key"]` at a call site — each entry carrying only `queryKey`, `queryFn`, `meta`, `enabled`.
- Tells it **how to invalidate broadly**: a single `all()` root per feature (`all: () => ["trees"] as const`), spread into every key — so one mutation can clear the whole feature, or any sub-tree, in one line.
- Tells it **how to type hooks**: `QueryConfig<typeof keys.x>` and `MutationConfig<typeof requestFn>` helpers, so consumers get the full `useQuery` / `useMutation` option surface without leaking implementation details.
- Tells it **how to write mutations**: destructure `{ onSuccess, ...rest } = mutationConfig`, run the hook's invalidation/setQueryData first, then call the consumer's `onSuccess`. `...rest` before `mutationFn` so it can't be overwritten.
- Tells it **the full optimistic-update lifecycle**: cancel → snapshot → optimistic write → rollback in `onError` → reconcile in `onSuccess` → invalidate related lists in `onSettled`.
- Bundles `cache-*`, `mut-*`, `qk-*`, `inf-*`, `ssr-*`, `perf-*`, `network-mode`, `persist-queries` upstream rules so deeper rationale is always one read away.

## Install

```bash
npx skills add AlshehriAli0/agent-skills@tanstack-query-best-practices -g
```

`-g` installs globally. Drop it for project-local. See the [skills CLI docs](https://github.com/vercel-labs/skills) for all flags.

## What's inside

```
.
├── SKILL.md                                # The conventions + rationale (the why behind each rule)
├── references/
│   ├── query-key-factory.md                # Deep dive on the keys file
│   ├── mutations-and-invalidation.md       # Mutation hook shape + optimistic update lifecycle
│   ├── prefetch-and-ssr.md                 # prefetchQuery, ensureQueryData, HydrationBoundary
│   ├── infinite-queries.md                 # useInfiniteQuery + cursor pagination
│   └── upstream/                           # Bundled deckardger TanStack Query skill
│       ├── SKILL.md
│       └── rules/
│           ├── qk-*.md, cache-*.md, mut-*.md, err-*.md,
│           ├── pf-*.md, inf-*.md, ssr-*.md, perf-*.md,
│           └── persist-queries.md, network-mode.md, …
└── examples/
    ├── auth.requests.ts                    # Typed request functions
    ├── auth.keys.ts                        # queryOptions() factory
    ├── auth.queries.ts                     # useQuery hooks with QueryConfig
    ├── auth.mutations.ts                   # useMutation hooks (incl. seed + invalidate)
    └── posts.queries.ts                    # useInfiniteQuery + filter list patterns
```

## When this skill triggers

Any task involving TanStack Query: adding `useQuery` / `useMutation` / `useInfiniteQuery` hooks, creating `.queries.ts` or `.mutations.ts` files, setting up a new feature's data layer, refactoring stringly-typed query keys into a factory, writing optimistic updates, configuring `staleTime` / `gcTime`, or integrating with SSR. The agent will apply these conventions automatically.

## Conventions in 30 seconds

- One folder per feature: `<feature>/{types,requests,keys,queries,mutations}.ts` + barrel.
- Keys live **only** in `<feature>.keys.ts`, defined via `queryOptions()`. Spread into every consumer.
- Every feature factory opens with `all: () => ["<feature>"] as const`, spread into every key — mutations invalidate `all()` (whole feature) or `[...all(), "scope"]` (one sub-tree) in one line.
- Hooks accept `{ queryConfig }` / `{ mutationConfig }` typed with `QueryConfig<typeof keys.x>` / `MutationConfig<typeof requestFn>`.
- Network calls live in `<feature>.requests.ts`; hooks never call `fetch` / `axios` directly.
- Mutations: destructure `{ onSuccess, ...rest } = mutationConfig`, run invalidation first, then call user's callback. `...rest` before `mutationFn`.
- Optimistic updates: cancel → snapshot → write → rollback `onError` → reconcile `onSuccess`.
- Factory entries carry only `queryKey`, `queryFn`, `meta`, `enabled` — `staleTime`, `gcTime` (e.g. `gcTime: 0` for infinite), `placeholderData`, `select` and any logic go in the hook body.
- `meta: { persist: true }` for queries that should survive cold start.
- Invalidate via `keys.all()`, `[...keys.all(), "scope"]`, or `keys.x().queryKey` — never a stringly-typed array.

Read [`SKILL.md`](./SKILL.md) for the full set with rationale.

## Preview — `auth.keys.ts`

```ts
import { queryOptions } from "@tanstack/react-query";
import { fetchAccount, searchAccounts, fetchAccountCard } from "./auth.requests";

export const authQueries = {
  all: () => ["auth"] as const,

  account: () =>
    queryOptions({
      queryKey: [...authQueries.all(), "account"],
      queryFn: fetchAccount,
      meta: { persist: true },
    }),

  searchAccounts: (term: string, verifiedOnly?: boolean) =>
    queryOptions({
      queryKey: [...authQueries.all(), "search", term, verifiedOnly],
      queryFn: () => searchAccounts(term, verifiedOnly),
      enabled: term.length > 0,
    }),

  accountCard: (encryptedPhone: string) =>
    queryOptions({
      queryKey: [...authQueries.all(), "card", encryptedPhone],
      queryFn: () => fetchAccountCard(encryptedPhone),
      enabled: !!encryptedPhone,
    }),
};
```

See [`examples/`](./examples/) for the full set across `requests`, `keys`, `queries`, and `mutations`.

## Credits

Foundational rule-by-rule reference bundled from the [TanStack Query Best Practices](https://github.com/DeckardGer/tanstack-agent-skills) skill by [@DeckardGer](https://github.com/DeckardGer). See [`references/upstream/README.md`](./references/upstream/README.md) for attribution.

## Contributing

Issues and PRs welcome — open one if a convention doesn't match what you ship in production, or if you have a sharper way of phrasing a rule. Keep changes focused on production-tested patterns rather than personal preference.

## License

MIT — see the [root LICENSE](../../LICENSE). The bundled upstream files in `references/upstream/` are authored by [@DeckardGer](https://github.com/DeckardGer); see [`references/upstream/README.md`](./references/upstream/README.md) for attribution.
