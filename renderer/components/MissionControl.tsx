import { useEffect, useRef, useState } from 'react'
import type { Output } from '../../contracts/ipc'
import { EmptyState } from './EmptyState'
import {
  MissionReplay,
  emptyMission,
  eventText,
  workers,
  type MissionSnapshot
} from '../state/mission'

export function MissionControl({
  projectId,
  goals = {}
}: {
  projectId?: string
  goals?: Record<string, string>
}) {
  const api = window.nextCode?.tasks
  const [tasks, setTasks] = useState<Output<'tasks.list'>['tasks']>([])
  const [selected, select] = useState('')
  const [cursor, setCursor] = useState<string | undefined>()
  const [listError, setListError] = useState('')
  const [loading, setLoading] = useState(false)
  const generation = useRef(0)
  const listBusy = useRef(false)
  const [snapshot, setSnapshot] = useState<MissionSnapshot>(emptyMission)
  const [worker, selectWorker] = useState('')
  const [offset, setOffset] = useState(0)
  const replay = useRef<MissionReplay | null>(null)
  async function list(next?: string) {
    if (!api || !projectId || listBusy.current) return
    listBusy.current = true
    setLoading(true)
    const current = generation.current
    try {
      const result = await api.list(undefined, next, 40)
      if (current !== generation.current) return
      if (!result.ok || result.data.tasks.some((t) => t.projectId !== projectId)) {
        setListError('Task history is unavailable in this project.')
        return
      }
      const rows = result.data.tasks
      setTasks((old) => (next ? [...old, ...rows] : rows).slice(-200))
      setCursor(result.data.nextCursor ?? undefined)
      if (!next) select((id) => (rows.some((t) => t.taskId === id) ? id : (rows[0]?.taskId ?? '')))
      setListError('')
    } catch {
      if (current === generation.current) setListError('Task history could not be read.')
    } finally {
      listBusy.current = false
      if (current === generation.current) setLoading(false)
    }
  }
  useEffect(() => {
    generation.current++
    listBusy.current = false
    setTasks([])
    select('')
    setCursor(undefined)
    void list()
    return () => {
      generation.current++
    }
  }, [api, projectId])
  useEffect(() => {
    setSnapshot(emptyMission())
    selectWorker('')
    setOffset(0)
    if (!api || !projectId || !selected) return
    const controller = new MissionReplay(api, selected, projectId, setSnapshot)
    replay.current = controller
    const dispose = controller.start()
    return () => {
      dispose()
      replay.current = null
    }
  }, [api, selected, projectId])
  const task = snapshot.task
  const invocations = workers(snapshot.events)
  const inspected = invocations.find((w) => w.workerRef === worker)
  const phases = snapshot.events.filter((e) => 'phase' in e.payload.data)
  const phase = phases.at(-1)?.payload.data
  const start = snapshot.events.find((e) => e.payload.name === 'task.started')
  const terminal = snapshot.events.find((e) =>
    ['task.completed', 'task.failed', 'task.cancelled'].includes(e.payload.name)
  )
  const visible = snapshot.events.slice(offset, offset + 100)
  return (
    <div className="page-content agents-page">
      <div className="page-intro">
        <p className="eyebrow">MISSION CONTROL</p>
        <h1>Agents</h1>
        <p>A clear view of recorded work.</p>
      </div>
      <div className="mission-selection">
        <label>
          Mission{' '}
          <select aria-label="Mission" value={selected} onChange={(e) => select(e.target.value)}>
            {!tasks.length && <option value="">No recorded task</option>}
            {task && !tasks.some((t) => t.taskId === task.taskId) && (
              <option value={task.taskId}>{task.taskId} · selected recorded task</option>
            )}
            {tasks.map((t) => (
              <option key={t.taskId} value={t.taskId}>
                {t.taskId} · {t.state}
              </option>
            ))}
          </select>
        </label>
        <button
          className="text-button"
          disabled={loading || !projectId}
          onClick={() => void list()}
        >
          Refresh missions
        </button>
        {cursor && (
          <button className="text-button" disabled={loading} onClick={() => void list(cursor)}>
            More missions
          </button>
        )}
        {tasks.length >= 200 && (
          <p>Showing a bounded 200-task window; more pages remain accessible.</p>
        )}
      </div>
      {listError && <p role="alert">{listError}</p>}
      <section className="surface-card mission-header" aria-label="Mission Header">
        {task ? (
          <div className="mission-facts">
            <h2>Task {task.taskId}</h2>
            <p>
              Project: {task.projectId} · Conversation: {task.conversationId}
            </p>
            <p>
              Approved goal:{' '}
              {goals[task.taskId] ??
                'Not exposed by the current task projection; no goal is inferred.'}
            </p>
            <p>
              Admission / durable state: {task.state}
              {task.state === 'queued' ? ' — not started' : ''}
            </p>
            <p>
              Actual engine start:{' '}
              {start
                ? `recorded at sequence ${start.payload.data.sequence}`
                : 'not present in this visible event window'}
            </p>
            <p>
              Last verified phase:{' '}
              {task.outcome?.final_phase ??
                (phase && 'phase' in phase ? phase.phase : 'not available in this visible window')}
            </p>
            <p>
              Engine outcome:{' '}
              {task.outcome
                ? `${task.outcome.success ? 'completed' : 'failed'} — ${task.outcome.summary}`
                : terminal?.payload.name === 'task.cancelled'
                  ? 'cooperative cancellation recorded'
                  : 'unknown / no TaskOutcome exposed'}
            </p>
            <p>Windows cleanup / Writer Lease: not verified or not exposed by this view.</p>
            <p>
              Recovery / certainty:{' '}
              {snapshot.certain
                ? 'Main reports certain recorded state; no process handles exposed'
                : 'uncertain or incomplete evidence; current execution is unverified'}
            </p>
            <p>
              Event integrity: complete through {snapshot.completeThrough}
              {snapshot.hasGap
                ? `; Gap after ${snapshot.completeThrough} (next missing ${snapshot.completeThrough + 1})`
                : '; no gap reported'}
              {snapshot.collision ? '; inconsistent cached identities' : ''}.
            </p>
          </div>
        ) : (
          <div>
            <h2>{selected ? 'Loading mission evidence' : 'No active task'}</h2>
            <p>
              {projectId
                ? 'Select a recorded task. No execution is started by this page.'
                : 'Choose a registered project to read authorized task history.'}
            </p>
          </div>
        )}
      </section>
      {snapshot.error && <p role="alert">{snapshot.error}</p>}
      <div className="mission-grid">
        <section className="surface-card timeline" aria-label="Execution Timeline">
          <div className="card-heading">
            <h2>Execution Timeline</h2>
            <span className="small-muted">Committed sequence order</span>
          </div>
          {(snapshot.more || snapshot.truncated || offset > 0 || snapshot.events.length > 100) && (
            <p className="mission-note">
              Bounded visible window; this is not the entire task history.
            </p>
          )}
          {snapshot.hasGap && (
            <p role="status" className="mission-note">
              Gap at {snapshot.completeThrough + 1}. Missing events are not reconstructed.
            </p>
          )}
          {!snapshot.events.length ? (
            <EmptyState icon="agents" title="No recorded activity">
              <p>Detailed live activity unavailable / not verified.</p>
            </EmptyState>
          ) : (
            <ol className="event-list" aria-label="Committed events">
              {visible.map((e) => (
                <li key={`${e.payload.data.sequence}:${e.payload.data.event_id}`}>
                  <span>#{e.payload.data.sequence} </span>
                  {eventText(e)}
                </li>
              ))}
            </ol>
          )}
          <div className="mission-actions">
            {offset > 0 && (
              <button className="text-button" onClick={() => setOffset(Math.max(0, offset - 100))}>
                Earlier visible events
              </button>
            )}
            {offset + 100 < snapshot.events.length && (
              <button className="text-button" onClick={() => setOffset(offset + 100)}>
                Later visible events
              </button>
            )}
            {snapshot.more && (
              <button className="text-button" onClick={() => replay.current?.loadMore()}>
                Load more events
              </button>
            )}
            {selected && (
              <button className="text-button" onClick={() => replay.current?.refresh()}>
                Refresh evidence
              </button>
            )}
          </div>
          {invocations.length ? (
            <ul className="worker-list" aria-label="Recorded worker invocations">
              {invocations.map((w) => (
                <li key={w.workerRef}>
                  <button
                    className="text-button"
                    aria-pressed={worker === w.workerRef}
                    onClick={() => selectWorker(w.workerRef)}
                  >
                    {w.role} / {w.workerRef} —{' '}
                    {w.inconsistent
                      ? 'inconsistent evidence'
                      : (w.status ?? 'started; live status unverified')}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mission-note">
              No verified worker events. Detailed worker activity unavailable.
            </p>
          )}
        </section>
        <section className="surface-card inspector" aria-label="Agent Inspector">
          <div className="card-heading">
            <h2>Agent Inspector</h2>
          </div>
          {inspected ? (
            <dl className="worker-report">
              <dt>worker_ref</dt>
              <dd>{inspected.workerRef}</dd>
              <dt>Role</dt>
              <dd>{inspected.role}</dd>
              <dt>Recorded start</dt>
              <dd>
                {inspected.start === undefined
                  ? 'Missing start evidence'
                  : `sequence ${inspected.start}`}
              </dd>
              <dt>Recorded end</dt>
              <dd>
                {inspected.completion === undefined
                  ? 'No completion evidence; live status unverified'
                  : `sequence ${inspected.completion}`}
              </dd>
              <dt>WorkerReport status</dt>
              <dd>{inspected.status ?? 'Not available'}</dd>
              <dt>Returned summary (untrusted text)</dt>
              <dd>{inspected.summary ?? 'No report received'}</dd>
              {inspected.inconsistent && (
                <>
                  <dt>Evidence warning</dt>
                  <dd>Inconsistent worker lifecycle; no current activity inferred.</dd>
                </>
              )}
              <dt>Assigned contract / duration / per-worker files and tests</dt>
              <dd>
                Not available from current verified event contract. Files and tests above are
                task-level only.
              </dd>
            </dl>
          ) : (
            <EmptyState compact icon="file" title="Nothing to inspect">
              <p>Select a recorded worker. No worker identity or report is invented.</p>
            </EmptyState>
          )}
        </section>
      </div>
    </div>
  )
}
