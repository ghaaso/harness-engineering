'use strict';
const fs=require('fs');
const C=require('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/verify-item27/recompute/core.js');
const L=C.LANE;
const tasks=C.readJsonl(L+'/eval/tune_tasks.jsonl');
const commits=C.readJsonl(L+'/eval/tune_commits.jsonl');
const plan=JSON.parse(fs.readFileSync(L+'/train/stageB/plan.json','utf8'));
const scope=process.argv[2]||'pool';
const candT=C.readScoreTable(L+'/eval/comparators/candidates_'+scope+'.tsv.gz');
const ppr=C.readScoreTable(L+'/eval/comparators/PPR_'+scope+'.tsv.gz');
const co=C.readScoreTable(L+'/eval/comparators/CO_'+scope+'.tsv.gz');
const late=new Set(commits.filter(c=>c.late50).map(c=>c.commit));
const pilot=new Set(commits.filter(c=>c.late50_pilot).map(c=>c.commit));
const use=tasks.filter(t=>late.has(t.commit)||pilot.has(t.commit));
const cands=t=>candT.has(t.task_id)?[...candT.get(t.task_id).keys()]:[];
const WS=[0.25,0.5,1];
// RRF per task
const rrf=new Map();
for(const t of use){const cs=cands(t);const f=C.rrfScores(t.task_id,cs,[[ppr.get(t.task_id)||new Map(),1],[co.get(t.task_id)||new Map(),1]]);rrf.set(t.task_id,C.p10(C.rank(t.task_id,cs,f),t.truth));}
// RNG
let st=12345>>>0;function rnd(){st=(st+0x6D2B79F5)>>>0;let z=st;z=Math.imul(z^(z>>>15),z|1);z^=z+Math.imul(z^(z>>>7),z|61);return((z^(z>>>14))>>>0)/4294967296;}
function contrast(pt,set){const a=C.perCommit(pt,use,set),b=C.perCommit(rrf,use,set);const d=a.vals.map((v,i)=>v-b.vals[i]);const n=d.length;const m=d.reduce((x,y)=>x+y,0)/n;const bs=[];for(let r=0;r<10000;r++){let s=0;for(let i=0;i<n;i++)s+=d[Math.floor(rnd()*n)];bs.push(s/n);}bs.sort((x,y)=>x-y);return{n,mean:a.mean,diff:m,lo:bs[249],hi:bs[9749]};}
function word(c){if(c.lo>0&&c.diff>=0.02)return'adds';if(c.lo>=-0.02&&c.hi<=0.02)return'matches';return c.hi<0?'cannot tell (lower)':'cannot tell';}
const out={scope,rrf_late50:C.perCommit(rrf,use,late).mean,rrf_pilot:C.perCommit(rrf,use,pilot).mean,rows:[]};
for(const arm of ['E1','E2','E3','E4','E5']){for(const cf of plan.configs[arm]){
 const per=[];
 for(const s of [1,2,3]){const emb=C.readScoreTable(`${L}/train/stageB/tables/${arm}_${cf.config_id}_s${s}_${scope}.tsv.gz`);
  const v={alone:new Map()};WS.forEach(w=>v[w]=new Map());
  for(const t of use){const cs=cands(t),tid=t.task_id,e=emb.get(tid)||new Map(),p=ppr.get(tid)||new Map(),c=co.get(tid)||new Map();
   v.alone.set(tid,C.p10(C.rank(tid,cs,e),t.truth));
   for(const w of WS)v[w].set(tid,C.p10(C.rank(tid,cs,C.rrfScores(tid,cs,[[p,1],[c,1],[e,w]])),t.truth));}
  per.push(v);}
 for(const k of ['alone',...WS]){const pt=new Map();for(const t of use)pt.set(t.task_id,(per[0][k].get(t.task_id)+per[1][k].get(t.task_id)+per[2][k].get(t.task_id))/3);
  const a=contrast(pt,late),b=contrast(pt,pilot);out.rows.push({arm,config:cf.config_id,kind:k,late50:a,late50_word:word(a),pilot:b,pilot_word:word(b)});}
 console.error('done',arm,cf.config_id);
}}
fs.writeFileSync(__dirname+'/allcands-'+scope+'.json',JSON.stringify(out,null,1));
console.log('RRF late50',out.rrf_late50.toFixed(4),'pilot',out.rrf_pilot.toFixed(4));
for(const r of out.rows)console.log(r.arm,r.config,String(r.kind).padEnd(5),'late50',r.late50.diff.toFixed(4),'['+r.late50.lo.toFixed(4)+','+r.late50.hi.toFixed(4)+']',r.late50_word.padEnd(20),'pilot(n='+r.pilot.n+')',r.pilot.diff.toFixed(4),'['+r.pilot.lo.toFixed(4)+','+r.pilot.hi.toFixed(4)+']',r.pilot_word);
