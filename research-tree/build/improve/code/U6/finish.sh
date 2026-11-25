#!/bin/bash
# U6 finishing script, unattended: waits for the three sweep drivers to end, reruns every sweep setting that lacks its last epoch's
# result (exit 1, stopped, never run), then select_cfg, final (tuneheld, f0-f3 for both models on the three repositories), merge.
# usage: finish.sh            run it (nohup, background)
#        finish.sh --list     dry run: print what it would run and exit (waits for nothing, starts nothing)
# Log: CR/improve/U6/logs/finish.log. Every step is resumable and skips finished work, so the script can be started again.
# Nothing is dropped or shrunk: a setting that still lacks its result after 3 passes stops the script (exit 2) before selection.
HERE=$(cd "$(dirname "$0")" && pwd); CRU=/c/Users/User/Documents/projects/card-run-2026-11
CRW="C:/Users/User/Documents/projects/card-run-2026-11"
LOGF=$CRU/improve/U6/logs/finish.log
EV_SMALL=2,5,10,20,40,70,100; EV_ZULIP=1,2,3,4,6,8
REPOS="clinic fixflow zulip"; KINDS="dygformer tgn"
DRIVER_PIDS="33599 33603 33902"
LIST=0; [ "$1" = "--list" ] && LIST=1
say() { echo "$(date -u +%FT%TZ) $*" | tee -a $LOGF; }
[ $LIST = 1 ] && LOGF=/dev/null
cd $HERE

ev_of() { [ "$1" = zulip ] && echo $EV_ZULIP || echo $EV_SMALL; }

# settings of the sweep grid whose last evaluation file is not on disk: "<variant> <repo> <cfg>"
missing() {
  for REPO in $REPOS; do
    EV=$(ev_of $REPO); LAST=${EV##*,}
    for NBR in 20 32; do for LR in 1e-4 3e-4 1e-3; do for ST in pair bip; do for KIND in $KINDS; do
      VN=$KIND; [ $ST = bip ] && VN=bip-$KIND
      CFG=$(node -e "console.log('n$NBR'+'_lr'+Number('$LR'))")
      [ -f $CRU/improve/U6/sweep/$VN/$REPO/$CFG/e$LAST.json ] || echo "$VN $REPO $CFG"
    done; done; done; done
  done
}

drivers_alive() {
  for p in $DRIVER_PIDS; do kill -0 $p 2>/dev/null && return 0; done
  ps -ef | grep -q '[r]un_sweep.sh' && return 0
  return 1
}

if [ $LIST = 1 ]; then
  echo "== drivers still alive: $(for p in $DRIVER_PIDS; do kill -0 $p 2>/dev/null && echo -n "$p "; done)"
  echo "== sweep settings without their last epoch now (the drivers will still do some of these; what is left after they end is rerun, up to 3 passes):"
  missing | sed 's/^/   /'
  echo "== reruns per pass: run_sweep.sh clinic $EV_SMALL; run_sweep.sh fixflow $EV_SMALL; run_sweep.sh zulip $EV_ZULIP"
  echo "== then: run_cpu.sh select_cfg.py (extra mount /cardout)"
  for K in $KINDS; do for R in $REPOS; do for P in tuneheld f0 f1 f2 f3; do echo "   run_gpu.sh final-$K-$R-$P final.py --kind $K --repo $R --part $P"; done; done; done
  echo "== then, when CR/improve/U5/fill.running is absent: run_cpu.sh merge.py (extra mount /u4tables; per file lock .u6merge.lock)"
  exit 0
fi

say "finish.sh start (pid $$)"
while drivers_alive; do sleep 60; done
say "the three drivers have ended"

pass=1
while :; do
  M=$(missing)
  [ -z "$M" ] && { say "sweep complete: every setting has its last epoch"; break; }
  [ $pass -gt 3 ] && { say "STOP: after 3 passes these settings still lack their last epoch:"; echo "$M" | tee -a $LOGF; exit 2; }
  say "pass $pass: $(echo "$M" | wc -l) settings to run:"; echo "$M" | tee -a $LOGF
  for R in $REPOS; do
    echo "$M" | grep -q " $R " || continue
    bash $HERE/run_sweep.sh $R $(ev_of $R) >> $LOGF 2>&1; RC=$?
    [ $RC = 75 ] && { say "STOP: exit 75 (card cap); rerun finish.sh unchanged later"; exit 75; }
  done
  pass=$((pass+1))
done

say "select_cfg"
U6_DOCKER_EXTRA="-v $CRW/d4/out:/cardout:ro" bash $HERE/run_cpu.sh select_cfg.py >> $LOGF 2>&1 || { say "STOP: select_cfg failed"; exit 3; }

for K in $KINDS; do for R in $REPOS; do for P in tuneheld f0 f1 f2 f3; do
  say "final $K $R $P"
  for try in 1 2; do
    bash $HERE/run_gpu.sh final-$K-$R-$P final.py --kind $K --repo $R --part $P >> $LOGF 2>&1; RC=$?
    [ $RC = 0 ] && break
    [ $RC = 75 ] && { say "STOP: exit 75 (card cap); rerun finish.sh unchanged later"; exit 75; }
    say "final $K $R $P exit $RC (try $try)"
  done
  [ $RC = 0 ] || { say "STOP: final $K $R $P failed twice"; exit 4; }
done; done; done

while [ -e $CRU/improve/U5/fill.running ]; do say "U5 fill runs: merge waits"; sleep 60; done
say "merge (merge.py takes .u6merge.lock for each table file)"
touch $CRU/improve/U6/merge.running
U6_DOCKER_EXTRA="-v $CRW/improve/U4/tables:/u4tables" bash $HERE/run_cpu.sh merge.py >> $LOGF 2>&1; RC=$?
rm -f $CRU/improve/U6/merge.running
[ $RC = 0 ] || { say "STOP: merge failed exit $RC"; exit 5; }
say "finish.sh done"
