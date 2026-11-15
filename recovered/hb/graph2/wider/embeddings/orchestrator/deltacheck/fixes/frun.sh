#!/bin/sh
# Pre-run fixes container runner (2026-11-14). ONE container (kge-F1) at a time, always after memgate wait and a
# C: free-disk check (stop under 20 GB). --network none --cpus 6 -m 2560m; train/, export/, eval/ read-only;
# fixes/ writable. Restartable: the caller skips steps with a done line in fixes/progress.jsonl.
# usage: sh frun.sh <step> <cpu|gpu> <pre|post> [ENV=VAL ...] -- <cmd...>
#   pre  = the pre-fix files of fixes/pre_m bind-mounted over their paths (so the old code runs at its own paths)
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
if [ "$1" = "--done" ]; then
  LOGN=$(echo $2 | tr "/" "_"); RC=$(cat "$WB/fixes/logs/$LOGN.rc" 2>/dev/null)
  echo "$(date -u +%FT%TZ) $2 finished rc=${RC:-none}" >> "$WB/fixes/session.log"
  [ "$RC" = "0" ] && echo "{\"step\": \"fixes\", \"unit\": \"$2\", \"status\": \"done\", \"t\": \"$(date -u +%FT%TZ)\"}" >> "$WB/fixes/progress.jsonl"
  echo "rc=${RC:-none}"; exit 0
fi
STEP=$1; KIND=$2; CODE=$3; shift 3
ENVS=""
while [ "$1" != "--" ]; do ENVS="$ENVS -e $1"; shift; done; shift
NAME=kge-F1
say() { echo "$(date -u +%FT%TZ) $*" | tee -a "$WB/fixes/session.log"; }
if grep -q "\"unit\": *\"$STEP\".*\"status\": *\"done\"" "$WB/fixes/progress.jsonl" 2>/dev/null; then say "skip $STEP (done)"; exit 0; fi
if docker ps --format '{{.Names}}' | grep -q '^kge-'; then say "a kge-* container is running; not starting $STEP"; exit 1; fi
FREE_GB=$(df -BG /c | awk 'NR==2{gsub("G","",$4); print $4}')
if [ "${FREE_GB:-0}" -lt 20 ]; then say "C: free ${FREE_GB} GB < 20 GB; stopping"; exit 4; fi
say "memgate wait for $STEP ..."
sh "$WB/orchestrator/memgate.sh" wait
say "memgate ok ($(sh "$WB/orchestrator/memgate.sh" sample)); disk ${FREE_GB} GB; start $STEP ($KIND, $CODE)"
OVL=""
if [ "$CODE" = "pre" ]; then
  for f in stageB kge selectB report proj; do OVL="$OVL -v $W/fixes/pre_m/$f.py:/w/train/$f.py:ro"; done
  OVL="$OVL -v $W/fixes/pre_m/checkpoints.py:/w/export/checkpoints.py:ro"
fi
if [ "$KIND" = "gpu" ]; then IMG=graphtest-kge-gpu:1; GPU="--gpus all"; DEV=cuda; else IMG=graphtest-kge:1; GPU=""; DEV=cpu; fi
mkdir -p "$WB/fixes/logs"
LOGN=$(echo $STEP | tr "/" "_")
rm -f "$WB/fixes/logs/$LOGN.rc"
# detached; the command writes its own log and exit code under fixes/logs (the caller waits with docker wait kge-F1,
# then runs: sh frun.sh --done <step>)
MSYS_NO_PATHCONV=1 docker run -d --rm --name $NAME $GPU --network none --cpus 6 -m 2560m --memory-swap 2560m   -e EMB_ROOT=/w -e OMP_NUM_THREADS=6 -e MKL_NUM_THREADS=6 -e PYTHONUNBUFFERED=1 -e PYTHONDONTWRITEBYTECODE=1 -e HOME=/tmp -e PYSTOW_HOME=/tmp/pystow   -e KGE_DEVICE=$DEV -e CODE=$CODE $ENVS   -v $W/export:/w/export:ro -v $W/eval:/w/eval:ro -v $W/train:/w/train:ro -v $W/fixes:/w/fixes $OVL   -w /w/fixes $IMG sh -c '"$@" > /w/fixes/logs/'"$LOGN"'.log 2>&1; echo $? > /w/fixes/logs/'"$LOGN"'.rc' sh "$@"
say "started $NAME for $STEP rc=$?"
