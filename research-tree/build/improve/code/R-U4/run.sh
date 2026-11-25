#!/bin/bash
# R-U4: run a check script in d2-embed-gpu:3, network off, CPU only (no --gpus), U4's code and outputs read-only.
# usage: run.sh <script.py> [args...]   (writable: /rout = R-U4/out only)
export MSYS_NO_PATHCONV=1
R="C:/Users/User/Documents/projects/harness-engineering/research-tree/build/improve/code/R-U4"
CODE="C:/Users/User/Documents/projects/harness-engineering/research-tree/build/improve/code/U4"
CARD="C:/Users/User/Documents/projects/harness-engineering/research-tree/build/runbig/card/d4"
CR="C:/Users/User/Documents/projects/card-run-2026-11"
docker run --rm --network none -m ${RU4_MEM:-20g} -e D4_DATA=/data -e D4_OUT=/tmp/d4out -e U4_ROOT=/out -e PYTHONPATH=/rcode:/card:/code \
  -e PYTHONDONTWRITEBYTECODE=1 -e OMP_NUM_THREADS=${RU4_THREADS:-12} \
  -v "$R:/rcode:ro" -v "$R/out:/rout" -v "$CODE:/code:ro" -v "$CARD:/card:ro" -v "$CR/d4/out:/cardout:ro" -v "$CR/d4/data:/carddata:ro" \
  -v "$CR/improve/U4/data:/data:ro" -v "$CR/improve/U4:/out:ro" -w /rcode d2-embed-gpu:3 python -u "$@"
