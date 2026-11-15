#!/bin/sh
# Host launcher of the ruling-58 plumbing tests: one container kge-W1 (graphtest-kge:1, CPU), detached.
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
GB=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build
MSYS_NO_PATHCONV=1 docker run -d --rm --pull never --name kge-W1 --network none --cpus 6 -m 2560m --memory-swap 2560m \
 -e EMB_ROOT=/w -e KGE_DEVICE=cpu -e OMP_NUM_THREADS=6 -e MKL_NUM_THREADS=6 -e PYTHONUNBUFFERED=1 -e PYTHONDONTWRITEBYTECODE=1 \
 -e HOME=/tmp -e PYSTOW_HOME=/tmp/pystow -e ONLY="$ONLY" -e EXTRA_TESTS="$EXTRA_TESTS" \
 -e GT_COMMON=/gt/common -e GT_FACTS_CACHE=/gt/facts -e GT_SRCSTORE=/gt/common/srcstore -e GT_TMP=/tmp/gt \
 -e GT_PRIMARY=/gt/primary.json -e GT_TASKS=/gt/tasks.jsonl \
 -v $W/export:/w/export:ro -v $W/eval:/w/eval:ro -v $W/train:/w/train -v $W/fixes:/w/fixes:ro \
 -v $GB/facts/cache:/gt/facts:ro -v $GB/arms/common:/gt/common:ro \
 -v $GB/results/frozen/relational/95e990307da3b42b.json:/gt/primary.json:ro -v $GB/tasks/tasks.jsonl:/gt/tasks.jsonl:ro \
 -w /w/train graphtest-kge:1 sh /w/train/r58/tests/incontainer.sh
