#!/usr/bin/env bash
# Wait up to ~9 min for the interleaved bench to end; then print progress (units done, last lines, repeats/flags so far).
B=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build
O=$B/tmp/bench/interleaved.out
end=$(( $(date +%s) + ${1:-560} ))
until grep -q "^EXIT" "$O" || [ "$(date +%s)" -ge "$end" ]; do sleep 15; done
date -u +%H:%M:%SZ
echo "units: $(ls $B/results/bench/interleaved/units 2>/dev/null | tr '\n' ' ')"
echo "repeat lines: $(grep -c 'repeat [0-9]' $O)  kept-flagged lines: $(grep -ci 'flag' $O)"
grep -iE "error|exception|refus|killed|EXIT|problem" "$O" | tail -5 | cut -c1-300
tail -2 "$O" | cut -c1-250
docker ps --format '{{.Names}}' | grep gt-ibench || echo "bench container not running"
