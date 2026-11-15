#!/bin/bash
# Harness-fix2 lane, part A, inside graphtest:1: self-test, held-out lock attempts, the strict random
# cross-check (500 pairs), then the relational stage-1 list run by relational and reference with the
# strict cross-check, one process per set. TUNE only. Stores and source stores on the named volume.
set -u
git config --global --add safe.directory /repo
export GT_BUILD=/build GT_REPO=/repo GT_TMP=/tmp/gt
mkdir -p /tmp/gt
C=/build/arms/common; R=/build/tmp/harness-fix2
echo "== versions"; node --version; node -e "const {DatabaseSync}=require('node:sqlite');console.log('sqlite',new DatabaseSync(':memory:').prepare('select sqlite_version() v').get().v)"
echo "== selftest"; node $C/selftest.js > $R/selftest.log 2>&1; echo "exit $?"; tail -1 $R/selftest.log
echo "== held-out lock (each must be REFUSED)"
node $C/run.js run --arm relational --config base --split heldout
node $C/run.js run --arm reference --config base --split heldout --allow-heldout --frozen-hash 0000000000000000
node $C/run.js run --arm floor-co --config "gran=file form=signature" --split heldout --allow-heldout --frozen-hash 0000000000000000
mkdir -p /store/R $R/out_random
( export GT_STORE=/store/R GT_SRCSTORE=/store/R/src
  s=$(date +%s)
  node $C/crosscheck_random.js --pairs 500 --seed 20261112 --out $R/out_random > $R/random.log 2>&1
  echo "exit $? random wall $(( $(date +%s) - s )) s" >> $R/random.log ) &
for S in T1 T1x T2; do
  mkdir -p /store/$S $R/out_relref_$S
  ( export GT_STORE=/store/$S GT_SRCSTORE=/store/$S/src
    s=$(date +%s)
    node $C/sweep.js --arms relational,reference --list relational --stage 1 --sets $S --out $R/out_relref_$S > $R/relref_$S.log 2>&1
    echo "exit $? set $S wall $(( $(date +%s) - s )) s" >> $R/relref_$S.log ) &
done
wait
echo "== random"; tail -n 2 $R/random.log
for S in T1 T1x T2; do echo "== $S"; tail -n 2 $R/relref_$S.log; done
echo "== store sizes"; du -sh /store/* 2>/dev/null
