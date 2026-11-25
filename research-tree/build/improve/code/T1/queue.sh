#!/bin/bash
# T1: runs a list of abl.py runs one after another (each skips itself when finished). usage: queue.sh "variant seed" ...
cd "$(dirname "$0")"
L=/c/Users/User/Documents/projects/card-run-2026-11/improve/T1/logs
for job in "$@"; do
  set -- $job
  echo "$(date -u +%FT%TZ) start $1 $2" >> $L/queue.log
  ./run_cpu.sh abl.py run $1 $2 > $L/$1_s$2.log 2>&1
  echo "$(date -u +%FT%TZ) end $1 $2 exit=$?" >> $L/queue.log
done
