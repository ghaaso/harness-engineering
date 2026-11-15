#!/bin/sh
# Host test (fake docker, stubs; no container) of the lane lock in orchestrator/end_of_run.sh (round 3, CONFLICTS.md
# note 22): its one container launch takes r58c/ktest.lock the way r58c/B/ktest.sh does (until mkdir, retried every
# 30 s, never treated as stale) and removes only a lock it took, after its container ends. The coordinator holds the
# same lock across its grader runs (orchestrator/grader-running.txt meanwhile), so end_of_run.sh must never start
# its container while that lock is held.
# Each case runs end_of_run.sh on a synthetic copy (r58c/B/eor/make_copy.js) whose EOR_WB names the copy, so the lock
# is the COPY's r58c/ktest.lock, never the lane's. First on PATH: fake_docker_eor.sh as `docker` (records the lock's
# state at `docker run` and `docker wait`), a stub `sleep` that counts its calls and plays the grader (it frees the
# grader's lock at call FD_RELEASE_AT), a stub `powershell` (memgate's sample: $FD_SAMPLE) and a stub `df`.
#   G  after bytes: the grader holds the lock; end_of_run waits, starts its container only after the grader freed it
#      (with its own lock held), keeps it through `docker wait`, frees it after the container ended.
#   W  after bytes: the grader never frees it; end_of_run never starts a container, and the grader's lock stays.
#   M  after bytes: MEMGATE_EMPTY (exit 14) while the grader holds the lock: the grader's lock stays.
#   GB fail-before (r58c/B/pre-eorlock/end_of_run.sh, same copy and stubs): it starts its container while the
#      grader still holds the lock.
# usage: sh r58c/B/eor/test_eor_lock.sh   (log r58c/B/logs/test_eor_lock.log)
LW=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
LB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
E=$LB/r58c/B/eor; EW=$LW/r58c/B/eor; T=$E/lk; TW=$EW/lk; LOG=$LB/r58c/B/logs/test_eor_lock.log
R1="guard-stageB.sh kge-B1 procs=1 image=sha256:a890c54808c11c460d910945c4bf981390f7de43c8dfc5840269b76f5861cbe7"
rm -rf $T; mkdir -p $T/bin $LB/r58c/B/logs; : > $LOG
cp $E/fake_docker_eor.sh $T/bin/docker
cat > $T/bin/sleep <<'EOF'
#!/bin/sh
n=$(cat "$FD_STATE/sleeps" 2>/dev/null || echo 0); n=$((n+1)); echo $n > "$FD_STATE/sleeps"
if [ -f "$FD_STATE/grader_holds" ] && [ "$n" -ge "${FD_RELEASE_AT:-3}" ]; then
  rm -f "$FD_STATE/grader_holds" "$FD_GRADER_TXT"; rmdir "$FD_LOCK"; echo 1 > "$FD_STATE/released"; echo "EVENT grader-release at sleep $n" >> "$FD_STATE/calls.log"
