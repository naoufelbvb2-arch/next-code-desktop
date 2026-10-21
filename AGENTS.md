# Next Code Desktop — persistent implementation instructions

## Current authority

The owner's 2026-10-21 MASTER IMPLEMENTATION HANDOFF authorizes **documentation
bootstrap, a short local preflight, and preparation of a P1 scope packet only**.
It explicitly authorizes the first documentary commit/push to an empty official
Desktop remote. This later scoped instruction overrides the older read-only
startup restrictions in the preserved handoff guidance for these operations only.
**P1 coding is not authorized.** Stop at the P1 gate and request the owner's
explicit approval after presenting concrete results and the proposed scope.
Do not infer stage approval from documentation freeze, passing checks, or a plan.

## References and precedence

Keep the complete delivered bytes in `docs/engineering/`:

1. `01-normative/`: 18 frozen specifications and approved narrow addenda.
2. NCD-04 FROZEN v1.0 controls stage order, dependencies and acceptance gates.
3. `02-authority-records/`: freeze, reissue and owner-ratification records.
4. `03-status-and-audit/`: historical evidence, interpreted with later decisions.

`SHA256-DELIVERY-MANIFEST.json` authenticates 41 delivered files; it does not
authenticate itself or prove historical custody. Preserve the delivery README
and START guidance as historical handoff material, not a new grant of authority.
Use the owner-approved IIS-03 **v1.0 REISSUE**, never the earlier draft. N04-H01
is **CLOSED by prospective owner adoption** of the approved reproductions;
retain the original-custody caveat without reopening the closed finding.
P0-H02, P0 exit and executable IIS-08 gates require their own actual evidence
and owner disposition; documentary verification alone does not accept P0.

Do not edit imported engineering documents, normalize their line endings, or
replace them with summaries. Verify working-tree and Git blob SHA-256 against
the delivery manifest after importing and before publishing. A true contract
conflict requires a separate numbered DRAFT `CHANGE-PROPOSAL` in
`docs/changes/proposed/`, identifying source paragraphs, impact, proposed narrow
correction and tests. Wait for owner approval before adopting a normative change.

## Product and trust boundaries

Dedicated local Windows app for the existing Next Code engine only: Electron
Main, restricted context-isolated sandboxed Preload, React/TypeScript Renderer,
Main-owned SQLite, and a thin Python bridge over private stdio JSONL.
Keep the closed **23 Promise methods, 3 subscriptions, 5 request actions,
5 outer JSONL message types and 22 SQLite tables**. No new public surface or
schema without an explicit architectural decision. No generic plugin/agent host,
localhost bridge server, functional PTY, or distribution work by implication.

The original `naoufelbvb2-arch/next-code` repository is read-only. Do not copy,
vendor, submodule, refactor, or modify it without separate specific approval.
Inspect real APIs before integration; do not assume JSONL, worker events,
cooperative cancellation or provider retries already satisfy Desktop contracts.
Never start the engine or contact a model provider during bootstrap.

Navigation and Dock state do not own task lifetime. No fake worker activity,
invented progress, synthetic task success, or test fixtures in production ledgers.
Future coding dispatch requires the application's explicit approved Run Task flow.
Unavailable operations stay disabled or fail closed with an honest explanation.
Renderer must not gain raw Node, filesystem, SQL, process or arbitrary IPC access.

## Stage workflow and evidence

Follow P1 through P9 in NCD-04 order. P10 packaging/bundled Python is deferred.
Before each stage, present its repo/branch/starting SHA, allowed file envelopes,
dependencies, operations, tests, success/abort criteria and evidence deliverables.
Obtain explicit owner stage authorization; obtain separate acceptance/transition
and merge authorization. Use `feature/p#-...` branches after bootstrap.

Maintain `docs/implementation/P#/` with scope and contract references, exact file
manifest, decisions, dependency changes, commands and actual results, problems,
deviations, permission accounting, safe rollback/recovery and commit provenance.
Record final SHAs in a later receipt or the final response; never invent a
self-referential commit hash. Stage-subset PASS is not a full gate PASS.
Distinguish fixture, Desktop, actual engine, real Windows and packaged evidence.
Unrun checks are `NOT_RUN` or `NOT_VERIFIED`, never PASS; report failures plainly.

## Git and publication

Official origin: `https://github.com/naoufelbvb2-arch/next-code-desktop.git`.
Check local history, origin and remote state before initialization. Unexpected
history, a different remote or unexplained changes require clarification; never
overwrite them. Initial `main` creation is authorized only for the verified empty
remote's documentary bootstrap. Subsequent work uses a separate branch; do not
merge or push further changes to `main` without owner merge authorization.
Never use `git reset --hard`, `git clean`, force push or destructive cleanup.
Retain the original ZIP locally and keep it out of Git. Review the exact staged
paths and bytes for public release; never bulk-stage unrelated user data.

Do not read or publish secrets, credentials, private files, personal machine paths
or raw environment dumps. Use sanitized evidence and synthetic fixtures. No paid
provider calls, project-source disclosure, administrator changes or broad system
changes without their separately scoped authority. Prefer pinned local packages
and a lockfile when a code stage authorizes installation.
