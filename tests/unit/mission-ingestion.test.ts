// @vitest-environment node
import { test, expect } from 'vitest'
import {
  event,
  fixture,
  taskFixture,
  session,
  inspect,
  proof,
  sendInput
} from '../fixtures/storage'
import { coordinatorFixture, waitFor } from '../fixtures/supervision'
import { codingEngineFixture } from '../fixtures/coding-engine'
import { WIRE_EVENTS } from '../../contracts/wire-schema'
import { validateWire } from '../../contracts/jsonl'

const outcome = (taskId: string) => ({
  task_id: taskId,
  success: true,
  final_phase: 'COMPLETED',
  summary: 'Actual fixture outcome',
  total_ticks: 1,
  rollbacks_triggered: 0,
  final_checkpoint_hash: null
})
test('E05-02 nine closed subtype data schemas and unrecognized keys/types are rejected', () => {
  const values = [
    { phase: 'INITIALIZING' },
    { phase: 'EXECUTING', detail: 'Bounded' },
    { worker_ref: 'a', role: 'SCOUT' },
    { worker_ref: 'a', role: 'SCOUT', status: 'SUCCESS', summary: 'Report' },
    { path: 'sample.py', change_kind: 'modified' },
    { status: 'passed', summary: 'Verified fixture' },
    { outcome: outcome('task') },
    { outcome: { ...outcome('task'), success: false, final_phase: 'FAILED' } },
    { confirmation: 'Cooperative unwind' }
  ]
  WIRE_EVENTS.forEach((name, i) => {
    const frame = event('task', name, i + 1, values[i])
    expect(() => validateWire(frame)).not.toThrow()
    expect(() =>
      validateWire({
        ...frame,
        payload: { ...frame.payload, data: { ...frame.payload.data, extra: true } }
      })
    ).toThrow()
    for (const sequence of [true, NaN, 0, '1'])
      expect(() =>
        validateWire({
          ...frame,
          payload: { ...frame.payload, data: { ...frame.payload.data, sequence } }
        })
      ).toThrow()
  })
})

test('E05-08/09/10/11/29/30 I08-T50/53 actual T4 idempotence, late hole and sticky conflict survive later fill', () => {
  const f = taskFixture(),
    id = f.task.taskId,
    p = session(id)
  try {
    f.store.commitEvent(f.scope, event(id, 'task.started', 1, { phase: 'INITIALIZING' }), p)
    f.store.commitEvent(
      f.scope,
      event(id, 'task.progress', 2, { phase: 'EXECUTING', detail: 'Observed' }),
      p
    )
    const final = event(id, 'task.completed', 4, { outcome: outcome(id) })
    f.store.commitEvent(f.scope, final, p)
    expect(f.store.readEvents(f.scope, { taskId: id, afterSequence: 0, limit: 40 })).toMatchObject({
      completeThrough: 2,
      hasGap: true,
      stateIsCertain: false
    })
    expect(f.store.commitEvent(f.scope, { ...final, message_id: 'new_envelope' }, p).inserted).toBe(
      false
    )
    expect(() =>
      f.store.commitEvent(
        f.scope,
        event(id, 'test.result', 2, { status: 'failed', summary: 'Collision' }),
        p
      )
    ).toThrow('TASK_UNKNOWN')
    f.store.commitEvent(
      f.scope,
      event(id, 'test.result', 3, { status: 'passed', summary: 'Late genuine fixture' }),
      p
    )
    const page = f.store.readEvents(f.scope, { taskId: id, afterSequence: 0, limit: 40 })
    expect(page).toMatchObject({ completeThrough: 4, hasGap: false, stateIsCertain: false })
    expect(Object.keys(page).sort()).toEqual(
      ['taskId', 'events', 'nextSequence', 'completeThrough', 'hasGap', 'stateIsCertain'].sort()
    )
    expect(
      inspect(f.store)
        .prepare('SELECT integrity_status,last_incident_code FROM task_event_streams')
        .get()
    ).toMatchObject({ integrity_status: 'conflict', last_incident_code: 'EVENT_CONFLICT' })
    expect(page.events).toHaveLength(4)
  } finally {
    f.store.close()
  }
})

test('E05-18 I08-T50 real SQLite rollback never publishes an uncommitted event, successful push reads committed row', () => {
  let fail = false
  const pushed: unknown[] = []
  const f = fixture({
    fault: (name) => {
      if (fail && name === 'T4') throw new Error('Injected commit failure')
    },
    notify: (_kind, _id, update) => pushed.push(update)
  })
  try {
    const sent = f.store.sendMessage(f.scope, sendInput())
    const proposal = f.store.createProposal(
      f.scope,
      sent.conversationId,
      'Exact fixture goal',
      proof
    )
    const task = f.store.admit(f.scope, { proposalId: proposal, clientMutationId: 'admit' }, proof),
      id = task.taskId
    pushed.length = 0
    fail = true
    expect(() =>
      f.store.commitEvent(
        f.scope,
        event(id, 'task.started', 1, { phase: 'INITIALIZING' }),
        session(id)
      )
    ).toThrow('DATABASE_UNAVAILABLE')
    expect(pushed).toEqual([])
    expect(inspect(f.store).prepare('SELECT count(*) n FROM task_events').get()!.n).toBe(0)
    fail = false
    f.store.commitEvent(
      f.scope,
      event(id, 'task.started', 1, { phase: 'INITIALIZING' }),
      session(id)
    )
    expect(pushed).toHaveLength(2)
    expect(
      f.store.readEvents(f.scope, { taskId: id, afterSequence: 0, limit: 40 }).events
    ).toHaveLength(1)
  } finally {
    f.store.close()
  }
})

