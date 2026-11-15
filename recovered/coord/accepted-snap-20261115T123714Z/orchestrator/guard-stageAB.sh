#!/bin/sh
# Two-container stage-B guard (ruling 69). PREPARED, NOT RUN. It replaces guard-stageB.sh only through the swap below,
# after the coordinator approves; guard-stageB.sh, memgate.sh and guard-prelaunch.js stay unchanged.
#   sh guard-stageAB.sh                (log: orchestrator/guard-stageAB.log)
# Containers  : B = kge-B1 (train/progress.jsonl, stageB/guard.rc) runs `stageB.py run --plan E1 E5 E2 E3`, plus
#               `&& detrun.py run E4` only while A may not take E4 (below). A = kge-A1 (train/progress-A.jsonl,
#               stageB/guard-A.rc) runs `python detrun.py run E4` (ruling 67). Each model type belongs to exactly one
#               container at a time. Both: --gpus all --network none --cpus 6 --pull never, the image by ID; -m $CAP (B, 2560m) or $CAP_A (A, 3g).
#               STAGEB_RUNNER = "guard-stageAB.sh <name> procs=1 containers=<1|2> image=<id>" (+ " det=1" from
#               detrun.py); containers=2 when the launch was made with A allowed, 1 when B runs everything alone.
# A allowed   : orchestrator/equality-accepted.json exists and parses as a JSON object (ruling 69 iii), no
#               orchestrator/A-retired and no orchestrator/sidebyside-stop-E4 file, and B's own progress file has no
#               stage-B E4 line (ruling 69: "before any E4 unit has run"). Otherwise B keeps E4 (deterministic, last).
#               A running when it stops being allowed is stopped at once. A sidebyside-stop-<arm> file for one of
#               B's arms (written by rerun_compare.py on a mismatch) keeps A stopped while B has units of that arm left.
# Siblings    : kge-B1, kge-A1 and their card checks kge-B1c / kge-A1c are this guard's own; any other kge-* container
#               seen running twice in a row stops both (A first), and nothing launches while one runs.
# Memory      : one host sample (memgate.sh sample) per check, both rules read from it; an unreadable sample is low
#               for both and starts nothing (fail closed, as memgate.sh).
#               B  start: three samples >= 30 s apart with free >= 4.5 GB and commit < 40 GB (memgate.sh wait).
#                  stop : three consecutive samples with free < 2.5 GB or commit > 43 GB (guard-stageB.sh's lines);
#                         A is stopped before B in that same check.
#               A  start: three samples >= 30 s apart with free >= 6 GB and commit < 38 GB, all taken after B's last
#                         launch (ruling 69).
#                  stop : three consecutive samples with free < 4 GB or commit > 41 GB (ruling 69: A gives way first).
# Disk        : launch only at C: free >= 15 GB; any own container running and C: < 10 GB -> stop both, exit 4
#               (ruling 70). Stage-B folder over $BUDGET_KB -> stop both, exit 5.
# Pre-launch  : a stopped leftover of THAT container is removed; guard-prelaunch-ab.js sanitizes only THAT
#               container's progress file and validates/quarantines only THAT container's model types; the card must
#               be visible in a throwaway <name>c container.
# Adoption    : a kge-B1 / kge-A1 already running when this guard starts is adopted, not restarted. An adopted or
#               running B whose command still holds E4 while A is allowed is drained: stopped right after its next
#               progress line (a unit boundary, at most a few seconds of the next unit lost), or after $DRAIN_MAX s
#               (one unit redone), then relaunched without E4.
# Exit        : 0 no unit left for either container; 2 three self-ended launches of one container without a finished
#               unit, or three launch failures; 3 time limit; 4 disk; 5 stage-B bytes over budget; 6 twenty
#               consecutive RenameFailed units in one container's file; 7 image not found locally.
# Tests       : GUARD_LIB=1 . guard-stageAB.sh defines the functions and returns before the loop
#               (parallel/tests/test_guard_stageAB.sh, fake docker and powershell on PATH).
#
# SWAP (guard-stageB.sh -> guard-stageAB.sh), after the coordinator's approval:
#   1. Preconditions: parallel/tests/test_guard_stageAB.sh says RESULT PASS on this file's sha256; the ruling-69 (ii)
#      equality table passed. A starts only once orchestrator/equality-accepted.json exists; before that this guard
#      behaves like guard-stageB.sh (B runs E1 E5 E2 E3 then E4), so the swap may come first.
#   2. Run ONE command, in the background, from the session that owns the guard:
#        sh <lane>/orchestrator/swap-to-stageAB.sh go
#      It finds the running `sh guard-stageB.sh` (by /proc/<pid>/cmdline), sends it TERM, kills that guard's
#      nvidia-smi logger by its Windows pid, checks that the old guard is gone, and then exec's this guard. kge-B1 is
#      NOT stopped by the swap: `docker run -d` keeps it running, and this guard adopts it. If A is allowed at that
#      moment, B is drained at its next unit boundary (normally nothing redone; worst case one unit redone after
#      $DRAIN_MAX s) and relaunched without E4; A launches after three fresh samples.
#      `sh swap-to-stageAB.sh check` only prints what `go` would do.
#   3. Watchers that read orchestrator/guard-stageB.log must read orchestrator/guard-stageAB.log from then on.
#   Rollback: kill the new guard (TERM); `docker stop kge-A1` (its unit in flight is redone); start guard-stageB.sh
#   again. guard-stageB.sh stops kge-B1 once if kge-A1 is still up (it is "another kge-*").
WD=${GUARD_WD:-C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings}
WB=${GUARD_WB:-/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings}
IMAGE=${IMAGE:-graphtest-kge-gpu:1}
CAP=${CAP:-2560m}
CAP_A=${CAP_A:-3g}      # coordinator 2026-11-14 ~16:20Z: deterministic E4 anon memory 1.5-1.83 GB and growing; A gets 3g, B keeps 2560m
LANES=1
MIN_FREE_GB=10            # ruling 70
START_FREE_GB=15          # ruling 70
BUDGET_KB=${BUDGET_KB:-4194304}
MAX_HOURS=${MAX_HOURS:-120}
MAX_RENAME_FAILS=20
TICK=${TICK:-20}          # seconds between checks
SPACING=${SPACING:-30}    # start samples count only when >= SPACING s apart (memgate.sh wait: 30 s)
DRAIN_MAX=${DRAIN_MAX:-600}
STOP_T=${STOP_T:-20}
LOG=$WB/orchestrator/guard-stageAB.log
GATE="sh $WB/orchestrator/memgate.sh"
HELP="node $WD/orchestrator/guard-prelaunch-ab.js"
ACCEPT=$WD/orchestrator/equality-accepted.json
RETIRE=$WB/orchestrator/A-retired
PLAN=$WD/train/stageB/plan.json
# memory lines in KB (GB = KB / 2^20, the lane gates' units)
B_START_FREE=4718592;  B_START_COMMIT=41943040   # memgate.sh: 4.5 GB, 40 GB
B_STOP_FREE=2621440;   B_STOP_COMMIT=45088768    # guard-stageB.sh / ruling 43 as amended: 2.5 GB, 43 GB
A_START_FREE=6291456;  A_START_COMMIT=39845888   # ruling 69: 6 GB, 38 GB
A_STOP_FREE=4194304;   A_STOP_COMMIT=42991616    # ruling 69: 4 GB, 41 GB
B_ARMS_OWN=E1,E5,E2,E3

say() { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
num() { case "$1" in ""|*[!0-9]*) return 1 ;; esac; }
get() { eval "echo \"\${$1}\""; }
put() { eval "$1=\"\$2\""; }
nm() { [ "$1" = A ] && echo kge-A1 || echo kge-B1; }
progf() { [ "$1" = A ] && echo progress-A.jsonl || echo progress.jsonl; }
rcf() { [ "$1" = A ] && echo "$WB/train/stageB/guard-A.rc" || echo "$WB/train/stageB/guard.rc"; }
free_gb() { df -BG /c | awk 'NR==2{gsub("G","",$4); print $4}'; }
sb_kb() { du -sk "$WB/train/stageB" 2>/dev/null | awk '{print $1}'; }
resolve_image() { IMGID=$(docker image inspect -f '{{.Id}}' "$IMAGE" 2>/dev/null | tr -d '\r'); [ -n "$IMGID" ]; }
ps_names() { PS=$(docker ps --format '{{.Names}}' 2>/dev/null | tr -d '\r'); }
is_up() { echo "$PS" | grep -qx "$(nm $1)"; }
foreign() { echo "$PS" | grep '^kge-' | grep -vx -e kge-A1 -e kge-B1 -e kge-A1c -e kge-B1c | head -1; }
left_of() { $HELP left "$WD/train" "$PLAN" "$1"; }
donen_of() { $HELP donen "$WD/train" "$1"; }

