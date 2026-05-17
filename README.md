# agent-skills

Opinionated [agent skills](https://agentskills.io) for Claude Code, Cursor, Codex, OpenCode, and any other agent that speaks the [skills.sh](https://skills.sh) format. Each skill captures conventions distilled from shipping a real production codebase — not theory, not blog posts.

## Available skills

| Skill | What it does |
|-------|-------|
| [`tanstack-query-best-practices`](./skills/tanstack-query-best-practices) | Production conventions for TanStack Query v5: per-feature folder split, `queryOptions()` key factories with a "Constants" prefix for broad invalidation, shared `QueryConfig` / `MutationConfig` type helpers, optimistic-update lifecycle. Bundles the rule-by-rule [`tanstack-query-best-practices`](https://github.com/DeckardGer/tanstack-agent-skills) skill by [@DeckardGer](https://github.com/DeckardGer). |
| [`react-native-unistyles-conventions`](./skills/react-native-unistyles-conventions) | Production conventions for [react-native-unistyles](https://github.com/jpudysz/react-native-unistyles) v3: Tailwind-style theme scales, dynamic-function styling, gap-over-margin, RTL handling, `borderCurve` pairing, gradients via `experimental_backgroundImage`. Bundles the upstream v3 skill by [@jpudysz](https://github.com/jpudysz). |

## Install

### Pick interactively

Leave the skill off and the CLI prompts you to multi-select from the available skills:

```bash
npx skills add AlshehriAli0/agent-skills
# → interactive prompt to pick one or many
```

Or list what's available without installing:

```bash
npx skills add AlshehriAli0/agent-skills --list
```

### Install a specific skill

```bash
npx skills add AlshehriAli0/agent-skills --skill <skill-name>
```

For example:

```bash
npx skills add AlshehriAli0/agent-skills --skill tanstack-query-best-practices
npx skills add AlshehriAli0/agent-skills --skill react-native-unistyles-conventions
```

The CLI auto-detects your agent (Claude Code, Cursor, Codex, OpenCode, …) and links the skill into the right directory.

### Common flags

```bash
# Globally (available across all projects)
npx skills add AlshehriAli0/agent-skills --skill <name> -g

# Target a specific agent
npx skills add AlshehriAli0/agent-skills --skill <name> -a claude-code

# Non-interactive (CI/CD friendly)
npx skills add AlshehriAli0/agent-skills --skill <name> -g -a claude-code -y

# Pull updates later
npx skills update <name>
```

See the [skills CLI docs](https://github.com/vercel-labs/skills) for scopes, copy-vs-symlink, agent filters, and the full option list.

### Manual install (no CLI)

Sparse-checkout a single skill:

```bash
git clone --filter=blob:none --no-checkout https://github.com/AlshehriAli0/agent-skills /tmp/agent-skills
cd /tmp/agent-skills && git sparse-checkout set skills/<skill-name> && git checkout
cp -R /tmp/agent-skills/skills/<skill-name> ~/.claude/skills/
```

Swap `.claude` for `.cursor`, `.codex`, etc. for other agents. For project-local install, use `.claude/skills/` instead of `~/.claude/skills/`.

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
