#!/usr/bin/env bash
# Lane-parameterised gates for the FixFlow ship program (plan section 7.4).
#
#   ff-gates.sh backend <lane> <worktree> [extra pytest args]
#   ff-gates.sh mobile  <lane> <worktree>
#   ff-gates.sh web     <lane> <worktree>
#
# <lane>     the PHASE id in lower case, [a-z0-9-] (p1, p2a, p7a, p90a ...). It names the
#            containers, so every phase in flight has its OWN database. Two stacked phases of
#            one lane never share an id.
# <worktree> the phase's checkout, C:/... or /c/... form.
#
# What it keeps from design Appendix A: the read-only mount plus a copy into /work, no host
# ports, every gate runs even after a failure, a per-gate log file, and a mechanical stop on a
# second pytest against one database (here: a per-lane lock taken before anything else, which
# a second run for the same lane and kind cannot take while the first is alive). What it
# changes: the names carry the lane, so N backend phases run at once; the gates container
# joins the database container's network namespace (the database is at localhost, as in CI)
# instead of a user network, because Docker's predefined address pools are exhausted on this
# machine by another project's 29 networks ("all predefined address pools have been fully
# subnetted", measured 2026-11-13) and FixFlow neither prunes networks it did not create nor
# reconfigures Docker; pip uses a shared cache volume; the copy includes
# technician-app/src/shared (the cross-runtime contract fixtures the backend tests read by
# repo-relative path) and CLAUDE.md; a stray backend/.env is never copied; the backend job's
# FIXFLOW_ENVIRONMENT is mirrored from the worktree's own ci.yml; pytest writes junit and the
# gate FAILS if any integration test was skipped; pip-audit is advisory.
#
# A MERGE-READINESS run is a run with a clean tree and no extra pytest args. The summary says
# "tree=dirty(n)" when uncommitted or untracked files were tested, and "RUN partial" when
# extra args were passed (they can deselect tests, which the skip check cannot see).
#
# Run it in the background (it can exceed the 10-minute foreground limit) and read
# <log dir>/summary.txt when it exits. Exit code 0 only when every gate passed.
set -u
export MSYS_NO_PATHCONV=1
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIND="${1:?usage: ff-gates.sh backend|mobile|web <lane> <worktree> [args]}"
LANE="${2:?lane id}"
WT_IN="${3:?worktree path}"
shift 3
case "$LANE" in *[!a-z0-9-]*) echo "lane id must be [a-z0-9-]: $LANE" >&2; exit 2 ;; esac
case "$KIND" in backend|mobile|web) ;; *) echo "unknown kind: $KIND" >&2; exit 2 ;; esac

WTW="$(cygpath -m "$WT_IN")"     # C:/... for docker and git (native binaries; conversion is off)
WTU="$(cygpath -u "$WT_IN")"     # /c/... for cd
[ -d "$WTU" ] || { echo "no such worktree: $WT_IN" >&2; exit 2; }

LOCKROOT="${FF_LOCK_DIR:-/c/Users/User/.fixflow-cache/locks}"
LOGROOT="${FF_LOG_DIR:-/c/Users/User/.fixflow-cache/gate-logs}"
L="$LOGROOT/$LANE/$KIND-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$L" "$LOCKROOT"
HOLDER="$LANE-$KIND-$$"
# Backend stacks are light (about 0.5 GB measured) and queue in their own pool; Jest, Vitest and
# everything else stay in the heavy pool with the emulator and the Android build (ff-slot.sh).
SLOT_POOL=heavy; [ "$KIND" = backend ] && SLOT_POOL=light
HEAD_SHA="$(git -C "$WTW" rev-parse --short HEAD 2>/dev/null || echo unknown)"
DIRTY="$(git -C "$WTW" status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
if [ "$DIRTY" = 0 ]; then TREE="clean"; else TREE="dirty($DIRTY)"; fi
PARTIAL=""
[ "$#" -gt 0 ] && PARTIAL="RUN partial (extra args: $*): not a merge-readiness run"
echo "LOGDIR $L"
echo "HEAD $HEAD_SHA tree=$TREE lane=$LANE kind=$KIND"

finish() {  # $1 = exit code
  {
    echo "lane=$LANE kind=$KIND head=$HEAD_SHA tree=$TREE worktree=$WTW"
    [ -n "$PARTIAL" ] && echo "$PARTIAL"
    grep -E "^(ENV|GATE|ADVISORY|SETUP|SKIPS|SUMMARY)" "$L/gates.log" 2>/dev/null
  } > "$L/summary.txt"
  cat "$L/summary.txt"
  exit "$1"
}

