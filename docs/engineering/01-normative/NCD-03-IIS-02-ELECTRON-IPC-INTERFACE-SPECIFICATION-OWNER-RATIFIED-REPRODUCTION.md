# NEXT CODE DESKTOP — NCD-03 / IIS-02
## Renderer ↔ Preload ↔ Electron Main — Typed IPC Interface Specification

**Status:** **FROZEN v1.0 — ELECTRON IPC INTERFACE DESIGN — OWNER-APPROVED 2026-10-20 — IMPLEMENTATION NOT AUTHORIZED**  
**Date:** 2026-10-20  
**Authority:** Constrained by frozen NCD-00/NCD-00-C01, NCD-01, NCD-02, NCD-03/C-01, C-02, C-03 and IIS-01 v1.0.  
**Implementation authorization:** NONE. This is a frozen technical interface contract independent of any specific coding agent or IDE; no source code changes, runtime tests, commits or deployment are authorized by this freeze.  
**Review workflow:** Owner explicitly approved the consolidated IIS-02 v0.2 corrections and requested final freeze on 2026-10-20. All public method names, closed DTO types, fixed IPC channel mappings, safety constraints and numeric v1 interface bounds below are **frozen design requirements**. Cross-module implementation internals and unexecuted tests remain future work.
**Provenance of v0.2 corrections (now owner-approved and frozen):** Corrects coverage gaps found in v0.1 concerning provider disclosure consent (C02-D15), conversation-specific Right Dock persistence (NCD-01 D-UI-02/D-UI-05), inspection progress continuity (C02-D13/D14), and idempotency after renderer reload. These are approved as a single consolidated owner-reviewed correction set; no separate per-finding approval is claimed. All parent freezes retain priority.

## 1. Purpose, exclusions and ownership

IIS-01 already defines private JSONL between Electron Main and Python. **IIS-02 defines a different boundary:** the only application functions that unprivileged React Renderer can invoke through a narrow, typed Electron Preload bridge, and the sanitized notifications Main may emit back to the UI.

The UI operates in an Electron renderer with **`contextIsolation: true`, sandboxing enabled, no Node integration and no unrestricted Node or Electron APIs exposed**. Preload exposes only the frozen purpose-built `window.nextCode` API. Electron Main validates all arguments **again**, resolves persisted identity and authorization itself, and never accepts a claimed role, path, task outcome, message authority, token, PID or SQL command from the Renderer. Main alone owns SQLite, Python process control, Run Task proposal authorization, the trusted project file broker and model credential storage.

The current project is **one desktop UI dedicated to Next Code**, not a pluggable AI-agent hosting framework. Do not add a generic RPC transport, marketplace, remote browser session, multiple-agent adapter system or cloud service. No direct renderer → Python, renderer → SQLite or renderer → shell bridge. No web server is introduced for IPC.

**Precedence:** If a method here conflicts with a frozen C-02/C-03 or IIS-01 behavior, the frozen rule prevails; revise IIS-02 rather than silently changing the parent contract.

## 2. Trust and dataflow diagram

```text
React Renderer (unprivileged)
    |
    | narrow Promise methods + typed subscriptions
    v
Isolated Preload API (no generic invoke or Node exports)
    |
    | explicit allowlisted Electron IPC channels (arg + sender validation)
    v
Electron Main (canonical identity / authorizations / SQLite / model registry / supervisor)
    |                            |
    | private JSONL (IIS-01)     | SQLite / scoped local data
    v                            v
Python Discussion / Coding       Desktop records and committed task events
```

- The Renderer may **ask** for a conversation/message/task change but cannot assert that it occurred.
- Preload is a restricted method facade, not the enforcement authority. Electron Main owns every authorization and durable state transition.
- A subscriber sees **only sanitized, Main-verified UI projections**. Raw Python JSONL or stderr is never treated as authorized UI state.
- Renderer route changes, window relayout and Right Dock visibility cannot terminate or duplicate running tasks.

## 3. Frozen typed API: exact v1 surface

**Naming:** The method names below are **frozen IPC API names**, not new IIS-01 JSONL actions. Group methods in the Preload facade for ergonomics but bind each to a fixed, internally private Electron IPC channel. Promise resolutions have typed success/failure results; no loose `invoke(channel, ...args)` or `onAnyEvent` function exists.

