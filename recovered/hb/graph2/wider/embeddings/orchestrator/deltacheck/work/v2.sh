#!/bin/sh
# kge-V2 on graphtest-kge-gpu:1 (cwd /w/v): check 4 (scorediff, the lane's gwork.py copied unchanged) and the card
# image half of check 5 (E4 initial weights, KGE_DEVICE=cpu and =cuda, same image).
# scorediff done in the first V2 run (logs/v2-first-attempt.log)
for dev in cpu cuda; do
  for cid in c12 c13 c16; do
    for s in 1 2 3; do
      echo "=== e4init $dev $cid L s$s"; KGE_DEVICE=$dev python e4init.py one gpuimg-$dev $cid $s L; echo "=== exit $?"
    done
  done
  for s in 1 2 3; do
    echo "=== e4init $dev c12 A s$s"; KGE_DEVICE=$dev python e4init.py one gpuimg-$dev c12 $s A; echo "=== exit $?"
  done
done
echo "=== compare"; python e4init.py compare gpuimg-cpu gpuimg-cuda; echo "=== exit $?"
echo "=== end $(date -u +%FT%TZ)"
