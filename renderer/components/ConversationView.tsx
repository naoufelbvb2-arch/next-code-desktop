import type { ReactNode } from 'react'
import { Icon } from './Icon'

// Presentation-only props. Durable acknowledgement, DTOs and dispatch are owned
// by later stages; P1 mounts this component only in isolated UI fixture tests.
export interface PresentedMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  results?: {
    title: 'Execution Plan' | 'Modified Files' | 'Verification Results'
    content: string
  }[]
}
export function ConversationView({
  messages,
  composer
}: {
  messages: readonly PresentedMessage[]
  composer: ReactNode
}) {
  return (
    <div className="conversation-view">
      <section className="message-history" aria-label="Conversation messages">
        {messages.map((message) => (
          <article className={`conversation-message ${message.role}`} key={message.id}>
            <div className="message-role">
              <Icon name={message.role === 'user' ? 'message' : 'spark'} size={16} />
              <h3>{message.role === 'user' ? 'You' : 'Next Code'}</h3>
            </div>
            <p>{message.text}</p>
            {message.results?.map((result) => (
              <details className="result-card" key={result.title}>
                <summary>{result.title}</summary>
                <pre>{result.content}</pre>
              </details>
            ))}
          </article>
        ))}
      </section>
      {composer}
    </div>
  )
}
