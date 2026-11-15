#!/bin/sh
# Agent A, r58c, end-order-changes-2 item 7: host stub test of r58c/A/rehearse.sh's mid-unit stop (no container, no GPU).
# A copy of rehearse.sh runs in a scratch lane with a fake train/heldout.sh (three units, 2 s each, logged only when done,
# as heldout.py does; it resumes past units already done) and a fake docker on PATH (ps/stop/create/image inspect; stop
# kills the fake run and records how many unit done lines existed at that moment). Current bytes: the stop comes after
# the first unit's done line and before the last (1 of 3), the relaunch does not redo the first unit, RESULT PASS.
# Before bytes (r58c/A/pre/rehearse_r93.sh, waits for a 'begun' line heldout.py never writes; its wait cut to 8 s here
# so it ends quickly; the fake run takes 6 s): it never stops on a done line, so the run has ended when the stop is
# due (fail before). A third case with units that finish at once must be refused by the current bytes.
# usage (Git Bash): sh r58c/A/test_rehearse_stop.sh   -> RESULT PASS|FAIL rehearse-stop
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
A=$WB/r58c/A; T=$A/out/trs; rm -rf $T; mkdir -p $T/bin
echo "sha256 $(sha256sum $A/rehearse.sh | cut -c1-64) r58c/A/rehearse.sh"
echo "sha256 $(sha256sum $A/pre/rehearse_r93.sh | cut -c1-64) r58c/A/pre/rehearse_r93.sh"
echo "sha256 $(sha256sum $A/pre-r101/rehearse.sh | cut -c1-64) r58c/A/pre-r101/rehearse.sh"
cat > $T/bin/docker <<'EOF'
#!/bin/sh
case "$1" in
  image) echo sha256:fake ;;
  create) echo created >> $TT/calls ;;
  ps) [ -f $TT/running ] && echo kge-H1R ;;
  stop) grep -c '"status": "done"' $(ls $TL/r58c/rehearsal/*/run/progress.jsonl 2>/dev/null | grep -v '[.]old-') 2>/dev/null | head -1 | sed 's/.*://' > $TT/stopk  # an arm moved aside is not counted
        grep -q '"unit": "unit/' $TL/r58c/rehearsal/*/run/progress.jsonl 2>/dev/null || echo 0 > $TT/stopk
        kill $(cat $TT/pid) 2>/dev/null; rm -f $TT/running ;;
esac
exit 0
EOF
cat > $T/heldout.sh <<'EOF'
#!/bin/sh
P=$TL/r58c/rehearsal/$REHEARSAL/run; mkdir -p $P $TL/heldout-launch; F=$P/progress.jsonl
echo "removing a stopped leftover kge-H1R" >> $TL/heldout-launch/kge-H1R-launch.log
echo $$ > $TT/pid; touch $TT/running
for u in 1 2 3; do
  grep -q "\"unit\": \"unit/$REHEARSAL/c1/s0/u$u\", \"status\": \"done\"" $F 2>/dev/null && continue
  sleep 2
  echo "{\"step\": \"heldout\", \"unit\": \"unit/$REHEARSAL/c1/s0/u$u\", \"status\": \"done\"}" >> $F
done
echo '{"step": "heldout", "unit": "packs", "status": "done"}' >> $F
echo '{}' > $P/HANDOFF.json; rm -f $TT/running; exit 0
EOF
lane() {  # $1 the rehearse script to copy, $2 a fresh lane folder name, $3 "old" shortens its wait -> prints "rc=<n> stopk=<n>"
  L=$T/$2; rm -f $T/stopk $T/pid $T/running; mkdir -p $L/train; cp $T/heldout.sh $L/train/heldout.sh
  if [ "$4" = seed ]; then  # round 9 (C16 / HD-4): an earlier, FINISHED E4 arm is left in the lane (every unit done, HANDOFF.json)
    mkdir -p $L/r58c/rehearsal/E4/run
    for u in 1 2 3; do echo "{\"step\": \"heldout\", \"unit\": \"unit/E4/c1/s0/u$u\", \"status\": \"done\"}"; done > $L/r58c/rehearsal/E4/run/progress.jsonl
    echo '{}' > $L/r58c/rehearsal/E4/run/HANDOFF.json; fi
  if [ "$3" = old ]; then sed -e "s#^WB=.*#WB=$L#" -e "s/-gt 120/-gt 8/" -e "s/sleep 10/sleep 1/" -e "s/sleep 20/sleep 0/" "$1" > $L/rehearse.sh
  else sed -e "s#^WB=.*#WB=$L#" "$1" > $L/rehearse.sh; fi
  TT=$T TL=$L PATH=$T/bin:$PATH sh $L/rehearse.sh E4 E5 > $L.out 2>&1; rc=$?; sleep 3
  echo "rc=$rc stopk=$(cat $T/stopk 2>/dev/null)"
}
ok=1
new=$(lane $A/rehearse.sh l1); L=$T/l1; echo "current bytes: $new"; grep -E 'stop|RESULT' $L.out | cut -c22- | sed 's/^/    /'
case "$new" in "rc=0 stopk=1") grep -q 'the stop was mid-run: 1 of 3 units done at the stop; the first unit was not redone' $L.out \
    && echo "  pass after: stopped after the first unit's done line, inside the next; the relaunch kept the first unit" \
    || { ok=0; echo "  FAILED (no mid-run note)"; } ;; *) ok=0; echo "  FAILED" ;; esac
