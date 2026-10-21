# NEXT CODE DESKTOP — NCD-03 / IIS-08
## Integration Testing & Acceptance — Cross-Contract Verification, Fault Injection, Windows Security Gates, Evidence and Release Readiness

**Status:** **FROZEN v1.0 — OWNER-APPROVED DOCUMENTARY DESIGN / NOT IMPLEMENTED**  
**Date:** 2026-10-20  
**Authority:** NCD-00 (+ NCD-00-C01), NCD-01, NCD-02, NCD-03/C-01, C-02 (+ C-02-C01), C-03, and **IIS-01 through IIS-07 FROZEN v1.0** (including IIS-02-C01).  
**Implementation authority:** **NONE**. This document designs future verification; it does **not** authorize creating or changing Desktop/engine source, performing runtime tests, running installers, committing, migrations or deployment.  
**Provenance:** Written using available frozen design texts and their owner-approved narrow addenda. No claim that the Next Code engine already supplies all planned event hooks, cancel hooks, ModelGateway dynamic routing, Windows containment or distribution packaging.  
**Tool neutrality:** Requirements apply regardless of the external coding agent, IDE or executor selected after separate authorization.  
**Approval workflow:** Draft v0.1 → FFR-01 consolidated review → corrected Draft v0.2 → **explicit owner authorization to freeze v1.0 on 2026-10-20** → independent Final Cross-Contract Review → separately authorized implementation/verification plan. **FFR-01 and the freeze are documentary only, not executed verification.**

---

## 1. Objective, product release and exclusions — IIS08-D01

IIS-08 defines **how** an eventual authorized implementation of Next Code Desktop will be independently verified across boundaries; it does not define another subsystem, add runtime powers, prescribe a general automation host or replace frozen component test plans. The product remains a **dedicated local Windows Electron + React/TypeScript interface for the existing Python Next Code engine**. The Main-owned SQLite, typed Preload and supervised private stdin/stdout JSONL architecture are fixed.

**Release-level acceptance claims require reproducible evidence of:**

1. Honest and durable conversation, selected-model behavior and cross-turn context; discussion never executes code without an explicit user Run Task.
2. Atomic, single-use proposal admission; **one active coding task globally**, no more than **20 queued**, canonical workspace writer safety and process-tree reconciliation.
3. Real, instrumented task/worker evidence visible through committed SQLite replay and honest uncertainty on gaps/crashes; UI navigation cannot affect task lifecycle.
4. Safe, Main-authorized project discovery/preview, scope and secret controls, consent-bound provider disclosure, truthful inspection coverage and Windows handle-level containment.
5. Renderer IPC privilege separation, finite memory/queue/process resource use, safe failure, recovery, maintainable accessibility and verifiable build provenance.
6. Honest handling of deliberately deferred v1 features; no pretending they work through mock data.

**Explicit non-goals:** authoring SQL DDL, source implementation, a new Python command, a 24th IPC method, a fourth subscription, a 23rd SQLite table, token streaming, same-turn discussion retry UI, universal per-LLM egress filtering, Windows OS sandbox certification, macOS/Linux support, generic multi-agent plugins or interactive PTY activation without a separate security design and acceptance. IIS-08 is neither a release declaration nor a substitute for IIS-01–IIS-07's executable tests.

## 2. Normative source ledger and precedence — IIS08-D02

| Contract | Verification authority inherited from the frozen design | Concrete program proof |
|---|---|---|
| NCD-00 / C01 | Dedicated Next Code, one local Windows app, honest model/agent controls, sidebar navigation, repo separation | Product scope and no unauthorized repo drift |
| NCD-01 | Premium dark UI, New Conversation, Right Dock, Agents/Mission Control, accessibility, responsive matrix, route-independent tasks | Renderer/Electron automated and human QA |
| NCD-02 | Main/Preload/Renderer/Python boundary, private JSONL pipes, local storage, Windows packaging scope | Dependency inspection, sandbox and process tests |
| NCD-03/C-01 | Optional bounded `ConversationContext` integration in existing Next Code engine | Real two-turn coding-context propagation, no prior-task execution inheritance |
| C-02 + C-02-C01 | Discussion-only, context/source and approval provenance, v1 **deferral** of structured *unapproved* decision-candidate persistence | Source-backed context, authorized decision only; no false candidate registry claims |
| C-03 | Distinct discussion and per-task coding processes, broker/ModelGateway, no implicit execution | Cross-process identity, capability and lifecycle tests |
| IIS-01 | Five top-level `type` values (`ready`,`request`,`response`,`event`,`error`), exactly five named actions, closed schemas and bounded JSONL | Shared golden fixtures and adversarial wire parser |
| IIS-02 + IIS-02-C01 | Exactly **23** Promise methods, **3** typed subscriptions, typed DTOs; `conversations.read` bounded `availableProposals` + `discussionTurns` addendum | Real Preload + Main contract conformance, no new authority |
| IIS-03 | READY-gated child/session lifecycle, one active + 20 queued, cancellation and Windows descendant cleanup | Real processes, injected hangs/crashes, safety evidence |
| IIS-04 | **22** SQLite tables, T1–T6 atomic operations, original immutable mutation result, task event/inspection evidence and crash reconciliation | SQL/migration/transaction, WAL recovery and race tests |
| IIS-05 | **Nine** approved coding task event subtypes, committed replay, gap/conflict and Worker Inspector truth, bounded UI catch-up | Grounded engine instrumentation + UI reconnection |
| IIS-06 | Model registry/route, selected-model integrity, durable attempts, consent, summary and decision evidence, no same-turn retry UI | Stub and verified supported real routes, privacy and failure tests |
| IIS-07 | Two broker actions (`project.discover`,`project.read`), two renderer read APIs, closed Windows path/secret/consent/budget evidence | Real Windows handle/race/secret corpus and handoff tests |

**Precedence:** An express, owner-approved narrow addendum controls only its defined scope; it does not unfreeze unrelated parent provisions. If a new test expectation conflicts with a frozen parent, **mark it `CONTRACT_CONFLICT` and escalate**; do not change the parent silently or weaken an existing test. Test IDs from prior contracts remain normative and are **not renumbered, replaced or considered executed** by the IIS-08 examples. A single executable test may generate evidence for multiple IDs only with explicit traceability.

**Documentary input qualification and recorded limitation (FFR08-R01):** Use canonical frozen text, addenda and freeze records as a set. The available IIS-03 file currently bears a historical **DRAFT v0.1** header while owner handoff identifies IIS-03 as FROZEN v1.0; the specifically named IIS-03 Final Freeze Record and its exact hash were **not independently available for comparison during this FFR**. This is **not evidence that IIS-03 is unfrozen**, but it forbids claiming hash-verified IIS-03 baseline or closing G0 today. Obtain and verify its actual freeze record/canonical artifact before implementation-baseline acceptance and the later cross-contract freeze. Never rewrite or assume a hash. All accessible frozen texts have precedence according to their approved freeze records and narrow addenda.

## 3. System-under-test, trust cut and independent observers — IIS08-D03

