import { useRef, useState } from 'react'
import { Icon } from './Icon'
import { EmptyState } from './EmptyState'
import type { DockTab } from '../state/session'
import { FilesBrowser } from './FilesBrowser'
import type { Output } from '../../contracts/ipc'

export function RightDock({
  tab,
  width,
  onTab,
  onClose,
  onWidth,
  project
}: {
  tab: DockTab
  width: number
  onTab: (tab: DockTab) => void
  onClose: () => void
  onWidth: (width: number) => void
  project?: Output<'projects.choose'>
}) {
  const pointer = useRef<{ x: number; width: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  return (
    <aside className={`right-dock glass ${dragging ? 'resizing' : ''}`} aria-label="Right Dock">
      <div
        className="resize-handle"
        role="separator"
        aria-label="Resize Right Dock"
        aria-orientation="vertical"
        aria-valuemin={320}
        aria-valuemax={480}
        aria-valuenow={Math.round(width)}
        tabIndex={0}
        onPointerDown={(event) => {
          pointer.current = { x: event.clientX, width }
          event.currentTarget.setPointerCapture(event.pointerId)
          setDragging(true)
        }}
        onPointerMove={(event) => {
          if (pointer.current) onWidth(pointer.current.width + pointer.current.x - event.clientX)
        }}
        onPointerUp={(event) => {
          pointer.current = null
          setDragging(false)
          event.currentTarget.releasePointerCapture(event.pointerId)
        }}
        onPointerCancel={() => {
          pointer.current = null
          setDragging(false)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault()
            onWidth(width + (event.key === 'ArrowLeft' ? 16 : -16))
          } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault()
            onWidth(event.key === 'Home' ? 320 : 480)
          }
        }}
      />
      <div className="dock-heading">
        <div className="dock-tabs" role="tablist" aria-label="Dock content">
          {(['terminal', 'files'] as const).map((value) => (
            <button
              key={value}
              role="tab"
              id={`tab-${value}`}
              aria-controls={`panel-${value}`}
              aria-selected={tab === value}
              tabIndex={tab === value ? 0 : -1}
              onClick={() => onTab(value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                  event.preventDefault()
                  const next = value === 'terminal' ? 'files' : 'terminal'
                  onTab(next)
                  requestAnimationFrame(() => document.getElementById(`tab-${next}`)?.focus())
                }
              }}
            >
              <Icon name={value === 'terminal' ? 'terminal' : 'folder'} size={16} />
              {value === 'terminal' ? 'Terminal' : 'Files'}
            </button>
          ))}
        </div>
        <button
          className="icon-button"
          aria-label="Close Right Dock"
          title="Close Right Dock"
          onClick={onClose}
        >
          <Icon name="close" size={17} />
        </button>
      </div>
      <div
        className="dock-body"
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
      >
        {tab === 'terminal' ? (
          <>
            <div className="terminal-tabs">
              <span className="active-subtab">Agent Logs</span>
              <button disabled title="Interactive Shell is not available">
                Interactive Shell
                <Icon name="lock" size={11} />
              </button>
            </div>
            <EmptyState compact icon="terminal" title="No agent logs">
              <p>Verified output will appear here when the engine is connected.</p>
              <span className="neutral-tag">Read-only</span>
            </EmptyState>
            <div className="terminal-footer">
              <span className="status-dot" />
              No process connected
            </div>
          </>
        ) : project ? (
          <FilesBrowser project={project} />
        ) : (
          <>
            <div className="files-location">
              <Icon name="folder" size={15} />
              <span>No workspace selected</span>
            </div>
            <EmptyState compact icon="file" title="Your project files">
              <p>
                Choose a project when file access is available. File previews will open here,
                without leaving your conversation.
              </p>
            </EmptyState>
            <div className="dock-hint">
              <Icon name="lock" size={14} />
              File access is not available yet.
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
