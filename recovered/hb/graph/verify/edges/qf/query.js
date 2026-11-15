// Queries the graph: who depends on a file, how big the answer is, how long traversal takes, and the same in SQLite.
const fs=require('fs'),cp=require('child_process');
const repo=process.argv[2],target=process.argv[3];
const T=()=>Number(process.hrtime.bigint())/1e6;
let a=T(); const g=JSON.parse(fs.readFileSync('graph.json','utf8')); const loadMs=T()-a;
const F=g.files,N=F.length; const rev=Array.from({length:N},()=>[]),cit=Array.from({length:N},()=>[]),symUse={};
for(const [s,d,k,x] of g.edges){ if(k==='cites')cit[d].push([s,x]); else { rev[d].push(s); if(x){ (symUse[d]=symUse[d]||{}); (symUse[d][x]=symUse[d][x]||new Set()).add(s); } } }
const uniq=x=>[...new Set(x)];
function closure(i){ const seen=new Set([i]),q=[i]; while(q.length){ const n=q.pop(); for(const m of rev[n]) if(!seen.has(m)){seen.add(m);q.push(m);} } seen.delete(i); return seen; }
const isCode=f=>/\.(py|ts|tsx|js|jsx|mjs)$/.test(f); const isTest=f=>/(^|\/)(tests?|__tests__)\/|\.test\.|(^|\/)test_|conftest/.test(f);
const code=[]; F.forEach((f,i)=>{ if(isCode(f))code.push(i); });
a=T(); const sizes=code.map(i=>closure(i).size); const allMs=T()-a;
const direct=code.map(i=>uniq(rev[i]).length);
const q=(arr,p)=>{const s=arr.slice().sort((x,y)=>x-y);return s[Math.floor((s.length-1)*p)];};
console.log('load graph ms',loadMs.toFixed(1),'| who-depends-on-this for all',code.length,'code files: total ms',allMs.toFixed(1),'| per query microseconds',(allMs*1000/code.length).toFixed(0));
console.log('direct dependants per file: median',q(direct,.5),'p90',q(direct,.9),'max',q(direct,1),'| files nobody imports',direct.filter(x=>x===0).length);
console.log('all dependants (any distance): median',q(sizes,.5),'p75',q(sizes,.75),'p90',q(sizes,.9),'max',q(sizes,1),'| files with 15 or fewer',sizes.filter(x=>x<=15).length,'of',code.length,'| with over 50',sizes.filter(x=>x>50).length);
const hubs=code.map((i,k)=>[F[i],direct[k],sizes[k]]).sort((x,y)=>y[2]-x[2]).slice(0,6); console.log('widest reach:',hubs.map(h=>h[0]+' ('+h[1]+' direct, '+h[2]+' in all)').join('; '));
const t=F.indexOf(target); const d=uniq(rev[t]).map(i=>F[i]).sort(); const all=[...closure(t)].map(i=>F[i]);
const tests=all.filter(isTest); const docs=uniq(cit[t].map(c=>F[c[0]]));
const syms=Object.entries(symUse[t]||{}).map(([n,s])=>[n,s.size]).sort((x,y)=>y[1]-x[1]);
let ans='What depends on '+target+'\nDirect ('+d.length+'):\n'+d.join('\n')+'\nNames imported from it: '+syms.map(s=>s[0]+' x'+s[1]).join(', ')+'\nFurther out: '+(all.length-d.length)+' more files, '+tests.length+' test files in all\nDocs that cite it ('+docs.length+'): '+cit[t].map(c=>F[c[0]]+':'+c[1].split('|')[0]).join(', ')+'\n';
fs.writeFileSync('answer.txt',ans);
const sz=f=>{try{return fs.statSync(repo+'/'+f).size;}catch(e){return 0;}};
const dBytes=d.reduce((s,f)=>s+sz(f),0), allBytes=all.reduce((s,f)=>s+sz(f),0);
let grepOut=''; try{grepOut=cp.execSync('git -C '+repo+' grep -n -E "jobs\.service|jobs import .*service|from \.service|from \. import .*service" -- backend',{encoding:'utf8'});}catch(e){}
console.log('TARGET',target,'| own size bytes',sz(target),'| direct',d.length,'| all',all.length,'| tests',tests.length,'| docs citing',docs.length,'| citation lines',cit[t].length,'| names imported',syms.length);
console.log('answer chars',ans.length,'(about',Math.round(ans.length/4),'tokens) | reading the direct dependants whole: bytes',dBytes,'(about',Math.round(dBytes/4),'tokens) | reading all dependants whole: bytes',allBytes,'(about',Math.round(allBytes/4),'tokens)');
console.log('a text search for the same thing returns',grepOut.split('\n').filter(Boolean).length,'lines,',grepOut.length,'chars (about',Math.round(grepOut.length/4),'tokens)');
// ---------- the same edges in SQLite (a relational table) with a recursive query
try{ const {DatabaseSync}=require('node:sqlite'); if(fs.existsSync('graph.db'))fs.unlinkSync('graph.db'); const db=new DatabaseSync('graph.db');
  db.exec('create table edge(src integer,dst integer,kind text,detail text); create index edge_dst on edge(dst,src);');
  const ins=db.prepare('insert into edge values(?,?,?,?)'); db.exec('begin'); for(const e of g.edges)ins.run(e[0],e[1],e[2],e[3]); db.exec('commit');
  const st=db.prepare("with recursive r(n) as (select ? union select src from edge join r on dst=n where kind<>'cites') select count(*) c from r");
  a=T(); const c1=st.get(t).c-1; const oneMs=T()-a; a=T(); for(const i of code)st.get(i); const sqlAll=T()-a; db.close();
  console.log('SQLite: same answer',c1,'(graph walk gave',all.length,') | one query ms',oneMs.toFixed(2),'| all',code.length,'queries ms',sqlAll.toFixed(0),'| per query ms',(sqlAll/code.length).toFixed(2),'| db file bytes',fs.statSync('graph.db').size);
}catch(e){ console.log('SQLite not run:',e.message); }
