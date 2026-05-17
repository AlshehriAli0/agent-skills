# Component patterns

Real, runnable patterns showing the conventions in action. Copy/paste and adapt.

---

## 1. Pressable card with overlay + footer gradient + boxShadow

The bread and butter — content card with a background image, dark overlay, gradient footer, and shadow. Demonstrates: theme spacing/radius, `experimental_backgroundImage`, `borderCurve`, `boxShadow`, `theme.scale()` for one-off sizes.

```tsx
import { Text } from "@ui/text";
import { Link } from "expo-router";
import { PressableScale } from "pressto";
import { memo } from "react";
import { View } from "react-native";
import TurboImage from "react-native-turbo-image";
import { StyleSheet } from "react-native-unistyles";

interface TreeCardProps {
  id: string;
  name: string;
  imageUrl: string;
}

export const TreeCard = memo(({ id, name, imageUrl }: TreeCardProps) => (
  <Link href={`/forest/tree/${id}`} asChild>
    <PressableScale style={styles.container}>
      <TurboImage source={{ uri: imageUrl }} style={styles.backgroundImage} resizeMode="cover" />
      <View style={styles.overlay} />
      <View style={styles.footerGradient}>
        <Text variant="paragraphM" style={styles.treeName}>
          {name}
        </Text>
      </View>
    </PressableScale>
  </Link>
));

const styles = StyleSheet.create(theme => ({
  container: {
    flex: 1,
    maxWidth: "50%",
    height: theme.scale(230),
    marginHorizontal: theme.spacing[0.5],
    marginBottom: theme.spacing[1],
    borderRadius: theme.radius.lg,
    borderCurve: "continuous",
    overflow: "hidden",
    position: "relative",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.radius.lg,
    borderCurve: "continuous",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.radius.lg,
    borderCurve: "continuous",
    experimental_backgroundImage:
      "linear-gradient(to bottom, rgba(69, 199, 255, 0.32), rgba(0, 58, 83, 0.32))",
  },
  footerGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing[3.5],
    paddingBottom: theme.spacing[3.5],
    paddingTop: theme.spacing[12],
    justifyContent: "flex-end",
    borderBottomLeftRadius: theme.radius.lg,
    borderBottomRightRadius: theme.radius.lg,
    borderCurve: "continuous",
    experimental_backgroundImage:
      "linear-gradient(to bottom, transparent 0%, rgba(0, 48, 56, 0.5) 40%, #003038 100%)",
  },
  treeName: {
    color: theme.white,
    fontWeight: theme.fontWeight.semibold,
    textAlign: "left",
  },
}));
```

**Notes:**

- `theme.scale(230)` — card height is a one-off not on the spacing scale, so we scale it explicitly rather than hardcoding `230`.
- `StyleSheet.absoluteFillObject` is the polyfilled helper — no need to wrap it in your own `StyleSheet.create`.
- The image, overlay, and footer all repeat `borderRadius` + `borderCurve` because clipping inside an `overflow: hidden` parent doesn't propagate the rounding to children's layout boxes.

---

## 2. Dynamic-function button with active/disabled states

The conventions favor **dynamic functions over style arrays** for conditional styling. This is the canonical button shape.

```tsx
import { PressableScale } from "pressto";
import { Text } from "@ui/text";
import { StyleSheet } from "react-native-unistyles";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
}

export const Button = ({ label, onPress, variant = "primary", disabled = false }: ButtonProps) => (
  <PressableScale style={styles.button(variant, disabled)} onPress={onPress} disabled={disabled}>
    <Text variant="paragraphM" style={styles.label(variant, disabled)}>
      {label}
    </Text>
  </PressableScale>
);

const styles = StyleSheet.create(theme => ({
  button: (variant: "primary" | "secondary" | "ghost", disabled: boolean) => {
    const palette = {
      primary: { bg: theme.primary[500], border: theme.primary[500] },
      secondary: { bg: theme.bg.subtle, border: theme.neutral[400] },
      ghost: { bg: "transparent", border: "transparent" },
    }[variant];
    return {
      paddingVertical: theme.spacing[3],
      paddingHorizontal: theme.spacing[4],
      borderRadius: theme.radius.xl,
      borderCurve: "continuous",
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.bg,
      opacity: disabled ? 0.5 : 1,
      alignItems: "center",
      justifyContent: "center",
    };
  },
  label: (variant: "primary" | "secondary" | "ghost", _disabled: boolean) => ({
    color: variant === "primary" ? theme.white : theme.text.primary,
  }),
}));
```

**Notes:**

- All variation logic lives **inside the stylesheet**, not the JSX — keeps components readable.
- The local `palette` lookup makes it easy to add a new variant: just add a row.
- For more than ~3 variants or complex compounding (e.g., `size × color`), consider Unistyles' built-in `variants` + `compoundVariants` (see `references/upstream/styling-patterns.md`). Dynamic functions and variants both work; pick variants when you'd otherwise have a big lookup table.

---

## 3. RTL-aware row with gap and icon flipping

```tsx
import { ChevronRight } from "lucide-react-native";
import { View } from "react-native";
import { useUnistyles, StyleSheet } from "react-native-unistyles";
import { useDir } from "@/hooks/use-dir"; // local hook reading I18nManager.isRTL
import { Text } from "@ui/text";

interface ListRowProps {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}

export const ListRow = ({ icon, label }: ListRowProps) => {
  const { isRtl } = useDir();
  const { theme } = useUnistyles();
  return (
    <View style={styles.row(isRtl)}>
      {icon}
      <Text variant="paragraphM" style={styles.label}>
        {label}
      </Text>
      <ChevronRight
        size={theme.spacing[5]}
        color={theme.text.muted}
        style={{ transform: [{ scaleX: isRtl ? -1 : 1 }] }}
      />
    </View>
  );
};

const styles = StyleSheet.create(theme => ({
  row: (isRtl: boolean) => ({
    flexDirection: isRtl ? "row-reverse" : "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
  }),
  label: {
    flex: 1,
    color: theme.text.primary,
    textAlign: "left", // means "start" in native RTL — correct
  },
}));
```

