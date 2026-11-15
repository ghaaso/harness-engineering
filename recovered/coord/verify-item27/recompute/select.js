'use strict';
// Blind recomputation of stage-B selection (items 14, 17, 20, 23, 27; rulings 53, 57, 64, 77).
const fs = require('fs');
const crypto = require('crypto');
const C = require('./core.js');
const L = C.LANE;
const tasks = C.readJsonl(L + '/eval/tune_tasks.jsonl');
const commits = C.readJsonl(L + '/eval/tune_commits.jsonl');
const plan = JSON.parse(fs.readFileSync(L + '/train/stageB/plan.json', 'utf8'));
const candT = C.readScoreTable(L + '/eval/comparators/candidates_pool.tsv.gz');
const ppr = C.readScoreTable(L + '/eval/comparators/PPR_pool.tsv.gz');
const co = C.readScoreTable(L + '/eval/comparators/CO_pool.tsv.gz');
const cands = t => candT.has(t.task_id) ? [...candT.get(t.task_id).keys()] : [];
const WS = [0.25, 0.5, 1];
const ARMS = ['E1', 'E2', 'E3', 'E4', 'E5'];
const ARM_ORDER = ['E3', 'E1', 'E2', 'E4', 'E5'];

const ALL = new Set(commits.map(c => c.commit));
const late = commits.filter(c => c.late50).sort((a, b) => a.date_order - b.date_order);
const blocks = [0, 1, 2, 3, 4].map(b => {
  const blk = late.slice(10 * b, 10 * b + 10);
  const first = blk[0].date_order;
  const earlier = new Set(commits.filter(c => c.date_order < first).map(c => c.commit));
  return { block: b, date_orders: [first, blk[blk.length - 1].date_order], n_earlier: earlier.size, earlier, commits: blk.map(c => c.commit) };
});

function size(cfg) { return [cfg.embedding_dim, cfg.num_layers || 0]; }

function choose(cs, seKey) {
  // cs: [{config_id, w, dim, layers, mean, se}]
  let best = -Infinity; for (const c of cs) if (c.mean > best) best = c.mean;
  const tied = cs.filter(c => c.mean === best);
  const se = Math.max(...tied.map(c => c[seKey]));
  const thr = best - se;
  const band = cs.filter(c => c.mean >= thr);
  band.sort((a, b) => a.dim - b.dim || a.layers - b.layers || (b.mean - a.mean) || (a.config_id < b.config_id ? -1 : a.config_id > b.config_id ? 1 : 0) || a.w - b.w);
  const ch = band[0];
  // closest margin to the band edge, to show how sensitive membership is
  const margins = cs.map(c => ({ id: c.config_id + '/w' + c.w, margin: c.mean - thr })).sort((a, b) => Math.abs(a.margin) - Math.abs(b.margin));
  return { best_mean: best, best: tied.map(c => c.config_id + '/w' + c.w), se_used: se, threshold: thr,
    band: band.map(c => c.config_id + '/w' + c.w), choice: { config_id: ch.config_id, w: ch.w, mean: ch.mean, dim: ch.dim, layers: ch.layers },
    nearest_edge: margins.slice(0, 2) };
}

