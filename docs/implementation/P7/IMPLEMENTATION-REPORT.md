# P7 final production integration — 2026-10-25

**The normal production Run Task path executed the original AgentOS against real
official DeepSeek Flash and completed the approved external synthetic fix.** The
single mission used **12 HTTP requests /31,628 tokens**, with no paid retry. Its
request and task allowances are now consumed: new tasks fail before T2 until the
owner grants a new scoped mission. This is an implemented explicit model route,
not an unlimited grant or a general-purpose Windows filesystem sandbox.

## Authority, scope and result

P7 FINAL INTEGRATION explicitly supersedes the earlier no-paid/unconfigured-route
restriction for this mission only. Clean Desktop baseline and origin matched
`b07dffc9cd0444a516f1106ea846983b85b3a802` on
`feature/p7-real-coding-execution`; the independent engine remains clean/read-only
at `5e7179b9d528e7ef97e18f91ec284e4da514ca0b` on its separate feature branch.
No engine edit/copy/submodule, main merge, P8/P9, visual redesign or new dependency.
The original P7 engine/Windows implementation is retained, not rebuilt.

An external clean Git project contained `sample.py` with `add(a,b)` subtracting,
and a hash-pinned `check.py` with four arithmetic assertions. The baseline test
actually failed. A test-owned Main caller created the owner's exact proposal in
an isolated user-data profile using real SQLite T1/proposal operations and fresh
native root handles. It created no assistant/model reply, provider attempt or
task event. Production IPC, storage dispatch, Coding factory and AgentOS were
never replaced with fixture routing. Discussion was deliberately unconfigured:
the real key was passed only to Coding Python, and no proposal API call was spent.
The screenshot's Discussion status/draft warning comes from that isolated owner
proposal setup and is not a failed paid Discussion request.

The real Renderer displayed the full goal and clicked Run Task. Production Main
verified runtime/provider/key/scope/budget, T2 atomically consumed the proposal and
committed its immutable receipt/slot/lease, then launched the exact Coding Bridge.
After READY/session binding and another native root proof it sent task.execute
once. Original AgentOS/LeadArchitectLoop emitted task.started, used the original
ModelGateway, workers and tools, and returned its real seven-field TaskOutcome.
T4 persisted start/completion before UI hints. Verified outer Windows Job child /
descendant zero, intact event history and fresh native root enabled T3 release.
The task finished COMPLETED/success, three architect ticks, zero rollbacks and a
real final checkpoint. The test independently reran `check.py` and observed
SYNTHETIC_ADD_TEST_PASS; source is `return a + b`, the test bytes are unchanged.
Reopening the ordinary production entry showed the same result with no Run Task
button, new task or additional request. See `screenshots/live-deepseek-success.png`.

## Private production configuration and provider enforcement

Main's existing local python-runtime.json supports an explicit private `coding`
section: pinned engine/site paths; provider deepseek_official_v1, base URL
https://api.deepseek.com, model deepseek-flash; ignored secret/journal files;
canonical workspace, writable Python filenames, verification script hash and
exact command. No field crosses Renderer/preferences IPC or enters SQLite. The
normal development config was updated locally while preserving P5 configuration;
the journal was never reset. Missing/invalid/spent configuration denies before T2.
Python process readiness is independently probed without a provider call/key;
transport READY is not model authorization. A valid model route additionally
requires Main's private exact-version capability, explicit config, local key and
unconsumed budget. No environment boolean, fixture selector or default paid route.

Coding Python pops the key from its environment before engine/subprocess creation.
It constructs the original ModelGateway and original OpenAICompatibleProvider,
clears default routes and explicitly registers REASONING, FAST_WORKER, LOCAL_CODER
as Flash. All three are verified with HTTP mocks; the particular live engine task
requested REASONING eight times and FAST_WORKER four times, never LOCAL_CODER.
The endpoint and requested model are pinned; this is not independent attestation
of DeepSeek's internal model weights/version behind its public alias.

