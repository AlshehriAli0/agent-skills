---
name: expo-ui-full-reference
description: >-
  Build native UI from React with @expo/ui — real SwiftUI on iOS and Jetpack Compose on
  Android — in an Expo or React Native + TypeScript app. Covers universal cross-platform
  components imported from '@expo/ui' (Host, Row, Column, Button, Text, List, Picker, Switch,
  Slider, BottomSheet), platform-specific SwiftUI ('@expo/ui/swift-ui') and Jetpack Compose
  ('@expo/ui/jetpack-compose') trees and modifiers, and drop-in replacements for RN community
  libraries ('@expo/ui/community/*'). Use whenever building or reviewing native-feeling UI
  that plain React Native handles poorly: a settings screen, grouped form, native picker,
  context menu, action/bottom sheet, segmented control, toggle, slider, or any
  Host/RNHostView tree — and when choosing universal vs platform-specific components, applying
  SwiftUI/Compose modifiers, or fixing 'Unable to get view config' crashes. Keywords: Expo UI,
  @expo/ui, SwiftUI/Jetpack Compose in React Native. Not for custom
  native modules, Expo Router navigation, Reanimated, or data fetching.
license: MIT
allowed-tools: "Bash(node *expo-ui-full-reference/scripts/*.js *)"
metadata:
  version: "1.0.0"
---

# Expo UI Full Reference (`@expo/ui`)

This is the complete `@expo/ui` reference: every component across all layers (universal,
SwiftUI, Jetpack Compose), the full modifier catalogs, drop-in replacements, copy-paste
screen templates, and tooling — everything needed to build good native UI with Expo UI,
keyed to SDK 56. Start at the mental model below, then load the one reference file the task
needs.

`@expo/ui` renders **real native UI from React**: SwiftUI views on iOS, Jetpack Compose
on Android. It is a *primitives* library (like `<div>`/`<span>` for the OS), not a styled
design kit. Reach for it when you want controls that look and behave exactly like the
system — settings forms, pickers, sheets, menus, toggles, sliders — and keep plain React
Native `View`/`Text` (NativeWind, flexbox) for custom-branded, heavily-styled UI. The two
mix freely at the component level.

## Mental model (the one thing to get right)

Every `@expo/ui` tree is an **island of native UI** bridged into your RN tree by a
**`Host`**. Think of `Host` like `<svg>` in the DOM or `<Canvas>` in Skia: the bridge
boundary. This drives the #1 rule agents get wrong:

> **Flexbox / Yoga styles apply to the `Host` only. Inside a Host, there is no Yoga.**
> Lay out children with native primitives and their props/modifiers, never with RN
> `style={{ flex, flexDirection, justifyContent, alignItems, gap }}`:
> - Universal/SwiftUI: `Row`/`Column`/`HStack`/`VStack` with `spacing` + `alignment`.
> - Compose: `Row`/`Column` with `horizontalArrangement`/`verticalArrangement` +
>   `modifiers={[...]}` from `@expo/ui/jetpack-compose/modifiers`.
> Putting `style={{ flex: 1 }}` on a `Button`/`Text`/`Row` inside a Host is a no-op or a
> bug. Run `scripts/audit-expo-ui.js` to catch this automatically.

`Host` is **always imported from the `@expo/ui` root**, even when its children are
platform-specific. `Host` itself takes either `matchContents` (size to content — best for
inline widgets) or `style={{ flex: 1 }}` / explicit size (required when it wraps a
scrollable like `List`, `ScrollView`, `LazyColumn`).

## Choosing a layer (decision tree — stop at the first that fits)

1. **Universal first** — import from `@expo/ui`. One tree runs unmodified on iOS, Android,
   and web (web is experimental). No `.ios.tsx`/`.android.tsx` split. Covers the common
   kit: layout, `Text`, `Icon`, `Button`, `Switch`, `Checkbox`, `Slider`, `TextInput`,
   `Picker`, `BottomSheet`, `Collapsible`, `List`, `FieldGroup`. → `references/universal.md`
2. **Platform-specific** — import from `@expo/ui/swift-ui` (iOS) or
   `@expo/ui/jetpack-compose` (Android). Use **only** when universal lacks the component,
   modifier, or platform behavior you need (e.g. SwiftUI `Form`/`ContextMenu`/`glassEffect`,
   Compose `DockedSearchBar`/`FloatingActionButton`/Material 3). **Cost:** two trees and a
   file split. → `references/swift-ui.md`, `references/jetpack-compose.md`
3. **Drop-in replacements** — `@expo/ui/community/<name>`. A *migration side-path* for
   swapping out an RN community UI dependency (`@gorhom/bottom-sheet`,
   `@react-native-community/datetimepicker`, …), not part of the decision above. →
   `references/drop-in-replacements.md`

