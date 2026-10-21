# NEXT CODE DESKTOP — NCD-03 / IIS-06
## Discussion & Model Integration — Model Registry, Durable Turns, Context Assembly, Provider Boundaries and Controlled Recovery

**Status:** **FROZEN v1.0 — FFR-01/FFR-02 CLOSED — OWNER APPROVED / DESIGN ONLY (2026-10-20)**
**Date:** 2026-10-20  
**Authority:** NCD-00/00-C01, NCD-01, NCD-02, NCD-03/C-01, C-02, C-03; IIS-01, IIS-02, IIS-03, IIS-04 and IIS-05, all as previously approved/frozen.  
**Implementation authorization:** **NONE.** This design freeze does not authorize modifying the Next Code engine, creating a Desktop repository, implementing a bridge, running production tests, or deploying.  
**Tool neutrality:** No external implementation agent or IDE is part of this normative contract.  
**Read rule (final v1.0):** The owner explicitly approved and froze IIS06-D01–D17 on 2026-10-20 after FFR-02 passed and the two narrow parent addenda had been approved separately. `IIS-02-C01` controls the typed Main-minted `ConversationViewPage` proposal/turn read projections; `C-02-C01` controls Desktop-v1 deferral of structured unapproved candidate-decision persistence. Sections 23–24 record the pre-freeze decisions and repairs as historical provenance; their former "pending" language does not reopen resolved gates. Controlling final disposition is §25 plus the independent Final Freeze Record. All other frozen parent rules stand, including exactly 23 IPC methods, 3 subscriptions, 5 private wire commands, and 22 SQLite tables. No implementation is authorized.

---

## 1. Purpose, deliverables, non-goals

IIS-06 specifies the integration design for the **non-executing Next Code conversation path**: user sends a message, Electron Main commits it to SQLite, resolves the chosen discussion model/provider, builds a bounded provenance-aware context, supervises a Python Discussion Service using the already frozen JSONL contract, accepts one correlated final result or a truthful error, and projects the durable state back into React. Advisory task proposals, confirmed decisions, model-assisted summaries and carefully authorized project-source disclosure are included, but **code execution is never implied**.

**Goals:** (a) predictable model selection, (b) durable and nonduplicated conversation records, (c) transparent context pressure and source provenance, (d) independent discussion versus coding task authority, (e) safe provider selection and source disclosure, (f) bounded failure, retry and restart behavior, (g) implementable conformance obligations.

**Out of scope:** a generic multi-agent hosting platform; coding-worker routing redesign; new providers assumed to exist; background auto-coding; cloud-hosted Desktop services; arbitrary model/plugin SDK; new SQL/IPC/JSONL public surfaces; universal LLM egress interception (C-02 FFR-R01 deliberately deferred); provider-account management UI; secure Windows sandbox certification; full message-token streaming (no frozen wire chunk schema exists); exact provider billing guarantees; implementation of IIS-07's project broker policy.

## 2. Normative cross-contract matrix and precedence

| Frozen source | Binding rule for IIS-06 |
|---|---|
| NCD-00, NCD-01, NCD-02 | Dedicated Windows local Desktop; Dark Premium Chat/Composer; explicit Run Task; Electron Main owns authority; Python sidecar, private stdio JSONL, no local HTTP/TCP service |
| C-01 | Separate optional coding `ConversationContext` with up to 3 prior TaskOutcomes, 6 recent messages, 5 preferences and 3,000 rendered characters; no wholesale discussion history handoff |
| C-02 D1–D4 | Discussion-only Python process, Python-assisted intent as advisory, proposal without execute rights, single-use scope/goal-bound explicit Run Task confirmation |
| C-02 D5–D8; C-03 D11 | SQLite transcript; recent messages + source-linked derived summaries + source-confirmed approved decisions; budget-pressure compaction, not a fixed message cadence |
| C-02 D9; C-03 D9 | One explicitly validated model per discussion request; central logical registry + actual ModelGateway route; no silent provider/model fallback; coding-agent selection independent |
| C-02 D10–D17, FFR-R02/R03 | Main-owned read-only project broker; restricted file/secret protections, staged grounded inspection, external disclosure consent per effective provider/project/class; adaptive inspection with hard ceilings |
| C-02 FFR-R01 | Universal all-LLM outbound security gate explicitly deferred; must not be silently reintroduced as a freeze prerequisite |
| C-03 D1/D3/D4/D12; IIS-03 | One supervised restartable Discussion child per Main; READY before commands; closed role allowlists; bound requests; truthful failure handling; no unsafe replay |
| IIS-01 v1.0 | Five-key `version,type,message_id,correlation_id,payload` envelope; only `discussion.send`, `project.discover`, `project.read`, `task.execute`, `task.cancel`; fixed ContextV1 and completed discussion result; no streaming wire type |
| IIS-02 v1.0 | Exactly 23 Promise methods and three scoped subscriptions; typed `MessageAcceptance`, `ModelChoice`, `ModelSelectionView`, `ConversationViewPage`, `Disclosure...` and typed errors |
| IIS-04 v1.0 | One Main-owned SQLite with 22 tables; `messages`, `discussion_turns`, `discussion_attempts`, `memory_summaries`, `summary_sources`, `approved_decisions`, `task_proposals`, `mutation_receipts`, `disclosure_*`; T1/T5/T6 transactions |
| IIS-05 v1.0 | Mission Control consumes coding task truth only; discussion answers, broker inspection progress, and consent hints do not become `task_events` or coding-worker events |

**Rule of interpretation:** any earlier “proposed” wording embedded in frozen parent historical decisions is subordinate to that parent's final v1 freeze declaration. This IIS may define internal integration algorithms within the frozen public schemas, but cannot reinterpret an approved interface.

## 3. Owners, trust zones and integration diagram

```text
React Chat / Composer / model selector
    | ONLY fixed IIS-02 typed Preload surface
    v
Electron Main (authoritative)
    | sender validation + model registry + route resolver
    | T1 message/receipt commit; T5 attempt/result/context/decisions
    | T6 provider-scoped consent; canonical project resolver
    | request/attempt identity map; IIS-03 process supervisor
    +-----> SQLite (sole Desktop transcript/memory authority)
    |
    | IIS-01 validated JSONL discussion.send on private stdin/stdout
    v
Python Discussion Service (restartable; NO Desktop DB authority)
    | prompt/context interpretation (lower-trust history)
    | scoped IIS-01 project.discover / project.read -> Main broker
    v
ModelGateway -> explicitly selected supported model route
    |
    v
One correlated discussion.send final completed/rejected/error result
    |
    v
Main checks actual request/session/attempt -> T5 COMMIT -> IIS-02 hints
    |
    v
React reads stored conversation state; no auto task execution
```

Main owns persistent context selection, project identities, user approval, model registry public selection and effective-provider policy. Python owns only transient discussion orchestration and **actual supported ModelGateway invocation**. The model's generated reply, decision candidates and task proposals are untrusted data. Discussion's broker calls are allowed only under an active Main-issued parent request. Python has no Desktop SQLite connection, write tools, coding task dispatch, shell or direct arbitrary project-read entitlement in this contract. The approved application-level separation is **not** represented as a hard Windows security sandbox.

## 4. IIS06-D01 — Model registry identity and actual route resolution (FROZEN v1.0)

Define an **internal** Main-managed model registry projection; this is not a new database table or public IPC API. A route descriptor contains, as locally trusted configuration metadata, the stable `modelId`, actual `effectiveProviderKey`/destination class, display name, provider display label, discussion capability flag, effective supported context ceiling and output reserve (if known), availability check provenance/time, secure credential reference (never the secret itself), and a specific allowed ModelGateway route identifier. The precise on-disk internal configuration format may be versioned in implementation; it must not be confused with `ui_preferences.safe_json` or a model-generated route string.

