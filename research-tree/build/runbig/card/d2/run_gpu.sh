#!/bin/bash
# card job: run_gpu.sh <repo> <qwen3|swerank> [--limit N]; waits for CR/GPU.lock (mkdir is atomic), network off, 6 GB cap
export MSYS_NO_PATHCONV=1
CODE="C:/Users/User/Documents/projects/harness-engineering/research-tree/build/runbig/card/d2"
CR="C:/Users/User/Documents/projects/card-run-2026-11"
CRU=/c/Users/User/Documents/projects/card-run-2026-11
repo=$1; tag=$2; shift 2
case $tag in qwen3) M=Qwen3-Embedding-0.6B;; swerank) M=SweRankEmbed-Small-local;; esac
until mkdir $CRU/GPU.lock 2>/dev/null; do [ $((SECONDS % 120)) -lt 6 ] && echo "$(date +%T) D2 $repo $tag waiting for GPU.lock (held: $(cat $CRU/GPU.lock/owner.txt 2>/dev/null))"; sleep 5; done
echo "d2 $repo $tag $(date -Is)" > $CRU/GPU.lock/owner.txt
trap 'rm -rf $CRU/GPU.lock' EXIT
docker run --rm $([ "$D2_DEVICE" = cpu ] && echo "" || echo "--gpus all") -e D2_DEVICE --network none --memory 6g -e HF_HUB_OFFLINE=1 -v "$CODE:/code:ro" -v "$CR/models:/models:ro" -v "$CR/d2:/data" d2-embed-gpu:1 \
  python -B /code/dense.py /data/$repo /models/$M $tag "$@"
