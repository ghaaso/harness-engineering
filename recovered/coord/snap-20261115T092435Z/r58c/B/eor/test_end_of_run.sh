#!/bin/sh
# Plumbing test of orchestrator/end_of_run.sh (round r58c: ruling 82's meta drop, HD-12's e4_det1, the digest on the
# PASS line) on SYNTHETIC lane copies (r58c/B/eor/make_copy.js, plan from r58c/B/frozen/plan.json) under r58c/B/eor/;
# never on train/stageB (nothing under train/stageB is read: MF-8). Copied in substance from r58b/eor/ (not edited).
# Holds the lane lock r58c/ktest.lock for the whole run; containers ktest-b<KC>, <KE>, <KH>, <KP> one at a time
# (end_of_run.sh itself waits for memgate and refuses while another ktest-*/kge-* runs; kge-B1 is ignored as before).
# Cases: A, F, B stop before a container; C the positive run, with a STALE pre-assembled set placed before it (its
# _meta.json must be dropped and the set rebuilt); E a non-default runner (exit 70); H an assemble_checks copy that
# prints an inconsistent e4_det1 line (exit 74); P the same stale set under r58c/B/pre/end_of_run.sh (fail before:
# the old script keeps the stale table and still passes).
# K (coordinator, message 5): the exit-11 precondition against a FAKE docker ps (fake_ps.sh via EOR_DOCKER_PS);
# KB its fail-before on end_of_run.before-fakeps.sh. Every case uses the fake; only P (the r58c before bytes, which
# predate the hook) still asks the real docker with EOR_TEST_IGNORE=kge-B1, the hook those bytes have.
# M/MB: an empty memgate sample (exit 14 MEMGATE_EMPTY; stub powershell on PATH).
# K3/K4/K3B: the start race (a twin listed after the start; containers ktest-b<K3N>, <K4N>, <K3B>).
# usage: sh test_end_of_run.sh      prints RESULT PASS|FAIL end-of-run
LW=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
LB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
E=$LB/r58c/B/eor; EW=$LW/r58c/B/eor
EOR="sh $LB/orchestrator/end_of_run.sh"; EOR_PRE="sh $LB/r58c/B/pre/end_of_run.sh"
R1="guard-stageB.sh kge-B1 procs=1 image=sha256:a890c54808c11c460d910945c4bf981390f7de43c8dfc5840269b76f5861cbe7"
RC="guard-stageB.sh kge-B1 procs=1 containers=2 image=sha256:a890c54808c11c460d910945c4bf981390f7de43c8dfc5840269b76f5861cbe7"
FAIL=0; N=0
check() { N=$((N+1)); if [ "$2" = "$3" ]; then echo "ok   $1: $2"; else echo "FAIL $1: got '$2' want '$3'"; FAIL=1; fi; }
mk() { node $E/make_copy.js "$LW" "$E/$1" "$2" "$3" "$4"; }
idle() { while docker ps --format "{{.Names}}" | grep -qE "^ktest-"; do echo "another ktest- container runs; retry in 30 s" >&2; sleep 30; done; }
mounts_copy() {  # round 8 (ruling 101 (e)): the copy's ktest-eor list = the real entry of r58c/B/mounts-B.json with the
  # lane's train/ and orchestrator/ sources pointed at the copy (export/ pins and eval/ stay the real, read-only ones)
  node -e 'const fs=require("fs");const [f,lw,cw,out]=process.argv.slice(1);const j=JSON.parse(fs.readFileSync(f,"utf8"));
    const e=j["ktest-eor"];if(!e)process.exit(5);const a=e.allow.map(m=>({...m,src:m.src.replace(lw+"/train",cw+"/train").replace(lw+"/orchestrator",cw+"/orchestrator")}));
    fs.writeFileSync(out,JSON.stringify({"ktest-eor":{step:e.step,allow:a}},null,1))' "$LW/r58c/B/mounts-B.json" "$LW" "$EW/$1" "$EW/$1/mounts-eor.json"
}
run() {  # run end_of_run.sh ($3, default the current one) on copy $1 (container name $2); prints its exit code
  mounts_copy $1
  idle; ( export EOR_WD=$EW/$1 EOR_WB=$E/$1 EOR_EXPORT=$LW/export EOR_EVAL=$LW/eval EOR_MOUNTS=$EW/$1/mounts-eor.json \
      EOR_GUARD_LOG=$E/$1/orchestrator/guard-stageB.log EOR_RUNLOG=$E/$1/train/RUNLOG.md \
      EOR_LOGDIR=$EW/$1/orchestrator/end-of-run EOR_NAME=$2 EOR_TIMEOUT=580 EOR_MEM_TRIES=40 EOR_TEST_IGNORE=kge-B1 EOR_DOCKER_PS="sh $E/fake_ps.sh" FAKE_PS_CNT=$E/$1.pscnt; rm -f $E/$1.pscnt
    ${3:-$EOR} > "$E/$1.out" 2>&1; echo $? )
}
passn() { grep -c '^PASS assemble-checks ' "$E/$1/train/RUNLOG.md"; }
stale() {  # a pre-assembled E1_c04_s1 set whose _meta.json carries the plan hash and the planned part count (stageB.py
           # assemble would skip it, and the old check-tables would accept it)
  T=$E/$1/train/stageB/tables; ph=$(node -e "console.log(require('$EW/$1/train/stageB/plan.json').plan_hash)"); [ -n "$ph" ] || { echo 'stale: no plan_hash'; exit 1; }
  printf 'task_id\tcandidate\tscore\nSTALE\tx\t1\n' | gzip -c > $T/E1_c04_s1_pool.tsv.gz; cp $T/E1_c04_s1_pool.tsv.gz $T/E1_c04_s1_unrestricted.tsv.gz
  echo '{}' > $T/E1_c04_s1_counts.json; echo "{\"plan_hash\": \"$ph\", \"parts\": 53, \"tasks\": 0, \"runners\": []}" > $T/E1_c04_s1_meta.json
}
until mkdir $LB/r58c/ktest.lock 2>/dev/null; do echo "r58c/ktest.lock held; retry in 30 s"; sleep 30; done
trap 'rmdir $LB/r58c/ktest.lock 2>/dev/null' EXIT
RL0=$(sha256sum "$LB/train/RUNLOG.md" | cut -d' ' -f1)
echo "sha256 $(sha256sum $LB/orchestrator/end_of_run.sh | cut -d' ' -f1) orchestrator/end_of_run.sh"
echo "sha256 $(sha256sum $LB/orchestrator/assemble_checks.py | cut -d' ' -f1) orchestrator/assemble_checks.py"
echo "sha256 $(sha256sum $LB/r58c/B/pre/end_of_run.sh | cut -d' ' -f1) r58c/B/pre/end_of_run.sh (the before bytes)"
echo "sha256 $(sha256sum $LB/r58c/B/pre-r101/end_of_run.sh | cut -d" " -f1) r58c/B/pre-r101/end_of_run.sh (the round-8 before bytes)"
echo "sha256 $(sha256sum $LB/r58c/B/mounts-B.json | cut -d" " -f1) r58c/B/mounts-B.json; $(sha256sum $LB/r58c/B/mounts.js | cut -d" " -f1) r58c/B/mounts.js"
echo "sha256 $(sha256sum $0 | cut -d' ' -f1) r58c/B/eor/test_end_of_run.sh"

