# Next Code Desktop

Dedicated Windows desktop interface for the existing
[Next Code engine](https://github.com/naoufelbvb2-arch/next-code).

P1 provides a runnable Electron + React + TypeScript interface: Home/composer,
Projects, independent Agents page, Settings, collapsible Sidebar and resizable
Terminal/Files Dock. Drafts and appearance state stay in the current session.
Project file access, coding and Interactive Shell remain unavailable.
P2 adds the exact typed `window.nextCode` facade (23 Promise methods and three
subscriptions), a trusted Main IPC boundary and closed standalone JSONL protocol
validators. P3 adds Main-owned SQLite with 22 tables, migrations, WAL-consistent
backup/restore and T1–T6 transactional primitives. `app.bootstrap`,
`projects.listRecent`, `preferences.get` and `preferences.update` now use real
database state. P4 adds an actual Main-owned Python process supervisor. P5 connects
the existing conversation UI to the read-only engine's `ModelGateway` and
`OpenAICompatibleProvider`, with an explicit DeepSeek Flash route. Messages commit
before network issue; validated replies commit before display. Conversation
history survives restart. Twelve existing methods now have trusted implementations;
the remaining eleven fail closed. No coding task, worker or project-source broker
is enabled. Coding simulation is confined to isolated tests.

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
Run `npm run dev`, choose a discussion project directory (root identity only; files
stay unavailable), explicitly select **DeepSeek Flash**, and send a message.
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
**P1–P4 are owner accepted (P1 visual signoff deferred). P5 stops at owner review;
no main merge, P6, coding task or installer is authorized.**

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
