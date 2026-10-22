# P4 source and publication receipt

Date: 2026-10-22, America/New_York. **READY FOR OWNER REVIEW**, process-scoped
P4 under NCD-04 §5.5. Owner acceptance of P4 remains PENDING.

Accepted P3: `3da419be3eef270ee72dbc5336258b509dd98a09`.
Separate P3 acceptance/P4 parent: `8c9bc7d4dabe408a0663183690fc00ae3e0e29b9`.
P4 implementation: **`83db9dd311996c71aa7e6f1210672d726bcfce59`** —
`feat(p4): supervise isolated Python bridges with Windows Job containment`.
Branch: [feature/p4-python-supervisor](https://github.com/naoufelbvb2-arch/next-code-desktop/tree/feature/p4-python-supervisor).

The reviewed 21-path implementation/evidence commit was normally pushed and
GitHub returned that exact SHA. P3 remained at its acceptance commit; main
remained `af682b74375a0b5827aa1fca0ff0815434803650`. Worktree was clean after
the source commit. No merge, force push or engine modification occurred.

Final verification: **257 unit/UI + 20 actual Windows Electron = 277 PASS**,
zero final failures/skips. This includes all 232 inherited P1–P3 cases and
45 new P4 cases. The complete per-case sanitized results and seven NOT_RUN
groups plus deferred visual verification are retained in the results/report.
Earlier failures, fixes and the temporary automatic-review service usage-limit
interruption are recorded honestly; they are not counted as successful runs.

Actual Python 3.14.4 ran under owned Windows Jobs from host Node 25.9.0 and
Electron 45.0.0/Node 24.22.0. The tests proved READY/roles/session isolation,
finite restart without turn replay, bounded transport, stderr text exclusion,
the full 15-second cancellation grace, descendant termination, uncertain lease
retention, Renderer reload independence and forced Main-death/restart recovery.
The abrupt Main test uses its held creation-matched Windows handle and observes
both child and grandchild cessation independently. All coding/event evidence
is explicitly synthetic and confined to disposable test profiles/ledgers.

Build/TypeScript, Python compilation, formatting and scoped publication scans
passed. The exact manifest hashes matched working-tree and staged Git bytes for
all source entries. Only newly generated P4 evidence JSON needed LF correction
before staging; no engineering document was normalized. The frozen verifier was
rerun against the published source SHA: 42 delivered files, 41 authenticated
payloads and 18 normative documents match HEAD Git blobs and retained ZIP.
The original engine remained clean at
`834d0ca62cc9b2c03e530bafe4090024d98f31d3` (read-only metadata check).

The change manifest excludes itself and this later receipt by design. This
receipt commit's own final SHA and final local/remote clean-state check belong
in the final response, avoiding a self-referential hash.

P5 models/providers, P6 source broker, P7 real AgentOS/cancellation and workspace
safety, P8 real event instrumentation, full IIS-08 gates, physical OS shutdown,
packaging and visual signoff are not certified by simulator tests. No provider,
engine or real project task was executed. Stop for the owner's P4 review;
no P5 or main merge is authorized.
