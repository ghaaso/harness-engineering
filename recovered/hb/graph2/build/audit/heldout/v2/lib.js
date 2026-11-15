'use strict';
// v2 auditor: shared helpers. Written independently of the grader's recompute.js / compare.js.
// Per-task held-out scores come from the re-scorer's independent output (audit/heldout/rescore/out/my_tasks.jsonl.gz),
// which imports nothing from arms/. The bootstrap below is my own (xorshift128+ style generator, my own seed).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const B = path.resolve(__dirname, '../../..'); // build/
const OUT = __dirname;
const gz = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const jl = (f) => fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);

// my generator: sfc32 seeded by splitmix32 (different from the grader's mulberry32 and the refuters')
function makeRng(seed) {
  let s = seed >>> 0;
  const sm = () => { s = (s + 0x9e3779b9) >>> 0; let z = s; z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0; z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0; return (z ^ (z >>> 16)) >>> 0; };
  let a = sm(), b = sm(), c = sm(), d = sm();
  return () => { a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; let t = (a + b) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11); d = (d + 1) | 0; t = (t + d) | 0; c = (c + t) | 0; return (t >>> 0) / 4294967296; };
}
const SEED = 4242; const NBOOT = 10000;
function quantile(sorted, q) { const h = (sorted.length - 1) * q; const lo = Math.floor(h); const hi = Math.ceil(h); return sorted[lo] + (sorted[hi] - sorted[lo]) * (h - lo); }
function bootMean(diffs, seed = SEED) {
  const n = diffs.length; if (!n) return null;
  if (diffs.every((x) => Math.abs(x) < 1e-12)) return [0, 0];
  const R = makeRng(seed); const bs = new Float64Array(NBOOT);
  for (let b = 0; b < NBOOT; b++) { let s = 0; for (let i = 0; i < n; i++) s += diffs[Math.floor(R() * n)]; bs[b] = s / n; }
  const so = Array.from(bs).sort((x, y) => x - y);
  return [quantile(so, 0.025), quantile(so, 0.975)];
}
// paired comparison of two Map(cluster -> value)
function paired(ma, mb, opts = {}) {
  const ks = [...ma.keys()].filter((k) => mb.has(k) && !(opts.drop || []).includes(k)).sort();
  const kb = [...mb.keys()].filter((k) => !(opts.drop || []).includes(k));
  if (ks.length !== kb.length) throw new Error('cluster sets differ');
  const d = ks.map((k) => ma.get(k) - mb.get(k));
  const ci = bootMean(d);
  return { n: ks.length, mean_a: mean(ks.map((k) => ma.get(k))), mean_b: mean(ks.map((k) => mb.get(k))), diff: mean(d), ci95: ci,
    a_higher: d.filter((x) => x > 1e-12).length, b_higher: d.filter((x) => x < -1e-12).length, ties: d.filter((x) => Math.abs(x) <= 1e-12).length, diffs: d, keys: ks };
}
function clusterMeans(rows, metric, keyOf, filter) {
  const g = new Map();
  for (const r of rows) { if (filter && !filter(r)) continue; const v = r[metric]; if (v == null) continue; const k = keyOf(r); if (!g.has(k)) g.set(k, []); g.get(k).push(v); }
  const m = new Map(); for (const [k, v] of g) m.set(k, mean(v)); return m;
}

// ---------- inputs ----------
const refsAll = jl(path.join(B, 'sealed/references.jsonl'));
const refHO = new Map(refsAll.filter((r) => r.split === 'heldout').map((r) => [r.id, r]));
const refTU = new Map(refsAll.filter((r) => r.split !== 'heldout').map((r) => [r.id, r]));
function clusterOf(ref, mode) {
  if (ref.set === 'T4') return ref.fix_commit;
  if (ref.set === 'T3') { if (mode === 'parent') return ref.parent; if (mode === 'parentdoc') return ref.parent + '|' + ref.doc; return ref.id; }
  return ref.commit;
}
let _per = null;
function perTask() { // key arm/role/set -> rows (re-scorer's independent per-task values)
  if (_per) return _per; _per = new Map();
  for (const r of gz(path.join(B, 'audit/heldout/rescore/out/my_tasks.jsonl.gz'))) { if (!_per.has(r.key)) _per.set(r.key, []); _per.get(r.key).push(r); }
  return _per;
}
const ARMS = { typed: 'relational/primary', ladybug: 'ladybug/primary', duckpgq: 'duckpgq/primary', s1: 'relational/s1', lbs2: 'ladybug/s2', lbs2d1: 'ladybug/s2-draw1', lbs2d2: 'ladybug/s2-draw2', lbs2d3: 'ladybug/s2-draw3', lbs2d4: 'ladybug/s2-draw4', search: 'search/primary', search2: 'search/s2', fdir: 'floor-dir/primary', fco: 'floor-co/primary' };
const rowsOf = (k, set) => perTask().get(ARMS[k] + '/' + set);
const ansCache = new Map();
function answers(k, set) { const key = k + set; if (!ansCache.has(key)) ansCache.set(key, new Map(gz(path.join(B, 'results/heldout', ARMS[k], set + '.jsonl.gz')).map((a) => [a.id, a]))); return ansCache.get(key); }
const runtimeOf = (p) => (p.startsWith('technician-app/') ? 'mobile' : p.startsWith('backend/') ? 'backend' : p.startsWith('src/') ? 'web' : 'root');

// ---------- scoring of one answer record (rule `content`), my own copy ----------
function shownItems(rec, Bdg, keep) {
  const b = rec.budgets[String(Bdg)]; const paths = new Set(); const lines = new Map();
  const add = (p, ls) => { if (!lines.has(p)) lines.set(p, new Set()); for (const x of ls || []) lines.get(p).add(x); };
  for (let k = 0; k < b.n_full; k++) { const it = rec.items[k]; if (keep && !keep(it)) continue; paths.add(it.path); add(it.path, it.shown); }
  if (b.cut) { const it = rec.items[b.n_full]; if (!keep || keep(it, b.cut)) { if (b.cut.path_shown) paths.add(it.path); add(it.path, b.cut.shown); } }
  return { paths, lines };
}
function creditUnits(s, ref) {
  let f = 0; let d = 0;
  for (const x of ref.files) if (s.paths.has(x.path)) f++;
  for (const x of ref.defs) { const ls = s.lines.get(x.path); if (ls) { for (const l of ls) if (l >= x.start && l <= x.end) { d++; break; } } }
  return f + d;
}

module.exports = { fs, path, zlib, B, OUT, gz, jl, mean, median, r4, bootMean, paired, clusterMeans, refHO, refTU, clusterOf, perTask, ARMS, rowsOf, answers, runtimeOf, shownItems, creditUnits, makeRng };
