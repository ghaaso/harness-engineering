#!/usr/bin/env bash
# Local smoke of docker-compose.prod.yml (ship plan P3a Deliverables; L4 can reuse it).
# Fake domain (example.invalid), throwaway database, no R2 / FCM / Sentry credentials (so nothing
# leaves the machine: deep-health reports R2 "not configured" instead of calling it), no tunnel.
# The R2 account id is a non-empty placeholder because get_storage() builds the endpoint from it
# and raises on a blank one, which turns /api/ops/health into a 500 (the access key stays blank,
# so check_r2 answers "not configured" without a call).
# It rehearses the runbook's own commands: the restore gate, the B5 snapshot, the restore as
# fixflow_app, Appendix B, the deep-health read-back, the heartbeat, the app's own dump code.
#
#   ops/selfhost/smoke/smoke.sh <checkout> <work dir> [project name, default fixflow-p3a]
#
# Prints PASS/FAIL lines and a SMOKE summary; tears everything down (containers, networks,
# volumes of THIS project, and the images it built) on exit unless FF_SMOKE_KEEP=1.
set -u
export MSYS_NO_PATHCONV=1
ROOT_IN="${1:?checkout}"; WORK_IN="${2:?work dir}"; PROJECT="${3:-fixflow-p3a}"
case "$PROJECT" in fixflow-*) ;; *) echo "project name must start with fixflow-" >&2; exit 2 ;; esac
win() { if command -v cygpath >/dev/null 2>&1; then cygpath -m "$1"; else printf '%s' "$1"; fi; }
ROOT="$(win "$ROOT_IN")"; mkdir -p "$WORK_IN"; WORK="$(win "$WORK_IN")"
ETC="$WORK/etc"; mkdir -p "$ETC/cloudflared" "$WORK/out"
FAILS=0
pass() { echo "PASS $*"; }
fail() { echo "FAIL $*"; FAILS=$((FAILS + 1)); }
rnd() { od -An -tx1 -N32 /dev/urandom | tr -d ' \n'; }

export FF_ROOT="$ROOT" FF_ENV="$ETC/compose.env" FF_PROJECT="$PROJECT"
export FF_EXTRA_COMPOSE="$ROOT/ops/selfhost/smoke/docker-compose.smoke.yml"
FFC="$ROOT/ops/selfhost/bin/ffc"
ALL="--profile db --profile app --profile web --profile ops"

TOKEN="$(rnd)"; APPPW="$(rnd)"
cat > "$ETC/compose.env" <<EOF
FIXFLOW_DOMAIN=example.invalid
FIXFLOW_ETC=$ETC
FIXFLOW_CLOUDFLARED_TAG=${FF_SMOKE_CLOUDFLARED_TAG:-2025.11.1}
FIXFLOW_BACKUP_ENABLED=false
FIXFLOW_WEB_SENTRY_DSN=
EOF
printf 'POSTGRES_PASSWORD=%s\nFIXFLOW_APP_DB_PASSWORD=%s\n' "$(rnd)" "$APPPW" > "$ETC/postgres.env"
cat > "$ETC/backend.env" <<EOF
FIXFLOW_DATABASE_URL=postgresql+asyncpg://fixflow_app:$APPPW@postgres:5432/fixflow
FIXFLOW_JWT_SECRET=$(rnd)
FIXFLOW_OPS_PROXY_TOKEN=$TOKEN
FIXFLOW_CORS_ORIGINS=["https://app.example.invalid"]
FIXFLOW_ENABLE_SCHEDULER=true
FIXFLOW_SCHEDULER_TIMEZONE=Asia/Karachi
FIXFLOW_R2_ACCOUNT_ID=smoke-not-an-account
FIXFLOW_ENVIRONMENT=dev
FIXFLOW_ENABLE_DISPATCHER=true
FIXFLOW_BACKUP_PREFIX=backups/db/
EOF
# The last three lines are HOSTILE on purpose: the compose must override them.
printf 'OPS_PASSWORD=%s\nOPS_SESSION_SECRET=%s\nOPS_PROXY_TOKEN=%s\nOPS_HEALTH_TARGETS=\n' \
  "$(rnd)" "$(rnd)" "$TOKEN" > "$ETC/ops.env"

