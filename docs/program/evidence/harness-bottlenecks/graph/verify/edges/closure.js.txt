const fs=require('fs'); const h=JSON.parse(fs.readFileSync('pyall.json','utf8')).filter(x=>x.to!=='UNRES');
const rev={}; for(const x of h){ if(x.src===x.to)continue; (rev[x.to]=rev[x.to]||new Set()).add(x.src); }
const t='backend/app/features/jobs/service.py'; const direct=[...(rev[t]||[])].sort();
const seen=new Set([t]),q=[t]; while(q.length){ const n=q.pop(); for(const m of (rev[n]||[]))if(!seen.has(m)){seen.add(m);q.push(m);} } seen.delete(t);
const g=JSON.parse(fs.readFileSync('../../graph.json','utf8')); const F=g.files; const grev={}; for(const [s,d,k] of g.edges){ if(k==='cites')continue; (grev[F[d]]=grev[F[d]]||new Set()).add(F[s]); }
const gs=new Set([t]),gq=[t]; while(gq.length){ const n=gq.pop(); for(const m of (grev[n]||[]))if(!gs.has(m)){gs.add(m);gq.push(m);} } gs.delete(t);
console.log('mine direct',direct.length,'graph direct',(grev[t]||new Set()).size); console.log('mine all',seen.size,'graph all',gs.size);
console.log('only mine',[...seen].filter(x=>!gs.has(x)),'only graph',[...gs].filter(x=>!seen.has(x)));
const further=[...seen].filter(x=>!direct.includes(x)).sort(); console.log('further out:',further.join(' '));
// file-level python pair agreement overall
const mp=new Set(h.filter(x=>x.src!==x.to).map(x=>x.src+'|'+x.to)); const gp=new Set(g.edges.filter(e=>e[2]!=='cites'&&/\.py$/.test(F[e[0]])).map(e=>F[e[0]]+'|'+F[e[1]]));
console.log('python file pairs: mine',mp.size,'graph',gp.size,'both',[...mp].filter(x=>gp.has(x)).length); console.log('only mine',[...mp].filter(x=>!gp.has(x))); console.log('only graph',[...gp].filter(x=>!mp.has(x)));
