#!/bin/sh
# Runs the ruling-58 plumbing tests inside ONE container (kge-W1, CPU image). Each test logs to train/r58/logs/<name>.log.
cd /w/train
LOGS=/w/train/r58/logs
: > $LOGS/summary.txt
for t in test_gate test_select_report test_counts test_item27 test_answer_level test_heldout test_item22 test_write_result ${EXTRA_TESTS}; do
  case " ${ONLY:-$t} " in *" $t "*) ;; *) continue ;; esac
  if [ "$t" = test_select_report ]; then
    s=/w/fixes/tests/test_select_report.py
    (echo "sha256 $(sha256sum $s | cut -d' ' -f1) fixes/tests/test_select_report.py"; OUT=/w/train/r58/out/selrep CODE=r58 timeout 3000 python $s) > $LOGS/$t.log 2>&1
  else
    timeout 3000 python /w/train/r58/tests/$t.py > $LOGS/$t.log 2>&1
  fi
  rc=$?
  echo "$t rc=$rc $(grep '^RESULT' $LOGS/$t.log | tail -1 | cut -c1-80)" >> $LOGS/summary.txt
done
echo done >> $LOGS/summary.txt
