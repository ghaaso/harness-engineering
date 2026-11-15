#!/bin/sh
# Host launcher of the grader (Git Bash). ONE CPU container named $1 (ktest-G<N>), image graphtest-kge:1 by id
# (must start sha256:55715543bc43), --rm --pull never --network none --cpus 2 -m 1536m --memory-swap 1536m.
# Started only when no ktest-* container runs and three memgate samples 30 s apart show free >= 6 GB and
# commit < 40 GB (tries for 20 minutes, then gives up with exit 13); stopped after 580 s.
# Mounts: build/ read-only at /build, this folder read-write at /build/sealed/grader/embeddings, the lane's eval/
# read-only at /lane/eval, the lane's grader-returns/ read-write at /returns, and the hand-off folder (optional,
# $2, a host path or "-") read-only at /handoff. The rest of the arguments are the command run in this folder.
# usage: sh run.sh ktest-G1 <handoff dir|-> python grade.py tune --handoff /handoff --handoff-sha256 H
NAME=$1; HO=$2; shift 2
GB=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
GD=$GB/sealed/grader/embeddings
GDB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/sealed/grader/embeddings
mkdir -p $GDB/logs $WB/grader-returns/test
LOG=$GDB/logs/launch.log
say() { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
case "$NAME" in ktest-G[0-9]*) ;; *) echo "name must be ktest-G<N>"; exit 2 ;; esac
IMGID=$(docker image inspect -f '{{.Id}}' graphtest-kge:1 | tr -d '\r')
case "$IMGID" in sha256:55715543bc43*) ;; *) say "$NAME: image id $IMGID is not the expected one"; exit 2 ;; esac
tries=0; ok=0
while [ $ok -lt 3 ]; do
  S=$(sh $WB/orchestrator/memgate.sh sample); F=$(echo "$S" | awk '{print $1}'); C=$(echo "$S" | awk '{print $2}')
  case "$F$C" in ""|*[!0-9]*) F=0; C=99999999999 ;; esac
  if [ -n "$(docker ps --format '{{.Names}}' | grep '^ktest-')" ]; then ok=0; say "$NAME: another ktest runs"
  elif [ -n "$F" ] && [ "$F" -ge 6291456 ] && [ -n "$C" ] && [ "$C" -lt 41943040 ]; then ok=$((ok+1)); say "$NAME: memgate sample $ok ok: free_kb $F commit_kb $C"
  else ok=0; say "$NAME: memgate sample low: free_kb $F commit_kb $C"; fi
  tries=$((tries+1)); [ $tries -ge 40 ] && { say "$NAME: memgate not met within 20 minutes; not started"; exit 13; }
  [ $ok -lt 3 ] && sleep 30
done
[ -n "$(docker ps --format '{{.Names}}' | grep '^ktest-')" ] && { say "$NAME: another ktest started meanwhile; not started"; exit 13; }
HOM=""
if [ "$HO" != "-" ]; then HOM="-v $HO:/handoff:ro"; fi
CMD="$*"
say "$NAME: starting ($IMGID): $CMD"
MSYS_NO_PATHCONV=1 docker run -d --rm --pull never --name $NAME --network none --cpus 2 -m 1536m --memory-swap 1536m \
 -e PYTHONDONTWRITEBYTECODE=1 -e PYTHONUNBUFFERED=1 -e OMP_NUM_THREADS=2 -e HOME=/tmp \
 -v $GB:/build:ro -v $GD:/build/sealed/grader/embeddings -v $W/eval:/lane/eval:ro -v $W/grader-returns:/returns $HOM \
 -w /build/sealed/grader/embeddings "$IMGID" sh -c "( $CMD ) > logs/$NAME.log 2>&1; echo exit \$? >> logs/$NAME.log" >/dev/null \
 || { say "$NAME: docker run failed"; exit 3; }
if timeout 580 docker wait $NAME >/dev/null 2>&1; then say "$NAME: ended by itself"
else docker stop -t 10 $NAME >/dev/null 2>&1; say "$NAME: over 580 s, stopped"; fi
cat $GDB/logs/$NAME.log
