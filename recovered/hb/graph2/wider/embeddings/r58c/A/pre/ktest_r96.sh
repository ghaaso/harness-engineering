#!/bin/sh
# Agent A's launcher (round r58c), a copy of r58b/ktest.sh with the round's lock: ONE CPU container named $1
# (ktest-a<N>; graphtest-kge:1 by image ID, --network none --pull never --cpus 2 -m 1536m). Before it starts:
# mkdir LANE/r58c/ktest.lock (retried every 30 s), no ktest-* in docker ps (checked again right before the run and 3 s
# after it; a ktest-* that appeared beside it stops this container, exit 14), three memgate samples 30 s apart with
# free >= 6 GB and commit < 40 GB; waited for at most 580 s, then stopped (only this container); the lock is removed.
# Everything is mounted READ-ONLY except r58c/A/ (R58_OUT=/w/r58c/A/out, logs /w/r58c/A/logs) and r58c/handoff-test/.
# usage: sh ktest.sh ktest-aN "test_a test_b ..."      (an item "script:<path under /w>[@arg]" runs that python script)
# Exit code: the container's (0 = every item passed; 124 = over the limit; 14 = another ktest started beside it).
# KT_CAP / KT_ITEM (default 580 / 560 s) raise the container and per-item limits, only with the coordinator's leave.
NAME=$1; TESTS=$2
CAP=${KT_CAP:-580}; ITEM=${KT_ITEM:-560}  # container and per-item limits in s; above 580 / 560 only with the coordinator's leave
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
GB=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build
REPO=C:/Users/User/Documents/projects/EMS_workshop1
mkdir -p $WB/r58c/A/logs $WB/r58c/A/out
LOG=$WB/r58c/A/logs/ktest-launch.log
say() { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
case "$NAME" in ktest-a[0-9]*) ;; *) echo "name must be ktest-a<N>"; exit 2 ;; esac
until mkdir $WB/r58c/ktest.lock 2>/dev/null; do say "$NAME: lane lock held; retry in 30 s"; sleep 30; done
trap 'rmdir $WB/r58c/ktest.lock 2>/dev/null' EXIT
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
# 2026-11-14 race (ktest-b13 and ktest-G40 passed the "no ktest running" check in the same second): check once more
# right before the run, start the container still under the lane lock, and check docker ps again after it; if another
# ktest-* appeared meanwhile, stop ONLY this container and exit 14 (nothing ran; start again later).
others() { docker ps --format '{{.Names}}' | tr -d '\r' | grep '^ktest-' | grep -v "^$NAME\$"; }
if [ -n "$(others)" ]; then say "$NAME: another ktest runs ($(others | tr '\n' ' ')); not started"; exit 14; fi
say "$NAME: starting ($IMGID) tests: $TESTS"
MSYS_NO_PATHCONV=1 docker run -d --pull never --name $NAME --network none --cpus 2 -m 1536m --memory-swap 1536m \
 -e EMB_ROOT=/w -e KGE_DEVICE=cpu -e OMP_NUM_THREADS=2 -e MKL_NUM_THREADS=2 -e PYTHONUNBUFFERED=1 -e PYTHONDONTWRITEBYTECODE=1 \
 -e HOME=/tmp -e PYSTOW_HOME=/tmp/pystow -e TESTS="$TESTS" -e KNAME=$NAME -e ITEM_TIMEOUT=$ITEM -e R58_OUT=/w/r58c/A/out -e R58_LOGS=/w/r58c/A/logs \
 -e GT_COMMON=/gt/common -e GT_FACTS_CACHE=/gt/facts -e GT_SRCSTORE=/gt/common/srcstore -e GT_TMP=/tmp/gt \
 -e GT_PRIMARY=/gt/primary.json -e GT_TASKS=/gt/tasks.jsonl -e FIXFLOW_REPO=/repo -e LEAK_LANE_HOST=$W \
 -v $W/export:/w/export:ro -v $W/eval:/w/eval:ro -v $W/train:/w/train:ro -v $W/fixes:/w/fixes:ro \
 -v $W/orchestrator:/w/orchestrator:ro -v $W/parallel:/w/parallel:ro -v $W/r58b:/w/r58b:ro -v $W/r58c:/w/r58c:ro \
 -v $W/r58c/A:/w/r58c/A -v $W/r58c/handoff-test:/w/r58c/handoff-test -v $W/r58b/out/hstage:/w/heldout_inputs:ro -v $W/r58c/A/fixtures/pstage:/w/probe_inputs:ro \
 -v $GB/facts/cache:/gt/facts:ro -v $GB/arms/common:/gt/common:ro \
 -v $GB/results/frozen/relational/95e990307da3b42b.json:/gt/primary.json:ro -v $GB/tasks/tasks.jsonl:/gt/tasks.jsonl:ro \
 -v $GB/facts/cache:/build/facts/cache:ro -v $GB/tasks/tasks.jsonl:/build/tasks/tasks.jsonl:ro -v $GB/arms/common:/build/arms/common:ro \
 -v $GB/results/frozen/relational/95e990307da3b42b.json:/build/results/frozen/relational/95e990307da3b42b.json:ro -v $REPO:/repo:ro \
 -w /w/train "$IMGID" sh /w/r58c/A/kt_inner.sh >/dev/null || { say "$NAME: docker run failed"; exit 3; }
sleep 3
if [ -n "$(others)" ]; then
  docker rm -f $NAME >/dev/null 2>&1
  say "$NAME: another ktest started beside it ($(others | tr '\n' ' ')); stopped $NAME only; start again later"; exit 14
fi
# no --rm (2026-11-15, ktest-a21): a container that ended within the 3 s re-check was already removed, docker wait
# printed nothing and a 5-second run was logged "over 580 s" (rc 124); it is removed below, after its code is read
crc=$(timeout $CAP docker wait $NAME 2>/dev/null | tr -d '\r')
if [ -n "$crc" ]; then say "$NAME: ended by itself (rc $crc)"
else docker stop -t 10 $NAME >/dev/null 2>&1; crc=124; say "$NAME: over $CAP s, stopped (rc 124)"; fi
docker rm -f $NAME >/dev/null 2>&1
cat $WB/r58c/A/logs/summary-$NAME.txt 2>/dev/null
case "$crc" in ''|*[!0-9]*) crc=3 ;; esac
exit $crc  # end-order-changes-2 item 9: the container's own exit code (kt_inner.sh: the first failing test's rc)
