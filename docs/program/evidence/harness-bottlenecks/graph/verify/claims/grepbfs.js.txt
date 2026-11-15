// Simulates learning the transitive "who depends on X" by repeated grep -l calls, using the graph's edges as the oracle for what each grep returns.
const fs=require('fs'); const g=JSON.parse(fs.readFileSync('graph.json','utf8')); const F=g.files;
const rev=F.map(()=>new Set()); for(const [s,d,k] of g.edges) if(k!=='cites') rev[d].add(s);
const isTest=f=>/(^|\/)(tests?|__tests__)\/|\.test\.|(^|\/)test_|conftest/.test(f);
function sim(target,skipTests){ const t=F.indexOf(target); const seen=new Set([t]); const q=[t]; let calls=0,chars=0;
  while(q.length){ const n=q.shift(); if(skipTests&&n!==t&&isTest(F[n]))continue; calls++; const out=[...rev[n]].map(i=>F[i]).join('\n'); chars+=out.length+1;
    for(const m of rev[n]) if(!seen.has(m)){seen.add(m);q.push(m);} }
  return {target,skipTests,calls,outChars:chars,outTokens:Math.round(chars/4),reach:seen.size-1}; }
const tg=process.argv[2]||'backend/app/features/jobs/service.py';
console.log(JSON.stringify(sim(tg,false))); console.log(JSON.stringify(sim(tg,true)));
// all code files: how many grep rounds (calls) a session would need for the transitive answer, skipping test files as leaves
const isCode=f=>/\.(py|ts|tsx|js|jsx|mjs)$/.test(f); const R=F.filter(isCode).map(f=>sim(f,true));
const q=(arr,p)=>{const s=arr.slice().sort((x,y)=>x-y);return s[Math.floor((s.length-1)*p)];};
const calls=R.map(r=>r.calls), toks=R.map(r=>r.outTokens);
console.log('ALL',R.length,'files | grep calls for full reach: median',q(calls,.5),'p75',q(calls,.75),'p90',q(calls,.9),'max',q(calls,1),'| files needing 1 call',calls.filter(c=>c<=1).length,'| needing 2-5',calls.filter(c=>c>=2&&c<=5).length,'| needing over 5',calls.filter(c=>c>5).length);
console.log('grep output tokens for full reach: median',q(toks,.5),'p90',q(toks,.9),'max',q(toks,1),'| total calls over all files',calls.reduce((a,b)=>a+b,0));
