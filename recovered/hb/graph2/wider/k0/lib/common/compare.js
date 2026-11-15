'use strict';
// Paired comparison of two answer files (protocol section 7): the commit (cluster) is the unit.
//   node compare.js --a <answers A .jsonl.gz> --b <answers B .jsonl.gz> --refs <references.jsonl>
//                   [--metric primary,r2000,...,matched] [--rule content|locate] [--seed 20261112]
//                   [--resamples 10000] [--out compare.json]
// For each metric: per-cluster values of A and B (score.js), restricted to clusters both have; the mean
// difference A - B; a paired cluster bootstrap (resample clusters with replacement, 10,000 times, a
// seeded mulberry32 generator) with its 95 % percentile interval; and a sign-flip permutation test
// (10,000 random sign vectors, same generator, two-sided p = (count |mean*| >= |mean| + 1) / (N + 1)).
// "matched": recall at matched tokens: T = the smaller of the two arms' median tokens used at the
// 8,000 budget; each task's recall from whole items whose cumulative tokens are <= T (score.js grid,
// rounded down to the 500-token grid).
const fs = require('fs');
const S = require('./score');

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bootstrap(diffs, n, seed) {
  const rnd = mulberry32(seed); const k = diffs.length; const means = new Float64Array(n);
  for (let r = 0; r < n; r++) { let s = 0; for (let i = 0; i < k; i++) s += diffs[Math.floor(rnd() * k)]; means[r] = s / k; }
  means.sort();
  return { lo: means[Math.floor(0.025 * n)], hi: means[Math.min(n - 1, Math.ceil(0.975 * n) - 1)] };
}
function signFlip(diffs, n, seed) {
  const rnd = mulberry32(seed ^ 0x9e3779b9); const k = diffs.length;
  const obs = Math.abs(diffs.reduce((x, y) => x + y, 0) / k); let c = 0;
  for (let r = 0; r < n; r++) { let s = 0; for (let i = 0; i < k; i++) s += rnd() < 0.5 ? -diffs[i] : diffs[i]; if (Math.abs(s / k) >= obs - 1e-15) c++; }
  return (c + 1) / (n + 1);
}

function pairedStats(va, vb, n, seed) {
  const keys = [...va.keys()].filter((k) => vb.has(k) && va.get(k) != null && vb.get(k) != null).sort();
  const d = keys.map((k) => va.get(k) - vb.get(k));
  if (!d.length) return { clusters: 0 };
  const m = d.reduce((x, y) => x + y, 0) / d.length;
  const ci = bootstrap(d, n, seed);
  return { clusters: d.length, mean_a: S.mean(keys.map((k) => va.get(k))), mean_b: S.mean(keys.map((k) => vb.get(k))), diff: m, se: S.seOf(d),
    ci95: [ci.lo, ci.hi], excludes_zero: ci.lo > 0 || ci.hi < 0, p_signflip: signFlip(d, n, seed), wins: d.filter((x) => x > 0).length, losses: d.filter((x) => x < 0).length, ties: d.filter((x) => x === 0).length };
}

function compare(fileA, fileB, refs, opts = {}) {
  const n = opts.resamples || 10000; const seed = opts.seed == null ? 20261112 : opts.seed;
  const [sa] = S.scoreFile(fileA, refs, opts); const [sb] = S.scoreFile(fileB, refs, opts);
  if (!sa || !sb) throw new Error('an answer file scored nothing');
  const out = { a: { file: fileA, arm: sa.arm, config: sa.config_name || sa.config_hash, set: sa.set, split: sa.split }, b: { file: fileB, arm: sb.arm, config: sb.config_name || sb.config_hash, set: sb.set, split: sb.split }, resamples: n, seed, metrics: {} };
  const metrics = opts.metrics || ['primary', 'r2000', 'r4000', 'r16000', 'auc', 'def_r8000', 'unpad_r8000', 'file_r10', 'ndcg10', 'mrr', 't80c', 'matched'];
  for (const m of metrics) {
    if (m === 'matched') {
      const T = Math.min(sa.metrics.tok8000.median_over_tasks, sb.metrics.tok8000.median_over_tasks);
      const gi = Math.max(0, Math.min(S.GRID.length - 1, Math.floor(T / 500) - 1));
      const va = new Map(sa._rows.map((r) => [r.cluster, r.grid[gi]])); const vb = new Map(sb._rows.map((r) => [r.cluster, r.grid[gi]]));
      out.metrics.matched = { tokens: S.GRID[gi], median_tok8000_a: sa.metrics.tok8000.median_over_tasks, median_tok8000_b: sb.metrics.tok8000.median_over_tasks, ...pairedStats(va, vb, n, seed) };
      continue;
    }
    const va = new Map(sa._rows.map((r) => [r.cluster, r[m]])); const vb = new Map(sb._rows.map((r) => [r.cluster, r[m]]));
    out.metrics[m] = pairedStats(va, vb, n, seed);
  }
  return out;
}

function main() {
  const a = process.argv.slice(2); const o = { rule: 'content' };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--a') o.a = a[++i]; else if (a[i] === '--b') o.b = a[++i]; else if (a[i] === '--refs') o.refs = a[++i];
    else if (a[i] === '--metric') o.metrics = a[++i].split(','); else if (a[i] === '--rule') o.rule = a[++i];
    else if (a[i] === '--seed') o.seed = Number(a[++i]); else if (a[i] === '--resamples') o.resamples = Number(a[++i]);
    else if (a[i] === '--out') o.out = a[++i]; else throw new Error('unknown argument ' + a[i]);
  }
  if (!o.a || !o.b || !o.refs) throw new Error('usage: compare.js --a <gz> --b <gz> --refs <jsonl>');
  const r = compare(o.a, o.b, S.readRefs(o.refs), o);
  if (o.out) fs.writeFileSync(o.out, JSON.stringify(r, null, 1));
  console.log(JSON.stringify(r, null, 1));
}

if (require.main === module) main();
module.exports = { compare, bootstrap, signFlip, pairedStats, mulberry32 };
