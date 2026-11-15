#!/usr/bin/env bash
# Interleaved engine bench for a busy machine (protocol addendum 5 section C). One command, from the HOST
# (Git Bash), from any folder:
#   bash bench/run_interleaved.sh [RUN]            # full run into results/bench/RUN (default RUN=interleaved)
#   bash bench/run_interleaved.sh RUN summary      # only re-run the check and the summary of RUN
# Restart after an interruption: run the same command again with the same settings. Finished units
# (pass, graph) are kept; an unfinished unit is redone from its start; the thread calibration is kept.
# A restart with different BENCH_* settings is refused (run_config.json).
# What it does:
#   1. starts the host CPU sampler (bench/hostload_live.ps1) writing results/bench/RUN/host_load.jsonl;
#   2. starts ONE container (graphtest:1, CPU set CPUSET, 6 CPUs, 6 GB) that runs bench/prep.js (when
#      plan.json is missing), bench/interleaved.js, bench/icheck.js, bench/isummary.js; store files live
#      on the container filesystem (/benchstore), reference answers are hidden (tmpfs over /build/sealed
#      and /build/audit), the repository is mounted read-only;
#   3. every 5 minutes records the clock offset host - container (clock.jsonl) for the load judgement;
#   4. stops the sampler at the end (it also stops by itself when the run's heartbeat is 30 minutes old).
# Settings (environment, all optional; defaults in bench/interleaved.js): BENCH_SEEDS (200), BENCH_PASSES
# (5), BENCH_CHUNK (20), BENCH_REPS (1), BENCH_COLD_N (20), BENCH_COLD_CHUNK (5), BENCH_UPDATE_N (50),
# BENCH_UPDATE_CHUNK (10), BENCH_UPDATE_CHECK (10), BENCH_CALIB (20), BENCH_CALIB_REPS (3), BENCH_NOOP_N
# (50), BENCH_BUILDS_PER_PASS (ceil(3 / passes)), BENCH_MAX_REPEATS (3), BENCH_LOAD_FRAC (0.5),
# BENCH_HOST_WAIT_S (20); CPUSET (12,14,16,18,20,22).
# Proof run: BENCH_SEEDS=10 BENCH_PASSES=2 BENCH_CALIB=10 BENCH_COLD_N=3 BENCH_UPDATE_N=5 bash bench/run_interleaved.sh proof
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD="$(cd "$HERE/.." && (pwd -W 2>/dev/null || pwd))"
REPO="${GT_REPO_HOST:-C:/Users/User/Documents/projects/EMS_workshop1}"
IMAGE=graphtest:1
CPUSET="${CPUSET:-12,14,16,18,20,22}"
RUN="${1:-interleaved}"; MODE="${2:-run}"
case "$RUN" in *[!A-Za-z0-9_-]*|'') echo "bad run name: $RUN" >&2; exit 2 ;; esac
OUT_REL="results/bench/$RUN"; OUT="$BUILD/$OUT_REL"; NAME="gt-ibench-$RUN"
mkdir -p "$OUT"; LOG="$OUT/run.log"
ts() { date -u +%Y-%m-%dT%H:%M:%SZ; }

if docker ps --format '{{.Names}}' | grep -qx "$NAME"; then
  echo "REFUSED: container $NAME is still running (an earlier invocation); wait for it or stop it first: docker stop $NAME" >&2; exit 2
fi

ENVS=(-e GT_BUILD=/build -e GT_REPO=/repo -e "BENCH_OUT=/build/$OUT_REL" -e BENCH_STORE=/benchstore -e LB_PRIORS_DIR=/benchpriors -e GT_SRCSTORE=/benchsrc)
for v in BENCH_SEEDS BENCH_PASSES BENCH_CHUNK BENCH_REPS BENCH_COLD_N BENCH_COLD_CHUNK BENCH_UPDATE_N BENCH_UPDATE_CHUNK BENCH_UPDATE_CHECK BENCH_CALIB BENCH_CALIB_REPS BENCH_NOOP_N BENCH_BUILDS_PER_PASS BENCH_MAX_REPEATS BENCH_LOAD_FRAC BENCH_HOST_WAIT_S BENCH_HOST_NCPU; do
  if [ -n "${!v:-}" ]; then ENVS+=(-e "$v=${!v}"); fi
