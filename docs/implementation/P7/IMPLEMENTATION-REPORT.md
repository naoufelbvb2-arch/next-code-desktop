# P7 engine integration fix and actual offline Desktop execution — 2026-10-24

The approved engine patch and real offline Desktop execution path are implemented
and tested. **The engine compatibility block is resolved and minimum grounded G4
evidence is achieved. Full P7 product acceptance is not claimed:** production has
no configured/authorized coding model route, and the case register retains three
explicit PARTIAL cases. This delivery is ready for the owner's review of those
facts; it does not accept P7 or authorize P8/P9.

## Authority and independent histories

The owner's P7 ENGINE INTEGRATION FIX approved the existing ENGINE-CHANGE-REQUEST.
Clean engine baseline `834d0ca62cc9b2c03e530bafe4090024d98f31d3` and Desktop
continuation baseline `d05ceacb6180456b8e5072a06a4496cbf5e53a51` matched origin
before work. Engine branch `feature/p7-desktop-lifecycle-control` is published at
`5e7179b9d528e7ef97e18f91ec284e4da514ca0b`; engine main remains its original
baseline. Desktop retains `feature/p7-real-coding-execution`, descended from P6
conditional acceptance `06221d81ce96d82434ec2d8d76ab172355ba60a1`. The separate
feature histories are preserved; no engine source was copied/vendored/submoduled.
The later receipt records the actual Desktop implementation commit.

## Implemented behavior

AgentOS has optional observer/control parameters with unchanged legacy callers,
seven TaskOutcome fields and TaskPhase inventory. LeadArchitectLoop originates
the real task-start observation. Control reaches Gateway waits, dispatcher,
chassis, blocking tools and owned shell processes. Awaited work drains and chassis
finally wipes memory before confirmed stop. Controlled Windows shell processes
enter a non-breakaway Job while suspended; cleanup must establish zero processes.
Ordinary failures without a TaskOutcome remain failures without terminal evidence.
Cancellation never claims to roll back prior file writes. Engine regressions and
exact dependency lock are recorded in that repository's own P7 report.

Desktop verifies the exact engine commit, all 36 runtime Python sources, four
Desktop bridge modules, interpreter and tested Git executable. A private Main
capability cannot be forged by Renderer/config booleans. Launch rechecks the pins;
Python independently validates the engine/source contract. The child gets only
baseline Windows variables, pinned Git/Python directories and private coding
settings; no inherited Discussion credential, PYTHONPATH or project import path.

Main T2 consumes an exact-goal proposal once and commits the immutable receipt,
singleton slot and writer lease before dispatch. Native root identity is verified
for admission, after handshake immediately before execute, and after cleanup.
The real bridge passes the exact goal plus the bounded same-conversation C01
snapshot. Its independent reader receives task.cancel while AgentOS runs. Git
and engine subprocesses inherit NUL stdin, never the private JSONL/cancel pipe.
Actual AgentOS return/unwind and Gateway cleanup precede terminal event delivery.
Only actual sourced task-start and TaskOutcome/cancel observations become the
minimal frozen events; no worker progress or future Mission Control is invented.

T4 validates session-bound events and commits them before UI hints. Event/cleanup
authority is separate from ordinary Main mutation proof. A real cancellation can
reconcile without an invented TaskOutcome. Gapped/conflicting streams cannot
automatically release a writer. T3 release additionally needs the outer Windows
Job's verified child/descendant cessation and fresh canonical native root proof.
That project-safety check establishes writer cessation and identity, not a clean
Git tree, rollback, correctness of all model decisions or control of external
human editors. Unknown outcomes/artifacts retain the lease and require review.

FIFO advancement occurs only after new verified terminal cleanup, uses the durable
ordered queue and commits reservation before launch. One globally active coding
task and at most twenty queued remain unchanged. A queued cancellation launches
nothing and creates no fake engine event. Application restart does not advance or
replay old work; the actual crash/reopen test retains the writer as blocked even
after Windows observation confirms the old descendants exited.

The React controls show the full escaped proposal, require explicit Run Task,
distinguish admission from actual outcome, and display independent reconciliation
status. Navigation/reload/unsubscribe do not cancel the task. The Sidebar now
reports Discussion readiness without a false blanket coding-state claim. No
visual redesign, new public method/action/table or functional shell was added.

## Actual results and reproduction

Final Desktop totals: **470 PASS / zero FAIL / one NOT_RUN**: 419 unit/UI, 22
Python, 28 actual Windows Electron, one read-only restore of the original P5
history. The inherited unprivileged Windows file-symlink case remains NOT_RUN.
The independent engine suite is **53 PASS / three paid live tests NOT_RUN**;
14 new engine lifecycle/control tests and 39 original offline tests pass.
Repeated scoped commands are not counted twice. VERIFICATION-RESULTS.json lists
every final executable result, raw artifact digests and the existing owner-case
register: **18 PASS / three PARTIAL**. P6's 44 PASS/10 PARTIAL/two NOT_RUN and G6
PARTIAL remain historical/unchanged; P1 visual signoff stays owner-deferred.

