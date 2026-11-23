#!/usr/bin/env bash
# landtests.sh: a hand landing's test run (BUILD-PLAN section 3), used by the root until land.mjs has landed.
# Usage, through MAIN's lane: bash landtests.sh <checkout>/research-tree <out dir> <test files relative to it...>
# Files other than selftest run at --test-concurrency=8; selftest.test.mjs runs as its 4 shards (shards.cmds), all at
# once. Writes the TAP logs and summary.txt to <out dir>; exits 0 only if every part passed.
set -u
RT=$1; OUT=$2; shift 2
CMDS=C:/Users/User/Documents/projects/harness-engineering/research-tree/build/facts/lane-measure/shards.cmds
mkdir -p "$OUT"; : > "$OUT/summary.txt"
cd "$RT" || exit 66
others=(); st=0
for f in "$@"; do case "$f" in *selftest.test.mjs) st=1 ;; *) others+=("$f") ;; esac; done
if [ ${#others[@]} -gt 0 ]; then
  ( node --test --test-concurrency=8 --test-reporter=tap "${others[@]}" > "$OUT/others.log" 2>&1; echo "others $?" >> "$OUT/summary.txt" ) &
fi
if [ "$st" = 1 ]; then
  k=0
  while IFS= read -r c; do
    k=$((k+1)); c=${c%% > *}
    ( eval "$c" > "$OUT/shard$k.log" 2>&1; echo "shard$k $?" >> "$OUT/summary.txt" ) &
  done < "$CMDS"
fi
wait
for f in "$OUT"/*.log; do echo "$(basename "$f") $(grep -E '^# (tests|pass|fail|skipped)' "$f" | tr '\n' ' ')" >> "$OUT/summary.txt"; done
cat "$OUT/summary.txt"
! grep -qE '^(others|shard[0-9]) [1-9]' "$OUT/summary.txt"
