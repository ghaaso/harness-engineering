#!/bin/sh
# END-ORDER's real (non-test) Python steps (host, Git Bash): ONE CPU container ktest-r<N>, graphtest-kge:1 by its
# image ID (refused when the ID is not the frozen one), --network none --pull never --cpus 2 -m $MEM --memory-swap $MEM
# (1536m, except ktest-r4: MEM_R4 below, the coordinator's round-3 order), EMB_ROOT=/w, work dir /w/train.
# Mounts (ruling 94(d)): exactly the list of the container's name in r58c/B/mounts-B.json, turned into -v flags by
# r58c/B/mounts.js (every read-only source must exist; the writable folders of the list are created); nothing else is
# mounted: no default lane, repository or facts mount. A name without an entry is refused (exit 2). After the start
# the container's `docker inspect` is saved to r58c/mounts/<name>.json (ruling 94(e); an older file of the same name is
# kept as <name>.<UTC of that record>.json); the leak audit reads every *.json there.
# Before it starts: when orchestrator/freeze-list.txt exists, the freeze check (r58c/B/freeze_check.sh) must print
# nothing (exit 5 otherwise); mkdir r58c/ktest.lock (the lane's one-ktest-at-a-time lock, retried every 30 s); no
# ktest-* and no kge-* container running; one memgate sample (exit 9 MEMGATE_EMPTY when it is not two numbers);
# memgate.sh wait, then three samples 30 s apart with free >= 6 GB and commit < 40 GB. The full docker run line goes
# into the log first.
# Limit: one variable per step (LIMIT_R1 .. LIMIT_R10 below; END-ORDER section 0 gives each figure and its basis);
# over it the container is stopped (exit 6).
# Exit: the command's exit code, or lane_step's own: 2 usage or no mount entry, 4 not started, 5 the freeze check
# failed, 6 over the limit, 9 MEMGATE_EMPTY. The LAST line of the log decides whose code it is: "<name>: rc N;
# command: ..." is the command's code; any other last line is lane_step's own. Logs: r58c/B/lane-steps/<name>-<stamp>.log.
# After `docker run` it looks again (r58c/B/race_gate.sh): the container waits for /tmp/go and is released only when
# no other matching container runs; otherwise it is removed before its release (it has run nothing) and the start is
# retried after a random 30-59 s (coordinator, after ktest-b13 and ktest-G40 started in the same second).
# usage: sh lane_step.sh ktest-r<N> "<command>"
NAME=$1; CMD=$2
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
CPU_ID=sha256:55715543bc43c85e8426eb6934d9ba8196307b0ef0b0ccd357da85350ac97711
# the per-step limits in seconds (change 5 of end-order-changes-2: at least three times the figure measured on
# full-size stand-ins; END-ORDER section 0 lists each figure)
LIMIT_R1=3600   # selectB: measured 88.6 s (full-size stand-in, ktest-b46; 40x)
LIMIT_R2=3600   # report.py: measured 121.1 s (full-size stand-in, ktest-b49; 30x)
LIMIT_R3=3600   # item27: not measured; reads the tables as selectB does (88.6 s), 40x that
LIMIT_R4=3600   # answer_level tune: measured 76.9 s, 40 variants, 313 tasks (agent A's time_tune late50, ktest-a15; 47x)
LIMIT_R5=3600   # item22: measured 325 s (E4 top3[0], 95 epochs on CPU, ktest-b48; 11x)
LIMIT_R6=900    # write_result
LIMIT_R7=900    # write_audit_claims
LIMIT_R8=900    # pre-check, tuning hand-off
LIMIT_R9=900    # pre-check, held-out hand-off
LIMIT_R10=3600  # leak audit: agent A's figure (END-ORDER section 0)
# the memory cap (-m and --memory-swap): 1536m for every step except r4, whose stand-in run peaked at RSS 1,402 MB
# (container 1,532 MB of a 1,536 MB cap; agent A's time_tune late50): at least 3 x 1,402 MB = 4,206 MB (coordinator, round 3)
MEM=1536m
MEM_R4=4400m
[ $# -eq 2 ] && [ -n "$CMD" ] || { echo "usage: sh lane_step.sh ktest-r<N> \"<command>\""; exit 2; }
case "$NAME" in
  ktest-r1) LIMIT=$LIMIT_R1 ;; ktest-r2) LIMIT=$LIMIT_R2 ;; ktest-r3) LIMIT=$LIMIT_R3 ;; ktest-r4) LIMIT=$LIMIT_R4; MEM=$MEM_R4 ;;
  ktest-r5) LIMIT=$LIMIT_R5 ;; ktest-r6) LIMIT=$LIMIT_R6 ;; ktest-r7) LIMIT=$LIMIT_R7 ;; ktest-r8) LIMIT=$LIMIT_R8 ;;
  ktest-r9) LIMIT=$LIMIT_R9 ;; ktest-r10) LIMIT=$LIMIT_R10 ;;
  ktest-r[0-9]*) LIMIT=600 ;;  # a name of the plumbing tests only; it needs its own entry in the mounts file as well
  *) echo "lane_step: the name must be ktest-r<N>"; exit 2 ;;
