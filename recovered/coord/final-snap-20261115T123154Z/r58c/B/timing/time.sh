#!/bin/sh
# Agent B, round r58c, change 5: one timing mode of r58c/B/timing/time_steps.py in this ktest-b container.
# usage: sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/timing/time.sh assemble|selectB|report
L=/w/r58c/B/out/logs/timing-$1.log; mkdir -p /w/r58c/B/out/logs
{ for f in /w/r58c/B/timing/time_steps.py /w/r58c/B/timing/make_full_copy.js /w/train/stageB.py /w/train/selectB.py /w/train/report.py /w/orchestrator/assemble_checks.py; do echo "sha256 $(sha256sum $f | cut -c1-64) ${f#/w/}"; done
  for f in stageB.py selectB.py report.py; do cmp -s /w/train/$f /w/r58c/B/out/timing/asm/train/$f && echo "the copy's train/$f equals train/$f" || echo "the copy's train/$f DIFFERS from train/$f"; done
  python /w/r58c/B/timing/time_steps.py "$1"; echo "rc $?"; } > $L 2>&1
cat $L; rc=$(tail -1 $L | sed -n "s/^rc //p"); exit ${rc:-3}
