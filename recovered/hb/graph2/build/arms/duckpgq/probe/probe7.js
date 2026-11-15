'use strict';
// Engine probe 7: one statement that builds the CSR and calls the extension's path-finding function
// (as the MATCH rewrite does), repeated, with the source filter on the source scan.
const P = require('../../common/paths');
const { graphFor, openArm } = require('../../common/arms');
const C = require('../../common/config');
const RS = require('../../relational/sweep');
const { CLASSES } = require('../../common/edgeclasses');
const now = () => Number(process.hrtime.bigint()) / 1e6;
(async () => {
  const G = graphFor(P.FROZEN);
  const a = await openArm('duckpgq', G);
  const g = a.raw.graph;
  const cfg = C.normalise(RS.BASE);
  const seedNode = G.nodes.find((n) => n.sid.endsWith('jobs/service.py#JobService.transition'));
  const S = [seedNode.file, seedNode.i].join(', ');
  const pj = await g.projection('both', cfg.classes.map((c) => CLASSES.indexOf(c)), 0.5, null);
  const t = async (label, sql, show = 160) => { try { const s = now(); const r = await g.all(sql); console.log((now() - s).toFixed(1).padStart(9), 'ms', label, 'rows', r.length, JSON.stringify(r[0] || {}).slice(0, show)); return r; } catch (e) { console.log('ERR', label, String(e.message).split('\n')[0].slice(0, 300)); } };
  const V = '(SELECT count(*) FROM st.node)';
  const csr = (id) => `csr AS MATERIALIZED (SELECT count(create_csr_edge(${id}, ${V},
        CAST((SELECT sum(create_csr_vertex(${id}, ${V}, sub.dense_id, sub.cnt)) FROM (SELECT a.rowid AS dense_id, count(t.src) AS cnt FROM st.node a LEFT JOIN ${pj.name} t ON t.src = a.id GROUP BY a.rowid) sub) AS BIGINT),
        (SELECT count(*) FROM ${pj.name} t JOIN st.node a ON a.id = t.src JOIN st.node c ON c.id = t.dst),
        src.rowid, dst.rowid, t.rowid)) AS temp FROM ${pj.name} t JOIN st.node src ON t.src = src.id JOIN st.node dst ON t.dst = dst.id)`;
  for (let k = 0; k < 3; k++) {
    await t('one stmt iterativelength id0 #' + k, `WITH ${csr(0)} SELECT count(len) AS reached, max(len) AS mx, sum(len) AS s FROM (SELECT x.id AS x, y.id AS y, iterativelength(0, ${V}, x.rowid, y.rowid) + 0 * csr.temp AS len FROM csr, (SELECT rowid, id FROM st.node WHERE id IN (${S})) x, st.node y)`);
  }
  await t('PGQ walk reach {1,6} after', `SELECT count(*) n FROM GRAPH_TABLE (g_${pj.name} MATCH (a:node WHERE a.id IN (${S}))-[e:${pj.name}]->{1,6}(b:node) COLUMNS (a.id AS x, b.id AS y))`);
  await t('one stmt iterativelength id0 after PGQ', `WITH ${csr(0)} SELECT count(len) AS reached, max(len) AS mx, sum(len) AS s FROM (SELECT iterativelength(0, ${V}, x.rowid, y.rowid) + 0 * csr.temp AS len FROM csr, (SELECT rowid, id FROM st.node WHERE id IN (${S})) x, st.node y)`);
  await t('one stmt id 3', `WITH ${csr(3)} SELECT count(len) AS reached FROM (SELECT iterativelength(3, ${V}, x.rowid, y.rowid) + 0 * csr.temp AS len FROM csr, (SELECT rowid, id FROM st.node WHERE id IN (${S})) x, st.node y)`);
  for (let k = 0; k < 2; k++) await t('one stmt shortestpath id0 #' + k, `WITH ${csr(0)} SELECT count(p) AS n, max(len(p)) AS mx FROM (SELECT shortestpath(0, ${V}, x.rowid, y.rowid) AS p, csr.temp FROM csr, (SELECT rowid, id FROM st.node WHERE id IN (${S})) x, st.node y)`);
  await t('one stmt shortestpath restricted pairs', `WITH ${csr(0)} SELECT count(p) AS n FROM (SELECT shortestpath(0, ${V}, x.rowid, y.rowid) AS p, csr.temp FROM csr, (SELECT rowid, id FROM st.node WHERE id = ${seedNode.i}) x, (SELECT rowid, id FROM st.node WHERE id % 7 = 0) y)`);
  await t('reachability one stmt', `WITH ${csr(0)} SELECT count(*) FILTER (r) AS n FROM (SELECT reachability(0, true, ${V}, x.rowid, y.rowid) AS r, csr.temp FROM csr, (SELECT rowid, id FROM st.node WHERE id IN (${S})) x, st.node y)`);
  // multi seeds: 50 seeds
  const many = G.nodes.filter((n) => n.path === seedNode.path).slice(0, 50).map((n) => n.i);
  await t('iterativelength 50 seeds', `WITH ${csr(0)} SELECT count(len) AS reached FROM (SELECT iterativelength(0, ${V}, x.rowid, y.rowid) + 0 * csr.temp AS len FROM csr, (SELECT rowid, id FROM st.node WHERE id IN (${many.join(',')})) x, st.node y)`);
  await t('PGQ ANY SHORTEST paths 50 seeds', `SELECT count(*) n FROM GRAPH_TABLE (g_${pj.name} MATCH p = ANY SHORTEST (a:node WHERE a.id IN (${many.join(',')}))-[e:${pj.name}]->{1,2}(b:node) COLUMNS (a.id AS x, b.id AS y, path_length(p) AS len))`);
  await t('PGQ walk {1,2} 50 seeds', `SELECT count(*) n FROM GRAPH_TABLE (g_${pj.name} MATCH (a:node WHERE a.id IN (${many.join(',')}))-[e:${pj.name}]->{1,2}(b:node) COLUMNS (a.id AS x, b.id AS y))`);
  await a.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
