import { createHash } from 'node:crypto'

// The only migration is the frozen IIS-04 v1 schema. Helpers receive constants
// below, never Renderer/model data; all runtime values use prepared statements.
const id = (name: string, nullable = false) =>
  `${name} TEXT ${nullable ? '' : 'NOT NULL'} CHECK(${nullable ? `${name} IS NULL OR ` : ''}(length(${name}) BETWEEN 1 AND 64 AND ${name} NOT GLOB '*[^A-Za-z0-9_-]*'))`
const str = (name: string, max: number, nullable = false) =>
  `${name} TEXT ${nullable ? '' : 'NOT NULL'} CHECK(${name} IS NULL OR length(${name})<=${max})`
const num = (name: string, nullable = false) =>
  `${name} INTEGER ${nullable ? '' : 'NOT NULL'} CHECK(${name} IS NULL OR ${name} BETWEEN 0 AND 9007199254740991)`
const flag = (name: string) => `${name} INTEGER NOT NULL CHECK(${name} IN (0,1))`
const choice = (name: string, values: string) =>
  `${name} TEXT NOT NULL CHECK(${name} IN (${values
    .split('|')
    .map((v) => `'${v}'`)
    .join(',')}))`
const json = (name: string, max: number, nullable = false) =>
  `${name} TEXT ${nullable ? '' : 'NOT NULL'} CHECK(${name} IS NULL OR (json_valid(${name}) AND length(CAST(${name} AS BLOB))<=${max} AND json_type(${name})='object'))`
