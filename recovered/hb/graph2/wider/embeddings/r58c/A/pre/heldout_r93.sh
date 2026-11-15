#!/bin/sh
# Launcher of the one held-out run (heldout.py, ruling 58) on the card, in ONE container kge-H1; with PROBE=1, the
# ruling-79/86a memory probe in ONE container kge-H1P; with REHEARSAL=<ARM>, ruling 86(b)'s rehearsal of the driver in
# test mode in ONE container kge-H1R (r58c/A/rehearse.sh drives it). Not run by the ruling-58 build; the mounts are
# fixed and auditable (leak_audit.py reads the -v lines of the RUN and PRB blocks below and holds them to ruling 81's
# allow-list).
# Rules: no other kge-* container running; C: free >= 15 GB (rulings 43, 70); ruling 79: start only after three
# memgate samples 30 s apart with free RAM >= 6 GB (6291456 KB) and commit < 38 GB (39845888 KB), and a 4 GB cap
# (-m 4g --memory-swap 4g) for every arm; --network none --cpus 6 --gpus all --pull never, the image resolved to
# its ID once and passed in as KGE_IMAGE_ID (heldout.py refuses unless it equals the item-27 record's, ruling 41);
# stopped after three memgate "low" samples or under 10 GB free (a stopped run resumes: finished units are kept).
# MF-9 (round r58c, ported from orchestrator/guard-stageB.sh, read only): a stopped leftover container of this name is
# removed first (rm_leftover); the card is checked first (card_ok, a throwaway container ${NAME}c); a failed docker run
# is an error (exit 3); the previous rc file is deleted before the launch; every launch, check and end appends a line
# to the launch log $WB/heldout-launch/<NAME>-launch.log (outside train/heldout, append-only); heldout.log is appended.
# Ruling 78 / the coordinator's staging rule (r58c): the staged inputs are built ONCE before the code freeze by
#   node train/heldout_inputs.js build ...; ... export-manifest ...   (see END-ORDER LINES)
# and this launcher only VERIFIES them, it builds nothing: heldout_inputs.js check against heldout_inputs.sha256
# (every staged file, sha256; HD-11) and its sources, verify-export against heldout_export.sha256 (export/graphs and
# export/graphs0 of the 70 held-out parents), both manifests listed in orchestrator/freeze-list.txt with their sha256,
# a freeze check, and the item-27 record's pins and tuning inputs re-hashed on the host (ruling 84). Any failure: exit 8.
# Ruling 81's mounts (exact; leak_audit.py HELDOUT_ALLOW): train/ ro, train/heldout rw, progress.jsonl ro,
# eval/evalcore.py ro, export/ ro, heldout_inputs/facts -> /build/facts/cache, heldout_inputs/common ->
# /build/arms/common, the frozen primary's options record and build/tasks/tasks.jsonl at their /build paths; no GT_*
# path variable (heldout.py and answer_level.py refuse them in the real run, MF-6); nothing under build/sealed/.
# The container's mounts are captured with docker inspect into train/heldout/kge-H1-inspect.json
# (train/probe/kge-H1P-inspect.json) for the leak audit.
# usage: sh heldout.sh                 (DRY=1 sh heldout.sh prints the docker command and exits)
#        PROBE=1 sh heldout.sh         (ruling 79 / 86a probe; heldout.py probe -> train/probe/probe.json)
#        REHEARSAL=<ARM> sh heldout.sh (test mode; r58c/A/rehearse.sh; scratch r58c/rehearsal/<ARM>)
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
GB=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build
STAGE=$W/heldout_inputs
PSTAGE=$W/probe_inputs
RSTAGE=$W/r58c/rehearsal/inputs
PRIM=results/frozen/relational/95e990307da3b42b.json
START_FREE_KB=6291456
START_COMMIT_KB=39845888
if [ -n "$REHEARSAL" ]; then NAME=kge-H1R; OUTD=r58c/rehearsal/$REHEARSAL; RC=$WB/$OUTD/heldout.rc
elif [ -n "$PROBE" ]; then NAME=kge-H1P; OUTD=train/probe; RC=$WB/train/probe/probe.rc
else NAME=kge-H1; OUTD=train/heldout; RC=$WB/train/heldout/heldout.rc; fi
LOG=$WB/heldout-launch/$NAME-launch.log
say() { mkdir -p "$WB/heldout-launch"; echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
IMG=$(docker image inspect graphtest-kge-gpu:1 --format '{{.Id}}' 2>/dev/null | tr -d '\r') || { say "image graphtest-kge-gpu:1 absent"; exit 7; }
[ -n "$IMG" ] || { say "image graphtest-kge-gpu:1 absent"; exit 7; }
COMMON_ENV="-e EMB_ROOT=/w -e KGE_DEVICE=cuda -e KGE_IMAGE_ID=$IMG -e OMP_NUM_THREADS=6 -e MKL_NUM_THREADS=6 -e PYTHONUNBUFFERED=1 \
 -e PYTHONDONTWRITEBYTECODE=1 -e HOME=/tmp -e PYSTOW_HOME=/tmp/pystow -e GT_TMP=/tmp/gt"
RUN="MSYS_NO_PATHCONV=1 docker run -d --rm --pull never --name $NAME --gpus all --network none --cpus 6 -m 4g --memory-swap 4g $COMMON_ENV \
 -v $W/train:/w/train:ro -v $W/train/heldout:/w/train/heldout -v $W/progress.jsonl:/w/progress.jsonl:ro \
 -v $W/eval/evalcore.py:/w/eval/evalcore.py:ro -v $W/export:/w/export:ro \
 -v $STAGE/facts:/build/facts/cache:ro -v $STAGE/common:/build/arms/common:ro \
 -v $GB/$PRIM:/build/$PRIM:ro -v $GB/tasks/tasks.jsonl:/build/tasks/tasks.jsonl:ro \
 -w /w/train $IMG sh -c 'python heldout.py run >> /w/train/heldout/heldout.log 2>&1; echo \$? > /w/train/heldout/heldout.rc'"
PRB="MSYS_NO_PATHCONV=1 docker run -d --rm --pull never --name $NAME --gpus all --network none --cpus 6 -m 4g --memory-swap 4g $COMMON_ENV \
 -v $W/train:/w/train:ro -v $W/train/probe:/w/train/probe -v $W/eval/evalcore.py:/w/eval/evalcore.py:ro -v $W/export:/w/export:ro \
 -v $PSTAGE/facts:/build/facts/cache:ro -v $PSTAGE/common:/build/arms/common:ro -v $GB/$PRIM:/build/$PRIM:ro \
 -w /w/train $IMG sh -c 'python heldout.py probe >> /w/train/probe/probe.log 2>&1; echo \$? > /w/train/probe/probe.rc'"
REH="MSYS_NO_PATHCONV=1 docker run -d --rm --pull never --name $NAME --gpus all --network none --cpus 6 -m 4g --memory-swap 4g $COMMON_ENV \
 -e GT_TASKS=/gt/tasks.jsonl -e REHEARSAL_ARM=$REHEARSAL \
 -v $W/train:/w/train:ro -v $W/eval:/w/eval:ro -v $W/export:/w/export:ro -v $W/r58b/out/fakeB:/w/r58b/out/fakeB:ro \
 -v $W/r58c/A:/w/r58c/A:ro -v $W/$OUTD:/w/$OUTD \
 -v $RSTAGE/facts:/build/facts/cache:ro -v $RSTAGE/common:/build/arms/common:ro -v $GB/$PRIM:/build/$PRIM:ro \
 -v $GB/tasks/tasks.jsonl:/gt/tasks.jsonl:ro -v $GB/tasks/tasks.jsonl:/build/tasks/tasks.jsonl:ro \
 -w /w/train $IMG sh -c 'python /w/r58c/A/rehearsal.py >> /w/$OUTD/heldout.log 2>&1; echo \$? > /w/$OUTD/heldout.rc'"
if [ -n "$REHEARSAL" ]; then CMD=$REH; elif [ -n "$PROBE" ]; then CMD=$PRB; else CMD=$RUN; fi
if [ -n "$DRY" ]; then echo "$CMD"; exit 0; fi
mkdir -p "$WB/$OUTD"
# guard-stageB.sh's helpers, ported (that file is read, never edited)
running() { docker ps --format '{{.Names}}' | grep -q "^$NAME\$"; }
exists_any() { docker ps -a --format '{{.Names}}' | grep -q "^$NAME\$"; }
rm_leftover() { if exists_any && ! running; then say "removing a stopped leftover $NAME"; docker rm $NAME >/dev/null 2>&1; fi; }
card_ok() { MSYS_NO_PATHCONV=1 docker run --rm --pull never --name ${NAME}c --gpus all --network none --cpus 1 -m 1g "$IMG" \
  python -c "import sys, torch; sys.exit(0 if torch.cuda.is_available() else 3)" >/dev/null 2>>"$LOG"; }
say "launch requested: $NAME (image $IMG)"
if [ -z "$PROBE" ] && [ -z "$REHEARSAL" ]; then  # the real run verifies the pre-freeze staging; it builds nothing
  cd "$WB" || exit 8
  if [ ! -f orchestrator/freeze-list.txt ] || ! sha256sum -c --quiet orchestrator/freeze-list.txt >> "$LOG" 2>&1; then
    say "refusing: the freeze check fails (orchestrator/freeze-list.txt)"; exit 8; fi
  for m in heldout_inputs.sha256 heldout_export.sha256; do
    h=$(sha256sum "$m" 2>/dev/null | cut -d' ' -f1)
    if [ -z "$h" ] || ! grep -q "^$h  $m\$" orchestrator/freeze-list.txt; then say "refusing: $m is not in the freeze list with its sha256"; exit 8; fi
  done
  if ! node train/heldout_inputs.js check --plan train/stageB/plan.json --dir heldout_inputs --manifest heldout_inputs.sha256 \
       --facts "$GB/facts/cache" --common "$GB/arms/common" >> "$LOG" 2>&1; then say "refusing: heldout_inputs does not check (ruling 78, HD-11)"; exit 8; fi
  if ! node train/heldout_inputs.js verify-export --plan train/stageB/plan.json --export export --manifest heldout_export.sha256 >> "$LOG" 2>&1; then
    say "refusing: export/graphs or graphs0 of a held-out parent differs from heldout_export.sha256"; exit 8; fi
  if ! node train/heldout_inputs.js pins --record train/heldout/item27.json --root "$W" >> "$LOG" 2>&1; then
    say "refusing: a pin or tuning input of train/heldout/item27.json does not hold on the host (ruling 84)"; exit 8; fi
  say "staging, export, freeze list and pins verified"
fi
if [ -n "$PROBE" ]; then
  node "$WB/train/heldout_inputs.js" check --plan "$WB/train/stageB/plan.json" --dir "$WB/probe_inputs" --manifest "$WB/probe_inputs.sha256" \
    --parents "$(node -e "console.log(require(process.argv[1]).parents.join(','))" "$W/probe_inputs/MANIFEST.json")" >> "$LOG" 2>&1 || { say "refusing: probe_inputs does not check"; exit 8; }
fi
rm_leftover
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
if ! card_ok; then say "refusing: the card is not available to $IMG (card_ok)"; exit 7; fi
rm -f "$RC"; [ -e "$RC" ] && { say "refusing: $RC could not be deleted"; exit 3; }
say "start $NAME image $IMG: $CMD"
if ! eval "$CMD" >> "$LOG" 2>&1; then say "docker run failed for $NAME"; exit 3; fi
sleep 5; docker inspect -f '{{json .Mounts}}' $NAME > "$WB/$OUTD/$NAME-inspect.json" 2>>"$LOG" || say "docker inspect of $NAME failed"
low=0
while running; do
  sleep 30
  if STOP_FREE_KB=2621440 STOP_COMMIT_KB=45088768 sh "$WB/orchestrator/memgate.sh" low; then low=$((low+1)); else low=0; fi
  FREE_GB=$(df -BG /c | awk 'NR==2{gsub("G","",$4); print $4}')
  if [ $low -ge 3 ] || [ "${FREE_GB:-0}" -lt 10 ]; then say "stopping $NAME (low=$low, C: ${FREE_GB} GB); rerun to resume"; docker stop $NAME >/dev/null; exit 3; fi
done
rc=$(cat "$RC" 2>/dev/null)
if [ -z "$PROBE" ] && [ -z "$REHEARSAL" ] && [ -f "$WB/train/heldout/HANDOFF.json" ]; then
  say "finished $NAME rc=${rc:-none} HANDOFF.json sha256 $(sha256sum "$WB/train/heldout/HANDOFF.json" | cut -d' ' -f1)"
else
  say "finished $NAME rc=${rc:-none}"
fi
[ "$rc" = "0" ] || exit 3
