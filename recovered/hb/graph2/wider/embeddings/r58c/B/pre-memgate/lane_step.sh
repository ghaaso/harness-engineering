#!/bin/sh
# END-ORDER's real (non-test) Python steps (host, Git Bash): ONE CPU container ktest-r<N>, graphtest-kge:1 by its
# image ID (refused when the ID is not the frozen one), --network none --pull never --cpus 2 -m 1536m
# --memory-swap 1536m, EMB_ROOT=/w, work dir /w/train. The whole lane is mounted READ-ONLY at /w, the repository
# read-only at /repo, the pinned build files read-only at /build/... (facts/cache included, for answer_level.py and
# leak_audit.py); only the named writable folders are mounted
# writable on top (lane-relative, or `repo:<path>` for a folder of the repository; never under train/stageB/ or
# export/, never `..`). Before it starts: when orchestrator/freeze-list.txt exists, the freeze check
# (r58c/B/freeze_check.sh) must print nothing (exit 5 otherwise); mkdir r58c/ktest.lock (the lane's
# one-ktest-at-a-time lock, retried every 30 s); no ktest-* and no kge-* container running; memgate.sh wait, then
# three samples 30 s apart with free >= 6 GB and commit < 40 GB. The full docker run line goes into the log first.
# Waited for at most LS_LIMIT seconds (default 3600), then stopped. Exit: the command's exit code; 2 usage;
# 4 not started; 5 the freeze check failed; 6 over the limit. Logs: r58c/B/lane-steps/<name>-<stamp>.log.
# After `docker run` it looks again (r58c/B/race_gate.sh): the container waits for /tmp/go and is released only when
# no other matching container runs; otherwise it is removed before its release (it has run nothing) and the start is
# retried after a random 30-59 s (coordinator, after ktest-b13 and ktest-G40 started in the same second).
# usage: sh lane_step.sh ktest-r<N> "<writable folders>" "<command>"
NAME=$1; WR=$2; CMD=$3
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
GB=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build
REPO=C:/Users/User/Documents/projects/EMS_workshop1
CPU_ID=sha256:55715543bc43c85e8426eb6934d9ba8196307b0ef0b0ccd357da85350ac97711
LIMIT=${LS_LIMIT:-3600}
[ $# -eq 3 ] && [ -n "$CMD" ] || { echo "usage: sh lane_step.sh ktest-r<N> \"<writable folders>\" \"<command>\""; exit 2; }
case "$NAME" in ktest-r[0-9]*) ;; *) echo "lane_step: the name must be ktest-r<N>"; exit 2 ;; esac
STAMP=$(date -u +%Y%m%dT%H%M%SZ); mkdir -p $WB/r58c/B/lane-steps; LOG=$WB/r58c/B/lane-steps/$NAME-$STAMP.log
say() { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
MOUNTS=""
for d in $WR; do
  case "$d" in *..*|/*|train/stageB|train/stageB/*|export|export/*) say "lane_step: writable folder $d refused"; exit 2 ;; esac
  case "$d" in
    repo:*) r=${d#repo:}; mkdir -p "$REPO/$r" || exit 4; MOUNTS="$MOUNTS -v $REPO/$r:/repo/$r" ;;
    *) mkdir -p "$W/$d" || exit 4; MOUNTS="$MOUNTS -v $W/$d:/w/$d" ;;
  esac
done
if [ -f $WB/orchestrator/freeze-list.txt ]; then
  out=$(sh $WB/r58c/B/freeze_check.sh 2>&1); frc=$?
  [ $frc -eq 0 ] && [ -z "$out" ] || { say "lane_step: freeze check failed (rc $frc): $out"; exit 5; }
  say "freeze check: nothing printed, rc 0"
else
  say "no orchestrator/freeze-list.txt yet: no freeze check"
fi
IMGID=$(docker image inspect -f '{{.Id}}' graphtest-kge:1 2>/dev/null | tr -d '\r')
[ "$IMGID" = "$CPU_ID" ] || { say "lane_step: image $IMGID is not $CPU_ID"; exit 4; }
until mkdir $WB/r58c/ktest.lock 2>/dev/null; do say "$NAME: r58c/ktest.lock held; retry in 30 s"; sleep 30; done
trap 'rmdir $WB/r58c/ktest.lock 2>/dev/null' EXIT
docker ps -a --format '{{.Names}}' | grep -qx "$NAME" && { say "$NAME exists: not starting"; exit 4; }
. $WB/r58c/B/race_gate.sh
while :; do
while docker ps --format '{{.Names}}' | grep -qE '^(ktest|kge)-'; do say "$NAME: a ktest-* or kge-* container runs; retry in 30 s"; sleep 30; done
sh $WB/orchestrator/memgate.sh wait
ok=0; n=0
while [ $ok -lt 3 ]; do
  set -- $(sh $WB/orchestrator/memgate.sh sample)
  case "$1$2" in ""|*[!0-9]*) ok=0 ;; *) if [ "$1" -ge 6291456 ] && [ "$2" -lt 41943040 ]; then ok=$((ok+1)); else ok=0; fi ;; esac
  n=$((n+1)); [ $n -ge 80 ] && { say "$NAME: start rule not met in 80 samples; not started"; exit 4; }
  [ $ok -lt 3 ] && sleep 30
done
RUN="docker run -d --pull never --name $NAME --network none --cpus 2 -m 1536m --memory-swap 1536m -e EMB_ROOT=/w -e KGE_DEVICE=cpu -e OMP_NUM_THREADS=2 -e MKL_NUM_THREADS=2 -e PYTHONUNBUFFERED=1 -e PYTHONDONTWRITEBYTECODE=1 -e HOME=/tmp -e PYSTOW_HOME=/tmp/pystow -v $W:/w:ro -v $REPO:/repo:ro -v $GB/tasks/tasks.jsonl:/build/tasks/tasks.jsonl:ro -v $GB/results/frozen/relational:/build/results/frozen/relational:ro -v $GB/arms/common:/build/arms/common:ro -v $GB/facts/cache:/build/facts/cache:ro$MOUNTS -w /w/train $IMGID sh -c"
say "docker run line: $RUN \"$(rg_wrap "$CMD")\""
MSYS_NO_PATHCONV=1 $RUN "$(rg_wrap "$CMD")" >/dev/null 2>>"$LOG" || { say "$NAME: docker run failed"; exit 4; }
o=$(rg_clear '^(ktest|kge)-' $NAME) && break
b=$(rg_backoff); say "$NAME: $o runs as well after the start; $NAME removed before its release (it ran nothing); retry in $b s"
docker rm -f $NAME >/dev/null 2>&1; sleep $b
done
rg_release $NAME || { say "$NAME: release failed"; docker rm -f $NAME >/dev/null 2>&1; exit 4; }
say "$NAME: released (no other ktest-* or kge-* running after its start)"
if timeout $LIMIT docker wait $NAME >/dev/null 2>&1; then rc=$(docker inspect -f '{{.State.ExitCode}}' $NAME | tr -d '\r'); else docker stop -t 10 $NAME >/dev/null 2>&1; rc=6; say "$NAME: over $LIMIT s, stopped"; fi
docker logs $NAME >> "$LOG" 2>&1
docker rm -f $NAME >/dev/null 2>&1
say "$NAME: rc $rc; command: $CMD"
exit $rc