const time = (name: string, nullable = false) => str(name, 32, nullable)
const table = (name: string, fields: string[]) => {
  const constraint = (field: string) => /^(PRIMARY KEY|UNIQUE|CHECK|FOREIGN KEY)/.test(field)
  return `CREATE TABLE ${name} (${[...fields.filter((f) => !constraint(f)), ...fields.filter(constraint)].join(',\n')}) STRICT;`
}
export const TABLES = {
  schema_migrations: ['version', 'checksum', 'applied_at'],
  projects: [
    'project_id',
    'canonical_workspace_key',
    'canonical_root',
    'display_name',
    'last_opened_at',
    'available'
  ],
  conversations: [
    'conversation_id',
    'project_id',
    'title',
    'created_at',
    'updated_at',
    'context_revision'
  ],
  messages: [
    'message_ordinal',
    'message_id',
    'conversation_id',
    'role',
    'content',
    'created_at',
    'delivery_state',
    'selected_model_id'
  ],
  discussion_turns: [
    'user_message_id',
    'conversation_id',
    'model_id',
    'status',
    'issued_at',
    'reply_message_id',
    'last_error_code'
  ],
  discussion_attempts: [
    'attempt_id',
    'user_message_id',
    'model_id',
    'effective_provider_key',
    'process_session_ref',
    'status',
    'issued_at',
    'finished_at',
    'retry_of_attempt_id'
  ],
  memory_summaries: ['summary_id', 'conversation_id', 'body', 'created_at', 'provenance_status'],
  summary_sources: ['summary_id', 'source_message_id'],
  approved_decisions: [
    'decision_id',
    'conversation_id',
    'decision_text',
    'approval_message_id',
    'confirmed_at'
  ],
  task_proposals: [
    'proposal_id',
    'conversation_id',
    'project_id',
    'canonical_workspace_key',
    'exact_goal',
    'issued_at',
    'expires_at',
    'state',
    'consumed_task_id'
  ],
  mutation_receipts: [
    'client_mutation_id',
    'operation',
    'scope_fingerprint',
    'canonical_input_hash',
    'result_type',
    'result_id',
    'result_snapshot_json',
    'created_at'
  ],
  tasks: [
    'admission_order',
    'task_id',
    'proposal_id',
    'conversation_id',
    'project_id',
    'workspace_key',
    'exact_goal',
    'state',
    'engine_outcome_json',
    'cleanup_state',
    'cancel_requested_at',
    'cancel_request_ref',
    'created_at',
    'updated_at'
  ],
  workspace_writer_leases: [
    'workspace_key',
    'task_id',
    'lease_state',
    'acquired_at',
    'last_reconciled_at'
  ],
  active_coding_slot: ['slot_id', 'task_id'],
  task_events: [
    'task_id',
    'sequence',
    'event_id',
    'process_session_ref',
    'name',
    'wire_payload_json',
    'payload_sha256',
    'committed_at'
  ],
  task_event_streams: [
    'task_id',
    'complete_through',
    'max_seen',
    'integrity_status',
    'last_incident_code',
    'last_incident_at'
  ],
  disclosure_challenges: [
    'challenge_id',
    'project_id',
    'workspace_key',
    'effective_provider_key',
    'disclosure_class',
    'scope_description',
    'state',
    'issued_at',
    'expires_at',
    'decided_at'
  ],
  disclosure_consents: [
    'consent_id',
    'challenge_id',
    'project_id',
    'workspace_key',
    'effective_provider_key',
    'disclosure_class',
    'status',
    'granted_at',
    'revoked_at'
  ],
  project_inspections: [
    'inspection_id',
    'conversation_id',
    'project_id',
    'state',
    'discovered_count',
    'actually_read_count',
    'excluded_count',
    'coverage_note',
    'evidence_revision',
    'updated_at'
  ],
  inspection_observations: [
    'inspection_id',
    'observation_key',
    'observation_kind',
    'subject_key',
    'evidence_digest',
    'count_delta',
    'committed_at'
  ],
  conversation_dock_state: [
    'conversation_id',
    'visible',
    'primary_tab',
    'terminal_subtab',
    'explicitly_hidden',
    'updated_at'
  ],
  ui_preferences: ['preference_scope', 'version', 'safe_json', 'updated_at']
} as const
export const DDL = [
  table('schema_migrations', [
    'version INTEGER PRIMARY KEY CHECK(version>=1)',
    str('checksum', 64),
    time('applied_at')
  ]),
  table('projects', [
    id('project_id'),
    'PRIMARY KEY(project_id)',
    str('canonical_workspace_key', 128),
    'UNIQUE(canonical_workspace_key)',
    str('canonical_root', 1024),
    str('display_name', 256),
    time('last_opened_at'),
    flag('available'),
    'UNIQUE(project_id,canonical_workspace_key)'
  ]),
  table('conversations', [
    id('conversation_id'),
    'PRIMARY KEY(conversation_id)',
    id('project_id'),
    str('title', 256),
    time('created_at'),
    time('updated_at'),
    num('context_revision'),
    'FOREIGN KEY(project_id) REFERENCES projects(project_id)',
    'UNIQUE(conversation_id,project_id)'
  ]),
  table('messages', [
    'message_ordinal INTEGER PRIMARY KEY AUTOINCREMENT',
    id('message_id'),
    'UNIQUE(message_id)',
    id('conversation_id'),
    choice('role', 'user|assistant'),
    str('content', 32768),
    time('created_at'),
    choice('delivery_state', 'persisted'),
    str('selected_model_id', 128, true),
    "CHECK(role<>'user' OR (selected_model_id IS NOT NULL AND length(content)<=16384))",
    'FOREIGN KEY(conversation_id) REFERENCES conversations(conversation_id)',
    'UNIQUE(message_id,conversation_id)'
  ]),
  table('discussion_turns', [
    id('user_message_id'),
    'PRIMARY KEY(user_message_id)',
    id('conversation_id'),
    str('model_id', 128),
    choice('status', 'pending|issued|answered|failed|unknown'),
    time('issued_at', true),
    id('reply_message_id', true),
    str('last_error_code', 32, true),
    'FOREIGN KEY(user_message_id,conversation_id) REFERENCES messages(message_id,conversation_id)',
    'FOREIGN KEY(reply_message_id,conversation_id) REFERENCES messages(message_id,conversation_id)'
  ]),
  table('discussion_attempts', [
    id('attempt_id'),
    'PRIMARY KEY(attempt_id)',
    id('user_message_id'),
    str('model_id', 128),
    str('effective_provider_key', 128),
    id('process_session_ref', true),
    choice('status', 'issued|completed|failed|unknown'),
    time('issued_at'),
    time('finished_at', true),
    id('retry_of_attempt_id', true),
    'FOREIGN KEY(user_message_id) REFERENCES discussion_turns(user_message_id)',
    'FOREIGN KEY(retry_of_attempt_id) REFERENCES discussion_attempts(attempt_id)',
    'CHECK(attempt_id IS NOT retry_of_attempt_id)'
  ]),
  table('memory_summaries', [
    id('summary_id'),
    'PRIMARY KEY(summary_id)',
    id('conversation_id'),
    str('body', 2048),
    time('created_at'),
    choice('provenance_status', 'derived'),
    'FOREIGN KEY(conversation_id) REFERENCES conversations(conversation_id)'
  ]),
  table('summary_sources', [
    id('summary_id'),
    id('source_message_id'),
    'PRIMARY KEY(summary_id,source_message_id)',
    'FOREIGN KEY(summary_id) REFERENCES memory_summaries(summary_id)',
    'FOREIGN KEY(source_message_id) REFERENCES messages(message_id)'
  ]),
  table('approved_decisions', [
    id('decision_id'),
    'PRIMARY KEY(decision_id)',
    id('conversation_id'),
    str('decision_text', 2048),
    id('approval_message_id'),
    time('confirmed_at'),
    'FOREIGN KEY(conversation_id) REFERENCES conversations(conversation_id)',
    'FOREIGN KEY(approval_message_id,conversation_id) REFERENCES messages(message_id,conversation_id)'
  ]),
  table('task_proposals', [
    id('proposal_id'),
    'PRIMARY KEY(proposal_id)',
    id('conversation_id'),
    id('project_id'),
    str('canonical_workspace_key', 128),
    str('exact_goal', 16384),
    time('issued_at'),
    time('expires_at'),
    choice('state', 'available|consumed|expired'),
    id('consumed_task_id', true),
    'UNIQUE(consumed_task_id)',
    "CHECK((state='consumed')=(consumed_task_id IS NOT NULL))",
    'CHECK(expires_at>issued_at)',
    'FOREIGN KEY(conversation_id,project_id) REFERENCES conversations(conversation_id,project_id)',
    'FOREIGN KEY(project_id,canonical_workspace_key) REFERENCES projects(project_id,canonical_workspace_key)',
    'FOREIGN KEY(consumed_task_id) REFERENCES tasks(task_id) DEFERRABLE INITIALLY DEFERRED'
  ]),
  table('mutation_receipts', [
    id('client_mutation_id'),
    'PRIMARY KEY(client_mutation_id)',
    choice(
      'operation',
      'conversations.sendMessage|proposals.confirmRun|conversations.saveDockState|disclosures.respond|disclosures.revoke'
    ),
    str('scope_fingerprint', 64),
    str('canonical_input_hash', 64),
    choice(
      'result_type',
      'MessageAcceptance|TaskAdmissionView|ChatDockStateView|DisclosureDecisionView'
    ),
    id('result_id'),
    json('result_snapshot_json', 262144),
    time('created_at')
  ]),
  table('tasks', [
    'admission_order INTEGER PRIMARY KEY AUTOINCREMENT',
    id('task_id'),
    'UNIQUE(task_id)',
    id('proposal_id'),
    'UNIQUE(proposal_id)',
    id('conversation_id'),
    id('project_id'),
    str('workspace_key', 128),
    str('exact_goal', 16384),
    choice(
      'state',
      'queued|starting|running|cancel_requested|completed|failed|cancelled|unknown|needs_reconciliation'
    ),
    json('engine_outcome_json', 262144, true),
    choice(
      'cleanup_state',
      'not_started|unverified|blocked|verified_completed|verified_failed|verified_cancelled|verified_interrupted|verified_never_started'
    ),
    time('cancel_requested_at', true),
    id('cancel_request_ref', true),
    time('created_at'),
    time('updated_at'),
    'FOREIGN KEY(proposal_id) REFERENCES task_proposals(proposal_id)',
    'FOREIGN KEY(conversation_id,project_id) REFERENCES conversations(conversation_id,project_id)',
    'FOREIGN KEY(project_id,workspace_key) REFERENCES projects(project_id,canonical_workspace_key)',
    'UNIQUE(task_id,workspace_key)'
  ]),
  table('workspace_writer_leases', [
    str('workspace_key', 128),
    'PRIMARY KEY(workspace_key)',
    id('task_id'),
    'UNIQUE(task_id)',
    choice('lease_state', 'active|blocked'),
    time('acquired_at'),
    time('last_reconciled_at', true),
    'FOREIGN KEY(task_id,workspace_key) REFERENCES tasks(task_id,workspace_key)'
  ]),
  table('active_coding_slot', [
    'slot_id INTEGER PRIMARY KEY CHECK(slot_id=1)',
    id('task_id', true),
    'UNIQUE(task_id)',
    'FOREIGN KEY(task_id) REFERENCES tasks(task_id)'
  ]),
  table('task_events', [
    id('task_id'),
    num('sequence'),
    'CHECK(sequence>=1)',
    id('event_id'),
    id('process_session_ref'),
    choice(
      'name',
      'task.started|task.progress|worker.started|worker.completed|file.changed|test.result|task.completed|task.failed|task.cancelled'
    ),
    json('wire_payload_json', 262144),
    str('payload_sha256', 64),
    time('committed_at'),
    'PRIMARY KEY(task_id,sequence)',
    'UNIQUE(task_id,event_id)',
    'FOREIGN KEY(task_id) REFERENCES tasks(task_id)'
  ]),
  table('task_event_streams', [
    id('task_id'),
    'PRIMARY KEY(task_id)',
    num('complete_through'),
    num('max_seen'),
    choice('integrity_status', 'complete|gap|conflict'),
    str('last_incident_code', 64, true),
    time('last_incident_at', true),
    'CHECK(complete_through<=max_seen)',
    'FOREIGN KEY(task_id) REFERENCES tasks(task_id)'
  ]),
  table('disclosure_challenges', [
    id('challenge_id'),
    'PRIMARY KEY(challenge_id)',
    id('project_id'),
    str('workspace_key', 128),
    str('effective_provider_key', 128),
    str('disclosure_class', 128),
    str('scope_description', 2048),
    choice('state', 'pending|approved|denied|expired'),
    time('issued_at'),
    time('expires_at'),
    time('decided_at', true),
    'CHECK(expires_at>issued_at)',
    'FOREIGN KEY(project_id,workspace_key) REFERENCES projects(project_id,canonical_workspace_key)'
  ]),
  table('disclosure_consents', [
    id('consent_id'),
    'PRIMARY KEY(consent_id)',
    id('challenge_id'),
    'UNIQUE(challenge_id)',
    id('project_id'),
    str('workspace_key', 128),
    str('effective_provider_key', 128),
    str('disclosure_class', 128),
    choice('status', 'granted|revoked'),
    time('granted_at'),
    time('revoked_at', true),
    "CHECK((status='revoked')=(revoked_at IS NOT NULL))",
    'FOREIGN KEY(challenge_id) REFERENCES disclosure_challenges(challenge_id)',
    'FOREIGN KEY(project_id,workspace_key) REFERENCES projects(project_id,canonical_workspace_key)'
  ]),
  table('project_inspections', [
    id('inspection_id'),
    'PRIMARY KEY(inspection_id)',
    id('conversation_id'),
    id('project_id'),
    choice('state', 'not_started|discovering|reading|analyzing|completed|partial|failed'),
    num('discovered_count', true),
    num('actually_read_count'),
    num('excluded_count'),
    str('coverage_note', 2048),
    num('evidence_revision'),
    time('updated_at'),
    'FOREIGN KEY(conversation_id,project_id) REFERENCES conversations(conversation_id,project_id)'
  ]),
  table('inspection_observations', [
    id('inspection_id'),
    str('observation_key', 64),
    choice('observation_kind', 'discovered_file|read_file|excluded_page'),
    str('subject_key', 64, true),
    str('evidence_digest', 64),
    num('count_delta'),
    time('committed_at'),
    'PRIMARY KEY(inspection_id,observation_key)',
    "CHECK((observation_kind='excluded_page' AND subject_key IS NULL) OR (observation_kind<>'excluded_page' AND subject_key IS NOT NULL AND count_delta=1))",
    'FOREIGN KEY(inspection_id) REFERENCES project_inspections(inspection_id)'
  ]),
  table('conversation_dock_state', [
    id('conversation_id'),
    'PRIMARY KEY(conversation_id)',
    flag('visible'),
    choice('primary_tab', 'Terminal|Files'),
    choice('terminal_subtab', 'Agent Logs|Interactive Shell'),
    flag('explicitly_hidden'),
    time('updated_at'),
    'FOREIGN KEY(conversation_id) REFERENCES conversations(conversation_id)'
  ]),
  table('ui_preferences', [
    choice('preference_scope', 'display|discussion_model'),
    'PRIMARY KEY(preference_scope)',
    'version INTEGER NOT NULL CHECK(version=1)',
    json('safe_json', 4096),
    time('updated_at')
  ]),
  'CREATE UNIQUE INDEX observation_subject ON inspection_observations(inspection_id,observation_kind,subject_key) WHERE subject_key IS NOT NULL;',
  "CREATE UNIQUE INDEX one_issued_attempt ON discussion_attempts(user_message_id) WHERE status='issued';",
  'CREATE UNIQUE INDEX retry_successor ON discussion_attempts(retry_of_attempt_id) WHERE retry_of_attempt_id IS NOT NULL;',
  'CREATE INDEX messages_page ON messages(conversation_id,message_ordinal);',
  'CREATE INDEX task_queue ON tasks(state,admission_order);',
  'CREATE INDEX proposals_read ON task_proposals(conversation_id,state,issued_at DESC,proposal_id DESC);',
  ...[
    'messages',
    'mutation_receipts',
    'task_events',
    'schema_migrations',
    'approved_decisions',
    'summary_sources'
  ].map(
    (name) =>
      `CREATE TRIGGER immutable_${name} BEFORE UPDATE ON ${name} BEGIN SELECT RAISE(ABORT,'immutable record'); END;`
  ),
  "CREATE TRIGGER immutable_project_identity BEFORE UPDATE OF project_id,canonical_workspace_key,canonical_root ON projects BEGIN SELECT RAISE(ABORT,'immutable identity'); END;",
  "CREATE TRIGGER immutable_proposal_identity BEFORE UPDATE OF proposal_id,conversation_id,project_id,canonical_workspace_key,exact_goal,issued_at,expires_at ON task_proposals BEGIN SELECT RAISE(ABORT,'immutable proposal'); END;",
  "CREATE TRIGGER proposal_single_use BEFORE UPDATE ON task_proposals WHEN (OLD.state='consumed' AND (NEW.state<>OLD.state OR NEW.consumed_task_id IS NOT OLD.consumed_task_id)) OR (OLD.state='expired' AND NEW.state<>'expired') BEGIN SELECT RAISE(ABORT,'proposal already final'); END;",
  "CREATE TRIGGER proposal_consumed_binding BEFORE UPDATE ON task_proposals WHEN NEW.state='consumed' AND NOT EXISTS(SELECT 1 FROM tasks WHERE task_id=NEW.consumed_task_id AND proposal_id=NEW.proposal_id AND conversation_id=NEW.conversation_id AND project_id=NEW.project_id AND workspace_key=NEW.canonical_workspace_key AND exact_goal=NEW.exact_goal) BEGIN SELECT RAISE(ABORT,'invalid consumed task'); END;",
  "CREATE TRIGGER immutable_task_identity BEFORE UPDATE OF task_id,admission_order,proposal_id,conversation_id,project_id,workspace_key,exact_goal ON tasks BEGIN SELECT RAISE(ABORT,'immutable task'); END;",
  "CREATE TRIGGER immutable_attempt_identity BEFORE UPDATE OF attempt_id,user_message_id,model_id,effective_provider_key,process_session_ref,issued_at,retry_of_attempt_id ON discussion_attempts BEGIN SELECT RAISE(ABORT,'immutable attempt'); END;",
  "CREATE TRIGGER attempt_final BEFORE UPDATE ON discussion_attempts WHEN OLD.status<>'issued' AND (NEW.status<>OLD.status OR NEW.finished_at IS NOT OLD.finished_at) BEGIN SELECT RAISE(ABORT,'attempt already final'); END;",
  "CREATE TRIGGER immutable_turn_identity BEFORE UPDATE OF user_message_id,conversation_id,model_id ON discussion_turns BEGIN SELECT RAISE(ABORT,'immutable turn identity'); END;",
  "CREATE TRIGGER immutable_challenge_scope BEFORE UPDATE OF challenge_id,project_id,workspace_key,effective_provider_key,disclosure_class,scope_description,issued_at,expires_at ON disclosure_challenges BEGIN SELECT RAISE(ABORT,'immutable disclosure scope'); END;",
  "CREATE TRIGGER immutable_consent_scope BEFORE UPDATE OF consent_id,challenge_id,project_id,workspace_key,effective_provider_key,disclosure_class,granted_at ON disclosure_consents BEGIN SELECT RAISE(ABORT,'immutable consent scope'); END;",
  "CREATE TRIGGER consent_revocation_final BEFORE UPDATE ON disclosure_consents WHEN OLD.status='revoked' AND (NEW.status<>'revoked' OR NEW.revoked_at IS NOT OLD.revoked_at) BEGIN SELECT RAISE(ABORT,'revocation is final'); END;",
  "CREATE TRIGGER turn_user BEFORE INSERT ON discussion_turns WHEN NOT EXISTS(SELECT 1 FROM messages WHERE message_id=NEW.user_message_id AND role='user' AND conversation_id=NEW.conversation_id AND selected_model_id=NEW.model_id) BEGIN SELECT RAISE(ABORT,'invalid turn'); END;",
  "CREATE TRIGGER turn_reply BEFORE UPDATE ON discussion_turns WHEN NEW.reply_message_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM messages WHERE message_id=NEW.reply_message_id AND role='assistant' AND conversation_id=NEW.conversation_id) BEGIN SELECT RAISE(ABORT,'invalid reply'); END;",
  "CREATE TRIGGER attempt_lineage BEFORE INSERT ON discussion_attempts WHEN NOT EXISTS(SELECT 1 FROM discussion_turns WHERE user_message_id=NEW.user_message_id AND model_id=NEW.model_id) OR (NEW.retry_of_attempt_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM discussion_attempts WHERE attempt_id=NEW.retry_of_attempt_id AND user_message_id=NEW.user_message_id AND model_id=NEW.model_id AND status IN ('failed','unknown'))) BEGIN SELECT RAISE(ABORT,'invalid attempt lineage'); END;",
  "CREATE TRIGGER summary_scope BEFORE INSERT ON summary_sources WHEN NOT EXISTS(SELECT 1 FROM memory_summaries s JOIN messages m ON m.conversation_id=s.conversation_id WHERE s.summary_id=NEW.summary_id AND m.message_id=NEW.source_message_id) BEGIN SELECT RAISE(ABORT,'foreign summary source'); END;",
  "CREATE TRIGGER decision_role BEFORE INSERT ON approved_decisions WHEN NOT EXISTS(SELECT 1 FROM messages WHERE message_id=NEW.approval_message_id AND conversation_id=NEW.conversation_id AND role='user') BEGIN SELECT RAISE(ABORT,'invalid approval'); END;",
  "CREATE TRIGGER task_scope BEFORE INSERT ON tasks WHEN NOT EXISTS(SELECT 1 FROM task_proposals WHERE proposal_id=NEW.proposal_id AND conversation_id=NEW.conversation_id AND project_id=NEW.project_id AND canonical_workspace_key=NEW.workspace_key AND exact_goal=NEW.exact_goal) BEGIN SELECT RAISE(ABORT,'foreign proposal'); END;",
  "CREATE TRIGGER consent_scope BEFORE INSERT ON disclosure_consents WHEN NOT EXISTS(SELECT 1 FROM disclosure_challenges WHERE challenge_id=NEW.challenge_id AND project_id=NEW.project_id AND workspace_key=NEW.workspace_key AND effective_provider_key=NEW.effective_provider_key AND disclosure_class=NEW.disclosure_class AND state='approved') BEGIN SELECT RAISE(ABORT,'foreign consent'); END;"
].join('\n')
export const MIGRATION = Object.freeze({
  version: 1,
  checksum: createHash('sha256').update(DDL, 'utf8').digest('hex')
})
