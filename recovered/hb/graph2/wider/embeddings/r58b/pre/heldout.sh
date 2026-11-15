#!/bin/sh
# Launcher of the one held-out run (heldout.py, ruling 58) on the card, in ONE container kge-H1. Not run by the
# ruling-58 build; written so that the mounts are fixed and auditable (leak_audit.py reads the -v lines below).
# Rules: memgate wait and C: free >= 15 GB before the start (rulings 43, 70); no other kge-* container running;
# --network none --cpus 6 -m 2560m --gpus all --pull never, the image resolved to its ID once and passed in as
# KGE_IMAGE_ID (heldout.py refuses unless it equals the item-27 record's, ruling 41); stopped after three memgate
# "low" samples or under 10 GB free (a stopped run resumes: finished units are kept). Inputs read-only: export/,
# eval/evalcore.py ONLY (no tune truth file), train/ (code; train/heldout/ is the one writable folder), the facts
# cache, the shared answer code (with its source store), the frozen primary record, and build/tasks/tasks.jsonl
# (ids, parents and seeds; no reference). Nothing under build/sealed/ is mounted.
# usage: sh heldout.sh            (DRY=1 sh heldout.sh prints the docker command and exits)
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
GB=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build
NAME=kge-H1
IMG=$(docker image inspect graphtest-kge-gpu:1 --format '{{.Id}}' 2>/dev/null) || { echo "image graphtest-kge-gpu:1 absent"; exit 7; }
LOG=$WB/train/heldout/heldout-launch.log
mkdir -p "$WB/train/heldout"
say() { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
CMD="MSYS_NO_PATHCONV=1 docker run -d --rm --pull never --name $NAME --gpus all --network none --cpus 6 -m 2560m --memory-swap 2560m \
 -e EMB_ROOT=/w -e KGE_DEVICE=cuda -e KGE_IMAGE_ID=$IMG -e OMP_NUM_THREADS=6 -e MKL_NUM_THREADS=6 -e PYTHONUNBUFFERED=1 \
 -e PYTHONDONTWRITEBYTECODE=1 -e HOME=/tmp -e PYSTOW_HOME=/tmp/pystow \
 -e GT_COMMON=/gt/common -e GT_FACTS_CACHE=/gt/facts -e GT_SRCSTORE=/gt/common/srcstore -e GT_TMP=/tmp/gt \
 -e GT_PRIMARY=/gt/primary.json -e GT_TASKS=/gt/tasks.jsonl \
 -v $W/export:/w/export:ro -v $W/eval/evalcore.py:/w/eval/evalcore.py:ro -v $W/train:/w/train:ro -v $W/train/heldout:/w/train/heldout \
 -v $GB/facts/cache:/gt/facts:ro -v $GB/arms/common:/gt/common:ro \
 -v $GB/results/frozen/relational/95e990307da3b42b.json:/gt/primary.json:ro -v $GB/tasks/tasks.jsonl:/gt/tasks.jsonl:ro \
 -w /w/train $IMG sh -c 'python heldout.py run > /w/train/heldout/heldout.log 2>&1; echo \$? > /w/train/heldout/heldout.rc'"
if [ -n "$DRY" ]; then echo "$CMD"; exit 0; fi
while [ -n "$(docker ps --format '{{.Names}}' | grep '^kge-' | head -1)" ]; do say "waiting: another kge-* container runs"; sleep 60; done
FREE_GB=$(df -BG /c | awk 'NR==2{gsub("G","",$4); print $4}')
while [ "${FREE_GB:-0}" -lt 15 ]; do say "C: free ${FREE_GB} GB < 15 GB; waiting"; sleep 300; FREE_GB=$(df -BG /c | awk 'NR==2{gsub("G","",$4); print $4}'); done
sh "$WB/orchestrator/memgate.sh" wait
say "start $NAME image $IMG"
eval "$CMD"
low=0
while [ -n "$(docker ps --format '{{.Names}}' | grep "^$NAME\$")" ]; do
  sleep 30
  if STOP_FREE_KB=2621440 STOP_COMMIT_KB=45088768 sh "$WB/orchestrator/memgate.sh" low; then low=$((low+1)); else low=0; fi
  FREE_GB=$(df -BG /c | awk 'NR==2{gsub("G","",$4); print $4}')
  if [ $low -ge 3 ] || [ "${FREE_GB:-0}" -lt 10 ]; then say "stopping $NAME (low=$low, C: ${FREE_GB} GB); rerun to resume"; docker stop $NAME >/dev/null; exit 3; fi
done
say "finished rc=$(cat "$WB/train/heldout/heldout.rc" 2>/dev/null)"
