# NEXT CODE DESKTOP — NCD-03 / C-03
## Electron Main ↔ Python Integration Contract

**Status:** **FROZEN v1.0 — ARCHITECTURE**; C03-D1 through C03-D14 APPROVED (Option A); FFR-01-C01 F01/F02 RESOLVED; owner-approved freeze 2026-10-19; **IMPLEMENTATION NOT AUTHORIZED**  
**Date:** 2026-10-19  
**Authority:** Frozen owner-approved process topology C03-D1, JSONL message envelope C03-D2, explicit handshake/readiness C03-D3, command capability allowlists C03-D4, concurrency/workspace single-writer policy C03-D5, structured real-time event streaming C03-D6, controlled cancellation/recovery C03-D7, structured Main-owned SQLite persistence/event history C03-D8, and central model registry with ModelGateway routing C03-D9, on-demand Main-owned read broker C03-D10, selective Main-owned context retrieval C03-D11, controlled retry/error recovery C03-D12, bridge boundary validation/resource limits C03-D13, and Windows distribution-stage bundled Python sidecar selection C03-D14 only; **NO SOURCE MODIFICATION OR IMPLEMENTATION AUTHORIZED BY THIS FREEZE**.  
**Normative upstream:** NCD-00 FROZEN, NCD-01 FROZEN, NCD-02 FROZEN (A-01–A-06), NCD-03/C-01 FROZEN & merged on `main` (`834d0ca62cc9b2c03e530bafe4090024d98f31d3`), NCD-03/C-02 FROZEN v1.0 (C02-D1–D17, FFR dispositions).

## Document neutrality and implementation authority

This document is an **implementation-tool-neutral engineering contract**. It does not name, select, privilege, or authorize any particular coding assistant, development IDE, contractor, or automation product. Any later implementer is bound by the same approved architecture, explicit change scope, independent verification gates, and separate owner authorization. Names of Next Code runtime components, standardized technologies, and source contracts below are technical interfaces—not a selection of an implementation agent.

The correction made during FFR-01 aligns the canonical message-discriminator field with frozen NCD-02: the outer envelope uses **`type`**. It is not an additional authorization primitive; `payload.action` specifies a separately validated requested operation. Message/command schemas, capability gates and numeric limits remain to be fixed in a future implementation interface contract.

## 1. Purpose

Define the **frozen architectural integration contract** between Electron Main and the Next Code Python runtime. The owner-approved architectural decisions and boundaries herein are authoritative; this freeze **does not** adopt any unapproved per-message wire schema, SQL DDL, numeric budget, timeout, model-provider policy, or implementation algorithm. Those require subsequent implementation interface specification, review, and separately authorized source changes.

The integration must support (a) non-executing Python Discussion Service, (b) explicitly authorized `AgentOS.execute_task()` coding executions, (c) persistent conversation/task records in Main-owned SQLite, and (d) reliable error reporting without giving the React renderer direct operating-system or Python authority.

## 2. Already frozen boundaries — not new proposals

1. Windows desktop: Electron Main + Preload + React/TypeScript Renderer; user-visible conversation remains continuous.
2. Electron Main supervises Python process/task lifetime independent of UI routing, tabs and dock state.
3. Private **stdin/stdout JSONL** transport, not TCP. **stdout protocol-only**, **stderr diagnostic-only**, separate from interactive terminal.
4. Versioned, validated, correlated typed messages; handshake/readiness required. Malformed, unknown or oversized records must not be interpreted as success.
5. Electron Main owns SQLite, conversation/project binding, authorization and proposal confirmation; engine `.agent_os` state and checkpoint truth remain in Python.
6. C-01 `ConversationContext` is an optional, bounded and lower-trust advisory *engineering-task input*, not the complete Discussion Mode memory contract.
7. C-02 Python Discussion Service is separate from `AgentOS`; intent suggestion alone must never execute a task. **Run Task** requires one-time user confirmation bound to exact goal, conversation and workspace.
8. Main brokers discussion project reads; C02-D12 broadly permits ordinary text but C02-D15/D16 consent/sensitivity safeguards still apply. FFR-R01 universal outbound gate was **deferred by owner**, not silently imposed here.
9. C02-R03 chose application-level capability separation, not a Windows sandbox. No proven OS-level file isolation is claimed.
10. Model routing for discussion must respect the chosen supported model/provider; no silent fallback or coupling to coding agent routes.

## 3. Responsibilities

| Component | Authoritative responsibilities | Explicit non-responsibilities |
|---|---|---|
| React Renderer | display chat, propose/click Run Task, subscribe to progress | start Python, grant execution, open arbitrary files/SQLite, own task lifecycle |
| Preload | limited typed IPC allowlist | raw Node/shell or unrestricted bridge |
| Electron Main | request/proposal identity, project binding, process supervisor, SQLite, file broker, external project-content consent, validation, state reconciliation | reason about code, forge engine events, execute engineering algorithms |
| Python Discussion Service | LLM-based replies/intent classification, source-scoped summaries, bounded evidence requests | call `AgentOS`, dispatch workers, modify project, persist independent chat DB, direct project file broker bypass |
| Python Coding Task Bridge | map authorized task request to `AgentOS.execute_task()`; emit only verified lifecycle/outcomes | turn verbose prints into invented structured events; bypass Main approvals |
| AgentOS | task-scoped Blackboard, checkpoints, gates, worker orchestration, `TaskOutcome` | own Desktop conversations or React routes |

## 4. C03-D1 — APPROVED (2026-10-19): Python child-process topology

**Question:** How should Electron Main arrange local Python bridge processes for discussion and coding?

### APPROVED: Option A — Hybrid process architecture

- Electron Main supervises one reusable discussion bridge process while the app/session needs it (restartable; no independent conversation DB).
- Each accepted engineering task runs in its own supervised Python task bridge child process, which calls the existing AgentOS facade with a fresh `task_id` and Main-authorized workspace/context.
- Both bridges use the *same frozen JSONL framing principle*, but have distinct allowlisted message capabilities. A discussion process has no `execute_task` command.
- Each child has a dedicated stdout protocol channel and stderr diagnostics; no sharing of protocol stdout with the interactive shell.
- Renderer navigation does not terminate either running task or discussion process. Application shutdown/crashes, safe task recovery, concurrency and cancellation are specified in later approved decisions, with no premature guarantees.
- Discussion can in principle stay responsive while a task runs, but concurrent operation and workspace conflict behavior are governed by approved C03-D5 and require implementation tests.
- **Engineering caveat:** existing engine code may print to stdout. Task-bridge isolation does not itself prove protocol cleanliness; capture/redirection and tests are still mandatory.

### Rejected alternative: Option B — One long-lived Python bridge for discussion and coding

- Electron Main supervises a single Python process hosting both service entrypoints and dispatching requests internally.
- Fewer process startups and potentially simpler shared provider connections.
- Harder isolation of task-scoped stdout, failure/crash impact, blocking execution, process-local mutable state and discussion responsiveness; must independently solve all of these.

### Owner decision and boundaries

- **Decision C03-D1: APPROVED — Option A, Hybrid Process Architecture, 2026-10-19.** Electron Main supervises one restartable, relatively long-lived Python Discussion Service bridge and creates a **separate supervised Python coding-task process for each explicitly approved engineering task**.
- The Discussion Service remains independent of AgentOS execution; the task bridge only starts after Main validates and atomically consumes the exact authorized Run Task proposal from C-02.
- Dedicated stdout JSONL and stderr diagnostics per child process; separate capability allowlists for discussion and task bridges. Neither a UI route change nor the lifetime of a renderer tab is grounds for ending an authorized process.
- **Non-claims:** approved topology does not itself guarantee Windows OS sandbox isolation, conflict-free concurrent workspace access, automatic rollback/recovery, clean stdout, or immediate task cancellation. Those follow approved C03-D3/D5/D7/D12 and still require detailed implementation and tests.
- **Approval is architectural only**, not implementation authorization. The existing Python engine, AgentOS, and GitHub repository remain unchanged by this record.

## 5. Decision roadmap — approved and remaining topics

| ID | Topic to decide in order | Required proof/gate |
|---|---|---|
| C03-D2 — APPROVED | JSONL envelope, protocol version, correlation and parent/child IDs | deterministic schema, limit/error tests |
| C03-D3 — APPROVED | explicit handshake, readiness, failure and health semantics | no request before ready; no false success on disconnect |
| C03-D4 — APPROVED | strict per-process command/event allowlists and trust boundaries | discussion cannot execute; Run Task Main-bound |
| C03-D5 — APPROVED | concurrent discussion; single active writer per canonical workspace; other tasks wait | no duplicate dispatch, no competing writers, safe queue/lifecycle tests |
| C03-D6 — APPROVED | source-grounded event streaming, ordered display, reconnect/replay design | no fabricated worker states; logs not shell |
| C03-D7 — APPROVED | controlled cancellation, bounded graceful stop, escalation, safe reconciliation and unknown state | no unverified rollback or automatic retry |
| C03-D8 — APPROVED | Structured Electron Main-owned SQLite + validated task-event history | referential bindings, single-use confirmations, and conservative recovery persistence; detailed tables deferred |
| C03-D9 — APPROVED | central model registry, explicit discussion provider/model selection and ModelGateway routing | no silent provider fallback; provider/model consistency, token/cost accounting |
| C03-D10 — APPROVED | on-demand Main-owned discovery and authorized read broker; incremental evidence | project jail, denied sensitive content, truthful actual coverage |
| C03-D11 — APPROVED | Main-owned selective conversation memory/context retrieval and source-backed summarization/decisions | attributable decision approvals, bounded model-specific context and pressure-triggered compaction |
| C03-D12 — APPROVED | controlled LLM/bridge errors, bounded discussion retries, no automatic coding-task replay | no duplicate task execution, no silent model fallback or fabricated success |
| C03-D13 — APPROVED | versioned JSONL boundary validation, per-process allowlists, resource ceilings and diagnostic/secret hygiene | negative-case rejection tests; preserve FFR-R01 owner deferral |
| C03-D14 — APPROVED | packaging integration, Windows local environment, deployment acceptance | configured local Python during development; bundled sidecar in future end-user build; clean-machine packaging gate |

