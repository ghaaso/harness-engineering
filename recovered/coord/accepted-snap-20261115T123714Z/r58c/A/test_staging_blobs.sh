#!/bin/sh
# Agent A, round r58c (the coordinator's item 3 after ruling 96): staging completeness on the host, no container.
# Both staging forms are built with the current train/heldout_inputs.js from the build's facts cache and shared code,
# on the synthetic plan r58b/out/fakeB/stageB/plan.json:
#   parents  --parents cd806c80,2fa68134,7b3a7452 (the rehearsal's and the probe's form; the real held-out staging uses
#            the same build/check code with the plan's held-out parents, which a test may not read)
#   tune     --split tune (the 38 late-50 tuning parents, ruling 94 (b))
# For each, an INDEPENDENT count (r58c/A/staging_blobs.js, not heldout_inputs.js) shows that every blob each staged
# tree names is present under blobs/ and listed in the folder's sha256 manifest with the file's own sha256, and
# heldout_inputs.js check passes. Then, on COPIES (same basename, so the manifest's paths hold), check must refuse:
#   n1 a named blob deleted together with its manifest line (only the tree-to-blob rule can see it),
#   n2 a named blob's bytes changed (manifest sha256),
#   n3 a named blob's manifest line deleted, the file kept ("not in the manifest"),
#   n4 a whole tree deleted with its manifest line ("staged parent without a tree", and its blobs then unnamed),
# n1 on both forms. Scratch r58c/A/out/sblob, removed at the end.  usage: sh r58c/A/test_staging_blobs.sh
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
cd "$WB" || exit 2
GB=../../build; PL=r58b/out/fakeB/stageB/plan.json; T=r58c/A/out/sblob
PAR=cd806c803c4ad8ec198790096d196460789951f0,2fa68134d22db238b53b12e5f24315af29dce4a0,7b3a745281898d3d5808c5a15c4916d1d9dbb1b4
rm -rf $T; mkdir -p $T
echo "sha256 $(sha256sum train/heldout_inputs.js | cut -c1-64) train/heldout_inputs.js"
echo "sha256 $(sha256sum r58c/A/staging_blobs.js | cut -c1-64) r58c/A/staging_blobs.js"
ok=1
chk() {  # chk <dir> <form-args...>: heldout_inputs.js check rc
  d=$1; shift; node train/heldout_inputs.js check --plan $PL --dir $d --manifest $d.sha256 "$@" > $d.check.log 2>&1; echo $?; }
for F in parents tune; do
  if [ $F = parents ]; then FA="--parents $PAR"; else FA="--split tune"; fi
  node train/heldout_inputs.js build --plan $PL --facts $GB/facts/cache --common $GB/arms/common --out $T/$F/inputs $FA > $T/$F.build.log 2>&1; brc=$?
  cnt=$(node r58c/A/staging_blobs.js $T/$F/inputs $T/$F/inputs.sha256)
  crc=$(chk $T/$F/inputs $FA)
  echo "$F: build rc $brc, check rc $crc, independent count $cnt"
  case "$cnt" in *'"ok":true'*) ;; *) ok=0; echo "  FAILED: the independent count";; esac
  [ $brc = 0 ] && [ $crc = 0 ] || { ok=0; echo "  FAILED: build or check"; tail -3 $T/$F.build.log; }
  # n1: a named blob deleted together with its manifest line
  N=$T/n1-$F; mkdir -p $N; cp -r $T/$F/inputs $N/inputs
  b=$(node -e "const fs=require('fs');const d=process.argv[1];const P=fs.readdirSync(d+'/facts').sort()[0];const t=JSON.parse(fs.readFileSync(d+'/common/srcstore/trees/'+P+'.json','utf8'));console.log(Object.values(t).sort()[0]+'.txt')" $N/inputs)
  rm $N/inputs/common/srcstore/blobs/$b; grep -v "blobs/$b\$" $T/$F/inputs.sha256 > $N/inputs.sha256
  r=$(chk $N/inputs $FA); m=$(grep -c "blob(s) a staged tree names are missing" $N/inputs.check.log)
  echo "$F n1 (blob $b and its manifest line deleted): check rc $r, 'a staged tree names are missing' $m, independent: $(node r58c/A/staging_blobs.js $N/inputs $N/inputs.sha256 | cut -c1-90)"
  [ $r != 0 ] && [ $m -ge 1 ] || { ok=0; echo "  FAILED (accepted)"; }
done
F=parents; FA="--parents $PAR"
b=$(node -e "const fs=require('fs');const d=process.argv[1];const t=JSON.parse(fs.readFileSync(d+'/common/srcstore/trees/cd806c803c4ad8ec198790096d196460789951f0.json','utf8'));console.log(Object.values(t).sort()[1]+'.txt')" $T/$F/inputs)
N=$T/n2; mkdir -p $N; cp -r $T/$F/inputs $N/inputs; cp $T/$F/inputs.sha256 $N/; printf 'x' >> $N/inputs/common/srcstore/blobs/$b
r=$(chk $N/inputs $FA); m=$(grep -c "differ from the manifest sha256" $N/inputs.check.log)
echo "n2 (blob $b changed): check rc $r, 'differ from the manifest' $m"; [ $r != 0 ] && [ $m -ge 1 ] || { ok=0; echo "  FAILED (accepted)"; }
N=$T/n3; mkdir -p $N; cp -r $T/$F/inputs $N/inputs; grep -v "blobs/$b\$" $T/$F/inputs.sha256 > $N/inputs.sha256
r=$(chk $N/inputs $FA); m=$(grep -c "not in the manifest" $N/inputs.check.log)
echo "n3 (blob $b's manifest line deleted): check rc $r, 'not in the manifest' $m"; [ $r != 0 ] && [ $m -ge 1 ] || { ok=0; echo "  FAILED (accepted)"; }
N=$T/n4; mkdir -p $N; cp -r $T/$F/inputs $N/inputs; rm $N/inputs/common/srcstore/trees/2fa68134d22db238b53b12e5f24315af29dce4a0.json
grep -v "trees/2fa68134d22db238b53b12e5f24315af29dce4a0.json\$" $T/$F/inputs.sha256 > $N/inputs.sha256
r=$(chk $N/inputs $FA); m=$(grep -c "staged parent(s) without a tree" $N/inputs.check.log)
echo "n4 (tree 2fa68134 and its manifest line deleted): check rc $r, 'without a tree' $m"; [ $r != 0 ] && [ $m -ge 1 ] || { ok=0; echo "  FAILED (accepted)"; }
rm -rf $T
[ $ok = 1 ] && echo "RESULT PASS staging-blobs" || echo "RESULT FAIL staging-blobs"
[ $ok = 1 ]
