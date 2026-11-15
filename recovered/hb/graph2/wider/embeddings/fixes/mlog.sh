#!/bin/sh
# Host logger for the release-gate device-01 runs (2026-11-14): while kge-F1 exists, docker stats MemUsage every
# ~5 s (peak tracking) with nvidia-smi (temp, power, card memory, utilisation; runs are short), every 30 s memgate's sample
# (free KB, commit KB) and the host CPU load (%). usage: sh mlog.sh <logfile>
OUT=$1; WB=$(dirname "$0")/..
echo "# $(date -u +%FT%TZ) start" >> "$OUT"
i=0; n=0
while [ $n -lt 30 ] && [ -z "$(docker ps -q -f name=^kge-F1$)" ]; do sleep 2; n=$((n+1)); done
while [ -n "$(docker ps -q -f name=^kge-F1$)" ]; do
  echo "stats $(date -u +%T) $(docker stats --no-stream --format '{{.MemUsage}} {{.CPUPerc}}' kge-F1 2>/dev/null)" >> "$OUT"
  echo "smi $(date -u +%T) $(nvidia-smi --query-gpu=temperature.gpu,power.draw,memory.used,utilization.gpu --format=csv,noheader 2>&1)" >> "$OUT"
  if [ $((i % 6)) -eq 0 ]; then
    echo "host $(date -u +%T) mem $(sh "$WB/orchestrator/memgate.sh" sample) load% $(powershell -NoProfile -Command '(Get-CimInstance Win32_Processor | Measure-Object LoadPercentage -Average).Average' 2>/dev/null | tr -d '\r')" >> "$OUT"
  fi
  i=$((i+1)); sleep 5
done
echo "# $(date -u +%FT%TZ) end" >> "$OUT"