done
dk() { # dk <name> <command>: the bench container (hidden references, read-only repo, store on the container filesystem)
  local name="$1"; shift
  MSYS_NO_PATHCONV=1 docker run --rm --name "$name" --cpuset-cpus "$CPUSET" --cpus 6 --memory 6g \
    -v "$BUILD:/build" -v "$REPO:/repo:ro" \
    --mount type=tmpfs,destination=/build/sealed --mount type=tmpfs,destination=/build/audit \
    "${ENVS[@]}" "$IMAGE" bash -lc "git config --global --add safe.directory /repo; mkdir -p /benchstore; cp -r /build/arms/ladybug/priors /benchpriors && cp -r /build/arms/common/srcstore /benchsrc && cd /build && $*"
}

if [ "$MODE" = "summary" ]; then
  dk "$NAME-summary" "node bench/icheck.js; node bench/isummary.js" 2>&1 | tee -a "$LOG"; exit "${PIPESTATUS[0]}"
fi

echo "[run_interleaved] $RUN start $(ts) (cpuset $CPUSET)" | tee -a "$LOG"
printf '{"at":"%s","docker":"%s","cpuset":"%s","containers":"%s"}\n' "$(ts)" \
  "$(docker info --format '{{.ServerVersion}} {{.OperatingSystem}} NCPU={{.NCPU}} Mem={{.MemTotal}}')" "$CPUSET" \
  "$(docker ps --format '{{.Names}}' | tr '\n' ' ')" >> "$OUT/host_env.jsonl"

# 1. host sampler (a sampler left by an interrupted invocation is stopped first, so only one writes)
STOP="$OUT/.sampler_stop"; HB="$OUT/.heartbeat"
touch "$STOP"; sleep 3; rm -f "$STOP"
date -u +%Y-%m-%dT%H:%M:%SZ > "$HB"
powershell -NoProfile -ExecutionPolicy Bypass -File "$(cygpath -w "$HERE/hostload_live.ps1")" \
  "$(cygpath -w "$OUT/host_load.jsonl")" "$(cygpath -w "$STOP")" "$(cygpath -w "$HB")" 1 30 30 >/dev/null 2>&1 &
SAMPLER=$!

# 3. clock offset host - container, every 5 minutes while the container runs
(
  for i in $(seq 1 120); do docker ps --format '{{.Names}}' | grep -qx "$NAME" && break; sleep 5; done
  while docker ps --format '{{.Names}}' | grep -qx "$NAME"; do
    hb="$(date +%s%3N)"; c="$(docker exec "$NAME" date +%s%3N 2>/dev/null)"; ha="$(date +%s%3N)"
    [ -n "$c" ] && printf '{"host_before_ms":%s,"ctr_ms":%s,"host_after_ms":%s}\n' "$hb" "$c" "$ha" >> "$OUT/clock.jsonl"
    for k in $(seq 1 60); do [ -f "$STOP" ] && exit 0; sleep 5; done
  done
) </dev/null >/dev/null 2>&1 &
CLOCK=$!

# 2. the bench container
dk "$NAME" "[ -f /build/$OUT_REL/plan.json ] || node bench/prep.js; node bench/interleaved.js && node bench/icheck.js && node bench/isummary.js" 2>&1 | tee -a "$LOG"
rc="${PIPESTATUS[0]}"

# 4. stop the sampler and the clock loop
touch "$STOP"; wait "$CLOCK" 2>/dev/null; wait "$SAMPLER" 2>/dev/null
echo "[run_interleaved] $RUN end $(ts) exit $rc" | tee -a "$LOG"
exit "$rc"
