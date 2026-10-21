# NEXT CODE DESKTOP — NCD-03 / IIS-05
## Real-Time Events & Mission Control — Grounded Ingestion, Committed Replay, Worker Timeline and Truthful UI

**Status:** **FROZEN v1.0 — OWNER APPROVED / DOCUMENTARY DESIGN — 2026-10-20**  
**Date:** 2026-10-20  
**Authority:** NCD-00 v1.0 with NCD-00-C01; NCD-01 v1.0; NCD-02 v1.0; NCD-03/C-01, C-02, C-03 v1.0; IIS-01, IIS-02, IIS-03 and IIS-04 **FROZEN v1.0**.  
**Implementation authorization:** **NONE.** No repository edits, new runtime hooks, Python/Electron development, real SQLite operations, UI construction or execution tests are authorized by this document.  
**Tool independence:** This standard does not identify or depend on an external implementation agent or IDE.  
**Document rule:** The owner approved the corrected Draft v0.2, its fifteen IIS05-D01–D15 decisions and FFR05-01–FFR05-08 corrections as **FROZEN v1.0**. Wording such as “proposed”, “candidate” and “pending approval” within this document records the pre-freeze review stage, not an active unresolved gate. The corrected normative clauses in §§1–18 and §20 are binding within IIS-05 scope, subject to the higher authority of already-frozen parents; no parent contract is silently amended. §§19–20 preserve review provenance. §21 and the independent Final Freeze Record resolve the final status. The original v0.1 and corrected v0.2 are archives. **FFR-01 repair precedence:** §§5–18 incorporate the corrective rules; §20 records the amendments.

---

## 1. Scope, outcomes and explicit non-goals

IIS-05 specifies how **actual instrumented Next Code Coding Task facts** travel through the private IIS-01 JSONL connection, are admitted by IIS-03, committed by IIS-04, and are projected through the **already-frozen IIS-02** API into the NCD-01 **Agents / Mission Control** UI. It also defines truthful behavior under missed events, renderer reload, IPC notification loss, task cancellation and uncertain process cleanup.

**Required outcomes** (IIS05-R01–R09):

1. **R01 — Veracity:** Visible progress, worker activity, file changes, tests and task finality have appropriate engine, supervisor or committed-database evidence. User-facing text never promotes model prose, stderr or acceptance acknowledgements into verified runtime facts.
2. **R02 — Single authority:** Electron Main remains the authority for child identity, task binding, SQLite writes, admission/cancellation and sanitization. React is a consumer, not an event authority.
3. **R03 — Exact existing boundaries:** Reuse the five IIS-01 outer message types, five wire request actions, nine frozen Coding Task event subtypes, 23 IIS-02 Promise methods and three typed subscriptions. Do not invent another protocol or public Renderer API.
4. **R04 — Ordered durable history:** A task timeline comes from committed `task_events`, ordered by per-task integer `sequence`; integrity metadata comes from `task_event_streams`.
5. **R05 — Real worker identities:** Distinct temporary-worker invocations appear as distinct entries even for repeated roles, with no assumed dispatch order.
6. **R06 — Catch-up after interruption:** A renderer that navigates, sleeps, reloads or misses a push can reconstruct the supported visible truth from SQLite, subject to explicit gaps/uncertainty.
7. **R07 — Safe long-running lifecycle:** UI subscription or navigation never starts, retries, cancels, kills or rebinds Coding Task execution. Run Task and cancellation retain their frozen approval semantics.
8. **R08 — Bounded operation:** Main and Renderer have finite memory, frames, pages, listeners and queues, including a control-priority path under heavy event load.
9. **R09 — Testable failure states:** UI distinguishes known recorded outcomes, unknown live status, incomplete histories and unverified OS cleanup; a green completion badge cannot be deduced from missing evidence.

**Non-goals:** New `AgentOS` orchestration logic; new worker roles; arbitrary telemetry; a distributed message bus; Python-side durable ACK/retransmission; WebSockets/TCP/HTTP; extra JSONL `type` or action; new SQLite tables; a dynamic Renderer channel API; real-time token streaming for discussion; interactive shell implementation; model/provider routing; agent plugin hosting; cloud persistence; engine modifications without a separate permission. Those areas are either settled upstream or deferred to IIS-06/07/08 and an eventual implementation plan.

## 2. Normative precedence and source-to-surface matrix

| Frozen authority | Existing normative fact | IIS-05 responsibility |
|---|---|---|
| NCD-01 D-UI-04, D-UI-05, D-UI-06 | Distinct Agents page: Mission Header, non-fixed worker Execution Timeline, selectable Agent Inspector; Agents Dock hidden on entry; task persists across navigation | Visual semantics and state-derived projections, not redesign |
| C-03 D5–D8 | Exact scoped Coding Task, trusted events, supervised cancellation, Main-owned history | End-to-end observability contract |
| IIS-01 D1/D5/D11/D12/D13/D14/D15 | Strict JSONL; nine closed events; task-local contiguous sequences starting at 1; Main-side SQLite replay; finite hard ceilings | Map each event to UI without adding wire keys/actions |
| IIS-02 v1.0 | 23 fixed Promise methods; `subscribeTask`, `subscribeConversation`, `subscribeStatus`; eight named push notifications; `TaskEventPage`/`TaskView` | No extra public method, DTO authority or channel |
| IIS-03 v1.0 | Bound child sessions/roles; verified READY; one active Coding Task globally, 20 queued; cancellation and process-tree reconciliation | Accept session provenance only from Main-supervised runtime |
| IIS-04 v1.0 | 22 tables; transaction T4; `task_events`, `task_event_streams`, `tasks`, leases/slot; only COMMIT makes event publishable | Read/notify/presentation mechanics without a second event journal |
| C-02 and IIS-04 | Discussion/inspection/consent are separate, provenance-preserving | Do not turn broker inspection hints into Coding Task worker events |

**Explicit authority split:** `task.execute` acceptance ≠ actual `task.started`; an engine terminal `TaskOutcomeV1` ≠ verified Windows child/descendant cleanup; cleanup ≠ automatic undo of workspace modifications; a queued task ≠ an active worker. These are separate states and sources.

## 3. Logical end-to-end path and evidence classes

```text
Verified AgentOS/worker/tool facts
         | only explicitly instrumented Coding Task bridge events
         v
Python coding_task child: IIS-01 exact `event` + task-local sequence
         | stdout JSONL; stderr reserved for diagnostics
         v
IIS-03 supervised reader (Main-held child session, READY, task binding)
         | strict frame / role / event / session validation
         v
IIS-04 T4 serialized SQLite admission
         | immutable event row + integrity cursor + grounded task transition; COMMIT
         +---------------------> IIS-02 scoped TaskEventCommitted / TaskStateChanged HINT
         |                                                              |
         v                                                              v
IIS-02 tasks.read / tasks.readEvents <----- React subscribe-before-snapshot catch-up
         |
         v
Mission Header / worker timeline / Agent Inspector / truthful status
```

**Evidence levels — proposed internal interpretation, not extra wire fields:**

- **E0 / UI-only:** A local selection, loading spinner, tab change, tentative connection state, uncommitted pending display. No task or worker fact may be inferred from E0.
- **E1 / Main-authorized database state:** Admitted `starting`/`queued`, registered cancel request, slot/lease and `needs_reconciliation`. May be shown as state **with its precise meaning**, not as engine progress.
- **E2 / Main-committed engine event:** A `task.started`, `worker.started`, `worker.completed`, `file.changed`, `test.result` or terminal event validated under IIS-01/IIS-03 and durably committed under IIS-04. E2 proves the fact represented by that event, not later activity or cleanup.
- **E3 / Independently reconciled OS/project state:** Verified child/descendant cessation and workspace safety from IIS-03/IIS-04. Only E3 combined with the relevant durable state transition permits a lease/slot release claim.

