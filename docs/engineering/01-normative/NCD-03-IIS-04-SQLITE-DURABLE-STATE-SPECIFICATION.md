# NEXT CODE DESKTOP — NCD-03 / IIS-04
## SQLite & Durable State — Database Schema, Atomic Admission, Memory Provenance and Crash Recovery

**Status:** **FROZEN v1.0 — DESIGN SPECIFICATION (DOCUMENTARY FREEZE)**  
**Date:** 2026-10-20  
**Authority:** Frozen NCD-00/01/02, NCD-03/C-01, C-02, C-03, IIS-01 v1.0, IIS-02 v1.0 and IIS-03 v1.0.  
**Implementation authorization:** **NONE**. This is an implementation-interface design paper, not an instruction to change code, create database files in the repository, run tests, or commit.  
**Independence:** Tool- and coding-agent-neutral. Product/internal component names are retained only where they name actual Next Code architecture.  
**Decision handling:** Prior frozen rules remain mandatory. FFR-01 findings FFR04-01–FFR04-05 and all IIS-04 Draft v0.2 specification decisions were **owner-approved for FROZEN v1.0 on 2026-10-20**. Sections retaining historical proposal/review labels describe pre-freeze provenance, not pending approvals. This freeze authorizes documentation only; no implementation is authorized.  
**Document scope:** One local SQLite database **owned exclusively by Electron Main**. Python owns its own `AgentOS` engine/checkpoint state, and does not open this database.

---

## 1. Objectives and non-goals

IIS-04 defines the persistent source of truth for desktop conversations, consent, approved decisions, task proposals, task admissions, mutually exclusive workspace writers, events and recovery hints. It turns the architecture frozen in C-02/C-03 and the typed interfaces in IIS-01/02/03 into a concrete persistence contract.

**Guarantees sought:**

1. An accepted user message survives renderer reload and, after a successful SQLite commit, restart.
2. A repeated client mutation with the same identity and **identical canonical request** returns the same recorded result; altered input or scope is rejected.
3. **Run Task** requires an explicit, fresh, exact-goal proposal and is **consumed once, atomically with durable admission**. A DB error must not consume an approval or start Python.
4. No two coding writers may operate on the same canonical workspace simultaneously, even through aliases or after uncertain crashes. The frozen **one-active-coding-task globally / 20 queued** v1 supervisor limits also apply.
5. Mission Control replays **only committed events**; missing events and unknown process state are visible, never fabricated.
6. A model-generated summary or proposed decision cannot acquire the authority of a user-approved decision.
7. Consent to disclose project excerpts is project + **effective provider/destination** + disclosure-class scoped, revocable for future sends, and distinct from project-file read permission.
8. Local-first storage and ordinary app browsing remain available even if Python/LLM services are offline, as far as database health permits.

**Explicit non-goals:** new Python wire actions, extra Renderer IPC methods, agent checkpoint migration into SQLite, generic workflow engines, vector databases in v1, SQL access from Renderer/Python, direct provider secrets in chat DB, full Windows sandboxing, a universal LLM egress gateway (C-02 FFR-R01 deferred), guaranteed crash-proof provider billing or guaranteed reconstruction of untransmitted Python events.

## 2. Trust, owners, and storage boundary

```text
React Renderer ── IIS-02 typed Preload ──▶ Electron Main
                                      ├─ transaction coordinator / policy
                                      ├─ SQLite (authoritative Desktop state)
                                      ├─ process supervisor (IIS-03)
                                      └─ bounded broker / model registry
                                            │
                       IIS-01 private JSONL │
                                            ▼
                                   Python Discussion / Coding
                                   (NO Desktop SQLite access)
```

- Main is the **only application database writer and authoritative reader**. Serial execution may be implemented with a dedicated DB worker owned by Main; this does not transfer trust/authorization to Renderer or Python.
- Files on disk are not automatically safe to disclose. Main validates `projectId`/canonical workspace and consent before passing any authorized source excerpt across trust boundaries (IIS-06/07).
- Source text used for model prompts is an ephemeral, bounded projection selected from these records; it is **not** authority to create new decisions or tasks.
- Local SQLite is **not** a credential vault. Provider API keys belong to the separately selected OS/app secure credential mechanism (IIS-06); do not store them in chat/event columns.
- A recorded process ID is **never** permission to kill a process or evidence that a child has stopped. The supervisor owns live Windows handles and verifies process-tree cleanup.

## 3. Proposed database configuration, lifetime and migration policy

**Frozen v1 storage design:** a single application-owned database in Electron's dedicated per-user app-data location, separated from project checkout folders and Python `.agent_os` state. Use SQLite with `PRAGMA foreign_keys=ON` **on every connection**, WAL journal mode, and an explicitly documented `synchronous` policy which does **not** disable durability for critical commits (v1: `FULL`). A bounded `busy_timeout` of **5,000 ms** is a proposed default, not a guarantee that a busy DB will succeed. All commands are parameterized/prepared; no model- or Renderer-supplied SQL.

**One accountable write coordinator:** serialize state-changing transactions through Main's database service. `BEGIN IMMEDIATE` (or equivalently proven serialized write transaction) is required for admission, consent mutation, event insertion, UI mutation deduplication and queue/lease operations. Do not hold SQLite transactions open while awaiting a network LLM, spawning Python, waiting for OS teardown, or performing slow file reads.

**Versioning and migrations:** `schema_migrations(version PRIMARY KEY, checksum, applied_at)` records forward-only deterministic migrations. On boot, verify SQLite integrity/schema version and run checked migrations **before** enabling writes and task admission. Make a safe SQLite-consistent backup using the SQLite backup API (or proven equivalent) before potentially destructive migrations; never back up only the `.db` file while WAL frames may be outstanding. If a migration fails or the database is from a newer unsupported schema, refuse writes and coding admission with `DATABASE_UNAVAILABLE`; do not silently recreate/reset the DB or delete user history. Offline read-only recovery may be offered only when compatible and verified.

**Timestamp rules:** UTC ISO-8601 offset-bearing TEXT at UI contract boundaries; internal DB timestamps use a single documented canonical representation. Neither OS wall time nor timestamps alone are used for operation ordering. Persist monotonic admission order and event sequence separately. Windows `mtime_ns` crosses JSON boundaries as an exact decimal string per IIS-01; never store/export it as an imprecise JS number.

