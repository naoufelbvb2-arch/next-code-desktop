# NEXT CODE DESKTOP — NCD-03 / IIS-07
## Project File Broker — Canonical Workspace Containment, Safe Discovery, Bounded Source Reads, Secret Protection, and Inspection Evidence

**Status:** **FROZEN v1.0 — FFR-01 CLOSED — OWNER APPROVED / DESIGN ONLY (2026-10-20)**  
**Date:** 2026-10-20  
**Project:** Next Code Desktop, Windows v1, dedicated to the existing Next Code engine  
**Authority:** NCD-00 (+ C01), NCD-01, NCD-02, NCD-03/C-01, C-02 (+ C02-C01), C-03, IIS-01 through IIS-06 (including IIS-02-C01) **FROZEN v1.0**.  
**Implementation authorization:** **NONE.** This paper does not authorize a code change, Electron app repository, Python-engine change, new DB migration, Windows experiment, or production rollout.  
**Contract neutrality:** This normative design is independent of any external coding assistant, IDE, or implementation supplier.  
**Final v1.0 adoption rule:** The owner explicitly approved the corrected Draft v0.2 and authorized final freeze on 2026-10-20. IIS07-D01–D18 and FFR07-R01–R08 are now **FROZEN v1.0 documentary design**, including the IIS-07-specific numerical limits; these do not retroactively amend frozen parents. Earlier draft/pending language preserved in §20 is historical FFR-01 provenance, not a live approval gate. The final governing disposition is §22 and the separate Final Freeze Record. A proven parent conflict still requires a separate owner-approved correction. No executable Windows security proof or runtime test is implied.

---

## 1. Mission, scope, and invariants — IIS07-D01

This specification completes the **Electron Main-owned, read-only broker** approved by C02-D10–D17, the fixed JSONL commands of IIS-01, the closed Renderer IPC of IIS-02, the persisted inspection evidence of IIS-04, and the Discussion/ModelGateway consent boundary of IIS-06. Its purpose is to help a discussion answer project-grounded questions without granting the discussion child, the LLM, or React unrestricted disk access.

**Required invariants:**

1. Main is the only authorized discussion/preview file-reader and path-policy authority; it uses the selected **persisted conversation + canonical project/workspace** (or Main-validated Renderer project identity for a local preview). A path argument is only an untrusted selector.
2. Broad *ordinary text-file eligibility* is preserved; known sensitive file names, content, links, binaries and unsafe identities are excluded. No claim that secret scanning detects every secret.
3. Discovery ≠ file-content reading ≠ handoff to Python ≠ external provider transmission. These are separate actions/evidence and disclosure rules.
4. An accepted request authorizes neither engineering execution nor task admission. `Run Task` remains the separate, user-initiated, one-use IIS-04/IIS-02 path.
5. Each completed broker operation has finite work, memory, bytes, duration, scope and auditable evidence; no fabricated coverage, unseen files, percentages or automatic full-project ingestion.
6. Python Discussion has no direct unrestricted file-read capability through this path, no shell/terminal workaround, no writing, no worker dispatch, and no coding-task role. If technical enforcement cannot be demonstrated in the actual bridge, implementation must stop for an owner-reviewed correction.
7. This document cannot add a sixth JSONL action, a new Preload method/subscription, a SQLite table, a separate HTTP server, a universal outgoing LLM filter, or an OS sandbox claim not approved by its parents.

**Non-goals:** local source-code indexing service, file watcher, full VCS analysis, binary/vision decoding, editable file browser, remote workspace, filesystem mount, generic agent plugins, OS-wide data loss prevention, universal adversarial-path security proof, guaranteeing third-party-provider retraction, or automated task execution.

## 2. Ownership and two distinct request lanes — IIS07-D02

```text
 A. Discussion evidence path (no arbitrary direct file access)
 Main-authorized discussion.send (active wire request ID + project + route)
                │
         READY Discussion Python child (untrusted request fields)
                │  existing JSONL: project.discover / project.read
                ▼
 Electron Main: parent-turn scope → policy → scoped open/read → audit
                │  typed correlated response, only safe metadata/excerpt
                ▼
 Python Discussion Service → selected model (subject to IIS-06 consent)

 B. Local preview path
 User in trusted React UI → fixed Preload IPC projects.listFiles / projects.previewFile
                ▼
 Electron Main: sender/project/path/policy → scoped open/read → safe DTO
                ▼
 React local file list / preview (no automatic remote disclosure)
```

- The two lanes **share one policy engine**, source identity checks and resource accounting primitives, but **not the same authority**. Lane A needs an active exact parent `discussion.send`; lane B needs a permitted Renderer IPC caller and a registered Main-resolved `projectId`. React never sends `discussion_request_id`; Python never calls Renderer methods.
- UI file preview is *local presentation*, not proof that Python examined the file. It must not increment `project_inspections.actually_read_count` for a discussion inspection unless the same real evidence was independently acquired through Lane A under its proper scope.
- Main may use a dedicated bounded worker/thread/native helper for disk work to keep its event loop responsive. This helper is Main-owned, receives only validated scoped handles/capabilities, cannot expand authority, and does not introduce a new application service or cross-process protocol. A Python process is not made into a real Windows filesystem sandbox by this statement; v1's application-level separation is explicitly limited. A Main-owned helper needing a new trust/process boundary or extra IPC must be reviewed as a narrow compatibility issue rather than silently added.
- A chosen file in Right Dock, a clickable path in a generated answer, or a model-supplied path is never authority to read an unregistered project or bypass denial.

## 3. Canonical workspace and parent-turn authorization — IIS07-D03

### 3.1 Register and resolve the workspace

- Only the frozen user-mediated `projects.choose()` and trusted Main project registration define project roots; workspace labels, open documents and model text cannot register a new root. `projects.select` changes new UI selection only; existing conversations and coding tasks retain their original binding.
- On project registration and each sensitive read/admission boundary, resolve the Windows canonical root and compare its actual filesystem identity to the persisted `projects.canonical_workspace_key` / Main project registry. Use stable underlying volume/file-object identity or a validated equivalent, **not string case-folding alone**. The Main registry must not silently treat a changed root/volume identity as the old project; a volume/file ID alone is insufficient if its provider's identity stability cannot be proven. Root unavailable, moved, replaced, inaccessible, or identity-ambiguous: fail closed for new reads, mark project unavailable/inspection partial, without silently repairing identity.
- Paths in the UI are display labels, not trusted authority. A previously authorized project cannot be substituted via directory rename, short-path alias, volume mount, UNC alias or environment-current-directory change.

### 3.2 Python active-parent binding

- Only a supervised **READY `discussion`** child may request the two broker actions. For both actions, mandatory `input.discussion_request_id` equals the outer `message_id` of an **active Main-issued `discussion.send` request on the same child connection**. The JSONL outer `correlation_id` of this new broker request remains `null` as frozen.
- Main resolves an internal immutable parent descriptor `{process_session_ref, parent_wire_id, conversation_id, project_id|null, canonical_workspace_key|null, selected_model_id, effective_provider_key, discussion_attempt_id, active_state}`. This is **not a new wire object**. The descriptor is allocated before `discussion.send`, held only for its authorized lifetime, and cannot be constructed from a Python-supplied ID.
- For `project_ref:null`, no registered workspace exists: `project.discover` and `project.read` reject. No fallback to home directory, working directory, arbitrary recent project, or the selected UI project.
- If parent request has ended, expired, lost its supervised process, changed to an invalid state, or was invalidated by revoked permission/project safety change, all new broker calls reject even when they contain an old ID. Concurrent discussion sends are individually bound, never to the latest/current conversation by convenience.
- Validate the role, sender session, request ID uniqueness, parent identity, project association, and current Main-side authorization **on each operation**. A Python-specified project name/provider/path cannot retarget the parent.

