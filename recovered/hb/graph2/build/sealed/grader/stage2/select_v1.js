'use strict';
// Selection (protocol addendum 2 item 9, addendum 3 item 10), the same rule for every arm:
//   1. candidates = the arm's configurations with a primary on T1 TUNE (content forms; stage 1 + stage 2,
//      60 for relational, search, ladybug, duckpgq; the fixed 8 for each floor);
//   2. best = the highest T1 TUNE primary (ties: lower complexity, lower median tokens, name);
//   3. eligible = primary >= best primary - the best configuration's standard error;
//   4. chosen = the eligible one with the lowest complexity; ties by lower median tokens used by the
//      8,000-token answer (T1), then by configuration name (plain string order).
// Writes sealed/grader/selection.json.   node select.js
const fs = require('fs');
const path = require('path');
const { complexity } = require('../complexity');
const G = path.resolve(__dirname, '..');
const SETS = ['T1', 'T1x', 'T2'];
const ARMS = ['relational', 'search', 'ladybug', 'duckpgq', 'floor-dir', 'floor-co'];
const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
const cmpName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const load = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

const out = { rule: 'Highest primary on T1 TUNE; among configurations with primary >= best - se(best), the lowest complexity (addendum 3 item 10, sealed/grader/complexity.js); ties by lower median tokens used by the 8,000-token T1 answer, then by configuration name.', primary: 'recall of reference files and definitions shown inside the 8,000-token answer, rule content, mean over the 65 TUNE commits of the per-commit mean over tasks', generated: new Date().toISOString(), arms: {} };
for (const arm of ARMS) {
  const groups = [...load(path.join(G, 'stage1', arm + '.summary.json')).map((g) => ({ ...g, stage: arm.startsWith('floor') ? 'floor' : 1 }))];
  if (!arm.startsWith('floor')) groups.push(...load(path.join(__dirname, arm + '.summary.json')).map((g) => ({ ...g, stage: 2 })));
  const by = new Map();
  for (const g of groups) {
    if (!by.has(g.config_hash)) { const c = complexity(g.cfg); by.set(g.config_hash, { name: g.name, config_hash: g.config_hash, stage: g.stage, complexity: c.total, complexity_parts: c.parts, form: g.form, granularity: g.granularity, pad: g.pad, config: g.cfg, sets: {} }); }
    const m = g.metrics;
    by.get(g.config_hash).sets[g.set] = { primary: m.primary.mean, se: m.primary.se, commits: g.clusters, tasks: g.tasks, r2000: m.r2000.mean, r4000: m.r4000.mean, r16000: m.r16000.mean, auc: m.auc.mean, tok8000_median: m.tok8000.median_over_tasks, engine_ms_median: g.engine_ms_median, lookups_median: g.lookups_median };
  }
  const rows = [...by.values()];
  const n = { all: rows.length, stage1: rows.filter((x) => x.stage === 1).length, stage2: rows.filter((x) => x.stage === 2).length };
  const cand = rows.filter((x) => x.sets.T1 && x.sets.T1.primary != null);
  const tok = (x) => x.sets.T1.tok8000_median;
  cand.sort((a, b) => b.sets.T1.primary - a.sets.T1.primary || a.complexity - b.complexity || tok(a) - tok(b) || cmpName(a.name, b.name));
  const best = cand[0];
  const thr = best.sets.T1.primary - best.sets.T1.se;
  const elig = cand.filter((x) => x.sets.T1.primary >= thr);
  const pick = [...elig].sort((a, b) => a.complexity - b.complexity || tok(a) - tok(b) || cmpName(a.name, b.name));
  const chosen = pick[0];
  const why = pick.length > 1 && pick[1].complexity === chosen.complexity ? (tok(pick[1]) === tok(chosen) ? 'tie on complexity and median tokens, broken by name' : 'tie on complexity, broken by lower median tokens') : 'lowest complexity among the eligible';
  const brief = (x) => x && ({ name: x.name, config_hash: x.config_hash, stage: x.stage, complexity: x.complexity, complexity_parts: x.complexity_parts,
    T1_primary: r4(x.sets.T1.primary), T1_se: r4(x.sets.T1.se), T1_median_tokens: tok(x),
    T1x_primary: r4(x.sets.T1x && x.sets.T1x.primary), T2_primary: r4(x.sets.T2 && x.sets.T2.primary) });
  out.arms[arm] = {
    configurations: n, candidates_with_primary: cand.length,
    chosen: { ...brief(chosen), config: chosen.config, reason: why },
    best: brief(best), best_primary: r4(best.sets.T1.primary), chosen_primary: r4(chosen.sets.T1.primary), se_of_best: r4(best.sets.T1.se), threshold: r4(thr),
    eligible_within_1se: pick.map((x) => ({ name: x.name, complexity: x.complexity, T1_primary: r4(x.sets.T1.primary), T1_median_tokens: tok(x), stage: x.stage })),
    ranked_table: cand.map((x, i) => ({ rank: i + 1, ...brief(x), within_1se: x.sets.T1.primary >= thr,
      T1_r2000: r4(x.sets.T1.r2000), T1_r4000: r4(x.sets.T1.r4000), T1_r16000: r4(x.sets.T1.r16000), T1_auc: r4(x.sets.T1.auc), T1_engine_ms_median: r4(x.sets.T1.engine_ms_median), T1_lookups_median: x.sets.T1.lookups_median })),
    not_eligible_no_primary: rows.filter((x) => !(x.sets.T1 && x.sets.T1.primary != null)).map((x) => ({ name: x.name, form: x.form, stage: x.stage })),
  };
}
fs.writeFileSync(path.join(G, 'selection.json'), JSON.stringify(out, null, 1));
for (const arm of ARMS) {
  const a = out.arms[arm];
  console.log(`${arm}: n=${JSON.stringify(a.configurations)} cand=${a.candidates_with_primary} best="${a.best.name}" ${a.best_primary} se ${a.se_of_best} cx ${a.best.complexity} | chosen="${a.chosen.name}" (stage ${a.chosen.stage}) ${a.chosen_primary} cx ${a.chosen.complexity} tok ${a.chosen.T1_median_tokens} [${a.chosen.reason}] | eligible ${a.eligible_within_1se.length}: ${a.eligible_within_1se.map((x) => x.name + ' ' + x.complexity + ' ' + x.T1_primary).join('; ')}`);
}
