import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { test, expect, vi } from 'vitest'
import { App } from '../../renderer/App'

test('R03-V01 I06-T05 unknown advertised route readiness cannot enable selection or sending, even with a saved model and READY transport', async () => {
  const send = vi.fn(),
    choose = vi.fn()
  const project = {
    projectId: 'r03_project',
    displayName: 'Synthetic project',
    canonicalPathLabel: 'Synthetic workspace',
    available: true
  }
  vi.stubGlobal('nextCode', {
    app: {
      bootstrap: async () => ({
        ok: true,
        data: {
          selectedProject: project,
          selectedConversationId: null,
          discussionModelId: 'deepseek-flash',
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
    projects: { listRecent: async () => ({ ok: true, data: [project] }) },
    models: {
      list: async () => ({
        ok: true,
        data: [
          {
            modelId: 'deepseek-flash',
            displayName: 'DeepSeek Flash',
            providerLabel: 'DeepSeek',
            capabilities: ['discussion'],
            availability: 'unknown'
          }
        ]
      }),
      setDiscussionPreference: choose
    },
    conversations: {
      list: async () => ({ ok: true, data: { conversations: [], nextCursor: null } }),
      sendMessage: send
    }
  })
  const user = userEvent.setup()
  render(<App />)
  await waitFor(() => expect(screen.getByRole('option', { name: /DeepSeek Flash/ })).toBeDisabled())
  await user.type(
    screen.getByRole('textbox', { name: 'Message' }),
    'Synthetic draft without route readiness'
  )
  expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
  expect(screen.getByText(/Choose an available model and a project/)).toBeVisible()
  expect(send).not.toHaveBeenCalled()
  expect(choose).not.toHaveBeenCalled()
  vi.unstubAllGlobals()
})
