#!/bin/bash
# U6 sweep driver: run_sweep.sh <repo> <eval epochs> [streams] [kinds] [part/of]; one card job per configuration, in order;
# a configuration whose last evaluation is already on disk is skipped. Exit code 75 of a job (card cap) stops the driver.
# Several drivers may run on one repository side by side (card gate, r57-0092): run_gpu.sh claims each setting
# (CR/improve/U6/claims), so a setting that another driver is running is skipped (exit 3) and no setting runs twice.
# part/of (e.g. 2/3) restricts a driver to the settings whose place in the grid order is part-1 modulo of (a fixed disjoint
# share); the default 1/1 walks every setting and takes whatever no other driver has claimed (shares by claims).
# tag (6th argument): the driver stops before its next setting once CR/improve/U6/stop-<tag> exists (fewer drivers).
REPO=$1; EV=$2; STREAMS=${3:-"pair bip"}; KINDS=${4:-"dygformer tgn"}; PART=${5:-1/1}; TAG=$6
P=${PART%/*}; OF=${PART#*/}
HERE=$(dirname "$0"); CRU=/c/Users/User/Documents/projects/card-run-2026-11
LAST=${EV##*,}; I=0
for NBR in 20 32; do for LR in 1e-4 3e-4 1e-3; do for ST in $STREAMS; do for KIND in $KINDS; do
  I=$((I + 1)); [ $(( (I - 1) % OF )) = $((P - 1)) ] || continue
  VN=$KIND; [ $ST = bip ] && VN=bip-$KIND
  CFG=$(node -e "console.log('n$NBR'+'_lr'+Number('$LR'))")
  [ -f $CRU/improve/U6/sweep/$VN/$REPO/$CFG/e$LAST.json ] && continue
  [ -n "$TAG" ] && [ -f $CRU/improve/U6/stop-$TAG ] && { echo "$(date -u +%T) stop-$TAG found: driver stops"; exit 0; }
  bash $HERE/run_gpu.sh sw-$VN-$REPO-$CFG sweep.py --stream $ST --repo $REPO --kind $KIND --nbr $NBR --lr $LR --eval $EV
  RC=$?
  echo "$(date -u +%T) $VN $REPO $CFG exit $RC"
  [ $RC = 75 ] && { echo "card cap: stop"; exit 75; }
done; done; done; done
echo "sweep $REPO done"