### 3.3 Renderer local access

- `projects.listFiles(projectId, relativeDir, cursor, limit)` and `projects.previewFile(projectId, relativePath, range)` remain the only frozen Renderer read methods. Require trusted `webContents`, exact closed typed arguments, Main-registered project ID and current safe root identity. Renderer project switching never changes a running discussion parent descriptor.
- Local UI display alone does **not** grant external provider disclosure, coding permission, or a general-purpose `fs` API in Preload.

## 4. Closed IIS-01 wire interface — IIS07-D04

No extra root fields, actions, event types or response structures are permitted. Canonical request envelope has **exactly** `version`, `type`, `message_id`, `correlation_id`, `payload`; `type=request`, `correlation_id=null` on Python-origin broker requests, with `payload={action,input}`. All IDs follow the frozen `^[A-Za-z0-9_-]{1,64}$` pattern; duplicate outer IDs are connection errors under IIS-01.

| Action | Frozen exact `input` | Completed result (exact existing shape) |
|---|---|---|
| `project.discover` | `{discussion_request_id, directory, max_depth, limit, cursor}` | `{directory, entries:[{path,kind,size_bytes}], next_cursor, complete, excluded_count}` |
| `project.read` | `{discussion_request_id, path, start_line, end_line, max_chars, expected_mtime_ns}` | `{path, start_line, end_line, content, truncated, observed_mtime_ns, excerpt_sha256}` |

`directory` / `path` are **workspace-relative string selectors only**; a cursor is `string|null` and timestamp is decimal ASCII `string|null`. `response.completed` carries `result` and `reason:null`. An isolated denial is `response.rejected` with `result:null` and a sanitized `{code,message}`; actual transient I/O failures may be a correlated `error` with exact `{code,message,retryable}`. No `response.accepted` for these actions; no opportunistic extra status/coverage keys.

**Frozen IIS-01 hard limits (must all apply):** complete JSONL line <=262,144 UTF-8 bytes, discovered page `max_depth=1..3`, `limit=1..100`, cursor <=128 characters; read `start_line>=1`, `end_line>=start_line`, span <=200 lines, `max_chars=1..16,384` Unicode characters, returned excerpt <=16,384 Unicode characters, broker operation <=30 s. Metadata `expected_mtime_ns` and `observed_mtime_ns` are exact canonical decimal digit strings, never JS numbers. Cumulative limits in §10 are **additional** candidate IIS-07 bounds, not replacements.

- Required full-line read range wholly past EOF (including empty file) yields sanitized `RESOURCE_LIMIT` rejection, never fabricated line `1`. Partially available ranges return **actual inclusive emitted** line bounds and `truncated:true`.
- If some source lines cannot be delivered because of `max_chars`, the emitted range must reflect only actual included complete lines. A request whose **first requested line alone exceeds the remaining character allowance** must fail safely rather than invent a shorter completed line range or silently return a partial line as full-line evidence. Shortening is accurately flagged `truncated:true` when a non-empty complete-line prefix can be returned.
- A successful `excerpt_sha256` is the SHA-256 of the actual emitted UTF-8 `content` bytes *after* any canonical text representation and approved safe redaction, **not** the whole file digest or a secret-bearing unscreened copy.
- Same-source version freshness must use full precision; no `Number()` conversion and no approximate equality.

## 5. Strict relative selector and Windows path safety — IIS07-D05

**Frozen v1.0 fail-closed input grammar and interpretation:**

1. Accept a bounded sequence of Unicode filename components separated by canonical `/` for wire/UI selectors. For discovery only, `directory="."` identifies the **registered project root**. Other trailing/leading separators, empty segments, and any `.` or `..` segment reject. No automatic decoding of `%2e`, percent escapes or double-encoded alternate paths; selectors are literal validated strings.
2. Reject rooted/absolute forms (`/`, `\\`, drive letters/drive-relative `C:foo`, UNC, extended `\\?\\`, NT device namespaces and POSIX-style home markers), embedded NUL/control characters, backslash as an alternate separator, colon/ADS syntax, wildcard or glob expansion, and unpaired surrogate strings. Reject Windows device basenames (case-insensitive, with suffix/extension variants), trailing-dot/space aliases, and characters that the target filesystem normalizes ambiguously.
3. Limit candidate selector size to **1,024 UTF-8 bytes**, maximum **32 components**, and each component <=255 UTF-8 bytes *as the approved broker-internal v1.0 rule*. Validate canonical Unicode encoding before joining; do not silently normalize meaningful source names into a different path. If the filesystem uses an unexpected normalization/case rule, reject ambiguity rather than guess.
4. Resolve by **components under the opened authorized root**. Every traversed ancestor must be an actual permitted directory and the final read target an actual regular file. Deny all encountered **symlinks, junctions, mount-point reparse records and other reparse points in v1** (even if their nominal target remains within the root), unless a separately reviewed future policy demonstrates safe handle containment. No recursive traversal into a reparse tree.
5. Verify the opened object through OS-backed, handle-based identity/path/volume checks, including parent chain where the platform requires it; reject any target that can escape the canonical workspace or differs from the validated object. **Do not use string prefix matching or `realpath`-then-reopen as the only race defense.** Keep the verified handle used for the actual bytes that are screened and returned.
6. Reject protected/non-regular resources: devices, named pipes, sockets, shortcut targets (do not follow `.lnk`), virtual mount aliases, and file streams/ADS. A file becoming different, inaccessible or unresolvable between validation and use is an error, not permission to try a different path.

**Windows TOCTOU implementation gate:** Electron/Node filesystem APIs alone must not be assumed to provide race-proof ancestry validation. Candidate implementation evidence must identify actual supported Windows calls and handle relationships: open the registered root as a verified directory handle; inspect each ancestor/leaf for file ID, volume, regular-file/directory type, reparse tag and forbidden redirect; traverse/open by a relationship bound to those verified handles (or a proven equivalent), and keep the final opened handle for the **same captured bytes** screened/released. Candidate Win32 handle information APIs include `GetFileInformationByHandleEx` (`FileIdInfo` / `FileAttributeTagInfo`), and reparse-aware directory opens; these are **not themselves a proven safe relative-open primitive**. If native handle-relative mechanisms require unsupported APIs, cannot demonstrate ancestor-swap safety on supported Windows versions, or cannot prohibit a previously opened writer from modifying read bytes, fail closed. A `GetFinalPathNameByHandleW` result, `realpath`, path prefix, or a mere after-the-fact ancestor re-open is never sufficient proof. Require race/injection tests on Windows using the same implementation as production. Avoid elevation and do not claim a strict Windows sandbox.

## 6. Enumeration/discovery contract — IIS07-D06

