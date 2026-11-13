#!/usr/bin/env bash
# FixFlow device lab: the adb-scriptable core of the O-01 field protocol on stock Android
# (ship plan 7.5, phase L3a). Each check bears on one row of the G2 register and can come out
# either way; nothing here claims anything about the fleet's phones (standing rule 2).
#
#   bash ops/lab/device/protocol-tracker.sh [check ...]     default: probe d f19 a c b
#
# Checks (run in the order given):
#   probe  the FGS probe itself, both outcomes: on duty (expect FGS) and clocked out (expect none)
#   a      O01-F01  kill -9 the app process while on duty, reopen it, is the sampler's FGS back
#                   within 15 s?                                         (FF_REPEAT runs, default 3)
#   b      O01-F03  location off/on with the app in the background: is the fence re-registered
#                   (dumpsys) and does a crossing still record, without opening the app?
#   c      O01-F20  on duty, start then end a job-travel leg: is the shared location service
#                   still in the foreground for the on-duty sampler afterwards?
#   d      O01-F04/F05  clocked out, headless: a clean arrival (control), then FF_REPEAT arrivals
#                   100 m out with 50 m accuracy: the phone's confirmed vs the server's
#                   inside_geofence, the handler's duration vs Expo's 15 s job, enqueue vs dwell
#   f19    O01-F19  a depart while the Activity is alive in the background: does the handler hang
#                   in requestForegroundPermissionsAsync until the app is reopened? Each run is
#                   paired with a headless control (process killed).    (FF_REPEAT runs, default 3)
#   doze   on duty, `dumpsys deviceidle force-idle` for FF_DOZE_MIN (4) minutes: pings received
#   reboot on duty, `adb reboot`, do NOT open the app for 3 min: FGS and pings; then open it
#   revoke on duty, `pm revoke ACCESS_BACKGROUND_LOCATION`: what the sampler does
#
# Needs: emu.sh start, lab-backend.sh up, the lab APK installed and signed in (app.sh). Writes
# $LAB_OUT/tracker-<stamp>/: logcat.txt, timeline.txt, services-*.txt, state-*.json,
# backend-*.txt, dumpsys excerpts, screen-*.mp4, result.json (one entry per check).
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$HERE/lib.sh"
# shellcheck source=lib-app.sh
source "$HERE/lib-app.sh"
# shellcheck source=lib-proto.sh
source "$HERE/lib-proto.sh"
load_android_env

REPEAT="${FF_REPEAT:-3}"
DOZE_MIN="${FF_DOZE_MIN:-4}"
CHECKS=("$@")
[ "${#CHECKS[@]}" -eq 0 ] && CHECKS=(probe d f19 a c b)

bash "$HERE/lab-backend.sh" status 2> /dev/null | head -n1 | grep -q "mode: backend" ||
  die "the lab backend is not answering (run lab-backend.sh up)"

proto_begin tracker
geo_set "$FENCE_LAT" "$FENCE_LNG"
sleep 5

presence_count() { # kind -> rows on the server + items still in the phone's queue
  local srv q
  srv="$(lab_sql "select count(*) from attendance_presence_event where tech_id='t2' and kind='$1'" | tail -n1)"
  q="$(kv attendance.presence.queue.v1 | node -e '
    let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
      let v = []; try { v = JSON.parse(s || "[]"); } catch {}
      console.log(v.filter((i) => i.kind === process.argv[1] && !i.done).length);
    });' "$1")"
  echo $((srv + q))
}
notif_count() { notif_dump | grep -c "$1"; }
ping_count() { lab_sql "select count(*) from attendance_ping where tech_id='t2'" | tail -n1; }

# ---- probe: the FGS probe reports both outcomes ---------------------------------------------
check_probe() {
  mark "CHECK probe: FGS probe on duty and off duty"
  clock in || {
    record probe-on "O01-F01" "probe sees the sampler FGS while on duty" "could not clock in via UI" inconclusive "timeline.txt"
    return
  }
  local on off
  on="$(wait_fgs yes 30)"
  fgs_lines > "$EV/services-probe-on.txt"
  clock out
  off="$(wait_fgs no 30)"
  fgs_lines > "$EV/services-probe-off.txt"
  record probe-on control "on duty: LocationTaskService isForeground=true" "fgs=$on" "$([ "$on" = yes ] && echo reproduced || echo not_reproduced)" "services-probe-on.txt"
  record probe-off control "clocked out: no LocationTaskService in the foreground" "fgs=$off" "$([ "$off" = no ] && echo reproduced || echo not_reproduced)" "services-probe-off.txt"
}