# A: the guard has not reported completion -> stop at step 1, nothing started
mk a "$R1" "$R1 det=1" "2026-11-14T00:00:02Z launched kge-B1 (again)" >/dev/null
check "A no completion line -> exit 10" "$(run a ktest-bx)" "10"
check "A no PASS line" "$(passn a)" "0"
# F: one unit left (its done line dropped) -> stop at step 2
mk f "$R1" "$R1 det=1" >/dev/null; sed -i '$d' "$E/f/train/progress.jsonl"
check "F a unit left -> exit 20" "$(run f ktest-bx)" "20"
check "F no PASS line" "$(passn f)" "0"
# B: a corrupt part -> validate quarantines it -> stop at step 3, nothing started
mk b "$R1" "$R1 det=1" >/dev/null
d=$(ls -d $E/b/train/stageB/parts/E4/c12/s2/*/ | head -1); printf 'not gzip' > "$d/pool.tsv.gz"
check "B a corrupt part -> exit 30" "$(run b ktest-bx)" "30"
check "B the part was quarantined (in the copy)" "$(ls $E/b/train/stageB/quarantine/*/E4/c12/s2 | wc -l)" "1"
check "B no PASS line" "$(passn b)" "0"
check "A/F/B started no container" "$(grep -c 'starting ktest' $E/a.out $E/f.out $E/b.out | awk -F: '{s+=$2} END {print s}')" "0"
# C: the positive run, with a stale pre-assembled set
mk c "$R1" "$R1 det=1" >/dev/null; stale c
check "C complete copy (a stale set placed) -> exit 0" "$(run c ktest-b${KC:-5})" "0"
check "C one PASS line appended to the COPY's RUNLOG" "$(passn c)" "1"
PL=$(grep '^PASS assemble-checks ' $E/c/train/RUNLOG.md); LOGREL=$(echo "$PL" | awk '{print $3}')
check "C the log carries the current assemble_checks.py sha256 and PASS" \
  "$(grep -c "^sha256 $(sha256sum $LB/orchestrator/assemble_checks.py | cut -d' ' -f1) orchestrator/assemble_checks.py$" $E/c/$LOGREL)$(grep -c '^assemble_checks PASS' $E/c/$LOGREL)" "11"
