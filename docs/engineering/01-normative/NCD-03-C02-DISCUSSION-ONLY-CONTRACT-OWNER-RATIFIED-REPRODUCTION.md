# NEXT CODE DESKTOP — NCD-03 / C-02
## Discussion-Only Mode Integration Contract

**Status:** FROZEN v1.0 — ARCHITECTURE ONLY; C02-D1–D17 APPROVED; FFR-R01 DEFERRED BY OWNER; FFR-R02/R03 APPROVED  
**Freeze date:** 2026-10-19  
**Authority:** Owner-approved architectural decisions C02-D1 through C02-D17 and explicit FFR-R01–R03 owner dispositions.  
**Implementation authorization:** NONE. This frozen architecture is not an Antigravity implementation order; detailed integration contracts, implementation authorization, and tests remain separate.

## 1. Goal

Enable a continuous, multi-turn **discussion-only** conversation with Next Code about architecture, design, explanations, and planning, without implicitly invoking the autonomous engineering runtime, creating task-scoped Blackboard state, dispatching ephemeral workers, modifying project files, or creating task checkpoints.

The existing `AgentOS.execute_task()` remains the sole approved engineering-task entrypoint, separate from the discussion path. C-01 historical context is a lower-trust advisory input for engineering tasks; it is not itself a discussion service.

## 2. C02-D1 — APPROVED (2026-10-18)

**Selected: Option A — Independent Python Discussion Service.**

A distinct Python-side discussion service shall be used for non-executing conversation. It shall use the existing Python model-routing facilities, where the capabilities are proven and the eventual API shape is specified separately. The `ModelGateway.generate_text()` method exists in the engine; its presence alone does not establish a finished discussion API, a production provider selection interface, or free-form conversation persistence.

Conceptual boundary:

```
React/TypeScript UI
        |
   Electron Main
  (conversation ownership, SQLite,
   validation, request routing)
        |
   Python bridge (versioned JSONL,
   separate protocol contract)
       / \
      /   \
Discussion   AgentOS.execute_task()
Service          |
(read/respond)  engineering runtime
   |           (Blackboard/checkpoints/
ModelGateway    workers/verification)
```

**Non-negotiable separation:** A discussion request must never be interpreted as an `execute_task` call as a mere side effect of message receipt, UI transition, or model-generated text. The Discussion Service has no worker dispatch / write-tool authority by default. Authorizing execution requires a separate, explicit action defined by future C02 decisions.

**Ownership alignment:** Electron Main remains the authority for Desktop conversation/workspace association and persistence, in accordance with NCD-02. The Python Discussion Service handles model-facing conversational response generation, not SQLite writes or user-interface route state. Historical context size, role handling, response error states, cancellation, and data exposure remain future specification work; no long-term guarantees are inferred.

**Compatibility with frozen UI:** NCD-01 Home→Work transition occurs after a message is successfully accepted/recorded; it is not evidence of a coding task beginning. Discussion-only messages may be recorded and displayed in the same conversation timeline as task requests/results. A Discussion Service response does not trigger Task Dock auto-opening, running-agent badges, or fictitious execution statuses.

## 3. C02-D2 — APPROVED (2026-10-18): Hybrid assisted intent routing

**Selected: Option C — Hybrid (single-composer discussion with explicit execution confirmation).**

- Users converse in a single continuous timeline and composer. Discussion and explanation are available without a manual mode switch.
- For a message suggesting project modification or code execution, an intent-assistance component MAY return a **non-executable proposal** describing a possible engineering task. Suggested intent is advisory; it cannot itself call `AgentOS.execute_task()`.
- Only a separate, **explicit user action** such as **Run Task** may request promotion to the engineering path. A user can instead choose **Continue Discussion**, revise the goal, or ignore the proposal. No task execution, file writes, worker dispatch, or checkpoints occur merely because a message was classified as an execution request.
- Ambiguous messages, interpretation/classifier errors, provider failures, and ordinary discussion MUST NOT silently fall through into engineering execution. If no explicit authorized execution action is received, remain in the non-executing discussion path.
- Electron Main remains the conversation/workspace owner and must not treat model-generated routing text, renderer state, or an intent label as authorization. The proposal-identity, confirmation and workspace-binding design is governed by **approved C02-D4**; it is a design requirement, not yet an implemented enforcement mechanism.
- The frozen NCD-01 Home→Work transition still depends on **successfully recorded conversation messages**, never on inferred execution intent. A proposed-but-unconfirmed task must not create a running-task status or automatically open the execution terminal.
- Existing autonomous task execution via `AgentOS.execute_task()` and its internal safety gates remains unchanged. The hybrid rule governs **initial task authorization**, not the internal sequence of an already authorized task.

Illustrative flow (not a frozen protocol or final wire schema):

```text
User submits message → message accepted/persisted (Electron Main)
                              │
                    Discussion / intent assistance
                         ┌────┴─────┐
                         ▼          ▼
                   discuss/respond   non-executable task proposal
                                      │
                               user explicitly confirms Run Task
                                      │
                             independent validated task request
                                      │
                                AgentOS.execute_task()
```

**Not approved by D2:** a particular classifier model or rule engine, classifier prompt/schema, confidence threshold, exact confirmation object, permission model, read-only repository tools, or implementation of any of these pieces.

## 4. C02-D3 — APPROVED (2026-10-18): Python-owned intent assistance

**Selected: Option A — Intent understanding inside the Python Discussion Service.**

- The Python Discussion Service uses the language-model pathway to understand a user's conversational intent, including multi-turn and multilingual programming requests. This service may provide a conversational answer and/or a **structured, non-executable task proposal**. Neither output alone is an execution instruction.
- Electron Main continues to own message persistence, conversation identity, workspace association, and actual execution authorization. A model's intent label, suggested goal, or prose cannot directly invoke `AgentOS.execute_task()` or obtain tool permissions.
- Intent understanding is advisory, **not a trusted authorization oracle**. A misclassification, model/tool error, ambiguous message, or absent response must not initiate engineering execution. The safe default is discussion or an explicit error/retry path.
- The discussion path must not create a task Blackboard, checkpoint, or worker invocation merely to classify or respond to a message. An intent suggestion is not evidence that source-code modification has started.
- No particular classification prompt, structured-result schema, confidence threshold, LLM route, token budget, proposal validation, or provider has been approved yet. Such details require separate design and verification.
- Any future user confirmation of a suggested task shall pass an independently validated Electron Main authorization gate; **C02-D3 does not define or implement that gate**; its design requirements are specified under C02-D4 below.

Illustrative conceptual flow (not a final API/schema):

```text
Electron Main (persist/associate user message)
    → Python Discussion Service + model intent assistance
         ├─ non-executing explanation/response
         └─ optional structured advisory proposal
                → Electron Main presents it in UI
                → [Run Task] / [Continue Discussion]
                → Run Task requires distinct validated authorization (approved C02-D4 design)
```

## 5. C02-D4 — APPROVED (2026-10-18): Project- and proposal-bound Run Task authorization

**Selected: Option A — One-time, project-bound, exact-goal approval, validated by Electron Main.**

- The Python Discussion Service may suggest a **non-executable** task; the model output is untrusted proposal content, not permission to call `AgentOS.execute_task()`.
- Electron Main creates/records a proposal under a unique opaque `proposal_id`, bound to the **persisted conversation ID**, the **canonical project/workspace identity**, and the **exact engineering goal** that will be displayed for confirmation and ultimately passed to `AgentOS`. The record also tracks proposal lifecycle state and validity/expiry status.
- Pressing **Run Task** constitutes a separate explicit approval request. Electron Main resolves the proposal **from its own authoritative state**, not from a goal, workspace, or permission value supplied by React; it validates that it is the same conversation/workspace, still valid, not superseded or cancelled, and not already used. It must reject unknown, stale, replayed, or cross-project proposals.
- A proposal's approval must be **single-use** and claimed/consumed **atomically** before creating the engineering execution request, so duplicated clicks or concurrent calls cannot authorize two task runs. Any failure after consumption must have an explicit recoverable/error lifecycle; it must never permit silent replay.
- If a proposed goal or linked project changes, the prior approval must not transfer. Display the revised exact goal and require a **new explicit confirmation** against an updated/new proposal.
- The executable request is created only after this validation and approval gate, and then uses the separate engineering route. No task Blackboard, checkpoint, coding worker or repository mutation arises solely from generating/displaying a proposal.
- UI affordance: **[Run Task]** and **[Continue Discussion]** in the same timeline. UI display and any intent classifier result are advisory. Electron Main is the authorization decision boundary, consistent with NCD-02.
- Binding and validation are **mandatory design rules**, not proof of authentication, cryptographic provenance, or trusted human presence. Detailed proposal schema, cryptographic/IPC threat model, expiry duration, SQLite transaction form, user-defined hard restrictions and error recovery remain design/verification work.

