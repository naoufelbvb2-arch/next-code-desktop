import type { NextCode, Output } from '../../contracts/ipc'
import type { WireMessage } from '../../contracts/wire-schema'

export type MissionEvent = Extract<WireMessage, { type: 'event' }>
export interface MissionSnapshot {
  task: Output<'tasks.read'> | null
  events: MissionEvent[]
  completeThrough: number
  hasGap: boolean
  certain: boolean
  more: boolean
  truncated: boolean
  collision: boolean
  loading: boolean
  error: string
}
export const emptyMission = (): MissionSnapshot => ({
  task: null,
  events: [],
  completeThrough: 0,
  hasGap: false,
  certain: false,
  more: false,
  truncated: false,
  collision: false,
  loading: true,
  error: ''
})

// Disposable bounded read cache, never an event authority or task controller.
export class MissionReplay {
  snapshot = emptyMission()
  private disposed = false
  private busy = false
  private dirty = false
  private rewind = false
  private hints = new Set<number>()
  private timer?: ReturnType<typeof setTimeout>
  private poll?: ReturnType<typeof setInterval>
  private unsubscribe?: () => void
  private cursor = 0
  constructor(
    private api: NextCode['tasks'],
    readonly taskId: string,
    private projectId: string,
    private changed: (value: MissionSnapshot) => void
  ) {}
  start() {
    this.unsubscribe = this.api.subscribeTask(this.taskId, (hint) => {
      if (this.disposed) return
      const id = hint.type === 'TaskStateChanged' ? hint.task.taskId : hint.taskId
      if (id !== this.taskId) return
      if (hint.type === 'TaskEventCommitted') {
        if (hint.sequence <= this.cursor) this.rewind = true
        if (this.hints.size >= 128) {
          this.hints.clear()
          this.rewind = true
        }
        this.hints.add(hint.sequence)
      }
      this.dirty = true
      this.schedule()
    })
    void this.fetch(true)
    // Recover lost subscriptions/hints without controlling the task. Every
    // iteration has at most four pages and returns to the browser scheduler.
    this.poll = setInterval(() => {
      this.rewind ||= this.snapshot.hasGap
      this.refresh()
    }, 1500)
    return () => this.dispose()
  }
  refresh() {
    this.dirty = true
    this.schedule()
  }
  loadMore() {
    if (!this.busy) void this.fetch(false)
  }
  private schedule() {
    if (this.disposed || this.busy || this.timer) return
    this.timer = setTimeout(() => {
      this.timer = undefined
      void this.fetch(this.rewind || this.snapshot.hasGap)
    }, 40)
  }
  private publish() {
    if (!this.disposed) this.changed({ ...this.snapshot, events: [...this.snapshot.events] })
  }
  private async fetch(rewind: boolean) {
    if (this.busy || this.disposed) return
    this.busy = true
    this.dirty = false
    this.rewind = false
    this.hints.clear()
    try {
      const view = await this.api.read(this.taskId)
      if (this.disposed) return
      if (!view.ok || view.data.taskId !== this.taskId || view.data.projectId !== this.projectId)
        throw new Error('Task is unavailable in this project.')
      this.snapshot.task = view.data
      // completeThrough is the server's global watermark, not proof that this
      // bounded view has fetched every earlier page. Rewind conservatively.
      let boundary = rewind ? 0 : this.cursor
      if (!this.snapshot.events.length) boundary = 0
      for (let page = 0; page < 4; page++) {
        const result = await this.api.readEvents({
          taskId: this.taskId,
          afterSequence: boundary,
          limit: 40
        })
        if (this.disposed) return
        if (!result.ok)
          throw new Error('Committed events are unavailable; current activity is unverified.')
        const data = result.data
        if (
          data.taskId !== this.taskId ||
          data.events.some((e) => e.type !== 'event' || e.payload.data.task_id !== this.taskId)
        )
          throw new Error('Event scope could not be verified.')
        let previous = boundary
        for (const e of data.events) {
          if (e.type !== 'event' || e.payload.data.sequence <= previous)
            throw new Error('Event order could not be verified.')
          previous = e.payload.data.sequence
        }
        if (data.nextSequence !== previous) throw new Error('Event boundary could not be verified.')
        const bySequence = new Map(this.snapshot.events.map((e) => [e.payload.data.sequence, e]))
        for (const e of data.events as MissionEvent[]) {
          const old = bySequence.get(e.payload.data.sequence)
          if (old && JSON.stringify(old.payload) !== JSON.stringify(e.payload))
            this.snapshot.collision = true
          else bySequence.set(e.payload.data.sequence, e)
        }
        const ordered = [...bySequence.values()].sort(
          (a, b) => a.payload.data.sequence - b.payload.data.sequence
        )
        this.snapshot.truncated ||= ordered.length > 400
        this.snapshot.events = ordered.slice(-400)
        this.snapshot.completeThrough = data.completeThrough
        this.snapshot.hasGap = data.hasGap
        this.snapshot.certain = data.stateIsCertain && !this.snapshot.collision
        this.snapshot.more = data.events.length === 40
        this.cursor = Math.max(this.cursor, data.nextSequence)
        boundary = data.nextSequence
        if (!this.snapshot.more) break
      }
      this.snapshot.error = ''
    } catch (error) {
      this.snapshot.error = error instanceof Error ? error.message : 'Mission evidence unavailable.'
      this.snapshot.certain = false
    } finally {
      this.busy = false
      this.snapshot.loading = false
      this.publish()
      if (this.dirty) this.schedule()
    }
  }
  dispose() {
    this.disposed = true
    this.unsubscribe?.()
    clearTimeout(this.timer)
    clearInterval(this.poll)
    this.hints.clear()
    this.snapshot.events = []
  }
}

export interface WorkerView {
  taskId: string
  workerRef: string
  role: string
  start?: number
  completion?: number
  status?: string
  summary?: string
  inconsistent: boolean
}
export function workers(events: MissionEvent[]): WorkerView[] {
  const rows = new Map<string, WorkerView>()
  for (const e of events) {
    if (e.payload.name !== 'worker.started' && e.payload.name !== 'worker.completed') continue
    const data = e.payload.data
    const key = `${data.task_id}:${data.worker_ref}`
    let row = rows.get(key)
    if (!row) {
      row = {
        taskId: data.task_id,
        workerRef: data.worker_ref,
        role: data.role,
        inconsistent: false
      }
      rows.set(key, row)
    }
    if (row.role !== data.role) row.inconsistent = true
    if (e.payload.name === 'worker.started') {
      if (row.start !== undefined || row.completion !== undefined) row.inconsistent = true
      if (row.start === undefined) row.start = data.sequence
    } else if ('status' in data) {
      if (row.completion !== undefined) row.inconsistent = true
      else {
        row.completion = data.sequence
        row.status = data.status
        row.summary = data.summary
      }
    }
  }
  return [...rows.values()]
}

export function eventText(event: MissionEvent): string {
  const { name, data } = event.payload
  if ('worker_ref' in data)
    return `${name}: ${data.role} / ${data.worker_ref}${'status' in data ? ' / ' + data.status : ''}`
  if ('phase' in data) return `${name}: ${data.phase}${'detail' in data ? ' — ' + data.detail : ''}`
  if ('change_kind' in data) return `${name}: ${data.change_kind} ${data.path} (task-level)`
  if ('status' in data) return `${name}: ${data.status} — ${data.summary} (task-level)`
  if ('outcome' in data) return `${name}: ${data.outcome.summary}`
  return `${name}: ${'confirmation' in data ? data.confirmation : ''}`
}
