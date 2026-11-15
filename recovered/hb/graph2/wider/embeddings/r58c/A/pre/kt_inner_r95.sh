#!/bin/sh
# In-container runner of agent A's tests (ktest-a<N>; see ktest.sh). Logs: /w/r58c/A/logs/<name>.log.
# An item "script:<path under /w>" runs that python script; "script:<path>@<arg>" passes one argument (its log is then
# <name>-<arg>.log). Per-item timeout ITEM_TIMEOUT seconds (default 560). The exit code is the first non-zero item rc
# (0 when every item passed), so ktest.sh can exit with the container's code (end-order-changes-2 item 9).
cd /w/train
LOGS=/w/r58c/A/logs; S=$LOGS/summary-$KNAME.txt; TO=${ITEM_TIMEOUT:-560}
: > $S
worst=0
for t in $TESTS; do
  case $t in
    script:*)
      spec=${t#script:}; p=/w/${spec%%@*}; arg=; n=$(basename $p .py)
      case $spec in *@*) arg=${spec#*@}; n=$n-$arg ;; esac
      (echo "sha256 $(sha256sum $p | cut -d' ' -f1) ${spec%%@*}"; timeout $TO python $p $arg) > $LOGS/$n.log 2>&1; t=$n ;;
    *)
      timeout $TO python /w/train/r58/tests/$t.py > $LOGS/$t.log 2>&1 ;;
  esac
  rc=$?
  [ $worst = 0 ] && [ $rc != 0 ] && worst=$rc
  echo "$t rc=$rc $(grep -E '^RESULT' $LOGS/$t.log | tail -1 | cut -c1-90)" >> $S
done
echo "done rc=$worst" >> $S
exit $worst
