'use strict';
// Audit check 6: the token prices used by k0's bound, recomputed from the finished test's held-out answer
// files (search and relational arms, results/heldout/tq/, read only), and the bound recomputed from k0's
// aggregates with median, mean and per-kind prices.
const fs = require('fs');
const path = require('path');
const BUILD = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build';
const K0 = path.resolve(__dirname, '..', 'k0');
const rd = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const qs = rd(path.join(BUILD, 'tasks', 'tq_questions.jsonl'));
const kindOf = new Map(qs.map((q) => [q.id, q.kind]));
const med = (a) => { a = a.slice().sort((x, y) => x - y); const n = a.length; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; };
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const out = { arms: {} };
for (const arm of ['search', 'relational']) {
  const f = path.join(BUILD, 'results', 'heldout', 'tq', arm + '.answers.jsonl');
  const rows = rd(f);
  const by = {};
  for (const r of rows) { const k = kindOf.get(r.id); (by[k] = by[k] || []).push(r.tokens); }
  out.arms[arm] = { n: rows.length, median: med(rows.map((r) => r.tokens)), mean: +mean(rows.map((r) => r.tokens)).toFixed(1), max: Math.max(...rows.map((r) => r.tokens)),
    per_kind: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, { n: v.length, median: med(v), mean: +mean(v).toFixed(1) }])) };
}
// k0's served counts per kind (tree lane), from k0's report
const rep = JSON.parse(fs.readFileSync(path.join(K0, 'out', 'final1', 'report.json'), 'utf8'));
out.k0_token_bound = rep.token_bound;
const tb = rep.token_bound.per_100_lookups_tree_kinds_1_to_8;
const S = out.arms.search; const T = out.arms.relational;
out.recomputed_per_100_lookups = {};
for (const p of Object.keys(tb)) {
  const hitShare = tb[p].served / tb[p].lookups;
  out.recomputed_per_100_lookups[p] = {
    median_prices: Math.round(100 * hitShare * (S.median - T.median)),
    mean_prices: Math.round(100 * hitShare * (S.mean - T.mean)),
    max_search_price: Math.round(100 * hitShare * (S.max - 0)),
    k0_overall: tb[p].bound_with_overall_prices_695_minus_31,
    k0_per_kind: tb[p].same_minus_the_cached_answer_tokens_still_read,
  };
}
fs.writeFileSync(path.join(__dirname, 'a6_tokens.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ arms: out.arms, recomputed: out.recomputed_per_100_lookups }, null, 1));
