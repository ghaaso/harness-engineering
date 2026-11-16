const fs=require('fs');const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/';
const o=JSON.parse(fs.readFileSync(L+'train/heldout/item27.json','utf8'));
console.log(Object.keys(o));
const ms=[];
for(const a in o.arms){const x=o.arms[a];ms.push(x.mean);console.log(a,x.config_id,x.w,x.epochs,x.mean,x.se,JSON.stringify(x.size), 'cands', x.candidates.map(c=>c.config_id+':'+c.w+':'+c.mean.toFixed(4)).join(' '));}
console.log('range',Math.max(...ms)-Math.min(...ms));
const r={...o};delete r.arms;console.log(JSON.stringify(r).slice(0,1500));