E0–E3 are explanatory, *internal semantic labels only*; they SHALL NOT be serialized as new IIS-01 event fields or new IIS-02 public DTO requirements.

## 4. Coding Task instrumentation and availability gate

**IIS05-D01 — Frozen boundary The Python integration bridge MAY emit only the frozen nine event subtypes, only after acquiring real evidence at an actual engine boundary. An internal bridge may be implemented later, with separate authorization, around existing `AgentOS.execute_task`, real worker-dispatch calls, structured `WorkerReport`s, observed file effects, and real test execution. No instrumentation is deemed available merely because its name is specified here.

| Emission claim | Minimum actual evidence | Forbidden substitution |
|---|---|---|
| `task.started` | `AgentOS.execute_task` has actually entered the task execution lifecycle | `task.execute` request accepted, child READY, DB row `starting` |
| `task.progress` | Identified engine phase transition or verified bounded progress record | Generated narrative or wall-clock extrapolation |
| `worker.started` | Real invocation/dispatch of an ephemeral worker with an assigned `worker_ref` | A plan proposing that worker or display of role name |
| `worker.completed` | Actual returned structured `WorkerReport` with matching worker invocation and status | A likely response, missing process, summary text without a report |
| `file.changed` | Confirmed real file-state change attributable to the bound task | Proposed diff, file name in model answer, unverified preview |
| `test.result` | Actual executed test/tool result and sanitized summary | “Tests passed” in a generated answer |
| `task.completed` | Complete actual `TaskOutcomeV1` with `success=true` and `final_phase=COMPLETED` | Child exit code 0, response ACK, successful worker |
| `task.failed` | Complete actual `TaskOutcomeV1` with `success=false` | Pipe error, forced child kill, missing event |
| `task.cancelled` | Explicit trustworthy engine confirmation of cooperative cancellation | Accepted cancel request, OS kill or elapsed timeout |

**Availability rule:** If the actual Next Code engine lacks a needed instrumented hook, do not pretend the event exists. Preserve the task state and show **“detailed live activity unavailable / not verified”** where appropriate. A later hook implementation is a separate, scoped and tested engine-change authorization—not an implicit part of this design freeze.

**Allowed missing detail:** `worker.completed.summary` is a bounded worker-report summary, **not automatically a complete downloadable report**. The IIS-01 wire does not expose a full worker task contract, token stream, per-worker file list or per-worker tests. Their absence must be rendered as unavailable, not inferred.

## 5. Strict wire event conformance and attribution limits

**IIS05-D02 — Frozen no-schema-drift rule Each accepted Coding Task event keeps the exact IIS-01 envelope `{version,type,message_id,correlation_id,payload}`; `type="event"`, `correlation_id=null`, and `payload={name,data}`. Every subtype's common `data` is exactly `{task_id,event_id,sequence,source}` plus its frozen required subtype keys. `source` is `agent_os`; assigning a task ID, session reference or source label by a model does not establish authority.

| Frozen event | Extra keys exactly as IIS-01 v1 | Natural UI projection | Important limit |
|---|---|---|---|
| `task.started` | `phase` | Mission Header: grounded running, phase | Not an estimate of elapsed work |
| `task.progress` | `phase`, `detail` | Phase indicator / task-level timeline record | No invented percentage; detail is sanitized |
| `worker.started` | `worker_ref`, `role` | New temporary-worker invocation | Does not prove it remains active indefinitely |
| `worker.completed` | `worker_ref`, `role`, `status`, `summary` | Close matching worker invocation, show recorded report summary | `SUCCESS` is worker status, not task success |
| `file.changed` | `path`, `change_kind` | Task-level file activity | **No `worker_ref` on wire**: cannot attribute to an individual worker |
| `test.result` | `status`, `summary` | Task-level verification activity | **No `worker_ref` on wire**; does not imply whole task passed |
| `task.completed` | `outcome` | Engine completion evidence/summary | OS cleanup or lease release still separately verified |
| `task.failed` | `outcome` | Engine failure evidence/summary | Engine failure is not the same as Windows interruption |
| `task.cancelled` | `confirmation` | Verified engine cancellation evidence | No fabricated cancellation from `tasks.cancel` response |

Frozen enums remain exactly: `TaskPhase={INITIALIZING,EXPLORING,PLANNING,EXECUTING,VERIFYING,COMPLETED,FAILED}`; `WorkerRole={SCOUT,SURGEON,INQUISITOR}`; `WorkerStatus={SUCCESS,FAILED,BLOCKED}`. No guessed statuses such as `PAUSED`, `RETRYING`, `SKIPPED_WORKER` or `CANCELLED_WORKER` are introduced as wire values. `TaskOutcomeV1` retains exactly its frozen seven fields, including `final_checkpoint_hash:null|string`.

**Attribution restriction:** Under this wire contract, a file change or test record has **task-level** provenance only. It MUST NOT appear in an individual worker inspector as a change/test *performed by that worker* unless that association is independently derived from a frozen, trusted existing record that expressly establishes it. Mere adjacency of event sequences, worker roles, overlapping time windows, model narratives or guessed call stacks do not establish attribution. The default v1 inspector presents the task-level activity separately.

## 6. Event ingress and atomic durability — Main-owned pipeline

**IIS05-D03 — Frozen required processing order

1. The supervised child stdout reader applies the frozen byte/line/UTF-8/JSON and connection limits. A malformed record does not reach React or become a trusted event.
2. Validate current bound child session, process role `coding_task`, READY state, task ID, workspace/task association and session provenance **from Main's supervisor**. Cross-task or Discussion-originated coding events fail closed.
3. Validate the exact nine-subtype event schema, closed enums, bounded content, per-connection outer-message identity, per-task `sequence>=1`, unique `event_id`, the actual engine source and actual lifecycle feasibility.
4. Canonicalize the **validated typed** event deterministically and compute the digest per IIS-04 T4, with no lossy JSON number handling and no alternate model/user-controlled canonicalizer.
5. In IIS-04's serialized transaction, insert the immutable event row and observed `process_session_ref`; update `max_seen`, `complete_through`, integrity and grounded task state together. A same-key same-content replay is a no-op; a key/content collision records a sticky integrity incident without rewriting the prior row.
6. After **successful COMMIT only**, publish a bounded `TaskEventCommitted` notification hint, plus `TaskStateChanged` when an actual durable task projection changed. The hint never precedes durability; on deduplicated replay it does not trigger an additional “new event” presentation. A Python frame with a reused **outer `message_id` on the same supervised connection** is first rejected under IIS-01 even if its task-event data happen to match an earlier event. IIS-04 T4 idempotence applies to otherwise-valid, session-authorized events (e.g. distinct valid envelope identity with the same event ID/sequence/digest); it is **not** an exception to IIS-01 message-ID uniqueness.
7. The Renderer uses the frozen `tasks.readEvents` / `tasks.read` queries to establish authority and may update from sanitized committed notification projections only under the same verification constraints. If notifications are lost, the SQLite read still recovers committed history.

**DB outage:** Saturate only within inherited finite queues/timeout; apply backpressure; do not write an unbounded process memory journal and do not send “committed” notifications for rolled-back events. If the producer becomes unsafely unsustainable, mark the runtime/task uncertain under the existing supervisor/DB policy; retain writer exclusion until reconciliation. The UI shows `DATABASE_UNAVAILABLE`/unknown as appropriate and never silently turns an uncommitted `task.completed` into a green badge.

**No new persistence entity:** The event journal is precisely IIS-04 `task_events` and `task_event_streams`. Main/Renderer may keep disposable caches for display; these are not an additional durable store or engine event source. `task_event_streams.last_incident_code/at` retain bounded conflict evidence, not a novel incident log.

## 7. Task state and outcome projection

