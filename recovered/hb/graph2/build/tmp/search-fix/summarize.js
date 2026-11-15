'use strict';
// Describes the smoke answer files of the search arm (no references, no scores): per configuration the
// task count, ranked-list length, head units, lookups, wall and engine time, tokens used at 8,000 and
// the padding tail's share of them.
//   node summarize.js <results root>
const fs = require('fs');
const path = require('path');
const B = process.env.GT_BUILD || path.resolve(__dirname, '..', '..');
const H = require(path.join(B, 'arms/common/harness'));
const root = process.argv[2];
const cfgs = JSON.parse(fs.readFileSync(path.join(root, 'sweep', 'configs.json'), 'utf8')).lists.search.configs;
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
const rows = [];
for (const c of cfgs) {
  const recs = [];
  for (const set of ['T1', 'T2']) { const f = path.join(root, 'search', 'tune', c.hash + '.' + set + '.jsonl.gz'); if (fs.existsSync(f)) recs.push(...H.readGzJsonl(f)); }
  rows.push({ name: c.name, hash: c.hash, tasks: recs.length,
    ranked_p50: q(recs.map((r) => r.n_ranked), 0.5), head_p50: q(recs.map((r) => r.n_head), 0.5),
    lookups_p50: q(recs.map((r) => r.lookups), 0.5), lookups_p95: q(recs.map((r) => r.lookups), 0.95),
    wall_ms_p50: +q(recs.map((r) => r.ms), 0.5).toFixed(2), engine_ms_p50: +q(recs.map((r) => r.engine_ms || 0), 0.5).toFixed(2),
    used8k_p50: q(recs.map((r) => r.budgets[8000].used), 0.5), tail8k_p50: q(recs.map((r) => r.budgets[8000].tail_tok), 0.5) });
}
for (const r of rows) console.log(JSON.stringify(r));
