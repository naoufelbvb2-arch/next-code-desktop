# NEXT CODE DESKTOP — NCD-03 / IIS-01
## Electron Main ↔ Python: JSONL Wire Protocol Specification

**Status:** **FROZEN v1.0 — PROTOCOL DESIGN**; IIS01-D1–D12 OWNER-APPROVED individually; D13–D15 consolidated detailed contract OWNER-AUTHORIZED for freeze after FFR-01-C01 corrections; implementation/tests remain NOT AUTHORIZED  
**Date:** 2026-10-20  
**Authority:** Downstream implementation-interface design constrained by the frozen NCD-02 architecture, NCD-03/C-01, NCD-03/C-02 and NCD-03/C-03 contracts.  
**Implementation authorization:** NONE. This frozen design is not authorization to change code, execute runtime tests, commit changes or deploy.  
**Tool neutrality:** This specification is independent of any external coding assistant or IDE.
**Review disposition:** The owner requested a single integrated review, corrections, freeze and progression to IIS-02. D13–D15 are accepted as the consolidated v1 engineering baseline only after the FFR-01-C01 corrections recorded below. Historical sections retain their original proposal labels as provenance; the final status, corrected §16–§18 details and the freeze record govern the frozen text. No code or runtime test approval follows from this document.
**Implementation reading rule:** Earlier partial examples and phrases such as “remains OPEN/NOT FROZEN” record the stage of previous approvals. They are **historical, not current normative status**. Use §§16–18 and the freeze record as the final v1 normative interpretation; incomplete examples elsewhere are illustrations, not valid complete wire fixtures.

## 1. Scope and source of authority

IIS-01 specifies the **private** Electron Main ↔ Next Code Python bridge wire interface used by the approved `discussion` process and per-task `coding_task` process. It does not redesign React/Electron IPC, SQLite tables, the engine's business logic or Windows installation.

Frozen requirements inherited without reopening:

1. **Transport:** Electron Main-supervised child-process stdin (Main → Python) and stdout (Python → Main); one complete UTF-8 JSON object per newline; no local TCP or HTTP bridge. Python stdout carries protocol JSONL only; stderr is diagnostics, never authoritative events. Existing engine/CLI prints may contaminate stdout and require an explicitly isolated integration path and tests.
2. **Canonical envelope:** Every wire message has `version`, **`type`** (not `kind`), `message_id`, `correlation_id` (nullable where not correlated) and `payload`. Frozen architecture requires explicit validation, uniqueness/correlation and task-to-workspace/conversation binding. The exact wire enum and field schemas are what this IIS will decide.
3. **Process categories:** Main supervises a longer-lived `discussion` bridge and a new process for every approved `coding_task`. An explicit compatible and category-checked READY handshake precedes other permitted requests. Process identity belongs to Main, not to a self-declared payload.
4. **Allowlist:** Discussion has no `execute_task`, terminal, worker-dispatch or direct file-write authority. Only Main issues an authorized coding task after user-initiated, exact-workspace/goal-bound, atomically consumed Run Task approval. Python-initiated project reads use the Main-owned scoped file broker.
5. **Truthful events:** Real-time task/worker progress must come from instrumented actual engine state; no fabrication or parsing stderr into task events. Receiving a progress event never proves final task success or releases the workspace single-writer lease.
6. **Cancellation/recovery:** Task cancellation is controlled, correlated and bound to its supervised task child. Uncertainty, crash, missing events and uncertain filesystem side effects must not be silently reported as success or autorun another task.
7. **Persistence and data protection:** Main owns SQLite records and state reconciliation. Main owns project evidence reads and accepted user/provider consent policies. Keep the deferred C-02 FFR-R01 universal LLM outbound gate **deferred**; this specification must not silently mandate it.
8. **Finite boundaries:** Protocol limits, errors, backpressure, retries, sequence/replay and tests must be explicit in subsequent IIS decisions, not invented here as already-approved behavior.

## 2. IIS01-D1 — APPROVED (2026-10-19): Five top-level message types

**Approved choice: Option A — five fixed envelope classes plus typed sub-actions.** The five `type` values below are now normative for IIS-01; precise per-type payload schemas remain open for following decisions.

Keep the canonical outer `type` field small, stable and exhaustive:

| Proposed `type` | Allowed purpose | Typical direction | Operational boundary |
|---|---|---|---|
| `ready` | Post-initialization, versioned, process-bound readiness declaration | Python → Main | Handshake-only; does not itself authorize tasks or file access |
| `request` | A finite, named operation with its own `message_id`; operation name in `payload.action` | Main → Python; Python → Main **only** for approved broker calls | Strict allowlist per direction, role and lifecycle state |
| `response` | Accepted/rejected/result response to one known request | Reply to the original requester | Must correlate to one outstanding request; acceptance is not task completion |
| `event` | Unsolicited, source-grounded progress/update or final result under an existing scoped session/task | Primarily Python → Main | No authority elevation; finality and event provenance verified separately |
| `error` | Structured protocol/operation failure including fatal and nonfatal cases | Either direction, as allowed | Error is not a success result; correlation required where possible |

For example (illustrative envelope; **not yet an approved request payload schema**):

```json
{"version":1,"type":"request","message_id":"msg_001","correlation_id":null,"payload":{"action":"discussion.send","text":"Explain the repository"}}
```

The wire-level `type` remains **the frozen NCD-02 discriminator**, while `payload.action` identifies **a permitted request operation**; a future `payload.name` or equivalent may identify the event subtype, subject to approval. Shared envelope validators do not imply a permissive dispatcher.

### Rejected alternative — Option B: Each semantic action is a top-level `type`

Use dozens of top-level types (`discussion.send`, `task.cancel`, `task.started`, `broker.read`, etc.) and no common five-class envelope taxonomy. This has fewer dispatch levels but makes common response/error/stream processing and type-version policy less uniform. Under this option the outer key is still `type`.

**Decision outcome:** The owner approved Option A. The outer `type` enum is **exactly** `ready`, `request`, `response`, `event`, `error` for protocol version 1. Semantic actions belong under `payload.action` for requests; they must be explicitly allowlisted and cannot create a sixth envelope type. This approval is **not** a grant of authority to child processes, and does not settle response/event/error inner schema, ordering, or numerical limits.

## 3. IIS01-D2 — APPROVED (2026-10-19): Single READY handshake and message identity

**Owner-approved selection: Option A — Single READY Handshake.** This refines and does not change frozen C03-D2/C03-D3. Do not introduce a second negotiation roundtrip as a mandatory readiness precondition in version 1. The same contract applies separately to every supervised `discussion` and `coding_task` Python child.

### 3.1 The READY record — normative v1 shape

Only the supervised Python child sends `ready` to Electron Main, exactly once after its required initialization has completed and the bridge can safely accept requests of its assigned role. Its outer message is a **single UTF-8 JSON object on one newline-terminated stdout record**:

```json
{"version":1,"type":"ready","message_id":"ready_001","correlation_id":null,"payload":{"process_role":"discussion"}}
```

- `version`: the supported integer protocol version `1`; it is **not** a model or application version. An incompatible version must fail the handshake, not cause a silent downgrade.
- `type`: literal `"ready"`, using the frozen `type` field (never `kind`).
- `message_id`: nonempty message identifier, unique on this child transport connection for its lifetime. The literal `"ready_001"` is an illustration, not a mandatory ID-generation scheme. Exact length/charset/byte limits remain IIS01-D7 work.
- `correlation_id`: **JSON null** for READY, because readiness is not a response to a prior request.
- `payload`: object containing `process_role`, with the exact allowed values `"discussion"` or `"coding_task"`. It must match the category that **Electron Main assigned when spawning that process**; a child-declared role is never independent evidence of authority.

The READY schema and required fields are mandatory for this message; additional capability negotiation fields and other optional fields have **not** been approved. A future extension would require a separately reviewed protocol revision. The coding-task form uses `"process_role":"coding_task"` and the same five-field envelope.

### 3.2 Parent-owned readiness state and failure behavior

1. Every newly supervised process begins **not ready**. A PID, open pipe or first stdout byte does not confer readiness.
2. Main accepts the one READY only on the stdout pipe of **the currently supervised child instance** that it launched. It checks framing, JSON types, supported `version`, fixed `type`, allowed and matching `process_role`, uniqueness of `message_id`, and initialization deadline. A copied or cached READY from an earlier process does not authorize a newly launched process.
3. Before successful READY validation, **Main sends no application request** to that child. A one-way readiness message replaces the proposed two-way handshake; it does **not** waive Main-side validation or authorize task execution.
4. A duplicate READY, wrong role/version, invalid or incomplete record, non-protocol stdout, premature exit, or expired startup deadline is not successful initialization. Main records a distinct startup/protocol failure and keeps the child unavailable. A fatal initialization `error` may be reported before READY, but it does not count as READY.
5. Child exit, disconnect or loss of the supervised connection **invalidates** readiness. A replacement process must send a **new** and separately verified READY.
6. Readiness establishes only *protocol availability for this process category*. Discussion command restrictions, coding-task authorization (including exact approved and atomically consumed Run Task proposal) and file-broker restrictions remain independent and enforced for each request.

The approved contract requires a **finite startup deadline**, but this decision does not invent its numeric duration, retry count or optional health-ping protocol. These remain later integration details.

### 3.3 Message identity and correlation — normative principles

- Each process connection maintains independently validated message identity. Every outbound wire message has a nonempty `message_id`, generated without collisions within that supervised connection (including both directions where relevant); repeated incoming IDs on the same connection are rejected rather than interpreted as another fresh request. Cross-restart identity is established by Main's supervised process/session association; identical text IDs in **different** process instances do not establish continuity.
- For an initial root `request` with no parent request, `correlation_id` may be `null`. A `response` to a known request must set `correlation_id` to the original request's exact `message_id`, resolve **only** against an outstanding request on the **same child connection**, and pass the role/direction/request-state checks. Unknown, stale, completed or cross-process correlation IDs must not be accepted as authoritative responses.
- A `ready` message always has `correlation_id: null`. How individual `event` subtypes and request-scoped `error` messages express causality, progress sequence and finality remains part of IIS01-D5/D6; this D2 approval does **not** silently define their complete schemas.
- A valid `response` acknowledgement establishes only **receipt or response to a request** as specified by that request's future schema. It never proves that a coding task completed, tests passed or the workspace writer lease is released.

### 3.4 Required verification cases for IIS01-D2

Positive: a fresh `discussion` child emits one matching version-1 READY and becomes eligible for *discussion-allowed* commands; a separate, authorized `coding_task` child performs its own matching READY without inheriting readiness from discussion.

Negative: duplicate READY, old-process READY, role mismatch, invalid `version` or field type, non-null READY `correlation_id`, missing/duplicate message IDs, startup timeout, premature child exit, response to unknown or wrong-process `correlation_id`, and an otherwise valid coding READY with **no user-approved task authority**. None may yield unauthorized execution, false readiness or false task completion.

**Rejected alternative — Option B:** mandatory two-way capability/version negotiation before any READY. This is not selected for the controlled bundled v1 pair; incompatibility still fails closed. **Freeze boundary:** IIS01-D2 is approved, but IIS-01 as a whole is **not yet frozen**, and no source modifications are authorized.

## 4. IIS01-D3 — APPROVED (2026-10-19): Minimal Discussion commands and read-only broker surface

