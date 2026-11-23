# CGATE result (FX-CGATE, successor of the first helper, 2026-11-20)

- **Branch** `u/CGATE` (worktree `.claude/worktrees/CGATE`), **final commit `b44ef80a`** (4 commits on ec3b04fd:
  ab2c5e0c code, df8e9a06 tests, 2772356c a G4 test fix, b44ef80a docs only).
- **Built** (checkpoint plan D1-D11): guard-hook steps 2-5 (`stepBind` by nonce, `stepCurrentSession`,
  `stepRowAtAdmitted` + `stepStartRecord`, `stepStopIntent`) and step 6 (the PostToolUse / PostToolUseFailure mode,
  close outcomes from the result text); `profiles/coordinator.json` `session_tools` and the three exact tool names;
  `settings/coordinator.json` two Post entries; `schemas/profile.schema.json` (`session_tools`),
  `schemas/coord.schema.json` (`successor_nonce`); handover `bind --nonce`, nonce in init and raise and in the brief,
  `run/close/{intent,done}` made by init; status `owner --act closed`; selftest static check `close-folders` and its
  `profileShapeError` copy; the guard-hook fixture with a bound session; CONTRACT 3.21, the four specs, coordinator
  brief sections 1 and 5d.

## Tests (each file through MAIN's lane)

| File | Label | Commit | Tests | Pass | Fail | Not run (skipped) |
|---|---|---|---|---|---|---|
| tcb/test/guard-hook.test.mjs (from `C:/Users/User/Documents/projects/hx-CGATE`, removed after) | CGATE-guard-hook | 2772356c | 25 | 22 | 0 | 3 (needs-app) |
| tcb/test/handover.test.mjs | CGATE-handover | df8e9a06 | 23 | 20 | 0 | 3 (needs-app) |
| tcb/test/status.test.mjs | CGATE-status | df8e9a06 | 33 | 31 | 0 | 2 |
| tcb/test/selftest.test.mjs, 4 shards in one call | CGATE-selftest-shards | 2772356c | 31 | 29 | 0 | 2 |

The first guard-hook run (df8e9a06) failed G4 only: the test's own table used a state `held` that the schema does
not have (`table-unreadable`); 2772356c uses `parked`. b44ef80a changes no code. New tests: guard-hook G1-G5,
handover H1 (T11 rewritten, T6 and X1 extended), status S1, selftest T11's `close-folders` case.

- **Departures:** `research-tree/build/departures/CGATE.md` (8 items; the main one: the id-space gap).
- **Tokens:** `build-invariant: CGATE coordinator start gate | calls 74 | tokens 17.36 M | context now 351.5 K` (the
  counter's line; it did not change during this successor's run, so it likely does not see this transcript).

## Not done

- No map from the app id (`local_<uuid>`, the close records' names) to the CLI id (FX-CLOSE verify's key): until one
  exists every close ends with the owner's `closed` (departure 1; candidate maps named there).
- Needs the app, not tested: the harness's delivery of PostToolUse / PostToolUseFailure with the measured texts
  (M2, M3 are from transcripts and `app.asar`); permission prompts for the three MCP tools (no allow entry).
- For other units: W1's exec allow-list must admit `handover.mjs bind --root --ce --nonce`; FX-W3's brief section 6
  must name an absolute `cwd` and `use_worktree: false` (departures 4, 5). Full suite not run (the root runs it).
