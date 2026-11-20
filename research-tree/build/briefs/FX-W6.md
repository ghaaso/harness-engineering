# FX-W6: the fix round S2.4 sent back (build root 3, 2026-11-20)

Task r57-0507, slice 2, `research-tree/BUILD-PLAN.md` section 2 row S2.4: "a failing trace goes back to its fix (one
more round for that fix only)". MAIN = `C:/Users/User/Documents/projects/harness-engineering`. `build` = d655547f:
slice 2 is done (S2.2's model landed at e5c9c4f8; S2.3 ran 28 runs; S2.4's verdict sends back FX-W6 only).

**The finding, read first:** `MAIN/research-tree/model/results-build/VERDICT.md` section 1 (the trace, walked against
the code) and section 6 (the model's line 1015); `MAIN/research-tree/build/refute/W4.md` lines 100-125;
`MAIN/research-tree/build/departures/W6.md` items 1 and 8. The design: `research-tree/model/as-built/FIX-wake.md`
line 48 (row B5.2), FX-W6 steps 4-5 (lines 343-356) and FX-W5 steps 2-3. In short: an age-cap event line at or below
`acked_seq` re-arms the cap (`ts.age_base = num(ts.age_ticks)`, `tcb/watch.mjs:1198-1204` on `build`), so the
condition clears, FX-W5's re-raise and `stuck` count never start for it, and the dead-man never tells the owner of a
child that imitates activity under a coordinator that only acknowledges. AGE-STUCK, the model of the fix, holds.

## Builder (build-invariant, opus): `build-invariant: W6 age cap fix round`

Your worktree is `MAIN/.claude/worktrees/W6` on `u/W6`, already at the `build` tip (d655547f). Five parts:

1. **Code.** Delete the re-arm: the block at `tcb/watch.mjs:1198-1204` (the `ident` and `key` lookup and the
   `age_base` assignment), and change nothing else in the control path. An age cap at or past `attempt_max_ticks`
   then stays present, `reraiseStuck` (FX-W5) raises it again after each acknowledgement at its interval and counts
   it towards `stuck`, and FX-W4's dead-man reads `stuck` (status.mjs:956, 992). Keep the `age_base` field of
   `watcher.json` (watch.mjs:326, CONTRACT.md:484) at 0: no script sets it now; it is where an explicit "continue"
   act would re-arm the cap, and no script has one (refute/W4.md:113-115; not built in this round). Correct the
   comment at watch.mjs:1180-1182.
2. **Tests** (`tcb/test/watch.test.mjs`). The test "FX-W6 age cap: ... acknowledged, it re-arms for another cap"
   (line 1717) pins the old behaviour: change it to the fixed one (acknowledged, the cap stays and is raised again
   with `detail.reraise`; `age_base` stays 0). Add a test that drives an age cap whose coordinator only acknowledges
   to `watcher.json.stuck`, as "W5 stuck" (line 1551) does for a hang. **It must fail on the old code:** commit the
   test first, run it on that commit (old code) through the lane and keep the label and the failing assertion, then
   commit the deletion and run it again.
3. **The brief line** (`tcb/briefs/coordinator.md`, 180 lines; read it first and put the line where it treats
   act-dues). What the coordinator does with `idle-child` and `age-cap`, from FIX-wake.md FX-W6 steps 4-5 as now
   built: `idle-child`: the child's turn ended and it has waited `idle_ticks`; answer it or stop it (5c).
   `age-cap`: the attempt is past `attempt_max_ticks`, uncharged, no fence; stop it (5c) unless it is making progress;
   an acknowledgement does not let it go on silently: the act stays due, FX-W5 raises it again, and after
   `stuck_raises` raises at the capped interval the dead-man tells the owner; no act re-arms the cap. Words only,
   in your own phrasing, each sentence true of the code.
4. **Words that describe the old behaviour:** `spec/watch.mjs.md` lines 71, 116-118 and 335 (case W6c) and
   `CONTRACT.md:484` to what the code now does. Grep `research-tree/tcb`, `research-tree/spec` and `CONTRACT.md` for
   `age_base`, `re-arm` and `age-cap` and fix any other sentence the deletion makes false.
5. **The model** (`research-tree/model/as-built/`, S2.2's files ending in `-build`; the R57 round's files there stay
   byte for byte):
   - `model-build.mjs` line 1015: take the S2.4 variant's line
     (`MAIN/research-tree/build/units/S2.4/variant/model-build.mjs:1015`, the only line that differs), with its label
     citing handover.mjs:274, 287 and 353 and coordinator.md:163-166 instead of "S2.4 variant" (VERDICT section 6).
   - **The age-cap flag follows the fixed code.** Every configuration that models the age cap as built
     (`BLD_AGE_CAP`, configs-build.mjs:62-64) explores the fixed behaviour, the leg `BLD_AGE_STUCK` models today: no
     re-arm, FX-W5 raises it again, `stuck`, the dead-man. The old re-arm stays only as a named ablation, off by
     default, with a configuration that fails AgeCapReachesOwner without the fix (otherwise the check is vacuous).
     Keep the ids AGE-B and AGE-STUCK runnable (the record names them); if two configurations now explore the same
     states, say so.
   - `model-build.test.mjs` passes and pins, at the smallest size: AGE-B holds AgeCapReachesOwner and the ablation
     fails it; every changed flag changes the explored states; FN-N2-B at k=1,u=1 gives 619,856 states with
     EventuallyResolves F 9 (VERDICT section 6) if that fits the file's time, else a smaller size.
   - `RUN-BUILD.md`: a section for this round with the rows the root runs next as background lane commands: AGE-B
     (whole, and k=2,m=1,o=1), AGE-STUCK (same sizes), the ablation (same), FN-N2-B (k=1,u=1). For each: the command
     from the worktree's `research-tree/` folder through MAIN's lane `--timeout-s 1450`, the size, the expected
     states and seconds (your small runs or S2.3's figures), the memory flag, the expected outcome, and an output path
     under `research-tree/model/results-build/fx-w6/` (new files; S2.3's outputs stay). Say whether FN-N2-B's
     configuration reads a flag you changed besides line 1015: if not, R3 (`results-build/rerun/`, run on the
     variant) stands as its k=2 result; if it does, add R3's parts to the rows.
   - `MAP-build.md`: the `BLD_AGE_CAP` row and its line references cite the fixed code on `u/W6`.
   Never run a configuration at full size yourself (each of your calls stays under 150 s).

**Tests, your files only**, through MAIN's lane as `briefs/B0b.md`'s common part says, from your worktree's
`research-tree/` folder: `tcb/test/watch.test.mjs` (last run 94 s: `--timeout-s 140 --wait-s 5`), every other test
file that reads a file you change (grep `tcb/test/` and `model/as-built/` for the file names), and
`model/as-built/model-build.test.mjs` (40 s: `--timeout-s 70 --wait-s 75`). A file that reads a spec's
"## Command line" (guard-hook T16) runs from a checkout outside `.claude/` (B0b). Not the e2e and not the full suite:
the root runs suite 6 with the e2e after the landing.

**The rest.** `briefs/B0b.md`, part "Builders (build-invariant, opus): common", holds word for word, with
`briefs/B1-2.md`'s additions (read narrowly; merge `build` before the result; counter words; scratch folders), except:
- your files in MAIN are `research-tree/build/units/W6/fix-result.md`, `units/W6/fix-checkpoint.md` and
  `research-tree/build/departures/W6-fix.md`, all new: `units/W6/result.md` and `departures/W6.md` are the first
  round's record and stay byte for byte;
- touch nothing under `.claude/hooks/` or `research-tree/tools/`;
- tokens: expected 11.7 M, limit 29.2 M (`plan.json`, row W6); counter words `W6 age cap fix round`;
- scratch folder `C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/873082b7-e3fa-405e-b735-bb96ac23d210/scratchpad/W6-fix-build/`;
- at about 330 K context or the limit: commit, `units/W6/fix-checkpoint.md`, return `LIMIT <path>`; a successor is
  `build-invariant: W6 age cap fix successor <n>`.

**Result, written last, never at a LIMIT:** `MAIN/research-tree/build/units/W6/fix-result.md`: branch, final commit,
the files changed, each test file run with pass / fail / not-run counts and its lane label, the failing run on the
old code (label, assertion), the model's small-run states, the RUN-BUILD rows added, the departures file, tokens
(the counter's line), what is not done. Return in at most 8 lines.

## Landing (the root)

`node C:/Users/User/Documents/projects/hb/research-tree/tools/land.mjs W6 <the test files the result names>`, a
background command of the root.

## Refuter (refute, opus): `refute: W4 FX-W6 fix blind review`

The plan reviews W6 only in the combined review (`plan.json`: the refute row W4 covers W6, REDO, CLOSE and W4, and
needs W6 landed), so this review starts after the landing. It covers this round's commits only: `git -C MAIN diff
d655547f u/W6`. `briefs/B0b.md`, part "Refuters", holds, except:
- read this brief's builder part, the finding's places above, the diff, `units/W6/fix-result.md`,
  `departures/W6-fix.md` and the tests;
- mutate at least: the re-arm restored; the age cap left out of FX-W5's re-raise; its `stuck` count; the model's
  as-built flag re-arming again; line 1015 put back. A mutation no test catches is a finding;
- read the brief line against FIX-wake.md FX-W6 steps 4-5 and the fixed code: a sentence the code does not do is a
  finding;
- scratch worktree `MAIN/.claude/worktrees/rW6` (detached at `u/W6`), removed at the end; scratch folder
  `C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/873082b7-e3fa-405e-b735-bb96ac23d210/scratchpad/W6-fix-refute/`;
- tokens: expected 5.4 M, limit 15.6 M; counter words `W4 FX-W6 fix blind review`; at about 330 K context or the
  limit only `units/W6/fix-refute-checkpoint.md` and `LIMIT <path>`;
- the verdict, written last: `MAIN/research-tree/build/refute/W6-fix.md` (`refute/W4.md` is the combined review's
  record and stays), first line `PASS` or `BREAKING: <finding>`.

## Then (the root)

The model rows of RUN-BUILD's new section as background lane commands (RUN-BUILD.md's form), each output under
`MAIN/research-tree/model/results-build/fx-w6/`; then suite 6 (`research-tree/build/tools/suite.sh` through the lane,
`--timeout-s 600`, in `C:/Users/User/Documents/projects/hb`) and the e2e there (its two output files copied to
`suites/6/` and restored in `hb`); the records committed on `build` through `hb`; the report (page and markdown).
