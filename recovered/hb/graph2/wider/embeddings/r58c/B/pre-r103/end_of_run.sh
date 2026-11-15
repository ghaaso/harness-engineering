#!/bin/sh
# End-of-run procedure of the single stage-B guard (review findings evidence-2, guard-complete-without-assembly-or-
# validation; coordinator follow-up of 2026-11-14). Run it by hand once guard-stageB.sh has logged
# "stage B complete: no unit left". It is the ONLY writer of the RUNLOG line `PASS assemble-checks <log>` that
# selectB.py, report.py and item27.py require; none of them runs before that line exists.
#   1  preconditions: the guard log's last state line is "stage B complete"; its last `guard start` line reads
#      "cap 4g" (ruling 101 (d), the cap of ruling 98: a guard restarted after a quarantine goes through
#      orchestrator/start-guard-r98.sh; exit 15 otherwise); no kge-* and no ktest-* container runs; C: has >= 10 GB free.
#   2  host (node): `guard-prelaunch.js left` must print 0.
#   3  host (node): `guard-prelaunch.js validate` over every arm: missing=0 and quarantined=0 (a quarantined unit is
#      redone by the guard, so the procedure stops there).
#   4  one memgate sample first: empty or not two numbers -> exit 14 MEMGATE_EMPTY (no waiting); then only once the
#      lane lock r58c/ktest.lock is taken (until mkdir, as r58c/B/ktest.sh; the coordinator's grader holds the same
#      lock; freed right after the container ends, or on any exit after it was taken) and the
#      memgate start rule holds (three samples 30 s apart: free >= 6 GB and commit < 40 GB; up to
#      EOR_MEM_TRIES tries, else stop) and still no kge-*/ktest-* runs,
#      then (ruling 82, round r58c) every PLANNED tables/<arm>_<cid>_s<seed>_meta.json is deleted on the host (exit 44
#      if one cannot be), because stageB.py assemble skips a set whose _meta.json exists: without the drop a part
#      redone after its set was assembled would never reach the table; then
#      ONE CPU container ktest-eor (graphtest-kge:1 by image ID, --network none --pull never --cpus 2 -m 1536m; no card)
#      with exactly ktest-eor's mount list in r58c/B/mounts-B.json, built by r58c/B/mounts.js (ruling 101 (e), 94(d)):
#      export/checkpoints.py and the two parents files, eval/ and train/ read-only, orchestrator/assemble_checks.py
#      read-only, ONLY train/stageB/tables and the log folder orchestrator/end-of-run (at /w/eor) writable; the docker
#      run line goes into the summary, and the container's `docker inspect` is saved to r58c/mounts/<name>.json
#      before its release (an older record of that name is kept as r58c/mounts/<name>.<UTC>.json; exit 45 when the
#      mount list does not build, 46 when the record cannot be saved; nothing has run then);
#      `python stageB.py assemble` (every arm), then, only if it exited 0,
#      `python /w/orchestrator/assemble_checks.py --train /w/train` (it prints its own sha256) into the log.
#   5  host (node): validate again (missing=0, quarantined=0).
#   6  host (node): every (arm, config, seed) of plan.json has tables/<arm>_<cid>_s<seed>_meta.json with plan.json's
#      plan_hash and parts = the plan's checkpoint count, plus both scope tables and _counts.json (`check-tables`).
#   7  only when 4-6 passed, the log shows `assemble_checks PASS` with the sha256 of the current
#      orchestrator/assemble_checks.py, no REFUSED line, the part count equal to the plan's (--plan), the HD-12 line
#      `e4_det1 <n> of <n> e4_parts, planned <n>` (every planned E4 part ran det=1; else 74) and the `tables_digest`
#      of ruling 82 (plan.json's bytes and every planned set's decompressed pool/unrestricted tables and counts file;
#      selectB's guard recomputes it from the tables, so any later change to a table, a counts file or plan.json makes
#      this PASS stale): append `PASS assemble-checks <log, relative to the lane root> tables_digest <hex>` to the
#      RUNLOG (the guard requires the digest on the line to equal the log's and the current tables'). Any failure
#      appends nothing and exits non-zero.
# usage: sh end_of_run.sh                 the real run (lane defaults below)
#        sh end_of_run.sh check-tables    step 6 alone (prints "check-tables ok=<n> bad=<n>", exit 0 only if bad=0)
# env (the plumbing test points these at a COPY; the real run leaves them unset):
#   EOR_WD (lane root, C:/ form for docker -v)  EOR_WB (/c/ form)  EOR_EXPORT  EOR_EVAL  EOR_GUARD_LOG  EOR_RUNLOG
#   EOR_LOGDIR (C:/ form, inside the lane root)  EOR_NAME (ktest-N)  EOR_TIMEOUT (s, default LIMIT_ASSEMBLE)  EOR_MEM_TRIES
#   EOR_MOUNTS (C:/ form: a mounts file holding a ktest-eor entry; the test's copy names its own folders; default
#   LANE/r58c/B/mounts-B.json). EOR_EXPORT and EOR_EVAL are no longer read: the mount list names every source.
#   EOR_DOCKER_PS  plumbing test ONLY: a fake command answering the two "docker ps" precondition checks (step 1 and
#                  "started meanwhile", exit 11), so the test never depends on the real kge-B1 or on other lanes'
#                  containers; unset in the real run, so the real docker ps is asked and any kge-*/ktest-* stops it.
WD=${EOR_WD:-C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings}
WB=${EOR_WB:-/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings}
REAL=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
MOUNTS=${EOR_MOUNTS:-$WD/r58c/B/mounts-B.json}  # ruling 101 (e): ktest-eor's fixed list
GUARD_LOG=${EOR_GUARD_LOG:-$WB/orchestrator/guard-stageB.log}
RUNLOG=${EOR_RUNLOG:-$WB/train/RUNLOG.md}
LOGDIR=${EOR_LOGDIR:-$WD/orchestrator/end-of-run}
NAME=${EOR_NAME:-ktest-eor}
# the assemble step's limit (end-order-changes-2 change 5: at least three times the figure measured on a full-size stand-in;
# END-ORDER section 0 gives the figure); EOR_TIMEOUT is for the plumbing test only
LIMIT_ASSEMBLE=3000
TIMEOUT=${EOR_TIMEOUT:-$LIMIT_ASSEMBLE}
MEM_TRIES=${EOR_MEM_TRIES:-20}
IMAGE=graphtest-kge:1
HELP="node $REAL/orchestrator/guard-prelaunch.js"
TRAINW=$WD/train; TRAINB=$WB/train; PLAN=$WD/train/stageB/plan.json
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
REL_LOGDIR=${LOGDIR#$WD/}
LOGB=$(echo "$LOGDIR" | sed 's|^\([A-Za-z]\):|/\L\1|')
SUM=$LOGB/end_of_run-$STAMP.txt
say() { echo "$(date -u +%FT%TZ) $*" | tee -a "$SUM"; }
fail() { say "END-OF-RUN STOPPED ($1): $2; no PASS line written"; exit "$1"; }

check_tables() {  # step 6 (node; reads plan.json and the tables' small JSON files only)
  node -e '
    const fs = require("fs"), path = require("path"); const [plan, tb] = process.argv.slice(1);
    const p = JSON.parse(fs.readFileSync(plan, "utf8")); let ok = 0; const bad = [];
    for (const a of Object.keys(p.configs)) for (const c of p.configs[a]) for (const s of [1, 2, 3]) {
      const b = path.join(tb, a + "_" + c.config_id + "_s" + s); let m = null;
      try { m = JSON.parse(fs.readFileSync(b + "_meta.json", "utf8")); } catch (e) { bad.push(path.basename(b) + ": _meta.json missing or unreadable"); continue; }
      if (!m || m.plan_hash !== p.plan_hash) { bad.push(path.basename(b) + ": plan_hash " + (m && m.plan_hash) + " != plan.json " + p.plan_hash); continue; }
      if (m.parts !== p.checkpoints.length) { bad.push(path.basename(b) + ": parts " + m.parts + " != " + p.checkpoints.length); continue; }
      const miss = ["_pool.tsv.gz", "_unrestricted.tsv.gz", "_counts.json"].filter(x => !fs.existsSync(b + x));
      if (miss.length) { bad.push(path.basename(b) + ": missing " + miss.join(", ")); continue; }
      ok++;
    }
    for (const x of bad.slice(0, 20)) console.log("BAD " + x);
    console.log("check-tables ok=" + ok + " bad=" + bad.length); process.exit(bad.length ? 1 : 0);
  ' "$PLAN" "$TRAINW/stageB/tables"
}
validated() {  # validate prints "validate done= checked= missing= quarantined="
  v=$($HELP validate "$TRAINW" 2>&1); say "validate ($1): $(echo "$v" | tail -3 | tr '\n' ' ')"
  echo "$v" | tail -1 | grep -q ' missing=0 quarantined=0$'
}
mem_ok() {  # the coordinator's ktest rule: three samples 30 s apart, free >= 6 GB and commit < 40 GB
  n=0
  while [ $n -lt 3 ]; do
    set -- $(sh $REAL/orchestrator/memgate.sh sample)
    case "$1$2" in ""|*[!0-9]*) return 1 ;; esac
    say "memgate sample $((n+1)): free_kb $1 commit_kb $2"
    [ "$1" -ge 6291456 ] && [ "$2" -lt 41943040 ] || return 1
    n=$((n+1)); [ $n -lt 3 ] && sleep 30
  done
  return 0
}