**Durability caveat:** successful SQLite `COMMIT` establishes SQLite's configured durability guarantee, not a guarantee against total disk failure, storage-device dishonesty, or file corruption. Crash/restart recovery remains mandatory.

## 4. Frozen normalized v1 table inventory

**Table names and field sets below constitute the frozen v1 logical schema.** Surrogate IDs are Main-issued opaque bounded ASCII strings unless otherwise noted. Text and JSON fields are validated before INSERT and checked again on output; arbitrary JSON blobs are not an escape from a closed public IPC/wire schema. All project/conversation/task foreign keys are enforced. All important data changes use transactions.

| Table | Required columns (core) | Key / essential invariant |
|---|---|---|
| `schema_migrations` | `version INTEGER`, `checksum TEXT`, `applied_at TEXT` | `version` PK; immutable successful migrations |
| `projects` | `project_id TEXT`, `canonical_workspace_key TEXT`, `canonical_root TEXT`, `display_name TEXT`, `last_opened_at TEXT`, `available INTEGER` | PK `project_id`; unique canonical identity; UI path label not authority |
| `conversations` | `conversation_id TEXT`, `project_id TEXT`, `title TEXT`, `created_at TEXT`, `updated_at TEXT`, `context_revision INTEGER` | PK; FK project; `context_revision>=0`, changes atomically with memory edits |
| `messages` | `message_ordinal INTEGER`, `message_id TEXT`, `conversation_id TEXT`, `role TEXT`, `content TEXT`, `created_at TEXT`, `delivery_state TEXT`, `selected_model_id TEXT NULL` | Physical SQLite `message_ordinal INTEGER PRIMARY KEY AUTOINCREMENT`; `message_id` UNIQUE NOT NULL external identifier; role `user|assistant`; FK conversation; immutable original user content |
| `discussion_turns` | `user_message_id TEXT`, `conversation_id TEXT`, `model_id TEXT`, `status TEXT`, `issued_at TEXT NULL`, `reply_message_id TEXT NULL`, `last_error_code TEXT NULL` | PK/FK user message; one logical discussion turn per accepted user message; `status=pending|issued|answered|failed|unknown` |
| `discussion_attempts` | `attempt_id TEXT`, `user_message_id TEXT`, `model_id TEXT`, `effective_provider_key TEXT`, `process_session_ref TEXT NULL`, `status TEXT`, `issued_at TEXT`, `finished_at TEXT NULL`, `retry_of_attempt_id TEXT NULL` | PK attempt; FK turn; attempts immutable and traceable; each user-triggered retry is new attempt under the **same** original turn; no silent retry or model switch |
| `memory_summaries` | `summary_id TEXT`, `conversation_id TEXT`, `body TEXT`, `created_at TEXT`, `provenance_status TEXT` | PK; FK conversation; derived/proposed memory, **never** approval |
| `summary_sources` | `summary_id TEXT`, `source_message_id TEXT` | Composite PK and FKs; sources must belong to the summary's conversation |
| `approved_decisions` | `decision_id TEXT`, `conversation_id TEXT`, `decision_text TEXT`, `approval_message_id TEXT`, `confirmed_at TEXT` | PK; FK user-role approval message **in same conversation**, explicit verified provenance |
| `task_proposals` | `proposal_id TEXT`, `conversation_id TEXT`, `project_id TEXT`, `canonical_workspace_key TEXT`, `exact_goal TEXT`, `issued_at TEXT`, `expires_at TEXT`, `state TEXT`, `consumed_task_id TEXT NULL` | PK; state `available|consumed|expired`; immutable scope/goal; consumption linked to **at most one** task |
| `mutation_receipts` | `client_mutation_id TEXT`, `operation TEXT`, `scope_fingerprint TEXT`, `canonical_input_hash TEXT`, `result_type TEXT`, `result_id TEXT`, `result_snapshot_json TEXT`, `created_at TEXT` | PK client mutation ID; immutable, validated **original return DTO snapshot** required; identical replay returns original admitted/persisted result even if live task state later changes; changed input rejected |
| `tasks` | `admission_order INTEGER`, `task_id TEXT`, `proposal_id TEXT`, `conversation_id TEXT`, `project_id TEXT`, `workspace_key TEXT`, `exact_goal TEXT`, `state TEXT`, `engine_outcome_json TEXT NULL`, `cleanup_state TEXT`, `cancel_requested_at TEXT NULL`, `cancel_request_ref TEXT NULL`, `created_at TEXT`, `updated_at TEXT` | Physical SQLite `admission_order INTEGER PRIMARY KEY AUTOINCREMENT`; `task_id` UNIQUE NOT NULL external ID; proposal UNIQUE; durable queue order; cancel evidence from verified UI action, separate from OS cleanup |
| `workspace_writer_leases` | `workspace_key TEXT`, `task_id TEXT`, `lease_state TEXT`, `acquired_at TEXT`, `last_reconciled_at TEXT NULL` | PK workspace key, unique task; only current writer/blocked unsafe lease; **not** a queued waiting claim |
| `active_coding_slot` | `slot_id INTEGER=1`, `task_id TEXT NULL` | Singleton global active slot — first release: at most **one active coding task globally**; FK task or NULL |
| `task_events` | `task_id TEXT`, `sequence INTEGER`, `event_id TEXT`, `process_session_ref TEXT`, `name TEXT`, `wire_payload_json TEXT`, `payload_sha256 TEXT`, `committed_at TEXT` | PK `(task_id,sequence)`; UNIQUE `(task_id,event_id)`; `sequence>=1`; session ref is Main-verified observed process binding, not model-provided evidence; exact immutable payload |
| `task_event_streams` | `task_id TEXT`, `complete_through INTEGER`, `max_seen INTEGER`, `integrity_status TEXT`, `last_incident_code TEXT NULL`, `last_incident_at TEXT NULL` | PK/FK task; highest **contiguous committed** sequence distinct from max seen; durable bounded incident code for conflicting duplicate/gap (never overwrites evidence) |
| `disclosure_challenges` | `challenge_id TEXT`, `project_id TEXT`, `workspace_key TEXT`, `effective_provider_key TEXT`, `disclosure_class TEXT`, `scope_description TEXT`, `state TEXT`, `issued_at TEXT`, `expires_at TEXT`, `decided_at TEXT NULL` | PK; trusted actual provider identity, no content; pending challenge is not consent |
| `disclosure_consents` | `consent_id TEXT`, `challenge_id TEXT`, `project_id TEXT`, `workspace_key TEXT`, `effective_provider_key TEXT`, `disclosure_class TEXT`, `status TEXT`, `granted_at TEXT`, `revoked_at TEXT NULL` | PK; unique challenge; `granted|revoked`; separate row for changed provider/class |
| `project_inspections` | `inspection_id TEXT`, `conversation_id TEXT`, `project_id TEXT`, `state TEXT`, `discovered_count INTEGER NULL`, `actually_read_count INTEGER`, `excluded_count INTEGER`, `coverage_note TEXT`, `evidence_revision INTEGER`, `updated_at TEXT` | PK; cached counts only from **committed deduplicated observations**; incomplete scans never assert global coverage |
| `inspection_observations` | `inspection_id TEXT`, `observation_key TEXT`, `observation_kind TEXT`, `subject_key TEXT NULL`, `evidence_digest TEXT`, `count_delta INTEGER`, `committed_at TEXT` | Composite PK `(inspection_id,observation_key)`; additionally UNIQUE `(inspection_id,observation_kind,subject_key)` **where subject_key IS NOT NULL** for distinct file discovery/read counts; the observation kind is closed (`discovered_file|read_file|excluded_page`); repeated verified page/file is a no-op, conflicting digest fails; no protected raw source or sensitive path names |
| `conversation_dock_state` | `conversation_id TEXT`, `visible INTEGER`, `primary_tab TEXT`, `terminal_subtab TEXT`, `explicitly_hidden INTEGER`, `updated_at TEXT` | PK/FK; closed presentation-only enums; no executable authority |
| `ui_preferences` | `preference_scope TEXT`, `version INTEGER`, `safe_json TEXT`, `updated_at TEXT` | PK; closed UI fields only, including global dock width and selected discussion preference; no secrets |