1. `models.list()` returns **only** frozen `ModelChoice` fields: `modelId`, `providerLabel`, `displayName`, `capabilities`, `availability` (`available|unavailable|unknown`). Do not expose raw endpoints, credential material, internal provider keys or private configuration.
2. Main verifies each submitted `modelId` against its real configured supported discussion routes. `available` is justified by relevant measured/configuration facts; `unknown` is not marketed as available. If the route cannot be proven ready at dispatch, fail as `MODEL_UNAVAILABLE`/appropriate typed error.
3. The effective provider is a trusted *destination identity*, not the marketing display label, renderer-selected provider text, an LLM claim or inferred model name. Identical labels do not make two destinations interchangeable. Main's resolution and Python ModelGateway's actual destination must agree, or the call fails closed. Testable integration instrumentation/route assertion is required; merely sending `model_id` cannot cryptographically prove where a compromised bridge sent data.
4. Model IDs remain stable logical identifiers for message replay/provenance; editing the registry later cannot silently reinterpret a previously issued attempt. At issuance persist selected `model_id` plus the verified `effective_provider_key` in `discussion_attempts` as IIS-04 already requires. The route cannot change for that attempt.
5. The coding AgentOS/Lead Architect or specialist model routes are **not modified** when the user changes the discussion model. The registry does not imply arbitrary provider/model routing support exists in the present engine; this is a future adapter/conformance obligation, subject to separate code authorization.
6. Credentials live in a separately chosen OS/application secure credential mechanism; only opaque references are permitted in internal registry configuration. No password/API key, bearer token, raw endpoint secret or provider response body containing credentials enters SQLite, renderer DTOs or diagnostics. Credential provisioning UI/API is outside v1's 23-method surface.
7. **Route attestation scope (FFR06-R07):** a Main-local model registry is not sufficient proof of Python's actual provider destination. At issue time the implementation must ensure a matched trusted bridge/ModelGateway configuration and verify its selected destination through independently instrumented conformance evidence. Where the frozen JSONL payload cannot convey or verify an effective-provider binding and that alignment cannot be established, disable that route and display `MODEL_UNAVAILABLE`; do not weaken consent to a display label or assert runtime support from this paper.

## 5. IIS06-D02 — Composer preference and per-message immutable model choice (FROZEN v1.0)

- `models.setDiscussionPreference(modelId)` persists only the Main-validated preferred logical discussion model for **future** messages using the frozen IIS-02 method; `preferences.get()` exposes only allowed safe UI fields. The selected model remains an explicit field on each `conversations.sendMessage` call, validated anew at send time.
- The model selector must distinguish available, unavailable and unknown truthfully; never quietly substitute a default when a chosen route is missing, offline, unsupported or unconfigured. Explicit new user choice affects subsequent messages, not a previously persisted/issued turn.
- Renderer state (selected project, conversation, unsent draft, chosen model) is display/input state. `clientMutationId` is a durable mutation key, **not** a provider-routing or authorization capability. `draftId` is never a persisted conversation by itself.
- The first durable user send may create the conversation under the chosen registered canonical project; on validation/commit failure, retain the local unsent draft and do not navigate as if the message was saved. Model service failure *after* commit cannot delete or duplicate the user turn.

## 6. IIS06-D03 — Discussion lifecycle and exact request identity (FROZEN v1.0)

The **logical user turn** is identified by persisted `user_message_id`; a **provider attempt** is a distinct Main-issued `discussion_attempts.attempt_id`; the **wire request** is one fresh IIS-01 root `message_id` on the current READY Discussion child connection. Main tracks an internal bound mapping `(processSessionRef,wireRequestMessageId) -> (conversationId,userMessageId,attemptId,modelId,effectiveProviderKey,projectRef,contextRevision)`; this is not an extra JSONL field or SQLite table. `response.correlation_id` resolves to the actual outstanding wire request on that same live connection.

**Happy path:**

1. Main validates sender, project and model, and executes IIS-04 **T1**: save immutable original user message, initial `discussion_turns`, `mutation_receipts` with frozen original `MessageAcceptance`, then commit. Only after commit return `deliveryState:'persisted'`.
2. Main obtains relevant history and snapshots it under the correct project/conversation and provider-specific context budget (section 8). Validate that `user_message_id` and `text` are exactly the accepted turn; do not create a second user message when dispatching.
3. Before provider issue, Main creates an attempt row with model, verified effective provider, lineage, process-session binding when known and initial state. Main marks `issued` conservatively as a potentially billable/ambiguous operation. Actual readiness and dispatch follow IIS-03; never await a network model call inside SQLite transaction.
4. Main transmits **only** the frozen `discussion.send` input `{conversation_id,user_message_id,text,model_id,context_snapshot,project_ref}` under a new complete v1 JSONL request envelope after READY. `project_ref` is the currently registered project ID or null exactly as allowed by IIS-01, never a free-form path.
5. Python resolves the authorized request in its own transient scope, optionally requests bounded broker data through the existing `project.discover`/`project.read` actions, and invokes only the actual supported ModelGateway route; it returns **one** terminal `response.completed` or `response.rejected` or correlated `error` (no `response.accepted` for discussion).
6. Main validates correlation/session/original attempt, closed result schema, model-specific content bounds and stale-state conflicts. In IIS-04 **T5**, it atomically inserts **at most one** assistant reply for the accepted logical completion and updates the `discussion_turns`/attempt state. Only after commit push `ConversationChanged` as a hint; UI re-reads `conversations.read`.

**State rule:** the frozen DB turn states are `pending|issued|answered|failed|unknown`. Provider attempts preserve individually traceable issued/completed/failed/ambiguous facts as implementable closed internal status checks without widening public IPC. `answered` is only for a validated **completed** answer durably committed; merely issuing a provider call, seeing partial text, or obtaining a Python READY does not satisfy it. **FFR06-R02 (resolved):** persistence alone is not Renderer authorization. The owner-approved `IIS-02-C01` addendum now supplies bounded, Main-verified typed `discussionTurns` and safe last-attempt read projections. Precise restored states may be shown only when grounded by those returned DTO fields; absence or contradictory provenance remains unknown/null, not a guessed answer or status. The earlier FFR-01 freeze blocker is closed as detailed in §24.

**Ordering policy:** serialize provider-dependent `discussion.send` attempts **per conversation** by default (IIS-03 §5.3), while separately scoped conversations can share the one Discussion child within the frozen aggregate 16 in-flight requests. Do not use “currently selected conversation” as parent scope: stable binding is per outstanding wire request. Guard against races with changing conversation/project selection and with stale completion after an explicit retry.

## 7. IIS06-D04 — Frozen JSONL result parsing and no token-stream fiction (FROZEN v1.0)

For `discussion.send`, the only successful final wire result is exactly:

```json
{
  "answer": "string",
  "task_proposal": null,
  "summary_candidates": [],
  "decision_candidates": []
}
```

`task_proposal`, when present, is `{ "goal":string, "reason":string }`; each summary/decision candidate is `{ "text":string, "source_message_ids":array<ID> }` with the IIS-01 bounded schema. All are **advisory**. Every provider result is validated before SQLite effects; unknown properties, duplicate JSON keys, malformed UTF-8, unsupported response status, wrong correlation, unsupported model or over-limit fields are failures, not tolerated extensions. `response.rejected` and `error` are mapped through Main to a frozen IIS-02 `UiErrorCode` plus sanitized message.