test('E05-27 event metadata secrets, absolute/sensitive paths and foreign sessions fail closed before persistence', () => {
  const f = taskFixture(),
    id = f.task.taskId
  try {
    f.store.commitEvent(
      f.scope,
      event(id, 'task.started', 1, { phase: 'INITIALIZING' }),
      session(id)
    )
    for (const payload of [
      {
        name: 'task.progress',
        extra: { phase: 'EXECUTING', detail: 'sk-' + 'syntheticcredential'.repeat(3) }
      },
      { name: 'file.changed', extra: { path: 'C:/private/location.txt', change_kind: 'modified' } },
      { name: 'file.changed', extra: { path: '.env.local', change_kind: 'modified' } }
    ])
      expect(() =>
        f.store.commitEvent(f.scope, event(id, payload.name, 2, payload.extra), session(id))
      ).toThrow(payload.extra.path?.startsWith('C:') ? 'BAD_INPUT' : 'NOT_AUTHORIZED')
    expect(() =>
      f.store.commitEvent(
        f.scope,
        event(id, 'task.progress', 2, { phase: 'EXECUTING', detail: 'Old session' }),
        session(id, undefined, 'stale')
      )
    ).toThrow('NOT_AUTHORIZED')
    expect(inspect(f.store).prepare('SELECT count(*) n FROM task_events').get()!.n).toBe(1)
  } finally {
    f.store.close()
  }
})

test('E05-09 actual supervised protocol collision preserves permanent SQLite conflict before fault', async () => {
  const f = await coordinatorFixture('p8_conflict')
  try {
    const child = await f.supervisor.admitCodingTask(f.scope, f.task.taskId)
    await waitFor(() => child.lastError !== null)
    expect(
      inspect(f.store)
        .prepare('SELECT integrity_status,last_incident_code FROM task_event_streams')
        .get()
    ).toMatchObject({ integrity_status: 'conflict', last_incident_code: 'EVENT_CONFLICT' })
    expect(inspect(f.store).prepare('SELECT count(*) n FROM task_events').get()!.n).toBe(1)
    expect(f.store.readTask(f.scope, f.task.taskId).state).toBe('needs_reconciliation')
    await child.stop()
  } finally {
    await f.supervisor.stopAllOnAppQuit()
    f.store.close()
  }
}, 20000)

test('E05-33 actual supervised late earlier event after terminal is valid backfill without rewriting outcome', async () => {
  const f = await coordinatorFixture('p8_backfill')
  try {
    const child = await f.supervisor.admitCodingTask(f.scope, f.task.taskId)
    await waitFor(
      () =>
        f.store.readEvents(f.scope, { taskId: f.task.taskId, afterSequence: 0, limit: 40 })
          .completeThrough === 5
    )
    expect(child.lastError).toBeNull()
    expect(f.store.readTask(f.scope, f.task.taskId).outcome?.success).toBe(true)
    expect(
      inspect(f.store).prepare('SELECT count(*) n FROM workspace_writer_leases').get()!.n
    ).toBe(1)
    await child.stop()
  } finally {
    await f.supervisor.stopAllOnAppQuit()
    f.store.close()
  }
}, 20000)

test('E05-01/05/06/25 actual original AgentOS production factory with offline HTTP emits real workers and independent patch/test effects', async () => {
  const f = await codingEngineFixture('production_mock')
  try {
    const { task } = await f.run()
    await f.wait(task.taskId, 'completed', 20000)
    const page = f.service.store.readEvents(f.scope, {
      taskId: task.taskId,
      afterSequence: 0,
      limit: 40
    })
    expect(page.events.map((e) => e.type === 'event' && e.payload.name)).toEqual([
      'task.started',
      'task.progress',
      'worker.started',
      'file.changed',
      'test.result',
      'worker.completed',
      'worker.started',
      'test.result',
      'worker.completed',
      'task.progress',
      'task.completed'
    ])
    expect(page).toMatchObject({ completeThrough: 11, hasGap: false, stateIsCertain: true })
    expect(f.source()).toBe('def value(): return 2\n')
    const file = page.events[3]
    expect(file.type === 'event' && file.payload.data).toMatchObject({
      path: 'sample.py',
      change_kind: 'modified'
    })
    for (const frame of page.events)
      if (frame.type === 'event' && frame.payload.name === 'test.result')
        expect(frame.payload.data).toMatchObject({
          status: 'passed',
          summary: 'Pinned verification command exited with code 0.'
        })
    for (const frame of page.events)
      if (frame.type === 'event' && ['file.changed', 'test.result'].includes(frame.payload.name))
        expect(frame.payload.data).not.toHaveProperty('worker_ref')
  } finally {
    await f.close()
  }
}, 30000)
