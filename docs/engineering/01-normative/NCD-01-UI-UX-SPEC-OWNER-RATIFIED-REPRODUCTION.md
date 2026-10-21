# NCD-01 — Next Code Desktop: UI/UX & Visual Design Specification

> **Document ID:** NCD-01  
> **Status:** FROZEN — UI/UX Baseline v1.0 (OWNER APPROVED 2026-10-18)  
> **Date:** 2026-10-18  
> **Project:** Next Code Desktop (Windows-first)  
> **Authority:** Owner explicitly approved freezing the reviewed NCD-01 UI/UX specification on 2026-10-18, after FFR-02 documentary PASS. Later scope/behavior changes require a recorded owner-approved amendment.  
> **Precedence:** `NCD-00-PROJECT-SCOPE.md` — FROZEN Scope Baseline v1.0, read with the narrowly scoped owner-approved `NCD-00-C01-SIDEBAR-NAVIGATION-CLARIFICATION.md`. The original frozen v1.0 remains unchanged. NCD-01 cannot otherwise expand or override NCD-00.  
> **Execution:** **NO IMPLEMENTATION AUTHORIZATION.** This freeze approves the UI/UX specification only; it does not authorize Antigravity, source-code changes, or production UI implementation.

---

## 1. Purpose, scope, and normative language

This document specifies the visual identity, screen layout, navigation, UI states, interactions, and testable acceptance rules for the **Next Code Desktop** interface. It describes the interface **to the existing Next Code agent**, not a new agent, multi-agent hosting platform, or general-purpose IDE.

- **MUST:** mandatory behavior/design intent, once this document is owner-frozen.
- **SHOULD:** preferred guidance that may be changed through review with a reason.
- **MAY:** optional / future behavior; not silently in release-one scope.
- **DRAFT VALUE:** proposed initial value, adjustable during implementation based on usability tests; not an owner-approved pixel-level mandate.

NCD-00 v1.0 and its approved narrow C01 navigation clarification remain authoritative: Windows only in the first release, continuous conversation, an independent Agents page, truthfully presented model capabilities, `Agent Logs` plus future/conditionally available `Interactive Shell`, read-only file preview initially, and no changes to the original Next Code engine without a separate authorization.

## 2. Approved UI decision register

| ID | Decision | Owner choice | Status |
|---|---|---|---|
| D-UI-01 | Visual direction | **B — Premium Balanced**: restrained blue/violet ambient glow, frosted translucent glass, strong readability | OWNER DECIDED |
| D-UI-02 | Right Dock default behavior | **C — Smart Behavior**: clean Home, context-sensitive appearance during work, user override respected | OWNER DECIDED |
| D-UI-03 | Chat presentation | **B — Coding Conversation**: messages with expandable coding-result blocks, not plain chat bubbles alone | OWNER DECIDED |
| D-UI-04 | Agents page | **B — Agent Mission Control**: mission timeline and selectable agent inspector; no fixed worker order | OWNER DECIDED |
| D-UI-05 | Right Dock inside Agents | **B — Hide by default** when navigating to Agents; permit manual show; return to Chat state on exit | OWNER DECIDED |
| D-UI-06 | Task lifecycle across navigation | Running tasks **MUST continue** across Chat / Agents / Projects / Settings navigation, irrespective of UI mounting/visibility | OWNER DECIDED — CRITICAL |
| D-UI-07 | Primary Sidebar action | Replace generic **Chat** navigation button with **New Conversation**; preserve access to existing conversations through recent-history entries | OWNER DECIDED; NCD-00-C01 |
| D-UI-08 | Home → Work transition (R-04) | Move into Work Mode only after the first sent message is successfully recorded; preserve unsent/failed-send drafts | OWNER DECIDED — 2026-10-18 |
| D-UI-09 | Read-only file preview (R-05) | Preview stays inside Right Dock / Files and never displaces Chat or Mission Control | OWNER DECIDED — 2026-10-18 |

**Freeze authority:** All D-UI-01 through D-UI-09 are included in the owner-approved FROZEN v1.0 UI/UX baseline. R-01 through R-05 were accepted and reviewed in FFR-02. Downstream integration gates and implementation verification remain in §14.

## 3. Visual references and fidelity

Local review assets distributed with this document:

