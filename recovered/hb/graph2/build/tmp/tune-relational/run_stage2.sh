#!/bin/bash
# Tuner lane (relational), inside graphtest:1: self-test, the x_wsp check (toy + real TUNE tasks
# against a JavaScript Dijkstra), then the relational stage-2 list run by relational and reference with
# the strict cross-check, one process per set (T1, T1x, T2). TUNE only. Stores on the named volume.
set -u
git config --global --add safe.directory /repo
export GT_BUILD=/build GT_REPO=/repo GT_TMP=/tmp/gt
mkdir -p /tmp/gt
C=/build/arms/common; R=/build/tmp/tune-relational
echo "== versions"; node --version; node -e "const {DatabaseSync}=require('node:sqlite');console.log('sqlite',new DatabaseSync(':memory:').prepare('select sqlite_version() v').get().v)"
echo "== selftest"; node $C/selftest.js > $R/selftest.log 2>&1; echo "exit $?"; tail -1 $R/selftest.log
echo "== held-out lock (must be REFUSED)"
node $C/run.js run --arm relational --config base --split heldout 2>&1 | tail -1
mkdir -p /store/W
( export GT_STORE=/store/W GT_SRCSTORE=/store/W/src
  s=$(date +%s)
  node /build/arms/relational/wspcheck.js --real --per-parent 2 --out $R/wspcheck.json > $R/wspcheck.log 2>&1
  echo "exit $? wspcheck wall $(( $(date +%s) - s )) s" >> $R/wspcheck.log ) &
for S in T1 T1x T2; do
  mkdir -p /store/$S $R/out_$S
  ( export GT_STORE=/store/$S GT_SRCSTORE=/store/$S/src
    s=$(date +%s)
    node $C/sweep.js --arms relational,reference --list relational --stage 2 --sets $S --out $R/out_$S > $R/stage2_$S.log 2>&1
    echo "exit $? set $S wall $(( $(date +%s) - s )) s" >> $R/stage2_$S.log ) &
done
wait
echo "== wspcheck"; tail -n 3 $R/wspcheck.log
for S in T1 T1x T2; do echo "== $S"; tail -n 2 $R/stage2_$S.log; done
