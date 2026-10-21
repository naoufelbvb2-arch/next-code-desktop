# NEXT CODE DESKTOP — NCD-04
## Staged Implementation & Verification Plan — Controlled Work Packages, Evidence Gates and Owner Authorization

**Status:** **FROZEN v1.0 — DOCUMENTARY IMPLEMENTATION PLAN / OWNER APPROVED (2026-10-20)**  
**Date:** 2026-10-20  
**Project:** Next Code Desktop — dedicated local-first Windows application for the existing Next Code programming agent  
**Authority:** NCD-00 and approved NCD-00-C01; frozen NCD-01, NCD-02, NCD-03/C-01/C-02/C-03; IIS-01 through IIS-08; approved IIS-02-C01 and C-02-C01 addenda; FCCR-01 as amended by FCCR-01-C01.  
**Execution authorization:** **NONE**. Preparing, reviewing or later freezing this plan is NOT permission to create a repository, edit source, run integration tests, provision credentials, package or publish an app, or modify the original Next Code engine. Every implementation stage needs a separate, explicit, scoped owner instruction.  
**Independence:** No external coding assistant, IDE or vendor is designated as implementation authority. All obligations are written for any qualified implementer.

> **Reading rule:** Facts labelled **FROZEN BASELINE** are obligations inherited from previous owner-approved contracts. Stage numbering, task breakdown and phase sequencing are **owner-approved NCD-04 implementation-planning obligations**, not retroactive amendments to any frozen parent; candidate folder names remain illustrative, not mandatory exact filenames. If a conflict is found, stop and request a separately approved narrow correction; never reinterpret parent contracts silently.
>
> **FFR-01 and freeze interpretation:** The corrected §§2,4–12 and §13 were reviewed in Draft v0.2, and all **N04-F01–N04-F09** were separately approved by the owner before the explicit instruction to freeze this plan. They are now included in this **FROZEN v1.0** planning baseline. Phase-scoped evidence is not a substitute for executable IIS-08 G0–G9. **N04-H01** remains an open provenance intake hold in P0; the independent FFR-01 report and owner approval record preserve historical review status.

---

## 1. Executive objective, decisions and non-goals

**Objective:** Produce a dependable Electron Main + restricted Preload + React/TypeScript Renderer application on Windows, connected to the existing Python Next Code engine by private stdin/stdout JSONL, with a trusted Electron Main SQLite database for Desktop state. Enable local project selection, durable conversations, explicit model selection and discussion, narrowly approved source inspection, single-use proposal-based Run Task, grounded task progress, and truthful Mission Control. The application remains useful for browsing saved local history when Python or a model provider is unavailable.

**FROZEN BASELINE:** It is a **dedicated Next Code Desktop**, not a multi-agent hosting platform, generic plugin SDK, LLM gateway server, cloud inference backend, or a redesign of the Next Code engine. The current target is Windows; developers may use local installed Python, while a Windows bundled Python sidecar is an independently tested later distribution tier. No local HTTP/TCP bridge is authorized. Renderer does not open SQLite, call arbitrary Python commands, or execute raw Node/OS operations.

**v1 scope constraints:** No automatic coding from a conversation, no token-by-token answer streaming absent a new approved protocol, no public same-turn reply-retry API, no structured persistent lifecycle for unapproved candidate decisions under the approved C-02-C01 deferral, no silently reinstated universal LLM egress gate (C-02 FFR-R01 deferred), no claimed strong Windows OS sandbox, no falsely functioning Interactive Shell/PTY, and no general-purpose third-party agent adapters.

**Release discipline:** An implementation with passing isolated unit tests is not an accepted Desktop. Use the IIS-08 G0–G9 gates and the distinct *development-integrated* vs *packaged/distribution* acceptance tiers. The initial NCD-04 phase plan targets **local Windows development-integrated acceptance**; public installer/distribution and G8-package require later specific owner approval.

## 2. Canonical inputs, provenance and source of truth

### 2.1 Normative documents to hand to an implementer

| Authority group | Required canonical document or approved component | Rule |
|---|---|---|
| Scope/UI/architecture | NCD-00, NCD-00-C01, NCD-01, NCD-02 | Do not reopen scope, sidebar, approved visual and app boundaries |
| Python integration parents | NCD-03/C-01, C-02, C-03 | C-01 alone implemented in original engine; C-02/C-03 are design authority |
| Private protocol | IIS-01 FROZEN v1.0 | Five outer JSONL message types and five approved request actions |
| Public desktop IPC | IIS-02 FROZEN v1.0 + IIS-02-C01 | 23 closed Promise methods and three typed subscriptions, with approved `conversations.read` projections |
| Supervisor | **IIS-03 FROZEN v1.0 — REISSUE** | Use the new prospective reissue, not recovered v0.1 or RC1 as active authority |
| Desktop persistence | IIS-04 FROZEN v1.0 | One Main-owned SQLite schema with 22 tables and transactional groups T1–T6 |
| Live UI truth | IIS-05 FROZEN v1.0 | Real engine events, Main-committed replay, Mission Control truthfulness |
| Discussion and providers | IIS-06 FROZEN v1.0 + C-02-C01 | Per-message model, effective provider, immutable attempt lineage, scoped source consent, deferral |
| Project source broker | IIS-07 FROZEN v1.0 | Windows containment, layered sensitive-data protection, staged bounded reads and evidence |
| Executable acceptance | IIS-08 FROZEN v1.0 | G0–G9; I08-T01–T88 plus inherited tests; 8 E2E journeys |
| Consolidated review | FCCR-01 and **FCCR-01-C01** | Prospective IIS-03 reissue closes the historical provenance blocker **for planning**, not by pretending to recover old bytes |

