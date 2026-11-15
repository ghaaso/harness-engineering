#!/bin/sh
# Plumbing test of orchestrator/assemble_checks.py on COPIES of real stage-B parts (train/stageB/parts/E1/c04/s1/*,
# read only) in parallel/test/ac/; never on train/stageB. usage: PY=<python> sh test_assemble_checks.sh [lane root]
# Prints one line per case and RESULT PASS|FAIL. Runs in a CPU container (ktest-N; /w paths) or on the host.
# AC_PY=<path> runs another copy of assemble_checks.py (the pre-fix snapshot, to show a case failing before a fix).
# Review finding evidence-6 (cases 1, 1b, 1c, 1d, 5, 6, 11): a single runner that is not the default one
# (guard-stageB.sh kge-B1 procs=1 image=<card image id>, ' det=1' added for E4) needs the accepted record too.
L=${1:-C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings}
SRC=${SRC:-$L/train/stageB/parts/E1/c04/s1}
PY=${PY:-python}
T=${ACT:-$L/parallel/test/ac}; rm -rf "$T"; mkdir -p "$T"
AC="$PY ${AC_PY:-$L/orchestrator/assemble_checks.py}"
FAIL=0; N=0
check() { N=$((N+1)); if [ "$2" = "$3" ]; then echo "ok   $1: $2"; else echo "FAIL $1: got '$2' want '$3'"; FAIL=1; fi; }
setrunner() { $PY -c "import json,sys; p=sys.argv[1]+'/meta.json'; m=json.load(open(p)); m['runner']=sys.argv[2]; json.dump(m,open(p,'w'),indent=1)" "$1" "$2"; }
setall() { for c in $CKS; do setrunner "$T/tree/stageB/parts/$1/$c" "$2"; done; }
record() { $PY -c "import json,sys; json.dump(json.loads(sys.argv[1]), open(sys.argv[2],'w'))" "$1" "$T/accepted.json"; }
run() { $AC --train "$T/tree" --accepted "$T/accepted.json" --report "$T/report-$1.json" > "$T/out-$1.txt" 2>&1; echo $?; }
CKS=$(ls "$SRC" | grep -E '^[0-9a-f]{40}$' | head -3)
check "three real parts to copy" "$(echo "$CKS" | grep -c .)" "3"
mkdir -p "$T/tree/stageB/parts/E1/c04/s1" "$T/tree/stageB/parts/E4/c12/s1"
for c in $CKS; do cp -r "$SRC/$c" "$T/tree/stageB/parts/E1/c04/s1/"; cp -r "$SRC/$c" "$T/tree/stageB/parts/E4/c12/s1/"; done
R1=$($PY -c "import json,sys; print(json.load(open(sys.argv[1]+'/meta.json'))['runner'])" "$SRC/$(echo "$CKS" | head -1)")
RA="guard-stageAB.sh kge-A1 procs=1 containers=2 image=sha256:test det=1"
RC=$(echo "$R1" | sed 's/procs=1 /procs=1 containers=2 /')
setall E4/c12/s1 "$RA"
check "real parts carry the stage-B runner" "$(echo "$R1" | grep -c '^guard-stageB.sh kge-B1 procs=1 image=sha256:')" "1"

