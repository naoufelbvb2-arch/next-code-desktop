# NEXT CODE DESKTOP — NCD-03 / IIS-03
## Electron Main ↔ Python Process Supervisor — Lifecycle, Cancellation, Concurrency and Recovery Specification

**Status:** **FROZEN v1.0 — REISSUE / RECONSTRUCTED DOCUMENTARY BASELINE / OWNER APPROVED (2026-10-20)**  
**Date:** 2026-10-20  
**Scope:** Local Windows development first; bundled Python sidecar distribution later, under frozen NCD-02/C-03.  
**Authority:** NCD-00/01/02, NCD-03/C-01/C-02/C-03, frozen IIS-01/02, and the subsequently owner-approved IIS-04/05/06/07/08 plus IIS-02-C01 and C-02-C01, only for demonstrated reconciliation; no retrospective claim that these later papers existed at the original IIS-03 drafting date.  
**Implementation authorization:** **NONE**. This paper is tool- and coding-agent-neutral. No repository edits, tests, external tool invocations or task execution are authorized by writing it.

> **Reissue notice (2026-10-20):** This specification is a **new owner-approved frozen reissue** reconstructed from the accessible IIS-03 `DRAFT v0.1` text projection and specifically identified later frozen constraints. **It is not the lost historical frozen v1.0 file.** The historical final bytes, original freeze record and original digest remain unrecovered. Authority for future documentary planning comes from the owner’s new reissue approval and `NCD-03-IIS-03-REISSUE-FINAL-FREEZE-RECORD.md`, not from an assertion of historical byte identity. The Draft v0.1, RC1 and comparison remain archived.

## 0. Provenance, reissue authorization and precedence — FROZEN REVIEW TEXT

**This is a controlled owner-approved reissue, not authentication of a lost original.** The accessible Library copy is a textual projection of `NCD-03-IIS-03-PYTHON-PROCESS-SUPERVISOR-SPECIFICATION.md` headed `DRAFT v0.1 — NOT FROZEN`. The handoff states the owner subsequently froze IIS-03, but the exact historical v1.0 file, its original freeze record, historical approval wording and original SHA-256 are unavailable. Any SHA-256 attached to this reissue identifies **only the newly frozen reissue bytes**, not the lost historical artifact.

**Normative hierarchy for this owner-approved reissue:** (1) frozen parent contracts and narrow approved addenda, (2) frozen downstream constraints insofar as they narrow the permissible IIS-03 implementation without changing parent rules, (3) expressly reconciled statements in this reissue, and (4) unchanged Draft v0.1-origin technical provisions now adopted within this frozen reissue. Historical draft-facing requests cannot override those frozen rules. If a material incompatibility is later proven, separate change control applies; this recovery does not silently amend other contracts.

**Owner authorization and scope:** On 2026-10-20 the owner explicitly responded **“اجل نعتمدها”** to the offered decision to adopt RC1 and freeze it as a formal reissue. This approves the reconstructed IIS-03 v1.0-RC1 technical contents as a **new normative v1.0 reissue snapshot**, with only status/provenance/checklist administration updated here. This is **not** retroactive certification of lost historical bytes. FCCR-01/FFR08-R01 closure is recorded independently in `NCD-FCCR-01-C01-IIS03-REISSUE-CLOSURE.md`; the original review remains unmodified.

**No implementation grant:** No new engine hook, repository edit, Electron Desktop code, database migration, Windows process job or runtime test is authorized by review or adoption of this paper alone.

## 1. Goal and non-goals

Define the **Electron Main-owned Python process supervisor** which launches, tracks, communicates with, cancels and reconciles **two distinct classes of child processes**: a relatively long-lived, non-executing Discussion child, and a dedicated Coding Task child **per explicitly authorized task**. This supervisor never grants itself the authority to approve a coding task: that authority originates from the persisted owner-initiated `Run Task` flow in Main.

**Included:** interpreter/runtime selection, launch manifest, child identity binding, pipe ownership, parser lifecycle, readiness, roles, request routing, writer lanes, cancellation and Windows child-process-tree cleanup, failure and restart, resource pressure, shutdown, durable state handoff and QA.

**Excluded:** SQLite table/SQL schema (IIS-04), Mission Control presentation/event retention (IIS-05), LLM/provider/credential routing (IIS-06), sensitive file broker implementation (IIS-07), Windows installer/build framework or package choice (later packaging plan), engine internals without separate authorization, and any universal external-LLM egress guard rejected/deferred under C-02 FFR-R01. No TCP server, localhost socket or remote agent-hosting framework.

## 2. Fixed authority and data paths

```text
React renderer (unprivileged)
   └── frozen IIS-02 typed Preload API, not generic IPC
         └── Electron Main
               ├── SQLite application store (IIS-04; authoritative UI/admission ledger)
               ├── runtime resolver / supervisor / writer-lane coordinator
               ├── trusted read-only project broker (IIS-07)
               ├── discussion child [role=discussion; relatively long-lived]
               │     └── allowed: discussion.send / broker-originated project.discover, project.read
               └── coding child [role=coding_task; one per authorized task]
                     └── allowed: task.execute / task.cancel; trusted task events
```

