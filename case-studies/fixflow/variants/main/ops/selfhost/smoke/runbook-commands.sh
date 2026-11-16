#!/usr/bin/env bash
# Second smoke stage: run the runbook's own commands (docs/RUNBOOK-SELFHOST.md sections 6 and 8)
# against a running smoke stack, as written there, and check what each Check block expects.
# Called by smoke.sh with FF_ROOT / FF_ENV / FF_PROJECT / FF_EXTRA_COMPOSE exported; prints
# PASS/FAIL lines and exits with the number of failures. Writes only to the smoke database.
set -u
export MSYS_NO_PATHCONV=1
FFC="${FF_ROOT:?}/ops/selfhost/bin/ffc"
FAILS=0
pass() { echo "PASS $*"; }
fail() { echo "FAIL $*"; FAILS=$((FAILS + 1)); }
P_DB="--profile db"
q() { "$FFC" exec -T postgres psql -U fixflow_app -d fixflow -v ON_ERROR_STOP=1 -tA "$@"; }

echo "== R1 runbook 6.4: the code head"
h="$("$FFC" --profile db --profile app run --rm --no-deps --entrypoint alembic backend heads 2>/dev/null | tr -d '\r')"
case "$h" in *"0046 (head)"*) pass "alembic heads -> $h" ;; *) fail "alembic heads: $h" ;; esac

echo "== R2 runbook 6.8: the sequence check"
s="$("$FFC" exec -T postgres psql -U fixflow_app -d fixflow -tA -F ' ' -c "select 'job_token_seq', (select last_value from job_token_seq), (select max(token) from job) union all select 'job_event_seq', (select last_value from job_event_seq), (select max(seq) from job_event) union all select 'shop_setting_seq', (select last_value from shop_setting_seq), (select max(seq) from shop_setting)" 2>&1)"
[ "$(echo "$s" | grep -c '_seq ')" = 3 ] && pass "sequence query: $(echo "$s" | tr '\n' ';')" || fail "sequence query: $s"

echo "== R3 runbook 6.10: case-c ticket sequence"
q -c "select setval('job_token_seq', 1200, true)" >/dev/null
[ "$(q -c 'select last_value from job_token_seq')" = 1200 ] && pass "setval job_token_seq 1200" || fail "setval"

echo "== R4 runbook 6.11: roster check and create"
missing="$(q -c "select x from unnest(string_to_array('t1 t2 zz9', ' ')) as x where x not in (select id from technician)")"
[ "$missing" = zz9 ] && pass "roster check lists only the missing id" || fail "roster check: $missing"
"$FFC" exec -T -e FF_ID=zz9 -e FF_NAME='Smoke Tech' -e FF_ROLE=tech backend python -c '
import asyncio, os, secrets
import app.registry  # noqa: F401
from app.core.db import SessionLocal
from app.features.identity.models import Technician
from app.features.identity.security import hash_pin
async def main():
    async with SessionLocal() as s:
        s.add(Technician(id=os.environ["FF_ID"], name=os.environ["FF_NAME"], role=os.environ["FF_ROLE"], pin_hash=hash_pin(secrets.token_hex(16))))
        await s.commit()
asyncio.run(main())' >/dev/null 2>&1 && pass "roster create ran" || fail "roster create"
missing="$(q -c "select x from unnest(string_to_array('t1 t2 zz9', ' ')) as x where x not in (select id from technician)")"
[ -z "$missing" ] && pass "roster complete" || fail "still missing: $missing"
r="$("$FFC" exec -T backend python -m scripts.set_pin --report 2>&1)"
case "$r" in *t1*) pass "set_pin --report runs (lists seed-PIN accounts)" ;; *) fail "set_pin --report: $(echo "$r" | tail -3)" ;; esac

echo "== R5 runbook 6.12: the fence"
q <<'SQL' >/dev/null
BEGIN;
UPDATE attendance_geofence SET is_active = false, updated_at = now()
 WHERE shop_id = 'default' AND is_active AND deleted_at IS NULL;
INSERT INTO attendance_geofence (shop_id, name, center_lat, center_lng, radius_m, is_active)
VALUES ('default', 'Workshop', 24.8607, 67.0011, 80, true);
COMMIT;
SQL
f="$(q -c "select center_lat, center_lng, radius_m from attendance_geofence where shop_id = 'default' and is_active and deleted_at is null")"
[ "$f" = "24.8607|67.0011|80" ] && pass "exactly one active fence: $f" || fail "fence: $f"

