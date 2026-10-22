import { ID, object, assertJsonValue } from '../../contracts/common'
import {
  IPC,
  IPC_RESPONSE_BYTES,
  PUSH,
  failure,
  type Method,
  type NextCode,
  type PushKind
} from '../../contracts/ipc'
import { ipcResult } from '../../contracts/ipc-dtos'

export interface PreloadTransport {
  invoke(channel: string, input: unknown): Promise<unknown>
  send(channel: string, input: unknown): void
  on(channel: string, listener: (_event: unknown, data: unknown) => void): void
  removeListener(channel: string, listener: (_event: unknown, data: unknown) => void): void
}
export function createFacade(transport: PreloadTransport) {
  const live = new Set<() => void>()
  let counter = 0
  const call =
    (method: Method, min: number, max: number, build: (args: unknown[]) => unknown) =>
    async (...args: unknown[]) => {
      try {
        if (args.length < min || args.length > max) return failure('BAD_INPUT')
        const input = build(args)
        assertJsonValue(input)
        if (!IPC[method].input.safeParse(input).success) return failure('BAD_INPUT')
        let result: unknown
        try {
          result = await transport.invoke(IPC[method].channel, input)
        } catch {
          return failure('INTERNAL_ERROR')
        }
        assertJsonValue(result, IPC_RESPONSE_BYTES)
        return ipcResult(IPC[method].output).safeParse(result).success
          ? result
          : failure('INTERNAL_ERROR')
      } catch (error) {
        return failure(
          error instanceof Error && error.message === 'RESOURCE_LIMIT'
            ? 'RESOURCE_LIMIT'
            : 'BAD_INPUT'
        )
      }
    }
  const optional = (value: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined))
  const subscribe = (kind: PushKind, scopeId: unknown, callback: unknown) => {
    if (
      (kind !== 'runtime' && !ID.safeParse(scopeId).success) ||
      (kind === 'runtime' && scopeId !== null) ||
      typeof callback !== 'function' ||
      live.size >= 64
    )
      throw new TypeError('Invalid subscription')
    // Unique only within this renderer lifetime; not a capability or durable ID.
    const subscriptionId = `sub_${++counter}`
    let active = true
    const schema = object({ subscriptionId: ID, update: PUSH[kind].update })
    const listener = (_event: unknown, data: unknown) => {
      try {
        if (!active) return
        assertJsonValue(data)
        const result = schema.safeParse(data)
        if (!result.success || result.data.subscriptionId !== subscriptionId) return
        const update = result.data.update
        const actualScope =
          'conversationId' in update
            ? update.conversationId
            : 'taskId' in update
              ? update.taskId
              : 'task' in update
                ? update.task.taskId
                : null
        if (actualScope !== scopeId) return
        callback(update)
      } catch {
        /* One listener cannot leak raw events or break other listeners. */
      }
    }
    const cleanup = () => {
      if (!active) return
      active = false
      transport.removeListener(PUSH[kind].channel, listener)
      live.delete(cleanup)
      try {
        transport.send(PUSH[kind].channel, { operation: 'unsubscribe', subscriptionId, scopeId })
      } catch {
        /* Teardown is idempotent. */
      }
    }
    transport.on(PUSH[kind].channel, listener)
    live.add(cleanup)
    try {
      transport.send(PUSH[kind].channel, { operation: 'subscribe', subscriptionId, scopeId })
    } catch {
      cleanup()
    }
    return cleanup
  }
  const api = {
    app: { bootstrap: call('app.bootstrap', 0, 0, () => null) },
    projects: {
      listRecent: call('projects.listRecent', 0, 0, () => null),
      choose: call('projects.choose', 0, 0, () => null),
      select: call('projects.select', 1, 1, ([projectId]) => ({ projectId })),
      listFiles: call('projects.listFiles', 2, 4, ([projectId, relativeDir, cursor, limit]) =>
        optional({ projectId, relativeDir, cursor, limit })
      ),
      previewFile: call('projects.previewFile', 3, 3, ([projectId, relativePath, range]) => ({
        projectId,
        relativePath,
        range
      }))
    },
    conversations: {
      list: call('conversations.list', 0, 3, ([projectId, cursor, limit]) =>
        optional({ projectId, cursor, limit })
      ),
      read: call('conversations.read', 1, 3, ([conversationId, cursor, limit]) =>
        optional({ conversationId, cursor, limit })
      ),
      saveDockState: call('conversations.saveDockState', 1, 1, ([input]) => input),
      sendMessage: call('conversations.sendMessage', 1, 1, ([input]) => input),
      subscribeConversation: (id: unknown, callback: unknown) =>
        subscribe('conversation', id, callback)
    },
    models: {
      list: call('models.list', 0, 0, () => null),
      setDiscussionPreference: call('models.setDiscussionPreference', 1, 1, ([modelId]) => ({
        modelId
      }))
    },
    disclosures: {
      list: call('disclosures.list', 1, 1, ([projectId]) => ({ projectId })),
      respond: call('disclosures.respond', 1, 1, ([input]) => input),
      revoke: call('disclosures.revoke', 1, 1, ([input]) => input)
    },
    proposals: { confirmRun: call('proposals.confirmRun', 1, 1, ([input]) => input) },
    tasks: {
      read: call('tasks.read', 1, 1, ([taskId]) => ({ taskId })),
      list: call('tasks.list', 0, 3, ([conversationId, cursor, limit]) =>
        optional({ conversationId, cursor, limit })
      ),
      cancel: call('tasks.cancel', 1, 1, ([taskId]) => ({ taskId })),
      readEvents: call('tasks.readEvents', 1, 1, ([input]) => input),
      readDiagnostics: call('tasks.readDiagnostics', 1, 1, ([input]) => input),
      subscribeTask: (id: unknown, callback: unknown) => subscribe('task', id, callback)
    },
    preferences: {
      get: call('preferences.get', 0, 0, () => null),
      update: call('preferences.update', 1, 1, ([input]) => input)
    },
    runtime: { subscribeStatus: (callback: unknown) => subscribe('runtime', null, callback) }
  } as unknown as NextCode
  for (const value of Object.values(api)) Object.freeze(value)
  return {
    api: Object.freeze(api),
    dispose: () => {
      for (const unsubscribe of [...live]) unsubscribe()
    }
  }
}