**SQLite ordinal identity rule (FFR-01 correction):** `message_ordinal` and `admission_order` are the physical `INTEGER PRIMARY KEY AUTOINCREMENT` for their respective tables; `message_id` and `task_id` remain immutable `UNIQUE NOT NULL` Main-issued *public identifiers*, eligible for FK targets and UI references. This preserves strict monotonic ordering across deleted maximum rows and restart; it does not grant authority through knowing an ID. **Total frozen v1 table inventory: 22 tables** (original 20 plus `discussion_attempts` and `inspection_observations`). Main must use **parameterized exact queries and cross-table project matching**; foreign keys alone do not prove two valid FKs belong to the same project.

**Closed typed state fields:** check constraints or equivalent strict validators are mandatory for roles/statuses. Do not store a `provenance_status='approved'` in `memory_summaries`; user-approved decisions exist **only** in `approved_decisions`. Free-form model text in proposed `task_proposals` cannot itself authorize execution.

**JSON column policy:** `engine_outcome_json` is a schema-validated actual `TaskOutcomeV1` (IIS-01), not a guessed outcome; `wire_payload_json` must match the exact frozen IIS-01 event schema and be byte-bound; `ui_preferences.safe_json` contains a closed display-settings record. SQLite JSON columns do **not** permit unvalidated arbitrary models, SQL, paths or raw secrets. `mutation_receipts.result_snapshot_json` is the validated, bounded **original response snapshot**, never a fresh projection of an evolving task or consent; it contains only safe public DTO fields. `discussion_attempts` records actual provider-attempt identity and parent retry linkage without storing provider credentials.

## 5. Exact relationship and authorization invariants

1. **Project ownership:** `conversations.project_id → projects`; `messages.conversation_id → conversations`; task/proposal/project combinations must agree on the **same canonical workspace identity** at transaction time. Main revalidates registered path/alias identity against current filesystem before executable work; DB identity alone does not prove a present path is safe.
2. **Decision evidence:** `approved_decisions.approval_message_id` must resolve to a persisted **`role='user'`** message in the same conversation whose content unambiguously approves the *specific* decision. The model may suggest a candidate; Main binds an actual user utterance and records its evidence. If ambiguous, leave unapproved.
3. **Summary evidence:** each summary has at least one retained source message. Derived summaries may be revised/superseded but source messages and their project scope cannot be silently changed to fit them.
4. **Proposal consent:** a proposal has a fixed canonical workspace, exact goal and issuing conversation; it is **not** a `Task` until explicit UI `Run Task` makes one atomic admission. Proposal expiration is checked when accepting, including after app sleep/restart; `expired` is not a second execution state.
5. **Revocable source consent:** only Main creates a pending challenge after validating effective provider and project. A grant is always limited to the persisted challenge scope and applies to future in-scope source transmissions. A revocation cannot undo information already transmitted. Sensitive file exclusion still applies even with consent.
6. **Presentation isolation:** Right Dock preferences, title, text labels, model display labels and inspection coverage notes cannot mutate approvals, tasks, leases or OS process controls.
7. **No fabricated histories:** events and read counts must be linked to actual broker/process evidence; existing SQLite data are authoritative only for what Main **observed/committed**, not for facts it cannot observe after a crash.

## 6. Transaction T1 — Durable first message / append and idempotency

**Input:** frozen IIS-02 `conversations.sendMessage({conversationId?, draftId?, text, modelId, clientMutationId})` after Main validated caller, workspace and selected model; text max 16,384 Unicode **code points**.

1. Validate the `clientMutationId` and construct a stable fingerprint over **exact canonical input** including operation, selected project, conversation/draft selection, text, model ID and meaningful bounded fields. Do not normalize away substantive user text; never use ephemeral renderer/window ID as mutation identity.
2. Begin one serialized write transaction. If the mutation ID exists, verify operation, project/scope, and canonical input hash match exactly: return the **immutable stored result snapshot** (the original `MessageAcceptance`, not one recalculated from mutable rows). If any part differs, refuse with `BAD_INPUT`/`NOT_AUTHORIZED` as appropriate.
3. For first sent message only, insert one `conversations` row and one user `messages` row, and create its `discussion_turns` initial status. For existing conversation append exactly one user message. The New Conversation unsent draft itself is **not** a persisted conversation.
4. Insert `mutation_receipts` pointing to the durable message and conversation, with the **exact validated `MessageAcceptance` result snapshot** in the same transaction. Commit, **then** return `MessageAcceptance.deliveryState='persisted'`. Only now may UI navigate to the conversation.
5. Schedule the selected model's non-executing `discussion.send` asynchronously after commit. Before passing source excerpts to an external provider apply the already-frozen C02-D15/D16 rules; this is **not** a universal per-LLM outbound gate.

