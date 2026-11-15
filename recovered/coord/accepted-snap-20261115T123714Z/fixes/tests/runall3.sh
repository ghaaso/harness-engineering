#!/bin/sh
# rulings 63-66 follow-up (2026-11-14): one command, in ONE post-code card container (cwd /w/fixes):
#   sh frun.sh tests-post3 gpu post -- sh tests/runall3.sh ; docker wait kge-F1 ; sh frun.sh --done tests-post3
# runs the whole earlier suite on the final code (runall2.sh with CODE=post: the four first tests, the three
# per-ruling tests, test_rename pre2/post and the dry plan), then rulings 64-66 on the code before them (pre3,
# fixes/pre_m3, loaded by path) and on the current code.
one() { echo "=== $1 (CODE=$CODE) $(date -u +%FT%TZ)"; shift; "$@"; echo "=== exit $? "; }
sh tests/runall2.sh
for v in pre3 post; do
  one test_r64_$v python tests/test_r64.py $v
  one test_r65_66_$v python tests/test_r65_66.py $v
done
