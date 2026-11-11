# Remaining environment and evidence decisions

## Native G6 environment

R02 again called actual CreateSymbolicLinkW for file/directory links with
ALLOW_UNPRIVILEGED_CREATE. Both return Windows1314. Newly observed token: not
elevated, SeCreateSymbolicLinkPrivilege absent, SeManageVolumePrivilege absent.
No Administrator/Developer Mode/Group Policy/global change attempted. Existing
native junction/root-handle/concurrency/alias defenses are retained; these do not
substitute genuine symbolic-link or separate-volume mount containment trials.

Minimum environmental capability: allow the test process to create native file
and directory symlinks, plus a controlled mounted NTFS volume for the distinct
volume-root/reparse attack fixture. Developer Mode can address unprivileged
symlink creation, but does not itself supply all separate-volume evidence; no
recommendation here silently changes owner machine settings.

**One owner action:** provide a disposable Windows QA VM, already authorized for
symlink creation and volume-management testing, with a second disposable NTFS
volume and the same pinned development dependencies. Then run only the native
G6 fixtures there and return sanitized native results/hashes. The agent will not
enable privileges or attach/format volumes on this host. Until actual evidence
exists, **G6 remains BLOCKED**. No string-only simulation or automatic waiver.

Primary API context: [CreateSymbolicLinkW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-createsymboliclinkw)
and [SetVolumeMountPointW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-setvolumemountpointw).
These explain operations, not proof that this environment passes the trials.

## P9-R01-F01 retention disposition — PROPOSED, not waived

Lost artifact: secondary local passing `.cache/p9-native-native-01.json`.
Original recorded SHA256
`24bfea1950fb36788671d9b44fa0b64c462fb3a690a585d4c642f3ad30b5e704`;
overwritten SHA256
`97a339203caf372efd700ec1c7d955f9b5b15c8d0e867256e5e2a430556eac95`.
R02 preserves both recorded hashes and current bytes. Exact historical original
is unavailable; no reconstructed replacement is labeled original.

Impact: byte-for-byte reproduction/custody of that one secondary diagnostic
cannot be asserted. Historical tracked P9/R01 reports/matrices/catalogs and the
primary full native diagnostic plus original full unit JSON remain checkable.
The lost file is not the sole basis for a successful security gate; G6 was and
remains BLOCKED. Existing native corroboration retains its actual source/run
provenance, never backdates a new result to that lost run.

Proposed documentary treatment: keep an immutable loss record referencing the
old manifest and current hashes, use primary independently retained evidence
for the already supported assertions, and obtain explicit owner disposition of
this P2 diagnostic-retention exception before closing I08-T87. This is not a
P0/P1 waiver or permission to erase the incident. R02 retains INCONCLUSIVE until
that decision. New outputs have unique run IDs; raw outcome JSON/console and
published reviewed derivatives are independently hashed. R02 never executes
P9/R01 collectors or fixed-name specs that overwrite prior diagnostic files.
