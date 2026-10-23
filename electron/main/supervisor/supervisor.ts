import { randomBytes } from 'node:crypto'
import { SupervisedChild } from './child'
import { launchSpec, type VerifiedRuntime } from './runtime'
import type { LaunchSpec } from './windows-process'
import type { DurableStore, Scope } from '../storage/store'
import { StoreError } from '../storage/database'

export interface SupervisorOptions {
  runtime: VerifiedRuntime
  store?: DurableStore
  // Explicit trusted integration hooks, deny by default. Production P4 has no
  // coding launch source, workspace-safe verifier or engine event authority.
  codingLaunch?: () => LaunchSpec
  proof?: (
    kind: string,
    binding: {
      taskId: string
      workspaceKey: string
      processSessionRef: string
      role: 'coding_task'
    }
  ) => unknown
  workspaceSafe?: (taskId: string) => boolean
  discussionLaunch?: () => LaunchSpec
  discussionBroker?: {
    authorize: (session: string, input: Record<string, unknown>) => boolean
    frame: (
      child: SupervisedChild,
      frame: import('../../../contracts/wire-schema').WireMessage
    ) => void
    ended: (session: string) => void
  }
  now?: () => number
  sleep?: (milliseconds: number) => Promise<void>
}
export class PythonSupervisor {
  readonly runId = randomBytes(24).toString('hex')
  discussion?: SupervisedChild
  private ensuring?: Promise<SupervisedChild>
  private readonly starts: number[] = []
  private closing = false
  private exhausted = false
  private generation = 0
  private coding?: { child: SupervisedChild; taskId: string; scope: Scope }
  private readonly dispatched = new Set<string>()
  private readonly now: () => number
  constructor(private readonly options: SupervisorOptions) {
    this.now = options.now ?? (() => performance.now())
  }
  ensureDiscussionReady(): Promise<SupervisedChild> {
    if (this.closing || this.exhausted) return Promise.reject(new StoreError('RUNTIME_NOT_READY'))
    if (this.discussion?.connection.state.ready) return Promise.resolve(this.discussion)
    return (this.ensuring ??= this.ensure().finally(() => {
      this.ensuring = undefined
    }))
  }
  private async ensure(): Promise<SupervisedChild> {
    for (let attempt = 0; attempt < 3 && !this.closing; attempt++) {
      while (this.starts.length && this.now() - this.starts[0] >= 60000) this.starts.shift()
      if (this.starts.length >= 3) break
      const generation = this.generation
      await (this.options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))))(
        1000 * 2 ** this.starts.length
      )
      if (this.closing || generation !== this.generation) throw new StoreError('RUNTIME_NOT_READY')
      this.starts.push(this.now())
      let child: SupervisedChild | undefined
      try {
        child = new SupervisedChild({
          runId: this.runId,
          role: 'discussion',
          launch:
            this.options.discussionLaunch?.() ?? launchSpec(this.options.runtime, 'discussion'),
          now: this.options.now,
          authorizeBroker: (input) =>
            !!child && this.options.discussionBroker?.authorize(child.sessionId, input) === true,
          onFrame: (frame) => {
            if (child) this.options.discussionBroker?.frame(child, frame)
          },
          onFault: (session) => this.options.discussionBroker?.ended(session)
        })
        this.discussion = child
        child.start()
        await child.ready
        child.once('stopped', (verified: boolean) => {
          this.options.discussionBroker?.ended(child!.sessionId)
          if (this.closing || this.discussion !== child) return
          if (!verified) {
            this.exhausted = true
            return
          }
          // Defer past the original ensure() finally; requests are NEVER replayed.
          setTimeout(() => {
            void this.ensureDiscussionReady().catch(() => {})
          }, 0)
        })
        return child
      } catch {
        if (child && !(await child.stop())) {
          this.exhausted = true
          break
        }
      }
    }
    this.exhausted = true
    throw new StoreError('RUNTIME_NOT_READY')
  }
  async admitCodingTask(scope: Scope, taskId: string): Promise<SupervisedChild> {
    const { store, codingLaunch, proof } = this.options
    if (this.closing || !store || !codingLaunch || !proof) throw new StoreError('RUNTIME_NOT_READY')
    if (this.coding || this.dispatched.has(taskId)) throw new StoreError('TASK_BUSY')
    if (this.dispatched.size >= 65536) throw new StoreError('RESOURCE_LIMIT')
    const admissionProof = proof('supervise', {
      taskId,
      workspaceKey: scope.workspaceKey,
      processSessionRef: this.runId,
      role: 'coding_task'
    })
    const admission = store.supervisionAdmission(scope, taskId, admissionProof)
    const child = new SupervisedChild({
      runId: this.runId,
      role: 'coding_task',
      launch: codingLaunch(),
      now: this.options.now,
      task: {
        taskId,
        conversationId: admission.conversationId,
        workspaceRoot: admission.workspaceRoot
      },
      authorizeExecute: (input) =>
        input.task_goal === admission.taskGoal &&
        store.supervisionAdmission(scope, taskId, admissionProof).taskId === taskId,
      onFrame: (frame, sessionId) => {
        if (frame.type === 'event')
          store.commitEvent(
            scope,
            frame,
            proof('event', {
              taskId,
              workspaceKey: scope.workspaceKey,
              processSessionRef: sessionId,
              role: 'coding_task'
            })
          )
      },
      onFault: () => store.markProcessUncertain(scope, taskId, admissionProof)
    })
    this.coding = { child, taskId, scope }
    this.dispatched.add(taskId)
    child.once('stopped', () => {
      try {
        store.markProcessUncertain(scope, taskId, admissionProof)
      } catch {}
    })
    try {
      child.start()
      await child.ready
      child.send('task.execute', {
        task_id: taskId,
        conversation_id: admission.conversationId,
        task_goal: admission.taskGoal,
        workspace_root: admission.workspaceRoot,
        conversation_context: null
      })
      return child
    } catch (error) {
      await child.stop()
      throw error
    }
  }
  requestCancellation(scope: Scope, taskId: string) {
    const { store, proof } = this.options
    if (!store || !proof) throw new StoreError('RUNTIME_NOT_READY')
    const active = this.coding
    const binding = {
      taskId,
      workspaceKey: scope.workspaceKey,
      processSessionRef: active?.child.sessionId ?? this.runId,
      role: 'coding_task' as const
    }
    const result = store.cancel(scope, taskId, proof('cancel', binding))
    if (
      result.state === 'requested' &&
      active?.taskId === taskId &&
      active.scope.projectId === scope.projectId &&
      active.scope.workspaceKey === scope.workspaceKey
    ) {
      try {
        active.child.send('task.cancel', { task_id: taskId })
      } catch {
        store.markProcessUncertain(scope, taskId, proof('supervise', binding))
        void active.child.stop()
      }
    }
    return result
  }
  async reconcileTask(scope: Scope, taskId: string): Promise<boolean> {
    const active = this.coding,
      { store, proof, workspaceSafe } = this.options
    if (
      !active ||
      active.taskId !== taskId ||
      active.scope.projectId !== scope.projectId ||
      active.scope.workspaceKey !== scope.workspaceKey ||
      !store ||
      !proof
    )
      throw new StoreError('TASK_UNKNOWN')
    const stopped = await active.child.stop()
    if (!stopped || workspaceSafe?.(taskId) !== true) return false
    const binding = {
      taskId,
      workspaceKey: scope.workspaceKey,
      processSessionRef: active.child.sessionId,
      role: 'coding_task' as const
    }
    // A killed simulator/bridge provides no engine outcome or cancelled event.
    const trusted = proof('cleanup', binding) as Record<string, unknown>
    store.reconcile(scope, taskId, {
      ...trusted,
      taskId,
      workspaceKey: scope.workspaceKey,
      childStopped: true,
      descendantsStopped: true,
      workspaceSafe: true,
      reason: 'interrupted'
    })
    this.coding = undefined
    return true
  }
  get activeCodingTask() {
    return this.coding?.taskId ?? null
  }
  async stopAllOnAppQuit(): Promise<boolean> {
    this.closing = true
    this.generation++
    const children = [this.discussion, this.coding?.child].filter(
      (child): child is SupervisedChild => !!child
    )
    if (this.coding && this.coding.child.cleanupVerified === null) {
      try {
        this.requestCancellation(this.coding.scope, this.coding.taskId)
      } catch {}
      // Keep the complete frozen graceful window before forcing the Job.
      const until = performance.now() + 15000
      while (
        performance.now() < until &&
        !this.coding.child.hasVerifiedCleanup() &&
        this.coding.child.process?.activeProcesses() !== 0
      )
        await new Promise((resolve) => setTimeout(resolve, 50))
    }
    const results = await Promise.all(children.map((child) => child.stop()))
    return results.every(Boolean)
  }
}
