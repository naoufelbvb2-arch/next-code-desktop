# NEXT CODE DESKTOP — FCCR-01
## Final Cross-Contract Review — Independent Documentary Audit

**Review date:** 2026-10-20  
**Review type:** cross-contract text, authority, provenance, acceptance and baseline consistency; **no runtime, Windows, GitHub source-code or production verification**.  
**Sources:** NCD-00/01/02, C-01/02/03, IIS-01–IIS-08, approved NCD-00-C01 / C-02-C01 / IIS-02-C01 addenda, available freeze records and FFR-01/02 reports.  
**Overall verdict:** **CONDITIONAL DOCUMENTARY PASS — ONE MANDATORY PROVENANCE HOLD / IMPLEMENTATION BASELINE NOT YET APPROVED.**

> This review does not unfreeze any owner-approved contract. It does not edit parent contract content, waive an old acceptance gate, authorize code, claim Windows/SQLite/JSONL runtime success, or treat uncertain evidence as verified. A valid existing owner approval is respected even when its particular final bytes cannot yet be authenticated.

## 1. Executive disposition

- **Design coherence:** No other confirmed architectural conflict was found in the reviewed texts after application of the two narrow owner-approved IIS-06 addenda. This is a scoped documentary finding, **not** a formal proof that all future interfaces/code are conflict-free.
- **Reference-baseline quality:** **BLOCKED BY FCCR-01 (inherited FFR08-R01).** The accessible IIS-03 Process Supervisor text is expressly `DRAFT v0.1 — NOT FROZEN`, while the owner's handoff identifies a subsequent IIS-03 `FROZEN v1.0`. No authoritative final IIS-03 file, separate freeze record or exact final digest could be retrieved. Do not silently transform the draft into the final version.
- **Integrity evidence:** IIS-04–08 exact working `.md` bytes and the owner-approved IIS-02-C01/C-02-C01 addenda matched registered freeze hashes. NCD-00/01/02, C-01/02/03, IIS-01/02 content projections reproduced registered freeze hashes **only after restoring one trailing LF** removed by text materialization. This is strong content-congruence evidence but **not original-file raw-byte verification**. NCD-00-C01 is owner-approved in the available text without a separately checked freeze digest.
- **Execution readiness:** Not claimed. Tests are planned and NOT_RUN. C-01 is the sole recorded implemented/closed engine integration, and its historical test report is not a new independent execution result in this review.

**Gate decision:** The *review itself* is completed with a recorded hold. The frozen IIS-01–08 designs are not voided. **Do not label G0 / Final Cross-Contract baseline PASS, nor issue an authorized implementation baseline, until IIS-03 artifact provenance is reconciled and the result independently recorded.**

## 2. Files and checksum assessment

The audit used available mounted files and permitted Library text projections. `TEXT_PROJECTION_PLUS_TERMINAL_LF_MATCH` does not mean direct verification of original Library raw bytes. See companion machine-readable `NCD-FCCR-01-BASELINE-EVIDENCE-MANIFEST.json` for each computed SHA-256 and verification mode.