check "1 E4 from ONE non-default runner (kge-A1, containers=2), no record -> refused" "$(run 1)" "1"
check "1 reason R66 non-default" "$(grep -c '^REFUSE R66 E4: parts from a non-default runner' "$T/out-1.txt")" "1"
check "1 prints its own sha256" "$(grep -c '^sha256 [0-9a-f]\{64\} orchestrator/assemble_checks.py$' "$T/out-1.txt")" "1"
J=$($PY -c "import json,sys; print(json.dumps({'runners': [sys.argv[1]]}))" "$RA"); record "$J"
check "1b a record naming that runner -> pass" "$(run 1b)" "0"
rm -f "$T/accepted.json"; setall E4/c12/s1 "$R1 det=1"
check "1c default runners only (E4 with det=1), no record -> pass" "$(run 1c)" "0"
setall E1/c04/s1 "$RC"
check "1d E1 from ONE runner with containers=2, no record -> refused" "$(run 1d)" "1"
check "1d reason R66 non-default" "$(grep -c '^REFUSE R66 E1: parts from a non-default runner' "$T/out-1d.txt")" "1"
setall E1/c04/s1 "$R1"; setall E4/c12/s1 "$RA"
c3=$(echo "$CKS" | tail -1)
setrunner "$T/tree/stageB/parts/E4/c12/s1/$c3" "guard-stageAB.sh kge-A1 procs=1 containers=2 image=sha256:test"
check "2 an E4 part without det=1 -> refused" "$(run 2)" "1"
check "2 reason R67" "$(grep -c '^REFUSE R67 E4/c12/s1/' "$T/out-2.txt")" "1"
setrunner "$T/tree/stageB/parts/E4/c12/s1/$c3" "rerun xdet=1"
check "2b det=1 as a word only (xdet=1 is not it)" "$(run 2b)" "1"
check "2b reason R67" "$(grep -c '^REFUSE R67 E4/c12/s1/' "$T/out-2b.txt")" "1"
setrunner "$T/tree/stageB/parts/E4/c12/s1/$c3" "$RA"
RB="guard-stageAB.sh kge-B1 procs=1 containers=2 image=sha256:test"
setrunner "$T/tree/stageB/parts/E1/c04/s1/$c3" "$RB"
check "3 E1 from two runners, no record -> refused" "$(run 3)" "1"
check "3 reason R66" "$(grep -c '^REFUSE R66 E1: parts from 2 runners' "$T/out-3.txt")" "1"
J=$($PY -c "import json,sys; print(json.dumps({'runners': [sys.argv[1]]}))" "$R1"); record "$J"
check "4 record naming one of the two runners -> refused" "$(run 4)" "1"
J=$($PY -c "import json,sys; print(json.dumps({'runners': sys.argv[1:]}))" "$R1" "$RB" "$RA"); record "$J"
check "5 record naming both (and E4's runner) -> pass" "$(run 5)" "0"
J=$($PY -c "import json,sys; print(json.dumps({'arms': {'E1': [sys.argv[1], sys.argv[2]], 'E4': [sys.argv[3]]}}))" "$R1" "$RB" "$RA"); record "$J"
check "6 per-arm record naming both (and E4's runner) -> pass" "$(run 6)" "0"
J=$($PY -c "import json,sys; print(json.dumps({'arms': {'E2': [sys.argv[1], sys.argv[2]], 'E4': [sys.argv[3]]}}))" "$R1" "$RB" "$RA"); record "$J"
check "7 record naming them for another arm -> refused" "$(run 7)" "1"
echo 'not json' > "$T/accepted.json"; check "8 record that does not parse -> refused" "$(run 8)" "1"
echo '[1, 2]' > "$T/accepted.json"; check "9 record that is not an object -> refused" "$(run 9)" "1"
J=$($PY -c "import json,sys; print(json.dumps({'runners': sys.argv[1:]}))" "$R1" "$RB" "$RA"); record "$J"
mkdir -p "$T/tree/stageB/tables"
$PY -c "import json,sys; json.dump({'plan_hash': 'x', 'runners': [{'runner': 'old runner', 'processes': 1}]}, open(sys.argv[1],'w'))" "$T/tree/stageB/tables/E1_c04_s1_meta.json"
check "10 assembled table from a runner no part carries -> refused" "$(run 10)" "1"
check "10 reason TBL" "$(grep -c '^REFUSE TBL E1_c04_s1' "$T/out-10.txt")" "1"
$PY -c "import json,sys; json.dump({'plan_hash': 'x', 'runners': [{'runner': sys.argv[1], 'processes': 1}, {'runner': sys.argv[2], 'processes': 1}]}, open(sys.argv[3],'w'))" "$R1" "$RB" "$T/tree/stageB/tables/E1_c04_s1_meta.json"
check "11 table runners = part runners -> pass" "$(run 11)" "0"
printf '{"runner": ' > "$T/tree/stageB/parts/E1/c04/s1/$c3/meta.json"
check "12 a part whose meta.json does not parse -> refused" "$(run 12)" "1"
check "13 the source parts are untouched (copies only)" "$($PY -c "import json,sys; print(json.load(open(sys.argv[1]+'/meta.json'))['runner'])" "$SRC/$c3")" "$R1"
# audit-result-4 (item 8 of the review round): nothing is not a pass; --plan pins the part count and prints the digest
mkdir -p "$T/empty/stageB/parts"
check "14 zero parts -> refused" "$($AC --train "$T/empty" --accepted "$T/none.json" > "$T/out-14.txt" 2>&1; echo $?)" "1"
check "14 reason PARTS" "$(grep -c '^REFUSE PARTS no finished part' "$T/out-14.txt")" "1"
for a in E1/c04 E4/c12; do for s in s1 s2 s3; do mkdir -p "$T/tree2/stageB/parts/$a/$s"; for c in $CKS; do cp -r "$SRC/$c" "$T/tree2/stageB/parts/$a/$s/"; done; done; done
for s in s1 s2 s3; do for c in $CKS; do setrunner "$T/tree2/stageB/parts/E4/c12/$s/$c" "$R1 det=1"; done; done
CK3=$(echo $CKS | tr ' ' ','); $PY -c "import json,sys; json.dump({'plan_hash': 'h', 'configs': {'E1': [{'config_id': 'c04'}], 'E4': [{'config_id': 'c12'}], 'E2': []}, 'checkpoints': sys.argv[1].split(',')}, open(sys.argv[2],'w'))" "$CK3" "$T/plan2.json"
check "15 --plan, 18 parts = 2 configs x 3 seeds x 3 checkpoints -> pass" "$($AC --train "$T/tree2" --accepted "$T/none.json" --plan "$T/plan2.json" > "$T/out-15.txt" 2>&1; echo $?)" "0"
check "15 prints the tree, the count and the tables digest" "$(grep -c '^train .* parts 18 planned 18 newest_part ' "$T/out-15.txt")$(grep -cE '^tables_digest [0-9a-f]{64}$' "$T/out-15.txt")" "11"
rm -rf "$T/tree2/stageB/parts/E4/c12/s3/$c3"
check "15b --plan, one part short -> refused" "$($AC --train "$T/tree2" --accepted "$T/none.json" --plan "$T/plan2.json" > "$T/out-15b.txt" 2>&1; echo $?)" "1"
check "15b reason PARTS" "$(grep -c '^REFUSE PARTS 17 finished parts, the plan has 18 units' "$T/out-15b.txt")" "1"
echo "RESULT $([ $FAIL = 0 ] && echo PASS || echo FAIL) test_assemble_checks ($N checks)"
