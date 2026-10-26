# P9 — Windows development-integrated acceptance

Status: **P9 FINAL OWNER REVIEW — NO-GO for full dev acceptance**. G6 and G9-dev
are BLOCKED. The integrated local app works in the executed Windows journeys;
missing mandatory proofs are not waived by executable pass counts. No product
defect requiring production-source changes was demonstrated.

## Final executed results

| Current unique executable inventory | PASS | FAIL | NOT_RUN |
|---|---:|---:|---:|
| Desktop unit/UI/native/protocol | 457 | 0 | 3 |
| Desktop Python/offline Gateway | 34 | 0 | 0 |
| Actual Windows Electron | 37 | 0 | 0 |
| **Desktop total** | **528** | **0** | **3** |
| Separate Engine full offline regression | 69 | 0 | 3 paid |

Latest result per file/name is counted once. Repeats and historical paid results
are not added. Full Electron run04 passed all 36 then-existing tests; the new
exact inspection recovery case passed05/06 and is counted once. Unit full01:
457 PASS/3 symlink skips; Python native exit0, 34 OK; Engine native exit0, 69/3.
Build/TypeScript and formatting pass (build04/format03). Existing third-party
Zod PURE annotation warnings remain nonfatal. No dependency change/install.

| Frozen conformance inventory | PASS | INCONCLUSIVE | BLOCKED | NOT_RUN |
|---|---:|---:|---:|---:|
| I08-T01–88 | 76 | 8 | 3 | 1 |
| E2E-01–08 | 6 | 1 | 0 | 1 |
| E05-01–36 | 36 | 0 | 0 | 0 |
| I06-T01–52 | 42 | 7 | 1 | 2 |
| I07-T01–56 | 45 | 8 | 1 | 2 |

The 304 matrix rows also preserve every named IIS-01–04 conformance group and
IIS-01 positive wire fixtures. Each row has frozen file/line/current wording,
applicability, environment, exact executable names, evidence hash and limits.
No inherited PARTIAL/NOT_RUN became PASS because its containing suite passed.
I06-T36 uses final IIS-06 §§24–25 / FFR08-R03: no same-turn retry UI/API.
IIS-02-C01/C02 projection and C-02/C-03 trust boundaries are unchanged.

## Current integrated proof

- Actual Electron sandbox/context isolation, restricted 23/3 Preload, typed IPC,
  origin/frame/CSP/navigation rejection and no Node/SQL/Shell in Renderer.
- Actual Main SQLite 22 tables/T1–T6, concurrent immutable admissions/receipts,
  one active plus twenty queued, BUSY/FULL, corrupt/newer schema refusal, WAL
  backup/restore, scoped reads, commit-before-push, sparse gaps and sticky conflict.
- Original AgentOS/LeadArchitect/Dispatcher/Chassis with Offline Gateway on
  synthetic external Git projects: typed WorkerReports/repeated roles, all nine
  actual event types, task-level patch/test evidence, truthful outcome/liveness,
  busy worker/tool cancellation, native Job/handle cleanup, Main crash, held lease
  on uncertainty and no automatic execution replay. No paid mission or simulator
  is substituted for the positive real-engine tests.
- P9 navigation: Chat/Agents/Projects/Files/Settings, five Renderer reloads,
  a separate new Discussion while the real Worker remains busy, original task
  identity unchanged, then genuine cancellation/zero lease. Actual Electron
  CPU/working-set observations are attached; no new resource SLA is invented.
- Accepted P5 genuine DeepSeek two-answer ledger restored in today's real app
  through a WAL-consistent test-ledger copy, without model runtime/key config,
  Send or paid requests. Four messages/two assistants/zero tasks, budget unchanged.
  Original Gateway blobs match accepted P5; current actual Main/bridge/Gateway
  HTTP-mock two-turn integration passes separately. This is not present live API
  readiness or new post-process-restart real inference.
- P9-E2E05 closes I07-T47: native P6-E03 kills Main (exit86) after authenticated
  stdio handoff before observation COMMIT; actual Renderer opens that same
  isolated ledger's WAL backup, shows partial/zero handed reads/two original user
  messages/zero assistants, survives reload, and preserves source DB hash. No
  source replay/provider setup or invented complete inspection.

