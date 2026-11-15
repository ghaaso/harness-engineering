// Linux smoke test of both engines: load a sample graph, typed multi-hop reach, shortest path, PageRank and communities.
const path=require('path'),fs=require('fs'),os=require('os'); const T=()=>Number(process.hrtime.bigint())/1e6; const here=__dirname;
const N=2000, edges=[]; let s=12345; const rnd=()=>{s=(s*1103515245+12345)&0x7fffffff;return s;};
for(let i=0;i<N;i++){ for(let k=0;k<4;k++){ const j=rnd()%N; if(j!==i)edges.push([i,j,k%2?'calls':'imports']); } }
fs.writeFileSync(here+'/n.csv',Array.from({length:N},(_,i)=>i).join('\n')); fs.writeFileSync(here+'/e.csv',edges.map(e=>e.join(',')).join('\n'));
const J=r=>JSON.stringify(r,(k,v)=>typeof v==='bigint'?Number(v):v).slice(0,300);
async function ladybug(){ const out={}; try{ const lbug=require('@ladybugdb/core'); out.version=lbug.VERSION;
  const dir=here+'/lb-smoke'; fs.rmSync(dir,{recursive:true,force:true}); const db=new lbug.Database(dir); const c=new lbug.Connection(db);
  const q=async(x)=>{ const r=await c.query(x); return await r.getAll(); };
  await q('CREATE NODE TABLE N(id INT64, PRIMARY KEY(id))'); await q('CREATE REL TABLE E(FROM N TO N, kind STRING)');
  await q(`COPY N FROM '${here}/n.csv'`); await q(`COPY E FROM '${here}/e.csv'`);
  let a=T(); let r=await q('MATCH (a:N {id: 7})-[:E*1..3]->(b:N) RETURN count(DISTINCT b) AS n'); out.reach3=J(r); out.reach3_ms=(T()-a).toFixed(1);
  r=await q("MATCH (a:N {id: 7})-[e:E*1..3 (r, n | WHERE r.kind = 'calls')]->(b:N) RETURN count(DISTINCT b) AS n"); out.reach3_calls_only=J(r);
  try{ a=T(); await q('INSTALL algo'); out.install_ms=(T()-a).toFixed(0); await q('LOAD EXTENSION algo'); out.algo='loaded';
    await q("CALL PROJECT_GRAPH('g', ['N'], ['E'])");
    for(const [name,cy] of [['pagerank',"CALL page_rank('g') RETURN node.id AS id, rank ORDER BY rank DESC LIMIT 3"],['louvain',"CALL louvain('g') RETURN louvain_id, count(*) AS n ORDER BY n DESC LIMIT 3"],['wcc',"CALL weakly_connected_components('g') RETURN group_id, count(*) AS n ORDER BY n DESC LIMIT 2"],['scc',"CALL strongly_connected_components('g') RETURN group_id, count(*) AS n ORDER BY n DESC LIMIT 2"],['kcore',"CALL k_core_decomposition('g') RETURN k_degree, count(*) AS n ORDER BY k_degree DESC LIMIT 2"]]){
      try{ a=T(); r=await q(cy); out[name]=J(r); out[name+'_ms']=(T()-a).toFixed(1);}catch(e){ out[name+'_err']=String(e.message).slice(0,220); } }
  }catch(e){ out.algo_error=String(e.message||e).slice(0,400); }
  try{ const f=fs.readdirSync(os.homedir()+'/.lbdb',{recursive:true}); out.home_files=f.join(' | ').slice(0,300);}catch(e){ out.home_files='none'; }
}catch(e){ out.error=String(e.stack||e).slice(0,500); } return out; }
async function duck(){ const out={}; try{ const {DuckDBInstance}=require('@duckdb/node-api'); const inst=await DuckDBInstance.create(':memory:'); const c=await inst.connect();
  const q=async(x)=>{ const r=await c.runAndReadAll(x); return r.getRowObjects(); }; out.version=(await q('select version() v'))[0].v;
  await q(`SET extension_directory='${here}/ext-duckdb'`);
  await q('create table n(id bigint primary key)'); await q('create table e(src bigint, dst bigint, kind varchar)'); await q(`insert into n select * from range(${N})`); await q(`copy e from '${here}/e.csv' (header false)`);
  let a=T(); await q('INSTALL duckpgq FROM community'); await q('LOAD duckpgq'); await q("SET active_grammar_extensions=['duckpgq']"); out.pgq_install_ms=(T()-a).toFixed(0);
  await q('CREATE PROPERTY GRAPH g VERTEX TABLES (n) EDGE TABLES (e SOURCE KEY (src) REFERENCES n (id) DESTINATION KEY (dst) REFERENCES n (id))');
  a=T(); let r=await q('SELECT count(DISTINCT bid) n FROM GRAPH_TABLE (g MATCH (a:n)-[x:e]->{1,3}(b:n) WHERE a.id = 7 COLUMNS (b.id AS bid))'); out.reach3=J(r); out.reach3_ms=(T()-a).toFixed(1);
  a=T(); r=await q('SELECT * FROM pagerank(g, n, e) ORDER BY 2 DESC LIMIT 3'); out.pagerank=J(r); out.pagerank_ms=(T()-a).toFixed(1);
}catch(e){ out.error=String(e.message||e).slice(0,500); } return out; }
(async()=>{ console.log('node',process.version,process.platform,process.arch,'edges',edges.length); console.log('LADYBUG',JSON.stringify(await ladybug(),null,1)); console.log('DUCKDB',JSON.stringify(await duck(),null,1)); process.exit(0); })();
