// Exploration 2: options of the GDS_* (icebug) functions and of page_rank / louvain / k-core.
const lbug = require('@ladybugdb/core');
const J = (r) => JSON.stringify(r, (k, v) => (typeof v === 'bigint' ? Number(v) : v));
(async () => {
  const db = new lbug.Database(':memory:');
  const c = new lbug.Connection(db);
  const q = async (x) => { try { const r = await c.query(x); return await (Array.isArray(r) ? r[r.length - 1] : r).getAll(); } catch (e) { return 'ERR ' + String(e.message || e).slice(0, 400); } };
  await q('LOAD EXTENSION algo');
  await q('CREATE NODE TABLE N(id INT64, PRIMARY KEY(id))');
  await q('CREATE REL TABLE A(FROM N TO N, w DOUBLE)');
  await q('CREATE REL TABLE B(FROM N TO N, w DOUBLE)');
  for (let i = 1; i <= 8; i++) await q(`CREATE (:N {id: ${i}})`);
  const E = [[1, 2, 'A', 0.9], [2, 3, 'A', 0.4], [3, 4, 'B', 1], [1, 5, 'B', 1], [5, 4, 'A', 1], [4, 6, 'A', 1], [7, 1, 'A', 1], [6, 8, 'B', 0.7], [2, 1, 'A', 1]];
  for (const [a, b, t, w] of E) await q(`MATCH (x:N {id:${a}}), (y:N {id:${b}}) CREATE (x)-[:${t} {w: ${w}}]->(y)`);
  await q("CALL PROJECT_GRAPH('g', ['N'], ['A','B'])");
  await q("CALL PROJECT_GRAPH('ga', ['N'], ['A'])");
  console.log('proj with props', J(await q("CALL PROJECT_GRAPH('gw', {'N': ''}, {'A': {'filter': 'r.w > 0.1', 'weight': 'w'}})")));
  console.log('proj cypher', J(await q("CALL PROJECT_GRAPH_CYPHER('gc', 'MATCH (a:N)-[r:A]->(b:N) WHERE r.w > 0.5 RETURN a, r, b')")));
  console.log('graphs', J(await q('CALL SHOW_PROJECTED_GRAPHS() RETURN *')));
  console.log('info', J(await q("CALL PROJECTED_GRAPH_INFO('g') RETURN *")));
  const T = {
    gds_ppr: "CALL GDS_PPR('g', [1]) RETURN *",
    gds_ppr_bad: "CALL GDS_PPR('g', [1], foo := 1) RETURN *",
    gds_pr: "CALL GDS_PAGE_RANK('g') RETURN *",
    gds_pr_bad: "CALL GDS_PAGE_RANK('g', foo := 1) RETURN *",
    pr_bad: "CALL page_rank('g', foo := 1) RETURN *",
    louvain_bad: "CALL louvain('ga', foo := 1) RETURN *",
    louvain: "CALL louvain('ga') RETURN node.id, louvain_id",
    gds_louvain: "CALL GDS_LOUVAIN('g') RETURN *",
    gds_louvain_bad: "CALL GDS_LOUVAIN('g', foo := 1) RETURN *",
    gds_leiden: "CALL GDS_LEIDEN('g') RETURN *",
    gds_leiden_bad: "CALL GDS_LEIDEN('g', foo := 1) RETURN *",
    gds_plp: "CALL GDS_PLP('g') RETURN *",
    gds_bfs: "CALL GDS_BFS_DISTANCE('g', 1) RETURN *",
    gds_bfs_bad: "CALL GDS_BFS_DISTANCE('g', 1, foo := 1) RETURN *",
    gds_deg: "CALL GDS_DEGREE('g') RETURN *",
    gds_deg_bad: "CALL GDS_DEGREE('g', foo := 1) RETURN *",
    gds_core: "CALL GDS_CORE_DECOMPOSITION('g') RETURN *",
    gds_core_bad: "CALL GDS_CORE_DECOMPOSITION('g', foo := 1) RETURN *",
    kcore_bad: "CALL k_core_decomposition('g', foo := 1) RETURN *",
    gds_katz: "CALL GDS_KATZ('g') RETURN *",
    gds_katz_bad: "CALL GDS_KATZ('g', foo := 1) RETURN *",
    gds_harm: "CALL GDS_HARMONIC('g') RETURN *",
    gds_betw: "CALL GDS_BETWEENNESS('g') RETURN *",
    gds_betw_bad: "CALL GDS_BETWEENNESS('g', foo := 1) RETURN *",
    gds_close: "CALL GDS_CLOSENESS('g') RETURN *",
    gds_eig: "CALL GDS_EIGENVECTOR('g') RETURN *",
    gds_cc: "CALL GDS_CONNECTED_COMPONENTS('g') RETURN *",
    gds_cut: "CALL GDS_CUT_CLUSTERING('g') RETURN *",
    gds_cut_bad: "CALL GDS_CUT_CLUSTERING('g', foo := 1) RETURN *",
    gds_n2v_bad: "CALL GDS_NODE2VEC('g', foo := 1) RETURN *",
    sf: "CALL SPANNING_FOREST('g') RETURN *",
    wcc_bad: "CALL wcc('g', foo := 1) RETURN *",
  };
  for (const [k, x] of Object.entries(T)) console.log(k, J(await q(x)));
  for (const p of ['dampingFactor := 0.7', 'damping := 0.7', 'alpha := 0.3', 'maxIterations := 40', 'iterations := 40', 'tolerance := 0.0', 'tol := 0.0', 'normalized := true', 'sinkHandling := true', 'distributeSinks := true', 'weightProperty := \'w\'', 'weight := \'w\'', 'directed := false', 'topK := 3'])
    console.log('gds_ppr', p, J(await q(`CALL GDS_PPR('g', [1], ${p}) RETURN *`)));
  for (const p of ['dampingFactor := 0.7', 'maxIterations := 40', 'tolerance := 0.0', 'normalizeInitial := false', 'weightProperty := \'w\''])
    console.log('page_rank', p, J(await q(`CALL page_rank('g', ${p}) RETURN node.id, rank`)));
  for (const p of ['maxPhases := 5', 'maxIterations := 5', 'seed := 42', 'randomSeed := 42', 'resolution := 1.0', 'gamma := 1.0'])
    console.log('louvain', p, J(await q(`CALL louvain('ga', ${p}) RETURN node.id, louvain_id`)));
  for (const p of ['seed := 42', 'gamma := 1.0', 'resolution := 1.0', 'iterations := 3', 'maxIterations := 3', 'refine := true', 'turbo := true'])
    console.log('gds_louvain', p, J(await q(`CALL GDS_LOUVAIN('g', ${p}) RETURN *`)));
  for (const p of ['seed := 42', 'gamma := 1.0', 'iterations := 3', 'randomize := false'])
    console.log('gds_leiden', p, J(await q(`CALL GDS_LEIDEN('g', ${p}) RETURN *`)));
  process.exit(0);
})();