### 2.2 Mandatory pre-code evidence hold

- Before handing a sealed implementation baseline to an implementer, acquire the exact accessible **original bytes**, not merely extracted text, of the earlier freeze documents NCD-00/01/02, C-01/C-02/C-03 and IIS-01/02. The earlier FCCR-01 showed their text projections (with a reconstructed trailing LF) corresponded to recorded hashes; this does **not** cryptographically prove possession of the historical raw artifacts. Record gaps as `PROVENANCE_PENDING` and do not call G0 PASS while mandatory exact-byte references are unresolved. **FFR-N04-F05:** If an exact historical original cannot be obtained, do not reconstruct bytes and label them historical. Prepare an explicit, itemized **prospective substitute/reissue proposal** with comparison, affected downstream references, its own new hash and a **separate owner approval**. Until that disposition has been completed and the actual approved input packet is checked, sealed-baseline/G0 remains `BLOCKED`, regardless of how many projected-text hashes match.
- Confirm the approved IIS-03 **REISSUE** SHA-256 `d79d0f5a0960b64c7c806047407c7632d564c1cf4331ae7c5f185c0df129df48`. The unavailable historical IIS-03 original remains an explicitly recorded provenance limitation; the new reissue is the operative reference.
- Verify the exact inherited IIS-04/05/06/07/08 frozen checksums and approved narrow addenda against the manifest. Never substitute the earlier Draft v0.1/v0.2 files for normative documents.
- Identify the **current** engine repository branch, commit, cleanliness, supported Python runtime, import/CLI and `AgentOS` interfaces in a **read-only** source inspection when separately authorized. `834d0ca62cc9b2c03e530bafe4090024d98f31d3` is a *previously reported* main SHA for the implemented C-01, **not** an assertion about the current HEAD. Compare any later changes against the frozen C-01 evidence.
- Record Desktop repository availability separately; there is **no assumption that an operational Desktop repository already exists**. Its creation requires an explicit execution-stage authorization.
- Preserve the source baseline manifest, owner-approved contract set, reissue freeze record, source snapshots, environment inventory and unresolved deviations with stable IDs. The historical FCCR-01 review and its C01 closure both remain in the audit trail.

**P0 release condition:** Owner-approved implementation input manifest with exact artifact IDs/hashes, observed source SHA(s), decision/addendum precedence, non-normative archive list and documented exceptions. **Unresolved mandatory provenance is a NO-GO** rather than a permitted blanket exception; an approved new prospective substitute requires its own artifact/hash and clear disclosure of the missing historical original. A future G0 executable PASS also requires a specifically authorized code phase/environment, not merely this paper. P0's *read-only inspection* is separately authorized; it does not authorize dependency installation, engine changes, Desktop repository creation or live provider access.

## 3. Architecture and source-ownership rules

```text
React/TypeScript Renderer (display + explicit user action)
    |
    v
Narrow typed Preload API — fixed IIS-02 surface
    |
    v
Electron Main — sole policy/admission/supervisor authority
    |---- SQLite (Desktop durable state; T1–T6; 22 tables)
    |---- Model registry and provider source-disclosure authorization
    |---- Windows Project File Broker (Main-owned)
    |---- Python child supervisor and verified event ingest
                    |
         private UTF-8 JSONL stdin/stdout, stderr diagnostics only
                    |
        +-----------+--------------------+
        |                                |
  Python discussion                 Python coding_task
  (non-executing, ModelGateway)     (per approved Task, Next Code AgentOS)
```

**Repository isolation:** The proposed Desktop codebase must be a separate repository from `https://github.com/naoufelbvb2-arch/next-code`. Do not create a forked copy of the engine or duplicate its decision logic. Keep a thin Python integration entrypoint, but not a generic plugin abstraction. If the existing engine lacks mandatory real event/cancel/model-routing hooks, raise a scoped **ENGINE-CHANGE REQUEST** detailing exact files/interfaces/tests and wait for distinct owner approval before touching the engine.

**Candidate directory boundaries, not frozen filenames:**

- `electron/main/` — policy services, trusted IPC controllers, DB transactions, process supervisor, broker, event ingestion.
- `electron/preload/` — strict, whitelisted exposed methods and typed subscriptions; no generic invocation.
- `renderer/` — React UI, page state and safe read-only projections; no direct filesystem/SQL/process access.
- `contracts/` — version-pinned IPC/JSONL DTO schema, test fixtures and contract validation.
- `python_bridge/` — process-role-specific private adapter code (discussion and coding), without refactoring `AgentOS` unless independently approved.
- `tests/` — separate unit, contract, integration, fault-injection, Windows security, E2E and packaging-test fixtures.
- `docs/evidence/` — hashes, source-to-test traceability, scoped handoffs and sanitized run manifests.

These folder names are **examples for implementation planning**; final exact paths depend on the authorized source layout, without enlarging component responsibilities.

## 4. Execution-stage authorization and governance

