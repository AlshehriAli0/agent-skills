# Recipes

Compact versions of the common patterns from the docs' examples gallery. They all assume the fine-grained style
(parent renders once; leaves update themselves). Web examples use `$React.*`; swap for `$View`/`$TextInput` on RN.

## Persisted global state

```tsx
import { observable } from '@legendapp/state'
import { syncObservable } from '@legendapp/state/sync'
import { ObservablePersistLocalStorage } from '@legendapp/state/persist-plugins/local-storage'
import { $React } from '@legendapp/state/react-web'

const state$ = observable({
  settings: { showSidebar: false, theme: 'light' as 'light' | 'dark' },
  user: { profile: { name: '' } },
})
syncObservable(state$, { persist: { name: 'app', plugin: ObservablePersistLocalStorage } })

function App() {
  return (
    <>
      <$React.input $value={state$.user.profile.name} />
      <button onClick={state$.settings.showSidebar.toggle}>Toggle</button>
    </>
  )
}
```

## Auto-saving form bound to the server (TanStack Query bridge)

Two-way bind inputs directly to a synced-query observable; edits debounce-save through the mutation. No fetch or
submit code in the component.

```tsx
import { useObservableSyncedQuery } from '@legendapp/state/sync-plugins/tanstack-react-query'
import { useQueryClient } from '@tanstack/react-query'
import { $React } from '@legendapp/state/react-web'

function Form() {
  const queryClient = useQueryClient()
  const data$ = useObservableSyncedQuery({
    queryClient,
    query: { queryKey: ['user'], queryFn: () => fetch('/api/user/1').then(r => r.json()) },
    mutation: { mutationFn: (next) => fetch('/api/user/1', { method: 'POST', body: JSON.stringify(next) }) },
  })
  return (
    <>
      <$React.input $value={data$.first_name} />
      <$React.input $value={data$.email} />
    </>
  )
}
```

## Form validation with `useObserve`

`useObserve` reacts to field changes and updates error observables; errors render via `Memo` so the form itself
doesn't re-render.

```tsx
import { useObservable, useObserve, Memo, Show } from '@legendapp/state/react'
import { $React } from '@legendapp/state/react-web'

function SignupForm() {
  const username$ = useObservable('')
  const usernameError$ = useObservable('')
  const didSave$ = useObservable(false)

  useObserve(() => {
    if (didSave$.get()) {
      usernameError$.set(username$.get().length < 3 ? 'Username must be > 3 characters' : '')
    }
  })

  const onSave = () => {
    didSave$.set(true) // triggers the useObserve above
    if (!usernameError$.get()) {/* submit */}
  }

  return (
    <>
      <$React.input $value={username$} />
      <Memo>{usernameError$}</Memo>
      <button onClick={onSave}>Save</button>
    </>
  )
}
```

## List with `For` + local add

```tsx
import { useObservable, For, useValue } from '@legendapp/state/react'
import { $React } from '@legendapp/state/react-web'

let nextId = 0
function Chat() {
  const state$ = useObservable({ messages: [] as { id: number; text: string }[], draft: '' })
  const add = () => {
    state$.messages.push({ id: nextId++, text: state$.draft.peek() })
    state$.draft.set('')
  }
  return (
    <>
      <For each={state$.messages}>{(m$) => <div>{useValue(m$.text)}</div>}</For>
      <$React.input $value={state$.draft} onKeyDown={(e) => e.key === 'Enter' && add()} />
      <button onClick={add}>Send</button>
    </>
  )
}
```

## Animations with reactive props (framer-motion)

Wrap a component with `reactive` to animate from observable values without re-rendering the parent or children.

```tsx
import { reactive } from '@legendapp/state/react'
import { motion } from 'framer-motion'

const MotionDiv = reactive(motion.div)

function Toggle({ value$ }) {
  return (
    <MotionDiv
      $animate={() => ({ backgroundColor: value$.get() ? '#6ACB6C' : '#515153' })}
      onClick={value$.toggle}
    />
  )
}
```

## Tiny hash router (`Switch` + `pageHashParams`)

```tsx
import { Switch } from '@legendapp/state/react'
import { pageHashParams } from '@legendapp/state/helpers/pageHashParams'

function Router() {
  return (
    <Switch value={pageHashParams.page}>
      {{
        undefined: () => <Root />,
        '': () => <Page />,
        Home: () => <Home />,
        default: () => <NotFound />,
      }}
    </Switch>
  )
}
// navigate: pageHashParams.page.set('Home') / .delete()
```
