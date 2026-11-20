# S2.2 result: the model as built (task r57-0507 slice 2), 2026-11-20

- **Branch** `u/S2.2` in `MAIN/.claude/worktrees/S2.2`, **final commit 531e5ef6** (clean). `build` (48811a8f) was
  already its base, so the merge before this result changed nothing.
- **New files**, all in `research-tree/model/as-built/`: `model-build.mjs`, `configs-build.mjs`, `check-build.mjs`,
  `run-seq-build.mjs`, `model-build.test.mjs`, `MAP-build.md` (each flag and mechanism with its model and code lines,
  where an oracle stays, and the disagreements with the round's files, FIX-JOIN 2b row 8 among them) and
  `RUN-BUILD.md`. Every R57 file of that folder is unchanged. The three shared lines of brief point 4 were reworded to
  what the code does: CONTRACT 3.6, `tcb/guard-hook.mjs:8` and `spec/status.mjs.md:62` (commit a00d6d10).
- **Run list for S2.3:** 28 runs in RUN-BUILD sections 1-8. Each gives its command, size, memory share, expected
  states and seconds (all well below 1,400 s), expected outcome and output path under `model/results-build/`.
- **Tests:**
  - `model/as-built/model-build.test.mjs`: 35 pass, 0 fail (lane S2.2-mtest3, 31 s, at 531e5ef6).
  - `tcb/test/guard-hook.test.mjs` and `tcb/test/status.test.mjs`, from a detached checkout outside `.claude/`: 80
    tests, 75 pass, 0 fail, 5 skipped (lane S2.2-tests2, 66 s; the checkout is removed).
  - The end-to-end file was not run: no script's code changed (the rewording is words only).
- **Findings** that S2.3 should reproduce (RUN-BUILD gives them as expected outcomes):
  - W6 item 6: AGE-B fails AgeCapReachesOwner (F 16) by construction. The age cap is raised, read, acknowledged,
    re-armed and raised again, and the owner is never told. AGE-STUCK, the design's second leg (not built), holds.
    This goes back to FX-W6.
  - REDO holds as built at k=3,x=1,g=2. Each act follows a reconcile that completed in its turn, and that reconcile's
    FX-REDO writes the line first. Without FX-REDO, StartedLineRecorded fails (F 6).
  - BQ5-SJ: RefusedStartNotCharged F 26.
  - LEASE-B: LeaseFenceClaimed F 6.
  - IDGAP-W: Slots F 19.
  - IDGAP-WZ: the owner act never comes (AlwaysCanResolve F 15).
  - CLOSE-APPROVAL-R5: Slots F 16, which comes from the R57 split.
- **Departures:** `research-tree/build/departures/S2.2.md`. FX-W3 and FX-W7 are not modelled. The owner is a premise.
  The lease under reading (ii) is bounded. The unrecorded facts are run both ways. W6 item 6 and REDO are modelled in
  their smallest forms. FXW-4R-B runs without N2.
- **What the reduced sizes leave uncovered:** the k=2 mixed parts of FN-OUT-CLOSE-K2-B (17 times the R57 size, may end
  BOUNDED), the lease at two fields, three faults with m, and g with the close group's cd, z and t at three faults.
- **Tokens:** builder 14.1 M, successor 1 25.6 M, successor 2
  `build-invariant: S2.2 model successor 2 | calls 105 | tokens 17.64 M | context now 266.6 K` (before this file).
  That is about 57.3 M of the unit's 60 M.
- **Not done:** nothing in the brief's list. The full-size runs are S2.3's.
