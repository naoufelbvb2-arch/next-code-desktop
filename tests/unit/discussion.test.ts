// @vitest-environment node
import { test, expect } from 'vitest'
import { discussionFixture } from '../fixtures/discussion'
import { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { DiscussionService } from '../../electron/main/discussion/service'

test('P5-14 valid visible summary sources enter derived memory for a later turn', async () => {
  const f = await discussionFixture({ summarySources: ['current'] })
  try {
    const first = await f.service.dispatch('conversations.sendMessage', f.input())
    await f.service.idle()
    if (!first.ok) throw new Error('Acceptance failed')
    const cid = (first.data as { conversationId: string }).conversationId
    await f.service.dispatch('conversations.sendMessage', {
      conversationId: cid,
      text: 'Follow-up',
      modelId: 'deepseek-flash',
      clientMutationId: 'next'
    })
    await f.service.idle()
    expect(f.inputs[1].context_snapshot).toMatchObject({
      summaries: [
        {
          text: 'Derived synthetic summary',
          source_message_ids: [(first.data as { messageId: string }).messageId]
        }
      ]
    })
  } finally {
    f.service.close()
  }
})
test('P5-15 history pressure prunes whole optional entries and preserves the exact current message', async () => {
  const f = await discussionFixture()
  try {
    const first = await f.service.dispatch(
      'conversations.sendMessage',
      f.input('first', 'x'.repeat(16000))
    )
    await f.service.idle()
    if (!first.ok) throw new Error('Acceptance failed')
    const cid = (first.data as { conversationId: string }).conversationId
    const current = 'y'.repeat(16000)
    await f.service.dispatch('conversations.sendMessage', {
      conversationId: cid,
      text: current,
      modelId: 'deepseek-flash',
      clientMutationId: 'current'
    })
    await f.service.idle()
    expect(f.inputs[1].text).toBe(current)
    const context = f.inputs[1].context_snapshot as { recent_messages: { text: string }[] }
    expect(Buffer.byteLength(JSON.stringify(context))).toBeLessThan(4000)
    expect(context.recent_messages.every((m) => m.text === 'Synthetic discussion fixture')).toBe(
      true
    )
  } finally {
    f.service.close()
  }
})

test('P5-01 model registry, unsupported selection and preference is for future sends', async () => {
  const f = await discussionFixture()
  try {
    expect(await f.service.dispatch('models.list', null)).toMatchObject({
      ok: true,
      data: [{ modelId: 'deepseek-flash', capabilities: ['discussion'], availability: 'available' }]
    })
    expect(
      await f.service.dispatch('models.setDiscussionPreference', { modelId: 'foreign' })
    ).toMatchObject({ ok: false, error: { code: 'MODEL_UNAVAILABLE' } })
    expect(
      await f.service.dispatch('models.setDiscussionPreference', { modelId: 'deepseek-flash' })
    ).toMatchObject({ ok: true })
    f.setAvailable(false)
    expect(await f.service.dispatch('models.list', null)).toMatchObject({
      ok: true,
      data: [{ availability: 'unavailable' }]
    })
    expect(await f.service.dispatch('conversations.sendMessage', f.input())).toMatchObject({
      ok: false,
      error: { code: 'MODEL_UNAVAILABLE' }
    })
    expect(f.calls).toBe(0)
  } finally {
    f.service.close()
  }
})
test('P5-02 real T1 acceptance and immutable receipt before issue; duplicate mutation produces one T5 answer and no second call', async () => {
  let release!: () => void
  const hold = new Promise<void>((resolve) => {
    release = resolve
  })
  const f = await discussionFixture({ hold })
  try {
    const first = await f.service.dispatch('conversations.sendMessage', f.input()),
      again = await f.service.dispatch('conversations.sendMessage', f.input())
    expect(first).toEqual(again)
    expect(first.ok).toBe(true)
    const db = new DatabaseSync(join(f.directory, 'state.sqlite3'), { readOnly: true })
    expect(db.prepare("SELECT count(*) n FROM messages WHERE role='user'").get()!.n).toBe(1)
    expect(db.prepare("SELECT count(*) n FROM messages WHERE role='assistant'").get()!.n).toBe(0)
    release()
    await f.service.idle()
    expect(f.calls).toBe(1)
    expect(db.prepare("SELECT count(*) n FROM messages WHERE role='assistant'").get()!.n).toBe(1)
    expect(await f.service.dispatch('conversations.sendMessage', f.input())).toEqual(first)
    await f.service.idle()
    expect(f.calls).toBe(1)
    expect(
      await f.service.dispatch('conversations.sendMessage', f.input('send', 'Changed input'))
    ).toMatchObject({ ok: false })
    db.close()
  } finally {
    release()
    await f.service.idle()
    f.service.close()
  }
})
test('P5-03 current and future queued user turns never leak into historical context; same conversation serialized', async () => {
  let release!: () => void
  const hold = new Promise<void>((resolve) => {
    release = resolve
  })
  const f = await discussionFixture({ hold })
  try {
    const first = await f.service.dispatch('conversations.sendMessage', f.input())
    if (!first.ok) throw new Error('Acceptance failed')
    const cid = (first.data as { conversationId: string }).conversationId
    const second = {
      text: 'Second turn',
      modelId: 'deepseek-flash',
      clientMutationId: 'second',
      conversationId: cid
    }
    await f.service.dispatch('conversations.sendMessage', second)
    await f.service.dispatch('conversations.sendMessage', {
      ...second,
      text: 'Third queued turn',
      clientMutationId: 'third'
    })
    expect(f.calls).toBe(1)
    release()
    await f.service.idle()
    expect(f.calls).toBe(3)
    expect(f.inputs[0].context_snapshot).toMatchObject({ recent_messages: [] })
    const context = f.inputs[1].context_snapshot as { recent_messages: { text: string }[] }
    expect(context.recent_messages.map((message) => message.text)).toContain('Synthetic first turn')
    expect(context.recent_messages.some((message) => message.text === 'Second turn')).toBe(false)
    expect(context.recent_messages.some((message) => message.text === 'Third queued turn')).toBe(
      false
    )
    const third = f.inputs[2].context_snapshot as { recent_messages: { text: string }[] }
    expect(third.recent_messages.map((message) => message.text)).toContain('Second turn')
    expect(third.recent_messages.some((message) => message.text === 'Third queued turn')).toBe(
      false
    )
  } finally {
    release()
    await f.service.idle()
    f.service.close()
  }
})
test('P5-04 ambiguous provider failure preserves the user and unknown attempt, no assistant or task event', async () => {
  const f = await discussionFixture({ failure: true })
  try {
    expect(await f.service.dispatch('conversations.sendMessage', f.input())).toMatchObject({
      ok: true
    })
    await f.service.idle()
    const db = new DatabaseSync(join(f.directory, 'state.sqlite3'), { readOnly: true })
    expect(db.prepare('SELECT status FROM discussion_turns').get()!.status).toBe('unknown')
    expect(db.prepare('SELECT count(*) n FROM messages').get()!.n).toBe(1)
    expect(db.prepare('SELECT count(*) n FROM task_events').get()!.n).toBe(0)
    db.close()
    expect(f.calls).toBe(1)
  } finally {
    f.service.close()
  }
})
test('P5-05 T1 commit failure makes no provider issue; T5 commit failure cannot publish an assistant', async () => {
  for (const operation of ['T1', 'T5.result']) {
    const f = await discussionFixture({
      database: {
        fault: (where) => {
          if (where === operation) throw new Error('Synthetic COMMIT failure')
        }
      }
    })
    try {
      await f.service.dispatch('conversations.sendMessage', f.input())
      await f.service.idle()
      const db = new DatabaseSync(join(f.directory, 'state.sqlite3'), { readOnly: true })
      expect(db.prepare("SELECT count(*) n FROM messages WHERE role='assistant'").get()!.n).toBe(0)
      expect(f.calls).toBe(operation === 'T1' ? 0 : 1)
      db.close()
    } finally {
      f.service.close()
    }
  }
})
test('P5-06 all coding and broker/file methods remain closed, registry and DB have no credential', async () => {
  const f = await discussionFixture()
  try {
    for (const method of [
      'proposals.confirmRun',
      'projects.listFiles',
      'projects.previewFile',
      'tasks.cancel'
    ] as const)
      expect(await f.service.dispatch(method, {})).toMatchObject({
        ok: false,
        error: { code: 'RUNTIME_NOT_READY' }
      })
    expect(f.calls).toBe(0)
    expect(
      readFileSync(join(f.directory, 'state.sqlite3')).includes(Buffer.from('DEEPSEEK_API_KEY'))
    ).toBe(false)
  } finally {
    f.service.close()
  }
})
test('P5-07 restart of a T1-committed but unissued turn shows unknown without replay or fake attempt', async () => {
  const f = await discussionFixture(),
    project = f.service.store.projects()[0],
    scope = f.service.store.projectBinding(project.projectId).scope
  const accepted = f.service.store.sendMessage(scope, f.input())
  f.service.close()
  let issues = 0
  const restored = new DiscussionService({
    path: join(f.directory, 'state.sqlite3'),
    enabled: true,
    available: () => true,
    choose: async () => f.workspace,
    ensure: async () => {
      issues++
      throw new Error('must not issue')
    }
  })
  try {
    const page = restored.store.readConversation(scope, accepted.conversationId)
    expect(page.discussionTurns[0]).toMatchObject({ status: 'unknown', lastAttempt: null })
    expect(page.messages).toHaveLength(1)
    expect(issues).toBe(0)
  } finally {
    restored.close()
  }
})
test('P5-08 wrong request correlation cannot become a committed assistant message', async () => {
  const f = await discussionFixture({ foreignCorrelation: true })
  try {
    await f.service.dispatch('conversations.sendMessage', f.input())
    await f.service.idle()
    const db = new DatabaseSync(join(f.directory, 'state.sqlite3'), { readOnly: true })
    expect(db.prepare("SELECT count(*) n FROM messages WHERE role='assistant'").get()!.n).toBe(0)
    expect(db.prepare('SELECT status FROM discussion_turns').get()!.status).toBe('unknown')
    db.close()
  } finally {
    f.service.close()
  }
})
test('P5-09 different conversation context is isolated even within the same registered project', async () => {
  const f = await discussionFixture()
  try {
    await f.service.dispatch(
      'conversations.sendMessage',
      f.input('one', 'Private first conversation')
    )
    await f.service.idle()
    await f.service.dispatch(
      'conversations.sendMessage',
      f.input('two', 'Second separate conversation')
    )
    await f.service.idle()
    expect(f.inputs[1].context_snapshot).toMatchObject({
      recent_messages: [],
      summaries: [],
      decisions: []
    })
    expect(f.inputs[1].conversation_id).not.toBe(f.inputs[0].conversation_id)
  } finally {
    f.service.close()
  }
})
test('P5-10 a structured proposal receives a Main identity and TTL while no task, lease or coding event is created', async () => {
  const f = await discussionFixture({ proposal: true })
  try {
    const accepted = await f.service.dispatch('conversations.sendMessage', f.input())
    await f.service.idle()
    if (!accepted.ok) throw new Error('Acceptance failed')
    const cid = (accepted.data as { conversationId: string }).conversationId,
      page = await f.service.dispatch('conversations.read', { conversationId: cid })
    expect(page).toMatchObject({
      ok: true,
      data: { availableProposals: [{ exactGoal: 'Synthetic proposed goal' }] }
    })
    const db = new DatabaseSync(join(f.directory, 'state.sqlite3'), { readOnly: true }),
      proposal = db.prepare('SELECT * FROM task_proposals').get()!
    expect(
      Date.parse(proposal.expires_at as string) - Date.parse(proposal.issued_at as string)
    ).toBe(900000)
    for (const table of ['tasks', 'workspace_writer_leases', 'task_events'])
      expect(db.prepare(`SELECT count(*) n FROM ${table}`).get()!.n).toBe(0)
    db.close()
  } finally {
    f.service.close()
  }
})
test('P5-11 fabricated summary sources and generated decision candidates never enter trusted memory', async () => {
  const f = await discussionFixture({
    summarySources: ['foreign_message'],
    decisionCandidate: true
  })
  try {
    await f.service.dispatch('conversations.sendMessage', f.input())
    await f.service.idle()
    const db = new DatabaseSync(join(f.directory, 'state.sqlite3'), { readOnly: true })
    expect(db.prepare('SELECT count(*) n FROM memory_summaries').get()!.n).toBe(0)
    expect(db.prepare('SELECT count(*) n FROM approved_decisions').get()!.n).toBe(0)
    expect(db.prepare('SELECT count(*) n FROM messages').get()!.n).toBe(2)
    db.close()
  } finally {
    f.service.close()
  }
})
test('P5-12 exact attributable user approval enters T5 atomically and is available as approved context on a later turn', async () => {
  const f = await discussionFixture()
  try {
    const first = await f.service.dispatch(
      'conversations.sendMessage',
      f.input('approve', 'I approve: Keep replies brief')
    )
    await f.service.idle()
    if (!first.ok) throw new Error('Acceptance failed')
    const cid = (first.data as { conversationId: string }).conversationId
    await f.service.dispatch('conversations.sendMessage', {
      conversationId: cid,
      text: 'Next turn',
      modelId: 'deepseek-flash',
      clientMutationId: 'next'
    })
    await f.service.idle()
    expect(f.inputs[1].context_snapshot).toMatchObject({
      decisions: [
        {
          text: 'Keep replies brief',
          approval_message_id: (first.data as { messageId: string }).messageId
        }
      ]
    })
  } finally {
    f.service.close()
  }
})
test('P5-13 conversation Dock save uses existing receipt transaction and never changes task state', async () => {
  const f = await discussionFixture()
  try {
    const first = await f.service.dispatch('conversations.sendMessage', f.input())
    await f.service.idle()
    if (!first.ok) throw new Error('Acceptance failed')
    const conversationId = (first.data as { conversationId: string }).conversationId,
      input = {
        conversationId,
        dockState: {
          visible: false,
          primaryTab: 'Files',
          terminalSubtab: 'Agent Logs',
          explicitlyHidden: true
        },
        clientMutationId: 'dock'
      }
    const saved = await f.service.dispatch('conversations.saveDockState', input)
    expect(saved).toEqual(await f.service.dispatch('conversations.saveDockState', input))
    expect(saved).toMatchObject({
      ok: true,
      data: { conversationId, primaryTab: 'Files', visible: false }
    })
  } finally {
    f.service.close()
  }
})
