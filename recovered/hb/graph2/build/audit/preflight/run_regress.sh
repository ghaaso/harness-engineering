#!/bin/bash
# Preflight check 8 (inside graphtest:1, TUNE only, /build/sealed hidden by a tmpfs).
# 30 TUNE T1 tasks (audit/preflight/regress/ids.txt, seed 4242) through run.js run for every frozen
# (arm, configuration), and the 20 TUNE questions through run.js tq for the four question arms.
# Answers go to audit/preflight/regress/. Ladybug reads a COPY of arms/ladybug/priors on the volume.
set -u
git config --global --add safe.directory /repo
export GT_BUILD=/build GT_REPO=/repo GT_STORE=/store GT_SRCSTORE=/store/src GT_TMP=/tmp/gt
export LB_PRIORS_DIR=/store/lbpriors_regress
rm -rf $LB_PRIORS_DIR; mkdir -p /tmp/gt $LB_PRIORS_DIR
cp /build/arms/ladybug/priors/*.json $LB_PRIORS_DIR/
echo "priors copied: $(ls $LB_PRIORS_DIR | wc -l); sealed visible: $(ls /build/sealed | wc -l)"
cd /build
D=/build/audit/preflight/regress; IDS=$(tr '\n' ',' < $D/ids.txt | sed 's/,$//')
rm -rf $D/ans $D/tq; mkdir -p $D/ans $D/tq
for AC in relational:95e990307da3b42b reference:95e990307da3b42b ladybug:95e990307da3b42b duckpgq:95e990307da3b42b \
          relational:6b70cc1222745385 reference:6b70cc1222745385 ladybug:6b70cc1222745385 duckpgq:6b70cc1222745385 \
          ladybug:f233ae069bdba0ce search:e70177e5807f0252 search:950c029615d337c1 floor-dir:714a474060653c1f floor-co:c4d2f0a60a3d199c; do
  A=${AC%%:*}; C=${AC##*:}; s=$(date +%s)
  node arms/common/run.js run --arm $A --config $C --sets T1 --split tune --tasks $IDS --out $D/ans/${A}_${C} 2>&1 | tail -1
  echo "exit ${PIPESTATUS[0]} $A $C $(( $(date +%s) - s ))s"
done
for A in relational ladybug duckpgq search; do
  s=$(date +%s)
  node arms/common/run.js tq --arm $A --split tune --out $D/tq 2>&1 | tail -1
  echo "tq exit ${PIPESTATUS[0]} $A $(( $(date +%s) - s ))s"
done
echo "priors after: $(ls $LB_PRIORS_DIR | wc -l)"
