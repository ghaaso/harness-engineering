#!/bin/bash
# U5 CPU runs in d2-embed-gpu:3, network off. usage: run_cpu.sh <script.py> [args...]
# Mounts: /code = U5 code, /code4 = U4 code (ro), /card = runbig/card/d4 (ro), /cardout = CR/d4/out (ro), /carddata, /data = U4 data (ro),
#         /u4 = CR/improve/U4 (ro), /out = CR/improve/U5 (rw). Env U5_DEVICE=cpu.
export MSYS_NO_PATHCONV=1
H="C:/Users/User/Documents/projects/harness-engineering/research-tree/build"
CR="C:/Users/User/Documents/projects/card-run-2026-11"
mkdir -p /c/Users/User/Documents/projects/card-run-2026-11/improve/U5/d4out
docker run --rm --network none -m ${U5_MEM:-20g} -e U5_DEVICE=cpu -e U5_SUBSET=${U5_SUBSET:-0} -e U5_MAXEP=${U5_MAXEP:-30} -e U5_LR=${U5_LR:-1e-3} -e U5_OUT=${U5_OUT:-/out} -e D4_DATA=/data -e D4_OUT=/out/d4out -e U4_ROOT=/u4 -e PYTHONPATH=/card:/code:/code4 \
  -e PYTHONDONTWRITEBYTECODE=1 -e OMP_NUM_THREADS=${U5_THREADS:-12} \
  -v "$H/improve/code/U5:/code:ro" -v "$H/improve/code/U4:/code4:ro" -v "$H/runbig/card/d4:/card:ro" -v "$CR/d4/out:/cardout:ro" \
  -v "$CR/d4/data:/carddata:ro" -v "$CR/improve/U4/data:/data:ro" -v "$CR/improve/U4:/u4:ro" -v "$CR/improve/U5:/out" -w /code \
  d2-embed-gpu:3 python -u "$@"
