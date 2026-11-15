#!/bin/bash
# Search tuner, stage 2 (final list), inside graphtest:1. TUNE only (sweep.js fixes the split to tune).
set -e
git config --global --add safe.directory /repo
export GT_BUILD=/build GT_REPO=/repo GT_STORE=/store GT_SRCSTORE=/store/srcstore GT_TMP=/tmp/gt
cd /build
T=/build/tmp/tune-search
node --version
node $T/handcheck.js | tail -1
rm -rf $T/run2; s=$(date +%s)
node arms/common/sweep.js --arms search --stage 2 --sets T1,T1x,T2 --out $T/run2 > $T/run2.out 2> $T/run2.err || { tail -20 $T/run2.err; exit 1; }
cat $T/run2.out
echo "wall $(( $(date +%s) - s )) s"
node $T/verify_stage2.js $T/run2
echo done