**Status boundary:** No code execution, repository edits, commit or Antigravity implementation is authorized by approval of C02-D4. The actual authorization mechanism must be reviewed and tested during NCD-03 integration.

## 6. C02-D5 — APPROVED (2026-10-18): Desktop-owned authoritative conversation memory

**Selected: Option A — SQLite is the authoritative conversation record; Electron Main assembles and supplies discussion context.**

- Electron Main owns conversation message persistence, ordering, association with a canonical workspace/project, and the authoritative SQLite records. Python Discussion Service must not maintain an independent persistent chat-history database or compete as a second source of truth.
- Before any discussion-model request, Electron Main selects the relevant recent messages, existing conversation summaries (if available and later authorized), and advisory user preferences from the same authenticated conversation/workspace scope. It sends a **bounded, explicitly scoped context payload** over the future bridge. Python interprets this payload as historical, lower-trust conversational data rather than permissions, verified repo facts, or an execution request.
- A conversation can contain both ordinary discussion turns and task proposals/results in a single UI timeline. Their authoritative records remain in Electron Main; inclusion of engineering outcomes in a discussion request is a later source-selection decision, not permission to manufacture or promote verified claims.
- Python may perform temporary formatting or in-request processing to generate a discussion response, but may not silently persist separate conversation history or rewrite the authoritative desktop transcript. Any generated summary must be explicitly returned for Electron Main validation and persistence in accordance with approved C02-D7, with detailed serialization and implementation contracts still pending.
- Electron Main must not mix records across conversations or workspaces; SQLite ownership alone does **not** establish cryptographic provenance, secure bridge binding, or complete anti-injection protection. Those verification gates remain mandatory in subsequent NCD-03 work.
- This decision **does not set** the number of messages, summary strategy, summary schema, token budget, retention/deletion policy, or provider/model routing. C-01's engineering-context limits (3 prior tasks, 6 messages, 5 preferences, 3,000 characters) are **not automatically reused** for discussion history.
- Approval of this architectural ownership division does not authorize modifying code, using repository read tools, or initiating `AgentOS.execute_task()` during discussion.

Conceptual data flow (not a wire-schema commitment):

```text
Electron Main / SQLite (authoritative thread and workspace scope)
           |
           | select conversation-specific context
           v
       Python Bridge
           |
           v
 Discussion Service (stateless w.r.t. persistent conversation history)
           |
           v
 ModelGateway -> discussion answer / advisory task proposal
           |
           v
 Electron Main -> validate and persist response/proposal in SQLite
```

## 7. C02-D6 — APPROVED (2026-10-18): Hybrid long-conversation memory

**Selected: Option A — Three-part context: Recent Messages + Conversation Summary + Important Decisions.**

- **Recent Messages:** A bounded set of latest conversation turns, kept with their original roles, ordering and persisted message IDs, to retain exact local conversational detail. This is a context-selection mechanism, not a separate source of truth.
- **Conversation Summary:** A compact, historical synopsis of older messages, linked to the underlying source message range/references and clearly labeled as **derived, lower-trust** material. A generated summary never becomes an authenticated user command, independently verified repository fact, or execution permission just because a model produced it. Any persisted version is controlled by Electron Main/SQLite as approved in C02-D5.
- **Important Decisions:** Distinct decision records with an explicit status and evidence of who approved them. **Only decisions actually confirmed by the user may be represented as user-approved.** Suggestions, model inferences, and ambiguous statements remain unapproved or advisory. Each record must retain references to the original relevant conversation messages so that a user or audit can inspect its provenance. Important decisions are not automatic tool authorizations or substitutes for C02-D4's one-time Run Task confirmation.
- Electron Main assembles a **conversation- and canonical-workspace-scoped** bounded payload from these three categories. Python Discussion Service consumes it transiently as historical input, with no parallel persistent conversation database, no autonomous writing to SQLite, and no implicit invocation of AgentOS.
- Historical summary/decision inclusion does not authorize engineering actions, waive safety gates, or override present user instructions. Conflicts or uncertain derivations must remain explicitly attributable and not silently be promoted to validated facts.
- This approval establishes the **three-layer memory structure**, not final serialization schemas, extraction/confirmation UX, summary-generation provider, refresh frequency, source-selection ranking, retention strategy, numeric message counts, token budget, or compaction thresholds. These require separately approved decisions and verification. **The C-01 numeric engineering-context caps do not define D6 discussion memory caps.**

Illustrative data ownership (not a frozen database/API schema):

```text
Electron Main / SQLite (single authority)
     ├─ Recent messages with IDs / roles
     ├─ Derived summaries with source references
     └─ Important decisions with evidence + approval status
                   │
                   ▼
         Bounded scoped history payload
                   │
                   ▼
           Python Discussion Service
           (advisory context; no writes)
```

## 8. C02-D7 — APPROVED (2026-10-18): Intelligent summarization with source-verified decisions

**Selected: Option A — LLM-assisted summary and candidate decision extraction, with Electron Main-controlled verification and authoritative SQLite persistence.**

**Generation and authority separation**

- Electron Main selects a **single-conversation, canonical-workspace-scoped** set of already persisted messages and their stable IDs. The scoped source range/revision is identified before sending a summarization request through the future bridge. Cross-conversation or cross-workspace source mixing is forbidden.
- The Python Discussion Service may use a language model to produce a **proposed historical summary** plus **candidate important-decision records**, with references to the source message IDs/ranges. The service produces derived data only; it cannot write conversation memory directly, alter the original transcript, approve decisions, issue execution permission, dispatch workers, or invoke `AgentOS.execute_task()`.
- Electron Main validates the returned structure and source references against its own persisted SQLite records: correct conversation/workspace association, extant message IDs, valid message ordering, authorized source coverage, and the source revision. A fabricated, unrelated, unverifiable, or stale reference must not be stored as verified provenance. These checks establish traceability, **not a semantic guarantee** that every model summary statement is true.
- Original source messages remain the authoritative record. Derived summaries and extracted decision candidates are stored separately with their source references, provenance/status, and version/revision metadata. Summaries must not overwrite or silently delete underlying messages.

**User approval semantics**

- A model suggestion (e.g. “use PostgreSQL”) is not an approved decision. A model-derived decision is initially a **candidate/unconfirmed record**, even if expressed confidently by the model.
- Mark a decision **user-approved** only when there is an independently attributable, **explicit user confirmation** in the authoritative conversation, with the relevant user message ID(s) linked. The assistant's own assertion, a summary, ambiguous wording, or absence of a reply cannot establish approval. Electron Main checks provenance and status; where user intent cannot be established unambiguously, keep the decision unconfirmed and optionally ask the user to confirm it.
- Record and distinguish **candidate/proposed**, **explicitly approved**, **rejected**, and **superseded/revised** states as appropriate in the eventual detailed schema. The model cannot directly set the authoritative approval status. If the user revises a decision later, preserve the older decision's provenance, mark it superseded only with sufficient new evidence, and link the replacement rather than silently erasing history.
- All summary and decision material remains lower trust than current user instructions and verified repository data. Even an approved historical decision **does not substitute for the C02-D4 single-use Run Task authorization**, grant tool permissions, or waive runtime safety gates.

**Updates and failure behavior**

