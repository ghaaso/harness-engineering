#!/bin/bash
# Re-run lane: stage-1 sweep, relational + reference (strict cross-check), TUNE only, inside graphtest:1.
# One process per task set, each with its own store and source store on the named volume (never /build).
set -u
git config --global --add safe.directory /repo
export GT_BUILD=/build GT_REPO=/repo GT_TMP=/tmp/gt
mkdir -p /tmp/gt
C=/build/arms/common; R=/build/tmp/rerun
echo "== versions"; node --version; node -e "const {DatabaseSync}=require('node:sqlite');console.log('sqlite',new DatabaseSync(':memory:').prepare('select sqlite_version() v').get().v)"
echo "== selftest"; node $C/selftest.js | tail -1
echo "== held-out lock (each must be REFUSED)"
node $C/run.js run --arm relational --config base --split heldout
node $C/run.js run --arm reference --config base --split heldout --allow-heldout --frozen-hash 0000000000000000
rm -rf /store/T1 /store/T1x /store/T2
for S in T1 T1x T2; do
  mkdir -p /store/$S $R/out_relref_$S
  ( export GT_STORE=/store/$S GT_SRCSTORE=/store/$S/src
    s=$(date +%s)
    node $C/sweep.js --arms relational,reference --list relational --stage 1 --sets $S --out $R/out_relref_$S > $R/relref_$S.log 2>&1
    echo "exit $? set $S wall $(( $(date +%s) - s )) s" >> $R/relref_$S.log ) &
done
wait
for S in T1 T1x T2; do echo "== $S"; tail -3 $R/relref_$S.log; done
echo "== store sizes"; du -sh /store/* 2>/dev/null
