#!/bin/sh
# In-container runner of agent A's tests (ktest-a<N>; see ktest.sh). Logs: /w/r58c/A/logs/<name>.log.
cd /w/train
LOGS=/w/r58c/A/logs; S=$LOGS/summary-$KNAME.txt
: > $S
for t in $TESTS; do
  case $t in
    script:*)
      p=/w/${t#script:}; n=$(basename $p .py)
      (echo "sha256 $(sha256sum $p | cut -d' ' -f1) ${t#script:}"; timeout 560 python $p) > $LOGS/$n.log 2>&1; t=$n ;;
    *)
      timeout 560 python /w/train/r58/tests/$t.py > $LOGS/$t.log 2>&1 ;;
  esac
  rc=$?
  echo "$t rc=$rc $(grep -E '^RESULT' $LOGS/$t.log | tail -1 | cut -c1-90)" >> $S
done
echo done >> $S
