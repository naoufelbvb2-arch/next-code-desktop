import { assertJsonValue } from '../../contracts/common'
import {
  IPC,
  IPC_RESPONSE_BYTES,
  PUSH,
  SubscriptionControl,
  failure,
  type Method,
  type PushKind
} from '../../contracts/ipc'
import { ipcResult, type IpcResult } from '../../contracts/ipc-dtos'

export interface Caller {
  sender: {
    id: number
    isDestroyed(): boolean
    getURL(): string
    mainFrame: unknown
    send(channel: string, data: unknown): void
  }
  senderFrame: unknown
}
export type TrustCheck = (event: Caller) => boolean
export type ScopeCheck = (event: Caller, kind: PushKind, scopeId: string | null) => boolean
export type Dispatch = (
  method: Method,
  input: unknown,
  event: Caller
) => Promise<IpcResult<unknown>> | IpcResult<unknown>
interface Subscription {
  event: Caller
  kind: PushKind
  scopeId: string | null
}
export class IpcBoundary {
  private readonly subscriptions = new Map<number, Map<string, Subscription>>()
  constructor(
    private readonly trusted: TrustCheck,
    private readonly authorizedScope: ScopeCheck = (_event, kind, scope) =>
      kind === 'runtime' && scope === null,
    private readonly dispatch?: Dispatch
  ) {}

  async invoke(channel: string, event: Caller, args: unknown[]): Promise<IpcResult<unknown>> {
    try {
      if (!this.trusted(event)) return failure('NOT_AUTHORIZED')
      const method = (Object.keys(IPC) as Method[]).find((key) => IPC[key].channel === channel)
      if (!method || args.length !== 1) return failure('BAD_INPUT')
      assertJsonValue(args[0])
      if (!IPC[method].input.safeParse(args[0]).success) return failure('BAD_INPUT')
      if (this.dispatch) {
        try {
          return validateResult(method, await this.dispatch(method, args[0], event))
        } catch {
          return failure('INTERNAL_ERROR')
        }
      }
      // No dependency is inferred from a declared method. Missing services stay
      // explicitly unavailable, including isolated P2 boundary fixtures.
      return failure('RUNTIME_NOT_READY')
    } catch (error) {
      return failure(
        error instanceof Error && error.message === 'RESOURCE_LIMIT'
          ? 'RESOURCE_LIMIT'
          : 'BAD_INPUT'
      )
    }
  }

  control(kind: PushKind, event: Caller, args: unknown[]): void {
    try {
      if (!this.trusted(event) || args.length !== 1) return
      assertJsonValue(args[0], 1024)
      const control = SubscriptionControl.parse(args[0])
      if ((kind === 'runtime') !== (control.scopeId === null)) return
      const existing = this.subscriptions.get(event.sender.id)
      if (control.operation === 'unsubscribe') {
        const old = existing?.get(control.subscriptionId)
        if (old?.kind === kind && old.scopeId === control.scopeId)
          existing?.delete(control.subscriptionId)
        if (existing?.size === 0) this.subscriptions.delete(event.sender.id)
        return
      }
      if (
        !this.authorizedScope(event, kind, control.scopeId) ||
        (existing?.size ?? 0) >= 64 ||
        existing?.has(control.subscriptionId)
      )
        return
      const records = existing ?? new Map<string, Subscription>()
      records.set(control.subscriptionId, { event, kind, scopeId: control.scopeId })
      this.subscriptions.set(event.sender.id, records)
    } catch {
      /* Invalid subscription controls have no effect. */
    }
  }

  publish(kind: PushKind, scopeId: string | null, update: unknown): number {
    try {
      assertJsonValue(update, 262144)
      const parsed = PUSH[kind].update.parse(update)
      let actualScope: string | null = null
      if ('taskId' in parsed) actualScope = parsed.taskId
      if ('task' in parsed) actualScope = parsed.task.taskId
      if ('conversationId' in parsed) actualScope = parsed.conversationId
      if (actualScope !== scopeId) return 0
      if ('inspectionStatus' in parsed && parsed.inspectionStatus.conversationId !== scopeId)
        return 0
      let sent = 0
      for (const records of this.subscriptions.values())
        for (const [id, sub] of records) {
          if (sub.kind !== kind || sub.scopeId !== scopeId) continue
          if (!this.trusted(sub.event) || !this.authorizedScope(sub.event, kind, scopeId)) {
            records.delete(id)
            continue
          }
          try {
            sub.event.sender.send(PUSH[kind].channel, { subscriptionId: id, update: parsed })
            sent++
          } catch {
            records.delete(id)
          }
        }
      return sent
    } catch {
      return 0
    }
  }
  removeSender(senderId: number): void {
    this.subscriptions.delete(senderId)
  }
  get subscriberCount(): number {
    return [...this.subscriptions.values()].reduce((n, records) => n + records.size, 0)
  }
}

// Validate future service outputs before exposing them. P2 never uses this
// helper to manufacture a success; fixture tests exercise the success schemas.
export function validateResult<M extends Method>(method: M, result: unknown): IpcResult<unknown> {
  try {
    assertJsonValue(result, IPC_RESPONSE_BYTES)
    return ipcResult(IPC[method].output).parse(result)
  } catch {
    return failure('INTERNAL_ERROR')
  }
}
