# P3 source and publication receipt

Date: 2026-10-21, America/New_York. Status: **READY FOR OWNER REVIEW** within
NCD-04 §5.4; owner acceptance remains PENDING.

Original accepted P2: `56d3060c7b2ca8e705429863561604d586474fb5`.
P2 owner acceptance was first committed/pushed as
`02ffcf7e7c2554d7dbdf6c5023f105a437bd8dbc`, the exact verified P3 parent.
P3 implementation: **`b0e3636a94980a8f9da532bc2c49b8ead5bfe7b6`** —
`feat(p3): implement Main-owned SQLite durable state and atomic workflows`.
Branch: [feature/p3-sqlite-durable-state](https://github.com/naoufelbvb2-arch/next-code-desktop/tree/feature/p3-sqlite-durable-state).

The reviewed 25-path source/evidence commit was pushed normally. GitHub
`ls-remote` returned that exact P3 SHA; P2 remained at `02ffcf7` and main at
`af682b74375a0b5827aa1fca0ff0815434803650`. The worktree was clean after source
publication. No main merge, force push, source rebase, engine edit or P4 work
occurred. The original engine remained clean at
`834d0ca62cc9b2c03e530bafe4090024d98f31d3`.

Evidence: 215 unit/UI and 17 actual Windows Electron tests passed (232 total,
zero final failures/skips); all 179 inherited P1/P2 cases pass and 53 cases are
new P3 coverage. Actual SQLite proved the exact 22-table/column inventory,
T1–T6 primitives, competing connections, busy/FULL/commit/process-exit faults,
original receipt restart replay and native WAL-consistent backup/verified restore.
Electron Main observed Node 24.22.0 / SQLite 3.53.4. The four documented safe
methods use the production DB; nineteen methods remain explicitly unready.
Fixtures are isolated and never become normal production task/model evidence.

Build/TypeScript, formatting, scoped public-release review and manifest/staged
byte equality passed. Delivery verification was repeated against the source
commit: 42 delivery files, 41 authenticated payloads and 18 normative documents
matched working tree, Git blobs and retained archive. Schema evidence records
the v1 migration checksum and actual pragma/key/index structure.

The manifest excludes itself and this later documentation-only receipt. The
receipt commit's own SHA and final remote/worktree check are in the final response
to avoid a self-referential hash. Earlier failures and six later-stage NOT_RUN
groups remain explicit in the results/report. Full IIS-08/G0–G9 acceptance,
real supervisor/provider/broker/engine/descendant proofs and visual signoff are
not claimed. Stop at the P3 owner gate; no main merge or P4 is authorized.
