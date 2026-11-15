#!/bin/bash
# Harness-fix2 lane: keep the previous answer files under old_results/ and install new_results/ into
# results/ (only this lane's folders: relational, reference, search, floor-dir, floor-co, sweep, and
# the relational/search files in tq/). Run once, on the host, after assemble.sh and verify2.js.
set -eu
R="$(cd "$(dirname "$0")" && pwd)"
RES="$(cd "$R/../../results" && pwd)"
O=$R/old_results; N=$R/new_results
[ -d "$O" ] && { echo "old_results exists already; refusing to overwrite it"; exit 1; }
mkdir -p "$O/tq"
for A in relational reference search floor-dir floor-co; do
  mkdir -p "$O/$A"; mv "$RES/$A/tune" "$O/$A/tune"; mv "$N/$A/tune" "$RES/$A/tune"
done
mv "$RES/sweep" "$O/sweep"; mv "$N/sweep" "$RES/sweep"
for f in relational.tune.jsonl relational.tune.answers.jsonl search.tune.jsonl search.tune.answers.jsonl; do
  [ -f "$RES/tq/$f" ] && mv "$RES/tq/$f" "$O/tq/$f"
done
cp "$N/tq/"*.answers.jsonl "$RES/tq/"
cp "$R/timing_relref.json" "$R/timing_search.json" "$R/timing_floors.json" "$R/verify2.json" "$RES/sweep/stage1/"
rm -rf "$N"
ls "$RES/tq"; du -sh "$O"
