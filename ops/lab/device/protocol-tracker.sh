#!/usr/bin/env bash
# FixFlow device lab: the adb-scriptable core of the O-01 field protocol on stock Android
# (ship plan 7.5, phase L3a). Each check bears on one row of the G2 register and can come out
# either way; nothing here claims anything about the fleet's phones (standing rule 2).
#
#   bash ops/lab/device/protocol-tracker.sh [check ...]     default: probe d f19 f14 a c b
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
#   f14    O01-F14  kill, a headless depart, open the app the moment its job starts: does the next
#                   crossing's job ever finish? Paired with a control that opens the app 10 s
#                   after the headless job finished.                    (FF_REPEAT runs, default 3)
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
PROBE_RESTORED_OK=0 # set by check_probe once the FGS probe said "no" on a restored process
DOZE_MIN="${FF_DOZE_MIN:-4}"
CHECKS=("$@")
[ "${#CHECKS[@]}" -eq 0 ] && CHECKS=(probe d f19 f14 a c b)

bash "$HERE/lab-backend.sh" status 2> /dev/null | head -n1 | grep -q "mode: backend" ||
  die "the lab backend is not answering (run lab-backend.sh up)"

proto_begin tracker
geo_set "$FENCE_LAT" "$FENCE_LNG"
sleep 5

presence_count() { # kind -> rows on the server + items still in the phone's queue
  local srv q
  srv="$(lab_sql "select count(*) from attendance_presence_event where tech_id='$LAB_TECH_ID' and kind='$1'" | tail -n1)"
  q="$(kv attendance.presence.queue.v1 | node -e '
    let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
      let v = []; try { v = JSON.parse(s || "[]"); } catch {}
      console.log(v.filter((i) => i.kind === process.argv[1] && !i.done).length);
    });' "$1")"
  echo $((srv + q))
}
notif_count() { notif_dump | grep -c "$1"; }
ping_count() { lab_sql "select count(*) from attendance_ping where tech_id='$LAB_TECH_ID'" | tail -n1; }

# ---- probe: the FGS probe reports both outcomes ---------------------------------------------
# probe-on (on duty: yes), probe-restored (the measured negative the binding review asked for: a
# process the system restored in the background after kill -9, which logs that the foreground
# task cannot be started: no), probe-off (clocked out: no). check a relies on the second.
FGS_BG_REFUSED="Foreground location task cannot be started while the app is in the background"
check_probe() {
  mark "CHECK probe: FGS probe on duty, on a restored process, off duty"
  clock in || {
    record probe-on control "probe sees the sampler FGS while on duty" "could not clock in via UI" inconclusive "timeline.txt"
    return
  }
  local on rs off pid M line
  on="$(wait_fgs yes 30)"
  fgs_lines > "$EV/services-probe-on.txt"
  record probe-on control "on duty: LocationTaskService in the foreground (live record + its notification)" "fgs=$on" "$([ "$on" = yes ] && echo reproduced || echo not_reproduced)" "services-probe-on.txt"
  go_home
  sleep 2
  pid="$(app_pid)"
  M="probe kill -9 pid=$pid"
  mark "$M"
  ash kill -9 "$pid"
  line="$(wait_lc "$M" "$FGS_BG_REFUSED" 90)"
  sleep 3
  rs="$(fgs_up)"
  { echo "pid_now=$(app_pid) (killed $pid); record half alone (the old probe): $(fgs_record_up)"; echo "logcat: $line"; fgs_lines; } > "$EV/services-probe-restored.txt"
  if [ -z "$line" ]; then
    record probe-restored control "a process restored in the background after kill -9 (logs '$FGS_BG_REFUSED'): fgs=no" \
      "precondition failed: no restored process logged the refusal within 90 s (pid now: $(app_pid))" inconclusive "services-probe-restored.txt"
  else
    record probe-restored control "a process restored in the background after kill -9 (logs '$FGS_BG_REFUSED'): fgs=no" \
      "fgs=$rs (the record half alone says $(fgs_record_up)); $line" "$([ "$rs" = no ] && echo reproduced || echo not_reproduced)" "services-probe-restored.txt"
  fi
  [ -n "$line" ] && [ "$rs" = no ] && PROBE_RESTORED_OK=1
  launch_app
  sleep 8
  clock out
  off="$(wait_fgs no 30)"
  fgs_lines > "$EV/services-probe-off.txt"
  record probe-off control "clocked out: no LocationTaskService in the foreground" "fgs=$off" "$([ "$off" = no ] && echo reproduced || echo not_reproduced)" "services-probe-off.txt"
}

