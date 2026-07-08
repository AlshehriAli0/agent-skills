---
name: react-native-unistyles-conventions
description: >
  Opinionated production conventions for react-native-unistyles v3 (React Native / Expo):
  Tailwind-style theme scales, dynamic-function styling over conditional arrays, gap-over-margin,
  theme-only values. Use when styling or theming React Native / Expo components, writing or
  refactoring StyleSheet.create, converting RN StyleSheet to unistyles, or setting up unistyles.
  Bundles the upstream unistyles v3 skill (jpudysz) for foundational API and setup.
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Grep, Glob, Edit, Write, Bash(npx *)
---

# React Native Unistyles: Mobile Conventions

This skill sits **on top of** the upstream skill by jpudysz (the library author). That one covers the API surface, setup, variants, web, and troubleshooting; this one is the day-to-day **how**: what your theme looks like, how you write style objects, and patterns that hold across hundreds of components. Apply these conventions by default when you touch React Native styling.

Anything this skill doesn't cover (setup, variants, `withUnistyles`, web/SSR, error messages) lives in the bundled upstream skill; the reference table below routes by task.

---

## The big picture

Unistyles v3 lets you write style objects that are **reactive to theme and runtime** with **zero re-renders**, because the work happens in C++ via Nitro. Everything here assumes you import `StyleSheet` from `react-native-unistyles` (convention 1 explains why it must be that import).

Two ideas anchor the conventions below:

- **Theme is the source of truth for every style value.**
- **Styles are functions of theme** (`StyleSheet.create(theme => ({ ... }))`): when the theme changes, they update with no wiring.

---

## The conventions (with rationale)

### 1. Import `StyleSheet` from `react-native-unistyles`, not `react-native`

```ts
import { StyleSheet, useUnistyles } from "react-native-unistyles";
```

**Why:** The Babel plugin matches the import source. Re-exporting `StyleSheet` from a barrel file or importing it from `react-native` breaks reactivity silently: styles still render, but they stop updating when the theme changes.

**How to apply:** When you see `import { StyleSheet } from "react-native"` in a file you're editing, replace it. Don't create barrel files that re-export `StyleSheet`.

### 2. Always use theme values, never hardcoded pixels or hex

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

**How to apply:** If a value isn't in the scale (e.g., 14px when `spacing[3]` is 12 and `spacing[4]` is 16), use `theme.scale(14)` for the one-off; don't hardcode `14`. If you need a value frequently, propose adding it to the scale instead.

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

**Why:** Dynamic functions are first-class in v3: the C++ proxy receives the args and recomputes only the affected styles. Style arrays with falsy entries break the proxy in subtle ways (the indices shift) and force a JS-side merge step. Functions also keep all variation logic in one place near the values.

**How to apply:** Anywhere you'd reach for a ternary or `&&` in the `style` prop, move it into the stylesheet as a parameterized function. Combining pre-made styles with array syntax (`[styles.base, styles.elevated]`) is still fine: the rule is about **conditional/value-dependent** branches, not composition.

### 4. `borderRadius` always pairs with `borderCurve: "continuous"`

```ts
borderRadius: theme.radius.xl,
borderCurve: "continuous",
```

**Why:** `borderCurve: "continuous"` produces iOS-style "squircle" rounding instead of circular arcs. It's the default on iOS native UI; without it, your rounded corners look subtly off-brand next to system controls.

**How to apply:** Anytime you write `borderRadius`, add `borderCurve: "continuous"` on the next line. If a designer specifies sharp corners (radius 0), skip both.

### 5. No `as const` inside `StyleSheet.create`: the typed `create` already narrows for you

```ts
// ✅
const styles = StyleSheet.create(theme => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
  },
}));

// ❌ noisy and redundant
const styles = StyleSheet.create(theme => ({
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    position: "absolute" as const,
  },
}));
```

**Why:** `StyleSheet.create` is generic over RN's style shape, so `"row"` is already inferred against the `flexDirection` union; `as const` adds nothing and `@typescript-eslint/no-unnecessary-type-assertion` flags it.

**How to apply:** Write bare literals. If TS *does* widen a value to `string`, it's a real signal: usually the wrong `StyleSheet` import (see rule 1) or an inline object outside `create()`. Fix that, don't paper over it.

### 6. Don't pass `theme` as a prop: children call `useUnistyles()` themselves

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

**How to apply:** Only call `useUnistyles()` when you need theme values **outside** the `style` prop, e.g., for icon `color`, image `tintColor`, or string interpolation. Inside `StyleSheet.create`, the theme is already there.

### 7. Use `gap` on the parent, not `margin` on children

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

**Why:** Conflating the two leads to inconsistent rhythm: the same visual gap might be `padding` in one component and `margin` in another. Picking one rule keeps spacing readable.

### 9. Gradients via `experimental_backgroundImage`, not gradient libraries

```ts
overlay: {
  experimental_backgroundImage:
    "linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.6))",
},
```

**Why:** Native CSS-style gradients are baked into RN's New Architecture: no extra library, no extra view, no shader cost. Pulls in zero dependencies and works on both platforms.

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

