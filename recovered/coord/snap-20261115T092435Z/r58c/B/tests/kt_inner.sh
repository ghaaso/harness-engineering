#!/bin/sh
# In-container runner of agent B's tests (round r58c; see r58c/B/ktest.sh). Logs: $BOUT/logs/<test>.log, each opening
# with the sha256 of the test file it runs; summary in $BOUT/logs/summary-$KNAME.txt.
# usage: sh kt_inner.sh test_a test_b ...
cd /w/train
LOGS=$BOUT/logs; S=$LOGS/summary-$KNAME.txt; mkdir -p $LOGS
: > $S; bad=0
for t in "$@"; do
  case $t in
    test_rerun_check|test_write_result_v|test_b_units|test_write_audit_claims|test_item27_trc|test_wr_refuses_test_return|test_mounts_vs_leak_audit|test_tune_harness|test_e5_route_audit|test_sr6_guard)
      f=/w/r58c/B/tests/$t.py ;;
    test_assemble_checks)
      f=/w/parallel/tests/test_assemble_checks.sh ;;
    test_select_report)
      f=/w/fixes/tests/test_select_report.py ;;
    test_selection_freeze8|test_r64)
      f=/w/r58c/tests/$t.py ;;
    *)
      f=/w/train/r58/tests/$t.py ;;
  esac
  (echo "sha256 $(sha256sum $f | cut -d' ' -f1) ${f#/w/}"
   case $t in
     test_assemble_checks) PY=python ACT=$BOUT/ac timeout 300 sh $f /w ;;
     test_select_report) OUT=$BOUT/selrep CODE=r58 timeout 560 python $f ;;
     *) EOR_PASS_ROOT=/w/r58c/B/eor/c R58_OUT=$BOUT/$t R58_LOGS=$LOGS timeout 560 python $f ;;
   esac) > $LOGS/$t.log 2>&1
  rc=$?
  echo "$t rc=$rc $(grep -E '^RESULT' $LOGS/$t.log | tail -1 | cut -c1-120)" >> $S
  [ $rc = 0 ] && grep -q "^RESULT PASS" $LOGS/$t.log || bad=1
done
# ruling 93 withdrew ruling 92: scratch output is kept by default; DROP_OUT=1 deletes it once every test has run
# (test_write_audit_claims reads test_write_result's output, so nothing goes before the end); logs are always kept
if [ "${DROP_OUT:-0}" = 1 ]; then for t in "$@"; do rm -rf "$BOUT/$t"; done; rm -rf "$BOUT/selrep" "$BOUT/ac"; echo "scratch output deleted (logs kept)" >> $S; fi
echo done >> $S
cat $S
exit $bad  # change 9: non-zero when any test failed (r58c/B/ktest.sh exits with the container's code)
