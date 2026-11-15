// Pre-installs the two graph extensions inside the image so runs need no network.
(async()=>{ const lbug=require('@ladybugdb/core'); const db=new lbug.Database('/tmp/warm-lb'); const c=new lbug.Connection(db);
  const q=async x=>await (await c.query(x)).getAll(); await q('INSTALL algo'); await q('LOAD EXTENSION algo');
  await q('CREATE NODE TABLE N(id INT64, PRIMARY KEY(id))'); await q('CREATE REL TABLE E(FROM N TO N)'); await q('CREATE (:N {id:1})-[:E]->(:N {id:2})');
  await q("CALL PROJECT_GRAPH('g', ['N'], ['E'])"); console.log('ladybug', lbug.VERSION, 'page_rank rows', (await q("CALL page_rank('g') RETURN node.id, rank")).length);
  const {DuckDBInstance}=require('@duckdb/node-api'); const inst=await DuckDBInstance.create(':memory:'); const d=await inst.connect();
  const r=async x=>(await d.runAndReadAll(x)).getRowObjects(); await r("SET extension_directory='/opt/eng/ext-duckdb'"); await r('INSTALL duckpgq FROM community'); await r('LOAD duckpgq');
  console.log('duckdb', (await r('select version() v'))[0].v, 'duckpgq loaded'); process.exit(0); })().catch(e=>{ console.error(String(e.stack||e)); process.exit(1); });
