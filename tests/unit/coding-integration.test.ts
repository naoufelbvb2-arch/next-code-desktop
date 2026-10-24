// @vitest-environment node
import { test, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { codingEngineFixture } from '../fixtures/coding-engine'
import { waitFor } from '../fixtures/supervision'
import { event } from '../fixtures/storage'
import type { SupervisedChild } from '../../electron/main/supervisor/child'

test('P7-E01 actual AgentOS patch, C01, TaskOutcome, Main T4 and native/outer-Job T3 cleanup', async () => {
  const f = await codingEngineFixture()
  try {
    const run = await f.run()
    expect(run.task.state).toBe('starting')
    try {
      await f.wait(run.task.taskId, 'completed')
    } catch {
      throw new Error(JSON.stringify(f.status()))
    }
    expect(f.source()).toBe('def value(): return 2\n')
    const task = f.service.store.readTask(f.scope, run.task.taskId)
    expect(task.outcome).toMatchObject({
      task_id: run.task.taskId,
      success: true,
      final_phase: 'COMPLETED'
    })
    expect(Object.keys(task.outcome!)).toHaveLength(7)
    expect(f.db.prepare('SELECT count(*) n FROM workspace_writer_leases').get()!.n).toBe(0)
    expect(f.db.prepare('SELECT task_id FROM active_coding_slot').get()!.task_id).toBeNull()
    const events = f.service.store.readEvents(f.scope, {
      taskId: run.task.taskId,
      afterSequence: 0,
      limit: 100
    })
    expect(events).toMatchObject({ completeThrough: 2, hasGap: false, stateIsCertain: true })
    expect(
      f.db
        .prepare('SELECT name FROM task_events ORDER BY sequence')
        .all()
        .map((r) => r.name)
    ).toEqual(['task.started', 'task.completed'])
    const audit = JSON.parse(readFileSync(join(f.workspace, 'gateway-audit.json'), 'utf8')) as {
      prompt: string
    }[]
    expect(audit[0].prompt).toContain('Exact C01 fixture message')
    expect(audit[0].prompt).toContain(
      'Change only sample.py so value() returns 2 and verify with check.py.'
    )
    const replay = await f.service.dispatch('proposals.confirmRun', run.input)
    expect(replay).toEqual({ ok: true, data: run.task })
    expect(f.db.prepare('SELECT count(*) n FROM tasks').get()!.n).toBe(1)
  } finally {
    await f.close()
  }
}, 60000)

test('P7-E02 actual failed TaskOutcome releases only after native/Windows cleanup', async () => {
  const f = await codingEngineFixture('failed')
  try {
    const { task } = await f.run()
    await f.wait(task.taskId, 'failed')
    expect(f.service.store.readTask(f.scope, task.taskId).outcome?.success).toBe(false)
    expect(f.source()).toBe('def value(): return 1\n')
    expect(f.db.prepare('SELECT count(*) n FROM workspace_writer_leases').get()!.n).toBe(0)
  } finally {
    await f.close()
  }
}, 20000)

for (const mode of ['gateway', 'worker', 'shell'])
  test(`P7-E03-${mode} durable cancel reaches real engine and confirms actual cooperative stop`, async () => {
    const f = await codingEngineFixture(mode)
    try {
      const { task } = await f.run()
      await waitFor(() =>
        existsSync(join(f.workspace, mode === 'shell' ? 'owned.json' : 'awaiting.txt'))
      )
      if (mode === 'shell') expect(f.status().activeProcesses).toBeGreaterThanOrEqual(4)
      const cancel = await f.service.dispatch('tasks.cancel', { taskId: task.taskId })
      expect(cancel).toMatchObject({ ok: true, data: { state: 'requested' } })
      await f.wait(task.taskId, 'cancelled')
      expect(f.service.store.readTask(f.scope, task.taskId).outcome).toBeNull()
      expect(f.db.prepare('SELECT cleanup_state FROM tasks').get()!.cleanup_state).toBe(
        'verified_cancelled'
      )
      expect(f.db.prepare('SELECT count(*) n FROM workspace_writer_leases').get()!.n).toBe(0)
      expect(
        f.db.prepare("SELECT count(*) n FROM task_events WHERE name='task.cancelled'").get()!.n
      ).toBe(1)
    } finally {
      await f.close()
    }
  }, 20000)

test('P7-E04 actual engine exception preserves unknown outcome and blocked writer', async () => {
  const f = await codingEngineFixture('exception')
  try {
    const { task } = await f.run()
    await f.wait(task.taskId, 'needs_reconciliation')
    expect(f.service.store.readTask(f.scope, task.taskId).outcome).toBeNull()
    expect(f.db.prepare('SELECT lease_state FROM workspace_writer_leases').get()!.lease_state).toBe(
      'blocked'
    )
    expect(
      f.db
        .prepare(
          "SELECT count(*) n FROM task_events WHERE name IN ('task.completed','task.failed','task.cancelled')"
        )
        .get()!.n
    ).toBe(0)
  } finally {
    await f.close()
  }
}, 20000)

test('P7-E05 real noncooperating Gateway plus owned descendants escalates after 15 seconds, retaining uncertainty and lease', async () => {
  const f = await codingEngineFixture('stubborn')
  try {
    const { task } = await f.run()
    await waitFor(
      () =>
        existsSync(join(f.workspace, 'owned.json')) && existsSync(join(f.workspace, 'awaiting.txt'))
    )
    expect(f.status().activeProcesses).toBeGreaterThanOrEqual(3)
    const began = performance.now()
    expect(await f.service.dispatch('tasks.cancel', { taskId: task.taskId })).toMatchObject({
      ok: true,
      data: { state: 'requested' }
    })
    await f.wait(task.taskId, 'needs_reconciliation', 20000)
    await waitFor(() => f.status().cleanupVerified === true)
    expect(performance.now() - began).toBeGreaterThanOrEqual(15000)
    expect(f.service.store.readTask(f.scope, task.taskId).outcome).toBeNull()
    expect(f.db.prepare('SELECT lease_state FROM workspace_writer_leases').get()!.lease_state).toBe(
      'blocked'
    )
    expect(
      f.db.prepare("SELECT count(*) n FROM task_events WHERE name='task.cancelled'").get()!.n
    ).toBe(0)
  } finally {
    await f.close()
  }
}, 40000)

test('P7-E06 real FIFO queue: queued cancellation never spawns, next committed writer starts only after actual cleanup', async () => {
  const f = await codingEngineFixture('gateway')
  try {
    const first = await f.run()
    await waitFor(() => existsSync(join(f.workspace, 'awaiting.txt')))
    const cancelled = await f.run(),
      next = await f.run()
    expect(cancelled.task.state).toBe('queued')
    expect(next.task.state).toBe('queued')
    expect(f.supervisor.activeCodingTask).toBe(first.task.taskId)
    expect(
      await f.service.dispatch('tasks.cancel', { taskId: cancelled.task.taskId })
    ).toMatchObject({ ok: true, data: { state: 'requested' } })
    expect(
      f.db.prepare('SELECT count(*) n FROM task_events WHERE task_id=?').get(cancelled.task.taskId)!
        .n
    ).toBe(0)
    f.setCase('success')
    await f.service.dispatch('tasks.cancel', { taskId: first.task.taskId })
    await f.wait(first.task.taskId, 'cancelled')
    await f.wait(next.task.taskId, 'completed')
    expect(
      f.db
        .prepare('SELECT state FROM tasks ORDER BY admission_order')
        .all()
        .map((r) => r.state)
    ).toEqual(['cancelled', 'cancelled', 'completed'])
    expect(f.db.prepare('SELECT count(*) n FROM workspace_writer_leases').get()!.n).toBe(0)
    expect(
      f.db.prepare('SELECT count(*) n FROM task_events WHERE task_id=?').get(cancelled.task.taskId)!
        .n
    ).toBe(0)
  } finally {
    await f.close()
  }
}, 30000)

test('P7-E07 terminal SQLite COMMIT fault preserves actual changed file, unknown outcome and blocked lease', async () => {
  let commits = 0
  const f = await codingEngineFixture('success', (op) => {
    if (op === 'T4' && ++commits === 2) throw new Error('Synthetic terminal COMMIT fault')
  })
  try {
    const { task } = await f.run()
    await f.wait(task.taskId, 'needs_reconciliation')
    expect(f.source()).toBe('def value(): return 2\n')
    expect(f.service.store.readTask(f.scope, task.taskId).outcome).toBeNull()
    expect(f.db.prepare('SELECT lease_state FROM workspace_writer_leases').get()!.lease_state).toBe(
      'blocked'
    )
    expect(
      f.db.prepare("SELECT count(*) n FROM task_events WHERE name='task.completed'").get()!.n
    ).toBe(0)
    expect(f.supervisor.activeCodingTask).toBe(task.taskId)
  } finally {
    await f.close()
  }
}, 20000)

test('P7-E08 verified engine alone cannot enable a paid/default provider or consume a production proposal', async () => {
  const f = await codingEngineFixture('production')
  try {
    const proposal = await f.propose()
    expect(
      await f.service.dispatch('proposals.confirmRun', {
        proposalId: proposal.proposalId,
        clientMutationId: 'unconfigured'
      })
    ).toMatchObject({ ok: false, error: { code: 'RUNTIME_NOT_READY' } })
    expect(f.db.prepare('SELECT count(*) n FROM tasks').get()!.n).toBe(0)
    expect(f.db.prepare('SELECT state FROM task_proposals').get()!.state).toBe('available')
    expect(f.supervisor.activeCodingTask).toBeNull()
  } finally {
    await f.close()
  }
}, 20000)

test('P7-E09 actual native T2 COMMIT fault cannot spawn the verified engine or consume approval', async () => {
  const f = await codingEngineFixture('success', (op) => {
    if (op === 'T2') throw new Error('Synthetic admission fault')
  })
  try {
    const proposal = await f.propose()
    expect(
      await f.service.dispatch('proposals.confirmRun', {
        proposalId: proposal.proposalId,
        clientMutationId: 'commit_fault'
      })
    ).toMatchObject({ ok: false, error: { code: 'DATABASE_UNAVAILABLE' } })
    expect(f.db.prepare('SELECT count(*) n FROM tasks').get()!.n).toBe(0)
    expect(f.db.prepare('SELECT count(*) n FROM workspace_writer_leases').get()!.n).toBe(0)
    expect(f.db.prepare('SELECT state FROM task_proposals').get()!.state).toBe('available')
    expect(f.supervisor.activeCodingTask).toBeNull()
  } finally {
    await f.close()
  }
}, 20000)

test('P7-E10 ordinary Main proof cannot forge a coding event or cleanup authority for a real active task', async () => {
  const f = await codingEngineFixture('gateway')
  try {
    const { task } = await f.run()
    await waitFor(() => existsSync(join(f.workspace, 'awaiting.txt')))
    const proof = (f.service as unknown as { proof: { ref: string } }).proof,
      child = (f.supervisor as unknown as { coding: { child: SupervisedChild } }).coding.child
    expect(() =>
      f.service.store.commitEvent(
        f.scope,
        event(task.taskId, 'task.cancelled', 2, { confirmation: 'Forged fixture' }),
        {
          ...proof,
          taskId: task.taskId,
          workspaceKey: f.scope.workspaceKey,
          processSessionRef: child.sessionId,
          role: 'coding_task'
        }
      )
    ).toThrow('NOT_AUTHORIZED')
    expect(() =>
      f.service.store.reconcile(f.scope, task.taskId, {
        ...proof,
        taskId: task.taskId,
        workspaceKey: f.scope.workspaceKey,
        childStopped: true,
        descendantsStopped: true,
        workspaceSafe: true,
        reason: 'interrupted'
      })
    ).toThrow('NOT_AUTHORIZED')
    expect(f.db.prepare('SELECT count(*) n FROM workspace_writer_leases').get()!.n).toBe(1)
    await f.service.dispatch('tasks.cancel', { taskId: task.taskId })
    await f.wait(task.taskId, 'cancelled')
  } finally {
    await f.close()
  }
}, 20000)
