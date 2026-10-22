# P3 — SQLite & Durable State

Date: 2026-10-21, America/New_York. Disposition: **READY FOR OWNER REVIEW —
IMPLEMENTED / PHASE-SCOPED CHECKS PASS / ACCEPTANCE PENDING**.
This is NCD-04 §5.4 database-scoped G2 evidence, not full IIS-08 acceptance.

## Authorization and repository provenance

The owner's separate NCD-04 P3 implementation authorization accepts P2 at
`56d3060c7b2ca8e705429863561604d586474fb5` and authorizes full P3 primitives,
local dependencies/tests/fixes, documentation, commits and normal branch push.
The named root authorization file was absent; the complete attached A–F text
provided the instruction. No substitute frozen normative document was created.

Local P2 and GitHub matched, the worktree was clean and no P3 remote branch
existed. First, the documentation-only P2 owner acceptance was committed/pushed
on P2 as **`02ffcf7e7c2554d7dbdf6c5023f105a437bd8dbc`**. That locally/remotely
verified tip is P3's exact parent on `feature/p3-sqlite-durable-state`.
Main remains `af682b74375a0b5827aa1fca0ff0815434803650`. Source/publication SHAs
are recorded in a later receipt and final response, without self-reference.
The engine remains clean at `834d0ca62cc9b2c03e530bafe4090024d98f31d3`.

## Database ownership, migration and recovery

`electron/main/storage/schema.ts` implements exactly the frozen 22 logical
tables and their exact column sets. `SCHEMA-EVIDENCE.json` records actual SQLite
columns, PKs, FKs, unique/partial indexes, migration checksum and pragmas. The
unit test independently parses the frozen IIS-04 inventory and compares every
actual table/column. SQLite's internal `sqlite_sequence` is not a 23rd logical
application table. Messages and tasks use the physical INTEGER PRIMARY KEY
AUTOINCREMENT columns, with immutable unique public IDs. Tests delete the
maximum disposable fixture rows and verify ordinal non-reuse after reopen;
there is no production deletion/archival feature.

Version 1 migration checksum:
`bb10c3af6cc542996968deb308c7790ab7c572c8cd1593a2a956ad81518778ea`.
DDL is deterministic, transactionally applied and recorded in immutable
`schema_migrations`. Startup verifies integrity, FK consistency, exact schema
signature and supported version/checksum. Newer, changed, corrupt or failed
migrations fail closed. Existing invalid/empty files are preserved rather than
silently reset. There is no reverse migration or destructive upgrade. A future
schema revision requires a new reviewed forward migration; this v1 migration
must not be edited in place after acceptance.

`database.ts` configures foreign_keys ON, WAL, synchronous FULL and busy_timeout
5000 ms on each writable connection. Main serializes synchronous BEGIN IMMEDIATE
transactions and disallows asynchronous work inside them. A per-profile Electron
single-instance lock prevents a second normal Main owner. The one production DB
is `app.getPath('userData')/desktop-state.sqlite3`, separate from the checkout and
Python .agent_os. Renderer and Python get no connection or SQL surface.

Native `node:sqlite` is provided by pinned Electron 45.0.0 / embedded Node 24.22.0;
actual Windows Main observed SQLite **3.53.4**. No external server or npm native
database ABI rebuild is needed. Host Node requirement is now **24+**, matching
the chosen built-in APIs; tested host remains 25.9.0 / npm 11.12.1. The only new
direct dev dependency is **esbuild 0.25.12**, already present transitively and
installed/pinned offline for isolated test peers; lockfile is retained. npm
reported zero vulnerabilities during that install; no fresh independent audit
or global tool installation is claimed.