- `NCD-01-references/next-code-logo-reference.jpeg` — owner-supplied new Next Code logo reference: blue angle-bracket mark, silver vertical element, `NEXT CODE` silver letterforms. **Do not revert to the discarded cube-letter logo.**
- `NCD-01-references/next-code-layout-reference.png` — approved design-direction image: dark dotted grid, slow blue/violet wave aesthetic, frosted Sidebar and central input, Right Dock with Terminal/Files.

**Supersession rule:** Reference images are visual inspiration, not canonical UI behavior. Where they show a **Chat** Sidebar item, an always-open Right Dock on Home, or an unsupported model such as `GPT-4o`, the explicit decisions in **§2 and §5–§11 win**. The latest design choices intentionally supersede those image details.

The user-provided logo is a photographic/screenshot reference; preserve its geometry and look. Obtain or reconstruct an appropriate application-ready vector/transparent asset only with visual review; don't claim the source photo itself is a transparent SVG.

## 4. Visual identity (D-UI-01)

### 4.1 Visual principles

- Minimal, Windows desktop-focused interface; quiet center, generous negative space.
- Premium Balanced: no thick neon frames everywhere. Glow belongs to active controls or carefully controlled ambient regions.
- Transparent **frosted glass** panels with subtle blur and readable surfaces; stronger opacity behind dense logs/code.
- Rounded corners, thin cool-color outlines, subtle hover/selected transitions.
- Prefer accessible readability and responsiveness over visual effects.

### 4.2 Color palette — candidate starting tokens

The five-part palette is owner-approved in direction; these hex values were presented as starting values and **SHOULD be validated during UI review**, not treated as hardware-level invariants.

| Token | Initial value | Purpose |
|---|---|---|
| `--ncd-base` | `#090D18` | Application background / midnight navy |
| `--ncd-surface` | `#172238` | Dark panel tint |
| `--ncd-blue` | `#568DFA` | Selection, focused state, subtle glow |
| `--ncd-violet` | `#8B6BE9` | Secondary ambient light |
| `--ncd-silver` | `#DCE4F0` | Main text / metallic logo reference |

Supplementary semantic colors for **actual** success, warning, error, disabled, and connection state MUST be distinct from purely decorative colors. A green status dot is *not* used unless backed by a genuine runtime status.

### 4.3 Glass hierarchy

- `Glass-01`: Sidebar / large containers — more transparent, controlled background blur.
- `Glass-02`: message composer and Right Dock — slightly denser tint and emphasis when active.
- `Glass-03`: menus, popovers, dialogs — highest readability/opacity; layering and contrast take priority.
- Terminal content surfaces MUST be darker/more opaque than ambient panels for monospace legibility.
- Shadows/borders are quiet when inactive; focused/hovered items MAY brighten temporarily.

### 4.4 Living background

Composite three layers:
1. Dark navy base.
2. Fine dotted geometric grid, subdued enough not to compete with code/text.
3. **Slow** flowing blue and violet ambient waves, with reduced brightness behind text and controls.

Animation is decorative, not a representation of actual agent activity. Implement with a technique that can be disabled/reduced and avoids unnecessary GPU/CPU demand; no heavy perpetual re-renders from React.

### 4.5 Logo and typography

- Home: large center wordmark above the main composer, with blue mark and slightly translucent silver text.
- Sidebar: small authentic logo lockup at top.
- Work mode: remove/collapse hero logo smoothly to free reading space; logo stays available at Sidebar.
- Use readable UI sans-serif text and monospaced code/logs; don't use decorative custom letterforms for application body copy.
- Only the approved new mark is used in the production UI.

## 5. App shell — overall layout

The interface is one application shell with three primary zones:

```
+--------------------------------------------------------------+
| [Left Sidebar] |      Central Workspace      | [Right Dock]  |
|  Collapsible   |  Home / Chat / Agents / ...  |  Conditional  |
|                |                              | Terminal/Files|
+--------------------------------------------------------------+
```

**No large global top bar.** Controls should be embedded in their relevant zone. The shell MUST not cause task cancellation when central screens unmount or when the Right Dock is hidden.

### 5.1 Window geometry and responsive layout — FFR-01 R-03 accepted baseline

