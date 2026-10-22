import { Icon } from './Icon'
import type { Page, SessionState, Action } from '../state/session'
import type { Dispatch } from 'react'

const navigation = [
  { page: 'projects', label: 'Projects', icon: 'folder' },
  { page: 'agents', label: 'Agents', icon: 'agents' },
  { page: 'settings', label: 'Settings', icon: 'settings' }
] as const
export function Sidebar({
  state,
  compact,
  dispatch,
  onToggle,
  history = [],
  onConversation,
  projectName,
  discussionReady = false
}: {
  state: SessionState
  compact: boolean
  dispatch: Dispatch<Action>
  onToggle: () => void
  history?: { conversationId: string; title: string }[]
  onConversation?: (id: string) => void
  projectName?: string
  discussionReady?: boolean
}) {
  const drafts = state.drafts.filter((d) => d.text.trim())
  const navigate = (page: Page) => dispatch({ type: 'navigate', page })
  return (
    <aside className={`sidebar glass ${compact ? 'sidebar-compact' : ''}`} aria-label="Sidebar">
      <div className="sidebar-brand">
        <span className="brand-text">
          Next Code<span>DESKTOP</span>
        </span>
        <button
          className="icon-button"
          aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
          title={compact ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggle}
        >
          <Icon name="panels" />
        </button>
      </div>
      <button
        className="new-conversation"
        aria-label="New Conversation"
        title="New Conversation"
        onClick={() => dispatch({ type: 'newDraft' })}
      >
        <Icon name="plus" />
        <span>New Conversation</span>
      </button>
      <nav aria-label="Main navigation">
        {navigation.map((item) => (
          <button
            key={item.page}
            aria-current={state.page === item.page ? 'page' : undefined}
            className={`nav-item ${state.page === item.page ? 'selected' : ''}`}
            aria-label={item.label}
            title={item.label}
            onClick={() => navigate(item.page)}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
            {item.page === 'agents' && (
              <span className="nav-arrow">
                <Icon name="chevron" size={14} />
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="sidebar-history">
        <p className="section-label">Recent conversations</p>
        {history.length === 0 && (
          <div className="history-empty">
            <Icon name="clock" size={17} />
            <span>No saved conversations yet</span>
          </div>
        )}
        {history.map((item) => (
          <button
            className="draft-item"
            key={item.conversationId}
            title={item.title}
            onClick={() => onConversation?.(item.conversationId)}
          >
            <Icon name="message" size={16} />
            <span>{item.title}</span>
          </button>
        ))}
        {drafts.length > 0 && (
          <div className="draft-list">
            <p className="section-label">Drafts · this session</p>
            {drafts.map((draft) => (
              <button
                key={draft.id}
                className={`draft-item ${state.page === 'chat' && state.activeDraft === draft.id ? 'selected' : ''}`}
                aria-label={`Open draft: ${draft.text.slice(0, 40)}`}
                title={draft.text.slice(0, 80)}
                onClick={() => dispatch({ type: 'selectDraft', id: draft.id })}
              >
                <Icon name="message" size={16} />
                <span>{draft.text.split('\n')[0]}</span>
                <small>Draft</small>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="sidebar-bottom">
        <button
          className="project-card"
          aria-label="Choose a project"
          title="Choose a project"
          onClick={() => navigate('projects')}
        >
          <span className="project-icon">
            <Icon name="folder" />
          </span>
          <span className="project-copy">
            <strong>{projectName ?? 'No project selected'}</strong>
            <small>Local workspace</small>
          </span>
          <Icon name="chevron" size={14} />
        </button>
        <div className="connection-label">
          <span className="status-dot" />
          <span>
            {discussionReady ? 'Discussion ready · coding unavailable' : 'Engine not connected'}
          </span>
        </div>
      </div>
    </aside>
  )
}
