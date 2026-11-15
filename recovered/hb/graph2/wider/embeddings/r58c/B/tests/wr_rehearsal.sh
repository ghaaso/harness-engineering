#!/bin/sh
# END-ORDER 2e.3, the lane's side of the interface rehearsal (agent B, round r58c; end-order-changes-2 change 9,
# commands:F3): write_result.py --test on the grader's three TEST returns in /w/grader-returns/test/ (read by
# write_result's default when no return option is given), with the test hand-offs' inputs at fixed paths.
# Runs inside a ktest-b<N> container: sh LANE/r58c/B/ktest.sh ktest-b<N> /w/r58c/B/tests/wr_rehearsal.sh
# (ktest.sh mounts LANE/grader-returns read-only; it exits with this script's exit code).
# Writes only /w/r58c/B/out/rehearsal/ (an earlier one is renamed rehearsal.old-<stamp>) and the log
# /w/r58c/B/out/logs/wr_rehearsal.log. It never writes into LANE/grader-returns/ (mounted read-only).
# Exit: write_result.py's (0 PASS; 2, 8-14 its refusals) or 3 when an input below is missing.
LOG=/w/r58c/B/out/logs/wr_rehearsal.log; OUT=/w/r58c/B/out/rehearsal; mkdir -p /w/r58c/B/out/logs
TUNE=/w/r58c/handoff-test/report/tune.json            # the TEST tune.json for the fake tables and the pick8 tasks
ANSWER=/w/r58c/A/out/tune_ho/answer_level.json         # answer_level.tune --test (agent A's build_handoffs.py)
HANDOFF=/w/r58c/handoff-test/heldout/HANDOFF.json      # heldout.py run --test (agent A)
ITEM27=/w/r58c/A/out/ho_rec/item27.json                # the TEST item-27 record (arm E1, test: true)
ANCHOR=/w/r58c/A/out/ho_rec/progress.jsonl             # the TEST anchor line ("test": true)
PLAN=/w/r58c/A/out/fakestage/stageB/plan.json          # the fake stage's plan (plan_hash 7e57...)
ITEM22=/w/r58b/out/item22_test/item22.json             # a TEST item22.json (r58b)
LEAK=/w/r58b/out/leak_audit.json                       # a TEST leak_audit.json (r58b)
{
  echo "2e.3 wr_rehearsal $(date -u +%FT%TZ)"
  for f in /w/train/write_result.py /w/r58c/B/tests/wr_rehearsal.sh /w/grader-returns/test/tune-rank.json /w/grader-returns/test/tune-item24.json \
           /w/grader-returns/test/heldout.json $TUNE $ANSWER $HANDOFF $ITEM27 $ANCHOR $PLAN $ITEM22 $LEAK; do
    if [ -f "$f" ]; then echo "sha256 $(sha256sum "$f" | cut -d' ' -f1) ${f#/w/}"; else echo "MISSING $f"; fi
  done
} > $LOG 2>&1
if grep -q '^MISSING' $LOG; then echo "RESULT FAIL 2e: input missing (exit 3)" >> $LOG; cat $LOG; exit 3; fi
[ -d $OUT ] && mv $OUT $OUT.old-$(date -u +%Y%m%dT%H%M%SZ)
cd /w/train
python /w/train/write_result.py --test --tune $TUNE --item22 $ITEM22 --answer $ANSWER --handoff $HANDOFF --item27 $ITEM27 \
  --anchor $ANCHOR --leak $LEAK --plan $PLAN --outdir $OUT >> $LOG 2>&1
rc=$?
echo "write_result exit $rc" >> $LOG
if [ $rc = 0 ]; then
  python -c "import json,sys; j=json.load(open('$OUT/result.json')); i=j.get('inputs',{}); print('result.json test', j.get('test')); [print('result.json input', k, v.get('file'), v.get('sha256')) for k, v in sorted(i.items()) if k in ('tune_rank','answer_graded','heldout')]" >> $LOG 2>&1
  echo "RESULT PASS 2e (write_result exit 0)" >> $LOG
else echo "RESULT FAIL 2e (write_result exit $rc)" >> $LOG; fi
cat $LOG
exit $rc
