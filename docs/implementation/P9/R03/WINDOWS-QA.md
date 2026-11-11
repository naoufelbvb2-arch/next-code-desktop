# Remaining Windows evidence — operator procedure, NOT_RUN

Prepared 2026-11-11. No authorized QA VM target was supplied or verified. The
read-only preflight found no Get-VM/VBoxManage/vmrun command on this session's
PATH; this does not establish that no VM exists. Current token is not elevated;
SeCreateSymbolicLinkPrivilege and SeManageVolumePrivilege are absent. Both fresh
original CreateSymbolicLinkW attempts returned1314. No Windows setting changed.

## 1. One disposable QA environment

Owner/operator must explicitly identify and authorize a disposable Windows VM,
with a snapshot, synthetic data only, pinned Desktop/Engine sources and existing
locked dependencies. Provision symlink capability and a second disposable NTFS
volume **inside that VM**. Enabling Developer Mode is not a substitute for the
volume fixture. This procedure grants no elevation or provisioning on the owner
host; the operator chooses and authorizes VM provisioning separately.

Use a fresh checkout of the published P9-R03 commit plus read-only Engine99e00e1.
Do not copy credentials or paid journals to the VM. All commands below run from
the checkout root. Choose a never-used run ID, retain raw JSON and console output
and hash them before another run. Stop on failure; retain the failed evidence.

## 2. Original native tests and prepared mount test

```powershell
$env:NCD_P9_RUN_ID='r03-vm-security-01'
$env:NCD_R01_RUN_ID='r03-vm-security-01'
$env:NCD_R03_RUN_ID='r03-vm-security-01'
npx vitest run tests/unit/broker-windows.test.ts tests/unit/p9r01-windows.test.ts --reporter=json --outputFile=.cache/p9r03-vm-security-01.json
```

Required original assertions: P6-W04 real junction, W05 replaced registered root,
W07 outside-root junction/hard-link, W09 concurrent writer/ancestor replacement,
W10 native symlink, W11 case/short alias, W12 borrowed native handle lifetime;
R01-W02 must actually create **both file and directory** symlinks and deny their
capture. A skipped privilege case is not PASS. Preserve remaining original
assertions too; do not change expected errors or weaken native checks.

For the distinct mount trial, operator creates only these synthetic objects:

- `.test-profiles/p9r03-vm-security/authorization.txt`: exact line
  `OWNER AUTHORIZED DISPOSABLE WINDOWS QA VM`.
- Empty mount directory `.test-profiles/p9r03-vm-security/project/volume-alias`.
- A separate disposable NTFS volume, mounted at that directory using Windows
  Disk Management or `mountvol <absolute-empty-mount-directory> <disposable-volume-GUID-path>`.
  Determine/verify the disposable volume in the VM console first; never paste
  an unverified GUID or use a real-user volume. No script here attaches/formats
  volumes or alters permissions.
- On that mounted volume, `r03-canary.custom` containing exactly
  `R03 SYNTHETIC VOLUME CANARY` followed by LF.

```powershell
$env:NCD_R03_AUTHORIZED_QA_VM='disposable-volume-fixture'
npx vitest run tests/unit/p9r03-mount.test.ts --reporter=json --outputFile=.cache/p9r03-vm-mount-01.json
Get-FileHash .cache/p9r03-vm-security-01.json,.cache/p9r03-vm-mount-01.json -Algorithm SHA256
```

R03-W01 opens the actual reparse point, checks native mount tag **and volume
substitute target** (ordinary junction has the same tag), then requires the
production WindowsTree to refuse the mounted descendant with zero broker bytes.
This assertion does not replace root registration/identity/alias/TOCTOU tests.
On this host only its explicit missing-authorization guard ran: **NOT_RUN**.
Native mount branch is prepared and typechecked, not claimed validated.

API basis: [CreateSymbolicLinkW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-createsymboliclinkw),
[SetVolumeMountPointW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-setvolumemountpointw),
[REPARSE_DATA_BUFFER](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_reparse_data_buffer).

## 3. Actual logoff and system shutdown — two separate manual trials

**Never run either action on the owner host.** These are prepared manual/debugger
procedures, not completed automated trials. Use a new synthetic fixture/profile
for each action. The existing R02 intentional-quit result is not session-end proof.