```text
User → React Renderer → narrow Preload (23 methods / 3 subscriptions)
                         ↓ typed, revalidated IPC
                   Electron Main (authority)
                  /        |        \
             SQLite    File Broker    Model Registry/credentials
                  \        |        /
                        Supervisor
                             |  private UTF-8 JSONL stdin/stdout
              +--------------+----------------+
              ↓                               ↓
        Python discussion                Python coding_task (per approved task)
        ModelGateway                     existing AgentOS + workers
        broker requests → Main          authentic engine events → Main SQLite
```

**Test observer independence:** Renderer component state and model-written text cannot certify an engine event, user consent or OS cleanup. A test must obtain evidence at the **authoritative boundary**: Main transaction receipts/committed DB rows, supervised child identity and process handles, actual provider-route capture, trusted broker handle policy, or user input via accepted IPC. Fixtures/stubs prove **interface behavior** but cannot by themselves prove live Next Code instrumentation, provider capability, Windows process cleanup, or file containment.

**Minimum fixture families:**

- Deterministic Python child simulators for valid/invalid READY, JSONL framing, delayed/split records, out-of-order task events, saturation, cancellation, exit and stderr contamination.
- Main/SQLite temporary isolated per-test user-data profile, seeded 22-table schema through real future migrations, controllable DB write failures and WAL-consistent backup/restore.
- Registered Windows project fixtures including case aliases, junction/reparse points, ADS/device names, safe ordinary text, credential samples, concurrent writers and untrusted source prompt injections. **Synthetic credentials only**.
- Deterministic local ModelGateway test routes with captured effective provider, consent class and payload boundaries; opt-in live provider smoke tests using separately provided nonproduction credentials.
- Actual Next Code engine integration fixture plus an observable controlled test task; when an instrumentation capability is absent, set the relevant gate **BLOCKED**, not pass with simulator output.
- Renderer reload/window close, UI resizing, 125% Windows scaling, keyboard navigation and reduced-motion harness.

No fixture IDs or synthetic `TaskOutcome` records may be surfaced in an end-user production history as real evidence.

## 4. Test taxonomy, severity and executable stage gates — IIS08-D04

| Gate | Required evidence and stage | Exit rule |
|---|---|---|
| **G0 — Baseline integrity** | Owner-authorized code phase, frozen docs/hashes, repo baseline/commit SHA, approved test environment | Missing approval/hash, drift or unreviewed conflict → BLOCKED |
| **G1 — Contract and isolation** | Closed JSONL, IPC/DTO, import/dependency, child-role and negative authorization tests | Zero critical unauthorized actions or undocumented public interfaces |
| **G2 — Persistence/admission** | Real 22-table migration, SQLite T1–T6, crash window, dedup, lease/slot and consent races | Zero false persist/admission/release claims |
| **G3 — Discussion/model** | True provider binding for advertised model, durable attempts and context, read-only discussion, source consent | No silent fallback, provider/source mismatch or implicit execution |
| **G4 — Coding supervisor** | Actual `AgentOS` task, real instrumented evidence, cancel during run, Windows descendants, 1+20 capacity | No dual writer, auto-rerun or unverified cleanup; missing hooks → BLOCKED |
| **G5 — Mission Control/UI** | Commit-before-push, replay/gap/worker attribution, navigation, responsive/accessibility matrix | No fabricated outcome/activity; navigation never restarts/stops task |
| **G6 — Windows broker security** | Actual Windows ancestor-handle TOCTOU, reparse/alias/ADS/secret scanning and evidence handoff | Any reproducible root escape/secret leak/unproven containment → BLOCKED |
| **G7 — Resilience and limits** | Inject child/Main/DB crash, provider failure, saturation, stale consent and repeated launch | Recovery truthful, finite bounded memory/resources, no unsafe startup |
| **G8 — Runtime / packaging by acceptance tier** | Development: verified configured Python runtime. Distribution (only if separately authorized): bundled sidecar on a clean Windows installation, with no developer Python requirement | **Development-integration acceptance:** report G8-dev results and G8-package as `NOT_RUN — FUTURE DISTRIBUTION`; **packaged/distribution acceptance:** G8-package is mandatory PASS, never N/A merely because packaging failed |
| **G9 — Final acceptance** | All mandatory inherited tests + IIS-08 cases, manifest, independent review and approved deviations | PASS only with traceable actual evidence; documentary design alone never qualifies |

**Severity:** `P0` = privilege escalation, unauthorized Run Task/file send, false success, double writer, fake cleanup, data corruption/destruction, root escape, credential disclosure, unreconciled critical event. `P1` = durable behavior, lost/doubled authoritative history, broken cancellation/progress, source-count misinformation, uncontrolled resources or restart; `P2` = recoverable UI/a11y/polish or diagnostic issues with no safety impact. Severity is assigned by **effect**, not by test group. **P0/P1 cannot be waived automatically**: any exception requires explicit owner security/architecture disposition before acceptance. A `P2` exception requires documented severity, impact, mitigation and owner approval; no generic “mostly passed” release claim.

**Results vocabulary:** `NOT_RUN`, `PASS`, `FAIL`, `BLOCKED`, `INCONCLUSIVE`, `NOT_APPLICABLE` (only with approved applicability and evidence). Distinguish `DESIGN_REVIEW_PASS` from `EXECUTABLE_PASS` in every summary. `NOT_RUN — FUTURE DISTRIBUTION` is an explanatory subtype of `NOT_RUN`, **not** a seventh executable verdict. A `NOT_RUN` gate cannot be silently re-labeled `NOT_APPLICABLE` to obtain packaged acceptance. An injected failure is a PASS **only if the observed safe behavior matches the expected outcome** and evidence exists.

## 5. Deterministic execution, evidence isolation and clean-room constraints — IIS08-D05

1. Record `test_id`, parent requirement IDs, fixture/environment version and hash, source commit(s), Windows build, Electron/Node/Python/SQLite versions, runtime location and packaging mode, timestamps, test command, result and evidence URI or content-addressed digest. Avoid leaking absolute home paths, project secrets, provider keys or whole raw prompts in artifacts.
2. Maintain distinct logical test environments: (A) unit/contract fixtures, (B) actual Windows local integrated app, (C) clean packaged Windows app and (D) optional external-provider route verification. Evidence from A **cannot substitute** for B/C proof. No live provider dependency for tests that can be deterministic; provider billing, lost reply and duplicate send risk are explicitly recorded.
3. Test outputs are immutable per run and redact sensitive literals. Keep sanitized event excerpts and SQL query summaries rather than exposing credentials/raw project files. Preserve independently checkable log hashes; if redaction destroys the fact needed, record a trusted local assertion and hashed source fixture rather than publishing secret bytes.
4. Fail injection must target a named boundary: before/after SQLite commit, after payload prepared but before pipe write, after pipe write but before evidence commit, READY pre/post, child startup/exit, timeout/cancel, process-tree verification or provider handoff. A test cannot assert a crash window it did not actually control/observe.
5. Provide clean per-test registered projects and unique IDs. Reset only disposable test profiles and fixtures; NEVER reset/erase a user database or the real Next Code repository as a shortcut. Use SQLite backup API / WAL-consistent snapshots for migration/restore cases.
6. Separate tests requiring Windows security handles and installer state from cross-platform TypeScript/Python validators. An untested Linux/macOS run does not certify Windows behavior.
7. Cap test log payloads, in-memory queues and fixture source sizes; high-volume testing must not itself disable the frozen critical-event backpressure/cancel reserve logic.
8. Real original-engine code modifications, if proven essential for instrumentation, supervisor cancellation or model route selection, remain **individually unauthorized until a separate owner-approved work item** names the exact change. The C-01 implementation and its reported historical test count do not certify the new Desktop integration.

