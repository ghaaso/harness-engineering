#!/bin/sh
# Auditor's launcher: one ktest-G<N> container, graphtest-kge:1 by id, CPU, --network none, 2 CPUs, 1536 MB;
# waits for no other ktest-* and three memgate samples 30 s apart; stops after 580 s.
# Mounts: build/ ro at /build, this audit folder rw, lane eval/ ro. Nothing else.
NAME=$1; shift
GB=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
AD=$GB/sealed/grader/embeddings-audit
ADB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/sealed/grader/embeddings-audit
LOG=$ADB/launch.log
say() { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
case "$NAME" in ktest-G[0-9]*) ;; *) echo "name must be ktest-G<N>"; exit 2 ;; esac
IMGID=$(docker image inspect -f '{{.Id}}' graphtest-kge:1 | tr -d '\r')
case "$IMGID" in sha256:55715543bc43*) ;; *) say "bad image id $IMGID"; exit 2 ;; esac
tries=0; ok=0
while [ $ok -lt 3 ]; do
  S=$(sh $WB/orchestrator/memgate.sh sample); F=$(echo "$S" | awk '{print $1}'); C=$(echo "$S" | awk '{print $2}')
  case "$F$C" in ""|*[!0-9]*) F=0; C=99999999999 ;; esac
  if [ -n "$(docker ps --format '{{.Names}}' | grep '^ktest-')" ]; then ok=0; say "$NAME: another ktest runs"
  elif [ "$F" -ge 6291456 ] && [ "$C" -lt 41943040 ]; then ok=$((ok+1)); say "$NAME: memgate $ok ok $F $C"
  else ok=0; say "$NAME: memgate low $F $C"; fi
  tries=$((tries+1)); [ $tries -ge 40 ] && { say "$NAME: memgate not met in 20 min"; exit 13; }
  [ $ok -lt 3 ] && sleep 30
done
[ -n "$(docker ps --format '{{.Names}}' | grep '^ktest-')" ] && { say "$NAME: another ktest started"; exit 13; }
say "$NAME: starting: $*"
MSYS_NO_PATHCONV=1 docker run -d --rm --pull never --name $NAME --network none --cpus 2 -m 1536m --memory-swap 1536m \
 -e PYTHONDONTWRITEBYTECODE=1 -e PYTHONUNBUFFERED=1 -e OMP_NUM_THREADS=2 -e HOME=/tmp \
 -v $GB:/build:ro -v $AD:/build/sealed/grader/embeddings-audit -v $W/eval:/lane/eval:ro \
 -w /build/sealed/grader/embeddings-audit "$IMGID" sh -c "( $* ) > $NAME.log 2>&1; echo exit \$? >> $NAME.log" >/dev/null || { say "docker run failed"; exit 3; }
if timeout 580 docker wait $NAME >/dev/null 2>&1; then say "$NAME: ended"; else docker stop -t 10 $NAME >/dev/null 2>&1; say "$NAME: over 580 s, stopped"; fi
cat $ADB/$NAME.log