| API method exposed to React | Required input | Main-owned result | Permission boundary |
|---|---|---|---|
| `app.bootstrap()` | no args | `BootstrapView` | Read-only startup snapshot, no implicit project/LLM action |
| `projects.listRecent()` | no args | `ProjectSummary[]` | Safe registered workspaces only; no filesystem scan |
| `projects.choose()` | explicit user action, no pathname arg | `ProjectSummary|null` | Main invokes native Windows folder picker and canonically validates selection; cancellation yields null |
| `projects.select(projectId)` | opaque `projectId` | `ProjectSummary` | Main revalidates known workspace; cannot retarget an already-running task |
| `projects.listFiles(projectId, relativeDir, cursor, limit)` | bounded, relative | `FileListingPage` | Main read-only preview policy; no traversal/symlink escape |
| `projects.previewFile(projectId, relativePath, range)` | bounded, relative | `SafePreviewResult` | Main validates canonical path/secret filters, denies unsafe/oversize data; no open-any-file API |
| `conversations.list(projectId?, cursor?, limit?)` | opaque IDs | `ConversationSummaryPage` | Project association resolved in Main; no records from unrelated workspace by spoofing ID |
| `conversations.read(conversationId, cursor?, limit?)` | opaque conversation ID | `ConversationViewPage` | Main supplies stored sanitized records, inspection status and pending disclosure challenges relevant to this conversation |
| `conversations.saveDockState({conversationId,dockState,clientMutationId})` | bounded chat-only presentation state | `ChatDockStateView` | Main persists per-conversation Dock preferences; NEVER writes task states or changes task/terminal processes |
| `conversations.sendMessage({conversationId?,draftId?,text,modelId,clientMutationId})` | bounded text, selected model | `MessageAcceptance` | Main validates/persists user turn atomically; first send may create conversation; no coding task begins |
| `models.list()` | no args | `ModelChoice[]` | Names/capabilities/availability without raw API keys or secrets |
| `models.setDiscussionPreference(modelId)` | supported model ID | `ModelSelectionView` | Preference only; individual message model ID still validated; no silent fallback |
| `disclosures.list(projectId)` | registered project ID | `DisclosureConsentSummary[]` | Main returns only this project's effective-provider-scoped recorded approvals/revocations, no raw content |
| `disclosures.respond({challengeId,decision,clientMutationId})` | Main-issued pending challenge and `approve|deny` | `DisclosureDecisionView` | Explicit user response; Main validates canonical workspace + verified actual provider + disclosure class, records decision/evidence; not an all-provider grant |
| `disclosures.revoke({consentId,clientMutationId})` | Main-issued granted consent ID | `DisclosureDecisionView` | Main revokes future in-scope external source transmissions; does not pretend previously sent content was recalled |
| `proposals.confirmRun({proposalId,clientMutationId})` | Main-issued proposal ID, idempotency key | `TaskAdmissionView` | **Explicit Run Task only**; Main atomically checks proposal/conversation/workspace/exact goal/TTL/single-use and writer lease |
| `tasks.read(taskId)` | Main-issued task ID | `TaskView` | Source-grounded persisted state, unknown state preserved |
| `tasks.list(conversationId?,cursor?,limit?)` | bounded filter | `TaskSummaryPage` | UI projections only; task authority not derived from filter |
| `tasks.cancel(taskId)` | task ID | `CancelRequestView` | Main resolves exact supervised task; response means requested/registered, NOT stopped |
| `tasks.readEvents({taskId,afterSequence,limit})` | task ID, cursor | `TaskEventPage` | Only Main-committed SQLite events, gap information included |
| `tasks.readDiagnostics({taskId,cursor?,limit?})` | bounded | `SafeDiagnosticPage` | Optional bounded/sanitized Agent Logs; never an authoritative event stream |
| `preferences.get()` | no args | `UiPreferences` | Read only scoped display preferences |
| `preferences.update(delta)` | closed allowlist of display settings | `UiPreferences` | No generic configuration/property path, command or provider-secret changes |

**Frozen v1 method-to-channel mapping:** every public Promise method in the table maps **one-to-one** to the constant private `ncd:ipc:v1:<method-name>` where `<method-name>` is its **literal dotted table name**, for example `conversations.sendMessage` → `ncd:ipc:v1:conversations.sendMessage`. The table is a **closed finite registry**, not a facility to construct IPC channel strings from UI-supplied values. Neither Renderer nor model text can request an arbitrary channel. All handler arguments are a **single validated structured-clone-safe input value** (or empty null input for no-argument methods); return is exactly one `IpcResult<T>`; functions, prototypes, buffers, raw errors and OS handles are forbidden in contract payloads. Private channel IDs are implementation-facing and are **not** exported as a generic Preload API.