**Failure semantics:** if COMMIT is known to fail, do not assert persistence. If a crash/connection failure leaves commit result uncertain, on retry re-query `mutation_receipts` and messages by immutable IDs before deciding whether insertion occurred; **do not blindly insert again**. Provider failure after committed user message changes only discussion-response status and does not erase/rewrite the accepted user turn.

## 7. Transaction T2 — Proposal creation and atomically authorized Run Task

### 7.1 Proposal creation (non-executable)

Main may persist a bounded proposal derived from `discussion.send` candidate only after validating its concrete conversation/project, exact bounded goal and actual canonical workspace. A proposal ID is Main-issued, unpredictable, single-use and time-limited; Python/model text never chooses the authoritative ID or TTL. **Frozen v1 default TTL: 15 minutes**, clock-skew-aware expiry recorded in DB; this numeric threshold was adopted with the owner-approved IIS-04 v1.0 freeze, not inherited from prior contracts. Draft/expired proposals cannot execute. No Python Coding child is launched merely by inserting a proposal.

### 7.2 Confirm Run admission — one ACID transaction

**Input:** the frozen `proposals.confirmRun({proposalId,clientMutationId})` API on a real user click. Workspace/goal derived from proposal, not passed by Renderer.

1. Verify trusted renderer sender/action and calculate durable mutation fingerprint. Enter `BEGIN IMMEDIATE`.
2. Resolve prior `mutation_receipts` first; identical retry returns the **stored original `TaskAdmissionView`** (for example original `starting` even if its current live state is now `completed`) and **does not consume again, reserve twice, or spawn another process**. Current status is obtained separately through `tasks.read`; different payload/scope/key is rejected.
3. Validate proposal exists, scope matches project+conversation+canonical workspace+exact goal, **unexpired and unconsumed**, and no associated previous task. Verify registered project canonical identity freshly through the trusted Main resolver (if filesystem resolution is slow, pre-validate before transaction and check the identity/revision again under lock; fail closed on changed identity).
4. Check **global capacity**: frozen IIS-03 **one active coding task + at most 20 admitted queued tasks**. Check writer lane: there must be no other active/blocked writer on that canonical workspace if starting now. If capacity unavailable, reject with `TASK_BUSY`/`RESOURCE_LIMIT` **without changing the proposal**.
5. Insert `tasks` with immutable proposal, project, exact goal and durable `admission_order`. If global slot free and workspace lane safe, allocate singleton `active_coding_slot` + `workspace_writer_leases` for this task and initial task state `starting`. Otherwise add task as `queued` (durable queue claim to its identity only, **no exclusive writer lease for queued work**). Queued tasks remain cancelable.
6. Atomically set proposal `state='consumed',consumed_task_id=taskId`, insert `mutation_receipts` with **immutable original `TaskAdmissionView` snapshot** for this one admission, and commit **before invoking the supervisor**. Return only `TaskAdmissionView(state='starting'|'queued')`.
7. Outside the transaction, supervisor may launch exactly one coding child corresponding to the committed reserved `taskId`, and only after its own independently checked runtime/READY/lease constraints. Admission success is **not** evidence that Python accepted or executed `task.execute`.

**Crash windows:** Before COMMIT: no task/proposal consumption claimed. After COMMIT before spawn: the task is durable and may be `starting`; on Main restart **do not automatically invoke `task.execute`** from the old admission. Reconcile/task-user action as frozen in IIS-03. After command send with ambiguous response: **never** resend the entire coding task automatically. A second Run click on the same proposal/key cannot create a second task.

**Capacity/race proof target:** concurrent admission attempts from renderer reload/duplicate click or two distinct UI requests cannot both reserve the one global slot, nor the same workspace writer lane, nor consume the same proposal twice. Enforce with serialized transactions and unique constraints, not in-memory booleans alone.

## 8. Transaction T3 — Queue scheduling, cancellation and writer lease reconciliation

### 8.1 Durable scheduler

- Queue is the `tasks` rows in state `queued`, ordered by durable `admission_order` and ID tie-break. At most 20 such rows at once.
- When the one global active slot is verified free, scheduler atomically selects the oldest eligible task, skipping a workspace with an unresolved/blocked writer lease, then reserves both global slot and that workspace's lease and moves the row to `starting`. It cannot spawn until the reservation transaction commits.
- No background schedule, renderer navigation, or database read releases a blocked workspace. An inability to canonicalize or distinguish an alias is an admission/scheduling safety failure.

### 8.2 Cancel queued task

- In one transaction, check it **has not been spawned/leased**, mark `cancelled` as **never started**, persist a Main-issued `cancel_request_ref` bound to a verified `tasks.cancel` user action (not inferred from model text), and remove it from eligible queue. Send no `task.cancel` JSONL command and insert no fictitious Python `task.cancelled` event. An admission previously consumed stays consumed.
- A late/repeated cancel of this queued task is idempotent and never changes a verified terminal state.

### 8.3 Cancel active task / cleanup

- Persist `cancel_requested_at`, a Main-issued cancellation evidence reference (`cancel_request_ref`) and state `cancel_requested` (unless an already verified terminal outcome supersedes it), then forward `task.cancel` to the **bound** child via IIS-03. Response confirms only registration. A real `task.cancelled` requires engine proof; forced termination is `interrupted`/`unknown` according to actual evidence.
- On real terminal outcome, store exact grounded result separately from **OS cleanup verification**. A task may have a known engine outcome while its writer lease remains blocked because descendants/process state or workspace artifacts are unresolved.
- Release `workspace_writer_leases` and `active_coding_slot` **in one transaction only after** supervisor supplies trusted evidence that the child/descendant writer has ceased and required project-safety checks have passed. On uncertainty set lease `blocked` and task `needs_reconciliation` (retain any valid engine outcome evidence). No unconditional expiry/TTL auto-unlock.
- A verified cancellation/completion after a later crash cannot be inferred merely from old DB timestamps or absent Main process handle. Explicit reconciliation evidence is required.

### 8.4 Racing signals

A terminal event and user cancellation may race: serialize state transitions; a legitimately recorded prior terminal outcome wins over a later cancel. A stale child session/PID, second terminal event, task mismatch or lost event cannot overwrite persisted terminal evidence or unlock another task's workspace.

## 9. Transaction T4 — Verified task-event ingestion and replay

**Input:** IIS-01 `event` record from one supervised, task-bound Coding child, after strict session/role/wire validation in IIS-03.

