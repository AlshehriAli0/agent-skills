---
name: implementing-legend-state
description: >-
  Implement Legend-State (v3) as the primary state management layer in a React or React Native app.
  Use this whenever the task involves Legend-State or @legendapp/state, OR whenever you are adding,
  refactoring, or designing state management and the project uses (or is being moved to) Legend-State:
  creating observables, wiring components with useValue, building global stores, computed/derived state,
  fine-grained reactivity (For/Show/Switch/Memo), local persistence (MMKV, AsyncStorage, localStorage,
  IndexedDB, expo-sqlite), or remote sync (synced, syncedCrud, Supabase, TanStack Query, fetch, Keel).
  Also use it when migrating from Zustand, Redux, Jotai, Recoil, or plain TanStack Query to Legend-State,
  or when reviewing/fixing existing Legend-State code. v3 changed the core React pattern, so do not rely
  on memory of older Legend-State APIs — follow this skill.
---

# Implementing Legend-State (v3)

Legend-State is a signal-based state library: you wrap data in an `observable`, read it with `get()`,
change it with `set()`, and components re-render only on the exact values they read. It handles local
state, global state, persistence, and remote sync in one model, so it can be a project's *primary* state
driver rather than one of several libraries.

This skill encodes the v3 way of doing things. The most common failure mode is writing v2-era code from
memory (`observer` + `.get()`, `useSelector`, `computed`, `persistObservable`). v3 changed these. When in
doubt, trust this skill and the reference files over prior knowledge.

## Before you write code

1. **Confirm the version.** v3 is currently published under the `@beta` tag (`npm install @legendapp/state@beta`).
   If the project already depends on `@legendapp/state`, check `package.json` — if it's `2.x`, you are in v2
   and should read `references/migration-and-gotchas.md` before changing anything. Quickly verify the current
   latest/beta if network access is available; don't hardcode a version number you're unsure about.
2. **Read the reference file(s) for the task.** This SKILL.md is a map. Load the specific reference below for
   the area you're working in — it has the full API surface and worked examples.
3. **Match the platform.** Reactive component imports differ: web uses `@legendapp/state/react-web` (`$React.div`),
   React Native uses `@legendapp/state/react-native` (`$TextInput`, `$View`, `$Text`). Persistence plugins differ too.

## Reference map (load on demand)

| You are doing... | Read |
| --- | --- |
| Creating observables, get/set/peek/assign/delete, computeds, linked, lookup tables, arrays | `references/observables.md` |
| Listening/deriving outside React: observe, when, onChange, observing contexts, batching | `references/reactivity.md` |
| Anything React: reading state, hooks, fine-grained components, Context, two-way binding | `references/react.md` |
| Persistence (MMKV/AsyncStorage/localStorage/IndexedDB/expo-sqlite) or remote sync (CRUD/Supabase/Query/fetch/Keel) | `references/sync-and-persistence.md` |
| Optimizing renders, large lists/arrays, debugging extra renders | `references/performance.md` |
| Helper functions/observables: ObservableHint, mergeIntoObservable, trackHistory, undoRedo, time, pageHash | `references/helpers.md` |
| Worked patterns: persisted store, auto-saving form, validation, list, animation, router | `references/recipes.md` |
| Migrating from v2, Zustand, Redux, or raw TanStack Query; or fixing wrong/old code | `references/migration-and-gotchas.md` |

Copy-paste starting points live in `assets/` (store, persistence setup, CRUD factory). An auditing script that
flags deprecated patterns lives in `scripts/audit_legend_state.py` — run it after a migration or before review
(usage at the bottom of this file).

## The core rules (the parts most likely to be done wrong)

These are short because the reference files carry the detail. They're here because getting them wrong produces
code that compiles but silently breaks reactivity.

### 1. Read with `useValue`, not `observer` + `.get()`

In v3 the default way to consume an observable in a React component is the `useValue` hook. It tracks every
observable read while it runs and re-renders only when the computed result changes.

```tsx
import { useValue } from '@legendapp/state/react'

const theme = useValue(settings$.theme)            // re-renders when theme changes
const isDark = useValue(() => settings$.theme.get() === 'dark') // re-renders when the boolean flips
```

`observer` still exists, but in v3 it is an *optional optimization* (it merges many `useValue` calls into one
hook) and is no longer the recommended default. The old pattern of `observer(() => { const x = state$.x.get() })`
is discouraged because it is incompatible with React Compiler. `useSelector` and `use$` are former names for
`useValue` — use `useValue`. Details and the `observer` optimization case: `references/react.md`.

### 2. Name observables with a `$` suffix

Convention, not enforced, but it keeps observables visually distinct from plain values and matches every doc and
plugin example: `const user$ = observable(...)`, and item observables from `For` arrive as `item$`.

### 3. Change state with `set()` / `assign()`, never direct assignment

