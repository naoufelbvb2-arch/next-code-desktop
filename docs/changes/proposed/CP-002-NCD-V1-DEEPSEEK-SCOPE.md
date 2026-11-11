# CHANGE-PROPOSAL CP-002 / NCD-V1 — DeepSeek Single-Provider Scope

**PROPOSED — DRAFT — NOT FROZEN — NOT ADOPTED.** Prepared 2026-11-10 under
P9-R02. This file is outside the frozen normative inventory and is not added to
the delivery/addenda manifests. Approval of the product direction is not approval
of the following precise test-applicability amendments.

Owner decision already received: V1 Coding Engine is Next Code AgentOS only;
production LLM provider DeepSeek only; additional production providers and local
inference deferred; multi-engine platform outside V1. Desktop and Engine remain
independent repositories. This proposal changes neither public surface nor code.

## 1. Decision needed before freezing

Approve or revise sections2–5 as a narrow acceptance-profile addendum, including
the **separate proposed limitation to the currently verified single advertised
model** (`deepseek-flash`). DeepSeek-only by itself does **not** imply one model:
I06-T03 can require two distinct DeepSeek models. That extra limitation needs
explicit owner approval and is not inferred from the provider decision.

If approved, publish an authenticated addendum through the existing change
control workflow; preserve all originals and historical outcomes, and reevaluate
only the listed capability variants. Until then current statuses stay unchanged;
no PASS, NOT_APPLICABLE or acceptance granted by this proposal.

## 2. Proposed normative product scope

V1 uses only Next Code AgentOS through the existing private bridge, existing
ModelGateway and exact verified production DeepSeek destination. The only
initial advertised model is the existing verified `deepseek-flash` route.
Additional verified DeepSeek models require their own route evidence before
advertising. Additional providers/local inference are deferred capabilities,
not simulated production routes. No generic multi-engine or provider platform.

ModelGateway remains the actual invocation path. Provider identity comes from
the effective destination, not display labels or model names. Persist the issued
model/provider binding; preference/configuration changes cannot retarget an
active attempt. Unsupported/unresolved route or destination mismatch fails closed
before source release, with no silent fallback or automatic retry.

Exact project/provider/disclosure-class consent, revocation at the last
Main-controlled release, sensitive-content denial and truthful post-release
uncertainty remain mandatory. DeepSeek-only never implies blanket consent.
No source path, raw file content, credential or process capability is added to
Renderer. Test-only independent captured providers remain permitted isolation
fixtures, never production choices or genuine local-inference evidence.

## 3. Source conflicts and proposed narrow amendments

Sources: IIS-06 §4 (IIS06-D01 model registry), §12–13 project awareness/consent, §20 case
catalog and controlling §24; IIS-07 §3.2 active parent, §9 disclosure, §19 case
catalog; IIS-08 §4 gate register, I08-T85/T88, §10 E2E journeys and §12 final
acceptance criteria; NCD-00 decision D-04 (show only genuinely supported models)
and NCD-04 §5.10 P9. File titles/byte baselines remain the delivered originals.

