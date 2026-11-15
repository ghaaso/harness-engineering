'use strict';
// Refuter 2 (claims) recheck. Reads only; writes recheck.json next to this file.
// 1. Re-scores graphify and typed T1 with build/arms/common/score.js and compares with the grader's per-task file.
// 2. Per-commit paired bootstrap on several metrics (packer-free ranking metrics included).
// 3. Drop-five sensitivity in BOTH directions for G-1..G-4, on all T1 and on seed-location groups.
// 4. Packer interaction: files shown and tokens per shown file at 8,000 tokens; size of graphify's first files.
const fs = require('fs'); const zlib = require('zlib'); const path = require('path');
const ROOT = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2';
const B = ROOT + '/build'; const G = ROOT + '/wider/graphify';
const S = require(B + '/arms/common/score.js');
const readGz = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const out = {};

// tasks and seed location
const tasks = new Map(fs.readFileSync(B + '/tasks/tasks.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).map((t) => [t.id, t]));
const loc = (id) => { const p = tasks.get(id).seed.path; return p.startsWith('technician-app/') ? 'mobile' : p.startsWith('backend/') ? 'backend' : 'web'; };

// grader per-task values
const per = readGz(G + '/grader/heldout/tasks.jsonl.gz');
const ARMS = ['graphify', 'relational', 'search', 'floor-co', 'floor-dir'];
const val = {}; // arm -> set -> id -> row
for (const r of per) { ((val[r.arm] = val[r.arm] || {})[r.set] = val[r.arm][r.set] || {})[r.id] = r; }

// 1. re-score check
const refs = S.readRefs(B + '/sealed/references.jsonl');
const files = { graphify: G + '/answers/heldout/66367cd303fdd75b.T1.jsonl.gz', relational: B + '/results/heldout/relational/primary/T1.jsonl.gz', search: B + '/results/heldout/search/primary/T1.jsonl.gz' };
out.rescore = {};
for (const [arm, f] of Object.entries(files)) {
  let n = 0, diff = 0, maxd = 0;
  for (const a of readGz(f)) {
    const ref = refs.get ? refs.get(a.id) : refs[a.id];
    const s = S.scoreAnswer(a, ref, { rule: 'content' });
    const g = val[arm].T1[a.id];
    const d = Math.abs((s.primary != null ? s.primary : s.r8000) - g.primary); n++; if (d > 1e-9) diff++; if (d > maxd) maxd = d;
  }
  out.rescore[arm] = { tasks: n, differing: diff, max_abs_diff: maxd };
}

// bootstrap helpers (same generator as compare.js)
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function boot(d, n = 10000, seed = 20261112) { const r = mulberry32(seed); const k = d.length; const m = new Float64Array(n); for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < k; j++) s += d[Math.floor(r() * k)]; m[i] = s / k; } m.sort(); return [m[Math.floor(0.025 * n)], m[Math.ceil(0.975 * n) - 1]]; }
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const r4 = (x) => Math.round(x * 10000) / 10000;

// per-commit values for an arm, set, metric, optional task filter
function perCommit(arm, set, metric, filt) {
  const by = new Map();
  for (const [id, r] of Object.entries(val[arm][set])) { if (filt && !filt(id)) continue; const v = r[metric]; if (v == null) continue; if (!by.has(r.cluster)) by.set(r.cluster, []); by.get(r.cluster).push(v); }
  return new Map([...by].map(([k, xs]) => [k, mean(xs)]));
}
function paired(a, b, set, metric, filt) {
  const va = perCommit(a, set, metric, filt), vb = perCommit(b, set, metric, filt);
  const keys = [...va.keys()].filter((k) => vb.has(k)).sort();
  const d = keys.map((k) => va.get(k) - vb.get(k));
  const ci = boot(d);
  return { commits: keys.length, a: r4(mean(keys.map((k) => va.get(k)))), b: r4(mean(keys.map((k) => vb.get(k)))), diff: r4(mean(d)), ci95: ci.map(r4), d, keys };
}
function dropFive(p, dir) { // dir +1: drop five largest diffs (most favourable to graphify); -1: drop five smallest (most favourable to comparator)
  const d = [...p.d].sort((x, y) => x - y); const kept = dir > 0 ? d.slice(0, d.length - 5) : d.slice(5);
  return { commits: kept.length, diff: r4(mean(kept)), ci95: boot(kept).map(r4) };
}

// 2 + 3
out.t1 = {}; const comps = { 'G-1': 'relational', 'G-2': 'search', 'G-3': 'floor-co', 'G-4': 'floor-dir' };
const groups = { all: null, mobile: (id) => loc(id) === 'mobile', backend: (id) => loc(id) === 'backend', web: (id) => loc(id) === 'web' };
for (const [gname, filt] of Object.entries(groups)) {
  out.t1[gname] = {};
  for (const [cid, arm] of Object.entries(comps)) {
    const row = {};
    for (const m of ['primary', 'r2000', 'r4000', 'r16000', 'file_r10', 'ndcg10', 'mrr']) {
      const p = paired('graphify', arm, 'T1', m, filt);
      row[m] = { commits: p.commits, graphify: p.a, other: p.b, diff: p.diff, ci95: p.ci95 };
      if (m === 'primary') { row.primary.drop5_fav_graphify = dropFive(p, +1); row.primary.drop5_fav_other = dropFive(p, -1); row.primary.graphify_higher = p.d.filter((x) => x > 0).length; row.primary.other_higher = p.d.filter((x) => x < 0).length; }
    }
    out.t1[gname][cid] = row;
  }
}
// T2/T3 signs on packer-free metrics
out.t2t3 = {};
for (const set of ['T2', 'T3']) { out.t2t3[set] = {}; for (const [cid, arm] of Object.entries(comps)) { out.t2t3[set][cid] = {}; for (const m of ['primary', 'file_r10', 'ndcg10']) { const p = paired('graphify', arm, set, m); out.t2t3[set][cid][m] = { diff: p.diff, ci95: p.ci95 }; } } }

// 4. packer interaction on T1 at 8,000 tokens
function shownStats(f) {
  const nf = [], tokPer = [], firstTok = [];
  for (const a of readGz(f)) {
    const b = a.budgets ? a.budgets['8000'] || a.budgets[8000] : null;
    const items = a.items || [];
    // whole items within 8,000 tokens in order
    const k = b ? b.n_full : 0; let cum = 0;
    for (let i = 0; i < k; i++) cum += items[i].tok || 0;
    nf.push(k); if (k) tokPer.push(cum / k); if (items.length) firstTok.push(items.slice(0, 3).reduce((s, it) => s + (it.tok || 0), 0));
  }
  const med = (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
  return { tasks: nf.length, median_whole_items_in_8000: med(nf), median_tokens_per_shown_item: Math.round(med(tokPer)), median_tokens_first_three_items: med(firstTok) };
}
out.packer = { graphify: shownStats(files.graphify), relational: shownStats(files.relational), search: shownStats(files.search) };

fs.writeFileSync(path.join(__dirname, 'recheck.json'), JSON.stringify(out, (k, v) => (k === 'd' || k === 'keys' ? undefined : v), 1));
console.log(JSON.stringify(out.rescore), JSON.stringify(out.packer));
