# Reactivity primitives

These are the non-React listening APIs and the tracking model they all share. (React reading lives in `react.md`;
list/array optimization lives in `performance.md`.)

## Observing contexts & what tracks

An "observing context" runs a function, tracks every observable read while it runs, and re-runs when any of them
change. Observing contexts are: computeds, `observe`, `when`, synced `get` functions, and in React `useValue`,
`observer`, and reactive components.

**Tracks** (subscribes):
- `obs.get()`
- array looping methods — `map`, `filter`, `find`, `findIndex`, `forEach`, `some`, `every`, `includes`, `join` (shallow)
- `arr.length`, `Object.keys(obs)`, `Object.values(obs)` (shallow)

**Does not track:**
- accessing a node without reading it: `state$.settings`
- `obs.peek()`

"Shallow" means it fires only when keys are added/removed, not when existing children change — this is what lets a
list parent skip re-rendering while individual rows update themselves.

## `observe`

Runs arbitrary code and re-runs whenever any observable it read changes. Returns a dispose function. The callback
gets an event with `cancel`, `onCleanup`, `num` (run count), and `previous`.

```ts
import { observe, observable } from '@legendapp/state'

const state$ = observable({ isOnline: false, toasts: [] as Toast[] })

const dispose = observe((e) => {
  if (!state$.isOnline.get()) {
    const toast = { id: 'offline', text: 'Offline' }
    state$.toasts.push(toast)
    // runs before the next re-run (i.e. when isOnline becomes true)
    e.onCleanup = () => state$.toasts.splice(state$.toasts.indexOf(toast), 1)
  }
  // e.cancel = true   // stop observing future changes
})

dispose() // stop manually
```

## `when` / `whenReady`

`when` runs a callback **once** when the selector becomes truthy, and also returns a Promise. `whenReady` treats
empty `{}`/`[]` as not-ready (plain `when` uses normal truthiness).

```ts
import { when, whenReady } from '@legendapp/state'

await when(state$.ok)                                   // promise form
when(() => state$.ok.get(), () => console.log('ready')) // callback form
const data = await when(asyncObs$)                      // resolve an async observable's value
```

## `onChange`

Low-level listener on a node; fires for any change within it (recursively up the tree), so scope it as narrowly as
possible. The callback receives `{ value, getPrevious, changes }`.

```ts
const off = state$.text.onChange(({ value }) => console.log('text →', value))
// options: { trackingType: true } shallow, { initial: true } run immediately
```
`getPrevious()` is a function (computing the previous value is opt-in because cloning is expensive).

## Batching

Multiple sets in a row notify multiple times. Batch them so observers and persistence run once (e.g. 1000 pushes →
one save instead of 1000).

```ts
import { batch, beginBatch, endBatch } from '@legendapp/state'

batch(() => { for (let i = 0; i < 1000; i++) state$.items.push(item(i)) })

beginBatch()
doManyChanges()
endBatch()
```
v3 note: there's no separate `afterBatch`; pass a completion callback as the second arg, `batch(fn, onComplete)`.
`assign()` already batches its individual sets.

## React equivalents

In components use the hook forms so they integrate with render: `useObserve`/`useObserveEffect` for `observe`,
`useWhen`/`useWhenReady` for `when`. See `react.md`.
