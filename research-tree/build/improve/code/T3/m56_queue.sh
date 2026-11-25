#!/bin/bash
# T3: runs m56_u5.py jobs one after another. usage: m56_queue.sh "inv 0" "zul 25 0" ...
cd "$(dirname "$0")"
L=/c/Users/User/Documents/projects/card-run-2026-11/improve/T3/logs
for job in "$@"; do
  echo "$(date -u +%FT%TZ) start $job" >> $L/m56_queue.log
  T3_NAME=m56 T3_PATH=/t1code:/code5:/code4 ./run_cpu.sh m56_u5.py $job > "$L/m56_${job// /_}.log" 2>&1
  echo "$(date -u +%FT%TZ) end $job exit=$?" >> $L/m56_queue.log
done
