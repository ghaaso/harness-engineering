#!/bin/sh
# Lane start gate (coordinator's rule of 2026-11-14 09:2xZ). Source it or run it.
#   memgate.sh wait   -> returns 0 once three samples 30 s apart all show host free RAM >= 4.5 GB
#                        AND commit charge < 40 GB (commit = TotalVirtualMemorySize - FreeVirtualMemory, KB)
#   memgate.sh sample -> prints "free_kb commit_kb"
#   memgate.sh low    -> exit 0 if the STOP condition holds now (free < 2.0 GB or commit > 48.5 GB, or the
#                        sample is unreadable)
# A guard stops its container after three consecutive "low" samples.
START_FREE_KB=4718592
START_COMMIT_MAX_KB=41943040
STOP_FREE_KB=${STOP_FREE_KB:-2097152}
STOP_COMMIT_KB=${STOP_COMMIT_KB:-50855936}
sample() {
  powershell -NoProfile -c '$o=Get-CimInstance Win32_OperatingSystem; "$($o.FreePhysicalMemory) $($o.TotalVirtualMemorySize - $o.FreeVirtualMemory)"' 2>/dev/null | tr -d '\r'
}
# operations-06: an unreadable sample (empty, one field, not a number) never starts and counts as LOW, so both
# rules fail closed
num() { case "$1" in ""|*[!0-9]*) return 1 ;; esac; }
startable() { set -- $(sample); num "$1" && num "$2" && [ "$1" -ge $START_FREE_KB ] && [ "$2" -lt $START_COMMIT_MAX_KB ]; }
low() { set -- $(sample); num "$1" && num "$2" || return 0; [ "$1" -lt $STOP_FREE_KB ] || [ "$2" -gt $STOP_COMMIT_KB ]; }
wait_ok() {
  ok=0
  while [ $ok -lt 3 ]; do
    if startable; then ok=$((ok+1)); else ok=0; fi
    [ $ok -lt 3 ] && sleep 30
  done
  return 0
}
case "$1" in
  wait) wait_ok ;;
  sample) sample ;;
  low) low ;;
esac
