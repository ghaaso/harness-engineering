#!/bin/bash
# U4 card job: run_gpu.sh <repo>...  Takes CR/GPU.lock the way CR/d2image/swerank-waiter.sh does (mkdir, poll 60 s),
# network off, 6 GB container cap; logs start, end and peak card memory to CR/logs/improve-U4.log.
export MSYS_NO_PATHCONV=1
CODE="C:/Users/User/Documents/projects/harness-engineering/research-tree/build/improve/code/U4"
D2CODE="C:/Users/User/Documents/projects/harness-engineering/research-tree/build/runbig/card/d2"
CR="C:/Users/User/Documents/projects/card-run-2026-11"
CRU=/c/Users/User/Documents/projects/card-run-2026-11
LOG=$CRU/logs/improve-U4.log
until mkdir $CRU/GPU.lock 2>/dev/null; do echo "$(date +%T) waiting for GPU.lock (held: $(cat $CRU/GPU.lock/owner.txt 2>/dev/null))"; sleep 60; done
echo "improve-U4 embed $$ $(date -u +%FT%TZ)" > $CRU/GPU.lock/owner.txt
trap 'rm -rf $CRU/GPU.lock; echo "$(date -u +%FT%TZ) U4 embed lock released" >> $LOG' EXIT
echo "$(date -u +%FT%TZ) U4 embed start (Qwen3-Embedding-0.6B file vectors, repos: $*; estimate 0.3 card h for the unit)" >> $LOG
T0=$SECONDS
( while sleep 15; do nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits 2>/dev/null; done ) > $CRU/improve/U4/logs/gpu-mem.txt &
MON=$!
docker run --rm --gpus all --network none --memory 6g -e HF_HUB_OFFLINE=1 -e PYTHONDONTWRITEBYTECODE=1 \
  -v "$CODE:/code:ro" -v "$D2CODE:/d2code:ro" -v "$CR/models:/models:ro" -v "$CR/improve/U4:/out" -w /code d2-embed-gpu:3 \
  python -u /code/embed.py "$@"
RC=$?
kill $MON 2>/dev/null
PEAK=$(sort -n $CRU/improve/U4/logs/gpu-mem.txt | tail -1)
echo "$(date -u +%FT%TZ) U4 embed end exit=$RC secs=$((SECONDS-T0)) peak card memory used (nvidia-smi, whole card) ${PEAK} MiB" >> $LOG
