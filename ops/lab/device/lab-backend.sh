#!/usr/bin/env bash
# FixFlow device lab: the local backend the lab APK talks to (ship plan 7.5, phase L3a).
#
#   bash ops/lab/device/lab-backend.sh up       Postgres + this worktree's backend, migrated to
#                                               head and seeded (see below); idempotent; also
#                                               the "revival" after a stub mode
#   bash ops/lab/device/lab-backend.sh reset    drop the database and come back up seeded
#   bash ops/lab/device/lab-backend.sh edge404  replace the backend on the lab port with a stub
#                                               that answers like the dead production host: 404,
#                                               x-railway-fallback: true, text body, no
#                                               X-FixFlow-Api header
#   bash ops/lab/device/lab-backend.sh 5xx      the stub answering 503 (FF_STUB_STATUS overrides)
#   bash ops/lab/device/lab-backend.sh hang     the stub accepting and sending nothing for 20 s
#   bash ops/lab/device/lab-backend.sh status   which mode is answering, and the seeded rows
#   bash ops/lab/device/lab-backend.sh down     remove every container this script created
#   bash ops/lab/device/lab-backend.sh token    print a lab manager token (for other scripts)
#
# Shape. Three containers, all named fixflow-<lane>-lab*: the database owns the network
# namespace and publishes 127.0.0.1:<FF_LAB_PORT> -> 8000; the backend and the stub join it
# (`--network container:`), so whichever of them is running is what the emulator reaches at
# http://10.0.2.2:<FF_LAB_PORT>. `docker network create` fails on this machine (address pools
# exhausted, plan 7.4), so nothing here creates a network. Switching modes stops the backend
# (the database keeps its rows) and starts the stub, or the reverse: that is how the lab
# simulates an outage, a revival and a flaky edge for a phone that bakes one host and port.
#
# The backend image is built from the COMMITTED backend tree of the app under test (`git archive
# <FF_LAB_APP_REF>:backend`, default a31924a, the fleet's commit, the same commit as the lab APK),
# so a stray backend/.env never enters it and this checkout's newer backend/ does not pair with
# an older app; it is tagged with that tree's hash.
# It runs with the scheduler and backups OFF and every external integration (R2, FCM, WhatsApp,
# Sentry) unset: the lab backend reaches no outside service. FIXFLOW_ENVIRONMENT=lab.
#
# Seeded state. The emulator signs in only as the lab-only technician lab1 ("LAB technician"),
# never a roster technician (plan 7.5). The app under test has no API that creates a
# technician, so lab1 is the ONE row written by SQL, with an unusable PIN hash; its PIN is then
# set through the app's own policy path (PUT /api/technicians/lab1/pin as the seeded manager).
# Everything else goes through the API as the migrations' manager m1 (seed PIN from migration
# 0004, used host-side only, never on the emulator): the shop geofence set ACTIVE at the lab
# coordinate below and one home-visit job assigned to lab1 with a customer pin ~2 km from the
# fence. Values are lab-only; the database lives only in the container.
#
# No slot is taken for this stack: it is two small containers (512 MB caps), not a gate run.
#
# The on-duty ping interval is 1 minute in the lab (FF_LAB_PING_MIN), not the production 5, so a
# check sees a ping batch within its window.
#
# Knobs (env): FF_LAB_PORT (18431), FF_LAB_LANE (l3a), FF_LAB_WT (the worktree; default: this
# script's checkout), FF_STUB_STATUS (503).
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$HERE/lib.sh"

WT="${FF_LAB_WT:-$(git -C "$(winpath "$HERE")" rev-parse --show-toplevel)}"
PG_IMAGE="postgres:17-alpine" # main and the gates are on Postgres 17 since P3a

# Lab-only seed values (a local, throwaway database; never a real account or place).
SEED_PIN="1234" # migration 0004/0012 seed PIN, as committed in the repository
LAB_MANAGER_ID="m1"
FENCE_LAT="24.900000"
FENCE_LNG="67.100000"
FENCE_RADIUS_M=80
JOB_LAT="24.918000" # ~2 km north of the fence
JOB_LNG="67.100000"
# The attendance and media services build an R2 client at request time and an EMPTY account id
# is an invalid endpoint (HTTP 500 on PUT /geofences). A dummy id makes signing work (signing is
# local); --add-host (on the database container, which owns the shared network namespace and its
# /etc/hosts) pins that hostname, and the bucket-style one, to loopback so the backend can never
# reach Cloudflare (storage.py builds https://<account>.r2.cloudflarestorage.com; boto3 may sign
# either path-style or <bucket>.<account>... URLs). A phone would only receive such a signed URL by uploading a selfie or media,
# which the lab protocols never do (CAMERA is denied and user-fixed by app.sh grant).
R2_DUMMY="fixflow-lab-no-r2"

cmd="${1:-}"
usage() {
  sed -n '2,16p' "$0" >&2
  exit 2
}