The following are **initial UI design tokens and test targets** accepted as part of the R-03 correction, **not evidence that a Windows build has been visually tested**. Implementers MUST preserve the behavior/priority below; small numeric refinements require recorded visual QA before implementation approval.

| Design token / condition | Baseline | Rule |
|---|---|---|
| Sidebar expanded | `256 CSS px` | Default preference when space allows |
| Sidebar rail | `64 CSS px` | When user collapses it **or** layout temporarily requires compact mode |
| Dock preferred width | `360 CSS px` | User-resizable and remembered |
| Dock width range | `320–480 CSS px` | Clamp to fit remaining center width; do not overlap composer |
| Center usable width | `>= 580 CSS px` | Hard layout protection for reading/composer when Dock is present |
| Inter-zone spacing | `16 CSS px` between adjacent visible zones | Allow two gaps (32px) when all three zones present |
| Recommended design verification viewport | `1100×700 CSS px` | **QA target, not automatic Electron hard minimum** |
| Additional QA viewports | `1366×768` and `1920×1080` | Include Windows 125% display scaling and usable-content-area checks |
| Compact adaptive floor | `1000×600 CSS px` | Verify navigation/composer without overlap; hard native window minimum assigned in NCD-02 after device QA |

The 3-panel expanded combination requires `256 + 16 + 580 + 16 + 360 = 1228 CSS px` at default widths. Consequently, at `1100px` it is **not valid** to show expanded Sidebar and Dock simultaneously at their preferred widths while pretending the center remains `580px` wide.

**Deterministic fit policy:**
1. When Dock is hidden, show Sidebar in its user-selected expanded/rail mode, unless platform window limits force a compact state.
2. When Dock should open, first compute whether `(expanded Sidebar + gaps + Dock + 580px center)` fits. If yes, retain the preferred Sidebar state and clamp Dock to the available space.
3. If not, **temporarily** use the 64px Sidebar rail for layout, without overwriting the stored expanded/collapsed preference; calculate allowed Dock width as `min(savedDockWidth, 480, viewportWidth - 64 - 32 - 580)`, provided it remains `>= 320`.
4. If even the rail + minimum Dock + center cannot fit, keep Dock hidden and expose an explicit, keyboard-accessible reopen affordance; never overlap or shrink the composer below the center floor.
5. When Dock closes or width increases, restore the user's actual Sidebar preference. If the user explicitly re-expands Sidebar in a constrained viewport, prioritize that choice and close Dock if the two cannot coexist safely; do **not** terminate background work.
6. For `1000–1099px` compact adaptive testing, show Sidebar as rail while Dock is open; retain usable navigation and scrollable content at `>= 600px` height. Below this adaptive floor no new visual behavior is implicitly authorized: use the native minimum constraints established by NCD-02.

**Windows scaling caveat:** Monitor pixel dimensions are not necessarily renderer CSS-pixel dimensions at 125% scaling. Validate effective content viewport rather than assuming `1366 physical px == 1366 CSS px`. The Electron `minWidth/minHeight` settings and chrome insets are NCD-02 responsibilities; they MUST be chosen so common Windows scaling does not make the minimum-size window unusable.

**Testable examples (all refer to CSS viewport):**
- `1920×1080`: 256 Sidebar + 360 Dock + 32 gap leaves 1272px center.
- `1366×768`: same combination leaves 718px center.
- `1100×700`: expanded Sidebar + preferred Dock leaves only 452px center (**invalid**); temporary 64px rail + 360 Dock leaves 644px center (**valid**).
- `1000×600`: rail + min-width 320 Dock + 32 gap leaves 584px center (**valid**, subject to height and scaling QA).

### 5.2 Sidebar (D-UI-07)

Display:
1. Small Next Code logo + one-click Sidebar collapse control.
2. **New Conversation** as prominent primary action — *replaces generic Chat navigation*, per the controlled NCD-00-C01 clarification of NCD-00 §5 FR-02.
3. `Projects`, `Agents`, and `Settings` navigation.
4. `Recent Conversations`: selectable history, meaningful truncated titles and status indicators.
5. Small current-project indicator/card toward bottom: name, local workspace status; not an `Upgrade` upsell card.

