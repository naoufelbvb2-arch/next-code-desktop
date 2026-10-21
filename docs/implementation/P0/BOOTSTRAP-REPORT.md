# Documentary bootstrap and short local preflight — 2026-10-21

Status: **documentation bootstrap complete; P1 preparation only; owner P1 decision
pending**. Executor: Codex. Independent review: NOT_RUN. No application source,
dependency installation, engine execution, provider call or runtime acceptance.

## Scope and authority

The owner's MASTER IMPLEMENTATION HANDOFF, particularly §§4 and 12, authorizes
safe extraction, exact-byte import, AGENTS.md, initial Git commit/push, short
preflight and a P1 plan. It supersedes the earlier handoff's read-only limitations
only for these named operations. No frozen source was edited. NCD-04 §§4, 5.1,
5.2 and 7 remain the stage-governance baseline.

## Repository and publication

- Initial local state: no `.git`, no parent repository; only the retained ZIP.
- Official public Desktop remote was independently read via the GitHub connector;
  `git ls-remote` succeeded with no refs before initialization.
- Initialized local `main` and the official HTTPS origin. Local-only public
  GitHub noreply identity; no global identity or safe-directory change.
- Initial import: **46 files**, commit
  [`af682b74375a0b5827aa1fca0ff0815434803650`](https://github.com/naoufelbvb2-arch/next-code-desktop/commit/af682b74375a0b5827aa1fca0ff0815434803650).
  `git push -u origin main`: **PASS**; remote `refs/heads/main` observed at that SHA.
- Import comprises the 42 delivered files plus `.gitattributes`, `.gitignore`,
  `AGENTS.md`, and `README.md`. The ZIP is ignored and retained locally.
- Follow-up evidence and P1 plan live on **`docs/bootstrap-preparation`**, starting
  at the import SHA. No follow-up merge or change to `main` is authorized.
  Its final SHA and push result are reported in the final owner handoff; resolve
  locally with `git log -1 --format=%H docs/bootstrap-preparation`.
- Changed paths on that branch: this report, `verification-results.json`,
  `verify_delivery.py` (read-only documentary verifier), `P1/IMPLEMENTATION-PLAN.md`,
  and the empty change-proposal directory marker. No P1 source exists.

## Delivery integrity and provenance

Source ZIP: `NEXT-CODE-DESKTOP-CODEX-HANDOFF-P0-2026-10-21(1).zip`.
The actual filename differs from the handoff only by the download suffix `(1)`.

| Check | Observed result |
|---|---|
| ZIP SHA-256 | `13aaa01ab4a0364e719d639c686a8b203e103ec6d90c46705b50df4eb3850ebe` |
| CRC / full entry reads | PASS |
| Pre-extraction path, drive, traversal, symlink and case-duplicate screening | PASS |
| Size bounds | PASS; each entry <10 MB, total <50 MB |
| Extracted files | 42: 18 normative, 16 authority, 5 audit, 3 root guidance/manifest |
| Manifest payload length and SHA-256 | PASS, 41/41 before extraction, after extraction and in staged Git blobs |
| Manifest SHA-256, observed independently | `16aadd64d5a256330df0b1cf05106c300df394835e40037c5925073247c1c4c5` |
| Manifest bytes vs original ZIP / staged blob | PASS |
| Destination | `docs/engineering/`, original relative names preserved |

The manifest does not list itself; **42/42 manifest-authenticated files is not
claimed**. `.gitattributes` disables transformations for all imported engineering
files, including authority and audit evidence. Approved reproductions are not
represented as recovered historical originals. N04-H01 remains closed by its
later owner adoption; IIS-03's approved reissue is operative.

## Local environment

| Item | Observed | Disposition |
|---|---|---|
| Windows | x64, display version 25H2, build 26200.9457 from registry | PASS for basic inventory |
| PowerShell | 5.1.26100.9444 | PASS |
| Git | 2.54.0.windows.1 | PASS; actual commit/push worked |
| Node.js / npm | v25.9.0 / 11.12.1 | Available; application toolchain compatibility NOT_VERIFIED |
| Python | 3.14.4, 64-bit; engine declares >=3.11 | Available; engine import/runtime compatibility NOT_VERIFIED |
| Installed metadata | pydantic 2.13.3; httpx 0.28.1; psutil 7.2.2; pytest 9.0.3; pytest-asyncio 1.4.0 | Metadata only, no engine imports/tests |
| Electron/React/TS build | No application package or lockfile yet | NOT_RUN; only after P1 authorization |

No missing-tool installation was necessary for documentation work. No dependency
or native compiler readiness is inferred from version commands. CIM OS-caption
query was denied; registry build/architecture inventory succeeded. Git operations
crossing sandbox/user ownership used an exact, command-scoped `safe.directory`;
global trust was unchanged. Restricted network blocked the first `ls-remote`;
the authorized network execution succeeded. These do not block bootstrap.

## Read-only engine observation

The neighboring engine checkout was found locally. Its personal absolute path
is intentionally omitted from public evidence. No private/untracked contents or
credentials were read.

- Origin: `https://github.com/naoufelbvb2-arch/next-code.git`.
- Local `main` HEAD and freshly observed remote `main`:
  **`834d0ca62cc9b2c03e530bafe4090024d98f31d3`**.
- Tracked modifications: 0; untracked entries: 0; baseline-to-HEAD diff: empty.
- `agent_os.py:41`: async `execute_task(task_goal, task_id=None, *,
  conversation_context=None) -> TaskOutcome`; validates and snapshots optional
  context, checks workspace and task identity, then delegates to the lead loop.
- `architect/contracts.py:159`: bounded validated `ConversationContext` exists.
- `kernel/gateway/router.py`: profile-to-provider/model routes exist; a profile
  named `LOCAL_CODER` defaults to the same configured provider as other profiles.
  The name is not evidence of local inference.
- `kernel/gateway/openai_compat.py`: HTTP/transient-request retries and structured
  output retry logic exist. They are not proven compliant with Desktop's
  ambiguous-resend restrictions; integration must constrain actual behavior.
- `kernel/tools/shell.py`: Windows process-group creation and descendant cleanup
  code exists. No actual descendant cleanup proof was run.
- `kernel/checkpoint.py` and `architect/lead_loop.py`: checkpoint creation and
  rollback mechanisms exist. No recovery or rollback test was performed.
- Dedicated Desktop JSONL integration, authentic worker-event hooks and a complete
  cooperative cancellation pipeline are **NOT_VERIFIED**. Targeted source review
  did not establish these capabilities; do not turn that into runtime proof.

This is the requested short preflight, not a full engine certification or P0
acceptance. Engine source was not imported/executed, copied or modified.

## Verification results and limitations

The machine-readable companion records actual intake observations and source
hashes. An initial raw engine working-file/blob comparison stopped on CRLF vs
LF checkout differences. The subsequent check recorded both hashes and verified
line-ending-only differences for nine source references; engine Git status
remained clean. No engine file was rewritten. This normalization was comparison
only and was never applied to imported engineering documents.
Reproduce exact-byte delivery checks from repository root:

```powershell
python docs/implementation/P0/verify_delivery.py --git-ref main --archive 'NEXT-CODE-DESKTOP-CODEX-HANDOFF-P0-2026-10-21(1).zip'
git diff --check -- . ':(exclude)docs/engineering/**'
```

The initial unrestricted `git diff --cached --check` **FAILED** on inherited
Markdown hard-break trailing spaces and blank lines in immutable imported files.
They were preserved intentionally to satisfy the owner's byte-integrity rule.
The justified equivalent for this import was exact SHA-256/length verification of
all delivered payloads and manifest bytes, plus `diff --check` excluding only the
immutable delivery for newly authored files; that scoped check passed.
No failed check is hidden and no frozen formatting was repaired.

Before the initial commit, reviewed publication paths and pattern-scanned all
46 files for common API/GitHub/AWS tokens, private-key headers, user home paths
and email addresses: **0 findings**. This is a bounded check, not a mathematical
guarantee that arbitrary sensitive text cannot exist. No actual keys were read.

Application tests, screenshots, accessibility runs, actual engine/process tests,
LLM calls and IIS-08 G0–G9 remain **NOT_RUN**. Fixture, integrated Desktop, real
engine execution, Windows process safety and packaged acceptance are separate.

## Issues, disposition and safe recovery

1. **VISUAL-INPUT-01:** NCD-01 references two owner visual assets in
   `NCD-01-references/`; neither image is included in this ZIP. Obtain those
   approved references before logo/fidelity sign-off. Do not invent replacement
   branding or call VIS-01 passed. This does not invalidate the 18-file manifest.
2. **ENV-01:** Electron/React/toolchain and engine runtime compatibility remain
   untested until the authorized stage. Available versions are not certification.
3. **P0-H02 / P0 exit:** basic local checkout/tool facts now observed; runtime
   proof and owner exit disposition remain pending. No automatic P0 acceptance.
4. No confirmed contradiction between the frozen contracts was found within this
   preparation review. Known historical H01/IIS-03 dispositions were respected.

No destructive rollback, migration, data rewrite or process shutdown is needed.
The original ZIP and engine are untouched. Keep the immutable import; revise or
revert only reviewed follow-up documentation if the owner requests it. Do not
delete user files or rewrite published history.

**Next decision requested:** review the P1 scope packet and explicitly authorize
P1 implementation only, including its local dependency installation and scoped
tests. Merge of the evidence branch and later P1 code is separately controlled.