1. **Plan approval is not code approval.** Freeze NCD-04 only after its own final consolidated review and a separate owner freeze decision.
2. For each stage, submit a single scope packet: stage ID, repo/branch and starting SHA, exact files or allowed directory envelopes, immutable contracts, operations allowed, forbidden changes, tests to run, success/abort criteria, and evidence deliverables.
3. Obtain **explicit owner authorization for that specific stage** before file creation/edit, dependency installation that changes project files, tests with external effects, repository initialization, commits or merges. No blanket permission inferred from the previous stage.
4. Prefer isolated feature branches and reviewed, narrow commits. No direct unreviewed `main` changes, force pushes, secret-bearing commit or bulk cleanup. A stage's code completion is not a merge authorization.
5. A reviewer other than the implementer, or an independently checkable test runner and artifact review, verifies scope, test evidence, unauthorized changes and frozen-contract fit. If such independence is not available, mark it **NOT INDEPENDENTLY VERIFIED** rather than claiming an independent pass.
6. Any safety-critical regression, requirement ambiguity or actual parent-contract conflict enters `BLOCKED` until a documented correction/approval; do not quietly weaken tests or redefine acceptance. Urgent security fixes still require named permissions.
7. A phase is `IMPLEMENTED`, `VERIFIED`, `ACCEPTED`, and `MERGED` only when evidence separately supports each label. Failed tests, skipped mandatory proof or simulated engine activity cannot be represented as a release success.
8. **FFR-N04-F07 — side effects require explicit permission:** Every stage packet enumerates intended network/model-provider calls, credential access method, child-process launches, Windows destructive/fault-injection operations, repository creation, package installs and any user/project data exposure. Use synthetic fixtures by default. Neither a design freeze nor permission to test a UI implicitly authorizes provider billing, external source disclosure, real-project modification or aggressive OS fault injection.
9. **FFR-N04-F04 — non-operational controls:** A UI shell or typed API stub must return a bounded, unmistakable `NOT_READY`/equivalent frozen error or be visibly disabled; it must never report a persisted message, accepted proposal, active agent, committed event or completed task from a mock. Full wire/IPC surface declaration in P2 does not mean all 23 production behaviors are implemented.
10. **FFR-N04-F01/F06 — stage exit is not system-wide gate PASS:** Define `STAGE_EXIT_PASS` (the authorized subset of tests and safe negative behaviors) distinctly from IIS-08 `G0..G9` results. If a gate relies on work planned in a later phase, record that full gate `NOT_RUN` or `BLOCKED`; do not backdate a full `G2/G3/G4/G5/G6` PASS to an earlier phase.

## 5. Approved staged implementation sequence (no execution authorized)

**Dependencies are hard ordering constraints unless a future revised NCD-04 plan is explicitly approved.** UI-only mock data may assist visual review but cannot be exposed or treated as operational Next Code mission evidence. `P10` is a separate optional distribution-track proposal, not permission to package during development.

| Stage | Approved planning work package | Prerequisite | Primary outputs | Mandatory exit focus |
|---|---|---|---|---|
| **P0** | Contract intake, original-byte provenance and read-only engine interface audit | NCD-04 review/owner authority | Sealed baseline manifest, source hook inventory, risk/permission matrix | G0 input complete; no historical false claims |
| **P1** | Windows Electron/React shell and frozen visual layout | P0 + stage approval | Local runnable shell, sidebar/chat/projects/settings/Agents/Dock shell | UI/a11y tests; no fake integrated actions |
| **P2** | Trust boundary, typed Preload, IPC and private protocol validators | P1 | Closed 23-method/3-subscription **contract surface** with explicit safe unready stubs, schema fixtures, stdio parser under simulator | G1 phase-scoped negative authorization and protocol fixtures; not integrated behavior |
| **P3** | Main-owned SQLite store, migrations and atomic Desktop workflows | P2 | Exact 22-table schema; T1–T6 **transactional primitives/fixtures**; backup/recovery; projections and dedup | G2 **database-scoped** ACID/race/dedup tests; integrated admission/process tests remain P7/P9 |
| **P4** | Supervised Python bridge and lifecycle without real coding dispatch | P3 | READY/role checks; discussion process lifecycle; **isolated harness-only** coding simulator | G1/G7 **process-scoped** protocol, finite queues and failure; no real-task PASS |
| **P5** | Discussion, ModelGateway, model registry, context and safe consent UI | P4 | Real **non-file** discussion path, persisted replies/attempts, verified route; project-source reads gated until P6 | G3 discussion-only evidence; broker/disclosure proof deferred to P6/P9 |
| **P6** | Windows Project File Broker, bounded preview and inspection evidence | P5 | Main-owned scoped discovery/read; sensitive screening; broker-derived coverage | G6 real Windows containment and disclosure proof |
| **P7** | Explicit task proposal/admission, actual coding child and safe cancellation | P6 + **verified minimum real engine lifecycle/terminal evidence** and separate engine-hook approval if needed | Working Run Task with real `AgentOS`; 1 active + ≤20 queued; safe cleanup and truthful outcome/uncertainty | G2/G4 real engine/Windows descendant proof using minimum canonical event/outcome path; full Mission Control in P8 |
| **P8** | Authentic events, committed replay and Mission Control integration | P7 | Complete frozen nine-event ingestion/projections as supported by grounded engine hooks, worker timeline, Inspector and reload catch-up | G5 actual worker/event provenance, gap/conflict truth; preserve P7 task lifecycle proof |
| **P9** | Cross-contract hardening and Windows development-integrated acceptance | P8 | I08 and inherited suites, E2E, security/fault recovery, **applicability matrix** and evidence dossier | G0–G7, G8-dev, G9-dev by claimed tier; package-only cases remain honest NOT_RUN |
| **P10 — DEFERRED** | Bundled Python sidecar and clean Windows distribution verification | P9 + distinct packaging authorization | Signed/approved package as separately decided, clean install/reinstall/uninstall evidence | G8-package + applicable G9; no distribution claim before PASS |

### 5.1 P0 — Verified baseline and source readiness (read-only planning/intake)