## 6. Integrated acceptance case register — IIS08-D06

The **88 integrated scenarios I08-T01–I08-T88** below test boundaries **between** contracts. They add evidence granularity but do not cancel, reduce, rename, or supersede the existing positive/negative matrices in IIS-01, IIS-02, IIS-03, IIS-04, the **36 IIS-05** cases (`E05-01…E05-36`), the **52 IIS-06** cases (`I06-T01…I06-T52`), or the **56 IIS-07** cases (`I07-T01…I07-T56`). If cases overlap, evidence can be cross-linked only after the underlying frozen test is genuinely exercised.

For each test: **actual expected source + negative injection + durable/OS evidence** must be entered in the run manifest. Parent listed in the second column is the primary trace; the full trace map can reference additional frozen subsections. `P0/P1/P2` indicates proposed severity of the named failure, subject to confirming its real impact.

### A. Baseline, traceability and trust

| Test ID | Frozen source | Stimulus / fault | Pass condition | Priority |
|---|---|---|---|---|
| **I08-T01** | NCD-00/NCD-02 | Verified frozen checksum + addenda and source SHA manifest | Reject undocumented parent drift or unknown version | P0 |
| **I08-T02** | NCD-00/C-01 | Desktop repo independent of original engine | No unauthorized engine edits; compare before/after SHA | P0 |
| **I08-T03** | NCD-02/C-03/IIS-06 | No unauthorized local TCP/HTTP *Python bridge*, direct SQL Renderer, or unauthorized provider bypass | Inspect socket/service bindings and imports; **approved outbound provider HTTPS through ModelGateway remains permitted** | P0 |
| **I08-T04** | IIS-02 | Preload sandbox, contextIsolation, Node off | Renderer cannot import Node, spawn Python, use OS handles | P0 |
| **I08-T05** | C-02/IIS-06 | Discussion process attempts execution, write tool or Worker dispatch | Main bridge and public UI grant no executable authority | P0 |
| **I08-T06** | IIS-01/IIS-02 | Inventory all public actions and message types | Only fixed 5 JSONL actions/5 envelope types/23 methods/3 subscriptions | P0 |
| **I08-T07** | IIS-04 | Schema introspection and migration history | Exactly 22 expected tables, stable relations, foreign-key validation | P1 |
| **I08-T08** | IIS-02-C01/C-02-C01 | Verify narrow addenda only | No same-turn retry/candidate registry invented; parent semantics intact | P1 |

### B. JSONL framing and correlation

| Test ID | Frozen source | Stimulus / fault | Pass condition | Priority |
|---|---|---|---|---|
| **I08-T09** | IIS-01 D1/D9 | Positive full five-key envelope over stdin/stdout | Valid UTF-8 newline-delimited exact typed record only | P0 |
| **I08-T10** | IIS-01 D2 | Duplicate READY, incorrect role/version or pre-READY request | Child unavailable; task/broker never invoked | P0 |
| **I08-T11** | IIS-01 D9/D13 | Unknown keys, duplicate JSON keys, `kind`, malformed UTF-8, non-LF partial frame | Reject/fail within finite buffer; no side effects | P0 |
| **I08-T12** | IIS-01 D2/D13 | Cross-session correlation or duplicate wire message_id | Reject before DB event dedup or response mutation | P0 |
| **I08-T13** | IIS-01 D3/D4 | Coding child sends broker call; discussion child sends task.execute | Strict direction/role rejection before effect | P0 |
| **I08-T14** | IIS-01 D14 | 262,144-byte frame overflow / bounded parser deadline | No unbounded RAM, fake READY or state commit | P1 |
| **I08-T15** | IIS-01 D13 | Invalid result, extraneous subtype, lossy `mtime_ns` | Strict schema error; no ungrounded task or source state | P0 |
| **I08-T16** | IIS-01 D7/D14 | Inflight/read/write queue saturation; reserved cancel path | Bounded pressure; control remains serviceable or safe failure | P1 |

### C. Electron IPC and presentation rights

| Test ID | Frozen source | Stimulus / fault | Pass condition | Priority |
|---|---|---|---|---|
| **I08-T17** | IIS-02 | Valid allowed method typed invocation | Main revalidates sender and result DTO | P1 |
| **I08-T18** | IIS-02 | Forged sender/frame, unknown channel, prototype/function arg | Reject with no OS/db side effects | P0 |
| **I08-T19** | IIS-02 | Same sender switching project while task A active | No retrospective retargeting of A | P0 |
| **I08-T20** | IIS-02/IIS-04 | First send persistence and renderer reload between request/ack | Same immutable MessageAcceptance and one user message | P1 |
| **I08-T21** | IIS-02-C01 | Valid stored proposal appears on `conversations.read` | Only Main ID; new click still requires T2 check | P0 |
| **I08-T22** | IIS-02-C01 | Expired/foreign proposal, >40 eligible, page-bound turns | Correct filtering/truncation; no forged Run authority | P0 |
| **I08-T23** | IIS-02-C01/IIS-06 | Restored turn statuses and latest known attempt | No invented retry/answered status after restart | P1 |
| **I08-T24** | IIS-02 | Three subscriptions unsubscribe/reload behavior | No task cancellation, Python rerun or scope-leaking broadcast | P0 |

### D. SQLite atomicity, state and provenance

| Test ID | Frozen source | Stimulus / fault | Pass condition | Priority |
|---|---|---|---|---|
| **I08-T25** | IIS-04 T1 | Concurrent first-send same mutation id | One message/turn/receipt; original result snapshot replay | P1 |
| **I08-T26** | IIS-04 T1/T2 | Same mutation ID altered model/text/project/goal | BAD_INPUT/NOT_AUTHORIZED; no duplicate or broadened scope | P0 |
| **I08-T27** | IIS-04 T2 | Two simultaneous Run clicks on one proposal | One consumed proposal, one task, one slot/queue admission | P0 |
| **I08-T28** | IIS-04 T2/T3 | 21st queued task or one-active collision | Hard 1 active + <=20 queue; rejected proposal remains unconsumed | P0 |
| **I08-T29** | IIS-04 T3 | Global slot free but canonical workspace blocked | No writer lease bypass, no spawn until verified safe | P0 |
| **I08-T30** | IIS-04 T4 | Same event id/seq/payload and conflicting duplicates | Exact dedup; sticky integrity conflict; immutable original event | P0 |
| **I08-T31** | IIS-04 T5/C-02-C01 | Unapproved candidate/summary vs verified user approval | Only same-conversation explicit approval becomes authoritative | P0 |
| **I08-T32** | IIS-04 T6 | Consent challenge forged/expired/revoked/provider changed | Persist valid change atomically; stale send never newly authorized | P0 |

### E. Discussion, model and context

