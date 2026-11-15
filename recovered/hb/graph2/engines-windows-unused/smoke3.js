const path=require('path'),fs=require('fs'); const T=()=>Number(process.hrtime.bigint())/1e6;
(async()=>{ const out={}; const lbug=require('@ladybugdb/core'); const dir=path.join(__dirname,'lb-smoke');
  const db=new lbug.Database(dir); const c=new lbug.Connection(db); const q=async(x)=>{ const r=await c.query(x); return await r.getAll(); };
  try{ const f=await q('CALL show_functions() RETURN *'); const names=[...new Set(f.map(x=>String(x.name||x.NAME||Object.values(x)[0])))];
    out.function_count=names.length; out.graph_like=names.filter(n=>/rank|louvain|wcc|scc|core|component|shortest|project|bfs|path/i.test(n)).join(', ').slice(0,400); }catch(e){ out.show_err=String(e.message).slice(0,200); }
  try{ await q("CALL PROJECT_GRAPH('g', ['N'], ['E'])"); out.project='ok'; }catch(e){ out.project_err=String(e.message).slice(0,200); }
  try{ const r=await q("CALL page_rank('g') RETURN node.id AS id, rank ORDER BY rank DESC LIMIT 3"); out.pagerank=JSON.stringify(r).slice(0,200); }catch(e){ out.pagerank_err=String(e.message).slice(0,200); }
  let a=T(); let r=await q('MATCH (a:N {id: 7})-[:E*1..3]->(b:N) RETURN count(DISTINCT b) AS n'); out.reach3=Number(r[0].n);
  a=T(); r=await q('MATCH p=(a:N {id: 7})-[:E* SHORTEST 1..12]->(b:N {id: 99}) RETURN length(p) AS len'); out.shortest=JSON.stringify(r,(k,v)=>typeof v==='bigint'?Number(v):v); out.shortest_ms=(T()-a).toFixed(1);
  a=T(); r=await q('MATCH (a:N {id: 7})-[:E*1..12]->(b:N {id: 99}) RETURN count(*) AS n'); out.any_path_to_99=JSON.stringify(r,(k,v)=>typeof v==='bigint'?Number(v):v); 
  console.log(JSON.stringify(out,null,1)); process.exit(0); })().catch(e=>{console.log('ERR',String(e.stack||e).slice(0,400));process.exit(1);});
