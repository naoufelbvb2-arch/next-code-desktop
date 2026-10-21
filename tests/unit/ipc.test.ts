// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { IPC, PUSH, failure, type Method, type NextCode } from '../../contracts/ipc'
import { ConversationViewPage, UI_ERROR_CODES, MessageAcceptance } from '../../contracts/ipc-dtos'
import { assertJsonValue } from '../../contracts/common'
import { IpcBoundary, validateResult, type Caller } from '../../electron/main/ipc-boundary'
import { createFacade } from '../../electron/preload/facade'
import { ipcInputs, conversationPage } from '../fixtures/ipc'

const methods = [
  'app.bootstrap',
  'projects.listRecent',
  'projects.choose',
  'projects.select',
  'projects.listFiles',
  'projects.previewFile',
  'conversations.list',
  'conversations.read',
  'conversations.saveDockState',
  'conversations.sendMessage',
  'models.list',
  'models.setDiscussionPreference',
  'disclosures.list',
  'disclosures.respond',
  'disclosures.revoke',
  'proposals.confirmRun',
  'tasks.read',
  'tasks.list',
  'tasks.cancel',
  'tasks.readEvents',
  'tasks.readDiagnostics',
  'preferences.get',
  'preferences.update'
]
function rig(allowScope = true) {
  let trusted = true,
    authorized = allowScope
  const frame = {}
  const listeners = new Map<string, Set<(_event: unknown, data: unknown) => void>>()
  const sent: { channel: string; data: unknown }[] = []
  const event: Caller = {
    senderFrame: frame,
    sender: {
      id: 1,
      mainFrame: frame,
      isDestroyed: () => false,
      getURL: () => 'file:///example/index.html',
      send: (channel, data) => {
        for (const listener of listeners.get(channel) ?? [])
          listener({ rawElectronEvent: true }, data)
      }
    }
  }
  const boundary = new IpcBoundary(
    (e) => trusted && e.senderFrame === frame && e.sender === event.sender,
    () => authorized
  )
  const transport = {
    invoke: vi.fn((channel: string, input: unknown) => boundary.invoke(channel, event, [input])),
    send: (channel: string, data: unknown) => {
      sent.push({ channel, data })
      const kind = (Object.keys(PUSH) as (keyof typeof PUSH)[]).find(
        (k) => PUSH[k].channel === channel
      )!
      boundary.control(kind, event, [data])
    },
    on: (channel: string, listener: (_event: unknown, data: unknown) => void) => {
      const records = listeners.get(channel) ?? new Set()
      records.add(listener)
      listeners.set(channel, records)
    },
    removeListener: (channel: string, listener: (_event: unknown, data: unknown) => void) => {
      listeners.get(channel)?.delete(listener)
    }
  }
  const facade = createFacade(transport)
  return {
    ...facade,
    boundary,
    event,
    transport,
    listeners,
    sent,
    setTrusted: (value: boolean) => {
      trusted = value
    },
    setAuthorized: (value: boolean) => {
      authorized = value
    }
  }
}
const publicCall = (api: NextCode, method: string, args: unknown[]) => {
  const [group, name] = method.split('.')
  return (
    api as unknown as Record<string, Record<string, (...args: unknown[]) => Promise<unknown>>>
  )[group][name](...args)
}
describe('IIS-02 exact restricted surface and fail-closed Main', () => {
  it('has precisely the independent 23-method and three-subscription register', () => {
    expect(Object.keys(IPC)).toEqual(methods)
    const { api } = rig()
    const functions = Object.entries(api).flatMap(([group, value]) =>
      Object.keys(value).map((name) => `${group}.${name}`)
    )
    expect(functions.filter((v) => !v.includes('subscribe'))).toEqual(methods)
    expect(functions.filter((v) => v.includes('subscribe')).sort()).toEqual([
      'conversations.subscribeConversation',
      'runtime.subscribeStatus',
      'tasks.subscribeTask'
    ])
    expect(Object.values(IPC).map((v) => v.channel)).toEqual(methods.map((v) => `ncd:ipc:v1:${v}`))
    expect(Object.values(PUSH).map((v) => v.channel)).toEqual([
      'ncd:ipc:v1:push.task',
      'ncd:ipc:v1:push.conversation',
      'ncd:ipc:v1:push.runtime'
    ])
    expect(Object.isFrozen(api)).toBe(true)
  })
  for (const method of methods as Method[]) {
    it(`${method}: validated known input reaches Main and returns an official unready error`, async () => {
      const { boundary, event } = rig()
      expect(IPC[method].input.safeParse(ipcInputs[method]).success).toBe(true)
      expect(await boundary.invoke(IPC[method].channel, event, [ipcInputs[method]])).toEqual(
        failure('RUNTIME_NOT_READY')
      )
    })
    it(`${method}: malformed payload never becomes success`, async () => {
      const { boundary, event } = rig()
      expect(
        await boundary.invoke(IPC[method].channel, event, [{ arbitraryCommand: 'python' }])
      ).toEqual(failure('BAD_INPUT'))
    })
  }
  it('rejects unknown channels, multiple arguments, foreign frames, and callers that lose trust', async () => {
    const r = rig()
    expect(await r.boundary.invoke('ncd:ipc:v1:task.execute', r.event, [{}])).toEqual(
      failure('BAD_INPUT')
    )
    expect(await r.boundary.invoke(IPC['app.bootstrap'].channel, r.event, [null, null])).toEqual(
      failure('BAD_INPUT')
    )
    expect(
      await r.boundary.invoke(IPC['app.bootstrap'].channel, { ...r.event, senderFrame: {} }, [null])
    ).toEqual(failure('NOT_AUTHORIZED'))
    r.setTrusted(false)
    expect(await r.boundary.invoke(IPC['app.bootstrap'].channel, r.event, [null])).toEqual(
      failure('NOT_AUTHORIZED')
    )
  })
  it('measures Unicode code points and rejects extra authority / path / enum / page fields', async () => {
    const r = rig()
    const base = ipcInputs['conversations.sendMessage'] as object
    const send = (delta: object) =>
      r.boundary.invoke(IPC['conversations.sendMessage'].channel, r.event, [{ ...base, ...delta }])
    expect(await send({ text: '😀'.repeat(16384) })).toEqual(failure('RUNTIME_NOT_READY'))
    for (const delta of [
      { text: '😀'.repeat(16385) },
      { text: '\ud800' },
      { role: 'system' },
      { workspace_root: 'C:/private' },
      { text: '' },
      { clientMutationId: 123 }
    ])
      expect(await send(delta)).toEqual(failure('BAD_INPUT'))
    for (const input of [
      { projectId: 'p', relativeDir: '../outside' },
      { projectId: 'p', relativeDir: '.', limit: 101 },
      { projectId: 'p', relativeDir: '.', limit: true }
    ])
      expect(await r.boundary.invoke(IPC['projects.listFiles'].channel, r.event, [input])).toEqual(
        failure('BAD_INPUT')
      )
    expect(await r.api.preferences.update({ savedDockWidth: 900 })).toEqual(failure('BAD_INPUT'))
  })
  it('rejects cycles, accessors and non-JSON objects before expensive schema work', () => {
    const cycle: Record<string, unknown> = {}
    cycle.self = cycle
    const getter = vi.fn(() => 'not read')
    for (const value of [
      cycle,
      new Date(),
      new Map(),
      Buffer.from('fixture'),
      { value: 1n },
      { value: undefined },
      Object.defineProperty({}, 'secret', { get: getter, enumerable: true })
    ])
      expect(() => assertJsonValue(value)).toThrow()
    expect(getter).not.toHaveBeenCalled()
    expect(() => assertJsonValue({ data: 'x'.repeat(262145) })).toThrow()
  })
  it('facade enforces arity, fixed argument adapters and sanitized transport errors', async () => {
    const r = rig()
    expect(await publicCall(r.api, 'app.bootstrap', ['sql'])).toEqual(failure('BAD_INPUT'))
    await r.api.projects.listFiles('project_fixture', '.', undefined, 40)
    expect(r.transport.invoke).toHaveBeenLastCalledWith(IPC['projects.listFiles'].channel, {
      projectId: 'project_fixture',
      relativeDir: '.',
      limit: 40
    })
    r.transport.invoke.mockRejectedValueOnce(new Error('synthetic private transport traceback'))
    expect(await r.api.app.bootstrap()).toEqual(failure('INTERNAL_ERROR'))
  })
  it('bounds aggregate serialized work and rejects array subclasses or hidden properties', () => {
    class ForeignArray extends Array {}
    const extra = Object.assign([], { command: 'unapproved' })
    for (const value of [
      new ForeignArray(),
      extra,
      Object.defineProperty({}, 'hidden', { value: 1 })
    ])
      expect(() => assertJsonValue(value)).toThrow('BAD_INPUT')
    expect(() => assertJsonValue(Array(100).fill('x'.repeat(10000)))).toThrow('RESOURCE_LIMIT')
    expect(() => assertJsonValue({ a: 1 }, 7)).not.toThrow()
    expect(() => assertJsonValue({ a: 1 }, 6)).toThrow('RESOURCE_LIMIT')
    expect(
      ConversationViewPage.safeParse({
        ...conversationPage,
        discussionTurns: [{ ...conversationPage.discussionTurns[0], modelId: 'provider:model/v1' }]
      }).success
    ).toBe(true)
  })
  it('acceptance is persisted-only and errors are the fixed 17 UI values', () => {
    expect(UI_ERROR_CODES).toHaveLength(17)
    expect(
      MessageAcceptance.safeParse({
        conversationId: 'c',
        messageId: 'm',
        acceptedAt: '2026-10-21T10:00:00Z',
        deliveryState: 'rejected'
      }).success
    ).toBe(false)
    expect(validateResult('app.bootstrap', { ok: true, data: { fake: true } })).toEqual(
      failure('INTERNAL_ERROR')
    )
  })
})
describe('IIS-02-C01 required closed projections, not a new public operation', () => {
  it('preserves required nulls and empty proposal fields', () => {
    expect(ConversationViewPage.parse(conversationPage)).toEqual(conversationPage)
    for (const field of ['availableProposals', 'availableProposalsTruncated', 'discussionTurns']) {
      const page = { ...conversationPage }
      delete (page as Record<string, unknown>)[field]
      expect(ConversationViewPage.safeParse(page).success).toBe(false)
    }
    expect(
      ConversationViewPage.safeParse({
        ...conversationPage,
        discussionTurns: [{ ...conversationPage.discussionTurns[0], lastAttempt: undefined }]
      }).success
    ).toBe(false)
  })
  it('rejects foreign proposal / user turn, excess proposals and nonexistent retry controls', () => {
    const proposal = {
      proposalId: 'p',
      projectId: 'project_fixture',
      conversationId: 'conversation_fixture',
      exactGoal: 'Fixture',
      issuedAt: '2026-10-21T10:00:00Z',
      expiresAt: '2050-10-21T10:00:00Z',
      state: 'available'
    }
    expect(
      ConversationViewPage.safeParse({
        ...conversationPage,
        availableProposals: [{ ...proposal, projectId: 'foreign' }]
      }).success
    ).toBe(false)
    expect(
      ConversationViewPage.safeParse({
        ...conversationPage,
        availableProposals: Array(41).fill(proposal)
      }).success
    ).toBe(false)
    expect(
      ConversationViewPage.safeParse({
        ...conversationPage,
        discussionTurns: [{ ...conversationPage.discussionTurns[0], userMessageId: 'foreign' }]
      }).success
    ).toBe(false)
    expect('retry' in rig().api.conversations).toBe(false)
  })
})
describe('three subscriptions: Main authority, sanitation and lifecycle', () => {
  it('delivers typed scoped projections only, isolates callbacks, and safely unregisters', () => {
    const r = rig()
    const callback = vi.fn()
    const broken = vi.fn(() => {
      throw new Error('fixture')
    })
    const stop1 = r.api.tasks.subscribeTask('task_fixture', broken)
    const stop2 = r.api.tasks.subscribeTask('task_fixture', callback)
    expect(r.boundary.subscriberCount).toBe(2)
    const update = { type: 'TaskEventCommitted', taskId: 'task_fixture', sequence: 1 }
    expect(r.boundary.publish('task', 'foreign', update)).toBe(0)
    expect(r.boundary.publish('task', 'task_fixture', update)).toBe(2)
    expect(callback).toHaveBeenCalledExactlyOnceWith(update)
    expect(r.boundary.publish('task', 'task_fixture', { ...update, rawEvent: { pid: 1 } })).toBe(0)
    stop1()
    stop1()
    stop2()
    expect(r.boundary.subscriberCount).toBe(0)
    expect(r.listeners.get(PUSH.task.channel)?.size).toBe(0)
  })
  it('defaults unavailable scoped stores to denied, rechecks permissions, and disposes on reload', () => {
    const r = rig(false)
    const callback = vi.fn()
    r.api.conversations.subscribeConversation('conversation_fixture', callback)
    expect(r.boundary.subscriberCount).toBe(0)
    r.setAuthorized(true)
    r.api.runtime.subscribeStatus(callback)
    expect(r.boundary.subscriberCount).toBe(1)
    r.setTrusted(false)
    expect(
      r.boundary.publish('runtime', null, {
        type: 'RuntimeStatusChanged',
        runtimeStatus: 'not_ready'
      })
    ).toBe(0)
    r.dispose()
    expect(callback).not.toHaveBeenCalled()
  })
  it('bounds listeners, validates input, and never exposes raw Electron event objects', () => {
    const r = rig()
    const callback = vi.fn()
    expect(() => r.api.tasks.subscribeTask('../path', callback)).toThrow(TypeError)
    for (let i = 0; i < 64; i++) r.api.runtime.subscribeStatus(callback)
    expect(() => r.api.runtime.subscribeStatus(callback)).toThrow(TypeError)
    r.dispose()
    expect(r.boundary.subscriberCount).toBe(0)
    expect(r.sent.every((v) => Object.values(PUSH).some((p) => p.channel === v.channel))).toBe(true)
  })
})
