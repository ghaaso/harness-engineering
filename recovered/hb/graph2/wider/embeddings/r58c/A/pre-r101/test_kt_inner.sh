#!/bin/sh
# Agent A, r58c (2026-11-15, found by ktest-a21): host check of r58c/A/kt_inner.sh's per-item exit code. No container: a
# copy of the runner with /w swapped for a scratch folder and a fake `python` on PATH that exits 12 for bad.py and
# 0 otherwise. Items: script:x/good.py script:x/bad.py@a1 and a test item test_ok. Current bytes: the summary shows
# bad-a1 rc=12, `done rc=12`, exit 12. Before bytes (r58c/A/pre/kt_inner_r95.sh): the script item's rc was read after
# the `t=$n` assignment, so bad-a1 showed rc=0 and the runner exited 0 (fail before).
# usage (Git Bash): sh r58c/A/test_kt_inner.sh   -> RESULT PASS|FAIL kt-inner
WB=/c/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings
A=$WB/r58c/A; T=$A/out/tki; rm -rf $T; mkdir -p $T/bin
for f in $A/kt_inner.sh $A/pre/kt_inner_r95.sh; do echo "sha256 $(sha256sum $f | cut -c1-64) ${f#$WB/}"; done
cat > $T/bin/python <<'EOF'
#!/bin/sh
case "$1" in *bad.py) echo "RESULT FAIL bad"; exit 12 ;; esac
echo "RESULT PASS $(basename $1)"; exit 0
EOF
chmod +x $T/bin/python
one() {  # $1 runner -> "exit=<n>" and the summary in $T/w/r58c/A/logs/summary-k.txt
  rm -rf $T/w; mkdir -p $T/w/train/r58/tests $T/w/r58c/A/logs $T/w/x
  : > $T/w/x/good.py; : > $T/w/x/bad.py; : > $T/w/train/r58/tests/test_ok.py
  sed -e "s#/w/#$T/w/#g" -e "s#cd /w/train#cd $T/w/train#" "$1" > $T/runner.sh
  KNAME=k TESTS="script:x/good.py script:x/bad.py@a1 test_ok" PATH="$T/bin:$PATH" sh $T/runner.sh > $T/out 2>&1; echo "exit=$?"
}
ok=1
new=$(one $A/kt_inner.sh); S=$T/w/r58c/A/logs/summary-k.txt; echo "current bytes: $new"; sed 's/^/    /' $S
[ "$new" = exit=12 ] && grep -q '^bad-a1 rc=12 RESULT FAIL bad' $S && grep -q '^good rc=0' $S && grep -q '^test_ok rc=0' $S && grep -q '^done rc=12$' $S \
  && echo "  pass after: the failing script item's rc 12 is the runner's exit code" || { ok=0; echo "  FAILED"; }
old=$(one $A/pre/kt_inner_r95.sh); echo "before bytes: $old"; sed 's/^/    /' $S
[ "$old" = exit=0 ] && grep -q '^bad-a1 rc=0 RESULT FAIL bad' $S && echo "  fail before: the script item showed rc 0 and the runner exited 0" || { ok=0; echo "  UNEXPECTED"; }
rm -rf $T
[ $ok = 1 ] && echo "RESULT PASS kt-inner" || echo "RESULT FAIL kt-inner"
[ $ok = 1 ]