All fourteen listed architectural options are approved. Their specific wire, storage and process-control mechanics still require separate implementation specifications and verification. **Precise numeric budgets are not invented** here.

## 6. C03-D2 — APPROVED (2026-10-19): Versioned, typed JSONL envelope

**Owner decision: Option A — structured, versioned envelope.** The minimal unstructured Option B was not chosen.

### Approved wire principles

1. **One UTF-8 JSON object per terminated line** on private child-process stdout/stdin, consistent with frozen NCD-02. Diagnostic messages must go to stderr, not protocol stdout.
2. A **fixed, typed outer envelope** includes `version`, `type`, `message_id`, `correlation_id` (nullable when not a reply or event related to a request), and `payload`. The outer discriminator **`type` is normative under NCD-02/A-03**; this example otherwise illustrates the approved envelope principles. Exact message-type-specific schemas and validators remain implementation-contract work, not invented here.
3. The protocol uses an **explicit version number**. A peer must refuse unsupported versions; compatibility must not be guessed or silently downgraded.
4. **Every message has its own ID**, separate from a correlation reference to the initiating request. Replies, errors and progress events tied to a request use its identity so multiple in-flight operations cannot be confused.
5. `type` distinguishes at minimum a command/request, a final result, an intermediate event, and an error. The command/event family, handshake lifecycle and allowed initiators follow approved C03-D3/D4/D6; exact wire message types are still to be fixed in the implementation specification.
6. Payloads are **validated by message `type`**. Malformed JSON, missing/wrong-type fields, unexpected or duplicate IDs within the applicable scope, oversized lines, unknown versions/message types or invalid payloads must not be interpreted as success. Exact ID format, byte limits, duplicate scopes and failure responses are to be specified in follow-up contract work.
7. A message carrying a `conversation_id`, `task_id`, `proposal_id`, `workspace` reference or session/parent identifier gains **no authority from possession of that value**. Electron Main separately resolves and validates persisted identity and authorization. Python discussion cannot receive execution capability by crafting an envelope.
8. This envelope is shared by the two Python bridge categories, but their **permitted commands remain different**. Process-supervisor lifetime, handshake state, concurrency, event ordering, cancellation and replay are not implicitly approved by adopting the envelope.

**Illustrative record (non-normative values):**

```json
{"version":1,"type":"request","message_id":"msg-001","correlation_id":null,"payload":{"action":"discuss","text":"Explain this project"}}
```

### Acceptance gates for C03-D2 implementation contract

- Deterministic schema tests for allowed message types, mandatory envelope fields, version refusal, malformed/truncated JSONL, excessive record size, invalid correlation, duplicate IDs and non-object JSON.
- Multiple in-flight requests/events remain attributable to their correct origin; one final result per request must be enforced by later lifecycle semantics, never guessed here.
- Security checks verify renderer- or LLM-supplied IDs cannot authorize task execution or read requests, and that discussion processes cannot dispatch coding commands.
- Stdout remains protocol-clean even when the underlying Python engine would otherwise print debug/progress text.

**Scope clarification:** This approval establishes the envelope strategy, *not* a complete finalized wire-protocol schema or implementation authorization. C03-D3 through C03-D14 are approved architecturally; precise per-message-type wire schemas and implementation tests remain to be specified.

## 7. C03-D3 — APPROVED (2026-10-19): Explicit startup handshake and readiness gate

**Owner decision: Option A — Explicit Handshake.** The implicit-readiness Option B (assuming a newly started Python process is ready immediately) is rejected.

### Approved lifecycle requirements

1. **Spawn is not readiness.** Every new Discussion or Coding Task bridge begins in a non-ready initialization state under Electron Main supervision. Successful process creation, readable stdout, or a nonempty PID does not authorize requests.
2. **Explicit, version-checked handshake.** During initialization the Python bridge must provide an explicit protocol-level readiness confirmation, following the approved C03-D2 versioned JSONL envelope. Electron Main validates the envelope, compatible protocol version, expected bridge category/capability set and correct child-process association before treating the child as ready. An unverified or malformed `READY` assertion has no authority.
3. **Request gate.** Electron Main must not dispatch discussion requests to a non-ready Discussion bridge or an approved coding-task request to a non-ready Coding Task bridge. Task authorization under C-02 remains necessary *in addition to* readiness; `READY` alone does not authorize any execution or file access.
4. **Bounded initialization.** Each child has a finite startup/readiness deadline. If readiness is not established within that deadline, startup fails visibly and no user request is dispatched. The numeric deadline, retry policy and UI wording will be fixed in the later integration implementation specification, not invented in this architecture decision.
5. **Deterministic incompatibility/failure handling.** Unsupported protocol versions, wrong bridge category, malformed handshake records, initialization exceptions, premature child exit, stdout protocol contamination or unexpected disconnect cannot be treated as successful initialization. Electron Main marks the child unavailable, surfaces an actionable failure and preserves the distinction between transport failure and an engine-task outcome.
6. **Readiness is instance-scoped.** Readiness is invalidated upon process exit/disconnect; a restarted Python child must complete its *own* handshake. Cached readiness from a previous process must never be inherited or replayed.
7. **Separate supervision for each child.** The reusable Discussion bridge and every separate Coding Task bridge each perform their own handshake. Discussion readiness does not imply any coding-task bridge readiness, and vice versa.
8. **No fabricated operational guarantees.** This decision does not yet define heartbeat cadence, automatic restarts, request queuing, in-flight recovery, task cancellation, concurrency, or exact wire field schemas. Those require later C03 decisions and tests; no automatic replay or exactly-once execution is promised here.

### Minimum verification gates

- A normal Discussion bridge handshake allows discussion requests only after valid `READY` and protocol/role validation; a normal Coding bridge follows its own independent readiness gate.
- A missing/delayed `READY`, process exit before `READY`, wrong protocol version, malformed `READY` payload, role mismatch and stdout noise all prevent a false-ready transition and produce a distinguishable failure.
- The same ID or `READY` record replayed from an earlier process does not confer readiness on a new child.
- A coding-task request with a valid readiness handshake but without an independently consumed Main-authorized Run Task proposal is still refused.
- Renderer route changes do not themselves revoke readiness or dispose of an authorized active task; child process lifecycle remains under Main.

**Scope:** Approved as an architectural handshake/readiness *behavioral contract*, not a precise handshake message schema, a numerical timeout, or a coding instruction. C03-D4–D6 are approved separately; C03-D7 through C03-D14 are now approved at the architectural level; exact lifecycle schemas, timeouts and error semantics remain implementation-contract work.

## 8. C03-D4 — APPROVED (2026-10-19): Strict command and event capability allowlists

**Owner decision: Option A — Strict Command Allowlist.** The universal shared command dispatcher (Option B) was not selected as the primary authorization model. Shared parsing, schema validation or transport utilities may still be implemented, but no single permissive handler may treat a mere `type` or LLM-generated payload as authorization.

### Approved capability boundaries

1. **Two non-interchangeable bridge identities:** Each child is launched and supervised by Electron Main as exactly a `discussion` or `coding_task` bridge. That assigned category is checked during the C03-D3 handshake and bound to that *specific process instance* and transport connection. No field inside an incoming JSONL message can promote or change the category.
2. **Discussion inbound requests (Main → Python):** May request non-executing text discussion, model-assisted intent interpretation, source-grounded summaries/decision *candidates*, and bounded analysis of broker-supplied project excerpts, with model selection subject to C02-D9. These are conceptual capabilities, not frozen wire action names.
3. **Discussion outbound requests/events (Python → Main):** May provide responses, non-executable task proposals, evidence/read requests to Main's C02-D11 file broker, bounded inspection-progress reports, and permitted diagnostic/failure/status records. A proposed engineering task is only a suggestion; it does **not** carry authorization to spawn a coding child or trigger `AgentOS`.
4. **Discussion explicitly forbidden:** No `execute_task`, coding-worker dispatch, shell/terminal execution, workspace modification, uncontrolled file access, SQLite ownership, direct model-issued `Run Task` consent, or execution-authorizing request/event. Read requests are resolved independently by Electron Main against canonical workspace, sensitive-file policy, external-provider consent where relevant and C02-D17 resource ceilings.
5. **Coding-task inbound requests (Main → Python):** May begin **only one specifically authorized task** for the newly launched coding child, with Main-generated identity, exact approved goal/workspace, C01 context where applicable, and the single-use C02-D4 Run Task authorization **validated and atomically consumed by Main before task launch**. Coding lifecycle controls (including cancel) remain subject to C03-D7 and are not authorized in detail by this decision.
6. **Coding-task outbound events (Python → Main):** May return task-associated progress, verified structured outputs, final `TaskOutcome`/failure, and diagnostics under the accepted task identity. Events must be derived from actual engine state and must not be confused with stderr logs or terminal output. Precise event schemas, ordering/replay and delivery guarantees still require implementation-contract specification under approved C03-D7/D8, notwithstanding the approved C03-D6 event-streaming architecture.
7. **No reverse privilege flow:** A coding child must not instruct Main to approve another task or mint a Run Task token; a discussion child must not tunnel execution through generic file-broker, model, event or diagnostic commands. The renderer remains an untrusted user-interface requester, never a capability authority.
8. **Deny by default at BOTH boundaries:** Electron Main validates each message against the allowed direction, assigned process category, connection/request state, message schema and authorization. The respective Python bridge also exposes only the corresponding category's allowable command handlers. Unknown, cross-category, wrong-direction, invalid-state or malformed actions are rejected deterministically; errors are not reinterpreted as fallbacks or successful work.
9. **Untrusted content is data:** An LLM's textual suggestion, repository text, a historical approved design decision, a user-visible button label, and a forgeable `proposal_id` inside JSONL do not grant capabilities. The C02-D4 Main-owned explicit UI confirmation and single-use binding remain mandatory for *every* engineering task.
10. **No Windows sandbox claim:** Process-level command allowlisting is an application-enforced capability boundary consistent with the owner-approved FFR-R03 Option A. It does not mean Python, as a same-user Windows process, is OS-restricted from all project file access; no such guarantee is claimed.

