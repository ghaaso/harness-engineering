'use strict';
// Summarise the per-set sweep summaries: wall, compared lists, per-arm query time.
//   node timing.js <out dir> [<out dir> ...]
const fs = require('fs');
const path = require('path');
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const out = { sets: {}, per_arm: {} };
for (const d of process.argv.slice(2)) {
  const s = JSON.parse(fs.readFileSync(path.join(d, 'sweep', 'summary.json'), 'utf8'));
  const cc = s.crosscheck; const pairs = Object.fromEntries(Object.entries(cc.pairs).map(([k, v]) => [k, { compared: v.compared, equiv_fail: v.equiv_fail, strict_ranked_fail: v.strict_ranked_fail, strict_answer_fail: v.strict_answer_fail, answers_differ: v.answers_differ }]));
  out.sets[s.sets.join(',') + ':' + s.arms.join('+')] = { tasks: s.tasks, parents: s.parents, configs: s.configs, wall_s: s.wall_s, mismatches: cc.mismatches, pairs, seed_match: s.seed_match };
  for (const [k, v] of Object.entries(s.timing)) {
    const [arm, name] = k.split('|');
    const a = out.per_arm[arm] = out.per_arm[arm] || { rank_calls: 0, rank_wall_total_s: 0, by_config: {} };
    a.rank_calls += v.n; a.rank_wall_total_s += v.wall_total_s;
    const c = a.by_config[name] = a.by_config[name] || { n: 0, p50s: [], p95s: [] };
    c.n += v.n; c.p50s.push(v.wall_p50_ms); c.p95s.push(v.wall_p95_ms);
  }
}
for (const a of Object.values(out.per_arm)) {
  a.rank_wall_total_s = +a.rank_wall_total_s.toFixed(1);
  const p50 = Object.values(a.by_config).map((c) => Math.max(...c.p50s));
  a.config_p50_ms_median = pct(p50, 0.5); a.config_p50_ms_max = Math.max(...p50);
  a.distinct_rankings = Object.keys(a.by_config).length;
  for (const c of Object.values(a.by_config)) { c.p50_ms_max_over_sets = Math.max(...c.p50s); c.p95_ms_max_over_sets = Math.max(...c.p95s); delete c.p50s; delete c.p95s; }
}
console.log(JSON.stringify(out, null, 1));
