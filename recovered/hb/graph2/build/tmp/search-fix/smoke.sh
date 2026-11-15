#!/bin/bash
# Smoke test of the search fix inside graphtest:1 (20 TUNE tasks, never held-out). No scoring.
set -u
git config --global --add safe.directory /repo
export GT_BUILD=/build GT_REPO=/repo GT_STORE=/store GT_SRCSTORE=/store/srcstore GT_TMP=/tmp/gt
export GT_RESULTS=/build/tmp/search-fix/smoke
mkdir -p $GT_TMP $GT_RESULTS
TASKS=T1-0332,T1-0333,T1-0001,T1-0002,T1-0003,T1-0040,T1-0041,T1-0042,T1-0092,T1-0093,T1-0144,T1-0145,T1-0146,T1-0364,T1-0365,T1-0366,T2-0078,T2-0080,T2-0222,T2-0227
C=/build/arms/common; X=/build/tmp/search-fix
# another lane may swap facts/cache: retry a step when a folder is briefly missing
retry() { for i in 1 2 3 4; do "$@" && return 0; echo "-- attempt $i failed, retrying in 30 s"; sleep 30; done; return 1; }
echo "== versions"; node --version; git --version
echo "== stage-1 lists"; node -e "const H=require('$C/harness');const L=H.loadArmList('search',1,false);console.log('search',L.list.length,'configurations, list hash',L.hash)"
node -e "for(const f of ['floor-dir','floor-co']){const c=require('/build/arms/'+f+'/configs').CONFIGS;console.log(f,c.length,'configurations')}"
echo "== held-out lock (all must be REFUSED)"
node $C/run.js run --arm search --config base --split heldout
node $C/run.js run --arm search --config base --split heldout --allow-heldout --frozen-hash 0000000000000000
node $C/run.js run --arm floor-dir --config /build/arms/floor-dir/configs/gran_file_form_signature.json --split heldout --allow-heldout --frozen-hash 0000000000000000
node $C/run.js tq --arm search --split heldout
echo "== wrong pad refused by a floor"; echo '{"granularity":"file","form":"signature","pad":"CO"}' > /tmp/wrongpad.json
node $C/run.js run --arm floor-dir --config /tmp/wrongpad.json --sets T1 --limit 1 --out /tmp/wp 2>&1 | tail -1
echo "== sweep: search stage-1 list (40 configurations) x 20 tasks"; time retry node $C/sweep.js --arms search --tasks $TASKS --out $GT_RESULTS
echo "== per-configuration description (no scores)"; node $X/summarize.js $GT_RESULTS
echo "== floors equal arm none with the same pad; search deterministic and granularity/form/pad-independent"; time retry node $X/floor_check.js --tasks $TASKS
echo "== floors through run.js (file signature form, T1+T2, first 20 tasks)"
retry node $C/run.js run --arm floor-dir --config /build/arms/floor-dir/configs/gran_file_form_signature.json --sets T1,T2 --limit 20 --out $GT_RESULTS
retry node $C/run.js run --arm floor-co --config /build/arms/floor-co/configs/gran_file_form_signature.json --sets T1,T2 --limit 20 --out $GT_RESULTS
echo "== search base through run.js twice (determinism of whole answer files)"
retry node $C/run.js run --arm search --config base --sets T1,T2 --limit 20 --out /tmp/runA
retry node $C/run.js run --arm search --config base --sets T1,T2 --limit 20 --out /tmp/runB
node -e "
const H=require('$C/harness');const fs=require('fs');let n=0,d=0;
for(const f of fs.readdirSync('/tmp/runA/search/tune')){const a=H.readGzJsonl('/tmp/runA/search/tune/'+f),b=H.readGzJsonl('/tmp/runB/search/tune/'+f);
for(let i=0;i<a.length;i++){n++;const s=(x)=>JSON.stringify({...x,ms:0,engine_ms:0});if(s(a[i])!==s(b[i]))d++;}}
console.log('answers compared',n,'differing',d);"
echo "== TQ answers (tune, frozen commit)"; time retry node $C/run.js tq --arm search --split tune --out $GT_RESULTS
node -e "const r=require('fs').readFileSync('$GT_RESULTS/tq/search.tune.answers.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse);const s=(k)=>r.map(x=>x[k]).sort((a,b)=>a-b);console.log('questions',r.length,'errors',r.filter(x=>x.error).length,'lookups p50',s('lookups')[10],'max',Math.max(...s('lookups')),'tokens p50',s('tokens')[10],'max',Math.max(...s('tokens')))"
echo "== result sizes"; du -sh $GT_RESULTS/search $GT_RESULTS/floor-dir $GT_RESULTS/floor-co /store 2>/dev/null
