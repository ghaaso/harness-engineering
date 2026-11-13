#!/usr/bin/env bash
# Machine-wide weighted slot lock for heavy gates.
#
# Why: this box has 24 threads but about 11 GB of free RAM while other sessions run, so RAM is
# the binding resource. Every heavy job (a backend gate stack, Jest, Vitest, a Gradle build,
# an emulator) takes slots before it starts and gives them back when it ends. Lanes never
# coordinate with each other directly; they only meet here.
#
#   ff-slot.sh acquire <holder> [weight]   blocks until <weight> slots are free (default 1)
#   ff-slot.sh release <holder>
#   ff-slot.sh status
#
# Slots are directories (mkdir is atomic on NTFS). A slot older than FF_STALE_MIN minutes is
# treated as left behind by a crashed holder and reaped.
set -u
D="${FF_LOCK_DIR:-/c/Users/User/.fixflow-cache/locks}"
N="${FF_SLOTS:-3}"
STALE_MIN="${FF_STALE_MIN:-120}"
mkdir -p "$D"
cmd="${1:?usage: ff-slot.sh acquire <holder> [weight] | release <holder> | status}"

reap() {
  find "$D" -maxdepth 1 -type d -name 'slot-*' -mmin +"$STALE_MIN" -exec rm -rf {} + 2>/dev/null
}

case "$cmd" in
  acquire)
    holder="${2:?holder}"
    w="${3:-1}"
    if [ "$w" -gt "$N" ]; then echo "weight $w exceeds slots $N" >&2; exit 2; fi
    t0=$(date +%s)
    while :; do
      reap
      got=()
      for i in $(seq 1 "$N"); do
        if mkdir "$D/slot-$i" 2>/dev/null; then
          echo "$holder $(date -Is)" > "$D/slot-$i/holder"
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
