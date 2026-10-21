export type Page = 'chat' | 'projects' | 'agents' | 'settings'
export type DockTab = 'terminal' | 'files'
export interface DockState {
  open: boolean
  tab: DockTab
  manuallyHidden: boolean
}
export interface Draft {
  id: number
  text: string
  dock: DockState
}
export interface SessionState {
  page: Page
  activeDraft: number
  nextId: number
  drafts: Draft[]
  visitDock: DockState
  collapsed: boolean
  dockWidth: number
  reduceMotion: boolean
  ambient: boolean
}
const closedDock = (tab: DockTab = 'terminal'): DockState => ({
  open: false,
  tab,
  manuallyHidden: false
})
export const initialState: SessionState = {
  page: 'chat',
  activeDraft: 1,
  nextId: 2,
  drafts: [{ id: 1, text: '', dock: closedDock() }],
  visitDock: closedDock(),
  collapsed: false,
  dockWidth: 360,
  reduceMotion: false,
  ambient: true
}
export type Action =
  | { type: 'navigate'; page: Page }
  | { type: 'newDraft' }
  | { type: 'selectDraft'; id: number }
  | { type: 'editDraft'; text: string }
  | { type: 'dock'; open?: boolean; tab?: DockTab }
  | { type: 'sidebar'; collapsed: boolean; closeDock?: boolean }
  | { type: 'width'; width: number }
  | { type: 'motion'; reduced: boolean }
  | { type: 'ambient'; enabled: boolean }

export const activeDraft = (state: SessionState) =>
  state.drafts.find((draft) => draft.id === state.activeDraft)!
export const currentDock = (state: SessionState) =>
  state.page === 'chat' ? activeDraft(state).dock : state.visitDock

export function sessionReducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case 'navigate':
      return {
        ...state,
        page: action.page,
        visitDock: closedDock(action.page === 'projects' ? 'files' : 'terminal')
      }
    case 'newDraft': {
      const draft = activeDraft(state)
      if (!draft.text.trim())
        return {
          ...state,
          page: 'chat',
          drafts: state.drafts.map((d) => (d.id === draft.id ? { ...d, dock: closedDock() } : d))
        }
      return {
        ...state,
        page: 'chat',
        activeDraft: state.nextId,
        nextId: state.nextId + 1,
        drafts: [...state.drafts, { id: state.nextId, text: '', dock: closedDock() }]
      }
    }
    case 'selectDraft':
      return state.drafts.some((d) => d.id === action.id)
        ? { ...state, page: 'chat', activeDraft: action.id }
        : state
    case 'editDraft':
      return {
        ...state,
        drafts: state.drafts.map((d) =>
          d.id === state.activeDraft ? { ...d, text: action.text } : d
        )
      }
    case 'dock': {
      const old = currentDock(state)
      const dock = {
        ...old,
        ...('open' in action ? { open: action.open!, manuallyHidden: !action.open } : {}),
        ...('tab' in action ? { tab: action.tab! } : {})
      }
      return state.page === 'chat'
        ? {
            ...state,
            drafts: state.drafts.map((d) => (d.id === state.activeDraft ? { ...d, dock } : d))
          }
        : { ...state, visitDock: dock }
    }
    case 'sidebar': {
      const next = { ...state, collapsed: action.collapsed }
      return action.closeDock ? sessionReducer(next, { type: 'dock', open: false }) : next
    }
    case 'width':
      return { ...state, dockWidth: Math.max(320, Math.min(480, action.width)) }
    case 'motion':
      return { ...state, reduceMotion: action.reduced }
    case 'ambient':
      return { ...state, ambient: action.enabled }
  }
}
