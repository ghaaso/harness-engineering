cd /c/Users/User/Documents/projects/harness-engineering/research-tree
D=build/facts/lane-measure
rm -f $D/full.txt
typeperf "\Processor(_Total)\% Processor Time" "\Memory\Available MBytes" -si 2 -o $D/full-perf.csv -y > /dev/null 2>&1 &
TP=$!
S=$(date +%s.%N)
( s=$(date +%s.%N); node --test --test-concurrency=8 --test-reporter=tap $(ls tcb/test/*.test.mjs | grep -v selftest) > $D/full-others.log 2>&1; rc=$?; e=$(date +%s.%N); echo "others $rc $(awk "BEGIN{print $e-$s}")" >> $D/full.txt ) &
k=0
while IFS= read -r c; do k=$((k+1)); c=${c//shard-/fullshard-}; ( s=$(date +%s.%N); eval "$c"; rc=$?; e=$(date +%s.%N); echo "shard$k $rc $(awk "BEGIN{print $e-$s}")" >> $D/full.txt ) & done < $D/shards.cmds
sleep 1; wait $(jobs -p | grep -v "^$TP$") 2>/dev/null
E=$(date +%s.%N); echo "WALL $(awk "BEGIN{print $E-$S}")" >> $D/full.txt
sleep 3; kill $TP 2>/dev/null; taskkill //F //IM typeperf.exe >/dev/null 2>&1
echo done >> $D/full.txt