Each child owns **private stdin/stdout pipes** (IIS-01 JSONL v1) and **separate stderr diagnostics**; never put raw stdout on UI. Main owns spawning, process handles and request tables; a child owns its own live Python computation but never SQLite or Desktop authorization. A parent-validated ID is an association, not a security capability on its own.

## 3. Runtime resolution and executable provenance — frozen v1 policy

### 3.1 Development stage

1. The Main application has an **explicitly configured and verified** Python 3.11+ interpreter path and a verified local Next Code checkout. Never assume system `python` on `PATH` or automatically choose a random Python executable.
2. Verify interpreter executable exists, source checkout is the expected project, pinned compatibility manifest / required Python imports are available, and the selected bridge entry point reports the supported protocol version. Treat unavailable dependencies as a descriptive configuration failure. **Do not silently download or install packages**.
3. Use `spawn(executableAbsolutePath, validatedArgv, { shell: false, cwd: trustedBridgeDirectory, ... })`, or an equivalent native direct process launch; no shell interpolation of user text, workspace name or task goal. UI input is sent as validated JSONL after READY, not as command-line arguments.
4. Pin the bridge to a compatible Next Code engine revision/contract. Read/check an application-owned compatibility manifest; do not copy or mutate engine internals to make an incompatible API appear to work. A future need for `AgentOS` cancellation/event callbacks requires separate explicit approval.
5. Launch environment uses an explicit allowed baseline (system requirements, Python runtime configuration, locale, deliberate provider credential scope) rather than blindly forwarding all sensitive desktop env variables. Do not put API keys in argv, logs, telemetry or Renderer payloads; their secure source and provider routing belong to IIS-06.
6. Normal app UI startup must succeed even when Python cannot start. Report `RUNTIME_NOT_READY`/safe status and keep existing local conversation data usable.

### 3.2 Distribution stage

Use a **compatible Python sidecar bundled with the Windows app** as frozen by C03-D14. Main resolves **only** its verified internal runtime manifest, validates executable/dependency and version expectations, and uses the same JSONL and supervisor contract. Choice of bundler, extraction/update strategy, signature scheme, installer, code-signing and clean-machine validation are packaging deliverables, **not claimed solved by this paper**.

### 3.3 Binding and child identity

Per child record owned in Main:

| Field | Source | Invariant |
|---|---|---|
| `supervisor_run_id` | Main-generated per app-process run | Different after Main restart; internal only, not a new JSONL field |
| `child_session_id` | Main-generated cryptographically random | Unique at launch; maps a single child handle to its two pipes |
| `process_role` | Main launch decision | Only `discussion` or `coding_task`; child's `ready.payload.process_role` must match |
| `process_handle` / OS PID | OS launch result | Diagnostic/termination handle only; never accepted from Renderer or JSONL |
| `process_start_identity` | OS handle + creation identity where available | Prevent PID reuse from being mistaken for the previous child |
| `canonical_workspace_key` | Main canonical project selection | Immutable for a coding child; discussion broker scope resolved per request |
| `task_id` | Main-issued admission | Exactly one fixed task ID for a coding child; absent for Discussion |
| `protocol_version`, `parser_state`, `pending_requests` | Main | IIS-01 v1 only; pending table is per child connection |
| `state`, `last_error`, `last_observed_exit` | Supervisor observation | Operational observations, **not** independent proof of task success |
| `writer_lease_ref` | Main/SQLite admission | Coding children only; never released on child claim alone |

The IIS-01 `ready` envelope **does not** gain a session token field. Child-session identity is established from the OS pipe/handle that Main created; a replay from a previous connection cannot authorize the new child.

## 4. Child lifecycle state machine — frozen v1 design

**Internal child states** (distinct from user-facing task outcomes):

| State | When entered | What is permitted |
|---|---|---|
| `CREATED` | Launch plan verified | No pipes or requests yet |
| `SPAWNING` | OS child launch issued | Wait for handle/pipe setup, bounded |
| `HANDSHAKING` | Pipes attached | Read exact one-way `ready`; no application requests |
| `READY` | Valid single READY received for expected role | Role-allowlisted requests only |
| `BUSY` | Discussion turn executing or task accepted/running | Respect in-flight caps; reserve task.cancel path |
| `CANCEL_REQUESTED` | Main registers cancel against coding child | Task may still execute, no cancellation success asserted |
| `TERMINATING` | Graceful or forced shutdown in progress | No new executable work, may still receive bounded final observations |
| `EXITED` | Trusted OS handle reports child exit | Outcome remains separate; reconcile before lease release |
| `FAILED` | Launch/handshake/protocol/pipe error, confirmed or classified | No new requests; surface sanitized failure |
| `UNVERIFIED` | Main cannot prove a process has ceased or artifacts stabilized | Keep affected writer lane blocked until reconciliation |

**Allowed primary progression:** `CREATED → SPAWNING → HANDSHAKING → READY ↔ BUSY → EXITED`. Failures may redirect any active state to `FAILED`/`UNVERIFIED`; `CANCEL_REQUESTED → TERMINATING → EXITED` only when verified. States are not a promise that Python code has a cooperative cancellation hook. Task states and verified `TaskOutcome` are managed in the Main/SQLite task model, not conflated with these process states.

