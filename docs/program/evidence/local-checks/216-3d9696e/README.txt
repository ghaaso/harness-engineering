PR #216 at 3d9696e211d135046dded913068131e019cba553, merged as f425ede on 2026-11-14 at 21:05 (ruling C60; rulings C82, C84, C89 and C95 for the PR itself).
Tested commit: the head itself, 3d9696e211d135046dded913068131e019cba553 (origin/main 41946a8 was its ancestor, so no local merge was needed). Tree d969e5555bdf80120ae4d2579f3cedb39c526f7b; the squash on main has the identical tree.
Log dirs on this PC: C:/Users/User/.fixflow-cache/gate-logs/lc216/{backend-20261114-205516,mobile-20261114-205643,web-20261114-205515}.
pytest: 1502 passed, 882 warnings in 465.70s (0:07:45); SKIPS total=1502 skipped=0 integration_skipped=0
jest: Tests:       512 passed, 512 total
vitest:  Test Files  45 passed (45)       Tests  384 passed (384)
GitHub's three jobs on that head were refused for billing (ruling C52).
Reviews, both VERDICT: PASS on the exact head: C:/Users/User/.fixflow-cache/handoff/reviews/216-3d9696e.txt (whole PR, the file given to the merge gate) and 216-3d9696e-migration.txt (migration), filed under docs/program/evidence/reviews/.
Alembic head on main after this merge: 0048 (backend/alembic/versions/0048_bill_revision_and_money_chain.py). The next free slot is 0049.
