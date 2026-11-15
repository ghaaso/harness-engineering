#!/bin/bash
# Check 6, one arm again (same setup as leak.sh): bash leak_one.sh <arm>
set -u
A=$1
git config --global --add safe.directory /repo
export GT_BUILD=/build GT_REPO=/repo GT_TMP=/tmp/gt GT_SRCSTORE=/store/leak1/src GT_RESULTS=/tmp/res
O=/build/tmp/audit-fixes/leak
rm -rf /store/leak1 $O/$A.log $O/$A.out $O/res/$A; mkdir -p $O /tmp/gt /tmp/res /store/leak1/src
echo "sealed visible entries: $(ls -A /build/sealed | wc -l)"
TASKS=$(cat /build/tmp/audit-fixes/leak_tasks.txt)
export GT_STORE=/store/leak1/$A; mkdir -p $GT_STORE
s=$(date +%s)
ACCESS_LOG=$O/$A.log NODE_OPTIONS="--require /build/audit/fixes/accesslog2.js" \
  node /build/arms/common/sweep.js --arms $A --stage 1 --sets T1,T2 --tasks "$TASKS" --out /tmp/res/$A > $O/$A.out 2>&1
echo "$A exit $? wall $(( $(date +%s) - s )) s :: $(tail -1 $O/$A.out | cut -c1-300)"
du -sh /store/leak1/* 2>/dev/null
mkdir -p $O/res && cp -r /tmp/res/* $O/res/
rm -rf /store/leak1
