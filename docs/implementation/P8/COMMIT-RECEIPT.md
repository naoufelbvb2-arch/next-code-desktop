# P8 final corrections publication receipt — 2026-10-25

Owner authority: P8 FINAL CORRECTIONS. Both feature branches are published;
no main merge, force push, paid API call, P9 or packaging action occurred.

- Engine implementation and short report: **`99e00e13f8a39fa6730f3d3de773ac937b5ac915`**, branch
  [feature/p8-verified-worker-observers](https://github.com/naoufelbvb2-arch/next-code/tree/feature/p8-verified-worker-observers).
  Reviewed 4 source files, 1 test file and the short report; 69 PASS /0 FAIL
  /3 paid NOT_RUN. Independent native repeat: 5 PASS, not counted twice.
  AgentOS/public contracts unchanged. Engine published first; Desktop pins this
  exact commit, complete source inventory and VERIFIED_OBSERVER_VERSION=1.
- Desktop implementation and verification: **`2e62f08e86a72e657e528045ca153826b2065dcc`**, branch
  [feature/p8-mission-control](https://github.com/naoufelbvb2-arch/next-code-desktop/tree/feature/p8-mission-control).
  Unique Desktop results: **522 PASS /0 FAIL /1 NOT_RUN**,
  including 34 Python and 34 Windows Electron cases. E05 36 PASS; I08-T49–56
  8 PASS. Raw repeats and historical paid proofs are not added to these counts.
- Source baseline: Desktop decf6390; Engine 5e7179b. P7 owner acceptance and
  historical native/fixture/Regression failures remain preserved in P8 records.
- Original delivery 42 files /41 payload /18 normative hashes unchanged;
  approved IIS-02-C02 adds 1 normative file, total 19. Both staged Git and
  committed Git blobs match working bytes; the retained original ZIP still
  matches its original 42-file inventory. No SQLite, JSONL or method-count change.
- Exact staged paths/bytes, manifest, credential-shape/privacy scan, budgets,
  branch/origin, build/typecheck/format and actual test evidence were reviewed.
  Both consumed real paid journal SHA-256s remain unchanged.

This later receipt cites independently published implementation commits. It
cannot authenticate its own future commit SHA; the final owner-facing response
and branch reference report that SHA after committing and pushing this receipt.
P8 STAGE_EXIT_PASS /P8-scoped G5 evidence PASS are submitted for owner review,
not owner acceptance or full-system acceptance. Full IIS-08/P6 G6 stay PARTIAL;
P1 visual signoff and any later phase require their separate disposition.

Current verification JSON SHA-256:
`3b40ed82718aa67454e2a2e9deae2f5a52d1594dcf1376b5c71067062faab5b0`.

---

## Previous receipt — retained historical evidence, superseded current disposition above

# P8 implementation publication receipt — 2026-10-25

Implementation commit **`540a9f0ac689a1a2afec66aae8c4ff3383fd034a`** is published to the official
[`feature/p8-mission-control`](https://github.com/naoufelbvb2-arch/next-code-desktop/tree/feature/p8-mission-control).
The remote feature ref matched local HEAD before this later documentation-only
receipt. No self-referential final commit SHA is invented here.

The owner accepted scoped P7 at `3f205b036a5e074803d9e58580987a2aeb96d873`;
acceptance was committed/pushed on P7 first at
`c6f36fc8ead214284e26dc7738a4e65aed73eefd`, the exact P8 starting point.
Independent engine remains read-only/unchanged at
`5e7179b9d528e7ef97e18f91ec284e4da514ca0b`. Desktop main remains
`af682b74375a0b5827aa1fca0ff0815434803650`; engine main remains
`834d0ca62cc9b2c03e530bafe4090024d98f31d3`. No force push or main merge.

The 32 staged implementation files were reviewed for exact scope/bytes, real
credential values/fragments, private paths and safe screenshot content. The
manifest authenticates 31 phase files; it excludes itself and this later receipt.
Every manifested Git blob matched working bytes and SHA-256 after the actual
implementation commit. Frozen working/Git/ZIP verification against that commit
passed: 42 delivered /41 authenticated payload /18 normative files. Public
IPC/wire schemas, 22-table schema, packages and lock remain byte-identical.
Only contracts/jsonl.ts runtime correctness changed for legitimate earlier-row
backfill, without adding a schema/action/DTO/public field.

- CHANGE-MANIFEST.json SHA-256: `21b56fd706e0181520c0d270f30eeae005e4159bdc1302cf4271a454a51637fb`.
- VERIFICATION-RESULTS.json SHA-256: `4ac32594a91a89df244033120355d3d5d682cdbb8057e83aaf8b6464cf182af2`.
- P7 mission journal SHA-256: `06fcb97499f258eb5a8d1ea1d96928ad39e3ba74d0f3068800eca349fb973d7e`.

Implemented actual available engine/tool events, supervised T4/COMMIT-before-hint,
permanent conflict evidence and bounded subscribe-before-read replay. Real Windows
AgentOS patch/test activity reaches Mission Control, survives Renderer reload
without execute replay, and shows empty workers honestly. Timeline/Inspector
selectors handle repeated keys, missing evidence, task-only file/test attribution
and escaped untrusted text. A synthetic Inspector fixture is not actual worker
provenance. Header keeps outcome/history separate from unexposed OS cleanup and
current liveness. Unknown persisted Chat Dock policy never auto-opens or silently
overwrites state; in-session known choices and historical replay stay separate.

**Desktop: 508 current unique PASS /zero FAIL /one NOT_RUN**: 443 unit/UI/native,
34 Python and 31 actual Windows Electron. Full unit run 441 PASS plus affected
UI/replay 32 PASS includes two added cases; merged by case identity, not summed
as repeated passes. Inherited unprivileged symlink NOT_RUN remains. Build,
TypeScript, formatting and frozen checks pass. Historical paid P7 proof is
carried, not rerun/counted. No paid API call in P8, no journal reset/renewal;
P7 stays 12 requests /31,628 tokens and P5 remains two /381.

**E05-01–36: 32 PASS /three PARTIAL /one BLOCKED.** Actual repeated-worker source
(04), native cleanup qualification (12) and saved-Dock restoration/live behavior
(35) remain PARTIAL. Real WorkerReport observation (05) is BLOCKED.
**I08-T49–56: six PASS /one PARTIAL /one BLOCKED.** T49 actual phase/worker
provenance is blocked; T54 repeated-worker source partial. Exact case/evidence
layers and retained failing commands are in VERIFICATION-RESULTS.json.

Engine final full run **53 PASS /three paid NOT_RUN**; overall Engine regression
disposition remains **PARTIAL** due reproduced native exit-observation timing.
Earlier interpreter-resolution failures were corrected with process-local pinned
venv package lookup only. One full run and one of three isolated cleanup repeats
failed the original immediate psutil assertion. Four independent native held-handle
probes found two immediate WAIT_TIMEOUTs after cooperative cancellation; all
handles signaled exit by 100ms, without forced cleanup. No persistent orphan was
observed; no root fix or unconditional cleanup PASS is claimed. Original engine
tests/source were not changed. TaskCancelled is not independent OS-exit proof.

**Full P8/G5 acceptance is BLOCKED, not self-issued.** Real phase/worker events
and WorkerReports require the narrow separately approved engine hooks described
in ENGINE-INSTRUMENTATION-REQUEST.md. CP-001 proposes exact historical goal and
saved Chat Dock read projections; neither amendment is adopted. Native timing
requires separate owner review; instrumentation approval must not imply an
unrelated engine cleanup patch. Full system gates/P6 G6 stay PARTIAL and P1 visual
signoff deferred. Independent authorized P8 work is delivered for review.

No engine edit/vendor copy, paid task, real-user project task, aesthetic redesign,
global/admin setup, schema/public expansion, P9 or packaging. Preserve SQLite/WAL,
synthetic workspaces/checkpoints, paid journals and raw diagnostic artifacts.
Rollback only through a reviewed new feature commit; no destructive cleanup or
automatic task/turn replay. Stop at owner review; do not merge main or start P9.