**Owner-approved selection: Option A — Minimal Discussion Commands.** This decision fixes the **three request action names and their permitted directions** for the v1 discussion process. It does not create a generic capability dispatcher, approve additional commands for each LLM cognitive substep, or authorize code execution. The payload examples below state conceptual intent; **their exact wire-level request/response JSON schemas remain a separate, non-frozen implementation detail** to be reviewed and tested rather than guessed as approved.

| Request `payload.action` | Direction / permitted process | Purpose and authority |
|---|---|---|
| `discussion.send` | Electron Main → supervised, READY **`discussion`** child | Send a scoped user discussion turn and selected context for inference; may return prose, an advisory task proposal, or summary/decision **candidates**. No executable task authority. |
| `project.discover` | Supervised, READY **`discussion`** child → Electron Main | Ask Main's authorized project file broker to enumerate bounded, allowed project structure and metadata. A listing is **not** proof that a file was read or shared externally. |
| `project.read` | Supervised, READY **`discussion`** child → Electron Main | Ask Main's file broker for bounded, policy-checked read-only excerpts from identified files. The child never acquires direct filesystem-read privileges through this request. |

### 4.1 Direction, process and approval boundaries

1. Main is the only authority for selected conversation history, saved SQLite memory, project/workspace binding, provider consent and file-broker decisions. Python's request to discover/read is **an untrusted request**, never proof of authorization. Main checks the actual supervised connection, assigned role, canonical workspace and current permissions for **each** request.
2. A discussion answer may include a **suggested task goal** or **derived summary/decision candidate**. Main may show it and process it under frozen C-02 rules, but this result cannot itself execute a task, grant a proposal, write to SQLite as an *approved* user decision, or bypass an explicit Run Task approval.
3. Only named, allowlisted request actions are admitted; a `discussion` child may **not** send `task.execute`, invoke `AgentOS.execute_task()`, dispatch a worker, write files, or execute terminal commands using this bridge. The `coding_task` command family will be specified in IIS01-D4 and is never enabled by the presence of `discussion.send`.
4. Read-only broker access does **not** supersede C02-D12 (broad eligible text files with sensitive exclusions), C02-D13/D17 (staged bounded inspection) or C02-D15/D16 (external-provider consent and secret-aware screening). Local file read and disclosure to an external provider are separate checks. Do **not** silently reinstate the deferred universal LLM outbound gate from C-02 FFR-R01.
5. Each broker call uses a normal `request` and is answered through the correlated `response` or `error` class. The child must not assume that requested information is accessible until Main returns an authorized response. Discovery and reads may be denied, incomplete, budget-limited or stale due to concurrently changing project files; analyses must preserve these limitations.
6. Internal LLM intent classification, summarization, proposal synthesis and response composition are **Discussion Service implementation concerns**, not separate wire actions under IIS01-D3. No `discussion.summarize`, `discussion.classify`, `discussion.approve`, `project.write` or `terminal.run` command is approved by this decision.
7. Even if a request has a known `payload.action`, the bridge must reject unexpected direction, process role, connection state, missing correlation, malformed payload or unauthorized workspace; D3 does not weaken D1/D2 validation.

### 4.2 Remaining wire-schema questions — expressly NOT approved by D3

Specific `discussion.send` input/output field names, context references, token budget representation, file listing/excerpt result schemas, pagination, source coverage/provenance identifiers, denial codes and sensitive-content redaction formats still require implementation-interface detailing. The approval here is for the **minimal public command surface and its invariant authority boundaries**, not an unstated complete RPC schema. Future specifications may refine fields without changing this allowlist; adding a new command or granting another process access requires explicit architectural compatibility review.

**Rejected alternative — Option B:** exposing separate cross-process commands for every cognitive subfunction (e.g. classify, summarize, extract decision, propose task) as part of the first protocol. The user chose the narrower request surface to keep discussion logic encapsulated in Python and authorization in Main.

**Decision outcome:** IIS01-D3 approved. IIS-01 **NOT FROZEN**. No code changes, commits or implementation work authorized.

## 5. IIS01-D4 — APPROVED (2026-10-19): Minimal Coding Task commands

**Owner-approved selection: Option A — Minimal Task Commands.** The coding-task bridge exposes **exactly two v1 request actions**, scoped to the specific Main-supervised `coding_task` child. This approval **does not** turn individual worker operations, planning steps, tool calls or tests into separate Desktop wire commands. It preserves frozen C03-D1/D4/D5/D7 and the distinct ConversationContext contract from C-01.

| Request `payload.action` | Direction / allowed process | Meaning and authorization boundary |
|---|---|---|
| `task.execute` | Electron Main → **READY `coding_task` child only** | Start **one** exactly approved engineering task in its bound canonical workspace after Main has atomically consumed the explicit, scoped Run Task approval and acquired the single-writer lease. The process executes through the normal `AgentOS.execute_task()` entry point and its internal worker orchestration. |
| `task.cancel` | Electron Main → **same supervised `coding_task` child only** | Request cooperative cancellation of the already-running, specifically identified task. Main is responsible for bounded grace period, controlled process-tree termination if required, honest reconciliation, and retaining an uncertain lease where shutdown/side effects cannot be verified. |

### 5.1 Task execution guarantees

1. The Main-owned approval/proposal and task identity, goal and canonical workspace **must match exactly** the newly spawned child and request. READY is necessary but never sufficient authorization. The Python bridge does not validate user intent by merely trusting a `payload` Boolean or a model suggestion; Main is the decision authority.
2. A supervised per-task child can accept **at most one** `task.execute` for its task lifetime. Reject any additional, repeated, cross-workspace, cross-role, or unsolicited execution request. No execution route exists inside the persistent `discussion` process. `task.execute` is never emitted by a model as an authorized command.
3. Main may supply the bounded, frozen C-01 `ConversationContext` snapshot to the task entry point; this must not silently transform the larger C-02 discussion-memory store into executable instructions or bypass context-workspace validation.
4. A correlated `response` indicating **request acceptance** means only that the bridge accepted the command, **not** that engineering work succeeded. Task/worker progress and final completion must be reported from verifiable engine observations, using the approved `event` / `response` mechanisms as further specified by IIS01-D5/D6. Map the terminal outcome to the existing `TaskOutcome` contract rather than inventing a second independent success authority.
5. Internal planning, dispatch, code edits, tests and checkpoint handling remain within the engine. Do **not** add v1 wire actions `task.plan`, `worker.dispatch`, `task.run_tests`, `task.apply_changes` or other step-level controls.

### 5.2 Cancellation and failure boundaries

1. The bridge must continue to **receive and validate** `task.cancel` while `task.execute` is running. A synchronous blocking input loop that cannot process cancel until the task ends **does not satisfy** this decision. The exact concurrent input/task runner mechanics belong to implementation-interface completion and tests.
2. Cancel is bound to the current child connection, task identity and active execution. Repeated, late or wrong-task cancellation must not affect another child or a future task. A cancellation acknowledgement is **not** confirmation that the task or descendants have stopped.
3. Main implements the frozen two-stage cancellation policy (graceful request; escalation if required) and preserves unknown state or a workspace writer hold when termination or filesystem consistency is not verified. Cancellation does **not** automatically roll back file changes, re-run tasks, declare success, or free the single-writer lease.
4. A child crash, protocol disconnect or missing terminal result must be surfaced as unknown/failed-to-verify as appropriate, never synthesized into a successful `TaskOutcome`. Retry of the full engineering task requires a separately authorized safe path, not automatic replay.
5. A Python child cannot gain authority by sending an unsolicited request for `task.execute` or `task.cancel`; both are Main → assigned Coding child commands under the strict allowlist.

### 5.3 Remaining schema design — not approved by D4

Exact `task.execute` / `task.cancel` JSON field lists, result/event subtypes, task phase and agent event taxonomy, cancellation acknowledgements, `TaskOutcome` serialization, sequence numbers, deadlines, retry identities and finite queue/record sizes remain to be specified and tested in following IIS work. D4 approves the **two command names, directions and invariants**, not unreviewed payload details.

**Rejected alternative — Option B:** a granular public Desktop dispatcher for planner, worker, tool and test steps. The owner selected the narrow façade to preserve AgentOS autonomy and avoid moving engine logic into Electron.

**Decision outcome:** IIS01-D4 **APPROVED**. IIS-01 remains **NOT FROZEN**; implementation remains **NOT AUTHORIZED**.

## 6. IIS01-D5 — APPROVED (2026-10-19): Structured real-time events with per-task sequence

**Owner-approved selection: Option A — Structured Events + Per-Task Sequence.** Mission Control consumes engine-grounded `type: "event"` records, **not** best-effort terminal text and **not** inferred worker outcomes. The following invariants elaborate frozen C03-D6 (real-time events), C03-D8 (Main-owned persisted event history), C03-D5 (workspace writer ownership) and the earlier IIS01-D1 envelope.

### 6.1 Event identity, correlation and ordering

1. Every task-related event must be scoped to the **exact authorized `task_id`** and the supervised coding child/connection for that task; foreign-task, foreign-connection and unauthorized events are rejected rather than merged into the current run.
2. Each accepted task event has a **unique event identity**, a **monotonically increasing per-task sequence number** (`sequence`) and source/provenance information sufficient to tie it to an actual observed engine occurrence. The event identity remains distinct from the outer envelope `message_id`; exact encoding and where sequence allocation occurs are implementation-schema details to settle before coding.
3. Sequence expresses **the recorded order of events for one task**, not a proof that independent agent actions were executed sequentially in real-world time. Different tasks have independent sequences; cross-task global total ordering is **not** promised.
4. Electron Main validates, deduplicates and persists events it accepts to its authoritative SQLite history before relying on them for durable UI replay. A repeat with the same event identity/sequence must not create a second displayed fact; conflicting duplicates are an error, not an overwrite. Persistence success and renderer delivery must not be conflated.
5. On a missing sequence, reconnect, crash or incomplete persisted history, mark the task history **incomplete/uncertain** and do not synthesize the missing events. Any later reconciliation must use evidence from a trusted recorded source; it must not claim events were delivered when they were not.

### 6.2 Truthful, bounded Mission Control event families

The v1 wire `type` is still **`event`**; event subtypes describe the observed fact. The following **families** are included in the approved scope (names below are illustrative and **not yet approved exact wire enum strings**):

| Event family | Evidence and presentation rule |
|---|---|
| Task lifecycle | Actual task start, progress/state transition and terminal outcome; mere command acceptance is not start or success. |
| Agent/worker lifecycle | Actual worker dispatch/start/completion/failure only when instrumented and attributable to that worker; no invented concurrent agent activity. |
| Verified file effects | Confirmed file modifications where the engine provides reliable evidence; never infer a file change from generated text or an intention to write. |
| Test/verification results | Observed test result and its outcome, not guessed success based on the plan. |
| Inspection/progress coverage | Only quantities, phases or coverage that can be grounded in performed operations; no guessed percentages. |

1. Emitting an event must **not** authorize a new task, modify a Run Task approval, change writer-lease ownership, or supersede a canonical `TaskOutcome` final result.
2. Renderer navigation must not erase Main's authoritative recorded history; on return, show the persisted events and explicitly reveal any detected gaps or unknown outcome.
3. Diagnostics on stderr remain non-authoritative; a `print()` line or LLM declaration of success must not be promoted automatically to an event of verified execution.
4. Scope is intentionally narrow: the exact subtype names, required event JSON fields, source identifiers, durable allocation protocol, retention/backpressure limits, persistence failure handling and final-outcome acknowledgement are **not** established by D5 alone. They require following schema decisions and conformance tests before implementation.

### Rejected alternative — Option B: Best-Effort Event Streaming

Arrival order alone, without reliable event identity or gap detection, does not provide trustworthy Mission Control replay following interruption or renderer re-entry.

