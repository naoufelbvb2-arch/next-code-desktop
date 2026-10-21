# P1 — Desktop Foundation implementation report

Date: **2026-10-21, America/New_York**. Executor: Codex. Status:
**IMPLEMENTED / SCOPED CHECKS PASS / OWNER REVIEW PENDING**.
This is P1 evidence, not acceptance of P2–P9 or full IIS-08 gates.

## Authorization and repository

The owner's separate **P1 IMPLEMENTATION AUTHORIZATION** approved the scope
packet at `docs/implementation/P1/IMPLEMENTATION-PLAN.md`, project-local installs,
actual Electron launch, stage tests/fixes and feature-branch commits/pushes.
The exact starting SHA **`b1c52948ebd1704533b2e106a5290efd4656c0b2`** was checked
against remote `docs/bootstrap-preparation` before creating
**`feature/p1-desktop-foundation`**. No P1 branch existed remotely at that check.
Origin remains `https://github.com/naoufelbvb2-arch/next-code-desktop.git`.

The implementation commit and publication receipt are recorded separately in
`COMMIT-RECEIPT.md` after the commit exists. No self-referential SHA is invented.
No bootstrap/P1 merge into `main`, stage acceptance or P2 transition is authorized.

## Implemented behavior

- An actual Electron window opens maximized with native Windows controls.
  The minimum is derived from the tested 1000×600 CSS floor, measured native
  chrome and the current display's usable area, rather than guessed pixel insets.
- React/TypeScript Home/composer, Projects, independent Agents/Mission Control,
  Settings and shared Sidebar/Right Dock run in the real application.
- NCD-01 initial palette, glass hierarchy, quiet dotted grid, slow decorative
  blue/violet background, protected-center dimensions and reduced-motion rules
  are implemented. The title text reserves branding positions; it is **not** a
  reconstructed or approved logo. No alternative mark was invented.
- Sidebar has New Conversation, Projects/Agents/Settings, truthful empty saved
  history, a session-only unsent Drafts list and current-project unavailable state.
  Blank New Conversation clicks never create persisted history. Nonempty unsent
  drafts remain selectable; navigation preserves text within the session.
- Home stays Home while typing. Send and model selection are disabled and explain
  why. There is no synthetic accepted message, task progress or worker activity.
- Dock supports Terminal/Files, page-local defaults, per-draft Chat restoration,
  explicit manual hide/reopen, bounded saved width, pointer and keyboard resizing,
  keyboard tab movement and temporary Sidebar rail fit without overwriting the
  user's Sidebar preference. Agents closes Dock on each entry; Projects opens
  Files only on an explicit action. Hiding panels has no execution side effects.
- Agent Logs and Files show read-only unavailable/empty states. Interactive Shell,
  project registration and file access are disabled; no operating command prompt
  or fake project tree appears.
- Settings changes session-local reduced motion and ambient light; system reduced
  motion is honored independently. No backend/model configuration is fabricated.
- `ConversationView` and `FilePreview` are presentation-only components covered
  by isolated synthetic fixtures. They support expandable evidence cards and
  read-only text/unavailable previews without reading files. They are not mounted
  as fictitious accepted conversations or project data in the production entry.

## Boundaries and security observations

Main enables the Electron sandbox and configures context isolation, disabled
Node integration, web security and disabled webviews. Preload is an intentionally
empty CommonJS scaffold: no public IPC methods, subscriptions or generic invoke.
There is no SQLite, Python bridge, AgentOS call or model-provider integration.

Production CSP rejects connections, inline script, frames and forms. Main denies
unexpected navigation/redirects, popups, downloads and permission requests, and
limits local asset requests to decoded paths within the built Renderer directory.
Development permits only the exact local Vite asset origin/WebSocket and uses a
fresh CSP nonce for React's development preamble. This server is asset tooling,
not a Python/engine transport or product service.

Actual Electron tests observed undefined Node/process/raw IPC/nextCode globals,
configured security flags, denied external navigation/popups, zero requests at
a controlled forbidden local endpoint, failed outside-asset file fetch, rejected
inline script, and denied notification permission. These are bounded Renderer
and application checks, **not** proof of a strong Windows OS sandbox, a future
File Broker, process-tree cleanup or hostile engine containment.

Fixtures are imported only by tests. A built Renderer scan found none of the
distinct synthetic fixture markers. No test record enters durable product data.

## Files and dependencies

