import { DurableStore } from './store'
import { StoreError } from './database'
import { failure, type Method, type Input } from '../../../contracts/ipc'
import type { IpcResult } from '../../../contracts/ipc-dtos'
import { DiscussionService } from '../discussion/service'
import type { SupervisedChild } from '../supervisor/child'

let store: DurableStore | undefined
let discussion: DiscussionService | undefined
const backed = new Set<Method>([
  'app.bootstrap',
  'projects.listRecent',
  'preferences.get',
  'preferences.update'
])
export function openStorage(
  path: string,
  integration?: {
    enabled: boolean
    ensure: () => Promise<SupervisedChild>
    available: () => boolean
    choose: () => Promise<string | null>
    notify: (kind: 'task' | 'conversation', id: string, update: unknown) => void
  }
) {
  try {
    if (integration?.enabled) {
      discussion = new DiscussionService({ path, ...integration })
      store = discussion.store
    } else {
      store = new DurableStore(path)
      store.recoverAfterRestart()
    }
  } catch {
    try {
      store?.close()
    } catch {}
    store = undefined
  }
}
export function closeStorage() {
  try {
    if (discussion) discussion.close()
    else store?.close()
  } catch {}
  store = undefined
  discussion = undefined
}
export function authorizedConversation(id: string): boolean {
  return discussion?.authorizedConversation(id) ?? false
}
export function dispatchStorage(
  method: Method,
  input: unknown
): IpcResult<unknown> | Promise<IpcResult<unknown>> {
  if (discussion) return discussion.dispatch(method, input)
  if (!backed.has(method)) return failure('RUNTIME_NOT_READY')
  if (!store) return failure('DATABASE_UNAVAILABLE')
  try {
    switch (method) {
      case 'app.bootstrap':
        return { ok: true, data: store.bootstrap() }
      case 'projects.listRecent':
        return { ok: true, data: store.projects() }
      case 'preferences.get':
        return { ok: true, data: store.preferences() }
      case 'preferences.update':
        return { ok: true, data: store.updatePreferences(input as Input<'preferences.update'>) }
      default:
        return failure('RUNTIME_NOT_READY')
    }
  } catch (error) {
    return failure(error instanceof StoreError ? error.code : 'DATABASE_UNAVAILABLE')
  }
}