**IIS05-D04 — Frozen source-based lifecycle rules The user-facing Mission Header and status badge derive from the durable `TaskView` + event integrity and reconciliation evidence, **never** merely from the most visually recent row. Distinguish these concepts:

| Condition | What the UI may say | What it must not say |
|---|---|---|
| Proposal shown only | “Ready for explicit Run Task approval” if proposal is valid and still displayed | “Task started” |
| IIS-04 admission `queued` | “Queued; not started” | “Agent active” |
| Admission `starting` before engine evidence | “Launching / awaiting grounded start” | “Executing” |
| Verified `response.accepted` only | “Task command accepted by engine bridge” | “Running / completed” |
| Committed `task.started` | “Execution started (last verified phase…)” | “All workers active” |
| Committed `task.progress` | “Verified phase/detail at sequence N” | Numeric percentage without denominator/evidence |
| Committed terminal `task.completed` or `task.failed` | “Engine reported completion/failure” with actual outcome | “OS cleanup complete / workspace released” without separate proof |
| Committed `task.cancelled` | “Engine confirmed cancellation” | “Process tree fully stopped” without separate proof |
| Recorded cancel request only | “Stop requested / still verifying” | “Stopped” |
| Forced kill / EOF / child crash without grounded terminal | “Interrupted / outcome unknown; check reconciliation” | “Failed safely” or “Cancelled” as an engine claim |
| Persisted `needs_reconciliation` or blocked lease | Explicit unresolved process/artifact or workspace safety warning | Green safe-to-edit / safe-to-rerun status |
| Event gap or sticky conflict | “Timeline incomplete / integrity issue” plus recorded facts | Complete history, missing fabricated worker rows |

**Two-axis display proposal:** Separately show **(a) engine outcome** (`unknown`/verified complete/verified failed/verified cancel where supported) and **(b) cleanup/safety** (`not verified`, `blocked/needs reconciliation`, `verified safe` only on trusted Main evidence). This is UI composition from **fields actually provided by the existing IIS-02 `TaskView`/authorized Main projection**, **not a new engine outcome enum, renderer database query, or public DTO requirement**. The frozen `TaskView` does **not** promise dedicated fields exposing every internal process session, `cleanup_state` or writer lease. When the allowed projection does not prove cleanup or safety, the UI explicitly displays **“cleanup/safety not verified or not exposed”**; it never synthesizes `verified safe` by inference from the terminal event, last IPC response, absence of `unknown`, or passage of time. A valid engine outcome may coexist with blocked cleanup. An event gap can keep timeline/state certainty false even if a particular terminal row exists.

**Request/response handling:** IIS-01 `response.accepted` is transport acknowledgement, not a sequenced event; `task.cancel` request/response is not `task.cancelled`. These do not enter `task_events` or worker timelines by invention. Main may show a bounded transport hint separately if supported by `TaskView`/runtime evidence, with no false permanence after reconnect.

## 8. Temporary worker identity and timeline fold

**IIS05-D05 — Frozen folding rule The worker invocation key is the pair **`(taskId, worker_ref)`**, never the role label alone. Each verified `worker.started` creates one logical invocation anchored to its real event sequence. A subsequent verified `worker.completed` with the same task/key and matching role may attach an actual `WorkerReport` summary and terminal `WorkerStatus`.

- **Repeated roles:** `SCOUT#A`, `SCOUT#B`, or any repeated `SURGEON`/`INQUISITOR` invocation are distinct only if their real `worker_ref`s are distinct. Never reuse a historical worker entry as a newly activated instance solely because the role matches.
- **No prescribed order:** Workers may start or complete in any order, interleave or repeat; render by committed integer event sequence (ascending). Worker inspector selection uses the pair `(taskId,worker_ref)` and survives reordering without accidentally selecting a different instance.
- **Worker completion before observable start:** If a valid `worker.completed` row exists but the matching start is absent, show a **recorded completion with missing start evidence / incomplete history**. Do not synthesize `worker.started`, backdate a start time or report a full duration. This is especially important after stream gaps.
- **Start without completion:** A committed start proves the invocation **started at that point**. It does **not** prove continuous present activity after a child disconnect, event gap, task terminal event, runtime shutdown or process ambiguity. In such cases render **“last seen started; current status unverified”**, not perpetually “active”.
- **Multiple starts/completions for same worker key:** Exact transport duplicates were deduplicated at T4; a second distinct `worker.started` or conflicting `worker.completed` for the same invocation is a **semantic projection anomaly**, not automatically a frozen IIS-04 *wire identity/digest conflict*. Do not merge contradictory reports, overwrite earlier terminal status or manufacture a second worker with the same ID. Preserve both valid committed rows and derive a bounded **UI-local generic uncertainty warning**, with first observed role/status immutable in the worker fold. **Do not rewrite `task_event_streams.integrity_status` as `conflict` merely from a semantic worker anomaly** unless an already-frozen Main transaction rule expressly authorizes that incident category. If a durable new category or new public incident DTO proves necessary, record it as a cross-contract issue requiring the owner's separate approval; this design does not modify IIS-04.
- **Worker failed/blocked vs task outcome:** `worker.completed.status=FAILED|BLOCKED` is evidence only about that invocation. It cannot automatically turn the task into `task.failed` or establish rollback unless the engine supplies the corresponding grounded task outcome.
- **Worker lifecycle:** Historical rows remain visible after the temporary worker's actual runtime instance has ended. No worker is kept alive by opening an inspector or preserving its React state.

**Derived WorkerTimelineRow (internal display projection, not frozen IPC type):** `{taskId,workerRef,role,firstRecordedSequence?,completionSequence?,reportedWorkerStatus?,reportedSummary?,evidenceState}`. `evidenceState` is UI-derived (`observed`, `incomplete`, `conflicting`, `last_seen`) and **is not sent as a new IIS-01 wire value**. Fields absent from frozen events remain absent/unknown. This projection is recomputable from `TaskEventPage` without storing a new table.

**Meaning of “active”:** An invocation can be shown as **currently active** only if a verified start has been committed, no verified completion for that key is known, the parent task/runtime is **independently confirmed still executing in the same supervised session through an already-approved Main-authorized projection**, and there is no integrity/reconciliation condition that invalidates current-activity certainty. `TaskEventPage` does not convey live process handles; the frozen public `TaskView` does not guarantee a detailed per-worker session-liveness field. If these necessary facts are not actually exposed through the existing IPC surface, the UI MUST show **“started; live status unverified”**, not an active badge. Recent commits, child READY, a stale `starting` state, missing `worker.completed`, or optimistic timer ticks never suffice. This must be tested under subscription loss, renderer reload and post-crash uncertainty.

## 9. Mission Control structure and visual truth mapping

**IIS05-D06 — Frozen concrete presentation, bound by NCD-01 Mission Control is a separate **Agents page**, not an executor or a Lead Architect decision-making surface.

### 9.1 Mission Header

Display the selected real `taskId`, registered project/conversation association, the exact *authorized* goal (bounded/sanitized for display), current Main-backed task admission/run state, known engine outcome, separate cleanup/reconciliation state, and integrity status (`completeThrough`, gap/conflict as relevant). Current model name, if not directly tied to this Coding Task by verified data, is **not** guessed from a Discussion preference. If the task is queued, make the “not running” semantics explicit. If the selected task belongs to another project than the currently selected project, show its *actual bound project*, not the current UI selection.

### 9.2 Execution Timeline

Render a stable, bounded sequence-ordered list of **verified task and worker facts**: task start/phase updates, each real worker dispatch/returned report, task-level `file.changed`, task-level `test.result`, and grounded terminal events. At least one distinct worker invocation row exists per distinct verified `(taskId,worker_ref)`; a detailed sequence view may also expose event rows, but never guess additional wire facts. Unknown intervals are visibly marked; a terminal event after a hole is a real recorded event **inside an incomplete timeline**, not proof that all preceding events were observed.