**Frozen subscription channels (closed registry):** `ncd:ipc:v1:push.task`, `ncd:ipc:v1:push.conversation`, `ncd:ipc:v1:push.runtime`, each routed only to the matching typed `subscribeTask`, `subscribeConversation` or `subscribeStatus` facade with Main-side scope checks; the Renderer cannot choose channels by string. Subscription callbacks return sanitized projections only; unregistering a subscriber never cancels the underlying Python task or discussion.

**The limited disclosure API above implements only already-frozen C02-D15**. It does not introduce a universal egress-control requirement: owner-deferred FFR-R01 stays deferred. Unresolved/effective-provider-mismatch consent is denied at the approved C02-D15 project-content send boundary. The disclosure challenge has to be Main-issued, bounded, scoped and persistently identifiable; a renderer-provided `providerId` or arbitrary grant scope is not accepted. It must not expose blocked files or their protected content.

**No renderer IPC** for `project.read` Python broker commands, `worker.dispatch`, `task.execute` direct dispatch, proposal minting, SQL, raw Python command input, PID-based process termination or arbitrary environment selection. The only execution admission call is `proposals.confirmRun` guarded in Main.

## 4. Frozen common typed result and error contract

All Promise-returning methods resolve to one of two closed shapes; ordinary rejections should be represented as typed error data and unexpected fatal issues caught at the boundary:

```ts
// Normative type shape rendered in TypeScript syntax; NOT implementation code.
type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: UiErrorCode; message: string; retryable: boolean } };
```

**Frozen `UiErrorCode` enum:** `BAD_INPUT`, `NOT_FOUND`, `NOT_AUTHORIZED`, `WORKSPACE_UNAVAILABLE`, `SOURCE_STALE`, `SENSITIVE_CONTENT`, `MODEL_UNAVAILABLE`, `PROVIDER_FAILED`, `RUNTIME_NOT_READY`, `PROPOSAL_EXPIRED`, `PROPOSAL_ALREADY_USED`, `TASK_BUSY`, `TASK_UNKNOWN`, `DATABASE_UNAVAILABLE`, `RESOURCE_LIMIT`, `CANCEL_PENDING`, `INTERNAL_ERROR`. UI codes are Main-side presentation contracts and **are not a sixth JSONL type nor necessarily identical to IIS-01 Python error codes**. Use stable codes plus sanitized messages; no stack traces, raw prompts, `.env`, API keys, unchecked paths or SQL details.

**Principal identity types:** `projectId`, `conversationId`, `taskId`, `proposalId`, `messageId` are opaque, Main-issued IDs; possession of an ID does not confer an authorization. `clientMutationId` is a client-generated retry-deduplication key persistently bound by Main to a logical operation, its owning application/project/conversation scope as applicable, and its **exact canonical input**; it is **not a capability**. Sender webContents/frame trust is separately checked **per invocation**, but an ephemeral window ID MUST NOT be part of the durable deduplication identity: a reload/restart can retry the same mutation ID safely. The same key with changed canonical data or a foreign scope is rejected; same key and identical durable request returns the prior result, including after renderer reload. How SQLite enforces durable uniqueness and expiry belongs to IIS-04.

**Page/result constraints:** All lists are paginated and size-bounded; cursors are opaque and validated by Main against the target record/query. v1 per-page default **40**, max **100** items; maximum rendered diagnostic segment **16 KiB**; file preview bound to already approved C-02 file restrictions and project context. These are frozen v1 UI interface bounds; increasing them requires interface contract review and never overrides stricter IIS-01 wire ceilings.

## 5. Frozen concrete UI DTO contracts

`ProjectSummary`: `{ projectId, displayName, canonicalPathLabel, available }`. Path label is UI presentation data; Main never trusts it as a selected path in subsequent requests.

`BootstrapView`: `{ selectedProject, selectedConversationId, discussionModelId, runtimeStatus, activeTaskSummaries, uiPreferences }`. Opening the app or visiting a route does **not** start a task or imply successful reconciliation of a prior task.

`ConversationSummary`: `{ conversationId, projectId, title, lastMessageAt, taskStatusSummary }`; `ConversationViewPage` adds ordered persisted messages with per-message `deliveryState`, bounded task associations, the last **evidence-backed** `inspectionStatus` (if an inspection exists), and bounded pending `disclosureChallenges` (IDs and safe scope metadata only). A pending challenge is not a consent grant; a failed/reloaded view never invents earlier project inspection.

