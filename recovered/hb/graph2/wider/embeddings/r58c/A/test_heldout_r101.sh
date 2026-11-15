#!/bin/sh
# Agent A, round 9 (the coordinator's items 5, 7 and 9; C12, C14 / TE-3, C16 / LO-6). Host stub test, no container.
# Part 1, heldout_inputs.js on a SYNTHETIC export tree (three tuning parents' folders made here, nothing under the
#   lane's export/ is read): export-manifest then verify-export pass; an extra file, a missing file, a changed byte and
#   a file turned to CRLF each fail verify-export; a manifest with CRLF line ends still verifies (readManifest strips
#   CR: recorded, not a failure); export-manifest refuses an existing output. pins: a good record passes; a changed
#   pin, a missing file and a value that is not a sha256 each fail.
# Part 2, the real-mode preflight of train/heldout.sh (no PROBE, no REHEARSAL), in scratch lanes with a fake docker on
#   PATH (image inspect answers; ps lists nothing; run -d succeeds, the main run writes FAKE_RC into heldout.rc as the
#   container would; inspect gives a record; wait answers 0), a fake memgate (always ok, pause cut to 0) and a fake
#   r58c/B/freeze_check.sh. The scratch lane's plan is the synthetic r58b/out/fakeB plan with its held-out assignment
#   replaced by three TUNING parents (cd806c80, 2fa68134, 7b3a7452), so the staging built here from the build's facts
#   cache holds tuning parents only (no held-out data is copied anywhere).
#     r1 intact -> exit 0, "staging, export, freeze list and pins verified";  r2 freeze check prints -> exit 8;
#     r3 freeze list lacks heldout_export.sha256 -> exit 8;  r4 a staged blob deleted -> exit 8;
#     r5 an exported graph file changed -> exit 8;  r6 a pin of item27.json changed -> exit 8.
# Part 3, C12: train/heldout/HANDOFF.json present and heldout.rc = 0 -> current bytes exit 8 at once, heldout.rc still 0,
#   no docker run; before bytes (r58c/A/pre-r101/heldout.sh) went on, and the container's refusal (rc 8, FAKE_RC=8)
#   replaced the rc 0 evidence (fail before). REHEARSAL=E4 with r58c/rehearsal/E4/run/HANDOFF.json: exit 8 "run/HANDOFF.json".
# Part 4, C16: the lane lock. Current bytes hold r58c/ktest.lock while the containers start (the fake docker records
#   it) and remove it at the end; before bytes took none (fail before). A lock held by someone else: the current bytes
#   wait (killed after 12 s: no docker run, the foreign lock left in place); the before bytes started at once.
# Scratch r58c/A/out/h101, removed at the end.  usage (Git Bash): sh r58c/A/test_heldout_r101.sh
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
W=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
GB=$WB/../../build
A=$WB/r58c/A; T=$A/out/h101; rm -rf $T; mkdir -p $T/bin $T/base
cd "$WB" || exit 2
for f in train/heldout.sh r58c/A/pre-r101/heldout.sh train/heldout_inputs.js r58c/A/test_heldout_r101.sh; do echo "sha256 $(sha256sum $f | cut -c1-64) $f"; done
PAR="cd806c803c4ad8ec198790096d196460789951f0 2fa68134d22db238b53b12e5f24315af29dce4a0 7b3a745281898d3d5808c5a15c4916d1d9dbb1b4"
ok=1; fail() { ok=0; echo "  FAILED: $*"; }
HI=train/heldout_inputs.js
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));p.heldout.assignment={};for(const P of process.argv[3].split(' '))p.heldout.assignment[P]=P;fs.writeFileSync(process.argv[2],JSON.stringify(p,null,1))" r58b/out/fakeB/stageB/plan.json $T/plan.json "$PAR"
# ---- part 1: the synthetic export tree and heldout_inputs.js export-manifest / verify-export / pins
for P in $PAR; do mkdir -p $T/base/export/graphs/$P $T/base/export/graphs0/$P
  printf 'file:a.py\tfile:b.py\tco_changed\n' > $T/base/export/graphs/$P/pilot_graph.tsv; printf 'file:a.py\n' > $T/base/export/graphs/$P/entities.tsv
  printf '%s\n' $P > $T/base/export/graphs/$P/ancestors.txt; printf '{"relations": 1}\n' > $T/base/export/graphs0/$P/sizes.json; done