### 9.3 Agent Inspector

When the user selects an actual worker invocation, show its verified role, invocation key, start/completion records when present, actual `WorkerStatus`, and bounded returned `summary` if received. The *full assigned task contract*, *individual files modified* and *individual tests performed* are shown **only when their attribution is verifiably exposed by an approved source**. Otherwise display “Not available from current verified event contract”; do not attach task-level changes/tests by mere timing. If there are no verified worker events, show a truthful empty state instead of placeholder agents.

### 9.4 Presentation vs runtime state

- `Agents` page Right Dock is hidden by default on entry; manual opening is page-local. Returning to Chat restores the saved per-conversation Dock state and global width. No new automatic Dock opening occurs merely because a historical event replays.
- In Chat, the NCD-01 “open Agent Logs once at actual task start unless explicitly hidden” behavior applies **only on the live grounded start transition** and respects the user's selected Files/Terminal tab; historical replay or renderer reload must not trigger it again. An ephemeral **per-renderer-lifetime and per-conversation** guard keys the one-shot UI action to the committed `(taskId,eventId)` only when the actual fresh start hint is first observed while that Chat is open. Commit-era starts first discovered by snapshot, a backlog on route entry, a repeated hint, stale callback, or renderer reload are **historical for Dock purposes**. Check persisted Chat `explicitlyHidden` and user-selected primary tab at the moment of eligible live transition; never retroactively open if the conversation was not visible then. Persist/apply the existing Chat state policy and do not invent an unapproved auto-open flag inside authoritative task-event data.
- Navigation among Chat/Agents/Projects/Settings, sidebar changes, previews and dock changes are display operations only. They do not request Run Task, `task.cancel`, shell execution or process teardown.
- Agent Logs are diagnostics; a future Interactive Shell is not activated by showing the Terminal tab. File previews remain read-only through frozen scoped APIs.
- UI strings from model summaries and project paths use safe text rendering, not HTML injection or path-as-authority. Redact or mask sensitive metadata according to IIS-02/IIS-07; no secrets or raw source bodies in generic timeline logs.

## 10. Committed-event replay, pagination and missing sequence policy

**IIS05-D07 — Frozen replay algorithm compatible with frozen IIS-02/IIS-04 The Renderer treats pushed notifications as **invalidatable hints**, not durable evidence it can exclusively trust. For selected task `T`:

1. Register `nextCode.tasks.subscribeTask(T,onTaskUpdate)` **before** the initial authoritative read. Capture scoped hints in a finite per-view buffer while catch-up runs; callbacks never run code or mutate task authority.
2. Read `tasks.read(T)` for state and `tasks.readEvents({taskId:T,afterSequence:0,limit:40})` for earliest committed rows. **`afterSequence` is the frozen numeric exclusive task-sequence boundary**, not an arbitrary opaque string; use the validated server-returned `TaskEventPage.nextSequence` as the next pagination boundary under the frozen IIS-04 semantics, without guessing by page length, UI array indices, or global `admission_order`. Opaque scope-bound cursor conventions for **other** list APIs do not change this named field's numeric meaning. A page contains at most 100 committed events ordered by integer task `sequence` and constrained to T.
3. Iterate bounded pages with UI yielding/virtualization, **never an unbounded catch-up loop that chases a continuously growing tail**. A proposed UI default is **at most four consecutive 40-row initial fetches per scheduling turn** before yielding and exposing “load more / catching up”; subsequent work proceeds by scheduled bounded iterations. Maintain task-scope generation guards and finite memory while old pages are virtualized/evicted. A partial visible window must not be presented as the entire history. Compose events by `(taskId,sequence,eventId)` and compare identities/content; only a server-verified identical event is one display record.
4. Evaluate `completeThrough`, `hasGap`, `stateIsCertain` and `TaskView` from Main. Do not equate highest observed sequence with complete history. A missing N is rendered as **gap**; later N+1 rows may be shown as committed facts with visibly incomplete ordering history.
5. Reconcile buffered hints by fetching relevant `tasks.read`/`tasks.readEvents` again and by verifying identity/stream integrity; coalesce repeated hints. If buffer overflows, IPC disconnects, page state changes, or any hint refers to an earlier sequence, **invalidate the displayed cache as authoritative and rescan in bounded pages** (for an unresolved hole, start from `afterSequence:0` or from a conservatively validated earlier numeric boundary, not merely the largest displayed N). A changing concurrent stream need not have a stable complete multi-page snapshot: a repeated dirty hint or changed `completeThrough` triggers a later limited reconciliation pass rather than spinning indefinitely. Do not imply a cursor pin/snapshot transaction across pages unless the frozen interface actually supplies it.
6. Once caught up, retain live subscription while the selected view is mounted; on hidden/unmounted route unsubscribe promptly. Main continues storing events regardless of listeners. A return creates a fresh subscribe-before-read cycle.
7. Recover from Renderer reload and app restart by reconstructing the same UI projection from SQLite. Neither replay nor successful catch-up invokes `task.execute`, `proposals.confirmRun`, `tasks.cancel` or `discussion.send`.

**Important late-hole case:** Suppose sequences `{1,2,4}` are committed and the Renderer has displayed 4. If sequence 3 later commits, a simple “read after 4” misses it. The UI **must** invalidate/rebuild the relevant sequence range whenever `hasGap`, `completeThrough`, or a hint indicates out-of-order backfill. Until the hole is durably filled and corroborated by Main, `completeThrough` remains 2 (even though 4 exists). A previously sticky `conflict` incident is **not** cleared merely because late sequence 3 arrived. The UI must not overwrite an incident marker in local memory.

**Canonical ordering:** Task event order is `sequence` as supplied by grounded producer and committed by Main. DB `committed_at` and UI receive time may help display but are **not** interchangeable with logical task order; no task progress time/duration is fabricated from sparse wall-clock observations. Across different tasks there is no global engine-event order to invent.

**Cursor/consistency:** A `TaskEventPage` is an authoritative response about rows and integrity at its read point, not a global immutable multi-page snapshot unless Main provides one with the frozen API semantics. If a concurrent commit changes data during pagination, a follow-up bounded resynchronization reconciles it. **Numeric `afterSequence` and returned `nextSequence` are task-scoped sequence boundaries, not opaque string cursors**; scope-checking remains mandatory. Opaque Main-issued cursor rules continue for separate list methods that expose those cursors. Renderer cannot supply arbitrary SQL offset or another task's state boundary.

## 11. Notification routing, listener isolation and UI state

**IIS05-D08 — Frozen notification policy Continue to use only the frozen IIS-02 typed subscription surface:

- `nextCode.tasks.subscribeTask(taskId,onTaskUpdate)` for the selected bound task and the existing `TaskEventCommitted` / `TaskStateChanged` notifications.
- `nextCode.conversations.subscribeConversation(conversationId,onConversationUpdate)` for that conversation's committed `ConversationChanged`, `ProjectInspectionProgressChanged`, `DisclosureConsentRequired` and `DisclosureConsentChanged` hints.
- `nextCode.runtime.subscribeStatus(onRuntimeUpdate)` for `RuntimeStatusChanged` and `ModelAvailabilityChanged` hints.

These are **three scoped Preload subscriptions**, not three generic child process streams. No invented `mission.subscribe`, `worker.subscribe`, `onAnyEvent`, global Electron IPC wildcard or new public methods. Main checks the actual authorized webContents/frame and requested `taskId` or `conversationId` at registration and emission. A payload's asserted project/role cannot authorize a cross-project push.