- On later summarization, produce a source-aware replacement or versioned update, preserving the traceable original and avoiding contradictory overlapping summaries presented as if both were current. Reconcile conflicting or obsolete claims conservatively; missing or ambiguous evidence must remain unresolved, not auto-approved.
- On model failure, malformed output, stale source revision, or inability to verify references, keep existing SQLite messages and last-valid summary/decision state intact. Discussion may use available recent messages or provide an explicit degraded/error response; never fall through to engineering execution.
- D7 approves this **responsibility split and provenance lifecycle**, not a specific extraction prompt, JSON schema, schedule, approval UI, summary token quota, text-verification algorithm, or automatic source-message retention/deletion policy. All require detailed design and tests before implementation.

Conceptual flow (not yet a frozen API/wire format):

```text
Electron Main / SQLite: persisted source messages + IDs
                │
                ▼
Python Discussion Service / LLM: proposed summary + decision candidates
                │
                ▼
Electron Main: scope/reference/revision verification
          ├── unverifiable → reject or keep unconfirmed
          └── valid → SQLite derived summary and candidate records
                           │
            explicit user confirmation evidence?
                  ├── yes → user-approved decision with source ID
                  └── no  → remains unconfirmed/advisory
```

## 9. C02-D8 — APPROVED (2026-10-18): Context-budget-triggered summarization

**Selected: Option A — Summarize based on context-budget pressure, not a fixed message interval.**

- Electron Main owns the **budget decision** because it owns SQLite conversation history and the authorized payload assembled for Python. The context budget must be evaluated for the actual selected model/route and the pending request, not assumed from a fixed number of messages or hours elapsed.
- When adding the selected historical messages, source-linked summaries, and confirmed decisions would approach the available model context budget, Electron Main may request **source-scoped compaction** of older material through the Python Discussion Service. This request is advisory data processing, **never** a coding-task authorization.
- Prefer preserving the **current user message**, the applicable system/safety instructions, adequate response-generation headroom, and relevant recent messages. Include pertinent user-confirmed decisions with provenance; older history may be summarized according to C02-D6/D7. Do not silently treat model-derived summaries as authoritative decisions.
- Summarization targets **older eligible messages**; retain original persisted messages and stable source IDs. Reuse the source-linked summary/decision provenance and stale-revision checks approved under C02-D7. If compaction fails, keep the existing authoritative record intact and return a bounded degraded discussion context or an explicit error. Never silently overflow the provider context window or route the message to AgentOS.
- A budget estimate is only as reliable as the selected provider/model's supported limits and token accounting. Do not promise zero-overflow or fixed-token guarantees without measured/model-specific evidence. If budget cannot be assessed adequately, reject or reduce optional history conservatively; preserve the current request and safety instructions.
- **Not approved or frozen by D8:** numeric token or character quotas; precise trigger percentage; per-layer quotas or detailed relevance ranking; tokenizer/counting implementation; maximum summary size; compaction job schedule; response-length reserve amount; background execution policy; provider fallback. These must be designed and tested separately. **The C-01 cap of 3,000 characters is not a D8 discussion budget.**

Conceptual decision, not a production algorithm:

```text
Electron Main / SQLite: conversation history + provenance
               │
               ▼
    Assemble current message + selected historical context
               │
               ▼
    Evaluate remaining model-specific context budget
         ┌─────┴─────┐
         ▼           ▼
      Sufficient   Near budget pressure
         │           │
         ▼           ▼
     Discuss       Source-scoped older-history summary proposal
                      │
                      ▼
                 Verify references/revision
                      │
                      ▼
                 SQLite derived summary, originals preserved
                      │
                      ▼
                 Reassemble bounded discussion context
```

## 10. C02-D9 — APPROVED (2026-10-18): Explicit per-request discussion model selection

**Selected: Option A — The user-selected supported model determines each discussion request; engineering-agent model routing remains independent.**

**Selection and ownership**

- The Next Code Desktop conversation UI offers only **genuinely supported and configured** models/routes. Electron Main is authoritative for validating the effective selected discussion model and binding the choice to the particular discussion request. UI labels and renderer-submitted identifiers are not trusted provider configuration.
- Each discussion request carries an explicit, validated model/route selection through the versioned Electron↔Python bridge (wire fields and provider registry schema will be specified separately). Python Discussion Service uses the existing `ModelGateway` facilities **only where the requested route is actually supported**, otherwise reports a clear unsupported/unavailable outcome; this approval does not assert that arbitrary provider/model strings already work in the current gateway.
- The model used for ordinary discussion and intent assistance is separate from the existing Lead Architect / SCOUT / SURGEON / INQUISITOR routing choices. Changing the discussion-model selector must **not** silently reconfigure engineering agents, mutate in-flight tasks, or change the meaning of a previously approved task goal.
- On a model change, subsequent discussion requests use the newly selected supported route; any in-flight request retains its already validated choice. The current message/history budget assessment under C02-D8 must be reevaluated against that route's real context constraints.

**Unavailable model, errors and safe behavior**

- If the selected model or provider is unavailable, unsupported, misconfigured, or lacks usable credentials, report an explicit discussion-side error with a retry/change-model path. **Never silently switch providers or models**, claim that the response came from the selected model when it did not, or route a failed discussion request to `AgentOS.execute_task()`.
- A retry or explicit model change must preserve the persisted conversation and workspace association and must not create duplicate authoritative turns inadvertently. Exact retry/idempotency mechanics, error envelopes, credential lifecycle and request-cancellation policy remain future implementation decisions.
- Selection, router metadata, prompt content, historical messages and model-generated task proposals confer **no execution authorization**. The independent Electron Main C02-D4 Run Task confirmation remains mandatory.

**Not yet approved:** provider/model registry schema, default and persisted model settings, exact Python API signatures, bridge request shapes, provider fallback policies beyond the prohibition of *silent* fallback, streaming behavior, credential UI, concurrency and quantitative token budgets. These require further design and verification. **No implementation is authorized by D9.**

## 11. C02-D10 — APPROVED (2026-10-18): Bounded read-only project awareness during discussion

**Selected: Option A — The Discussion Service may request authorized, read-only project insights, without execution authority.**

**Purpose and capabilities**

- While discussing the *currently selected* software project, a user may request a design review, architectural explanation, or comparison grounded in existing project files. Such requests may use a dedicated **read-only project inspection path**; they do not become autonomous engineering tasks merely because repository contents are needed.
- The discussion route **must not modify, create, delete, or rename project files; execute terminal commands; invoke SURGEON/SCOUT/INQUISITOR agents; enter the `AgentOS.execute_task()` loop; or create task Blackboard/checkpoint records**. Existing engineering-workflow privileges cannot be borrowed by simply importing a tool or sending model-generated instructions.
- Repository file excerpts and metadata furnished through this read path are **untrusted project content**, not system instructions, authenticated user approvals, tool permission grants, or verified facts about files that were not actually read. Descriptions should distinguish inspected evidence from speculation and stale cached information.

**Required guardrails before any implementation**

- Every read must be bound to a **specific, currently authorized conversation and canonical workspace** as determined by Electron Main, not a workspace or arbitrary absolute path proposed by the LLM or renderer alone. Prevent path traversal, symlink escape, and cross-project reads; prohibit reading outside authorized scope.
- Sensitive material (such as credentials, secrets, private keys, environment files and other policy-protected content) must be excluded or redacted under a separately designed deterministic policy. Do not equate ordinary filesystem readability with approval to forward content to an LLM provider.
- Apply bounded selection/volume, clear source-path and revision provenance where available, and explicit denied/unavailable/truncated states. File contents must not be silently executed, and suggestions based on the content remain discussion-only.
- **D10 approves read-only project awareness as a product capability, NOT a specific broker, sandbox, read API, allow/deny list, secret detector, consent model, or access-control implementation.** Until the detailed authorization and safeguards are designed and verified, the Discussion Service has no blanket direct filesystem access and no implied permission to transmit repository secrets.

