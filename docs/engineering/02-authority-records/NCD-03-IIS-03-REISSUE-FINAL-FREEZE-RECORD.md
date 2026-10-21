# NEXT CODE DESKTOP — NCD-03 / IIS-03
## FINAL FREEZE RECORD — v1.0 REISSUE / CONTROLLED RECONSTRUCTION

**Date:** 2026-10-20  
**Outcome:** **FROZEN v1.0 — OWNER APPROVED REISSUE / DOCUMENTARY DESIGN**  
**Exact owner response:** “اجل نعتمدها” to the proposed adoption and formal reissue freeze of `v1.0-RC1`.  
**Implementation permission:** **NONE**; no permission for engine edits, Desktop coding, tests, migrations, child processes, release, or model network requests.

## 1. Canonical new frozen identity

- **Authoritative reissued specification:** `NCD-03-IIS-03-PYTHON-PROCESS-SUPERVISOR-SPECIFICATION-v1.0-REISSUE-FROZEN.md`
- **SHA-256 (exact new UTF-8 `.md` bytes):** `d79d0f5a0960b64c7c806047407c7632d564c1cf4331ae7c5f185c0df129df48`
- **Size:** 45,676 bytes
- **Origin candidate (preserved):** `NCD-03-IIS-03-PYTHON-PROCESS-SUPERVISOR-RECOVERY-CANDIDATE-v1.0-RC1.md`
- **Origin candidate SHA-256:** `4bc1e67613c10eb11632a2c96b35295f4adbbbce797311892109810385fc9ee7`
- **Provenance review:** `NCD-03-IIS-03-FINAL-PROVENANCE-RESOLUTION-REVIEW.md` (PRR-01)
- **Draft text projection archive:** `NCD-03-IIS-03-RECOVERED-v0.1-TEXT-PROJECTION-ARCHIVE.md`
- **Candidate difference evidence:** `NCD-03-IIS-03-RECOVERY-RC1-TEXT-DIFF.patch`
- **Independent cross-contract closeout:** `NCD-FCCR-01-C01-IIS03-REISSUE-CLOSURE.md`

**Critical historical qualification:** The historical owner-reported IIS-03 `FROZEN v1.0` raw file, original freeze record and original hash were **NOT RECOVERED**. This is a **new 2026-10-20 reissue and new hash**, not an assertion of byte-equivalence to the lost historical artifact. The Library file headed `DRAFT v0.1` and its text projection are nonnormative archives; they are not this reissue. The owner-approved frozen technical content is the RC1 proposal with its explicitly traced downstream reconciliations, adopted as one package.

## 2. Approval scope and frozen contract limitations

1. Retain Electron Main-only Python process supervision; private JSONL stdin/stdout and diagnostic stderr; no network server or generic plugin host.
2. Maintain strict Discussion / Coding Task process separation, one active Coding Task globally and at most 20 queued, single-use atomic task admission, immutable result receipts and commit-before-spawn.
3. No automatic task rerun or ambiguous LLM resend after crashes; no v1 public same-turn retry UI/API.
4. Main-owned task event validation/durable commit before UI; only actual engine evidence may produce verified terminal state; conflicting event integrity remains sticky.
5. Cancellation request != task cancelled; Windows descendant safety verification and workspace writer-lease release remain separate from valid engine task outcome.
6. Strict inherited 5 JSONL message types / 5 actions, 23 IPC methods / 3 subscriptions, 22 SQLite tables; no unapproved expansion.
7. Preserve agreed IIS-02-C01 and C-02-C01 corrections and all explicit v1 deferrals.
8. The recovered file was revised **administratively** to change preapproval statements into this owner-approved freeze and to describe provenance. Its technical meaning is the expressly approved RC1. No earlier frozen parent is overwritten by this new record.

## 3. Evidence and scope of verification

| Gate | Status |
|---|---|
| Current owner adoption of RC1 as reissue | **PASS — explicit** |
| Exact-byte SHA-256 of new frozen reissue | **PASS — calculated above** |
| Candidate/draft provenance and difference archive | **PASS — available documentary evidence** |
| Match to historical lost IIS-03 file | **NOT PROVEN / original remains missing** |
| Cross-contract documentary comparison | **PASS within PRR-01/FCCR-01-C01 scope** |
| Actual Windows process-tree cleanup / Job Object behavior | **NOT RUN** |
| JSONL/Electron/SQLite integration tests | **NOT RUN** |
| Model integration, real engine events and cancellation hooks | **NOT RUN / not established as implemented** |
| Product acceptance IIS-08 G0–G9 | **NOT RUN** |

**Freeze status is irrevocably documentary until changed through explicit owner-approved change control.** Any runtime implementation acceptance is a separate authorization and verification process.

## 4. Authority and next step

For **future design and planning**, reference the exact named `v1.0-REISSUE-FROZEN.md` and its digest, not the old same-name Library Draft v0.1 or the now-nonnormative RC1 candidate. Publish the closeout addendum to FCCR-01 while keeping its historical conditional review unmodified. NCD-04 may be **drafted as a plan** after documentary closeout; coding or tests remain unauthorized.
