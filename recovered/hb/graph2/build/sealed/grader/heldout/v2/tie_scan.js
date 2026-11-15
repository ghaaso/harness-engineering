// tie_scan.js - written while applying the independent check (2026-11-13).
// Finds every paired cluster whose two means differ by more than 0 but at most 1e-12
// (a floating-point artefact of averaging the same task scores in a different order),
// over every arm pair, set, metric, runtime group and T3 clustering that data.json uses.
// Output: tie_scan.json. Reads only sealed/grader/heldout inputs; writes only into v2/.
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const V2 = __dirname; const HO = path.join(V2, '..');
const gz = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const jl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const TOL = 1e-12;
const per = new Map();
for (const t of gz(path.join(HO, 'tasks.jsonl.gz'))) { const k = [t.arm, t.role, t.set].join('|'); if (!per.has(k)) per.set(k, []); per.get(k).push(t); }
const refRaw = new Map(jl(path.join(HO, 'refs_heldout.jsonl')).map((r) => [r.id, r]));
const ARMS = { typed: ['relational', 'primary'], ladybug: ['ladybug', 'primary'], duckpgq: ['duckpgq', 'primary'], s1: ['relational', 's1'], lbs2: ['ladybug', 's2'], lbs2d1: ['ladybug', 's2-draw1'], lbs2d2: ['ladybug', 's2-draw2'], lbs2d3: ['ladybug', 's2-draw3'], lbs2d4: ['ladybug', 's2-draw4'], search: ['search', 'primary'], search2: ['search', 's2'], fdir: ['floor-dir', 'primary'], fco: ['floor-co', 'primary'] };
const rows = (k, set) => per.get([...ARMS[k], set].join('|')) || [];
const runtimeOf = (p) => (p.startsWith('technician-app/') ? 'mobile' : p.startsWith('backend/') ? 'backend' : p.startsWith('src/') ? 'web' : 'root');
const rt = (t) => runtimeOf(refRaw.get(t.id).seed.path);
const FILTERS = { all: null, mobile: (t) => rt(t) === 'mobile', backend: (t) => rt(t) === 'backend', web_without_root_task: (t) => rt(t) === 'web', web_with_root_task: (t) => ['web', 'root'].includes(rt(t)), not_mobile: (t) => rt(t) !== 'mobile' };
const KEYS = { cluster: null, by_parent_commit: (t) => refRaw.get(t.id).parent, by_parent_and_document: (t) => refRaw.get(t.id).parent + '|' + refRaw.get(t.id).doc };
const METRICS = ['primary', 'r2000', 'r4000', 'r8000', 'r16000', 'auc'];
function cm(rs, metric, filter, keyOf) {
  const g = new Map();
  for (const t of rs) { if (filter && !filter(t)) continue; const v = t[metric]; if (v == null) continue; const c = keyOf ? keyOf(t) : t.cluster; if (!g.has(c)) g.set(c, []); g.get(c).push(v); }
  return new Map([...g].map(([c, v]) => [c, mean(v)]));
}
const out = { tolerance: TOL, near_ties: [] };
const names = Object.keys(ARMS);
for (let i = 0; i < names.length; i++) for (let j = 0; j < names.length; j++) {
  if (i === j) continue; const a = names[i]; const b = names[j];
  if (i > j) continue; // report each unordered pair once; sign flips with order
  for (const set of ['T1', 'T2', 'T3']) for (const metric of METRICS) for (const [fn, f] of Object.entries(FILTERS)) for (const [kn, k] of Object.entries(KEYS)) {
    if (set !== 'T1' && fn !== 'all') continue; if (set !== 'T3' && kn !== 'cluster') continue;
    const ma = cm(rows(a, set), metric, f, k); const mb = cm(rows(b, set), metric, f, k);
    for (const [c, va] of ma) { if (!mb.has(c)) continue; const d = va - mb.get(c); if (d !== 0 && Math.abs(d) <= TOL) out.near_ties.push({ a, b, set, metric, filter: fn, key: kn, cluster: c, d_a_minus_b: d }); }
  }
}
// T3 by task (keyOf = id)
for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) for (const metric of METRICS) {
  const a = names[i]; const b = names[j]; const ma = cm(rows(a, 'T3'), metric, null, (t) => t.id); const mb = cm(rows(b, 'T3'), metric, null, (t) => t.id);
  for (const [c, va] of ma) { if (!mb.has(c)) continue; const d = va - mb.get(c); if (d !== 0 && Math.abs(d) <= TOL) out.near_ties.push({ a, b, set: 'T3', metric, filter: 'all', key: 'by_task', cluster: c, d_a_minus_b: d }); }
}
fs.writeFileSync(path.join(V2, 'tie_scan.json'), JSON.stringify(out, null, 1));
console.log('near ties found:', out.near_ties.length);
for (const n of out.near_ties) console.log(n.a, n.b, n.set, n.metric, n.filter, n.key, n.cluster.slice(0, 10), n.d_a_minus_b);