1. Main checks root and parent binding, selector/path policy, directory identity, page cursor, eligible scope and budgets **before opening or enumerating**. Enumerate actual children only; no shell glob, no external `find`, no Python walk and no recursive unbounded inventory.
2. Stable, deterministic sort of entries uses a normalized, case-aware comparison with a deterministic second key sufficient to detect ambiguous aliases. A case-colliding or unexpectedly normalized name is skipped/denied rather than treated as another credential to a different object. Avoid revealing sensitive names in an error.
3. Return only `entries:[{path,kind,size_bytes}]` for safe *enumerable* items. `path` is a relative selector, `kind` is `file|directory`, `size_bytes` for safe regular files only (integer or null as allowed), never an OS device handle. Only lossless nonnegative JSON integers that the TypeScript/Python consumers can represent exactly may be sent; if actual size exceeds the proven shared exact numeric range, emit the **existing `null`** value (and do not invent a lower rounded size). A listed file is **not** claimed read, scanned for secrets in full, approved for external send, or semantically understood.
4. Apply sensitive path/name exclusion before adding an entry. Typical excluded/generated directories may be omitted to contain automatic inventory cost; their omission is reflected in truthful `excluded_count`/coverage. A sensitive name must not be leaked merely because the file itself is omitted. Do not expose absolute roots in wire results.
5. A discover result's `complete:true` means **only the selected requested enumeration scope is completely processed** with no remaining page under that scope. It does not imply all the repository's branches or file contents were visited. With more entries or a stop at budget/partial traversal, return `complete:false` and a valid next cursor when continuation within the scope is supported; if a hard budget has been reached, the caller must see a safe denial or terminal incomplete state rather than an unusable pretend-continuation.
6. `excluded_count` is a bounded count of actually encountered, excluded entries in that **page/segment**; never invent an absolute number of secrets or protected files. If candidate enumeration can't support a truthful exclusion count, reject/fail partial rather than lie.
7. Cursor is an opaque Main-issued, integrity-protected token <=128 characters bound to `project_id`, parent conversation/session, `discussion_request_id`, canonical workspace version, normalized directory, depth, sort/filter policy version and enumeration generation/position. No raw absolute paths or secret names in the token. Because this binding may exceed 128 characters, v1 uses a **high-entropy opaque token that indexes a bounded Main-memory cursor record**, not a self-contained JSON representation of all fields. It is never valid after Main restart or parent end; an absent record is `STALE_SOURCE` / `NOT_AUTHORIZED`, not best-effort resumed traversal. A cursor from another project/turn/process/policy generation or after relevant mutation is rejected `STALE_SOURCE` / `NOT_AUTHORIZED` under the frozen error taxonomy.
8. Prefer deterministic cursor pagination with an *actual stable enumeration boundary*. Main's bounded per-scope enumeration record retains a verified ordered list of safe eligible entries **and necessary page exclusion counts**, tied to verified directory/ancestor identity and a policy/generation marker, with a hard per-parent 1,000-entry ceiling. Before each page, verify that directory and entries have not changed in any way relevant to the promised snapshot; where filesystem change detection or alias identity is unprovable, **reject as stale and require a fresh enumeration**, not a guessed continuation. The token is short-lived, memory-bounded and never a claim of a persistent Windows snapshot. `complete:true` is permitted only when the selected **bounded enumerated scope** was exhausted without an unvisited branch, policy exclusion hidden by filtering, or work-budget cutoff; page exhaustion cannot mean the whole repository was scanned. No false full-repository claim arises from `max_depth<=3`.
9. Count only Main-observed eligible discoveries in `inspection_observations` if this is Lane A; `projects.listFiles` remains a separate UI projection without silently constructing a discussion inspection session.

## 7. Text eligibility, decoding, and safe read selection — IIS07-D07

**Default is broad textual eligibility, not a fixed source-extension allowlist.** A regular file in scope is a candidate regardless of extension (custom language, scripts, docs, manifests, config), unless forbidden by name/path/content/file type/size/encoding. Deny explicitly protected identities including `.env` and derivatives, credentials, private key stores, auth tokens, hidden secret directories, provider/OS secrets, and policy-controlled files. `.git` internals and large generated/dependency trees (e.g. dependency/vendor artifacts) may be excluded from automatic discovery as resource policy, but this is not proof of a full scan. Any future exception may never override a sensitive deny.

**Frozen v1.0 default sensitive-path catalog (minimum categories; future changes require reviewed policy versioning):** `.env`, `.env.*`, `*.pem`, `*.p12`, `*.pfx`, `*.key`, `id_rsa`, `id_ed25519`, `known credential/token directories`, cloud key material files, credential stores, keychains, OS/browser profile databases, `.git` object/internal metadata, and known secrets in ordinary config. Names are checked case-insensitively on Windows using canonical components; patterns are not a promise of exhaustive secret recognition. Common ordinary filenames (e.g. `settings.json`) are **not blanket-denied solely for being configuration**, but their content must pass the same policy.

**Decoder:** read from the *verified handle* into bounded scanning buffers; accept strict UTF-8 (including a defined UTF-8 BOM policy) and BOM-identified UTF-16 LE/BE **only if exact decoding is safe and lossless**. Do not guess legacy encodings and replace malformed bytes with replacement characters before screening; ambiguous, malformed, binary-like or unsafe decoding is rejected for excerpt release. Decode whole inspected portion using an incremental decoder that preserves character boundaries. Normalize CRLF and CR line terminators to LF for line selection/returned UTF-8 text, consistently across main scanner and hasher. Preserve other content and meaningful whitespace; no silent language/comment filtering.

**File stability/freshness:** `expected_mtime_ns` (if non-null) must equal the full-precision observed timestamp from the authorized handle *before* content release. Capture handle identity, timestamp and relevant size before and after screening/read; any observed mismatch or concurrent-modification indicator fails `STALE_SOURCE`, with no completed excerpt. Screen and construct excerpts from the **same bounded private byte capture**, not a separate unchecked reopen or a later file reread. A Windows API timestamp with 100-ns granularity may be losslessly expressed as nanosecond units using integer arithmetic; never fabricate subresolution precision or pass through JS floating-point. This is best-effort **file revision evidence**, not a guarantee against hostile mutation with restored timestamps. For a strong no-race proof, implement a demonstrated handle/snapshot protocol or deny when guarantees cannot be satisfied. The successful `observed_mtime_ns` is from the same handle/read epoch; unavailable exact representation means deny rather than send a rounded value.

**Line behavior:** 1-based inclusive logical lines after canonical line-ending normalization. Compute entire requested-line membership on the same securely opened source snapshot. Do not split a Unicode scalar in a returned excerpt. Bound complete emitted lines by max 200 requested lines and the effective min of user `max_chars`, hard 16,384 code points and remaining cumulative/binary wire budgets. Return actual inclusive line numbers; blank lines count as real lines; invalid/empty/out-of-range returns a safe rejection rather than an invented successful empty excerpt. `truncated=true` if some eligible requested lines are omitted for limits or EOF.

## 8. Deterministic layered secret/content protection — IIS07-D08

Enforcement order matters and is Main-owned:

**Gate S1 — subject identity:** verify project/workspace/parent/selector, regular-file and no-reparse status, sensitivity-deny basename/ancestor patterns and broker limits. A forbidden path is not opened for content and never appears in raw error output.

**Gate S2 — bounded content classification:** after approved opening, decode strictly and screen sufficient content to establish the policy for this excerpt **before any bytes are returned to Python or Renderer**. Frozen v1.0 uses a conservative **whole-file scan for eligible regular text files up to 8 MiB**, including local Renderer preview; larger files are content-denied with sanitized results while permitted discovery metadata may remain visible. The bounded *exact bytes captured for release* must be the bytes screened, with strict streaming decoding, cross-buffer signature matching and no reopen between screening and excerpt creation. Memory/resident-buffer accounting covers decoded text and temporary copies, not just the raw file size; when the worker cannot prove bounded memory or complete scanning, reject. An undecidable content safety result is denial, not a recommendation to ignore a warning.

**Gate S3 — secret signatures and contextual checks:** check known private key delimiters/material, credentials, bearer/auth tokens, common cloud keys, connection strings with passwords, known high-risk auth/config assignments and conservative **context-aware** high-entropy indicators. Apply a versioned deterministic policy with test vectors for variable encoding, boundary split, long credentials, false positives (ordinary hashes/test fixtures), and negative cases; false positives/false negatives exist. Do not claim mathematical entropy alone is an authoritative secret detector, and do not weaken a known-sensitive basename based on content. A normal source file with an embedded secret is sensitive regardless of extension or project/provider consent.

**Gate S4 — decision:** frozen v1.0 policy **DENIES** a suspicious source file/excerpt by default; no speculative partial redaction for secrets. Future narrowly verified redaction may be approved as a versioned policy, but no raw matching material may be handed off during that review. Do not permit an untrusted model/request to suppress sensitive checks or approve a secret exception. A user permission to send source to an external provider is not an exception to S1–S4.

