# W2 checkpoint (builder 2, 2026-11-20)

Worktree `MAIN/.claude/worktrees/W2`, branch `u/W2`, base `build` b6fabfa0 (still the build tip when builder 2
started). Builder 1 committed the code (1ac4ce94, ~14.67 M); builder 2 stopped at its 14.5 M limit (12.8 M used,
context ~240 K). **Commit: d5690df3** (see the last line). The design decisions are builder 1's, unchanged; they
are restated in `departures/W2.md` and in the specs (`spec/watch.mjs.md` "Alarm steps", `spec/status.mjs.md`
"--reconcile"), so open those instead of the design.

## Done (builder 2)
- Fixtures: `tcb/fixtures/{watch,status}/_testdata.json` + ensure_query_ms 10000, release_ms 200,
  arm_confirm_ms 20000, alarm_slots 1.
- Hook: `tcb/guard-hook.mjs` EXEC_FORMS.watch alarm form `[null, ['alarm','ensure','nonce'], [...RC]]` and its
  comment (W1-2 closed); `test/guard-hook.test.mjs` T16: bare `--alarm` dropped from prod, two refused cases added.
- Tests adapted: watch `alarmArgs` (+ `--ensure --nonce`, new nonce each call), T20 first test checks slot-1 and
  the nonce file, T20 supersede rewritten (present, then slot 1 removed, a third supersedes); `assertLine(res,
  exit, script='watch')`; status `recNoAlarm` -> `recUnarmed` (arm-unconfirmed), `liveAlarm` also writes slot 1,
  `putSlot`, `armDetail`; M2 test -> "FX-W2 reconcile confirms the arm only by a live slot ..."; FX-W1 list
  unavailable test writes slot 1.
- New tests (BUILD-PLAN's 3, plus a usage test): watch "FX-W2 usage", "FX-W2 a reused nonce is harmless",
  "FX-W2 the confirm deadline"; status "FX-W2 a second reconcile of a confirmed turn keeps it confirmed in hold 1
  (B1.4) ..." (fs seam `--import tmp/turn-seam.mjs`, 2nd write with "unarmed_turns" throws -> exit 70).
- Test runs (lane, from the worktree's `research-tree/`):
  - `W2-ws2` watch + status: 118 tests, 110 pass, 2 fail (both: the status line's script name), 6 skipped, 70 s;
  - after the fix, `W2-w3` (`--test-name-pattern FX-W2`, watch): 3/3 pass. The status file passed whole in
    `W2-ws2` (its FX-W2 test included);
  - `W2-gh` guard-hook.test.mjs from a detached checkout `hx-W2` of d5690df3 (removed after): 30 tests, 27 pass,
    0 fail, 3 skipped, 24 s.
- Specs: watch (Command line, Reads, Writes, Alarm steps 1a/1b/3/3a, Exit codes, T20 and three FX-W2
  behaviours, skeleton), status (Command line, Reads, Writes, --reconcile arm paragraph replacing M2, Exit codes,
  Rules, behaviours, skeleton), guard-hook line 97, lib `realProc`. CONTRACT: root .gitignore note, writer table
  rows (slot, nonce, turn), §3.9 [arm-slot] [arm-nonce] [turn], scripts table rows watch/status, decision 40 M2
  note, decision 41 FX-W2 paragraph (R6-a sentence).
- `MAIN/research-tree/build/departures/W2.md` written (items 1-9; item 9 open).

## Left, in this order
1. **Brief place 0a**: `research-tree/tcb/briefs/coordinator.md` line 15 says reconcile reports `alarm-missing`;
   make it `arm-unconfirmed` (endturn keeps `alarm-missing`); then mark departure 9 done. **Brief places 2 and 3
   (FX-W2's)**: find them in that brief (grep `FX-W2`, `place`; S0.5's `units/S0.5/result.md` lines 24-46 name
   the places) and fill them from FIX-wake FX-W2 step 1: call 1 of each turn starts `watch.mjs --alarm --ensure
   --nonce X` (background) then `status.mjs --reconcile --arm-nonces X`; exit 1 `arm-unconfirmed` = the turn is
   unarmed. Commit.
2. Whole-file rerun of watch.test.mjs + status.test.mjs once (label `W2-ws3`, T 105, W 40): the last whole run
   had the two status-name failures only, fixed since and checked by `W2-w3`.
3. Merge `build` (`git -c core.longpaths=true merge build`; union on conflict), rerun the two files if it changed.
4. e2e from a detached checkout outside `.claude/` (brief B1-2 "Before the result"): `research-tree/e2e/run-e2e.mjs`
   reconcile codes `alarm-missing` -> `arm-unconfirmed` (lines 431, 493); the stand-in alarm (line ~733) also
   writes `run/arm/slot-1.json` {ce, pid, start_time, nonce} naming this process, then reconcile exits 0; any
   `watch --alarm` call needs `--ensure --nonce <32 hex>`. Commit.
5. `MAIN/research-tree/build/units/W2/result.md` (last): branch, final commit, the runs above with labels, the
   departures file, tokens (builder 1 14.67 M + builder 2 ~12.8 M + the successor's), not done.

## Commit
d5690df3 on u/W2 (builder 2: calls ~83, tokens ~12.8 M of its 14.5 M; unit total ~27.5 M of 29.2 M).