| Test ID | Frozen source | Stimulus / fault | Pass condition | Priority |
|---|---|---|---|---|
| **I08-T33** | IIS-06 | Real selected model route vs registry | Effective provider and chosen model match; no silent fallback | P0 |
| **I08-T34** | IIS-06 | Unsupported model or missing credentials | Sanitized MODEL_UNAVAILABLE / provider error; no secret leak | P1 |
| **I08-T35** | IIS-06/IIS-04 | User message and discussion attempt commit/dispatch sequence | LLM is not issued before durable message; no invisible second turn | P1 |
| **I08-T36** | IIS-06/C-01 | Two-turn memory after renderer and process restart | Referenced context relevant and source-scoped; not prior-task authority | P1 |
| **I08-T37** | IIS-06 | Token/context budget exhaustion | Honest bounded clipping/summarization; no fabricated decision sources | P1 |
| **I08-T38** | IIS-06 | Slow provider/ambiguous result after send or crash | Unknown/timeout shown, no automatic same-turn retransmission | P0 |
| **I08-T39** | IIS-06/C-02 | Advisory `task_proposal` from model | No automatic execute; Main mints authorized proposal only | P0 |
| **I08-T40** | IIS-06/C-02-C01 | Generated decision candidates and old user corrections | No structured unapproved ledger claimed; real approved decisions remain | P1 |

### F. Process supervisor, coding and cancellation

| Test ID | Frozen source | Stimulus / fault | Pass condition | Priority |
|---|---|---|---|---|
| **I08-T41** | IIS-03/IIS-01 | Valid separate coding child handshake then task.execute | Main authorization+commit+slot+lease precede exactly one execute | P0 |
| **I08-T42** | IIS-03 | Same process receives second task.execute | Reject; no duplicate engine invocation | P0 |
| **I08-T43** | IIS-03/IIS-01 | Cancel while AgentOS remains busy | Cancel command is receivable; acknowledgement only means registered | P0 |
| **I08-T44** | IIS-03 | Grace expiry and Windows descendant still running | Escalate per contract; retain blocked writer until verified cessation | P0 |
| **I08-T45** | IIS-03/IIS-04 | App/Main crash after admission before spawn | No automatic task replay; durable needs reconciliation | P0 |
| **I08-T46** | IIS-03/IIS-04 | Parent process dies while child/descendant survives | No unsafe unlock or false cancelled/success outcome | P0 |
| **I08-T47** | IIS-03 | Queue scheduling under multiple workspace aliases | No two active writers, global singleton respected | P0 |
| **I08-T48** | IIS-03/C-01 | Real AgentOS task with bounded ConversationContext | Engine is invoked once, correct exact task/project context | P0 |

### G. Mission Control and event replay

| Test ID | Frozen source | Stimulus / fault | Pass condition | Priority |
|---|---|---|---|---|
| **I08-T49** | IIS-05/IIS-01 | Instrument real task + worker lifecycle | Only nine frozen event subtypes from verified engine facts | P0 |
| **I08-T50** | IIS-05/IIS-04 | Event arrives but COMMIT fails | No authoritative push/state or fake terminal result | P0 |
| **I08-T51** | IIS-05/IIS-04 | Commit succeeds, Renderer closed/reopened | ReadEvents catches up from DB, no task rerun | P1 |
| **I08-T52** | IIS-05 | Duplicate push/hint then data replay | Render once per committed task-local event | P1 |
| **I08-T53** | IIS-05/IIS-04 | Missing seq followed by higher seq; later genuine backfill; separate conflict history | Before backfill show gap; after committed genuine fill recompute `completeThrough` and state; **sticky conflict is not downgraded**, never invent a row | P0 |
| **I08-T54** | IIS-05 | Worker spawned twice with same worker type | Separate identities/invocations; no conflated worker timeline | P1 |
| **I08-T55** | IIS-05 | Terminal engine event with uncertain OS cleanup | Engine outcome remains distinct from unsafe lease/slot | P0 |
| **I08-T56** | IIS-05/NCD-01 | Navigate Chat → Agents → Chat, Dock manual-hide | No new task/auto-open old Agent Logs from replay | P1 |

### H. Windows Project File Broker and disclosure

| Test ID | Frozen source | Stimulus / fault | Pass condition | Priority |
|---|---|---|---|---|
| **I08-T57** | IIS-07 | `..`, absolute/UNC/device/ADS/trailing-dot and alias paths | Reject before opening any unauthorized object | P0 |
| **I08-T58** | IIS-07 | Reparse/junction/ancestor swap concurrent attacker | Prove handle-bound containment or block feature; no escape | P0 |
| **I08-T59** | IIS-07 | Modify content with same size/mtime in read race | Read/screen same captured bytes or fail closed | P0 |
| **I08-T60** | IIS-07 | Secret in ordinary file, split buffers, malformed UTF text | Deny unfiltered source, no logger/preview leak | P0 |
| **I08-T61** | IIS-07 | Changed dir between discover pages; stale cursor | Partial/incomplete, not fake 100% coverage | P1 |
| **I08-T62** | IIS-07/IIS-04 | Prepared vs verified local stdio write vs observation COMMIT; crash between write and COMMIT | No count from prepared bytes; post-write undercount remains possible and reported partial; no double-count; **no claim of Python processing or provider receipt** | P1 |
| **I08-T63** | IIS-07/IIS-06/C-02 | Revoke exact provider consent before/after last Main-controlled release and provider handoff | Strict project/effective provider/class check at release; stop later Main releases; log residual send uncertainty, **never claim recall** | P0 |
| **I08-T64** | IIS-07 | HMAC lost/rotated, too many parents/queue flood | No mixed-key count, stale cursor or unbounded RAM | P1 |

### I. Windows UI, accessibility and feature honesty

| Test ID | Frozen source | Stimulus / fault | Pass condition | Priority |
|---|---|---|---|---|
| **I08-T65** | NCD-01 | Test 1100×700, 1366×768, 1920×1080 and 1000×600 compact | Center/Dock/sidebar sizing obey frozen visual matrix | P2 |
| **I08-T66** | NCD-01 | Windows 125% scaling, keyboard focus/shortcuts/reduced motion | Readable, navigable, no overlapping controls | P2 |
| **I08-T67** | NCD-01/IIS-02 | New Conversation draft, first-send DB failure | Draft editable; no phantom conversation navigated | P1 |
| **I08-T68** | NCD-01/IIS-05 | Agents page with no instrumentation support | Explicit unavailable/empty status; no demo worker fake | P0 |
| **I08-T69** | NCD-00/NCD-01 | Actual selected model unavailable | Disabled/accurate selector, no fake switching | P1 |
| **I08-T70** | NCD-00 | Agent Logs vs Interactive Shell | Only safe Agent Logs in release unless PTY independently authorized | P0 |
| **I08-T71** | IIS-05 | Long high-rate event history while user navigates | Bounded catch-up, responsive UI, no dropped truth claims | P1 |
| **I08-T72** | NCD-01/IIS-02 | Right Dock restored per conversation; global width distinct | No change to task authority, runtime or consent | P1 |

### J. Restart, race and resource integration