**Gate S5 — last pre-release recheck:** after complete security screening and canonical excerpt construction, repeat active parent/scope, file freshness, provider consent where relevant, and cumulative budget checks before releasing safe bytes. On failure, discard candidate content, record safe denial metadata only and respond with a sanitized existing error code.

**No bypass channels:** no secret-bearing path strings in `excluded_count` diagnostics, inspection notes, UI preview, title, model prompt, summaries, derived decisions, task proposals, IPC notifications, audit hashes derived from protected contents, terminal logs, stdout/stderr, crash reports or retry caches. Keep screening buffers transient, bounded and zero/release as feasible; do not persist excluded source bytes.

**Security limitation:** a deterministic scanner is not a proof that an unseen or obfuscated secret is safe. Product text must not claim perfect protection. Adversarial windows, byte-split, encodings, entropy false positives and escaped/Unicode trick cases are mandatory tests, not assumed successes.

## 9. External-provider disclosure and source handoff — IIS07-D09

- The broker's local open/read policy applies identically to local and externally served models. For a **known external route**, even a fully safe source excerpt cannot be handed from Main to Python unless IIS-04 T6 has a *currently granted*, exact canonical project/workspace + **actual effective provider/destination** + `disclosure_class` consent. `models.setDiscussionPreference` is never consent.
- Main owns the `disclosure_challenges`/`disclosure_consents` records. The frozen pending challenge TTL is **15 minutes**. Only existing `disclosures.list/respond/revoke` IPC mutates that consent. An unresolved or changed effective provider identity is fail-closed, not an invitation to swap destination.
- **Last feasible trusted point is Main → Python source release.** Recheck live grant/status, bound *effective provider route* (according to IIS-06 route attestation), active parent and immutable source identity **immediately before scheduling the authenticated supervised child write**. Serialize the final consent check against Main's consent revocation write coordinator to order competing operations; do not assert atomicity with Python's later provider network send. Once Main released bytes to Python on an authorized external attempt, the source may already have been or may yet be sent to the provider; revocation cannot guarantee retracting an in-flight transmission. Do not promise a strict post-revocation no-send guarantee unsupported by the frozen wire. Stop new handoffs and conservatively invalidate/abort affected discussion work under IIS-03/IIS-06 where necessary.
- For genuinely local inference there is no *external-provider* grant requirement, but all file sensitivity and boundedness restrictions remain. User-pasted chat text and arbitrary other LLM egress are outside this specific broker's scope; **C-02 FFR-R01 universal gate remains expressly deferred**, not silently reinstated here.
- Python is **contractually allowed** to use a returned approved excerpt **only for the same parent discussion attempt and verified selected model/route**. It must not cache/reapply excerpts for another turn, new process, fallback provider or unrelated task. Main can enforce source release, but cannot remotely prove a recipient child never later copied its bytes: this restriction requires Discussion bridge conformance tests and must not be marketed as Windows sandbox enforcement. No `agent_os` or worker route consumes them as execution grants. Treat source comments/imported documents as adversarial *data* in model context, not system instructions.
- The wire result itself contains `content` after policy checks. No new per-file disclosure token/header/ACK is introduced. The trusted Main audit records allowed source handoff at the granularity it can really observe, not the remote provider's actual receipt.

## 10. Staged/adaptive inspection and hard resource ceilings — IIS07-D10

**Selection strategy:** Start with inventory (scoped high-value directories and permitted entrypoints), choose relevant manifests/modules, then request bounded source evidence in batches. Prefer structured, relevance-guided requested paths, not immediate whole-project ingestion. Relevance ranking is *advisory* from Python/LLM; Main enforces deterministic caps.

**Frozen v1.0 numerical policy, additionally bounded by IIS-01/IIS-06:**

| Resource dimension | Frozen v1.0 ceiling / initial target | Enforcement |
|---|---|---|
| Each discover request | Frozen `limit<=100`, `max_depth<=3`; default suggested `limit=40`, `max_depth=1` | Main rejects over-cap, does not silently widen |
| Eligible discovery entries per one parent discussion request | **1,000** total returned across pages | Reserve/account before return; stop with `RESOURCE_LIMIT` when exhausted |
| Discovery calls per parent discussion request | **30** | No endless paginated traversal; request/turn-scoped budget |
| Distinct fully observed file subjects read per parent request | **24** | More snippets may reuse subjects but cannot double-count file reads |
| Project read calls per parent request | **40** | Each inherits frozen <=200 lines and <=16,384 code points |
| Cumulative approved excerpt bytes handed to Python per parent request | **256 KiB UTF-8** | Account on actual encoded bytes and reserve before release |
| Maximum one opened file for full content safety scan | **8 MiB** file bytes | If larger or classification unsafe, refuse source content |
| Total file bytes actually scanned/classified per parent request | **64 MiB** | Charge actual scanning work (including repeat reads); fail at hard cap |
| One broker call elapsed | Frozen **30 s** | Earlier deadline wins; no prolonged blocking of Main event loop |
| Total broker processing time per parent request | **90 s**, measured monotonic elapsed time | Shared among calls; provider attempt's 300 s cap also applies |
| Concurrent broker operations for one parent request | **1** filesystem operation | Bounded serialization; no parallel budget race |
| Concurrent broker filesystem operations globally in v1 | **2** | Bounded Main worker queue; live UI remains responsive |
| Selector/cursor | Selector <=1,024 UTF-8 bytes; frozen cursor <=128 chars | Fail closed before OS access |

All thresholds in this table except explicitly marked inherited limits are **owner-approved IIS-07 D10 v1.0 decisions**, not claims about IIS-01 or C-02. Any later adjustment requires a reviewed amendment; they are not adjustable by Python, model prompts or Renderer preferences in v1. A request cannot create a new parent ID to escape its per-turn budget. If suspicious repeated requests attempt to circumvent a parent cap across new turns, Main may apply a bounded abuse-throttle without claiming an unapproved persistent account-wide quota.

**Budget mechanics (FFR07-R08):** Each parent identity combines supervised `process_session_ref` + exact `discussion_request_id` + Main-authorized discussion attempt; it is never a mutable latest-conversation pointer. Reserve operation counts/work capacity atomically **before** enqueue, including failed/denied attempted operations where relevant; measure deadlines with a monotonic clock from *enqueue*, including waiting time, and charge actual scan work even when content is denied. Release only **unused** byte reservations on safe failure; do not refund executed scans or allow retries to reset counters. Proposed additional v1 queue guard: **16 queued broker operations globally / maximum 4 queued per parent**, while filesystem operations remain max 2 globally and max 1 per parent. Renderer previews also consume global worker capacity and have a bounded per-sender queue; they **do not** borrow or increment Discussion inspection counters. On process death/restart revoke all associated parent budgets/cursors (no resurrected old parent IDs). Any excess is rejected with the existing `RESOURCE_LIMIT` / `BROKER_IO_ERROR`, never silently queued without bound. The 256 KiB broker output budget is independent of the frozen `discussion.send` ContextV1 96 KiB and actual model token budget; no suggestion to send all previously inspected bytes to the model. If effective model context is insufficient, IIS-06 narrows projected context or reports a limit, not silent provider fallback.

**Progressive expansion:** A later *new user message* may request narrower additional inspection under its own authorized discussion parent; historical `project_inspections` evidence can be displayed safely, but previous read/consent cannot be silently transferred as fresh source evidence across revisions. No generic scanning daemon or indefinite auto-recursion.

## 11. Request lifecycle, cancellation and resource failures — IIS07-D11

