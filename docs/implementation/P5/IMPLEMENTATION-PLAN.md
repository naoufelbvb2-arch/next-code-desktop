# P5 implementation scope

Owner authorization: P5 FULL IMPLEMENTATION & LIVE DEEPSEEK TESTING, 2026-10-22.
Official Desktop repository; branch `feature/p5-discussion-models` from published
P4 acceptance `c27adc7ad4a1850dc3f8b3f229af1d557050aa66`. Accepted P4 was
`b321bdc64be55a8bfc75e3de043b7ff79a8ab207`; local/remote matched, tree clean.

Follow NCD-04 §5.6 and IIS-06/C02/C03/IIS-01/02/02-C01/03 REISSUE/04/08 and
C02-C01. Keep frozen bytes, 22 tables, 23 methods/three subscriptions and five
wire types/actions unchanged. Allowed files: Main, Desktop bridge, current React
discussion components/state, internal integration contracts, local dependency/
build config, tests, README/AGENTS and P5 evidence. Engine is read-only at
`834d0ca62cc9b2c03e530bafe4090024d98f31d3`.

Implement explicit private ModelGateway/DeepSeek Flash route with the engine's
OpenAICompatibleProvider and its supported custom httpx client. Validate actual
destination/model, non-thinking mode and one HTTP attempt; no parallel provider
HTTP implementation or structured self-healing calls. Use a pinned local venv,
explicit interpreter/engine/dependency configuration under P4 containment.

Persist T1 before issue, bind session/wire/attempt/model/provider, commit T5 before
rendered answer. Serialize each conversation, no duplicate/reload/crash replay.
Use exact bounded ContextV1, source-linked summaries only, no candidate approval
or automatic coding. Enable existing model/history/Dock methods and React UI.
Project selection uses native owner dialog and root identity metadata only to
meet the existing required project scope; file/source operations remain denied.

Live API: key in verified ignored local file only, never reports or SQLite.
Reserve at most ten short actual requests across tests/profiles in a local
durable counter before network issue. Prefer two-turn synthetic Atlas text with
256-token output, no project bytes, redirects, fallback or automatic retries.
Do not call the provider until the complete path and fixture tests are ready.

Test model/route/context/T1/T5/duplicates/failure/secret/broker/coding boundaries,
actual Windows Electron restart and separate live happy path. Re-run all 277
P1–P4 checks, build/typecheck/format and exact frozen hashes. Map I06-T01–T52
with precise stage subsets/deferred status. Preserve failures and actual live
request/token totals. Stop unsafe launch/route mismatch; preserve unknown issued
turns, never reset DB or auto replay. Real contract conflicts need separate draft
change control. Deliver requested plan/report/results/manifest/later receipt,
review exact staged bytes, normally push feature branch, no main merge or P6.
