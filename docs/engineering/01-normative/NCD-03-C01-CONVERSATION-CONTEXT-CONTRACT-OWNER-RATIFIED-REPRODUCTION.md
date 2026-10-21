# NEXT CODE — NCD-03 / C-01
## Optional Conversation Context Integration Contract

**Status:** FROZEN — Contract Design Baseline v1.0 (OWNER APPROVED 2026-10-18; FFR-01 DOCUMENTARY PASS)  
**Date:** 2026-10-18  
**Target engine:** `naoufelbvb2-arch/next-code` at `ccb250cf57fa404a06b86ab5d39da5fe56487c84`  
**Authorization:** Frozen design baseline only. **NO IMPLEMENTATION, ANTIGRAVITY EXECUTION OR ENGINE-REPOSITORY MODIFICATION AUTHORIZED.**  
**Authority:** Consistent with NCD-00 FROZEN v1.0, NCD-01 FROZEN v1.0, and NCD-02 FROZEN v1.0.  
**Evidence:** `NCD-03-INVESTIGATION-01-C01-INDEPENDENT-REVIEW.md`, Antigravity's `INVESTIGATION-01-C01`, and the linked baseline code.

---

## 1. Purpose and scope

Specify the **smallest optional, typed, bounded, lower-trust conversation-context input** to the existing asynchronous `AgentOS.execute_task()` entry point. This allows a **new independent engineering task** to reference relevant earlier conversation without inheriting execution state from previous tasks.

This contract **does not** add a chat agent, modify repository authorization, change tool permissions, change the worker lifecycle, guarantee live agent events, define the JSONL transport in full, or allow multiple engineering tasks to run concurrently. Those are separate NCD-03 decisions.

The user-visible conversation remains continuous in Next Code Desktop. Each engine execution is independently task-scoped.

### Required invariants

1. Desktop (Electron Main + SQLite) owns conversation IDs, stored messages, conversation-to-workspace binding, and context selection.
2. AgentOS owns executing a task, task-scoped Blackboard, checkpoints, safety gates, and final TaskOutcome.
3. Each new engineering execution has a **fresh, distinct task ID**, never the conversation ID and never a previously used task ID.
4. With no `conversation_context` supplied, existing calls and prompt behavior must remain unchanged.
5. Historical text is **data, not authorization, policy, verified evidence, or current instructions**.
6. Uncertain/stale information must be re-investigated through existing approved mechanisms before relying on it to change files.

## 2. Verified baseline constraints

