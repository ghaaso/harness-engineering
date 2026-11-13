#!/usr/bin/env bash
# Proves the device lab's emulator on this PC: boots AVD ff34 headless, reads what it is, feeds it
# one GPS fix, shuts it down. Takes ONE slot of the shared lock for as long as the emulator runs.
#
#   emulator-boot-proof.sh [gpu mode]      default: host, then swiftshader_indirect if host fails
#
# Output: C:/Users/User/.fixflow-cache/lab/boot-proof/<stamp>/{emulator.log,facts.txt}
# Exit 0 only if Android reported sys.boot_completed=1.
# Never use an ANGLE gpu mode here: the antivirus on this PC blocks the emulator's
# lib64/gles_angle/d3dcompiler_47.dll, and that block is left alone.
set -u
ROOT=/c/Users/User/.fixflow-cache/android
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$ROOT/env.sh"
OUT="/c/Users/User/.fixflow-cache/lab/boot-proof/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"
ADB="$FF_ADB"; EMU="$FF_EMULATOR"
HOLDER="coordinator-emulator-$$"
PORT=5584                                   # not the default 5554, so a lane's emulator is never touched
SERIAL="emulator-$PORT"

say() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$OUT/facts.txt"; }

cleanup() {
  "$ADB" -s "$SERIAL" emu kill >/dev/null 2>&1
  bash "$HERE/ff-slot.sh" release "$HOLDER" >/dev/null 2>&1
}
trap cleanup EXIT

[ -f "$ROOT/avd/ff34.avd/config.ini" ] || { say "no AVD ff34: nothing to boot"; exit 2; }
bash "$HERE/ff-slot.sh" acquire "$HOLDER" 1 "$$" | tee -a "$OUT/facts.txt"

boot_once() {  # $1 = gpu mode; returns 0 when Android finished booting
  local gpu="$1" t0 n=0
  say "starting emulator: gpu=$gpu memory=2048 headless port=$PORT"
  t0=$(date +%s)
  "$EMU" -avd ff34 -port "$PORT" -no-window -no-audio -no-boot-anim -no-snapshot -gpu "$gpu" \
    -memory 2048 -netdelay none -netspeed full > "$OUT/emulator-$gpu.log" 2>&1 &
  EMUPID=$!
  until [ "$("$ADB" -s "$SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do
    n=$((n+1))
    if ! kill -0 "$EMUPID" 2>/dev/null; then say "emulator process exited early (gpu=$gpu); log tail:"; tail -5 "$OUT/emulator-$gpu.log" | tee -a "$OUT/facts.txt"; return 1; fi
    if [ "$n" -ge 100 ]; then say "no boot after $(( $(date +%s) - t0 )) s (gpu=$gpu)"; "$ADB" -s "$SERIAL" emu kill >/dev/null 2>&1; return 1; fi
    sleep 3
  done
  say "BOOTED in $(( $(date +%s) - t0 )) s with gpu=$gpu"
  return 0
}

MODES="${1:-host swiftshader_indirect}"
OK=0
for m in $MODES; do
  if boot_once "$m"; then OK=1; GPU="$m"; break; fi
  sleep 5
done
[ "$OK" = 1 ] || { say "BOOT FAILED in every gpu mode tried: $MODES"; exit 1; }

p() { "$ADB" -s "$SERIAL" shell "$@" 2>/dev/null | tr -d '\r'; }
say "android release: $(p getprop ro.build.version.release)  sdk: $(p getprop ro.build.version.sdk)  abi: $(p getprop ro.product.cpu.abi)"
say "image: $(p getprop ro.build.fingerprint)"
say "hypervisor line: $(grep -i -m1 -E 'whpx|hypervisor|accel' "$OUT/emulator-$GPU.log" | cut -c1-160)"
say "graphics line:   $(grep -i -m1 -E 'opengl (vendor|renderer)|graphics adapter|gpu.*selected|vulkan' "$OUT/emulator-$GPU.log" | cut -c1-200)"
say "play services present: $(p pm list packages com.google.android.gms | head -1)"
say "adb root: $("$ADB" -s "$SERIAL" root 2>&1 | tr -d '\r' | head -1)"
sleep 3
"$ADB" -s "$SERIAL" wait-for-device
# one GPS fix (longitude first): the workshop's coordinates are not known yet (P0a item 9), so a Karachi landmark
"$ADB" -s "$SERIAL" emu geo fix 67.0011 24.8607 >/dev/null 2>&1
sleep 4
say "location after 'geo fix 67.0011 24.8607': $(p dumpsys location | grep -i -m1 -E 'last location=|gps: Location\[' | cut -c1-170)"
say "memory in guest: $(p cat /proc/meminfo | head -1)"
say "host free RAM: $(powershell -NoProfile -Command "'{0:N1} GB' -f ((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB)" | tr -d '\r')"
"$ADB" -s "$SERIAL" emu kill >/dev/null 2>&1
say "emulator stopped; BOOT PROOF OK (gpu=$GPU)"
exit 0
