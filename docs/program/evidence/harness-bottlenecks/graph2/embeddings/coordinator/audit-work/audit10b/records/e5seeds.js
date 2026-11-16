const fs = require('fs'), path = require('path');
const L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const j = JSON.parse(fs.readFileSync(L + '/train/stageB/tables/E5_c03_s1_counts.json', 'utf8'));
const un = Object.entries(j).filter(([t, r]) => r.pool && r.pool.seeds_unscored).map(([t, r]) => [t, r.checkpoint.slice(0, 12), r.note ? 'noco' : '', JSON.stringify(r.pool)]);
console.log(un.map(x => x.join(' ')).join('\n'));
// which tasks are late-50? look for a task/commit list in eval/
const ev = fs.readdirSync(L + '/eval'); console.log('eval files', ev.join(', '));
for (const f of ev.filter(f => /tune_(tasks|commits)\.jsonl$/.test(f))) {
  const ls = fs.readFileSync(L + '/eval/' + f, 'utf8').split('\n').filter(Boolean).map(s => JSON.parse(s));
  console.log(f, ls.length, 'keys', Object.keys(ls[0]).filter(k => !/truth|changed|files|answer/i.test(k)).join(','));
  if (/tasks/.test(f)) { const set = {}; for (const r of ls) set[r.task_id || r.id] = r; for (const [t] of un) { const r = set[t]; console.log(t, r ? JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k]) => /block|late|split|commit|parent|order|index/i.test(k)))) : 'not found'); } }
}