check "C ruling 82: the planned _meta.json files were dropped (one existed)" "$(grep -c 'planned_meta 6 dropped 1' $E/c.out)" "1"
check "C ruling 82: the stale set was rebuilt from its parts" "$(gzip -dc $E/c/train/stageB/tables/E1_c04_s1_pool.tsv.gz | grep -c STALE)" "0"
check "C six table sets with _meta.json" "$(ls $E/c/train/stageB/tables/*_meta.json | wc -l)" "6"
check "C the log states the part count against the plan (--plan)" "$(grep -c '^train /w/train parts 318 planned 318 newest_part ' $E/c/$LOGREL)" "1"
check "C HD-12: e4_det1 159 of 159, planned 159" "$(grep -c '^e4_det1 159 of 159 e4_parts, planned 159$' $E/c/$LOGREL)" "1"
TD=$(grep -E '^tables_digest [0-9a-f]{64}$' $E/c/$LOGREL | cut -d' ' -f2)
check "C the PASS line carries the log's tables_digest" "$(echo "$PL" | awk '{print $4" "$5}')" "tables_digest $TD"
# C (round 8, ruling 101 (e)): ktest-eor's list from r58c/B/mounts-B.json through mounts.js, its record and its run line
MRC=$E/c/r58c/mounts/ktest-b${KC:-5}.json
check "C ruling 101 (e): the mount record was saved before the release" "$( [ -s "$MRC" ] && echo yes || echo no)" "yes"
check "C ruling 101 (e): the record's mounts are exactly ktest-eor's list (no export/ whole, no orchestrator/ whole)" \
  "$(node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))[0];console.log(r.Mounts.map(m=>m.Destination+":"+(m.RW?"rw":"ro")).sort().join(","))' "$(cygpath -m "$MRC")" 2>&1)" \
  "/w/eor:rw,/w/eval:ro,/w/export/checkpoints.py:ro,/w/export/parents.jsonl:ro,/w/export/parents_git.jsonl:ro,/w/orchestrator/assemble_checks.py:ro,/w/train/stageB/tables:rw,/w/train:ro"
check "C the summary logs the docker run line, with the pins and without export/ whole" \
  "$(grep -c 'docker run line: .*-v .*/export/checkpoints.py:/w/export/checkpoints.py:ro' $E/c.out) $(grep 'docker run line:' $E/c.out | grep -c ':/w/export ')" "1 0"
