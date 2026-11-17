#!/bin/bash
# one check of a continuation run. usage: tcb_tick.sh <task output file> <journal of that run> [seconds to wait]
B="C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e"
S="C:/Users/User/.claude/projects/C--Users-User-Documents-projects-EMS-workshop1/e24f17dc-4aea-4914-a9d1-280a723d620e/subagents/workflows"
R="$B/scratchpad/tcb-build"
node "$B/scratchpad/coord/wf_prog.js" "$1" "$2" "${3:-560}" | cut -c1-420
node "$B/scratchpad/coord/tcb_done_sync.js" "$R" "$S/wf_04e6e2f0-db1/journal.jsonl" "$S/wf_09cb9951-e47/journal.jsonl" "$2" | cut -c1-420
node "$B/scratchpad/coord/tcb_snapshot.js" | cut -c1-90
echo "recorder: $(tail -n 1 "$R/lane/recorder.log" | cut -c1-70) | governor lines: $(grep -c GOVERNOR "$R/lane/recorder.log")"
