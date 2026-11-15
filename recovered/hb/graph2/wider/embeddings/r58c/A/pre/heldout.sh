#!/bin/sh
# Launcher of the one held-out run (heldout.py, ruling 58) on the card, in ONE container kge-H1; with PROBE=1, the
# ruling-79 memory probe in ONE container kge-H1P (before the freeze, after stage B has left the card). Not run by
# the ruling-58 build; the mounts are fixed and auditable (leak_audit.py reads the -v lines below).
# Rules: no other kge-* container running; C: free >= 15 GB (rulings 43, 70); ruling 79: start only after three
# memgate samples 30 s apart with free RAM >= 6 GB (6291456 KB) and commit < 38 GB (39845888 KB), and a 4 GB cap
# (-m 4g --memory-swap 4g) for every arm; --network none --cpus 6 --gpus all --pull never, the image resolved to
# its ID once and passed in as KGE_IMAGE_ID (heldout.py refuses unless it equals the item-27 record's, ruling 41);
# stopped after three memgate "low" samples or under 10 GB free (a stopped run resumes: finished units are kept).
# Ruling 78: the facts and the source store of the 70 held-out parents ONLY. heldout_inputs.js builds
# $W/heldout_inputs (facts/<P>/, common/*.js, common/srcstore/trees/<P>.json and only the blobs they name) from
# plan.json's heldout.assignment and checks it; the launch is refused (exit 8) unless the check passes. Nothing else
# from build/facts/cache or arms/common/srcstore is mounted; nothing under build/sealed/ is mounted.
# Inputs read-only: export/, eval/evalcore.py ONLY (no tune truth file), train/ (code; train/heldout/ is the one
# writable folder; train/probe/ in PROBE mode), the staged inputs, the frozen primary record,
# build/tasks/tasks.jsonl (ids, parents and seeds; no reference; heldout.py pins its sha256) and the lane's
# progress.jsonl (the coordinator's item27_freeze line, ruling 80). The container's mounts are captured with
# docker inspect into train/heldout/kge-H1-inspect.json (train/probe/kge-H1P-inspect.json) for the leak audit.
# usage: sh heldout.sh            (DRY=1 sh heldout.sh prints the docker command and exits)
#        PROBE=1 sh heldout.sh    (ruling 79 probe; heldout.py probe -> train/probe/probe.json)
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
GB=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build
STAGE=$W/heldout_inputs
START_FREE_KB=6291456
START_COMMIT_KB=39845888
IMG=$(docker image inspect graphtest-kge-gpu:1 --format '{{.Id}}' 2>/dev/null) || { echo "image graphtest-kge-gpu:1 absent"; exit 7; }
if [ -n "$PROBE" ]; then NAME=kge-H1P; OUTD=probe; else NAME=kge-H1; OUTD=heldout; fi
LOG=$WB/train/$OUTD/heldout-launch.log
say() { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
COMMON_ENV="-e EMB_ROOT=/w -e KGE_DEVICE=cuda -e KGE_IMAGE_ID=$IMG -e OMP_NUM_THREADS=6 -e MKL_NUM_THREADS=6 -e PYTHONUNBUFFERED=1 \
 -e PYTHONDONTWRITEBYTECODE=1 -e HOME=/tmp -e PYSTOW_HOME=/tmp/pystow"
RUN="MSYS_NO_PATHCONV=1 docker run -d --rm --pull never --name $NAME --gpus all --network none --cpus 6 -m 4g --memory-swap 4g $COMMON_ENV \
 -e GT_COMMON=/gt/common -e GT_FACTS_CACHE=/gt/facts -e GT_SRCSTORE=/gt/common/srcstore -e GT_TMP=/tmp/gt \
 -e GT_PRIMARY=/gt/primary.json -e GT_TASKS=/gt/tasks.jsonl \
 -v $W/export:/w/export:ro -v $W/eval/evalcore.py:/w/eval/evalcore.py:ro -v $W/train:/w/train:ro -v $W/train/heldout:/w/train/heldout \
 -v $W/progress.jsonl:/w/progress.jsonl:ro \
 -v $STAGE/facts:/gt/facts:ro -v $STAGE/common:/gt/common:ro \
 -v $GB/results/frozen/relational/95e990307da3b42b.json:/gt/primary.json:ro -v $GB/tasks/tasks.jsonl:/gt/tasks.jsonl:ro \
 -w /w/train $IMG sh -c 'python heldout.py run > /w/train/heldout/heldout.log 2>&1; echo \$? > /w/train/heldout/heldout.rc'"
PRB="MSYS_NO_PATHCONV=1 docker run -d --rm --pull never --name $NAME --gpus all --network none --cpus 6 -m 4g --memory-swap 4g $COMMON_ENV \
 -v $W/export:/w/export:ro -v $W/eval/evalcore.py:/w/eval/evalcore.py:ro -v $W/train:/w/train:ro -v $W/train/probe:/w/train/probe \
 -w /w/train $IMG sh -c 'python heldout.py probe > /w/train/probe/probe.log 2>&1; echo \$? > /w/train/probe/probe.rc'"
if [ -n "$PROBE" ]; then CMD=$PRB; else CMD=$RUN; fi
if [ -n "$DRY" ]; then echo "$CMD"; exit 0; fi
mkdir -p "$WB/train/$OUTD"
if [ -z "$PROBE" ]; then  # ruling 78: build (or reuse) the staged inputs and refuse unless they check
  node "$W/train/heldout_inputs.js" build --plan "$W/train/stageB/plan.json" --facts "$GB/facts/cache" --common "$GB/arms/common" --out "$STAGE" >> "$LOG" 2>&1
  if ! node "$W/train/heldout_inputs.js" check --plan "$W/train/stageB/plan.json" --dir "$STAGE" >> "$LOG" 2>&1; then
    say "refusing: $STAGE does not check (ruling 78)"; exit 8; fi
fi
while [ -n "$(docker ps --format '{{.Names}}' | grep '^kge-' | head -1)" ]; do say "waiting: another kge-* container runs"; sleep 60; done
FREE_GB=$(df -BG /c | awk 'NR==2{gsub("G","",$4); print $4}')
while [ "${FREE_GB:-0}" -lt 15 ]; do say "C: free ${FREE_GB} GB < 15 GB; waiting"; sleep 300; FREE_GB=$(df -BG /c | awk 'NR==2{gsub("G","",$4); print $4}'); done
ok=0  # ruling 79: three samples 30 s apart, free >= 6 GB and commit < 38 GB (an unreadable sample is not ok)
while [ $ok -lt 3 ]; do
  set -- $(sh "$WB/orchestrator/memgate.sh" sample)
  case "$1$2" in ""|*[!0-9]*) ok=0 ;; *) if [ "$1" -ge $START_FREE_KB ] && [ "$2" -lt $START_COMMIT_KB ]; then ok=$((ok+1)); else ok=0; fi ;; esac
  say "memgate sample free_kb=$1 commit_kb=$2 ok=$ok"
  [ $ok -lt 3 ] && sleep 30
done
say "start $NAME image $IMG"
eval "$CMD"
sleep 5; docker inspect -f '{{json .Mounts}}' $NAME > "$WB/train/$OUTD/$NAME-inspect.json" 2>/dev/null
low=0
while [ -n "$(docker ps --format '{{.Names}}' | grep "^$NAME\$")" ]; do
  sleep 30
  if STOP_FREE_KB=2621440 STOP_COMMIT_KB=45088768 sh "$WB/orchestrator/memgate.sh" low; then low=$((low+1)); else low=0; fi
  FREE_GB=$(df -BG /c | awk 'NR==2{gsub("G","",$4); print $4}')
  if [ $low -ge 3 ] || [ "${FREE_GB:-0}" -lt 10 ]; then say "stopping $NAME (low=$low, C: ${FREE_GB} GB); rerun to resume"; docker stop $NAME >/dev/null; exit 3; fi
done
if [ -n "$PROBE" ]; then say "probe finished rc=$(cat "$WB/train/probe/probe.rc" 2>/dev/null)"; else say "finished rc=$(cat "$WB/train/heldout/heldout.rc" 2>/dev/null)"; fi