teardown() {
  if [ "${FF_SMOKE_KEEP:-0}" = 1 ]; then echo "KEPT (FF_SMOKE_KEEP=1)"; return; fi
  "$FFC" $ALL --profile edge down -v --remove-orphans >"$WORK/out/down.log" 2>&1
  sha="$(git -C "$ROOT" rev-parse HEAD)"
  for img in backend web ops; do
    docker image rm "fixflow/$img:$sha" "fixflow/$img:$sha-dirty" >/dev/null 2>&1
  done
  left="$(docker ps -a --filter "label=com.docker.compose.project=$PROJECT" -q | wc -l | tr -d ' ')"
  echo "TEARDOWN containers_left=$left"
}
trap teardown EXIT

wait_healthy() { # <service> <seconds>
  local id i st
  for i in $(seq 1 "$2"); do
    id="$("$FFC" ps -q "$1" 2>/dev/null)"
    st="$( [ -n "$id" ] && docker inspect --format '{{.State.Health.Status}}' "$id" 2>/dev/null)"
    [ "$st" = healthy ] && return 0
    sleep 1
  done
  return 1
}
psql_app() { "$FFC" exec -T postgres psql -U fixflow_app -d fixflow -v ON_ERROR_STOP=1 -tAq "$@"; }
health() { # prints the deep-health JSON fetched inside the backend container with a token
  "$FFC" exec -T -e FF_TOK="${1:-}" backend python -c '
import os, sys, urllib.request as u, urllib.error as e
r = u.Request("http://127.0.0.1:8000/api/ops/health", headers={"X-Ops-Proxy-Token": os.environ["FF_TOK"]})
try:
    resp = u.urlopen(r, timeout=10); print(resp.status, resp.headers.get("X-FixFlow-Api")); print(resp.read().decode())
except e.HTTPError as x:
    print(x.code, x.headers.get("X-FixFlow-Api")); print(x.read().decode())
'
}

echo "== S1 compose file validates with every profile"
if "$FFC" $ALL --profile edge config -q 2>"$WORK/out/config.err"; then pass "config"; else fail "config: $(head -c 400 "$WORK/out/config.err")"; fi
"$FFC" $ALL --profile edge config > "$WORK/out/config.rendered.yml" 2>/dev/null
grep -n "published\|ports:" "$WORK/out/config.rendered.yml" >/dev/null && fail "rendered config mentions ports" || pass "rendered config has no ports"

echo "== S2 db profile alone; fixflow_app owns the database"
"$FFC" --profile db up -d >"$WORK/out/up-db.log" 2>&1
wait_healthy postgres 90 && pass "postgres healthy" || fail "postgres not healthy"
owner="$(psql_app -c "select current_user || '|' || pg_get_userbyid(datdba) || '|' || (select rolsuper from pg_roles where rolname='fixflow_app') from pg_database where datname='fixflow'")"
[ "$owner" = "fixflow_app|fixflow_app|false" ] && pass "role: $owner" || fail "role: $owner"
pgv="$("$FFC" exec -T postgres psql -U fixflow_app -d fixflow -tAc 'show server_version')"
case "$pgv" in 17.*) pass "server $pgv" ;; *) fail "server $pgv" ;; esac

echo "== S3 the backend cannot start before the restore is signed off"
"$FFC" --profile db --profile app up -d --build >"$WORK/out/up-gate-closed.log" 2>&1 && gate_rc=0 || gate_rc=$?
running="$("$FFC" ps -q backend 2>/dev/null | xargs -r docker inspect --format '{{.State.Running}}' 2>/dev/null)"
if [ "$gate_rc" -ne 0 ] && [ "$running" != true ]; then pass "gate closed: up exit=$gate_rc, backend running=${running:-no container}"; else fail "gate: up exit=$gate_rc backend running=$running"; fi
tables="$(psql_app -c "select count(*) from pg_tables where schemaname='public'")"
[ "$tables" = 0 ] && pass "no schema was built behind the closed gate" || fail "tables=$tables behind a closed gate"

