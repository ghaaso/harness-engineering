cd /c/Users/User/Documents/projects/harness-engineering/research-tree
for f in tcb/test/*.test.mjs; do
 s=$(date +%s.%N); node --test --test-reporter=tap $f > build/facts/lane-measure/alone-$(basename $f).log 2>&1; rc=$?
 e=$(date +%s.%N); echo "$f $rc $(echo "$e - $s" | bc 2>/dev/null || awk "BEGIN{print $e-$s}")" >> build/facts/lane-measure/alone.txt
done
echo done >> build/facts/lane-measure/alone.txt