`ChatDockStateView`: `{ conversationId, visible, primaryTab, terminalSubtab, explicitlyHidden }` with validated closed tab enums and no executable state. The UI retains unsent New Conversation Dock state locally until the first durable conversation exists; then it can persist chat-specific state. Global dock width and safe appearance options belong to `preferences.update`; page-local Agents/Projects/Settings dock state is not mistaken for Chat state.

`DisclosureChallengeView`: `{ challengeId, projectId, providerLabel, disclosureClass, status:'pending', scopeDescription }`; `DisclosureConsentSummary`: `{ consentId, projectId, providerLabel, disclosureClass, status:'granted'|'revoked', updatedAt }`; `DisclosureDecisionView`: `{ challengeId?, consentId?, status:'granted'|'denied'|'revoked' }`. Provider name is display-only and **not** authoritative; Main resolves and validates actual provider/destination before source disclosure. Provider changes or broadened disclosure classes require a new challenge. Consent records live in Main-owned SQLite (IIS-04); no file excerpts or sensitive paths are embedded in disclosure DTOs.

`ProjectInspectionView`: `{ conversationId, state:'not_started'|'discovering'|'reading'|'analyzing'|'completed'|'partial'|'failed', discoveredCount?, actuallyReadCount, excludedCount, coverageNote, updatedAt }`. Optional discovered count remains unknown until enumeration can justify it; never compute a fabricated percentage or assert that enumerated files were read. `coverageNote` is a bounded Main-verified summary, not a model assertion. Main may persist a latest safe snapshot alongside the conversation to support renderer reload; underlying file-reading evidence still belongs to the broker and its approved audit boundary.

`MessageAcceptance`: `{ conversationId, messageId, acceptedAt, deliveryState }` where `deliveryState` is `persisted` only **after a successful Main SQLite commit**, and `rejected` is a failure with no fictional stored message. An upstream model error after durable acceptance must appear as an **assistant-response error**, not as a vanished or duplicated user turn.

`TaskAdmissionView`: `{ taskId, conversationId, projectId, state }` with `state = queued|starting` (`rejected` is represented solely by `IpcResult.ok:false`, never a successful admission). Queued or accepted admission is **not** a task-start/verification/terminal outcome claim.

`CancelRequestView`: `{ taskId, state:'requested'|'already_requested'|'not_running' }`. `requested` does **not** mean that the Python process, its children or file mutations have stopped.

`TaskView`: Main-verified task state including `unknown`/`needs_reconciliation` when process/FS evidence is incomplete. A completed Python wire event does **not** automatically mean writer lease release.

`TaskEventPage`: `{ taskId, events, nextSequence, completeThrough, hasGap, stateIsCertain }`; `completeThrough` is the highest contiguous **durably recorded** task sequence, not a number guessed from received but uncommitted frames. `hasGap` true even if some later records exist. No automatic restoration of missing Python events is promised under IIS-01 D12.

`SafePreviewResult`: `{ projectId, relativePath, text, truncated, sourceRevisionLabel }` for authorized non-sensitive bounded text only; Main may refuse entirely. No direct arbitrary filesystem reads.

`ModelChoice`: `{ modelId, providerLabel, displayName, capabilities, availability }` with closed `availability = available|unavailable|unknown`; model selection depends on actual runtime/provider capability, not on a static marketing list. `UiPreferences` holds a closed versioned record of safe display preferences (including `savedDockWidth`, optional reduced-motion selection, sidebar presentation); updates reject unrecognized configuration fields and may not set engine/provider secrets.

**IPC serialization constraints:** IDs, cursors and scope-bound challenges are opaque bounded ASCII strings; timestamps are offset-bearing ISO-8601 text. Never encode a file nanosecond timestamp as a JavaScript number. `null` and absent fields have **different explicit meanings** where indicated by a DTO; serializers do not silently strip required `null` values. Collections enforce the frozen wire and IPC size budgets independently. Exact persistent table/index names are governed by IIS-04, not the public UI result type.

**Exact representation conventions for the consolidated proposal:** UI timestamps are ISO-8601 strings with offsets (no nanosecond JSON numbers; frozen IIS-01 uses lossless decimal ASCII `mtime_ns` when that source metadata crosses its boundary). Model availability is one of `available|unavailable|unknown`, with `unknown` shown as unverified and not falsely selectable. UI diagnostic text is truncated/sanitized within configured bounds; event retention is governed by IIS-04/05 and cannot authorize guessed recovery. Concrete SQL table fields and clock source belong to IIS-04, without broadening this API.