echo "== S4 sign off (case c: an empty schema) and start the backend"
printf 'signed-off case=c by=smoke at=%s\n' "$(date -u +%FT%TZ)" > "$ETC/restore-signed-off"
"$FFC" --profile db --profile app up -d >"$WORK/out/up-app.log" 2>&1
wait_healthy backend 240 && pass "backend healthy (ops-token healthcheck)" || { fail "backend not healthy"; "$FFC" logs backend > "$WORK/out/backend.log" 2>&1; }

echo "== S4b the gate refuses a forced key in any other spelling (it would beat the compose override)"
# Every spelling Compose's env_file parser passes through as its own variable (review of #195,
# finding 2). The full matrix, incl. BOM, CRLF and a Kelvin-sign key, is restore-gate.test.sh.
cp "$ETC/backend.env" "$WORK/out/backend.env.good"
i=0
for hostile in 'fixflow_enable_dispatcher=true' 'fixflow_enable_dispatcher: true' \
  'FIXFLOW_ENVIRONMENT: dev' 'FIXFLOW_ENVIRONMENT = dev' 'export FIXFLOW_ENABLE_DISPATCHER=true' \
  '  fixflow_backup_prefix=backups/db/'; do
  i=$((i + 1))
  cp "$WORK/out/backend.env.good" "$ETC/backend.env"
  printf '%s\n' "$hostile" >> "$ETC/backend.env"
  "$FFC" --profile db --profile app up -d --force-recreate backend >"$WORK/out/up-hostile-$i.log" 2>&1 && lrc=0 || lrc=$?
  glog="$("$FFC" logs restore-gate 2>&1 | tail -n 1)"
  running="$("$FFC" ps -q backend 2>/dev/null | xargs -r docker inspect --format '{{.State.Running}}' 2>/dev/null)"
  case "$glog" in *"another spelling"*) gl=yes ;; *) gl=no ;; esac
  value="${hostile#*[=:]}"; value="${value# }"
  case "$glog" in *"$value"*) leak=yes ;; *) leak=no ;; esac
  [ "$lrc" -ne 0 ] && [ "$running" != true ] && [ "$gl" = yes ] && [ "$leak" = no ] \
    && pass "refused '$hostile': up exit=$lrc, backend not running, gate names line:key, no value" \
    || fail "hostile '$hostile': up=$lrc running=$running leak=$leak gate=$glog"
done
cp "$WORK/out/backend.env.good" "$ETC/backend.env"
"$FFC" --profile db --profile app up -d >"$WORK/out/up-app-again.log" 2>&1
wait_healthy backend 240 && pass "lines removed: backend healthy again" || fail "backend after removing the lines"
# The gate's fixture test in the gate's own image (mawk, dash), as CI runs it with Ubuntu's.
docker run --rm --network none -v "$ROOT/ops/selfhost:/w/ops/selfhost:ro" -w /w postgres:17-bookworm \
  sh ops/selfhost/smoke/restore-gate.test.sh > "$WORK/out/restore-gate-test.log" 2>&1 \
  && pass "restore-gate.test.sh in the gate image: $(tail -n 1 "$WORK/out/restore-gate-test.log")" \
  || fail "restore-gate.test.sh: $(grep FAIL "$WORK/out/restore-gate-test.log" | head -3)"
# What the gate prevents (journal 29): a hostile lowercase line next to the compose override,
# with the gate skipped (--no-deps). Recorded, not asserted: which one wins depends on the order
# Docker hands the variables over (pydantic-settings keeps the last), so it can be either.
probe="$("$FFC" --profile db --profile app run --rm --no-deps -T -e fixflow_environment=dev \
  --entrypoint python backend -c 'from app.core.config import Settings; print(Settings().environment)' \
  2>&1 | tail -n 1)"
