#!/usr/bin/env bash
# Measurement lane driver (engine timing, addendum 4 section E). Runs bench/run_all.sh unchanged, one
# engine per invocation, so that a quiet-machine gate can run before each engine:
#   - no graphtest:1 container may be running;
#   - docker stats --no-stream of postiz, postiz-postgres, postiz-redis is recorded; if their summed CPU
#     use is above 5 % of one CPU, wait 60 s and re-check, up to three re-checks, then measure anyway
#     (recorded as "measured_busy");
#   - host gate (added after the first attempt was spoiled by two host processes using about 22 logical
#     CPUs): CPU of host processes other than the Docker/WSL virtual machine must be at most
#     HOST_MAX (default 150 % of one logical CPU, i.e. 1.5 of 24); else wait 120 s and re-check, for at
#     most HOST_WAIT_MAX checks (default 90, i.e. 3 hours), then measure anyway ("host_busy").
# A host sampler (tmp/bench/hostload.ps1) records host CPU every 30 s during the whole run into
# results/bench/<run>/host_load.jsonl, so a disturbance during a measure is visible afterwards.
# All three invocations write into the same folder results/bench/<run>/, so the duckpgq invocation's
# check.js and summary.js see all three engines. run_all.sh truncates host_stats.jsonl at its start, so
# it is stashed after each invocation and restored at the end, then summary.js is re-run once.
#   bash tmp/bench/measure.sh run1
set -uo pipefail
RUN="${1:?usage: measure.sh run1|run2}"
BUILD="C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build"
REPO="C:/Users/User/Documents/projects/EMS_workshop1"
HOST_MAX="${HOST_MAX:-150}"; HOST_WAIT_MAX="${HOST_WAIT_MAX:-90}"
OUT_REL="results/bench/$RUN"
OUT="$BUILD/$OUT_REL"
mkdir -p "$OUT"
GATE="$OUT/gate.jsonl"; STASH="$OUT/host_stats.all.jsonl"; TIMES="$OUT/wall.jsonl"; HL="$OUT/host_load.jsonl"; STOP="$OUT/.sampler_stop"
: > "$GATE"; : > "$STASH"; : > "$TIMES"; rm -f "$STOP"
WIN_HL="$(cygpath -w "$HL")"; WIN_STOP="$(cygpath -w "$STOP")"; WIN_PS1="$(cygpath -w "$BUILD/tmp/bench/hostload.ps1")"
ts() { date -u +%Y-%m-%dT%H:%M:%SZ; }

host_other() { # one host sample; prints other_pct_of_one
  local f; f="$OUT/.hostprobe.jsonl"; rm -f "$f"
  powershell -NoProfile -ExecutionPolicy Bypass -File "$WIN_PS1" "$(cygpath -w "$f")" 1 1 >/dev/null 2>&1
  local line; line="$(tail -1 "$f" 2>/dev/null | tr -d '\r\357\273\277')"; rm -f "$f"
  printf '%s' "$line" > "$OUT/.lasthost"
  printf '%s' "$line" | grep -o '"other_pct_of_one":[0-9.]*' | cut -d: -f2
}

hostgate() {
  local e="$1" k=0 v
  while :; do
    v="$(host_other)"; v="${v:-9999}"
    if awk "BEGIN{exit !($v <= $HOST_MAX)}"; then verdict=host_quiet; elif [ "$k" -ge "$HOST_WAIT_MAX" ]; then verdict=host_busy; else verdict=host_wait; fi
    printf '{"run":"%s","engine":"%s","host_check":%d,"at":"%s","host_other_pct_of_one":%s,"limit":%s,"verdict":"%s","sample":%s}\n' "$RUN" "$e" "$k" "$(ts)" "$v" "$HOST_MAX" "$verdict" "$(cat "$OUT/.lasthost" 2>/dev/null || echo null)" >> "$GATE"
    echo "[hostgate] $e check $k: other host CPU ${v}% of one CPU -> $verdict"
    case "$verdict" in host_quiet|host_busy) return 0 ;; esac
    k=$((k + 1)); sleep 120
  done
}