| Contract | File examined | Evidence result |
|---|---|---|
| NCD-00 | `NCD-00-PROJECT-SCOPE.txt` | Text projection + terminal LF match |
| NCD-01 | `NCD-01-UI-UX-SPEC.txt` | Text projection + terminal LF match |
| NCD-02 | `NCD-02-DESKTOP-ARCHITECTURE.txt` | Text projection + terminal LF match |
| C-01 | `NCD-03-C01-CONVERSATION-CONTEXT-CONTRACT.txt` | Text projection + terminal LF match |
| C-02 | `NCD-03-C02-DISCUSSION-ONLY-CONTRACT.txt` | Text projection + terminal LF match |
| C-03 | `NCD-03-C03-ELECTRON-PYTHON-INTEGRATION-CONTRACT.txt` | Text projection + terminal LF match |
| IIS-01 | `NCD-03-IIS-01-JSONL-PROTOCOL-SPECIFICATION.txt` | Text projection + terminal LF match |
| IIS-02 | `NCD-03-IIS-02-ELECTRON-IPC-INTERFACE-SPECIFICATION.txt` | Text projection + terminal LF match |
| IIS-03 | `NCD-03-IIS-03-PYTHON-PROCESS-SUPERVISOR-SPECIFICATION.txt` | HOLD — Draft, frozen bytes missing |
| IIS-04 | `NCD-03-IIS-04-SQLITE-DURABLE-STATE-SPECIFICATION.md` | Exact-match |
| IIS-05 | `NCD-03-IIS-05-REAL-TIME-EVENTS-MISSION-CONTROL-SPECIFICATION.md` | Exact-match |
| IIS-06 | `NCD-03-IIS-06-DISCUSSION-MODEL-INTEGRATION-SPECIFICATION.md` | Exact-match |
| IIS-07 | `NCD-03-IIS-07-PROJECT-FILE-BROKER-SPECIFICATION.md` | Exact-match |
| IIS-08 | `NCD-03-IIS-08-INTEGRATION-TESTING-ACCEPTANCE-SPECIFICATION.md` | Exact-match |
| IIS-02-C01 | `NCD-03-IIS-02-C01-CONVERSATION-READ-PROJECTIONS-ADDENDUM.md` | Exact-match |
| C-02-C01 | `NCD-03-C02-C01-D7-CANDIDATE-PERSISTENCE-V1-DEFERRAL.md` | Exact-match |
| NCD-00-C01 | `NCD-00-C01-SIDEBAR-NAVIGATION-CLARIFICATION.txt` | Approved addendum; no hash checked |

Historical drafts, archives and older FFR reports are provenance, not a replacement for the owner-approved canonical frozen text. A legacy `DRAFT` label inside an explicitly historical section does not by itself reopen a later approved freeze. The unqualified **top-of-document Draft/Not Frozen IIS-03 header** is different: here no later authenticated canonical override is present in the available artifact set.

## 3. Cross-contract traceability matrix

| Verification axis | Upstream authority → downstream consumer | Documentary finding | Future proof |
|---|---|---|---|
| Dedicated desktop scope | NCD-00 + NCD-00-C01 → NCD-01/02 → IIS-01–08 | **COHERENT** — dedicated local-first Windows Next Code UI, no generic multi-agent platform | Windows shell/packaging UX tests |
| Task persists across navigation | NCD-01 D-UI-06 → NCD-02 A-02 → IIS-02/IIS-03/IIS-05 | **COHERENT** — page change/subscription teardown not task cancel | E05 + I08 route/reload cases |
| Main-only authority | NCD-02/C-03 → IIS-02/04/06/07 | **COHERENT** — renderer has only typed Preload; Python cannot open Desktop SQLite or mint task approval | IPC spoofing, DB access, permission tests |
| Private Python wire | C-03 → IIS-01 → IIS-03/05/06/07 | **COHERENT IN TEXT** — 5 top-level message types, 5 approved actions; stdin/stdout private JSONL, no localhost Python TCP/HTTP service; stderr non-authoritative | READY/role, framing, child compatibility |
| Public desktop IPC | IIS-02 + IIS-02-C01 → IIS-05/06/07/08 | **COHERENT** — 23 Promise methods/3 typed subscriptions, additive read DTO only; no generic invoke | Type/generated contract tests |
| Discussion vs Coding | C-02/C-03 → IIS-01/03/04/06 | **COHERENT IN TEXT** — `discussion.send` never executes; only trusted explicit `Run Task` on a Main-issued scoped and once-consumed proposal does | Cross-process capability and double-click races |
| Durable authorization | IIS-02 → IIS-04 T1/T2 → IIS-03 | **COHERENT** — immutable mutation response snapshot, commit before spawn, no duplicate execute on retry | ACID, crash windows, restart replay |
| Writer safety | C-03 → IIS-03 → IIS-04/IIS-05 | **COHERENT IN TEXT, IIS-03 PROVENANCE HOLD** — global max one active coding task, queue max 20, workspace writer lease blocked until proven safe | Windows descendant/job-object fault injection |
| Engine truth & UI replay | IIS-01 → IIS-03/04 T4 → IIS-05 → IIS-02 | **COHERENT** — real event sources, contiguous committed sequence, immutable dedup, conflict stickiness, no fake events or cleanup | Live instrumentation, gap/duplicate/reload tests |
| Conversation memory | C-01/C-02 → IIS-04 T5 → IIS-06/IIS-02-C01 | **COHERENT WITH EXCEPTION** — source-based summary and explicit user approval; unapproved structured candidate lifecycle deferred in C-02-C01 | Context and provenance negative tests |
| Model/Provider boundaries | C-02/C-03 → IIS-06 → IIS-07 | **COHERENT WITH DOCUMENTED RESIDUAL RISK** — specific effective provider/project/disclosure consent, no universal egress gate | Real provider integration and leakage tests |
| Broker / source safety | IIS-01/IIS-02 → IIS-07 → IIS-04 inspection observations | **COHERENT** — Main-only canonical/path/secret rules, dedup evidence; local transport evidence separate from external disclosure | Windows TOCTOU, HMAC rotation, scanner attack corpus |
| Product acceptance | NCD-00/01/02 → IIS-08 | **COHERENT** — 88 integrated tests, G0–G9, separate dev vs packaged gates, inherited 36/52/56 suites | All suites actual NOT_RUN |