# ---- a: O01-F01 ---------------------------------------------------------------------------
# On duty, kill -9 with the app in the background, let the system restore the process, reopen.
# The register predicts the sampler comes back without its FGS: expo-location starts the
# foreground service only from LocationTaskConsumer's start path, which refuses in the
# background, and nothing retries it on resume (pingTracker skips once the task is "running").
P01="after a process kill and reopen, the sampler returns without its FGS"
check_a_once() { # run-no
  local n="$1" pre pid M line mid post pid2 obs v=inconclusive
  mark "CHECK a#$n O01-F01 kill -9 on duty, reopen"
  clock in || {
    record "a#$n" O01-F01 "$P01" "could not clock in" inconclusive timeline.txt
    return
  }
  pre="$(wait_fgs yes 30)"
  fgs_lines > "$EV/services-a$n-pre.txt"
  if [ "$pre" != yes ]; then
    record "a#$n" O01-F01 "$P01" "precondition failed: no FGS on duty before the kill (fgs=$pre)" inconclusive "services-a$n-pre.txt"
    return
  fi
  go_home
  sleep 2
  pid="$(app_pid)"
  M="a#$n kill -9 pid=$pid"
  mark "$M"
  ash kill -9 "$pid"
  line="$(wait_lc "$M" "$FGS_BG_REFUSED" 60)"
  mid="$(fgs_up)"
  { echo "pid_after_kill=$(app_pid)"; echo "logcat: $line"; fgs_lines; } > "$EV/services-a$n-killed.txt"
  launch_app
  mark "a#$n reopened"
  sleep 15
  post="$(fgs_up)"
  pid2="$(app_pid)"
  { echo "pid_after_reopen=$pid2; record half alone (the old probe): $(fgs_record_up)"; fgs_lines; } > "$EV/services-a$n-reopened.txt"
  lc_since "$M" "$FGS_BG_REFUSED|LocationTaskConsumer|FFLAB" > "$EV/a$n-logcat.txt"
  dump_state "$EV/state-a$n-reopened.json"
  obs="fgs before kill=$pre; restored process logged the background refusal: $([ -n "$line" ] && echo "yes ($(echo "$line" | cut -c1-18))" || echo no); fgs while closed=$mid; 15 s after reopen: fgs=$post (pid $pid -> $pid2)"
  if [ "$post" = yes ]; then
    v=not_reproduced
  elif [ -n "$line" ] && [ "${PROBE_RESTORED_OK:-0}" = 1 ]; then
    v=reproduced
  else
    obs="$obs; cannot decide: $([ "${PROBE_RESTORED_OK:-0}" = 1 ] || echo 'the probe has not been shown saying no on a restored process in this run (run probe first); ')$([ -n "$line" ] || echo 'no background refusal logged')"
  fi
  record "a#$n" O01-F01 "$P01" "$obs" "$v" "services-a$n-reopened.txt"
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
latest_row() { # kind since-epoch -> the newest presence row of that kind captured after since-epoch
  lab_sql "select kind, lat, lng, accuracy_m, inside_geofence, round(distance_m::numeric, 1) as distance_m, confirmed, is_mock_location, device_time, extract(epoch from device_time)::int as device_epoch from attendance_presence_event where tech_id='$LAB_TECH_ID' and kind='$1' and device_time >= to_timestamp(${2:-0}) order by server_time desc limit 1" | tail -n +2 | head -n1
}
dev_now() { ash date +%s; } # the emulator's clock (the app stamps device_time with it)
# Presence rows on the server of this kind captured after since-epoch.
rows_since() { lab_sql "select count(*) from attendance_presence_event where tech_id='$LAB_TECH_ID' and kind='$1' and device_time >= to_timestamp($2)" | tail -n1; }
# The LAST "Finished task" for the geofence task within $2 s after the job line $1 (each crossing
# also yields a quick debounced duplicate job; the first Finished can be that one's).
last_finish() { # job-line seconds
  local j0 l e
  j0="$(lc_epoch "$1")" || return 0
  lc_since "${3:-}" "$GEOFENCE_DONE" | while read -r l; do
    e="$(lc_epoch "$l")"
    awk -v e="$e" -v a="$j0" -v w="$2" 'BEGIN { exit !(e >= a && e <= a + w) }' && echo "$l"
  done | tail -n1
}
col() { echo "$1" | cut -d'|' -f"$2"; } # 1-based column of a psql -A row
fsub() { # a b -> a - b (one decimal), "?" when either is missing
  if [ -z "${1:-}" ] || [ -z "${2:-}" ]; then echo "?"; else awk -v a="$1" -v b="$2" 'BEGIN { printf "%.1f", a - b }'; fi
}
fge() { [ "$1" != "?" ] && awk -v a="$1" -v b="$2" 'BEGIN { exit !(a >= b) }'; } # a >= b

# ---- d: O01-F04 / F05 (contradicted arrival, headless) ------------------------------------
# F04's condition is an OS ENTER whose confirmation fix lands just OUTSIDE the raw 80 m circle
# but within r + accuracy. Play services decides on the raw point (calibration 2026-11-13: no
# ENTER for any fix 85-100 m out, at 10-40 m accuracy), so the lab STAGES the divergence: an
# inside fix makes Play services deliver ENTER, and the moment the job starts the fix moves to
# 100 m out at the same 30 m accuracy, so the handler's own HIGH read is the edge fix. The
# phone then says contradicted (20 s dwell, second fix, confirmed=false, prompt suppressed);
# the register predicts the server says inside_geofence=true for that same fix. The process is
# killed first so the event runs headless (no Activity: avoids the F19 hang, its own check).
# When the handler's read wins the race and gets the inside fix, the run is inconclusive.
P4="for one fix with r < d <= r + accuracy the phone says confirmed=false while the server stores inside_geofence=true"
P5="on the contradicted path the handler runs past Expo's 15 s job window and enqueues only after the 20 s dwell (measured on device; the predicted LOSS needs an OEM kill and is not testable on stock Android)"
check_d_once() {
  local n="$1" a0 n0 M T job fin t row="" n1 dur enq conf ins obs i
  mark "CHECK d#$n staged edge arrival (ENTER from inside, confirmation fix 100 m out, acc $EDGE_ACC m), headless"
  clock out > /dev/null 2>&1
  geo_set "$OUT_LAT" "$OUT_LNG" "$EDGE_ACC"
  launch_app
  sleep 5 # foreground: ensureGeofenceMonitoring re-registers the fence (initial EXIT)
  go_home
  wait_debounce arrive
  n0="$(notif_count "reached the workshop")"
  kill_app || mark "d#$n app process did not die"
  M="d#$n move-in"
  T="$(dev_now)"
  mark "$M"
  geo_set "$FENCE_LAT" "$FENCE_LNG" "$EDGE_ACC"
  geo_nudge
  job=""
  for i in $(seq 1 120); do # poll the logcat file every 0.5 s for the ENTER job
    job="$(lc_since "$M" "$GEOFENCE_JOB" | head -n1)"
    [ -n "$job" ] && break
    sleep 0.5
  done
  [ -n "$job" ] && geo_set "$EDGE_LAT" "$FENCE_LNG" "$EDGE_ACC"
  mark "d#$n edge fix set after the ENTER job: ${job:+yes}"
  t=-1
  for i in $(seq 1 24); do
    [ "$(rows_since arrive "$T")" -gt 0 ] && {
      t=$((i * 5))
      break
    }
    sleep 5
  done
  sleep 5
  fin="$(last_finish "$job" 90 "$M")"
  n1="$(notif_count "reached the workshop")"
  notif_dump | grep -B2 -A12 "pkg=$APP_PKG" > "$EV/notifications-d$n.txt"
  dump_state "$EV/state-d$n.json"
  [ "$t" != -1 ] && row="$(latest_row arrive "$T")"
  {
    echo "geofence job: $job"
    echo "last finished within 90 s: $fin"
    echo "row (kind|lat|lng|accuracy_m|inside_geofence|distance_m|confirmed|mock|device_time|epoch): $row"
  } > "$EV/presence-d$n.txt"
  dur="$(fsub "$(lc_epoch "$fin")" "$(lc_epoch "$job")")"
  enq="$(fsub "$(col "$row" 10)" "$(lc_epoch "$job")")"
  conf="$(col "$row" 7)"
  ins="$(col "$row" 5)"
  obs="ENTER delivered: $([ -n "$job" ] && echo yes || echo 'no (60 s)'); arrive row captured after the move: ${t}s (-1 = none in 120 s): confirmed=$conf inside_geofence=$ins distance_m=$(col "$row" 6) accuracy_m=$(col "$row" 4) mock=$(col "$row" 8); handler ran ${dur}s (job start to its last Finished task); row device_time ${enq}s after the job started; arrival notifications $n0 -> $n1"
  if [ -z "$job" ] || [ -z "$row" ]; then
    record "d#$n" O01-F04 "$P4" "$obs" inconclusive "presence-d$n.txt"
    record "d#$n" O01-F05 "$P5" "$obs" inconclusive "presence-d$n.txt"
  elif [ "$conf" != f ]; then
    record "d#$n" O01-F04 "$P4" "$obs; the handler's fix was not the edge fix (the staging race was lost), so this run cannot judge F04" inconclusive "presence-d$n.txt"
    record "d#$n" O01-F05 "$P5" "$obs; not the contradicted path" inconclusive "presence-d$n.txt"
  else
    record "d#$n" O01-F04 "$P4" "$obs" "$([ "$ins" = t ] && echo reproduced || echo not_reproduced)" "presence-d$n.txt"
    if [ "$dur" = "?" ] || [ "$enq" = "?" ]; then
      record "d#$n" O01-F05 "$P5" "$obs; a timestamp is missing" inconclusive "presence-d$n.txt"
    else
      record "d#$n" O01-F05 "$P5" "$obs" "$(fge "$dur" 15.001 && fge "$enq" 20 && echo reproduced || echo not_reproduced)" "presence-d$n.txt"
    fi
  fi
  geo_set "$OUT_LAT" "$OUT_LNG" "$EDGE_ACC"
  rec_roll
}
# The pipeline control: a clean arrival at the centre (acc 8 m), headless, must record a
# confirmed row and post the arrival prompt. If this fails, the d/b/f19 verdicts mean nothing.
check_d_control() {
  local a0 n0 M T job t row="" n1
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
  T="$(dev_now)"
  mark "$M"
  geo_set "$FENCE_LAT" "$FENCE_LNG"
  geo_nudge
  job="$(wait_lc "$M" "$GEOFENCE_JOB" 120)"
  t="$(wait_presence arrive "$a0" 120)"
  sleep 8
  n1="$(notif_count "reached the workshop")"
  [ "$t" != -1 ] && row="$(latest_row arrive "$T")"
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
  local n="$1" d0 M T job t blk tr rows row late obs v
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
  T="$(dev_now)"
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
  row="$(latest_row depart "$T")"
  late="$(fsub "$(col "$row" 10)" "$(lc_epoch "$job")")"
  {
    echo "geofence job: $job"
    echo "blocked: $blk"
    echo "newest depart row: $row"
    lc_since "$M" "TaskService|$BLOCKED_PERM|GrantPermissionsActivity|FFLAB"
  } > "$EV/f19-$n.txt"
  obs="EXIT delivered; depart row within 90 s with the app in the background: $([ "$t" = -1 ] && echo none || echo "after ${t}s"); blocked GrantPermissionsActivity launch: $([ -n "$blk" ] && echo yes || echo no); after reopening: a row after ${tr}s (-1 = none in 60 s), depart rows added $rows, newest device_time ${late}s after the EXIT job started"
  # reproduced needs all three: no row while backgrounded, the blocked permission launch, and a
  # row once the app is opened (so the pipeline itself worked). A row in time = not reproduced.
  if [ "$t" != -1 ]; then
    v=not_reproduced
  elif [ -n "$blk" ] && [ "$tr" != -1 ]; then
    v=reproduced
  else
    v=inconclusive
    obs="$obs; incomplete evidence (blocked launch and a row after reopening are both required)"
  fi
  record "f19#$n" O01-F19 "$P19" "$obs" "$v" "f19-$n.txt"
  rec_roll
}
# Control: the SAME crossing kind (a depart) with the process dead. First an arrival in the
# foreground (records normally), then HOME, wait out the depart debounce, kill, move out.
check_f19_headless_once() {
  local n="$1" M T job t blk
  mark "CHECK f19-headless#$n depart with the process dead"
  launch_app
  geo_set "$FENCE_LAT" "$FENCE_LNG"
  geo_nudge
  sleep 20
  go_home
  wait_debounce depart
  kill_app || mark "f19-headless#$n app process did not die"
  M="f19h#$n move-out"
  T="$(dev_now)"
  mark "$M"
  geo_set "$OUT_LAT" "$OUT_LNG"
  geo_nudge
  job="$(wait_lc "$M" "$GEOFENCE_JOB" 120)"
  t=-1
  local i
  for i in $(seq 1 18); do
    [ "$(rows_since depart "$T")" -gt 0 ] && {
      t=$((i * 5))
      break
    }
    sleep 5
  done
  blk="$(lc_since "$M" "$BLOCKED_PERM" | head -n1 | cut -c1-220)"
  {
    echo "geofence job: $job"
    echo "blocked: $blk"
    echo "newest depart row: $(latest_row depart "$T")"
  } > "$EV/f19h-$n.txt"
  if [ -z "$job" ]; then
    record "f19-headless#$n" control "process dead: the same depart records without opening the app" "Play services delivered no EXIT within 120 s" inconclusive "f19h-$n.txt"
  else
    record "f19-headless#$n" control "process dead: the same depart records without opening the app" \
      "EXIT delivered; depart row after ${t}s (-1 = none in 90 s); blocked permission launch: $([ -n "$blk" ] && echo yes || echo no)" \
      "$([ "$t" != -1 ] && [ -z "$blk" ] && echo reproduced || echo not_reproduced)" "f19h-$n.txt"
  fi
}
check_f19() {
  local i
  for i in $(seq 1 "$REPEAT"); do
    check_f19_once "$i"
    check_f19_headless_once "$i"
  done
}

# ---- f14: O01-F14 (the Activity opened while a headless task instance is alive) -----------
# expo-task-manager registers its TaskManager once, headless, in onCreate; if the Activity opens
# while that headless instance is alive (or in its ~2 s teardown), invalidateAppRecord drops the
# registration and every later job is "Handling job" with no "Finished task": nothing reaches JS
# until the process dies. Test: kill, a headless depart, open the app the moment the job starts.
# Control: the same, but open the app 10 s after that job's "Finished task". Both then make an
# arrival with the Activity in the FOREGROUND (a stopped one would hang the handler: f19) and
# read whether that job finishes and records. Seen first by accident in the final tracker run
# (17:28:27, check b's reopen), where it then emptied the offline run's controls.
P14="opening the app while a headless task instance is alive drops the TaskManager: later jobs log 'Handling job' and never 'Finished task'; nothing reaches JS until the process dies"
lc_size() { stat -c %s "$EV/logcat.txt"; }
lc_from() { tail -c +"$(($1 + 1))" "$EV/logcat.txt"; } # logcat bytes after an offset
wait_from() { # offset regex seconds [poll] -> the first matching line after the offset
  local end=$((SECONDS + $3)) l
  while [ "$SECONDS" -le "$end" ]; do
    l="$(lc_from "$1" | grep -m1 -E "$2")"
    [ -n "$l" ] && {
      echo "$l"
      return
    }
    sleep "${4:-0.3}"
  done
}
esub() { # line-a line-b -> epoch(a) - epoch(b), "?" when either is missing
  if [ -z "$1" ] || [ -z "$2" ]; then echo "?"; else fsub "$(lc_epoch "$1")" "$(lc_epoch "$2")"; fi
}
check_f14_once() { # run-no test|control
  local n="$1" mode="$2" id M off job fin st T2 M2 off2 job2 fin2 rows=0 blk i dl ds obs v=inconclusive
  id="f14#$n"
  [ "$mode" = control ] && id="f14-control#$n"
  mark "CHECK $id ($mode)"
  ash svc power stayon true
  ash input keyevent KEYCODE_WAKEUP
  geo_set "$FENCE_LAT" "$FENCE_LNG"
  wait_debounce depart
  kill_app || mark "$id app process did not die"
  M="$id move-out"
  mark "$M"
  off="$(lc_size)"
  geo_set "$OUT_LAT" "$OUT_LNG"
  geo_nudge
  job="$(wait_from "$off" "$GEOFENCE_JOB" 120 0.2)"
  if [ -z "$job" ]; then
    record "$id" "$([ "$mode" = test ] && echo O01-F14 || echo control)" "$P14" "precondition failed: Play services delivered no EXIT within 120 s" inconclusive timeline.txt
    return
  fi
  if [ "$mode" = test ]; then
    launch_app
  else
    wait_from "$off" "$GEOFENCE_DONE" 60 1 > /dev/null
    sleep 10
    launch_app
  fi
  sleep 8
  st="$(lc_from "$off" | grep -m1 -E "START u0.*$APP_PKG")"
  fin="$(lc_from "$off" | grep -m1 -E "$GEOFENCE_DONE")"
  dl="$(esub "$st" "$job")"  # the Activity's start after the headless job began
  ds="$(esub "$st" "$fin")"  # ... after that job's Finished task (negative = while it ran)
  wait_debounce arrive
  ash input keyevent KEYCODE_WAKEUP
  launch_app # the same process, brought to the front: the probe runs with a foreground Activity
  sleep 3
  M2="$id probe arrival"
  mark "$M2 (app pid $(app_pid))"
  T2="$(dev_now)"
  off2="$(lc_size)"
  geo_set "$FENCE_LAT" "$FENCE_LNG"
  geo_nudge
  job2="$(wait_from "$off2" "$GEOFENCE_JOB" 120 1)"
  fin2=""
  [ -n "$job2" ] && fin2="$(wait_from "$off2" "$GEOFENCE_DONE" 60 1)"
  for i in $(seq 1 6); do
    rows="$(rows_since arrive "$T2")"
    [ "${rows:-0}" -gt 0 ] && break
    sleep 5
  done
  blk="$(lc_from "$off2" | grep -m1 -E "$BLOCKED_PERM" | cut -c1-220)"
  {
    echo "headless job: $job"
    echo "activity start: $st"
    echo "headless finished: $fin"
    echo "probe job: $job2"
    echo "probe finished: $fin2"
    echo "probe blocked permission launch: $blk"
    echo "newest arrive row: $(latest_row arrive "$T2")"
    lc_from "$off" | grep -E "TaskService|TaskManager|FFLAB|START u0.*$APP_PKG"
  } > "$EV/f14-$n-$mode.txt"
  obs="the Activity started ${dl}s after the headless job began and ${ds}s after its Finished task (negative = while it ran); the probe arrival with the app in the foreground: job delivered=$([ -n "$job2" ] && echo yes || echo no), Finished task=$([ -n "$fin2" ] && echo yes || echo no), arrive rows=$rows"
  if [ -n "$blk" ]; then
    obs="$obs; a blocked permission launch during the probe (the f19 hang, not this mechanism)"
  elif [ -z "$job2" ]; then
    obs="$obs; precondition failed (no ENTER for the probe)"
  elif [ "$mode" = test ]; then
    if [ -z "$st" ]; then
      obs="$obs; precondition failed (no Activity start in logcat)"
    elif [ "$ds" != "?" ] && ! fge 2 "$ds"; then
      obs="$obs; precondition failed (the Activity opened more than 2 s after the headless job finished)"
    elif [ -z "$fin2" ] && [ "${rows:-0}" -eq 0 ]; then
      v=reproduced
    elif [ -n "$fin2" ] && [ "${rows:-0}" -gt 0 ]; then
      v=not_reproduced
    fi
  else
    if [ -n "$fin2" ] && [ "${rows:-0}" -gt 0 ]; then
      v=reproduced
    elif [ -z "$fin2" ] && [ "${rows:-0}" -eq 0 ]; then
      v=not_reproduced
    fi
  fi
  if [ "$mode" = test ]; then
    record "$id" O01-F14 "$P14" "$obs" "$v" "f14-$n-$mode.txt"
  else
    record "$id" control "opened 10 s after the headless job finished: the next job finishes and records" "$obs" "$v" "f14-$n-$mode.txt"
  fi
  # a broken process stays broken: end every run on a fresh one
  fresh_app || mark "$id no fresh process: it kept coming back headless"
  ash svc power stayon false
}
check_f14() {
  local i
  for i in $(seq 1 "$REPEAT"); do
    check_f14_once "$i" test
    check_f14_once "$i" control
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
# O01-F03's mechanism needs Play services to deliver a geofence ERROR when location goes off
# (GEOFENCE_NOT_AVAILABLE, typically after network location is disabled). This rig has no
# network location provider, so the check first asks whether any geofence event or error
# reached the app while location was off; without one it says nothing (binding review, MAJOR 3).
GEOFENCE_ERR="GEOFENCE_NOT_AVAILABLE|[Gg]eofenc[a-z]*.*([Ee]rror|errorCode)"
P03="a location toggle removes the fence; nothing re-registers it until the app is opened"
check_b() {
  local r0 r1 d0 M MOFF err job td obs v=inconclusive
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
  MOFF="b location OFF"
  mark "$MOFF"
  ash cmd location set-location-enabled false
  sleep 60
  mark "b location ON"
  ash cmd location set-location-enabled true
  sleep 20
  # a geofence event or error delivered to the app while location was off (or as it came back)
  err="$(lc_since "$MOFF" "$GEOFENCE_JOB|$GEOFENCE_ERR" | head -n3 | cut -c1-200)"
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
  { echo "geofence event/error while location was off: ${err:-none}"; lc_since "$MOFF" "$GEOFENCE_JOB|$GEOFENCE_ERR|FFLAB|GeofencingTaskConsumer"; } > "$EV/b-logcat.txt"
  obs="location off 60 s; a geofence event or error delivered meanwhile: $([ -n "$err" ] && echo yes || echo no); fence in Play services before=$r0, after=$r1; a depart afterwards without opening the app: EXIT delivered=$([ -n "$job" ] && echo yes || echo no), row after ${td}s (-1 = none)"
  if [ "$r0" != yes ]; then
    obs="$obs; precondition failed (no fence before the toggle)"
  elif [ -z "$err" ]; then
    obs="$obs; precondition failed: no geofence error was delivered, so the mechanism was never exercised (this rig has no network location provider, the documented trigger)"
  elif [ "$r1" = no ] && [ -z "$job" ]; then
    v=reproduced
  elif [ "$r1" = yes ] && [ -n "$job" ]; then
    v=not_reproduced
  fi
  record b O01-F03 "$P03" "$obs" "$v" "b-logcat.txt"
  launch_app
  sleep 8
  fence_dump "$EV/fence-b-reopened.txt"
  mark "b app reopened: fence in dumpsys=$(fence_registered "$EV/fence-b-reopened.txt")"
  rec_roll
}

# The fence probe's other outcome (binding review, MAJOR 3: fence_registered had never said
# "no"): wipe the app's data, which removes its geofences from Play services, and read the dump.
# Then sign the lab technician back in (the app re-registers the fence on its own).
check_fneg() {
  local r0 r1 r2
  mark "CHECK fneg: the fence probe after the app's data is wiped"
  launch_app
  sleep 8
  fence_dump "$EV/fence-neg-before.txt"
  r0="$(fence_registered "$EV/fence-neg-before.txt")"
  bash "$LAB_DIR/app.sh" clear > /dev/null 2>&1
  sleep 20
  fence_dump "$EV/fence-neg-after.txt"
  r1="$(fence_registered "$EV/fence-neg-after.txt")"
  bash "$LAB_DIR/app.sh" login > "$EV/fneg-login.txt" 2>&1 || mark "fneg: re-login failed (see fneg-login.txt)"
  sleep 10
  fence_dump "$EV/fence-neg-relogin.txt"
  r2="$(fence_registered "$EV/fence-neg-relogin.txt")"
  if [ "$r0" != yes ]; then
    record fneg control "after pm clear the fence is gone from Play services' dump: fence_registered=no" "precondition failed: no fence before (=$r0)" inconclusive fence-neg-before.txt
  else
    record fneg control "after pm clear the fence is gone from Play services' dump: fence_registered=no" \
      "before=$r0; 20 s after pm clear=$r1; after signing in again=$r2" "$([ "$r1" = no ] && echo reproduced || echo not_reproduced)" fence-neg-after.txt
  fi
}

# ---- c: O01-F20 ---------------------------------------------------------------------------
# A fresh home-visit job per c run: a job's travel state lives on the server, so a job that was
# already travelled no longer offers START TRAVEL (final run, 2026-11-13). Created through the
# lab backend's own API as the seeded manager (migration seed PIN, a throwaway local DB).
fresh_lab_job() { # -> prints the customer name
  local name mt code
  name="LAB travel $(date +%H%M%S)"
  mt="$(lab_curl -X POST "$LAB_HOST_URL/api/auth/login" -H 'Content-Type: application/json' \
    -d '{"tech_id":"m1","pin":"1234"}' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
  [ -n "$mt" ] || return 1
  code="$(lab_curl -o /dev/null -w '%{http_code}' -X POST "$LAB_HOST_URL/api/jobs" \
    -H "Authorization: Bearer $mt" -H 'Content-Type: application/json' \
    -d "{\"job_type\":\"home-visit\",\"customer_name\":\"$name\",\"customer_address\":\"LAB address\",\"customer_lat\":$JOB_LAT,\"customer_lng\":$JOB_LNG,\"appliance_type\":\"AC\",\"problem\":\"lab travel job\",\"assigned_tech_id\":\"$LAB_TECH_ID\"}")"
  case "$code" in 2*) echo "$name" ;; *) return 1 ;; esac
}
open_lab_job() { # [customer name]
  local who="${1:-LAB customer}"
  to_dashboard || return 1
  tap_text "Jobs" || return 1
  sleep 2
  local c
  for c in "On-Going Tasks" "Available Tasks"; do
    if ui_has "$c"; then
      tap_text "$c"
      if wait_text "$who" 10 || scroll_to_text "$who"; then
        tap_text "$who"
        wait_text "Add a note…" 20 && return 0
      fi
      ash input keyevent KEYCODE_BACK
      sleep 2
    fi
  done
  return 1
}
check_c() { # [run-no]
  local n="${1:-1}" job_name
  mark "CHECK c#$n O01-F20 travel leg start/stop while on duty"
  geo_set "$FENCE_LAT" "$FENCE_LNG"
  # a fresh duty session per run: the previous run's arrival may have stripped the sampler's
  # FGS (the finding itself), and staying clocked in leaves it off (final run, c#2/c#3)
  clock out > /dev/null 2>&1
  sleep 3
  clock in || {
    record "c#$n" O01-F20 "ending a travel leg strips the on-duty sampler's FGS" "could not clock in" inconclusive timeline.txt
    return
  }
  local pre during post p0 p1
  pre="$(wait_fgs yes 30)"
  fgs_lines > "$EV/services-c$n-pre.txt"
  job_name="$(fresh_lab_job)" || {
    record "c#$n" O01-F20 "ending a travel leg strips the on-duty sampler's FGS" "could not create a fresh lab job" inconclusive timeline.txt
    return
  }
  mark "c#$n fresh job: $job_name"
  sleep 3
  open_lab_job "$job_name" || {
    record "c#$n" O01-F20 "ending a travel leg strips the on-duty sampler's FGS" "could not open the lab job by UI (see ui.xml)" inconclusive "timeline.txt"
    cp "$UI_XML" "$EV/ui-c$n-fail.xml" 2> /dev/null
    return
  }
  tap_text "🚀 START TRAVEL" || tap_text "START TRAVEL" "~" || {
    record "c#$n" O01-F20 "ending a travel leg strips the on-duty sampler's FGS" "no START TRAVEL button on the job" inconclusive timeline.txt
    cp "$UI_XML" "$EV/ui-c$n-fail.xml"
    return
  }
  sleep 3
  tap_text "START TRAVEL" "~" || true # the Travel screen's own start button
  sleep 10
  during="$(fgs_up)"
  fgs_lines > "$EV/services-c$n-during.txt"
  dump_state "$EV/state-c$n-during.json"
  geo_set "$JOB_LAT" "$JOB_LNG"
  sleep 15
  tap_text "I HAVE ARRIVED" || {
    record "c#$n" O01-F20 "ending a travel leg strips the on-duty sampler's FGS" "no I HAVE ARRIVED button" inconclusive timeline.txt
    cp "$UI_XML" "$EV/ui-c$n-fail.xml"
    return
  }
  wait_text "OK" 30 && tap_text "OK"
  sleep 10
  post="$(fgs_up)"
  fgs_lines > "$EV/services-c$n-post.txt"
  dump_state "$EV/state-c$n-post.json"
  p0="$(ping_count)"
  sleep 150
  p1="$(ping_count)"
  local obs="FGS on duty before travel=$pre, during the leg=$during, 10 s after arrival=$post (duty cache: $(kv attendance.duty.v1)); pings received in the 150 s after arrival: $((p1 - p0)) (not evidence: the lab's sampler barely receives fixes, see README)"
  if [ "$pre" != yes ]; then
    record "c#$n" O01-F20 "ending a travel leg strips the on-duty sampler's FGS" "$obs" inconclusive "services-c$n-pre.txt"
  elif [ "$post" = no ]; then
    record "c#$n" O01-F20 "ending a travel leg strips the on-duty sampler's FGS" "$obs" reproduced "services-c$n-post.txt"
  else
    record "c#$n" O01-F20 "ending a travel leg strips the on-duty sampler's FGS" "$obs" not_reproduced "services-c$n-post.txt"
  fi
  geo_set "$FENCE_LAT" "$FENCE_LNG"
  clock out > /dev/null 2>&1
  rec_roll
}

