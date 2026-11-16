'use strict';
const fs=require('fs'),zlib=require('zlib'),crypto=require('crypto');
const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const H=L+'/train/heldout';
const prog=fs.readFileSync(H+'/progress.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse);
const u=prog.filter(r=>r.unit.startsWith('unit/'));
const w=u.map(r=>r.wall_s).sort((a,b)=>a-b);
const q=p=>w[Math.floor(p*(w.length-1))];
const ts=r=>Date.parse(r.t);
const start=ts(prog[0]),end=ts(prog[prog.length-1]);
const perHour={};for(const r of u){const h=r.t.slice(0,13);perHour[h]=(perHour[h]||0)+1;}
// gaps between consecutive done lines
const gaps=[];for(let i=1;i<u.length;i++)gaps.push({i,unit:u[i].unit,gap:(ts(u[i])-ts(u[i-1]))/1000,wall:u[i].wall_s,prev_t:u[i-1].t,t:u[i].t});
const big=gaps.filter(g=>g.gap>200);
const sum=w.reduce((a,b)=>a+b,0);
const meta=[];let rows=0;for(const s of[1,2,3])for(const C of fs.readdirSync(`${H}/parts/E1/c04/s${s}`)){const m=JSON.parse(fs.readFileSync(`${H}/parts/E1/c04/s${s}/${C}/meta.json`));meta.push(m.wall_s);for(const sc of['pool','unrestricted'])rows+=zlib.gunzipSync(fs.readFileSync(`${H}/parts/E1/c04/s${s}/${C}/${sc}.tsv.gz`)).toString().split('\n').slice(1).filter(Boolean).length;}
const ms=meta.sort((a,b)=>a-b);
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
console.log(JSON.stringify({units:u.length,wall_s:{min:w[0],p25:q(.25),median:q(.5),p75:q(.75),p95:q(.95),max:w[w.length-1],max2:w[w.length-2],sum_h:sum/3600,sum_minus_max_h:(sum-w[w.length-1])/3600},
meta_wall_s:{min:ms[0],median:ms[Math.floor(ms.length/2)],max:ms[ms.length-1],sum_h:ms.reduce((a,b)=>a+b,0)/3600},
first_line:prog[0].t,last_line:prog[prog.length-1].t,span_h:(end-start)/3600,span_minus_sleep_h:(end-start-7195e3)/3600,
last_unit:u[u.length-1].t,after_units:prog.slice(-4).map(r=>r.unit+' '+r.t),
perHour,big_gaps:big,score_rows:rows,
ruling112_sha:sha(L+'/orchestrator/coordinator-rulings-112.md')},null,1));