node $HI export-manifest --plan $T/plan.json --export $T/base/export --out $T/base/heldout_export.sha256 > $T/em.out 2>&1; em=$?
echo "export-manifest: exit $em $(cat $T/em.out) ($(wc -l < $T/base/heldout_export.sha256) lines)"; [ $em = 0 ] || fail "export-manifest"
ve() {  # $1 case name, $2 damage command run inside the copy -> prints the verify-export exit and its problems
  rm -rf $T/ve_$1; mkdir -p $T/ve_$1; cp -r $T/base/export $T/ve_$1/export; cp $T/base/heldout_export.sha256 $T/ve_$1/m.sha256
  (cd $T/ve_$1 && eval "$2"); node $HI verify-export --plan $T/plan.json --export $T/ve_$1/export --manifest $T/ve_$1/m.sha256 > $T/ve_$1.out 2>&1; echo $?; }
P1=cd806c803c4ad8ec198790096d196460789951f0
r=$(ve intact true); echo "verify-export intact: exit $r"; [ "$r" = 0 ] || fail "intact export refused: $(cat $T/ve_intact.out)"
r=$(ve extra "echo x > export/graphs/$P1/extra.tsv"); echo "  an extra file: exit $r $(cut -c1-120 $T/ve_extra.out)"; [ "$r" = 1 ] && grep -q 'not in the manifest' $T/ve_extra.out || fail "extra file"
r=$(ve missing "rm export/graphs0/$P1/sizes.json"); echo "  a missing file: exit $r $(cut -c1-120 $T/ve_missing.out)"; [ "$r" = 1 ] && grep -q 'missing' $T/ve_missing.out || fail "missing file"
r=$(ve byte "printf 'file:a.py\tfile:c.py\tco_changed\n' > export/graphs/$P1/pilot_graph.tsv"); echo "  a changed byte: exit $r $(cut -c1-120 $T/ve_byte.out)"; [ "$r" = 1 ] && grep -q 'differ' $T/ve_byte.out || fail "changed byte"
r=$(ve crlf "sed -i 's/\$/\r/' export/graphs/$P1/entities.tsv"); echo "  a file turned to CRLF: exit $r $(cut -c1-120 $T/ve_crlf.out)"; [ "$r" = 1 ] && grep -q 'differ' $T/ve_crlf.out || fail "CRLF file"
r=$(ve mcrlf "sed -i 's/\$/\r/' m.sha256"); echo "  the manifest with CRLF line ends: exit $r (tolerated: readManifest strips CR)"; [ "$r" = 0 ] || fail "CRLF manifest refused"
node $HI export-manifest --plan $T/plan.json --export $T/base/export --out $T/base/heldout_export.sha256 > $T/em2.out 2>&1; r=$?
echo "  export-manifest over an existing output: exit $r $(cut -c1-100 $T/em2.out)"; [ "$r" = 1 ] && grep -q 'exists' $T/em2.out || fail "export-manifest overwrote"
mkdir -p $T/pins/train/stageB; cp $T/plan.json $T/pins/train/stageB/plan.json; cp $HI $T/pins/train/heldout_inputs.js
H1=$(sha256sum $T/pins/train/heldout_inputs.js | cut -c1-64); H2=$(sha256sum $T/pins/train/stageB/plan.json | cut -c1-64)
pin() { printf '{"pins": {"train/heldout_inputs.js": "%s"}, "tuning_inputs": {"%s": "%s"}}\n' "$1" "$2" "$3" > $T/pins/rec.json
  node $HI pins --record $T/pins/rec.json --root $W/r58c/A/out/h101/pins > $T/pins.out 2>&1; echo $?; }
r=$(pin $H1 train/stageB/plan.json $H2); echo "pins, a good record: exit $r"; [ "$r" = 0 ] || fail "good pins refused: $(cat $T/pins.out)"
ZZ=0000000000000000000000000000000000000000000000000000000000000000
r=$(pin $ZZ train/stageB/plan.json $H2); echo "  a changed pin: exit $r $(cut -c1-110 $T/pins.out)"; [ "$r" = 1 ] || fail "changed pin"
r=$(pin $H1 train/stageB/gone.json $H2); echo "  a missing file: exit $r $(cut -c1-110 $T/pins.out)"; [ "$r" = 1 ] && grep -q missing $T/pins.out || fail "missing pinned file"
r=$(pin $H1 train/stageB/plan.json notahash); echo "  not a sha256: exit $r $(cut -c1-110 $T/pins.out)"; [ "$r" = 1 ] && grep -q 'not a sha256' $T/pins.out || fail "bad pin value"
# ---- part 2: the real-mode preflight of heldout.sh
node $HI build --plan $T/plan.json --facts $GB/facts/cache --common $GB/arms/common --out $T/base/heldout_inputs > $T/build.log 2>&1 || { tail -3 $T/build.log; fail "staging build"; }
echo "staging built: $(ls $T/base/heldout_inputs/facts | wc -l) tuning parents"
BLOB=$(ls $T/base/heldout_inputs/common/srcstore/blobs | head -1)
cat > $T/bin/docker <<'EOF'
#!/bin/sh
case "$1" in
  image) echo sha256:fake ;;
  inspect) echo '[{"Name": "/fake", "Mounts": []}]' ;;
  wait) echo 0 ;;
  run) n=$(echo "$*" | grep -o -- '--name [^ ]*' | cut -d' ' -f2)
       if [ -d "$TL/r58c/ktest.lock" ]; then echo "run $n lock=yes" >> $TL/calls; else echo "run $n lock=no" >> $TL/calls; fi
       case $n in kge-H1) mkdir -p $TL/train/heldout; echo ${FAKE_RC:-0} > $TL/train/heldout/heldout.rc ;; esac ;;