# ---- memory: one sample, both rules
sample_mem() { set -- $($GATE sample); MF=$1; MC=$2; if num "$MF" && num "$MC"; then MEMOK=1; else MEMOK=0; fi; }
low_of() {    # low_of A|B -> 0 when that container's stop condition holds in the current sample
  [ $MEMOK = 1 ] || return 0
  if [ "$1" = A ]; then [ "$MF" -lt $A_STOP_FREE ] || [ "$MC" -gt $A_STOP_COMMIT ]
  else [ "$MF" -lt $B_STOP_FREE ] || [ "$MC" -gt $B_STOP_COMMIT ]; fi
}
startable_of() {
  [ $MEMOK = 1 ] || return 1
  if [ "$1" = A ]; then [ "$MF" -ge $A_START_FREE ] && [ "$MC" -lt $A_START_COMMIT ]
  else [ "$MF" -ge $B_START_FREE ] && [ "$MC" -lt $B_START_COMMIT ]; fi
}

# ---- ruling 69: may A hold E4 now?
a_allowed() {
  if [ ! -f "$ACCEPT" ]; then WHY_A="no orchestrator/equality-accepted.json"; return 1; fi
  if ! node -e 'const o=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); process.exit(o&&typeof o==="object"&&!Array.isArray(o)?0:1)' "$ACCEPT" 2>/dev/null; then
    WHY_A="equality-accepted.json is not a JSON object"; return 1; fi
  if [ -f "$RETIRE" ]; then WHY_A="orchestrator/A-retired exists"; return 1; fi
  if [ -f "$WB/orchestrator/sidebyside-stop-E4" ]; then WHY_A="sidebyside-stop-E4 exists (E4 re-run mismatch)"; return 1; fi
  n=$($HELP armlines "$WD/train" progress.jsonl E4)
  if [ "$n" != 0 ]; then WHY_A="B's progress file already has $n stage-B E4 line(s)"; return 1; fi
  WHY_A=; return 0
}
# a sidebyside-stop-<arm> marker for one of B's arms keeps A off while B has units of that arm left
a_paused() {
  for a in E1 E5 E2 E3; do
    if [ -f "$WB/orchestrator/sidebyside-stop-$a" ] && [ "$(left_of $a)" != 0 ]; then WHY_P="sidebyside-stop-$a and B has $a units left"; return 0; fi
  done
  WHY_P=; return 1
}

