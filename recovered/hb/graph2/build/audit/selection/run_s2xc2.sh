#!/bin/bash
# Audit-selection lane, check 4 (second form): like run_s2xc.sh, but scratch exports on the container
# filesystem and one source store per arm, so two containers never share a scratch folder.
#   bash run_s2xc2.sh <arm>
ARM=$1
export GT_BUILD=/build GT_REPO=/repo GT_STORE=/store/s2xc GT_SRCSTORE=/store/src-$ARM GT_TMP=/tmp/gt
mkdir -p $GT_STORE $GT_SRCSTORE $GT_TMP /build/tmp/audit-selection/s2xc
OUT=/build/tmp/audit-selection/s2xc/$ARM
rm -rf $OUT
cd /build
S=$(date +%s)
node arms/common/sweep.js --arms $ARM,reference --list $ARM --stage 2 --sets T1,T1x,T2 \
  --tasks-file /build/tmp/audit-selection/s2tasks_$ARM.txt --out $OUT > $OUT.log 2>&1
echo "exit $? wall $(( $(date +%s) - S )) s" >> $OUT.log
tail -3 $OUT.log
