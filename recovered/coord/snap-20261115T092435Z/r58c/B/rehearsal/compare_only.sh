#!/bin/sh
# Agent B, round 3 (2e): compare_rank.py alone, the harness's six-arm TEST tune.json (r58c/handoff-test/report/tune.json)
# against the grader's fresh TEST tune-rank.json. usage: sh LANE/r58c/B/ktest.sh ktest-b<N> /w/r58c/B/rehearsal/compare_only.sh
# Log r58c/B/out/logs/compare-rank.log.
L=/w/r58c/B/out/logs/compare-rank.log; T=/w/r58c/handoff-test/report/tune.json; R=/w/grader-returns/test/tune-rank.json
{ for f in /w/r58c/B/rehearsal/compare_rank.py /w/r58c/B/rehearsal/compare_only.sh /w/train/write_result.py $T $R; do echo "sha256 $(sha256sum $f | cut -c1-64) ${f#/w/}"; done
  cd /w/train && python /w/r58c/B/rehearsal/compare_rank.py $T $R; r=$?; echo "compare_rank rc $r"; echo "rc $r"; } > $L 2>&1
cat $L; rc=$(tail -1 $L | sed -n "s/^rc //p"); exit ${rc:-3}
