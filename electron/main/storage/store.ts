import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import {
  ID,
  Cursor,
  UInt,
  object,
  text,
  assertJsonValue,
  WindowsWorkspace
} from '../../../contracts/common'
import { IPC, IPC_RESPONSE_BYTES, type Input, type Method } from '../../../contracts/ipc'
import * as dto from '../../../contracts/ipc-dtos'
import { canonicalJson, validateWire, newMessageId } from '../../../contracts/jsonl'
import { ContextV1, responseResults } from '../../../contracts/wire-schema'
import { DatabaseCore, refuse, sha256, type DatabaseOptions, type Row } from './database'

export type Scope = { projectId: string; workspaceKey: string }
export interface StorePolicy {
  workspace?(project: { projectId: string; workspaceKey: string; canonicalRoot: string }): boolean
  model?(modelId: string): { modelId: string; providerKey: string } | null
  providerLabel?(providerKey: string): string | null
  evidence?(kind: string, evidence: unknown): boolean
}
export interface StoreOptions extends DatabaseOptions {
  policy?: StorePolicy
  notify?: (kind: 'task' | 'conversation', scopeId: string, update: unknown) => void
}
const ScopeSchema = object({ projectId: ID, workspaceKey: text(128, 1) })
const Proof = object({ ref: ID })
const defaults = {
  version: 1 as const,
  savedDockWidth: 360,
  sidebarCollapsed: false,
  ambientLight: true
}
const terminal = new Set(['completed', 'failed', 'cancelled'])
export const subjectKey = (key: Uint8Array, workspaceKey: string, relativePath: string) =>
  createHmac('sha256', key)
    .update(canonicalJson([workspaceKey, relativePath]))
    .digest('hex')

