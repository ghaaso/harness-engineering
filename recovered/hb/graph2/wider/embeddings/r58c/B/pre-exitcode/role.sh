#!/bin/sh
# In-container role wrapper (rulings 58/83; see role_selectB.sh, role_report.sh): runs the given tests through
# kt_inner.sh and writes $BOUT/logs/role_<role>.log in the form selectB.r58_guard reads: `sha256 <hex> <role file>`
# (taken before AND after the tests; they must be equal), every test's own log, and `RESULT PASS <role>` only when
# every test exited 0 with RESULT PASS. With PART=<name> set (a role too long for one ten-minute container) it
# writes role_<role>.<name>.log ending `RESULT PASS part <name> of <role>` instead, and r58c/B/role_join.sh (host)
# joins the parts into role_<role>.log. The RUNLOG lines are then `sha256 <hex> <role> <role file>` and, after it,
# `PASS <role> r58c/B/out/logs/role_<role>.log` (the lead appends them).
# usage: [PART=p1] sh role.sh <role> <role file, lane-relative> <test> [<test> ...]
ROLE=$1; RF=$2; shift 2
LOGS=$BOUT/logs; mkdir -p $LOGS
if [ -n "$PART" ]; then OUT=$LOGS/role_$ROLE.$PART.log; OK="RESULT PASS part $PART of $ROLE"; NO="RESULT FAIL part $PART of $ROLE"
else OUT=$LOGS/role_$ROLE.log; OK="RESULT PASS $ROLE"; NO="RESULT FAIL $ROLE"; fi
h0=$(sha256sum /w/$RF | cut -d' ' -f1)
sh /w/r58c/B/tests/kt_inner.sh "$@" > $LOGS/role_$ROLE${PART:+.$PART}.summary 2>&1
h1=$(sha256sum /w/$RF | cut -d' ' -f1)
{ echo "sha256 $h0 $RF"; echo "role $ROLE${PART:+ part $PART} tests: $*"
  for t in "$@"; do echo "===== $t ($LOGS/$t.log)"; cat $LOGS/$t.log; done
  echo "===== summary"; cat $LOGS/role_$ROLE${PART:+.$PART}.summary
  bad=0; for t in "$@"; do grep -q "^$t rc=0 RESULT PASS" $LOGS/role_$ROLE${PART:+.$PART}.summary || bad=1; done
  [ "$h0" = "$h1" ] || { echo "the role file changed during the run: $h0 -> $h1"; bad=1; }
  if [ $bad = 0 ]; then echo "$OK"; else echo "$NO"; fi; } > $OUT
tail -1 $OUT
