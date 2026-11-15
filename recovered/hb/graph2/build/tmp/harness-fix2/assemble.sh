#!/bin/bash
# Harness-fix2 lane: gather the per-set outputs into one results tree (new_results/), on the host.
# Nothing in results/ is touched here; swap.sh moves the old files aside and installs the new ones.
set -eu
R="$(cd "$(dirname "$0")" && pwd)"
N=$R/new_results
rm -rf "$N"; mkdir -p "$N/sweep/stage1" "$N/tq"
for S in T1 T1x T2; do
  for A in relational reference; do mkdir -p "$N/$A/tune"; cp "$R/out_relref_$S/$A/tune/"*.jsonl.gz "$N/$A/tune/"; done
  mkdir -p "$N/search/tune"; cp "$R/out_search_$S/search/tune/"*.jsonl.gz "$N/search/tune/"
  for A in floor-dir floor-co; do mkdir -p "$N/$A/tune"; cp "$R/out_floors_$S/$A/tune/"*.jsonl.gz "$N/$A/tune/"; done
  for f in summary configs crosscheck_mismatches; do
    ext=json; [ $f = crosscheck_mismatches ] && ext=jsonl
    cp "$R/out_relref_$S/sweep/$f.$ext" "$N/sweep/stage1/relational+reference_$S.$f.$ext"
    cp "$R/out_search_$S/sweep/$f.$ext" "$N/sweep/stage1/search_$S.$f.$ext"
    cp "$R/out_floors_$S/sweep/$f.$ext" "$N/sweep/stage1/floor-dir+floor-co_$S.$f.$ext"
  done
done
cat "$R"/out_relref_*/sweep/lists.jsonl "$R"/out_search_*/sweep/lists.jsonl "$R"/out_floors_*/sweep/lists.jsonl > "$N/sweep/lists.jsonl"
cp "$R/out_random/sweep/"crosscheck_random* "$N/sweep/"
cp "$R/out_tq/tq/relational.tune.answers.jsonl" "$R/out_tq/tq/search.tune.answers.jsonl" "$N/tq/"
for A in relational reference search floor-dir floor-co; do echo "$A $(ls "$N/$A/tune" | wc -l) files"; done