### Verification gates for later implementation

- A valid Discussion request can obtain an answer or broker-approved read excerpt, but cannot call `AgentOS`, invoke a coding action through a fabricated JSONL payload, or cause Main to launch a coding process.
- Cross-role, wrong-direction, unknown or spoofed command types and attempts to modify child identity or forged `READY` capability sets are rejected by Main; Python bridge handler tests also fail closed.
- A user-approved task, after atomic proposal consumption by Main, can be dispatched to exactly its own coding child; an approval from a different workspace, conversation, goal or stale proposal cannot be reused.
- Coding progress and outcomes remain tied to the running task; LLM-supplied messages and stderr must not fabricate a completed task or additional approvals.
- Malformed input, protocol parse errors and disallowed actions are auditable and do not cause speculative auto-execution or provider fallback.

**Boundary of approval:** C03-D4 fixes **strict category-specific capabilities and rejection behavior**, not exact command strings, exhaustive wire payload schema, cancellation semantics, multi-task scheduling policy, or Windows OS-level sandboxing. Those are downstream integration design decisions and acceptance tests. **No code implementation authorized.**

## 9. C03-D5 — APPROVED (2026-10-19): Concurrent discussion + single writer per workspace

**Owner decision: Option A — Concurrent Discussion + Single Writer per Workspace.** Option B (unrestricted concurrent writing tasks on the same project) was not chosen.

### Approved concurrency and workspace rules

1. **Keep discussion responsive.** The independently supervised Discussion Process may continue answering messages and handling permitted read-only project-inspection requests while an authorized coding task runs. Discussion does not acquire the coding process's authorization or gain direct file/terminal execution capability because a task is active.
2. **One active coding writer per canonical workspace.** Electron Main is the authority that associates tasks with canonical workspace identity and coordinates an exclusive, workspace-scoped coding-task execution/write lease. A second task for the same workspace cannot start coding while the first retains that lease. Neither user-supplied path spelling, symlink alias nor distinct renderer tab may bypass the same-workspace constraint.
3. **Other approved tasks wait.** A second separately approved coding task for that workspace remains queued/pending until the active task is conclusively finished and its lease can be safely released. Approval is not execution; an already consumed, task-bound Run Task proposal cannot be replayed to create a duplicate run. Queue ordering, limits, user cancellation of queued tasks, and restart persistence require detailed lifecycle and SQLite implementation contracts under approved C03-D7/D8.
4. **Coding tasks remain task-isolated.** Each dispatched approved task still gets its own supervised Python coding bridge process (C03-D1), its own task ID, handshake/readiness gate (C03-D3), and strict command boundary (C03-D4). A queued task does not hold an active Python coding bridge merely by being approved, unless a later reviewed design explicitly requires that.
5. **Concurrent projects are not an unconditional guarantee.** Jobs targeting different canonical workspaces may be eligible for parallel scheduling in a future implementation, subject to resource ceilings, machine load and the final scheduler/lock protocol. This approval does not promise unlimited parallelism or define numeric quotas.
6. **Read consistency is disclosed.** While coding changes files, discussion and read-only project inspection may encounter moving contents. Broker responses should be checked for source freshness where feasible; summaries and UI must distinguish observed snapshots from guaranteed current state. Do not assert a consistent workspace snapshot without evidence. Project reads that cannot safely establish boundaries or reasonable consistency may be delayed, rejected or marked stale, rather than accessing files outside the Main-owned broker.
7. **Completion and lock release are authoritative, not inferred.** Renderer navigation, LLM prose claiming task completion, diagnostic stderr, a missing heartbeat, or a bridge exit alone must not count as verified success or automatically prove it is safe for another writer to start. Electron Main reconciles process termination and task/lease state; abnormal exit leaves a distinguishable failed/unknown state requiring a documented recovery gate before releasing the workspace for new work. Detailed recovery, timeouts and shutdown behavior are still reserved for C03-D7/D8.
8. **No claim of OS-wide exclusivity.** The single-writer guarantee is coordinated **among Next Code-managed coding tasks** by Electron Main; external editors, Git operations, other applications or the user may still change the same working tree. This does not imply Windows filesystem locking, transactional source-code rollback or protection against out-of-band writes.

### Acceptance criteria for implementation specification

- A coding task approved for workspace W starts only after Main acquires W's lease; a second approved task on W stays pending, even across tabs and alternate workspace path spellings resolving to W.
- While the first coding task runs, discussion remains independently routable and can report project-read freshness limitations; it cannot dispatch a coding task itself.
- Only one **Next Code-managed** coding task at a time holds the active writer lease for canonical W; no second launch occurs because of repeated UI events, duplicate JSONL records or proposal replay.
- An authorized task for another workspace is evaluated against its own lease and global resource policy; no unlimited parallelism is assumed.
- Abnormal process exit/crash, stale state or uncertain lease ownership does not get misrepresented as task success; a safe reconciliation path is required before a queued writer can be released.

**Approval boundary:** C03-D5 approves concurrency policy and safety invariants, **not** exact queue persistence schema, lock implementation, reentrancy/timeout values, task cancel/restart semantics or protocol event ordering. Those remain in the C03-D6 event-streaming decision, the approved C03-D7–D8 lifecycle/persistence principles, and later implementation specifications. This decision does not authorize source changes.

## 10. C03-D6 — APPROVED (2026-10-19): Structured real-time event streaming

**Owner decision: Option A — Structured Real-Time Event Streaming.** Option B (Terminal-based progress as the primary activity interface) was not chosen. Events are routed over the approved C03-D2 JSONL channel from the supervised coding-task process to Electron Main, then exposed to the renderer through a narrow, validated Preload/IPC interface. The renderer never reads the Python process stdout directly.

### Approved behavior and authority boundaries

1. **Real events, not interpreted prose.** Coding progress and lifecycle signals should be structured, typed, associated with the real `task_id` and originating process instance, and derived from actual engine/worker instrumentation or verified outputs. Parsing narrative assistant text, stderr, or arbitrary Terminal lines to claim a worker started, a file changed or tests passed is prohibited. If the existing engine does not expose a granular lifecycle fact, the UI must not invent that event; implementation may require explicit instrumentation, separately reviewed.
2. **Illustrative event categories:** Task start/progress/finish or failure; agent/worker start/progress/finish *only when genuinely instrumented*; evidence-backed file-change reports; and test results with actual execution evidence. Example labels `TASK_STARTED`, `AGENT_STARTED`, `AGENT_PROGRESS`, `AGENT_COMPLETED`, `FILE_CHANGED`, `TEST_RESULT` and `TASK_COMPLETED` clarify UX expectations only. They are **not** a finalized canonical event enum or schema; event taxonomy and fields remain subject to the implementation contract.
3. **Correlated and validated.** Electron Main associates each incoming event with its supervised coding child and Main-authorized task, validates message envelope and allowed event category/payload, and rejects mismatched, malformed, duplicated or authority-spoofed records according to the eventual wire specification. An LLM-suggested event or an event claiming another task's identity cannot establish task truth.
4. **Truthful status and ordering.** The interface must be able to show ordered, comprehensible progress for a given task, including which agent actually produced a fact. A defined ordering/sequence strategy, deduplication boundary, timestamp provenance and out-of-order policy are required before implementation; merely receiving records in a particular renderer callback order is not proof of engine order. Do not promise total ordering across independent processes unless supported.
5. **Main-mediated, route-independent UI.** Electron Main keeps task status independent of conversation/route navigation. On navigation or renderer reload, the UI reconstructs known state from Main-authoritative task records and available event history; missing or not-yet-persisted events must be signalled as unavailable, never filled in with fabricated activity. The exact SQLite tables, retention period, replay cursor/ack protocol and reconnect guarantees belong to C03-D8 and the implementation contract.
6. **Explicit completion remains authoritative.** A stream of progress messages cannot complete a task. The final coding outcome and reconciled process/task lifecycle determine whether to show success, failure, cancellation or unknown outcome. A Python crash or truncated stream must not be rendered as successful completion, and no event may release a workspace writer lease without C03-D5/D7 reconciliation.
7. **Diagnostic separation.** stderr remains diagnostic-only, protocol stdout remains structured JSONL-only, and user-facing Terminal diagnostics are not the source of Mission Control state. Diagnostic excerpts must be bounded, treated as untrusted and not automatically reveal secrets or paths beyond the approved UI policy.
8. **Bounded streaming and failure behavior.** Event bursts, large payloads, subscriber lag, duplicate delivery, disconnects and task/process termination require bounded transport/buffering strategies. Exact backpressure limits, truncation semantics, persistence/retention, event-loss indicators and retransmission rules are intentionally **not fixed by D6**; they must be specified and tested before deployment.
9. **Respect frozen C-02 and application boundaries.** Discussion can report its own permitted analysis/inspection progress, but cannot spoof an engineering worker or issue executable task events. The desktop continues to use single-writer per workspace for coding tasks; an event never grants new execution authorization, file-read consent or OS-level privileges.

### Minimum acceptance evidence required before implementation approval

- Live, typed task progress can be displayed without interpreting arbitrary Terminal/stderr prose; fake worker/file/test events are rejected or explicitly unavailable if no trustworthy source exists.
- Events remain associated with the correct authorized task and child process during multiple in-flight operations, UI route changes, renderer reload and malformed/cross-role message attempts.
- Abnormal child exit, event loss, late/duplicate events or inability to replay full history produces an accurate incomplete/unknown state, **not** fabricated successful work.
- Completion display and workspace writer-lease release are checked against task lifecycle reconciliation and not triggered solely by a progress event.
- Final wire enum/schema, sequence and replay strategy, persistence scope and bounded resource policy receive their own verification gates in subsequent C03-D7/D8 and implementation documents.