**Resolved by C02-D11:** Electron Main is the sole trusted broker and enforcement point for discussion-only project reads; Python Discussion Service has no direct read capability through this discussion path. File-type policies, sensitive-content handling, exposure boundaries, content size/time limits, error modes and tests remain for subsequent decisions.

Conceptual flow, not an authorized tool/API contract:

```text
User requests project insight within a conversation
           │
           ▼
Electron Main: identify conversation + canonical workspace
           │
           ▼
Authorized read-only inspection boundary (design pending)
           │
       bounded / scoped evidence
           ▼
Python Discussion Service → ModelGateway → discussion response
           │
           └─ no AgentOS execution, worker dispatch, shell or file writes
```

## 12. C02-D11 — APPROVED (2026-10-18): Electron Main-owned read-only project file broker

**Selected: Option A — Electron Main is the sole authorized broker for discussion-only project inspection.**

**Authority and data flow**

- Python Discussion Service may request an eligible, bounded file excerpt or project metadata through the future versioned Python Bridge. A model-generated file path or file request is **untrusted input**, never independent filesystem authority or an instruction to execute a command.
- Electron Main resolves each request against the **persisted conversation ID and currently authorized canonical workspace/project** held in its own state. Neither Python nor React may change that binding by submitting an absolute filesystem path, a substituted project ID, or an unauthorized directory.
- Electron Main performs the **read and the enforcement**, returning only explicitly authorized text excerpts/metadata through the bridge. The Discussion Service does not open arbitrary project files itself, run shell commands, traverse directories with its own general-purpose file tools, or invoke `AgentOS` or ephemeral coding workers to obtain read access.
- Any future reuse of an existing Python code-inspection helper must not bypass the Electron Main read broker or inherit an engineering-task tool permission. If this cannot be guaranteed in implementation, **STOP and request design revision**, rather than silently adding Python-side direct access.

**Mandatory safeguards**

- Validate paths as workspace-relative selectors; reject arbitrary absolute paths, traversal components, symlink/junction/reparse-point escapes, and paths outside the allowed project. Resolve/check the *actual target* before use and mitigate check-to-open race conditions with platform-appropriate file-handle checks and tests. Merely prefix-matching path strings is insufficient.
- Electron Main must apply a **deterministic, fail-closed sensitive-file and data-exposure policy** before reading or forwarding content. Ordinary OS read permission is insufficient. `.env`, credentials and private-key material are examples of prohibited exposure, not an exhaustive list. Exact file-type rules and policies are deferred to C02-D12 and subsequent contracts.
- Enforce bounded read size, request rate/resource limits and permitted text representation **before** forwarding content to Python or a remote provider. Exact numerical limits, provider-transmission consent rules and detailed protocol fields remain separate decisions.
- Return explicit permitted/denied/not-found/oversized/stale states and provenance (workspace identity, permitted relative path, and freshness metadata when feasible) rather than fabricating file contents or treating unavailable data as inspected evidence.
- Treat approved source excerpts as **untrusted data** within model prompts. The broker is a deterministic access boundary, not proof that the language model cannot be influenced by source-code comments or injection attempts. No file read implies task authorization.
- If workspace authorization cannot be verified or the broker's safety checks are unavailable, **deny the read** and give the discussion path a clear degraded response; never fall through to unrestricted Python file reads, AgentOS, or terminal execution.

**Approval boundary:** D11 fixes the ownership and enforcement point only. It does **not** grant unrestricted repository reads, implement a broker, authorize code changes, freeze precise allow/deny lists, guarantee secret detection, or choose a bridge schema. Verification on Windows must include symlinks/junctions, sensitive-file denials, races, cross-workspace spoofing, and no-execution properties.

Conceptual flow (no implementation permission):

```text
User asks about current project  ──► Electron Main (conversation/workspace owner)
                                          ▲
                                          │ broker-only inspection request
Python Discussion Service ──► Python Bridge │
                                          ▼
                                Electron Main read broker
                                (resolve + authorize + bounded read)
                                          │
                                 permitted evidence only
                                          ▼
                            Python Discussion Service / LLM
                                  (advisory answer only)
```

## 13. C02-D12 — APPROVED (2026-10-18): Broad text-readable project scope with sensitive exclusions

**Selected: Option B — Most ordinary text files within the authorized project are eligible for read-only inspection, subject to a deterministic deny policy and bounded transfer.**

**Rationale:** The owner needs a comprehensive architectural view across heterogeneous real-world repositories. A narrow extension allowlist would hide relevant textual files (unusual source extensions, tooling manifests, build/configuration documents, scripts and custom languages). The intent is broader *eligible discovery*, **not** unlimited raw disclosure or dumping the whole repository to an LLM.

**Read policy and trust boundary**

- Electron Main's D11 file broker remains the **sole file-reader and permission enforcer** in the discussion path. Python Discussion Service and the model receive only broker-approved evidence; no arbitrary Python filesystem reads, shell commands, writes, worker tools or `AgentOS` invocation.
- Broad **text-oriented eligibility** is the default for ordinary regular files inside the canonical, authorized workspace, regardless of whether the filename has a known extension. Eligibility is determined by validated path, file type and bounded content checks; an unknown extension is not by itself a denial.
- Explicitly **deny** sensitive files and sensitive content where identified. Denials take precedence over broad text eligibility. Examples include `.env` and variants, credentials, private keys, secret/token stores, and other known private material; file path patterns alone do not guarantee that ordinary-looking source files are safe. Secret-content inspection and conservative error handling are required, but secret scanners are imperfect, so this approval does not guarantee that every secret is detectable.
- No blanket automatic access to binary/media content, non-regular/special files, links escaping the workspace, OS/device resources, or unbounded directory dumps. Symbolic links, Windows junctions/reparse points, path traversal and read-race conditions remain governed by D11's verified containment requirements. Commonly ignored generated/dependency artifacts may be excluded from automatic discovery for resource control, but exclusions must not silently claim a complete inspection.
- **Discovery is distinct from exposure:** a project-wide overview may enumerate permitted relative paths, structure and safe metadata first. Reading actual file contents and sending excerpts to the model are separate bounded broker operations. Not every readable file should be opened or transmitted. Report which files were inspected, excluded, inaccessible or omitted due to budget, and do not represent an incomplete scan as exhaustive.
- Enforce size/rate/time/token limits and provider-transmission policies before forwarding content; exact thresholds, bulk-selection and user override flows remain to be designed. Sensitive deny rules must not be silently bypassed via a broad user request or model-generated instruction. If a file cannot be confidently classified or safely inspected, deny that content and explicitly report the limitation.
- File contents and repository comments are lower-trust data; their text cannot override application instructions, turn on execution, or authorize tools. A successful read-only discussion may propose a task but must still pass the one-use D4 Run Task authorization for any engineering execution.

**Approval boundary:** D12 selects **Option B (broad text with exclusions)**, rather than D12 Option A (fixed conservative extension allowlist). It does not freeze exact forbidden filename/glob patterns, a secret scanner, MIME/encoding algorithm, traversal implementation, per-file/per-request limits, bulk read UX, model-disclosure consent or prompt wire schema. Those remain future approval and testing gates; no code modifications authorized.

Conceptual staged read (not a frozen algorithm):

```text
Authorized workspace / conversation (Electron Main)
                   │
                   ▼
   Broad text-file eligibility + mandatory exclusions
                   │
             scoped file listing
                   │
                   ▼
    on-demand bounded broker-approved excerpts
                   │
                   ▼
         Python Discussion Service / LLM
              (discussion only)
```

## 14. C02-D13 — APPROVED (2026-10-18): Staged, evidence-led project inspection

**Selected: Option A — Intelligent progressive inspection, rather than eager bulk ingestion.**

**Scope and discovery strategy**

