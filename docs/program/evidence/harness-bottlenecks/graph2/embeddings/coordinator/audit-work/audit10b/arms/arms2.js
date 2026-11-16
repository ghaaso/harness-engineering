'use strict';
// E5 unscored candidates on the late 50 (pool, seed 1, stitched alone table): how many are truth files.
const L = require('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/audit10/stats/lib.js');
const { core, LANE, path, fs } = L;
const tasks = core.readJsonl(path.join(LANE, 'eval/tune_tasks.jsonl')).filter(t => t.late50);
const cands = L.readCands('pool');
const out = {};
for (const s of [1, 2, 3]) {
  const tab = core.readScoreTable(path.join(LANE, 'train/selectB/E5/alone_pool_s' + s + '.tsv.gz'));
  let occ = 0, un = 0, truthInPool = 0, truthUn = 0, tasksWithTruthUn = 0, top10TruthLostIfLast = 0;
  for (const t of tasks) {
    const cl = cands.get(t.task_id) || []; const sc = tab.get(t.task_id) || new Map();
    const T = new Set(t.truth); let any = false;
    for (const c of cl) { occ++; if (!sc.has(c)) { un++; if (T.has(c)) { truthUn++; any = true; } } if (T.has(c)) truthInPool++; }
    if (any) tasksWithTruthUn++;
  }
  // P@10 of E5 alone vs the same list with unscored candidates given the RRF order instead (descriptive only)
  out['s' + s] = { tasks: tasks.length, cand_occurrences: occ, unscored: un, truth_in_pool: truthInPool, truth_unscored: truthUn, tasks_with_truth_unscored: tasksWithTruthUn };
}
const r = JSON.parse(fs.readFileSync(path.join(LANE, 'train/report/e5_route/e5_route.json'), 'utf8'));
out.e5_route_keys = Object.keys(r);
out.e5_route_head = JSON.stringify(r).slice(0, 1500);
fs.writeFileSync(path.join(__dirname, 'arms2.out.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