## Windows security, performance and UI

Host: Windows **10.0.26200.9711 / 25H2**, x64, Node25.9.0, Python3.14.4,
SQLite3.51.3. Actual Electron45.0.0 / embedded Node24.22.0 / Chromium156.0.8078.48.
One actual display: 1536×864 DIP at **125%**. Sanitized CPU/RAM and version
details are in run-manifest.json.

Actual junctions, native held ancestors/leaf, writable-handle/mapped-view denial,
same-length/mtime attacker, hardlinks, ASCII/available short alias, whole-file
secret/encoding scans, consent ordering, queue limits and HMAC recovery reran.
New ADS case creates/verifies a real NTFS stream then proves selector denial,
zero stream bytes returned. New attacker thread: **400 native write/root-rename
attempts, 400 denied**, captured content/identity unchanged.

**Both file and directory CreateSymbolicLinkW fixtures fail with Windows 1314**,
including ALLOW_UNPRIVILEGED_CREATE. No Developer Mode/user-right/admin setting
was changed. Symlink containment is NOT_RUN; junction/grammar tests do not replace
it. Mount/case-sensitive/normalization/native-special variants retain their exact
limits. No root escape was demonstrated, but complete mandatory containment is
unproved: **G6 BLOCKED / P9-F01**, therefore G9-dev BLOCKED.

Actual T4 journal: **2,001 synthetic events**, 40/page, four pages/turn, 51 pages
total, cache peak400. Full01: ~3.21s commits/~3.32s total; Node event-loop
mean58.45ms/max84.87ms; test-process RSS ~93.1→180.0MB including runtime/schema
caches. These are host-Node observations, not Electron Main latency or a memory
leak/SLA conclusion. Actual Electron five-cycle CPU/working-set metrics are
separate. A combined long-duration high-rate GUI soak remains INCONCLUSIVE.

Current actual-window fit covers 1100×700, 1366×768, 1920×1080, 1000×600;
Sidebar collapse, Dock tabs/resize, editable drafts, keyboard/focus/reduced motion,
axe on all pages, overflow/history/no-fake-workers pass. Native display scaling
and forced 1/1.25/1.5 device-scale tests are distinguished. Exact CSS overrides
account for physical display constraints. Human readability/a11y signoff remains
pending; P1 visual redesign remains separately deferred, with no invented waiver.

## Preserved failures and corrections

Build01 failed only new harness TypeScript: Playwright timeout overload and
optional replay query limit. Corrected test types; builds02–04 pass. Electron01:
35 PASS/1 FAIL; new historical fixture omitted the isolated profile's local
history/Broker opt-in. Enabled fileBroker:true only, matching normal default
launch, without model configuration or weaker assertions. Electron02: 1 PASS/
1 FAIL; new concurrent Discussion journey selected sidebar index1 (its new
conversation). Error snapshot confirms this; exact original conversation title
selection fixes the harness. Selected03 and full04 pass. Additional inspection
case05 passes; repeat06 adds actual source hash preservation and passes.
All failed/raw runs remain locally hashed. Collector parsing was corrected for
asyncio diagnostic lines and PowerShell UTF-16 output; raw logs were not rewritten.

## Files, privacy, reproduction and recovery

New tests: tests/unit/p9-windows-acceptance.test.ts,
tests/unit/p9-replay-stability.test.ts, tests/electron/p9-history.spec.ts.
tests/electron/coding-engine.spec.ts adds only the P9 journey; inherited tests
are unchanged. AGENTS.md records authority. Required seven P9 reports/manifest/
receipt, bounded executable registry/collector, protocol/DB/Windows/UI/provider
evidence and actual synthetic-project screenshots are listed with exact hashes
in CHANGE-MANIFEST.json (itself/later receipt explicitly excluded).

No production Main/Preload/Renderer/bridge, frozen bytes, dependencies/lockfile,
schema, public interface or Engine source changed. Original working/Git/ZIP
delivery hashes pass (42 delivered, 41 manifest payloads, plus approved normative
IIS-02-C02; 19 normative/44 engineering files). Canonical IIS-03 reissue digest:
`d79d0f5a0960b64c7c806047407c7632d564c1cf4331ae7c5f185c0df129df48`.
Freeze/closure/ratification records checked; N04-H01 prospectively CLOSED,
lost historical original custody remains NOT_VERIFIED, not reopened or invented.

