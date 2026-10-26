import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { test, expect, vi } from 'vitest'
import { MissionControl } from '../../renderer/components/MissionControl'
import { missionApi, missionEvent, workerEvent } from '../fixtures/mission'

test('E05-14/32 bounded task history window can still reach later pages beyond 200 without task control', async () => {
  const f = missionApi([])
  let page = 0
  f.api.list.mockImplementation(async () => ({
    ok: true,
    data: {
      tasks: Array.from({ length: 40 }, (_, i) => ({
        ...f.task,
        taskId: 'task_' + (page * 40 + i)
      })),
      nextCursor: 'page_' + ++page
    }
  }))
  f.api.read.mockImplementation(async (id: string) => ({
    ok: true,
    data: { ...f.task, taskId: id }
  }))
  f.api.readEvents.mockImplementation(async (q: { taskId: string; afterSequence: number }) => ({
    ok: true,
    data: {
      taskId: q.taskId,
      events: [],
      nextSequence: q.afterSequence,
      completeThrough: 0,
      hasGap: false,
      stateIsCertain: false
    }
  }))
  vi.stubGlobal('nextCode', { tasks: f.api })
  render(<MissionControl projectId="project" />)
  await screen.findByRole('option', { name: 'task_39 · running' })
  for (let n = 1; n <= 5; n++) {
    fireEvent.click(screen.getByRole('button', { name: 'More missions' }))
    await screen.findByRole('option', { name: `task_${(n + 1) * 40 - 1} · running` })
  }
  expect(screen.getAllByRole('option').length).toBeLessThanOrEqual(201)
  expect(screen.getByRole('button', { name: 'More missions' })).toBeVisible()
})

test('E05-07/24/30/31/36 real DTO limits show honest unknown cleanup/goal/liveness and empty worker inspector', async () => {
  const f = missionApi([missionEvent(1, 'task.started')])
  vi.stubGlobal('nextCode', { tasks: f.api })
  render(<MissionControl projectId="project" />)
  await screen.findByText('Task task')
  expect(screen.getByText(/Windows cleanup/)).toHaveTextContent('not verified or not exposed')
  expect(screen.getByText(/Approved goal:/)).toHaveTextContent('Exact persisted synthetic goal')
  expect(screen.getByText(/No verified worker events/)).toBeVisible()
  expect(screen.queryByText('SCOUT')).not.toBeInTheDocument()
  expect(screen.queryByText(/Verified Safe Cleanup/)).not.toBeInTheDocument()
})
test('E05-04/05/06/27/34 synthetic repeated-role selectors and Inspector escape XSS without attributing task tests to worker', async () => {
  const f = missionApi([
    missionEvent(1, 'task.started'),
    workerEvent(2, 'a'),
    workerEvent(3, 'b'),
    workerEvent(4, 'a', 'SCOUT', true, '<img src=x onerror=alert(1)>')
  ])
  vi.stubGlobal('nextCode', { tasks: f.api })
  const { container } = render(<MissionControl projectId="project" />)
  await screen.findByText('Task task')
  fireEvent.click(screen.getByRole('button', { name: 'SCOUT / a — SUCCESS' }))
  expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeVisible()
  expect(container.querySelector('img')).toBeNull()
  expect(screen.getByText(/per-worker files and tests/)).toBeVisible()
  expect(
    screen.getByRole('button', { name: 'SCOUT / b — started; live status unverified' })
  ).toBeVisible()
  expect(screen.getByText(/Admission \/ durable state/)).toHaveTextContent('running')
  expect(screen.getByText(/Engine outcome:/)).toHaveTextContent('unknown')
})

test('CP-001 historical exact goal is escaped text after remount and does not execute markup', async () => {
  const f = missionApi([])
  f.task.exactGoal = '<img src=x onerror=alert(1)> Exact original goal'
  vi.stubGlobal('nextCode', { tasks: f.api })
  const view = render(<MissionControl projectId="project" />)
  await screen.findByText(/Exact original goal/)
  expect(view.container.querySelector('img')).toBeNull()
  view.unmount()
  const restored = render(<MissionControl projectId="project" />)
  await screen.findByText(/Exact original goal/)
  expect(restored.container.querySelector('img')).toBeNull()
})
test('E05-11/16/32 I08-T55 mounted timeline stays at 100 rows and gap/partial states remain visible', async () => {
  const f = missionApi(Array.from({ length: 240 }, (_, i) => missionEvent(i + 1)))
  vi.stubGlobal('nextCode', { tasks: f.api })
  render(<MissionControl projectId="project" />)
  await screen.findByText('Task task')
  await waitFor(() =>
    expect(screen.getByRole('list', { name: 'Committed events' }).children).toHaveLength(100)
  )
  expect(screen.getByText(/Bounded visible window/)).toBeVisible()
  expect(f.api.readEvents).toHaveBeenCalledTimes(4)
  fireEvent.click(screen.getByRole('button', { name: 'Later visible events' }))
  expect(
    screen.getByRole('list', { name: 'Committed events' }).children.length
  ).toBeLessThanOrEqual(100)
})
