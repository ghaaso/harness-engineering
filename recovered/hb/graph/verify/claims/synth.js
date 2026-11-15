// Synthetic function-level call graph at N nodes, E edges (preferential attachment + 5% random back edges for cycles).
// Times the same reverse-reach query in memory (BFS) and in SQLite (recursive CTE), for random targets and the top hubs.
const fs=require('fs'); const {DatabaseSync}=require('node:sqlite');
const N=+process.argv[2], E=+process.argv[3], seed0=+(process.argv[4]||7), PP=+(process.argv[5]||0.3);
let seed=seed0; const rnd=()=>{ seed=(seed*1103515245+12345)%2147483648; return seed/2147483648; };
const T=()=>Number(process.hrtime.bigint())/1e6;
let a=T(); const src=new Int32Array(E), dst=new Int32Array(E); const deg=new Int32Array(N); const pool=[]; // pool for preferential attachment
const per=E/N; let e=0;
for(let i=1;i<N&&e<E;i++){ const k=Math.max(1,Math.round(per*(0.5+rnd())));
  for(let j=0;j<k&&e<E;j++){ let t;
    if(rnd()<0.05) t=Math.floor(rnd()*N); else if(pool.length&&rnd()<PP) t=pool[Math.floor(rnd()*pool.length)]; else t=Math.floor(rnd()*i);
    if(t===i)continue; src[e]=i; dst[e]=t; e++; deg[t]++; pool.push(t); } }
const M=e; const genMs=T()-a;
// in-memory reverse adjacency (CSR)
a=T(); const off=new Int32Array(N+1); for(let x=0;x<M;x++)off[dst[x]+1]++; for(let i=0;i<N;i++)off[i+1]+=off[i];
const adj=new Int32Array(M); const fill=off.slice(0,N); for(let x=0;x<M;x++)adj[fill[dst[x]]++]=src[x]; const csrMs=T()-a;
const mark=new Int32Array(N); let stamp=0; const stack=new Int32Array(N);
function reach(t,maxDepth){ stamp++; mark[t]=stamp; let c=0;
  if(!maxDepth){ let sp=0; stack[sp++]=t; while(sp){ const n=stack[--sp]; for(let p=off[n];p<off[n+1];p++){ const m=adj[p]; if(mark[m]!==stamp){mark[m]=stamp;c++;stack[sp++]=m;} } } return c; }
  let fr=[t]; for(let d=0;d<maxDepth;d++){ const nx=[]; for(const n of fr) for(let p=off[n];p<off[n+1];p++){ const m=adj[p]; if(mark[m]!==stamp){mark[m]=stamp;c++;nx.push(m);} } fr=nx; } return c; }
// SQLite
const dbf='synth-'+N+'.db'; if(fs.existsSync(dbf))fs.unlinkSync(dbf); const db=new DatabaseSync(dbf);
a=T(); db.exec('pragma journal_mode=off; pragma synchronous=off; create table edge(src integer,dst integer)'); const ins=db.prepare('insert into edge values(?,?)');
db.exec('begin'); for(let x=0;x<M;x++)ins.run(src[x],dst[x]); db.exec('commit'); db.exec('create index edge_dst on edge(dst,src)'); const loadMs=T()-a;
const full=db.prepare('with recursive r(n) as (select ? union select src from edge join r on dst=n) select count(*)-1 c from r');
const d2=db.prepare('with recursive r(n,d) as (select ?,0 union select e.src,r.d+1 from edge e join r on e.dst=r.n where r.d<2) select count(distinct n)-1 c from r');
// targets: 200 random + 5 top hubs by in-degree
const tg=[]; for(let i=0;i<200;i++)tg.push(Math.floor(rnd()*N)); const hubs=[...Array(N).keys()].sort((x,y)=>deg[y]-deg[x]).slice(0,5);
const q=(arr,p)=>{const s=arr.slice().sort((x,y)=>x-y);return s[Math.floor((s.length-1)*p)];};
function bench(list,label){ const memT=[],sqlT=[],sz=[],sqlD2=[],memD2=[],szD2=[]; let mism=0;
  for(const t of list){ let b=T(); const c=reach(t); memT.push(T()-b); b=T(); const s=full.get(t).c; sqlT.push(T()-b); if(s!==c)mism++; sz.push(c);
    b=T(); const c2=reach(t,2); memD2.push(T()-b); b=T(); const s2=d2.get(t).c; sqlD2.push(T()-b); szD2.push(c2); if(s2!==c2)mism++; }
  const f=x=>+x.toFixed(3);
  console.log(JSON.stringify({label,n:list.length,reachMedian:q(sz,.5),reachMax:q(sz,1),memMsMedian:f(q(memT,.5)),memMsMax:f(q(memT,1)),sqlMsMedian:f(q(sqlT,.5)),sqlMsMax:f(q(sqlT,1)),
    depth2ReachMedian:q(szD2,.5),depth2ReachMax:q(szD2,1),memD2MsMax:f(q(memD2,1)),sqlD2MsMedian:f(q(sqlD2,.5)),sqlD2MsMax:f(q(sqlD2,1)),mismatches:mism})); }
console.log(JSON.stringify({N,E:M,genMs:+genMs.toFixed(0),csrMs:+csrMs.toFixed(1),sqliteLoadMs:+loadMs.toFixed(0),dbBytes:fs.statSync(dbf).size,memEdgeBytes:(M*4*2)+(N+1)*4,heapMB:+(process.memoryUsage().heapUsed/1e6).toFixed(0),rssMB:+(process.memoryUsage().rss/1e6).toFixed(0),maxInDegree:deg[hubs[0]]}));
bench(tg,'random'); bench(hubs,'hubs'); db.close(); fs.unlinkSync(dbf);
