#!/bin/bash
# ladder2.sh: runs groups 1 to 5 of the model's matrix (RUN-FULL.md) as a ladder of memory sizes, to use the cores
# and the memory the machine has: many workers at a small size first, then the parts that did not fit again at a
# larger size, the largest size last. It replaces ladder.sh (same ladder; three changes):
#   - the number of workers at each size is left to the runner's own admission by free memory (one cap for all:
#     about 16 workers saturate the 12 cores);
#   - a tier counts as finished only when the runner's plan shows no part left to run at that size, so a runner that
#     was stopped from outside is simply run again (at most three times);
#   - the parts that wait for the last size run in the normal pool there, two at a time when memory allows.
# Restartable: run it again. See RUN-LADDER.md.
#
#   bash ladder2.sh        (from anywhere; it works in its own folder)
#
# Exit code: 0 every part complete; 1 some part stayed BOUNDED at 6000 MB or a run failed; 4 a tier did not finish.
EX='A-FENCE-CE-K2,A-FENCE-CE-K3,*-K4F-*,D3-K3-*,DF3-K3-*,D3-K4-*,DF3-K4-*'   # groups 6 to 11: not run (owner, 2026-11-17)
FLOOR=4000
CAP=16
cd "$(dirname "$0")" || exit 2
mkdir -p results
log() { echo "$(date +%H:%M:%S) $*" >> results/ladder.log; }
left() { # <size MB> <exclude>: how many parts the runner would still run at this size
  node run-resumable.mjs --plan --configs full --exclude "$2" --mem-mb "$1" --big-mem-mb "$1" 2>&1 | head -n 1 | sed -E 's/.* ([0-9]+) to run.*/\1/'
}
LAST_EC=0
# one tier: size S for the normal pool AND as the "big" size, so nothing is rerun alone inside the tier; a part that
# does not fit at S is final for the tier and is then taken out of results/ (ladder-move.mjs) for the next one
tier() { # <size MB> <most workers> <exclude>
  local n=0 l
  while :; do
    n=$((n+1)); log "tier $1 MB, up to $2 workers (run $n)"
    node run-resumable.mjs --configs full --exclude "$3" --workers "$2" --mem-mb "$1" --big-mem-mb "$1" --floor-mb $FLOOR >> "results/run-tier-$1.out" 2>> "results/run-tier-$1.err"
    LAST_EC=$?
    l=$(left "$1" "$3"); log "tier $1 run $n ended, exit $LAST_EC, parts still to run at this size: $l"
    [ "$l" = "0" ] && break
    if [ $LAST_EC -eq 2 ] || [ $n -ge 3 ]; then log "ladder stopped: tier $1 did not finish"; exit 4; fi
  done
}

tier 500  $CAP "A-FENCE-CE,$EX"; node ladder-move.mjs results results-ladder 500  >> results/ladder.log
tier 1150 $CAP "A-FENCE-CE,$EX"; node ladder-move.mjs results results-ladder 1150 >> results/ladder.log
tier 2600 $CAP "A-FENCE-CE,$EX"; node ladder-move.mjs results results-ladder 2600 >> results/ladder.log
# the four parts of A-FENCE-CE that stopped at 1500 MB in the first run and still wait for 6000 MB
node ladder-move.mjs results results-ladder 1500 >> results/ladder.log
tier 6000 4 "$EX"
log "ladder ended, exit $LAST_EC"
exit $LAST_EC
