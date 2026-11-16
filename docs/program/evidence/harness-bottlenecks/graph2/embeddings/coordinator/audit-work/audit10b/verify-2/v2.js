'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const core = require('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/verify-item27/recompute/core.js');
const LANE = core.LANE;
const tasksAll = core.readJsonl(path.join(LANE, 'eval/tune_tasks.jsonl'));
const tasks = tasksAll.filter(t => t.late50);
const txt = zlib.gunzipSync(fs.readFileSync(path.join(LANE, 'eval/comparators/candidates_pool.tsv.gz'))).toString('utf8');
const cands = new Map();
txt.split('\n').slice(1).forEach(l => { if (!l) return; const [t, c] = l.split('\t'); if (!cands.has(t)) cands.set(t, []); cands.get(t).push(c); });
const rrf = core.readScoreTable(path.join(LANE, 'eval/comparators/RRF_pool.tsv.gz'));
const out = { n_tasks: tasks.length, commits: new Set(tasks.map(t => t.commit)).size, keys_task: Object.keys(tasks[0]) };
const P = (pt) => core.perCommit(pt, tasks).mean;
const rrfPT = new Map(); for (const t of tasks) rrfPT.set(t.task_id, core.p10(core.rank(t.task_id, cands.get(t.task_id) || [], rrf.get(t.task_id) || new Map()), t.truth));
out.rrf_p10 = P(rrfPT);
for (const s of [1, 2, 3]) {
  const tab = core.readScoreTable(path.join(LANE, 'train/selectB/E5/alone_pool_s' + s + '.tsv.gz'));
  let occ = 0, un = 0, nanv = 0, tp = 0, tu = 0, tasksTU = 0, tuInTop10 = 0, unInTop10 = 0, tasksFewScored = 0;
  const pt = new Map(), ptUp = new Map(), ptMid = new Map(), ptRrfFill = new Map();
  for (const t of tasks) {
    const cl = cands.get(t.task_id) || []; const sc = tab.get(t.task_id) || new Map(); const T = new Set(t.truth);
    let any = false, nsc = 0;
    for (const c of cl) { occ++; const has = sc.has(c) && !Number.isNaN(sc.get(c)); if (sc.has(c) && Number.isNaN(sc.get(c))) nanv++;
      if (T.has(c)) tp++; if (!has) { un++; if (T.has(c)) { tu++; any = true; } } else nsc++; }
    if (any) tasksTU++; if (nsc < 10 && nsc < cl.length) tasksFewScored++;
    const r = core.rank(t.task_id, cl, sc);
    r.slice(0, 10).forEach(c => { if (!(sc.has(c))) { unInTop10++; if (T.has(c)) tuInTop10++; } });
    pt.set(t.task_id, core.p10(r, t.truth));
    // upper bound: unscored truth moved to the front
    const unT = r.filter(c => !sc.has(c) && T.has(c));
    ptUp.set(t.task_id, core.p10(unT.concat(r.filter(c => !unT.includes(c))), t.truth));
    // neutral: unscored given the median percentile 0.5
    const m = new Map(sc); for (const c of cl) if (!m.has(c)) m.set(c, 0.5);
    ptMid.set(t.task_id, core.p10(core.rank(t.task_id, cl, m), t.truth));
  }
  const a = P(pt);
  out['s' + s] = { occ, un, nan_values: nanv, truth_in_pool: tp, truth_unscored: tu, share: tu / tp, tasks_truth_unscored: tasksTU,
    unscored_in_top10: unInTop10, truth_unscored_in_top10: tuInTop10, tasks_fewer_than10_scored: tasksFewScored,
    p10_alone: a, minus_rrf: a - out.rrf_p10, p10_upper: P(ptUp), gain_upper: P(ptUp) - a, p10_mid05: P(ptMid), gain_mid05: P(ptMid) - a,
    task_mean_upper_gain: core.npMean([...ptUp.values()]) - core.npMean([...pt.values()]) };
}
fs.writeFileSync(path.join(__dirname, 'v2.out.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
