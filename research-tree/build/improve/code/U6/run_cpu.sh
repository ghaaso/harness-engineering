#!/bin/bash
# U6 CPU runs (tests, selection, table merge), network off. usage: run_cpu.sh <script.py> [args...]
# U6_DOCKER_EXTRA: extra docker arguments (finish.sh adds the mounts select_cfg.py and merge.py need).
export MSYS_NO_PATHCONV=1
CODE="C:/Users/User/Documents/projects/harness-engineering/research-tree/build/improve/code/U6"
U4CODE="C:/Users/User/Documents/projects/harness-engineering/research-tree/build/improve/code/U4"
CARD="C:/Users/User/Documents/projects/harness-engineering/research-tree/build/runbig/card/d4"
CR="C:/Users/User/Documents/projects/card-run-2026-11"
docker run --rm --network none -m ${U6_MEM:-16g} -e D4_DATA=/u4/data -e D4_OUT=/out/d4out -e U4_ROOT=/u4 -e U6_OUT=/out -e PYTHONPATH=/card:/u4code:/code \
  -e DYGLIB=/dyglib -e PYTHONDONTWRITEBYTECODE=1 -e OMP_NUM_THREADS=${U6_THREADS:-8} \
  -v "$CODE:/code:ro" -v "$U4CODE:/u4code:ro" -v "$CARD:/card:ro" -v "$CR/tools/DyGLib:/dyglib:ro" -v "$CR/improve/U4:/u4:ro" -v "$CR/improve/U6:/out" $U6_DOCKER_EXTRA \
  -w /code d2-embed-gpu:3 python -u "$@"
