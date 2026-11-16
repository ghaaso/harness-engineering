'use strict';
const X=require('./lib.js'); const {late,comp,stageB,selB,get,ranked,fuse,C,P}=X;
const CH={E1:'c04',E2:'c07',E3:'c03',E4:'c12',E5:'c03'}; const res=[];
for (const sc of ['pool','unrestricted']) { const cl=X.candLists(sc), PPR=comp('PPR',sc), CO=comp('CO',sc);
for (const a of Object.keys(CH)) { const ch=require(P('train','selectB',a,'choices.json')); const w=new Map(); for(const b of ch.blocks) for(const c of b.commits) w.set(c,b.w);
 let mis=0, maxd=0; for (const s of [1,2,3]) { const F=selB(a,'fused',sc,s), E=stageB(a,CH[a],s,sc);
  for (const t of late){ const c=cl.get(t.task_id)||[]; const f=fuse(t.task_id,c,get(PPR,t.task_id),get(CO,t.task_id),get(E,t.task_id),w.get(t.commit)); const g=get(F,t.task_id);
   for (const [k,v] of f){ const d=Math.abs(v-(g.get(k)??NaN)); if(!(d<1e-12)) mis++; else maxd=Math.max(maxd,d);} } }
 res.push(`${sc} ${a}: fused score mismatches vs selectB fused tables ${mis}, max abs diff ${maxd}`);} }
console.log(res.join('\n')); require('fs').writeFileSync(__dirname+'/a4.out.txt',res.join('\n')+'\n');