esac
exit 0
EOF
lane() {  # $1 heldout.sh bytes, $2 lane name, $3 damage -> the lane is ready at $T/$2 (nothing run)
  L=$T/$2; LW=$W/r58c/A/out/h101/$2
  mkdir -p $L/train/stageB $L/train/heldout $L/r58c/A $L/r58c/B $L/orchestrator
  sed -e "s#^W=.*#W=$LW#" -e "s#^WB=.*#WB=$L#" -e 's/\[ \$ok -lt 3 \] && sleep 30/[ $ok -lt 3 ] \&\& sleep 0/' "$1" > $L/train/heldout.sh
  cp $HI $L/train/; cp $T/plan.json $L/train/stageB/plan.json; cp r58c/A/mounts.js r58c/A/mounts-A.json $L/r58c/A/
  printf '#!/bin/sh\n[ "$1" = sample ] && echo 99999999 1\n[ "$1" = low ] && exit 1\nexit 0\n' > $L/orchestrator/memgate.sh
  printf '#!/bin/sh\n[ -f "$(dirname "$0")/fc_fail" ] && echo "DIFF train/kge.py"\nexit 0\n' > $L/r58c/B/freeze_check.sh
  cp -r $T/base/heldout_inputs $L/heldout_inputs; cp $T/base/heldout_inputs.sha256 $L/; cp -r $T/base/export $L/export; cp $T/base/heldout_export.sha256 $L/
  fl=$(for m in heldout_inputs.sha256 heldout_export.sha256; do echo "$(sha256sum $L/$m | cut -c1-64)  $m"; done)
  for i in 1 2 3 4 5 6; do echo "$fl" > $L/orchestrator/freeze-list.txt 2>/dev/null && break; sleep 2; done  # a just-made file can be busy here
  printf '{"pins": {"train/heldout_inputs.js": "%s"}, "tuning_inputs": {"train/stageB/plan.json": "%s"}}\n' \
    "$(sha256sum $L/train/heldout_inputs.js | cut -c1-64)" "$(sha256sum $L/train/stageB/plan.json | cut -c1-64)" > $L/train/heldout/item27.json
  case $3 in
    fc) touch $L/r58c/B/fc_fail ;;
    fl) grep -v heldout_export $L/orchestrator/freeze-list.txt > $L/fl && mv $L/fl $L/orchestrator/freeze-list.txt ;;
    blob) rm -f $L/heldout_inputs/common/srcstore/blobs/$BLOB ;;
    export) echo extra >> $L/export/graphs/$P1/pilot_graph.tsv ;;
    pin) printf '{"pins": {"train/heldout_inputs.js": "%s"}, "tuning_inputs": {"train/stageB/plan.json": "%s"}}\n' \
           0000000000000000000000000000000000000000000000000000000000000000 "$(sha256sum $L/train/stageB/plan.json | cut -c1-64)" > $L/train/heldout/item27.json ;;
    handoff) echo '{}' > $L/train/heldout/HANDOFF.json; echo 0 > $L/train/heldout/heldout.rc ;;
    rhandoff) mkdir -p $L/r58c/rehearsal/E4/run; echo '{}' > $L/r58c/rehearsal/E4/run/HANDOFF.json ;;
    lock) mkdir -p $L/r58c/ktest.lock ;;
  esac; }
go() {  # $1 lane name, then env assignments -> prints the exit code
  L=$T/$1; shift; (cd $L && env "$@" TL="$L" PATH="$T/bin:$PATH" sh train/heldout.sh > $L.out 2>&1); echo $?; }
said() { grep -c "$2" $T/$1/heldout-launch/kge-H1*-launch.log 2>/dev/null | tail -1; }
lane train/heldout.sh r1 none; r=$(go r1 X=1); echo "r1 intact: exit $r; verified line $(said r1 'staging, export, freeze list and pins verified'); calls: $(tr '\n' ',' < $T/r1/calls)"
[ "$r" = 0 ] && [ "$(said r1 'staging, export, freeze list and pins verified')" = 1 ] || { fail "r1"; tail -5 $T/r1.out; }
for c in "r2 fc the freeze check fails" "r3 fl heldout_export.sha256 is not in the freeze list" "r4 blob heldout_inputs does not check" \
         "r5 export export/graphs or graphs0 of a held-out parent differs" "r6 pin a pin or tuning input"; do
  set -- $c; n=$1; d=$2; shift 2; msg="$*"
  lane train/heldout.sh $n $d; r=$(go $n X=1); k=$(said $n "refusing: $msg"); echo "$n ($d): exit $r, refusal '$msg' x$k, docker runs $(grep -c '^run' $T/$n/calls 2>/dev/null)"
  [ "$r" = 8 ] && [ "$k" = 1 ] && [ ! -s $T/$n/calls ] || fail "$n"
