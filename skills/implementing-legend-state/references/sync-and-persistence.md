# Persistence & Sync

Legend-State's sync engine is built for local-first apps: changes apply optimistically to local state, persist
immediately, and retry remote saves until they land (even across app restarts). You set it up *on the observable*,
so UI code only ever `get()`/`set()` — there's no fetch/mutation code in components. This is what lets Legend-State
absorb most of what you'd otherwise use TanStack Query for.

Everything is built on `synced`. The plugins (`syncedCrud`, `syncedSupabase`, `syncedQuery`, `syncedFetch`,
`syncedKeel`) are configured `synced`s for specific backends.

## `synced` vs `syncObservable`

- **`synced(...)`** inside `observable(...)`: lazy. Sets up get/set/persist; activates on first `get()`.
- **`syncObservable(state$, ...)`**: eager. Attaches the same options to an existing observable and starts now.

```ts
import { observable } from '@legendapp/state'
import { synced } from '@legendapp/state/sync'

// lazy
const store$ = observable(synced({ initial: [], persist: { name: 'todos' } }))

// eager, equivalent for an existing value
const store2$ = observable({ todos: [] })
syncObservable(store2$, { persist: { name: 'todos' } })
```

## Local persistence

Pick a plugin per platform and either pass it per-observable or set it once with `configureSynced`.

| Platform | Plugin | Import |
| --- | --- | --- |
| React Native (recommended) | `ObservablePersistMMKV` | `@legendapp/state/persist-plugins/mmkv` (needs `react-native-mmkv`) |
| React Native | `observablePersistAsyncStorage({ AsyncStorage })` | `@legendapp/state/persist-plugins/async-storage` |
| Expo | `observablePersistSqlite(Storage)` | `@legendapp/state/persist-plugins/expo-sqlite` (`expo-sqlite/kv-store`) |
| Web | `ObservablePersistLocalStorage` | `@legendapp/state/persist-plugins/local-storage` |
| Web (large data) | `observablePersistIndexedDB({...})` | `@legendapp/state/persist-plugins/indexeddb` |

```ts
import { syncObservable } from '@legendapp/state/sync'
import { ObservablePersistMMKV } from '@legendapp/state/persist-plugins/mmkv'

syncObservable(store$, { persist: { name: 'todos', plugin: ObservablePersistMMKV } })
```

Set a global default once so each store only needs a `name` (see `assets/persist.native.template.ts` /
`assets/persist.web.template.ts`):
```ts
import { configureSynced } from '@legendapp/state/sync'
const persisted = configureSynced({ persist: { plugin: ObservablePersistMMKV } })
syncObservable(store$, persisted({ persist: { name: 'todos' } }))
```

### Async persistence loads after a tick
MMKV and localStorage are synchronous; AsyncStorage, IndexedDB, and expo-sqlite are async, so data isn't there on
the first render. Wait for it when needed:
```ts
import { syncState, when } from '@legendapp/state'
await when(syncState(store$).isPersistLoaded)
```

## Remote sync with `synced`

```ts
const state$ = observable(synced({
  get: () => fetch(`https://api/items?page=${page$.get()}`).then(r => r.json()), // observing: re-runs on page change
  set: ({ value }) => fetch('https://api/items', { method: 'POST', body: JSON.stringify(value) }),
  initial: [],
  mode: 'set',                 // set | assign | merge | append | prepend (how incoming data merges)
  debounceSet: 500,            // batch keystrokes before saving
  retry: { infinite: true, backoff: 'exponential', maxDelay: 30 },
  persist: { name: 'items', retrySync: true },  // retrySync persists pending changes across restarts
  subscribe: ({ refresh, update }) => {          // realtime / polling hook, runs once after first get
    const off = socket.on('change', d => update(d))  // or call refresh()
    return off
  },
  waitFor: isAuthed$,          // don't get() until this is truthy
  transform: { load: v => decrypt(v), save: v => encrypt(v) },  // see Transforms below
}))
```

`get()` is an observing context, which makes paging trivial: read a page observable inside `get`, then bump it
and use `mode: 'append'`.

## `syncState` — status & control

Every synced/async observable has a `syncState` companion observable.
```ts
import { syncState } from '@legendapp/state'
const s$ = syncState(store$)
const { isLoaded, error, isPersistLoaded } = s$.get()
s$.sync()            // re-run get
s$.clearPersist()    // wipe local
s$.getPendingChanges()
```
Fields: `isPersistLoaded`, `isPersistEnabled`, `isLoaded`, `isSyncEnabled`, `lastSync`, `syncCount`,
`clearPersist()`, `sync()`, `getPendingChanges()`, `error`.

## CRUD plugin (`syncedCrud`)

Most backend plugins build on this. Provide `get` or `list` plus `create`/`update`/`delete`.

- **`get`**: observable value is the returned object. Setting fields creates (if it was null) or updates;
  `delete()`/null deletes.
- **`list`**: observable is keyed by `id`. Adding a key creates; changing a child updates; deleting a child deletes.

```ts
import { syncedCrud } from '@legendapp/state/sync-plugins/crud'

