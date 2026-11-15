#!/bin/sh
# END-ORDER step 2c, the coordinator's re-run check (card window ONLY; after stage B has left the card and before the
# code freeze). Host launcher, not hashed. For each of the fifteen settings the unit at the 100th stage-B `done` line
# of that setting in train/progress.jsonl (rule and its fallbacks: r58c/B/rerun/rerun_check.py) is trained again in a
# fresh process on the card (E4 with ruling 67's det settings) and compared with its stage-B part under ruling 68.
# usage: sh rerun_check.sh            (no options; RR_LIMIT=<seconds> overrides the 5,400 s hard limit)
# One container kge-R1: the GPU image by ID, --gpus all --network none --pull never --cpus 6 -m 2560m
# --memory-swap 2560m. Mounts (ruling 94(d)): exactly kge-R1's list in r58c/B/mounts-B.json (through r58c/B/mounts.js):
# train/, export/, eval/, orchestrator/ and r58c/B/rerun/ READ-ONLY; the only writable mount is the scratch folder
# r58c/B/rerun-out/<stamp>/ (nothing is written under train/ or export/). Its docker inspect is saved, while the
# container is still held, to r58c/mounts/kge-R1.json (ruling 94(e); an older one is kept as kge-R1.<UTC of that record>.json; the
# leak audit reads every *.json there). kge-R1 mounts the scratch parent r58c/B/rerun-out writable at /w/rerun-out and
# works in /w/rerun-out/<STAMP> (r58c/B/mounts-B.json holds no token: leak_audit.py matches {ARM} only).
# Start rule (memgate.sh wait, then ruling 79's: three samples 30 s apart with free >= 6 GB and commit < 38 GB);
# C: >= 15 GB free; no other kge-* running (refused, exit 4) and no ktest-* running (waited for, at most 40 checks
# 30 s apart, then exit 4); nothing present under the name kge-R1.
# After `docker run` it looks again (r58c/B/race_gate.sh): the container waits for /tmp/go and is released only when
# no other matching container runs; otherwise it is removed before its release (it has run nothing) and the start is
# retried (at most 10 times) after a random 30-59 s (coordinator, after ktest-b13 and ktest-G40 started in the same second).
# Stops (and reports before anything else runs): the hard limit; the card above 10 GB used or the container above
# 3.5 GB (ruling 86's probe stop rule); three memgate "low" samples. Exit: rerun_check.py's (0 all equal, 1 a
# mismatch, 3 an error) or 4 not started / stopped, or 9 MEMGATE_EMPTY (one sample before memgate.sh wait was
# not two numbers). A nonzero exit goes to the coordinator before anything else.
WD=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/r58c/B/rr101test/z-before
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/r58c/B/rr101test/z-before
NAME=kge-R1; IMAGE=graphtest-kge-gpu:1
WANT_ID=sha256:a890c54808c11c460d910945c4bf981390f7de43c8dfc5840269b76f5861cbe7
LIMIT=${RR_LIMIT:-5400}
[ $# -eq 0 ] || { echo "rerun_check.sh takes no options"; exit 2; }
STAMP=$(date -u +%Y%m%dT%H%M%SZ); OUT=$WB/r58c/B/rerun-out/$STAMP; mkdir -p "$OUT" || exit 4
LOG=$OUT/driver.log
say() { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
IMGID=$(docker image inspect -f '{{.Id}}' "$IMAGE" 2>/dev/null | tr -d '\r')
[ "$IMGID" = "$WANT_ID" ] || { say "image $IMAGE is $IMGID, not $WANT_ID: not starting"; exit 4; }
. $WB/r58c/B/race_gate.sh
tries=0
while :; do
docker ps -a --format '{{.Names}}' | grep -qx $NAME && { say "$NAME exists: not starting"; exit 4; }
docker ps --format '{{.Names}}' | grep -q '^kge-' && { say "another kge-* container runs ($(docker ps --format '{{.Names}}' | grep '^kge-' | tr '\n' ' ')): the card window has not opened; not starting"; exit 4; }
w=0; while docker ps --format '{{.Names}}' | grep -q '^ktest-'; do w=$((w+1)); [ $w -gt 40 ] && { say "a ktest-* container ran through 40 checks 30 s apart: not starting"; exit 4; }; say "a ktest-* container runs; retry in 30 s"; sleep 30; done
m=$(rg_sample_ok $WB/orchestrator/memgate.sh) || { say "MEMGATE_EMPTY: $m; not started (run the launcher from a shell where orchestrator/memgate.sh sample prints two numbers)"; exit 9; }
say "memgate wait"; sh $WB/orchestrator/memgate.sh wait
ok=0; n=0
while [ $ok -lt 3 ]; do
  set -- $(sh $WB/orchestrator/memgate.sh sample)
  case "$1$2" in ""|*[!0-9]*) ok=0 ;; *) if [ "$1" -ge 6291456 ] && [ "$2" -lt 39845888 ]; then ok=$((ok+1)); else ok=0; fi ;; esac
  say "start sample: free_kb $1 commit_kb $2 (ok $ok of 3)"
  n=$((n+1)); [ $n -ge 80 ] && { say "ruling 79's start rule not met in 80 samples: not starting"; exit 4; }
  [ $ok -lt 3 ] && sleep 30
