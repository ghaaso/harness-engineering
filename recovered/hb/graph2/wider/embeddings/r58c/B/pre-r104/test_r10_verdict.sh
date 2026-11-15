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
  cp $WB/r58c/B/race_gate.sh $WB/r58c/B/mounts.js $d/r58c/B/
  # round 8 (C16): a lane step needs a freeze list; the copy gets a stub list and a stub freeze_check.sh that passes it
  [ -n "${NO_FREEZE_STUB:-}" ] || { printf 'x\n' > $d/orchestrator/freeze-list.txt; printf '#!/bin/sh\nexit 0\n' > $d/r58c/B/freeze_check.sh; }
  printf '{"ktest-r10": {"step": "9.1", "allow": [{"src": "%s/r58c", "dst": "/w/r58c", "mode": "ro"}, {"src": "%s/train/leak_audit", "dst": "/w/train/leak_audit", "mode": "rw"}]},\n "ktest-r99": {"step": "test", "allow": [{"src": "%s/r58c", "dst": "/w/r58c", "mode": "ro"}]}}\n' "$DW" "$DW" "$DW" > $d/r58c/B/mounts-B.json
}
go() { # go <case> <name> <json written during the run>: prints "exit|last line"
  c=$1; export RG_STATE=$RT/$c/state RV_DIR=$RT/$c RV_JSON="$3"
  ( sh $RT/$c/r58c/B/lane_step.sh $2 "python leak_audit.py --x" > $RT/$c/out.txt 2>&1 ); rc=$?
  l=$(ls -t $RT/$c/r58c/B/lane-steps/*.log 2>/dev/null | head -1); last=$(tail -1 "$l" 2>/dev/null | cut -d' ' -f2-)
  echo "$rc|$last"
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
mk i-pre $WB/r58c/B/lane_step.sh; r=$( export LS_PREFREEZE=test; c=i-pre; export RG_STATE=$RT/$c/state RV_DIR=$RT/$c RV_JSON="$PASSJ"
  ( sh $RT/$c/r58c/B/lane_step.sh ktest-r10 "python leak_audit.py --x --test" > $RT/$c/out.txt 2>&1 ); echo $? )
check "C16 after: LS_PREFREEZE=test with --test in the command runs without a list (exit 0)" "$r" 0
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
  c=$1; cp $RT/$c/r58c/B/mounts-B.json $RT/$c/alt.json; export RG_STATE=$RT/$c/state RV_DIR=$RT/$c RV_JSON="$PASSJ"
  ( LS_PREFREEZE=$2 LS_MOUNTS=$(cygpath -m $RT/$c/alt.json) sh $RT/$c/r58c/B/lane_step.sh ktest-r10 "$3" > $RT/$c/out.txt 2>&1 ); echo $?
}
mk k-lsm $WB/r58c/B/lane_step.sh; r=$(tr_go k-lsm "" "python leak_audit.py --x --test")
check "ruling 102 after: LS_MOUNTS without LS_PREFREEZE=test is refused (exit 2)" "$r" 2
grep -q 'LS_MOUNTS is for a TEST run only' $RT/k-lsm/r58c/B/lane-steps/*.log && v=yes || v=no; check "ruling 102 after: the refusal names the rule" $v yes
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
for c in a-fail b-pass z-before; do [ -d $RT/$c/r58c/ktest.lock ] && v=held || v=freed; check "$c: the copy's lock is freed" $v freed; done
echo "RESULT $( [ $fails -eq 0 ] && echo PASS || echo FAIL ) r10-verdict ($n checks)" | tee -a "$LOG"
[ $fails -eq 0 ]