# G (ruling 101 (d)): the last guard start reads cap 2560m -> exit 15 before anything else; GB the fail-before
export MC_GUARD_START="2026-11-15T09:00:00Z guard start: image graphtest-kge-gpu:1 = sha256:a, cap 2560m, procs 1, lanes 1, units left 1"
mk g "$R1" "$R1 det=1" >/dev/null; unset MC_GUARD_START; sed -i '$d' "$E/g/train/progress.jsonl"
check "G ruling 101 (d): a last guard start at cap 2560m -> exit 15, no container" "$(run g ktest-bx) $(grep -c 'starting ktest' $E/g.out)" "15 0"
check "GB fail before: r58c/B/pre-r101/end_of_run.sh passes step 1 and stops at step 2 (20, the unit left)" "$(run g ktest-bx "sh $LB/r58c/B/pre-r101/end_of_run.sh")" "20"
# R (ruling 101 (e)) fail before: r58c/B/pre-r101/end_of_run.sh assembles with its hard-coded mounts and keeps no record
mk r "$R1" "$R1 det=1" >/dev/null
rr=$(run r ktest-b${KR:-23} "sh $LB/r58c/B/pre-r101/end_of_run.sh")
check "R fail before: the old end_of_run.sh passes (0) with no mount record and no run line" "$rr $(ls $E/r/r58c/mounts 2>/dev/null | wc -l | tr -d ' ') $(grep -c 'docker run line' $E/r.out)" "0 0 0"
# E: a single non-default runner (containers=2) and no accepted record -> assemble runs, assemble_checks refuses
mk e "$RC" "$R1 det=1" >/dev/null
check "E non-default runner, no record -> exit 70" "$(run e ktest-b${KE:-6})" "70"
check "E no PASS line" "$(passn e)" "0"
check "E reason in the log" "$(grep -h '^REFUSE R66 E1: parts from a non-default runner' $E/e/orchestrator/end-of-run/assemble_checks-*.log | wc -l)" "1"
# H: an assemble_checks copy that passes but prints e4_det1 158 of 159 -> HD-12 stops at exit 74
mk h "$R1" "$R1 det=1" >/dev/null
sed -i "s/print('e4_det1 %d of %d e4_parts, planned %d' % (n_e4_det, n_e4, want_e4))/print('e4_det1 %d of %d e4_parts, planned %d' % (n_e4_det - 1, n_e4, want_e4))/" $E/h/orchestrator/assemble_checks.py
check "H the copy's assemble_checks was doctored" "$(grep -c 'n_e4_det - 1' $E/h/orchestrator/assemble_checks.py)" "1"
check "H an inconsistent e4_det1 line -> exit 74" "$(run h ktest-b${KH:-7})" "74"
check "H no PASS line" "$(passn h)" "0"
# P: fail before: the same stale set under the before bytes of end_of_run.sh
mk p "$R1" "$R1 det=1" >/dev/null; stale p
rp=$(run p ktest-b${KP:-8} "$EOR_PRE")
check "P fail before: the old end_of_run.sh passes (exit 0) with the stale set kept" "$rp $(gzip -dc $E/p/train/stageB/tables/E1_c04_s1_pool.tsv.gz | grep -c STALE)" "0 1"
check "P fail before: its PASS line carries no tables_digest" "$(grep '^PASS assemble-checks ' $E/p/train/RUNLOG.md | grep -c tables_digest)" "0"
# K: the "no kge-*/ktest-* running" precondition (exit 11), against the FAKE docker ps only (never the real kge-B1)
mk k "$R1" "$R1 det=1" >/dev/null
export FAKE_PS_1="kge-B1 ktest-G9"
check "K1 the fake ps lists kge-B1 and ktest-G9 at step 1 -> exit 11" "$(run k ktest-bx)" "11"
check "K1 the stop names both, no container started, no PASS line" "$(grep -c 'STOPPED (11): containers still running: kge-B1 ktest-G9' $E/k.out)$(grep -c 'starting ktest' $E/k.out)$(passn k)" "100"
unset FAKE_PS_1; export FAKE_PS_2="ktest-G9"
check "K2 a container appears during the memgate wait -> exit 11" "$(run k ktest-bx)" "11"
check "K2 the stop says started meanwhile, no container started, no PASS line" "$(grep -c 'STOPPED (11): containers started meanwhile: ktest-G9' $E/k.out)$(grep -c 'starting ktest' $E/k.out)$(passn k)" "100"
unset FAKE_PS_2
check "K the fake was asked (2 calls in K2)" "$(cat $E/k.pscnt)" "2"
# K3/K4 (the start race, after the 2026-11-14 reset): a twin is listed by the fake right after the start (call 3) or
# at the second look 3 s later (call 4) -> the gated container is removed before its release, exit 11, and assemble
# never ran (no assemble-*.rc); K3B the fail-before: r58c/B/pre-race/end_of_run.sh assembles beside the same twin
export FAKE_PS_3="ktest-G9"
check "K3 a twin listed right after the start -> exit 11" "$(run k ktest-b${K3N:-20})" "11"
check "K3 the stop names it, the container was started and removed unreleased, assemble never ran" "$(grep -c 'STOPPED (11): containers running after the start of ktest-b'${K3N:-20}' (ktest-b'${K3N:-20}' removed before its release): ktest-G9' $E/k.out)$(grep -c 'starting ktest' $E/k.out)$(ls $E/k/orchestrator/end-of-run/assemble-*.rc 2>/dev/null | wc -l | tr -d ' ')$(docker ps -a --format '{{.Names}}' | grep -cx ktest-b${K3N:-20})$(passn k)" "11000"
unset FAKE_PS_3; export FAKE_PS_4="ktest-G9"
check "K4 a twin listed at the second look -> exit 11, assemble never ran" "$(run k ktest-b${K4N:-21}) $(ls $E/k/orchestrator/end-of-run/assemble-*.rc 2>/dev/null | wc -l | tr -d ' ') $(cat $E/k.pscnt)" "11 0 4"
mk k3b "$R1" "$R1 det=1" >/dev/null
r3b=$(run k3b ktest-b${K3B:-22} "sh $LB/r58c/B/pre-race/end_of_run.sh")
check "K3B fail before: the old end_of_run.sh assembles although the twin is listed after its start" "$r3b $(ls $E/k3b/orchestrator/end-of-run/assemble-*.rc 2>/dev/null | wc -l | tr -d ' ')" "0 1"
unset FAKE_PS_4
# M (END-ORDER review of 1cdcb6e7, item 1): an empty memgate sample (a stub `powershell` first on PATH, so the real
# memgate.sh samples nothing, as in a sandboxed shell) -> exit 14 MEMGATE_EMPTY at step 4, before any container;
# MB the fail-before: r58c/B/pre-memgate/end_of_run.sh keeps sampling (EOR_MEM_TRIES=2) and stops 13, not MEMGATE_EMPTY
mkdir -p $E/nops; printf '#!/bin/sh\nexit 1\n' > $E/nops/powershell; chmod +x $E/nops/powershell
rm_=$( (PATH=$E/nops:$PATH; run k ktest-bx) )
check "M an empty memgate sample -> exit 14 MEMGATE_EMPTY, no container started, no PASS line" "$rm_ $(grep -c 'STOPPED (14): MEMGATE_EMPTY' $E/k.out) $(grep -c 'starting ktest' $E/k.out) $(passn k)" "14 1 0 0"
rmb=$( ( export PATH=$E/nops:$PATH EOR_WD=$EW/k EOR_WB=$E/k EOR_EXPORT=$LW/export EOR_EVAL=$LW/eval EOR_GUARD_LOG=$E/k/orchestrator/guard-stageB.log \
        EOR_RUNLOG=$E/k/train/RUNLOG.md EOR_LOGDIR=$EW/k/orchestrator/end-of-run EOR_NAME=ktest-bx EOR_TIMEOUT=580 EOR_MEM_TRIES=2 \
        EOR_DOCKER_PS="sh $E/fake_ps.sh" FAKE_PS_CNT=$E/mb.pscnt; sh $LB/r58c/B/pre-memgate/end_of_run.sh > $E/mb.out 2>&1; echo $? ) )
