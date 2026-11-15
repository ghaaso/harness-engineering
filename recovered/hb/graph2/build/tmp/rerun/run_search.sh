#!/bin/bash
# Re-run lane: search stage-1 lists, the two floors (8 configurations each), and TQ answers on TUNE
# for relational and search, inside graphtest:1. Stores and source stores on the named volume.
set -u
git config --global --add safe.directory /repo
export GT_BUILD=/build GT_REPO=/repo GT_TMP=/tmp/gt
mkdir -p /tmp/gt
C=/build/arms/common; R=/build/tmp/rerun
echo "== held-out lock (each must be REFUSED)"
node $C/run.js run --arm search --config base --split heldout
node $C/run.js run --arm floor-dir --config /build/arms/floor-dir/configs/gran_file_form_signature.json --split heldout --allow-heldout --frozen-hash 0000000000000000
node $C/run.js tq --arm search --split heldout
rm -rf /store/S_T1 /store/S_T1x /store/S_T2 /store/F /store/TQ
for S in T1 T1x T2; do
  mkdir -p /store/S_$S $R/out_search_$S
  ( export GT_STORE=/store/S_$S GT_SRCSTORE=/store/S_$S/src
    s=$(date +%s)
    node $C/sweep.js --arms search --stage 1 --sets $S --out $R/out_search_$S > $R/search_$S.log 2>&1
    echo "exit $? set $S wall $(( $(date +%s) - s )) s" >> $R/search_$S.log ) &
done
# floors: 8 configurations each, all three sets in one run per configuration
mkdir -p /store/F $R/out_floors
( export GT_STORE=/store/F GT_SRCSTORE=/store/F/src
  s=$(date +%s)
  for A in floor-dir floor-co; do for f in /build/arms/$A/configs/*.json; do
    node $C/run.js run --arm $A --config $f --sets T1,T1x,T2 --split tune --out $R/out_floors || echo "FAIL $A $f"
  done; done > $R/floors.log 2>&1
  echo "exit set floors wall $(( $(date +%s) - s )) s" >> $R/floors.log ) &
# TQ on the 20 tune questions (frozen commit)
mkdir -p /store/TQ $R/out_tq
( export GT_STORE=/store/TQ GT_SRCSTORE=/store/TQ/src GT_RESULTS=$R/out_tq
  for A in relational search; do s=$(date +%s); node $C/run.js tq --arm $A --split tune --out $R/out_tq; echo "exit $? tq $A wall $(( $(date +%s) - s )) s"; done > $R/tq.log 2>&1 ) &
wait
for S in T1 T1x T2; do echo "== search $S"; tail -3 $R/search_$S.log; done
echo "== floors"; tail -3 $R/floors.log; grep -c '"tasks"' $R/floors.log
echo "== tq"; cat $R/tq.log
