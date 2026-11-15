# Coordinator ruling 107, on the lane's notes 39 and 40

Ruled by the coordinator on 2026-11-15 at about 12:31Z (file hash and exact time are in `progress.jsonl`,
line `rulings_107`), after stage B ended and before the end-of-run procedure, any selection, any report
and any held-out score. Raised by the lane (`r58c/B/CONFLICTS.md`, notes 39 and 40) with its revision of
12:26Z (END-ORDER 9d779b5d); the coordinator read the test, its log and the guard. END-ORDER 9d779b5d is
not accepted: its list of step 2d names a test that cannot pass. It goes to the end of section M word for
word, before the code freeze.

107. Two decisions.
     (a) Note 40; ruling 106(a) is amended. One of the three tests that ruling 106(a) added,
     `fixes/tests/test_r53_58_unit.py`, fails on the final bytes in one of its four cases. That case
     writes run-log lines that name made-up files, with no PASS line, and expects the selection
     script's guard to accept them. Since ruling 83 the guard requires each line to name the role's own
     file and a later PASS line whose log shows the same hash, so it refuses that case, as it should.
     The test states the guard as it was before ruling 83; the selection script is not at fault. Step
     2d therefore does not run this test. Its three other cases, which test ruling 53's choice rule,
     passed on the current bytes of the selection script (sha256 d54cb864e38f...b885) in the test
     container ktest-b112, and that log (sha256 a3392c75a594...9d15) is the record; the guard itself is
     tested on the final bytes by the tests of 2d that were written for it. If the selection script
     changes before the freeze, the lane reports to the coordinator before 2d. The other two tests of
     ruling 106(a) stay in 2d.
     (b) Note 39. The step launcher keeps an older mount record under a name made from that record's
     own time to the second, and adds no counter when the name is taken. No change: the launcher waits
     for three memory samples thirty seconds apart before every start, so two records of one container
     cannot carry the same second.