**Deliverables:** frozen-reference matrix with original exact-byte SHA-256; current engine source SHA and diff versus previously reported C-01; list of engine public entrypoints and internal hooks for conversation context, coding task execution, worker events, cooperative cancellation and model routing; measured compatibility, without proposing secret access. Identify Windows toolchain, versions, test runners, local Python and isolated test profiles. Archive gaps such as the unavailable historical IIS-03 original without reopening its reissue.

**Blocking checks:** parent mismatch; original-byte evidence not complete for G0; contradictory Python API; missing live engine hooks requiring authorization; unclean/unidentified repo. Output a remediation request, not a silent code change.

### 5.2 P1 — Electron application shell and user experience

**Targets:** Dedicated local Windows Electron Main process, secure context-isolated Preload scaffold, React/TypeScript page composition; Dark Premium visual tokens; New Conversation state (no row created until first saved message), sidebar history/projects/settings, independent Agents page, composer model control, Right Dock Files/Terminal with Agent Logs presentation only. Window startup/maximize, responsive limits, keyboard access and reduced-motion rules follow NCD-01/02.

**Proof:** Windows actual UI screenshots and interaction tests, route and dock state mock-only behavior clearly labelled, dev build/run reproducibility, no web security regression, no unapproved PTY/Shell. **No fake worker activity or claimed completed Next Code task** in demonstrations. Any visible button for a not-yet-implemented operation is disabled or returns a clear typed unavailable result; test fixture values never enter the durable production conversation/task/event ledger.

### 5.3 P2 — Closed interfaces and process-wire validation

**Targets:** Implement closed and strongly typed `nextCode` Preload (23 Promise methods and three subscriptions only), trusted Main caller/frame validation, safe DTO boundary including `IIS-02-C01` conversation read extensions. Parser/serializer for five IIS-01 outer `type` values (`ready`, `request`, `response`, `event`, `error`), five frozen request actions, exact five-field envelope, unique IDs, role allowlists, bounded UTF-8 lines and fail-closed error translation.

**Proof:** Positive/negative fixtures for validation, protocol overflow, partial frames, forged method/channel, sender revalidation, wrong role and foreign correlation, stderr contamination. No Renderer raw Python/DB/OS access, no local TCP/HTTP bridge, no generic event API, no new token stream. **FFR-N04-F04:** Validate exact 23+3 shape and fail-closed unready methods using frozen errors; a skeleton façade is not authorization for Renderer to exercise later-stage task, file, provider or database operations, and it does not satisfy integration tests for those operations.

### 5.4 P3 — Transactions before processes

**Targets:** Main-owned SQLite single-writer coordination, WAL-consistent migrations/backup/recovery, normalized 22-table schema, original-result mutation receipts, `INTEGER PRIMARY KEY AUTOINCREMENT` message/task order, source-linked memory and confirmed decisions, provider consent, inspection observations, and task event stream metadata. Enforce `T1` durable message; `T2` exact-goal proposal admission; `T3` writer queue/cancel/lease; `T4` event commit/replay; `T5` discussion result/approval; `T6` consent. No transaction held open during Python spawn/network/slow reads.

**Proof:** Concurrent identical/different mutation keys, transaction abort/full/busy DB, startup migration and **WAL-consistent backup/verified restore**, invalid cross-project FKs, queue 21st rejection, unsafe lease retained after crash, conflict-sticky events, observation dedup, old-original response on retry after state changes. Do **not** implement unapproved reverse migrations: IIS-04 specifies forward-only deterministic migrations and fail-closed recovery. Use synthetic process/event fixtures for unavailable dependencies; record full G2 integrated admission/child and G7 recovery proofs as `NOT_RUN` until P7/P9. No runtime success falsely inferred from database records alone.

### 5.5 P4 — Private child-process supervisor

**Targets:** Main supervision of a long-lived non-executing `discussion` process and per-admitted-task `coding_task` children (the latter **simulated only in P4**); child-owned READY handshake with Main-observed process role and session; sanitized stderr, finite queues, byte/time limits, session isolation and deterministic failure/reconciliation. The Python bridge belongs to the Desktop integration boundary without granting arbitrary tools to discussion.

**Proof:** Actual Python subprocess transport and **isolated, labelled test harness** child simulator cases for incomplete line, duplicate IDs, wrong READY role, stdout chatter, hung child, late event, overlarge frame, crash before/after handshake, cancel-reserve/backpressure. Never expose harness-generated results as real user tasks, UI Mission Control activity or engine evidence; do not persist them in the production data store. Real coding hooks remain P7 work; do not claim G4 live integration from simulators.

### 5.6 P5 — Discussion and model integration

**Targets:** Explicit selected model/real effective provider, non-executing discussion request/response (not token stream), model registry/ModelGateway, bounded context retrieval and source-linked approved decisions. SQLite accepts the user message **before** provider call. The failed/uncertain provider attempt never erases an accepted user turn or silently retries after crash. A model-proposed task remains non-executable until user-initiated validated Run Task; no structured unapproved candidate decision ledger under C-02-C01.

**Proof:** At least one actually functioning selected model route **when a separately authorized test model/credential/network route is available**, strict no-silent-fallback/provider identity, local/offline browse and graceful model-unavailable state, immutable attempts, context isolation, user approval evidence, no same-turn retry UI/API, provider failure and ambiguous billing tests. Otherwise report model-route live acceptance `BLOCKED`, not PASS. **FFR-N04-F03:** Before P6's broker and Windows security gate is verified, there is **no project-file discovery/read/excerpt release through discussion**; broker commands remain closed/unready even if the provider/model works and a consent UI is present. Conversation text may be sent only under its separately authorized route and privacy conditions. External project source must not leave without matching real effective-provider consent; P6 later implements real project inspection.

