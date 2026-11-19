cd /c/Users/User/Documents/projects/harness-engineering/research-tree
D=build/facts/lane-measure
typeperf "\Processor(_Total)\% Processor Time" "\Memory\Available MBytes" -si 2 -o $D/k4-perf.csv -y > /dev/null 2>&1 &
TP=$!
rm -f $D/k4.txt
for n in status watch lib fsck; do
 ( s=$(date +%s.%N); node --test --test-reporter=tap tcb/test/$n.test.mjs > $D/k4-$n.log 2>&1; rc=$?; e=$(date +%s.%N); echo "$n $rc $(awk "BEGIN{print $e-$s}")" >> $D/k4.txt ) &
done
wait $(jobs -p | grep -v $TP) 2>/dev/null
sleep 3; kill $TP 2>/dev/null; taskkill //F //IM typeperf.exe >/dev/null 2>&1
echo done >> $D/k4.txt
