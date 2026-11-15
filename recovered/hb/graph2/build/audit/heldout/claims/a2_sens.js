'use strict';
// Refuter 3: paired cluster bootstrap with an own generator + sensitivity analyses on the re-scored answers.
const fs = require('fs');
const OUT = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/audit/heldout/claims';
const { per } = JSON.parse(fs.readFileSync(OUT + '/a1_per.json', 'utf8'));
const meta = new Map(JSON.parse(fs.readFileSync(OUT + '/a1_refs_meta.json', 'utf8')).map((m) => [m.id, m]));

// own generator (xorshift128+ style via two 32-bit states), different from compare.js
function rng(seed) { let x = seed >>> 0 || 1; let y = 362436069; return () => { const t = x ^ (x << 11); x = y; y = (y ^ (y >>> 19)) ^ (t ^ (t >>> 8)); return (y >>> 0) / 4294967296; }; }
function boot(d, n = 10000, seed = 777) {
  const r = rng(seed); const k = d.length; const ms = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < k; j++) s += d[(r() * k) | 0]; ms[i] = s / k; }
  ms.sort(); return [ms[Math.floor(0.025 * n)], ms[Math.ceil(0.975 * n) - 1], ms[Math.floor(0.00625 * n)], ms[Math.ceil(0.99375 * n) - 1]];
}
const mean = (x) => x.reduce((a, b) => a + b, 0) / x.length;
const r4 = (x) => Math.round(x * 10000) / 10000;

// cluster key per set
const clusterOf = (set, t) => (set === 'T3' ? t.id : meta.get(t.id).commit);
function clusters(row, set, metric, filter) {
  const g = new Map();
  for (const t of per[row][set]) { if (filter && !filter(t)) continue; const c = clusterOf(set, t); if (!g.has(c)) g.set(c, []); g.get(c).push(t[metric]); }
  const m = new Map(); for (const [c, v] of g) m.set(c, mean(v)); return m;
}
function paired(a, b, set, metric = 'r8000', filter = null, drop = null) {
  const ca = clusters(a, set, metric, filter); const cb = clusters(b, set, metric, filter);
  let keys = [...ca.keys()].filter((k) => cb.has(k)).sort(); if (drop) keys = keys.filter((k) => !drop.has(k));
  const d = keys.map((k) => ca.get(k) - cb.get(k));
  if (!d.length) return null;
  const [lo, hi, blo, bhi] = boot(d);
  return { n: d.length, a: r4(mean(keys.map((k) => ca.get(k)))), b: r4(mean(keys.map((k) => cb.get(k)))), diff: r4(mean(d)), ci95: [r4(lo), r4(hi)], ci_bonf4: [r4(blo), r4(bhi)], wins: d.filter((x) => x > 1e-12).length, losses: d.filter((x) => x < -1e-12).length };
}

// commit size rankings (T1)
const t1commits = new Map();
for (const t of per.typed.T1) { const m = meta.get(t.id); const c = m.commit; if (!t1commits.has(c)) t1commits.set(c, { c, nfiles_all: m.nfiles_all, ntasks: 0, units: 0 }); const o = t1commits.get(c); o.ntasks++; o.units += t.units; }
const top3 = (k) => new Set([...t1commits.values()].sort((x, y) => y[k] - x[k]).slice(0, 3).map((o) => o.c));

const PAIRS = [['typed', 'search'], ['typed', 'search2'], ['typed', 'fco'], ['typed', 'fdir'], ['lbs2', 'typed'], ['lbs2d1', 'typed'], ['lbs2d2', 'typed'], ['lbs2d3', 'typed'], ['lbs2d4', 'typed'], ['s1', 'typed'], ['search', 'fco'], ['search2', 'fco'], ['fco', 'fdir'], ['lb', 'typed'], ['dp', 'typed']];
const out = { full: {}, budgets: {}, drop3: {}, loo: {}, runtime: {}, unpadded: {}, pertask: {}, seedmatch: {}, padshare: {}, via: {}, sets: {} };

