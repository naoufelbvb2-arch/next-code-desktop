# P7 implementation report — independent Desktop work complete; G4 BLOCKED

The requested safe independent Desktop work is implemented. **P7 is not complete**:
real engine execution is blocked by missing required lifecycle/cancellation
capabilities at engine `834d0ca62cc9b2c03e530bafe4090024d98f31d3`. No real AgentOS
task was run, no real-engine success/cancel/outcome was fabricated, and no engine
source or frozen contract was modified. The separate narrow request is ready for
owner review in `ENGINE-CHANGE-REQUEST.md`.

P6 conditional acceptance was separately committed/pushed at
`06221d81ce96d82434ec2d8d76ab172355ba60a1`; this is the P7 branch starting commit.
P6 baseline `579a4048c65f3b147a5c147453dcdd4ee18f4a40`, its 432 PASS/one Windows
NOT_RUN, IIS-07 44 PASS/10 PARTIAL/2 NOT_RUN and G6 PARTIAL remain unchanged.
Normal publication uses `feature/p7-real-coding-execution`; main stays untouched.

## Actual engine gate

The first engineering work inspected real source signatures, TaskOutcome, C-01,
LeadArchitectLoop, dispatcher/chassis, tool execution, Gateway routes and process
ownership. `bridge/engine_compatibility.py` performs a bounded read-only AST/hash
audit without importing or instantiating AgentOS. Exact evidence is embedded in
the verification JSON. `ENGINE-COMPATIBILITY-REPORT.md` distinguishes structured
source availability from unexecuted runtime proof.

The real TaskOutcome return exists. Engine-owned task-start observation and
cooperative request/stop propagation through workers/tools do not. Internal
chassis lifecycle methods are not an externally bound task lifecycle observer.
Default Gateway construction can select paid routes and structured retries; it
was never instantiated for coding. The Discussion dependency environment lacks
the engine's declared psutil dependency. Installing it cannot repair missing
hooks, so no unnecessary packages were added. No external real-task workspace was
created before the required compatibility gate.

## Implemented files and behavior

`electron/main/coding/gate.ts` enforces the engine gate with no Renderer/config/
environment override. `coding/service.ts` is Main's independent admission/read/
cancellation coordinator; its production construction has no coding backend.
Trusted test constructors use dispatch spies only, never a real-engine substitute.
`coding_bridge.py` is a quarantined entry: no advertised coding role/READY,
acceptance, task event, engine import or execution; an attempted coding launch
emits sanitized STARTUP_FAILED and exits. It is not installed as a production
coding launcher. A real execute/cancel loop remains blocked, not called complete.

The existing methods proposals.confirmRun, tasks.read/list/cancel/readEvents and
task subscription now have scoped Main handling. Native strong workspace proof
is required for new admission. Proposal ID resolves the persisted project,
conversation/workspace and exact goal; Renderer cannot submit a replacement goal.
When the engine gate is blocked, a new proposal is not consumed and no task/lease
or child is created. tasks.readDiagnostics remains unavailable; no fabricated
diagnostic endpoint or new public surface was added.

T2 still owns consumption, immutable original receipt, one global slot and writer
lease, at most 20 queued rows and commit-before-dispatch. A Main-only callback
identifies a **new successful T2 COMMIT**; receipt replay does not invoke it.
Historical receipt reads precede new native/runtime checks and never reexecute,
even through a new coordinator after restart or engine unavailability. Concurrent
duplicates cannot depend solely on an in-memory launch flag. No new schema/table.
Launch failure retains uncertainty and blocked writer state. No automatic queue
advancement or restart dispatch is enabled while the real engine gate is closed;
the existing durable T3 FIFO primitive is tested independently.

Cancellation commits T3 before any optional trusted forwarding. A queued task is
cancelled as never started, with no Python event or command. Active cancellation
is request intent; absent/failed backend forwarding leaves needs_reconciliation
and a blocked lease. ACK is not stop, terminal DTO is not cleanup, and no timeout
or missing PID releases a lease. Real cancellation during AgentOS, 15-second
engine grace and real-engine descendant/workspace release are BLOCKED. Existing
P4 Job/15-second transport/cleanup fixtures are rerun as inherited evidence only.

`store.codingContext` selects whole bounded same-conversation/project/workspace
C-01 records: at most three verified prior outcomes, six messages and no invented
preferences. It omits oversized optional entries rather than slicing exact goals.
The currently authorized task goal remains unchanged in T2. Original engine
3000-character rendered-history/token behavior was source reviewed, not executed
with this snapshot; full runtime C-01/Gateway prompt calibration remains blocked.

