import type { PresentedMessage } from '../../renderer/components/ConversationView'

// Synthetic UI fixtures: never imported by a production entry or persisted.
export const messages: PresentedMessage[] = [
  { id: 'fixture-user', role: 'user', text: 'Fixture only: review a result-card layout.' },
  {
    id: 'fixture-assistant',
    role: 'assistant',
    text: 'Synthetic presentation data, not an engine outcome.',
    results: [
      { title: 'Execution Plan', content: 'Fixture: inspect one example file.' },
      { title: 'Modified Files', content: 'Fixture only. No actual file was modified.' },
      { title: 'Verification Results', content: 'Fixture only. No engine verification was run.' }
    ]
  }
]
