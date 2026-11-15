'use strict';
// TUNING-SET PREVIEW (optimistic: the configurations were selected on these same TUNE tasks).
// Paired cluster bootstrap over commits (arms/common/compare.js, 10,000 resamples, seed 20261112) of the
// frozen configurations, on T1, T1x and T2 TUNE, for the pairs of addendum 3 items 13 to 15:
//   each graph arm - relational; the H1 graph arm and relational, each - search, floor-dir, floor-co.
// Metrics: primary (recall at 8,000 tokens), r2000, auc, plus r4000, r16000 and matched for context.
//   node preview.js   -> stage2/preview.json
const fs = require('fs');
const path = require('path');
const B = path.resolve(__dirname, '..', '..', '..');
const S = require(path.join(B, 'arms', 'common', 'score'));
const CMP = require(path.join(B, 'arms', 'common', 'compare'));
const sel = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'selection.json'), 'utf8'));
const refs = S.readRefs(path.join(__dirname, '..', 'refs_tune.jsonl'));
const SETS = ['T1', 'T1x', 'T2'];
const GRAPH = ['ladybug', 'duckpgq'];
const fz = Object.fromEntries(Object.entries(sel.arms).map(([a, v]) => [a, v.chosen]));
// H1 graph arm: higher frozen T1 TUNE primary; tie: lower median tokens; then ladybug
const h1 = [...GRAPH].sort((a, b) => fz[b].T1_primary - fz[a].T1_primary || fz[a].T1_median_tokens - fz[b].T1_median_tokens || (a === 'ladybug' ? -1 : 1))[0];
const pairs = [['ladybug', 'relational'], ['duckpgq', 'relational']];
for (const a of [h1, 'relational']) for (const b of ['search', 'floor-dir', 'floor-co']) pairs.push([a, b]);
const file = (arm, s) => path.join(B, 'results', arm, 'tune', fz[arm].config_hash + '.' + s + '.jsonl.gz');
const out = { label: 'TUNING-SET PREVIEW, OPTIMISTIC: every configuration was selected on these TUNE tasks; not a held-out result.', h1_graph_arm: h1,
  h1_rule: 'graph arm whose frozen configuration has the higher T1 TUNE primary; tie: lower median tokens, then ladybug',
  frozen: Object.fromEntries(Object.entries(fz).map(([a, c]) => [a, { name: c.name, hash: c.config_hash, T1_primary: c.T1_primary, T1_median_tokens: c.T1_median_tokens }])),
  resamples: 10000, seed: 20261112, comparisons: [] };
const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
for (const [a, b] of pairs) for (const s of SETS) {
  const r = CMP.compare(file(a, s), file(b, s), refs, { rule: 'content', resamples: 10000, seed: 20261112, metrics: ['primary', 'r2000', 'r4000', 'r16000', 'auc', 'matched'] });
  const m = {};
  for (const [k, v] of Object.entries(r.metrics)) m[k] = { mean_a: r4(v.mean_a), mean_b: r4(v.mean_b), diff: r4(v.diff), ci95: v.ci95 && v.ci95.map(r4), excludes_zero: v.excludes_zero, p_signflip: v.p_signflip && r4(v.p_signflip), wins: v.wins, losses: v.losses, ties: v.ties, clusters: v.clusters, ...(k === 'matched' ? { tokens: v.tokens } : {}) };
  out.comparisons.push({ a, b, set: s, a_config: fz[a].name, b_config: fz[b].name, metrics: m });
  const p = m.primary;
  console.log(`${a} - ${b} ${s}: primary ${p.mean_a} vs ${p.mean_b} diff ${p.diff} [${p.ci95}] w/l/t ${p.wins}/${p.losses}/${p.ties}; r2k diff ${m.r2000.diff} [${m.r2000.ci95}]; auc diff ${m.auc.diff} [${m.auc.ci95}]`);
}
fs.writeFileSync(path.join(__dirname, 'preview.json'), JSON.stringify(out, null, 1));
