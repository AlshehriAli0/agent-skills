/**
 * React Native / Expo persistence setup (Legend-State v3).
 *
 * Configure a default persist plugin ONCE here, then every store only needs a `name`.
 * Import this file's `persisted` helper wherever you set up a store.
 *
 * MMKV (synchronous, fast) is recommended for RN. For async storages (AsyncStorage, expo-sqlite) see the
 * commented alternatives and remember to await `isPersistLoaded` before reading on startup.
 *
 *   npm install react-native-mmkv
 */
import { configureSynced } from '@legendapp/state/sync'
import { ObservablePersistMMKV } from '@legendapp/state/persist-plugins/mmkv'

// ---- MMKV (recommended, synchronous) ----
export const persisted = configureSynced({
  persist: {
    plugin: ObservablePersistMMKV,
    retrySync: true, // keep pending remote changes across restarts (for synced observables)
  },
})

/* ---- AsyncStorage alternative (asynchronous) ----
import { observablePersistAsyncStorage } from '@legendapp/state/persist-plugins/async-storage'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const persisted = configureSynced({
  persist: { plugin: observablePersistAsyncStorage({ AsyncStorage }) },
})
*/

/* ---- Expo SQLite alternative (asynchronous) ----
import { observablePersistSqlite } from '@legendapp/state/persist-plugins/expo-sqlite'
import Storage from 'expo-sqlite/kv-store'

export const persisted = configureSynced({
  persist: { plugin: observablePersistSqlite(Storage) },
})
*/

/* Usage:

import { observable } from '@legendapp/state'
import { syncObservable, synced } from '@legendapp/state/sync'
import { persisted } from './persist.native.template'

// eager
const store$ = observable({ ... })
syncObservable(store$, persisted({ persist: { name: 'app-store' } }))

// or lazy in the constructor
const store2$ = observable(synced(persisted({ initial: {}, persist: { name: 'other' } })))

// For ASYNC plugins, gate first read on load:
// import { syncState, when } from '@legendapp/state'
// await when(syncState(store$).isPersistLoaded)
*/
