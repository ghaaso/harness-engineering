#!/bin/bash
# usage: anyburl.sh REPO FORM XMX_GB   (runs learn + rename head + apply on every prepared block dir, network off)
# Rules are learned on relation co_a; the head relation is renamed co_b so applying them to the graph filters nothing.
CR=C:/Users/User/Documents/projects/card-run-2026-11
REPO=$1; FORM=$2; XMX=${3:-8}
for d in "$CR/d4/out/anyburl/$REPO/$FORM"/*/; do
  k=$(basename "$d"); [ -f "$d/done" ] && continue
  secs=$(node -e "console.log(require('$d/cfg.json').secs)"); thr=$(node -e "console.log(require('$d/cfg.json').threads)")
  s=$(date +%s)
  MSYS_NO_PATHCONV=1 docker run --rm --network none -m $((XMX+2))g --cpus $thr -v "$d:/w" -v "$CR/tools:/t:ro" -w /w eclipse-temurin:17-jre-jammy bash -c "
    java -Xmx${XMX}g -cp /t/AnyBURL-23-1x.jar de.unima.ki.anyburl.Learn learn.properties > learn.log 2>&1
    sed -E 's/^([0-9]+[[:space:]]+[0-9]+[[:space:]]+[^[:space:]]+[[:space:]]+)co_a\(/\1co_b(/' rules-$secs | grep -E '^[0-9]+[[:space:]]+[0-9]+[[:space:]]+[^[:space:]]+[[:space:]]+co_b\(' > rules-$secs.head
    java -Xmx${XMX}g -cp /t/AnyBURL-23-1x.jar de.unima.ki.anyburl.Apply apply.properties > apply.log 2>&1
    ls -la > ls.txt"
  echo "$(date +%T) anyburl $REPO $FORM block $k wall $(( $(date +%s)-s )) s rules $(wc -l < "$d/rules-$secs.head" 2>/dev/null)"
  touch "$d/done"
done