**States in Main internal coordinator (not new IPC/wire enums):** `validated → queued_bounded → opening → screening → ready_to_release → completed` or `denied|stale|failed|budget_exhausted|aborted`. None authorizes engineering execution. Parallel request count, deadline, memory, and parent invalidation are checked through every transition.

- Fail early before disk I/O on invalid role, foreign/stale parent, invalid path grammar, unregistered root, wrong page cursor, or exhausted deterministic quota.
- If the parent discussion completes, its Python child dies, the user cancels the permitted discussion inspection via existing supported lifecycle controls, the project becomes unavailable, or the active release consent is revoked, abort queued and in-flight operations as far as enforceable; discard transient result buffers. **No new `project.cancel` or `inspection.cancel` command is invented.** Parent request timeout/abort is not a Coding Task cancel.
- A single broker call may finish as a sanitized `response.rejected` for `NOT_AUTHORIZED`, `WORKSPACE_MISMATCH`, `SENSITIVE_CONTENT`, `STALE_SOURCE` or `RESOURCE_LIMIT`. OS errors use existing `BROKER_IO_ERROR` (or proven applicable existing enum). Do not introduce `DENIED` / `BUDGET_EXHAUSTED` as new wire error literals: these are internal/UX concepts mapped onto the frozen error taxonomy.
- Timeouts and partial provider/bridge failure cannot be represented as successful reads with missing lines. Python must distinguish actually returned source evidence from denied/unavailable source; no assumption that a timeout means no bytes could have been sent after an earlier successful release.
- Do not automatically retry an already-returned broker operation if reissue could double spend time/bytes/observations; any safe retry must be independently authorized under the active parent, re-screened/re-budgeted, and deduplicated at the appropriate durable observation layer. No future failed discussion attempt triggers an automatic potentially billed provider resend.
- Exact same-read replay is not a promised caching protocol; `response.completed` is successful only for evidence obtained under the current request and scope. Stale `expected_mtime_ns` never changes to a fresh value silently.

## 12. Safe Renderer listing and preview DTO projections — IIS07-D12

These are the **existing** IIS-02 public methods, not wrappers to the Python broker or new renderer tools:

- `projects.listFiles(projectId, relativeDir, cursor, limit)` returns only its frozen `FileListingPage` type; use the same containment/exclusion policy, bounded page size and cursor/scope validation. No secrets, absolute roots, inaccessible protected names or unsolicited full-directory traversal in a UI browse.
- `projects.previewFile(projectId, relativePath, range)` returns only frozen `SafePreviewResult={projectId,relativePath,text,truncated,sourceRevisionLabel}` for an eligible **screened** bounded textual preview. Apply the same decode/safe full-file screening gate and 8-MiB candidate max; use its existing frozen preview-range and DTO limits, never replace them with `project.read`'s wire result fields. This document supplies stronger internal ceilings only when they do not contradict existing IPC limits.
- UI file lists and previews are ordinary project browsing, not `ProjectInspectionProgressChanged` or a model source release. They do not independently grant external consent or create a `discussion.send` request. Display only escaped text, never execute source code or interpret model-controlled HTML.
- A UI selection may change between request and response: Main returns the **verified project identity**; the Renderer must bind it to its requesting project, not whichever workspace is currently visible. Canceling a preview is local/UI control and cannot stop a supervised coding task.
- Preview result `sourceRevisionLabel` is a safe Main-generated freshness label; it is not the wire `observed_mtime_ns` unless the frozen DTO permits that representation. No raw credential/config path in UI errors.

## 13. Durable evidence and exact IIS-04 mapping — IIS07-D13

**Use exclusively the frozen 22-table IIS-04 schema.** In particular, `project_inspections` holds verified conversation/project, status, discovered/actually-read/excluded counters, partial coverage and `evidence_revision`; `inspection_observations` stores `(inspection_id,observation_key)` plus uniqueness of `(inspection_id,observation_kind,subject_key)` for non-null subjects and an `evidence_digest` / `count_delta`.

**FFR07-R01 authoritative observation boundary:** `read_file` means Main demonstrably completed a safe authorized content read **and a bounded local write of the exact completed `project.read` response to the authenticated supervised Discussion stdio transport**. It **does not** mean the model understood the text or that a provider received it. A safe screened byte buffer merely prepared for release is not `read_file`. A transport write callback proves only Main-side handoff, not Python processing; this narrower fact is the maximum Main can prove without a new frozen-protocol ACK. After successful local transport write, Main commits the deduplicated `read_file` observation and count in a single SQLite transaction, and **only after that commit** publishes a durable inspection progress hint. There is an unavoidable write→commit crash window: actual bytes may have left Main yet the DB may **undercount**; retain partial/uncertain coverage, never synthesize a read on restart or claim an audit-complete disclosure log. If DB fails after transport release, refuse subsequent broker operations that require evidence; do not send a fabricated success/error frame for a request whose response is already written. A consent grant was required at release regardless of later evidence success. No parent requires guaranteed complete accounting of all physical byte handoffs; if that stronger property becomes a requirement, freeze blocks pending an approved protocol/transaction redesign.

**Frozen v1.0 internal observation semantics:**

| Observation kind (frozen enum) | When inserted | Dedup subject | What counts |
|---|---|---|---|
| `discovered_file` | A safe eligible regular file was actually enumerated in an authorized Lane-A discovery page | Stable non-sensitive file-subject key within inspection | Distinct discovered files actually seen, **not** all possible files |
| `read_file` | A nonempty, approved source excerpt was screened and its completed wire response successfully handed off by Main to the bound supervised stdio transport | Stable identity for that same eligible file within inspection | `actually_read_count` increments **once per file**, not once per excerpt |
| `excluded_page` | An actual bounded discovery segment concludes with policy-excluded items counted without disclosing names | `subject_key=NULL`, stable unique observation key for page/generation | `excluded_count` increases by verified nonduplicate per-page count only |

**Evidence rules:**

1. Allocate or associate an authorized `inspection_id` from Main-bound conversation/project; no cross-project or model-chosen inspection row. A revived view may read prior evidence but cannot silently merge unrelated inspections.
2. Use a versioned deterministic canonical identity for **safe, permitted** files: workspace volume/file object identity + normalized scope-relative path + broker policy version; derive opaque `subject_key`/`observation_key` without recording protected raw paths. v1 uses **Main-held keyed digests** (HMAC over canonical descriptor with a persistent per-installation secret kept outside chat SQLite) for safe file subjects and page scopes. The implementation must verify secret availability and version/identity **before resuming an existing inspection**. On backup/restore, key loss, rotation, changed file-ID semantics or inability to prove continuity: mark the old inspection **historical/partial**, refuse to add observations to it, and begin a **fresh `inspection_id`** only with newly evidenced Main-scoped identity. Do not mix new HMAC keys into an old inspection, reset its counts, silently reconcile old and new identities, or store protected paths/secret values to make keys reconstructible. The old evidence is retained as history, not authenticated proof of live coverage. Do **not** derive a guessable plaintext hash of sensitive excluded names.
3. For excluded pages, record only a safe page/generation identity, bounded aggregate count and digest; never store raw sensitive filenames, directory contents or secret-bearing request text. For actual reads, store the **digest of verified metadata/provenance** (and, where safe, digest of the emitted excerpt) but never original excerpt bytes or detected secret values in inspection rows.
4. For a newly proven observation, insert the observation **in the same SQLite transaction** as updating `project_inspections` count(s) and `evidence_revision`. Identical observation/evidence retry is a no-op; same key with conflicting digest is a safe integrity error; the `read_file` distinct-subject uniqueness prevents multiple chunk reads from multiplying `actually_read_count`.
5. When a subsequent excerpt is handed off for the **same subject and verified same file revision** within one inspection, it does not create another `read_file` observation or count, even if the emitted excerpt digest differs: the existing observation remains the durable proof of the first counted local handoff. Validate the existing subject identity/revision before skipping insertion. If actual file revision or canonical subject identity differs, **do not insert an observation with a conflicting digest under the old subject**: mark older coverage partial/stale and require a fresh inspection identity for a new count. This respects both unique indexes without inventing an `observation_kind` or suppressing genuine integrity conflicts. Preserve earlier evidence; never fabricate a new source revision.
6. A `read_file` counts only a *successfully handed-off to bound Discussion transport* screened excerpt, not a file merely opened for scanning, a failed/secret-denied read, or a local Renderer preview. A local transport write is **not** proof of Python consumption, model understanding or external network arrival. Model comprehension and remote-provider receipt are not established by this count.
7. Process interruption before the post-handoff evidence COMMIT never produces a trusted increment. A DB failure in the transport-write→commit window creates **conservative undercount/unknown coverage**, not a fictitious committed observation, and never authorizes an automatic source resend. The UI may not claim the audit log is complete. Discovery observations (files actually enumerated by Main) may be committed earlier under their own distinct semantics; **neither discovered nor prepared-to-release evidence may be reclassified as `read_file`**. On restart, Main must not infer receipt from the presence or absence of a response frame in SQLite; no new ACK or table is introduced.