**Same child, one READY:** Python writes exactly one canonical IIS-01 `ready` record after bridge initialization and before business requests; process role must match launch type, `version=1`, and ID must be unique on the connection. Main receives READY within **30 seconds from child spawn** (IIS-01 D14); a duplicate READY, malformed preamble, protocol mismatch or wrong role aborts readiness. No request is sent to an unready process. On a new spawn, handshake starts again; a successful previous session does not transfer readiness.

**Startup timeout behavior:** Main diagnoses safely, attempts controlled cleanup with bounded waits, does not queue unbounded input, and updates availability state without claiming the engine ran. If OS process exit is unverified, record `UNVERIFIED` (and keep writer lane blocked if it belonged to a coding task).

## 5. Transport mechanics and strict command routing — frozen v1 design

### 5.1 Parser and framing

Main and Python implement the **exact frozen IIS-01 v1** parser on `stdin`/`stdout`: one UTF-8 JSON object plus LF, no stdout chatter, no BOM, closed five-field envelope `version`, `type`, `message_id`, `correlation_id`, `payload`; reject malformed JSON, duplicate keys, unsupported versions/roles/actions, unknown fields and unsafe sizes. `stderr` is bounded, sanitized **diagnostics only**, never a trusted event or action trigger.

- **Hard record and incomplete-line buffer:** **262,144 UTF-8 bytes**, including LF.
- **Partial-frame deadline:** **15 seconds** after first byte pending LF.
- **In-flight requests per child:** **16 general**; coding task child **one active execute plus one reserved cancel**.
- **Queue bound:** **256 messages and 8 MiB** per incoming event queue and per child outbound pending queue, whichever binds first.
- **Sustained saturation:** **30 seconds** before safe failure/reconciliation.
- Use bounded pipe/drain and producer backpressure; **no new JSONL `ack`, heartbeat or flow-control command** is permitted under IIS-01 v1.
- Message IDs are unique across **both directions on a given connection**, including `ready`; correlation is resolved against outstanding requests of the **same supervised child session**. Ignore/reject stale/foreign/duplicate transport messages.

### 5.2 Closed role-specific command table

| Wire action | Direction | Required child | Main authority prerequisite |
|---|---|---|---|
| `discussion.send` | Main → Python | Discussion | Persisted user message, bound conversation/model/context; no execution authority |
| `project.discover` | Discussion → Main | Discussion | Active bound `discussion_request_id`, canonical project scope and safe broker rules |
| `project.read` | Discussion → Main | Discussion | Same bound parent discussion request, source/secret validation and approved disclosure policy |
| `task.execute` | Main → Python | Coding Task | Explicit owner-approved proposal atomically consumed, task/workspace IDs bound, writer lane reserved |
| `task.cancel` | Main → Python | Same Coding Task | Match active task and child identity; **request**, not task completion |

No additional control commands are introduced. A discussion process that emits `task.execute`, `task.cancel`, task events or direct shell operations violates its capability boundary; Main rejects and safely faults that connection. A coding process cannot request an alternate workspace or an internal worker dispatch via JSONL. `worker.dispatch`, `task.apply_patch`, raw terminal and SQL commands **do not exist** on this wire interface.

### 5.3 Discussion child handling

- **Long-lived relative to a turn**, but restartable, rather than one Python child per user message. Maintain explicit per-turn request identity and conversation association; no one discussion message can borrow another turn's broker scope.
- Main may queue conversation turns to prevent stale/out-of-order assembly; never exceed IIS-01 concurrent in-flight caps. **Adopted reissue v1 default:** serialize provider-dependent `discussion.send` calls **per conversation**, while allowing eligible, separately bound conversations within aggregate child limits. Completion/error resolves only its original persisted message.
- `project.discover`/`project.read` are **child-originated** requests scoped by `discussion_request_id` equal to the outer `message_id` of an active Main-issued `discussion.send` on this same child/connection. Main verifies workspace and source permissions each time; no direct Python FS access is supplied. A completed or restarted parent request invalidates dependent broker authorization.
- Main decides *whether* a model receives a broker-supplied source excerpt under C02-D15 consent and C02-D16 sensitive-file rules. This is **not** an approval of a universal LLM outbound gateway: owner-deferred FFR-R01 stays deferred. Sending data to an external provider requires the applicable **already-approved** project/provider/class consent where needed.
- Reusing an existing persisted user message after a Discussion child crash is **not automatic**: recorded turn survives, but provider request ambiguity is surfaced. Main may restart the **Discussion process**, but may not silently replay a possibly sent LLM request or switch model/provider.

### 5.4 Coding task child handling

