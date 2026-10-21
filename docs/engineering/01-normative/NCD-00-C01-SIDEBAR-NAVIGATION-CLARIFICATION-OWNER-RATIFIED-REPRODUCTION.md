# NCD-00-C01 — Sidebar Navigation Clarification (Controlled Addendum)

> **Parent baseline:** `NCD-00-PROJECT-SCOPE.md`, **FROZEN — Scope Baseline v1.0** (2026-10-18)  
> **Addendum ID:** NCD-00-C01  
> **Status:** OWNER-APPROVED CLARIFICATION (owner explicitly accepted FFR-01 R-01 correction on 2026-10-18)  
> **Scope:** Exactly one narrow clarification to NCD-00 §5.1 **FR-02** (`Sidebar` navigation).  
> **No execution authority:** This document is not authorization to modify software repositories or implement UI.

## 1. Reason for the clarification

NCD-00 v1.0 §5.1 FR-02 includes a generic `Chat` entry in the Sidebar. During the owner's subsequent UI design decisions, this entry was deliberately replaced by a primary **New Conversation** action (NCD-01 D-UI-07). The Chat experience is **not** removed. The original frozen scope document is preserved unchanged.

## 2. Narrow controlled interpretation of FR-02

Read the `Chat` entry mentioned in NCD-00 v1.0 §5.1 FR-02 as the **Chat destination/functionality**, accessible through:

1. **New Conversation** — primary Sidebar action; opens an unsent conversation draft/Chat screen without discarding other history or cancelling a running task.
2. **Recent Conversations** — selecting an existing conversation reopens its Chat view and linked history/task state; must not relaunch the task.

`Projects`, `Agents` (independent page), `Settings`, Sidebar show/hide, and the rest of FR-02 continue unchanged. **No additional persistent generic `Chat` button is required.**

## 3. Scope and precedence

- This addendum supersedes **only the Sidebar label/navigation wording** of NCD-00 §5.1 FR-02 that otherwise contradicts NCD-01 D-UI-07.
- All other requirements, acceptance criteria, D-01–D-05 decisions, and NCD-00 v1.0 freeze status remain fully intact.
- If a future document appears to conflict with any other part of NCD-00, a **new owner-approved change** is required; do not generalize this addendum to other features.
- Keep `NCD-00-PROJECT-SCOPE.md` byte-for-byte unchanged for traceability; distribute this addendum beside it.

## 4. Acceptance conditions

- Sidebar primary action reads **New Conversation**, not generic `Chat`.
- A user can still reach an existing Chat from Recent Conversations.
- Creating or entering either Chat view does not silently cancel, restart, or duplicate a running task.
- New blank conversation drafts do not create persisted empty conversations solely by clicking the action.

## 5. Change authorization and record

The owner explicitly accepted the three corrective actions **R-01 / R-02 / R-03** of `NCD-01-FFR-01-REVIEW.md`. This file records **R-01** without retroactively modifying the frozen NCD-00 baseline. Owner acceptance of that correction does **not** mean NCD-01 is fully frozen or that implementation is authorized.
