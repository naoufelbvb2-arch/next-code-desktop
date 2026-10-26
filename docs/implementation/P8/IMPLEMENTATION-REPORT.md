# P8 final corrections — execution and verification, 2026-10-25

**P8 STAGE_EXIT_PASS / P8-scoped G5 evidence PASS; owner acceptance pending.**
All 36 E05 cases and eight I08-T49–56 cases now have passing executed evidence.
Full-system IIS-08 gates/P6 G6 remain PARTIAL; P1 visual signoff is deferred.
No P9, packaging, main merge or paid task was performed or authorized here.

## Authority and repositories

The owner's P8 FINAL CORRECTIONS authorizes the previously requested three Engine
hooks, a proved narrow Windows exit fix, and formal adoption of CP-001. Desktop
continues from verified `decf6390b05191c29a3627ca318b935b6073922d` on
`feature/p8-mission-control`; P7 acceptance and the original P8 baseline remain
below. Engine branched from `5e7179b9d528e7ef97e18f91ec284e4da514ca0b` and was
reviewed/committed/pushed first as **`99e00e13f8a39fa6730f3d3de773ac937b5ac915`**
on [feature/p8-verified-worker-observers](https://github.com/naoufelbvb2-arch/next-code/tree/feature/p8-verified-worker-observers).
Its [short report](https://github.com/naoufelbvb2-arch/next-code/blob/99e00e13f8a39fa6730f3d3de773ac937b5ac915/docs/implementation/P8/IMPLEMENTATION-REPORT.md)
records the precise source/test envelope. No Engine source was copied into Desktop.

## Real evidence and final behavior

All nine frozen event names now have actual execution sources. Engine accepted
Blackboard phase transitions map to task.progress. Actual dispatcher boundaries
create opaque UUIDs per invocation; returned typed WorkerReports publish only
after chassis termination and memory wipe. Callback, setup, cancellation and
cleanup faults never fabricate a report or terminal result. Old observers and
observer=None still work; AgentOS signatures, TaskOutcome, TaskPhase and
WorkerReport are unchanged. Desktop verifies the exact Engine commit, complete
source hashes and VERIFIED_OBSERVER_VERSION=1 before enablement and launch.
No private monkey-patching, new event/action/type or public method was added.

Original observer → private Coding Bridge → validated JSONL session/role/task →
SQLite T4 COMMIT → notification → scoped authoritative read → Mission Control
was executed offline with actual AgentOS. A second independent SQLite reader
observes each committed row before its notification. Timeline/Inspector show
actual reports, including two Scouts separated by an Inquisitor with independent
refs. File/test effects remain task-level; report prose is escaped untrusted text.
There is no inferred role order, wall-clock duration, progress percentage or
current worker liveness. Start-only history remains unverified after process loss.

CP-001 is adopted only through approved IIS-02-C02. TaskView.exactGoal reads the
original scoped tasks.exact_goal (1–16,384 Unicode points). Conversations.read
returns saved ChatDockStateView or null through dockState without writes. Goals
and hidden/visible/tab policy survive Renderer reload and actual Main crash.
An explicit user choice wins over a delayed read; only a new eligible live start
may open Chat Dock, never historical replay. Agents Dock stays closed on entry.
The ephemeral approved-goal fallback is removed. Colors/background/logo and the
unavailable Interactive Shell are unchanged. There is no new dependency/schema.

## Windows exit proof

The earlier native Job active-zero/WAIT_TIMEOUT finding was real and is retained
below. The narrow Engine correction holds native process handles for the suspended
root and observed Job members, waits for their exit under one shared five-second
deadline, and reconciles total assigned membership with retained handles plus
active-zero. A missed/unknown member or failed wait raises CleanupUnverified;
no PID disappearance, psutil result, cancellation ACK or fixed delay substitutes
for proof. Desktop's independent outer Job/identity/T3 lease checks remain intact.
Main crash still produces blocked/reconciliation history, not a false clean lease.
The UI never claims Verified Safe Cleanup because its public view exposes no such
proof. Test-owned native handles prove parent and descendant already signaled at
controlled-tool return across cancellation, timeout, failure and forced termination.

## Actual results (unique cases, diagnostic repeats excluded)

- Desktop **522 PASS / 0 FAIL / 1 NOT_RUN**: 454 unit/UI/native,
  34 Python, 34 actual Windows Electron. The skip is the inherited unprivileged
  file-symlink case. The register lists each current case and evidence kind.
- Engine **69 PASS / 0 FAIL / 3 paid NOT_RUN**: 53 prior plus 16 new cases.
  Five additional native cases passed independently; they are not added again.
- **E05-01–36: 36 PASS. I08-T49–56: 8 PASS** within the P8 scope. Negative,
  pressure, XSS and protocol-fault fixtures are labeled separately from actual
  worker-source, SQLite, native Windows and Electron evidence.
- Build/TypeScript/format and Python checks pass. Original frozen working/index/
  Git/ZIP bytes are checked before publication. Original delivery stays 42 files,
  41 authenticated payloads, 18 normative originals; one separately approved
  normative addendum makes 19 normative files and 44 engineering inventory files
  including both manifests. Original manifest and hashes are unchanged.

The complete current matrix, unique test identities, artifact SHA-256s, source
pins and history are in VERIFICATION-RESULTS.json. CHANGE-MANIFEST.json lists exact
phase paths/bytes. A later COMMIT-RECEIPT.md records independent publication SHAs.
Actual Windows screenshot: screenshots/mission-control-workers.png. Prior
screenshots/mission-control.png and prior failures remain historical evidence.

During this correction, newly added test harness defects (fault recapture and
non-atomic readiness JSON) were found and corrected. First Desktop integration
expectations still counted the old two/five-event streams and injected a fault
at event two; they now assert the actual eight/eleven-event streams and fault the
real pending terminal row. The Unicode budget test now specifically isolates
byte-size rejection. Full Desktop Regression exposed an existing Broker race:
native worker exit could free the parent/global slot before its awaited Main
handler drained. The narrow fix retains capacity until both have finished; the
original 30-second and 90-second assertions remain unchanged. A new regression
checks forbidden handler overlap, and the complete affected Broker suites rerun.
These failed raw runs remain in ignored evidence; no old
native assertion was removed or relaxed and no failed run is relabeled PASS.

## Operation, limits and recovery

Run locally: `npm run dev`, or `npm run build` then `npm start`. Select a registered
project, open Agents and choose a recorded mission. Replay does not execute work.
The consumed P7 paid task allowance remains closed; no local start renews it.
All executed coding projects were external disposable synthetic Git fixtures,
using actual original Gateway HTTP mocks/offline routes and no paid network.
The P7 and P5 budget journal SHA-256s remain exactly unchanged. Credentials, raw
provider/source content and local machine paths are absent from publication.

Commands: `npm test -- --reporter=json`, final affected Dock/read test runs,
`python -X utf8 -m unittest discover -s tests/python -v` with actual exit receipt,
`npm run build`, `npm run format:check`, full `npm run test:electron`, Engine
`tests/run_offline.py -q -p no:cacheprovider` under its existing pinned local venv,
and delivery verifier against staged Git bytes and the retained original ZIP.
No live paid test, global install, admin setting, destructive cleanup, force push
or main merge occurred. API/subscription/action/type/table counts stay 23/3/5/5/22.

Retain SQLite/WAL, immutable event/conflict rows, source checkpoints, receipts and
budget journals. Roll back through reviewed feature-branch reverts, never by
replaying uncertain work or removing evidence. P9 may only receive its separately
authorized scope later; full-system acceptance, P6 G6, visual signoff and packaging
are not silently accepted by this P8 result. **Stop for owner P8 review.**

---

## Historical P8 delivery at decf6390 — retained verbatim, superseded where corrected above

# P8 Verified Events & Mission Control — 2026-10-25

**Independent P8 functionality is implemented and tested. Full P8/G5 acceptance
is BLOCKED by missing original engine phase/worker observation hooks.** Actual
WorkerReports have not reached Desktop; no worker identities/reports were
invented. CP-001 records two frozen read-projection gaps. A native exit-signal
timing issue also remains explicitly qualified for owner review.

## Authority, scope and compatibility

P7 accepted at `3f205b036a5e074803d9e58580987a2aeb96d873`; its owner acceptance
was published first on P7 at `c6f36fc8ead214284e26dc7738a4e65aed73eefd`. P8
starts there on `feature/p8-mission-control`. Official local/remote identities
and clean baselines were verified. Separate engine remains read-only at
`5e7179b9d528e7ef97e18f91ec284e4da514ca0b`. Read-only audit and source hashes
are in ENGINE-INSTRUMENTATION-REQUEST /VERIFICATION-RESULTS. Existing Engine
ExecutionObserver exposes only start/outcome/cancel/exception; internal worker
dispatch/report/phase points lack supported callbacks. No monkey-patching or
vendoring substitutes for their separately authorized instrumentation.

Allowed envelope: Main event/supervisor/T4 integration, private Desktop bridge,
React Mission Control/replay/Dock integration, isolated tests and P8 records.
IIS-05 §§4–18, NCD-04 §5.9, NCD-01, IIS-01/02/C01/03 REISSUE/04/08 and
C-02/C-03 control. No package/lock/dependency change, schema/public expansion,
frozen edit, redesign, global/admin change, engine edit, main merge or P9.
Exactly 23+3 /5 actions+5 types /9 subtypes /22 tables remain. The existing
contracts/jsonl.ts runtime now accepts legitimate earlier-sequence backfill
after receiving a terminal; it still rejects new post-terminal lifecycle facts.

## Implemented engine-to-display path

Original AgentOS evidence -> Coding Bridge -> closed JSONL/verified supervised
role, READY, task/session -> immutable Main SQLite T4 -> COMMIT -> bounded scoped
IPC hints -> authoritative read -> Mission Control. Actual available event names:
**task.started, file.changed, test.result, task.completed, task.failed,
task.cancelled**. Each was exercised via actual original engine/tool regressions;
the full nine-name closed schema/ingestion is tested independently. **task.progress,
worker.started, worker.completed** have no actual production observer source yet.

Desktop's supported ToolRegistry registration wraps actual scoped patch calls,
compares bounded before/after file digests and emits only confirmed effects.
Pinned verification command events require an actual integer returncode; failed
permissions, timeouts, summaries and PASSED prose do not qualify. No raw source,
command output or worker attribution is exported. Production scope remains the
explicit synthetic pure-Python route; P8 adds no general user-project authority.
The Bridge's separate wire/event/state locks let cancellation registration proceed
without holding the state lock across blocked stdout; frozen queues/timeouts and
independent input/control path remain. No new event journal or retransmit action.

Main now persists a newly protocol-detected event identity conflict through T4
before faulting; rejected data never overwrite a row or publish a committed hint.
Sticky incident/state/lease uncertainty survives later genuine hole fills. Valid
same-content retransmission with fresh outer identity is idempotent; a repeated
outer message ID still fails before T4. Commit rollback publishes nothing.
Metadata privacy screening rejects secrets and sensitive/absolute file paths
before insert and on public replay; untrusted text stays escaped React text.

## Mission Control, replay and honest limitations

Agents is a real independent page. Header shows actual task/project/conversation
IDs, known admission/state/start/phase/outcome, integrity and separate recovery
uncertainty. It **never claims verified Windows cleanup or current worker liveness**
from TaskView, which exposes neither native handles nor cleanup proof. The approved
goal is retained only from a matching in-session Main proposal/admission; historical
goals are explicitly unavailable rather than reconstructed from summaries/titles.

Timeline uses committed sequence order. Worker selector/Inspector key by
(taskId,worker_ref), preserve repeated roles and first report, flag semantic
double starts/completions locally, and show missing start/end evidence without
invented duration. File/test events stay task-level. Real current engine tasks
produce an honest empty worker panel; synthetic positive Inspector tests do not
prove actual WorkerReport delivery. No fixed role order or progress percentage.

Subscribe-before-snapshot; numeric afterSequence/nextSequence; four initial
40-row pages before scheduling yield; 128 hint keys, 400 cached events and at most
100 mounted event rows. The task selector pages a 200-record window (plus the
currently selected reference); manual paging can continue beyond it. Late holes
rewind conservatively, so 1,2,4 then late 3 is discovered even after a terminal.
Server completeThrough is not confused with pages actually fetched. Standard
flags give generic uncertainty; private incident reasons are not invented in DTOs.
Polling recovers lost hints, disposed callbacks cannot cross tasks/projects,
and route/reload/Main recovery never issues execute or cancel.

Agents Dock is hidden on entry and historical replay does not open it. Live Chat
start has an ephemeral one-shot guard and respects known user hide/tab choice.
Because the frozen API cannot read persisted per-conversation Dock state, reopened
chats with unknown policy **neither auto-open nor automatically overwrite it**.
New T1 chats or explicit user Panels choices establish known local policy, bounded
to 64 conversations. CP-001 proposes narrow read amendments only; none adopted.
Interactive Shell remains disabled. Existing colors/background/logo unchanged.

## Actual verification and remaining gates

Desktop: **508 current unique PASS /zero FAIL /one NOT_RUN**: 443 unit/UI/native,
34 Python, 31 actual Windows Electron. Full unit run had 441 PASS/one inherited
unprivileged symlink skip; final affected UI/replay rerun had 32 PASS including
two added cases; identities are merged, repetitions not added. Prior paid P7
proof is historical/carried, not rerun or included in these current counts.
Build, TypeScript, formatting and frozen working/Git/ZIP checks pass (42 delivery,
41 manifest payload, 18 normative files). Every final executable case and raw
artifact digest is in VERIFICATION-RESULTS.json. Python's 34-test command result
is recorded as a receipt, not represented as a fabricated raw console file.

**E05: 32 PASS /three PARTIAL /one BLOCKED**. E05-04 actual repeated worker
emission is partial; E05-05 real WorkerReport observation blocked; E05-12 native
cleanup qualification and E05-35 persisted-Dock live behavior partial.
**I08-T49–56: six PASS /one PARTIAL /one BLOCKED**. Real phase/worker provenance
(T49) blocked; repeated-worker source (T54) partial. Fixture projection/failure
proof is explicitly distinguished from actual engine event provenance.

Original engine's final full run: **53 PASS /three paid NOT_RUN**. Earlier
environment-limited runs had one/two failures (nested bare python could not find
pytest; one native cleanup assertion also failed). Only child PATH/package lookup
was corrected, with pinned local venv and no global/system/engine changes. Three
isolated cleanup repeats were PASS/PASS/FAIL. Four independent held-handle probes
confirmed that exit signaling can lag cooperative cancellation: two immediate
WAIT_TIMEOUTs, all stopped by 100ms without force. This is a **PARTIAL Engine
regression disposition**, not an erased failure or unconditional cleanup PASS.
The timing/root fix is NOT_VERIFIED and no engine patch is authorized. Full system
G4 remains PARTIAL; this finding does not rewrite the owner's scoped P7 acceptance.

Other failures corrected locally: initial P8 cursor regression (watermark was
mistaken for fetched range); overly specific rejection expectation; task-selector
hard stop at 200; unknown-Dock mutation/auto-open risk. Their initial artifacts
are retained. Actual offline AgentOS patch/test -> T4 -> closed IPC -> UI ran on
Windows, reloaded without replay and retained one task. Actual Main crash and
blocked-lease history show correct uncertainty; navigation/cancellation/Job,
SQLite fault/concurrency, finite pressure, XSS and scoped privacy regressions ran.
Screenshot: screenshots/mission-control.png, captured from actual offline engine
execution, not a mock-up and not fabricated worker activity.

## Permissions, operation and recovery

No paid API request in P8; the consumed P7 journal SHA remains
`06fcb97499f258eb5a8d1ea1d96928ad39e3ba74d0f3068800eca349fb973d7e`
(12 /31,628), and P5's journal remains unchanged (two /381). Tests used synthetic
keys/MockTransport only; no reset/renewal or alternate paid key. All executed task
projects were external synthetic fixtures. Credentials/raw logs/local paths stay
ignored, outside public records and Renderer. No new dependency or admin change.

Commands: npm test -- --reporter=json --outputFile=.cache/p8-full-unit.json;
npm test -- tests/ui tests/unit/mission-replay.test.ts --reporter=json
--outputFile=.cache/p8-final-ui-all.json; python -X utf8 -m unittest discover
-s tests/python -v; npm run build; npm run test:electron; npm run format:check;
original engine tests/run_offline.py -q -p no:cacheprovider under its pinned venv
with only process-local dependency lookup; frozen verify_delivery.py with Git and
the retained original ZIP. No live test command was run. All checks used isolated
profiles/temporary fixtures; native/shell/Git operations used scoped authorized
execution permissions, not system configuration changes.

Run locally: npm run dev, or npm run build then npm start. Choose an authorized
registered project, open Agents and select recorded missions. This reads history;
it does not renew the spent Run Task allowance or expose unavailable workers.
Rollback is a reviewed new feature-branch commit; retain SQLite/WAL, source
checkpoints, journals and receipts; never replay an uncertain task or drop an
immutable event/incident to make the UI green. Manifest records exact phase files;
later receipt records the independent published implementation SHA.

**Stop at owner P8 review.** Full P8/G5 BLOCKED pending separate engine hook
approval; CP-001 and native cleanup timing require explicit review. P6 G6/full
system gates remain PARTIAL and P1 visual signoff deferred. No P9, packaging or
main merge, no self-issued P8 acceptance.
