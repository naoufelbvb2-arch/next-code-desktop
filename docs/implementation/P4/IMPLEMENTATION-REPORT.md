# P4 implementation report

Status: **READY FOR OWNER REVIEW — process-scoped P4**. Authorization and P3
acceptance: 2026-10-21; final verification: 2026-10-22, America/New_York.
No P5 or main merge. This is not full IIS-08 acceptance or real-engine evidence.

## Authority and provenance

Official origin: `https://github.com/naoufelbvb2-arch/next-code-desktop.git`.
P3 local/remote and clean tree were verified at the accepted
`3da419be3eef270ee72dbc5336258b509dd98a09`. The separate P3 owner-acceptance
record was reviewed, committed and pushed first at
`8c9bc7d4dabe408a0663183690fc00ae3e0e29b9`. P4 branches from that exact commit
on `feature/p4-python-supervisor`. Source/publication SHAs belong in the later
receipt and final response; no self-referential hash is invented here.

IIS-03 REISSUE FROZEN v1.0 and NCD-04 §5.5 control this work, with NCD-02,
C02/C03 and IIS-01/02/02-C01/04/05/08 boundaries. Frozen documents, migration v1
and its checksum, 22 tables, 23 Promise methods, three subscriptions, five wire
types and five actions are unchanged. The original engine remained clean at
`834d0ca62cc9b2c03e530bafe4090024d98f31d3`; only read-only Git metadata was
checked. No engine execution, import, source copy or modification occurred.

## Components and actual behavior

- `electron/main/supervisor/windows-process.ts`: direct Win32 launch and private
  pipe adapter using Koffi. Creates Python suspended, assigns its actual returned
  process handle to a non-inheritable kill-on-close Job, then resumes its thread.
  STARTUPINFOEX restricts inherited handles to stdin/stdout/stderr. Main retains
  handle/creation identity; no PID lookup, shell or taskkill is used in production.
- `runtime.ts`: explicit local interpreter digest, absolute path, Python 3.11+
  isolated version probe, bounded bridge descriptor probe, app-owned bridge hash
  and protocol manifest. Rechecks launch bytes; no PATH fallback or downloads.
  Probe processes use the same contained native launcher, five-second/4-KiB caps.
- `child.ts`: observed lifecycle, fresh per-child session, real READY, P2 parser,
  serializer and connection allowlists; bounded incoming/outgoing queues, pipe
  backpressure, request/partial/pressure deadlines and responsive cancellation.
  Final pipe records drain before correlation is retired on OS exit. EOF/errors
  cannot become task success. Startup cleanup failure remains UNVERIFIED.
- `supervisor.ts`: one Discussion per Main; shared concurrent ensure operation,
  three starts within 60 seconds, 1/2/4-second delays then unavailable. New child
  means new READY and request table. Per-conversation Discussion serialization
  and 16 aggregate requests. No turn resend or provider fallback. Coding is
  disabled unless trusted Main-only integration supplies both launch and proofs.
- `application.ts` and Main entry: optional configured Discussion starts after
  the window opens. Unavailable Python cannot block local UI/storage. Main owns
  bounded shutdown and a native active-task quit warning for later live coding;
  Renderer navigation/reload has no process-lifetime authority.
- `bridge/desktop_bridge.py`: Desktop-owned Python stdlib Discussion-only bridge,
  independent strict inbound validation, duplicate-ID history cap, bounded input
  queue, framing/partial deadline and bounded stdout stall watchdog. Emits exactly
  one READY and returns correlated `PROVIDER_UNAVAILABLE` for a valid discussion
  request. It imports no engine, provider, SQLite or project-file tool. There is
  no production coding implementation masquerading as AgentOS.

Main retains only 64 stderr metadata records (redaction code and chunk byte
count), discarding **all** raw stderr text. No stdout/stderr prose becomes an
event. This deliberately sacrifices traceback detail to avoid retaining secrets
or paths in P4; P5 must preserve equivalent hygiene for provider errors.

The frozen limits remain 262,144 bytes including LF, 15-second partial frame,
30-second READY, 16 general requests, one execute plus reserved cancel, 256
records/8 MiB per queue, 30-second sustained pressure/broker wait and 300-second
Discussion attempt. Resource rejection is explicit; critical events are never
silently discarded and represented as committed. Main native reads are bounded
at 64 KiB and stop under ingress pressure. Cancellation is registered durably
before the fixed wire command; acknowledgement is not stop or task cancellation.
After the full 15-second grace, termination targets only the owned Job.