- Only Main can create a coding child, **after** the persisted Run Task admission transaction and writer-lane reservation. Each coding process accepts **one** `task.execute` for its fixed task; no second execute on the same child, no other workspace, no hidden background task start.
- Call the current engine facade through its approved **`AgentOS.execute_task(task_goal, task_id, *, conversation_context)`** API, only after the exact C-01 context is validated against the bound canonical workspace and task ID. This specifies the integration boundary, **not** an assertion that a production bridge already exists.
- Emit `response.accepted` for a legitimately admitted `task.execute`; that **is not** a terminal result. Events `task.started`, `worker.started`, `worker.completed`, etc. require actual engine instrumentation; `print()` output is never converted into a trusted structured event by guessing.
- Terminal `task.completed` or `task.failed` must carry the actual compatible `TaskOutcomeV1` per IIS-01, with truthful source evidence. `task.cancelled` requires a real cooperative-confirmation hook; if none exists, do **not** synthesize it from a process kill or response timeout.
- The child completes or exits and is **never reused** for a second coding task. A plain `response.error`, EOF or process exit alone does not prove the task is complete or safe to rerun.

## 6. Workspace writer-lane admission and queuing — reconciled proposal

**Frozen principle:** Concurrent Discussion is permitted; at most **one coding writer for a canonical workspace**. A second separately approved coding task for that workspace waits. **For Desktop v1, a separately owner-frozen global rule restricts the entire app to one active Coding Task and at most 20 queued, regardless of workspace.** Parallel coding across different workspaces is a future separately approved change, not a v1 option.

1. Main canonicalizes the selected workspace before admission, resolves Windows case-insensitive aliases, junction/symlink/reparse escapes as applicable, and records a **workspace identity key** rather than blindly relying on a UI path string. Exact resolver/identity algorithm is shared with IIS-04/IIS-07; if aliasing cannot be ruled out, **deny a second concurrent writer**.
2. An explicit **Run Task** first consumes Main-issued `proposal_id` **atomically**, binding immutable exact goal, conversation, canonical workspace and expiry, with durable idempotency per IIS-02. It then creates `task_id` and a pending writer-lane claim in one transaction with the authoritative SQLite store (IIS-04). No coding process exists before this admission.
3. Only when the **singleton global coding slot** and the canonical workspace lane are both available, Main atomically reserves the slot plus lease, commits the reservation, and then starts the coding process. If occupied, the admitted task becomes **`queued`** and **no coding child is spawned** until the lane is safely available. Queued tasks must remain distinct, traceable and cancellable without executing code.
4. Admission success is a `TaskAdmissionView` with `starting|queued`; it does not mean that `AgentOS` began running. The later wire `response.accepted` likewise does not imply task success. **If a queued task is cancelled before spawn, Main records a verified never-started cancellation in SQLite and removes it from the queue without sending `task.cancel` to any Python process or inventing a `task.cancelled` wire event.**
5. When task finishes or fails, Main records terminal engine evidence **and** verifies OS child/descendant cleanup and project safety conditions before releasing lease and starting the next queued writer. **If cleanup cannot be verified, lane remains blocked for reconciliation**, even if task Python emitted success.
6. SQLite crash/restart must not automatically clear a lease just because the current Main process has no tracked handle. Persisted tasks or leases with uncertain process/artifact state become `unknown`/`needs_reconciliation` until safely resolved by a separately tested procedure.

**Do not conflate:** DB writer-lane lease = exclusion/safety state; OS process handle = observed execution; `TaskOutcome` = engine's task result; `task.completed` event = structured reported outcome; none alone proves all the others. Exactly-once **admission** and exactly-once observed UI event processing do not mean an external provider call was executed or billed exactly once.

## 7. Event ingress and durability handshake without new wire commands — frozen v1 design

1. Python Coding child emits IIS-01 closed task events only, with its assigned `task_id`, unique event ID, contiguous **sequence starting at 1 per task**, and trustworthy `source`/subtype-specific fields. Sequence is assigned **at emission** by the producer across workers, not by Renderer.
2. Main validates child session/task binding, schema and sequence semantics; sends each accepted candidate to its Main-owned SQLite service. **Only after durable commit** may Main notify the renderer with IIS-02 `TaskEventCommitted`/state projection.
3. Duplicate `(task_id,sequence,event_id)` with byte/semantic-equivalent payload is a no-op; a conflicting duplicate is an integrity error. A missing expected sequence is flagged, not invented, and task history is **incomplete** under IIS-01 Option A (no required durable Python retransmission journal).
4. `response.accepted`, `task.cancel` responses and diagnostic stdout/stderr text **do not consume task-event sequence numbers**. No success is claimed from a notification; the user-visible list is loaded from SQLite on demand.
5. If SQLite is unavailable, Main applies bounded pipe backpressure and enters a failed/reconciliation path after timeout; it **never** discards a critical terminal event silently and then claims success.
6. Ending the UI subscription or navigating to another route does not affect process lifetime, writer lease, event collection or SQLite retention.

The exact TaskEvents SQL constraints and query replay cursor are IIS-04/IIS-05 obligations. This paper does not create a second event store or promise exactly-once delivery of Python events after abrupt process death.

## 8. Controlled cancellation and Windows process-tree cleanup — frozen v1 design

**Main is the only cancellation authority.** The renderer exposes only frozen IIS-02 `tasks.cancel(taskId)`; it supplies neither process IDs nor shell commands. Main validates task ownership/state and persists the cancellation request. **For a not-yet-spawned queued task**, Main cancels admission within the authoritative queue transaction and sends no Python command; no claim of an engine-confirmed `task.cancelled` event is made. **For a spawned coding task**, Main sends the fixed IIS-01 `task.cancel` action to the **same bound coding child**.

