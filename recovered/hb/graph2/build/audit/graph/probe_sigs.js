'use strict';
// Signatures of the graph routines that matter for the strongest-form review.
const lbug = require('@ladybugdb/core');
const { DuckDBInstance } = require('@duckdb/node-api');
async function main() {
  const out = {};
  const db = new lbug.Database(':memory:');
  const c = new lbug.Connection(db);
  const all = (q) => { const r = c.querySync(q); const rows = r.getAllSync(); r.close(); return rows; };
  all('LOAD EXTENSION algo');
  const want = /^(GDS_|PAGE_RANK|PR$|LOUVAIN|K_CORE|KCORE|WCC|SCC|WEAKLY|STRONGLY|PROJECT_GRAPH|SPANNING|DROP_PROJ)/;
  out.lb = all('CALL show_functions() RETURN *').filter((r) => want.test(r.name)).map((r) => r.name + ' :: ' + r.signature);
  // projected-graph and recursive options visible in the binder: try a few documented forms on a toy graph
  all('CREATE NODE TABLE N(id INT64, PRIMARY KEY(id))');
  all('CREATE REL TABLE E(FROM N TO N, w DOUBLE)');
  all('UNWIND [1,2,3,4] AS i CREATE (:N {id: i})');
  all('MATCH (a:N {id:1}), (b:N {id:2}) CREATE (a)-[:E {w: 1.0}]->(b)');
  all('MATCH (a:N {id:2}), (b:N {id:3}) CREATE (a)-[:E {w: 2.0}]->(b)');
  const tries = {
    project_cypher: "CALL PROJECT_GRAPH_CYPHER('pc', 'MATCH (a:N)-[e:E]->(b:N) WHERE e.w > 0 RETURN a, e, b')",
    gds_page_rank_weighted: "CALL GDS_PAGE_RANK('pc') RETURN *",
    page_rank_opts: "CALL page_rank('pc', dampingFactor := 0.7, maxIterations := 40, tolerance := 0.0, normalizeInitial := true) RETURN node.id, rank",
    louvain_opts: "CALL louvain('pc', maxPhases := 5, maxIterations := 5) RETURN node.id, louvain_id",
    gds_bfs: "CALL GDS_BFS_DISTANCE('pc', [0]) RETURN *",
    all_shortest: 'MATCH p = (a:N {id:1})-[:E* ALL SHORTEST 1..3]->(b:N) RETURN b.id, length(p)',
    trail: 'MATCH p = (a:N {id:1})-[:E* TRAIL 1..3]->(b:N) RETURN b.id, length(p)',
    acyclic: 'MATCH p = (a:N {id:1})-[:E* ACYCLIC 1..3]->(b:N) RETURN b.id, length(p)',
    wshortest_all: 'MATCH p = (a:N {id:1})-[:E* ALL WSHORTEST(w)]->(b:N) RETURN b.id, cost(p)',
    multi_source_shortest: 'MATCH p = (a:N)-[:E* SHORTEST 1..3]->(b:N) WHERE a.id IN [1, 2] RETURN a.id, b.id, length(p)',
    rel_group: 'CREATE REL TABLE GROUP G2(FROM N TO N, w DOUBLE)',
    index_list: 'CALL SHOW_INDEXES() RETURN *',
  };
  if (process.env.ONLY) for (const k of Object.keys(tries)) if (!process.env.ONLY.split(',').includes(k)) delete tries[k];
  const NL = String.fromCharCode(10);
  process.stderr.write(out.lb.join(NL) + NL);
  for (const [k, q] of Object.entries(tries)) { process.stderr.write('TRY ' + k + NL); try { out['lb_try_' + k] = all(q).slice(0, 6); } catch (e) { out['lb_try_' + k] = 'ERR ' + String(e.message).slice(0, 200); } process.stderr.write(k + ' => ' + JSON.stringify(out['lb_try_' + k]).slice(0, 400) + NL); }
  c.closeSync(); db.closeSync();
  const inst = await DuckDBInstance.create(':memory:');
  const k = await inst.connect();
  const q = async (s) => (await k.runAndReadAll(s)).getRowObjectsJS();
  await q("SET extension_directory='/opt/eng/ext-duckdb'"); await q('LOAD duckpgq');
  out.duck = (await q("SELECT function_name, function_type, parameters::VARCHAR AS p, parameter_types::VARCHAR AS t FROM duckdb_functions() WHERE function_name IN ('iterativelength','iterativelength2','iterativelengthbidirectional','reachability','shortestpath','cheapest_path_length','pagerank','weakly_connected_component','local_clustering_coefficient','create_csr_edge','create_csr_vertex','duckpgq_match','summarize_property_graph') ORDER BY 1")).map((r) => `${r.function_name} [${r.function_type}] ${r.p} ${r.t}`);
  k.closeSync(); inst.closeSync();
  console.log(JSON.stringify(out, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
