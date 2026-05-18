# agent-skills

Opinionated [agent skills](https://agentskills.io) for Claude Code, Cursor, Codex, OpenCode, and any other agent that speaks the [skills.sh](https://skills.sh) format. Each skill captures conventions distilled from shipping a real production codebase — not theory, not blog posts.

## Available skills

| Skill | What it does |
|-------|-------|
| [`tanstack-query-best-practices`](./skills/tanstack-query-best-practices) | Production conventions for TanStack Query v5: per-feature folder split, `queryOptions()` key factories with a "Constants" prefix for broad invalidation, shared `QueryConfig` / `MutationConfig` type helpers, optimistic-update lifecycle. Bundles the rule-by-rule [`tanstack-query-best-practices`](https://github.com/DeckardGer/tanstack-agent-skills) skill by [@DeckardGer](https://github.com/DeckardGer). |
| [`react-native-unistyles-conventions`](./skills/react-native-unistyles-conventions) | Production conventions for [react-native-unistyles](https://github.com/jpudysz/react-native-unistyles) v3: Tailwind-style theme scales, dynamic-function styling, gap-over-margin, RTL handling, `borderCurve` pairing, gradients via `experimental_backgroundImage`. Bundles the upstream v3 skill by [@jpudysz](https://github.com/jpudysz). |

## Install

```bash
# Interactive — pick one or many
npx skills add AlshehriAli0/agent-skills

# Specific skill, globally
npx skills add AlshehriAli0/agent-skills@<skill-name> -g
```

The CLI auto-detects your agent (Claude Code, Cursor, Codex, OpenCode, …). See the [skills CLI docs](https://github.com/vercel-labs/skills) for all flags.

## Repository layout

```
.
├── README.md                                       # this file
├── LICENSE
└── skills/
    ├── tanstack-query-best-practices/
    │   ├── SKILL.md
    │   ├── README.md
    │   ├── references/                             # deep dives + bundled upstream
    │   └── examples/                               # real-world TS files
    └── react-native-unistyles-conventions/
        ├── SKILL.md
        ├── README.md
        └── references/                             # deep dives + bundled upstream
```

Each skill stands on its own — read its own README for skill-specific install commands, what it triggers on, and the conventions it teaches.

## Contributing

Issues and PRs welcome. Keep changes focused on production-tested patterns rather than personal preference — if a rule has bitten you in real code, document the incident in the convention's "Why" rationale.

## License

MIT — see [LICENSE](./LICENSE). Each skill's `references/upstream/` directory bundles material from external authors with attribution; see the per-skill `references/upstream/README.md` files for credits.
