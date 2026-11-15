'use strict';
const fs = require('fs');
const C = require('./core.js');
const L = C.LANE;
const tasks = C.readJsonl(L + '/eval/tune_tasks.jsonl');
const commits = C.readJsonl(L + '/eval/tune_commits.jsonl');
const candT = C.readScoreTable(L + '/eval/comparators/candidates_pool.tsv.gz');
const ppr = C.readScoreTable(L + '/eval/comparators/PPR_pool.tsv.gz');
const co = C.readScoreTable(L + '/eval/comparators/CO_pool.tsv.gz');
const rrfT = C.readScoreTable(L + '/eval/comparators/RRF_pool.tsv.gz');
const metrics = JSON.parse(fs.readFileSync(L + '/eval/comparators/metrics.json', 'utf8'));
const cands = t => candT.has(t.task_id) ? [...candT.get(t.task_id).keys()] : [];
const E = new Map();
const out = { checks: {} };
// sets
const sets = {
  all: new Set(commits.map(c => c.commit)),
  late50: new Set(commits.filter(c => c.late50).map(c => c.commit)),
  late50_pilot: new Set(commits.filter(c => c.late50_pilot).map(c => c.commit)),
};
out.checks.n_tasks = tasks.length; out.checks.n_commits = commits.length;
out.checks.late50_size = sets.late50.size; out.checks.late50_pilot_size = sets.late50_pilot.size;
out.checks.late50_is_date_order_gt15 = commits.every(c => c.late50 === (c.date_order > 15));
out.checks.date_orders_1_to_65 = JSON.stringify(commits.map(c => c.date_order).sort((a, b) => a - b)) === JSON.stringify([...Array(65).keys()].map(i => i + 1));
out.checks.tasks_late50_consistent = tasks.every(t => t.late50 === commits.find(c => c.commit === t.commit).late50);
out.checks.tasks_with_no_pool = tasks.filter(t => cands(t).length === 0).length;
let maxRrfDiff = 0, rrfMissing = 0;
const pt = { PPR: new Map(), CO: new Map(), RRF: new Map(), RRFtable: new Map(), RANDOM: new Map() };
for (const t of tasks) {
  const cs = cands(t), tid = t.task_id;
  const p = ppr.get(tid) || new Map(), c = co.get(tid) || new Map();
  const r = C.rrfScores(tid, cs, [[p, 1.0], [c, 1.0]]);
  const rt = rrfT.get(tid) || new Map();
  for (const x of cs) { if (!rt.has(x)) rrfMissing++; else maxRrfDiff = Math.max(maxRrfDiff, Math.abs(rt.get(x) - r.get(x))); }
  pt.PPR.set(tid, C.p10(C.rank(tid, cs, p), t.truth));
  pt.CO.set(tid, C.p10(C.rank(tid, cs, c), t.truth));
  pt.RRF.set(tid, C.p10(C.rank(tid, cs, r), t.truth));
  pt.RRFtable.set(tid, C.p10(C.rank(tid, cs, rt), t.truth));
  pt.RANDOM.set(tid, C.p10(C.rank(tid, cs, new Map(cs.map(x => [x, 0.0]))), t.truth));
}
out.checks.rrf_recomputed_vs_table_maxabs = maxRrfDiff; out.checks.rrf_table_missing = rrfMissing;
out.comparators = {};
let worst = 0;
for (const name of ['PPR', 'CO', 'RRF', 'RRFtable', 'RANDOM']) {
  out.comparators[name] = {};
  for (const s of ['late50', 'late50_pilot', 'all']) {
    const m = C.perCommit(pt[name], tasks, sets[s]).mean;
    const key = (name === 'RRFtable' ? 'RRF' : name) + '_pool';
    const ref = metrics[key] && metrics[key][s] ? metrics[key][s]['P@10'] : null;
    const d = ref === null ? null : m - ref; if (d !== null) worst = Math.max(worst, Math.abs(d));
    out.comparators[name][s] = { mine: m, metrics_json: ref, diff: d };
  }
}
out.checks.max_abs_diff_vs_metrics_json = worst;
out.gate_item6 = { RRF: [0.233, out.comparators.RRF.late50_pilot.mine], PPR: [0.204, out.comparators.PPR.late50_pilot.mine], CO: [0.199, out.comparators.CO.late50_pilot.mine], RANDOM: [0.118, out.comparators.RANDOM.late50_pilot.mine] };
fs.writeFileSync(__dirname + '/gate-result.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
