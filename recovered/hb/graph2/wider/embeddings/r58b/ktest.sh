#!/bin/sh
# Host launcher of the follow-up's plumbing tests: ONE CPU container named $1 (ktest-N; graphtest-kge:1 by image ID,
# --network none --pull never --cpus 2 -m 1536m), started only when no other ktest-* runs and three memgate samples
# 30 s apart show free >= 6 GB and commit < 40 GB; waited for at most 580 s, then stopped (only this container).
# train/, export/, eval/, orchestrator/, parallel/, fixes/ and the repository are mounted READ-ONLY; only r58b/ is
# writable (R58_OUT=/w/r58b/out, logs in /w/r58b/logs). No card, no kge-* name.
# usage: sh ktest.sh ktest-N "test_a test_b ..."
NAME=$1; TESTS=$2
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
GB=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build
REPO=C:/Users/User/Documents/projects/EMS_workshop1
LOG=$WB/r58b/logs/ktest-launch.log
say() { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
case "$NAME" in ktest-[0-9]*) ;; *) echo "name must be ktest-N"; exit 2 ;; esac
tries=0; ok=0
while [ $ok -lt 3 ]; do
  set -- $(sh $WB/orchestrator/memgate.sh sample)
  if [ -n "$(docker ps --format '{{.Names}}' | grep '^ktest-')" ]; then ok=0; say "$NAME: another ktest runs"
  elif [ -n "$1" ] && [ "$1" -ge 6291456 ] && [ -n "$2" ] && [ "$2" -lt 41943040 ]; then ok=$((ok+1)); say "$NAME: memgate sample $ok ok: free_kb $1 commit_kb $2"
  else ok=0; say "$NAME: memgate sample low: free_kb $1 commit_kb $2"; fi
  tries=$((tries+1)); [ $tries -ge 80 ] && { say "$NAME: memgate not met in 80 samples; not started"; exit 13; }
  [ $ok -lt 3 ] && sleep 30
done
IMGID=$(docker image inspect -f '{{.Id}}' graphtest-kge:1 | tr -d '\r')
say "$NAME: starting ($IMGID) tests: $TESTS"
MSYS_NO_PATHCONV=1 docker run -d --rm --pull never --name $NAME --network none --cpus 2 -m 1536m --memory-swap 1536m \
 -e EMB_ROOT=/w -e KGE_DEVICE=cpu -e OMP_NUM_THREADS=2 -e MKL_NUM_THREADS=2 -e PYTHONUNBUFFERED=1 -e PYTHONDONTWRITEBYTECODE=1 \
 -e HOME=/tmp -e PYSTOW_HOME=/tmp/pystow -e TESTS="$TESTS" -e KNAME=$NAME -e R58_OUT=/w/r58b/out -e R58_LOGS=/w/r58b/logs \
 -e GT_COMMON=/gt/common -e GT_FACTS_CACHE=/gt/facts -e GT_SRCSTORE=/gt/common/srcstore -e GT_TMP=/tmp/gt \
 -e GT_PRIMARY=/gt/primary.json -e GT_TASKS=/gt/tasks.jsonl -e FIXFLOW_REPO=/repo -e LEAK_LANE_HOST=$W -e EOR_PASS_ROOT=/w/r58b/eor/c \
 -v $W/export:/w/export:ro -v $W/eval:/w/eval:ro -v $W/train:/w/train:ro -v $W/fixes:/w/fixes:ro \
 -v $W/orchestrator:/w/orchestrator:ro -v $W/parallel:/w/parallel:ro -v $W/r58b:/w/r58b -v $W/r58b/out/hstage:/w/heldout_inputs:ro \
 -v $GB/facts/cache:/gt/facts:ro -v $GB/arms/common:/gt/common:ro \
 -v $GB/results/frozen/relational/95e990307da3b42b.json:/gt/primary.json:ro -v $GB/tasks/tasks.jsonl:/gt/tasks.jsonl:ro \
 -v $GB/facts/cache:/build/facts/cache:ro -v $GB/tasks/tasks.jsonl:/build/tasks/tasks.jsonl:ro -v $REPO:/repo:ro \
 -w /w/train "$IMGID" sh /w/r58b/kt_inner.sh >/dev/null || { say "$NAME: docker run failed"; exit 3; }
if timeout 580 docker wait $NAME >/dev/null 2>&1; then say "$NAME: ended by itself"
else docker stop -t 10 $NAME >/dev/null 2>&1; say "$NAME: over 580 s, stopped"; fi
cat $WB/r58b/logs/summary-$NAME.txt 2>/dev/null
