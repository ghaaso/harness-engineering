#!/bin/sh
# Agent B, round 3 (the coordinator, after note 18 option (a)): the TEST tune.json harness ALONE, on agent A's rebuilt
# fakesel. compare_rank is NOT run and nothing under grader-returns/ is read or hashed (it waits for 2e).
# usage: sh LANE/r58c/B/ktest.sh ktest-b<N> /w/r58c/B/rehearsal/harness_tune.sh   Log r58c/B/out/logs/tune-harness-only.log.
# Then the host copies r58c/B/out/harness/tune.json to r58c/handoff-test/report/tune.json.
L=/w/r58c/B/out/logs/tune-harness-only.log
{ for f in /w/r58c/B/rehearsal/tune_harness.py /w/r58c/B/rehearsal/harness_tune.sh /w/train/report.py /w/eval/evalcore.py \
           /w/r58c/A/FAKESEL-READY; do echo "sha256 $(sha256sum $f | cut -c1-64) ${f#/w/}"; done
  find /w/r58c/A/out/fakesel -type f | sort | while read -r f; do echo "sha256 $(sha256sum $f | cut -c1-64) ${f#/w/}"; done
  cd /w/train && python /w/r58c/B/rehearsal/tune_harness.py; r1=$?; echo "tune_harness rc $r1"
  if [ $r1 = 0 ]; then echo "RESULT PASS harness-tune"; echo "rc 0"; else echo "RESULT FAIL harness-tune"; echo "rc 1"; fi
} > $L 2>&1
cat $L; rc=$(tail -1 $L | sed -n "s/^rc //p"); exit ${rc:-3}
