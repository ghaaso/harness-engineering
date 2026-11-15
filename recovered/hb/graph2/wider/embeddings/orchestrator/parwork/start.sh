#!/bin/sh
# usage: start.sh NAME MEM JOBFILE   (detached container, lane mount pattern; parwork copy of train mounted read-only)
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
P=$W/orchestrator/parwork
NAME=$1; MEM=$2; JOB=$3
case "$NAME" in kge-P1|kge-P2) ;; *) echo "bad name"; exit 2;; esac
MSYS_NO_PATHCONV=1 docker run -d --rm --name $NAME --gpus all --network none --cpus 6 -m $MEM --memory-swap $MEM \
  -e EMB_ROOT=/w -e KGE_DEVICE=cuda -e OMP_NUM_THREADS=6 -e MKL_NUM_THREADS=6 -e PYTHONUNBUFFERED=1 -e PYTHONDONTWRITEBYTECODE=1 \
  -e HOME=/tmp -e PYSTOW_HOME=/tmp/pystow -e CNAME=$NAME \
  -v $W/export:/w/export:ro -v $W/eval:/w/eval:ro -v $P/train:/w/train:ro -v $P:/w/pw \
  -w /w/pw graphtest-kge-gpu:1 sh /w/pw/jobs/$JOB
