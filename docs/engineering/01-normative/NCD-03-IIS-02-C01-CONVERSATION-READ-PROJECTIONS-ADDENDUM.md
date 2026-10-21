# NEXT CODE DESKTOP — NCD-03 / IIS-02-C01
## Conversation Read Projections — Narrow Owner-Approved Addendum to IIS-02 v1.0

**Status:** OWNER-APPROVED NARROW ADDENDUM — DOCUMENTARY DESIGN ONLY  
**Date:** 2026-10-20  
**Owner decision:** Approved the consolidated IIS-06 FFR-01 remediation package: extend the **existing** `ConversationViewPage` projection only, to close FFR06-R01 and FFR06-R02.  
**Authority:** IIS-02 **FROZEN v1.0** remains frozen except for this explicit, narrow, additive DTO amendment. IIS-04 **FROZEN v1.0** remains Main's data authority.  
**Implementation authorization:** NONE. No code, UI, database migration, wire action, runtime test, engine edit, commit or deployment approved.

## 1. Change boundary and precedence

This addendum is an **exception limited to the return DTO** of the already-frozen `conversations.read(conversationId,cursor?,limit?) → ConversationViewPage`. It neither edits the original IIS-02 file nor replaces its other DTOs, error registry, authorization rules or IPC channel mappings. It adds **zero** public Promise methods, **zero** typed subscriptions, **zero** IPC channels and **zero** Python JSONL commands. The IIS-02 public surface remains **23 Promise methods / 3 subscriptions**. No React-to-SQL, direct provider, or coding execution authority is granted.

All existing `ConversationViewPage` fields and behavior remain valid. The following two fields are **required on successful v1 reads** with the exact types below; downstream use must validate the addendum as part of IIS-02 rather than inferring values from assistant prose or from task events.

## 2. Additional safe DTO fields (normative TypeScript shapes; no executable source code)

```typescript
type ProposalReadV1 = {
  proposalId: string;         // Main-issued opaque ID; never extracted from model text
  projectId: string;          // authoritative project, must equal conversation's project
  conversationId: string;     // must equal the requested conversation
  exactGoal: string;          // the validated immutable goal as persisted in IIS-04
  issuedAt: string;           // offset-bearing ISO-8601
  expiresAt: string;          // offset-bearing ISO-8601
  state: 'available';         // only currently available, unexpired proposals are projected
};

type DiscussionTurnReadV1 = {
  userMessageId: string;      // an actual user message within the returned message page
  modelId: string;            // authoritative persisted model choice
  status: 'pending' | 'issued' | 'answered' | 'failed' | 'unknown';
  lastErrorCode: UiErrorCode | null; // Main-sanitized translation, not provider message
  lastAttempt: null | {
    attemptId: string;        // Main-issued opaque, not a permission or public retry handle
    modelId: string;
    status: 'issued' | 'completed' | 'failed' | 'unknown';
    issuedAt: string;         // offset-bearing ISO-8601
    finishedAt: string | null;
    isRetry: boolean;         // grounded solely in retry_of_attempt_id
  };
};

// Required additions inside existing ConversationViewPage:
// availableProposals: ProposalReadV1[];
// availableProposalsTruncated: boolean;
// discussionTurns: DiscussionTurnReadV1[];
```

The TypeScript block is a *normative interface description*, **not implementation permission or an emitted executable source file**. Existing closed `UiErrorCode` values and the frozen 40-default/100-maximum list bounds remain authoritative.

## 3. Main-owned selection, scope, ordering and completeness