export class DurableStore extends DatabaseCore {
  private readonly policy: StorePolicy
  private readonly notify?: StoreOptions['notify']
  private readonly cursorKey = randomBytes(32)
  constructor(path: string, options: StoreOptions = {}) {
    super(path, options)
    this.policy = options.policy ?? {}
    this.notify = options.notify
  }
  private parse<S extends z.ZodType>(schema: S, value: unknown): z.infer<S> {
    try {
      assertJsonValue(value)
      return schema.parse(value)
    } catch {
      return refuse('BAD_INPUT')
    }
  }
  private decode<S extends z.ZodType>(schema: S, json: string): z.infer<S> {
    try {
      const value: unknown = JSON.parse(json)
      assertJsonValue(value, IPC_RESPONSE_BYTES)
      return schema.parse(value)
    } catch {
      return refuse('DATABASE_UNAVAILABLE')
    }
  }
  private evidence(kind: string, proof: unknown): void {
    this.parse(Proof, proof)
    if (this.policy.evidence?.(kind, proof) !== true) refuse('NOT_AUTHORIZED')
  }
  private project(scope: Scope, verify = false): Row {
    this.parse(ScopeSchema, scope)
    const p = this.get(
      'SELECT * FROM projects WHERE project_id=? AND canonical_workspace_key=?',
      scope.projectId,
      scope.workspaceKey
    )
    if (!p) return refuse('NOT_AUTHORIZED')
    if (
      verify &&
      (!p.available ||
        this.policy.workspace?.({
          projectId: p.project_id,
          workspaceKey: p.canonical_workspace_key,
          canonicalRoot: p.canonical_root
        }) !== true)
    )
      refuse('WORKSPACE_UNAVAILABLE')
    return p
  }
  private conversation(scope: Scope, id: string): Row {
    this.project(scope)
    this.parse(ID, id)
    const c = this.get(
      'SELECT * FROM conversations WHERE conversation_id=? AND project_id=?',
      id,
      scope.projectId
    )
    return c ?? refuse('NOT_AUTHORIZED')
  }
  private task(scope: Scope, id: string): Row {
    this.project(scope)
    this.parse(ID, id)
    return (
      this.get(
        'SELECT * FROM tasks WHERE task_id=? AND project_id=? AND workspace_key=?',
        id,
        scope.projectId,
        scope.workspaceKey
      ) ?? refuse('NOT_AUTHORIZED')
    )
  }
  private hint(kind: 'task' | 'conversation', scopeId: string, update: unknown) {
    try {
      this.notify?.(kind, scopeId, update)
    } catch {
      /* A subscriber cannot reverse a committed fact. */
    }
  }
  private changed(conversationId: string) {
    this.hint('conversation', conversationId, { type: 'ConversationChanged', conversationId })
  }
  private receipt<M extends Method>(
    method: M,
    scope: Scope,
    input: Input<M>
  ): { previous?: unknown; save: (result: unknown, resultId: string, type: string) => void } {
    const key = (input as { clientMutationId: string }).clientMutationId
    const fingerprint = sha256(canonicalJson(scope)),
      hash = sha256(canonicalJson({ method, scope, input }))
    const prior = this.get('SELECT * FROM mutation_receipts WHERE client_mutation_id=?', key)
    if (prior) {
      if (prior.scope_fingerprint !== fingerprint) refuse('NOT_AUTHORIZED')
      if (prior.operation !== method || prior.canonical_input_hash !== hash) refuse('BAD_INPUT')
      return {
        previous: this.decode(IPC[method].output, prior.result_snapshot_json),
        save: () => refuse('INTERNAL_ERROR')
      }
    }
    return {
      save: (result, id, type) => {
        const checked = this.parse(IPC[method].output, result)
        this.run(
          'INSERT INTO mutation_receipts VALUES(?,?,?,?,?,?,?,?)',
          key,
          method,
          fingerprint,
          hash,
          type,
          id,
          canonicalJson(checked),
          this.timestamp()
        )
      }
    }
  }
  registerProject(input: unknown, proof: unknown) {
    this.evidence('project', proof)
    const p = this.parse(
      object({
        workspaceKey: text(128, 1),
        canonicalRoot: WindowsWorkspace,
        displayName: text(256, 1)
      }),
      input
    )
    return this.transaction('project', () => {
      const existing = this.get(
        'SELECT * FROM projects WHERE canonical_workspace_key=?',
        p.workspaceKey
      )
      if (existing) return existing.project_id as string
      const id = newMessageId()
      this.run(
        'INSERT INTO projects VALUES(?,?,?,?,?,1)',
        id,
        p.workspaceKey,
        p.canonicalRoot,
        p.displayName,
        this.timestamp()
      )
      return id
    })
  }
  sendMessage(scope: Scope, input: Input<'conversations.sendMessage'>) {
    const value = this.parse(IPC['conversations.sendMessage'].input, input)
    let inserted = false
    const result = this.transaction('T1', () => {
      this.project(scope)
      const receipt = this.receipt('conversations.sendMessage', scope, value)
      if (receipt.previous) return dto.MessageAcceptance.parse(receipt.previous)
      this.project(scope, true)
      const model = this.policy.model?.(value.modelId)
      if (!model || model.modelId !== value.modelId) refuse('MODEL_UNAVAILABLE')
      if (!value.conversationId && !value.draftId) refuse('BAD_INPUT')
      const cid = value.conversationId ?? newMessageId(),
        mid = newMessageId(),
        now = this.timestamp()
      if (value.conversationId) this.conversation(scope, cid)
      else
        this.run(
          'INSERT INTO conversations VALUES(?,?,?,?,?,0)',
          cid,
          scope.projectId,
          [...value.text].slice(0, 80).join(''),
          now,
          now
        )
      this.run(
        "INSERT INTO messages(message_id,conversation_id,role,content,created_at,delivery_state,selected_model_id) VALUES(?,?,'user',?,?,'persisted',?)",
        mid,
        cid,
        value.text,
        now,
        value.modelId
      )
      this.run(
        "INSERT INTO discussion_turns VALUES(?,?,?,'pending',NULL,NULL,NULL)",
        mid,
        cid,
        value.modelId
      )
      this.run(
        'UPDATE conversations SET updated_at=?,context_revision=context_revision+1 WHERE conversation_id=?',
        now,
        cid
      )
      const accepted = dto.MessageAcceptance.parse({
        conversationId: cid,
        messageId: mid,
        acceptedAt: now,
        deliveryState: 'persisted'
      })
      receipt.save(accepted, mid, 'MessageAcceptance')
      inserted = true
      return accepted
    })
    if (inserted) this.changed(result.conversationId)
    return result
  }
  createProposal(scope: Scope, conversationId: string, goal: string, proof: unknown): string {
    this.evidence('proposal', proof)
    this.parse(text(16384, 1), goal)
    const id = this.transaction('proposal', () => {
      this.project(scope, true)
      this.conversation(scope, conversationId)
      const pid = newMessageId()
      this.run(
        "INSERT INTO task_proposals VALUES(?,?,?,?,?,?,?,'available',NULL)",
        pid,
        conversationId,
        scope.projectId,
        scope.workspaceKey,
        goal,
        this.timestamp(),
        new Date(this.now() + 900000).toISOString()
      )
      return pid
    })
    this.changed(conversationId)
    return id
  }
  admit(scope: Scope, input: Input<'proposals.confirmRun'>, proof: unknown) {
    this.evidence('run', proof)
    const value = this.parse(IPC['proposals.confirmRun'].input, input)
    let changed = false
    const result = this.transaction('T2', () => {
      this.project(scope)
      const receipt = this.receipt('proposals.confirmRun', scope, value)
      if (receipt.previous) return dto.TaskAdmissionView.parse(receipt.previous)
      this.project(scope, true)
      const p =
        this.get(
          'SELECT * FROM task_proposals WHERE proposal_id=? AND project_id=? AND canonical_workspace_key=?',
          value.proposalId,
          scope.projectId,
          scope.workspaceKey
        ) ?? refuse('NOT_AUTHORIZED')
      this.conversation(scope, p.conversation_id)
      if (p.state === 'consumed') refuse('PROPOSAL_ALREADY_USED')
      if (
        p.state !== 'available' ||
        p.expires_at <= this.timestamp() ||
        p.issued_at > this.timestamp()
      )
        refuse('PROPOSAL_EXPIRED')
      const slot = this.get('SELECT task_id FROM active_coding_slot WHERE slot_id=1')
      const lease = this.get(
        'SELECT task_id FROM workspace_writer_leases WHERE workspace_key=?',
        scope.workspaceKey
      )
      const starting = slot?.task_id === null && !lease
      if (!starting && this.get("SELECT count(*) AS n FROM tasks WHERE state='queued'")!.n >= 20)
        refuse('TASK_BUSY')
      const tid = newMessageId(),
        now = this.timestamp(),
        state = starting ? 'starting' : 'queued'
      this.run(
        'INSERT INTO tasks(task_id,proposal_id,conversation_id,project_id,workspace_key,exact_goal,state,engine_outcome_json,cleanup_state,cancel_requested_at,cancel_request_ref,created_at,updated_at) VALUES(?,?,?,?,?,?,?,NULL,?,NULL,NULL,?,?)',
        tid,
        p.proposal_id,
        p.conversation_id,
        p.project_id,
        p.canonical_workspace_key,
        p.exact_goal,
        state,
        starting ? 'unverified' : 'not_started',
        now,
        now
      )
      this.run("INSERT INTO task_event_streams VALUES(?,0,0,'complete',NULL,NULL)", tid)
      if (starting) this.reserve(tid, scope.workspaceKey, now)
      this.run(
        "UPDATE task_proposals SET state='consumed',consumed_task_id=? WHERE proposal_id=?",
        tid,
        p.proposal_id
      )
      const admitted = dto.TaskAdmissionView.parse({
        taskId: tid,
        conversationId: p.conversation_id,
        projectId: p.project_id,
        state
      })
      receipt.save(admitted, tid, 'TaskAdmissionView')
      changed = true
      return admitted
    })
    if (changed) this.changed(result.conversationId)
    return result
  }
  private reserve(taskId: string, key: string, now: string) {
    this.run("INSERT INTO workspace_writer_leases VALUES(?,?,'active',?,NULL)", key, taskId, now)
    const result = this.run(
      'UPDATE active_coding_slot SET task_id=? WHERE slot_id=1 AND task_id IS NULL',
      taskId
    )
    if (result.changes !== 1) refuse('TASK_BUSY')
  }
  schedule(proof: unknown): string | null {
    this.evidence('schedule', proof)
    return this.transaction('T3.schedule', () => {
      if (this.get('SELECT task_id FROM active_coding_slot WHERE slot_id=1')?.task_id !== null)
        return null
      const candidates = this.all(
        "SELECT * FROM tasks WHERE state='queued' ORDER BY admission_order LIMIT 20"
      )
      for (const task of candidates) {
        if (
          this.get(
            'SELECT task_id FROM workspace_writer_leases WHERE workspace_key=?',
            task.workspace_key
          )
        )
          continue
        this.project({ projectId: task.project_id, workspaceKey: task.workspace_key }, true)
        this.reserve(task.task_id, task.workspace_key, this.timestamp())
        this.run(
          "UPDATE tasks SET state='starting',cleanup_state='unverified',updated_at=? WHERE task_id=?",
          this.timestamp(),
          task.task_id
        )
        return task.task_id as string
      }
      return null
    })
  }
  cancel(scope: Scope, taskId: string, proof: unknown) {
    this.evidence('cancel', proof)
    return this.transaction('T3.cancel', () => {
      const task = this.task(scope, taskId)
      if (
        terminal.has(task.state) ||
        task.engine_outcome_json !== null ||
        task.cleanup_state.startsWith('verified_')
      )
        return dto.CancelRequestView.parse({ taskId, state: 'not_running' })
      if (task.cancel_request_ref)
        return dto.CancelRequestView.parse({ taskId, state: 'already_requested' })
      const queued = task.state === 'queued'
      if (
        queued &&
        (this.get('SELECT task_id FROM workspace_writer_leases WHERE task_id=?', taskId) ||
          this.get('SELECT task_id FROM active_coding_slot WHERE task_id=?', taskId))
      )
        refuse('TASK_UNKNOWN')
      this.run(
        'UPDATE tasks SET state=?,cleanup_state=?,cancel_requested_at=?,cancel_request_ref=?,updated_at=? WHERE task_id=?',
        queued ? 'cancelled' : 'cancel_requested',
        queued ? 'verified_never_started' : task.cleanup_state,
        this.timestamp(),
        newMessageId(),
        this.timestamp(),
        taskId
      )
      return dto.CancelRequestView.parse({ taskId, state: 'requested' })
    })
  }
  reconcile(scope: Scope, taskId: string, evidence: unknown) {
    const proof = this.parse(
      object({
        ref: ID,
        taskId: ID,
        workspaceKey: text(128, 1),
        childStopped: z.literal(true),
        descendantsStopped: z.literal(true),
        workspaceSafe: z.literal(true),
        reason: z.enum(['completed', 'failed', 'cancelled', 'interrupted'])
      }),
      evidence
    )
    // The trusted verifier evaluates the entire evidence, not a Renderer token.
    if (this.policy.evidence?.('cleanup', proof) !== true) refuse('NOT_AUTHORIZED')
    return this.transaction('T3.cleanup', () => {
      const task = this.task(scope, taskId)
      if (proof.taskId !== taskId || proof.workspaceKey !== task.workspace_key)
        refuse('NOT_AUTHORIZED')
      const lease = this.get(
        'SELECT * FROM workspace_writer_leases WHERE task_id=? AND workspace_key=?',
        taskId,
        scope.workspaceKey
      )
      if (!lease) refuse('TASK_UNKNOWN')
      if (
        proof.reason !== 'interrupted' &&
        task.engine_outcome_json === null &&
        task.state !== 'cancelled'
      )
        refuse('TASK_UNKNOWN')
      const outcome =
        task.engine_outcome_json === null ? null : JSON.parse(task.engine_outcome_json)
      if (
        (proof.reason === 'completed' && outcome?.success !== true) ||
        (proof.reason === 'failed' && outcome?.success !== false) ||
        (proof.reason === 'cancelled' &&
          !this.get(
            "SELECT event_id FROM task_events WHERE task_id=? AND name='task.cancelled'",
            taskId
          ))
      )
        refuse('TASK_UNKNOWN')
      // A closed cleanup-state code retains the verified audit reason in the
      // frozen column set; updated_at records the reconciliation transaction.
      const stream = this.get(
        'SELECT integrity_status FROM task_event_streams WHERE task_id=?',
        taskId
      )
      const state =
        stream?.integrity_status !== 'complete'
          ? 'needs_reconciliation'
          : proof.reason === 'interrupted'
            ? 'unknown'
            : proof.reason
      this.run(
        'UPDATE tasks SET cleanup_state=?,state=?,updated_at=? WHERE task_id=?',
        'verified_' + proof.reason,
        state,
        this.timestamp(),
        taskId
      )
      this.run(
        'DELETE FROM workspace_writer_leases WHERE task_id=? AND workspace_key=?',
        taskId,
        scope.workspaceKey
      )
      this.run('UPDATE active_coding_slot SET task_id=NULL WHERE slot_id=1 AND task_id=?', taskId)
      return true
    })
  }
  recoverAfterRestart(): void {
    this.transaction('recovery', () => {
      this.run(
        "UPDATE tasks SET state='needs_reconciliation',cleanup_state='blocked',updated_at=? WHERE task_id IN (SELECT task_id FROM workspace_writer_leases) OR task_id IN (SELECT task_id FROM active_coding_slot WHERE task_id IS NOT NULL)",
        this.timestamp()
      )
      this.run("UPDATE workspace_writer_leases SET lease_state='blocked'")
      this.run("UPDATE discussion_turns SET status='unknown' WHERE status='issued'")
      this.run(
        "UPDATE discussion_attempts SET status='unknown',finished_at=? WHERE status='issued'",
        this.timestamp()
      )
    })
  }
  preferences() {
    const row = this.get("SELECT safe_json FROM ui_preferences WHERE preference_scope='display'")
    return row ? this.decode(dto.UiPreferences, row.safe_json) : dto.UiPreferences.parse(defaults)
  }
  discussionPreference(): string | null {
    const row = this.get(
      "SELECT safe_json FROM ui_preferences WHERE preference_scope='discussion_model'"
    )
    if (!row) return null
    return this.decode(object({ modelId: Cursor }), row.safe_json).modelId
  }
  setDiscussionPreference(modelId: string, proof: unknown) {
    this.evidence('model_preference', proof)
    this.parse(Cursor, modelId)
    const model = this.policy.model?.(modelId)
    if (!model || model.modelId !== modelId) refuse('MODEL_UNAVAILABLE')
    return this.transaction('model_preference', () => {
      this.run(
        "INSERT INTO ui_preferences VALUES('discussion_model',1,?,?) ON CONFLICT(preference_scope) DO UPDATE SET safe_json=excluded.safe_json,updated_at=excluded.updated_at",
        canonicalJson({ modelId }),
        this.timestamp()
      )
      return dto.ModelSelectionView.parse({ modelId })
    })
  }
  private providerLabel(key: string): string {
    const label = this.policy.providerLabel?.(key)
    if (!label) return refuse('RUNTIME_NOT_READY')
    return this.parse(text(128, 1), label)
  }
  updatePreferences(input: Input<'preferences.update'>) {
    const value = this.parse(dto.PreferencesDelta, input)
    return this.transaction('preferences', () => {
      const next = dto.UiPreferences.parse({ ...this.preferences(), ...value })
      this.run(
        "INSERT INTO ui_preferences VALUES('display',1,?,?) ON CONFLICT(preference_scope) DO UPDATE SET safe_json=excluded.safe_json,updated_at=excluded.updated_at",
        canonicalJson(next),
        this.timestamp()
      )
      return next
    })
  }
  saveDock(scope: Scope, input: Input<'conversations.saveDockState'>) {
    const value = this.parse(IPC['conversations.saveDockState'].input, input)
    return this.transaction('dock', () => {
      this.conversation(scope, value.conversationId)
      const receipt = this.receipt('conversations.saveDockState', scope, value)
      if (receipt.previous) return dto.ChatDockStateView.parse(receipt.previous)
      const d = value.dockState
      this.run(
        'INSERT INTO conversation_dock_state VALUES(?,?,?,?,?,?) ON CONFLICT(conversation_id) DO UPDATE SET visible=excluded.visible,primary_tab=excluded.primary_tab,terminal_subtab=excluded.terminal_subtab,explicitly_hidden=excluded.explicitly_hidden,updated_at=excluded.updated_at',
        value.conversationId,
        +d.visible,
        d.primaryTab,
        d.terminalSubtab,
        +d.explicitlyHidden,
        this.timestamp()
      )
      const result = dto.ChatDockStateView.parse({ conversationId: value.conversationId, ...d })
      receipt.save(result, value.conversationId, 'ChatDockStateView')
      return result
    })
  }
  readDock(scope: Scope, conversationId: string) {
    this.conversation(scope, conversationId)
    const r = this.get(
      'SELECT * FROM conversation_dock_state WHERE conversation_id=?',
      conversationId
    )
    return r
      ? dto.ChatDockStateView.parse({
          conversationId,
          visible: !!r.visible,
          primaryTab: r.primary_tab,
          terminalSubtab: r.terminal_subtab,
          explicitlyHidden: !!r.explicitly_hidden
        })
      : null
  }

