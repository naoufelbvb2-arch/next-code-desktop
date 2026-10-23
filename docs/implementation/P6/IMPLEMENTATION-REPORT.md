# P6 implementation report — 2026-10-23

P6 Project File Broker is implemented and submitted for owner review. P5 was
officially accepted at `7f7456254bb9f08e25526754782909b1f8153148`; its acceptance
receipt was published at `51c50d98dbbeb5ae9c582011441fe283f5d5ce63` before branching
to `feature/p6-project-file-broker`. Owner acceptance of P6 is pending. No main
merge, P7/P8, AgentOS execution or paid provider call was performed in P6.

## Implementation and boundaries

`electron/main/broker/` contains the shared versioned selector/content policy,
native Windows implementation, bounded worker preparation/pool and authoritative
FileBroker service. Registration pins the drive-to-root ancestry and records a
volume/file-ID/canonical-root workspace key. Legacy P5 projects must be explicitly
chosen again for file access; history is preserved without rebinding. Missing or
replaced registered roots are marked unavailable; new registration never silently
adopts their old identity.

The existing `projects.listFiles` and `projects.previewFile` methods now return
real safe listings/excerpts. Files/Right Dock renders escaped read-only text,
bounded pagination and line ranges. Project response identities and generation
guards prevent old previews appearing under a new selected project. Local preview
does not create Discussion inspections, grant external consent or contact a model.

The supervised Discussion path uses only `project.discover` and `project.read`.
Main binds the exact issued attempt, session, parent wire ID, conversation,
project/workspace, selected model and effective provider/destination before
flushing `discussion.send`. UI navigation cannot retarget it. Role, readiness,
active DB attempt and source authority are checked again for each request.

The Python client has no exposed filesystem/shell/worker tool. `/inspect` performs
bounded root inventory and selects at most two relevant files; `/read path`
requests one bounded excerpt. Source bytes are used only for that parent, as
lower-trust quoted user data. Ordinary chat has no broker call or source replay.
The original read-only engine ModelGateway/provider remains the model route.
Python retains normal process OS rights: this is application capability
separation, never a Windows Python sandbox or universal outgoing-data filter.

## Native capture and final release

Production and tests use pinned Koffi 3.3.3 and supported Win32 APIs. All encountered
reparse objects are denied, including inside-root junctions; hard-link aliases,
short aliases, unsupported filesystems/case modes and nonregular objects fail
closed. `CreateFileW` opens retain READ sharing only. Every ancestor is pinned
before the next DOS-path lookup: this is a tested pinned-ancestry equivalent,
not a claim of native handle-relative opening or string-prefix containment.

The same bounded leaf capture is decoded, fully screened, normalized and excerpted.
The worker retains the actual handles until the lease ends. Main borrows only
their process-local opaque values and metadata for synchronous final verification
at authenticated child-write scheduling. Cancellation/deadline/lease guards run
before inspecting them; Main never closes or reconstructs worker handles. These
private descriptors never enter public IPC, JSONL, SQLite, prompts or diagnostics.
The final check repeats native identity/revision, active parent and exact consent.
The evidence document details the tests and remaining unsupported attack trials.

## Consent and durable evidence

The existing T6 methods implement list/respond/revoke with Main-issued 15-minute
challenges. A model choice or source request cannot approve disclosure. The only
configured route is `deepseek_official_v1` to its verified API destination with
class `project_source_v1`; unresolved/changed routes fail closed. React requires
explicit Allow/Deny/Revoke clicks; uncertain retries reuse mutation identities.
Revocation commits synchronously and invalidates affected parents before any new
release can pass Main's write hook. Already released bytes cannot be recalled.

No schema change: 22 tables, one existing migration. `discovered_file`, `read_file`
and `excluded_page` use the existing atomic observation/counter transaction.
`read_file` is committed only after the successful actual stdio write callback;
multi-line chunks of the same subject/revision count once. Changed revisions are
stale. DB failure after handoff stops further broker authority without a second
response. A native Main termination inside the uncommitted observation transaction
proves conservative undercount on restart, partial coverage and no auto-replay.

A separate 32-byte per-installation HMAC secret stays in ignored user data outside
SQLite/Git. No old inspection resumes on startup. Actual WAL backup/restore tests
with missing and rotated keys preserve historical counts, close old coverage
partial and create new inspection/subject identities. Ledgers contain opaque
metadata evidence, never raw source or protected excluded names.

## Limits, choices and stricter admission

All IIS07-D10 ceilings are enforced. Heavy enumeration/capture/decoding/scanning
runs in Main-owned threads: two active globally, one per parent, sixteen globally
queued and four per parent. Queue time is included in each 30-second deadline.
The parent has a monotonic 90-second window from its first broker operation;
including idle gaps is deliberately conservative. No user/model limit override.

