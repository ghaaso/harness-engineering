#!/usr/bin/env bash
# FixFlow device lab: the outage matrix on stock Android (ship plan 7.5, phase L3a).
#
#   bash ops/lab/device/protocol-offline.sh [phase ...]   default: control edge404 revival
#
# The APK bakes one API host (http://10.0.2.2:<port>); lab-backend.sh swaps what listens there.
# Four writes are made in each phase and each one's fate is read from the app's own storage
# (AsyncStorage, no screen scraping) and the backend's rows:
#   punch     a clock-in (and, in edge404, a clock-out)  attendance.queue.v1
#   crossing  a geofence depart, driven by geo fix         attendance.presence.queue.v1
#   pings     on-duty ping batches (1-min lab interval)    attendance.pings.queue.v1
#   job write a note on the lab job (sendOrQueue)         jobs.outbox.v2
#
# Phases:
#   control  the live lab backend: every write must LAND (proves each check can say "landed")
#   edge404  the stub answering like the dead production host (404, x-railway-fallback, no
#            X-FixFlow-Api): queued / parked / dropped / refused / landed, per write, against
#            CLAUDE.md's contract and O-03's "what the fleet experienced" (O3-F1 and the
#            queue-by-queue lines)
#   revival  the backend back on the same port: do the parked rows drain (O10-F2)? does a new,
#            landed clock-in keep the sampler running past the parked clock-out (O3-F2)?
#   5xx      the stub answering 503: does a transient server error count toward the poison
#            cap and park a real write (O3-F6)? (optional)
#   airplane a job write in airplane mode, then reconnect to edge404 (O-03 line 1) (optional)
#
# Needs: emu.sh start, lab-backend.sh up, the lab APK installed and signed in. Starts with the
# tech clocked out and every queue empty (it checks, and says so in result.json if not).
# Evidence: $LAB_OUT/offline-<stamp>/ as in protocol-tracker.sh plus stub-*.log (every request
# the stub saw). The backend is always put back to `up` on exit.
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$HERE/lib.sh"
# shellcheck source=lib-app.sh
source "$HERE/lib-app.sh"
# shellcheck source=lib-proto.sh
source "$HERE/lib-proto.sh"
load_android_env

PHASES=("$@")
[ "${#PHASES[@]}" -eq 0 ] && PHASES=(control edge404 revival)
PROTO_RESTORE_BACKEND=1
STAMP_NOTE="$(date +%H%M%S)"

proto_begin offline
geo_set "$FENCE_LAT" "$FENCE_LNG"

srv_count() { lab_sql "$1" 2> /dev/null | tail -n1; }
punches_srv() { srv_count "select count(*) from attendance_event where tech_id='t2'"; }
presence_srv() { srv_count "select count(*) from attendance_presence_event where tech_id='t2'"; }
pings_srv() { srv_count "select count(*) from attendance_ping where tech_id='t2'"; }
note_srv() { srv_count "select count(*) from job_event where kind='note' and text like '%$1%'"; }
stub_hits() { docker logs "$C_STUB" 2>&1 | grep -c " $1"; } # path fragment
db_up() { docker inspect -f '{{.State.Running}}' "$C_DB" 2> /dev/null | grep -q true; }

tap_clock_button() { # in|out ; taps without requiring the screen to change state
  open_clock || return 1
  if [ "$1" = in ]; then tap_text "Clock In"; else tap_text "Clock Out"; fi
}

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

add_note() { # text -> prints the UI's reaction (info/error line)
  open_lab_job || {
    echo "could-not-open-job"
    return 1
  }
  tap_text "Add a note…" || return 1
  ash input text "$(echo "$1" | sed 's/ /%s/g')"
  ash input keyevent KEYCODE_BACK > /dev/null 2>&1
  sleep 1
  tap_text "Add note" || return 1
  sleep 8
  ui_dump
  cp "$UI_XML" "$EV/ui-note-$1.xml"
  if ui_has "Couldn't add the note" "~"; then echo "error: Couldn't add the note"; elif ui_has "offline" "~"; then echo "info: saved offline"; else echo "no message"; fi
}

