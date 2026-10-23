# P7 actual engine compatibility gate — BLOCKED

Read-only audited engine: `834d0ca62cc9b2c03e530bafe4090024d98f31d3` in the
separate official engine checkout. No engine source/import/constructor/execution
was changed or invoked by the P7 audit. The source probe parses bounded known
files with stdlib AST and records exact SHA-256; the hashes/signatures are embedded
in `VERIFICATION-RESULTS.json`. This is source inspection, not a general automatic
capability detector or runtime certification. A matching SHA cannot enable coding.

| Requirement | Actual source evidence | Disposition |
| --- | --- | --- |
| Native facade | `agent_os.py:41`, async `execute_task(self, task_goal, task_id=None, *, conversation_context=None)` | Source signature verified |
| Typed final result | `architect/contracts.py:108`, seven-field `TaskOutcome`; `agent_os.py` returns `await loop.run()` | Real structured return exists; live invocation/serialization NOT_RUN |
| Optional C-01 | `ConversationContext.snapshot_and_validate`, workspace/task-newness checks in AgentOS/LeadArchitectLoop | Source checks verified; Desktop bounded context selection tested independently |
| Render budget | `architect/prompts.py`, 3000-character whole-entry assembly/omission metadata | Source reviewed; real task prompt/token calibration NOT_RUN |
| Actual task start | No observer/callback/event sink on AgentOS/LeadArchitectLoop entry | BLOCKED: bridge pre-call ACK/DB starting is insufficient |
| Worker lifecycle | Dispatcher awaits real chassis report; chassis `_on_spawn` / `_on_terminate` are internal methods | Internal lifecycle exists; no public task-scoped observer; no full P8 work attempted |
| Cooperative cancellation | No request/control token, stop confirmation or cancellation exception on AgentOS/loop/dispatcher/chassis path | BLOCKED |
| Blocking tools | `kernel/tools/shell.py` synchronously `Popen(..., shell=True)`/`communicate(timeout)`; timeout tree kill is not cooperative cancellation | Request propagation/confirmation and workspace effects unproven |
| Process ownership | P4 Windows suspended child/Job containment available in Desktop | Re-run real Windows fixture proof only; actual AgentOS descendants NOT_RUN |
| ModelGateway | AgentOS accepts injected Gateway; default routes REASONING/FAST_WORKER/LOCAL_CODER to configured external provider; structured calls can retry | No default gateway instantiated; no paid call authorized; all real-task profiles need explicit offline test routing |
| Dependencies | Engine pyproject declares pydantic/httpx/psutil; current pinned Discussion environment has 2.12.5/0.28.1 and no psutil | Full coding environment not verified; no unnecessary install while lifecycle gate is blocked |

`LeadArchitectLoop.run()` refreshes repository graph and creates a baseline shadow
checkpoint before its ticks, then updates Blackboard/checkpoints and dispatches
tools. These are genuine workspace effects, so calling it merely to discover
whether hooks exist is unsafe. No real task workspace outside the two repositories
was created because the required pre-execution gate is not satisfied.

The actual TaskOutcome return is useful: future approved integration can validate
and serialize that returned object, not infer an outcome from Future completion.
It does not establish when execution started, that cancellation reached workers,
or that Python/descendants stopped. Ordinary exceptions/pipe death/forced kill
cannot be converted into invented TaskOutcome or `task.cancelled` records.

The source search for cancellation/observation parameters on the bound execution
path returned none. Internal chassis lifecycle method names do not provide the
external task-start/cancel evidence required by IIS-05/NCD-04. Async coroutine
cancellation or wrapping a method before its first instruction would not be a
demonstrated safe substitute. Existing tool timeout/psutil/taskkill code also does
not replace the Main-owned Windows Job evidence and workspace reconciliation.

Production therefore has no coding backend/launch registration and cannot admit
a new Run Task. `coding_bridge.py` is deliberately quarantined: roles empty on
describe, no READY, one sanitized STARTUP_FAILED frame and exit 78 if invoked.
It never accepts execute/cancel or imports the engine. Main's gate has no config,
environment, model-text or Renderer override. The remaining implementation needs
the separately approved change described in `ENGINE-CHANGE-REQUEST.md`.

G4 minimum: **NOT ACHIEVED / BLOCKED**. Real AgentOS invocation, sourced start,
terminal mapping, cooperative cancellation and real-engine writer release are
NOT_RUN. Desktop/SQLite/HTTP-mock/Windows fixture passes are kept distinct.
