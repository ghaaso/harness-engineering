#!/bin/sh
# Task B, CPU container (graphtest-kge:1, KGE_DEVICE=cpu). Restartable: a step whose output json exists is skipped.
run() { out=$1; shift; if [ -f "e4/$out" ]; then echo "skip $out"; else echo "=== $out $(date -u +%FT%TZ)"; "$@"; echo "=== exit $out $?"; fi; }
run equiv-pre.json  env KGE_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 python e4work.py equiv pre
run equiv-post.json env KGE_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 python e4work.py equiv post
for s in 2 3 1; do run cpu-s$s.json python e4work.py seed $s; done
for c in c12 c13 c16; do for t in A L; do run time-cpu-$c-$t.json python e4work.py time $c $t; done; done
