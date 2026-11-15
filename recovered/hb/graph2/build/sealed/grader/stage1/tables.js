'use strict';
// Step 4: per-arm aggregate tables for the tuners (results/tuner/<arm>.stage1.json and .md), from the
// grader's summaries (sealed/grader/stage1/<arm>.summary.json). Aggregates per configuration and set
// only: no task, commit or reference content. Also writes sealed/grader/stage1/leaderboard.json.
//   node tables.js
const fs = require('fs');
const path = require('path');
const { complexity } = require('../complexity');
const B = path.resolve(__dirname, '..', '..', '..');
const OUTDIR = path.join(B, 'results', 'tuner');
const SETS = ['T1', 'T1x', 'T2'];
const TUNER_ARMS = ['relational', 'search', 'ladybug', 'duckpgq'];
const ALL_ARMS = [...TUNER_ARMS, 'floor-dir', 'floor-co', 'reference'];
const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

function setRow(g) {
  const m = g.metrics;
  return {
    tasks: g.tasks, commits: g.clusters,
    primary: r4(m.primary.mean), primary_se: r4(m.primary.se),
    r2000: r4(m.r2000.mean), r4000: r4(m.r4000.mean), r8000: r4(m.r8000.mean), r16000: r4(m.r16000.mean),
    auc: r4(m.auc.mean),
    def_r8000: r4(m.def_r8000.mean), file_r8000: r4(m.file_r8000.mean), unpad_r8000: r4(m.unpad_r8000.mean), precision8000: r4(m.precision8000.mean),
    file_r10: r4(m.file_r10.mean), ndcg10: r4(m.ndcg10.mean), mrr: r4(m.mrr.mean),
    tokens_used_median_8000: m.tok8000.median_over_tasks, tokens_used_median_16000: m.tok16000.median_over_tasks,
    t80_tokens_median: m.t80c.median_over_tasks, t80_tokens_mean: r1(m.t80c.mean), reach80: r4(m.reach80.mean),
    engine_ms_median: r4(g.engine_ms_median), lookups_median: g.lookups_median,
    ...(g.tokens_read_median != null ? { search_tokens_read_median: g.tokens_read_median } : {}),
  };
}