# ---- container actions
logger_start() {
  [ -n "$LOGGER" ] && return 0
  nvidia-smi --query-gpu=timestamp,temperature.gpu,power.draw,utilization.gpu,memory.used --format=csv,noheader -l 30 >> "$WB/gpu/gpu-load.tsv" 2>/dev/null &
  LOGGER=$!; WINPID=$(cat /proc/$LOGGER/winpid 2>/dev/null)
}
logger_stop() { [ -n "$LOGGER" ] && kill $LOGGER 2>/dev/null; [ -n "$WINPID" ] && taskkill //F //PID $WINPID >/dev/null 2>&1; LOGGER=; WINPID=; }
stop_c() {    # stop_c A|B reason [timeout]
  put $1_SELF "$2"; say "stopping $(nm $1) ($2)"
  docker stop -t ${3:-$STOP_T} $(nm $1) >/dev/null 2>&1
  PS=$(echo "$PS" | grep -vx "$(nm $1)")
}
stop_all() { is_up A && stop_c A "$1"; is_up B && stop_c B "$1"; logger_stop; }   # A always first
rm_leftover() {
  if docker ps -a --format '{{.Names}}' 2>/dev/null | tr -d '\r' | grep -qx "$(nm $1)" && ! is_up $1; then
    say "removing a stopped leftover $(nm $1)"; docker rm $(nm $1) >/dev/null 2>&1; fi
}
repair() {    # repair A|B: only that container's progress file and model types
  r1=$($HELP sanitize "$WD/train" "$(progf $1)" 2>&1); r2=$($HELP validate "$WD/train" "$(get $1_ARMS_NEXT)" 2>&1)
  say "pre-launch $(nm $1): $r1; $(echo "$r2" | tail -1)"
  echo "$r2" | grep '^quarantined' | while read -r l; do say "$l"; done
}
card_ok() {
  MSYS_NO_PATHCONV=1 docker run --rm --pull never --name $(nm $1)c --gpus all --network none --cpus 1 -m 1g \
    "$IMGID" python -c "import sys, torch; sys.exit(0 if torch.cuda.is_available() else 3)" >/dev/null 2>>"$LOG"
}
launch() {    # launch A|B (uses $1_ARMS_NEXT, set by the caller)
  if [ "$1" = A ]; then
    CMD='python detrun.py run E4'; PF=/w/train/progress-A.jsonl; RCIN=/w/train/stageB/guard-A.rc; K=2
  else
    PF=/w/train/progress.jsonl; RCIN=/w/train/stageB/guard.rc
    case ",$B_ARMS_NEXT," in
      *,E4,*) CMD='python stageB.py run --plan E1 E5 E2 E3 && python detrun.py run E4'; K=1 ;;   # rulings 67, 69
      *)      CMD='python stageB.py run --plan E1 E5 E2 E3'; K=2 ;;
    esac
  fi
  CC=$CAP; [ "$1" = A ] && CC=$CAP_A
  MSYS_NO_PATHCONV=1 docker run -d --rm --pull never --name $(nm $1) --gpus all --network none --cpus 6 -m $CC --memory-swap $CC \
    -e EMB_ROOT=/w -e OMP_NUM_THREADS=6 -e MKL_NUM_THREADS=6 -e PYTHONUNBUFFERED=1 -e HOME=/tmp -e PYSTOW_HOME=/tmp/pystow \
    -e KGE_DEVICE=cuda -e STAGEB_LANES=$LANES -e STAGEB_MIN_FREE_GB=$MIN_FREE_GB -e STAGEB_PROCS=1 -e STAGEB_PROGRESS=$PF \
    -e "STAGEB_RUNNER=guard-stageAB.sh $(nm $1) procs=1 containers=$K image=$IMGID" \
    -v $WD/export:/w/export:ro -v $WD/eval:/w/eval:ro -v $WD/train:/w/train \
    -w /w/train "$IMGID" sh -c "mkdir -p /w/train/stageB; { $CMD; }; echo \$? > $RCIN"
  # sh is PID 1 and ignores SIGTERM, so a docker stop ends in SIGKILL and writes no rc file
}
# an adopted B's command: E4 in it, or unreadable (fail safe: treated as holding E4, so it is drained, never paired)
has_e4_cmd() { c=$(docker inspect -f '{{json .Config.Cmd}}' $(nm B) 2>/dev/null); [ -z "$c" ] || echo "$c" | grep -q 'detrun.py run' || ! echo "$c" | grep -q 'stageB.py run'; }
adopt() {     # a container already running when the guard starts
  for X in B A; do
    if is_up $X; then
      if [ $X = B ]; then if has_e4_cmd; then B_ARMS=$B_ARMS_OWN,E4; else B_ARMS=$B_ARMS_OWN; fi; else A_ARMS=E4; fi
      put ${X}_AT "$(donen_of "$(get ${X}_ARMS)")"; put ${X}_SELF ""
      say "adopted running $(nm $X) (arms $(get ${X}_ARMS); done lines $(get ${X}_AT))"
    fi
  done
}
account() {   # after X is seen down: classify the end of its launch; returns 2 at the third no-progress self-end
  X=$1; at=$(get ${X}_AT); [ -n "$at" ] || return 0
  self=$(get ${X}_SELF); rc=$(rcf $X)
  if [ -n "$self" ]; then how="stopped by the guard ($self)"
  elif [ -f "$rc" ]; then how="ended by itself (rc $(cat "$rc"))"
  else how="stopped from outside (no rc file)"; fi
  d=$(donen_of "$(get ${X}_ARMS)")
  if [ "${d:-0}" -gt "$at" ]; then put ${X}_STUCK 0; say "$(nm $X) $how; units finished during the launch"
  elif [ -f "$rc" ] && [ -z "$self" ]; then put ${X}_STUCK $(( $(get ${X}_STUCK) + 1 )); say "$(nm $X) $how with no unit finished ($(get ${X}_STUCK) of 3)"
  else say "$(nm $X) $how with no unit finished (not counted)"; fi
  put ${X}_AT ""; put ${X}_SELF ""
  [ "$(get ${X}_STUCK)" -ge 3 ] && { say "stopping the guard: three launches of $(nm $X) finished no unit"; return 2; }
  return 0
}
count_start() {   # count_start A|B: one start sample (spaced >= SPACING s), reset on a bad one
  if startable_of $1; then
    if [ $(( NOW - $(get $1_LAST) )) -ge $SPACING ] || [ "$(get $1_OK)" = 0 ]; then put $1_OK $(( $(get $1_OK) + 1 )); put $1_LAST $NOW; fi
  else put $1_OK 0; put $1_LAST 0; fi
}

