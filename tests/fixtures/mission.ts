import { vi } from 'vitest'
import type { NextCode, Update } from '../../contracts/ipc'
import type { MissionEvent } from '../../renderer/state/mission'

// Synthetic UI/protocol projection data only, never real engine proof.
export function missionEvent(
  sequence: number,
  name = 'task.progress',
  extra: Record<string, unknown> = {}
) {
  return {
    version: 1,
    type: 'event',
    message_id: `outer_${sequence}`,
    correlation_id: null,
    payload: {
      name,
      data: {
        task_id: 'task',
        event_id: `event_${sequence}`,
        sequence,
        source: 'agent_os',
        ...(name === 'task.started'
          ? { phase: 'INITIALIZING' }
          : { phase: 'EXECUTING', detail: 'Synthetic fixture' }),
        ...extra
      }
    }
  } as unknown as MissionEvent
}
export function workerEvent(
  sequence: number,
  ref: string,
  role = 'SCOUT',
  completed = false,
  summary = 'Returned fixture report'
) {
  return {
    version: 1,
    type: 'event',
    message_id: `outer_${sequence}`,
    correlation_id: null,
    payload: {
      name: completed ? 'worker.completed' : 'worker.started',
      data: {
        task_id: 'task',
        event_id: `event_${sequence}`,
        sequence,
        source: 'agent_os',
        worker_ref: ref,
        role,
        ...(completed ? { status: 'SUCCESS', summary } : {})
      }
    }
  } as MissionEvent
}
export function missionApi(initial: MissionEvent[] = []) {
  let rows = initial
  const listeners: ((hint: Update<'task'>) => void)[] = []
  let callback: ((hint: Update<'task'>) => void) | undefined
  const calls: string[] = []
  const task = {
    taskId: 'task',
    conversationId: 'conversation',
    projectId: 'project',
    state: 'running' as const,
    exactGoal: 'Exact persisted synthetic goal',
    outcome: null
  }
  const unsubscribe = vi.fn()
  const api = {
    list: vi.fn(async () => ({ ok: true as const, data: { tasks: [task], nextCursor: null } })),
    read: vi.fn(async () => {
      calls.push('read')
      return { ok: true as const, data: task }
    }),
    readEvents: vi.fn(
      async ({
        afterSequence,
        limit
      }: {
        afterSequence: number
        limit: number
        taskId: string
      }) => {
        calls.push('events')
        const selected = rows.filter((e) => e.payload.data.sequence > afterSequence).slice(0, limit)
        const keys = new Set(rows.map((e) => e.payload.data.sequence))
        let through = 0
        while (keys.has(through + 1)) through++
        return {
          ok: true as const,
          data: {
            taskId: 'task',
            events: selected,
            nextSequence: selected.at(-1)?.payload.data.sequence ?? afterSequence,
            completeThrough: through,
            hasGap: rows.some((e) => e.payload.data.sequence > through),
            stateIsCertain: false
          }
        }
      }
    ),
    subscribeTask: vi.fn((_id: string, cb: (hint: Update<'task'>) => void) => {
      calls.push('subscribe')
      callback = cb
      listeners.push(cb)
      return unsubscribe
    }),
    cancel: vi.fn(),
    readDiagnostics: vi.fn()
  } as unknown as NextCode['tasks'] & {
    read: ReturnType<typeof vi.fn>
    readEvents: ReturnType<typeof vi.fn>
    list: ReturnType<typeof vi.fn>
  }
  return {
    api,
    task,
    calls,
    listeners,
    unsubscribe,
    setEvents: (value: MissionEvent[]) => {
      rows = value
    },
    hint: (sequence: number) => callback?.({ type: 'TaskEventCommitted', taskId: 'task', sequence })
  }
}
