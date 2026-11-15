#!/bin/sh
# Task B, card container (graphtest-kge-gpu:1, KGE_DEVICE=cuda). Restartable as e4cpu.sh.
run() { out=$1; shift; if [ -f "e4/$out" ]; then echo "skip $out"; else echo "=== $out $(date -u +%FT%TZ)"; "$@"; echo "=== exit $out $?"; fi; }
for s in 1 2 3; do run cuda-s$s.json python e4work.py seed $s; done
