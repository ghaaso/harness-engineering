# PB: the scorer can be started (PILOT-PLAN s4 unit 2)

- Branch `u/PB`, final commit `0b3d02b2` (one commit on build's tip fa8d28c1).
- Changed: new `tcb/agents/scorer.md` (tools: Read; body byte-equal to `briefs/scorer.md`); new `tcb/profiles/scorer.json`
  (Read + StructuredOutput, read only `{root}/views/blind/`, the checker's deny list, no writes, helpers, fetch or bash);
  `scorer` added to `profiles/coordinator.json` agent_types; `Agent(scorer)` added to `settings/coordinator.json`.
  Test: `tcb/test/guard-hook.test.mjs` (T14 expects the scorer's profile and agent file and an `Agent(<t>)` allow for
  every coordinator agent type; T6 coordinator may start the scorer, child and fresh-reviewer may not; new test "PB scorer
  reads": 18 cases, views/blind/ read allowed, sealed/blind key, other views, `..`, `blinder/`, plan, store, queue refused,
  Write/Glob/Grep/WebFetch/Agent not allowed, Bash denied, scorer in a task folder is helper-type).
- Tests (from a detached checkout `hx-PB` outside `.claude/`, removed after):
  - `tcb/test/guard-hook.test.mjs`, lane `PB-guard-hook`: 29 pass, 0 fail, 3 skipped (needs-app). (A first call with
    T 25 s timed out, 124, not a result.)
  - `tcb/test/selftest.test.mjs` as its 4 shards, lane `PB-selftest-shards`: 29 pass, 0 fail, 2 skipped.
- Departures: none.
- Tokens: `build-invariant: PB the scorer can start | calls 39 | tokens 2.38 M | context now 88.3 K`.
- Not done: `selftest.mjs` AGENT_TOOLS / PROFILE_ROLES not extended to `scorer` (kept off a file PA may touch), so the
  run root's selftest does not require the scorer's files; the guard-hook T14 test does. The agent file names no model:
  if unit PA adds a `model` line to `agents/checker.md` and `reader.md`, `agents/scorer.md` needs the same at rebase.
