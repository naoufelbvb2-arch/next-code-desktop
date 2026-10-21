// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import {
  JsonlDecoder,
  decodeLine,
  serializeWire,
  ProtocolConnection,
  ProtocolError,
  WIRE_LIMITS,
  BoundedFrameQueue,
  newMessageId,
  acceptProtocolStream
} from '../../contracts/jsonl'
import { WIRE_TYPES, WIRE_ACTIONS, WIRE_EVENTS, WireMessage } from '../../contracts/wire-schema'
import {
  normativeStreams,
  wireVectors,
  ready,
  request,
  response,
  accept,
  discussion,
  execute,
  started,
  terminal,
  taskEvent
} from '../fixtures/wire'

describe('IIS-01 closed framing and schema vectors', () => {
  for (const vector of wireVectors)
    it(vector.name, () => {
      if (vector.valid) expect(() => decodeLine(vector.bytes)).not.toThrow()
      else expect(() => decodeLine(vector.bytes)).toThrow(ProtocolError)
    })
  it('has exactly five types, five actions and nine event names', () => {
    expect(WIRE_TYPES).toHaveLength(5)
    expect(WIRE_ACTIONS).toHaveLength(5)
    expect(WIRE_EVENTS).toHaveLength(9)
    expect(new Set(Array.from({ length: 1000 }, () => newMessageId())).size).toBe(1000)
    expect(newMessageId()).toMatch(/^[A-Za-z0-9_-]{1,64}$/)
  })
  it('roundtrips every canonical fixture with exactly five root keys and one LF', () => {
    for (const stream of normativeStreams)
      for (const line of stream) {
        const frame = decodeLine(Buffer.from(line + '\n'))
        const bytes = serializeWire(frame)
        expect(decodeLine(bytes)).toEqual(frame)
        expect(Object.keys(frame).sort()).toEqual(
          ['version', 'type', 'message_id', 'correlation_id', 'payload'].sort()
        )
      }
  })
  it('handles multibyte characters split at every byte without decoding partial UTF-8', () => {
    const decoder = new JsonlDecoder()
    const frame = discussion()
    frame.payload.input.text = 'Synthetic 😀 UTF-8'
    const output = []
    for (const byte of serializeWire(frame)) output.push(...decoder.push(Buffer.from([byte]), 0))
    expect(output).toEqual([frame])
    expect(decoder.bufferedBytes).toBe(0)
  })
  it('bounds partial data, the first-byte deadline, EOF and records per push', () => {
    const decoder = new JsonlDecoder()
    decoder.push(Buffer.from('{'), 0)
    decoder.push(Buffer.from(' '), 14999)
    expect(() => decoder.tick(15000)).toThrow('BAD_FRAME')
    expect(() => decoder.push(Buffer.from('}\n'), 15001)).toThrow('INVALID_STATE')
    const partial = new JsonlDecoder()
    partial.push(Buffer.from('{'), 0)
    expect(() => partial.end()).toThrow('BAD_FRAME')
    expect(() => new JsonlDecoder().push(Buffer.alloc(262145, 32), 0)).toThrow('RESOURCE_LIMIT')
    expect(() =>
      new JsonlDecoder().push(Buffer.concat(Array(257).fill(serializeWire(ready()))), 0)
    ).toThrow('RESOURCE_LIMIT')
  })
  it('never interprets stderr, including otherwise valid event or READY JSON', () => {
    const decoder = new JsonlDecoder()
    expect(acceptProtocolStream('stderr', decoder, serializeWire(ready()), 0)).toEqual([])
    expect(decoder.bufferedBytes).toBe(0)
    expect(acceptProtocolStream('stdout', decoder, serializeWire(ready()), 0)).toHaveLength(1)
  })
  it('bounds outbound/event queues by both records and bytes, with finite pressure', () => {
    const queue = new BoundedFrameQueue()
    const data = serializeWire(ready())
    for (let i = 0; i < 256; i++) expect(queue.offer(data, 0)).toBe(true)
    expect(queue.offer(data, 1)).toBe(false)
    expect(queue.size).toBe(256)
    expect(() => queue.tick(30000)).toThrow('RESOURCE_LIMIT')
    expect(queue.take()).toEqual(data)
    expect(queue.offer(data, 30001)).toBe(true)
    const byteQueue = new BoundedFrameQueue()
    const full = Buffer.alloc(WIRE_LIMITS.recordBytes)
    for (let i = 0; i < 32; i++) expect(byteQueue.offer(full, 0)).toBe(true)
    expect(byteQueue.byteLength).toBe(8388608)
    expect(byteQueue.offer(full, 0)).toBe(false)
  })
})
function coding(authorized = true) {
  const connection = new ProtocolConnection({
    role: 'coding_task',
    openedAt: 0,
    task: {
      taskId: 'task_fixture',
      conversationId: 'conv_fixture',
      workspaceRoot: 'C:/example/workspace'
    },
    authorizeExecute: () => authorized
  })
  connection.observe('child-to-main', ready('coding_task'), 0)
  return connection
}
describe('IIS-01 connection-bound state, identity and capabilities', () => {
  it('accepts both normative fixture streams under isolated trusted authorization callbacks', () => {
    for (let i = 0; i < normativeStreams.length; i++) {
      const frames = normativeStreams[i].map((line) => decodeLine(Buffer.from(line + '\n')))
      const connection = new ProtocolConnection({
        role: i === 0 ? 'discussion' : 'coding_task',
        openedAt: 0,
        task: {
          taskId: 'task_001',
          conversationId: 'conv_001',
          workspaceRoot: 'C:/example/workspace'
        },
        authorizeBroker: () => true,
        authorizeExecute: () => true
      })
      for (const frame of frames) {
        const dir =
          frame.type === 'request'
            ? frame.payload.action.startsWith('project.')
              ? 'child-to-main'
              : 'main-to-child'
            : frame.type === 'response' && frame.correlation_id.startsWith('py_req')
              ? 'main-to-child'
              : 'child-to-main'
        expect(() => connection.observe(dir, frame, 1)).not.toThrow()
      }
    }
  })
  it.each(['discussion', 'coding_task'] as const)(
    'gates %s on a single assigned READY, fresh process and deadline',
    (role) => {
      expect(() =>
        new ProtocolConnection({ role, openedAt: 0 }).observe('main-to-child', discussion(), 0)
      ).toThrow('INVALID_STATE')
      const c = new ProtocolConnection({ role, openedAt: 0 })
      expect(() =>
        c.observe('child-to-main', ready(role === 'discussion' ? 'coding_task' : 'discussion'), 0)
      ).toThrow('INVALID_STATE')
      expect(() =>
        new ProtocolConnection({ role, openedAt: 0 }).observe('child-to-main', ready(role), 30000)
      ).toThrow('STARTUP_FAILED')
      const repeated = new ProtocolConnection({ role, openedAt: 0 })
      repeated.observe('child-to-main', ready(role), 0)
      expect(() => repeated.observe('child-to-main', ready(role, 'different_ready'), 1)).toThrow(
        'INVALID_STATE'
      )
    }
  )
  it('uses a shared ID set in both directions and refuses stale/orphan correlations', () => {
    const c = new ProtocolConnection({ role: 'discussion', openedAt: 0 })
    c.observe('child-to-main', ready(), 0)
    expect(() => c.observe('main-to-child', discussion('ready_fixture'), 0)).toThrow(
      'DUPLICATE_MESSAGE_ID'
    )
    const fresh = new ProtocolConnection({ role: 'discussion', openedAt: 0 })
    fresh.observe('child-to-main', ready(), 0)
    expect(() =>
      fresh.observe(
        'child-to-main',
        response('old_request', {
          answer: 'x',
          task_proposal: null,
          summary_candidates: [],
          decision_candidates: []
        }),
        1
      )
    ).toThrow('INVALID_CORRELATION')
  })
  it('requires explicit trusted execution admission and exact task/workspace binding', () => {
    expect(() => coding(false).observe('main-to-child', execute(), 1)).toThrow('NOT_AUTHORIZED')
    const mismatch = execute()
    mismatch.payload.input.workspace_root = 'C:/other'
    expect(() => coding().observe('main-to-child', mismatch, 1)).toThrow('NOT_AUTHORIZED')
    const duplicate = coding()
    duplicate.observe('main-to-child', execute(), 1)
    expect(() => duplicate.observe('main-to-child', execute('again'), 2)).toThrow('NOT_AUTHORIZED')
  })
  it('refuses cross-role actions and wrong directions', () => {
    const d = new ProtocolConnection({ role: 'discussion', openedAt: 0 })
    d.observe('child-to-main', ready(), 0)
    expect(() => d.observe('main-to-child', execute(), 1)).toThrow('NOT_AUTHORIZED')
    expect(() =>
      coding().observe(
        'child-to-main',
        request('project.read', {
          discussion_request_id: 'd',
          path: 'safe.ts',
          start_line: 1,
          end_line: 1,
          max_chars: 10,
          expected_mtime_ns: null
        }),
        1
      )
    ).toThrow('NOT_AUTHORIZED')
  })
  it('binds broker reads to an active discussion and a trusted broker check', () => {
    const make = (authorized: boolean) => {
      const c = new ProtocolConnection({
        role: 'discussion',
        openedAt: 0,
        authorizeBroker: () => authorized
      })
      c.observe('child-to-main', ready(), 0)
      c.observe('main-to-child', discussion(), 1)
      return c
    }
    const broker = request('project.discover', {
      discussion_request_id: 'discussion_fixture',
      directory: '.',
      max_depth: 1,
      limit: 40,
      cursor: null
    })
    expect(() => make(false).observe('child-to-main', broker, 2)).toThrow('NOT_AUTHORIZED')
    const foreign = structuredClone(broker)
    foreign.payload.input = { ...foreign.payload.input, discussion_request_id: 'foreign' }
    expect(() => make(true).observe('child-to-main', foreign, 2)).toThrow('NOT_AUTHORIZED')
    expect(() => make(true).observe('child-to-main', broker, 2)).not.toThrow()
  })
  it('reserves a cancellation slot while execute is pending; acknowledgment is not a terminal event', () => {
    const c = coding()
    c.observe('main-to-child', execute(), 1)
    c.observe('child-to-main', accept(), 2)
    c.observe('child-to-main', started(), 3)
    c.observe(
      'main-to-child',
      request('task.cancel', { task_id: 'task_fixture' }, 'cancel_fixture'),
      4
    )
    c.observe('child-to-main', response('cancel_fixture', { cancel_request_registered: true }), 5)
    expect(c.state.terminalObserved).toBe(false)
    c.close()
    expect(c.state.historyIncomplete).toBe(true)
  })
  it('distinguishes acceptance, actual start and a terminal observation without claiming durability', () => {
    const c = coding()
    c.observe('main-to-child', execute(), 1)
    c.observe('child-to-main', accept(), 2)
    expect(c.state.terminalObserved).toBe(false)
    c.observe('child-to-main', started(), 3)
    c.observe('child-to-main', terminal(), 4)
    expect(c.state.terminalObserved).toBe(true)
    expect(c.state.pending).toBe(1)
    expect(() =>
      c.observe('child-to-main', taskEvent('task.cancelled', 3, { confirmation: 'fixture' }), 5)
    ).toThrow('INVALID_STATE')
  })
  it('rejects duplicate acceptance and completed task.execute responses', () => {
    const a = coding()
    a.observe('main-to-child', execute(), 1)
    a.observe('child-to-main', accept(), 2)
    expect(() => a.observe('child-to-main', accept('second'), 3)).toThrow('INVALID_STATE')
    const b = coding()
    b.observe('main-to-child', execute(), 1)
    expect(() =>
      b.observe(
        'child-to-main',
        response('execute_fixture', { cancel_request_registered: true }),
        2
      )
    ).toThrow('INVALID_STATE')
  })
  it('detects gaps and conflicting duplicates, deduplicating semantically equal events', () => {
    const c = coding()
    c.observe('main-to-child', execute(), 1)
    c.observe('child-to-main', accept(), 2)
    c.observe('child-to-main', started(), 3)
    const exact = started()
    exact.message_id = 'another_outer'
    exact.payload.data = Object.fromEntries(
      Object.entries(exact.payload.data).reverse()
    ) as typeof exact.payload.data
    expect(c.observe('child-to-main', exact, 4).duplicateEvent).toBe(true)
    c.observe(
      'child-to-main',
      taskEvent('task.progress', 3, { phase: 'EXECUTING', detail: 'fixture' }),
      5
    )
    expect(c.state.historyIncomplete).toBe(true)
    const conflict = started()
    conflict.message_id = 'conflict_outer'
    conflict.payload.data.event_id = 'other_event'
    expect(() => c.observe('child-to-main', conflict, 6)).toThrow('INVALID_STATE')
    expect(c.state.integrityConflict).toBe(true)
  })
  it('limits general inflight requests while keeping a fresh connection independent', () => {
    const c = new ProtocolConnection({ role: 'discussion', openedAt: 0 })
    c.observe('child-to-main', ready(), 0)
    for (let i = 0; i < 16; i++) c.observe('main-to-child', discussion('request_' + i), 1)
    expect(() => c.observe('main-to-child', discussion('request_17'), 1)).toThrow('RESOURCE_LIMIT')
    const fresh = new ProtocolConnection({ role: 'discussion', openedAt: 0 })
    expect(() => fresh.observe('child-to-main', ready(), 0)).not.toThrow()
  })
  it('enforces broker and discussion deadlines without starting a process or retry', () => {
    const c = new ProtocolConnection({
      role: 'discussion',
      openedAt: 0,
      authorizeBroker: () => true
    })
    c.observe('child-to-main', ready(), 0)
    c.observe('main-to-child', discussion(), 1)
    c.observe(
      'child-to-main',
      request('project.discover', {
        discussion_request_id: 'discussion_fixture',
        directory: '.',
        max_depth: 1,
        limit: 40,
        cursor: null
      }),
      2
    )
    expect(() => c.tick(30001)).not.toThrow()
    expect(() => c.tick(30002)).toThrow('BROKER_IO_ERROR')
    expect(c.state).toMatchObject({ closed: true, pending: 0, terminalObserved: false })
    const d = new ProtocolConnection({ role: 'discussion', openedAt: 0 })
    d.observe('child-to-main', ready(), 0)
    d.observe('main-to-child', discussion(), 1)
    expect(() => d.tick(300000)).not.toThrow()
    expect(() => d.tick(300001)).toThrow('PROVIDER_TIMEOUT')
  })
  it('rejects ordinary rejection after execute admission and never turns it into task finality', () => {
    const c = coding()
    c.observe('main-to-child', execute(), 1)
    c.observe('child-to-main', accept(), 2)
    expect(() =>
      c.observe(
        'child-to-main',
        {
          version: 1,
          type: 'response',
          message_id: 'late_rejection',
          correlation_id: 'execute_fixture',
          payload: {
            status: 'rejected',
            result: null,
            reason: { code: 'NOT_AUTHORIZED', message: 'fixture' }
          }
        },
        3
      )
    ).toThrow('INVALID_STATE')
    expect(c.state).toMatchObject({
      closed: true,
      historyIncomplete: true,
      terminalObserved: false
    })
  })
  it('validates excerpt result hash against the emitted UTF-8 content', () => {
    const c = new ProtocolConnection({
      role: 'discussion',
      openedAt: 0,
      authorizeBroker: () => true
    })
    c.observe('child-to-main', ready(), 0)
    c.observe('main-to-child', discussion(), 1)
    c.observe(
      'child-to-main',
      request(
        'project.read',
        {
          discussion_request_id: 'discussion_fixture',
          path: 'safe.ts',
          start_line: 1,
          end_line: 1,
          max_chars: 10,
          expected_mtime_ns: null
        },
        'read_fixture'
      ),
      2
    )
    const content = 'fixture'
    const result = {
      path: 'safe.ts',
      start_line: 1,
      end_line: 1,
      content,
      truncated: false,
      observed_mtime_ns: '1760860000000000000',
      excerpt_sha256: createHash('sha256').update(content).digest('hex')
    }
    expect(() => c.observe('main-to-child', response('read_fixture', result), 3)).not.toThrow()
  })
  it('does not add task retry, heartbeat or replay actions', () => {
    expect(WIRE_ACTIONS).not.toContain('task.retry')
    expect(WireMessage.safeParse({ ...ready(), type: 'heartbeat' }).success).toBe(false)
  })
})