check_c_all() {
  local i
  for i in $(seq 1 "$REPEAT"); do check_c "$i"; done
}

# ---- doze / reboot / revoke ---------------------------------------------------------------
check_doze() {
  mark "CHECK doze on duty, force-idle ${DOZE_MIN} min"
  clock in || return
  wait_fgs yes 30 > /dev/null
  go_home
  local p0 pa p1 v=inconclusive obs
  sleep 70
  # the same sampler for the same length without doze first: in a rig whose sampler barely
  # receives fixes, "few pings in doze" says nothing (binding review, MAJOR 4)
  p0="$(ping_count)"
  sleep $((DOZE_MIN * 60))
  pa="$(ping_count)"
  ash dumpsys battery unplug
  ash dumpsys deviceidle force-idle | tee "$EV/doze.txt" > /dev/null
  sleep $((DOZE_MIN * 60))
  ash dumpsys deviceidle get deep >> "$EV/doze.txt"
  p1="$(ping_count)"
  ash dumpsys deviceidle unforce > /dev/null
  ash dumpsys battery reset
  obs="pings received in ${DOZE_MIN} min on duty without doze: $((pa - p0)); during ${DOZE_MIN} min of forced deep idle: $((p1 - pa)) (1-min lab interval; pings sync on the next fix, so a delayed batch can land after unforce)"
  if [ $((pa - p0)) -lt $((DOZE_MIN / 2)) ]; then
    obs="$obs; cannot decide: the sampler did not show at least $((DOZE_MIN / 2)) pings without doze"
  elif [ $((p1 - pa)) -lt $((DOZE_MIN / 2)) ]; then
    v=reproduced
  else
    v=not_reproduced
  fi
  record doze "O01 (doze; no register row)" "stock doze throttles the on-duty sampler" "$obs" "$v" doze.txt
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
  # a reboot ends the logcat stream and removes the test provider: restart both
  adb_ logcat -v threadtime >> "$EV/logcat.txt" 2>&1 &
  LOGCAT_PID=$!
  geo_provider_on
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
    "$(if [ "$f2" = yes ]; then echo not_reproduced; elif [ "${PROBE_RESTORED_OK:-0}" = 1 ]; then echo reproduced; else echo inconclusive; fi)" services-reboot-opened.txt
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
    fneg) check_fneg ;;
    c) check_c_all ;;
    d) check_d ;;
    f19) check_f19 ;;
    f14) check_f14 ;;
    doze) check_doze ;;
    reboot) check_reboot ;;
    revoke) check_revoke ;;
    *) die "unknown check $c" ;;
  esac
done
snap after
mark "END tracker"
