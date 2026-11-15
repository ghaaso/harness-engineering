#!/bin/sh
# Agent B, round r58c, change 5: wall time of item22.py (step 9.2, ktest-r5) on its real inputs except the stage-B parts:
# a TEST run (--test: item22.py never writes train/report/item22.json then) with the default --e4-epochs (the stage-A
# selection epoch: the CPU training of E4 top3[0] is the slow part), its parts and plan the full-size synthetic copy
# r58c/B/out/timing/asm (2,385 parts; their meta.json hold no losses, so the loss section reads but counts none).
# usage: sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/timing/time_item22.sh
L=/w/r58c/B/out/logs/timing-item22.log; A=/w/r58c/B/out/timing/asm/train/stageB
{ echo "sha256 $(sha256sum /w/train/item22.py | cut -c1-64) train/item22.py"; echo "sha256 $(sha256sum /w/r58c/B/timing/time_item22.sh | cut -c1-64) r58c/B/timing/time_item22.sh"
  t0=$(date +%s); python /w/train/item22.py --test --out /w/r58c/B/out/timing/item22.json --parts $A/parts --plan $A/plan.json; rc=$?
  echo "TIMING item22 $(( $(date +%s) - t0 )) s (rc $rc)"; echo "rc $rc"; } > $L 2>&1
cat $L; rc=$(tail -1 $L | sed -n "s/^rc //p"); exit ${rc:-3}