**No v1 answer-chunk streaming:** IIS-01 defines a completed discussion result, not `discussion.delta`, tokens, partial JSONL reply, or additional event type. React may display a truthful waiting indicator and later the committed final answer. It **must not** fabricate streaming text, claim partial text as a committed assistant reply, or parse `stderr` as model output. Adding token streaming requires a separately authorized versioned parent wire/IPC design, not an IIS-06 “implementation detail.” When an answer exceeds the frozen response boundary, the provider/bridge must produce an in-limit **truthfully identified bounded/truncated** result, or safely reject; never trim a received JSONL frame, silently cut committed text, or imply full answer completeness if the contract does not furnish a verifiable truncation signal. With no explicit `answer_truncated` field in the frozen result schema, the bridge cannot promise a machine-readable truncated flag; a user-visible in-band notice must be truthful, constrained and tested. Respect the independent Unicode-code-point and serialized UTF-8 byte ceilings.

## 8. IIS06-D05 — Main-owned context assembly and model-specific budgeting (FROZEN v1.0)

The transmitted **exact frozen ContextV1** is:

```json
{
  "recent_messages": [{"message_id":"m1","role":"user","text":"..."}],
  "summaries": [{"summary_id":"s1","text":"...","source_message_ids":["m0"]}],
  "decisions": [{"decision_id":"d1","text":"...","approval_message_id":"m2"}],
  "context_revision": 0
}
```

No additional context keys, role types, arbitrary system-instruction entries or task-execution permission fields are allowed. Main selects only the **same conversation and registered canonical project**. The active user's `text` is already separately in `discussion.send.input.text`; do not duplicate the identical current user message as a second distinct conversational turn in `recent_messages`. Retain exact original persisted text and chronological source ordering. Approved decisions are selected solely from `approved_decisions` and carry a valid same-conversation user approval message; candidate decisions never enter this array.

**Hard IIS-01 ContextV1 transmission caps:** ≤ **96 KiB** serialized UTF-8, ≤ **20 recent messages**, ≤ **10 summaries**, ≤ **20 decisions**. These are transport caps, **not** an instruction to always fill the arrays or a provider guarantee. Current user input ≤ **16,384 Unicode code points**, `model_id` ≤128, total JSONL record including LF ≤262,144 UTF-8 bytes. Applicable provider/model output reserve, actual system/safety instructions, current user request, and uncertainty margin are accounted for **before selecting optional history**. Provider-specific token counting may be estimated; unknown window sizes or tokenizer behavior require conservative clipping of *optional* history or a user-visible error, never silent model substitution or truncation of the current user request.

**Deterministic selection proposal:** (1) preserve current user request and relevant governing instructions, (2) include verified approved decisions relevant to this conversation and intent without treating them as tool authority, (3) include the most recent coherent message pairs in chronological order, (4) include source-linked summaries covering older history, (5) prune least-relevant optional history to satisfy both ContextV1 and model limits. Context selection/relevance scores are internal advisory heuristics, not records of historical truth. If source links are absent/stale/cross-project, exclude or fail without falsifying memory coverage.

The **C-01 coding `ConversationContext` is assembled separately at approved Run Task handoff** and strictly retains its own limits: maximum 3 previous task outcomes, 6 messages, 5 advisory preferences and 3,000 rendered characters. Never rebrand a discussion `ContextV1` as that coding context or pass the entire transcript to AgentOS.

## 9. IIS06-D06 — Budget-pressure summarization within the *existing* wire (FROZEN v1.0)

C-02 requires compaction driven by selected model context pressure, not every fixed N messages. However IIS-01 has **no sixth `discussion.summarize` action**. Therefore IIS-06 v1 uses the **existing `discussion.send` returned `summary_candidates`** opportunistically, based on source messages that were actually included in the issued context; it cannot demand an additional standalone summary operation through an undeclared command.

- On pressure, Main chooses an eligible older, source-identifiable segment that *fits the current bounded request* when feasible; Python may return concise `summary_candidates` for these visible sources while answering the user's message. Sources outside the transmitted context are **not known to Python** merely because their IDs exist in SQLite.
- Each candidate's source IDs must resolve to actual retained messages in that exact conversation and authorized source revision. Main verifies input snapshot relationship, source text availability and absence of foreign/fictional IDs. Persist accepted text only as `memory_summaries` plus `summary_sources`, always `derived`, never `approved`. Original messages remain intact. Later context reads may use the summary to replace optional older text.
- A candidate with unsupported source coverage, duplicate/foreign ID, stale context, oversized content or unconstrained assistant instructions is rejected without tampering with original history. An LLM summary is not proof that all sources are semantically represented correctly; the UI must keep it source-attributed and lower-trust.
- If no safe compaction can be formed during the current request, Main may send a smaller bounded context, exposing a limitation where relevant; if critical material cannot fit safely, show an explicit error. It cannot invent summary provenance or send an extra unapproved wire action.

**FFR06-R04 — documented pre-send compaction capability limit:** C02-D7/D8 authorizes pressure-triggered, source-scoped summarization and explicitly allows bounded degraded context or an error when compaction fails. Frozen IIS-01 supplies no independent pre-send summarization command. A same-`discussion.send` `summary_candidates` result can help **later** turns only; it cannot retroactively enlarge the context of the turn already sent. Main may request candidate summaries only for source text actually visible in the sent ContextV1, and must revalidate source scope/revision at acceptance. At severe pressure, this v1 path uses bounded history or a visible failure; it must not claim that pre-send compaction succeeded, fabricate source coverage or quietly invent another JSONL action. If product acceptance later requires guaranteed pre-send compaction, it requires a separate owner-approved parent contract change.

## 10. IIS06-D07 — Approved decisions: user evidence rather than model inference (FROZEN v1.0)

The model may emit `decision_candidates` with bounded text and purported source IDs. A decision is **not approved** until Main locates a persisted same-conversation `role='user'` message clearly confirming *that precise decision*, including an unambiguous referent and conversation/workspace scope. The source IDs in the candidate are advisory; they are not a user signature and cannot self-certify an approval. Follow frozen C-02 FFR-R02: ordinary explicit conversational confirmation can suffice; IIS-06 introduces **no mandatory confirmation modal**.

Conservative pipeline: candidate received → sanitize/resolve candidate source links → retain only advisory candidate in the transient result as permitted → evaluate actual persisted user's clear approval evidence → `approved_decisions` insertion under T5 if and only if verified → include only that approved row in subsequent `ContextV1.decisions`. If semantic confirmation cannot be established deterministically, **leave unapproved**. No user text is rewritten to fit a model suggestion. Distinct choices, superseding instructions and contradictory statements must be resolved from original evidence, never by silently promoting a generated summary. An approved decision **does not** authorize a coding task or external source disclosure.

**FFR06-R03 — resolved by owner-approved C-02-C01 exception:** C02-D7's **separate durable, structured unapproved decision-candidate registry and rejected/superseded candidate lifecycle are explicitly deferred for Desktop v1**. Candidate-only model data may remain transient or appear as ordinary assistant text, but it is not a separately source-linked candidate record. `approved_decisions` may contain only independently verified user-approved decisions, and the original source messages remain intact. This does not modify IIS-04's 22-table inventory or grant approval authority to the model. See `NCD-03-C02-C01-D7-CANDIDATE-PERSISTENCE-V1-DEFERRAL.md` and controlling §24.

## 11. IIS06-D08 — Intent assistance, task proposal and Run Task separation (FROZEN v1.0)

Python-assisted intent classification is advisory and may conclude the user seeks discussion, an engineering action, or unclear scope; **all** responses travel through the existing discussion result, with an optional non-executable `task_proposal`. Main validates and, if appropriate, creates **its own** `task_proposals` row with unpredictable opaque `proposal_id`, exact goal, project, conversation, canonical workspace and frozen **15-minute** TTL from IIS-04; Python cannot select the ID or enable its own proposed permissions.