## SQLite handoff and P3 impact

Two private Store operations were added without a schema change:
`supervisionAdmission` reads the committed starting task, exact consumed proposal,
scope, singleton slot and active lease together before native launch;
`markProcessUncertain` conservatively blocks that task/lease after disconnect.
Both require existing Main-only evidence policy. No transaction spans process
startup. Queued/cancelled/missing/foreign admissions cannot launch; repeated
dispatch cannot spawn a second child. The singleton and 20-queued policy remain
P3 authority; opening UI never schedules or replays coding.

Validated, correctly bound simulator events use existing T4 only in disposable
test databases. Persisted events retain the actual child session. P3 remains
responsible for commit-before-notification. Store failure faults supervision;
uncommitted data never becomes a success hint. OS stop does not release a lease:
the independent Main workspace-safety verifier must also approve existing T3
cleanup. The production P4 supervisor has no coding factory, cleanup verifier,
model authority or synthetic evidence. Its default remains deny.

Only the same four production IPC methods are DB-backed: `app.bootstrap`,
`projects.listRecent`, `preferences.get/update`. Nineteen remain typed unready.
Bootstrap correctly remains `not_ready`: transport READY is not LLM readiness.
P1 session controls and appearance are unchanged; live conversation/model/file/
Run Task UI integration remains in its authorized later phases.

## Windows cleanup evidence

Actual Windows x64 native tests proved suspended launch/assignment and held
creation identity, Job membership of Python plus its fixture child/grandchild,
and zero active Job processes after termination. Windows may also place an
owned `conhost.exe` in the Job; counts cannot assume only Python processes.
A direct Python parent exit was observed while descendants were still alive;
only verified Job cleanup established their cessation.

Actual Electron Main was abruptly terminated using an OS handle whose creation
time matched identity obtained from that isolated Main. Independently held
observation handles proved both child and grandchild exited after Main death.
The next Main opened the **same isolated SQLite ledger**, marked the task and
lease for reconciliation, retained one task/one lease, and had no terminal event,
outcome or automatic simulator restart. This is process-scoped Windows evidence,
not proof of workspace rollback or live AgentOS cleanup.

Closing our own Job handle before querying its final state deliberately removes
verification evidence: supervision returns UNVERIFIED, preserves the lease, and
refuses cleanup even when a separate fixture workspace verifier says safe.
Ordinary `child.kill()` is not used as descendant-stop evidence.

## Runtime configuration

No runtime file is generated in the normal profile automatically. A local owner
may explicitly create `python-runtime.json` under `app.getPath('userData')`:

```json
{
  "pythonPath": "C:\\Python311\\python.exe",
  "pythonSha256": "<64 lowercase hex characters of the explicitly trusted executable>"
}
```

Use the installed executable's actual absolute path and verify its source before
pinning its SHA-256 (PowerShell `Get-FileHash -Algorithm SHA256 -LiteralPath ...`).
The example is a template, not an installed path or an installation instruction.
No credentials belong here. Renderer preferences cannot change this file.
The repository-owned `bridge/compatibility.json` pins the Bridge bytes, protocol,
minimum Python and discussion-no-provider mode. Its engine revision field records
the expected future baseline, **not** a claim of P4 engine integration. Engine
is not required/loaded in this mode; an engine-capable launch needs new phase
authority and real checkout/import/API compatibility verification.

Run UI: `npm ci --cache .cache/npm`, then `npm run dev`; production development
build: `npm run build`, `npm start`. Python is optional for local UI. Installed
Python was selected explicitly for tests; production never takes the first PATH
result. Tests currently pin this workstation's explicit fixture interpreter;
another test host must deliberately adjust that fixture path, not silently fall
back to PATH. Distribution asset copying/bundled Python is not implemented.

## Dependencies and verification

Added pinned local production dependency **koffi 3.3.3** (MIT, Node-API), including
its platform-specific optional prebuild lock entries. Existing package versions
were retained. `package-lock.json` includes integrity hashes. Install used the
workspace npm cache, succeeded, and installed no global/admin/engine packages.
No independent vulnerability audit is claimed by its install output.

Actual environment: Windows x64; host Node 25.9.0, npm 11.12.1, Python 3.14.4;
Electron 45.0.0 with embedded Node 24.22.0 and SQLite 3.53.4. P4 native bindings
were executed inside Electron as well as host Node.

