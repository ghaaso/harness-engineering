#!/bin/bash
# T3 CPU job in d2-embed-gpu:3, network off, 4 CPUs, 8 GB (SMALL-MEASUREMENTS brief). usage: run_cpu.sh <script.py> [args...]
# Read-only: /t3code (this folder), /code = U6 code, /code5 = U5 code, /code4 = U4 code, /t1code, /t2code, /card, /cardout,
#   /data = U4 data, /u4, /u5, /u6, /t1, /t2, /dyglib. Read-write: /t3 = CR/improve/T3 only. Tuning data only is read.
# U6's code writes under U6_OUT: it is pointed at /t3/u6out; U6's saved runs are mounted read-only inside it at /t3/u6out/runs.
export MSYS_NO_PATHCONV=1
H="C:/Users/User/Documents/projects/harness-engineering/research-tree/build"
CR="C:/Users/User/Documents/projects/card-run-2026-11"
C="$H/improve/code"
docker run --rm --network none --cpus 4 -m ${T3_MEM:-8g} --name t3-${T3_NAME:-job}-$$ \
  -e U5_DEVICE=cpu -e U5_OUT=${T3_U5OUT:-/u5} -e U5_MAXEP=30 -e U5_LR=1e-3 -e U6_OUT=/t3/u6out -e DYGLIB=/dyglib \
  -e D4_DATA=/data -e D4_OUT=/t3/d4out -e U4_ROOT=/u4 -e T2OUT=/t2 -e PYTHONDONTWRITEBYTECODE=1 -e OMP_NUM_THREADS=4 \
  -e PYTHONPATH=/card:/t3code:${T3_PATH:-/code5:/code4} \
  -v "$C/T3:/t3code:ro" -v "$C/U6:/code:ro" -v "$C/U5:/code5:ro" -v "$C/U4:/code4:ro" -v "$C/T1:/t1code:ro" -v "$C/T2:/t2code:ro" \
  -v "$H/runbig/card/d4:/card:ro" -v "$CR/d4/out:/cardout:ro" -v "$CR/improve/U4/data:/data:ro" -v "$CR/improve/U4:/u4:ro" \
  -v "$CR/improve/U5:/u5:ro" -v "$CR/improve/T1:/t1:ro" -v "$CR/improve/T2:/t2:ro" -v "$CR/tools/DyGLib:/dyglib:ro" \
  -v "$CR/improve/T3:/t3" -v "$CR/improve/U6/runs:/t3/u6out/runs:ro" $T3_EXTRA \
  -w /t3code d2-embed-gpu:3 python -u "$@"
