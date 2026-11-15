#!/bin/sh
# Agent B, round 3: one change-5 timing (time.sh assemble|selectB|report, or time_item22.sh for item22) under
# r58c/B/timing/mem_run.py, which records the peak RSS and the container's own cgroup peak before the container ends.
# Same stand-in data (r58c/B/out/timing/asm) and the same cap as before (ktest.sh's 1536m, lane_step.sh's cap for
# every step but ktest-r4). usage: sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/timing/mem.sh assemble|selectB|report|item22
L=/w/r58c/B/out/logs/mem-$1.log; T=/w/r58c/B/timing
case "$1" in assemble|selectB|report) C="sh $T/time.sh $1" ;; item22) C="sh $T/time_item22.sh" ;; *) echo "usage: mem.sh assemble|selectB|report|item22"; exit 2 ;; esac
{ for f in $T/mem_run.py $T/mem.sh $T/time.sh $T/time_item22.sh $T/time_steps.py; do echo "sha256 $(sha256sum $f | cut -c1-64) ${f#/w/}"; done
  python $T/mem_run.py "$1" $C; rc=$?; echo "rc $rc"; } > $L 2>&1
cat $L; rc=$(tail -1 $L | sed -n "s/^rc //p"); exit ${rc:-3}
