// @vitest-environment node
import { test, expect } from 'vitest'
import { CodingService, type CodingBackend } from '../../electron/main/coding/service'
import { fixture, proof, sendInput, inspect, event, session } from '../fixtures/storage'

function setup(
  options: {
    ready?: boolean
    fault?: (operation: string) => void
    start?: () => void | Promise<void>
    cancel?: () => void
  } = {}
) {
  const f = fixture({ fault: options.fault }),
    message = f.store.sendMessage(f.scope, sendInput())
  const proposals = () =>
    f.store.createProposal(
      f.scope,
      message.conversationId,
      'Exact synthetic goal, never executed',
      proof
    )
  const starts: string[] = [],
    cancels: string[] = []
  const backend: CodingBackend = {
    requireReady: () => {
      if (options.ready === false) throw new Error('Fixture engine gate unavailable')
    },
    start: async (_scope, id) => {
      expect(
        inspect(f.store).prepare('SELECT count(*) n FROM tasks WHERE task_id=?').get(id)!.n
      ).toBe(1)
      starts.push(id)
      await options.start?.()
    },
    cancelRegistered: (_scope, id) => {
      expect(
        inspect(f.store).prepare('SELECT cancel_request_ref FROM tasks WHERE task_id=?').get(id)!
          .cancel_request_ref
      ).toBeTruthy()
      cancels.push(id)
      options.cancel?.()
    }
  }
  const coding = new CodingService({
    store: f.store,
    proof,
    scope: () => f.scope,
    verify: async (_scope, work) => work(),
    backend
  })
  return {
    ...f,
    message,
    proposals,
    coding,
    starts,
    cancels,
    close: async () => {
      await coding.idle()
      coding.close()
      f.store.close()
    }
  }
}
test('P7-A01 default engine gate rejects production admission without consuming a real Main proposal', async () => {
  const f = setup(),
    id = f.proposals(),
    closed = new CodingService({
      store: f.store,
      proof,
      scope: () => f.scope,
      verify: async (_s, work) => work()
    })
  try {
    await expect(closed.confirm({ proposalId: id, clientMutationId: 'run' })).rejects.toThrow(
      'RUNTIME_NOT_READY'
    )
    expect(inspect(f.store).prepare('SELECT count(*) n FROM tasks').get()!.n).toBe(0)
    expect(
      inspect(f.store).prepare('SELECT state FROM task_proposals WHERE proposal_id=?').get(id)!
        .state
    ).toBe('available')
    expect(f.starts).toEqual([])
  } finally {
    await f.close()
  }
})
test('P7-A02 concurrent duplicate explicit admissions have one durable task, receipt, lease and post-COMMIT dispatch', async () => {
  const f = setup()
  try {
    const proposalId = f.proposals(),
      input = { proposalId, clientMutationId: 'same' }
    const admitted = await Promise.all(Array.from({ length: 12 }, () => f.coding.confirm(input)))
    await f.coding.idle()
    expect(new Set(admitted.map((t) => t.taskId)).size).toBe(1)
    expect(f.starts).toEqual([admitted[0].taskId])
    expect(
      inspect(f.store).prepare('SELECT count(*) n FROM workspace_writer_leases').get()!.n
    ).toBe(1)
    expect(f.coding.read(admitted[0].taskId)).toMatchObject({ state: 'starting', outcome: null })
    await expect(
      f.coding.confirm({ proposalId, clientMutationId: 'second_click' })
    ).rejects.toThrow('PROPOSAL_ALREADY_USED')
  } finally {
    await f.close()
  }
})
test('P7-A03 T2 COMMIT failure never dispatches or consumes authorization', async () => {
  const f = setup({
    fault: (op) => {
      if (op === 'T2') throw new Error('Synthetic T2 COMMIT fault')
    }
  })
  try {
    const id = f.proposals()
    await expect(f.coding.confirm({ proposalId: id, clientMutationId: 'fail' })).rejects.toThrow(
      'DATABASE_UNAVAILABLE'
    )
    expect(f.starts).toEqual([])
    expect(inspect(f.store).prepare('SELECT count(*) n FROM tasks').get()!.n).toBe(0)
    expect(
      inspect(f.store).prepare('SELECT state FROM task_proposals WHERE proposal_id=?').get(id)!
        .state
    ).toBe('available')
  } finally {
    await f.close()
  }
})
test('P7-A04 real SQLite one active +20 queued, FIFO, and never-started queue cancellation without a child command', async () => {
  const f = setup()
  try {
    const tasks = []
    for (let n = 0; n < 21; n++)
      tasks.push(
        await f.coding.confirm({ proposalId: f.proposals(), clientMutationId: 'run_' + n })
      )
    await f.coding.idle()
    expect(tasks[0].state).toBe('starting')
    expect(tasks.slice(1).every((t) => t.state === 'queued')).toBe(true)
    await expect(
      f.coding.confirm({ proposalId: f.proposals(), clientMutationId: 'overflow' })
    ).rejects.toThrow('TASK_BUSY')
    expect(f.starts).toHaveLength(1)
    expect(f.coding.cancel(tasks[1].taskId).state).toBe('requested')
    expect(f.cancels).toEqual([])
    expect(f.coding.read(tasks[1].taskId).state).toBe('cancelled')
    f.store.reconcile(f.scope, tasks[0].taskId, {
      ...proof,
      taskId: tasks[0].taskId,
      workspaceKey: f.scope.workspaceKey,
      childStopped: true,
      descendantsStopped: true,
      workspaceSafe: true,
      reason: 'interrupted'
    })
    expect(f.store.schedule(proof)).toBe(tasks[2].taskId)
    expect(inspect(f.store).prepare('SELECT count(*) n FROM task_events').get()!.n).toBe(0)
  } finally {
    await f.close()
  }
})
test('P7-A05 active cancel is durably recorded before forwarding; repeated cancel does not forward twice or imply engine cancellation', async () => {
  const f = setup()
  try {
    const task = await f.coding.confirm({ proposalId: f.proposals(), clientMutationId: 'run' })
    await f.coding.idle()
    expect(f.coding.cancel(task.taskId).state).toBe('requested')
    expect(f.coding.cancel(task.taskId).state).toBe('already_requested')
    expect(f.cancels).toEqual([task.taskId])
    expect(f.coding.read(task.taskId)).toMatchObject({ state: 'cancel_requested', outcome: null })
    expect(inspect(f.store).prepare('SELECT count(*) n FROM task_events').get()!.n).toBe(0)
    expect(
      inspect(f.store).prepare('SELECT count(*) n FROM workspace_writer_leases').get()!.n
    ).toBe(1)
  } finally {
    await f.close()
  }
})
test('P7-A06 failed launch and lost cancel route retain uncertainty and blocked writer; original receipt never auto-reexecutes', async () => {
  const f = setup({
    start: async () => {
      throw new Error('Synthetic lost launch/ACK')
    }
  })
  try {
    const input = { proposalId: f.proposals(), clientMutationId: 'run' },
      task = await f.coding.confirm(input)
    await f.coding.idle()
    expect(f.coding.read(task.taskId).state).toBe('needs_reconciliation')
    expect(await f.coding.confirm(input)).toEqual(task)
    await f.coding.idle()
    expect(f.starts).toHaveLength(1)
    expect(
      inspect(f.store).prepare('SELECT lease_state FROM workspace_writer_leases').get()!.lease_state
    ).toBe('blocked')
    const closed = new CodingService({
      store: f.store,
      proof,
      scope: () => f.scope,
      verify: async (_s, work) => work()
    })
    expect(closed.cancel(task.taskId).state).toBe('requested')
    expect(closed.read(task.taskId).state).toBe('needs_reconciliation')
  } finally {
    await f.close()
  }
})
test('P7-A07 expiry, absent and cross-project proposal IDs reject before launch', async () => {
  const f = setup()
  try {
    const id = f.proposals()
    f.advance(900001)
    await expect(f.coding.confirm({ proposalId: id, clientMutationId: 'expired' })).rejects.toThrow(
      'PROPOSAL_EXPIRED'
    )
    await expect(
      f.coding.confirm({ proposalId: 'absent', clientMutationId: 'absent' })
    ).rejects.toThrow('NOT_AUTHORIZED')
    const other = f.store.registerProject(
      { workspaceKey: 'other', canonicalRoot: 'C:/synthetic/other', displayName: 'Other fixture' },
      proof
    )
    const foreign = new CodingService({
      store: f.store,
      proof,
      scope: () => ({ projectId: other, workspaceKey: 'other' }),
      verify: async (_s, work) => work()
    })
    await expect(
      foreign.confirm({ proposalId: id, clientMutationId: 'cross_scope' })
    ).rejects.toThrow('NOT_AUTHORIZED')
    expect(f.starts).toEqual([])
  } finally {
    await f.close()
  }
})
test('P7-A08 C01 context is bounded, same-conversation, advisory and separate from the exact admitted goal', async () => {
  const f = setup()
  try {
    for (let n = 0; n < 10; n++)
      f.store.sendMessage(f.scope, {
        ...sendInput('message_' + n, 'safe ' + n),
        conversationId: f.message.conversationId
      })
    f.store.sendMessage(f.scope, sendInput('foreign', 'Foreign conversation canary'))
    const task = await f.coding.confirm({ proposalId: f.proposals(), clientMutationId: 'run' })
    const context = f.store.codingContext(f.scope, task.taskId)
    expect(context).toMatchObject({
      schema_version: 1,
      conversation_id: f.message.conversationId,
      workspace_root: 'C:/synthetic/workspace',
      prior_tasks: [],
      advisory_preferences: []
    })
    expect(context.recent_messages).toHaveLength(6)
    expect(JSON.stringify(context)).not.toContain('Foreign conversation canary')
    expect(
      inspect(f.store).prepare('SELECT exact_goal FROM tasks WHERE task_id=?').get(task.taskId)!
        .exact_goal
    ).toBe('Exact synthetic goal, never executed')
  } finally {
    await f.close()
  }
})
test('P7-A09 terminal/SQLite/cancel race preserves actual committed evidence and never releases a writer from a DTO', async () => {
  const f = setup()
  try {
    const task = await f.coding.confirm({ proposalId: f.proposals(), clientMutationId: 'run' })
    await f.coding.idle()
    f.store.commitEvent(
      f.scope,
      event(task.taskId, 'task.started', 1, { phase: 'INITIALIZING' }),
      session(task.taskId)
    )
    const outcome = {
      task_id: task.taskId,
      success: true,
      final_phase: 'COMPLETED',
      summary: 'Synthetic fixture outcome; not AgentOS evidence',
      total_ticks: 1,
      rollbacks_triggered: 0,
      final_checkpoint_hash: null
    }
    f.store.commitEvent(
      f.scope,
      event(task.taskId, 'task.completed', 2, { outcome }),
      session(task.taskId)
    )
    expect(f.coding.cancel(task.taskId).state).toBe('not_running')
    expect(f.cancels).toEqual([])
    expect(
      f.coding.events({ taskId: task.taskId, afterSequence: 0, limit: 20 }).stateIsCertain
    ).toBe(false)
    expect(
      inspect(f.store).prepare('SELECT count(*) n FROM workspace_writer_leases').get()!.n
    ).toBe(1)
  } finally {
    await f.close()
  }
})

