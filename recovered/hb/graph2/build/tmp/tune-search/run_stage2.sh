#!/bin/bash
# Search tuner, stage 2, inside graphtest:1. TUNE only (sweep.js fixes the split to tune).
set -e
git config --global --add safe.directory /repo
export GT_BUILD=/build GT_REPO=/repo GT_STORE=/store GT_SRCSTORE=/store/srcstore GT_TMP=/tmp/gt
cd /build
T=/build/tmp/tune-search
node --version
echo "== hand check"
node $T/handcheck.js | tail -1
echo "== stage-1 regression (4 stage-1 configurations, all TUNE T1, T1x, T2 tasks)"
rm -rf $T/reg1; s=$(date +%s)
node arms/common/sweep.js --arms search --stage 1 --sets T1,T1x,T2 --only base,bm25,pad=CO,bm25only --out $T/reg1 2> $T/reg1.err || { tail -20 $T/reg1.err; exit 1; }
echo "wall $(( $(date +%s) - s )) s"
node $T/regcheck.js $T/reg1
echo "== stage 2"
rm -rf $T/run2; s=$(date +%s)
node arms/common/sweep.js --arms search --stage 2 --sets T1,T1x,T2 --out $T/run2 > $T/run2.out 2> $T/run2.err || { tail -20 $T/run2.err; exit 1; }
cat $T/run2.out
echo "wall $(( $(date +%s) - s )) s"
echo done
