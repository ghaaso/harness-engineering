# R2-tree-build: the research tree's build (digest, top session 9, 2026-11-24)

Paths are under `research-tree/` unless full. "ORCH" = `ORCHESTRATION.md`, "STATE" = `build/STATE.md`, "PILOT" = `build/PILOT-PLAN.md`
(version 2), "CPLX" = `build/COMPLEXITY.md` (version 2), "NEXT" = `build/NEXT-STEP.md`. Marks as the sources carry them.

## 1. What was built, run or measured

**Branch state [observed, git, run 2026-11-24].** `build` = fa8d28c1 ("The research run's preparation: interface, briefs, blind
review, folds, run root"); it is checked out in the worktree `C:/Users/User/Documents/projects/hb`. 211 commits are on `build` and not
on `main`; merge base 48660877 (the commit the app's worktrees branch from, ORCH s1); `git diff --stat main...build`: 8625 files
changed, 1,401,108 insertions, 50 deletions (most are the records under `research-tree/build/` and evidence). **Not merged**; nothing
pushed (STATE, first lines). Last eight commits on `build`: fa8d28c1, a8ee8203 (locks check), dcbb8be4 (router, running without the
typed go, faults audit, tree), 10174e8c (complexity analysis), fed8113c (pilot plan v2), 17be051d, a1a46e4e, 96bc34cc (merge u/W6).

**Built (all through the model check; slices 0-2) [measured; STATE "NOW" and slice sections]:**
- Slice 0: P0 (record guard, pre-commit, lane fixes) and the plan gate (`.claude/hooks/plan-gate.mjs`, 27 then 37 tests) [ORCH s13 rows 8-10];
  0b (S0.4), land.mjs (S0.6), skeleton (S0.5); facts files; `branches.md` (17 branches). Landed S0.4 f852145c, S0.6 575db127, S0.5 ec3b04fd.
  Suite 1: 940 + 29 pass, 0 fail, 53 skipped, 114 s (STATE "Done: slice 0").
- Slice 1: 13 fixes (W1 OUT CLAIM CGATE W5 W7 W6 REDO in B1-1; W2 PLAN in B1-2; W3 CLOSE in B1-3; W4 and S2.1 in B1-4), 17 build units landed in
  all (STATE slice 1 section: "landed 17 build units (slice 0: 3; slice 1: 13 fixes and S2.1)"). Suites 2-5 passed (suite 2 others 992 pass;
  suite 3 1003; suite 4 1028; suite 5 1034 pass with 2 fail in one flaky stop.test subtest, which passes alone, 45 pass 3 skipped).
  The end-to-end file (`e2e/run-e2e.mjs`) passes 232/232, then 239/239 after W3/CLOSE added steps (STATE).
- Slice 2: S2.2 (model brought to the code as built, 3 helpers, 57.3 M of 60 M), S2.3 (28 model runs, 25 complete, 3 bounded), S2.4 verdict
  `model/results-build/VERDICT.md`, first line `SEND BACK: FX-W6: AgeCapReachesOwner (AGE-B)`. R1 NoFalseSuspicion holds; R2 all 43 k=2 close
  parts hold; R3 75 parts, 97.6 M states, only decided failures; NoDeadlock and AlwaysCanResolve hold in every part (STATE slice 2 section).
- FX-W6 fix round: deleted the re-arm of the age cap on a bare acknowledgement; landed 96bc34cc; model AGE-B/AGE-STUCK hold, ablation
  AGE-REARM fails (so not vacuous); suite 6: others 1088 tests, 1037 pass, 0 fail, 51 skipped, shards 29 pass, 164 s; e2e 239/239; blind
  review PASS (nine mutations, all caught) (STATE "NOW"). **The build is done through the model check** (STATE).
- Test counts as landed: lib 204, watch 82 (after W6), status 47, guard-hook 28, replace 98, stop 45, handover 20, redo 7, model-build 37 (STATE, landings).
  Reports: `build/reports/slice-0/1/2.md`, `fx-w6.md`.

**What was measured about the build's tokens [measured, STATE and ORCH]:**
- Slice 0: about 105 M against 78.6 M planned (x1.35) (STATE "Done: slice 0").
- Slices 0 and 1 together: helper tokens about 613 M (slice 0 105 M, slice 1 508 M) (STATE, 02:10 line).
- Slice 2: helpers 87.4 M against 34.8 M planned (x2.5); root 2 19.92 M over 88 calls (STATE).
- FX-W6 round: builder 13.64 M (plan 11.7, limit 29.2), refuter 13.25 M (plan 5.4, limit 15.6), root 3 about 14 M, about 41 M against the
  25-35 M estimate (STATE "NOW").
- Whole build: **907.7 M against a plan of 397 M and a cap of 576 M** (2.3 times plan, 1.58 times cap), as PILOT s2 quotes it from r57-0170
  [quoted from PILOT; the r57-0170 record itself not opened here]. Note ORCH's own plan figure was 416 M (cap 576 M); PILOT says 397; I could not tell which.
- Points: meter 64 % at the go to 80 % at FX-W6's end; about 41-43 M tokens a point during slice 1 (STATE); ORCH 40 M a point; 62 M (59-66 M)
  in PILOT s2 for a mix of 96 % Opus (r57-0170 per PILOT). Say which basis when quoting.
- Per unit: builders were 14.9-46.7 M a unit in B1-1 (mean about 24 M against the planned 11.7 M); refuters 9.5-15.2 M; most builders hit the
  330 K checkpoint in 15-20 min and needed 1-2 successors (STATE, B1-1 and departures sections).
- Wall time: 65 helper runs 16:22 to 01:29 (about 9 h) in slices 0-1; 1.81 helpers running on average, 8 at most; the chain W1, W2, W3, W4
  set slice 1's time, each link 80-117 min (STATE, slice 1 "Wall time").

**Enforcement built along the way [measured, ORCH s13]:** record guard version 2 (selftest 202/202, commit check 19/19, gate 37/37, the
old guard fails 50 of the new cases); lane capacity set to 4 slots (4 test files at once each 1.06-1.15 times alone); the full suite with
selftest in 4 shards runs in 120 s against 264 s; a wake timer as a background command; a plan gate that refuses a wrong kind, model,
undone dependency, duplicate helper or width overrun.

## 2. Results that decide a choice

- **A helper orchestrator (an inner level) was ruled out here, not in general.** With fork mode off a helper's own helpers run in the
  background but the parent hears from them only by polling: 21 calls and 1.30 M tokens in 6.4 min in the probe; for B1-1 the polls
  were computed at 1.5-3.5 M against the 0.42 M saved. So the root ran every batch itself, on Opus (ORCH s13 rows 1-2) [measured probe,
  computed total]. For research fields, polls of 3.4-7.2 M a field mean it again does not pay in tokens; it pays in typed turns and
  hand-overs (CPLX s2 "Vertical") [computed from an estimate]. Do not rule the form out for other shapes: "no helper orchestrator has yet run a
  real batch here" (CPLX s5, s6).
- **Width.** 7 builders at once were run in B1-1 (collisions bind, not memory or the lane); the computed lane demand was 1.7 of 4 slots (STATE
  "Widths"; ORCH s6, s13 row 4). Later batches ran at 2.
- **The 330 K checkpoint rule worked as designed:** long builders returned LIMIT at 325-336 K and a successor continued; but the successor
  spend broke the plan: builders cost far more than planned (section 1) [measured]. ORCH's 11.7 M builder came from units that wrote their own
  tests; the build's units averaged about 24-30 M.
- **The model checker found a real design fault the unit tests and reviews had not:** the age cap re-armed on a bare acknowledgement so the
  dead-man never reached the owner (STATE slice 2; VERDICT). Fixed in FX-W6, with the ablation showing the check is not vacuous. This is the
  clearest value of the model-check step so far [measured; the model is of the design, not a run of the tree].
- **Blind review found breaks the builders' own tests missed:** W5, W3, S2.1 came back BREAKING; CLAIM and OUT landings failed on cross-unit
  redo.test interactions; the combined review of W6, REDO, CLOSE, W4: 56 mutations, 49 caught, 7 survived (test gaps, code right) (STATE).
  This says the build's checks catch faults; it does not say the tree is right when run.
- **Not ruled out (one null is not a verdict):** no method null is in these files; the tree has not been run for real (see 3). CPLX's path e2 drops
  Q6-Q11 and comparison 1 for the research run; "the loss is not measured" (NEXT; CPLX s5 "What it loses"). A single-session run of one field
  "can only rule that form out, never in" (CPLX s5).

## 3. Open faults, questions and missing measurements

**Not run yet:** no pilot, no real run of the tree (STATE: "The pilot (slice 3) has its own plan and cap and starts only on the owner's word
(r57-0007)"). The pilot's cost is plan only (section 4).

**Open faults / end list (STATE "End list", nothing breaks a unit):**
- r57-0521 (1) test gaps with code right: survivors per unit in `build/refute/*.md` (W2 21, PLAN 30, W3 9, plus S0.x, CLAIM, OUT, W5, W7 gaps);
  (3) words; (4) CLAIM's millisecond window (decided gap, reachable only under reading (ii) of the lease). Plan: after the pilot, one round (PILOT s4).
- r57-0522 (1) the brief line "answer the child" is an act the guard hook refuses (the coordinator profile lists no tool that messages a session);
  an idle child still reaches `stuck` and the dead-man. (2) the coordinator cannot read the child's transcripts, so "unless it is making
  progress" has nothing to go on. (3) no "continue" act that re-arms the age cap, not built. To be measured in the pilot.
- Flaky test: stop.test "FX-CLOSE T1" subtest (c) reads the real process list; fails under load, passes alone (suite 5; ORCH s13 row 6 policy). Fix
  named: own ids per test file or a fake process list. It passed in suite 6.
- Dead-man toasts: long coordinator turns (89 over 60 min, `facts/Wturn-2.md`) will raise false toasts; the dead-man task
  (`tcb/settings/deadman-task.xml`) was never imported (PILOT s4).
- Not recorded (facts): whether a refused start leaves `start.json`; the lease's two delays; B1's deadlines; the app's session id against the CLI id
  (until mapped every close ends with the owner's relayed `closed`, a safe gap); PostToolUseFailure's error shape; toast and console flash
  (STATE W4 and slice-2 notes).
- Model coverage: FX-W3 and FX-W7 not modelled; the owner is a premise; lease reading (ii) bounded; smallest forms only (`departures/S2.2.md`
  per STATE). FXW-4R-B ran 75 parts, 98.7 M states against 5 M estimated; FXW-6-B was BOUNDED, then rerun whole (STATE S2.3/S2.4).
- Seen, not changed (ORCH s13 row 9): 1,063 of 4,042 tracked files under `docs/program/evidence/` are in no manifest, so no hook protects them.
- Left for after the build, not breaking (r57-0518): P0-GATE verdict items 5, 6, 7, 9, 10, mutant LA, a second run of a done unit (ORCH s13 row 10).

**What the merge needs.** Only one line in what I read: `library/INDEX.md:154` (found by grep) says "r57-0520 merge `build` (his approve:; first
remove the identical untracked copies: 620 at the close-out, 627 with the pilot's plan)". PILOT s1: the merge "is not needed before the pilot:
the commit stays reachable on `build`, and fsck checks the pinned copy against the named commit. It stays open." The diff is 8625 files, so
reviewing the merge is itself sizeable [hypothesis]. I did not read `library/` beyond that line.

**Missing measurements the plans name:** the meter's per-model weights (whether Fable moves the all-models meter, r57-0514); whether helpers of
helpers count in the app's 20; a helper orchestrator on a real field; Haiku's meter weight; whether a run continues after an app restart; a
session's and a busy helper's memory; how many helpers at once the account sustains (15 measured, 20 not); the coordinator's real cost per unit
(n = 3 roots; fit and median differ by 45 M); the successor re-read cost (86-169 K); whether a start is allowed on the turn the app gives after a
session's own session ends (r57-0109) (CPLX s6; ORCH s11).

## 4. Costs

- Build to the model check: **907.7 M tokens** actual against plan 416 M (10.4 points expected) and cap 576 M (14-15 points) in ORCH, 397 M in PILOT
  [measured via PILOT s2/r57-0170]. Meter 64 % at the go to 80 % after FX-W6 (STATE). Tokens = input + cache creation + cache read + output, once
  per message id.
- Meter conversion: 40 M a point (ORCH; E 4e), 41-43 M during B1 (STATE), 62 M (59-66 M) later (PILOT s2): two bases.
- Wall: build 2026-11-19 about 16:00 to 2026-11-20 07:20 UTC, roughly 15 h (PILOT: "15.1 h against 9-13 h planned"). FX-W6 round 53 min.
- Memory/PC: one suite 28.8 % processor mean, 75 % peak; two at once 97.6 % peak; free memory at least 13.1 GB (ORCH s1, s13). Installs: none recorded.
- Root sessions: three roots plus the top session; hand-over measured at 247-273 K, not the planned 129 K (STATE "Departures"); root 2 19.9 M, root 3 about 14 M.
- **Pilot (slice 3), planned only [PILOT s0, s2]:** expected 418 M (preparation 179, pilot 239; Fable 94 M of it), cap 593 M (every node at Q3);
  preparation 3-4 h, pilot 8.5-13.8 h plus drains, 37-58 typed turns by the owner; admit.mjs B_tokens 172 M, r_tokens 15.3 M; all-models +7 to +9 points,
  Fable +26 to +33 points; downloads about 60 MB a field. PILOT's own caveat: at the build's overrun ratio (2.3) it "would need 961 M", not applied because
  part of the overrun is already in its figures; the cap stops starts first. Basis: one build's three roots, research sessions of 2026-11-18/19, one
  week's meter (PILOT s2 "What it rests on").
- **Research run (path e2), planned [CPLX s3, NEXT]:** 985 M expected (801-1,219 M), 15.9 points (12.9-19.7), Fable 1.1; NEXT: 955 M (800-1,206),
  cap 1.2 B asked; 5.0-8.4 h machine time; downloads about 420 MB; 1.6 times the direction's 10 % (620 M). Path (a), the tree as planned for seven
  fields: 1.01-1.18 B, about two weeks, 75-140 typed turns. One field's research share is 72.9 M; the tree adds about 345 M around it. Both rest on the
  build's rates; the build overran its estimate 2.3 times, so treat as a floor [hypothesis].

## 5. Steps the record already proposes next (this track)

1. **Pilot** of the tree (slice 3), from the weekly reset (PILOT: 2026-11-23 12:00 UTC, already past on today's date; I did not read the current meter or later
   decisions). Needs `approve:` for the preparation (P3.1 stop test, P3.2 count, run root outside every repository, pilot inputs, one fix round of three
   units FX-PILOT on `build`: children's models and the tier hook, the scorer's agent file, the S1/S2 single-session role with `W_quality` 300 to 280 K and
   `attempt_max_ticks` 240 to 630) and `cap:` 593 M. Later: `approve:` field, questions, approach ids, protocol, analysis plan; the owner applies the
   user-level deny rules and imports the dead-man task; the go itself, an experiment on this PC with the network on, outside a container (an exception
   to CLAUDE.md rule 3), about 37-58 typed turns (PILOT s6). Fix round: 142.7 M (99.5-171.8).
2. **Research run, path e2** (NEXT, top session 4): one Fable coordinator, one Opus helper per field (seven), Sonnet readers, Haiku extraction; the go
   names about 420 MB of paper downloads and the rule-3 exception; `cap:` 1.2 B; start at the reset. CPLX offers other paths; whether the owner
   answered is not in the files I read.
3. **After the pilot, one round** for the End list (r57-0521) and the coordinator gaps (r57-0522).
4. **Merge `build`** into main (r57-0520): the owner's `approve:`, after removing the identical untracked copies (620 to 627).

## 6. Not read

- `build/ROUTER.md`, `UNATTENDED.md`, `FAULTS.md`, `LOCKS.md`, `TOP9-STATE.md`, `branches.md`, `reports/*`, `refute/*`, `departures/*`,
  `model/results-build/VERDICT.md`: named by the files above and not in my list; claims about them are second-hand from STATE, PILOT, NEXT.
- `library/INDEX.md` (only line 154, by grep), `research-tree/START-HERE.md`, `docs/program/RESEARCH-*`, and the `r57-0xxx` records (r57-0170, r57-0173,
  r57-0520 and others) themselves.
- I ran no test, suite or model and did not open `hb`.
- STATE says lines written after 07:25 UTC on 2026-11-20 live in MAIN only and I read MAIN's file; the top-session decisions after the research run's
  preparation (commit fa8d28c1) are not in these five files.