# ---- a: O01-F01 ---------------------------------------------------------------------------
check_a_once() { # run-no
  local n="$1" pre pid mid present post pid2
  mark "CHECK a#$n O01-F01 kill -9 on duty, reopen"
  clock in || {
    record "a#$n" O01-F01 "after a process kill and reopen, the sampler returns without its FGS" "could not clock in" inconclusive timeline.txt
    return
  }
  pre="$(wait_fgs yes 30)"
  fgs_lines > "$EV/services-a$n-pre.txt"
  if [ "$pre" != yes ]; then
    record "a#$n" O01-F01 "after a process kill and reopen, the sampler returns without its FGS" "precondition failed: no FGS on duty before the kill (fgs=$pre)" inconclusive "services-a$n-pre.txt"
    return
  fi
  go_home
  sleep 2
  pid="$(app_pid)"
  mark "a#$n kill -9 pid=$pid"
  ash kill -9 "$pid"
  sleep 15
  mid="$(fgs_up)"
  present="$(loc_svc_present)"
  { echo "pid_after_kill=$(app_pid)"; fgs_lines; } > "$EV/services-a$n-killed.txt"
  launch_app
  mark "a#$n reopened"
  sleep 15
  post="$(fgs_up)"
  pid2="$(app_pid)"
  { echo "pid_after_reopen=$pid2"; fgs_lines; } > "$EV/services-a$n-reopened.txt"
  dump_state "$EV/state-a$n-reopened.json"
  local obs="fgs before kill=$pre; 15 s after kill (app closed): service record=$present fgs=$mid; 15 s after reopen: fgs=$post (pid $pid -> $pid2)"
  if [ "$post" = no ]; then
    record "a#$n" O01-F01 "after a process kill and reopen, the sampler returns without its FGS" "$obs" reproduced "services-a$n-reopened.txt"
  else
    record "a#$n" O01-F01 "after a process kill and reopen, the sampler returns without its FGS" "$obs" not_reproduced "services-a$n-reopened.txt"
  fi
  rec_roll
}
check_a() {
  local i
  for i in $(seq 1 "$REPEAT"); do check_a_once "$i"; done
  clock out > /dev/null 2>&1
}

# ---- shared ------------------------------------------------------------------------------
wait_presence() { # kind before-count seconds -> prints elapsed or -1
  local t=0
  while [ "$t" -lt "$3" ]; do
    [ "$(presence_count "$1")" -gt "$2" ] && {
      echo "$t"
      return
    }
    sleep 5
    t=$((t + 5))
  done
  echo -1
}
GEOFENCE_JOB="Handling job with task name 'fixflow-attendance-geofence'"
GEOFENCE_DONE="Finished task 'fixflow-attendance-geofence'"
BLOCKED_PERM="Background activity launch blocked.*REQUEST_PERMISSIONS"
latest_row() { # kind -> the newest presence row of that kind, psql -A (| separated)
  lab_sql "select kind, lat, lng, accuracy_m, inside_geofence, round(distance_m::numeric, 1) as distance_m, confirmed, is_mock_location, device_time, extract(epoch from device_time)::int as device_epoch from attendance_presence_event where tech_id='t2' and kind='$1' order by server_time desc limit 1" | tail -n +2 | head -n1
}
col() { echo "$1" | cut -d'|' -f"$2"; } # 1-based column of a psql -A row
fsub() { # a b -> a - b (one decimal), "?" when either is missing
  if [ -z "${1:-}" ] || [ -z "${2:-}" ]; then echo "?"; else awk -v a="$1" -v b="$2" 'BEGIN { printf "%.1f", a - b }'; fi
}
fge() { [ "$1" != "?" ] && awk -v a="$1" -v b="$2" 'BEGIN { exit !(a >= b) }'; } # a >= b

