#!/bin/bash
# T1 CPU job in d2-embed-gpu:3, network off, at most 4 CPUs and 8 GB (QUICK-TESTS brief). usage: run_cpu.sh <script.py> [args...]
# Mounts: /t1code = T1 code (ro), /code5 = U5 code (ro), /code4 = U4 code (ro), /card = runbig/card/d4 (ro), /cardout = CR/d4/out (ro),
#         /data = U4 data (ro), /u4 = CR/improve/U4 (ro), /u5 = CR/improve/U5 (ro), /t1 = CR/improve/T1 (rw). Tuning data only is read.
export MSYS_NO_PATHCONV=1
H="C:/Users/User/Documents/projects/harness-engineering/research-tree/build"
CR="C:/Users/User/Documents/projects/card-run-2026-11"
docker run --rm --network none --cpus 4 -m ${T1_MEM:-8g} -e U5_DEVICE=cpu -e U5_OUT=/u5 -e U5_MAXEP=30 -e U5_LR=1e-3 \
  -e D4_DATA=/data -e D4_OUT=/t1/d4out -e U4_ROOT=/u4 -e PYTHONPATH=/card:/t1code:/code5:/code4 -e PYTHONDONTWRITEBYTECODE=1 -e OMP_NUM_THREADS=4 \
  -v "$H/improve/code/T1:/t1code:ro" -v "$H/improve/code/U5:/code5:ro" -v "$H/improve/code/U4:/code4:ro" -v "$H/runbig/card/d4:/card:ro" \
  -v "$CR/d4/out:/cardout:ro" -v "$CR/improve/U4/data:/data:ro" -v "$CR/improve/U4:/u4:ro" -v "$CR/improve/U5:/u5:ro" -v "$CR/improve/T1:/t1" \
  -w /t1code d2-embed-gpu:3 python -u "$@"