**Approval boundary:** The user approved **source-grounded, structured, real-time events** for Agents Mission Control. This is an architectural/behavioral commitment, **not** an assertion that the current AgentOS already emits every illustrative event, not a guarantee of perfect event delivery, and not authorization to change source code.

## 11. C03-D7 — APPROVED (2026-10-19): Controlled cancellation and recovery

**Owner decision: Option A — Controlled Cancellation & Recovery.** Option B (immediate termination as the default Stop Task behavior) was not chosen. The approval concerns **Next Code-managed** coding-task child processes under Electron Main supervision; it does not imply atomic filesystem changes, guaranteed rollback or perfect control over external processes.

### Approved stop and failure contract

1. **Main alone authorizes task stop.** The user-facing `Stop Task` action reaches Electron Main through a typed Preload/IPC request. Main resolves the real `task_id`, the active coding-child identity and the current workspace writer lease; a discussion-model suggestion, forged Python message or renderer-provided PID cannot terminate an unrelated task. The coding child must not be able to grant a new execution approval by responding to a stop command.
2. **Two-stage stop.** Main first sends a typed, correlated, process-allowlisted cancellation request to the particular coding child. The coding bridge should stop scheduling **new** engineering steps and cooperate with the runtime to reach a safe interruption point, permitting a **finite bounded grace period** for active operations to complete or stop. 'Cancellation requested' does **not** mean 'canceled'; cancellation is a lifecycle request, not evidence of completion.
3. **Escalation on timeout/nonresponse.** If orderly cancellation cannot be confirmed within the bounded interval, Main may escalate to managed termination of the specific task child and identifiable/controllable descendants. The exact Windows process-tree termination mechanism, grace/kill deadlines and failure semantics must be specified and tested in the implementation contract. An OS command, child PID string or name alone must never be trusted as authoritative process identity.
4. **Preserve truthful outcomes.** Main differentiates `cancel_requested`, actual `canceled`, `failed` and **`unknown / needs_reconciliation`** from verified `completed`. An ordinary progress event, renderer disappearance, lack of heartbeat, truncated JSONL stream or child exit code in isolation cannot prove a task completed safely. Known task artifacts, observed final outcomes and diagnostic evidence are retained subject to subsequent C03-D8 persistence and retention policy. Do not report unverified tests or changes as successful.
5. **No automatic source rollback.** Canceling or killing a coding process may leave partial modifications, test-side effects, external commands or orphaned subprocesses. No transactional rollback, restoration of files, automatic Git reset or clean working-tree guarantee is made by D7. Main must report known vs unknown effects and, when relevant, ask the user to inspect/reconcile the working tree rather than silently overwriting it.
6. **Workspace writer lease is not blindly released.** A stopped, crashed or unreachable child requires Main to reconcile supervised process and descendant status, task state and known outstanding effects. Until safe release can be established, the canonical workspace remains blocked or marked recovery-required for a new Next Code-managed coding writer; no later queued task is launched merely because the UI says 'stopped'. Where an orphaned write-capable process cannot be excluded, preserve the conservative block rather than assume safety.
7. **Discussion independence.** A coding-task failure or cancellation does not by itself end the long-lived discussion process. Normal chat remains available, while project evidence gathered during concurrent writes must be labeled for possible staleness. A discussion message cannot issue the privileged cancel/kill command outside the Main-authorized UI control flow.
8. **Restart and crash behavior.** On abnormal child exit, app shutdown, Electron crash/relaunch or uncertain predecessor lifecycle, Main uses persisted records and observed OS process facts where possible to **reconcile** state, and presents uncertainty honestly. It must not silently relaunch a coding task, reenact an already-consumed Run Task proposal, replay a write, or show a past in-flight task as succeeded. Exact restart handling, persistence transactions, startup repair checks and explicit user recovery UX belong to C03-D8 and downstream implementation specifications.
9. **Scope of recovery.** 'Recovery' in D7 means safe accounting for what is known, preserving/correctly releasing workspace coordination, and offering explicit next-step choices as appropriate; it does **not** mean successful continuation from the exact previous instruction or automatic correction of files. No claim is made about preventing external programs or human editors from changing the same workspace.
10. **Unspecified operational parameters.** Timeout numbers, stop/cancel command name and wire payload, subprocess tracking on Windows, allowable grace behavior of individual tools, event taxonomy, SQLite tables and retention, final result/ack sequencing, and whether a user can cancel a queued task are deliberately deferred to the implementation/persistence specification. All timers and buffering must be finite and bounded; no default numerical values are invented by this decision.

### Minimum acceptance evidence before implementation authorization

- Clicking Stop Task for task A only targets Main's verified child/process group for A and cannot cancel task B via spoofed task ID/PID, replayed JSONL record or discussion reply.
- Graceful cancellation succeeds at a safe interruption point when the engine supports it; timeout escalates in a controlled manner and detects failure to confirm termination rather than claiming a clean stop.
- Killing Python during file activity does not falsely mark the task completed or guarantee rollback; Main preserves truthful partial/unknown result and protects the same-workspace writer lease pending reconciliation.
- Discussion remains usable while a coding task is being canceled; renderer navigation and reload do not independently end supervision.
- Child crash, Electron restart, orphaned/uncertain descendants and repeated Stop requests have explicit, tested outcomes; **no automatic re-execution of previously authorized tasks**.
- Per-message-type JSONL lifecycle commands/events, state transitions, persistence and Windows-specific process controls are specified and independently verified before coding authorization.

**Approval boundary:** C03-D7 fixes **two-stage controlled cancellation with conservative recovery**, not numerical timeout values, a guarantee of reversible file modifications, an automatic engine resume feature or exact storage schema. **NO SOURCE MODIFICATION OR IMPLEMENTATION AUTHORIZED.**

## 12. C03-D8 — APPROVED (2026-10-19): Structured SQLite + event history

**Owner decision: Option A — Structured SQLite + Event History.** The alternative, Option B (predominantly generic JSON event storage without structured relational constraints), was not chosen. This is a **logical persistence architecture**, not approval of a particular set of SQL tables or migrations.

### Approved persistence ownership and responsibilities

1. **One Main-owned desktop data authority.** Electron Main owns the local SQLite database, schema/migration lifecycle, authorization checks and all durable writes of Desktop conversation, proposal, task and presentation records. Neither React/Preload nor Python Discussion/Coding bridges acquire independent direct write authority to this desktop database. Python only submits validated, scoped data/events through the bridge and Main decides whether to record them.
2. **Structured logical records.** The desktop must be able to persist and relate: **Conversations** (canonical project/workspace binding), **Messages** (speaker, order and provenance), **Memory** (derived summaries with source links, candidate/approved decisions and evidence of explicit user confirmation), **Proposals** (exact proposed goal, workspace, conversation, expiry and single-use state), **Tasks** (authorization, workspace, lifecycle and final reconciled status), **Task Events** (source-grounded agent/task progress and associated identities), and **Recovery State** (uncertain tasks, workspace writer leases and reconciliation evidence). These are *logical groups*, not a mandated literal seven-table schema.
3. **Authoritative links and provenance.** Main must enforce the relationships among conversation, canonical workspace, user confirmation, consumed `proposal_id`, authorized `task_id`, supervised process and task events. Mere knowledge of an identifier in JSONL or a model response grants no permission. Approved decisions may only be persisted as approved when backed by clear, identifiable user-confirmation evidence under C-02/FFR-R02; generated summaries and inferred intentions stay lower trust.
4. **Atomic critical changes.** Updates that would otherwise create inconsistent authority must be transacted durably in SQLite, especially single-use Run Task proposal consumption plus corresponding task authorization/record creation; task state transitions, accepted terminal outcomes and writer-lease bookkeeping require consistent failure-aware persistence. Failure or retry must not issue a second coding execution from an already-consumed approval. Database transactions do *not* make the external Python process or filesystem modifications atomic.
5. **Source-grounded task-event history.** Main validates event origin, bridge/process category, authorized task identity, payload and monotonic/order metadata before accepting records for Mission Control. Stored event history supports reconstructing the **last known** UI state on route change, renderer reload or app reopen; it cannot create missing events or claim lossless delivery without supporting transport guarantees. Task completion and lease release remain governed by D5/D7 lifecycle reconciliation, never inferred from a convenient progress record alone.
6. **Conservative restart/recovery.** After abnormal Python exit or Electron restart, Main consults durable task, proposal and lease information plus observed process facts before deciding whether a coding writer can be released. Unverified active/canceled/completed statuses must surface as **unknown / needs_reconciliation**, with accurate evidence and next steps. Do not automatically resume/restart a coding task, duplicate consumed proposals, invent a clean working tree or silently release an uncertain lease.
7. **Keep engine state with the engine.** The agent runtime's internal execution traces, `.agent_os` artifacts, checkpoints, engineering files and authoritative `TaskOutcome` generation remain Python/AgentOS responsibilities. Desktop SQLite indexes and records *references or verified results* as needed; it does not replace or pretend to be the engine's checkpoint store. Consistency between local Desktop records and engine outputs must be specified and tested; it is not guaranteed by sharing a machine.
8. **Local-first; do not assume remote sync.** Conversation history, task state and event metadata are persisted locally under the user's desktop data boundary. External model-provider requests remain subject to the previously approved C-02 project-content consent and sensitive-data protections; C02/FFR-R01's universal outbound gate remains **owner-deferred**, not reintroduced by this storage decision. No cloud database or independent Python discussion DB is introduced.
9. **Resource, integrity and privacy limits remain required.** An append-heavy event stream requires bounded payloads, storage growth/retention and failure reporting; sensitive diagnostics must not be recorded indiscriminately. The exact migration strategy, DB file path, schema/indexes, WAL/transaction settings, eviction and backups, retention durations, time-based limits, encryption-at-rest choice, deduplication keys, sequence/cursor protocol and crash repair UX are **NOT fixed** by approval of Option A. They must be resolved and tested before implementation authorization.

