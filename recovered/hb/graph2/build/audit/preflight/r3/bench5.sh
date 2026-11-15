#!/usr/bin/env bash
# Re-audit 3, check 10: the engine benches (bench/, as it stands after fix round 2) end to end with 5 seeds, in the same
# container shape and order as bench/run_all.sh (pinned CPU set, 6 CPUs, 4 GB, sealed hidden, plan ->
# per engine query bench then update.js -> check -> summary), with one difference so nothing is written
# outside audit/preflight: the output goes to audit/preflight/r3/bench5, so /build/audit is NOT hidden.
# Priors and source store are container-local copies, exactly as run_all.sh does.
set -uo pipefail
B="C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build"
OUT_REL=audit/preflight/r3/bench5; OUT_HOST="$B/$OUT_REL"; rm -rf "$OUT_HOST"; mkdir -p "$OUT_HOST"
CPUSET=12,14,16,18,20,22
ENVS=(-e GT_BUILD=/build -e GT_REPO=/repo -e BENCH_OUT=/build/$OUT_REL -e BENCH_STORE=/benchstore -e LB_PRIORS_DIR=/benchpriors -e GT_SRCSTORE=/benchsrc
      -e BENCH_SEEDS=5 -e BENCH_CALIB=5 -e BENCH_COLD_N=5 -e BENCH_UPDATE_N=5 -e BENCH_UPDATE_CHECK=5)
dk() { local name="$1"; shift
  MSYS_NO_PATHCONV=1 docker run --rm --name "$name" --cpuset-cpus "$CPUSET" --cpus 6 --memory 4g \
    -v "$B:/build" -v "C:/Users/User/Documents/projects/EMS_workshop1:/repo:ro" \
    --mount type=tmpfs,destination=/build/sealed "${ENVS[@]}" graphtest:1 bash -lc "git config --global --add safe.directory /repo; cp -r /build/arms/ladybug/priors /benchpriors && cp -r /build/arms/common/srcstore /benchsrc && cd /build && $* ; echo exit=\$? priors=\$(ls /benchpriors | wc -l) srctrees=\$(ls /benchsrc/trees | wc -l)"; }
stats() { docker stats --no-stream --format '{{json .}}' postiz postiz-postgres postiz-redis | sed "s/^/{\"when\":\"$1\",\"engine\":\"$2\",\"stats\":/; s/\$/}/" >> "$OUT_HOST/host_stats.jsonl"; echo "{\"when\":\"$1\",\"engine\":\"$2\",\"running\":\"$(docker ps --format '{{.Names}}' | tr '\n' ' ')\"}" >> "$OUT_HOST/host_stats.jsonl"; }
priors_before=$(ls "$B/arms/ladybug/priors" | wc -l); trees_before=$(ls "$B/arms/common/srcstore/trees" | wc -l)
s=$(date +%s)
echo "== plan"; dk gt-pf3-bench-prep "node bench/prep.js"
for e in relational ladybug duckpgq; do
  echo "== $e"; stats before $e; dk gt-pf3-bench-$e "node bench/$e.js run"; stats after $e
  echo "== update $e"; stats before update-$e; dk gt-pf3-bench-update-$e "node bench/update.js $e"; stats after update-$e
done
echo "== check"; dk gt-pf3-bench-check "node bench/check.js"
echo "== summary"; dk gt-pf3-bench-summary "node bench/summary.js"
echo "wall $(( $(date +%s) - s )) s; arms priors $priors_before -> $(ls "$B/arms/ladybug/priors" | wc -l); srcstore trees $trees_before -> $(ls "$B/arms/common/srcstore/trees" | wc -l)"