**Decision outcome:** IIS01-D5 **APPROVED — Option A**. The per-task ordered, attributable, deduplicated event history is mandatory for the interface design; precise wire schemas and cancellation/finality error contracts remain OPEN. IIS-01 remains **NOT FROZEN** and coding remains **NOT AUTHORIZED**.

## 7. IIS01-D6 — APPROVED (2026-10-19): Explicit lifecycle and structured errors

**Owner-approved selection: Option A — Explicit Lifecycle & Structured Errors.** An accepted command, a running task, a cancellation request, and a verified terminal outcome are **different facts**. This decision refines frozen C03-D7 (controlled cancellation), C03-D12 (bounded retries), C03-D5 (single workspace writer) and IIS01-D5 (attributable event history). It does not create new outer `type` values: the five classes of IIS01-D1 remain exhaustive.

### 7.1 Request acceptance is never operation completion

1. A `type: "request"` has a unique message identity for its connection, an approved `payload.action`, a permitted direction and an authorized target. `task.execute` is valid only for its specifically supervised coding-task child with the consumed Run Task authorization and correct workspace writer lease.
2. A correlated `type: "response"` can state that the request was **accepted for processing** or **rejected**. Acceptance must not be presented as `Task Started`, `Task Completed`, successful file modification or a passed test; each is independently evidenced.
3. Actual operation progress is represented by authorized, grounded `type: "event"` records. A task's **terminal outcome** requires trustworthy evidence from the actual execution/engine and Main-side reconciliation; a lost bridge or a child's unsupported assertion cannot prove success.
4. A final outcome may be **verified success**, **verified failure**, or **confirmed cancellation**. When termination and effects cannot be verified, Main maintains an explicit **unknown/needs-reconciliation** state, not a fabricated successful or canceled result. An unknown state is a Main-owned recovery classification, not necessarily a claimed Python terminal event.
5. Only Main's verified task/process/side-effect reconciliation can release the workspace writer lease, following frozen C03-D5/D7. Sending an error, receiving an acceptance response, observing EOF or a cancel request does not release it by itself.

### 7.2 Cancellation is a request, not a completed fact

1. `task.cancel` is an authorized **Main → coding-task** command correlated to the *exact* existing task/process. It must reach a responsive control path while `task.execute` is active; the task executor must not monopolize the only command reader.
2. `Cancel Requested` means an intent or accepted cancellation instruction; **it does not mean the engine has stopped**. `Cancel Confirmed` is supported only after verified task/child shutdown and sufficient reconciliation of remaining work/processes.
3. If cooperative cancellation exceeds the configured limit, Main may perform the separately authorized supervised termination path. A forcibly terminated child can still leave modified files or spawned processes; cancellation confirmation and lease release remain separately verified.
4. A stalled, crashed or disconnected child must not trigger automatic full-task reexecution. Its state remains unknown until evidence supports a definitive classification.

### 7.3 Structured protocol and operation errors

1. Failures are represented in a **typed, machine-readable, correlated** manner, using the approved `error` envelope where appropriate. Error information must identify a stable error category/code, the related request when known, and whether the error is a protocol/authorization/validation, provider, execution or lifecycle failure. Exact strings, fields and retry indicators are **not yet frozen**.
2. Known malformed or unauthorized commands are rejected, not silently downgraded to different commands, and not treated as task completion. Irrecoverable framing/version/role faults may invalidate the corresponding connection and readiness state.
3. Human-readable error diagnostics must not leak API keys, sensitive file contents or uncontrolled exception traces through the bridge, renderer or application log.
4. A retryability assessment is **operation-specific**. A transient, side-effect-free discussion LLM request may be retried under C03-D12's finite policy, with no silent change of provider/model; duplicate messages and uncertain provider charges remain possible. A complete coding task is **never rerun automatically** because transport or provider failed.
5. A retry that creates a new wire request uses a new connection-scoped `message_id` and must retain a trustworthy association to the original logical operation. Exact retry-id/idempotency keys and persistence mechanics are **implementation-schema work**, not implied by `correlation_id` alone.

### 7.4 Verification cases required before implementation acceptance

- Acceptance of `task.execute` is shown as accepted/queued, **not** as a completed success; an actual start and a final outcome require separate evidence.
- Receipt/acceptance of `task.cancel` does **not** render a confirmed stopped state or free the writer lease.
- Unresponsive/cooperatively canceled/forcibly terminated/crashed subprocesses must be differentiated; uncertain filesystem effects are exposed honestly.
- Invalid cross-task correlation, unsupported commands, unknown errors or conflicting terminal claims must be rejected or flagged; no sixth envelope type is introduced.
- Any retry must preserve the chosen provider and must not duplicate task execution or automatically turn an unknown result into success.

**Rejected alternative — Option B:** a simple `success: true/false` acknowledgment that merges command acceptance, task finality, cancellation and transport errors. The owner selected explicit lifecycle and structured error handling.

**Decision outcome:** IIS01-D6 **APPROVED — Option A**. Precise response/error/event subtype enumerations, JSON payload schemas, numeric timeouts, parser/queue limits, wire-level outcome acknowledgement and retry-key encoding **remain OPEN** for later IIS specification/review. IIS-01 remains **NOT FROZEN**; implementation remains **NOT AUTHORIZED**.

## 8. IIS01-D7 — APPROVED (2026-10-19): Bounded Flow Control

**Owner-approved selection: Option A — Bounded Flow Control.** The private JSONL connection must have finite resource usage and explicit handling of a producer outpacing the receiver. This refines frozen C03-D13 boundary validation and approved IIS01-D5 ordered task events; it does **not** change the five top-level `type` values or add Python authority.

### 8.1 Finite wire and memory boundaries

1. Bound the **maximum UTF-8 bytes in one complete JSONL record**; measure bytes (including the framing overhead) rather than assuming character count equals byte count. Reject oversized, non-UTF-8, malformed or nonconforming records without trying to process partial commands.
2. Bound the parser's **incomplete-line buffer**, queued outgoing messages, queued incoming messages, outstanding requests and accepted-but-not-yet-persisted events. A missing newline or continuously growing partial JSON must not allocate memory indefinitely.
3. Impose finite per-connection/process limits and resource budgets appropriate to `discussion` versus `coding_task`, with honest failure signaling. No unbounded in-memory event backlog is permitted.
4. Bound event payloads separately from total inspected project/file bytes; project read/discovery stays subject to the Main-owned read broker and its already-approved security and consent constraints.
5. **Numerical values** (byte caps, queue capacities, request concurrency, pressure thresholds and deadlines) are **not approved by IIS01-D7**. They must be selected, documented and tested in the implementable schema/configuration stage. The architecture now requires that such limits exist and be enforced.

### 8.2 Backpressure and queue-pressure behavior

1. When receiving/storage/rendering cannot keep up with production, throttle or suspend production/consumption using **bounded backpressure**; do not allow limitless buffering as the default strategy.
2. SQLite event persistence and frontend rendering are separate concerns. A slow or closed renderer is not permission to lose authoritative engine events. Main validates/records accepted events before exposing them for replay, consistently with IIS01-D5.
3. **Critical lifecycle and terminal evidence** (confirmed task completion/failure, cancellation results, reliable file/test outcomes) must **not be silently dropped or fabricated**. If the system cannot preserve an event after its bounded failure policy, it must explicitly mark the stream/record incomplete and transition to error, unavailable, or reconciliation-needed state as appropriate; it must not claim exhaustive replay.
4. The ability to slow an existing producer and the need for persistent acknowledgments/retransmission are **implementation design questions**, not guarantees already present in `AgentOS`. Existing `stdout` diagnostics/prints must not contaminate the JSONL transport.
5. Optional high-frequency cosmetic/UI updates may be coalesced **only with an explicit documented category policy**; this must never alter stored authoritative facts or per-task sequence/gap integrity. No implicit dropping of sequenced factual events.

### 8.3 Disconnects, parse errors and integrity

1. Handle EOF, broken pipe, process crash, malformed frames, queue saturation, timeouts and forced shutdown as distinct observable conditions where evidence supports the distinction.
2. A wire disconnect cannot by itself prove completion, cancellation, rollback or safe release of the workspace writer lease. Preserve last verified state and reconcile before new writes under C03-D5/D7.
3. A rejected or lost message must not silently advance a trusted per-task sequence. On reconnect/relaunch, retain persisted identity, duplicate protection and **visible gap/unknown-state reporting**, subject to later exact replay protocol design.
4. When an invalid record lacks a trustworthy request ID, failure may be connection-scoped rather than falsely attributed to another request. Error payloads must remain bounded and avoid sensitive diagnostics.
5. The current five-envelope protocol remains intact: `ready`, `request`, `response`, `event`, `error`. A future explicit flow-control signal, if needed, must be designed and reviewed **within the existing contract** rather than introduced as an unapproved sixth top-level type.

### 8.4 Minimum verification obligations

- Oversized JSONL record, malformed JSON, invalid UTF-8, incomplete newline, and endless partial-line input all fail safely within finite memory.
- Fast producer + slow consumer + slow SQLite + closed renderer do not create unbounded queues or turn accepted authoritative events into imaginary successes.
- Writer process crash, abrupt EOF and saturation do not automatically free a task lease or infer a terminal outcome.
- Replayed or duplicated events are deduplicated; sequence holes remain detectable after restart, with no made-up missing activity.
- Throttling does not deadlock the ability to request `task.cancel` or observe task/process shutdown; concrete cancellation responsiveness and numerical limits are tested during implementation verification.

**Rejected alternative — Option B:** limiting individual record sizes only, with no bounded queue/backpressure strategy. The owner selected bounded flow control.

**Decision outcome:** IIS01-D7 **APPROVED — Option A**. Exact numeric limits, signal/ack transport details, and per-operation schema definitions remain **OPEN** for implementable specification and testing. IIS-01 remains **NOT FROZEN**, and **NO CODE EXECUTION/CHANGES ARE AUTHORIZED**.

## 9. IIS01-D8 — APPROVED (2026-10-19): Contract-Driven Conformance Testing

**Owner-approved choice: Option A — Contract-Driven Conformance Testing.** Implementations of the Electron Main and Python bridge must conform to the same versioned protocol and demonstrate both successful and failing cases. This decision mandates the **testing and evidence standard**; it does **not** claim tests have already run, approve code changes, settle undecided payload schemas or authorize a freeze.

### 9.1 Conformance source of truth and test obligations

1. Establish a **canonical protocol-v1 specification** with exact fields, required/optional/null semantics, type validation, directions, allowed roles, version rules, legal state transitions and explicit numeric resource bounds **before implementation acceptance**. Preserve the five `type` values, `payload.action` allowlists and one-way READY contract already approved.
2. Derive machine-checkable **valid/invalid examples and corresponding assertions** from this contract and ensure both Python and Electron Main validate the same behavior. No claim of implementation-level conformance is allowed merely because two locally authored validators accept their own data; test matching positive and negative vectors across both boundaries.
3. Maintain tests at **schema/unit**, **cross-process protocol integration**, and **failure/restart/reconciliation** levels. Use synthetic/mock engine or provider results where appropriate; when claiming task/worker events, distinguish mock fixtures from engine instrumentation evidence. Preserve regression coverage for preexisting `AgentOS`/C-01 behavior.
4. Every accepted decision D1–D7 is traceable to at least one positive test and one applicable negative/failure-path test; some decisions (e.g., cancellation, queue pressure) require more than one integration scenario.
5. Unexpected fields, malformed frames, wrong process identities, sensitive diagnostics, replay attempts or invalid event sequences must **fail predictably**, not silently grant authority, fabricate outcomes or lock the UI indefinitely. Define the exact error/connection behavior before testing.
6. Produce an auditable verification report listing tested revision, test environment, commands/results, passing/failing/skipped tests, unresolved risks and any change from the approved contract. `PASS` cannot be inferred from proposed test cases or documentation alone.

