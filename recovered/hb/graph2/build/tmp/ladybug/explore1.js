// Exploration: what LadybugDB 0.22.3 offers (functions, algorithms, recursive pattern syntax).
const lbug = require('@ladybugdb/core');
const fs = require('fs');
const J = (r) => JSON.stringify(r, (k, v) => (typeof v === 'bigint' ? Number(v) : v));
(async () => {
  console.log('version', lbug.VERSION, Object.keys(lbug));
  const db = new lbug.Database(':memory:');
  const c = new lbug.Connection(db);
  const q = async (x, p) => {
    try {
      let r;
      if (p) { const ps = await c.prepare(x); r = await c.execute(ps, p); } else r = await c.query(x);
      if (Array.isArray(r)) r = r[r.length - 1];
      return await r.getAll();
    } catch (e) { return 'ERR ' + String(e.message || e).slice(0, 300); }
  };
  console.log('load', J(await q('LOAD EXTENSION algo')));
  const fns = await q('CALL show_functions() RETURN *');
  if (typeof fns === 'string') console.log(fns);
  else {
    const names = fns.map((r) => Object.values(r).join('|'));
    console.log('functions', names.length);
    console.log(names.filter((n) => /rank|louvain|component|core|path|shortest|project|graph|algo|walk|degree|centr|community|label|bfs|personal/i.test(n)).join('\n'));
  }
  console.log('settings', J(await q('CALL current_setting(\'threads\') RETURN *')));
  console.log('settings2', J(await q('CALL db_version() RETURN *')));
  // small graph
  await q('CREATE NODE TABLE N(id INT64, blk BOOLEAN, PRIMARY KEY(id))');
  await q('CREATE REL TABLE A(FROM N TO N, w DOUBLE, k INT64)');
  await q('CREATE REL TABLE B(FROM N TO N, w DOUBLE, k INT64)');
  for (let i = 1; i <= 8; i++) await q(`CREATE (:N {id: ${i}, blk: ${i === 3}})`);
  const E = [[1, 2, 'A', 0.9], [2, 3, 'A', 0.4], [3, 4, 'B', 1], [1, 5, 'B', 1], [5, 4, 'A', 1], [4, 6, 'A', 1], [7, 1, 'A', 1], [6, 8, 'B', 0.7]];
  for (const [a, b, t, w] of E) await q(`MATCH (x:N {id:${a}}), (y:N {id:${b}}) CREATE (x)-[:${t} {w: ${w}, k: 1}]->(y)`);
  const tests = {
    multi_label_var: 'MATCH (s:N {id:1})-[e:A|B*1..3]->(v:N) RETURN v.id, min(length(e)) ORDER BY v.id',
    shortest: 'MATCH p = (s:N {id:1})-[e:A|B* SHORTEST 1..4]->(v:N) RETURN v.id, length(e), properties(nodes(e), \'id\'), properties(rels(e), \'w\') ORDER BY v.id',
    all_shortest: 'MATCH (s:N {id:1})-[e:A|B* ALL SHORTEST 1..4]->(v:N) RETURN v.id, length(e), properties(nodes(e),\'id\') ORDER BY v.id',
    undirected_shortest: 'MATCH (s:N {id:4})-[e:A|B* SHORTEST 1..3]-(v:N) RETURN v.id, length(e) ORDER BY v.id',
    filter_rel: 'MATCH (s:N {id:1})-[e:A|B* SHORTEST 1..4 (r, n | WHERE r.w >= 0.5)]->(v:N) RETURN v.id, length(e) ORDER BY v.id',
    filter_node: 'MATCH (s:N {id:1})-[e:A|B* SHORTEST 1..4 (r, n | WHERE NOT n.blk)]->(v:N) RETURN v.id, length(e) ORDER BY v.id',
    filter_node_param: 'MATCH (s:N {id:1})-[e:A|B* SHORTEST 1..4 (r, n | WHERE NOT n.id IN [3])]->(v:N) RETURN v.id, length(e) ORDER BY v.id',
    label_fn: 'MATCH (s:N {id:1})-[e:A|B*1..2]->(v:N) RETURN v.id, [x IN rels(e) | label(x)] ORDER BY v.id',
    wshortest: 'MATCH (s:N {id:1})-[e:A|B* WSHORTEST(w)]->(v:N) RETURN v.id, cost(e) ORDER BY v.id',
    wshortest2: 'MATCH (s:N {id:1})-[e:A|B* WSHORTEST(w) 1..5]->(v:N) RETURN v.id, cost(e) ORDER BY v.id',
    trail: 'MATCH (s:N {id:1})-[e:A|B* TRAIL 1..3]->(v:N) RETURN v.id, length(e) ORDER BY v.id',
    acyclic: 'MATCH (s:N {id:1})-[e:A|B* ACYCLIC 1..3]->(v:N) RETURN v.id ORDER BY v.id',
    unbounded: 'MATCH (s:N {id:1})-[e:A|B* SHORTEST]->(v:N) RETURN v.id, length(e) ORDER BY v.id',
    multi_src: 'MATCH (s:N)-[e:A|B* SHORTEST 1..3]->(v:N) WHERE s.id IN [1,7] RETURN s.id, v.id, length(e) ORDER BY v.id',
    proj: "CALL PROJECT_GRAPH('g', ['N'], ['A','B'])",
    proj_filter: "CALL PROJECT_GRAPH('gf', {'N': 'n.id <> 3'}, {'A': 'r.w >= 0.5', 'B': 'r.w >= 0.5'})",
    pr: "CALL page_rank('g') RETURN node.id, rank ORDER BY node.id",
    pr_params: "CALL page_rank('g', dampingFactor := 0.7, maxIterations := 40, tolerance := 0.0) RETURN node.id, rank ORDER BY node.id",
    prf: "CALL page_rank('gf') RETURN node.id, rank ORDER BY node.id",
    louvain: "CALL louvain('g') RETURN node.id, louvain_id ORDER BY node.id",
    louvain_seed: "CALL louvain('g', maxPhases := 10, maxIterations := 10) RETURN node.id, louvain_id ORDER BY node.id",
    kcore: "CALL k_core_decomposition('g') RETURN node.id, k_degree ORDER BY node.id",
    wcc: "CALL weakly_connected_components('g') RETURN node.id, group_id ORDER BY node.id",
    scc: "CALL strongly_connected_components('g') RETURN node.id, group_id ORDER BY node.id",
    scc_ko: "CALL strongly_connected_components_kosaraju('g') RETURN node.id, group_id ORDER BY node.id",
    show_tables: 'CALL show_tables() RETURN *',
  };
  for (const [k, x] of Object.entries(tests)) console.log(k, J(await q(x)));
  console.log('param', J(await q('MATCH (s:N)-[e:A|B* SHORTEST 1..3]->(v:N) WHERE s.id IN $ids RETURN v.id, length(e) ORDER BY v.id', { ids: [1, 7] })));
  console.log('param_in_filter', J(await q('MATCH (s:N {id:1})-[e:A|B* SHORTEST 1..4 (r, n | WHERE NOT n.id IN $blk)]->(v:N) RETURN v.id ORDER BY v.id', { blk: [3] })));
  console.log('param_minc', J(await q('MATCH (s:N {id:1})-[e:A|B* SHORTEST 1..4 (r, n | WHERE r.w >= $m)]->(v:N) RETURN v.id ORDER BY v.id', { m: 0.5 })));
  console.log('param_hops', J(await q('MATCH (s:N {id:1})-[e:A|B* SHORTEST 1..$h]->(v:N) RETURN v.id ORDER BY v.id', { h: 2 })));
  process.exit(0);
})();
