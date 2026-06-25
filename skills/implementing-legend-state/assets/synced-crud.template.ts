/**
 * Local-first CRUD-synced collection (Legend-State v3).
 *
 * A factory that wires a backend's list/create/update/delete into an observable keyed by id.
 * Components never fetch or mutate over the network — they just get()/set() the observable.
 *
 * Replace the `api` calls with your backend. This pattern is what replaces most manual TanStack Query usage
 * when Legend-State is the primary state driver.
 */
import { observable, type Observable } from '@legendapp/state'
import { syncedCrud } from '@legendapp/state/sync-plugins/crud'
import { persisted } from './persist.native.template' // or persist.web.template

export interface Row {
  id: string
  // ...your fields
  text: string
  // server-managed timestamps; set to undefined when creating locally
  created_at?: string
  updated_at?: string
  deleted?: boolean
}

interface CrudApi {
  list: () => Promise<Row[]>
  create: (value: Row) => Promise<Row | undefined>
  update: (value: Partial<Row> & { id: string }) => Promise<Row | undefined>
  delete: (value: { id: string }) => Promise<unknown>
  subscribe?: (cb: () => void) => () => void // optional realtime
}

export function createCollection(name: string, api: CrudApi): Observable<Record<string, Row>> {
  return observable(
    syncedCrud(
      persisted({
        list: api.list,
        create: api.create,
        update: api.update,
        delete: api.delete,

        as: 'object', // observable is Record<id, Row>
        updatePartial: true, // send only changed fields + id
        fieldCreatedAt: 'created_at',
        fieldUpdatedAt: 'updated_at',
        fieldDeleted: 'deleted', // soft delete
        changesSince: 'last-sync', // only fetch diffs (needs server updated_at + soft deletes)
        onSavedUpdate: 'createdUpdatedAt', // merge server timestamps back into local

        ...(api.subscribe
          ? { subscribe: ({ refresh }: { refresh: () => void }) => api.subscribe!(refresh) }
          : {}),

        retry: { infinite: true },
        persist: { name, retrySync: true },
      }),
    ),
  )
}

/* Usage:

const messages$ = createCollection('messages', messagesApi)

// read (activates sync on first get)
const all = messages$.get()                  // Record<id, Row>

// create: add a new keyed entry; timestamps undefined so the server fills them
function addMessage(text: string) {
  const id = globalThis.crypto.randomUUID()
  messages$[id].set({ id, text, created_at: undefined, updated_at: undefined })
}

// update: just set a field
messages$[id].text.set('edited')

// delete: delete the entry (soft delete via fieldDeleted)
messages$[id].delete()

// In React:
import { For, useValue } from '@legendapp/state/react'
function Row_({ item$ }) { return <Text>{useValue(item$.text)}</Text> }
function List() { return <For each={messages$} item={Row_} /> }
*/