Real tests use external synthetic Git projects outside both source repositories,
an explicitly offline original ModelGateway with all profiles routed through
in-memory HTTP mocks, and real AgentOS/worker/tool code. Actual commands patch
only the synthetic sample and execute its verification script. No user project or
production ledger is a fixture target. Native outer/nested Job tests include a
live shell and descendant, cooperative cancellation during Gateway/worker/tool,
the real 15-second escalation, SQLite admission/terminal faults and proof forgery.
Actual Electron tests click the real Run Task control, observe the committed
outcome, navigate/reload/cancel and forcibly terminate a creation-bound Main
handle, then verify held descendant handles exited and reopen the actual DB with
no replay. Screenshots are under `screenshots/`.

Reproduce on Windows with the pinned local packages and engine checkout:

```powershell
npm ci --cache .cache/npm
npm run build
npm test
python -m unittest discover -s tests/python -v
npm run test:electron
npm run test:live -- tests/live/restore.spec.ts
npm run format:check
```

The engine environment is separately reproducible using its
`requirements-p7-test.lock` and `python tests/run_offline.py -q`; the runner
removes provider credentials and denies external socket connections. Desktop's
private integration fixture uses a test-owned Main caller, never a public test
flag or a production provider. The restore command performs no Send/API call.
The dedicated engine test environment uses pydantic 2.12.5, httpx 0.28.1 and psutil
7.2.2; Desktop npm dependencies/lockfile were not changed. Git is an existing,
SHA-pinned runtime dependency; no global/admin setup was changed.

## Problems found and corrected

Concurrent Discussion/Coding exposed four blocking native pipe readers starving
stdin writes. Bounded PeekNamedPipe/read polling fixes this without global thread
pool changes. Git checkpoint startup exposed inherited private stdin; descendant
NUL stdin plus an explicitly pinned Git path fixes it without engine checkpointer
changes. C01 wire data is constructed as a model before engine snapshot validation.
Confirmed cancellation cleanup and gapped terminal cleanup received dedicated T3
fixes/tests. The protected AppData temporary root was correctly denied, so actual
native tests use a separate approved sibling fixture directory instead.

Intermediate failures remain documented: an outdated UI notice assertion and a
startup-positive probe under full file-parallel host contention failed once in
the full continuation run (417 PASS/two FAIL/one NOT_RUN). The assertion now
checks admission without invented outcome; native test files run serially while
their concurrency cases remain concurrent. Production deadlines were preserved.
The first full Electron run had 27 PASS/one FAIL: its legacy reload assertion
expected the old Sidebar status. The next full run had 27 PASS/one FAIL because
the crash harness allowed only five seconds for real engine/tool preparation.
The external fixture subsequently recorded both descendants. The harness now
waits for the real running state and allows 15 seconds for tool readiness;
unexpected evidence errors propagate rather than being silently polled as zero.
Production startup/escalation deadlines and exit assertions are unchanged. The
final full rerun passed. An Electron test initially matched a history title containing
Run Task; exact accessible-name matching corrected the harness. Windows SystemRoot
case selection in the Python test environment was corrected. A temporary approval
review usage error executed no action; the same authorized action later passed
review. No failed command is represented as a passing run.

## Remaining conditions and honest boundaries

**Normal application Run Task remains unavailable before T2 because no production
coding model route is configured or authorized.** Matching the engine is not
provider configuration. Production cannot select the fixture Gateway, instantiate
the default paid Gateway, inherit the Discussion key or silently bypass consent.
No live paid coding request or real-user project task was run. This is the main
remaining product condition; this report does not say users can perform normal
model-driven coding yet. Actual offline evidence does satisfy the requested
minimum engine/G4 proof, independently of that missing production route.

The distinct full GUI alias-coded-workspace path, deliberately lost actual-engine
execute ACK, and actual before-start Main-crash variant remain partial; native
alias/transport/early-crash fixtures plus real post-start crash are separately
identified in the register. Paid token calibration remains NOT_VERIFIED. A cancel
during ambiguous pre-start preparation may retain a blocked lease rather than
invent never-started/engine-cancelled evidence. Full IIS-08 G2/G4/G7 are not
declared PASS. P8's nine-event worker stream, timeline/Inspector and detailed
replay presentation are unstarted; P9's complete system recovery/release gates
are also unstarted.

Run the normal UI with `npm run dev`, or `npm run build` then `npm start`. Existing
browsing and explicitly configured P5 Discussion behave as before. Retain
SQLite/WAL, source/checkpoints, keys and immutable receipts on failure. Do not
reset data, unlock by time/PID, replay a consumed proposal or perform an automatic
source rollback. Feature rollback is a reviewed new commit without schema
downgrade. Frozen working/Git/archive hashes verify 42 delivery files, 41 payloads
and 18 normative sources. Public 23+3/5+5/22 inventory is byte-identical.

The paid ledger remains **two requests /381 tokens**, unchanged. No external
source disclosure, global/admin change, main merge, P8/P9 or installer work was
performed. The manifest records exact phase files/hashes; the later receipt and
final response supply actual separate publication SHAs. Stop for owner review.
