#!/bin/bash
# Removed-document dry run (protocol addendum 4 item 14), inside graphtest:1, TUNE only.
# Every arm on tmp/lock/dry_tasks.jsonl (40 TUNE T1 tasks, ARCHITECTURE.md removed) with the
# configurations it will be frozen with. Answers go to tmp/lock/dry/ and are thrown away afterwards.
set -u
git config --global --add safe.directory /repo
export GT_BUILD=/build GT_REPO=/repo GT_STORE=/store GT_SRCSTORE=/store/src GT_TMP=/tmp/gt
# a removed document gives a new canonical graph, whose community prior the ladybug store build would
# write into arms/ladybug/priors/; keep this dry run's priors on the volume instead
export LB_PRIORS_DIR=/store/lbpriors
mkdir -p /tmp/gt /store/lbpriors
cd /build
T=/build/tmp/lock/dry_tasks.jsonl; D=/build/tmp/lock/dry
rm -rf $D; mkdir -p $D
s=$(date +%s)
echo "== typed arms + reference, primary 95e990307da3b42b"
node arms/common/sweep.js --arms relational,reference,ladybug,duckpgq --list relational --stage 2 --only "s2: hops=null rank=degnorm" --sets T1 --tasks-jsonl $T --out $D/primary 2> $D/primary.err; echo "exit $?"
echo "== typed arms + reference, S1 6b70cc1222745385"
node arms/common/sweep.js --arms relational,reference,ladybug,duckpgq --list relational --stage 1 --only "hops=4" --sets T1 --tasks-jsonl $T --out $D/s1 2> $D/s1.err; echo "exit $?"
echo "== single arms"
for AC in ladybug:f233ae069bdba0ce search:e70177e5807f0252 search:950c029615d337c1 floor-dir:714a474060653c1f floor-co:c4d2f0a60a3d199c; do
  A=${AC%%:*}; C=${AC##*:}
  node arms/common/run.js run --arm $A --config $C --sets T1 --split tune --tasks-jsonl $T --out $D/single; echo "exit $? $A $C"
done
echo "== search index probe"
node tmp/lock/search_probe.js; echo "exit $?"
echo "wall $(( $(date +%s) - s )) s"
ls /store/lbpriors | wc -l
