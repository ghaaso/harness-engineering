#!/bin/sh
# Ruling 87 pre-flight: deterministic E4 c13 and c16, checkpoint 8b506c0dac14 (the smallest tuning checkpoint that
# trains: 2fa68134d22d has no co_changed fact, so stageB.py writes empty parts there), seed 1, plan epochs, twice each,
# in ONE container kge-P1 with ruling 67's flags (rerun_unit.py --det). Writes only under r58c/preflight/.
# Hard limit 15 minutes from docker run, then docker stop. The guard stops kge-B1 itself and relaunches it afterwards.
WD=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
NAME=kge-P1; IMAGE=graphtest-kge-gpu:1; CK=8b506c0dac14
OUT=$WB/r58c/preflight; LOG=$OUT/driver.log
say() { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
IMGID=$(docker image inspect -f '{{.Id}}' "$IMAGE" 2>/dev/null | tr -d '\r'); [ -n "$IMGID" ] || { say "image not found"; exit 4; }
docker ps -a --format '{{.Names}}' | grep -qx $NAME && { say "$NAME exists: not starting"; exit 4; }
[ -f "$OUT/rec.jsonl" ] && { say "rec.jsonl exists: once only"; exit 4; }
while docker ps --format '{{.Names}}' | grep -q '^ktest-'; do say "a ktest-* container runs: waiting"; sleep 30; done
say "memgate wait"; sh $WB/orchestrator/memgate.sh wait; say "memgate ok: $(sh $WB/orchestrator/memgate.sh sample)"
f=$(df -BG /c | awk 'NR==2{gsub("G","",$4); print $4}'); say "C: ${f} GB free"
MSYS_NO_PATHCONV=1 docker run -d --rm --pull never --name $NAME --gpus all --network none --cpus 6 -m 2560m --memory-swap 2560m \
  -e EMB_ROOT=/w -e OMP_NUM_THREADS=6 -e MKL_NUM_THREADS=6 -e PYTHONUNBUFFERED=1 -e HOME=/tmp -e PYSTOW_HOME=/tmp/pystow \
  -e KGE_DEVICE=cuda -e RERUN_TRAIN=/w/train \
  -v $WD/export:/w/export:ro -v $WD/eval:/w/eval:ro -v $WD/train:/w/train:ro -v $WD/orchestrator:/w/orchestrator:ro \
  -v $WD/r58c/preflight:/w/pf -w /w/pf "$IMGID" sh -c "while [ ! -f /w/pf/go ]; do sleep 2; done; \
  python /w/orchestrator/rerun_unit.py --out /w/pf/out --rec /w/pf/rec.jsonl --det \
  E4/c13/s1/$CK=c13_a E4/c13/s1/$CK=c13_b E4/c16/s1/$CK=c16_a E4/c16/s1/$CK=c16_b > /w/pf/run.log 2>&1; echo \$? > /w/pf/rc" \
  >/dev/null 2>>"$LOG" || { say "docker run failed"; exit 4; }
T0=$(date +%s); say "started $NAME (image $IMGID)"
i=0; while docker ps --format '{{.Names}}' | grep '^kge-' | grep -qvx $NAME; do sleep 3; i=$((i+3)); [ $i -ge 300 ] && break; done
if docker ps --format '{{.Names}}' | grep '^kge-' | grep -qvx $NAME; then say "another kge-* still runs after 5 min: stopping $NAME"; docker stop -t 2 $NAME >/dev/null; exit 4; fi
touch "$OUT/go"; say "alone on the card: go"
while docker ps --format '{{.Names}}' | grep -qx $NAME; do
  [ $(( $(date +%s) - T0 )) -ge 900 ] && { say "15 minutes: stopping $NAME"; docker stop -t 5 $NAME >/dev/null; break; }
  echo "$(date -u +%FT%TZ) $(sh $WB/orchestrator/memgate.sh sample) $(docker stats --no-stream --format '{{.MemUsage}}' $NAME 2>/dev/null)" >> $OUT/host-load.tsv
  sleep 10
done
say "ended rc=$(cat $OUT/rc 2>/dev/null || echo none) after $(( $(date +%s) - T0 )) s"
