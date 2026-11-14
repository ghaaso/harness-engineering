PR #203 at ff4c34f236750d0d51a6ab7fc1c518bc5febedf8: NOT MERGED. The coordinator's four checks of 2026-11-15, 02:17 to 02:26 (ruling C60; rulings C104 to C107 for the PR itself).
Tested commit: the head itself (origin/main 8c0c74c is its ancestor, so no local merge was needed). Tree 85c7ab45d5698f707ab01ba9cc4f339696963427.
Fourth check, the drain tree: the coordinator's 15061d7 (a31924a, then P1, the timezone fix, P2b-2 and P3a, with the audit at this head), tree 4054a4d88abdbab57d79558d4eb673cc5d8cc419, identical to the P2b-2 lane's drain tree b5fa9e2 and to a rehearsed cut in the runbook's order with a seven-file pick commit (ruling C106).
Log dirs on this PC: C:/Users/User/.fixflow-cache/gate-logs/lc203/{backend-20261115-021742,mobile-20261115-021919,web-20261115-021743} and C:/Users/User/.fixflow-cache/gate-logs/lc203d/backend-20261115-022049.
pytest on the head: 1838 passed, 1132 warnings in 474.34s (0:07:54); SKIPS total=1838 skipped=0 integration_skipped=0
pytest on the drain tree: 1215 passed, 332 warnings in 196.63s (0:03:16); SKIPS total=1215 skipped=0 integration_skipped=0
jest: Tests:       512 passed, 512 total
vitest:  Tests  402 passed (402)
This closes ruling C105: the same backend check on a local merge of main 8c0c74c and the previous head ba7952b had 1 failed, 1836 passed (P8b's single-writer tripwire on the audit's fuel snapshot).
GitHub's three jobs on that head were refused for billing (ruling C52).
The merge gate: `merge-ready.sh 203 <verdict> --dry-run --local-checks ...` prints "REFUSED: P2b-2 merges after P2b-1, and no merged PR is titled [P2b-1]". A temporary copy of the script with that one order line set aside and the merge command disabled, run as a dry run and then removed, printed "OK to merge: #203 ... @ ff4c34f (phase P2b-2)": the plan's order is the only objection.
Why it is not merged (ruling C107): the PR stays open and merge-ready until P2b-1 (PR #197) merges. These four checks are repeated then, on a local merge with the new main.
Reviews: C:/Users/User/.fixflow-cache/handoff/reviews/203-ff4c34f.txt (the fresh reviewer's VERDICT: PASS on the last delta and the rebase, at the exact head) together with 203-ba7952b.txt (the delta before it), 203-cccabf6-server.txt and 203-cccabf6-phone.txt (the whole PR, two lenses). All filed under docs/program/evidence/reviews/.
Eight files, all under backend/: seven additions (the two scripts, the fixture and four test files) and one modification (tests/test_bill_single_writer.py). No migration: the Alembic head on main stays 0048.