const result = { method: {}, arms: {}, tables: {} };
result.method = {
  ranking: 'Node mirror of evalcore rank/tiebreak(blake2b digest 8)/ranks_within/rrf_scores k=60; fused = RRF of (PPR,1),(CO,1),(emb,w) in that addition order; pool = candidates_pool.tsv.gz rows; PPR/CO from comparators tables',
  aggregation: 'P@10 per task per seed; mean of 3 seeds per task; mean of tasks per commit; mean of commits (item 23)',
  se: 'se1 = sample sd (ddof=1)/sqrt(n) of per-commit values; se0 = ddof 0 shown as sensitivity. evalcore.py has no SE function.',
  band: 'ruling 53 + 64: best = max mean; SE of best (largest SE among exact ties); band = mean >= best - SE; choice: smallest dim, then fewer layers, then higher mean, then lower config id, then smaller w',
  blocks: 'commits in date_order (author time, ruling 32); late50 flag (== date_order > 15); 5 blocks of 10 by date_order; each block chosen on all commits with date_order < block start (15, 25, 35, 45, 55 commits)',
  item27: 'arm figure = all-65 mean of its ruling-53 choice; highest; ties at 4 decimals -> smaller dim, then layers, then E3,E1,E2,E4,E5',
};
const tableDigest = crypto.createHash('sha256');
for (const arm of ARMS) {
  const cfgs = plan.configs[arm];
  const cand = [];
  const consistency = { tables: 0, rows: 0, nan: 0, inf: 0, count_mismatch_tasks: 0, tasks_absent: [] };
  for (const cf of cfgs) {
    const perSeed = [];
    for (const s of [1, 2, 3]) {
      const fn = `${L}/train/stageB/tables/${arm}_${cf.config_id}_s${s}_pool.tsv.gz`;
      const buf = fs.readFileSync(fn); tableDigest.update(arm + cf.config_id + s); tableDigest.update(buf);
      const emb = C.readScoreTable(fn);
      const counts = JSON.parse(fs.readFileSync(fn.replace('_pool.tsv.gz', '_counts.json'), 'utf8'));
      consistency.tables++; consistency.rows += emb.rows; consistency.nan += emb.nan; consistency.inf += emb.inf;
      const vals = new Map(WS.map(w => [w, new Map()]));
      for (const t of tasks) {
        const cs = cands(t), tid = t.task_id;
        const e = emb.get(tid) || new Map();
        const nScoredInPool = cs.filter(c => e.has(c)).length;
        const cc = counts[tid] && counts[tid].pool;
        if (!cc || cc.cands !== cs.length || cc.cands - (cc.cands_unscored || 0) !== nScoredInPool || (cc.cands_folded || 0) !== 0) consistency.count_mismatch_tasks++;
        if (!emb.has(tid) && s === 1) consistency.tasks_absent.push(cf.config_id + ':' + tid);
        const p = ppr.get(tid) || new Map(), c = co.get(tid) || new Map();
        for (const w of WS) {
          const f = C.rrfScores(tid, cs, [[p, 1.0], [c, 1.0], [e, w]]);
          vals.get(w).set(tid, C.p10(C.rank(tid, cs, f), t.truth));
        }
      }
      perSeed.push(vals);
    }
    for (const w of WS) {
      const pt = new Map();
      for (const t of tasks) pt.set(t.task_id, (perSeed[0].get(w).get(t.task_id) + perSeed[1].get(w).get(t.task_id) + perSeed[2].get(w).get(t.task_id)) / 3);
      const [dim, layers] = size(cf.cfg);
      const a65 = C.perCommit(pt, tasks, ALL);
      const per = { config_id: cf.config_id, w, dim, layers, all65: { mean: a65.mean, se1: a65.se1, se0: a65.se0 }, blocks: [] };
      for (const b of blocks) { const r = C.perCommit(pt, tasks, b.earlier); per.blocks.push({ mean: r.mean, se1: r.se1, se0: r.se0, n: r.n }); }
      per.seed_values_late50 = [0, 1, 2].map(i => C.perCommit(perSeed[i].get(w), tasks, new Set(late.map(c => c.commit))).mean);
      cand.push(per);
    }
  }
  const mk = (sel, seKey) => cand.map(c => ({ config_id: c.config_id, w: c.w, dim: c.dim, layers: c.layers, mean: sel(c).mean, se1: sel(c).se1, se0: sel(c).se0, se: sel(c)[seKey] }));
  const A = { consistency, candidates: cand.map(c => ({ config_id: c.config_id, w: c.w, dim: c.dim, layers: c.layers, all65_mean: c.all65.mean, all65_se1: c.all65.se1, all65_se0: c.all65.se0, blocks: c.blocks })) };
  A.final_all65 = choose(mk(c => c.all65, 'se1'), 'se1');
  A.final_all65_se0 = choose(mk(c => c.all65, 'se0'), 'se0');
  A.blocks = blocks.map((b, i) => ({ block: i, date_orders: b.date_orders, n_earlier: b.n_earlier, ...choose(mk(c => c.blocks[i], 'se1'), 'se1'), choice_se0: choose(mk(c => c.blocks[i], 'se0'), 'se0').choice }));
  result.arms[arm] = A;
}
result.tables_digest_sha256 = tableDigest.digest('hex');
// item 27 / ruling 57
const figs = ARMS.map(a => ({ arm: a, figure: result.arms[a].final_all65.choice.mean, r4: Math.round(result.arms[a].final_all65.choice.mean * 1e4) / 1e4, dim: result.arms[a].final_all65.choice.dim, layers: result.arms[a].final_all65.choice.layers, config_id: result.arms[a].final_all65.choice.config_id, w: result.arms[a].final_all65.choice.w }));
const sorted = figs.slice().sort((a, b) => (b.r4 - a.r4) || (a.dim - b.dim) || (a.layers - b.layers) || (ARM_ORDER.indexOf(a.arm) - ARM_ORDER.indexOf(b.arm)));
const rawSorted = figs.slice().sort((a, b) => b.figure - a.figure);
result.item27 = { arm_figures: figs, ranked_r4_rule: sorted.map(x => x.arm), ranked_raw: rawSorted.map(x => x.arm), selected: sorted[0],
  top_gap_raw: rawSorted[0].figure - rawSorted[1].figure };
const s = JSON.stringify(result, null, 1);
fs.writeFileSync(__dirname + '/blind-result.json', s);
console.log('sha256', crypto.createHash('sha256').update(s).digest('hex'));
for (const a of ARMS) {
  const A = result.arms[a];
  console.log('==', a, JSON.stringify(A.consistency).slice(0, 300));
  for (const c of A.candidates) console.log(' ', c.config_id, c.w, 'd' + c.dim, 'L' + c.layers, c.all65_mean.toFixed(10), c.all65_se1.toFixed(10), c.all65_se0.toFixed(10));
  console.log('  final', JSON.stringify(A.final_all65));
  console.log('  final_se0 choice', JSON.stringify(A.final_all65_se0.choice));
  for (const b of A.blocks) console.log('  block', b.block, b.date_orders, b.n_earlier, JSON.stringify(b.choice), 'band', b.band.join(','), 'se0choice', b.choice_se0.config_id + '/' + b.choice_se0.w, 'edge', JSON.stringify(b.nearest_edge[0]));
}
console.log(JSON.stringify(result.item27, null, 1));
