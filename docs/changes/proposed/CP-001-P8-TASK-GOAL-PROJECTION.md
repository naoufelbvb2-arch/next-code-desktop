# CP-001 — P8 read projections: approved goal and persisted Chat Dock

**DRAFT / NOT ADOPTED / OWNER APPROVAL REQUIRED.** No frozen document, public DTO
or SQLite schema is modified by this proposal.

IIS-05 §9.1 and NCD-04 §5.9 require a Mission Header showing the exact authorized
goal. The frozen IIS-02 TaskSummary/TaskView expose only taskId, conversationId,
projectId, state and outcome; TaskOutcomeV1's seven fields contain no goal.
IIS-02-C01 §§2–4 expose only currently available proposals; a consumed proposal
does not remain available after reload. The existing tasks.readEvents rows also
contain no goal. Neither title nor outcome summary is an exact-goal authority.

Current safe implementation: retain at most 64 in-session exact Main-issued
proposal goals only after matching successful confirmRun admission. Historical
or reloaded tasks show "not exposed". No extra read method, inferred goal,
Renderer SQL, hidden IPC field or model-derived substitute is used.

Proposed narrow owner-reviewed correction: extend only the existing tasks.read
TaskView return projection with a bounded `exactGoal` derived by Main from that
same authorized task's durable `tasks.task_goal`, with existing project/task
scope and text/response-size/privacy validation. Keep 23 methods/3 subscriptions,
all JSONL schemas and 22 tables. Final exact DTO shape and size budget require
explicit approval; this draft does not choose or implement them by implication.

Impact: enables historical/reload Mission Header goal, no new execution or source
authority. Required tests: exact persisted goal vs different title/outcome;
cross-project/task rejection; reload/Main restart; bounded large goals and IPC
response size; escaped untrusted display; no secret/internal metadata exposure;
unchanged public method count, wire schemas and SQLite schema. Until adopted,
full goal-display conformance remains PARTIAL, independently of the separate
engine worker-hook gate.

## Related existing read gap: per-conversation Dock state

IIS-05 §9.4 requires checking persisted `explicitlyHidden` before a live Chat
start opens Agent Logs. `conversations.saveDockState` returns the newly saved
state, but neither existing conversations.read nor bootstrap returns the saved
per-conversation Dock record. Calling a mutation to imitate a read would
overwrite the very evidence being sought and is forbidden.

Safe current behavior: on reopened conversations whose Dock policy is unknown,
do not auto-open or automatically save a guessed state. Explicit user Panels
actions establish a new local choice; a newly admitted T1 conversation has the
known initial default. Keep at most 64 in-renderer known conversation Dock states.
No historical replay opens the Dock. Complete persisted-Dock restoration and the
automatic live-start behavior for reopened chats remain PARTIAL.

Proposed second narrow amendment, separately subject to explicit approval:
expose the existing scoped saved ChatDockStateView through the existing
conversations.read projection (nullable with explicit absence semantics),
without a new method/table/action. Test actual saved hidden/visible/tab state
after Renderer/Main restart, scope, unknown-state safety, duplicate/live-only
start hints, explicit user hide and no mutation during read. No DTO change is
adopted in this implementation.
