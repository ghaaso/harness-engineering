#!/bin/sh
# Plumbing test of orchestrator/end_of_run.sh on SYNTHETIC lane copies (make_copy.js) under r58b/eor/; never on
# train/stageB (the real export/ and eval/ are mounted read-only into the copy's container; the copy's own train/
# is mounted read-only with only its stageB/tables writable). Two ktest containers at most (cases C and E); the other
# cases stop before step 4. usage: sh test_end_of_run.sh   (host; node + docker; the real kge-B1 is left alone)
LW=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
LB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
EOR="sh $LB/orchestrator/end_of_run.sh"
R1="guard-stageB.sh kge-B1 procs=1 image=sha256:a890c54808c11c460d910945c4bf981390f7de43c8dfc5840269b76f5861cbe7"
RC="guard-stageB.sh kge-B1 procs=1 containers=2 image=sha256:a890c54808c11c460d910945c4bf981390f7de43c8dfc5840269b76f5861cbe7"
FAIL=0; N=0
check() { N=$((N+1)); if [ "$2" = "$3" ]; then echo "ok   $1: $2"; else echo "FAIL $1: got '$2' want '$3'"; FAIL=1; fi; }
mk() { node $LB/r58b/eor/make_copy.js "$LW" "$LB/r58b/eor/$1" "$2" "$3" "$4"; }
run() {  # run end_of_run.sh on copy $1 (container name $2); prints its exit code
  ( export EOR_WD=$LW/r58b/eor/$1 EOR_WB=$LB/r58b/eor/$1 EOR_EXPORT=$LW/export EOR_EVAL=$LW/eval \
      EOR_GUARD_LOG=$LB/r58b/eor/$1/orchestrator/guard-stageB.log EOR_RUNLOG=$LB/r58b/eor/$1/train/RUNLOG.md \
      EOR_LOGDIR=$LW/r58b/eor/$1/orchestrator/end-of-run EOR_NAME=$2 EOR_TIMEOUT=580 EOR_MEM_TRIES=40 EOR_TEST_IGNORE=kge-B1
    $EOR > "$LB/r58b/eor/$1.out" 2>&1; echo $? )
}
passn() { grep -c '^PASS assemble-checks ' "$LB/r58b/eor/$1/train/RUNLOG.md"; }
REALT=$(ls "$LB/train/stageB/tables" 2>/dev/null | wc -l); REALP=$(sha256sum "$LB/train/stageB/plan.json" | cut -d' ' -f1)
echo "sha256 $(sha256sum $LB/orchestrator/end_of_run.sh | cut -d' ' -f1) orchestrator/end_of_run.sh"
echo "sha256 $(sha256sum $LB/orchestrator/assemble_checks.py | cut -d' ' -f1) orchestrator/assemble_checks.py"
P0=$(grep -c '^PASS assemble-checks ' "$LB/train/RUNLOG.md")

# A: the guard has not reported completion -> stop at step 1, nothing started
mk a "$R1" "$R1 det=1" "2026-11-14T00:00:02Z launched kge-B1 (again)" >/dev/null
check "A no completion line -> exit 10" "$(run a ktest-x)" "10"
check "A no PASS line" "$(passn a)" "0"
# F: one unit left (its done line dropped) -> stop at step 2
mk f "$R1" "$R1 det=1" >/dev/null; sed -i '$d' "$LB/r58b/eor/f/train/progress.jsonl"
check "F a unit left -> exit 20" "$(run f ktest-x)" "20"
check "F no PASS line" "$(passn f)" "0"
# B: a corrupt part -> validate quarantines it -> stop at step 3, nothing started
mk b "$R1" "$R1 det=1" >/dev/null
d=$(ls -d $LB/r58b/eor/b/train/stageB/parts/E4/c12/s2/*/ | head -1); printf 'not gzip' > "$d/pool.tsv.gz"
check "B a corrupt part -> exit 30" "$(run b ktest-x)" "30"
check "B the part was quarantined (in the copy)" "$(ls $LB/r58b/eor/b/train/stageB/quarantine/*/E4/c12/s2 | wc -l)" "1"
check "B no PASS line" "$(passn b)" "0"
check "A/F/B started no container" "$(grep -c 'starting ktest' $LB/r58b/eor/a.out $LB/r58b/eor/f.out $LB/r58b/eor/b.out | awk -F: '{s+=$2} END {print s}')" "0"
# C: the positive run (container 1)
mk c "$R1" "$R1 det=1" >/dev/null
check "C complete copy -> exit 0" "$(run c ktest-${KC:-1})" "0"
check "C one PASS line appended to the COPY's RUNLOG" "$(passn c)" "1"
LOGREL=$(grep '^PASS assemble-checks ' $LB/r58b/eor/c/train/RUNLOG.md | awk '{print $3}')
check "C the log carries the current assemble_checks.py sha256 and PASS" \
  "$(grep -c "^sha256 $(sha256sum $LB/orchestrator/assemble_checks.py | cut -d' ' -f1) orchestrator/assemble_checks.py$" $LB/r58b/eor/c/$LOGREL)$(grep -c '^assemble_checks PASS' $LB/r58b/eor/c/$LOGREL)" "11"