### 5.7 P6 — Project File Broker, verified source custody

**Targets:** Windows safe project registration/canonicalization, scoped `project.discover`/`project.read` Python-to-Main requests and Renderer-only `projects.listFiles`/`projects.previewFile`; actual handle-based ancestor/root containment rather than string checks alone; safe text-range selection, reparse/junction/ADS/device rejection, layered sensitive-file/secret protection, bounded adaptive reads/queues, HMAC evidence keys, observation dedup, disclosure challenge/revoke race handling and truthful inspection coverage.

**Proof:** Actual Windows handle/TOCTOU fault tests; symlink, junction, case/alias and path mutation attack fixtures; synthetic secrets; double count and key-rotation regression; cursor invalidation; local handoff evidence distinguished from unknown actual provider receipt; consent revoked before send blocks future transmissions. Any verified root escape or source leak is P0 and blocks progress.

### 5.8 P7 — Atomic Run Task and real Next Code engine

**Targets:** One Main-issued, expiring, project/conversation/workspace/exact-goal-bound `proposalId` (displayed using approved `conversations.read` projection). Explicit user click invokes `proposals.confirmRun`; T2 commit precedes any Python child. Queue FIFO with canonical-workspace safety; **at most one active Coding task globally plus 20 queued**. Real engine invocation uses previously implemented `ConversationContext` C-01 only within its frozen optional envelope. Cooperative task cancellation is request-not-success, actual `AgentOS` outcome and OS cleanup are independent proofs; uncertain descendants retain blocked lease.

**Proof:** Live harmless test task through real `AgentOS`, with **real verified start/terminal/outcome and cancellation/cleanup evidence** (canonical IIS-01 events or permitted verified supervisor/engine observations), not only a mock `task.execute` success. Double-click, reload, queue capacity, alias collision, process death/orphan descendants on Windows, cancel/terminal race, no auto-rerun, no writer release by timeout or missing PID. **FFR-N04-F02:** G4's grounded engine lifecycle proof is a P7 prerequisite and exit gate; if the required minimal instrumentation is missing, stop with a separate **engine-change approval request**. P8 may add the full worker/event stream and Mission Control UI, but cannot retrospectively make a P7 simulator an accepted real engine invocation. If a live task remains uncertain, surface `unknown`/reconciliation rather than claim completion.

### 5.9 P8 — Verified events and Mission Control

**Targets:** Real typed worker/task events from instrumented Next Code; Main checks bound task/process/session, canonical data and sequence, persists in SQLite before IPC notification; UI subscribes before snapshot and merges bounded updates with page re-read; `completeThrough`/`maxSeen` and gap/conflict statuses remain truthful. Agent timeline supports temporary worker identities and their actual reports; no fabricated agents or implicit worker ordering. Task status, engine outcome and verified OS cleanup are displayed as separate facts.

**Proof:** Events from real engine, not parsed stderr; forged/stale/conflicting events rejected, exact duplicates deduplicated, missing sequence exposed, conflict not downgraded without documented reconciliation, reload/navigation/window close doesn't cancel or restart coding; large feed remains bounded and accessible. Verify applicable E05-01–E05-36 cases.

### 5.10 P9 — Full Windows integrated acceptance

**Targets:** All applicable inherited contract suites and `I08-T01–T88` plus `E2E-01–08`, independent evidence for actual OS process safety, provider routing, SQLite consistency and broker security; reproducible Windows/SQLite/Python/Electron environment; UI accessibility, resource, crash and long-running navigation verification. Run with isolated synthetic repositories and credentials. Absolutely no destructive test on a real user project or original Next Code history.

**Proof:** Gate-by-gate disposition G0–G7 and G8-dev, and G9 appropriate to the **development-integration tier**, with `G8-package: NOT_RUN — FUTURE DISTRIBUTION`. **FFR-N04-F06:** Build a row-level applicability ledger for all I08-T01–T88, E2E-01–08 and inherited cases: which pass under development, which are blocked and which are package-only `NOT_RUN — FUTURE DISTRIBUTION`. The latter are not marked N/A or passed merely because v1 development excludes P10. For dev-tier G9, every *mandatory dev-applicable* case must be evidenced, and any security-critical unsupported behavior is `BLOCKED`, not silently waived. No unauthorized P0/P1 exceptions; a residual P2 requires approved disposition, mitigation and provenance. Neither simulated engine events nor an unavailable model counted as successful live integration.

### 5.11 P10 — Separate future distribution and installer tests (out of current coding authorization)

**Targets only after explicit further authorization:** bundle the pinned Python runtime/bridge and needed dependencies for a normal Windows user machine without requiring their own Python installation; test clean install, first run, sidecar launch, upgrade, backup/recovery, rollback, signing/publisher/security details as separately agreed, and remove stale runtime safely without deleting users' saved conversations/projects. macOS/Linux and hosted backend remain outside v1.

**Proof:** Clean Windows machine G8-package plus relevant G0–G9 rerun; never substitute dev-local acceptance. No public distribution or package claim before separate owner go/no-go.

## 6. Frozen invariant crosswalk and responsible stages