### 9.2 Minimum conformance matrix — required coverage, not claimed execution

| Contract area | Required positive evidence | Required negative/failure evidence |
|---|---|---|
| Envelope + READY (D1/D2) | Correct UTF-8 JSONL, exact outer keys and v1 READY; request accepted after verified startup | Corrupt/incomplete/oversized input, non-JSON stdout, duplicate READY, wrong version/role or pre-READY request rejected |
| Message identity + correlation (D2) | Distinct message IDs and matching request → response associations | Duplicate, stale, foreign-connection or orphan correlation cannot impersonate success |
| Discussion allowlist + broker (D3) | `discussion.send`; scoped `project.discover` and `project.read` through Main | Attempted `task.execute`, wrong direction, unsafe path or unapproved data scope denied |
| Task command boundary (D4) | Single authorized `task.execute` and responsive `task.cancel` against the bound task child | Duplicate execute, unconsumed/mismatched approval, wrong task/workspace and blocked cancellation command reader denied/fail |
| Event truth + sequencing (D5) | Source-grounded ordered event records, Main-validated persistence and replay | Duplicate/conflicting events, missing sequence, task spoofing, renderer reload/SQLite failure do not fabricate history |
| Explicit finality + errors (D6) | Accepted, running, canceled/failed/successful outcomes distinguished with correlated typed errors | Cancel acknowledgment, EOF, provider failure or crash never become invented terminal success or premature writer-lease release |
| Resource control (D7) | Record/queue/in-flight limits and backpressure under load, with bounded memory | Endless partial line, fast producer/slow consumer/slow SQLite, pressure/cancel races, disconnect and dropped critical event handled visibly |
| Recovery and compatibility | Isolated fresh READY after child restart; no unauthorized full coding-task replay | Incompatible version, stale event from previous process, uncertain filesystem effects remain explicit and require reconciliation |

### 9.3 Freeze and implementation gates

- **Before IIS-01 may be frozen as an implementable wire contract:** finish exact `response` / `error` / `event` schemas, request-specific input/output payloads, sequencing and durable acknowledgement/replay rules, finite byte/queue/time limits, parser behavior, lifecycle transitions and concrete conformance vectors. These are not automatically solved by choosing Option A.
- **Before implementation may be declared verified:** execute and record the resulting tests against the actual code and process boundaries. Planning a test is not a passing test.
- The frozen C-02 FFR-R01 blanket outbound LLM-gate deferral remains intact; this test plan enforces only previously approved project-file permissions, sensitive protections, provider consent and bridge boundaries.
- Keep the document implementer-neutral: no tool-specific assistant, IDE, remote service, plugin-host platform or speculative extension architecture is required by this decision.

**Rejected alternative — Option B:** Basic Integration Testing limited to happy-path startup, a message and a sample task. It cannot demonstrate process boundary, event-history or recovery invariants.

**Decision outcome:** **IIS01-D8 APPROVED — Option A**. The conformance plan is mandatory; schema/budget completeness and actual test execution remain separate gates. **IIS-01 remains DRAFT / NOT FROZEN; implementation remains NOT AUTHORIZED.**

## 10. Preliminary operation inventory — discussion material only, NOT APPROVED

These are required **capability groups** grounded in frozen architecture, not settled method/event strings:

| Group | Possible request or event forms | Why it exists / constraint |
|---|---|---|
| Lifecycle | bridge `ready`; explicit protocol error | C03-D3 handshake and version/category verification |
| Discussion | message request/answer; optional response chunks; intent proposal | C02-D1–D4; suggestion never launches `AgentOS` |
| Memory | summary or decision **candidate** request/result | C02-D5–D8; Main alone validates evidence and approval provenance |
| Project evidence | Python broker discovery/read request, Main reply; inspection coverage update | C02-D10–D17 and C03-D10; bounded, authorized, read-only |
| Coding task | Main-approved task start; accepted/rejected response; cancel request | C03-D4/D5/D7; one coding child per authorized task, task start only once |
| Task and worker events | true task phase, worker activity, confirmed file/test outcomes, final TaskOutcome | C03-D6/D8; emit only events instrumented and supported by engine |
| Errors and shutdown | request-scoped error, bridge failure, controlled shutdown | C03-D7/D12/D13; do not infer a task outcome from lost transport |

**Not every example becomes a distinct wire command.** Subsequent decisions will enumerate minimal exact command strings, event names, payload shapes and allowed directions, avoiding duplicate commands or speculative extension frameworks. In particular, renderer UI controls, SQLite writes and user Run Task approval are **Main-side operations**, not new Python powers.

## 11. IIS01-D9 — APPROVED (2026-10-19): Canonical v1 envelope and response/error payloads

**Owner-approved selection: Option A — Strict Canonical Schemas.** The following shared outer-envelope fields and common per-type payloads are normative for draft protocol v1; this approval does **not** freeze IIS-01 or authorize code. The five `type` values, one-way READY message, role-specific allowlists, and acceptance-versus-finality boundary are inherited without reopening.

### Approved Option A — Strict closed schemas with structured outcomes

**A1. Canonical outer envelope.** Exactly five root keys on each complete UTF-8 JSONL record; no additional root keys:

| Key | Approved v1 requirement |
|---|---|
| `version` | JSON integer exactly `1` (not Boolean, float, string or null). No silent negotiation or version downgrade. |
| `type` | One of exactly `ready`, `request`, `response`, `event`, `error`. |
| `message_id` | Nonempty ASCII identifier matching `^[A-Za-z0-9_-]{1,64}$`, unique **across both directions** within the supervised connection; duplicates rejected. This identifier constraint is approved by D9. |
| `correlation_id` | Either JSON `null` or a syntactically valid message ID. A response must identify an existing request in the **same supervised connection**; error correlation is required when the trusted request is known. A root request or READY has `null`. Event association is detailed in D11. |
| `payload` | A JSON object (never a string/array/null); its allowed inner fields depend on `type` and, for a request, the approved action. |

Parse with duplicate-key rejection (including nested objects), strict UTF-8, finite well-formed JSON, and strict type checking; do not silently coerce values. Unknown **outer** keys or top-level types are invalid. Byte, queue and timeout limits (beyond the `message_id` character limit) remain OPEN for later decisions. The `ready` payload stays **exactly** `{"process_role":"discussion"}` or `{"process_role":"coding_task"}`, as already approved in D2.

**A2. Request.** Require exactly `payload.action` (allowlisted string) and `payload.input` (object). D10 approves separate closed `input` schemas for `discussion.send`, `project.discover`, `project.read`, `task.execute` and `task.cancel`; the exact field-by-field definitions remain unfinished and no new action or direction is authorized. Example:

```json
{"version":1,"type":"request","message_id":"req_001","correlation_id":null,"payload":{"action":"discussion.send","input":{"text":"Explain the project"}}}
```

**A3. Response.** Require `payload.status` (enum `accepted` / `completed` / `rejected`), `payload.result` (object or null) and `payload.reason` (object or null). All three fields always appear. Accepted means only admitted for processing and must have `result:null` and `reason:null`; completed means a synchronous request operation has finished and carries an object result (possibly `{}`); rejected means ordinary refusal and carries a sanitized reason object with `code` and `message` but `result:null`. `response.correlation_id` refers to the specific incoming request; it cannot confirm engineering-task success or cancel completion.

```json
{"version":1,"type":"response","message_id":"reply_001","correlation_id":"req_001","payload":{"status":"accepted","result":null,"reason":null}}
```

```json
{"version":1,"type":"response","message_id":"reply_002","correlation_id":"req_002","payload":{"status":"rejected","result":null,"reason":{"code":"NOT_AUTHORIZED","message":"Request is not permitted for this process"}}}
```

**A4. Error.** Reserve `type:"error"` for protocol, processing or lifecycle faults, not fabricated task outcomes. The approved `payload` has exactly `code` (stable machine-readable string), `message` (sanitized human-readable description) and `retryable` (Boolean **advisory only**). Never include secrets, traceback or raw file content. The correlated ID must match a known request where possible; `null` is permitted for connection-scoped faults or untrusted malformed input, including fatal startup errors before READY. `retryable:true` must **never** override the existing prohibition on automatically re-running an engineering task.

```json
{"version":1,"type":"error","message_id":"err_001","correlation_id":"req_003","payload":{"code":"PROVIDER_UNAVAILABLE","message":"Selected provider is temporarily unavailable","retryable":true}}
```

**A5. Event.** Require `payload.name` (nonempty event subtype string) and `payload.data` (object) as the approved common event shape; exact event names, `task_id`, per-task sequence, origin proof, final outcome and replay semantics are **D11 work**. An event never authorizes task execution, and is not equivalent to a completed `response`.

```json
{"version":1,"type":"event","message_id":"evt_001","correlation_id":null,"payload":{"name":"task.started","data":{"task_id":"task_001"}}}
```

The examples above illustrate the now-approved **envelope and common payload shapes**, but are **not approved action-specific/event-subtype fixtures**. Exact `input` fields, event-subtype data, response life-cycle mechanics, error code catalog, ID allocation across both senders, and numerical resource caps still require later explicit decisions where applicable. Do not automatically assume an accepted `task.execute` implies that `task.started` happened, or that a `task.cancel` acceptance confirms termination.

### Rejected Option B — Loose, extensible JSON payloads

Keep the five required outer keys but allow arbitrary additional outer/payload keys and free-form response/error content, validating only `type` and `payload.action`. This reduces initial schema work but increases Electron/Python divergence, inconsistent lifecycle semantics and compatibility risk. This option does **not** negate any frozen allowlist or authorization constraint, even if selected.

**Decision outcome:** IIS01-D9 **APPROVED — Option A**. Exactly five outer fields, closed common payload shapes, strictly typed values and duplicate-key rejection are required. Detailed action contracts, event durability/ordering mechanics, numeric limits and conformance fixtures remain **OPEN**. IIS-01 remains **NOT FROZEN; implementation is NOT AUTHORIZED**.

## 12. IIS01-D10 — APPROVED (2026-10-19): Exact per-action input schemas

**Decision status: APPROVED — Option A.** D9 freezes the outer envelope and the `request.payload = {"action":..., "input":...}` common shape. D3/D4 fix which five commands exist and in which direction. D10 now needs to decide how tightly each command's `input` is typed. The candidate fields below are **illustrative inputs, not yet individually approved field-level wire schemas**; D10 approves the principle of a closed schema for each action, while exact required fields, optionality, numerical bounds and validation details remain subject to subsequent explicit review.

### Approved Option A — Exact, distinct input schemas per approved action

Maintain exactly five approved request actions, each with a **closed, versioned input contract**. Main- or process-owned identity and permission checks always remain authoritative; untrusted payload declarations never confer access.

