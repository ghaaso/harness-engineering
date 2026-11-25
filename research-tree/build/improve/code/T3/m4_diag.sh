#!/bin/bash
# T3 measurement 4: U6's own diag_tgn.py, unchanged, on one saved pair-TGN state per repository (read only), CPU.
cd "$(dirname "$0")"
L=/c/Users/User/Documents/projects/card-run-2026-11/improve/T3/logs
for a in "fixflow n20_lr0.0003 5" "clinic n20_lr0.0003 5" "zulip n20_lr0.0003 1"; do
  set -- $a
  echo "== tgn $1 $2 e$3 $(date -u +%T)"
  T3_NAME=m4 T3_PATH=/code:/code4 ./run_cpu.sh /code/diag_tgn.py tgn $1 $2 $3 pair 2>&1 | grep -v Warning
done
echo "== done $(date -u +%T)"
