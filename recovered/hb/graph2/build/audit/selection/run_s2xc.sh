#!/bin/bash
# Audit-selection lane, check 4: stage-2 lists of one arm against the reference arm on 100 seeded
# random TUNE tasks (inside graphtest:1). Stores and the source store live on the lane's own volume.
#   bash run_s2xc.sh <arm>
ARM=$1
export GT_BUILD=/build GT_REPO=/repo GT_STORE=/store/s2xc GT_SRCSTORE=/store/src GT_TMP=/build/tmp/audit-selection/gt_tmp
mkdir -p $GT_STORE $GT_SRCSTORE $GT_TMP /build/tmp/audit-selection/s2xc
OUT=/build/tmp/audit-selection/s2xc/$ARM
cd /build
S=$(date +%s)
node arms/common/sweep.js --arms $ARM,reference --list $ARM --stage 2 --sets T1,T1x,T2 \
  --tasks-file /build/tmp/audit-selection/s2tasks_$ARM.txt --out $OUT > $OUT.log 2>&1
echo "exit $? wall $(( $(date +%s) - S )) s" >> $OUT.log
tail -3 $OUT.log