## 4. Consolidated finding register

### FCCR-01 — IIS-03 canonical artifact / final-freeze proof missing

**Severity: BLOCKER for authoritative implementation-baseline approval.**  
**Origin:** FFR08-R01 (not newly invented).  
**Observed:** `NCD-03-IIS-03-PYTHON-PROCESS-SUPERVISOR-SPECIFICATION.txt` starts `DRAFT v0.1 — OWNER REVIEW PENDING — NOT FROZEN`, and its closing section asks for future review and owner freeze. The owner handoff calls IIS-03 `FROZEN v1.0`, but the independently verifiable frozen document and SHA-256 are not present in available files.  
**Required remedy:** Recover the actual final owner-approved IIS-03 v1.0 specification and its final freeze record, verify original bytes / SHA, diff it against the draft and map its decisions to downstream IIS-04/05/06/08. If the original cannot be recovered, **do not fabricate its original hash or falsely claim a historical final file existed**; prepare a clearly identified *proposed reconstruction* from prior decision evidence, and obtain explicit new owner approval through documented correction/change control before using it as baseline.  
**Current result:** OPEN / EVIDENCE HOLD.

### FCCR-02 — Parent file integrity evidence method

**Severity: DOCUMENTARY LIMITATION, not an observed semantic mismatch.** Eight earlier frozen parent files materialized through Library as `.txt` with the final LF absent. Their original recorded SHA matches the *reconstructed* text-plus-final-LF, not the extracted `.txt` bytes themselves. The true original bytes were not accessible via raw materialization. Report this distinction in baseline manifests; recover raw authoritative files when building the implementation pack.  
**Current result:** RECONCILED AS A DISCLOSED LIMITATION; keep exact-byte gate for implementation pack.

### FCCR-03 — Actual Next Code engine integration and Windows safety

**Severity: FUTURE EXECUTION / ACCEPTANCE GATE; not a documentation-freeze defect.** C-01 is recorded as implemented; for the later Desktop design the working source integration has not been established. Actual engine event hooks, cooperative cancellation/descendant cleanup, safe broker Windows handles, supported LLM route and bundled sidecar remain subject to explicit implementation authorization, instrumentation and tests. No simulated outcome can replace a real process/Windows evidence source.  
**Current result:** NOT_RUN / NOT_PROVEN; not grounds to assert present-day code success.

### FCCR-04 — Approved limitations are not unauthorized changes

**Severity: DOCUMENTED v1 EXCEPTIONS / ACCEPTED RISKS.** C-02-C01 expressly defers the structured unapproved decision-candidate lifecycle, not approved-decision provenance. IIS-02-C01 adds limited `ConversationViewPage` projections, not a new method. IIS-06 defers same-turn user retry and token-by-token streaming; IIS-01 does not permit inventing them. C-02 FFR-R01 universal LLM egress gateway is owner-deferred; scoped consent and secret protection remain obligatory. Interactive Shell/PTY, OS sandbox and public distribution are not proved ready.  
**Current result:** COMPATIBLE WITH APPROVED GOVERNANCE; maintain truthful UI feature claims.

