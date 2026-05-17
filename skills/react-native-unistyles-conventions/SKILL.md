---
name: react-native-unistyles-conventions
description: >
  Opinionated conventions for react-native-unistyles v3 in production React Native / Expo apps:
  Tailwind-style theme scales (spacing, radius, fontSize) using moderateScale, dynamic-function
  styling, gap-over-margin, theme-only values, borderCurve, boxShadow, gradients via
  experimental_backgroundImage, RTL handling, and component patterns. Triggers on: "unistyles",
  "StyleSheet.create", "theme", "responsive styling", "convert to unistyles", "set up unistyles",
  "unistyles theme", "spacing scale", "Tailwind-style theme", "RN styling", "react native theme",
  or any task styling React Native components in a project that uses (or should use) unistyles.
  Bundles the upstream react-native-unistyles v3 skill from the library author for foundational
  API/setup details.
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Grep, Glob, Edit, Write, Bash(npx *)
---

# React Native Unistyles — Mobile Conventions

This skill captures opinionated conventions for `react-native-unistyles` v3 in production React Native / Expo apps. It sits **on top of** the upstream skill written by jpudysz (the library author) — that skill covers the framework's API surface, setup, variants, web features, and troubleshooting. This skill covers the **how** of using it day-to-day in a mobile app: what your theme should look like, how to write style objects, and patterns that hold up across hundreds of components.

When working on tasks involving React Native styling, theme, or `StyleSheet.create`, apply these conventions by default. They are tuned for mobile-first apps that:

- Use Tailwind-flavored design tokens (spacing/radius/fontSize scales)
- Want device-responsive sizing without hand-tuning every screen
- Render the same components in both LTR and RTL
- Use Reanimated, Pressables, Expo Router, and FlashList

For anything not covered here (initial install, Babel config, variants, withUnistyles, web/SSR, common error messages), read the upstream skill: `references/upstream/skill.md` and the `references/upstream/*.md` files.

---

## The big picture

Unistyles v3 lets you write style objects that are **reactive to theme and runtime** with **zero re-renders** because the work happens in C++ via Nitro. The catch: the Babel plugin only catches `StyleSheet.create` calls when `StyleSheet` is imported directly from `react-native-unistyles`. Everything in this skill assumes that import.

The mental model:

- **Theme is the source of truth for every style value.** Pixels, colors, font sizes — all live in the theme. Components don't invent values.
- **Styles are functions of theme** (`StyleSheet.create(theme => ({ ... }))`). When `useUnistyles()` re-renders a component, your styles update without you wiring anything.
- **Conditional styles are functions, not arrays.** Instead of `[styles.base, isActive && styles.active]`, write `styles.button(isActive)` — keeps the C++ proxy intact and reads cleaner.
- **Layout uses `gap` and `padding`, not `margin`.** Margin collapses, leaks past component boundaries, and makes spacing logic non-local. Padding stays inside; gap stays between.

If you're unsure why a rule exists, the **Why** lines below should give you enough to judge edge cases.

---

## The conventions (with rationale)

### 1. Import `StyleSheet` from `react-native-unistyles`, not `react-native`

```ts
import { StyleSheet, useUnistyles } from "react-native-unistyles";
```

**Why:** The Babel plugin matches the import source. Re-exporting `StyleSheet` from a barrel file or importing it from `react-native` breaks reactivity silently — styles still render, but they stop updating when the theme changes.

**How to apply:** When you see `import { StyleSheet } from "react-native"` in a file you're editing, replace it. Don't create barrel files that re-export `StyleSheet`.

### 2. Always use theme values — never hardcoded pixels or hex

```ts
// ✅
padding: theme.spacing[4],
borderRadius: theme.radius["2xl"],
backgroundColor: theme.primary[500],

// ❌
padding: 16,
borderRadius: 16,
backgroundColor: "#00CD59",
```

**Why:** The theme already encodes responsive scaling (`moderateScale`) and dark-mode color shifts. Hardcoded values bypass both, so your design drifts on small/large devices and breaks dark mode. Also: when designers iterate on a token, you change one place instead of grepping the codebase.

**How to apply:** If a value isn't in the scale (e.g., 14px when `spacing[3]` is 12 and `spacing[4]` is 16), use `theme.sizing.scale(14)` for the one-off — don't hardcode `14`. If you need a value frequently, propose adding it to the scale instead.

### 3. Conditional styles are dynamic functions, not style arrays

```ts
// ✅ dynamic function
const styles = StyleSheet.create(theme => ({
  button: (isActive: boolean) => ({
    backgroundColor: isActive ? theme.primary[500] : theme.bg.subtle,
    borderColor: isActive ? theme.primary[500] : theme.neutral[400],
  }),
}));

<Pressable style={styles.button(isActive)} />;

// ❌ style array with conditionals
<Pressable style={[styles.base, isActive && styles.active]} />;
```

