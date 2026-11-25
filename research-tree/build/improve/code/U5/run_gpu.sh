#!/bin/bash
# U5 card job: run_gpu.sh <label> <script.py> [args...]. Admitted by the card gate (../cardgate.sh, r57-0092; it replaced the
# one-job CR/GPU.lock on 2026-11-24) with the job's declared card and VM need (cardgate.sh gate_need; GATE_CARD_MIB /
# GATE_VM_MIB override); network off, 8 GB container cap; logs start, end, exit code and peak card memory to
# CR/logs/improve-U5.log as before. Out of memory under the gate's cap (exit 76): rerun once alone and uncapped. Hung
# (2026-11-25: no output line for T s with the card idle, or for 2 T s; cardgate.sh HANG WATCHDOG): the gate's watch kills its
# container and the job is requeued here through the gate at once with the same declaration (it resumes from its own save);
# at most GATE_HANG_MAX (2) requeues.
export MSYS_NO_PATHCONV=1
H="C:/Users/User/Documents/projects/harness-engineering/research-tree/build"
CR="C:/Users/User/Documents/projects/card-run-2026-11"
CRU=/c/Users/User/Documents/projects/card-run-2026-11
LOG=$CRU/logs/improve-U5.log
label=$1; shift
mkdir -p $CRU/improve/U5/logs $CRU/improve/U5/d4out
. $H/improve/code/cardgate.sh
trap 'gate_release' EXIT
read NEED_C NEED_V <<< "$(gate_need U5 "$label")"
gate_admit U5 "$label" $NEED_C $NEED_V
trap 'gate_release; echo "$(date -u +%FT%TZ) U5 $label lock released" >> $LOG' EXIT
echo "$(date -u +%FT%TZ) U5 $label start (lock taken; $*)" >> $LOG
T0=$SECONDS
MEMF=$CRU/improve/U5/logs/gpu-mem-$label.txt
( while sleep 10; do nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits 2>/dev/null; done ) > $MEMF &
MON=$!
run_job() {
  gate_watch_start U5 "$label"
  docker run --rm --gpus all --name $GATE_NAME --network none --memory 8g -e HF_HUB_OFFLINE=1 -e PYTHONDONTWRITEBYTECODE=1 -e D4_DATA=/data -e D4_OUT=/out/d4out -e U4_ROOT=/u4 \
    -e PYTHONPATH=/gatesite:/card:/code:/code4 -e GATE_TORCH_MIB=$GATE_TORCH_MIB -e U5_DEVICE=cuda -e U5_LR=1e-3 -v "$GATE_SITE:/gatesite:ro" \
    -v "$H/improve/code/U5:/code:ro" -v "$H/improve/code/U4:/code4:ro" -v "$H/runbig/card/d4:/card:ro" -v "$CR/d4/out:/cardout:ro" \
    -v "$H/runbig/card/d2:/d2code:ro" -v "$CR/models:/models:ro" \
    -v "$CR/d4/data:/carddata:ro" -v "$CR/improve/U4/data:/data:ro" -v "$CR/improve/U4:/u4:ro" -v "$CR/improve/U5:/out" -w /code \
    d2-embed-gpu:3 python -u "$@"
  RC=$?
  gate_watch_stop U5 "$label" $RC
}
CUR_C=$NEED_C; HANGS=0; OOM=0
while :; do
  run_job "$@"
  if [ "$GATE_HUNG" = 1 ] && [ $HANGS -lt $GATE_HANG_MAX ]; then
    HANGS=$((HANGS + 1)); echo "$(date +%T) $label hung (gate.log HANG): requeued through the gate ($HANGS of $GATE_HANG_MAX)"
    _g_log "REQUEUE U5 $label after a hang ($HANGS of $GATE_HANG_MAX), declared $CUR_C MiB"
    gate_release; gate_admit U5 "$label" $CUR_C $NEED_V; continue
  fi
  if [ $RC = 76 ] && [ $OOM = 0 ]; then
    OOM=1; echo "$(date +%T) $label out of memory under the gate's cap ($NEED_C MiB): rerun alone, uncapped"
    gate_learn U5 "$label"; gate_release; CUR_C=$GATE_USABLE; gate_admit U5 "$label" $CUR_C $NEED_V; continue
  fi
  break
done
[ "$GATE_HUNG" = 1 ] && _g_log "HANG U5 $label: hung $((HANGS + 1)) times; not requeued again, exit $RC"
[ $RC = 76 ] && RC=1
kill $MON 2>/dev/null
PEAK=$(sort -n $MEMF | tail -1)
echo "$(date -u +%FT%TZ) U5 $label end exit=$RC secs=$((SECONDS-T0)) peak card memory used (nvidia-smi, whole card) ${PEAK} MiB" >> $LOG
exit $RC
