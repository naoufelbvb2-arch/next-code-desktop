import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { test, expect, vi } from 'vitest'
import { App } from '../../renderer/App'
import { missionApi, missionEvent } from '../fixtures/mission'

function apiFixture(fail = false, saved = false) {
  const project = {
    projectId: 'project',
    displayName: 'Synthetic project',
    canonicalPathLabel: 'Synthetic workspace',
    available: true
  }
  let persisted = saved,
    answered = false,
    listener = () => {}
  const send = vi.fn(async () => {
    if (fail)
      return {
        ok: false,
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Message could not be saved.',
          retryable: false
        }
      }
    persisted = true
    return {
      ok: true,
      data: {
        conversationId: 'conversation',
        messageId: 'user',
        acceptedAt: '2026-10-22T12:00:00Z',
        deliveryState: 'persisted'
      }
    }
  })
  const api = {
    app: {
      bootstrap: async () => ({
        ok: true,
        data: {
          selectedProject: project,
          selectedConversationId: null,
          discussionModelId: null,
          runtimeStatus: 'ready',
          activeTaskSummaries: [],
          uiPreferences: {
            version: 1,
            savedDockWidth: 360,
            sidebarCollapsed: false,
            ambientLight: true
          }
        }
      })
    },
    models: {
      list: async () => ({
        ok: true,
        data: [
          {
            modelId: 'deepseek-flash',
            displayName: 'DeepSeek Flash',
            providerLabel: 'DeepSeek',
            capabilities: ['discussion'],
            availability: 'available'
          }
        ]
      }),
      setDiscussionPreference: async (modelId: string) => ({ ok: true, data: { modelId } })
    },
    projects: { listRecent: async () => ({ ok: true, data: [project] }) },
    conversations: {
      sendMessage: send,
      list: async () => ({
        ok: true,
        data: {
          conversations: persisted
            ? [
                {
                  conversationId: 'conversation',
                  projectId: 'project',
                  title: 'Synthetic saved conversation',
                  lastMessageAt: null,
                  taskStatusSummary: null
                }
              ]
            : [],
          nextCursor: null
        }
      }),
      read: async () => ({
        ok: true,
        data: {
          conversation: {
            conversationId: 'conversation',
            projectId: 'project',
            title: 'Synthetic saved conversation',
            lastMessageAt: null,
            taskStatusSummary: null
          },
          messages: [
            {
              messageId: 'user',
              role: 'user',
              text: 'Synthetic question',
              deliveryState: 'persisted',
              createdAt: '2026-10-22T12:00:00Z'
            },
            ...(answered
              ? [
                  {
                    messageId: 'assistant',
                    role: 'assistant',
                    text: 'Persisted fixture answer',
                    deliveryState: 'persisted',
                    createdAt: '2026-10-22T12:00:01Z'
                  }
                ]
              : [])
          ],
          tasks: [],
          nextCursor: null,
          inspectionStatus: null,
          disclosureChallenges: [],
          availableProposals: [],
          availableProposalsTruncated: false,
          discussionTurns: [
            {
              userMessageId: 'user',
              status: answered ? 'answered' : 'issued',
              lastErrorCode: null,
              lastAttempt: null
            }
          ]
        }
      }),
      subscribeConversation: (_id: string, callback: () => void) => {
        listener = callback
        return () => {
          listener = () => {}
        }
      },
      saveDockState: async () => ({
        ok: false,
        error: { code: 'RUNTIME_NOT_READY', message: 'Fixture', retryable: false }
      })
    }
  }
  vi.stubGlobal('nextCode', api)
  return {
    send,
    complete: () => {
      answered = true
      listener()
    }
  }
}
test('E05-23/35 unknown persisted Dock never auto-opens or overwrites state; explicit user Panels remains available', async () => {
  apiFixture(false, true)
  const api = window.nextCode!,
    f = missionApi([])
  api.tasks = f.api
  const read = api.conversations.read
  api.conversations.read = async (...args) => {
    const result = await read(...args)
    if (result.ok) result.data.tasks = [{ ...f.task, state: 'starting' }]
    return result
  }
  const savedDock = vi.spyOn(api.conversations, 'saveDockState')
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: 'Synthetic saved conversation' }))
  await waitFor(() => expect(f.api.readEvents).toHaveBeenCalled())
  await act(async () => {
    f.setEvents([missionEvent(1, 'task.started')])
    f.hint(1)
  })
  expect(screen.queryByRole('complementary', { name: 'Right Dock' })).not.toBeInTheDocument()
  expect(savedDock).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Open Right Dock' }))
  await waitFor(() => expect(savedDock).toHaveBeenCalled())
})

test('P5-UI01 explicit model choice, one acceptance on double click, waiting and only committed assistant rendering', async () => {
  const fixture = apiFixture(),
    user = userEvent.setup()
  render(<App />)
  await user.selectOptions(
    await screen.findByRole('combobox', { name: 'Discussion model' }),
    'deepseek-flash'
  )
  await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Synthetic question')
  await user.dblClick(screen.getByRole('button', { name: 'Send message' }))
  await screen.findByText('Waiting for the selected discussion model…')
  expect(fixture.send).toHaveBeenCalledTimes(1)
  expect(screen.queryByText('Persisted fixture answer')).not.toBeInTheDocument()
  fixture.complete()
  await screen.findByText('Persisted fixture answer')
  expect(screen.queryByText('Waiting for the selected discussion model…')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
})
test('P5-UI02 failed T1 acceptance retains the local draft and shows no phantom saved assistant', async () => {
  const fixture = apiFixture(true),
    user = userEvent.setup()
  render(<App />)
  await user.selectOptions(
    await screen.findByRole('combobox', { name: 'Discussion model' }),
    'deepseek-flash'
  )
  await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Synthetic question')
  await user.click(screen.getByRole('button', { name: 'Send message' }))
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('Message could not be saved.')
  )
  expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('Synthetic question')
  expect(fixture.send).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('region', { name: 'Conversation messages' })).not.toBeInTheDocument()
})

test.each(['edit current draft', 'open another draft'])(
  'P5-UI03 delayed acceptance preserves newer unsent text: %s',
  async (operation) => {
    const fixture = apiFixture(),
      user = userEvent.setup(),
      original = fixture.send.getMockImplementation()!
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    fixture.send.mockImplementationOnce(async () => {
      await gate
      return original()
    })
    render(<App />)
    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Discussion model' }),
      'deepseek-flash'
    )
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Synthetic question')
    await user.click(screen.getByRole('button', { name: 'Send message' }))
    if (operation === 'open another draft')
      await user.click(screen.getByRole('button', { name: 'New Conversation' }))
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'New unsent text')
    await act(async () => {
      release()
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send message' })).toBeEnabled())
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue(
      operation === 'open another draft' ? 'New unsent text' : 'Synthetic questionNew unsent text'
    )
    if (operation === 'open another draft')
      expect(
        screen.queryByText('Waiting for the selected discussion model…')
      ).not.toBeInTheDocument()
    expect(fixture.send).toHaveBeenCalledTimes(1)
  }
)
