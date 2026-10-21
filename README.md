# Next Code Desktop

Dedicated Windows desktop interface for the existing
[Next Code engine](https://github.com/naoufelbvb2-arch/next-code).

P1 provides a runnable Electron + React + TypeScript interface: Home/composer,
Projects, independent Agents page, Settings, collapsible Sidebar and resizable
Terminal/Files Dock. Drafts and appearance state stay in the current session.
Sending, models, project file access and Interactive Shell are visibly unavailable.
P2 adds the exact typed `window.nextCode` facade (23 Promise methods and three
subscriptions), a trusted Main IPC boundary and closed standalone JSONL protocol
validators. Every valid backend call currently returns `RUNTIME_NOT_READY`.
There is no database, real Python supervisor, engine task or model connection.

Run locally on Windows with the tested Node.js 25.9.0 / npm 11.12.1 toolchain:

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

Verification:

```powershell
npm run typecheck
npm test
npm run build
npm run test:electron
npm run format:check
npm run verify:docs
```

Electron tests create isolated ignored profiles and capture only this app's
screenshots. Review fixtures never enter the default application. Native Windows
DPI observations and exact CSS viewport emulation are reported separately.
The approved visual reference images are still missing: text titles reserve the
brand positions; no replacement logo is claimed. Visual fidelity is NOT_VERIFIED.
**P1 has functional acceptance for P2 progression; visual signoff is deferred
until after P1–P9. P2 stops at owner review; no merge, P3 or installer is authorized.**

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
