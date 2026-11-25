#!/bin/bash
# U1 in order (Git Bash on the host; every step runs in a container with the network off, see run.sh).
# Steps 1-7 stop at READY; step 8 runs only after the refuter's breaking findings are fixed.
set -e
U1="$(cd "$(dirname "$0")" && pwd)"
CR="C:/Users/User/Documents/projects/card-run-2026-11"
D2="C:/Users/User/Documents/projects/harness-engineering/research-tree/build/runbig/card/d2"
export MSYS_NO_PATHCONV=1
step=${1:-all}
run() { "$U1/run.sh" cpu "$@"; }
if [[ $step == all || $step == split ]]; then for r in fixflow clinic zulip; do run python -B split.py $r; done; fi       # 1 split
if [[ $step == all || $step == dense ]]; then "$U1/run.sh" gpu dense python -B dense_u1.py; fi                         # 2 card: cosines
if [[ $step == all || $step == text ]]; then run python -B tune_text.py; fi                                             # 3 A7, A8 on tuning
if [[ $step == all || $step == signals ]]; then run python -B signals.py; fi                                            # 4 all signals, all blocks
if [[ $step == all || $step == table ]]; then run python -B features.py; fi                                             # 5 feature table
if [[ $step == all || $step == fusion ]]; then run python -B fusion.py; fi                                              # 6 A3 on tuning
if [[ $step == all || $step == ltr ]]; then run python -B ltr.py --name a2; fi                                          # 7 A2 on tuning
if [[ $step == all || $step == score ]]; then                                                                            # 7b card scorer on tuning
  run python -B cardfmt.py data
  for r in fixflow clinic zulip; do
    docker run --rm --network none --memory 6g -v "$D2:/code:ro" -v "$CR/improve/U1/cardfmt:/data" node:24-bookworm-slim node /code/bm25.mjs /data/$r
  done
  run python -B cardfmt.py ranks
  run sh -c 'cd /d2 && python -B score.py /out/cardfmt /out/tune/score-tuning.json --arms bm25,bm25py,bm25f,chunk,a7,a8,qwen3,swerank,a3,a2 > /dev/null'
fi
if [[ $step == tests ]]; then run python -B -m unittest -v test_u1; fi
if [[ $step == heldout ]]; then run python -B heldout.py; fi                                                            # 8 after the refuter
