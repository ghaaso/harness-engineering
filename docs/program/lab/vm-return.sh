#!/usr/bin/env bash
# Give the Docker VM's unused memory back to Windows when the host runs short.
#
# Why: WSL2 keeps pages a container has freed inside the VM. Measured on 2026-11-13 after two
# Android builds (6 GB cap each): the VM held 9.0 GB of host RAM while using 3.2 GB inside, and
# the host was down to 1.4 GB free. Dropping the VM's clean caches and compacting its memory
# lets the hypervisor take the free pages back: 9.0 -> 6.2 GB in 40 seconds, host free RAM
# 1.4 -> 4.0 GB. Caches and compaction only: no data is touched, nothing is restarted, no
# Docker or WSL setting is changed.
#
#   vm-return.sh            loop: act when the host has less than FF_VM_RETURN_BELOW_MB free
#   vm-return.sh once       act once, whatever the host has free
#
# Knobs (env): FF_VM_RETURN_BELOW_MB (3000), FF_VM_RETURN_EVERY_S (60), FF_VM_RETURN_MIN_GAIN_MB
# (1500: skip when the VM itself has less than this free, there is nothing to give back).
set -u
BELOW="${FF_VM_RETURN_BELOW_MB:-3000}"
EVERY="${FF_VM_RETURN_EVERY_S:-60}"
MIN_GAIN="${FF_VM_RETURN_MIN_GAIN_MB:-1500}"
LOG="${FF_VM_RETURN_LOG:-/c/Users/User/.fixflow-cache/gate-logs/vm-return.log}"
mkdir -p "$(dirname "$LOG")"

host_free_mb() { awk '/^MemFree:/ {printf "%d", $2/1024}' /proc/meminfo 2>/dev/null; }
# What the VM could give back: its free pages PLUS its disk cache (columns 4 and 6 of `free -m`).
# Counting free pages only was wrong: on 2026-11-14 at 14:04 an image build had filled the VM with
# 12 GB of cache, its "free" read 275 MB, and this script concluded there was nothing to give
# back while the host was down to 1.6 GB.
vm_free_mb() { MSYS_NO_PATHCONV=1 docker run --rm alpine:3 sh -c "free -m | awk 'NR==2 {print \$4 + \$6}'" 2>/dev/null; }

give_back() {
  local before after vmf
  before="$(host_free_mb)"
  vmf="$(vm_free_mb)"
  if [ -z "$vmf" ]; then echo "$(date -Is) docker not reachable; nothing done" >> "$LOG"; return 1; fi
  if [ "${1:-}" != force ] && [ "$vmf" -lt "$MIN_GAIN" ]; then
    echo "$(date -Is) host_free=${before}MB vm_free=${vmf}MB: the VM has nothing to give back" >> "$LOG"
    return 0
  fi
  MSYS_NO_PATHCONV=1 docker run --rm --privileged alpine:3 sh -c \
    "sync; echo 3 > /proc/sys/vm/drop_caches; echo 1 > /proc/sys/vm/compact_memory" > /dev/null 2>&1
  sleep 30
  after="$(host_free_mb)"
  echo "$(date -Is) host_free ${before}MB -> ${after}MB (vm_free was ${vmf}MB)" >> "$LOG"
  echo "VM_RETURN host_free ${before}MB -> ${after}MB"
}

if [ "${1:-}" = once ]; then give_back force; exit $?; fi

while :; do
  f="$(host_free_mb)"
  if [ -n "$f" ] && [ "$f" -lt "$BELOW" ]; then give_back > /dev/null; fi
  sleep "$EVERY"
done
