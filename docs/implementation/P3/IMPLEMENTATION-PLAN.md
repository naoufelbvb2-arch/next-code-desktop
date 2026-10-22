# P3 — SQLite & Durable State implementation packet

Owner-authorized on 2026-10-21; P2 is ACCEPTED FOR P3 PROGRESSION. Original
accepted P2 SHA: `56d3060c7b2ca8e705429863561604d586474fb5`. Acceptance record
was first committed/pushed on P2; locally/remotely verified P3 parent:
`02ffcf7e7c2554d7dbdf6c5023f105a437bd8dbc`. Branch:
`feature/p3-sqlite-durable-state`; main remains documentary and untouched.

Authority: IIS-04 entire frozen v1 with FFR04-01–05, NCD-04 §§4–6/5.4,
IIS-02 and C01, IIS-01 event schemas, IIS-03 REISSUE capacity/recovery,
C-02/C-03 and approved decision-candidate deferral. No frozen document edits.

Implement exactly 22 logical tables, closed field sets/states, physical monotonic
message/task ordinals, keys/FKs/indexes, immutable originals/receipts/events,
cross-record scope validation; prepared SQL only. Main owns one per-user DB,
foreign_keys ON, WAL, synchronous FULL, busy_timeout 5000 ms. Deterministic
forward migration/checksum and schema/integrity verification fail closed. Native
SQLite online backup and verified restore preserve WAL data and never replace or
delete user history automatically.

Use the existing pinned Electron 45.0.0 embedded Node 24.22.0 built-in node:sqlite;
an initial isolated probe observed SQLite 3.53.4 and native backup API. Verify in
actual Windows Main. No external DB server or native npm ABI rebuild is needed.
Keep package-lock; add only pinned local test/build dependencies if required.

T1 durable first-send/append and original-result mutation receipts; T2 immutable
15-minute proposal/single-use atomic admission, global one starting plus 20 queued;
T3 FIFO/cancel/recovery with blocked writer lease and trusted cleanup hooks;
T4 exact events, verified session, digest/dedup/sticky conflict/gaps and commit
before hints; T5 attempts/lineage, source-grounded summaries and exact explicit
user approval; T6 scoped challenge/grant/revoke with 15-minute expiry and receipts.
Also implement deduplicated inspection evidence, scoped Dock/global preferences,
bounded opaque-cursor queries and required C01 read projections.

Trusted evidence/model/workspace/cleanup checks are Main-only hooks, denying by
default until their later-stage implementation. Test fixtures inject authority
only into disposable databases. No provider, task or inspection success is
manufactured in a user's database. Wire safe DB-backed IPC only where the full
operation can be honored; leave later-dependent methods explicitly unready.
No new IPC method/subscription, wire type/action or schema table.

Allowed files: electron/main storage/services and narrow IPC wiring; compatible
pure contract helpers; tests/fixtures and isolated DB/Electron tests; package,
lock/build/type config/.gitignore only as needed; README/AGENTS for accuracy;
P2 acceptance and P3 evidence. No cosmetic Renderer changes or engine work.

Operations: local tool/dependency metadata, build/test commands; hidden isolated
SQLite subprocesses/worker concurrency peers and Electron test profiles; bounded
rollback/COMMIT/busy/full/crash faults only against disposable DBs; GitHub normal
feature-branch publication. No credentials/provider calls, user-project writes,
Administrator/system changes or actual descendant termination proof.

Verify actual schema/constraints, migration failures/newer/corrupt schemas,
WAL backup/restore, restart/idempotency, competing admissions/cancel/FIFO/aliases,
receipt replay after state changes, sticky event conflicts/committed replay,
T5 provenance/lineage, T6 expiry/revocation, inspection dedup, paging/tampering,
Dock/preferences and C01 restart. Rerun P1/P2, Main trust, build/TypeScript,
format/frozen SHA and public-release checks. Stage-subset G2 only; integrated
supervisor/OS cleanup/provider/broker/real-engine and full IIS-08 stay NOT_RUN.

Stop affected work for true frozen-contract conflict, unexpected history,
unsafe migration/data loss, secrets or required engine/public-surface change;
request a narrow owner decision without weakening the baseline. Ordinary local
build/dependency/test issues are authorized for autonomous resolution. Recovery
keeps original DB and verified backups; no reverse migration or automatic reset.
Deliver plan/report/results/exact path+hash manifest and post-commit publication
receipt; stop at P3 owner gate, without main merge or P4.

Recorded implementation choices: the host Node floor is 24+ for built-in SQLite
backup support; actual Electron/Node/SQLite versions and compatibility are in the
report. Existing esbuild 0.25.12 is pinned as a direct offline test dependency.
The local response transport budget is explicitly 16 MiB to admit fully legal
bounded message/C01 pages; frozen field/page/JSONL limits are unchanged. SQL
closure/column inventory is verified against IIS-04 directly. Production enables
only four fully grounded startup/metadata/display methods; nineteen remain
unready, with independently tested scoped DB primitives behind trusted Main hooks.
