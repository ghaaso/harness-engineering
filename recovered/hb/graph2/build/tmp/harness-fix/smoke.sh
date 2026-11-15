#!/bin/bash
# Smoke test of the harness fix inside graphtest:1 (20 TUNE tasks, never held-out).
set -u
git config --global --add safe.directory /repo
export GT_BUILD=/build GT_REPO=/repo GT_FACTS_CACHE=/build/tmp/harness-fix/cache-snap
export GT_STORE=/store GT_TMP=/build/tmp/harness-fix GT_RESULTS=/build/tmp/harness-fix/smoke
TASKS=T1-0332,T1-0333,T1-0001,T1-0002,T1-0003,T1-0040,T1-0041,T1-0042,T1-0092,T1-0093,T1-0144,T1-0145,T1-0146,T1-0364,T1-0365,T1-0366,T2-0078,T2-0080,T2-0222,T2-0227
C=/build/arms/common
mkdir -p $GT_RESULTS
echo "== versions"; node --version; node -e "const {DatabaseSync}=require('node:sqlite');console.log('sqlite',new DatabaseSync(':memory:').prepare('select sqlite_version() v').get().v)"
echo "== selftest"; node $C/selftest.js | tail -1
echo "== held-out lock"; node $C/run.js run --arm relational --config base --split heldout; node $C/run.js run --arm reference --config base --split heldout --allow-heldout --frozen-hash 0000000000000000; node -e "require('$C/harness').loadTasks(['T1'],'heldout')" 2>&1 | grep -o 'REFUSED[^)]*)'
echo "== canonical export x2"; node $C/run.js canon --parent c89e021f31492e37d4138364c97133d3c79c2294 --out /tmp/canon1 | grep '"hash"'; node $C/run.js canon --parent c89e021f31492e37d4138364c97133d3c79c2294 --out /tmp/canon2 | grep '"hash"'; cmp /tmp/canon1/edges.csv /tmp/canon2/edges.csv && cmp /tmp/canon1/nodes.csv /tmp/canon2/nodes.csv && echo "byte-identical"; ls /tmp/canon1 | tr '\n' ' '; echo
echo "== sweep (stage-1 list, 40 configurations, relational + reference)"; time node $C/sweep.js --arms relational,reference --tasks $TASKS --out $GT_RESULTS
echo "== extra cross-check"; time node $C/crosscheck_extra.js --tasks $TASKS --out $GT_RESULTS
echo "== floors through the built-in arm none"; echo '{"granularity":"file","form":"signature","pad":"DIR"}' > /tmp/fdir.json; echo '{"granularity":"file","form":"signature","pad":"CO"}' > /tmp/fco.json
node $C/run.js run --arm none --config /tmp/fdir.json --sets T1 --limit 3; node $C/run.js run --arm none --config /tmp/fco.json --sets T1 --limit 3
echo "== TQ answers (tune, frozen commit)"; time node $C/run.js tq --arm relational --split tune
echo "== store sizes"; du -sh /store/* 2>/dev/null