api_image() {
  local tree
  tree="$(git -C "$WT" rev-parse "$LAB_APP_REF:backend")" || die "cannot read $LAB_APP_REF:backend in $WT"
  echo "fixflow-$LAB_LANE-labapi:${tree:0:12}-lf"
}

running() { [ "$(docker inspect -f '{{.State.Running}}' "$1" 2> /dev/null)" = "true" ]; }

ensure_db() {
  if running "$C_DB"; then return; fi
  if docker inspect "$C_DB" > /dev/null 2>&1; then
    docker start "$C_DB" > /dev/null || die "cannot start $C_DB"
  else
    log "starting $C_DB ($PG_IMAGE) publishing 127.0.0.1:$LAB_PORT"
    docker run -d --name "$C_DB" --memory 512m \
      -e POSTGRES_PASSWORD=lab -e POSTGRES_DB=fixflow \
      -p "127.0.0.1:$LAB_PORT:8000" \
      --add-host "$R2_DUMMY.r2.cloudflarestorage.com:127.0.0.1" \
      --add-host "job-media.$R2_DUMMY.r2.cloudflarestorage.com:127.0.0.1" \
      "$PG_IMAGE" > /dev/null || die "cannot start $C_DB (port $LAB_PORT taken?)"
  fi
  local i
  for i in $(seq 1 60); do
    docker exec "$C_DB" pg_isready -U postgres -d fixflow > /dev/null 2>&1 && return
    sleep 1
  done
  die "$C_DB not ready after 60 s"
}

build_api() {
  local tag
  tag="$(api_image)"
  if ! docker image inspect "$tag" > /dev/null 2>&1; then
    log "building $tag from $LAB_APP_REF:backend (committed tree only)"
    git -C "$WT" -c core.autocrlf=false -c core.eol=lf archive --format=tar "$LAB_APP_REF:backend" | docker build -q -t "$tag" - > /dev/null ||
      die "backend image build failed"
  fi
  echo "$tag"
}

stop_stub() { docker rm -f "$C_STUB" > /dev/null 2>&1 || true; }

wait_health() {
  local i
  for i in $(seq 1 90); do
    if lab_curl -o /dev/null -w '%{http_code}' "$LAB_HOST_URL/api/health" 2> /dev/null | grep -q '^200$'; then
      return 0
    fi
    sleep 1
  done
  return 1
}

start_api() {
  local tag
  tag="$(build_api)"
  stop_stub
  if docker inspect "$C_API" > /dev/null 2>&1; then
    if [ "$(docker inspect -f '{{.Config.Image}}' "$C_API")" != "$tag" ]; then
      docker rm -f "$C_API" > /dev/null
    fi
  fi
  if docker inspect "$C_API" > /dev/null 2>&1; then
    running "$C_API" || docker start "$C_API" > /dev/null
  else
    log "starting $C_API ($tag)"
    docker run -d --name "$C_API" --memory 512m --network "container:$C_DB" \
      -e FIXFLOW_DATABASE_URL="postgresql+asyncpg://postgres:lab@localhost:5432/fixflow" \
      -e FIXFLOW_ENVIRONMENT=lab \
      -e FIXFLOW_ENABLE_SCHEDULER=false \
      -e FIXFLOW_BACKUP_ENABLED=false \
      -e FIXFLOW_ENABLE_DISPATCHER=false \
      -e FIXFLOW_R2_ACCOUNT_ID="$R2_DUMMY" \
      -e FIXFLOW_R2_ACCESS_KEY_ID=lab-no-key -e FIXFLOW_R2_SECRET_ACCESS_KEY=lab-no-secret \
      -e FIXFLOW_ATTENDANCE_PING_INTERVAL_MINUTES="${FF_LAB_PING_MIN:-1}" \
      -e FIXFLOW_JWT_SECRET="lab-only-jwt-secret-$LAB_LANE-not-for-any-real-host-0123456789" \
      -e PORT=8000 \
      "$tag" > /dev/null || die "cannot start $C_API"
  fi
  wait_health || {
    docker logs --tail 40 "$C_API" >&2
    die "backend did not answer /api/health on $LAB_HOST_URL"
  }
}

login() { # id pin -> token on stdout
  lab_curl -X POST "$LAB_HOST_URL/api/auth/login" -H 'Content-Type: application/json' \
    -d "{\"tech_id\":\"$1\",\"pin\":\"$2\"}" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p'
}