# ---- d: O01-F04 / F05 (contradicted arrival, headless) ------------------------------------
# The F04 geometry: an arrival fix 100 m from the centre of the 80 m fence with 50 m accuracy.
# The phone's raw-point rule says outside (contradicted -> 20 s dwell -> second fix, still
# contradicted -> confirmed=false, prompt suppressed); the server's rule is predicted to say
# inside_geofence=true for the same fix. The app is killed first so the event runs headless
# (no Activity: avoids the F19 hang, which is its own check). Play services decides whether
# this fix is an ENTER at all; when it does not fire, the run is inconclusive, not passed.
P4="for one fix with r < d <= r + accuracy the phone says confirmed=false while the server stores inside_geofence=true"
P5="the contradicted path outlives Expo's 15 s job and records the crossing only after the 20 s dwell (the loss itself needs an OEM kill: not testable on stock Android)"
check_d_once() {
  local n="$1" a0 n0 M job fin t row="" n1 dur enq conf ins obs
  mark "CHECK d#$n edge arrival (100 m, acc $EDGE_ACC m), clocked out, headless"
  clock out > /dev/null 2>&1
  # the OUT fixes carry the same accuracy as the edge fix: Play services fusion keeps a recent
  # 8 m fix over a newer 50 m one, so a downgrade would never reach the geofencer (run 2)
  geo_set "$OUT_LAT" "$OUT_LNG" "$EDGE_ACC"
  launch_app
  sleep 5 # foreground: ensureGeofenceMonitoring re-registers the fence (initial EXIT)
  go_home
  wait_debounce arrive
  a0="$(presence_count arrive)"
  n0="$(notif_count "reached the workshop")"
  kill_app || mark "d#$n app process did not die"
  M="d#$n move-edge"
  mark "$M"
  geo_set "$EDGE_LAT" "$FENCE_LNG" "$EDGE_ACC"
  geo_nudge
  job="$(wait_lc "$M" "$GEOFENCE_JOB" 120)"
  t="$(wait_presence arrive "$a0" 120)"
  sleep 5
  fin="$(lc_since "$M" "$GEOFENCE_DONE" | head -n1)"
  n1="$(notif_count "reached the workshop")"
  notif_dump | grep -B2 -A12 "pkg=$APP_PKG" > "$EV/notifications-d$n.txt"
  dump_state "$EV/state-d$n.json"
  [ "$t" != -1 ] && row="$(latest_row arrive)"
  {
    echo "geofence job: $job"
    echo "finished: $fin"
    echo "row (kind|lat|lng|accuracy_m|inside_geofence|distance_m|confirmed|mock|device_time|epoch): $row"
  } > "$EV/presence-d$n.txt"
  dur="$(fsub "$(lc_epoch "$fin")" "$(lc_epoch "$job")")"
  enq="$(fsub "$(col "$row" 10)" "$(lc_epoch "$job")")"
  conf="$(col "$row" 7)"
  ins="$(col "$row" 5)"
  obs="ENTER delivered: $([ -n "$job" ] && echo yes || echo 'no (120 s)'); arrive row after ${t}s (-1 = none in 120 s): confirmed=$conf inside_geofence=$ins distance_m=$(col "$row" 6) accuracy_m=$(col "$row" 4) mock=$(col "$row" 8); handler ran ${dur}s (job start to Finished task); row device_time ${enq}s after the job started; arrival notifications $n0 -> $n1"
  if [ -z "$job" ] || [ -z "$row" ]; then
    record "d#$n" O01-F04 "$P4" "$obs" inconclusive "presence-d$n.txt"
    record "d#$n" O01-F05 "$P5" "$obs" inconclusive "presence-d$n.txt"
  else
    record "d#$n" O01-F04 "$P4" "$obs" "$([ "$conf" = f ] && [ "$ins" = t ] && echo reproduced || echo not_reproduced)" "presence-d$n.txt"
    if [ "$conf" != f ]; then
      record "d#$n" O01-F05 "$P5" "$obs; the fix was not contradicted, so the dwell path did not run" inconclusive "presence-d$n.txt"
    else
      record "d#$n" O01-F05 "$P5" "$obs" "$(fge "$dur" 15.001 && fge "$enq" 20 && echo reproduced || echo not_reproduced)" "presence-d$n.txt"
    fi
  fi
  rec_roll
}
# The pipeline control: a clean arrival at the centre (acc 8 m), headless, must record a
# confirmed row and post the arrival prompt. If this fails, the d/b/f19 verdicts mean nothing.
check_d_control() {
  local a0 n0 M job t row="" n1
  mark "CHECK d-control clean arrival, clocked out, headless"
  clock out > /dev/null 2>&1
  geo_set "$OUT_LAT" "$OUT_LNG"
  launch_app
  sleep 5
  go_home
  wait_debounce arrive
  a0="$(presence_count arrive)"
  n0="$(notif_count "reached the workshop")"
  kill_app || mark "d-control app process did not die"
  M="d-control move-in"
  mark "$M"
  geo_set "$FENCE_LAT" "$FENCE_LNG"
  geo_nudge
  job="$(wait_lc "$M" "$GEOFENCE_JOB" 120)"
  t="$(wait_presence arrive "$a0" 120)"
  sleep 8
  n1="$(notif_count "reached the workshop")"
  [ "$t" != -1 ] && row="$(latest_row arrive)"
  {
    echo "geofence job: $job"
    echo "row: $row"
  } > "$EV/presence-dctl.txt"
  record d-control control "a clean headless arrival records a confirmed arrive row and posts the arrival prompt" \
    "ENTER delivered: $([ -n "$job" ] && echo yes || echo no); row after ${t}s: ${row:-none}; arrival notifications $n0 -> $n1" \
    "$([ "$t" != -1 ] && [ "$(col "$row" 7)" = t ] && [ "$n1" -gt "$n0" ] && echo reproduced || echo not_reproduced)" presence-dctl.txt
}
check_d() {
  local i
  check_d_control
  for i in $(seq 1 "$REPEAT"); do check_d_once "$i"; done
  geo_set "$FENCE_LAT" "$FENCE_LNG"
}

