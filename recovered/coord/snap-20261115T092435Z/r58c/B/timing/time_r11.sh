#!/bin/sh
# Agent B, round 3: the E5 route audit's full-size stand-in timing (r58c/B/timing/time_r11.py; ktest-r11's limit).
# usage: sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/timing/time_r11.sh
L=/w/r58c/B/out/logs/time-r11.log; T=/w/r58c/B/timing
{ for f in $T/time_r11.py $T/time_r11.sh /w/train/kge.py; do echo "sha256 $(sha256sum $f | cut -c1-64) ${f#/w/}"; done
  python $T/time_r11.py; rc=$?; echo "rc $rc"; } > $L 2>&1
cat $L; rc=$(tail -1 $L | sed -n "s/^rc //p"); exit ${rc:-3}
