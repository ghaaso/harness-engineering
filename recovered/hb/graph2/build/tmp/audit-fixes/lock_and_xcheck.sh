#!/bin/bash
# Audit of the fixes, inside graphtest:1: (5) held-out lock for every arm, (7) relational vs reference
# strict cross-check on 500 random (configuration, task) pairs. Stores and source store on /store.
set -u
git config --global --add safe.directory /repo
export GT_BUILD=/build GT_REPO=/repo GT_TMP=/tmp/gt GT_STORE=/store GT_SRCSTORE=/store/src
mkdir -p /tmp/gt /store/src
C=/build/arms/common; O=/build/tmp/audit-fixes
echo "== versions"; node --version
echo "== held-out lock: every attempt must exit non-zero with REFUSED"
FD=/build/arms/floor-dir/configs; FC=/build/arms/floor-co/configs
cfgof() { case $1 in none|floor-dir) ls $FD/*.json | head -1;; floor-co) ls $FC/*.json | head -1;; *) node -e "console.log(require('/build/arms/$1/sweep.js').STAGE1[0].name)";; esac; }
hashof() { node -e "const C=require('$C/config');const fs=require('fs');const a='$1',c='$2';let cfg;if(fs.existsSync(c))cfg=JSON.parse(fs.readFileSync(c,'utf8'));else cfg=require('/build/arms/'+a+'/sweep.js').STAGE1.find(x=>x.name===c);console.log(C.configHash(cfg))"; }
try() { local label="$1"; shift; out=$("$@" 2>&1); code=$?; if [ $code -ne 0 ] && echo "$out" | grep -q REFUSED; then echo "REFUSED_OK $label :: $(echo "$out" | grep -m1 REFUSED | cut -c1-150)"; else echo "NOT_REFUSED $label exit=$code :: $(echo "$out" | tail -2 | tr '\n' ' ' | cut -c1-300)"; fi; }
for A in relational reference search ladybug duckpgq none floor-dir floor-co; do
  CF=$(cfgof $A); H=$(hashof $A "$CF")
  try "$A no-flags" node $C/run.js run --arm $A --config "$CF" --sets T1 --split heldout
  try "$A allow-no-hash" node $C/run.js run --arm $A --config "$CF" --sets T1 --split heldout --allow-heldout
  try "$A wrong-hash" node $C/run.js run --arm $A --config "$CF" --sets T1,T2,T3,T4,T5 --split heldout --allow-heldout --frozen-hash 0000000000000000
  try "$A right-hash-never-frozen" node $C/run.js run --arm $A --config "$CF" --sets T1 --split heldout --allow-heldout --frozen-hash $H
  try "$A tq-heldout" node $C/run.js tq --arm $A --split heldout
  try "$A tq-held_out-allow-not-frozen" node $C/run.js tq --arm $A --split held_out --allow-heldout
done
try "direct loadTasks heldout" node -e "require('$C/harness').loadTasks(['T1','T2','T3','T4','T5'],'heldout')"
try "direct checkSplit forged token" node -e "const H=require('$C/harness');H.loadTasks(['T1'],'heldout',Symbol('heldout-lock'))"
for A in relational ladybug duckpgq; do try "$A diag tq.js held_out" node /build/arms/$A/tq.js --split held_out; done
ls /build/results/frozen 2>/dev/null && echo "WARNING results/frozen exists" || echo "results/frozen absent (nothing frozen)"
echo "== check 7: relational vs reference, 500 random configurations x tasks"
s=$(date +%s)
node /build/audit/fixes/c7_crosscheck.js --n 500 --seed 20261112 --parents 12 --out /build/audit/fixes/c7_crosscheck.json
echo "exit $? wall $(( $(date +%s) - s )) s"
