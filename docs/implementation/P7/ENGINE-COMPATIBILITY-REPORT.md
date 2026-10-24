# P7 tested engine compatibility and minimum G4 evidence — 2026-10-24

The approved engine hook block is resolved for exactly
`5e7179b9d528e7ef97e18f91ec284e4da514ca0b` on the separate official engine
branch `feature/p7-desktop-lifecycle-control`, based on
`834d0ca62cc9b2c03e530bafe4090024d98f31d3`. Engine main was not merged or edited.
The owner's P7 ENGINE INTEGRATION FIX explicitly approved the existing request.

| Capability | Actual proof | Disposition |
| --- | --- | --- |
| Optional AgentOS API | execute_task retains task_goal/task_id/C01 and adds keyword-only observer/cancellation | Backward-compatible old callers and all original offline regressions PASS |
| Actual start source | LeadArchitectLoop.run invokes the observer with task/workspace identity before checkpoint work | Actual engine and Electron tests PASS; no wrapper/ACK inference |
| Actual terminal result | AgentOS returns the same seven-field TaskOutcome observed by its callback; bridge waits for return/unwind and Gateway cleanup | Success/failure/exception tests PASS; no fabricated outcome on exceptions |
| Cooperative cancellation | Task-local control reaches awaited Gateway, squad/chassis, registry, blocking tool and controlled shell | Gateway/worker/tool tests PASS; worker finally drains and wipes memory |
| Owned Windows processes | Tool shell assigned suspended to nested non-breakaway Job; Desktop separately owns the outer Job | Actual child/descendant and 15-second escalation tests PASS |
| Durable writer safety | Session-bound T4 commit, intact event stream, zero outer-Job processes and fresh native root before T3 release | Actual engine + SQLite/Windows tests PASS; faults/forced stops retain lease |
| C01 | Main same-conversation bounded projection; exact distinct goal; engine model snapshot validation and whole-entry rendering | Actual prompt/context tests PASS; paid token calibration NOT_VERIFIED |
| Engine identity | Exact commit + 36 runtime source files pinned; private Main capability and Python independent source verification | Wrong identity/tampered Desktop bytes/fabricated capability deny tests PASS |
| Dependency identity | Explicit interpreter, pydantic 2.12.5/httpx 0.28.1, tested Git SHA and narrow child PATH | Actual Windows launch/probe PASS; no global PATH/settings changes |
| Production model route | No configured/authorized coding provider; no default paid Gateway or fixture selection in production | UNCONFIGURED; normal Run Task denied before admission |

`coding-compatibility.json` pins the runtime source inventory, four Desktop-owned
Python modules and tested Git executable. A source audit remains source-only:
`inspect_engine()` does not itself claim coding readiness or certify G4. Actual
runtime proof is separately listed in VERIFICATION-RESULTS.json. A new engine
revision/source change requires renewed compatibility evidence; no Renderer,
environment or manifest-only boolean enables it.

The test-only caller imports the production Coding Bridge and original AgentOS /
ModelGateway / provider. Every requested profile is routed to an in-memory HTTP
mock and external sockets are denied. No test Gateway is imported by the product.
All actual task workspaces are synthetic Git baselines outside both source repos.
Windows ownership was observed through actual Job/process handles, not PID absence.
Task start/outcome/cancel events are grounded observations; full worker telemetry
and the nine-event Mission Control surface remain P8, not invented in P7.

Engine suite: **53 PASS / three paid tests NOT_RUN**. Desktop: **470 PASS / one
inherited symlink NOT_RUN**. Minimum real-engine G4: **PASS for the approved
offline Windows subset**. Full IIS-08 G4/product acceptance: **PARTIAL/PENDING**;
the production route and explicit remaining register cases are not silently
accepted. Engine and Desktop publication histories remain independent.