1. Validate frozen event subtype, `task_id`, `event_id`, `sequence>=1`, `source`, task/child binding, and type-specific `data`. Calculate a deterministic canonical-payload digest for exact duplicate detection; reject inconsistent representations instead of treating different payloads as equal.
2. Begin write transaction. For duplicate `(task_id, sequence, event_id)` with the same validated payload digest, return already-committed receipt **without a second push**. The digest is computed over a deterministic serialization of the **validated closed typed event value** (fixed UTF-8, ordered object keys, stable JSON escaping, no lossy numeric conversion); document a shared test fixture so renderer/Main/bridge cannot diverge. Same sequence with another event ID or same event ID at another sequence, or different payload at existing key = integrity violation; set durable `task_event_streams.integrity_status=conflict`, bounded `last_incident_code` and `last_incident_at` when DB available; do not overwrite old event row.
3. Insert the immutable `task_events` row with Main-observed `process_session_ref` binding to the issuing coding child (the JSONL model/payload cannot choose this reference). Recompute `task_event_streams.max_seen` and `complete_through` as the greatest sequence with **every integer from 1 through that value durably present**. If `max_seen > complete_through`, set `integrity_status='gap'` **unless a prior `conflict` incident exists**; once `conflict` is recorded it is sticky until a separately verified reconciliation, never silently downgraded by later nonconflicting arrivals. Preserve the sparse later rows as non-complete evidence. Missing events are not invented or considered replayable from Python under frozen IIS-01 D12 Option A.
4. An event reporting `task.completed`/`task.failed` carries exact checked `TaskOutcomeV1`. Store it as engine evidence only when sourced, validated and correlated; **a terminal event seen with an event gap cannot establish a complete replay timeline or automatic safe lease release**. If sequencing or OS cleanup is uncertain, persist a task-level uncertainty marker even when an engine outcome was observed.
5. Commit event + stream metadata + any grounded task-state update atomically. **Only after COMMIT** emit IIS-02 `TaskEventCommitted` and `TaskStateChanged` notifications. Notifications are hints; UI replays from DB.

**Renderer replay projection:** frozen `tasks.readEvents({taskId,afterSequence,limit})` returns only DB rows for that task ordered by integer sequence, respecting max page size 100. `completeThrough` is `task_event_streams.complete_through`, `hasGap` reflects committed missing sequence(s), `stateIsCertain` is false if required sequence/terminal/process reconciliation is uncertain; `nextSequence` is a deterministic continuation cursor consistent with UI pagination, not permission to claim a gap has been filled. Reconstruct after Renderer reload without re-sending `task.execute`.

**No double journal:** Python-side durable event ACK/replay log is **not required**. Abrupt child death can permanently lose never-emitted/uncommitted events; truthfulness and a visible gap/unknown state are required instead of fake historical completeness.

## 10. Transaction T5 — Discussion results, summaries and verified decisions

1. Each actually issued LLM call gets a Main-issued `discussion_attempts.attempt_id` and actual selected model/effective provider/process-session linkage **before issue**; retries require explicit safe user action, a **new** attempt row and `retry_of_attempt_id` pointing to the prior attempt of the same original user turn. A restarted Discussion child is not, by itself, a request retry. For one previously persisted user message, a `discussion.send` result correlates to that specific issued attempt and to the same active, bound `discussion_turns` record and selected model. Main validates payload and text limits, persists the assistant message (if a true completed result), marks that turn answered, and updates conversation revision in one transaction. An LLM error instead records a failed/unknown turn without undoing the user turn.
2. Incoming `summary_candidates` and `decision_candidates` are **not approved memories**; validate bounded source-message IDs against the same conversation and insert accepted summaries as **derived** with `summary_sources`. A candidate with nonexistent, foreign, or deleted evidence is rejected; the underlying source messages remain stored.
3. An **approved decision** row requires an actual persisted user-utterance message evidencing explicit approval for that specific decision. Main must verify scope and intent; if language is ambiguous, leave a candidate only, not a confirmed decision. User approval can be conversational and need not open an extra confirmation dialog (C-02 FFR-R02).
4. Trigger summary creation due to **selected model context budget pressure**, not a fixed message count. The active `ContextV1` given to Python consists of Main-selected bounded `recent_messages`, provenance-linked `summaries`, verified `decisions` and `context_revision` (IIS-01). Summary creation does not erase original messages or overwrite decision approvals.
5. The narrower coding `ConversationContext` from C-01 is built separately **only on approved task handoff** with frozen limits (up to 3 prior task outcomes, 6 recent messages, 5 advisory preferences and 3,000 rendered characters). It must not be populated by raw unverified model decision candidates.
6. **Crash/LLM retry:** `discussion_turns.status='issued'` without verified answer is **ambiguous** after process crash; mark `unknown`/failed as warranted, persist the unfinished attempt with its stable identity and retry linkage, preserve the message and selected model, and do not auto-reissue a possibly billed model turn. Restarting Discussion process itself is permitted within the bounded IIS-03 policy.

## 11. Transaction T6 — External-provider source disclosure consent

**Authority remains the limited frozen C02-D15/D16 rule; FFR-R01's universal outbound gate stays deferred.**

1. Main creates a scoped `disclosure_challenges` row only for a real relevant source-disclosure request with **verified effective provider/destination key**, canonical project/workspace and disclosure class. Challenge includes a safe bounded `scope_description`, not secret file contents. **Frozen v1 TTL: 15 minutes** for a pending challenge; this threshold is part of owner-approved IIS-04 v1.0 and was not frozen elsewhere.
2. `disclosures.respond({challengeId,decision,clientMutationId})` uses T1's durable deduplication identity. Within a single transaction check pending/unexpired scope, record **explicit owner response** (`approve|deny`) and create `disclosure_consents` row **only** if approved. A model assertion or Renderer-furnished provider string cannot create a grant.
3. `disclosures.revoke({consentId,clientMutationId})` atomically changes `granted → revoked` for the original provider/project/class scope, idempotently. A revoked grant is never resurrected automatically by a stale challenge. It only blocks **future** authorized transmissions; do not claim to retract previously sent content.
4. The source-delivery decision in IIS-06/07 must re-check **current** consent status and actual resolved provider at its last feasible authorized source handoff boundary; a UI `approved` icon from an old snapshot is not enough. Main still filters protected files regardless of consent.
5. No global LLM-network interception, universal provider-traffic log or cloud server is implied; the owner explicitly deferred that distinct FFR-R01 feature.

