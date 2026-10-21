# P2 — Typed IPC & Closed JSONL Protocol

Status: **IMPLEMENTED — PHASE-SCOPED VERIFICATION PASS — OWNER REVIEW PENDING**.
Date: 2026-10-21, America/New_York. This is the NCD-04 §5.3 subset of G1,
not a complete IIS-08 gate or a claim that backend services are implemented.

## Authority and provenance

The owner's separate P1 ACCEPTANCE & P2 IMPLEMENTATION AUTHORIZATION accepts
P1's demonstrated functional scope and authorizes P2 implementation, local
dependencies/tests/fixes, commits and feature-branch publication. The exact
accepted P1 starting SHA `eec8781960d168af1a9c41ad4115201bab032b3d` was clean
locally and matched remote `feature/p1-desktop-foundation` before creation of
`feature/p2-ipc-protocol`. Main remains the documentary branch. No merge or P3
transition is authorized. Final commit provenance is in the publication receipt
and final response, rather than a self-referential manifest hash.

`../P1/OWNER-ACCEPTANCE.md` records **FUNCTIONAL ACCEPTANCE FOR P2 PROGRESSION —
VISUAL SIGNOFF DEFERRED**. No colors, icons, layouts, logo or cosmetic UI changed.
P1 historical reports/screenshots remain historical evidence; rerun screenshots
now go to ignored `test-results/`. The frozen engineering bytes were not edited.

## Implemented files and behavior

| Files | Actual responsibility |
|---|---|
| `contracts/common.ts` | Strict JSON-safe values, bounded traversal/serialized work, Unicode code-point limits, IDs, timestamps, syntactic paths |
| `contracts/ipc.ts`, `ipc-dtos.ts` | Literal 23-method and three-push channel registry, typed Promise/subscription surface, strict DTOs, 17 official UI errors, required C01 projections |
| `contracts/wire-schema.ts` | Five outer types, five actions, exact five root keys, typed request/result/event/error schemas, nine frozen event subtypes and 16 wire errors |
| `contracts/jsonl.ts` | Strict UTF-8/LF decoder, serializer, duplicate-key/integer-lexeme parser, bounded queues, unwired connection role/ID/correlation/lifecycle validator |
| `electron/main/ipc.ts`, `ipc-boundary.ts`, `index.ts` | Register only known channels, bind actual app windows, recheck webContents/current main frame/document per invocation, input validation, scoped subscription control/teardown |
| `electron/preload/index.ts`, `facade.ts`; `renderer/next-code.d.ts` | Context-isolated frozen facade, fixed argument adapters, validated responses/callback data, idempotent unsubscribe; Renderer gets no generic transport or Node authority |
| `tests/unit/{ipc,jsonl,python-parity}.test.ts`, `tests/fixtures/` | Synthetic fixtures, direct frozen §18 examples, adversarial inputs, independent stdlib Python schema peer; no production fixture imports |
| `tests/electron/ipc.spec.ts` | Actual Windows Electron facade/IPC, unauthorized window/foreign frame, typed callback filtering, unsubscribe/reload |
| P1 Electron regression specs | Restricted facade expectation replaces former empty-preload expectation; isolated output and non-disruptive development-server reuse |
| `electron.vite.config.ts`, `tsconfig.json`, package files | Include shared contracts and bundle Zod into sandboxed CommonJS Preload; pinned dependency/lockfile |
| README, AGENTS, P1 acceptance, P2 docs | Current authority, run instructions, change manifest and observed evidence |

All 23 valid Main handlers return the official bounded `RUNTIME_NOT_READY`
failure. Malformed inputs fail before service dispatch; untrusted callers get
`NOT_AUTHORIZED`. No successful picker, preference write, accepted message,
proposal admission, cancellation, persisted row or task is synthesized. P1's
session-only UI remains functional and future controls remain visibly disabled.
Readiness errors prove boundary behavior only, not backend feature success.