Direct assignment to objects/arrays is blocked on purpose (a "footgun guard") and won't notify listeners.

```ts
state$.text.set('hi')                 // ✅
state$.assign({ a: 1, b: 2 })         // ✅ shallow merge, batched
state$.count.set(c => c + 1)          // ✅ updater form
state$.obj = {}                       // ❌ throws / no notification
```

### 4. Computeds are just functions inside the observable

There is no separate `computed` in v3 — a function is a lazy computed that recomputes when the observables it
reads change. It only recomputes while it's being observed.

```ts
const state$ = observable({
  fname: 'Annyong',
  lname: 'Bluth',
  fullName: () => state$.fname.get() + ' ' + state$.lname.get(), // computed child
})
```

### 5. Don't clone to update — mutate the observable directly

Legend-State is mutable by design (immutability is slower and unnecessary here). The React habit of spreading a
new object/array is an anti-pattern: do the targeted operation on the observable.

```ts
list$.push(item)            // ✅  not list$.set([...list$.get(), item])
record$.key.set('value')    // ✅  not record$.set({ ...record$.get(), key: 'value' })
list$[i].delete()           // ✅  removes the element
```

### 6. `get()` tracks, `peek()` doesn't

Inside an observing context (`useValue`, `observe`, a computed, a synced `get`), `get()` subscribes to changes.
Use `peek()` to read without subscribing — important when reading a value you don't want to re-render on, and
when generating keys while mapping arrays.

### 7. Arrays of objects need a stable `id`, and render with `For`

Each object in an observable array should have a unique `id` (or `key`, or a `${arr}_keyExtractor`). Render lists
with the `For` component so each row tracks itself and the parent doesn't re-render. Inside `map`, use
`item.peek().id` for the key so you don't accidentally track every element. Full array guidance:
`references/performance.md`.

### 8. `synced` is lazy; `syncObservable` is eager

`synced(...)` inside `observable(...)` sets up persistence/sync that activates on first `get()`. `syncObservable(state$, ...)`
starts immediately on a value you already created. Both take the same options. Pick a persistence plugin for the
platform and (optionally) set defaults once with `configureSynced`. Full sync model: `references/sync-and-persistence.md`.

## A minimal, correct end-to-end example

```tsx
import { observable } from '@legendapp/state'
import { useValue, For } from '@legendapp/state/react'
import { syncObservable } from '@legendapp/state/sync'
import { ObservablePersistMMKV } from '@legendapp/state/persist-plugins/mmkv' // RN; use local-storage on web

interface Todo { id: string; text: string; done?: boolean }

const store$ = observable({
  todos: [] as Todo[],
  remaining: (): number => store$.todos.get().filter(t => !t.done).length, // computed
  addTodo: (text: string) =>
    store$.todos.push({ id: crypto.randomUUID(), text }),
})

syncObservable(store$, { persist: { name: 'todos', plugin: ObservablePersistMMKV } })

function Row({ item$ }: { item$: typeof store$.todos[number] }) {
  const done = useValue(item$.done)
  return <Text onPress={() => item$.done.set(d => !d)}>{useValue(item$.text)} {done ? '✓' : ''}</Text>
}

export function TodoList() {
  const remaining = useValue(store$.remaining)
  return (
    <>
      <Text>Remaining: {remaining}</Text>
      <For each={store$.todos} item={Row} />
    </>
  )
}
```

## Using Legend-State as the primary state driver

When the goal is to make Legend-State the main state layer (replacing Zustand/Redux and absorbing server-cache
duties), apply these defaults:

- **One source of truth per domain.** Either a single large `store$` or several feature atoms — both are fine;
  pick one convention per project and keep it (`references/observables.md` and `assets/store.template.ts`).
- **Co-locate sync with the data, not the UI.** Define `synced`/`syncedCrud` in the observable so components only
  ever `get()`/`set()`; there's no fetching or mutation code in components. This is what replaces most manual
  TanStack Query usage (`references/sync-and-persistence.md`).
- **Keep components render-once.** Prefer fine-grained reads (`useValue` on the narrowest node, `For`, `Memo`,
  two-way `$`-bound inputs) so parents don't re-render on child changes (`references/react.md`, `references/performance.md`).
- **Persist by default for local-first.** Set a global persist plugin with `configureSynced`, then name each
  store (`assets/persist.native.template.ts` / `assets/persist.web.template.ts`).

## Auditing existing code

After writing or migrating code, run the auditor to catch deprecated/anti-pattern usage:

```bash
python scripts/audit_legend_state.py <path-to-src>
```

It reports `file:line` for things like `useSelector`/`use$`, `observer` with `.get()`, `computed(`,
`persistObservable(`, direct-assignment-then-`set`, and clone-then-`set`. It's a grep-based heuristic, so treat
hits as "review this," not absolute errors. Reasoning behind each flag is in `references/migration-and-gotchas.md`.
