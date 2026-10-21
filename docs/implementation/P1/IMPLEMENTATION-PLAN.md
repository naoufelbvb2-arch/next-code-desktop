# P1 scope packet — authorized 2026-10-21; acceptance pending

Prepared 2026-10-21. Owner explicitly approved this scope in the separate
**P1 IMPLEMENTATION AUTHORIZATION**. Approved branch:
`feature/p1-desktop-foundation`. Repository:
`naoufelbvb2-arch/next-code-desktop`. Current immutable import baseline:
`af682b74375a0b5827aa1fca0ff0815434803650`. The owner selected starting commit
`b1c52948ebd1704533b2e106a5290efd4656c0b2`, verified against the remote before
branch creation. No bootstrap or P1 branch merge is authorized. The proposal
below is retained as the scope baseline; see IMPLEMENTATION-REPORT.md for actual
implementation, dependency refinements, observed tests and remaining limitations.

Authority: NCD-04 §5.2, NCD-00, NCD-00-C01, NCD-01 §§2–13, NCD-02 A-01–A-06.
This plan selects bounded implementation details; it changes no frozen contract.

## Proposed files and dependencies

```text
package.json, package-lock.json, electron.vite.config.ts, tsconfig*.json
electron/main/index.ts              window lifecycle and local UI loading
electron/main/window-security.ts    navigation/window/permission restrictions
electron/preload/index.ts           isolated scaffold, no privileged public API yet
renderer/index.html, main.tsx, App.tsx
renderer/components/               Sidebar, Composer, RightDock, empty states
renderer/pages/                    Home/Chat, Projects, Agents, Settings
renderer/state/                    route, draft and Dock presentation state
renderer/styles/                   theme tokens, responsive fit, motion
renderer/assets/branding/          only approved/reviewed visual assets
tests/unit/                        fit and Dock state transitions
tests/ui/                          component interactions and accessibility
tests/electron/                    real Windows startup/security/UI checks
tests/fixtures/                    isolated, explicitly labelled review data
docs/implementation/P1/            change manifest, test matrix, evidence, report
```

Allowed changes after approval: those paths, root README/run instructions,
stage-relevant ignore/build config and the authorization-status paragraph in
AGENTS.md. Imported engineering bytes and the original engine are outside scope.
Do not create P2–P9 service scaffolding just to populate future directories.

Runtime packages: `react`, `react-dom`. Development/build packages: `electron`,
`electron-vite`, `vite`, `@vitejs/plugin-react`, `typescript`, `@types/node`,
`@types/react`, `@types/react-dom`. Test packages: `vitest`, `jsdom`,
`@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`,
`@playwright/test` and `axe-core` for scoped UI/accessibility checks.
Use CSS and React state/context; no UI framework, router library, ORM, Python
package, PTY or SQLite driver is needed for P1. Verify exact compatible versions
from official metadata after approval, pin them without ranges and commit the
lockfile before evidence runs. Do not claim selected versions are installed now.

