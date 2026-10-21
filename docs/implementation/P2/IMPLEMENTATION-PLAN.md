# P2 implementation scope — owner authorized

Authority: the separate P1 ACCEPTANCE & P2 IMPLEMENTATION AUTHORIZATION;
NCD-04 §5.3, NCD-02, C-03, IIS-01 §§16–18, IIS-02 and IIS-02-C01.
Starting SHA: `eec8781960d168af1a9c41ad4115201bab032b3d`, verified clean locally
and matching the remote P1 branch. Work branch: `feature/p2-ipc-protocol`.
P1 functional progression is accepted; aesthetic work remains deferred.

Implement the literal 23-method / 3-subscription API, exact frozen channel names,
strict runtime schemas and typed success/error DTOs, including required C01
proposal/turn read fields. Preload exports no transport, channel selector, Node,
environment, process, database or arbitrary filesystem operation.

Main rechecks actual window/webContents/current main frame/document per call,
strictly validates a single input, bounds work and returns official typed unready
errors for every unimplemented P3–P8 operation. Subscription control uses only
the three existing bidirectional push channels. Scoped subscriptions require
Main authorization; unavailable task/conversation stores deny by default. No
fake events are emitted. Unsubscribe/teardown only removes listeners.

Implement private, unwired JSONL framing/serialization, five-key schemas, strict
UTF-8/duplicate-key/number/Unicode checks, bounded partial lines and queues, fresh
per-connection identity, READY/role/direction/correlation/task/parent validation.
Task acceptance/cancel acknowledgement/terminal observation remain separate from
durability, execution proof, process cleanup or writer release. Isolated fixture
peers may validate bytes; no real supervisor or engine is launched.

Allowed paths: `contracts/`, `electron/main/`, `electron/preload/`, Renderer type
declarations only as needed, existing build/type/test configs, pinned package and
lockfile, tests/fixtures, P1 acceptance record, P2 docs, README and AGENTS authority.
One pinned runtime schema dependency (Zod 4.6.7) is used and bundled into sandboxed
Preload. No new public operations, tables, wire verbs or aesthetic changes.

Verification: closed registry and all methods; strict inputs, limits and official
errors; frame/sender spoofing and unknown channels; C01 DTO boundaries; callback
isolation and safe teardown; positive/negative/partial/UTF-8/overflow/replay/role/
correlation wire fixtures; isolated peer parity; actual Electron boundary tests;
P1 unit/UI and Electron regressions; typecheck/build; frozen delivery hashes;
public-release review. Record actual counts and all deferred integration gates.

IIS-02's schematic DTO fields not exhaustively named in the contract receive
closed local display-only representations, documented in the report. Subscription
registration tokens/control framing are private transport details using existing
channels, not a new API. No P3 persistence/idempotency/query result or P4 process
safety is claimed by the P2 validators. Stop at P2 review; no main merge or P3.

Operations: project-local npm package metadata/install, local build/test tools,
Windows Electron with isolated profiles, an isolated stdlib Python schema peer,
GitHub read/branch commit/push. No model calls, secret access, private project
data, Administrator installation, destructive fault injection or engine launch.
Success requires actual scoped checks and an honest deferred-gate ledger. Abort
the affected operation on a frozen contract conflict, unexpected repository
history, secret exposure or boundary escape; preserve evidence and raise the
required change proposal or issue rather than changing the frozen baseline.
Rollback reference is the accepted P1 SHA; no user-data migration or cleanup is
needed. Deliver reviewed paths/hashes, report, results and branch provenance.
