# Performance & reactivity tuning

Legend-State is fast by default because it renders less. These are the levers for keeping it that way, plus how
to debug when a component renders more than you expect.

## Foundations (in `reactivity.md`)

The tracking model (what `get()`/looping/`peek()` do) and batching (`batch`, `beginBatch`/`endBatch`) are the
basis of every optimization here — see `reactivity.md`. The one-liners you need most often:

- Read the **narrowest** node, in an observing context, with `get()`; use `peek()` to read without subscribing.
- Wrap bulk writes in `batch(() => ...)` so observers and persistence fire once, not per change.

## Iterating large arrays creates Proxies

Reading through observable nodes creates a Proxy per accessed child. For big read-only loops, get the raw data
first:
```ts
// 🔥 creates proxies for every item.data.value
state$.items.forEach(item => sum += item.data.value.get())
// 💨 plain objects, no proxy overhead
state$.items.get().forEach(item => sum += item.data.value)
```

## Arrays

### Stable id is required for optimized arrays
Each object needs a unique `id` (or `key`). If your id lives elsewhere, supply an extractor next to the array:
```ts
const data$ = observable({
  arr: [] as Item[],
  arr_keyExtractor: (item) => item.idObject._id,
})
```
Legend-State tracks elements by path; `splice`/reorder changes indices, so it uses the id to keep each row's
observable stable and to re-render only moved/changed rows.

### Render with `For`, don't get() while mapping
`For` extracts each row into its own context. If you `map` manually, use `peek()` for the key so you don't track
every element (which would make the parent observe the whole list):
```tsx
state$.arr.map(item$ => <Row key={item$.peek().id} item$={item$} />)
```
Let the child `useValue(item$.field)` — don't read item fields in the parent.

### `optimized` prop
`<For each={list$} item={Row} optimized />` reuses React nodes instead of replacing them when the array length is
unchanged (sorts, swaps, replace-all). Huge win for reorderable lists. Caveat: because it reuses nodes, it can
misbehave with some enter/exit animations or external DOM mutation — don't use it there.

## Keep parents render-once

- `useValue` on the **narrowest** node you need, not a parent object.
- Render leaf values with `<Memo>{obs$}</Memo>` so they self-update.
- Two-way bind inputs with `$`-prefixed reactive components instead of value+onChange state.
- Pass observables down through props/Context rather than primitive values.
- `get(true)` for shallow listening when you only care about keys added/removed.
- `peek()` when you genuinely don't want to re-render on a value.

## Tracing (why is this rendering?)

From `@legendapp/state/trace`, called inside a component (each accepts an optional name):

- `useTraceListeners()` — logs every observable the component currently tracks.
- `useTraceUpdates()` — logs which observable change caused each render (`from` → `to`).
- `useVerifyNotTracking()` — `console.error` if the component tracks anything (use to confirm a parent is render-once).
- `useVerifyOneRender()` — `console.error` if it renders more than once.

To hunt a noisy observable, attach a listener with a breakpoint:
```ts
state$.count.onChange(({ value }) => { console.log('count', value); console.trace(); debugger })
```

What to do with findings: move `get()` up to a parent node to listen once instead of per-child; switch to a
shallow `get(true)`; or `peek()` to stop tracking. Render the value with `Memo` instead of reading it into the
component body.

## `enableReactTracking({ warnMissingUse: true })`

Optional dev aid that warns when `get()` is called in a React component without `useValue`, catching reactivity
that would silently break. Add it once at app entry during development.