# ---- one check; returns non-zero = exit code
tick() {
  NOW=$(date +%s); ps_names
  # an own container that is down: account for its last launch
  for X in B A; do if ! is_up $X; then account $X || { stop_all "three empty launches"; return 2; }; fi; done
  if a_allowed; then AOK=1; else AOK=0; fi
  if [ $AOK = 1 ] && a_paused; then APAUSE=1; else APAUSE=0; fi
  # drain: B still holds E4 while A may take it
  if is_up B && [ $AOK = 1 ] && case ",$B_ARMS," in *,E4,*) true ;; *) false ;; esac; then
    lines=$(wc -l < "$WB/train/progress.jsonl" 2>/dev/null | tr -d ' ')
    if [ -z "$DRAIN_T0" ]; then DRAIN_T0=$NOW; DRAIN_N=$lines; say "draining kge-B1: A may take E4; stopping B after its next unit"; fi
    if [ "${lines:-0}" -gt "${DRAIN_N:-0}" ]; then stop_c B "drain at a unit boundary" 2; DRAIN_T0=
    elif [ $(( NOW - DRAIN_T0 )) -ge $DRAIN_MAX ]; then stop_c B "drain timeout: the unit in flight is redone" 2; DRAIN_T0=; fi
  else DRAIN_T0=; fi
  # full checks every TICK seconds (every call when TICK=0)
  [ -n "$LAST_FULL" ] && [ $(( NOW - LAST_FULL )) -lt $TICK ] && return 0
  LAST_FULL=$NOW
  sample_mem; F=$(foreign)
  if is_up A || is_up B; then
    logger_start
    f=$(free_gb)
    if [ "${f:-0}" -lt $MIN_FREE_GB ]; then say "C: free ${f} GB under ${MIN_FREE_GB} GB"; stop_all disk; return 4; fi
    if [ $(( NOW - ${LAST_DU:-0} )) -ge 300 ]; then
      LAST_DU=$NOW; k=$(sb_kb); if [ "${k:-0}" -gt $BUDGET_KB ]; then say "stage-B folder ${k} KB over budget"; stop_all budget; return 5; fi
    fi
    for X in A B; do
      if is_up $X && low_of $X; then put ${X}_LOW $(( $(get ${X}_LOW) + 1 )); else put ${X}_LOW 0; fi
    done
    if is_up A && [ $A_LOW -ge 3 ]; then say "A stop line three times (free_kb $MF commit_kb $MC)"; stop_c A memory; A_LOW=0; fi
    if is_up B && [ $B_LOW -ge 3 ]; then say "B stop line three times (free_kb $MF commit_kb $MC)"; is_up A && stop_c A "memory, before B"; stop_c B memory; B_LOW=0; fi
    if [ -n "$F" ]; then SEEN=$(( ${SEEN:-0} + 1 )); else SEEN=0; fi
    if [ $SEEN -ge 2 ]; then say "$F is running beside this guard's containers: stopping both (units in flight are redone)"; stop_all "other $F"; SEEN=0; fi
    if is_up A && { [ $AOK = 0 ] || [ $APAUSE = 1 ]; }; then stop_c A "A no longer allowed: $WHY_A$WHY_P"; fi
    for X in A B; do
      if is_up $X; then rf=$($HELP renamefails "$WD/train" "$(progf $X)")
        if [ "${rf:-0}" -ge $MAX_RENAME_FAILS ]; then say "$rf consecutive RenameFailed units in $(progf $X)"; stop_all renamefail; return 6; fi
      fi
    done
  else
    logger_stop; SEEN=0
  fi
  # what is left
  if [ $AOK = 1 ]; then B_ARMS_NEXT=$B_ARMS_OWN; A_ARMS_NEXT=E4; LA=$(left_of E4); else B_ARMS_NEXT=$B_ARMS_OWN,E4; A_ARMS_NEXT=E4; LA=0; fi
  LB=$(left_of "$B_ARMS_NEXT")
  if ! is_up A && ! is_up B && [ "$LB" = 0 ] && [ "$LA" = 0 ]; then say "stage B complete: no unit left for either container"; return 9; fi
  # starts
  if [ -n "$F" ]; then A_OK=0; B_OK=0; [ -n "$WAITLOG" ] || say "waiting: $F is running"; WAITLOG=1; return 0; fi
  WAITLOG=
  if [ $(( NOW - T0 )) -gt $((MAX_HOURS * 3600)) ]; then
    if ! is_up A && ! is_up B; then say "guard time limit ($MAX_HOURS h) reached"; return 3; fi; return 0
  fi
  is_up B || { [ "$LB" != 0 ] && count_start B; }
  { is_up A || [ $AOK = 0 ] || [ $APAUSE = 1 ] || [ "$LA" = 0 ]; } || count_start A
  for X in B A; do
    is_up $X && continue
    if [ $X = B ]; then [ "$LB" != 0 ] || continue; else { [ $AOK = 1 ] && [ $APAUSE = 0 ] && [ "$LA" != 0 ]; } || continue
      # A never launches beside a B that still holds E4
      if is_up B && case ",$B_ARMS," in *,E4,*) true ;; *) false ;; esac; then continue; fi; fi
    [ "$(get ${X}_OK)" -ge 3 ] || continue
    f=$(free_gb); if [ "${f:-0}" -lt $START_FREE_GB ]; then say "C: free ${f} GB under ${START_FREE_GB} GB: not launching $(nm $X)"; put ${X}_OK 0; continue; fi
    k=$(sb_kb); if [ "${k:-0}" -gt $BUDGET_KB ]; then say "stage-B folder ${k} KB over budget: not launching"; stop_all budget; return 5; fi
    rf=$($HELP renamefails "$WD/train" "$(progf $X)"); if [ "${rf:-0}" -ge $MAX_RENAME_FAILS ]; then say "$rf consecutive RenameFailed in $(progf $X): not launching"; stop_all renamefail; return 6; fi
    docker info >/dev/null 2>&1 || { put ${X}_OK 0; continue; }
    rm_leftover $X; repair $X
    if ! card_ok $X; then
      say "the card is not visible in $(nm $X)c: not launching"; put ${X}_FAILS $(( $(get ${X}_FAILS) + 1 )); put ${X}_OK 0
      [ "$(get ${X}_FAILS)" -ge 3 ] && { say "stopping the guard: three launch attempts of $(nm $X) without a card"; stop_all card; return 2; }
      continue
    fi
    rm -f "$(rcf $X)"; put ${X}_SELF ""
    if launch $X >/dev/null 2>>"$LOG"; then
      put ${X}_ARMS "$(get ${X}_ARMS_NEXT)"; put ${X}_AT "$(donen_of "$(get ${X}_ARMS)")"; put ${X}_FAILS 0
      PS="$PS
