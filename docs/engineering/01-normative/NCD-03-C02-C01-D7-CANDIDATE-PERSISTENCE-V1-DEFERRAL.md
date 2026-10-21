# NEXT CODE DESKTOP — NCD-03 / C-02-C01
## C02-D7 v1 Decision-Candidate Persistence Deferral — Narrow Owner-Approved Exception

**Status:** OWNER-APPROVED LIMITED v1 DEFERRAL — DOCUMENTARY DESIGN ONLY  
**Date:** 2026-10-20  
**Owner decision:** Approves the *deferral branch* of IIS-06 FFR06-R03, not an IIS-04 schema amendment.  
**Parent:** NCD-03/C-02 **FROZEN v1.0**, especially approved **C02-D7**; IIS-04 **FROZEN v1.0**, **22 tables**.  
**Implementation authorization:** NONE. No edits to original parent text, engine/repository, SQLite DDL, migration, tests or runtime.

## 1. Exact exception to C02-D7 for Desktop v1 only

C02-D7 continues to require model-derived decisions to be treated as untrusted **candidate / unconfirmed** until a distinct, verifiable, explicit user confirmation is stored and checked by Electron Main. However, **only for the first Desktop release**, its otherwise-approved requirement for a **separately durable, structured unapproved decision-candidate record with its own lifecycle/status/source links** is expressly **deferred**. The proposed unapproved/rejected candidate registry, candidate statuses and candidate-specific revision history are **not promised** by IIS-04's existing 22-table schema.

This is a **documented limitation**, not a claim that `approved_decisions`, `memory_summaries` or an assistant message is an equivalent structured candidate table. A later phase may design a separate candidate provenance/status schema and any necessary migration **only with a new owner-approved cross-contract change**.

## 2. What remains mandatory and authoritative

1. The authoritative transcript (`messages`) remains durable and unchanged by candidate extraction. Generated candidate text, if included in a safely persisted assistant answer, stays **ordinary lower-trust assistant text**, not a structured or approved decision; candidates that exist only in the private `discussion.send.decision_candidates` output may be discarded after their bounded ephemeral use.
2. Derived `memory_summaries` and `summary_sources` remain separately persisted only when IIS-04 T5 accepts and source-verifies them. Summaries have no approval authority and must never contain fabricated or foreign references.
3. `approved_decisions` may be created **only** when Main finds a specific, persisted, same-conversation user confirmation (`approval_message_id`) that genuinely and unambiguously approves the stated decision. A candidate value without such evidence must not be inserted there; an approval is not inferred from a model reply or transient candidate status.
4. User corrections and subsequent approvals remain represented through their original immutable messages and appropriately justified approved decision records; never rewrite or delete prior approvals to match a model's later suggestion. **Do not claim a full structured rejected/superseded status graph exists in v1.** More elaborate lifecycle representation, where demanded, requires a separately reviewed data-model addition.
5. No summary, original assistant suggestion or approved historical decision grants `Run Task`, file-write, worker-dispatch or external provider disclosure authority. Existing single-use proposal and consent boundaries remain unchanged.
6. For unapproved candidate material, the UI must not advertise persistence, searchable candidate status, rejection history, revision provenance or successful recovery after crash as if those records existed. A visible assistant suggestion is not an independently persisted candidate.

## 3. Compatibility and boundaries

- **No IIS-04 migration or 23rd table** is authorized; `approved_decisions` and `summary_sources` keep their frozen schema and source checks.
- No additional IIS-01 action, IIS-02 public method, UI confirmation modal or new hidden model/agent power is authorized.
- This exception changes **only** C02-D7's v1 *unapproved decision-candidate dedicated storage/lifecycle expectation*. Everything else in frozen C-02, including real user approval, source safety, model/provider consent and discussion-only authority, remains binding.
- Any claim of parity with C02-D7's full original candidate provenance lifecycle is **out of scope for Desktop v1** and must be stated as deferred in acceptance reports.

## 4. Verification obligations — NOT EXECUTED

- Model-returned candidate without user approval does **not** create a row in `approved_decisions`.
- Assistant text that discusses a candidate is retained only as ordinary persisted assistant text, where present.
- Explicit same-conversation user approval leads to an authorized `approved_decisions` record with `approval_message_id`; ambiguous or cross-conversation evidence never does.
- `memory_summaries` with `summary_sources` respect scope and do not promote candidate statuses.
- Old decisions and user corrections remain inspectable in original messages; UI does not assert an unsupported structured rejection/supersession model.
- Schema count remains exactly 22; no code, migration or runtime tests performed by this approval.

**Disposition:** C02-D7 remains frozen with this precise owner-approved **v1 exception** applied as a controlling interpretation when implementing IIS-06. It is not a wholesale repeal of C02-D7.
