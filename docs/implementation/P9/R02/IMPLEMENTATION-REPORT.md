# P9-R02 — implementation and verification

Status: available R02 implementation/verification complete; **full P9 remains
NO-GO, P9-R02 FINAL OWNER REVIEW required**. Owner authorization received
2026-11-10, complete attachment
read. Existing Desktop branch `feature/p9-windows-integrated-acceptance`, local
and remote clean baseline `c49de4af558d72f88e8593e66da4f6d63f889b9e` verified.
Engine clean/read-only, local/remote pinned
`99e00e13f8a39fa6730f3d3de773ac937b5ac915`. No main merge or P10.

Pre-execution envelope: R02 documents and numbered proposed addendum under
`docs/changes/proposed/`; isolated native/Electron/SQLite/offline Gateway tests
and fixtures; narrowly necessary internal Desktop lifecycle corrections, with
affected regression evidence. Existing pinned dependencies, no install planned.
No public IPC/JSONL/table/Engine/frozen change, user data, paid call or global
Windows setting. Preserve prior P9/R01 tracked bytes and raw hashes; never run
their collectors or overwrite their fixed-name diagnostics.

Execute actual AgentOS Offline Gateway app quit (wait, controlled cancellation,
bounded force/unknown risk, recovery/no auto-run); bounded high-rate synthetic
SQLite history alongside real worker activity, navigation/reload/cancel and
resource observations; privilege/native containment attempts; remaining safe
faults and retention review; scoped regression, TS/build/Python/format/frozen/
secret/schema/SQLite integrity checks. Synthetic pressure is not genuine worker
evidence. Existing numeric limits only, no invented SLA or unbounded guarantee.

Stop individual trials on unavailable privilege/provenance mismatch; continue
independent work. Do not enable Developer Mode/admin/global policy. Proposed
DeepSeek scope cannot close frozen conflicts until separately approved. Human
QA requires owner signoff. Success means largest honestly evidenced subset and
an explicit remaining-gate decision, not automatic full P9 acceptance.

Deliver implementation/results/current-baseline matrix, scope proposal, exact
remaining findings/environment requirements, human QA checklist, safe metrics/
screenshots and later actual Git receipt. Review each commit; push ordinary P9
feature commits and stop at P9-R02 FINAL OWNER REVIEW.

## Actual implementation and acceptance answers

1. **Closed:** I08-T71 bounded high-rate history/navigation case and I08-T85
   complete authoritative inventory mapping. Five new executable cases PASS:
   original app quit cooperative/forced, high-rate GUI integration, cleanup
   COMMIT rollback, and queued admission during shutdown. Exact executed unique
   R02 results:129 PASS,2 native setup attempts NOT_RUN. Remaining results are
   explicitly carried, not a fresh all-suite run.
2. **Intentional quit PASS within tested scope.** Original `index.ts`
   before-quit and `application.ts` lifecycle code execute in real Windows
   Electron. A test-only esbuild hook binds the actual fixture-owned supervisor
   into that isolated Main; production source/build has no hook. Native dialog
   choice is automated, not human review or proof of native widget rendering.
   Wait preserves both the task and usable window, including native window Close;
   confirm sends durable cancellation; cooperative
   TaskCancelled plus native stop/workspace proof releases lease. Noncooperating
   AgentOS takes the complete15s graceful window, forced Job empties and all
   held Coding/descendant process handles signal; warning shown and lease stays
   blocked/needs_reconciliation. Reopen checks SQLite integrity, one task and no
   automatic run. Actual OS logoff/system shutdown is NOT_RUN on this host;
   full I08-T75/IIS-03 app-exit coverage therefore remains INCONCLUSIVE.