Calls reserve scan capacity (8 MiB), worst-case encoded excerpt capacity and
distinct path slots before queue admission. Actual bytes reconcile reservations;
unproven timed-out work retains a conservative full scan charge. This can refuse
work before the actual-byte ceiling is filled; it never enlarges a ceiling or
pretends reserved bytes were measured scans. Listings encounter at most 4096
physical entries and retain at most 1000 safe entries. Opaque cursors are scoped
Main-memory handles, bounded to 256 records/16 snapshots/8 MiB aggregate descriptor
storage with 90-second expiry, and reverified on each page. No plaintext source
cache, background index or automatic whole-project ingestion exists.

Worker heap limits are 128 MiB old generation, 16 MiB young generation and 4 MiB
stack, plus explicitly bounded capture/native buffers; these are not a measured
128 MiB total process RSS guarantee. On unexpected native worker failure, the
pool fails closed until app restart rather than replacing threads whose native
handle cleanup cannot be proven. A stuck native call may retain its bounded slot
and handles until return/process exit; Main rejects overdue work and does not
force-close guessed/reused handles.

## Verification and remaining disposition

See `VERIFICATION-RESULTS.json` for exact executed results, commands and the full
56-row I07 matrix. Native fixtures use only isolated synthetic directories.
Final unique execution: **432 PASS, zero FAIL, one NOT_RUN** (EPERM symlink).
This combines 389 unit/UI passes (full run plus one final wire-boundary case),
18 offline Python passes, 24 actual Windows Electron passes and one read-only
P5 live-history restore. Repeated runs do not multiply these totals. The separate
I07 requirement register is **44 PASS / 10 PARTIAL / 2 NOT_RUN**, zero FAIL/BLOCKED.
Full regression includes P1–P5 unit/UI, Python and Windows Electron tests. The
historical paid P5 two-turn case was not rerun: P6-E04 supplies an offline actual
Main/Job/bridge/Gateway two-turn substitute, and the original live conversation
was restored read-only. Paid ledger remains 2 requests / 381 tokens, unchanged.

Problems found and corrected: challenge creation originally lacked native root
proof; unbounded entropy regex overflowed on the 8 MiB long-line edge; initial
restore-test SQL used `kind` instead of `observation_kind`; a role-denial test
observed a prior registration worker before its normal exit; orderly Electron
exit was unsuitable for a real crash fixture. Native TerminateProcess of only
the fixture Main and cached test process ownership corrected crash verification.
Review also added same-handle S5 verification after preparation and tests for
attribute-only timestamp changes at that final hook. Earlier failures are not
counted as passes; final outcomes supersede them.
The live-test output directory is now separate from Electron's output so that
read-only restore runs cannot erase the native integration evidence report.

Unprivileged file-symlink creation is unavailable (EPERM), so that native case is
NOT_RUN; actual junction and short-alias cases ran. Privileged volume mounts,
case-sensitive-directory configuration, actual special-resource fixtures and a
local inference route are not demonstrated. A >JS-exact-range physical file was
not created; the nullable-size guard is source-reviewed only. Some integrated
matrix cases remain PARTIAL; their tested subsets are identified explicitly.
No supported-case containment escape or secret leak was observed. Unsupported
identities fail closed. No frozen contract modification or Change Proposal was
needed; unrun privileged fixtures do not grant an exception to the deny policy.

This is ready for owner review of implementation and explicit partial/unrun
dispositions. It is not unconditional P6 acceptance, full IIS-08 G6/G0–G9 PASS,
packaged evidence, P1 visual signoff or independent security certification.

## Dependencies, operation and recovery

No dependency, package-lock, engine source, public method/subscription/action or
SQL schema changed. Electron 45 / embedded Node 24.22, React 19.3.1, Vite 7.3.7,
TypeScript 5.9.3 and existing Python 3.14/pinned bridge dependencies remain in use.
Build warnings concern existing dependency comment annotations; build succeeds.

Run `npm ci --cache .cache/npm` if needed, then `npm run dev`; or
`npm run build` and `npm start`. Choose a folder explicitly, open Files and preview
safe text without Python. Discussion requires the separately configured P5
runtime; `/inspect` or `/read relative/path` requests source. Approve a challenge
explicitly and send a new message; no request retries itself after permission.
P6 tests and this handoff do not authorize additional paid verification calls.

Close the app to release native leases and supervised jobs. On errors, preserve
the DB/WAL/HMAC key and use the existing Main-only verified backup/restore path;
never reset uncertain history. Restoring without the key cannot resume old
inspection identity. Feature rollback needs no schema downgrade; keep backups
and P6 stronger project records/history, which old code may safely refuse.
Do not automatically resend an ambiguous turn. No global/admin installation,
private user-file attack test, unrelated cleanup or destructive Git operation
was performed. File hashes and publication provenance are in the exact manifest
and later commit receipt; no document invents its own commit hash.
