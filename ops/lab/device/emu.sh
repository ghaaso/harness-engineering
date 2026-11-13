#!/usr/bin/env bash
# FixFlow device lab: the stock Android 14 emulator (ship plan 7.5, phase L3a).
#
#   bash ops/lab/device/emu.sh start [--window] [--cold]   boot AVD ff34 and wait for boot
#   bash ops/lab/device/emu.sh stop                         shut it down, release the slot
#   bash ops/lab/device/emu.sh status
#
# start: headless by default (-no-window); --window shows it so the owner can watch; --cold
# ignores the quick-boot snapshot (a cold boot). The emulator runs natively on Windows on the
# Windows Hypervisor Platform (Docker has no /dev/kvm here) with `-gpu host` (FF_EMU_GPU
# overrides). It blocks until `sys.boot_completed=1`, records the boot time in
# $LAB_RUN/boot-times.log, enables `adb root`, and prints the GPU renderer actually in use.
#
# Slot: ONE slot of the machine-wide lock (ff-slot.sh) for as long as the emulator runs. A
# detached keeper process acquires the slot with its own PID, launches the emulator as its
# child, waits for it, and releases the slot when it exits, however it exits; ff-slot.sh also
# reaps the slot if the keeper is killed outright. While the emulator holds a slot the Android
# build (weight 2) cannot run: stop the emulator whenever no check is running.
#
# Knobs (env): FF_EMU_GPU (host), FF_EMU_BOOT_TIMEOUT (600 s, after the slot is held),
# FF_EMU_SLOT_TIMEOUT (1800 s), FF_EMU_SERIAL (emulator-5554), FF_EMU_PORT (5554).
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$HERE/lib.sh"
load_android_env

GPU="${FF_EMU_GPU:-host}"
EMU_PORT="${FF_EMU_PORT:-5554}"
BOOT_TIMEOUT="${FF_EMU_BOOT_TIMEOUT:-600}"
SLOT_TIMEOUT="${FF_EMU_SLOT_TIMEOUT:-1800}"
KEEPER_PID_F="$LAB_RUN/emu-keeper.pid"
EMU_PID_F="$LAB_RUN/emu.pid"
KEEPER_LOG="$LAB_RUN/emu-keeper.log"
EMU_LOG="$LAB_RUN/emulator.log"
HOLDER_F="$LAB_RUN/emu-holder"

alive() { [ -n "${1:-}" ] && kill -0 "$1" 2> /dev/null; }
keeper_pid() { cat "$KEEPER_PID_F" 2> /dev/null; }

booted() { [ "$(ash getprop sys.boot_completed 2> /dev/null)" = "1" ]; }

# ---- the keeper (internal): runs detached for the emulator's whole life -------------------
if [ "${1:-}" = "_keeper" ]; then
  shift
  holder="$LAB_LANE-emulator-$$"
  echo "$holder" > "$HOLDER_F"
  echo $$ > "$KEEPER_PID_F"
  emu_pid=""
  finish() {
    [ -n "$emu_pid" ] && alive "$emu_pid" && kill "$emu_pid" 2> /dev/null
    bash "$SLOT_SH" release "$holder" > /dev/null 2>&1
    rm -f "$KEEPER_PID_F" "$EMU_PID_F"
    echo "[$(date +%H:%M:%S)] keeper exit, slot released ($holder)"
  }
  trap finish EXIT
  trap 'exit 143' INT TERM HUP
  echo "[$(date +%H:%M:%S)] waiting for 1 slot as $holder"
  bash "$SLOT_SH" acquire "$holder" 1 $$ || exit 4
  echo "[$(date +%H:%M:%S)] SLOT ACQUIRED"
  "$FF_EMULATOR" -avd "$FF_AVD" -port "$EMU_PORT" -gpu "$GPU" -no-audio -no-boot-anim \
    -netdelay none -netspeed full "$@" > "$EMU_LOG" 2>&1 &
  emu_pid=$!
  echo "$emu_pid" > "$EMU_PID_F"
  echo "[$(date +%H:%M:%S)] EMULATOR STARTED pid=$emu_pid args=$*"
  wait "$emu_pid"
  echo "[$(date +%H:%M:%S)] emulator exited rc=$?"
  emu_pid=""
  exit 0
fi

cmd="${1:-}"
[ -n "$cmd" ] && shift

