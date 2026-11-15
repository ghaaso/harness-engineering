#!/bin/sh
# Host driver of the one card batch (kge-T1): ruling 69 (ii) equality runs + (iv) and (iii) plumbing (inner.sh).
# memgate.sh wait and C: >= 15 GB before the start; kge-T1 holds at a go file until no other kge-* runs (kge-B1
# yields to it); card (nvidia-smi every 1 s) and host (RAM, commit, CPU load, kge-* names, every 10 s) are logged.
WD=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
E=$WB/parallel/eq; NAME=kge-T1
say() { echo "$(date -u +%FT%TZ) $*" | tee -a "$E/driver.log"; }
IMGID=$(docker image inspect -f '{{.Id}}' graphtest-kge-gpu:1 2>/dev/null | tr -d '\r'); [ -n "$IMGID" ] || { say "no image"; exit 4; }
docker ps -a --format '{{.Names}}' | grep -q '^kge-T' && { say "a kge-T* exists: not starting"; exit 4; }
rm -f "$E/go" "$E/rcs" "$E/eq.jsonl"; rm -rf "$E/units"
say "memgate wait"; sh $WB/orchestrator/memgate.sh wait
f=$(df -BG /c | awk 'NR==2{gsub("G","",$4); print $4}'); [ "${f:-0}" -ge 15 ] || { say "C: ${f} GB free: not starting"; exit 4; }
say "gate passed ($(sh $WB/orchestrator/memgate.sh sample) free_kb commit_kb; C: $f GB); image $IMGID"
MSYS_NO_PATHCONV=1 docker run -d --rm --pull never --name $NAME --gpus all --network none --cpus 6 -m 2560m --memory-swap 2560m \
  -e EMB_ROOT=/w -e OMP_NUM_THREADS=6 -e MKL_NUM_THREADS=6 -e PYTHONUNBUFFERED=1 -e HOME=/tmp -e PYSTOW_HOME=/tmp/pystow \
  -e KGE_DEVICE=cuda -e RERUN_TRAIN=/w/train \
  -v $WD/export:/w/export:ro -v $WD/eval:/w/eval:ro -v $WD/train:/w/train:ro -v $WD/orchestrator:/w/orchestrator:ro \
  -v $WD/parallel:/w/parallel -w /w/parallel "$IMGID" sh /w/parallel/eq/inner.sh >/dev/null 2>>"$E/driver.log" || { say "docker run failed"; exit 4; }
say "started $NAME; waiting until it is alone on the card"
nvidia-smi --query-gpu=timestamp,utilization.gpu,memory.used,power.draw,temperature.gpu --format=csv,noheader -l 1 >> "$E/gpu-load.tsv" &
SMI=$!; SMIW=$(cat /proc/$SMI/winpid 2>/dev/null)
( while docker ps --format '{{.Names}}' | grep -qx $NAME; do
    echo "$(date -u +%FT%TZ) $(sh $WB/orchestrator/memgate.sh sample) cpu=$(powershell -NoProfile -c '(Get-CimInstance Win32_Processor | Measure-Object LoadPercentage -Average).Average' 2>/dev/null | tr -d '\r') kge=[$(docker ps --format '{{.Names}}' | grep '^kge-' | tr '\n' ' ')]" >> "$E/host-load.tsv"
    sleep 10; done ) &
i=0; while docker ps --format '{{.Names}}' | grep '^kge-' | grep -qvx $NAME; do sleep 3; i=$((i+3)); [ $i -ge 900 ] && break; done
if docker ps --format '{{.Names}}' | grep '^kge-' | grep -qvx $NAME; then
  say "another kge-* still runs after 15 min: stopping $NAME"; docker stop -t 2 $NAME >/dev/null; kill $SMI; taskkill //F //PID $SMIW >/dev/null 2>&1; exit 4; fi
touch "$E/go"; say "alone on the card ($(docker ps --format '{{.Names}}' | grep '^kge-' | tr '\n' ' ')): go"
docker wait $NAME >/dev/null 2>&1
kill $SMI 2>/dev/null; [ -n "$SMIW" ] && taskkill //F //PID $SMIW >/dev/null 2>&1
say "kge-T1 ended; rcs: $(tr '\n' ';' < "$E/rcs")"