### 8.1 Graceful window

1. The Python bridge must keep processing its `stdin` control reader while `AgentOS.execute_task()` runs. A separate async reader, control queue or equivalent is required. **Blocking the input reader on the awaited engine task is non-conforming.**
2. Cooperative cancellation is a **required integration capability to design and test**, not a feature assumed present in today's `AgentOS`. An engine-side hook, if necessary, requires separate source-change authorization and cannot be silently replaced by killing the process while claiming `task.cancelled`.
3. After a recorded cancel request, Python acknowledges command registration using the **frozen `task.cancel` response contract**; no terminal task conclusion follows from registration alone. Main allows the frozen **15-second** graceful cancellation window.
4. During graceful cancellation, refuse new work for this child and preserve the writer-lane lock. An actually verified engine cancellation may emit `task.cancelled`; otherwise the task is interrupted/uncertain, never a synthesized success or verified cancellation event.

### 8.2 Escalation and process tree

1. If the child does not stop in 15 seconds, Main initiates an **OS-owned Windows process-tree termination strategy** using trusted parent-held handles and verified child associations. Proposed preferred mechanism: a **supervisor-owned Windows Job Object or equivalent validated descendant-containment primitive**, when supported in the chosen runtime, with explicit close/exit semantics. This **does not** imply a Windows Sandbox or strict filesystem permission isolation (C-02 FFR-R03).
2. A less strong but verified tree termination fallback may be used only if tests prove it does not target a recycled PID, cannot be influenced by Renderer/model strings and can confirm direct/descendant cessation. Do **not** claim ordinary `child.kill()` reliably kills the entire Windows descendant tree.
3. **Terminate ≠ rollback.** Child exit leaves any already-written files and engine checkpoint side effects in place. Main reconciles known OS handles and workspace risk before unlocking or dispatching a queued task. No automatic workspace reset, rollback, forced git checkout, rerun or silent checkpoint import.
4. If Main cannot prove that the process/descendants stopped, retain `needs_reconciliation` and block a second writer. Manual/user-facing recovery procedures will be defined in IIS-04/IIS-08; do not silently relax the frozen single-writer rule.
5. Cancel and terminal events may race. Main serializes durable task-state transitions so that an actual, previously recorded terminal outcome wins where valid; a late cancellation request cannot overwrite verified engine completion, nor can a late terminal message from a dead/replaced child update a new task.

### 8.3 Error conditions

| Scenario | Main action | User-visible truthful state |
|---|---|---|
| `task.cancel` accepted; child still working | Await/verify; keep lease | `cancel_requested` |
| Clean engine-confirmed cancellation and verified process/descendants exit | Commit grounded terminal/cancel state; reconcile files | `cancelled` where proven |
| Grace window exceeded and forced kill verified | Mark interrupted; inspect/reconcile effects; no false `task.cancelled` event | `interrupted`/`needs_reconciliation` as actual evidence permits |
| OS process/descendant survival uncertain | Keep lane blocked | `unknown` / `needs_reconciliation` |
| Task completed before cancel applied | Preserve verified terminal outcome | `completed` (with cancel non-applicable or too late) |
| UI closed during cancellation | Keep supervisor work running until app actually exits; no guessed finish | Reopen from durable records, if Main remained alive |

## 9. Restart, crash and application exit — frozen v1 design

### 9.1 Discussion crash

- A Discussion child crash does **not** cancel a separate Coding Task process or release its writer lane.
- Restarting the Discussion child **is allowed**, with a **fresh READY/ID table** and bounded exponential backoff. **Proposed default:** at most **3 starts within 60 seconds**, with delays **1 s, 2 s, 4 s**; then mark discussion unavailable until a later owner action or explicit UI retry. No unbounded crash loop.
- **Do not automatically replay a possibly delivered LLM turn**; preserve the persisted user message and expose a truthful pending/failed/unknown assistant response. **No same-turn user retry method/UI is authorized in Desktop v1** (IIS-06 frozen v1.0). A new user message via `conversations.sendMessage` is a distinct turn, not a same-turn retry. Existing `discussion_attempts` retry lineage is a data-model capability for a future separately approved interface; an ambiguous provider attempt is not resent automatically.
- Runtime unavailable must not blank the UI, delete drafts or prevent local conversation browsing.

### 9.2 Coding crash

- Never automatically restart a whole coding task, even if the agent process crashes before writing an event.
- A fresh coding child is spawned **only** for a separately admitted task or an explicitly designed and reviewed recovery path with renewed user authorization. Do not re-consume the same `proposal_id`.
- EOF, nonzero exit, invalid JSONL or parent failure triggers conservative reconciliation; if task state is uncertain, keep writer lane blocked and surface that state. An engine-reported `TaskOutcome` must be checked against process termination and persisted facts before lease release.

### 9.3 Electron Main crash/restart

