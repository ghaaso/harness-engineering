PR #215 at 7d05da7b89b92df28a7c2e00a24e5b14812cdf0c, merged as b3fd9c9 on 2026-11-14 at 22:39 (ruling C60; rulings C76, C77, C80, C93, C94 and C97 for the PR itself).
Tested commit: e659bab4ef4af092611714fa7ffafe86e552a2d7, a local merge of origin/main be7c4da and the head (never pushed). Tree 0ca4cffafa2df5b1c233b42879fd8ad7e6213077; the squash on main has the identical tree.
Log dirs on this PC: C:/Users/User/.fixflow-cache/gate-logs/lc215/{backend-20261114-222751,mobile-20261114-222905,web-20261114-222750}.
pytest: 1573 passed, 907 warnings in 465.66s (0:07:45); SKIPS total=1573 skipped=0 integration_skipped=0
jest: Tests:       512 passed, 512 total
vitest:  Tests  402 passed (402)
GitHub's three jobs on that head were refused for billing (ruling C52).
Reviews: C:/Users/User/.fixflow-cache/handoff/reviews/215-7d05da7.txt (whole PR, VERDICT: PASS on the exact head, the file given to the merge gate; it confirms the delta from d92b9ce is confined), and at d92b9ce 215-d92b9ce-security.txt and 215-d92b9ce-phone.txt (both VERDICT: PASS), which stand for the head under ruling C97. All filed under docs/program/evidence/reviews/.
No migration: the Alembic head on main stays 0048.
