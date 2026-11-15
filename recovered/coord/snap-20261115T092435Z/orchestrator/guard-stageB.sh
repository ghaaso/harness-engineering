#!/bin/sh
# Guarded stage-B launcher on the graphics card (gpu lane, task 7). PREPARED, NOT RUN: start it only after the
# coordinator's check (addendum 8 section L) and the lane lead's go.
#   sh guard-stageB.sh            (from anywhere; log: orchestrator/guard-stageB.log)
# ONE container, kge-B1: --gpus all --network none --cpus 6, memory cap $CAP (from gpu/ timing), KGE_DEVICE=cuda.
# Inside it, $PROCS stage-B processes (stageB.py run; PROCS=2 splits the arms E5 E2 E4 | E1 E3) after the plan.
# Start rule  : orchestrator/memgate.sh wait (three samples 30 s apart: free RAM >= 4.5 GB AND commit < 40 GB),
#               no other kge-* container running, >= 15 GB free on C: (ruling 70), stage-B bytes under the budget.
# Stop rule   : three consecutive `memgate.sh low` samples (free < 2.5 GB or commit > 43 GB, or an unreadable
#               sample), 20 s apart -> docker stop (the unit in flight is redone), then back to the start rule.
# Disk        : C: free checked before launch (>= 15 GB, else wait) and every 20 s while running; under 10 GB -> stop, log, exit 4.
#               Stage-B folder over $BUDGET_KB -> stop, log, exit 5 (stage B + held-out may add 5 GB in all).
# Units       : resumable (stageB.py skips a unit with a done line and its counts.json; a stopped unit is
#               redone; each finished unit deletes its reps.pt after reading its scores back).
# Exit        : 0 all units done (assemble ran per arm); 2 three launches without a finished unit; 3 time limit;
#               4 disk under 20 GB; 5 stage-B bytes over budget; 6 twenty consecutive RenameFailed units;
#               7 image not found locally; 8 PROCS other than 1 without an accepted ruling-66 equality record.
# Others      : (rulings 63-66 follow-up) while another kge-* container exists the guard does not launch; if one
#               appears while kge-B1 runs (seen twice, 20 s apart) the guard stops kge-B1 itself, waits, and
#               relaunches once no other kge-* is left. Only a launch whose container ENDED BY ITSELF (it wrote
#               stageB/guard.rc) without a new finished unit counts toward exit 2; a stop by the guard (memory,
#               another kge-* container) or by someone else (no guard.rc: docker stop / kill from outside) does not.
# Ruling 66   : every part records STAGEB_RUNNER and STAGEB_PROCS (set here); neither is in the plan hash.
# Before each launch (release-gate round, 2026-11-14): a stopped leftover kge-B1 is removed (operations-03);
#               progress*.jsonl lines that do not decode move to <file>.torn and the files end in a newline; every
#               done unit's files are read back and a bad unit folder moves to stageB/quarantine/ so it is redone
#               (operations-02; guard-prelaunch.js); the card must be visible in a throwaway container kge-B1c
#               (device-06). The image is resolved to its ID at start, logged, and every docker run uses that ID
#               with --pull never (operations-07). While kge-B1 runs, 20 consecutive failed units carrying
#               RenameFailed stop it and the guard (exit 6, operations-10).
# Tests       : GUARD_LIB=1 . guard-stageB.sh defines the functions and returns before the loop (fixes/tests/).
WD=${GUARD_WD:-C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings}
WB=${GUARD_WB:-/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings}
NAME=kge-B1
IMAGE=${IMAGE:-graphtest-kge-gpu:1}
CAP=${CAP:-2560m}         # 2g is the lowest cap that ran every arm (E4 anon RSS 1.9-2.0 GB, epochs 6-19 % slower); 2560m keeps headroom
PROCS=${PROCS:-1}         # 2 at once: x1.30 (E1) / x1.66 (E4) throughput but E4 x2 hit a 4 GB cap; 3: E4 OOM-killed at 4 GB
LANES=${LANES:-1}         # projection lanes in the plan (STAGEB_LANES); one process -> 1; s = 1 at 14.4 h
MIN_FREE_GB=10        # ruling 70: stop under 10 GB free on C: (also STAGEB_MIN_FREE_GB)
START_FREE_GB=15      # ruling 70: launch only at >= 15 GB free
BUDGET_KB=${BUDGET_KB:-4194304}   # 4 GB for stage B, leaving 1 GB of the 5 GB for the held-out run
MAX_HOURS=${MAX_HOURS:-120}
MAX_RENAME_FAILS=${MAX_RENAME_FAILS:-20}
PROG=$WB/train/progress.jsonl
PLAN=$WB/train/stageB/plan.json
LOG=$WB/orchestrator/guard-stageB.log
# Stop thresholds (coordinator 2026-11-14 ~14:20Z): yield before the ship alarm (44 GB commit / 2 GB free).
export STOP_FREE_KB=2621440 STOP_COMMIT_KB=45088768   # 2.5 GB free, 43 GB commit
GATE="sh $WB/orchestrator/memgate.sh"
RC=$WB/train/stageB/guard.rc   # written by the container's shell when its command ends by itself
HELP="node $WD/orchestrator/guard-prelaunch.js"

say() { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
running() { docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^$NAME\$"; }
exists_any() { docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^$NAME\$"; }
others() { docker ps --format '{{.Names}}' 2>/dev/null | grep '^kge-' | grep -v "^$NAME\$" | head -1; }
free_gb() { df -BG /c | awk 'NR==2{gsub("G","",$4); print $4}'; }
sb_kb() { du -sk "$WB/train/stageB" 2>/dev/null | awk '{print $1}'; }
# units left (every progress*.jsonl in train/; -1 = no plan yet) and distinct finished stage-B units (the plan included)
left() { $HELP left "$WD/train" "$WD/train/stageB/plan.json"; }
done_n() { $HELP donen "$WD/train"; }
rename_fails() { $HELP renamefails "$WD/train"; }
logger_start() {
  nvidia-smi --query-gpu=timestamp,temperature.gpu,power.draw,utilization.gpu,memory.used --format=csv,noheader -l 30 >> "$WB/gpu/gpu-load.tsv" &
  LOGGER=$!; WINPID=$(cat /proc/$LOGGER/winpid 2>/dev/null)
}
logger_stop() { [ -n "$LOGGER" ] && kill $LOGGER 2>/dev/null; [ -n "$WINPID" ] && taskkill //F //PID $WINPID >/dev/null 2>&1; LOGGER=; WINPID=; }
stop_container() { SELF_STOP="${1:-guard}"; docker stop -t 20 $NAME >/dev/null 2>&1; logger_stop; }
# operations-07: the image by ID, never pulled
resolve_image() { IMGID=$(docker image inspect -f '{{.Id}}' "$IMAGE" 2>/dev/null | tr -d '\r'); [ -n "$IMGID" ]; }
# operations-08 / ruling 66: more than one process needs an accepted equality record in RUNLOG
procs_ok() {
  [ "$PROCS" = "1" ] && return 0
  grep -q "ruling 66 equality accepted: procs=$PROCS\$" "$WB/train/RUNLOG.md" 2>/dev/null
}
# operations-03: a stopped leftover kge-B1 blocks docker run --name
rm_leftover() {
  if exists_any && ! running; then say "removing a stopped leftover $NAME"; docker rm $NAME >/dev/null 2>&1; fi
}
# operations-02: torn progress lines aside, trailing newline, done units read back (bad ones to quarantine)
repair() {
  r1=$($HELP sanitize "$WD/train" 2>&1); r2=$($HELP validate "$WD/train" 2>&1)
  say "pre-launch: $r1; $(echo "$r2" | tail -1)"
  echo "$r2" | grep '^quarantined' | while read -r l; do say "$l"; done
}
# device-06: the card must be visible before a launch
card_ok() {
  MSYS_NO_PATHCONV=1 docker run --rm --pull never --name ${NAME}c --gpus all --network none --cpus 1 -m 1g \
    "$IMGID" python -c "import sys, torch; sys.exit(0 if torch.cuda.is_available() else 3)" >/dev/null 2>>"$LOG"
}
launch() {
  if [ "$PROCS" -ge 2 ]; then
    CMD='python stageB.py plan && { { python stageB.py run --wait E5 E2 && python detrun.py run --wait E4; } & python stageB.py run --wait E1 E3 & wait; }'   # ruling 67: E4 deterministic; gated by procs_ok
  else
    CMD='python stageB.py run --plan E1 E5 E2 E3 && python detrun.py run E4'   # rulings 67, 69: B's order E1 E5 E2 E3 E4; E4 deterministic
  fi
  MSYS_NO_PATHCONV=1 docker run -d --rm --pull never --name $NAME --gpus all --network none --cpus 6 -m $CAP --memory-swap $CAP \
    -e EMB_ROOT=/w -e OMP_NUM_THREADS=6 -e MKL_NUM_THREADS=6 -e PYTHONUNBUFFERED=1 -e HOME=/tmp -e PYSTOW_HOME=/tmp/pystow \
    -e KGE_DEVICE=cuda -e STAGEB_LANES=$LANES -e STAGEB_MIN_FREE_GB=$MIN_FREE_GB \
    -e STAGEB_PROCS=$PROCS -e "STAGEB_RUNNER=guard-stageB.sh $NAME procs=$PROCS image=$IMGID" \
    -v $WD/export:/w/export:ro -v $WD/eval:/w/eval:ro -v $WD/train:/w/train \
    -w /w/train "$IMGID" sh -c "mkdir -p /w/train/stageB; { $CMD; }; echo \$? > /w/train/stageB/guard.rc"
  # sh is PID 1 and ignores SIGTERM, so a docker stop ends in SIGKILL and writes no guard.rc
}
[ -n "$GUARD_LIB" ] && return 0 2>/dev/null
trap 'logger_stop' EXIT

if ! procs_ok; then say "PROCS=$PROCS without 'ruling 66 equality accepted: procs=$PROCS' in RUNLOG.md: not starting"; exit 8; fi
if ! resolve_image; then say "image $IMAGE not found locally (never pulled): not starting"; exit 7; fi
low=0; stuck=0; at_launch=; t0=$(date +%s); last_du=0; SELF_STOP=; seen_other=0
say "guard start: image $IMAGE = $IMGID, cap $CAP, procs $PROCS, lanes $LANES, units left $(left) (-1 = plan not written yet), C: free $(free_gb) GB"
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
    rf=$(rename_fails)
    if [ "${rf:-0}" -ge $MAX_RENAME_FAILS ]; then
      say "$rf consecutive units failed with RenameFailed: stopping $NAME and the guard (a persistent rename fault needs a person)"
      stop_container renamefail; exit 6
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
    rf=$(rename_fails)
    if [ "${rf:-0}" -ge $MAX_RENAME_FAILS ]; then say "$rf consecutive units failed with RenameFailed: not launching"; exit 6; fi
    if [ $(( $(date +%s) - t0 )) -gt $((MAX_HOURS * 3600)) ]; then say "guard time limit ($MAX_HOURS h) reached with $n units left"; exit 3; fi
    if ! docker info >/dev/null 2>&1; then sleep 120; continue; fi
    o=$(others); if [ -n "$o" ]; then say "waiting: $o is running"; sleep 120; continue; fi
    $GATE wait                                     # blocks until three good samples 30 s apart
    o=$(others); if [ -n "$o" ]; then sleep 30; continue; fi
    f=$(free_gb)
    if [ "${f:-0}" -lt $START_FREE_GB ]; then say "C: free ${f} GB under ${START_FREE_GB} GB: not launching"; sleep 300; continue; fi
    k=$(sb_kb); if [ "${k:-0}" -gt $BUDGET_KB ]; then say "stage-B folder ${k} KB over budget: not launching"; exit 5; fi
    cur=$(docker image inspect -f '{{.Id}}' "$IMAGE" 2>/dev/null | tr -d '\r')
    [ "$cur" != "$IMGID" ] && say "note: $IMAGE now resolves to ${cur:-nothing}; still launching the logged $IMGID"
    rm_leftover
    repair
    if ! card_ok; then
      say "the card is not visible in a container (torch.cuda.is_available() false or docker error): not launching"
      stuck=$((stuck+1)); [ $stuck -ge 3 ] && { say "stopping the guard: three launch attempts without a card"; exit 2; }
      sleep 120; continue
    fi
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
