# Slice 2 of the build: report (2026-11-20, 05:30 UTC)

**Answer.** Slice 2 is done. The model was brought to the code as built (S2.2, landed on `build` at e5c9c4f8) and
checked once: 28 runs and 3 reruns, every one ran to its end. The verdict (S2.4) sends one fix back: **FX-W6**. As
built, a bare acknowledgement from the coordinator re-arms the age cap (`watch.mjs:1199-1204`), so a stuck attempt
never reaches the owner. The smallest change deletes that re-arm; the model of that change (AGE-STUCK) holds. Every
other failing property is a model artefact, a gap already decided, or a fact the pilot must measure; none changes a
decision. The close group holds in all 43 of its two-fault parts. Meter 79 % (stop line 81 %).

**What was checked.**
- The model (S2.2): a flag for every settled branch and every departure of the 13 fixes; where the R57 model read
  true state at once and the code now has a mechanism, the mechanism. New: starts only on a turn the owner typed,
  the lease act's `--if-unclaimed` and its window, CLOSE's id gap, an acknowledgement as a continue (W6 item 6),
  REDO's started line. With every new flag off it gives the R57 model's states and verdicts. OUT's three shared
  lines were reworded. Tests 35 of 35; guard-hook and status 75 pass, 0 fail.
- The runs (S2.3): 28 runs at the sizes where the fixes act, each through the lane under 1,450 s, then 3 reruns S2.4
  asked for (two with more memory, one on a corrected model line). 4,989 s of run time in 47 minutes, three at once
  at most; free memory 12.7-14.3 GB, no run waited for memory.

**Results by group.**
- Close group (FX-OUT, FX-PLAN, FX-CLOSE): every property holds in all 43 two-fault parts.
- Wake group (FX-W1, W2, W4, W5, W6 with N2): only failures already decided (the hand-over exit-2 path under a
  process-list fault, which N2 and the dead-man close; the first turn dying before its first call) and model
  artefacts. NoDeadlock and AlwaysCanResolve hold in every part of the corrected run.
- **Age cap (W6 item 6): fails, sent back to FX-W6.** The owner is never told of a stuck attempt whose coordinator
  only acknowledges.
- Starts only on a turn the owner typed: holds when a refused start writes nothing; when it leaves `start.json`, the
  third refused start on one row is charged without a fault (a gap already decided; whether it leaves the file is a
  pilot fact).
- Lease act: its millisecond window is found under reading (ii) of the lease only (a gap already decided); under
  reading (i) it cannot be reached.
- CLOSE's id gap: a close the coordinator writes without the owner's words frees a living session's slot (a breach
  of the coordinator's brief; the gap stays open by decision; the id map is a pilot fact).
- REDO: holds with FX-REDO, fails without it.

**Tokens.** Helpers 87.4 M against 34.8 M planned (2.5 times): S2.2 59.5 M (three helpers; limit 60 M), S2.3's reader
1.05 M, S2.4 26.9 M (17.25 M, then a successor 9.66 M that passed its 6 M limit). Root 2: 19.9 M over 88 calls. The
meter went from 78 % to 79 %.

**Time.** 3 h 20 min (02:05 to 05:25 UTC): S2.2 96 minutes, the runs 32 minutes, S2.4 23 minutes, its reruns 15,
its successor 17.

**Not covered or not known.**
- FX-CLAIM never runs together with FX-CLOSE and FX-OUT; FX-W3 and FX-W7 are not modelled; at most two faults
  (three in two groups), one lease field; the two lease runs ended at their memory bound.
- Pilot facts: whether a refused start leaves `start.json`; the lease's two delays; the app's session id against the
  CLI's; what `stop_session` and `archive_session` do; B1's deadlines, which are guesses.
- S2.2's model should take S2.4's corrected line (`model-build.mjs:1015`); not yet done.
- The end list in `STATE.md` (test gaps with the code right, one flaky test) is not fixed yet.

**Due.** The FX-W6 fix round (one fix only, as BUILD-PLAN's S2.4 row says): delete the re-arm, add its test and the
coordinator brief's idle-child and age-cap line, take line 1015 into S2.2's model, run the age-cap configurations
again, then the last full suite. About 25-35 M tokens, under one point at this slice's rate, so it fits under 81 %.
It needs a fresh root session: this one is past its hand-over point, and a new root starts only from your typed
message.