Private backup/restore uses the native SQLite online backup API, not a copy of
the .db file while ignoring WAL. New targets are exclusively reserved and may
not overwrite an existing file. Restore validates source and resulting database
and restores only to a new target, preserving the original. Failed targets remain
available for inspection; no automatic user-data deletion occurs. The actual
WAL test disables autocheckpoint, commits a message with WAL present, backs up,
restores and verifies the original receipt and message. The same path also runs
inside actual Windows Electron Main. See the [Node SQLite API](https://nodejs.org/download/release/v24.8.0/docs/api/sqlite.html)
and [SQLite online backup documentation](https://www.sqlite.org/backup.html).

## T1–T6 implementation and actual scope

| Transaction | Implemented and verified behavior |
|---|---|
| T1 | Atomically creates first conversation/user message/turn/original receipt, or appends. Exact canonical input includes project/workspace, draft/conversation, text and model. Same ID returns immutable original acceptance across restart, even when later model availability changes. Changed operation/input/scope fails. New messages require trusted workspace and exact model validation. Commit failure returns no persisted success or hint. |
| T2 | Main-minted unpredictable immutable proposal, 15-minute TTL, same conversation/project/canonical key/exact goal. BEGIN IMMEDIATE consumes once with task, original admission snapshot and slot/queue. Exactly one active reservation plus at most 20 queued; the 21st queued request leaves its proposal available. Queued tasks get no writer lease. No Python launch exists. |
| T3 | FIFO eligible reservation, atomic slot+lease, queued never-started cancel without Python event, active cancellation request only, idempotent repeats. Startup blocks suspect leases and marks tasks needs_reconciliation; issued attempts become unknown. No timer/PID-based release. Trusted cleanup proof must establish stopped child, stopped descendants and safe workspace; release is atomic and records a closed verified cleanup reason in cleanup_state plus updated_at. Engine outcome and sticky stream uncertainty remain separate. |
| T4 | Exact IIS-01 event schemas and trusted coding-session/task/workspace proof; immutable committed frame and deterministic SHA-256 of its canonical payload. Exact dedup is a no-op with no second hint. Conflicts persist a sticky incident without overwrite; gaps retain sparse evidence and compute complete_through separately from max_seen. Terminal outcome alone keeps cleanup blocked. TaskEventCommitted/TaskStateChanged hooks run only after COMMIT; failed commits produce no trusted notification. |
| T5 | Main-validated model/provider/session attempt identity, same-turn retry lineage, immutable attempt metadata and final states. No implicit retry or provider call. Grounded answer, accepted source-linked derived summaries and non-executable proposal are atomic. Summary creation requires trusted context-pressure evidence. Exact same-conversation user approval grammar (English or Arabic explicit approval) is required for approved_decisions; ambiguous/model/foreign evidence fails. Original messages are immutable; unapproved decision candidates are discarded under C-02-C01. |
| T6 | 15-minute pending challenges bound to project/canonical workspace/actual provider key/class. Explicit approve/deny/revoke and original receipts are transactional. Wrong provider/class/project, forged or expired challenge fails; denial creates no grant. Revocation affects future releases and cannot be undone by replaying the old successful snapshot. No source transmission or universal LLM gate exists. |

Main-only policy hooks deny by default. Fixture proof references are not production
capabilities; a future trusted resolver must verify the complete relevant evidence.
Synthetic policy implementations live under tests only. No normal production
database receives test proposals/messages/attempts/consents/events/inspection data.

Other durable services include deduplicated inspection observations and cached
counts in the same transaction; partial unknown discovery remains NULL, hashed
HMAC subjects contain no raw file path, and duplicate/conflicting evidence cannot
increment twice. Per-conversation Dock state has original-result dedup and a
private read projection; safe global display/model preferences are closed records.
Model preference cannot override the model explicitly selected on a message.
Provider display labels require a trusted registry hook; they are not invented.

Project-scoped conversation/message/task/event/consent reads are prepared and
bounded (default 40/max 100). HMAC-protected opaque cursors bind query/scope and
ordinal, expire after 15 minutes and are invalid after Main/store restart; clients
restart pagination rather than trusting stale tokens. Message/task cursors use
physical monotonic ordinals. Conversation list uses deterministic created_at/ID
offset paging, with no historical snapshot claim across concurrent writes.
C01 proposals select latest eligible 40 with truthful truncation; returned turn
projections resolve actual page user IDs and unambiguous same-turn attempt lineage.
No attempt means required null. Ambiguous or >100 attempt lineage yields null,
not an invented latest attempt. Context selection obeys inherited wire budgets,
omits whole optional entries and never turns a summary into an approval.

## Precise IPC readiness boundary

| Existing method | Production status in P3 |
|---|---|
| app.bootstrap | Real DB-backed safe startup snapshot, stored preference, truthful not_ready runtime and persisted task uncertainty; no implicit task/project/model action |
| projects.listRecent | Real bounded metadata query over registered DB rows; no filesystem scan or invented projects |
| preferences.get | Validated stored display record or explicit initial defaults |
| preferences.update | Real closed allowlist transaction; actual Electron reload/restart persistence verified |
| All other 19 Promise methods | RUNTIME_NOT_READY after validation; authoritative project resolver/selection, model registry, provider route, broker or supervisor is unavailable |

DB-backed project-scoped transaction/read primitives are independently tested;
they do not masquerade as working production conversations.read/Run Task/cancel
flows. P3 deliberately does not accept a user message without authoritative
selected-model/workspace validation. Model/consent/inspection/task UI integration
and remaining handler activation await their stages. Existing P1 controls retain
session behavior; no cosmetic or Renderer redesign was made.

The exact 23 methods, three subscriptions, five wire types/actions, root keys,
UI error registry and frozen DTO fields are unchanged. The P2 Electron regression
now expects the four actually backed methods to succeed and the other 19 to fail
closed, while preserving frame/unknown-channel/isolation tests. Its old historical
P2 evidence is not rewritten. Main validates service outputs before Preload.

One explicit local policy adjustment: the P2 implementation's 1 MiB response
budget could reject a fully legal IIS-02/C01 page (100 maximum-size messages plus
40 proposals). Main and Preload now share a finite **16 MiB** output budget,
verified with a real large SQLite page. This changes no frozen per-field/page/
wire ceiling or DTO and leaves input at 256 KiB and JSONL at 256 KiB including LF.
No frozen file was edited; no contract change proposal was needed.

## Verification and previous failures

Final results: **215 unit/UI passed across 10 files, 17 actual Windows Electron
passed, zero final failures/skips (232 total)**. Inherited P1: 26 unit/UI + 11
Electron = 37; inherited P2: 139 unit/contract + 3 Electron = 142. All 179 P1/P2
regressions pass. New P3: 42 database cases + 8 concurrent/fault cases + 3 actual
Electron cases = **53**. Build/TypeScript, formatting, frozen delivery verification
and scope/secret review pass. No planned phase-scoped P3 case remains unrun;
the explicitly deferred later integration groups are not counted as passing.

The actual final case ledger is `VERIFICATION-RESULTS.json`; schema evidence and
the exact path/hash manifest are alongside it. Windows Electron runs actual
production Main for persistent safe preferences, native schema and corrupt-file
failure; a separately compiled Main-only synthetic fixture DB validates T1–T6
and native backup without entering the production profile's ordinary DB.
All test DBs/profiles, WAL/SHM, compiled peers and raw runner output remain ignored.

Coverage includes six competing identical clicks, altered-payload race, six Run
requests for one proposal, concurrent 1+20 capacity, queued-cancel/reservation
race, real bounded SQLITE_BUSY, real SQLite max_page_count/FULL exhaustion,
injected pre-COMMIT faults, and actual isolated Node process exits before and
after COMMIT. These are real SQLite/Windows tests, not mocked SQL assertions;
they do not prove Windows descendant process teardown or engine lifecycle.
An independently generated Python golden fixture fixes event canonical UTF-8
bytes and digest. P1/P2 source/interface/UI/security suites remain included.

Earlier failures were corrected rather than marked PASS: the initial migration
generator interleaved table constraints before later column definitions (18 of
19 early cases failed); table constraints now follow all columns. Two early
concurrency cases used a worker wall clock instead of the fixture clock, expiring
synthetic proposals; an explicit shared fixture clock fixed the harness without
removing expiry checks. Final results retain zero failed/skipped cases. Existing
Zod PURE-comment annotation and runner color-environment warnings are nonfatal.
Development regression reused the already-running verified app asset server;
no unrelated process was stopped. No independent external code review is claimed.

## Deferred work, recovery and owner gate

The following remain NOT_RUN and are not P3/full-gate PASS: P4 real Python/stdio/
supervisor/OS cleanup; P5 live model registry/provider and empirical token policy;
P6 real Windows canonical alias/junction/handle/TOCTOU/source/consent handoff;
P7 actual AgentOS/cancellation/descendant/lease proof; P8 sourced Mission Control
and durable UI catch-up; P9 full IIS-08/G0–G9 and P10 packaged clean-machine gates.
DB canonical-key fixtures are not real junction-resolution proof. The C01 prompt
handoff renderer and 3000-character/model-token empirical gate remain future task
integration. P1 visual matching is DEFERRED/NOT_VERIFIED; prior manual screen-reader,
secondary-display and actual OS scaling changes remain NOT_RUN.

DatabaseSync runs in Main; the configured busy wait can block up to five seconds.
A Main-owned DB worker/performance refinement remains a later measured hardening
choice, not a claim of untested responsiveness under extreme retained history.
Native backup validates SQLite/schema/FK integrity; it does not prove hardware
durability, encryption or recovery of facts never committed. Cursor state is not
a durable entitlement. No production retention/deletion policy was added.

Recovery preserves original DB and verified backups, refuses unsupported schemas,
retains blocked leases and never auto-runs a task or LLM turn. Restore only to a
new validated target through private Main services. The accepted P2 parent is
the source rollback reference; do not reset/delete user DB/history or downgrade a
P3 database under an older app. Stop and request explicit recovery review if
unsafe migration/data loss or a true contract conflict is discovered.

Authorized effects were local offline install/build/test tools, isolated SQLite
workers/Node exit fixtures and Electron profiles, primary documentation reads,
and GitHub branch operations. No engine change/execution, paid/provider call,
arbitrary project-source read, administrator/global setting, destructive user
operation, installer or main merge occurred. Frozen delivery bytes and engine
cleanliness were rechecked before publication. P3 is ready for phase-scoped owner
review; acceptance, main merge and P4 require separate owner authorization.
