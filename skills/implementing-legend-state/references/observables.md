# Observables: the core API

An observable wraps any data (primitive, deep object, array, function) in a Proxy that exposes
`get`/`set`/`peek`/etc. on every node. It never mutates your underlying data — each node is a path into the
raw object. This is why you can read/write deeply nested or currently-`undefined` paths safely.

## Creating

```ts
import { observable } from '@legendapp/state'

// Object store (can be as deep as you want)
const state$ = observable({
  fname: 'Annyong',
  lname: 'Bluth',
  name: () => state$.fname.get() + ' ' + state$.lname.get(),  // computed child
  setName: (name: string) => {                                 // action child
    const [fname, lname] = name.split(' ')
    state$.assign({ fname, lname })
  },
})

// Individual atoms
const fname$ = observable('Annyong')
const count$ = observable(0)

// Typed
interface Store { todos: Todo[]; total: number }
const store$ = observable<Store>({ todos: [], total: () => store$.todos.get().length })
```

## Methods on every node

### `get()`
Returns the raw value. Inside an observing context it **tracks** the node and re-runs on change.

```ts
const name = state$.fname.get()
state$.get(true)   // shallow: only track keys being added/removed, not deep changes
```
Reading large data you don't need to track? Get the raw object first so you don't create Proxies for every child:
```ts
const { data } = state$.get()
processData(data)  // plain object, no Proxy overhead
```

### `peek()`
Same raw value as `get()` but **never tracks**. Use to read without subscribing.

### `set()`
Sets the value at any path, filling in intermediate objects if needed. Supports an updater function.
Returns `void` (no chaining in v3).

```ts
state$.text.set('hello')
state$.text.set(prev => prev + '!')
state$.deeply.nested.path.set('ok')   // creates the tree if missing
```
`set` writes into the raw data without cloning it; Legend-State deep-equality-checks to decide what to notify.
Setting an object to an equal clone notifies nothing.

### `assign()`
Shallow merge (like `Object.assign`), batched into one notification. For deep merge use `mergeIntoObservable`.
```ts
state$.assign({ text: 'hi', text2: 'there' })
```

### `delete()`
Removes a key from an object, or an element from an array (re-indexing).
```ts
state$.text.delete()
arr$[0].delete()      // ['a','b'] -> ['b']
state$.delete()       // sets whole thing to undefined
```

### `toggle()`
Booleans: `state$.isReady.toggle()`.

### `onChange()`
Listen to any change within a node (fires recursively up the tree — use as narrowly as possible).
```ts
const dispose = state$.text.onChange(({ value, getPrevious, changes }) => { /* ... */ })
```

## Safety / mutability rules (important)

Direct assignment is intentionally blocked for objects to prevent accidental mutation that doesn't notify:

```ts
state$.text = 'hi'      // ❌ throws (use .set)  — primitives may assign in some modes but prefer .set
state$.obj = {}         // ❌ throws
state$ = {}             // ❌ would destroy the observable
state$.set({ ... })     // ✅
state$.assign({ ... })  // ✅
```

**Never mutate the raw value and set it back** — that mutates the observable's own data, so setting it back is a
no-op:
```ts
// ❌ no notification
const v = state$.get(); v.key = 'new'; state$.set(v)
// ✅
state$.key.set('new')
```

**Don't clone to update** (the React reflex). Operate on the observable directly — see Arrays below.

If you really want `=` assignment, opt in with `enable$GetSet()` (then `state$.x.$` reads/writes) or
`enable_PeekAssign()` (then `state$.x._` reads/writes without notifying). See `migration-and-gotchas.md`/configuring.

## Computed observables (functions)

Any function in an observable is a lazy computed. It becomes a computed observable the first time you `get()`/`peek()`
it, then recomputes when its tracked dependencies change. **It only recomputes while being observed** — if a computed
had side effects in v2 that relied on always running, that changes in v3.

```ts
const state$ = observable({
  fname: 'A', lname: 'B',
  fullName: () => state$.fname.get() + ' ' + state$.lname.get(),
})

state$.fullName()        // calls the function, returns value, recomputes every call
state$.fullName.get()    // activates a cached computed observable that recomputes on dependency change
```
Standalone computed:
```ts
const name$ = observable(() => state$.fname.get() + ' ' + state$.lname.get())
```

## Async observables

Pass a Promise or async function. Value starts `undefined`, then fills in on resolve. Activated by `get()`.

```ts
const server$ = observable(() => fetch('url').then(r => r.json()))

const data = await when(server$)            // resolve via when()
const { isLoaded, error } = syncState(server$).get()  // load status (see sync-and-persistence.md)
```

## Linked observables (two-way derived)

`linked` binds a node to custom `get`/`set` (and optional `initial`). Use for "select all" toggles,
serialize/deserialize, etc.

```ts
import { observable, linked } from '@legendapp/state'

const selected$ = observable([false, false, false])
const all$ = observable(linked({
  get: () => selected$.every(v$ => v$.get()),
  set: (value) => selected$.forEach(v$ => v$.set(value)),
}))

const arr$ = observable(linked({
  get: () => JSON.parse(str$.get()),
  set: (value) => str$.set(JSON.stringify(value)),
}))
```

### Linking to another observable
Returning an observable from a computed creates a two-way link; reads and writes pass through to the target.

```ts
const state$ = observable({
  items: ['hi', 'there', 'hello'],
  selectedIndex: 0,
  selectedItem: () => state$.items[state$.selectedIndex.get()], // link
})
state$.selectedItem.set('HELLO!')  // writes through into items[index]
```

### Lookup table
A function taking a single string key acts as a keyed lookup that returns a computed/link per key.

```ts
const state$ = observable({
  selector: 'text',
  items: { test1: { text: 'hi', other: 'bye' } },
  texts: (key: string) => state$.items[key][state$.selector.get()],
})
state$.texts['test1'].get()        // same as state$.items.test1.text.get()
state$.texts.test1.set('hello')    // writes through
```

## Arrays

Observable arrays have the usual methods. Looping methods (`map`, `filter`, `find`, `forEach`, `some`, `every`,
`includes`, `join`, `findIndex`) set up **shallow tracking** automatically and pass observables to the callback.
`filter` returns an array of observables; `find` returns an observable or undefined.

```ts
list$.push(item)                 // add
list$[i].set(next)               // replace element
list$[i].delete()                // remove element
const idx = list$.get().findIndex(x => x.id === id); list$[idx].delete()  // remove by id
```

Performance for big arrays (proxies, `peek` for keys, the `For` component, `optimized`) lives in
`performance.md`. The short version: give objects a stable `id` and render with `For`.

## `event`

A valueless observable for signals like "onClosed".
```ts
import { event } from '@legendapp/state'
const onClosed$ = event()
onClosed$.onChange(() => {/* ... */})  // or .on(...)
onClosed$.fire()
```

## Store organization

Both are first-class — choose one per project:

- **One global store**: a single `observable({...})` with nested domains (`UI`, `settings`, `todos`).
- **Many atoms**: `export const theme$ = observable('light')` per concern, grouped by file.
- **Component-local**: `useObservable(...)` for state scoped to a component (see `react.md`), passed down via props
  or Context.

See `assets/store.template.ts` for a ready-to-edit global store with computeds and actions.