| Frozen invariant | Source authority | Implemented primarily | Verified by |
|---|---|---|---|
| Dedicated Windows app; no generic agent platform | NCD-00/01/02 | P1 | UI scope review, G0/G5 |
| Task survives route/window navigation | NCD-01/02, IIS-02/03/05 | P1, P7, P8 | E05 + I08 UI/recovery |
| Main-only authorization; 23+3 closed API | IIS-02, IIS-02-C01 | P2 | G1, IPC negative tests |
| Private stdio JSONL, five types/five actions | IIS-01, C-03 | P2, P4 | G1, simulator and real child fixtures |
| Discussion only, no auto coding | C-02, IIS-06 | P5, P7 | G3/G4, Run Task tests |
| T1–T6 and 22-table database | IIS-04 | P3 primitives; P7/P9 integrated operations | G2, concurrency/fault tests |
| One active task globally, 20 queued, writer safety | IIS-03 REISSUE, IIS-04 | P3 fixture-level, P7 real supervisor | G2/G4 actual Windows evidence |
| Verified engine task lifecycle/terminal evidence; full events, durable UI replay | IIS-01/04/05, IIS-08 G4/G5 | P7 minimum real evidence; P8 complete timeline/replay | G4 then G5, 36 E05 tests |
| Source-linked memory and user-approved decisions | C-01/C-02, IIS-04/06, C-02-C01 | P3, P5 | G3, 52 I06 tests |
| Actual model route, effective-provider consent | C-02, IIS-02/04/06/07 | P5 model/text only; P6 broker/source release | G3/G6, source leak cases |
| Windows safe broker and observation truth | IIS-07, IIS-04 | P6 | G6, 56 I07 tests |
| Full integration and acceptance tiers | IIS-08 | P9, optional P10 | 88 I08, E2E, G0–G9 |

**No test substitution rule:** Earlier IIS specifications contain additional acceptance obligations not enumerated in the 36 + 52 + 56 + 88 named registers. The implementation matrix must link every frozen mandatory requirement, including those earlier suites, to one or more **actual** test results; do not assume the four named registers alone are exhaustive.

## 7. Stage completion evidence — mandatory handoff structure

Each stage handoff must contain the following sections, explicitly populated rather than placeholder text:

1. **Stage declaration:** `P#`, approved scope reference and date, executor/reviewer, acceptance tier, approved repo(s)/branch(es)/starting SHAs.
2. **Change manifest:** exact created/modified/deleted files, dependency changes, schema migration IDs, binary hashes if any; per-file reason linked to parent contract.
3. **Permission accounting:** list of authorized source path envelopes and all deviations; evidence original engine remains unchanged except specifically approved independent engine requests.
4. **Tests and environment:** command, Windows build/runtime version, fixture identifier/hash, case IDs, observed result (`PASS|FAIL|BLOCKED|INCONCLUSIVE|NOT_RUN|NOT_APPLICABLE`), and logged safe evidence path/hash; unexpected skips and N/A with explicit justification. **Separate stage-subset PASS from full gate PASS**, and record each deferred full G0–G9 requirement as `BLOCKED`/`NOT_RUN` until its actual dependency is proven.
5. **Negative/adversarial coverage:** attempts to cross the trust boundary, race admission/release, lose events, leak secrets or fake success appropriate to the stage; a test asserting `PASS` must show the *observed protected behavior*.
6. **Safety and rollback:** SQLite-consistent backup and **verified restore/recovery** plan (not unapproved down-migration), child cleanup/reconciliation proof, resource bounds, consent behavior and no-loss user data handling; do not run destructive recovery tests on real user projects.
7. **Review and disposition:** contract compliance, independent verification if available, outstanding issues by P0/P1/P2, owner decisions, `GO/NO-GO` for merge and next stage.
8. **Commit provenance:** `git status`, `git diff --check` (or justified equivalent), clean tracked diff, exact commit SHA(s), and assertion whether changes were merged. Do not invent hashes or unrun command output.

Each stage evidence report must explicitly separate **interface fixtures**, **Desktop integration**, **actual Next Code engine**, **real Windows OS security**, and **packaged Windows** observations. An absent higher-tier proof means `NOT_RUN`/`BLOCKED`, never a synthetic PASS.

## 8. Cross-contract fault and acceptance register

| Risk / adversarial condition | Mandatory observable safe outcome | Owner gate |
|---|---|---|
| Duplicate `clientMutationId` with changed payload | Reject without duplicate user message or second task; identical mutation returns original DTO | G2 |
| Failed SQLite commit followed by child launch attempt | No successful admission and no uncommitted task spawn | G2/G4 |
| Two concurrent Run clicks across project aliases | At most one active writer globally; one proposal consumed once | G2/G4 |
| Killed Main/child before or after task command | No silent rerun; state retained as uncertain; blocked lease until proof | G4/G7 |
| `task.cancel` accepted but descendants still writing | UI says requested/unknown; no false `cancelled` or safe release | G4 |
| Event gap or conflicting duplicate | Persist only valid evidence; gap visible; conflict sticky until verified reconciliation | G5 |
| Model selected A but sent to provider B | Reject or obtain effective-provider-specific consent before source disclosure; no silent provider fallback | G3/G6 |
| User revokes consent while source payload pending | Future unsent source cannot proceed; already handed-off content cannot falsely be retracted | G3/G6 |
| Junction/reparse/ADS/path swap around broker open | No escape beyond registered canonical workspace or unapproved secret disclosure | G6 |
| Renderer reload during task; subscription race | Task persists; committed-event catch-up with bounded buffer; no duplicate execution | G5/G7 |
| Unavailable real Next Code hook/model | Gate `BLOCKED`/`NOT_RUN`; no simulator-backed live success | G3/G4/G5 |
| Python developer runtime works but bundled sidecar not tested | G8-dev may pass; G8-package remains future `NOT_RUN` | G8 |

## 9. Risk log, escalation and change-control path

