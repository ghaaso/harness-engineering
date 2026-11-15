#!/bin/bash
# Pre-flight fix round 1: smoke of the one-file update measure (bench/update.js), TUNE inputs only (the
# smoke plan results/bench/smoke/plan.json), container-local priors and source store as run_all.sh does.
# Run from the host:  bash tmp/bench/update_smoke.sh
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && (pwd -W 2>/dev/null || pwd))"
MSYS_NO_PATHCONV=1 docker run --rm --name gt-update-smoke --cpus 6 --memory 4g \
  -v "$HERE:/build" -v "C:/Users/User/Documents/projects/EMS_workshop1:/repo:ro" \
  --mount type=tmpfs,destination=/build/sealed --mount type=tmpfs,destination=/build/audit \
  -e GT_BUILD=/build -e GT_REPO=/repo -e BENCH_STORE=/benchstore -e LB_PRIORS_DIR=/benchpriors -e GT_SRCSTORE=/benchsrc \
  -e BENCH_OUT=/build/results/bench/smoke-update -e BENCH_PLAN=/build/results/bench/smoke/plan.json \
  -e BENCH_UPDATE_N="${BENCH_UPDATE_N:-5}" -e BENCH_UPDATE_CHECK="${BENCH_UPDATE_CHECK:-5}" \
  graphtest:1 bash -lc "git config --global --add safe.directory /repo; cp -r /build/arms/ladybug/priors /benchpriors && cp -r /build/arms/common/srcstore /benchsrc && cd /build && n0=\$(ls /benchpriors | wc -l) && echo sealed entries \$(ls -A /build/sealed | wc -l) && for e in ${ENGINES:-relational ladybug duckpgq}; do node bench/update.js \$e; echo \"update exit \$? \$e\"; done; echo priors files before \$n0 after \$(ls /benchpriors | wc -l)"