| Action and direction | Candidate required data in `payload.input` | Critical validation boundary |
|---|---|---|
| `discussion.send` · Main → Discussion | `conversation_id`, `text`, `model_id`, `context_snapshot` (bounded selected context) | Main owns the conversation record and selected provider authorization; context is advisory material, never a task-execution authority. |
| `project.discover` · Discussion → Main | Workspace-relative `directory` and optional bounded discovery continuation | Main resolves the authoritative workspace bound to this session; rejects escapes or sensitive discovery. |
| `project.read` · Discussion → Main | Workspace-relative `path`, bounded `start_line` and `end_line` | Main-only read broker validates canonical paths, protected data, size, freshness and read permission; no Python direct-file access. |
| `task.execute` · Main → Coding Task | `task_id`, `task_goal`, authoritative workspace binding, optional C-01 `conversation_context` snapshot | Already consumed Run Task approval and exclusive writer ownership must be checked **before** launch. Do not treat payload content or a proposal ID as self-authenticating permission. |
| `task.cancel` · Main → Coding Task | `task_id` | Must match the exact supervised task process. Receipt is not proof of termination. |

- No generic filesystem or terminal operations are introduced. Additional details such as the exact workspace-binding representation, approved `model_id` syntax, optional/nullable fields, pagination and bounded context size must be explicitly locked before implementation.
- Results will be mapped to the approved D9 `response` schema; asynchronous task milestones use approved `event` class without inventing extra top-level types.
- For each action, provide valid and invalid JSONL fixtures: required keys, prohibited keys, strict types, identity mismatch, cross-role attempts and denied access.
- The existing C-02 FFR-R01 deferral is unchanged: do not add a universal LLM outbound gate as an unapproved requirement.

### Rejected Option B — Shared generic input envelope per action

Use the same flexible `input` container, such as `{ "args": {...} }`, for all five commands and let each service interpret its own fields. This reduces schema definitions but increases ambiguous authorizations, divergent validators and mismatched error handling. Outer D9 strictness and frozen role allowlists still apply, whichever option is chosen.

**Decision outcome:** **IIS01-D10 APPROVED — Option A**. Every one of the five previously approved action strings must have a separate, strictly typed, closed, version-1 `payload.input` schema and matching valid/invalid fixtures. This approval **does not** freeze the illustrative candidate field names/types in the table, permit unconstrained context transfer, finalize byte/token/page limits, approve new commands, or authorize implementation. The exact five schemas will be specified and audited in subsequent field-level work.

## 13. IIS01-D11 — APPROVED (2026-10-19): Closed canonical task and worker event schemas

**Decision status: APPROVED — Option A.** IIS01-D5 has already approved truthful, task-scoped, sequenced, recoverable events; IIS01-D9 has approved the **common** `event.payload = {"name": string, "data": object}` structure. D11 selects **how strictly each permitted event name and `data` schema are specified**, without changing either frozen decision or introducing a sixth top-level `type`.

### Approved Option A — Closed event names and subtype-specific typed data

Define an explicit allowlist of *evidence-backed* event names and an exact, closed `payload.data` schema for each. Candidate names below are **not individually approved event-name literals**; D11 approves the strict allowlist-and-closed-subtype approach. Final names, fields, terminal status semantics and any event not directly observable in current engine code must be individually reviewed before the document can freeze.

| Candidate `payload.name` | Meaning and proof required | Subtype-specific data to specify later |
|---|---|---|
| `task.started` | Actual task execution started, not just request acceptance | `task_id`, task sequence, trustworthy start phase |
| `task.progress` | A real, instrumented task-phase transition | `task_id`, task sequence, reported actual phase |
| `worker.started` | A real worker dispatch began | `task_id`, task sequence, worker instance reference / role |
| `worker.completed` | A verified worker report was received | `task_id`, task sequence, worker instance reference, report status |
| `file.changed` | A confirmed file mutation was observed | `task_id`, task sequence, bounded path reference and verified change kind |
| `test.result` | An actual command/test result was obtained | `task_id`, task sequence, grounded status and sanitized summary |
| `task.completed` / `task.failed` | Real terminal engine outcome, not a guessed status | `task_id`, task sequence, typed outcome/provenance; explicit finality rules |

Mandatory constraints for the chosen closed-schema approach (with mechanics still pending):

1. Each task event has a canonical task identifier and **one sequencer for that task's outgoing event stream**; number assignment cannot come independently from multiple workers. Event IDs follow D2/D5 duplicate and correlation rules; an event does not grant authority or release the writer lease.
2. Define whether the **wire sequence is contiguous** (recommended for mechanically detecting missing records) and how a restarted process can resume/restore evidence without reusing a sequence number. Precise persisted acknowledgement and replay are separate follow-up work, not silently approved here.
3. Preserve real causal metadata where available: a worker instance reference is different from its reusable role; delivery order does not prove real-world worker execution order.
4. The bridge **must not synthesize** worker progress, modified files, test success or task completion from print logs, stderr, guessed timers or model prose. If current engine instrumentation does not expose an event, add instrumentation only under a later approved implementation contract; otherwise omit that event and report coverage limits.
5. Terminal events are not, by themselves, sufficient proof of cancellation completion, process teardown, filesystem consistency or release of a workspace writing lease. Main reconciles actual state according to C03-D7 and IIS01-D6.
6. Restrict payload content: sanitized structured fields, bounded text/path disclosure, no raw file contents, credentials or unrestricted logs. Numeric budgets and exact field schemas require later approval.

**Illustrative only — not a frozen fixture:**

```json
{"version":1,"type":"event","message_id":"evt_004","correlation_id":null,"payload":{"name":"worker.started","data":{"task_id":"task_001","sequence":4,"worker_ref":"worker_02","role":"SCOUT"}}}
```

### Rejected Option B — Minimal generic event data container

Use the already mandatory `task_id`, task-scoped sequence and event identity, but allow flexible additional keys in `payload.data` for different task/worker events. All approved D5 guarantees (truthful provenance, duplicate/gap detection, persistence and no fabricated outcomes) still apply, but subtype validators and tests would be weaker and Python/Electron could disagree over event details.

**Decision outcome:** The owner approved **Option A — Closed Event Schemas**. Every supported event subtype must be enumerated and have a separate closed, validated `payload.data` schema, with grounded provenance and task-scoped identification. The illustrative names and fields in this section are **not yet frozen wire literals**. Contiguous sequence semantics, SQLite replay guarantees, final subtype inventory, exact data fields, numerical limits and conformance fixtures remain separate gates. **IIS-01 is NOT FROZEN; implementation remains NOT AUTHORIZED.**

## 14. Integrated completion plan and decision status (2026-10-20)

The owner approved **IIS01-D12 Option A** and explicitly asked to **merge all remaining IIS-01 technical work into one consolidated paper** instead of reopening one decision per turn. Apply the same whole-paper drafting/review workflow to subsequent IIS documents. This workflow approval **does not** approve the proposed concrete field names, numeric limits, or test vectors below.

**Authority split (mandatory):**

- **OWNER-APPROVED, binding architectural/interface principles:** IIS01-D1 through IIS01-D12, plus all upstream frozen NCD-02/C-01/C-02/C-03 constraints. D12 approval is limited to Main-owned durable SQLite UI history, contiguous per-task sequence, and truthful gaps/unknowns **without** durable Python-side cross-process ACK/replay.
- **PRE-FREEZE PROPOSAL (historical status as drafted):** D13 exact field/data contracts and lifecycle; D14 numeric limits and bounded transport behavior; D15 examples/conformance vectors and finish criteria. The owner subsequently authorized consolidated review, corrections and freeze; the corrected §§16–18 are now normative v1.
- **NO TEST PASS CLAIM:** the conformance items below are *design fixtures*, not tests run against a real Electron/Python bridge.
- **NO CODE AUTHORIZATION:** do not change source files, approve a build or grant external implementation tool authority merely because the paper is complete as a proposal.

| Area | State | Source |
|---|---|---|
| D1–D11 | **APPROVED — Option A** | Existing §§2–13 |
| D12 contiguous task history, SQLite replay | **APPROVED — Option A** | §15 |
| D13 exact action/event schemas, replies, task lifecycle | **ADOPTED AFTER FFR-01-C01** | §16 |
| D14 numeric ceilings and backpressure | **ADOPTED AFTER FFR-01-C01** | §17 |
| D15 positive/negative conformance vectors | **ADOPTED AFTER FFR-01-C01** | §18 |

## 15. IIS01-D12 — APPROVED (2026-10-20): Contiguous per-task sequence and SQLite-backed UI replay

**Owner selection: Option A — SQLite-Backed Event History.** This is an approval of the strategy originally proposed in Draft v0.13. It is **not** Option B's durable Python journal plus ACK/replay, and it does not promise recovery of events lost during a child crash.

1. Every supervised coding task's event emitter has **one task-scoped serial sequencer**. Sequence starts at `1`, increments by `1` for each actually emitted event, and is shared across all workers in that task. Independent tasks have independent sequences.
2. Main validates connection/role/task scope and event schema before committing the accepted event to its SQLite history using uniqueness of `(task_id, sequence)` and event identity. On matching retransmission it does not create a duplicate record. A conflicting duplicate is an integrity failure, never an overwrite.
3. Only **successfully committed** records are authoritative for UI history. Main may display newly committed events immediately; renderer navigation or reload reconstructs visible history from SQLite.
4. If a record is absent or a process/pipe/database fails, Main **marks the gap or unknown outcome**; it does not invent a record, skip an unexplained expected sequence, silently declare success, or prematurely release a workspace writer lease.
5. Main must handle full queues, slow persistence, and broken pipes under finite bounds. Critical events cannot be silently dropped. An unresolvable persistence/transport fault forces conservative failure/uncertainty handling without unconstrained buffering.
6. This v1 is a **Main-side durable history guarantee**, not end-to-end exactly-once delivery. No extra top-level JSONL `type`, Python durable journal, cross-process ACK command, automatic child resurrection/replay, or background event service is approved.

**Rejected Option B:** a separate durable cross-process event acknowledgement/retransmission scheme. It increases coordination, persistence and crash-replay complexity in v1 and remains outside scope. Exact field schemas and numerical caps are the **proposed details** in §§16–18, not additional owner choices already made.

## 16. IIS01-D13 — CONSOLIDATED PROPOSAL: Complete v1 request, reply, event and failure schemas

**Status:** **APPROVED AS FROZEN v1.0 ENGINEERING BASELINE** by the owner’s consolidated review/freeze authorization, with documentary corrections in FFR-01-C01. These names, fields and statuses add no request actions beyond D3/D4 and no sixth top-level `type`.

### 16.1 Canonical framing, envelope, parser and identity

