#!/bin/bash
# T3: runs m78_u6.py jobs one after another. usage: m78_queue.sh "tgn fixflow 20 0.001 asis" ...
cd "$(dirname "$0")"
L=/c/Users/User/Documents/projects/card-run-2026-11/improve/T3/logs
for job in "$@"; do
  echo "$(date -u +%FT%TZ) start $job" >> $L/m78_queue.log
  T3_NAME=m78 T3_PATH=/code:/code4 ./run_cpu.sh m78_u6.py $job > "$L/m78_${job// /_}.log" 2>&1
  echo "$(date -u +%FT%TZ) end $job exit=$?" >> $L/m78_queue.log
done
