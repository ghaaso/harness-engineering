#!/bin/sh
# Agent B's test launcher (round r58c; copied in substance from r58b/ktest.sh, which is not edited). ONE CPU container
# named $1 (ktest-b<N> for agent B's tests, ktest-r<N> for END-ORDER's lane steps through lane_step.sh), the image
# graphtest-kge:1 by ID, --network none --pull never --cpus 2 -m 1536m --memory-swap 1536m.
# Before it starts: mkdir r58c/ktest.lock (retried every 30 s; the lane's one-ktest-at-a-time lock, which every
# ktest-* name takes, ktest-r<N> included), no ktest-* container running (the grader's ktest-G* included), then
# one memgate sample (exit 9 MEMGATE_EMPTY when it is not two numbers), then the coordinator's ktest rule: three samples
# 30 s apart with free >= 6 GB and commit < 40 GB (change 3 of end-order-changes-2; not memgate.sh wait, which is the
# 4.5 GB training rule). Waited for at most 580 s, then stopped; the container is removed and the lock freed.
# Mounts: train/, export/, eval/, orchestrator/, parallel/, fixes/, r58c/ and the repository READ-ONLY (r58b/ and
# grader-returns/ only as below: never r58b whole, never r58b/out/hstage); writable only
# r58c/B/out/ (at /w/r58c/B/out), plus, only when KT_TRAIN_RW names them, train/selectB-test and train/report
# (the coordinator's order after ruling 95, note 11 (a): `selectB.py --test`, `report.py --test` as they are; KT_TRAIN_RW takes only these two
# words, anything else is exit 2). Logs in r58c/B/out/logs/. No card, no kge-* name. Tests are excluded from ruling 94.
# Exit: the container's exit code, or ktest.sh's own: 2 usage; 3 docker run or release failed (or no exit code);
# 6 over 580 s, stopped; 9 MEMGATE_EMPTY; 13 the start rule not met in 80 samples. The last line ktest.sh writes to
# r58c/B/out/logs/ktest-launch.log says which: "exit N (the container's)" or "ktest.sh exit N (its own ...)".
# usage: sh ktest.sh ktest-bN /w/r58c/B/tests/<inner>.sh [args...]
# After `docker run` it looks again (r58c/B/race_gate.sh): the container waits for /tmp/go and is released only when
# no other matching container runs; otherwise it is removed before its release (it has run nothing) and the start is
# retried after a random 30-59 s (coordinator, after ktest-b13 and ktest-G40 started in the same second).
NAME=$1; shift; INNER=$1; shift
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
GB=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build
REPO=C:/Users/User/Documents/projects/EMS_workshop1
mkdir -p $WB/r58c/B/out/logs; LOG=$WB/r58c/B/out/logs/ktest-launch.log
say() { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
case "$NAME" in ktest-b[0-9]*) ;; *) echo "name must be ktest-b<N>"; exit 2 ;; esac
case "$INNER" in /w/r58c/B/*) ;; *) echo "the inner script must be under /w/r58c/B/"; exit 2 ;; esac
# The coordinator, round 3 (after ruling 97): no test container sees r58b/ whole (r58b/out/hstage is the r58b round's full
# held-out staging; before the freeze the one held-out staging is LANE/heldout_inputs of 2f) and none sees grader-returns/
# unless it is a 2e wrapper. r58b: only what the tests read, read-only: r58b/pre (the stage-1 selectB/report/item27/
# answer_level bytes of the fail-befores of test_gate, test_verdict, test_item27, test_answer_level) and
# r58b/logs/test_verdict.log (test_selection_freeze8 part D); the 2e wrapper wr_rehearsal.sh also its TEST item22.json
# (r58b/out/item22_test) and TEST leak_audit.json. grader-returns/ read-only only for wr_rehearsal.sh and compare_only.sh.
XM_=""; xm() { if [ -e "$WB/$1" ]; then XM_="$XM_ -v $W/$1:/w/$1:ro"; else say "$NAME: $1 is not in the lane; not mounted"; fi; }
xm r58b/pre; xm r58b/logs/test_verdict.log
case "$INNER" in
  /w/r58c/B/tests/wr_rehearsal.sh) xm r58b/out/item22_test; xm r58b/out/leak_audit.json; xm grader-returns ;;
  /w/r58c/B/rehearsal/compare_only.sh) xm grader-returns ;;
esac
RW_=""; for d_ in ${KT_TRAIN_RW:-}; do case "$d_" in selectB-test|report) mkdir -p $WB/train/$d_; RW_="$RW_ -v $W/train/$d_:/w/train/$d_" ;; *) echo "KT_TRAIN_RW takes only selectB-test and report, not $d_"; exit 2 ;; esac; done
# KT_AS (round 8, C8): KT_AS=ktest-r<N> starts the test container with EXACTLY ktest-r<N>'s list in r58c/B/mounts-B.json
# (r58c/B/mounts.js flags), every row forced read-only, and no other mount (no r58c/B/out, no /gt, no /build, no /repo);
# the inner file must be a /w/r58c/B/tests/*.py and goes in as `python -c` with its base64 (the container does not mount
# r58c/B/tests). Env DG_RUNLOG=${KT_DG_RUNLOG:-/w/train/RUNLOG.md}. KT_TRAIN_RW is refused with it (exit 2). The
# container's docker inspect is saved before its release (C26) as r58c/B/out/logs/$NAME-as-$KT_AS.inspect.json, its log
# after it ends as .log. The flags are built WITHOUT --create (ruling 103(d)): nothing is created, a row whose source is
# missing is left out and named by mounts.js on stderr.
ASF_=""; CODE64_=""
if [ -n "${KT_AS:-}" ]; then
  case "$KT_AS" in ktest-r[0-9]*) ;; *) echo "KT_AS takes ktest-r<N>, not $KT_AS"; exit 2 ;; esac
  case "$INNER" in /w/r58c/B/tests/*.py) ;; *) echo "KT_AS needs an inner /w/r58c/B/tests/*.py, not $INNER"; exit 2 ;; esac
  [ -n "${KT_TRAIN_RW:-}" ] && { echo "KT_AS and KT_TRAIN_RW do not go together"; exit 2; }
  f_=$WB/${INNER#/w/}; [ -f "$f_" ] || { echo "KT_AS: $INNER is not in the lane"; exit 2; }
  fl_=$(node $WB/r58c/B/mounts.js flags $W/r58c/B/mounts-B.json "$KT_AS") || { echo "KT_AS: no mount list for $KT_AS (mounts.js flags failed)"; exit 2; }
  fl_=$(echo "$fl_" | tr -d '\r'); [ -n "$fl_" ] || { echo "KT_AS: $KT_AS has an empty mount list"; exit 2; }
  ASF_=$(echo "$fl_" | tr ' ' '\n' | awk '$0=="-v"{printf " -v"; next} NF{ if ($0 !~ /:ro$/) $0=$0":ro"; printf " %s", $0 }')
  CODE64_=$(base64 -w0 "$f_")
fi
until mkdir $WB/r58c/ktest.lock 2>/dev/null; do say "$NAME: r58c/ktest.lock held; retry in 30 s"; sleep 30; done
trap 'docker rm -f $NAME >/dev/null 2>&1; rmdir $WB/r58c/ktest.lock 2>/dev/null' EXIT
. $WB/r58c/B/race_gate.sh
while :; do
while docker ps --format '{{.Names}}' | grep -q '^ktest-'; do say "$NAME: a ktest-* container runs; retry in 30 s"; sleep 30; done
m=$(rg_sample_ok $WB/orchestrator/memgate.sh) || { say "$NAME: MEMGATE_EMPTY: $m; not started (run the launcher from a shell where orchestrator/memgate.sh sample prints two numbers)"; exit 9; }
ok=0; n=0  # the coordinator's ktest rule (change 3 of end-order-changes-2): three samples 30 s apart, free >= 6 GB, commit < 40 GB
while [ $ok -lt 3 ]; do
  # never `set --` here: "$@" holds the inner script's arguments (ktest-b32, 2026-11-14T23:48Z, ran role_report.sh with the
  # sample's two numbers instead of p2)
  smp_=$(sh $WB/orchestrator/memgate.sh sample | tr -d '\r'); fk_=$(echo "$smp_" | awk '{print $1}'); ck_=$(echo "$smp_" | awk '{print $2}')
  case "$fk_$ck_" in ""|*[!0-9]*) ok=0 ;; *) if [ "$fk_" -ge 6291456 ] && [ "$ck_" -lt 41943040 ]; then ok=$((ok+1)); else ok=0; fi ;; esac
  say "$NAME: start sample free_kb $fk_ commit_kb $ck_ (ok $ok of 3)"
  n=$((n+1)); [ $n -ge 80 ] && { say "$NAME: start rule not met in 80 samples; not started (exit 13)"; exit 13; }
  [ $ok -lt 3 ] && sleep 30
done
IMGID=$(docker image inspect -f '{{.Id}}' graphtest-kge:1 | tr -d '\r')
say "$NAME: starting ($IMGID) $INNER $*${KT_AS:+ (KT_AS=$KT_AS: its list only, read-only)}"
if [ -n "${KT_AS:-}" ]; then
MSYS_NO_PATHCONV=1 docker run -d --pull never --name $NAME --network none --cpus 2 -m 1536m --memory-swap 1536m \
 -e EMB_ROOT=/w -e KGE_DEVICE=cpu -e OMP_NUM_THREADS=2 -e MKL_NUM_THREADS=2 -e PYTHONUNBUFFERED=1 -e PYTHONDONTWRITEBYTECODE=1 \
 -e HOME=/tmp -e KNAME=$NAME -e DG_RUNLOG=${KT_DG_RUNLOG:-/w/train/RUNLOG.md} $ASF_ \
 -w /w/train "$IMGID" sh -c "$(rg_wrap 'exec python -c "import base64,sys;exec(base64.b64decode(sys.argv[1]))" "$0"')" "$CODE64_" >/dev/null || { say "$NAME: docker run failed"; exit 3; }
else
MSYS_NO_PATHCONV=1 docker run -d --pull never --name $NAME --network none --cpus 2 -m 1536m --memory-swap 1536m \
 -e EMB_ROOT=/w -e KGE_DEVICE=cpu -e OMP_NUM_THREADS=2 -e MKL_NUM_THREADS=2 -e PYTHONUNBUFFERED=1 -e PYTHONDONTWRITEBYTECODE=1 \
 -e HOME=/tmp -e PYSTOW_HOME=/tmp/pystow -e KNAME=$NAME -e BOUT=/w/r58c/B/out -e LEAK_LANE_HOST=$W \
 -e GT_COMMON=/gt/common -e GT_FACTS_CACHE=/gt/facts -e GT_SRCSTORE=/gt/common/srcstore -e GT_TMP=/tmp/gt \
 -e GT_PRIMARY=/gt/primary.json -e GT_TASKS=/gt/tasks.jsonl \
 -v $W/export:/w/export:ro -v $W/eval:/w/eval:ro -v $W/train:/w/train:ro$RW_ -v $W/fixes:/w/fixes:ro \
 -v $W/orchestrator:/w/orchestrator:ro -v $W/parallel:/w/parallel:ro -v $W/r58c:/w/r58c:ro -v $W/r58c/B/out:/w/r58c/B/out \
$XM_ -v $GB/facts/cache:/gt/facts:ro -v $GB/arms/common:/gt/common:ro \
 -v $GB/results/frozen/relational/95e990307da3b42b.json:/gt/primary.json:ro -v $GB/tasks/tasks.jsonl:/gt/tasks.jsonl:ro \
 -v $GB/arms/common:/build/arms/common:ro -v $GB/results/frozen/relational:/build/results/frozen/relational:ro \
 -v $GB/facts/cache:/build/facts/cache:ro -v $GB/tasks/tasks.jsonl:/build/tasks/tasks.jsonl:ro -v $REPO:/repo:ro \
 -w /w/train "$IMGID" sh -c "$(rg_wrap 'exec sh "$0" "$@"')" "$INNER" "$@" >/dev/null || { say "$NAME: docker run failed"; exit 3; }
fi
o=$(rg_clear '^ktest-' $NAME) && break
b=$(rg_backoff); say "$NAME: $o runs as well after the start; $NAME removed before its release (it ran nothing); retry in $b s"
docker rm -f $NAME >/dev/null 2>&1; sleep $b
done
# C26 (round 8): a KT_AS container's docker inspect is saved while it is still held, before the release (as lane_step.sh does)
if [ -n "${KT_AS:-}" ]; then docker inspect $NAME > $WB/r58c/B/out/logs/$NAME-as-$KT_AS.inspect.json 2>/dev/null || { say "$NAME: docker inspect failed; removed before its release"; exit 3; }
  say "$NAME: mount record r58c/B/out/logs/$NAME-as-$KT_AS.inspect.json sha256 $(sha256sum $WB/r58c/B/out/logs/$NAME-as-$KT_AS.inspect.json | cut -c1-64) (saved before the release)"; fi
rg_release $NAME || { say "$NAME: release failed"; exit 3; }
say "$NAME: released (no other ktest-* running after its start)"
if timeout 580 docker wait $NAME >/dev/null 2>&1; then rc=$(docker inspect -f '{{.State.ExitCode}}' $NAME 2>/dev/null | tr -d '\r'); own=0
else docker stop -t 10 $NAME >/dev/null 2>&1; rc=6; own=1; fi
if [ -n "${KT_AS:-}" ]; then docker logs $NAME > $WB/r58c/B/out/logs/$NAME-as-$KT_AS.log 2>&1; fi
docker logs $NAME 2>&1 | tail -40
case "$rc" in ''|*[!0-9]*) rc=3; own=1 ;; esac
if [ $own = 1 ]; then say "$NAME: ktest.sh exit $rc (its own: 6 over 580 s, stopped; 3 no exit code)"
else say "$NAME: ended by itself; exit $rc (the container's)"; fi
exit $rc