## 6. Frozen interaction lifecycles

### 6.1 New Conversation / first sent message (NCD-01 D-UI-08)

1. Clicking **New Conversation** creates a **local unsent draft** and must not immediately create an empty persisted SQLite conversation.
2. Renderer submits bounded text and validated `clientMutationId` to Main via `conversations.sendMessage`. The caller may supply a known conversation ID; Main resolves authorization and the selected workspace, not text-derived intent.
3. Main atomically creates any first conversation and its first user message (or appends to an existing conversation). It returns `MessageAcceptance` **only after commit**. The first sent message is now durably accepted even if Python or LLM is unavailable.
4. Only **after** the durable acceptance does UI move from Home/New Conversation to Work conversation, per frozen NCD-01. A send persistence failure retains the editable draft and shows an error, never a fictitious sent bubble.
5. Main schedules a non-executing Python `discussion.send` only for the persisted turn with selected context/model. The eventual response/summary/proposal is separately verified and persisted. Model failure does not reverse the original persisted user message or result in hidden duplicate resend.
6. Renderer retry with the identical `clientMutationId` for the same exact input returns the same accepted result **even after a Renderer crash/reload** when Main has committed the original operation; different data or foreign operation scope under the same key must be rejected. Main must not send a second LLM turn merely because the UI retransmitted an acknowledged mutation.

### 6.2 Discussion proposal → explicit Run Task

1. Python Discussion returns a **candidate** task goal; Main checks scope and creates a Main-owned proposal with `proposalId`, exact stored goal, `conversationId`, canonical workspace, expiry and non-executable status. Merely displaying the candidate never executes code.
2. Renderer can display **Run Task**; only a user-initiated `proposals.confirmRun` IPC request can request admission. No background click simulation, route mount or LLM result may call it automatically.
3. Main performs the atomic single-use transaction on its persisted proposal and task records; it ensures matching conversation/workspace/goal, validity, lease/queue policy and retry/idempotency state.
4. Main starts **at most one** coding process for that authorized task when the workspace writer lane allows it. Other separately authorized same-workspace tasks queue under C03-D5; there is no uncontrolled concurrent writer.
5. The result is `TaskAdmissionView` (queued/starting), never a fabricated `TaskOutcome`. Python `task.execute` and task events follow frozen IIS-01 exclusively under Main's supervision.

### 6.3 Stop Task and uncertain state

1. UI sends only `taskId` to `tasks.cancel`; **never** a PID, raw command or workspace path. Main resolves the supervised coding process and writer lease.
2. Main records/request cancellation, uses IIS-01 `task.cancel`, and returns a `CancelRequestView`; cancellation acknowledgement is not proof of termination.
3. The real task state is updated after verified engine/process events and eventual supervision/reconciliation; errors/EOF cannot release writer locks on guesswork. UI must keep unknown/needs-reconciliation state visible and block false success.

### 6.4 Source-disclosure consent and staged project inspection (frozen C02-D13–D16)

1. Main or the trusted broker may surface only a **Main-issued pending `DisclosureChallengeView`** when a discussion requests protected **external source disclosure** under C02-D15. A source excerpt is never added to an outbound provider request while required project/provider/class consent is missing or revoked; the owner-deferred **general all-path LLM outbound gate (FFR-R01)** is not reintroduced.
2. The Renderer displays the real project, verified effective provider and disclosure class; the user's response calls `disclosures.respond`. Main binds and records the decision to that exact challenge, workspace and effective provider, not to a changeable UI label. An LLM answer, navigation event or stored selected model **cannot** give consent. Revocation through `disclosures.revoke` affects future authorized sends in scope; it does not retract previously delivered data.
3. During staged broker discovery and file reads, Main tracks **actually discovered, read, excluded and unreviewed/unknown coverage** from verified operations, and publishes bounded `ProjectInspectionProgressChanged` UI notifications through the existing **conversation-scoped** subscription. This does not define a sixth IIS-01 JSONL envelope type or fabricate new Python events; broker requests and committed results are the evidence source. If a higher-level Python analysis phase cannot be confirmed, label it unverified rather than pretending progress.
4. A returning UI calls `conversations.read` for the last safely persisted/known inspection view and then reconciles live hints; partial/failed scans retain coverage disclaimers and permit later user-requested expansion. No numeric completion percentage is promised where total eligible files are unknown.

### 6.5 Project changes while work continues

