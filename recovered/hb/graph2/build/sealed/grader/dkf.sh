#!/bin/bash
# Grader helper for freezing: like dk.sh (graphtest:1, 6 CPUs, 4 GB, /build read-only, sealed/ hidden
# behind an empty tmpfs) but results/frozen is mounted writable and GT_RESULTS is the default
# /build/results, so `run.js freeze` writes results/frozen/<hash>.json. Nothing else is writable.
#   bash sealed/grader/dkf.sh "<commands>"
B="C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build"
mkdir -p "$B/results/frozen"
MSYS_NO_PATHCONV=1 docker run --rm --cpus 6 --memory 4g --label gt-lane=grader \
  -v "$B:/build:ro" --tmpfs /build/sealed:ro -v "$B/results/frozen:/build/results/frozen" -v "$B/tmp/grader:/build/tmp/grader" \
  -v "C:/Users/User/Documents/projects/EMS_workshop1:/repo:ro" -v gt-grader:/store \
  -e GT_BUILD=/build -e GT_REPO=/repo -e GT_STORE=/store -e GT_SRCSTORE=/store/src -e GT_TMP=/tmp/gt \
  graphtest:1 bash -lc "git config --global --add safe.directory /repo; mkdir -p /tmp/gt; $1"