echo "== R6 runbook 8.5: manifest export"
q -c "insert into app_event (client_id, actor_kind, actor_id, name, props) values (gen_random_uuid(), 'tech', 't1', 'drain_manifest', '{\"versionCode\": 9, \"punches\": {\"pending\": 2}}')" >/dev/null
T=t1
"$FFC" exec -T postgres psql -U fixflow_app -d fixflow -tA -v ON_ERROR_STOP=1 -v tech="$T" <<'SQL' > "${FF_SMOKE_OUT:-/tmp}/manifest-t1.json"
SELECT coalesce(json_agg(json_build_object('id', id, 'client_id', client_id, 'actor_id', actor_id, 'device_id', device_id, 'device_time', device_time, 'server_time', server_time, 'props', props) ORDER BY server_time), '[]'::json)
FROM app_event WHERE name = 'drain_manifest' AND actor_id = :'tech';
SQL
n="$(node -e 'const d=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(d.length, d[0]&&d[0].props.versionCode)' "${FF_SMOKE_OUT:-/tmp}/manifest-t1.json" 2>&1)"
[ "$n" = "1 9" ] && pass "manifest export: 1 event, props intact" || fail "manifest export: $n"

echo "== R7 runbook 8.7: window audit queries (heredocs with psql variables)"
A() { "$FFC" exec -T postgres psql -U fixflow_app -d fixflow -v ON_ERROR_STOP=1 -v t_open=2020-01-01T00:00:00Z -v t_close=2100-01-01T00:00:00Z "$@"; }
A -tA <<'SQL' > "${FF_SMOKE_OUT:-/tmp}/late-sync.csv"; rc1=$?
COPY (
  SELECT 'punch' AS src, id, tech_id, kind, device_time, server_time, drift_seconds FROM attendance_event
   WHERE server_time BETWEEN :'t_open' AND :'t_close' AND server_time - device_time > interval '24 hours'
  UNION ALL
  SELECT 'presence', id, tech_id, NULL, device_time, server_time, NULL FROM attendance_presence_event
   WHERE server_time BETWEEN :'t_open' AND :'t_close' AND server_time - device_time > interval '24 hours'
  ORDER BY 3, 5
) TO STDOUT WITH CSV HEADER;
SQL
A <<'SQL' >/dev/null; rc2=$?
SELECT tech_id, count(*), min(device_time), max(device_time) FROM attendance_event
 WHERE server_time BETWEEN :'t_open' AND :'t_close' GROUP BY tech_id ORDER BY tech_id;
SQL
A <<'SQL' >/dev/null; rc3=$?
SELECT from_date, to_date, row_count, storage_path, created_at FROM payroll_export
 WHERE to_date >= (SELECT min(device_time)::date FROM attendance_event
                    WHERE server_time BETWEEN :'t_open' AND :'t_close')
 ORDER BY from_date;
SQL
hdr="$(head -n1 "${FF_SMOKE_OUT:-/tmp}/late-sync.csv" | tr -d '\r')"
[ "$rc1$rc2$rc3" = 000 ] && [ "$hdr" = "src,id,tech_id,kind,device_time,server_time,drift_seconds" ] && pass "three audit queries exit 0; CSV header ok" || fail "audit: rc=$rc1$rc2$rc3 header=$hdr"

echo "== R8 runbook 8.8: dispatch_cursor re-seed (forward only)"
q <<'SQL' >/dev/null
INSERT INTO dispatch_cursor (consumer, last_seq, updated_at)
SELECT 'whatsapp', COALESCE(MAX(seq), 0), now() FROM job_event
ON CONFLICT (consumer) DO UPDATE
   SET last_seq = GREATEST(dispatch_cursor.last_seq, EXCLUDED.last_seq), updated_at = now();
SQL
c="$(q -c "select (select last_seq from dispatch_cursor where consumer = 'whatsapp') = (select coalesce(max(seq), 0) from job_event)")"
[ "$c" = t ] && pass "cursor at head" || fail "cursor: $c"
q -c "update dispatch_cursor set last_seq = last_seq + 1000 where consumer = 'whatsapp'" >/dev/null
q <<'SQL' >/dev/null
INSERT INTO dispatch_cursor (consumer, last_seq, updated_at)
SELECT 'whatsapp', COALESCE(MAX(seq), 0), now() FROM job_event
ON CONFLICT (consumer) DO UPDATE
   SET last_seq = GREATEST(dispatch_cursor.last_seq, EXCLUDED.last_seq), updated_at = now();
SQL
c="$(q -c "select last_seq - (select coalesce(max(seq), 0) from job_event) from dispatch_cursor where consumer = 'whatsapp'")"
[ "$c" = 1000 ] && pass "re-seed never moves the cursor backwards" || fail "cursor moved back: $c"
q -c "update dispatch_cursor set last_seq = last_seq - 1000 where consumer = 'whatsapp'" >/dev/null
grep -q 'FIXFLOW_ENABLE_DISPATCHER: "false"' "$FF_ROOT/docker-compose.prod.yml" && pass "dispatcher hard-coded off in the compose" || fail "dispatcher line"

echo "RUNBOOK-COMMANDS FAILS=$FAILS"
exit "$FAILS"
