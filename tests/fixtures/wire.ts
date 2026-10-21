import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const normativeStreams = [
  ...readFileSync(
    resolve(
      'docs/engineering/01-normative/NCD-03-IIS-01-JSONL-PROTOCOL-SPECIFICATION-OWNER-RATIFIED-REPRODUCTION.md'
    ),
    'utf8'
  ).matchAll(/```jsonl\r?\n([\s\S]*?)\r?\n```/g)
].map((match) => match[1].split(/\r?\n/).filter(Boolean))
export const normativeFrames = normativeStreams.flat().map((line) => JSON.parse(line))
export const ready = (role = 'discussion', id = 'ready_fixture') => ({
  version: 1,
  type: 'ready',
  message_id: id,
  correlation_id: null,
  payload: { process_role: role }
})
export const request = <I>(action: string, input: I, id = 'request_fixture') => ({
  version: 1,
  type: 'request',
  message_id: id,
  correlation_id: null,
  payload: { action, input }
})
export const response = (correlation: string, result: unknown, id = 'response_fixture') => ({
  version: 1,
  type: 'response',
  message_id: id,
  correlation_id: correlation,
  payload: { status: 'completed', result, reason: null }
})
export const accept = (id = 'accept_fixture') => ({
  version: 1,
  type: 'response',
  message_id: id,
  correlation_id: 'execute_fixture',
  payload: { status: 'accepted', result: null, reason: null }
})
export const discussion = (id = 'discussion_fixture') =>
  request(
    'discussion.send',
    {
      conversation_id: 'conv_fixture',
      user_message_id: 'message_fixture',
      text: 'Synthetic discussion',
      model_id: 'model_fixture',
      context_snapshot: { recent_messages: [], summaries: [], decisions: [], context_revision: 0 },
      project_ref: null
    },
    id
  )
export const execute = (id = 'execute_fixture') =>
  request(
    'task.execute',
    {
      task_id: 'task_fixture',
      conversation_id: 'conv_fixture',
      task_goal: 'Synthetic task: never executed',
      workspace_root: 'C:/example/workspace',
      conversation_context: null
    },
    id
  )
export const taskEvent = (
  name: string,
  sequence: number,
  extra: Record<string, unknown> = {},
  messageId = `outer_${sequence}`
) => ({
  version: 1,
  type: 'event',
  message_id: messageId,
  correlation_id: null,
  payload: {
    name,
    data: {
      task_id: 'task_fixture',
      event_id: `event_${sequence}`,
      sequence,
      source: 'agent_os',
      ...extra
    }
  }
})
export const started = () => taskEvent('task.started', 1, { phase: 'INITIALIZING' })
export const terminal = () =>
  taskEvent('task.failed', 2, {
    outcome: {
      task_id: 'task_fixture',
      success: false,
      final_phase: 'FAILED',
      summary: 'Synthetic fixture only',
      total_ticks: 1,
      rollbacks_triggered: 0,
      final_checkpoint_hash: null
    }
  })
export interface Vector {
  name: string
  bytes: Buffer
  valid: boolean
}
const encode = (value: unknown) => Buffer.from(JSON.stringify(value) + '\n')
export const wireVectors: Vector[] = normativeFrames.map((frame, i) => ({
  name: `normative fixture ${i + 1}`,
  bytes: encode(frame),
  valid: true
}))
// IIS-01 §16.5 preserves the native failed outcome's actual phase; it does
// not impose FAILED. A completed event requires both true and COMPLETED.
wireVectors.push({
  name: 'failed native outcome preserves its actual phase',
  bytes: encode(
    taskEvent('task.failed', 2, {
      outcome: {
        task_id: 'task_fixture',
        success: false,
        final_phase: 'VERIFYING',
        summary: 'Fixture only',
        total_ticks: 1,
        rollbacks_triggered: 0,
        final_checkpoint_hash: null
      }
    })
  ),
  valid: true
})
const invalid = (name: string, value: unknown) =>
  wireVectors.push({ name, bytes: encode(value), valid: false })
