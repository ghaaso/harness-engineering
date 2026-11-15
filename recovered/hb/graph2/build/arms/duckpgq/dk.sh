#!/usr/bin/env bash
# Host helper: run a command inside graphtest:1 with the required limits, mounts and the gt-duckpgq volume.
#   bash arms/duckpgq/dk.sh "cd /build && node arms/duckpgq/bench.js"
B="C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build"
MSYS_NO_PATHCONV=1 docker run --rm --cpus 6 --memory 4g -v "$B:/build" \
  -v "C:/Users/User/Documents/projects/EMS_workshop1:/repo:ro" -v gt-duckpgq:/store graphtest:1 \
  bash -lc "git config --global --add safe.directory /repo; export GT_BUILD=/build GT_REPO=/repo GT_STORE=/store GT_TMP=/build/tmp/duckpgq; $1"
