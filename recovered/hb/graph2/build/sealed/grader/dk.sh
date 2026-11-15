#!/bin/bash
# Grader helper: run a command inside graphtest:1. /build is read-only; sealed/ is hidden behind an
# empty tmpfs (arm code never sees references); only sealed/grader (as /out) and tmp/grader are
# writable. Stores and the source store live on the grader's own named volume gt-grader (/store).
#   bash sealed/grader/dk.sh "<commands>"
B="C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build"
MSYS_NO_PATHCONV=1 docker run --rm --cpus 6 --memory 4g --label gt-lane=grader \
  -v "$B:/build:ro" --tmpfs /build/sealed:ro -v "$B/sealed/grader:/out" -v "$B/tmp/grader:/build/tmp/grader" \
  -v "C:/Users/User/Documents/projects/EMS_workshop1:/repo:ro" -v gt-grader:/store \
  -e GT_BUILD=/build -e GT_REPO=/repo -e GT_STORE=/store -e GT_SRCSTORE=/store/src -e GT_TMP=/tmp/gt -e GT_RESULTS=/build/tmp/grader/results \
  graphtest:1 bash -lc "git config --global --add safe.directory /repo; mkdir -p /tmp/gt; $1"
