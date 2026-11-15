#!/bin/bash
# Cross-checks of the LadybugDB arm (inside graphtest:1, via dk.sh). Stores: /store/ladybug.
#   bash arms/ladybug/dk.sh "bash /build/arms/ladybug/run_checks.sh"
set -e
cd /build
X=/build/results/ladybug/xcheck
L=/build/results/ladybug/logs
mkdir -p $X $L
( time node arms/common/sweep.js --arms reference,ladybug --list relational --stage 1 --sets T1,T2 --out $X ) > $L/xcheck_relational.log 2>&1
( time node arms/ladybug/xrandom.js --pairs 300 --focus-pairs 100 --seed 20261114 --out $X ) > $L/xcheck_random.log 2>&1
( time LB_PREPARE=0 node arms/ladybug/wspcheck.js --tasks-per-parent 2 --out $X/wspcheck.json ) > $L/wspcheck.log 2>&1
( time node arms/ladybug/commcheck.js --sets T1,T1x,T2 --root /tmp/commcheck --out $X/commcheck.json ) > $L/commcheck.log 2>&1
echo done
