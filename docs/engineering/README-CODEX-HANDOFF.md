# NEXT CODE DESKTOP — CODEX ENGINEERING HANDOFF

**Date:** 2026-10-21  
**Status:** Reference-and-audit handoff only. **NOT** source implementation authorization.  
**Authority:** Frozen NCD-04, upstream frozen specifications, narrow approved addenda and later owner-ratified P0 H01 closure.

## Purpose

Deliver the exact identified normative design baseline to Codex inside the user's Windows VS Code environment. Codex should first execute the remaining P0-H02 read-only verification **itself**, rather than asking the user to run a separate PowerShell script.

## Precedence and evidence

- `01-normative/`: 18 operative normative files: nine approved early-contract reproductions including Sidebar, approved C-02-C01 and IIS-02-C01 addenda, IIS-03 v1.0 REISSUE, IIS-04 through IIS-08, and NCD-04 v1.0.
- Earlier 8 reproductions have SHA-256 equal to *historical recorded digests*, but do not claim to be original recovered storage objects; Sidebar NCD-00-C01 has a new independently approved digest.
- IIS-03 original historic file was unavailable; the owner-approved **REISSUE** is authoritative. Never treat old draft as final.
- IIS-02-C01 extends only existing conversation read projection; C-02-C01 defers structured persistence of unapproved candidates in v1.
- `02-authority-records/`: freeze and ratification records. Older `.txt` records may be text-extraction projections and are not certified raw bytes.
- `03-status-and-audit/`: P0 provenance closure and source-inspection notes. Post-ratification C01 supersedes **only** the H01 status line in the initial P0 report. **H01 CLOSED; H02 OPEN.**
- `SHA256-DELIVERY-MANIFEST.json`: exact SHA-256 of bytes shipped *inside this package*, not independent runtime verification.

## Sources and workspaces

- Existing engine GitHub: `naoufelbvb2-arch/next-code`, previously verified `main` SHA `834d0ca62cc9b2c03e530bafe4090024d98f31d3`. **Codex MUST verify local HEAD and remote status again; do not assume local checkout is clean.**
- Desktop GitHub: `naoufelbvb2-arch/next-code-desktop`, observed **empty** at last remote check. The existence of the remote repository does not authorize a first commit or scaffold.
- Host Windows/VS Code local paths must be discovered locally by Codex, not invented.

## Initial Codex operation

Read `START-CODEX-P0-H02.md`. The initial authorized operation is a **read-only P0-H02 audit** and report. No npm/pip install, no running app/agent or tests with side effects, no credential use, no source modification, no Git operation mutating the worktree, no commit/push, and no live API calls. If the audit needs more privileges, stop and request scope approval.

## Stage governance

NCD-04 P0–P9 sequence remains in force. After presenting a P0 evidence report and any proposed remediation, request a separate explicit **P1** authorization. Once P1 is approved, Codex can implement P1 **locally** with stage-scoped tests; every later phase requires separate acceptance and authorization. Changes to the original engine require an even narrower separately approved engine-change request. Optional P10 packaging/distribution remains deferred.

## Do not invent unsupported engine behavior

P0 source review saw `AgentOS.execute_task` and optional validated `ConversationContext`, but did not establish an already-integrated Desktop stdio JSONL server, read-only discussion loop, authenticated Mission Control event source, or cooperative cancel pipeline. Engine's HTTP provider includes internal retry handling; do not claim it already meets the Desktop's no-ambiguous-auto-retry requirements. Record concrete gaps and propose narrowly scoped future integration only.
