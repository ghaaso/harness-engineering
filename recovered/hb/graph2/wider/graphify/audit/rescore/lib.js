'use strict';
// REFUTER 1 (graphify step) independent scoring library. Loads nothing from build/arms/ and nothing
// from the graphify grader. Rule `content` (addendum 2 item 2), written from the protocol text.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const S = path.resolve(__dirname, '../../../..'); // .../graph2
const BUILD = path.join(S, 'build');
const G = path.join(S, 'wider/graphify');
const BUDGETS = [2000, 4000, 8000, 16000];

function readGz(f) { return zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)); }
function readJsonl(f) { return fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)); }

let _refs = null;
function refs() {
  if (_refs) return _refs;
  _refs = new Map();
  for (const r of readJsonl(path.join(BUILD, 'sealed/references.jsonl'))) _refs.set(r.id, r);
  return _refs;
}
function clusterOf(ref, mode) {
  if (ref.set === 'T4') return ref.fix_commit;
  if (ref.set === 'T3') return mode === 'parent' ? ref.parent : ref.id;
  return ref.commit;
}
function runtimeOf(p) {
  if (p.startsWith('technician-app/')) return 'mobile';
  if (p.startsWith('backend/')) return 'backend';
  if (!p.includes('/')) return 'root';
  return 'web';
}
function shown(rec, B) {
  const b = rec.budgets[String(B)];
  const paths = new Set(); const lines = new Map();
  const add = (p, ls) => { if (!lines.has(p)) lines.set(p, new Set()); for (const x of ls || []) lines.get(p).add(x); };
  for (let k = 0; k < b.n_full; k++) { const it = rec.items[k]; paths.add(it.path); add(it.path, it.shown); }
  if (b.cut) {
    const it = rec.items[b.n_full];
    if (!it) throw new Error('cut item missing ' + rec.id);
    if (b.cut.path_shown) paths.add(it.path);
    add(it.path, b.cut.shown);
  }
  return { paths, lines, used: b.used, nfull: b.n_full };
}
function credit(s, ref) {
  let f = 0; let d = 0;
  for (const x of ref.files) if (s.paths.has(x.path)) f++;
  for (const x of ref.defs) { const ls = s.lines.get(x.path); if (ls) for (const l of ls) if (l >= x.start && l <= x.end) { d++; break; } }
  return { f, d };
}
function scoreTask(rec, ref) {
  const units = ref.files.length + ref.defs.length;
  const o = { id: rec.id, set: ref.set, units, nF: ref.files.length, nD: ref.defs.length, empty: rec.items.length === 0,
    cluster: clusterOf(ref), parentCluster: clusterOf(ref, 'parent'), rt: runtimeOf(ref.seed.path) };
  for (const B of BUDGETS) {
    const s = shown(rec, B); const c = credit(s, ref);
    o['r' + B] = units ? (c.f + c.d) / units : null;
    o['fr' + B] = ref.files.length ? c.f / ref.files.length : null;
    o['tok' + B] = s.used; o['nfull' + B] = s.nfull;
  }
  return o;
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const median = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
function clusterMeans(rows, key, ckey = 'cluster') {
  const by = new Map();
  for (const r of rows) { if (r[key] == null) continue; if (!by.has(r[ckey])) by.set(r[ckey], []); by.get(r[ckey]).push(r[key]); }
  const m = new Map(); for (const [c, v] of by) m.set(c, mean(v)); return m;
}
function stats(cm) {
  const v = [...cm.values()]; const n = v.length; const m = mean(v);
  const ss = v.reduce((s, x) => s + (x - m) ** 2, 0);
  return { mean: m, se: n > 1 ? Math.sqrt(ss / (n - 1)) / Math.sqrt(n) : null, clusters: n };
}
// my own generator (xorshift32 seeded through splitmix-like mixing); not the grader's
function rng(seed) { let x = (seed * 2654435761) >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
function quant(sorted, q) { const h = (sorted.length - 1) * q; const lo = Math.floor(h); const hi = Math.ceil(h); return sorted[lo] + (sorted[hi] - sorted[lo]) * (h - lo); }
function boot(diffs, seed = 4242, n = 10000) {
  if (diffs.every((x) => x === diffs[0])) return [diffs[0], diffs[0]];
  const k = diffs.length; const R = rng(seed); const bs = new Float64Array(n);
  for (let b = 0; b < n; b++) { let s = 0; for (let i = 0; i < k; i++) s += diffs[Math.floor(R() * k)]; bs[b] = s / k; }
  const so = Array.from(bs).sort((x, y) => x - y);
  return [quant(so, 0.025), quant(so, 0.975)];
}
function paired(rowsA, rowsB, key, ckey = 'cluster', filter = null) {
  const fa = filter ? rowsA.filter(filter) : rowsA; const fb = filter ? rowsB.filter(filter) : rowsB;
  const A = clusterMeans(fa, key, ckey); const Bm = clusterMeans(fb, key, ckey);
  const ks = [...A.keys()].filter((k) => Bm.has(k)).sort();
  if (ks.length !== A.size || ks.length !== Bm.size) throw new Error('cluster sets differ');
  const d = ks.map((k) => A.get(k) - Bm.get(k));
  return { diff: mean(d), ci: boot(d), clusters: ks.length, higher: d.filter((x) => x > 0).length, lower: d.filter((x) => x < 0).length, tied: d.filter((x) => x === 0).length, d, keys: ks };
}
const r4 = (x) => (x == null ? null : Math.round(x * 10000) / 10000);
module.exports = { S, BUILD, G, BUDGETS, readGz, readJsonl, refs, clusterOf, runtimeOf, shown, credit, scoreTask, mean, median, clusterMeans, stats, boot, paired, r4 };
