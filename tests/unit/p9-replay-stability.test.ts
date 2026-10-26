// @vitest-environment node
import { expect, test } from 'vitest'
import { performance, monitorEventLoopDelay } from 'node:perf_hooks'
import { writeFileSync } from 'node:fs'
import { setImmediate } from 'node:timers/promises'
import { taskFixture, event, session, inspect } from '../fixtures/storage'
import { MissionReplay } from '../../renderer/state/mission'
import type { NextCode } from '../../contracts/ipc'

test('P9-RES01 actual SQLite T4 2001-event journal replays in bounded 40-row pages with yielding and bounded cache', async () => {
  const f = taskFixture(),
    id = f.task.taskId,
    proof = session(id)
  const delay = monitorEventLoopDelay({ resolution: 10 })
  const initial = process.memoryUsage(),
    started = performance.now()
  const calls: number[] = []
  let subscribed = false,
    publishes = 0,
    peak = 0
  const api = {
    subscribeTask: () => {
      subscribed = true
      return () => {
        subscribed = false
      }
    },
    read: async () => {
      expect(subscribed).toBe(true)
      return { ok: true as const, data: f.store.readTask(f.scope, id) }
    },
    readEvents: async (q: { taskId: string; afterSequence: number; limit: number }) => {
      expect(subscribed).toBe(true)
      calls.push(q.limit!)
      return { ok: true as const, data: f.store.readEvents(f.scope, q) }
    }
  } as unknown as NextCode['tasks']
  const replay = new MissionReplay(api, id, f.scope.projectId, (state) => {
    publishes++
    peak = Math.max(peak, state.events.length)
  })
  delay.enable()
  let dispose = () => {}
  try {
    f.store.commitEvent(f.scope, event(id, 'task.started', 1, { phase: 'INITIALIZING' }), proof)
    for (let n = 2; n <= 2001; n++) {
      f.store.commitEvent(
        f.scope,
        event(id, 'task.progress', n, {
          phase: 'EXECUTING',
          detail: 'P9 replay fixture; not an Engine-source claim'
        }),
        proof
      )
      if (n % 40 === 0) await setImmediate()
    }
    expect(inspect(f.store).prepare('SELECT count(*) n FROM task_events').get()!.n).toBe(2001)
    const committedMs = performance.now() - started
    dispose = replay.start()
    await setImmediate()
    expect(calls).toHaveLength(4)
    expect(replay.snapshot.events).toHaveLength(160)
    for (let turns = 0; replay.snapshot.more && turns < 20; turns++) {
      const before = calls.length
      replay.loadMore()
      await setImmediate()
      expect(calls.length - before).toBeLessThanOrEqual(4)
      expect(replay.snapshot.events.length).toBeLessThanOrEqual(400)
    }
    expect(replay.snapshot.more).toBe(false)
    expect(replay.snapshot.error).toBe('')
    expect(replay.snapshot.completeThrough).toBe(2001)
    expect(replay.snapshot.hasGap).toBe(false)
    expect(replay.snapshot.events.at(-1)!.payload.data.sequence).toBe(2001)
    expect(calls.every((limit) => limit === 40)).toBe(true)
    expect(peak).toBeLessThanOrEqual(400)
    delay.disable()
    writeFileSync(
      `.cache/p9-replay-metrics-${process.env.NCD_P9_RUN_ID ?? 'selected-01'}.json`,
      JSON.stringify(
        {
          environment:
            'Windows host Node, real disposable SQLite, production replay controller, synthetic events',
          events: 2001,
          committedMs,
          totalMs: performance.now() - started,
          readPages: calls.length,
          maxCache: peak,
          publishes,
          before: initial,
          after: process.memoryUsage(),
          eventLoopDelayMs: {
            mean: Number.isFinite(delay.mean) ? delay.mean / 1e6 : null,
            max: delay.max / 1e6
          },
          thresholds:
            'Only existing 40/page, four pages/turn, 400 cache are asserted; CPU/RAM/time are observations'
        },
        null,
        2
      ) + '\n'
    )
  } finally {
    delay.disable()
    dispose()
    replay.dispose()
    f.store.close()
  }
}, 60000)
