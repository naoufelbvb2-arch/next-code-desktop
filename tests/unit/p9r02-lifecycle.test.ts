// @vitest-environment node
import { test, expect } from 'vitest'
import { codingEngineFixture } from '../fixtures/coding-engine'

test('R02-QF01 real offline AgentOS quit with T3 cleanup COMMIT failure retains lease and returns unverified after draining Main finalization', async () => {
  let armed = false
  const f = await codingEngineFixture('worker', (operation) => {
    if (
      armed &&
      operation === 'T3.cleanup' &&
      f.db.prepare("SELECT count(*) n FROM tasks WHERE cleanup_state LIKE 'verified_%'").get()!.n
    )
      throw new Error('Synthetic final cleanup COMMIT failure')
  })
  try {
    const { task } = await f.run()
    await f.wait(task.taskId, 'running')
    armed = true
    expect(await f.supervisor.stopAllOnAppQuit()).toBe(false)
    expect(f.supervisor.verifiedCodingCleanup(task.taskId, f.scope.workspaceKey)).toBe(true)
    expect(
      f.db.prepare("SELECT count(*) n FROM task_events WHERE name='task.cancelled'").get()!.n
    ).toBe(1)
    expect(f.db.prepare('SELECT lease_state FROM workspace_writer_leases').get()!.lease_state).toBe(
      'blocked'
    )
    expect(f.service.store.readTask(f.scope, task.taskId).state).toBe('needs_reconciliation')
    expect(f.db.prepare('PRAGMA integrity_check').get()!.integrity_check).toBe('ok')
  } finally {
    await f.close()
  }
}, 30000)

test('R02-QF02 quitting a real offline task closes admission and cannot dispatch or advance an already admitted queued task', async () => {
  const f = await codingEngineFixture('worker')
  try {
    const first = await f.run()
    await f.wait(first.task.taskId, 'running')
    const proposal = await f.propose()
    const second = await f.service.dispatch('proposals.confirmRun', {
      proposalId: proposal.proposalId,
      clientMutationId: 'r02_queued_approval'
    })
    expect(second).toMatchObject({ ok: true, data: { state: 'queued' } })
    expect(await f.supervisor.stopAllOnAppQuit()).toBe(true)
    const rows = f.db.prepare('SELECT task_id,state FROM tasks ORDER BY admission_order').all()
    expect(rows.map((r) => r.state)).toEqual(['cancelled', 'queued'])
    expect(
      f.db
        .prepare('SELECT count(*) n FROM task_events WHERE task_id=?')
        .get(rows[1].task_id as string)!.n
    ).toBe(0)
    expect(f.db.prepare('SELECT count(*) n FROM workspace_writer_leases').get()!.n).toBe(0)
    expect(
      await f.service.dispatch('proposals.confirmRun', {
        proposalId: proposal.proposalId,
        clientMutationId: 'r02_no_post_quit_admission'
      })
    ).toMatchObject({ ok: false })
  } finally {
    await f.close()
  }
}, 30000)
