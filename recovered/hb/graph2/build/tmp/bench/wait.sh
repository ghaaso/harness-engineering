#!/usr/bin/env bash
# wait.sh <run> <pattern> : wait up to ~8 minutes for <pattern> in tmp/bench/<run>.log, then print the
# log tail and the host-load samples taken since the last call (other-process CPU, % of one CPU).
B=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build
L=$B/tmp/bench/$1.log; H=$B/results/bench/$1/host_load.jsonl; M=$B/tmp/bench/.$1.hlseen
for i in $(seq 1 48); do grep -qE "$2" "$L" && break; sleep 10; done
date -u +%H:%M:%SZ; grep -E "warm|cold [0-9]|==|measure|FAIL|Error|rror" "$L" | tail -6
seen=$(cat "$M" 2>/dev/null || echo 0); total=$(wc -l < "$H" 2>/dev/null || echo 0)
tail -n +$((seen + 1)) "$H" 2>/dev/null | tr -d '\r' | grep -o '"at":"[^"]*","host_total_pct_of_all":[0-9.]*,"vm_pct_of_one":[0-9.]*,"other_pct_of_one":[0-9.]*' | awk -F'[:,]' '{o=$NF; if (o+0>m) {m=o+0; at=$0}} END {print "host samples since last check:", NR, " max other-process CPU % of one CPU:", m; print at}'
echo "$total" > "$M"