1. Each frame is **exactly one complete UTF-8 JSON object** followed by `LF` (`0x0A`) on child stdin/stdout, with no preamble. Optional `CR` before `LF` is **rejected** for canonical output and may be treated as protocol-invalid on input. Embedded textual line breaks must be JSON-escaped, not raw record separators. No UTF-8 BOM. Reject duplicate JSON keys **at all nesting depths**, NaN/Infinity, unpaired surrogates and trailing non-whitespace bytes. Never print Python logs to stdout; `stderr` is sanitized diagnostic text and never parsed into events.
2. Every root object has **exactly** `version`, `type`, `message_id`, `correlation_id`, `payload`; the existing approved D9 constraints apply. `version` is the integer `1` (Boolean forbidden). ID strings match `^[A-Za-z0-9_-]{1,64}$`.
3. IDs are allocated by each emitting endpoint using cryptographically strong randomness within the approved pattern; **both ends maintain a shared per-connection seen-ID set** and reject collisions, including collisions across sending directions. Examples here use readable deterministic IDs for test fixtures only. When processes restart, they establish a new connection and seen-ID scope; a stale response cannot match a new connection's outstanding-request table.
4. Only root `request`/`ready` have `correlation_id:null`. A request cannot itself be a response to a preceding request. A `response` always has `correlation_id` equal to one **outstanding, role-authorized request on that same connection**. A scoped `error` uses that correlation when safely available, else `null`. Unsolicited task events have `correlation_id:null` and are tied to the authorized child and `payload.data.task_id`, **never** to a model-issued action.
5. **Every request `payload` is exactly** `{ "action": string, "input": object }`; actions allowed are precisely `discussion.send`, `project.discover`, `project.read`, `task.execute`, `task.cancel`. Verify the direction/role before dispatch; unknown or unauthorized actions are rejected without invoking a backend. Reject extra keys at root, common payload, and each action/subtype data level.
6. **Every `response` `payload` is exactly** `{ "status": "accepted" | "completed" | "rejected", "result": object|null, "reason": object|null }`. `accepted` must have `result:null,reason:null`. `completed` must have `result` a closed typed result object, `reason:null`. `rejected` must have `result:null,reason:{"code":string,"message":string}` (exact two keys, sanitized). For operation failure after admission, use correlated `error`; it ends that request's response lifecycle. Do not put raw tracebacks in an error.
7. **Every `error` `payload` is exactly** `{ "code":string, "message":string, "retryable":boolean }`. A returned `retryable:true` is advice about an operation, **never permission to repeat `task.execute` or switch provider/model**. A connection-level error may have `correlation_id:null` (for example invalid framing or startup failure).
8. **Every `event` `payload` is exactly** `{ "name":enum, "data":object }`. Task-related event bodies are defined in §16.5 and include task identity, distinct event identity, sequence, and actual source. `ready` remains the **D2-approved exact** payload `{ "process_role": "discussion" | "coding_task" }` and is emitted once per child, without other keys.

**Request lifecycle (normative):** a non-task-execute request gets exactly one terminal `response.completed`, `response.rejected`, or correlated `error`; no `response.accepted` for these request actions. For **long-running `task.execute` only**, exactly one `response.accepted` is required after authorization/acceptance and before a possible `task.started`; it does not close the outstanding logical task operation. Python then sends exactly one grounded terminal task `event` (`task.completed`, `task.failed`, or `task.cancelled` if genuinely instrumented), after which Main closes the logical task operation only after durable recording/reconciliation. A correlated `error` before a terminal event closes that *command/transport attempt*, **not** the independently running task or its writer lease; Main classifies the task conservatively and reconciles independently. A `response.accepted` followed by an unrecognized/lost terminal event must **not** leave an unbounded pending request record: Main clears or marks the transport pending entry while persisting a separate task-level `unknown`/reconciliation record. A `task.cancel` request completes when the **cancel instruction is registered/forwarded**, not when task termination is verified. Never accept duplicate acceptance, multiple genuine terminal outcomes, or orphaned response correlation; on malformed/unknown outcomes, fail closed without inventing a terminal state.

**Scope of responsibility:** These wire-message relationships specify the transport-level contract only. Main's SQLite task state machine, approval ledger, transactional commits, per-workspace lease, user-facing reconciliation, and renderer subscriptions belong to IIS-02/IIS-04/IIS-05; this document does not invent a second owner of those records.

### 16.2 Five request input schemas — proposed exact contract

The fields below are **closed**: required unless marked `nullable`, fixed types (no coercion), JSON integer excludes Boolean. All strings require valid Unicode and source-specific length checks in §17. IDs use the same ASCII pattern as `message_id` unless otherwise specified. A Main-controlled session binds the workspace/conversation; declaring an ID in JSON never changes this authority.

| `action` (direction) | Exact `payload.input` fields (type) | Validation and restrictions |
|---|---|---|
| `discussion.send` (Main → Discussion) | `conversation_id:ID`, `user_message_id:ID`, `text:string`, `model_id:string`, `context_snapshot:ContextV1`, `project_ref:ID|null` | Only one Main-bound existing conversation. `user_message_id` names the original persisted user turn, not a second created message. `model_id` must be prevalidated by Main's model registry; no silent fallback. Context is selected/advisory, not execution authority. |
| `project.discover` (Discussion → Main) | `discussion_request_id:ID`, `directory:string`, `max_depth:integer`, `limit:integer`, `cursor:string|null` | Relative project path only; `"."` means workspace root. Main validates canonical workspace, exclusions, symlink/reparse escape, session binding and cursor provenance; discovery exposes no raw private content. |
| `project.read` (Discussion → Main) | `discussion_request_id:ID`, `path:string`, `start_line:integer`, `end_line:integer`, `max_chars:integer`, `expected_mtime_ns:decimal-string|null` | Relative text-file candidate, bounded inclusive 1-based lines, file unchanged if known metadata expected; Main screens sensitive data and can refuse whole file. No direct Python read. |
| `task.execute` (Main → Coding Task) | `task_id:ID`, `conversation_id:ID`, `task_goal:string`, `workspace_root:string`, `conversation_context:object|null` | Main has consumed explicit approved proposal and reserved task-specific writer lease **before this request**. Absolute canonical workspace must match child launch binding. `conversation_context` is the **already-frozen C-01 `ConversationContext`** serialized with its exact own schema (no replacement/downgrade). |
| `task.cancel` (Main → same Coding Task) | `task_id:ID` | Must match active task/child. A second or late cancel cannot target another process or confirm stop. |

**Mandatory broker scope binding:** `discussion_request_id` is the **outer message_id of an active, Main-issued `discussion.send` request on the same supervised Discussion connection**. Main must resolve it to the parent conversation, selected project/workspace and authorization/consent snapshot; the child may not choose a workspace or rely on whichever conversation happens to be newest. Expired/completed/foreign-turn IDs are rejected with no file discovery/read. This is a required field in **both** broker actions, including concurrent discussion turns. Because root requests retain `correlation_id:null` under D9, this binding is inside the request-specific `input`, not an extra envelope key or sixth command.

**Portable file timestamp:** `expected_mtime_ns` and `observed_mtime_ns` use an exact base-10 ASCII digit string (`^(0|[1-9][0-9]*)$`, integer magnitude bounded by the platform-supported timestamp), **not a JSON number**. Native nanosecond timestamps can exceed the JavaScript 2^53−1 safe-integer range. An exact source metadata comparison happens in Main using its lossless representation; null expected timestamp means freshness is not asserted by the caller.

**`ContextV1`** (value of `discussion.send.input.context_snapshot`, closed object):

- `recent_messages`: array of `{ "message_id":ID, "role":"user"|"assistant", "text":string }`; array order is oldest to newest.
- `summaries`: array of `{ "summary_id":ID, "text":string, "source_message_ids":array<ID> }`; an extracted summary never becomes a confirmed decision.
- `decisions`: array of `{ "decision_id":ID, "text":string, "approval_message_id":ID }`; Main includes only decisions with verifiable user-confirmation provenance.
- `context_revision`: integer `>=0`, Main-owned snapshot revision, not an entitlement token.

A ContextV1 is selected and bounded, not a full SQLite export. Triggers for **creating** summaries remain model-context-budget-pressure-based as approved in C-02; the array caps here bound transmission only. Do not invent user approvals from a model summary. Main controls disclosure policies for project excerpts to external LLMs as frozen in C-02; the **universal** external-send gate was expressly deferred by the owner (FFR-R01).

### 16.3 Closed synchronous result schemas

Each `response.completed.payload.result` is **exactly** one of the following action-specific objects. No `completed` result is permitted for `task.execute` because its final result belongs in a grounded task terminal event. Do not use `response.accepted` for a broker read/discovery or simple discussion in v1; their replies are completed/rejected/error.

| Action correlated to | Closed `result` object | Meaning |
|---|---|---|
| `discussion.send` | `answer:string`, `task_proposal:object|null`, `summary_candidates:array`, `decision_candidates:array` | `task_proposal` is either `null` or `{ "goal":string, "reason":string }`. Each summary candidate is `{ "text":string,"source_message_ids":array<ID> }`; each decision candidate is `{ "text":string,"source_message_ids":array<ID> }`. These are **non-authoritative suggestions**: only Main may issue a scope-bound `proposal_id` or validate a recorded user decision. |
| `project.discover` | `directory:string`, `entries:array`, `next_cursor:string|null`, `complete:boolean`, `excluded_count:integer` | Each entry is `{ "path":string,"kind":"file"|"directory","size_bytes":integer|null }`; result means that **this enumerated scope/page** was processed, not that the whole repository was read. `excluded_count>=0` need not disclose blocked path names. |
| `project.read` | `path:string`, `start_line:integer`, `end_line:integer`, `content:string`, `truncated:boolean`, `observed_mtime_ns:decimal-string`, `excerpt_sha256:string` | Returned lines refer to content actually inspected; SHA-256 is of emitted **UTF-8 excerpt bytes**, not a promise of entire-file hash. If full requested span unavailable, `truncated:true`. Main may reject an unsafe file instead of returning raw secrets. |
| `task.cancel` | `cancel_request_registered:boolean` (must be `true` on completed response) | The bridge has accepted and forwarded cancellation handling. **Not** evidence that the task stopped, workers exited, or file mutations were rolled back. |

Result bounds and exact array limits are in §17. A rejected broker request returns `response.rejected` with a sanitized error reason; a transient I/O failure can be a correlated `error`. A denied/oversized/sensitive file does not become an empty successful read disguising a denial. A requested span wholly beyond EOF (including a zero-line file) is rejected with sanitized `RESOURCE_LIMIT`, rather than manufacturing nonexistent line numbers. `project.read` success must return actual emitted inclusive line bounds, and any shortening must set `truncated:true`; an excerpt hash is computed over the exact emitted UTF-8 content.

### 16.4 Error classes and state machine — proposed

Proposed stable error-code enum (additional codes require a reviewed protocol revision):

`BAD_FRAME`, `BAD_SCHEMA`, `UNSUPPORTED_VERSION`, `DUPLICATE_MESSAGE_ID`, `INVALID_CORRELATION`, `INVALID_STATE`, `NOT_AUTHORIZED`, `WORKSPACE_MISMATCH`, `STALE_SOURCE`, `SENSITIVE_CONTENT`, `RESOURCE_LIMIT`, `PROVIDER_UNAVAILABLE`, `PROVIDER_TIMEOUT`, `STARTUP_FAILED`, `BROKER_IO_ERROR`, `INTERNAL_FAILURE`.

- `BAD_FRAME` is for malformed framing/UTF-8/JSON, duplicate JSON keys or incomplete line. `BAD_SCHEMA` is for correct JSON of the wrong shape/type/unknown key. Do not emit an error if output cannot be safely formed; close or fail the supervised connection instead and reconcile state conservatively.
- `UNSUPPORTED_VERSION`, wrong READY role, pre-READY application requests, duplicate READY, impossible IDs or protocol corruption are fatal to the child connection. A per-request `NOT_AUTHORIZED`, `SENSITIVE_CONTENT`, `STALE_SOURCE` or unsupported operation can be rejected without declaring child process ready/safe if the failure is isolated and the request was parsed.
- For child crash, pipe termination, malformed terminal event or deadline expiry, Main may set its **own** task state to `unknown` for reconciliation; `unknown` is not an invented Python engine `TaskOutcome` nor an allowed fake `event` status.
- `retryable` on provider/broker errors can be true only for **read-only** operations whose retry policy permits it. Retrying `task.execute` automatically is always forbidden, regardless of error code.

