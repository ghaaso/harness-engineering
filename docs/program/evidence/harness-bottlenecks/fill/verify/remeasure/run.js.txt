const {compute,W}=require('./agg.js');const fs=require('fs');
const pct=(x,t)=>(100*x/t).toFixed(1);
function line(name,g){const t=g.a+g.b+g.c+g.d;return `${name}: calls=${g.calls} sumContext=${(g.A/1e6).toFixed(1)}M attributed=${(t/1e6).toFixed(1)}M (${pct(t,g.A)}%) | a=${pct(g.a,t)} b=${pct(g.b,t)} c=${pct(g.c,t)} d=${pct(g.d,t)} | a: first=${pct(g.a_first,t)} reopen=${pct(g.a_reopen,t)} (of which exact-dup=${pct(g.a_dup,t)}) rest=${pct(g.a_rest,t)} | b thinking=${pct(g.b_think,t)} | unscaledEst/actual=${(g.est/g.A).toFixed(3)}`;}
const v=process.argv[2]?JSON.parse(process.argv[2]):{};const R=compute(v);console.log('VARIANT',JSON.stringify(v));
for(const k of ['all','slice','root','sub'])console.log(line(k,R[k]));
if(process.argv[3]){const g=R.all;const tot=g.a+g.b+g.c+g.d;const f=Object.entries(g.files).sort((x,y)=>y[1]-x[1]);
 const top=f.slice(0,30);const s=top.reduce((a,x)=>a+x[1],0);console.log('distinct files (repo-relative):',g.rkeys.size,' distinct (absolute, worktree-separate):',g.nkeys.size);
 console.log('top30 share of all tokens',pct(s,tot),'% ; share of a',pct(s,g.a),'% ; all file reads share',pct(f.reduce((a,x)=>a+x[1],0),tot));
 top.forEach((x,i)=>console.log(i+1,x[0],pct(x[1],tot)+'%',(x[1]/1e6).toFixed(1)+'M'));}
