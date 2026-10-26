import { z } from 'zod'
import { ID, Cursor, Timestamp, UInt, object, text, RelativePath, bytes } from './common'
import { TaskOutcomeV1, WireMessage } from './wire-schema'

export const UI_ERROR_CODES = [
  'BAD_INPUT',
  'NOT_FOUND',
  'NOT_AUTHORIZED',
  'WORKSPACE_UNAVAILABLE',
  'SOURCE_STALE',
  'SENSITIVE_CONTENT',
  'MODEL_UNAVAILABLE',
  'PROVIDER_FAILED',
  'RUNTIME_NOT_READY',
  'PROPOSAL_EXPIRED',
  'PROPOSAL_ALREADY_USED',
  'TASK_BUSY',
  'TASK_UNKNOWN',
  'DATABASE_UNAVAILABLE',
  'RESOURCE_LIMIT',
  'CANCEL_PENDING',
  'INTERNAL_ERROR'
] as const
export const UiErrorCode = z.enum(UI_ERROR_CODES)
export type UiErrorCode = z.infer<typeof UiErrorCode>
export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: UiErrorCode; message: string; retryable: boolean } }
export const ErrorView = object({ code: UiErrorCode, message: text(2048), retryable: z.boolean() })
export const ipcResult = <S extends z.ZodType>(schema: S) =>
  z.union([
    object({ ok: z.literal(true), data: schema }),
    object({ ok: z.literal(false), error: ErrorView })
  ])
