#!/bin/bash
# T2 probe CPU steps, network off, 4 CPUs, 8 GB. usage:
#   run.sh extract <repo>             seed diffs + block trees (graphtest-kge-gpu:1: node + git), repos read-only
#   run.sh py <script.py> [args...]   python in d2-embed-gpu:3, CPU only
# Mounts: /code = this folder (ro), /card = runbig/card/d4 (ro), /cardout = CR/d4/out (ro), /data = CR/improve/U4/data (ro),
#         /u4 = CR/improve/U4 (ro: U4 tables and choices), /out = CR/improve/T2.
export MSYS_NO_PATHCONV=1
CODE="C:/Users/User/Documents/projects/harness-engineering/research-tree/build/improve/code/T2"
U4CODE="C:/Users/User/Documents/projects/harness-engineering/research-tree/build/improve/code/U4"
CARD="C:/Users/User/Documents/projects/harness-engineering/research-tree/build/runbig/card/d4"
CR="C:/Users/User/Documents/projects/card-run-2026-11"
T2="$CR/improve/T2"
step=$1; shift
case $step in
  extract)
    repo=$1
    case $repo in
      fixflow) SRC="C:/Users/User/Documents/projects/EMS_workshop1"; REF=903787e3801727399d313ef02781f0b6afec8845;;
      clinic)  SRC="C:/Bilal_Migration/User/Downloads/20_Projects/24_Clinic_Workshop"; REF=f4276ed829491223afdd19a8413b26c7ecf41cae;;
      zulip)   SRC="$CR/repos/zulip"; REF=a7af4399c1943eb4778789de95f09f6d14911e94;;
    esac
    docker run --rm --network none --cpus 4 -m 8g -e GIT_CONFIG_COUNT=1 -e GIT_CONFIG_KEY_0=safe.directory -e GIT_CONFIG_VALUE_0='*' \
      -e NODE_OPTIONS=--max-old-space-size=6000 \
      -v "$CODE:/code:ro" -v "$CARD:/card:ro" -v "$SRC:/src:ro" -v "$CR/improve/U4/data:/u4data:ro" -v "$T2:/out" -w /code \
      graphtest-kge-gpu:1 node /code/extract_diff.mjs $repo /src $REF /out/src;;
  py)
    docker run --rm --network none --cpus 4 -m 8g -e D4_DATA=/data -e D4_OUT=/out/d4out -e U4_ROOT=/u4 \
      -e PYTHONPATH=/code:/card:/u4code -e PYTHONDONTWRITEBYTECODE=1 -e OMP_NUM_THREADS=4 \
      -v "$CODE:/code:ro" -v "$U4CODE:/u4code:ro" -v "$CARD:/card:ro" -v "$CR/d4/out:/cardout:ro" -v "$CR/improve/U4/data:/data:ro" \
      -v "$CR/improve/U4:/u4:ro" -v "$T2:/out" -w /code d2-embed-gpu:3 python -u "$@";;
esac
