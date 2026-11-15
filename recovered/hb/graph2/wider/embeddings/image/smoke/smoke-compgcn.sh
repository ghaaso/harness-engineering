#!/bin/sh
set -u
export OMP_NUM_THREADS=6 MKL_NUM_THREADS=6 PYTHONPATH=/audit KGE_AUDIT_DIR=/out/audit
/usr/bin/time -v -o /out/time-compgcn.txt python /smoke/train.py compgcn /in/triples.tsv /out/compgcn > /out/train-compgcn.log 2>&1
echo "compgcn exit=$?"; grep -E 'Maximum resident|Elapsed|Major|Swaps' /out/time-compgcn.txt
