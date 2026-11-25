#!/bin/bash
# Refuter R-U1 runner: U1's code, the card's code and every output mounted read-only; network off; CPU only.
# usage: rr.sh <scratch dir on the host> <command...>   (/r = this folder, /w = the scratch dir, writable)
export MSYS_NO_PATHCONV=1
H="C:/Users/User/Documents/projects/harness-engineering/research-tree/build"
CR="C:/Users/User/Documents/projects/card-run-2026-11"
W=$1; shift
docker run --rm --network none --memory 12g \
  -e GIT_CONFIG_COUNT=1 -e GIT_CONFIG_KEY_0=safe.directory -e GIT_CONFIG_VALUE_0='*' -e PYTHONUNBUFFERED=1 -e PYTHONDONTWRITEBYTECODE=1 \
  -v "$H/improve/code/U1:/code:ro" -v "$H/runbig/card/d2:/d2:ro" -v "$CR/d2:/cr:ro" -v "$CR/improve/U1:/out:ro" \
  -v "C:/Users/User/Documents/projects/EMS_workshop1:/src/fixflow:ro" \
  -v "C:/Bilal_Migration/User/Downloads/20_Projects/24_Clinic_Workshop:/src/clinic:ro" \
  -v "$CR/repos/zulip:/src/zulip:ro" \
  -v "$H/improve/code/R-U1:/r:ro" -v "$W:/w" -w /r d2-embed-gpu:3 "$@"
