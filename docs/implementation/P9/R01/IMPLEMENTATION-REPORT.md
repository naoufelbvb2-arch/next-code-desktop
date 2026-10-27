# P9-R01 — Final evidence closure — 2026-10-27

Status: available R01 implementation/verification completed; **full P9 NO-GO,
P9 FINAL OWNER REVIEW required**. Authority: owner P9-R01 attachment, 2026-10-26,
all available text read; it ends mid-sentence after Part D. The owner instructed
continuation without supplying more text. Only explicit A–D/general scope used.
The following pre-execution envelope was recorded before work; actual results
and remaining acceptance obligations follow it.

Desktop: existing feature/p9-windows-integrated-acceptance, verified local/remote
starting SHA b4ae63cd34d8d3c84dae68b5697ea53bccf515f4. Engine: read-only pinned
99e00e13f8a39fa6730f3d3de773ac937b5ac915, verified local/remote and clean. Both
mains unchanged. Original P9 reports, matrix, run manifest and receipt are sealed
historical inputs and will not be regenerated or overwritten.

Allowed envelope: isolated tests/fixtures and R01 documentation, current authority
in AGENTS.md, demonstrated in-contract Desktop fixes only if tests prove a bug.
Existing pinned local dependencies; no install/change initially needed. No Engine
source, frozen bytes, interfaces/tables, production provider, user project/DB,
global/admin/Developer Mode changes, paid request, budget reset, main merge,
P10/package/installer. Native directory flags may be attempted only on newly
created isolated test directories; unavailable privilege is recorded, not raised.

Operations/tests: targeted remaining native symlink/reparse/case/Unicode/special
objects/metadata boundaries; captured routing/consent and original Gateway
restart/context/pressure/error cases; actual Windows AgentOS worker/event/SQLite/
Mission Control/navigation/reload/cancel soak with measured resources. Preserve
existing successful evidence rather than rerunning all P1–P9 without cause.
Any production correction requires directly affected regressions, build and
format checks. Native vs unit vs offline Gateway vs current actual Windows vs
historical paid evidence remain separate. Exact commands/results/hashes follow.

Success requires executed appropriate evidence for each promoted row, zero
unresolved mandatory P0/P1, and explicit owner acceptance. Missing native privilege,
genuine second/local provider, fresh paid-only proof or human review cannot be
waived. Continue all independent work before reporting the precise remaining
boundary. No new performance SLA. Recovery retains WAL/test ledgers and uses
verified backup; no automatic provider/task replay or lease release from PID/time.

Deliver new R01 results, full baseline-comparison matrix, run manifest, findings/
release decision, exact change manifest and later publication receipt here.
Use separate reviewed commits on the existing P9 branch. Stop for owner review.

## Implementation and actual evidence

`electron/main/broker/service.ts` is the only production correction. A foreign
conversation scope already denied content, but its `StoreError NOT_AUTHORIZED`
was misclassified `BROKER_IO_ERROR`. Map only that specific store authorization
exception to the proper broker refusal; genuine database failures retain their
safe IO path. New C03's precise assertion failed before this fix and passes
afterward; no assertion softened and no new authority/data access added.

Three new Electron specs, two native/consent unit files and one Python module
implement 21 new unique cases. Shared fixtures add optional controlled provider
gates, actual stdio destruction, post-COMMIT/pre-push native Main crash, restart
memory inspection, real worker soak and scoped native runtime observations.
Helpers are test-only, never public IPC/Preload. Soak audit/ledger are outside the
browsed synthetic project. `AGENTS.md` records current R01 scope.

No dependency installation/change was necessary: existing pinned local packages
and Python environment sufficed. No Engine, frozen bytes, public method/action/
event, SQLite table or production route change; no Engine Change Request needed.