Selecting another project in the UI changes only the **selected/current project for new operations**. Main retains canonical workspace binding for each active task and conversation; UI switching cannot retarget an existing coding child. On an older task's event arrival, Main and UI associate the event with its task/project, not with whichever project is visible now.

## 7. Frozen live notification and replay scheme

**Do not expose dynamic channel names.** The Preload API exposes narrowly scoped subscriptions (conceptually):

```ts
// Frozen public Preload subscription names; schematic type signatures.
nextCode.tasks.subscribeTask(taskId, onTaskUpdate): Unsubscribe;
nextCode.conversations.subscribeConversation(conversationId, onConversationUpdate): Unsubscribe;
nextCode.runtime.subscribeStatus(onRuntimeUpdate): Unsubscribe;
```

**Main-side push types:** only sanitized `TaskStateChanged`, `TaskEventCommitted`, `ConversationChanged`, `ProjectInspectionProgressChanged`, `DisclosureConsentRequired`, `DisclosureConsentChanged`, `ModelAvailabilityChanged`, `RuntimeStatusChanged`. The three additions are **renderer IPC notifications**, not new Python IIS-01 wire `payload.name` event kinds, and may be derived only from Main-controlled evidence/consent state. A `TaskEventCommitted` points to a committed `(taskId,sequence)` and may include a bounded projection; Main never publishes uncommitted events as durable and never grants write capability in a callback.

**Subscribe/replay race safety:** The Renderer **subscribes before taking a snapshot/page**, then requests `tasks.readEvents` (or `conversations.read`); events that arrive during catch-up are buffered with a strict cap, deduplicated by task/event ID and merged by increasing task sequence. Conversation-scoped disclosure/inspection notifications are hints: the Renderer re-reads Main state to establish the latest verified snapshot and must not treat a missed hint as permission or proof that an inspection completed. Alternative implementers may use an atomically captured server cursor for subscribe-and-replay, but must prove no gap under the same tests. A subscription always has explicit `unsubscribe` and is cleaned on renderer teardown; it never stops the Python task.

**Renderer navigation:** Switching Chat ↔ Agents ↔ Projects ↔ Settings, hiding Right Dock or reloading the Renderer only removes UI listeners. Main continues task/process supervision and event persistence. Upon return the page shows only committed SQLite events and accurately reveals gaps/unknown outcomes.

**Backpressure:** Notifications are a **projection over Main's durable store**, not another durable event journal. A slow UI may coalesce *notification hints* and must resynchronize from Main; it may not silently discard underlying committed task facts. Memory bounds and unsubscription on route dispose are mandatory. No arbitrary event-subscription wildcard.

## 8. Electron Main and Preload hardening

- Every IPC channel is **registered explicitly** in Main and accepted only from an allowed application webContents/frame that the app created; validation is done at call time, not from a self-declared sender token.
- Validate typed shape, string-length, pagination, cursor/project/task binding and transaction idempotency **inside Main**, even if Preload performed preliminary checks.
- Use normal contextIsolation, Electron sandbox, restricted external navigation/window-opening, appropriate CSP and no `nodeIntegration`; do not make the React DOM an authority boundary.
- Do not expose `ipcRenderer`, Node `fs`, `child_process`, environment variables, raw SQL, generic `invoke`/`send`, unrestricted file chooser paths or engine-internal state objects through Preload.
- Native file-picker results are resolved/canonicalized by Main; stored project references must be checked again before file previews, model evidence delivery or coding task admission.
- Treat project files, LLM text, summaries, diagnostics, display names and proposed goals as untrusted display data. Renderer uses safe text rendering; no dynamic execution or HTML injection from stored content.
- API keys and provider configuration secrets remain outside React IPC and stored chat/event records. Listing model choices returns capability/status metadata only. External source-disclosure consent is a **narrow separate user-facing API** and cannot bypass protected-file filtering or be minted by model text.
- Stderr is sanitized, bounded **diagnostic data**. A terminal/agent log view may display it but never promote it to a trusted task event or trigger a permission.
- Process-level Python isolation from the entire Windows user file system is **not** promised: C-02 FFR-R03 approved application-level separation only. Do **not** silently reinstate the owner-deferred universal LLM outbound gate (FFR-R01).

## 9. Frozen limits, cancellation, failure and restart policy

