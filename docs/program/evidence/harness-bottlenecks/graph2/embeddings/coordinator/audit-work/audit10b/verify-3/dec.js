const fs=require('fs');const C=require('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/verify-item27/recompute/core.js');
const tasks=C.readJsonl(C.LANE+'/eval/tune_tasks.jsonl');
const cand=C.readScoreTable(C.LANE+'/eval/comparators/candidates_pool.tsv.gz');
const res={};
for(const n of ['RRF','PPR','CO','RANDOM']){const st=C.readScoreTable(C.LANE+`/eval/comparators/${n}_pool.tsv.gz`);
 const by=new Map();for(const t of tasks){const cs=[...(cand.get(t.task_id)||new Map()).keys()];const sc=st.get(t.task_id)||new Map();
  const v=C.p10(C.rank(t.task_id,cs,sc),t.truth);if(!by.has(t.commit))by.set(t.commit,{v:[],l:t.late50,p:t.late50_pilot});by.get(t.commit).v.push(v);}
 const pc=[...by.values()].map(o=>({m:o.v.reduce((a,b)=>a+b,0)/o.v.length,l:o.l,p:o.p}));
 const mean=f=>{const a=pc.filter(f).map(x=>x.m);return [a.length,+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(4)];};
 res[n]={late50:mean(x=>x.l),pilot:mean(x=>x.p),shared:mean(x=>x.l&&x.p),dateOnly:mean(x=>x.l&&!x.p),pilotOnly:mean(x=>x.p&&!x.l)};}
fs.writeFileSync('dec-result.json',JSON.stringify(res,null,1));console.log(JSON.stringify(res));
