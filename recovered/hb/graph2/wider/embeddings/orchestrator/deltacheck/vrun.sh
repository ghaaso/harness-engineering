#!/bin/sh
# Gate dynamic checks (deltacheck): start ONE container kge-V<n> on the SCRATCH COPY, after
#   - no kge-* container running (checked before the gate and again right before the start)
#   - C: free >= 20 GB
#   - orchestrator/memgate.sh wait (three samples 30 s apart: free RAM >= 4.5 GB AND commit < 40 GB)
# Mounts: deltacheck/train -> /w/train (rw), deltacheck/fixes -> /w/fixes (rw), deltacheck/work -> /w/v (rw),
#         LANE/export -> /w/export (ro), LANE/export/graphs0 -> /w/export/graphs0 (ro), LANE/eval -> /w/eval (ro).
# The real LANE/train is never mounted. Detached; the command writes logs/<step>.log and logs/<step>.rc.
# usage: sh vrun.sh <n> <step> <cpu|gpu> <workdir> [ENV=VAL ...] -- <cmd...>
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
D=$W/orchestrator/deltacheck; DB=$WB/orchestrator/deltacheck
N=$1; STEP=$2; KIND=$3; WD=$4; shift 4
ENVS=""
while [ "$1" != "--" ]; do ENVS="$ENVS -e $1"; shift; done; shift
NAME=kge-V$N
say() { echo "$(date -u +%FT%TZ) $*" | tee -a "$DB/session.log"; }
kge_running() { docker ps --format '{{.Names}}' | grep '^kge-' | head -1; }
o=$(kge_running); if [ -n "$o" ]; then say "$o is running; not starting $STEP"; exit 1; fi
FREE_GB=$(df -BG /c | awk 'NR==2{gsub("G","",$4); print $4}')
if [ "${FREE_GB:-0}" -lt 20 ]; then say "C: free ${FREE_GB} GB < 20 GB; stopping"; exit 4; fi
say "memgate wait for $STEP ($NAME) ..."
sh "$WB/orchestrator/memgate.sh" wait
o=$(kge_running); if [ -n "$o" ]; then say "$o started meanwhile; not starting $STEP"; exit 1; fi
FREE_GB=$(df -BG /c | awk 'NR==2{gsub("G","",$4); print $4}')
if [ "${FREE_GB:-0}" -lt 20 ]; then say "C: free ${FREE_GB} GB < 20 GB; stopping"; exit 4; fi
say "memgate ok (free_kb commit_kb: $(sh "$WB/orchestrator/memgate.sh" sample)); C: ${FREE_GB} GB free; start $STEP on $KIND"
if [ "$KIND" = "gpu" ]; then IMG=graphtest-kge-gpu:1; GPU="--gpus all"; DEV=cuda; else IMG=graphtest-kge:1; GPU=""; DEV=cpu; fi
mkdir -p "$DB/logs" "$DB/work"
rm -f "$DB/logs/$STEP.rc"
MSYS_NO_PATHCONV=1 docker run -d --rm --name $NAME $GPU --network none --cpus 6 -m 2560m --memory-swap 2560m \
  -e EMB_ROOT=/w -e OMP_NUM_THREADS=6 -e MKL_NUM_THREADS=6 -e PYTHONUNBUFFERED=1 -e PYTHONDONTWRITEBYTECODE=1 -e HOME=/tmp -e PYSTOW_HOME=/tmp/pystow \
  -e KGE_DEVICE=$DEV $ENVS \
  -v $W/export:/w/export:ro -v $W/export/graphs0:/w/export/graphs0:ro -v $W/eval:/w/eval:ro \
  -v $D/train:/w/train -v $D/fixes:/w/fixes -v $D/work:/w/v -v $D/logs:/w/logs \
  -w $WD $IMG sh -c '"$@" > /w/logs/'"$STEP"'.log 2>&1; echo $? > /w/logs/'"$STEP"'.rc' sh "$@"
say "started $NAME for $STEP rc=$?"
