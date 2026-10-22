# P5 — Discussion & Models

Implemented the real Windows Desktop conversation path: current React Composer →
existing typed Preload → Main → T1 → contained Python Discussion → original engine
ModelGateway → DeepSeek → validated final JSONL → T5 → saved conversation read.
The live two-turn Atlas conversation passed, survived Renderer reload and Main
restart, and remains visible in the [actual application screenshot](screenshots/live-discussion.png).
P5 is submitted for owner review, not owner accepted. No P6 or main merge occurred.

## Provenance and implementation

Accepted P4: `b321bdc64be55a8bfc75e3de043b7ff79a8ab207`. Its separate acceptance
record was committed and pushed first at `c27adc7ad4a1850dc3f8b3f229af1d557050aa66`.
P5 uses `feature/p5-discussion-models` from that verified baseline. The separate
engine remains clean and unchanged at `834d0ca62cc9b2c03e530bafe4090024d98f31d3`.
Final publication provenance is recorded in the later COMMIT-RECEIPT.md.

- `electron/main/discussion/service.ts` owns root identity, model registry, opaque
  evidence, scoped conversation reads, serialized bounded queues, T1/T5 and failure
  reconciliation. Native project selection performs directory realpath/stat only;
  no directory enumeration or project-source read is implemented.
- `bridge/discussion_bridge.py` is the Discussion-only private stdio entry.
  `bridge/gateway_adapter.py` imports the engine's existing ModelGateway and
  OpenAICompatibleProvider. No AgentOS, worker or coding execution is instantiated.
  The exact eleven imported engine file hashes and three Desktop bridge hashes
  are pinned in `bridge/gateway-compatibility.json`.
- A private Gateway explicitly registers its FAST_WORKER profile to the sole
  Discussion route `deepseek-flash` / `deepseek_official_v1`. This profile belongs
  only to the separate Discussion Gateway; engine/AgentOS configuration is unchanged.
  The supported provider custom httpx client validates the actual POST destination
  and fixed model, adds non-thinking/stream:false, bounds response bytes and rejects
  truncated results. Gateway still issues the request through the existing provider;
  no parallel model HTTP invocation bypasses it. No redirects, environment proxy,
  automatic HTTP retry, structured-generation self-healing or fallback is used.
- Main verifies Python/bridge/engine bytes and descriptor before launch, preserving
  P4 suspended creation, inherited-handle allowlist and kill-on-close Windows Job.
  Python runs with `-I -S`; explicit trusted dependency paths replace PYTHONPATH/site
  startup. Only the operational Discussion child receives the local API credential.
  Probe processes receive no key; raw provider errors and stderr are not published.
- Existing React components now choose the model/project, send, display durable
  waiting/unknown/answered state, open history and retain an unaccepted draft.
  Subscription hints and bounded snapshot polling never call the model. The current
  styles, colors and icons are preserved. There is no invented answer streaming.
- Twelve existing Promise methods are backed, including models, root selection,
  conversation list/read/send/saveDockState and the four earlier database methods.
  Eleven future methods still fail closed. Public 23+3 IPC, five wire message types,
  five actions, exact ContextV1 and all 22 SQLite tables remain unchanged.

T1 returns its immutable idempotent acceptance snapshot before any provider issue.
Each issued attempt binds model, provider, process session and wire correlation.
T5 alone publishes a durable answer/proposal/summary; COMMIT failure produces no
optimistic assistant. Same-conversation sends serialize. Context excludes current
and future queued user turns, limits arrays to 20/10/20 and 96 KiB, and conservatively
prunes whole optional items using a 24,000-byte token estimate with prompt/output
reserve. Current input is never clipped. Extremely large current Unicode input may
therefore be saved but fail visibly before issue. Summary sources must be distinct,
visible, persisted same-conversation messages. Their message IDs are supplied as
supported provider message names, without changing message text. Unapproved model
decision candidates are discarded; exact attributable user `I approve: …` or
`أوافق: …` commands can enter approved memory atomically through the existing
decision rules. No candidate ledger or automatic Run Task was added.

