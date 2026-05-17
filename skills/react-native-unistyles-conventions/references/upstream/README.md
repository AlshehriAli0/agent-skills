# Upstream skill (bundled)

The files in this directory are the official **react-native-unistyles v3 agent skill** authored by [Jacek Pudysz (@jpudysz)](https://github.com/jpudysz), creator and maintainer of [react-native-unistyles](https://github.com/jpudysz/react-native-unistyles).

**Source:** https://github.com/jpudysz/react-native-unistyles/tree/main/skills/react-native-unistyles-v3

They are bundled here verbatim so this conventions skill works offline and in projects that don't have the upstream skill installed separately. All credit for this material goes to the upstream author.

## Files

- `skill.md` — original `SKILL.md` from the upstream skill (renamed to avoid colliding with the parent skill's `SKILL.md`)
- `api-reference.md` — complete API for every export
- `setup-guide.md` — install, Babel plugin, TypeScript, Expo Router, testing
- `styling-patterns.md` — themes, variants, breakpoints, web, SSR, Reanimated
- `third-party-integration.md` — `withUnistyles`, `autoProcessPaths`, React Compiler, Reanimated, FlatList
- `common-issues.md` — troubleshooting from 150+ GitHub issues with solutions

## Updating

To refresh the bundled files, pull the latest from the upstream skill:

```sh
SKILL_PATH="references/upstream"
BASE="https://raw.githubusercontent.com/jpudysz/react-native-unistyles/main/skills/react-native-unistyles-v3"

curl -sSL "$BASE/SKILL.md"                          -o "$SKILL_PATH/skill.md"
curl -sSL "$BASE/references/api-reference.md"       -o "$SKILL_PATH/api-reference.md"
curl -sSL "$BASE/references/setup-guide.md"         -o "$SKILL_PATH/setup-guide.md"
curl -sSL "$BASE/references/styling-patterns.md"    -o "$SKILL_PATH/styling-patterns.md"
curl -sSL "$BASE/references/third-party-integration.md" -o "$SKILL_PATH/third-party-integration.md"
curl -sSL "$BASE/references/common-issues.md"       -o "$SKILL_PATH/common-issues.md"
```