| Test ID | Frozen source | Stimulus / fault | Pass condition | Priority |
|---|---|---|---|---|
| **I08-T73** | IIS-04 | WAL backup/restore during pending writes | Consistent backup and safe migration; no erased history | P0 |
| **I08-T74** | IIS-04 | Unknown/newer schema, DB full, sqlite busy | Fail closed to writes and task admission, do not reset DB | P0 |
| **I08-T75** | IIS-03 | READY timeout, orphan child and app shutdown | No leaked unchecked writer or process state assumption | P0 |
| **I08-T76** | IIS-01/IIS-03 | Flood stdout stderr and malformed repeated records | Finite memory/queues and sanitized diagnostics; cancel usable | P1 |
| **I08-T77** | IIS-06 | Provider no response/duplicate-charge uncertainty | No silent provider retry; honest attempt provenance | P1 |
| **I08-T78** | IIS-07 | Broker request timed out during read and DB outage | No fake delivered file/count, correct partial status | P1 |
| **I08-T79** | IIS-04/IIS-05 | Crash after event COMMIT before push | Replay from DB with no double journal | P1 |
| **I08-T80** | IIS-02/IIS-04 | Renderer full reload and duplicate IPC write | Stored immutable response or clear conservative error | P1 |

### K. Packaging, evidence and cross-contract release

| Test ID | Frozen source | Stimulus / fault | Pass condition | Priority |
|---|---|---|---|---|
| **I08-T81** | NCD-02/IIS-03 | Dev Python runtime resolution and provenance | Only approved local executable identity; unsupported fails closed | P0 |
| **I08-T82** | NCD-02/C-03 | Packaged Windows Python sidecar in clean user profile | Bundled interpreter starts; real handshake and no dev-path dependency | P1 |
| **I08-T83** | NCD-02/IIS-02 | Release artifact no unexpected web/network service | No unapproved TCP, Node bridge or privilege escalation | P0 |
| **I08-T84** | NCD-00 | Original engine and frozen docs SHA comparison | Any unauthorized drift blocks acceptance | P0 |
| **I08-T85** | IIS-01..07 incl. narrow addenda | Frozen-parent test inventories, including IIS-06 T36 corrected by §24 and no unauthorized retry UI | Preserve every applicable test ID with **its final authoritative wording**, environment, evidence/verdict; never resurrect superseded historical test meaning | P0 |
| **I08-T86** | NCD-01 | Human accessibility and readable error-state checklist | No fake status; recorded device/viewport coverage | P2 |
| **I08-T87** | IIS-08 | Evidence provenance and log sanitization audit | Immutable hashes, independent reproduction possible | P1 |
| **I08-T88** | NCD-00/IIS-08 | Gate closure and owner-accepted release decision | No PASS based on document-only review/mocks/inconclusive tests | P0 |

## 7. Fault-injection sequencing and risk proof — IIS08-D07

A controlled harness SHALL make each injection point reproducible and record both the **fault timing** and the authoritative state before/after. “Killed a process” without evidence of which side of COMMIT or which descendants remained is insufficient.

| Injection position | Required observation | Forbidden interpretation |
|---|---|---|
| T1 before COMMIT | Rollback and editable draft; no accepted message | Successful persisted send |
| T1 after COMMIT before IPC reply | Immutable receipt survives and identical replay reuses original acceptance | New conversation/message inserted again |
| T2 after consumed proposal/slot commit before Python spawn | Task admitted but uncertain/start reconciliation; no auto-run | Launch task just because row exists |
| Coding `task.execute` sent, acceptance lost | Keep exact task uncertain; no full auto retransmission | “Definitely never executed” |
| Engine terminal result before SQLite T4 COMMIT | No authoritative event push | “Completed” UI merely from stdout |
| SQLite T4 COMMIT before push | Durable event reappears via replay | Missing event permanently because push was lost |
| Event ID/sequence conflict | Preserve old row + sticky incident/uncertainty | Downgrade conflict to ordinary gap |
| Cancel requested/ACK before descendants stop | Hold writer; source-grounded cancel status only | Cleanup or rollback success |
| DB WAL checkpoint/backup/migration failure | No silent recreation, disable affected writes | Historic records implicitly safe |
| Broker prepared excerpt but pipe write fails | No verified read-delivery increment | File counted as actually read |
| Broker pipe write complete before evidence COMMIT, Main dies | Possible undercount, incomplete audit; never invented ACK | Exact receiver/model consumption proven |
| Consent revoked versus last Main release | Total order within Main, auditable uncertainty outside | External provider recalled prior bytes |
| Provider sent request/response lost | Attempt stays honest `unknown`/timeout as applicable | Safe automatic retry or guaranteed no billing |
| Reparse/alias swap during handle acquisition | Abort or demonstrated correct handle root | String prefix sufficient proof |

**No test may claim complete lossless Python event replay**: frozen IIS-01 Option A uses Main's SQLite committed journal **without** a Python-side ACK/replay journal. Unemitted or uncommitted events can remain unknown; a truthful `gap`/`unknown` is an acceptable safety result, whereas invented completion is not.

## 8. Quantitative ceilings and honest performance interpretation — IIS08-D08

Only **already-frozen** numeric rules are binding. IIS-08 assigns tests to prove them, but does not silently change the limits or invent a new product SLA.

| Dimension | Frozen bound to test | Authority |
|---|---|---|
| Renderer text input / preview | 16,384 Unicode code points; byte ceiling also enforced on preview | IIS-02; IIS-01 |
| IPC list pages | max 100 | IIS-02 |
| Conversation proposal projection | max 40 available proposals + truthful truncation flag | IIS-02-C01 |
| JSONL raw line | <=262,144 bytes | IIS-01 |
| Child in-flight requests | 16 general; Coding execution 1 plus reserved cancel 1 | IIS-01 |
| Unprocessed events / outbound records | 256 records and 8 MiB per child per queue; sustained saturation 30 s | IIS-01 |
| Discussion request | 300 s per issued attempt | IIS-01 |
| Broker request | 30 s | IIS-01 |
| Task cancel graceful window | 15 s before governed escalation | IIS-01 / IIS-03 |
| Active coding / queued tasks | exactly at most 1 active globally; <=20 queued | IIS-03 / IIS-04 |
| Event read page | <=100; gap/contiguity authoritative | IIS-02 / IIS-04 |
| IIS-05 catch-up | <=four 40-event pages per scheduling turn with yielding | IIS-05 FFR05-04 |
| Broker read | <=200 lines / <=16,384 chars per excerpt | IIS-01 / IIS-07 |
| Broker per-parent controls | 1,000 discovered entries; 30 discover operations; 24 distinct read subjects; 40 reads | IIS-07 |
| Broker source screening | 8 MiB eligible file max, 64 MiB cumulative screening, 256 KiB cumulative returned excerpts, 90 s parent budget | IIS-07 |
| Broker global/per-parent resource control | 2 active global I/Os, **max 1 active per parent**; 16 global queued / 4 queued per parent; Renderer previews have a separately bounded per-sender queue | IIS-07 |
| NCD-01 visual checks | 1100×700, 1366×768, 1920×1080, 1000×600 and Windows 125% scale | NCD-01 |

**Test mechanics:** prove limits with boundary cases at/above each bound, safe rejection/backpressure and no abnormal memory/CPU growth. Record machine specs, measured time distributions and UI responsiveness as **observations**; proposals for additional thresholds (startup duration, Electron CPU budget, max packaged binary size, screen-reader targets beyond parent requirements) remain engineering questions for FFR/implementation planning, **not secretly frozen acceptance numbers**.