## 5. Numerical and interface consistency (v1)

| Contract quantity / invariant | Documentary baseline |
|---|---|
| Public React→Preload Promise methods / subscriptions | **23 / 3** (IIS-02 and IIS-02-C01) |
| Python JSONL envelope types / request action names | **5 / 5** (IIS-01) |
| Coding Task structured event subtype count | **9** (IIS-01 / IIS-05) |
| Local Desktop SQLite tables / transaction groups | **22 / 6 (T1–T6)** (IIS-04) |
| Globally active Coding Tasks / admitted queued capacity | **1 / 20** (IIS-03 proposed text inherited downstream; final IIS-03 artifact unverified) |
| IIS-05 designed tests | **36**, NOT_RUN |
| IIS-06 designed tests | **52**, NOT_RUN, with final frozen same-turn-retry limitation |
| IIS-07 designed tests | **56**, NOT_RUN |
| IIS-08 integrated tests / acceptance gates / E2E scripts | **88 / 10 (G0–G9) / 8**, NOT_RUN |
| Default saved conversation page / maximum | **40 / 100** where set by frozen IIS-02/IIS-04 |
| Payload user-message text ceiling | **16,384 Unicode code points**, not JS UTF-16 units |
| Public project disclosure | Scoped by effective provider/destination, project/workspace, class and fresh consent; distinct from local read |

The C-01 `ConversationContext` engine handoff envelope has separate initial bounds (three prior tasks, six messages, five advisory preferences, 3,000 rendered characters) and must not be confused with IIS-01 discussion-side `context_snapshot` limits (96 KiB and bounded lists). They are distinct interfaces, not a numerical contradiction.

## 6. Implementation and evidence boundaries

- **What was checked:** Text of the owner-provided/Library project specifications, primary freeze records available, narrow addenda, fixed API/wire/table inventories, known FFR dispositions, SHA-256 of accessible exact bytes and documented recovered-LF text projections.
- **What was not checked:** Exact final IIS-03 artifact or checksum; full original bytes for earlier Library-only normalized text, latest source commit/tree beyond historical C-01 record, live Electron/Python code, any migrations, real provider calls, SQLite concurrency, Windows child/process/file-path attacks, screenshots, packaged installer, or the 88 integration tests.
- **Do not confuse:** `FROZEN v1.0` (design decisions approved), `FCCR PASS` (cross-contract provenance and consistency), and `IIS-08 G0–G9 PASS` (future tested runtime acceptance) are three different gates.

## 7. Required next disposition / exit criteria

1. **Resolve FCCR-01 / FFR08-R01.** Produce canonical IIS-03 frozen bytes plus final freeze record, or escalate a controlled proposed reconstruction and obtain new approval. Independently verify provenance/changes and compatibility with the already frozen downstream contracts; no silent editing of prior decisions.
2. **Lock the approved source-of-truth manifest.** Record the exact original frozen `.md` files and checksums, approved addenda and archived versions; mark historical drafts nonnormative and remove version-label ambiguity. Treat the companion manifest as current *audit evidence*, not a completed implementation-authorizing manifest.
3. **Re-run the narrow consistency checks** impacted by the recovered IIS-03 artifact. If differences alter semantics, issue tracked cross-contract remediation proposals to owner; do not automatically rewrite other frozen files.
4. **Only after cross-contract G0 documentary clearance**, author the staged NCD-04 Implementation & Verification Plan as a proposal for separate owner approval. A plan does not grant implementation authority.
5. **Actual code and acceptance** require a further separate owner instruction, independent environment and IIS-08 tests. No production code or engines were touched in this audit.

**FCCR-01 final documentary disposition:** **REVIEW PERFORMED — CONDITIONAL PASS WITH ONE OPEN PROVENANCE BLOCKER.** All previously owner-frozen documents retain their approved status. **Final Implementation Baseline Seal: NOT GRANTED.**