**Main publishing:** A `TaskEventCommitted` points to a truly committed `(taskId,sequence)` and may carry only an already-validated sanitized bounded projection. `TaskStateChanged` is emitted after the relevant durable task transition; `RuntimeStatusChanged` expresses Main-supervisor status, not inferred engine phase. Notifications can be coalesced **only as hints**; no authoritative `task_events` row is silently deleted/coalesced due to slow UI.

**Subscription order and teardown:** Each listener is tied to its exact scope. On task selection change, clear transient buffers belonging to the previous task, unsubscribe old listener and subscribe the new task **before** its snapshot. A late callback captured under a previous task selection or disposed route is ignored via a per-view generation guard. On reload a new renderer may resubscribe without changing child process ownership. Redacted, closed DTOs are required, as in IIS-02.

**Conversation/broker separation:** `ProjectInspectionProgressChanged` describes verified broker observations from `project_inspections` / `inspection_observations`. It is **not** a `task.progress` Python event and consumes no Coding Task `sequence`. Disclosure consent notifications likewise never imply permission to execute code. Mission Control may link back to the conversation but must not blend the evidence streams or count scanned files as changed files.

## 12. Worker and mission integrity anomalies

**IIS05-D09 — Frozen anomaly policy Distinguish immutable wire/DB integrity from incomplete presentation. The frozen public `TaskEventPage` offers `completeThrough`, `hasGap`, and `stateIsCertain` but **does not promise** `task_event_streams.integrity_status` or `last_incident_code`; `TaskView` does not guarantee a public incident-code field. Consequently the Renderer may always show a **generic verified uncertainty/incomplete-history warning** when those exposed flags support it; it may say **“conflicting duplicate”** or display a specific persistent incident only if an existing authorized Main DTO actually exposes that verified information. No Renderer SQL or new push fields may be inferred from the private table schema.

| Situation | Required result |
|---|---|
| Identical event delivered again | IIS-04 T4 no-op; one rendered item; no second start animation |
| Same sequence with different event ID/payload | Durable sticky conflict under IIS-04; never overwrite old row; visible integrity warning |
| Same event ID reused at another sequence | Durable conflict; no silent remap to a new worker |
| Event sequence jumps e.g. 2 → 4 | Store valid later row with `hasGap=true`; `completeThrough=2`; no invented 3 |
| Gap filled by later committed 3 | Re-read affected range; advance contiguous watermark if valid; preserve previous sticky conflicts |
| Worker completion lacks known start | Show completion evidence plus unknown prior start, not fabricated duration |
| Worker start lacks completion after task loss | “Previously started; current state unknown” and task/process uncertainty |
| Duplicate semantic worker start/completion with different event IDs | Do not coalesce contradictions into one trustworthy status; flag task/worker projection as inconsistent pending established Main reconciliation |
| Wrong task/session/role or pre-READY event | Reject before durable event insertion; preserve task uncertainty as warranted |
| Event after recorded terminal / process replacement | Do not automatically use it to rewrite terminal outcome or attribute it to new child; investigate/reject according to IIS-03/IIS-04 |
| Terminal event received but commit fails | No trusted committed terminal notification; task safety state stays conservative |
| `task.completed` but OS descendants unknown | Show engine completion evidence **and** blocked cleanup, not “safe/finished” universally |

**No invented incident schema:** IIS-04 defines `task_event_streams.integrity_status` and bounded incident markers for **its approved transactional event-identity/sequence conflicts and gaps**. A semantic worker-lifecycle mismatch is **not** automatically that DB incident type. The UI retains the committed evidence and presents locally derived uncertainty with existing public DTOs only; no new marker/table, hidden Renderer read, or altered `TaskEventPage` is authorized. If persistent semantic incidents become mandatory and are not representable under the frozen contract, register a parent-contract conflict for a later explicit owner decision. A late-arriving event with `sequence` **before** an already committed terminal sequence may be a valid gap backfill and must be handled under IIS-04 T4; an event genuinely **emitted after** a terminal lifecycle in the same task is an anomalous new fact, not a license to rewrite the earlier terminal outcome. Never conflate receive/commit order with emission sequence order.

## 13. Backpressure, bounded rendering and control priority

**IIS05-D10 — Frozen internal display/notification defaults The hard boundaries remain the upstream ones. This section proposes tighter *internal* presentation safeguards only, never looser wire or IPC permissions.

| Layer | Frozen bound | IIS-05 design application |
|---|---|---|
| JSONL full record / incomplete line | 262,144 UTF-8 bytes; incomplete line ≤15s | Validate at pipe before event parsing or UI projection |
| Spawn → READY | 30s | No “available task stream” before verified READY |
| Main incoming event queue per child | ≤256 records **and** ≤8MiB | Pause/backpressure; after 30s saturated fail/reconcile, not drop critical facts |
| Outbound queue per child | ≤256 records **and** ≤8MiB | Preserve `task.cancel`/supervisor control processing |
| Coding requests | 1 execute + 1 reserved cancel | UI event flood cannot starve cancel |
| Event page | Default 40, max 100 | Use pagination + virtualization, not unbounded DOM |
| Diagnostic UI segment | ≤16KiB | Sanitize; do not convert Agent Logs into events |
| Summary/progress detail | ≤2,048 characters per frozen IIS-01 budget | Render safely, do not append raw source/stack traces |

**Candidate tighter UI budgets (IIS-05-specific, not parent changes):** Per active task-view hint buffer **128 hints**; if exceeded, mark local view dirty, coalesce invalidations and re-read authoritative Main snapshots. Render at most **100 currently mounted timeline rows** before virtualization/pagination loads additional committed rows. Limit inspector's untrusted rendered summary to the frozen event text ceiling. These choices are reviewable and not runtime measurements.

**Starvation prevention:** Main must not keep a SQLite write transaction open while waiting for React callbacks or OS pipes. Prioritize critical supervisor/cancellation operations and DB durability over speculative UI rendering. The renderer may throttle animation/hints and cancel read-only page fetches on route change; it cannot cancel underlying task/process supervision. A hard event-ingress failure turns into explicit incomplete/unknown state; it is never a successful “drop oldest events” strategy.

## 14. Cross-page selection and session ownership

**IIS05-D11 — Frozen scoping Mission Control's selected `taskId` is a **view selection**. It resolves via existing `tasks.list`/`tasks.read` to its durable project and conversation. Switching selected project or opening another chat does not retarget a live Python child or rewrite the previously admitted task goal/workspace. The mission list may display histories filtered by existing `tasks.list(conversationId?,cursor?,limit?)`; it cannot add a new arbitrary workspace enumeration endpoint.

- **No accidental global timeline:** Under frozen v1, one active Coding Task globally is permitted; historical tasks are many. Per-task `sequence` begins at 1 independently. `admission_order` is durable task ordering for lists, **not** an all-tasks event clock. Available selection comes only from already-approved `BootstrapView.activeTaskSummaries`, selected scoped task references, and `tasks.list(conversationId?,cursor?,limit?)` with actual Main authorization. Omitting its optional conversation filter never grants a cross-project view or supplies a new unrestricted history-enumeration capability; if Main rejects a broader query, show the authorized scoped history, not a fabricated global feed.
- **Current project vs actual owner:** Events from another task continue to persist after the user changes project. Show them only in the appropriate scoped task/context and never remap to the visible project.
- **Opening Agents:** Does not call `app.bootstrap()` if already initialized merely to restart services; bootstrap is a read snapshot and never starts execution in any case.
- **Task start Dock policy:** The NCD-01 one-time, user-hide-respecting Chat side effect applies to a new **live grounded start observation** where eligible. No mount, replay, tab switch or duplicate event may repeat this action.
- **Cancellation:** Existing `tasks.cancel(taskId)` remains a direct, explicit user action. Mission Control may expose the same action in the appropriate task context but must not introduce any cancel-by-worker, cancel-by-PID, auto-restart or hidden “pause” commands.

## 15. Failure and recovery matrix