**How to apply:** When you see legacy shadow props in code you're editing, migrate them. Use the design system's shadow tokens (`theme.shadows.md` etc., see template) when available.

### 11. RTL: branch on `I18nManager.isRTL`, don't hand-flip

```ts
import { I18nManager } from "react-native";

row: {
  flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
},
```

**Why:** RN's auto-RTL handles `start`/`end`, `left`/`right`, and `textAlign` correctly, but `flexDirection: "row"` does **not** auto-flip in many setups (depends on how RTL is configured at the native level). Branching is explicit and survives configuration changes. `I18nManager.isRTL` is static after app launch (the app restarts on language change), so it's safe to read directly in stylesheets without a hook.

**How to apply:** For `flexDirection: "row"`, branch with `I18nManager.isRTL`. For `translateX` in Reanimated, manually negate (`translateX: I18nManager.isRTL ? -value : value`). Chevron icons need `transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }]`. Email/phone inputs stay LTR with `writingDirection: "ltr"` regardless.

### 12. Static helpers come from `StyleSheet`, not from manual wraps

```ts
// ✅
import { StyleSheet } from "react-native-unistyles";
<View style={StyleSheet.absoluteFill} />;

// ❌
const styles = StyleSheet.create({ fill: StyleSheet.absoluteFill });
<View style={styles.fill} />;
```

**Why:** Wrapping static helpers (`absoluteFill`, `hairlineWidth`) inside `create` adds nothing: Unistyles already polyfills them on its `StyleSheet` export.

---

## Theme structure

The conventions above all assume a theme shaped a specific way. The shape:

- **`spacing`**: Tailwind-style numeric scale (`0` through `96`, on Tailwind's steps), each value passed through `moderateScale` so different-sized phones render proportionally without manual breakpoints. Plus `auto` and a `scale` helper for one-offs.
- **`radius`**: `none, sm, base, md, lg, xl, 2xl, 3xl, full`.
- **`fontSize`**: `xxs, xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl, 6xl, 7xl, 8xl, 9xl`.
- **`sizing`**: spacing scale + `full | screen | min | max | fit` for percentage/intrinsic sizes.
- **`fontWeight`**: `extraLight (200) … black (900)`.
- **`screen`**: `width`, `height`, `isTablet`, `isSmallDevice`, `isLargeDevice` (computed once at startup; fine for layout decisions, not for live orientation changes; use `rt.screen` from `(theme, rt) =>` for that).
- **`scale`**: exposed at the top level for raw scaling needs.
- **Color tokens**: semantic groups (`primary`, `secondary`, `accent`, `bg`, `text`, `neutral`, `success`, `warning`, `error`, `info`). Multi-stop colors use either numeric (`50–500`) or `{ DEFAULT, light, border }` shape.
- **`shadows`** (optional): `none, sm, md, lg, xl`, pre-baked `boxShadow` strings or legacy objects depending on what you've migrated.
- **`typography`** (optional): design-system-named text styles (`h1, h2, h3, paragraphL/M/S, paragraphMSoft/SSoft, labelM, label`) that can be spread into a style: `...theme.typography.paragraphMSoft`.

For the full template you can drop into a new project, read **`references/theme-template.md`**.

---

## When to read which reference

```
Setting up unistyles in a new project
└─ references/upstream/setup-guide.md  (Babel plugin, TS, Expo Router)
└─ references/theme-template.md        (drop-in unistyles.ts)

Writing or refactoring components
└─ THIS FILE (conventions + rationale)
└─ references/component-patterns.md    (card, button, RTL row, list item, gradient, themed icon)

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

Inherited from the library author's skill: they cause silent breakage if violated, so keep them in view even when you're "just" applying conventions:

1. **Never spread styles** (`{...styles.x}`): breaks the C++ proxy. Use `[styles.x, styles.y]` for composition.
2. **Babel plugin is required**: `['react-native-unistyles/plugin', { root: 'src' }]` in `babel.config.js`.
3. **`StyleSheet.configure()` runs once before any `create`**: do it in the app entry, not lazily.
4. **`styles.useVariants(...)`** must be called before reading variant-dependent styles, like a hook.

Full text + more in `references/upstream/skill.md`.

---

## Before a component is done

Walk conventions 1–12 against what you actually wrote: the bar is that *every* one holds, not most. Most misses cluster in three: a stray hardcoded value or hex, a `borderRadius` with no `borderCurve` beside it, or a conditional written as a `[base, cond && x]` array instead of a function.

One project convention not covered above: network images use `TurboImage`, not RN's `Image`.

---

## Attribution

The `references/upstream/` directory contains the official react-native-unistyles v3 agent skill written by **Jacek Pudysz** ([jpudysz](https://github.com/jpudysz)), creator and maintainer of the library. Source: https://github.com/jpudysz/react-native-unistyles/tree/main/skills/react-native-unistyles-v3. Bundled here so this skill works offline and in projects that don't already have the upstream installed. All credit for that material goes to the upstream author.
