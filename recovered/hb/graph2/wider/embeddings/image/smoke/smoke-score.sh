#!/bin/sh
# Separate container, --network none. /in = training outputs (ro), /out = score outputs (rw).
set -u
export OMP_NUM_THREADS=6 MKL_NUM_THREADS=6 PYTHONPATH=/audit KGE_AUDIT_DIR=/out/audit-score
for m in rotate complex compgcn; do
  echo "=== score $m"
  /usr/bin/time -v -o /out/time-score-$m.txt python /smoke/score.py /in/$m > /out/score-$m.json 2> /out/score-$m.err
  echo "$m exit=$?"; cut -c1-700 /out/score-$m.json; tail -2 /out/score-$m.err
  grep -E 'Maximum resident' /out/time-score-$m.txt
done
