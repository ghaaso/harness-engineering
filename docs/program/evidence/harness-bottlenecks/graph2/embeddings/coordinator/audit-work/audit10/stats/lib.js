'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const H = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/verify-item27/recompute';
const core = require(H + '/core.js');
const { blake2b } = require(H + '/blake2b.js');
const LANE = core.LANE;
const SEEDS = [1, 2, 3], SCOPES = ['pool', 'unrestricted'], WS = [0.25, 0.5, 1.0];
const METRICS = ['P@10', 'R@10', 'R@20', 'MRR'];

function readCands(sc) {
  const txt = zlib.gunzipSync(fs.readFileSync(path.join(LANE, 'eval/comparators/candidates_' + sc + '.tsv.gz'))).toString('utf8');
  const out = new Map();
  const ls = txt.split('\n');
  for (let i = 1; i < ls.length; i++) { if (!ls[i]) continue; const [t, c] = ls[i].split('\t'); if (!out.has(t)) out.set(t, []); out.get(t).push(c); }
  return out;
}

// numpy-like mean (pairwise not reproduced; differences ~1e-16)
function mean(a) { let s = 0; for (const x of a) s += x; return s / a.length; }

function taskMetrics(ranked, truth) {
  const T = new Set(truth), n = Math.max(T.size, 1);
  let h10 = 0, h20 = 0;
  for (let i = 0; i < Math.min(20, ranked.length); i++) if (T.has(ranked[i])) { if (i < 10) h10++; h20++; }
  let mrr = 0;
  for (let i = 0; i < ranked.length; i++) if (T.has(ranked[i])) { mrr = 1 / (i + 1); break; }
  return [h10 / 10, h10 / n, h20 / n, mrr];
}

function evalTable(table, cands, tasks) {
  const out = new Map();
  for (const t of tasks) {
    const cl = cands.get(t.task_id) || [];
    out.set(t.task_id, taskMetrics(core.rank(t.task_id, cl, table.get(t.task_id) || new Map()), t.truth));
  }
  return out;
}
function meanSeeds(list) {
  const out = new Map();
  for (const k of list[0].keys()) out.set(k, [0, 1, 2, 3].map(m => mean(list.map(pt => pt.get(k)[m]))));
  return out;
}
// per commit: returns {commits, arr: [n][4]}
function perCommit(pt, tasks, commitSet) {
  const by = new Map(), ord = new Map();
  for (const t of tasks) {
    if (commitSet && !commitSet.has(t.commit)) continue;
    if (!by.has(t.commit)) by.set(t.commit, []);
    by.get(t.commit).push(pt.get(t.task_id)); ord.set(t.commit, t.date_order);
  }
  const cs = [...by.keys()].sort((a, b) => ord.get(a) - ord.get(b));
  return { commits: cs, arr: cs.map(c => [0, 1, 2, 3].map(m => mean(by.get(c).map(v => v[m])))) };
}
function summary(pt, tasks, cs) { const { arr } = perCommit(pt, tasks, cs); return [0, 1, 2, 3].map(m => mean(arr.map(r => r[m]))); }

// RNG: xoshiro128** seeded via splitmix32
function rng(seed) {
  let s = [0, 0, 0, 0]; let x = seed >>> 0;
  const sm = () => { x = (x + 0x9e3779b9) >>> 0; let z = x; z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0; z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0; return (z ^ (z >>> 16)) >>> 0; };
  s = [sm(), sm(), sm(), sm()];
  return () => {
    const r = Math.imul(((Math.imul(s[1], 5) << 7) | (Math.imul(s[1], 5) >>> 25)), 9) >>> 0;
    const t = s[1] << 9;
    s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3]; s[2] ^= t; s[3] = (s[3] << 11) | (s[3] >>> 21);
    return r / 4294967296;
  };
}
const idxCache = new Map();
function indices(n, B, seed) {
  const k = n + ':' + B + ':' + seed;
  if (idxCache.has(k)) return idxCache.get(k);
  const r = rng(seed); const I = new Int32Array(n * B);
  for (let i = 0; i < n * B; i++) I[i] = Math.floor(r() * n);
  idxCache.set(k, I); return I;
}
function percentile(sorted, q) { const pos = q / 100 * (sorted.length - 1); const lo = Math.floor(pos), hi = Math.ceil(pos); return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo); }
// bootstrap over rows of a 1-D array v; returns [mean, lo, hi, p]
function bootstrap(v, B = 10000, seed = 1, level = 0.95) {
  const n = v.length, I = indices(n, B, seed); const means = new Float64Array(B);
  for (let b = 0; b < B; b++) { let s = 0; const o = b * n; for (let i = 0; i < n; i++) s += v[I[o + i]]; means[b] = s / n; }
  let le = 0, ge = 0; for (const m of means) { if (m <= 0) le++; if (m >= 0) ge++; }
  const p = Math.min(1, 2 * Math.min(le / B, ge / B));
  const srt = Float64Array.from(means).sort(); const a = (1 - level) / 2;
  return [mean(v), percentile(srt, 100 * a), percentile(srt, 100 * (1 - a)), p];
}
function verdict(d, lo, hi) {
  const r = x => Math.round(x * 1e12) / 1e12; d = r(d); lo = r(lo); hi = r(hi);
  if (lo > 0 && d >= 0.02) return 'adds';
  if (lo >= -0.02 && hi <= 0.02) return 'matches';
  if (hi < 0) return 'cannot tell (lower)';
  return 'cannot tell';
}
function holm(ps) {
  const m = ps.length, order = ps.map((p, i) => i).sort((a, b) => ps[a] - ps[b] || a - b);
  const adj = new Array(m); let run = 0;
  order.forEach((i, r) => { run = Math.max(run, Math.min(1, (m - r) * ps[i])); adj[i] = run; });
  return { adj, order };
}
function placebo(seed, tid, cands, cfg) {
  const m = new Map();
  for (const c of cands) {
    const h = blake2b(Buffer.from('placebo|' + cfg + '|' + seed + '|' + tid + '|' + c, 'utf8'), 8);
    let n = 0n; for (const b of h) n = (n << 8n) | BigInt(b);
    m.set(c, Number(n) / 2 ** 64);
  }
  return m;
}
function writeJson(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 1)); }
module.exports = { core, LANE, SEEDS, SCOPES, WS, METRICS, readCands, mean, taskMetrics, evalTable, meanSeeds, perCommit, summary, bootstrap, verdict, holm, placebo, writeJson, path, fs };