- For a discussion-only project review, start with a **scoped structural inventory** supplied by Electron Main's D11 read-only broker: permitted relative paths, directory layout and safe metadata. Inventory is not evidence that file contents were read or comprehended.
- Identify potentially relevant entrypoints, manifests, module boundaries and dependency/configuration relationships using permitted metadata first. The Python Discussion Service may recommend **bounded evidence requests** for specific files or excerpts; Electron Main alone authorizes and performs each read under D11/D12 controls.
- Read and reason in **successive evidence batches** guided by the user's question and gaps in the current understanding. Extend coverage as warranted and within resource limits; do not eagerly stream an entire repository into the LLM merely because its text files are eligible for inspection.
- Broad file eligibility approved under D12 remains intact. Progressive selection governs **which eligible evidence to inspect and when**; it does not reinstate an extension allowlist or give the Python service unrestricted filesystem access.
- Distinguish actual file-content inspection from structural listing, source-derived inference, model speculation, files blocked for sensitivity, inaccessible content and files not yet reviewed. Conclusions must be scoped to the evidence examined; an incomplete review must not be described as exhaustive.
- Inspection remains **non-executing and read-only**: no shell, file mutation, checkpoints, Blackboard creation, coding-agent dispatch or implicit `AgentOS.execute_task()` call. A proposed implementation still requires the separate single-use C02-D4 authorization.

**Resource, failure and provenance requirements**

- Electron Main enforces deterministic per-request and cumulative bounds for reads, time and transferred data before model exposure. User cancellation, project revision and changed files must lead to explicit stop/stale handling, not silently reuse old excerpts as current. Exact numerical caps and scheduling remain open.
- Model-facing evidence must retain at least the authorized project/conversation association and relative source path plus available freshness/scope metadata so analysis can identify where conclusions came from. Never reclassify repository comments or source text as high-trust instructions.
- If budget runs out, an inspection is denied, or an inventory cannot finish, return a **qualified partial assessment** with clear coverage/limitations, or an explicit failure where no reliable answer is possible. No invented scan coverage or invisible automatic fallback to direct Python reads.
- User-visible progress and coverage presentation, including what qualifies as "fully reviewed", is the subject of **C02-D14**; D13 requires truthful evidence accounting but does not freeze that UX.

**Approval boundary:** D13 approves the staged strategy and its read-only trust boundary. It does **not** approve a particular indexing/search engine, repository graph implementation, batch size, cached inventory format, ranking algorithm, background crawler, or persistent Python-side index. No implementation is authorized by this decision.

Conceptual flow (not a final broker API):

```text
User requests architecture review
        │
        ▼
Electron Main: scoped safe project inventory
        │
        ▼
Python Discussion Service: identify evidence gaps
        │
        ▼
Electron Main broker: validate + read bounded excerpts
        │
        ├── denied / stale / out of budget → report limitation
        ▼
Python / LLM: refine analysis and optionally request more evidence
        │
        ▼
Qualified discussion answer with grounded inspection coverage
```

## 15. C02-D14 — APPROVED (2026-10-18): Live, truthful inspection progress and coverage UX

**Selected: Option A — Present lightweight live progress during staged project inspection and an evidence-grounded coverage report at completion.**

**User-visible behavior and accountability**

- An authorized long-running project review displays a compact **Analyzing Project** progress element inside the current conversation. It shows a meaningful current stage such as inventorying permitted files, selecting evidence, inspecting module excerpts, synthesizing findings, or completed/partial/failed/cancelled; these are reported execution states, not model-invented claims.
- Where available, show **grounded integer counters** separately for paths discovered/inventoried, files successfully read (at least one authorized excerpt), requests/reads denied, and remaining/unexamined candidates. An item merely listed or selected is **not** a file inspected. Do not claim full-file review when only an excerpt was read; keep the actual coverage unit visible when needed.
- Do **not** use invented percentages, speculative file-count denominators, model-derived progress fractions, or a visually complete progress bar to imply exhaustive review. If reliable counts are unavailable, use stage/status plus an indeterminate indicator and explicitly label coverage **partial/unknown**.
- At completion, provide a readable **inspection coverage summary** (distinct from analytical conclusions): inspected file paths or a scoped list, inspected ranges where partial, denied/sensitive exclusions without leaking their contents, unavailable/stale items, relevant not-yet-inspected areas, and whether the result is partial or adequately scoped for the user's question. Never label an entire large repository 'fully analyzed' solely because inventory is complete.
- Support explicit **cancelled**, **failed**, **budget-exhausted**, and **stale project** terminal states; preserve truthful partial coverage instead of fabricating completion. Route changes/side panel toggles do not convert a running process into finished work or authorize engineering execution.

**Trust, lifecycle and scope**

- Electron Main owns the conversation/workspace binding and validates authoritative inspection-event identity/status before emitting progress to React. Progress reports may include only metadata from actually completed broker operations; Python or model-generated text must not override broker accounting or elevate conclusions into verified repository-wide claims.
- Keep progress payloads bounded and avoid exposing sensitive relative paths, denied file contents, tokens, or external provider secrets. Access-denied categories and summaries are acceptable where they do not leak protected data.
- Discussion-only scanning stays behind the read-only Electron Main broker from D11/D12 and staged evidence plan from D13: no terminal execution, editing files, creating task Blackboard/checkpoints, or calling coding workers. Any proposed implementation remains gated by separate user-approved C02-D4 **Run Task** confirmation.
- The final rendering, broker/progress event schema, counters' exact definitions, concurrency/streaming and cancellation implementation, numeric resource quotas, and verification tests are **not** frozen by D14; they remain future contract work. If live events are unavailable due to transport failure, show a truthful degraded status rather than false progress.

**Approval boundary:** D14 specifies product-level honest live UX plus a final coverage report. It does not authorize adding a background crawler, per-file watch service, arbitrary percentage estimator, persistent Python scan database, or code modifications.

## 16. C02-D15 — APPROVED (2026-10-18): Explicit external-provider disclosure consent per project and provider

**Selected: Option A — Require user consent before externally transmitting authorized project source excerpts; bind approval to the project and actual provider.**

**Distinct permissions and responsible authority**

- Permission to **read** a project file locally (under C02-D10–D12) does **not** authorize external disclosure of its contents. Electron Main enforces this distinction, as the trusted Desktop conversation/workspace and file broker owner. Discussion Service and model-generated requests cannot mint, imply, or alter consent.
- Before first outbound transmission of project source excerpts or source-derived material that exposes the project's contents to an external model provider, Electron Main must identify the canonical authorized workspace/project and **verified effective provider/destination** and obtain the user's explicit consent. The dialog should explain the project, provider and categories of content proposed for transmission, without showing protected secrets. Selecting a model or asking for an architecture review alone is not external-disclosure consent.
- Consent is scoped to the **specific canonical project/workspace + verified provider** and the approved disclosure class; it may be remembered in authoritative Electron Main/SQLite records with its user approval evidence. A later request using the same approved scope need not prompt on every message. Switching to a different provider or otherwise leaving the approved disclosure scope requires fresh permission. Merely changing a model under the same provider does not automatically grant extra content categories or bypass other controls.
- The user must be able to inspect and revoke consent. A revoked or missing approval blocks **future** external transmissions in that scope; it cannot retract material already sent. Record consent scope, status, timestamps/source event and revocation in an auditable way. Exact consent record schema, retention/expiry policy and UX are deferred to implementation contract design.

**Non-bypassable safety rules**

- Consent **never overrides** Electron Main's deterministic restricted-file rules, secret-denial/redaction policy, workspace containment, resource limits, or no-execution rule. Files blocked by C02-D11/D12 remain blocked even when disclosure consent is granted. No blanket permission to transmit a whole repository is created.
- Enforce consent again at the point of outbound sending, validating the actual route and effective destination. If the destination/provider identity is unclear, approval absent, scope stale, or consent revoked, **fail closed**: do not send project content to the external provider. A provider fallback must not silently reuse another provider's approval.
- Do not put unapproved file excerpts into supposedly ordinary discussion history, summaries, debug logs, retry payloads, or alternative LLM calls to bypass the consent boundary. Source-derived summaries that expose project contents require the same care as excerpts when destined for an external provider.
- Read-only, local discussion with a genuinely local model does not require *external-provider* consent, but remains governed by file-broker restrictions. Existing non-project chat content and engineering-agent outbound data require their own applicable policies; **D15 does not grant permissions or define all network egress controls**.
- On denial, the conversation should continue, when feasible, with a clear limitation and alternatives (for example, discussion without file contents or an eligible local model). Never route a refused disclosure to AgentOS or secretly change provider.