1. In the authorized VM set `NCD_R02_RUN_ID=r03-vm-logoff-01` (then a different
   `r03-vm-shutdown-01`). Build with `npm run build`. Run the existing isolated
   fixture in a source-level Node debugger (for example an already configured
   VS Code JavaScript Debug Terminal with worker-child auto-attach):
   `npx playwright test tests/electron/p9r02-acceptance.spec.ts --debug --grep R02-Q-stubborn`.
   Set a source breakpoint **before** `const handles = await call(...)` in that
   test, after the poll has proved two descendants. Playwright Inspector alone
   cannot evaluate these Node-frame locals; attach to the actual test worker.
   Do not continue the ordinary
   scripted quit assertions. Debug mode disables ordinary test timeouts.
2. At this stopped Node test frame, evaluate these expressions in the debugger
   console, preserving results in the VM's ignored private checkpoint only:
   `await call(current.app, 'attachSessionQa')`;
   `await call(current.app, 'actualCodingSnapshot')`;
   `await call(current.app, 'ownedHandles')`;
   `await call(current.app, 'actualR01Metrics')`.
   The new **test-only** attachment binds the actual supervisor to the original
   application quit handlers and leaves native dialogs unchanged. Confirm one
   actual running task, genuine task.started, held writer lease, Coding plus two
   descendants. Save `location`, `current.profile`, task/event IDs and the above
   snapshots to a new ignored `.cache/p9r03-vm-<action>-checkpoint.json` using the
   debugger's imported `writeFileSync`. Raw process IDs/paths remain private.
3. From an independent, already authorized VM observer context record actual
   Coding/descendant creation identities and native Job membership/limits. A
   brief QueryInformationJobObject check must show kill-on-close enabled and no
   breakaway; **close any duplicate Job handle before the session-end action**.
   Retaining it extends the last-handle lifetime and invalidates kill-on-close
   proof. For logoff, an observer in a different retained logon session holds
   process handles (not Job handles), checks GetProcessTimes identities, then
   records their WaitForSingleObject signaled states after the owner's VM logoff.
   If this observer context is unavailable, cleanup evidence remains NOT_RUN.
4. Only the operator triggers **Sign out** or **Shut down** through the VM's
   Windows UI. Record which action, whether dialogs delay/cancel it, operator
   choices and independent completion. If Sign out is canceled/delayed, that is
   not a completed session-end trial. Do not replace it with app.quit, process
   termination or a synthetic event. Never invoke host shutdown/logoff commands.
5. Shutdown requires an independent **VM-host** witness that this VM actually
   powered off and a changed guest boot identity on restart. In-guest handles
   cannot survive reboot; old PID absence alone is not cleanup proof. Keep
   pre-shutdown Job/ownership evidence and external power-state witness separate
   from post-reboot SQLite evidence; mark any unobserved cleanup clause unknown.
6. After VM sign-in/restart, start a fresh debug instance of the same fixture,
   stopping **before** `startActualCodingFixture` (do not create another task).
   Load the saved `location` from the ignored checkpoint and evaluate
   `await call(current.app, 'recoverActualCodingFixture', [{ directory: saved.directory, workspace: saved.workspace }])`.
   Inspect the same task/event identities, no new admission/automatic dispatch,
   `status.active === null`, and read-only `PRAGMA integrity_check` = `ok` on
   `<saved.directory>/state.sqlite3`. No invented task.cancelled/completed event.
7. Without verified terminal/cleanup reconciliation require retained writer
   lease and `needs_reconciliation`. If cancellation truly completed before
   session end, require its persisted terminal **and native cleanup** proof before
   accepting lease release. Recovery PASS alone never proves OS cleanup.

The debugger workflow uses existing isolated real AgentOS/Offline Gateway, not
production credentials or a real-user project. The R03 manual attachment and
mount branch remain **NOT_RUN in their QA environment**. Preserve private raw
checkpoint/WAL/DB and external witness before teardown; publish only sanitized
assertions and hashes, never paths, PIDs, file contents or keys. Operator may
restore the disposable VM snapshot after evidence retention.

Job API basis: [Job objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)
and [Job limit flags](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_basic_limit_information).

## 4. Closure conditions

G6 needs actual passing symlink/mount/identity/alias/TOCTOU evidence with no
mandatory skips; G4/G7 need actual completed session-end, native cleanup,
conservative lease/recovery and no replay. Failures stay failures. Return the
exact tested Desktop/Engine SHAs, Windows/dependency versions, sanitized results
and raw hashes for affected-gate reassessment, then separate owner acceptance.
