#!/bin/bash
# Stage-1 sweep of the LadybugDB arm and its TQ answers (inside graphtest:1, via dk.sh). Its stores are
# kept apart from run_checks.sh's (/store/s1/ladybug) so both can run at once: one LadybugDB store can
# be held by one process only. The sweep writes into a scratch root; its answer files then move to
# results/ladybug/tune/ and its summaries to results/ladybug/sweep/stage1/ (the harness layout,
# results/<arm>/tune and sweep/stage1/<arms>_<sets>.*, inside this arm's folder).
#   bash arms/ladybug/dk.sh "bash /build/arms/ladybug/run_stage1.sh"
set -e
cd /build
export GT_STORE=/store/s1
R=/build/tmp/ladybug/s1root
L=/build/results/ladybug/logs
rm -rf $R; mkdir -p $R $L
( time node arms/common/sweep.js --arms ladybug --stage 1 --sets T1,T1x,T2 --out $R ) > $L/stage1.log 2>&1
rm -rf /build/results/ladybug/tune /build/results/ladybug/sweep
mkdir -p /build/results/ladybug/sweep/stage1
mv $R/ladybug/tune /build/results/ladybug/tune
for f in summary configs; do mv $R/sweep/$f.json /build/results/ladybug/sweep/stage1/ladybug_T1+T1x+T2.$f.json; done
mv $R/sweep/crosscheck_mismatches.jsonl /build/results/ladybug/sweep/stage1/ladybug_T1+T1x+T2.crosscheck_mismatches.jsonl
mv $R/sweep/lists.jsonl /build/results/ladybug/sweep/lists.jsonl
rm -rf $R
( time node arms/common/run.js tq --arm ladybug --split tune && node arms/ladybug/tq.js --split tune ) > $L/tq.log 2>&1
echo done
