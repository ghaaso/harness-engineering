'use strict';
const fs=require('fs');
const C=require('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/verify-item27/recompute/core.js');
const L=C.LANE;const scope='pool';
const tasks=C.readJsonl(L+'/eval/tune_tasks.jsonl');const commits=C.readJsonl(L+'/eval/tune_commits.jsonl');
const candT=C.readScoreTable(L+'/eval/comparators/candidates_'+scope+'.tsv.gz');
const ppr=C.readScoreTable(L+'/eval/comparators/PPR_'+scope+'.tsv.gz');const co=C.readScoreTable(L+'/eval/comparators/CO_'+scope+'.tsv.gz');
const late=new Set(commits.filter(c=>c.late50).map(c=>c.commit));
const use=tasks.filter(t=>late.has(t.commit));const cands=t=>candT.has(t.task_id)?[...candT.get(t.task_id).keys()]:[];
const rrf=new Map();for(const t of use){const cs=cands(t);rrf.set(t.task_id,C.p10(C.rank(t.task_id,cs,C.rrfScores(t.task_id,cs,[[ppr.get(t.task_id)||new Map(),1],[co.get(t.task_id)||new Map(),1]])),t.truth));}
const R=C.perCommit(rrf,use,late);
let st=99>>>0;function rnd(){st=(st+0x6D2B79F5)>>>0;let z=st;z=Math.imul(z^(z>>>15),z|1);z^=z+Math.imul(z^(z>>>7),z|61);return((z^(z>>>14))>>>0)/4294967296;}
function boot(d){const n=d.length,m=d.reduce((x,y)=>x+y,0)/n,bs=[];for(let r=0;r<10000;r++){let s=0;for(let i=0;i<n;i++)s+=d[Math.floor(rnd()*n)];bs.push(s/n);}bs.sort((a,b)=>a-b);return m.toFixed(4)+' ['+bs[249].toFixed(4)+','+bs[9749].toFixed(4)+']';}
const out=[];
for(const arm of ['E1','E2','E3','E4','E5']){const ch=JSON.parse(fs.readFileSync(`${L}/train/selectB/${arm}/choices.json`,'utf8'));
 const commitCfg=new Map();for(const b of ch.blocks)for(const c of b.commits)commitCfg.set(c,[b.config_id,b.w]);
 const tabs={};const get=(cfg,s)=>{const k=cfg+s;if(!tabs[k])tabs[k]=C.readScoreTable(`${L}/train/stageB/tables/${arm}_${cfg}_s${s}_${scope}.tsv.gz`);return tabs[k];};
 const fz=new Map(),al=new Map();
 for(const t of use){const [cfg,w]=commitCfg.get(t.commit);const cs=cands(t),tid=t.task_id,p=ppr.get(tid)||new Map(),c=co.get(tid)||new Map();let f=0,a=0;
  for(const s of [1,2,3]){const e=get(cfg,s).get(tid)||new Map();f+=C.p10(C.rank(tid,cs,C.rrfScores(tid,cs,[[p,1],[c,1],[e,w]])),t.truth);a+=C.p10(C.rank(tid,cs,e),t.truth);}
  fz.set(tid,f/3);al.set(tid,a/3);}
 const F=C.perCommit(fz,use,late),A=C.perCommit(al,use,late);
 const line=arm+' blocks '+ch.blocks.map(b=>b.config_id+'/'+b.w).join(',')+' fused '+F.mean.toFixed(4)+' fused-RRF '+boot(F.vals.map((v,i)=>v-R.vals[i]))+' alone '+A.mean.toFixed(4)+' alone-RRF '+boot(A.vals.map((v,i)=>v-R.vals[i]));
 console.log(line);out.push(line);}
