# Theme template (`unistyles.ts`)

A drop-in `unistyles.ts` for a new RN/Expo project. Place at the project root and import once from `index.ts` (or your app entry):

```ts
// index.ts
import "./unistyles";
import "expo-router/entry";
```

The template gives you Tailwind-style scales, screen helpers, breakpoints, and a light/dark theme. Customize the color section per project — keep the structural keys (`bg`, `text`, `primary`, etc.) so components written against the conventions are portable.

---

## Dependencies

```
bun add react-native-unistyles react-native-nitro-modules react-native-edge-to-edge react-native-size-matters
```

`react-native-size-matters` provides `moderateScale`, which scales values proportionally to the device's screen — phones look balanced without per-screen breakpoints.

`babel.config.js`:

```js
module.exports = {
  presets: ["babel-preset-expo"],
  plugins: [["react-native-unistyles/plugin", { root: "src" }]],
};
```

---

## Full template

```ts
import { Dimensions, Platform } from "react-native";
import { moderateScale } from "react-native-size-matters";
import { StyleSheet } from "react-native-unistyles";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const scale = (size: number): number => Math.round(moderateScale(size));

// ---------- Spacing (Tailwind-style numeric scale) ----------
// `as unknown as N` keeps TS literal types so theme.spacing[4] is typed as `16`,
// not `number` — useful if you later want to constrain props to specific values.
const createSpacing = () =>
  ({
    0: 0,
    px: scale(1) as unknown as 1,
    0.5: scale(2) as unknown as 2,
    1: scale(4) as unknown as 4,
    1.5: scale(6) as unknown as 6,
    2: scale(8) as unknown as 8,
    2.5: scale(10) as unknown as 10,
    3: scale(12) as unknown as 12,
    3.5: scale(14) as unknown as 14,
    4: scale(16) as unknown as 16,
    5: scale(20) as unknown as 20,
    6: scale(24) as unknown as 24,
    7: scale(28) as unknown as 28,
    8: scale(32) as unknown as 32,
    9: scale(36) as unknown as 36,
    10: scale(40) as unknown as 40,
    11: scale(44) as unknown as 44,
    12: scale(48) as unknown as 48,
    14: scale(56) as unknown as 56,
    16: scale(64) as unknown as 64,
    20: scale(80) as unknown as 80,
    24: scale(96) as unknown as 96,
    28: scale(112) as unknown as 112,
    32: scale(128) as unknown as 128,
    36: scale(144) as unknown as 144,
    40: scale(160) as unknown as 160,
    44: scale(176) as unknown as 176,
    48: scale(192) as unknown as 192,
    52: scale(208) as unknown as 208,
    56: scale(224) as unknown as 224,
    60: scale(240) as unknown as 240,
    64: scale(256) as unknown as 256,
    72: scale(288) as unknown as 288,
    80: scale(320) as unknown as 320,
    96: scale(384) as unknown as 384,
    auto: "auto" as unknown as "auto",
    scale,
  }) as const;

// ---------- Radius ----------
const createRadius = () =>
  ({
    none: 0,
    sm: scale(2) as unknown as 2,
    base: scale(4) as unknown as 4,
    md: scale(6) as unknown as 6,
    lg: scale(8) as unknown as 8,
    xl: scale(12) as unknown as 12,
    "2xl": scale(16) as unknown as 16,
    "3xl": scale(24) as unknown as 24,
    full: 9999,
    scale,
  }) as const;

// ---------- Font sizes ----------
const createFontSize = () =>
  ({
    xxs: scale(10) as unknown as 10,
    xs: scale(12) as unknown as 12,
    sm: scale(14) as unknown as 14,
    base: scale(16) as unknown as 16,
    lg: scale(18) as unknown as 18,
    xl: scale(20) as unknown as 20,
    "2xl": scale(24) as unknown as 24,
    "3xl": scale(30) as unknown as 30,
    "4xl": scale(36) as unknown as 36,
    "5xl": scale(48) as unknown as 48,
    "6xl": scale(60) as unknown as 60,
    "7xl": scale(72) as unknown as 72,
    "8xl": scale(96) as unknown as 96,
    "9xl": scale(128) as unknown as 128,
    scale,
  }) as const;

// ---------- Sizing (spacing + percentage/intrinsic helpers) ----------
const createSizing = () =>
  ({
    full: "100%",
    screen: "100vw",
    min: "min-content",
    max: "max-content",
    fit: "fit-content",
    ...createSpacing(),
    scale,
  }) as const;

const spacing = createSpacing();
const radius = createRadius();
const fontSize = createFontSize();
const sizing = createSizing();

const fontWeight = {
  extraLight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extraBold: 800,
  black: 900,
} as const;

// ---------- Shadows (boxShadow strings — paste from Figma) ----------
const shadows = {
  none: "0 0 0 rgba(0,0,0,0)",
  sm: "0 1px 2px rgba(0,0,0,0.05)",
  md: "0 2px 6px rgba(0,0,0,0.06)",
  lg: "0 4px 13px rgba(0,0,0,0.07)",
  xl: "0 8px 24px rgba(0,0,0,0.10)",
} as const;

// ---------- Typography (design-system named text styles) ----------
// Spread into style objects: `...theme.typography.paragraphM`
const fontFamily = {
  bold: Platform.select({ ios: "OpenRunde-Bold", android: "OpenRunde-Bold", default: "System" }),
  medium: Platform.select({ ios: "OpenRunde-Medium", android: "OpenRunde-Medium", default: "System" }),
  semibold: Platform.select({ ios: "OpenRunde-Semibold", android: "OpenRunde-Semibold", default: "System" }),
};

const createTypography = () =>
  ({
    h1: { fontFamily: fontFamily.bold, fontSize: scale(36), lineHeight: scale(42), letterSpacing: -0.36 },
    h2: { fontFamily: fontFamily.bold, fontSize: scale(24), lineHeight: scale(32), letterSpacing: -0.24 },
    h3: { fontFamily: fontFamily.bold, fontSize: scale(20), lineHeight: scale(24), letterSpacing: -0.2 },
    paragraphL: { fontFamily: fontFamily.semibold, fontSize: scale(18), lineHeight: scale(24), letterSpacing: -0.18 },
    paragraphM: { fontFamily: fontFamily.semibold, fontSize: scale(16), lineHeight: scale(24), letterSpacing: -0.16 },
    paragraphS: { fontFamily: fontFamily.semibold, fontSize: scale(14), lineHeight: scale(20), letterSpacing: -0.14 },
    paragraphMSoft: { fontFamily: fontFamily.medium, fontSize: scale(16), lineHeight: scale(20), letterSpacing: -0.16 },
    paragraphSSoft: { fontFamily: fontFamily.medium, fontSize: scale(14), lineHeight: scale(20), letterSpacing: -0.14 },
    labelM: { fontFamily: fontFamily.semibold, fontSize: scale(13), lineHeight: scale(20), letterSpacing: -0.13 },
    label: { fontFamily: fontFamily.medium, fontSize: scale(13), lineHeight: scale(18), letterSpacing: 0 },
  }) as const;

const typography = createTypography();

// ---------- Base theme (shared between light/dark) ----------
const baseTheme = {
  spacing,
  radius,
  fontSize,
  sizing,
  fontWeight,
  fontFamily,
  typography,
  shadows,
  scale,
  screen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    isTablet: SCREEN_WIDTH > 600 || SCREEN_HEIGHT > 600,
    isSmallDevice: SCREEN_WIDTH < 375,
    isLargeDevice: SCREEN_WIDTH > 414,
  },

  // ---------- Colors (rename per project; keep keys stable) ----------
  bg: {
    default: "#FFFFFF",
    subtle: "#F3FCFF",
    muted: "#ECF4F6",
  },
  neutral: {
    50: "#FFFFFF",
    100: "#FBFBFB",
    200: "#F5F5F5",
    300: "#F0F0F0",
    400: "#EBEBEB",
    500: "#E2E2E2",
  },
  primary: {
    50: "#EBF3EF",
    100: "#93E5B7",
    200: "#7BE1A7",
    300: "#62DD97",
    400: "#44D884",
    500: "#00CD59",
    DEFAULT: "#00EB67",
    border: "rgba(0, 235, 103, 0.5)",
  },
  secondary: {
    50: "#CDE1E6",
    100: "#93A6A9",
    200: "#7B9397",
    300: "#627F84",
    400: "#44676C",
    500: "#003038",
    DEFAULT: "#00C2DD",
  },
  white: "#FFFFFF",
  black: "#232323",
  background: "#FFFFFF",
  disabled: "#F4F5F7",
  success: { DEFAULT: "#00EB67", light: "#C3FFCF" },
  warning: { DEFAULT: "#EDBE43", light: "#EDBE4326" },
  error: { DEFAULT: "#FF1991", light: "#FA87C326" },
  info: { DEFAULT: "#00C2DD", light: "#77E6FF26" },
  text: {
    primary: "#232323",
    secondary: "#687076",
    muted: "#9BA1A6",
    inverse: "#FFFFFF",
  },
  ring: "#00EB67",
} as const;

// ---------- Themes (override only the bits that change in dark) ----------
const themes = {
  light: { ...baseTheme } as const,
  dark: {
    ...baseTheme,
    background: "#151718",
    bg: {
      default: "#151718",
      subtle: "#1E2124",
      muted: "#2A2E32",
    },
    text: {
      primary: "#ECEDEE",
      secondary: "#9BA1A6",
      muted: "#687076",
      inverse: "#232323",
    },
  } as const,
};

const breakpoints = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  superLarge: 2000,
  tvLike: 4000,
} as const;

type AppBreakpoints = typeof breakpoints;
type AppThemes = typeof themes;

declare module "react-native-unistyles" {
  interface UnistylesThemes extends AppThemes {}
  interface UnistylesBreakpoints extends AppBreakpoints {}
}

StyleSheet.configure({
  settings: { initialTheme: "light" },
  // Or for OS-driven theme switching:
  // settings: { adaptiveThemes: true },
  breakpoints,
  themes,
});

export { scale, SCREEN_HEIGHT, SCREEN_WIDTH, themes };
```

---

## What to customize

- **Colors** — replace `primary`, `secondary`, semantic colors with your brand palette. Keep the **shape** (numeric stops `50–500`, `{ DEFAULT, light }` for semantic colors) so components stay portable.
- **Typography fonts** — swap `OpenRunde-*` for whatever you've loaded. Keep variant names (`h1, paragraphM, ...`).
- **Dark theme** — only override the keys that genuinely differ. Spreading `baseTheme` and overriding a few nested objects is the cleanest pattern.
- **Spacing/radius/fontSize scales** — usually leave alone. They're already exhaustive enough that designers can pick a token rather than ask for a custom value.

## What not to change

- **Don't drop `as unknown as N`** — you lose literal types and the `theme.spacing[4]: 16` narrowing.
- **Don't drop `moderateScale`** — without scaling, your phone-tablet layouts will diverge in painful ways.
- **Don't add a per-component `theme` argument** — the function form `(theme, rt) =>` is the only argument shape Babel can rewrite reactively.