  commitEvent(scope: Scope, input: unknown, evidence: unknown) {
    const proof = this.parse(
      object({
        ref: ID,
        taskId: ID,
        workspaceKey: text(128, 1),
        processSessionRef: ID,
        role: z.literal('coding_task')
      }),
      evidence
    )
    if (this.policy.evidence?.('event', proof) !== true) refuse('NOT_AUTHORIZED')
    let frame: ReturnType<typeof validateWire>
    try {
      frame = validateWire(input)
    } catch {
      return refuse('BAD_INPUT')
    }
    if (frame.type !== 'event') return refuse('BAD_INPUT')
    const body = frame.payload,
      data = body.data,
      taskId = data.task_id
    const digest = sha256(canonicalJson(body))
    const result = this.transaction('T4', () => {
      const task = this.task(scope, taskId)
      if (
        proof.taskId !== taskId ||
        proof.workspaceKey !== scope.workspaceKey ||
        task.state === 'queued' ||
        task.cleanup_state.startsWith('verified_')
      )
        refuse('NOT_AUTHORIZED')
      const session = this.get(
        'SELECT process_session_ref FROM task_events WHERE task_id=? LIMIT 1',
        taskId
      )
      if (session && session.process_session_ref !== proof.processSessionRef)
        refuse('NOT_AUTHORIZED')
      const duplicates = this.all(
        'SELECT * FROM task_events WHERE task_id=? AND (sequence=? OR event_id=?)',
        taskId,
        data.sequence,
        data.event_id
      )
      if (
        duplicates.length === 1 &&
        duplicates[0].sequence === data.sequence &&
        duplicates[0].event_id === data.event_id &&
        duplicates[0].payload_sha256 === digest
      )
        return { inserted: false, conflict: false }
      const previousTerminal = this.get(
        "SELECT sequence FROM task_events WHERE task_id=? AND name IN ('task.completed','task.failed','task.cancelled')",
        taskId
      )
      const isTerminal = ['task.completed', 'task.failed', 'task.cancelled'].includes(body.name)
      if (
        duplicates.length ||
        (previousTerminal && (isTerminal || data.sequence > previousTerminal.sequence)) ||
        (body.name === 'task.started' && data.sequence !== 1) ||
        (data.sequence === 1 && body.name !== 'task.started')
      ) {
        this.run(
          "UPDATE task_event_streams SET integrity_status='conflict',last_incident_code='EVENT_CONFLICT',last_incident_at=? WHERE task_id=?",
          this.timestamp(),
          taskId
        )
        this.run(
          "UPDATE tasks SET state='needs_reconciliation',cleanup_state='blocked',updated_at=? WHERE task_id=?",
          this.timestamp(),
          taskId
        )
        this.run("UPDATE workspace_writer_leases SET lease_state='blocked' WHERE task_id=?", taskId)
        return { inserted: false, conflict: true }
      }
      if (!this.get('SELECT task_id FROM workspace_writer_leases WHERE task_id=?', taskId))
        refuse('TASK_UNKNOWN')
      this.run(
        'INSERT INTO task_events VALUES(?,?,?,?,?,?,?,?)',
        taskId,
        data.sequence,
        data.event_id,
        proof.processSessionRef,
        body.name,
        canonicalJson(frame),
        digest,
        this.timestamp()
      )
      const stream = this.get('SELECT * FROM task_event_streams WHERE task_id=?', taskId)!
      const first = this.get(
        'SELECT sequence FROM task_events WHERE task_id=? AND sequence=1',
        taskId
      )
      const missing = first
        ? (this.get(
            'SELECT min(e.sequence+1) AS n FROM task_events e WHERE e.task_id=? AND NOT EXISTS(SELECT 1 FROM task_events next WHERE next.task_id=e.task_id AND next.sequence=e.sequence+1)',
            taskId
          )!.n as number)
        : 1
      const through = missing - 1
      const max = Math.max(stream.max_seen as number, data.sequence),
        gap = max > through,
        status = stream.integrity_status === 'conflict' ? 'conflict' : gap ? 'gap' : 'complete'
      this.run(
        'UPDATE task_event_streams SET complete_through=?,max_seen=?,integrity_status=?,last_incident_code=?,last_incident_at=? WHERE task_id=?',
        through,
        max,
        status,
        status === 'conflict' ? stream.last_incident_code : gap ? 'EVENT_GAP' : null,
        status === 'conflict' ? stream.last_incident_at : gap ? this.timestamp() : null,
        taskId
      )
      if (isTerminal) {
        const outcome = 'outcome' in data ? canonicalJson(data.outcome) : null
        this.run(
          "UPDATE tasks SET state='needs_reconciliation',engine_outcome_json=?,cleanup_state='blocked',updated_at=? WHERE task_id=?",
          outcome,
          this.timestamp(),
          taskId
        )
        this.run("UPDATE workspace_writer_leases SET lease_state='blocked' WHERE task_id=?", taskId)
      } else if (
        body.name === 'task.started' &&
        !terminal.has(task.state) &&
        task.state !== 'needs_reconciliation' &&
        task.state !== 'cancel_requested'
      )
        this.run(
          "UPDATE tasks SET state='running',updated_at=? WHERE task_id=?",
          this.timestamp(),
          taskId
        )
      if (status !== 'complete')
        this.run(
          "UPDATE tasks SET state='needs_reconciliation',cleanup_state='blocked',updated_at=? WHERE task_id=?",
          this.timestamp(),
          taskId
        )
      return { inserted: true, conflict: false }
    })
    if (result.conflict) refuse('TASK_UNKNOWN')
    if (result.inserted) {
      this.hint('task', taskId, { type: 'TaskEventCommitted', taskId, sequence: data.sequence })
      this.hint('task', taskId, { type: 'TaskStateChanged', task: this.readTask(scope, taskId) })
    }
    return { inserted: result.inserted, digest }
  }
  issueAttempt(scope: Scope, userMessageId: string, input: unknown, proof: unknown) {
    this.evidence('attempt', proof)
    const value = this.parse(
      object({ providerKey: text(128, 1), processSessionRef: ID, retryOf: ID.nullable() }),
      input
    )
    return this.transaction('T5.issue', () => {
      const turn =
        this.get(
          'SELECT * FROM discussion_turns WHERE user_message_id=?',
          this.parse(ID, userMessageId)
        ) ?? refuse('NOT_FOUND')
      this.conversation(scope, turn.conversation_id)
      const model = this.policy.model?.(turn.model_id)
      if (!model || model.modelId !== turn.model_id || model.providerKey !== value.providerKey)
        refuse('MODEL_UNAVAILABLE')
      if (value.retryOf) {
        this.evidence('explicit_attempt_retry', proof)
        const previous = this.get(
          'SELECT * FROM discussion_attempts WHERE attempt_id=? AND user_message_id=?',
          value.retryOf,
          userMessageId
        )
        if (!previous || !['failed', 'unknown'].includes(previous.status)) refuse('BAD_INPUT')
      } else if (
        turn.status !== 'pending' ||
        this.get(
          'SELECT attempt_id FROM discussion_attempts WHERE user_message_id=?',
          userMessageId
        )
      )
        refuse('BAD_INPUT')
      const aid = newMessageId()
      this.run(
        "INSERT INTO discussion_attempts VALUES(?,?,?,?,?,'issued',?,NULL,?)",
        aid,
        userMessageId,
        turn.model_id,
        value.providerKey,
        value.processSessionRef,
        this.timestamp(),
        value.retryOf
      )
      this.run(
        "UPDATE discussion_turns SET status='issued',issued_at=?,last_error_code=NULL WHERE user_message_id=?",
        this.timestamp(),
        userMessageId
      )
      return aid
    })
  }
  finishAttempt(
    scope: Scope,
    attemptId: string,
    sessionRef: string,
    result: unknown,
    proof: unknown
  ) {
    this.evidence('discussion_result', proof)
    const value = this.parse(
      z.union([
        object({ ok: z.literal(true), result: responseResults['discussion.send'] }),
        object({ ok: z.literal(false), code: dto.UiErrorCode, ambiguous: z.boolean() })
      ]),
      result
    )
    const cid = this.transaction('T5.result', () => {
      const a =
        this.get(
          'SELECT a.*,t.conversation_id,t.status AS turn_status FROM discussion_attempts a JOIN discussion_turns t ON t.user_message_id=a.user_message_id WHERE a.attempt_id=?',
          this.parse(ID, attemptId)
        ) ?? refuse('NOT_FOUND')
      this.conversation(scope, a.conversation_id)
      if (
        a.process_session_ref !== sessionRef ||
        a.status !== 'issued' ||
        a.turn_status !== 'issued'
      )
        refuse('NOT_AUTHORIZED')
      let reply: string | null = null
      if (value.ok) {
        reply = newMessageId()
        this.run(
          "INSERT INTO messages(message_id,conversation_id,role,content,created_at,delivery_state,selected_model_id) VALUES(?,?,'assistant',?,?,'persisted',NULL)",
          reply,
          a.conversation_id,
          value.result.answer,
          this.timestamp()
        )
        if (value.result.summary_candidates.length) this.evidence('context_budget_summary', proof)
        for (const summary of value.result.summary_candidates)
          this.insertSummary(scope, a.conversation_id, summary.text, summary.source_message_ids)
        // decision_candidates remain bounded ephemeral suggestions under C02-C01.
        if (value.result.task_proposal) {
          const p = value.result.task_proposal
          this.project(scope, true)
          const pid = newMessageId()
          this.run(
            "INSERT INTO task_proposals VALUES(?,?,?,?,?,?,?,'available',NULL)",
            pid,
            a.conversation_id,
            scope.projectId,
            scope.workspaceKey,
            p.goal,
            this.timestamp(),
            new Date(this.now() + 900000).toISOString()
          )
        }
      }
      const status = value.ok ? 'completed' : value.ambiguous ? 'unknown' : 'failed'
      this.run(
        'UPDATE discussion_attempts SET status=?,finished_at=? WHERE attempt_id=?',
        status,
        this.timestamp(),
        attemptId
      )
      this.run(
        'UPDATE discussion_turns SET status=?,reply_message_id=?,last_error_code=? WHERE user_message_id=?',
        value.ok ? 'answered' : status,
        reply,
        value.ok ? null : value.code,
        a.user_message_id
      )
      this.run(
        'UPDATE conversations SET updated_at=?,context_revision=context_revision+1 WHERE conversation_id=?',
        this.timestamp(),
        a.conversation_id
      )
      return a.conversation_id as string
    })
    this.changed(cid)
  }
  private insertSummary(
    scope: Scope,
    conversationId: string,
    body: string,
    sources: string[]
  ): string {
    this.conversation(scope, conversationId)
    this.parse(text(2048, 1), body)
    if (!sources.length || sources.length > 100 || new Set(sources).size !== sources.length)
      refuse('BAD_INPUT')
    for (const source of sources)
      if (
        !this.get(
          'SELECT message_id FROM messages WHERE message_id=? AND conversation_id=?',
          this.parse(ID, source),
          conversationId
        )
      )
        refuse('NOT_AUTHORIZED')
    const id = newMessageId()
    this.run(
      "INSERT INTO memory_summaries VALUES(?,?,?,?,'derived')",
      id,
      conversationId,
      body,
      this.timestamp()
    )
    for (const source of sources) this.run('INSERT INTO summary_sources VALUES(?,?)', id, source)
    return id
  }
  addSummary(
    scope: Scope,
    conversationId: string,
    body: string,
    sources: string[],
    proof: unknown
  ) {
    this.evidence('context_budget_summary', proof)
    return this.transaction('T5.summary', () => {
      const id = this.insertSummary(scope, conversationId, body, sources)
      this.run(
        'UPDATE conversations SET context_revision=context_revision+1,updated_at=? WHERE conversation_id=?',
        this.timestamp(),
        conversationId
      )
      return id
    })
  }
  approveDecision(
    scope: Scope,
    conversationId: string,
    decision: string,
    approvalMessageId: string,
    proof: unknown
  ) {
    this.evidence('decision', proof)
    this.parse(text(2048, 1), decision)
    return this.transaction('T5.decision', () => {
      this.conversation(scope, conversationId)
      const message = this.get(
        "SELECT * FROM messages WHERE message_id=? AND conversation_id=? AND role='user'",
        this.parse(ID, approvalMessageId),
        conversationId
      )
      // Conservative explicit utterance grammar; ambiguous prose is never an
      // approval. Broader interpretation requires a separately verified policy.
      if (!message || ![`I approve: ${decision}`, `أوافق: ${decision}`].includes(message.content))
        refuse('NOT_AUTHORIZED')
      const id = newMessageId()
      this.run(
        'INSERT INTO approved_decisions VALUES(?,?,?,?,?)',
        id,
        conversationId,
        decision,
        approvalMessageId,
        this.timestamp()
      )
      this.run(
        'UPDATE conversations SET context_revision=context_revision+1,updated_at=? WHERE conversation_id=?',
        this.timestamp(),
        conversationId
      )
      return id
    })
  }
  createChallenge(scope: Scope, input: unknown, proof: unknown) {
    this.evidence('disclosure', proof)
    const v = this.parse(
      object({
        providerKey: text(128, 1),
        disclosureClass: text(128, 1),
        scopeDescription: text(2048, 1)
      }),
      input
    )
    return this.transaction('challenge', () => {
      this.project(scope, true)
      const id = newMessageId()
      this.run(
        "INSERT INTO disclosure_challenges VALUES(?,?,?,?,?,?,'pending',?,?,NULL)",
        id,
        scope.projectId,
        scope.workspaceKey,
        v.providerKey,
        v.disclosureClass,
        v.scopeDescription,
        this.timestamp(),
        new Date(this.now() + 900000).toISOString()
      )
      return id
    })
  }
  respondDisclosure(
    scope: Scope,
    input: Input<'disclosures.respond'>,
    binding: { providerKey: string; disclosureClass: string },
    proof: unknown
  ) {
    this.evidence('consent_response', proof)
    const v = this.parse(IPC['disclosures.respond'].input, input)
    return this.transaction('T6.respond', () => {
      this.project(scope)
      const receipt = this.receipt('disclosures.respond', scope, v)
      const challenge =
        this.get(
          'SELECT * FROM disclosure_challenges WHERE challenge_id=? AND project_id=? AND workspace_key=?',
          v.challengeId,
          scope.projectId,
          scope.workspaceKey
        ) ?? refuse('NOT_AUTHORIZED')
      if (
        challenge.effective_provider_key !== binding.providerKey ||
        challenge.disclosure_class !== binding.disclosureClass
      )
        refuse('NOT_AUTHORIZED')
      if (receipt.previous) return dto.DisclosureDecisionView.parse(receipt.previous)
      this.project(scope, true)
      if (
        challenge.state !== 'pending' ||
        challenge.expires_at <= this.timestamp() ||
        challenge.issued_at > this.timestamp()
      )
        refuse('NOT_AUTHORIZED')
      const granted = v.decision === 'approve',
        id = granted ? newMessageId() : undefined
      this.run(
        'UPDATE disclosure_challenges SET state=?,decided_at=? WHERE challenge_id=?',
        granted ? 'approved' : 'denied',
        this.timestamp(),
        v.challengeId
      )
      if (id)
        this.run(
          "INSERT INTO disclosure_consents VALUES(?,?,?,?,?,?,'granted',?,NULL)",
          id,
          v.challengeId,
          scope.projectId,
          scope.workspaceKey,
          binding.providerKey,
          binding.disclosureClass,
          this.timestamp()
        )
      const result = dto.DisclosureDecisionView.parse({
        challengeId: v.challengeId,
        ...(id ? { consentId: id } : {}),
        status: granted ? 'granted' : 'denied'
      })
      receipt.save(result, id ?? v.challengeId, 'DisclosureDecisionView')
      return result
    })
  }
  revokeDisclosure(scope: Scope, input: Input<'disclosures.revoke'>, proof: unknown) {
    this.evidence('consent_response', proof)
    const v = this.parse(IPC['disclosures.revoke'].input, input)
    return this.transaction('T6.revoke', () => {
      this.project(scope)
      const receipt = this.receipt('disclosures.revoke', scope, v)
      if (receipt.previous) return dto.DisclosureDecisionView.parse(receipt.previous)
      const c =
        this.get(
          'SELECT * FROM disclosure_consents WHERE consent_id=? AND project_id=? AND workspace_key=?',
          v.consentId,
          scope.projectId,
          scope.workspaceKey
        ) ?? refuse('NOT_AUTHORIZED')
      if (c.status === 'granted')
        this.run(
          "UPDATE disclosure_consents SET status='revoked',revoked_at=? WHERE consent_id=?",
          this.timestamp(),
          v.consentId
        )
      const result = dto.DisclosureDecisionView.parse({
        consentId: v.consentId,
        challengeId: c.challenge_id,
        status: 'revoked'
      })
      receipt.save(result, c.consent_id, 'DisclosureDecisionView')
      return result
    })
  }
  hasConsent(scope: Scope, providerKey: string, disclosureClass: string) {
    this.project(scope)
    return !!this.get(
      "SELECT consent_id FROM disclosure_consents WHERE project_id=? AND workspace_key=? AND effective_provider_key=? AND disclosure_class=? AND status='granted' LIMIT 1",
      scope.projectId,
      scope.workspaceKey,
      providerKey,
      disclosureClass
    )
  }
  createInspection(scope: Scope, conversationId: string, proof: unknown) {
    this.evidence('inspection', proof)
    return this.transaction('inspection', () => {
      this.conversation(scope, conversationId)
      const id = newMessageId()
      this.run(
        "INSERT INTO project_inspections VALUES(?,?,?,'not_started',NULL,0,0,'Coverage not yet established.',0,?)",
        id,
        conversationId,
        scope.projectId,
        this.timestamp()
      )
      return id
    })
  }
  observeInspection(scope: Scope, inspectionId: string, input: unknown, proof: unknown) {
    this.evidence('inspection_observation', proof)
    const digest = z.string().regex(/^[a-f0-9]{64}$/)
    const v = this.parse(
      object({
        observationKey: digest,
        kind: z.enum(['discovered_file', 'read_file', 'excluded_page']),
        subjectKey: digest.nullable(),
        evidenceDigest: digest,
        countDelta: UInt.max(100),
        discoveryCountKnown: z.boolean(),
        state: dto.ProjectInspectionView.shape.state,
        coverageNote: text(2048)
      }),
      input
    )
    return this.transaction('inspection.observation', () => {
      this.project(scope)
      const i =
        this.get(
          'SELECT * FROM project_inspections WHERE inspection_id=? AND project_id=?',
          this.parse(ID, inspectionId),
          scope.projectId
        ) ?? refuse('NOT_AUTHORIZED')
      if (
        (v.kind === 'excluded_page') !== (v.subjectKey === null) ||
        (v.kind !== 'excluded_page' && v.countDelta !== 1)
      )
        refuse('BAD_INPUT')
      const existing = this.all(
        'SELECT * FROM inspection_observations WHERE inspection_id=? AND (observation_key=? OR (observation_kind=? AND subject_key=? AND subject_key IS NOT NULL))',
        inspectionId,
        v.observationKey,
        v.kind,
        v.subjectKey
      )
      if (existing.length) {
        if (
          existing.length !== 1 ||
          existing[0].evidence_digest !== v.evidenceDigest ||
          existing[0].observation_kind !== v.kind ||
          existing[0].subject_key !== v.subjectKey ||
          existing[0].count_delta !== v.countDelta
        )
          refuse('BAD_INPUT')
        return false
      }
      this.run(
        'INSERT INTO inspection_observations VALUES(?,?,?,?,?,?,?)',
        inspectionId,
        v.observationKey,
        v.kind,
        v.subjectKey,
        v.evidenceDigest,
        v.countDelta,
        this.timestamp()
      )
      const count = (kind: string) =>
        this.get(
          'SELECT coalesce(sum(count_delta),0) AS n FROM inspection_observations WHERE inspection_id=? AND observation_kind=?',
          inspectionId,
          kind
        )!.n as number
      this.run(
        'UPDATE project_inspections SET state=?,discovered_count=?,actually_read_count=?,excluded_count=?,coverage_note=?,evidence_revision=evidence_revision+1,updated_at=? WHERE inspection_id=?',
        v.state,
        v.discoveryCountKnown ? count('discovered_file') : i.discovered_count,
        count('read_file'),
        count('excluded_page'),
        v.coverageNote,
        this.timestamp(),
        inspectionId
      )
      return true
    })
  }

