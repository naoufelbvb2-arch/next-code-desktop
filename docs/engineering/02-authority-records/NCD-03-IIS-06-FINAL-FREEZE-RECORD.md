# NEXT CODE DESKTOP — NCD-03 / IIS-06
## FINAL FREEZE RECORD — v1.0

**Date:** 2026-10-20  
**Status:** **FROZEN v1.0 — DOCUMENTARY DESIGN / OWNER APPROVED**  
**Owner directive:** “اجل الان نجمد” — separate explicit authorization to freeze IIS-06 after approval of the narrow IIS-02/C-02 correction package and documentary FFR-02 review.  
**Final disposition:** **PASS FOR FREEZE / FROZEN v1.0**.  
**Implementation authorization:** **NONE.** Freeze does not authorize a source-code change, tests, migration, Desktop repository creation, process instrumentation, commit, or deployment.

## 1. Cryptographic integrity (exact UTF-8 files)

| Artifact | SHA-256 | Purpose |
|---|---|---|
| `NCD-03-IIS-06-DISCUSSION-MODEL-INTEGRATION-SPECIFICATION.md` | `5103f735c785d2b8a4fd98e79feafa4525991b171ba9f18e9c11642a082d4440` | **Canonical FROZEN v1.0** |
| `NCD-03-IIS-06-DISCUSSION-MODEL-INTEGRATION-SPECIFICATION-v0.3-ARCHIVE.md` | `43d7dd17682b0b6bc4e5d1822237eed08984374556bcd0d64a36923a71611089` | Exact copy of owner-reviewed Draft v0.3 |
| `NCD-03-IIS-06-DISCUSSION-MODEL-INTEGRATION-SPECIFICATION-v0.1-ARCHIVE.md` | `2edd4a3a88fff1031cd9f833073a4fb506faa4b6cd127b02c858f70ea3e0d740` | Preserved initial draft from canonical filename |
| `NCD-03-IIS-06-FFR-02-PARENT-RECONCILIATION-REVIEW.md` | `fb109e2d2174a855885beee1d3499e022bc1ef75e88607ffd49c5e3d242c162e` | Final documentary re-review |
| `NCD-03-IIS-02-C01-CONVERSATION-READ-PROJECTIONS-ADDENDUM.md` | `946cb7869ef90b95d615099e70ddbe036fe4d21249ba12fc8d2eb0fab56e0c62` | Narrow owner-approved IIS-02-C01 read DTO addendum |
| `NCD-03-C02-C01-D7-CANDIDATE-PERSISTENCE-V1-DEFERRAL.md` | `36ac863b426ea59b2e5fc8301291fcc75f499f6a016da685e9c9370f549f97fa` | Narrow owner-approved C-02-C01 v1 candidate persistence exception |

The SHA-256 for the Final Freeze Record itself is not embedded within this record, avoiding a self-referential checksum. The frozen file hash covers its exact UTF-8 bytes, including final §25.

## 2. Closure and adoption register

- **FFR-01:** Findings `FFR06-R01` through `FFR06-R08` reviewed; R01–R03 were cross-contract blockers.
- **Owner-approved cross-contract correction package:** `IIS-02-C01` binds existing `conversations.read` typed `availableProposals` and `discussionTurns` projections; `C-02-C01` defers structured durable storage/lifecycle for *unapproved* candidate decisions in Desktop v1.
- **FFR-02:** **PASS FOR OWNER FREEZE CONSIDERATION**: R01–R03 closed; R04–R08 corrections retained; `FFR06-R09` documents deferred same-turn retry UI.
- **Independent owner freeze directive:** accepted Draft v0.3 and adopted IIS06-D01–D17 as IIS-06 **FROZEN v1.0**; the 52 future acceptance cases I06-T01–I06-T52 remain **NOT EXECUTED**.
- **Cross-contract limits preserved:** 23 public IPC methods, 3 subscriptions, 5 private wire commands, 22 SQLite tables; no new public interface or Python task-execution authority. No contradiction with the earlier `IIS-01`–`IIS-05` freezes has been asserted as resolved by hidden changes.
- **Explicit deferred items:** live token streaming, same-turn provider retry UI, standalone pre-send summarization command, full unapproved-candidate registry, universal LLM egress interception, actual provider-route support proof and Windows process safety proof.

## 3. Source and process mutation declaration

This documentary work writes **only** the listed design artifacts. It does **not** edit the frozen parent documents, GitHub Next Code engine, Desktop production source, SQL databases or runtime installation. No executable tests were run, and no claim of functioning Discussion, provider support or mission control is made. All implementation/testing remains a later **separate owner authorization**.

## 4. Next stage

The next design-only deliverable is `NCD-03 / IIS-07 — Project File Broker`, followed by IIS-08 Integration Testing & Acceptance and final cross-contract review. IIS-07 must inherit the frozen IIS-06 contract and its two controlling narrow addenda, and must not silently broaden project filesystem or provider disclosure rights.

**Closure verdict:** **IIS-06 FROZEN v1.0 — DOCUMENTARY CLOSED.**
