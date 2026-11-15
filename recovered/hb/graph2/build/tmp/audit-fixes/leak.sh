#!/bin/bash
# Check 6, inside graphtest:1, with /build/sealed hidden behind an empty tmpfs: relational, search,
# ladybug and duckpgq each run their own 40-entry stage-1 list on the same 30 TUNE tasks (6 parents)
# with every fs access, child process, SQLite / Ladybug / DuckDB open and quoted SQL file path logged.
# Stores, source store, git exports and results stay off the arms/ and results/ folders.
set -u
git config --global --add safe.directory /repo
export GT_BUILD=/build GT_REPO=/repo GT_TMP=/tmp/gt GT_SRCSTORE=/store/leak/src GT_RESULTS=/tmp/res
O=/build/tmp/audit-fixes/leak
rm -rf $O /store/leak; mkdir -p $O /tmp/gt /tmp/res /store/leak/src
echo "sealed visible entries: $(ls -A /build/sealed | wc -l)"
TASKS=$(cat /build/tmp/audit-fixes/leak_tasks.txt)
for A in relational search ladybug duckpgq; do
  export GT_STORE=/store/leak/$A
  mkdir -p $GT_STORE
  s=$(date +%s)
  ACCESS_LOG=$O/$A.log NODE_OPTIONS="--require /build/audit/fixes/accesslog2.js" \
    node /build/arms/common/sweep.js --arms $A --stage 1 --sets T1,T2 --tasks "$TASKS" --out /tmp/res/$A > $O/$A.out 2>&1
  echo "$A exit $? wall $(( $(date +%s) - s )) s :: $(tail -1 $O/$A.out | cut -c1-300)"
done
du -sh /store/leak/* 2>/dev/null
mkdir -p $O/res && cp -r /tmp/res/* $O/res/
rm -rf /store/leak
