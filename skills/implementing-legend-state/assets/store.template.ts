/**
 * Global store template (Legend-State v3).
 *
 * A single typed observable holding domain state, computed (derived) values, and action functions.
 * Computeds are just functions; actions mutate the observable directly. Read with `useValue` in React.
 *
 * Swap the persistence import for your platform (see persist.native.template.ts / persist.web.template.ts),
 * or delete the syncObservable call if you don't need persistence.
 */
import { observable } from '@legendapp/state'
import { syncObservable } from '@legendapp/state/sync'
import { ObservablePersistMMKV } from '@legendapp/state/persist-plugins/mmkv' // RN; use local-storage on web

export interface Todo {
  id: string
  text: string
  done?: boolean
}

interface AppStore {
  // --- raw state ---
  ui: {
    activeTab: 'home' | 'profile' | 'settings'
    theme: 'light' | 'dark'
  }
  todos: Todo[]

  // --- computed (derived) state: plain functions ---
  remaining: () => number
  isDark: () => boolean

  // --- actions ---
  addTodo: (text: string) => void
  toggleTodo: (id: string) => void
  clearDone: () => void
}

export const store$ = observable<AppStore>({
  ui: {
    activeTab: 'home',
    theme: 'light',
  },
  todos: [],

  remaining: () => store$.todos.get().filter((t) => !t.done).length,
  isDark: () => store$.ui.theme.get() === 'dark',

  addTodo: (text) => {
    store$.todos.push({ id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()), text })
  },
  toggleTodo: (id) => {
    const idx = store$.todos.get().findIndex((t) => t.id === id)
    if (idx >= 0) store$.todos[idx].done.set((d) => !d)
  },
  clearDone: () => {
    // Mutate directly; no cloning. Delete from the end so indices stay valid.
    const todos = store$.todos.peek()
    for (let i = todos.length - 1; i >= 0; i--) {
      if (todos[i].done) store$.todos[i].delete()
    }
  },
})

// Persist the whole store. Remove if not needed. `name` is the storage key.
syncObservable(store$, {
  persist: {
    name: 'app-store',
    plugin: ObservablePersistMMKV,
  },
})

/* Usage in a component:

import { useValue, For } from '@legendapp/state/react'

function Header() {
  const remaining = useValue(store$.remaining)
  return <Text>{remaining} left</Text>
}

function Row({ item$ }: { item$: typeof store$.todos[number] }) {
  const text = useValue(item$.text)
  const done = useValue(item$.done)
  return <Text onPress={() => item$.done.set(d => !d)}>{done ? '✓ ' : ''}{text}</Text>
}

function List() {
  return <For each={store$.todos} item={Row} />
}
*/