**Why:** Dynamic functions are first-class in v3 — the C++ proxy receives the args and recomputes only the affected styles. Style arrays with falsy entries break the proxy in subtle ways (the indices shift) and force a JS-side merge step. Functions also keep all variation logic in one place near the values.

**How to apply:** Anywhere you'd reach for a ternary or `&&` in the `style` prop, move it into the stylesheet as a parameterized function. Combining pre-made styles with array syntax (`[styles.base, styles.elevated]`) is still fine — the rule is about **conditional/value-dependent** branches, not composition.

### 4. `borderRadius` always pairs with `borderCurve: "continuous"`

```ts
borderRadius: theme.radius.xl,
borderCurve: "continuous",
```

**Why:** `borderCurve: "continuous"` produces iOS-style "squircle" rounding instead of circular arcs. It's the default on iOS native UI; without it, your rounded corners look subtly off-brand next to system controls.

**How to apply:** Anytime you write `borderRadius`, add `borderCurve: "continuous"` on the next line. If a designer specifies sharp corners (radius 0), skip both.

### 5. No `as const` inside `StyleSheet.create`

```ts
// ✅
const styles = StyleSheet.create(theme => ({
  row: { flexDirection: "row", alignItems: "center" },
}));

// ❌
const styles = StyleSheet.create(theme => ({
  row: { flexDirection: "row" as const, alignItems: "center" as const },
}));
```

**Why:** Unistyles' types already narrow string literals correctly. `as const` is redundant noise that some linters flag.

### 6. Don't pass `theme` as a prop — children call `useUnistyles()` themselves

```ts
// ✅
const Child = () => {
  const { theme } = useUnistyles();
  return <Icon color={theme.text.primary} />;
};

// ❌
<Child theme={theme} />;
```

**Why:** Passing theme through props re-renders the parent every theme change and creates implicit coupling. `useUnistyles()` is cheap and component-local.

**How to apply:** Only call `useUnistyles()` when you need theme values **outside** the `style` prop — e.g., for icon `color`, image `tintColor`, or string interpolation. Inside `StyleSheet.create`, the theme is already there.

### 7. Use `gap` on the parent — not `margin` on children

```ts
// ✅
container: {
  flexDirection: "column",
  gap: theme.spacing[3],
},

// ❌
child: {
  marginBottom: theme.spacing[3],
},
```

**Why:** `gap` only applies *between* children, so adding/removing the first or last child doesn't leave you with extra space. Margin escapes the child's box and interacts with siblings unpredictably (collapse, leakage). `gap` is also a single source of truth for the spacing rhythm.

**How to apply:** Default to `gap`. Only reach for `margin` when you literally need to push something past its parent's content box (rare, and usually means you should restructure).

### 8. `padding` is for inside; `gap` is for between

```ts
card: {
  padding: theme.spacing[4],   // breathing room inside the card
  gap: theme.spacing[3],       // between rows of children
},
```

**Why:** Conflating the two leads to inconsistent rhythm — the same visual gap might be `padding` in one component and `margin` in another. Picking one rule keeps spacing readable.

### 9. Gradients via `experimental_backgroundImage`, not gradient libraries

```ts
overlay: {
  experimental_backgroundImage:
    "linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.6))",
},
```

**Why:** Native CSS-style gradients are baked into RN's New Architecture — no extra library, no extra view, no shader cost. Pulls in zero dependencies and works on both platforms.

**How to apply:** Use template literals to interpolate theme colors when you need them: `linear-gradient(to bottom, ${theme.primary[400]}, ${theme.primary[600]})`. Avoid `expo-linear-gradient`, `react-native-linear-gradient`, etc.

### 10. Shadows via `boxShadow`, not legacy shadow* / elevation

```ts
// ✅
card: {
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
},

// ❌
card: {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 4,
},
```

**Why:** `boxShadow` is supported on RN 0.76+ on both iOS and Android (via the New Architecture) and matches CSS semantics, so designers can paste values directly from Figma. The legacy split (iOS shadow* / Android elevation) is verbose, asymmetric, and easy to get wrong.

**How to apply:** When you see legacy shadow props in code you're editing, migrate them. Use the design system's shadow tokens (`theme.shadows.md` etc. — see template) when available.

### 11. RTL — branch on `isRtl`, don't hand-flip

```ts
const { isRtl } = useDir(); // project-local hook reading I18nManager.isRTL

row: {
  flexDirection: isRtl ? "row-reverse" : "row",
},
```

**Why:** RN's auto-RTL handles `start`/`end`, `left`/`right`, and `textAlign` correctly, but `flexDirection: "row"` does **not** auto-flip in many setups (depends on how RTL is configured at the native level). Branching is explicit and survives configuration changes.

**How to apply:** For `flexDirection: "row"`, branch with `isRtl`. For `translateX` in Reanimated, manually negate (`translateX: isRtl ? -value : value`). Chevron icons need `transform: [{ scaleX: isRtl ? -1 : 1 }]`. Email/phone inputs stay LTR with `writingDirection: "ltr"` regardless.

