#!/usr/bin/env bash
# run-steps.sh <ledger> <step>... : runs protocol steps one invocation each, resumably.
#
# A step is one protocol invocation with its own evidence folder and result.json:
#   tracker:<check>        e.g. tracker:probe, tracker:fneg, tracker:reboot
#   tracker:<check>#<n>    one numbered repeat, e.g. tracker:a-warm#2, tracker:f19#3
#                          (FF_RUN_NO=<n>; checks with repeats: a, a-warm, a-cold, a-fstop, d,
#                          f19, f14, c)
#   offline:<phase,...>    the outage matrix; its phases depend on each other (revival needs
#                          the rows edge404 parked), so they run as one step
# The ledger ($LAB_OUT/run/<ledger>.ledger) records "step|exit|evidence-dir" per finished step.
# Run the same command again after an interruption: a step whose result.json ended with exit 0
# is skipped, anything else runs again, so an interruption costs the step it cut and nothing
# before it. A cut run's evidence folder stays where it is and is never cited.
set -euo pipefail
. "$(dirname "$0")/lib.sh"
HERE="$(cd "$(dirname "$0")" && pwd)"

[ $# -ge 2 ] || die "usage: run-steps.sh <ledger> <step>..."
LEDGER="$LAB_OUT/run/$1.ledger"
shift
mkdir -p "$(dirname "$LEDGER")"
touch "$LEDGER"

done_ok() { # step -> 0 when the ledger has it with exit 0 and its result.json says exit 0
  local line dir
  line="$(grep -F "$1|0|" "$LEDGER" | tail -n1)" || return 1
  dir="${line##*|}"
  grep -q '"exit_code": 0' "$dir/result.json" 2> /dev/null
}

for step in "$@"; do
  if done_ok "$step"; then
    echo "[$(date +%T)] skip $step (done: $(grep -F "$step|0|" "$LEDGER" | tail -n1 | cut -d'|' -f3))"
    continue
  fi
  kind="${step%%:*}"
  arg="${step#*:}"
  run_no=""
  case "$arg" in *"#"*) run_no="${arg##*#}" && arg="${arg%%#*}" ;; esac
  echo "[$(date +%T)] STEP $step"
  out="$LAB_OUT/run/$(basename "$LEDGER" .ledger)-step.log"
  set +e
  case "$kind" in
    tracker) FF_RUN_NO="$run_no" bash "$HERE/protocol-tracker.sh" "$arg" > "$out" 2>&1 ;;
    offline) bash "$HERE/protocol-offline.sh" ${arg//,/ } > "$out" 2>&1 ;;
    *) die "unknown step kind: $step" ;;
  esac
  rc=$?
  set -e
  grep -E "RESULT|error|ERROR" "$out" | sed "s/^/  /" || true
  dir="$(sed -n 's/^evidence: \(.*\) (exit [0-9]*)$/\1/p' "$out" | tail -n1)"
  echo "$step|$rc|${dir:-none}" >> "$LEDGER"
  echo "[$(date +%T)] END $step exit=$rc evidence=${dir:-none}"
done
echo "[$(date +%T)] LEDGER DONE $LEDGER"