# ---- f19: O01-F19 (a crossing while the Activity is alive in the background) --------------
# geofence.ts -> getLocation() -> requestForegroundPermissionsAsync(). With the main Activity
# alive but stopped (HOME pressed, process cached), Expo hands the request to that Activity;
# Android 14 blocks the background launch of GrantPermissionsActivity, so the request never
# answers and the handler waits before recordCrossing, even with every location permission
# granted. Predicted: no row until the app is next opened. Control (f19-headless): the same
# kind of crossing with the process killed (no Activity) records without opening the app.
P19="with the Activity alive in the background the geofence handler hangs in requestForegroundPermissionsAsync; no row until the app is opened"
check_f19_once() {
  local n="$1" d0 M job t blk tr rows row late obs
  mark "CHECK f19#$n depart with the Activity alive in the background"
  clock out > /dev/null 2>&1
  geo_set "$FENCE_LAT" "$FENCE_LNG"
  launch_app
  sleep 5
  go_home
  sleep 3
  wait_debounce depart
  d0="$(presence_count depart)"
  M="f19#$n move-out"
  mark "$M (app pid $(app_pid), Activity stopped in the background)"
  geo_set "$OUT_LAT" "$OUT_LNG"
  geo_nudge
  job="$(wait_lc "$M" "$GEOFENCE_JOB" 120)"
  if [ -z "$job" ]; then
    record "f19#$n" O01-F19 "$P19" "Play services delivered no EXIT within 120 s" inconclusive timeline.txt
    return
  fi
  t="$(wait_presence depart "$d0" 90)"
  blk="$(lc_since "$M" "$BLOCKED_PERM" | head -n1 | cut -c1-220)"
  dump_state "$EV/state-f19-$n-stuck.json"
  mark "f19#$n reopen"
  launch_app
  tr="$(wait_presence depart "$d0" 60)"
  sleep 10
  rows=$(($(presence_count depart) - d0))
  row="$(latest_row depart)"
  late="$(fsub "$(col "$row" 10)" "$(lc_epoch "$job")")"
  {
    echo "geofence job: $job"
    echo "blocked: $blk"
    echo "newest depart row: $row"
    lc_since "$M" "TaskService|$BLOCKED_PERM|GrantPermissionsActivity|FFLAB"
  } > "$EV/f19-$n.txt"
  obs="EXIT delivered; depart row within 90 s with the app in the background: $([ "$t" = -1 ] && echo none || echo "after ${t}s"); blocked GrantPermissionsActivity launch: $([ -n "$blk" ] && echo yes || echo no); after reopening: a row after ${tr}s (-1 = none in 60 s), depart rows added $rows, newest device_time ${late}s after the EXIT job started"
  record "f19#$n" O01-F19 "$P19" "$obs" "$([ "$t" = -1 ] && echo reproduced || echo not_reproduced)" "f19-$n.txt"
  rec_roll
}
check_f19_headless_once() {
  local n="$1" a0 M job t blk
  mark "CHECK f19-headless#$n arrive with the process dead"
  go_home
  wait_debounce arrive
  a0="$(presence_count arrive)"
  kill_app || mark "f19-headless#$n app process did not die"
  M="f19h#$n move-in"
  mark "$M"
  geo_set "$FENCE_LAT" "$FENCE_LNG"
  geo_nudge
  job="$(wait_lc "$M" "$GEOFENCE_JOB" 120)"
  t="$(wait_presence arrive "$a0" 90)"
  blk="$(lc_since "$M" "$BLOCKED_PERM" | head -n1 | cut -c1-220)"
  {
    echo "geofence job: $job"
    echo "blocked: $blk"
    echo "newest arrive row: $(latest_row arrive)"
  } > "$EV/f19h-$n.txt"
  if [ -z "$job" ]; then
    record "f19-headless#$n" control "process dead: a crossing records without opening the app" "Play services delivered no ENTER within 120 s" inconclusive "f19h-$n.txt"
  else
    record "f19-headless#$n" control "process dead: a crossing records without opening the app" \
      "ENTER delivered; arrive row after ${t}s (-1 = none in 90 s); blocked permission launch: $([ -n "$blk" ] && echo yes || echo no)" \
      "$([ "$t" != -1 ] && echo reproduced || echo not_reproduced)" "f19h-$n.txt"
  fi
}
check_f19() {
  local i
  for i in $(seq 1 "$REPEAT"); do
    check_f19_once "$i"
    check_f19_headless_once "$i"
  done
}

