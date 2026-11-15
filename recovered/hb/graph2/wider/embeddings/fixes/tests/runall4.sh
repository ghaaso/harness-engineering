#!/bin/sh
# release-gate round (2026-11-14): one command, in ONE post-code card container (cwd /w/fixes):
#   sh frun.sh tests-post4 gpu post -- sh tests/runall4.sh ; docker wait kge-F1 ; sh frun.sh --done tests-post4
# = runall3.sh (every earlier test on the current code, the dry plan, rulings 64-66 pre3/post), then the
# release-gate stageB test on the code before this round (pre4, fixes/pre_m4, by path) and on the current code,
# and the E5 equivalence check (scoring-selection-5). The host-side guard/memgate test is sh tests/test_guard_host.sh.
one() { echo "=== $1 (CODE=$CODE) $(date -u +%FT%TZ)"; shift; "$@"; echo "=== exit $? "; }
sh tests/runall3.sh
for v in pre4 post; do one test_ops_stageB_$v python tests/test_ops_stageB.py $v; done
one test_e5_equiv python tests/test_e5_equiv.py
