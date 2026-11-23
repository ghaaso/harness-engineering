import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
const P='C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering';
const L = readFileSync('C:/Users/User/Documents/projects/harness-engineering/.claude/logs/plan-gate.jsonl','utf8').split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean);
const T0=L[0].t;
const ends=new Map(); for(const o of L) if(o.ev==='end'&&o.agent) (ends.get(o.agent)||ends.set(o.agent,[]).get(o.agent)).push(o.t);
// allow->start, allow->run delays
const st=new Map(L.filter(o=>o.ev==='start').map(o=>[o.tu,o])); const runT=new Map(); for(const o of L) if(o.ev==='run'&&o.agent&&!runT.has(o.agent)) runT.set(o.agent,o.t);
const dl=[]; for(const a of L.filter(o=>o.ev==='allow'&&!o.cont)){const s=st.get(a.tu); if(s) dl.push([(s.t-a.t)/1000, s.agent&&runT.has(s.agent)?(runT.get(s.agent)-a.t)/1000:null]);}
dl.sort((x,y)=>y[0]-x[0]); console.log('allow->start s, n',dl.length,'max',dl.slice(0,5).map(d=>d.join('/')).join(' '), 'median', dl[Math.floor(dl.length/2)]);
const sess=readdirSync(P).filter(d=>existsSync(`${P}/${d}/subagents`));
const gaps=[]; const fin=[]; let nAg=0, unfinished=[];
for(const s of sess){ const dir=`${P}/${s}/subagents`; const metas=readdirSync(dir).filter(f=>f.endsWith('.meta.json'));
 const meta=new Map(); for(const f of metas){const id=f.slice(6,-10); try{meta.set(id,{...JSON.parse(readFileSync(`${dir}/${f}`,'utf8')),mm:statSync(`${dir}/${f}`).mtimeMs})}catch{}}
 for(const [id,m] of meta){ const tf=`${dir}/agent-${id}.jsonl`; if(!existsSync(tf)) continue; const tm=statSync(tf).mtimeMs;
  if(m.finished) fin.push((tm-m.mm)/1000); else unfinished.push([s.slice(0,8),id,new Date(tm).toISOString()]);
  if(tm<T0) continue; nAg++;
  const ts=readFileSync(tf,'utf8').split('\n').filter(Boolean).map(l=>{const k=/"timestamp":"([^"]+)"/.exec(l);return k?Date.parse(k[1]):null}).filter(Boolean).sort((a,b)=>a-b);
  // subtree: descendants' timestamps too
  const kids=[...meta].filter(([k,v])=>{let p=v.parentAgentId,g=0;while(p&&g<5){if(p===id)return true;p=meta.get(p)?.parentAgentId;g++}return false}).map(([k])=>k);
  let tsT=[...ts]; for(const k of kids){const kf=`${dir}/agent-${k}.jsonl`; if(existsSync(kf)) tsT.push(...readFileSync(kf,'utf8').split('\n').map(l=>{const q=/"timestamp":"([^"]+)"/.exec(l);return q?Date.parse(q[1]):null}).filter(Boolean));}
  tsT.sort((a,b)=>a-b); const e=ends.get(id)||[];
  const g=(arr)=>{let mx=0,at=0; for(let i=1;i<arr.length;i++){const d=arr[i]-arr[i-1]; if(e.some(t=>t>=arr[i-1]-1000&&t<=arr[i])) continue; if(d>mx){mx=d;at=arr[i-1];}} return [mx/60000,at];};
  const [own,at]=g(ts), [tree]=g(tsT);
  gaps.push({s:s.slice(0,8),id,own,tree,kids:kids.length,desc:(m.description||'').slice(0,40),at:new Date(at).toISOString()});
 }}
fin.sort((a,b)=>b-a); console.log('finished: transcript mtime - meta mtime (s), n',fin.length,'max',fin.slice(0,6).map(x=>x.toFixed(1)).join(' '),'min',fin.slice(-4).map(x=>x.toFixed(1)).join(' '));
console.log('unfinished metas',unfinished.length, unfinished.slice(0,20).map(u=>u.join(' ')).join('\n '));
const q=(k,p)=>{const a=gaps.map(x=>x[k]).sort((a,b)=>a-b);return a[Math.floor(p*(a.length-1))].toFixed(1)};
console.log('helpers',nAg,'own gap median',q('own',.5),'p90',q('own',.9),'p99',q('own',.99),'max',q('own',1),'| tree gap median',q('tree',.5),'p90',q('tree',.9),'p99',q('tree',.99),'max',q('tree',1));
for(const x of gaps.sort((a,b)=>b.own-a.own).slice(0,10)) console.log(' own',x.own.toFixed(1),'tree',x.tree.toFixed(1),x.kids,x.s,x.id,x.desc,x.at);
