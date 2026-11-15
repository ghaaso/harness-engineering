'use strict';
// Which optional parameters the installed Ladybug algorithm routines accept (on a toy projection).
const lbug = require('@ladybugdb/core');
const NL = String.fromCharCode(10);
const db = new lbug.Database(':memory:');
const c = new lbug.Connection(db);
const all = (q) => { const r = c.querySync(q); const rows = r.getAllSync(); r.close(); return rows; };
all('LOAD EXTENSION algo');
all('CREATE NODE TABLE N(id INT64, PRIMARY KEY(id))');
all('CREATE REL TABLE E(FROM N TO N, w DOUBLE)');
all('UNWIND [1,2,3,4,5] AS i CREATE (:N {id: i})');
for (const [a, b, w] of [[1, 2, 1], [2, 3, 2], [3, 1, 1], [3, 4, 0.5], [4, 5, 1]]) all(`MATCH (a:N {id:${a}}), (b:N {id:${b}}) CREATE (a)-[:E {w: ${w}}]->(b)`);
const tries = [
  ["proj", "CALL PROJECT_GRAPH('g', ['N'], ['E'])"],
  ["proj_filter", "CALL PROJECT_GRAPH('gf', {'N': 'n.id > 0'}, {'E': 'r.w > 0.6'})"],
  ["proj_cypher", "CALL PROJECT_GRAPH_CYPHER('gc', 'MATCH (a:N)-[e:E]->(b:N) RETURN a, e, b')"],
  ["pr_default", "CALL page_rank('g') RETURN node.id, rank ORDER BY node.id"],
  ["pr_opts", "CALL page_rank('g', dampingFactor := 0.7, maxIterations := 40, tolerance := 0.0) RETURN node.id, rank ORDER BY node.id"],
  ["pr_norm", "CALL page_rank('g', normalizeInitial := false) RETURN node.id, rank ORDER BY node.id"],
  ["pr_weight", "CALL page_rank('g', weightProperty := 'w') RETURN node.id, rank ORDER BY node.id"],
  ["pr_cypher_proj", "CALL page_rank('gc') RETURN node.id, rank ORDER BY node.id"],
  ["gds_pr", "CALL GDS_PAGE_RANK('g') RETURN *"],
  ["gds_ppr", "CALL GDS_PPR('g', [0], dampingFactor := 0.7) RETURN node.id, rank ORDER BY node.id"],
  ["gds_ppr_iter", "CALL GDS_PPR('g', [0], dampingFactor := 0.7, maxIterations := 40) RETURN node.id, rank ORDER BY node.id"],
  ["gds_ppr_tol", "CALL GDS_PPR('g', [0], dampingFactor := 0.7, tolerance := 0.000001) RETURN node.id, rank ORDER BY node.id"],
  ["gds_ppr_weight", "CALL GDS_PPR('g', [0], dampingFactor := 0.7, weightProperty := 'w') RETURN node.id, rank ORDER BY node.id"],
  ["gds_ppr_directed", "CALL GDS_PPR('g', [0], dampingFactor := 0.7, directed := true) RETURN node.id, rank ORDER BY node.id"],
  ["louvain_opts", "CALL louvain('g', maxPhases := 5, maxIterations := 5) RETURN node.id, louvain_id"],
  ["gds_leiden", "CALL GDS_LEIDEN('g') RETURN *"],
  ["gds_louvain", "CALL GDS_LOUVAIN('g') RETURN *"],
  ["gds_bfs", "CALL GDS_BFS_DISTANCE('g', 0) RETURN *"],
  ["kcore", "CALL k_core_decomposition('g') RETURN node.id, k_degree"],
  ["wcc", "CALL weakly_connected_components('g') RETURN node.id, group_id"],
  ["wshortest", "MATCH p = (a:N {id:1})-[e:E* WSHORTEST(w)]->(b:N) RETURN b.id, cost(p) ORDER BY b.id"],
  ["all_wshortest", "MATCH p = (a:N {id:1})-[e:E* ALL WSHORTEST(w)]->(b:N) RETURN b.id, cost(p) ORDER BY b.id"],
  ["rec_filter_param", "MATCH p = (a:N {id:1})-[e:E* SHORTEST 1..3 (r, n | WHERE r.w > $x)]->(b:N) RETURN b.id"],
  ["semantic_trail", "CALL recursive_pattern_semantic='TRAIL'"],
];
for (const [k, q] of tries.filter(([k], i) => i < 3 || !process.env.FROM || i >= Number(process.env.FROM))) {
  let r; try { r = all(q); } catch (e) { r = 'ERR ' + String(e.message).slice(0, 220).replace(/\n/g, ' '); }
  process.stdout.write(k + ' => ' + JSON.stringify(r).slice(0, 500) + NL);
}