**Still open after D15:** exact consent UI/persistence schema and effective-destination verification, specific file/secret-denial policy, per-file and per-request resource caps, outbound audit strategy, route/credential implementation, and provider-specific privacy disclosures. This decision authorizes design direction only, **not code changes**.

## 17. C02-D16 — APPROVED (2026-10-18): Multi-layer sensitive-file and secret exposure protection

**Selected: Option A — Layered protection at the Electron Main read broker: path/name rules, content inspection, and deterministic allow/deny or narrowly safe redaction.**

**Purpose and compatibility with earlier decisions**

- This approval preserves **C02-D12 Option B**: most ordinary text files remain *eligible* for broad staged discovery/inspection. Eligibility to discover a path is **not** authorization to forward its content or expose it to an LLM.
- Electron Main, through the **C02-D11 read-only file broker**, is the enforcement point. Python Discussion Service and model-generated read requests cannot bypass it, read the underlying filesystem directly, or elevate access. No additional read/write/shell/AgentOS permission is granted.
- C02-D15 external-provider disclosure consent remains a **separate mandatory gate**. A granted provider consent cannot override any sensitive-data denial. Local-model use also remains subject to the broker's sensitivity rules.

**Layered safeguards — accepted principles**

1. **Path and file identity screening:** Check canonical, workspace-contained targets and deny known sensitive paths, names, patterns, and key/credential material (e.g., `.env`, private keys, credential stores). Do not infer safety solely from a file extension or apparent text content. Hidden paths and indirect/symlink access are subject to the same effective-target rules already approved in C02-D11.
2. **Content screening before release:** For a file otherwise eligible to read, scan the bounded content intended for release for known secret patterns and potentially sensitive material. Screening must occur inside the trusted Electron Main broker before any file bytes/excerpts are exposed to the Python discussion process or external provider. Account for partial/chunked reads so a dangerous value is not made safe merely by splitting it across chunk boundaries.
3. **Decision and sanitization:** Deny suspicious files/excerpts, or release a version with redacted sensitive spans **only when the sanitizer can establish a reliable, auditable boundary** and no secret-containing original is forwarded. If screening fails, cannot be completed, or the content cannot be safely redacted, **fail closed for that content** and return an explicit withheld/blocked status. Never silently substitute a raw unfiltered excerpt.
4. **Data-path containment:** Unapproved or flagged content must not leak through model messages, previews, error details, logs, caches, retries, summaries, generated decision records, progress events, or alternate provider routes. The broker may expose minimal non-sensitive reason codes and coverage metadata needed for truthful reporting, not the secret values themselves.
5. **Auditability and truthful claims:** Distinguish discovered, read-and-screened, released, redacted, denied, and not-examined material. Do not claim whole-project review of withheld files. Record safe provenance/decision metadata in an auditable fashion, without recording the prohibited content itself.

**Security limitation:** Pattern detection and heuristic secret scanning can produce both false positives and false negatives. This layered policy **reduces risk but does not guarantee detection of every secret** or total resistance to model prompt injection. A passing scanner is not an unconditional disclosure authorization; the outbound scope, destination consent, containment and resource checks still apply independently.

**Deferred implementation details:** Exact denial catalogs, scanner strategies and signatures, handling of false positives, redaction eligibility and formats, path/handle race prevention, chunk overlap, maximum file/batch sizes, scan performance/caching, audit schema and incident testing require a separate reviewed design. If an implementation cannot reliably enforce the approved fail-closed boundary, it must stop for design review rather than weakening this principle. **No C-02 code changes are authorized by D16 alone.**

## 18. C02-D17 — APPROVED (2026-10-19): Dynamic inspection budget with mandatory hard resource ceilings

**Selected: Option A — Adaptive, staged project-reading budget constrained by deterministic maximums, rather than one uniform fixed window for all projects.**

**Resource authority and progression**

- Electron Main's **read-only project file broker** remains the authoritative resource gate for discovery and reading. Each read request, file excerpt, batch and aggregate inspection session must be bounded by enforceable limits; the Python Discussion Service and the model can request more evidence, but cannot increase or bypass those limits themselves.
- Use **dynamic relevance-driven selection** inside the mandatory budgets. Start with authorized structural inventory and high-value evidence, then allow successive targeted read batches according to the user's question, observed coverage, remaining resource allowance and validated model-specific context capacity. This does **not** authorize eager or unrestricted ingestion of a large repository.
- The future implementation must set finite, measurable ceilings for **individual file/excerpt size, bytes/characters per batch, request/session aggregate transfer, file-count or operation budgets where appropriate, processing time, memory pressure and concurrency**. Per-file limits alone are insufficient if unlimited file requests could accumulate without control. Enforce limits before sending content to Python, a provider or history storage.
- Files that exceed safe inspection limits may be declined or, if the policy explicitly allows it, inspected in bounded excerpts/chunks with deterministic overlap and independent safety screening; never silently treat a partial excerpt as complete-file evidence. Chunked access cannot bypass secret screening, containment, outbound-consent checks or aggregate limits.
- Provider/model context-window budget and response headroom remain independently enforced under C02-D8. Approval to read locally does not imply approval to transmit externally: C02-D15 provider-scoped consent and C02-D16 secret-screening rules still govern every release. Limits on inspection do not authorize automatic provider fallback or engineering execution.

**Termination, accounting, and user experience**

- On a reached hard limit, denial, timeout, cancellation or stale project state, **stop or narrow the affected inspection operation safely**, without uncontrolled retries or escalation. Return an explicit bounded status (for example `BUDGET_EXHAUSTED`, `TOO_LARGE`, `DENIED`, `CANCELLED` or `STALE`) and, if useful, invite the user to specify a narrower component or a newly approved bounded scan.
- Progress counters and the final coverage report must distinguish files discovered, excerpts actually inspected, excluded/denied content, and budget-limited unexplored areas. A project with 10,000 files may be analyzed iteratively, but **must not be described as fully examined** when only a subset was read.
- Keep the identity and scope of resource accounting bound to the canonical workspace, conversation and inspection request, so independent sessions cannot silently borrow authorization or circumvent a single-request limit. Any stronger anti-abuse/cross-session aggregate quota requires detailed design and testing.

**Approval boundary / deferred details:** D17 fixes the **adaptive-inspection-with-hard-ceilings principle**, not numeric maximums, exact ranking algorithm, token estimator, chunk sizes/overlap, request/session accounting schema, concurrency model, cancellation transport, limit overrides, provider-specific budgets, cache behavior or performance targets. These details require independent design, Windows tests and an explicit freeze gate. **No C-02 code implementation is authorized by D17.**

## 18A. FFR-01 owner disposition — FFR-R01 deferred (2026-10-19)

**Decision:** The owner explicitly **DEFERRED** the newly proposed universal pre-send outbound LLM disclosure/consent gate (FFR-R01) until the desktop application is running and its real provider/data flows can be studied. The intent is to avoid premature design complexity and over-restriction during this phase. **FFR-R01 remains a known open risk / future hardening item; it is not FIXED, VERIFIED, or approved as a complete security solution.** No additional all-path outbound gate is authorized by this C-02 design decision.

**Preserved owner-approved scope (no repeal):** C02-D15 still requires scoped user consent before sharing project excerpts/source-derived material with an external provider; C02-D16 still requires the intended path/content sensitivity controls for project-file evidence. D10–D13 read-only project access remains broker-mediated; D2/D4 explicit user confirmation remains mandatory for any engineering task. The FFR-R01 deferral does **not** grant a new permission to bypass these existing controls, claim that arbitrary secrets are safe to transmit, or silently redirect to a different external provider.