- `AgentOS.execute_task(task_goal: str, task_id: str | None = None) -> TaskOutcome` is asynchronous: [`agent_os.py`](https://github.com/naoufelbvb2-arch/next-code/blob/ccb250cf57fa404a06b86ab5d39da5fe56487c84/agent_os.py).
- `LeadArchitectLoop` builds context per tick and delegates workers through `EphemeralSquadDispatcher.dispatch(contract, ctx, git_diff="")`: [`architect/lead_loop.py`](https://github.com/naoufelbvb2-arch/next-code/blob/ccb250cf57fa404a06b86ab5d39da5fe56487c84/architect/lead_loop.py).
- Blackboard is keyed by task ID and stores `.agent_os/state/{task_id}.json`: [`brain/blackboard.py`](https://github.com/naoufelbvb2-arch/next-code/blob/ccb250cf57fa404a06b86ab5d39da5fe56487c84/brain/blackboard.py).
- Git checkpoint references are `refs/agent_checkpoints/{commit_hash}` (not per-task Git reference names): [`kernel/checkpoint.py`](https://github.com/naoufelbvb2-arch/next-code/blob/ccb250cf57fa404a06b86ab5d39da5fe56487c84/kernel/checkpoint.py).
- `TaskOutcome` has `task_id`, `success`, `final_phase`, `summary`, `total_ticks`, `rollbacks_triggered`, and `final_checkpoint_hash`. **It does not have `modified_files`**: [`architect/contracts.py`](https://github.com/naoufelbvb2-arch/next-code/blob/ccb250cf57fa404a06b86ab5d39da5fe56487c84/architect/contracts.py).
- Playbook matching currently uses the current `task_goal`, not arbitrary preceding conversation: [`architect/lead_loop.py`](https://github.com/naoufelbvb2-arch/next-code/blob/ccb250cf57fa404a06b86ab5d39da5fe56487c84/architect/lead_loop.py).
- `final_checkpoint_hash` may represent a **pre-surgery** checkpoint; neither it nor a live workspace diff is sufficient alone to assert the definitive set of files modified by the finished task.

## 3. Proposed responsibility boundary

```text
Desktop renderer (Chat / Agents / Projects)
     |
     v
Electron Main — SQLite conversation repository and task supervisor
     |  - binds conversation to one authorized workspace
     |  - selects context from same conversation and workspace
     |  - keeps task ID distinct from conversation ID
     v
Existing approved supervised STDIO + JSON Lines Python Bridge
     |  - validates requests and context provenance/bounds
     |  - no parsing of legacy CLI stdout as structured events
     v
AgentOS.execute_task(task_goal, task_id?, *, conversation_context?)
     |
     v
LeadArchitectLoop — advisory historical context in tick prompt
     |  - no promotion to Blackboard verified facts
     |  - no playbook matching against chat history
     v
Existing authorized worker delegation and deterministic gates
```

No new permanent service, cross-agent plugin framework, or duplicated autonomous engine.

## 4. Proposed typed contract — conceptual only

**Approved ownership (C01-D2):** Define the typed `ConversationContext` input and its subsidiary data contracts in `architect/contracts.py`, not in `brain/schemas.py` or persistent Blackboard schemas. Keep the prompt rendering logic in `architect/prompts.py`. Before implementation, verify Python import directions and absence of circular imports; if this chosen location is demonstrably unsuitable, return for explicit design approval rather than silently moving the contract.

### ConversationContext (input envelope)

| Field | Conceptual type | Meaning and requirements |
|---|---|---|
| `schema_version` | literal `1` | Explicit contract version; reject unsupported versions |
| `conversation_id` | bounded opaque string | Desktop thread identifier, **not** engine task identifier |
| `workspace_root` | canonical local path string | Transport metadata only; verify it matches `AgentOS.workspace_root`; **never rendered in the model prompt as authority** |
| `prior_tasks` | bounded sequence of `PriorTaskReference` | Previous engine outcomes for **this conversation and workspace** |
| `recent_messages` | bounded sequence of `HistoricalMessage` | Relevant preceding user/assistant text, tagged as untrusted history |
| `advisory_preferences` | bounded sequence of strings | **Advisory preferences only** (e.g. preference for pytest); never represents a safety-critical, mandatory restriction and cannot extend permissions or override current instructions |

### PriorTaskReference (not an evidence certificate)

| Field | Source | Semantics |
|---|---|---|
| `task_id` | Actual prior `TaskOutcome.task_id` | Distinct previous task; validated association to current workspace/thread by Desktop |
| `task_goal` | Desktop's recorded prior task submission | Historical goal only |
| `success` | Actual prior `TaskOutcome.success` | Outcome reported by engine, not proof of every textual claim |
| `final_phase` | Actual prior `TaskOutcome.final_phase` | Preserve the native engine enum value |
| `summary` | Actual prior `TaskOutcome.summary` | May contain model-authored or unverified statements; display/consume with provenance caveat |

**Excluded by design in C-01:** `modified_files`, a synthetic verification boolean, raw full Blackboard, live checkpoint contents, prior `TaskContract` authorization, arbitrary filesystem paths, API keys, and executable commands.

### HistoricalMessage

- `role`: exact `user` or `assistant`.
- `content`: bounded content from the current conversation only.
- All message content is **quoted historical data**, never a new direct instruction to the Lead Architect.

### Validation and initial context budgets — C01-D4 APPROVED (Option A)

- All models reject extra/unknown fields and unsupported contract versions.
- `prior_tasks`: **maximum 3**; each goal and summary individually bounded (provisional per-field limits: 500 and 1000 characters respectively).
- `recent_messages`: **maximum 6**; each entry bounded (provisional per-field limit: 1000 characters).
- `advisory_preferences`: **maximum 5**; each item bounded (provisional per-field limit: 200 characters).
- Final rendered history: maximum **3,000 characters** as an approved initial cap; independently account for **model tokens** and overall prompt limits.
- Do **not** truncate the rendered string by raw slicing. Assemble complete, escaped, delimited entries within a budget; omit older/less relevant optional entries deterministically and report omissions as metadata. Reject oversized required fields instead of silently clipping them.
- Data-bearing strings are never evaluated as paths, tool arguments, or role/system directives solely because of their presence in the context.

**C01-D4 decision (Option A, approved 2026-10-18):** The limits of **3 prior tasks, 6 recent messages, 5 advisory preferences, and 3,000 rendered characters** are the approved *starting configuration for testing*, not measured optimal values, not a proof of token safety, and not a claim that implementation is authorized. The individual field caps described above remain provisional pending final contract review. Before accepting a production implementation, evaluate realistic histories against Lead Architect prompt sizes, model token accounting, and behavior with omitted records. This empirical gate remains OPEN at design freeze. Any revision to the four approved starting limits requires an explicit reviewed change; no silent adjustment.

## 5. Trust and safety rules

1. **Source hierarchy:** Existing system safeguards, current authorized task goal and explicit approved tool scope are not overridden by historical content.
2. **Workspace binding:** Desktop must associate `conversation_id` and all `prior_tasks` with a specific selected canonical workspace. Python facade/bridge must reject a `workspace_root` mismatch. Do not rely on a string ID alone to secure binding.
3. **Task ID hygiene:** For a new task, generate a collision-resistant safe ID; never reuse an existing task state path. A request with ambiguous resume/new-task semantics fails closed. Preserve existing legacy behavior when the optional context is absent.
4. **No promotion:** A prior successful `TaskOutcome`, chat text, or user-provided summary never becomes a `VerifiedFact` or an authorized `target_files` list without appropriate current-task verification and authorization.
5. **No secret propagation:** Strip secrets/sensitive local configuration and unrelated project content before saving or sending context. Secrets stay in approved credential handling paths.
6. **Prompt injection:** Clearly isolate and label the history; do not insert it into system instructions. Delimiters and labeling **reduce** but do not eliminate LLM prompt-injection risk; keep tool-side guards authoritative.
7. **No cross-task checkpoints:** C-01 carries no checkpoint hashes and does not attach a new task to a previous Blackboard or rollback state.
8. **No unauthorized task execution:** Merely discussing a previous code change is not an authorization to edit files. The discussion-only route requires its own separate NCD-03 policy.
9. **Same-workspace execution contention:** Do not enable overlapping modifying tasks in the same working tree until the supervisor concurrency/rollback policy has been explicitly accepted and tested.
10. **Existing gates intact:** No alterations to L1 kernel guards, checkpoint/rollback code, L4 worker contracts, or safety gates are authorized under this C-01 proposal.

### C01-D3 — Approved separation of preferences and mandatory restrictions

**Approved (Option A, 2026-10-18):** `advisory_preferences` contains non-binding preferences only. Historical content, summaries, and preference strings are not authorization controls. **Safety-critical or explicitly mandatory user restrictions must be enforced and verified by deterministic permission/operation controls appropriate to the execution, not by a model prompt alone.**

- Examples: *"Prefer pytest"* may enter `advisory_preferences`; *"Never modify database schema files"* requires a separate enforceable execution restriction and is **not satisfied** by copying the sentence into `advisory_preferences`.
- If a mandatory restriction cannot currently be enforced or verified for a proposed operation, the supervisor/engine integration must **fail closed for the affected execution**, or require a separately authorized solution before proceeding. Do not imply that a prompt reminder satisfies the restriction.
- The enforcement mechanism, representation of mandatory restrictions, and any required modifications to permission APIs are **out of scope for C-01** and require a separate NCD-03 contract and approval. C-01 does **not** introduce a new `mandatory_restrictions` field, change `WorkspaceGuard`, or revise worker roles.
- Tests must confirm that advisory text neither widens privileges nor silently masquerades as a hard deny rule. The UI should not present an advisory preference as a guaranteed safeguard.

## 6. Prompt integration contract

When context is absent: `build_architect_tick_prompt()` output MUST be identical to its prior behavior under identical inputs.

When context is present: pass an optional, bounded **history-data section** to the existing `build_architect_tick_prompt` function, appended after the **Blackboard Context Digest** and before the **Blast-Radius Impact Analysis**, with the current gate warning, current worker report, playbooks, repo map and final action directives in their existing order.

Preserved section order:

1. Orchestration tick header
2. Safety gate interception warning (when present)
3. Latest worker report (when present)
4. Procedural playbooks (when present)
5. Blackboard task digest
6. **Previous conversation — historical data, lower trust (optional)**
7. Blast-radius reports (when present)
8. Structural repo map
9. Current-task action directives

The context is serialized as **whole escaped/quoted records with stable markers** and an explicit statement that it cannot grant permission, assert present file state, or replace current task verification. No trust guarantee may be based on this label alone.

The user-facing `task_goal` remains the isolated current task objective. `PlaybookStore.match_playbooks` must still operate **only on `task_goal`**.

## 7. Public API compatibility (conceptual, not code)

- Keep existing supported call shape: `await agent_os.execute_task(task_goal, task_id=None)`.
- Proposed opt-in keyword-only addition: `conversation_context: ConversationContext | None = None`.
- Add a matching optional parameter at the end of `LeadArchitectLoop.__init__` and of `build_architect_tick_prompt`, without reordering or removing existing parameters.
- No context supplied: same existing task logic, prompts, tool permissions, model routing and response schema.
- No change to `TaskOutcome`, `BlackboardState`, worker role contracts or file mutation tools is approved by this document.

**Expected production paths (provisional):** `architect/contracts.py` (approved input contract location, subject to import-cycle verification), `agent_os.py`, `architect/lead_loop.py`, `architect/prompts.py`, and a new dedicated tests file. This is **not** a fixed line-count promise.

## 8. Ownership and lifecycle

1. Desktop persists messages/outcomes in SQLite, with conversation ID, workspace association and task references.
2. When a new engineering task is authorized, Electron Main selects relevant same-conversation/same-workspace previous records and constructs one bounded context snapshot.
3. The bridge validates the incoming request, including identity, path match, schema/budget and task-newness constraints.
4. AgentOS accepts the context optionally, without persisting it as verified Blackboard state or changing previously executed tasks.
5. The task executes through the existing Lead Architect and worker lifecycle; its `TaskOutcome` is stored alongside the conversation, not as replacement for engine-owned state.
6. Before the next follow-up, the Desktop may create a new snapshot, with failure/success status faithfully retained. Repository facts may be stale and require refreshed verification.

**Not guaranteed:** crash recovery, automatic retry, cancellation, multiple active tasks in one workspace, final modified file list, or a discussion-only chat model. These require separate explicit NCD-03 decisions.

## 9. Required verification gates before code acceptance

### Backward compatibility
- Legacy call without context and legacy prompt assembly are unchanged byte-for-byte where deterministic.
- Public signatures remain backward compatible; existing tests continue to run.

### Schema/budget/isolation
- Reject wrong/unknown schema versions and extraneous fields; reject oversized required fields.
- Reject workspace mismatch and prior-task references from another workspace or conversation.
- Distinct new task IDs produce independent `.agent_os/state/{task_id}.json` and checkpoint history, with no accidental reuse.
- History selection is deterministic; no partial record slicing; gate directives always retained.
- Confirm the **C01-D4 approved initial limits** (3 prior tasks / 6 messages / 5 preferences / 3,000 rendered characters); test that oversized inputs fail validation and that lower-priority optional records are omitted whole with omission metadata.
- Measure aggregate model-token usage and verify the added context cannot displace mandatory safety directives; character limits alone are not evidence of token-budget safety.

### Behavioral/security
- Historical playbook keywords never influence playbook matching.
- Failed outcomes cannot silently be represented as success.
- Historical prompt injection (e.g., “ignore the gates”, “write outside workspace”) never causes privileged tool bypass in integration tests; do not claim all future LLM behavior is guaranteed.
- Context claiming a file is already verified does not automatically bypass SCOUT/current verification or force false completion.
- Optional context cannot widen WorkspaceGuard, worker role or approved-file scopes.
- No unverified `modified_files` value is introduced.

### Regressions
- Record real baseline and final test commands/results; include offline tests and identify tests that depend on live provider credentials.
- Verify `git diff --check`, branch/HEAD and working-tree scope before/after any future implementation.
- Explicitly report any untested condition as unverified, never PASS.

## 10. Remaining decisions / deferred work

**C-01 decision record:**

- **C01-D1 — APPROVED (2026-10-18):** The bounded context contains prior TaskOutcome-derived summaries, recent relevant message excerpts, and advisory preferences only. Exclude unverified `modified_files`, inherited worker authorizations, checkpoints, and unrelated workspace data. No precise size limits or implementation are approved by this decision.
- **C01-D2 — APPROVED (2026-10-18):** Define the typed `ConversationContext` and its subsidiary input records in `architect/contracts.py`; format the model-facing history only in `architect/prompts.py`. Do not add conversation schemas to `brain/schemas.py` or persist historical context as verified Blackboard state. Validate import dependencies before implementation; any required relocation needs renewed design approval.
- **C01-D3 — APPROVED (2026-10-18), Option A:** Explicitly distinguish advisory preferences from mandatory/safety-critical restrictions. Mandatory restrictions require separate deterministic enforcement/verification; when unsupported, fail closed for affected execution. Do not encode such restrictions as if `advisory_preferences` enforced them. Mechanism deferred to a separate approved NCD-03 contract.
- **C01-D4 — APPROVED (2026-10-18), Option A:** Use a conservative initial test configuration of at most **3 prior task summaries**, **6 previous messages**, **5 advisory preferences**, and **3,000 characters** of final rendered context. Assemble complete records without raw-string truncation; omit lower-priority optional records deterministically, preserving required safety sections. These are approved starting limits, **not** empirically calibrated production values; validate prompt/token budgets before implementation acceptance, and submit any change for explicit review.

**Separate NCD-03 contracts, not decided here:**

- Enforceable mandatory user restrictions: policy schema, authorization mechanics, fail-closed behavior, and user-facing representation (C01-D3 explicitly defers implementation).
- Conversation discussion-only path versus engineering task authorization and routing.
- Exact STDIO/JSONL request, error, backpressure and readiness schemas.
- Structured events needed for Mission Control and Agent Logs.
- Task concurrency policy, cancellation, shutdown, crash recovery and final workspace capture/provenance.
- The definitive modified-files / diff / test-results output contract.

## 11. Freeze state and change control

**FROZEN — CONTRACT DESIGN BASELINE v1.0 (owner approval: 2026-10-18).** The owner expressly approved freezing NCD-03 / C-01 after `NCD-03-C01-FFR-01-PRE-FREEZE-REVIEW.md` reported **PASS for design coherence with deferred implementation gates**. The approved Option B approach and decisions C01-D1 through C01-D4 are normative within the declared C-01 scope. The archived v0.5 candidate and exact baseline hashes are recorded in `NCD-03-C01-FREEZE-RECORD.md`.

**Freeze does not certify runtime behavior.** The individual field caps remain provisional within this frozen design; import direction, prompt/token budgets, context provenance checks, prompt-injection defenses, backward compatibility, and other gates in Section 9 remain to be validated. The two former draft sentences requiring budget testing *before design freeze* are administratively aligned with the reviewed **pre-implementation acceptance** gate; no approved numeric budget or trust-boundary decision changed. If validation shows a normative requirement must change, stop and request a formally approved C-01 amendment.

**Approval boundary:** Documentation freeze only. It is **NOT** authorization to implement, modify `next-code`, run an Antigravity code-change prompt, change worker permissions, or claim C-01 is operational. A separate implementation authorization, based on a reviewed bounded prompt and tests, is mandatory. NCD-03's other contracts remain open as listed in Section 10.
