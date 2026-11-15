#!/bin/bash
# Tuner lane (relational), smoke test inside graphtest:1: toy x_wsp check, then 3 T1 TUNE tasks of the
# stage-2 list on relational + reference. TUNE only.
set -u
git config --global --add safe.directory /repo
export GT_BUILD=/build GT_REPO=/repo GT_TMP=/tmp/gt
mkdir -p /tmp/gt
C=/build/arms/common; R=/build/tmp/tune-relational
node --version
node /build/arms/relational/wspcheck.js
mkdir -p /store/T1 $R/out_smoke
export GT_STORE=/store/T1 GT_SRCSTORE=/store/T1/src
s=$(date +%s)
node $C/sweep.js --arms relational,reference --list relational --stage 2 --sets T1 --limit 3 --out $R/out_smoke
echo "exit $? wall $(( $(date +%s) - s )) s"