| Owner-view state | Entry requirement | Permitted next states / claims |
|---|---|---|
| `not_ready` | Child spawn | Only verified READY → `ready`; initialization failure → unavailable |
| `ready` | Verified one-way READY | Allowed requests may be admitted; no implied approval |
| `task_pending` | Main issued `task.execute` after consuming approval and acquiring lease | `response.accepted` → `task_accepted`; rejection/fatal error → reconciliation without claiming running |
| `task_accepted` | Python accepted command | Actual `task.started` → `task_running`; error/disconnect → `unknown` pending proof |
| `task_running` | Engine emitted sourced `task.started` | Real progress, `cancel_requested`, sourced terminal event, or `unknown` on loss |
| `cancel_requested` | Main/child registered cancel | Confirmed `task.cancelled` only with engine evidence; else task failure/success if actually observed, or unknown on loss |
| `terminal_recorded` | Main durably committed a sourced task terminal event | Still **not sufficient** to release writer lease until process-tree and workspace reconciliation |
| `unknown` | Lost evidence/DB failure/unconfirmed side effects | Remain visible, block unsafe writer reuse; only independently verified reconciliation may change status |

A task's terminal event is distinct from **its process teardown** and from **its writer-lease release**. Do not automatically mark a crashed child as verified `task.failed` from a missing exit event.

### 16.5 Closed event names and subtype-specific exact data — proposed

**All coding-task events** have common exact data keys:

- `task_id: ID` — exactly Main-issued task bound to the currently supervised child.
- `event_id: ID` — unique distinct identifier for this observed event, **separate from** the outer `message_id`.
- `sequence: integer >=1` — one contiguous task-owned emission sequence starting at 1.
- `source: string` — enum `agent_os` only in v1; this label is evidence provenance **from trusted bridge instrumentation**, never a model-supplied assertion.

Each listed subtype adds **only** the following required keys beyond those four; all fields are required. These exact names and data keys became **normative v1** upon the consolidated freeze review.

| `payload.name` | Additional closed data fields | Acceptance evidence |
|---|---|---|
| `task.started` | `phase: TaskPhase` | `AgentOS.execute_task` actually entered task execution; not mere request reception |
| `task.progress` | `phase: TaskPhase`, `detail:string` | Verified internal phase transition or bounded recorded progress |
| `worker.started` | `worker_ref:ID`, `role:WorkerRole` | Real dispatch invocation from engine, not a planned or model-described worker |
| `worker.completed` | `worker_ref:ID`, `role:WorkerRole`, `status:WorkerStatus`, `summary:string` | Actual structured `WorkerReport` returned |
| `file.changed` | `path:string`, `change_kind:"created"|"modified"|"deleted"` | Confirmed file state change; no raw content; never trust generated prose |
| `test.result` | `status:"passed"|"failed"|"skipped"`, `summary:string` | Real tool/test execution outcome with sanitized summary |
| `task.completed` | `outcome:TaskOutcomeV1` | Full actual engine `TaskOutcome.success==true` and `final_phase==COMPLETED` |
| `task.failed` | `outcome:TaskOutcomeV1` | Full actual engine `TaskOutcome.success==false`; no synthesized outcome from pipe failure |
| `task.cancelled` | `confirmation:string` | Trusted engine confirmation of cancellation; Main still verifies process-tree cleanup before lease release |

Enums `TaskPhase` and `WorkerStatus` are **the existing source contracts**, not speculative role definitions: `TaskPhase` = `INITIALIZING`, `EXPLORING`, `PLANNING`, `EXECUTING`, `VERIFYING`, `COMPLETED`, `FAILED`; `WorkerRole` = `SCOUT`, `SURGEON`, `INQUISITOR`; `WorkerStatus` = `SUCCESS`, `FAILED`, `BLOCKED`. The application must not invent new values without an approved schema update.

`TaskOutcomeV1` is the frozen current `architect.contracts.TaskOutcome` serialized exactly: `{ "task_id":ID, "success":boolean, "final_phase":TaskPhase, "summary":string, "total_ticks":integer, "rollbacks_triggered":integer, "final_checkpoint_hash":string|null }`. For a failed outcome, `final_phase` follows the actual `TaskOutcome` contract; do not require a fictitious field the engine does not have. This is a bounded transport view of the actual outcome, not an alternative source of truth. `task.cancelled` is a candidate **additional instrumentation hook**, never asserted available today; if not verifiable, Main records `unknown` when appropriate instead of inventing cancellation.

**Strict ordering and duplicates:** `sequence` is contiguous per task beginning with 1 and assigned once at emission, across workers. Main commits event `(task_id,sequence,event_id)` before renderer delivery; exact duplicate payload at existing key is an idempotent no-op, differing payload for same sequence or same event_id is an integrity failure. If Main receives seq 4 after seq 2, it records/flags expected seq 3 missing and **does not** pretend complete ordered history. With D12 Option A, Python is **not** required to maintain a durable journal for replaying event 3; processing stops or records uncertainty according to §17. Transport `response.accepted` and `task.cancel` acknowledgment do not allocate task-event sequences.

### 16.6 Closed-scope edge cases — proposed normative policy

- A Discussion child cannot generate coding-task events, call `task.execute`, gain a project-writing capability, or use broker responses as authority to write.
- A coding-task child cannot choose another workspace, switch its task ID, mint a Run Task approval or ask Electron to bypass SQLite. It may emit only task events and responses/errors for its assigned task.
- Source-scoped file discovery/read permissions are checked by Main on **each** broker request. Escape through symlink/junction/reparse point, path traversal, race, oversize or sensitive content is denied by the upstream broker policy; do not assume Windows process isolation exists.
- Memory summaries and proposals from `discussion.send` remain candidates. Electron Main is the owner of persisted messages, user-approval evidence, proposal `proposal_id`, and single-use scope/TTL/goal binding.
- No new request actions are required for Python shutdown, telemetry, `worker.dispatch`, user approvals, renderer routing, SQLite commits or archive management. Ordinary child EOF, Main process supervision and already-approved task cancellation control these lifecycles.

## 17. IIS01-D14 — CONSOLIDATED PROPOSAL: Numeric limits, parser deadlines and bounded flow control

**Status:** **APPROVED v1 ENGINEERING DEFAULTS AND HARD CEILINGS AFTER CONSOLIDATED REVIEW**. These are proposed design values now frozen by owner authorization, **not performance measurements or evidence of successful load tests**. Tighter operational limits may be set in IIS-03/IIS-05, but hard wire ceilings cannot be increased without versioned contract review.

| Boundary | Candidate v1 hard/default value | Handling when exceeded |
|---|---|---|
| Complete JSONL record including LF | **262,144 UTF-8 bytes (256 KiB)** | Reject frame/close affected connection on protocol abuse; never allocate unbounded buffer |
| Incomplete line buffer | **262,144 bytes maximum**, **15 s** maximum without LF after first byte | Fail connection with `BAD_FRAME` if safely reportable; Main reconciles task state |
| READY after child spawn | **30 s** | Child startup failure; no requests, separate restart subject to supervisor policy |
| `discussion.send` user `text` | **16,384 Unicode code points** | `RESOURCE_LIMIT`; no silent truncation of user intent |
| `discussion.send` `context_snapshot` serialized size | **96 KiB**; max 20 recent messages, 10 summaries, 20 decisions | Main selects smaller verified context; no automatic unbounded full-history export |
| `discussion.send` model response `answer` | **32,768 Unicode code points** | Provider/service produces bounded/truncated response with transparent user-facing notice; never truncate a JSONL frame mid-JSON |
| `model_id`, `task_goal`, returned candidate text | 128, 16,384, and 2,048 code points respectively | Validate source-side and destination-side |
| One broker `project.discover` page | `max_depth` **1–3**; `limit` **1–100** entries; cursor ≤128 chars | Continue in later bounded pages; counted exclusions need not expose names |
| One broker `project.read` | `start_line>=1`, `end_line>=start_line`, span ≤**200 lines**, `max_chars` **1–16,384**, excerpt ≤**16,384 characters** | Return accurate `truncated` or safe rejection; no best-effort sending of unscanned source content |
| Broker file metadata wire representation | `expected_mtime_ns` and `observed_mtime_ns` are **decimal strings**, not JSON integers; exact comparison only | Reject non-digit, negative, floating-point, ambiguous/unsafe-conversion metadata |
| Max broker request elapsed time | **30 s** | `BROKER_IO_ERROR` or `RESOURCE_LIMIT` and report incomplete coverage |
| Discussion LLM attempt wall-clock | **300 s** per attempt | `PROVIDER_TIMEOUT`; finite operation-level retry only where approved and safe |
| In-flight requests per child | **16** general; coding-task child: at most **1** execute plus **1 reserved cancel** | New non-control calls rejected/backpressured; cancel reception remains responsive |
| Received unprocessed event queue (Main per child) | **256 records and 8 MiB**, whichever reached first | Apply transport pause/backpressure, no silent critical drop; saturated failure becomes incomplete/unknown |
| Pending outbound records per child | **256 records and 8 MiB**, whichever reached first | Await bounded drain; do not block the incoming cancel reader or pile up RAM |
| Sustained queue saturation | **30 s** | Fail affected producer/connection safely, mark event history incomplete; reconcile process/lease |
| Graceful task cancellation | **15 s** after accepted cancel request before Main-controlled escalation | Attempt supervised process-tree termination; do not report canceled/cleaned until independently verified |
| `reason.message`, `error.message`, progress/worker/test summaries | **2,048 characters each** | Sanitize, reject oversize diagnostic content, never log secrets/raw prompt/file content |

**Safety mechanics rather than an invented sixth message type:**

1. Use operating-system pipe pressure (`stdin` writer drain and `stdout` pausing) plus bounded internal queues. No new `flow.pause`, `event.ack` or heartbeat actions in protocol v1. Producer output must be awaitable; nonblocking task cancellation has a reserved input-processing path.
2. Main validates per-byte limits while reading, **before** trying to JSON-parse an unbounded accumulation. A process that repeatedly emits malformed/oversize records is unavailable; the renderer gets a conservative transport error, not a guessed task result.
3. Main commits task events transactionally in SQLite; a committed event may be shown in Mission Control. If SQLite stalls or fails, Main cannot silently discard critical events or treat a terminal event as durable; it pauses intake within fixed caps, then fails/reconciles if needed.
4. Every file/data length check is enforced at both boundaries where applicable; upstream C02/D17 security and secret scanning can be stricter. External provider consent stays required where previously approved; owner-deferred global outbound LLM gate is **not** reinstated.
5. Repeated cancellation, disconnect while cancellation is pending, slow provider, abrupt task exit, saturated queue and renderer reload must not release the writer lease or create a fake `task.completed` event. No automatic full-task retry.
6. Numeric limits are **v1 cross-process contract** values for proposed review, not evidence from load tests. Benchmark/test results may justify correction before freeze.

## 18. IIS01-D15 — CONSOLIDATED PROPOSAL: Shared conformance fixtures and freeze acceptance

**Status:** **APPROVED v1 CONFORMANCE PLAN AFTER CONSOLIDATED REVIEW**. D8's testing philosophy and the precise fixtures/acceptance coverage below are binding design requirements, **not executed Electron/Python runtime tests**.

### 18.1 Positive wire fixtures (synthetic demonstration only)

The following messages intentionally use short, repeatable fixture IDs; validators in production still enforce per-connection unique IDs. Each JSON value must appear on **one line followed by LF** in actual transport. Sample workspace path and IDs are placeholders, not real authorization grants.

