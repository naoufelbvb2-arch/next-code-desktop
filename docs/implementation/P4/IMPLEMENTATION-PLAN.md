# P4 — Python process supervisor and private bridge

Authority: owner's full P4 authorization, 2026-10-21. Official repository:
`https://github.com/naoufelbvb2-arch/next-code-desktop`.
Branch: `feature/p4-python-supervisor`. Accepted P3: `3da419be3eef270ee72dbc5336258b509dd98a09`.
Published acceptance/base: `8c9bc7d4dabe408a0663183690fc00ae3e0e29b9`.
Both P3 remote SHAs were checked in sequence; the pre-acceptance tree was clean.
Main remains `af682b74375a0b5827aa1fca0ff0815434803650`.

## Sources and scope

IIS-03 **REISSUE FROZEN v1.0**, NCD-04 §5.5, NCD-02, C02/C03,
IIS-01/02/02-C01/04/05/08 govern implementation. No frozen-byte or schema change.
Keep 23 Promise methods, 3 subscriptions, 5 wire types/actions and 22 tables.

Allowed envelope: `electron/main/` supervision and lifecycle integration,
`bridge/` Desktop-owned Python (no engine imports in P4), internal contracts only
if needed without public changes, isolated fixtures/tests, local build/package
configuration, README/AGENTS and `docs/implementation/P4/` evidence. Renderer
appearance and provider/task/file operations remain unavailable.

## Implementation and operations

1. Explicit interpreter configuration with executable digest, Python >=3.11,
   pinned bridge manifest/protocol validation and fail-closed missing runtime.
   No PATH fallback, credential forwarding, shell, engine execution or download.
2. Main-owned Windows Job Object via pinned local Node-API FFI. Create the
   interpreter suspended with explicit private inherited pipe handles, assign
   it to the kill-on-close Job before resuming. Retain OS handles/creation
   identity; query Job accounting for descendant cessation. No PID-only kills.
   Unavailable containment fails closed rather than falling back to child.kill.
3. Reuse P2 strict JSONL and connection gates. Per-child queues, bounded stderr
   metadata (raw text discarded), deadlines and backpressure. New session per
   launch; one Discussion child, finite 1/2/4-second startup backoff, no turn
   replay. Standalone Discussion bridge truthfully returns provider unavailable.
4. Internal P3 coordinator checks committed task/slot/lease before a child.
   Test-only Python coding simulator uses disposable stores and cannot be
   selected by production IPC. No automatic coding replay or cleanup release.
5. Persist cancel first; reserve its wire path, wait 15 seconds, then terminate
   the owned Job. Acknowledgement/exit does not fabricate cancellation/outcome.
   Verified OS stop still needs independent workspace-safe proof before release.
6. Main shutdown owns bounded cleanup; Renderer reload/navigation does not.
   P3 startup recovery preserves uncertainty and existing confirmed rows.

Dependency: pinned local Koffi for Win32 native calls with package-lock;
existing Electron/Node/Vite/React/TS pins retained. Interpreter is already
installed, inspected explicitly and used only for approved bridge/fixtures.
No global tools/admin changes, paid API, TCP/HTTP bridge or engine dependency.

## Verification and stop criteria

Run actual Python on Windows, not mocked launch/kill: runtime missing/digest/
version failures; READY good/wrong/duplicate/timeout; malformed UTF-8/JSONL,
wrong action/role/correlation/ID; partial/oversize records; bounded queues and
request deadlines; crash before/after READY; finite restart/session isolation;
stdin cancellation under load, full 15-second grace, Job descendant termination,
orphan/uncertain cleanup, Main crash/restart and Renderer reload. Exercise P3
admission/replay/lease/event integration only in isolated stores. Run all P1–P3
regressions, real Windows Electron, build/typecheck/format and exact delivery
manifest verification against working bytes and Git blobs.

Success is process-scoped P4 evidence, not actual AgentOS/provider/full IIS-08
acceptance. Mark unexecuted engine/P5–P9/packaging and physical logoff tests
NOT_RUN/NOT_VERIFIED. Abort unsafe launch if trust, admission, containment or
protocol checks fail. Preserve DB and lease on uncertainty. Stop on a genuine
frozen-contract conflict and prepare a numbered DRAFT change proposal.

Rollback: close only owned test Jobs/processes, retain evidence and original
databases; revert reviewed P4 commits on its feature branch if necessary. Never
reset, delete user data, clear leases blindly, modify engine or merge main.

Deliver report, exact change manifest, sanitized case results and limitations,
dependency/command records, later commit receipt and final remote SHA. Publish
reviewed feature-branch commits, then stop for owner acceptance; no P5.
