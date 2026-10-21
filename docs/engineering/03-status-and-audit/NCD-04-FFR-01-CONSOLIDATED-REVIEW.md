# NEXT CODE DESKTOP — NCD-04 / FFR-01
## Final Consolidated Documentary Review — Staged Implementation & Verification Plan

**Review date:** 2026-10-20  
**Input:** `NCD-04-IMPLEMENTATION-AND-VERIFICATION-PLAN-DRAFT-v0.1.md` (SHA-256 `1eecf6f1ea6b8df98d57966be8bd4c325c2abc15cb8c8f9cb519916905ee371b`)  
**Output:** `NCD-04-IMPLEMENTATION-AND-VERIFICATION-PLAN-DRAFT-v0.2-REVIEWED.md` (SHA-256 `07581fa12c67c1ecbb632235e3c9bb7adb04ab33a71296241b8ef04529e8a388`)  
**Review status:** **CONDITIONAL PASS — CORRECTED DRAFT v0.2 / OWNER ADOPTION & FREEZE PENDING**  
**Implementation authorization:** **NONE**. No source edit, repository initialization, provider call, test execution, OS fault injection or engine modification is authorized by this documentary review.  
**Method:** Direct comparison of the NCD-04 text with locally available frozen contract texts and FCCR-01-C01; checked fixed numeric limits, stage dependencies, and whether an earlier stage improperly claims a later integrated gate PASS. No source-level Next Code repository inspection or actual Windows runtime tests were performed. These results do not replace exact-original-byte P0/G0 intake.

## 1. Summary / disposition

**Result: CONDITIONAL PASS for the documentary phase plan**, not implementation acceptance. The basic P0→P9 ordering and separately authorized P10 distribution remain intact, and there is no evidenced need to enlarge the architecture, public IPC (23 methods / 3 subscriptions), JSONL action/type set (5/5), or Main-owned SQLite inventory (22 tables). Corrective review identified **nine bounded findings**, all incorporated into `v0.2-REVIEWED`; their adoption as the frozen plan requires the owner's separate approval. The **original-byte P0 provenance hold remains open** and cannot be closed by editing this plan.

## 2. Findings and corrections

| ID | Priority | Observation grounded in v0.1 | Correction in v0.2 | Result |
|---|---|---|---|---|
| **N04-F01** | MAJOR | P3 table and §5.4 could be read as all T1–T6/G2 integrated workflows verified before processes/models exist (P4/P5/P7). | Mark P3 as DB/transaction primitives and fixture tests; gate actual cross-process proof at P7/P9; distinguish stage PASS from full IIS-08 gate PASS. | DOCUMENTARY CORRECTED |
| **N04-F02** | MAJOR | P7 requires actual G4 `AgentOS` proof, while P8 is where real event integration was first scheduled. This risks an unprovable P7 exit or fake completion. | Require minimal real authenticated lifecycle, terminal outcome, cancellation/cleanup proof **in P7**; add full worker timeline, replay and Mission Control in P8. If native hooks unavailable, separate engine-change approval and P7 remains BLOCKED. | DOCUMENTARY CORRECTED |
| **N04-F03** | MAJOR | P5 deploys functional discussion/consent but P6 implements containment/safe project broker. Prior wording does not explicitly prohibit project-source release in the interim. | P5 permits bounded normal conversation only; project read/discovery/excerpt handoff stays unavailable until P6 has security proof. | DOCUMENTARY CORRECTED |
| **N04-F04** | MAJOR | P1/P2 surface can be mistaken for all operational 23 IPC methods, before backing logic exists. | Require disabled controls / fail-closed typed responses; no fake persistence/task execution/event history. | DOCUMENTARY CORRECTED |
| **N04-F05** | MAJOR / EXTERNAL HOLD | FCCR-01 confirms text projections alone do not prove original legacy frozen bytes. P0 lacks an explicit disposition when originals cannot be recovered. | Require separately approved prospective replacement with own exact bytes/hash, comparison and preserved historical gap; otherwise P0/G0 NO-GO. | **P0 EVIDENCE HOLD REMAINS**, workflow corrected |
| **N04-F06** | MAJOR | P9 dev tier refers to all I08 cases without a row-level packaged-only applicability mechanism. Could falsely mark required package tests PASS or N/A. | Mandate row-level case applicability / actual verdict, package-only `NOT_RUN — FUTURE DISTRIBUTION`, and G9-dev only for mandatory dev-applicable tests. | DOCUMENTARY CORRECTED |
| **N04-F07** | MAJOR | Scope packet does not explicitly enumerate credential/model billing, network disclosures, Windows destructive tests and repository creation as separate effects. | Explicit authorization inventory and synthetic fixtures; no implied external model call, secrets exposure or real project mutation. | DOCUMENTARY CORRECTED |
| **N04-F08** | MINOR | P3 handoff describes 'migration rollback' imprecisely relative to IIS-04 forward-only migrations. | Require WAL-consistent backup, verified restore and fail-closed migration behavior; no unapproved down-migration. | DOCUMENTARY CORRECTED |
| **N04-F09** | MAJOR | P4 simulated Coding child could leak into UI and be mistaken for verified activity or true G4/G7 evidence. | Restrict simulator to labelled test harness and synthetic store; no durable production user/task/event acceptance. | DOCUMENTARY CORRECTED |

