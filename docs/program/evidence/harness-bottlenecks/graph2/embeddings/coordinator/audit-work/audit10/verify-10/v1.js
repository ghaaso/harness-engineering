'use strict';
const fs=require('fs'),zlib=require('zlib');
const C=require('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/verify-item27/recompute/core.js');
const L=C.LANE, P=(...a)=>C.path.join(L,...a);
const all=C.readJsonl(P('eval','tune_tasks.jsonl'));
const late=all.filter(t=>t.late50), lateC=new Set(late.map(t=>t.commit));
const txt=zlib.gunzipSync(fs.readFileSync(P('eval','comparators','candidates_pool.tsv.gz'))).toString('utf8').split('\n');
const cl=new Map(); for(let i=1;i<txt.length;i++){if(!txt[i])continue;const [t,c]=txt[i].split('\t'); if(!cl.has(t))cl.set(t,[]); cl.get(t).push(c);}
const PPR=C.readScoreTable(P('eval','comparators','PPR_pool.tsv.gz')), CO=C.readScoreTable(P('eval','comparators','CO_pool.tsv.gz'));
const E=new Map(), g=(m,k)=>m.get(k)||E;
const out=[]; const log=s=>{out.push(s);console.log(s);};
log('late tasks '+late.length+' commits '+lateC.size+' all tasks '+all.length);
// RRF baseline
const rrf=new Map(); let truthIn=0,truthTot=0;
for(const t of late){const c=cl.get(t.task_id)||[]; const cs=new Set(c); for(const x of t.truth){truthTot++; if(cs.has(x))truthIn++;}
 rrf.set(t.task_id,C.p10(C.rank(t.task_id,c,C.rrfScores(t.task_id,c,[[g(PPR,t.task_id),1],[g(CO,t.task_id),1]])),t.truth));}
log('truth files in pool '+truthIn+'/'+truthTot);
log('RRF late50 pool P@10 '+C.perCommit(rrf,late,lateC).mean.toFixed(4));
// LCG bootstrap different from auditor's
function boot(v,B=20000){let s=12345; const r=()=>{s=(Math.imul(s,1103515245)+12345)>>>0; return s/4294967296;}; const ms=[]; for(let b=0;b<B;b++){let a=0; for(let i=0;i<v.length;i++)a+=v[Math.floor(r()*v.length)]; ms.push(a/v.length);} ms.sort((a,b)=>a-b); return [v.reduce((a,b)=>a+b,0)/v.length, ms[Math.floor(0.025*B)], ms[Math.floor(0.975*B)]];}
const f=x=>(x>=0?'+':'')+x.toFixed(3);
function contrast(pm){const a=C.perCommit(pm,late,lateC).vals,b=C.perCommit(rrf,late,lateC).vals; const d=a.map((x,i)=>x-b[i]); const r=boot(d); return f(r[0])+' ['+f(r[1])+', '+f(r[2])+']';}
// oracles
function emb(kind,t){const c=cl.get(t.task_id)||[],T=new Set(t.truth);
 if(kind==='all') return new Map(c.map(x=>[x,T.has(x)?1:0]));
 if(kind==='truthonly') return new Map(c.filter(x=>T.has(x)).map(x=>[x,1]));
 if(kind==='half') return new Map(c.map(x=>[x,C.tiebreak(t.task_id+'#o',x)+(T.has(x)?0.5:0)]));}
function per(kind,wOf){const pm=new Map(); for(const t of late){const c=cl.get(t.task_id)||[]; const w=typeof wOf==='number'?wOf:wOf.get(t.commit);
 pm.set(t.task_id,C.p10(C.rank(t.task_id,c,C.rrfScores(t.task_id,c,[[g(PPR,t.task_id),1],[g(CO,t.task_id),1],[emb(kind,t),w]])),t.truth));} return pm;}
for(const kind of ['all','truthonly','half']) log(kind+' fixed w: '+[0.25,0.5,1].map(w=>'w'+w+' '+contrast(per(kind,w))).join(' | '));
for(const a of ['E1','E2','E3','E4','E5','PLACEBO']){const ch=JSON.parse(fs.readFileSync(P('train','selectB',a,'choices.json'),'utf8')); const wOf=new Map(); for(const b of ch.blocks)for(const c of b.commits)wOf.set(c,b.w);
 log(a+' schedule '+ch.blocks.map(b=>b.w).join(',')+': all '+contrast(per('all',wOf))+'; truthonly '+contrast(per('truthonly',wOf))+'; half '+contrast(per('half',wOf)));}
// oracle under the selection: per block choose w on earlier commits (all 65 order) by mean, ties -> smaller w (ruling 53: higher mean)
const allC=[...new Set(all.map(t=>t.commit))]; const ord=new Map(all.map(t=>[t.commit,t.date_order])); allC.sort((a,b)=>ord.get(a)-ord.get(b));
const ch1=JSON.parse(fs.readFileSync(P('train','selectB','E1','choices.json'),'utf8'));
for(const kind of ['all','half']){const pmW={}; for(const w of [0.25,0.5,1]){const pm=new Map(); for(const t of all){const c=cl.get(t.task_id)||[]; pm.set(t.task_id,C.p10(C.rank(t.task_id,c,C.rrfScores(t.task_id,c,[[g(PPR,t.task_id),1],[g(CO,t.task_id),1],[emb(kind,t),w]])),t.truth));} pmW[w]=pm;}
 const wOf=new Map(), picks=[];
 for(const b of ch1.blocks){const bset=new Set(b.commits); const firstIdx=Math.min(...b.commits.map(c=>allC.indexOf(c))); const earlier=new Set(allC.slice(0,firstIdx));
  let best=null; for(const w of [0.25,0.5,1]){const m=C.perCommit(pmW[w],all,earlier).mean; if(!best||m>best.m)best={w,m};} picks.push(best.w+'(n'+earlier.size+')'); for(const c of b.commits)wOf.set(c,best.w);}
 log(kind+' oracle, w chosen per block by higher earlier mean: picks '+picks.join(',')+' -> '+contrast(per(kind,wOf)));}
fs.writeFileSync(__dirname+'/v1.out.txt',out.join('\n')+'\n');
