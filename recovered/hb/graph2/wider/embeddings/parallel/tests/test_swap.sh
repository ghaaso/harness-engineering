#!/bin/sh
# Host test of orchestrator/swap-to-stageAB.sh on a dummy old guard (its own name, so the real guard-stageB.sh is never
# matched) with a real nvidia-smi logger child, and a dummy new guard. Touches no container (docker is only listed).
L=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
T=$L/parallel/test/swap; rm -rf "$T"; mkdir -p "$T/lane/orchestrator"; TB=$(echo "$T" | sed "s|^C:|/c|")
FAIL=0; N=0
check() { N=$((N+1)); if [ "$2" = "$3" ]; then echo "ok   $1: $2"; else echo "FAIL $1: got '$2' want '$3'"; FAIL=1; fi; }
cat > "$T/lane/orchestrator/fake-old-guard.sh" <<EOF
trap 'echo trap-exit >> $T/trap.log' EXIT
nvidia-smi --query-gpu=timestamp --format=csv,noheader -l 30 > /dev/null 2>&1 &
while :; do sleep 2; done
EOF
echo "echo \"new guard ran\" >> $T/new.log" > "$T/lane/orchestrator/guard-stageAB.sh"
( cd "$T/lane/orchestrator" && sh fake-old-guard.sh > /dev/null 2>&1 & )
sleep 3
pid=$(for p in /proc/[0-9]*; do [ "$(tr '\0' ' ' < $p/cmdline 2>/dev/null)" = "sh fake-old-guard.sh " ] && basename $p; done)
smiw=$(for p in /proc/[0-9]*; do [ "$(cat $p/ppid 2>/dev/null)" = "$pid" ] && case "$(tr '\0' ' ' < $p/cmdline 2>/dev/null)" in *nvidia-smi*) cat $p/winpid ;; esac; done)
check "dummy old guard and its logger are up" "$( [ -n "$pid" ] && [ -n "$smiw" ] && echo yes)" "yes"
GUARD_WB=$TB/lane OLD_NAME=fake-old-guard.sh sh "$L/orchestrator/swap-to-stageAB.sh" check > "$T/check.out" 2>/dev/null
check "check mode: finds exactly the dummy" "$(grep -c "old guard processes (pid winpid ppid): $pid " "$T/check.out")" "1"
check "check mode: leaves it running" "$( [ -d /proc/$pid ] && echo up)" "up"
GUARD_WB=$TB/lane OLD_NAME=fake-old-guard.sh sh "$L/orchestrator/swap-to-stageAB.sh" go > "$T/go.out" 2>/dev/null
sleep 1
check "go: the old guard is gone" "$( [ -d /proc/$pid ] && echo up || echo gone)" "gone"
check "go: its nvidia-smi logger is gone" "$(tasklist //FI "PID eq $smiw" 2>/dev/null | grep -c nvidia-smi)" "0"
check "go: the new guard ran after it" "$(cat "$T/new.log" 2>/dev/null)" "new guard ran"
check "go: the swap is logged" "$(grep -c 'swap: old guard gone' "$T/lane/orchestrator/guard-stageAB.log")" "1"
check "go: EXIT trap of the old guard on TERM (informational)" "$(cat "$T/trap.log" 2>/dev/null || echo none)" "$(cat "$T/trap.log" 2>/dev/null || echo none)"
echo "trap on TERM: $(cat "$T/trap.log" 2>/dev/null || echo 'did not run')"
GUARD_WB=$TB/lane OLD_NAME=fake-old-guard.sh sh "$L/orchestrator/swap-to-stageAB.sh" go > "$T/go2.out" 2>/dev/null
check "go with no old guard: refused (exit 1)" "$?" "1"
echo "RESULT $([ $FAIL = 0 ] && echo PASS || echo FAIL) test_swap ($N checks)"