fi
[ "$n" -ge "${FD_KILL_AT:-200}" ] && { echo "EVENT kill at sleep $n" >> "$FD_STATE/calls.log"; kill -TERM $PPID; }
exit 0
EOF
printf '#!/bin/sh\n[ -n "$FD_SAMPLE" ] && echo "$FD_SAMPLE"\nexit 0\n' > $T/bin/powershell
printf '#!/bin/sh\necho "Filesystem 1G-blocks Used Available Use%% Mounted"\necho "C: 500G 100G 400G 20%% /c"\n' > $T/bin/df
chmod +x $T/bin/*
export PATH="$T/bin:$PATH" DOCKER_HOST=tcp://127.0.0.1:9
[ "$(command -v docker)" = "$T/bin/docker" ] && [ "$(command -v sleep)" = "$T/bin/sleep" ] || { echo "the stubs are not first on PATH" | tee -a $LOG; exit 3; }
fails=0; n=0
check() { n=$((n+1)); if [ "$2" = "$3" ]; then echo "PASS $1" | tee -a $LOG; else fails=$((fails+1)); echo "FAIL $1: got [$2] want [$3]" | tee -a $LOG; fi; }
echo "sha256 $(sha256sum $LB/orchestrator/end_of_run.sh | cut -c1-64) orchestrator/end_of_run.sh (after)" | tee -a $LOG
echo "sha256 $(sha256sum $LB/r58c/B/pre-eorlock/end_of_run.sh | cut -c1-64) r58c/B/pre-eorlock/end_of_run.sh (before)" | tee -a $LOG
echo "sha256 $(sha256sum $0 | cut -c1-64) r58c/B/eor/test_eor_lock.sh; $(sha256sum $E/fake_docker_eor.sh | cut -c1-64) r58c/B/eor/fake_docker_eor.sh" | tee -a $LOG
# go <case> <script> <sample> <release at> <kill at>: a fresh copy, the grader holding the copy's lock; prints the exit code
go() {
  c=$1; d=$T/$c; node $E/make_copy.js "$LW" "$d" "$R1" "$R1 det=1" >/dev/null || { echo "make_copy failed" >&2; exit 3; }
  mkdir -p $d/r58c $d/state; mkdir $d/r58c/ktest.lock; echo "grader round" > $d/orchestrator/grader-running.txt; touch $d/state/grader_holds
  # round 8 (ruling 101 (e)): end_of_run.sh builds ktest-eor's -v flags from a mounts file (EOR_MOUNTS); the copy's list is
  # the real entry with train/ and orchestrator/ pointed at the copy, as test_end_of_run.sh's mounts_copy does
  node -e 'const fs=require("fs");const [f,lw,cw,out]=process.argv.slice(1);const j=JSON.parse(fs.readFileSync(f,"utf8"));
    const e=j["ktest-eor"];if(!e)process.exit(5);const a=e.allow.map(m=>({...m,src:m.src.replace(lw+"/train",cw+"/train").replace(lw+"/orchestrator",cw+"/orchestrator")}));
    fs.writeFileSync(out,JSON.stringify({"ktest-eor":{step:e.step,allow:a}},null,1))' "$LW/r58c/B/mounts-B.json" "$LW" "$TW/$c" "$TW/$c/mounts-eor.json" || { echo "mounts copy failed" >&2; exit 3; }
  ( export EOR_MOUNTS=$TW/$c/mounts-eor.json FD_STATE=$d/state FD_LOCK=$d/r58c/ktest.lock FD_GRADER_TXT=$d/orchestrator/grader-running.txt FD_SAMPLE="$3" \
      FD_RELEASE_AT=$4 FD_KILL_AT=$5 EOR_WD=$TW/$c EOR_WB=$d EOR_EXPORT=$LW/export EOR_EVAL=$LW/eval \
      EOR_GUARD_LOG=$d/orchestrator/guard-stageB.log EOR_RUNLOG=$d/train/RUNLOG.md EOR_LOGDIR=$TW/$c/orchestrator/end-of-run \
      EOR_NAME=ktest-bx EOR_TIMEOUT=60 EOR_MEM_TRIES=3 EOR_DOCKER_PS="sh $E/fake_ps.sh" FAKE_PS_CNT=$d/pscnt
    sh $2 > $d/out.txt 2>&1; echo $? )
}
ev() { grep "^EVENT $2" $T/$1/state/calls.log 2>/dev/null | head -1 | cut -d' ' -f3-; }
lockleft() { [ -d $T/$1/r58c/ktest.lock ] && echo held || echo free; }
GOOD="8000000 1000000"
# G
rc=$(go g $LB/orchestrator/end_of_run.sh "$GOOD" 3 200)
check "G end_of_run waited on the grader's lock (said so, naming grader-running.txt)" "$(grep -c 'r58c/ktest.lock held (grader-running.txt exists); retry in 30 s' $T/g/out.txt)" "3"
check "G its container started only after the grader freed the lock, with its own lock held" "$(ev g run)" "grader_done 1 lock 1"
check "G the lock was still held at docker wait (the container's whole run)" "$(ev g wait)" "lock 1"
check "G the lock is freed after the container ended (and the log says so)" "$(lockleft g) $(grep -c 'ktest-bx ended; r58c/ktest.lock freed' $T/g/out.txt)" "free 1"
check "G the run went on past the container (exit 43: the fake ran no assemble)" "$rc" "43"
# W
rc=$(go w $LB/orchestrator/end_of_run.sh "$GOOD" 999 6)
check "W the grader never frees the lock: no container started, the grader's lock and file stay" "$(grep -c '^EVENT run' $T/w/state/calls.log) $(lockleft w) $([ -f $T/w/orchestrator/grader-running.txt ] && echo txt)" "0 held txt"
# M
rc=$(go m $LB/orchestrator/end_of_run.sh "" 999 200)
check "M MEMGATE_EMPTY (exit 14) while the grader holds the lock: the grader's lock stays, no container" "$rc $(lockleft m) $(grep -c '^EVENT run' $T/m/state/calls.log)" "14 held 0"
# GB fail-before
rc=$(go gb $LB/r58c/B/pre-eorlock/end_of_run.sh "$GOOD" 3 200)
check "GB fail-before: the old end_of_run.sh started its container while the grader held the lock" "$(ev gb run)" "grader_done 0 lock 1"
echo "RESULT $([ $fails = 0 ] && echo PASS || echo FAIL) eor-lock ($n checks)" | tee -a $LOG
[ $fails = 0 ] && rm -rf $T
[ $fails = 0 ]
