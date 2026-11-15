'use strict';
// Engine probe 6: the path-finding functions called directly on a CSR built once (csr id 0 and others),
// timed against the MATCH forms; reachability-based hop levels.
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
  const GT = (m, cols) => `FROM GRAPH_TABLE (g_${pj.name} MATCH ${m} COLUMNS (${cols}))`;
  const V = '(SELECT count(*) FROM st.node)';
  const build = (id) => `SELECT count(create_csr_edge(${id}, ${V},
        CAST((SELECT sum(create_csr_vertex(${id}, ${V}, sub.dense_id, sub.cnt)) FROM (SELECT a.rowid AS dense_id, count(t.src) AS cnt FROM st.node a LEFT JOIN ${pj.name} t ON t.src = a.id GROUP BY a.rowid) sub) AS BIGINT),
        (SELECT count(*) FROM ${pj.name} t JOIN st.node a ON a.id = t.src JOIN st.node c ON c.id = t.dst),
        src.rowid, dst.rowid, t.rowid)) AS n FROM ${pj.name} t JOIN st.node src ON t.src = src.id JOIN st.node dst ON t.dst = dst.id`;
  for (const id of [0, 1]) {
    await t('build csr ' + id, build(id));
    await t('iterativelength id ' + id, `SELECT x.id AS x, y.id AS y, iterativelength(${id}, ${V}, x.rowid, y.rowid) AS len FROM st.node x, st.node y WHERE x.id IN (${S})`);
    if (0) await t('iterativelength2 id ' + id, `SELECT x.id AS x, y.id AS y, iterativelength2(${id}, ${V}, x.rowid, y.rowid) AS len FROM st.node x, st.node y WHERE x.id IN (${S})`);
    if (0) await t('iterativelengthbidirectional id ' + id, `SELECT x.id AS x, y.id AS y, iterativelengthbidirectional(${id}, ${V}, x.rowid, y.rowid) AS len FROM st.node x, st.node y WHERE x.id IN (${S})`);
    await t('shortestpath id ' + id, `SELECT x.id AS x, y.id AS y, shortestpath(${id}, ${V}, x.rowid, y.rowid) AS p FROM st.node x, st.node y WHERE x.id IN (${S})`);
    await t('reachability id ' + id, `SELECT x.id AS x, y.id AS y, reachability(${id}, true, ${V}, x.rowid, y.rowid) AS r FROM st.node x, st.node y WHERE x.id IN (${S})`);
    await t('iterativelength again id ' + id, `SELECT count(*) n, count(len) reached, max(len) mx FROM (SELECT iterativelength(${id}, ${V}, x.rowid, y.rowid) AS len FROM st.node x, st.node y WHERE x.id IN (${S}))`);
  }
  await t('PGQ any shortest (element filter) ', GT(`p = ANY SHORTEST (a:node WHERE a.id IN (${S}))-[e:${pj.name}]->{1,2}(b:node)`, 'a.id AS x, b.id AS y, path_length(p) AS len'));
  await t('PGQ any shortest after own csr exists', GT(`p = ANY SHORTEST (a:node WHERE a.id IN (${S}))-[e:${pj.name}]->{1,2}(b:node)`, 'a.id AS x, b.id AS y, path_length(p) AS len'));
  for (const k of [1, 2, 3, 4, 6]) await t('PGQ reach {1,' + k + '} no path var', GT(`(a:node WHERE a.id IN (${S}))-[e:${pj.name}]->{1,${k}}(b:node)`, 'a.id AS x, b.id AS y'));
  await t('PGQ reach + no path var (unbounded)', GT(`(a:node WHERE a.id IN (${S}))-[e:${pj.name}]->+(b:node)`, 'a.id AS x, b.id AS y'));
  await t('PGQ reach {2,2} no path var', GT(`(a:node WHERE a.id IN (${S}))-[e:${pj.name}]->{2,2}(b:node)`, 'a.id AS x, b.id AS y'));
  await t('explain reach', `EXPLAIN ${GT(`(a:node WHERE a.id IN (${S}))-[e:${pj.name}]->{1,2}(b:node)`, 'a.id AS x, b.id AS y')}`, 0).then((r) => r && console.log(String(r[0].explain_value).split('\n').filter((l) => /reach|iterative|Condition|Join Type/.test(l)).join('\n')));
  await a.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
