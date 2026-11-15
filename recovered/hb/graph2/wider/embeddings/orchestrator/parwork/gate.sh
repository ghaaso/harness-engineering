#!/bin/sh
# parwork start gates (task rule 3). Logs every sample to logs/gate.log.
#   gate.sh first   no kge-* container running; then 3 samples 30 s apart: free >= 4.5 GB and commit < 40 GB; C: >= 20 GB
#   gate.sh second  only kge-P* running (no other kge-*); 3 samples 30 s apart: free >= 6 GB and commit < 38 GB; C: >= 20 GB
#   gate.sh sample  prints "free_kb commit_kb"
PB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/orchestrator/parwork
sample() {
  powershell -NoProfile -c '$o=Get-CimInstance Win32_OperatingSystem; "$($o.FreePhysicalMemory) $($o.TotalVirtualMemorySize - $o.FreeVirtualMemory)"' 2>/dev/null | tr -d '\r'
}
disk_gb() { df -BG /c | awk 'NR==2{gsub("G","",$4); print $4}'; }
log() { echo "$(date -u +%FT%TZ) $*" | tee -a "$PB/logs/gate.log"; }
case "$1" in
  sample) sample; exit 0 ;;
  first) FREE_MIN=4718592; COMMIT_MAX=41943040; OTHERS='^kge-' ;;
  second) FREE_MIN=6291456; COMMIT_MAX=39845888; OTHERS='^kge-([^P]|P[^12]|P[12].)' ;;
  *) echo "usage: gate.sh first|second|sample"; exit 2 ;;
esac
while docker ps --format '{{.Names}}' | grep -Eq "$OTHERS"; do log "$1: waiting, running: $(docker ps --format '{{.Names}}' | grep -E '^kge-' | tr '\n' ' ')"; sleep 30; done
D=$(disk_gb); if [ "${D:-0}" -lt 20 ]; then log "$1: C: free ${D} GB < 20 GB; STOP"; exit 4; fi
ok=0
while [ $ok -lt 3 ]; do
  set -- $(sample)
  if [ -n "$2" ] && [ "$1" -ge $FREE_MIN ] && [ "$2" -lt $COMMIT_MAX ]; then ok=$((ok+1)); r=ok; else ok=0; r=no; fi
  log "gate sample free_kb=$1 commit_kb=$2 -> $r ($ok/3)"
  [ $ok -lt 3 ] && sleep 30
done
log "gate passed; C: free ${D} GB"
exit 0
