const fs=require('fs'); const g=JSON.parse(fs.readFileSync('../../graph.json','utf8')); const F=g.files;
const sample=JSON.parse(fs.readFileSync('sample30.json','utf8')); const hits=JSON.parse(fs.readFileSync('jsfind.json','utf8'));
const which=process.argv[2]||'web';
const gin={}; for(const [s,d,k] of g.edges){ if(k==='cites')continue; const key=F[d]; (gin[key]=gin[key]||{}); (gin[key][F[s]]=gin[key][F[s]]||new Set()).add(k); }
let T=0,M=0,X=0;
for(const t of sample[which]){ const mine={}; for(const h of hits)if(h.to===t){ (mine[h.src]=mine[h.src]||[]).push(h.line+': '+h.text); }
  const graph=gin[t]||{}; const all=new Set([...Object.keys(mine),...Object.keys(graph)]);
  let tt=0,mm=0,xx=0; const notes=[];
  for(const s of all){ const a=!!mine[s],b=!!graph[s]; if(a&&b)tt++; else if(a){mm++;notes.push('  MISSED '+s+' :: '+mine[s].join(' || '));} else {xx++;notes.push('  GRAPH-ONLY '+s+' kinds='+[...graph[s]]);} }
  T+=tt;M+=mm;X+=xx; console.log(t,'| both',tt,'| mine-only',mm,'| graph-only',xx); notes.forEach(n=>console.log(n)); }
console.log('TOTAL both',T,'mine-only',M,'graph-only',X);
