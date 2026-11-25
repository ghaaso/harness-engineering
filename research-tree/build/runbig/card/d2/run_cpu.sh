#!/bin/bash
# CPU steps, network off. usage: run_cpu.sh <repo: fixflow|clinic|zulip> [prep|bm25|grep]...
# Host paths as MSYS-free Windows paths.
export MSYS_NO_PATHCONV=1
CODE="C:/Users/User/Documents/projects/harness-engineering/research-tree/build/runbig/card/d2"
CR="C:/Users/User/Documents/projects/card-run-2026-11"
repo=$1; shift
case $repo in
  fixflow) SRC="C:/Users/User/Documents/projects/EMS_workshop1";;
  clinic)  SRC="C:/Bilal_Migration/User/Downloads/20_Projects/24_Clinic_Workshop";;
  zulip)   SRC="$CR/repos/zulip";;
esac
IMG=${D2_IMAGE:-graphtest-kge-gpu:1}
for step in "$@"; do
  case $step in
    prep) docker run --rm --network none --memory 6g -e GIT_CONFIG_COUNT=1 -e GIT_CONFIG_KEY_0=safe.directory -e GIT_CONFIG_VALUE_0='*' \
            -v "$CODE:/code:ro" -v "$SRC:/src:ro" -v "$CR/d2:/data" $IMG python -B /code/prep.py --repo /src --name $repo --ref main --out /data/$repo;;
    bm25) docker run --rm --network none --memory 6g -v "$CODE:/code:ro" -v "$CR/d2:/data" node:24-bookworm-slim node /code/bm25.mjs /data/$repo;;
    grep) docker run --rm --network none --memory 6g -v "$CODE:/code:ro" -v "$CR/d2:/data" $IMG python -B /code/grep_rrf.py /data/$repo $([ $repo = fixflow ] && echo rrf);;
  esac
done
