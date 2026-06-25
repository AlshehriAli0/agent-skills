# Helpers

Helper functions and ready-made observables. Each lives at its own import path so it only adds to your bundle if
used. (React-specific hooks like `useHover`/`useMeasure`/`useMount` are in `react.md`.)

## ObservableHint — performance hints

### `ObservableHint.opaque`
Marks an object as opaque so it's treated like a primitive — its inner properties are not made observable. Use for
DOM/React elements or large objects you don't want to track into.

```ts
import { observable, ObservableHint } from '@legendapp/state'
const state$ = observable({ text: 'hi', body: ObservableHint.opaque(document.body) })
```

### `ObservableHint.plain`
Marks an object as having no child functions or observables, so Legend-State skips recursing through it to set up
computeds/links. A pure performance optimization for big static objects.

```ts
const state$ = observable({ text: 'hi', child: ObservableHint.plain(bigStaticObject) })
```

## `mergeIntoObservable`

Deep-merges an object into an observable while keeping existing child observables/listeners intact and firing
listeners for what actually changed. (Use `assign()` for a shallow merge.)

```ts
import { mergeIntoObservable } from '@legendapp/state'
mergeIntoObservable(state$, { store: { text: 'hi', other: 'hi there' } })
```

## `trackHistory`

Creates an observable that records every change to a target, keyed by timestamp, storing the previous value at the
moment it changed.

```ts
import { trackHistory } from '@legendapp/state/helpers/trackHistory'
const history$ = trackHistory(state$)
// after state$.profile.name.set('Annyong'):
// { 1666593133018: { profile: { name: 'Hello' } } }   // the value before the change
```

## `undoRedo`

Like `trackHistory` but with undo/redo helpers and automatic tracking.

```ts
import { undoRedo } from '@legendapp/state/helpers/undoRedo'

const { undo, redo, getHistory } = undoRedo(state$.todos, { limit: 100 })
state$.todos.push('Pick up bread')
undo()  // back to previous todos
redo()  // forward again
```

## Helper observables

### `currentDay` / `currentTime`
Self-updating observables (day changes at midnight; time changes every minute). From `@legendapp/state/helpers/time`.

```ts
import { currentTime, currentDay } from '@legendapp/state/helpers/time'
observe(() => console.log(currentTime.get()))
```

### `pageHash` (web)
Two-way bound to `location.hash`. Configure how it writes with `configurePageHash({ setter: 'pushState' | 'replaceState' | 'location.hash' })`.

```ts
import { pageHash, configurePageHash } from '@legendapp/state/helpers/pageHash'
pageHash.set('value=test') // location.hash === '#value=test'
```

### `pageHashParams` (web)
Two-way bound to individual hash params — set/get/delete keys and it keeps `location.hash` in sync. Pairs well with
`Switch` for a tiny router (see `recipes.md`).

```ts
import { pageHashParams } from '@legendapp/state/helpers/pageHashParams'
pageHashParams.userid.set('newuser') // location.hash === '#userid=newuser'
```
