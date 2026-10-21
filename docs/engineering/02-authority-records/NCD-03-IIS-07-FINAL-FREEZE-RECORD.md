# NEXT CODE DESKTOP — NCD-03 / IIS-07
## FINAL FREEZE RECORD — v1.0

**Date:** 2026-10-20  
**Status:** **FROZEN v1.0 — DOCUMENTARY DESIGN / OWNER APPROVED**  
**Owner directive:** “اجل الان ننتقل للتجميد” — explicit authorization after FFR-01 consolidated review.  
**Final disposition:** **PASS FOR DOCUMENTARY FREEZE / IIS-07 FROZEN v1.0**.  
**Implementation authorization:** **NONE**. No source code, runtime tests, Windows file-system experiments, database migrations, new Desktop repository, commit, or deployment is authorized by this record.

## 1. SHA-256 integrity of exact UTF-8 artifacts

| Artifact | SHA-256 | Meaning |
|---|---|---|
| `NCD-03-IIS-07-PROJECT-FILE-BROKER-SPECIFICATION.md` | `2fcf404d22e026a57fd95c70f73b741068834dc83883119f5182d77e988418e3` | **Canonical FROZEN v1.0** |
| `NCD-03-IIS-07-PROJECT-FILE-BROKER-SPECIFICATION-v0.2-ARCHIVE.md` | `0ae116cde8e30e2046d2caeb837ad1ab35c419b75294127707aa5d9ad1c1f7fb` | Exact approved FFR-01 corrected Draft v0.2 source snapshot |
| `NCD-03-IIS-07-PROJECT-FILE-BROKER-SPECIFICATION-v0.1-ARCHIVE.md` | `f1b21d7c98703024768febc3ffc3da078433be80c57ab9368a2c5ff99aeefd91` | Initial draft before FFR-01 |
| `NCD-03-IIS-07-FFR-01-CONSOLIDATED-REVIEW.md` | `a909e02e931b25e5a9967647829c0c3a075c9a55d5e11777642dd3412072550b` | Source documentary consolidated review |

Freeze Record checksum is not embedded in itself to avoid a circular fingerprint.

## 2. Accepted scope and non-regression guarantees

- The owner approved **IIS07-D01–D18** and incorporated **FFR07-R01–R08** after the documentary **CONDITIONAL PASS**. The same review findings are now **closed for design freeze**, not proven by runnable security or integration tests.
- Exactly **56 acceptance requirements** (`I07-T01`–`I07-T56`) are preserved for later authorized execution. At freeze time, **none had been executed** under this documentation workflow.
- Ownership remains Electron Main; the two Python broker actions `project.discover`, `project.read` and the two existing Renderer read methods `projects.listFiles`, `projects.previewFile` are unchanged.
- No change to frozen IIS-01–IIS-06, C-02/C-03, or their narrow approved addenda. No extra JSONL command, Preload method, event subscription, SQLite table, remote HTTP server, Python unrestricted file tool, or unapproved Windows sandbox claim.
- New IIS-07 numeric budgets and safeguards are adopted only as **this** downstream v1 contract and never retroactively attributed to earlier parent contracts.

## 3. Security and implementation evidence still required

- Prove Windows handle-bound workspace containment against reparse/junction, ancestor swap, alias, ADS and same-byte modification races with the actual production implementation, not only path-string unit tests. If impossible within the frozen boundary, fail closed and seek a separately authorized engineering correction.
- Verify deterministic strict text/secret screening, size and encoding caps, secret-safe logging, exact precision of `mtime_ns`, and broker DTO/wire compatibility.
- Test scoped parent/session binding, limited queues and budgets, revocation-vs-handoff ordering, unknown downstream-provider receipt, stale cursors, HMAC key loss/restoration, and SQLite inspection evidence after crash/commit failures.
- Preserve the distinction **discovery → read preparation → authenticated local write → committed inspection evidence → model/provider receipt**, with no unproven inference of final consumption.
- Do not claim an OS sandbox or perfect secret detection. Sensitive content remains denied by policy; any new authority requires separate approval.

## 4. Release statement and next step

This freeze closes IIS-07 as a design artifact only. The **next design-only phase** is `NCD-03 / IIS-08 — Integration Testing & Acceptance`, followed by cross-contract final review and separately owner-approved implementation planning. This record itself grants **no permission to implement, test production behavior or edit the Next Code engine**.

**Closure verdict: IIS-07 — FROZEN v1.0 / DOCUMENTARY CLOSED.**
