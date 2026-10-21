# NCD-02 — Next Code Desktop Architecture

> **Document ID:** NCD-02  
> **Status:** FROZEN — Architecture Baseline v1.0 (OWNER APPROVED 2026-10-18; FFR-01 DOCUMENTARY PASS)  
> **Date:** 2026-10-18  
> **Precedence:** `NCD-00-PROJECT-SCOPE.md` (FROZEN v1.0) + `NCD-00-C01` (controlled addendum), and `NCD-01-UI-UX-SPEC.md` (FROZEN v1.0).  
> **Authorization:** Approval of architecture baseline only. **NO ANTIGRAVITY EXECUTION, NO REPOSITORY CHANGES, NO CODE IMPLEMENTATION.** Subsequent changes to normative architecture require an explicitly approved amendment.

## 1. Architecture goal

Build one **Windows-first**, local desktop application **for the existing Next Code Python agent only**. Keep the existing agent repository independent and authoritative for its kernel, brain, architect, squad, safety gates, and orchestration. A dedicated desktop repository supplies the UI, app lifecycle, local storage, and a narrowly scoped communication boundary. **Do not build a multi-agent hosting platform or plugin SDK.**

The UI must satisfy the frozen NCD-01 design, including the new logo, Premium Balanced theme, New Conversation, Coding Conversation, Agent Mission Control, Smart Right Dock, and a critical runtime invariant: **navigation across Chat, Agents, Projects, and Settings must never stop, duplicate, or restart a running task.**

## 2. Verified implementation context and limits

The reviewed `naoufelbvb2-arch/next-code` repository contains Python `agent_os.py` (`AgentOS` with async `execute_task(task_goal, task_id?)`), `run.py` (CLI), and the `kernel/`, `brain/`, `architect/`, and `squad/` packages. The documented current implementation exposes task results and verbose prints, but an independent structured desktop event stream or safe task-cancellation API has **not yet been established**. NCD-03 must inspect exact engine behavior before guaranteeing event granularity or cancellation.

The existing agent repo is **read-only as far as this project authorization is concerned**. Engine changes require their own review and explicit approval.

## 3. Selected desktop stack and approved architecture baseline (integration details deferred)

```text
              Windows Next Code Desktop App
┌─────────────────────────────────────────────┐
│ Renderer: React + TypeScript                │
│ UI: Sidebar | Chat | Mission Control | Dock │
│ Display state; no direct OS/engine authority│
└────────────────────┬────────────────────────┘
                     │ typed restricted IPC
┌────────────────────▼────────────────────────┐
│ Electron Preload (allowlisted functions)    │
└────────────────────┬────────────────────────┘
                     │ validated IPC
┌────────────────────▼────────────────────────┐
│ Electron Main: desktop/window services      │
│   - process supervisor (lifetime above UI)  │
│   - request dispatch and event fanout        │
│   - local SQLite app data persistence        │
│   - authorized read-only file preview       │
│   - terminal service (separate when enabled)│
└────────────────────┬────────────────────────┘
                     │ supervised stdio / JSON Lines (A-03 APPROVED)
┌────────────────────▼────────────────────────┐
│ Dedicated Python bridge: Next Code only     │
│   invokes existing AgentOS through contract │
└────────────────────┬────────────────────────┘
                     │ Python imports/calls
┌────────────────────▼────────────────────────┐
│ Existing Next Code agent repository         │
│ L1 Kernel | L2 Brain | L3 Architect | L4 Squad│
└─────────────────────────────────────────────┘
```

The owner has approved **A-01: Electron as the Windows desktop framework**, retaining the planned **React + TypeScript renderer**, and **A-02: Electron Main owns the task/process supervisor**. Main/Preload/Renderer privilege separation and task supervision above React route lifecycles are approved. **A-03 transport is approved:** supervised local child-process **stdin/stdout** with explicitly framed **JSON Lines (one valid JSON object per newline)**. The exact full message schema and task-level semantics are reserved for NCD-03. The transport must be local, not an externally exposed server, unless an explicit reviewed reason demands otherwise. The Python bridge is **specific to Next Code**, not an extensible host framework.

