#!/bin/bash
# Run a command inside graphtest:1 for the graph-arm audit (host side helper).
# /build is mounted READ-ONLY; only audit/graph and tmp/audit-graph are writable. The builders' store
# volumes are mounted read-only at /lbstore and /dkstore. This lane's own stores live on the named
# volume gt-audit-graph at /work (never on /build).
#   bash audit/graph/dk.sh "<commands>"
B="C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build"
MSYS_NO_PATHCONV=1 docker run --rm --cpus 6 --memory 4g --label gt-lane=audit-graph \
  -v "$B:/build:ro" -v "$B/audit/graph:/build/audit/graph" -v "$B/tmp/audit-graph:/build/tmp/audit-graph" \
  -v "C:/Users/User/Documents/projects/EMS_workshop1:/repo:ro" \
  -v gt-ladybug:/lbstore:ro -v gt-duckpgq:/dkstore:ro -v gt-audit-graph:/work \
  -e GT_BUILD=/build -e GT_REPO=/repo -e GT_STORE=/work -e GT_TMP=/build/tmp/audit-graph -e GT_RESULTS=/build/audit/graph/results \
  graphtest:1 bash -lc "git config --global --add safe.directory /repo; cd /build/audit/graph; $1"
