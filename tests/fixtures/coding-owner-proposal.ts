// Test-owned Main caller for an isolated profile. Creates an owner-supplied
// proposal, never a fabricated LLM reply/attempt/event. Product IPC is untouched.
import { join, resolve } from 'node:path'
import { DurableStore } from '../../electron/main/storage/store'
import { resolveRuntime } from '../../electron/main/supervisor/runtime'
import { verifyCodingRuntime } from '../../electron/main/coding/gate'
import { BrokerPool } from '../../electron/main/broker/pool'
import { pathToFileURL } from 'node:url'

export async function prepare(profile: string, projectId: string, goal: string) {
  if (!resolve(profile).startsWith(resolve('.test-profiles') + '\\'))
    throw new Error('Isolated profile required')
  const proof = { ref: 'owner_proposal_in_isolated_profile' }
  let nativeVerified = false
  const pool = new BrokerPool(pathToFileURL(resolve('out/main/broker-worker.js')))
  const store = new DurableStore(join(profile, 'desktop-state.sqlite3'), {
    policy: {
      workspace: () => nativeVerified,
      model: (id) =>
        id === 'deepseek-flash'
          ? { modelId: id, providerKey: 'owner_draft_no_provider_call' }
          : null,
      evidence: (kind, value) =>
        kind === 'proposal' && (value as { ref?: string })?.ref === proof.ref
    }
  })
  try {
    const binding = store.projectBinding(projectId)
    const runtime = await resolveRuntime(join(profile, 'python-runtime.json'), resolve('bridge'))
    if (!runtime.coding) throw new Error('Explicit Coding configuration required')
    const coding = await verifyCodingRuntime(runtime, resolve('bridge'), runtime.coding)
    coding.requireProvider(binding.root)
    return await pool.run(
      'owner-proposal',
      {
        action: 'register',
        root: binding.root,
        workspaceKey: binding.scope.workspaceKey,
        path: '.'
      },
      (_result, verify) => {
        verify()
        nativeVerified = true
        try {
          const message = store.sendMessage(binding.scope, {
            draftId: 'owner_coding_goal',
            text: goal,
            modelId: 'deepseek-flash',
            clientMutationId: 'owner_goal_once'
          })
          const proposalId =
            store
              .readConversation(binding.scope, message.conversationId)
              .availableProposals.find((p) => p.exactGoal === goal)?.proposalId ??
            store.createProposal(binding.scope, message.conversationId, goal, proof)
          return { conversationId: message.conversationId, proposalId, providerVerified: true }
        } finally {
          nativeVerified = false
        }
      }
    )
  } finally {
    pool.close()
    store.close()
  }
}
