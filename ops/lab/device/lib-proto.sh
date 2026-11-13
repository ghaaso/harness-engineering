#!/usr/bin/env bash
# Shared protocol machinery for the FixFlow device lab: the evidence folder, logcat capture,
# the location feeder, clock-in/out by UI, and a cleanup trap that always runs. Sourced by the
# protocol-*.sh scripts after lib.sh and lib-app.sh; never run alone.
#
# Location. The emulator's GPS is fed with `adb emu geo fix <lng> <lat>` (the emulated GPS
# hardware: fixes are NOT flagged as mock). A background feeder re-sends the current target
# every FF_GEO_EVERY seconds (3): Android's fused provider and Play-services geofencing only
# evaluate a fence while fixes keep arriving, so a single geo fix is not enough for a crossing.

# Lab coordinates (must match lab-backend.sh's seed).
FENCE_LAT="24.900000"
FENCE_LNG="67.100000"
FENCE_R=80
OUT_LAT="24.905000" # ~556 m north of the centre: past the 120 m exit threshold
OUT_LNG="67.100000"
JOB_LAT="24.918000" # the seeded lab job's customer pin
JOB_LNG="67.100000"

GEO_TARGET_F="$LAB_RUN/geo-target"
GEO_EVERY="${FF_GEO_EVERY:-3}"
FEEDER_PID=""
LOGCAT_PID=""

geo_set() { # lat lng  (also records the move in the evidence timeline)
  echo "$1 $2" > "$GEO_TARGET_F"
  adb_ emu geo fix "$2" "$1" > /dev/null 2>&1
  echo "$(date -Is) geo $1 $2" >> "$EV/timeline.txt"
}

feeder_start() {
  (
    while :; do
      if [ -s "$GEO_TARGET_F" ]; then
        read -r la ln < "$GEO_TARGET_F"
        adb_ emu geo fix "$ln" "$la" > /dev/null 2>&1
      fi
      sleep "$GEO_EVERY"
    done
  ) &
  FEEDER_PID=$!
}

mark() { # a line in the evidence timeline and in logcat (so both can be lined up)
  echo "$(date -Is) $*" >> "$EV/timeline.txt"
  ash log -t FFLAB "$*" > /dev/null 2>&1
  log "$*"
}

proto_begin() { # name
  require_emulator
  EV="$LAB_OUT/$1-$(stamp)"
  mkdir -p "$EV"
  : > "$EV/results.ndjson"
  : > "$EV/timeline.txt"
  adb_ logcat -c > /dev/null 2>&1
  adb_ logcat -v threadtime > "$EV/logcat.txt" 2>&1 &
  LOGCAT_PID=$!
  feeder_start
  rec_start
  trap proto_cleanup EXIT
  trap 'exit 130' INT TERM HUP
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
  rec_collect 2> /dev/null
  [ -n "$LOGCAT_PID" ] && kill "$LOGCAT_PID" 2> /dev/null
  # never leave location switched off or the device forced into doze
  ash cmd location set-location-enabled true > /dev/null 2>&1
  ash dumpsys deviceidle unforce > /dev/null 2>&1
  ash cmd connectivity airplane-mode disable > /dev/null 2>&1
  if [ -n "${PROTO_RESTORE_BACKEND:-}" ]; then
    bash "$LAB_DIR/lab-backend.sh" up > /dev/null 2>&1 || true
  fi
  if [ -s "$EV/results.ndjson" ]; then
    finish_results "{\"protocol\":\"$(basename "$EV")\",\"finished\":\"$(date -Is)\",\"exit_code\":$rc,\"note\":\"stock Android 14 emulator: says nothing about the fleet's phones (plan standing rule 2)\"}" 2> /dev/null
  fi
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
clocked_in_ui() { ui_has "Clock Out"; }

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
