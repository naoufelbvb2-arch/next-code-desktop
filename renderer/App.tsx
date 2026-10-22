import { useEffect, useReducer, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Sidebar } from './components/Sidebar'
import { RightDock } from './components/RightDock'
import { Icon } from './components/Icon'
import { ChatPage, ProjectsPage, AgentsPage, SettingsPage } from './pages/Pages'
import {
  activeDraft,
  currentDock,
  initialState,
  sessionReducer,
  type DockState
} from './state/session'
import { fitLayout } from './state/layout'
import { useDiscussion } from './state/discussion'
import { Composer } from './components/Composer'
import { ConversationView } from './components/ConversationView'

const titles = {
  chat: 'New conversation',
  projects: 'Projects',
  agents: 'Agents',
  settings: 'Settings'
}
const viewportWidth = () =>
  document.documentElement.getBoundingClientRect().width || window.innerWidth
export function App() {
  const [state, dispatch] = useReducer(sessionReducer, initialState)
  const discussion = useDiscussion()
  const conversationDocks = useRef(new Map<string, DockState>())
  const [viewport, setViewport] = useState(viewportWidth)
  const heading = useRef<HTMLHeadingElement>(null)
  const previousRoute = useRef(state.page)
  useEffect(() => {
    const resize = () => setViewport(viewportWidth())
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  useEffect(() => {
    if (previousRoute.current !== state.page) {
      heading.current?.focus()
      previousRoute.current = state.page
    }
  }, [state.page])
  const dock = currentDock(state)
  const layout = fitLayout(viewport, state.collapsed, dock.open, state.dockWidth)
  const draft = activeDraft(state)
  const composer = {
    models: discussion.models,
    model: discussion.model,
    projectName: discussion.project?.displayName,
    ready: discussion.ready,
    sending: discussion.sending,
    chooseModel: (id: string) => {
      void discussion.chooseModel(id)
    },
    send: () => {
      void discussion.send(draft.text, draft.id, () =>
        dispatch({ type: 'acceptDraft', id: draft.id, text: draft.text })
      )
    }
  }
  useEffect(() => {
    if (!discussion.conversationId || state.page !== 'chat' || !window.nextCode) return
    conversationDocks.current.set(discussion.conversationId, { ...dock })
    const timer = setTimeout(() => {
      void window.nextCode.conversations.saveDockState({
        conversationId: discussion.conversationId!,
        dockState: {
          visible: dock.open,
          primaryTab: dock.tab === 'files' ? 'Files' : 'Terminal',
          terminalSubtab: 'Agent Logs',
          explicitlyHidden: dock.manuallyHidden
        },
        clientMutationId: crypto.randomUUID()
      })
    }, 250)
    return () => clearTimeout(timer)
  }, [discussion.conversationId, dock.open, dock.tab, dock.manuallyHidden, state.page])
  const toggleSidebar = () => {
    const expanding = layout.compact
    const expanded = fitLayout(viewport, false, dock.open, state.dockWidth)
    dispatch({
      type: 'sidebar',
      collapsed: !expanding,
      closeDock: expanding && (expanded.compact || !expanded.dockVisible) && dock.open
    })
  }
  const shellStyle = {
    '--sidebar-width': `${layout.sidebar}px`,
    '--dock-width': `${layout.dock}px`
  } as CSSProperties
  return (
    <div
      className={`app ${state.reduceMotion ? 'reduce-motion' : ''} ${!state.ambient ? 'no-ambient' : ''}`}
    >
      <a className="skip-link" href="#workspace">
        Skip to workspace
      </a>
      <div className="ambient-waves" aria-hidden="true">
        <div className="wave wave-blue" />
        <div className="wave wave-violet" />
      </div>
      <div className={`app-shell ${layout.dockVisible ? 'with-dock' : ''}`} style={shellStyle}>
        <Sidebar
          state={state}
          compact={layout.compact}
          dispatch={(action) => {
            if (action.type === 'newDraft' || action.type === 'selectDraft') discussion.reset()
            dispatch(action)
          }}
          onToggle={toggleSidebar}
          history={discussion.history}
          onConversation={(id) => {
            discussion.open(id)
            dispatch({ type: 'navigate', page: 'chat' })
            dispatch({
              type: 'restoreChatDock',
              dock: conversationDocks.current.get(id) ?? {
                open: false,
                tab: 'terminal',
                manuallyHidden: false
              }
            })
          }}
          projectName={discussion.project?.displayName}
          discussionReady={discussion.ready}
        />
        <main id="workspace" className="workspace" tabIndex={-1}>
          <div className="workspace-toolbar">
            <h2 ref={heading} tabIndex={-1}>
              {state.page === 'chat' && discussion.conversation
                ? discussion.conversation.conversation.title
                : titles[state.page]}
              <span>
                {state.page === 'chat'
                  ? discussion.conversationId
                    ? 'Saved conversation'
                    : 'Unsent draft'
                  : 'Local workspace'}
              </span>
            </h2>
            <button
              className={`dock-toggle ${layout.dockVisible ? 'is-active' : ''}`}
              aria-label={layout.dockVisible ? 'Hide Right Dock' : 'Open Right Dock'}
              aria-expanded={layout.dockVisible}
              title={layout.dockVisible ? 'Hide Right Dock' : 'Open Right Dock'}
              onClick={() => dispatch({ type: 'dock', open: !layout.dockVisible })}
            >
              <Icon name="panels" size={18} />
              <span>Panels</span>
            </button>
          </div>
          {dock.open && !layout.dockVisible && (
            <p className="fit-hint" role="status">
              Make the window wider to open panels without crowding your workspace.
            </p>
          )}
          <div className="page-scroll">
            {discussion.error && (
              <p role="alert" className="fit-hint">
                {discussion.error}
              </p>
            )}
            {state.page === 'chat' && discussion.conversation && (
              <>
                <ConversationView
                  messages={discussion.conversation.messages.map((message) => ({
                    id: message.messageId,
                    role: message.role,
                    text: message.text
                  }))}
                  composer={
                    <Composer
                      text={draft.text}
                      onChange={(text) => dispatch({ type: 'editDraft', text })}
                      discussion={composer}
                    />
                  }
                />
                {discussion.conversation.discussionTurns.some((turn) =>
                  ['pending', 'issued'].includes(turn.status)
                ) && <p role="status">Waiting for the selected discussion model…</p>}
                {discussion.conversation.discussionTurns.some((turn) =>
                  ['failed', 'unknown'].includes(turn.status)
                ) && (
                  <p role="status">
                    A discussion attempt failed or is uncertain. Your message is saved; it will not
                    be resent automatically.
                  </p>
                )}
              </>
            )}
            {state.page === 'chat' && !discussion.conversation && (
              <ChatPage
                text={draft.text}
                onChange={(text) => dispatch({ type: 'editDraft', text })}
                discussion={composer}
              />
            )}
            {state.page === 'projects' && (
              <ProjectsPage
                openFiles={() => dispatch({ type: 'dock', open: true, tab: 'files' })}
                choose={
                  discussion.models.length
                    ? () => {
                        void discussion.chooseProject()
                      }
                    : undefined
                }
                projects={discussion.projects}
                select={(id) => {
                  void discussion.chooseProject(id)
                }}
              />
            )}
            {state.page === 'agents' && <AgentsPage />}
            {state.page === 'settings' && (
              <SettingsPage
                reduced={state.reduceMotion}
                ambient={state.ambient}
                setReduced={(reduced) => dispatch({ type: 'motion', reduced })}
                setAmbient={(enabled) => dispatch({ type: 'ambient', enabled })}
              />
            )}
          </div>
        </main>
        {layout.dockVisible && (
          <RightDock
            tab={dock.tab}
            width={layout.dock}
            onTab={(tab) => dispatch({ type: 'dock', tab })}
            onClose={() => dispatch({ type: 'dock', open: false })}
            onWidth={(width) => dispatch({ type: 'width', width })}
          />
        )}
      </div>
    </div>
  )
}
