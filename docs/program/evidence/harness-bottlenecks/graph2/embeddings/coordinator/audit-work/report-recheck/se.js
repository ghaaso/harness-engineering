const fs=require('fs');const B='C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/embeddings/lane/train/selectB/';
let real={smin:1,smax:0,dmax:0},all={smin:1,smax:0,dmax:0};
for(const arm of ['E1','E2','E3','E4','E5','PLACEBO']){ const ch=JSON.parse(fs.readFileSync(B+arm+'/choices.json','utf8')); if(arm==='E1') console.log(Object.keys(ch), JSON.stringify(ch).slice(0,300));
 const main = ch.main || ch; const blocks = main.blocks || ch.blocks || [];
 for(const b of blocks){ const arr=b.candidates; if(!arr) continue; const m=arr.map(x=>x.mean),s=arr.map(x=>x.se); const d=Math.max(...m)-Math.min(...m);
 console.log(arm,'block',b.block,'spread',d.toFixed(4),'se',Math.min(...s).toFixed(4),Math.max(...s).toFixed(4));
 for(const o of (arm==='PLACEBO'?[all]:[real,all])){o.smin=Math.min(o.smin,...s);o.smax=Math.max(o.smax,...s);o.dmax=Math.max(o.dmax,d);} } }
console.log('real',real,'all',all);
