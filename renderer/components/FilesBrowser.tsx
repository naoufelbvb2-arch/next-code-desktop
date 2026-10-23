import { useEffect, useRef, useState } from 'react'
import type { Output } from '../../contracts/ipc'

export function FilesBrowser({ project }: { project: NonNullable<Output<'projects.choose'>> }) {
  const [directory, setDirectory] = useState('.'),
    [page, setPage] = useState<Output<'projects.listFiles'> | null>(null)
  const [preview, setPreview] = useState<Output<'projects.previewFile'> | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [start, setStart] = useState(1)
  const epoch = useRef(0)
  const list = async (path: string, cursor?: string) => {
    const generation = ++epoch.current
    setBusy(true)
    setError('')
    setPreview(null)
    try {
      const result = await window.nextCode!.projects.listFiles(project.projectId, path, cursor, 40)
      if (epoch.current !== generation) return
      if (result.ok && result.data.projectId === project.projectId) {
        setPage(result.data)
        setDirectory(path)
      } else if (!result.ok)
        setError(
          result.error.code === 'WORKSPACE_UNAVAILABLE'
            ? 'Choose this project folder again to enable safe file access.'
            : result.error.message
        )
    } catch {
      if (epoch.current === generation) setError('Project files could not be opened safely.')
    } finally {
      if (epoch.current === generation) setBusy(false)
    }
  }
  useEffect(() => {
    setDirectory('.')
    setPage(null)
    setPreview(null)
    setStart(1)
    void list('.')
    return () => {
      epoch.current++
    }
  }, [project.projectId])
  const open = async (path: string) => {
    const generation = ++epoch.current
    setBusy(true)
    setError('')
    setPreview(null)
    try {
      const result = await window.nextCode!.projects.previewFile(project.projectId, path, {
        startLine: start,
        endLine: start + 199
      })
      if (epoch.current !== generation) return
      if (result.ok && result.data.projectId === project.projectId) setPreview(result.data)
      else if (!result.ok) setError(result.error.message)
    } catch {
      if (epoch.current === generation) setError('This file could not be previewed safely.')
    } finally {
      if (epoch.current === generation) setBusy(false)
    }
  }
  const currentPage = page?.projectId === project.projectId ? page : null
  const currentPreview = preview?.projectId === project.projectId ? preview : null
  return (
    <section aria-label="Project file browser">
      <div className="files-location">
        <span>
          {project.displayName} / {currentPage ? directory : '.'}
        </span>
      </div>
      <p className="dock-hint">
        Read-only local preview. Opening a file does not share it with a model.
      </p>
      <div>
        <button
          className="text-button"
          disabled={busy || directory === '.'}
          onClick={() =>
            void list(
              directory.includes('/') ? directory.slice(0, directory.lastIndexOf('/')) : '.'
            )
          }
        >
          Up one folder
        </button>
        <button className="text-button" disabled={busy} onClick={() => void list(directory)}>
          Refresh files
        </button>
      </div>
      {busy && <p role="status">Opening safe project files…</p>}
      {error && <p role="alert">{error}</p>}
      <label>
        Preview start line{' '}
        <input
          aria-label="Preview start line"
          type="number"
          min={1}
          max={1000000}
          value={start}
          onChange={(e) => setStart(Math.max(1, Math.min(1000000, Number(e.target.value) || 1)))}
        />
      </label>
      <ul aria-label="Project files">
        {currentPage?.entries.map((entry) => (
          <li key={entry.relativePath}>
            <button
              className="text-button"
              disabled={busy}
              onClick={() =>
                entry.kind === 'directory'
                  ? void list(entry.relativePath)
                  : void open(entry.relativePath)
              }
            >
              {entry.kind === 'directory' ? 'Folder: ' : 'File: '}
              {entry.relativePath}
            </button>
          </li>
        ))}
      </ul>
      {currentPage?.nextCursor && (
        <button
          className="text-button"
          disabled={busy}
          onClick={() => void list(directory, currentPage.nextCursor!)}
        >
          Next file page
        </button>
      )}
      {currentPage && !currentPage.entries.length && !busy && (
        <p>No permitted entries in this page.</p>
      )}
      {currentPreview && (
        <section aria-label="Safe file preview">
          <h3>{currentPreview.relativePath}</h3>
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {currentPreview.text}
          </pre>
          <p>
            {currentPreview.truncated ? 'Partial excerpt. ' : 'Requested excerpt. '}Sensitive-file
            checks are conservative and cannot detect every secret.
          </p>
          <small>Revision {currentPreview.sourceRevisionLabel}</small>
        </section>
      )}
    </section>
  )
}