**Honest deployment boundary:** A selected external LLM provider can receive the requests actually transmitted to it (including any user-pasted code and generated context), but it does not automatically acquire arbitrary local project file access merely because the user selected that provider. The design must disclose practical limitations and avoid statements that *all* request classes or paths are comprehensively screened until that is actually established. Before any production-like external-provider rollout, review real sending behavior and residual risks, and obtain a new owner decision on whether the deferred universal gate is necessary.

**Governance:** The original FFR-01 findings remain unchanged as historical reviewer findings. This section records the owner's subsequent, explicit risk-acceptance/deferment. FFR-R02 and FFR-R03 are separately approved and recorded below. No C-02 code is authorized by the owner disposition; this disposition was recorded prior to the subsequent architectural freeze.

## 18B. FFR-01 owner disposition — FFR-R02 approved (2026-10-19)

**Decision:** The owner **APPROVED** a lightweight, evidence-linked user-decision confirmation mechanism without imposing a new confirmation dialog for each clear approval. This is an explicit clarification of C02-D6/D7, **not** a change to the other established C-02 design choices, a broader automation permission, or an implementation authorization.

**Approval rule:** Python/LLM extracts *candidate* decisions only. Electron Main/SQLite may mark a particular decision `USER_APPROVED` solely on the basis of an actual persisted, attributable **user-authored confirmation** clearly tied to the **exact pending decision identity and content/revision**, in the relevant conversation/workspace. Retain the source message ID (or explicit user UI confirmation event), decision revision, and timestamp/status transition to support audit and later supersession. Checking a message ID alone, matching a phrase in an LLM summary, or accepting a model's self-asserted approval is insufficient.

**Low-friction UX:** For a clearly presented, single pending choice, the user's direct and unambiguous reply (e.g. "أوافق على SQLite") may count without an extra modal confirmation if Electron Main can bind that reply to the exact decision. If multiple proposals, conflicting context, ambiguity, or weak attribution prevent reliable binding, leave the item `CANDIDATE`/`UNCONFIRMED` and ask a short clarification only when needed. A user reversal/replacement must carry equally attributable evidence; do not overwrite the original silently.

**Separation from execution:** An approved conversational design decision remains historical context, **never** an execution grant. C02-D4 still requires a separately scoped, single-use Run Task confirmation before `AgentOS.execute_task()`.

**Open to implementation contract:** Exact decision IDs, SQLite schema/migrations, authoritative event binding/atomic update, heuristic limits for unambiguous direct replies, race/duplicate/stale-revision handling, and tests must be designed before code acceptance. No universal semantic proof is claimed and no LLM-only transition to `USER_APPROVED` is authorized. **FFR-R02 status: APPROVED (architectural clarification); implementation NOT VERIFIED.**

## 18C. FFR-01 owner disposition — FFR-R03 approved (2026-10-19)

**Decision: APPROVED — Option A, application-level capability separation for the initial local Windows Desktop release.** The owner approved keeping the Python Discussion Service logically separated from engineering execution and direct project-file reading through narrowly exposed APIs, without adding Windows OS-level process sandboxing as a prerequisite to this architectural freeze.

**Mandatory design boundaries:**

- All discussion-purpose project inventories and excerpt reads are mediated by Electron Main's D11 broker, with D12–D17 scope, sensitive-content handling and resource restrictions. The Discussion Service is not intentionally given an unbrokered project reader or writable filesystem, terminal/shell, worker dispatcher, or `AgentOS.execute_task()` capability in its discussion request interface.
- Distinguish **model-exposed tools**, **trusted Python discussion-service code and imports**, and **Windows process permissions**. Absence of a model-facing reader or tool is *not* a Windows OS security boundary. The Python process may technically possess the launching user's filesystem permissions; this first-phase design makes **no claim** of hard OS-level isolation against compromised or malicious Python code/dependencies.
- Discussion requests, model-produced text and intent labels must never be promoted into engineering calls. Engineering execution remains behind a separately confirmed, single-use C02-D4 `Run Task` transaction. No hidden shell or `AgentOS` fallback on discussion errors.
- The later implementation must verify the real discussion-facing call graph and available capabilities; test benign and adversarial attempts to reach the filesystem, terminal, worker routes or `AgentOS` through the discussion request surface. Where requested read-only guarantees cannot be enforced within the proposed code, stop for review instead of silently adding direct filesystem access. These are **integration acceptance gates**, not claims that code already passes them.
- OS-level sandboxing / reduced process privileges can be revisited after a concrete threat-model and Windows packaging review. Until such work is approved and verified, documentation and UI must describe this as **application-level separation**, not an OS sandbox.

**Relation to earlier decisions:** Preserves D1–D17, including D11's authoritative Electron Main broker and D15/D16 project-content disclosure/sensitivity requirements. FFR-R01's broader universal outbound-LLM gate remains expressly deferred by the owner and is **not** repaired by R03. No implementation authorization is granted by this decision.

**Status:** FFR-R03 APPROVED as architecture, not IMPLEMENTED or OS-ISOLATED. Verification gates remain for subsequent typed bridge, capability and broker contracts.

## 19. Future C-02 decisions (not yet approved)

- Define and test provider-specific context-window accounting, reserved response budget, deterministic ranking/compaction thresholds and fail/degraded behavior (D8 numeric details not yet approved).
- Detailed provider/model registry, default/persistence policy and gateway request schema for discussion (implementation details after D9).
- C02-D12 Option B is approved: broad eligible text-file discovery with deterministic sensitive-content denial. Still open: exact denial catalog, content-inspection approach, progressive inspection implementation details, numeric resource ceilings/accounting, external-provider exposure policy and broker wire protocol.
- C02-D13 Option A approved: structural inventory followed by relevant bounded broker-mediated evidence batches, with truthful coverage and partial-result labeling. Open: exact selection/ranking, indexing/cache strategy, numeric limits and cancellation implementation.
- C02-D14 Option A is approved: live stage/grounded-counter progress and explicit final coverage report. Open: event schema, count definitions, cancellation implementation, streaming behavior and UX verification.
- C02-D15 Option A approved: explicit revocable consent tied to canonical workspace/project and effective external provider before disclosure; source-reading permission alone is not disclosure permission. Still open: exact consent schema/UX, actual destination validation and provider privacy disclosures.
- C02-D16 Option A approved: layered path/name and content screening plus denial or narrowly safe redaction in Electron Main, preserving broad text-file eligibility without guaranteeing perfect secret detection. Still open: concrete sensitive-path catalogs, scanner/redactor design, multi-chunk handling, audit records, benchmarks, and false-positive controls.
- C02-D17 Option A approved: adaptive evidence acquisition subject to enforceable file, batch, request/session and runtime ceilings, with budget-exhausted/partial coverage handling. Open: numeric budgets, accounting, chunking, concurrency, cancellation and performance benchmarking.
- Implement and verify FFR-R03 application-level discussion capability restrictions (no discussion API direct filesystem, shell, workers or AgentOS); Windows OS-level sandboxing is explicitly deferred, and full OS privilege isolation must not be claimed.
- FFR-R01 universal outbound LLM disclosure gate remains DEFERRED BY OWNER for running-app data-flow review; D15/D16 approved disclosure and project-read protections remain mandatory.
- Offline/provider-down behavior, retries, errors, latency, and non-streamed versus streamed responses.
- How discussion requests are handled while an engineering task is actively running.
- Verification, security, failure modes, and freeze gate.

