#!/bin/bash
# Re-audit 2, checks 4 and 8 (inside graphtest:1, TUNE only, /build/sealed hidden by a tmpfs, fresh
# volume gt-preflight2 mounted at /store). Order on ONE source store, on purpose:
#   1. removed-document variants (r2/removed/variants.jsonl) for all 13 frozen (arm, configuration);
#   2. the search text probe on the same variants;
#   3. heal: the same 15 task ids WITHOUT removal (a source tree first written by a removal load must
#      still give the stored answer: the D-SRC fix of pre-flight round 1);
#   4. regression: 30 seeded TUNE T1 tasks (r2/regress/ids.txt, seed 777) for all 13 pairs;
#   5. the 20 TUNE questions for the four question arms.
# Ladybug reads a COPY of arms/ladybug/priors on the volume (new canonical graphs add files there only).
set -u
git config --global --add safe.directory /repo
export GT_BUILD=/build GT_REPO=/repo GT_STORE=/store GT_SRCSTORE=/store/src GT_TMP=/tmp/gt
export LB_PRIORS_DIR=/store/lbpriors
rm -rf /store/* ; mkdir -p /tmp/gt $LB_PRIORS_DIR
cp /build/arms/ladybug/priors/*.json $LB_PRIORS_DIR/
echo "priors copied: $(ls $LB_PRIORS_DIR | wc -l); sealed visible: $(ls -A /build/sealed | wc -l) entries; arms priors: $(ls /build/arms/ladybug/priors | wc -l)"
cd /build
R=/build/audit/preflight/r2
PAIRS="relational:95e990307da3b42b reference:95e990307da3b42b ladybug:95e990307da3b42b duckpgq:95e990307da3b42b relational:6b70cc1222745385 reference:6b70cc1222745385 ladybug:6b70cc1222745385 duckpgq:6b70cc1222745385 ladybug:f233ae069bdba0ce search:e70177e5807f0252 search:950c029615d337c1 floor-dir:714a474060653c1f floor-co:c4d2f0a60a3d199c"
step() { # $1 label, $2 out dir, rest: extra args
  local L=$1 D=$2; shift 2
  rm -rf $D; mkdir -p $D
  for AC in $PAIRS; do
    A=${AC%%:*}; C=${AC##*:}; s=$(date +%s)
    node arms/common/run.js run --arm $A --config $C --split tune "$@" --out $D/${A}_${C} 2>&1 | tail -1
    echo "$L exit ${PIPESTATUS[0]} $A $C $(( $(date +%s) - s ))s"
  done
}
step removed $R/removed/ans --sets T1,T2 --tasks-jsonl $R/removed/variants.jsonl
node $R/../probe_search.js $R/removed/variants.jsonl $R/removed/search_probe.json; echo "probe exit $?"
echo "priors after removal: $(ls $LB_PRIORS_DIR | wc -l)"
step heal $R/heal/ans --sets T1,T2 --tasks $(tr '\n' ',' < $R/heal/ids.txt | sed 's/,$//')
step regress $R/regress/ans --sets T1 --tasks $(tr '\n' ',' < $R/regress/ids.txt | sed 's/,$//')
rm -rf $R/regress/tq; mkdir -p $R/regress/tq
for A in relational ladybug duckpgq search; do
  s=$(date +%s)
  node arms/common/run.js tq --arm $A --split tune --out $R/regress/tq 2>&1 | tail -1
  echo "tq exit ${PIPESTATUS[0]} $A $(( $(date +%s) - s ))s"
done
echo "priors at end: $(ls $LB_PRIORS_DIR | wc -l); arms priors: $(ls /build/arms/ladybug/priors | wc -l)"