check "C six table sets with _meta.json" "$(ls $LB/r58b/eor/c/train/stageB/tables/*_meta.json | wc -l)" "6"
check "C the log states the part count against the plan (--plan)" "$(grep -c '^train /w/train parts 318 planned 318 newest_part ' $LB/r58b/eor/c/$LOGREL)" "1"
check "C the log carries a tables_digest line" "$(grep -cE '^tables_digest [0-9a-f]{64}$' $LB/r58b/eor/c/$LOGREL)" "1"
# D: step 6 alone on C's tables: a missing _meta.json, then another plan_hash, are refused
TB=$LB/r58b/eor/c/train/stageB/tables
D1() { ( export EOR_WD=$LW/r58b/eor/c EOR_WB=$LB/r58b/eor/c EOR_LOGDIR=$LW/r58b/eor/c/orchestrator/end-of-run; $EOR check-tables > $LB/r58b/eor/d-$1.out 2>&1; echo $? ); }
check "D check-tables on C -> ok" "$(D1 ok)" "0"
mv $TB/E4_c12_s3_meta.json $TB/E4_c12_s3_meta.json.bak
check "D a missing _meta.json -> refused" "$(D1 miss)" "1"
node -e "const fs=require('fs');const p=process.argv[1];const m=JSON.parse(fs.readFileSync(p+'.bak'));m.plan_hash='0'.repeat(64);fs.writeFileSync(p,JSON.stringify(m))" $TB/E4_c12_s3_meta.json
check "D another plan_hash -> refused" "$(D1 stale)" "1"
check "D reason printed" "$(grep -c '^BAD E4_c12_s3: plan_hash 0000' $LB/r58b/eor/d-stale.out)" "1"
mv -f $TB/E4_c12_s3_meta.json.bak $TB/E4_c12_s3_meta.json
check "D restored -> ok" "$(D1 back)" "0"
# E: a single non-default runner (containers=2) and no accepted record -> assemble runs, assemble_checks refuses (container 2)
mk e "$RC" "$R1 det=1" >/dev/null
check "E non-default runner, no record -> exit 70" "$(run e ktest-${KE:-2})" "70"
check "E no PASS line" "$(passn e)" "0"
check "E reason in the log" "$(grep -h '^REFUSE R66 E1: parts from a non-default runner' $LB/r58b/eor/e/orchestrator/end-of-run/assemble_checks-*.log | wc -l)" "1"
# the real tree is untouched
check "real RUNLOG gained no PASS assemble-checks line" "$(grep -c '^PASS assemble-checks ' "$LB/train/RUNLOG.md")" "$P0"
check "real stageB tables and plan untouched" "$(ls "$LB/train/stageB/tables" 2>/dev/null | wc -l) $(sha256sum "$LB/train/stageB/plan.json" | cut -d' ' -f1)" "$REALT $REALP"
echo "RESULT $([ $FAIL = 0 ] && echo PASS || echo FAIL) end-of-run ($N checks)"
