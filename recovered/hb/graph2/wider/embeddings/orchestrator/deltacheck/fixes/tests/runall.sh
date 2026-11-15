#!/bin/sh
# runs every pre-run-fix plumbing test in order (inside the container, cwd /w/fixes); CODE=pre|post from the runner
for t in test_r49_52 test_r55 test_r59 test_select_report; do
  echo "=== $t (CODE=$CODE) $(date -u +%FT%TZ)"
  python tests/$t.py
  echo "=== exit $t $?"
done