## 3. Contract mapping / non-regression

| Frozen source | Checked invariant | Disposition |
|---|---|---|
| NCD-00/01/02 | Dedicated local Windows Desktop; React/TypeScript with Electron/Main-bound privilege, approved visual structure, no hosting platform | Retained |
| C-01/C-02/C-03 | Optional ConversationContext only previously implemented; discussion not executor; private Python sidecar and explicit task approval | Retained |
| IIS-01 | Closed 5-key JSONL envelope and 5 message types / 5 allowed commands | Retained, no proposed extension |
| IIS-02 + IIS-02-C01 | 23 Promise methods, three subscriptions and approved `conversations.read` projections | Retained, no early operational claim |
| IIS-03 REISSUE | Verified process role/handles, 1 active global Coding task + 20 queued, Windows cleanup, no blind rerun | Retained; P7 proof requirement clarified |
| IIS-04 | 22 tables, `T1–T6`, durable receipts/leases/event/consent, forward-only migration safety | Retained; DB fixture vs integrated proof distinguished |
| IIS-05 | Real grounded worker/task events, only committed event replay, honest uncertainty | Retained; P7 minimal evidence + P8 presentation |
| IIS-06 + C-02-C01 | Real provider route and limited disclosure, no unauthorized same-turn retry, deferred unapproved decision ledger | Retained; P5 source release disabled until broker |
| IIS-07 | Windows handle containment, layered secret protection, deduplicated observation | Retained; P6 gate explicit |
| IIS-08 | G0–G9, 88 tests + inherited registers, separate G8-dev/G8-package and G9 acceptance | Retained; row-level applicability / phase boundary clarified |
| FCCR-01-C01 | New IIS-03 REISSUE normative, lost historical original still unavailable; legacy files need genuine original-byte intake | Retained with OPEN P0 provenance hold |

## 4. Gate and stage decision record

- **Document status:** Draft v0.2 — Reviewed; **NOT FROZEN**. Owner must approve the nine documentary repairs, then separately authorize NCD-04 FROZEN v1.0 (possibly in one explicit instruction). Stage P0 remains a distinct later execution/input authorization.
- **P0:** No Desktop repository or engine source files examined in this FFR. Original-byte source baseline for older frozen docs is **NOT YET SEALED**. Exact unavailable artifacts require per-file prospective reissue approval or genuine recovery; never invent the past.
- **P1/P2:** Test-shell and wire fixture validation are partial stage obligations, not complete real integrations.
- **P3/P4:** SQLite transactions and simulated task-child cases can pass in isolation, never establish true task completion/cleanup or unearned G2/G4/G7.
- **P5/P6:** One real model route is necessary for relevant G3 when authorized; unavailable model/credentials = BLOCKED for that proof. File access and provider source release remain gated by P6 actual broker proof.
- **P7/P8:** Grounded real coding lifecycle and Windows cleanup must precede P7 acceptance; P8 completes verified worker/event display. Missing engine instrumentation triggers separate change request, not invented events.
- **P9/P10:** Development-tier G9 acceptance distinct from bundled-distribution G8-package. Inherited + IIS-08 tests must have traceability and justified row-level applicability; no automatic N/A of package-only mandatory future tests.

## 5. Remaining authorization and proof holds

