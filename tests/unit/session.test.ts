import { describe, expect, it } from 'vitest'
import {
  activeDraft,
  currentDock,
  initialState,
  sessionReducer as reduce,
  type SessionState
} from '../../renderer/state/session'

describe('session-only drafts and page-local Dock ownership', () => {
  it('never discards text on route changes', () => {
    let state = reduce(initialState, { type: 'editDraft', text: 'Keep this unsent idea' })
    for (const page of ['projects', 'agents', 'settings', 'chat'] as const)
      state = reduce(state, { type: 'navigate', page })
    expect(activeDraft(state).text).toBe('Keep this unsent idea')
    expect(state.drafts).toHaveLength(1)
  })
  it('new drafts are empty with closed Dock; old unsent drafts stay recoverable', () => {
    let state = reduce(initialState, { type: 'editDraft', text: 'First idea' })
    state = reduce(state, { type: 'dock', open: true, tab: 'files' })
    state = reduce(state, { type: 'newDraft' })
    expect(activeDraft(state)).toMatchObject({
      text: '',
      dock: { open: false, manuallyHidden: false }
    })
    state = reduce(state, { type: 'selectDraft', id: 1 })
    expect(activeDraft(state).text).toBe('First idea')
    expect(currentDock(state)).toMatchObject({ open: true, tab: 'files' })
  })
  it('repeated blank New Conversation clicks produce no history rows', () => {
    let state: SessionState = initialState
    for (let i = 0; i < 20; i++) state = reduce(state, { type: 'newDraft' })
    expect(state.drafts).toHaveLength(1)
    expect(state.drafts.filter((d) => d.text.trim())).toHaveLength(0)
  })
  it('Agents entry resets only the temporary Dock; returning to Chat restores its tab and visibility', () => {
    let state = reduce(initialState, { type: 'dock', open: true, tab: 'files' })
    state = reduce(state, { type: 'navigate', page: 'agents' })
    expect(currentDock(state).open).toBe(false)
    state = reduce(state, { type: 'dock', open: true, tab: 'terminal' })
    state = reduce(state, { type: 'navigate', page: 'chat' })
    expect(currentDock(state)).toMatchObject({ open: true, tab: 'files' })
    state = reduce(state, { type: 'navigate', page: 'agents' })
    expect(currentDock(state).open).toBe(false)
  })
  it('Projects starts closed with Files selected; Settings cannot overwrite Chat', () => {
    let state = reduce(initialState, { type: 'dock', open: false })
    state = reduce(state, { type: 'navigate', page: 'projects' })
    expect(currentDock(state)).toMatchObject({ open: false, tab: 'files' })
    state = reduce(state, { type: 'navigate', page: 'settings' })
    state = reduce(state, { type: 'dock', open: true })
    state = reduce(state, { type: 'navigate', page: 'chat' })
    expect(currentDock(state)).toMatchObject({ open: false, manuallyHidden: true })
    state = reduce(state, { type: 'dock', open: true })
    expect(currentDock(state).manuallyHidden).toBe(false)
  })
  it('explicit Sidebar expansion closes a constrained Dock and preserves text', () => {
    let state = reduce(initialState, { type: 'editDraft', text: 'A draft' })
    state = reduce(state, { type: 'dock', open: true })
    state = reduce(state, { type: 'sidebar', collapsed: false, closeDock: true })
    expect(currentDock(state).open).toBe(false)
    expect(state.collapsed).toBe(false)
    expect(activeDraft(state).text).toBe('A draft')
  })
  it('panel resizing is bounded and survives page navigation', () => {
    let state = reduce(initialState, { type: 'width', width: 999 })
    state = reduce(state, { type: 'navigate', page: 'agents' })
    expect(state.dockWidth).toBe(480)
    expect(reduce(state, { type: 'width', width: 10 }).dockWidth).toBe(320)
  })
})
