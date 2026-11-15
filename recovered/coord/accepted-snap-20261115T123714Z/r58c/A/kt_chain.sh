#!/bin/sh
# Agent A, r58c round 7: ktest runs one at a time, each started only when r58c/ktest.lock and
# orchestrator/grader-running.txt are both absent.  usage: sh r58c/A/kt_chain.sh <first N> "<items>" ["<items>" ...]
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
cd "$WB" || exit 2
N=$1; shift
for it in "$@"; do
  while [ -e r58c/ktest.lock ] || [ -e orchestrator/grader-running.txt ]; do sleep 5; done
  sh r58c/A/ktest.sh ktest-a$N "$it" > r58c/A/logs/a$N.out 2>&1; echo "exit=$?" >> r58c/A/logs/a$N.out
  echo "a$N [$it]"; grep ' rc=' r58c/A/logs/a$N.out | cut -c1-160
  N=$((N+1)); sleep 3
done