Behavior:
- `New Conversation` creates a new **draft** conversation view, does not erase history, and MUST NOT terminate existing work.
- Do not persist empty conversations solely from clicking New Conversation.
- Existing conversation is reachable through recent-history entries; selection restores chat and task state instead of starting a new task.
- Collapsing Sidebar leaves a small rail/icon-based navigation and a clear expand affordance.
- Show a running/finished/failed state alongside each relevant conversation only when backed by the task lifecycle, not guessed from route changes.
- Preserve access to a running conversation's status even if the user visits another section.

## 6. Central Workspace modes

### 6.1 Home / New Conversation state

- Mostly empty center, living background visible.
- Prominent approved Next Code logo centered above composer.
- **No** large surrounding hero card, no floating `Build a feature` / `Fix a bug` chip row.
- Main composer: roomy frosted rounded glass bar; source/attachment affordances only if supported; model indicator/selector **inside** bar; send button.
- Right Dock hidden by default unless the user explicitly opens it.
- Show selected local project clearly before real execution; if none selected, provide obvious selection route.
- **D-UI-08 / R-04 — APPROVED:** Unsent content and failed-to-send drafts remain in Home/New Conversation. Typing in the composer alone MUST NOT trigger Work Mode or a task. The first sent message MUST be **successfully accepted and recorded as a conversation message** before the UI transitions into Work Mode; a send failure MUST preserve editable text and MUST NOT display a fictitious sent message or running task. The integration contract (NCD-03) will define delivery acknowledgement and durable storage semantics; this UI rule does not presume successful agent execution.

### 6.2 Work / Active Conversation state (D-UI-03)

- Logo hero collapses; message history appears in main center and scrolls independently of global shell.
- Composer anchors to bottom of main conversation area; retains model location and send affordance.
- User messages and assistant's explanations remain legible.
- Agent answer MAY include collapsible, typed, evidence-backed result cards: `Execution Plan`, `Modified Files`, `Verification Results`, and summary/error.
- A missing data source is represented as unavailable or omitted; never invent file edits, test passes, steps, or agent status.
- Preserve draft text during page navigation and communication failures (per conversation where appropriate).
- **D-UI-08 / R-04 — APPROVED:** Work Mode applies after at least one successfully recorded message exists in the conversation; reopening an existing conversation MUST restore this mode consistently. A successfully recorded message means a conversation entry was accepted, **not** that a coding task has started, progressed, or succeeded.
- Separate the main answer from the full details of worker lifecycle; those belong to Agents page.

### 6.3 Projects page

- Local project picker, current workspace, and recent/known local project entries **where data truly exists**.
- Access to `Files` through Right Dock or an explicit project-open action.
- Changing selected project MUST NOT silently rebind a running task to another directory; project association per task/conversation remains stable.

### 6.4 Settings page

- Small, functional section for display preferences (movement/glow, Sidebar/Dock behavior) and truthful configuration/status of model/engine.
- No speculative plugin marketplace, cloud account management, or unrelated AI-agent host settings.

## 7. Right Dock — shared behavior (D-UI-02, D-UI-05)

One frosted, glass-bordered resizable container to the right, with top tabs:

- `Terminal`
- `Files`

Within `Terminal`, a nested toggle/tab between `Agent Logs` and `Interactive Shell`. `Agent Logs` comes first. The Shell MUST be clearly disabled/unavailable until separately implemented and verified under NCD-03 safety requirements; do not create an inert-looking working command line.

**Controls:** Dock collapse/expand, width drag handle; clear active tab; no decorative red/yellow/green window-control traffic lights. A small **semantic** process state indicator MAY show running/stopped/error only when supported.

### 7.1 Deterministic Smart Dock policy — FFR-01 R-02 accepted

**State ownership:** distinguish `savedDockWidth` (global safe UI preference), per-conversation `ChatDockState` (visibility, active primary tab, Terminal subtab, user-hide override), and page-local temporary Dock state for `Agents`/`Projects`/`Settings`. Never use React component mounting as a signal to start/stop an agent task.