## 4. Responsibilities and forbidden couplings

| Boundary | Owns | Must NOT do |
|---|---|---|
| Renderer | Visual composition, per-page navigation, presentation state and accessibility | Run Python directly; read arbitrary local paths; hold API secrets; supervise task processes |
| Preload | Small typed and allowlisted bridge to privileged operations | Expose generic Node APIs, unvalidated IPC, or unrestricted shell execution |
| Desktop Main | App window, process supervision, IPC verification, safe persistence, workspace selection/read-only preview | Reimplement Next Code's planning, patching, role dispatch, rollback, or verification |
| Python Bridge | Map a small desktop request/event contract to `AgentOS` lifecycle and structured outcomes | Modify engine policy, fake agent states, turn uncontrolled verbose stdout into trusted events |
| Next Code | Autonomous engineering behavior, model access, security gates, checkpoints, worker lifecycle | Depend on React/Electron or specific page mount states |

Agent Logs (structured app records and verified engine outputs) are separate from the future independently managed Interactive Shell. Hiding UI panels never stops processes.

## 5. Long-running tasks independent of UI routes

- A task is owned by a **process/task supervisor outside the Renderer**. The Renderer may subscribe/unsubscribe to updates without changing execution state.
- Each execution has a stable `task_id` plus an explicit association with a `conversation_id` and a selected `workspace`.
- Navigate/close Sidebar/close Dock/unmount a page: no automatic kill, no duplicate dispatch, no reset of running task.
- A new conversation may open while an existing task is active, but **the concurrency policy and messages submitted while busy are not decided in NCD-02**. NCD-03 must specify whether to reject, queue, or permit concurrent tasks before coding.
- Application exit/crash and worker process recovery are separate from page navigation. **Do not promise survival after app exit** without a reviewed protocol.

### 5.1. A-02 approved decision: Electron Main task supervision

**Decision A-02 — APPROVED (2026-10-18):** Electron Main owns the lifecycle of Next Code task execution and its supervised Python child process(es), independently of mounted React routes or visible UI panels. Renderer navigation, reload, or Dock visibility changes must not terminate, re-dispatch, or lose authoritative ownership of a running task. The Renderer only subscribes to status and submits validated user requests through Preload; a task is started only by an explicit accepted command to the Main supervisor.

**Boundaries:** This approval **does not** decide whether Python uses a long-lived bridge or per-task child processes, how concurrent tasks are queued or rejected, how cancellation and rollback work, or what happens on application shutdown/crash. Those are separate questions for NCD-03 and subsequent lifecycle/packaging review. The supervisor shall track stable task IDs, conversation/workspace association and authoritative lifecycle states; it must not infer successful work from terminal output or fabricate progress events. Actual safe recovery and attach/replay behavior must be specified and tested before being promised.

### 5.2. A-03 approved decision: private stdio transport and JSON Lines framing

**Decision A-03 — APPROVED (2026-10-18):** Electron Main starts and supervises a dedicated Next Code Python bridge as a **local child process**, sending typed requests through its **stdin** and receiving typed responses/events from its **stdout** using **newline-delimited JSON (JSONL)**. The app does not bind a localhost TCP port or expose a remote HTTP/WebSocket service for this bridge. The connection remains under the Electron Main supervisor and never originates directly from React.

**Non-negotiable wire rules:**