### Minimum acceptance evidence before implementation authorization

- Reopen the app and recover the same project conversations, verified decisions, proposal authorization history, tasks and last known source-grounded agent events without leaking records across workspaces or conversations.
- A duplicate/replayed `Run Task` confirmation or concurrent approval race cannot consume the same proposal twice or launch a duplicate engineering process.
- Unsupported/malformed/cross-role task events do not become trusted records or fabricate completed worker/test/file states. UI navigation/restart reconstructs only observed, persistently verified state and clearly identifies gaps.
- Abrupt Python or Electron crash, truncated streams, SQLite transaction failure and uncertain descendant processes preserve truthful `unknown / needs_reconciliation` task state and conservative writer-lease behavior.
- Python Discussion Service and React cannot bypass Main to mutate SQLite; Python engine checkpoints remain separate. Persistence resource/security failures have bounded, explicit behavior.

**Approval boundary:** C03-D8 approves **structured local SQLite persistence owned by Electron Main with source-grounded event history and transactional authority records**. It does not freeze specific SQL DDL, exactly seven tables, absolute storage limits, an event replay guarantee, a cloud backend or Windows-level sandboxing. **NO SOURCE MODIFICATION OR IMPLEMENTATION AUTHORIZED.**

## 13. C03-D9 — APPROVED (2026-10-19): Central Model Registry + ModelGateway

**Owner decision: Option A — Central Model Registry + ModelGateway.** Option B (Python-only, opaque model selection without an authoritative Desktop selection/validation contract) was not chosen. The registry is a **logical local source of truth for model/provider configuration**, not a remote model service or a requirement for a separate database.

### Approved model selection and routing contract

1. **Explicit user selection for discussion.** The Desktop offers only supported/configured models for discussion, identified by unambiguous provider and model references. The discussion model selection is independently configurable from coding-worker/architect routes. Selection does not itself grant permission to execute a coding task or share protected project files.
2. **Electron Main validates the selection.** Before forwarding a discussion request, Main verifies that the chosen provider/model pair is registered and allowed for the requested discussion capability. The request carries an explicit, scoped model/provider reference through the versioned JSONL envelope; the renderer's raw string alone is never authoritative.
3. **Python ModelGateway performs actual model invocation.** The Discussion Service calls the Python `ModelGateway` with the validated requested route, rather than directly wiring the renderer to provider SDKs. The implementation must reconcile Main's registry with effective Python provider configuration and capability validation; a stale/mismatched/unsupported mapping fails explicitly rather than silently using a different model.
4. **No silent fallback.** If the selected model, provider or credentials are missing, incompatible, unavailable or fail, Next Code must report a distinguishable error. It cannot substitute another provider/model without an explicit subsequent user choice. Worker-specific routing rules remain separate, and this decision does not redefine AgentOS task authorization.
5. **Provider credentials remain private.** API keys and other credentials are not embedded in chat records, renderer-accessible IPC, approval/proposal payloads, progress events, or protocol diagnostics. The precise credential storage/loading mechanism and safe configuration changes require a later reviewed implementation contract; this decision does not pretend storage encryption exists.
6. **Preserve external-content consent decisions.** Main continues to enforce the previously approved C02-D15 project/provider consent and C02-D16 sensitive-file protections for brokered project evidence. FFR-R01's proposed *universal outbound verification gate* remains expressly **deferred by owner**; C03-D9 does not silently add it or claim that all outbound data has been screened.
7. **Traceable usage and failure.** A discussion response/error must be attributable to the *effective* provider and model used, and available actual token-usage/accounting data must be associated with the request. Cost figures may be displayed only when supported by reliable model pricing/usage data; unknown costs must not be fabricated. User-visible error messages should not leak secrets.
8. **Local-first and provider-neutral.** The registry may describe compatible local or external providers supported by the eventual implementation; it does not presume that all known third-party providers are already integrated, require an always-online server, or introduce a cloud data store.

### Compatibility note and implementation gates

- The existing Python `ModelGateway` exposes model-profile routes with fixed default mappings; this approval **does not claim** that arbitrary per-request provider/model selection already works. Implementation contract work must specify the new registry-to-gateway interface and verify provider identity end-to-end before any source change is authorized.
- Acceptance checks will include: explicit selection honored; unsupported model rejected; provider/model mismatch rejected; provider failure does not trigger hidden fallback; discussion/coding model selection is independent; credentials excluded from messages/logs; C02-D15 brokered project-content consent preserved; and effective usage identity recorded without invented token/cost numbers.
- Precise registry persistence schema, provider enumeration/discovery, credentials strategy, pricing/cost calculations, retry/timeout values and dynamic model refresh remain **OPEN implementation details**. Do not expand this approval into silent automatic model switching or a universal outbound data gate.

**Approval boundary:** Architectural decision only. **NO SOURCE MODIFICATION OR IMPLEMENTATION AUTHORIZED.**

## 14. C03-D10 — APPROVED (2026-10-19): On-Demand Read Broker for staged project inspection

**Owner decision: Option A — On-Demand Read Broker.** Option B (a mandatory precomputed local project index as the primary initial integration) was **not** chosen. This is the **integration implementation direction** for the already frozen C02-D10 through C02-D17 architecture; it does not revise those decisions or permit direct Python filesystem reading.

### Approved progressive read sequence

1. **Scoped structural discovery.** When a discussion needs project information, the Discussion Service requests a bounded directory/file *structure listing* from Electron Main over a typed, capability-allowlisted JSONL request. Main resolves the conversation-bound, canonical authorized workspace and returns only eligible structural metadata. Listing is not content authorization; neither enumeration nor file names imply that any file contents have been examined. Discovery must remain bounded and can be expanded through later requests.
2. **Intelligent, staged selection.** Python may use the returned structure and the user's question to select relevant files. Python's choices are *requests*, never permissions. Main retains sole authority for actual content access and determines eligible files, scope, sensitive exclusions and bounds before returning excerpts. No full-project eager dump, mandatory background scan, or silent content transmission follows from listing.
3. **Read-only evidence requests.** Python requests specific files, ranges or bounded excerpts from Main. Main verifies that each resolved file remains within the authorized canonical workspace; denies paths that escape via symlinks, Windows junctions/reparse points, traversal, inconsistent resolution or unsafe/special file types, and applies frozen C02-D12/D16 sensitive path/content protections. If content cannot be safely released, Main refuses or reliably redacts bounded parts; uncertain cases fail closed for that request. The broker does **not** run code, execute Terminal commands, mutate the project, or delegate file access to a Python agent.
4. **Bounded resource handling.** Main applies mandatory byte/entry/time/per-request and batch resource ceilings under C02-D17; effective limits are configured and later measured rather than invented in this architectural approval. Oversized, binary, unreadable or otherwise excluded files produce explicit bounded outcomes instead of unlimited reads. Python may request further finite batches, with each batch separately validated. Extension alone must not arbitrarily exclude otherwise safe text files, consistent with C02-D12 Option B.
5. **Evidence-aware analysis and coverage.** The discussion uses only actual authorized returned excerpts as read evidence. Main can report actual discovered, successfully read, rejected and not-reviewed/unknown portions, including truncated excerpts and budget exhaustion. Progress status is factual and phase-based (C02-D14); it does **not** imply full coverage, fabricate a completion percentage, treat a listing as a full read, or claim that excluded files were analyzed.
6. **Concurrent workspace changes.** Under C03-D5, another supervised coding process may be modifying the same workspace while discussion remains active. Broker replies must distinguish observed file versions/freshness where verifiable from unknown or changed evidence; stale or inconsistent readings are not asserted to be a single atomic project snapshot. Changes or failed validations can require a new read and visible uncertainty. The precise snapshot/stat/retry strategy is deferred to implementation-contract work.
7. **Local read is not external upload authorization.** Obtaining project bytes from the Main broker does not itself permit sending them to a third-party LLM. The existing **C02-D15** project/provider-specific prior consent and **C02-D16** sensitive-content policy remain binding for protected project evidence when sharing externally. Importantly, owner-deferred **FFR-R01** (a universal check before *all* LLM invocations) is **not** reintroduced by this decision. Main and Python must retain clear provenance for what evidence is locally read versus what is provided to a selected provider, without falsely claiming universal outbound enforcement.
8. **Typed request/response boundaries.** Discovery and read exchanges must use the approved versioned JSONL envelope, request correlation, process-category allowlists, scoped identities and input validation (C03-D2–D4). Client-provided paths, file IDs or conversation IDs are not authority. Precise operation names, schema of listing/excerpt/denial records, time-of-check/time-of-use strategy, resource settings, caching policy and consent UI wiring remain for the implementation contract.

### Verification gates for C03-D10 implementation contract

- Discussion cannot directly read project files, mutate them, invoke arbitrary terminal commands or borrow a coding task's capabilities through the public Discussion bridge protocol. This is **application-level capability separation** per frozen FFR-R03, not a claim that Windows has sandboxed Python at the OS level.
- Deny project-boundary escapes, traversal, symlink/junction/reparse-point bypasses, secrets and sensitive paths/content, unsafe file kinds, oversized responses, malformed/unauthorized read requests and cross-conversation/workspace access; apply constrained fail-closed behavior without dropping otherwise valid broad-text eligibility.
- Repeated staged reads provide bounded, correlated evidence with exact readable/missing/rejected/partial statuses. An index/listing must not be mistaken for inspected content; reporting remains accurate after partial failures and renderer navigation.
- External sharing of brokered project contents preserves the already approved **project/provider consent**. No implementation can treat a local project read as blanket permission to transmit. Deferred FFR-R01 remains explicitly deferred.
- Inspection during an active coding write reports freshness limits; does not silently present multiple inconsistent file reads as a verified atomic snapshot. Scope/size limits are enforced at Main even if Python asks for larger amounts.

**Approval boundary:** C03-D10 approves the **on-demand Main-owned progressive discovery/read broker**, not an eager index, whole-repository content preload, direct Python file read, exact JSONL request schema, default size numbers, retrieval ranking algorithm, atomic snapshot guarantee or implementation authorization. **NO SOURCE MODIFICATION OR IMPLEMENTATION AUTHORIZED.**