3. **High-rate PASS for measured configuration.** Separate clearly labeled
   synthetic SQLite history:10,000 seeded rows plus30,000 new rows in33.970s,
   200 rows/batch at configured200ms intervals (~883 new rows/s observed).
   35 navigation cycles,12 Renderer reloads. Actual AgentOS task separately
   emitted10 events,4 worker starts and3 genuine WorkerReports; no synthetic
   rows entered that task ledger. Cancellation at batch77/150 completed while
   writer still active:309.541ms to visible cancelled state,lease0 and durable
   verified_cancelled. Reads40/page, visible timeline<=100, existing unit
   128-hint/400-cache/four-page bounds pass. Main/Renderer point metrics are in
   evidence/high-rate-summary.json; no infinite-run, continuous peak or new SLA
   claim. Synthetic history is SQLite/IPC/UI stress, not Engine JSONL throughput.
4. **G6 still BLOCKED.** Actual file/directory CreateSymbolicLinkW return1314;
   token lacks symlink/volume-management privileges. Six current native
   junction/root identity/alias/held-handle/concurrency regressions PASS. Real
   separate-volume mount proof unavailable; none substituted with strings.
5. **DeepSeek-only does not change verdicts automatically.** CP-002 proposes
   narrow positive-capability variant deferral for I06-T03/T32,I07-T42 and
   E2E-05, retains all wrong-route/class/scope/revocation/security invariants.
   I06-T04's immutable active-route rule remains mandatory. A single provider
   can have multiple models; limiting V1 to the one currently verified advertised
   model is a separate proposed owner decision, not inferred authorization.
6. **Contract conflicts require approval.** The full precise
   [NCD-V1 / CP-002 proposal](../../../changes/proposed/CP-002-NCD-V1-DEEPSEEK-SCOPE.md)
   is PROPOSED/NOT ADOPTED, outside the normative inventory. No frozen text or
   test capability status changed through it. Current tests keep NOT_RUN or
   INCONCLUSIVE with explicit CONTRACT_CONFLICT annotations where applicable.
7. **Owner actions:** approve/revise CP-002 before any freeze/adoption; provide
   one disposable Windows QA VM with symlink/mount capabilities (and controlled
   session-end tests) for remaining native obligations; perform/sign the
   [human checklist](HUMAN-QA.md); disposition the documented P2 retention
   exception. No paid test or budget reset needed for these actions.
8. **Gates:** G0/G1/G2/G8-dev PASS; G3/G4/G5/G7 INCONCLUSIVE;
   G6/G9-dev BLOCKED. G8-package/E2E-08 NOT_RUN — FUTURE DISTRIBUTION.
   The [gate matrix](release-decision.md) gives each remaining condition.
9. **P9 remains NO-GO.** No security requirement/P0/P1 waiver, human signoff or
   full product acceptance inferred from product-scope ratification preparation.
10. **Publication:** actual implementation and later receipt SHAs are recorded
    in COMMIT-RECEIPT.md after commit; no self-referential hash invented here.

## Demonstrated correction and regressions

Initial meaningful quit run02 failed: engine cancellation was committed but
reopen still found a blocked writer lease because Main exited before pending
native workspace verification/T3 cleanup COMMIT. Fix only
`electron/main/discussion/service.ts` and `supervisor/supervisor.ts`: stop new
admissions/queue advancement on app quit, keep stable reference to the owned
child while reconciliation may retire its slot, await existing Main finalization
after actual child stop, and return unverified when reconciliation remains
unresolved. Existing broker30s root-verification bound, native stop windows,
Job/handle evidence and T3 proof requirements remain unchanged. No fixed sleep
added as safety proof, no lease unlocked on process exit alone.

Native window-close run06 then proved that the previous window-all-closed route
destroyed the usable window before the user could choose Wait. A narrow
`electron/main/index.ts` close-event guard now calls the existing Main-owned
quit confirmation before destroying a window with active Coding. Run07 keeps
the task/window usable on Wait, then verifies cancellation and durable recovery.
Three original actual Windows startup/isolation/navigation regressions also PASS.

