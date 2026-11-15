#!/bin/sh
# Build graphify's code-layer graph of ONE parent commit, inside graphtest-graphify:1 started with
# --network none. Mounts: /in = folder holding export.tar (git archive of the parent, read-only),
# /out = output folder (written), /adapter = this folder (read-only).
# Arguments: paths to remove from the export before the build (T3/T4 removed documents), or none.
# The export is unpacked into the container's tmpfs, so graphify reads files from memory, not through
# the Windows bind mount (INSTALL.md section 5.1: 2.8 s against 66.5 s).
set -u
mkdir -p /tmp/src /out/graphify-out
tar -x -f /in/export.tar -C /tmp/src || { echo "tar failed" >&2; exit 10; }
for p in "$@"; do
  case "$p" in
    *..*|/*) echo "refused remove path $p" >&2; exit 11;;
  esac
  rm -f "/tmp/src/$p" && echo "removed $p" >> /out/removed.txt
done
s=$(date +%s%N)
graphify extract /tmp/src --code-only --out /tmp/gout --max-workers 6 > /out/extract.log 2>&1
rc=$?
e=$(date +%s%N)
echo "$rc $s $e" > /out/extract.rc
[ "$rc" = 0 ] || exit 12
G=/tmp/gout/graphify-out
for f in graph.json manifest.json .graphify_analysis.json .graphify_build.json .graphify_root; do
  [ -f "$G/$f" ] && cp "$G/$f" /out/graphify-out/
done
/opt/graphify/bin/python -I /adapter/graph_stats.py /out/graphify-out/graph.json /tmp/src > /out/stats.json || exit 13
exit 0