gate() {
  local e="$1" try=0 gt lines sum verdict
  while :; do
    gt="$(docker ps --filter ancestor=graphtest:1 --format '{{.Names}}' | tr '\n' ' ' | sed 's/ *$//')"
    lines="$(docker stats --no-stream --format '{{.Name}}={{.CPUPerc}}={{.MemUsage}}' postiz postiz-postgres postiz-redis | tr '\n' ';')"
    sum="$(printf '%s' "$lines" | tr ';' '\n' | awk -F= 'NF>=2 {gsub("%","",$2); s+=$2} END {printf "%.2f", s+0}')"
    if [ -n "$gt" ]; then verdict="graphtest_running"
    elif awk "BEGIN{exit !($sum <= 5)}"; then verdict="quiet"
    elif [ "$try" -ge 3 ]; then verdict="measured_busy"
    else verdict="busy_wait"; fi
    printf '{"run":"%s","engine":"%s","check":%d,"at":"%s","graphtest_running":"%s","postiz_cpu_sum_pct":%s,"stats":"%s","verdict":"%s"}\n' \
      "$RUN" "$e" "$try" "$(ts)" "$gt" "$sum" "$lines" "$verdict" >> "$GATE"
    echo "[gate] $e check $try: graphtest='$gt' postiz cpu sum ${sum}% -> $verdict"
    case "$verdict" in
      quiet|measured_busy) return 0 ;;
      graphtest_running) if [ "$try" -ge 3 ]; then echo "[gate] a graphtest container is still running; refusing" >&2; return 1; fi ;;
    esac
    try=$((try + 1)); sleep 60
  done
}

echo "[measure] $RUN start $(ts)"
powershell -NoProfile -ExecutionPolicy Bypass -File "$WIN_PS1" "$WIN_HL" 30 0 "$WIN_STOP" >/dev/null 2>&1 &
for e in relational ladybug duckpgq; do
  hostgate "$e"
  gate "$e" || { touch "$STOP"; exit 3; }
  t0="$(date +%s)"
  echo "[measure] $RUN $e start $(ts)"
  BENCH_ENGINES="$e" BENCH_OUT_REL="$OUT_REL" bash "$BUILD/bench/run_all.sh"; rc=$?
  t1="$(date +%s)"
  printf '{"run":"%s","engine":"%s","exit":%d,"wall_s":%d,"ended":"%s","plan_hash":"%s"}\n' "$RUN" "$e" "$rc" "$((t1 - t0))" "$(ts)" \
    "$(grep -o '"plan_hash": *"[0-9a-f]*"' "$OUT/plan.json" | tail -1 | grep -o '[0-9a-f]\{16\}')" >> "$TIMES"
  cat "$OUT/host_stats.jsonl" >> "$STASH" 2>/dev/null
  cp "$OUT/host_env.json" "$OUT/host_env.$e.json" 2>/dev/null
  if [ "$rc" -ne 0 ]; then echo "[measure] $RUN $e FAILED exit $rc" >&2; touch "$STOP"; exit "$rc"; fi
done
cp "$STASH" "$OUT/host_stats.jsonl"
echo "[measure] $RUN summary over all engines $(ts)"
MSYS_NO_PATHCONV=1 docker run --rm --name gt-bench-summary-final --cpuset-cpus 12,14,16,18,20,22 --cpus 6 --memory 4g \
  -v "$BUILD:/build" -v "$REPO:/repo:ro" \
  --mount type=tmpfs,destination=/build/sealed --mount type=tmpfs,destination=/build/audit \
  -e GT_BUILD=/build -e GT_REPO=/repo -e BENCH_OUT=/build/$OUT_REL -e BENCH_STORE=/benchstore \
  graphtest:1 bash -lc "cd /build && node bench/summary.js"
touch "$STOP"
echo "[measure] $RUN done $(ts)"