- Main's IPC request handler must not synchronously block the Electron event loop waiting for a slow LLM/provider or long-running task. Long-lived work becomes tracked background state; UI queries and subscriptions return promptly.
- Define finite request timeouts for quick read-only IPC, but `proposals.confirmRun` completion means **admission transaction**, not waiting for `AgentOS.execute_task` to finish.
- On renderer crash/reload, Main does not rerun tasks, remint approvals, replay Python command writes or automatically treat unsent drafts as persisted; it reconstructs UI from durable SQLite records.
- On Python child failure, message is accepted if previously committed, task remains unknown as warranted, and the UI renders a reliable provider/bridge failure without changing model silently.
- On Main SQLite commit failure, an operation returns `DATABASE_UNAVAILABLE`, has no claimed persistence success, and leaves tentative task admission in a safe state. Recovery/transaction specifics belong to IIS-04, not an invented implicit success path.
- Frozen v1 bounded IPC arguments: user text ≤ **16,384 Unicode code points** (same measurement unit as frozen IIS-01), preview ≤ **16,384 Unicode code points** and independently bounded UTF-8 bytes, page limit ≤ **100**. Validate before expensive operations; JS UTF-16 `.length` alone is not an equivalent code-point check. Limits apply before expensive operations. Exact timeouts for Electron UI IPC can be refined during IIS-03/IIS-04 review.

## 10. Frozen conformance and adversarial acceptance matrix

| Requirement | Positive case | Negative / fault case |
|---|---|---|
| Typed restricted Preload | Known `app.bootstrap`, `conversations.sendMessage` succeed | Any generic channel access / raw Node / Python / SQL / external URL forbidden |
| Conversation first message | First persisted send creates conversation+message, then navigates to Work | SQLite write fail leaves editable draft and no fake sent message |
| Message retry | Same mutation key + identical payload gives same accepted record across renderer reload | Same key + changed payload/scope rejected; no duplicated first messages or discussion requests |
| Model choice | Main-approved `modelId` passed through to discussion | Unsupported provider/model rejected; no silent fallback or secret leak |
| Source-disclosure consent | Main-issued challenge displayed, user approves exact project/provider/class, later revokes | No challenge, altered provider, source leak before approval, revoked/broadened scope, model-generated approval denied |
| Per-conversation Dock | Manual Chat hide/tab saved and restored per conversation; resize remains global | Navigation to Agents/Projects cannot overwrite Chat state, or start/cancel processes |
| Staged inspection UI | Read/discovered/excluded counts from broker evidence; view restores bounded partial status | Missing/unfinished enumeration cannot invent percentage, model summary cannot claim unread files inspected |
| Project scope | Main-scoped native folder selection, safe preview works | `../`, symlink/reparse escape, sensitive content, or forged ID denied |
| Proposal approval | Actual Run Task on valid fresh proposal consumed once | Stale/used/wrong project/changed goal/automatic suggestion fails |
| Per-workspace writer | One coding task starts, next same-workspace task queues | Duplicate click/replay cannot launch second writer |
| Cancel | Main targets real supervised task, returns requested, continues reconciliation | Renderer-supplied PID, foreign task ID, lost process may not claim canceled or unlock |
| Task UI replay | Subscribe + snapshot + durable events reconstruct Mission Control | Navigation/reload, duplicate hint, missing seq/DB failure remain explicit |
| Sender validation | Own application webContents uses allowed channels | Untrusted frame / invalid payload / unknown method refused |
| Logging and rendering | Bounded sanitized agent logs shown as diagnostics | Sensitive stderr is not trusted event, raw shell, credential or HTML injection |
| Restart | Main reconstructs known records but marks unverified work unknown | App restart cannot autocontinue unsafe task or consume proposal again |

**Acceptance evidence:** Real Electron preload isolation test, Main channel validators, SQLite transaction tests and process/event replay tests. Negative tests must be executed on an actual build before claiming PASS; this document contains **test design only**, not executed test results.

## 11. Completed documentary freeze checklist (not runtime certification)

- [x] Documentary verification: the method list is minimal yet covers approved New Conversation, project selection/preview, chat, model selection, **project/provider disclosure consent and revocation**, **per-conversation Dock state**, Run Task, Stop Task, agent Mission Control and settings.
- [x] Documentary verification: no unexpected direct renderer authority to Python, file system, database, models or OS processes.
- [x] Documentary verification: durable user-message acknowledgement semantics before Work navigation; drafts protected on send failure.
- [x] Documentary verification: idempotent task approval, one writer per canonical workspace, and uncertain task outcome handling.
- [x] Documentary verification: subscription/replay gap/duplicate behavior fits frozen IIS-01 and SQLite authority; **separate broker-derived inspection progress and consent UI hints from task-engine event sequences**.
- [x] Documentary verification: error/DTO/cursor limits are implementable and align with later IIS-03/IIS-04/IIS-05 schemas.
- [x] Documentary verification: no coding-agent/IDE-specific assumptions, plugin hosting or cloud server scope creep.
- [x] Owner approved consolidated v0.2 and explicitly authorized IIS-02 freeze on 2026-10-20. No implementation permission follows from freeze alone.