## 15. C03-D11 — APPROVED (2026-10-19): Selective Context Retrieval for Desktop discussion memory

**Owner decision: Option A — Selective Context Retrieval.** Option B (automatically forwarding full conversation history to Python for each turn) was **not** chosen. This integrates the frozen three-layer C-02 memory design, but does not replace the separate, bounded C-01 engineering `ConversationContext` contract.

### Approved memory assembly and responsibility boundaries

1. **One durable source of truth.** Electron Main owns the authoritative SQLite conversation transcript, persisted message order/roles/IDs, conversation-to-canonical-workspace identity, derived historical summaries, decision records and approval evidence. The Discussion Process may consume the explicitly supplied, bounded context transiently, but must not create or manage a second persistent conversation database, rewrite source messages or grant itself retrieval authority.
2. **Selective three-layer retrieval.** For an incoming discussion turn, Main scopes retrieval to the authoritative conversation and project, selecting (a) relevant **recent messages** in original order with their actual source IDs; (b) historical **derived summaries** linked to underlying source ranges, revision/validity and lower-trust status; and (c) **important decisions** with their actual statuses, source links and explicit user-approval evidence. Selection is relevance- and budget-aware rather than an automatic replay of all conversation text. Inclusion of engineering task outcomes, if later specified, must respect verified source identity and be advisory only.
3. **Preserve provenance and precedence.** Original messages remain authoritative. Historical summaries, model output, repository-file text and decision candidates are lower-trust information, never a substitute for current user instructions or verified engine output. Main shall not mix histories across conversations/workspaces, silently turn derived descriptions into verified facts, or treat an archived design choice as a permission to use tools, edit files or run engineering tasks.
4. **Model-assisted summarization, Main-controlled persistence.** The Python Discussion Service can produce proposed compact summaries and candidate decision extractions for a Main-selected, source-identified history revision. Main validates that source message IDs, ranges, revisions and workspace/conversation ownership match SQLite before saving derived data. Validation provides traceability, **not** proof that every model paraphrase is semantically correct. Original messages are retained and versioned derived material must not silently overwrite their evidence.
5. **Only attributable explicit user approval confirms decisions.** Candidates remain `CANDIDATE`/`UNCONFIRMED` absent a genuine, clearly attributable user confirmation linked to the exact pending decision identity/content/revision. A direct, unambiguous reply to one pending choice can suffice without another modal, per frozen C02 FFR-R02. Ambiguous replies, conflicting candidates, stale revisions or LLM claims of consent do not produce `USER_APPROVED`. Reversals and supersession retain provenance rather than erasing history. **Even a confirmed historical design decision is not a Run Task execution grant**: C02-D4 single-use, goal/workspace/conversation-bound explicit task authorization still governs.
6. **Selected-model context pressure, not a fixed message count.** Main assesses the bounded context against the real selected discussion provider/model route (C02-D8, C02-D9, C03-D9) with room reserved for current user input, applicable system instructions and answer output. If older history presses on the budget, Main may request source-scoped compaction through Discussion Service, validate references/revisions and persist a derived version. If the estimate is uncertain or compaction fails, reduce optional older context conservatively or return a bounded explicit error; preserve original records and never silently overflow, change providers or invoke AgentOS.
7. **Bounded, correlated request/response.** Selected memory crosses the Main/Python boundary solely through the versioned, typed, correlated JSONL protocol (C03-D2–D4) associated with the correct live discussion process and conversation, not renderer-controlled arbitrary SQLite queries or LLM-provided file paths. Source IDs, revision identifiers and statuses must be independently validated by Main. Precise schemas, serialization, matching/relevance heuristics and performance budgets remain to be reviewed separately.
8. **C-01 remains a distinct engineering-task advisory context.** The C-01 `ConversationContext` for an *explicitly approved* coding task is assembled independently under its frozen constraints (up to three prior TaskOutcomes, six recent messages, five advisory preferences, 3,000 rendered characters). Those caps are **not** discussion memory limits, and no general SQLite discussion summary is automatically injected wholesale into AgentOS. Any future mapping must respect Main's execution permission, C-01 validation, provenance and lower-trust boundary.
9. **Failure integrity and lifecycle.** Missing history, malformed model summaries, nonexistent/foreign/stale source references, model/provider failure, process crash or a renderer route change must not forge a decision, corrupt the transcript, dispatch a coding task, or claim successful compaction. Main retains the last valid authoritative conversation records and can provide a clearly bounded degraded context or error. Main-owned SQLite updates must be validated and transactional where status/source bindings change; exact retry/timeouts are reserved for C03-D12.

### Concrete verification requirements for future implementation

- Retrieve only records scoped to the correct persisted conversation and canonical workspace; reject forged, missing, stale or cross-thread IDs and untrusted injected instructions masquerading as approvals.
- Persist recent messages exactly once per accepted message identity; retain original source messages after summarization. Summaries and decision candidates must carry resolvable provenance and revision, with rejected validation causing no authoritative promotion.
- Test a clear single-option owner confirmation versus ambiguous/multiple/stale/LLM-invented confirmations; only the attributable clear one may become approved. Approved discussion decisions never cause Python coding-task launch.
- Rebuild a bounded context after restart or provider change without changing the selected model silently; handle budget pressure, compaction failures and provider token-estimate uncertainty honestly.
- Demonstrate that a long discussion context is **not** accidentally truncated with C-01's fixed engineering `ConversationContext` limits, and that no cross-task/role instruction can bypass Run Task.
- Check UI navigation and concurrent workspace modifications do not silently rewrite SQLite memory or misrepresent derived/source evidence as atomic up-to-date project state.

**Approval scope:** C03-D11 approves **selective, Main-owned three-layer discussion memory retrieval, pressure-based derived summarization and source-confirmed decision lifecycle**, not exact SQL tables, retrieval ranking, thresholds, tokenizer strategy, summary prompts, long-term retention/deletion policy, retry algorithm, new C-01 limits or implementation authorization. The frozen C02-D5–D8 and FFR-R02 take precedence wherever a detail is still open. **NO SOURCE MODIFICATION OR IMPLEMENTATION AUTHORIZED.**

## 16. C03-D12 — APPROVED (2026-10-19): Controlled Retry & Error Recovery

**Owner decision: Option A — Controlled Retry & Error Recovery.** Option B (automatic recovery/re-execution everywhere) was not selected.

### Approved failure and retry boundaries

1. **Distinguish failure domains.** Electron Main and the relevant Python bridge must distinguish at least transient LLM/provider errors, provider rejection/unavailability, LLM timeout, interrupted or partially delivered response, bridge protocol/handshake failure, bridge process crash, and interrupted or uncertain coding-task lifecycle. An absent response, broken pipe or missed event is **not** proof that the provider did not process a request or that a coding task did not modify files.
2. **Limited retry only for eligible discussion/LLM requests.** A transient discussion LLM failure may trigger a *bounded*, controlled retry under the same validated conversation/request identity and selected model/provider, subject to finite retry count, delay, timeout and cancellation budgets. Permanent errors (e.g. invalid credentials, invalid model, unsupported configuration), validation failures, revoked consent or policy denials must not be treated as retryable. Exact numeric caps, error taxonomy and backoff scheduling are reserved for the implementation contract.
3. **Preserve selection and consent.** No retry may silently switch the user-selected provider or model, route to a different endpoint, exceed a granted project/provider data-sharing scope, expand file-read permissions, or convert discussion into an engineering execution. If a request cannot proceed under the chosen route, show an explicit error and let the user decide what to do next. C02-D15/D16 protections remain in force; the owner's explicit FFR-R01 universal outbound-gate deferral remains documented, **not silently reversed**.
4. **Stable identities, no duplicate authoritative effects.** Retried requests remain logically associated with their originating conversation and request; Main rejects duplicate/late final responses and does not duplicate persisted user messages, assistant results, approved decisions, proposals or task authorization because of a retry. Retry-attempt tracing may use distinct attempt identities while retaining the original correlation, to be defined in the wire schema. A transport retry is **not** a new user confirmation or a new single-use Run Task proposal.
5. **No exactly-once provider claim.** An uncertain timeout or network failure can occur after a remote provider has accepted or billed a request. Repeating the LLM call may incur additional cost or create an alternative generated answer; JSONL correlation and local SQLite deduplication do not guarantee external exactly-once invocation or exactly-once billing. A partial streamed answer remains partial and must not be presented as a completed verified response; treatment of partial output/retry replacement remains an explicit UI/protocol design detail.
6. **Engineering tasks are not globally retried.** On LLM/provider failure *inside a coding task*, or on coding bridge crash/disconnection, Main **must not automatically redispatch or restart the entire AgentOS engineering task**. First reconcile the supervised process and descendants, the engine's actual checkpoint/task evidence, the known file changes, the persisted task state and the canonical workspace's writer lease under C03-D5/D7/D8. Mark unresolved cases as `UNKNOWN`/needs-reconciliation rather than fabricate success/failure or release the writer lease prematurely. The internal engine may have its own validated step-level recovery semantics, but this decision grants **no new authority** to repeat a whole coding execution.
7. **Surface understandable, truthful recovery state.** The UI should distinguish such conditions as `Connection lost`, `Retrying request`, `Provider unavailable`, `Task state unknown`, and clearly reported partial results. Renderer navigation alone does not terminate a Python process; status is reconstructed from validated Main-owned state rather than guessed from an interrupted display stream. When an automatic safe retry is not possible or exhausts its budget, offer a user-controlled next action without inventing restored context or recovered files.
8. **Bounded process recovery without task escalation.** Reconnecting/restarting a *discussion* bridge after it fails is permitted under the separate process-topology and readiness decisions (C03-D1/D3), but requests must be revalidated against the surviving Main-owned records and current permissions. A failed task bridge does not receive this automatic task-replay policy. If handshake, framing or correlation is invalid, reject the response and fail safely instead of replaying authoritative commands.

