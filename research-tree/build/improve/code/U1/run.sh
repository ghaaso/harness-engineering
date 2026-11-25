#!/bin/bash
# U1 container runner, network off. usage: run.sh cpu <command...> | run.sh gpu <job-name> <command...>
# gpu: waits for CR/GPU.lock (mkdir, as CR/d2image/swerank-waiter.sh), logs start, end and peak card memory to
# CR/logs/improve-U1.log, releases the lock on exit.
export MSYS_NO_PATHCONV=1
CODE="C:/Users/User/Documents/projects/harness-engineering/research-tree/build/improve/code/U1"
D2="C:/Users/User/Documents/projects/harness-engineering/research-tree/build/runbig/card/d2"
CR="C:/Users/User/Documents/projects/card-run-2026-11"
CRU=/c/Users/User/Documents/projects/card-run-2026-11
IMG=${U1_IMAGE:-d2-embed-gpu:3}
LOG=$CRU/logs/improve-U1.log
MOUNTS=(-v "$CODE:/code:ro" -v "$D2:/d2:ro" -v "$CR/d2:/cr:ro" -v "$CR/improve/U1:/out" -v "$CR/models:/models:ro"
  -v "C:/Users/User/Documents/projects/EMS_workshop1:/src/fixflow:ro"
  -v "C:/Bilal_Migration/User/Downloads/20_Projects/24_Clinic_Workshop:/src/clinic:ro"
  -v "$CR/repos/zulip:/src/zulip:ro")
ENVS=(-e GIT_CONFIG_COUNT=1 -e GIT_CONFIG_KEY_0=safe.directory -e GIT_CONFIG_VALUE_0='*' -e HF_HUB_OFFLINE=1 -e PYTHONUNBUFFERED=1)
mode=$1; shift
case $mode in
  cpu)
    docker run --rm --network none --memory ${U1_MEM:-10g} "${ENVS[@]}" "${MOUNTS[@]}" -w /code $IMG "$@";;
  gpu)
    job=$1; shift
    until mkdir $CRU/GPU.lock 2>/dev/null; do echo "$(date +%T) U1 $job waiting for GPU.lock (held: $(cat $CRU/GPU.lock/owner.txt 2>/dev/null))"; sleep 30; done
    echo "U1 $job $$ $(date -u +%FT%TZ)" > $CRU/GPU.lock/owner.txt
    trap 'rm -rf $CRU/GPU.lock; echo "$(date -u +%FT%TZ) U1 $job lock released" >> $LOG' EXIT
    echo "$(date -u +%FT%TZ) U1 $job start (lock taken)" >> $LOG
    s=$SECONDS
    docker run --rm --gpus all --network none --memory ${U1_MEM:-10g} "${ENVS[@]}" "${MOUNTS[@]}" -w /code $IMG "$@"
    rc=$?
    echo "$(date -u +%FT%TZ) U1 $job end exit=$rc secs=$((SECONDS-s)) peak: $(grep -h 'PEAK_CUDA' $CRU/improve/U1/gpu-*.peak 2>/dev/null | tail -1)" >> $LOG;;
esac
