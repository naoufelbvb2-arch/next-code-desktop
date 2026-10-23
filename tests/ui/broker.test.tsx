import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { FilesBrowser } from '../../renderer/components/FilesBrowser'
import { DisclosureControls } from '../../renderer/components/DisclosureControls'
import type { Output } from '../../contracts/ipc'

const project = {
  projectId: 'project_a',
  displayName: 'Atlas project',
  canonicalPathLabel: 'Synthetic workspace',
  available: true
}
function deferred<T>() {
  let resolve!: (v: T) => void
  return {
    promise: new Promise<T>((r) => {
      resolve = r
    }),
    resolve: (v: T) => resolve(v)
  }
}
const page = (id: string) => ({
  ok: true as const,
  data: {
    projectId: id,
    relativeDir: '.',
    entries: [{ relativePath: 'notes.custom', kind: 'file' as const, sizeBytes: 20 }],
    nextCursor: null
  }
})

test('P6-U01 pending preview from A is never shown under selected project B', async () => {
  const pending = deferred<unknown>()
  const api = {
    projects: {
      listFiles: vi.fn(async (id: string) => page(id)),
      previewFile: vi.fn(() => pending.promise)
    }
  }
  vi.stubGlobal('nextCode', api)
  const view = render(<FilesBrowser project={project} />)
  await screen.findByRole('button', { name: 'File: notes.custom' })
  fireEvent.click(screen.getByRole('button', { name: 'File: notes.custom' }))
  view.rerender(
    <FilesBrowser project={{ ...project, projectId: 'project_b', displayName: 'Second project' }} />
  )
  await act(async () =>
    pending.resolve({
      ok: true,
      data: {
        projectId: 'project_a',
        relativePath: 'notes.custom',
        text: 'Old project canary',
        truncated: false,
        sourceRevisionLabel: 'old'
      }
    })
  )
  expect(screen.queryByText('Old project canary')).not.toBeInTheDocument()
  expect(screen.getByText(/Second project/)).toBeInTheDocument()
})

test('P6-U02 preview is escaped local text and never calls a discussion or disclosure mutation', async () => {
  const share = vi.fn(),
    send = vi.fn()
  vi.stubGlobal('nextCode', {
    projects: {
      listFiles: async () => page(project.projectId),
      previewFile: async () => ({
        ok: true,
        data: {
          projectId: project.projectId,
          relativePath: 'notes.custom',
          text: '<script>throw new Error("inert")</script>',
          truncated: true,
          sourceRevisionLabel: 'sha256:fixture'
        }
      })
    },
    disclosures: { respond: share },
    conversations: { sendMessage: send }
  })
  render(<FilesBrowser project={project} />)
  fireEvent.click(await screen.findByRole('button', { name: 'File: notes.custom' }))
  const preview = await screen.findByRole('region', { name: 'Safe file preview' })
  expect(preview.querySelector('script')).toBeNull()
  expect(preview.textContent).toContain('<script>')
  expect(share).not.toHaveBeenCalled()
  expect(send).not.toHaveBeenCalled()
})

test('P6-U03 only explicit source consent clicks mutate authority, and uncertain retries reuse the exact mutation identity', async () => {
  const respond = vi
    .fn()
    .mockRejectedValueOnce(new Error('Synthetic lost acknowledgement'))
    .mockResolvedValue({ ok: true, data: {} })
  vi.stubGlobal('nextCode', {
    disclosures: { list: async () => ({ ok: true, data: [] }), respond, revoke: vi.fn() }
  })
  const conversation = {
    disclosureChallenges: [
      {
        challengeId: 'challenge',
        projectId: project.projectId,
        providerLabel: 'DeepSeek',
        scopeDescription: 'Only screened source excerpts'
      }
    ],
    inspectionStatus: {
      state: 'partial',
      discoveredCount: 2,
      actuallyReadCount: 0,
      excludedCount: 1,
      coverageNote: 'Partial evidence only.'
    }
  } as unknown as Output<'conversations.read'>
  render(<DisclosureControls project={project} conversation={conversation} />)
  expect(respond).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Allow source sharing' }))
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: 'Allow source sharing' }))
  await waitFor(() => expect(respond).toHaveBeenCalledTimes(2))
  expect(respond.mock.calls[0][0]).toEqual(respond.mock.calls[1][0])
  expect(screen.getByRole('status')).toHaveTextContent('Handed to Discussion: 0')
  expect(screen.getByRole('status')).not.toHaveTextContent('%')
})