1. The bridge's **stdout is protocol-only**: each complete line is precisely one JSON object. Incidental prints, traceback text, progress bars, or terminal logs must not enter this stream. **stderr** is for diagnostic messages; it must not be parsed as authoritative task state. Avoid credentials, secrets and unnecessary user data in logs.
2. Existing `run.py` and the current `LeadArchitectLoop(verbose=True)` emit human-readable text, including to stdout. Therefore **calling the old CLI and parsing its prints is forbidden**. The bridge must invoke the Python `AgentOS` facade using an isolated integration path that captures/redirects/suppresses non-protocol stdout *without losing essential diagnostics*. Detailed treatment and regression checks belong in NCD-03.
3. Every request/response must have a validated message `type`, a unique correlation/request identifier, and explicit versioning; task-scoped records also carry `task_id` and bind to the authorized `conversation_id` and workspace association. Unknown versions/types, malformed JSON, oversize records, unexpected responses and wrong correlation are rejected or reported as protocol errors, **not** interpreted as success.
4. The protocol needs a minimal handshake/readiness boundary before accepting tasks. Event delivery, replay semantics, accepted-versus-running distinction, flow control, backpressure, pipe failure handling, timeout decisions and stream caps shall be concretized in NCD-03. **Do not fabricate real-time detailed worker progress** before the engine exposes trustworthy structured events.
5. All incoming data must be treated as untrusted by Electron Main, with schema validation before forwarding only approved payloads to the Renderer. Process exit/disconnect must result in an explicit uncertain/failed connection state, with task reconciliation; never infer that work was safely rolled back or completed from the mere exit code.
6. Agent Logs (observability) and the future **Interactive Shell** are separate concerns; the independent shell must never share this protocol's stdin/stdout stream.

**Out of scope of A-03:** Whether one Python process serves an entire session or each task, task parallelism policy, cancellation/rollback behavior, recovery after app exit, detailed JSON event schemas, and the precise portable Python packaging approach. These are not silently approved and must be settled in NCD-03 and/or later architecture decisions.

## 6. Local data ownership — A-04 APPROVED: SQLite

**Decision A-04 — APPROVED (2026-10-18):** Next Code Desktop persists its **application-owned** data in a **local SQLite database**. No external database service, remote sync, or new server is required. Electron Main owns the database access layer; Renderer code must never open database files, issue SQL, or receive privileged filesystem/database access through Preload.

Application-owned logical records are:

1. **Conversations and messages:** user-visible conversation metadata, project/workspace association, message ordering, user drafts, and explicit delivery/acceptance status.
2. **Task records:** stable `task_id`, association with conversation/workspace, verified task lifecycle and final outcomes. A persisted status is **not** proof that an OS process still exists after restarting the application.
3. **UI preferences:** theme/motion settings, Sidebar state, panel widths and visibility, and other frozen NCD-01 layout preferences.
4. **Optional bounded presentation history:** only data actually supported by trustworthy engine events or reports; never synthesize worker events or store invented progress.

**Strict data ownership boundary:** Existing Next Code `.agent_os` files, Blackboard, checkpoints, and any engine-owned memory are **not imported into or replaced by the Desktop SQLite database**. The app may reference a task identifier or workspace path to correlate an outcome, but the engine retains authority for execution truth, checkpoints, rollback, and worker lifecycles. A desktop DB record must not be used as a substitute for engine reconciliation.

**Security and reliability requirements:**

- Place the database in an application-owned per-user data location on Windows, **not** inside an arbitrary opened project/workspace or source repository. Exact OS path and naming are implementation details to validate.
- All writes occur through a reviewed Main-process data-access service with parameterized queries, transaction boundaries for multi-record changes, and recoverable errors. UI requests must be schema-validated before persistence.
- Use explicit, versioned schema migrations and test an upgrade path. Migration strategy, backup policy, journal mode, library/driver selection, and retention limits will be specified before implementation; choosing SQLite alone does not approve any particular ORM or npm dependency.
- Never store API keys, tokens, or credentials in plain text in the database. Windows credential storage/secret-handling contract belongs to the security design.
- A message may be **draft**, **submitted**, **acknowledged/accepted**, **failed**, or other later-defined states; the exact persistence-versus-bridge acknowledgement rules and recovery semantics are owned by **NCD-03**, not inferred here.
- Preserve the NCD-01 guarantee that page navigation and Dock visibility never cancel running tasks. The application data layer records state but must never be the task executor.

**Not decided by A-04:** precise SQLite schema and indexes, package/driver, data migrations and backups, storage of very large logs, task replay/recovery after process death, or simultaneous write policies. These need explicit implementation contracts and tests in NCD-02/NCD-03/NCD-04 as appropriate.

