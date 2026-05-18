# react-native-unistyles-conventions

[![skills.sh](https://skills.sh/b/AlshehriAli0/agent-skills/react-native-unistyles-conventions)](https://skills.sh/AlshehriAli0/agent-skills/react-native-unistyles-conventions)

> Part of [`AlshehriAli0/agent-skills`](https://github.com/AlshehriAli0/agent-skills) — see the [root README](../../README.md) for the full skill index.

An opinionated agent skill for [react-native-unistyles](https://github.com/jpudysz/react-native-unistyles) v3 in production React Native / Expo apps. It teaches Claude / Cursor / any agent the conventions used to ship a real mobile app at scale: Tailwind-style theme scales, dynamic-function styling, gap-over-margin, RTL handling, and component patterns drawn from real production code.

This skill is **layered on top of** the official [react-native-unistyles v3 skill](https://github.com/jpudysz/react-native-unistyles/tree/main/skills/react-native-unistyles-v3) by [@jpudysz](https://github.com/jpudysz), the library author. The upstream skill is bundled under `references/upstream/` so this skill works offline.

## Install

### Via [skills.sh](https://skills.sh) (recommended)

```bash
npx skills add AlshehriAli0/agent-skills --skill react-native-unistyles-conventions
```

The CLI auto-detects your agent (Claude Code, Cursor, Codex, OpenCode, …) and links the skill into the right directory.

**Common variations:**

```bash
# Install globally (available across all projects)
npx skills add AlshehriAli0/agent-skills --skill react-native-unistyles-conventions -g

# Target a specific agent
npx skills add AlshehriAli0/agent-skills --skill react-native-unistyles-conventions -a claude-code

# Non-interactive (CI/CD friendly)
npx skills add AlshehriAli0/agent-skills --skill react-native-unistyles-conventions -g -a claude-code -y

# Pull updates later
npx skills update react-native-unistyles-conventions
```

See the [skills CLI docs](https://github.com/vercel-labs/skills) for the full option list (scopes, copy-vs-symlink, agent filters).

### Manual install (no CLI)

Sparse-checkout just this skill from the monorepo:

```bash
git clone --filter=blob:none --no-checkout https://github.com/AlshehriAli0/agent-skills /tmp/agent-skills
cd /tmp/agent-skills && git sparse-checkout set skills/react-native-unistyles-conventions && git checkout
cp -R /tmp/agent-skills/skills/react-native-unistyles-conventions ~/.claude/skills/
```

Swap `.claude` for `.cursor`, `.codex`, etc. for other agents. For project-local install, use `.claude/skills/` instead of `~/.claude/skills/`.

## What's inside

```
.
├── SKILL.md                       # The conventions + rationale (the why behind each rule)
└── references/
    ├── theme-template.md          # A drop-in unistyles.ts for new projects
    ├── component-patterns.md      # Real, runnable patterns (cards, buttons, lists, RTL rows)
    └── upstream/                  # Official react-native-unistyles v3 skill (bundled)
        ├── skill.md
        ├── api-reference.md
        ├── setup-guide.md
        ├── styling-patterns.md
        ├── third-party-integration.md
        └── common-issues.md
```

## When this skill triggers

Any task involving React Native styling, theme work, `StyleSheet.create`, responsive sizing, RTL layout, or converting RN StyleSheet to Unistyles. The agent will apply the conventions automatically.

## Conventions in 30 seconds

- Theme is the source of truth (no hardcoded pixels or hex codes).
- `StyleSheet.create(theme => ...)` everywhere — never RN's `StyleSheet`.
- Conditional styles are **dynamic functions** (`button: (active) => ({ ... })`), not `[a, cond && b]` arrays.
- `gap` between siblings, `padding` inside, never `margin` on children.
- `borderRadius` always pairs with `borderCurve: "continuous"`.
- Gradients via `experimental_backgroundImage`; shadows via `boxShadow`.
- `flexDirection: "row"` branches on `I18nManager.isRTL`; chevrons get `scaleX: -1` in RTL.
- `useUnistyles()` only when you need theme outside the `style` prop.

Read [`SKILL.md`](./SKILL.md) for the full set with rationale.

## Credits

Foundational API reference, setup guide, and troubleshooting bundled from the official [react-native-unistyles v3 skill](https://github.com/jpudysz/react-native-unistyles/tree/main/skills/react-native-unistyles-v3) by [@jpudysz](https://github.com/jpudysz).

## License

MIT — see the [root LICENSE](../../LICENSE). The bundled upstream files in `references/upstream/` are authored by Jacek Pudysz; see [`references/upstream/README.md`](./references/upstream/README.md) for attribution.