echo "   loader probe, gate skipped, override + fixflow_environment=dev: environment=$probe" \
  | tee -a "$WORK/out/loader-probe.log"

echo "== S5 deep-health read-back"
h="$(health "$TOKEN")"; echo "$h" > "$WORK/out/health.json"
first="$(echo "$h" | head -n1)"
[ "$first" = "200 1" ] && pass "deep-health 200 with X-FixFlow-Api: 1" || fail "deep-health: $first"
body="$(echo "$h" | tail -n +2 | tr -d ' \n')"
for want in '"environment":"production"' '"enable_dispatcher":false' '"backup_enabled":false' \
  '"backup_prefix":"backups/db-selfhost/"' '"name":"database","status":"ok"'; do
  case "$body" in *"$want"*) pass "fact $want" ;; *) fail "fact $want missing" ;; esac
done
sha="$(git -C "$ROOT" rev-parse HEAD)"
case "$body" in *"\"git_sha\":\"$sha"*) pass "git_sha = HEAD ($sha)" ;; *) fail "git_sha not HEAD" ;; esac
bad="$(health "wrong-token" | head -n1)"
[ "$bad" = "401 1" ] && pass "wrong token: 401 with the marker" || fail "wrong token: $bad"

echo "== S6 B5 snapshot command (pg_dump as fixflow_app), listed and hashed"
"$FFC" exec -T postgres pg_dump -U fixflow_app -d fixflow --format=custom > "$WORK/out/predrain-smoke.pgdump"
"$FFC" exec -T postgres sh -c 'cat > /tmp/l.dump && pg_restore -l /tmp/l.dump | grep -c "TABLE DATA"' < "$WORK/out/predrain-smoke.pgdump" > "$WORK/out/toc.txt" 2>&1
n="$(tr -d ' \r\n' < "$WORK/out/toc.txt")"
[ "${n:-0}" -gt 30 ] && pass "snapshot TOC lists $n tables' data" || fail "snapshot TOC: $n"
sha256sum "$WORK/out/predrain-smoke.pgdump" | cut -c1-16 | sed 's/^/INFO sha256 prefix /'

# The nightly/hourly form (core/backup.py): --schema=public, which carries its own CREATE SCHEMA.
"$FFC" exec -T postgres pg_dump -U fixflow_app -d fixflow --format=custom --schema=public --no-owner --no-privileges > "$WORK/out/nightly-form.pgdump"
[ -s "$WORK/out/nightly-form.pgdump" ] && pass "nightly-form dump taken" || fail "nightly-form dump"

echo "== S7 restore rehearsal as fixflow_app (runbook 6.6-6.8: prove, save the live db, drop, load), both dump forms"
before="$(psql_app -c "select count(*) from shop_setting")|$(psql_app -c "select version_num from alembic_version")"
"$FFC" stop backend >/dev/null 2>&1
rm -f "$ETC/restore-signed-off"
"$FFC" exec -T postgres mkdir -p /restore
"$FFC" cp "$ROOT/ops/selfhost/sql/appendix-b.sql" postgres:/restore/appendix-b.sql >/dev/null
# Proof the step matters: the plain restore of a --schema=public dump into a recreated schema stops.
psql_app -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public' >/dev/null 2>&1
"$FFC" cp "$WORK/out/nightly-form.pgdump" postgres:/restore/nightly-form.pgdump >/dev/null
"$FFC" exec -T postgres pg_restore --no-owner --no-privileges --exit-on-error -U fixflow_app -d fixflow /restore/nightly-form.pgdump >"$WORK/out/restore-plain.log" 2>&1
rc=$?; grep -q 'schema "public" already exists' "$WORK/out/restore-plain.log" && [ "$rc" != 0 ] && pass "control: a plain restore of the nightly form stops (exit $rc, schema exists)" || fail "control: plain restore exit=$rc"
# Back to a whole live database (the B5 form loads into a fresh schema as is) for the loop below.
psql_app -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public' >/dev/null 2>&1
"$FFC" cp "$WORK/out/predrain-smoke.pgdump" postgres:/restore/predrain-smoke.pgdump >/dev/null
"$FFC" exec -T postgres pg_restore --no-owner --no-privileges --exit-on-error -U fixflow_app -d fixflow /restore/predrain-smoke.pgdump >"$WORK/out/restore-reset.log" 2>&1 \
  && pass "control undone: the live database is whole again" || fail "reset after control: $(tail -c 300 "$WORK/out/restore-reset.log")"
