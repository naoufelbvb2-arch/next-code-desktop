# CODEX TASK — P0-H02 READ-ONLY WINDOWS BASELINE AUDIT

You are operating in VS Code on the user's Windows machine. You can inspect the local environment directly. The owner has already authorized read-only P0 source/intake audit, but has **NOT** authorized Desktop P1 implementation or any modification to the original Next Code engine.

READ FIRST: `README-CODEX-HANDOFF.md`, `01-normative/NCD-04-IMPLEMENTATION-AND-VERIFICATION-PLAN-v1.0-FROZEN.md` especially §§4–5.1, and `03-status-and-audit/NCD-04-P0-C01-POST-RATIFICATION-STATUS.md`. Treat all other `01-normative` frozen and addenda documents as authoritative. The approved H01 evidence is complete; do not re-litigate it.

TASK (READ-ONLY):
1. Identify local Windows OS version and architecture; available PowerShell, Python executable/version (Python >=3.11 for existing engine), Node.js/npm, Git, and available package tooling. Capture version strings, NOT secret environment variables.
2. Locate the local Next Code engine checkout if present. Inspect `git rev-parse HEAD`, branch, remote URL (redact user tokens), staged/unstaged/untracked status, and compare local HEAD against the approved remote source baseline `834d0ca62cc9b2c03e530bafe4090024d98f31d3`. Do not run `git pull`, `git checkout`, `git clean`, `git reset` or anything mutating the checkout. Do not disclose untracked filenames or file contents unless specifically authorized.
3. Check whether a `next-code-desktop` local directory/repository exists; distinguish its absence, an empty directory, an initialized repository, and an actual committed implementation. Do not initialize or scaffold.
4. Inspect (without running) the engine public API and extension needs: `AgentOS.execute_task`/`ConversationContext`, LLM gateway's provider route and retry policy, real worker events and cooperative cancellation, process child cleanup, and checkpoint behavior. Note which behavior is *proven from source* and which is not.
5. Verify delivered normative file SHA-256 values using `SHA256-DELIVERY-MANIFEST.json` (don't mistake text projections for original historical byte proofs). Confirm 18 normative files and the ratification record; do not modify them.
6. Produce a concise P0-H02 report **in the response** with `PASS / BLOCKED / NOT_VERIFIED` per item, minimum remediation needed, current source HEAD, and **P0 GO/NO-GO recommendation**. You may produce a report file only if the owner explicitly authorizes writing an audit artifact; otherwise respond in chat.

NEVER: install dependencies, write code, modify files, run pytest or start agents, invoke external LLM APIs or read secrets, initialize repo, commit/push, or start P1. Do not use a generic multi-agent platform design. Preserve the closed 23-method IPC, 3 subscriptions, 5 JSONL request actions and 22-table SQLite baseline.

AFTER REPORT: wait for a separate stage-specific owner authorization for P1 before coding. If blocked by missing checkout or ambiguous path, ask for the smallest necessary path confirmation, rather than guessing.
