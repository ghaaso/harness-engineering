#!/bin/sh
# Ruling 113 launcher (host, Git Bash): one kge-S1 container, one unit.  usage: sh s1.sh TAG control|heldout SEED
# Order: freeze check (must print nothing, else exit 5); r58c/ktest.lock (mkdir, retried every 30 s); no ktest-*/kge-*
# container running; memory: three samples 30 s apart, free >= 10 GB and commit < 40 GB (orchestrator/memgate.sh sample);
# docker run (frozen GPU card image by id, --gpus all, --network none, --pull never, -m 6g --memory-swap 6g, mounts from
# mounts.txt only); docker inspect saved to mount-records/kge-S1-TAG.json; docker wait; docker logs to logs/TAG.log;
# container removed; lock released; freeze check again (exit 5 when it prints). Exit: the container's rc.
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
B=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build
S=$WB/r58c/sleep-check
TAG=$1; MODE=$2; SEED=$3; NAME=kge-S1
GPU_ID=sha256:a890c54808c11c460d910945c4bf981390f7de43c8dfc5840269b76f5861cbe7
LOG=$S/logs/$TAG.launch.log
say() { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
case "$MODE" in control|heldout) ;; *) echo "usage: sh s1.sh TAG control|heldout SEED"; exit 2 ;; esac
case "$SEED" in 1|2|3) ;; *) echo "seed 1, 2 or 3"; exit 2 ;; esac
fc() { out=$(sh $WB/r58c/B/freeze_check.sh 2>&1); frc=$?; [ $frc -eq 0 ] && [ -z "$out" ] || { say "freeze check $1: failed (rc $frc): $out"; return 1; }; say "freeze check $1: nothing printed, rc 0"; }
say "begin $TAG: $MODE seed $SEED"
fc before || exit 5
IMG=$(docker image inspect -f '{{.Id}}' graphtest-kge-gpu:1 2>/dev/null | tr -d '\r')
[ "$IMG" = "$GPU_ID" ] || { say "image $IMG is not $GPU_ID"; exit 4; }
VF=""
while read -r m src dst mode; do
  case "$m" in ''|'#'*) continue ;; all|"$MODE") ;; *) continue ;; esac
  case "$src" in LANE/*) p=$W/${src#LANE/} ;; BUILD/*) p=$B/${src#BUILD/} ;; *) say "bad mount source $src"; exit 4 ;; esac
  [ -e "$p" ] || { say "mount source missing: $p"; exit 4; }
  VF="$VF -v $p:$dst:$mode"
done < $S/mounts.txt
until mkdir $WB/r58c/ktest.lock 2>/dev/null; do say "r58c/ktest.lock held; retry in 30 s"; sleep 30; done
trap 'rmdir $WB/r58c/ktest.lock 2>/dev/null' EXIT
say "lock taken"
docker ps -a --format '{{.Names}}' | grep -qx "$NAME" && { say "$NAME exists: not starting"; exit 4; }
while docker ps --format '{{.Names}}' | grep -qE '^(ktest|kge)-'; do say "a ktest-* or kge-* container runs; retry in 30 s"; sleep 30; done
ok=0; n=0
while [ $ok -lt 3 ]; do
  set -- $(sh $WB/orchestrator/memgate.sh sample)
  say "memory sample: free_kb $1 commit_kb $2"
  case "$1$2" in ""|*[!0-9]*) ok=0 ;; *) if [ "$1" -ge 10485760 ] && [ "$2" -lt 41943040 ]; then ok=$((ok+1)); else ok=0; fi ;; esac
  n=$((n+1)); [ $n -ge 80 ] && { say "start rule (free >= 10 GB, commit < 40 GB, three samples) not met in 80 samples; not started"; exit 4; }
  [ $ok -lt 3 ] && sleep 30
done
RUN="docker run -d --pull never --name $NAME --gpus all --network none --cpus 6 -m 6g --memory-swap 6g -e EMB_ROOT=/w -e KGE_DEVICE=cuda -e KGE_IMAGE_ID=$IMG -e OMP_NUM_THREADS=6 -e MKL_NUM_THREADS=6 -e PYTHONUNBUFFERED=1 -e PYTHONDONTWRITEBYTECODE=1 -e HOME=/tmp -e PYSTOW_HOME=/tmp/pystow -e GT_TMP=/tmp/gt$VF -w /w/train $IMG python /w/r58c/sleep-check/run_unit.py $MODE $SEED /w/r58c/sleep-check/out"
say "docker run line: $RUN"
MSYS_NO_PATHCONV=1 $RUN >/dev/null 2>>"$LOG" || { say "docker run failed"; exit 4; }
MR=$S/mount-records/$NAME-$TAG.json
docker inspect $NAME > "$MR.part" 2>>"$LOG" && mv "$MR.part" "$MR" || { say "docker inspect failed; container removed"; docker rm -f $NAME >/dev/null 2>&1; exit 4; }
say "mount record r58c/sleep-check/mount-records/$NAME-$TAG.json sha256 $(sha256sum "$MR" | cut -c1-64)"
docker wait $NAME >/dev/null 2>&1; rc=$(docker inspect -f '{{.State.ExitCode}}' $NAME | tr -d '\r')
docker logs $NAME > $S/logs/$TAG.log 2>&1
docker rm -f $NAME >/dev/null 2>&1
say "container log r58c/sleep-check/logs/$TAG.log sha256 $(sha256sum $S/logs/$TAG.log | cut -c1-64)"
rmdir $WB/r58c/ktest.lock 2>/dev/null; trap - EXIT; say "lock released"
fc after || exit 5
say "s1 exit $rc ($TAG: $MODE seed $SEED)"
exit $rc
