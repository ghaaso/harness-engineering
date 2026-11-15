const fs=require('fs');
const rows=fs.readFileSync('errors.jsonl','utf8').trim().split('\n').map(JSON.parse);
const g={};
for(const r of rows){
 let k=r.t.replace(/[A-Za-z]:[\/][^\s'"]*/g,'<P>').replace(/\d+/g,'N').replace(/\s+/g,' ').slice(0,90);
 const sess=r.f.replace(/.*projects[\/]/,'').split(/[\/]/);
 const s=sess[0].slice(-40)+'/'+(sess[1]||'').slice(0,8);
 (g[k]=g[k]||{n:0,s:new Set(),p:new Set(),ex:r}).n++;g[k].s.add(s);g[k].p.add(sess[0].slice(0,50));
}
Object.entries(g).filter(([k,v])=>v.s.size>=3).sort((a,b)=>b[1].s.size-a[1].s.size).slice(0,45).forEach(([k,v])=>console.log(v.n,v.s.size,v.p.size,k,'|',v.ex.call&&v.ex.call.name));
