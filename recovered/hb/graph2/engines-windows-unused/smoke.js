const path=require('path'),fs=require('fs');
const T=()=>Number(process.hrtime.bigint())/1e6;
const N=2000, edges=[]; let s=12345; const rnd=()=>{s=(s*1103515245+12345)&0x7fffffff;return s;};
for(let i=0;i<N;i++){ for(let k=0;k<4;k++){ const j=rnd()%N; if(j!==i)edges.push([i,j,k%2?'calls':'imports']); } }
async function ladybug(){ const out={}; try{
  const lbug=require('@ladybugdb/core'); out.version=lbug.VERSION||'loaded';
  const dir=path.join(__dirname,'lb-smoke'); fs.rmSync(dir,{recursive:true,force:true});
  const db=new lbug.Database(dir); const c=new lbug.Connection(db);
  const q=async(x)=>{ const r=await c.query(x); return r.getAll?await r.getAll():r; };
  await q('CREATE NODE TABLE N(id INT64, PRIMARY KEY(id))'); await q('CREATE REL TABLE E(FROM N TO N, kind STRING)');
  fs.writeFileSync('n.csv',Array.from({length:N},(_,i)=>i).join('\n')); fs.writeFileSync('e.csv',edges.map(e=>e.join(',')).join('\n'));
  let a=T(); await q(`COPY N FROM '${path.join(__dirname,'n.csv').split(path.sep).join('/')}'`); await q(`COPY E FROM '${path.join(__dirname,'e.csv').split(path.sep).join('/')}'`); out.load_ms=(T()-a).toFixed(0);
  a=T(); let r=await q('MATCH (a:N {id: 7})-[:E*1..3]->(b:N) RETURN count(DISTINCT b) AS n'); out.reach3=Number(r[0].n); out.reach3_ms=(T()-a).toFixed(1);
  a=T(); r=await q("MATCH (a:N {id: 7})-[e:E*1..3 (r, n | WHERE r.kind = 'calls')]->(b:N) RETURN count(DISTINCT b) AS n"); out.reach3_calls_only=Number(r[0].n); out.typed_ms=(T()-a).toFixed(1);
  a=T(); r=await q('MATCH p=(a:N {id: 7})-[:E* SHORTEST 1..6]->(b:N {id: 99}) RETURN length(p) AS len'); out.shortest_len=r.length?Number(r[0].len):null; out.shortest_ms=(T()-a).toFixed(1);
  try{ a=T(); await q('INSTALL algo'); await q('LOAD algo'); out.algo_install_ms=(T()-a).toFixed(0);
    await q("CALL PROJECT_GRAPH('g', ['N'], ['E'])"); a=T(); r=await q("CALL page_rank('g') RETURN node.id AS id, rank ORDER BY rank DESC LIMIT 3"); out.pagerank_top=r.map(x=>x.id+':'+Number(x.rank).toFixed(5)).join(' '); out.pagerank_ms=(T()-a).toFixed(1);
  }catch(e){ out.algo_error=String(e.message||e).slice(0,300); }
}catch(e){ out.error=String(e.stack||e).slice(0,500); } return out; }
async function duck(){ const out={}; try{
  const {DuckDBInstance}=require('@duckdb/node-api'); const inst=await DuckDBInstance.create(':memory:'); const c=await inst.connect();
  const q=async(x)=>{ const r=await c.runAndReadAll(x); return r.getRowObjects(); };
  out.version=(await q('select version() v'))[0].v;
  await q('create table n(id bigint primary key)'); await q('create table e(src bigint, dst bigint, kind varchar)');
  let a=T(); await q(`insert into n select * from range(${N})`); await q(`copy e from '${path.join(__dirname,'e.csv').split(path.sep).join('/')}' (header false)`); out.load_ms=(T()-a).toFixed(0);
  a=T(); let r=await q('with recursive r(id,d) as (select 7::bigint,0 union select e.dst,r.d+1 from r join e on e.src=r.id where r.d<3) select count(distinct id)-1 n from r where id<>7 or d>0'); out.reach3_cte=Number(r[0].n); out.cte_ms=(T()-a).toFixed(1);
  try{ a=T(); await q('INSTALL duckpgq FROM community'); await q('LOAD duckpgq'); out.pgq_install_ms=(T()-a).toFixed(0);
    await q('CREATE PROPERTY GRAPH g VERTEX TABLES (n) EDGE TABLES (e SOURCE KEY (src) REFERENCES n (id) DESTINATION KEY (dst) REFERENCES n (id))');
    a=T(); r=await q('SELECT count(DISTINCT bid) n FROM GRAPH_TABLE (g MATCH (a:n)-[x:e]->{1,3}(b:n) WHERE a.id = 7 COLUMNS (b.id AS bid))'); out.reach3_pgq=Number(r[0].n); out.pgq_ms=(T()-a).toFixed(1);
    try{ a=T(); r=await q('SELECT * FROM pagerank(g, n, e) ORDER BY pagerank DESC LIMIT 3'); out.pagerank_top=JSON.stringify(r,(k,v)=>typeof v==='bigint'?Number(v):v).slice(0,200); out.pagerank_ms=(T()-a).toFixed(1);}catch(e){ out.pagerank_error=String(e.message||e).slice(0,300); }
  }catch(e){ out.pgq_error=String(e.message||e).slice(0,400); }
}catch(e){ out.error=String(e.stack||e).slice(0,500); } return out; }
(async()=>{ console.log('node',process.version,'edges',edges.length); console.log('LADYBUG',JSON.stringify(await ladybug(),null,1)); console.log('DUCKDB',JSON.stringify(await duck(),null,1)); process.exit(0); })();
