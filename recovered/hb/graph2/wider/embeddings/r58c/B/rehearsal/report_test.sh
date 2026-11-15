#!/bin/sh
# Agent B, round 3 (the coordinator's order after ruling 95; CONFLICTS.md note 11, option (a)): the TEST report as it
# is. `python selectB.py --test` (PLACEBO only, writes train/selectB-test/; the folder held a Nov-14 output without the
# builder and fixed-w tables that report.py --test reads) and then `python report.py --test` (reads train/selectB-test/
# and eval/comparators, writes train/report/test.json). Neither file is changed and no stage-B, selectB, held-out or
# real report table is read. Run by: KT_TRAIN_RW="selectB-test report" sh LANE/r58c/B/ktest.sh ktest-b<N>
# /w/r58c/B/rehearsal/report_test.sh   Log r58c/B/out/logs/report-test.log; exit 0 only when both exited 0 and
# test.json says test: true.
L=/w/r58c/B/out/logs/report-test.log
{ for f in /w/train/selectB.py /w/train/report.py /w/eval/evalcore.py /w/r58c/B/rehearsal/report_test.sh; do echo "sha256 $(sha256sum $f | cut -c1-64) ${f#/w/}"; done
  echo "before: train/selectB-test/PLACEBO holds $(ls /w/train/selectB-test/PLACEBO | wc -l) files"
  cd /w/train && python selectB.py --test; r1=$?; echo "selectB --test rc $r1"
  r2=99; [ $r1 = 0 ] && { python report.py --test; r2=$?; }; echo "report --test rc $r2"
  for f in /w/train/selectB-test/PLACEBO/*; do echo "sha256 $(sha256sum $f | cut -c1-64) ${f#/w/}"; done
  [ -f /w/train/report/test.json ] && echo "sha256 $(sha256sum /w/train/report/test.json | cut -c1-64) train/report/test.json"
  t=$(python -c "import json;print(json.load(open('/w/train/report/test.json')).get('test'))" 2>/dev/null)
  echo "test.json test flag: $t"
  if [ $r1 = 0 ] && [ $r2 = 0 ] && [ "$t" = True ]; then echo "RESULT PASS report-test"; echo "rc 0"; else echo "RESULT FAIL report-test"; echo "rc 1"; fi
} > $L 2>&1
cat $L; rc=$(tail -1 $L | sed -n "s/^rc //p"); exit ${rc:-3}