**FFR06-R01 — resolved by owner-approved IIS-02-C01 additive DTO:** The existing `conversations.read` result includes `availableProposals` with a Main-issued `proposalId`, immutable `exactGoal`, same-project/conversation scope and expiry, bounded to the latest 40 current proposals with an explicit truncated flag. This is a read-only display projection; model text, fabricated IDs, or a string-parsed identifier are never valid. At click time Main still independently applies IIS-04 T2's scope/expiry/consumed-once/lease checks. There is no new IPC method, subscription, channel or execution authority. See `NCD-03-IIS-02-C01-CONVERSATION-READ-PROJECTIONS-ADDENDUM.md` and controlling §24.

**Under the owner-approved IIS-02-C01 read projection**, React can display `[Run Task]` and `[Continue Discussion]` for a current, valid Main-issued proposal, but there is only one executable admission route: the **existing IIS-02** `proposals.confirmRun({proposalId,clientMutationId})`. It invokes the IIS-04 atomic T2 single-use admission and IIS-03 supervised coding-task path **only after the user's explicit click**. Changed goal/project/expired proposal requires a new exact proposal and confirmation. “Please write code” in ordinary chat does not bypass Run Task. The discussion child never calls `task.execute`, never creates coding workers, and never acquires a workspace writer lease.

When approved Run Task later needs context, Main builds **C-01** context, not the general conversational ContextV1, using only grounded, scoped records. That separate coding workflow and worker observability remain under IIS-03/05.

## 12. IIS06-D09 — Read-only project awareness without broker bypass (FROZEN v1.0)

During a bound active `discussion.send`, Python may issue only `project.discover` and `project.read` (Python → Main). Each input carries `discussion_request_id` equal to the **outer message_id of that exact active, Main-issued `discussion.send`** request on the same child connection; broker requests cannot borrow another active turn's scope, point at a renderer-selected pathname, or outlive their parent response/crash. Root JSONL `correlation_id` remains null on such new requests; do not add an alternate envelope field.

Main's broker resolves the canonical project/workspace, verifies path containment and reparse/symlink safety, applies sensitive-file and secret controls, checks source revision (`expected_mtime_ns` exact decimal ASCII where supplied), per-read and cumulative inspection budgets, and records only actual broker observations under IIS-04. Files excluded for sensitivity are not disclosed merely because the chosen model is local or the user approved a provider. The discovery list is not proof of reading source contents; `project_inspections` progress is grounded and remains separate from IIS-05's coding task events.

IIS-07 will specify exhaustive path screening, budget accounting, reparse/TOCTOU defenses and observation keys. IIS-06 fixes the **integration and provider boundary** only; it must not manufacture broker APIs, grant Python direct unrestricted project filesystem access or mark a partially inspected project as completely understood.

## 13. IIS06-D10 — External project-content disclosure and route-specific consent (FROZEN v1.0)

A local broker read and an external provider disclosure are **different permissions**. Before releasing authorized project excerpts or source-derived content for an external provider, Main resolves the **actual effective destination** for the pending attempt, selected canonical project and disclosure class. It checks an extant exact-scope `disclosure_consents` grant under IIS-04 **T6**, or issues a Main-owned bounded `disclosure_challenges` record (frozen pending TTL **15 minutes**) displayed with the frozen IIS-02 disclosure DTO. Approval/revocation occurs **only** using `disclosures.respond`/`disclosures.revoke`; no model text, provider label, previous provider's grant or plain model-selection action is consent.

At the **last feasible Main-controlled content-release boundary**, verify live consent state, project/route/class, sensitive-file exclusions and active parent discussion request again. **FFR06-R05:** the trusted release boundary ends when Main hands source bytes to Python; Main cannot observe an atomic subsequent provider-send point using the frozen wire. Track or conservatively treat already-released text as potentially externally transmitted, including during concurrent revocation, process crash or provider timeout. No project excerpt is released to the Python Discussion Service for a known external route absent this check. Python must not cache reusable plaintext for later unrelated provider attempts, must not use broker content after a failed/expired parent turn and must not route it to a different model/provider. Source-bearing derived summaries, previews or debugging payloads cannot serve as bypass channels.

**Revocation/race limitation, explicitly disclosed:** data already released to Python for an authorized external-provider attempt may be sent after the revocation transaction races with the handoff, even if the actual remote provider-send was not yet externally observed. Data already transmitted to a provider cannot be recalled. The current closed stdio protocol does not provide a new mid-attempt revocation message or a universal egress firewall. Main must stop *subsequent* release, invalidate affected active broker permissions, and conservatively abort/restart affected Discussion work when necessary under IIS-03; it must not claim atomically retracting an in-progress Python/provider send. For any source acquired but not yet sent, enforce application-level fail-closed cancellation and revalidation wherever the existing supervised path can actually control it. Adversarial tests must demonstrate the promised boundary; if a strict instantaneous post-revocation no-send guarantee is required and cannot be achieved with this contract, explicitly escalate that **parent-interface gap for owner review** rather than assert it is solved.

Genuinely local model inference requires no *external-provider* consent under C02-D15, yet remains bound by sensitive-file restrictions. Generic non-project chat content and arbitrary LLM outgoing traffic are **not** retrospectively brought under the deferred C-02 FFR-R01 universal gate.

## 14. IIS06-D11 — Attempt ledger, retries, timeouts and uncertain billing (FROZEN v1.0)

IIS-04 T5 is the authority for `discussion_attempts` and any user-triggered retry. An attempted LLM call can be **billable even when the Python connection fails or a timeout occurs**. Local `clientMutationId` deduplication applies to T1 message acceptance; it does **not** guarantee exactly-once remote API invocation or billing.

- **Confirmed safe pre-issue failure** (e.g., READY not achieved, unsupported route, validation rejected before issuing model request) must not be logged as an actual charged/answered provider call. A legitimate fresh issue is separately recorded with evidence.
- **Potentially issued or ambiguous attempt** (timeout after send, lost response, child crash, suspected partial completion): persist `unknown`/appropriate failed state, original selected route and attempt ID; do not auto-reissue the provider call. React can display the grounded failure/uncertainty, **but no public same-turn retry control exists in the frozen IPC v1**; it must not offer a functioning same-turn retry button.
- **Same-turn user-triggered retry is deferred in Desktop v1:** the lineage rule for `discussion_attempts.retry_of_attempt_id` remains valid for any **future separately authorized** same-turn retry path, but the frozen 23-method IIS-02 surface has no such public operation today. The UI may use the existing `conversations.sendMessage` only to send a **new message/new logical turn**, never to masquerade as retrying a previous accepted turn. No duplicate user message or silent provider substitution is permitted.
- **Bounded automatic retry of a provably unsent/harmless operation** is allowed only if separately demonstrable under frozen C-03 D12 and does not contradict IIS-04's no-auto-replay of ambiguous provider attempts. **Conservative IIS-06 v1 default:** no automatic retry after any actual or uncertain provider issue. Never automatically re-run a coding task under any such rule.
- Wall-clock ceiling per discussion provider attempt **300 seconds** (IIS-01/IIS-03); timeouts do not prove nonexecution, nonbilling, and must not convert a partial response into a successful assistant message.

**FFR06-R06 — durable issue/result arbitration:** a Main-owned request-to-attempt map is session-scoped, not a durable guarantee after Main crash. Before each provider issue commit the Main-issued attempt ID and immutable model/provider/scope using IIS-04 T5 rules; terminal result admission checks the *current durable logical-turn state*, expected attempt lineage, and bound live child correlation **within the write transaction**. If a prior attempt's completion is in conflict with a later valid attempt, do not overwrite an already-committed reply or accept both. An ambiguous post-send crash cannot be proven unsent from a missing live map; no hidden auto-replay. Explicit attempts under the same turn do not create duplicate user message rows.