if [ "$1" = "check-tables" ]; then check_tables; exit $?; fi
mkdir -p "$LOGB" || exit 2
say "end-of-run start: lane $WD, train $TRAINW, runlog $RUNLOG, log folder $REL_LOGDIR, container $NAME"
# ---- 1 preconditions
last=$(grep -E 'stage B complete|launched kge-B1|guard start' "$GUARD_LOG" 2>/dev/null | tail -1)
echo "$last" | grep -q 'stage B complete: no unit left' || fail 10 "the guard has not reported completion (last state line: ${last:-none})"
gs=$(grep -E '^[0-9TZ:-]+ guard start: ' "$GUARD_LOG" 2>/dev/null | tail -1)
echo "$gs" | grep -q ', cap 4g,' || fail 15 "ruling 101 (d): the last guard start line does not read cap 4g (restart the guard through orchestrator/start-guard-r98.sh): ${gs:-none}"
others=$(${EOR_DOCKER_PS:-docker} ps --format '{{.Names}}' | grep -E '^(kge-|ktest-)' | tr '\n' ' ')
[ -z "$others" ] || fail 11 "containers still running: $others"
f=$(df -BG /c | awk 'NR==2{gsub("G","",$4); print $4}'); [ "${f:-0}" -ge 10 ] || fail 12 "C: has ${f} GB free (< 10)"
# ---- 2 nothing left
n=$($HELP left "$TRAINW" "$PLAN"); say "units left: $n"
[ "$n" = "0" ] || fail 20 "$n stage-B units left"
# ---- 3 validate before assembling
validated before || fail 30 "validate found missing or quarantined units (they are redone by the guard)"
# ---- 4 assemble and assemble_checks in ONE CPU container
IMGID=$(docker image inspect -f '{{.Id}}' "$IMAGE" 2>/dev/null | tr -d '\r'); [ -n "$IMGID" ] || fail 40 "image $IMAGE not found locally (never pulled)"
ms=$(sh $REAL/orchestrator/memgate.sh sample 2>/dev/null | tr -d '\r'); set -- $ms  # one sample first: MEMGATE_EMPTY
{ [ $# -eq 2 ] && case "$1$2" in *[!0-9]*) false ;; *) true ;; esac; } || fail 14 "MEMGATE_EMPTY: memgate.sh sample printed \"$ms\", not two numbers (run end_of_run.sh from a shell where it prints two numbers)"
# the lane lock (round 3, CONFLICTS.md note 22): taken as r58c/B/ktest.sh takes it (until mkdir, retried every 30 s,
# no time limit, never treated as stale), because the coordinator holds the same lock across its grader runs (it
# writes orchestrator/grader-running.txt meanwhile) and this script must never start between two of the grader's
# containers. Only a lock this script took is removed: by the EXIT trap set after the mkdir, or right after its
# container ends (below).
LOCK=$WB/r58c/ktest.lock; mkdir -p "$WB/r58c" || fail 2 "cannot create $WB/r58c (the lock's folder)"
until mkdir "$LOCK" 2>/dev/null; do say "r58c/ktest.lock held$( [ -f "$WB/orchestrator/grader-running.txt" ] && echo ' (grader-running.txt exists)'); retry in 30 s"; sleep 30; done
trap 'rmdir "$LOCK" 2>/dev/null' EXIT
say "r58c/ktest.lock taken"
t=0; until mem_ok; do t=$((t+1)); [ $t -ge $MEM_TRIES ] && fail 13 "memgate start rule not met in $MEM_TRIES tries"; sleep 30; done
others=$(${EOR_DOCKER_PS:-docker} ps --format '{{.Names}}' | grep -E '^(kge-|ktest-)' | tr '\n' ' ')
[ -z "$others" ] || fail 11 "containers started meanwhile: $others"
mkdir -p "$TRAINB/stageB/tables" || fail 40 "cannot create $TRAINB/stageB/tables"
# ruling 82: drop every planned set's completion marker so assemble rebuilds every set from its current parts
dr=$(node -e '
  const fs = require("fs"), path = require("path"); const [plan, tb] = process.argv.slice(1);
  const p = JSON.parse(fs.readFileSync(plan, "utf8")); let n = 0, gone = 0;
  for (const a of Object.keys(p.configs)) for (const c of p.configs[a]) for (const s of [1, 2, 3]) {
    const m = path.join(tb, a + "_" + c.config_id + "_s" + s + "_meta.json"); n++;
    if (fs.existsSync(m)) { fs.unlinkSync(m); gone++; }
    if (fs.existsSync(m)) { console.log("STILL " + m); process.exit(1); }
  }
  console.log("planned_meta " + n + " dropped " + gone);
' "$PLAN" "$TRAINW/stageB/tables" 2>&1) || fail 44 "could not drop the planned _meta.json files: $dr"
say "ruling 82: $dr (assemble rebuilds every set from its parts)"
AL=assemble-$STAMP; AC=assemble_checks-$STAMP
# the start race (round r58c, after the 2026-11-14 reset): the container waits for /tmp/go (at most 120 s, then exit
# 97) and is released only when no other kge-*/ktest-* runs after its start; otherwise it is removed unreleased (exit 11)
eor_wrap() { printf 'eor_n=0; until [ -f /tmp/go ]; do eor_n=$((eor_n+1)); [ $eor_n -gt 120 ] && exit 97; sleep 1; done; %s' "$1"; }
VF=$(node $REAL/r58c/B/mounts.js flags "$MOUNTS" ktest-eor 2>&1) || fail 45 "ktest-eor's mount list does not build from $MOUNTS: $VF"
say "starting $NAME ($IMGID): stageB.py assemble, then assemble_checks.py"
say "docker run line: docker run -d --rm --pull never --name $NAME --network none --cpus 2 -m 1536m --memory-swap 1536m -e EMB_ROOT=/w -e KGE_DEVICE=cpu -e OMP_NUM_THREADS=2 -e MKL_NUM_THREADS=2 -e PYTHONUNBUFFERED=1 -e HOME=/tmp $VF -w /w/train $IMGID"
MSYS_NO_PATHCONV=1 docker run -d --rm --pull never --name $NAME --network none --cpus 2 -m 1536m --memory-swap 1536m \
  -e EMB_ROOT=/w -e KGE_DEVICE=cpu -e OMP_NUM_THREADS=2 -e MKL_NUM_THREADS=2 -e PYTHONUNBUFFERED=1 -e HOME=/tmp \
  $VF -w /w/train "$IMGID" \
  sh -c "$(eor_wrap "python stageB.py assemble > /w/eor/$AL.log 2>&1; echo \$? > /w/eor/$AL.rc; if [ \"\$(cat /w/eor/$AL.rc)\" = 0 ]; then python /w/orchestrator/assemble_checks.py --train /w/train --plan /w/train/stageB/plan.json --report /w/eor/$AC.json > /w/eor/$AC.log 2>&1; echo \$? > /w/eor/$AC.rc; fi")" >/dev/null \
  || fail 41 "docker run of $NAME failed"
others=$(${EOR_DOCKER_PS:-docker} ps --format '{{.Names}}' | tr -d '\r' | grep -E '^(kge-|ktest-)' | grep -vx "$NAME" | tr '\n' ' ')
[ -z "$others" ] || { docker rm -f $NAME >/dev/null 2>&1; fail 11 "containers running after the start of $NAME ($NAME removed before its release): $others"; }
sleep 3  # the second look (as agent A's r58c/A/ktest.sh): a twin that started within these 3 s is seen too
others=$(${EOR_DOCKER_PS:-docker} ps --format '{{.Names}}' | tr -d '\r' | grep -E '^(kge-|ktest-)' | grep -vx "$NAME" | tr '\n' ' ')
[ -z "$others" ] || { docker rm -f $NAME >/dev/null 2>&1; fail 11 "containers running after the start of $NAME ($NAME removed before its release): $others"; }
# ruling 101 (e): the mount record, before the release (the container is still waiting for /tmp/go; --rm removes it at its end)
mkdir -p "$WB/r58c/mounts"; MR=$WB/r58c/mounts/$NAME.json
[ -f "$MR" ] && mv "$MR" "$WB/r58c/mounts/$NAME.$(date -u -r "$MR" +%Y%m%dT%H%M%SZ).json"
docker inspect $NAME > "$MR.part" 2>/dev/null && mv "$MR.part" "$MR" || { docker rm -f $NAME >/dev/null 2>&1; fail 46 "docker inspect $NAME failed; removed before its release"; }
say "mount record r58c/mounts/$NAME.json sha256 $(sha256sum "$MR" | cut -c1-64)"
MSYS_NO_PATHCONV=1 docker exec $NAME touch /tmp/go >/dev/null 2>&1 || { docker rm -f $NAME >/dev/null 2>&1; fail 41 "release of $NAME failed"; }
if ! timeout "$TIMEOUT" docker wait $NAME >/dev/null 2>&1; then docker stop -t 10 $NAME >/dev/null 2>&1; fail 42 "$NAME did not finish in $TIMEOUT s (stopped)"; fi
rmdir "$LOCK" 2>/dev/null; trap - EXIT; say "$NAME ended; r58c/ktest.lock freed"
ra=$(cat "$LOGB/$AL.rc" 2>/dev/null | tr -d '\r'); say "assemble exit ${ra:-none}: $(tail -2 "$LOGB/$AL.log" 2>/dev/null | tr '\n' ' ' | cut -c1-300)"
[ "$ra" = "0" ] || fail 43 "stageB.py assemble failed (log $REL_LOGDIR/$AL.log)"
rc=$(cat "$LOGB/$AC.rc" 2>/dev/null | tr -d '\r'); say "assemble_checks exit ${rc:-none}: $(grep -E '^(assemble_checks|REFUSE)' "$LOGB/$AC.log" 2>/dev/null | head -4 | tr '\n' ' ' | cut -c1-400)"
# ---- 5 validate after
validated after || fail 50 "validate after assembling found missing or quarantined units"
# ---- 6 every table set marked complete with the current plan hash
ct=$(check_tables 2>&1); ok6=$?; say "$(echo "$ct" | tail -4 | tr '\n' ' ')"
[ $ok6 -eq 0 ] || fail 60 "table sets incomplete or of another plan_hash"
# ---- 7 assemble_checks passed on the current bytes -> the PASS line
[ "$rc" = "0" ] || fail 70 "assemble_checks refused (log $REL_LOGDIR/$AC.log)"
H=$(sha256sum "$WB/orchestrator/assemble_checks.py" | cut -d' ' -f1)
grep -q "^sha256 $H orchestrator/assemble_checks.py\$" "$LOGB/$AC.log" || fail 71 "the log does not carry the sha256 of the current assemble_checks.py ($H)"
grep -q '^assemble_checks PASS' "$LOGB/$AC.log" && ! grep -q '^assemble_checks REFUSED' "$LOGB/$AC.log" || fail 72 "the log does not show assemble_checks PASS"
grep -qE '^tables_digest [0-9a-f]{64}$' "$LOGB/$AC.log" || fail 73 "the log carries no tables_digest line (selectB's guard compares it with the current tables)"
e4=$(grep -E '^e4_det1 [0-9]+ of [0-9]+ e4_parts, planned [0-9]+$' "$LOGB/$AC.log" | tail -1)
echo "$e4" | awk '{exit !(NF == 7 && $2 == $4 && $4 == $7)}' || fail 74 "HD-12: not every planned E4 part ran det=1 (${e4:-no e4_det1 line})"
TD=$(grep -E '^tables_digest [0-9a-f]{64}$' "$LOGB/$AC.log" | tail -1 | cut -d' ' -f2)
echo "PASS assemble-checks $REL_LOGDIR/$AC.log tables_digest $TD" >> "$RUNLOG"
say "PASS assemble-checks $REL_LOGDIR/$AC.log tables_digest $TD appended to $RUNLOG (assemble_checks.py sha256 $H; $e4)"
exit 0
