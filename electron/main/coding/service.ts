import type { Input } from '../../../contracts/ipc'
import type { DurableStore, Scope } from '../storage/store'
import { StoreError } from '../storage/database'
import { requireCodingEngine } from './gate'

// Main-only seam. Production supplies no backend until the engine gate has
// independent evidence/owner approval. Isolated tests may supply a dispatch spy;
// neither that spy nor P4's simulator is real AgentOS evidence.
export interface CodingBackend {
  requireReady(): void
  start(scope: Scope, taskId: string): Promise<void>
  cancelRegistered(scope: Scope, taskId: string): void
}
interface Options {
  store: DurableStore
  proof: unknown
  scope: () => Scope
  verify: <T>(scope: Scope, work: () => T) => Promise<T>
  backend?: CodingBackend
}
export class CodingService {
  private readonly pending = new Set<Promise<void>>()
  private closing = false
  constructor(private readonly options: Options) {}
  installBackend(backend: CodingBackend): void {
    if (this.closing || this.options.backend) throw new StoreError('RUNTIME_NOT_READY')
    this.options.backend = backend
  }
  async confirm(input: Input<'proposals.confirmRun'>) {
    if (this.closing) throw new StoreError('RUNTIME_NOT_READY')
    const { store, backend } = this.options,
      scope = this.options.scope()
    const prior = store.admissionReceipt(scope, input, this.options.proof)
    if (prior) return prior // Read the historical receipt; never re-issue its task.
    const binding = store.proposalBinding(input.proposalId)
    if (
      binding.scope.projectId !== scope.projectId ||
      binding.scope.workspaceKey !== scope.workspaceKey
    )
      throw new StoreError('NOT_AUTHORIZED')
    if (!backend) requireCodingEngine()
    backend.requireReady()
    let created = false
    const admission = await this.options.verify(scope, () =>
      store.admit(scope, input, this.options.proof, () => {
        created = true
      })
    )
    if (created && admission.state === 'starting') {
      // Only the new T2 COMMIT can dispatch. Receipt replay, including another
      // coordinator/connection, has no post-COMMIT creation callback.
      const work = Promise.resolve()
        .then(() => {
          if (this.closing) throw new StoreError('RUNTIME_NOT_READY')
          backend.requireReady()
          return backend.start(scope, admission.taskId)
        })
        .catch(() => {
          store.markProcessUncertain(scope, admission.taskId, this.options.proof)
          store.taskHint(scope, admission.taskId)
        })
        .finally(() => this.pending.delete(work))
      this.pending.add(work)
      void work.catch(() => {})
    }
    return admission // Admission only. Never return an engine outcome here.
  }
  cancel(taskId: string) {
    const scope = this.options.scope(),
      store = this.options.store
    const result = store.cancel(scope, taskId, this.options.proof)
    const state = store.readTask(scope, taskId).state
    if (result.state === 'requested' && state === 'cancel_requested') {
      try {
        if (!this.options.backend) throw new StoreError('RUNTIME_NOT_READY')
        // T3 has committed. The backend forwards only; it must not re-register the
        // cancellation and mistake already_requested for an instruction to skip it.
        this.options.backend.cancelRegistered(scope, taskId)
      } catch {
        store.markProcessUncertain(scope, taskId, this.options.proof)
      }
    }
    store.taskHint(scope, taskId)
    return result
  }
  read(taskId: string) {
    return this.options.store.readTask(this.options.scope(), taskId)
  }
  events(input: Input<'tasks.readEvents'>) {
    return this.options.store.readEvents(this.options.scope(), input)
  }
  list(input: Input<'tasks.list'>) {
    return this.options.store.listTasks(
      this.options.scope(),
      input.conversationId,
      input.cursor,
      input.limit
    )
  }
  authorized(taskId: string) {
    try {
      this.read(taskId)
      return true
    } catch {
      return false
    }
  }
  async idle() {
    await Promise.allSettled([...this.pending])
  }
  close() {
    this.closing = true
  }
}