A new retry under the same logical turn follows a documented terminal-result arbitration: a prior attempt's late response is not accepted as if it belonged to the current request; its correlation/session and persisted attempt provenance are checked. Commit at most one authoritative assistant completion per logical turn under T5. When a previous result was already durably answered, a new user message is required to request another distinct answer rather than overwrite an existing committed assistant reply.

## 15. IIS06-D12 — Restart, reconnect, failure and UI consistency (FROZEN v1.0)

**Renderer reload/navigation:** do not restart Python merely because React changed route or unmounted a subscription. Under owner-approved **IIS-02-C01**, `conversations.read` reconstructs persisted messages and exact delivery state plus the grounded `discussionTurns` status and last-attempt safe evidence **for user messages included in that page**. It also returns bounded unexpired `availableProposals`. `pending|issued|failed|unknown` never becomes `answered` by UI inference; conflicting/missing attempt evidence remains unknown/null. Inspection and disclosure facts remain the previously frozen safe projections. Dock state and model preference are read as the frozen IIS-02/IIS-04 safe UI projections. Current uncommitted draft stays local; only T1 receipt proves accepted send.

**Discussion child crash/EOF/handshake failure:** IIS-03 may restart the *child process* within its own bounded policy. Old outstanding wire correlations and `discussion_request_id` broker scopes expire with the old session. Pending potentially issued provider attempts become unknown unless independently grounded terminal evidence exists. Restarting the service cannot transparently resend `discussion.send` or turn the old attempt into a new task. Main owns the saved transcript throughout.

**SQLite errors:** `DATABASE_UNAVAILABLE` on T1 means never report a saved user turn; an uncertain COMMIT must be resolved via persisted `mutation_receipts` before any repeat. On T5 failure do not display an uncommitted final response as durable or issue a task proposal from it; show a bounded appropriate error/reconciliation status. On T6 failure, no new consent is implied.

**Provider/credentials/model errors:** show sanitized `MODEL_UNAVAILABLE` or `PROVIDER_FAILED` and appropriate retryability based on a validated cause. Rate limits and transient errors must not yield unbounded automatic retries; malformed route assertions, denied sensitive material, unavailable credentials or wrong effective provider fail closed. The UI never silently switches to another model.

**Intent and memory failures:** invalid summary/source IDs do not corrupt original messages; failure to generate/accept summaries does not erase history. Stale/different project context, synthetic approval evidence or an unauthorized task proposal is rejected. Coding task and writer lease status are completely unaffected by discussion failures.

## 16. IIS06-D13 — UX, notification and error projection without new IPC (FROZEN v1.0)

Use the frozen `conversations.sendMessage`, `conversations.read`, `models.list`, `models.setDiscussionPreference`, `disclosures.*`, `proposals.confirmRun` methods and `subscribeConversation`/`subscribeStatus` subscriptions. **FFR06-R01/R02 corrections:** only the owner-approved **IIS-02-C01** adds `availableProposals` and `discussionTurns` as *typed fields within* the existing `ConversationViewPage`; `ConversationChanged` is still a hint, not the evidence source. No new public method or subscription is added. `ConversationChanged`, `DisclosureConsentRequired`, `DisclosureConsentChanged`, `ProjectInspectionProgressChanged`, `ModelAvailabilityChanged` are **Main-origin UI hints**, not new IIS-01 Python events. Subscribe before reading the conversation snapshot, then re-read safely after hints, per IIS-02. A duplicate notification cannot duplicate a message or prompt a second provider attempt.

UX distinctions **only where a frozen DTO or the owner-approved IIS-02-C01 clarification supplies evidence**: `persisted user message` versus `assistant awaiting response`; `model unavailable` versus `provider attempt unknown`; `source inspection partial` versus `source read`; `external disclosure requested/denied/revoked` versus `local file permission`; `candidate proposal` versus `explicitly admitted coding task`. Avoid guessed response percentages, fake provider token streaming, unnamed route substitution, or a “Run” result that suggests execution already happened.

Map internal failures to **existing frozen** UI error codes only: `BAD_INPUT`, `NOT_FOUND`, `NOT_AUTHORIZED`, `WORKSPACE_UNAVAILABLE`, `SOURCE_STALE`, `SENSITIVE_CONTENT`, `MODEL_UNAVAILABLE`, `PROVIDER_FAILED`, `RUNTIME_NOT_READY`, `DATABASE_UNAVAILABLE`, `RESOURCE_LIMIT`, `INTERNAL_ERROR`, and task/proposal-specific codes when they truly apply. No new public UI error enum is introduced here. Include sanitized, bounded, user-recoverable wording and `retryable` truthfully; internal codes/details stay internal.

## 17. IIS06-D14 — Privacy, data isolation and observability (FROZEN v1.0)

- Never store API keys, auth headers, secrets, raw `.env` contents, unfiltered project snippets or uncontrolled provider prompts/outputs in `ui_preferences`, `discussion_attempts`, event logs or crash reports. SQLite retains the user-authored chat message and bounded authorized final assistant answer in existing tables, not a second persistent Python chat database.
- Provider route diagnostics may log safe attempt IDs, anonymized identifiers, duration bucket, sanctioned error codes, selected logical model/effective provider and process-session binding; do not log raw prompt, user messages, source bytes or full provider request/response by default. Persistent attempt lineage remains in Main SQLite under IIS-04.
- A valid project/workspace ID is not a filesystem path or an authorization capability. Main enforces sender/process identity and cross-record project associations; no cross-project recent messages, source documents, provider consent or proposals.
- Model/provider outputs and repository contents are untrusted instructions as data; they cannot override system/application policy, impersonate a user approval, cause project mutations, create a SQL query or dispatch a coding child.
- Resolved provider availability, context estimator uncertainty, accurate attempt issuance and inspection evidence are observable internally without expanding the frozen public wire.

## 18. IIS06-D15 — Internal implementation-facing interfaces (PROPOSED; NOT PUBLIC)

The following are **conceptual Main/Python service interfaces**, not new Renderer methods or JSONL actions:

| Internal operation | Owner | Contract |
|---|---|---|
| `resolveDiscussionRoute(modelId)` | Main trusted registry | Returns verified route/provider/capability/availability snapshot or fails closed; never accepts model-supplied endpoint |
| `buildContextV1(conversationId,modelId,requestIdentity)` | Main SQLite/context service | Produces exactly closed ContextV1, revision- and project-checked, transport/model budget bounded |
| `openDiscussionAttempt(userMessageId,route,session)` | Main DB coordinator | Creates/marks immutable attempt lineage for T5; no Python request before durable safe stage |
| `dispatchDiscussionSend(attempt,context)` | Main/IIS-03 | Uses only IIS-01 `discussion.send`; binds outstanding root message ID and child session |
| `resolveBrokerRead(parentWireId,relativeScope)` | Main/IIS-07 broker | Existing `project.discover`/`project.read` paths; bounded source & provider-bound consent gate |
| `acceptDiscussionResult(correlation,typedResult)` | Main/T5 | Validate active attempt/result/provenance and atomically save one final answer/candidates as permitted |
| `invalidateOnRevocation(consentScope)` | Main/Discussion supervisor | Stop future release; invalidate pending scope and conservatively abort affected in-flight work within existing authority |
| `projectDiscussionState(conversationId)` | Main/IIS-02 | Read safe persisted ConversationViewPage; hints cause re-read, no new public method |

All internal names above are design aids; **actual coding APIs are not preexisting facts**. Any requirement that cannot be satisfied without changing the frozen five-action wire or 23-method IPC surface is a review finding, not license to extend it in implementation.

## 19. IIS06-D16 — Quantitative and resource budget contract (FROZEN v1.0)

