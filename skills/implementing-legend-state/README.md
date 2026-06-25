# implementing-legend-state

[![skills.sh](https://skills.sh/b/AlshehriAli0/agent-skills/implementing-legend-state)](https://skills.sh/AlshehriAli0/agent-skills/implementing-legend-state)

> Part of [`AlshehriAli0/agent-skills`](https://github.com/AlshehriAli0/agent-skills) — see the [root README](../../README.md) for the full skill index.

An agent skill for implementing [Legend-State](https://legendapp.com/open-source/state/) **v3** as the primary state layer in a React or React Native app. It teaches Claude / Cursor / any agent the v3 way — `useValue` over `observer`, function computeds, mutate-don't-clone, `synced`/`syncObservable` for local-first persistence and remote sync — so the agent doesn't fall back on v2-era APIs from memory.

v3 changed the core React pattern (`useSelector`/`use$` → `useValue`, no separate `computed`, `persistObservable` → `syncObservable`). This skill exists because relying on training-data memory of older Legend-State produces code that compiles but silently breaks reactivity.

## Install

```bash
npx skills add AlshehriAli0/agent-skills@implementing-legend-state -g
```

`-g` installs globally. Drop it for project-local. See the [skills CLI docs](https://github.com/vercel-labs/skills) for all flags.

## What's inside

```
.
├── SKILL.md                            # Core v3 rules + reference map + minimal end-to-end example
├── references/                         # Loaded on demand per task
│   ├── observables.md                  # observable, get/set/peek/assign/delete, computeds, lookup tables, arrays
│   ├── reactivity.md                   # observe, when, onChange, observing contexts, batching
│   ├── react.md                        # useValue, hooks, For/Show/Switch/Memo, Context, two-way binding
│   ├── sync-and-persistence.md         # MMKV/AsyncStorage/localStorage/IndexedDB/expo-sqlite + synced/syncedCrud/Supabase/Query
│   ├── performance.md                  # Render optimization, large lists/arrays, debugging extra renders
│   ├── helpers.md                      # ObservableHint, mergeIntoObservable, trackHistory, undoRedo, time, pageHash
│   ├── recipes.md                      # Worked patterns: persisted store, auto-saving form, validation, list, router
│   └── migration-and-gotchas.md        # Migrating from v2 / Zustand / Redux / raw TanStack Query; fixing old code
├── assets/                             # Copy-paste starting points
│   ├── store.template.ts
│   ├── persist.native.template.ts
│   ├── persist.web.template.ts
│   └── synced-crud.template.ts
└── scripts/
    └── audit_legend_state.py           # Flags deprecated patterns after a migration or before review
```

## When this skill triggers

Any task involving Legend-State / `@legendapp/state`: creating observables, wiring components with `useValue`, building global stores, computed/derived state, fine-grained reactivity (`For`/`Show`/`Switch`/`Memo`), local persistence, or remote sync. Also when migrating from Zustand, Redux, Jotai, Recoil, or plain TanStack Query to Legend-State, or reviewing/fixing existing Legend-State code.

## The v3 rules in 30 seconds

- Read with **`useValue`**, not `observer` + `.get()` (`observer` is now an optional optimization, incompatible with React Compiler).
- Name observables with a **`$` suffix** (`user$`, `item$`).
- Change state with **`set()` / `assign()`** — never direct assignment.
- **Computeds are just functions** inside the observable — there is no separate `computed`.
- **Mutate, don't clone** — `list$.push(item)`, not `list$.set([...list$.get(), item])`.
- **`get()` tracks, `peek()` doesn't** — use `peek()` to read without subscribing.
- Arrays of objects need a stable **`id`** and render with **`For`**.
- **`synced` is lazy** (activates on first `get()`); **`syncObservable` is eager**.

Read [`SKILL.md`](./SKILL.md) for the full set with rationale and a minimal end-to-end example.

## Auditing

After writing or migrating code, run the auditor to catch deprecated/anti-pattern usage:

```bash
python scripts/audit_legend_state.py <path-to-src>
```

It reports `file:line` for `useSelector`/`use$`, `observer` with `.get()`, `computed(`, `persistObservable(`, direct-assignment-then-`set`, and clone-then-`set`. Grep-based heuristic — treat hits as "review this," not absolute errors.

## License

MIT — see the [root LICENSE](../../LICENSE).
