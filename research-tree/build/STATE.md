# STATE: the build root (task r57-0507), written at every wake

Root session 8a7db643-dc9c-42d9-8dea-e9f99c2d3b69 (Opus, kind orchestrate), main checkout (MAIN =
`C:/Users/User/Documents/projects/harness-engineering`), started 2026-11-19 about 16:00 UTC by the top session. A
successor (or this root after a compaction) reads `research-tree/build/ROOT-START.md`, then this file, and starts
nothing listed as running before reading that unit's branch and result file. Times are UTC, from `date -u` and the
helpers' transcripts (the B1-1 clock times written before 19:44 were guesses; corrected here from the transcripts).

## NOW (2026-11-20 02:00 UTC): slice 1 done (W4 2a45365c, suite 5 pass, e2e 239/239), the cap reached (78 %)

- **B1-3 landed:** CLOSE 23:51:55 (91b46c34), W3 about 00:28 (`build` = 56918efb, pre 91b46c34; 8 files, 94.1 s;
  no refuter successor after the BREAKING, the fix being the named test setup). **Suite 4 PASS** on 56918efb: others
  1028 pass, 0 fail, 51 skipped (1079) + shards 29 pass; wall 155 s (`suites/4/`). **e2e 239/239**
  (`suites/4/e2e.log`; its two output files copied there and restored in `hb`, which is clean).
