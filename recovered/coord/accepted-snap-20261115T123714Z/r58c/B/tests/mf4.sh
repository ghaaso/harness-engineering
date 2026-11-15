#!/bin/sh
# MF-4: r58c/tests/test_selection_freeze8.py and test_r64.py on the FINAL train/selectB.py (through role_selectB.sh's
# kt_inner.sh logs, or here), and each on a MUTANT copy of selectB.py that breaks the rule it tests (fail before):
#   M-sf8: a block's "earlier" commits include the block itself (order[c] < first + 10)
#   M-r64: on a tie the band is measured from the SMALLEST SE among the tied candidates
# The mutants live in a lane copy under /tmp/mut (train/*.* copied, the rest linked read-only); outputs under
# $BOUT/mf4/. Prints RESULT PASS mf4 when both tests PASS on the final bytes and FAIL on their mutant.
LOGS=$BOUT/logs; mkdir -p $LOGS
S=/w/train/selectB.py; echo "sha256 $(sha256sum $S | cut -d' ' -f1) train/selectB.py"
for t in test_selection_freeze8 test_r64; do echo "sha256 $(sha256sum /w/r58c/tests/$t.py | cut -d' ' -f1) r58c/tests/$t.py"; done
mk() {  # mk <name> <python replace old> <new>
  M=/tmp/mut-$1; rm -rf $M; mkdir -p $M/train/stageB $M/train/r58
  for f in /w/train/*; do [ -f "$f" ] && cp "$f" $M/train/; done
  cp -r /w/train/r58/tests $M/train/r58/tests; cp /w/r58c/B/frozen/plan.json $M/train/stageB/plan.json
  for d in eval export r58b r58c orchestrator parallel fixes; do ln -s /w/$d $M/$d; done
  python - "$M/train/selectB.py" "$2" "$3" <<'PY'
import sys; p, old, new = sys.argv[1:]; t = open(p).read(); assert t.count(old) == 1, old; open(p, 'w').write(t.replace(old, new))
PY
  echo "mutant $1: sha256 $(sha256sum $M/train/selectB.py | cut -d' ' -f1)"
}
mk sf8 "if order[c] < first]" "if order[c] < first + 10]"
mk r64 "key=lambda s: (-s['se'], s['key'][0], s['w']))" "key=lambda s: (s['se'], s['key'][0], s['w']))"
fail=0
for t in test_selection_freeze8 test_r64; do
  EMB_ROOT=/w R58_OUT=$BOUT/mf4/final-$t timeout 250 python /w/r58c/tests/$t.py > $LOGS/mf4-final-$t.log 2>&1; rc=$?
  r=$(grep -E '^RESULT' $LOGS/mf4-final-$t.log | tail -1 | cut -c1-60); echo "final $t rc=$rc $r"
  [ $rc = 0 ] && echo "$r" | grep -q '^RESULT PASS' || fail=1
done
for p in "sf8 test_selection_freeze8" "r64 test_r64"; do
  m=${p% *}; t=${p#* }
  EMB_ROOT=/tmp/mut-$m R58_OUT=$BOUT/mf4/mutant-$t timeout 250 python /w/r58c/tests/$t.py > $LOGS/mf4-mutant-$t.log 2>&1; rc=$?
  r=$(grep -E '^RESULT' $LOGS/mf4-mutant-$t.log | tail -1 | cut -c1-60); echo "mutant-$m $t rc=$rc $r (must FAIL)"
  grep -E 'FAILED' $LOGS/mf4-mutant-$t.log | head -4 | cut -c1-160
  echo "$r" | grep -q '^RESULT FAIL' || fail=1
done
[ $fail = 0 ] && echo "RESULT PASS mf4" || echo "RESULT FAIL mf4"
