# Migration & common mistakes

## The single most important v3 change: `observer` + `.get()` → `useValue`

v3 (from beta.20) makes `useValue` the primary way to read observables in React. This exists for React Compiler
compatibility: Compiler assumes a function call returns the same value each render and may memoize it, which would
freeze Legend-State's reactivity. Hooks (anything starting with `use`) are never memoized by Compiler, so a
`useValue(state$.x)` hook stays reactive.

```tsx
// 🔴 v2 / pre-beta.20
const Component = observer(function () { const v = state$.value.get(); return <div>{v}</div> })

// ✅ v3
const Component = () => { const v = useValue(state$.value); return <div>{v}</div> }
```

`observer` is now an optional optimization that merges many `useValue` calls into one hook — keep using it for
heavy components, but still read with `useValue` inside it. `useSelector` → renamed `useValue`. `use$` →
`useValue` (and `use$` isn't Compiler-safe). `enableReactTracking({ auto: true })` is deprecated and broken in
React 19.

## v2 → v3 cheatsheet

| v2 | v3 |
| --- | --- |
| `observer` + `state$.x.get()` | `useValue(state$.x)` (optionally inside `observer`) |
| `useSelector(...)` / `use$(...)` | `useValue(...)` |
| `computed(() => ...)` | a plain function in the observable, or `observable(() => ...)` |
| `proxy(key => ...)` | a function with a string param (lookup table) |
| `useComputed(...)` | `useObservable(() => ...)` |
| `persistObservable(state$, { local: 'x' })` | `syncObservable(state$, { persist: { name: 'x' } })` |
| `configureObservablePersistence({...})` | `configureSynced({ persist: { plugin } })` |
| `{ pluginLocal }` / `persistLocal` | `persist.plugin` |
| `.state` (sync status injected on observable) | separate `syncState(state$)` |
| `Reactive.div` / `<Legend.div>` | `$React.div` (web) / `$View`,`$TextInput` (RN) |
| `For` `item` prop | `item$` prop |
| `set()`/`toggle()` returned the observable (chaining) | return `void` |
| `onSet` | `onAfterSet` |
| `afterBatch(fn)` | `batch(fn, onComplete)` |
| `trackHistory` from core | `@legendapp/state/helpers/trackHistory` |

Other v3 behavior changes to watch for:
- Computeds only recompute **while observed** — a computed relied upon for side effects in v2 may not run in v3.
- Setting an object to an equal value no longer notifies (deep equality).
- Types were rewritten; some type import names changed (Promises/nullability fixed).

Migrate incrementally: most v2 APIs still work for a while, so a global find/replace of `useSelector`→`useValue`
plus moving persistence to `syncObservable` covers most apps.

## Migrating from Zustand

Zustand's store-with-actions maps cleanly onto an observable with action functions.

```ts
// Zustand
const useStore = create((set, get) => ({
  count: 0,
  inc: () => set(s => ({ count: s.count + 1 })),
}))
const count = useStore(s => s.count)   // selector subscribes

// Legend-State
const store$ = observable({
  count: 0,
  inc: () => store$.count.set(c => c + 1),
})
const count = useValue(store$.count)   // narrower subscription, no selector boilerplate
```
Notes: no `set`/`get` callbacks — mutate the observable directly inside actions. No selector function needed for
basic reads (`useValue(store$.count)`); use a selector only for derived values. Persistence replaces the Zustand
`persist` middleware with `syncObservable(... persist ...)`. Derived data that Zustand computes in selectors
becomes a computed function in the observable.

## Migrating from raw TanStack Query

Two paths:
1. **Bridge** with `syncedQuery` / `useObservableSyncedQuery` — keep your `queryFn`/`mutationFn`, but the result
   is an observable you `useValue`, and mutations are just `set()`s. Good for incremental migration.
2. **Replace** with `syncedCrud`/`syncedFetch`/`syncedSupabase` co-located on the observable — components stop
   doing any fetching/mutating and just `get()`/`set()`. This is the end state for "primary state driver."

Server cache, optimistic updates, retries, and persistence all move into the observable definition, so the
"server state vs client state" split largely disappears.

## Top mistakes the auditor looks for (and why)

- **`observer` with `.get()` inside** — discouraged in v3, breaks under React Compiler. Use `useValue`.
- **`useSelector` / `use$`** — old names; `use$` isn't Compiler-safe. Use `useValue`.
- **`computed(`** — not the v3 way; use a function in the observable.
- **`persistObservable(`** — v2 API; use `syncObservable` + `persist`.
- **`const v = state$.get(); v.x = ...; state$.set(v)`** — mutates the raw data then no-op sets; won't notify.
  Use `state$.x.set(...)`.
- **`state$.set([...state$.get(), item])` / spread-then-set** — needless clone; use `push`/targeted `set`.
- **`item$.text.get()` in a parent `map` for keys** — tracks every element; use `peek()` for keys and let rows
  read their own fields.
- **Missing `id` on array objects** — breaks `For` optimization and stable row identity; add `id` or
  `${arr}_keyExtractor`.
- **`<For each={...} item={Row} optimized />` with enter/exit animations** — node reuse can fight the animation;
  drop `optimized` there.

## Configuring opt-ins

These augment the TypeScript interface, so importing them once (at app entry) enables them everywhere:
- `enable$GetSet()` → `state$.x.$` as shorthand for get/set (and `state$.x.$ = v`, `state$.x.$++`).
- `enable_PeekAssign()` → `state$.x._` for peek/assign without notifying.
- `enableReactTracking({ warnMissingUse: true })` → dev warning for untracked `get()` in components.
