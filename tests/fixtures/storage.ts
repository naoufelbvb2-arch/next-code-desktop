import { mkdirSync, mkdtempSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { DurableStore, type StoreOptions, type Scope } from '../../electron/main/storage/store'
import type { Input } from '../../contracts/ipc'

// Explicit synthetic authorities, never imported by production code. No source
// files, engine, provider or user DB are touched by these disposable profiles.
export const proof = { ref: 'fixture_verified' }
export const fixturePolicy = {
  providerLabel: (key: string) => (key === 'provider_fixture' ? 'Synthetic test provider' : null),
  workspace: () => true,
  model: (modelId: string) =>
    modelId === 'model_fixture' ? { modelId, providerKey: 'provider_fixture' } : null,
  evidence: (_kind: string, p: unknown) => (p as { ref?: string })?.ref === proof.ref
}
export function databasePath() {
  mkdirSync('.test-profiles', { recursive: true })
  return join(mkdtempSync(resolve('.test-profiles', 'sqlite-')), 'state.sqlite3')
}
export function fixture(options: StoreOptions = {}) {
  const path = databasePath()
  let clock = Date.parse('2026-10-21T12:00:00Z')
  const store = new DurableStore(path, { now: () => clock, policy: fixturePolicy, ...options })
  const pid = store.registerProject(
    {
      workspaceKey: 'workspace_fixture',
      canonicalRoot: 'C:/synthetic/workspace',
      displayName: 'Synthetic project'
    },
    proof
  )
  const scope: Scope = { projectId: pid, workspaceKey: 'workspace_fixture' }
  return {
    path,
    store,
    scope,
    setTime: (n: number) => {
      clock = n
    },
    advance: (n: number) => {
      clock += n
    }
  }
}
export const sendInput = (
  key = 'mutation_fixture',
  text = 'Synthetic user text'
): Input<'conversations.sendMessage'> => ({
  draftId: 'draft_fixture',
  text,
  modelId: 'model_fixture',
  clientMutationId: key
})
export function taskFixture() {
  const f = fixture()
  const message = f.store.sendMessage(f.scope, sendInput())
  const pid = f.store.createProposal(
    f.scope,
    message.conversationId,
    'Synthetic task - never executed',
    proof
  )
  const task = f.store.admit(f.scope, { proposalId: pid, clientMutationId: 'run_fixture' }, proof)
  return { ...f, message, task }
}
export function inspect(store: DurableStore): DatabaseSync {
  return (store as unknown as { db: DatabaseSync }).db
}
export function session(
  taskId: string,
  key = 'workspace_fixture',
  processSessionRef = 'session_fixture'
) {
  return { ...proof, taskId, workspaceKey: key, processSessionRef, role: 'coding_task' as const }
}
export function event(
  taskId: string,
  name: string,
  sequence: number,
  extra: Record<string, unknown> = {},
  outer = `outer_${sequence}`
) {
  return {
    version: 1,
    type: 'event',
    message_id: outer,
    correlation_id: null,
    payload: {
      name,
      data: {
        task_id: taskId,
        event_id: `event_${sequence}`,
        sequence,
        source: 'agent_os',
        ...extra
      }
    }
  }
}