## Rules agents get wrong (read before writing code)

- **Platform packages crash on the wrong OS.** Importing `@expo/ui/swift-ui` on Android or
  `@expo/ui/jetpack-compose` on iOS throws `Unable to get view config`. Isolate platform
  trees in `.ios.tsx` / `.android.tsx` files under `components/` (never inside `app/` —
  Expo Router rejects platform suffixes on route files with a "no fallback sibling" error),
  or guard with `Platform.OS`. Re-export from a plain route file.
- **The callback prop name differs by layer.** Universal `Button` and SwiftUI `Button` use
  `onPress`; Compose `Button` uses `onClick`. Don't assume.
- **`TextInput`/`TextField` value is not a plain string** when using `useNativeState` — it
  takes an `ObservableState` for flicker-free worklet updates, and needs
  `react-native-worklets`. See the universal/platform references.
- **`List` / `LazyColumn` items run on the JS thread** (each row is a JSX node) — fine for
  settings-sized lists, not for large data sets.
- **Modifiers mirror native APIs.** Apple/Google sample code is roughly a search-and-replace
  away. Apply them via the `modifiers={[...]}` prop (order matters), importing from
  `@expo/ui/swift-ui/modifiers` or `@expo/ui/jetpack-compose/modifiers`.

## SDK gating (verify against the installed version, do not trust memory)

- **Universal layer requires SDK 56+.** Platform-specific (`swift-ui`, `jetpack-compose`)
  and drop-ins also work on **SDK 55**.
- On **SDK 56**, `@expo/ui` is in Expo Go, so `npx expo start` runs it directly. On older
  SDKs, build a dev client (`npx expo run:ios` / `run:android`).
- `@expo/ui` is versioned with the SDK (`56.0.x` for SDK 56) and its API has changed
  between cycles. **The installed package's TypeScript types are the source of truth** —
  the reference tables below are the fast map, but confirm exact prop shapes against what is
  installed. From the project root:
  ```bash
  node <skill-root>/scripts/list-components.js <project-path>          # what's installed (names)
  node <skill-root>/scripts/list-components.js <project-path> --docs   # + modifier descriptions
  ```
  Then read `node_modules/@expo/ui/build/<layer>/<Component>/index.d.ts` for prop shapes, or
  fetch the per-component doc page: `https://docs.expo.dev/versions/latest/sdk/ui/<layer>/<component>/index.md`.

## Reference map (load only the one you need)

```
references/
  universal.md             '@expo/ui' cross-platform components — START HERE (SDK 56+)
  swift-ui.md              '@expo/ui/swift-ui' iOS components (SDK 55+, iOS only)
  swift-ui-modifiers.md    full SwiftUI modifier catalog (~95) — load for any non-obvious modifier
  jetpack-compose.md       '@expo/ui/jetpack-compose' Android components (SDK 55+, Android only)
  jetpack-compose-modifiers.md  full Compose modifier catalog
  drop-in-replacements.md  '@expo/ui/community/*' API-compatible swaps (migration side-path)
assets/
  universal-screen.tsx        copy-paste universal settings screen (Expo Router)
  swiftui-screen.ios.tsx      copy-paste SwiftUI-only screen
  compose-screen.android.tsx  copy-paste Compose-only screen
  install.md                  install + config snippet
scripts/
  list-components.js       enumerate components/modifiers in the *installed* version
  audit-expo-ui.js         flag flexbox-on-@expo/ui and platform imports with a universal equivalent
```

A task touching one platform should pull in **only that one reference file**. Shared
concepts (Host, the flexbox rule, the decision tree, SDK gating) live here and are not
repeated in the references.

## When this skill is unclear, incomplete, or wrong, go to the official docs

This skill is a fast map keyed to **SDK 56**, not the source of truth. If anything here is
ambiguous, looks outdated, conflicts with the installed package, or a component / prop /
modifier you need is not covered, stop guessing and check the real source in this order:

1. **Installed types** (authoritative for your version):
   `node_modules/@expo/ui/build/<layer>/<Component>/index.d.ts`, or run
   `node <skill-root>/scripts/list-components.js <project-path>` to enumerate what is installed.
2. **The per-page docs** (clean Markdown, no nav — best for agents): append `/index.md` to any
   page URL, e.g. `https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/button/index.md`.
   `versions/latest` is **SDK 56**, which this skill targets — use it.
3. **The full docs index**: `https://docs.expo.dev/llms.txt` lists every page; the Expo UI
   overview is `https://docs.expo.dev/versions/latest/sdk/ui/index.md`.

Treat a conflict between this skill and the installed `.d.ts`/docs as the skill being wrong:
the installed package wins, the latest (SDK 56) docs win next, and this skill is the hint
that gets you there fast. Do not invent props or modifiers to fill a gap.