## 6.1. A-05 approved: Windows maximized startup and adaptive window bounds

**Decision A-05 — APPROVED (2026-10-18):** The initial Windows desktop window **opens maximized by default** (not exclusive fullscreen or kiosk mode). Users may restore, move, resize, minimize, and re-maximize it via normal Windows controls. This explicitly chooses **Option A**, not the medium-sized centered-window option.

**Visual and lifecycle constraints:**

1. UI fitting follows the frozen NCD-01 layout behavior. Preserve the central working area when available space tightens; temporarily compact the Sidebar to its icon rail as needed. A temporary responsive adjustment does **not** overwrite the user's saved layout preferences.
2. The Smart Right Dock must observe its existing Home/Chat/Agents behavior and user's manual visibility overrides. **Do not unconditionally show the Dock just because the native window is maximized.**
3. Resizing, restoring, minimizing, maximizing, moving the native window, and changing DPI must **not** cancel, duplicate, or restart any running Next Code task. The task supervisor remains in Electron Main (A-02).
4. Validate native scaling at **100%, 125%, and 150%** on Windows, including a secondary-monitor move if test hardware supports it. Text, controls, and focus/keyboard paths must remain usable. Do not assume CSS pixels are equivalent to physical monitor pixels.
5. **Native minimum window width/height are not approved numeric constants yet.** Their exact values require Windows tests against the frozen NCD-01 protected-center and dock-sizing rules. When viewport constraints make the complete layout impossible, use the NCD-01 responsive fallback rather than clipping critical controls.
6. Persisting optional user window bounds and whether a user-initiated restore should be respected at next launch is a separate detailed behavior to be specified during implementation planning. It must not reverse the selected **maximized-default** initial experience without user approval.

## 6.2. A-06 approved: development Python first, packaging later

**Decision A-06 — APPROVED (2026-10-18), Option A:** During initial development on the owner's Windows machine, Next Code Desktop uses an **already installed and explicitly configured Python 3.11+ environment** and the **existing locally checked-out Next Code agent repository**. Electron Main launches only the dedicated, controlled Python bridge through the approved A-03 child-process transport. We **do not** require, design, or claim a fully self-contained Windows installer as a prerequisite for initial UI/bridge development.

**Development-stage operating contract:**

1. The selected Next Code checkout and Python interpreter are independently configured and verified before dispatch. Do not assume that `python` on `PATH` is the correct interpreter; prefer an explicit, validated interpreter path and a verified compatible working environment. Detect missing Python, imports, wrong versions, missing agent checkout, or incompatible dependencies; report clear setup errors instead of fabricating success.
2. The original agent source remains in its own repository; the desktop project must not vendor, fork, copy, or modify its internal logic as a workaround. Any later need for additional agent callbacks/API hooks requires an explicit, separate engine-side authorization.
3. Electron Main starts the Python child **without interpolating untrusted task text or workspace paths into a shell command**. Pass arguments and input through separately validated channels. Do not expose unrestricted execution paths to the Renderer.
4. The Python bridge is specific to Next Code and may import the installed agent package from the selected environment. Its bridge dependencies and compatible engine revision must be documented/tested before coupling to live tasks. A live integration smoke test shall use an explicit approved workspace and show actual start, observable completion/failure, and clear error handling.
5. Lack of Python or network/API access must not prevent opening the desktop **UI shell**. Disable or explain unavailable live execution, preserve user drafts as appropriate, and do not suggest the agent is working when it cannot start.
6. The A-02 task-lifetime guarantee across page navigation remains unchanged. An uninstalled Python environment or application shutdown behavior is **not** solved by this packaging decision.

**Distribution-stage direction, explicitly deferred:** After the UI, bridge, and actual Windows integration tests pass, evaluate a deployable Windows package that includes or reliably provisions the **compatible Python runtime, agent application and dependencies**, without requiring the end user to install Python manually. Select the specific freezing/bundling strategy, dependency/license handling, signature/updates, installer configuration, compatibility pinning, and clean-machine validation **later**, during NCD-04 implementation/packaging planning. No bundled-runtime claim is approved until a clean Windows machine verifies startup, execution, error handling and security.

