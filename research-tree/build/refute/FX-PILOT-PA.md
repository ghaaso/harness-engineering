BREAKING: a helper start off its type's route passes both hooks (breaking findings: 1)

Refute of fix unit PA (`git -C hb diff 7542fe1b bc86a10c`), blind, run on a copy of build de7ea70e
(`C:/Users/User/AppData/Local/Temp/refute-pa/c1`). PA's own tests pass there: PA-1..PA-4, T6, T14 (13 pass; the
1 fail is the probe below). The run root's `tcb/` tier-hook.mjs, tier-routes.json, guard-hook.mjs, lib.mjs,
status.mjs and replace.mjs are byte-identical to de7ea70e.

## Breaking

**B1. A reader, checker or scorer can start on any self-consistent kind and model, not its type's route.**
The tier hook (`tcb/tier-hook.mjs`:64-85) checks only that the model fits the kind named in the description. The
guard hook's `agent` branch (`tcb/guard-hook.mjs`:595-598) checks only `subagent_type` against the profile.
Nothing ties `subagent_type` to `tier-routes.json` `agents` (reader -> collect/sonnet, checker and scorer ->
read/sonnet). So T can start a reader with `description: "analyse: q", model: "opus"` or
`"orchestrate-deep: q", model: "fable"`, and the coordinator can start a checker with `"locate: q", model: "haiku"`.
Both hooks allow it. That is a wrong model let through, on nodes 14, 20 and 21 (readers alone 31.9 M a field).
The builder declares it (departures/PA.md item 7), but declaring it does not close it.
- Failing test: appended to the copy's `tcb/test/guard-hook.test.mjs`, with tier-routes.json copied into the world:
  `REFUTE-PA-1 a helper start off its type's route is refused` (4 cases, expect `bad-route`). It fails, and all 4
  are allowed. The same starts run through `tcb/tier-hook.mjs` exit 0 (probe
  `C:/Users/User/AppData/Local/Temp/refute-pa/probe/tier-probe.mjs`: 12 FAIL rows, all of them this case,
  Agent and Task alike). `orchestrate-deep`/`fable` on a reader also exits 0.
- Fix (small): in the guard's `agent` branch, when `lib.tierRoutes` reads, take `lib.agentRouteOf(routes, t)` and
  refuse `bad-route` unless the description's kind is that route's kind and `lib.modelFamily(model)` is its model,
  the same check `startRouteProblem` (guard-hook.mjs:991-1000) does for sessions.

## Held (tried, not broken)
- Session starts for every pilot row (test/haiku, analyse/opus, orchestrate/opus, refute/opus): the right start
  passes both hooks. No model, the wrong kind, no kind, Fable or a cheaper model are refused (guard `bad-route`,
  PA-3; tier exit 2). No start.json is written on a deny. Kind casing is accepted on purpose.
- Helpers: no model, no kind, a kind only in subagent_type, mythos, "inherit" and a non-string model are all
  refused, for both Agent and Task. No subagent_type gives `agent-type`.
- Bash/PowerShell: children have no shell. The coordinator's shell is limited to `node tcb/<name>.mjs`, and no
  script starts a session.
- All nine role templates carry `"{node}" "{root}/tcb/tier-hook.mjs"` on `Agent|Task|mcp__ccd_session__start_session`.
  The selftest's role-files check enforces this (PA-4). The rendered child settings satisfy the tier hook's cwd
  check. PB2 and PC did not undo any of it.

## Not breaking
1. `briefs/coordinator.md`:142 says "the tier hook". spec/briefs.md T4 forbids the whole word "tier" in any brief,
   and no test checks T4.
2. The run root's `.claude/settings.json` is not the rendered coordinator template. It has only MAIN's
   `.claude/hooks/tier-hook.mjs` with matcher `*` and no guard hook. This is the run-root set-up (node 3), not PA's
   code; check it before the go.
3. A second PreToolUse entry reopens F-P11 ("a deny may not win"). The guard exits 0 without JSON, so exit 2
   should win, but this has not been observed in the app.
4. Kind `test` lets the tier hook accept sonnet while the guard requires haiku (models[0]). The guard is the
   stricter of the two, so this is harmless.