for D in predrain-smoke.pgdump nightly-form.pgdump; do
  # runbook 6.6 (a): prove the dump and its list before anything is dropped
  "$FFC" cp "$WORK/out/$D" postgres:/restore/$D >/dev/null
  "$FFC" exec -T postgres sh -c 'pg_restore -l "$1" > "$1.toc" && grep -v -E "^[0-9]+; [0-9]+ [0-9]+ SCHEMA - public " "$1.toc" > "$1.list"' _ /restore/$D
  n="$("$FFC" exec -T postgres grep -c 'SCHEMA - public' /restore/$D.list | tr -d '\r')"
  [ "$n" = 0 ] && pass "$D: list has no SCHEMA - public entry" || fail "$D: list count $n"
  t="$("$FFC" exec -T postgres grep -c 'TABLE DATA' /restore/$D.list | tr -d '\r')"
  [ "${t:-0}" -gt 30 ] && pass "$D: list keeps $t tables' data" || fail "$D: TABLE DATA in list: $t"
  # runbook 6.6 (b): the live database has tables, so it is dumped and put off the host first
  live="$(psql_app -c "select count(*) from pg_tables where schemaname = 'public'")"
  if [ "${live:-0}" -gt 0 ]; then
    S="$(date -u +%Y%m%dT%H%M%SZ)"; P="$WORK/out/pre-restore-$S.pgdump"
    "$FFC" exec -T postgres pg_dump -U fixflow_app -d fixflow --format=custom > "$P" && drc=0 || drc=$?
    pt="$("$FFC" exec -T postgres sh -c 'cat > /tmp/p.dump && pg_restore -l /tmp/p.dump | grep -c "TABLE DATA"; rm -f /tmp/p.dump' < "$P" | tr -d ' \r\n')"
    [ "$drc" = 0 ] && [ "${pt:-0}" -gt 30 ] && pass "$D: pre-restore dump of the live db ($live tables, $pt with data)" || fail "$D: pre-restore dump exit=$drc data=$pt"
    # fixflow-r2-put.sh with the backend stopped: it must run (run --rm --no-deps, file on stdin),
    # get the bytes through intact, and stop closed because the placeholder R2 cannot answer.
    put="$(FFC="$FFC" sh "$ROOT/ops/selfhost/bin/fixflow-r2-put.sh" "$P" "archive/pre-restore/pre-restore-$S.pgdump" 2>&1)" && prc=0 || prc=$?
    case "$put" in *"could not tell whether archive/pre-restore/"*"nothing uploaded"*) pc=yes ;; *) pc=no ;; esac
    [ "$prc" != 0 ] && [ "$pc" = yes ] && pass "$D: r2-put ran with the backend stopped, bytes intact, refused without an R2 answer" || fail "$D: r2-put exit=$prc: $(printf '%s' "$put" | tail -c 300)"
  else
    fail "$D: expected a live schema to save before the drop (count $live)"
  fi
  # runbook 6.7: drop, recreate, load
  psql_app -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public' >/dev/null 2>&1 && pass "$D: schema reset as fixflow_app" || fail "$D: schema reset"
  if "$FFC" exec -T postgres pg_restore --no-owner --no-privileges --exit-on-error -U fixflow_app -d fixflow -L /restore/$D.list /restore/$D >"$WORK/out/restore-$D.log" 2>&1; then pass "$D: pg_restore --exit-on-error -L list"; else fail "$D: pg_restore: $(tail -c 400 "$WORK/out/restore-$D.log")"; fi
  # runbook 6.8
  if "$FFC" exec -T postgres psql -U fixflow_app -d fixflow -v ON_ERROR_STOP=1 -f /restore/appendix-b.sql >"$WORK/out/appendix-b-$D.txt" 2>&1; then pass "$D: Appendix B ran"; else fail "$D: Appendix B: $(tail -c 400 "$WORK/out/appendix-b-$D.txt")"; fi
  after="$(psql_app -c "select count(*) from shop_setting")|$(psql_app -c "select version_num from alembic_version")"
  [ "$before" = "$after" ] && pass "$D: restored counts equal ($after)" || fail "$D: before=$before after=$after"
  objowner="$(psql_app -c "select string_agg(distinct tableowner, ',') from pg_tables where schemaname='public'")|$(psql_app -c "select nspowner::regrole from pg_namespace where nspname='public'")"
  [ "$objowner" = "fixflow_app|fixflow_app" ] && pass "$D: tables and schema owned by fixflow_app" || fail "$D: owners: $objowner"
