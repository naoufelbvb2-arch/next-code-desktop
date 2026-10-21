import { useEffect, useReducer, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Sidebar } from './components/Sidebar'
import { RightDock } from './components/RightDock'
import { Icon } from './components/Icon'
import { ChatPage, ProjectsPage, AgentsPage, SettingsPage } from './pages/Pages'
import { activeDraft, currentDock, initialState, sessionReducer } from './state/session'
import { fitLayout } from './state/layout'

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
          dispatch={dispatch}
          onToggle={toggleSidebar}
        />
        <main id="workspace" className="workspace" tabIndex={-1}>
          <div className="workspace-toolbar">
            <h2 ref={heading} tabIndex={-1}>
              {titles[state.page]}
              <span>{state.page === 'chat' ? 'Unsent draft' : 'Local workspace'}</span>
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
            {state.page === 'chat' && (
              <ChatPage
                text={draft.text}
                onChange={(text) => dispatch({ type: 'editDraft', text })}
              />
            )}
            {state.page === 'projects' && (
              <ProjectsPage
                openFiles={() => dispatch({ type: 'dock', open: true, tab: 'files' })}
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