- Main cannot honestly know from an old SQLite state alone whether a Python child or its descendants survived. At startup, reconstruct persisted conversations/admissions/events, identify **possibly active** tasks/leases, and mark them `unknown` or `needs_reconciliation` pending independent process/project verification; do not reissue `task.execute` automatically.
- The trusted Windows child-containment strategy should aim to avoid unmanaged orphan processes after Main death, but **this is a required runtime test, not a guaranteed consequence of having an Electron child process**. If orphan status is uncertain, do not release a writer lease.
- Renderer reload is **not** Main restart: it only refreshes IPC subscriptions and snapshots; supervision continues independently.

### 9.4 User-initiated app quit

- Main must not silently report an active task as finished or leave a known writer running without warning. **Proposed v1:** when app quit is requested with active coding tasks, present a Main-owned native confirmation showing active work and consequences. If the user chooses to wait, remain running; if they confirm quitting, initiate controlled cancellation and bounded cleanup before exit. If cleanup cannot be guaranteed, persist the unresolved risk and warn appropriately.
- Closing a **renderer page/window** versus quitting the **application** are distinct; navigation/renderer crash cannot trigger task cancellation. Actual app-exit behavior must be Windows-tested, including logoff/system shutdown paths and forced Main termination.

## 10. Resource, timeout and fairness budget — frozen v1 design

All limits below **inherit** frozen IIS-01 values. IIS-03 may be stricter, never looser, without an approved new protocol revision.

| Concern | Frozen upper bound/default | Supervisor obligation |
|---|---|---|
| Child spawn → valid READY | **30 s** | Fail readiness; no queued execution transmitted to unready child |
| Partial JSONL frame | **15 s**; **262,144 bytes** | Reject invalid frame, bound parser memory |
| One complete JSONL record | **262,144 UTF-8 bytes incl. LF** | Reject malformed/oversize; do not explode memory |
| General in-flight per child | **16** | Reject/backpressure excess by role and parent turn |
| Coding child | **1 execute + 1 reserved cancel** | Cancel input remains responsive |
| Event ingress / outbound queue | **256 records and 8 MiB** each | Pipe-based backpressure; no silent terminal-event loss |
| Sustained saturated queue | **30 s** | Fail/reconcile conservatively |
| Broker request | **30 s** | Bound filesystem wait; no fabricated scan coverage |
| Discussion provider attempt | **300 s** | Cancel/timeout/retry only as allowed by C03-D12 |
| Graceful coding cancellation | **15 s** | OS escalation after deadline; cleanup verification required |

**Reconciled first-release capacity:** One long-lived Discussion child per Electron Main instance is adopted by the owner as part of this reissue. **Exactly one globally active Coding Task** and a maximum of **20 admitted queued Coding Tasks** are already owner-frozen in downstream IIS-04 and IIS-08, not adjustable merely after QA. Each coding task uses its own child process; queued tasks have no spawned coding child. Exceeding admission queue bound returns a typed `RESOURCE_LIMIT`/`TASK_BUSY` and **does not consume a fresh proposal before knowing that a place is available**; the exact IIS-04 transaction must prove single-use and capacity checks are atomic. These are **frozen v1 design capacity constraints** inherited from IIS-04, not measured performance results.

**Priority:** Main should reserve processing capacity for shutdown/cancellation and SQLite commits even under high-volume worker events. A slow UI subscriber cannot block the supervisor thread; the UI can coalesce transient hints and query durable events, as frozen in IIS-02.

## 11. Internal supervisor interface — FROZEN design; NOT new Renderer or JSONL commands

These are **internal Main implementation methods** for eventual module design, not exposed IPC endpoints and not additional Python wire operations:

| Internal function | Contract |
|---|---|
| `resolveRuntime()` | Inspect configured development runtime or packaged sidecar, return verified launch manifest / typed error |
| `ensureDiscussionReady()` | Idempotent bounded startup; READY check; returns bound child session or error |
| `admitCodingTask(admission)` | Consumes **already-committed** task admission from IIS-04, enforces writer lease, schedules child spawn |
| `spawnCodingChild(taskRecord)` | One child per admitted task; binds canonical workspace/task/protocol session; no task body in argv |
| `sendBoundRequest(sessionId, action, input)` | Construct validated IIS-01 record only after matching role/READY and Main authority |
| `handleBoundFrame(sessionId, frame)` | Validate connection identity, role, schema/correlation, then dispatch safely |
| `requestCancellation(taskId)` | Persist request; send fixed `task.cancel`; apply deadline and escalation |
| `reconcileTask(taskId)` | Consult process evidence, engine outcome and persisted task/lease records; never guess completion |
| `stopAllOnAppQuit()` | Main-owned bounded shutdown coordination and unresolved-state persistence |

Implementation may split files or use other internal names as needed **without changing observable behavior**. The exact TypeScript package layout, Worker Threads, Windows job-object FFI/native binding, platform setup and migration code require implementation planning and live tests.

## 12. Fail-closed error mapping — frozen v1 design

