import fs from 'node:fs';
const T = { mainFiles:0, helperFiles:0, lines:0, notJson:0, types:{}, versions:{}, asst:{}, user:{} };
const add = (a,b)=>{ for (const k in b) a[k]=(a[k]||0)+b[k]; };
const turns=[]; let coord=0;
for (const f of fs.readdirSync('out')) { const a = JSON.parse(fs.readFileSync('out/'+f));
  for (const k of ['mainFiles','helperFiles','lines','notJson']) T[k]+=a[k];
  for (const k of ['types','versions','asst','user']) add(T[k], a[k]);
  for (const s of a.sessions) { coord++; for (const t of s.turns) if (!isNaN(t.start) && !isNaN(t.end)) turns.push({...t, sid:s.sid, folder:a.folder.slice(0,40)}); } }
const ms = turns.map(t=>(t.end-t.start)).sort((x,y)=>x-y);
const q = p => ms[Math.min(ms.length-1, Math.floor(p*(ms.length-1)))]/60000;
const alarm = 3600000;
console.log(JSON.stringify(T,null,1));
console.log('coord',coord,'turns',turns.length,'median',q(.5),'q3',q(.75),'p95',q(.95),'max',ms[ms.length-1]/60000);
console.log('over .5',ms.filter(x=>x>alarm*.5).length,'over 1',ms.filter(x=>x>alarm).length);
const st={}; for (const t of turns) st[t.starter]=(st[t.starter]||0)+1; console.log('starters',JSON.stringify(st));
turns.sort((a,b)=>(b.end-b.start)-(a.end-a.start));
for (const t of turns.slice(0,5)) console.log(t.sid, new Date(t.start).toISOString(), ((t.end-t.start)/60000).toFixed(1), t.starter, t.agents, t.folder);