| Boundary | Normative ceiling / interpretation |
|---|---|
| JSONL record, including LF | **262,144 UTF-8 bytes**, partial line also capped; **15 s** incomplete-frame deadline |
| Python Discussion READY | **30 s** after spawn |
| In-flight general child requests | **16**; per-conversation provider attempts serialized by default |
| Provider discussion attempt | **300 s** wall-clock upper bound per issue |
| User input per `discussion.send` | **16,384 Unicode code points**; do not substitute UTF-16 unit count |
| `ContextV1` | **96 KiB serialized**, ≤20 recent, ≤10 summaries, ≤20 decisions |
| Final `answer` | **32,768 Unicode code points** and independent JSONL record byte ceiling |
| `model_id` | ≤128 code points |
| `task_goal` | ≤16,384 code points, candidate text ≤2,048 code points as frozen IIS-01 |
| Broker `project.discover` | max depth 1–3; page 1–100 entries; bounded cursor |
| Broker `project.read` | maximum 200 source lines and 16,384 characters per bounded excerpt; accurate truncation and exact decimal-string nanosecond time |
| Broker read elapsed | **30 s**; additional cumulative project inspection budgets are IIS-07's responsibility |
| IPC pagination | default 40 / max 100; frozen DTO/error shape |
| Proposal / source disclosure challenge | frozen IIS-04 **15-minute** TTL each; not a general consent expiry |
| Process/transport queue | frozen IIS-03 256 records and 8 MiB; bounded 30 s saturation behavior |

All limits apply simultaneously when their scopes overlap. Estimated provider-specific token cost and context size must be measured/verified for supported routes; **this document does not invent a flat token budget, tokenizer accuracy promise, speculative cached history length or billing amounts**. Exceeding a hard boundary fails safely rather than silently overflowing/truncating authoritative user instructions.

## 20. IIS06-D17 — Conformance and fault-injection acceptance matrix (PROPOSED; NOT RUN)

The following must later be implemented and independently exercised in a Windows/Electron/SQLite/Python environment before coding acceptance. This matrix is a **test plan**, not execution evidence. **FFR06-R01–R03 are reconciled documentarily by approved narrow addenda**; execution and acceptance tests remain unrun. Test I06-T36 is interpreted per §24 as absence of an unauthorized same-turn retry interface.

| ID | Required acceptance / adversarial proof |
|---|---|
| I06-T01 | Single supported selected discussion model resolves to the actually bound ModelGateway route |
| I06-T02 | Unknown/unavailable model fails with `MODEL_UNAVAILABLE`, no silent provider fallback |
| I06-T03 | Two models under same display provider remain distinct routes, provider identity verified independently |
| I06-T04 | Model preference changes future requests only; active issued request route frozen |
| I06-T05 | `models.list` availability `unknown` does not claim readiness; no credentials exposed |
| I06-T06 | Missing/invalid credentials yield sanitized error without SQLite/diagnostic leakage |
| I06-T07 | New conversation first send T1 survives crash/reload and returns exact saved acceptance snapshot |
| I06-T08 | Duplicate clientMutationId same input returns original result; altered text/model/project rejected |
| I06-T09 | No Python discussion send before T1 commit; SQLite failure leaves unsent local draft recoverable |
| I06-T10 | Input >16,384 Unicode code points rejected with correct code-point measurement |
| I06-T11 | Wrong child READY/role/session/correlation rejected without final assistant message |
| I06-T12 | `discussion.send` exact six input fields and frozen five-key envelope accepted; extra field denied |
| I06-T13 | Per-conversation sends serialized; other conversations cannot borrow active parent `discussion_request_id` |
| I06-T14 | Completed answer inserted once, late duplicate reply never inserts second assistant message |
| I06-T15 | `response.accepted` or task event from Discussion rejected; no invented answer streaming |
| I06-T16 | Overlong/faulty answer/JSONL or wrong response schema denied safely, no half-frame display |
| I06-T17 | ContextV1 exact keys, ≤96 KiB, max arrays and route-specific response reserve verified |
| I06-T18 | Same-workspace context only; cross-conversation/project IDs rejected even if syntactically valid |
| I06-T19 | Current user input not unintentionally duplicated in historical prompt context |
| I06-T20 | Unknown model token budget narrows optional history/fails visibly rather than silent fallback |
| I06-T21 | Pressure-driven summary candidate references only visible and persisted same-conversation source IDs |
| I06-T22 | Stale/foreign fabricated candidate sources rejected; originals and context revision preserved |
| I06-T23 | Model-proposed decision remains advisory absent explicit same-conversation user confirmation |
| I06-T24 | Clear conversational approval can persist decision without a new modal, subject to verified referent |
| I06-T25 | Ambiguous approval or model-forged user command cannot become `approved_decisions` |
| I06-T26 | Proposal generated in chat does not spawn coding task; Main alone issues 15-min scoped proposal |
| I06-T27 | Expired/replayed/cross-project proposal Run Task rejected; single atomic explicit confirmation succeeds at most once |
| I06-T28 | `project.discover` and `project.read` require actual active parent ID and Main broker scope |
| I06-T29 | Sensitive path, symlink/reparse escape, stale mtime and oversized source cause safe deny/incomplete inspection |
| I06-T30 | Discovery counts and actual read counts distinct; IIS-05 task event history unaffected |
| I06-T31 | External project source denied before content release without exact provider/project/class grant |
| I06-T32 | Provider switch and changed disclosure class require new challenge; local-model case correctly scoped |
| I06-T33 | Consent revocation stops future broker source release; in-flight race behavior conservatively reconciled and limitations documented |
| I06-T34 | No source bytes leak through alternative summaries, prompts, diagnostics or retries after consent denial |
| I06-T35 | Crash after possibly issued provider call yields unknown and no automatic replay/new billable attempt |
| I06-T36 | With the closed IIS-02 v1 surface, UI does not expose a same-turn manual retry; `conversations.sendMessage` creates a distinct logical turn, not forged retry lineage |
| I06-T37 | Late prior-attempt reply cannot overwrite latest accepted result or another conversation's answer |
| I06-T38 | Provider timeout 300s does not assert nonbilling or completed answer; connection restored without auto LLM replay |
| I06-T39 | Renderer navigation/reload does not terminate Discussion service, task service, or change writer lease |
| I06-T40 | Python Discussion child crash allows supervised restart but invalidates old request/broker scope |
| I06-T41 | T5 COMMIT fails: UI does not report durable assistant answer, candidate decision or task proposal |
| I06-T42 | Existing 23 IPC methods/three subscriptions only; no extra wire action, DB table or `task_events` misuse |
| I06-T43 | Coding handoff uses independently bounded frozen C-01 `ConversationContext`, never full ContextV1 |
| I06-T44 | Multi-turn model + consent + context + provider errors do not bypass explicit Run Task or broaden source visibility |
| I06-T45 | After restart, `IIS-02-C01` presents only Main-issued, scoped and unexpired `availableProposals` (up to 40, with truncation flag); model-text IDs and string parsing rejected; click-time T2 still validates |
| I06-T46 | After restart, `IIS-02-C01` shows truthful paged `discussionTurns` `pending|issued|answered|failed|unknown` and safely evidenced latest attempt, with unknown/null on missing provenance |
| I06-T47 | Under C-02-C01 v1 deferral, unapproved model candidate stays ephemeral or ordinary assistant text; no phantom durable candidate ledger; only explicit user evidence can create `approved_decisions` |
| I06-T48 | Pressure-triggered summarization candidates benefit later turns only; current pre-send overflow degrades/fails without inventing an extra command or source coverage |
| I06-T49 | Race: revoke consent between Main source release and Python provider-send; document residual possible exposure and stop all future Main releases |
| I06-T50 | Late response from previous model attempt cannot win over a newer verified attempt or duplicate an already committed assistant message after crash/restart |
| I06-T51 | Model destination attestation absent/mismatch disables external route; display labels cannot inherit disclosure consent |
| I06-T52 | Over-cap answer and UTF-8 wire frame produce truthful safe bounded result or error, never silent truncation or invalid JSON |

