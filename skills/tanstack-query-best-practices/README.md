# tanstack-query-best-practices

[![skills.sh](https://skills.sh/b/AlshehriAli0/agent-skills/tanstack-query-best-practices)](https://skills.sh/AlshehriAli0/agent-skills/tanstack-query-best-practices)

> Part of [`AlshehriAli0/agent-skills`](https://github.com/AlshehriAli0/agent-skills) — see the [root README](../../README.md) for the full skill index.

An opinionated agent skill for [TanStack Query](https://tanstack.com/query) v5 (formerly React Query) in production React, React Native, and Next.js apps. It teaches Claude / Cursor / any agent the conventions used to ship a real codebase at scale: a strict per-feature folder split, `queryOptions()` key factories with a "Constants" prefix for broad invalidation, shared `QueryConfig` / `MutationConfig` type helpers, typed request functions (never inline `fetch`), and the cancel → snapshot → update → rollback → reconcile optimistic-update lifecycle.

This skill is **layered on top of** the [TanStack Query Best Practices](https://www.skills.sh/deckardger/tanstack-agent-skills/tanstack-query-best-practices) skill by [@DeckardGer](https://github.com/DeckardGer) — 32 rules across 10 categories (query keys, caching, mutations, error handling, prefetching, infinite queries, SSR, parallel queries, performance, offline). The upstream rules are bundled under `references/upstream/` so this skill works offline.

## What this skill does

- Tells the agent **where every file goes**: `src/api/<feature>/{types,requests,keys,queries,mutations}.ts` + a barrel `index.ts`.
- Tells it **how to define keys**: always through a `queryOptions()` / `infiniteQueryOptions()` factory — never a literal `["key"]` at a call site.
- Tells it **how to invalidate broadly**: a "Constants" prefix pattern (`infiniteTreesConstant: () => ["infiniteTrees"] as const`) so one mutation can clear every filtered variant in one line.
- Tells it **how to type hooks**: `QueryConfig<typeof keys.x>` and `MutationConfig<typeof requestFn>` helpers, so consumers get the full `useQuery` / `useMutation` option surface without leaking implementation details.
- Tells it **how to write mutations**: destructure `{ onSuccess, ...rest } = mutationConfig`, run the hook's invalidation/setQueryData first, then call the consumer's `onSuccess`. `...rest` before `mutationFn` so it can't be overwritten.
- Tells it **the full optimistic-update lifecycle**: cancel → snapshot → optimistic write → rollback in `onError` → reconcile in `onSuccess` → invalidate related lists in `onSettled`.
- Bundles `cache-*`, `mut-*`, `qk-*`, `inf-*`, `ssr-*`, `perf-*`, `network-mode`, `persist-queries` upstream rules so deeper rationale is always one read away.

## Install

### Via [skills.sh](https://skills.sh) (recommended)

```bash
npx skills add AlshehriAli0/agent-skills --skill tanstack-query-best-practices
```

The CLI auto-detects your agent (Claude Code, Cursor, Codex, OpenCode, …) and links the skill into the right directory.

**Common variations:**

```bash
# Install globally (available across all projects)
npx skills add AlshehriAli0/agent-skills --skill tanstack-query-best-practices -g

# Target a specific agent
npx skills add AlshehriAli0/agent-skills --skill tanstack-query-best-practices -a claude-code

# Non-interactive (CI/CD friendly)
npx skills add AlshehriAli0/agent-skills --skill tanstack-query-best-practices -g -a claude-code -y

# Pull updates later
npx skills update tanstack-query-best-practices
```

See the [skills CLI docs](https://github.com/vercel-labs/skills) for the full option list.

### Manual install (no CLI)

Sparse-checkout just this skill from the monorepo:

```bash
git clone --filter=blob:none --no-checkout https://github.com/AlshehriAli0/agent-skills /tmp/agent-skills
cd /tmp/agent-skills && git sparse-checkout set skills/tanstack-query-best-practices && git checkout
cp -R /tmp/agent-skills/skills/tanstack-query-best-practices ~/.claude/skills/
```

Swap `.claude` for `.cursor`, `.codex`, etc. for other agents. For project-local install, use `.claude/skills/` instead of `~/.claude/skills/`.

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
- Add a `<thing>Constant` prefix function for any filtered list — mutations invalidate the whole family in one line.
- Hooks accept `{ queryConfig }` / `{ mutationConfig }` typed with `QueryConfig<typeof keys.x>` / `MutationConfig<typeof requestFn>`.
- Network calls live in `<feature>.requests.ts`; hooks never call `fetch` / `axios` directly.
- Mutations: destructure `{ onSuccess, ...rest } = mutationConfig`, run invalidation first, then call user's callback. `...rest` before `mutationFn`.
- Optimistic updates: cancel → snapshot → write → rollback `onError` → reconcile `onSuccess`.
- `staleTime` set in the factory, not the hook. `gcTime: 0` for infinite queries unless you specifically want to keep paged data.
- `meta: { persist: true } as const` for queries that should survive cold start.
- Invalidate via `keys.x().queryKey` or `keys.xConstant()` — never a stringly-typed array.

Read [`SKILL.md`](./SKILL.md) for the full set with rationale.

## Preview — `auth.keys.ts`

```ts
import { queryOptions } from "@tanstack/react-query";
import { fetchAccount, searchAccounts, fetchAccountCard } from "./auth.requests";

export const authQueries = {
  account: () =>
    queryOptions({
      queryKey: ["account"] as const,
      queryFn: fetchAccount,
      staleTime: 1000 * 60 * 15,
      meta: { persist: true } as const,
    }),

  searchAccounts: (term: string, verifiedOnly?: boolean) =>
    queryOptions({
      queryKey: ["accounts", "search", term, verifiedOnly] as const,
      queryFn: () => searchAccounts(term, verifiedOnly),
      enabled: term.length > 0,
    }),

  searchAccountsConstant: () => ["accounts", "search"] as const,

  accountCard: (encryptedPhone: string) =>
    queryOptions({
      queryKey: ["accountCard", encryptedPhone] as const,
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