# ---- b: O01-F03 ---------------------------------------------------------------------------
# Play services' own dump lists every registered fence under "Geofencer State", e.g.
#   Geofence[CIRCLE id:workshop transitions:3 24.900000, 67.100000 80m, ...] ... com.fixflow.technician
fence_dump() { # file
  ash dumpsys activity service com.google.android.gms/com.google.android.location.internal.GoogleLocationManagerService |
    sed -n "/Geofencer State:/,/Dump of hardware geofencing/p" > "$1"
}
fence_registered() { # file -> yes|no|unknown
  if ! grep -q "Geofencer State" "$1"; then
    echo unknown
    return
  fi
  if grep -q "Geofence\[CIRCLE id:workshop.*$APP_PKG" "$1"; then echo yes; else echo no; fi
}
check_b() {
  local r0 r1 d0 M job td obs v=inconclusive
  mark "CHECK b O01-F03 location toggle with the app not open"
  clock out > /dev/null 2>&1
  geo_set "$FENCE_LAT" "$FENCE_LNG"
  launch_app
  sleep 5
  go_home
  sleep 10
  fence_dump "$EV/fence-b-before.txt"
  r0="$(fence_registered "$EV/fence-b-before.txt")"
  # headless from here: a stopped Activity would hang the handler (f19), which is not this check
  kill_app || mark "b app process did not die"
  mark "b location OFF"
  ash cmd location set-location-enabled false
  sleep 15
  mark "b location ON"
  ash cmd location set-location-enabled true
  sleep 20
  fence_dump "$EV/fence-b-after.txt"
  r1="$(fence_registered "$EV/fence-b-after.txt")"
  wait_debounce depart
  d0="$(presence_count depart)"
  M="b move-out"
  mark "$M"
  geo_set "$OUT_LAT" "$OUT_LNG"
  geo_nudge
  job="$(wait_lc "$M" "$GEOFENCE_JOB" 120)"
  td="$(wait_presence depart "$d0" 60)"
  dump_state "$EV/state-b.json"
  obs="fence in Play services before the toggle=$r0, after=$r1; a depart after the toggle without opening the app: EXIT delivered=$([ -n "$job" ] && echo yes || echo no), row after ${td}s (-1 = none)"
  if [ "$r0" != yes ]; then
    obs="$obs; precondition failed (no fence before the toggle)"
  elif [ "$r1" = no ] && [ -z "$job" ]; then
    v=reproduced
  elif [ "$r1" = yes ] && [ -n "$job" ]; then
    v=not_reproduced
  fi
  record b O01-F03 "a location toggle removes the fence; nothing re-registers it until the app is opened" "$obs" "$v" "fence-b-after.txt"
  launch_app
  sleep 8
  fence_dump "$EV/fence-b-reopened.txt"
  mark "b app reopened: fence in dumpsys=$(fence_registered "$EV/fence-b-reopened.txt")"
  rec_roll
}