done
printf 'signed-off case=smoke-restore at=%s\n' "$(date -u +%FT%TZ)" > "$ETC/restore-signed-off"
"$FFC" --profile db --profile app up -d >"$WORK/out/up-app2.log" 2>&1
wait_healthy backend 180 && pass "backend healthy after restore" || fail "backend after restore"

echo "== S8 the app's own dump code against Postgres 17 (fake storage: nothing leaves the machine)"
"$FFC" exec -T backend python -c '
import asyncio, json
from datetime import timedelta
from app.core import backup
class Mem:
    def __init__(self): self.o = {}; self.d = []
    def put_bytes(self, k, b, ct): self.o[k] = b
    def list_keys(self, p): return [k for k in self.o if k.startswith(p)]
    def delete(self, k): self.d.append(k); self.o.pop(k, None)
m = Mem()
m.o["archive/post-drain/fixflow-db-20200101T000000Z.dump"] = b"old"
for d in ("01", "02", "03"): m.o[f"backups/db-hourly/fixflow-db-202001{d}T000000Z.dump"] = b"old"
a = asyncio.run(backup.run_db_backup(m, prefix="archive/post-drain/", prune=False))
b = asyncio.run(backup.run_db_backup(m, prefix="backups/db-hourly/", retention=timedelta(hours=72)))
c = asyncio.run(backup.run_db_backup(m, prefix="archive/post-drain/", retention=timedelta(hours=1)))
print(json.dumps({"post": a.key, "size": a.size_bytes, "hourly_pruned": list(b.pruned), "archive_pruned": list(c.pruned), "deleted": m.d, "magic": m.o[a.key][:5].decode()}))
' > "$WORK/out/dump.json" 2>&1
d="$(cat "$WORK/out/dump.json")"; echo "INFO $d"
case "$d" in *'"hourly_pruned": ["backups/db-hourly/fixflow-db-20200101T000000Z.dump"], "archive_pruned": [], "deleted": ["backups/db-hourly/fixflow-db-20200101T000000Z.dump"], "magic": "PGDMP"'*) pass "pg_dump 17 ran; hourly pruned its oldest only (newest 3 kept); archive never pruned" ;; *) fail "dump: $d" ;; esac

