# P9-R03 - ratification and final Windows acceptance preparation

Completed2026-11-11 for **P9-R03 OWNER REVIEW**. Full P9 is **not ready for
acceptance**. Remaining evidence: authorized Windows QA native security and two
real session-end trials, plus unsigned human review.

Started on verified local/remote27fee8408065b34ae7a8b798b06daa5636ddff98,
feature/p9-windows-integrated-acceptance. Engine local/remote stayed clean and
read-only99e00e13f8a39fa6730f3d3de773ac937b5ac915; both main refs unchanged.
Allowed envelope: additive authority/evidence, nonfrozen verifier and narrow
acceptance fixtures only. No product-feature work or dependency installation.

1. **CP-002 ratified prospectively.** New NCD-V1 v1.0 normative addendum and
   owner record, separately SHA256-pinned and chained to preserved P8 manifest.
  20 normative files:18 originals+IIS-02-C02+NCD-V1. All original engineering,
   CP-002 draft and historical P9/R01/R02 bytes preserved. Checksums identify
   adopted bytes, not a fabricated owner signature or lost historical custody.
   Nonfrozen verify_delivery.py checks this exact additive inventory.
2. **P2 exception accepted.** P2-EXCEPTION.md records missing secondary diagnostic,
   original/current hashes, primary retained evidence and reproduction limit.
   I08-T87 remains INCONCLUSIVE for full retention proof; no retroactive PASS,
   reconstruction or G6/P0/P1 waiver.
3. **Five capability variants deferred:** I06-T03/T04/T32, I07-T42, E2E-05 retain
   original IDs/requirements/history. Enumerated positive variants stay NOT_RUN
   with DEFERRED_OUT_OF_V1_BY_APPROVED_NCD_V1. Mandatory safety has separately
   cited passing evidence. Native containment is never exempted.
4. **Actual R03 executions:60 PASS/0 final FAIL/3 NOT_RUN.**21 unit/UI/native
   passes, one Windows Electron/Main/Python/original Gateway journey,38 offline
   Python passes. Two original link setup attempts return1314; native volume
   branch is guarded NOT_RUN without QA authorization. New App test explicitly
   denies unknown model availability. Joined Windows journey proves multi-turn
   memory, denied read, exact grant and captured handoff, revoke denial, actual
   captured HTTP401 without retry, conservative unknown, destroyed source pipe,
   zero implicit task admissions. Captured HTTP is not external-arrival proof.
5. **Cumulative Desktop554 PASS/0 current FAIL/6 NOT_RUN** includes inherited
   evidence; Engine69 PASS/3 paid NOT_RUN carried, not newly rerun. New cases:
  2 PASS/1 NOT_RUN. Earlier R03 failures retained: unused import failed initial
   TypeScript build, fixed; HTTP401 test incorrectly expected failed instead of
   conservative unknown, corrected without product change. Raw failure outcomes
   and trace hashes remain separate from final PASS.
6. **Gates:** G0/G1/G2/G3-V1/G8-dev PASS; G4/G5/G7 INCONCLUSIVE; G6/G9-dev BLOCKED;
   G8-package/E2E-08 NOT_RUN - FUTURE DISTRIBUTION. G3 uses current and hash-checked
   carried execution proof, not scope approval alone. Full304-row matrix keeps
   original clauses and prior verdict columns. I06-T05/T44 have new PASS proof.
7. **G6 closure:** unchanged actual symlink/mount/root/alias/TOCTOU assertions
   must pass in an authorized disposable QA VM. Token/preflight shows missing
   privileges and no supplied verified QA target here; no claim that no VM
   physically exists. No privilege/Developer Mode/global change.
8. **VM session-end tests prepared, NOT_RUN.** WINDOWS-QA.md provides exact
   commands, synthetic volume fixture, debugger checkpoints, pure test-owned
   supervisor attachment leaving dialogs native, independent logoff native
   handle witness and shutdown VM-host witness. Job duplicates must close before
   kill-on-close trial. Recovery/lease/no replay are separate from OS cleanup.
   Native mount and manual attachment QA branches are prepared/typechecked only;
   neither is claimed native QA PASS. No owner host logoff/shutdown.
9. **Human review NOT_SIGNED_OFF.** Short HUMAN-QA.md covers startup, conversation,
   projects/Files, explicit Run Task, Mission Control, quit, errors, keyboard and
   readable text. All human results pending; no visual redesign.
10. **Publication:** exact paths/hashes in CHANGE-MANIFEST.json; actual tested
    source/later receipt SHAs in COMMIT-RECEIPT.md and final response. Normal P9
    branch publication only; no invented self-referential SHA.

Final TypeScript/Electron build and formatting PASS; Python runtime38 PASS and
changed Python AST compatibility PASS. Frozen working/original ZIP PASS; staged
and committed Git blob verification recorded in publication receipt. Product
contracts/electron/bridge/renderer/package files are byte-identical to27fee:
no IPC/JSONL/schema/dependency change. Private raw artifacts stay ignored; safe
summaries published. Git fsck PASS. Unchanged paid-journal hashes, historical
tracked/raw audits and actual commands are in run-manifest.json. Secret/path
scan and exact staged review precede commits. No paid request, credential/budget
change, Engine edit, real-user project, privilege change, main merge or P10.

Reproduce only bounded commands in run-manifest/WINDOWS-QA with **new** run IDs,
pinned dependencies and synthetic fixtures. Never execute historical collectors,
fixed-name diagnostics or test:live. Abort on source/hash/authority drift, secret
disclosure, missing QA authorization or safety failure; retain failed evidence.
Rollback uses an ordinary reviewed inverse commit retaining historical evidence,
never reset/clean/force/delete. **Stop at P9-R03 OWNER REVIEW**.