- **Meter 76 %, Fable 53 % (00:33).** Cap check: W4 76 + 0.81 = 76.81; S2.1 76 + 0.81 + 0.33 = 77.14, both < 78.
- **B1-4 RUNNING since about 00:34** (`briefs/B1-4.md`; worktrees at 56918efb): W4 a5f3b4566123229ff
  (`build-invariant: W4 dead-man build`, opus) and S2.1 a41b2a9ff064fcbfb (`build: S2.1 cross tests build`, sonnet;
  its W4 dead-man test a `todo` until W4 lands). On W4's result: the combined review `refute: W4 combined review`
  (opus; covers W6, REDO, CLOSE, W4; cap check first: meter + running reserves + 0.60). On S2.1's result: `refute:
  S2.1 blind review` (cap check: + 0.30). A unit or review that does not fit: start nothing more, let running ones
  finish, then `cap:` to the owner with the counts (units landed, running, held; meter; tokens). After both land:
  suite 5 with the e2e (copy and restore its two output files in `hb`), the slice 1 report to the owner (short, a
  page), then slice 2 (S2.2, S2.3, S2.4) under the cap.
- **S2.1 DONE about 00:45** (19 calls, 1.70 M): `u/S2.1` 2687415f; items 1 and 2 already on `build` and passing (lib
  "FX-PLAN T1 total table", its committed-at-started case real since CLOSE; guard-hook "FX-W3 hook"); item 3 new
  (status "S2.1 N2", 3 tests); item 4 a `todo` in status.test.mjs (`status --deadman` still a stub; field names
  `runs_no_alarm`, `alert` guessed: the second of W4 and S2.1 to land adapts them and drops the `todo`); status 42
  pass, 0 fail, 1 todo (`S2.1-status-all`); wording: spec/lib.md:402, CONTRACT.md:1337. **Refuter RUNNING since about
  00:46** (`refute: S2.1 blind review`; cap 76 + W4 0.81 + 0.30 = 77.11 < 78). On PASS: land S2.1 (status.test.mjs,
  lib.test.mjs, guard-hook.test.mjs) after `merge-tree`.
- **S2.1 refuter BREAKING about 01:05** (8.55 M; `refute/S2.1.md`): the "N2 after handover exit 2" test exits at
  checkCe's `no-coordinator`, not raise's real exit 2; C4 (raise writes coord.json at ce+1 first) survives. Not
  breaking: T1 counts `not-armed` (6) as accepted, so A5 and A7 pass T1 (replace and stop tests catch them); dead
  `!hasReason` checks (C5). **Fix helper RUNNING since about 01:06** (`build: S2.1 N2 test fix`, sonnet; limit 4 M):
  the verdict's suggested test with C4 shown caught, C5; done file `units/S2.1/fix.md`. No refuter successor (the
  fix is the refuter's own test). On fix.md: land S2.1 (status, handover, lib, guard-hook). Fix DONE about 01:15
  (1.12 M): `u/S2.1` c970fc03 (a real `handover raise` exit 2, tree unchanged, then endturn; C4 caught in a scratch
  copy; C5 live); status + handover 62 pass, 0 fail, 1 todo. **S2.1 LANDED** about 01:18: `build` = cc6df491 (pre
  56918efb), 4 files pass, 58.8 s. W4's successor merges `build` and turns S2.1's dead-man `todo` into a real test.
- **W4 DONE about 01:16** (successor 20 min, 12.67 M+; unit about 27.9 M): `u/W4` 439a50c6 (merge of cc6df491 clean;
  S2.1's `todo` made real: exit 1 `deadman-alert` {alerts, causes}); status 47 pass, guard-hook 28 pass, 0 fail; e2e
  239/239; departures/W4.md 10; W2's N3 gap covered by the `no-alarm` cause. Not done: the task file never imported
  (toast and console flash unknown: pilot); lib and selftest not run; the hook still admits `status --deadman` for the
  coordinator while brief 0c forbids it (for the review). **Meter 77 % (01:20).** Cap: 77 + 0.60 = 77.6 < 78:
  **combined review RUNNING since about 01:19** (`refute: W4 combined review`; limit 31.2 M; verdict `refute/W4.md`).
  On PASS: land W4 (status, guard-hook, lib, and e2e/run-e2e.mjs if changed), suite 5 + e2e (copy and restore the two
  output files in `hb`), the slice 1 report; then slice 2's cap check (S2.2 about 1.5 points will not fit: `cap:`).
- **01:20 (root after the app's compaction, context 132 K):** board, ROOT-START, GATE-USE, this file and briefs/B1-4.md re-read; meter 77 % logged. W4's landing pre-check: `merge-tree build u/W4` clean (u/W4 holds build's tip cc6df491); W4 changed lib.mjs (4 lines), status, its test and fixtures, the xml file, specs, CONTRACT, the coordinator brief; not the e2e. Landing files on PASS: status.test.mjs, guard-hook.test.mjs, lib.test.mjs (lib not run by W4). Timer b1wz8il07 kept (fires about 02:45, 3 x Q3 of a refuter's minutes).
- **Suite 5 PASS, one test flaky under load (01:48-01:52, on 2a45365c):** others 1087 tests, 1034 pass, 2 fail (one
  subtest and its parent), 51 skipped; shards 29 pass, 2 skipped; wall 173 s (`suites/5/summary.txt`). **e2e 239/239**
  (`suites/5/e2e.log`; its two output files copied there and restored in `hb`, which is clean). The failure: stop.test
  "FX-CLOSE T1" subtest (c), `stop-unconfirmed` with survivors powershell.exe, conhost.exe and node.exe started during
  the suite (the test reads the real process list; probable cause: other test files' processes carry the same fixture
  folder or session id). **Run alone** (`suites/5/stop-alone.log`): 48 tests, 45 pass, 0 fail, 3 skipped, 20 s. So it
  goes on the end list as flaky (section 13), not back to CLOSE. **Slice 1 is done.** Next: the slice 1 report
  (`reports/slice-1.md`, page), the records commit on `build`, then `cap:` to the owner for slice 2 and the successor
  root on his typed turn.
- **Combined review PASS 01:46** (28 min, 79 calls, 13.01 M of limit 31.2 M; `refute/W4.md`): 56 mutations, 49 caught,
  7 survive, all test gaps with the code right (W6 5, REDO 1, CLOSE 1; end list). **Carried to S2.2:** W6 item 6, an
  acknowledgement re-arms the age cap, so FX-W5's stuck path never reaches the owner for B5.2: S2.2 models "ack =
  continue", and if "an attempt whose coordinator only acknowledges reaches the owner" fails, S2.4 sends it back; the
  coordinator brief's missing idle-child / age-cap line goes with that fix. REDO: a row committed at `started` gets no
  started redo and no warning. CLOSE: the id gap confirmed (every close needs the owner's `closed`, the accepted
  branch); `stop_verify_ms` a marked guess; the hook's close path and a second folder session tested by unit tests,
  not the e2e. W4: 23 of 23 caught; what it reads matches what W2, W3, W5 write. **Pilot item:** long coordinator
  turns will toast the owner falsely (89 turns over 60 min in `facts/Wturn-2.md`).
- **W4 LANDED 01:47:44:** `build` = 2a45365c (pre cc6df491), status 47, guard-hook 28, lib 204 pass, 0 fail, 72.7 s.
  **Slice 1's code is complete:** the 13 fixes and S2.1 are on `build`. **Suite 5 RUNNING since about 01:48**
  (brxaqj1wm: suite, then the e2e; its two output files copied to `suites/5/` and restored in `hb`). Timer b1wz8il07
  stopped (no helper runs). **Meter 78 % (01:50): the cap is reached.** No new unit starts; after suite 5: the slice 1
  report (page + `reports/slice-1.md`), then `cap:` to the owner for slice 2 (S2.2 about 70 M by the last two builders'
  ratio to plan, 2.77 x 25.4 M; S2.3 and S2.4 about 10-20 M; one fix round if S2.4 sends a trace back about 43 M).
- **Wall time and parallel use (plan gate log, 16:22-01:29):** 65 helper runs; 1.81 helpers running on average, 8 at
  most; minutes with k running: 0: 42, 1: 269, 2: 170, 3-6: 30, 7-8: 36. The chain W1, W2, W3, W4 set slice 1's time
  (each link about 80-117 min: builder 40-60 helper-min with take-overs at 330 K, review 15-35 min, fixes, landing,
  suite). Script: scratchpad `root/timeline.js`. Told to the owner at his question (01:40).
- **W4:** first helper **LIMIT** about 00:55 at 330 K (15.23 M): `u/W4` 7ea139fe, code only in status.mjs (`status
  --deadman`, 7 alert causes, re-alert every 6 runs, `run/deadman.json`, anomaly `deadman-nowake`, which flags what
  is observable (never ran, stale, a gap within one boot), not the task's wake-to-run setting, which would need the
  Task Scheduler); no test run. **Successor RUNNING since about 00:56** (`build-invariant: W4 dead-man successor`;
  limit 13.9 M): 4 tests, the xml file, specs, CONTRACT, brief 0c, departures, merge `build` (and S2.1's `todo` if
  S2.1 landed), the e2e, result. On W4's result: the combined review `refute: W4 combined review` (cap check + 0.60).
- **Timer:** btj7a0xr6 stopped; b1wz8il07 armed about 00:35 for 7,800 s, fires about 02:45.
- **Root context 341 K at 00:33**: the app compacts at 368 K; after it, re-read the board, ROOT-START, GATE-USE,
  this file and `briefs/B1-4.md` (r57-0009).

## Then (2026-11-19 23:12 UTC): B1-2 landed, suite 3 passed; B1-3

- **B1-2 landed:** PLAN 22:46:14 (d64d1d71), W2 23:06:56 (`build` = 2a8480af, pre d64d1d71; lib 201, watch 78,
  status 37, guard-hook 27 pass, 0 fail, 84.6 s). **Suite 3 PASS** on 2a8480af: others 1003 pass, 0 fail, 51 skipped
  (1055) + selftest shards 29 pass; wall 150 s (`suites/3/summary.txt`). **e2e 232/232** (`suites/3/e2e.log`).
- **Meter 75 %, Fable 53 % (23:10).** The build went 64 to 75 % for about 475 M helper tokens: about 43 M a point.
  B1-2 cost W2 38.5 M (four helpers) + PLAN 21.16 M + refuters 20.8 M + the e2e helper 4.10 M.
- **B1-3 RUNNING since about 23:12** (width 2; brief `briefs/B1-3.md`; worktrees at 2a8480af): W3
  a030c4bff3f4b9c60 (`build-invariant: W3 lock and arm build`), CLOSE addaa8158397a0234 (`build-invariant: CLOSE stop
  verify build`), opus. Cap check (lengths from the last two units, r57-0416: builder 29.8 M, refuter 10.4 M; 43 M a
  point): W3 75 + 0.94 = 75.9; CLOSE 75 + 0.94 + 0.69 = 76.6, both < 78. On W3's result: its refuter `refute: W3
  blind review`; on CLOSE's result: land it (no refuter; the combined review in B1-4), lib, stop and the files it
  names, plus the e2e if it changed it. After both land: suite 4 with the e2e, then B1-4 (W4, S2.1, the combined
  review of W6, REDO, CLOSE, W4): its cap check will likely fail (about 76.6-77 % then), so `cap:` to the owner.
- **W3:** first helper **LIMIT** about 23:27 (15.1 min, 86 calls, 16.59 M, context 301 K): `u/W3` faa87c45 (63e36ff6
  all FX-W3 code: `armedState`/`checkArmed`/`requireArmed` in lib, `armedFor` in replace, `stepArmed` in the hook
  (start tool only), `turn_seq_at_reg` and the unarmed record in watch, endturn's K from turn.json; faa87c45 brief
  places 0b, 4, 6, 8, 9); `W3-first` status+watch+replace+handover 233: 187 pass, 35 fail (old fixtures that do not
  arm the turn, endturn without turn.json, the new slot field, the longer brief line), 11 skipped. **Successor
  aef6f6a6dda2f0c24 RUNNING since about 23:28** (`build-invariant: W3 lock and arm successor`; limit 12.6 M, the rest
  of 29.2 M): fixtures, 5 new tests, guard-hook (G4 needs an armed turn), specs, CONTRACT, departures, merge `build`,
  the e2e, result.
- **CLOSE:** first helper **LIMIT** about 23:30 (17.9 min, 116 calls, 22.42 M, context 305 K): `u/CLOSE` 4126cb75
  (stop request takes committed at started; stop verify confirms only on (a), (b), (c) with the wall floor through the
  sample's `at`; unconfirmed verify +1 `verify_rounds`, reason `close-missing`; `lib.fence` resets it; the hook's
  close answer anchored; the watcher's stop-verify waits for the wall floor; contract, stop spec, brief 5c);
  `CLOSE-stop-lib` 248 pass, 0 fail (T1's todo passes), redo 7, guard-hook 27 pass. The id gap stays (no measured fact
  ties the ids): a departure for S2.2. **Successor a5a161f0b987df38c RUNNING since about 23:31** (`build-invariant:
  CLOSE stop verify successor`; expected 4.5 M, limit 6.7 M, the rest of 29.2 M): "FX-CLOSE T3" end to end,
  departures, merge `build`, the e2e (stopCommitted, f1-control stop), result naming the landing's files. W3 and
  CLOSE will likely conflict (watch, lib, guard-hook, specs, CONTRACT, the e2e): CLOSE lands first (no refuter), W3
  merges `build` before its landing. Successor **LIMIT** about 23:41 (10.4 min, 6.7 M; unit 29.1 M of 29.2 M):
  `u/CLOSE` d478c7cc, FX-CLOSE T3 (close-session end to end through status and the watcher on three continuing rows
  and one ended; `closesMissing`, fenced reason, tamper, invalid claim, the orphan on the only slot, the wall floor);
  `CLOSE-status` 38 pass, `CLOSE-watch` 80 pass, 0 fail; departures/CLOSE.md 1-10 (1: the id gap for S2.2); merge of
  `build` no change. **Meter 76 % (23:42).** **Decided here:** a third helper from the cap's headroom (76 + W3's
  rest 0.3 + W3's refuter 0.25 + this 0.1 = 76.65 < 78): **af701fbec9eec4cd7 RUNNING since about 23:43**
  (`build-invariant: CLOSE stop verify finish`; expected 4 M, limit 5.5 M): the e2e (stopCommitted, f1-control stop)
  from `hx-CLOSEe2e`, departure 11, result.md naming the landing's files. On result.md: land CLOSE. Third helper
  **DONE about 23:48** (8.1 min, about 3.7 M): `u/CLOSE` 572bb8eb (only run-e2e.mjs: `closeAttempt` records each
  stopped session's close by the owner's act quoting `plan/notes/closed.txt`; the clock moves by `stop_verify_ms`
  before each comparing verify); **e2e 239/239** (7 new steps); departure 11; result.md. Unit about 32.8 M. Not done:
  the id gap (S2.2); PostToolUseFailure's error shape unmeasured; `stop_verify_ms` a guess; the e2e covers neither the
  hook's close path nor a second session in one folder. Landing at 23:50 **refused, nothing done** (exit 64): `hb` had
  `research-tree/e2e/last-result.json` and `last-run.log` modified, written by suite 3's e2e run there (both
  tracked). Copied to `suites/3/e2e-last-result.json`, `e2e-last-run.log`, restored in `hb`. **From now on: after an
  e2e run in `hb`, copy those two files to the suite's folder and restore them.** **CLOSE LANDED** 23:51:55
  (`landings.jsonl`): `build` = 91b46c34 (pre 2a8480af); stop 45, lib 203, redo 7, guard-hook 27, status 38, watch
  80 pass, 0 fail, 89.2 s. **W3 merge helper a82ae7fbbc93234e8 RUNNING since about 23:56** (`build-invariant: W3
  merge with CLOSE`; expected 3 M, limit 5 M): side branch `u/W3m` from cf7211ec in `.claude/worktrees/W3m`, merge
  `build` 91b46c34, union in lib.test.mjs, six files, guard-hook and the e2e (239 steps expected) from `hx-W3m`; done
  file `units/W3/merge.md`. **DONE about 00:12** (about 4.6 M): `u/W3m` 6b0b0af7 (parents cf7211ec, 91b46c34;
  lib.test.mjs: W3's armedState test closed, then CLOSE's T2; regions checked, no clash); watch 81, status 39, lib
  204, replace 92, handover 20, stop 45, guard-hook 28 pass, 0 fail; **e2e 239/239**. **Finding: redo.test.mjs 2
  fail** ("replace start at admitted with a manifest": exit 6 `not-armed`, expects 0 repeat and redo), on `u/W3` alone
  too (the refuter's `W3r-redo` exit 1, `W3r-redo-base` exit 0): W3's arm check covers the whole start hold, REDO's
  repeat path included, and redo.test's root has no armed `run/turn.json`. W3's builder never ran redo.test.mjs (not
  in its files). Root's reading, to be settled by the refuter's verdict: FX-W3 gates `replace start` by design
  (`armedFor`: start and fence first), so a repeat start is gated and the fixture is old (as the 35 W3 adapted).
  Either way a fix precedes W3's landing, whose files add redo.test.mjs.
- **W3 refuter BREAKING about 00:13** (33 min, 15.19 M of 15.6 M; `refute/W3.md`): the break is redo.test.mjs 2 of 7
  on `u/W3` (7/7 at 2a8480af); the smallest fix: an armed turn.json in that test's root, as W3 did in
  replace.test.mjs. Else all passes on `u/W3`: e2e 232/232, selftest 4 shards 29 pass (the builder had run neither);
  39 mutations, 30 caught, 9 survive in correct code: gating the six untested revocation reasons (cut, drop, tainted,
  stall, loop, memory) survives; a refused endturn not exiting 1 with both wake sources live survives the unit tests
  (e2e step 755 would catch it, not run); departure 10 not shown by its cited tests. **Decided here (as for W5, r57-0004):
  a fix round, no refuter successor**: the fix is the test setup the refuter named, it adds a revocation loop the
  refuter's survivors call for, and land.mjs reruns both files on the merge. **Fix helper aa31bdef7d1896180 RUNNING
  since about 00:14** (`build-invariant: W3 redo fixture fix`; expected 2.5 M, limit 4 M) on `u/W3m` in
  `.claude/worktrees/W3m`: arm redo.test's root, loop "replace revocation never gated" over every reason (shown
  failing under a scratch gate), redo + replace through the lane; done file `units/W3/fix.md`.
- **W3 fix DONE about 00:25** (3.60 M): `u/W3m` 054e9ec0 (redo.test `makeRoot({armed})`, only the start root
  armed; "FX-W3 revocation never gated" loops over the nine `lib.REASONS` but `first`, the list pinned); redo 7/7,
  replace 98 pass, 0 fail (`W3fix-redo-replace`); scratch gate of `memory` caught (`W3fix-mut-memory`). W3's helpers:
  16.59 + 12.00 + merge 4.6 + fix 3.6 = 36.8 M; refuter 15.19 M. **One background command since about 00:26:** the
  chain below.
- **On W3/fix.md (next):** in W3's worktree `git merge --ff-only u/W3m`; land W3 with tcb/test/lib, watch, status,
  replace, handover, stop, redo, guard-hook (`.test.mjs`); on exit 0 suite 4 (`suites/4/`) and the e2e
  (`suites/4/e2e.log`; 239 steps), then copy `hb/research-tree/e2e/last-result.json` and `last-run.log` into
  `suites/4/` and `git -C hb checkout --` them. Then B1-4 (W4, S2.1, the combined review `refute: W4`): get_usage
  first; the cap check per unit (builder 29.8 M, refuter 10.4 M, 43 M a point); the first unit that does not fit:
  start nothing more, let running units finish, then `cap:` to the owner with the counts.
- **Meter 76 %, Fable 53 % (00:15).** Root context 322 K at 00:15 (the app compacts at 368 K).
- **B1-4 brief written** about 00:30: `briefs/B1-4.md` (W4 `build-invariant: W4 dead-man build`; S2.1 `build: S2.1
  cross tests build` on Sonnet, its W4 test a `todo` until W4 lands; the combined review `refute: W4 combined review`
  with the items for W6, REDO, CLOSE; `refute: S2.1 blind review`; nothing installs or schedules a task on this PC).
  Cap figures for B1-4 (43 M a point): W4 34.8 M (last two builders W3 36.8, CLOSE 32.8) = 0.81; S2.1 about 14 M
  (5.5 M plan x 2.5, builders' measured ratio) = 0.33; the combined review 25.7 M (2 x the last two refuters' mean
  12.8) = 0.60; S2.1's refuter 0.30. W4 fits if the meter is at most 77; S2.1 beside it only at 76. Worktrees: cut
  `u/W4` and `u/S2.1` from the `build` tip at each start; prompts as B1-3's (brief, B1-2 and B0b parts, tokens,
  checkpoint, result last).
- **W3 DONE about 23:49** (successor, 22.0 min, 12.00 M; unit about 28.7 M): `u/W3` cf7211ec (merge of 2a8480af no
  change); `W3-tests-a` watch+status+lib 319 pass, 0 fail, 8 skipped, 1 todo (FX-PLAN T1, CLOSE's); `W3-tests-b`
  replace+handover+stop 152 pass, 0 fail; `W3-guard` 28 pass, 0 fail (`hx-W3`); 6 new tests; **e2e 232/232**
  (`W3-e2e2`: a stand-in confirmed turn before fence-first and start; fixture `replace/good-fence-first` gets
  `run/turn.json`); departures/W3.md 11; selftest.test.mjs not run (its fixture changed; suite 4 runs it).
  **Refuter a517a1f1d344986b1 RUNNING since about 23:50** (`refute: W3 blind review`). `merge-tree u/CLOSE u/W3`
  (23:50): one conflict, `tcb/test/lib.test.mjs`; run-e2e.mjs auto-merges. On CLOSE landed: a W3 merge helper on a
  side branch `u/W3m` (as W2m): union in lib.test.mjs, lib + watch + status + replace + handover + stop, guard-hook
  and the e2e (both units' steps) from outside `.claude/`; on W3's PASS: ff `u/W3`, land, then suite 4 + e2e.
- **Timer:** bmfflqc8z stopped; btj7a0xr6 armed about 23:12 for 7,800 s (3 x Q3 43 min of B1-1's and B1-2's
  builders' minutes), fires about 01:22.

## Then (2026-11-19 21:34 UTC): B1-1 done, OUT's e2e landed; B1-2

- **B1-1 is landed:** all 8 units on `build` = 4d11fa1d (W1 landed 21:13:20, pre f20fca3d; lib, watch, status,
  handover, guard-hook pass). **Suite 2 PASS** on 4d11fa1d: others 992 pass, 0 fail, 51 skipped (1043) + selftest
  shards 29 pass, 0 fail; wall 131 s (`suites/2/summary.txt`). **The e2e FAILS** (`suites/2/e2e.log`, exit 2): from
  "d-stpa: commit record stpa" exit 2 `no-ready` on, a cascade: OUT's READY fence; `run-e2e.mjs` writes no READY
  marker as a child would. Nobody adapted the e2e for OUT. Route: an OUT helper (build-invariant, opus; from the cap's
  headroom, expected 2.5 M, limit 4 M) makes the e2e write what FX-OUT's children write, iterates to 232/232 or names
  what is left by unit, lands with `e2e/run-e2e.mjs` as its file. It touches only the e2e, so it may run beside B1-2.
- **OUT e2e helper a8607645563a99acc DONE about 21:34** (`build-invariant: OUT e2e READY after suite 2`, opus), 4.10 M
  of 5 M, 34 calls: `u/OUT` a82b253b (ff to 4d11fa1d, then only `e2e/run-e2e.mjs`, +33 -9): each READY goes through
  the attempt's guard hook as a Write (child.md line 41; FIX-fence.md:109-111, 133-148), which makes the hook's ready
  slot, then READY.json as the copy; torn READY now refused `ready-invalid`, its counted step unchanged; f1-control e1's
  late READY refused `stale-epoch`, one watch step renamed (zombie-write still caught from commit intake's line). W1's
  nonce change ran first time and passes. **e2e 232/232, 0 FAIL** (`OUTe2e-1`; `units/OUT/e2e.md`, `e2e.log`).
  **LANDED** 21:32:15 (`landings.jsonl`): `build` = b6fabfa0 (pre 80ed1cc9), e2e 1 file pass, "232/232 steps ok, 0
  FAIL", 78.3 s. The e2e now passes on `build`: cross-unit items 10 and 13 closed.
- **B1-2 RUNNING since about 21:33** (width 2): W2 aee66ada5d4362946 (`build-invariant: W2 alarm slot build`) and PLAN
  ae40a3efe47e0b924 (`build-invariant: PLAN act table build`), opus, both worktrees at `build` b6fabfa0 (`u/W2` ff'd,
  `u/PLAN` cut), brief `briefs/B1-2.md`; done files `units/<unit>/result.md`. On each end: result.md present, start its
  refuter (`refute: <unit> blind review ...`, opus, per B1-2.md's Refuters part); LIMIT: a successor from
  `units/<unit>/checkpoint.md` with the rest of 29.2 M. On a PASS: `merge-tree` first, then land (files: the unit's
  test files from its result.md, plus `e2e/run-e2e.mjs` if the unit changed it). After both land: suite 3 with the
  e2e beside it, then B1-3 (W3, CLOSE; their brief items in cross-unit 5, 8, 11, 12 and the CGATE refute line).
- **W2:** first helper aee66ada5d4362946 **LIMIT** at its 330 K checkpoint about 21:49 (16.6 min, 74 calls, 14.67 M,
  context 327.9 K): `u/W2` 1ac4ce94, the FX-W2 code in watch.mjs and status.mjs (`node --check` only, no test run);
  `units/W2/checkpoint.md` lists its decisions and the steps left (fixtures, the hook form and T16, tests and lane
  runs, 3 new tests, specs, CONTRACT and brief, departures, merge `build`, e2e, result). **Successor
  a1027f5ff580339af RUNNING since 21:49:55** (`build-invariant: W2 alarm slot successor`, opus; limit 14.5 M, the
  rest of 29.2 M; counter words "W2 alarm slot successor"; at 330 K it rewrites the checkpoint). Successor **LIMIT**
  about 22:08 (18.1 min, 13.24 M of 14.5 M; unit about 27.9 M of 29.2 M): `u/W2` d5690df3 (d81b5951 tests, the hook's
  alarm form (`--ensure --nonce` required), fixtures; d5690df3 four specs and CONTRACT 3.9, tables, decisions 40-41);
  watch+status whole run `W2-ws2` 110 pass, 2 fail (fixed after; only FX-W2's 3 rerun, `W2-w3`); guard-hook from
  `hx-W2` (`W2-gh`) 27 pass, 0 fail, 3 skipped; departures/W2.md 1-9. **Decided here (at a limit, pool spent):** a
  third helper from the checkpoint, from the cap's headroom (75 % at 22:08 + PLAN's refuter 0.25 + this 0.12 + W2's
  refuter 0.26 = 75.6 < 78): **a9adddf533a132b8a RUNNING since about 22:09** (`build-invariant: W2 alarm slot finish`;
  expected 5 M from the last four such helpers, 3.40-5.04 M; limit 7 M): brief places 0a, 2, 3; whole watch+status;
  merge `build` (unions; if PLAN has landed, its conflicts too); the e2e at three points, run from `hx-W2e2e`; then
  result.md. **W2 x PLAN:** `merge-tree u/PLAN u/W2` (22:08) conflicts in `CONTRACT.md` and `spec/watch.mjs.md`
  (code auto-merges); the second to land merges `build` and resolves them as unions (a helper of that unit).
  Third helper **DONE about 22:19** (9.4 min, 44 calls, 4.14 M): `u/W2` 308abe83 (dac3c7fb coordinator brief places
  0a, 2, 3 and a line in spec/briefs.md; 308abe83 the e2e: lines 431 and 493 expect exit 1 `arm-unconfirmed`, the
  stand-in alarm writes slot-1 and its nonce file, `reconcile --arm-nonces` then exit 0); merge of `build` "already up
  to date" (b6fabfa0); `W2-ws3` watch 76 pass, 0 fail, 4 skipped, status 36 pass, 0 fail, 2 skipped; `W2-gh`
  guard-hook 27 pass, 0 fail, 3 skipped (unchanged since); **e2e 232/232** (`W2-e2e`). Unit about 32.1 M (14.67 +
  13.24 + 4.14). Not done: no tests of departures 4 and 6 or of the brief text; S1's single-death gap waits for FX-W4
  (B1-4). **Refuter ab157fee10d7cf7c4 RUNNING since about 22:19** (`refute: W2 blind review`; limit 15.6 M; verdict
  `refute/W2.md`). On PASS: land W2 with tcb/test/watch.test.mjs status.test.mjs guard-hook.test.mjs and
  e2e/run-e2e.mjs (and lib.test.mjs if the merge touched lib), after `merge-tree`.
- **PLAN: DONE about 22:02** (one helper, 28.9 min, 109 calls, 21.16 M, context 299 K): `u/PLAN` eb0c6810 (merge of
  `build` b6fabfa0 changed nothing); lib 201, status 35, watch 74 pass, 0 fail; **e2e 232/232** (outside `.claude/`);
  guard-hook, replace, stop unchanged and not run. Built `lib.planAct` (total act table, first match, Q5a only, the
  `--if-unclaimed` lease act, close-session) and `lib.planFacts`; status `nextOf` and watch `rowAct` call them; 5 new
  tests (a zombie-over row no longer raises its row act: W5's step 1 now acts). Outside its steps: `slotCount`'s
  `opts.counted` in CLAIM's `folderSessionSlots`, lines in watch `evaluate`, status.json `next` a pattern, not an enum;
  departures/PLAN.md (10). **Refuter a60baeb1f21bb9cf1 RUNNING since about 22:02** (`refute: PLAN blind review`;
  expected 5.4 M, limit 15.6 M; verdict `refute/PLAN.md`). Refuter **PASS** about 22:44 (42.4 min with two waits on
  its own backgrounded lane calls), about 10.3 M: baseline as result.md; e2e 232/232 (`hx-PLAN-r`); 66 mutations, 36
  caught, 30 survive as test gaps in code that reads right. Main gap: rev 5 point 1 `close-session` tested only in
  lib for an ended row (S5, W8: status and watcher cut off; P2d, P5f, P7b: dropped on a continuing row survive);
  `planFacts`' fenced reason, tamper, invalid claim and `closesMissing` untested (FX-CLOSE builds on `closesMissing`);
  status's lease path untested (S2, S6). Small: a start.json that does not parse, or `tick: null`, never lets the
  lease run out (row stays `none`, no owner act); an empty process list can make step 0 disagree with status.
  `merge-tree build u/PLAN` clean (22:45; PLAN's tree is `build` + PLAN). **Landing** since 22:45 (background
  bwgarqatk): lib, status, watch (`.test.mjs`); not the e2e (PLAN does not change it, and the refuter ran it on this
  same tree; it runs beside suite 3).
  **LANDED** 22:46:14: `build` = d64d1d71 (pre b6fabfa0), lib 201, status 35, watch 74 pass, 0 fail, 64.4 s.
  **W2 merge helper aa8de8d401cd31e95 RUNNING since about 22:47** (`build-invariant: W2 merge with PLAN`; expected
  3 M, limit 5 M; counter "W2 merge with PLAN"): test ahead on the success path (c1-0405) while W2's refuter runs,
  on a side branch `u/W2m` cut from `u/W2` 308abe83 in `.claude/worktrees/W2m` (never `u/W2` or W2's worktree, which
  the refuter reads): merge `build` d64d1d71, unions in CONTRACT.md and spec/watch.mjs.md, check the auto-merged
  code, lib + watch + status, guard-hook and the e2e from `hx-W2m`; done file `units/W2/merge.md`. **On W2's PASS:**
  in W2's worktree `git merge --ff-only u/W2m`, then land W2 (lib, watch, status, guard-hook, e2e). On BREAKING: the
  fix round works on `u/W2` and merges `u/W2m` or `build` again.
- **W2 refuter PASS** about 22:54 (35.3 min, about 10.5 M, context 263 K; `refute/W2.md`): e2e 232/232 on 308abe83
  (`W2r-e2e`); 40 mutations, 19 caught, 21 survive in code judged right. Main gap: no unit test of the coordinator's
  order (ensure in the background registers after reconcile r1 read the slot): the confirmation check off is caught
  by none; the refuter's scratch test (`scratchpad/W2-refute/refute-tests.txt`, 7 s) passes on `u/W2` and fails
  under it. Also uncaught: the wait's bounds, hold 2's run lock and ce re-check, the `--arm-nonces` value check (the
  only guard against `..` in file names), an abandoned ensure registering in a free slot, `alarm_ms` on its wait;
  departures 1-6 mutated, none caught (for 2, 3, 5 the cited test does not show it). Small: a corrupt `turn.json`
  restarts `turn_seq` at 1 and `unarmed_turns` at 0 (against departure 5); per-turn nonce files never pruned.
  **Decided here (r57-0417, a check before work is stacked on a part):** W3 builds on the confirmation path next, so
  the merge helper (SendMessage 22:56, limit now 6.5 M) also adds the refuter's order test and a test that
  `--arm-nonces` refuses `..` or a separator, on `u/W2m`. The other survivors go to the end list.
- **W2 merge helper DONE about 23:05** (17.9 min, 6.48 M of 6.5 M): `u/W2m` debb0009 = merge 2dfb84fb (308abe83 +
  d64d1d71; CONTRACT.md: W2's decision-41 paragraph, then PLAN's FX-PLAN section; spec/watch.mjs.md: W2's lines, then
  PLAN's section; the code checked, no clash) + the two tests (watch "FX-W2 the coordinator's order", 7.1 s; status
  "FX-W2 --arm-nonces refuses .. or a path separator", 13 values, exit 66 before any write). lib 201 pass, status 37,
  watch 78, guard-hook 27, 0 fail; e2e 232/232 (`hx-W2m`); `units/W2/merge.md`. W2's helpers: 14.67 + 13.24 + 4.14
  + 6.48 = 38.5 M; refuter 10.5 M.
- **One background command bctjs17eg since about 23:06:** ff `u/W2` to `u/W2m` (debb0009), land W2 (lib, watch,
  status, guard-hook; not the e2e, which runs beside suite 3 on the same tree), and on exit 0 suite 3
  (`suites/3/`) then the e2e (`suites/3/e2e.log`). Then: get_usage, the cap check, B1-3 (W3, CLOSE) from the new
  `build` tip with `briefs/B1-3.md`.
- **B1-3 brief written** 22:52: `briefs/B1-3.md` (items 5, 8, 11, 12, 14, 15 and CGATE's anchor routed; CLOSE lands
  on its builder's end; counter words "W3 lock and arm build", "CLOSE stop verify build", "W3 blind review").
  15. **For CLOSE's brief (B1-3), from PLAN's refuter:** CLOSE's tests cover `close-session` end to end through status
     and the watcher, on a continuing row too, and test `closesMissing` and the `planFacts` facts it reads (fenced
     reason, tamper, invalid claim); for S2.2: a start.json that never parses keeps a row at `none` with no act.
  14. **For CLOSE's brief (B1-3), from PLAN's "not done":** stop.mjs still refuses `committed` at `started` (PLAN's todo
     test) until FX-CLOSE step 3; FX-CLOSE should reset `verify_rounds` at the fence, as the model does; a close-session
     ends only with the owner's `closed` until a CLI-to-app session id map exists (CGATE departure 1, item 5).
- **Timer:** bobcigq6o stopped; bmfflqc8z armed about 21:33 for 7,000 s (3 x Q3 39 min of B1-1's builders' minutes:
  14.4, 18, 23.5, 24, 29.5, 35.5, 43, 50), fires about 23:30.
- **B1-2 waits for that helper (the gate):** W2's start at 21:27 was refused, "W2 (batch B1-2) waits for OUT of batch
  B1-1 (a helper for it still runs)". So B1-2 starts after B1-1's e2e is right, as the plan orders B1-2 after suite
  2. Ready: `briefs/B1-2.md` (written 21:26; items 4, 9, 12, the stubs line, merge `build` and the e2e before the
  result, counter words "W2 alarm slot build" / "PLAN act table build", refuters "W2 blind review" / "PLAN blind
  review", scratch folders `<unit>-build/`, `<unit>-refute/`); W2's worktree cut at 21:27 (`u/W2` at 4d11fa1d); the
  W2 prompt (B1-2.md, B0b's common part, `units/W2/result.md` last). PLAN's worktree is cut from the `build` tip at
  its start (after OUT's e2e lands).
- **Cap (21:17, meter 74 %, Fable 53 %):** B1-1 used about 286 M helper tokens for about 7 points (67 to 74 %), about
  41 M a point. A B1-1 unit with its refuter averaged 38.4 M (builders 27.7 M, 14.9-46.7; refuters 10.7 M), about
  0.94 point. W2: 74 + 0.12 (the e2e helper's limit) + 0.94 = 75.1 < 78; PLAN: + 0.94 more, 76.0 < 78: both may
  start. Forecast: about 76 % after B1-2, about 77.6 % after B1-3 (CLOSE has no refuter), so B1-4 likely meets the
  cap line: then `cap:` to the owner.
- **Records committed** onto `build` through `hb` at 21:31: 80ed1cc9 "Build records: slice 0 and batch B1-1" (369
  files, the untracked `research-tree/build/` files as they stood). `build` = 80ed1cc9. The live files stay in MAIN.
  Removed `hb/research-tree/e2e/w/` (left by suite 2's crashed e2e run).

## Then (2026-11-19 19:45 UTC): slice 1, batch B1-1 at width 7

- Brief `research-tree/build/briefs/B1-1.md` (builders and refuters; it points into `briefs/B0b.md`'s common parts).
- Builders (build-invariant, opus; worktrees `MAIN/.claude/worktrees/<unit>` on `u/<unit>` cut from `build` ec3b04fd;
  done file `units/<unit>/result.md`) started 19:16:33: W1 afa352f9c9539c083 | OUT abb7593831c74ad99 | CLAIM
  a8fd3744c0a185ea9 | CGATE aab8967597c5fb65c | W5 a61a93f82c8559af4 | W7 aa0baf1595d20e783 | W6 a8d782effa0a54557.
  REDO af568f44326e6c053 started 19:31:23 when W7 ended (the 8th unit; no refuter of its own).
- W6: DONE 19:40:03, `u/W6` 5b5ede1d, 15.99 M; departures/W6.md (8; no "continue" act, so an acknowledgement re-arms
  the age cap; no coordinator-brief line for `idle-child` / `age-cap`). **LANDED** 19:41:08: `build` = 8269b551 (pre
  ec3b04fd), lib 192 + watch 68 pass, ran 56.4 s, waited 0 (`landings.jsonl`). No review of its own (combined in B1-4).
- W7: DONE 19:30:58, `u/W7` bb0295bb, 14.92 M, lib+watch 259 pass; departures/W7.md (9). Refuter ae3fdf6f65e16618f
  **PASS** 20:00 (refute/W7.md), 9.76 M: 10 of 15 mutations caught, 5 survive as test gaps (end list). Landing 20:00:
  **exit 2, textual conflict** in `research-tree/spec/lib.md` (with W6's landed text); aborted, `build` unchanged at
  35647885. Merge helper (build-invariant, opus) RUNNING since 20:04: merges `build` into `u/W7`, the union of the
  spec text, lib+watch through the lane, done file `units/W7/merge.md`; expected 2 M, limit 4 M from the unit's rest
  (29.2 less 14.92 M). On merge.md: land W7 again (tcb/test/lib.test.mjs tcb/test/watch.test.mjs); no new review
  (a text union of two passed units; land.mjs re-runs the files). Merge helper DONE 20:09, 1.03 M: `u/W7` 31658ae7
  (only spec/lib.md conflicted: two adjacent bullets, each kept whole), lib+watch 262 pass, 0 fail
  (`W7merge-lib-watch`). **LANDED** 20:06:51: `build` = 52ae0f99 (pre a119d805), lib 193, watch 72 pass, 0 fail.
- W5: DONE 19:34:36, `u/W5` 34e49baa, 15.18 M, watch 67 pass; departures/W5.md (5); step 1 acts only once FX-PLAN
  fills `rowActPlanned` (B1-2); CONTRACT 3.10 and decision 40 left to S2.1. Refuter afc4bdb5918342808 ended 19:58, 10.09 M:
  **BREAKING** (refute/W5.md): W5's own test `W5 stuck` fails on `build` with W6 landed (W6 counts nothing on an
  epoch's first tick and times a model-kind hang by `model_ticks`); the re-raise works on the merge with only the test
  changed; 12 mutations caught, 6 survive as test gaps (M18 the one that matters: `stuck` shown only on a raise's
  tick, while FX-W4 reads it at its own times). **Fix round** ac0fe62579b8484a2 RUNNING since 19:59 (merge `build`,
  adapt the test, one test for M18 shown failing under it, whole watch file; done file `units/W5/fix.md`); expected
  about 3 M, limit 6 M from the unit's own rest (29.2 less 15.18 M). **No refuter successor (decided here):** the
  change is a test, the refuter already ran the adapted test on the merge, the helper shows M18 killed, and land.mjs
  re-runs the file on the merge; a second review could not change what is done next (r57-0004). On fix.md: land W5
  with tcb/test/watch.test.mjs. Fix round DONE 20:07, 2.64 M: `u/W5` 94b732db (merge f03772db of 35647885, no
  conflict, no code changed); test on W6's timing; new test `W5 stuck stays` fails under M18 (`W5fix-M18`); whole
  watch 71 pass, 0 fail, 4 not run (`W5fix-watch`). **LANDED** 20:05:22: `build` = a119d805 (pre 35647885),
  watch 71 pass, 0 fail, 61.5 s. (Clock times written by the root for 20:0x are approximate; the records' are exact.)
- W1: first helper LIMIT 19:32:05 at 325 K context, 15.05 M, commit b1e11391 (liveness, exitMarkers; no tests run);
  second helper ab59e706cb7c2a8a8 LIMIT 19:50 at the unit's 29.2 M (13.49 M + about 0.5 M), commit a78deee2 (code
  and tests built: lib 193, status 34, guard-hook 18 pass; whole watch file not run); checkpoint 2 lists the rest
  (whole watch run, `.gitignore` run/arm/, CONTRACT 1.2 / 3.9 / decision 41, four specs, departures, result).
  **Decided here (section 3, at a limit):** a successor, not a SendMessage continuation (the second helper's context
  was 246 K: about 280 K a call against about 100 K fresh); third helper ae7726166b5192dce RUNNING since 19:52,
  expected about 6 M (OUT's successor: 47 calls, 3.81 M; this list is longer), limit 10 M from the pooled reserve;
  it first merges `build` into `u/W1` (W6 landed) so its CONTRACT and spec text sits beside the landed units'.
  Third helper DONE 20:06:01 (gate log), about 9.2 M: `u/W1` 2aff1708 (merge 8997471d of 8269b551, no conflict); lib 193,
  watch 69 (whole file), handover 19, status 34, guard-hook 18 pass, 0 fail; `.gitignore` run/arm/, CONTRACT 1.2,
  3.9, row 67, R6-b, four specs; departures/W1.md (11). Unit about 38.2 M. Not done: step 6 (L2 beat, by branch L1),
  R55, `unarmed-*` of an older ce kept. Refuter aa287c5263e81e215 **PASS** about 20:26 (refute/W1.md), 10.02 M: every
  FX-W1 invariant caught; 6 survive (M10c: T16 checks seams on each script's first form only, `--boot` on `replace
  fence` survives, two lines to loop over every `prod` entry; M3c, M4, M9, M9b, M13b). T16's coupling is FX-W1's
  design; `--if-unclaimed` and `--nonce` are already in the table. Owner acts: not a W1 departure (FX-W1 filters no
  values; `spec/status.mjs.md:16,21-22` makes `owner --act ... --quote-file` a coordinator call). **Unfilled:** places
  0a (FX-W1's) and 4 (FIX-JOIN point 1's watcher-restart act, which W3's brief carries) of `tcb/briefs/coordinator.md`
  still read "(empty until FX-W1)". `merge-tree build u/W1` clean at 1ed537d8 (20:27), but W1 conflicts with OUT
  (status spec "Reads" line, lib.test.mjs stubs line) and CLAIM (stubs line), so it lands **last** (queue): a W1
  helper merges `build`, resolves those as unions, fills place 0a from FX-W1, loops T16's seam check over every
  `prod` entry (M10c), runs guard-hook from outside `.claude/`; then land W1: tcb/test/lib, watch, status, handover,
  guard-hook (`.test.mjs`).
- CGATE: first helper LIMIT 19:33:05, 17.36 M with its checkpoint, no code; successor ac345d8c8a05448f7 DONE 19:59,
  `u/CGATE` b44ef80a (D1-D11 built), guard-hook 22 (from `hx-CGATE`), handover 20, status 31, selftest shards 29
  pass, 0 fail; departures/CGATE.md (8). **The successor used 24.40 M against its 12.9 M limit** (its counter read the
  first helper's frozen transcript: departures below); unit 41.8 M against 29.2 M. Not done: the app-id to CLI-id map;
  Post event delivery and the three MCP tools' prompts need the app. Refuter aa63b385ac07bb348 **PASS** about 20:22
  (refute/CGATE.md), 9.53 M: 21 of 23 mutations caught; the id gap makes no close unsafe; the app-dependent parts
  fail closed. Two catches on the owner's `closed` act: the coordinator can run it (W1's allow list admits `status
  owner` with any act; the quote file is under `plan/notes/`) — sent to W1's refuter, cross-unit item 11; and a
  `stop_session` answer whose title holds "already archived" / "not found" makes the hook write a close record while
  the session lives (moot under the gap; anchor the match before any id map: CLOSE's brief). `merge-tree build
  u/CGATE` clean (20:23); **LANDED** 20:25:30: `build` = 1ed537d8 (pre 52ae0f99), guard-hook 22, handover 20, status
  31, selftest 4 shards pass, 0 fail, 72.9 s. Files were: tcb/test/guard-hook.test.mjs
  handover.test.mjs status.test.mjs selftest.test.mjs. **Design gap it measured (route it):** the app's
  stop and archive tools take `local_<uuid>`, the hook's session_id is the CLI id; FX-CLOSE and FX-CLAIM step 7 look
  done files up by CLI id, so until something maps the two every close ends with the owner's `closed` act (safe, a
  gap). Put it in CLOSE's brief (B1-3) and CLAIM's review; S2.2 models it.
- OUT: DONE 19:46 (successor a684f234abbd62373 from `units/OUT/checkpoint.md`), `u/OUT` e38717a3, unit about 24.5 M
  (first helper 20.64 M, successor 3.81 M); lib 192, commit 35, replace 84, fsck 21, watch 65, status 30, guard-hook 20
  pass (from `hx-OUT`), 7 new tests incl. the hook as a process (M25); departures/OUT.md (7). Not done: CONTRACT 3.6's
  row, guard-hook.mjs header line 8, `spec/status.mjs.md` line 62 (`ready-unparseable`); no status test of
  `outcome-tamper`; selftest not run. **Landing conflict expected** on the `const stubs` line of lib.test.mjs with W1
  and CLAIM: resolve as the union of the removals (merge `build` into the later unit's branch, then land.mjs).
  Refuter ac4cd9bbe6907172b **PASS** 20:14 (refute/OUT.md), 13.78 M: 26 of 44 mutations caught incl. the hook clock
  (S0.4's M25 closed); survivors equivalent or test gaps (end list); selftest shards 29 pass; the three open items
  break nothing. `git merge-tree build u/OUT` at baf8c7b3 (20:40): conflicts in spec/replace.mjs.md, tcb/test/guard-hook.test.mjs,
  tcb/test/lib.test.mjs. Merge helper DONE about 20:46, 1.59 M: `u/OUT` 558797e4 (three one-block unions, no
  departures); lib + redo 203 pass, guard-hook 26 pass (FX-OUT 1-2, the hook clock, G1-G5), 0 fail. Landing 20:47:41:
  **exit 1, undone** (`build` stays baf8c7b3): all pass but replace.test.mjs 2 of 89 (alone too): OUT's "FX-OUT 3"
  subtest "a fence of a running attempt writes one fenced slot, then the CAS" expects 65, gets 0 (REDO answers an
  identical repeated fence with 0 `repeat`). Fix helper DONE about 20:57, 3.06 M: setup, not a design
  clash (the second fence was identical, so REDO's repeat answered 0 as designed; the fence writes slot, tombstone, CAS,
  line: a death before the CAS is OUT's retry, after it REDO's repeat); `u/OUT` 6b5c48da, test only plus one spec
  sentence, no departure; replace 87, redo 7 pass, 0 fail. **LANDED** 20:56:59: `build` = f20fca3d (pre baf8c7b3), lib 196, commit 35, replace 87, fsck 21,
  watch 72, status 31, guard-hook 26, redo 7 pass, 0 fail. OUT's helpers after the first two: merge 1.59 M, fix
  3.06 M (unit about 29.2 M). **W1's last helper RUNNING since 20:58** (merge f20fca3d: status spec and lib.test.mjs
  conflicts; place 0a; M10c; the e2e's nonce; guard-hook and e2e outside `.claude/`; done file `units/W1/last.md`;
  counter words `W1 final merge`; expected 3.5 M, limit 5 M): **LIMIT** at 5.04 M about 21:08, all committed: `u/W1`
  e9f6482b (merge a9075b50: unions; place 0a filled; T16 loops seams over every `prod` form; the e2e reads the nonce
  from the raise's brief line, writes `run/coord-session-2.json` as the hook would, binds with `--nonce`); lib 197
  pass. Not run by it: guard-hook, the M10c check, the e2e. **Decided here:** land W1 now (the landing runs
  guard-hook outside `.claude/`; the e2e runs beside suite 2) and a records helper (limit 2 M) shows M10c fails, adds
  the departures, writes `units/W1/last.md`. W1 landing 21:05:51: **exit 1, undone** (`build` stays f20fca3d):
  lib 197, watch 73, status 35, handover 20 pass; guard-hook 1 fail: CGATE's G1 "bind by nonce" expects `deny
  stale-coordinator` for "an extra flag" and "status.mjs with the bind flags" and gets W1's `deny bash-pattern: flag
  not allowed` (both deny; the step differs). Sent to the records helper a96e8118c18f052b1 (SendMessage, limit now 5 M):
  follow the designed step order (FIX-JOIN 2b, the guard-hook spec), fix code or G1's two reasons, guard-hook from
  outside `.claude/`, then departures and last.md with the new commit. Records helper DONE about 21:20, 3.46 M: M10c caught
  (T16 fails the two `replace fence --boot` cases); G1: by design FX-W1's allow list runs first (FIX-JOIN 2b rows 1-2;
  the spec's step 6 before step 7; FIX-fence part 3 step 2), the code already did, so G1's two reasons are now
  `bash-pattern`, plus a `--dry-run` case for `stepBind`; guard-hook 27 pass, 0 fail (`W1rec-guard`); departures 13;
  `units/W1/last.md`; `u/W1` 9089fa97; unit about 46.7 M. **One background command since about 21:21:** land W1
  (five files), and on exit 0 suite 2 (`suites/2/`) then the e2e (`suites/2/e2e.log`). Files: tcb/test/lib.test.mjs
  commit.test.mjs replace.test.mjs fsck.test.mjs watch.test.mjs status.test.mjs guard-hook.test.mjs (land.mjs runs in
  `hb`, outside `.claude/`).
- CLAIM: DONE 19:52 (one helper, a8fd3744c0a185ea9), `u/CLAIM` 14dc9a06, 27.85 M of 29.2 M, 151 calls; replace 82,
  lib+admit+stop+status+handover 321, guard-hook 18 (from `hx-CLAIM`), watch 65 pass, 0 fail; departures/CLAIM.md
  (12). Not done: no status test for reconcile by claim; the end-to-end file not run (bind now needs a claim).
  Refuter a56b81195ae6ddba0 **PASS** about 20:09 (refute/CLAIM.md), 10.76 M: 20 of 20 mutations caught; 4 survive
  together (reconcile by claim; `{root}` dropped in slotCount's status, admit, handover calls: without a root step 7
  counts nothing, against JOIN point 7, an unrecorded departure, no caller drops it today); the three named
  departures sound; the id gap makes no close unsafe (a miss counts the session). **The e2e fails on CLAIM's commit**
  (`d-stpa: replace bind e1` exit 6 not-claimed, then a cascade); with two lines simulating the hook's claim before
  each bind it passes 232/232 (cross-unit item 10). Landing 20:10:41: **exit 2, conflicts** in spec/replace.mjs.md,
  status.mjs.md, stop.mjs.md; aborted, `build` unchanged at 52ae0f99. Merge helper RUNNING since 20:11 (merge
  `build`, spec unions, the e2e's two claim lines and the e2e run; not the unit's eight files, which the landing
  runs; done file `units/CLAIM/merge.md`); expected 2.5 M, limit 4 M beyond the unit's 29.2 M (1.35 M left; the pool
  is spent: from the cap's headroom, decided here). Merge helper DONE about 20:20, 3.40 M: `u/CLAIM` cbe4367f (three
  specs: CLAIM's section then REDO's, both whole; no code conflicted); e2e lines in `run-e2e.mjs`; e2e 232/232 from a
  checkout outside `.claude/` (`CLAIMmerge-e2e-hx`, 88 s; inside `.claude/` it is not a result). Landing again
  20:23:30 with the eight files plus redo.test.mjs: **exit 1, undone** (`build` back at 52ae0f99): the eight pass,
  **redo.test.mjs fails 3 of 5, alone too** (log `landings/20261119T202218Z-CLAIM-38384/`): fence "the seam kills the
  fence line" exit 2 not 70; bind exit 6 (not-claimed) not 70; one more. A real CLAIM x REDO interaction (the claim
  before bind, and CLAIM's fence writes against REDO's exact post-state). **Fix helper DONE about 20:37, 6.08 M**: `u/CLAIM`
  2fd62e88 (merge 316c99ca of 1ed537d8; spec/guard-hook.mjs.md union). Both redo failures were setup (fence `no-parent`
  without attempt folder and claim; bind before any claim); two REDO lines were wrong on the merge and now have tests:
  FX1 `replace.mjs` `fenceRedo` (a no-start fence's line had `restart_charged` true), FX2 `stop.mjs` `stopRedo` (the
  stop-request line names the claim holder and, after a tombstone, the folder sessions); FX3 `stepClaim` uses CGATE's
  `SESSION_ID_RE` (item 3 done). redo 7/7, replace 82, stop 40, guard-hook 23 pass; **e2e 231/232: "handover bind
  (successor session)" exits 66, CGATE's bind needs `--nonce`** (item 13). FX1 and FX2 change REDO's code: for the
  combined review in B1-4. **LANDED** 20:40:15 (third landing): `build` = baf8c7b3 (pre 1ed537d8); replace 82,
  lib 196, admit 37, stop 40, status 31, handover 20, watch 72, guard-hook 23, redo 7 pass, 0 fail. CLAIM's helpers
  after the builder: merge 3.40 M, fix 6.08 M (unit about 37.3 M). Before (the plan was): merge `build`, make both invariants hold (REDO's repeat only at the exact
  post-state; CLAIM's bind needs the claim; FIX-JOIN 2b's order of acts decides), item 3 (CGATE's `SESSION_ID_RE`),
  redo + touched files + e2e; then land CLAIM with the nine files.
  (Before the verdict:)
  on PASS land CLAIM: tcb/test/replace.test.mjs lib.test.mjs admit.test.mjs stop.test.mjs status.test.mjs
  handover.test.mjs watch.test.mjs guard-hook.test.mjs (plus the e2e file if the refuter shows it is affected).
- REDO: DONE 19:55, `u/REDO` a2346a92, 17.24 M (89 calls); redo.test.mjs (new) 5, replace+stop+render 146,
  status+fsck+redo 55 pass, 0 fail; departures/REDO.md (9: test in its own file, 2 tests not 1; replace T9's second
  fence now reason `hang`; `stop request` at stopped adds the confirmed line; start path tested from the row). Not
  done: the start death through the seam; fsck cannot see a missing `started` / `stop-request` line once the row
  moved on (for the combined review in B1-4). **LANDED** 19:56:02: `build` = 35647885 (pre 8269b551), redo 5,
  replace 79, stop 36, render 31, status 30, fsck 20 pass, 0 fail, ran 46.2 s, waited 0.
- **Cross-unit items** (each goes where named; a landing conflict goes back to the unit as a merge of `build` into
  its branch by a helper of that unit, then land.mjs again):
  1. lib.test.mjs's shared `const stubs` line (OUT, W1, CLAIM; W6 landed): the union of the removals.
  2. FX-W1's allow list must admit `replace --if-unclaimed` (CLAIM): whichever of W1 and CLAIM lands second.
  3. guard-hook's own session-id check becomes FX-CGATE's `SID_RE` (CLAIM, CGATE): whichever lands second.
  4. FX-PLAN must call `startLeaseExpired`, pass the flag on the lease act and order bind after it (CLAIM); W5's step 1
     acts only once FX-PLAN fills `rowActPlanned`: both into PLAN's brief (B1-2).
  5. The app-id/CLI-id gap (CGATE): CLOSE's brief (B1-3), CLAIM's review (told), S2.2.
  6. W6 re-arms `age-cap` on an acknowledgement, so FX-W5 never raises it again and its stuck path for B5.2 is gone
     (W5's refuter): the combined review of W6 in B1-4 judges it.
  7. FX-W1's allow list must admit `handover bind --root --ce --nonce` (CGATE): whichever of W1 and CGATE lands second.
  8. FX-W3's brief section 6 must give an absolute `cwd` and `use_worktree: false` (CGATE): W3's brief (B1-3).
  9. W1's guard-hook test T16 reads every script spec's "## Command line": a unit that adds a `--flag` there must add
     it to `EXEC_FORMS`, or T16 fails at that landing (W1's third helper). So items 2 and 7 fall to whichever of the
     pair lands second, and the briefs of B1-2, B1-3 and B1-4 say it.
  10. The end-to-end file needs two lines that simulate the hook's claim before each bind (CLAIM's refuter: 232/232
     with them). Done by CLAIM's merge helper (cbe4367f). The e2e (`run-e2e.mjs`) is not a `.test.mjs` file, so
     neither land.mjs nor suite.sh runs it: run it beside each full suite from `hb` (outside `.claude/`), through the
     lane, from suite 2 on.
  11. The owner's `closed` act is relayed by the coordinator with a quote file by design (`spec/status.mjs.md:16,21-22`;
     Q5a keeps owner acts out of FX-PLAN's start and stop): W1's refuter rules it no W1 departure. Under the id gap
     every close ends with that relay, so a close's safety rests on the coordinator quoting the owner truthfully: for
     S2.2 (model it) and CLOSE's brief (B1-3: the id map removes the dependence).
  13. The e2e's "handover bind (successor session)" exits 66 on `build` since CGATE: its bind needs `--nonce` and
     `run-e2e.mjs` passes none (CLAIM's fix helper). The last landing fix of B1-1 (W1's helper) gives the e2e the
     nonce as FX-CGATE passes it, then runs the e2e outside `.claude/`.
  12. W2's brief (B1-2): remove the bare `--alarm` (W1's departure 2). W3's brief (B1-3): place 4 of
     `tcb/briefs/coordinator.md`, the watcher-restart act (FIX-JOIN point 1). CLOSE's brief (B1-3): anchor the
     `stop_session` answer match (CGATE's refuter).
- On each builder's end: result.md present: start its refuter `refute: <unit> ...` (opus; W1, OUT, CLAIM, CGATE
  only now; W6 and REDO have none until the combined review in B1-4); tell CLAIM's refuter the app-id/CLI-id gap.
  LIMIT: a successor from `units/<unit>/checkpoint.md` with the rest of 29.2 M (r57-0038; more from the reserve only
  by decision here).
- On a refuter's PASS (REDO: on the builder's end): land, one at a time, first in first out, as a background
  command: `cd C:/Users/User/Documents/projects/hb/research-tree && node tools/land.mjs <unit> <test files of the
  unit's scripts>` (exit 0 landed; 1 tests failed and undone; 2 conflict; see `units/S0.6/result.md`). A BREAKING
  verdict: the unit goes back to a fix round (as S0.5's), then a refuter successor.
- **Landing queue (20:50; `build` = baf8c7b3 with W6, REDO, W5, W7, CGATE, CLAIM):** OUT (fix helper running; on
  fix.md land it) → W1 (after OUT lands: ONE W1 helper (build-invariant, opus; limit from the cap's headroom, about
  4 M) merges `build` (unions: lib.test.mjs stubs line, status spec "Reads" line), fills place 0a of
  `tcb/briefs/coordinator.md` from FX-W1, loops T16's seam check over every `prod` entry (M10c), gives the e2e the
  nonce as FX-CGATE passes it (item 13), runs guard-hook and `run-e2e.mjs` from a checkout outside `.claude/`; then
  land W1: lib, watch, status, handover, guard-hook) → suite 2 with the e2e beside it. (Earlier plan, done: CLAIM →
  OUT
  (after CLAIM lands: `git merge-tree --write-tree --name-only build u/OUT`; a conflict in spec/replace.mjs.md is
  likely: an OUT merge helper, limit 3 M from its rest) → W1 (PASS; its helper as in W1's bullet; items 2 and 7 need no
  change, T16 checks them at the landing) → suite 2 and the e2e. Before each landing: `merge-tree` first (scratchpad file, not /tmp).
- After all 8 landed: **suite 2**: `node MAIN/research-tree/tools/lane.mjs --label suite-2 --timeout-s 600 -- bash
  MAIN/research-tree/build/tools/suite.sh C:/Users/User/Documents/projects/hb/research-tree
  MAIN/research-tree/build/suites/2` (background). Then B1-2 (W2, PLAN; width 2), suite 3, B1-3, suite 4, B1-4 with
  the combined review of W6, REDO, CLOSE, W4, suite 5, slice 2.
- Background: wake timer b02jsc2gh fired about 20:23; re-armed about 20:23 for 5,000 s (3 x Q3 28 min of B1-1's
  refuters: W7 28, W5 21.5, OUT 28, CLAIM 16.5, CGATE 22.5 min), fires about 21:46; re-arm at 3 x Q3 of the
  running units' minutes when B1-2's builders start.
- Meter 72 % all models, 51 % Fable (20:01; 70 % at 19:44); stop line 78 %; log `usage.jsonl`. From slice 0 (105 M for 3 points) and
  B1-1 so far, about 35 M helper tokens a point. Forecast, not a decision: B1-1's rest (running helpers to their ends,
  four refuters, no fix round) about 90-130 M, so about 73-74 % at its end; B1-2 about 1.5-2.3 points; so the cap line
  is reached in B1-3 or B1-4, where the gate rule of ROOT-START ("start no new unit once ...") decides, then `cap:`.
- Compaction: the app compacted this root at about 19:41 (context about 368 K). After re-reading the board,
  ROOT-START, GATE-USE, the B1-1 and B0b briefs and this file, the context is 141 K. Hand-over point by section 5
  with F 141 K (R 2.33 M, g 1.3-2.3 K): about 220-245 K. The owner was told at 19:35 that a successor was due; the
  compaction stands in for it until that point. At 20:01 the context is 222 K, at that point again: the root keeps
  working (a successor starts only on the owner's typed turn) and writes this file at every wake.

## Done: slice 0 (report `research-tree/build/reports/slice-0.md`; page `reports/slice-0.html`, private Artifact
https://claude.ai/artifact/LQBLR8RtqcZ8Wud54mKY3n, not screenshot-checked; the report was given to the owner 19:35 UTC)

- `build` was ec3b04fd at slice 0's end. Landings (`landings.jsonl`): S0.4 f852145c (by hand), S0.6 575db127 (by
  hand), S0.5 ec3b04fd (land.mjs). Suite 1 on ec3b04fd: 940 + 29 pass, 0 fail, 53 skipped, 114 s (`suites/1/`).
- Facts (`facts/`): FP1b-FP2, FP12, WH5-Wturn, Wturn-2 (working coordinator turns pass 60 min), Wallow.
  `branches.md` (S0.3, 17 branches; refuter PASS, four rows in part).
- Tokens (helpers): S0.1a-d about 2.5 M; Wturn-2 about 1 M; S0.3 8.79 M, refuter 9.4 M; S0.4 15.68 M, refuter 5.15 M;
  S0.6 4.96 M, refuter 6.32 M; S0.5 27.9 M (two helpers) + fix round 5.56 M, refuters 15.43 + 6.55 M. About 105 M
  against 78.6 M planned for slice 0 (x 1.35).

## End list (fixed at the end; nothing here breaks a unit)

- S0.3 refute: rows 1 (Q5), 3 (L1), 15 (U5-PF-1), 16 (PROBE 5) reasons to correct in branches.md; line references
  FP1b-FP2.md:13-15, WH5-Wturn.md:50 past the files' ends; `realert_runs` 6 a guess; `lock-break` covers `run.lock`.
- S0.4 refute: budget reach past the temp file untested (M32, M5, M8, M9); the probe's nlink/dev/ino/bytes (M16);
  monotonic clock (M12); R13's sentence in the protocol document; FAT/exFAT link error code unmeasured.
- S0.6 refute: survivors M20, M06/M07, M23, M29, M15/M16, M03, M10, M17, M27, M31, M33, M35, M36; a killed lander
  exits 1 like "tests failed"; after exit 4 below the tip the next landing goes ahead on the failing merge.
- S0.5 refute: L5 (helper path), L12 (`N_cap` tag) survive as test gaps; threshold values and the `nostart` /
  `verify_rounds` keys unpinned by tests; FX-PLAN's `start-session` has no brief place of its own.
- For S2.2 (the model as built): a start called on a turn the app refuses (the hook may have written `start.json`;
  after H_nostart = 2 such fences the task is charged without a fault) as a fault; `--if-unclaimed` not modelled;
  starts depend on the owner typing (flag). Not recorded: whether a refused start leaves `start.json`;
  `stop_session` only interrupts a turn by its own description (against F-P10a); `archive_session` needs approval.
- W7 refute: survivors M9 (schedule 18's own property), M13 and M14 (watcher.lock lost while a watcher runs), M17
  (the short wait), M5 (the re-judgement after `progress`); CONTRACT 2.1 and the RUNTIME_FILES writer line for
  watcher-busy.json; spec step 4 wording; W7's departure 1 has no test.
- CGATE refute: PROBE 8(b) (a repeat start needs a non-null tool_use_id) has no test; `session_tools` profile checks
  tested only through the shipped profile; the start-tool field check is a deny-list; settings name
  `PostToolUseFailure` (unmeasured on another app version). CLOSE's brief: anchor the `stop_session` answer match.
- OUT refute: tests to add (S2.2 or a fix round): the two lib race tests (A2, A3: the fence/hook race, re-read after a
  lost name; a scratch race test kills each), `start` makes `outcome/` (F11), dry run writes nothing (F8), R-b (L2),
  a slot-only and a READY-only case in watch and status (W1/S3, W2/S1), hook order (O1), tamper shapes L3/L7/L8/L9.
  The three shared lines (a comment and two doc lines) for S2.2 to reword.
- CLAIM refute: slotCount without `{root}` counts nothing in step 7 (fail open, against JOIN point 7; no caller drops
  it); no status test of reconcile by claim (S2.1); T7c's "no slot" check is vacuous; the dry run ignores no-start.
  For S2.2: `--if-unclaimed` checked before FX-OUT's writes leaves a millisecond window; closing it needs a joint
  order change (tombstone before the slot).
- W5 refute: survivors M8 (`run-terminal` raised again), M9 (20 and 22), M10 (other classes), M14 (missing-key
  fallback) pass the whole file; M1 (`ownerOrNone`) unreachable until FX-PLAN fills `rowActPlanned`.
- W6 (for the combined review in B1-4): no "continue" act, so an acknowledgement re-arms the age cap; no
  coordinator-brief line for `idle-child` / `age-cap` (departures/W6.md).
- W2, PLAN, W3 and S2.1 refuters: their surviving mutations (test gaps, code right) are listed in their verdicts
  (`refute/W2.md`, `refute/PLAN.md`, `refute/W3.md`, `refute/S2.1.md`); S2.1's T1 counts `not-armed` as accepted.
- Combined review (`refute/W4.md`): survivors W6 5 (the first tick with a missing transcript, unreadable counted as
  model, the bg-wait deadline, age counted only at bound, READY voiding idle-child and age-cap), REDO 1 (fsck's
  stop-request warning), CLOSE 1 (verify (a) alone: in every test the claim holder is also a folder session). For
  S2.2: W6 item 6 (model "ack = continue"; S2.4 sends it back if the owner is never reached), with the coordinator
  brief's idle-child / age-cap line. REDO: a row committed at `started` gets no started redo and no warning. CLOSE:
  `stop_verify_ms` a marked guess; the e2e covers neither the hook's close path nor a second folder session (unit
  tests do). For the pilot: long coordinator turns (89 over 60 min in `facts/Wturn-2.md`) will raise false dead-man
  toasts.
- Suite 5: stop.test "FX-CLOSE T1" subtest (c) is flaky under the full suite: it reads the real process list, and
  processes of other test files can carry the same fixture folder or session id (probable cause); it passes alone
  (`suites/5/stop-alone.log`). Fix: own ids per test file, or a fake process list.
- Records of the build (`research-tree/build/` files written by the root and its helpers) are not committed yet:
  commit them onto `build` (through `hb`) at a quiet point.

## Notices read

- 16:50 UTC: the top session's notice of the gate's version 2 and the guard on Bash and PowerShell: done files last
  and never at a LIMIT; nothing done while its helper runs; SendMessage to an ended build helper checked as a start.

## Departures from ORCHESTRATION.md, each with its measurement

- Root hand-over point: measured orientation 17 calls, 2.33 M tokens, context 169 K at the first work call; section
  5's formula with F 169 K, R 2.33 M, g 1.3-2.3 K gives W* 247-273 K, not 129 K (which would hand over at once in
  every successor). After the compaction at 19:41, F 141 K gives 220-245 K.
