#!/usr/bin/env bash
# FixFlow device lab: which edge fixes make Play services deliver an ENTER for the lab fence?
#
#   bash ops/lab/device/calibrate-fence.sh
#
# For each (metres north of the centre, accuracy) pair: feed the OUT point at that accuracy, then
# the edge point, nudge, and count the geofence jobs the app receives in 45 s. This records
# delivery by Play services only (the app's 3-min debounce does not affect delivery). Why it
# exists: check d (O01-F04) needs an ENTER whose confirmation fix is just outside the fence; the
# first run (2026-11-13) showed Play services decides on the raw point, so d stages that
# divergence instead (README, "Emulator caveats").
# Needs: emu.sh start. Output: $LAB_OUT/calib-f04-<stamp>/calib.txt
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$HERE/lib.sh"
# shellcheck source=lib-app.sh
source "$HERE/lib-app.sh"
load_android_env
require_emulator
OUTD="$LAB_OUT/calib-f04-$(stamp)"
mkdir -p "$OUTD"
gs() { ash su 2000 cmd location providers "$@"; }
push() { gs set-test-provider-location gps --location "$1,67.1" --accuracy "$2" > /dev/null 2>&1; }
nudge() {
  gs set-test-provider-enabled gps false > /dev/null 2>&1
  sleep 1
  gs set-test-provider-enabled gps true > /dev/null 2>&1
}
cleanup() {
  gs remove-test-provider gps > /dev/null 2>&1
  ash appops set com.android.shell android:mock_location default > /dev/null 2>&1
}
trap cleanup EXIT
ash appops set com.android.shell android:mock_location allow
gs add-test-provider gps --supportsAltitude --supportsSpeed --supportsBearing > /dev/null 2>&1
gs set-test-provider-enabled gps true > /dev/null 2>&1
feed() { # lat acc seconds
  local t=0
  while [ "$t" -lt "$3" ]; do
    push "$1" "$2"
    sleep 3
    t=$((t + 3))
  done
}
jobs_seen() { adb_ logcat -d -v time | tr -d '\r' | grep -c "Handling job with task name 'fixflow-attendance-geofence'"; }
lat_of() { awk -v m="$1" 'BEGIN { printf "%.6f", 24.9 + m / 111190 }'; } # metres north -> lat
{
  echo "F04 calibration $(date -Is): fence 24.9,67.1 r=80 m; OUT = 556 m at the same accuracy"
  for g in "90 20" "90 10" "85 10" "95 30" "100 30" "88 40" "70 30" "40 30"; do
    set -- $g
    push 24.905 "$2"
    nudge
    feed 24.905 "$2" 25
    adb_ logcat -c
    push "$(lat_of "$1")" "$2"
    nudge
    feed "$(lat_of "$1")" "$2" 45
    st="$(ash dumpsys activity service com.google.android.gms/com.google.android.location.internal.GoogleLocationManagerService |
      sed -n '/Geofencer State:/,/Dump of hardware/p' | grep -m1 'Geofence\[' | grep -o 'd=[^ ]* [A-Z_?]*')"
    echo "d=${1}m acc=${2}m: geofence jobs delivered in 45 s: $(jobs_seen); geofencer state: $st"
  done
} | tee "$OUTD/calib.txt"
echo "evidence: $OUTD"