**IIS05-D12 — Frozen user-visible safe degradation

| Failure / interruption | Authoritative evidence still available | Mission Control response | Forbidden action |
|---|---|---|---|
| Renderer navigation/unmount | Main SQLite + live supervisor continue | Reopen via new subscription/snapshot | End task or replay execute |
| Renderer crash/reload | Committed events, task/lease records | Subscribe-before-replay; reflect missing events | Interpret lost UI buffer as engine restart |
| Missed/dropped notification hint | SQLite rows remain | Re-read `tasks.readEvents` / `tasks.read` | Fabricate skipped events |
| Main restart after crash | DB retained, OS child status potentially uncertain | Task/lease unknown or needs reconciliation | Auto-unlock/restart coding |
| Coding child stdout disconnect | Only committed event history + supervisor fact | Show last known event and unknown/reconciliation | Create `task.failed`/`task.cancelled` event |
| Discussion child disconnect | Chat turn/attempt status uncertain | Discussion failure/unknown, Coding Task remains independent | Cancel a coding child because chat failed |
| Event hole | Sparse committed rows + stream marker | Incomplete timeline, last contiguous watermark | Mark timeline 100% complete |
| Conflicting duplicate | Original event + sticky Main-DB conflict | Generic integrity-uncertainty warning from existing exposed flags; specific reason **only if** already exported by a frozen safe Main DTO | Overwrite evidence or infer a public incident-code field |
| SQLite busy/commit failure | Last known committed state only | `DATABASE_UNAVAILABLE`; bounded intake/reconciliation | Emit uncommitted success notification |
| User clicks Stop | Durable cancel request and supervisor tracking | “Stop requested”; await verified outcome and cleanup | Claim immediate cancellation/safe workspace |
| Forced termination | Verified/unverified Windows child/descendant and artifacts | `interrupted` or `unknown` and blocked lease as warranted | Claim `task.cancelled` without engine hook |
| Child sends terminal but descendants remain | Verified engine outcome, incomplete cleanup | Two-axis outcome + safety warning | Release global slot / workspace writer lease prematurely |
| Empty history / no instrumentation | No trustworthy worker events | Honest empty state / live activity unavailable | Fake SCOUT/SURGEON/INQUISITOR cards |
| IPC listener backlog | Main DB still authoritative | Coalesce hints, dirty + authoritative resync | Delete committed evidence to catch up |

**App quit:** Preserve IIS-03's native app-exit confirmation and controlled cleanup behavior. A page/navigation close is not full application exit. Windows Job Object or equivalent descendant containment is an **implementation/test gate**, not an already-proved safety guarantee. No promise of full filesystem sandboxing or automatic rollback is created here.

## 16. Security, privacy and sanitization

**IIS05-D13 — Frozen displays-as-data rule All wire-provided strings, including `task.progress.detail`, worker summaries, changed-file relative paths, test summaries and `TaskOutcomeV1.summary`, are untrusted for display even if the **existence of the event** is engine-grounded. Renderer escapes text; never evaluates HTML/Markdown executable elements, command snippets, links or shell lines from model-controlled content. Sanitization does not certify semantic truth of free-form prose: a genuine `worker.completed` event validates that a WorkerReport returned; it does not make every claim in its human-readable summary independently proven.

- Stderr and Agent Logs are bounded and redacted **diagnostics**, not task events, worker reports or proof of execution.
- Mission Control must not expose absolute secret file paths, raw `.env` content, credentials or unapproved external-provider source excerpts. `file.changed.path` is displayed only within the already-authorized project context and never used to open files without IIS-02/IIS-07 broker validation.
- A displayed model answer or suggested `Run Task` action is never approval. Only the frozen Main-issued, exactly scoped and atomically consumed `proposal_id` through explicit `proposals.confirmRun` can admit work.
- Source disclosure consent is distinct from the local file-read broker and from executable task authority. The previously owner-deferred universal LLM egress gate (FFR-R01) remains deferred; this IIS does not resurrect it.
- Rendered event types do not grant filesystem/process permissions; task/worker IDs are references, not bearer capabilities. Reject forged cross-task scopes and stale/untrusted callbacks.

## 17. Engineering interfaces internal to Main / React (non-public)

**IIS05-D14 — Frozen internal implementation division, names illustrative only

| Internal component | Responsibilities | Must not do |
|---|---|---|
| Coding event instrumentation adapter (Python; future) | Observe real engine points, assign task-local sequence/event IDs; emit frozen event schema | Invent worker dispatches, emit task events from Discussion |
| Supervisor frame ingress (Main) | Validate READY/child/session/role/transport and route closed frames | Interpret stderr/model prose as event |
| Durable TaskEvent coordinator (Main) | IIS-04 T4 duplicate/gap/conflict detection, commit, state update | Keep a competing event DB or publish before commit |
| Scoped UI notification projection (Main/Preload) | Emit only IIS-02 named hints after commit | Add generic channels or grant task control |
| Task state selector (React) | Combine `TaskView`, `TaskEventPage` and integrity into bounded mission status | Treat ACK as outcome or terminal as OS cleanup |
| Worker event fold (React) | Build `(taskId,workerRef)` inspector/timeline projection from committed rows | Attribute task-level file/test events to workers by adjacency |
| Replay/catch-up controller (React) | Subscribe-before-read, dedup, bounded hints, missing-range resync | Spawn/restart task or trust UI cache as durable history |

These are decomposition suggestions, not prescribed file paths/classes or permission to implement. IIS-05 does **not** replace IIS-03's process supervisor API or IIS-04's transaction schema. Internal components may be combined if observable safety/contract properties are retained and tested.

## 18. Conformance fixtures and adversarial acceptance plan — NOT RUN

**IIS05-D15 — Frozen required tests (36 cases after FFR-01), to become executable only after separate implementation authorization

