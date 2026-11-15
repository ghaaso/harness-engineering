'use strict';
// Cross-check A: the grader's tuning truth against the lane's eval/tune_tasks.jsonl (the pilot's definition).
// Tasks are matched by (commit, parent, seed path). Also compares task ids, date order and the late-50 flag.
// Prints counts only. Exit 1 on any difference.
const fs = require('fs');
const path = require('path');
const LANE = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const jl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const mine = jl(path.join(__dirname, 'truth.jsonl')).filter((r) => r.split === 'tune');
const lane = jl(path.join(LANE, 'eval', 'tune_tasks.jsonl'));
const key = (c, p, s) => [c, p, s].join('|');
const L = new Map(lane.map((t) => [key(t.commit, t.parent, t.seed), t]));
let matched = 0; let equal = 0; let sameId = 0; let sameOrder = 0; let sameLate = 0; const diffs = [];
for (const m of mine) {
  const t = L.get(key(m.commit, m.parent, m.seed)); if (!t) continue;
  matched++;
  if (JSON.stringify([...t.truth].sort()) === JSON.stringify(m.truth)) equal++; else diffs.push({ mine: m.truth.length, lane: t.truth.length });
  if (t.task_id === m.id) sameId++;
  if (t.date_order === m.date_order) sameOrder++;
  if (t.late50 === m.late50) sameLate++;
}
const res = { grader_tasks: mine.length, lane_tasks: lane.length, matched, truth_equal: equal, same_task_id: sameId, same_date_order: sameOrder, same_late50: sameLate, differing: diffs.length };
console.log(JSON.stringify(res));
process.exit(matched === 388 && equal === 388 && lane.length === 388 ? 0 : 1);
