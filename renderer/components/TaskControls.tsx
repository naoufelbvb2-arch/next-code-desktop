import { useEffect, useRef, useState } from 'react'
import type { Output } from '../../contracts/ipc'

export function TaskControls({
  conversation,
  onLiveStart,
  onAdmission
}: {
  conversation: Output<'conversations.read'>
  onLiveStart?: (key: string) => void
  onAdmission?: (taskId: string, exactGoal: string) => void
}) {
  const api = window.nextCode,
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(Date.now())
  const inFlight = useRef(false),
    mutations = useRef(new Map<string, string>())
  const callbacks = useRef({ onLiveStart, onAdmission })
  callbacks.current = { onLiveStart, onAdmission }
  const [views, setViews] = useState<
    Record<string, { task: Output<'tasks.read'>; certain: boolean }>
  >({})
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(clock)
  }, [])
  useEffect(() => {
    if (!api?.tasks) return
    let active = true
    const baselines = new Set<string>(),
      seenStarts = new Set<string>()
    const refresh = async (id: string) => {
      const task = await api.tasks.read(id)
      if (
        !active ||
        !task.ok ||
        task.data.conversationId !== conversation.conversation.conversationId
      )
        return
      const evidence = await api.tasks.readEvents({ taskId: id, afterSequence: 0, limit: 1 })
      if (active && evidence.ok) {
        if (
          evidence.data.events.some((e) => e.type === 'event' && e.payload.name === 'task.started')
        )
          seenStarts.add(id)
        baselines.add(id)
      }
      if (active)
        setViews((old) => ({
          ...old,
          [id]: { task: task.data, certain: evidence.ok && evidence.data.stateIsCertain }
        }))
    }
    // Register before snapshots. Unsubscribe/navigation never controls task life.
    const subscriptions = conversation.tasks.slice(0, 21).map((task) => {
      const unsubscribe = api.tasks.subscribeTask(task.taskId, (hint) => {
        if (
          active &&
          hint?.type === 'TaskEventCommitted' &&
          hint.taskId === task.taskId &&
          hint.sequence === 1 &&
          baselines.has(task.taskId) &&
          !seenStarts.has(task.taskId)
        ) {
          seenStarts.add(task.taskId)
          void api.tasks
            .readEvents({ taskId: task.taskId, afterSequence: 0, limit: 1 })
            .then((page) => {
              if (!active || !page.ok || page.data.taskId !== task.taskId) return
              const first = page.data.events[0]
              if (
                first?.type === 'event' &&
                first.payload.name === 'task.started' &&
                first.payload.data.task_id === task.taskId
              )
                callbacks.current.onLiveStart?.(`${task.taskId}:${first.payload.data.event_id}`)
            })
            .catch(() => {})
        }
        void refresh(task.taskId).catch(() => {})
      })
      void refresh(task.taskId).catch(() => {})
      return unsubscribe
    })
    return () => {
      active = false
      subscriptions.forEach((unsubscribe) => unsubscribe())
    }
  }, [
    api,
    conversation.conversation.conversationId,
    conversation.tasks.map((task) => task.taskId).join('|')
  ])
  if (!conversation.availableProposals.length && !conversation.tasks.length) return null
  const run = async (id: string) => {
    if (inFlight.current || !api?.proposals) return
    const proposal = conversation.availableProposals.find((p) => p.proposalId === id)
    if (!proposal || Date.parse(proposal.expiresAt) <= Date.now()) return
    inFlight.current = true
    setBusy(true)
    setError('')
    setNotice('')
    let mutation = mutations.current.get(id)
    if (!mutation) {
      mutation = crypto.randomUUID()
      mutations.current.set(id, mutation)
    }
    try {
      const result = await api.proposals.confirmRun({ proposalId: id, clientMutationId: mutation })
      if (!result.ok) setError(result.error.message)
      else if (result.data.conversationId === conversation.conversation.conversationId) {
        callbacks.current.onAdmission?.(result.data.taskId, proposal.exactGoal)
        setNotice(
          `Task admitted as ${result.data.state}. Follow the committed task evidence below.`
        )
      }
    } catch {
      setError('Admission could not be confirmed. No task is automatically resubmitted.')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }
  const cancel = async (id: string) => {
    if (inFlight.current || !api?.tasks) return
    inFlight.current = true
    setBusy(true)
    setError('')
    try {
      const result = await api.tasks.cancel(id)
      if (!result.ok) setError(result.error.message)
      else
        setNotice(
          result.data.state === 'not_running'
            ? 'This task is not running.'
            : 'Cancellation intent is recorded. Engine stop and workspace safety still require verification.'
        )
    } catch {
      setError('Cancellation could not be confirmed. The task may still be active.')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }
  return (
    <section aria-label="Task proposals and status">
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {conversation.availableProposals.map((proposal) => (
        <article key={proposal.proposalId}>
          <h3>Proposed coding task</h3>
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {proposal.exactGoal}
          </pre>
          <p>
            Expires {proposal.expiresAt}. Running requires explicit approval and a verified engine.
          </p>
          <button
            className="secondary-button"
            disabled={busy || Date.parse(proposal.expiresAt) <= now}
            onClick={() => void run(proposal.proposalId)}
          >
            Run Task
          </button>
        </article>
      ))}
      {conversation.availableProposalsTruncated && (
        <p>Only the latest available proposals are shown.</p>
      )}
      {conversation.tasks.slice(0, 21).map((summary) => {
        const view = views[summary.taskId],
          task = view?.task ?? summary
        return (
          <article key={summary.taskId}>
            <p>
              Task {task.taskId}: {task.state}
            </p>
            {view?.task.outcome && <p>Engine outcome: {view.task.outcome.summary}</p>}
            <p>
              {view?.certain
                ? 'Main reports reconciled task evidence.'
                : 'Process cleanup and workspace safety are not verified by this display.'}
            </p>
            {[
              'queued',
              'starting',
              'running',
              'cancel_requested',
              'unknown',
              'needs_reconciliation'
            ].includes(task.state) && (
              <button
                className="text-button"
                disabled={busy || task.state === 'cancel_requested'}
                onClick={() => void cancel(task.taskId)}
              >
                Request cancellation
              </button>
            )}
          </article>
        )
      })}
      {conversation.tasks.length > 21 && (
        <p>Showing the first 21 task records in this conversation snapshot.</p>
      )}
    </section>
  )
}
