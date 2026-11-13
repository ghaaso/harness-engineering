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
  # ... and how long the name `postgres` takes to fail to resolve: with the container stopped,
  # Docker's resolver forwards the name upstream, and this host has no upstream (it is offline)
  local dns; dns="$(ffc exec -T backend python -c '
import socket, time
t = time.monotonic()
try:
    socket.getaddrinfo("postgres", 5432); r = "resolved"
except OSError as e:
    r = type(e).__name__
print(f"getaddrinfo(postgres) {r} after {time.monotonic() - t:.1f}s")' 2>&1 | tail -n 1)"
  probe="$probe; $dns"
  ffc $P_DB up -d postgres >/dev/null 2>&1
  for i in $(seq 1 60); do
    [ "$(docker inspect --format '{{.State.Health.Status}}' "$(ffc $P_DB ps -q postgres)" 2>/dev/null)" = healthy ] && break
    sleep 2
  done
  wait_backend_healthy 120
  echo "lab probe 7.2: deep health with postgres stopped answered: $probe" >> "$OUT/deviations.log"
  o2="$o2
lab probe: deep health with postgres stopped answered $probe"
  # The alarm firing with http=000 instead of the Expected http=200 is AMBIGUOUS, not FAILED: the
  # slow answer may come from this offline host's DNS (see the probe), which a real host lacks.
  local amb=no
  [ $ok = no ] && echo "$o2" | grep -q 'UNHEALTHY http=000' && echo "$o2" | grep -qx 'exit=1' \
    && [ "$(echo "$o1" | tr -d ' ')" = exit=0 ] && [ "$(echo "$o3" | tr -d ' ')" = exit=0 ] && [ "$after" -gt "$before" ] && amb=yes
  row 7.2 "$( [ $ok = yes ] && echo DONE || { [ $amb = yes ] && echo AMBIGUOUS || echo FAILED; })" "heartbeat by hand at the container address; then with postgres stopped; then again" \
    "healthy: [$o1] pings $before->$after; db down: [$(echo "$o2" | grep -o 'UNHEALTHY http=[0-9]*' | head -n 1) $(echo "$o2" | grep '^exit=')]; again: [$o3]; $(echo "$o2" | grep '^lab probe')" \
    "network name fixflow_app confirmed (the VERIFY line)$( [ $amb = yes ] && echo "; the alarm fired (exit=1, no ping) but the Expected 'http=200' was not seen: with postgres stopped, /api/ops/health did not answer within the heartbeat's curl -m 20, so it printed http=000. The lab probe shows whether this host's offline DNS explains the delay (a real host gets a fast NXDOMAIN). Either way the alarm fires; settle on the real host. If it recurs there, the smallest fix is the Expected text: 'http=000 or http=200 with database not ok'")"
  row 7.3 NRH "heartbeat through the tunnel" "-" "needs api.<domain> on the tunnel"
  # lab: heartbeat.env's health URL is api.<domain>, which needs the tunnel (7.4 comes after 7.3 on
  # a real host). While cron runs it here, it points at the backend's container address, the
  # address 7.2's own test file uses.
  local bip; bip="$(docker inspect -f '{{(index .NetworkSettings.Networks "fixflow_app").IPAddress}}' "$(ffc $P_RUN ps -q backend)")"
  env_set /etc/fixflow/heartbeat.env FIXFLOW_HEARTBEAT_HEALTH_URL "http://$bip:8000/api/ops/health"
  echo "lab: from 7.4 on, heartbeat.env's FIXFLOW_HEARTBEAT_HEALTH_URL is the backend's container address (no tunnel), so the cron heartbeat can be healthy" >> "$OUT/deviations.log"
  rb_run 7.4-do "$(rb_fence 7.4 1)"
  local m74=no; l4_mut 7.4-no-cron && { pkill -x crond; m74=yes; }
  local hb0 hb1; hb0="$(grep -c ' /ping/heartbeat' "$OUT/deadman.log")"
  rb_run 7.4-check "$(rb_fence 7.4 2)"    # its own 'sleep 130'
  hb1="$(grep -c ' /ping/heartbeat' "$OUT/deadman.log")"
  [ $m74 = yes ] && crond -s
  local times; times="$(grep ' /ping/heartbeat' "$OUT/deadman.log" | tail -n $((hb1 - hb0)) | awk '{print substr($1,12,5)}' | tr '\n' ' ')"
  row 7.4 "$( has '-rw-r--r-- 1 root root' && has 'log empty' && [ $((hb1 - hb0)) -ge 2 ] && echo DONE || echo FAILED)" \
    "install the heartbeat cron file; cronie runs it" "$(out_of | tr '\n' ';'); heartbeat pings at the stand-in dead-man service during the 130 s: $((hb1 - hb0)) (at $times)" \
    "cronie reads /etc/cron.d with the user field as Debian's cron does; the ping URL is the stand-in listener"
  row 7.5 NRH "test paging once" "-" "needs the monitoring service's e-mail"
  local m76=no; l4_mut 7.6-deadman-down && { pkill -f lib/deadman.py; m76=yes; }
  rb_run 7.6 "$(rb_fence 7.6 1)"
  [ $m76 = yes ] && { nohup python3 /srv/l4/kit/lib/deadman.py "$OUT/deadman.log" >/dev/null 2>&1 & sleep 1; }
  local h; h="$(out_of)"
  local hk; hk="$(echo "$h" | grep '^{' | head -n 1 | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["key"], d["size_bytes"], len(d["sha256"]), d["pruned"])' 2>/dev/null)"
  local pinged; pinged="$(grep -c 'ping/hourly-dump' "$OUT/deadman.log" 2>/dev/null)"
  ok=no
  echo "$hk" | grep -qE '^backups/db-hourly/fixflow-db-[0-9]{8}T[0-9]{6}Z\.dump [1-9][0-9]* 64 \[\]$' && echo "$h" | grep -qx 'exit=0' && [ "${pinged:-0}" -ge 1 ] && ok=yes
  row 7.6 "$( [ $ok = yes ] && echo DONE || echo FAILED)" "fixflow-backup.sh hourly" "receipt: $hk; $(echo "$h" | grep '^exit='); hourly ping x$pinged" \
    "written to the stand-in bucket through the app's own run_db_backup"
  rb_run 7.7-do "$(rb_fence 7.7 1)"
  # lab: the Check waits for the next :17. Here the installed copy's minute field is moved to two
  # minutes ahead, cron runs the line as written otherwise, and the :17 is put back.
  local f77=/etc/cron.d/fixflow-hourly-dump nm hd0 hd1 i
  nm=$(( (10#$(date -u +%M) + 2) % 60 ))
  sed -i "s/^17 \(\* \* \* \* root \)/$nm \1/" $f77
  echo "lab: 7.7 the installed cron line's minute 17 moved to $nm for one run, then put back (the Check waits for the next :17)" >> "$OUT/deviations.log"
  hd0="$(grep -c ' /ping/hourly-dump' "$OUT/deadman.log")"
  for i in $(seq 1 60); do
    sleep 5
    hd1="$(grep -c ' /ping/hourly-dump' "$OUT/deadman.log")"
    [ "$hd1" -gt "$hd0" ] && break
  done
  sed -i "s/^$nm \(\* \* \* \* root \)/17 \1/" $f77
  rb_run 7.7-check "$(rb_fence 7.7 2)"
  # "a timestamp from that hour": the run landed within the last five minutes
  local hrs; hrs="($(date -u +%Y%m%dT%H)|$(date -u -d '-5 min' +%Y%m%dT%H))"
  row 7.7 "$( has '-rw-r--r-- 1 root root' && hasre "\"key\": *\"backups/db-hourly/fixflow-db-$hrs" && ! has Traceback && [ "$hd1" -gt "$hd0" ] && grep -q '^17 ' $f77 && echo DONE || echo FAILED)" \
    "install the hourly-dump cron; cronie runs it" "$(out_of | cut -c1-140 | tr '\n' ';'); hourly-dump pings $hd0 -> $hd1" \
    "the minute field was moved to the next run and put back (deviations.log); everything else in the line ran under cron as written"
  rb_run 7.8 "$(rb_fence 7.8 1)"
  row 7.8 "$(v sh -c "grep -qx fixflow-heartbeat '$OLOG' && grep -qx fixflow-hourly-dump '$OLOG'")" "ls /etc/cron.d | grep fixflow" "$(out_of | tr '\n' ' ')" "one host only here"
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
  l4_mut 9.1-plant && old="${old#backups/db-selfhost/fixflow-db-20260801T023000Z.dump }"
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
  # health.py prints next_run_time with %Z, the trigger's own zone. Whether the deployed code puts
  # its cron triggers in the shop zone is read from the checkout (PR #208 passes timezone= to
  # each CronTrigger); what the Check accepts is read from the runbook's own 9.2 text: main's
  # before the batch wants 02:30 Asia/Karachi (PKT) whatever runs; the batch's (ruling C38/C42)
  # wants 02:30 UTC from the drain image and 02:30 PKT once main with #208 runs.
  local nightly; nightly="$(echo "$sch" | tr ';' '\n' | grep -o 'db-backup-nightly→[^;]*' | head -n 1)"
  local fixed=no want=PKT
  grep -q 'CronTrigger(.*timezone=' /opt/fixflow/backend/app/core/scheduler.py 2>/dev/null && fixed=yes
  if rb_text_has 9.2 '02:30 UTC'; then [ $fixed = yes ] && want=PKT || want=UTC; fi
  local note
  if [ $fixed = yes ]; then
    note="the deployed checkout ($(git -C /opt/fixflow rev-parse --short HEAD)) carries PR #208 (CronTrigger with timezone=): the four cron jobs (payroll-weekly-export, db-backup-nightly, outcome-auto-link-scan, media-orphan-sweep) run in the shop zone; the Check wants $want"
  else
    note="the deployed checkout ($(git -C /opt/fixflow rev-parse --short HEAD)) predates PR #208: its CronTriggers take the container's UTC, so the four cron jobs (payroll-weekly-export, db-backup-nightly, outcome-auto-link-scan, media-orphan-sweep) run 5 h late by shop time (D10); the Check wants $want$( [ $want = PKT ] && echo ', which this code cannot give' )"
  fi
  row 9.2 "$( [ "$bk" = True ] && echo "$nightly" | grep -qE "→[0-9-]+ 02:30 $want\$" && echo DONE || echo FAILED)" \
    "compose.env FIXFLOW_BACKUP_ENABLED=true; ffc \$P_RUN up -d backend" "backup_enabled=$bk; $nightly; scheduler: $(echo "$sch" | cut -c1-220)" "$note"
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
  rb_run 8.2-fuel "$(rb_fence 8.2 @fuel/2)"
  local frc="$RC" fuel; fuel="$(out_of | tail -n 2 | tr '\n' ' ')"
  local snap=no
  [ "${td:-0}" -gt 40 ] && [ -n "$lsum" ] && echo "$up" | grep -q "sha256=$lsum" && snap=yes
  row 8.2 "$( [ $snap = yes ] && echo NRH || echo FAILED)" \
    "pg_dump predrain; count; sha256; r2-put; then drain_audit --snapshot-fuel; r2-put" \
    "snapshot: TABLE DATA $td (>40 expected); $(echo "$up" | cut -c1-110); fuel (exit $frc): $(echo "$fuel" | cut -c1-160)" \
    "the snapshot half ran as written and passed; the fuel half needs P2b-2's backend/scripts/drain_audit.py, which is not merged (the runbook marks its arguments VERIFY)$(rb_anch 8.2 fuel && echo "; the batch's exit-and-parse guard: $(echo "$fuel" | grep -o 'STOP: no usable fuel snapshot uploaded[^;]*' | head -n 1 || true)$(echo "$fuel" | grep -q STOP && echo ' (it stopped the upload of the failed snapshot, as written)' || echo ' NO STOP line printed')")"
  row 8.3 NRH "open the route (6.14)" "-" "needs the tunnel"
  rb_run 8.4 "$(rb_fence 8.4 1)"
  local pk; pk="$(out_of | grep '^{' | head -n 1 | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["key"], d["pruned"])' 2>/dev/null)"
  row 8.4 "$(v sh -c "echo '$pk' | grep -qE '^archive/post-drain/fixflow-db-.* \[\]$'")" "fixflow-backup.sh post-drain" "$pk"
  # 8.5: a stand-in manifest event (a phone's first authenticated call), landed by SQL: no phone here
  psql_app -c "insert into app_event (client_id, actor_kind, actor_id, name, props) values (gen_random_uuid(), 'tech', 't1', 'drain_manifest', '{\"versionCode\": 9, \"lab\": \"L4 stand-in\"}')" >/dev/null 2>&1
  echo "lab: 8.5 a stand-in drain_manifest app_event for t1 inserted by SQL (no phone here)" >> "$OUT/deviations.log"
  rb_run 8.5 "$(rb_fence 8.5 1)" "<tech id signed in on that phone>=t1" "<versionCode>=9"
  row 8.5 "$(v sh -c "grep -q '1 manifest event(s)' '$OLOG' && grep -q 'uploaded key=archive/manifests/t1-9.json' '$OLOG'")" \
    "manifest export to json; count; r2-put" "$(out_of | tail -n 2 | tr '\n' ' ')" "a stand-in manifest event"
  if rb_anch 8.6 close; then
    sec8_c42 "$t_open"
    sec8_8
    return
  fi
  # 8.6 needs <T_CLOSE> "as recorded", and T_close is recorded only in 8.7, which comes after it
  # (finding N2). The rig types the text as written: <T_OPEN> is filled from 8.1, <T_CLOSE> is
  # left as it stands, and the row fails where an owner would.
  rb_run 8.6 "$(rb_fence 8.6 1)" "<T_OPEN>=$t_open"
  local q_rc="$RC" q_err; q_err="$(out_of | grep -c 'ERROR:')"
  local q_out; q_out="$(out_of | tr '\n' ' ' | cut -c1-200)"
  rb_run 8.6-upload "$(rb_span 8.6 'fixflow-r2-put.sh')"
  local up_rc="$RC" up_out; up_out="$(out_of | tail -n 1)"
  row 8.6 "$( [ "$q_rc" = 0 ] && [ "$q_err" = 0 ] && [ -s /var/lib/fixflow/drain/late-sync.csv ] && [ "$up_rc" = 0 ] && echo DONE || echo FAILED)" \
    "three window-audit queries; upload the CSV (typed as written: no T_close exists yet)" "exit $q_rc, psql ERROR lines $q_err; late-sync.csv $(wc -l < /var/lib/fixflow/drain/late-sync.csv 2>/dev/null) line(s); $q_out; upload exit $up_rc: $up_out" \
    "RUNBOOK DEFECTS: (N2) the step needs <T_CLOSE> 'as recorded', but T_close is recorded only in 8.7, after it, so it cannot be followed where it stands; typed as written, the placeholder is a shell redirection and the queries never run. (D3) the upload line calls fixflow-r2-put.sh by bare name, which is not on PATH (only ffc is linked into /usr/local/bin; 6.6 b, 8.2, 8.5 spell out /opt/fixflow/ops/selfhost/bin/); the same at the P13e line; $( [ "$up_rc" = 127 ] && echo 'seen here (exit 127)' || echo "not reached in this run: the placeholder's redirection fails first (exit $up_rc); seen as exit 127 in the runs with a filled-in stamp") Fixes: 8.6 after 8.7 with 8.7's T_close; the full path"
  if ! l4_mut 8.7-forgot-edit; then
    sed -i 's/^\(FIXFLOW_ATTENDANCE_DEVICE_TIME_BACKDATE_CEILING_HOURS=\)/# \1/; s/^\(FIXFLOW_JOBS_GPS_BACKDATE_CEILING_HOURS=\)/# \1/' $f
    echo "edited $f: commented the two ceilings out again" >> "$OUT/editor.log"
  fi
  rb_run 8.7 "$(rb_fence 8.7 1)"
  wait_backend_healthy 150
  deep_health > "$OUT/deep-health-8.7.json"
  a="$(jget facts.attendance_device_time_backdate_ceiling_hours < "$OUT/deep-health-8.7.json")"
  j="$(jget facts.jobs_gps_backdate_ceiling_hours < "$OUT/deep-health-8.7.json")"
  p="$(jget facts.attendance_ping_backdate_ceiling_hours < "$OUT/deep-health-8.7.json")"
  row 8.7 "$( [ "$a" = 24 ] && [ "$j" = 48 ] && [ "$p" = 240 ] && echo DONE || echo FAILED)" "comment the ceilings out; recreate" "facts $a / $j / $p"
  sec8_8
}
# Section 8 from 8.5a on, as the runbook batch (ruling C42) orders it: 8.5a audits the phone,
# 8.6 puts the ceilings back and records T_close, 8.7 reads the window [T_open, T_close].
sec8_c42() { # <T_open>
  local t_open="$1" f=/etc/fixflow/backend.env a j p
  if rb_anch 8.5a audit; then
    rb_run 8.5a "$(rb_fence 8.5a @audit)" "<T_OPEN>=$t_open" "<S>=${S:-}"
    row 8.5a "$( has 'audit exit=0' && echo DONE || echo NRH)" "drain_audit --t-open --tech --fuel-baseline (exit code contract 0/3/4/5)" \
      "$(out_of | tail -n 2 | tr '\n' ' ' | cut -c1-200)" "needs P2b-2's backend/scripts/drain_audit.py (not merged); typed as written with T from 8.5 and S from 8.2"
  fi
  if ! l4_mut 8.7-forgot-edit; then
    sed -i 's/^\(FIXFLOW_ATTENDANCE_DEVICE_TIME_BACKDATE_CEILING_HOURS=\)/# \1/; s/^\(FIXFLOW_JOBS_GPS_BACKDATE_CEILING_HOURS=\)/# \1/' $f
    echo "edited $f: commented the two ceilings out again (8.6)" >> "$OUT/editor.log"
  fi
  rb_run 8.6 "$(rb_fence 8.6 @close)"
  local t_close; t_close="$(out_of | grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' | tail -n 1)"
  wait_backend_healthy 150
  deep_health > "$OUT/deep-health-8.6.json"
  a="$(jget facts.attendance_device_time_backdate_ceiling_hours < "$OUT/deep-health-8.6.json")"
  j="$(jget facts.jobs_gps_backdate_ceiling_hours < "$OUT/deep-health-8.6.json")"
  p="$(jget facts.attendance_ping_backdate_ceiling_hours < "$OUT/deep-health-8.6.json")"
  row 8.6 "$( [ "$a" = 24 ] && [ "$j" = 48 ] && [ "$p" = 240 ] && [ -n "$t_close" ] && echo DONE || echo FAILED)" \
    "comment the ceilings out; recreate; date -u (T_close)" "facts $a / $j / $p; T_close=$t_close" "the batch's order: T_close is read after the recreate"
  local stamp; stamp="$(echo "$t_close" | tr -d ':-')"
  rb_run 8.7 "$(rb_fence 8.7 @queries)" "<T_OPEN>=$t_open" "<T_CLOSE>=$t_close"
  local q_rc="$RC" q_err; q_err="$(out_of | grep -c 'ERROR:')"
  local q_out; q_out="$(out_of | tr '\n' ' ' | cut -c1-200)"
  rb_run 8.7-upload "$(rb_fence 8.7 @upload)" "<T_CLOSE stamp>=$stamp"
  local up_rc="$RC" up_out; up_out="$(out_of | tail -n 1)"
  row 8.7 "$( [ "$q_rc" = 0 ] && [ "$q_err" = 0 ] && [ -s /var/lib/fixflow/drain/late-sync.csv ] && [ "$up_rc" = 0 ] && echo "$up_out" | grep -q '^uploaded key=archive/drain-audit/late-sync-' && echo DONE || echo FAILED)" \
    "three window-audit queries over [T_open, T_close]; upload the CSV by its full path" \
    "exit $q_rc, psql ERROR lines $q_err; late-sync.csv $(wc -l < /var/lib/fixflow/drain/late-sync.csv 2>/dev/null) line(s); $q_out; upload exit $up_rc: $up_out" \
    "T_OPEN from 8.1 and T_CLOSE from 8.6, as recorded; the stamp in the CSV's key is T_close without '-' and ':' ($stamp), a form the text leaves to the owner"
}

sec8_8() {
  local before; before="$(psql_app -c "select last_seq from dispatch_cursor where consumer='whatsapp'" 2>/dev/null)"
  rb_run 8.8-do "$(rb_fence 8.8 1)"
  local drc="$RC"
  l4_mut 8.8-new-event && psql_app -c "insert into job_event (job_id, kind, text, actor, seq) select id, 'note', 'L4 mutation: an event after the re-seed', 'm1', nextval('job_event_seq') from job limit 1" >/dev/null 2>&1
  rb_run 8.8-check "$(rb_span 8.8 'select (select last_seq')"
  local t; t="$(out_of)"
  rb_run 8.8-compose "$(rb_span 8.8 "grep -n 'FIXFLOW_ENABLE_DISPATCHER'")"
  local after; after="$(psql_app -c "select last_seq from dispatch_cursor where consumer='whatsapp'" 2>/dev/null)"
  row 8.8 "$( [ "$drc" = 0 ] && [ "$t" = t ] && has '"false"' && echo DONE || echo FAILED)" \
    "re-seed the cursor (forward only)" "cursor $before -> $after; equals max(seq): $t; compose: $(out_of | tr -s ' ' | cut -c1-80)"
}