**Important scope:** `project_inspections.state` is the frozen IIS-04/IIS-02 inspection enum, not a new `task_events` event or a separate durable Python audit log. No 23rd table or raw-source column is authorized. The frozen `schema_migrations` mechanism continues to govern the existing DB, not a new migration proposed by this paper.

## 14. Truthful inspection coverage and UI notifications — IIS07-D14

- Main can show `not_started|discovering|reading|analyzing|completed|partial|failed` only according to the **already frozen** UI/DB states and verified broker/coordinator evidence; no new public event subtype.
- Display discovered, read and excluded **counts as separate quantities** where grounded. `discovered_count` can remain `NULL` if no bounded enumeration supported a defensible count. A listed file ≠ source inspected; source inspected ≠ whole file interpreted; a percent without a valid denominator is forbidden.
- A page that ends `complete:true` supports only a **local scope/page completion** claim. A project-wide inspection conclusion requires proof of full traversed eligible scope with no budget, stale, sensitivity, or unvisited branches; otherwise label coverage **partial** and identify safe unexplored areas without exposing protected filenames.
- `ProjectInspectionProgressChanged` is an existing **conversation-scoped IIS-02 UI hint** reflecting Main-trusted inspection state; it is **not** an IIS-01 `task.progress` or IIS-05 worker event, and consumes no Coding Task event sequence. Push sanitized, bounded changes after committed state; Renderer re-reads `conversations.read` (subscribe-before-snapshot contract) after hints and reloads.
- Model-supplied reasoning stages ("analyzing modules") may be labeled advisory unless backed by verified coordinator operations. A model's `I read all files` string does not override coverage status. Do not display a green completed state for a partially reviewed repository.
- Failure, source mutation, policy denial, request budget, interruption and provider uncertainty retain persisted partial coverage; continued chat and model switching do not erase earlier evidence or cross-bind it to a different project.

## 15. Scope changes, revisions, consent and cache invalidation — IIS07-D15

- Parent project/workspace identity is frozen at Main issue of `discussion.send`, regardless of navigation. Selecting a different project for the next user message never retargets this one.
- When project root identity changes, a path becomes reparse-linked, a relevant directory listing mutates, file metadata changes or inspection policy version changes, invalidate affected caches/cursors and re-check safety before the next release. A stale cached preview is not proof that current disk bytes match.
- No durable raw content cache in SQLite and no cross-attempt replay cache in Python. Any Main transient cache of **already screened safe excerpts** must be scoped to exact canonical file object/revision, request/session and policy version, with bounded memory and no persistence; default v1 is **no plaintext cross-request cache**. Even from cache, external route permission must be rechecked at release.
- IIS-04 retained discovery/read evidence is historical: it can describe what was observed at a time but does not itself authorize or prove a fresh read. Changes do not rewrite that evidence.
- Changing the selected model/provider while a discussion turn is in flight does not silently change its effective provider; IIS-06 requires an immutable validated route for that attempt. Provider-switch consent checks apply to **future** handoffs in the actual bound attempt.
- Secret policy updates should be versioned and invalidate older safe-result candidates. A detected leak requires error reporting and safe audit without preserving the raw secret.

## 16. Errors and deterministic fail-closed mapping — IIS07-D16

| Situation | Existing IIS-01 response/error code | Truthful Main/UI outcome |
|---|---|---|
| Foreign/ended parent, wrong role, nonregistered project | `NOT_AUTHORIZED` or `WORKSPACE_MISMATCH` | No filesystem access, no enumeration |
| Absolute/traversal/ADS/device/unsafe selector | `NOT_AUTHORIZED` or `BAD_SCHEMA` (shape vs permission) | No access, sanitized generic input refusal |
| Reparse escape, unsafe handle identity, inaccessible protected target | `NOT_AUTHORIZED` / `SENSITIVE_CONTENT` as applicable | No path/content leak, partial scope |
| Sensitive name, secret in content, undecidable scanner | `SENSITIVE_CONTENT` | Nothing returned; safe exclusion/denial evidence only |
| Stale `expected_mtime_ns`, invalidated page cursor or changed file identity | `STALE_SOURCE` | Retry only under a fresh authorized parent/revision |
| Too many entries/lines/chars/bytes, line beyond EOF, aggregate budget | `RESOURCE_LIMIT` | Visible partial/budget limitation, not empty "success" |
| OS read error, timeout/inaccessible file | `BROKER_IO_ERROR` or `RESOURCE_LIMIT` as frozen | No fabricated excerpt, verified partial stage |
| Missing/revoked or wrong-scope external project-source consent | `NOT_AUTHORIZED` | Challenge/denial through existing IIS-02 UI when eligible, no release |
| Main SQLite cannot persist required trusted inspection evidence | Fail closed, safe internal/database unavailable UI state | No unsupported durable read-count claim |

Use only the frozen IIS-01 `reason` or `error` shape; do not smuggle extra diagnostic fields. Sanitize messages to avoid leaking denied filename, secret fragments, device path, provider credentials or exception stack. A `retryable:true` hint for an ordinary read does not authorize an automatic provider/model send, and never allows task execution.

## 17. Example flows (illustrative, not actual results)

**Safe question over project files:** User asks about code architecture → Main persists user message (IIS-04 T1) and sends bounded `discussion.send` → READY Python requests `project.discover` with exact active `discussion_request_id` → Main checks root, cursor, exclusions and budget → only actual safe names return → Python requests `project.read` for an allowed text file → Main opens handle, scans, checks freshness, budgets and any external-source consent → records valid evidence/approved release → returns exact file excerpt/result → Python answers as a non-executing discussion. No Run Task appears unless a separate proposal exists; no code runs.

**Denied secret in ordinary code file:** A file named `config.ts` includes a provider token. Path appears ordinarily eligible, but whole-file sensitive scan flags secret → `SENSITIVE_CONTENT` rejection → no excerpt, no sensitive path/value in message or provider. Consent cannot override.

**Stale parent + second project:** User switches UI to project B while active discussion in project A. Existing parent stays A. An attempted `project.read` with B's path under A scope fails; B cannot be inferred from UI selection. On process restart, the earlier `discussion_request_id` cannot be reused on a new session.

**Revoked consent race:** A previously granted external route is revoked after Main has already handed an approved excerpt to Python. Main stops subsequent releases; it does **not** assert the already released bytes never reached the provider. Preserve safe uncertain exposure accounting and follow IIS-06 process reconciliation.

**Directory mutation:** A file is renamed between discover pages. Cursor generation becomes stale; a page is rejected rather than claiming a complete inventory. Previously committed evidence remains historic but coverage partial.

