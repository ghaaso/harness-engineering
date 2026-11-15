'use strict';
// Investigates the mismatches c_trace.js found: (1) tie counts, (2) interval ends beyond 0.005, (3) two 4th-decimal cases,
// (4) share reaching 80 % recall definition.
const L = require('./lib.js');
const { fs, path, B, OUT, mean, clusterMeans, refHO, clusterOf, rowsOf, perTask, quantile } = L;
const out = {};
const cm = (rows, metric, mode, filter) => clusterMeans(rows, metric, (r) => clusterOf(refHO.get(r.id), mode), filter);
// exact rational check of a cluster tie: compare sum of credited units / units per task as fractions
function fracMean(rows) { // returns [num, den] of the mean of per-task fractions cf+cd / units (exact with BigInt)
  let N = 0n; let Dn = 1n;
  for (const r of rows) { const a = BigInt(r.cf8000 + r.cd8000); const b = BigInt(r.units); N = N * b + a * Dn; Dn = Dn * b; }
  return [N, Dn * BigInt(rows.length)];
}
const pairsToCheck = [['lbs2', 'typed', 'T2'], ['lbs2d1', 'typed', 'T1'], ['lbs2d3', 'typed', 'T1'], ['lbs2d4', 'typed', 'T1'], ['s1', 'typed', 'T1'], ['fco', 'typed', 'T2']];
out.ties = [];
for (const [a, b, set] of pairsToCheck) {
  const A = rowsOf(a, set); const Bb = rowsOf(b, set); const byC = (rows) => { const m = new Map(); for (const r of rows) { const c = clusterOf(refHO.get(r.id)); if (!m.has(c)) m.set(c, []); m.get(c).push(r); } return m; };
  const ca = byC(A); const cb = byC(Bb); const near = [];
  for (const [c, ra] of ca) { const rb = cb.get(c); const fa = mean(ra.map((r) => r.r8000)); const fb = mean(rb.map((r) => r.r8000)); const d = fa - fb;
    if (d !== 0 && Math.abs(d) < 1e-9) { const [n1, d1] = fracMean(ra); const [n2, d2] = fracMean(rb); near.push({ cluster: c.slice(0, 10), float_diff: d, exact_equal: n1 * d2 === n2 * d1 }); } }
  out.ties.push({ a, b, set, float_nonzero_but_tiny: near });
}
// interval ends: spread of my bootstrap over 30 seeds, and a 200,000-resample reference
function bootQ(d, seed, n) { const R = L.makeRng(seed); const bs = new Float64Array(n); for (let k = 0; k < n; k++) { let s = 0; for (let i = 0; i < d.length; i++) s += d[Math.floor(R() * d.length)]; bs[k] = s / d.length; } const so = Array.from(bs).sort((x, y) => x - y); const q = (p) => { const h = (so.length - 1) * p; const lo = Math.floor(h); const hi = Math.ceil(h); return so[lo] + (so[hi] - so[lo]) * (h - lo); }; return [q(0.025), q(0.975)]; }
const C = JSON.parse(fs.readFileSync(path.join(OUT, 'c_trace.json'), 'utf8'));
const ciMis = C.mismatches.filter((m) => m.kind === 'ci');
const D = JSON.parse(fs.readFileSync(path.join(B, 'sealed/grader/heldout/v2/data.json'), 'utf8'));
out.ci = [];
const H3 = { typed_vs_search: ['typed', 'search'], typed_vs_search_s2: ['typed', 'search2'], typed_vs_cochange_floor: ['typed', 'fco'], typed_vs_samedir_floor: ['typed', 'fdir'], cochange_floor_vs_search: ['fco', 'search'], lbs2_vs_typed: ['lbs2', 'typed'], s1_vs_typed: ['s1', 'typed'] };
const ARMKEY = { 'relational/primary': 'typed', 'ladybug/s2': 'lbs2', 'relational/s1': 's1', 'search/primary': 'search', 'search/s2': 'search2', 'floor-co/primary': 'fco', 'floor-dir/primary': 'fdir' };
const G = JSON.parse(fs.readFileSync(path.join(B, 'sealed/grader/heldout/comparisons.json'), 'utf8')).comparisons;
const Q = JSON.parse(fs.readFileSync(path.join(OUT, 'a_questions.json'), 'utf8'));
function diffsFor(p) {
  let m;
  if ((m = p.match(/^comparisons\.(rows|descriptive)\[(\d+)\]\.sets\.(\w+)\.(?:(at_2000|at_4000|at_16000|area_under_curve)\.)?ci95\[(\d)\]$/))) {
    const row = D.comparisons[m[1]][+m[2]]; const g = G.find((x) => x.id === row.id); const metric = { at_2000: 'r2000', at_4000: 'r4000', at_16000: 'r16000', area_under_curve: 'auc' }[m[4]] || 'r8000';
    const a = ARMKEY[g.a_arm + '/' + g.a_role] || g.a_arm; const b = ARMKEY[g.b_arm + '/' + g.b_role] || g.b_arm; return { a, b, set: m[3], metric, end: +m[5] };
  }
  if ((m = p.match(/^splits\.comparisons\.(\w+)\.groups\.(\w+)\.ci95\[(\d)\]$/))) return { a: H3[m[1]][0], b: H3[m[1]][1], set: 'T1', metric: 'r8000', group: m[2], end: +m[3] };
  if ((m = p.match(/^t3\.comparisons\.(\w+)\.by_task\.ci95\[(\d)\]$/))) return { a: H3[m[1]][0], b: H3[m[1]][1], set: 'T3', metric: 'r8000', end: +m[2] };
  if ((m = p.match(/^draws\.rows\[0\]\.T3\.ci95\[(\d)\]$/))) return { a: 'lbs2', b: 'typed', set: 'T3', metric: 'r8000', end: +m[1] };
  if ((m = p.match(/^questions\.blocks\.(\w+)\.typed_minus_search_f1\.ci95\[(\d)\]$/))) return { q: m[1], end: +m[2] };
  if ((m = p.match(/^comparisons\.rows\[8\]\.by_block\.(\w+)\.ci95\[(\d)\]$/))) return { q: m[1], end: +m[2] };
  return null;
}
const rtOf = (id) => L.runtimeOf(refHO.get(id).seed.path);
const GF = { web_without_root_task: (r) => rtOf(r.id) === 'web' };
for (const mm of ciMis) {
  const spec = diffsFor(mm.path); if (!spec) { out.ci.push({ path: mm.path, data: mm.data, mine: mm.recomputed, note: 'not re-examined here (tuning split: see e_tuning)' }); continue; }
  let d;
  if (spec.q) { const qa = JSON.parse(fs.readFileSync(path.join(OUT, 'a_questions.json'), 'utf8')); d = null; out.ci.push({ path: mm.path, data: mm.data, mine: mm.recomputed, note: 'question block, see q_spread' }); continue; }
  const A = cm(rowsOf(spec.a, spec.set), spec.metric, null, spec.group ? GF[spec.group] : null); const Bm = cm(rowsOf(spec.b, spec.set), spec.metric, null, spec.group ? GF[spec.group] : null);
  const ks = [...A.keys()].sort(); d = ks.map((k) => A.get(k) - Bm.get(k));
  const ends = []; for (let s = 1; s <= 30; s++) ends.push(bootQ(d, 1000 + s, 10000)[spec.end]);
  const big = bootQ(d, 99, 200000)[spec.end];
  out.ci.push({ path: mm.path, clusters: d.length, data: mm.data, mine: mm.recomputed, seeds30_min: Math.min(...ends), seeds30_max: Math.max(...ends), ref_200k: big, data_inside_30seed_range: mm.data >= Math.min(...ends) - 1e-9 && mm.data <= Math.max(...ends) + 1e-9 });
}
fs.writeFileSync(path.join(OUT, 'd_investigate.json'), JSON.stringify(out, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 1));
console.log(JSON.stringify(out.ties));
for (const c of out.ci) console.log(JSON.stringify(c));