$(nm $X)"; logger_start
      say "launched $(nm $X) (arms $(get ${X}_ARMS); free_kb $MF commit_kb $MC; C: ${f} GB free; stage B ${k:-0} KB; left B $LB, A $LA)"
      # fresh start samples after any launch, for both (a later relaunch of X needs its own three again)
      A_OK=0; A_LAST=0; B_OK=0; B_LAST=0
      return 0                                      # one launch per check
    else
      say "launch of $(nm $X) failed"; put ${X}_FAILS $(( $(get ${X}_FAILS) + 1 )); put ${X}_OK 0
      [ "$(get ${X}_FAILS)" -ge 3 ] && { stop_all "launch failures"; return 2; }
    fi
  done
  [ $AOK = 0 ] && [ "$WHYLOG" != "$WHY_A" ] && { say "A not allowed: $WHY_A"; WHYLOG=$WHY_A; }
  return 0
}

A_OK=0; B_OK=0; A_LAST=0; B_LAST=0; A_LOW=0; B_LOW=0; A_STUCK=0; B_STUCK=0; A_FAILS=0; B_FAILS=0
A_AT=; B_AT=; A_SELF=; B_SELF=; A_ARMS=E4; B_ARMS=$B_ARMS_OWN; SEEN=0; T0=$(date +%s); LAST_FULL=; DRAIN_T0=
[ -n "$GUARD_LIB" ] && return 0 2>/dev/null
trap 'logger_stop' EXIT

if ! resolve_image; then say "image $IMAGE not found locally (never pulled): not starting"; exit 7; fi
say "guard start: image $IMAGE = $IMGID, cap B $CAP, A $CAP_A; C: free $(free_gb) GB; left B(E1,E5,E2,E3) $(left_of $B_ARMS_OWN), E4 $(left_of E4)"
ps_names; adopt
while :; do
  tick; rc=$?
  if [ $rc = 9 ]; then exit 0; elif [ $rc != 0 ]; then exit $rc; fi
  if [ -n "$DRAIN_T0" ]; then sleep 2; else sleep $TICK; fi
done
