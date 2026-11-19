# STATE: the build root (task r57-0507), written at every wake

Root session 8a7db643-dc9c-42d9-8dea-e9f99c2d3b69 (Opus, kind orchestrate), main checkout (MAIN =
`C:/Users/User/Documents/projects/harness-engineering`), started 2026-11-19 about 16:00 UTC by the top session. A
successor (or this root after a compaction) reads `research-tree/build/ROOT-START.md`, then this file, and starts
nothing listed as running before reading that unit's branch and result file. Times are UTC, from `date -u` and the
helpers' transcripts (the B1-1 clock times written before 19:44 were guesses; corrected here from the transcripts).

## NEXT (2026-11-19 21:17 UTC): B1-1 done; start B1-2

- **B1-1 is landed:** all 8 units on `build` = 4d11fa1d (W1 landed 21:13:20, pre f20fca3d; lib, watch, status,
  handover, guard-hook pass). **Suite 2 PASS** on 4d11fa1d: others 992 pass, 0 fail, 51 skipped (1043) + selftest
  shards 29 pass, 0 fail; wall 131 s (`suites/2/summary.txt`). **The e2e FAILS** (`suites/2/e2e.log`, exit 2): from
  "d-stpa: commit record stpa" exit 2 `no-ready` on, a cascade: OUT's READY fence; `run-e2e.mjs` writes no READY
  marker as a child would. Nobody adapted the e2e for OUT. Route: an OUT helper (build-invariant, opus; from the cap's
  headroom, expected 2.5 M, limit 4 M) makes the e2e write what FX-OUT's children write, iterates to 232/232 or names
  what is left by unit, lands with `e2e/run-e2e.mjs` as its file. It touches only the e2e, so it may run beside B1-2.
- **Then:** get_usage and a usage.jsonl line (cap rule of ROOT-START); write `briefs/B1-2.md` (W2, PLAN; width 2;
  worktrees from `build` 4d11fa1d) carrying cross-unit items 4 (FX-PLAN: `startLeaseExpired`, the flag on the lease
  act, bind after it; W5's `rowActPlanned`), 9 (a new `--flag` in a spec goes into `EXEC_FORMS`, T16), 12 (W2 removes
  the bare `--alarm`), the counter words rule, scripts under a folder named for the helper, merge `build` before
  landing, and the e2e from outside `.claude/`; start W2 and PLAN; re-arm the timer; commit the build's records onto
  `build` through `hb` at a quiet point.

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
