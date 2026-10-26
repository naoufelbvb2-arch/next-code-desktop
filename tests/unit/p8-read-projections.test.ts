// @vitest-environment node
import { expect, test } from 'vitest'
import { fixture, inspect, proof, sendInput, taskFixture } from '../fixtures/storage'
import { TaskView, ConversationViewPage } from '../../contracts/ipc-dtos'
import { assertJsonValue } from '../../contracts/common'
import { IPC_RESPONSE_BYTES } from '../../contracts/ipc'
import { DurableStore } from '../../electron/main/storage/store'
import { fixturePolicy } from '../fixtures/storage'

test('CP-001 scoped exact durable admission goal and Dock reads write zero rows, survive Main store restart', () => {
  const f = taskFixture()
  let store = f.store
  try {
    const id = f.message.conversationId
    expect(store.readConversation(f.scope, id).dockState).toBeNull()
    const saved = store.saveDock(f.scope, {
      conversationId: id,
      dockState: {
        visible: false,
        primaryTab: 'Files',
        terminalSubtab: 'Agent Logs',
        explicitlyHidden: true
      },
      clientMutationId: 'save_hidden'
    })
    const changes = () => inspect(store).prepare('SELECT total_changes() n').get()!.n
    const before = changes()
    const goal = store.readTask(f.scope, f.task.taskId)
    expect(goal.exactGoal).toBe('Synthetic task - never executed')
    expect(store.readConversation(f.scope, id).dockState).toEqual(saved)
    expect(changes()).toBe(before)
    const otherId = store.registerProject(
      {
        workspaceKey: 'another_workspace',
        canonicalRoot: 'C:/synthetic/other',
        displayName: 'Other'
      },
      proof
    )
    const otherScope = { projectId: otherId, workspaceKey: 'another_workspace' }
    expect(() => store.readTask(otherScope, f.task.taskId)).toThrow()
    expect(() => store.readConversation(otherScope, id)).toThrow()
    store.close()
    store = new DurableStore(f.path, { policy: fixturePolicy })
    const restarted = changes()
    expect(store.readTask(f.scope, f.task.taskId).exactGoal).toBe(goal.exactGoal)
    expect(store.readConversation(f.scope, id).dockState).toEqual(saved)
    expect(changes()).toBe(restarted)
    expect(
      ConversationViewPage.safeParse({
        ...store.readConversation(f.scope, id),
        dockState: { ...saved, conversationId: 'wrong_conversation' }
      }).success
    ).toBe(false)
  } finally {
    store.close()
  }
})

test('CP-001 Unicode goal limit and IPC response budget remain enforced without truncating or inferring goal', () => {
  const f = fixture()
  try {
    const message = f.store.sendMessage(f.scope, sendInput())
    const goal = '🧪'.repeat(16384)
    const proposalId = f.store.createProposal(f.scope, message.conversationId, goal, proof)
    const task = f.store.admit(f.scope, { proposalId, clientMutationId: 'unicode_goal' }, proof)
    const view = f.store.readTask(f.scope, task.taskId)
    expect(view.exactGoal).toBe(goal)
    expect(() => assertJsonValue(view, IPC_RESPONSE_BYTES)).not.toThrow()
    expect(TaskView.safeParse({ ...view, exactGoal: goal + 'x' }).success).toBe(false)
    expect(TaskView.safeParse({ ...view, exactGoal: '\ud800' }).success).toBe(false)
    expect(TaskView.safeParse({ ...view, exactGoal: null }).success).toBe(false)
    expect(() => assertJsonValue({ ...view, exactGoal: '🧪'.repeat(256) }, 1024)).toThrow(
      'RESOURCE_LIMIT'
    )
  } finally {
    f.store.close()
  }
})
