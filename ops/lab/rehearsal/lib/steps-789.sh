# shellcheck shell=bash
# Sections 7, 8 and 9 of the runbook (see steps.sh for the conventions).

# ---------------------------------------------------------------- section 7
sec7() {
  row 7.1 NRH "create the dead-man checks" "-" "the off-box monitoring service; stand-in listener on 127.0.0.1:9999"
  local before; before="$(wc -l < "$OUT/deadman.log" 2>/dev/null || echo 0)"
  rb_run 7.2-do "$(rb_fence 7.2 1)"
  local o1; o1="$(out_of | tr '\n' ' ')"
  local after; after="$(wc -l < "$OUT/deadman.log" 2>/dev/null || echo 0)"
  rb_run 7.2-dbdown "$(rb_fence 7.2 2)"
  local o2; o2="$(out_of)"
  local i
  for i in $(seq 1 60); do
    [ "$(docker inspect --format '{{.State.Health.Status}}' "$(ffc $P_DB ps -q postgres)" 2>/dev/null)" = healthy ] && break
    sleep 2
  done
  wait_backend_healthy 120
  rb_run 7.2-again "$(rb_fence 7.2 1 '$p')"
  local o3; o3="$(out_of | tr '\n' ' ')"
  rb_run 7.2-clean "$(rb_fence 7.2 3)"
  local ok=no
  [ "$(echo "$o1" | tr -d ' ')" = exit=0 ] && [ "$after" -gt "$before" ] && echo "$o2" | grep -q 'heartbeat: UNHEALTHY http=200' \
    && echo "$o2" | grep -qx 'exit=1' && [ "$(echo "$o3" | tr -d ' ')" = exit=0 ] && ok=yes
  # lab probe (not a runbook command): how long deep health takes to answer with postgres stopped
  ffc $P_DB stop postgres >/dev/null 2>&1
  local probe; probe="$(ffc exec -T backend sh -c 'curl -sS -m 150 -o /dev/null -w "%{http_code} after %{time_total}s" -H "X-Ops-Proxy-Token: $FIXFLOW_OPS_PROXY_TOKEN" http://localhost:8000/api/ops/health' 2>&1 | tail -n 1)"
  ffc $P_DB up -d postgres >/dev/null 2>&1
  for i in $(seq 1 60); do
    [ "$(docker inspect --format '{{.State.Health.Status}}' "$(ffc $P_DB ps -q postgres)" 2>/dev/null)" = healthy ] && break
    sleep 2
  done
  wait_backend_healthy 120
  echo "lab probe 7.2: deep health with postgres stopped answered: $probe" >> "$OUT/deviations.log"
  o2="$o2
lab probe: deep health with postgres stopped answered $probe"
  row 7.2 "$( [ $ok = yes ] && echo DONE || echo FAILED)" "heartbeat by hand at the container address; then with postgres stopped; then again" \
    "healthy: [$o1] pings $before->$after; db down: [$(echo "$o2" | grep -o 'UNHEALTHY http=[0-9]*' | head -n 1) $(echo "$o2" | grep '^exit=')]; again: [$o3]; $(echo "$o2" | grep '^lab probe')" \
    "network name fixflow_app confirmed (the VERIFY line)$( [ $ok = no ] && echo "$o2" | grep -q 'UNHEALTHY http=000' && echo "$o2" | grep -qx 'exit=1' && echo "; the alarm fired (exit=1, no ping) but the Expected 'http=200' was not seen: with the postgres container stopped, /api/ops/health did not answer within the heartbeat's curl -m 20, so it printed http=000. RUNBOOK DEFECT CANDIDATE (Expected text): accept 'http=000 or http=200 with database not ok'")"
  row 7.3 NRH "heartbeat through the tunnel" "-" "needs api.<domain> on the tunnel"
  rb_run 7.4-do "$(rb_fence 7.4 1)"
  rb_run 7.4-check "$(rb_fence 7.4 2 1p)"
  row 7.4 "$(v has '-rw-r--r-- 1 root root')" "install the heartbeat cron file" "$(out_of)" \
    "the file is installed; whether cron runs it every minute is NRH: the stand-in host (Alpine) has no Debian cron reading /etc/cron.d"
  row 7.5 NRH "test paging once" "-" "needs the monitoring service's e-mail"
  rb_run 7.6 "$(rb_fence 7.6 1)"
  local h; h="$(out_of)"
  local hk; hk="$(echo "$h" | grep '^{' | head -n 1 | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["key"], d["size_bytes"], len(d["sha256"]), d["pruned"])' 2>/dev/null)"
  local pinged; pinged="$(grep -c 'ping/hourly-dump' "$OUT/deadman.log" 2>/dev/null)"
  ok=no
  echo "$hk" | grep -qE '^backups/db-hourly/fixflow-db-[0-9]{8}T[0-9]{6}Z\.dump [1-9][0-9]* 64 \[\]$' && echo "$h" | grep -qx 'exit=0' && [ "${pinged:-0}" -ge 1 ] && ok=yes
  row 7.6 "$( [ $ok = yes ] && echo DONE || echo FAILED)" "fixflow-backup.sh hourly" "receipt: $hk; $(echo "$h" | grep '^exit='); hourly ping x$pinged" \
    "written to the stand-in bucket through the app's own run_db_backup"
  rb_run 7.7-do "$(rb_fence 7.7 1)"
  row 7.7 NRH "install the hourly-dump cron" "file installed: $(ls -l /etc/cron.d/fixflow-hourly-dump 2>/dev/null | cut -c1-30)" \
    "the :17 run needs a Debian cron; 7.6 ran the same command by hand"
  rb_run 7.8 "$(rb_fence 7.8 1)"
  row 7.8 "$(v sh -c "grep -qx fixflow-heartbeat '$LOG' && grep -qx fixflow-hourly-dump '$LOG'")" "ls /etc/cron.d | grep fixflow" "$(out_of | tr '\n' ' ')" "one host only here"
}

