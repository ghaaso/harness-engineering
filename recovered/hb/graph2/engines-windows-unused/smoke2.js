const path=require('path'); const T=()=>Number(process.hrtime.bigint())/1e6; const here=__dirname.split(path.sep).join('/');
(async()=>{ const out={}; const {DuckDBInstance}=require('@duckdb/node-api'); const inst=await DuckDBInstance.create(':memory:'); const c=await inst.connect();
  const q=async(x)=>{ const r=await c.runAndReadAll(x); return r.getRowObjects(); }; const J=r=>JSON.stringify(r,(k,v)=>typeof v==='bigint'?Number(v):v).slice(0,260);
  await q(`SET extension_directory='${here}/ext/duckdb'`);
  out.settings=J(await q("select name, value from duckdb_settings() where name ilike '%gramm%' or name ilike '%extension_dir%'"));
  await q('create table n(id bigint primary key)'); await q('create table e(src bigint, dst bigint, kind varchar)'); await q('insert into n select * from range(2000)'); await q(`copy e from '${here}/e.csv' (header false)`);
  try{ await q('LOAD duckpgq'); out.load='ok'; }catch(e){ out.load=String(e.message).slice(0,300); }
  for(const s of ["SET active_grammar_extensions=['duckpgq']","SET active_grammar_extensions='duckpgq'"]){ try{ await q(s); out.grammar=s; break; }catch(e){ out['err_'+s.length]=String(e.message).slice(0,200); } }
  try{ await q('CREATE PROPERTY GRAPH g VERTEX TABLES (n) EDGE TABLES (e SOURCE KEY (src) REFERENCES n (id) DESTINATION KEY (dst) REFERENCES n (id))'); out.create='ok';
    let a=T(); let r=await q('SELECT count(DISTINCT bid) n FROM GRAPH_TABLE (g MATCH (a:n)-[x:e]->{1,3}(b:n) WHERE a.id = 7 COLUMNS (b.id AS bid))'); out.reach3_pgq=J(r); out.pgq_ms=(T()-a).toFixed(1);
    try{ a=T(); r=await q("SELECT count(DISTINCT bid) n FROM GRAPH_TABLE (g MATCH (a:n)-[x:e WHERE x.kind='calls']->{1,3}(b:n) WHERE a.id = 7 COLUMNS (b.id AS bid))"); out.typed=J(r); out.typed_ms=(T()-a).toFixed(1);}catch(e){ out.typed_err=String(e.message).slice(0,240); }
    try{ a=T(); r=await q('SELECT * FROM GRAPH_TABLE (g MATCH p = ANY SHORTEST (a:n)-[x:e]->*(b:n) WHERE a.id = 7 AND b.id = 99 COLUMNS (path_length(p) AS len))'); out.shortest=J(r); out.shortest_ms=(T()-a).toFixed(1);}catch(e){ out.shortest_err=String(e.message).slice(0,240); }
    try{ a=T(); r=await q('SELECT * FROM pagerank(g, n, e) ORDER BY 2 DESC LIMIT 3'); out.pagerank=J(r); out.pagerank_ms=(T()-a).toFixed(1);}catch(e){ out.pagerank_err=String(e.message).slice(0,240); }
    try{ r=await q('SELECT count(*) c FROM weakly_connected_component(g, n, e)'); out.wcc=J(r);}catch(e){ out.wcc_err=String(e.message).slice(0,200); }
  }catch(e){ out.create_err=String(e.message).slice(0,300); }
  console.log(JSON.stringify(out,null,1)); process.exit(0); })();
