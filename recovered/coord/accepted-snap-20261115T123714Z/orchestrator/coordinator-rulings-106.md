# Coordinator ruling 106, after the check of the bytes the lane changed for its last revision

Ruled by the coordinator on 2026-11-15 at about 11:39Z (file hash and exact time are in `progress.jsonl`,
line `rulings_106`), after stage B ended and before the end-of-run procedure, any selection, any report
and any held-out score. Source: `orchestrator/delta-check-result.json` (four lenses over the bytes changed
between 09:24:35Z and the lane's revision of 11:14Z, END-ORDER ad45731a; a refuter for each, a critic;
advice "accept after changes"), the lane's notes 35 to 38, and what the coordinator found itself. END-ORDER
ad45731a is not accepted. It goes to the end of section M word for word, before the code freeze.

106. Six decisions.
     (a) Three more tests before the freeze (the lane's note 35(a)). Step 2d also runs
     `fixes/tests/test_r53_58_unit.py`, `fixes/tests/test_r64.py` and `fixes/tests/test_e5_equiv.py`
     once more on the final bytes. They test code that a later step runs: the selection script, edited
     on 2026-11-15, at step 4, and the scoring of the model code at step 7. The other test files that
     the lane's listing leaves out stay out for the reasons it gives.
     (b) What ruling 103(b) covers. Its sentence "no test mounts a held-out parent's folder" is about
     the test runs of the step launcher (`ktest-r4`, `ktest-r8` and `ktest-r9` run as tests). The
     ordinary test containers of both agents mount what they have mounted in every round: the export
     folder whole, the facts cache and, for agent B's, the repository, all read-only, and never
     anything under `build/sealed`. Ruling 89's per-use rule covers them: no test reads a held-out
     parent's graph or facts (ruling 96(b)), and the coordinator's audit (step 10) reads the test code
     for such a read. The gate of the step launcher's test runs refuses exact spellings only.
     Therefore, before recording the code freeze, the coordinator checks every saved record of a test
     run of the step launcher: none may show a held-out parent's folder, or a writable mount at, under
     or above a real output folder.
     (c) A log line can be lost. On this machine an append to a file from a shell loop failed 7 times
     in 233 on 2026-11-15 ("Device or resource busy"), and the lines were lost without an error. The
     lane's launchers append their log lines in the same way. Where the order names a line of such a
     log as evidence and the line is missing while the files it stands for exist, the lane reports to
     the coordinator and changes nothing: it does not interpret the log, does not run a finished real
     step again and does not write the line by hand. The coordinator decides on the files and records
     the decision. Step 1 is the exception: if its PASS line is missing from the run log, step 1 runs
     again.
     (d) No container of the order runs on without its saved mount record. A record that cannot be
     saved is tried again. If it still cannot be saved, a card check fails and nothing is launched,
     and a run that has started is stopped at once and resumed by the same command. Reason: the leak
     audit fails on a missing record, and after the held-out run that could not be repaired.
     (e) The cap at step 8. The coordinator checks that every start line of the held-out launch log
     shows the 4 GB cap, or the cap that a ruling recorded before the freeze names.
     (f) What CLAIMS.md maps. The order's sentence that CLAIMS.md maps every claim of RESULT.md is too
     wide. The lines with the held-out differences to RRF and their intervals, the literal check and
     the grader's totals are carried as text, without a pointer into the grader's return. The order
     says so, and the coordinator's audit compares those lines with the grader's return itself. No
     claim row is added now: a new locator that has only seen the rehearsal's shapes is itself a risk
     at step 9.4.