**Evidence required:** actual fixed-schema request/response JSON fixtures; Main route/credential-resolution integration fixtures; transactional SQLite/attempt-lineage tests; simulated provider failures and ambiguous-cost retries; security/consent race tests; practical limited-history and token-budget cases; Windows process supervision/connection restart; UI reload and separate Mission Control regressions. No PASS claim is made here.

## 21. Final owner-approved IIS06-D01–D17 decision register — FROZEN v1.0

| Decision | Adopted v1.0 disposition | Frozen parent protected |
|---|---|---|
| IIS06-D01 | Main trusted model registry, verified ModelGateway route, separate secure credential refs | C02-D9; C03-D9; IIS-02 |
| IIS06-D02 | Preference for subsequent turns, immutable per-message model | IIS-02; IIS-04 |
| IIS06-D03 | Per-conversation serialized discussion attempts; bound wire/session/DB lineage | IIS-01; IIS-03; IIS-04 |
| IIS06-D04 | Completed answer only; no fabricated token-stream interface | IIS-01; IIS-02 |
| IIS06-D05 | Exact ContextV1 selection, inherited 96-KiB and model-specific budgets | C02-D5–D8; IIS-01 |
| IIS06-D06 | Pressure-driven same-request summary candidates, transparent missing precompaction ability | C02-D7/D8; IIS-01; IIS-04 |
| IIS06-D07 | Verified user-message decision promotion only, no mandatory separate modal | C02 FFR-R02; IIS-04 |
| IIS06-D08 | Optional advisory proposal; only Main minted and explicitly approved Run Task | C02-D4; IIS-04 |
| IIS06-D09 | Active-parent-bound read-only broker, defer deep file policy to IIS-07 | C02-D10–D17; IIS-01 |
| IIS06-D10 | Scoped source consent, effective provider and conservative revocation boundary | C02-D15/16; IIS-04 |
| IIS06-D11 | Durable per-attempt provenance, no automatic possibly billed replay | C03-D12; IIS-04 |
| IIS06-D12 | Safe restart/degraded state and no data/task fabrication | IIS-03; IIS-04 |
| IIS06-D13 | Frozen UI DTOs, notifications and error model only | IIS-02; IIS-05 |
| IIS06-D14 | Confidentiality and conversation/project trust isolation | NCD-02; C-02 |
| IIS06-D15 | Internal operations only, explicitly no new public APIs | IIS-01/02/04 |
| IIS06-D16 | Exact inherited bounded wire/IPC/runtime constraints | IIS-01/02/03/04 |
| IIS06-D17 | Adversarial acceptance gates, **NOT RUN** | All parents |

## 22. Historical consolidated review agenda and documented limitations

**The FFR-01/FFR-02 documentary process reviewed the following contractual concerns (execution testing remains outstanding):**

1. ModelGateway actual supported route capabilities versus trusted registry promises, especially effective provider and credential refs (no claim of already working dynamic routing).
2. **Critical existing-wire limitation:** there is no standalone summarization command and no streaming discussion chunks. Confirm that pressure-driven *response candidates* plus bounded degraded history are acceptable, or issue an explicit parent-change proposal **outside** IIS-06; never quietly modify IIS-01.
3. Consent revocation between last Main broker release and actual Python-to-provider transmission. Demonstrate the strongest truthful enforcement possible under existing application-level authority, record residual race risk, and escalate any need for a stronger atomic control rather than claiming it exists.
4. T1/T5/`discussion_attempts` internal scheduling atomicity and late-response arbitration using *only* the frozen 22-table schema.
5. Schema concordance: one `discussion.send`, two broker commands, no new wire actions; 23 public Promise IPC methods, 3 subscriptions, 22 SQLite tables and IIS-05's distinct task event domain unchanged.
6. The user-intent and approval boundary, candidate decision evidence, and exact cross-conversation/project isolation.
7. Resource/timeout/credential/provider safety, including user-visible uncertainty and no exactly-once external billing claim.

**FFR-01 historical disposition (2026-10-20): `DRAFT v0.2 — BLOCKING PARENT GAPS OPEN`.** These historical gates were resolved through owner-approved addenda **IIS-02-C01** and **C-02-C01** and the **FFR-02** re-review (§24). The owner subsequently explicitly authorized freezing IIS-06; the final disposition is **FROZEN v1.0 — DESIGN ONLY** (§25), with a separate SHA-256-backed freeze record. No programming authorization results from documentary approval.

---

## 23. FFR-01 historical corrective authority and closure gates (2026-10-20)

**Result: CONDITIONAL PASS FOR DOCUMENTARY CONSISTENCY; THREE UPSTREAM BLOCKERS / NO FREEZE.** This section controls the corrected v0.2 reading of §§4–22. Earlier words such as “React can display,” “full restored attempt state,” or “candidate retained” must be read under the limitations below. No parent contract is modified here.

| Finding | Severity | Corrected disposition in this IIS-06 draft | Outstanding owner gate |
|---|---|---|---|
| FFR06-R01 — Main proposal → UI typed handoff | **BLOCKING** | §11 prohibits fabricated `proposalId` delivery; exact Run Task entry remains existing `proposals.confirmRun` | Approve narrow IIS-02 typed, durable proposal projection or demonstrate a legally existing equivalent in its frozen schema |
| FFR06-R02 — durable discussion state → UI | **BLOCKING** | §§6,15–16 forbid guessed per-attempt status after reload | Approve narrow IIS-02 conversation read projection or verified interpretation supplying state/retry provenance |
| FFR06-R03 — candidate decision lifecycle | **BLOCKING** | §10 leaves unapproved candidates transient; no extra SQLite table and no premature approval | Resolve C02-D7 vs IIS-04 v1 with an explicit narrow parent amendment/deferral decision |
| FFR06-R04 — no pre-send summary command | Clarification | §9 documents candidate-after-response limit and C02-D8 bounded degradation | None for honest degraded v1 behavior; enhancement requires separate contract amendment |
| FFR06-R05 — revocation handoff race | Safety clarification | §13 distinguishes Main-controlled release from later actual remote send | Track residual risk in IIS-08; do not reopen deferred universal outbound gate automatically |
| FFR06-R06 — attempt/result races | Correction | §14 binds durable attempt state, live correlation and ACID result acceptance | Prove via IIS-08 fault injections |
| FFR06-R07 — actual route assurance | Correction | §4 refuses unsupported/unverified real provider routes | Demonstrate supported route/credential mapping in authorized integration tests |
| FFR06-R08 — bounded answer/transport | Correction | §7 prohibits untruthful truncation and invented truncation field | Test Unicode/UTF-8/oversize failures in IIS-08 |

**Historical upstream-resolution proposal (subsequently APPROVED in the narrow IIS-02-C01 and C-02-C01 addenda):**

A. Amend/clarify **IIS-02 `ConversationViewPage` only** to provide a bounded, Main-verified, project/conversation-scoped **available proposal projection** (`proposalId`, exact goal, expiry/state) and the explicit **discussion-turn state/last-attempt safe error projection** needed after reload. Do not add public Promise methods, new subscriptions or renderer authority. Use only stored source evidence; never expose internal provider tokens or raw prompts. Exact nullable/absent semantics and page limits must be specified in a separately approved correction.

B. Resolve the mismatch between frozen **C02-D7 candidate provenance lifecycle** and the frozen **IIS-04 22-table inventory** using one explicit owner choice: either amend IIS-04 narrowly to represent unapproved candidate evidence/state durably (with a separate documented schema impact and migrations), **or** approve a limited C02-D7 exception that unapproved candidates remain lower-trust ephemeral / part of the original assistant answer until actual user approval; existing `approved_decisions` retains only verified decisions. Do not silently alter either parent or pretend a model answer is a typed candidate record.

