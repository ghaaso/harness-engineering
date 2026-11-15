#!/bin/sh
# usage: gostart.sh JOB TAG [MEM]  -- repeat the first gate until it passes with no kge-* running at the moment of start
PB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/orchestrator/parwork
JOB=$1; TAG=$2; MEM=${3:-2560m}
while :; do
  sh $PB/gate.sh first || exit 1
  if docker ps --format '{{.Names}}' | grep -q '^kge-'; then echo "$(date -u +%FT%TZ) a kge-* started after the gate; gating again" | tee -a $PB/logs/gate.log; continue; fi
  sh $PB/start.sh kge-P1 $MEM $JOB && break
  exit 1
done
(sh $PB/mon.sh $TAG > /dev/null 2>&1 &)
echo "started kge-P1 $JOB at $(date -u +%FT%TZ)"
