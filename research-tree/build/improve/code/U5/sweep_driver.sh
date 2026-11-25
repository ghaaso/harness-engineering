#!/bin/bash
# U5 GPU driver: restartable. SweRankEmbed file vectors (one card job), then sweep runs (one card job per run, the lock is released
# between runs), freeze, cross-fit (one card job per fold), final scoring (one card job). Finished outputs are skipped.
# A CPU worker (cpu_worker.sh) may take runs from the same plan; claims in CR/improve/U5/claims keep them apart.
cd /c/Users/User/Documents/projects/harness-engineering/research-tree/build/improve/code/U5
CRU=/c/Users/User/Documents/projects/card-run-2026-11; O=$CRU/improve/U5
D=$O/logs/driver.log
say() { echo "$(date +%T) $*" >> $D; }
job() { local n=$1; shift; local t=0; until ./run_gpu.sh "$n" "$@" >> $O/logs/job-$n.log 2>&1; do t=$((t+1)); say "job $n failed (try $t)"; [ $t -ge 3 ] && { say "job $n gave up"; exit 1; }; sleep 30; done; }
[ -f $O/emb/zulip.npz ] || job embed-swerank embed_swerank.py fixflow clinic zulip
f=0
while true; do
  p=$(./run_cpu.sh train.py plan 2>/dev/null | tail -1)
  say "plan: $p"
  [ "$p" = DONE ] && break
  [ "$p" = BUSY ] && { sleep 120; continue; }
  ./run_gpu.sh sweep train.py work gpu >> $O/logs/job-sweep.log 2>&1; rc=$?
  say "work rc=$rc"
  case $rc in
    0|10|11|12) ;;
    *) say "sweep job failed rc=$rc"; sleep 30; f=$((f+1)); [ $f -ge 5 ] && { say gave up; exit 1; };;
  esac
done
[ -f $O/choice.json ] || ./run_cpu.sh train.py freeze >> $D 2>&1
for f in 0 1 2 3; do [ -f $O/crossfit/fold$f.json ] || job fold$f train.py crossfit --fold $f; done
[ -f $O/final.json ] || job final train.py final
say "driver finished"
