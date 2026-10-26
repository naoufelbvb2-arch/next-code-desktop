# P9 publication receipt — 2026-10-26

Implementation/evidence commit:
**`1ed3b1d5d81c808548aa1082b6ffc9eae6714151`**, normally pushed to the official
Desktop repository on
[`feature/p9-windows-integrated-acceptance`](https://github.com/naoufelbvb2-arch/next-code-desktop/tree/feature/p9-windows-integrated-acceptance).
The exact remote branch matched that local SHA before writing this receipt.
This later receipt is a separate documentation-only commit; its own identity is
reported after publication, never embedded self-referentially.

P8 acceptance was published on P8 first at
`ca59509dfcce66c7680dddfe80554570dce516bd`, the exact P9 starting commit.
Accepted P8 is `b527a44bb5da47e63c835e71d902c3c6bc1ab1ac`.
Engine remains clean/read-only at
`99e00e13f8a39fa6730f3d3de773ac937b5ac915` on
`feature/p8-verified-worker-observers`. Desktop main remains
`af682b74375a0b5827aa1fca0ff0815434803650`; Engine main remains
`834d0ca62cc9b2c03e530bafe4090024d98f31d3`. No force push or merge.

All 23 staged files were reviewed against an explicit P9 allowlist. The 22
CHANGE-MANIFEST payloads were verified against actual staged blobs, committed
blobs and working bytes. The manifest excludes itself and this later receipt.
Initial preflight caught Windows Python CRLF versus Git LF normalization before
any P9 commit. The collector now writes LF explicitly; regenerated hashes and
exact working/index/blob checks passed. Frozen bytes and raw evidence were
untouched. No product, dependency/lockfile, public API, schema or Engine source
change is in this delivery.

Published artifact SHA-256:

| Artifact | SHA-256 |
|---|---|
| CHANGE-MANIFEST.json | `69a716d036d18844e2f34c93efa580a8b3c54c15f6f566cc79446fc5a7c0efe4` |
| VERIFICATION-RESULTS.json | `1be21cd73bf0c6f600c2cd7eab92c7508aae594d0d286a65bd1303a69925d727` |
| run-manifest.json | `0b8f62c0228a9cad49f642cb0cc338a5b48182d78ccbf16a1439d396e8adf9dc` |

Current unique executables: **Desktop 528 PASS /0 FAIL /3 NOT_RUN** (457
unit/UI/native, 34 Python, 37 actual Windows Electron); separate **Engine 69
PASS /0 FAIL /3 paid NOT_RUN**. Repeats/historical paid results are not added.
Build/TypeScript/format pass. Working/staged/HEAD frozen hashes and retained
original ZIP comparison pass: 42 original delivery files, 41 manifest payloads,
18 original normative files plus one approved addendum =19 normative/44
engineering inventory. IIS-03 reissue/closure remains prospective; lost historical
original custody is not declared verified.

Normative register: 304 rows. I08: **76 PASS /8 INCONCLUSIVE /3 BLOCKED /1
NOT_RUN**. E2E: **6 PASS /1 INCONCLUSIVE /1 NOT_RUN**. E05:36 PASS. I06:42
PASS/7 INCONCLUSIVE/1 BLOCKED/2 NOT_RUN. I07:45 PASS/8 INCONCLUSIVE/1 BLOCKED/
2 NOT_RUN. Final I06-T36 wording is preserved. The actual Renderer reopening the
post-stdio/pre-COMMIT broker crash ledger closes the earlier I07-T47 proof gap.

**G6/G9-dev remain BLOCKED; full P9 development acceptance is NO-GO.** Both
native symlink fixtures lack Windows privilege (1314); additional native and
provider/fault/soak/human-review evidence holds remain explicit in the matrix
and release-decision.md. No demonstrated root escape or Engine defect is
invented, and no missing proof is upgraded to PASS. G0/G2/G8-dev pass; G1/G3/
G4/G5/G7 are INCONCLUSIVE for the recorded full-scope evidence limits.
G8-package/E2E-08: **NOT_RUN — FUTURE DISTRIBUTION**.

Paid calls in P9: **zero**. Accepted P5/P7 journal hashes remain unchanged;
no key or budget was reset/read into the public evidence. Historical P5 real
answers are explicitly carried proof, not a new live request/readiness claim.
Raw logs/DBs/profiles/config/credentials/private paths are excluded. Only bounded
sanitized results, hashes and two manually reviewed synthetic-project screenshots
ship. No user project/database, global OS/admin change, P10 or packaging occurred.

An earlier publication stage attempt was not executed because automatic approval
review hit its usage limit. On the owner's continuation, the same approval path
succeeded; staged review and publication then completed without bypassing it.

Stop at **P9 FINAL OWNER REVIEW**. This is an evidence delivery, not owner
acceptance or permission for main merge/P10. Retain the explicit remaining holds.