| Case ID | Positive/synthetic fixture | Adversarial fixture / acceptance gate |
|---|---|---|
| E05-01 | READY of correct Coding child; true engine `task.started` committed and shown | Pre-READY/wrong-role Discussion emission rejected |
| E05-02 | Verify all nine exact IIS-01 subtype schemas using positive fixture set | Extra subtype/extra key/boolean sequence/wrong enum/NaN/duplicate JSON keys rejected |
| E05-03 | `task.execute` ACK accepted; no `task.started` yet | No false “running” or worker activity |
| E05-04 | Two `SCOUT` calls with distinct `worker_ref`, interleaved `INQUISITOR` | Timeline does not assume role order or coalesce same-role invocations |
| E05-05 | Worker completes with real `WorkerReport.SUCCESS` | Task not marked completed from worker success alone |
| E05-06 | Task-level `file.changed` and `test.result` committed | Neither attributed to specific worker without explicit source link |
| E05-07 | `worker.completed` without visible start; valid row exists after gap | No invented worker start timestamp; show missing evidence |
| E05-08 | Duplicate identical event re-delivered | Exactly one DB row/visible row; no repeated Chat Dock auto-open |
| E05-09 | Same sequence/different ID or same ID/different content | Sticky conflict; no overwritten row or false certainty |
| E05-10 | Events 1,2,4 committed; later 3 committed | Watermark 2 initially; late-hole re-read from safe range; eventual 4 if valid |
| E05-11 | Terminal event exists but gap persisted | Show terminal record and incomplete timeline/uncertain safety separately |
| E05-12 | Terminal `TaskOutcomeV1` and verified OS/process cleanup | Only then release lease under IIS-04; unverified descendants block it |
| E05-13 | Real cooperative `task.cancelled` confirmed | Cancel ACK/forced kill never synthesize the event |
| E05-14 | Renderer route switches Chat → Agents → Project → Chat during task | Same task process/ID runs; no extra `task.execute`/`task.cancel` |
| E05-15 | Renderer crash/reload during active event stream | Reconstructed committed history; no duplicate children or fake event gap repair |
| E05-16 | Slow UI, burst of >128 notification hints | Hint buffer dirty/rescan; persisted events intact; cancellation path responsive |
| E05-17 | Incoming >256 frames / >8MiB / >30s saturated DB ingestion | Bounded backpressure/failure, no false terminal committed notification |
| E05-18 | Database commit injected failure on terminal event | Zero committed push for that row; unknown/reconciliation policy |
| E05-19 | Stale child session after restart or recycled PID | No event attributed to replacement task; writer lane remains safe |
| E05-20 | Child dies after committed `worker.started` | Worker not left falsely “currently active”; mark live state unverified |
| E05-21 | Same `TaskEventCommitted` hint arrives before/after snapshot read | Subscribe-first merge yields correct unique sequence; no dropped committed row |
| E05-22 | Selector task changes while old callback pending | Late old-task callback ignored; no cross-project event exposure |
| E05-23 | User hides Dock; historical task start replayed | Never auto-opens Dock; user presentation choice honored |
| E05-24 | No instrumented worker hooks, only task-level proof | Clear “live activity unavailable” / empty workers, not fabricated UI |
| E05-25 | Sanitized diagnostic contains misleading “PASSED” text | No authoritative `test.result` or completion created |
| E05-26 | `ProjectInspectionProgressChanged` during discussion | No Coding Task event sequence, worker event or file change invented |
| E05-27 | Cross-task event IDs/worker refs/path input attacks | Main scoping/sanitization prevents leak, action or attribution |
| E05-28 | Reopen Agents after Main crash with blocked lease | Accurate historical engine outcome and unsafe/unknown cleanup distinct |
| E05-29 | Event with new valid outer `message_id` but matching existing `(task,sequence,event_id,digest)` | T4 idempotent no-op after IIS-01 acceptance; duplicated **outer** `message_id` on same connection rejected before T4 |
| E05-30 | `TaskEventPage` exposes only standard flags, not private `integrity_status` | Generic grounded integrity uncertainty appears; no invented specific conflict reason or new DTO field |
| E05-31 | Verified terminal row while Main cleanup fields are not exposed in `TaskView` | Show known engine outcome and cleanup **unverified**; never render “safe” from hidden DB assumptions |
| E05-32 | Continuous event production during initial catch-up | At most four initial 40-row page fetches per scheduling turn; UI yields, remains partial/dirty, converges after stream settles |
| E05-33 | Late sequence 3 after committed 1,2,4 while a historical terminal N is known | Numeric `afterSequence` rewind discovers 3; no use of opaque string or event-count cursor |
| E05-34 | Semantic double worker-start with unique valid event IDs | Original committed rows kept; projection uncertainty shown, no unauthorized DB conflict rewrite |
| E05-35 | Chat mounted after task already started; repeated live start hint during navigation/reload | Only an actually new eligible live Chat transition auto-opens once; replay/remount never auto-opens |
| E05-36 | A task-started event exists but no approved current-session-liveness DTO | Worker shown as historically started/unverified, not actively executing |

**Testing layers required later:** closed-schema fixture tests; Python instrumentation-to-event probes; Main supervised child/SQLite transaction tests; replay cursor/concurrent read tests; React state selectors/worker-fold unit tests; subscription race and burst tests; end-to-end Windows task navigation/cancel/child kill/failure injection. Tests must verify `TaskEventPage.completeThrough`, `hasGap`, `stateIsCertain` and `TaskView` separately. A documentary PASS, when later issued, is **not** a claim these tests were run.

### 18.1 Illustrative synthetic traces (not real engine evidence)

**Trace A — valid out-of-order worker roles in one task:**

```text
seq=1 task.started phase=EXPLORING
seq=2 worker.started worker_ref=wA role=INQUISITOR
seq=3 worker.started worker_ref=wB role=SCOUT
seq=4 worker.completed worker_ref=wB role=SCOUT status=SUCCESS
seq=5 test.result status=passed       # task-level; no worker_ref
seq=6 worker.completed worker_ref=wA role=INQUISITOR status=BLOCKED
seq=7 task.progress phase=VERIFYING
seq=8 task.completed outcome.success=true (actual TaskOutcomeV1 required)
```

This trace demonstrates presentation ordering and *does not assert* that the current engine generates it or that individual test results belong to worker `wB`. A worker's `BLOCKED` report does not override a later independently verified task outcome.

**Trace B — non-contiguous journal:**

```text
Committed: (seq=1, ev=A), (seq=2, ev=B), (seq=4, ev=D)
IIS-04 task_event_streams: complete_through=2, max_seen=4, integrity_status=gap
Displayed: 1, 2, [Missing event 3 / incomplete timeline], 4 (later committed fact)
Later committed: (seq=3, ev=C)
Resync: read from safe incomplete range (<=2) or 0; now contiguous through 4 if no conflict
```

A previously recorded **conflict** is sticky and not downgraded by a later valid frame. `TaskEventPage` response content remains bounded/paginated; the illustration is not a new JSONL shape.

**Trace C — verified engine result, unsafe cleanup:**

```text
TaskOutcomeV1 success=true and task.completed seq=N: durably verified engine outcome.
Windows descendant stopped? UNKNOWN.
workspace_writer_leases: still blocked / needs_reconciliation per IIS-03/IIS-04.
UI: "Engine completed" + "Workspace cleanup not verified; further writes blocked".
```

The interface may never collapse Trace C into “fully finished and safe” without separate Main reconciliation evidence.

## 19. Consolidated review checklist and frozen decisions (historical review provenance)

This checklist records the complete IIS-05 design as it entered FFR-01. The review finished with eight corrected findings in v0.2, and the owner subsequently approved all IIS05-D01–D15 decisions in **FROZEN v1.0**. References below to candidate review gates are historical pre-freeze instructions, **not** outstanding approval requirements.

| Frozen decision ID | Scope adopted by owner in v1.0 | Frozen parent constraint |
|---|---|---|
| IIS05-D01 | Instrumentation evidence gate and missing-hook behavior | IIS-01/C-03: truthful events; engine edits separate |
| IIS05-D02 | Exact nine-event mapping, limited attribution | IIS-01 frozen subtype data |
| IIS05-D03 | Verified ingress → IIS-04 T4 → post-COMMIT push | IIS-03/04 durability |
| IIS05-D04 | Evidence-based task/outcome/cleanup display | IIS-02 `TaskView`, IIS-03/04 leases |
| IIS05-D05 | Per-invocation worker timeline and honest unknown | NCD-01 worker timeline; `worker_ref` existing |
| IIS05-D06 | Mission Header/Timeline/Inspector and Dock semantics | NCD-01/UI frozen |
| IIS05-D07 | Subscribe-before-snapshot, pagination, gap and backfill | IIS-02 replay; IIS-04 contiguity |
| IIS05-D08 | Exactly three scoped subscriptions, eight push names | IIS-02 closed registry |
| IIS05-D09 | Duplicates/conflicts/semantic anomaly handling | IIS-04 incident authority |
| IIS05-D10 | UI-only hint/virtualization budgets | IIS-01/02/03 ceilings |
| IIS05-D11 | Task/project binding across route changes | NCD-01/C-03 scope |
| IIS05-D12 | Truthful failure and restart semantics | IIS-03/04 recovery |
| IIS05-D13 | Display sanitization and no privilege escalation | NCD-02/C-02/IIS-02 security |
| IIS05-D14 | Internal responsibilities, not new public APIs | IIS-01/02/03 ownership |
| IIS05-D15 | Test plan and synthetic fixture coverage | IIS-08 later executable acceptance |

**Consolidated review gates (not represented as complete yet):**

