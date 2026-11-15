'use strict';
// Old against new stage-1 answers of this arm: per configuration, how many ranked lists (ranked_sha)
// and how many packed answers (items, budgets, units, seeds) changed, task by task. Reads only this
// arm's own answer files. node compare_old.js <old tune dir> <new tune dir> [--out file]
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const read = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const [oldDir, newDir] = process.argv.slice(2);
const oi = process.argv.indexOf('--out');
const files = fs.readdirSync(newDir).filter((f) => f.endsWith('.jsonl.gz')).sort();
const by = {}; const tot = { answers: 0, ranked_changed: 0, packed_changed: 0, missing_old: 0 };
for (const f of files) {
  const nw = read(path.join(newDir, f));
  const of = path.join(oldDir, f);
  const old = fs.existsSync(of) ? new Map(read(of).map((a) => [a.id, a])) : new Map();
  for (const a of nw) {
    const k = a.config_name || a.config_hash;
    const b = by[k] = by[k] || { hash: a.config_hash, answers: 0, ranked_changed: 0, packed_changed: 0, missing_old: 0 };
    b.answers++; tot.answers++;
    const o = old.get(a.id);
    if (!o) { b.missing_old++; tot.missing_old++; continue; }
    if (o.ranked_sha !== a.ranked_sha) { b.ranked_changed++; tot.ranked_changed++; }
    const pk = (x) => JSON.stringify([x.items, x.budgets, x.n_units, x.n_head, x.seeds, x.n_ranked]);
    if (pk(o) !== pk(a)) { b.packed_changed++; tot.packed_changed++; }
  }
}
const out = { files: files.length, totals: tot, changed_configs: Object.fromEntries(Object.entries(by).filter(([, v]) => v.ranked_changed || v.packed_changed || v.missing_old)), per_config: by };
if (oi > 0) fs.writeFileSync(process.argv[oi + 1], JSON.stringify(out, null, 1));
console.log(JSON.stringify({ files: out.files, totals: tot, changed_configs: out.changed_configs }, null, 1));
