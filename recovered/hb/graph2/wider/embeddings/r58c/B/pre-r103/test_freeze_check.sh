#!/bin/sh
# Host test (Git Bash, no container, no python) of r58c/B/freeze_check.sh, the refusals of r58c/B/freeze_list.sh and
# r58c/B/lane_step.sh that happen before any container. Builds its files under r58c/B/out/fc/ only (no real table,
# nothing under train/ or export/ is read or written). Fail-before: a mutant copy of freeze_check.sh that skips the
# # images block must fail case 4; r58c/B/pre-r94/lane_step.sh mounts the repository and the whole facts cache
# (case 9, ruling 94); r58c/B/pre-r94/freeze_check.sh passes an added part file (case 12, change 8).
# usage: sh test_freeze_check.sh        Prints RESULT PASS|FAIL test_freeze_check.
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
B=$W/r58c/B; O=$B/out/fc; rm -rf $O; mkdir -p $O; FAIL=0
echo "sha256 $(sha256sum $B/freeze_check.sh | cut -d' ' -f1) r58c/B/freeze_check.sh"
echo "sha256 $(sha256sum $B/freeze_list.sh | cut -d' ' -f1) r58c/B/freeze_list.sh"
echo "sha256 $(sha256sum $B/lane_step.sh | cut -d' ' -f1) r58c/B/lane_step.sh"
echo "sha256 $(sha256sum $0 | cut -d' ' -f1) r58c/B/tests/test_freeze_check.sh"
echo "sha256 $(sha256sum $B/mounts.js | cut -d' ' -f1) r58c/B/mounts.js"
echo "sha256 $(sha256sum $B/mounts-B.json | cut -d' ' -f1) r58c/B/mounts-B.json"
ok() { if [ "$2" = yes ]; then echo "PASS $1"; else echo "FAIL $1 $3"; FAIL=1; fi; }
echo one > $O/a.txt; echo two > $O/b.txt; echo out > $O/outside.txt
CPU=$(docker image inspect -f '{{.Id}}' graphtest-kge:1 | tr -d '\r'); GPU=$(docker image inspect -f '{{.Id}}' graphtest-kge-gpu:1 | tr -d '\r')
mk() { (cd $W && sha256sum r58c/B/out/fc/a.txt r58c/B/out/fc/b.txt | sed 's/ \*/  /'; echo "# outside"; sha256sum "$O/outside.txt" | sed 's/ \*/  /'
        echo "# images"; echo "$CPU  graphtest-kge:1"; echo "${1:-$GPU}  graphtest-kge-gpu:1") > $O/list.txt; }