A mock harness can prove bounded DTO validation, but only the actual Windows Electron/Python runtime can prove concurrent cancellation, process-tree cleanup and broker handle-containment. For future packaged distribution acceptance, rerun the relevant tests on the installed/bundled sidecar; dev-only PASS cannot substitute.

## 9. Security adversary model and honest claims — IIS08-D09

**Adversaries/test stimuli:** forged Renderer payload/frame, malicious discussion output, deceptive model-suggested commands, untrusted repository files/prompt injection, path aliasing, reparse/junction mount and concurrent filesystem modification, stale consent/provider switch, compromised or misbehaving supervised child JSONL. Test with synthetic secrets, never real credentials.

- The **Renderer** cannot claim a project, proposal, task outcome, process ID, file path, SQL authority or consent merely by submitting an identifier.
- The **Discussion bridge** has application-level restricted capabilities and must not gain tool-dispatch or executable authority through its declared role, even if prompted to do so. Its isolation is **not** claimed to be a strict Windows security sandbox for arbitrary hostile Python code. Record this threat-model limitation explicitly.
- The **Broker** must prove no root escape and safe captured source under Windows handle-level attacks; if the real implementation cannot, the affected broker feature is **BLOCKED**. Pure path-string tests are inadequate.
- **Secret scanner** performance is empirically bounded and tested with synthetic cases, including false negatives/positives and cross-buffer boundaries. Do **not** advertise mathematical/perfect secret-detection guarantees.
- **Source disclosure** requires the frozen specific project, effective provider/destination and disclosure-class grant. Revocation stops later Main-controlled transmissions when ordered before the last release; no guarantee of remote receipt time, remote deletion or recall of previous disclosure.
- The broad universal outbound-LLM policy remains deliberately **deferred** under C-02 FFR-R01. IIS-08 must not quietly turn it into a new gate, though existing sensitive-data and consent gates **are mandatory**.
- Logs, trace exports, crash dumps and acceptance reports must be sanitized and access-controlled; they are not authoritative task events. Diagnostic strings cannot become instructions or UI HTML.

Critical attack reproductions need the **actual Windows binary/path/handles** and a stable, non-sensitive local proof. A simulation-only security PASS shall be labeled `CONTRACT_FIXTURE_PASS`, not `WINDOWS_SECURITY_PASS`.

## 10. Final end-to-end demonstration scripts — IIS08-D10

**E2E-01 — Conversation without execution:** launch app → choose project → New Conversation draft → persist first user send → select a configured **actually functional** supported model/route → obtain and persist a genuine grounded discussion answer → reload → see original messages/turn status and source-backed context. A **separate negative path** with offline/missing-credential/provider failure must report truthful unavailable/unknown state; this negative PASS alone never certifies the required positive discussion capability. **Negative checkpoint:** no coding child is spawned and no proposal text is auto-executed.

**E2E-02 — Explicit coding authorization:** receive model advisory task proposal → Main issues bounded `proposalId` → Renderer displays via existing `conversations.read` projection → user explicitly presses Run Task → T2 consumes proposal once and reserves slot/queue → new task child READY → actual engine runs once → grounded events commit → Mission Control shows truthful workers/outcome. Retry same mutation/proposal must **not** start again.

**E2E-03 — Navigation while running:** active task in Chat → navigate to Agents/another conversation/files/settings → operate discussion independently → return to Agents and Chat → task unchanged by navigation, Dock saved separately and real state restored from Main/SQLite.

**E2E-04 — Cancel and uncertainty:** user requests cancellation of actually running task → IPC request and bound JSONL command → simulate child refusing/hanging/descendant surviving → Main escalates per approved process policy → UI shows cancellation requested/unknown/blocked accurately; no lease unlock until independent proof. Restart mid-incident and verify safe reconciliation.

**E2E-05 — Safe project-aware discussion:** untrusted project with safe source and synthetic secrets → discover → authorized bounded read → verified observation counts → exact external provider consent challenge → grant/revoke and provider switch → capture what Main actually sends; sensitive source never leaks; restore partial inspection after crash honestly.

**E2E-06 — Durable failure path:** commit failure on first message and event → UI never claims persisted/completed, user draft remains editable, previously committed history survives safe recovery; no invented event sequence.

**E2E-07 — Capability not available (negative behavior proof):** without real instrumentation or a supported provider, app must render explicit unavailable/unknown states and disable unsupported controls, never inventing workers, token-streaming or provider success. **This negative-behavior test can PASS while the separate required real-engine/model-capability gates remain `BLOCKED`**. Development integration or distribution cannot be accepted without grounded required capabilities unless the owner authorizes a distinct scope amendment; hiding them is not equivalent to working integration.

**E2E-08 — Clean Windows sidecar (future distribution gate):** run signed/controlled future packaging artifact on clean Windows install with no developer Python path → attest interpreter provenance, sandbox/preload boundaries, SQLite migration and stable restart. This **future** run is required for packaged distribution acceptance, not evidence already delivered by the v1 documents.

## 11. Evidence package and reproducibility manifest — IIS08-D11

This is a **test-report artifact format only**. It is NOT an IIS-01 JSONL message, public IIS-02 DTO, new SQLite table or hidden runtime telemetry API. An authorized executor must deliver the following bounded artifacts for each implementation milestone and for final acceptance:

1. `run-manifest.json` (versioned test-run metadata, environment, immutable contract checksums, repo SHAs, toolchain versions, run ID, packaged/dev distinction, and hashes of attached evidence).
2. `coverage-matrix.csv` or Markdown: **every** parent test ID + every I08-T01–T88 mapped to exact test-case name, result, environment, supporting artifacts, unresolved incident and applicability rationale. Never merge `NOT_RUN` into `PASS`.
3. `protocol-fixtures/`: valid/invalid JSONL and typed IPC fixtures, checksumed golden outcomes, version/role/correlation and framing rejection outcomes.
4. `db-evidence/`: disposable schema version, migration and WAL-consistent backup verification, state before/after injected faults, queries for dedup, event streams, writer leases, inspection observations and durable consent. Redact private conversation content.
5. `windows-evidence/`: handle-origin/root assertion proof, reparse/alias/swap attack results, descendant process-tree cessation proof, clean-install process provenance and precise test OS build.
6. `ui-evidence/`: actual viewport/scale shots or video, keyboard/reduced-motion/contrast checklist, live replay output, failure-state snapshots and no fabricated agent proof.
7. `privacy-and-provider/`: effective model/provider route capture, synthetic-secret scanning outcomes, disclosure challenge/revocation timeline, prompt content boundaries and redaction audit.
8. `release-decision.md`: evidence summary, all P0/P1 verdicts, accepted P2 waivers, tracked `BLOCKED/INCONCLUSIVE`, original-engine drift assessment and explicit decision authority.

**Illustrative compact run-manifest record (NOT a wire/IPC schema):**

```json
{
  "artifact_type": "iis08_test_run_manifest",
  "design_version": "draft-v0.1",
  "run_id": "example-not-executed",
  "execution_status": "NOT_RUN",
  "environment_class": "windows-integrated",
  "desktop_commit": null,
  "engine_commit": null,
  "contract_checksum_manifest": "pending-implementation-baseline",
  "case_results": [],
  "evidence_sha256": []
}
```

No source/edit/timing values above indicate actual execution. Store checksums of sensitive fixtures, not their original protected contents, in any shared report.