Restart marks issued uncertainty and old unissued pending turns unknown; it does
not resend them. A later ordinary Send is a new turn, never a same-turn retry.
Main-issued proposals retain the existing 15-minute scope/TTL and are advisory;
tasks, writer leases, task events and proposal confirmation stay unavailable.

## Actual verification

**308 PASS, zero failed/skipped final tests:**

| Executed command / evidence | Result | Boundary |
| --- | --- | --- |
| `npm test -- --reporter=json --outputFile=.cache/p5-unit-results.json` | 276 PASS | 257 inherited + 15 P5 service + 4 P5 React cases; real SQLite, synthetic child responses |
| `python -m unittest discover -s tests/python -v` | 10 PASS | Actual imported engine Gateway/provider with MockTransport; zero real HTTP |
| `npm run test:electron` | 20 PASS | All inherited real Windows Electron tests, including security, navigation/Dock/DPI, SQLite and Main-crash Job cleanup |
| `npm run test:live -- tests/live/deepseek.spec.ts` | 1 PASS | Actual Windows Desktop, actual engine Gateway, two real DeepSeek requests, T1/T5, double-click/reload/restart |
| `npm run test:live -- tests/live/restore.spec.ts` | 1 PASS | Final build restores that live ledger/model readiness; no Send or new request |

Thus all **277 inherited P1–P4 tests** passed again, plus 31 P5 tests. The separate
[results](VERIFICATION-RESULTS.json) include case names and all I06-T01–T52 dispositions.
Fixture evidence is not represented as actual provider-fault/Windows acceptance.

Live calls: **2 of 10 authorized**, HTTP 200, finish_reason=stop, fixed Flash route,
non-thinking, max_output_tokens=256. Reported usage: **325 input + 56 output = 381
tokens** (181 then 200 total). No cost estimate is asserted. Actual ledger: four
messages, two completed attempts with the pinned model/provider, zero tasks and
zero task events. Reload, first restart and a later final-build restart caused no
additional API call. All live content was short synthetic Atlas text; no files,
repository contents or private project paths were sent. The shared ignored budget
reserves before network; uncertain requests also consume the ten-call allowance.

Build/typecheck, Prettier, Python syntax, actual-key/fragment scans of publication
candidates, built assets and the live SQLite files passed. `.env.local`, `.venv`,
`.cache`, `.test-profiles`, output and raw test results remain ignored. Frozen
verification passed for all 42 delivered files, 41 manifest payloads and 18
normative files, comparing working bytes, Git blobs and original ZIP. Delivery
manifest SHA-256 is `16aadd64d5a256330df0b1cf05106c300df394835e40037c5925073247c1c4c5`.
No migration/schema or imported engineering document changed.

During implementation, duplicate/future context and pending-startup recovery were
reviewed and corrected before final tests. Final review also fixed delayed T1
acceptance clearing newer unsent text or reopening a conversation after the user
had chosen another draft. Two React race cases verify preservation of the newer
text and navigation. T5 explicit approval also retains the separate decision
evidence guard. An approval-service quota interruption
temporarily prevented a test command; the owner continued and the same approved
route then completed. Source-message names and duplicate summary-source rejection
were finalized after the initial live test, then verified offline and in the final
build; no extra paid call was spent on live summary generation.

## Dependencies and local runtime setup

No npm dependency changed; package-lock.json remains pinned and unchanged. The only
package script addition is the separate live suite. Tested: host Node 25.9.0/npm
11.12.1, Electron 45.0.0 (embedded Node 24.22.0/SQLite 3.53.4), React 19.3.1,
TypeScript 5.9.3, Vite 7.3.7 and CPython 3.14.4 on Windows x64. The isolated Python
environment contains httpx 0.28.1, pydantic 2.12.5 and nine pinned transitive packages.
`bridge/requirements-p5-win32.lock` records hashes of the eleven wheels actually
used for Windows x64 CPython 3.14; `requirements-p5.txt` lists their versions.
Other Python versions/platforms have not been verified with that wheel lock.