- Build worktree outside `.claude/`: guard-hook.test.mjs fails T2, T3, T4, T11, T13 (`write-claude`) in any checkout
  under a `.claude` folder (S0.4, measured). Landings and suites run in `C:/Users/User/Documents/projects/hb`; units
  keep worktrees under `.claude/worktrees/` and run that file from `C:/Users/User/Documents/projects/hx-<unit>`.
- S0.5's refuter and builder overran (27.9 M of 29.2 M; refuter at its 15.6 M limit): a fix round (limit 10 M) and a
  refuter successor (limit 8 M) from the pooled reserve (r57-0038), decided here.
- Pooled reserve (section 3: 28.0 M for the build): drawn S0.5 fix round 5.56 M, S0.5 refuter successor 6.55 M; W1's
  third helper limit 10 M (19:52); CGATE's unplanned 11.5 M past its successor's limit. **The pool is spent** (about
  -5.6 M if W1's third helper uses its limit). Past the pool, the cap covers correlated overruns (section 3, "fully
  correlated ... the cap covers"); B1-1's builders measured 14.9-41.8 M a unit (mean about 24 M against 11.7 M).
- CGATE's successor overran (24.40 M against 12.9 M): its brief did not name the counter's words, it used words of the
  first helper's description, and the counter (newest transcript by write time among those whose description holds
  the words) printed the first helper's frozen count. Remedy, from 19:52: every brief names words found only in the
  helper's own description; since 20:01 the counter prints a WARNING when the transcript it reads was last written
  more than 2 minutes ago.
- Shared scratchpad: W7's refuter had its `mut.mjs` overwritten by another helper; the app's auto-mode classifier then
  refused a rerun of its rewritten driver, and it ran M15-M17 by editor and plain `node --test` through the lane. From
  20:00 briefs say: scripts under a folder named for the helper.
- B1-1 builders reach the 330 K checkpoint in 15-20 minutes (W1, CGATE, OUT): successors from their checkpoints with
  the rest of the unit's 29.2 M limit (ROOT-START, limits).

## Widths (the gate reads lines of the form `width <batch> <n>: <measurement>`)

Computed 2026-11-19 19:15 UTC from `research-tree/lane/log.jsonl`: builders' share of time in lane runs u_b 0.087
(0.040-0.097), refuters' u_r 0.27 (0.19-0.60), T_r 23.6 min (20.9-33.1); section 6's lane row with c = 4, x 1.1 at
4 slots, Z 22.9 min: at w = 7 the demand is 1.7 of 4 slots (2.7 at u_r 0.60). The collisions (7) bind.

width B1-1 7: u_b 0.087, u_r 0.27, T_r 23.6 min from the lane log of B0b; demand 1.7 of 4 slots at w 7; collisions 7 bind
