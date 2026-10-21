import type { Method } from '../../contracts/ipc'
// Synthetic inputs only. IDs confer no authority and no test data is persisted.
export const ipcInputs: Record<Method, unknown> = {
  'app.bootstrap': null,
  'projects.listRecent': null,
  'projects.choose': null,
  'projects.select': { projectId: 'project_fixture' },
  'projects.listFiles': { projectId: 'project_fixture', relativeDir: '.', limit: 40 },
  'projects.previewFile': {
    projectId: 'project_fixture',
    relativePath: 'src/example.ts',
    range: { startLine: 1, endLine: 10 }
  },
  'conversations.list': {},
  'conversations.read': { conversationId: 'conversation_fixture' },
  'conversations.saveDockState': {
    conversationId: 'conversation_fixture',
    dockState: {
      visible: false,
      primaryTab: 'Files',
      terminalSubtab: 'Agent Logs',
      explicitlyHidden: true
    },
    clientMutationId: 'mutation_fixture'
  },
  'conversations.sendMessage': {
    draftId: 'draft_fixture',
    text: 'Synthetic unsent fixture',
    modelId: 'provider:model/v1',
    clientMutationId: 'mutation_fixture'
  },
  'models.list': null,
  'models.setDiscussionPreference': { modelId: 'provider:model/v1' },
  'disclosures.list': { projectId: 'project_fixture' },
  'disclosures.respond': {
    challengeId: 'challenge_fixture',
    decision: 'approve',
    clientMutationId: 'mutation_fixture'
  },
  'disclosures.revoke': { consentId: 'consent_fixture', clientMutationId: 'mutation_fixture' },
  'proposals.confirmRun': { proposalId: 'proposal_fixture', clientMutationId: 'mutation_fixture' },
  'tasks.read': { taskId: 'task_fixture' },
  'tasks.list': {},
  'tasks.cancel': { taskId: 'task_fixture' },
  'tasks.readEvents': { taskId: 'task_fixture', afterSequence: 0, limit: 40 },
  'tasks.readDiagnostics': { taskId: 'task_fixture' },
  'preferences.get': null,
  'preferences.update': { savedDockWidth: 360 }
}
export const conversationPage = {
  conversation: {
    conversationId: 'conversation_fixture',
    projectId: 'project_fixture',
    title: 'Fixture only',
    lastMessageAt: null,
    taskStatusSummary: null
  },
  messages: [
    {
      messageId: 'message_fixture',
      role: 'user',
      text: 'Fixture only',
      deliveryState: 'persisted',
      createdAt: '2026-10-21T10:00:00-04:00'
    }
  ],
  tasks: [],
  nextCursor: null,
  inspectionStatus: null,
  disclosureChallenges: [],
  availableProposals: [],
  availableProposalsTruncated: false,
  discussionTurns: [
    {
      userMessageId: 'message_fixture',
      modelId: 'model_fixture',
      status: 'pending',
      lastErrorCode: null,
      lastAttempt: null
    }
  ]
}