| Context/event | Visibility, tab, and override rule |
|---|---|
| Launch / enter unsent Home or New Conversation | Dock **closed by default**; user may open it manually. New conversation starts with neutral override and its own Dock state. |
| Open existing Chat conversation | Restore that conversation's saved Chat Dock visibility and tab; do not automatically start a task or reapply a task-start auto-open. |
| New task starts **while in Chat** | **Once at task start only**, open Dock in `Terminal → Agent Logs` if the user has **not explicitly hidden Dock in this conversation**. If user already deliberately selected Files or Shell, respect the user's active selection and don't force the tab. |
| Chat user closes Dock | Explicit hide wins over task auto-open **for the entire current conversation**, including later tasks and return visits; only an explicit reopen clears the hide override. |
| Navigate from Chat to Agents | Dock **closed on each Agents-page entry** (page-local default); user may show it during that visit. Chat's separate Dock state is preserved unchanged. |
| Reopen Dock manually in Agents | Display page-local Dock; remains visible until hidden or page exit, without rewriting Chat's state. |
| Return to a Chat conversation from Agents | Restore that Chat conversation's last visibility, primary tab, Terminal subtab and saved width. **Do not** replay task-start auto-open. |
| Enter Projects | Page-local Dock **closed by default**; optional manual open uses `Files` as initial tab unless a user selection on that visit supersedes it. Does not overwrite any Chat Dock state. |
| Enter Settings | Page-local Dock **closed by default**; if manual opening is offered, it is confined to that Settings visit. Does not overwrite Chat Dock state. |
| Hide Dock, close Terminal tab or change width | Changes presentation only. It MUST NOT stop a task or close an independent terminal process. |
| App restart / restored conversation | Restore safe presentation preferences, but mark task status `unknown` or `not running` according to actual runtime evidence; **never** infer a live task from persisted UI state. NCD-03 governs reconnection/recovery. |

**Scope and reset:** A new conversation begins with closed Dock and neutral override; an existing conversation keeps its manually hidden/reopened state across route changes and new tasks in **that same conversation**. The most recently user-resized valid Dock width is remembered globally (within fit constraints), but tab/visibility preferences remain conversation-specific for Chat and visit-specific for non-Chat pages. While viewing Agents, Projects or Settings, events from a running task may update status badges/log buffers but MUST NOT cause an unsolicited Dock opening.

**Fit policy takes precedence:** A manual request to open Dock on a narrow viewport triggers the temporary compact-rail logic from §5.1. Never forcibly expose Dock if its minimum dimensions cannot be met; show an appropriate hint/affordance instead. UI closing a Dock must not destroy running processes. Any reset of layout preference via Settings must be an **explicit** user action, not navigation side effect.

**Truthful display:** `Running`/`Stopped`/`Error` labels depend on actual process/task status. A previously stored active-tab name is presentation state, not proof an Interactive Shell exists or is operational.

### 7.2 Files tab

- Tree view rooted in the selected local project.
- Expand/collapse directories; selection shows read-only preview when supported.
- **D-UI-09 / R-05 — APPROVED:** Selecting a file in the `Files` tab opens a **read-only preview within Right Dock**, keeping the file tree accessible (e.g., switchable file-preview state with a Back/Close control). This action MUST NOT replace the active Chat or Mission Control page, navigate away from it, or stop a running task. Closing preview restores the Files tree/view without affecting execution. Missing, unreadable, unsupported, and binary files MUST show truthful non-editable states. Any larger preview is optional and MUST require an explicit user action; this approval does not authorize a full editor or arbitrary file modification.
- Path and file access respect the selected workspace and NCD-03 security boundaries.
- Empty/not-selected/unreadable states must be explicit.

### 7.3 Terminal tab

- `Agent Logs`: readonly output/status from validated adapter/bridge. Text with timestamps/roles only when those fields are known.
- `Interactive Shell`: independent local terminal session/PTY with separate process lifecycle; execution **not assumed available** in UI spec. No conflation with AgentOS's internal `run_command` tool.
- UI closing/minimizing `Terminal` MUST NOT be interpreted as shell termination. Explicit lifecycle and safety require NCD-03 decisions.

## 8. Agents page — Mission Control (D-UI-04)

Mission Control is a **dedicated page** accessed from Sidebar, distinct from chat messages. It is **not** a control surface that changes the Lead Architect's decisions.

Recommended three areas:

