# P7 engine change request — owner approved and implemented

The owner's separate **P7 ENGINE INTEGRATION FIX** explicitly approved this
request. The narrow patch was tested and normally published in the independent
engine repository on `feature/p7-desktop-lifecycle-control` at
`5e7179b9d528e7ef97e18f91ec284e4da514ca0b`, from verified
`834d0ca62cc9b2c03e530bafe4090024d98f31d3`. Engine regressions: 53 PASS, three
paid live tests NOT_RUN. Desktop runtime/Windows proof is recorded in the existing
implementation, compatibility and verification reports. No frozen change or main
merge was adopted. Production coding provider configuration remains a separate
unfulfilled condition; no paid call or fixture route is authorized for users.

## Original request (historical wording, superseded by that approval)

This is a request for separate authorization, **not permission to edit the
engine**. Original engine remains unchanged at
`834d0ca62cc9b2c03e530bafe4090024d98f31d3`. Desktop P7 gate G4 is BLOCKED.
No frozen contract needs modification for this request.

## Missing capability and necessity

AgentOS has the required `execute_task` and real seven-field TaskOutcome return.
It lacks an engine-owned observation that execution actually entered the bound
task lifecycle, and a cooperative cancellation control/confirmed-stop contract.
The LeadArchitectLoop, dispatcher, chassis and blocking tools do not propagate
such a request. Task ACK, method wrapper, stderr, elapsed time, a cancelled Future
or forced Windows termination cannot supply those facts under IIS-01/IIS-03/05
and NCD-04 5.8. This prevents safe real execution, not just detailed P8 telemetry.

## Proposed minimum engine scope

| Engine file | Narrow proposed change |
| --- | --- |
| `agent_os.py` | Optional keyword-only execution observer and cancellation control; defaults preserve all existing callers. Emit task-start from inside validated engine lifecycle, bind task/workspace IDs, propagate controls and retain the exact TaskOutcome return. |
| `architect/contracts.py` or a small dedicated control module | Typed observer/control and an explicit cooperative-stop signal/exception. Do not change the frozen TaskOutcome fields or add a CANCELLED TaskPhase. |
| `architect/lead_loop.py` | Check cancellation at safe boundaries before baseline/checkpoint/ticks and after awaits; route actual engine start/termination observations; use finally to preserve coherent state. No synthetic success on exceptions. |
| `squad/dispatcher.py` / `squad/chassis.py` | Pass the same bound cancellation control, stop new worker/tool dispatch on request and confirm cessation only after the real worker unwinds and memory cleanup runs. Reuse internal lifecycle points; full worker-event streaming remains P8. |
| `kernel/tools/registry.py` / `kernel/tools/shell.py` | Propagate or expose cancellation of a running blocking tool; keep command reader independent. Cooperatively stop owned tool work where proven, and report unresolved cleanup truthfully. Do not weaken the Main Windows Job fallback. |
| Engine tests | Add backwards-compatibility, start source/identity, actual outcome and cancellation/cleanup conformance cases with offline Gateways and isolated workspaces. |

The exact Python API naming and cancellation exception semantics need owner
approval/review with the patch. A confirmed-stop observation can map to the
existing `task.cancelled` confirmation; it must mean engine work actually ceased,
not merely that a token was set. If safe tool cancellation is not possible before
15 seconds, Main may terminate its Job, retain unknown/reconciliation and blocked
writer state; it must not emit a fake cooperative-cancel event. Already-written
files are never claimed rolled back by termination.

No engine HTTP server, Desktop public IPC/action/schema, provider fallback, global
event framework, full Mission Control or source-copying is proposed. Existing
Discussion behavior and the optional C-01 contract must remain compatible. Existing
AgentOS callers that omit observer/control must retain their current behavior.

## Required validation before opening Desktop's coding gate

1. Run existing engine tests unchanged, including C-01 snapshot/workspace/task-ID
   validation. Prove no-op observer/control preserves previous outcomes.
2. Use real AgentOS with an explicitly offline test Gateway for every requested
   profile in a tiny synthetic workspace **outside both repositories**, with Git
   baseline, exact write/command scope and no inherited provider key. No paid
   route is authorized by the P7 request or this document.
3. Observe start inside engine code exactly once and actual successful/failed
   TaskOutcome instances; validate exact serialization/bounds. Never parse prints.
4. Cancel during Gateway await, worker execution and a real blocking tool. Keep
   bridge stdin responsive, verify the 15-second graceful window and distinguish
   cooperative stop from Main Job escalation/uncertain effects.
5. Inject engine/child/Main/SQLite failures and cancel/terminal races. Prove no
   duplicate execute after lost ACK/restart, actual Windows descendants cease,
   and writer release requires independent process/descendant/workspace evidence.
6. Run Desktop regressions and verify default external Gateway cannot be invoked
   accidentally. Decide/pin the coding dependency set (including psutil if used).

## Completed independently in Desktop

Main explicit Run Task/T2 foundation, immutable receipt replay, scoped task
reads/events/subscriptions, durable cancellation intent and truthful proposal/task
controls are implemented/tested behind the closed real-engine gate. Fixture
dispatch spies test one active+20 queued/FIFO/COMMIT/expiry/races. The native
Electron fixture uses the production Discussion/Main/IPC/Preload/React components
and an original Gateway HTTP mock to prove a Main proposal cannot start coding
while the gate is blocked. No fixture becomes real AgentOS evidence or enters a
normal user's ledger. Enabling the dedicated coding launcher, actual event bridge
and automatic queue advancement remains blocked until the engine capability is
approved, implemented and verified.

Requested owner decision: authorize a separate narrow engine patch/review for the
listed capabilities and tests. This request does not authorize editing it now,
spending provider credit, starting P8/P9 or merging either repository into main.
