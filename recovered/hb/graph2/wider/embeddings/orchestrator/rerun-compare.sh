#!/bin/sh
# Ruling 69 "for each setting, one finished unit is re-run and compared under ruling 68 during the run" - host driver
# (not hashed). PREPARED; plumbing-tested on a test unit only; NOT yet run on real units.
#   sh rerun-compare.sh [--by arm,cid,runner] [--arms E1,E4] [--limit N]
# One card container kge-T2 (--gpus all --network none --cpus 6 -m 2560m --pull never, the image by ID; train/,
# export/, eval/, orchestrator/ read only; writes only parallel/rerun/). Steps: memgate.sh wait and C: >= 15 GB; no
# other container of this lane's kge-T* running; start kge-T2 holding at a go file; wait until no other kge-*
# container runs (guard-stageAB.sh stops kge-A1 and kge-B1 after two sightings, so the re-runs are alone on the card;
# their units in flight are redone); go; `docker wait`; copy any parallel/rerun/<stamp>/markers/sidebyside-stop-<arm>
# into orchestrator/ (guard-stageAB.sh reads them at its next check); card and host load are logged beside the run.
# The ledger parallel/rerun/ledger.jsonl keeps the groups already compared, so a later call re-runs only new settings
# or new runners. Exit: 0 all equal; 1 a mismatch (markers copied); 3 an error; 4 not started.
WD=${RC_WD:-C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings}
WB=${RC_WB:-/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings}
NAME=${RC_NAME:-kge-T2}; IMAGE=${IMAGE:-graphtest-kge-gpu:1}
STAMP=$(date -u +%Y%m%dT%H%M%SZ); OUT=$WB/parallel/rerun/$STAMP; mkdir -p "$OUT"
LOG=$OUT/driver.log
say() { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
IMGID=$(docker image inspect -f '{{.Id}}' "$IMAGE" 2>/dev/null | tr -d '\r'); [ -n "$IMGID" ] || { say "image $IMAGE not found"; exit 4; }
docker ps -a --format '{{.Names}}' | grep -q '^kge-T' && { say "a kge-T* container exists: not starting"; exit 4; }
sh $WB/orchestrator/memgate.sh wait
f=$(df -BG /c | awk 'NR==2{gsub("G","",$4); print $4}'); [ "${f:-0}" -ge 15 ] || { say "C: ${f} GB free under 15: not starting"; exit 4; }
MSYS_NO_PATHCONV=1 docker run -d --rm --pull never --name $NAME --gpus all --network none --cpus 6 -m 2560m --memory-swap 2560m \
  -e EMB_ROOT=/w -e OMP_NUM_THREADS=6 -e MKL_NUM_THREADS=6 -e PYTHONUNBUFFERED=1 -e HOME=/tmp -e PYSTOW_HOME=/tmp/pystow \
  -e KGE_DEVICE=cuda -e RERUN_TRAIN=/w/train \
  -v $WD/export:/w/export:ro -v $WD/eval:/w/eval:ro -v $WD/train:/w/train:ro -v $WD/orchestrator:/w/orchestrator:ro \
  -v $WD/parallel/rerun:/w/rr -w /w/rr "$IMGID" sh -c "while [ ! -f /w/rr/$STAMP/go ]; do sleep 2; done; \
  python /w/orchestrator/rerun_compare.py run --tree /w/train --out /w/rr/$STAMP --ledger /w/rr/ledger.jsonl $* > /w/rr/$STAMP/run.log 2>&1; \
  echo \$? > /w/rr/$STAMP/rc" >/dev/null 2>>"$LOG" || { say "docker run failed"; exit 4; }
say "started $NAME (image $IMGID); waiting until it is alone on the card"
nvidia-smi --query-gpu=timestamp,utilization.gpu,memory.used,power.draw,temperature.gpu --format=csv,noheader -l 5 >> "$OUT/gpu-load.tsv" &
SMI=$!; SMIW=$(cat /proc/$SMI/winpid 2>/dev/null)
( while docker ps --format '{{.Names}}' | grep -qx $NAME; do
    echo "$(date -u +%FT%TZ) $(sh $WB/orchestrator/memgate.sh sample) $(powershell -NoProfile -c '(Get-CimInstance Win32_Processor | Measure-Object LoadPercentage -Average).Average' 2>/dev/null | tr -d '\r') $(docker ps --format '{{.Names}}' | grep '^kge-' | tr '\n' ' ')" >> "$OUT/host-load.tsv"
    sleep 10; done ) &
i=0; while docker ps --format '{{.Names}}' | grep '^kge-' | grep -qvx $NAME; do sleep 3; i=$((i+3)); [ $i -ge 900 ] && break; done
if docker ps --format '{{.Names}}' | grep '^kge-' | grep -qvx $NAME; then say "another kge-* still runs after 15 min: stopping $NAME"; docker stop -t 2 $NAME >/dev/null; kill $SMI; taskkill //F //PID $SMIW >/dev/null 2>&1; exit 4; fi
touch "$OUT/go"; say "alone on the card: go"
docker wait $NAME >/dev/null 2>&1
kill $SMI 2>/dev/null; [ -n "$SMIW" ] && taskkill //F //PID $SMIW >/dev/null 2>&1
rc=$(cat "$OUT/rc" 2>/dev/null || echo 3)
for m in "$OUT"/markers/sidebyside-stop-*; do
  [ -f "$m" ] || continue; cat "$m" >> "$WB/orchestrator/$(basename "$m")"; say "MISMATCH: wrote orchestrator/$(basename "$m")"
done
say "done rc $rc; results $OUT/compare.jsonl"; exit $rc
