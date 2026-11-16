const fs = require('fs');
const B = 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/embeddings/lane/';
const t = JSON.parse(fs.readFileSync(B + 'train/report/tune.json', 'utf8'));
const ps = t.contrasts.late50_pilot_shared;
console.log('pilot_shared keys', Object.keys(ps), JSON.stringify(Object.fromEntries(Object.entries(ps).filter(([k,v])=>typeof v!=='object'))));
let maxd = 0, minse = 1, maxse = 0, allmin=1, allmax=0;
for (const a of Object.keys(t.choices)) {
  const ch = t.choices[a];
  console.log('ARM', a, 'final', ch.final_all65 && ch.final_all65.config_id, ch.final_all65 && ch.final_all65.w, ch.final_all65 && ch.final_all65.mean, ch.final_all65 && ch.final_all65.se);
  if (ch.final_all65) for (const x of ch.final_all65.candidates) { allmin=Math.min(allmin,x.se); allmax=Math.max(allmax,x.se);}
  const fm = ch.final_all65 ? ch.final_all65.candidates.map(x=>x.mean) : [];
  if (fm.length) console.log('  all65 spread', (Math.max(...fm)-Math.min(...fm)).toFixed(4));
  console.log('  blockkeys', ch.blocks && ch.blocks[0] && Object.keys(ch.blocks[0]));
  for (const b of ch.blocks || []) {
    const arr = b.candidates; if (!arr) continue;
    const m = arr.map(x => x.mean), s = arr.map(x => x.se);
    const d = Math.max(...m) - Math.min(...m); maxd = Math.max(maxd, d); minse = Math.min(minse, ...s); maxse = Math.max(maxse, ...s);
    console.log('  block', b.block || b.name || '', 'n', arr.length, 'spread', d.toFixed(4), 'se', Math.min(...s).toFixed(4), Math.max(...s).toFixed(4), 'chosen', JSON.stringify(b.chosen||b.choice||'').slice(0,80));
  }
}
console.log('blocks max spread', maxd, 'se range', minse, maxse, 'all65 se range', allmin, allmax);
const finals = Object.entries(t.choices).filter(([a,c])=>c.final_all65).map(([a,c])=>[a,c.final_all65.mean]);
console.log(finals);
