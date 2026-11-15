#!/usr/bin/env bash
# Preflight check 10: run the engine benches (bench/) end to end with 5 seeds, unchanged bench code,
# same container shape as bench/run_all.sh (pinned CPU set, 6 CPUs, 4 GB, sealed hidden) with three
# differences, so that nothing is written outside audit/preflight: output goes to
# audit/preflight/bench5 (so /build/audit is NOT hidden here), the source store, scratch exports and
# the LadybugDB prior folder are container-local copies (GT_SRCSTORE, GT_TMP, LB_PRIORS_DIR).
set -uo pipefail
B="C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build"
OUT_REL=audit/preflight/bench5; OUT_HOST="$B/$OUT_REL"; rm -rf "$OUT_HOST"; mkdir -p "$OUT_HOST"
CPUSET=12,14,16,18,20,22
# (first attempt set GT_SRCSTORE to a container-local folder: prep.js refuses, by design, to run without
#  the shared source store's existing trees, because the bench never writes that store; so the shared
#  store is used as the bench intends, and its tree count is checked before and after)
ENVS=(-e GT_BUILD=/build -e GT_REPO=/repo -e BENCH_OUT=/build/$OUT_REL -e BENCH_STORE=/benchstore -e LB_PRIORS_DIR=/tmp/lbpriors -e BENCH_SEEDS=5 -e BENCH_CALIB=5 -e BENCH_COLD_N=5)
PRE="git config --global --add safe.directory /repo; mkdir -p /tmp/gt /tmp/lbpriors; cp /build/arms/ladybug/priors/*.json /tmp/lbpriors/; cd /build"
dk() { local name="$1"; shift
  MSYS_NO_PATHCONV=1 docker run --rm --name "$name" --cpuset-cpus "$CPUSET" --cpus 6 --memory 4g \
    -v "$B:/build" -v "C:/Users/User/Documents/projects/EMS_workshop1:/repo:ro" \
    --mount type=tmpfs,destination=/build/sealed "${ENVS[@]}" graphtest:1 bash -lc "$PRE && $* ; echo exit=\$? priors=\$(ls /tmp/lbpriors | wc -l)"; }
stats() { docker stats --no-stream --format '{{json .}}' postiz postiz-postgres postiz-redis | sed "s/^/{\"when\":\"$1\",\"engine\":\"$2\",\"stats\":/; s/\$/}/" >> "$OUT_HOST/host_stats.jsonl"; echo "{\"when\":\"$1\",\"engine\":\"$2\",\"running\":\"$(docker ps --format '{{.Names}}' | tr '\n' ' ')\"}" >> "$OUT_HOST/host_stats.jsonl"; }
priors_before=$(ls "$B/arms/ladybug/priors" | wc -l); trees_before=$(ls "$B/arms/common/srcstore/trees" | wc -l)
s=$(date +%s)
echo "== plan"; dk gt-pf-bench-prep "node bench/prep.js"
for e in relational ladybug duckpgq; do echo "== $e"; stats before $e; dk gt-pf-bench-$e "node bench/$e.js run"; stats after $e; done
echo "== check"; dk gt-pf-bench-check "node bench/check.js"
echo "== summary"; dk gt-pf-bench-summary "node bench/summary.js"
echo "wall $(( $(date +%s) - s )) s; arms priors $priors_before -> $(ls "$B/arms/ladybug/priors" | wc -l); srcstore trees $trees_before -> $(ls "$B/arms/common/srcstore/trees" | wc -l)"
