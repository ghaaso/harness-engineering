#!/bin/sh
# Joins a role's part logs (r58c/B/tests/role.sh with PART) into r58c/B/out/logs/role_<role>.log, the one log the
# RUNLOG PASS line names: `sha256 <hex> <role file>` (the CURRENT bytes), every part log, and `RESULT PASS <role>`
# only when every part log ends `RESULT PASS part <p> of <role>` and opens with that same sha256 line.
# usage: sh role_join.sh <role> <role file, lane-relative> <part> [<part> ...]      exit 0 PASS, 1 FAIL
W=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
ROLE=$1; RF=$2; shift 2; LOGS=$W/r58c/B/out/logs; OUT=$LOGS/role_$ROLE.log
h=$(sha256sum $W/$RF | cut -d' ' -f1); bad=0
{ echo "sha256 $h $RF"; echo "role $ROLE joined from parts: $*"
  for p in "$@"; do f=$LOGS/role_$ROLE.$p.log
    if [ ! -f $f ]; then echo "part $p: $f missing"; bad=1; continue; fi
    [ "$(head -1 $f)" = "sha256 $h $RF" ] || { echo "part $p: first line '$(head -1 $f)' is not the current bytes"; bad=1; }
    [ "$(tail -1 $f)" = "RESULT PASS part $p of $ROLE" ] || { echo "part $p: last line '$(tail -1 $f)'"; bad=1; }
    echo "===== part $p ($f, sha256 $(sha256sum $f | cut -d' ' -f1))"; sed 's/^RESULT /part-result /' $f; done
  if [ $bad = 0 ]; then echo "RESULT PASS $ROLE"; else echo "RESULT FAIL $ROLE"; fi; } > $OUT
tail -1 $OUT; [ $bad = 0 ]