check "MB fail before: the old end_of_run.sh waits on the empty sample and stops 13" "$rmb $(grep -c MEMGATE_EMPTY $E/mb.out) $(grep -c 'starting ktest' $E/mb.out)" "13 0 0"
# KB: fail before: the end_of_run.sh before this hook asks the REAL docker, so the test depended on the real kge-B1
if docker ps --format '{{.Names}}' | grep -qx kge-B1; then
  rb=$( ( export EOR_WD=$EW/k EOR_WB=$E/k EOR_EXPORT=$LW/export EOR_EVAL=$LW/eval EOR_GUARD_LOG=$E/k/orchestrator/guard-stageB.log \
          EOR_RUNLOG=$E/k/train/RUNLOG.md EOR_LOGDIR=$EW/k/orchestrator/end-of-run EOR_NAME=ktest-bx EOR_DOCKER_PS="sh $E/fake_ps.sh" FAKE_PS_CNT=$E/kb.pscnt
          sh $E/end_of_run.before-fakeps.sh > $E/kb.out 2>&1; echo $? ) )
  check "KB fail before: the old script stops on the real kge-B1 although the fake lists nothing" "$rb $(grep -c 'containers still running: kge-B1' $E/kb.out)" "11 1"
else echo "KB skipped: kge-B1 is not running now (the fail-before needs it)"; fi
# the real lane is untouched
check "the real RUNLOG unchanged" "$(sha256sum "$LB/train/RUNLOG.md" | cut -d' ' -f1)" "$RL0"
echo "RESULT $([ $FAIL = 0 ] && echo PASS || echo FAIL) end-of-run ($N checks)"
