#!/usr/bin/env bash
# Machine-wide weighted slot lock for heavy gates.
#
# Why: this box has 24 threads but only about 7-11 GB of free RAM while other sessions run, so
# RAM is the binding resource. Every heavy job (a backend gate stack, Jest, Vitest, a Gradle
# build, an emulator) takes slots before it starts and gives them back when it ends. Lanes
# never coordinate with each other directly; they only meet here.
#
#   ff-slot.sh acquire <holder> [weight] [pid]   blocks until <weight> slots are free (default 1)
#   ff-slot.sh release <holder>
#   ff-slot.sh status
#
# Weights: a backend stack, a Jest run, a Vitest run and a running emulator take 1; a Gradle
# build takes 2.
#
# Slots are directories (mkdir is atomic on NTFS). Pass the PID of the long-lived process that
# owns the job (the gate script passes its own): a slot is then reaped only when that process
# is gone, so a long build or an emulator session never loses its slot while it is alive. A
# holder that gives no PID is reaped by age alone (FF_STALE_MIN minutes).
set -u
D="${FF_LOCK_DIR:-/c/Users/User/.fixflow-cache/locks}"
# 2 while the Android build lane (weight 2) is active: with six lane sessions running, free host
# RAM measured 6.7 GB and the Docker VM 7.9 GB (2026-11-13), so a Gradle build must not share
# the machine with another gate. Raise to 3 when no weight-2 job is in flight.
N="${FF_SLOTS:-2}"
STALE_MIN="${FF_STALE_MIN:-240}"
mkdir -p "$D"
cmd="${1:?usage: ff-slot.sh acquire <holder> [weight] [pid] | release <holder> | status}"

reap() {
  local s pid
  for s in "$D"/slot-*; do
    [ -d "$s" ] || continue
    pid="$(awk '{print $3}' "$s/holder" 2>/dev/null)"
    if [ -n "$pid" ] && [ "$pid" != "-" ]; then
      # owner process gone, and the slot is not seconds old (a holder file still being written)
      if ! kill -0 "$pid" 2>/dev/null && [ -n "$(find "$s" -maxdepth 0 -mmin +2 2>/dev/null)" ]; then
        rm -rf "$s"
      fi
    elif [ -n "$(find "$s" -maxdepth 0 -mmin +"$STALE_MIN" 2>/dev/null)" ]; then
      rm -rf "$s"
    fi
  done
}

case "$cmd" in
  acquire)
    holder="${2:?holder}"
    w="${3:-1}"
    pid="${4:--}"
    if [ "$w" -gt "$N" ]; then echo "weight $w exceeds slots $N" >&2; exit 2; fi
    t0=$(date +%s)
    while :; do
      reap
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
      # all-or-nothing: give back a partial take so two heavy jobs cannot deadlock each other
      for i in "${got[@]:-}"; do [ -n "$i" ] && rm -rf "$D/slot-$i"; done
      sleep $(( 5 + RANDOM % 10 ))
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
    echo "slots=$N stale_min=$STALE_MIN dir=$D"
    ;;
  *)
    echo "unknown command: $cmd" >&2
    exit 2
    ;;
esac
