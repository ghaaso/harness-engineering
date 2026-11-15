#!/bin/sh
# resume run (2026-11-14 evening): the new per-ruling tests; on CODE=post also the four earlier tests, the rename test
# on the code as found at resume (pre2) and as hardened (post), and the fresh dry plan. cwd /w/fixes.
one() { echo "=== $1 (CODE=$CODE) $(date -u +%FT%TZ)"; shift; "$@"; echo "=== exit $? "; }
if [ "$CODE" = "post" ]; then
  for t in test_r49_52 test_r55 test_r59 test_select_report; do one $t python tests/$t.py; done
fi
for t in test_r49_50_detail test_r53_58_unit test_r59_start; do one $t python tests/$t.py; done
if [ "$CODE" = "post" ]; then
  one test_rename_pre2 python tests/test_rename.py pre2
  one test_rename_post python tests/test_rename.py post
  one dryplan python dryplan.py
fi
