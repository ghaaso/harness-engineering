#!/bin/bash
# the sweep of both models, one card job per stage (the lock is released between stages; finished runs are read back)
cd "$(dirname "$0")"
for tag in swerank qwen3; do
  for st in lr lr,epochs lr,epochs,negs lr,epochs,negs,filter lr,epochs,negs,filter,data; do
    ./run.sh gpu sweep-$tag-${st//,/-} python -B sweep.py $tag --stages $st || exit 1
  done
done
