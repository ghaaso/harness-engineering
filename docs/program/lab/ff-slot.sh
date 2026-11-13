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
# Weights: a backend stack, a Jest run, a Vitest run and a running emulator take 1. Any request
# for 2 or more (a Gradle build) is EXCLUSIVE: it takes every slot, whatever the slot count is.
#
# Slots are directories (mkdir is atomic on NTFS). Pass the PID of the long-lived process that
# owns the job (the gate script passes its own): a slot is then reaped only when that process
# is gone, so a long build or an emulator session never loses its slot while it is alive. A
# holder that gives no PID is reaped by age alone (FF_STALE_MIN minutes).
#
# Fairness: each waiter drops a ticket in queue/ and tickets are served in arrival order.
# Measured before this existed (2026-11-13): one lane waited 20 minutes while later arrivals
# were served, because every waiter retried at random.
# One exception, also measured: two exclusive Android builds at the head once held up eight
# short test runs for most of an hour. So a weight-1 job may pass a heavier job that has
# waited less than FF_HEAVY_PATIENCE seconds (default 900). After that the heavy job blocks
# everything behind it until it has run, so it cannot starve.
set -u
D="${FF_LOCK_DIR:-/c/Users/User/.fixflow-cache/locks}"
# 3 slots. Measured with two backend gate stacks running (2026-11-13 14:26): each stack used
# about 0.4-0.5 GB (the 3 GB figure is only its cap), while the Docker VM held 6.9 GB of page
# cache; so the cache, not the gates, was eating the host's RAM, and the gate script now drops
# it at the start and end of every backend run. A Gradle build stays exclusive (see weights).
N="${FF_SLOTS:-3}"
STALE_MIN="${FF_STALE_MIN:-240}"
Q="$D/queue"
mkdir -p "$D" "$Q"
cmd="${1:?usage: ff-slot.sh acquire <holder> [weight] [pid] | release <holder> | status}"

alive() { [ -n "$1" ] && [ "$1" != "-" ] && kill -0 "$1" 2>/dev/null; }

# A lock made before the machine last booted is dead, whatever its PID says: PIDs are reused
# after a reboot. The PC lost power or hung at 13:25 on 2026-11-13 with two slots held and two
# waiters queued; without this rule they would have blocked every lane until someone noticed.
UP="$(cut -d. -f1 /proc/uptime 2>/dev/null)"
if [ -n "$UP" ]; then BOOT=$(( $(date +%s) - UP )); else BOOT=0; fi
from_before_boot() {
  local m
  m="$(stat -c %Y "$1" 2>/dev/null)" || return 1
  [ -n "$m" ] && [ "$m" -lt $(( BOOT - 5 )) ]
}

reap() {
  local s pid t
  for s in "$D"/slot-*; do
    [ -d "$s" ] || continue
    if from_before_boot "$s"; then rm -rf "$s"; continue; fi
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
    if from_before_boot "$t"; then rm -f "$t"; continue; fi
    pid="$(awk '{print $1}' "$t" 2>/dev/null)"
    if ! alive "$pid" && [ -n "$(find "$t" -maxdepth 0 -mmin +1 2>/dev/null)" ]; then rm -f "$t"; fi
  done
}

case "$cmd" in
  acquire)
    holder="${2:?holder}"
    w="${3:-1}"
    pid="${4:--}"
    if [ "$w" -ge 2 ]; then w="$N"; fi   # heavy means exclusive
    t0=$(date +%s)
    # the ticket lives as long as this acquire call does; its name sorts by arrival time
    # The weight is in the ticket's NAME and its content is the bare PID. A waiter still running an
    # earlier version of this script reads the content as a PID and reaps a ticket it cannot parse
    # (that stranded two runs on 2026-11-13), so the content format never changes again.
    ticket="$Q/$(date +%s%N)-w${w}-$holder"
    echo "$$" > "$ticket"
    trap 'rm -f "$ticket"' EXIT
    PATIENCE="${FF_HEAVY_PATIENCE:-900}"
    while :; do
      reap
      # A waiter whose owner is gone leaves the line: a gate run that was stopped while queued
      # used to leave its acquire call behind, which then took a slot nobody was waiting for
      # (three such orphans of one lane were seen in the queue on 2026-11-13).
      if [ "$pid" != "-" ] && ! alive "$pid"; then
        echo "ABANDONED holder=$holder: owner process $pid is gone" >&2
        exit 3
      fi
      # if something removed our ticket while we are alive, put it back under the same name (same place in line)
      [ -f "$ticket" ] || echo "$$" > "$ticket"
      my_turn=1
      for t in $(ls "$Q" 2>/dev/null | sort); do
        [ "$Q/$t" = "$ticket" ] && break
        # weight from the name ("<ns>-w<weight>-<holder>"); older tickets have none: an Android build is the only heavy job
        rest="${t#*-}"
        case "$rest" in
          w[0-9]-*) tw="${rest:1:1}" ;;
          *-android-*) tw=2 ;;
          *) tw=1 ;;
        esac
        tt=$(( ${t%%-*} / 1000000000 ))
        if [ "$w" -eq 1 ] && [ "$tw" -ge 2 ]; then
          # A short job may pass a heavy one that has not waited long yet, or that could not run
          # anyway: while an emulator session holds a slot (it is long-lived and an exclusive job
          # needs every slot), making the short jobs wait would help nobody. That stalled the whole
          # queue with two slots idle on 2026-11-13 14:38.
          if [ $(( $(date +%s) - tt )) -lt "$PATIENCE" ] || grep -qs -- '-emulator-' "$D"/slot-*/holder; then
            continue
          fi
        fi
        my_turn=0; break
      done
      if [ "$my_turn" = 1 ]; then
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
    reap
    for s in "$D"/slot-*; do
      [ -f "$s/holder" ] && echo "$(basename "$s"): $(cat "$s/holder")"
    done
    n=0
    for t in $(ls "$Q" 2>/dev/null | sort); do
      n=$((n+1))
      echo "waiting $n: ${t#*-} for $(( $(date +%s) - ${t%%-*} / 1000000000 ))s"
    done
    echo "slots=$N stale_min=$STALE_MIN dir=$D"
    ;;
  *)
    echo "unknown command: $cmd" >&2
    exit 2
    ;;
esac
