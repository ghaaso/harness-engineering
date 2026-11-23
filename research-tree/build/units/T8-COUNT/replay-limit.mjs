import { readFileSync, readdirSync } from 'node:fs';
const P='C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering';
const d=readdirSync(P).find(x=>x.startsWith('ad4e59df')&&!x.endsWith('.jsonl'));
const files=[`${P}/${d}.jsonl`,...readdirSync(`${P}/${d}/subagents`).filter(f=>f.endsWith('.jsonl')).map(f=>`${P}/${d}/subagents/${f}`)];
const refusals=[];
for(const f of files) for(const l of readFileSync(f,'utf8').split('\n')){ if(!l.includes('Concurrent subagent limit')) continue; let o; try{o=JSON.parse(l)}catch{continue}
  if(o.type!=='user') continue; const c=o.message?.content; if(!Array.isArray(c)) continue; for(const b of c) if(b.type==='tool_result'&&b.is_error&&JSON.stringify(b.content).length<600&&JSON.stringify(b.content).includes('Concurrent subagent limit')) refusals.push({t:Date.parse(o.timestamp),f:f.slice(-30),txt:JSON.stringify(b.content).slice(0,160)}); }
const L = readFileSync('C:/Users/User/Documents/projects/harness-engineering/.claude/logs/plan-gate.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)).filter(o=>o.sess==='ad4e59df'&&(o.ev==='run'||o.ev==='end'));
const liveAt=t=>{const s=new Set(); for(const o of L){ if(o.t>t) break; if(o.ev==='run') s.add(o.agent); else s.delete(o.agent);} return s.size;};
console.log('refusals',refusals.length, refusals[0]?.txt);
for(const r of refusals.sort((a,b)=>a.t-b.t)) console.log(new Date(r.t).toISOString(), 'live',liveAt(r.t), r.f);
// successful runs: live count just before each run
const hist={}; for(const o of L) if(o.ev==='run'){const n=liveAt(o.t-1); hist[n]=(hist[n]||0)+1;} console.log('live just before each successful start:',JSON.stringify(hist));