| Case | Current requirement / conflict classification | Proposed V1 amendment, only after approval |
|---|---|---|
| I06-T03 | Two models under the same display provider. **CONTRACT_CONFLICT** if V1 advertises only one model; this is a model-count issue, not solved by DeepSeek-only | Keep original ID/wording/history. Defer the two-genuine-model positive variant while only one verified model is advertised. Keep identity collision, unsupported model rejection and separate captured-route isolation tests mandatory. Re-enable positive requirement before advertising a second DeepSeek model |
| I06-T04 | Preference changes future requests only; issued route frozen. Core invariant has **NO_CONFLICT**; a two-valid-production-choice UI demonstration is unavailable | Keep immutable issuance and unsupported preference rejection mandatory. Captured future-only switching remains labeled fixture evidence. Defer only positive UI switch between two genuinely available production models until such models exist; never turn fixture switching into live proof |
| I06-T32 | Provider switch/new class/new challenge and local-model scope. **CONTRACT_CONFLICT** for positive second-provider/local capability under V1 deferral | Keep exact current DeepSeek project/provider/class challenge, grant, revoke, changed-class denial and wrong/unresolved-provider refusal mandatory. Defer only positive use of a second production provider or actual local model; synthetic isolation tests remain mandatory |
| I07-T42 | Actual local-model sensitive-file read without external grant. **CONTRACT_CONFLICT** with deferred local inference | Defer positive local-model route variant. Keep sensitive-content denial mandatory for all V1 local preview/discover/read and DeepSeek handoff paths. Do not relabel an offline Gateway as a local model |
| E2E-05 | Includes provider switch. **CONTRACT_CONFLICT** for positive second production destination | V1 journey: safe synthetic project plus synthetic secrets → actual discover/read → exact DeepSeek consent challenge/grant/revoke → attempted unsupported destination/model change rejected without new source release → capture Main's actual handoff → crash recovery shows partial honestly. Keep all source-security/order/evidence clauses. New real-provider receipt is not inferred from Python capture |

The remaining I06-T03/T32 and I07-T42 NOT_RUN, I06-T04/E2E-05 INCONCLUSIVE are
retained while this proposal is pending. Additional variants cannot silently
disappear inside a case-level PASS. Current runtime supports only one validated
route and is consistent with NCD-00 D-04; the conflicts concern the future V1
acceptance profile, not permission to bypass current mandatory checks.

## 4. Proposed acceptance accounting

After explicit adoption only, retain original case IDs/text and a variant-level
applicability ledger. Deferred capability variants keep executable verdict
`NOT_RUN` plus documentary tag `DEFERRED_OUT_OF_V1_BY_APPROVED_NCD_V1`; this tag
is **not a new result status or PASS**. Only those enumerated capability variants
may be excluded from V1 mandatory applicability through this approved addendum.
All surviving safety variants must have actual passing evidence before a
case/gate can close. No blanket N/A. Historical R01 results stay immutable.

This explicitly amends the relevant capability applicability in IIS-06 §20,
IIS-07 §19, IIS-08 E2E-05 and its §12 mandatory-parent aggregation, solely for
the variants listed above. No other acceptance or severity rule changes.

- **G3:** evaluate genuine advertised DeepSeek binding/context/consent, captured
  negative isolation and approved variant applicability. Approval alone is not
  G3 PASS and does not supply missing actual evidence.
- **G6:** completely unchanged. Native Symlink/mount/alias/TOCTOU/security proof
  cannot be deferred by this product-scope addendum. Unproved containment stays
  BLOCKED even if all provider variants are resolved.
- **G9-dev:** still requires mandatory V1 evidence, approved deviations, human
  review and separate owner acceptance. Scope ratification cannot accept the
  product, waive P0/P1 or cure raw-evidence loss.
- G8-package/E2E-08 remain NOT_RUN — FUTURE DISTRIBUTION; no P10 authority.

## 5. Compatibility and verification after adoption

No public method/subscription/action/event/table change:23+3 IPC,5 JSONL request
actions,5 outer message types,9 closed task events,22 SQLite tables. No Engine
change, schema migration or new provider dependency. Existing historical model
and attempt records retain their original identity; no reinterpretation/replay.

Required verification: advertised-route inventory equals verified DeepSeek routes;
unknown/unavailable/unsupported choices fail closed; independent captured A/B
labels cannot substitute destination identities; issued route immutable; exact
project/provider/class grants and revocation order; changed class needs its own
challenge; no source receipt/remote recall inflation; no paid implicit retry;
frozen hashes and all unmodified G6 safety cases; exact original test inventory
with approved variant annotations. Any genuine route expansion reinstates its
deferred positive variants before advertising, through separately authorized
implementation/testing. No such expansion is authorized here.

Owner action requested: approve or revise this precise proposed amendment and
single-advertised-model limitation; then authorize its formal authenticated
adoption separately from P9 acceptance. Until that decision, **NOT ADOPTED**.
