# P8 engine instrumentation request — DRAFT / OWNER APPROVAL REQUIRED

Read-only engine audit: `5e7179b9d528e7ef97e18f91ec284e4da514ca0b`, separate
`feature/p7-desktop-lifecycle-control`. No engine edit is made or authorized here.
IIS-05 §§4–5/8/18, NCD-04 §5.9 and I08-T49 require actual worker/phase evidence.

## Inspected sources and available proof

- `agent_os.py:43–125` passes optional ExecutionObserver through task-local
  ExecutionBinding; actual return supplies TaskOutcome, cooperative unwind
  supplies cancelled; exceptional failure does not supply a TaskOutcome.
- `kernel/execution.py:43–62`: ExecutionObserver has only started, outcome,
  cancelled and failed. It has no phase/worker callbacks.
- `architect/lead_loop.py:125–132`: real loop entry calls started. Phase changes
  and the awaited dispatcher call around line 342 have no observer notification.
- `squad/dispatcher.py:31–85`: creates a real ephemeral StandardAgentChassis,
  awaits execute and returns WorkerReport after memory-destruction assertions;
  no observer callback or invocation reference is exposed.
- `squad/chassis.py:45–82,159–292`: actual spawn, tool execution and destruction;
  structured WorkerReport returns real role/status/summary. These are internal
  methods, not a supported Desktop observation API. The final report's summary
  remains model prose; its return/status can be grounded, its claims are not
  automatically independent file/test evidence.
- `kernel/tools/registry.py` supports get_tool/register/execute. Desktop can
  wrap registered actual patch/test tools without engine edits, with confirmed
  file digest effects and an explicitly pinned test command/real return code.
- `kernel/tools/shell.py` returns ToolResult.metadata.returncode after actual
  subprocess communicate; WorkerReport or generated "tests passed" is not used
  as test evidence. AgentOS actual outcomes already support completed/failed
  and existing cooperative control supports cancelled.

## Smallest proposed separately authorized change

Extend the optional task-local observer with optional, backward-compatible
callbacks for **recorded phase**, **actual worker invocation** and **returned
WorkerReport**. Assign an opaque invocation reference per actual dispatch,
independent of role or model contract ID. Emit worker start only immediately
before the real chassis invocation after setup/validation; emit completion only
after the actual structured report and destruction checks. Repeated roles get
new references; cancellation/exception never fabricates a completion report.
Phase callbacks fire only after an actual accepted phase transition, not after
model suggestions rejected by engine safety gates. No new orchestration or
TaskOutcome fields; keep observer=None behavior and old four-method observers.

Proposed internal optional signatures (draft, not implemented):
`phase_changed(task_id, phase)`, `worker_started(task_id, worker_ref, role)`,
`worker_completed(task_id, worker_ref, report: WorkerReport)`. Use guarded optional
lookup so existing four-method observers remain valid. Only the engine assigns
invocation identity at actual dispatch; Desktop owns event IDs/sequence. The
source/version pin change must be explicit, without a new READY field.

Desktop maps only validated callbacks to the existing task.progress,
worker.started and worker.completed schemas. No new event type/action, IPC
method, SQLite table, provider call or public report blob. File/test activity
stays task-level. Observer failures must propagate fail-closed without leaving
awaited worker/tool work running; cancellation priority/unwind remains intact.

Required tests: legacy/no-observer and existing four-method observer; actual
offline AgentOS phase changes, repeated/interleaved roles, typed WorkerReport
identity/status; setup failure before dispatch; worker exception/cancellation;
observer failure and cleanup; no late completion after terminal; exact frozen
Desktop JSONL/T4 replay; original 53 offline regressions plus Windows navigation,
cancel/Job/crash tests. No paid rerun. Version/source compatibility pins must be
reviewed against the newly authorized engine commit before Desktop enables it.

## Current disposition

**BLOCKED for actual phase/worker stream and full P8/G5 acceptance.** Main/T4,
bounded replay, nine-schema selectors/UI and actual available task/tool evidence
continue independently. Worker fixture tests prove projection/rejection only;
they do not substitute for real engine worker events. Await separate approval
before any engine edit; do not wrap/replace internal dispatcher/chassis methods.

## Additional native-cleanup observation — separate review, no patch authority

The full final engine suite passed 53 cases with three paid skips. An earlier
full run and one of three isolated repetitions nevertheless failed the existing
`test_shell_cancel_stops_owned_child_and_descendant` immediate psutil assertion.
Desktop independently invoked the original AgentOS/offline test helpers and held
native handles of the two synthetic owned processes across cancellation. In two
of four probes the parent's immediate WaitForSingleObject returned WAIT_TIMEOUT
(258); all handles signaled exit by 100ms, without forced cleanup. In one probe
psutil said not running even while that native handle was not yet signaled.

This grounds an exit-observation timing issue; it does not prove a persistent
orphan, fix its root cause, or equate cooperative TaskCancelled with OS cleanup.
No engine test/source was weakened or edited. Preserve raw failures and native
probe records. E05-12 is qualified PARTIAL pending owner review of native cleanup
proof; full system G4 remains PARTIAL as before. The existing Desktop Job/lease
guards remain and Mission Control never claims safe cleanup from hidden fields.
Any engine cleanup/test change needs its own explicit narrow scope/approval;
approval of the three instrumentation callbacks alone must not imply that patch.