done
MOUNTS=$(MSYS_NO_PATHCONV=1 node "$WD/r58c/B/mounts.js" flags "$WD/r58c/B/mounts-B.json" $NAME $STAMP 2>&1) || { say "mounts: $MOUNTS; not starting"; exit 4; }
say "mounts of $NAME (r58c/B/mounts-B.json sha256 $(sha256sum $WB/r58c/B/mounts-B.json | cut -c1-64)): $MOUNTS"
f=$(df -BG /c | awk 'NR==2{gsub("G","",$4); print $4}'); [ "${f:-0}" -ge 15 ] || { say "C: ${f} GB free under 15: not starting"; exit 4; }
MSYS_NO_PATHCONV=1 docker run -d --rm --pull never --name $NAME --gpus all --network none --cpus 6 -m 2560m --memory-swap 2560m \
  -e EMB_ROOT=/w -e OMP_NUM_THREADS=6 -e MKL_NUM_THREADS=6 -e PYTHONUNBUFFERED=1 -e PYTHONDONTWRITEBYTECODE=1 -e HOME=/tmp \
  -e PYSTOW_HOME=/tmp/pystow -e KGE_DEVICE=cuda -e RERUN_TRAIN=/w/train -e RR_ORCH=/w/orchestrator \
  $MOUNTS -w /w/rerun-out/$STAMP "$IMGID" sh -c \
  "$(rg_wrap "python /w/rr/rerun_check.py run --tree /w/train --out /w/rerun-out/$STAMP > /w/rerun-out/$STAMP/run.log 2>&1; echo \$? > /w/rerun-out/$STAMP/rc")" \
  >/dev/null 2>>"$LOG" || { say "docker run failed"; exit 4; }
o=$(rg_clear '^(kge|ktest)-' $NAME) && break
docker rm -f $NAME >/dev/null 2>&1; tries=$((tries+1))
[ $tries -ge 10 ] && { say "$o ran as well after each of 10 starts: not starting"; exit 4; }
b=$(rg_backoff); say "$o runs as well after the start; $NAME removed before its release (it ran nothing); retry in $b s"; sleep $b
done
mkdir -p $WB/r58c/mounts; MR=$WB/r58c/mounts/$NAME.json; [ -f "$MR" ] && mv "$MR" "$WB/r58c/mounts/$NAME.$(date -u -r "$MR" +%Y%m%dT%H%M%SZ).json"
docker inspect $NAME > "$MR.part" 2>>"$LOG" && mv "$MR.part" "$MR" || { say "docker inspect of $NAME failed; removed before its release"; docker rm -f $NAME >/dev/null 2>&1; exit 4; }
say "mount record r58c/mounts/$NAME.json sha256 $(sha256sum "$MR" | cut -c1-64)"
rg_release $NAME || { say "release of $NAME failed"; docker rm -f $NAME >/dev/null 2>&1; exit 4; }
T0=$(date +%s); say "started $NAME (image $IMGID), limit $LIMIT s"
low=0; stop=
while docker ps --format '{{.Names}}' | grep -qx $NAME; do
  el=$(( $(date +%s) - T0 ))
  card=$(nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits 2>/dev/null | head -1 | tr -d '\r ')
  mem=$(docker stats --no-stream --format '{{.MemUsage}}' $NAME 2>/dev/null | awk '{print $1}')
  mb=$(echo "$mem" | awk '/GiB/{sub("GiB","");printf "%d",$1*1024;exit} /MiB/{sub("MiB","");printf "%d",$1;exit} {print 0}')
  echo "$(date -u +%FT%TZ) $el $(sh $WB/orchestrator/memgate.sh sample) card_mib ${card:-?} container $mem" >> "$OUT/host-load.tsv"
  if sh $WB/orchestrator/memgate.sh low; then low=$((low+1)); else low=0; fi
  [ $el -ge $LIMIT ] && stop="the hard limit of $LIMIT s"
  [ -n "$card" ] && [ "$card" -gt 10240 ] 2>/dev/null && stop="the card at $card MiB (> 10 GB, ruling 86)"
  [ "${mb:-0}" -gt 3584 ] && stop="the container at $mem (> 3.5 GB, ruling 86)"
  [ $low -ge 3 ] && stop="three memgate low samples"
  if [ -n "$stop" ]; then say "STOP: $stop; stopping $NAME; report to the coordinator before anything else runs"; docker stop -t 5 $NAME >/dev/null 2>&1; exit 4; fi
  sleep 10
done
rc=$(cat "$OUT/rc" 2>/dev/null | tr -d '\r'); say "ended rc=${rc:-none} after $(( $(date +%s) - T0 )) s; results in r58c/B/rerun-out/$STAMP/"
tail -1 "$OUT/run.log" | tee -a "$LOG"
[ "$rc" = 0 ] || say "NOT EQUAL OR NOT COMPLETE: report r58c/B/rerun-out/$STAMP/result.json to the coordinator before anything else runs"
exit ${rc:-4}
