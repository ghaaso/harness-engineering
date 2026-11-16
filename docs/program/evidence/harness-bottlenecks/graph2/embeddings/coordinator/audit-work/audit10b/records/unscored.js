const fs = require('fs'), path = require('path');
const D = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/train/stageB/tables';
const out = [];
for (const f of fs.readdirSync(D).filter(f => f.endsWith('_counts.json')).sort()) {
  const j = JSON.parse(fs.readFileSync(path.join(D, f), 'utf8'));
  let n = 0, allUnsc = 0, seedUnsc = 0, noCo = 0, emptyPool = 0, partial = 0;
  for (const [t, r] of Object.entries(j)) {
    n++; if (r.note) noCo++;
    const p = r.pool || {};
    if ((p.cands || 0) === 0) emptyPool++;
    if (p.seeds_unscored) seedUnsc++;
    if (p.cands && p.cands_unscored === p.cands) allUnsc++;
    else if (p.cands_unscored) partial++;
  }
  out.push([f.replace('_counts.json', ''), 'tasks', n, 'noCoNote', noCo, 'emptyPool', emptyPool, 'seedUnscored', seedUnsc, 'allCandsUnscored', allUnsc, 'someCandsUnscored', partial].join(' '));
}
fs.writeFileSync(__dirname + '/unscored.out.txt', out.join('\n') + '\n');
