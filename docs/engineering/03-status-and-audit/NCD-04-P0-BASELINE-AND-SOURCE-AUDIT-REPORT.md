# NEXT CODE DESKTOP — NCD-04 / P0
## Baseline & Source Audit — Read-only Execution Report 01

**Audit date:** 2026-10-20  
**User instruction:** «اجل الان p0» — treated narrowly as authorization for P0 read-only document/source inspection only.  
**Result:** **PARTIAL / HOLD — N04-H01 OPEN**. Source reconnaissance completed, later exact-byte records match, but mandatory early original-byte baseline intake is unresolved. **No sealed implementation packet or G0 PASS.**  
**No implementation:** No source modifications, repo initialization, commits, installs, tests, provider calls, model credentials, child processes, or Windows fault injections.

## 1. Work performed and evidence method
- Read the exact frozen NCD-04 v1.0 plan and FCCR-01/C01, IIS-03 REISSUE, later IIS-04–08, and accepted cross-contract addenda from local document artifacts.
- Recomputed SHA-256 for the locally accessible later canonical files; compared registered expected bytes hashes. These checks validate those accessible copies, not historic source originals of earlier Library records.
- Attempted `raw_file` copy through authorized Files source for seven of the earlier parent documents; the source answered that no authorized raw-byte materialization path exists. Working `.txt` copies are extracted text, not proven original bytes. No reconstructed newline is promoted to historical identity.
- Inspected GitHub connected repositories via read-only repository metadata, branch, exact commit tree, and source-file reads. Audit is of the **remote main HEAD**, not user-local Windows worktree or installed runtime.

## 2. Source-of-truth and repository findings

