# The FX-W6 fix round: report (2026-11-20, 07:20 UTC)

**Answer.** The fix is in and checked. A bare acknowledgement from the coordinator no longer re-arms the age cap,
so an attempt stuck under a coordinator that only acknowledges now reaches the owner: the cap stays raised, the
watcher raises it again, marks it stuck, and the dead-man tells the owner. It landed on `build` at 96bc34cc. On the
fixed model the age-cap check holds; the last full suite (suite 6) and the end-to-end run pass; the blind review
passes. The build is done through the model check. Meter 80 % (stop line 81 %).

**What was done** (one Opus builder on `u/W6`, five commits).
- Code: the re-arm in `watch.mjs` (build's lines 1198-1204) is deleted; nothing else in the control path changed.
- Tests: the old age-cap test now pins the fixed behaviour, and a new test drives an acknowledged age cap to
  `stuck`. Both fail on the old code (watch.test.mjs:1733 and :1761) and pass on the fixed code.
- The coordinator's brief: a new place (7b) on what to do with an idle child and an age cap.
- Words: the watcher's spec and the contract no longer describe the re-arm.
- The model: it takes the verdict's corrected line 1015, its age-cap flag follows the fixed code, and the old
  re-arm stays as an ablation (AGE-REARM).

**Checks.**
- Landing: 5 test files, 0 fail (watch 82, status 47, handover 20, guard-hook 28, model 37 pass), 99.5 s.
- Model, 7 runs in 21 s: AGE-B and AGE-STUCK reach the owner and hold every property but one already decided (the
  F 5 cycle of VERDICT section 3 row 7), at 476,122 and 162,074 states; the old re-arm (AGE-REARM) still fails, F 16,
  so the check is not vacuous; FN-N2-B gives 619,856 states as the verdict expected. Each run equals S2.3's
  figures: the new AGE-B explores what AGE-STUCK explored, AGE-REARM what the old AGE-B explored.
- Suite 6 on 96bc34cc: 1,037 pass, 0 fail, 51 skipped; selftest shards 29 pass, 2 skipped; 164 s. The flaky stop
  test passed this time.
- End-to-end: 239 of 239 steps.
- Blind review (`refute/W6-fix.md`): PASS. Nine mutations, each caught by a test.

**Tokens and time.** Builder 13.64 M (plan 11.7 M, limit 29.2 M), 21 min. Review 13.25 M (plan 5.4 M, limit
15.6 M), 19 min. Root 3 about 14 M. About 41 M in all, against the 25-35 M estimate. 06:27 to 07:20 UTC. The meter
went from 79 % to 80 %.

**Not covered or not known.**
- The brief line tells the coordinator to "answer" an idle child, but the coordinator has no tool that messages a
  session, so the hook refuses it. Not breaking: an unanswered idle child still reaches `stuck` and the owner. On
  the end list, with: "stop it unless it is making progress" has nothing to judge by, since the coordinator cannot
  read the child's transcripts, and no fence reason is named for that stop.
- No "continue" act exists, so an honest long attempt reaches the owner too. The cap comes 240 counted ticks after
  the attempt was bound (about 4 h at one tick a minute), and the owner is told 285 ticks later (about 4.75 h).
  Both counts are marked guesses.
- The model's coordinator only acknowledges; one that stops a capped attempt is not modelled.
- The end list in `STATE.md` (test gaps with the code right, one flaky test) is not fixed yet.

**Next.** The pilot (slice 3) has its own plan and cap, and starts only on your word. Nothing was merged into
another branch or pushed.
