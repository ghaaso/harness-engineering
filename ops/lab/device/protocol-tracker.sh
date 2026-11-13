#!/usr/bin/env bash
# FixFlow device lab: the adb-scriptable core of the O-01 field protocol on stock Android
# (ship plan 7.5, phase L3a). Each check bears on one row of the G2 register and can come out
# either way; nothing here claims anything about the fleet's phones (standing rule 2).
#
#   bash ops/lab/device/protocol-tracker.sh [check ...]     default: probe d a c b
#
# Checks (run in the order given):
#   probe  the FGS probe itself, both outcomes: on duty (expect FGS) and clocked out (expect none)
#   a      O01-F01  kill -9 the app process while on duty, reopen it, is the sampler's FGS back
#                   within 15 s?                                         (FF_REPEAT runs, default 3)
#   b      O01-F03  location off/on with the app in the background: is the fence re-registered
#                   (dumpsys) and does a crossing still record, without opening the app?
#   c      O01-F20  on duty, start then end a job-travel leg: is the shared location service
#                   still in the foreground for the on-duty sampler afterwards?
#   d      O01-F04/F05  clocked out, cross the fence out then in with `geo fix`: presence rows,
#                   their coordinates/accuracy/confirmed, and the arrival notification
#                                                                       (FF_REPEAT runs, default 3)
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
[ "${#CHECKS[@]}" -eq 0 ] && CHECKS=(probe d a c b)

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

# ---- d: O01-F04 / F05 ---------------------------------------------------------------------
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
check_d_once() {
  local n="$1" d0 a0 n0 td ta n1 row
  mark "CHECK d#$n crossing out then in (clocked out, app in background)"
  clock out > /dev/null 2>&1
  launch_app
  sleep 3 # foreground: ensureGeofenceMonitoring re-registers the fence
  go_home
  geo_set "$FENCE_LAT" "$FENCE_LNG"
  sleep 20
  d0="$(presence_count depart)"
  a0="$(presence_count arrive)"
  n0="$(notif_count "reached the workshop")"
  geo_set "$OUT_LAT" "$OUT_LNG"
  td="$(wait_presence depart "$d0" 240)"
  mark "d#$n depart observed after ${td}s"
  geo_set "$FENCE_LAT" "$FENCE_LNG"
  ta="$(wait_presence arrive "$a0" 240)"
  sleep 10
  n1="$(notif_count "reached the workshop")"
  notif_dump | grep -B2 -A12 "pkg=$APP_PKG" > "$EV/notifications-d$n.txt"
  dump_state "$EV/state-d$n.json"
  row="$(lab_sql "select kind, lat, lng, accuracy_m, inside_geofence, distance_m, confirmed, is_mock_location from attendance_presence_event where tech_id='t2' order by server_time desc limit 2" | tr '\n' ';')"
  echo "$row" > "$EV/presence-d$n.txt"
  local obs="depart after ${td}s, arrive after ${ta}s (-1 = none within 240 s); arrival notifications $n0 -> $n1; latest rows: $row"
  if [ "$ta" = -1 ] && [ "$td" = -1 ]; then
    record "d#$n" O01-F05 "a crossing whose fix is contradicted runs past the 15 s job; recorded only after the 20 s dwell" "$obs" inconclusive "presence-d$n.txt"
    record "d#$n" O01-F04 "phone raw-point rule vs server overlap rule disagree on indoor arrivals" "no crossing recorded at all: the emulator delivered no geofence event (see README caveats)" inconclusive "presence-d$n.txt"
  else
    record "d#$n" O01-F05 "a crossing whose fix is contradicted runs past the 15 s job; recorded only after the 20 s dwell" "$obs; clean crossings take the confirmed path (no dwell), so the contradicted path was not exercised" inconclusive "presence-d$n.txt"
    record "d#$n" O01-F04 "phone raw-point rule vs server overlap rule disagree on indoor arrivals" "$obs; emulator geo-fix accuracy is not the poor indoor accuracy the claim needs" inconclusive "presence-d$n.txt"
    record "d#$n-pipeline" control "a clean out/in crossing on stock Android records a depart and an arrive row and posts the arrival prompt" "$obs" \
      "$([ "$ta" != -1 ] && [ "$td" != -1 ] && [ "$n1" -gt "$n0" ] && echo reproduced || echo not_reproduced)" "presence-d$n.txt"
  fi
  rec_roll
}
check_d() {
  local i
  for i in $(seq 1 "$REPEAT"); do
    check_d_once "$i"
    # the phone debounces an identical crossing kind for 3 min (geofence.ts DEBOUNCE_MS)
    [ "$i" -lt "$REPEAT" ] && sleep 180
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
  if ! grep -q "Geofencer State" "$1"; then echo unknown; return; fi
  if grep -q "Geofence\[CIRCLE id:workshop.*$APP_PKG" "$1"; then echo yes; else echo no; fi
}
check_b() {
  mark "CHECK b O01-F03 location toggle with the app in the background"
  clock out > /dev/null 2>&1
  launch_app
  sleep 5
  go_home
  geo_set "$FENCE_LAT" "$FENCE_LNG"
  sleep 20
  fence_dump "$EV/fence-b-before.txt"
  local r0 r1 d0 a0 td ta
  r0="$(fence_registered "$EV/fence-b-before.txt")"
  mark "b location OFF"
  ash cmd location set-location-enabled false
  sleep 15
  mark "b location ON"
  ash cmd location set-location-enabled true
  sleep 20
  fence_dump "$EV/fence-b-after.txt"
  r1="$(fence_registered "$EV/fence-b-after.txt")"
  d0="$(presence_count depart)"
  a0="$(presence_count arrive)"
  geo_set "$OUT_LAT" "$OUT_LNG"
  td="$(wait_presence depart "$d0" 240)"
  geo_set "$FENCE_LAT" "$FENCE_LNG"
  ta="$(wait_presence arrive "$a0" 240)"
  dump_state "$EV/state-b.json"
  local obs="fence in dumpsys before toggle=$r0 after=$r1; crossings after the toggle without opening the app: depart ${td}s arrive ${ta}s (-1 = none in 240 s)"
  local v=inconclusive
  if [ "$td" = -1 ] && [ "$ta" = -1 ]; then
    # only meaningful if check d showed crossings DO record on this emulator
    if grep -q '"check":"d#[0-9]*-pipeline".*"verdict":"reproduced"' "$EV/results.ndjson"; then v=reproduced; fi
  else
    v=not_reproduced
  fi
  record b O01-F03 "a location toggle removes the fence; nothing re-registers it until the app is opened" "$obs" "$v" "fence-b-after.txt"
  # recovery: opening the app re-registers (useAttendanceBackground on foreground)
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
    doze) check_doze ;;
    reboot) check_reboot ;;
    revoke) check_revoke ;;
    *) die "unknown check $c" ;;
  esac
done
snap after
mark "END tracker"
