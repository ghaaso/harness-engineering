cd /c/Users/User/Documents/projects/harness-engineering/research-tree
D=build/facts/lane-measure
rm -f $D/shard4.txt
typeperf "\Processor(_Total)\% Processor Time" "\Memory\Available MBytes" -si 2 -o $D/shard-perf.csv -y > /dev/null 2>&1 &
TP=$!
k=0
while IFS= read -r c; do k=$((k+1)); ( s=$(date +%s.%N); eval "$c"; rc=$?; e=$(date +%s.%N); echo "shard$k $rc $(awk "BEGIN{print $e-$s}")" >> $D/shard4.txt ) & done < $D/shards.cmds
sleep 1; wait $(jobs -p | grep -v "^$TP$") 2>/dev/null
sleep 3; kill $TP 2>/dev/null; taskkill //F //IM typeperf.exe >/dev/null 2>&1
echo done >> $D/shard4.txt
