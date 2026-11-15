#!/bin/sh
# Swap guard-stageB.sh -> guard-stageAB.sh (ruling 69) without stopping kge-B1. PREPARED, NOT RUN.
#   sh swap-to-stageAB.sh check   print the old guard's processes, kge-B1's state and what `go` would do (changes nothing)
#   sh swap-to-stageAB.sh go      run it in the background from the session that owns the guard: TERM to the old guard,
#                                 kill its nvidia-smi logger by Windows pid, confirm both gone, then exec guard-stageAB.sh,
#                                 which adopts the running kge-B1 (see the SWAP block in guard-stageAB.sh).
# Refuses (exit 1) if no old guard or more than one is found, or if guard-stageAB.sh is already running.
WB=${GUARD_WB:-/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings}
LOG=$WB/orchestrator/guard-stageAB.log
say() { echo "$(date -u +%FT%TZ) swap: $*" | tee -a "$LOG"; }
procs() {   # procs <pattern>: "<pid> <winpid> <ppid>" of every MSYS process whose cmdline matches exactly
  for p in /proc/[0-9]*; do
    c=$(tr '\0' ' ' < $p/cmdline 2>/dev/null) || continue
    [ "$c" = "$1" ] && echo "$(basename $p) $(cat $p/winpid 2>/dev/null) $(cat $p/ppid 2>/dev/null)"
  done
}
smi_children() {   # nvidia-smi processes whose parent is $1
  for p in /proc/[0-9]*; do
    [ "$(cat $p/ppid 2>/dev/null)" = "$1" ] || continue
    case "$(tr '\0' ' ' < $p/cmdline 2>/dev/null)" in *nvidia-smi*) echo "$(basename $p) $(cat $p/winpid 2>/dev/null)" ;; esac
  done
}
OLDN=${OLD_NAME:-guard-stageB.sh}     # test hook: another script name
OLD=$(procs "sh $OLDN "; procs "sh $WB/orchestrator/$OLDN ")
NEW=$(procs "sh guard-stageAB.sh "; procs "sh $WB/orchestrator/guard-stageAB.sh ")
n=$(echo "$OLD" | grep -c .)
echo "old guard processes (pid winpid ppid): ${OLD:-none}"
for o in $(echo "$OLD" | awk '{print $1}'); do echo "  logger of $o: $(smi_children $o | tr '\n' ' ')"; done
echo "new guard processes: ${NEW:-none}"
echo "kge-* containers: $(docker ps --format '{{.Names}} ({{.Status}})' 2>/dev/null | grep '^kge-' | tr '\n' ' ')"
echo "kge-B1 command: $(docker inspect -f '{{json .Config.Cmd}}' kge-B1 2>/dev/null | cut -c1-200)"
echo "equality-accepted.json: $([ -f $WB/orchestrator/equality-accepted.json ] && echo present || echo absent) (absent: the new guard keeps E4 in B, as the old one)"
[ -n "$NEW" ] && { echo "refusing: guard-stageAB.sh already runs"; exit 1; }
[ "$n" = 1 ] || { echo "refusing: expected exactly one old guard process, found $n"; exit 1; }
[ "$1" = go ] || { echo "check only; 'go' would TERM pid $(echo "$OLD" | awk '{print $1}'), kill its logger, then exec guard-stageAB.sh"; exit 0; }

pid=$(echo "$OLD" | awk '{print $1}')
LOGGERS=$(smi_children $pid)
say "TERM to the old guard (pid $pid); kge-B1 keeps running"
kill -TERM $pid 2>/dev/null
i=0; while [ -d /proc/$pid ] && [ $i -lt 30 ]; do sleep 1; i=$((i+1)); done
[ -d /proc/$pid ] && { kill -KILL $pid 2>/dev/null; sleep 1; }
[ -d /proc/$pid ] && { say "the old guard (pid $pid) did not end: not starting the new one"; exit 1; }
echo "$LOGGERS" | while read -r lp lw; do [ -n "$lw" ] && taskkill //F //PID $lw >/dev/null 2>&1 && say "killed the old logger (winpid $lw)"; done
say "old guard gone; kge-* now: $(docker ps --format '{{.Names}}' 2>/dev/null | grep '^kge-' | tr '\n' ' '); exec guard-stageAB.sh"
exec sh "$WB/orchestrator/guard-stageAB.sh"
