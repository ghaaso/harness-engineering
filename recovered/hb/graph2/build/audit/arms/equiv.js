'use strict';
// Equivalence re-run: relational vs reference on a sample of TUNE tasks with RANDOM configurations
// (most of them outside the 40-entry sweep), comparing ranked lists and packed answers.
//   node equiv.js [--parents-every 6] [--tasks-per-parent 4] [--configs 30] [--seed 7]
const fs = require('fs');
const path = require('path');
const ARMS = path.resolve(__dirname, '..', '..', 'arms', 'common');
const C = require(path.join(ARMS, 'config'));
const H = require(path.join(ARMS, 'harness'));
const { graphFor, openArm } = require(path.join(ARMS, 'arms'));

const a = process.argv.slice(2); const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? Number(a[i + 1]) : d; };
let s = opt('seed', 7) >>> 0; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
const ALL = ['structure', 'membership', 'imports', 'calls', 'http', 'tests', 'data', 'config', 'capability', 'docs', 'history'];
function randRank(depth = 0) {
  const m = pick(depth ? ['bfs', 'degnorm', 'ppr', 'cochange', 'text'] : ['bfs', 'degnorm', 'ppr', 'ppr', 'cochange', 'text', 'hybrid', 'hybrid']);
  if (m === 'ppr') return { mode: 'ppr', restart: pick([0.1, 0.15, 0.2, 0.3, 0.5, 0.7]), cochange_w: pick([0, 0.5, 1, 2, 3, 5]) };
  if (m === 'hybrid') { const n = pick([2, 3]); const parts = []; for (let i = 0; i < n; i++) parts.push(randRank(1)); return { mode: 'hybrid', parts }; }
  return { mode: m };
}
function randCfg() {
  const classes = ALL.filter(() => rnd() < 0.55); if (!classes.length) classes.push('calls');
  let traversal;
  if (rnd() < 0.25) {
    // the budget state space is prod(b_c + 1) per node; above a few thousand the reference arm's
    // state set overflows (seed 2026 found this), so the sample keeps it at or below 2,000
    const b = {}; for (const c of classes) b[c] = pick([1, 1, 2, 3]);
    const prod = () => Object.values(b).reduce((x, y) => x * (y + 1), 1);
    for (const c of Object.keys(b)) if (prod() > 2000) delete b[c];
    traversal = { mode: 'budget', hops: pick([null, null, 2, 3, 4]), budgets: b };
  }
  else traversal = { mode: 'khop', hops: pick([1, 2, 3, 4, 5, 6, null]) };
  const hub = pick([{ mode: 'none' }, { mode: 'indeg', k: pick([2, 5, 8, 10, 15, 25]) }, { mode: 'transport' }]);
  return C.normalise({ granularity: pick(['file', 'symbol']), direction: pick(['both', 'dependents', 'dependencies']), classes, traversal, hub, rank: randRank(), form: pick(['paths', 'signature', 'range', 'snippet']) });
}
const tasks = H.loadTasks(['T1', 'T2'], 'tune');
const byParent = new Map(); for (const t of tasks) { if (!byParent.has(t.parent)) byParent.set(t.parent, []); byParent.get(t.parent).push(t); }
const parents = [...byParent.keys()].sort().filter((_, i) => i % opt('parents-every', 6) === 0);
const NC = opt('configs', 30); const TP = opt('tasks-per-parent', 4);
const res = { parents: parents.length, tasks: 0, comparisons: 0, mismatches: 0, by_mode: {}, examples: [], seconds: 0, configs_in_sweep: 0 };
const sweepHashes = new Set(C.SWEEP.map((c) => C.configHash(c)));
const t0 = Date.now();
for (const p of parents) {
  const G = graphFor(p); const rel = openArm('relational', G); const ref = openArm('reference', G);
  const ts = byParent.get(p).filter((_, i) => i % Math.max(1, Math.floor(byParent.get(p).length / TP)) === 0).slice(0, TP);
  for (const t of ts) {
    res.tasks++;
    const sm = H.mapSeed(G, t.seed); if (!sm.ids.length) continue;
    for (let k = 0; k < NC; k++) {
      const cfg = randCfg(); if (sweepHashes.has(C.configHash(cfg))) res.configs_in_sweep++;
      rel.rel.useClosure = rnd() < 0.5; rel.rel.useCte = rnd() < 0.5;
      const r1 = rel.rank(sm.ids, cfg, t.seed); const r2 = ref.rank(sm.ids, cfg, t.seed);
      const a1 = JSON.stringify({ ...H.answer(G, t, sm, r1, cfg, 'x', 0) }); const a2 = JSON.stringify({ ...H.answer(G, t, sm, r2, cfg, 'x', 0) });
      const same = JSON.stringify(r1) === JSON.stringify(r2) && a1 === a2;
      const key = cfg.traversal.mode + '/' + cfg.rank.mode; const b = res.by_mode[key] = res.by_mode[key] || { n: 0, mismatches: 0 };
      b.n++; res.comparisons++;
      if (!same) { b.mismatches++; res.mismatches++; if (res.examples.length < 10) { let i = 0; while (i < r1.length && JSON.stringify(r1[i]) === JSON.stringify(r2[i])) i++; res.examples.push({ task: t.id, cfg, closure: rel.rel.useClosure, cte: rel.rel.useCte, first_diff: i, rel: r1[i], ref: r2[i], n_rel: r1.length, n_ref: r2.length }); } }
    }
  }
  rel.close();
  process.stderr.write(p.slice(0, 8) + ' ' + res.comparisons + ' comparisons, ' + res.mismatches + ' mismatches, ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s\n');
}
res.seconds = (Date.now() - t0) / 1000;
fs.writeFileSync(path.join(__dirname, 'equiv.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify({ ...res, examples: res.examples.slice(0, 3) }, null, 1));