test('P7-A10 restart or unavailable engine returns the exact historical receipt without rechecking native IO or re-executing', async () => {
  const f = setup()
  try {
    const input = { proposalId: f.proposals(), clientMutationId: 'run' },
      task = await f.coding.confirm(input)
    await f.coding.idle()
    f.store.recoverAfterRestart()
    const reopened = new CodingService({
      store: f.store,
      proof,
      scope: () => f.scope,
      verify: async () => {
        throw new Error('Must not perform new native admission')
      }
    })
    expect(await reopened.confirm(input)).toEqual(task)
    expect(f.starts).toHaveLength(1)
    expect(reopened.read(task.taskId).state).toBe('needs_reconciliation')
    expect(
      inspect(f.store).prepare('SELECT lease_state FROM workspace_writer_leases').get()!.lease_state
    ).toBe('blocked')
  } finally {
    await f.close()
  }
})

test('P7-A11 committed cancellation evidence can reconcile without inventing a TaskOutcome', async () => {
  const f = setup()
  try {
    const task = await f.coding.confirm({
      proposalId: f.proposals(),
      clientMutationId: 'cancel_cleanup'
    })
    await f.coding.idle()
    f.store.commitEvent(
      f.scope,
      event(task.taskId, 'task.started', 1, { phase: 'INITIALIZING' }),
      session(task.taskId)
    )
    f.coding.cancel(task.taskId)
    f.store.commitEvent(
      f.scope,
      event(task.taskId, 'task.cancelled', 2, {
        confirmation: 'Synthetic confirmed stop, not a provider outcome'
      }),
      session(task.taskId)
    )
    expect(f.store.terminalForCleanup(f.scope, task.taskId)).toBe('cancelled')
    f.store.reconcile(f.scope, task.taskId, {
      ...proof,
      taskId: task.taskId,
      workspaceKey: f.scope.workspaceKey,
      childStopped: true,
      descendantsStopped: true,
      workspaceSafe: true,
      reason: 'cancelled'
    })
    expect(f.coding.read(task.taskId)).toMatchObject({ state: 'cancelled', outcome: null })
    expect(
      inspect(f.store).prepare('SELECT count(*) n FROM workspace_writer_leases').get()!.n
    ).toBe(0)
  } finally {
    await f.close()
  }
})