echo "== S9 web (Caddy, CSP, SPA fallback, bundled font)"
"$FFC" --profile db --profile app --profile web up -d --build >"$WORK/out/up-web.log" 2>&1
wait_healthy web 600 && pass "web healthy" || fail "web: $(tail -c 300 "$WORK/out/up-web.log")"
"$FFC" exec -T web sh -c 'wget -S -O /tmp/i.html http://127.0.0.1/ 2>&1' > "$WORK/out/web.txt" 2>&1
w="$(cat "$WORK/out/web.txt")"
spa="$("$FFC" exec -T web sh -c 'wget -S -O /dev/null http://127.0.0.1/jobs/5 2>&1 | grep "HTTP/"')"
gfont="$("$FFC" exec -T web sh -c 'grep -c googleapis /tmp/i.html')"
woff="$("$FFC" exec -T web sh -c 'ls /srv/assets | grep -c woff2')"
case "$w" in *"Content-Security-Policy: default-src 'self'; script-src 'self';"*"connect-src 'self' https://api.example.invalid "*) pass "CSP served with the API origin" ;; *) fail "CSP missing" ;; esac
for hname in "X-Content-Type-Options: nosniff" "X-Frame-Options: DENY" "Referrer-Policy:"; do
  case "$w" in *"$hname"*) pass "header $hname" ;; *) fail "header $hname" ;; esac
done
case "$w" in *"Server: Caddy"*) fail "Server header leaks" ;; *) pass "no Server header" ;; esac
case "$spa" in *"HTTP/1.1 200"*) pass "SPA route /jobs/5 -> 200" ;; *) fail "SPA fallback: $spa" ;; esac
[ "$(echo "$gfont" | tr -d ' 
')" = 0 ] && pass "index.html loads nothing from Google Fonts" || fail "googleapis in index.html: $gfont"
[ "$(echo "$woff" | tr -d ' 
')" -gt 0 ] && pass "font bundled ($(echo "$woff" | tr -d ' 
') woff2 files)" || fail "no bundled font"

echo "== S10 ops console (optional profile) reaches the backend over the private network"
"$FFC" $ALL up -d --build >"$WORK/out/up-ops.log" 2>&1
sleep 5
o="$("$FFC" exec -T ops node -e 'fetch(process.env.OPS_BACKEND_URL+"/api/ops/health",{headers:{"X-Ops-Proxy-Token":process.env.OPS_PROXY_TOKEN}}).then(r=>console.log(r.status, r.headers.get("x-fixflow-api")))' 2>&1)"
[ "$o" = "200 1" ] && pass "ops -> backend:8000 deep-health" || fail "ops: $o"

echo "== S11 edge: cloudflared's own ingress check of the config template (no tunnel is run)"
uuid=00000000-0000-4000-8000-000000000000
sed "s/REPLACE-WITH-TUNNEL-UUID/$uuid/g" "$ROOT/ops/selfhost/cloudflared/config.example.yml" > "$ETC/cloudflared/config.yml"
img="cloudflare/cloudflared:$(sed -n 's/^FIXFLOW_CLOUDFLARED_TAG=//p' "$ETC/compose.env")"
e="$(docker run --rm --network none -v "$ETC/cloudflared:/etc/cloudflared:ro" "$img" tunnel --config /etc/cloudflared/config.yml ingress validate 2>&1)"
echo "$e" | grep -qi "OK" && pass "ingress validate" || fail "ingress validate: $e"
for url in https://api.example.invalid/api/health https://app.example.invalid/ https://ops.example.invalid/ https://old-host.up.railway.app/; do
  r="$(docker run --rm --network none -v "$ETC/cloudflared:/etc/cloudflared:ro" "$img" tunnel --config /etc/cloudflared/config.yml ingress rule "$url" 2>&1 | tr '\n' ' ')"
  echo "INFO $url -> $r"
done
r="$(docker run --rm --network none -v "$ETC/cloudflared:/etc/cloudflared:ro" "$img" tunnel --config /etc/cloudflared/config.yml ingress rule https://unknown.example.invalid/ 2>&1)"
echo "$r" | grep -q "http_status:503" && pass "unmatched hostname -> http_status:503" || fail "catch-all: $r"
r="$(docker run --rm --network none -v "$ETC/cloudflared:/etc/cloudflared:ro" "$img" tunnel --config /etc/cloudflared/config.yml ingress rule https://api.example.invalid/api/jobs 2>&1)"
echo "$r" | grep -q "http://backend:8000" && pass "api. -> backend:8000 directly" || fail "api rule: $r"

echo "== S12 heartbeat end to end (health through the app network; a local dead-man receiver)"
net="${PROJECT}_app"
docker rm -f "$PROJECT-deadman" >/dev/null 2>&1
docker run -d --name "$PROJECT-deadman" --network "$net" --network-alias deadman node:22-alpine \
  node -e 'let n=0;require("http").createServer((q,s)=>{n++;console.log("PING",n,q.url);s.end("ok")}).listen(8099)' >/dev/null
mkdir -p "$WORK/hb"
printf 'FIXFLOW_HEARTBEAT_HEALTH_URL=http://backend:8000/api/ops/health\nFIXFLOW_HEARTBEAT_PING_URL=http://deadman:8099/ok\nFIXFLOW_HEARTBEAT_FAIL_URL=http://deadman:8099/fail\n' > "$ETC/heartbeat.env"
hb() { docker run --rm --network "$net" -e FIXFLOW_ETC=/etc/fixflow -v "$ETC:/etc/fixflow:ro" -v "$ROOT/ops/selfhost/bin:/hb:ro" --entrypoint sh curlimages/curl:8.10.1 /hb/fixflow-heartbeat.sh; }
hb >"$WORK/out/hb1.txt" 2>&1; rc1=$?
"$FFC" stop postgres >/dev/null 2>&1
hb >"$WORK/out/hb2.txt" 2>&1; rc2=$?
"$FFC" --profile db up -d postgres >/dev/null 2>&1
pings="$(docker logs "$PROJECT-deadman" 2>&1 | tr '\n' ' ')"
docker rm -f "$PROJECT-deadman" >/dev/null 2>&1
[ "$rc1" = 0 ] && pass "healthy -> exit 0" || fail "healthy run exit=$rc1 $(cat "$WORK/out/hb1.txt")"
[ "$rc2" = 1 ] && pass "database down -> exit 1, no ping" || fail "db-down run exit=$rc2 $(cat "$WORK/out/hb2.txt")"
case "$pings" in "PING 1 /ok PING 2 /fail ") pass "receiver saw exactly: ok, then fail" ;; *) fail "receiver saw: $pings" ;; esac

