#!/bin/sh
# Agent B's test launcher (round r58c; copied in substance from r58b/ktest.sh, which is not edited). ONE CPU container
# named $1 (ktest-b<N> for agent B's tests, ktest-r<N> for END-ORDER's lane steps through lane_step.sh), the image
# graphtest-kge:1 by ID, --network none --pull never --cpus 2 -m 1536m --memory-swap 1536m.
# Before it starts: mkdir r58c/ktest.lock (retried every 30 s; the lane's one-ktest-at-a-time lock, which every
# ktest-* name takes, ktest-r<N> included), no ktest-* container running (the grader's ktest-G* included), then
# orchestrator/memgate.sh wait. Waited for at most 580 s, then stopped; the container is removed and the lock freed.
# Mounts: train/, export/, eval/, orchestrator/, parallel/, fixes/, r58c/ and the repository READ-ONLY; writable only
# r58c/B/out/ (at /w/r58c/B/out). Logs in r58c/B/out/logs/. No card, no kge-* name.
# Exit: 2 usage; 3 docker run or release failed; 9 MEMGATE_EMPTY (one sample before memgate.sh wait was not two numbers).
# usage: sh ktest.sh ktest-bN /w/r58c/B/tests/<inner>.sh [args...]
# After `docker run` it looks again (r58c/B/race_gate.sh): the container waits for /tmp/go and is released only when
# no other matching container runs; otherwise it is removed before its release (it has run nothing) and the start is
# retried after a random 30-59 s (coordinator, after ktest-b13 and ktest-G40 started in the same second).
NAME=$1; shift; INNER=$1; shift
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
GB=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build
REPO=C:/Users/User/Documents/projects/EMS_workshop1
mkdir -p $WB/r58c/B/out/logs; LOG=$WB/r58c/B/out/logs/ktest-launch.log
say() { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
case "$NAME" in ktest-b[0-9]*) ;; *) echo "name must be ktest-b<N>"; exit 2 ;; esac
case "$INNER" in /w/r58c/B/*) ;; *) echo "the inner script must be under /w/r58c/B/"; exit 2 ;; esac
until mkdir $WB/r58c/ktest.lock 2>/dev/null; do say "$NAME: r58c/ktest.lock held; retry in 30 s"; sleep 30; done
trap 'docker rm -f $NAME >/dev/null 2>&1; rmdir $WB/r58c/ktest.lock 2>/dev/null' EXIT
. $WB/r58c/B/race_gate.sh
while :; do
while docker ps --format '{{.Names}}' | grep -q '^ktest-'; do say "$NAME: a ktest-* container runs; retry in 30 s"; sleep 30; done
m=$(rg_sample_ok $WB/orchestrator/memgate.sh) || { say "$NAME: MEMGATE_EMPTY: $m; not started (run the launcher from a shell where orchestrator/memgate.sh sample prints two numbers)"; exit 9; }
say "$NAME: memgate wait"; sh $WB/orchestrator/memgate.sh wait; say "$NAME: memgate ok: $(sh $WB/orchestrator/memgate.sh sample)"
IMGID=$(docker image inspect -f '{{.Id}}' graphtest-kge:1 | tr -d '\r')
say "$NAME: starting ($IMGID) $INNER $*"
MSYS_NO_PATHCONV=1 docker run -d --pull never --name $NAME --network none --cpus 2 -m 1536m --memory-swap 1536m \
 -e EMB_ROOT=/w -e KGE_DEVICE=cpu -e OMP_NUM_THREADS=2 -e MKL_NUM_THREADS=2 -e PYTHONUNBUFFERED=1 -e PYTHONDONTWRITEBYTECODE=1 \
 -e HOME=/tmp -e PYSTOW_HOME=/tmp/pystow -e KNAME=$NAME -e BOUT=/w/r58c/B/out -e LEAK_LANE_HOST=$W \
 -e GT_COMMON=/gt/common -e GT_FACTS_CACHE=/gt/facts -e GT_SRCSTORE=/gt/common/srcstore -e GT_TMP=/tmp/gt \
 -e GT_PRIMARY=/gt/primary.json -e GT_TASKS=/gt/tasks.jsonl \
 -v $W/export:/w/export:ro -v $W/eval:/w/eval:ro -v $W/train:/w/train:ro -v $W/fixes:/w/fixes:ro \
 -v $W/orchestrator:/w/orchestrator:ro -v $W/parallel:/w/parallel:ro -v $W/r58c:/w/r58c:ro -v $W/r58c/B/out:/w/r58c/B/out \
 -v $W/r58b:/w/r58b:ro -v $W/grader-returns:/w/grader-returns:ro -v $GB/facts/cache:/gt/facts:ro -v $GB/arms/common:/gt/common:ro \
 -v $GB/results/frozen/relational/95e990307da3b42b.json:/gt/primary.json:ro -v $GB/tasks/tasks.jsonl:/gt/tasks.jsonl:ro \
 -v $GB/arms/common:/build/arms/common:ro -v $GB/results/frozen/relational:/build/results/frozen/relational:ro \
 -v $GB/facts/cache:/build/facts/cache:ro -v $GB/tasks/tasks.jsonl:/build/tasks/tasks.jsonl:ro -v $REPO:/repo:ro \
 -w /w/train "$IMGID" sh -c "$(rg_wrap 'exec sh "$0" "$@"')" "$INNER" "$@" >/dev/null || { say "$NAME: docker run failed"; exit 3; }
o=$(rg_clear '^ktest-' $NAME) && break
b=$(rg_backoff); say "$NAME: $o runs as well after the start; $NAME removed before its release (it ran nothing); retry in $b s"
docker rm -f $NAME >/dev/null 2>&1; sleep $b
done
rg_release $NAME || { say "$NAME: release failed"; exit 3; }
say "$NAME: released (no other ktest-* running after its start)"
if timeout 580 docker wait $NAME >/dev/null 2>&1; then say "$NAME: ended by itself (rc $(docker inspect -f '{{.State.ExitCode}}' $NAME 2>/dev/null))"
else docker stop -t 10 $NAME >/dev/null 2>&1; say "$NAME: over 580 s, stopped"; fi
docker logs $NAME 2>&1 | tail -40