| Area | Executed result and evidence limit |
|---|---|
| Native Windows | 7 new PASS, 2 symlink NOT_RUN. Actual file/directory CreateSymbolicLinkW attempts both return1314. Token lacks SeCreateSymbolicLinkPrivilege and SeManageVolumePrivilege, not elevated. No admin/Developer Mode/policy/global change |
| Case/Unicode | Actual isolated case-sensitive NTFS root with distinct Case/case native IDs rejected. Distinct NFC/NFD objects: correct NFC bytes, NFD denied without alternate-file read |
| Special objects | Actual named pipe, NUL character device, live native Winsock AF_UNIX filesystem socket and binary Shell Link to synthetic outside target all denied |
| Metadata | Production discover with injected BigInt metadata at0/MAX_SAFE-1/MAX_SAFE/MAX_SAFE+1/uint64max returns exact integer or null. UNIT, not a native giant file |
| Routing/scope | Original Gateway captures independent A/B test transports: issued A stays A and next request uses B. Main rejects altered provider/model/destination and actually registered foreign project. Production still one route; no genuine second/local-model proof |
| Release/revoke | Actual Main source callback/T5 observation precede paused Python send. Revocation commits, captured original Gateway can then receive already released source; later Main release denied. No remote recall claim |
| Restart/memory | Actual Windows Main and owned Python recreated; no startup request; fresh captured followup uses prior context. Two pressure candidates persist with valid same-conversation source IDs, next turn uses summaries, revision increases, new conversation has no inherited history |
| Failure | Original Gateway synthetic401/timeout one request/reservation each, sanitized/no fallback/retry. Prepared real source stdio writer destroyed: original Node callback ERR_STREAM_DESTROYED, one attempt, zero read observations/provider calls |
| T4 crash | Native Main exit87 after independent SQLite reader sees actual COMMIT, before publication. Reopen replays one event once, retains writer lease/needs_reconciliation, never infers OS cleanup from Main exit |
| Audit crash | Native exit86 after actual pipe write before observation COMMIT; actual Renderer reopens/reloads partial audit without fabricated observation |
| Topology | Scoped native CIM inventory: no unclassified app-owned TCP/service. Main Playwright debug listeners matched runtime ports; Coding CPython Proactor non-listening socketpair/BOUND reservation matched actual loop ports, not a Python bridge |

Combined actual Windows AgentOS/Offline Gateway run configured 60s, measured
61.509s (plus setup/teardown), committed 25 events with 11 real SCOUT starts and 11
real WorkerReports,50 navigation cycles and 13 Renderer reloads. No injected
events or observed gap. Cancel-to-visible outcome 344.677ms; durable cleanup
`verified_cancelled`, writer lease 0, retained native process HANDLE signaled and
creation identity matched. Supervisor live Job fields become null once current
child retires; these are never interpreted as zero/independent cleanup proof.

Point-sampled Main RSS peaked 190,341,120bytes; Renderer JS heap 20,500,000bytes,
frame wait 16.90ms; Main/mission roundtrip 212.11ms. CPU and process working sets
are in `evidence/soak-03.json`. Sampled queue occupancy 0 is not peak/saturation
proof. Existing 256-record/8MiB queue and 262144-byte record limits asserted;
no new CPU/RSS/latency SLA. Full long/high-rate contract remains INCONCLUSIVE.

## Results and evidence retention

| Inventory | Historical P9 | R01 current cumulative |
|---|---|---|
| Desktop | 528 PASS /0 FAIL /3 NOT_RUN | **547 PASS /0 FAIL /5 NOT_RUN** |
| Engine suite | 69 PASS /0 FAIL /3 paid NOT_RUN | Carried unchanged; no unnecessary full rerun |
| I08 | 76 PASS /8 INCONCLUSIVE /3 BLOCKED /1 NOT_RUN | **80 PASS /4 INCONCLUSIVE /3 BLOCKED /1 NOT_RUN** |
| E2E | 6 PASS /1 INCONCLUSIVE /1 NOT_RUN | Unchanged; E2E-05 remains INCONCLUSIVE |
| E05 | 36 PASS | 36 PASS retained, strengthened by real T4/soak |
| I06 | 42 PASS /7 INCONCLUSIVE /1 BLOCKED /2 NOT_RUN | 46 PASS /3 INCONCLUSIVE /1 BLOCKED /2 NOT_RUN |
| I07 | 45 PASS /8 INCONCLUSIVE /1 BLOCKED /2 NOT_RUN | 52 PASS /2 INCONCLUSIVE /1 BLOCKED /1 NOT_RUN |

