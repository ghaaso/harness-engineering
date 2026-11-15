#!/bin/sh
# resume run: CPU path of the current kge.py (variant B + task-2 rename) vs the pre-fix kge.py (fixes/pre_m):
# E4 c01 at one thread, E1 c01 at the container's 6 threads; 2 epochs, seed 1, stage A split. Restartable.
run() { out=$1; shift; if [ -f "e4/$out" ]; then echo "skip $out"; else echo "=== $out $(date -u +%FT%TZ)"; EQUIV_OUT=$out "$@"; echo "=== exit $out $?"; fi; }
run equiv2-E4-pre.json  env KGE_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 python e4work.py equiv pre E4
run equiv2-E4-post.json env KGE_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 python e4work.py equiv post E4
run equiv2-E1-pre.json  python e4work.py equiv pre E1
run equiv2-E1-post.json python e4work.py equiv post E1