The current workspace's local ignored setup is ready: `npm run dev` (or `npm run
build` then `npm start`), choose a project directory and explicitly select DeepSeek
Flash. The default profile does not contain test conversations; open the isolated
live profile only through its explicit restore test. Normal startup never sends
an API request. Only explicit Send consumes credit.

For a fresh Windows checkout, install Node 24+ and an available local CPython 3.14
without global/admin changes; keep the compatible engine in a separate directory.
Create `.venv` using that interpreter, then install local packages:

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install --require-hashes -r bridge/requirements-p5-win32.lock --cache-dir .cache/pip
npm ci --cache .cache/npm
```

Keep the owner key only in ignored `.env.local` as one `DEEPSEEK_API_KEY=` assignment.
Create ignored `.cache/p5-runtime.json` with the following field structure; replace
the illustrative trusted absolute paths and compute the interpreter SHA-256 with
`Get-FileHash`. Do not place the key value in this JSON:

```json
{
  "pythonPath": "X:/trusted/python/python.exe",
  "pythonSha256": "<64 lowercase hex characters of that executable>",
  "discussion": {
    "engineRoot": "X:/trusted/next-code",
    "sitePackages": "X:/trusted/desktop/.venv/Lib/site-packages",
    "secretFile": "X:/trusted/desktop/.env.local",
    "budgetFile": "X:/trusted/desktop/.cache/p5-live-budget.json"
  }
}
```

Main prefers an existing owner profile `python-runtime.json`. The ignored development
fallback is used only for unpackaged normal launches with no profile config; isolated
tests cannot inherit it. Do not overwrite an existing owner configuration blindly.
Do not reset the shared budget to obtain more authorized calls. Without compatible
credential or working Python, a present P5 configuration leaves saved history
readable and Send unavailable. With no P5 configuration, the legacy local UI and
preferences remain available; conversation endpoints remain disabled.
Normal regression tests never run the live suite. The offline Python suite currently
expects the separate sibling engine directory `next code` and this local `.venv`.

## Limits and recovery

- Only one attested model/provider is enabled. Multi-model switching and invalid-key
  remote tests were not run. Local readiness attests configuration/import/READY/key
  presence; it cannot guarantee account balance/network success. Actual HTTP success
  was separately proven by the two live calls.
- No real long provider outage, 300-second wall-clock timeout, interrupted live
  billing reconciliation, live summary/proposal generation or multilingual model
  quality test was performed. Controlled errors and ordering use fixtures. The byte
  estimate is conservative, not a model tokenizer or empirical full-context proof.
- The UI shows at most 100 conversation titles and the latest bounded 100-message
  page, seeking at most 100 pages. Older messages remain in SQLite. There is no
  previous-page browsing control in P5. Dock saves persist through the existing
  transaction and restore per conversation during a session; cross-Main Dock restore
  cannot be read through the frozen conversation DTO, so it is NOT_VERIFIED and no
  public field was invented.
- Native root identity is not a P6 File Broker/reparse jail. Source reads, consent
  races, coding handoff/execution and worker events remain deferred to their stages.
  There is no P6/P7 authority in this change. Full IIS-06/IIS-08 acceptance, visual
  reference signoff, physical OS shutdown and packaged installer tests are not claimed.
- No secrets, personal machine paths, raw environment or SQLite files are published.
  The screenshot contains only the synthetic Atlas conversation. Visual fidelity
  remains NOT_VERIFIED because the two reference images are still unavailable.

Rollback: close Desktop normally, preserve its user-data DB and any SQLite WAL/SHM,
switch to the prior feature commit without destructive cleanup, and retain the local
budget/evidence. There is no P5 schema migration to reverse. Use the existing Main-only
WAL-consistent P3 backup/restore procedure if recovery is needed; never delete a
database to suppress an uncertain turn. No engine change, global setting, administrator
operation, new public contract or change proposal was necessary.
