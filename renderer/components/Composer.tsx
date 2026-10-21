import { Icon } from './Icon'
export function Composer({ text, onChange }: { text: string; onChange: (text: string) => void }) {
  return (
    <div className="composer-group">
      <form
        className="composer glass"
        onSubmit={(event) => event.preventDefault()}
        aria-label="Message composer"
      >
        <label className="sr-only" htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          value={text}
          maxLength={20000}
          onChange={(event) => onChange(event.target.value)}
          placeholder="What would you like to work on?"
          spellCheck={false}
          aria-describedby="send-availability"
        />
        <div className="composer-controls">
          <span className="composer-context">
            <Icon name="folder" size={16} />
            No project
          </span>
          <div className="composer-actions">
            <button
              type="button"
              className="model-control"
              disabled
              title="Model connection is not available yet"
            >
              <span className="status-dot" />
              Model unavailable
              <Icon name="chevron" size={12} style={{ transform: 'rotate(90deg)' }} />
            </button>
            <button
              type="submit"
              className="send-button"
              disabled
              aria-label="Send message"
              title="Sending is not available until the engine is connected"
            >
              <Icon name="arrow" size={19} />
            </button>
          </div>
        </div>
      </form>
      <p className="composer-note" id="send-availability">
        <Icon name="lock" size={12} />
        Drafts stay in this session. Sending is not available yet.
      </p>
    </div>
  )
}
