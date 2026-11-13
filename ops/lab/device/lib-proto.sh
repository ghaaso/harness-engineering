#!/usr/bin/env bash
# Shared protocol machinery for the FixFlow device lab: the evidence folder, logcat capture,
# the location feeder, clock-in/out by UI, and a cleanup trap that always runs. Sourced by the
# protocol-*.sh scripts after lib.sh and lib-app.sh; never run alone.
#
# Location. The lab replaces the emulator's GPS with a Location-Manager TEST PROVIDER named "gps"
# (`cmd location providers add-test-provider gps`, run as the shell uid after
# `appops set com.android.shell android:mock_location allow`). Why not `adb emu geo fix`: the
# emulated GPS hardware only produces fixes while some client requests GPS, so once the app's
# HIGH-accuracy read ends, Play services' geofencer and the BALANCED on-duty sampler receive
# nothing at all (seen 2026-11-13: GPS ProviderRequest[OFF], the emulator has no network
# location, geofence d=UNKNOWN). A test provider's fixes reach every listener, passive ones
# included. Consequences, recorded in every result: fixes are flagged mock (`mocked` = true on
# the phone, is_mock_location = t on the server, which records but does not reject it), and the
# accuracy is whatever the lab says (geo_set's third argument). A feeder re-sends the current
# target every FF_GEO_EVERY seconds (3).
#
# Play services evaluates a fence on its own schedule: about every 5 min while far from it,
# plus on a provider change and on re-registration. geo_nudge() switches the test provider off
# and on (a PROVIDERS_CHANGED) so the geofencer re-evaluates now; the lab therefore says
# nothing about how SOON a real phone notices a crossing, only what the app does once it does.

# Lab coordinates (must match lab-backend.sh's seed).
FENCE_LAT="24.900000"
FENCE_LNG="67.100000"
FENCE_R=80
OUT_LAT="24.905000" # ~556 m north of the centre: past the 120 m exit threshold
OUT_LNG="67.100000"
EDGE_LAT="24.900900" # ~100 m north: outside the 80 m fence by the raw point, inside by r + accuracy
EDGE_ACC=30
JOB_LAT="24.918000" # the seeded lab job's customer pin
JOB_LNG="67.100000"

GEO_TARGET_F="$LAB_RUN/geo-target"
GEO_EVERY="${FF_GEO_EVERY:-3}"
FEEDER_PID=""
LOGCAT_PID=""

# Append a line to the evidence timeline. Windows briefly locks a file being appended to
# (seen as "Device or resource busy" in run 2, which silently dropped lines): retry.
tl() {
  local i
  for i in 1 2 3 4 5; do
    echo "$*" >> "$EV/timeline.txt" 2> /dev/null && return 0
    sleep 0.3
  done
  echo "timeline append failed: $*" >&2
}

geo_shell() { ash su 2000 cmd location providers "$@"; } # as the shell uid (root is refused)
geo_push() { geo_shell set-test-provider-location gps --location "$1,$2" --accuracy "$3" > /dev/null 2>&1; }
geo_provider_on() {
  ash appops set com.android.shell android:mock_location allow
  local i
  for i in 1 2 3; do
    geo_shell add-test-provider gps --supportsAltitude --supportsSpeed --supportsBearing > /dev/null 2>&1
    geo_shell set-test-provider-enabled gps true > /dev/null 2>&1
    ash dumpsys location | grep -qF "gps provider [mock]" && return 0
    sleep 3
  done
  die "could not install the GPS test provider: $(geo_shell add-test-provider gps 2>&1 | head -n2)"
}
geo_provider_off() { # back to the emulated GPS hardware
  geo_shell remove-test-provider gps > /dev/null 2>&1
  ash appops set com.android.shell android:mock_location default > /dev/null 2>&1
}
geo_set() { # lat lng [accuracy_m=8]  (also records the move in the evidence timeline)
  echo "$1 $2 ${3:-8}" > "$GEO_TARGET_F"
  geo_push "$1" "$2" "${3:-8}"
  tl "$(date -Is) geo $1 $2 acc=${3:-8}"
}
geo_nudge() { # make Play services re-evaluate its fences now (see the header)
  geo_shell set-test-provider-enabled gps false > /dev/null 2>&1
  sleep 1
  geo_shell set-test-provider-enabled gps true > /dev/null 2>&1
  local la ln ac
  read -r la ln ac < "$GEO_TARGET_F"
  geo_push "$la" "$ln" "$ac"
  tl "$(date -Is) geo nudge (test provider off/on)"
}

feeder_start() {
  (
    while :; do
      if [ -s "$GEO_TARGET_F" ]; then
        read -r la ln ac < "$GEO_TARGET_F"
        geo_push "$la" "$ln" "${ac:-8}"
      fi
      sleep "$GEO_EVERY"
    done
  ) &
  FEEDER_PID=$!
}

