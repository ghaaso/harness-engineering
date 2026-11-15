'use strict';
// After the relational-list cross-check (common/sweep.js --arms reference,duckpgq --list relational):
// compares the two arms' answer files answer by answer, ignoring arm, timing and the arm's meta (the
// common sweep's own answers_differ counts meta, which only this arm reports, so it flags every answer).
//   node arms/duckpgq/dev/compare_xcheck.js <crosscheck out root>
const fs = require('fs');
const path = require('path');
const B = process.env.GT_BUILD || path.resolve(__dirname, '..', '..', '..');
const H = require(path.join(B, 'arms/common/harness'));
const root = process.argv[2];
const dir = (a) => path.join(root, a, 'tune');
const strip = (a) => JSON.stringify({ ...a, arm: null, ms: null, engine_ms: null, meta: null, lookups: null, lookups_head: null });
const out = { files: 0, answers: 0, ranked_sha_differ: 0, answers_differ: 0, by_config: {} };
const names = {};
const cf = path.join(root, 'sweep', 'configs.json');
if (fs.existsSync(cf)) for (const c of JSON.parse(fs.readFileSync(cf, 'utf8')).lists.reference.configs) names[c.hash] = c.name;
for (const f of fs.readdirSync(dir('reference'))) {
  const g = path.join(dir('duckpgq'), f); if (!fs.existsSync(g)) { out.missing = (out.missing || 0) + 1; continue; }
  out.files++;
  const R = new Map(H.readGzJsonl(path.join(dir('reference'), f)).map((a) => [a.id, a]));
  for (const a of H.readGzJsonl(g)) {
    const b = R.get(a.id); out.answers++;
    const n = names[f.split('.')[0]] || f; const bc = out.by_config[n] = out.by_config[n] || { answers: 0, ranked_sha_differ: 0, answers_differ: 0 };
    bc.answers++;
    if (!b || a.ranked_sha !== b.ranked_sha) { out.ranked_sha_differ++; bc.ranked_sha_differ++; }
    if (!b || strip(a) !== strip(b)) { out.answers_differ++; bc.answers_differ++; }
  }
}
out.by_config = Object.fromEntries(Object.entries(out.by_config).filter(([, v]) => v.ranked_sha_differ || v.answers_differ));
console.log(JSON.stringify(out, null, 1));