The proposed build tool separates Main/Preload/Renderer in one configuration;
see [electron-vite's official guide](https://electron-vite.org/guide/).
React documents [Vite with TypeScript](https://react.dev/learn/build-a-react-app-from-scratch)
for constrained client applications. Follow the
[Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security).
Playwright's [Electron automation support](https://playwright.dev/docs/api/class-electron)
is experimental: verify it against the selected Electron version and retain
actual manual Windows evidence for unsupported automation. These are proposals,
not a claim that a compatible build has run.

## Implementation sequence and visible behavior

1. Create the pinned Electron/React/TS project and reproducible `dev`, `typecheck`,
   `build`, unit/UI and Electron-test commands. Main creates a normal Windows
   window and maximizes it on first startup, with standard restore/minimize
   controls. Enforce `contextIsolation: true`, `sandbox: true`,
   `nodeIntegration: false`, web security/CSP and denied unexpected navigation,
   windows and permissions. Preload exposes no generic invoke, filesystem or
   process access. Only the development asset server is permitted in dev mode;
   it is not a Python/engine HTTP bridge.
2. Implement the frozen Premium Balanced palette (`#090D18`, `#172238`,
   `#568DFA`, `#8B6BE9`, `#DCE4F0` starting tokens), dotted grid, restrained
   blue/violet waves, glass hierarchy, readable logs and reduced motion. No
   large global top bar or invented branding. The two NCD-01 reference images
   are missing from the delivery: request the approved assets before fidelity
   sign-off. Any derived application logo needs the prescribed visual review.
3. Build Sidebar: approved logo area, New Conversation, recent history empty
   state, Projects, independent Agents page and Settings, with expand/64px rail.
   New Conversation opens an unsent draft; clicking it creates no durable row.
   Drafts and layout state survive route changes within the current app session.
4. Home has hero/composer and hidden Dock by default. The in-composer model
   control truthfully says unavailable until a real registry exists. Send,
   Run Task, native project registration and live backend controls remain
   disabled with a clear reason. Typing or failed/unavailable sending preserves
   the draft and Home state; no synthetic accepted message or Work transition.
   Work conversation/result components can be reviewed only in an isolated
   labelled fixture harness; real durable acknowledgement waits for P3/P5.
5. Projects shows current/known project empty or unavailable states, not a
   fabricated project list. Settings handles session-local display/motion
   preferences and honest unavailable integration status. Agents has Mission
   Header, non-fixed-order Timeline and Inspector empty/unavailable states;
   no fake active agents, percentages or task completions.
6. Build the shared resizable Dock with Terminal/Files, Agent Logs read-only
   empty state and disabled Interactive Shell. Keep file-preview UI inside Files;
   only isolated fixtures may exercise preview before P6. Implement the exact
   NCD-01 §7.1 per-conversation vs per-visit state matrix. Home and every Agents
   entry start closed; Chat restores its own state; Projects opens Files only
   after an explicit open. Manual hide wins; navigation never triggers work.
   Apply 256px Sidebar / temporary 64px rail, 360px preferred Dock clamped to
   320–480px, 16px gaps and a protected >=580px center. Native minimum dimensions
   must be chosen from actual Windows/DPI QA, not assumed from CSS targets.
7. Run the scoped checks below, record actual outputs and screenshots, report
   deviations and final SHAs, then push the feature branch for owner review.
   Stop before merging or starting P2.

## Proposed tests and acceptance

| Evidence | Scope and required observed outcome |
|---|---|
| Build | Fresh lockfile-based install, typecheck and build succeed; local Electron launch is reproducible without Python, credentials or inference access |
| Window/security | Real Windows maximized startup and restore; Renderer cannot access Node/raw IPC/process/filesystem; unexpected navigation/popups/permissions denied |
| NAV/Sidebar | New Conversation and all pages reachable by keyboard; no empty persisted conversation; route/Dock changes have no execution side effects |
| Drafts | Typing alone stays Home; unavailable/failed send preserves editable text; no fabricated accepted message or claimed task |
| Dock matrix | NCD-01 §7.1 transitions, explicit hide/reopen, Chat restoration, Agents entry reset and preference-vs-temporary-fit separation |
| Responsive | 1000×600, 1100×700, 1366×768, 1920×1080 CSS; at 1100px a 360px Dock uses the rail; no composer overlap; native Windows 100/125/150% scaling, secondary display if available |
| Truth and access | No selectable fictitious model, fake events or enabled Shell; labels/focus/contrast/reduced motion and basic screen-reader paths checked |
| Visual | Screenshot review against NCD-01 and supplied logo/layout assets, with logged refinements of initial design tokens |
| Isolation | Review fixtures excluded from the default production entry and any future production ledger; no engine/provider/file calls from UI route changes |

Map NCD-01 VIS-01–17 to actual **P1 subset** evidence. VIS-01 fidelity is blocked
until reference assets/review are available. Live NAV-01–07 execution guarantees,
durable message acknowledgement in VIS-16, real broker preview in VIS-17 and
restart restoration in VIS-14 remain NOT_RUN until their actual dependencies.
Presentation fixtures may verify state logic only; they do not pass live
integration requirements. Full IIS-08 G0–G9 and release acceptance are NOT_RUN.

Completion means a runnable secure shell, truthful disabled boundaries, passing
scoped UI/layout/a11y checks and reviewable Windows evidence, with every missing
prerequisite disclosed. Missing branding evidence blocks full visual acceptance;
it is not silently replaced by a new logo. Stop on any trust-boundary regression,
unexplained source changes, fixture leakage or frozen-contract conflict.

## Deferred boundaries and requested authority

| Stage | Deliberately deferred |
|---|---|
| P2 | Exact 23 methods / 3 subscriptions, validated IPC and closed JSONL schemas |
| P3 | Main-owned SQLite, exact 22 tables, durable messages/history/preferences |
| P4 | Python child lifecycle and bridge/supervisor |
| P5 | Real discussion/model registry/routes/context/consent; no source release |
| P6 | Actual project registration/containment, discovery and read-only preview |
| P7 | Proposal approval, real AgentOS coding, admission/queue/cancel/cleanup |
| P8 | Authentic worker events, committed replay and live Mission Control |
| P9 | Full integration/security/fault/E2E development acceptance |
| P10 | Deferred distribution, installer and bundled Python |

Request **P1 implementation only**, with the named project-local npm dependency
downloads (including Electron/test binaries), file edits, local development
server, actual Electron launch, isolated tests, screenshots and feature-branch
commits/pushes. No paid API, provider credentials, real user project access,
engine modifications, global/Administrator installation, installer publication,
merge or next-stage transition is included. Keep stage tests in isolated profiles;
stop and report on failures without deleting user data or rewriting history.

The owner subsequently authorized P1 at the specified starting SHA. Stage
acceptance, merge and transition to P2 remain separate pending decisions.