for (const [a, b] of PAIRS) {
  const k = a + '-' + b;
  out.full[k] = paired(a, b, 'T1');
  out.sets[k] = { T2: paired(a, b, 'T2'), T3: paired(a, b, 'T3'), T4: paired(a, b, 'T4') };
  out.budgets[k] = { r2000: paired(a, b, 'T1', 'r2000'), r4000: paired(a, b, 'T1', 'r4000'), r16000: paired(a, b, 'T1', 'r16000') };
  out.drop3[k] = { by_commit_files: paired(a, b, 'T1', 'r8000', null, top3('nfiles_all')), by_tasks: paired(a, b, 'T1', 'r8000', null, top3('ntasks')), by_units: paired(a, b, 'T1', 'r8000', null, top3('units')) };
  // leave-one-out and leave-most-favourable-3-out
  const ca = clusters(a, 'T1', 'r8000'); const cb = clusters(b, 'T1', 'r8000');
  const keys = [...ca.keys()].sort(); const d = keys.map((x) => ca.get(x) - cb.get(x));
  const tot = d.reduce((s, x) => s + x, 0); const loo = d.map((x) => (tot - x) / (d.length - 1));
  const order = keys.map((x, i) => [x, d[i]]).sort((p, q) => q[1] - p[1]);
  out.loo[k] = { min: r4(Math.min(...loo)), max: r4(Math.max(...loo)), drop_best3: paired(a, b, 'T1', 'r8000', null, new Set(order.slice(0, 3).map((p) => p[0]))), drop_best5: paired(a, b, 'T1', 'r8000', null, new Set(order.slice(0, 5).map((p) => p[0]))) };
  out.runtime[k] = {};
  for (const rt of ['backend', 'web', 'mobile', 'other']) out.runtime[k][rt] = paired(a, b, 'T1', 'r8000', (t) => meta.get(t.id).seed_runtime === rt);
  out.runtime[k].not_mobile = paired(a, b, 'T1', 'r8000', (t) => meta.get(t.id).seed_runtime !== 'mobile');
  out.unpadded[k] = paired(a, b, 'T1', 'head8000');
  // per task (no clustering), plain mean difference
  const ma = new Map(per[a].T1.map((t) => [t.id, t.r8000])); const mb = new Map(per[b].T1.map((t) => [t.id, t.r8000]));
  const dd = [...ma.keys()].map((id) => ma.get(id) - mb.get(id));
  out.pertask[k] = { tasks: dd.length, diff: r4(mean(dd)), wins: dd.filter((x) => x > 1e-12).length, losses: dd.filter((x) => x < -1e-12).length };
  // tasks where both arms matched the seed by id
  out.seedmatch[k] = paired(a, b, 'T1', 'r8000', (t) => true);
}
// both-matched restriction needs the pair: recompute
for (const [a, b] of PAIRS) {
  const ok = new Set(per[a].T1.filter((t) => t.seed_match === 'id').map((t) => t.id));
  const ok2 = new Set(per[b].T1.filter((t) => t.seed_match === 'id').map((t) => t.id));
  out.seedmatch[a + '-' + b] = paired(a, b, 'T1', 'r8000', (t) => ok.has(t.id) && ok2.has(t.id));
}
// seed-match distribution and pad share
for (const row of Object.keys(per)) {
  const dist = {}; for (const t of per[row].T1) dist[t.seed_match] = (dist[t.seed_match] || 0) + 1;
  out.seedmatch['dist_' + row] = dist;
  const T = per[row].T1;
  out.padshare[row] = { r8000: r4(mean(T.map((t) => t.r8000))), head8000: r4(mean(T.map((t) => t.head8000))), padonly8000: r4(mean(T.map((t) => t.padonly8000))), viaHist8000: r4(mean(T.map((t) => t.viaHist8000))), viaStructOnly8000: r4(mean(T.map((t) => t.viaStructOnly8000))), median_n_head: T.map((t) => t.n_head).sort((x, y) => x - y)[T.length >> 1], median_lookups: T.map((t) => t.lookups).sort((x, y) => x - y)[T.length >> 1], tasks_mean: 'per task, not per commit' };
}
// share of T1 commits / tasks by seed runtime
const rtc = {}; for (const t of per.typed.T1) { const r = meta.get(t.id).seed_runtime; rtc[r] = (rtc[r] || 0) + 1; }
out.runtime_task_counts = rtc;
out.top3 = { by_commit_files: [...top3('nfiles_all')].map((c) => t1commits.get(c)), by_tasks: [...top3('ntasks')].map((c) => t1commits.get(c)), by_units: [...top3('units')].map((c) => t1commits.get(c)) };
fs.writeFileSync(OUT + '/a2_sens.json', JSON.stringify(out, null, 1));
const brief = (p) => (p ? `${p.diff} [${p.ci95}] n=${p.n}` : 'n/a');
for (const [a, b] of PAIRS) {
  const k = a + '-' + b;
  console.log(`\n${k}: T1 ${brief(out.full[k])} bonf98.75=[${out.full[k].ci_bonf4}] w/l ${out.full[k].wins}/${out.full[k].losses} | T2 ${brief(out.sets[k].T2)} | T3 ${brief(out.sets[k].T3)} | T4 ${brief(out.sets[k].T4)}`);
  console.log(`  2k ${brief(out.budgets[k].r2000)} 4k ${brief(out.budgets[k].r4000)} 16k ${brief(out.budgets[k].r16000)}`);
  console.log(`  drop3 files ${brief(out.drop3[k].by_commit_files)} | tasks ${brief(out.drop3[k].by_tasks)} | units ${brief(out.drop3[k].by_units)}`);
  console.log(`  loo [${out.loo[k].min}, ${out.loo[k].max}] drop best3 ${brief(out.loo[k].drop_best3)} best5 ${brief(out.loo[k].drop_best5)}`);
  console.log(`  rt backend ${brief(out.runtime[k].backend)} web ${brief(out.runtime[k].web)} mobile ${brief(out.runtime[k].mobile)} other ${brief(out.runtime[k].other)} notmobile ${brief(out.runtime[k].not_mobile)}`);
  console.log(`  unpadded ${brief(out.unpadded[k])} | pertask ${JSON.stringify(out.pertask[k])} | both seed id ${brief(out.seedmatch[k])}`);
}
console.log('\npadshare', JSON.stringify(out.padshare, null, 0));
console.log('seedmatch dist', JSON.stringify(Object.fromEntries(Object.entries(out.seedmatch).filter(([k]) => k.startsWith('dist_')))));
console.log('runtime tasks', JSON.stringify(rtc), 'top3', JSON.stringify(out.top3));