## 12. Project inspection progress and per-conversation UI state

**Inspection state:** broker evidence may increment discovered/actually-read/excluded counts and update a verified partial-coverage note in `project_inspections`. In the **same transaction** insert one Main-verified `inspection_observations` record (scoped stable observation key and canonical evidence digest), then update cached counts **only for a newly committed unique observation**. Same-key same-evidence retry is a no-op; same-key conflicting evidence fails closed. For actually-read file counts, deduplicate by the same verified, non-sensitive file subject key within the inspection via the partial UNIQUE constraint rather than by number of excerpt batches. No count update may occur before the observation insert succeeds. Excluded-count-only broker pages are deduplicated by page/request identity without storing denied sensitive path names. Increment counts only on actual completed authorized discovery/read decisions; **`discovered_count` remains NULL where enumeration cannot justify it**. A scanned path is not a read path; externally disclosed content is a separate consent event, not equivalent to local read. Progress state is one of frozen IIS-02 `not_started|discovering|reading|analyzing|completed|partial|failed`; Main persists latest evidence-backed snapshot. Do not claim exhaustive coverage or display fabricated percentages.

**Right Dock:** `conversations.saveDockState` upserts exactly that conversation's closed `ChatDockStateView` with `clientMutationId` deduplication; width remains in global `ui_preferences`. New Conversation's unsent dock state remains local until a real persisted conversation exists. Agents/Projects route changes cannot mutate a Chat conversation's stored Dock state and cannot terminate a coding child.

**Preferences:** `preferences.update` writes only the frozen safe UI keys; `models.setDiscussionPreference` records the chosen supported **model ID preference** only, not an authority to silently fallback or to override the model specified on an individual message. Registry availability is checked at send time by Main/IIS-06.

## 13. Read paths and query shape — no extra Renderer methods

All query results are projections used by the **already frozen IIS-02 methods**; IIS-04 introduces no additional Renderer IPC channels and no sixth IIS-01 JSONL action.

| Frozen IIS-02 read | Database query/authorization contract |
|---|---|
| `app.bootstrap`, `projects.listRecent` | Bounded recent registered projects, Main-verified runtime summary and tasks; no eager filesystem scan |
| `conversations.list`, `conversations.read` | Project-scoped conversations; stable message ordinal pagination, stored verified inspection status and safe pending disclosure challenges |
| `disclosures.list` | Only this project's effective-provider-scoped consent rows; no content or provider credentials |
| `tasks.list`, `tasks.read` | Immutable admitted task identity, truthful state, engine evidence and separate cleanup/reconciliation marker |
| `tasks.readEvents` | Committed task-event sequence and integrity metadata; never Python stderr as an event |
| `conversations.saveDockState`, `preferences.get` | Scoped presentation state without altering task or authority data |

Page default **40**, hard max **100**, with opaque Main-issued cursor bound to query/project/conversation and a stable tuple (`message_ordinal,id`, `admission_order,id`, or `sequence` as applicable). Cursor tampering/mismatched scope is rejected. Where concurrent writes change a list, pagination may reflect a newer committed snapshot unless the query explicitly establishes a SQLite read snapshot; do not claim historical snapshot consistency without one.

**UI notifications:** Main pushes only sanitized `ConversationChanged`, `TaskStateChanged`, `TaskEventCommitted`, `ProjectInspectionProgressChanged`, `DisclosureConsentRequired`, `DisclosureConsentChanged`, `RuntimeStatusChanged`, `ModelAvailabilityChanged` as enumerated in IIS-02, and only for committed state changes. In particular the notification is **not** the database itself and grants no extra authority.

## 14. Recovery after crashes and ambiguous states

### 14.1 On application/DB open

1. Verify schema/migration and DB access. Abort new writes/spawn if invalid; never silently reconstruct authority from Python files or UI caches.
2. Read unfinished `tasks`, non-null `active_coding_slot` and active/blocked `workspace_writer_leases`. Under a startup reconciliation transaction, **mark previously active/suspect tasks `unknown` or `needs_reconciliation`** and retain the lease as blocked until independent OS/project verification. Do not conclude there is no writer just because the new Main process lacks an old child handle.
3. Preserve all committed proposals/receipts, user messages, events, summaries and grants. Evaluate proposal/challenge expiry at request time; do not automatically grant/reuse old challenge.
4. Do not replay `task.execute`, automatically repeat ambiguous LLM calls, or synthesize missed Python events.
5. Resume display-only read paths where DB is healthy; notify UI with safe reconciliation states and instructions for explicit review rather than silently unlocking or resetting project files.

### 14.2 Scenario matrix

| Crash window | Persisted fact | Safe response |
|---|---|---|
| Crash before user-message COMMIT | No committed user turn if transaction rolled back | Keep draft; retry same key only after check |
| Crash after user-message COMMIT before Python send | Durable original turn; Python may never have received it | Do not duplicate turn; inspect `discussion_turns`; bounded explicit retry policy |
| Crash during/outside LLM provider request | Provider execution/billing ambiguous | Preserve selected model, mark assistant turn unknown/failed, no silent model switch or replay |
| Crash before task admission COMMIT | No consumed proposal/admitted task | No coding process allowed |
| Crash after task admission COMMIT before coding child | Proposal consumed, task `starting`/queued | Recover unknown startup state; never auto-run whole coding task |
| Crash during coding or cancellation | Some events/engine changes may exist | Unknown/reconciliation and blocked lease until verified stop |
| `task.completed` committed but descendants not confirmed stopped | Proven outcome, unsafe/unverified cleanup | Retain lease and show needs reconciliation |
| Event emitted but DB commit failed | Not a committed UI event | No reliable replay claim; backpressure then task uncertainty |
| Consent revoked while source request in progress | New grant state revoked | Reject future source transmissions; do not claim previously handed-off data was recalled |
| Renderer reload/navigation | SQLite and Main processes continue | Re-read snapshots and subscribe; no task replay or permission remint |

### 14.3 Reconciliation authority

SQLite stores **known** task outcomes and flags but is not OS process containment. A separate, tested IIS-03 recovery operation may conclude cleanup with trusted process/descendant evidence and workspace checks. Mark release in a **new explicit transaction with an audit reason**, never because an elapsed time or missing old process row implies safety. Preserve the original engine terminal outcome where valid; a cleanup failure may coexist with valid output.

