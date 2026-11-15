'use strict';
// HELD-OUT scoring, step 1: score every held-out answer file of PLAN.json with arms/common/score.js
// (rule content) against the held-out lines of sealed/references.jsonl (T1, T1x, T2, T3, T4; T5 was not run).
// Same code as on TUNE (stage2/score_arm2.js), plus the median lookups, the median tokens to 80 % where
// reached, and the TUNE primary of the same configuration beside each row.
// Writes (sealed/grader/heldout/): refs_heldout.jsonl, scores.json, clusters.jsonl, tasks.jsonl.gz.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const B = path.resolve(__dirname, '..', '..', '..');
const S = require(path.join(B, 'arms', 'common', 'score'));
const H = require(path.join(B, 'arms', 'common', 'harness'));
const OUT = __dirname;
const plan = JSON.parse(fs.readFileSync(path.join(B, 'results/frozen/PLAN.json'), 'utf8'));
const SETS = ['T1', 'T1x', 'T2', 'T3', 'T4'];
// held-out references
const refLines = fs.readFileSync(path.join(B, 'sealed/references.jsonl'), 'utf8').split('\n').filter(Boolean)
  .filter((l) => { const r = JSON.parse(l); return r.split === 'heldout' && SETS.includes(r.set); });
fs.writeFileSync(path.join(OUT, 'refs_heldout.jsonl'), refLines.join('\n') + '\n');
const refs = S.readRefs(path.join(OUT, 'refs_heldout.jsonl'));
// TUNE primaries of the frozen configurations (stage summaries)
const tune = {};
for (const st of ['stage1', 'stage2']) for (const a of ['relational', 'ladybug', 'duckpgq', 'search', 'floor-dir', 'floor-co']) {
  const f = path.join(__dirname, '..', st, a + '.summary.json'); if (!fs.existsSync(f)) continue;
  for (const e of JSON.parse(fs.readFileSync(f, 'utf8'))) tune[[a, e.config_hash, e.set].join('|')] = { primary: e.metrics.primary.mean, se: e.metrics.primary.se, r2000: e.metrics.r2000.mean, auc: e.metrics.auc.mean, clusters: e.clusters, tasks: e.tasks };
}
const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
const rows = []; const clusters = []; const per = [];
for (const p of plan.runs) {
  if (p.arm === 'reference') continue; // cross-check only, not scored (addendum 4 item 5)
  const f = path.join(B, p.out);
  const res = S.scoreFile(f, refs, { rule: 'content' });
  if (res.length !== 1) throw new Error(f + ': ' + res.length + ' groups');
  const g = res[0];
  const answers = H.readGzJsonl(f);
  const roleKey = p.role + (p.draw ? '-draw' + p.draw : '');
  const key = { arm: p.arm, role: roleKey, draw: p.draw || 0, config_hash: p.hash, config_name: p.config_name, set: p.set };
  for (const r of g._rows) clusters.push({ ...key, ...r });
  for (const t of g._per) per.push({ ...key, ...t });
  const t80reached = g._per.filter((t) => t.t80 != null).map((t) => t.t80);
  const m = g.metrics;
  const tu = tune[[p.arm, p.hash, p.set].join('|')] || null;
  rows.push({ ...key, tasks: g.tasks, clusters: g.clusters, missing_refs: g.missing_refs, zero_unit_refs: g.zero_unit_refs,
    primary: r4(m.primary.mean), primary_se: r4(m.primary.se), r2000: r4(m.r2000.mean), r4000: r4(m.r4000.mean), r8000: r4(m.r8000.mean), r16000: r4(m.r16000.mean),
    auc: r4(m.auc.mean), def_r8000: r4(m.def_r8000.mean), file_r8000: r4(m.file_r8000.mean), unpad_r8000: r4(m.unpad_r8000.mean), precision8000: r4(m.precision8000.mean),
    median_tokens_8000: m.tok8000.median_over_tasks, mean_tokens_8000: r4(m.tok8000.mean),
    median_lookups: S.median(answers.map((a) => a.lookups).filter((v) => v != null)),
    median_tokens_read_search: S.median(answers.map((a) => (a.meta && a.meta.tokens_read != null ? a.meta.tokens_read : null)).filter((v) => v != null)),
    reach80_share_tasks: r4(t80reached.length / g.tasks), reach80_mean_over_commits: r4(m.reach80.mean),
    median_t80_where_reached: S.median(t80reached), median_t80_censored_16000: m.t80c.median_over_tasks,
    file_r10: r4(m.file_r10.mean), ndcg10: r4(m.ndcg10.mean), mrr: r4(m.mrr.mean),
    tune_primary: tu ? r4(tu.primary) : null, tune_primary_se: tu ? r4(tu.se) : null,
    curve_grid_tokens: S.GRID, curve: g._rows.length ? S.GRID.map((_, i) => r4(S.mean(g._rows.map((r) => r.grid[i])))) : null });
}
fs.writeFileSync(path.join(OUT, 'scores.json'), JSON.stringify({ written_at: new Date().toISOString(), scorer: 'arms/common/score.js rule content', refs: 'refs_heldout.jsonl (held-out lines of sealed/references.jsonl, sets T1 T1x T2 T3 T4)', cluster_rule: 'score.js: commit for T1, T1x, T2; fix_commit for T4; the task for T3 (T3 references carry no commit field)', rows }, null, 1));
fs.writeFileSync(path.join(OUT, 'clusters.jsonl'), clusters.map((x) => JSON.stringify(x)).join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'tasks.jsonl.gz'), zlib.gzipSync(per.map((x) => JSON.stringify(x)).join('\n') + '\n'));
for (const r of rows) console.log([r.arm, r.role, r.set, r.tasks, r.clusters, r.primary, r.primary_se, r.r2000, r.r4000, r.r16000, r.auc, r.median_tokens_8000, r.median_lookups, r.median_t80_where_reached, r.tune_primary, 'miss', r.missing_refs, r.zero_unit_refs].join(' '));
