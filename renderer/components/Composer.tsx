import { Icon } from './Icon'
import type { Output } from '../../contracts/ipc'
export interface DiscussionComposer {
  models: Output<'models.list'>
  model: string
  projectName?: string
  ready: boolean
  sending: boolean
  chooseModel: (id: string) => void
  send: () => void
}
export function Composer({
  text,
  onChange,
  discussion
}: {
  text: string
  onChange: (text: string) => void
  discussion?: DiscussionComposer
}) {
  return (
    <div className="composer-group">
      <form
        className="composer glass"
        onSubmit={(event) => {
          event.preventDefault()
          discussion?.send()
        }}
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
            {discussion?.projectName ?? 'No project'}
          </span>
          <div className="composer-actions">
            {discussion?.models.length ? (
              <select
                className="model-control"
                aria-label="Discussion model"
                value={discussion.model}
                onChange={(event) => discussion.chooseModel(event.target.value)}
              >
                <option value="" disabled>
                  Choose model
                </option>
                {discussion.models.map((choice) => (
                  <option
                    key={choice.modelId}
                    value={choice.modelId}
                    disabled={choice.availability !== 'available'}
                  >
                    {choice.displayName}
                    {choice.availability !== 'available' ? ' — unavailable' : ''}
                  </option>
                ))}
              </select>
            ) : (
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
            )}
            <button
              type="submit"
              className="send-button"
              disabled={
                !discussion?.ready || !discussion.projectName || !text.trim() || discussion.sending
              }
              aria-label="Send message"
              title={
                discussion?.ready
                  ? 'Save and send discussion message'
                  : 'Sending is not available until a model is configured'
              }
            >
              <Icon name="arrow" size={19} />
            </button>
          </div>
        </div>
      </form>
      <p className="composer-note" id="send-availability">
        <Icon name="lock" size={12} />
        {discussion?.ready
          ? 'Discussion only. Sending saves your message before contacting DeepSeek.'
          : discussion?.models.length
            ? 'Choose an available model and a project. Project files remain unavailable.'
            : 'Drafts stay in this session. Sending is not available yet.'}
      </p>
    </div>
  )
}
