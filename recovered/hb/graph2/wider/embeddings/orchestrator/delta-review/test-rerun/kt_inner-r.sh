#!/bin/sh
# Copy of r58b/kt_inner.sh for the delta review (test-rerun): logs and outputs under /w/rr (the only writable mount).
cd /w/train
LOGS=/w/rr/logs; S=$LOGS/summary-$KNAME.txt
: > $S
for t in $TESTS; do
  st=$(date +%s)
  case $t in
    test_assemble_checks)
      (echo "sha256 $(sha256sum /w/parallel/tests/test_assemble_checks.sh | cut -d' ' -f1) parallel/tests/test_assemble_checks.sh"
       PY=python ACT=/w/rr/ac timeout 300 sh /w/parallel/tests/test_assemble_checks.sh /w) > $LOGS/$t.log 2>&1 ;;
    test_assemble_checks_pre)
      (echo "sha256 $(sha256sum /w/r58b/pre/assemble_checks.py | cut -d' ' -f1) r58b/pre/assemble_checks.py (the pre-evidence-6 bytes)"
       PY=python ACT=/w/rr/ac_pre AC_PY=/w/r58b/pre/assemble_checks.py timeout 300 sh /w/parallel/tests/test_assemble_checks.sh /w) > $LOGS/$t.log 2>&1 ;;
    *)
      timeout 560 python /w/train/r58/tests/$t.py > $LOGS/$t.log 2>&1 ;;
  esac
  rc=$?
  echo "$t rc=$rc secs=$(( $(date +%s) - st )) $(grep -E '^RESULT' $LOGS/$t.log | tail -1 | cut -c1-90)" >> $S
done
echo done >> $S