| Evidence | Observed result | Confidence |
|---|---|---|
| Engine repository | [`naoufelbvb2-arch/next-code`](https://github.com/naoufelbvb2-arch/next-code), branch `main` | Remote observed |
| Remote main HEAD | `834d0ca62cc9b2c03e530bafe4090024d98f31d3`, Oct 18 2026 UTC | Remote observed |
| HEAD vs C-01 previously recorded SHA | **Exact match**; no new main commit observed | Remote observed (not local status) |
| Git tree | `34436def144ba20cafc9d34c3718ed2e5e8623ea`, 54 entries, complete/untruncated | Remote observed |
| Main engine entry | `AgentOS` Python class, `execute_task`, and CLI `run.py` | Source observed |
| Python requirement | `>=3.11` in `pyproject.toml` | Source observed; not installed-runtime proof |
| Engine dependencies | `pydantic>=2.0`, `httpx>=0.25.0`, `psutil>=5.9.0`; optional pytest deps | Source observed |
| Desktop repository | [`naoufelbvb2-arch/next-code-desktop`](https://github.com/naoufelbvb2-arch/next-code-desktop) **exists but is empty** | API branches/main 404, git tree/main 409 empty repository |
| Local git cleanliness, OS and installed Python | **NOT OBSERVED** | Cannot assess via remote API |
| Regression/test pass rate | **NOT RUN** | No evidence of new execution |

GitHub source links are pinned to observed commit for reproducibility. This P0 does not assert that the last commit or engine history was modified. GitHub default branch metadata says `main` for the Desktop repo but no branch commit exists; avoid fabricating a Desktop start SHA.

## 3. Read-only engine API / integration-hook inventory

| Hook | Existing source observation | Integration disposition |
|---|---|---|
| **HK-01** coding_task | AgentOS(...).execute_task(task_goal, task_id=None, *, conversation_context=None)->TaskOutcome | **PRESENT** — P7 |
| **HK-02** conversation_context | Bounded immutable structured Context with validation; source-level workspace matching | **PRESENT** — P7 |
| **HK-03** cli | Human-readable terminal CLI prints banners/progress and part of API key; not a private stdout JSONL adapter | **NOT_DESKTOP_TRANSPORT** — P4 |
| **HK-04** python_private_jsonl | No Desktop role-specific JSONL discussion/task child entrypoint found at observed commit | **NOT_OBSERVED** — P4/P5/P7 |
| **HK-05** cooperative_cancel | No public explicit cooperative cancel token/interface observed on execute_task or loop.run; OS tool timeout handling does not prove AgentOS cancellation | **GAP_FOR_INTEGRATION** — P7 |
| **HK-06** structured_engine_events | No verifiable IIS-01 typed task/worker event emission API observed; terminal verbose output is not evidence-grade event bus | **GAP_FOR_INTEGRATION** — P7/P8 |
| **HK-07** model_gateway | ModelGateway exists with ModelProfile-based routes, default DeepSeek target, generate_text/generate_structured | **PRESENT_WITH_ADAPTATION_REQUIRED** — P5 |
| **HK-08** safe_model_retry | Default transport retries 429/502/503/504 and RequestError; requires special treatment at Desktop uncertain-send boundary; do not assume idempotency | **RISK_REQUIRES_CONFORMANCE** — P5 |
| **HK-09** discussion_only | No existing standalone nonexecuting Desktop discussion child path proven; should not invoke AgentOS.execute_task for discussion | **NOT_OBSERVED** — P5 |
| **HK-10** checkpoints | Engine-owned GitShadowCheckpointer and workspace state; avoid Desktop duplicating checkpoint authority | **PRESENT** — P7 |
| **HK-11** workspace_shell | Uses subprocess shell and best-effort kill of Windows process tree; does not establish Job Object or verified descendant cleanup/lease release | **PRESENT_BUT_UNPROVEN_WINDOWS_SAFETY** — P7/P9 |
| **HK-12** engine_tests | Test source present, including C01 context tests; no test execution or current Windows test result obtained | **PRESENT_NOT_RUN** — P0/P7 |

### Source references (immutable commit)
- [agent_os.py](https://github.com/naoufelbvb2-arch/next-code/blob/834d0ca62cc9b2c03e530bafe4090024d98f31d3/agent_os.py#L14-L105)
- [architect/contracts.py](https://github.com/naoufelbvb2-arch/next-code/blob/834d0ca62cc9b2c03e530bafe4090024d98f31d3/architect/contracts.py#L150-L229)
- [run.py](https://github.com/naoufelbvb2-arch/next-code/blob/834d0ca62cc9b2c03e530bafe4090024d98f31d3/run.py#L56-L150)
- [kernel/gateway/router.py](https://github.com/naoufelbvb2-arch/next-code/blob/834d0ca62cc9b2c03e530bafe4090024d98f31d3/kernel/gateway/router.py#L17-L140)
- [kernel/gateway/openai_compat.py](https://github.com/naoufelbvb2-arch/next-code/blob/834d0ca62cc9b2c03e530bafe4090024d98f31d3/kernel/gateway/openai_compat.py#L53-L93)
- [architect/lead_loop.py](https://github.com/naoufelbvb2-arch/next-code/blob/834d0ca62cc9b2c03e530bafe4090024d98f31d3/architect/lead_loop.py#L124-L405)
- [kernel/tools/shell.py](https://github.com/naoufelbvb2-arch/next-code/blob/834d0ca62cc9b2c03e530bafe4090024d98f31d3/kernel/tools/shell.py#L28-L155)
- [pyproject.toml](https://github.com/naoufelbvb2-arch/next-code/blob/834d0ca62cc9b2c03e530bafe4090024d98f31d3/pyproject.toml#L1-L27)

**Interpretation boundary:** Missing Desktop-specific JSONL, cancellation and authenticated event adapters in the observed engine tree is an integration gap for P4/P7/P8, **not** evidence that the current engine is defective for its own CLI design. Do not redesign the engine or introduce new wire messages without approved change control. A thin Desktop-side adapter may satisfy some needs, but mandatory engine-internal evidence hooks may require a later separately approved ENGINE-CHANGE REQUEST.

### Specific risk details
1. **Transport incompatibility:** `run.py` is an interactive terminal runner (human-readable stdout plus API-key fragment disclosure); it must not be plugged into private JSONL stdout as-is. Any Desktop transport must isolate structured stdout and sanitize stderr, with no additional public IPC/JSONL actions.
2. **Provider ambiguity:** `OpenAICompatibleProvider._send_completion_request()` retries transient HTTP responses and `httpx.RequestError`, which may include uncertain remote receipt. This must not become an unacknowledged Desktop discussion resend or bypass Main attempt records; determine route-safe policy later without silently altering frozen IIS-06. This is a prospective integration concern, not a tested billing incident.
3. **Cancellation/process safety:** Shell-level `psutil` kill-tree fallback on Windows and `TaskOutcome` existence do not by themselves prove cooperative task cancellation, descendant reaping, writer lease safety or IIS-03/IIS-08 Windows proof.
4. **C-01 current confirmed:** `ConversationContext` is bounded in `architect/contracts.py` and passed optionally to `AgentOS.execute_task`; C-01 tests exist, but none was run in P0. No inference of prior test counts as current pass.
5. **Discussion mode:** The engine CLI starts coding, not a bounded, separate non-executing discussion service. P5 must not use the coding API to simulate discussion. File broker/source access stays disabled until P6 verification.

## 4. Normative artifact verification (exact locally accessible bytes)

| ID | File | SHA-256 verdict |
|---|---|---|
| NCD-04 | `NCD-04-IMPLEMENTATION-AND-VERIFICATION-PLAN-v1.0-FROZEN.md` | **EXACT_BYTES_SHA256_MATCH** |
| IIS-03-REISSUE | `NCD-03-IIS-03-PYTHON-PROCESS-SUPERVISOR-SPECIFICATION-v1.0-REISSUE-FROZEN.md` | **EXACT_BYTES_SHA256_MATCH** |
| IIS-04 | `NCD-03-IIS-04-SQLITE-DURABLE-STATE-SPECIFICATION.md` | **EXACT_BYTES_SHA256_MATCH** |
| IIS-05 | `NCD-03-IIS-05-REAL-TIME-EVENTS-MISSION-CONTROL-SPECIFICATION.md` | **EXACT_BYTES_SHA256_MATCH** |
| IIS-06 | `NCD-03-IIS-06-DISCUSSION-MODEL-INTEGRATION-SPECIFICATION.md` | **EXACT_BYTES_SHA256_MATCH** |
| IIS-07 | `NCD-03-IIS-07-PROJECT-FILE-BROKER-SPECIFICATION.md` | **EXACT_BYTES_SHA256_MATCH** |
| IIS-08 | `NCD-03-IIS-08-INTEGRATION-TESTING-ACCEPTANCE-SPECIFICATION.md` | **EXACT_BYTES_SHA256_MATCH** |
| IIS-02-C01 | `NCD-03-IIS-02-C01-CONVERSATION-READ-PROJECTIONS-ADDENDUM.md` | **EXACT_BYTES_SHA256_MATCH** |
| C-02-C01 | `NCD-03-C02-C01-D7-CANDIDATE-PERSISTENCE-V1-DEFERRAL.md` | **EXACT_BYTES_SHA256_MATCH** |

No parent contract was edited or unfrozen by this P0 audit; the IIS-03 REISSUE is operative instead of the missing historical IIS-03 file. Correctly matched hashes apply only to the accessible local artifact copies.

## 5. Original-byte provenance hold: N04-H01 (OPEN)

| Earlier normative contract | Available | Original historic bytes |
|---|---|---|
| NCD-00 | Text projection + terminal LF hash coincidence | **NOT VERIFIED** |
| NCD-01 | Text projection + terminal LF hash coincidence | **NOT VERIFIED** |
| NCD-02 | Text projection + terminal LF hash coincidence | **NOT VERIFIED** |
| C-01 | Text projection + terminal LF hash coincidence | **NOT VERIFIED** |
| C-02 | Text projection + terminal LF hash coincidence | **NOT VERIFIED** |
| C-03 | Text projection + terminal LF hash coincidence | **NOT VERIFIED** |
| IIS-01 | Text projection + terminal LF hash coincidence | **NOT VERIFIED** |
| IIS-02 | Text projection + terminal LF hash coincidence | **NOT VERIFIED** |

- Earlier `NCD-00-C01` sidebar clarification has an accessible text projection but no original-byte confirmation/registered canonical freeze digest in the prior FCCR manifest; include in provenance handoff assessment.
- Raw materialization attempts for NCD-01, NCD-02, C-01, C-02, C-03, IIS-01 and IIS-02 returned **no authorized raw-byte path**. NCD-00 original remains unverified. The observed terminal-newline hash match is useful similarity evidence, not an original-byte signature.
- **No automatic substitute is authorized.** Two permitted routes: (A) user supplies original files/raw archive with provenance, hash-check them against freeze records; (B) prepare a *separate prospective* replacement list with full comparisons, new independent hashes and obtain owner approval for each before sealing baseline. Neither route occurred in P0.

## 6. Open issues, severity and proposed responsibility

| ID | Severity | Finding and consequence | Next approved step |
|---|---|---|---|
| **P0-H01** | **BLOCKER** | Eight mandatory upstream artifacts lack authenticated historical original bytes; source packet cannot be sealed, N04-H01 still OPEN | Obtain originals or owner-approve explicit prospective substitutes after comparison |
| **P0-H02** | **HOLD** | Windows/local Git worktree, installed Python/environment, filesystem behavior not inspected | Read-only local evidence from Windows when separately made available |
| **P0-H03** | **PLANNING RISK** | No observed private Desktop Python JSONL child / discussion entrypoint | Design thin P4/P5 bridge in Desktop scope, no early engine edits |
| **P0-H04** | **ENGINE-CHANGE CANDIDATE** | No public cooperative cancel or typed verified engine events observed | At P7/P8, map missing minimal hooks and obtain separately approved engine scope if needed |
| **P0-H05** | **SAFETY RISK** | LLM HTTP retry on ambiguous send + potential mismatch with Desktop no-automatic-uncertain-retry rule | P5 scoped conformance test & route-specific integration; no provider call in P0 |
| **P0-H06** | **TEST GAP** | C-01 tests available in repo but no tests run; Windows process cleanup and Gate G0–G9 not tested | Execute tests only in later stage-specific authorized environments |

## 7. Evidence boundaries, acceptance and disposition

| Gate | Verdict |
|---|---|
| Read-only engine GitHub source reconnaissance | **COMPLETED** for observed remote HEAD |
| Later frozen canonical exact-byte hash checks | **PASS** for 9 checked accessible artifacts |
| Early raw historical artifacts | **BLOCKED** |
| P0 sealed implementation input manifest | **NO-GO / NOT SEALED** |
| IIS-08 G0 executable gate | **NOT RUN** |
| P1 implementation authorization | **NOT GRANTED** |

**P0 overall outcome:** Read-only reconnaissance is complete *to the extent observable*. The approved NCD-04 **P0 exit gate is NOT SATISFIED** because N04-H01 original-byte provenance remains unresolved. No assumed or automatic authorization to start P1. The recommended immediate next action is a targeted owner decision on the provenance path (original file recovery versus separate approved prospective reissues) and, if original files become available, a follow-up P0 verification pass. This report itself does not seek an engine-change or code authorization.

## 8. Machine-readable companion
- `NCD-04-P0-READONLY-AUDIT-EVIDENCE-MANIFEST.json` — exact check outcomes, historical projection flags, source hook inventory, remote commit and empty Desktop repo evidence. SHA-256: `e48f6407192bc14266c78e9d1dca8f598bba13ab0cb0512fb135734941add2a0`.
