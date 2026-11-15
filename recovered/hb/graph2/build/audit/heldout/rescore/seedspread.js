'use strict';
// Seed spread of the paired cluster bootstrap for the interval ends that differed from the grader by
// more than 0.005. 20 seeds x 10,000 resamples, two quantile rules (interpolated, nearest rank).
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const BUILD = path.resolve(process.argv[2]); const OUT = path.join(BUILD, 'audit/heldout/rescore/out');
const refs = new Map();
for (const l of fs.readFileSync(path.join(BUILD, 'sealed/references.jsonl'), 'utf8').split(/\r?\n/)) { if (!l) continue; const r = JSON.parse(l); if (r.split === 'heldout') refs.set(r.id, r); }
const cl = (r) => (r.set === 'T4' ? r.fix_commit : r.set === 'T3' ? r.id : r.commit);
const T = new Map();
for (const l of zlib.gunzipSync(fs.readFileSync(path.join(OUT, 'my_tasks.jsonl.gz'))).toString().split('\n')) { if (!l) continue; const r = JSON.parse(l); if (!T.has(r.key)) T.set(r.key, []); T.get(r.key).push(r); }
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
function cm(key) { const by = new Map(); for (const r of T.get(key)) { const c = cl(refs.get(r.id)); if (!by.has(c)) by.set(c, []); by.get(c).push(r.r8000); } const m = new Map(); for (const [c, v] of by) m.set(c, mean(v)); return m; }
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const cases = [['relational/primary', 'search/primary', 'T3', [0.01, 0.3267]], ['relational/primary', 'floor-dir/primary', 'T3', [0.0767, 0.3833]], ['relational/primary', 'floor-dir/primary', 'T1x', [-0.1638, 0.1417]], ['relational/primary', 'floor-co/primary', 'T3', [0.0367, 0.32]], ['relational/s1', 'floor-dir/primary', 'T1x', [-0.1558, 0.1396]], ['relational/s1', 'floor-co/primary', 'T3', [0.0567, 0.3733]], ['floor-dir/primary', 'search/primary', 'T1x', [-0.1132, 0.1211]],
  ['relational/primary', 'search/primary', 'T1', [0.0363, 0.1176]], ['ladybug/s2', 'relational/primary', 'T1', [-0.0102, 0.0423]], ['ladybug/s2-draw1', 'relational/primary', 'T1', [0.0044, 0.0612]]];
const res = [];
for (const [a, b, set, g] of cases) {
  const A = cm(`${a}/${set}`); const Bm = cm(`${b}/${set}`); const ks = [...A.keys()].sort(); const d = ks.map((k) => A.get(k) - Bm.get(k)); const n = d.length;
  const lo = { i: [], n: [] }; const hi = { i: [], n: [] };
  for (let seed = 1; seed <= 20; seed++) {
    const R = rng(seed * 7919); const bs = new Float64Array(10000);
    for (let k = 0; k < 10000; k++) { let s = 0; for (let i = 0; i < n; i++) s += d[Math.floor(R() * n)]; bs[k] = s / n; }
    const so = Array.from(bs).sort((x, y) => x - y);
    const q = (p) => { const h = (so.length - 1) * p; const l = Math.floor(h); return so[l] + (so[Math.ceil(h)] - so[l]) * (h - l); };
    lo.i.push(q(0.025)); hi.i.push(q(0.975)); lo.n.push(so[Math.ceil(0.025 * 10000) - 1]); hi.n.push(so[Math.ceil(0.975 * 10000) - 1]);
  }
  const rg = (v) => [Math.min(...v), Math.max(...v)].map((x) => Math.round(x * 1e4) / 1e4);
  res.push({ a, b, set, clusters: n, grader: g, lower_interp_range: rg(lo.i), upper_interp_range: rg(hi.i), lower_nearest_range: rg(lo.n), upper_nearest_range: rg(hi.n),
    grader_within_my_seed_range: g[0] >= Math.min(...lo.i, ...lo.n) - 1e-9 && g[0] <= Math.max(...lo.i, ...lo.n) + 1e-9 && g[1] >= Math.min(...hi.i, ...hi.n) - 1e-9 && g[1] <= Math.max(...hi.i, ...hi.n) + 1e-9 });
}
fs.writeFileSync(path.join(OUT, 'seedspread.json'), JSON.stringify(res, null, 1));
for (const r of res) console.log(JSON.stringify(r));