test('P7-A12 a gapped terminal stream retains its actual recorded outcome and writer until complete', async () => {
  const f = setup()
  try {
    const task = await f.coding.confirm({
      proposalId: f.proposals(),
      clientMutationId: 'gap_cleanup'
    })
    await f.coding.idle()
    const outcome = {
      task_id: task.taskId,
      success: true,
      final_phase: 'COMPLETED',
      summary: 'Synthetic fixture outcome',
      total_ticks: 1,
      rollbacks_triggered: 0,
      final_checkpoint_hash: null
    }
    f.store.commitEvent(
      f.scope,
      event(task.taskId, 'task.started', 1, { phase: 'INITIALIZING' }),
      session(task.taskId)
    )
    f.store.commitEvent(
      f.scope,
      event(task.taskId, 'task.completed', 3, { outcome }),
      session(task.taskId)
    )
    const cleanup = {
      ...proof,
      taskId: task.taskId,
      workspaceKey: f.scope.workspaceKey,
      childStopped: true,
      descendantsStopped: true,
      workspaceSafe: true,
      reason: 'completed'
    }
    expect(f.store.terminalForCleanup(f.scope, task.taskId)).toBeNull()
    expect(() => f.store.reconcile(f.scope, task.taskId, cleanup)).toThrow('TASK_UNKNOWN')
    expect(f.coding.read(task.taskId).outcome).toEqual(outcome)
    expect(
      inspect(f.store).prepare('SELECT count(*) n FROM workspace_writer_leases').get()!.n
    ).toBe(1)
    f.store.commitEvent(
      f.scope,
      event(task.taskId, 'task.progress', 2, {
        phase: 'EXECUTING',
        detail: 'Delayed fixture evidence'
      }),
      session(task.taskId)
    )
    expect(f.store.terminalForCleanup(f.scope, task.taskId)).toBe('completed')
    expect(f.store.reconcile(f.scope, task.taskId, cleanup)).toBe(true)
  } finally {
    await f.close()
  }
})
