# P9-R01 publication receipt — 2026-10-27

Reviewed implementation/evidence commit: `3602fcdd254ff4d899abf0131ce2015a0b6de303`.
Pushed normally to `feature/p9-windows-integrated-acceptance`; exact remote SHA
verified after push. Parent: `b4ae63cd34d8d3c84dae68b5697ea53bccf515f4`.
31 reviewed paths, including one narrow production authorization-error fix,
isolated tests/fixtures and sanitized R01 evidence. Exact staged/Git blob bytes
match the change manifest. No unrelated files, private machine paths, credentials
or raw source disclosures published; two actual synthetic-app screenshots
visually reviewed. No force push or main merge.

- [Implementation commit](https://github.com/naoufelbvb2-arch/next-code-desktop/commit/3602fcdd254ff4d899abf0131ce2015a0b6de303)
- [P9 branch](https://github.com/naoufelbvb2-arch/next-code-desktop/tree/feature/p9-windows-integrated-acceptance)
- Change manifest SHA256: `a275295517e221f64484466e290539d5af1fd485a9e3db068c9e3058bbcc020d`.
- Post-commit frozen verifier: PASS (working tree, HEAD Git blobs and original
  delivered ZIP); local raw log SHA256 `b1582563955362850ce3f398fd2250650149409dd4c72104ca72eec50f8e3757`.
- Engine clean/read-only, local/remote pinned
  `99e00e13f8a39fa6730f3d3de773ac937b5ac915`.
- Desktop main unchanged `af682b74375a0b5827aa1fca0ff0815434803650`;
  Engine main unchanged `834d0ca62cc9b2c03e530bafe4090024d98f31d3`.
- P5/P7 budget hashes unchanged, no paid call or budget reset.

Current cumulative Desktop 547 PASS /0 FAIL /5 NOT_RUN. R01 executed 69 passing
unique Desktop cases and attempted setup for five privilege-limited native cases;
19 passing cases and two native cases are new. Separate Engine suite 69 PASS /
3 paid NOT_RUN carried. Full P9 remains NO-GO; G6/G9 blocked. Remaining findings
and secondary raw-retention incident are explicitly recorded in the release
decision; no P0/P1 waiver or current full acceptance inferred.

This later receipt records the already existing implementation SHA. Its own
commit SHA belongs in the final response/remote verification, not inside itself.
Stop at P9 FINAL OWNER REVIEW. No P10, packaging or installer.