const board = {};
fs.mkdirSync(OUTDIR, { recursive: true });
for (const arm of ALL_ARMS) {
  const S = JSON.parse(fs.readFileSync(path.join(__dirname, arm + '.summary.json'), 'utf8'));
  const byCfg = new Map();
  for (const g of S) {
    if (!byCfg.has(g.config_hash)) byCfg.set(g.config_hash, { name: g.name, config_hash: g.config_hash, config: g.cfg, complexity: complexity(g.cfg).total, complexity_parts: complexity(g.cfg).parts, form: g.form, granularity: g.granularity, pad: g.pad, sets: {} });
    byCfg.get(g.config_hash).sets[g.set] = setRow(g);
  }
  const rows = [...byCfg.values()];
  // leaderboard (grader side): best by primary per set; the base row
  const base = rows.find((x) => x.name === 'base') || null;
  board[arm] = { base: base && base.name, sets: {} };
  for (const s of SETS) {
    const cand = rows.filter((x) => x.sets[s] && x.sets[s].primary != null).sort((a, b) => b.sets[s].primary - a.sets[s].primary || a.complexity - b.complexity);
    const best = cand[0];
    board[arm].sets[s] = best ? { best: best.name, best_hash: best.config_hash, best_complexity: best.complexity, ...best.sets[s], base_primary: base && base.sets[s] ? base.sets[s].primary : null, base_primary_se: base && base.sets[s] ? base.sets[s].primary_se : null,
      n_content_configs: cand.length, top5: cand.slice(0, 5).map((x) => ({ name: x.name, primary: x.sets[s].primary, se: x.sets[s].primary_se, complexity: x.complexity, tok: x.sets[s].tokens_used_median_8000 })) } : null;
  }
  if (!TUNER_ARMS.includes(arm)) continue;
  const doc = {
    arm, stage: 1, split: 'tune', rule: 'content', generated: new Date().toISOString(),
    list_hash: JSON.parse(fs.readFileSync(path.join(__dirname, 'inventory.json'), 'utf8')).arms[arm].list_hash,
    note: 'Aggregates per configuration and set only (TUNE). primary = recall of reference files plus definitions inside the 8,000-token answer, averaged per task within a commit and then over commits; null for paths and range forms (scored on file ranking only). primary_se = standard error over commits. r2000..r16000 = the same recall at each budget; auc = area under recall against tokens 0..16,000 divided by 16,000; def_r8000 = definition-only recall at 8,000; file_r10, ndcg10, mrr = file ranking (distinct paths in answer order). tokens_used_median_8000 = median tokens used by the 8,000-token answer; t80_tokens = tokens of whole items until recall reaches 0.8, censored at 16,000 when not reached (reach80 = share of tasks that reach it). engine_ms_median = median arm-reported engine time per query (milliseconds). complexity = addendum 3 item 10 (sealed/grader/complexity.js rule, summarised in the .md).',
    rows: rows.map((x) => ({ name: x.name, config_hash: x.config_hash, complexity: x.complexity, complexity_parts: x.complexity_parts, config: x.config, T1: x.sets.T1, T1x: x.sets.T1x, T2: x.sets.T2 })),
  };
  fs.writeFileSync(path.join(OUTDIR, arm + '.stage1.json'), JSON.stringify(doc, null, 1));
  // readable table
  const f = (x, d = 3) => (x == null ? '-' : typeof x === 'number' ? (Number.isInteger(x) ? String(x) : x.toFixed(d)) : String(x));
  let md = `# ${arm}: stage-1 TUNE score table (aggregates only)\n\n`;
  md += `List hash ${doc.list_hash}; ${rows.length} configurations; sets T1 (${rows[0].sets.T1.tasks} tasks, ${rows[0].sets.T1.commits} commits), T1x (${rows[0].sets.T1x.tasks} tasks, ${rows[0].sets.T1x.commits} commits), T2 (${rows[0].sets.T2.tasks} tasks, ${rows[0].sets.T2.commits} commits). Scored by the grader with arms/common/score.js, rule content.\n\n`;
  md += 'Columns: **primary** = recall of the reference files and definitions shown in the 8,000-token answer (0 to 1), averaged per commit; **se** = its standard error over commits; **r2k/r4k/r16k** = the same recall at 2,000, 4,000 and 16,000 tokens; **auc** = area under recall against tokens up to 16,000 (0 to 1); **def** = definition-only recall at 8,000; **fr10** = share of reference files among the first 10 distinct files; **ndcg** = nDCG@10 over files; **mrr** = reciprocal rank of the first reference file; **tok** = median tokens used by the 8,000-token answer; **t80** = median tokens of whole items until recall reaches 0.8 (16,000 when never reached); **ms** = median engine milliseconds per query; **cx** = complexity (addendum 3 item 10: ranking parts, +1 each for budget or metapath traversal, unbounded or more than 3 hops, hub cut, padding, symbol granularity, engine-only native mode; for search: +rounds beyond the first, routes, BM25, import following, padding, symbol granularity). Paths and range forms have no primary (scored on file ranking only).\n\n';
  for (const s of SETS) {
    md += `## ${s}\n\n| name | cx | primary | se | r2k | r4k | r16k | auc | def | fr10 | ndcg | mrr | tok | t80 | ms |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
    for (const x of rows) { const v = x.sets[s]; md += `| ${x.name} | ${x.complexity} | ${f(v.primary)} | ${f(v.primary_se)} | ${f(v.r2000)} | ${f(v.r4000)} | ${f(v.r16000)} | ${f(v.auc)} | ${f(v.def_r8000)} | ${f(v.file_r10)} | ${f(v.ndcg10)} | ${f(v.mrr)} | ${f(v.tokens_used_median_8000, 0)} | ${f(v.t80_tokens_median, 0)} | ${f(v.engine_ms_median, 1)} |\n`; }
    md += '\n';
  }
  md += '## Configurations\n\n';
  for (const x of rows) md += `- **${x.name}** (${x.config_hash}, complexity ${x.complexity}): \`${JSON.stringify(x.config)}\`\n`;
  fs.writeFileSync(path.join(OUTDIR, arm + '.stage1.md'), md);
}
fs.writeFileSync(path.join(__dirname, 'leaderboard.json'), JSON.stringify(board, null, 1));
for (const arm of ALL_ARMS) for (const s of SETS) { const b = board[arm].sets[s]; if (b) console.log(arm, s, b.best, b.primary, b.primary_se, 'base', b.base_primary, 'r2k', b.r2000, 'r4k', b.r4000, 'r16k', b.r16000, 'tok', b.tokens_used_median_8000, 'cx', b.best_complexity); }