old=$(lane $A/pre/rehearse_r93.sh l2 old); L=$T/l2; echo "before bytes: $old"
case "$old" in *" stopk=") grep -q 'was not running when the stop was due' $L.out && echo "  fail before: it never stopped on a done line; it waited out its timeout (cut to 8 s here) for a 'begun' line heldout.py never writes, and the run had ended" || { ok=0; echo "  UNEXPECTED"; } ;;
  *) ok=0; echo "  UNEXPECTED" ;; esac
# round 9 (C16 / HD-4): an earlier finished E4 arm in the lane. Current bytes move it aside (E4.old-<UTC>) and the arm
# runs clean (the same mid-run stop as l1); the before bytes (r58c/A/pre-r101/rehearse.sh) read the earlier run's done
# lines at once, so the stop is not inside a unit of this run (fail before).
ase=$(lane $A/rehearse.sh l4 "" seed); L=$T/l4; echo "current bytes, an earlier finished E4 arm in the lane: $ase"
case "$ase" in "rc=0 stopk=1") grep -q 'E4: an earlier r58c/rehearsal/E4 moved aside to E4.old-' $L.out && ls -d $L/r58c/rehearsal/E4.old-* >/dev/null 2>&1 \
    && grep -q 'the stop was mid-run: 1 of 3 units done at the stop' $L.out && echo "  pass after: the earlier arm was moved aside and the arm ran clean" \
    || { ok=0; echo "  FAILED (no move-aside or no mid-run note)"; } ;; *) ok=0; echo "  FAILED" ;; esac
asp=$(lane $A/pre-r101/rehearse.sh l5 "" seed); L=$T/l5; echo "before bytes, the same lane: $asp"
case "$asp" in "rc=1 "*) grep -q 'not mid-unit\|was not running' $L.out && echo "  fail before: the earlier run's done lines ended the wait at once; the stop was not inside a unit of this run" \
    || { ok=0; echo "  UNEXPECTED (no refusal note)"; } ;; *) ok=0; echo "  UNEXPECTED (accepted)" ;; esac
# a stop that comes only after every unit is done must fail the current check (the planted case: units of 0 s)
sed -i 's/sleep 2/sleep 0/' $T/heldout.sh
late=$(lane $A/rehearse.sh l3); L=$T/l3; echo "current bytes, units that finish at once: $late"
case "$late" in "rc=1 "*) grep -q 'not mid-unit\|was not running' $L.out && echo "  refused: the stop was not inside a unit" || { ok=0; echo "  FAILED (no refusal note)"; } ;;
  *) ok=0; echo "  FAILED (accepted)" ;; esac
for i in 1 2 3 4 5; do rm -rf $T 2>/dev/null && break; sleep 2; done
[ $ok = 1 ] && echo "RESULT PASS rehearse-stop" || echo "RESULT FAIL rehearse-stop"
[ $ok = 1 ]
