# Departures: the FX-W6 fix round (task r57-0507, slice 2, S2.4), branch `u/W6` at cfdd10c4

Brief: `build/briefs/FX-W6.md` part "Builder". Finding: `model/results-build/VERDICT.md` sections 1 and 6,
`build/refute/W4.md:100-125`, `build/departures/W6.md` items 1 and 8. Design: `model/as-built/FIX-wake.md` line 48
(row B5.2), FX-W6 steps 4-5, FX-W5 steps 2-3. `departures/W6.md` and `units/W6/result.md` are the first round's
record and are not changed. This file supersedes W6.md item 1 (the re-arm is deleted) and item 8 (the brief line exists).

1. **"Stop it" in the brief line is the fence, then the close (5a, then 5c), not 5c alone.** `stop.mjs request`
   takes only a fenced or committed attempt (spec/stop.mjs.md, request step 1; its T4: a row at `bound` that is not
   committed exits 65 and writes nothing), so the brief's "(5c)" alone would send the coordinator to a refused call.
   The line names no fence reason: FIX-wake FX-W6 steps 4-5 say only that the coordinator "stops it", and the reasons
   `replace fence` takes (first, stall, hang, loop, crash, tainted, memory, handover, cut, drop) are not chosen here.
   Test: none for the words; status.test.mjs and handover.test.mjs, which read the brief, pass.
2. **The brief line is a new place 7b, after 7a** (FX-PLAN's act-due `close-session`, the place that treats
   act-dues). It moves places 8 and 9 down 14 lines: 158-166 on `build` are 172-180 on `u/W6`. The references the
   round owns follow: model-build.mjs:1015's label cites coordinator.md:177-180, place 9 (the FX-W6 brief said 163-166,
   the lines before 7b), and MAP-build.md's two references are now 172-180 and 172-175. Records that cite build's
   lines (VERDICT, the S2.4 and refute files) are left as they are.
3. **The call drops the two arguments only the re-arm read.** `actDueIdleAgeCap(env, state, conds, { rows, tick })`,
   the form spec/watch.mjs.md:349 already gave; the function takes `{ rows }`. Nothing else in the control path
   changes. Test: watch.test.mjs (82 pass).
4. **The model.** `BLD_AGE_STUCK` is gone: its leg is `BLD_AGE_CAP`'s now. The deleted re-arm is the ablation
   `AB_AGE_REARM` (off by default), in the new configuration AGE-REARM. AGE-STUCK keeps its id with AGE-B's flags, so
   the two explore the same states (65,582 at k=1,m=1). AGE-REARM explores exactly S2.3's AGE-B (23,819 at k=1,m=1),
   and AGE-B exactly S2.3's AGE-STUCK. The comments were condensed so that no line of model-build.mjs moved: every MB
   line reference in MAP-build.md and in the records still holds. Test: model-build.test.mjs (37 pass).
5. **Line 1015 differs from the variant's in its label only.** The label reads "raise: exit 6 no-drain or
   not-quiescent (handover.mjs:274, 287, 353); goes to endturn (N2, coordinator.md:177-180)", and the variant's
   trailing comment "S2.4 VARIANT (scratch only)" is not taken. States and verdicts are the variant's: FN-N2-B k=1,u=1
   gives 619,856 states and EventuallyResolves F 9. A trace that passes this line carries the new label text.
6. **The new stuck test stops at `watcher.json.stuck`.** It does not drive the dead-man's alert: FX-W4 reads `stuck`
   whatever its ident (status.mjs:956, 992). An age cap followed all the way to a toast is not tested.
7. **Not built.** There is still no explicit "continue" act to re-arm the cap (refute/W4.md:113-115). `age_base` stays
   0 and is where such an act would act. The model has no coordinator that stops an age-capped attempt (place 7b); its
   coordinator only acknowledges, which is the case the finding is about.

**The run on the old code.** The tests were committed first (27e3a5e1, watch.mjs unchanged), with lane label
`W6-fix-oldcode`: `node --test --test-name-pattern "FX-W6 age cap" tcb/test/watch.test.mjs` gave 2 tests, 0 pass,
2 fail.
- "FX-W6 age cap" fails at watch.test.mjs:1733 `the acknowledgement does not re-arm the cap`, 3 !== 0. The old
  code set age_base to 3 on the tick after the acknowledgement.
- "FX-W6 age cap stuck" fails at watch.test.mjs:1761, `assertLine` expected exit 17, got 0, at tick 18. The first
  re-raise never came, because the cap had been re-armed.

After the deletion (1c5a6633), lane `W6-fix-watch`: all 86 run, 82 pass, 0 fail, 4 skipped.