## 12. Acceptance decision algorithm and deferred scope — IIS08-D12

**Documentary acceptance (current phase):** a corrected, explicitly owner-approved IIS-08 may be frozen as a **test specification**. The independent Final Cross-Contract Review must still verify the exact parent artifacts and hashes (including the IIS-03 provenance gap recorded in FFR08-R01) before the implementation baseline; such later verification is not retroactive implementation evidence.

**Implementation-phase acceptance requires all of:**

1. Explicit owner authorization for the implementation/verification phase and any source edits required in the original engine; approved repo scope remains intact.
2. G0–G9 evidence gates evaluated on suitable actual environments **for the claimed acceptance tier**. A local development-integration acceptance is NOT a packaged-distribution acceptance: G8-package remains `NOT_RUN — FUTURE DISTRIBUTION` until a separately authorized clean-installed bundle is tested, and cannot be reported PASS or N/A on dev-only evidence. For actual packaged/distribution acceptance it must PASS. All inherited mandatory tests and **I08-T01–T88** are mapped and executed where applicable; N/A requires approved scope grounds, never a blanket waiver of a mandatory safety test.
3. No unresolved P0/P1 defects or relevant unverified Windows handle/security/OS cleanup/true event-generation gates. `BLOCKED` or `INCONCLUSIVE` on a mandatory feature prevents PASS.
4. The real C-01 context path, model route, broker disclosure, coding task admission, true engine events, replay and safety reconciliation each have independent evidence. A fixture does not equal a real end-to-end result.
5. Every changed production file and dependency is accounted for with SHA/commit; no unauthorized Next Code engine drift, scope expansion or security exception.
6. No mock worker/provider progress in the production UI; deferred features are absent/disabled and described honestly. An in-scope essential capability cannot be silently redefined as “optional” merely because tests fail.
7. The final acceptance report differentiates **DESIGN FROZEN**, **IMPLEMENTED**, **TESTED**, **ACCEPTED**, **PACKAGED** and **DISTRIBUTED** statuses. None implies another.

**Explicit deferrals protected by this contract:** interactive Windows Shell/PTy without independent review, universal LLM egress gate (C-02 FFR-R01), full structured unapproved decision-candidate register, same-turn discussion retry control, per-token streamed assistant text, Python event ACK/replay journal, unsupported provider or engine capabilities, general multi-agent host/SDK, macOS/Linux. The absence of optional deferred items shall be tested for **truthful non-representation**, not mistaken for a defect requiring unauthorized implementation. If any is made mandatory for release by a later owner decision, it requires a separately approved contract change and new test scope.

**Rejection rules:** no release approval when a critical test is not run, when Windows files can escape the authorized root, when a missing process is assumed cleaned, when an event from stderr/mock is shown as real, when a project excerpt leaves Main without required exact consent, when a UI route implicitly starts coding, or when the original engine was modified without documented separate authorization.

## 13. Traceability, reporting and issue triage — IIS08-D13

Every issue shall carry: `FINDING-ID`, impacted exact frozen clause, observed evidence, severity, reproducibility, known root cause versus hypothesis, correction scope, upstream contract change needed (`yes/no`), and owner disposition. Cross-contract conflicts must be presented as explicit, minimal change requests; do not hide one in a test-implementation workaround.

**Required traceability review topics for FFR-01:**

- Is IIS-03's available canonical file/header consistent with its stated FROZEN status/freeze record? Historical draft labels require a documentary authority check, not an invented runtime assertion.
- Are all IIS-06/C-02-C01 and IIS-02-C01 narrow addenda represented in the test ledger, especially available-proposal UI projection and same-turn retry prohibition?
- Are IIS-05 event source evidence, worker identity, gap semantics and OS process cleanup each tested independently (no terminal-event shortcut)?
- Does IIS-07's Windows handle-safe access require missing OS APIs or privileges that an implementer might incorrectly simulate with path-string checks? If yes, keep the security gate BLOCKED pending separately authorized correction.
- Can inspection `read_file` evidence be counted only after the documented local handoff condition, without promising remote-model consumption or no undercount after crash?
- Are new non-functional SLA numbers accidentally introduced by tests instead of derived from the frozen parent?
- Are source permissions/real repository commits distinguished from documentation-only freeze success and synthetic test-run artifacts?

**A later Final Cross-Contract Review is separate from this IIS-08 draft/FFR cycle**. It must examine the full canonical texts and their hashes before a staged implementation plan, not treat this document as retroactive universal approval for the eight IIS contracts.

## 14. IIS08 decision register — FROZEN v1.0 / owner approved

| ID | Proposed decision | Status |
|---|---|---|
| IIS08-D01 | Integration acceptance scope and no implementation authority | FROZEN v1.0 |
| IIS08-D02 | Frozen parent + addenda precedence and full historical test preservation | FROZEN v1.0 |
| IIS08-D03 | Real authoritative SUT evidence versus simulator-only results | FROZEN v1.0 |
| IIS08-D04 | G0–G9 gates, severity and result vocabulary | FROZEN v1.0 |
| IIS08-D05 | Isolated Windows fixtures, reproducibility and clean provenance | FROZEN v1.0 |
| IIS08-D06 | 88 integrated I08-T01–I08-T88 scenarios supplement parent plans | FROZEN v1.0 |
| IIS08-D07 | Controlled fault-injection timing and negative behavior proof | FROZEN v1.0 |
| IIS08-D08 | Verify inherited numerical ceilings; no invented SLA | FROZEN v1.0 |
| IIS08-D09 | Adversarial Windows/IPC/secret/consent threat cases and honest limits | FROZEN v1.0 |
| IIS08-D10 | Eight actual end-to-end acceptance journeys | FROZEN v1.0 |
| IIS08-D11 | Evidence manifest/report package, separate from production schemas | FROZEN v1.0 |
| IIS08-D12 | Decision algorithm for documentary versus runtime versus packaged acceptance | FROZEN v1.0 |
| IIS08-D13 | Conflict reporting, regression and issue triage | FROZEN v1.0 |
| IIS08-D14 | Consolidated review and explicit owner freeze process | FROZEN v1.0 |

## 15. Final Consolidated Review agenda and owner gate — IIS08-D14

**Historical v0.1 review agenda (FFR-01 completed documentarily on 2026-10-20):** A consolidated review inspected parent scope, identifier counts, no new interface/schema authority, realistic proof of engine instrumentation, Windows file handles and child cleanup, approval and consent boundaries, deferrals, numeric provenance, tiered packaging and evidence feasibility. Its findings and dispositions are recorded in §16 and the companion `NCD-03-IIS-08-FFR-01-CONSOLIDATED-REVIEW.md`. The remaining IIS-03 file/hash evidence gap is explicitly tracked; it is not a runtime defect or a claim of G0 PASS.

**Historical pre-freeze workflow:** Final Consolidated Review → reconciled correction package → owner review → explicit freeze. The owner subsequently authorized **FROZEN v1.0** on 2026-10-20, recorded in §17 and the companion freeze record. **Next:** independent **Final Cross-Contract Review** across NCD-00/NCD-01/NCD-02/C-01/C-02/C-03/IIS-01–IIS-08 and narrow addenda; then prepare a separately authorized staged implementation plan (NCD-04 if adopted). No coding authority arises automatically.

