#!/bin/bash
# Preflight check 4, step 2 (inside graphtest:1, TUNE only, /build/sealed hidden by a tmpfs).
# Runs every frozen (arm, configuration) on audit/preflight/removed/variants.jsonl through run.js run
# --tasks-jsonl, writing answers under audit/preflight/removed/ans/. Ladybug priors go to the volume.
set -u
git config --global --add safe.directory /repo
export GT_BUILD=/build GT_REPO=/repo GT_STORE=/store GT_SRCSTORE=/store/src GT_TMP=/tmp/gt
export LB_PRIORS_DIR=/store/lbpriors
mkdir -p /tmp/gt /store/lbpriors
cd /build
V=/build/audit/preflight/removed/variants.jsonl; D=/build/audit/preflight/removed/ans
rm -rf $D; mkdir -p $D
echo "sealed visible: $(ls /build/sealed | wc -l) entries"
for AC in relational:95e990307da3b42b reference:95e990307da3b42b ladybug:95e990307da3b42b duckpgq:95e990307da3b42b \
          relational:6b70cc1222745385 reference:6b70cc1222745385 ladybug:6b70cc1222745385 duckpgq:6b70cc1222745385 \
          ladybug:f233ae069bdba0ce search:e70177e5807f0252 search:950c029615d337c1 floor-dir:714a474060653c1f floor-co:c4d2f0a60a3d199c; do
  A=${AC%%:*}; C=${AC##*:}
  s=$(date +%s)
  node arms/common/run.js run --arm $A --config $C --sets T1,T2 --split tune --tasks-jsonl $V --out $D/${A}_${C} 2>&1 | tail -2
  echo "exit ${PIPESTATUS[0]} $A $C $(( $(date +%s) - s ))s"
done
node audit/preflight/probe_search.js /build/audit/preflight/removed/variants.jsonl /build/audit/preflight/removed/search_probe.json
echo "probe exit $?"
ls /store/lbpriors | wc -l