case "$cmd" in
  start)
    window=0
    cold=0
    for a in "$@"; do
      case "$a" in
        --window) window=1 ;;
        --cold) cold=1 ;;
        *) die "unknown option $a" ;;
      esac
    done
    if alive "$(keeper_pid)"; then
      booted && {
        echo "emulator already running ($EMU_SERIAL)"
        exit 0
      }
      die "a keeper is alive (pid $(keeper_pid)) but $EMU_SERIAL is not booted: run 'emu.sh stop' first"
    fi
    if "$FF_ADB" devices | grep -q "^$EMU_SERIAL"; then
      die "$EMU_SERIAL is already attached but not owned by this lab (another emulator?)"
    fi
    args=()
    [ "$window" -eq 0 ] && args+=(-no-window)
    [ "$cold" -eq 1 ] && args+=(-no-snapshot-load)
    : > "$KEEPER_LOG"
    nohup bash "$HERE/emu.sh" _keeper "${args[@]}" >> "$KEEPER_LOG" 2>&1 < /dev/null &
    disown 2> /dev/null || true
    log "keeper started; waiting for a slot (up to ${SLOT_TIMEOUT}s)"
    t=0
    until grep -q "EMULATOR STARTED" "$KEEPER_LOG" 2> /dev/null; do
      sleep 2
      t=$((t + 2))
      grep -q "keeper exit" "$KEEPER_LOG" 2> /dev/null && die "keeper exited: $(tail -n 3 "$KEEPER_LOG")"
      [ "$t" -ge "$SLOT_TIMEOUT" ] && {
        bash "$HERE/emu.sh" stop > /dev/null 2>&1
        die "no slot within ${SLOT_TIMEOUT}s"
      }
    done
    t0=$(date +%s)
    log "emulator launched ($( [ "$cold" -eq 1 ] && echo cold || echo warm ) boot, gpu=$GPU, $( [ "$window" -eq 1 ] && echo window || echo headless )); waiting for boot"
    "$FF_ADB" -s "$EMU_SERIAL" wait-for-device 2> /dev/null &
    wpid=$!
    until booted; do
      sleep 2
      if [ $(($(date +%s) - t0)) -ge "$BOOT_TIMEOUT" ]; then
        kill "$wpid" 2> /dev/null
        tail -n 20 "$EMU_LOG" >&2
        bash "$HERE/emu.sh" stop > /dev/null 2>&1
        die "not booted within ${BOOT_TIMEOUT}s"
      fi
      alive "$(keeper_pid)" || die "emulator died during boot: $(tail -n 5 "$EMU_LOG")"
    done
    kill "$wpid" 2> /dev/null
    secs=$(($(date +%s) - t0))
    "$FF_ADB" -s "$EMU_SERIAL" root > /dev/null 2>&1
    sleep 2
    "$FF_ADB" -s "$EMU_SERIAL" wait-for-device
    require_emulator
    renderer="$(ash dumpsys SurfaceFlinger 2> /dev/null | grep -m1 -i 'GLES:' | sed 's/^ *//')"
    gpu_log="$(grep -m1 -iE 'graphics backend|gpu emulation|GPU mode|Renderer' "$EMU_LOG" 2> /dev/null | sed 's/^ *//')"
    echo "$(date -Is) boot=$( [ "$cold" -eq 1 ] && echo cold || echo warm ) seconds=$secs gpu_flag=$GPU window=$window renderer=[$renderer] emulog=[$gpu_log]" >> "$LAB_RUN/boot-times.log"
    echo "emulator booted in ${secs}s ($EMU_SERIAL); renderer: ${renderer:-unknown}"
    ;;
  stop)
    kp="$(keeper_pid)"
    ep="$(cat "$EMU_PID_F" 2> /dev/null)"
    if "$FF_ADB" devices | grep -q "^$EMU_SERIAL"; then
      "$FF_ADB" -s "$EMU_SERIAL" emu kill > /dev/null 2>&1 || true
    fi
    for _ in $(seq 1 60); do
      alive "$kp" || break
      sleep 1
    done
    if alive "$kp"; then
      log "keeper still alive after 60 s: killing the emulator and the keeper"
      alive "$ep" && kill "$ep" 2> /dev/null
      sleep 2
      kill "$kp" 2> /dev/null
      # the emulator's own processes, if a Windows-side child survived
      taskkill //F //IM qemu-system-x86_64.exe > /dev/null 2>&1 || true
    fi
    # Backstop: release by the recorded holder name even if the keeper's trap never ran.
    [ -f "$HOLDER_F" ] && bash "$SLOT_SH" release "$(cat "$HOLDER_F")" > /dev/null 2>&1
    rm -f "$KEEPER_PID_F" "$EMU_PID_F" "$HOLDER_F"
    echo "emulator stopped; slot released"
    ;;
  status)
    kp="$(keeper_pid)"
    if alive "$kp"; then echo "keeper: alive (pid $kp)"; else echo "keeper: none"; fi
    "$FF_ADB" devices | sed -n "/^$EMU_SERIAL/p"
    if booted; then echo "boot_completed: 1"; else echo "boot_completed: no"; fi
    bash "$SLOT_SH" status
    tail -n 3 "$LAB_RUN/boot-times.log" 2> /dev/null
    ;;
  *)
    sed -n '2,6p' "$0" >&2
    exit 2
    ;;
esac