`CHANGE-MANIFEST.json` lists each changed/created path, action, reason and hash.
The source envelopes are `electron/`, `renderer/`, `tests/` and project-level
build/test config; stage evidence lives in this P1 directory. README and the
AGENTS authority paragraph were updated for the owner's current authorization.
The plan's authorization status was updated; its scope remains the baseline.
There are no source deletions, schema migrations or frozen-document changes.

Pinned principal versions:

| Package | Version |
|---|---|
| Electron | 45.0.0 |
| React / React DOM | 19.3.1 |
| TypeScript | 5.9.3 |
| electron-vite / Vite / React plugin | 5.0.0 / 7.3.7 / 5.2.0 |
| Vitest / jsdom | 4.1.12 / 27.4.0 |
| Playwright Test / axe-core | 1.64.1 / 4.14.0 |
| Prettier | 3.9.10 |

Exact versions of every direct dependency and the transitive integrity/resolution
graph are in `package.json` and `package-lock.json`. npm registry engine and peer
metadata were checked before choosing versions. Newest Vitest/jsdom majors
excluded installed Node 25, so supported versions were selected explicitly.
The root Node engine range is the intersection **`^22.12.0 || >=24.0.0`**;
other allowed versions were not executed. Electron's embedded Node is separate.

Small refinements within the approved dependency scope: explicit
`@testing-library/dom` satisfies testing peers, and local pinned Prettier formats
the new source. `.npmrc` applies exact saves and engine checks locally. Electron
45 requires its explicit official installer; the project postinstall invokes it
with a workspace-local cache. Its downloaded artifact is checksum-verified by
that installer. No global Node/npm change, administrator install or paid API was
used. Online npm install/audit and the cached reinstall reported 0 vulnerabilities.