done
# ---- part 3: C12
lane train/heldout.sh h1 handoff; r=$(go h1 FAKE_RC=8); echo "h1 current, HANDOFF.json present: exit $r, heldout.rc $(cat $T/h1/train/heldout/heldout.rc), refusal x$(said h1 'refusing: train/heldout/HANDOFF.json exists'), docker runs $(grep -c '^run' $T/h1/calls 2>/dev/null)"
[ "$r" = 8 ] && [ "$(cat $T/h1/train/heldout/heldout.rc)" = 0 ] && [ ! -s $T/h1/calls ] || fail "h1"
lane r58c/A/pre-r101/heldout.sh h2 handoff; r=$(go h2 FAKE_RC=8); echo "h2 before bytes, the same: exit $r, heldout.rc $(cat $T/h2/train/heldout/heldout.rc)"
[ "$r" = 3 ] && [ "$(cat $T/h2/train/heldout/heldout.rc)" = 8 ] && echo "  fail before: it launched again and the refusal's rc 8 replaced the rc 0 evidence" || fail "h2 unexpected"
lane train/heldout.sh h3 rhandoff; r=$(go h3 REHEARSAL=E4); echo "h3 current, REHEARSAL=E4 with run/HANDOFF.json: exit $r, refusal x$(said h3 'run/HANDOFF.json exists')"
[ "$r" = 8 ] && [ "$(said h3 'run/HANDOFF.json exists')" = 1 ] || fail "h3"
lane r58c/A/pre-r101/heldout.sh h4 rhandoff; r=$(go h4 REHEARSAL=E4); echo "h4 before bytes, the same: exit $r, HANDOFF refusal x$(said h4 'run/HANDOFF.json exists') (it stops later, at its staging check)"
[ "$(said h4 'run/HANDOFF.json exists')" = 0 ] || fail "h4 unexpected"
# ---- part 4: C16, the lane lock
echo "l1 current (r1's run): lock while the containers start: $(grep -c 'lock=yes' $T/r1/calls) of $(grep -c '^run' $T/r1/calls); lock left after: $([ -d $T/r1/r58c/ktest.lock ] && echo yes || echo no)"
[ "$(grep -c 'lock=no' $T/r1/calls)" = 0 ] && [ "$(grep -c 'lock=yes' $T/r1/calls)" = 2 ] && [ ! -d $T/r1/r58c/ktest.lock ] || fail "l1"
lane r58c/A/pre-r101/heldout.sh l2 none; r=$(go l2 X=1); echo "l2 before bytes, intact: exit $r; calls: $(tr '\n' ',' < $T/l2/calls)"
[ "$(grep -c 'lock=no' $T/l2/calls)" = 2 ] && echo "  fail before: it started both containers without the lane lock" || fail "l2 unexpected"
lane train/heldout.sh l3 lock; L=$T/l3; (cd $L && TL=$L PATH=$T/bin:$PATH timeout 12 sh train/heldout.sh > $L.out 2>&1); r=$?
echo "l3 current, a lock held by another: exit $r after 12 s; waiting lines $(said l3 'waiting: r58c/ktest.lock is held'); docker runs $(grep -c '^run' $L/calls 2>/dev/null); the foreign lock still there: $([ -d $L/r58c/ktest.lock ] && echo yes || echo no)"
[ "$r" = 124 ] && [ "$(said l3 'waiting: r58c/ktest.lock is held')" -ge 1 ] && [ ! -s $L/calls ] && [ -d $L/r58c/ktest.lock ] || fail "l3"
lane r58c/A/pre-r101/heldout.sh l4 lock; r=$(go l4 X=1); echo "l4 before bytes, the same: exit $r, docker runs $(grep -c '^run' $T/l4/calls 2>/dev/null)"
[ "$(grep -c '^run' $T/l4/calls 2>/dev/null)" = 2 ] && echo "  fail before: it ignored the lock and started at once" || fail "l4 unexpected"
for i in 1 2 3 4 5 6; do rm -rf $T 2>/dev/null && break; sleep 2; done
[ $ok = 1 ] && echo "RESULT PASS heldout-r101" || echo "RESULT FAIL heldout-r101"
[ $ok = 1 ]
