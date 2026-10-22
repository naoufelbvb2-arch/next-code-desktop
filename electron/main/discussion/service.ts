import { createHash, randomBytes } from 'node:crypto'
import { realpathSync, statSync } from 'node:fs'
import { basename } from 'node:path'
import { DurableStore } from '../storage/store'
import { StoreError } from '../storage/database'
import type { Scope, StoreOptions } from '../storage/store'
import type { Input, Method } from '../../../contracts/ipc'
import { failure } from '../../../contracts/ipc'
import type { IpcResult } from '../../../contracts/ipc-dtos'
import { responseResults } from '../../../contracts/wire-schema'
import type { SupervisedChild } from '../supervisor/child'

export const DISCUSSION_MODEL = 'deepseek-flash'
export const DISCUSSION_PROVIDER = 'deepseek_official_v1'
export function rootIdentity(path: string) {
  const root = realpathSync.native(path),
    stat = statSync(root, { bigint: true })
  if (!stat.isDirectory() || !/^[A-Za-z]:[\\/]/.test(root))
    throw new StoreError('WORKSPACE_UNAVAILABLE')
  return {
    root,
    key: createHash('sha256').update(`${root.toLowerCase()}|${stat.dev}|${stat.ino}`).digest('hex')
  }
}
interface Options {
  path: string
  enabled: boolean
  ensure: () => Promise<SupervisedChild>
  available: () => boolean
  choose: () => Promise<string | null>
  notify?: (kind: 'task' | 'conversation', scopeId: string, update: unknown) => void
  database?: Omit<StoreOptions, 'policy' | 'notify'>
}
export class DiscussionService {
  readonly store: DurableStore
  private readonly proof = Object.freeze({ ref: randomBytes(24).toString('hex') })
  private selectedProjectId: string | null = null
  private readonly queued = new Set<string>()
  private readonly lanes = new Map<string, Promise<void>>()
  private queuedBytes = 0
  private closing = false
  constructor(private readonly options: Options) {
    const allowed = new Set([
      'project',
      'model_preference',
      'attempt',
      'discussion_result',
      'context_budget_summary',
      'decision'
    ])
    this.store = new DurableStore(options.path, {
      ...options.database,
      notify: options.notify,
      policy: {
        workspace: (p) => {
          try {
            const actual = rootIdentity(p.canonicalRoot)
            return actual.key === p.workspaceKey
          } catch {
            return false
          }
        },
        model: (id) =>
          id === DISCUSSION_MODEL && options.available()
            ? { modelId: id, providerKey: DISCUSSION_PROVIDER }
            : null,
        providerLabel: (key) => (key === DISCUSSION_PROVIDER ? 'DeepSeek' : null),
        evidence: (kind, p) => allowed.has(kind) && (p as { ref?: string })?.ref === this.proof.ref
      }
    })
    this.store.recoverAfterRestart()
    this.store.abandonPendingDiscussion(this.proof)
    // Restore only an actually registered root, never invent a synthetic project.
    for (const project of this.store.projects()) {
      try {
        this.select(project.projectId)
        break
      } catch {}
    }
  }
  private select(projectId: string) {
    const binding = this.store.projectBinding(projectId),
      actual = rootIdentity(binding.root)
    if (actual.key !== binding.scope.workspaceKey) throw new StoreError('WORKSPACE_UNAVAILABLE')
    this.selectedProjectId = projectId
    return this.store.projects().find((p) => p.projectId === projectId)!
  }
  private scope(projectId = this.selectedProjectId): Scope {
    if (!projectId || projectId !== this.selectedProjectId) throw new StoreError('NOT_AUTHORIZED')
    const binding = this.store.projectBinding(projectId)
    if (rootIdentity(binding.root).key !== binding.scope.workspaceKey)
      throw new StoreError('WORKSPACE_UNAVAILABLE')
    return binding.scope
  }
  authorizedConversation(id: string) {
    try {
      return this.store.conversationBinding(id).scope.projectId === this.scope().projectId
    } catch {
      return false
    }
  }
  private conversationScope(id: string) {
    const binding = this.store.conversationBinding(id)
    if (binding.scope.projectId !== this.scope().projectId) throw new StoreError('NOT_AUTHORIZED')
    return binding.scope
  }
  async dispatch(method: Method, input: unknown): Promise<IpcResult<unknown>> {
    try {
      const data = await this.operation(method, input)
      return { ok: true, data }
    } catch (error) {
      return failure(error instanceof StoreError ? error.code : 'INTERNAL_ERROR')
    }
  }
  private async operation(method: Method, input: unknown): Promise<unknown> {
    if (method === 'app.bootstrap')
      return {
        ...this.store.bootstrap(),
        selectedProject: this.selectedProjectId
          ? (this.store.projects().find((p) => p.projectId === this.selectedProjectId) ?? null)
          : null,
        runtimeStatus: this.options.available() ? 'ready' : 'not_ready'
      }
    if (method === 'projects.listRecent') return this.store.projects()
    if (method === 'preferences.get') return this.store.preferences()
    if (method === 'preferences.update')
      return this.store.updatePreferences(input as Input<'preferences.update'>)
    if (!this.options.enabled) throw new StoreError('RUNTIME_NOT_READY')
    switch (method) {
      case 'projects.choose': {
        const chosen = await this.options.choose()
        if (!chosen) return null
        const identity = rootIdentity(chosen),
          projectId = this.store.registerProject(
            {
              workspaceKey: identity.key,
              canonicalRoot: identity.root,
              displayName: basename(identity.root) || 'Project'
            },
            this.proof
          )
        return this.select(projectId)
      }
      case 'projects.select':
        return this.select((input as Input<'projects.select'>).projectId)
      case 'models.list':
        return [
          {
            modelId: DISCUSSION_MODEL,
            providerLabel: 'DeepSeek',
            displayName: 'DeepSeek Flash',
            capabilities: ['discussion'],
            availability: this.options.available() ? 'available' : 'unavailable'
          }
        ]
      case 'models.setDiscussionPreference':
        return this.store.setDiscussionPreference(
          (input as Input<'models.setDiscussionPreference'>).modelId,
          this.proof
        )
      case 'conversations.list': {
        const value = input as Input<'conversations.list'>
        return this.store.listConversations(
          this.scope(value.projectId ?? this.selectedProjectId),
          value.cursor,
          value.limit
        )
      }
      case 'conversations.read': {
        const value = input as Input<'conversations.read'>
        return this.store.readConversation(
          this.conversationScope(value.conversationId),
          value.conversationId,
          value.cursor,
          value.limit
        )
      }
      case 'conversations.saveDockState': {
        const value = input as Input<'conversations.saveDockState'>
        return this.store.saveDock(this.conversationScope(value.conversationId), value)
      }
      case 'conversations.sendMessage': {
        const value = input as Input<'conversations.sendMessage'>,
          scope = value.conversationId ? this.conversationScope(value.conversationId) : this.scope()
        const result = this.store.sendMessage(scope, value)
        const turn = this.store.discussionTurn(scope, result.messageId)
        if (turn.status === 'pending' && !this.queued.has(result.messageId))
          this.enqueue(scope, turn)
        return result
      }
      default:
        throw new StoreError('RUNTIME_NOT_READY')
    }
  }
  private enqueue(scope: Scope, turn: ReturnType<DurableStore['discussionTurn']>) {
    const bytes = Buffer.byteLength(turn.text)
    if (this.closing || this.queued.size >= 256 || this.queuedBytes + bytes > 8388608) {
      this.store.failPendingDiscussion(scope, turn.messageId, 'RESOURCE_LIMIT', this.proof)
      return
    }
    this.queued.add(turn.messageId)
    this.queuedBytes += bytes
    const prior = this.lanes.get(turn.conversationId) ?? Promise.resolve()
    const work = prior
      .catch(() => {})
      .then(() => this.deliver(scope, turn))
      .finally(() => {
        this.queued.delete(turn.messageId)
        this.queuedBytes -= bytes
        if (this.lanes.get(turn.conversationId) === work) this.lanes.delete(turn.conversationId)
      })
    this.lanes.set(turn.conversationId, work)
    void work.catch(() => {})
  }
  private async deliver(scope: Scope, turn: ReturnType<DurableStore['discussionTurn']>) {
    let attempt: string | undefined, session: string | undefined
    try {
      if (this.closing) throw new StoreError('RUNTIME_NOT_READY')
      const child = await this.options.ensure()
      session = child.sessionId
      const context = this.store.context(scope, turn.conversationId, turn.messageId)
      // Conservative UTF-8 byte estimate of tokens. Preserve current input and
      // governing prompt/output margin; prune whole optional entries only.
      const limit = 24000 - Buffer.byteLength(turn.text) - 4096 - 256
      while (Buffer.byteLength(JSON.stringify(context)) > Math.max(0, limit)) {
        if (context.recent_messages.length) context.recent_messages.shift()
        else if (context.summaries.length) context.summaries.pop()
        else if (context.decisions.length) context.decisions.pop()
        else throw new StoreError('RESOURCE_LIMIT')
      }
      attempt = this.store.issueAttempt(
        scope,
        turn.messageId,
        { providerKey: DISCUSSION_PROVIDER, processSessionRef: session, retryOf: null },
        this.proof
      )
      let issued: string | undefined
      const frame = await child.request(
        'discussion.send',
        {
          conversation_id: turn.conversationId,
          user_message_id: turn.messageId,
          text: turn.text,
          model_id: turn.modelId,
          context_snapshot: context,
          project_ref: scope.projectId
        },
        (id) => {
          issued = id
        }
      )
      if (child.sessionId !== session || frame.correlation_id !== issued)
        throw new StoreError('PROVIDER_FAILED')
      if (frame.type !== 'response' || frame.payload.status !== 'completed') {
        this.store.finishAttempt(
          scope,
          attempt,
          session,
          { ok: false, code: 'PROVIDER_FAILED', ambiguous: true },
          this.proof
        )
        return
      }
      const result = responseResults['discussion.send'].parse(frame.payload.result)
      const visible = new Set([
        ...context.recent_messages.map((item) => item.message_id),
        turn.messageId
      ])
      result.summary_candidates = result.summary_candidates.filter(
        (item) =>
          item.source_message_ids.length > 0 &&
          new Set(item.source_message_ids).size === item.source_message_ids.length &&
          item.source_message_ids.every((id) => visible.has(id))
      )
      this.store.finishAttempt(scope, attempt, session, { ok: true, result }, this.proof)
    } catch (error) {
      try {
        if (attempt && session)
          this.store.finishAttempt(
            scope,
            attempt,
            session,
            { ok: false, code: 'PROVIDER_FAILED', ambiguous: true },
            this.proof
          )
        else
          this.store.failPendingDiscussion(
            scope,
            turn.messageId,
            error instanceof StoreError ? error.code : 'RUNTIME_NOT_READY',
            this.proof
          )
      } catch {
        /* A failed DB commit is not replaced with an optimistic answer. */
      }
    }
  }
  async idle() {
    await Promise.allSettled([...this.lanes.values()])
  }
  close() {
    this.closing = true
    this.store.close()
  }
}
