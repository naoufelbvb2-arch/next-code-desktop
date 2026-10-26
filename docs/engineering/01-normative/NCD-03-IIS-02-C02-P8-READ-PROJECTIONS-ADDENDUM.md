# NCD-03 / IIS-02-C02 — P8 Read Projections Addendum

Status: APPROVED / normative, 2026-10-25. Authority: the owner's P8 FINAL
CORRECTIONS, Part C §§10–12, explicitly adopting CP-001. This additive correction
to IIS-02 and IIS-02-C01 changes only two existing read response projections.
All delivered frozen originals retain their exact bytes and authority elsewhere.

## 1. TaskView.exactGoal

`tasks.read` returns the existing strict TaskView plus required
`exactGoal: string`. Main reads the exact admitted value from `tasks.exact_goal`
after checking the current project, canonical workspace and task scope. The
value contains 1–16,384 valid Unicode code points, preserving the original
approved-goal limit. It is never inferred from a title, outcome or model summary.
TaskSummary and tasks.list are unchanged. Invalid or inaccessible rows fail
closed using existing errors; null, truncation and a guessed substitute are not
permitted. Renderer displays it as untrusted plain text with React escaping.

## 2. ConversationViewPage.dockState

`conversations.read` returns the existing strict ConversationViewPage plus
required `dockState: ChatDockStateView | null`. A present record uses exactly
the existing conversationId, visible, primaryTab, terminalSubtab and
explicitlyHidden fields. Its conversationId must match the requested, scoped
conversation. Main reads the existing `conversation_dock_state` row in the same
read snapshot. Null means no persisted row, not a persisted visible/hidden
choice. Reads never create a default, update timestamps, write mutation receipts
or call conversations.saveDockState. Restoration works after Renderer or Main
restart. Explicit user visibility/tab choices take precedence over stale reads;
historical event replay must not open the Dock. The Interactive Shell tab remains
unavailable in P8 even if an older saved record names it.

## 3. Limits, compatibility and authority

These are response-only additions to existing methods. Arguments and channels
remain unchanged: 23 Promise methods, 3 subscriptions, 5 JSONL request actions,
5 outer message types, 9 event names and 22 SQLite tables. There is no database
migration or JSONL change. Main and Preload validate the new closed response
shapes together; consumers require the updated projection. Existing IPC bounded
JSON traversal and the current 16 MiB response transport budget remain in force;
oversized replies fail closed rather than bypassing validation. All existing
cross-project/workspace access checks remain mandatory. Neither field grants
execution, source access, shell access or additional provider authority.

## 4. Required evidence and baseline

Verify exact persisted goal against unrelated title/outcome, valid Unicode
limits, response budget, escaped hostile text, cross-project/task/conversation
rejection, saved hidden/visible/tab restoration, null absence, stale-read
protection, Renderer reload, Main restart and zero writes during reads. Re-run
the existing closed-surface, schema, replay and navigation regressions.

The original delivery remains 42 files, including its manifest of 41 payload
files and 18 normative files. This separately approved addendum is normative
file 19; it is authenticated by SHA256-APPROVED-ADDENDA-MANIFEST.json without
rewriting the original delivery manifest or claiming historical ZIP custody.