# ── one run per lane and kind ───────────────────────────────────────────────────────────────
# Taken before anything else, so a second run can never touch the first run's containers.
LL="$LOCKROOT/lane-$LANE-$KIND"
take_lane_lock() {
  if mkdir "$LL" 2>/dev/null; then echo "$$" > "$LL/pid"; return 0; fi
  # a lock from before the last boot is dead whatever its PID says (PIDs are reused after a reboot)
  local up boot m other
  up="$(cut -d. -f1 /proc/uptime 2>/dev/null)"; m="$(stat -c %Y "$LL" 2>/dev/null)"
  if [ -n "$up" ] && [ -n "$m" ]; then
    boot=$(( $(date +%s) - up ))
    if [ "$m" -lt $(( boot - 5 )) ]; then
      rm -rf "$LL"
      if mkdir "$LL" 2>/dev/null; then echo "$$" > "$LL/pid"; return 0; fi
      return 1
    fi
  fi
  other="$(cat "$LL/pid" 2>/dev/null)"
  if [ -n "$other" ] && kill -0 "$other" 2>/dev/null; then return 1; fi
  # the previous run died without cleaning up; a lock younger than 2 minutes may still be
  # writing its pid file, so leave that one alone
  [ -n "$(find "$LL" -maxdepth 0 -mmin +2 2>/dev/null)" ] || return 1
  rm -rf "$LL"
  mkdir "$LL" 2>/dev/null || return 1
  echo "$$" > "$LL/pid"
}
if ! take_lane_lock; then
  echo "SETUP[lane] ALREADY_RUNNING: another $KIND run for lane $LANE holds $LL" | tee -a "$L/gates.log"
  finish 4
fi

cleanup() {
  if [ "$KIND" = backend ]; then
    docker rm -f "fixflow-$LANE-gates" "fixflow-$LANE-db" >/dev/null 2>&1
    # Give the run's disk cache back to Windows: the Docker VM keeps page cache it no longer needs
    # (4.4 GB measured on 2026-11-13 while the host had 5.5 GB free). Cache only; no data is touched.
    docker run --rm --privileged alpine:3 sh -c "sync; echo 1 > /proc/sys/vm/drop_caches; echo 1 > /proc/sys/vm/compact_memory" >/dev/null 2>&1
  fi
  bash "$HERE/ff-slot.sh" release "$HOLDER" >/dev/null 2>&1
  rm -rf "$LL"
}
trap cleanup EXIT

# A gate never runs without its slot: if the acquire call dies or fails, the run stops here
# (a killed acquire used to fall through and run unslotted).
take_slot() {
  FF_POOL="$SLOT_POOL" bash "$HERE/ff-slot.sh" acquire "$HOLDER" 1 "$$" > "$L/slot.log" 2>&1
  local rc=$?
  cat "$L/slot.log"
  if [ "$rc" -ne 0 ] || ! grep -q "^SLOTS " "$L/slot.log"; then
    echo "SETUP[slot] ACQUIRE FAILED (exit $rc): the gate did not run" | tee -a "$L/gates.log"
    return 1
  fi
}

# every gate runs; FAIL is sticky
FAIL=0; i=0
g() {
  i=$((i+1))
  "$@" > "$L/gate-$i.log" 2>&1
  rc=$?
  echo "GATE[$i $*] EXIT=$rc" | tee -a "$L/gates.log"
  [ "$rc" -ne 0 ] && FAIL=1
  return 0
}

npm_ready() {  # reinstall only when the lock file changed since the last install
  local h; h="$(sha256sum package-lock.json | cut -c1-16)"
  if [ ! -d node_modules ] || [ "$(cat node_modules/.ff-lock-hash 2>/dev/null)" != "$h" ]; then
    npm ci > "$L/npm-ci.log" 2>&1 || { echo "SETUP[npm ci] FAILED" | tee -a "$L/gates.log"; return 1; }
    echo "$h" > node_modules/.ff-lock-hash
  fi
}

