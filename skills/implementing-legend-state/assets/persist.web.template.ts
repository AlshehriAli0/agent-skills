/**
 * Web persistence setup (Legend-State v3).
 *
 * Configure a default persist plugin ONCE, then every store only needs a `name`.
 * localStorage is synchronous and simplest. IndexedDB is for larger data and is asynchronous.
 */
import { configureSynced } from '@legendapp/state/sync'
import { ObservablePersistLocalStorage } from '@legendapp/state/persist-plugins/local-storage'

// ---- localStorage (synchronous, simplest) ----
export const persisted = configureSynced({
  persist: {
    plugin: ObservablePersistLocalStorage,
    retrySync: true,
  },
})

/* ---- IndexedDB alternative (asynchronous, for larger data) ----
import { observablePersistIndexedDB } from '@legendapp/state/persist-plugins/indexeddb'

export const persisted = configureSynced({
  persist: {
    plugin: observablePersistIndexedDB({
      databaseName: 'AppDB',
      version: 1,                       // bump whenever tableNames change
      tableNames: ['app-store', 'documents'],
    }),
  },
})
// IndexedDB is async — gate first read:
// import { syncState, when } from '@legendapp/state'
// await when(syncState(store$).isPersistLoaded)
*/

/* Usage:

import { observable } from '@legendapp/state'
import { syncObservable } from '@legendapp/state/sync'
import { persisted } from './persist.web.template'

const store$ = observable({ ... })
syncObservable(store$, persisted({ persist: { name: 'app-store' } }))
*/
