'use strict';
// Packed answers of two arms' answer folders compared record by record, apart from the fields that
// name the arm or carry its own timing and diagnostics (arm, ms, engine_ms, meta). common/sweep.js
// strips arm, ms and engine_ms but not meta (new in addendum 3, D.12), so for a graph arm that returns
// meta its "answers_differ" counts every record. node answers_same.js <tune dir A> <tune dir B>
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const read = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const [A, B] = process.argv.slice(2);
const strip = (a) => JSON.stringify({ ...a, arm: null, ms: null, engine_ms: null, meta: null });
const tot = { files: 0, answers: 0, differ: 0, missing: 0, differ_with_meta: 0 }; const ex = [];
for (const f of fs.readdirSync(A).filter((x) => x.endsWith('.jsonl.gz')).sort()) {
  if (!fs.existsSync(path.join(B, f))) { tot.missing++; continue; }
  tot.files++;
  const b = new Map(read(path.join(B, f)).map((x) => [x.id, x]));
  for (const x of read(path.join(A, f))) {
    tot.answers++;
    const y = b.get(x.id);
    if (!y) { tot.missing++; continue; }
    if (strip(x) !== strip(y)) { tot.differ++; if (ex.length < 5) ex.push({ file: f, id: x.id }); }
    if (JSON.stringify({ ...x, arm: null, ms: null, engine_ms: null }) !== JSON.stringify({ ...y, arm: null, ms: null, engine_ms: null })) tot.differ_with_meta++;
  }
}
console.log(JSON.stringify({ ...tot, examples: ex }));