R01 executed 69 passing unique Desktop identities and attempted setup for five
privilege-limited native containment cases (three inherited and two new).
Passing cases comprise 19 new identities and 50 affected/historical regressions.
Filtered-out cases are not new skips. Final result replaces only that actually
rerun identity; others explicitly carried, not freshly executed. Components:
unit/UI/native 466 PASS / 5 NOT_RUN; Python 38 PASS; Windows Electron 43 PASS.

Build/TypeScript, formatting and frozen working-tree/Git-blob/original-ZIP byte
verification PASS: 44 engineering files, 19 normative including one approved
addendum. No paid call; P5/P7 budget hashes unchanged. Exact commands/raw hashes
and corrections are in `run-manifest.json`. Historical tracked P9 files are
byte-identical to starting commit; all304 matrix rows retain original wording
with baseline/current columns. No historical collector rerun.

All failed runs retained: initial Python AF_UNIX fixture unavailable in this
build, replaced by native Winsock; case flag on nonempty fixture failed 145, empty
isolated root succeeds; C03 passes only after the production fix. Initial soak
entered needs_reconciliation; audit moved outside browsed project, but initial
Engine exception not captured, so exact cause remains unverified. Second soak
expected retired Job metrics 0; final proof uses stronger retained native HANDLE
and durable cleanup/lease. Initial topology assertion rejected all Python TCP;
final classification admits only runtime-identified self-sockets, never unknown
connections/servers. No failure silently deleted.

**P9-R01-F01 — secondary raw retention, P2, owner disposition pending.** First
inherited native test ran without unique NCD_P9_RUN_ID, overwriting redundant
passing `.cache/p9-native-native-01.json`. Prior SHA256
`24bfea1950fb36788671d9b44fa0b64c462fb3a690a585d4c642f3ad30b5e704`;
observed `97a339203caf372efd700ec1c7d955f9b5b15c8d0e867256e5e2a430556eac95`.
Exact original bytes unavailable. Published historical reports/expected hashes,
primary full native diagnostic and full unit JSON preserved. Every historical
raw manifest entry rechecked; only this file differs. I08-T87 now INCONCLUSIVE,
no automatic waiver. Owner informed during work. Use unique inherited run IDs
and archive fixed-name R01 diagnostics before future repeats.

## Reproduction and recovery

Existing pinned dependencies and read-only Engine SHA required. Synthetic
isolated profiles only; archive previous R01 fixed-name diagnostics first:

```powershell
npm run build
npm run format:check
$env:NCD_P9_RUN_ID = 'r01-review-unique'
$env:NCD_R01_RUN_ID = 'review-unique'
npx vitest run tests/unit/p9r01-windows.test.ts tests/unit/p9r01-consent.test.ts
npx playwright test tests/electron/p9r01-discussion.spec.ts tests/electron/p9r01-faults.spec.ts tests/electron/p9r01-soak.spec.ts
python -X utf8 -m unittest discover -s tests/python -p test_p9r01_gateway.py -v
python -X utf8 -m unittest discover -s tests/python -p test_discussion.py -v
python -X utf8 -m unittest discover -s tests/python -p test_broker.py -v
```

Never run `test:live` during R01. Normal app: `npm run dev`, or `npm run build`
then `npm start`. Missing production credentials/routes remain fail-closed;
fixture providers are not registered on normal startup. Build/review needs no
provider call. Exact collected command variants are in the run manifest.

Recovery preserves isolated WAL/receipts and uses verified SQLite backup;
never auto-repeat a task/provider turn or release lease from PID disappearance.
If the narrow product fix is rejected, revert through ordinary Git while keeping
evidence. No reset/clean/force or user-file deletion. Exact paths/bytes are in
`CHANGE-MANIFEST.json`; later actual publication SHAs in `COMMIT-RECEIPT.md`.
See `release-decision.md` for remaining gates. Stop at P9 FINAL OWNER REVIEW.
