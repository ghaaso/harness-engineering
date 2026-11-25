#!/bin/bash
# U3 stall guard (runs inside the container): runs "$@" and restarts it when no file under $GUARD_DIR changed for $GUARD_STALL s
# (a CUDA wait that spins at 100 % CPU with the card idle was seen twice on this card). Every command here resumes from its own
# per-query or per-checkpoint files, so a restart loses at most one group of queries. Gives up after $GUARD_MAX restarts.
# 2026-11-25 (review r57-0097, text S2): the command runs in its own session (setsid; not a group leader here, so its pid is the
# session id) and a stall kills the whole session, the wrapper shell and the Python under it, then waits until no process of it is
# left, so the restart does not meet the hung process's card memory. Before, only the wrapper was killed.
GUARD_DIR=${GUARD_DIR:-/out}; GUARD_STALL=${GUARD_STALL:-1200}; GUARD_MAX=${GUARD_MAX:-6}
n=0
while :; do
  setsid "$@" &
  pid=$!; last=$(date +%s); sig=""
  while kill -0 $pid 2>/dev/null; do
    sleep 15
    s=$(find $GUARD_DIR -type f -newermt "@$last" 2>/dev/null | head -1)
    if [ -n "$s" ]; then last=$(date +%s); fi
    if [ $(( $(date +%s) - last )) -gt $GUARD_STALL ]; then
      echo "$(date +%T) guard: no file change for ${GUARD_STALL}s, killing session $pid and every process in it (restart $((n+1)) of $GUARD_MAX)"
      kill -9 -- -$pid 2>/dev/null; pkill -9 -s $pid 2>/dev/null; wait $pid 2>/dev/null
      for i in $(seq 60); do pgrep -s $pid >/dev/null 2>&1 || break; sleep 1; done
      pgrep -s $pid >/dev/null 2>&1 && echo "$(date +%T) guard: processes of session $pid still alive after 60 s: $(pgrep -s $pid | tr '\n' ' ')"
      sig=stall; break
    fi
  done
  if [ -z "$sig" ]; then wait $pid; exit $?; fi
  n=$((n+1)); [ $n -gt $GUARD_MAX ] && { echo "guard: giving up"; exit 99; }
done