## 12. Consolidated review findings incorporated and frozen (v0.2 → v1.0)

| Finding | Trace to frozen parent | Consolidated correction | Status |
|---|---|---|---|
| IIS02-R01 | C02-D15 — explicit revocable external project/provider disclosure | Add narrow `disclosures.list/respond/revoke`, Main-issued challenge, validated effective provider and persistence | APPROVED BY OWNER IN CONSOLIDATED FREEZE — DOCUMENTARY CLOSED |
| IIS02-R02 | NCD-01 D-UI-02/D-UI-05 — conversation-specific Smart Dock | Add `conversations.saveDockState`, keep unsent draft local and global width separate | APPROVED BY OWNER IN CONSOLIDATED FREEZE — DOCUMENTARY CLOSED |
| IIS02-R03 | C02-D13/D14 — staged inspection and truthful progress | Add conversation-scoped verified progress notification and snapshot, no guessed completion | APPROVED BY OWNER IN CONSOLIDATED FREEZE — DOCUMENTARY CLOSED |
| IIS02-R04 | NCD-01 D-UI-08; C03-D8 — durable, idempotent message acceptance | Dedup independent of ephemeral window instance, preserving strict sender validation on each call | APPROVED BY OWNER IN CONSOLIDATED FREEZE — DOCUMENTARY CLOSED |
| IIS02-R05 | IIS01 D14 — 16,384 Unicode code-point input cap | State code-point validation explicitly, not ambiguous JS UTF-16 character length | APPROVED BY OWNER IN CONSOLIDATED FREEZE — DOCUMENTARY CLOSED |

**Final freeze disposition:** The 23 public Promise methods, 3 typed subscriptions, DTO and error models, closed channel registry, authorization rules, proposed-in-v0.2 repairs IIS02-R01–R06 and bounded defaults are frozen together by the owner's explicit 2026-10-20 direction. This is a **design and documentation freeze**, not a claim that implementation exists or tests passed. Parent freezes take precedence if a true conflict is later evidenced.

## 13. Final freeze audit and cross-contract traceability

| Freeze control | Audited result | Next implementation owner |
|---|---|---|
| Closed Preload Promise surface | 23 unique public methods, no generic IPC invocation or arbitrary channels | Electron Main + Preload (later implementation) |
| Typed subscription surface | 3 scoped subscriptions and bounded, Main-verified notifications | Electron Main + Preload (later implementation) |
| IIS02-R01–R06 | Corrected in consolidated v0.2 and approved as a single group; no additional runtime outcome implied | IIS-06/IIS-07 as needed for effective-provider/safe-file boundaries |
| IIS-01 v1.0 compatibility | Python JSONL remains five top-level message types and five commands; UI IPC does not introduce wire actions | IIS-03 Python supervisor |
| Workspace/admission protection | Main retains Run Task authorization, one writer per workspace, no renderer-claimed authority | IIS-03 + IIS-04 |
| Persistence and UI replay | SQLite owner remains Main; accepted input and task events must be durable and queryable, uncertain states stay visible | IIS-04 + IIS-05 |
| Owner-deferred FFR-R01 | Universal external-LLM egress gate stays explicitly deferred; narrowly scoped C02-D15 source consent remains obligatory | IIS-06/IIS-07 |
| Documentary review | Completeness, method deduplication, fixed mapping and frozen parent boundaries reviewed | CLOSED FOR DOCUMENTATION |
| Runtime tests | Electron sandbox, Main validators, SQLite, process, race and Windows tests have **not** run | MANDATORY FOR IMPLEMENTATION ACCEPTANCE |

**Normative limits:** This freeze does not specify SQL schemas, supervisor PID/tree management, actual Python executable packaging, broker file scanning, internal engine instrumentation, provider endpoints or unverified task recovery. The later IIS-03 through IIS-08 documents must fill those internal contracts without extending Renderer authority or silently changing this public IPC surface.

**Freeze state:** **FROZEN v1.0 (2026-10-20).** Source code is unchanged and no implementation, release, tests, deployment or automatic task execution is authorized by this document.