**Budget pressure:** An inspection has read 24 distinct safe files but a model asks for another. Main rejects extra project.read under the frozen IIS-07 per-parent ceiling, leaves only grounded earlier evidence and a partial/budget-limited coverage statement. It does not open the 25th file or change to AgentOS.

## 18. Architecture/parent traceability — IIS07-D17

| Frozen authority | Binding item | IIS-07 mapping |
|---|---|---|
| NCD-02, C03-D10 | Main owns disk broker; no direct Python unrestricted FS; private stdio JSONL | §§2–5 |
| C02-D10–D12 | Read-only project awareness, broad text eligibility, sensitive exclusions | §§1, 3, 7, 8 |
| C02-D13–D14 | Staged, truthful inspection/coverage; no guessed percentage | §§6, 10, 13, 14 |
| C02-D15–D16 | Scope-bound external consent + secret/path/content screening; revocation | §§8–9, 15 |
| C02-D17 | Adaptive evidence acquisition under finite hard ceilings | §10 |
| C02 FFR-R01 | Universal LLM-egress gate explicitly deferred | §9 |
| IIS-01 D13–D15 | Exactly two broker commands, results/envelopes and fixed per-wire caps | §4, §16 |
| IIS-02 v1 | `projects.listFiles/previewFile`, conversation inspection push/snapshot; no new methods | §§2, 12, 14 |
| IIS-03 v1 | Bound supervised child session; no unsafe new execution path | §§3, 11 |
| IIS-04 v1 | 22 tables; inspection observations/counters same-transaction, source/consent authority | §§9, 13 |
| IIS-05 v1 | Broker inspection hints separate from task/worker event sequence | §14 |
| IIS-06 v1 | Active parent, route-fixed source handoff, consent revocation limits | §§3, 9, 15 |
| C02-C01 and IIS-02-C01 | Decision-candidate deferral and bounded conversation read projections untouched | §§1, 14 |

**Parent-change test:** If implementation requires an extra JSONL field/action, extra public IPC, 23rd table, permanent content cache, universal egress proxy or general Python filesystem tool, it is **not** an IIS-07 detail. Stop and submit an explicit narrow parent correction for the owner's approval. No silent amendment.

## 19. Executable verification/attack matrix — IIS07-D18 (DESIGNED, NOT RUN)

The following **56 frozen acceptance-test requirements** are obligations for a future authorized implementation. They are **not** evidence of working code, a Windows security result, or a completed build.

| ID | Scenario | Required demonstrated behavior |
|---|---|---|
| I07-T01 | Valid READY discussion child, live parent discover | Exact authorized request and safe page only |
| I07-T02 | Coding child calls discover/read | Rejected by role before disk access |
| I07-T03 | Discussion child passes other turn ID, same connection | Rejected, no cross-turn read |
| I07-T04 | Old parent ID after completion/process restart | Rejected, no authority resurrection |
| I07-T05 | Parent `project_ref:null` | Deny both broker actions |
| I07-T06 | UI switches workspace during active A discussion | A retains A scope; B not read |
| I07-T07 | Absolute, drive-relative, UNC, device paths | All rejected before opening |
| I07-T08 | `..`, `.`, empty components, encoded-looking variants | No traversal or implicit decoding |
| I07-T09 | NTFS ADS (`:`), Windows device names and trailing-dot alias | Rejected/never opened |
| I07-T10 | Symlink or junction inside authorized tree | Not followed under v1 policy |
| I07-T11 | Reparse outside-root alias / mount point | No escape, no raw path leak |
| I07-T12 | Concurrent ancestor swap / handle-open race | Handle-proven scope or safe denial |
| I07-T13 | Filesystem case/short-name/unicode alias | No alternate bypass or false identity |
| I07-T14 | Special device/named pipe/socket/shortcut | No content read or traversal |
| I07-T15 | Unknown extension ordinary UTF-8 text | Eligible if otherwise safe |
| I07-T16 | `.env`, `.env.local`, private key and credential catalog | Excluded before content release |
| I07-T17 | Secret in ordinary `.ts` / `.json` | Denied despite eligible name |
| I07-T18 | Secret split at scan I/O block boundary | Detected; no unsafe excerpt |
| I07-T19 | Secret outside requested lines but within safe scan scope | File denied under whole-file scanning candidate |
| I07-T20 | Malformed UTF-8/UTF-16, binary payload, NUL-heavy text | No replacement-character bypass, deny |
| I07-T21 | BOM and mixed line-ending deterministic handling | Stable line bounds, excerpt SHA over exact emitted bytes |
| I07-T22 | Empty file / requested span fully past EOF | Sanitized `RESOURCE_LIMIT`, no fake lines |
| I07-T23 | Request partly past EOF | Real emitted lines and `truncated:true` |
| I07-T24 | First line > character budget | Deny rather than falsely claim full line |
| I07-T25 | Non-BMP Unicode characters and code-point caps | No scalar split, correct bounds and bytes |
| I07-T26 | `mtime_ns` above JS safe integer | Lossless decimal compare and return |
| I07-T27 | Expected revision stale, modify-while-read | `STALE_SOURCE`, no completed data |
| I07-T28 | Valid scoped, paginated discover with hidden exclusions | Correct safe page entries and true exclusions |
| I07-T29 | Cursor altered, replayed in other project/turn | Rejected and no data leak |
| I07-T30 | Directory mutation between pages | Partial/stale, never fabricated full coverage |
| I07-T31 | Oversized discover limit/depth/cursor | Strict frozen IIS-01 rejection |
| I07-T32 | Per-excerpt >200 lines or >16,384 chars | Strict rejection/truncation per schema |
| I07-T33 | Per-parent discover 1,000 entries and 30 operations | Global reservation/denial proof |
| I07-T34 | 24 distinct read subjects / 40 reads cap | No 25th subject or 41st operation |
| I07-T35 | 256 KiB excerpt + 64 MiB scan caps | No accumulated overflow or leak |
| I07-T36 | 8-MiB file cap and 90-s parent budget | Fail within bounds and show partial inspection |
| I07-T37 | Concurrent parents flood broker queue | <=2 global I/Os, no event-loop starvation |
| I07-T38 | Provider unresolved, no grant | No external-source handoff |
| I07-T39 | Exact project/provider/class consent | Safe excerpt handoff only to exact route |
| I07-T40 | Provider swap, grant revoked or wrong scope | New handoffs blocked; no silent fallback |
| I07-T41 | Revoke during Main→Python→external-send race | Limitations accurately enforced/disclosed |
| I07-T42 | Local-model source read with sensitive file | No external grant needed but sensitive deny remains |
| I07-T43 | Duplicate discovery/read evidence and page retry | At-most-once count increment per observation key |
| I07-T44 | Same subject multi-line chunks/revisions | One distinct read file; truthful stale revision |
| I07-T45 | SQLite failure at evidence commit vs response | No false durable progress or leaked denied content |
| I07-T46 | Renderer local preview/list vs discussion evidence | Same access policy, separate scopes/counters |
| I07-T47 | Renderer re-open after process crash | Partial evidence restored, no fake full scan/task event |
| I07-T48 | Model prompt injection in returned source | No command/tool/Run Task/permission escalation |
| I07-T49 | Broker write callback succeeds then Main crashes before evidence commit | No false durable count, no auto-replay, visible partial/unknown audit |
| I07-T50 | Prepared/committed read candidate fails pipe handoff | Never increment `read_file`; no double response or synthetic release proof |
| I07-T51 | Backup/restore with missing or rotated HMAC secret | Old inspection closed partial; new inspection ID; no mixed-key dedup |
| I07-T52 | Cursor token too small for full scope descriptor; Main restarts | Bounded opaque handle expires; no fallback stale enumeration or leaked fields |
| I07-T53 | Entry `size_bytes` beyond JavaScript exact integer range | Existing nullable size returns `null`, never imprecise rounded integer |
| I07-T54 | Hard race: writer changes same-length content and restores mtime | Capture/screen only same bounded bytes; require demonstrated safe gate or deny |
| I07-T55 | 16 global queued / 4 parent queued operations; interleaved Renderer calls | Bounded fair scheduling, no starvation or per-parent budget bypass |
| I07-T56 | Provider grant revocation races Main's last check/local write | Total order for Main release and revocation; no claim about later provider arrival |

