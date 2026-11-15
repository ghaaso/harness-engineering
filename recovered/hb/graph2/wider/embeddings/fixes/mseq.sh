#!/bin/sh
# release gate device-01 sequence (2026-11-14): one container at a time through frun.sh (other-kge wait + memgate
# wait before each), host logger beside each card run. usage: sh mseq.sh  (from fixes/)
one() {  # one <step> <cpu|gpu> <mem> <cmd...>
  st=$1; k=$2; m=$3; shift 3
  FRUN_MEM=$m sh frun.sh $st $k post MEM_TAG=$m MEM_EPOCHS=${EP:-3} -- "$@" || return
  if docker ps -q -f name=^kge-F1$ | grep -q .; then
    sh mlog.sh logs/$st-host.log & LP=$!
    docker wait kge-F1; wait $LP
  fi
  sh frun.sh --done $st
}
one e4mem-c16-2560m gpu 2560m python e4work.py mem c16
one e4mem-c13-3g gpu 3g python e4work.py mem c13
one e4mem-c16-3g gpu 3g python e4work.py mem c16
EP=1 one e4mem-cpu-init cpu 2560m sh -c 'python e4work.py mem c13 && python e4work.py mem c16'
echo MSEQ-END
