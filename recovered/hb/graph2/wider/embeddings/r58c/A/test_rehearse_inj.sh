#!/bin/sh
# Agent A, round r58c (rulings 96(a), 97(e)): host stub test of r58c/A/rehearse.sh's INJ arm (no container, no GPU).
# A copy of rehearse.sh runs in a scratch lane with a fake train/heldout.sh (REHEARSAL=INJ: writes
# r58c/rehearsal/INJ/case/inject_case.json unless FAKE_NOJSON, exits FAKE_RC) and a fake docker on PATH.
#   i1 current bytes, rc 0 and inject_case.json       -> RESULT PASS, the INJ note, no stop attempted (INJ is no unit run)
#   i2 current bytes, rc 3 (a setting failed)          -> RESULT FAIL "INJ: FAILED rc 3"
#   i3 current bytes, rc 0 but no inject_case.json     -> RESULT FAIL
#   i4 before bytes (r58c/A/pre/rehearse_r96.sh, its stop wait cut to 3 s), rc 0 and the json -> RESULT FAIL: it waits
#      for a unit done line INJ never writes and then demands a HANDOFF.json (fail before)
#   i5 the default arm list is E4 E5 E1 INJ (current), E4 E5 E1 (before)
# usage (Git Bash): sh r58c/A/test_rehearse_inj.sh   -> RESULT PASS|FAIL rehearse-inj
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
A=$WB/r58c/A; T=$A/out/tri; rm -rf $T; mkdir -p $T/bin
echo "sha256 $(sha256sum $A/rehearse.sh | cut -c1-64) r58c/A/rehearse.sh"
echo "sha256 $(sha256sum $A/pre/rehearse_r96.sh | cut -c1-64) r58c/A/pre/rehearse_r96.sh"
cat > $T/bin/docker <<'EOF'
#!/bin/sh
case "$1" in
  image) echo sha256:fake ;;
  create) echo create >> $TT/calls ;;
  stop) echo stop >> $TT/calls ;;
esac
exit 0
EOF
cat > $T/heldout.sh <<'EOF'
#!/bin/sh
D=$TL/r58c/rehearsal/$REHEARSAL; mkdir -p $D/case $TL/heldout-launch
echo "removing a stopped leftover kge-H1R" >> $TL/heldout-launch/kge-H1R-launch.log
[ -n "$FAKE_NOJSON" ] || echo '{"settings": []}' > $D/case/inject_case.json
exit ${FAKE_RC:-0}
EOF
lane() {  # $1 script, $2 lane name, $3 "old" cuts the stop wait; env FAKE_RC / FAKE_NOJSON -> prints rc
  L=$T/$2; rm -f $T/calls; mkdir -p $L/train; cp $T/heldout.sh $L/train/heldout.sh
  if [ "$3" = old ]; then sed -e "s#^WB=.*#WB=$L#" -e "s/-gt 1500/-gt 3/" "$1" > $L/rehearse.sh
  else sed -e "s#^WB=.*#WB=$L#" "$1" > $L/rehearse.sh; fi
  TT=$T TL=$L PATH=$T/bin:$PATH sh $L/rehearse.sh INJ > $L.out 2>&1; echo $?
}
ok=1
r=$(lane $A/rehearse.sh i1); echo "i1 current, rc 0 + json: rc $r, docker calls: $(cat $T/calls 2>/dev/null | tr '\n' ' ')"; grep -E 'INJ|RESULT' $T/i1.out | cut -c22- | sed 's/^/    /'
[ "$r" = 0 ] && grep -q 'INJ: rc 0, inject_case.json sha256' $T/i1.out && grep -q 'RESULT PASS' $T/i1.out && [ ! -f $T/calls ] || { ok=0; echo "  FAILED"; }
r=$(FAKE_RC=3 lane $A/rehearse.sh i2); echo "i2 current, rc 3: rc $r"
[ "$r" = 1 ] && grep -q 'INJ: FAILED rc 3' $T/i2.out && grep -q 'RESULT FAIL' $T/i2.out || { ok=0; echo "  FAILED (accepted)"; }
r=$(FAKE_NOJSON=1 lane $A/rehearse.sh i3); echo "i3 current, rc 0 without inject_case.json: rc $r"
[ "$r" = 1 ] && grep -q 'INJ: FAILED rc 0' $T/i3.out || { ok=0; echo "  FAILED (accepted)"; }
r=$(lane $A/pre/rehearse_r96.sh i4 old); echo "i4 before bytes, rc 0 + json: rc $r"; grep -E 'INJ|RESULT' $T/i4.out | cut -c22- | sed 's/^/    /'
[ "$r" = 1 ] && grep -q 'RESULT FAIL' $T/i4.out && echo "  fail before: the old driver has no INJ arm (it waits for a unit and wants HANDOFF.json)" || { ok=0; echo "  UNEXPECTED"; }
dn=$(grep -c '^ARMS=${\*:-E4 E5 E1 INJ}$' $A/rehearse.sh); do_=$(grep -c '^ARMS=${\*:-E4 E5 E1}$' $A/pre/rehearse_r96.sh)
echo "i5 default arms: current has INJ $dn, before had E4 E5 E1 $do_"; [ "$dn" = 1 ] && [ "$do_" = 1 ] || { ok=0; echo "  FAILED"; }
for i in 1 2 3 4 5; do rm -rf $T 2>/dev/null && break; sleep 2; done
[ $ok = 1 ] && echo "RESULT PASS rehearse-inj" || echo "RESULT FAIL rehearse-inj"
[ $ok = 1 ]