export const PageLimit = z.number().int().min(1).max(100)
export const ProjectSummary = object({
  projectId: ID,
  displayName: text(256),
  canonicalPathLabel: text(1024),
  available: z.boolean()
})
export const TaskState = z.enum([
  'queued',
  'starting',
  'running',
  'cancel_requested',
  'completed',
  'failed',
  'cancelled',
  'unknown',
  'needs_reconciliation'
])
export const TaskSummary = object({
  taskId: ID,
  conversationId: ID,
  projectId: ID,
  state: TaskState
})
// Owner-approved IIS-02-C02: read-only durable admission goal.
export const TaskView = TaskSummary.extend({
  outcome: TaskOutcomeV1.nullable(),
  exactGoal: text(16384, 1)
}).strict()
export const ChatDockState = object({
  visible: z.boolean(),
  primaryTab: z.enum(['Terminal', 'Files']),
  terminalSubtab: z.enum(['Agent Logs', 'Interactive Shell']),
  explicitlyHidden: z.boolean()
})
export const ChatDockStateView = ChatDockState.extend({ conversationId: ID }).strict()
// IIS-02 defines a closed versioned display record, but does not freeze its
// internal field spelling beyond savedDockWidth. These P2 display keys are local
// DTO conventions, not new IPC operations or a persistence implementation.
export const UiPreferences = object({
  version: z.literal(1),
  savedDockWidth: z.number().min(320).max(480),
  sidebarCollapsed: z.boolean(),
  reducedMotion: z.boolean().optional(),
  ambientLight: z.boolean()
})
export const PreferencesDelta = UiPreferences.omit({ version: true })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0)
export const RuntimeStatus = z.enum(['not_ready', 'ready', 'unavailable', 'unknown'])
export const BootstrapView = object({
  selectedProject: ProjectSummary.nullable(),
  selectedConversationId: ID.nullable(),
  discussionModelId: Cursor.nullable(),
  runtimeStatus: RuntimeStatus,
  activeTaskSummaries: z.array(TaskSummary).max(100),
  uiPreferences: UiPreferences
})
export const ModelChoice = object({
  modelId: Cursor,
  providerLabel: text(128),
  displayName: text(256),
  capabilities: z.array(z.enum(['discussion', 'coding'])).max(2),
  availability: z.enum(['available', 'unavailable', 'unknown'])
})
export const ModelSelectionView = object({ modelId: Cursor })
export const ConversationSummary = object({
  conversationId: ID,
  projectId: ID.nullable(),
  title: text(256),
  lastMessageAt: Timestamp.nullable(),
  taskStatusSummary: TaskState.nullable()
})
export const MessageView = object({
  messageId: ID,
  role: z.enum(['user', 'assistant']),
  text: text(32768),
  deliveryState: z.enum(['persisted', 'pending', 'issued', 'answered', 'failed', 'unknown']),
  createdAt: Timestamp
})
export const ProjectInspectionView = object({
  conversationId: ID,
  state: z.enum([
    'not_started',
    'discovering',
    'reading',
    'analyzing',
    'completed',
    'partial',
    'failed'
  ]),
  discoveredCount: UInt.optional(),
  actuallyReadCount: UInt,
  excludedCount: UInt,
  coverageNote: text(2048),
  updatedAt: Timestamp
})
export const DisclosureChallengeView = object({
  challengeId: ID,
  projectId: ID,
  providerLabel: text(128),
  disclosureClass: text(128, 1),
  status: z.literal('pending'),
  scopeDescription: text(2048)
})
export const DisclosureConsentSummary = object({
  consentId: ID,
  projectId: ID,
  providerLabel: text(128),
  disclosureClass: text(128, 1),
  status: z.enum(['granted', 'revoked']),
  updatedAt: Timestamp
})
export const DisclosureDecisionView = object({
  challengeId: ID.optional(),
  consentId: ID.optional(),
  status: z.enum(['granted', 'denied', 'revoked'])
})
export const ProposalReadV1 = object({
  proposalId: ID,
  projectId: ID,
  conversationId: ID,
  exactGoal: text(16384, 1),
  issuedAt: Timestamp,
  expiresAt: Timestamp,
  state: z.literal('available')
})
export const DiscussionTurnReadV1 = object({
  userMessageId: ID,
  modelId: Cursor,
  status: z.enum(['pending', 'issued', 'answered', 'failed', 'unknown']),
  lastErrorCode: UiErrorCode.nullable(),
  lastAttempt: object({
    attemptId: ID,
    modelId: Cursor,
    status: z.enum(['issued', 'completed', 'failed', 'unknown']),
    issuedAt: Timestamp,
    finishedAt: Timestamp.nullable(),
    isRetry: z.boolean()
  }).nullable()
})
export const ConversationViewPage = object({
  conversation: ConversationSummary,
  dockState: ChatDockStateView.nullable(),
  messages: z.array(MessageView).max(100),
  tasks: z.array(TaskSummary).max(100),
  nextCursor: Cursor.nullable(),
  inspectionStatus: ProjectInspectionView.nullable(),
  disclosureChallenges: z.array(DisclosureChallengeView).max(100),
  availableProposals: z.array(ProposalReadV1).max(40),
  availableProposalsTruncated: z.boolean(),
  discussionTurns: z.array(DiscussionTurnReadV1).max(100)
}).superRefine((page, ctx) => {
  const cid = page.conversation.conversationId
  const users = page.messages.filter((m) => m.role === 'user').map((m) => m.messageId)
  if (
    (page.dockState !== null && page.dockState.conversationId !== cid) ||
    page.availableProposals.some(
      (p) => p.conversationId !== cid || p.projectId !== page.conversation.projectId
    ) ||
    page.discussionTurns.some((t) => !users.includes(t.userMessageId)) ||
    new Set(page.discussionTurns.map((t) => t.userMessageId)).size !== page.discussionTurns.length
  )
    ctx.addIssue({ code: 'custom', message: 'Invalid conversation scope' })
})
export const ConversationSummaryPage = object({
  conversations: z.array(ConversationSummary).max(100),
  nextCursor: Cursor.nullable()
})
export const TaskSummaryPage = object({
  tasks: z.array(TaskSummary).max(100),
  nextCursor: Cursor.nullable()
})
export const MessageAcceptance = object({
  conversationId: ID,
  messageId: ID,
  acceptedAt: Timestamp,
  deliveryState: z.literal('persisted')
})
export const TaskAdmissionView = object({
  taskId: ID,
  conversationId: ID,
  projectId: ID,
  state: z.enum(['queued', 'starting'])
})
export const CancelRequestView = object({
  taskId: ID,
  state: z.enum(['requested', 'already_requested', 'not_running'])
})
export const FileListingPage = object({
  projectId: ID,
  relativeDir: RelativePath,
  entries: z
    .array(
      object({
        relativePath: RelativePath,
        kind: z.enum(['file', 'directory']),
        sizeBytes: UInt.nullable()
      })
    )
    .max(100),
  nextCursor: Cursor.nullable()
})
export const SafePreviewResult = object({
  projectId: ID,
  relativePath: RelativePath,
  text: text(16384).refine((value) => bytes(value) <= 65536),
  truncated: z.boolean(),
  sourceRevisionLabel: text(128)
})
export const SafeDiagnosticPage = object({
  taskId: ID,
  text: text(16384).refine((value) => bytes(value) <= 16384),
  nextCursor: Cursor.nullable()
})
export const TaskEventPage = object({
  taskId: ID,
  events: z
    .array(WireMessage)
    .max(100)
    .refine((v) => v.every((e) => e.type === 'event')),
  nextSequence: UInt,
  completeThrough: UInt,
  hasGap: z.boolean(),
  stateIsCertain: z.boolean()
})