## 15. Resource limits, retention and local privacy

- Obey inherited IIS-01 v1 JSONL ceilings (wire line <= **262,144 bytes**; memory/in-flight budgets from the frozen protocol), IIS-02 IPC preview/user text **16,384 Unicode code points**, list limit **100**, and IIS-03 one active coding process globally plus 20 queued. Database rows storing bounded wire payloads may need their own conservative encoded-size checks; **no unbounded DB JSON values are permitted**.
- Frozen v1: SQLite `busy_timeout=5s`, proposal/challenge TTL **15 min**, DB pages default 40/max 100. These IIS-04-specific defaults became owner-approved with this freeze; they do not retroactively alter upstream contracts.
- Retain authoritative messages, source-provenance links, approved decisions, proposal consumption, mutation receipts, task events and writer-lease recovery data while referenced by active or auditable workflow. Do not auto-prune a still-active dedup receipt or incident marker merely to reduce disk use. An explicit bounded archival/retention policy can be added only after its correctness impact is reviewed; no silent deletion of correct saved project knowledge.
- Limit diagnostic logs by separate bounded retention and sanitization; they are not authoritative events. No API keys, OAuth secrets, raw `.env` contents or unfiltered source-text excerpts in Desktop SQLite records unless separately authorized by an explicit security design; for v1 **store source-safe metadata and hashes rather than scanned file contents**.
- Local storage does not equal encryption. Rely on standard per-user filesystem access controls until a separately reviewed encryption/backup policy exists; do not claim full-disk secrecy or hardware-backed key storage by default.

## 16. Failure mapping and forbidden shortcuts

| Condition | Main-owned result | Forbidden shortcut |
|---|---|---|
| `SQLITE_BUSY`, full disk, schema mismatch, commit failure | Frozen IIS-02 `DATABASE_UNAVAILABLE` / safe retry where appropriate | Report `persisted`/`starting` without commit |
| Mutation ID replay with different payload or project | `BAD_INPUT` or `NOT_AUTHORIZED` | Duplicate saved turn/admission or accept altered request |
| Run Task proposal expired/used | `PROPOSAL_EXPIRED` / `PROPOSAL_ALREADY_USED` | Reissue executable task from stale text |
| Queue capacity reached / workspace uncertain | `TASK_BUSY` / `RESOURCE_LIMIT` | Consume proposal and spawn anyway |
| Sensitive/foreign source request | `SENSITIVE_CONTENT` / `NOT_AUTHORIZED` | Save/disclose raw source or broaden provider grant |
| Concurrent same workspace writer | `TASK_BUSY` / queued allowed according to admission capacity | Start two Python coding children in same workspace |
| Bad/missing event sequence or conflicting duplicate | Integrity-incident record and UI uncertainty | Fabricate sequence or overwrite event |
| Lost child or unverified descendants | `TASK_UNKNOWN`/`needs_reconciliation` | Release lease based on timeout or absent PID |
| Fatal database integrity/migration issue | Disable new writes/task admission, surface safe diagnosis | Recreate DB and erase users' approvals/history |

## 17. Conformance and fault-injection acceptance matrix — NOT RUN

The following are **future executable tests** to be implemented and passed in a real Windows/Electron/SQLite environment before implementation acceptance; writing them here is not evidence they ran.

| Test group | Mandatory positive case | Mandatory adverse case / proof |
|---|---|---|
| Fresh schema/migration | Create/load supported version with FKs, durable committed row | Corrupt or newer schema fails closed without reset |
| First message | One first-send transaction creates conversation/message/turn/receipt **with immutable original acceptance snapshot** | Kill/rollback/duplicate click/renderer reload never duplicates or returns changed admission status |
| Client mutation binding | Same key and input yields stable original result after restart | Same key and changed project/model/text rejected |
| Run Task | One valid explicit proposal creates one task + slot or queue + receipt | Two competing clicks/expired/used proposal, DB fail, queue full -> no new child |
| Canonical aliasing | Same resolved workspace key shares writer lane | Symlink/junction/case alias cannot create dual writers |
| Global capacity | Exactly one active slot and <=20 queued | 21st queued admission refused before proposal consumed |
| Queue and cancellation | FIFO eligible queue and queued cancel without spawn | Cancel race with slot grant does not launch after verified never-started cancel |
| Active cancel | Request persisted then sent to same trusted child | `cancel` ACK never records task cancelled or releases lease |
| Process cleanup | Grounded engine outcome + verified descendant stop allows release | Parent crash/orphan descendant/late event keeps blocked lease |
| Event dedup | Exact duplicate event yields same committed stream once | Conflicting seq/id or gap marks incomplete, no event fabrication |
| Event DB fault | Committed event pushes once and replays after UI reload | Commit fails -> no trusted `TaskEventCommitted` |
| Decision provenance | Explicit same-conversation user approval creates decision | Ambiguous model summary/foreign user message cannot approve |
| Summary and context | Relevant bounded ContextV1 from original sources; **per-attempt provenance** on safe manual LLM retry | Cross-project/unknown source IDs rejected; summary cannot erase originals; no silent reissue after crash |
| Consent | Project/provider/class-scoped approval and revocation durable | Forged/expired challenge, provider switch, stale consent blocked |
| Inspection | Counts reflect **deduplicated committed broker observations**, persist after navigation | Same-key duplicate counts once; conflicting observation fails closed; guessed percentage/leak blocked path refused |
| Dock & prefs | Per-conversation tab/visibility and global width survive reload | Changing workspace/route cannot change task authority |
| Crash recovery | Startup retains suspects as unknown/blocked, no auto-rerun | Old missing Main process/PID does not auto-unlock writer |
| Offline runtime | Existing messages/history browse with Python unavailable | UI bootstrap does not silently start code or lose draft |

**Required executable verification:** database unit/migration tests, Main concurrency/transaction tests, Renderer reload tests, child kill and Windows descendant fault injection, deterministic two-writer collision tests, and regression compatibility with frozen IIS-01/02/03. No runtime test or commit is claimed in this draft.

## 18. Frozen-parent compliance checklist and single-review agenda

