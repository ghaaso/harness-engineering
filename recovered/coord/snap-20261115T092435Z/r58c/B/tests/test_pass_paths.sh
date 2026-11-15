#!/bin/sh
# Host test (no container) of r58c/B/pass_paths.js (round 8, C8): every path the ruling-58/83 guard opens must lie under a
# mount of ktest-r1, ktest-r2 and ktest-r3 (r58c/B/mounts-B.json) and exist in the lane.
#   a fake lane (r58c/B/pptest/lane, PP_LANE) holds the six role files, agent A's three role logs copied unchanged into
#   r58c/B/out/logs/A/, agent B's role logs in r58c/B/out/logs/ and an assemble-checks log under orchestrator/end-of-run/.
#   after: a RUNLOG naming those -> exit 0; the same RUNLOG with one PASS line at r58c/A/logs/ -> exit 1, OUTSIDE named;
#     a later note quoting a sha256 triple inside running text is ignored (the guard's line-start rule, SR-6); a missing
#     log -> exit 1 (not in the lane).
#   before (fail-before): the lane's current train/RUNLOG.md (PASS lines at r58b/logs, which no real step mounts) -> exit 1.
# usage: sh r58c/B/tests/test_pass_paths.sh   (log: r58c/B/logs/test_pass_paths.log)
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
RT=$WB/r58c/B/pptest; rm -rf "$RT"; L=$RT/lane; mkdir -p $L $WB/r58c/B/logs
LOG=$WB/r58c/B/logs/test_pass_paths.log; : > "$LOG"
fails=0; n=0
check() { n=$((n+1)); if [ "$2" = "$3" ]; then echo "PASS $1" | tee -a "$LOG"; else fails=$((fails+1)); echo "FAIL $1: got [$2] want [$3]" | tee -a "$LOG"; fi; }
echo "sha256 $(sha256sum $WB/r58c/B/pass_paths.js | cut -c1-64) r58c/B/pass_paths.js; mounts-B.json $(sha256sum $WB/r58c/B/mounts-B.json | cut -c1-64)" | tee -a "$LOG"
LW=$(cd $L && pwd -W)
mkdir -p $L/train $L/r58c/B/out/logs/A $L/r58c/A/logs $L/orchestrator/end-of-run
for f in item27 heldout answer_level leak_audit selectB report; do echo "# $f" > $L/train/$f.py; done
for t in test_heldout test_answer_level test_leak_audit; do echo "RESULT PASS $t" > $L/r58c/A/logs/$t.log; cp -p $L/r58c/A/logs/$t.log $L/r58c/B/out/logs/A/$t.log; done
for t in test_item27 role_selectB role_report; do echo "RESULT PASS $t" > $L/r58c/B/out/logs/$t.log; done
echo "assemble_checks PASS" > $L/orchestrator/end-of-run/assemble_checks.log
H=$(printf '%064d' 0)
runlog() { # runlog <file> <heldout log path>
  { echo "sha256 $H item27 train/item27.py"; echo "sha256 $H heldout-driver train/heldout.py"; echo "sha256 $H item24-adapter train/answer_level.py"
    echo "sha256 $H leak-audit train/leak_audit.py"; echo "sha256 $H selectB train/selectB.py"; echo "sha256 $H report train/report.py"
    echo "PASS item27 r58c/B/out/logs/test_item27.log"; echo "PASS heldout-driver $2"
    echo "PASS item24-adapter r58c/B/out/logs/A/test_answer_level.log"; echo "PASS leak-audit r58c/B/out/logs/A/test_leak_audit.log"
    echo "PASS selectB r58c/B/out/logs/role_selectB.log"; echo "PASS report r58c/B/out/logs/role_report.log"
    echo "PASS assemble-checks orchestrator/end-of-run/assemble_checks.log tables_digest $H"; } > $1
}
pp() { ( PP_LANE=$LW node $WB/r58c/B/pass_paths.js --runlog "$1" --mounts "$(cygpath -m $WB/r58c/B/mounts-B.json)" > $RT/out.txt 2>&1 ); echo $?; }
runlog $L/R1.md r58c/B/out/logs/A/test_heldout.log; r=$(pp R1.md)
check "after: A's logs copied under r58c/B/out/logs/A/ -> every path under a mount of r1, r2, r3 (exit 0)" "$r $(grep -c '^ok ' $RT/out.txt)" "0 13"
cmp -s $L/r58c/A/logs/test_heldout.log $L/r58c/B/out/logs/A/test_heldout.log && v=same || v=differs; check "the copy is unchanged (cmp)" $v same
runlog $L/R2.md r58c/A/logs/test_heldout.log; r=$(pp R2.md)
check "after: a PASS line at r58c/A/logs/ -> exit 1, named OUTSIDE" "$r $(grep -c '^OUTSIDE  heldout-driver PASS log: r58c/A/logs/test_heldout.log (not under a mount of ktest-r1, ktest-r2, ktest-r3)' $RT/out.txt)" "1 1"
runlog $L/R3.md r58c/B/out/logs/A/test_heldout.log; echo "- note: the earlier bytes were sha256 $H item27 r58c/A/logs/old.py, replaced." >> $L/R3.md; r=$(pp R3.md)
check "after: a later note quoting a sha256 triple in running text is not a sha256 line (exit 0)" "$r" 0
runlog $L/R4.md r58c/B/out/logs/A/test_heldout_missing.log; r=$(pp R4.md)
check "after: a PASS log that is not in the lane -> exit 1" "$r $(grep -c 'not in the lane' $RT/out.txt)" "1 1"
( node $WB/r58c/B/pass_paths.js > $RT/real.txt 2>&1 ); r=$?
check "before (fail-before): the lane's current train/RUNLOG.md names PASS logs no real step mounts (exit 1)" "$r $(grep -c '^OUTSIDE ' $RT/real.txt | tr -d ' ')" "1 4"
echo "RESULT $( [ $fails -eq 0 ] && echo PASS || echo FAIL ) pass-paths ($n checks)" | tee -a "$LOG"
[ $fails -eq 0 ]
