'use strict';
// Does graphify's packed file item (signature lines and token count) equal the same file's item in the
// comparators' stored answers of the same task? Tests the source-text trees added before the pack step.
const fs = require('fs'); const path = require('path'); const L = require('./lib');
const SETS = ['T1', 'T1x', 'T2', 'T3', 'T4'];
const res = {};
for (const arm of ['relational', 'search', 'floor-co', 'floor-dir']) {
  let same = 0; let diff = 0; const ex = [];
  for (const set of SETS) {
    const g = new Map(L.readGz(path.join(L.G, 'answers/heldout', set + '.jsonl.gz')).map((r) => [r.id, r]));
    for (const rec of L.readGz(path.join(L.BUILD, 'results/heldout', arm, 'primary', set + '.jsonl.gz'))) {
      const gr = g.get(rec.id); if (!gr) continue;
      const full = (r) => { const n = r.budgets['16000'].n_full; const m = new Map(); for (let k = 0; k < n; k++) m.set(r.items[k].path, r.items[k]); return m; };
      const A = full(gr); const B = full(rec);
      for (const [p, it] of A) { const jt = B.get(p); if (!jt) continue;
        if (it.tok === jt.tok && JSON.stringify(it.shown) === JSON.stringify(jt.shown) && it.ls === jt.ls && it.le === jt.le) same++; else { diff++; if (ex.length < 5) ex.push({ id: rec.id, p, g: [it.tok, it.shown.length], o: [jt.tok, jt.shown.length] }); } }
    }
  }
  res[arm] = { same, diff, examples: ex };
}
fs.writeFileSync(path.join(__dirname, 'out/packcheck.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
