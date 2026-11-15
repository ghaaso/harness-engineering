#!/bin/bash
# Pre-flight fix round 1, inside graphtest:1, TUNE only, /build/sealed hidden (tmpfs):
#   self-test; the sealed check (positive and negative); the tree-cache test; 30 seeded TUNE T1 tasks
#   (seed 20261115, a fresh draw) for every arm and every configuration of addendum 4 through run.js;
#   the 20 TUNE questions for the four question arms; the seven probe questions; then check.js.
# Fresh volume (gt-preflight1): stores and source trees are rebuilt from the facts and the read-only repo.
# The ladybug arm reads a copy of its community priors (nothing is written into arms/ladybug/priors/).
set -u
git config --global --add safe.directory /repo
export GT_BUILD=/build GT_REPO=/repo GT_STORE=/store GT_SRCSTORE=/store/src GT_TMP=/tmp/gt
rm -rf /store/lbpriors-copy; cp -r /build/arms/ladybug/priors /store/lbpriors-copy
export LB_PRIORS_DIR=/store/lbpriors-copy
mkdir -p /tmp/gt
cd /build
H=/build/tmp/lock/preflight1
echo "== sealed listing in this container: $(ls -A /build/sealed | wc -l) entries"
echo "== selftest"; node arms/common/selftest.js > $H/selftest.log 2>&1; echo "selftest exit $?"; tail -3 $H/selftest.log
echo "== sealed check: a run with a visible sealed folder must be refused"
mkdir -p /tmp/fakebuild && rm -rf /tmp/fakebuild/* && mkdir -p /tmp/fakebuild/sealed && touch /tmp/fakebuild/sealed/x
ln -s /build/arms /tmp/fakebuild/arms; ln -s /build/tasks /tmp/fakebuild/tasks
GT_BUILD=/tmp/fakebuild GT_FACTS_CACHE=/build/facts/cache GT_RESULTS=/tmp/fakebuild/results node /build/arms/common/run.js tq --arm relational --split tune --out /tmp/fakebuild/out; echo "visible-sealed exit $? (2 expected)"
rm -f /tmp/fakebuild/sealed/x
GT_BUILD=/tmp/fakebuild GT_FACTS_CACHE=/build/facts/cache GT_RESULTS=/tmp/fakebuild/results node /build/arms/common/run.js tq --arm relational --split tune --out /tmp/fakebuild/out > /dev/null; echo "empty-sealed exit $? (0 expected)"
rm -rf /tmp/fakebuild
echo "== tree test"; node $H/tree_test.js > $H/tree_test.log 2>&1; echo "tree test exit $?"
D=$H/regress; rm -rf $D; mkdir -p $D
node -e "
const fs=require('fs');function m(s){return()=>{s|=0;s=(s+0x6d2b79f5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
const t=fs.readFileSync('tasks/tasks.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse).filter(x=>x.set==='T1'&&x.split==='tune'&&x.seed&&x.seed.path).map(x=>x.id).sort();
const r=m(20261115);for(let i=t.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[t[i],t[j]]=[t[j],t[i]];}
fs.writeFileSync('$D/ids.txt',t.slice(0,30).join('\n')+'\n');console.log('ids',t.slice(0,30).length);"
n0=$(ls /store/lbpriors-copy | wc -l)
s=$(date +%s)
for AC in relational:95e990307da3b42b relational:6b70cc1222745385 reference:95e990307da3b42b reference:6b70cc1222745385 \
          ladybug:95e990307da3b42b ladybug:6b70cc1222745385 ladybug:f233ae069bdba0ce duckpgq:95e990307da3b42b duckpgq:6b70cc1222745385 \
          search:e70177e5807f0252 search:950c029615d337c1 floor-dir:714a474060653c1f floor-co:c4d2f0a60a3d199c; do
  A=${AC%%:*}; C=${AC##*:}
  node arms/common/run.js run --arm $A --config $C --sets T1 --split tune --tasks-file $D/ids.txt --out $D; echo "exit $? $A $C"
done
echo "T1 wall $(( $(date +%s) - s )) s"
rm -rf $H/tq; mkdir -p $H/tq
for A in relational ladybug duckpgq search; do node arms/common/run.js tq --arm $A --split tune --out $H/tq; echo "tq exit $? $A"; done
echo "== probe"; node $H/probe.js > $H/probe.log 2>&1; echo "probe exit $?"; tail -9 $H/probe.log
echo "priors files before $n0 after $(ls /store/lbpriors-copy | wc -l)"
node $H/check.js; echo "check exit $?"