# ---------------------------------------------------------------- section 9
s3_keys() { # <prefix>  list the stand-in bucket through the app's own storage client
  ffc --profile db --profile app run --rm --no-deps -T --entrypoint python backend -c \
    "import sys; from app.core.storage import get_storage; print(*sorted(get_storage().list_keys(sys.argv[1])), sep='\n')" "$1" 2>/dev/null
}
s3_put_old() { # <key>...  plant old objects (harness setup for the prune check)
  ffc --profile db --profile app run --rm --no-deps -T --entrypoint python backend -c \
    "import sys; from app.core.storage import get_storage; s=get_storage(); [s.put_bytes(k, b'old', 'application/octet-stream') for k in sys.argv[1:]]" "$@" >/dev/null 2>&1
}
sec9_1() {
  # setup: the stand-in bucket holds older dumps under the self-host prefix, under the Railway-era
  # prefix, in a sub-folder and under archive/, so 9.1's prune has something to prune and to leave
  local old="backups/db-selfhost/fixflow-db-20260801T023000Z.dump backups/db-selfhost/fixflow-db-20260901T023000Z.dump backups/db-selfhost/fixflow-db-20260915T023000Z.dump backups/db-selfhost/fixflow-db-20261001T023000Z.dump backups/db/fixflow-db-20260701T023000Z.dump archive/pre-selfhost/fixflow-db-20260701T023000Z.dump backups/db-selfhost/sub/fixflow-db-20260101T000000Z.dump"
  # shellcheck disable=SC2086
  s3_put_old $old
  echo "lab: planted in the stand-in bucket before 9.1: $old" >> "$OUT/deviations.log"
  rb_run 9.1 "$(rb_fence 9.1 1)"
  local r; r="$(out_of | grep '^{' | head -n 1)"
  local key pr
  key="$(echo "$r" | python3 -c 'import json,sys; print(json.load(sys.stdin)["key"])' 2>/dev/null)"
  pr="$(echo "$r" | python3 -c 'import json,sys; print(" ".join(json.load(sys.stdin)["pruned"]))' 2>/dev/null)"
  local left_self left_db left_arch
  left_self="$(s3_keys backups/db-selfhost/ | tr '\n' ' ')"
  left_db="$(s3_keys backups/db/ | tr '\n' ' ')"
  left_arch="$(s3_keys archive/pre-selfhost/ | tr '\n' ' ')"
  # expected: MIN_KEEP_NEWEST=3 keeps the new dump and the two newest planted ones (09-15, 10-01);
  # 08-01 and 09-01 are older than 30 days and go; sub/, backups/db/ and archive/ are never touched
  local ok=no
  echo "$key" | grep -qE '^backups/db-selfhost/fixflow-db-' \
    && [ "$pr" = "backups/db-selfhost/fixflow-db-20260801T023000Z.dump backups/db-selfhost/fixflow-db-20260901T023000Z.dump" ] \
    && echo "$left_db" | grep -q 20260701 && echo "$left_arch" | grep -q 20260701 && echo "$left_self" | grep -q 'sub/fixflow-db-20260101' && ok=yes
  row 9.1 "$( [ $ok = yes ] && echo DONE || echo FAILED)" "fixflow-backup.sh manual (the nightly job's call)" \
    "key $key; pruned [$pr]; left under db-selfhost/: $left_self; backups/db/: $left_db; archive/pre-selfhost/: $left_arch" \
    "prune checked against planted 2026-08..10 dumps: 30 days and keep-newest-3 applied; Railway-era backups/db/, a sub-folder and archive/ untouched"
}
sec9_2() {
  env_set /etc/fixflow/compose.env FIXFLOW_BACKUP_ENABLED true
  rb_run 9.2-do "$(rb_span 9.2 'up -d backend')"
  wait_backend_healthy 150
  deep_health > "$OUT/deep-health-9.2.json"
  local bk sch
  bk="$(jget facts.backup_enabled < "$OUT/deep-health-9.2.json")"
  sch="$(jget components < "$OUT/deep-health-9.2.json" | jget scheduler.detail)"
  row 9.2 "$( [ "$bk" = True ] && echo "$sch" | grep -q 'db-backup-nightly' && echo DONE || echo FAILED)" \
    "compose.env FIXFLOW_BACKUP_ENABLED=true; ffc \$P_RUN up -d backend" "backup_enabled=$bk; scheduler: $(echo "$sch" | cut -c1-220)" \
    "the Check also wants the next run at 02:30 Asia/Karachi"
  env_set /etc/fixflow/compose.env FIXFLOW_BACKUP_ENABLED false
  ffc $P_RUN up -d backend >/dev/null 2>&1; wait_backend_healthy 150
}

