import { Icon } from './Icon'

export interface FilePreviewProps {
  name: string
  content: { kind: 'text'; text: string } | { kind: 'unavailable'; reason: string }
  onClose: () => void
}
// Read-only presentation, never a path reader. P1 fixture tests supply content;
// no filesystem or broker operation exists in the production shell.
export function FilePreview({ name, content, onClose }: FilePreviewProps) {
  return (
    <section className="file-preview" aria-label="Read-only file preview">
      <div className="preview-heading">
        <span>
          <Icon name="file" size={15} />
          {name}
        </span>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close file preview"
          title="Back to Files"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
      <span className="preview-readonly">Read-only</span>
      {content.kind === 'text' ? (
        <pre tabIndex={0} aria-label="File contents">
          <code>{content.text}</code>
        </pre>
      ) : (
        <p role="status" className="preview-unavailable">
          {content.reason}
        </p>
      )}
    </section>
  )
}
