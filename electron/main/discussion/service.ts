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
import { FileBroker, SOURCE_DESTINATION } from '../broker/service'
import { BrokerError } from '../broker/policy'
import type { BrokerPool } from '../broker/pool'
import { CodingService } from '../coding/service'
import {
  CodingUnavailable,
  requireVerifiedCoding,
  type VerifiedCodingRuntime
} from '../coding/gate'
import type { PythonSupervisor } from '../supervisor/supervisor'
import type { LaunchSpec } from '../supervisor/windows-process'

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
  brokerDirectory?: string
  brokerPool?: BrokerPool
}
export class DiscussionService {
  readonly store: DurableStore
  readonly broker?: FileBroker
  readonly coding: CodingService
  private readonly nativeVerified = new Set<string>()
  private readonly proof = Object.freeze({ ref: randomBytes(24).toString('hex') })
  private readonly codingProof = Object.freeze({ ref: randomBytes(24).toString('hex') })
  private codingSupervisor?: PythonSupervisor
  private readonly finishing = new Set<string>()
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
      'decision',
      'run',
      'cancel',
      'supervise',
      'schedule',
      'disclosure',
      'consent_response',
      'consent_revoke',
      'inspection',
      'inspection_observation'
    ])
    this.store = new DurableStore(options.path, {
      ...options.database,
      notify: options.notify,
      policy: {
        workspace: (p) => {
          if (p.workspaceKey.startsWith('win32-v1_')) return this.nativeVerified.has(p.workspaceKey)
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
        evidence: (kind, p) => {
          const candidate = p as {
            ref?: string
            taskId: string
            workspaceKey: string
            processSessionRef?: string
          }
          if (allowed.has(kind) && candidate?.ref === this.proof.ref) return true
          if (candidate?.ref !== this.codingProof.ref || !this.codingSupervisor) return false
          if (kind === 'event')
            return this.codingSupervisor.ownsCodingSession(
              candidate.taskId,
              candidate.workspaceKey,
              candidate.processSessionRef
            )
          if (kind === 'cleanup')
            return (
              this.nativeVerified.has(candidate.workspaceKey) &&
              this.codingSupervisor.verifiedCodingCleanup(candidate.taskId, candidate.workspaceKey)
            )
          return false
        }
      }
    })
    this.store.recoverAfterRestart()
    this.store.abandonPendingDiscussion(this.proof)
    if (options.brokerDirectory)
      this.broker = new FileBroker({
        directory: options.brokerDirectory,
        store: this.store,
        proof: this.proof,
        pool: options.brokerPool,
        verified: (key, operation) => {
          this.nativeVerified.add(key)
          try {
            return operation()
          } finally {
            this.nativeVerified.delete(key)
          }
        }
      })
    this.coding = new CodingService({
      store: this.store,
      proof: this.proof,
      scope: () => this.scope(),
      verify: async (scope, operation) => {
        if (!this.broker || !scope.workspaceKey.startsWith('win32-v1_'))
          throw new StoreError('WORKSPACE_UNAVAILABLE')
        return this.broker.withRoot(scope, operation)
      }
    })
    // Restore only an actually registered root, never invent a synthetic project.
    for (const project of this.store.projects()) {
      try {
        this.select(project.projectId)
        break
      } catch {}
    }
  }
  // Main-only installation after exact runtime verification. A test-owned offline
  // launch may inject a Gateway into the real bridge; production never imports
  // that caller or selects it through IPC/config/environment.
  installCoding(
    supervisor: PythonSupervisor,
    runtime: VerifiedCodingRuntime,
    offlineLaunch?: () => LaunchSpec
  ): void {
    requireVerifiedCoding(runtime)
    if (!this.broker || this.codingSupervisor) throw new CodingUnavailable()
    this.codingSupervisor = supervisor
    const verify = <T>(scope: Scope, operation: () => T) => this.broker!.withRoot(scope, operation)
    supervisor.configureCoding({
      store: this.store,
      codingLaunch: () => {
        requireVerifiedCoding(runtime)
        return offlineLaunch?.() ?? runtime.launch()
      },
      codingContext: (scope, taskId) => this.store.codingContext(scope, taskId),
      verifyCoding: verify,
      proof: (kind, binding) =>
        kind === 'event'
          ? { ...this.codingProof, ...binding }
          : kind === 'cleanup'
            ? this.codingProof
            : this.proof,
      workspaceSafe: (taskId) => {
        const bindings = this.store.bootstrap().activeTaskSummaries.find((t) => t.taskId === taskId)
        if (!bindings) return false
        const scope = this.store.conversationBinding(bindings.conversationId).scope
        return this.nativeVerified.has(scope.workspaceKey)
      },
      onCodingTerminal: (scope, taskId) => {
        if (this.finishing.has(taskId)) return
        this.finishing.add(taskId)
        void (async () => {
          try {
            if (
              !(await supervisor.stopCodingChild(taskId)) ||
              !this.store.terminalForCleanup(scope, taskId)
            )
              return
            const released = await verify(scope, () => supervisor.reconcileTask(scope, taskId))
            if (released && !this.closing) await this.advanceCoding(supervisor, runtime, verify)
          } catch {
            this.store.markProcessUncertain(scope, taskId, this.proof)
            this.store.taskHint(scope, taskId)
          } finally {
            this.finishing.delete(taskId)
          }
        })().catch(() => {})
      }
    })
    this.coding.installBackend({
      requireReady: () => {
        requireVerifiedCoding(runtime)
        if (!offlineLaunch)
          throw new CodingUnavailable(
            'The coding engine is verified. A coding model route requires separate configuration and authorization; no task was admitted or started.'
          )
      },
      start: async (scope, taskId) => {
        await supervisor.admitCodingTask(scope, taskId)
      },
      cancelRegistered: (scope, taskId) => supervisor.forwardRegisteredCancellation(scope, taskId)
    })
  }
  private async advanceCoding(
    supervisor: PythonSupervisor,
    runtime: VerifiedCodingRuntime,
    verify: <T>(scope: Scope, operation: () => T) => Promise<T>
  ): Promise<void> {
    // Called only after new, proven terminal cleanup; never on boot/reload.
    for (const candidate of this.store.queuedBindings(this.proof)) {
      requireVerifiedCoding(runtime)
      const taskId = await verify(candidate.scope, () =>
        this.store.schedule(this.proof, candidate.scope)
      )
      if (!taskId) continue
      this.store.taskHint(candidate.scope, taskId)
      try {
        await supervisor.admitCodingTask(candidate.scope, taskId)
      } catch {
        this.store.markProcessUncertain(candidate.scope, taskId, this.proof)
        this.store.taskHint(candidate.scope, taskId)
      }
      break
    }
  }
  private select(projectId: string) {
    const binding = this.store.projectBinding(projectId)
    if (
      !binding.scope.workspaceKey.startsWith('win32-v1_') &&
      rootIdentity(binding.root).key !== binding.scope.workspaceKey
    )
      throw new StoreError('WORKSPACE_UNAVAILABLE')
    this.selectedProjectId = projectId
    return this.store.projects().find((p) => p.projectId === projectId)!
  }
  private scope(projectId = this.selectedProjectId): Scope {
    if (!projectId || projectId !== this.selectedProjectId) throw new StoreError('NOT_AUTHORIZED')
    const binding = this.store.projectBinding(projectId)
    if (
      !binding.scope.workspaceKey.startsWith('win32-v1_') &&
      rootIdentity(binding.root).key !== binding.scope.workspaceKey
    )
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
  async dispatch(method: Method, input: unknown, sender = 0): Promise<IpcResult<unknown>> {
    try {
      const data = await this.operation(method, input, sender)
      return { ok: true, data }
    } catch (error) {
      if (error instanceof CodingUnavailable)
        return {
          ok: false,
          error: { code: 'RUNTIME_NOT_READY', message: error.explanation, retryable: false }
        }
      if (error instanceof BrokerError)
        return failure(
          error.code === 'STALE_SOURCE'
            ? 'SOURCE_STALE'
            : error.code === 'WORKSPACE_MISMATCH' || error.code === 'BROKER_IO_ERROR'
              ? 'WORKSPACE_UNAVAILABLE'
              : error.code
        )
      return failure(error instanceof StoreError ? error.code : 'INTERNAL_ERROR')
    }
  }
  private async operation(method: Method, input: unknown, sender: number): Promise<unknown> {
    // Legacy isolated P5 profiles have no native file/task integration. Keep
    // those surfaces closed; normal P6/P7 startup supplies the native broker.
    if ((method === 'proposals.confirmRun' || method.startsWith('tasks.')) && !this.broker)
      throw new StoreError('RUNTIME_NOT_READY')
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
        const identity = this.broker ? await this.broker.register(chosen) : rootIdentity(chosen),
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
      case 'projects.select': {
        const id = (input as Input<'projects.select'>).projectId,
          scope = this.store.projectBinding(id).scope
        return this.broker && scope.workspaceKey.startsWith('win32-v1_')
          ? this.broker.withRoot(scope, () => this.select(id))
          : this.select(id)
      }
      case 'projects.listFiles': {
        if (!this.broker) throw new StoreError('RUNTIME_NOT_READY')
        const value = input as Input<'projects.listFiles'>
        this.scope(value.projectId)
        return this.broker.local(
          value.projectId,
          value.relativeDir,
          value.cursor,
          value.limit,
          undefined,
          sender
        )
      }
      case 'projects.previewFile': {
        if (!this.broker) throw new StoreError('RUNTIME_NOT_READY')
        const value = input as Input<'projects.previewFile'>
        this.scope(value.projectId)
        return this.broker.local(
          value.projectId,
          value.relativePath,
          undefined,
          undefined,
          value.range,
          sender
        )
      }
      case 'disclosures.list':
        if (!this.broker) throw new StoreError('RUNTIME_NOT_READY')
        return this.broker.disclosures((input as Input<'disclosures.list'>).projectId)
      case 'disclosures.respond':
        if (!this.broker) throw new StoreError('RUNTIME_NOT_READY')
        return this.broker.respond(input as Input<'disclosures.respond'>)
      case 'disclosures.revoke':
        if (!this.broker) throw new StoreError('RUNTIME_NOT_READY')
        return this.broker.revoke(input as Input<'disclosures.revoke'>)
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
      case 'proposals.confirmRun':
        return this.coding.confirm(input as Input<'proposals.confirmRun'>)
      case 'tasks.read':
        return this.coding.read((input as Input<'tasks.read'>).taskId)
      case 'tasks.list':
        return this.coding.list(input as Input<'tasks.list'>)
      case 'tasks.readEvents':
        return this.coding.events(input as Input<'tasks.readEvents'>)
      case 'tasks.cancel':
        return this.coding.cancel((input as Input<'tasks.cancel'>).taskId)
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
        const accept = () => {
          const result = this.store.sendMessage(scope, value)
          const turn = this.store.discussionTurn(scope, result.messageId)
          if (turn.status === 'pending' && !this.queued.has(result.messageId))
            this.enqueue(scope, turn)
          return result
        }
        return this.broker && scope.workspaceKey.startsWith('win32-v1_')
          ? this.broker.withRoot(scope, accept)
          : accept()
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
    let attempt: string | undefined, session: string | undefined, issued: string | undefined
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
          if (this.broker)
            this.broker.bind({
              session: session!,
              wire: id,
              conversation: turn.conversationId,
              scope,
              root: this.store.projectBinding(scope.projectId).root,
              model: turn.modelId,
              provider: DISCUSSION_PROVIDER,
              destination: SOURCE_DESTINATION,
              attempt: attempt!,
              child
            })
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
      const finish = () =>
        this.store.finishAttempt(scope, attempt!, session!, { ok: true, result }, this.proof)
      if (this.broker && scope.workspaceKey.startsWith('win32-v1_'))
        await this.broker.withRoot(scope, finish)
      else finish()
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
    } finally {
      if (issued) this.broker?.end(issued)
    }
  }
  async idle() {
    await Promise.allSettled([...this.lanes.values()])
  }
  close() {
    this.closing = true
    this.coding.close()
    this.broker?.close()
    this.store.close()
  }
}
