import { z } from 'zod'
import {
  ID,
  UInt,
  PositiveInt,
  object,
  text,
  RelativePath,
  FilePath,
  WindowsWorkspace,
  bytes
} from './common'

export const WIRE_TYPES = ['ready', 'request', 'response', 'event', 'error'] as const
export const WIRE_ACTIONS = [
  'discussion.send',
  'project.discover',
  'project.read',
  'task.execute',
  'task.cancel'
] as const
export const WIRE_EVENTS = [
  'task.started',
  'task.progress',
  'worker.started',
  'worker.completed',
  'file.changed',
  'test.result',
  'task.completed',
  'task.failed',
  'task.cancelled'
] as const
export const WIRE_ERRORS = [
  'BAD_FRAME',
  'BAD_SCHEMA',
  'UNSUPPORTED_VERSION',
  'DUPLICATE_MESSAGE_ID',
  'INVALID_CORRELATION',
  'INVALID_STATE',
  'NOT_AUTHORIZED',
  'WORKSPACE_MISMATCH',
  'STALE_SOURCE',
  'SENSITIVE_CONTENT',
  'RESOURCE_LIMIT',
  'PROVIDER_UNAVAILABLE',
  'PROVIDER_TIMEOUT',
  'STARTUP_FAILED',
  'BROKER_IO_ERROR',
  'INTERNAL_FAILURE'
] as const
export const Role = z.enum(['discussion', 'coding_task'])
export const Phase = z.enum([
  'INITIALIZING',
  'EXPLORING',
  'PLANNING',
  'EXECUTING',
  'VERIFYING',
  'COMPLETED',
  'FAILED'
])
export const WorkerRole = z.enum(['SCOUT', 'SURGEON', 'INQUISITOR'])
export const DecimalTimestamp = z
  .string()
  .regex(/^(0|[1-9][0-9]*)$/)
  .max(19)
  .refine((value) => /^[0-9]{1,19}$/.test(value) && BigInt(value) <= 9223372036854775807n)
const Candidate = object({ text: text(2048), source_message_ids: z.array(ID).max(100) })
export const ContextV1 = object({
  recent_messages: z
    .array(object({ message_id: ID, role: z.enum(['user', 'assistant']), text: text(16384) }))
    .max(20),
  summaries: z
    .array(object({ summary_id: ID, text: text(2048), source_message_ids: z.array(ID).max(100) }))
    .max(10),
  decisions: z
    .array(object({ decision_id: ID, text: text(2048), approval_message_id: ID }))
    .max(20),
  context_revision: UInt
}).refine((value) => bytes(JSON.stringify(value)) <= 98304)
export const TaskOutcomeV1 = object({
  task_id: ID,
  success: z.boolean(),
  final_phase: Phase,
  summary: text(2048),
  total_ticks: UInt,
  rollbacks_triggered: UInt,
  final_checkpoint_hash: text(128).nullable()
})
export const ConversationContext = object({
  schema_version: z.literal(1),
  conversation_id: ID,
  workspace_root: WindowsWorkspace,
  prior_tasks: z
    .array(
      object({
        task_id: ID,
        task_goal: text(500, 1),
        success: z.boolean(),
        final_phase: Phase,
        summary: text(1000, 1)
      }).refine((value) => value.success === (value.final_phase === 'COMPLETED'))
    )
    .max(3),
  recent_messages: z
    .array(object({ role: z.enum(['user', 'assistant']), content: text(1000, 1) }))
    .max(6),
  advisory_preferences: z.array(text(200, 1)).max(5)
})
export const requestInputs = {
  'discussion.send': object({
    conversation_id: ID,
    user_message_id: ID,
    text: text(16384, 1),
    model_id: text(128, 1),
    context_snapshot: ContextV1,
    project_ref: ID.nullable()
  }),
  'project.discover': object({
    discussion_request_id: ID,
    directory: RelativePath,
    max_depth: z.number().int().min(1).max(3),
    limit: z.number().int().min(1).max(100),
    cursor: text(128, 1).nullable()
  }),
  'project.read': object({
    discussion_request_id: ID,
    path: FilePath,
    start_line: PositiveInt,
    end_line: PositiveInt,
    max_chars: z.number().int().min(1).max(16384),
    expected_mtime_ns: DecimalTimestamp.nullable()
  }).refine((v) => v.end_line >= v.start_line && v.end_line - v.start_line < 200),
  'task.execute': object({
    task_id: ID,
    conversation_id: ID,
    task_goal: text(16384, 1),
    workspace_root: WindowsWorkspace,
    conversation_context: ConversationContext.nullable()
  }).refine(
    (v) =>
      !v.conversation_context ||
      (v.conversation_context.conversation_id === v.conversation_id &&
        v.conversation_context.workspace_root === v.workspace_root &&
        v.task_id !== v.conversation_id &&
        !v.conversation_context.prior_tasks.some((t) => t.task_id === v.task_id))
  ),
  'task.cancel': object({ task_id: ID })
} as const
export const responseResults = {
  'discussion.send': object({
    answer: text(32768),
    task_proposal: object({ goal: text(16384, 1), reason: text(2048) }).nullable(),
    summary_candidates: z.array(Candidate).max(100),
    decision_candidates: z.array(Candidate).max(100)
  }),
  'project.discover': object({
    directory: RelativePath,
    entries: z
      .array(
        object({
          path: RelativePath,
          kind: z.enum(['file', 'directory']),
          size_bytes: UInt.nullable()
        })
      )
      .max(100),
    next_cursor: text(128, 1).nullable(),
    complete: z.boolean(),
    excluded_count: UInt
  }),
  'project.read': object({
    path: FilePath,
    start_line: PositiveInt,
    end_line: PositiveInt,
    content: text(16384),
    truncated: z.boolean(),
    observed_mtime_ns: DecimalTimestamp,
    excerpt_sha256: z.string().regex(/^[a-f0-9]{64}$/)
  }).refine((v) => v.end_line >= v.start_line && v.end_line - v.start_line < 200),
  'task.cancel': object({ cancel_request_registered: z.literal(true) })
} as const
const eventCommon = {
  task_id: ID,
  event_id: ID,
  sequence: PositiveInt,
  source: z.literal('agent_os')
}
export const eventData = {
  'task.started': object({ ...eventCommon, phase: Phase }),
  'task.progress': object({ ...eventCommon, phase: Phase, detail: text(2048) }),
  'worker.started': object({ ...eventCommon, worker_ref: ID, role: WorkerRole }),
  'worker.completed': object({
    ...eventCommon,
    worker_ref: ID,
    role: WorkerRole,
    status: z.enum(['SUCCESS', 'FAILED', 'BLOCKED']),
    summary: text(2048)
  }),
  'file.changed': object({
    ...eventCommon,
    path: FilePath,
    change_kind: z.enum(['created', 'modified', 'deleted'])
  }),
  'test.result': object({
    ...eventCommon,
    status: z.enum(['passed', 'failed', 'skipped']),
    summary: text(2048)
  }),
  'task.completed': object({
    ...eventCommon,
    outcome: TaskOutcomeV1.refine((v) => v.success && v.final_phase === 'COMPLETED')
  }),
  'task.failed': object({ ...eventCommon, outcome: TaskOutcomeV1.refine((v) => !v.success) }),
  'task.cancelled': object({ ...eventCommon, confirmation: text(2048, 1) })
} as const
const request = <A extends keyof typeof requestInputs>(action: A) =>
  object({ action: z.literal(action), input: requestInputs[action] })