```jsonl
{"version":1,"type":"ready","message_id":"ready_001","correlation_id":null,"payload":{"process_role":"discussion"}}
{"version":1,"type":"request","message_id":"req_001","correlation_id":null,"payload":{"action":"discussion.send","input":{"conversation_id":"conv_001","user_message_id":"msg_001","text":"Explain the project","model_id":"chosen-model","project_ref":null,"context_snapshot":{"recent_messages":[],"summaries":[],"decisions":[],"context_revision":0}}}}
{"version":1,"type":"request","message_id":"py_req_002","correlation_id":null,"payload":{"action":"project.discover","input":{"discussion_request_id":"req_001","directory":".","max_depth":1,"limit":20,"cursor":null}}}
{"version":1,"type":"response","message_id":"m_res_002","correlation_id":"py_req_002","payload":{"status":"completed","result":{"directory":".","entries":[{"path":"src","kind":"directory","size_bytes":null}],"next_cursor":null,"complete":true,"excluded_count":0},"reason":null}}
{"version":1,"type":"request","message_id":"py_req_003","correlation_id":null,"payload":{"action":"project.read","input":{"discussion_request_id":"req_001","path":"src/main.py","start_line":1,"end_line":3,"max_chars":120,"expected_mtime_ns":null}}}
{"version":1,"type":"response","message_id":"m_res_003","correlation_id":"py_req_003","payload":{"status":"rejected","result":null,"reason":{"code":"SENSITIVE_CONTENT","message":"File excerpt not available"}}}
{"version":1,"type":"request","message_id":"py_req_004","correlation_id":null,"payload":{"action":"project.read","input":{"discussion_request_id":"req_001","path":"src/safe.py","start_line":1,"end_line":1,"max_chars":120,"expected_mtime_ns":null}}}
{"version":1,"type":"response","message_id":"m_res_004","correlation_id":"py_req_004","payload":{"status":"completed","result":{"path":"src/safe.py","start_line":1,"end_line":1,"content":"print(\"hello\")\n","truncated":false,"observed_mtime_ns":"1760860000000000000","excerpt_sha256":"b80792336156c7b0f7fe02eeef24610d2d52a10d1810397744471d1dc5738180"},"reason":null}}
{"version":1,"type":"response","message_id":"py_res_001","correlation_id":"req_001","payload":{"status":"completed","result":{"answer":"This is a local project.","task_proposal":null,"summary_candidates":[],"decision_candidates":[]},"reason":null}}
```

The next stream is for a **separate new Coding Task child** after its own valid READY. The Main has independently obtained Run Task approval and writer ownership before `task.execute`; merely replaying these messages in a fixture does not authorize execution.

```jsonl
{"version":1,"type":"ready","message_id":"py_ready_002","correlation_id":null,"payload":{"process_role":"coding_task"}}
{"version":1,"type":"request","message_id":"m_task_001","correlation_id":null,"payload":{"action":"task.execute","input":{"task_id":"task_001","conversation_id":"conv_001","task_goal":"Add a documented function","workspace_root":"C:/example/workspace","conversation_context":null}}}
{"version":1,"type":"response","message_id":"p_task_accepted","correlation_id":"m_task_001","payload":{"status":"accepted","result":null,"reason":null}}
{"version":1,"type":"event","message_id":"p_evt_001","correlation_id":null,"payload":{"name":"task.started","data":{"task_id":"task_001","event_id":"event_001","sequence":1,"source":"agent_os","phase":"INITIALIZING"}}}
{"version":1,"type":"request","message_id":"m_cancel_001","correlation_id":null,"payload":{"action":"task.cancel","input":{"task_id":"task_001"}}}
{"version":1,"type":"response","message_id":"p_cancel_resp","correlation_id":"m_cancel_001","payload":{"status":"completed","result":{"cancel_request_registered":true},"reason":null}}
{"version":1,"type":"event","message_id":"p_evt_002","correlation_id":null,"payload":{"name":"task.failed","data":{"task_id":"task_001","event_id":"event_002","sequence":2,"source":"agent_os","outcome":{"task_id":"task_001","success":false,"final_phase":"FAILED","summary":"Synthetic verified failure for fixture only","total_ticks":1,"rollbacks_triggered":0,"final_checkpoint_hash":null}}}}
```

The final `task.failed` line is **synthetic schema-test data**, not evidence that an actual engine run failed; no runtime execution or rollback is claimed. No `task.cancelled` event appears because **a cancellation request is not cancellation proof**. In real execution, `task.completed`/`task.failed` requires an actual `TaskOutcome`, never a guessed sample success or failure.

### 18.2 Negative fixture matrix (minimum required)

| Fixture group | Invalid mutation / condition | Mandatory detection / effect |
|---|---|---|
| Framing | Non-UTF8 bytes, BOM, duplicate JSON keys, missing LF, >256 KiB partial frame | Reject/fail boundedly; never accept as READY or TaskOutcome |
| Envelope | Unknown top-level `kind`, missing `correlation_id`, string `version`, Boolean `sequence`, extra root key | `BAD_SCHEMA` or `BAD_FRAME`, no side effect |
| Identity | Duplicate ID across two directions; stale response `correlation_id` after child restart; wrong accepted-request correlation | Reject and never misattribute a result |
| Startup | Pre-READY request, duplicate/wrong-role READY, late READY after timeout | Child unavailable; no task or broker work |
| Allowlist | Discussion child sends `task.execute`; coding child requests `project.read`; Python attempts new command `worker.dispatch` | Reject `NOT_AUTHORIZED`, no execution |
| Approval | Task goal or workspace differs from Main-bound approved proposal; duplicate task execute | Reject; writer lease cannot be bypassed |
| Read broker | `../` traversal, symlink/reparse escape, sensitive file, stale `mtime_ns`, non-decimal/unsafe timestamp, foreign/expired `discussion_request_id`, over-cap span | Deny/return sanitized refusal; no wrong-conversation access or raw leak |
| Result | `response.accepted` with nonnull `result`; `task.execute` `response.completed` claiming success; wrong outcome shape | Reject as invalid state/schema |
| Cancellation | `task.cancel` while busy, repeated cancel, task change during cancel, child unresponsive | Nonblocking cancel reader; conservative stop/unknown; no lease release by ack |
| Events | `worker.completed` without worker report; duplicate seq with different event_id; gap 2→4; forged event after child exit | Reject/conflict/gap; no fake Mission Control record |
| Crash/reload | Renderer reload, SQLite commit failure, stdout EOF after unconfirmed writes | Replay **committed** only; mark uncertainty; no automatic replay of unpersisted Python event |
| Flow | Fast events vs slow SQLite, bounded queue overflow, huge `answer`, context over budget | Bounded memory and explicit pressure/error/reconciliation |
| Compatibility | Unknown protocol version or unrecognized subtype, secret-containing error | Reject/sanitize and fail closed at boundary |

### 18.3 Minimum executable test layers and traceability

1. **Schema unit tests:** both Python and TypeScript independently validate every example and every invalid mutation; equality of acceptance/rejection is required. Check exact keys, enum values, nullability, duplicate keys, numeric bounds and strict UTF-8.
2. **Cross-process integration:** real process launch, one READY, two-way request/response correlation, broker authorization, a Main-authorized single task, cancel reception while running, stderr/ stdout separation, process exit and replacement READY.
3. **SQLite and renderer history:** transaction failure, dedup identical `(task_id, sequence, event_id)`, collision mismatches, visible gap, UI reload reconstruction and unknown-state handling. Verify Main never treats a noncommitted event as durable.
4. **Fault/pressure tests:** partial frames, oversized frames, malformed stdout, disconnected child, provider timeout, 256-record queue saturation, bounded 30-second pressure, a 15-second cancellation escalation and cleanup verification (simulate time passage with controlled clocks when feasible).
5. **Existing-engine regressions:** preserve `AgentOS`, its `ConversationContext` validation and existing golden behaviors. Synthetic `worker.started` and `file.changed` fixtures are **not** evidence of actual runtime instrumentation; test real hooks before claiming feature completeness.
6. **Audit evidence:** record source commit/SHA, test environment, exact commands, counts of PASS/FAIL/SKIP, known non-claims and any deviation from this frozen interface. **Do not claim tests passed before running them.**

### 18.4 Freeze decision checklist — documentary review completed

- [x] Every owner-approved D1–D12 contract rule is covered by traceable binding invariants; earlier decision narratives are retained as history.
- [x] The owner authorized consolidated review-and-freeze; FFR-01-C01 corrected the v1 schemas/fixtures and adopted D13–D15.
- [x] No action, top-level type, model authority, workspace permission or global outbound LLM policy added beyond frozen approvals.
- [x] No untestable success/recovery guarantee, misreported existing engine hook, or hidden durable Python replay.
- [x] Cross-language schema behaviors and sample conformance vectors are explicit design requirements; implementation verification remains pending.
- [x] Final review confirms design consistency with NCD-02, C-01, C-02 and C-03; the user explicitly requested freeze after review.

**Implementation and testing remain separate future authorizations.** Source modifications to the Next Code runtime and Desktop are not approved by a specification freeze alone.

## 19. Consolidated decision register and final freeze disposition

| Decision | Status | What the document now establishes |
|---|---|---|
| IIS01-D1 | **OWNER-APPROVED — 2026-10-19** | Five top-level message types and `type` discriminator. |
| IIS01-D2 | **OWNER-APPROVED — 2026-10-19** | One process-bound `ready` and scoped unique IDs/correlation. |
| IIS01-D3 | **OWNER-APPROVED — 2026-10-19** | Three minimal Discussion/Read-broker request actions. |
| IIS01-D4 | **OWNER-APPROVED — 2026-10-19** | `task.execute` and `task.cancel` only for Coding Task bridge. |
| IIS01-D5 | **OWNER-APPROVED — 2026-10-19** | Grounded per-task sequenced events and trustworthy UI replay requirement. |
| IIS01-D6 | **OWNER-APPROVED — 2026-10-19** | Acceptance/finality/cancel distinctions, errors and unknown-state safety. |
| IIS01-D7 | **OWNER-APPROVED — 2026-10-19** | Finite queues/frames with bounded backpressure and no silent critical loss. |
| IIS01-D8 | **OWNER-APPROVED — 2026-10-19** | Contract-driven conformance testing and auditable evidence gate. |
| IIS01-D9 | **OWNER-APPROVED — 2026-10-19** | Strict five-key v1 envelope and common closed payloads. |
| IIS01-D10 | **OWNER-APPROVED — 2026-10-19** | Exact per-action schema *principle* for all five approved actions. |
| IIS01-D11 | **OWNER-APPROVED — 2026-10-19** | Closed task/worker event schema *principle*; subtype literals had been left open. |
| IIS01-D12 | **OWNER-APPROVED — 2026-10-20** | Option A — contiguous event sequence plus Main-owned SQLite durable UI history; no Python-side ACK/replay. |
| IIS01-D13 | **APPROVED — 2026-10-20 CONSOLIDATED FREEZE REVIEW** | Closed action input/result/event/error contracts, including broker-turn scope and lossless file timestamps. |
| IIS01-D14 | **APPROVED — 2026-10-20 CONSOLIDATED FREEZE REVIEW** | Finite record/queue/time and content-size caps; bounded backpressure. |
| IIS01-D15 | **APPROVED — 2026-10-20 CONSOLIDATED FREEZE REVIEW** | Positive/negative fixtures, test matrix and verification gates; actual runtime tests pending. |

**Final disposition:** The owner authorized combined paper review, correction and freeze. FFR-01-C01 resolved the broker parent-turn authorization gap, lossless file metadata representation and long-running task command lifecycle, and validated the revised JSONL fixtures. D1–D12 remain unchanged owner approvals; D13–D15 are now adopted as the v1 specification. **Status: FROZEN v1.0. Implementation and runtime test execution: NOT AUTHORIZED.**
