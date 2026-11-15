#!/bin/sh
# usage: mon.sh TAG  -- host monitor while kge-P1/kge-P2 live: card every 0.5 s (nvidia-smi), host RAM/commit, other kge-*,
# disk every 10 s; stops BOTH kge-P containers at once if free < 2 GB or commit > 47 GB twice in a row, or C: < 20 GB.
PB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/orchestrator/parwork
TAG=$1
echo "host_epoch_at_start $(date +%s.%N) local $(date '+%Y/%m/%d %H:%M:%S.%N %z')" > $PB/logs/$TAG.gpu
nvidia-smi --query-gpu=timestamp,utilization.gpu,memory.used,power.draw,temperature.gpu,clocks.sm --format=csv,noheader -lms 500 >> $PB/logs/$TAG.gpu &
SMI=$!; WINPID=$(cat /proc/$SMI/winpid 2>/dev/null)
bad=0; seen=0
while :; do
  N=$(docker ps --format '{{.Names}}' | grep -E '^kge-P[12]$' | tr '\n' ' ')
  if [ -z "$N" ]; then seen=$((seen+1)); [ $seen -ge 2 ] && break; else seen=0; fi
  set -- $(sh $PB/gate.sh sample)
  O=$(docker ps --format '{{.Names}}' | grep -E '^kge-' | grep -vE '^kge-P[12]$' | tr '\n' ' ')
  D=$(df -BG /c | awk 'NR==2{gsub("G","",$4); print $4}')
  echo "$(date +%s.%N) free_kb=$1 commit_kb=$2 disk_gb=$D mine=[$N] others=[$O]" >> $PB/logs/$TAG.host
  if [ -n "$2" ] && { [ "$1" -lt 2097152 ] || [ "$2" -gt 49283072 ]; }; then bad=$((bad+1)); else bad=0; fi
  if [ $bad -ge 2 ] || [ "${D:-99}" -lt 20 ]; then
    echo "$(date +%s.%N) STOP: bad=$bad disk=$D -> docker stop kge-P1 kge-P2" >> $PB/logs/$TAG.host
    docker stop -t 0 kge-P1 kge-P2 >/dev/null 2>&1 &
    docker stop -t 0 kge-P2 kge-P1 >/dev/null 2>&1; wait
  fi
  sleep 8
done
kill $SMI 2>/dev/null; sleep 1; [ -n "$WINPID" ] && taskkill //F //PID $WINPID >/dev/null 2>&1
echo "$(date +%s.%N) monitor end" >> $PB/logs/$TAG.host
