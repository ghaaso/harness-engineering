#!/bin/bash
# ladder.sh: runs groups 1 to 5 of the model's matrix (RUN-FULL.md) as a ladder of memory sizes, to use the
# cores the machine has: many workers at a small size first, then the parts that did not fit again at a larger
# size with fewer workers, the largest size last and alone. See RUN-LADDER.md. Restartable: run it again.
#
#   bash ladder.sh        (from anywhere; it works in its own folder)
#
# Exit code: the last tier's (0 all complete; 1 some part stayed BOUNDED at 6000 MB or a run failed;
# 2 set-up error; 3 interrupted).
EX='A-FENCE-CE-K2,A-FENCE-CE-K3,*-K4F-*,D3-K3-*,DF3-K3-*,D3-K4-*,DF3-K4-*'   # groups 6 to 11: not run (owner, 2026-11-17)
FLOOR=4000
cd "$(dirname "$0")" || exit 2
mkdir -p results
log() { echo "$(date +%H:%M:%S) $*" >> results/ladder.log; }

# one parallel tier: size S for the normal pool AND as the "big" size, so nothing is rerun alone inside the tier;
# a part that does not fit at S is final for this tier, and is then taken out of results/ for the next tier
tier() { # <size MB> <most workers>
  log "tier $1 MB, up to $2 workers"
  node run-resumable.mjs --configs full --exclude "A-FENCE-CE,$EX" --workers "$2" --mem-mb "$1" --big-mem-mb "$1" --floor-mb $FLOOR > "results/run-tier-$1.out" 2> "results/run-tier-$1.err"
  local ec=$?
  log "tier $1 ended, exit $ec"
  if [ $ec -ne 0 ] && [ $ec -ne 1 ]; then log "ladder stopped"; exit $ec; fi   # 2 set-up error, 3 interrupted
  node ladder-move.mjs results results-ladder "$1" >> results/ladder.log
  return $ec
}

fits=""
tier 500 16 && fits=1                            # exit 0: every part fitted, the larger tiers have nothing to do
[ -z "$fits" ] && { tier 1150 8 && fits=1; }
[ -z "$fits" ] && { tier 2600 4 && fits=1; }

# the last tier: 6000 MB. What is left runs one at a time (the runner admits by free memory); the four parts of
# A-FENCE-CE that still wait for 6000 MB run alone after it.
log "last tier: 6000 MB"
node run-resumable.mjs --configs full --exclude "$EX" --workers 2 --mem-mb 6000 --big-mem-mb 6000 --floor-mb $FLOOR --big-at end > results/run-tier-6000.out 2> results/run-tier-6000.err
ec=$?
log "ladder ended, exit $ec"
exit $ec