| Failure | Wire signal / detection | Supervisor result | IPC projection (IIS-02) |
|---|---|---|---|
| Interpreter missing/incompatible | Resolver validation | No child spawned | `RUNTIME_NOT_READY` |
| READY timeout or wrong role | Startup timer / invalid wire | `FAILED`, cleanup required | `RUNTIME_NOT_READY` / `INTERNAL_ERROR` sanitized |
| Oversized/malformed stdout | IIS-01 parser | Child connection failed; task may be unknown | `RESOURCE_LIMIT` / sanitized bridge fault |
| Unexpected Discuss child crash | OS exit/pipe EOF | Separate bounded restart; no turn replay | Assistant response failed/unknown |
| LLM provider error/timeouts | Correlated `error`/request result | Preserve selected model; no automatic replay of issued/ambiguous attempts; same-turn UI retry deferred (IIS-06 v1) | `PROVIDER_FAILED` / `MODEL_UNAVAILABLE` |
| Broker denies file or stale metadata | Main broker response/error | No content passed as read | `SENSITIVE_CONTENT` / `SOURCE_STALE` |
| Python child crash during coding | OS exit/EOF | Do not auto-rerun; reconcile, possible lane lock | `TASK_UNKNOWN` / task reconciliation view |
| Duplicate/out-of-order terminal event | Sequence/correlation/schema validation | Integrity error, no fake durable success | Task event history gap / uncertain state |
| SQLite commit failure | Main-owned DB error | Pause/reconcile; no fictional durable event | `DATABASE_UNAVAILABLE` |
| Cancel grace deadline | Main monotonic deadline | Controlled tree escalation, verify stop | `CANCEL_PENDING` or uncertain task |
| App restart with unknown child fate | SQLite recovery scan + OS check | No auto task replay or lease clearance | Task `needs_reconciliation` |

**Critical detail:** These UI error codes must be chosen from IIS-02's frozen set; no raw IIS-01 wire error code, stack trace, environment/secret, shell command or unsafe path becomes an unsanitized renderer projection.

## 13. Cross-contract responsibility boundaries

| Concern | Frozen owner or next specification | IIS-03 role |
|---|---|---|
| Discussion versus Coding executable permission | C-02/C-03/IIS-01 | Enforce process roles, not mint authority |
| Strict JSONL v1 schemas and resource ceilings | IIS-01 | Implement transport and deadline supervision faithfully |
| Renderer method/channel set and UI DTOs | IIS-02 | No new Renderer methods; publish only permitted projections |
| Durable task admission, proposal consumption, writer leases, schema, recovery | IIS-04 | Request/observe state transitions through Main store |
| Task event ordering and Mission Control replay UI | IIS-01/IIS-05 | Validate ingress and wait for SQLite commit before UI publish |
| Discussion gateway/model selection and scoped source consent | C-02/IIS-06 | Bind child/request; no direct frontend provider credentials |
| Canonical project read broker and content filters | C-02/IIS-07 | Route requests to Main broker; never direct Python file reads |
| Test fixtures, Windows failure injection and handoff | IIS-08 | Document required cases, supply process-level harness |
| AgentOS event/cancel hook additions | Separate explicit engine authorization | Flag as implementation dependency; no invented current behavior |

## 14. Required executable conformance and fault-injection matrix — test plan only

| Case | Required PASS observation | Deliberate failure / negative case |
|---|---|---|
| Dev interpreter path | Exact approved interpreter/checkout starts bridge | PATH Python, missing interpreter/import or unexpected checkout refuses |
| Startup one-way handshake | One correct READY before any business request | Wrong role, duplicate READY, version mismatch, no LF, >30s fails |
| Child identity and replay | Requests/answers isolated by handle/session | Reused PID/stale response cannot mutate new task |
| Discussion isolation | Discussion sends only approved actions | Forged `task.execute`, direct FS access API, unscoped broker request denied |
| Run Task admission | One user-confirmed proposal → one coding child after lease | Duplicate click/reloaded mutation/proposal replay cannot spawn a second child |
| Per-workspace writer | Same-workspace task queues until verified unlock | Alias/junction path doesn't allow two simultaneous writers |
| Coding cancellation under load | Cancel delivered while engine runs; 15s graceful deadline applied | Blocked stdin/control loop fails; force termination must not synthesize `task.cancelled` |
| Windows descendants | Trusted process-tree containment/termination verified | Orphan/uncertain descendants block lease and new same-workspace writer |
| Truthful engine outcome | Actual `TaskOutcomeV1`, committed event, verified OS cleanup | Lost/malformed event, missing sequence, stderr `success` text never becomes result |
| Durable event UI | SQLite event commits before push, recovery loads same sequence | DB fault/slow consumer never causes silent terminal-event loss |
| Discussion retries | Bounded child restarts without duplicating LLM turn | Crash after provider accepted request does not auto bill/replay same turn |
| Main crash/restart | Suspect tasks/leases marked for reconciliation, not resumed automatically | Stale SQLite state not treated as proof child exited |
| Renderer route/reload | Work/Agents navigation leaves child running | Unsubscribe from UI may not kill child or drop durable events |
| App exit | Intentional quit choice and bounded cleanup tested | Forced termination/logoff cannot falsely claim cleanup |
| Resource ceilings | 256 KiB records, 16 inflight, queue caps respected | 257th record / sustained saturation handled without memory blowup |
| Security/logging | No Renderer PID/raw command, scoped stderr, secrets hidden | Project path injection, stdout prints, raw LLM instructions not authoritative |
| Packaging compatibility | Bundled version starts on clean Windows when built | Missing sidecar manifests/ABI incompatibility surfaced; no system Python fallback |

