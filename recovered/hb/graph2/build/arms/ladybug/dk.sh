#!/bin/bash
# Run a command inside graphtest:1 with the ladybug arm's environment (host side helper).
#   bash arms/ladybug/dk.sh "<commands>"      (store on the named volume gt-ladybug, mounted at /store)
B="C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build"
MSYS_NO_PATHCONV=1 docker run --rm --cpus 6 --memory 4g --label gt-lane=ladybug \
  -v "$B:/build" -v "C:/Users/User/Documents/projects/EMS_workshop1:/repo:ro" -v gt-ladybug:/store \
  -e GT_BUILD=/build -e GT_REPO=/repo -e GT_STORE=/store -e GT_TMP=/build/tmp/ladybug \
  graphtest:1 bash -lc "git config --global --add safe.directory /repo; $1"
