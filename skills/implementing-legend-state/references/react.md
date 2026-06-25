# React & React Native

The whole point in React is **render less, less often**: components render once and individual nodes update
themselves. Reach for fine-grained tools (narrow `useValue`, `For`, `Memo`, two-way `$` inputs) before falling
back to component-level re-rendering.

## Reading state

### `useValue` — the default
Computes a value, tracks every observable read while running, re-renders only when the result changes. Takes an
observable or a selector function.

```tsx
import { useValue } from '@legendapp/state/react'

const theme = useValue(state$.theme)                          // raw value, re-render on change
const isSelected = useValue(() => id === state$.selected.get()) // derived, re-render when boolean flips
```

Suspense: pass `{ suspense: true }` when the observable holds a Promise and you render inside `<Suspense>`.

> `useValue` was previously `useSelector` / `use$`. Both still work for now but use `useValue`. `use$` in
> particular is not React-Compiler-safe.

### `observer` — optional optimization, not the default
`observer` wraps a component (via a Proxy, ~free) and merges all its `useValue` calls into a single hook. Use it
when a component calls `useValue` many times or consumes observables conditionally. Do **not** go back to the
v2 habit of calling `state$.x.get()` directly inside `observer` — that's discouraged in v3 and breaks under
React Compiler. Keep using `useValue`; `observer` just collapses the hooks.

```tsx
import { observer, useValue } from '@legendapp/state/react'

const Component = observer(function Component() {
  const a = useValue(state$.a)   // these
  const b = useValue(state$.b)   // collapse into
  const c = useValue(state$.c)   // one hook
  return <Text>{a}{b}{c}</Text>
})
```

### `useObserve` / `useObserveEffect`
`useEffect`-like, but reacts to observable changes instead of a deps array. `useObserve` runs during render;
`useObserveEffect` runs after mount. Optional second callback runs after the selector and doesn't track.

```tsx
useObserve(() => { document.title = profile$.name.get() })
useObserve(profile$.name, ({ value }) => { document.title = value })  // observe one, act in callback
```

### `useWhen` / `useWhenReady`
Hook forms of `when` (see Reactivity in `observables.md`/sync docs).

## Local state hooks

### `useObservable`
Creates an observable scoped to the component. Not auto-tracked — read it with `useValue` like any other. A
function arg makes it a computed.

```tsx
const state$ = useObservable({ first: '', last: '' })
const fullName$ = useObservable(() => `${state$.first.get()} ${state$.last.get()}`)
```

### `useObservableReducer`
`useReducer` shape, but updates an observable instead of triggering a render.

## Context (the good kind)

Put an observable in Context. The observable object is stable, so `useContext` never causes a re-render — only
the nodes you `useValue`/`Memo` update. This avoids the usual "context change re-renders all consumers" problem.

```tsx
const StateContext = createContext<Observable<UserState>>(undefined as any)

function App() {
  const state$ = useObservable({ profile: { name: '' } })
  return <StateContext.Provider value={state$}><Sidebar /></StateContext.Provider>
}

function Sidebar() {
  const state$ = useContext(StateContext)     // never re-renders from this
  return <Memo>{state$.profile.name}</Memo>   // this node updates itself
}
```

## Fine-grained reactivity components

### `Memo` — render a value/selector that updates itself
The children re-render themselves on change; the parent does not. This is the most basic fine-grained tool.
```tsx
<Memo>{count$}</Memo>
<Memo>{() => <Text>Count: {count$.get()}</Text>}</Memo>
```

### `Computed` — extract children into their own tracking context
Like `Memo`, but it *will* re-render when the parent renders (use when children also depend on parent locals).

### `Show` — conditional without re-rendering the parent
```tsx
<Show if={state$.visible} else={() => <Empty />} wrap={AnimatePresence}>
  {() => <Modal />}
</Show>
```
Props: `if` (observable/selector), `ifReady` (skips empty `{}`/`[]`), `else`, `wrap`, `children` (element or
function of the value).

### `Switch` — pick one branch by value
```tsx
<Switch value={state$.index}>
  {{ 0: () => <Tab1 />, 1: () => <Tab2 />, default: () => <Err /> }}
</Switch>
```

### `For` — optimized list rendering
Extracts each row into its own tracking context so the parent doesn't re-render. The row component receives an
`item$` observable. See `performance.md` for the `optimized` prop and array `id` requirements.
```tsx
function Row({ item$ }) { return <Text>{useValue(item$.text)}</Text> }

<For each={state$.todos} item={Row} />
// or render-prop form:
<For each={state$.todos}>{item$ => <Text>{item$.text.get()}</Text>}</For>
```
Props: `each` (array/object/Map observable), `item` (row component), `itemProps`, `sortValues`, `children`.

## Reactive components & two-way binding

Reactive versions of platform elements take `$`-prefixed props that accept a selector, and can two-way bind
inputs to an observable so the observable always mirrors the input. The reactive props are extracted into a tiny
wrapper that re-renders alone, leaving the parent untouched.

### React Native
```tsx
import { $View, $Text, $TextInput } from '@legendapp/state/react-native'

<$TextInput $value={state$.name} />                                   // two-way bind
<$View $style={() => ({ backgroundColor: state$.age.get() > 5 ? '#22c55e' : '#ef4444' })} />
<$Text>{() => (state$.age.get() > 5 ? 'child' : 'baby')}</$Text>      // reactive children
```

### Web
```tsx
import { $React } from '@legendapp/state/react-web'

<$React.input $value={state$.name} $className={() => !state$.name.get() && 'border-red-500'} />
<$React.div $style={() => ({ color: state$.age.get() > 5 ? 'green' : 'red' })} />
```

### Make your own reactive components
- `reactive(Component)` — wrap any component to add `$`-prefixed reactive props (great for animating
  `framer-motion` without re-rendering: `const $MotionDiv = reactive(motion.div)`).
- `reactiveObserver(Component)` — `reactive` + `observer` in one.
- `reactiveComponents(namespace)` — wrap a whole namespace (e.g. all of `motion`).

## Misc hooks

`useMount` / `useUnmount` / `useEffectOnce` (dev-safe single run), `useIsMounted` (observable bool),
`usePauseProvider` (Context whose `paused$` halts all observable-driven rendering underneath — handy for
hidden/inactive screens in RN). Web-only: `useHover`, `useMeasure`. `createObservableHook` adapts an existing
`useState`/`useReducer` hook to return an observable.

## Optional: Babel plugin

`@legendapp/state/babel` lets you pass JSX children directly to `Computed`/`Memo`/`Show` instead of wrapping in a
function. Everything works without it; it's purely ergonomic.
```js
// babel.config.js
module.exports = { plugins: ['@legendapp/state/babel'] }
```
Add `/// <reference types="@legendapp/state/types/babel" />` for the expanded JSX types.

## React tracing (debugging extra renders)

Call inside a component to diagnose why it renders. From `@legendapp/state/trace`:
`useTraceListeners()`, `useTraceUpdates()`, `useVerifyNotTracking()`, `useVerifyOneRender()`. Details and
strategy in `performance.md`.
