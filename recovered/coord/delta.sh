#!/bin/sh
# Coordinator's delta of the lane's code against the 09:24:35Z copy. It only reads the lane.
# usage: sh delta.sh            -> writes coord/delta-<UTC>/ (one .diff per changed file, new files copied, SUMMARY.txt)
COORD=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord
SNAP=$COORD/snap-20261115T092435Z
LANE=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
OUT=$COORD/delta-$(date -u +%Y%m%dT%H%M%SZ); mkdir -p "$OUT/diff" "$OUT/new"
cd "$LANE" || exit 1
# the same selection as the snapshot's FILES.txt
{ ls orchestrator/*.sh orchestrator/*.js orchestrator/*.py orchestrator/*.md 2>/dev/null
  ls train/*.py train/*.js train/*.sh train/*.md 2>/dev/null
  find r58c/A r58c/B -maxdepth 1 -type f \( -name '*.py' -o -name '*.sh' -o -name '*.js' -o -name '*.json' -o -name '*.md' -o -name 'READY-*' \) 2>/dev/null
  find r58c/B/tests r58c/B/eor r58c/B/rerun r58c/B/rehearsal r58c/B/frozen r58c/B/timing r58c/tests train/r58/tests -maxdepth 1 -type f 2>/dev/null
  ls r58c/*.py r58c/*.txt r58c/*.md 2>/dev/null
} | sort -u > "$OUT/LIVE.txt"
sort -u "$SNAP/FILES.txt" > "$OUT/SNAPFILES.txt"
comm -13 "$OUT/SNAPFILES.txt" "$OUT/LIVE.txt" > "$OUT/NEW.txt"
comm -23 "$OUT/SNAPFILES.txt" "$OUT/LIVE.txt" > "$OUT/REMOVED.txt"
: > "$OUT/CHANGED.txt"
comm -12 "$OUT/SNAPFILES.txt" "$OUT/LIVE.txt" | while read -r f; do
  if ! cmp -s "$SNAP/$f" "$f"; then
    d="$OUT/diff/$(echo "$f" | tr '/' '_').diff"
    diff -u "$SNAP/$f" "$f" > "$d" 2>/dev/null
    add=$(grep -c '^+[^+]' "$d"); del=$(grep -c '^-[^-]' "$d")
    echo "$f	+$add	-$del	$(sha256sum "$f" | cut -c1-64)" >> "$OUT/CHANGED.txt"
  fi
done
while read -r f; do mkdir -p "$OUT/new/$(dirname "$f")"; cp -p "$f" "$OUT/new/$f"; echo "$f	$(wc -l < "$f") lines	$(sha256sum "$f" | cut -c1-64)"; done < "$OUT/NEW.txt" > "$OUT/NEWLIST.txt"
{ echo "delta against $SNAP at $(date -u +%FT%TZ)"
  echo "changed: $(wc -l < "$OUT/CHANGED.txt")   new: $(wc -l < "$OUT/NEW.txt")   removed: $(wc -l < "$OUT/REMOVED.txt")"
  echo "--- changed (path, added lines, removed lines, sha256 now)"; cat "$OUT/CHANGED.txt"
  echo "--- new"; cat "$OUT/NEWLIST.txt"
  echo "--- removed"; cat "$OUT/REMOVED.txt"
} > "$OUT/SUMMARY.txt"
echo "$OUT"; head -n 3 "$OUT/SUMMARY.txt"