**Historical decision request, now satisfied:** the owner approved the bounded cross-contract package, and FFR-02 verified its documentary consistency before the owner separately froze IIS-06. The earlier Draft v0.2 and its pending-gate language remain only as provenance. IIS-01–05 remain frozen and no code or executable tests are authorized.

---

## 24. FFR-02 — Owner-approved narrow parent reconciliations (normative for frozen v1.0)

**Decision evidence:** On 2026-10-20 the owner expressly approved the narrow combined package recommended after FFR-01: (i) typed safe `ConversationViewPage` fields within existing IIS-02, and (ii) first-release deferral of *structured unapproved candidate-decision persistence* under C02-D7 instead of modifying IIS-04. A **later separate owner message** explicitly authorized IIS-06 v1.0 freeze. Neither approval authorized code.

| FFR-01 finding | Resolution in owner-approved package | v0.3 consequence |
|---|---|---|
| FFR06-R01 | **C-01 to IIS-02:** `NCD-03-IIS-02-C01-CONVERSATION-READ-PROJECTIONS-ADDENDUM.md` | Main issues scoped proposal IDs in SQLite; `conversations.read` returns an exact bounded current `availableProposals` projection; revalidate at explicit Run Task transaction |
| FFR06-R02 | **Same IIS-02-C01 addendum** | `conversations.read` returns grounded page-associated `discussionTurns` statuses and safe latest-attempt error metadata after reload |
| FFR06-R03 | **C-01 to C-02:** `NCD-03-C02-C01-D7-CANDIDATE-PERSISTENCE-V1-DEFERRAL.md` | Candidate-only structured persistence is deferred for Desktop v1; actual `approved_decisions` still requires explicit same-conversation user evidence; IIS-04 remains 22 tables |
| FFR06-R04–R08 | Corrections already present in Draft v0.2 | Continue binding; no new wire action, provider bypass, fake stream or ambiguous auto-retry |

### 24.1 Controlling interpretation of earlier sections

- **§10 candidate decisions:** unapproved `decision_candidates` are lower-trust ephemeral advice. If text appears in an accepted assistant answer, it remains an **ordinary assistant message**, not an authoritative structured candidate. Do **not** claim a candidate decision ledger or structured rejected/superseded states in v1. `approved_decisions` remains evidence-backed and independent of Run Task authority.
- **§11 proposal presentation:** the previous FFR06-R01 blocker text is now **historical**. Only Main-generated, scope-checked, unexpired `task_proposals` from the approved IIS-02-C01 return DTO may be rendered as runnable. No model-generated ID is trusted, and an expired/read-time-available proposal cannot bypass the IIS-04 T2 click-time check. The proposal list may be truncated and must disclose that limitation.
- **§§6,15–16 turn status restoration:** previous FFR06-R02 blocker text is historical. The approved IIS-02-C01 `discussionTurns` projection makes grounded `pending|issued|answered|failed|unknown` and safe latest-attempt evidence visible for returned message pages; a missing row or unresolved conflict remains **unknown**, not fabricated. `subscribeConversation` is a notification hint only.
- **§14 manual retries — scope clarification uncovered during re-review:** the frozen IIS-02 public surface has **no same-turn retry method**. Thus a same-turn user-triggered provider retry is **not an operable React control in Desktop v1**. Do not expose a fake button, resubmit the prior accepted `clientMutationId`, or pass it as a new user turn while claiming same-turn lineage. Ordinary `conversations.sendMessage` explicitly creates a **new user message**, and the pre-existing `discussion_attempts` schema permits provenance recording only; it does not authorize a new invocation path. Implementation of an actual same-turn user retry would need a separately owner-approved IPC contract change. Historic wording about a React retry choice and test I06-T36 is superseded by this clarification.
- **§20 I06-T45:** a valid Main-issued proposal appears in the scoped read projection and cannot execute without explicit Run Task and fresh T2 validation, including across Renderer reload/expiration.
- **§20 I06-T46:** committed turn state and safe last-attempt evidence are restored through existing `conversations.read`, including `unknown` on ambiguous crashes, only for verified message page membership.
- **§20 I06-T47:** a model candidate never becomes an approved decision by itself; **the structured unapproved candidate lifecycle is explicitly deferred**, not declared tested or implemented.
- **§20 I06-T36 is replaced for v1** by the conformance requirement that no same-turn retry UI/API is exposed and that `conversations.sendMessage` cannot masquerade as same-turn retry. Existing attempt lineage applies only to legitimately authorized and actually issued attempts. Full same-turn retry remains a later feature requiring contract approval.

### 24.2 Re-review conclusion and remaining gates

**FFR-02 documentary disposition: PASS FOR OWNER FREEZE CONSIDERATION; subsequently OWNER APPROVED AND FROZEN v1.0 (§25).** The three previous **cross-contract blockers are resolved by the narrow owner-approved addenda** without silently editing the original parent documents. FFR-R01 broad all-provider egress interception, pre-send summarization command, LLM streaming, and same-turn retry UI remain **deferred/not available**. All implementation and adversarial acceptance testing is still **NOT RUN**.

No code, new Desktop repository, source commit, SQLite migration or Windows process verification is authorized. The owner provided the separate freeze approval, and the canonical **FROZEN v1.0** copy plus independent checksum/freeze record have been issued. **IIS-07 — Project File Broker** is the next design contract.

---

**End of NCD-03/IIS-06 FROZEN v1.0 — Owner Approved; IIS-07 Next; No Coding Authorization.**


## 25. Final documentary freeze declaration — owner approved (2026-10-20)

1. **Owner freeze authorization:** After approving the narrow parent correction package and receiving the FFR-02 reconciliation report, the owner explicitly instructed “اجل الان نجمد”. This authorizes an IIS-06 **documentary freeze**, independently of the earlier addendum approvals.
2. **Adopted basis:** Exact reviewed Draft v0.3, all seventeen IIS06-D01–D17 decisions, FFR06-R01–R08 corrected/closed findings, FFR06-R09 documented Desktop-v1 limitation, and the two prior separately owner-approved addenda (`IIS-02-C01` and `C-02-C01`). §24 controls historical FFR-01 text. The historical Draft v0.3 is archived without alteration.
3. **Frozen contract boundaries:** One Main-owned SQLite database with **22 tables**; the existing **23 Renderer IPC Promise methods** and **3 subscriptions**; five private wire commands with no added streaming/retry command; verified provider identity and scoped disclosure; exact Main-generated proposal IDs and explicit one-time `Run Task`; no new coding power for Discussion; IIS-03 global one-active-coding-task cap remains binding. All higher-priority frozen parent contracts remain unchanged except the separately recorded narrow addenda.
4. **Truthful first-release limitations:** No same-turn retry UI, no token-streaming protocol, no guaranteed independent pre-send summarization command, no structured durable lifecycle for *unapproved* decision candidates, no automatic provider retry after an ambiguous issue, and no universal LLM egress firewall beyond the previously approved scoped protections. Deferred capabilities cannot be presented as shipped.
5. **Verification obligation:** The 52 cases `I06-T01`–`I06-T52` are **requirements for future executable acceptance**, with T36 interpreted under §24.1. No real Electron/Python/SQLite/Windows conformance tests, route attestation tests, cost certainty, or running Desktop functionality are claimed by this documentation freeze.
6. **Final disposition:** **PASS — FROZEN v1.0 — DOCUMENTARY DESIGN ONLY.** Proceed next to **IIS-07 — Project File Broker**, through a separate design/review/freeze cycle. No authority to implement/commit/run production changes follows from this status. The exact SHA-256 of this canonical frozen UTF-8 file is in `NCD-03-IIS-06-FINAL-FREEZE-RECORD.md`.
