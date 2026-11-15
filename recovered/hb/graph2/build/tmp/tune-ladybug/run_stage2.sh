#!/bin/bash
# Stage-2 sweep of the LadybugDB arm (inside graphtest:1, via arms/ladybug/dk.sh-like flags), TUNE only.
# One run does both jobs: the ladybug answers for T1, T1x and T2, and the cross-check of every
# specification entry against the reference arm (extension entries run on ladybug only).
#   MODE=smoke -> 6 tasks of T1 into tmp/tune-ladybug/smoke (nothing moved)
#   MODE=full  -> all TUNE tasks; ladybug answers move to results/ladybug/tune/, summaries to
#                 results/ladybug/sweep/stage2/; the reference copies stay in tmp/tune-ladybug/s2root
set -e
cd /build
export GT_STORE=/store/s2 GT_TMP=/build/tmp/tune-ladybug
L=/build/results/ladybug/logs
mkdir -p $L
if [ "$MODE" = "smoke" ]; then
  R=/build/tmp/tune-ladybug/smoke; rm -rf $R; mkdir -p $R
  ( time node arms/common/sweep.js --arms ladybug,reference --list ladybug --stage 2 --sets T1 --limit 6 --out $R ) 2>&1 | tail -5
  exit 0
fi
R=/build/tmp/tune-ladybug/s2root
rm -rf $R; mkdir -p $R
( time node arms/common/sweep.js --arms ladybug,reference --list ladybug --stage 2 --sets T1,T1x,T2 --out $R ) > $L/stage2.log 2>&1
mkdir -p /build/results/ladybug/tune /build/results/ladybug/sweep/stage2
mv $R/ladybug/tune/*.jsonl.gz /build/results/ladybug/tune/
for f in summary configs; do cp $R/sweep/$f.stage2.json /build/results/ladybug/sweep/stage2/ladybug+reference_T1+T1x+T2.$f.json; done
cp $R/sweep/crosscheck_mismatches.stage2.jsonl /build/results/ladybug/sweep/stage2/ladybug+reference_T1+T1x+T2.crosscheck_mismatches.jsonl
cat $R/sweep/lists.jsonl >> /build/results/ladybug/sweep/lists.jsonl
echo done
