const fs=require('fs');const L=process.argv[2];
const real=JSON.parse(fs.readFileSync(L+'/train/stageB/plan.json','utf8'));const ho=new Set(real.heldout.checkpoints);const tu=new Set(real.checkpoints);
for(const f of process.argv.slice(3)){try{const p=JSON.parse(fs.readFileSync(L+'/'+f,'utf8'));const h=p.heldout?p.heldout.checkpoints:[];
console.log(f,'tune ck',(p.checkpoints||[]).length,'ho ck',h.length,'ho in real ho',h.filter(x=>ho.has(x)).length,'ho in real tune',h.filter(x=>tu.has(x)).length, 'assign ho keys in real ho',p.heldout?Object.keys(p.heldout.assignment||{}).filter(x=>ho.has(x)).length:0);}catch(e){console.log(f,'ERR',e.message)}}
