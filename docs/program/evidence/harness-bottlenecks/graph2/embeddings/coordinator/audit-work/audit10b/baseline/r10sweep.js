const C=require('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/verify-item27/recompute/core.js');
const fs=require('fs');const L=C.LANE;
const tasks=C.readJsonl(L+'/eval/tune_tasks.jsonl');
const cand=C.readScoreTable(L+'/eval/comparators/candidates_pool.tsv.gz');
const T={PPR:C.readScoreTable(L+'/eval/comparators/PPR_pool.tsv.gz'),CO:C.readScoreTable(L+'/eval/comparators/CO_pool.tsv.gz')};
const late=new Set(tasks.filter(t=>t.late50_pilot).map(t=>t.commit));
function rankS(tid,cands,sc,seed){const a=[],u=[];for(const c of cands){if(sc&&sc.has(c))a.push([-sc.get(c),C.tiebreak(tid,c,seed),c]);else u.push([C.tiebreak(tid,c,seed),c]);}a.sort((x,y)=>x[0]-y[0]||x[1]-y[1]);u.sort((x,y)=>x[0]-y[0]);return a.map(x=>x[2]).concat(u.map(x=>x[1]));}
function rrfS(tid,cands,arms,seed){const o=new Map(cands.map(c=>[c,0]));for(const[s,w]of arms){const sub=cands.filter(c=>s.has(c));rankS(tid,sub,s,seed).forEach((c,i)=>o.set(c,o.get(c)+w/(60+i+1)));}return o;}
function summ(f){const by=new Map();for(const t of tasks){if(!late.has(t.commit))continue;if(!by.has(t.commit))by.set(t.commit,[]);by.get(t.commit).push(f(t));}const v=[...by.values()].map(a=>[a.reduce((s,x)=>s+x[0],0)/a.length,a.reduce((s,x)=>s+x[1],0)/a.length]);return[v.reduce((s,x)=>s+x[0],0)/v.length,v.reduce((s,x)=>s+x[1],0)/v.length];}
const res={RRF:[],PPR:[],CO:[],RANDOM:[]};
for(let seed=1;seed<=50;seed++){
 for(const n of Object.keys(res)){res[n].push(summ(t=>{const cs=[...(cand.get(t.task_id)||new Map()).keys()];let sc=n==='RANDOM'?new Map():n==='RRF'?rrfS(t.task_id,cs,[[T.PPR.get(t.task_id)||new Map(),1],[T.CO.get(t.task_id)||new Map(),1]],seed):(T[n].get(t.task_id)||new Map());const r=rankS(t.task_id,cs,sc,seed).slice(0,10);const Tt=new Set(t.truth);const h=r.filter(c=>Tt.has(c)).length;return[h/10,h/Math.max(Tt.size,1)];}));}
}
const st=a=>{const m=a.reduce((s,x)=>s+x,0)/a.length;const sd=Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/a.length);return{mean:+m.toFixed(4),sd:+sd.toFixed(4),min:+Math.min(...a).toFixed(4),max:+Math.max(...a).toFixed(4)}};
const out={};for(const n of Object.keys(res))out[n]={P10:st(res[n].map(x=>x[0])),R10:st(res[n].map(x=>x[1]))};
// analytic random expectation R@10
out.RANDOM_expected=summ(t=>{const cs=[...(cand.get(t.task_id)||new Map()).keys()];const n=cs.length,m=cs.filter(c=>t.truth.includes(c)).length;const eh=n?Math.min(10,n)*m/n:0;return[eh/10,eh/Math.max(t.truth.length,1)];}).map(x=>+x.toFixed(4));
fs.writeFileSync(__dirname+'/r10sweep-result.json',JSON.stringify(out,null,1));console.log(JSON.stringify(out,null,1));
