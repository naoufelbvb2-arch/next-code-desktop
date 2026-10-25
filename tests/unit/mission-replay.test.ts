// @vitest-environment node
import { test, expect, vi, afterEach, beforeEach } from 'vitest'
import { MissionReplay, workers, type MissionSnapshot } from '../../renderer/state/mission'
import { missionApi, missionEvent, workerEvent } from '../fixtures/mission'

const controllers: MissionReplay[] = []
beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  controllers.splice(0).forEach((c) => c.dispose())
  vi.useRealTimers()
})
function start(f: ReturnType<typeof missionApi>) {
  const changes: MissionSnapshot[] = []
  const c = new MissionReplay(f.api, 'task', 'project', (s) => changes.push(s))
  controllers.push(c)
  c.start()
  return { c, changes }
}
test('E05-10/21/33 I08-T52/53 subscribe before snapshot, deduplicate hints and rewind for late 3 after 1,2,4', async () => {
  const f = missionApi([missionEvent(1, 'task.started'), missionEvent(2), missionEvent(4)])
  const { c } = start(f)
  await vi.advanceTimersByTimeAsync(0)
  expect(f.calls.slice(0, 3)).toEqual(['subscribe', 'read', 'events'])
  expect(c.snapshot).toMatchObject({ completeThrough: 2, hasGap: true })
  f.setEvents([missionEvent(1, 'task.started'), missionEvent(2), missionEvent(3), missionEvent(4)])
  f.hint(3)
  f.hint(3)
  await vi.advanceTimersByTimeAsync(45)
  expect(f.api.readEvents.mock.calls.at(-1)![0].afterSequence).toBeLessThan(3)
  expect(c.snapshot.events.map((e) => e.payload.data.sequence)).toEqual([1, 2, 3, 4])
  expect(c.snapshot).toMatchObject({ completeThrough: 4, hasGap: false, certain: false })
})
test('E05-16/17/32 more than 128 hints and continuous tail yield after four 40-row pages; bounded 400-row cache', async () => {
  const f = missionApi(Array.from({ length: 900 }, (_, i) => missionEvent(i + 1)))
  const { c } = start(f)
  await vi.advanceTimersByTimeAsync(0)
  expect(f.api.readEvents).toHaveBeenCalledTimes(4)
  expect(f.api.readEvents.mock.calls.every(([q]) => q.limit === 40)).toBe(true)
  expect(c.snapshot.events).toHaveLength(160)
  for (let n = 1; n <= 200; n++) f.hint(n)
  await vi.advanceTimersByTimeAsync(45)
  expect(f.api.readEvents.mock.calls.length).toBeLessThanOrEqual(8)
  for (let n = 0; n < 4; n++) {
    c.loadMore()
    await vi.advanceTimersByTimeAsync(0)
  }
  expect(c.snapshot.events.length).toBeLessThanOrEqual(400)
  expect(c.snapshot.truncated).toBe(true)
})
test('E05-15/22 stale callback and pending snapshot after disposal cannot mutate another task or publish', async () => {
  const f = missionApi([missionEvent(1, 'task.started')])
  let resolve!: (x: unknown) => void
  f.api.read.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r
      })
  )
  const { c, changes } = start(f)
  c.dispose()
  resolve({ ok: true, data: f.task })
  f.listeners[0]({ type: 'TaskEventCommitted', taskId: 'task', sequence: 1 })
  await vi.advanceTimersByTimeAsync(100)
  expect(changes).toEqual([])
  expect(f.unsubscribe).toHaveBeenCalled()
})
test('E05-27 foreign task/page/project and wrong numeric boundary never enter the visible cache', async () => {
  const f = missionApi([missionEvent(1, 'task.started')])
  f.api.readEvents.mockResolvedValue({
    ok: true,
    data: {
      taskId: 'foreign',
      events: [missionEvent(1)],
      nextSequence: 1,
      completeThrough: 1,
      hasGap: false,
      stateIsCertain: true
    }
  })
  const { c } = start(f)
  await vi.advanceTimersByTimeAsync(0)
  expect(c.snapshot.events).toEqual([])
  expect(c.snapshot.error).toMatch(/scope/)
})
test('E05-09/30 sticky authoritative uncertainty stays after gap fills; UI identity collision does not overwrite original event', async () => {
  const f = missionApi([missionEvent(1, 'task.started')])
  const { c } = start(f)
  await vi.advanceTimersByTimeAsync(0)
  const altered = missionEvent(1, 'task.started', { phase: 'EXECUTING' })
  f.setEvents([altered])
  f.hint(1)
  await vi.advanceTimersByTimeAsync(45)
  expect(c.snapshot).toMatchObject({ collision: true, certain: false })
  expect(c.snapshot.events[0].payload.data).toMatchObject({ phase: 'INITIALIZING' })
})
test('E05-19/20/36 subscription loss poll recovers late committed facts without treating stale starts as live workers', async () => {
  const f = missionApi([missionEvent(1, 'task.started'), workerEvent(2, 'worker_a')])
  const { c } = start(f)
  await vi.advanceTimersByTimeAsync(0)
  f.setEvents([
    missionEvent(1, 'task.started'),
    workerEvent(2, 'worker_a'),
    workerEvent(3, 'worker_a', 'SCOUT', true)
  ])
  await vi.advanceTimersByTimeAsync(1550)
  expect(c.snapshot.events).toHaveLength(3)
  expect(workers(c.snapshot.events)[0]).toMatchObject({
    status: 'SUCCESS',
    start: 2,
    completion: 3
  })
  expect(Object.keys(workers(c.snapshot.events)[0])).not.toContain('active')
})
test('E05-04/07/34 repeated roles stay distinct; orphan completion and semantic double-start preserve first report and uncertainty', () => {
  const rows = workers([
    workerEvent(1, 'first', 'INQUISITOR'),
    workerEvent(2, 'second'),
    workerEvent(3, 'third'),
    workerEvent(4, 'second', 'SCOUT', true),
    workerEvent(5, 'orphan', 'SURGEON', true),
    workerEvent(6, 'second'),
    workerEvent(7, 'second', 'SCOUT', true, 'contradictory')
  ])
  expect(rows).toHaveLength(4)
  expect(rows[1]).toMatchObject({
    workerRef: 'second',
    summary: 'Returned fixture report',
    inconsistent: true
  })
  expect(rows[2]).toMatchObject({ workerRef: 'third', role: 'SCOUT' })
  expect(rows[3].start).toBeUndefined()
})
