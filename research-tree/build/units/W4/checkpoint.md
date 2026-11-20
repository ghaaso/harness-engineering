# W4 checkpoint (FX-W4, the dead-man), builder 1 at the 330 K context mark, 2026-11-20

Branch `u/W4`, worktree `MAIN/.claude/worktrees/W4`, base `build` 56918efb. **Commit 7ea139fe**: code only,
`node --check` passes, **no test run yet**. Tokens at the mark: `calls 80 | tokens 15.23 M | context 312.6 K`.

## Done (7ea139fe, `research-tree/tcb/status.mjs` only)
- `DEADMAN_FLAGS = {deadman: bool}`; constants `DM` (the design's values, kept in code: slice 1 writes no
  thresholds key) and `DM_CAUSES`; `deadmanRun` filled; new `deadmanNowake(root, th, now)`; computeStatus
  pushes anomaly `deadman-nowake` after `alarm-dead`.
- `status --deadman --root R`: `--ce`/`--reconcile`/`--endturn`/`--acked-seq`/`--arm-nonces` with it: 66.
  ce from coord.json (absent or no integer ce: 2 `no-coordinator`; corrupt: 67 via readState). Reads
  alarm.json + slot-1..alarm_slots and watcher.json + watcher.lock BEFORE one `realProc({timeoutMs: 30000}).list()`,
  then `lib.exitMarkers`. Alarm verdict alive/unknown/none over records of this ce (`slotRec`), watcher as
  endturn judges it (`wFiles`). `runs_no_alarm`/`runs_no_watcher`: none +1, alive 0, unknown unchanged; reset
  when deadman.json's ce differs. `list_hist` last 5 (true = failed). Reads `watcher.json.stuck` (any ce),
  `watcher-busy.json.busy_ticks` (per root, W7 departure 6), `turn.json` (turn_seq as watch `turnSeqOf`,
  `unarmed_turns`), `run/arm/unarmed-*.json` of this ce whose turn_seq equals the current turn_seq.
- Causes: no-alarm (>=2), no-watcher (>=2), list-failing (3 of last 5), stuck (non-empty), run-lock-busy
  (>= busy_alert_ticks, fallback 10), unarmed-turns (>=3), unarmed-records (>=2 sharing the current turn_seq).
  Re-alert P1: `alerted {cause: runs since its last alert}`; alert when new or n+1 >= realert_runs (fallback
  6); a cause absent for one run is dropped (onset ends). Exit 1 `deadman-alert` {alerts, causes}, else 0.
- deadman.json `{schema_version, ce, runs, at, boot, runs_no_alarm, runs_no_watcher, list_hist, alerted, gap}`;
  gap = two runs of one known boot more than 2 periods (10 min) apart: `{from, to, ms, boot, runs_since}`.
  writeAtomic, no lock; dry run writes nothing. boot = `--boot` or `proc.boot()` only when the list answered.
- `deadmanNowake`: no file `no-run`; no parseable `at` `unreadable`; older than 3 periods (15 min) `stale`;
  gap with runs_since < max(1, ceil(2 x alarm_ms / 300000)) (24 at 1 h) `gap`.

## Decisions to record in `departures/W4.md` (not written yet)
1. **deadman-nowake by effect, not by reading the task's settings** (FW:278 says the status view flags an
   install without wake-to-run). Reading the install needs the Task Scheduler (a query nobody here may make,
   tests included); the effect (a run every period through sleeps, which also covers the power plan's wake
   timers named in the same sentence) is measured: no-run, stale, gap within one boot. Cost: an install
   without wake shows at its first sleep, not at install. Plus B4.3 (a missing task) via no-run/stale.
2. "The list answers" read as "the verdict is known": a run whose candidates are all absent, of another ce,
   corrupt or marked counts as none even with the list down; unknown leaves the count (a reset would let a
   flapping list hide a dead alarm).
3. unarmed-records counts only records of the current turn_seq (FW:247 literally never clears after a
   recovery: a permanent re-alert).
