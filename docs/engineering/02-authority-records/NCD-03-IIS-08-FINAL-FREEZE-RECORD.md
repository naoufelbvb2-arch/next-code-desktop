# NEXT CODE DESKTOP — NCD-03 / IIS-08
## FINAL FREEZE RECORD — v1.0

**Date:** 2026-10-20  
**Status:** **FROZEN v1.0 — DOCUMENTARY DESIGN / OWNER APPROVED**  
**Owner authorization:** “اجل نجمد” — explicit freeze authorization after review of the FFR-01 corrected Draft v0.2 and nine findings.  
**Final disposition:** **PASS FOR DOCUMENTARY FREEZE / IIS-08 FROZEN v1.0**, with **FFR08-R01 EVIDENCE HOLD** carried unchanged to the independent Final Cross-Contract Review.  
**Implementation authorization:** **NONE.** No code, test run, Python/Electron processes, migrations, repository modifications, Windows attacks, installers, or deployment authorized.

## 1. SHA-256 integrity of exact UTF-8 artifacts

| Artifact | SHA-256 | Role |
|---|---|---|
| `NCD-03-IIS-08-INTEGRATION-TESTING-ACCEPTANCE-SPECIFICATION.md` | `99fd8f5f8b25d24d42518aa5d9183189f43e1ef09610389583d91917fb04e0fc` | **Canonical IIS-08 FROZEN v1.0** |
| `NCD-03-IIS-08-INTEGRATION-TESTING-ACCEPTANCE-SPECIFICATION-v0.2-ARCHIVE.md` | `b70f9a672cc7dc3a01244cbf15813f90e3e44be4495db0b6d9d28dd0d7cd0f9a` | Exact reviewed Draft v0.2 source before owner freeze |
| `NCD-03-IIS-08-INTEGRATION-TESTING-ACCEPTANCE-SPECIFICATION-v0.1-ARCHIVE.md` | `757d03555effaab0f355bb3bf565de5c46ba69b058e89b0508f2c496183acf36` | Historical Draft v0.1 before corrections |
| `NCD-03-IIS-08-FFR-01-CONSOLIDATED-REVIEW.md` | `c9c3e0a9976f4331676cc88bb59a89d55af7b26b3fbc2834d2c98cbb36c32cb5` | Documentary review with the original CONDITIONAL PASS |

The freeze record itself intentionally does not include its own hash to avoid circular reference. All digest values are of exact file bytes, not claims of implementation correctness.

## 2. Owner adoption and correction disposition

- Owner accepts decision groups **IIS08-D01–D14** and **FFR08-R02–R09** documentary corrections, effective only within IIS-08 v1.0 and the inherited frozen constraints.
- **FFR08-R01 remains EVIDENCE HOLD**: independent validation of the exact IIS-03 final artifact, its freeze record and SHA-256 remains outstanding; neither this freeze nor the handoff alone proves the required G0 reference-baseline check. It is not a claim that IIS-03 has been unfrozen.
- Baseline inventory: **88 additional integrated tests** `I08-T01–I08-T88`, **10** `G0–G9` acceptance gates, **14** decision groups, **8** end-to-end journeys; old test suites are inherited with final frozen wording and retained identifiers.
- **All tests remain NOT_RUN**; no smoke test, integration runner, engine instrumentation, Windows handle-race attack, child/descendant cleanup or packaged-app installation was executed by this documentation freeze. G0–G9 have no executable PASS verdict.

## 3. No authority expansion or regressions

- Scope is a dedicated Windows Next Code Desktop, not a generic multi-agent hosting platform.
- Keeps **five IIS-01 JSONL commands/five top-level message types**, **23 IIS-02 IPC methods/three subscriptions**, **22 IIS-04 SQLite tables**, the **IIS-03 single globally active coding task/20 queued** contract and approved narrowly scoped parent addenda.
- Does not create model text streaming, same-turn manual retry UI, a local Python HTTP/TCP bridge, a universal LLM egress gate, Windows OS sandbox proof, PTY, cloud hosting, extra database table, or new permissions.
- Simulator and unavailable-provider negative cases alone do not demonstrate real engine instrumentation, real LLM discussion or successful Windows packaged distribution. Preserve safe uncertainty and truthful errors.
- Development integration, packaged Windows acceptance and full release acceptance are **separate tiers**, each requiring its own actual evidence and approvals.

## 4. Mandatory next documentary and implementation gates

1. Conduct the independent **Final Cross-Contract Review** of NCD-00/01/02, C-01/C-02/C-03, IIS-01–IIS-08 and all owner-approved addenda.
2. Resolve **FFR08-R01 IIS-03 artifact/freeze-record/hash mismatch** with authenticated exact-source records before any implementation-baseline approval; escalate substantive conflicts to the owner rather than silently editing older freezes.
3. Record the canonical approved set and hashes; then draft a staged **Implementation & Verification Plan** (NCD-04 if adopted), clearly separating document preparation from any later execution permission.
4. Only a **new explicit owner authorization** may initiate coding, executing tests or editing repositories. No task is silently queued or started.

**Closure verdict: IIS-08 — FROZEN v1.0 / DOCUMENTARY CLOSED; parent provenance check FFR08-R01 OPEN.**
