import fs from 'node:fs';
const turns=[]; let coord=0;
for (const f of fs.readdirSync('out2')) { const a=JSON.parse(fs.readFileSync('out2/'+f)); for (const s of a.sessions){coord++; for(const t of s.turns) if(!isNaN(t.start)&&!isNaN(t.end)) turns.push({...t,sid:s.sid});}}
const M=60000, A=3600000;
for (const t of turns){ t.span=t.end-t.start; let rm=0; for(const g of t.gaps) if(g.ms>30*M && g.n===1 && !/:bg/.test(g.cause)) rm+=g.ms; t.adj=t.span-rm;
  t.big=t.gaps.slice().sort((a,b)=>b.ms-a.ms)[0]||null; }
const stats=(k)=>{const v=turns.map(t=>t[k]).sort((a,b)=>a-b); const q=p=>(v[Math.floor(p*(v.length-1))]/M).toFixed(2); return `median ${q(.5)} Q3 ${q(.75)} p95 ${q(.95)} max ${(v[v.length-1]/M).toFixed(1)}; >30: ${v.filter(x=>x>A*.5).length}; >60: ${v.filter(x=>x>A).length}`;};
console.log('coord',coord,'turns',turns.length); console.log('span',stats('span')); console.log('adj',stats('adj'));
const cs={}; for(const t of turns) if(t.big&&t.big.ms>30*M){const k=t.big.cause; cs[k]=(cs[k]||0)+1;} console.log('causes of largest gap >30min',JSON.stringify(cs));
console.log('turns with an idle gap >30min',turns.filter(t=>t.gaps.some(g=>g.ms>30*M&&g.cause==='idle')).length);
turns.sort((a,b)=>b.span-a.span);
console.log('TOP span'); for(const t of turns.slice(0,10)) console.log(t.sid,new Date(t.start).toISOString(),(t.span/M).toFixed(1),t.starter,t.big?((t.big.ms/M).toFixed(1)+' '+t.big.cause+' n'+t.big.n):'none','adj',(t.adj/M).toFixed(1));
turns.sort((a,b)=>b.adj-a.adj);
console.log('TOP adj'); for(const t of turns.slice(0,10)) console.log(t.sid,new Date(t.start).toISOString(),(t.adj/M).toFixed(1),t.starter,t.big?((t.big.ms/M).toFixed(1)+' '+t.big.cause+' n'+t.big.n):'none','span',(t.span/M).toFixed(1));
console.log('adj>30 list'); for(const t of turns.filter(t=>t.adj>30*M)) console.log(t.sid.slice(0,8),(t.adj/M).toFixed(1),t.gaps.map(g=>(g.ms/M).toFixed(0)+g.cause).join(','));
const M2=60000; const hasIdle=t=>t.gaps.some(g=>g.ms>30*M2&&g.cause==='idle');
for (const th of [30,60]) { const L=turns.filter(t=>t.adj>th*M2); console.log('adj>'+th,L.length,'with idle gap>30:',L.filter(hasIdle).length,'without:',L.filter(t=>!hasIdle(t)).length,'of which no gap>30 at all:',L.filter(t=>!t.gaps.some(g=>g.ms>30*M2)).length);
 const R=L.filter(t=>!hasIdle(t)); console.log(' without-idle: max adj',Math.max(...R.map(t=>t.adj))/M2, 'idle-removed span:'); }
// span with idle>30 gaps also removed
for (const t of turns){ t.adj2=t.adj; for(const g of t.gaps) if(g.ms>30*M2&&g.cause==='idle') t.adj2-=g.ms; }
const v=turns.map(t=>t.adj2).sort((a,b)=>a-b); console.log('adj2 (also idle>30 removed) max',v[v.length-1]/M2,'>30',v.filter(x=>x>30*M2).length,'>60',v.filter(x=>x>60*M2).length);
const top=turns.slice().sort((a,b)=>b.adj2-a.adj2).slice(0,5); for(const t of top) console.log(t.sid.slice(0,8),new Date(t.start).toISOString(),(t.adj2/M2).toFixed(1),t.starter);
const b=turns.flatMap(t=>t.gaps).filter(g=>g.ms>30*M2); console.log('gaps>30min total',b.length,'single fg Bash',b.filter(g=>g.cause==='Bash').length,'idle',b.filter(g=>g.cause==='idle').length,'other',b.filter(g=>g.cause!=='Bash'&&g.cause!=='idle').map(g=>g.cause));
console.log('turns with a Bash gap >30',turns.filter(t=>t.gaps.some(g=>g.ms>30*M2&&g.cause==='Bash')).length);
