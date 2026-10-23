import { useEffect, useRef, useState } from 'react'
import type { Output } from '../../contracts/ipc'

export function DisclosureControls({
  project,
  conversation
}: {
  project: NonNullable<Output<'projects.choose'>>
  conversation: Output<'conversations.read'>
}) {
  const [grants, setGrants] = useState<Output<'disclosures.list'>>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0)
  const api = window.nextCode
  const inFlight = useRef(false),
    mutations = useRef(new Map<string, string>())
  const mutation = (key: string) => {
    let id = mutations.current.get(key)
    if (!id) {
      id = crypto.randomUUID()
      mutations.current.set(key, id)
    }
    return id
  }
  useEffect(() => {
    let active = true
    if (api?.disclosures)
      void api.disclosures.list(project.projectId).then((result) => {
        if (active && result.ok) setGrants(result.data)
      })
    return () => {
      active = false
    }
  }, [api, project.projectId, revision, conversation.disclosureChallenges.length])
  if (!api?.disclosures) return null
  const respond = async (id: string, decision: 'approve' | 'deny') => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError('')
    try {
      const result = await api.disclosures.respond({
        challengeId: id,
        decision,
        clientMutationId: mutation(id + decision)
      })
      if (!result.ok) setError(result.error.message)
      else setRevision((n) => n + 1)
    } catch {
      setError('Source permission could not be saved.')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }
  const revoke = async (id: string) => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError('')
    try {
      const result = await api.disclosures.revoke({
        consentId: id,
        clientMutationId: mutation(id + 'revoke')
      })
      if (!result.ok) setError(result.error.message)
      else setRevision((n) => n + 1)
    } catch {
      setError('Revocation could not be confirmed.')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }
  const inspection = conversation.inspectionStatus
  return (
    <section aria-label="Project source permissions">
      {error && <p role="alert">{error}</p>}
      {conversation.disclosureChallenges
        .filter((ch) => ch.projectId === project.projectId)
        .map((ch) => (
          <div key={ch.challengeId}>
            <p>
              Share screened source excerpts from {project.displayName} with {ch.providerLabel}?
            </p>
            <p>{ch.scopeDescription}</p>
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => void respond(ch.challengeId, 'approve')}
            >
              Allow source sharing
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => void respond(ch.challengeId, 'deny')}
            >
              Deny source sharing
            </button>
            <p>
              Permission affects future handoffs. Send a new message to request another inspection.
            </p>
          </div>
        ))}
      {grants
        .filter((g) => g.status === 'granted')
        .map((g) => (
          <div key={g.consentId}>
            <p>
              Source sharing granted to {g.providerLabel} for {project.displayName}.
            </p>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => void revoke(g.consentId)}
            >
              Revoke source sharing
            </button>
            <p>Revocation stops new handoffs; data already released cannot be recalled.</p>
          </div>
        ))}
      {inspection && (
        <div role="status">
          <p>Project inspection: {inspection.state}</p>
          <p>
            Discovered: {inspection.discoveredCount ?? 'not established'} · Handed to Discussion:{' '}
            {inspection.actuallyReadCount} · Excluded: {inspection.excludedCount}
          </p>
          <p>{inspection.coverageNote}</p>
        </div>
      )}
    </section>
  )
}