seed() {
  local mt code jobs
  mt="$(login "$LAB_MANAGER_ID" "$SEED_PIN")"
  [ -n "$mt" ] || die "manager $LAB_MANAGER_ID cannot log in with the migration seed PIN"
  code=$(lab_curl -o /dev/null -w '%{http_code}' -X PUT "$LAB_HOST_URL/api/attendance/geofences" \
    -H "Authorization: Bearer $mt" -H 'Content-Type: application/json' \
    -d "{\"name\":\"LAB fence (not a real place)\",\"center_lat\":$FENCE_LAT,\"center_lng\":$FENCE_LNG,\"radius_m\":$FENCE_RADIUS_M,\"is_active\":true}")
  [ "$code" = 200 ] || die "geofence seed failed: HTTP $code"
  # the lab-only technician (the one SQL write, see the header); never a roster row
  lab_sql "insert into technician (id, name, specialty, role, pin_hash) values ('$LAB_TECH_ID', '$LAB_TECH_NAME', 'lab only', 'tech', '!unusable-until-set-by-api') on conflict (id) do nothing" > /dev/null ||
    die "cannot create the lab technician $LAB_TECH_ID"
  code=$(lab_curl -o /dev/null -w '%{http_code}' -X PUT "$LAB_HOST_URL/api/technicians/$LAB_TECH_ID/pin" \
    -H "Authorization: Bearer $mt" -H 'Content-Type: application/json' -d "{\"pin\":\"$LAB_TECH_PIN\"}")
  [ "$code" = 204 ] || die "lab PIN for $LAB_TECH_ID failed: HTTP $code"
  jobs=$(lab_sql "select count(*) from job where assigned_tech_id='$LAB_TECH_ID' and customer_name like 'LAB %'" | tail -n1)
  if [ "${jobs:-0}" = 0 ]; then
    code=$(lab_curl -o /dev/null -w '%{http_code}' -X POST "$LAB_HOST_URL/api/jobs" \
      -H "Authorization: Bearer $mt" -H 'Content-Type: application/json' \
      -d "{\"job_type\":\"home-visit\",\"customer_name\":\"LAB customer\",\"customer_address\":\"LAB address\",\"customer_lat\":$JOB_LAT,\"customer_lng\":$JOB_LNG,\"appliance_type\":\"AC\",\"problem\":\"lab job\",\"assigned_tech_id\":\"$LAB_TECH_ID\"}")
    case "$code" in 200 | 201) ;; *) die "lab job seed failed: HTTP $code" ;; esac
  fi
  # The tech can log in with the lab PIN through the same endpoint the app uses.
  [ -n "$(login "$LAB_TECH_ID" "$LAB_TECH_PIN")" ] || die "lab tech $LAB_TECH_ID cannot log in"
  log "seeded: fence $FENCE_LAT,$FENCE_LNG r=${FENCE_RADIUS_M}m active; $LAB_TECH_ID PIN set; lab job present"
}

start_stub() { # mode
  local tag
  tag="$(build_api)" # the backend image has python; the stub itself is stdlib only
  ensure_db
  docker stop -t 5 "$C_API" > /dev/null 2>&1 || true
  stop_stub
  docker run -d --name "$C_STUB" --memory 64m --network "container:$C_DB" \
    -e FF_STUB_STATUS="${FF_STUB_STATUS:-503}" -e FF_STUB_HANG_S="${FF_STUB_HANG_S:-20}" \
    -v "$(winpath "$HERE/edge-stub.py"):/stub/edge-stub.py:ro" \
    --entrypoint python "$tag" -u /stub/edge-stub.py "$1" 8000 > /dev/null || die "cannot start the stub"
  local i
  for i in $(seq 1 20); do
    docker logs "$C_STUB" 2>&1 | grep -q "listening mode=$1" && break
    sleep 0.5
  done
  log "stub answering on $LAB_HOST_URL in mode $1 (the backend is stopped; its database is kept)"
}

mode_now() {
  if running "$C_STUB"; then
    docker logs "$C_STUB" 2>&1 | sed -n 's/.*listening mode=\([^ ]*\).*/stub:\1/p' | head -n1
  elif running "$C_API"; then
    echo backend
  else
    echo none
  fi
}

case "$cmd" in
  up)
    ensure_db
    start_api
    seed
    echo "lab backend up: $LAB_HOST_URL (emulator: $LAB_API_URL) mode=$(mode_now)"
    ;;
  reset)
    docker rm -f -v "$C_STUB" "$C_API" "$C_DB" > /dev/null 2>&1 || true
    ensure_db
    start_api
    seed
    echo "lab backend reset to the seeded state: $LAB_HOST_URL"
    ;;
  edge404 | 5xx | hang)
    start_stub "$cmd"
    ;;
  status)
    echo "mode: $(mode_now)"
    echo "port: $LAB_HOST_URL (emulator: $LAB_API_URL)"
    if running "$C_DB"; then
      lab_sql "select id, name, center_lat, center_lng, radius_m, is_active from attendance_geofence"
      lab_sql "select id, role, active, token_version from technician order by id"
    fi
    curl -sS -m 25 -D - -o /dev/null "$LAB_HOST_URL/api/health" 2>&1 | head -n 8 || true
    ;;
  token)
    login "$LAB_MANAGER_ID" "$SEED_PIN"
    ;;
  down)
    docker rm -f -v "$C_STUB" "$C_API" "$C_DB" > /dev/null 2>&1 || true
    echo "lab backend removed"
    ;;
  *) usage ;;
esac
