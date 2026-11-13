#!/usr/bin/env bash
# Machine-wide weighted slot lock for heavy gates, first come first served.
#
# Why: this box has 24 threads but only about 6-10 GB of free RAM while eight lane sessions
# run, so RAM is the binding resource. Every heavy job (a backend gate stack, Jest, Vitest, a
# Gradle build, an emulator) takes slots before it starts and gives them back when it ends.
# Lanes never coordinate with each other directly; they only meet here.
#
#   ff-slot.sh acquire <holder> [weight] [pid]   blocks until <weight> slots are free (default 1)
#   ff-slot.sh release <holder>
#   ff-slot.sh status
#
# Weights: a backend stack, a Jest run, a Vitest run and a running emulator take 1; a Gradle
# build takes 2 (with 2 slots that is the whole machine).
#
# Slots are directories (mkdir is atomic on NTFS). Pass the PID of the long-lived process that
# owns the job (the gate script passes its own): a slot is then reaped only when that process
# is gone, so a long build or an emulator session never loses its slot while it is alive. A
# holder that gives no PID is reaped by age alone (FF_STALE_MIN minutes).
#
# Fairness: each waiter drops a ticket in queue/ and only the oldest live ticket may take
# slots. Measured before this existed (2026-11-13): one lane waited 20 minutes while later
# arrivals were served, because every waiter retried at random. The head of the queue blocks
# those behind it even when it needs more slots than are free, so a heavy job cannot starve.
set -u
D="${FF_LOCK_DIR:-/c/Users/User/.fixflow-cache/locks}"
# 2 while Android builds (weight 2) are in play: with eight lane sessions running, free host
# RAM measured 5.5-7.7 GB (2026-11-13), so a Gradle build must not share the machine with
# another gate. Raise to 3 only with FF_SLOTS and only when no Gradle build can start.
N="${FF_SLOTS:-2}"
STALE_MIN="${FF_STALE_MIN:-240}"
Q="$D/queue"
mkdir -p "$D" "$Q"
cmd="${1:?usage: ff-slot.sh acquire <holder> [weight] [pid] | release <holder> | status}"

alive() { [ -n "$1" ] && [ "$1" != "-" ] && kill -0 "$1" 2>/dev/null; }

reap() {
  local s pid t
  for s in "$D"/slot-*; do
    [ -d "$s" ] || continue
    pid="$(awk '{print $3}' "$s/holder" 2>/dev/null)"
    if [ -n "$pid" ] && [ "$pid" != "-" ]; then
      # owner process gone, and the slot is not seconds old (a holder file still being written)
      if ! alive "$pid" && [ -n "$(find "$s" -maxdepth 0 -mmin +2 2>/dev/null)" ]; then
        rm -rf "$s"
      fi
    elif [ -n "$(find "$s" -maxdepth 0 -mmin +"$STALE_MIN" 2>/dev/null)" ]; then
      rm -rf "$s"
    fi
  done
  # tickets of waiters that died
  for t in "$Q"/*; do
    [ -f "$t" ] || continue
    pid="$(cat "$t" 2>/dev/null)"
    if ! alive "$pid" && [ -n "$(find "$t" -maxdepth 0 -mmin +1 2>/dev/null)" ]; then rm -f "$t"; fi
  done
}

case "$cmd" in
  acquire)
    holder="${2:?holder}"
    w="${3:-1}"
    pid="${4:--}"
    if [ "$w" -gt "$N" ]; then echo "weight $w exceeds slots $N" >&2; exit 2; fi
    t0=$(date +%s)
    # the ticket lives as long as this acquire call does; its name sorts by arrival time
    ticket="$Q/$(date +%s%N)-$holder"
    echo "$$" > "$ticket"
    trap 'rm -f "$ticket"' EXIT
    while :; do
      reap
      head="$(ls "$Q" 2>/dev/null | sort | head -1)"
      if [ "$Q/$head" = "$ticket" ]; then
        got=()
        for i in $(seq 1 "$N"); do
          if mkdir "$D/slot-$i" 2>/dev/null; then
            echo "$holder $(date -Is) $pid" > "$D/slot-$i/holder"
            got+=("$i")
            [ "${#got[@]}" -ge "$w" ] && break
          fi
        done
        if [ "${#got[@]}" -ge "$w" ]; then
          echo "SLOTS ${got[*]} holder=$holder waited=$(( $(date +%s) - t0 ))s"
          exit 0
        fi
        # all-or-nothing: give back a partial take and keep our place at the head
        for i in "${got[@]:-}"; do [ -n "$i" ] && rm -rf "$D/slot-$i"; done
        sleep 3
      else
        sleep $(( 4 + RANDOM % 4 ))
      fi
    done
    ;;
  release)
    holder="${2:?holder}"
    for s in "$D"/slot-*; do
      [ -f "$s/holder" ] && grep -q "^$holder " "$s/holder" && rm -rf "$s"
    done
    echo "RELEASED holder=$holder"
    ;;
  status)
    for s in "$D"/slot-*; do
      [ -f "$s/holder" ] && echo "$(basename "$s"): $(cat "$s/holder")"
    done
    n=0
    for t in $(ls "$Q" 2>/dev/null | sort); do n=$((n+1)); echo "waiting $n: ${t#*-}"; done
    echo "slots=$N stale_min=$STALE_MIN dir=$D"
    ;;
  *)
    echo "unknown command: $cmd" >&2
    exit 2
    ;;
esac