Run locally with the existing pinned dependencies: `npm run build`, `npm start`
or `npm run dev`. Functional model/Coding readiness still requires the existing
explicitly configured/verified development runtime. Do not run test:live. Exact
test commands/environments/raw evidence hashes are in run-manifest.json. Collector
requires completed named reports; absent historical test ledger is unavailable
evidence, never permission for a paid retest.

P5/P7 paid journal hashes remain accepted; zero paid requests. No user project,
production DB, real key, global OS setting, Administrator tool, main merge or
P10/package/installer was used. Raw DB/config/log/source payload/private path/PID/
environment dumps do not ship. Review staged paths/secret-shaped literals before
publication. Keep local WAL/failure evidence and synthetic profiles. Safe rollback:
close test windows, use accepted P8 in a separate checkout; verified SQLite backup
for later restore, no destructive reset, automatic task/provider replay or lease
unlock from absent PID/time. No demonstrated Engine source defect warrants an
Engine Change Request. Final SHA is in the later COMMIT-RECEIPT.md.

See release-decision.md for gate reasons and exact remaining owner decisions.
Stop at **P9 FINAL OWNER REVIEW**.

## Original stage declaration and execution envelope

Owner authority: P9 FULL WINDOWS
INTEGRATION & ACCEPTANCE, 2026-10-26. Tier: WINDOWS DEVELOPMENT-INTEGRATED
ACCEPTANCE, not packaged distribution. P8 acceptance was published first at
`ca59509dfcce66c7680dddfe80554570dce516bd`; P9 starts there on
`feature/p9-windows-integrated-acceptance`. Accepted P8 is
`b527a44bb5da47e63c835e71d902c3c6bc1ab1ac`. Engine remains read-only at
`99e00e13f8a39fa6730f3d3de773ac937b5ac915` on its accepted P8 branch.
Both remote/local baselines and clean working trees were checked; mains unchanged.

## Execution envelope and exit rules

Read the approved engineering baseline and P1–P8 evidence; verify its original
42 delivered files plus approved IIS-02-C02 without modifying their bytes. Treat
the closed historical custody finding as prospectively adopted, never fabricate
historical original-source verification. Use final frozen I06-T36 semantics.

Allowed files: P9 documentation and test/fixture harnesses, AGENTS.md/README scope
records; only demonstrated in-contract Desktop defects in Main/Preload/Renderer/
bridge may require product edits. No dependency change is initially necessary.
Existing pinned local Node/Electron/Python packages and lockfile remain baseline.
Tests use disposable profiles and external synthetic Git projects, actual original
AgentOS with Offline Gateway, native Windows handles and synthetic secrets.

Run inherited P1–P8 unit/UI/Python/Windows regressions and Engine's full offline
suite, then P9 integrated journeys, native Broker attacks/privilege probes,
bounded resource observations and fault injection. Record exact current case
identities and hashes separately from normative conformance rows. Reproduce/fix
authorized local failures and rerun appropriate tests; never weaken assertions.

Success requires every mandatory dev-applicable G0–G9 condition with actual
appropriate evidence, no unresolved P0/P1 and no unapproved P2 waiver. A missing
required native security proof blocks G6 and final G9 even if other tests pass.
Complete independent work before reporting an authorization/privilege boundary.
Engine source changes, new paid smoke tests or contract conflicts need specific
separate owner disposition. No production user database or project is touched.

Deliver IMPLEMENTATION-REPORT.md, VERIFICATION-RESULTS.json, run-manifest.json,
coverage-matrix.csv, release-decision.md, CHANGE-MANIFEST.json and a later
COMMIT-RECEIPT.md, with bounded sanitized evidence folders. Raw sensitive logs stay
ignored locally with hashes. G8-package and E2E-08 remain
NOT_RUN — FUTURE DISTRIBUTION. Normal reviewed commits/pushes only, no main merge.
Preserve SQLite/WAL and journals; recovery uses verified backups, no destructive
reset or automatic execution replay. Stop at P9 FINAL OWNER REVIEW.
