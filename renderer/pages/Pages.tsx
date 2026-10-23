import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { Composer, type DiscussionComposer } from '../components/Composer'

export function ChatPage({
  text,
  onChange,
  discussion
}: {
  text: string
  onChange: (text: string) => void
  discussion?: DiscussionComposer
}) {
  return (
    <div className="home-page">
      <div className="home-center">
        <div className="hero">
          <p className="hero-eyebrow">YOUR LOCAL CODING WORKSPACE</p>
          <h1>Next Code</h1>
          <p className="hero-subtitle">A little space for your next big idea.</p>
        </div>
        <Composer text={text} onChange={onChange} discussion={discussion} />
      </div>
      <p className="home-bottom">Your workspace. Your conversation. Your next step.</p>
    </div>
  )
}
export function ProjectsPage({
  openFiles,
  choose,
  projects,
  select
}: {
  openFiles: () => void
  choose?: () => void
  projects?: { projectId: string; displayName: string }[]
  select?: (id: string) => void
}) {
  return (
    <div className="page-content">
      <div className="page-intro">
        <p className="eyebrow">WORKSPACES</p>
        <h1>Projects</h1>
        <p>A home for the code you are working on.</p>
      </div>
      <div className="section-heading">
        <h2>Local projects</h2>
        <button
          className="secondary-button"
          disabled={!choose}
          onClick={choose}
          title={
            choose
              ? 'Choose a project folder for read-only browsing'
              : 'Project registration is not available yet'
          }
        >
          <Icon name="plus" size={16} />
          Open project
        </button>
      </div>
      <div className="surface-card project-empty">
        {projects?.map((project) => (
          <button
            className="text-button"
            key={project.projectId}
            onClick={() => select?.(project.projectId)}
          >
            {project.displayName}
          </button>
        ))}
        <EmptyState
          icon="folder"
          title={projects?.length ? 'Discussion workspaces' : 'No project selected'}
        >
          <p>
            {projects?.length ? (
              'Choose a registered workspace for discussion and safe read-only file previews.'
            ) : (
              <>
                Your projects stay on your computer.
                <br />
                Project selection and file access are not available yet.
              </>
            )}
          </p>
        </EmptyState>
        <button className="text-button" onClick={openFiles}>
          Open Files panel
          <Icon name="chevron" size={14} />
        </button>
      </div>
      <p className="page-footnote">
        <Icon name="lock" size={14} />
        {projects?.length
          ? 'File previews are read-only. Source sharing requires separate permission.'
          : 'No project files are being read or modified.'}
      </p>
    </div>
  )
}
export function AgentsPage() {
  return (
    <div className="page-content agents-page">
      <div className="page-intro">
        <p className="eyebrow">MISSION CONTROL</p>
        <h1>Agents</h1>
        <p>A clear view of real work, as it happens.</p>
      </div>
      <section className="surface-card mission-header" aria-label="Mission Header">
        <div>
          <span className="section-label">CURRENT MISSION</span>
          <h2>No active task</h2>
          <p>Start a conversation when the engine is connected.</p>
        </div>
        <span className="neutral-tag">
          <span className="status-dot" />
          Not connected
        </span>
      </section>
      <div className="mission-grid">
        <section className="surface-card timeline" aria-label="Execution Timeline">
          <div className="card-heading">
            <h2>Execution Timeline</h2>
            <span className="small-muted">No events</span>
          </div>
          <EmptyState icon="agents" title="No recorded activity">
            <p>
              Real worker activity will appear in the order it happens. Live activity is not
              available yet.
            </p>
          </EmptyState>
        </section>
        <section className="surface-card inspector" aria-label="Agent Inspector">
          <div className="card-heading">
            <h2>Agent Inspector</h2>
          </div>
          <EmptyState compact icon="file" title="Nothing to inspect">
            <p>Select a recorded worker to see its assignment, status and report.</p>
          </EmptyState>
        </section>
      </div>
    </div>
  )
}
export function SettingsPage({
  reduced,
  ambient,
  setReduced,
  setAmbient
}: {
  reduced: boolean
  ambient: boolean
  setReduced: (value: boolean) => void
  setAmbient: (value: boolean) => void
}) {
  return (
    <div className="page-content settings-page">
      <div className="page-intro">
        <p className="eyebrow">MAKE ROOM FOR FOCUS</p>
        <h1>Settings</h1>
        <p>Keep your workspace comfortable and clear.</p>
      </div>
      <section className="settings-section">
        <h2>
          <Icon name="monitor" size={18} />
          Appearance
        </h2>
        <div className="surface-card settings-card">
          <div className="setting-row">
            <div>
              <label htmlFor="reduce-motion">Reduce motion</label>
              <p>Pause ambient movement and minimize transitions.</p>
            </div>
            <input
              id="reduce-motion"
              type="checkbox"
              role="switch"
              checked={reduced}
              onChange={(e) => setReduced(e.target.checked)}
            />
          </div>
          <div className="setting-row">
            <div>
              <label htmlFor="ambient-light">Ambient light</label>
              <p>Soft blue and violet light behind your workspace.</p>
            </div>
            <input
              id="ambient-light"
              type="checkbox"
              role="switch"
              checked={ambient}
              onChange={(e) => setAmbient(e.target.checked)}
            />
          </div>
          <div className="settings-note">Appearance preferences are kept for this session.</div>
        </div>
      </section>
      <section className="settings-section">
        <h2>
          <Icon name="lock" size={18} />
          Connections
        </h2>
        <div className="surface-card settings-card">
          <div className="setting-row">
            <div>
              <h3>Next Code engine</h3>
              <p>No engine connection is configured.</p>
            </div>
            <span className="neutral-tag">Unavailable</span>
          </div>
          <div className="setting-row">
            <div>
              <h3>Models</h3>
              <p>No verified model is available. No requests are sent.</p>
            </div>
            <span className="neutral-tag">Unavailable</span>
          </div>
        </div>
      </section>
    </div>
  )
}
