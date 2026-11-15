#!/bin/sh
# Ruling 86(b), the host half of the held-out driver's rehearsal in test mode (END-ORDER step 2b). For each arm of the
# three test records (E4 c13/c16 deterministic, E5, E1): REHEARSAL=<ARM> sh train/heldout.sh launches kge-H1R on the card
# (GPU image, 4 GB cap, ruling 79's start rule inside heldout.sh). For the first arm a STOPPED leftover kge-H1R is made
# first (docker create; heldout.sh must remove it) and the running container is stopped (docker stop) in the middle of
# its first trained unit, then relaunched; every arm must end rc 0 with a HANDOFF.json and every unit done.
# Before: the rehearsal's own staging (built once): node train/heldout_inputs.js build --plan train/stageB/plan.json
#   --facts <build>/facts/cache --common <build>/arms/common --out r58c/rehearsal/inputs --parents <the three parents>
# Writes only r58c/rehearsal/ (and heldout-launch/kge-H1R-launch.log). Summary: r58c/rehearsal/REHEARSAL.txt.
# usage: sh r58c/A/rehearse.sh [ARM ...]      (default: E4 E5 E1)
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
cd "$WB" || exit 2
ARMS=${*:-E4 E5 E1}
SUM=$WB/r58c/rehearsal/REHEARSAL.txt; mkdir -p "$WB/r58c/rehearsal"
note() { echo "$(date -u +%FT%TZ) $*" | tee -a "$SUM"; }
IMG=$(docker image inspect graphtest-kge-gpu:1 --format '{{.Id}}' | tr -d '\r')
first=1; fail=0
for ARM in $ARMS; do
  P=$WB/r58c/rehearsal/$ARM/run/progress.jsonl
  if [ $first = 1 ]; then
    docker create --name kge-H1R --pull never "$IMG" true >/dev/null 2>&1 && note "$ARM: made a stopped leftover kge-H1R (docker create)"
    REHEARSAL=$ARM sh train/heldout.sh > "$WB/r58c/rehearsal/$ARM-launch1.out" 2>&1 &
    BG=$!
    n=0; until grep -q '"status": "begun"' "$P" 2>/dev/null && grep '"unit": "unit/' "$P" 2>/dev/null | tail -1 | grep -q begun; do
      n=$((n+1)); [ $n -gt 120 ] && break; sleep 10; done
    sleep 20
    if docker ps --format '{{.Names}}' | grep -q '^kge-H1R$'; then docker stop kge-H1R >/dev/null; note "$ARM: docker stop kge-H1R in the middle of a unit"; else note "$ARM: kge-H1R was not running when the stop was due"; fail=1; fi
    wait $BG; note "$ARM: first launch ended rc $? (a stopped run is expected to end non-zero)"
    grep -q 'removing a stopped leftover kge-H1R' "$WB/heldout-launch/kge-H1R-launch.log" && note "$ARM: heldout.sh removed the stopped leftover" || { note "$ARM: no leftover removal logged"; fail=1; }
    first=0
  fi
  REHEARSAL=$ARM sh train/heldout.sh > "$WB/r58c/rehearsal/$ARM-launch2.out" 2>&1; rc=$?
  ho=$WB/r58c/rehearsal/$ARM/run/HANDOFF.json
  if [ $rc = 0 ] && [ -f "$ho" ]; then note "$ARM: rc 0, HANDOFF.json sha256 $(sha256sum "$ho" | cut -d' ' -f1), done unit lines $(grep -c '"unit": "unit/.*"status": "done"' "$P")"
  else note "$ARM: FAILED rc $rc"; fail=1; fi
done
[ $fail = 0 ] && note "RESULT PASS rehearsal" || note "RESULT FAIL rehearsal"
exit $fail
