#!/bin/sh
# Guarded stage-B launcher on the graphics card (gpu lane, task 7). PREPARED, NOT RUN: start it only after the
# coordinator's check (addendum 8 section L) and the lane lead's go.
#   sh guard-stageB.sh            (from anywhere; log: orchestrator/guard-stageB.log)
# ONE container, kge-B1: --gpus all --network none --cpus 6, memory cap $CAP (from gpu/ timing), KGE_DEVICE=cuda.
# Inside it, $PROCS stage-B processes (stageB.py run; PROCS=2 splits the arms E5 E2 E4 | E1 E3) after the plan.
# Start rule  : orchestrator/memgate.sh wait (three samples 30 s apart: free RAM >= 4.5 GB AND commit < 40 GB),
#               no other kge-* container running, >= 20 GB free on C:, stage-B bytes under the budget.
# Stop rule   : three consecutive `memgate.sh low` samples (free < 2.0 GB or commit > 48.5 GB), 20 s apart
#               -> docker stop (the unit in flight is redone), then back to the start rule.
# Disk        : C: free checked before launch and every 20 s while running; under 20 GB -> stop, log, exit 4.
#               Stage-B folder over $BUDGET_KB -> stop, log, exit 5 (stage B + held-out may add 5 GB in all).
# Units       : resumable (stageB.py skips a unit with a done line and its counts.json; a stopped unit is
#               redone; each finished unit deletes its reps.pt after reading its scores back).
# Exit        : 0 all units done (assemble ran per arm); 2 three launches without a finished unit; 3 time limit;
#               4 disk under 20 GB; 5 stage-B bytes over budget.
# Others      : (rulings 63-66 follow-up) while another kge-* container exists the guard does not launch; if one
#               appears while kge-B1 runs (seen twice, 20 s apart) the guard stops kge-B1 itself, waits, and
#               relaunches once no other kge-* is left. Only a launch whose container ENDED BY ITSELF (it wrote
#               stageB/guard.rc) without a new finished unit counts toward exit 2; a stop by the guard (memory,
#               another kge-* container) or by someone else (no guard.rc: docker stop / kill from outside) does not.
# Ruling 66   : every part records STAGEB_RUNNER and STAGEB_PROCS (set here); neither is in the plan hash.
WD=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
NAME=kge-B1
CAP=${CAP:-2560m}         # 2g is the lowest cap that ran every arm (E4 anon RSS 1.9-2.0 GB, epochs 6-19 % slower); 2560m keeps headroom
PROCS=${PROCS:-1}         # 2 at once: x1.30 (E1) / x1.66 (E4) throughput but E4 x2 hit a 4 GB cap; 3: E4 OOM-killed at 4 GB
LANES=${LANES:-1}         # projection lanes in the plan (STAGEB_LANES); one process -> 1; s = 1 at 14.4 h
MIN_FREE_GB=20
BUDGET_KB=${BUDGET_KB:-4194304}   # 4 GB for stage B, leaving 1 GB of the 5 GB for the held-out run
MAX_HOURS=${MAX_HOURS:-120}
PROG=$WB/train/progress.jsonl
PLAN=$WB/train/stageB/plan.json
LOG=$WB/orchestrator/guard-stageB.log
GATE="sh $WB/orchestrator/memgate.sh"
RC=$WB/train/stageB/guard.rc   # written by the container's shell when its command ends by itself

say() { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
running() { docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^$NAME\$"; }
others() { docker ps --format '{{.Names}}' 2>/dev/null | grep '^kge-' | grep -v "^$NAME\$" | head -1; }
free_gb() { df -BG /c | awk 'NR==2{gsub("G","",$4); print $4}'; }
sb_kb() { du -sk "$WB/train/stageB" 2>/dev/null | awk '{print $1}'; }
# units left: 5 arms x 3 configs x 3 seeds x plan checkpoints, minus distinct done stage-B units (-1 = no plan yet)
left() {
  [ -f "$PLAN" ] || { echo -1; return; }
  node -e '
    const fs=require("fs"); const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
    let n=0; for (const a of Object.keys(p.configs)) n += p.configs[a].length*3*p.checkpoints.length;
    const d=new Set(); for (const l of fs.readFileSync(process.argv[2],"utf8").split("\n")) { if(!l.trim()) continue;
      try { const r=JSON.parse(l); if (r.step==="stageB" && r.status==="done" && r.unit!=="plan") d.add(r.unit); } catch(e){} }
    console.log(n-d.size);' "$(cygpath -w "$PLAN")" "$(cygpath -w "$PROG")"
}
# distinct finished stage-B units, the plan included (progress = this count went up)
done_n() { grep '"step": "stageB"' "$PROG" 2>/dev/null | grep '"status": "done"' | grep -o '"unit": "[^"]*"' | sort -u | wc -l; }
logger_start() {
  nvidia-smi --query-gpu=timestamp,temperature.gpu,power.draw,utilization.gpu,memory.used --format=csv,noheader -l 30 >> "$WB/gpu/gpu-load.tsv" &
  LOGGER=$!; WINPID=$(cat /proc/$LOGGER/winpid 2>/dev/null)
}
logger_stop() { [ -n "$LOGGER" ] && kill $LOGGER 2>/dev/null; [ -n "$WINPID" ] && taskkill //F //PID $WINPID >/dev/null 2>&1; LOGGER=; WINPID=; }
stop_container() { SELF_STOP="${1:-guard}"; docker stop -t 20 $NAME >/dev/null 2>&1; logger_stop; }
launch() {
  if [ "$PROCS" -ge 2 ]; then
    CMD='python stageB.py plan && { python stageB.py run --wait E5 E2 E4 & python stageB.py run --wait E1 E3 & wait; }'
  else
    CMD='python stageB.py run --plan E5 E2 E4 E1 E3'
  fi
  MSYS_NO_PATHCONV=1 docker run -d --rm --name $NAME --gpus all --network none --cpus 6 -m $CAP --memory-swap $CAP \
    -e EMB_ROOT=/w -e OMP_NUM_THREADS=6 -e MKL_NUM_THREADS=6 -e PYTHONUNBUFFERED=1 -e HOME=/tmp -e PYSTOW_HOME=/tmp/pystow \
    -e KGE_DEVICE=cuda -e STAGEB_LANES=$LANES -e STAGEB_MIN_FREE_GB=$MIN_FREE_GB \
    -e STAGEB_PROCS=$PROCS -e "STAGEB_RUNNER=guard-stageB.sh $NAME procs=$PROCS" \
    -v $WD/export:/w/export:ro -v $WD/eval:/w/eval:ro -v $WD/train:/w/train \
    -w /w/train graphtest-kge-gpu:1 sh -c "mkdir -p /w/train/stageB; { $CMD; }; echo \$? > /w/train/stageB/guard.rc"
  # sh is PID 1 and ignores SIGTERM, so a docker stop ends in SIGKILL and writes no guard.rc
}
trap 'logger_stop' EXIT

low=0; stuck=0; at_launch=; t0=$(date +%s); last_du=0; SELF_STOP=; seen_other=0
say "guard start: cap $CAP, procs $PROCS, lanes $LANES, units left $(left) (-1 = plan not written yet), C: free $(free_gb) GB"
while :; do
  if running; then
    f=$(free_gb)
    if [ "${f:-0}" -lt $MIN_FREE_GB ]; then say "C: free ${f} GB under ${MIN_FREE_GB} GB: stopping $NAME"; stop_container; exit 4; fi
    if [ $(( $(date +%s) - last_du )) -ge 300 ]; then
      last_du=$(date +%s); k=$(sb_kb)
      if [ "${k:-0}" -gt $BUDGET_KB ]; then say "stage-B folder ${k} KB over budget ${BUDGET_KB} KB: stopping $NAME"; stop_container; exit 5; fi
    fi
    if $GATE low; then low=$((low+1)); else low=0; fi
    if [ $low -ge 3 ]; then
      say "memgate low three times ($($GATE sample)): stopping $NAME ($(left) units left)"
      stop_container memory; low=0
    fi
    o=$(others)
    if [ -n "$o" ]; then seen_other=$((seen_other+1)); else seen_other=0; fi
    if [ $seen_other -ge 2 ]; then
      say "$o is running beside $NAME: stopping $NAME (the unit in flight is redone; not counted)"
      stop_container other; seen_other=0
    fi
    sleep 20
  else
    logger_stop
    n=$(left)
    if [ "$n" -eq 0 ]; then say "stage B complete: no unit left (assemble ran per arm)"; exit 0; fi
    if [ -n "$at_launch" ]; then
      if [ -n "$SELF_STOP" ]; then how="stopped by the guard ($SELF_STOP)"
      elif [ -f "$RC" ]; then how="ended by itself (rc $(cat "$RC"))"
      else how="stopped from outside (no guard.rc)"; fi
      if [ "$(done_n)" -gt "$at_launch" ]; then
        stuck=0; say "container $how; units finished during the launch"
      elif [ -f "$RC" ] && [ -z "$SELF_STOP" ]; then
        stuck=$((stuck+1)); say "container $how with no unit finished ($n left; $stuck of 3)"
      else
        say "container $how with no unit finished ($n left; not counted, $stuck of 3)"
      fi
      at_launch=; SELF_STOP=
      if [ $stuck -ge 3 ]; then say "stopping the guard: three launches finished no unit"; exit 2; fi
    fi
    if [ $(( $(date +%s) - t0 )) -gt $((MAX_HOURS * 3600)) ]; then say "guard time limit ($MAX_HOURS h) reached with $n units left"; exit 3; fi
    if ! docker info >/dev/null 2>&1; then sleep 120; continue; fi
    o=$(others); if [ -n "$o" ]; then say "waiting: $o is running"; sleep 120; continue; fi
    $GATE wait                                     # blocks until three good samples 30 s apart
    o=$(others); if [ -n "$o" ]; then sleep 30; continue; fi
    f=$(free_gb)
    if [ "${f:-0}" -lt $MIN_FREE_GB ]; then say "C: free ${f} GB under ${MIN_FREE_GB} GB: not launching"; exit 4; fi
    k=$(sb_kb); if [ "${k:-0}" -gt $BUDGET_KB ]; then say "stage-B folder ${k} KB over budget: not launching"; exit 5; fi
    rm -f "$RC"; SELF_STOP=
    if launch >/dev/null 2>>"$LOG"; then
      logger_start; at_launch=$(done_n)
      say "launched $NAME ($($GATE sample) free_kb commit_kb; C: ${f} GB free; stage B ${k:-0} KB; units left $n)"
    else
      say "launch failed"; stuck=$((stuck+1)); [ $stuck -ge 3 ] && exit 2; sleep 60
    fi
    sleep 30
  fi
done