### 12. Static helpers come from `StyleSheet`, not from manual wraps

```ts
// ✅
import { StyleSheet } from "react-native-unistyles";
<View style={StyleSheet.absoluteFill} />;

// ❌
const styles = StyleSheet.create({ fill: StyleSheet.absoluteFill });
<View style={styles.fill} />;
```

**Why:** Wrapping static helpers (`absoluteFill`, `hairlineWidth`) inside `create` adds nothing — Unistyles already polyfills them on its `StyleSheet` export.

---

## Theme structure

The conventions above all assume a theme shaped a specific way. The shape:

- **`spacing`** — Tailwind-style numeric scale (`0, px, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96`). Each value passes through `moderateScale` so phones-of-different-sizes render proportionally without manual breakpoints. Plus `auto` and a `scale` helper for one-offs.
- **`radius`** — `none, sm, base, md, lg, xl, 2xl, 3xl, full`.
- **`fontSize`** — `xxs, xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl, 6xl, 7xl, 8xl, 9xl`.
- **`sizing`** — spacing scale + `full | screen | min | max | fit` for percentage/intrinsic sizes.
- **`fontWeight`** — `extraLight (200) … black (900)`.
- **`screen`** — `width`, `height`, `isTablet`, `isSmallDevice`, `isLargeDevice` (computed once at startup; fine for layout decisions, not for live orientation changes — use `rt.screen` from `(theme, rt) =>` for that).
- **`scale`** — exposed at the top level for raw scaling needs.
- **Color tokens** — semantic groups (`primary`, `secondary`, `accent`, `bg`, `text`, `neutral`, `success`, `warning`, `error`, `info`). Multi-stop colors use either numeric (`50–500`) or `{ DEFAULT, light, border }` shape.
- **`shadows`** (optional) — `none, sm, md, lg, xl` — pre-baked `boxShadow` strings or legacy objects depending on what you've migrated.
- **`typography`** (optional) — design-system-named text styles (`h1, h2, h3, paragraphL/M/S, paragraphMSoft/SSoft, labelM, label`) that can be spread into a style: `...theme.typography.paragraphMSoft`.

For the full template you can drop into a new project, read **`references/theme-template.md`**.

---

## Component patterns

For complete, runnable examples — pressable card, dynamic-function button, RTL-aware row, list item, gradient overlay, themed icon — read **`references/component-patterns.md`**.

---

## When to read which reference

```
Setting up unistyles in a new project
└─ references/upstream/setup-guide.md  (Babel plugin, TS, Expo Router)
└─ references/theme-template.md        (drop-in unistyles.ts)

Writing or refactoring components
└─ THIS FILE (conventions + rationale)
└─ references/component-patterns.md    (real snippets)

Writing variants, breakpoints, web styles
└─ references/upstream/styling-patterns.md

Looking up an exact API signature
└─ references/upstream/api-reference.md

Integrating a third-party component (Reanimated, FlashList, etc.)
└─ references/upstream/third-party-integration.md

Hitting an error or unexpected behavior
└─ references/upstream/common-issues.md
```

---

## Critical rules from upstream (echoed for visibility)

These are inherited from the library author's skill — they cause silent breakage if violated, so they're worth keeping in mind even when you're "just" applying conventions:

1. **Never spread styles** (`{...styles.x}`) — breaks the C++ proxy. Use `[styles.x, styles.y]` for composition.
2. **Never re-export `StyleSheet` from a barrel** — Babel plugin won't see it.
3. **Babel plugin is required** — `['react-native-unistyles/plugin', { root: 'src' }]` in `babel.config.js`.
4. **`StyleSheet.configure()` runs once before any `create`** — do it in the app entry, not lazily.
5. **`styles.useVariants(...)`** must be called before reading variant-dependent styles, like a hook.

Full text + many more in `references/upstream/skill.md`.

---

## Decision questions when styling

Run through these before finishing a component — they catch the most common mistakes:

- Did I import `StyleSheet` from `react-native-unistyles`?
- Are all values from the theme (spacing/radius/fontSize/colors)? Any stray numbers or hex codes?
- Does every `borderRadius` have a `borderCurve: "continuous"` next to it?
- Are conditional styles dynamic functions, not style arrays with `&&`?
- Is spacing done with `gap` (between) and `padding` (inside) — no `margin` on children?
- Is the row direction RTL-aware?
- For network images, am I using `TurboImage` (project convention)?
- For gradients, am I using `experimental_backgroundImage`?
- For shadows, am I using `boxShadow`?
- Is `useUnistyles()` only called when I need theme **outside** the style prop?

---

## Attribution

The `references/upstream/` directory contains the official react-native-unistyles v3 agent skill written by **Jacek Pudysz** ([jpudysz](https://github.com/jpudysz)), creator and maintainer of the library. Source: https://github.com/jpudysz/react-native-unistyles/tree/main/skills/react-native-unistyles-v3. Bundled here so this skill works offline and in projects that don't already have the upstream installed. All credit for that material goes to the upstream author.
