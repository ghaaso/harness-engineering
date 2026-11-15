#!/bin/sh
# Host plumbing test of orchestrator/rerun_compare.py select and compare (stdlib parts; no training) on COPIES of real
# stage-B parts in parallel/test/rc-host/. usage: PY=<python> sh test_rerun_compare_host.sh -> RESULT PASS|FAIL
L=${1:-C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings}
SRC=$L/train/stageB/parts/E1/c04/s1
PY=${PY:-python}
T=$L/parallel/test/rc-host; rm -rf "$T"; mkdir -p "$T/tree/stageB/parts"
RC="$PY $L/orchestrator/rerun_compare.py"
FAIL=0; N=0
check() { N=$((N+1)); if [ "$2" = "$3" ]; then echo "ok   $1: $2"; else echo "FAIL $1: got '$2' want '$3'"; FAIL=1; fi; }
setmeta() { $PY -c "import json,sys; p=sys.argv[1]+'/meta.json'; m=json.load(open(p)); m[sys.argv[2]]=json.loads(sys.argv[3]); json.dump(m,open(p,'w'),indent=1)" "$1" "$2" "$3"; }
CKS=$(ls "$SRC" | grep -E '^[0-9a-f]{40}$' | head -4)
R1="guard-stageB.sh kge-B1 procs=1 image=sha256:x"; RB="guard-stageAB.sh kge-B1 procs=1 containers=2 image=sha256:x"
RA="guard-stageAB.sh kge-A1 procs=1 containers=2 image=sha256:x det=1"
i=0; : > "$T/tree/progress.jsonl"; : > "$T/tree/progress-A.jsonl"
for c in $CKS; do
  i=$((i+1)); c12=$(echo $c | cut -c1-12)
  for arm in E1 E4; do
    cid=c04; [ $arm = E4 ] && cid=c12
    d=$T/tree/stageB/parts/$arm/$cid/s1; mkdir -p "$d"; cp -r "$SRC/$c" "$d/"
    r=$R1; [ $arm = E1 ] && [ $i -ge 3 ] && r=$RB; [ $arm = E4 ] && r=$RA
    setmeta "$d/$c" runner "\"$r\""
    f=progress.jsonl; [ $arm = E4 ] && f=progress-A.jsonl
    echo "{\"step\": \"stageB\", \"unit\": \"$arm/$cid/s1/$c12\", \"status\": \"done\"}" >> "$T/tree/$f"
  done
done
# one untrained (no co_changed) unit and one torn line: neither may be picked
c4=$(echo "$CKS" | tail -1); setmeta "$T/tree/stageB/parts/E4/c12/s1/$c4" trained false
printf '{"step": "stageB", "unit": "E1/c04/s1/ffff' >> "$T/tree/progress.jsonl"
$RC select --tree "$T/tree" > "$T/picks.json"
check "one pick per (arm, cid, runner): 3 groups" "$($PY -c "import json,sys; print(len(json.load(open(sys.argv[1]))))" "$T/picks.json")" "3"
check "det only where the runner has det=1" "$($PY -c "import json,sys; print(sorted((p['unit'][:2], p['det']) for p in json.load(open(sys.argv[1]))))" "$T/picks.json")" "[('E1', False), ('E1', False), ('E4', True)]"
check "the untrained E4 unit is never picked" "$(grep -c 'E4/c12/s1/'"$(echo $c4 | cut -c1-12)" "$T/picks.json")" "0"
$RC select --tree "$T/tree" --by arm,runner > "$T/picks2.json"
check "--by arm,runner also 3 groups here" "$($PY -c "import json,sys; print(len(json.load(open(sys.argv[1]))))" "$T/picks2.json")" "3"
g=$($PY -c "import json,sys; print([p['group'] for p in json.load(open(sys.argv[1])) if p['unit'].startswith('E4')][0])" "$T/picks.json")
echo "{\"group\": \"$g\", \"result\": \"equal\"}" > "$T/ledger.jsonl"
check "a group in the ledger is not picked again" "$($RC select --tree "$T/tree" --ledger "$T/ledger.jsonl" | $PY -c "import json,sys; print(len(json.load(sys.stdin)))")" "2"
# compare: a record built from the part itself is equal; a changed score, count or loss is a MISMATCH with a marker
P=$($PY -c "import json,sys; print([p['part'] for p in json.load(open(sys.argv[1])) if p['unit'].startswith('E1')][0])" "$T/picks.json")
mkrec() { $PY - "$P" "$1" "$2" "$T/rec.jsonl" <<'EOF'
import json, sys, importlib.util
spec = importlib.util.spec_from_file_location('rc', sys.argv[2]); rc = importlib.util.module_from_spec(spec); spec.loader.exec_module(rc)
part, arm = sys.argv[1], sys.argv[3]
h = rc.part_hashes(part); m = json.load(open(part + '/meta.json'))
rec = dict(tag='t-' + arm, arm=arm, unit='x', status='done', losses=m['losses'], **h)
open(sys.argv[4], 'a').write(json.dumps(rec) + '\n')
EOF
}
mkrec "$L/orchestrator/rerun_compare.py" E1
$RC compare --part "$P" --rec "$T/rec.jsonl" --tag t-E1 --out "$T/cmp" > /dev/null; check "same part -> equal (exit 0)" "$?" "0"
cp -r "$P" "$T/tampered"; $PY - "$T/tampered" <<'EOF'
import gzip, sys
p = sys.argv[1] + '/pool.tsv.gz'; s = gzip.open(p).read().decode().split('\n')
h, row = s[0], s[1].split('\t'); row[2] = repr(float(row[2]) + 1e-7); s[1] = '\t'.join(row)
gzip.open(p, 'wb').write('\n'.join(s).encode())
EOF
$RC compare --part "$T/tampered" --rec "$T/rec.jsonl" --tag t-E1 --out "$T/cmp" > "$T/cmp-tamper.json"; check "one score changed in the last digits -> MISMATCH (exit 1)" "$?" "1"
check "marker written for E1" "$(wc -l < "$T/cmp/markers/sidebyside-stop-E1" | tr -d ' ')" "1"
check "only the pool table differs" "$($PY -c "import json,sys; r=json.load(open(sys.argv[1])); print(r['tables'], r['counts'], r['losses'])" "$T/cmp-tamper.json")" "{'pool': False, 'unrestricted': True} True True"
cp -r "$P" "$T/lossdiff"; setmeta "$T/lossdiff" losses "[1.0]"
$RC compare --part "$T/lossdiff" --rec "$T/rec.jsonl" --tag t-E1 > /dev/null; check "a different loss list -> MISMATCH for E1" "$?" "1"
mkrec "$L/orchestrator/rerun_compare.py" E5
$RC compare --part "$T/lossdiff" --rec "$T/rec.jsonl" --tag t-E5 > /dev/null; check "the same loss difference for E5 -> equal (tables and counts only)" "$?" "0"
echo "RESULT $([ $FAIL = 0 ] && echo PASS || echo FAIL) test_rerun_compare_host ($N checks)"
