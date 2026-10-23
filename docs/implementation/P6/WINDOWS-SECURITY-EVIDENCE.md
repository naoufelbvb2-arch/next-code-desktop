# P6 Windows security evidence — 2026-10-23

Evidence is from the actual Windows x64 host and synthetic NTFS directories under
ignored `.test-profiles/`. It is a tested development implementation, not a claim
about every Windows filesystem, malicious kernel/filter driver, packaged install
or compromised launching user. No attack used private user-project files.

## Implemented and observed native protocol

`windows-files.ts` uses CreateFileW, GetFileInformationByHandleEx, GetFileType,
GetFinalPathNameByHandleW, GetVolumeInformationByHandleW, ReadFile and CloseHandle.
FileIdInfo supplies volume/file identity; Basic/Standard/AttributeTag information
checks revision, file type, link count and reparse state. FileCaseSensitiveInfo
must be available and report ordinary case-insensitive semantics. NTFS is required.
Volume GUID, canonical long path and file ID bind the persisted workspace key.

The implementation opens every drive-to-root and scope ancestor before its next
child lookup, with OPEN_REPARSE_POINT/BACKUP_SEMANTICS and READ-only sharing. It
retains these handles plus the leaf handle through capture/screen/release. The
path lookup itself is DOS-path-based; its scope defense is the pinned ancestry
plus object/volume/type/name verification. No realpath/reopen or textual prefix
alone supplies authority. Only Main/worker-owned handles enter native calls.

The documented [CreateFileW sharing semantics](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew)
support the intended write/delete exclusion. This is supplemented by observed
tests, including a writable mapped view after its original file handle closed.
Attribute-only writes are a separate concern: Main re-inspects the same retained
leaf and ancestors immediately at child-write scheduling. The worker alone owns
CloseHandle. A synchronous lease/deadline/cancel guard prevents borrowed-handle
verification after release; native values never cross Renderer/Python boundaries.
No atomicity with later Python/provider receipt or hostile future metadata changes
is claimed. Content bytes are the same immutable bounded capture screened earlier.

Native information/enumeration layouts follow Microsoft's
[handle information API](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-getfileinformationbyhandleex)
and [extended directory record](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_id_extd_dir_info).
Koffi's pinned local `doc/pointers.md` documents Win32 HANDLE/BigInt representation;
actual cross-thread same-process verification is tested, not assumed.

## Executed evidence

| Test | Actual observed boundary |
| --- | --- |
| P6-W01 | Native chain, NTFS identity, exact capture, normalized excerpt, native directory enumeration |
| P6-W02 | Retained root/ancestor/leaf refuse rename/replacement and new content writer |
| P6-W03 | Pre-existing writable file handle makes capture fail closed |
| P6-W04 / W07 | Real inside/outside junctions not followed; hard-link aliases denied |
| P6-W05 / B10 / B11 | Replaced or moved registered root denied, unavailable, old identity/history retained |
| P6-W06 | Real writable section/view remains after original handle closes; capture is denied |
| P6-W08 | Nanosecond decimal precision and post-capture attribute mutation checks |
| P6-W09 | Separate native worker keeps capture pinned against ten coordinated directory/write attempts |
| P6-W11 | Actual ASCII case variant works; actual generated 8.3 alias is refused |
| P6-W12 | Main inspects real worker-owned handles; verification after lease completion is refused |
| P6-B12 | Timestamp changed after worker preparation but before final write hook: STALE_SOURCE, no source/count |
| P6-B13 | UI/Discussion/project cursor scope cannot be crossed; later source revision cannot add old evidence |
| P6-L02 | Revoke commits before pending write hook: no approved content release or read count |
| P6-L03–L05 | Actual 30/1000 discovery, 24/40 reads, 256 KiB excerpts, 64 MiB scans and 8 MiB file caps |
| P6-L07–L09 | Actual bounded pool overload/cancel, responsive Main ticks, 30s operation and 90s parent expiry |
| P6-L06 | Actual WAL backup/restore, missing/rotated HMAC, fresh inspection/subject IDs, old history retained |
| P6-E01 | Actual Electron Main/worker/typed Preload/React local preview and sensitive-content refusal |
| P6-E02 | Actual Windows Job, production Discussion, discover/read, exact consent, original Gateway + HTTP mock |
| P6-E03 | Native fixture Main termination after real pipe callback before SQLite COMMIT; restart partial/zero read, no replay |
| P6-E04 | Actual two-turn text discussion through the same route with no source/broker/paid call |

P6 policy tests cover literal selectors, traversal/absolute/UNC/device/ADS grammar,
sensitive categories, full-file secret patterns, escaped/cross-block secrets,
strict UTF-8/BOM UTF-16 LE/BE, binary/malformed rejection, scalar/line/EOF behavior
and exact normalized excerpt hashes. These exercise the production scanner.
Model prompt injection fixtures remain inert data: no tools, task/event creation,
AgentOS call, shell fallback or source reuse in a later ordinary turn.

## Explicit limitations and non-evidence

P6-W10 is NOT_RUN: file symlink creation returns EPERM without elevation. No global
or Administrator setting was changed. Junctions and all-tag rejection ran; this
does not turn the missing symlink trial into PASS. Real volume-mount creation,
case-sensitive directory configuration, device/socket/named-pipe attack fixtures
and >JS-exact-range physical file size were not demonstrated. Such paths/types
remain denied by production policy; the 56-case JSON register states PARTIAL or
NOT_RUN where only subsets or source review exist. No local inference provider
was added just to claim a local-model acceptance case.

The same-size/mtime-restoration attack is addressed by excluding writable handles
and mapped writers and using the exact retained capture, not by trusting mtime
alone. W09 coordinates attempts during the pinned epoch; it is not a universal
randomized filesystem stress proof. Cross-file snapshots are not atomic project
snapshots. Secret signatures can miss novel/obfuscated secrets and reject benign
files. Heap limits are not total RSS measurements. Native worker failure may
retain bounded handles until app exit, so the pool stays closed rather than
guessing cleanup. Revocation orders new Main writes, not remote provider receipt.

Python retains the launching user's OS rights under approved C02 FFR-R03. Tests
prove no reader/shell/worker capability on the application's Discussion path;
they do not sandbox malicious Python dependencies. No real provider received
project source in P6; paid request/token counts remain unchanged from P5.
Full IIS-08 G6 is PARTIAL / owner disposition pending, not unconditional PASS.