# ---------------------------------------------------------------- section 8
sec8() {
  local f=/etc/fixflow/backend.env
  # 8.1: the owner removes the leading # from two lines and sets W
  sed -i 's/^# \(FIXFLOW_ATTENDANCE_DEVICE_TIME_BACKDATE_CEILING_HOURS\)=.*/\1=2640/; s/^# \(FIXFLOW_JOBS_GPS_BACKDATE_CEILING_HOURS\)=.*/\1=2640/' $f
  echo "edited $f: uncommented the two ceilings, W=2640" >> "$OUT/editor.log"
  rb_run 8.1-do "$(rb_fence 8.1 2)"
  local t_open; t_open="$(out_of | grep -E '^[0-9]{4}-' | tail -n 1)"
  wait_backend_healthy 150
  deep_health > "$OUT/deep-health-8.1.json"
  local a j p
  a="$(jget facts.attendance_device_time_backdate_ceiling_hours < "$OUT/deep-health-8.1.json")"
  j="$(jget facts.jobs_gps_backdate_ceiling_hours < "$OUT/deep-health-8.1.json")"
  p="$(jget facts.attendance_ping_backdate_ceiling_hours < "$OUT/deep-health-8.1.json")"
  row 8.1 "$( [ "$a" = 2640 ] && [ "$j" = 2640 ] && [ "$p" = 240 ] && echo DONE || echo FAILED)" \
    "uncomment two ceilings (W=2640); up -d --force-recreate backend" "T_open=$t_open; facts $a / $j / $p" \
    "the first block is the lines to write, not commands; backend.env.example carries them as '# KEY=24' lines"
  rb_run 8.2-snap "$(rb_fence 8.2 1)"
  local o; o="$(out_of)"
  local td up lsum
  td="$(echo "$o" | grep -xE '[0-9]+' | head -n 1)"
  up="$(echo "$o" | grep '^uploaded key=archive/pre-drain/')"
  lsum="$(echo "$o" | grep -E '^[0-9a-f]{64} ' | cut -d' ' -f1)"
  rb_run 8.2-fuel "$(rb_fence 8.2 2)"
  local frc="$RC" fuel; fuel="$(out_of | tail -n 2 | tr '\n' ' ')"
  local snap=no
  [ "${td:-0}" -gt 40 ] && [ -n "$lsum" ] && echo "$up" | grep -q "sha256=$lsum" && snap=yes
  row 8.2 "$( [ $snap = yes ] && echo NRH || echo FAILED)" \
    "pg_dump predrain; count; sha256; r2-put; then drain_audit --snapshot-fuel; r2-put" \
    "snapshot: TABLE DATA $td (>40 expected); $(echo "$up" | cut -c1-110); fuel (exit $frc): $(echo "$fuel" | cut -c1-160)" \
    "the snapshot half ran as written and passed; the fuel half needs P2b-2's backend/scripts/drain_audit.py, which is not merged (the runbook marks its arguments VERIFY)"
  row 8.3 NRH "open the route (6.14)" "-" "needs the tunnel"
  rb_run 8.4 "$(rb_fence 8.4 1)"
  local pk; pk="$(out_of | grep '^{' | head -n 1 | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["key"], d["pruned"])' 2>/dev/null)"
  row 8.4 "$(v sh -c "echo '$pk' | grep -qE '^archive/post-drain/fixflow-db-.* \[\]$'")" "fixflow-backup.sh post-drain" "$pk"
  # 8.5: a stand-in manifest event (a phone's first authenticated call), landed by SQL: no phone here
  psql_app -c "insert into app_event (client_id, actor_kind, actor_id, name, props) values (gen_random_uuid(), 'tech', 't1', 'drain_manifest', '{\"versionCode\": 9, \"lab\": \"L4 stand-in\"}')" >/dev/null 2>&1
  echo "lab: 8.5 a stand-in drain_manifest app_event for t1 inserted by SQL (no phone here)" >> "$OUT/deviations.log"
  rb_run 8.5 "$(rb_fence 8.5 1)" "<tech id signed in on that phone>=t1" "<versionCode>=9"
  row 8.5 "$(v sh -c "grep -q '1 manifest event(s)' '$LOG' && grep -q 'uploaded key=archive/manifests/t1-9.json' '$LOG'")" \
    "manifest export to json; count; r2-put" "$(out_of | tail -n 2 | tr '\n' ' ')" "a stand-in manifest event"
  local t_close; t_close="$(date -u +%FT%TZ)"
  rb_run 8.6 "$(rb_fence 8.6 1)" "<T_OPEN>=$t_open" "<T_CLOSE>=$t_close"
  local q_rc="$RC" q_err; q_err="$(out_of | grep -c 'ERROR:')"
  local q_out; q_out="$(out_of | tr '\n' ' ' | cut -c1-200)"
  rb_run 8.6-upload "$(rb_span 8.6 'fixflow-r2-put.sh')" "<T_CLOSE stamp>=$(date -u -d "$t_close" +%Y%m%dT%H%M%SZ)"
  local up_rc="$RC" up_out; up_out="$(out_of | tail -n 1)"
  row 8.6 "$( [ "$q_rc" = 0 ] && [ "$q_err" = 0 ] && [ -s /var/lib/fixflow/drain/late-sync.csv ] && [ "$up_rc" = 0 ] && echo DONE || echo FAILED)" \
    "three window-audit queries; upload the CSV" "exit $q_rc, psql ERROR lines $q_err; late-sync.csv $(wc -l < /var/lib/fixflow/drain/late-sync.csv 2>/dev/null) line(s); $q_out; upload exit $up_rc: $up_out" \
    "the window is minutes long here, so the tables are near empty; each query parses and runs"
  sed -i 's/^\(FIXFLOW_ATTENDANCE_DEVICE_TIME_BACKDATE_CEILING_HOURS=\)/# \1/; s/^\(FIXFLOW_JOBS_GPS_BACKDATE_CEILING_HOURS=\)/# \1/' $f
  echo "edited $f: commented the two ceilings out again" >> "$OUT/editor.log"
  rb_run 8.7 "$(rb_fence 8.7 1)"
  wait_backend_healthy 150
  deep_health > "$OUT/deep-health-8.7.json"
  a="$(jget facts.attendance_device_time_backdate_ceiling_hours < "$OUT/deep-health-8.7.json")"
  j="$(jget facts.jobs_gps_backdate_ceiling_hours < "$OUT/deep-health-8.7.json")"
  p="$(jget facts.attendance_ping_backdate_ceiling_hours < "$OUT/deep-health-8.7.json")"
  row 8.7 "$( [ "$a" = 24 ] && [ "$j" = 48 ] && [ "$p" = 240 ] && echo DONE || echo FAILED)" "comment the ceilings out; recreate" "facts $a / $j / $p"
  sec8_8
}
sec8_8() {
  local before; before="$(psql_app -c "select last_seq from dispatch_cursor where consumer='whatsapp'" 2>/dev/null)"
  rb_run 8.8-do "$(rb_fence 8.8 1)"
  local drc="$RC"
  rb_run 8.8-check "$(rb_span 8.8 'select (select last_seq')"
  local t; t="$(out_of)"
  rb_run 8.8-compose "$(rb_span 8.8 "grep -n 'FIXFLOW_ENABLE_DISPATCHER'")"
  local after; after="$(psql_app -c "select last_seq from dispatch_cursor where consumer='whatsapp'" 2>/dev/null)"
  row 8.8 "$( [ "$drc" = 0 ] && [ "$t" = t ] && has '"false"' && echo DONE || echo FAILED)" \
    "re-seed the cursor (forward only)" "cursor $before -> $after; equals max(seq): $t; compose: $(out_of | tr -s ' ' | cut -c1-80)"
}