A Desktop-owned supported httpx transport permits only POST to the exact HTTPS
chat-completions destination, with no proxy inheritance or redirects. It explicitly
uses non-thinking JSON output and caps output at 2,048 tokens. Original provider
max_http_retries=1 means one attempt in that API; Gateway max_retries=0 and the
provider wrapper prevent paid structured self-healing even if a caller asks for
retries. No LLM engine was reimplemented. Official references checked on 2026-10-25:
[model identity](https://api-docs.deepseek.com/quick_start/pricing/) and
[thinking configuration](https://api-docs.deepseek.com/guides/thinking_mode/).

The separate 12-request/60,000-token mission journal is mandatory and pre-created
locally. Cross-process locking plus fsynced atomic replacement reserves each HTTP
attempt before I/O. No automatic empty-journal creation/replenishment. Unknown /
failed attempts block further spend; one task claim persists across restarts.
Conservative UTF-8/framing/output reservation precedes each request; actual usage
must be valid and bounded before another request. This is not a certified tokenizer
calibration. Every live request completed HTTP 200 with known usage: the provider
journal and independent original Engine TokenLedger both show 12 /31,628. Existing
P5 remains exactly two requests /381 tokens. No paid test was repeated to improve
counts, and no additional API call is authorized now.

The temporary local scope additionally wraps existing ToolRegistry registrations:
only the approved files may be patched; only the exact pinned Python verification
command may run; writable code must consist of pure arithmetic functions before
execution. The trusted test remains hash-pinned. Original engine guards still run.
Actual denial tests target both production repository paths and escaping commands,
and reject executable imports/calls. This is application policy for this synthetic
mission, not an OS sandbox for hostile Python or permission to run user projects.

## Cancellation, faults and the three earlier partial cases

Existing lifecycle/control/Job logic remains in use. Code review found that the
new HTTP transport initially sanitized asyncio cancellation into ValueError; it
now propagates CancelledError so the original gateway_wait can drain and confirm
TaskCancelled. The actual production factory/CLI cancellation test uses a waiting
HTTP mock, real AgentOS/control, T3 cancel/T4 event and verified Job cleanup. This
cancellation-only follow-up is offline tested; the successful live path was not
paid-rerun after the cap. Exact live-tested source hashes are retained separately.
Existing worker/tool cancellation, terminal race, true 15-second escalation,
descendant cleanup and uncertain-writer/no-replay regressions pass.

- **C05 PASS:** real GUI chooses an ASCII-case alias, retains one canonical project
  and completes actual offline AgentOS with safe release. A junction-root positive
  expectation was denied NOT_AUTHORIZED; that is the existing safe reparse policy,
  not permission to weaken it. Short/reparse/hard-link negatives remain verified.
- **C08 PASS:** a test-owned filter drops only the actual accepted response. Actual
  AgentOS originates task.started; Main rejects it without ACK under the unchanged
  frozen protocol. No event/outcome is invented, lease remains blocked, immutable
  receipt replay creates no task or execute. This is actual engine evidence plus
  deliberate transport loss, not a simulator generating a fake start.
- **C09 PASS:** Main is actually terminated through a creation-bound handle while
  the real Coding child waits at a test-only Gateway setup barrier before AgentOS
  construction/start. Its held handle exits, actual SQLite reopens blocked with
  no start/event/replay. Existing actual post-start Main death evidence also passes.

## Actual verification, failures and limits

Final current Desktop executable results: **483 PASS / zero FAIL /one NOT_RUN**:
422 unit/UI/native, 30 Python, 30 Windows Electron and one real paid Coding case.
The inherited unprivileged file-symlink case remains NOT_RUN. Prior read-only P5
restore PASS is carried, not counted again or rerun with a credential-bearing
Discussion child; actual P5 mock/two-turn regressions are included. Independent
engine regression is **53 PASS /three paid NOT_RUN**, unchanged source, provider
credentials stripped and external sockets denied. Build/typecheck/format and
frozen working/Git/archive checks pass; exact 23+3/5+5/22 public/schema inventory
and package/lock remain unchanged. VERIFICATION-RESULTS.json lists every final
case and raw artifact hashes. The owner P7 register is now **21 PASS /zero PARTIAL**.

Failures were retained and corrected: test peer engine-only config/CLI-role and
missing HTTP finish_reason; native-selection synchronization and a missing native
proof in isolated proposal setup; an early runtime-startup gate denial before T2;
the intentionally forbidden junction interpretation; cancellation exception
propagation. The final sandbox build was denied directory resolution; the
authorized elevated build passed unchanged. A concurrent build/Electron run had
29 PASS /one pre-scenario window-startup FAIL. Its raw JSON/trace is preserved;
after building finished, the complete sequential Electron rerun passed all 30.
Build overlap is the suspected cause, not a proven application defect.
The pre-admission live harness failures consumed no task or HTTP
request. Strict production validators, native proofs, deadlines and writer guards
were preserved. No failing command is described as a passing run.

Minimum P7 G4 is PASS with actual offline and live original engine/Windows proof.
**P7 is ready for the owner's review/acceptance of this scoped delivery; acceptance
is not self-issued.** Full IIS-08 G2/G4/G7 are still system subsets/PARTIAL, P6 G6
remains PARTIAL, and P1 visual signoff remains deferred. No general user-project
coding/OS sandbox certification or packaged proof is claimed. The paid/task limits
are consumed, so another Run Task requires renewed owner authority and explicit
local scope/budget configuration. P8's worker stream/timeline/Inspector and P9's
full resilience/system gates are unstarted. Stop here; no merge or P8/P9.

Run UI locally: `npm run dev`, or `npm run build` then `npm start`. Offline QA:
`npm test`, `python -X utf8 -m unittest discover -s tests/python -v`,
`npm run test:electron`, `npm run format:check`, plus the original engine's
`python tests/run_offline.py -q -p no:cacheprovider`. The separate live Playwright
config intentionally refuses a consumed mission; do not rerun/reset it. Retain
SQLite/WAL, external source/checkpoints, journal and receipts. Recovery never
replays or unlocks by time/PID; rollback is a reviewed new commit, not data reset.
CHANGE-MANIFEST records exact phase files; the later receipt/final response gives
actual independent publication SHAs. No key/personal path/raw environment is
published, and the engine source is not vendored.