clean_start_ok() {
  local s
  s="$(qsummary attendance.queue.v1) / $(qsummary attendance.presence.queue.v1) / $(qsummary jobs.outbox.v2)"
  echo "$s" > "$EV/start-queues.txt"
  echo "$s" | grep -q "parked=[1-9]\|queued=[1-9]" && return 1
  return 0
}

# ---- control ---------------------------------------------------------------------------------
phase_control() {
  mark "PHASE control (live lab backend)"
  bash "$LAB_DIR/lab-backend.sh" up > /dev/null || die "backend up failed"
  clean_start_ok || record control-start "precondition" "queues empty at start" "$(cat "$EV/start-queues.txt")" inconclusive start-queues.txt
  snap control-before
  local p0 c0 g0 n
  p0="$(punches_srv)"
  c0="$(presence_srv)"
  g0="$(pings_srv)"
  # punch
  clock in
  sleep 20
  record control-punch control "a clock-in against the live backend lands" \
    "server punches $p0 -> $(punches_srv); queue: $(qsummary attendance.queue.v1)" \
    "$([ "$(punches_srv)" -gt "$p0" ] && echo reproduced || echo not_reproduced)" state-control-after.json
  # pings (on duty; 1-min interval)
  sleep 150
  record control-pings control "on-duty pings land" "server pings $g0 -> $(pings_srv) in ~170 s; queue: $(qsummary attendance.pings.queue.v1)" \
    "$([ "$(pings_srv)" -gt "$g0" ] && echo reproduced || echo not_reproduced)" backend-control-after.txt
  # crossing
  # in the FOREGROUND: with the Activity stopped in the background the geofence handler hangs
  # (O01-F19, protocol-tracker.sh f19); this phase tests the queue contract, not delivery
  launch_app
  wait_debounce depart
  geo_set "$OUT_LAT" "$OUT_LNG"
  geo_nudge
  local t=0
  while [ "$t" -lt 240 ] && [ "$(presence_srv)" -le "$c0" ]; do
    sleep 10
    t=$((t + 10))
  done
  record control-crossing control "a geofence depart lands" "server presence $c0 -> $(presence_srv) after ${t}s; queue: $(qsummary attendance.presence.queue.v1)" \
    "$([ "$(presence_srv)" -gt "$c0" ] && echo reproduced || echo not_reproduced)" backend-control-after.txt
  geo_set "$FENCE_LAT" "$FENCE_LNG"
  # job write
  n="LABctl$STAMP_NOTE"
  local ui
  ui="$(add_note "$n")"
  record control-note control "a job note tapped online lands" "server notes with '$n': $(note_srv "$n"); UI: $ui; outbox: $(qsummary jobs.outbox.v2)" \
    "$([ "$(note_srv "$n")" -ge 1 ] && echo reproduced || echo not_reproduced)" "ui-note-$n.xml"
  clock out
  sleep 10
  snap control-after
  rec_roll
}

