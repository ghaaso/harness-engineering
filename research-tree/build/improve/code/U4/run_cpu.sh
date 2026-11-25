#!/bin/bash
# U4 CPU steps, network off. usage:
#   run_cpu.sh extract <repo>            training blocks + content snapshots (graphtest-kge-gpu:1, node + git)
#   run_cpu.sh py <script.py> [args...]  python in d2-embed-gpu:3 (numpy, scipy, pandas, lightgbm), CPU only
# Mounts: /code = this folder (ro), /card = runbig/card/d4 (ro), /cardout = CR/d4/out (ro), /data = CR/improve/U4/data (ro for py),
#         /improve = CR/improve (ro; other units' score files for rank.py --extra), /out = CR/improve/U4. d4lib reads D4_DATA=/data and D4_OUT=/out/d4out.
export MSYS_NO_PATHCONV=1
CODE="C:/Users/User/Documents/projects/harness-engineering/research-tree/build/improve/code/U4"
CARD="C:/Users/User/Documents/projects/harness-engineering/research-tree/build/runbig/card/d4"
CR="C:/Users/User/Documents/projects/card-run-2026-11"
U4="$CR/improve/U4"
mkdir -p "/c/Users/User/Documents/projects/card-run-2026-11/improve/U4/d4out"
step=$1; shift
case $step in
  extract)
    repo=$1
    case $repo in
      fixflow) SRC="C:/Users/User/Documents/projects/EMS_workshop1"; REF=903787e3801727399d313ef02781f0b6afec8845; MAXB=1000; SEG=6;;
      clinic)  SRC="C:/Bilal_Migration/User/Downloads/20_Projects/24_Clinic_Workshop"; REF=f4276ed829491223afdd19a8413b26c7ecf41cae; MAXB=1000; SEG=6;;
      zulip)   SRC="$CR/repos/zulip"; REF=a7af4399c1943eb4778789de95f09f6d14911e94; MAXB=${U4_ZULIP_BLOCKS:-100}; SEG=25;;
    esac
    docker run --rm --network none -m 12g -e GIT_CONFIG_COUNT=1 -e GIT_CONFIG_KEY_0=safe.directory -e GIT_CONFIG_VALUE_0='*' \
      -v "$CODE:/code:ro" -v "$CARD:/card:ro" -v "$SRC:/src:ro" -v "$CR/d4/data:/carddata:ro" -v "$U4:/out" -w /code \
      graphtest-kge-gpu:1 node /code/extract_train.mjs $repo /src /out $REF $MAXB $SEG;;
  py)
    docker run --rm --network none -m ${U4_MEM:-24g} -e D4_DATA=/data -e D4_OUT=/out/d4out -e PYTHONPATH=/card:/code -e PYTHONDONTWRITEBYTECODE=1 \
      -e OMP_NUM_THREADS=${U4_THREADS:-16} \
      -v "$CODE:/code:ro" -v "$CARD:/card:ro" -v "$CR/d4/out:/cardout:ro" -v "$CR/d4/data:/carddata:ro" -v "$U4/data:/data:ro" -v "$CR/improve:/improve:ro" -v "$U4:/out" \
      -w /code d2-embed-gpu:3 python -u "$@";;
esac
