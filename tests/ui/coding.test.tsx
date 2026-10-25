import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { test, expect, vi } from 'vitest'
import { TaskControls } from '../../renderer/components/TaskControls'
import type { Output } from '../../contracts/ipc'
import { missionApi, missionEvent } from '../fixtures/mission'

test('E05-08/23/35 only a new live committed Chat start triggers once; replay/remount and stale callbacks do not open Dock', async () => {
  const value = conversation()
  value.availableProposals = []
  value.tasks = [
    { taskId: 'task', conversationId: 'conversation', projectId: 'project', state: 'starting' }
  ]
  const f = missionApi([]),
    open = vi.fn()
  vi.stubGlobal('nextCode', { tasks: f.api })
  let view = render(<TaskControls conversation={value} onLiveStart={open} />)
  await waitFor(() => expect(f.api.readEvents).toHaveBeenCalled())
  f.setEvents([missionEvent(1, 'task.started')])
  await act(async () => {
    f.hint(1)
    f.hint(1)
  })
  await waitFor(() => expect(open).toHaveBeenCalledTimes(1))
  view.unmount()
  view = render(<TaskControls conversation={value} onLiveStart={open} />)
  await waitFor(() => expect(f.api.readEvents.mock.calls.length).toBeGreaterThan(2))
  await act(async () => {
    f.hint(1)
    f.listeners[0]({ type: 'TaskEventCommitted', taskId: 'task', sequence: 1 })
  })
  expect(open).toHaveBeenCalledTimes(1)
  view.unmount()
})

test('E05-35 initial snapshot containing historical start is never a live start even with repeated later hints', async () => {
  const value = conversation()
  value.availableProposals = []
  value.tasks = [
    { taskId: 'task', conversationId: 'conversation', projectId: 'project', state: 'running' }
  ]
  const f = missionApi([missionEvent(1, 'task.started')]),
    open = vi.fn()
  vi.stubGlobal('nextCode', { tasks: f.api })
  render(<TaskControls conversation={value} onLiveStart={open} />)
  await waitFor(() => expect(f.api.readEvents).toHaveBeenCalled())
  await act(async () => {
    f.hint(1)
  })
  expect(open).not.toHaveBeenCalled()
})

function conversation() {
  return {
    conversation: { conversationId: 'conversation' },
    tasks: [],
    availableProposals: [
      {
        proposalId: 'proposal',
        conversationId: 'conversation',
        projectId: 'project',
        exactGoal: 'Exact synthetic goal <script>inert</script>',
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 900000).toISOString(),
        state: 'available'
      }
    ],
    availableProposalsTruncated: false
  } as unknown as Output<'conversations.read'>
}
test('P7-U01 Main-issued exact proposal needs explicit click; duplicate click and uncertain retry reuse one mutation identity', async () => {
  const confirm = vi
    .fn()
    .mockRejectedValueOnce(new Error('Synthetic lost ACK'))
    .mockResolvedValue({
      ok: true,
      data: {
        taskId: 'task',
        conversationId: 'conversation',
        projectId: 'project',
        state: 'starting'
      }
    })
  vi.stubGlobal('nextCode', { proposals: { confirmRun: confirm } })
  const view = render(<TaskControls conversation={conversation()} />)
  expect(confirm).not.toHaveBeenCalled()
  expect(view.container.querySelector('script')).toBeNull()
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Run Task' }))
    fireEvent.click(screen.getByRole('button', { name: 'Run Task' }))
  })
  expect(confirm).toHaveBeenCalledTimes(1)
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: 'Run Task' }))
  await waitFor(() => expect(confirm).toHaveBeenCalledTimes(2))
  expect(confirm.mock.calls[0][0]).toEqual(confirm.mock.calls[1][0])
  expect(await screen.findByRole('status')).toHaveTextContent('Task admitted as starting')
  expect(screen.queryByText(/Engine outcome:/)).not.toBeInTheDocument()
})
test('P7-U02 expired proposals disabled and backend unavailability is shown without optimistic task success', async () => {
  const value = conversation()
  value.availableProposals[0].expiresAt = new Date(Date.now() - 1).toISOString()
  const confirm = vi.fn(async () => ({
    ok: false,
    error: { message: 'Real coding is blocked pending engine approval.' }
  }))
  vi.stubGlobal('nextCode', { proposals: { confirmRun: confirm } })
  const view = render(<TaskControls conversation={value} />)
  expect(screen.getByRole('button', { name: 'Run Task' })).toBeDisabled()
  value.availableProposals[0].expiresAt = new Date(Date.now() + 60000).toISOString()
  view.rerender(<TaskControls conversation={{ ...value }} />)
  fireEvent.click(screen.getByRole('button', { name: 'Run Task' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('blocked')
  expect(screen.queryByText(/Task admitted/)).not.toBeInTheDocument()
})
test('P7-U03 subscribe-before-snapshot, cancellation remains intent and navigation never confirms or re-executes a task', async () => {
  const order: string[] = [],
    confirm = vi.fn(),
    cancel = vi.fn(async () => ({ ok: true, data: { taskId: 'task', state: 'requested' } })),
    unsub = vi.fn()
  vi.stubGlobal('nextCode', {
    proposals: { confirmRun: confirm },
    tasks: {
      subscribeTask: () => {
        order.push('subscribe')
        return unsub
      },
      read: async () => {
        order.push('read')
        return {
          ok: true,
          data: {
            taskId: 'task',
            conversationId: 'conversation',
            projectId: 'project',
            state: 'running',
            outcome: null
          }
        }
      },
      readEvents: async () => ({ ok: true, data: { stateIsCertain: false } }),
      cancel
    }
  })
  const value = conversation()
  value.availableProposals = []
  value.tasks = [
    { taskId: 'task', conversationId: 'conversation', projectId: 'project', state: 'running' }
  ]
  const view = render(<TaskControls conversation={value} />)
  await waitFor(() => expect(order).toEqual(['subscribe', 'read']))
  fireEvent.click(screen.getByRole('button', { name: 'Request cancellation' }))
  expect(await screen.findByRole('status')).toHaveTextContent(
    'stop and workspace safety still require verification'
  )
  expect(confirm).not.toHaveBeenCalled()
  view.unmount()
  expect(unsub).toHaveBeenCalledTimes(1)
  expect(cancel).toHaveBeenCalledTimes(1)
})
