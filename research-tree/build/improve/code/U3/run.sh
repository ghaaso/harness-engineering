#!/bin/bash
# U3 container runner, network off. usage: run.sh cpu <cmd...> | run.sh gpu <job-name> <cmd...> | run.sh cpurw <cmd...>
# gpu: admitted by the card gate (../cardgate.sh, r57-0092; it replaced the one-job CR/GPU.lock on 2026-11-24) with the job's
# declared card and VM need; logs start, end and peak card memory to CR/logs/improve-U3.log as before; out of memory under the
# gate's cap (exit 76): rerun once alone and uncapped (the job resumes from its checkpoint). cpurw: also mounts U1's table
# folder read-write (table fill only).
export MSYS_NO_PATHCONV=1
CODE="C:/Users/User/Documents/projects/harness-engineering/research-tree/build/improve/code/U3"
U1C="C:/Users/User/Documents/projects/harness-engineering/research-tree/build/improve/code/U1"
D2="C:/Users/User/Documents/projects/harness-engineering/research-tree/build/runbig/card/d2"
CR="C:/Users/User/Documents/projects/card-run-2026-11"
CRU=/c/Users/User/Documents/projects/card-run-2026-11
IMG=${U3_IMAGE:-d2-embed-gpu:3}
LOG=$CRU/logs/improve-U3.log
MOUNTS=(-v "$CODE:/code:ro" -v "$U1C:/u1:ro" -v "$D2:/d2:ro" -v "$CR/d2:/cr:ro" -v "$CR/improve/U1:/u1data:ro" -v "$CR/improve/U3:/out" -v "$CR/models:/models:ro"
  -v "$CR/tools/SweRank:/swerank:ro")
ENVS=(-e HF_HUB_OFFLINE=1 -e PYTHONUNBUFFERED=1 -e U1_OUT=/u1data -e U1_CODE=/u1 -e PYTHONPATH=/u1:/d2 -e PYTHONDONTWRITEBYTECODE=1 -e PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True)
mode=$1; shift
case $mode in
  cpu)
    docker run --rm --network none --memory ${U3_MEM:-10g} "${ENVS[@]}" "${MOUNTS[@]}" -w /code $IMG "$@";;
  cpurw)
    docker run --rm --network none --memory ${U3_MEM:-10g} "${ENVS[@]}" "${MOUNTS[@]}" -v "$CR/improve/U1/table:/u1table" -w /code $IMG "$@";;
  gpu)
    job=$1; shift
    . /c/Users/User/Documents/projects/harness-engineering/research-tree/build/improve/code/cardgate.sh
    GENVS=("${ENVS[@]/#PYTHONPATH=/PYTHONPATH=/gatesite:}")
    trap 'gate_release' EXIT
    read NEED_C NEED_V <<< "$(gate_need U3 "$job")"
    gate_admit U3 "$job" $NEED_C $NEED_V
    trap 'gate_release; echo "$(date -u +%FT%TZ) U3 $job lock released" >> $LOG' EXIT
    echo "$(date -u +%FT%TZ) U3 $job start (lock taken)" >> $LOG
    s=$SECONDS
    run_job() {
      gate_watch_start
      docker run --rm --gpus all --name $GATE_NAME --network none --memory ${U3_MEM:-14g} "${GENVS[@]}" -e GATE_TORCH_MIB=$GATE_TORCH_MIB -v "$GATE_SITE:/gatesite:ro" "${MOUNTS[@]}" -w /code $IMG "$@"
      rc=$?
      gate_watch_stop U3 "$job" $rc
    }
    run_job "$@"
    if [ $rc = 76 ]; then
      echo "$(date +%T) $job out of memory under the gate's cap ($NEED_C MiB): rerun alone, uncapped"
      gate_learn U3 "$job"; gate_release; gate_admit U3 "$job" $GATE_USABLE $NEED_V; run_job "$@"; [ $rc = 76 ] && rc=1
    fi
    echo "$(date -u +%FT%TZ) U3 $job end exit=$rc secs=$((SECONDS-s)) peak: $(tail -1 $CRU/improve/U3/gpu-$(echo $job | cut -d- -f1).peak 2>/dev/null)" >> $LOG
    exit $rc;;
esac