1. **Mission Header** — linked project/task, actual state, purpose/goal, and honest summary.
2. **Execution Timeline** — chronological records of the real dispatched temporary workers (e.g. `SCOUT`, `SURGEON`, `INQUISITOR`). Repeated invocations and any order are supported; never assume a fixed `Scout → Surgeon → Inquisitor` ordering.
3. **Agent Inspector** — detail of selected timeline entry: role, assigned task contract if exposed, verified status, finished report, modified files and verification verdict when available.

**Truth rules:**
- An ephemeral worker is not kept alive after completion for UI purposes. Historical entries reflect reports/records, not a currently running worker.
- `Active` requires an actual activity signal. Absence of a live event stream must be communicated as `live activity unavailable`, not fabricated.
- If no workers have been recorded, show a helpful empty state.
- Timeline updates must not create a second task or cause agent execution to restart.
- Right Dock hidden on entry by default (D-UI-05), but user can expand it.

## 9. Critical invariant — persistent execution across navigation (D-UI-06)

### 9.1 Binding rule

**An active coding task MUST continue, with the same task identity and engine execution, as the user navigates among Chat, Agents, Projects, and Settings or hides/resizes UI panels.** Page component mount/unmount MUST NOT be used as the owner of a long-running agent process.

### 9.2 UX implications

- Keep the task's durable identity and associated conversation/project visible in a shared state source independent of individual page components.
- While the user is on another page, Sidebar's relevant conversation shows actual `Running`, `Completed`, `Failed`, or `Unavailable` status as appropriate.
- The result and any verified output are attached to the originating conversation when the task finishes, regardless of current route.
- Returning to Chat displays the persisted conversation and the current/finished task without duplicate `start` calls.
- Opening a new conversation, inspecting Agents, browsing files, changing presentation settings, collapsing Sidebar, or hiding Dock is **navigation/presentation only**, not a stop/cancel request.
- On loss of connection, display `Connection lost / state unknown` where warranted; do not call it a completed or failed task without evidence.
- Task queue / multiple concurrent tasks / cross-conversation scheduling are **not** decided by this rule; NCD-03 will specify concurrency and cancellation behavior.

### 9.3 Explicit non-claim

This decision covers **navigation within the open application**. It does **not** guarantee task execution after the desktop application is closed, the underlying Python process is killed, the machine sleeps, the application crashes, or Windows shuts down. Those are separate lifecycle/recovery concerns in NCD-02/NCD-03.

### 9.4 Acceptance scenarios (MUST pass)

| Test | Procedure | Expected |
|---|---|---|
| NAV-01 | Start a long task on Chat, open Agents, then return | Same `task_id`; no duplicate launch; task continues |
| NAV-02 | While task runs, open Projects, then Settings | Execution unaffected; sidebar status stays correct |
| NAV-03 | Start task, hide Right Dock and collapse Sidebar | Task continues, interface still navigable |
| NAV-04 | While in Agents, task completes | Original conversation obtains truthful outcome; status updates when verified |
| NAV-05 | Navigate to New Conversation during task | Original task is not silently canceled; original conversation remains accessible |
| NAV-06 | Temporarily lose bridge connectivity | UI does not falsely claim success/failure; no blind automatic re-run |
| NAV-07 | Re-open running conversation | Current state restored without spawning second task |

**Implementation ownership belongs to NCD-02/NCD-03**, not to an individual React screen. Do not claim these tests can pass until the bridge supports them.

## 10. Motion, interaction, and keyboard accessibility

- Quiet transitions for Sidebar, Dock, hero-to-work and expansion, typically **150–300 ms as a draft range**, not a mandatory animation delay.
- No sudden layout jumps; handle resize smoothly, but avoid expensive relayout loops.
- Honor Windows reduced-motion preferences; offer reduced/disabled wave animation in application settings.
- User-invoked navigation, buttons, expanders, model choice, project selection, and Dock drag handles should be keyboard-accessible with visible focus.
- Text/code contrast takes priority over background transparency; preserve adequate clickable targets.
- No auto-navigation away from a page on task completion; report state via unobtrusive UI indicator.
- Shortcuts are useful but **exact key bindings remain open** until keyboard collision review.

## 11. Truthfulness and data/UI boundaries

