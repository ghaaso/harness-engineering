const fs=require('fs');const B='C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/embeddings/lane/';
const t=JSON.parse(fs.readFileSync(B+'train/report/tune.json','utf8'));
console.log(JSON.stringify(t.choices.E1.blocks[0]).slice(0,700));
let maxd=0,mins=1,maxs=0,maxdArm='';
for(const a of Object.keys(t.choices)){for(const b of t.choices[a].blocks){const arr=b.candidates;const m=arr.map(x=>x.mean),s=arr.map(x=>x.se);const d=Math.max(...m)-Math.min(...m);
 if(a!=='PLACEBO'){if(d>maxd){maxd=d;maxdArm=a;} mins=Math.min(mins,...s);maxs=Math.max(maxs,...s);} console.log(a,'spread',d.toFixed(4),'se',Math.min(...s).toFixed(4),Math.max(...s).toFixed(4));}}
console.log('real arms max spread',maxd,maxdArm,'se',mins,maxs);
// all65 spreads incl placebo