case "$KIND" in
  backend)
    docker info --format '{{.ServerVersion}}' >/dev/null 2>&1 || { echo "SETUP[docker] DOCKER_ENGINE_DOWN" | tee -a "$L/gates.log"; finish 3; }
    N="fixflow-$LANE"
    take_slot || finish 5
    PG="${FF_PG_IMAGE:-postgres:17-alpine}"   # CI parity: main moved to Postgres 17 with P3a (90ea88d, 2026-11-13); FF_PG_IMAGE=postgres:16-alpine for a branch cut before it
    U="postgresql+asyncpg://postgres:postgres@localhost:5432/fixflow_test"
    # Mirror CI's environment per worktree: P1 makes the backend refuse to boot outside an
    # explicit dev/test environment and sets FIXFLOW_ENVIRONMENT in ci.yml. Whatever the
    # worktree's own ci.yml gives the backend job is what the gate gives it; a worktree cut
    # before P1 has no such line and gets none, exactly as CI ran it. FF_GATES_ENV adds more
    # ("K=V K2=V2") for a lane that needs a variable before its ci.yml edit exists.
    ENVARGS=()
    ci_env="$(grep -m1 -E '^[[:space:]]*FIXFLOW_ENVIRONMENT:' "$WTU/.github/workflows/ci.yml" 2>/dev/null \
      | sed -E 's/^[^:]*:[[:space:]]*//; s/[[:space:]]*(#.*)?$//' | tr -d "\"'")"
    [ -n "$ci_env" ] && ENVARGS+=(-e "FIXFLOW_ENVIRONMENT=$ci_env")
    for kv in ${FF_GATES_ENV:-}; do ENVARGS+=(-e "$kv"); done
    echo "ENV ${ENVARGS[*]:-none}" | tee -a "$L/gates.log"
    # start lean: hand the VM's unused disk cache back to Windows before this run adds its own
    docker run --rm --privileged alpine:3 sh -c "sync; echo 1 > /proc/sys/vm/drop_caches; echo 1 > /proc/sys/vm/compact_memory" >/dev/null 2>&1
    # we hold the lane lock, so anything with these names is a leftover of a dead run
    docker rm -f "$N-db" "$N-gates" >/dev/null 2>&1
    docker run -d --name "$N-db" --memory 1g \
      -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fixflow_test "$PG" > /dev/null \
      || { echo "SETUP[db] RUN FAILED" | tee -a "$L/gates.log"; finish 2; }
    docker run -d --name "$N-gates" --network "container:$N-db" --memory 3g --cpus "${FF_GATE_CPUS:-6}" \
      -v "$WTW:/src:ro" -v fixflow-pip-cache:/root/.cache/pip \
      -e FIXFLOW_DATABASE_URL="$U" -e FIXFLOW_TEST_DATABASE_URL="$U" -e PYTHONDONTWRITEBYTECODE=1 \
      -e FF_DB_HOST=localhost -e FF_PYTEST_ARGS="$*" -e FF_PIP_AUDIT="${FF_PIP_AUDIT:-0}" "${ENVARGS[@]}" \
      python:3.12-slim sh -c '
        mkdir -p /work/backend /work/logs || exit 2
        tar -C /src/backend --exclude=.venv --exclude=.env --exclude=__pycache__ --exclude=.mypy_cache \
            --exclude=.ruff_cache --exclude=.pytest_cache -cf - . | tar -C /work/backend -xf - || exit 2
        if [ -d /src/technician-app/src/shared ]; then
          mkdir -p /work/technician-app/src/shared && cp -r /src/technician-app/src/shared/. /work/technician-app/src/shared/
        fi
        [ -f /src/CLAUDE.md ] && cp /src/CLAUDE.md /work/CLAUDE.md
        cd /work/backend || exit 2
        pip install -q -e ".[dev]" pip-audit > /work/logs/setup-pip.log 2>&1 || { echo "SETUP[pip] FAILED"; exit 2; }
        n=0; until python -c "import socket,os;socket.create_connection((os.environ[\"FF_DB_HOST\"],5432),1)" 2>/dev/null; do
          n=$((n+1)); [ "$n" -ge 60 ] && { echo "SETUP[db] TIMEOUT"; exit 2; }; sleep 1; done
        FAIL=0; i=0
        g(){ i=$((i+1)); "$@" > "/work/logs/gate-$i.log" 2>&1; rc=$?; echo "GATE[$i $*] EXIT=$rc"; [ "$rc" -ne 0 ] && FAIL=1; return 0; }
        # CI parity (2026-11-14, ruling C60): the backend job runs the CLAUDE.md facts check from the
        # repo root before ruff. It runs when the ci.yml of this tree names it, on the read-only
        # mount. (No apostrophe may appear in this block: it is one single-quoted string.)
        if [ -f /src/.github/scripts/check_claude_md.py ] && grep -q "check_claude_md.py" /src/.github/workflows/ci.yml 2>/dev/null; then
          g sh -c "cd /src && python .github/scripts/check_claude_md.py"
        fi
        g ruff format --check .; g ruff check .; g mypy app; g lint-imports
        g alembic upgrade head; g alembic check
        g pytest -p no:cacheprovider -q -rs --junitxml=/work/logs/junit.xml $FF_PYTEST_ARGS
        python - > /work/logs/skips.txt 2>&1 <<PY