run() { out=$(sh ${FC:-$B/freeze_check.sh} $O/list.txt 2>&1); rc=$?; }
mk; run; [ $rc -eq 0 ] && [ -z "$out" ] && r=yes || r=no; ok "1 an intact list: nothing printed, exit 0" $r "rc $rc out $out"
echo changed >> $O/b.txt; run; [ $rc -eq 1 ] && r=yes || r=no; ok "2 a changed lane file: exit 1" $r "rc $rc"
echo two > $O/b.txt; echo x >> $O/outside.txt; run; [ $rc -eq 1 ] && r=yes || r=no; ok "3 a changed outside file: exit 1" $r "rc $rc"
echo out > $O/outside.txt; mk sha256:0000000000000000000000000000000000000000000000000000000000000000; run
[ $rc -eq 1 ] && echo "$out" | grep -q 'graphtest-kge-gpu:1: image' && r=yes || r=no; ok "4 a wrong image ID: exit 1" $r "rc $rc out $out"
sed 's/^awk .\/\^# images\$\/{b=3;next} b==3. "\$LIST" | while/true | while/' $B/freeze_check.sh > $O/mutant_freeze_check.sh
FC=$O/mutant_freeze_check.sh run; [ $rc -eq 0 ] && r=yes || r=no; ok "4-fail-before the mutant that skips # images passes the wrong ID (case 4 fails on it)" $r "mutant rc $rc"
mk; run; [ $rc -eq 0 ] && r=yes || r=no; ok "5 the list restored: exit 0" $r "rc $rc"
sh $B/freeze_check.sh $O/none.txt >/dev/null 2>&1; [ $? -eq 2 ] && r=yes || r=no; ok "6 no list: exit 2" $r
sh $B/freeze_list.sh >/dev/null 2>&1; [ $? -eq 2 ] && r=yes || r=no; ok "7 freeze_list without the manifests: exit 2" $r
sh $B/freeze_list.sh r58c/B/out/fc/nothere.txt r58c/B/out/fc/a.txt >/dev/null 2>&1; [ $? -eq 2 ] && r=yes || r=no; ok "8 freeze_list with a missing manifest: exit 2" $r
sh $B/freeze_list.sh r58c/B/out/fc/a.txt r58c/B/out/fc/b.txt >/dev/null 2>&1; [ $? -eq 2 ] && r=yes || r=no; ok "8b freeze_list without the tune staging manifest (ruling 94(b)): exit 2" $r
sh $B/freeze_list.sh r58c/B/out/fc/a.txt r58c/B/out/fc/b.txt r58c/B/out/fc/nothere.txt >/dev/null 2>&1; [ $? -eq 2 ] && r=yes || r=no; ok "8c freeze_list with a missing tune staging manifest: exit 2" $r
sh $B/freeze_list.sh r58c/B/out/fc/a.txt r58c/B/out/fc/b.txt r58c/B/out/fc/a.txt >/dev/null 2>&1; [ $? -eq 2 ] && r=yes || r=no; ok "8d freeze_list without the tune graphs manifest (round 8, C11): exit 2" $r
sh $B/freeze_list.sh r58c/B/out/fc/a.txt r58c/B/out/fc/b.txt r58c/B/out/fc/a.txt r58c/B/out/fc/nothere.txt >/dev/null 2>&1; [ $? -eq 2 ] && r=yes || r=no; ok "8e freeze_list with a missing tune graphs manifest: exit 2" $r
# ruling 94(d): the mounts file and its reader (r58c/B/mounts.js; no container, nothing created: only `check` and unknown names)
MJ=$(cygpath -m $B/mounts.js)
MSYS_NO_PATHCONV=1 node "$MJ" check "$(cygpath -m $B/mounts-B.json)" >/dev/null 2>&1; [ $? -eq 0 ] && r=yes || r=no; ok "9 mounts.js check of r58c/B/mounts-B.json: exit 0" $r
G='{"src":"C:/x","dst":"/w/x","mode":"ro"}'
for c in 'rw-export|{"src":"C:/x","dst":"/w/export/g","mode":"rw"}' 'rw-stageB|{"src":"C:/x","dst":"/w/train/stageB/tables","mode":"rw"}' \
         'rw-build|{"src":"C:/x","dst":"/build/facts/cache","mode":"rw"}' 'rw-whole-lane|{"src":"C:/x","dst":"/w","mode":"rw"}' \
         'dotdot|{"src":"C:/x/../y","dst":"/w/y","mode":"ro"}' 'relative-src|{"src":"train","dst":"/w/train","mode":"ro"}' \
         'bad-mode|{"src":"C:/x","dst":"/w/x","mode":"w"}' 'stamp-ro|{"src":"C:/x/<STAMP>","dst":"/w/out","mode":"ro"}'; do
  t=${c%%|*}; m=${c#*|}; echo "{\"ktest-r1\": {\"step\": \"t\", \"allow\": [$G, $m]}}" > $O/m-$t.json
  MSYS_NO_PATHCONV=1 node "$MJ" check "$(cygpath -m $O/m-$t.json)" >/dev/null 2>&1; [ $? -eq 2 ] && r=yes || r=no; ok "9 mounts.js refuses a file with $t: exit 2" $r
done
echo "{\"ktest-r1\": {\"step\": \"t\", \"allow\": [$G, $G]}}" > $O/m-dup.json
MSYS_NO_PATHCONV=1 node "$MJ" check "$(cygpath -m $O/m-dup.json)" >/dev/null 2>&1; [ $? -eq 2 ] && r=yes || r=no; ok "9 mounts.js refuses a dst twice: exit 2" $r
echo "{\"ktest-r1\": {\"step\": \"t\", \"allow\": [{\"src\":\"$(cygpath -m $O)/nothere\",\"dst\":\"/w/n\",\"mode\":\"ro\"},{\"src\":\"$(cygpath -m $O)/mk-rw\",\"dst\":\"/w/m\",\"mode\":\"rw\"}]}}" > $O/m-miss.json
MSYS_NO_PATHCONV=1 node "$MJ" flags "$(cygpath -m $O/m-miss.json)" ktest-r1 >/dev/null 2>&1; [ $? -eq 3 ] && [ ! -d $O/mk-rw ] && r=yes || r=no
ok "9 mounts.js flags: a missing read-only source is exit 3, and no writable folder is created first" $r
echo "{\"ktest-r1\": {\"step\": \"t\", \"allow\": [{\"src\":\"$(cygpath -m $O)/a.txt\",\"dst\":\"/w/a.txt\",\"mode\":\"ro\"},{\"src\":\"$(cygpath -m $O)/mk-rw\",\"dst\":\"/w/m\",\"mode\":\"rw\"}]}}" > $O/m-ok.json
f=$(MSYS_NO_PATHCONV=1 node "$MJ" flags "$(cygpath -m $O/m-ok.json)" ktest-r1 2>&1); [ "$f" = "-v $(cygpath -m $O)/a.txt:/w/a.txt:ro -v $(cygpath -m $O)/mk-rw:/w/m" ] && [ -d $O/mk-rw ] && r=yes || r=no
ok "9 mounts.js flags: exactly the listed pairs, ro marked, the rw folder created" $r "got [$f]"
MSYS_NO_PATHCONV=1 node "$MJ" flags "$(cygpath -m $O/m-ok.json)" ktest-r2 >/dev/null 2>&1; [ $? -eq 2 ] && r=yes || r=no; ok "9 mounts.js flags: a name without an entry is exit 2" $r
# round 8 (ruling 101 (e)): ktest-eor alone may mount /w/train/stageB/tables writable; nothing else under stageB
echo "{\"ktest-eor\": {\"step\": \"1\", \"allow\": [$G, {\"src\":\"C:/x\",\"dst\":\"/w/train/stageB/tables\",\"mode\":\"rw\"}]}}" > $O/m-eor.json
echo "{\"ktest-eor\": {\"step\": \"1\", \"allow\": [$G, {\"src\":\"C:/x\",\"dst\":\"/w/train/stageB/parts\",\"mode\":\"rw\"}]}}" > $O/m-eor-parts.json
MSYS_NO_PATHCONV=1 node "$MJ" check "$(cygpath -m $O/m-eor.json)" >/dev/null 2>&1; [ $? -eq 0 ] && r=yes || r=no; ok "9 mounts.js: ktest-eor with /w/train/stageB/tables writable: exit 0" $r
MSYS_NO_PATHCONV=1 node "$MJ" check "$(cygpath -m $O/m-eor-parts.json)" >/dev/null 2>&1; [ $? -eq 2 ] && r=yes || r=no; ok "9 mounts.js: ktest-eor with /w/train/stageB/parts writable is refused: exit 2" $r
MSYS_NO_PATHCONV=1 node "$(cygpath -m $B/pre-r101/mounts.js)" check "$(cygpath -m $O/m-eor.json)" >/dev/null 2>&1; [ $? -eq 2 ] && r=yes || r=no; ok "9-fail-before r58c/B/pre-r101/mounts.js refuses the ktest-eor entry: exit 2" $r
eor=$(node -e 'const M=require(process.argv[1]);const e=M["ktest-eor"];console.log(e?e.step+" "+e.allow.map(m=>m.dst+":"+m.mode).sort().join(","):"none")' "$(cygpath -m $B/mounts-B.json)")
[ "$eor" = "1 /w/eor:rw,/w/eval:ro,/w/export/checkpoints.py:ro,/w/export/parents.jsonl:ro,/w/export/parents_git.jsonl:ro,/w/orchestrator/assemble_checks.py:ro,/w/train/stageB/tables:rw,/w/train:ro" ] && r=yes || r=no
ok "9 mounts-B.json: ktest-eor (step 1) holds only what assemble reads (no export/ whole, no orchestrator/ whole)" $r "$eor"
# lane_step (ruling 94): the before bytes mount the repository and the whole facts cache for every step (fail-before);
# the after bytes take -v flags from the mounts file only, and r1..r9 name neither /repo nor /build/facts/cache
grep -q -- '-v $REPO:/repo:ro' $B/pre-r94/lane_step.sh && grep -q -- '-v $GB/facts/cache:/build/facts/cache:ro' $B/pre-r94/lane_step.sh && r=yes || r=no
ok "9-fail-before r58c/B/pre-r94/lane_step.sh mounts the repository and the whole facts cache by default" $r
grep -q -- '-v $REPO\|-v $GB\|-v $W' $B/lane_step.sh && r=no || r=yes; ok "9 lane_step.sh has no -v of its own (only \$MOUNTS from the mounts file)" $r
bad=$(node -e 'const M=require(process.argv[1]);for(const k of Object.keys(M)){if(!/^ktest-r[1-9]$/.test(k))continue;for(const m of M[k].allow)if(m.src.endsWith("/graph2/build/facts/cache")||m.src==="C:/Users/User/Documents/projects/EMS_workshop1"||m.dst==="/repo"||m.dst==="/w")console.log(k+" "+m.src+" "+m.dst)}' "$(cygpath -m $B/mounts-B.json)")
[ -z "$bad" ] && r=yes || r=no; ok "9 mounts-B.json: ktest-r1..r9 mount neither the repository, the whole facts cache nor the whole lane (ruling 94(a))" $r "$bad"
r10=$(node -e 'const M=require(process.argv[1]);console.log(M["ktest-r10"].allow.filter(m=>m.src.endsWith("/graph2/build/facts/cache")||m.src==="C:/Users/User/Documents/projects/EMS_workshop1").map(m=>m.dst).sort().join(","))' "$(cygpath -m $B/mounts-B.json)")
[ "$r10" = "/build/facts/cache,/repo" ] && r=yes || r=no; ok "9 mounts-B.json: ktest-r10 (the leak audit) alone mounts both (ruling 94(c))" $r "$r10"
sh $B/lane_step.sh ktest-r99 "true" >/dev/null 2>&1; [ $? -eq 2 ] && r=yes || r=no; ok "9 lane_step refuses a name without a mounts entry: exit 2" $r
sh $B/lane_step.sh ktest-r9 "" >/dev/null 2>&1; [ $? -eq 2 ] && r=yes || r=no; ok "10 lane_step without a command: exit 2" $r
sh $B/lane_step.sh ktest-r9 "train/report" "true" >/dev/null 2>&1; [ $? -eq 2 ] && r=yes || r=no; ok "10 lane_step in the old three-argument form: exit 2" $r
# freeze_check: the set of stage-B part files (change 8), on a fake lane copy (only its W= line differs)
FL=$O/fakelane; mkdir -p $FL/train/stageB/parts/p1 $FL/r58c/B; echo s > $FL/train/stageB/parts/p1/scores.tsv; echo m > $FL/train/stageB/parts/p1/meta.json
FLW=$(cygpath -m $FL); sed "s#^W=.*#W=$FLW#" $B/freeze_check.sh > $FL/r58c/B/freeze_check.sh
grep -q "^W=$FLW\$" $FL/r58c/B/freeze_check.sh || { echo "GUARD: the fake lane copy of freeze_check.sh does not name the copy"; exit 3; }
(cd $FL && sha256sum train/stageB/parts/p1/meta.json train/stageB/parts/p1/scores.tsv | sed 's/ \*/  /'; echo "# outside"; echo "# images"; echo "$CPU  graphtest-kge:1"; echo "$GPU  graphtest-kge-gpu:1") > $FL/list.txt
out=$(sh $FL/r58c/B/freeze_check.sh $FL/list.txt 2>&1); [ $? -eq 0 ] && [ -z "$out" ] && r=yes || r=no; ok "12 the listed part files as they are: nothing printed, exit 0" $r "$out"
echo n > $FL/train/stageB/parts/p1/extra.tsv; echo t > $FL/train/stageB/parts/p1/tmp.part
out=$(sh $FL/r58c/B/freeze_check.sh $FL/list.txt 2>&1); [ $? -eq 1 ] && echo "$out" | grep -q 'new: train/stageB/parts/p1/extra.tsv' && ! echo "$out" | grep -q tmp.part && r=yes || r=no
ok "12 a part file added after the freeze: exit 1 (a .part file is ignored)" $r "$out"
sed "s#^W=.*#W=$FLW#" $B/pre-r94/freeze_check.sh > $FL/r58c/B/freeze_check_pre.sh
out=$(sh $FL/r58c/B/freeze_check_pre.sh $FL/list.txt 2>&1); [ $? -eq 0 ] && r=yes || r=no; ok "12-fail-before r58c/B/pre-r94/freeze_check.sh passes the added part file" $r "$out"
# 13 (the coordinator, round 3): freeze_list lists every file under train/report/ and train/selectB-test/ in a `# test output`
# block (*.part excluded), and freeze_check checks it with block 1; on a fake lane copy (its W=, GB= and PROTO= name the copy)
FZ=$O/fzlane; FZW=$(cygpath -m $FZ)
mkf() { mkdir -p "$(dirname "$FZ/$1")"; echo "${2:-x}" > "$FZ/$1"; }
for f in train/a.py train/HANDOFF-FORMAT.md train/stageA_configs.json train/stageB/plan.json train/stageA/refs.json eval/evalcore.py \
         eval/tune_tasks.jsonl eval/comparators/c.tsv export/e.py export/e.jsonl r58c/write_audit_claims.py r58c/B/rerun/rerun_check.py r58c/B/e5_route_audit.py \
         fixes/tests/test_select_report.py parallel/tests/test_assemble_checks.sh r58c/B/mounts.js r58c/B/mounts-B.json r58c/A/mounts-A.json \
         r58c/A/a.py train/stageB/tables/t.tsv train/r58/tests/t.py r58c/tests/t.py r58c/B/tests/t.sh m1.sha256 m2.sha256 m3.sha256 \
         r58c/A/mounts.js export/graphs/C1/f.tsv export/graphs0/C1/g.tsv gb/facts/cache/P1/f.json gb/facts/cache/P1/d/g.json \
         gb/results/frozen/relational/95e990307da3b42b.json gb/tasks/tasks.jsonl gb/arms/common/a.js proto.md; do mkf $f; done
for f in assemble_checks.py end_of_run.sh guard-prelaunch.js guard-stageB.sh guard-stageB-r92.sh memgate.sh END-ORDER.md grader-interface-v2.md \
         rerun_unit.py rerun_compare.py start-guard-r98.sh kge-B1-inspect-20261114T190928Z.json kge-B1-inspect-20261115T073116Z.json; do mkf orchestrator/$f; done
# round 8: the fake lane's plan names one held-out parent P1 (its facts in gb/facts/cache/P1); the tuning graphs' plan file names
# one checkpoint C1; train/heldout_inputs.js is the real file (called as it is) and writes m4.sha256, the tuning graphs' manifest
echo '{"heldout": {"assignment": {"P1": "x"}}}' > $FZ/train/stageB/plan.json
mkdir -p $FZ/r58c/B/frozen; echo '{"heldout": {"assignment": {"C1": "tuning checkpoint"}}}' > $FZ/r58c/B/frozen/tune-graphs-plan.json
cp $W/train/heldout_inputs.js $FZ/train/heldout_inputs.js
(cd $FZ && node train/heldout_inputs.js export-manifest --plan r58c/B/frozen/tune-graphs-plan.json --export export --out m4.sha256 >/dev/null 2>&1)
[ "$(cut -d' ' -f3 $FZ/m4.sha256 2>/dev/null | tr '\n' ' ')" = "export/graphs/C1/f.tsv export/graphs0/C1/g.tsv " ] || { echo "GUARD: export-manifest did not list the fake tuning graphs: $(cat $FZ/m4.sha256 2>&1)"; exit 3; }
mkf train/stageA/top3.json '{}'
mkf train/report/test.json T1; mkf train/report/answer_level/x.json T2; mkf train/selectB-test/PLACEBO/a.tsv.gz T3; mkf train/report/tune.json.123.part P
mkdir -p $FZ/r58c/B/eor $FZ/train/stageB/parts
for v in freeze_list.sh freeze_check.sh; do sed -e "s#^W=.*#W=$FZW#" -e "s#^GB=.*#GB=$FZW/gb#" -e "s#^PROTO=.*#PROTO=$FZW/proto.md#" $B/$v > $FZ/r58c/B/$v; done
sed -e "s#^W=.*#W=$FZW#" -e "s#^GB=.*#GB=$FZW/gb#" -e "s#^PROTO=.*#PROTO=$FZW/proto.md#" $B/pre-testout/freeze_list.sh > $FZ/r58c/B/freeze_list_pre.sh
sed -e "s#^W=.*#W=$FZW#" -e "s#^GB=.*#GB=$FZW/gb#" -e "s#^PROTO=.*#PROTO=$FZW/proto.md#" $B/pre-r97/freeze_list.sh > $FZ/r58c/B/freeze_list_pre97.sh
sed -e "s#^W=.*#W=$FZW#" -e "s#^GB=.*#GB=$FZW/gb#" -e "s#^PROTO=.*#PROTO=$FZW/proto.md#" $B/pre-r101/freeze_list.sh > $FZ/r58c/B/freeze_list_pre101.sh
for v in freeze_list.sh freeze_list_pre.sh; do
  grep -q "^W=$FZW\$" $FZ/r58c/B/$v && grep -q "^GB=$FZW/gb\$" $FZ/r58c/B/$v && grep -q "^PROTO=$FZW/proto.md\$" $FZ/r58c/B/$v || { echo "GUARD: the fake lane copy $v does not name the copy"; exit 3; }
done
(cd $FZ && sh r58c/B/freeze_list.sh m1.sha256 m2.sha256 m3.sha256 m4.sha256 > $O/fz-list.txt 2> $O/fz-err.txt); rcl=$?
tb=$(awk '/^# test output$/{b=1;next} /^# outside$/{b=0} b' $O/fz-list.txt | awk '{print $2}' | tr '\n' ' ')
[ $rcl -eq 0 ] && [ "$tb" = "train/report/answer_level/x.json train/report/test.json train/selectB-test/PLACEBO/a.tsv.gz " ] && r=yes || r=no
ok "13 freeze_list: a # test output block lists every file under train/report/ and train/selectB-test/ with sha256 (no .part)" $r "rc $rcl block [$tb] $(head -c 300 $O/fz-err.txt)"
out=$(sh $FZ/r58c/B/freeze_check.sh $O/fz-list.txt 2>&1); [ $? -eq 0 ] && [ -z "$out" ] && r=yes || r=no; ok "13 freeze_check passes the list with the block" $r "$out"
cp -p $FZ/train/report/test.json $O/test.json.keep  # round 8: restored after case 13, so case 16 checks the same list on the same bytes
echo changed >> $FZ/train/report/test.json; out=$(sh $FZ/r58c/B/freeze_check.sh $O/fz-list.txt 2>&1); [ $? -eq 1 ] && r=yes || r=no
ok "13 a test output changed after the freeze: freeze_check exit 1" $r "$out"
cp -p $O/test.json.keep $FZ/train/report/test.json
(cd $FZ && sh r58c/B/freeze_list_pre.sh m1.sha256 m2.sha256 m3.sha256 > $O/fz-list-pre.txt 2>/dev/null); rcp=$?
{ grep -q '^# test output$' $O/fz-list-pre.txt || grep -q 'train/report/test.json' $O/fz-list-pre.txt; } && r=no || r=yes
[ $rcp -eq 0 ] || r=no
ok "13-fail-before r58c/B/pre-testout/freeze_list.sh (exit 0 on the same lane) lists no train/report or train/selectB-test file" $r "rc $rcp"
# ruling 97 (step 9.2a, ktest-r11): the route audit's script is frozen, and the step has its own limit and a clean mount list
awk '{print $2}' $O/fz-list.txt > $O/fz-list-names.txt
grep -qx 'r58c/B/e5_route_audit.py' $O/fz-list-names.txt && r=yes || r=no; ok "14 freeze_list lists r58c/B/e5_route_audit.py (ruling 97)" $r
(cd $FZ && sh r58c/B/freeze_list_pre97.sh m1.sha256 m2.sha256 m3.sha256 > $O/fz-list-pre97.txt 2>/dev/null); rc97=$?
awk '{print $2}' $O/fz-list-pre97.txt | grep -qx 'r58c/B/e5_route_audit.py' && r=no || r=yes; [ $rc97 -eq 0 ] || r=no
ok "14-fail-before r58c/B/pre-r97/freeze_list.sh (exit 0 on the same lane) does not list it" $r "rc $rc97"
lim() { ( NAME=$2; eval "$(grep -E '^(LIMIT_R[0-9]+|MEM|MEM_R4|COMMIT_KB|COMMIT_R4)=' $1)"; eval "$(sed -n '/^case "\$NAME" in/,/^esac/p' $1 | grep -v 'exit 2')"; echo $LIMIT ) }
l11=$(lim $B/lane_step.sh ktest-r11); l11p=$(lim $B/pre-r97/lane_step.sh ktest-r11); l10=$(lim $B/lane_step.sh ktest-r10)
[ "$l11" = 1800 ] && [ "$l10" = 3600 ] && r=yes || r=no; ok "14 lane_step: ktest-r11 runs under LIMIT_R11 = 1800 s (ktest-r10 keeps 3600)" $r "r11 $l11 r10 $l10"
[ "$l11p" = 600 ] && r=yes || r=no; ok "14-fail-before r58c/B/pre-r97/lane_step.sh gives ktest-r11 the plumbing tests' 600 s" $r "$l11p"
# 16 (round 8): C7 both stage-B captures, C10 agent A's mounts.js, ruling 101 (d)'s starter, C11 the tuning graphs (block 1),
# C16 the held-out parents' facts (# outside); the fail-before is r58c/B/pre-r101/freeze_list.sh on the same fake lane
want16='orchestrator/kge-B1-inspect-20261114T190928Z.json orchestrator/kge-B1-inspect-20261115T073116Z.json orchestrator/start-guard-r98.sh r58c/A/mounts.js r58c/B/frozen/tune-graphs-plan.json export/graphs/C1/f.tsv export/graphs0/C1/g.tsv m4.sha256'
b1=$(awk '/^# test output$/{exit} {print $2}' $O/fz-list.txt); miss16=''; for f in $want16; do echo "$b1" | grep -qx "$f" || miss16="$miss16 $f"; done
[ $rcl -eq 0 ] && [ -z "$miss16" ] && r=yes || r=no; ok "16 freeze_list block 1 lists both captures, mounts.js, the r98 starter, the tuning graphs and their manifest" $r "rc $rcl missing [$miss16] $(head -c 300 $O/fz-err.txt)"
ob=$(awk '/^# outside$/{b=1;next} /^# images$/{b=0} b' $O/fz-list.txt | awk '{print $2}' | sed "s#^$FZW/##" | grep '^gb/facts/' | tr '\n' ' ')
[ "$ob" = "gb/facts/cache/P1/d/g.json gb/facts/cache/P1/f.json " ] && r=yes || r=no; ok "16 # outside lists every facts file of the held-out parents (C16)" $r "[$ob]"
out=$(sh $FZ/r58c/B/freeze_check.sh $O/fz-list.txt 2>&1); [ $? -eq 0 ] && [ -z "$out" ] && r=yes || r=no; ok "16 freeze_check passes the round-8 list" $r "$out"
echo x >> $FZ/gb/facts/cache/P1/f.json; out=$(sh $FZ/r58c/B/freeze_check.sh $O/fz-list.txt 2>&1); [ $? -eq 1 ] && r=yes || r=no; ok "16 a held-out parent's facts changed after the freeze: freeze_check exit 1" $r; echo x > $FZ/gb/facts/cache/P1/f.json
(cd $FZ && sh r58c/B/freeze_list_pre101.sh m1.sha256 m2.sha256 m3.sha256 > $O/fz-list-pre101.txt 2>/dev/null); rc101=$?
p1=$(awk '{print $2}' $O/fz-list-pre101.txt); hit=''; for f in $want16; do echo "$p1" | grep -qx "$f" && hit="$hit $f"; done
[ $rc101 -eq 0 ] && [ "$hit" = ' m4.sha256' -o -z "$hit" ] && ! grep -q 'gb/facts/cache' $O/fz-list-pre101.txt && r=yes || r=no
ok "16-fail-before r58c/B/pre-r101/freeze_list.sh (exit 0) lists none of them" $r "rc $rc101 hit [$hit]"
# 17 (C4): a path component named sealed, or a *reference*.jsonl file, anywhere in the lane -> exit 6 before anything is hashed
mkf r58c/A/out/leak_test/sealed/mounts-A.json; (cd $FZ && sh r58c/B/freeze_list.sh m1.sha256 m2.sha256 m3.sha256 m4.sha256 > /dev/null 2> $O/fz-err6.txt); rc6=$?
[ $rc6 -eq 6 ] && grep -q 'r58c/A/out/leak_test/sealed' $O/fz-err6.txt && r=yes || r=no; ok "17 a folder named sealed in the lane: freeze_list exit 6, named" $r "rc $rc6 $(cat $O/fz-err6.txt)"
(cd $FZ && sh r58c/B/freeze_list_pre101.sh m1.sha256 m2.sha256 m3.sha256 > /dev/null 2>&1); [ $? -eq 0 ] && r=yes || r=no; ok "17-fail-before r58c/B/pre-r101/freeze_list.sh passes it (exit 0)" $r
rm -rf $FZ/r58c/A/out; mkf r58c/x/heldout_reference_1.jsonl; (cd $FZ && sh r58c/B/freeze_list.sh m1.sha256 m2.sha256 m3.sha256 m4.sha256 > /dev/null 2> $O/fz-err6.txt); rc6=$?
[ $rc6 -eq 6 ] && grep -q 'heldout_reference_1.jsonl' $O/fz-err6.txt && r=yes || r=no; ok "17 a *reference*.jsonl file in the lane: freeze_list exit 6, named" $r "rc $rc6"; rm -rf $FZ/r58c/x
# 18 (C11): a tuning graph changed after its manifest -> exit 5 (verify-export, as it is)
echo y >> $FZ/export/graphs0/C1/g.tsv; (cd $FZ && sh r58c/B/freeze_list.sh m1.sha256 m2.sha256 m3.sha256 m4.sha256 > /dev/null 2> $O/fz-err5.txt); rc5=$?
[ $rc5 -eq 5 ] && r=yes || r=no; ok "18 a tuning graph that no longer matches its manifest: freeze_list exit 5" $r "rc $rc5 $(head -c 200 $O/fz-err5.txt)"
(cd $FZ && sh r58c/B/freeze_list_pre101.sh m1.sha256 m2.sha256 m3.sha256 > /dev/null 2>&1); [ $? -eq 0 ] && r=yes || r=no; ok "18-fail-before r58c/B/pre-r101/freeze_list.sh passes the changed graph (exit 0)" $r
echo x > $FZ/export/graphs0/C1/g.tsv
r11=$(node -e 'const M=require(process.argv[1]);const e=M["ktest-r11"];console.log(e?e.step+" "+e.allow.map(m=>m.dst+":"+m.mode).sort().join(","):"none")' "$(cygpath -m $B/mounts-B.json)")
[ "$r11" = "9.2a /build/tasks/tasks.jsonl:ro,/w/eval:ro,/w/export:ro,/w/r58c/B/e5_route_audit.py:ro,/w/train/report/e5_route:rw,/w/train:ro" ] && r=yes || r=no
ok "14 mounts-B.json: ktest-r11 (step 9.2a) mounts train, eval, export and its script read-only, tasks.jsonl alone, and only train/report/e5_route writable" $r "$r11"
r11p=$(node -e 'const M=require(process.argv[1]);console.log(M["ktest-r11"]?"present":"none")' "$(cygpath -m $B/pre-r97/mounts-B.json)")
[ "$r11p" = none ] && r=yes || r=no; ok "14-fail-before r58c/B/pre-r97/mounts-B.json has no ktest-r11" $r "$r11p"
# 15 (round 4, ruling 94(d)): no real step reads agent A's logs, so no container of mounts-B.json mounts r58c/A/logs
alg='const M=require(process.argv[1]);console.log(Object.keys(M).filter(k=>M[k].allow.some(m=>m.dst==="/w/r58c/A/logs"||/\/r58c\/A\/logs$/.test(m.src))).join(" ")||"none")'
al=$(node -e "$alg" "$(cygpath -m $B/mounts-B.json)"); alp=$(node -e "$alg" "$(cygpath -m $B/pre-alogs/mounts-B.json)")
[ "$al" = none ] && r=yes || r=no; ok "15 mounts-B.json: no container mounts r58c/A/logs" $r "$al"
[ "$alp" = "ktest-r1 ktest-r2 ktest-r3 ktest-r4 ktest-r6 ktest-r7 ktest-r8 ktest-r9" ] && r=yes || r=no
ok "15-fail-before r58c/B/pre-alogs/mounts-B.json mounts it into r1-r4 and r6-r9" $r "$alp"
grep -q "L('r58c/A/logs')" $B/gen_mounts.js && r=no || r=yes; ok "15 gen_mounts.js BASE has no r58c/A/logs" $r
grep -q "L('r58c/A/logs')" $B/pre-alogs/gen_mounts.js && r=yes || r=no; ok "15-fail-before r58c/B/pre-alogs/gen_mounts.js has it" $r
docker ps -a --format '{{.Names}}' | grep -q '^ktest-r9$' && r=no || r=yes; ok "11 no container was started" $r
rm -f $B/lane-steps/ktest-r99-*.log  # the refused lane_step calls above wrote only these logs
[ $FAIL -eq 0 ] && echo "RESULT PASS test_freeze_check" || echo "RESULT FAIL test_freeze_check"
exit $FAIL
