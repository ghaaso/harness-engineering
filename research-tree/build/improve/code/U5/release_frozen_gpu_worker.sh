#!/bin/bash
# Coordinator 6 (02d5327b), 2026-11-24: U5's old-copy card worker (pid 115321, `run_gpu.sh sweep train.py work gpu`, child of
# sweep_driver 98729) stays frozen (GATE: a GAT run on the card took the whole card plus 1.8 GB spilled). The CPU worker runs the
# sweep. When the plan is DONE, this kills the frozen worker so the driver goes on to freeze, cross-fit and final (through the gate).
cd /c/Users/User/Documents/projects/harness-engineering/research-tree/build/improve/code/U5
O=/c/Users/User/Documents/projects/card-run-2026-11/improve/U5; D=$O/logs/driver.log
while kill -0 115321 2>/dev/null; do
  p=$(./run_cpu.sh train.py plan 2>/dev/null | tail -1)
  if [ "$p" = DONE ]; then
    echo "$(date +%T) coordinator 6: plan DONE on CPU; frozen card worker 115321 killed so the driver goes on" >> $D
    kill -9 115321; break
  fi
  sleep 600
done