- **RISK-N04-01 — Original source artifact provenance:** old Library `.txt` projections do not substitute for exact original bytes. Block sealed implementation G0 until evidence is collected or an explicit owner disposition authorizes a *new* prospective substitute. Historical absence must remain documented.
- **RISK-N04-02 — Engine observability:** real worker progress/cancel hooks might be absent. Establish actual API inventory in P0; later make a separately authorized minimal engine change request with compatibility tests. Never fabricate workers or parse stderr to compensate.
- **RISK-N04-03 — Windows process cleanup:** a killed parent may leave descendants. Validate actual process-tree cleanup under race/fault injection. Unknown processes block writer lease; don't use TTL alone to unlock.
- **RISK-N04-04 — Project source escape/secret disclosure:** require actual Windows handle containment and multilayer screening before authorizing real user projects and external provider disclosure.
- **RISK-N04-05 — Local provider/model unavailability:** record safe degradation, not a mandatory dependency on paid/cloud inference or a false 'model completed' outcome.
- **RISK-N04-06 — Premature bundling / scope creep:** avoid installer/UI polish or generic platform abstractions while core trust boundaries remain unverified; no interactive terminal or extra public IPC without separately approved contract change.
- **RISK-N04-07 — Schema/protocol drift:** build fixtures from frozen IIS-01/02/04 and addenda; any required new field/method/command/table triggers a numbered change request and owner review before code.
- **RISK-N04-08 — Evidence gaps:** acceptance reports distinguish source fact, inferred behavior and test-observed behavior; all P0/P1 safety cases must have reproducible evidence before release acceptance.
- **RISK-N04-09 — Circular integration gate:** P7 may not claim real G4 completion based on worker/terminal events only planned in P8; implement/verify minimal real task-lifecycle evidence in P7, and gate on required engine hook approval.
- **RISK-N04-10 — Premature source release and paid calls:** P5 provider connectivity cannot turn unverified broker reads into authorized project disclosure; provider billing/credential/network permissions are separately scoped.

**Issue workflow:** `OBSERVED → REPRODUCED → TRACED_TO_CONTRACT → PROPOSED_FIX → OWNER_AUTHORIZED_IF_SCOPE_CHANGE → IMPLEMENTED → VERIFIED → DOCUMENTARILY_CLOSED`. A non-reproducible issue is `INCONCLUSIVE`, not silently closed.

## 10. Boundaries of engine modifications and reproducibility

The original Next Code repository remains the authority for `AgentOS` and its internal checkpoints. The only previously reported implemented Desktop-related work is **C-01 — optional ConversationContext**, with historical main SHA `834d0ca62cc9b2c03e530bafe4090024d98f31d3`; current repository reality must be rechecked before code. Do not reinterpret C-01 as authority to automatically modify engine internals for P4/P7/P8.

When source inspection shows a needed engine hook, a separate request must specify: exact existing API deficiency, noninvasive interface objective, candidate files and expected changes, old-behavior regression set, golden traces if present, Windows integration impact, fallbacks on unsupported engines, risk of side effects, exact starting SHA and tests, and explicit owner approval. The default is **zero changes** outside the newly authorized Desktop repo.

**No dependency on an implementation brand/tool:** Use any qualified implementer after scope authorization, with the same verification, independent review and release evidence. Original source IP, secrets, private user project data and provider credentials must not be passed to an external implementation service unless the user separately authorizes that disclosure.

## 11. Stage handoff / owner authorization template

```text
NEXT CODE DESKTOP — REQUEST TO AUTHORIZE STAGE P#
Normative contract baseline: [manifest file and verified hash]
Current authorized repositories and SHAs: [exact values]
Stage objective and precise allowed outputs: [bounded list]
Permitted file paths / allowed code changes: [explicit]
Forbidden changes and outside-scope files: [explicit]
New dependencies, secrets, network or OS effects: [explicit]
Tests authorized for this stage: [IDs + environment]
Required independent evidence and negative tests: [IDs]
Failure/rollback condition: [description]
Authorization requested: IMPLEMENTATION OF STAGE P# ONLY
Merge authorization: SEPARATE unless explicitly included in user's instruction
Owner decision: PENDING — no code permitted yet
```

Approval of one stage does not pre-authorize any later stage, additional engine modifications, publishing/distribution, or unsafe tests on real user data.

## 12. NCD-04 review and decision gates — owner disposition

**NCD-04 frozen planning status:** The previously proposed staged sequence and stage obligations have completed their documentary review and owner freeze. This section records the approval history and subsequent execution permissions, which remain separate:

1. **COMPLETED:** `NCD-04 / FFR-01 — Final Consolidated Documentary Review` checked the phase plan against available frozen NCD-00–03, IIS-01–08, approved narrow addenda and FCCR-01-C01. The result was a conditional documentary pass, with nine corrections incorporated in Draft v0.2 and N04-H01 retained.
2. **COMPLETED:** Owner explicitly approved corrections **N04-F01–N04-F09**, then separately instructed **freeze NCD-04 v1.0**. The canonical frozen plan and independent hash-bearing freeze record are the current planning authority; this does not freeze or authorize code.
3. Seek a **separate P0 input-intake authorization** when the owner is ready. Resolve exact-original-byte evidence and confirm engine source facts; this may require a revised implementation baseline and a further owner approval if source reality materially differs from plan assumptions.
4. Request P1 and subsequent implementation approvals **one stage at a time**, with evidence and audit at each stage. No implicit transition because tests passed, and no commitment to a speculative completion calendar.
5. Development-tier release go/no-go occurs after P9 and IIS-08 G9 proof. P10/package/public release requires separate explicit authorization and acceptance.

