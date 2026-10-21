import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConversationView } from '../../renderer/components/ConversationView'
import { FilePreview } from '../../renderer/components/FilePreview'
import { Composer } from '../../renderer/components/Composer'
import { messages } from '../fixtures/presentation'

describe('isolated presentation fixtures — never live task evidence', () => {
  it('renders coding conversation cards, expansion and safe text', async () => {
    const user = userEvent.setup()
    render(
      <ConversationView messages={messages} composer={<Composer text="" onChange={() => {}} />} />
    )
    const plan = screen.getByText('Execution Plan')
    await user.click(plan)
    expect(plan.closest('details')).toHaveAttribute('open')
    expect(screen.getByText('Fixture: inspect one example file.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
  })
  it('keeps preview read-only and treats markup as text', async () => {
    const user = userEvent.setup()
    const close = vi.fn()
    render(
      <aside aria-label="Files Dock">
        <FilePreview
          name="fixture.txt"
          content={{ kind: 'text', text: '<script>alert("fixture")</script>' }}
          onClose={close}
        />
      </aside>
    )
    expect(screen.getByLabelText('File contents').querySelector('script')).toBeNull()
    expect(screen.getByText('<script>alert("fixture")</script>')).toBeVisible()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close file preview' }))
    expect(close).toHaveBeenCalledOnce()
  })
  it.each(['Binary file preview is unavailable.', 'This file cannot be read.'])(
    'shows truthful unavailable preview: %s',
    (reason) => {
      render(
        <FilePreview
          name="fixture.bin"
          content={{ kind: 'unavailable', reason }}
          onClose={() => {}}
        />
      )
      expect(screen.getByRole('status')).toHaveTextContent(reason)
      expect(screen.queryByLabelText('File contents')).not.toBeInTheDocument()
    }
  )
})
