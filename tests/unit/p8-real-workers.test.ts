// @vitest-environment node
import { test, expect } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'
import { codingEngineFixture } from '../fixtures/coding-engine'
import { workers } from '../../renderer/state/mission'

test('E05-04/05 I08-T49/T54 real repeated Scouts around Inquisitor produce separate typed reports, each visible to another SQLite reader before push', async () => {
  let f: Awaited<ReturnType<typeof codingEngineFixture>>
  const observed: number[] = []
  f = await codingEngineFixture('repeated_workers', undefined, (kind, id, hint) => {
    const value = hint as { type: string; sequence: number }
    if (kind !== 'task' || value.type !== 'TaskEventCommitted') return
    const reader = new DatabaseSync(join(f.directory, 'state.sqlite3'), { readOnly: true })
    try {
      expect(
        reader
          .prepare('SELECT sequence FROM task_events WHERE task_id=? AND sequence=?')
          .get(id, value.sequence)
      ).toMatchObject({ sequence: value.sequence })
      observed.push(value.sequence)
    } finally {
      reader.close()
    }
  })
  try {
    const { task } = await f.run()
    await f.wait(task.taskId, 'completed', 20000)
    const page = f.service.store.readEvents(f.scope, {
      taskId: task.taskId,
      afterSequence: 0,
      limit: 40
    })
    expect(page.hasGap).toBe(false)
    expect(page.stateIsCertain).toBe(true)
    const events = page.events.filter((event) => event.type === 'event')
    const started = events.flatMap((event) =>
      event.payload.name === 'worker.started' ? [event.payload.data] : []
    )
    expect(started.map((data) => data.role)).toEqual(['SURGEON', 'SCOUT', 'INQUISITOR', 'SCOUT'])
    expect(new Set(started.map((data) => data.worker_ref)).size).toBe(4)
    const projection = workers(events)
    expect(projection).toHaveLength(4)
    expect(
      projection.every(
        (worker) =>
          worker.status === 'SUCCESS' &&
          worker.start !== undefined &&
          worker.completion !== undefined
      )
    ).toBe(true)
    expect(events.filter((event) => event.payload.name === 'worker.completed')).toHaveLength(4)
    expect(events.at(-1)?.payload.name).toBe('task.completed')
    expect(observed).toEqual(events.map((event) => event.payload.data.sequence))
    expect(f.service.store.readTask(f.scope, task.taskId).exactGoal).toBe(
      'Change only sample.py so value() returns 2 and verify with check.py.'
    )
    expect(f.db.prepare('SELECT count(*) n FROM workspace_writer_leases').get()!.n).toBe(0)
  } finally {
    await f.close()
  }
}, 30000)