# ---- c: O01-F20 ---------------------------------------------------------------------------
open_lab_job() {
  to_dashboard || return 1
  tap_text "Jobs" || return 1
  sleep 2
  local c
  for c in "On-Going Tasks" "Available Tasks"; do
    if ui_has "$c"; then
      tap_text "$c"
      if wait_text "LAB customer" 15; then
        tap_text "LAB customer"
        wait_text "Add a note…" 20 && return 0
      fi
      ash input keyevent KEYCODE_BACK
      sleep 2
    fi
  done
  return 1
}
check_c() {
  mark "CHECK c O01-F20 travel leg start/stop while on duty"
  geo_set "$FENCE_LAT" "$FENCE_LNG"
  clock in || {
    record c O01-F20 "ending a travel leg strips the on-duty sampler's FGS" "could not clock in" inconclusive timeline.txt
    return
  }
  local pre during post p0 p1
  pre="$(wait_fgs yes 30)"
  fgs_lines > "$EV/services-c-pre.txt"
  open_lab_job || {
    record c O01-F20 "ending a travel leg strips the on-duty sampler's FGS" "could not open the lab job by UI (see ui.xml)" inconclusive "timeline.txt"
    cp "$UI_XML" "$EV/ui-c-fail.xml" 2> /dev/null
    return
  }
  tap_text "🚀 START TRAVEL" || tap_text "START TRAVEL" "~" || {
    record c O01-F20 "ending a travel leg strips the on-duty sampler's FGS" "no START TRAVEL button on the job" inconclusive timeline.txt
    cp "$UI_XML" "$EV/ui-c-fail.xml"
    return
  }
  sleep 3
  tap_text "START TRAVEL" "~" || true # the Travel screen's own start button
  sleep 10
  during="$(fgs_up)"
  fgs_lines > "$EV/services-c-during.txt"
  dump_state "$EV/state-c-during.json"
  geo_set "$JOB_LAT" "$JOB_LNG"
  sleep 15
  tap_text "I HAVE ARRIVED" || {
    record c O01-F20 "ending a travel leg strips the on-duty sampler's FGS" "no I HAVE ARRIVED button" inconclusive timeline.txt
    cp "$UI_XML" "$EV/ui-c-fail.xml"
    return
  }
  wait_text "OK" 30 && tap_text "OK"
  sleep 10
  post="$(fgs_up)"
  fgs_lines > "$EV/services-c-post.txt"
  dump_state "$EV/state-c-post.json"
  p0="$(ping_count)"
  sleep 150
  p1="$(ping_count)"
  local obs="FGS on duty before travel=$pre, during the leg=$during, 10 s after arrival=$post (still on duty); pings received in the 150 s after arrival: $((p1 - p0))"
  if [ "$pre" != yes ]; then
    record c O01-F20 "ending a travel leg strips the on-duty sampler's FGS" "$obs" inconclusive "services-c-pre.txt"
  elif [ "$post" = no ]; then
    record c O01-F20 "ending a travel leg strips the on-duty sampler's FGS" "$obs" reproduced "services-c-post.txt"
  else
    record c O01-F20 "ending a travel leg strips the on-duty sampler's FGS" "$obs" not_reproduced "services-c-post.txt"
  fi
  geo_set "$FENCE_LAT" "$FENCE_LNG"
  clock out > /dev/null 2>&1
  rec_roll
}