Main binds each app-created window before loading its entry document. Every
invocation checks actual sender identity, current main-frame identity, detached
state and exact allowed document. Navigation drops subscriptions; destruction
removes sender registration. Three frozen push channels carry private subscribe/
unsubscribe controls in the opposite direction. Main rechecks scope and trust
before each delivery. Task/conversation authorization defaults to denied because
their authoritative stores do not yet exist. No production publisher emits any
fixture or speculative event. Runtime listeners may register without a fake
initial status. Unsubscribe is idempotent and never cancels a task.

## Contract conformance and local representation choices

IIS-02: literal dotted channels, exactly 23 Promise methods and three named typed
subscriptions, one structured input (null for no arguments), closed arguments,
`IpcResult<T>` and official errors. No arbitrary invoke/send/on, raw Electron event,
Node/process/env/OS/SQL/filesystem/Python handle crosses Preload. Opaque IDs are
filters, never capabilities. Durable mutation receipts/idempotency are P3 work;
P2 does not key them to ephemeral windows or pretend to persist them.

IIS-02-C01: successful-read schema requires `availableProposals` (max 40),
`availableProposalsTruncated` and `discussionTurns`, including required nullable
`lastErrorCode`/`lastAttempt`. Schema fixtures reject foreign proposal/turn scope,
unknown fields and missing required nulls. There is no retry API. Real SQLite
snapshot selection, TTL/consumed checks, ordering, lineage and restart behavior
remain NOT_RUN until the corresponding persistence/model stages.

IIS-01 §§16–18: strict UTF-8, LF including byte budget, CRLF/BOM/chatter rejection,
duplicate keys at every nesting level, valid Unicode, exact integer lexemes,
cryptographically random IDs, shared bidirectional per-connection ID history,
READY once with role/deadline, role/direction and active correlation checks.
Broker requests bind an active parent discussion ID and a trusted authorization
callback; execute binds trusted task/conversation/workspace and explicit admission
callback, both deny by default. Parsed IDs/`source:agent_os` do not establish real
engine provenance. Task acceptance, started event, cancel registration, terminal
observation, database durability, process cleanup and writer release stay separate.
Exact semantic duplicate events are no-ops with fresh outer IDs; conflicts fail
closed and gaps remain conservatively incomplete. No automatic task replay exists.
Failed native outcomes preserve their actual phase; completed events require both
true success and COMPLETED. No engine code is copied or modified.

The schemas choose closed display representations only where IIS-02 names a DTO
without fixing all internal literals. Task summary/view use IDs, a lower-case
state enum and nullable typed outcome; model selection uses `{modelId}`; message
pages use IDs, role, text, delivery state and offset timestamps. Dock tab literals
match visible names. Safe preferences are version 1, saved width 320–480,
sidebarCollapsed, optional reducedMotion and ambientLight. Runtime status uses
not_ready/ready/unavailable/unknown. Notification wrappers carry typed scope IDs
and an opaque renderer-lifetime subscription token. These are internal
representations within existing methods/channels, not additional operations,
persisted schema, runtime evidence or changes to frozen documents. Future services
must populate only authoritative data and repeat authorization on actual access.

Frozen limits tested: record/partial buffer 262,144 bytes including LF, partial
15 s, READY 30 s, context 96 KiB/20 messages/10 summaries/20 decisions, user text
16,384 and answer 32,768 Unicode points, discover depth 1–3/page ≤100, read ≤200
lines/16,384 points, decimal timestamp strings, general inflight ≤16, coding
execute 1 plus reserved cancel 1, queues 256 records/8 MiB and saturation 30 s.
Injected-clock checks enforce broker 30 s and discussion 300 s deadlines without
launching workers. Queue refusal returns pressure to the caller; it is never a
claim that a rejected record was delivered or persisted.

Additional finite local policies: JSON traversal depth 32/nodes 20,000; IPC input
256 KiB, response 1 MiB, subscription-control 1 KiB; 64 live subscriptions per
Renderer; 65,536 seen message IDs before connection retirement; at most 256
frames returned from a single decoder push. Callers must slice/pause input at
bounded pressure; exceeding a batch/queue limit fails closed rather than losing
critical facts. Diagnostic segments ≤16 KiB. IPC pages max 100; default 40 is a
future query default, with no successful query synthesized in P2. Candidate and
source-ID arrays cap 100; bounded strings use 2,048-point safe summaries,
1,024-point local drive paths, 128-point checkpoint/cursor/model labels and signed
64-bit nonnegative nanosecond magnitudes. Syntactic path guards support the
local-drive Windows scope; they are not canonicalization, containment, sensitive
file screening, cursor authorization or a File Broker. Parser/schema violations
retire the affected simulator connection. Full pipe backpressure, process cleanup,
cancel escalation, DB-event queues and lease reconciliation require P3/P4/P7/P8.