### Required test evidence package

1. Shared strict JSONL + IPC positive and negative fixtures and stable canonical path/encoding validators in TypeScript/Python, without adding wire actions.
2. Windows-specific adversarial filesystem fixtures (reparse/junction/ADS/device/alias and coordinated rename/replace races) with actual handle evidence, not only string-based unit tests.
3. Bounded full-file classification/secret-pattern positive/negative fixtures (including cross-buffer, Unicode, UTF-16, malformed/binary and false-positive handling).
4. Main coordinator concurrency/budget/fault-injection tests; wall-clock timeouts, process cancellation, exhausted resources and cross-parent scope spoofing.
5. IIS-04 SQLite observation dedup/rollback/restoration/metadata-provenance tests; explicit distinction between observation committed and safe excerpt actually delivered.
6. IIS-06 real/fake route validation, grant/revocation races, stored conversation reload and source payload nonleakage; IIS-05 separation from worker task events.
7. Demonstration that the implemented Discussion child cannot simply open arbitrary file paths using a hidden helper or direct filesystem tool. **If application-level separation is insufficient for the intended threat model, escalate scope; do not claim a full Windows sandbox.**

## 20. FFR-01 documentary review history — corrections incorporated prior to freeze

**Historical FFR-01 disposition: CONDITIONAL PASS / owner freeze was pending at that stage.** Consolidated documentary review was performed on Draft v0.1 against the frozen parent files and eight risk gates; its outcome is recorded in `NCD-03-IIS-07-FFR-01-CONSOLIDATED-REVIEW.md`. R01–R08 were repaired in Draft v0.2 and subsequently **owner-approved for final IIS-07 v1.0 freeze**. This table records the earlier documentary finding and pending executable evidence.

| Gate | Corrective rule | Location in v0.2 | Status |
|---|---|---|---|
| FFR07-R01 | `read_file` requires verified local wire handoff before durable increment; admit crash undercount, never claim recipient ACK | §13 | Documentary repaired; runtime proof pending |
| FFR07-R02 | HMAC identity/key lifecycle; old inspections cannot be merged after missing/rotated key | §13 | Documentary repaired; restoration tests pending |
| FFR07-R03 | Handle-first Windows ancestor/reparse opening, same captured bytes, fail closed without proven platform path | §§5,7 | Documentary repaired; Windows security gate still required |
| FFR07-R04 | Bounded Main-local cursor state, exact scope, mutation invalidation, no fake completion | §6 | Documentary repaired; filesystem tests pending |
| FFR07-R05 | Whole-file bounded screening for both lanes; context-aware deterministic rules/unknown decode denial | §§7–8 | Documentary repaired; secret-corpus tests pending |
| FFR07-R06 | Last Main release + revocation ordered locally; downstream LLM send remains unobservable | §9 | Documentary repaired; bridge proof pending |
| FFR07-R07 | Exact DTOs, safe integer/null size, full-precision mtime and no new fields | §§4,6,12 | Documentary repaired; schema fixtures pending |
| FFR07-R08 | Immutable per-parent budgets, 16 global / 4 parent queued, deadlines from enqueue, restart invalidation | §§10–11 | Documentary repaired; concurrency tests pending |

**No parent change authorized/needed by this paper:** IIS-01's two broker actions and five root-envelope keys; IIS-02's 23 methods and typed returns; IIS-04's 22 tables and observation kinds; IIS-05's separate inspection-notification channel; IIS-06's disclosure boundary. If Windows identity, a remote receipt guarantee or a new cancel/retry facility cannot be implemented under these contracts, that is a **future blocked implementation gate**, not permission to invent a hidden interface.

**Evidence boundary:** this PASS is documentary only. No Windows handle-race injection, secret detection corpus, DB crash experiment, Electron/Python executable integration or implementation test was run in this review.

## 21. Owner-approved decision register — IIS07-D01–D18 FROZEN v1.0

| Decision | Scope |
|---|---|
| IIS07-D01 | Mission, read-only authorization and non-goals |
| IIS07-D02 | Two file-read lanes with one Main-owned policy engine |
| IIS07-D03 | Canonical project root and active parent/request binding |
| IIS07-D04 | Strict existing broker wire schemas and response semantics |
| IIS07-D05 | Windows relative path, reparse and TOCTOU controls |
| IIS07-D06 | Safe discovery, cursor scope and truthful completeness |
| IIS07-D07 | Broad strict-text eligibility, file identity, decoding and lines |
| IIS07-D08 | Multi-stage secret exclusion, scan, deny policy |
| IIS07-D09 | Effective external-provider consent, revocation limitations |
| IIS07-D10 | Adaptive inspection and finite numeric resource caps |
| IIS07-D11 | Parent lifecycle, cancellation/timeout and safe failures |
| IIS07-D12 | Renderer preview/listing boundaries without new IPC |
| IIS07-D13 | IIS-04 observations, dedup, safe provenance and count semantics |
| IIS07-D14 | Truthful conversation progress and historical partial coverage |
| IIS07-D15 | Revision/root/consent/cache invalidation |
| IIS07-D16 | Exact existing error mapping, no diagnostic leak |
| IIS07-D17 | Parent traceability and no implicit contract changes |
| IIS07-D18 | Acceptance/attack testing matrix and evidence standard |

---

## 22. Final documentary freeze declaration — 2026-10-20

**Independent owner authorization:** “اجل الان ننتقل للتجميد” — explicit approval to freeze IIS-07 after presentation of the FFR-01 consolidated review and eight incorporated corrections. The final approved base is the exact `v0.2-REVIEWED` snapshot preserved independently as `v0.2-ARCHIVE`. This v1.0 copy updates status and approval terminology only, plus this freeze declaration, without introducing new transport, IPC, schema, execution, permissions, or technical behavior.

**FROZEN scope:** IIS07-D01–D18 and FFR07-R01–R08; 56 future security/integration test requirements I07-T01–I07-T56. Frozen IIS-01 through IIS-06 and the narrow owner-approved C-02-C01 / IIS-02-C01 addenda remain superior parent authority. The Windows TOCTOU/handle-containment security proof, secret scanner corpus, HMAC lifecycle, provider-release/revocation races, durable broker evidence, serialization, and resource-control conformance are **implementation acceptance gates not yet verified**.

**Design-only assertion:** Electron Main still owns the broker; the only existing Python actions are `project.discover` / `project.read`; the only local Renderer read methods are `projects.listFiles` / `projects.previewFile`; no additional IPC method, JSONL message, SQLite table, OS sandbox, or general-purpose provider egress gate is introduced. The approved broker is read-only for Discussion; task execution continues to require explicit user Run Task. The owner has not authorized implementation, source changes, database migrations, new Desktop repository creation, runtime tests, or deployment.

**Historical interpretation:** §§1–19 specify the approved v1.0 behaviors; §20 documents the pre-freeze FFR-01 status and the runtime tests that still need evidence. Former references to a *candidate* in historical discussions do not supersede this final declaration. The separate Final Freeze Record stores immutable SHA-256 fingerprints and next-stage authorization scope.

**Final disposition:** **PASS FOR DOCUMENTARY FREEZE — IIS-07 FROZEN v1.0 / OWNER APPROVED / IMPLEMENTATION NOT AUTHORIZED**.

---

**End of IIS-07 FROZEN v1.0.**