**Execution gate:** Actual tests must be run on a Windows development environment, including child process-tree and application-restart fault injection; **no executable tests have been run by drafting this paper**. A documentary PASS alone is not a product reliability PASS.

## 15. Reissue-specific consolidated approval checklist — OWNER APPROVED

- [x] Historical Draft v0.1 text projection preserved separately; no fabricated original v1.0 digest.
- [x] No alteration to five wire commands, five JSONL message kinds, twenty-three IPC Promise methods, three subscriptions, or twenty-two SQLite tables.
- [x] IIS-04 downstream v1 **one globally active Coding Task + twenty queued** explicitly takes precedence over the earlier per-workspace-only narrative.
- [x] IIS-04 durable proposal admission and lease transactions remain authoritative; no automatic `task.execute` replay.
- [x] IIS-06 v1 lack of a same-turn retry UI/API is reconciled; provider ambiguity is not automatically replayed.
- [x] IIS-01 `ready` and process-role/transport budgets are inherited unchanged.
- [x] IIS-05 real-engine events and SQLite committed-only Mission Control are distinguished from child/OS cleanup evidence.
- [x] Windows process-tree safety, cancellation hooks and source-broker protections remain future executable proof obligations.
- [x] **Owner explicitly approved RC1 as a new v1.0 normative reissue** (not retrospective authentication): “اجل نعتمدها” on 2026-10-20.
- [x] Fresh **`NCD-03-IIS-03-REISSUE-FINAL-FREEZE-RECORD.md`** records new approval, this file’s exact SHA-256, the Draft archive and RC1/PRR-01 trace.
- [x] **`NCD-FCCR-01-C01-IIS03-REISSUE-CLOSURE.md`** records the reissue result and documentary-baseline disposition without editing FCCR-01 or declaring runtime G0 tests passed.

## 16. Traceable reconciliation against later frozen contracts (recovery addendum)

| ID | Draft v0.1 issue or gap | Authoritative frozen source | Recovery interpretation |
|---|---|---|---|
| RCV03-01 | Per-workspace writer rule could be misread as permitting two global concurrent coding tasks | IIS-04 T2/T3; IIS-08 baseline | One active coding task **globally**, max twenty queued; workspace alias/lease safety still applies |
| RCV03-02 | Original admission and lease details were deferred to a future IIS-04 | IIS-04 T1–T4 | Atomic `BEGIN IMMEDIATE`-style admission, immutable mutation receipt, single-use proposal, slot+lease, commit before spawn, no rerun on restart |
| RCV03-03 | Draft provider-crash paragraph suggested user-triggered safe retry | IIS-06 v1 §§14, 24–25; IIS-02 closed interface | No functioning public same-turn retry in v1; a new message is a new logical turn; ambiguous provider attempts never auto-replay |
| RCV03-04 | Local process-cancel and `task.cancelled` evidence need precise bounds | IIS-01; IIS-04 T3; IIS-05 | Acknowledged cancel request != engine-cancelled; forced termination != rollback; descendant-safe verified cleanup before lease release |
| RCV03-05 | Generic event dedup statement lacked sticky database integrity clarification | IIS-04 T4; IIS-05 | Event stream conflict remains sticky until separately verified reconciliation; filling a gap changes gap status but does not erase conflict |
| RCV03-06 | Python brokering and model egress should not invent permissions or bypass provider identity | C-02 + IIS-06/07 | Verified same-parent `project.discover`/`project.read`; Main-owned canonical safe read; effective-provider scoped consent; no universal egress gate introduced |
| RCV03-07 | Event and queue limits must remain exact | IIS-01/IIS-02 | Exact size/timeout/allowlists inherited; no new wire/IPC verbs or unauthorized UI stream |
| RCV03-08 | Draft could imply current cancellation/event hook and packaging behavior already exists | IIS-05/07/08 | All are **design obligations requiring authorized source checks and real Windows evidence**, not implemented guarantees |
| RCV03-09 | Owner freeze stated in handoff without verifiable final artifact | Handoff + FCCR-01/FFR08-R01 | Preserve historical approval as reported; replace missing implementer-readable baseline only by **new explicit reissue approval**, never forged original bytes |

## 17. Final owner-approved reissue freeze disposition

**Documentary result: OWNER APPROVED / FROZEN v1.0 — REISSUE.** The complete reconstructed RC1 contract is prospectively adopted as the new authoritative IIS-03 design baseline for NCD-04 **planning**, under frozen parent/addendum precedence. The lost historical IIS-03 file, its SHA-256, and the original freeze record remain unrecovered. The new freeze record establishes the identity of this replacement, without pretending to authenticate the missing original. No runtime conformance, code modifications, IIS-08 G0–G9 acceptance, or permission to start implementation follows from this reissue. Any future change requires separate owner-approved change control.
