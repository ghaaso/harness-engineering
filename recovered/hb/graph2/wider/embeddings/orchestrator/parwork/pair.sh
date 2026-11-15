#!/bin/sh
# usage: pair.sh PAIR JOB1 JOB2  -- P1 (first gate) -> second gate -> P2; steady window from both warm-ups' end; 390 s; stop file
PB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/orchestrator/parwork
PAIR=$1; J1=$2; J2=$3; T1=${J1%.sh}; T2=${J2%.sh}
say() { echo "$(date +%s.%N) $(date -u +%FT%TZ) $*" | tee -a $PB/logs/$PAIR.driver; }
rm -f $PB/ctl/stop_$PAIR
say "pair $PAIR: $J1 then $J2"
sh $PB/gostart.sh $J1 $PAIR || { say "first start failed"; exit 1; }
say "P1 started; second gate (free >= 6 GB, commit < 38 GB)"
timeout 600 sh $PB/gate.sh second; rc=$?
if [ $rc -ne 0 ]; then say "second gate did not pass in 10 min (rc=$rc): stopping P1"; touch $PB/ctl/stop_$PAIR; docker stop -t 30 kge-P1; exit 3; fi
sh $PB/start.sh kge-P2 2560m $J2 >/dev/null || { say "P2 start failed"; touch $PB/ctl/stop_$PAIR; exit 1; }
say "P2 started"
warm() { grep -c '"status": "done"' $PB/runs/$1.jsonl 2>/dev/null || echo 0; }
until [ "$(warm $T1)" -ge 1 ] && [ "$(grep -c '"status"' $PB/runs/$T2.jsonl 2>/dev/null || echo 0)" -ge 1 ]; do
  docker ps --format '{{.Names}}' | grep -q '^kge-P2$' || { say "P2 gone before warm-up end"; break; }
  sleep 2; done
say "STEADY start (both warm-up units finished); P1 units done so far $(warm $T1)"
sleep 390
say "STOP file"
touch $PB/ctl/stop_$PAIR
docker wait kge-P1 kge-P2 >/dev/null 2>&1
say "both exited"
