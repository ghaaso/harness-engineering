#!/usr/bin/env bash
# Shared helpers for the FixFlow device lab (ship plan section 7.5, phase L3a). Sourced by the
# other scripts in this folder; never run on its own.
#
#   source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
#
# Knobs (env):
#   FF_LAB_LANE      lane id used in container names and the evidence root (l3a)
#   FF_LAB_PORT      host port the emulator reaches as http://10.0.2.2:<port> (18431)
#   FF_LAB_ROOT      working outputs: APKs, evidence, logs (C:/Users/User/.fixflow-cache/lab)
#   FF_ANDROID_ENV   the toolchain's env.sh (C:/Users/User/.fixflow-cache/android/env.sh)
#   FF_SLOT_SH       the machine-wide slot lock
#   FF_EMU_SERIAL    adb serial of the lab emulator (emulator-5554)
set -u
# MSYS path conversion is turned off for docker and adb ONLY (their arguments are container
# and device paths). Exported globally it also breaks `git -C /c/...` (L2 found this the hard way).
docker() { MSYS_NO_PATHCONV=1 command docker "$@"; }

LAB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAB_LANE="${FF_LAB_LANE:-l3a}"
LAB_PORT="${FF_LAB_PORT:-18431}"
LAB_ROOT="${FF_LAB_ROOT:-/c/Users/User/.fixflow-cache/lab}"
LAB_OUT="$LAB_ROOT/$LAB_LANE"
LAB_RUN="$LAB_OUT/run" # pid files, the emulator log, the slot holder name
ANDROID_ENV="${FF_ANDROID_ENV:-/c/Users/User/.fixflow-cache/android/env.sh}"
SLOT_SH="${FF_SLOT_SH:-/c/Users/User/Documents/projects/EMS_workshop1/docs/program/lab/ff-slot.sh}"
EMU_SERIAL="${FF_EMU_SERIAL:-emulator-5554}"
# Port 5584 is the coordinator's emulator: no lab script may ever drive it.
case "$EMU_SERIAL" in *-5584 | *:5584) echo "error: $EMU_SERIAL is the coordinator's emulator: refusing" >&2 && exit 1 ;; esac
APP_PKG="com.fixflow.technician"
# The only API base a lab APK may bake (plan 7.5: no lab build can reach a real server).
LAB_API_URL="http://10.0.2.2:$LAB_PORT"
# The lab-only technician the emulator signs in as (plan 7.5: lab accounts, never a roster
# technician). lab-backend.sh creates it in the throwaway lab database; no migration seeds it.
LAB_TECH_ID="${FF_LAB_TECH_ID:-lab1}"
LAB_TECH_NAME="LAB technician"
LAB_TECH_PIN="${FF_LAB_TECH_PIN:-2580}"
# The app under test: the fleet's commit. The lab backend is built from the same commit, so the
# pair is consistent whatever this checkout's own backend/ is.
LAB_APP_REF="${FF_LAB_APP_REF:-a31924a}"

# Container names: everything this lab creates starts with fixflow-<lane>-lab so a teardown
# can never touch another project's (or another lane's) containers.
C_DB="fixflow-$LAB_LANE-labdb"
C_API="fixflow-$LAB_LANE-labapi"
C_STUB="fixflow-$LAB_LANE-labstub"

log() { echo "[$(date +%H:%M:%S)] $*" >&2; }
die() {
  echo "error: $*" >&2
  exit 1
}

# Working outputs never go into a checkout: refuse a lab root inside this repository.
case "$(cd "$LAB_ROOT" 2> /dev/null && pwd -P || echo "$LAB_ROOT")/" in
  "$(cd "$LAB_DIR/../../.." && pwd -P)"/*) die "FF_LAB_ROOT=$LAB_ROOT is inside the repository" ;;
esac
mkdir -p "$LAB_RUN"

load_android_env() {
  [ -f "$ANDROID_ENV" ] || die "no toolchain env at $ANDROID_ENV (is the Android toolchain installed?)"
  # shellcheck disable=SC1090
  source "$ANDROID_ENV"
  [ -x "$FF_ADB" ] || die "adb not found at $FF_ADB"
}

# adb against the lab emulator only: never a USB phone (plan: never touch a real phone).
adbx() { MSYS_NO_PATHCONV=1 "$FF_ADB" "$@"; }
adb_() { adbx -s "$EMU_SERIAL" "$@"; }
# A shell command as root on the emulator (the google_apis image allows `adb root`).
ash() { adb_ shell "$@" | tr -d '\r'; }

# Refuse to run against anything that is not an emulator: a physical device has no
# ro.kernel.qemu=1 / ro.boot.qemu=1.
require_emulator() {
  case "$EMU_SERIAL" in emulator-*) ;; *) die "FF_EMU_SERIAL=$EMU_SERIAL is not an emulator serial" ;; esac
  local q
  q="$(ash getprop ro.boot.qemu)$(ash getprop ro.kernel.qemu)"
  case "$q" in *1*) ;; *) die "$EMU_SERIAL does not report ro.boot.qemu=1: refusing (real device?)" ;; esac
}

stamp() { date +%Y%m%dT%H%M%S; }
# The emulator's keeper stops an idle emulator (emu.sh, FF_EMU_IDLE_MIN): a script driving it
# says so with a busy marker for as long as it runs.
lab_busy() { echo "$$" > "$LAB_RUN/busy-$$.pid"; }
lab_idle() { rm -f "$LAB_RUN/busy-$$.pid"; }
lab_any_busy() { # any busy marker whose process is alive (stale ones are removed)
  local f p r=1
  for f in "$LAB_RUN"/busy-*.pid; do
    [ -f "$f" ] || continue
    p="$(cat "$f" 2> /dev/null)"
    if [ -n "$p" ] && kill -0 "$p" 2> /dev/null; then r=0; else rm -f "$f"; fi
  done
  return $r
}
winpath() { if command -v cygpath > /dev/null; then cygpath -m "$1"; else echo "$1"; fi; }

# psql against the lab database; prints unaligned rows.
lab_sql() { docker exec -i "$C_DB" psql -U postgres -d fixflow -X -A -F '|' -P footer=off -c "$1"; }

# The lab API from the host (the same port the emulator uses as 10.0.2.2).
lab_curl() { curl -sS -m 20 "$@"; }
LAB_HOST_URL="http://127.0.0.1:$LAB_PORT"

# Every adb.exe on this PC with its command line (Windows; to show that no logcat stream
# outlives a protocol: binding review of #194, item 11).
adb_procs() {
  powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"name='adb.exe'\" | ForEach-Object { '{0} {1}' -f \$_.ProcessId, \$_.CommandLine }" 2> /dev/null | tr -d '\r'
}
