#!/bin/sh
# Ruling 86(b), the host half of the held-out driver's rehearsal in test mode (END-ORDER step 2b). For each arm of the
# three test records (E4 c13/c16 deterministic, E5, E1): REHEARSAL=<ARM> sh train/heldout.sh launches kge-H1R on the card
# (GPU image, 4 GB cap, ruling 79's start rule inside heldout.sh). For the first arm a STOPPED leftover kge-H1R is made
# first (docker create; heldout.sh must remove it) and the running container is stopped (docker stop) as soon as its first
# unit's done line is written, i.e. inside the next unit (end-order-changes-2 item 7), then relaunched; every arm must end
# rc 0 with a HANDOFF.json and every unit done, and the stopped arm must show fewer units done at the stop than in total
# and its first unit not redone. Host stub test: sh r58c/A/test_rehearse_stop.sh.
# Before: the rehearsal's own staging (built once): node train/heldout_inputs.js build --plan train/stageB/plan.json
#   --facts <build>/facts/cache --common <build>/arms/common --out r58c/rehearsal/inputs --parents <the three parents>
# Writes only r58c/rehearsal/ (and heldout-launch/kge-H1R-launch.log). Summary: r58c/rehearsal/REHEARSAL.txt.
# Then INJ (rulings 96(a), 97(e)): REHEARSAL=INJ sh train/heldout.sh runs r58c/A/inject_case.py in kge-H1R (the fifteen
# stage-A settings on two injected tuning-graph copies); it passes on rc 0 with r58c/rehearsal/INJ/case/inject_case.json.
# usage: sh r58c/A/rehearse.sh [ARM ...]      (default: E4 E5 E1 INJ)
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
cd "$WB" || exit 2
ARMS=${*:-E4 E5 E1 INJ}
SUM=$WB/r58c/rehearsal/REHEARSAL.txt; mkdir -p "$WB/r58c/rehearsal"
note() { echo "$(date -u +%FT%TZ) $*" | tee -a "$SUM"; }
IMG=$(docker image inspect graphtest-kge-gpu:1 --format '{{.Id}}' | tr -d '\r')
first=1; fail=0; stopk=; stopu=
DONE='"unit": "unit/[^"]*", "status": "done"'
for ARM in $ARMS; do
  # C16 / HD-4 (round 9): every arm starts clean. An earlier r58c/rehearsal/<ARM> (a run before a pre-freeze fix: its
  # record, run/progress.jsonl and HANDOFF.json) is moved aside to <ARM>.old-<UTC> before the arm's first launch.
  if [ -e "$WB/r58c/rehearsal/$ARM" ]; then old=$WB/r58c/rehearsal/$ARM.old-$(date -u +%Y%m%dT%H%M%SZ)
    if mv "$WB/r58c/rehearsal/$ARM" "$old"; then note "$ARM: an earlier r58c/rehearsal/$ARM moved aside to $(basename "$old")"
    else note "$ARM: an earlier r58c/rehearsal/$ARM could not be moved aside; arm not run"; fail=1; continue; fi; fi
  P=$WB/r58c/rehearsal/$ARM/run/progress.jsonl
  if [ $first = 1 ] && [ $ARM != INJ ]; then
    docker create --name kge-H1R --pull never "$IMG" true >/dev/null 2>&1 && note "$ARM: made a stopped leftover kge-H1R (docker create)"
    LL=$WB/heldout-launch/kge-H1R-launch.log; nrm0=$(grep -c 'removing a stopped leftover kge-H1R' "$LL" 2>/dev/null); nrm0=${nrm0:-0}
    REHEARSAL=$ARM sh train/heldout.sh > "$WB/r58c/rehearsal/$ARM-launch1.out" 2>&1 &
    BG=$!
    # end-order-changes-2 item 7: heldout.py logs a unit only when it is DONE (it writes no 'begun' line), so the stop
    # polls every second for the first unit's done line and stops at once: the next unit is then in training, a real
    # mid-unit point. The done count at the stop is kept and checked against the run's total after the relaunch.
    n=0; until grep -q "$DONE" "$P" 2>/dev/null; do n=$((n+1)); [ $n -gt 1500 ] && break; sleep 1; done
    if docker ps --format '{{.Names}}' | grep -q '^kge-H1R$'; then docker stop kge-H1R >/dev/null
      stopk=$(grep -c "$DONE" "$P" 2>/dev/null); stopk=${stopk:-0}; stopu=$(grep -o "$DONE" "$P" 2>/dev/null | head -1 | cut -d'"' -f4)
      grep -q '"unit": "packs"' "$P" 2>/dev/null && { note "$ARM: a packs line was already written at the stop"; fail=1; }
      note "$ARM: docker stop kge-H1R after the first unit's done line ($stopk unit(s) done at the stop, first $stopu)"
    else note "$ARM: kge-H1R was not running when the stop was due"; fail=1; fi
    wait $BG; note "$ARM: first launch ended rc $? (a stopped run is expected to end non-zero)"
    nrm1=$(grep -c 'removing a stopped leftover kge-H1R' "$LL" 2>/dev/null); nrm1=${nrm1:-0}  # HD-4: a removal logged by THIS launch
    [ "$nrm1" -gt "$nrm0" ] && note "$ARM: heldout.sh removed the stopped leftover" || { note "$ARM: no leftover removal logged by this launch"; fail=1; }
    first=0
  fi
  REHEARSAL=$ARM sh train/heldout.sh > "$WB/r58c/rehearsal/$ARM-launch2.out" 2>&1; rc=$?
  ho=$WB/r58c/rehearsal/$ARM/run/HANDOFF.json
  if [ $ARM = INJ ]; then ij=$WB/r58c/rehearsal/INJ/case/inject_case.json
    if [ $rc = 0 ] && [ -f "$ij" ]; then note "INJ: rc 0, inject_case.json sha256 $(sha256sum "$ij" | cut -d' ' -f1)"; else note "INJ: FAILED rc $rc"; fail=1; fi
    continue; fi
  if [ $rc = 0 ] && [ -f "$ho" ]; then note "$ARM: rc 0, HANDOFF.json sha256 $(sha256sum "$ho" | cut -d' ' -f1), done unit lines $(grep -c '"unit": "unit/.*"status": "done"' "$P")"
  else note "$ARM: FAILED rc $rc"; fail=1; fi
  if [ -n "$stopk" ]; then  # item 7: the stop fell inside the run (some unit was still to train) and the resume kept the first unit
    N=$(grep -o "$DONE" "$P" 2>/dev/null | sort -u | grep -c .); r=$(grep -c "\"unit\": \"$stopu\", \"status\": \"done\"" "$P" 2>/dev/null)
    if [ "$stopk" -ge 1 ] && [ "$stopk" -lt "$N" ] && [ "$r" = 1 ]; then note "$ARM: the stop was mid-run: $stopk of $N units done at the stop; the first unit was not redone"
    else note "$ARM: the stop was not mid-unit ($stopk of $N units done at the stop; the first unit's done lines: $r)"; fail=1; fi
    stopk=
  fi
done
[ $fail = 0 ] && note "RESULT PASS rehearsal" || note "RESULT FAIL rehearsal"
exit $fail