import sys, xml.etree.ElementTree as ET
try:
    root = ET.parse("/work/logs/junit.xml").getroot()
except Exception as exc:
    print("SKIPS junit unreadable: %s" % exc); sys.exit(1)
total = skipped = integ = 0
for case in root.iter("testcase"):
    total += 1
    for s in case.findall("skipped"):
        skipped += 1
        text = (s.get("message") or "") + (s.text or "")
        # conftest skips integration tests with exactly this reason when no test database is set
        if "FIXFLOW_TEST_DATABASE_URL" in text:
            integ += 1
print("SKIPS total=%d skipped=%d integration_skipped=%d" % (total, skipped, integ))
sys.exit(1 if integ else 0)
PY
        rc=$?; cat /work/logs/skips.txt; echo "GATE[skip-aware integration tests ran] EXIT=$rc"; [ "$rc" -ne 0 ] && FAIL=1
        if [ "${FF_PIP_AUDIT:-0}" = 1 ]; then pip-audit > /work/logs/pip-audit.log 2>&1; echo "ADVISORY[pip-audit] EXIT=$? (not a gate)"; else echo "ADVISORY[pip-audit] skipped (set FF_PIP_AUDIT=1 to run it; it is advisory and held a slot for up to a minute)"; fi
        echo "SUMMARY FAIL=$FAIL"; exit "$FAIL"' > /dev/null \
      || { echo "SETUP[gates] RUN FAILED" | tee -a "$L/gates.log"; finish 2; }
    docker wait "$N-gates" > "$L/gates.exit"
    docker logs "$N-gates" >> "$L/gates.log" 2>&1
    # docker is a native binary and path conversion is off: give it the C:/ form
    docker cp "$N-gates:/work/logs" "$(cygpath -m "$L")/gate-logs" > /dev/null 2>&1 \
      || echo "SETUP[logs] per-gate logs could not be copied out" >> "$L/gates.log"
    rc="$(cat "$L/gates.exit")"
    echo "container exit: $rc" >> "$L/gates.log"
    finish "$rc"
    ;;

  mobile)
    cd "$WTU/technician-app" || finish 2
    take_slot || finish 5
    npm_ready || finish 2
    g npm run typecheck
    g npx jest --ci --maxWorkers="${FF_JEST_WORKERS:-4}"      # no --passWithNoTests (plan P1)
    # 18 bundler processes and 3.7 GB were measured without a worker limit (2026-11-13 16:15);
    # the limit changes memory and time, not the bundle.
    g npx expo export --platform android --max-workers "${FF_EXPORT_WORKERS:-4}"   # JS bundle only; the native compile gate is the lab's android script
    echo "SUMMARY FAIL=$FAIL" >> "$L/gates.log"
    finish "$FAIL"
    ;;

  web)
    cd "$WTU" || finish 2
    take_slot || finish 5
    npm_ready || finish 2
    g npm run lint
    g npm run format:check
    g npm test -- --maxWorkers="${FF_VITEST_WORKERS:-4}"
    g npm run build
    # CI parity (2026-11-14, ruling C60): the frontend job has three more steps since P3a. Each
    # runs when this tree's own ci.yml names it. The compose rules need `docker compose` (they
    # start nothing); the restore-gate fixture runs under dash and mawk, as on the CI runner,
    # in the image the backend gate already uses, on a read-only mount.
    CI_YML="$WTU/.github/workflows/ci.yml"
    if grep -q "ops/hang-stub/server.test.mjs" "$CI_YML" 2>/dev/null; then
      g node --test ops/hang-stub/server.test.mjs
    fi
    if grep -q "ops/selfhost/smoke/compose-rules.mjs" "$CI_YML" 2>/dev/null; then
      g node ops/selfhost/smoke/compose-rules.mjs
    fi
    if grep -q "ops/selfhost/smoke/restore-gate.test.sh" "$CI_YML" 2>/dev/null; then
      g docker run --rm -v "$WTW:/src:ro" python:3.12-slim sh /src/ops/selfhost/smoke/restore-gate.test.sh
    fi
    echo "SUMMARY FAIL=$FAIL" >> "$L/gates.log"
    finish "$FAIL"
    ;;
esac
