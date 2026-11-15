#!/bin/sh
# Agent A, r58c round 6: the injected-kinds stand-in sizing, one ktest at a time, each started only when r58c/ktest.lock
# and orchestrator/grader-running.txt are both absent.  usage: sh r58c/A/standin_chain.sh <first N> <arg> [<arg> ...]
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
cd "$WB" || exit 2
N=$1; shift
for a in "$@"; do
  while [ -e r58c/ktest.lock ] || [ -e orchestrator/grader-running.txt ]; do sleep 5; done
  KT_MEM=4096m sh r58c/A/ktest.sh ktest-a$N "script:r58c/A/inject_standin.py@$a" > r58c/A/logs/a$N.out 2>&1; echo "exit=$?" >> r58c/A/logs/a$N.out
  echo "a$N $a $(tail -4 r58c/A/logs/a$N.out | grep inject_standin | cut -c1-200)"
  N=$((N+1)); sleep 3
done