1. **Authorization:** Main revalidates renderer origin, selected registered project, requested conversation and its canonical workspace. Never return a foreign conversation's proposal, user turn or provider metadata. Renderer IDs are filters, not proof of authorization. Unknown/mismatched IDs use the already-frozen typed errors.
2. **Available proposals:** derive only from authoritative IIS-04 `task_proposals` rows where `conversation_id` matches, `project_id` matches the verified conversation project, canonical workspace matches its current registered identity, `state='available'`, `consumed_task_id IS NULL`, and **`expires_at` has not passed** on Main's check. Never return model-chosen IDs. Return at most **40** latest eligible proposals ordered deterministically by `issued_at DESC, proposal_id DESC`; set `availableProposalsTruncated=true` if an additional qualifying row exists. The array is allowed to be empty. The existing message `cursor`/`limit` is **not repurposed** into a proposal query; the truncated flag is not a new access/pagination channel and does not claim all older proposals are visible. UI cannot call Run Task for an undisplayed ID. If this cap proves insufficient, future interface review is required rather than unbounded enumeration.
3. **No stale Run authority:** availability is a **read-time hint**, not a reservation. Even if a card showed `available`, `proposals.confirmRun` must independently repeat IIS-04 T2's authoritative scope, TTL, consumed-once, capacity and lease checks in a transaction. UI must disable expired cards using the displayed expiry while still accepting server-side rejection as decisive. A re-read after conversation hints restores the current truth.
4. **Turn statuses:** `discussionTurns` contains at most one record for **each actual persisted user message present in the returned message page** that has a trusted `discussion_turns` row. Resolve by exact Main-verified message ID and same conversation, not by text proximity. Sorting matches returned user messages' durable message ordinal. No associated DB record means **omit** rather than fabricate a status; no attempt record means `lastAttempt:null`.
5. **Latest attempt:** choose only a lineage-consistent, same-turn attempt supported by IIS-04 `discussion_attempts` and correlated persisted turn state. If the attempt lineage is ambiguous, conflicting, not safely orderable or lacks verifiable state, return the conservative `unknown` view or `lastAttempt:null` while preserving the turn's grounded status. Do not infer attempt completion from a spinning UI indicator, timeout, local timestamp or missing Python process. `isRetry` is true only where a verified `retry_of_attempt_id` exists.
6. **Status/error projection:** `status` is the persisted `discussion_turns.status`; map `discussion_turns.last_error_code` to the *existing* closed UI error enum only when a safe mapping is grounded, otherwise use null. A failed or unknown turn is never represented as `answered` merely because an assistant bubble is missing or because a past request was issued. Do not expose raw provider errors, billing details, credentials, prompts or internal process handles.
7. **Snapshot/race semantics:** SQLite read yields a consistent Main-owned snapshot, but the process/model can change immediately after that read. The existing `subscribeConversation` produces only a hint to re-read, not authoritative optimistic state, and never launches a retry. On database unavailability use the frozen typed error instead of filling synthetic DTO fields.

## 4. Exclusions and residual limitations

- `availableProposalsTruncated` protects the bounded v1 UI; there is no claim the conversation read can enumerate every historical or expired proposal. Only currently shown, freshly validated available IDs may be passed to the existing `proposals.confirmRun` on an explicit user click.
- This DTO **does not create a user-triggered same-turn retry IPC method**. IIS-02's 23-method closed API has no such public operation. Therefore v1 must not render a working "retry this exact persisted turn" control or simulate it using `conversations.sendMessage`. A user may send a **new** message by the existing method. True same-turn retry requires separately approved explicit interface authority in the future; the existing `discussion_attempts` table remains provenance-capable and does not by itself create an invocation permission.
- No per-token streaming, extra Python event subtype, separate SQL table, model provider security guarantee or user-decision candidate store is introduced.

## 5. Required acceptance evidence — NOT EXECUTED

- One valid Main-minted proposal survives Renderer reload and appears in `ConversationViewPage`; a model-text ID and cross-project proposal never appear.
- An expired/consumed proposal disappears after re-read; a race between display and click is rejected by T2 rather than executing it.
- >40 eligible proposals yields `availableProposalsTruncated=true`, never an unbounded list or a false claim of completeness.
- A persisted user turn's `pending|issued|answered|failed|unknown` status and actual latest attempt evidence survive restart; no unseen attempt is guessed.
- Page cursor/limit restrict turn projections consistently, and status sources match the returned user message IDs only.
- IPC shape/size bounds, idempotency of `conversations.sendMessage`, all 23 public methods and three subscriptions remain unchanged.
- No same-turn manual retry control is treated as functioning absent separate authorization.

**Freeze effect:** This document is the owner-approved, narrow IIS-02-C01 addendum. The original IIS-02 v1.0 is **not reopened wholesale**. No executable acceptance has been demonstrated.
