#!/bin/sh
# In-container runner of the follow-up's plumbing tests (ktest-N; see ktest.sh). Logs: /w/r58b/logs/<test>.log.
cd /w/train
LOGS=/w/r58b/logs; S=$LOGS/summary-$KNAME.txt
: > $S
for t in $TESTS; do
  case $t in
    test_assemble_checks)
      (echo "sha256 $(sha256sum /w/parallel/tests/test_assemble_checks.sh | cut -d' ' -f1) parallel/tests/test_assemble_checks.sh"
       PY=python ACT=/w/r58b/ac timeout 300 sh /w/parallel/tests/test_assemble_checks.sh /w) > $LOGS/$t.log 2>&1 ;;
    test_assemble_checks_pre)
      (echo "sha256 $(sha256sum /w/r58b/pre/assemble_checks.py | cut -d' ' -f1) r58b/pre/assemble_checks.py (the pre-evidence-6 bytes)"
       PY=python ACT=/w/r58b/ac_pre AC_PY=/w/r58b/pre/assemble_checks.py timeout 300 sh /w/parallel/tests/test_assemble_checks.sh /w) > $LOGS/$t.log 2>&1 ;;
    test_select_report)
      s=/w/fixes/tests/test_select_report.py
      (echo "sha256 $(sha256sum $s | cut -d' ' -f1) fixes/tests/test_select_report.py"; OUT=/w/r58b/out/selrep CODE=r58 timeout 560 python $s) > $LOGS/$t.log 2>&1 ;;
    *)
      timeout 560 python /w/train/r58/tests/$t.py > $LOGS/$t.log 2>&1 ;;
  esac
  rc=$?
  echo "$t rc=$rc $(grep -E '^RESULT' $LOGS/$t.log | tail -1 | cut -c1-90)" >> $S
done
echo done >> $S