**Out of scope of A-06:** pyinstaller/Nuitka/etc. choice, Python runtime embedded path, installer build system, version pinning, automatic engine updates, concurrency, task cancellation, or survival of running jobs across app exit; NCD-03 and/or the implementation/packaging contract must settle them before related features are built.

## 7. Security principles

- Keep Electron Renderer sandboxed, use `contextIsolation`, disable direct Node integration, and expose a restricted Preload API. Apply per-operation argument and path validation in privileged code.
- Never treat a path chosen or typed by UI as automatically safe. Bound file preview operations to the selected local workspace; prevent traversal and unexpected symlink escapes; enforce file type/size limits. NCD-03 defines exact permitted file operations.
- Avoid exposed localhost listeners when a private child-process communication channel suffices. Do not put credentials in UI messages or logs.
- Treat all Python bridge messages as untrusted until they pass contract validation; errors and unknown status must be honest.
- Do not add a functional Interactive Shell without its independent process/permission/security contract and tests.

## 8. Performance and accessibility constraints

- Meet NCD-01 responsive layout policy (expanded Sidebar 256px, compact 64px, Dock preference 360px, Dock range 320–480px, 580px protected center). Native minimum window dimensions need real Windows viewport/scaling QA, not a guessed value.
- Reduced-motion handling; no continuous React rerender just to animate background waves.
- Project files, logs, and agent activities must not block the UI thread. Overflow should be bounded/virtualized where measured necessary.
- Local-first UI does not imply offline agent inference: the current agent may need external model API access.

## 9. Deployment boundary (A-06 approved; distribution details deferred)

- Windows-only dev and packaging in v1.
- Running on the owner's own machine is first priority; broad installer distribution is later.
- In development, use an explicitly configured and validated local Python 3.11+ environment and the existing Next Code checkout (A-06); show actionable setup errors if unavailable. Future end-user deployment aims to avoid manual Python installation, but the bundling mechanism is **deferred** until integration and clean-machine tests prove it. Do not claim a fully standalone build before verification.
- The separate original agent repository remains the implementation authority for actual Next Code behavior.

## 10. Approved architecture decisions and deferred integration issues

| Decision ID | Question | Initial recommendation | Status |
|---|---|---|---|
| A-01 | Desktop framework | **Electron** on Windows with **React + TypeScript** Renderer, Main/Preload privilege separation; dependency versions and build tooling deferred to implementation planning | **APPROVED — 2026-10-18** |
| A-02 | Host for running tasks | Electron Main owns task/process supervision above React route lifecycle; no implicit stop/re-dispatch on navigation | **APPROVED — 2026-10-18** |
| A-03 | Python communication | **Supervised stdio + JSON Lines**; stdout protocol-only, stderr diagnostics, explicit IDs and validation; no localhost server | **APPROVED — 2026-10-18** |
| A-04 | UI data persistence | **Local SQLite** for desktop-owned conversations, messages, task records and UI preferences; keep `.agent_os` engine-owned | **APPROVED — 2026-10-18** |
| A-05 | Windows startup presentation | **Maximized by default**; resize/restore/minimize permitted; preserve NCD-01 adaptive layout; numeric native minimum deferred to Windows QA | **APPROVED — 2026-10-18** |
| A-06 | Packaging with Python | **Option A**: validated local Python and original agent checkout during development; assess self-contained Windows packaging after tested integration | **APPROVED — 2026-10-18** |
| A-07 | App closed during task | Separate safety/lifecycle design; not guaranteed by NCD-01 navigation decision | NCD-03 |
| A-08 | Concurrency, ongoing follow-up, model routing, events, cancellation | Strict engine integration contract, not inferred from CLI prints | NCD-03 |

## 11. Architecture acceptance gates (to be verified during implementation)

