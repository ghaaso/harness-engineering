'use strict';
// Prints, for chosen answers, what is shown inside 8,000 tokens next to each reference unit, so the
// credit can be read by eye. No scoring code here: the reader decides. Usage: node handprint.js <build> arm/role/set/id ...
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const BUILD = path.resolve(process.argv[2]);
const refs = new Map();
for (const l of fs.readFileSync(path.join(BUILD, 'sealed/references.jsonl'), 'utf8').split(/\r?\n/)) { if (!l) continue; const r = JSON.parse(l); if (r.split === 'heldout') refs.set(r.id, r); }
for (const spec of process.argv.slice(3)) {
  const [arm, role, set, id] = spec.split('/');
  const recs = zlib.gunzipSync(fs.readFileSync(path.join(BUILD, 'results/heldout', arm, role, set + '.jsonl.gz'))).toString().split('\n').filter(Boolean).map(JSON.parse);
  const rec = recs.find((r) => r.id === id); const ref = refs.get(id);
  const b = rec.budgets['8000'];
  console.log(`\n=== ${spec}  parent ${rec.parent.slice(0, 8)}  seed ${rec.seeds.join(' ')}  budget8000: n_full=${b.n_full} used=${b.used} cut=${JSON.stringify(b.cut)}`);
  console.log('  items in order (first n_full fully shown):');
  rec.items.slice(0, b.n_full + 1).forEach((it, k) => console.log(`   ${k < b.n_full ? 'FULL' : 'CUT '} ${it.path}${it.pad ? ' [pad]' : ''} shown=${JSON.stringify(k < b.n_full ? it.shown : (b.cut && b.cut.shown))}`));
  console.log('  reference files:'); for (const f of ref.files) console.log('   ', f.path);
  console.log('  reference defs:'); for (const d of ref.defs) console.log(`    ${d.path} ${d.name} [${d.start},${d.end}] ${d.kind}`);
}