- UI state (`selectedTab`, `dockWidth`, `isSidebarCollapsed`) is independent of execution state (`taskId`, `running`, `outcome`).
- The model selector is **inside the composer**. Only real, verified engine configurations may be selectable; when only one is supported, display it as a non-deceptive active configuration.
- UI mock/demo content MUST be distinctly marked and never confused with a live task or executed command.
- An `Agent Logs` view is not itself a permission to execute arbitrary commands.
- Do not promise progress percentages without a source; show discrete known states where possible.
- Conversation continuity must be meaningful to the agent, not just a persistent UI transcript; NCD-03 owns how follow-up context is packaged.

## 12. Error, empty, loading, and disconnect states

MUST design and test at least:

- No workspace chosen; invalid/unreadable workspace.
- No conversation yet; first draft not persisted.
- Agent unavailable / Python missing / bridge disconnected.
- Running task / known completion / known failure / status unknown.
- No agent events; detailed live agent activity unsupported; historical reports present.
- No files or unreadable file; unsupported binary preview.
- No multiple models supported; do not show fictitious options.
- Interactive Shell not yet available; do not show it as an enabled feature.

Messages should tell the user what is known and what action, if any, is available, without exposing secrets or raw internal traces by default.

## 13. Visual QA and acceptance checklist

Evaluate at `1100×700`, `1366×768`, and `1920×1080` CSS viewports; also validate effective renderer sizes at Windows 125% display scaling and `1000×600` compact adaptive viewport. These are UI acceptance targets from R-03, not claims that device QA has happened.

| ID | Acceptance criterion | Verification |
|---|---|---|
| VIS-01 | New approved logo in Home and Sidebar; cube-based old wordmark absent | Visual comparison |
| VIS-02 | Premium Balanced dark/grid/waves/glass theme; no excessive glow; readable code | Visual QA and contrast checks |
| VIS-03 | Home uncluttered: hero + composer, no floating suggestion chips or large hero card | Screenshot comparison |
| VIS-04 | Sidebar primary action says **New Conversation**, navigates correctly, does not delete running task | UI interaction test |
| VIS-05 | Model selector embedded in composer; unsupported model not selectable | UI + integration test |
| VIS-06 | Central Work Mode renders conversation and expandable evidence-backed coding cards | UI test |
| VIS-07 | Terminal/Files coexist in one resizable/hideable Right Dock | UI test |
| VIS-08 | Dock hidden on Home and Agents by default per policy, with manual override honored | State transition tests |
| VIS-09 | Mission Control shows header, non-fixed-order timeline, inspector; truthful empty/unknown states | UI + contract tests |
| VIS-10 | Navigation between all pages while task runs does not terminate/restart it | NAV-01–07 tests |
| VIS-11 | At 1100px with Dock 360px and minimum center 580px, temporary 64px rail is used; 1366px/1920px show full layout when fit; 1000px compact fallback avoids composer overlap | Resize QA, 125% scaling QA |
| VIS-12 | Reduced motion, visible keyboard focus, no excessive background render usage | Accessibility/performance QA |
| VIS-13 | R-02 Dock transition matrix honored for all Chat/Agents/Projects/Settings paths; manual hide wins and width preference survives route changes | UI state-transition tests |
| VIS-14 | App restart restores appearance but never claims a task remains active without runtime confirmation | UI state + integration mock tests |
| VIS-15 | No direct Chat item is required; New Conversation and history entries both reach Chat without cancelling running tasks | Navigation regression test |
| VIS-16 | D-UI-08: typing alone keeps Home; failed send preserves draft; first successfully recorded message enters Work; reopening a conversation restores Work without auto-starting execution | UI + integration acknowledgement tests |
| VIS-17 | D-UI-09: selecting a text file previews it read-only **inside Files / Right Dock** without changing Chat/Agents route or task identity; closing preview restores Files; binary/unreadable files show explicit unavailable states | UI + safe-file-preview tests |

Visual fidelity is judged by **layout + behavior + accepted visual identity**, not by pixel-perfect duplication of earlier concept images whose sidebar and Dock state have since changed.

## 14. Final review checklist / remaining implementation ownership

**FFR-01 R-01/R-02/R-03 disposition:** all three approved corrections are now documented: controlled sidebar addendum, deterministic Dock matrix, and responsive design measurements. These are **design-spec corrections**, not claims of implementation success.

### 14.1 R-04 and R-05 final decisions — owner accepted