echo "== S12b the runbook's own commands (sections 6 and 8), as written there"
for _ in $(seq 1 30); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' "$("$FFC" ps -q postgres)" 2>/dev/null)" = healthy ] && break
  sleep 2
done
FF_SMOKE_OUT="$WORK/out" bash "$ROOT/ops/selfhost/smoke/runbook-commands.sh" > "$WORK/out/runbook-commands.txt" 2>&1
grep -E '^(==|PASS|FAIL)' "$WORK/out/runbook-commands.txt" | sed 's/^==/  ==/'
FAILS=$((FAILS + $(grep -c '^FAIL' "$WORK/out/runbook-commands.txt")))

echo "== S13 no published port on any service"
# An image's EXPOSEd port still prints (e.g. "5432/tcp") without being reachable; a published one
# prints "host:port->port". So the test is: no "->" in Ports, and no PortBindings in any container.
ports="$(docker ps --filter "label=com.docker.compose.project=$PROJECT" --format '{{.Names}} [{{.Ports}}]')"
echo "$ports" | sed 's/^/INFO /'
bind="$(docker ps -q --filter "label=com.docker.compose.project=$PROJECT" | xargs docker inspect -f '{{.Name}} {{json .HostConfig.PortBindings}}' | grep -v -E ' (\{\}|null)$')"
if echo "$ports" | grep -q -- '->' || [ -n "$bind" ]; then fail "a port is published: $bind"; else pass "no published port (no '->', no PortBindings) on any service"; fi

echo "SMOKE FAILS=$FAILS"
exit "$FAILS"
