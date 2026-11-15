#!/usr/bin/env bash
# Engine benches of protocol addendum 4, section E: run from the HOST (Git Bash), from any folder:
#   bash bench/run_all.sh                    # full run: 200 seeds per class, results/bench/
#   BENCH_SEEDS=10 BENCH_OUT_REL=results/bench/smoke bash bench/run_all.sh     # smoke run
# Order: plan (prep.js) -> for each of relational, ladybug, duckpgq: the query bench, then the one-file
# update measure (bench/update.js; one engine at a time, never two at once, each in its own container on
# a fixed CPU set) -> equivalence check -> summary.md.
# Before and after each engine it records `docker stats --no-stream` of the three unrelated host
# containers (postiz, postiz-postgres, postiz-redis; they are only read, never touched).
# Environment (all optional): CPUSET (default 12,14,16,18,20,22: one hardware thread on each of six
# physical cores of the second core complex, see bench/NOTES.md), BENCH_SEEDS (200), BENCH_COLD_N
# (= seeds), BENCH_REPS (3), BENCH_BUILDS (3), BENCH_CALIB (20), BENCH_NOOP_N (500), BENCH_OUT_REL
# (results/bench), BENCH_ENGINES ("relational ladybug duckpgq"), BENCH_ALLOW_BUSY=1 (run even when
# another container besides the three postiz ones is running), BENCH_UPDATE_N (files per graph in the
# update measure; default every distinct seed file), BENCH_UPDATE_CHECK (seeds in its answer check, 10).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD="$(cd "$HERE/.." && (pwd -W 2>/dev/null || pwd))"
REPO="${GT_REPO_HOST:-C:/Users/User/Documents/projects/EMS_workshop1}"
IMAGE=graphtest:1
CPUSET="${CPUSET:-12,14,16,18,20,22}"
OUT_REL="${BENCH_OUT_REL:-results/bench}"
OUT_HOST="$BUILD/$OUT_REL"
ENGINES="${BENCH_ENGINES:-relational ladybug duckpgq}"
UNRELATED="postiz postiz-postgres postiz-redis"
mkdir -p "$OUT_HOST"

# The LadybugDB community priors and the shared source store are read from container-local copies
# (/benchpriors, /benchsrc, made at the start of every container), so nothing in the bench can write
# into arms/ (pre-flight fix round 1, minor defect "run_all.sh points at arms/ folders").
ENVS=(-e GT_BUILD=/build -e GT_REPO=/repo -e BENCH_OUT=/build/$OUT_REL -e BENCH_STORE=/benchstore
      -e LB_PRIORS_DIR=/benchpriors -e GT_SRCSTORE=/benchsrc)
for v in BENCH_SEEDS BENCH_COLD_N BENCH_REPS BENCH_BUILDS BENCH_CALIB BENCH_NOOP_N BENCH_UPDATE_N BENCH_UPDATE_CHECK; do
  if [ -n "${!v:-}" ]; then ENVS+=(-e "$v=${!v}"); fi
done

others() { docker ps --format '{{.Names}}' | grep -v -x -e postiz -e postiz-postgres -e postiz-redis || true; }
busy="$(others | tr '\n' ' ')"
if [ -n "$busy" ] && [ "${BENCH_ALLOW_BUSY:-0}" != "1" ]; then
  echo "REFUSED: other containers are running ($busy); the measure needs a quiet machine (addendum 4 item 17). Set BENCH_ALLOW_BUSY=1 to override." >&2
  exit 2
fi

dk() { # dk <name> <command...>: one container, pinned CPUs, 4 GB, reference answers hidden
  local name="$1"; shift
  MSYS_NO_PATHCONV=1 docker run --rm --name "$name" --cpuset-cpus "$CPUSET" --cpus 6 --memory 4g \
    -v "$BUILD:/build" -v "$REPO:/repo:ro" \
    --mount type=tmpfs,destination=/build/sealed --mount type=tmpfs,destination=/build/audit \
    "${ENVS[@]}" "$IMAGE" bash -lc "git config --global --add safe.directory /repo; cp -r /build/arms/ladybug/priors /benchpriors && cp -r /build/arms/common/srcstore /benchsrc && cd /build && $*"
}
stats() { # stats <when> <engine>
  local at; at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  docker stats --no-stream --format '{{json .}}' $UNRELATED 2>/dev/null | while IFS= read -r line; do
    printf '{"when":"%s","engine":"%s","at":"%s","stats":%s}\n' "$1" "$2" "$at" "$line"
  done >> "$OUT_HOST/host_stats.jsonl"
  printf '{"when":"%s","engine":"%s","at":"%s","running":"%s"}\n' "$1" "$2" "$at" "$(docker ps --format '{{.Names}}' | tr '\n' ' ')" >> "$OUT_HOST/host_stats.jsonl"
}

rm -f "$OUT_HOST/host_stats.jsonl"
printf '{"docker":"%s","cpuset":"%s","containers_at_start":"%s","other_than_unrelated":"%s","allow_busy":"%s","started":"%s","engines":"%s"}\n' \
  "$(docker info --format '{{.ServerVersion}} {{.OperatingSystem}} NCPU={{.NCPU}} Mem={{.MemTotal}}')" "$CPUSET" \
  "$(docker ps --format '{{.Names}}' | tr '\n' ' ')" "$busy" "${BENCH_ALLOW_BUSY:-0}" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$ENGINES" > "$OUT_HOST/host_env.json"

echo "== plan"; dk gt-bench-prep "node bench/prep.js"
for e in $ENGINES; do
  echo "== $e"
  stats before "$e"
  dk "gt-bench-$e" "node bench/$e.js run"
  stats after "$e"
  # the one-file update measure (bench/update.js), its own container, after the query bench
  stats before "update-$e"
  dk "gt-bench-update-$e" "node bench/update.js $e"
  stats after "update-$e"
done
echo "== check"; dk gt-bench-check "node bench/check.js"
echo "== summary"; dk gt-bench-summary "node bench/summary.js"
echo "done: $OUT_HOST"