1. Exact closed IIS-01 event compliance: only nine permitted subtypes and their mandatory exact data keys; no new wire action, acknowledgement, `worker_ref` on file/test records or protocol version.
2. IIS-02 compatibility: 23 Promise methods; three typed subscriptions; eight push names; no special Mission Control RPC; task page size and DTO semantics honored.
3. IIS-04 compatibility: existing 22 tables, T4 immutable writes, physical task-event sequence, sticky conflict and committed-only replay; no second event store or invented cleanup.
4. NCD-01 compliance: non-fixed worker chronology, distinct Agents route and correct Dock transitions; task survives navigation.
5. Safety gates: missing instrumentation honestly displayed; cancel ACK not terminal; child exit/EOF not fabricated failure; blocked writer not released without independent evidence.
6. Backfill semantics: an event inserted into an earlier missing sequence remains discoverable after the UI had already observed a later sequence; no silent terminal success or complete history claim.
7. Security/privacy: no arbitrary project/worker scope, secret/path leakage, raw diagnostics as events or a generalized egress gateway reintroduced by this UI contract.
8. Engine dependency audit: enumerate absent instrumentation and record *future separately authorized* changes required for true worker/file/test/terminal evidence. No claim those hooks exist today.

**FFR-01 historical disposition (2026-10-20): CONDITIONAL PASS — eight corrections incorporated.** The owner subsequently granted explicit permission to freeze the corrected integrated specification. **Final disposition: PASS FOR FREEZE / FROZEN v1.0 — DESIGN ONLY.** No conformance tests have been run and no source implementation is authorized. IIS-05 is closed for design; IIS-06 is the next specification.


## 20. FFR-01 — Final consolidated documentary review, corrections and explicit freeze gate

**Review performed:** 2026-10-20, against frozen NCD-01, NCD-02, C-02, C-03 and IIS-01/02/03/04. **Historical review disposition:** CONDITIONAL PASS, eight findings corrected in Draft v0.2 and subsequently accepted in **FROZEN v1.0**; no changes to parent contracts, no code execution, no actual engine instrumentation audit. An accompanying `NCD-03-IIS-05-FFR-01-CONSOLIDATED-REVIEW.md` is the finding register. The last decision — accept v0.2 and freeze v1.0 — belongs to the owner.

| Finding | Corrected location | Binding resolution |
|---|---|---|
| FFR05-01 — private incident metadata overexposed | §§12,15 | `TaskEventPage` has no frozen public conflict-code field: show generic uncertainty unless an existing authorized DTO actually exposes a precise reason. |
| FFR05-02 — process/cleanup evidence not guaranteed in public `TaskView` | §§7–8 | Render current activity or “verified safe” **only** with actual approved Main projection; otherwise unknown/unverified. |
| FFR05-03 — event numeric boundary conflated with opaque list cursor | §10 | `afterSequence` / `nextSequence` are **task-scoped numeric sequence boundaries**; replay ranges re-read gaps rather than advancing solely beyond `max_seen`. |
| FFR05-04 — streaming catch-up could starve indefinitely | §10,§18 | Bound pagination per UI scheduling turn, yield, keep dirty/partial status under continuous writes, reconcile later. |
| FFR05-05 — T4 idempotence could be misread as wire-ID replay permission | §6,§18 | Strict per-connection outer message-ID uniqueness always checked before the durable T4 event-key dedup. |
| FFR05-06 — semantic worker duplication confused with transactional wire conflict | §§8,12,§18 | Keep committed evidence; local conservative fold, no unauthorized durable marker or 23rd table. |
| FFR05-07 — live Chat Dock trigger required one-shot mechanical guard | §§9,14,§18 | Live-only per-visible-conversation/per-renderer guard; never re-open on replay/route/reload; respect explicit hide. |
| FFR05-08 — history selection scope needs existing method-only path | §14,§18 | Use existing bootstrap/task-list/task-read, enforce Main scope; no invented global event feed or IPC method. |

**Engine hook dependency register — all availability UNKNOWN until a separately authorized implementation review:**

| Desired user-visible evidence | Instrumentation required at actual engine boundary | Correct v1 fallback if not available |
|---|---|---|
| Task enter/phase | Real `AgentOS.execute_task` entry / recorded task phase | Admission-only launching/unknown, no engine-start claim |
| Temporary worker invocation/completion | Actual dispatch boundary / returned structured `WorkerReport` | Empty/partial worker timeline; no fabricated identities or reports |
| Task file changes | Verified effect check attributable to bound task | No `file.changed` claim; generated diff remains proposal only |
| Test execution | Actual test tool invocation and captured verified result | No `test.result` claim; model assertions non-authoritative |
| Engine terminal outcome | Real typed `TaskOutcomeV1` from active task execution | No terminal event from transport/OS failure; unknown/reconciliation |
| Cooperative cancellation | Explicit trustworthy engine confirmation hook | Stop requested or interrupted/unknown, not `task.cancelled` |
| OS cleanup / writer release | Supervisor-owned Windows process/descendant and workspace evidence | Keep lease blocked; safety not verified |

**Review-vs-execution separation:** The hook register documents **required proof points**, not a statement that Next Code has these APIs today. This FFR did not inspect live source behavior, spawn children, create SQLite databases, run tests E05-01–E05-36 or alter any repository. IIS-08 later controls executable acceptance. Source-level hook changes require a distinct explicitly approved implementation step.

**Final adoption boundary:** The owner **has approved** the eight repairs and candidate-specific details as **IIS-05 FROZEN v1.0** without reopening NCD-01/02 or IIS-01–04. Any later evidence of a genuine cross-contract incompatibility requires a separate review and owner authorization, not an implicit change to a parent freeze. No source-code permission follows from the documentary freeze.

---

### Implementation boundary reminder

This frozen design makes **no** modifications to the original Next Code repository or to Desktop code. The initial Desktop release remains **Windows local-first, Electron Main + isolated Preload + React/TypeScript + Python sidecar, private JSONL stdin/stdout, Electron Main-only SQLite, explicit Run Task**, not a shared multi-agent hosting platform. AgentOS internal checkpoints remain in the engine, outside Desktop SQLite. The current known C-01 implementation closure is independent of the unimplemented Desktop components.

## 21. Owner-approved final v1.0 freeze declaration (2026-10-20)

- **Approval:** The owner explicitly instructed “حسنا الان نقوم بالتجميد” following FFR-01 and its unified correction report. This adopts the complete corrected Draft v0.2 as **NCD-03 / IIS-05 FROZEN v1.0**.
- **Frozen content:** IIS05-R01–R09, IIS05-D01–D15, the nine pre-existing event-subtype mapping, the existing 23 IPC Promise methods and three subscriptions, the existing IIS-04 durable event journal, corrected UI/replay/worker/cancellation semantics, and FFR05-01–FFR05-08. The proposed 36 E05-01–E05-36 tests become *required future acceptance cases*, not executed test results.
- **Upstream authority:** NCD-00/01/02, C-01/02/03, and IIS-01/02/03/04 remain unchanged. No added JSONL fields/actions, IPC methods, SQLite tables, engine runtime abilities, global LLM egress-gate requirements or expansion to general agent hosting is adopted.
- **Known deferred obligations:** Actual Python engine instrumentation, Windows child/descendant cleanup proof, SQLite process/transaction testing and UI end-to-end tests require explicit later implementation authorization and independent executable verification. Missing proof points always degrade UI truthfully rather than fabricating progress or safety.
- **Final state:** **PASS FOR FREEZE — FROZEN v1.0 — DOCUMENTARY DESIGN ONLY**. Subsequent stage: **IIS-06 — Discussion & Model Integration**. No coding authorization is given.
- **Integrity:** The independently computed SHA-256 of this frozen UTF-8 file and its reviewed v0.2 source is recorded in `NCD-03-IIS-05-FINAL-FREEZE-RECORD.md`.
