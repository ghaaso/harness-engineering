const fs=require('fs');const B='C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/embeddings/lane/train/selectB/';
let lo=1,hi=0,lo2=1,hi2=0;
for(const arm of ['E1','E2','E3','E4','E5','PLACEBO']){ const ch=JSON.parse(fs.readFileSync(B+arm+'/choices.json','utf8'));
 for(const b of ch.blocks){ const best=b.best|| b.candidates.reduce((a,x)=>x.mean>a.mean?x:a); const s=best.se; if(arm!=='PLACEBO'){lo=Math.min(lo,s);hi=Math.max(hi,s);} lo2=Math.min(lo2,s);hi2=Math.max(hi2,s);}
 const f=ch.final_all65; console.log(arm,'final best se',f.best&&f.best.se, 'chosen se', f.se);}
console.log('best se real',lo,hi,'all',lo2,hi2);