### Required verification before implementation authorization

- Simulate transient LLM timeout, disconnection after provider acceptance, rate-limit or temporary unavailability, permanent invalid-key/model failures, interrupted partial output and exhausted finite retries; verify **no silent provider/model fallback**, no infinite retry loop and no assertion of free or exactly-once remote execution.
- Exercise duplicate/late replies and repeated requests to verify at most one accepted durable assistant result or source-confirmed decision transition per validated logical completion. Deduplication of local effects must not masquerade as certainty about remote provider billing.
- Inject coding-task process crashes and ambiguous completion after file changes, including surviving/uncertain subprocesses. Verify the running task is **not** automatically launched again; lease release and any new same-workspace task remain blocked until C03-D7 reconciliation can establish safety.
- Verify failure messages and retry state events pass the C03-D2/D4 allowed, correlated and versioned JSONL boundary; malformed/unknown events never cause a task to be marked successful.
- Verify user cancellation, app navigation, reopened UI and recovered discussion sessions preserve persisted message identity, data-sharing limits and conservative last-known task state.

**Approval scope:** C03-D12 approves bounded retry for eligible **discussion LLM requests**, explicit error and uncertainty reporting, local deduplication, and **no automatic whole-task re-execution**. It does **not** freeze retry counts, delays, numeric timeouts, exact error codes/JSONL payloads, streaming chunk semantics, automatic rollback, Windows isolation, provider-level exactly-once guarantees or implementation permission. **NO SOURCE MODIFICATION OR IMPLEMENTATION AUTHORIZED.**

## 17. C03-D13 — APPROVED (2026-10-19): Boundary Validation

**Owner decision: Option A — Boundary Validation.** Option B (checking only basic JSON validity and recognized command names while delegating all other checks implicitly) was not selected. This is **bounded integration hygiene**, not an approval for an expanded universal LLM outbound-security gateway.

### Approved cross-boundary rules

1. **Electron Main validates every untrusted boundary.** Preload/renderer IPC requests, Python JSONL requests/replies/events, user-supplied project references and stored authorization references must be checked for allowed message type, schema, source process category, current handshake state, associated conversation/task/request identities, effective workspace authorization and applicable consent. Treat LLM-generated text, Python requests and renderer IDs as data, never as execution permissions. Keep C03-D2/D3/D4 strict framing, version/identity rules and command allowlists.
2. **Python bridge validates incoming messages before dispatch.** Reject malformed JSON, non-object frames, unsupported versions, unknown/unexpected command types, invalid payloads, disallowed commands for that process, invalid request state and broken correlations. A Discussion Process cannot promote a suggested task, acquire a coding-task command, invoke AgentOS, run terminal commands or bypass the Electron Main read broker. Validation in one component never replaces validation in the other.
3. **Finite, measurable resource boundaries.** Apply enforceable upper bounds to an individual JSONL record and payload, bounded in-memory buffering, queue depth and pending requests, processing/initialization/response time and cumulative transfer/read limits as appropriate for the message class. Excessive input must be rejected or aborted with a clear, non-success error; do not indefinitely buffer a line with no newline or silently truncate a frame and treat it as valid. The exact numeric thresholds, throughput/backpressure behavior and error codes belong to the implementation specification and measured tests, not this architectural decision.
4. **Protocol stdout is not a terminal/log stream.** A bridge's stdout must contain only well-formed, allowed protocol records; application debug text, library prints, subprocess output and tracebacks belong on segregated diagnostic channels (normally stderr or supervised task logs). Stderr text never acts as a protocol event or durable task success evidence. Real coding-engine stdout contamination remains an implementation risk requiring interception/redirect-and-test, not a solved capability.
5. **Error results cannot elevate authority.** On malformed, oversized, duplicate, uncorrelated or unsupported events, fail conservatively: never issue a Run Task authorization, mark a task as completed, fabricate a successful file read, persist an unapproved decision or free a workspace writer lease merely because communication failed. Correlate an error to the known request when safe; untrusted process failure may require a process-level error and reconciliation under C03-D7/D12.
6. **Keep secrets out of application diagnostics.** API keys, auth tokens and known sensitive file content must not intentionally enter chat or task-event logs, JSONL diagnostic payloads, error messages or tracebacks. Use structured error codes and minimize/redact error details where feasible. For project evidence, preserve the C02-D11/D12/D15/D16/D17 rules: Main-owned scoped file broker, broadly eligible safe text, bounded secret-content checks, external-provider consent per project/provider, and read budget caps. No automated secret detector is claimed infallible.
7. **Preserve the FFR-R01 owner disposition.** The owner expressly **deferred** a single universal outbound screening/authorization gateway for *every* LLM call until operational testing. C03-D13 does not silently reinstate it or require universal interception of all external LLM requests. Previously frozen scoped project-content sharing consent (C02-D15) and sensitive-file safeguards (C02-D16) **remain binding**; neither is deleted by the deferral. Any broader provider egress policy must be separately proposed and approved later.
8. **No Windows sandbox claim.** C02 FFR-R03 selected application-level separation for initial Windows deployment. Boundary validation and capability allowlists do not amount to OS-enforced privilege isolation, immunity to a compromised Python process or a guarantee that providers cannot access data the application transmits.

### Required acceptance evidence before implementation authorization

- Negative-frame tests for truncated/non-UTF8/non-object JSONL, unsupported `version`, unknown `type`/`action`, wrong types, missing/duplicate IDs, stale or mis-correlated replies, untrusted process type and not-ready handshake state. None yields a successful task/event/proposal transition.
- Fuzz/adversarial-size tests for overlong lines without terminators, oversized payloads, request/queue bursts, stalled readers and bounded memory; test clean error handling without uncontrolled process/renderer lockups.
- Test both direction-specific allowlists and IPC: a forged Discussion request or renderer ID cannot directly call AgentOS, change the workspace, acquire a write lease, read outside the Main broker or consume another proposal.
- Verify real Python provider/engine initialization, exceptions, worker/subprocess output and terminal diagnostics cannot corrupt protocol stdout. Diagnostic noise must not be parsed into verified Mission Control events.
- Verify logs and errors do not knowingly serialize configured API keys or sample sensitive content. Check refusal paths for denied project files, revoked external-project-sharing permission and exceeded read budgets without pretending comprehensive secret detection.
- On invalid/oversized frames during a running coding task, verify C03-D7/D8/D12 conservative task-state reconciliation and workspace writer-lease handling; ensure unknown outcomes remain unknown rather than reported complete.

**Approval scope:** C03-D13 approves **validated and resource-bounded IPC/JSONL boundaries, capability checks and diagnostic hygiene**. It does **not** set specific byte/time/queue caps, freeze final wire schemas, promise perfect secret identification, mandate universal outbound LLM filtering, add an OS sandbox or authorize source changes. **NO SOURCE MODIFICATION OR IMPLEMENTATION AUTHORIZED.**

## 18. C03-D14 — APPROVED (2026-10-19): Bundled Python Sidecar for Windows distribution

**Owner decision: Option A — Bundled Python Sidecar.** Option B (first-run extraction of a shipped runtime into a separate local directory) was not chosen as the primary distribution design. This decision specifies a **future packaging integration direction**, not permission to begin packaging or a claim that a working installer already exists.

### Approved development-versus-distribution boundary

1. **During initial development, preserve NCD-02/A-06 exactly.** Electron Main uses an already installed, explicitly configured and validated **Python 3.11+ environment**, the locally checked-out Next Code agent repository and the existing supervised private stdio/JSONL bridge. Do **not** require a bundled or self-extracting Python runtime as a precondition for completing the first local Desktop integration.
2. **For the eventual user-distributed Windows build, ship a compatible Python sidecar.** The application distribution will include the Python interpreter/runtime, the supported Next Code agent engine/bridge and required dependencies, so an end user is **not required to separately install/configure Python**. This describes a bundle alongside the desktop application's runtime resources; it does **not** mandate a particular executable-freezing technology, installer vendor, runtime layout or internal binary structure.
3. **Electron Main is the runtime launcher and supervisor.** At application startup/first bridge need, Main resolves the trusted, app-managed runtime, checks existence, compatibility and required bridge entrypoints, then spawns the discussion or authorized task child as defined by C03-D1–D4. Development interpreter paths must not silently replace the packaged production runtime; the Renderer cannot supply executable paths or invoke an unrestricted shell.
4. **Maintain distinct process categories.** Both the reusable Discussion Process and per-authorized-coding-task process use the packaged bridge/runtime and their dedicated stdout JSONL/stderr diagnostics. Bundling does not elevate Discussion permissions, bypass Run Task approval, change the single-writer workspace policy, or allow automatic execution during initial app startup.
5. **Missing/incompatible/corrupted runtime fails visibly and safely.** If the managed runtime or agent dependencies fail validation or the C03-D3 handshake, report an actionable error without dispatching tasks, fabricating readiness, silently switching to an unrelated system Python, or treating an unsuccessful child exit as a completed task. Packaging integrity and recovery semantics must be tested; no claim of tamper-proof packaging or OS-level isolation is made.
6. **Windows-only distribution target in v1.** Verify installation, first launch, repeated launch, project selection, Discussion readiness, explicitly authorized task execution, progress/stderr separation, cancellation, missing-runtime errors and clean uninstall/update effects on local SQLite/user data on a **clean Windows machine without preinstalled Python**. Model API network access and user-configured provider credentials remain separate from Python-runtime bundling. Local inference/offline support is subject to the selected provider/model and is not guaranteed by D14.
7. **Do not hide or reopen NCD-02's deferral.** NCD-02/A-06 froze the *development-first* path and deferred technical bundling choices to later integration/implementation planning. C03-D14 newly records the owner's high-level future choice of a bundled sidecar; **final bundling toolchain, dependency/license audit, signatures and code signing, version pinning, auto-update, directory/sandbox policies, executable permissions and clean-machine packaging validation remain to be defined and authorized in the downstream NCD-04 packaging/implementation contract**. A prior frozen document is not amended by this draft. Any actual normative inconsistency discovered during FFR must be explicitly reconciled before C-03 freeze.
8. **No first-run extraction requirement.** A first-run extraction scheme is not the selected main architecture. Incidental installer extraction into normal installed application resources is not forbidden; this decision rejects requiring the app itself to create a separate first-run managed Python environment by default. Runtime relocation, writable runtime assets, local secrets and provider configuration need later explicit deployment design.

