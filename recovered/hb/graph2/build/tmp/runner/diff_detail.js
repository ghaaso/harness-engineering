'use strict';
// Detail of the primary-configuration answers whose ranked_sha differs between typed arms and the reference
// arm: which packed fields differ, and whether the beyond-budget sample differs only by order among equal scores.
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const B = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build';
const rd = (f) => new Map(zlib.gunzipSync(fs.readFileSync(path.join(B, f))).toString('utf8').split('\n').filter(Boolean).map(JSON.parse).map((a) => [a.id, a]));
const fields = ['seeds', 'seed_match', 'n_ranked', 'ranked_sha', 'n_units', 'n_head', 'items', 'budgets', 'beyond_sample'];
const rows = [];
for (const set of ['T1', 'T1x', 'T2']) {
  const ref = rd('results/heldout/reference/crosscheck-95e990307da3b42b/' + set + '.jsonl.gz');
  for (const arm of ['relational', 'ladybug', 'duckpgq']) {
    const A = rd('results/heldout/' + arm + '/primary/' + set + '.jsonl.gz');
    for (const [id, a] of A) {
      const b = ref.get(id);
      const diff = fields.filter((f) => JSON.stringify(a[f]) !== JSON.stringify(b[f]));
      if (!diff.length) continue;
      const r = { set, arm, id, diff };
      if (diff.includes('beyond_sample')) {
        const sa = a.beyond_sample; const sb = b.beyond_sample;
        const key = (x) => JSON.stringify(x);
        r.beyond_len = [sa.length, sb.length];
        r.beyond_same_multiset = JSON.stringify(sa.map(key).sort()) === JSON.stringify(sb.map(key).sort());
        const k = sa.findIndex((x, j) => key(x) !== key(sb[j]));
        r.first_diff_at = k; r.a_at = sa[k]; r.b_at = sb[k];
      }
      rows.push(r);
    }
  }
}
console.log(JSON.stringify(rows, null, 1).slice(0, 6000));
fs.writeFileSync(path.join(B, 'tmp/runner/diff_detail.json'), JSON.stringify(rows, null, 1));
