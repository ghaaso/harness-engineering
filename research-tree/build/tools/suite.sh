#!/usr/bin/env bash
# suite.sh: the build's full suite (ORCHESTRATION.md section 13 row 5), adapted from facts/lane-measure/full.sh
# without the processor recorder. Usage, through MAIN's lane as one background command of the root:
#   node MAIN/research-tree/tools/lane.mjs --label suite-<n> --timeout-s 600 -- \
#     bash MAIN/research-tree/build/tools/suite.sh <checkout>/research-tree <out dir>
# Runs every test file but selftest at --test-concurrency=8 beside selftest's 4 shards (shards.cmds), all at once,
# in <checkout>/research-tree; writes the TAP logs and summary.txt to <out dir>; exits 0 only if every part passed.
set -u
RT=$1; OUT=$2
CMDS=C:/Users/User/Documents/projects/harness-engineering/research-tree/build/facts/lane-measure/shards.cmds
mkdir -p "$OUT"; : > "$OUT/summary.txt"
cd "$RT" || exit 66
S=$(date +%s.%N)
( s=$(date +%s.%N); node --test --test-concurrency=8 --test-reporter=tap $(ls tcb/test/*.test.mjs | grep -v selftest) > "$OUT/others.log" 2>&1; rc=$?; e=$(date +%s.%N); echo "others $rc $(awk "BEGIN{print $e-$s}")" >> "$OUT/summary.txt" ) &
k=0
while IFS= read -r c; do
  k=$((k+1)); c=${c%% > *}
  ( s=$(date +%s.%N); eval "$c" > "$OUT/shard$k.log" 2>&1; rc=$?; e=$(date +%s.%N); echo "shard$k $rc $(awk "BEGIN{print $e-$s}")" >> "$OUT/summary.txt" ) &
done < "$CMDS"
wait
E=$(date +%s.%N); echo "WALL $(awk "BEGIN{print $E-$S}")" >> "$OUT/summary.txt"
for f in "$OUT"/others.log "$OUT"/shard*.log; do
  echo "$(basename "$f") $(grep -E '^# (tests|pass|fail|skipped)' "$f" | tr '\n' ' ')" >> "$OUT/summary.txt"
done
cat "$OUT/summary.txt"
! grep -qE '^(others|shard[0-9]) [1-9]' "$OUT/summary.txt"