### Required acceptance evidence before Windows distribution

- On a clean supported Windows machine **without a separate Python install**, installation and a bundled Python bridge launch succeed; failure modes produce actionable, non-success errors.
- Both bridge types perform version/type compatible handshake, preserve allowlists, maintain stdout JSONL cleanliness and show independent coding-task cancellation/unknown outcome behavior.
- With development mode explicitly configured, the app launches the configured local Python 3.11+ and local engine checkout; in distribution mode it does not silently substitute a different interpreter or provider route.
- Packaging/runtime layout, manifests, executable integrity, dependency/licensing obligations, updates and secrets handling are documented, independently reviewed and tested before claiming a release-ready installer.
- Installer/update/uninstall tests demonstrate predictable handling of persisted Main-owned SQLite conversations and task records; incomplete tasks are reconciled conservatively after app restart.

**Approval boundary:** C03-D14 approves **Windows bundled Python sidecar as a later distribution strategy**, while retaining **configured local Python during development**. It does **not** select a freezer/installer, promise an already-tested standalone executable, mandate initial-use extraction, amend NCD-02, or authorize implementation or source changes. **ARCHITECTURE FROZEN; NO CODE AUTHORIZED.**

## 19. Decision log

| Decision | Status | Exact owner choice |
|---|---|---|
| C03-D1 | **APPROVED — 2026-10-19** | Option A: restartable discussion Python process + separate supervised Python process per expressly approved coding task; application-level capability split; no implementation authorization. |
| C03-D2 | **APPROVED — 2026-10-19** | Option A: versioned, typed JSONL envelope with unique message ID, explicit correlation, type and validated payload; precise per-type wire schemas and limits remain for subsequent integration specification. |
| C03-D3 | **APPROVED — 2026-10-19** | Option A: explicit per-process readiness handshake with compatible version/type validation, finite initialization deadline, request gating and fail-closed startup; exact wire schema and timeout values deferred to implementation contract. |
| C03-D4 | **APPROVED — 2026-10-19** | Option A: strict process-category command/event allowlists with validation on both Electron Main and Python bridge; discussion cannot execute tasks, run tools or grant approvals. |
| C03-D5 | **APPROVED — 2026-10-19** | Option A: conversation stays active during coding; Electron Main coordinates one active coding writer per canonical workspace; further same-workspace tasks wait; reads disclose freshness uncertainty; no OS-wide exclusivity or rollback promise. |
| C03-D6 | **APPROVED — 2026-10-19** | Option A: source-grounded, typed real-time task/agent progress over JSONL via Electron Main to UI; no fabricated worker/file/test states, with ordering and replay/persistence specifics pending. |
| C03-D7 | **APPROVED — 2026-10-19** | Option A: Main-authorized two-stage cancellation (bounded cooperative stop then controlled escalation), conservative process/lease reconciliation, truthful partial/unknown outcomes, no promised rollback or silent task restart. |
| C03-D8 | **APPROVED — 2026-10-19** | Option A: Main-owned, structured local SQLite for conversation/messages/memory/proposals/tasks/source-grounded events/recovery; transactional proposal use and truthful task state; exact schema/limits deferred. |
| C03-D9 | **APPROVED — 2026-10-19** | Option A: Main-validated logical model registry and explicit provider/model routes via Python ModelGateway; independent discussion vs coding selection, no silent fallback; exact dynamic registry/API details deferred. |
| C03-D10 | **APPROVED — 2026-10-19** | Option A: Main-owned on-demand structural discovery and bounded, selectively authorized read-only excerpts; source-grounded coverage; C02 text eligibility, consent, sensitive protections and resource bounds preserved; no mandatory precomputed index. |
| C03-D11 | **APPROVED — 2026-10-19** | Option A: Electron Main selects scoped, bounded recent messages, provenance-linked derived summaries and source-confirmed decisions from SQLite for Python discussion; compaction only under selected-model budget pressure; C-01 engineering context remains separate. |
| C03-D12 | **APPROVED — 2026-10-19** | Option A: bounded eligible discussion LLM retries and truthful errors; same selected model/provider and scope, deduplicated local records, no exactly-once remote/billing promise and no automatic whole coding-task redispatch. |
| C03-D13 | **APPROVED — 2026-10-19** | Option A: validate typed JSONL/IPC both sides; per-process command and identity gates, finite resource ceilings, stdout protocol-only and secret-conscious diagnostics; existing scoped consent, FFR-R01 deferral and Windows non-sandboxing preserved. |
| C03-D14 | **APPROVED — 2026-10-19** | Option A: Windows bundled Python sidecar for eventual user distribution, no end-user Python installation; keep local Python 3.11+ and existing engine checkout during development per NCD-02/A-06. Exact toolchain, releases and clean-machine proof deferred to NCD-04. |

## 20. Freeze gate

Before any code authorization: (1) all C-03 decisions that affect implementation are recorded; (2) compatibility reviewed against C-01/C-02/NCD-02; (3) failure/security/identity semantics and non-goals explicit; (4) deterministic tests and acceptance criteria defined; (5) independent architecture freeze review and explicit owner approval. This architecture freeze creates **no** commit, issue, implementation order, or change to the source repository.

## 21. FFR-01 documentary corrections and freeze readiness (2026-10-19)

- **FFR-C03-F01 — RESOLVED, owner-approved:** the canonical JSONL outer discriminator is **`type`**, as required by NCD-02/A-03; C03-D2's version, `message_id`, `correlation_id`, `payload`, direction-aware validation and process-bound allowlists are unchanged. The old alternative discriminator is not a second canonical wire field.
- **FFR-C03-F02 — RESOLVED:** obsolete references implying D3–D14 were still undecided were replaced. Their **architecture choices are approved**, while exact wire schemas, SQL DDL, timeout/budget numbers, sequence and recovery mechanics, cancellation hooks, dynamic routing API and Windows packaging tests remain for downstream implementation specifications.
- **Implementer neutrality:** no specific external coding tool, coding-assistant brand, IDE, or implementation supplier is designated or authorized by this document. The engineering rules apply identically to any future authorized implementer.
- **Owner-specific upstream limitation preserved:** C-02 FFR-R01 broad universal LLM egress gate remains deferred; existing scoped consent and sensitive-data controls are unchanged.
- **Status:** FFR-01 findings F01/F02 resolved, final corrected document owner-approved and **FROZEN v1.0 (ARCHITECTURE) on 2026-10-19**. No source edits, implementation orders, source commits or runtime tests are authorized by this documentation freeze.


## 22. Final architecture freeze declaration and traceability (2026-10-19)

**Owner decision:** Freeze NCD-03 / C-03 as **FROZEN v1.0 — ARCHITECTURE**, following FFR-01 and corrected-document review FFR-01-C01. This declaration freezes the already approved decisions; it does not introduce any new option, change an earlier owner choice, or assert that implementation is complete.

### Normative decision coverage

| Frozen ID | Approved owner choice | Normative detailed section | Decision-log evidence |
|---|---|---|---|
| C03-D1 | A — Hybrid Python processes (discussion and per-approved-task bridge) | §4 | §19 |
| C03-D2 | A — Versioned typed JSONL with canonical `type` | §6 | §19 |
| C03-D3 | A — Explicit startup handshake/readiness | §7 | §19 |
| C03-D4 | A — Strict per-process command/event allowlists | §8 | §19 |
| C03-D5 | A — Concurrent discussion, single writer per workspace | §9 | §19 |
| C03-D6 | A — Structured real-time events from verified engine state | §10 | §19 |
| C03-D7 | A — Controlled cancellation and recovery | §11 | §19 |
| C03-D8 | A — Electron Main-owned structured SQLite and task-event history | §12 | §19 |
| C03-D9 | A — Central model registry plus ModelGateway | §13 | §19 |
| C03-D10 | A — On-demand Main-owned read broker | §14 | §19 |
| C03-D11 | A — Selective context retrieval | §15 | §19 |
| C03-D12 | A — Controlled retry and error recovery | §16 | §19 |
| C03-D13 | A — Boundary validation and bounded resources | §17 | §19 |
| C03-D14 | A — Windows bundled Python sidecar for distribution | §18 | §19 |

### Mandatory cross-contract limits preserved

- **NCD-02**: Electron Main authority, private stdin/stdout JSONL, diagnostics on stderr, canonical envelope `type`, local development Python and future bundled runtime.
- **NCD-03/C-01**: `ConversationContext` is a separately bounded, advisory engineering-task context; C-03 discussion memory is not a replacement for it.
- **NCD-03/C-02**: discussion-only Python cannot authorize or execute work; exact user-approved Run Task remains mandatory; project reads, consent, sensitive protections, memory provenance and owner-approved constraints remain binding. C-02 FFR-R01 universal outbound gate stays **deferred by owner**, not repaired or implied here. C-02 R03 application-level isolation is not represented as a Windows sandbox.
- **Tool neutrality**: this contract is independent of external implementation assistants, editors or service providers. It authorizes no particular implementer.

### Explicit limits of this freeze

This is **an architectural freeze, not a ready-to-code wire/SQL/IPC implementation specification**. Exact JSONL command/event schemas, database tables and migrations, numeric size/time/token budgets, authorization transaction mechanics, progress instrumentation, event replay/ordering, cancellation details, runtime integrity, model routing integration, and Windows packaging verification remain open for a downstream reviewed implementation specification. Those unresolved mechanics are not silently frozen by this declaration.

**Source authority:** no code or repository files were modified by freezing this document; source implementation requires a separate, explicit owner authorization after detailed implementation specifications and tests are approved.