# ---- edge404 ---------------------------------------------------------------------------------
phase_edge404() {
  mark "PHASE edge404 (stub answers like the dead host)"
  # wait out the presence debounce (3 min per kind) from the control phase's crossing
  [ "${DID_CONTROL:-0}" = 1 ] && sleep 120
  bash "$LAB_DIR/lab-backend.sh" edge404 > /dev/null || die "stub failed"
  snap edge-before
  local fg ui n p_hits g_hits
  # punch: clock in
  tap_clock_button in
  sleep 25
  ui_dump && cp "$UI_XML" "$EV/ui-edge-clock.xml"
  fg="$(fgs_up)"
  record edge-punch-in "O-03 (2) / CLAUDE.md outbox contract" \
    "kept but parked at capture ('rejected (404)'); the screen says not clocked in while the sampler runs on the parked clock_in" \
    "queue: $(qsummary attendance.queue.v1 clock_in); screen: $(ui_has 'DID NOT SYNC' '~' && echo 'DID NOT SYNC shown' || echo 'no DID NOT SYNC'), $(ui_has 'Not clocked in' && echo 'Not clocked in' || echo 'On duty'); sampler FGS=$fg; stub saw $(stub_hits /api/attendance/punches) punch POSTs" \
    "$(qsummary attendance.queue.v1 clock_in | grep -q 'parked=1' && echo reproduced || echo not_reproduced)" ui-edge-clock.xml
  # pings
  local g_before
  g_before="$(stub_hits /api/attendance/pings)"
  sleep 150
  g_hits=$(($(stub_hits /api/attendance/pings) - g_before))
  record edge-pings "O-03 (4)" "pings are dropped: every batch marked done on the 404" \
    "ping batches POSTed to the stub in 150 s: $g_hits; ping queue now: $(qsummary attendance.pings.queue.v1)" \
    "$([ "$g_hits" -ge 1 ] && qsummary attendance.pings.queue.v1 | grep -q 'total=0' && echo reproduced || echo inconclusive)" logcat.txt
  # crossing
  # in the FOREGROUND: with the Activity stopped in the background the geofence handler hangs
  # (O01-F19, protocol-tracker.sh f19); this phase tests the queue contract, not delivery
  launch_app
  wait_debounce depart
  geo_set "$OUT_LAT" "$OUT_LNG"
  geo_nudge
  local t=0
  while [ "$t" -lt 240 ] && ! qsummary attendance.presence.queue.v1 depart | grep -q 'total=[1-9]'; do
    sleep 10
    t=$((t + 10))
  done
  sleep 10
  record edge-crossing "O-03 (3)" "presence kept but parked at capture ('rejected (404)')" \
    "after ${t}s: queue: $(qsummary attendance.presence.queue.v1 depart); stub saw $(stub_hits /api/attendance/presence) presence POSTs" \
    "$(qsummary attendance.presence.queue.v1 depart | grep -q 'parked=[1-9]' && echo reproduced || { qsummary attendance.presence.queue.v1 depart | grep -q 'total=0' && echo inconclusive || echo not_reproduced; })" state-edge-after.json
  geo_set "$FENCE_LAT" "$FENCE_LNG"
  # job write
  n="LABedge$STAMP_NOTE"
  ui="$(add_note "$n")"
  record edge-note O3-F1 "an online job write against the dead edge is refused at tap time and never queued" \
    "UI: $ui; outbox: $(qsummary jobs.outbox.v2); stub saw $(stub_hits /notes) note POSTs" \
    "$(qsummary jobs.outbox.v2 | grep -q 'total=0' && echo "$ui" | grep -q error && echo reproduced || echo not_reproduced)" "ui-note-$n.xml"
  # punch: clock out (needed for O3-F2 after revival)
  tap_clock_button out
  sleep 20
  record edge-punch-out "O-03 (2)" "a clock-out against the dead edge is parked too" \
    "queue: $(qsummary attendance.queue.v1 clock_out)" \
    "$(qsummary attendance.queue.v1 clock_out | grep -q 'parked=1' && echo reproduced || echo not_reproduced)" state-edge-after.json
  docker logs "$C_STUB" > "$EV/stub-edge404.log" 2>&1
  snap edge-after
  rec_roll
}

