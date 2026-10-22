import { z } from 'zod'
import { ID, Cursor, UInt, object, text, RelativePath, FilePath } from './common'
import * as dto from './ipc-dtos'

// Local transport budget, not a new frozen interface limit. A legal 100-message
// DB page plus 40 full-size C01 proposals can exceed P2's 1 MiB stub-era budget.
export const IPC_RESPONSE_BYTES = 16 * 1024 * 1024

const page = { cursor: Cursor.optional(), limit: dto.PageLimit.optional() }
const range = object({ startLine: UInt.min(1), endLine: UInt.min(1) }).refine(
  (v) => v.endLine >= v.startLine && v.endLine - v.startLine < 200
)
// Literal constants: UI data never constructs a method/channel name.
export const IPC = {
  'app.bootstrap': {
    channel: 'ncd:ipc:v1:app.bootstrap',
    input: z.null(),
    output: dto.BootstrapView
  },
  'projects.listRecent': {
    channel: 'ncd:ipc:v1:projects.listRecent',
    input: z.null(),
    output: z.array(dto.ProjectSummary).max(100)
  },
  'projects.choose': {
    channel: 'ncd:ipc:v1:projects.choose',
    input: z.null(),
    output: dto.ProjectSummary.nullable()
  },
  'projects.select': {
    channel: 'ncd:ipc:v1:projects.select',
    input: object({ projectId: ID }),
    output: dto.ProjectSummary
  },
  'projects.listFiles': {
    channel: 'ncd:ipc:v1:projects.listFiles',
    input: object({ projectId: ID, relativeDir: RelativePath, ...page }),
    output: dto.FileListingPage
  },
  'projects.previewFile': {
    channel: 'ncd:ipc:v1:projects.previewFile',
    input: object({ projectId: ID, relativePath: FilePath, range }),
    output: dto.SafePreviewResult
  },
  'conversations.list': {
    channel: 'ncd:ipc:v1:conversations.list',
    input: object({ projectId: ID.optional(), ...page }),
    output: dto.ConversationSummaryPage
  },
  'conversations.read': {
    channel: 'ncd:ipc:v1:conversations.read',
    input: object({ conversationId: ID, ...page }),
    output: dto.ConversationViewPage
  },
  'conversations.saveDockState': {
    channel: 'ncd:ipc:v1:conversations.saveDockState',
    input: object({ conversationId: ID, dockState: dto.ChatDockState, clientMutationId: ID }),
    output: dto.ChatDockStateView
  },
  'conversations.sendMessage': {
    channel: 'ncd:ipc:v1:conversations.sendMessage',
    input: object({
      conversationId: ID.optional(),
      draftId: ID.optional(),
      text: text(16384, 1),
      modelId: Cursor,
      clientMutationId: ID
    }),
    output: dto.MessageAcceptance
  },
  'models.list': {
    channel: 'ncd:ipc:v1:models.list',
    input: z.null(),
    output: z.array(dto.ModelChoice).max(100)
  },
  'models.setDiscussionPreference': {
    channel: 'ncd:ipc:v1:models.setDiscussionPreference',
    input: object({ modelId: Cursor }),
    output: dto.ModelSelectionView
  },
  'disclosures.list': {
    channel: 'ncd:ipc:v1:disclosures.list',
    input: object({ projectId: ID }),
    output: z.array(dto.DisclosureConsentSummary).max(100)
  },
  'disclosures.respond': {
    channel: 'ncd:ipc:v1:disclosures.respond',
    input: object({ challengeId: ID, decision: z.enum(['approve', 'deny']), clientMutationId: ID }),
    output: dto.DisclosureDecisionView
  },
  'disclosures.revoke': {
    channel: 'ncd:ipc:v1:disclosures.revoke',
    input: object({ consentId: ID, clientMutationId: ID }),
    output: dto.DisclosureDecisionView
  },
  'proposals.confirmRun': {
    channel: 'ncd:ipc:v1:proposals.confirmRun',
    input: object({ proposalId: ID, clientMutationId: ID }),
    output: dto.TaskAdmissionView
  },
  'tasks.read': {
    channel: 'ncd:ipc:v1:tasks.read',
    input: object({ taskId: ID }),
    output: dto.TaskView
  },
  'tasks.list': {
    channel: 'ncd:ipc:v1:tasks.list',
    input: object({ conversationId: ID.optional(), ...page }),
    output: dto.TaskSummaryPage
  },
  'tasks.cancel': {
    channel: 'ncd:ipc:v1:tasks.cancel',
    input: object({ taskId: ID }),
    output: dto.CancelRequestView
  },
  'tasks.readEvents': {
    channel: 'ncd:ipc:v1:tasks.readEvents',
    input: object({ taskId: ID, afterSequence: UInt, limit: dto.PageLimit }),
    output: dto.TaskEventPage
  },
  'tasks.readDiagnostics': {
    channel: 'ncd:ipc:v1:tasks.readDiagnostics',
    input: object({ taskId: ID, ...page }),
    output: dto.SafeDiagnosticPage
  },
  'preferences.get': {
    channel: 'ncd:ipc:v1:preferences.get',
    input: z.null(),
    output: dto.UiPreferences
  },
  'preferences.update': {
    channel: 'ncd:ipc:v1:preferences.update',
    input: dto.PreferencesDelta,
    output: dto.UiPreferences
  }
} as const
export type Method = keyof typeof IPC
export type Input<M extends Method> = z.infer<(typeof IPC)[M]['input']>
export type Output<M extends Method> = z.infer<(typeof IPC)[M]['output']>
type Result<M extends Method> = Promise<dto.IpcResult<Output<M>>>
export type Unsubscribe = () => void
export const PUSH = {
  task: {
    channel: 'ncd:ipc:v1:push.task',
    update: z.union([
      object({ type: z.literal('TaskStateChanged'), task: dto.TaskView }),
      object({ type: z.literal('TaskEventCommitted'), taskId: ID, sequence: UInt.min(1) })
    ])
  },
  conversation: {
    channel: 'ncd:ipc:v1:push.conversation',
    update: z.union([
      object({ type: z.literal('ConversationChanged'), conversationId: ID }),
      object({
        type: z.literal('ProjectInspectionProgressChanged'),
        conversationId: ID,
        inspectionStatus: dto.ProjectInspectionView
      }),
      object({
        type: z.literal('DisclosureConsentRequired'),
        conversationId: ID,
        challenge: dto.DisclosureChallengeView
      }),
      object({
        type: z.literal('DisclosureConsentChanged'),
        conversationId: ID,
        decision: dto.DisclosureDecisionView
      })
    ])
  },
  runtime: {
    channel: 'ncd:ipc:v1:push.runtime',
    update: z.union([
      object({ type: z.literal('RuntimeStatusChanged'), runtimeStatus: dto.RuntimeStatus }),
      object({ type: z.literal('ModelAvailabilityChanged'), model: dto.ModelChoice })
    ])
  }
} as const
export type PushKind = keyof typeof PUSH
export type Update<K extends PushKind> = z.infer<(typeof PUSH)[K]['update']>
export const SubscriptionControl = object({
  operation: z.enum(['subscribe', 'unsubscribe']),
  subscriptionId: ID,
  scopeId: ID.nullable()
})
export interface NextCode {
  app: { bootstrap(): Result<'app.bootstrap'> }
  projects: {
    listRecent(): Result<'projects.listRecent'>
    choose(): Result<'projects.choose'>
    select(projectId: string): Result<'projects.select'>
    listFiles(
      projectId: string,
      relativeDir: string,
      cursor?: string,
      limit?: number
    ): Result<'projects.listFiles'>
    previewFile(
      projectId: string,
      relativePath: string,
      range: { startLine: number; endLine: number }
    ): Result<'projects.previewFile'>
  }
  conversations: {
    list(projectId?: string, cursor?: string, limit?: number): Result<'conversations.list'>
    read(conversationId: string, cursor?: string, limit?: number): Result<'conversations.read'>
    saveDockState(
      input: Input<'conversations.saveDockState'>
    ): Result<'conversations.saveDockState'>
    sendMessage(input: Input<'conversations.sendMessage'>): Result<'conversations.sendMessage'>
    subscribeConversation(
      conversationId: string,
      callback: (update: Update<'conversation'>) => void
    ): Unsubscribe
  }
  models: {
    list(): Result<'models.list'>
    setDiscussionPreference(modelId: string): Result<'models.setDiscussionPreference'>
  }
  disclosures: {
    list(projectId: string): Result<'disclosures.list'>
    respond(input: Input<'disclosures.respond'>): Result<'disclosures.respond'>
    revoke(input: Input<'disclosures.revoke'>): Result<'disclosures.revoke'>
  }
  proposals: { confirmRun(input: Input<'proposals.confirmRun'>): Result<'proposals.confirmRun'> }
  tasks: {
    read(taskId: string): Result<'tasks.read'>
    list(conversationId?: string, cursor?: string, limit?: number): Result<'tasks.list'>
    cancel(taskId: string): Result<'tasks.cancel'>
    readEvents(input: Input<'tasks.readEvents'>): Result<'tasks.readEvents'>
    readDiagnostics(input: Input<'tasks.readDiagnostics'>): Result<'tasks.readDiagnostics'>
    subscribeTask(taskId: string, callback: (update: Update<'task'>) => void): Unsubscribe
  }
  preferences: {
    get(): Result<'preferences.get'>
    update(delta: Input<'preferences.update'>): Result<'preferences.update'>
  }
  runtime: { subscribeStatus(callback: (update: Update<'runtime'>) => void): Unsubscribe }
}
export function failure(code: dto.UiErrorCode): dto.IpcResult<never> {
  const messages: Partial<Record<dto.UiErrorCode, string>> = {
    BAD_INPUT: 'The request is invalid.',
    NOT_AUTHORIZED: 'The caller is not authorized.',
    RUNTIME_NOT_READY: 'This operation is not available yet.',
    RESOURCE_LIMIT: 'The request exceeds a resource limit.'
  }
  return {
    ok: false,
    error: {
      code,
      message: messages[code] ?? 'The operation could not be completed.',
      retryable: false
    }
  }
}
