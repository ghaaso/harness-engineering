'use strict';
const fs=require('fs');
const C=require('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/verify-item27/recompute/core.js');
const L=C.LANE;const scope=process.argv[2]||'pool';
const tasks=C.readJsonl(L+'/eval/tune_tasks.jsonl');const commits=C.readJsonl(L+'/eval/tune_commits.jsonl');
const plan=JSON.parse(fs.readFileSync(L+'/train/stageB/plan.json','utf8'));
const candT=C.readScoreTable(L+'/eval/comparators/candidates_'+scope+'.tsv.gz');
const ppr=C.readScoreTable(L+'/eval/comparators/PPR_'+scope+'.tsv.gz');const co=C.readScoreTable(L+'/eval/comparators/CO_'+scope+'.tsv.gz');
const lateC=commits.filter(c=>c.late50).sort((a,b)=>a.date_order-b.date_order);const late=new Set(lateC.map(c=>c.commit));
const blockOf=new Map();lateC.forEach((c,i)=>blockOf.set(c.commit,Math.floor(i/10)));
const use=tasks.filter(t=>late.has(t.commit));const cands=t=>candT.has(t.task_id)?[...candT.get(t.task_id).keys()]:[];
const rrf=new Map();for(const t of use){const cs=cands(t);rrf.set(t.task_id,C.p10(C.rank(t.task_id,cs,C.rrfScores(t.task_id,cs,[[ppr.get(t.task_id)||new Map(),1],[co.get(t.task_id)||new Map(),1]])),t.truth));}
const R=C.perCommit(rrf,use,late);
let st=777>>>0;function rnd(){st=(st+0x6D2B79F5)>>>0;let z=st;z=Math.imul(z^(z>>>15),z|1);z^=z+Math.imul(z^(z>>>7),z|61);return((z^(z>>>14))>>>0)/4294967296;}
function boot(d){const n=d.length,m=d.reduce((x,y)=>x+y,0)/n,bs=[];for(let r=0;r<10000;r++){let s=0;for(let i=0;i<n;i++)s+=d[Math.floor(rnd()*n)];bs.push(s/n);}bs.sort((a,b)=>a-b);return [m,bs[249],bs[9749]];}
for(const arm of ['E1','E2','E3','E4','E5']){const vecs={};
 for(const cf of plan.configs[arm]){const per=[];for(const s of [1,2,3]){const emb=C.readScoreTable(`${L}/train/stageB/tables/${arm}_${cf.config_id}_s${s}_${scope}.tsv.gz`);const v={alone:new Map(),0.25:new Map(),0.5:new Map(),1:new Map()};
  for(const t of use){const cs=cands(t),tid=t.task_id,e=emb.get(tid)||new Map(),p=ppr.get(tid)||new Map(),c=co.get(tid)||new Map();v.alone.set(tid,C.p10(C.rank(tid,cs,e),t.truth));for(const w of [0.25,0.5,1])v[w].set(tid,C.p10(C.rank(tid,cs,C.rrfScores(tid,cs,[[p,1],[c,1],[e,w]])),t.truth));}per.push(v);}
  for(const k of ['alone',0.25,0.5,1]){const pt=new Map();for(const t of use)pt.set(t.task_id,(per[0][k].get(t.task_id)+per[1][k].get(t.task_id)+per[2][k].get(t.task_id))/3);const a=C.perCommit(pt,use,late);vecs[cf.config_id+'/'+k]=a.vals.map((x,i)=>x-R.vals[i]);}}
 const fusedKeys=Object.keys(vecs).filter(k=>!k.endsWith('alone')),aloneKeys=Object.keys(vecs).filter(k=>k.endsWith('alone'));
 for(const [lab,keys] of [['fused',fusedKeys],['alone',aloneKeys]]){for(const dir of ['max','min']){const d=[];
  for(let b=0;b<5;b++){let best=null,bv=null;for(const k of keys){const m=vecs[k].slice(10*b,10*b+10).reduce((x,y)=>x+y,0)/10;if(bv===null||(dir==='max'?m>bv:m<bv)){bv=m;best=k;}}d.push(...vecs[best].slice(10*b,10*b+10));}
  const [m,lo,hi]=boot(d);console.log(scope,arm,lab,'adversarial-'+dir,m.toFixed(4),'['+lo.toFixed(4)+','+hi.toFixed(4)+']');}}
 if(scope==='unrestricted')for(const k of Object.keys(vecs)){const [m,lo,hi]=boot(vecs[k]);console.log(scope,arm,k,m.toFixed(4),'['+lo.toFixed(4)+','+hi.toFixed(4)+']');}
}
console.log('RRF',scope,R.mean.toFixed(4));
