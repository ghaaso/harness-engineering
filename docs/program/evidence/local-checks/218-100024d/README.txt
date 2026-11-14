PR #218 at 100024d11095692ad3594b3032dcdebf4e910778, merged as be7c4da on 2026-11-14 at 22:10 (ruling C60; rulings C95 and C96 for the PR itself).
Tested commit: the head itself, 100024d11095692ad3594b3032dcdebf4e910778 (origin/main f425ede was its ancestor, so no local merge was needed). Tree b011dc842a2354f0518745891b13495b1a9cf0a5; the squash on main has the identical tree.
Log dirs on this PC: C:/Users/User/.fixflow-cache/gate-logs/lc218/{backend-20261114-215908,mobile-20261114-220012,web-20261114-215906}.
pytest: 1504 passed, 897 warnings in 431.50s (0:07:11); SKIPS total=1504 skipped=0 integration_skipped=0
jest: Tests:       512 passed, 512 total
vitest:  Tests  384 passed (384)
GitHub's three jobs on that head were refused for billing (ruling C52).
Review: C:/Users/User/.fixflow-cache/handoff/reviews/218-100024d.txt (VERDICT: PASS on the exact head, a fresh reviewer), filed as docs/program/evidence/reviews/218-100024d.txt.
No migration: the Alembic head on main stays 0048.