  private paging(scope: string, cursor: string | undefined, limit = 40) {
    this.parse(dto.PageLimit, limit)
    const scopeHash = sha256(scope).slice(0, 32)
    if (!cursor) return { after: 0, limit, scopeHash }
    this.parse(Cursor, cursor)
    try {
      const parts = cursor.split('.')
      if (parts.length !== 2) refuse('BAD_INPUT')
      const expected = createHmac('sha256', this.cursorKey)
        .update(parts[0])
        .digest()
        .subarray(0, 16)
      const supplied = Buffer.from(parts[1], 'base64url')
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
        refuse('BAD_INPUT')
      const decoded = this.parse(
        object({ n: UInt, s: z.string(), e: UInt }),
        JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
      )
      if (decoded.s !== scopeHash || decoded.e < this.now()) refuse('BAD_INPUT')
      return { after: decoded.n, limit, scopeHash }
    } catch {
      return refuse('BAD_INPUT')
    }
  }
  private cursor(scopeHash: string, n: number) {
    const value = Buffer.from(JSON.stringify({ n, s: scopeHash, e: this.now() + 900000 })).toString(
      'base64url'
    )
    const signature = createHmac('sha256', this.cursorKey)
      .update(value)
      .digest()
      .subarray(0, 16)
      .toString('base64url')
    return this.parse(Cursor, value + '.' + signature)
  }
  projects() {
    return this.all('SELECT * FROM projects ORDER BY last_opened_at DESC,project_id LIMIT 40').map(
      (r) =>
        dto.ProjectSummary.parse({
          projectId: r.project_id,
          displayName: r.display_name,
          canonicalPathLabel: r.canonical_root,
          available: !!r.available
        })
    )
  }
  private summary(c: Row) {
    const last = this.get(
      'SELECT created_at FROM messages WHERE conversation_id=? ORDER BY message_ordinal DESC LIMIT 1',
      c.conversation_id
    )
    const task = this.get(
      'SELECT state FROM tasks WHERE conversation_id=? ORDER BY admission_order DESC LIMIT 1',
      c.conversation_id
    )
    return dto.ConversationSummary.parse({
      conversationId: c.conversation_id,
      projectId: c.project_id,
      title: c.title,
      lastMessageAt: last?.created_at ?? null,
      taskStatusSummary: task?.state ?? null
    })
  }
  listConversations(scope: Scope, cursor?: string, limit?: number) {
    this.project(scope)
    const p = this.paging('conversations:' + canonicalJson(scope), cursor, limit)
    // Conversations have no frozen physical ordinal. Cursor position is an
    // offset within a deterministic created_at/ID ordering, not a snapshot claim.
    return this.snapshot(() => {
      const rows = this.all(
        'SELECT * FROM conversations WHERE project_id=? ORDER BY created_at,conversation_id LIMIT ? OFFSET ?',
        scope.projectId,
        p.limit + 1,
        p.after
      )
      return dto.ConversationSummaryPage.parse({
        conversations: rows.slice(0, p.limit).map((r) => this.summary(r)),
        nextCursor: rows.length > p.limit ? this.cursor(p.scopeHash, p.after + p.limit) : null
      })
    })
  }
  readConversation(scope: Scope, conversationId: string, cursor?: string, limit?: number) {
    const p = this.paging('messages:' + canonicalJson(scope) + ':' + conversationId, cursor, limit)
    return this.snapshot(() => {
      const c = this.conversation(scope, conversationId)
      const rows = this.all(
          'SELECT * FROM messages WHERE conversation_id=? AND message_ordinal>? ORDER BY message_ordinal LIMIT ?',
          conversationId,
          p.after,
          p.limit + 1
        ),
        page = rows.slice(0, p.limit)
      const messages = page.map((m) =>
        dto.MessageView.parse({
          messageId: m.message_id,
          role: m.role,
          text: m.content,
          deliveryState: m.delivery_state,
          createdAt: m.created_at
        })
      )
      const turns = page
        .filter((m) => m.role === 'user')
        .flatMap((m) => {
          const t = this.get(
            'SELECT * FROM discussion_turns WHERE user_message_id=? AND conversation_id=?',
            m.message_id,
            conversationId
          )
          if (!t) return []
          const attempts = this.all(
            'SELECT * FROM discussion_attempts WHERE user_message_id=? LIMIT 101',
            m.message_id
          )
          const leaves = attempts.filter(
            (a) => !attempts.some((b) => b.retry_of_attempt_id === a.attempt_id)
          )
          let latest = attempts.length <= 100 && leaves.length === 1 ? leaves[0] : null
          if (latest) {
            const visited = new Set<string>()
            let current: Row | undefined = latest
            while (current) {
              if (
                visited.has(current.attempt_id) ||
                current.user_message_id !== t.user_message_id ||
                current.model_id !== t.model_id
              ) {
                latest = null
                break
              }
              visited.add(current.attempt_id)
              current = current.retry_of_attempt_id
                ? attempts.find((a) => a.attempt_id === current!.retry_of_attempt_id)
                : undefined
            }
            if (visited.size !== attempts.length) latest = null
          }
          return [
            dto.DiscussionTurnReadV1.parse({
              userMessageId: t.user_message_id,
              modelId: t.model_id,
              status: t.status,
              lastErrorCode: dto.UiErrorCode.safeParse(t.last_error_code).success
                ? t.last_error_code
                : null,
              lastAttempt: latest
                ? {
                    attemptId: latest.attempt_id,
                    modelId: latest.model_id,
                    status: latest.status,
                    issuedAt: latest.issued_at,
                    finishedAt: latest.finished_at,
                    isRetry: latest.retry_of_attempt_id !== null
                  }
                : null
            })
          ]
        })
      const proposals = this.all(
        "SELECT * FROM task_proposals WHERE conversation_id=? AND project_id=? AND canonical_workspace_key=? AND state='available' AND consumed_task_id IS NULL AND issued_at<=? AND expires_at>? ORDER BY issued_at DESC,proposal_id DESC LIMIT 41",
        conversationId,
        scope.projectId,
        scope.workspaceKey,
        this.timestamp(),
        this.timestamp()
      )
      const inspection = this.get(
        'SELECT * FROM project_inspections WHERE conversation_id=? AND project_id=? ORDER BY updated_at DESC,inspection_id DESC LIMIT 1',
        conversationId,
        scope.projectId
      )
      const challenges = this.all(
        "SELECT * FROM disclosure_challenges WHERE project_id=? AND workspace_key=? AND state='pending' AND expires_at>? ORDER BY issued_at DESC,challenge_id LIMIT 100",
        scope.projectId,
        scope.workspaceKey,
        this.timestamp()
      )
      return dto.ConversationViewPage.parse({
        conversation: this.summary(c),
        messages,
        tasks: this.all(
          'SELECT * FROM tasks WHERE conversation_id=? ORDER BY admission_order LIMIT 100',
          conversationId
        ).map((t) => this.taskSummary(t)),
        nextCursor:
          rows.length > p.limit
            ? this.cursor(p.scopeHash, page[page.length - 1].message_ordinal)
            : null,
        inspectionStatus: inspection
          ? {
              conversationId,
              state: inspection.state,
              ...(inspection.discovered_count === null
                ? {}
                : { discoveredCount: inspection.discovered_count }),
              actuallyReadCount: inspection.actually_read_count,
              excludedCount: inspection.excluded_count,
              coverageNote: inspection.coverage_note,
              updatedAt: inspection.updated_at
            }
          : null,
        disclosureChallenges: challenges.map((ch) => ({
          challengeId: ch.challenge_id,
          projectId: ch.project_id,
          providerLabel: this.providerLabel(ch.effective_provider_key),
          disclosureClass: ch.disclosure_class,
          status: 'pending',
          scopeDescription: ch.scope_description
        })),
        availableProposals: proposals.slice(0, 40).map((pr) => ({
          proposalId: pr.proposal_id,
          projectId: pr.project_id,
          conversationId: pr.conversation_id,
          exactGoal: pr.exact_goal,
          issuedAt: pr.issued_at,
          expiresAt: pr.expires_at,
          state: 'available'
        })),
        availableProposalsTruncated: proposals.length > 40,
        discussionTurns: turns
      })
    })
  }
  private taskSummary(t: Row) {
    return dto.TaskSummary.parse({
      taskId: t.task_id,
      conversationId: t.conversation_id,
      projectId: t.project_id,
      state: t.state
    })
  }
  readTask(scope: Scope, taskId: string) {
    const t = this.task(scope, taskId)
    return dto.TaskView.parse({
      ...this.taskSummary(t),
      outcome: t.engine_outcome_json === null ? null : JSON.parse(t.engine_outcome_json)
    })
  }
  listTasks(scope: Scope, conversationId?: string, cursor?: string, limit?: number) {
    this.project(scope)
    if (conversationId) this.conversation(scope, conversationId)
    const p = this.paging(
      'tasks:' + canonicalJson(scope) + ':' + (conversationId ?? ''),
      cursor,
      limit
    )
    const rows = conversationId
      ? this.all(
          'SELECT * FROM tasks WHERE project_id=? AND conversation_id=? AND admission_order>? ORDER BY admission_order LIMIT ?',
          scope.projectId,
          conversationId,
          p.after,
          p.limit + 1
        )
      : this.all(
          'SELECT * FROM tasks WHERE project_id=? AND admission_order>? ORDER BY admission_order LIMIT ?',
          scope.projectId,
          p.after,
          p.limit + 1
        )
    return dto.TaskSummaryPage.parse({
      tasks: rows.slice(0, p.limit).map((t) => this.taskSummary(t)),
      nextCursor:
        rows.length > p.limit ? this.cursor(p.scopeHash, rows[p.limit - 1].admission_order) : null
    })
  }
  readEvents(scope: Scope, input: Input<'tasks.readEvents'>) {
    const v = this.parse(IPC['tasks.readEvents'].input, input)
    return this.snapshot(() => {
      const t = this.task(scope, v.taskId),
        s =
          this.get('SELECT * FROM task_event_streams WHERE task_id=?', v.taskId) ??
          refuse('DATABASE_UNAVAILABLE')
      const rows = this.all(
        'SELECT * FROM task_events WHERE task_id=? AND sequence>? ORDER BY sequence LIMIT ?',
        v.taskId,
        v.afterSequence,
        v.limit
      )
      const events = rows.map((r) => {
        const event = validateWire(JSON.parse(r.wire_payload_json))
        if (
          event.type !== 'event' ||
          event.payload.data.task_id !== v.taskId ||
          event.payload.data.sequence !== r.sequence ||
          sha256(canonicalJson(event.payload)) !== r.payload_sha256
        )
          refuse('DATABASE_UNAVAILABLE')
        return event
      })
      return dto.TaskEventPage.parse({
        taskId: v.taskId,
        events,
        nextSequence: rows.length ? rows[rows.length - 1].sequence : v.afterSequence,
        completeThrough: s.complete_through,
        hasGap: s.max_seen > s.complete_through,
        stateIsCertain: s.integrity_status === 'complete' && t.cleanup_state.startsWith('verified_')
      })
    })
  }
  listDisclosures(scope: Scope) {
    this.project(scope)
    return this.all(
      'SELECT * FROM disclosure_consents WHERE project_id=? AND workspace_key=? ORDER BY granted_at DESC,consent_id LIMIT 40',
      scope.projectId,
      scope.workspaceKey
    ).map((r) =>
      dto.DisclosureConsentSummary.parse({
        consentId: r.consent_id,
        projectId: r.project_id,
        providerLabel: this.providerLabel(r.effective_provider_key),
        disclosureClass: r.disclosure_class,
        status: r.status,
        updatedAt: r.revoked_at ?? r.granted_at
      })
    )
  }
  context(scope: Scope, conversationId: string) {
    return this.snapshot(() => {
      const c = this.conversation(scope, conversationId)
      const messages = this.all(
        'SELECT message_id,role,content FROM messages WHERE conversation_id=? ORDER BY message_ordinal DESC LIMIT 20',
        conversationId
      )
        .reverse()
        .map((m) => ({ message_id: m.message_id, role: m.role, text: m.content }))
      const summaries = this.all(
        "SELECT * FROM memory_summaries WHERE conversation_id=? AND provenance_status='derived' ORDER BY created_at DESC,summary_id DESC LIMIT 10",
        conversationId
      ).map((s) => ({
        summary_id: s.summary_id,
        text: s.body,
        source_message_ids: this.all(
          'SELECT source_message_id FROM summary_sources WHERE summary_id=? ORDER BY source_message_id',
          s.summary_id
        ).map((r) => r.source_message_id)
      }))
      const decisions = this.all(
        'SELECT * FROM approved_decisions WHERE conversation_id=? ORDER BY confirmed_at DESC,decision_id DESC LIMIT 20',
        conversationId
      ).map((d) => ({
        decision_id: d.decision_id,
        text: d.decision_text,
        approval_message_id: d.approval_message_id
      }))
      // Omit complete oldest optional entries until within the wire budget;
      // never clip user text or treat an omitted source as an approval.
      const value = {
        recent_messages: messages,
        summaries,
        decisions,
        context_revision: c.context_revision
      }
      while (!ContextV1.safeParse(value).success) {
        if (value.recent_messages.length) value.recent_messages.shift()
        else if (value.summaries.length) value.summaries.pop()
        else if (value.decisions.length) value.decisions.pop()
        else refuse('RESOURCE_LIMIT')
      }
      return ContextV1.parse(value)
    })
  }
  bootstrap() {
    return dto.BootstrapView.parse({
      selectedProject: null,
      selectedConversationId: null,
      discussionModelId: this.discussionPreference(),
      runtimeStatus: 'not_ready',
      activeTaskSummaries: this.all(
        "SELECT * FROM tasks WHERE state IN ('queued','starting','running','cancel_requested','unknown','needs_reconciliation') AND cleanup_state NOT LIKE 'verified_%' ORDER BY admission_order LIMIT 21"
      ).map((t) => this.taskSummary(t)),
      uiPreferences: this.preferences()
    })
  }
}
