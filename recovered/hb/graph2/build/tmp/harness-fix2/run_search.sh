#!/bin/bash
# Harness-fix2 lane, part B, inside graphtest:1: the search stage-1 list per set, the two floors
# through sweep.js (their fixed lists of 8) on the same sets, and the TQ answers of relational and
# search on the 20 TUNE questions. TUNE only. Stores and source stores on the named volume.
set -u
git config --global --add safe.directory /repo
export GT_BUILD=/build GT_REPO=/repo GT_TMP=/tmp/gt
mkdir -p /tmp/gt
C=/build/arms/common; R=/build/tmp/harness-fix2
echo "== held-out lock (each must be REFUSED)"
node $C/run.js run --arm search --config base --split heldout
node $C/run.js run --arm floor-dir --config "gran=file form=signature" --split heldout --allow-heldout --frozen-hash 0000000000000000
node $C/run.js tq --arm search --split heldout
for S in T1 T1x T2; do
  mkdir -p /store/S_$S $R/out_search_$S
  ( export GT_STORE=/store/S_$S GT_SRCSTORE=/store/S_$S/src
    s=$(date +%s)
    node $C/sweep.js --arms search --stage 1 --sets $S --out $R/out_search_$S > $R/search_$S.log 2>&1
    echo "exit $? set $S wall $(( $(date +%s) - s )) s" >> $R/search_$S.log ) &
done
mkdir -p /store/F
( export GT_STORE=/store/F GT_SRCSTORE=/store/F/src
  for S in T1 T1x T2; do
    mkdir -p $R/out_floors_$S
    s=$(date +%s)
    node $C/sweep.js --arms floor-dir,floor-co --stage 1 --sets $S --out $R/out_floors_$S > $R/floors_$S.log 2>&1
    echo "exit $? set $S wall $(( $(date +%s) - s )) s" >> $R/floors_$S.log
  done ) &
mkdir -p /store/TQ $R/out_tq
( export GT_STORE=/store/TQ GT_SRCSTORE=/store/TQ/src
  for A in relational search; do s=$(date +%s); node $C/run.js tq --arm $A --split tune --out $R/out_tq; echo "exit $? tq $A wall $(( $(date +%s) - s )) s"; done > $R/tq.log 2>&1 ) &
( export GT_STORE=/store/R GT_SRCSTORE=/store/R/src
  s=$(date +%s)
  node $C/crosscheck_random.js --pairs 500 --seed 20261113 --focus --out $R/out_random > $R/random_focus.log 2>&1
  echo "exit $? random focus wall $(( $(date +%s) - s )) s" >> $R/random_focus.log ) &
wait
echo "== random focus"; tail -n 2 $R/random_focus.log
for S in T1 T1x T2; do echo "== search $S"; tail -n 2 $R/search_$S.log; echo "== floors $S"; tail -n 2 $R/floors_$S.log; done
echo "== tq"; cat $R/tq.log
