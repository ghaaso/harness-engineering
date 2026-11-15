# Coordinator ruling 104, after the pre-check of the lane's code as it stood at 09:24Z

Ruled by the coordinator on 2026-11-15 at about 09:54Z (file hash and exact time are in `progress.jsonl`,
line `rulings_104`), after stage B ended and before the end-of-run procedure, any selection, any report
and any held-out score. Source: `orchestrator/precheck-result.json` (five lenses over a copy of the lane's
code, order and tests taken at 09:24:35Z, a refuter for each, a critic; advice "accept after changes";
seven changes that must be made and twelve smaller ones), each of the seven checked by the coordinator
against the bytes. It goes to the end of section M word for word, before the code freeze.

104. Seven decisions.
     (a) The tuning staging comes earlier. Items 4 and 5 of END-ORDER 2f (the tuning staging and its
     check) run after the card window and before the test run of `ktest-r4` in 2d. That test run mounts
     the staging read-only through the step's own two rows; it is the only use of the tuning staging
     before step 5. Reason: otherwise the staged facts and code are first read in a container after the
     freeze, where a gap in the staging has no legal repair. The staging holds tuning data only. If
     `train/heldout_inputs.js` or a file of the shared harness changes after it was built, the staging
     is moved aside and built again.
     (b) Correction to ruling 103(b). The test line of `ktest-r9` has at least the real line's row count
     and length, not exactly them: it carries one row more, and a `graphs0` row is one character longer.
     (c) Memory stops of the held-out run (step 7), under ruling 101(c). Three forms are a stop that is
     not a code defect: the run's rc file reads 137 (the trainer was killed by the kernel); it reads 2
     with the line "N unit(s) failed" and the error of every failed unit in the run's log is an
     out-of-memory error of the card; it reads 1 and the run's log ends with the packer's failure and
     no error text (the packer was killed). The lane reports each with the log lines, then runs the
     same command again; finished units are kept, and a launch that finishes no unit is reported before
     another try. Any other rc that is not 0, and any failed unit with another error, stops the line
     and waits for the coordinator (ruling 85).
     (d) Ruling 101(d), amended. If the end-of-run procedure finds a quarantined unit, the lane reports
     to the coordinator before it restarts the guard. The coordinator takes the mount record of the new
     stage-B container while it runs and rules how it joins the audit's inputs.
     (e) The medians of ruling 97(d). Each median is taken over the tasks that have a pool count; the
     number of tasks without one (an unscored seed, or no candidate) is recorded per split beside it.
     (f) The lane's `progress.jsonl` between the two writers. From the start of step 9.3 to the end of
     step 9.4 nobody appends a line to it, the coordinator included: the result writer records the
     file's hash and the audit writer checks it. If a line is appended in between, step 9.3 runs again
     before step 9.4.
     (g) The coordinator's own audit (step 10) checks the mount records of the leak audit's container
     and of the three containers that run after it (item 22, the route audit, the result writer)
     against their lists, as it does for the audit writer's. The leak audit does not judge its own
     record, and ruling 95 only lists the other three.
