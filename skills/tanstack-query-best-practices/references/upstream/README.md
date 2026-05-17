# Upstream — TanStack Query Best Practices by @DeckardGer

The contents of this directory are bundled, **unmodified**, from the [TanStack Query Best Practices](https://github.com/DeckardGer/tanstack-agent-skills) agent skill by [@DeckardGer](https://github.com/DeckardGer).

- **Source repository**: <https://github.com/DeckardGer/tanstack-agent-skills>
- **Skill index**: <https://www.skills.sh/deckardger/tanstack-agent-skills/tanstack-query-best-practices>

All credit for the material in this directory goes to the upstream author. They are bundled here so:

1. The parent skill (`tanstack-query-best-practices` by @AlshehriAli0) works offline, without requiring a separate install.
2. The rule-by-rule rationale travels alongside the production conventions that build on top of it.

## What's in here

- `SKILL.md` — the upstream skill's entry point, with the full rule index by category.
- `rules/*.md` — one file per rule (32+ rules across 10 categories: `qk-*`, `cache-*`, `mut-*`, `err-*`, `pf-*`, `inf-*`, `ssr-*`, `perf-*`, plus `network-mode`, `persist-queries`, `parallel-use-queries`, `query-cancellation`).

## How to use

The parent `SKILL.md` references specific rule files when a topic needs deeper rationale than the convention itself provides. You can also read `references/upstream/SKILL.md` directly for the full rule index.

If a rule in the upstream contradicts a convention in the parent skill, the parent skill wins — it's the production-tested layer. The upstream is the "why each thing is a rule at all" reference.

## License / attribution

The upstream repository did not specify a license at the time of bundling. Files are included here **with attribution** for educational reference. If you are @DeckardGer and want this bundle modified or removed, please open an issue on the parent repo — it'll be handled the same day.

For any redistribution, please credit @DeckardGer and link back to the upstream source.