const event = <N extends keyof typeof eventData>(name: N) =>
  object({ name: z.literal(name), data: eventData[name] })
const RequestPayload = z.discriminatedUnion('action', [
  request('discussion.send'),
  request('project.discover'),
  request('project.read'),
  request('task.execute'),
  request('task.cancel')
])
const EventPayload = z.discriminatedUnion('name', [
  event('task.started'),
  event('task.progress'),
  event('worker.started'),
  event('worker.completed'),
  event('file.changed'),
  event('test.result'),
  event('task.completed'),
  event('task.failed'),
  event('task.cancelled')
])
export const WireErrorPayload = object({
  code: z.enum(WIRE_ERRORS),
  message: text(2048),
  retryable: z.boolean()
})
const ResponsePayload = z.union([
  object({ status: z.literal('accepted'), result: z.null(), reason: z.null() }),
  object({
    status: z.literal('completed'),
    result: z.union(Object.values(responseResults)),
    reason: z.null()
  }),
  object({
    status: z.literal('rejected'),
    result: z.null(),
    reason: object({ code: z.enum(WIRE_ERRORS), message: text(2048) })
  })
])
const base = { version: z.literal(1), message_id: ID }
export const WireMessage = z.discriminatedUnion('type', [
  object({
    ...base,
    type: z.literal('ready'),
    correlation_id: z.null(),
    payload: object({ process_role: Role })
  }),
  object({
    ...base,
    type: z.literal('request'),
    correlation_id: z.null(),
    payload: RequestPayload
  }),
  object({ ...base, type: z.literal('response'), correlation_id: ID, payload: ResponsePayload }),
  object({ ...base, type: z.literal('event'), correlation_id: z.null(), payload: EventPayload }),
  object({
    ...base,
    type: z.literal('error'),
    correlation_id: ID.nullable(),
    payload: WireErrorPayload
  })
])
export type WireMessage = z.infer<typeof WireMessage>
export type WireAction = (typeof WIRE_ACTIONS)[number]
export type ProcessRole = z.infer<typeof Role>
export type WireErrorCode = (typeof WIRE_ERRORS)[number]