esac
STAMP=$(date -u +%Y%m%dT%H%M%SZ); mkdir -p $WB/r58c/B/lane-steps; LOG=$WB/r58c/B/lane-steps/$NAME-$STAMP.log
say() { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
MOUNTS=$(MSYS_NO_PATHCONV=1 node "$W/r58c/B/mounts.js" flags "$W/r58c/B/mounts-B.json" "$NAME" 2>&1); mrc=$?
case $mrc in 0) ;; 3) say "lane_step: $MOUNTS; not started"; exit 4 ;; *) say "lane_step: $MOUNTS"; exit 2 ;; esac
say "mounts of $NAME (r58c/B/mounts-B.json sha256 $(sha256sum $WB/r58c/B/mounts-B.json | cut -c1-64)): $MOUNTS"
if [ -f $WB/orchestrator/freeze-list.txt ]; then
  out=$(sh $WB/r58c/B/freeze_check.sh 2>&1); frc=$?
  [ $frc -eq 0 ] && [ -z "$out" ] || { say "lane_step: freeze check failed (rc $frc): $out"; exit 5; }
  say "freeze check: nothing printed, rc 0"
else
  say "no orchestrator/freeze-list.txt yet: no freeze check"
fi
IMGID=$(docker image inspect -f '{{.Id}}' graphtest-kge:1 2>/dev/null | tr -d '\r')
[ "$IMGID" = "$CPU_ID" ] || { say "lane_step: image $IMGID is not $CPU_ID"; exit 4; }
until mkdir $WB/r58c/ktest.lock 2>/dev/null; do say "$NAME: r58c/ktest.lock held; retry in 30 s"; sleep 30; done
trap 'rmdir $WB/r58c/ktest.lock 2>/dev/null' EXIT
docker ps -a --format '{{.Names}}' | grep -qx "$NAME" && { say "$NAME exists: not starting"; exit 4; }
. $WB/r58c/B/race_gate.sh
while :; do
while docker ps --format '{{.Names}}' | grep -qE '^(ktest|kge)-'; do say "$NAME: a ktest-* or kge-* container runs; retry in 30 s"; sleep 30; done
m=$(rg_sample_ok $WB/orchestrator/memgate.sh) || { say "$NAME: MEMGATE_EMPTY: $m; not started (run the launcher from a shell where orchestrator/memgate.sh sample prints two numbers)"; exit 9; }
sh $WB/orchestrator/memgate.sh wait
ok=0; n=0
while [ $ok -lt 3 ]; do
  set -- $(sh $WB/orchestrator/memgate.sh sample)
  case "$1$2" in ""|*[!0-9]*) ok=0 ;; *) if [ "$1" -ge 6291456 ] && [ "$2" -lt 41943040 ]; then ok=$((ok+1)); else ok=0; fi ;; esac
  n=$((n+1)); [ $n -ge 80 ] && { say "$NAME: start rule not met in 80 samples; not started"; exit 4; }
  [ $ok -lt 3 ] && sleep 30
done
RUN="docker run -d --pull never --name $NAME --network none --cpus 2 -m $MEM --memory-swap $MEM -e EMB_ROOT=/w -e KGE_DEVICE=cpu -e OMP_NUM_THREADS=2 -e MKL_NUM_THREADS=2 -e PYTHONUNBUFFERED=1 -e PYTHONDONTWRITEBYTECODE=1 -e HOME=/tmp -e PYSTOW_HOME=/tmp/pystow $MOUNTS -w /w/train $IMGID sh -c"
say "docker run line: $RUN \"$(rg_wrap "$CMD")\""
MSYS_NO_PATHCONV=1 $RUN "$(rg_wrap "$CMD")" >/dev/null 2>>"$LOG" || { say "$NAME: docker run failed"; exit 4; }
o=$(rg_clear '^(ktest|kge)-' $NAME) && break
b=$(rg_backoff); say "$NAME: $o runs as well after the start; $NAME removed before its release (it ran nothing); retry in $b s"
docker rm -f $NAME >/dev/null 2>&1; sleep $b
done
mkdir -p $WB/r58c/mounts; MR=$WB/r58c/mounts/$NAME.json
[ -f "$MR" ] && mv "$MR" "$WB/r58c/mounts/$NAME.$(date -u -r "$MR" +%Y%m%dT%H%M%SZ).json"
docker inspect $NAME > "$MR.part" 2>>"$LOG" && mv "$MR.part" "$MR" || { say "$NAME: docker inspect failed; removed before its release"; docker rm -f $NAME >/dev/null 2>&1; exit 4; }
say "$NAME: mount record r58c/mounts/$NAME.json sha256 $(sha256sum "$MR" | cut -c1-64)"
rg_release $NAME || { say "$NAME: release failed"; docker rm -f $NAME >/dev/null 2>&1; exit 4; }
say "$NAME: released (no other ktest-* or kge-* running after its start); limit $LIMIT s"
over=0
if timeout $LIMIT docker wait $NAME >/dev/null 2>&1; then rc=$(docker inspect -f '{{.State.ExitCode}}' $NAME | tr -d '\r'); else docker stop -t 10 $NAME >/dev/null 2>&1; over=1; say "$NAME: over $LIMIT s, stopped"; fi
docker logs $NAME >> "$LOG" 2>&1
docker rm -f $NAME >/dev/null 2>&1
[ $over = 1 ] && { say "lane_step: exit 6 (over the limit of $LIMIT s)"; exit 6; }
say "$NAME: rc $rc; command: $CMD"
exit $rc
