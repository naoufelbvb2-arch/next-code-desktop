# P9-R01-F01 — accepted limited documentary exception

Owner Decision B received2026-11-10: **ACCEPTED P2 DOCUMENTARY EXCEPTION**.
This closes the request for owner disposition, not the missing test evidence.

Lost historical secondary passing diagnostic: `.cache/p9-native-native-01.json`.
Original recorded SHA256:
`24bfea1950fb36788671d9b44fa0b64c462fb3a690a585d4c642f3ad30b5e704`.
Current overwritten bytes SHA256:
`97a339203caf372efd700ec1c7d955f9b5b15c8d0e867256e5e2a430556eac95`.
The exact original remains unavailable. No replacement has been reconstructed or
labeled historical. R03 run-manifest rechecks the original incident against the
preserved P9 raw manifest and records all original/observed hashes.

Retained primary evidence includes `.cache/p9-native-full-01.json` and
`.cache/p9-unit-full-01.json`, their original manifest hashes, all tracked P9/
R01/R02 reports/matrices/catalogs, and all recorded R01/R02 raw artifacts. Current
hashes and preservation audits are in run-manifest.json; original manifests and
reports remain byte-identical. Later corroboration has its own source/run/date,
never retroactively substitutes for the missing diagnostic.

Impact: byte-for-byte reproduction and custody of this one secondary passing
diagnostic cannot be proved. The primary full runs remain checkable; the missing
file was never sufficient to close G6, which remains BLOCKED. Owner accepts the
limited documentary loss while preserving the incident and available originals;
no P0/P1 obligation, security test or gate is waived.

**I08-T87 remains INCONCLUSIVE for full historical raw-retention proof.** Its
current documentary disposition is ACCEPTED_EXCEPTION separately from its test
verdict. No historical result is edited, no lost test becomes PASS, and no
additional approval of this same P2 exception is requested.