## Actual verification

See `VERIFICATION-RESULTS.json` for per-case results and fixture hashes.

- Unit/UI: **165 passed, 0 failed, 0 skipped** across eight files. P2 contributes
  139 (58 IPC, 80 JSONL and one independent Python parity test); unchanged P1
  contributes 26. The parity test checks every canonical/negative byte vector
  against TypeScript and an isolated Python subprocess.
- Windows Electron: **14 passed, 0 failed, 0 skipped**: 11 P1 regressions and three
  P2 integration cases. All 23 methods traverse the real contextBridge/Main IPC.
  A test-only malicious Preload in an unregistered window checks actual rejected
  IPC and unknown channels. A registered production handler is additionally
  invoked with real Electron trusted webContents paired with a real foreign
  subframe to exercise frame identity; this is explicitly a handler probe, not
  a claim of a hostile OS containment test. Synthetic delivery probes test only
  typed subscriptions and never enter a ledger.
- `npm run build` (including TypeScript), `npm run format:check`, delivery-byte
  verification and scoped public-release review passed. npm install added pinned
  Zod 4.6.7 locally with lockfile, audit reported zero vulnerabilities at install.
  Existing Electron/React/Vite/TS pins and Node range were retained.

The first Electron run had 13 passes and one development harness failure:
port 5173 was already serving this app. No unrelated process was stopped. The
harness now verifies the served entry source matches this checkout and reuses
that server, otherwise starts its own server; bounded startup stderr helps
diagnosis. The successful rerun used the existing verified server. This proves
development asset/UI/CSP behavior; it is not a fresh server startup observation.
Development startup had already been proven in P1. No production security rule
was relaxed. Builds emit two third-party Zod PURE-comment annotation warnings;
they do not cause build or runtime failures.

## Limits, deferred checks and disposition

P2 is ready for owner review within NCD-04 §5.3. No known failing P2 test remains.
There is no claim of full G1 or later integration gate PASS. The following six
groups remain **NOT_RUN**, with independent later authority/dependencies:

1. P3 SQLite/T1–T6, real scope projections, durable mutation dedup and C01 reload.
2. P4 real supervisor/stdio, process restart/crash/pipe pressure and OS cleanup.
3. P5 real provider routing/calls, model registry and live discussion/retry policy.
4. P6 actual Windows handle/TOCTOU/reparse/secret/consent File Broker checks.
5. P7/P8 real AgentOS lifecycle, cancellation/lease safety, grounded events/replay.
6. P9 integrated IIS-08/G0–G9 and P10 packaged/clean-machine evidence.

P1 visual fidelity stays **DEFERRED/NOT_VERIFIED**; manual screen-reader, secondary
monitor and actual OS scaling changes stay **NOT_RUN**. No aesthetic signoff or
past unrun manual check becomes PASS. Independent external code review was not
performed. Python fixture parity is schema evidence, not the real bridge or
engine. No database, provider, project-file read, task or installer was added.

Network activity was limited to authorized dependency metadata/install and GitHub
repository verification/publication. Child launches were local build/test tools,
isolated Windows Electron profiles and the stdlib-only schema peer. No paid LLM,
credential dump, private project exposure, Administrator install, global setting,
engine change or destructive filesystem operation occurred. A previous automatic
approval-review usage limit interrupted an action before execution; after the
owner's continue instruction the scoped retry succeeded. No approval remains
pending.

Review/recovery: keep P1 SHA as the accepted rollback baseline and review the
feature branch diff/manifest. No data migration or destructive rollback is needed.
Do not merge, reset user files, force push or start P3. Stop at P2 owner acceptance.
