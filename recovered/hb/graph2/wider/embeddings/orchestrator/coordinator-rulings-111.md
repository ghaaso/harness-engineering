# Coordinator ruling 111, on the end-of-run test after step 1

Ruled by the coordinator on 2026-11-15 at about 15:17Z (file hash and exact time are in `progress.jsonl`,
line `rulings_111`), during step 2d of the accepted end order (END-ORDER 1c849061), before the code freeze,
any selection, any report and any held-out score. Raised by the lane: `r58c/B/eor/test_end_of_run.sh`
printed RESULT FAIL (15 of 43 checks); the coordinator read the test, its fixture, both runs' output and
the state of the real lane. It goes to the end of section M word for word, before the code freeze.

111. The end-of-run test after step 1.
     (a) What happened. The test of the end-of-run script copies the lane's real run log into each of
     its trial lanes and counts the PASS lines there. Since step 1 the real run log holds step 1's own
     PASS line, so 15 of the test's 43 checks count one line too many, or read two log names where they
     expect one (step 2d, 14:59Z to 15:14Z). Every check of an exit code and of what the script did
     passed. The same bytes of the script, of the check script and of the test passed all 43 checks at
     10:44Z, before step 1, and the script's real run in step 1 passed. The failed run left the real
     lane as it was: one PASS line in the run log, the same tables digest, the same sixteen records.
     (b) The decision. The test cannot pass as it is once step 1 has run, and neither the test nor its
     fixture is changed. For step 2d it is run once more from a copy kept outside the lane's test
     files, identical except that the fixture leaves step 1's PASS line out of the trial lanes' run
     logs. If that run passes all 43 checks, it stands as step 2d's evidence for this test, together
     with the run of 10:44Z and step 1's real run. If it does not, the lane reports.
     (c) What it means later. The end-of-run script runs again only if step 1 has to be repeated before
     the freeze. The coordinator's report names this limit of the test.