mark() { # a line in the evidence timeline and in logcat (so both can be lined up)
  tl "$(date -Is) $*"
  # adb shell re-parses its arguments on the device: single-quote the text (minus any single
  # quotes) or "(" in a mark is a device-side syntax error and the marker never reaches logcat
  ash log -t FFLAB "'$(printf '%s' "$*" | tr -d "'")'" > /dev/null 2>&1
  log "$*"
}

proto_begin() { # name
  require_emulator
  EV="$LAB_OUT/$1-$(stamp)"
  mkdir -p "$EV"
  : > "$EV/results.ndjson"
  : > "$EV/timeline.txt"
  # the trap goes first, so anything started below is undone however the script dies
  trap proto_cleanup EXIT
  lab_busy # the emulator keeper does not idle-stop while a protocol runs
  trap 'exit 130' INT TERM HUP
  # the installed app must be a LAB build: same host + Firebase check as app.sh install
  local apk_dev
  apk_dev="$(ash pm path "$APP_PKG" | sed -n 's/^package://p' | head -n1)"
  [ -n "$apk_dev" ] || die "$APP_PKG is not installed on $EMU_SERIAL"
  adb_ pull "$apk_dev" "$(winpath "$EV/installed.apk")" > /dev/null || die "cannot pull the installed APK"
  bash "$LAB_DIR/app.sh" check "$EV/installed.apk" > "$EV/installed-apk-check.txt" 2>&1 ||
    die "the installed app is not a lab build (see $EV/installed-apk-check.txt): refusing to drive it"
  sha256sum "$EV/installed.apk" | cut -c1-64 > "$EV/installed-apk.sha256"
  rm -f "$EV/installed.apk"
  # lc_epoch reads logcat wall time in the host's zone: the two must agree
  [ "$(ash date +%z)" = "$(date +%z)" ] || die "emulator time zone $(ash date +%z) != host $(date +%z)"
  adb_ logcat -c > /dev/null 2>&1
  adb_ logcat -v threadtime > "$EV/logcat.txt" 2>&1 &
  LOGCAT_PID=$!
  geo_provider_on
  feeder_start
  rec_start
  {
    echo "protocol: $1"
    echo "started: $(date -Is)"
    echo "repo_head: $(git -C "$(winpath "$LAB_DIR")" rev-parse HEAD)"
    echo "apk: $(adb_ shell dumpsys package "$APP_PKG" | tr -d '\r' | grep -m1 -E 'versionName|lastUpdateTime' | sed 's/^ *//')"
    echo "device: $(ash getprop ro.product.model) / Android $(ash getprop ro.build.version.release) (API $(ash getprop ro.build.version.sdk)) / $(ash getprop ro.build.fingerprint)"
    echo "gms: $(ash dumpsys package com.google.android.gms | grep -m1 versionName | sed 's/^ *//')"
    echo "backend_mode: $(bash "$LAB_DIR/lab-backend.sh" status 2> /dev/null | head -n1)"
  } > "$EV/meta.txt"
  mark "BEGIN $1 evidence=$EV"
}

proto_cleanup() {
  local rc=$?
  trap - EXIT
  [ -n "$FEEDER_PID" ] && kill "$FEEDER_PID" 2> /dev/null
  geo_provider_off
  rec_collect 2> /dev/null
  # $LOGCAT_PID is the subshell running the adb_ function: kill its adb child too, or the
  # stream outlives the protocol and keeps appending to logcat.txt
  # (adb-processes.txt: every adb.exe with its command line before and 3 s after, as evidence)
  { echo "before stopping the logcat stream:"; adb_procs; } > "$EV/adb-processes.txt" 2>&1
  if [ -n "$LOGCAT_PID" ]; then
    kill $(ps -ef | awk -v p="$LOGCAT_PID" '$3 == p { print $2 }') 2> /dev/null
    kill "$LOGCAT_PID" 2> /dev/null
  fi
  sleep 3
  { echo "3 s after:"; adb_procs; } >> "$EV/adb-processes.txt" 2>&1
  [ -f "$EV/.result.tmp" ] && rm -f "$EV/.result.tmp"
  # never leave location switched off or the device forced into doze
  ash cmd location set-location-enabled true > /dev/null 2>&1
  ash dumpsys deviceidle unforce > /dev/null 2>&1
  ash dumpsys battery reset > /dev/null 2>&1
  ash cmd connectivity airplane-mode disable > /dev/null 2>&1
  ash pm grant "$APP_PKG" android.permission.ACCESS_BACKGROUND_LOCATION > /dev/null 2>&1
  ash su 2000 cmd location providers remove-test-provider network > /dev/null 2>&1
  if [ -n "${PROTO_RESTORE_BACKEND:-}" ]; then
    bash "$LAB_DIR/lab-backend.sh" up > /dev/null 2>&1 || true
  fi
  if [ -s "$EV/results.ndjson" ]; then
    finish_results "{\"protocol\":\"$(basename "$EV")\",\"finished\":\"$(date -Is)\",\"exit_code\":$rc,\"lab_tech\":\"$LAB_TECH_ID\",\"app_ref\":\"$LAB_APP_REF\",\"note\":\"stock Android 14 emulator: says nothing about the fleet's phones (plan standing rule 2)\"}" 2> /dev/null
  fi
  lab_idle
  echo "evidence: $EV (exit $rc)" >&2
  exit "$rc"
}

