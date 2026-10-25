# Next Code Desktop

Dedicated Windows desktop interface for the existing
[Next Code engine](https://github.com/naoufelbvb2-arch/next-code).

P1 provides a runnable Electron + React + TypeScript interface: Home/composer,
Projects, independent Agents page, Settings, collapsible Sidebar and resizable
Terminal/Files Dock. Drafts and appearance state stay in the current session.
Interactive Shell remains unavailable; Coding has the explicit P7 scope below.
P2 adds the exact typed `window.nextCode` facade (23 Promise methods and three
subscriptions), a trusted Main IPC boundary and closed standalone JSONL protocol
validators. P3 adds Main-owned SQLite with 22 tables, migrations, WAL-consistent
backup/restore and T1–T6 transactional primitives. `app.bootstrap`,
`projects.listRecent`, `preferences.get` and `preferences.update` now use real
database state. P4 adds an actual Main-owned Python process supervisor. P5 connects
the existing conversation UI to the read-only engine's `ModelGateway` and
`OpenAICompatibleProvider`, with an explicit DeepSeek Flash route. Messages commit
before network issue; validated replies commit before display. Conversation
history survives restart. P6 adds native Windows read-only file browsing/preview,
scoped Discussion discovery/read, explicit source-sharing consent and durable
inspection evidence. P6 implemented seventeen methods; its remaining six failed
closed. P7 adds the scoped task workflow described below. P8 activates the
existing Agents page with committed event replay and truthful mission views.

Run locally on Windows with Node.js 24+ (tested host: 25.9.0 / npm 11.12.1):

```powershell
npm ci --cache .cache/npm
npm run dev
```

For a local production build:

```powershell
npm run build
npm start
```

Electron downloads its pinned runtime on install into local ignored build/cache
directories. No global tool or Python setup is required to run the UI. The P2
test suite additionally uses installed Python for an isolated stdlib schema peer;
it never starts the engine. The launcher handles an
inherited `ELECTRON_RUN_AS_NODE` flag within its own process only. Close the app
normally to stop it. Session drafts are not restored after reload or restart.
P4 supports an explicitly configured Python 3.11+ executable and pinned bridge
manifest; it never chooses Python from PATH in production. See the
[P4 runtime setup](docs/implementation/P4/IMPLEMENTATION-REPORT.md#runtime-configuration)
for the local configuration format. Missing Python leaves the UI available.
An explicitly configured P5 Discussion runtime enables model selection and Send.
Native process containment is Windows x64 only in this phase and uses a pinned
local Koffi dependency, not global tools.
SQLite uses Electron's embedded Node runtime and lives at
`app.getPath('userData')/desktop-state.sqlite3`, outside project/engine state.
Invalid or newer databases fail closed and are never silently recreated. There
is no backup/SQL endpoint in Renderer; recovery APIs are private to Main.
The current local workspace already has an ignored development runtime configured.
Run `npm run dev` and explicitly choose a project directory. Open **Files** in the
Right Dock for local read-only browsing and safe text excerpts; this does not
contact a provider. Rechoose legacy P5 project folders to register the stronger
native identity; old conversations remain historical and are never rebound.
With the separately configured Discussion runtime, select **DeepSeek Flash** and
send a message. `/inspect` requests a bounded root inventory and at most two
relevant files; `/read relative/path` requests one excerpt. The first external
source request requires **Allow source sharing** on a Main-issued challenge,
then a new user message. **Revoke source sharing** stops future handoffs, but
cannot recall bytes already released. Neither source intent nor local preview
grants external consent. No paid calls or external source disclosures ran in P6.
Previously selected model preference and committed conversations persist; unsent
drafts remain session-only. The trial permits ten short requests in total, of which
two were used for verification. Requests, including uncertain failures, reserve
this shared local budget before network issue; there are no automatic retries.

For another checkout, follow the [P5 runtime setup](docs/implementation/P5/IMPLEMENTATION-REPORT.md#local-runtime-setup).
It uses a separate engine checkout, pinned isolated Python dependencies, an explicit
interpreter hash, and a Git-ignored local credential file. Credentials never enter
Renderer, IPC or SQLite. Without that setup, the interface remains usable and
Discussion stays unavailable.

Verification:

```powershell
npm run typecheck
npm test
npm run build
npm run test:electron
npm run format:check
npm run verify:docs
python -m unittest discover -s tests/python -v
```

Electron tests create isolated ignored profiles and capture only this app's
screenshots. Review fixtures never enter the default application. Native Windows
DPI observations and exact CSS viewport emulation are reported separately.
The separate `npm run test:live -- tests/live/deepseek.spec.ts` uses real credit
and requires the explicitly configured local runtime; ordinary tests never use it.
Do not rerun it as routine regression. `tests/live/restore.spec.ts` only reads an
existing isolated live ledger and verifies restart without making a provider call.
The approved visual reference images are still missing: text titles reserve the
brand positions; no replacement logo is claimed. Visual fidelity is NOT_VERIFIED.
The file broker supports Windows x64 NTFS and fails closed for unsupported native
identity/alias/reparse conditions. Strict decoding and whole-file scanning cover
eligible text up to 8 MiB; larger/uncertain/sensitive files are denied. Secret
detection has false positives and false negatives. Inspection counts prove local
enumeration or a successful local Discussion pipe handoff, not provider receipt
or complete project comprehension. Python separation is application-level, not
a Windows OS sandbox. See P6 evidence for the exact limits and unrun cases.

P7 adds exact-goal proposal cards, explicit **Run Task**, scoped task reads,
durable cancellation, real AgentOS bridge integration and verified writer cleanup.
The approved separate engine patch supplies optional lifecycle/cancellation hooks.
Actual Windows tests execute a harmless file change through the real UI, Main,
SQLite and AgentOS with an offline ModelGateway in external synthetic workspaces.
The runtime accepts only the exact tested engine/source/Git identity. No task is
replayed after restart, and uncertain writers retain their lease.

**The production DeepSeek Coding route is implemented and live verified.** Main
requires explicit private configuration, the exact tested engine, a local key,
workspace/tool scope and durable mission budget. All three original ModelGateway
profiles explicitly use official DeepSeek Flash, with no paid HTTP/schema retry
or silent fallback. The real normal-entry UI/Main/SQLite/AgentOS path fixed a
small external synthetic project and independently passed its test; restart did
not replay it. No test Gateway is selectable by production or Renderer.

That owner-authorized mission used **12 requests /31,628 tokens** and consumed its
one-task/request allowance. New Run Task admissions stay closed until renewed
owner authority and explicit local scope/budget configuration. Do not reset or
rerun the live journal. This temporary route permits pure Python functions and a
hash-pinned verification command in the synthetic project; it is not a general
Windows filesystem sandbox or permission to code in real-user projects.

**P1–P5 are accepted; P6 is conditionally accepted with G6 PARTIAL (P1 visual
signoff deferred). P7's minimum real-engine G4 evidence is verified offline and
with one real paid task on Windows and is now accepted within that proved scope.
Full system gates are not self-certified. Engine remains read-only. No further
paid call, main merge, P9 or installer is authorized.**

P8 **Agents / Mission Control** reads scoped task history, a Mission Header,
sequence-ordered Timeline and selectable Worker Inspector through the existing
closed API. It subscribes before reading, uses four 40-event pages per iteration,
rewinds for late gaps, bounds hint/cache/display memory, and reconstructs history
after reload without execution. Actual supported tool registration observes
confirmed patch effects and real pinned-test return codes; diagnostics and model
claims never become verified events. Outcome, event integrity and unexposed
Windows cleanup/liveness remain distinct. Agents Dock stays hidden on entry.

The existing engine has **no supported phase/worker observer hooks**. No worker
is invented: genuine task/tool events can appear, while the worker panel is empty
when no trusted worker events exist. Full P8/G5 acceptance is **blocked pending
separate engine instrumentation approval**. The existing TaskView also omits the
exact historical approved goal; only an in-session Main proposal/admission can
provide it today, otherwise the UI explicitly says unavailable. CP-001 proposes
a narrow future projection change without implementing it. Neither P8 nor its
offline fixtures reset or spend the consumed paid mission allowance.
The same draft records that persisted per-conversation Dock state has no read
projection: reopened chats with unknown policy never auto-open or overwrite it.
An independently observed native exit-signal timing issue and its preserved
engine regression failures are documented for owner review; safe cleanup is not
inferred from cooperative cancellation or displayed as verified.

- [P7 scoped owner acceptance](docs/implementation/P7/OWNER-ACCEPTANCE.md)
- [P8 implementation and limits](docs/implementation/P8/IMPLEMENTATION-REPORT.md)
- [P8 engine instrumentation request](docs/implementation/P8/ENGINE-INSTRUMENTATION-REQUEST.md)
- [P8 verification register](docs/implementation/P8/VERIFICATION-RESULTS.json)
- [CP-001 historical goal projection — DRAFT](docs/changes/proposed/CP-001-P8-TASK-GOAL-PROJECTION.md)

- [P7 implementation and actual disposition](docs/implementation/P7/IMPLEMENTATION-REPORT.md)
- [P7 engine compatibility gate](docs/implementation/P7/ENGINE-COMPATIBILITY-REPORT.md)
- [Approved separate engine change](docs/implementation/P7/ENGINE-CHANGE-REQUEST.md)
- [P7 verification results](docs/implementation/P7/VERIFICATION-RESULTS.json)

- [P6 implementation report](docs/implementation/P6/IMPLEMENTATION-REPORT.md)
- [P6 Windows security evidence](docs/implementation/P6/WINDOWS-SECURITY-EVIDENCE.md)
- [P6 actual verification and 56-case disposition](docs/implementation/P6/VERIFICATION-RESULTS.json)
- [P5 official owner acceptance](docs/implementation/P5/OWNER-ACCEPTANCE.md)

- [P5 implementation report and runtime setup](docs/implementation/P5/IMPLEMENTATION-REPORT.md)
- [P5 actual verification results and 52-case mapping](docs/implementation/P5/VERIFICATION-RESULTS.json)
- [Actual restored DeepSeek conversation](docs/implementation/P5/screenshots/live-discussion.png)
- [P5 scope and authorization](docs/implementation/P5/IMPLEMENTATION-PLAN.md)
- [P4 official owner acceptance](docs/implementation/P4/OWNER-ACCEPTANCE.md)

- [P4 implementation report](docs/implementation/P4/IMPLEMENTATION-REPORT.md)
- [P4 actual verification results](docs/implementation/P4/VERIFICATION-RESULTS.json)
- [P4 scope and authorization](docs/implementation/P4/IMPLEMENTATION-PLAN.md)
- [P3 official owner acceptance](docs/implementation/P3/OWNER-ACCEPTANCE.md)

- [P3 implementation report](docs/implementation/P3/IMPLEMENTATION-REPORT.md)
- [P3 verification results](docs/implementation/P3/VERIFICATION-RESULTS.json)
- [Exact 22-table SQLite evidence](docs/implementation/P3/SCHEMA-EVIDENCE.json)
- [P3 scope and authorization](docs/implementation/P3/IMPLEMENTATION-PLAN.md)
- [P2 owner acceptance](docs/implementation/P2/OWNER-ACCEPTANCE.md)

- [P2 implementation report](docs/implementation/P2/IMPLEMENTATION-REPORT.md)
- [P2 actual verification results](docs/implementation/P2/VERIFICATION-RESULTS.json)
- [P2 scope and authorization](docs/implementation/P2/IMPLEMENTATION-PLAN.md)
- [P1 owner acceptance](docs/implementation/P1/OWNER-ACCEPTANCE.md)

- [P1 implementation report](docs/implementation/P1/IMPLEMENTATION-REPORT.md)
- [P1 scope and authorization](docs/implementation/P1/IMPLEMENTATION-PLAN.md)
- [Application screenshots](docs/implementation/P1/screenshots/)

- [Engineering handoff](docs/engineering/README-CODEX-HANDOFF.md)
- [Exact-byte delivery manifest](docs/engineering/SHA256-DELIVERY-MANIFEST.json)
- [Frozen staged implementation plan](docs/engineering/01-normative/NCD-04-IMPLEMENTATION-AND-VERIFICATION-PLAN-v1.0-FROZEN.md)
- [Owner-ratified provenance closure](docs/engineering/02-authority-records/NCD-04-P0-H01-C01-OWNER-RATIFICATION-RECORD.md)
- [Persistent agent instructions](AGENTS.md)

The historical startup guidance and engineering bytes remain unchanged. Later
stage-specific owner authorizations control implementation; documentary freeze
alone grants no permission for future integrations or engine changes.