Final commands and actual results:

| Command | Result |
|---|---|
| `npm test -- --reporter=default --reporter=json --outputFile=.cache/p4-unit-results.json` | 257 PASS, 0 FAIL, 0 skipped, 11 files |
| `npm run test:electron` | 20 PASS, 0 FAIL/skipped, actual Windows Electron |
| `npm run build` (includes TypeScript) | PASS |
| `npm run format:check` and Prettier check of bridge manifest | PASS after formatting correction |
| `python -I -S -m py_compile bridge/desktop_bridge.py tests/fixtures/supervisor_peer.py` | PASS |
| P0 delivery verifier, HEAD Git blobs + retained archive | PASS: 42 delivered / 41 payload / 18 normative |

**277 PASS** includes all **232 inherited P1–P3** cases and **45 new P4** cases
(42 unit/process cases, three real Electron cases). Results list individual
sanitized cases. Multiple assertions within a case are not counted as extra
tests. Most deadlines use an advanced monotonic clock attached to **real live
Python children**; graceful cancellation additionally waited the actual full
15 seconds. These controlled-clock checks are not 300 seconds of provider use.
Fixture event source fields follow the frozen schema but remain synthetic.

## Failures found and corrected

Initial process runs had failures for strict proof fixtures that included extra
keys, assumptions excluding Windows' contained console host, and a five-second
test timeout caused by shutdown re-waiting for an already stopped/unverified Job.
These were fixed by exact per-kind proof shapes, observed tree membership and
preserved cleanup-result state. Review also hardened pipe-drain/OS-exit ordering
and constructor cleanup uncertainty. Final process suite passed.

Early Electron crash tests timed out using launcher signals or Node's orderly
exit path while native pipe operations were pending. The final crash case uses
Windows termination of the held **actual Main handle**, verifies creation time,
and waits on both descendants' held handles. It passes in the full suite. One
overlapping failed-harness run also collided with Playwright's ignored artifact
directory; final Electron execution was serialized. No failed attempt is reported
as PASS. Formatting initially flagged one new file; it was corrected and checked.
The automatic approval service once rejected test execution because its review
usage limit was reached; nothing ran then. After the owner's continue request,
the same approval route succeeded. No approval bypass occurred.

## Remaining limitations and deferred checks

- Actual engine/AgentOS imports, execute/cancel hooks, source-derived worker
  events, checkpoint/workspace reconciliation: **NOT_RUN**, P7/P8 prerequisites.
- Actual model/provider registry, credentials, connectivity, token budgets and
  live Discussion answers: **NOT_RUN**, P5; no paid call or ambiguous resend.
- Real Windows project aliases/junctions/handle containment/source disclosure:
  **NOT_RUN**, P6. Fixture workspace proof is not a filesystem-safety proof.
- Active **real task** quit-confirmation flow and engine rollback consequences,
  physical Windows logoff/system shutdown: **NOT_RUN**. Native shutdown and Job
  crash containment are implemented; the simulator does not certify those cases.
- Installed old Python <3.11 and Windows ARM64/x86, absent native-binding/OS
  privilege failure matrix: **NOT_RUN**; tested runtime is 3.14.4 on x64.
  Unsupported platform/containment errors fail closed. Interpreter/bridge hashes
  are local integrity pins, not signed distribution or comprehensive OS sandboxing.
- Packaged sidecar/assets/installer/clean-machine/signing: **NOT_RUN**, P10.
  P1 reference-image matching remains **NOT_VERIFIED/deferred**; no redesign.
- Full IIS-08 G0–G9 and independent external review remain **NOT_RUN**. No new
  acceptance of P0 documentary/runtime gates is inferred. Main DatabaseSync busy
  waits may still block Main as documented in P3; P4 does not redesign that layer.

No frozen-contract conflict requiring a Change Proposal was found. Revert only
reviewed P4 commits if needed, stop owned Jobs, preserve ledgers and leases, and
use verified P3 backup/restore into new paths. Do not clear unknown leases, rerun
tasks, reset project files or erase DBs. Publication uses ordinary feature pushes
only. Stop here for the owner's P4 review; P5 and main merge need new approval.

Implementation references: [Koffi output parameters](https://koffi.dev/output),
[Koffi Win32 examples](https://koffi.dev/start),
[Microsoft Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects),
[CreateProcessW](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw),
[explicit handle inheritance](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute).
