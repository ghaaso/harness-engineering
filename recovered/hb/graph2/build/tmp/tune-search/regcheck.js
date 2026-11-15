'use strict';
// Stage-1 regression: answers re-run with the edited arm (out root argv[2]) against the stored stage-1
// answers in results/search/tune/, ignoring wall and engine time. Every field else must be identical.
const fs = require('fs');
const path = require('path');
const H = require('../../arms/common/harness');
const root = process.argv[2];
const dir = path.join(root, 'search', 'tune');
let files = 0; let recs = 0; let diff = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.jsonl.gz')).sort()) {
  const ref = path.join(__dirname, '..', '..', 'results', 'search', 'tune', f);
  if (!fs.existsSync(ref)) { console.log('NO STAGE-1 FILE', f); diff++; continue; }
  const a = H.readGzJsonl(path.join(dir, f)); const b = new Map(H.readGzJsonl(ref).map((x) => [x.id, x]));
  files++;
  for (const x of a) {
    recs++;
    const y = b.get(x.id);
    const strip = (o) => JSON.stringify({ ...o, ms: null, engine_ms: null });
    if (!y || strip(x) !== strip(y)) { diff++; if (diff < 5) console.log('DIFF', f, x.id); }
  }
}
console.log(JSON.stringify({ files, records: recs, differ: diff }));