# ---- doze / reboot / revoke ---------------------------------------------------------------
check_doze() {
  mark "CHECK doze on duty, force-idle ${DOZE_MIN} min"
  clock in || return
  wait_fgs yes 30 > /dev/null
  go_home
  local p0 p1
  sleep 70
  p0="$(ping_count)"
  ash dumpsys battery unplug
  ash dumpsys deviceidle force-idle | tee "$EV/doze.txt" > /dev/null
  sleep $((DOZE_MIN * 60))
  ash dumpsys deviceidle get deep >> "$EV/doze.txt"
  p1="$(ping_count)"
  ash dumpsys deviceidle unforce > /dev/null
  ash dumpsys battery reset
  record doze "O01 (doze; no register row)" "stock doze throttles the on-duty sampler" \
    "pings received during ${DOZE_MIN} min of forced deep idle at a 1-min interval: $((p1 - p0)) (pings sync on the next fix, so a delayed batch can land after unforce)" \
    "$([ $((p1 - p0)) -lt $((DOZE_MIN / 2)) ] && echo reproduced || echo not_reproduced)" doze.txt
  clock out > /dev/null 2>&1
}
check_reboot() {
  mark "CHECK reboot on duty"
  clock in || return
  wait_fgs yes 30 > /dev/null
  adb_ reboot
  adb_ wait-for-device
  until [ "$(ash getprop sys.boot_completed)" = 1 ]; do sleep 3; done
  adb_ root > /dev/null 2>&1
  sleep 3
  adb_ wait-for-device
  local p0 p1 f1 f2
  p0="$(ping_count)"
  sleep 180
  f1="$(fgs_up)"
  p1="$(ping_count)"
  fgs_lines > "$EV/services-reboot-closed.txt"
  launch_app
  sleep 20
  f2="$(fgs_up)"
  fgs_lines > "$EV/services-reboot-opened.txt"
  record reboot O01-F01 "after a reboot the sampler returns without its FGS (and isRunning() never repairs it)" \
    "3 min after boot, app not opened: fgs=$f1, pings received=$((p1 - p0)); 20 s after opening the app: fgs=$f2" \
    "$([ "$f2" = no ] && echo reproduced || echo not_reproduced)" services-reboot-opened.txt
  clock out > /dev/null 2>&1
}
check_revoke() {
  mark "CHECK revoke background location on duty"
  clock in || return
  wait_fgs yes 30 > /dev/null
  go_home
  ash pm revoke "$APP_PKG" android.permission.ACCESS_BACKGROUND_LOCATION
  sleep 20
  local f p
  f="$(fgs_up)"
  p="$(app_pid)"
  fgs_lines > "$EV/services-revoke.txt"
  launch_app
  sleep 10
  dump_state "$EV/state-revoke.json"
  ui_dump && cp "$UI_XML" "$EV/ui-revoke.xml"
  record revoke O01-F06 "background location is never re-requested after onboarding" \
    "20 s after revoking background location on duty: process=${p:-dead} fgs=$f; the reopened screen is in ui-revoke.xml (does it ask again?)" \
    inconclusive ui-revoke.xml
  ash pm grant "$APP_PKG" android.permission.ACCESS_BACKGROUND_LOCATION
  clock out > /dev/null 2>&1
}

snap before
for c in "${CHECKS[@]}"; do
  case "$c" in
    probe) check_probe ;;
    a) check_a ;;
    b) check_b ;;
    c) check_c ;;
    d) check_d ;;
    f19) check_f19 ;;
    doze) check_doze ;;
    reboot) check_reboot ;;
    revoke) check_revoke ;;
    *) die "unknown check $c" ;;
  esac
done
snap after
mark "END tracker"
