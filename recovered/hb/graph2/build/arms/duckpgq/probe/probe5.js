'use strict';
// Engine probe 5: where the time of an ANY SHORTEST query goes on the frozen-commit graph, and which
// formulation pushes the seed filter below the path-finding function.
const P = require('../../common/paths');
const { graphFor, openArm } = require('../../common/arms');
const C = require('../../common/config');
const RS = require('../../relational/sweep');
const now = () => Number(process.hrtime.bigint()) / 1e6;
(async () => {
  const G = graphFor(P.FROZEN);
  const a = await openArm('duckpgq', G);
  const g = a.raw.graph;
  const cfg = C.normalise(RS.BASE);
  const seedNode = G.nodes.find((n) => n.sid.endsWith('jobs/service.py#JobService.transition')) || G.nodes.find((n) => n.kind === 'function');
  const S = [seedNode.file, seedNode.i].join(', ');
  console.log('seeds', S, 'nodes', G.nodes.length);
  const pj = await g.projection('both', cfg.classes.map((c) => require('../../common/edgeclasses').CLASSES.indexOf(c)), 0.5, null);
  const t = async (label, sql) => { try { const s = now(); const r = await g.all(sql); console.log((now() - s).toFixed(1).padStart(9), 'ms', label, 'rows', r.length, JSON.stringify(r[0] || {}).slice(0, 160)); return r; } catch (e) { console.log('ERR', label, String(e.message).split('\n')[0].slice(0, 300)); } };
  const GT = (m, cols) => `FROM GRAPH_TABLE (g_${pj.name} MATCH ${m} COLUMNS (${cols}))`;
  await t('count arcs', `SELECT count(*) n FROM ${pj.name}`);
  await t('where a.id IN, length only', GT(`p = ANY SHORTEST (a:node)-[e:${pj.name}]->{1,2}(b:node) WHERE a.id IN (${S})`, 'a.id AS x, b.id AS y, path_length(p) AS len'));
  await t('element filter, length only', GT(`p = ANY SHORTEST (a:node WHERE a.id IN (${S}))-[e:${pj.name}]->{1,2}(b:node)`, 'a.id AS x, b.id AS y, path_length(p) AS len'));
  await t('element filter, with paths', GT(`p = ANY SHORTEST (a:node WHERE a.id IN (${S}))-[e:${pj.name}]->{1,2}(b:node)`, 'a.id AS x, b.id AS y, path_length(p) AS len, vertices(p) AS vs, edges(p) AS es'));
  await t('element filter single seed =', GT(`p = ANY SHORTEST (a:node WHERE a.id = ${seedNode.i})-[e:${pj.name}]->{1,2}(b:node)`, 'a.id AS x, b.id AS y, path_length(p) AS len'));
  await t('no path var, element filter', GT(`(a:node WHERE a.id IN (${S}))-[e:${pj.name}]->{1,2}(b:node)`, 'a.id AS x, b.id AS y'));
  await t('unbounded + element filter', GT(`p = ANY SHORTEST (a:node WHERE a.id IN (${S}))-[e:${pj.name}]->+(b:node)`, 'a.id AS x, b.id AS y, path_length(p) AS len'));
  await t('explain element filter', `EXPLAIN ${GT(`p = ANY SHORTEST (a:node WHERE a.id IN (${S}))-[e:${pj.name}]->{1,2}(b:node)`, 'a.id AS x, b.id AS y, path_length(p) AS len')}`).then((r) => r && console.log(String(r[0].explain_value).split('\n').filter((l) => /Join|Cross|Filter|iterative|shortest|Scan|Table|rows/.test(l)).slice(0, 60).join('\n')));
  // direct UDF path: build CSR once, then iterativelength / shortestpath for seeds x all nodes
  const id = 77; const V = '(SELECT count(*) FROM st.node)';
  await t('build csr (unweighted)', `SELECT count(create_csr_edge(${id}, ${V},
        CAST((SELECT sum(create_csr_vertex(${id}, ${V}, sub.dense_id, sub.cnt)) FROM (SELECT a.rowid AS dense_id, count(t.src) AS cnt FROM st.node a LEFT JOIN ${pj.name} t ON t.src = a.id GROUP BY a.rowid) sub) AS BIGINT),
        (SELECT count(*) FROM ${pj.name} t JOIN st.node a ON a.id = t.src JOIN st.node c ON c.id = t.dst),
        src.rowid, dst.rowid, t.rowid)) AS n FROM ${pj.name} t JOIN st.node src ON t.src = src.id JOIN st.node dst ON t.dst = dst.id`);
  await t('iterativelength seeds x all', `SELECT x.id AS x, y.id AS y, iterativelength(${id}, ${V}, x.rowid, y.rowid) AS len FROM st.node x, st.node y WHERE x.id IN (${S})`);
  await t('iterativelength seeds x all, filtered', `SELECT * FROM (SELECT x.id AS x, y.id AS y, iterativelength(${id}, ${V}, x.rowid, y.rowid) AS len FROM st.node x, st.node y WHERE x.id IN (${S})) WHERE len BETWEEN 1 AND 2`);
  await t('shortestpath seeds x all', `SELECT x.id AS x, y.id AS y, shortestpath(${id}, ${V}, x.rowid, y.rowid) AS p FROM st.node x, st.node y WHERE x.id IN (${S})`);
  await t('reachability', `SELECT x.id AS x, y.id AS y, reachability(${id}, true, ${V}, x.rowid, y.rowid) AS r FROM st.node x, st.node y WHERE x.id IN (${S}) LIMIT 5`);
  await t('delete csr', `SELECT delete_csr(${id})`);
  // fixed patterns as level-wise reach (WALK mode), for comparison
  await t('fixed 1-hop from seeds', GT(`(a:node WHERE a.id IN (${S}))-[e:${pj.name}]->(b:node)`, 'a.id AS x, b.id AS y'));
  await t('fixed 2-hop walks from seeds', GT(`(a:node WHERE a.id IN (${S}))-[e:${pj.name}]->(m:node)-[f:${pj.name}]->(b:node)`, 'a.id AS x, b.id AS y'));
  const s = now(); const r = await a.rank([seedNode.file, seedNode.i].sort((x, y) => x - y), cfg, { path: seedNode.path, symbol: { name: 'x' } });
  console.log('rank base', (now() - s).toFixed(1), 'ms', r.ranked.length);
  await a.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
