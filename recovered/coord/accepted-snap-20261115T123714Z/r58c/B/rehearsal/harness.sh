#!/bin/sh
# Agent B, round 3 (note 11 (b)): the TEST tune.json harness, then its comparison with the grader's TEST tune-rank.json.
# usage: sh LANE/r58c/B/ktest.sh ktest-b<N> /w/r58c/B/rehearsal/harness.sh   Log r58c/B/out/logs/tune-harness.log.
L=/w/r58c/B/out/logs/tune-harness.log
{ for f in /w/r58c/B/rehearsal/tune_harness.py /w/r58c/B/rehearsal/compare_rank.py /w/r58c/B/rehearsal/harness.sh /w/train/report.py \
           /w/eval/evalcore.py /w/train/write_result.py /w/grader-returns/test/tune-rank.json; do echo "sha256 $(sha256sum $f | cut -c1-64) ${f#/w/}"; done
  for f in /w/r58c/A/out/fakesel/E1/*; do echo "sha256 $(sha256sum $f | cut -c1-64) ${f#/w/}"; done
  cd /w/train && python /w/r58c/B/rehearsal/tune_harness.py; r1=$?; echo "tune_harness rc $r1"
  r2=99; [ $r1 = 0 ] && { python /w/r58c/B/rehearsal/compare_rank.py /w/r58c/B/out/harness/tune.json /w/grader-returns/test/tune-rank.json; r2=$?; }
  echo "compare_rank rc $r2"
  if [ $r1 = 0 ] && [ $r2 = 0 ]; then echo "RESULT PASS harness"; echo "rc 0"; else echo "RESULT FAIL harness"; echo "rc 1"; fi
} > $L 2>&1
cat $L; rc=$(tail -1 $L | sed -n "s/^rc //p"); exit ${rc:-3}