`TaskControls.tsx` displays only Main's available proposal projection, the full
escaped exact goal and expiry. Explicit Run Task uses a stable mutation identity
for uncertain retries and guards double clicks; unavailable admission is shown
without optimistic running/success. Task snapshots/updates are scoped, subscription
precedes snapshot, and engine outcome and uncertain cleanup have distinct text.
Cancellation remains intent. Reload/navigation/read/subscription never invokes
Run Task or controls process lifetime. The minimal view caps at 21 displayed task
records; it is not P8 Mission Control or a full historical task browser.

## Evidence and limitations

See `VERIFICATION-RESULTS.json` for actual counts, commands and owner-case mapping.
New tests exercise real SQLite admission/receipts/capacity/FIFO/T2 fault, cancellation
registration/terminal races, source context isolation and restart without replay.
These use synthetic authorities/dispatch spies and are **not real AgentOS proof**.

The actual Windows Electron case uses production Main service, strict IpcBoundary,
native file worker, typed Preload, React and real supervised Discussion Python.
An original Gateway HTTP mock supplies a proposal; Main issues its authoritative
ID/TTL in T5. Explicit UI Run Task returns the closed-engine error and leaves
zero tasks/events/leases, including after reload and reopening history. Its
test-only route installer is confined to the disposable fixture window/DB;
normal product startup never imports it. No real provider call is made.

Two initial Electron fixture failures were corrected: CJS fixture bundling lost
the worker URL and produced an independent service instance; the fixture now uses
an explicit worker URL and production boundary/service through isolated routing.
A reload assertion also needed to reopen persisted conversation history, as
specified by existing P5 behavior. Review then added the historical-receipt path
and post-COMMIT-only dispatch callback to prevent replay after restart. Failed
intermediate attempts are not counted as PASS; final rechecks are authoritative.
One full-regression failure exposed that isolated legacy P5 profiles expected task
APIs to remain closed. The native integration guard now preserves that behavior;
all 28 affected Discussion/P7 tests passed on recheck. The final unit ledger
combines the complete run with that corrected targeted run, rather than describing
the earlier failed command as a clean full run.

Final unique executable cases: **450 PASS, zero remaining FAIL, one NOT_RUN**:
402 unit/UI, 22 offline Python, 25 actual Windows Electron and one read-only
original P5 history restore. The single unrun executable case is the inherited
unprivileged Windows file-symlink fixture. These are separate from blocked real
engine acceptance requirements in the owner-case register. All 432 prior P6
passing cases were exercised; their historical partial/unrun requirements remain.

P1-P6 regressions include native Windows deadlines/attacks, actual Electron/Job/
SQLite crash fixtures, offline Gateway and read-only restoration of the original
P5 conversation. The paid two-turn case is not rerun; its offline actual-Gateway
counterpart remains P6-E04. Paid ledger stays two requests /381 tokens, no new
source disclosure. Historical skipped/partial P6 cases do not become PASS.

G2/G7: tested Desktop/persistence/resilience subsets only, full gates PARTIAL.
G4: BLOCKED; real start, actual coding TaskOutcome, cooperative cancellation,
real-engine descendants and safe writer release are NOT_RUN. No simulated record
is relabeled as source evidence. No full P7 acceptance or P8/P9 work is claimed.

## Operation, dependencies and recovery

Run `npm run dev` or `npm run build` then `npm start`. Local browsing/Discussion
remain as P6. A Main-issued proposal can be reviewed/clicked; coding remains
unavailable until the separate engine patch is approved, implemented and verified.
No runtime flag or credential can enable it. No additional packages/lockfile or
public IPC/wire/SQLite schema changes were required.

Keep DB/WAL/keys and consumed proposal receipts on failure; do not reset data,
resend execute, release a blocked lease or equate forced termination with rollback.
Reverting feature code needs no schema downgrade. If old task records exist,
their original admission receipts remain historical and explicit reconciliation
is required. No force push, global/admin change, private-user-project attack or
engine edit occurred. Exact changed files/hashes are in CHANGE-MANIFEST; the later
COMMIT-RECEIPT records actual publication provenance without self-reference.

Stop at the required engine approval gate. The next action requires owner approval
of the concrete ENGINE-CHANGE-REQUEST; it is not a request to begin P8/P9 or spend
provider credit.
