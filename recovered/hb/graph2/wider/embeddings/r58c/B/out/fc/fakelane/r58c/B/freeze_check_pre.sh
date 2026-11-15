#!/bin/sh
# END-ORDER's freeze check (host, Git Bash): prints nothing and exits 0 when every line of orchestrator/freeze-list.txt
# still holds: block 1 (lane-relative) and block 2 (`# outside`, absolute paths) through `sha256sum -c --quiet`,
# block 3 (`# images`) through `docker image inspect`. Any difference prints it and exits 1; no list exits 2.
# usage: sh freeze_check.sh [LIST]      (default LANE/orchestrator/freeze-list.txt)
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/r58c/B/out/fc/fakelane
LIST=${1:-$W/orchestrator/freeze-list.txt}
[ -s "$LIST" ] || { echo "freeze_check: no freeze list $LIST"; exit 2; }
cd "$W" || exit 2
rc=0
awk '/^# outside$/{b=2;next} /^# images$/{b=3;next} b<3' "$LIST" | grep -v '^#' | sha256sum -c --quiet - || rc=1
awk '/^# images$/{b=3;next} b==3' "$LIST" | while read -r id tag; do
  have=$(docker image inspect -f '{{.Id}}' "$tag" 2>/dev/null | tr -d '\r')
  [ "$have" = "$id" ] || { echo "$tag: image $have, frozen $id"; exit 1; }
done || rc=1
n=$(awk '/^# images$/{b=3;next} b==3' "$LIST" | grep -c .)
[ "$n" -eq 2 ] || { echo "freeze_check: the # images block has $n lines, not 2"; rc=1; }
exit $rc