- **R-04 / D-UI-08 — APPROVED:** Transition Home → Work only after the first successfully recorded sent message; preserve unsent or failed-send drafts, and never confuse message acceptance with task execution. Covered in §§2, 6.1, 6.2, 13 (VIS-16).
- **R-05 / D-UI-09 — APPROVED:** Read-only file preview belongs inside Files / Right Dock; it must not replace Chat or Agents, end execution, or enable editing. Covered in §§2, 7.2, 13 (VIS-17).

**These two clarifications are part of the frozen UI/UX baseline.** Explicit owner sign-off for NCD-01 FROZEN v1.0 was received on 2026-10-18. Implementation remains unauthorized.

### 14.2 Deliberately deferred to NCD-02/NCD-03/NCD-04

1. Choose native Windows min-size/window chrome details from the §5.1 CSS sizing targets, check at 125% scaling; do not make native min-size guesses that block common monitors.
2. Create and owner-review a transparent/vector logo asset faithfully derived from the supplied logo reference; photo itself is not SVG.
3. Tune alpha/blur/shadow and wave animation based on contrast, reduced-motion and CPU/GPU tests.
4. Keyboard shortcut mapping, focus order and screen-reader names; no accidental shortcut collisions.
5. **NCD-03:** Agent event granularity/source reliability; persistent conversation semantics; task cancellation and cross-conversation **concurrency** policy. A second message cannot silently start/queue/stop an overlapping task without explicit contract.
6. **NCD-03:** Prevent model changes from silently affecting an already running task; never show unsupported models as active options.
7. **NCD-03:** Project/conversation association and workspace integrity during task navigation and project selection.
8. **NCD-03/NCD-04:** Interactive Shell launch phase, Windows PTY/process permissions, and independent process cleanup.
9. At application restart, separate locally restored UI from actual active process state. Recovery and reconnection belong to NCD-02/NCD-03.

## 15. Change control and next action

- **D-UI-01 through D-UI-09 are owner-approved choices included in NCD-01 FROZEN v1.0.** No downstream document may change them implicitly.
- NCD-00 v1.0 stays frozen and byte-for-byte unchanged; the owner-approved **NCD-00-C01** addendum clarifies only the FR-02 Sidebar label while retaining Chat access through history and New Conversation.
- Any later change to these approved UI decisions must be recorded with rationale, affected screens and revised acceptance tests.
- **Owner approval received:** The owner explicitly approved freezing NCD-01 as UI/UX Baseline v1.0 on 2026-10-18, after all R-01–R-05 corrections and FFR-02 PASS.
- **Next:** design and separately review NCD-02 Desktop Architecture, NCD-03 Integration Contract, and NCD-04 Implementation Plan. Only after separate execution approval may stage-specific implementation prompts be issued to Antigravity.

---

### Consolidation history

- **v0.1 (2026-10-18):** Collected owner-approved Premium Balanced theme, Smart Right Dock, New Conversation Sidebar action, Coding Conversation, Agent Mission Control, Dock-hide-on-Agents, and critical continued-execution-on-navigation rule. Added UI acceptance matrix, explicit non-claims, and visual reference supersession notes. **No executable code or GitHub repo changes.**
- **v0.2 (2026-10-18):** Applied explicitly accepted FFR-01 R-01/R-02/R-03 corrections; added narrow frozen-scope clarification reference, complete Right Dock cross-page matrix, corrected layout arithmetic and Windows scaling QA cases; proposed R-04/R-05 and preserved NCD-03 concurrency/model/event gates. **No implementation authorization.**
- **v0.3 (2026-10-18):** Recorded separate owner acceptance of R-04/R-05 (D-UI-08/09); specified exact Home→Work message acceptance, draft failure behavior, and read-only in-Dock file preview; split acceptance tests into VIS-16/17; performed final documentary consistency review. **Historical draft record; subsequently frozen by owner as v1.0 on 2026-10-18. No implementation authorization.**

- **v1.0 FROZEN (2026-10-18):** Owner explicitly approved the consolidated NCD-01 UI/UX baseline after FFR-02 PASS; freeze changes only document status, authority and history, not approved design requirements. NCD-00 and NCD-00-C01 remain unchanged. No implementation authorization.
