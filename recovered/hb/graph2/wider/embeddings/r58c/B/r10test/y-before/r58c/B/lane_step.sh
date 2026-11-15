#!/bin/sh
# END-ORDER's real (non-test) Python steps (host, Git Bash): ONE CPU container ktest-r<N>, graphtest-kge:1 by its
# image ID (refused when the ID is not the frozen one), --network none --pull never --cpus 2 -m $MEM --memory-swap $MEM
# (1536m, except ktest-r4: MEM_R4 below, the coordinator's round-3 order), EMB_ROOT=/w, work dir /w/train.
# Start rule: three samples 30 s apart, free >= 6 GB and commit < 40 GB; ktest-r4 (4g) takes ruling 79's: commit < 38 GB.
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
# Limit: one variable per step (LIMIT_R1 .. LIMIT_R11 below; END-ORDER section 0 gives each figure and its basis);
# over it the container is stopped (exit 6).
# Exit: the command's exit code, or lane_step's own: 2 usage or no mount entry, 4 not started, 5 the freeze check
# failed, 6 over the limit, 9 MEMGATE_EMPTY, 10 step 9.1's verdict is not a pass (below). The LAST line of the log decides whose code it is: "<name>: rc N;
# command: ..." is the command's code; any other last line is lane_step's own. Logs: r58c/B/lane-steps/<name>-<stamp>.log.
# After `docker run` it looks again (r58c/B/race_gate.sh): the container waits for /tmp/go and is released only when
# no other matching container runs; otherwise it is removed before its release (it has run nothing) and the start is
# retried after a random 30-59 s (coordinator, after ktest-b13 and ktest-G40 started in the same second).
# Step 9.1 (ktest-r10, the leak audit): leak_audit.py exits 0 when its verdict is FAIL (agent A, round 8), so its exit
# code alone is not the step's result. After a command rc of 0, lane_step reads train/leak_audit/leak_audit.json and
# exits 10 unless that file was written by this run (its mtime is later than before the start, or it did not exist)
# and says "ok": true and "test": false. A non-zero command rc stays the command's. leak_audit.py is not changed.
# usage: sh lane_step.sh ktest-r<N> "<command>"
NAME=$1; CMD=$2
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/r58c/B/r10test/y-before
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/r58c/B/r10test/y-before
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
LIMIT_R11=1800  # E5 route audit (ruling 97, step 9.2a): stand-in 7.0 s over all 123 graphs0 folders (ktest-b83; about 250x)
# the memory cap (-m and --memory-swap): 1536m for every step except r4, whose stand-in run peaked at RSS 1,402 MB
# (container 1,532 MB of a 1,536 MB cap; agent A's time_tune late50): at least 3 x 1,402 MB; the coordinator rules 4g, ruling
# 79/item 2's maximum, with ruling 79's start rule for that container (commit < 38 GB, not 40)
MEM=1536m
MEM_R4=4g
COMMIT_KB=41943040     # 40 GB: the ktest rule (change 3 of end-order-changes-2)
COMMIT_R4=39845888     # 38 GB: ruling 79's start rule, for ktest-r4 only
[ $# -eq 2 ] && [ -n "$CMD" ] || { echo "usage: sh lane_step.sh ktest-r<N> \"<command>\""; exit 2; }
case "$NAME" in
  ktest-r1) LIMIT=$LIMIT_R1 ;; ktest-r2) LIMIT=$LIMIT_R2 ;; ktest-r3) LIMIT=$LIMIT_R3 ;; ktest-r4) LIMIT=$LIMIT_R4; MEM=$MEM_R4; COMMIT_KB=$COMMIT_R4 ;;
  ktest-r5) LIMIT=$LIMIT_R5 ;; ktest-r6) LIMIT=$LIMIT_R6 ;; ktest-r7) LIMIT=$LIMIT_R7 ;; ktest-r8) LIMIT=$LIMIT_R8 ;;
  ktest-r9) LIMIT=$LIMIT_R9 ;; ktest-r10) LIMIT=$LIMIT_R10 ;; ktest-r11) LIMIT=$LIMIT_R11 ;;
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
  case "$1$2" in ""|*[!0-9]*) ok=0 ;; *) if [ "$1" -ge 6291456 ] && [ "$2" -lt $COMMIT_KB ]; then ok=$((ok+1)); else ok=0; fi ;; esac
  n=$((n+1)); [ $n -ge 80 ] && { say "$NAME: start rule not met in 80 samples; not started"; exit 4; }
  [ $ok -lt 3 ] && sleep 30
done
VJ=$W/train/leak_audit/leak_audit.json   # step 9.1's verdict file (ktest-r10 only)
mt() { node -e 'const fs=require("fs");try{console.log(Math.floor(fs.statSync(process.argv[1]).mtimeMs))}catch(e){console.log(-1)}' "$1"; }
[ "$NAME" = ktest-r10 ] && VJ0=$(mt "$VJ")
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
if [ "$NAME" = ktest-r10 ] && [ "$rc" = 0 ]; then
  v=$(node -e 'const fs=require("fs");const [f,m0]=process.argv.slice(1);const v=(()=>{let st;try{st=fs.statSync(f)}catch(e){return "NO missing"}
    if(!(Math.floor(st.mtimeMs)>Number(m0)))return "NO not written by this run (mtime "+Math.floor(st.mtimeMs)+" <= "+m0+" before the start)";
    let j;try{j=JSON.parse(fs.readFileSync(f,"utf8"))}catch(e){return "NO unreadable: "+e.message}
    return j.ok===true&&j.test===false?"OK ok true, test false":"NO ok "+JSON.stringify(j.ok)+", test "+JSON.stringify(j.test)})();console.log(v)' "$VJ" "$VJ0")
  case "$v" in
    OK*) say "step 9.1 verdict: train/leak_audit/leak_audit.json sha256 $(sha256sum "$WB/train/leak_audit/leak_audit.json" | cut -c1-64): ${v#OK }" ;;
    *) say "$NAME: rc $rc; command: $CMD"; say "lane_step: exit 10 (step 9.1 verdict not a pass: ${v#NO }; the audit exited 0)"; exit 10 ;;
  esac
fi
say "$NAME: rc $rc; command: $CMD"
exit $rc
