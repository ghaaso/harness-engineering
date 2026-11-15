#!/bin/sh
# usage: drun.sh <name> <mem> [-d] -- <cmd...> ; the lane's container pattern (network none, 6 cpus, ro inputs)
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
name=$1; mem=$2; shift 2; det=""; if [ "$1" = "-d" ]; then det="-d"; shift; fi
export MSYS_NO_PATHCONV=1
exec docker run $det --rm --pull never --name "$name" --network none --cpus 6 -m "$mem" --memory-swap "$mem" \
  -e EMB_ROOT=/w -e OMP_NUM_THREADS=6 -e MKL_NUM_THREADS=6 -e PYTHONUNBUFFERED=1 -e HOME=/tmp -e PYSTOW_HOME=/tmp/pystow -e KGE_E4_BATCH -e KGE_E4_FALLBACK \
  -v $W/export:/w/export:ro -v $W/export/graphs0:/w/export/graphs0 -v $W/eval:/w/eval:ro -v $W/train:/w/train \
  -w /w/train graphtest-kge:1 "$@"
