const fs = require('fs');
const L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/';
const t = JSON.parse(fs.readFileSync(L + 'train/report/tune.json', 'utf8'));
for (const [a, c] of Object.entries(t.choices)) {
  const f = c.final_all65;
  if (!f) { console.log(a, JSON.stringify(c).slice(0, 600)); continue; }
  console.log(a, 'chosen', f.config_id, f.w, f.mean, 'se', f.se, 'best', JSON.stringify(f.best), 'n', f.n_commits, 'cands', f.candidates.length, 'allSEs', f.candidates.map(x => x.se.toFixed(4)).join(','), 'range', (Math.max(...f.candidates.map(x => x.mean)) - Math.min(...f.candidates.map(x => x.mean))).toFixed(4));
  console.log('  blocks', JSON.stringify(c.blocks));
}
console.log('lag', JSON.stringify(t.lag).slice(0, 500));
console.log('counts', JSON.stringify(t.counts).slice(0, 1500));
console.log('sets', JSON.stringify(t.sets).slice(0, 300));
const it = JSON.parse(fs.readFileSync(L + 'train/heldout/item27.json', 'utf8'));
console.log('item27 keys', Object.keys(it));
console.log('chosen', JSON.stringify(it.chosen));
console.log('arms', JSON.stringify(it.arms).slice(0, 3000));
for (const k of Object.keys(it)) if (!['chosen', 'arms'].includes(k)) console.log(k, JSON.stringify(it[k]).slice(0, 800));
