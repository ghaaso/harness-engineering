#!/usr/bin/env bash
# Wait up to $1 seconds (default 560) for the resumed interleaved bench to end; then append one progress line
# to tmp/bench/resume_progress.txt and print it with the last log lines.
B=C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build
O=$B/tmp/bench/interleaved.resume.out
P=$B/tmp/bench/resume_progress.txt
end=$(( $(date +%s) + ${1:-560} ))
until grep -q "^EXIT" "$O" 2>/dev/null || [ "$(date +%s)" -ge "$end" ]; do sleep 20; done
units="$(ls $B/results/bench/interleaved/units 2>/dev/null | tr '\n' ' ')"
reps="$(grep -c 'repeat [0-9]' $O)"
last="$(grep '\[ibench' $O | tail -1 | cut -c1-160)"
ctr="$(docker ps --format '{{.Names}}' | grep -x gt-ibench-interleaved || echo 'container not running')"
ex="$(grep '^EXIT' $O | tail -1)"
line="$(date -u +%Y-%m-%dT%H:%M:%SZ) units done: ${units:-none}; repeat lines in resume log: $reps; container: $ctr; last log line: $last ${ex:+; $ex}"
echo "$line" >> "$P"
echo "$line"
grep -iE "error|exception|refus|killed|problem" "$O" | tail -5 | cut -c1-300
tail -3 "$O" | cut -c1-250
