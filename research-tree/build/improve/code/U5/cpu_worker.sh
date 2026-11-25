#!/bin/bash
# U5 CPU worker: takes sweep runs (same plan and claims as the GPU driver) while the card is held by other units.
cd /c/Users/User/Documents/projects/harness-engineering/research-tree/build/improve/code/U5
O=/c/Users/User/Documents/projects/card-run-2026-11/improve/U5
f=0
while true; do
  U5_THREADS=${U5_THREADS:-8} ./run_cpu.sh train.py work cpu >> $O/logs/cpu-worker.log 2>&1; rc=$?
  echo "$(date +%T) cpu work rc=$rc" >> $O/logs/driver.log
  case $rc in
    0) f=0;;
    10|12) exit 0;;
    11) sleep 120;;
    *) f=$((f+1)); [ $f -ge 3 ] && exit 1; sleep 30;;
  esac
done