## 20. Decision log
| Decision | State | Resolution |
| --- | --- | --- |
| C02-D1 | **APPROVED — 2026-10-18** | Option A: independent discussion-only service in Python, separated from `AgentOS.execute_task()`, reusing Python model gateway where supported. |
| C02-D2 | **APPROVED — 2026-10-18** | Option C: hybrid advisory intent suggestion in a single conversation; user must explicitly confirm Run Task before engineering execution; default non-executing behavior. |
| C02-D3 | **APPROVED — 2026-10-18** | Option A: LLM-based intent assistance resides in Python Discussion Service; may output a non-executable structured task suggestion, never execution authorization. |
| C02-D4 | **APPROVED — 2026-10-18** | Option A: Electron Main stores and validates a one-time proposal bound to persisted conversation, exact goal and canonical workspace; rejects stale/replay/cross-workspace use and requires a fresh confirmation if details change. |
| C02-D5 | **APPROVED — 2026-10-18** | Option A: Electron Main/SQLite is authoritative for messages, ordering, conversation-workspace binding and context assembly; Python Discussion Service receives scoped historical data without maintaining a separate persistent chat memory. D6 three-layer context, D7 provenance and D8 budget-pressure summarization are approved; numeric caps and detailed schemas remain pending. |
| C02-D6 | **APPROVED — 2026-10-18** | Option A: hybrid history using recent messages, source-linked historical summaries, and separately tracked important decisions with explicit user-approval provenance; numeric thresholds and schemas remain open; D7 provenance and D8 budget-pressure trigger are approved. |
| C02-D7 | **APPROVED — 2026-10-18** | Option A: Python/LLM proposes source-linked summaries and decision candidates; Electron Main verifies source identity/revisions, persists derived records in SQLite, and marks a decision user-approved only with attributable explicit user confirmation. Model suggestions are never authorization. |
| C02-D8 | **APPROVED — 2026-10-18** | Option A: trigger source-scoped summarization when selected-model context budget is under pressure rather than after a fixed count/time; reserve the current message and response/safety capacity, preserve source messages and provenance; numeric quotas and thresholds remain open. |
| C02-D9 | **APPROVED — 2026-10-18** | Option A: user-selected, validated supported discussion model per request through Electron Main to Python/ModelGateway; no silent model/provider fallback, with coding-agent model routing kept independent and errors surfaced explicitly. |
| C02-D10 | **APPROVED — 2026-10-18** | Option A: allow discussion-only, bounded read-only awareness of the authorized project under separately designed deterministic workspace, file-sensitivity and no-execution guards. Does not grant direct file access yet. |
| C02-D11 | **APPROVED — 2026-10-18** | Option A: Electron Main is the sole broker/enforcer of discussion-only project reads; Python requests evidence and consumes vetted excerpts without direct filesystem or shell authority. Deny on uncertain scope or failed policy checks; exact file allowances/limits remain open. |
| C02-D12 | **APPROVED — 2026-10-18** | Option B: broadly eligible ordinary text files for comprehensive project inspection, overriding extension-only allowlists; Electron Main broker enforces workspace boundaries, sensitive denials, safe content and bounded forwarding. No automatic repository dump or guaranteed secret detection. |
| C02-D13 | **APPROVED — 2026-10-18** | Option A: staged structural discovery and relevant on-demand bounded read-only evidence via Electron Main broker; report actual coverage and gaps, never treat a directory inventory as exhaustive analysis; no eager bulk LLM ingestion or execution. |
| C02-D14 | **APPROVED — 2026-10-18** | Option A: lightweight live stage/status and grounded coverage counters during read-only staged inspection; final report distinguishes inventoried, excerpt-inspected, excluded, stale and unexamined areas; no fictitious percentages or unsupported full-coverage claims. |
| C02-D15 | **APPROVED — 2026-10-18** | Option A: Electron Main requires explicit, revocable disclosure consent scoped to canonical project/workspace and verified effective external provider before transmitting permitted project excerpts or exposing source-derived content. Local reading is separate; consent cannot bypass restricted-file, secret-denial or resource policies. |
| C02-D16 | **APPROVED — 2026-10-18** | Option A: Electron Main file broker enforces layered path/name checks, bounded content screening, and conservative denial or reliably bounded redaction before disclosure. No bypass by Python, LLM or provider consent; fail closed on unsafe/uncertain content. Scanner limits and detailed implementation remain pending. |
| C02-D17 | **APPROVED — 2026-10-19** | Option A: adaptive, staged project inspection with deterministic hard limits per file/excerpt, batch, aggregate inspection request and relevant time/memory/concurrency resources; maintain honest partial coverage and stop at limits. Numeric ceilings/implementation remain open. |

**Freeze status:** **FROZEN v1.0 — ARCHITECTURE ONLY**, explicitly owner-approved on 2026-10-19 after FFR-01-C01. All C02-D1–D17 selections are retained unchanged. FFR-R01 remains **DEFERRED BY OWNER** with residual risk (the universal outbound LLM gate is not an approved C-02 requirement); this does not waive the existing C02-D15 project/provider external-disclosure consent or C02-D16 broker sensitivity safeguards. FFR-R02 and FFR-R03 are **APPROVED architectural clarifications**, **NOT IMPLEMENTED / NOT SECURITY-VERIFIED**. Detailed bridge/broker/provider/SQLite contracts, numeric budgets, security verification and explicit implementation permission remain mandatory before coding. This freeze is not approval to commit, push, merge or deploy code.


## 21. Final architecture freeze traceability (2026-10-19)

This matrix is a **cross-check**, not an amendment or replacement for the detailed normative decisions in Sections 2–18. The original owner-approved option for each decision is preserved and appears both in its own section and in Section 20.

| Decision | Frozen selection | Required architectural commitment |
|---|---|---|
| C02-D1 | **Option A** | Python Discussion Service, separate from AgentOS |
| C02-D2 | **Option C** | Hybrid single-composer discussion; explicit Run Task |
| C02-D3 | **Option A** | Python LLM-assisted advisory intent recognition |
| C02-D4 | **Option A** | Electron Main one-use proposal ID, exact goal and workspace authorization |
| C02-D5 | **Option A** | SQLite/Electron Main authoritative conversation history |
| C02-D6 | **Option A** | Hybrid memory: recent messages, summaries, important decisions |
| C02-D7 | **Option A** | LLM proposed summaries/decisions; source-verified approvals in SQLite |
| C02-D8 | **Option A** | Summarization triggered by model context-budget pressure |
| C02-D9 | **Option A** | Per-request supported user-selected discussion model; independent coding routes |
| C02-D10 | **Option A** | Bounded read-only project awareness in discussion |
| C02-D11 | **Option A** | Electron Main-only file broker; Python sees approved evidence |
| C02-D12 | **Option B** | Broad text eligibility with sensitive exclusions (not extension allowlist) |
| C02-D13 | **Option A** | Staged progressive inspection and evidence-led analysis |
| C02-D14 | **Option A** | Truthful live scan progress and final coverage report |
| C02-D15 | **Option A** | Explicit, revocable project/provider-scoped external source disclosure consent |
| C02-D16 | **Option A** | Layered path/name + content sensitivity checks and deny/redact |
| C02-D17 | **Option A** | Adaptive file/batch/request/time budgets with finite hard ceilings |

### FFR-01 owner disposition traceability

| Finding | Frozen treatment |
|---|---|
| **FFR-R01** | **DEFERRED BY OWNER**, explicitly not resolved: universal all-path LLM egress gate postponed until running-app assessment; C02-D15/D16 original scoped controls **still required**. |
| **FFR-R02** | **APPROVED**: explicit, attributable user approval bound to a specific persisted decision and revision; no extra modal needed for an unambiguous single approval; not execution authorization. |
| **FFR-R03** | **APPROVED — Option A**: application-level separation with broker-only discussion reads; **no Windows OS sandbox** claimed. |

### Freeze limits and explicit non-authorizations

- **Design freeze, not code acceptance**: no Antigravity/C-02 implementation or test execution is authorized by this document.
- The next, separately reviewed integration contracts must define JSONL transport and request identity, database/decision/proposal schemas and transactions, provider/model routing, read-broker mechanics, security/consent checks, real resource/token ceilings, live coverage events, errors/cancellation/concurrency, and deterministic acceptance tests.
- Existing C-01 `ConversationContext` bounds are **not** discussion-mode context budgets. No numeric D8/D17 production budgets were approved here.
- Python process rights on Windows are **not** constrained by this architecture alone. Discussion-only guarantees require implemented capability separation and verification.
- FFR-R01 deferral does **not** remove C02-D15/D16. Real external-model data flows and remaining privacy risks must be revisited before wider release.
- The historical review documents and draft archives retain their historical statuses; this **v1.0 contract** is the frozen source for C-02 architecture.