invalid('extra root key', { ...ready(), capability: 'execute' })
invalid('missing root field', {
  version: 1,
  type: 'ready',
  message_id: 'ready_fixture',
  payload: { process_role: 'discussion' }
})
invalid('boolean version', { ...ready(), version: true })
invalid('string version', { ...ready(), version: '1' })
invalid('unknown version', { ...ready(), version: 2 })
invalid('unknown type', { ...ready(), type: 'heartbeat' })
invalid('invalid ID', { ...ready(), message_id: '../private' })
invalid('non-null ready correlation', { ...ready(), correlation_id: 'other' })
invalid('extra ready payload', {
  ...ready(),
  payload: { process_role: 'discussion', capabilities: ['task.execute'] }
})
invalid('unknown role', ready('plugin'))
invalid('unknown action', request('worker.dispatch', {}))
invalid('task.cancel extra PID', request('task.cancel', { task_id: 'task_fixture', pid: 1 }))
invalid(
  'read unsafe metadata',
  request('project.read', {
    discussion_request_id: 'discussion_fixture',
    path: 'safe.ts',
    start_line: 1,
    end_line: 1,
    max_chars: 10,
    expected_mtime_ns: 1760860000000000000
  })
)
invalid(
  'read fractional lines',
  request('project.read', {
    discussion_request_id: 'discussion_fixture',
    path: 'safe.ts',
    start_line: 1.5,
    end_line: 2,
    max_chars: 10,
    expected_mtime_ns: null
  })
)
invalid(
  'read too many lines',
  request('project.read', {
    discussion_request_id: 'discussion_fixture',
    path: 'safe.ts',
    start_line: 1,
    end_line: 201,
    max_chars: 10,
    expected_mtime_ns: null
  })
)
invalid(
  'read traversal',
  request('project.read', {
    discussion_request_id: 'discussion_fixture',
    path: '../private',
    start_line: 1,
    end_line: 1,
    max_chars: 10,
    expected_mtime_ns: null
  })
)
invalid(
  'discovery excessive depth',
  request('project.discover', {
    discussion_request_id: 'discussion_fixture',
    directory: '.',
    max_depth: 4,
    limit: 40,
    cursor: null
  })
)
invalid(
  'boolean sequence',
  taskEvent('task.started', true as unknown as number, { phase: 'INITIALIZING' })
)
invalid(
  'source label forgery',
  taskEvent('task.started', 1, { phase: 'INITIALIZING', source: 'model' })
)
invalid('unknown event', taskEvent('worker.planned', 1, {}))
invalid(
  'unknown worker role',
  taskEvent('worker.started', 2, { worker_ref: 'worker_fixture', role: 'PLANNER' })
)
invalid(
  'event/outside ID collision',
  taskEvent('task.started', 1, { phase: 'INITIALIZING', event_id: 'outer_1' })
)
invalid('unpaired surrogate', discussionWithText('\ud800'))
invalid('oversized text', discussionWithText('😀'.repeat(16385)))
invalid('accepted result must be null', {
  ...accept(),
  payload: { status: 'accepted', result: { success: true }, reason: null }
})
invalid('unknown error code', {
  version: 1,
  type: 'error',
  message_id: 'error_fixture',
  correlation_id: null,
  payload: { code: 'SUCCESS', message: 'fixture', retryable: false }
})
for (const [name, data] of [
  [
    'duplicate root key',
    '{"version":1,"version":1,"type":"ready","message_id":"x","correlation_id":null,"payload":{"process_role":"discussion"}}\n'
  ],
  [
    'escaped duplicate key',
    '{"version":1,"type":"ready","message_id":"x","correlation_id":null,"payload":{"process_role":"discussion","process_\\u0072ole":"discussion"}}\n'
  ],
  ['integer lexeme float', JSON.stringify(ready()).replace('"version":1', '"version":1.0') + '\n'],
  [
    'integer lexeme exponent',
    JSON.stringify(ready()).replace('"version":1', '"version":1e0') + '\n'
  ],
  ['nonfinite value', JSON.stringify(ready()).replace('"version":1', '"version":NaN') + '\n'],
  ['missing LF', JSON.stringify(ready())],
  ['CRLF', JSON.stringify(ready()) + '\r\n'],
  ['BOM', '\ufeff' + JSON.stringify(ready()) + '\n'],
  ['stdout chatter', 'AgentOS is running\n'],
  ['blank line', '\n'],
  ['trailing garbage', JSON.stringify(ready()) + 'x\n']
] as const)
  wireVectors.push({ name, bytes: Buffer.from(data), valid: false })
wireVectors.push({ name: 'invalid UTF-8', bytes: Buffer.from([0xc3, 0x28, 10]), valid: false })
const base = encode(ready())
wireVectors.push({
  name: 'record exact hard cap',
  bytes: Buffer.concat([
    base.subarray(0, -1),
    Buffer.alloc(262144 - base.length, 32),
    Buffer.from('\n')
  ]),
  valid: true
})
wireVectors.push({
  name: 'record above hard cap',
  bytes: Buffer.concat([
    base.subarray(0, -1),
    Buffer.alloc(262145 - base.length, 32),
    Buffer.from('\n')
  ]),
  valid: false
})
wireVectors.push({
  name: 'Unicode within code-point cap',
  bytes: encode(discussionWithText('😀'.repeat(16384))),
  valid: true
})
function discussionWithText(text: string) {
  const frame = discussion()
  frame.payload.input.text = text
  return frame
}
