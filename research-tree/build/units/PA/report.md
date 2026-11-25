# Unit PA report (FX-PILOT unit 1: models of children and helpers)

Branch `u/PA` (worktree `.claude/worktrees/PA`), rebased on build 7542fe1b (after PB); final commit **299088ee**.

What changed: `tcb/tier-hook.mjs` (byte copy) and `tcb/tier-routes.json` (copy + `agents`: reader collect, checker
read, scorer read); the tier hook entry (matcher `Agent|Task|mcp__ccd_session__start_session`) added to all nine
settings templates; `lib.mjs` tierRoutes/routeOf/agentRouteOf/modelFamily; status rows carry `route`, status carries
`helper_routes`; manifest `agents[]` carry `kind`, `model`; the guard hook refuses a start off its row's route
(`bad-route`) before `start.json`; selftest role-files checks the hook, the table and a route per helper type, and has
scorer in PROFILE_ROLES and AGENT_TOOLS (coordinator's request); coordinator and child briefs point at status and the
manifest (no model or "tier" word); README line.

Tests (lane label: pass / fail / skipped):
- tcb/test/guard-hook.test.mjs, from a detached checkout outside .claude: PA-guard 30 / 0 / 3
- tcb/test/status.test.mjs: PA-status 48 / 0 / 2
- tcb/test/replace.test.mjs: PA-replace 99 / 0 / 2
- tcb/test/lib.test.mjs (with status and replace, before the rebase): PA-srl, lib file 0 failures (the one failure there was PA-1's own test helper, fixed, then PA-status passed)
- tcb/test/selftest.test.mjs, four shards plus PA-4 in one call: PA-selftest-shards 30 / 0 / 2 (7+8+8+9 tests)
- Two lane calls timed out under load (PA-guard-status, PA-status-replace at 90 and 110 s): exit 124, not results; rerun per file above.

Departures: `research-tree/build/departures/PA.md` (the guard's start check; tier = kind; route beside `next`).

Tokens: build-invariant: PA models of children | calls 112 | tokens 12.73 M | context 175.5 K (before the report).

Not done / for the root:
- The run's `plan/tasks-plan.json` must give tiers as kinds (T orchestrate; S1, S2, STPA, FMEA, mapper analyse;
  R1, R2 refute; control, canary test), else status `route` is null and the start is refused.
- Unit PC's new single-session settings file needs the same tier hook entry, or selftest role-files and guard-hook
  T14 (now expects two PreToolUse entries) fail after landing.
- An Agent start's kind is not tied to its helper type by code (departure 7).