const profiles$ = observable(syncedCrud({
  list: listProfiles,
  create: createProfile,
  update: updateProfile,
  delete: deleteProfile,
  as: 'object',            // object (default) | array | Map | value
  updatePartial: true,     // send only changed fields + id
  fieldCreatedAt: 'created_at',
  fieldUpdatedAt: 'updated_at',
  fieldDeleted: 'deleted', // soft delete via update instead of delete
  changesSince: 'last-sync', // sync only diffs (needs fieldUpdatedAt + soft/known deletes)
  onSavedUpdate: 'createdUpdatedAt', // merge server timestamps back in
  subscribe: ({ refresh, update }) => {/* realtime */},
}))
```
A new local row uses a locally generated `id` and gets server `createdAt`/`updatedAt` merged back after save (set
those to `undefined` on create). `changesSince: 'last-sync'` greatly reduces bandwidth by listing only rows changed
since the last sync — it requires a server-managed `updatedAt` and that deletes are discoverable (soft deletes or a
list that includes deleted rows). See `assets/synced-crud.template.ts`.

## Backend plugins (built on CRUD)

### Supabase — `syncedSupabase`
```ts
import { configureSyncedSupabase, syncedSupabase } from '@legendapp/state/sync-plugins/supabase'
configureSyncedSupabase({ generateId: () => crypto.randomUUID() })

const messages$ = observable(syncedSupabase({
  supabase,
  collection: 'messages',
  select: from => from.select('id,text'),
  filter: select => select.eq('user_id', uid),
  actions: ['read', 'create', 'update'],
  realtime: { filter: `user_id=eq.${uid}` },
  persist: { name: 'messages', retrySync: true },
  changesSince: 'last-sync', fieldCreatedAt: 'created_at', fieldUpdatedAt: 'updated_at', fieldDeleted: 'deleted',
}))
```
`as`: `object` | `Map` | `value` (no `array`). Diff-sync needs the `created_at`/`updated_at` columns + trigger and
soft deletes (SQL snippet is in the Supabase docs).

### TanStack Query — `syncedQuery` / `useObservableSyncedQuery`
Use when integrating with or migrating off an existing Query setup. Same query/mutation params as React Query, but
it updates an observable instead of re-rendering, and the `queryKey` can be a function of observables (auto-refetch
on change → easy paging).
```tsx
const state$ = useObservableSyncedQuery({
  query: { queryKey: ['user'], queryFn: () => fetch('/api/user/1').then(r => r.json()) },
  mutation: { mutationFn: v => fetch('/api/user/1', { method: 'POST', body: JSON.stringify(v) }) },
})
// outside React: syncedQuery({ queryClient, query, mutation })
```

### fetch — `syncedFetch`
Thin wrapper to cut boilerplate: `get`/`set` URLs (URL can be a selector → refetch on change), `getInit`/`setInit`,
`valueType`, `onSaved`.

### Keel — `syncedKeel`
Pass the generated `queries`/`mutations`; fully typed. Needs `id` in create actions and all-optional changeable
fields in update actions; `ksuid` for local ids. See the Keel docs for model requirements and audit-log deletes.

## Transforms

Transform data between observable and persistence/remote: `transform.load` / `transform.save` on `synced`, and a
separate `persist.transform` for local. Helpers: `transformStringifyDates()`, `transformStringifyKeys(...keys)`,
`combineTransforms(...)`. Common uses: version migration on load, backend-shape conversion, end-to-end encryption.

## Writing your own plugin

A plugin is just a function returning `synced(...)` (or build on `syncedCrud` if your backend is CRUD-shaped).
Wrap shared options (auth `waitFor`, persist plugin, retry) so each call only passes what's specific. Reference
implementations: the built-in plugins' source on GitHub.