### Documentary exit checklist (not a runtime acceptance)

- [x] No new product/platform scope, cloud service, plugin host, IPC command or JSONL action invented.
- [x] Stages include real engine, real provider (when supported), real Windows security and crash proofs, not just simulated tests.
- [x] IIS-03 REISSUE used as authority while lost historical original remains disclosed.
- [x] Frozen source/privacy and retention decisions left unchanged.
- [x] P0 original-file intake, separate source modification permissions and owner stage authorizations stated.
- [x] Distinguish dev-tier and distribution-tier acceptance and never call unexecuted tests PASS.
- [x] NCD-04 FFR-01 consolidated documentary review completed with bounded corrections N04-F01–N04-F09 (see §13 and the independent FFR-01 report).
- [x] Owner separately approved the corrections and the NCD-04 v1.0 documentary freeze; independent freeze record issued.
- [ ] Any specific implementation stage separately authorized.

**Final v1.0 disposition: FROZEN DOCUMENTARY IMPLEMENTATION PLAN / OWNER APPROVED / NO IMPLEMENTATION AUTHORIZED. P0 original-byte evidence remains unsatisfied and is a mandatory implementation-intake hold, not a newly approved architecture change.**

## 13. FFR-01 — Consolidated review corrections and remaining holds (2026-10-20)

This is a **documentary engineering review**, not a Windows run, repo audit, deployment, source-level engine hook inspection or an IIS-08 executable gate PASS. Findings are localized to the proposed implementation plan; none grants new IPC, wire, SQL, process, file-system or LLM egress authority. All nine were incorporated in the reviewed v0.2 source, explicitly accepted by the owner, and carried into this frozen v1.0 plan; no run-time validation is inferred.

| Finding | Review disposition in Draft v0.2 | Preserved parent boundary |
|---|---|---|
| **N04-F01** | Clarify P3 SQLite fixtures vs late-stage integrated T1–T6 behavior, and stage vs G2 PASS | IIS-04 T1–T6; IIS-08 G2 |
| **N04-F02** | Require grounded minimal engine lifecycle/terminal/cancel evidence in P7 before claiming G4; P8 owns broader Mission Control and worker event UI | IIS-01/03/05; IIS-08 G4/G5 |
| **N04-F03** | Explicitly disable project-file release in P5 until P6 real broker checks | C-02, IIS-06/07 |
| **N04-F04** | P1/P2 partial UI/IPC methods disabled/fail closed; mocks never count as actual task/event/history | IIS-02, IIS-05 |
| **N04-F05** | P0 original-byte evidence gap remains a HOLD; any impossible historical file needs separately approved, disclosed prospective substitution | FCCR-01-C01, IIS-08 G0 |
| **N04-F06** | Row-level dev/package applicability for all inherited, E2E and I08 tests; avoid N/A/false package PASS | IIS-08 G8/G9 |
| **N04-F07** | Name paid provider/network, credentials, Windows fault tests and external side effects in each stage authorization | Owner implementation control; C-02/IIS-06 |
| **N04-F08** | Do not describe forward-only SQLite migration recovery as unsupported reverse migrations; require consistent backup and verified restore | IIS-04 v1.0 |
| **N04-F09** | Label supervisor/task simulator artifacts as harness-only, never authoritative user history; defer full G4/G7 proof | IIS-03/05/08 |

**Historical FFR-01 review result:** **CONDITIONAL PASS**, followed by explicit approval of **N04-F01–N04-F09** and subsequent owner freeze directive on 2026-10-20. No new confirmed parent-contract contradiction requiring architectural changes was found in the inspected documentation. This is not formal proof that all upstream artifacts or implementation hooks are present. The resulting freeze accepts this phase plan only; it does **not** authorize P0, P1, code, new repository, credential access, provider calls, Windows fault injections or engine modifications.



---

## 14. Owner-approved v1.0 documentary freeze declaration — 2026-10-20

**Owner authority:** After explicitly accepting **N04-F01–N04-F09** in the separate corrections approval record, the owner issued the distinct instruction «اجل اوافق على التجميد» to freeze NCD-04. This section changes only the document's approval/disposition status from Draft v0.2 to **FROZEN v1.0**.

**Canonical operative scope:** Sections 1–13 as disposition-updated in this v1.0 file define the approved stage sequencing and evidence requirements **P0–P9**. **P10** remains deferred and requires separate distribution authorization. The exact Draft v0.2 source is archived byte-for-byte; the frozen file does not silently supersede or change NCD-00–03, IIS-01–08, their frozen addenda, or FCCR-01-C01.

**Remaining holds:** **N04-H01 remains OPEN** (exact-byte upstream provenance / separately approved prospective substitutes plus current engine audit under distinct P0 authorization); **N04-H02 NOT_RUN** (real Windows, engine, integration and provider proofs); **N04-H03 DEFERRED** (bundled Windows distribution and packaging). Freeze does not assert any IIS-08 G0–G9 executable PASS or change the historical-original limitations stated in FCCR-01.

**Non-authorization:** **NO source audit, repository creation, code editing, dependency installation, test execution, Git commit/merge, engine change, paid provider call, data disclosure or packaging** is authorized by freezing a planning document. Each stage, including read-only P0, requires its own explicit, bounded owner authorization, respecting the stage handoff template in §11.

**Audit:** The separate `NCD-04-FINAL-FREEZE-RECORD.md` identifies this frozen file by its exact SHA-256 and records the owner approval sequence, source Draft v0.2, FFR-01 report and pending limitations without attempting to rewrite history.