# Snapshot both sides: the app's queues and the backend's rows. snap <label>
snap() {
  dump_state "$EV/state-$1.json"
  if docker inspect -f '{{.State.Running}}' "$C_DB" 2> /dev/null | grep -q true; then
    backend_rows "$EV/backend-$1.txt"
  fi
  fgs_lines > "$EV/services-$1.txt"
}

# ---- clock state by UI ----------------------------------------------------------------------
# "Clock Out" alone is not proof: the punch history lists past "Clock Out" punches too.
clocked_in_ui() { ui_has "Clock Out" && ! ui_has "Not clocked in"; }

clock() { # in|out ; returns non-zero when the UI did not reach that state
  open_clock || return 1
  if [ "$1" = in ]; then
    clocked_in_ui && return 0
    tap_text "Clock In" || return 1
    wait_text "Clock Out" 45
  else
    clocked_in_ui || return 0
    tap_text "Clock Out" || return 1
    wait_text "Clock In" 45
  fi
}

# Wait until fgs_up says $1 (yes|no), up to $2 seconds; prints the final value.
wait_fgs() {
  local t=0 v
  while :; do
    v="$(fgs_up)"
    [ "$v" = "$1" ] && break
    [ "$t" -ge "$2" ] && break
    sleep 3
    t=$((t + 3))
  done
  echo "$v"
}

go_home() { ash input keyevent KEYCODE_HOME; }

# kill -9 the app process (root) so the next task event starts it headless (no Activity).
kill_app() {
  local p
  p="$(app_pid)"
  [ -n "$p" ] && ash kill -9 "$p"
  sleep 3
  [ -z "$(app_pid)" ]
}

# A fresh app process with a working TaskManager, opened in the foreground. Opening the app while
# a headless task instance is alive drops the TaskManager for the rest of the process (O01-F14,
# reproduced 3 of 3 by check f14), and Play services restarts a killed process headless within
# seconds for any pending geofence event (it did, and the 18:26 offline run lost its controls).
# So: kill, and open only once a kill has stayed dead for 10 s.
fresh_app() {
  local i
  for i in 1 2 3 4 5; do
    kill_app > /dev/null
    sleep 10
    if [ -z "$(app_pid)" ]; then
      launch_app
      sleep 8
      return 0
    fi
    mark "fresh_app: the process came back headless (pid $(app_pid)); letting its job finish"
    sleep 15
  done
  return 1
}

# Logcat lines matching ERE $2 that come after the FFLAB mark containing $1.
lc_since() {
  awk -v m="$1" -v re="$2" 'index($0, "FFLAB") && index($0, m) { on = 1; next } on && $0 ~ re' "$EV/logcat.txt"
}
wait_lc() { # marker regex seconds -> first matching line (empty if none in time)
  local t=0 l
  while [ "$t" -le "$3" ]; do
    l="$(lc_since "$1" "$2" | head -n1)"
    [ -n "$l" ] && {
      echo "$l"
      return
    }
    sleep 3
    t=$((t + 3))
  done
}
lc_epoch() { # a threadtime logcat line -> epoch seconds (this year)
  [ -n "$1" ] || return 1
  date -d "$(date +%Y)-$(echo "$1" | awk '{print $1" "$2}')" +%s.%N 2> /dev/null | cut -c1-14
}

# The phone debounces an identical crossing kind for 3 min, stamped BEFORE confirmation
# (geofence.ts isDuplicate, O01-F10). Sleep until the last crossing of this kind is >190 s old.
wait_debounce() { # kind
  local left
  left="$(kv attendance.presence.lastCrossing.v1 | node -e '
    let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
      let v = null; try { v = JSON.parse(s); } catch {}
      const now = +process.argv[2] * 1000;
      console.log(v && v.kind === process.argv[1] ? Math.max(0, Math.ceil((190000 - (now - v.at)) / 1000)) : 0);
    });' "$1" "$(ash date +%s)")"
  if [ "${left:-0}" -gt 0 ]; then
    mark "waiting ${left}s for the phone's 3-min $1 debounce"
    sleep "$left"
  fi
}