# ---- revival ---------------------------------------------------------------------------------
phase_revival() {
  mark "PHASE revival (backend back on the same port)"
  bash "$LAB_DIR/lab-backend.sh" up > /dev/null || die "backend up failed"
  local p0 g0 fg
  p0="$(punches_srv)"
  launch_app
  open_clock
  sleep 60
  snap revival-1
  record revival-parked O10-F2 "rows parked during the outage stay parked after revival; recovery is per-row Retry only" \
    "60 s after revival with the app open: punches $(qsummary attendance.queue.v1); presence $(qsummary attendance.presence.queue.v1); server punches $p0 -> $(punches_srv)" \
    "$(qsummary attendance.queue.v1 | grep -q 'parked=[1-9]' && echo reproduced || echo not_reproduced)" state-revival-1.json
  # O3-F2: a new, landed clock-in; the parked clock_out is still the latest queue item by device_time?
  # No: the new clock_in is newer, but it is pruned once it lands, leaving the parked clock_out as
  # the latest item dutyStatus sees.
  tap_clock_button in
  sleep 20
  g0="$(pings_srv)"
  sleep 150
  fg="$(fgs_up)"
  fgs_lines > "$EV/services-revival.txt"
  snap revival-2
  # the sampler's FGS is the signal (the lab's sampler barely receives fixes, so a ping count is
  # not evidence); the verdict needs the new clock-in to have LANDED, else it says nothing
  local p1 v
  p1="$(punches_srv)"
  if [ "$p1" -le "$((p0))" ]; then
    v=inconclusive
  elif [ "$fg" = no ]; then
    v=reproduced
  else
    v=not_reproduced
  fi
  record revival-duty O3-F2 "after any landed clock-in, the parked clock-out makes dutyStatus stop the on-duty sampler" \
    "new clock-in: server punches $p0 -> $p1; queue: $(qsummary attendance.queue.v1); sampler FGS 170 s later=$fg; pings landed meanwhile: $(($(pings_srv) - g0)) (not evidence)" \
    "$v" services-revival.txt
  tap_clock_button out
  sleep 10
  rec_roll
}

# ---- 5xx -------------------------------------------------------------------------------------
phase_5xx() {
  mark "PHASE 5xx (stub answers 503)"
  bash "$LAB_DIR/lab-backend.sh" 5xx > /dev/null || die "stub failed"
  tap_clock_button in
  local i
  for i in 1 2 3 4 5 6 7; do # each foreground is a sync trigger (useAttendance AppState)
    sleep 8
    go_home
    sleep 3
    launch_app
    mark "5xx foreground $i: $(qsummary attendance.queue.v1 clock_in)"
  done
  sleep 10
  docker logs "$C_STUB" > "$EV/stub-5xx.log" 2>&1
  snap 5xx
  record 5xx-punch O3-F6 "transient 5xx counts toward the poison cap (5) and parks a real write" \
    "after 7 foregrounds against 503: $(qsummary attendance.queue.v1 clock_in); stub saw $(grep -c '/api/attendance/punches' "$EV/stub-5xx.log") punch POSTs" \
    "$(qsummary attendance.queue.v1 clock_in | grep -q 'parked=[1-9].*gave up' && echo reproduced || echo inconclusive)" stub-5xx.log
  bash "$LAB_DIR/lab-backend.sh" up > /dev/null
  rec_roll
}

# ---- airplane --------------------------------------------------------------------------------
phase_airplane() {
  mark "PHASE airplane (job write offline, reconnect to edge404)"
  bash "$LAB_DIR/lab-backend.sh" edge404 > /dev/null || die "stub failed"
  open_lab_job
  ash cmd connectivity airplane-mode enable
  sleep 5
  local n="LABair$STAMP_NOTE" ui
  ui="$(add_note "$n")"
  local q1
  q1="$(qsummary jobs.outbox.v2)"
  ash cmd connectivity airplane-mode disable
  sleep 45
  launch_app
  sleep 15
  snap airplane
  record airplane-note "O-03 (1)" "a job write in airplane mode is queued, then parked on reconnect to the dead edge" \
    "offline: UI '$ui', outbox $q1; 60 s after reconnect: outbox $(qsummary jobs.outbox.v2)" \
    "$(qsummary jobs.outbox.v2 | grep -q 'parked=[1-9]' && echo reproduced || echo not_reproduced)" state-airplane.json
  bash "$LAB_DIR/lab-backend.sh" up > /dev/null
  rec_roll
}

for p in "${PHASES[@]}"; do
  case "$p" in
    control)
      phase_control
      DID_CONTROL=1
      ;;
    edge404) phase_edge404 ;;
    revival) phase_revival ;;
    5xx) phase_5xx ;;
    airplane) phase_airplane ;;
    *) die "unknown phase $p" ;;
  esac
done
mark "END offline"