T3.cleanup fault injection proves actual rollback retains lease and returns
unverified even with native cleanup; queued approved task never starts while
quitting.47 affected P4/real AgentOS regressions,29 existing discussion/ingestion/
replay cases,6 native broker cases,38 Python cases and new tests pass. Final
TypeScript/Electron Build, formatting, original-ZIP/working/Git frozen SHA checks
PASS. SQLite integrity checks actual quit/history databases:ok. Exact identities
and commands in executed-results.json/run-manifest.json.

Counts are unique identities, not summed retries:

| Inventory | R01 baseline | R02 cumulative |
|---|---|---|
| Desktop | 547 PASS /0 FAIL /5 NOT_RUN | **552 PASS /0 FAIL /5 NOT_RUN** |
| Separate Engine suite | 69 PASS /3 paid NOT_RUN | Carried unchanged; no unnecessary full rerun |
| I08 | 80 PASS /4 INCONCLUSIVE /3 BLOCKED /1 NOT_RUN | **82 PASS /3 INCONCLUSIVE /2 BLOCKED /1 NOT_RUN** |
| E2E | 6 PASS /1 INCONCLUSIVE /1 NOT_RUN | Unchanged; scope proposal pending |

All304 normative rows preserve exact original wording/IDs, with R01/current
columns and scope-proposal annotations. I06-T36 retains final no-same-turn-retry
wording. E05/I06/I07 statuses otherwise unchanged.129 newly executed passing
identities include5 new tests;2 actual symlink setup attempts remain NOT_RUN.

Earlier failed runs retained: run01 fixture argument miswiring/type errors;
quit02 demonstrated product fault; first fault test targeted T3 rather than
actual T3.cleanup; high-rate03 test IPC takeover still notified retired boundary
after reload (fixed only test routing). Run04 pressure passed; run05 adds
stronger cancellation-while-writing assertion and verifies unknown warning.
Build02 sandbox config-loader access failed; authorized local build03/final04
passed. No failure silently discarded or reclassified.

## Integrity, retention and operating limits

All historical P9/R01 tracked files match baseline bytes; all R01 raw manifest
hashes match. Old P9 raw audit still has exactly the known one secondary lost
diagnostic, no new mismatch. Both old/observed hashes and impact/owner treatment
are retained in [WINDOWS-AND-RETENTION.md](WINDOWS-AND-RETENTION.md). No recreated
original and no automatic I08-T87 closure. New raw result paths are unique.

No dependency/lockfile, Engine, frozen, public23+3 IPC,5 JSONL actions/types,
9-event enum or22-table schema change. The two supervisor callbacks are internal
Main ownership seams, not IPC. No Engine Change Request needed for this Desktop
bug. No paid requests, secrets read/published or budget mutation; both journal
hashes unchanged. Test tasks use isolated synthetic workspaces/profiles only.

One [actual Windows screenshot](evidence/mission.png) shows the resulting actual
cancelled task/worker history, not a design mockup. Existing colors/layout
unchanged. Human review remains NOT_SIGNED_OFF.

Reproduction: existing local pinned dependencies/Engine; `npm run build`, then
set a fresh `NCD_R02_RUN_ID` and run
`npx playwright test tests/electron/p9r02-acceptance.spec.ts`. Unit commands are
in the run manifest. `python -X utf8 docs/implementation/P9/R02/run-python.py
<fresh-id>` removes credential env variables and captures38 offline Python
results. Never run test:live or historical fixed-name P9/R01 collectors/specs.
Normal app remains `npm run dev` or build then `npm start`; production fixture
hooks/providers are absent. Current paid limits still prevent further calls.

Recovery: preserve isolated WAL/receipts and reopen through existing Main recovery;
unknown TaskOutcome/OS state retains lease, no automatic provider/task retry.
Rollback uses a reviewed inverse commit limited to the three production source
files, preserving tests and evidence; never reset/clean/force/delete user data.
Exact path/byte envelope in
CHANGE-MANIFEST.json excludes itself and the later receipt to avoid self-reference.
Stop at **P9-R02 FINAL OWNER REVIEW**.
