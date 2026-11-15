#!/bin/bash
# Preflight: source-store poisoning, cause and effect (inside graphtest:1, TUNE only, sealed hidden).
# A) the 5 ladybug f233ae069bdba0ce tasks that differed in the regression, re-run with a FRESH store,
#    source store and prior copy: must equal the stored TUNE answers if the poisoned tree was the cause.
# B) the same tasks with a fresh store, a fresh prior copy, and the POISONED source store of check 4:
#    reproduces the difference without any store left over from earlier runs.
# C) the tree files of the 9 parents: paths in the poisoned tree vs a fresh tree.
set -u
git config --global --add safe.directory /repo
cd /build
D=/build/audit/preflight/poison; rm -rf $D; mkdir -p $D /tmp/gt
IDS=T1-0235,T1-0339,T1-0365,T1-0367,T1-0368
run() { # $1 label, $2 srcstore
  rm -rf /store/p_$1; mkdir -p /store/p_$1/priors
  cp /build/arms/ladybug/priors/*.json /store/p_$1/priors/
  GT_BUILD=/build GT_REPO=/repo GT_STORE=/store/p_$1/st GT_SRCSTORE=$2 GT_TMP=/tmp/gt LB_PRIORS_DIR=/store/p_$1/priors \
    node arms/common/run.js run --arm ladybug --config f233ae069bdba0ce --sets T1 --split tune --tasks $IDS --out $D/$1 | tail -1
  echo "$1 exit $? priors now $(ls /store/p_$1/priors | wc -l)"
}
run fresh /store/p_fresh/src
run poisoned /store/src
node -e "
const fs=require('fs');const out={};
for(const f of fs.readdirSync('/store/p_fresh/src/trees')){const sha=f.replace('.json','');const a=JSON.parse(fs.readFileSync('/store/p_fresh/src/trees/'+f));const pf='/store/src/trees/'+f;if(!fs.existsSync(pf))continue;const b=JSON.parse(fs.readFileSync(pf));
out[sha.slice(0,10)]={fresh_paths:Object.keys(a).length,poisoned_paths:Object.keys(b).length,missing_in_poisoned:Object.keys(a).filter(p=>!(p in b))};}
fs.writeFileSync('$D/trees.json',JSON.stringify(out,null,1));console.log(JSON.stringify(out));"
rm -rf /store/p_fresh /store/p_poisoned