4. runs_no_* restart at a new ce (the successor's first runs); list_hist, alerted, stuck, busy carry.
5. Error exits (2, 66, 67, 70) are not paced: the task toasts at each (a broken dead-man is loud).
6. deadman.json format extends S0.5's `{runs_no_alarm, runs_no_watcher, list_hist[5], alerted:{cause, runs}}`
   (alerted is a map cause -> runs); `stuck` is one cause (not one per ident).
7. Residue: the hook (W1's EXEC_FORMS) admits `status --deadman --root` for the coordinator; a coordinator run
   counts toward the pace and its alert reaches no owner. Brief 0c must say: never run it.

## Left (in order)
1. `tcb/fixtures/status/_testdata.json`: add `realert_runs` 6 and `busy_alert_ticks` 10 (test values).
2. Four tests in `tcb/test/status.test.mjs` (plan): (A) real list: runs 1-2 no records -> exit 0 then 1
   alerts [no-alarm, no-watcher]; two sleepers as alarm (alarm.json+slot-1, ce 1) and watcher (watcher.json+lock)
   -> 0, counters 0, alerted {}; alarm sleeper's exit marker -> runs_no_alarm 1; then NO_LIST
   (`proc_exe` missing, rewrite thresholds) with the marker removed -> counts unchanged. (B) NO_LIST, records
   naming this test process (unknown): runs 1-2 exit 0, run 3 alerts [list-failing]; then stuck, busy 10,
   unarmed_turns 3, two unarmed records at turn_seq 7 -> alerts [run-lock-busy, stuck, unarmed-records,
   unarmed-turns]; boundaries busy 9, turns 2, turn_seq 8 -> cleared. (C) P1 pace, NO_LIST: stuck from run 1:
   alerts r1 [stuck], r3 [list-failing], r7 [stuck], r8 stuck removed (dropped), r9 [list-failing, stuck].
   (D) status view (NO_LIST, `--now`, `--boot`): no file -> deadman-nowake no-run; dead-man at T0 boot B1;
   build at T0+4 min none, T0+16 min stale; dead-man T0+20 B1 -> gap 1200000 -> build `gap`; same boot jump
   across B2 -> no gap; `--dry-run` writes nothing; `--deadman --ce 1` 66; the XML read as text.
   Run status.test.mjs through MAIN's lane once before the next checkpoint (B1-3's lesson).
3. `tcb/settings/deadman-task.xml` (a file; never register it): Task 1.2, TimeTrigger PT5M repetition +
   LogonTrigger, Principal InteractiveToken LeastPrivilege, Settings WakeToRun true, StartWhenAvailable true,
   IgnoreNew, no battery/idle/network conditions, ExecutionTimeLimit PT4M; Exec powershell.exe
   `-NoProfile -NonInteractive -WindowStyle Hidden -Command "..."` running `{node} {root}/tcb/status.mjs
   --deadman --root {root}` and, on `$LASTEXITCODE -ne 0` (null -> 70), a WinRT toast (ToastText02, AppId
   `{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe`) naming the exit and
   reasons; `exit $x`. Only single quotes inside; XML-escape `&` and `>`. A comment: the owner fills {node},
   {root}, allows wake timers in the power plan, installs it himself (unverified: toast reach, console flash).
4. spec/status.mjs.md (Command line `node tcb/status.mjs --deadman --root R`; Reads; Writes; a `--deadman`
   step; exit 1 `deadman-alert`, 2 `no-coordinator`; anomaly `deadman-nowake`; behaviours); CONTRACT 1.4
   round-3 row (FX-W4 1 `deadman-alert`), 2.1 (row `run/deadman.json` status `--deadman`, writeAtomic without
   the run lock; the "every write under run.lock" sentence gets the exception, also W7's `watcher-busy.json`:
   a departure naming the line), 3.8 anomaly, 3.9 [deadman] format, decision 41 FX-W4 (R6-d with N1's
   re-alert, FIX-JOIN part 3); `tcb/briefs/coordinator.md` 0c and `spec/briefs.md` FX-W4 line.
5. departures/W4.md; merge `build`; e2e once from a checkout outside `.claude/`; result.md last.

## Next step
Item 1, then the tests (item 2), run them, fix the code where a test fails.