1. **N04-H01 (P0/G0, OPEN):** Obtain exact raw canonical frozen contract files and their hashes (or obtain separately approved prospective substitutions where unavailable), plus the observed current engine SHA and read-only hook inventory after separate P0 authorization. The reconstructed historical IIS-03 remains archived; new frozen reissue is active.
2. **N04-H02 (RUNTIME, NOT_RUN):** Actual Next Code engine task events/cancellation; descendant cleanup; model route/provider billing and consent; Windows file-handle attacks; SQLite migration and recovery; complete UI E2E suites. All require stage-specific execution permission.
3. **N04-H03 (PACKAGING, DEFERRED):** Bundled Python sidecar, installer and clean Windows packaged G8 evidence require later P10 permission.

## 6. Approval proposal (not owner approval)

**Recommendation:** Accept v0.2 as a corrected implementation plan, then freeze it **only after explicit owner direction**. No code, repository creation, source audit, Windows testing, provider call, model credential setup or OS changes follow from review/freeze. Do **not** close P0 provenance as a documentary PASS.

**Required next step:** Owner reviews N04-F01–F09 as a single package. On owner approval, publish a separate final spec with its exact SHA-256 and freeze record; request P0 permissions separately when ready. Freeze records must distinguish documentary plan from executable proof.

## 7. Evidence manifest — files inspected in this environment

The SHA-256 values below identify the **available local file bytes in this review environment**. They are not assertions that these are the historical original Library bytes of NCD-00/01/02 or other early projections.

| File | SHA-256 | Size (bytes) |
|---|---|---:|
| `NCD-04-IMPLEMENTATION-AND-VERIFICATION-PLAN-DRAFT-v0.1.md` | `1eecf6f1ea6b8df98d57966be8bd4c325c2abc15cb8c8f9cb519916905ee371b` | 37007 |
| `NCD-03-IIS-03-PYTHON-PROCESS-SUPERVISOR-SPECIFICATION-v1.0-REISSUE-FROZEN.md` | `d79d0f5a0960b64c7c806047407c7632d564c1cf4331ae7c5f185c0df129df48` | 45676 |
| `NCD-03-IIS-04-SQLITE-DURABLE-STATE-SPECIFICATION.md` | `870a5fbeaf96d3fbbede79408d02e539bef71411e1d40bfe3148ec0d7117e255` | 56760 |
| `NCD-03-IIS-05-REAL-TIME-EVENTS-MISSION-CONTROL-SPECIFICATION.md` | `9fb706925b205c842e90120930a8c8bc4c2d63789461f08478dbd1fff600c03e` | 69193 |
| `NCD-03-IIS-06-DISCUSSION-MODEL-INTEGRATION-SPECIFICATION.md` | `5103f735c785d2b8a4fd98e79feafa4525991b171ba9f18e9c11642a082d4440` | 69848 |
| `NCD-03-IIS-07-PROJECT-FILE-BROKER-SPECIFICATION.md` | `2fcf404d22e026a57fd95c70f73b741068834dc83883119f5182d77e988418e3` | 71013 |
| `NCD-03-IIS-08-INTEGRATION-TESTING-ACCEPTANCE-SPECIFICATION.md` | `99fd8f5f8b25d24d42518aa5d9183189f43e1ef09610389583d91917fb04e0fc` | 61232 |
| `NCD-FCCR-01-C01-IIS03-REISSUE-CLOSURE.md` | `79f6fab3915e5530af24fda7c40244c76209b4b995f678d854de91fc9dd51ef2` | 4343 |
| `NCD-03-IIS-02-C01-CONVERSATION-READ-PROJECTIONS-ADDENDUM.md` | `946cb7869ef90b95d615099e70ddbe036fe4d21249ba12fc8d2eb0fab56e0c62` | 9257 |
| `NCD-03-C02-C01-D7-CANDIDATE-PERSISTENCE-V1-DEFERRAL.md` | `36ac863b426ea59b2e5fc8301291fcc75f499f6a016da685e9c9370f549f97fa` | 5278 |

**Review evidence:** the original draft remains unchanged; the separately generated `NCD-04-FFR-01-v0.1-to-v0.2.diff` provides a reviewable text delta. No executable tests, external actions, GitHub commits or Windows fault injections were performed.
