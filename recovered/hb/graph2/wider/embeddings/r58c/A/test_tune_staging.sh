#!/bin/sh
# Agent A, r58c, ruling 94 (b): host check of `heldout_inputs.js build|check --split tune` (no container). On the
# synthetic plan r58b/out/fakeB/stageB/plan.json (its assignment = the 53 real tuning parents) and the build's facts
# cache and shared code: the current bytes stage exactly the 38 late-50 tuning parents of eval/tune_commits.jsonl and
# `check` passes; an extra facts folder planted afterwards makes `check` fail; the before bytes
# (r58c/A/pre/heldout_inputs_r93.js) staged all 53 tuning parents (fail before). Scratch goes to r58c/A/out/tstage and is
# removed at the end.  usage (Git Bash): sh r58c/A/test_tune_staging.sh   -> RESULT PASS|FAIL tune-staging
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
cd "$WB" || exit 2
GB=../../build; PL=r58b/out/fakeB/stageB/plan.json; T=r58c/A/out/tstage
rm -rf $T; mkdir -p $T
echo "sha256 $(sha256sum train/heldout_inputs.js | cut -c1-64) train/heldout_inputs.js"
echo "sha256 $(sha256sum r58c/A/pre/heldout_inputs_r93.js | cut -c1-64) r58c/A/pre/heldout_inputs_r93.js"
want=$(node -e "const fs=require('fs');const l=fs.readFileSync('eval/tune_commits.jsonl','utf8').split(String.fromCharCode(10)).filter(x=>x.trim()).map(JSON.parse).filter(c=>c.late50===true);console.log([...new Set(l.map(c=>c.parent))].sort().join(','))")
nwant=$(echo "$want" | tr ',' '\n' | grep -c .)
ok=1
node train/heldout_inputs.js build --plan $PL --facts $GB/facts/cache --common $GB/arms/common --out $T/new --split tune > $T/build.log 2>&1; brc=$?
got=$(node -e "console.log(require('./$T/new/MANIFEST.json').parents.join(','))" 2>/dev/null)
nfacts=$(ls $T/new/facts 2>/dev/null | grep -c .)
echo "current bytes: build rc $brc, MANIFEST parents $(echo "$got" | tr ',' '\n' | grep -c .), facts folders $nfacts, the late-50 parents $nwant"
[ $brc = 0 ] && [ "$got" = "$want" ] && [ "$nfacts" = "$nwant" ] && echo "  pass after: exactly the late-50 tuning parents" || { ok=0; echo "  FAILED"; tail -3 $T/build.log; }
node train/heldout_inputs.js check --plan $PL --dir $T/new --manifest $T/new.sha256 --facts $GB/facts/cache --common $GB/arms/common --split tune > $T/check.log 2>&1; crc=$?
echo "current bytes: check rc $crc"; [ $crc = 0 ] || { ok=0; echo "  FAILED"; tail -3 $T/check.log; }
extra=$(node -e "const p=require('./$PL').assignment;const w=new Set(process.argv[1].split(','));console.log(Object.keys(p).sort().find(x=>!w.has(x)))" "$want")
cp -r $GB/facts/cache/$extra $T/new/facts/$extra
node train/heldout_inputs.js check --plan $PL --dir $T/new --manifest $T/new.sha256 --split tune > $T/check2.log 2>&1; xrc=$?
echo "an early tuning parent's facts planted ($extra): check rc $xrc"; [ $xrc != 0 ] && echo "  refused" || { ok=0; echo "  FAILED (accepted)"; }
node r58c/A/pre/heldout_inputs_r93.js build --plan $PL --facts $GB/facts/cache --common $GB/arms/common --out $T/old --split tune > $T/old.log 2>&1
nold=$(ls $T/old/facts 2>/dev/null | grep -c .)
echo "before bytes: --split tune staged $nold facts folders"; [ "$nold" = 53 ] && echo "  fail before: every tuning parent, early ones included" || { ok=0; echo "  UNEXPECTED"; }
rm -rf $T
[ $ok = 1 ] && echo "RESULT PASS tune-staging" || echo "RESULT FAIL tune-staging"
[ $ok = 1 ]