Official references used for implementation choices:
[electron-vite](https://electron-vite.org/guide/),
[Electron security](https://www.electronjs.org/docs/latest/tutorial/security),
[BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window),
[Playwright Electron automation](https://playwright.dev/docs/api/class-electron).

## Actual verification

Host: Windows x64, build 26200.9457; PowerShell 5.1.26100.9444; Git
2.54.0.windows.1; host Node 25.9.0; npm 11.12.1. Observed Electron 45.0.0,
Chromium 156.0.8078.48, embedded Node 24.22.0. No engine import or execution.
The machine-readable `VERIFICATION-RESULTS.json` preserves sanitized case names,
outcomes, timings, runtime inventory, viewport observations and screenshot hashes.
Raw logs/traces/profiles stay ignored locally because they can contain machine paths.

| Command / observation | Actual result |
|---|---|
| `npm ci --offline --cache .cache/npm --no-fund` | PASS; 182 packages installed from lock/cache; official Electron cached installer completed |
| `npm run build` | PASS; TypeScript check and Main/Preload/Renderer builds |
| `npm run test:electron` | **11 PASS, 0 failed, 0 skipped, 0 flaky** |
| `npm test -- --reporter=default --reporter=json --outputFile=test-results/unit-results.json` | **26 PASS in 5 files, 0 failed** |
| `npm run format:check` | PASS for new source and config; frozen engineering files excluded |
| `npm run dev -- --remoteDebuggingPort 9333` | PASS; actual application opened; connected test navigated to Agents and captured screenshot; test window closed normally |
| Delivery verifier against Git HEAD | PASS: 41 payload hashes/lengths, 42-file inventory, 18 normative files and exact manifest hash |
| Production fixture-marker scan | PASS; synthetic fixture strings absent |

Electron checks cover native maximized startup, real page navigation/drafts,
Dock restoration/hide/tabs/resize, layout, keyboard focus and navigation,
reduced motion, reload honesty, security negative cases, development loading,
and forced device scale factors 1 / 1.25 / 1.5. axe-core found no violations for
the tested WCAG 2 A/AA and 2.1 AA rules on Home/Projects/Agents/Settings.
Automated accessibility is **not** full accessibility certification.

**DPI/viewport evidence limits:** the actual connected display was 1536×864 DIP
at native Windows **125%**. Other OS display settings were not changed. Exact
1000×600, 1100×700, 1366×768 and 1920×1080 CSS targets use DevTools metrics in
the real Electron Renderer, preserving its actual device pixel ratio. Native
measurements are recorded separately because fractional DPI rounds sizes and a
window larger than the physical display may be constrained. Forced 100/125/150%
device-scale tests passed; actual OS 100/150% setting changes and cross-monitor
movement are **NOT_RUN**. Only one display was observed.

## Failures found and resolved

Failures were retained as history rather than counted as passing attempts:

1. Initial typecheck found test-only environment typing and Testing Library option
   errors; fixed before the successful build. Sandbox ancestor-directory access
   initially blocked Vite's config loader; authorized normal local execution worked.
2. The installed Electron npm package did not download a runtime automatically.
   Added the explicit official postinstall with local cache and verified reinstall.
3. Direct dev launch inherited `ELECTRON_RUN_AS_NODE` from the coding environment.
   A tiny local launcher removes it only for its own command; subsequent direct
   `npm run dev` and the development-mode Electron test succeeded.
4. jsdom's default viewport made an initial resize expectation invalid; the test
   now sets an explicit viewport. jsdom did not emulate native summary keyboard
   activation; the presentation test uses click activation and makes no false
   claim about a keyboard run on that isolated component.
5. Native fractional-DPI rounding broke exact-size assertions; the harness now
   records native values and tests exact CSS sizes explicitly. A detached DevTools
   session reset metrics, and a default viewport override reset DPR; keeping the
   session alive and preserving DPR corrected those harness faults.
6. DPI inspection exposed a real fractional-center deficit (579.6px). Measuring
   fractional root width, flooring the fitted Dock width and a 580px CSS grid
   minimum corrected it. Unit regression and real Electron fit tests passed.
7. Prevented navigation left Playwright's navigation-wait assertion pending;
   live document and Main URL checks verified that the original page stayed open.
   Real pointer movement at fractional DPI was rounded by about 1px; the test
   verifies the bounded observed resize and exact restoration of that observed
   width rather than assuming physical pointer deltas are integral CSS pixels.

## Requirement disposition and remaining limits

| Frozen UI requirement | P1 disposition |
|---|---|
| VIS-01 approved logo | **NOT_VERIFIED**: both NCD-01 reference images remain missing; no invented logo |
| VIS-02/03 palette, glass, uncluttered Home | Implemented and screens inspected; reference-image fidelity remains NOT_VERIFIED |
| VIS-04/15 navigation and New Conversation | PASS for P1; no durable blank history |
| VIS-05 composer model location | PASS for disabled/unavailable P1 state; real registry P5 |
| VIS-06 coding-result cards | Presentation-fixture PASS only; no real accepted conversation/task |
| VIS-07/08/11/13 panels, responsive fit and state matrix | PASS for P1 UI; task-triggered auto-open NOT_RUN until real task integration |
| VIS-09 Mission Control | Empty/unavailable structure PASS; authentic events/reports P8 |
| VIS-10 / NAV-01–07 real task continuity | **NOT_RUN**; no actual engine task in P1 |
| VIS-12 keyboard/reduced motion | Scoped automated/interaction PASS; manual screen-reader and GPU profiling NOT_RUN |
| VIS-14 restart appearance/task recovery | **NOT_RUN**; session-only preferences, no fake restored task |
| VIS-16 draft semantics | No false acceptance and navigation retention PASS; durable first-message acknowledgement P3/P5 |
| VIS-17 file preview | Isolated read-only presentation PASS; actual safe project preview P6 |
| IIS-08 G0–G9 | **NOT_RUN as full executable gates**; P1 subsets do not substitute for them |

The two reference images and approved logo reconstruction/review remain the
visual sign-off dependency explicitly allowed to remain pending by the owner.
No true conflict requiring a frozen-contract change was found; no Change Proposal
was needed. P2–P9, real IPC, SQLite, bridge, engine events, coding, provider use,
File Broker and P10 distribution remain unimplemented.

## Safety, recovery and review

No user project was opened or modified. No database migration/restore or process
fault injection applies to this shell; those future proofs are NOT_RUN, not PASS.
Tests use generated profiles and synthetic text; closing test windows stops only
their own app. The original ZIP and all frozen delivery bytes remain unchanged.
The engine repository was not modified or run. No global trust/system change or
unapproved cleanup was performed. To stop P1, close the app; session drafts are
transient. To revise/revert the implementation, use a reviewed follow-up commit
on this branch; do not delete user data or rewrite published history.

Self-review covered changed paths, public-data screening, fixture isolation,
scope boundaries, runtime evidence and Git whitespace checks. Independent review
and owner acceptance are **PENDING**. The stage is submitted for review only.
**Stop here: no merge and no P2 without the owner's explicit instruction.**