**Historical v0.2 pre-freeze gate (superseded by §17): DRAFT v0.2 / FFR-01 CORRECTIONS INCORPORATED / OWNER FREEZE PENDING. Executable tests and coding were NOT AUTHORIZED then and remain NOT AUTHORIZED by this freeze.**



## 16. FFR-01 consolidated review — corrected v0.2 normative reading (2026-10-20)

**Historical FFR-01 disposition (before owner approval): CONDITIONAL DOCUMENTARY PASS / NOT FROZEN.** This section governs the interpretation of historical v0.1 draft wording and the approved-parent compatibility of this *proposed* IIS-08 specification. It introduces **no** new JSONL action, IPC method/subscription, SQLite table, Python capability, operating-system grant or release authorization. No actual test, instrumentation, SQL migration, Windows attack or packaged build has run.

| Finding | Review severity (documentary) | v0.2 resolution / hold |
|---|---|---|
| **FFR08-R01 — IIS-03 artifact/provenance gap** | EVIDENCE HOLD | Historical v0.1 `DRAFT` header in available IIS-03 canonical file conflicts **as metadata** with the owner handoff's FROZEN assertion; freeze-record and hash comparison not independently available here. IIS-08 does not unfreeze IIS-03 or invent a hash. **G0 and Final Cross-Contract baseline verification remain open until the specific frozen evidence is supplied and checked.** |
| **FFR08-R02 — packaging vs development acceptance** | CORRECTED | G8 distinguishes local dev proof from the future bundled clean-install proof. Acceptance tier is explicit; never promote dev-only test evidence into packaging PASS. |
| **FFR08-R03 — historical parent-test supersession** | CORRECTED | For **I06-T36**, use the final frozen IIS-06 §24/§25 meaning: *absence of a same-turn retry UI/API*, not an instruction to test an unapproved retry feature. Every other inherited ID preserves its final owner-approved content; no renumbering. |
| **FFR08-R04 — offline negative test substituted for positive integration** | CORRECTED | E2E-01 requires at least one actually supported functional route with a genuine persisted answer. Provider-unavailable behavior is a separate negative proof; E2E-07 PASS never waives absent mandatory engine/provider capability. |
| **FFR08-R05 — overly broad networking prohibition** | CORRECTED | I08-T03/I08-T83 forbid a **local TCP/HTTP Python bridge** or unauthorized service/bypass, not previously authorized external HTTPS provider traffic through ModelGateway. |
| **FFR08-R06 — gap/backfill/conflict interpretation** | CORRECTED | I08-T53 now checks gap before committed backfill, revised contiguous metadata after legitimate fill, and sticky conflict only for actual integrity conflicts. Never invent missing events or claim permanent gap after verified recovery. |
| **FFR08-R07 — broker release/evidence/consent uncertainty** | CORRECTED | I08-T62/T63 distinguish prepared bytes, Main local stdio handoff, durable `read_file` observation and provider disclosure. Crash after write can undercount; neither physical/model consumption nor retroactive recall is guaranteed. |
| **FFR08-R08 — inherited limits not fully enumerated** | CORRECTED | Resource matrix now includes **one active broker operation per parent** and bounded Renderer-preview queue, without adding or changing a numeric parent ceiling. |
| **FFR08-R09 — test evidence and verdict integrity** | CORRECTED | G0–G9 / acceptance report require exact current parent wording and checksums, explicit environment/tier, source provenance, `NOT_RUN/BLOCKED/INCONCLUSIVE` preservation and independently reproduced essential capabilities. Documentary PASS remains separate from executable PASS. |

**FFR audit of fixed inventories (documentary only):** 88 distinct `I08-T01`–`I08-T88` table rows, no gaps/duplicates; **54 P0, 31 P1, 3 P2** provisional case priorities; ten G0–G9 gates; fourteen D01–D14 proposed decision rows; eight E2E-01–08 journeys. Verified parent test catalogs referenced by this paper: 36 E05-01–E05-36, 52 I06-T01–I06-T52, 56 I07-T01–I07-T56. These are **case registers, not executed tests**. Historical v0.1 is retained unchanged in an archive; the v0.2 changes are confined to this paper and its report.

**Freeze recommendation, conditioned:** The corrected *test design* can be presented for explicit owner approval. The unresolved IIS-03 historical-file/freeze-hash comparison is a **mandatory later Final Cross-Contract / G0 evidence check**, not a reason to rewrite IIS-03 in IIS-08 or to claim the missing check passed. Any verified substantive upstream contradiction discovered by that comparison must be escalated for a separate owner decision before implementation. The owner subsequently approved **IIS-08 FROZEN v1.0** on 2026-10-20; §17 controls the new documentary status while preserving the unresolved G0 evidence hold.


## 17. Final owner approval and documentary freeze declaration — 2026-10-20

**Canonical status: FROZEN v1.0 — DESIGN ONLY / OWNER APPROVED.** Following delivery of the corrected Draft v0.2 and the FFR-01 report, the owner explicitly directed “اجل نجمد” (freeze now) on 2026-10-20. This instruction approves IIS08-D01–D14 and adopts the FFR08-R02–R09 documentary corrections as the final v1.0 test-design baseline. Earlier DRAFT, proposed or owner-pending labels in §§1–16 describe the historical drafting/review stages and are superseded by this section and the companion `NCD-03-IIS-08-FINAL-FREEZE-RECORD.md`.

**Mandatory carried hold:** FFR08-R01 remains **EVIDENCE HOLD / NOT VERIFIED**, specifically the full reconciliation of IIS-03's canonical frozen artifact against its freeze record and SHA-256. IIS-08 v1.0 may be frozen as a **test design**, but this does not assert G0 baseline integrity or resolve the hold. The independent Final Cross-Contract Review must resolve this exact evidence gap before implementation-baseline authorization. Any discovered substantive upstream conflict requires documented owner-approved remediation, never a silent amendment.

**Frozen counts:** 14 decision groups (IIS08-D01–D14); 88 additional integrated test cases (I08-T01–I08-T88); ten gates G0–G9; eight E2E journeys. Preserve final approved inherited tests and narrow addenda, including the superseded IIS-06 I06-T36 meaning. These registers are requirements to verify **later**. At this freeze, every executable test, Windows attack trial, bundled-app test and release evidence gate is **NOT_RUN / NOT_VERIFIED**. A documentary freeze is not a tested, accepted, packaged, shipped or operational Desktop.

**Authority limits:** No changes are authorized to the frozen parent contracts, the Next Code Python repository, Electron/React source, SQLite schema, JSONL/IPC interfaces, local processes, or installer. This record is **not** implementation, test-execution, repository-edit or deployment permission. The next authorized work is the **independent Final Cross-Contract Review**, followed by a separate owner decision on any remediation and the staged implementation plan.

**Reading and integrity rule:** The exact FROZEN v1.0 bytes and their SHA-256 are anchored in the companion freeze record. The prior Draft v0.2 is preserved byte-for-byte in a distinct archive. The companion FFR-01 remains historical proof of the conditional review, not an active NOT-FROZEN verdict.

**Final closure: IIS-08 — FROZEN v1.0 / DOCUMENTARY CLOSED; FFR08-R01 CROSS-CONTRACT EVIDENCE HOLD OPEN.**
