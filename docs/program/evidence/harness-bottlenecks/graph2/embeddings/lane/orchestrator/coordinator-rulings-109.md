# Coordinator ruling 109, on a test that fails because the machine refused its own scratch file

Ruled by the coordinator on 2026-11-15 at about 14:37Z (file hash and exact time are in `progress.jsonl`,
line `rulings_109`), during step 2d of the accepted end order (END-ORDER 1c849061), before the code freeze,
any selection, any report and any held-out score. Raised by the lane: the host test
`r58c/B/tests/test_pass_paths.sh` printed RESULT FAIL in one of six checks; the coordinator read the test
and its terminal copy (sha256 18599acb...7dee). It goes to the end of section M word for word, before the
code freeze.

109. A test that fails on the machine's refusal of its own scratch file.
     (a) What happened. The test writes the output of the script under test into its own scratch file
     and then reads it. The machine refused that write ("Device or resource busy", at line 32 of the
     test), so the check read a file the script had not written, and failed. The script under test did
     not fail. The same refusal cost step 1's summary three lines and left a scratch file behind in one
     more test of 2d, which passed.
     (b) The rule, for the tests of step 2d. Where a test fails or ends with an error, and its terminal
     output shows "Device or resource busy" on the test's own scratch file or log at the failing point,
     the lane keeps the failed run's terminal copy and log, removes that test's own scratch folder, and
     runs the same test again, unchanged, up to two more times. A run that then passes counts, and the
     run log names every run with its hash. A test that fails without that message, or fails three
     times, stops 2d and is reported to the coordinator.
     (c) What does not change. No file of the order changes for this, and the rule does not reach a
     real step: a real step that fails is reported as the order says.
