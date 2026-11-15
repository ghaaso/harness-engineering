'use strict';
// Check 3: the completion program (kind 9) reproduces the finished test's frozen configuration
// (95e990307da3b42b, reference arm, held-out T1 answer records, read only): same items shown inside
// 8,000 tokens, same full/cut split, for the first N held-out T1 tasks (seeds as recorded).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const C = require('./conf');
const { Snap } = require('./load');
const { Rec } = require('./rec');
const { P } = require('./programs');

const N = Number(process.argv[2] || 40);
const f = path.join(C.BUILD_RESULTS, 'heldout', 'reference', 'crosscheck-95e990307da3b42b', 'T1.jsonl.gz');
const recs = zlib.gunzipSync(fs.readFileSync(f)).toString().split('\n').filter(Boolean).map(JSON.parse).slice(0, N);
let same = 0; const diffs = []; const snaps = new Map();
for (const r of recs) {
  if (!snaps.has(r.parent)) { snaps.clear(); snaps.set(r.parent, new Snap(r.parent)); }
  const S = snaps.get(r.parent);
  const fileSeed = r.seeds.find((s) => s.startsWith('file:'));
  if (!fileSeed) { diffs.push({ id: r.id, why: 'no file seed' }); continue; }
  const mine = P.completion(new Rec(S), { path: fileSeed.slice(5), seeds: r.seeds });
  const b = r.budgets['8000'];
  const theirs = r.items.slice(0, b.n_full + (b.cut ? 1 : 0)).map((x) => x.path);
  const ok = JSON.stringify(mine.items) === JSON.stringify(theirs) && mine.n_full === b.n_full && !!mine.cut === !!b.cut;
  if (ok) same++; else diffs.push({ id: r.id, n_full: [mine.n_full, b.n_full], mine: mine.items.slice(0, 5), theirs: theirs.slice(0, 5) });
}
console.log('completion check: identical', same, 'of', recs.length);
for (const d of diffs.slice(0, 5)) console.log(JSON.stringify(d));
fs.writeFileSync(path.join(C.OUT, 'check_completion.json'), JSON.stringify({ identical: same, checked: recs.length, source: 'results/heldout/reference/crosscheck-95e990307da3b42b/T1.jsonl.gz', diffs }, null, 1));
