#!/bin/bash
# first-hand check by the coordinator: every test file through the lane, one after another, then the end-to-end run.
# usage: verify_all.sh <build folder> <result file>
R="$1"; OUT="$2"
cd "$R" || exit 2
: > "$OUT"
tt=0; tp=0; tf=0; ts=0; bad=0
for f in tcb/test/*.test.mjs; do
  n=$(basename "$f" .test.mjs)
  to=300; [ "$n" = lib ] && to=560
  o=$(node tools/lane.mjs --label "verify-$n" --timeout-s $to --wait-s 1800 -- node --test --test-concurrency=1 --test-reporter=tap "$f" 2>&1); ec=$?
  t=$(echo "$o" | grep -E '^# tests ' | tail -1 | awk '{print $3}'); p=$(echo "$o" | grep -E '^# pass ' | tail -1 | awk '{print $3}')
  fl=$(echo "$o" | grep -E '^# fail ' | tail -1 | awk '{print $3}'); s=$(echo "$o" | grep -E '^# skipped ' | tail -1 | awk '{print $3}')
  c=$(echo "$o" | grep -E '^# cancelled ' | tail -1 | awk '{print $3}')
  echo "$n exit=$ec tests=${t:-?} pass=${p:-?} fail=${fl:-?} cancelled=${c:-?} skipped=${s:-?}" >> "$OUT"
  if [ "$ec" != "0" ]; then bad=$((bad+1)); echo "$o" | grep -E '^not ok ' | head -8 | cut -c1-200 >> "$OUT"; fi
  tt=$((tt+${t:-0})); tp=$((tp+${p:-0})); tf=$((tf+${fl:-0})); ts=$((ts+${s:-0}))
done
echo "SUITE TOTAL files=$(ls tcb/test/*.test.mjs | wc -l) tests=$tt pass=$tp fail=$tf skipped=$ts files_with_nonzero_exit=$bad" >> "$OUT"
o=$(node tools/lane.mjs --label verify-e2e --timeout-s 570 --wait-s 1800 -- node e2e/run-e2e.mjs 2>&1); ec=$?
echo "E2E exit=$ec | $(echo "$o" | grep -E '^# ' | tail -1)" >> "$OUT"
echo "$o" | grep -E '^FAIL' | head -10 | cut -c1-300 >> "$OUT"
echo "DONE $(date +%H:%M:%S)" >> "$OUT"
