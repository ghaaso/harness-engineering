#!/bin/sh
# Agent A, r58c round 7 (the coordinator's ruling 3(a)): host stub test that REHEARSAL=<ARM> sh train/heldout.sh checks
# the rehearsal's staging (r58c/rehearsal/inputs, heldout_inputs.js check with its sources and the three parents) before
# anything else, as the real run checks heldout_inputs, and refuses with exit 8. No container: copies of heldout.sh run
# in scratch lanes (W/WB = the lane; GB the real build, read only) with a fake docker on PATH (image inspect answers; ps
# lists nothing; docker run fails, so a launch that passes the check ends at the card check, exit 7) and a fake memgate
# (always ok; the 30 s pause between samples cut to 0 in the copies). The lane's train/stageB/plan.json is the synthetic
# plan r58b/out/fakeB/stageB/plan.json (no real plan is read); its staging is built here with the current
# heldout_inputs.js --parents <the three rehearsal parents> from the build's facts cache and shared code.
#   c1 current bytes, staging intact                      -> past the check, exit 7 at the card check, no refusal
#   c2 current bytes, a ROOT-LEVEL non-code file's blob   -> exit 8 "refusing: r58c/rehearsal/inputs does not check"
#      deleted (.editorconfig of cd806c80, the blob the shared code packs without; round 6's negative case)
#   c3 current bytes, tree 2fa68134 deleted               -> exit 8
#   c4 before bytes (r58c/A/pre/heldout_r97.sh), c2's damage -> exit 7: it never checked the rehearsal staging (fail before)
# Scratch r58c/A/out/hrc, removed at the end.  usage (Git Bash): sh r58c/A/test_heldout_rehearsal_check.sh
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
GB=$WB/../../build
A=$WB/r58c/A; T=$A/out/hrc; rm -rf $T; mkdir -p $T/bin
cd "$WB" || exit 2
for f in train/heldout.sh r58c/A/pre/heldout_r97.sh train/heldout_inputs.js; do echo "sha256 $(sha256sum $f | cut -c1-64) $f"; done
PAR=cd806c803c4ad8ec198790096d196460789951f0,2fa68134d22db238b53b12e5f24315af29dce4a0,7b3a745281898d3d5808c5a15c4916d1d9dbb1b4
cat > $T/bin/docker <<'EOF'
#!/bin/sh
case "$1" in
  image) echo sha256:fake ;;
  run) exit 1 ;;
esac
exit 0
EOF
node train/heldout_inputs.js build --plan r58b/out/fakeB/stageB/plan.json --facts $GB/facts/cache --common $GB/arms/common \
  --out $T/stage/inputs --parents $PAR > $T/build.log 2>&1 || { echo "staging build failed"; tail -3 $T/build.log; echo "RESULT FAIL heldout-rehearsal-check"; exit 1; }
RB=$(node -e "console.log(JSON.parse(require('fs').readFileSync(process.argv[1]+'/common/srcstore/trees/cd806c803c4ad8ec198790096d196460789951f0.json','utf8'))['.editorconfig'])" $T/stage/inputs)
echo "staging built ($(ls $T/stage/inputs/facts | wc -l) parents); .editorconfig blob $RB"
lane() {  # $1 heldout.sh bytes, $2 lane name, $3 damage (none|root|tree) -> prints the exit code
  L=$T/$2; LW=$W/r58c/A/out/hrc/$2
  mkdir -p $L/train/stageB $L/r58c/A $L/orchestrator $L/r58c/rehearsal
  sed -e "s#^W=.*#W=$LW#" -e "s#^WB=.*#WB=$L#" -e 's/\[ \$ok -lt 3 \] && sleep 30/[ $ok -lt 3 ] \&\& sleep 0/' "$1" > $L/train/heldout.sh
  cp train/heldout_inputs.js $L/train/; cp r58b/out/fakeB/stageB/plan.json $L/train/stageB/plan.json
  cp r58c/A/mounts.js r58c/A/mounts-A.json $L/r58c/A/
  printf '#!/bin/sh\n[ "$1" = sample ] && echo 99999999 1\n[ "$1" = low ] && exit 1\nexit 0\n' > $L/orchestrator/memgate.sh
  cp -r $T/stage/inputs $L/r58c/rehearsal/inputs; cp $T/stage/inputs.sha256 $L/r58c/rehearsal/inputs.sha256
  case $3 in
    root) X=$L/r58c/rehearsal/inputs/common/srcstore/blobs/$RB.txt ;;
    tree) X=$L/r58c/rehearsal/inputs/common/srcstore/trees/2fa68134d22db238b53b12e5f24315af29dce4a0.json ;;
    *) X= ;;
  esac
  if [ -n "$X" ]; then for i in 1 2 3 4 5 6; do rm -f "$X" 2>/dev/null; [ -e "$X" ] || break; sleep 2; done
    [ -e "$X" ] && { echo 99; return; }; fi
  (cd $L && REHEARSAL=E4 PATH=$T/bin:$PATH sh train/heldout.sh > $L.out 2>&1); echo $?
}
ok=1
refused() { grep -c 'refusing: r58c/rehearsal/inputs does not check' $T/$1/heldout-launch/kge-H1R-launch.log 2>/dev/null; }
r=$(lane train/heldout.sh c1 none); n=$(refused c1); echo "c1 current, intact: exit $r, refusals $n, card-check refusal $(grep -c 'card is not available' $T/c1/heldout-launch/kge-H1R-launch.log)"
[ "$r" = 7 ] && [ "$n" = 0 ] || { ok=0; echo "  FAILED"; tail -5 $T/c1.out; }
r=$(lane train/heldout.sh c2 root); n=$(refused c2); echo "c2 current, root-level blob deleted: exit $r, refusals $n"
grep -h 'missing\|not staged' $T/c2/heldout-launch/kge-H1R-launch.log | head -2 | cut -c1-160 | sed 's/^/    /'
[ "$r" = 8 ] && [ "$n" = 1 ] || { ok=0; echo "  FAILED (accepted)"; }
r=$(lane train/heldout.sh c3 tree); n=$(refused c3); echo "c3 current, tree 2fa68134 deleted: exit $r, refusals $n"
[ "$r" = 8 ] && [ "$n" = 1 ] || { ok=0; echo "  FAILED (accepted)"; }
r=$(lane r58c/A/pre/heldout_r97.sh c4 root); n=$(refused c4); echo "c4 before bytes, root-level blob deleted: exit $r, refusals $n"
[ "$r" = 7 ] && [ "$n" = 0 ] && echo "  fail before: the old launcher ran no staging check under REHEARSAL and went on to launch" || { ok=0; echo "  UNEXPECTED"; }
for i in 1 2 3 4 5; do rm -rf $T 2>/dev/null && break; sleep 2; done
[ $ok = 1 ] && echo "RESULT PASS heldout-rehearsal-check" || echo "RESULT FAIL heldout-rehearsal-check"
[ $ok = 1 ]