- AR-01: A route change in Renderer cannot invoke `stopTask`, `startTask`, or destroy the supervised task process through component cleanup.
- AR-02: Restarting/refreshing the Renderer does not silently create another execution for the same task ID.
- AR-03: File preview never accesses a file outside the authorized workspace and never modifies a file.
- AR-04: Unavailable worker events and model profiles never appear as fabricated live states.
- AR-05: Original Next Code repository has zero modifications without separate authorization.
- AR-06: Preload exposes only reviewed operations, and invalid payloads are rejected.
- AR-07: Visual shell respects NCD-01 fit rules while live task remains independent of Dock state.
- AR-08: Failed message delivery keeps the draft and does not claim the task was accepted or completed.
- AR-09: All chosen architecture choices have reproducible Windows tests and traceable implementation requirements in NCD-04.

## 12. Freeze approval and next step

**FROZEN — Architecture Baseline v1.0, owner-approved 2026-10-18 after FFR-01 documentary PASS.** Approved decisions A-01 through A-06 are normative: Electron/React/TypeScript; Electron Main supervision; private STDIO/JSONL Python bridge; local SQLite; Windows maximized startup; and use of configured local Python plus the existing agent checkout during development. This freeze does **not** approve implementation or resolve the explicitly deferred integration and packaging policies.

**Next:** Draft and review NCD-03 — Agent Integration & Runtime Contract (continuous-conversation semantics, event truth, request lifecycle, session/task IDs, concurrency, cancellation/shutdown/recovery, bridge framing, local data contracts and agent telemetry). NCD-04 is responsible for staged implementation and Windows packaging verification. No Antigravity execution prompt is authorized yet; require separate owner approval after subsequent specifications and implementation plan are reviewed.

## 13. Decision log (approved architecture baseline)

- **2026-10-18 — A-01 APPROVED by owner:** Use **Electron** for the initial Windows desktop app. The Renderer remains **React + TypeScript** per the reviewed stack. Respect Electron Main/Preload/Renderer privilege boundaries. This approves the framework **only**; it does not authorize code, select npm package versions, approve task ownership (A-02), or freeze NCD-02.

- **2026-10-18 — A-02 APPROVED by owner:** Use **Electron Main Supervisor** instead of an independent resident background service. Page transitions and Dock changes must never control task lifetime. App shutdown/crash, concurrency, safe cancellation and worker recovery remain outside the A-02 approval.

- **2026-10-18 — A-03 APPROVED by owner:** Use **private stdin/stdout JSON Lines** between Electron Main and the supervised Next Code Python bridge. Reserve stdout exclusively for protocol messages and stderr for diagnostics. The bridge must not parse existing CLI prints as an API or open a localhost HTTP server. Message schemas/semantics, worker-event fidelity, concurrency and cancellation remain for NCD-03.

- **2026-10-18 — A-04 APPROVED by owner:** Use **local SQLite** for desktop-owned conversations, messages, verified task records and UI preferences. Electron Main owns DB access. Preserve strict separation from Next Code `.agent_os` engine-owned state; no plaintext credentials. Exact schema, migrations, driver, and recovery semantics require further review.

- **2026-10-18 — A-05 APPROVED by owner:** **Windows maximized by default** (Option A), with native controls to restore/resize/minimize. Keep responsive Sidebar/Right Dock layout and task-execution independence intact. Numerical native minimum size and fine-grained persistence/monitor/DPI details require Windows verification.

- **2026-10-18 — A-06 APPROVED by owner:** Choose **Option A: local Python / existing agent checkout during development**, with tested interpreter/dependency discovery and actionable missing-runtime errors. Defer standalone Windows packaging and bundled Python to the post-integration implementation/packaging phase, subject to clean-machine verification. This does not authorize engine code changes or begin Antigravity implementation.

- **2026-10-18 — NCD-02 FROZEN v1.0 by explicit owner approval:** Architecture baseline only, following FFR-01 documentary PASS. No design decisions changed during freeze; deferred NCD-03/NCD-04 obligations remain unresolved and implementation remains unauthorized. See `NCD-02-FREEZE-RECORD.md`.