| Frozen source | Mandatory constraint | Document location | Review disposition |
|---|---|---|---|
| C-02 D5–D8 + FFR-R02 | Main-only SQLite; original/source-linked memories; user-approved decisions | §§4–5, 10 | **Approved v1 design mapping**, no parent change |
| C-02 D4 | One-time scoped proposal and explicit Run Task | §§4, 7 | Approved ACID admission design |
| C-02 D13–D17 | Truthful incremental read coverage; consent and sensitive exclusions | §§4, 11–12 | Approved v1 persistence design, not universal egress gate |
| C-03 D5, D7, D8 | One writer; cancellation/reconciliation; SQLite event history | §§7–9, 14 | Approved v1 transaction design |
| IIS-01 D12–D15 | Contiguous task sequences; strict event schemas; no Python replay journal | §§4, 9, 17 | Preserved |
| IIS-02 v1.0 | 23 Promise methods, typed DTO and safe subscriptions, durable mutation ID | §§4–6, 11–13 | Preserved without new API |
| IIS-03 v1.0 | One global writer, 20 queued, verified process teardown, no rerun | §§7–9, 14 | Preserved |
| NCD-02 + C-01 | Local-first ownership, Python engine state separate, bounded handoff context | §§1–2, 10 | Preserved |

**Consolidated FFR-01 corrective review (2026-10-20) — historical review agenda, subsequently owner-approved:**

1. Proposed table inventory, exact PK/FK/unique constraints and chosen v1 SQLite pragmas/migration strategy.
2. Proposed strict transactional semantics and durable idempotency/proposal/consent TTL defaults.
3. Proposed queue lease / singleton global slot and event-contiguity storage policies.
4. Recovery handling, archived data/retention bounds and conformance matrix.
5. Any discovered conflict with frozen parent contracts. A real conflict must be corrected before freeze; no silent reinterpretation.

**Paper completion state (updated at freeze):** FFR-01 documentary review completed, corrected v0.2 was accepted by the owner, and IIS-04 became **FROZEN v1.0 on 2026-10-20**. Runtime verification remains NOT RUN. Next documentation stage: IIS-05. No source implementation is authorized by this freeze.

## 19. FFR-01 — Consolidated documentary corrections and remaining implementation boundaries

**Historical FFR-01 review disposition: CONDITIONAL PASS before owner approval. Final owner disposition: APPROVED / FROZEN v1.0 (documentary).** Parent architectural invariants match; the following five defects were corrected in v0.2 and adopted by the owner without further changes:

1. **FFR04-01 / immutable dedup result:** A `result_id` alone could not reproduce an earlier `TaskAdmissionView(state=starting)` after the task's live state changed. Fixed by immutable, bounded original `result_snapshot_json` persisted atomically with the receipt and verified canonical input.
2. **FFR04-02 / backed inspection counts:** `project_inspections` counters had no durable evidence-key dedup schema. Added `inspection_observations` and same-transaction observation + count updates; same evidence never increments twice.
3. **FFR04-03 / discussion retry provenance:** The original single `discussion_turns` row could not faithfully record multiple user-triggered LLM attempts. Added `discussion_attempts` with stable retry linkage, without automatic replay after crashes.
4. **FFR04-04 / cancel and event evidence:** Persist the verified user cancel-action reference, the Main-observed event process session reference, and a durable bounded incident marker for conflicting event IDs/sequences. Do not equate these records with OS safety verification.
5. **FFR04-05 / SQLite sequence legality:** Stable monotonically assigned ordinals cannot simply be described as 'DB-generated' when the text IDs are declared as primary keys. Specify physical SQLite `INTEGER PRIMARY KEY AUTOINCREMENT` for message/task ordering with UNIQUE text IDs retained as external identity/FK targets.

**Cross-consistency guard:** Event-conflict severity is sticky; a later valid event cannot downgrade it to a simple gap. Inspection counts have both a unique observation key and a unique per-file subject key where available. Counting is never based solely on repeated broker request completions.

**Additional v1 execution obligations, not claimed complete by a paper:** concrete SQL DDL/migrations must enforce cross-record scope and state checks (some require Main transaction validation, not FK constraints alone); representative immutable idempotency DTO snapshots, event canonicalization fixtures, attempted-turn retry lineage, broker observation conflicts, SQLite WAL backup/restore, and post-crash leases must have adversarial executable tests. Do not claim database transactions or Windows cleanup have been run. This document is independent of any external coding agent or IDE.

## 20. Final owner-approved documentary freeze — v1.0 (2026-10-20)

**Owner instruction:** “بتجميد IIS-04 رسميًا بالإصدار FROZEN v1.0 قم” (2026-10-20). This instruction explicitly approves the five consolidated FFR-01 repairs as part of the complete IIS-04 Draft v0.2 baseline and authorizes **documentary freeze only**.

**Final disposition:** **PASS — FROZEN v1.0 (DESIGN ONLY).** This section supersedes any preceding historical Draft v0.1/v0.2, “proposed,” “pending owner adoption,” or “not frozen” status text as to **approval status only**. It does not revise the substantive rules or silently override frozen parent contracts.

**Normative design content:** §§1–17 together with the adopted consistency clarifications in §§18–19: 22 logical tables; T1–T6; immutable mutation receipts; unique inspection evidence; per-attempt LLM lineage; verified cancellation/session/event incidents; physical monotonic message/task ordinals; Main-only database ownership; no automatic Run Task/retry after crash; global one-active/20-queued limitation; safe unknown-state reconciliation. Proposed defaults in the reviewed v0.2 — SQLite `FULL` sync, 5,000 ms busy timeout, 15-minute proposal and disclosure challenge TTL, page default 40/max 100 — are accepted as this v1 design.

**Parent precedence:** Frozen NCD-00/01/02, C-01/02/03 and IIS-01/02/03 retain authority in their respective domains. FFR-R01 broad universal LLM egress gate remains explicitly deferred; it is not implied or introduced here. Subsequent IIS-05–IIS-08 may refine their own internal mechanics but may not contradict this freeze without a documented conflict and new owner authorization.

**Not authorized / not claimed:** No Desktop SQLite database has been built; SQL DDL/migrations, WAL backup/restore, Main atomicity, renderer replay, Windows process/descendant teardown, cross-contract runtime tests, and production deployment remain **NOT EXECUTED / NOT AUTHORIZED**. Design sign-off is not executable conformance. No Next Code engine change, Desktop repository creation, or source commit is authorized by this decision.

**Audit and integrity:** See `NCD-03-IIS-04-FINAL-FREEZE-RECORD.md` for adopted findings, documentary checks, original v0.2 archive, and SHA-256 of this canonical frozen file. The original FFR-01 review is preserved as historical evidence and must not be retroactively edited to claim it had itself granted owner approval.
