#!/bin/sh
# Plumbing test of orchestrator/assemble_checks.py on COPIES of real stage-B parts (train/stageB/parts/E1/c04/s1/*,
# read only) in parallel/test/ac/; never on train/stageB. usage: PY=<python> sh test_assemble_checks.sh [lane root]
# Prints one line per case and RESULT PASS|FAIL. Runs on the host (uv's python) or in the card image (/w paths).
L=${1:-C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings}
SRC=${SRC:-$L/train/stageB/parts/E1/c04/s1}
PY=${PY:-python}
T=${ACT:-$L/parallel/test/ac}; rm -rf "$T"; mkdir -p "$T"
AC="$PY $L/orchestrator/assemble_checks.py"
FAIL=0; N=0
check() { N=$((N+1)); if [ "$2" = "$3" ]; then echo "ok   $1: $2"; else echo "FAIL $1: got '$2' want '$3'"; FAIL=1; fi; }
setrunner() { $PY -c "import json,sys; p=sys.argv[1]+'/meta.json'; m=json.load(open(p)); m['runner']=sys.argv[2]; json.dump(m,open(p,'w'),indent=1)" "$1" "$2"; }
run() { $AC --train "$T/tree" --accepted "$T/accepted.json" --report "$T/report-$1.json" > "$T/out-$1.txt" 2>&1; echo $?; }
CKS=$(ls "$SRC" | grep -E '^[0-9a-f]{40}$' | head -3)
check "three real parts to copy" "$(echo "$CKS" | grep -c .)" "3"
mkdir -p "$T/tree/stageB/parts/E1/c04/s1" "$T/tree/stageB/parts/E4/c12/s1"
for c in $CKS; do cp -r "$SRC/$c" "$T/tree/stageB/parts/E1/c04/s1/"; cp -r "$SRC/$c" "$T/tree/stageB/parts/E4/c12/s1/"; done
R1=$($PY -c "import json,sys; print(json.load(open(sys.argv[1]+'/meta.json'))['runner'])" "$SRC/$(echo "$CKS" | head -1)")
RA="guard-stageAB.sh kge-A1 procs=1 containers=2 image=sha256:test det=1"
for c in $CKS; do setrunner "$T/tree/stageB/parts/E4/c12/s1/$c" "$RA"; done
check "real parts carry the stage-B runner" "$(echo "$R1" | grep -c '^guard-stageB.sh kge-B1 procs=1 image=sha256:')" "1"

check "1 one runner per arm, E4 det=1, no record -> pass" "$(run 1)" "0"
c3=$(echo "$CKS" | tail -1)
setrunner "$T/tree/stageB/parts/E4/c12/s1/$c3" "guard-stageAB.sh kge-A1 procs=1 containers=2 image=sha256:test"
check "2 an E4 part without det=1 -> refused" "$(run 2)" "1"
check "2 reason R67" "$(grep -c '^REFUSE R67 E4/c12/s1/' "$T/out-2.txt")" "1"
setrunner "$T/tree/stageB/parts/E4/c12/s1/$c3" "$RA"
check "2b det=1 as a word only (xdet=1 is not it)" "$(setrunner "$T/tree/stageB/parts/E4/c12/s1/$c3" "rerun xdet=1"; run 2b; setrunner "$T/tree/stageB/parts/E4/c12/s1/$c3" "$RA")" "1"
RB="guard-stageAB.sh kge-B1 procs=1 containers=2 image=sha256:test"
setrunner "$T/tree/stageB/parts/E1/c04/s1/$c3" "$RB"
check "3 E1 from two runners, no record -> refused" "$(run 3)" "1"
check "3 reason R66" "$(grep -c '^REFUSE R66 E1: parts from 2 runners' "$T/out-3.txt")" "1"
$PY -c "import json,sys; json.dump({'runners': [sys.argv[1]]}, open(sys.argv[2],'w'))" "$R1" "$T/accepted.json"
check "4 record naming one of the two runners -> refused" "$(run 4)" "1"
$PY -c "import json,sys; json.dump({'runners': [sys.argv[1], sys.argv[2]]}, open(sys.argv[3],'w'))" "$R1" "$RB" "$T/accepted.json"
check "5 record naming both -> pass" "$(run 5)" "0"
$PY -c "import json,sys; json.dump({'arms': {'E1': [sys.argv[1], sys.argv[2]]}}, open(sys.argv[3],'w'))" "$R1" "$RB" "$T/accepted.json"
check "6 per-arm record naming both -> pass" "$(run 6)" "0"
$PY -c "import json,sys; json.dump({'arms': {'E2': [sys.argv[1], sys.argv[2]]}}, open(sys.argv[3],'w'))" "$R1" "$RB" "$T/accepted.json"
check "7 record naming them for another arm -> refused" "$(run 7)" "1"
echo 'not json' > "$T/accepted.json"; check "8 record that does not parse -> refused" "$(run 8)" "1"
echo '[1, 2]' > "$T/accepted.json"; check "9 record that is not an object -> refused" "$(run 9)" "1"
$PY -c "import json,sys; json.dump({'runners': [sys.argv[1], sys.argv[2]]}, open(sys.argv[3],'w'))" "$R1" "$RB" "$T/accepted.json"
mkdir -p "$T/tree/stageB/tables"
$PY -c "import json,sys; json.dump({'plan_hash': 'x', 'runners': [{'runner': 'old runner', 'processes': 1}]}, open(sys.argv[1],'w'))" "$T/tree/stageB/tables/E1_c04_s1_meta.json"
check "10 assembled table from a runner no part carries -> refused" "$(run 10)" "1"
check "10 reason TBL" "$(grep -c '^REFUSE TBL E1_c04_s1' "$T/out-10.txt")" "1"
$PY -c "import json,sys; json.dump({'plan_hash': 'x', 'runners': [{'runner': sys.argv[1], 'processes': 1}, {'runner': sys.argv[2], 'processes': 1}]}, open(sys.argv[3],'w'))" "$R1" "$RB" "$T/tree/stageB/tables/E1_c04_s1_meta.json"
check "11 table runners = part runners -> pass" "$(run 11)" "0"
printf '{"runner": ' > "$T/tree/stageB/parts/E1/c04/s1/$c3/meta.json"
check "12 a part whose meta.json does not parse -> refused" "$(run 12)" "1"
check "13 the source parts are untouched (copies only)" "$($PY -c "import json,sys; print(json.load(open(sys.argv[1]+'/meta.json'))['runner'])" "$SRC/$c3")" "$R1"
echo "RESULT $([ $FAIL = 0 ] && echo PASS || echo FAIL) test_assemble_checks ($N checks)"
