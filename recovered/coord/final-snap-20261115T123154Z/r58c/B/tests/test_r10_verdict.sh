#!/bin/sh
# Host test (stubs only, no container) of step 9.1's verdict check in r58c/B/lane_step.sh (round 6; agent A, round 8:
# leak_audit.py exits 0 when its verdict is FAIL). lane_step.sh runs in a copy of the lane (r58c/B/r10test/<case>/; only
# the lane path differs; a guard refuses a copy whose W=/WB= lines do not name it) against the fake docker
# (r58c/B/tests/fake_docker.sh, every container exits 0) behind a wrapper that writes $RV_JSON to the copy's
# train/leak_audit/leak_audit.json at `docker wait`, i.e. while the step runs, and a stub memgate.sh.
#   after bytes: a FAIL verdict with exit 0 -> exit 10 (last line "lane_step: exit 10"); a pass (ok true, test false)
#     -> exit 0 (last line the command's rc line); a test verdict, a stale file (not written by this run), a missing
#     file and an unreadable file -> exit 10; another step (ktest-r99) is not checked.
#   before bytes (r58c/B/pre-r98/lane_step.sh): the FAIL verdict with exit 0 passes as exit 0 (fail before).
# Round 8, C29 (pre-check M1), C21/C48 (ruling 103(d)), C19 (ruling 103(b)), C45: a TEST run needs a TEST mounts file
# (LS_MOUNTS, "_test", not the real file, no held-out graph row, no writable row in a real output place), exit 2
# otherwise; a real run creates its writable folders only after the freeze gate, a TEST run creates none; the TEST
# entry is logged against the real one row by row; LIMIT_R8 = LIMIT_R9 = 3600; LS_TEST_LIMIT lowers a TEST run's limit.
# Fail-before for these: r58c/B/pre-r104/lane_step.sh.
# usage: sh r58c/B/tests/test_r10_verdict.sh   (log: r58c/B/logs/test_r10_verdict.log)
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
WW=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
RT=$WB/r58c/B/r10test; rm -rf "$RT"; mkdir -p "$RT/bin" $WB/r58c/B/logs
LOG=$WB/r58c/B/logs/test_r10_verdict.log; : > "$LOG"
cp $WB/r58c/B/tests/fake_docker.sh "$RT/bin/docker-fake"
cat > "$RT/bin/docker" <<'EOF'
#!/bin/sh
# wrapper: at `docker wait` the step "writes" its verdict file (RV_JSON names the content; empty = writes nothing)
if [ "$1" = wait ] && [ -n "$RV_JSON" ]; then printf '%s' "$RV_JSON" > "$RV_DIR/train/leak_audit/leak_audit.json"; fi
exec sh "$(dirname "$0")/docker-fake" "$@"
EOF
printf '#!/bin/sh\nexit 0\n' > "$RT/bin/sleep"
chmod +x "$RT/bin/"*
export PATH="$RT/bin:$PATH" DOCKER_HOST=tcp://127.0.0.1:9 RG_RACER=0
export RG_CPU_ID=sha256:55715543bc43c85e8426eb6934d9ba8196307b0ef0b0ccd357da85350ac97711
[ "$(command -v docker)" = "$RT/bin/docker" ] || { echo "the fake docker is not first on PATH: $(command -v docker)" | tee -a "$LOG"; exit 3; }
fails=0; n=0
checkp() { case "$2" in "$3"*) check "$1" yes yes ;; *) check "$1" "$2" "$3..." ;; esac; }  # prefix match
check() { n=$((n+1)); if [ "$2" = "$3" ]; then echo "PASS $1" | tee -a "$LOG"; else fails=$((fails+1)); echo "FAIL $1: got [$2] want [$3]" | tee -a "$LOG"; fi; }
echo "sha256 $(sha256sum $WB/r58c/B/lane_step.sh | cut -c1-64) r58c/B/lane_step.sh (after); $(sha256sum $WB/r58c/B/pre-r98/lane_step.sh | cut -c1-64) r58c/B/pre-r98/lane_step.sh (before)" | tee -a "$LOG"
mk() { # mk <case> <lane_step.sh to copy>
  d=$RT/$1; mkdir -p $d/r58c/B $d/orchestrator $d/state $d/train/leak_audit
  printf '#!/bin/sh\ncase "$1" in sample) echo "8000000 1000000" ;; esac\nexit 0\n' > $d/orchestrator/memgate.sh
  DW=$(cd $d && pwd -W 2>/dev/null || cygpath -m $d)
  MSYS_NO_PATHCONV=1 node -e 'const fs=require("fs");const [src,dst,wb,ww,db,dw]=process.argv.slice(1);let s=fs.readFileSync(src,"utf8");s=s.split(ww).join(dw).split(wb).join(db);fs.writeFileSync(dst,s)' \
    "$(cygpath -m "$2")" "$(cygpath -m "$d/r58c/B/lane_step.sh")" "$WB" "$WW" "$d" "$DW"
  grep -E "^(W|WB)=" $d/r58c/B/lane_step.sh | while IFS== read -r k v; do
    [ "$v" = "$d" ] || [ "$v" = "$DW" ] || { echo "GUARD: $d lane_step.sh line $k=$v does not name the copy" | tee -a "$LOG"; exit 1; }
  done || exit 3
  cp $WB/r58c/B/race_gate.sh $WB/r58c/B/mounts.js $WB/r58c/B/graph_rows.js $d/r58c/B/
  # C29: the copy's plan names one held-out parent HP1 (graph_rows.js test-check reads it)
  mkdir -p $d/train/stageB $d/export/graphs/HP1 $d/export/graphs/TP1; printf '{"assignment": {"TP1": "t"}, "heldout": {"assignment": {"HP1": "h"}}}\n' > $d/train/stageB/plan.json
  # round 8 (C16): a lane step needs a freeze list; the copy gets a stub list and a stub freeze_check.sh that passes it
  [ -n "${NO_FREEZE_STUB:-}" ] || { printf 'x\n' > $d/orchestrator/freeze-list.txt; printf '#!/bin/sh\nexit 0\n' > $d/r58c/B/freeze_check.sh; }
  printf '{"ktest-r10": {"step": "9.1", "allow": [{"src": "%s/r58c", "dst": "/w/r58c", "mode": "ro"}, {"src": "%s/train/leak_audit", "dst": "/w/train/leak_audit", "mode": "rw"}]},\n "ktest-r99": {"step": "test", "allow": [{"src": "%s/r58c", "dst": "/w/r58c", "mode": "ro"}, {"src": "%s/r58c/B/out/r99rw", "dst": "/w/r99rw", "mode": "rw"}]}}\n' "$DW" "$DW" "$DW" "$DW" > $d/r58c/B/mounts-B.json
}
go() { # go <case> <name> <json written during the run>: prints "exit|last line"
  c=$1; export RG_STATE=$RT/$c/state RV_DIR=$RT/$c RV_JSON="$3"
  ( sh $RT/$c/r58c/B/lane_step.sh $2 "python leak_audit.py --x" > $RT/$c/out.txt 2>&1 ); rc=$?
  l=$(ls -t $RT/$c/r58c/B/lane-steps/*.log 2>/dev/null | head -1); last=$(tail -1 "$l" 2>/dev/null | cut -d' ' -f2-)
  echo "$rc|$last"
}
tf_() { # tf_ <case> [extra row JSON] [mark]: the case's TEST mounts file alt.json (ktest-r10 and ktest-r99, read-only rows)
  d_=$RT/$1; DW_=$(cd $d_ && pwd -W 2>/dev/null || cygpath -m $d_); mk_=${3-'"_test": "t", '}
  printf '{%s"ktest-r10": {"step": "9.1", "allow": [{"src": "%s/r58c", "dst": "/w/r58c", "mode": "ro"}%s]}, "ktest-r99": {"step": "test", "allow": [{"src": "%s/r58c", "dst": "/w/r58c", "mode": "ro"}, {"src": "%s/r58c/B/out/r99rw", "dst": "/w/r99rw", "mode": "rw"}]}}\n' "$mk_" "$DW_" "${2:+, $2}" "$DW_" "$DW_" > $d_/alt.json
}
FAILJ='{"ok": false, "test": false, "failures": [1]}'; PASSJ='{"ok": true, "test": false}'
mk a-fail $WB/r58c/B/lane_step.sh; r=$(go a-fail ktest-r10 "$FAILJ")
checkp "after: a FAIL verdict with exit 0 is refused, exit 10, lane_step's own last line" "$r" "10|lane_step: exit 10 (step 9.1 verdict not a pass: ok false, test false"
grep -q 'ktest-r10: rc 0; command' $RT/a-fail/r58c/B/lane-steps/*.log && v=yes || v=no; check "after: the command's rc line is kept before the refusal" $v yes
mk b-pass $WB/r58c/B/lane_step.sh; r=$(go b-pass ktest-r10 "$PASSJ")
checkp "after: a pass (ok true, test false) written by the run: exit 0, the command's rc line last" "$r" "0|ktest-r10: rc 0; command: python leak_audit.py"
grep -q 'step 9.1 verdict: train/leak_audit/leak_audit.json sha256 [0-9a-f]\{64\}: ok true, test false' $RT/b-pass/r58c/B/lane-steps/*.log && v=yes || v=no
check "after: the pass names the verdict file's sha256 in the log" $v yes
mk c-test $WB/r58c/B/lane_step.sh; r=$(go c-test ktest-r10 '{"ok": true, "test": true}')
check "after: a test verdict (test true) is refused" "${r%%|*}" 10
mk d-stale $WB/r58c/B/lane_step.sh; printf '%s' "$PASSJ" > $RT/d-stale/train/leak_audit/leak_audit.json; r=$(go d-stale ktest-r10 "")
checkp "after: a pass left from before the start and not rewritten is refused (not written by this run)" "$r" "10|lane_step: exit 10 (step 9.1 verdict not a pass: not written by this run"
mk e-missing $WB/r58c/B/lane_step.sh; r=$(go e-missing ktest-r10 "")
check "after: no verdict file is refused" "${r%%|*}" 10
mk f-bad $WB/r58c/B/lane_step.sh; r=$(go f-bad ktest-r10 '{"ok": tru')
check "after: an unreadable verdict file is refused" "${r%%|*}" 10
mk g-other $WB/r58c/B/lane_step.sh; r=$(go g-other ktest-r99 "$FAILJ")
check "after: another step is not checked (ktest-r99 with the same file: exit 0)" "${r%%|*}" 0
mk z-before $WB/r58c/B/pre-r98/lane_step.sh; r=$(go z-before ktest-r10 "$FAILJ")
checkp "before (fail-before): r58c/B/pre-r98/lane_step.sh passes a FAIL verdict with exit 0" "$r" "0|ktest-r10: rc 0; command: python leak_audit.py"
# round 8 (C16): without orchestrator/freeze-list.txt a step ktest-r1..r11 exits 5 (lane_step's own); a pre-freeze TEST run
# needs LS_PREFREEZE=test AND --test in its command; the before bytes r58c/B/pre-r101/lane_step.sh start without a list
export NO_FREEZE_STUB=1
mk h-nolist $WB/r58c/B/lane_step.sh; r=$(go h-nolist ktest-r10 "$PASSJ")
checkp "C16 after: no freeze list -> exit 5, lane_step's own last line" "$r" "5|lane_step: no orchestrator/freeze-list.txt: ktest-r10 is a real step"
mk i-pre $WB/r58c/B/lane_step.sh; tf_ i-pre; r=$( export LS_PREFREEZE=test LS_MOUNTS=$(cygpath -m $RT/i-pre/alt.json); c=i-pre; export RG_STATE=$RT/$c/state RV_DIR=$RT/$c RV_JSON="$PASSJ"
  ( sh $RT/$c/r58c/B/lane_step.sh ktest-r10 "python leak_audit.py --x --test" > $RT/$c/out.txt 2>&1 ); echo $? )
check "C16 after: LS_PREFREEZE=test with --test in the command (and a TEST mounts file, C29) runs without a list (exit 0)" "$r" 0
grep -q 'a pre-freeze TEST run' $RT/i-pre/r58c/B/lane-steps/*.log && v=yes || v=no; check "C16 after: the pre-freeze TEST run is logged as one" $v yes
mk j-pre $WB/r58c/B/lane_step.sh; r=$( export LS_PREFREEZE=test; c=j-pre; export RG_STATE=$RT/$c/state RV_DIR=$RT/$c RV_JSON="$PASSJ"
  ( sh $RT/$c/r58c/B/lane_step.sh ktest-r10 "python leak_audit.py --x" > $RT/$c/out.txt 2>&1 ); echo $? )
check "C16 after: LS_PREFREEZE=test without --test in the command still exits 5" "$r" 5
mk y-before $WB/r58c/B/pre-r101/lane_step.sh; r=$(go y-before ktest-r10 "$PASSJ")
checkp "C16 before (fail-before): r58c/B/pre-r101/lane_step.sh starts a real step without a freeze list (exit 0)" "$r" "0|ktest-r10: rc 0; command: python leak_audit.py"
unset NO_FREEZE_STUB
# round 8 (ruling 102): a TEST run (LS_PREFREEZE=test and --test) may name a TEST mounts file in LS_MOUNTS and its record
# goes to r58c/B/out/mounts-test/, never r58c/mounts/; LS_MOUNTS without a TEST run is refused (exit 2)
tr_go() { # tr_go <case> <LS_PREFREEZE> <command>: LS_MOUNTS = the case's alt.json; prints the exit code
  c=$1; [ -f $RT/$c/alt.json ] || tf_ $c; export RG_STATE=$RT/$c/state RV_DIR=$RT/$c RV_JSON="$PASSJ"
  ( LS_PREFREEZE=$2 LS_MOUNTS=$(cygpath -m $RT/$c/alt.json) sh $RT/$c/r58c/B/lane_step.sh ktest-r10 "$3" > $RT/$c/out.txt 2>&1 ); echo $?
}
mk k-lsm $WB/r58c/B/lane_step.sh; r=$(tr_go k-lsm "" "python leak_audit.py --x --test")
check "ruling 102 after: LS_MOUNTS without LS_PREFREEZE=test is refused (exit 2)" "$r" 2
grep -q 'LS_MOUNTS and LS_TEST_LIMIT are for a TEST run only' $RT/k-lsm/r58c/B/lane-steps/*.log && v=yes || v=no; check "ruling 102 after: the refusal names the rule" $v yes
mk l-test $WB/r58c/B/lane_step.sh; r=$(tr_go l-test test "python leak_audit.py --x --test")
check "ruling 102 after: a TEST run with LS_MOUNTS runs (exit 0)" "$r" 0
ls $RT/l-test/r58c/B/out/mounts-test/ktest-r10-*.json >/dev/null 2>&1 && v=yes || v=no; check "ruling 102 after: the TEST record is under r58c/B/out/mounts-test/" $v yes
[ -e $RT/l-test/r58c/mounts/ktest-r10.json ] && v=yes || v=no; check "ruling 102 after: no TEST record in r58c/mounts/" $v no
grep -q 'alt.json sha256 [0-9a-f]\{64\}), a TEST run' $RT/l-test/r58c/B/lane-steps/*.log && v=yes || v=no; check "ruling 102 after: the log names the TEST mounts file and marks the run" $v yes
mk m-real $WB/r58c/B/lane_step.sh; r=$(go m-real ktest-r10 "$PASSJ")
[ -s $RT/m-real/r58c/mounts/ktest-r10.json ] && [ ! -d $RT/m-real/r58c/B/out/mounts-test ] && v=yes || v=no
check "ruling 102 after: a real run's record stays r58c/mounts/ktest-r10.json" "${r%%|*} $v" "0 yes"
mk x-before $WB/r58c/B/pre-r101/lane_step.sh; r=$(tr_go x-before test "python leak_audit.py --x --test")
[ -e $RT/x-before/r58c/mounts/ktest-r10.json ] && v=mixed || v=apart
check "ruling 102 before (fail-before): pre-r101 writes the TEST run's record into r58c/mounts/" "$r $v" "0 mixed"
mk w-before $WB/r58c/B/pre-r101/lane_step.sh; r=$(tr_go w-before "" "python leak_audit.py --x")
check "ruling 102 before (fail-before): pre-r101 accepts LS_MOUNTS on a real run (ignores it, exit 0)" "$r" 0
# C29 (pre-check M1): a TEST run without a TEST mounts file is refused (exit 2); fail-before pre-r104 runs it
tst() { # tst <case> <lane_step.sh> <LS_MOUNTS or ""> [name]: a TEST run (freeze stub present); prints the exit code
  c=$1; mk $c $2; export RG_STATE=$RT/$c/state RV_DIR=$RT/$c RV_JSON="$PASSJ"
  ( LS_PREFREEZE=test LS_MOUNTS=$3 sh $RT/$c/r58c/B/lane_step.sh ${4:-ktest-r10} "python leak_audit.py --x --test" > $RT/$c/out.txt 2>&1 ); echo $?
}
lg() { grep -q "$2" $RT/$1/r58c/B/lane-steps/*.log 2>/dev/null && echo yes || echo no; }
r=$(tst n-nolsm $WB/r58c/B/lane_step.sh ""); check "C29 after: a TEST run without LS_MOUNTS is refused (exit 2), named" "$r $(lg n-nolsm 'a TEST run needs LS_MOUNTS')" "2 yes"
r=$(tst n-before $WB/r58c/B/pre-r104/lane_step.sh ""); check "C29 before (fail-before): pre-r104 runs a TEST run on the real mounts file (exit 0)" "$r" 0
mkdir -p $RT/o-nomark; tf_ o-nomark "" ""; r=$(tst o-nomark $WB/r58c/B/lane_step.sh "$(cygpath -m $RT/o-nomark/alt.json)")
check "C29 after: a TEST mounts file without the _test mark is refused (exit 2)" "$r $(lg o-nomark 'carries no "_test" mark')" "2 yes"
mk p-real $WB/r58c/B/lane_step.sh; r=$(tst p-real $WB/r58c/B/lane_step.sh "$(cygpath -m $RT/p-real/r58c/B/mounts-B.json)")
check "C29 after: LS_MOUNTS naming the real r58c/B/mounts-B.json is refused (exit 2)" "$r $(lg p-real 'is the real r58c/B/mounts-B.json')" "2 yes"
for c in q-held q-before; do mkdir -p $RT/$c; DWq=$(cd $RT/$c && pwd -W 2>/dev/null || cygpath -m $RT/$c); tf_ $c "{\"src\": \"$DWq/export/graphs/HP1\", \"dst\": \"/w/export/graphs/HP1\", \"mode\": \"ro\"}"; done
r=$(tst q-held $WB/r58c/B/lane_step.sh "$(cygpath -m $RT/q-held/alt.json)")
check "C29 after: a TEST mounts file with a held-out parent's graph row is refused (exit 2), named" "$r $(lg q-held 'export/graphs/HP1 is a held-out parent')" "2 yes"
r=$(tst q-before $WB/r58c/B/pre-r104/lane_step.sh "$(cygpath -m $RT/q-before/alt.json)")
check "C29 before (fail-before): pre-r104 mounts the held-out parent's graph folder in a TEST run (exit 0)" "$r $(lg q-before 'export/graphs/HP1:/w/export/graphs/HP1:ro')" "0 yes"
mkdir -p $RT/q-rw; DWq=$(cd $RT/q-rw && pwd -W 2>/dev/null || cygpath -m $RT/q-rw); tf_ q-rw "{\"src\": \"$DWq/train/leak_audit\", \"dst\": \"/w/train/leak_audit\", \"mode\": \"rw\"}"
r=$(tst q-rw $WB/r58c/B/lane_step.sh "$(cygpath -m $RT/q-rw/alt.json)")
check "C29 after: a TEST mounts file with a writable row under train/ is refused (exit 2)" "$r $(lg q-rw 'train/leak_audit (rw) is a real output place')" "2 yes"
# C21/C48 (ruling 103(d)): a real run creates its rw folder; a TEST run creates none (left out, named)
mk r-real $WB/r58c/B/lane_step.sh; export RG_STATE=$RT/r-real/state RV_DIR=$RT/r-real RV_JSON=""
( sh $RT/r-real/r58c/B/lane_step.sh ktest-r99 "true" > $RT/r-real/out.txt 2>&1 ); r=$?
[ -d $RT/r-real/r58c/B/out/r99rw ] && v=created || v=absent; check "C21 after: a real run creates its writable folder (exit 0)" "$r $v" "0 created"
mkdir -p $RT/s-test; tf_ s-test; r=$(tst s-test $WB/r58c/B/lane_step.sh "$(cygpath -m $RT/s-test/alt.json)" ktest-r99)
[ -e $RT/s-test/r58c/B/out/r99rw ] && v=created || v=absent
check "C21 after: a TEST run creates no folder; the missing row is left out and named (exit 0)" "$r $v $(lg s-test 'left out (source missing, nothing created).*r99rw -> /w/r99rw (rw)')" "0 absent yes"
export NO_FREEZE_STUB=1
for c in t-nofreeze t-before; do mk $c $([ $c = t-nofreeze ] && echo $WB/r58c/B/lane_step.sh || echo $WB/r58c/B/pre-r104/lane_step.sh)
  DWt=$(cd $RT/$c && pwd -W 2>/dev/null || cygpath -m $RT/$c); rm -rf $RT/$c/train/leak_audit; [ $c = t-before ] && cp $WB/r58c/B/pre-r103/mounts.js $RT/$c/r58c/B/mounts.js  # the old pair: pre-r104 lane_step, pre-r103 mounts.js
  printf '{"ktest-r10": {"step": "9.1", "allow": [{"src": "%s/r58c", "dst": "/w/r58c", "mode": "ro"}, {"src": "%s/train/leak_audit", "dst": "/w/train/leak_audit", "mode": "rw"}]}}\n' "$DWt" "$DWt" > $RT/$c/r58c/B/mounts-B.json
  export RG_STATE=$RT/$c/state RV_DIR=$RT/$c RV_JSON=""; ( sh $RT/$c/r58c/B/lane_step.sh ktest-r10 "python leak_audit.py --x" > $RT/$c/out.txt 2>&1 ); echo $? > $RT/$c/rc; done
[ -e $RT/t-nofreeze/train/leak_audit ] && v=created || v=absent; check "C21 after: a real step refused for want of a freeze list (exit 5) creates nothing" "$(cat $RT/t-nofreeze/rc) $v" "5 absent"
[ -e $RT/t-before/train/leak_audit ] && v=created || v=absent; check "C21 before (fail-before): pre-r104 exits 5 but has made train/leak_audit first" "$(cat $RT/t-before/rc) $v" "5 created"
unset NO_FREEZE_STUB
# C19 (ruling 103(b)): the TEST run's log prints the TEST entry against the real entry row by row
check "C19 after: the TEST run's log has the row-by-row comparison" "$(lg l-test 'TEST entry of ktest-r10 against its real entry') $(lg l-test '  - .*train/leak_audit -> /w/train/leak_audit (rw)   \[real only\]') $(lg l-test 'ktest-r10: TEST 1 rows, real 2 rows; 1 the same, 0 TEST only, 1 real only')" "yes yes yes"
# C45 and LS_TEST_LIMIT
check "C45 after: LIMIT_R8 and LIMIT_R9 are 3600 s (pre-r104: 900)" "$(grep -c '^LIMIT_R[89]=3600 ' $WB/r58c/B/lane_step.sh) $(grep -c '^LIMIT_R[89]=900 ' $WB/r58c/B/pre-r104/lane_step.sh)" "2 2"
mkdir -p $RT/u-lim; tf_ u-lim; r=$( mk u-lim $WB/r58c/B/lane_step.sh; export RG_STATE=$RT/u-lim/state RV_DIR=$RT/u-lim RV_JSON="$PASSJ"
  ( LS_PREFREEZE=test LS_TEST_LIMIT=570 LS_MOUNTS=$(cygpath -m $RT/u-lim/alt.json) sh $RT/u-lim/r58c/B/lane_step.sh ktest-r10 "python leak_audit.py --x --test" > $RT/u-lim/out.txt 2>&1 ); echo $? )
check "LS_TEST_LIMIT=570 lowers a TEST run's limit (exit 0, limit 570 s logged)" "$r $(lg u-lim 'limit 570 s')" "0 yes"
mk v-lim $WB/r58c/B/lane_step.sh; export RG_STATE=$RT/v-lim/state RV_DIR=$RT/v-lim RV_JSON="$PASSJ"; ( LS_TEST_LIMIT=570 sh $RT/v-lim/r58c/B/lane_step.sh ktest-r10 "python leak_audit.py --x" > $RT/v-lim/out.txt 2>&1 ); r=$?
check "LS_TEST_LIMIT without a TEST run is refused (exit 2)" "$r" 2
for c in a-fail b-pass z-before; do [ -d $RT/$c/r58c/ktest.lock ] && v=held || v=freed; check "$c: the copy's lock is freed" $v freed; done
echo "RESULT $( [ $fails -eq 0 ] && echo PASS || echo FAIL ) r10-verdict ($n checks)" | tee -a "$LOG"
[ $fails -eq 0 ]
