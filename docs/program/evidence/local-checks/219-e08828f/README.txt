PR #219 at e08828f4ffecd7cf0ce0051b1b8067bbbbcaa568, merged as 8c0c74c on 2026-11-14 at 23:42 (ruling C60; rulings C99, C101 and C102 for the PR itself).
Tested commit: the head itself (origin/main b3fd9c9 was its ancestor, so no local merge was needed). Tree 34a54060ea65246938d110fea5d6d932773b06f8; the squash on main has the identical tree.
Log dirs on this PC: C:/Users/User/.fixflow-cache/gate-logs/lc219b/{backend-20261114-233222,mobile-20261114-233322,web-20261114-233220}.
pytest: 1573 passed, 907 warnings in 444.71s (0:07:24); SKIPS total=1573 skipped=0 integration_skipped=0
jest: Tests:       512 passed, 512 total
vitest:  Tests  402 passed (402)
GitHub's three jobs on that head were refused for billing (ruling C52).
Reviews: C:/Users/User/.fixflow-cache/handoff/reviews/219-e08828f.txt (a fresh reviewer's VERDICT: PASS on the last delta at the exact head, the file given to the merge gate) together with 219-d117e5f.txt (the PR's reviewer on the whole PR at d117e5f: PASS-WITH-FIXES naming only what that delta fixes) and 219-d1c2371.txt (the first round). All filed under docs/program/evidence/reviews/.
Docs only: docs/RUNBOOK-SELFHOST.md. No migration: the Alembic head on main stays 0048.
