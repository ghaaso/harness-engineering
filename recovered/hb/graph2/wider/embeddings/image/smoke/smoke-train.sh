#!/bin/sh
# Inside graphtest-kge:1, --network none, read-only rootfs, tmpfs /tmp.
# /out = output folder (rw), /smoke = scripts (ro), /audit = audit probe (ro).
set -u
export OMP_NUM_THREADS=6 MKL_NUM_THREADS=6 PYTHONPATH=/audit KGE_AUDIT_DIR=/out/audit
mkdir -p /out/audit-helper
echo "=== environment"; id; echo "HOME=$HOME PYSTOW_HOME=$PYSTOW_HOME"; python --version
KGE_AUDIT_DIR=/out/audit-helper python - <<'PY'
import socket
try:
    socket.create_connection(("1.1.1.1", 443), timeout=3); print("network: REACHABLE")
except OSError as e:
    print("network: unreachable (%s)" % e)
PY
echo "=== import pykeen with the network off (audit probe on)"
python -c "import pykeen, pykeen.models, pykeen.pipeline, torch; print('import ok', pykeen.get_version(), torch.__version__)"
echo "=== generate synthetic triples"
python /smoke/gen.py /out/triples.tsv
for m in rotate complex compgcn; do
  echo "=== train $m"
  /usr/bin/time -v -o /out/time-$m.txt python /smoke/train.py $m /out/triples.tsv /out/$m > /out/train-$m.log 2>&1
  echo "$m exit=$?"; tail -c 1500 /out/train-$m.log | tail -3 | cut -c1-600
  grep -E 'Maximum resident|Elapsed' /out/time-$m.txt
done