**Notes:**

- `flexDirection` is the one layout property that's safest to branch on `isRtl` explicitly.
- `textAlign: "left"` actually means "start" in RN's native RTL mode, so it does the right thing.
- Chevrons (and any directional icon) get `scaleX: -1` in RTL — they don't auto-flip.
- `useUnistyles()` is used here because the icon's `color` and `size` are **props**, not style values.

---

## 4. List item with composite/compound API

For repeated UI with multiple slots (icon + label + chevron + value), prefer a compound component over a prop-heavy one. Easier to read at the call site, easier to extend.

```tsx
// menu-item.tsx
import { Children, type PropsWithChildren } from "react";
import { View } from "react-native";
import { PressableScale } from "pressto";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@ui/text";

const MenuItemRoot = ({ children, onPress }: PropsWithChildren<{ onPress?: () => void }>) => (
  <PressableScale onPress={onPress} style={styles.row}>
    {children}
  </PressableScale>
);

const MenuItemIcon = ({ children }: PropsWithChildren) => <View style={styles.icon}>{children}</View>;

const MenuItemLabel = ({ children }: PropsWithChildren) => (
  <Text variant="paragraphM" style={styles.label}>
    {children}
  </Text>
);

const MenuItemChevron = () => <Text style={styles.chevron}>›</Text>;

export const MenuItem = Object.assign(MenuItemRoot, {
  Icon: MenuItemIcon,
  Label: MenuItemLabel,
  Chevron: MenuItemChevron,
});

const styles = StyleSheet.create(theme => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
  },
  icon: {
    width: theme.spacing[8],
    height: theme.spacing[8],
    alignItems: "center",
    justifyContent: "center",
  },
  label: { flex: 1, color: theme.text.primary },
  chevron: { color: theme.text.muted, fontSize: theme.fontSize.xl },
}));
```

```tsx
// usage
<MenuItem onPress={openSettings}>
  <MenuItem.Icon><SettingsIcon /></MenuItem.Icon>
  <MenuItem.Label>{t("settings")}</MenuItem.Label>
  <MenuItem.Chevron />
</MenuItem>
```

---

## 5. Themed gradient using theme colors

When the gradient should follow your primary color palette:

```tsx
const styles = StyleSheet.create(theme => ({
  hero: {
    paddingTop: theme.spacing[12],
    paddingBottom: theme.spacing[8],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.radius["2xl"],
    borderCurve: "continuous",
    experimental_backgroundImage: `linear-gradient(180deg, ${theme.primary[400]} 0%, ${theme.primary[600] ?? theme.primary[500]} 100%)`,
  },
}));
```

**Notes:**

- Template literals interpolate any theme color. `??` falls back if the stop you wanted doesn't exist on this project's palette.
- Stick to `linear-gradient` and `radial-gradient` — they're the supported forms.

---

## 6. Inline ScrollView with dynamic safe area via contentInset

```tsx
import { ScrollView, View } from "react-native";
import { useUnistyles, StyleSheet } from "react-native-unistyles";

export const Screen = () => {
  const { theme } = useUnistyles();
  return (
    <View style={styles.container}>
      <Header />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        contentInset={{ bottom: theme.spacing[8] }}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* ... */}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create(theme => ({
  container: { flex: 1, backgroundColor: theme.bg.default },
  scroll: { flex: 1 },
  scrollContent: {
    gap: theme.spacing[4],
    padding: theme.spacing[4],
  },
}));
```

**Notes:**

- `contentInset` is preferred over padding for dynamic spacing that interacts with safe areas / keyboards.
- The header sits **outside** the ScrollView so it doesn't scroll away.

---

## 7. FlashList renderItem (memoized)

When using FlashList v2, renderItem must be a stable callback and items should be `memo`'d.

```tsx
import { FlashList } from "@shopify/flash-list";
import { useCallback } from "react";
import { TreeCard } from "./tree-card";

export const TreeList = ({ trees }: { trees: Tree[] }) => {
  const renderItem = useCallback(
    ({ item }: { item: Tree }) => <TreeCard id={item.id} name={item.name} imageUrl={item.image} />,
    []
  );
  return <FlashList data={trees} renderItem={renderItem} keyExtractor={t => t.id} numColumns={2} />;
};
```

The `TreeCard` from pattern #1 already wraps in `memo()`, so re-renders are skipped when props are stable.

---

## When to reach for `useUnistyles()`

Only when you need theme values **outside the `style` prop** — common cases:

- Icon `color` / `size` (props, not styles)
- Image `tintColor`
- Animated values driven by theme (e.g., `useSharedValue(theme.primary[500])`)
- String interpolation, e.g., `Alert.alert("...")` text

Inside `StyleSheet.create(theme => ...)`, the theme is already there — no hook needed.

```tsx
// ✅ — theme used as a prop
const { theme } = useUnistyles();
return <ChevronRight color={theme.text.muted} size={theme.spacing[5]} />;

// ❌ — unnecessary; theme is already in scope
const { theme } = useUnistyles();
const styles = useMemo(
  () => ({ row: { backgroundColor: theme.bg.default } }),
  [theme]
);
```
