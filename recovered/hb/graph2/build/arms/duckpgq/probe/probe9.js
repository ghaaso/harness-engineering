'use strict';
// Engine probe 9: cheapest_path_length() lifetime: built in the same statement (id 0) versus a separate
// statement with its own id, called twice, inside a transaction, then delete_csr().
const P = require('../../common/paths');
const { graphFor, openArm } = require('../../common/arms');
const C = require('../../common/config');
const RS = require('../../relational/sweep');
const { CLASSES } = require('../../common/edgeclasses');
const now = () => Number(process.hrtime.bigint()) / 1e6;
(async () => {
  const G = graphFor(process.env.PARENT || P.FROZEN);
  const a = await openArm('duckpgq', G);
  const g = a.raw.graph;
  const cfg = C.normalise(RS.BASE);
  const seedNode = G.nodes.find((n) => n.sid.endsWith('jobs/service.py#JobService.transition')) || G.nodes.find((n) => n.kind === 'function');
  const S = [seedNode.file, seedNode.i].join(', ');
  const pj = await g.projection('both', cfg.classes.map((c) => CLASSES.indexOf(c)), 0.5, null);
  const t = async (label, sql) => { try { const s = now(); const r = await g.all(sql); console.log((now() - s).toFixed(1).padStart(9), 'ms', label, 'rows', r.length, JSON.stringify(r[0] || {}).slice(0, 160)); return r; } catch (e) { console.log('ERR', label, String(e.message).split('\n')[0].slice(0, 300)); } };
  const V = '(SELECT count(*) FROM st.node)';
  const cexpr = 'CASE t.cid WHEN 3 THEN 1.0::DOUBLE ELSE 2.0::DOUBLE END';
  const call = (id, extra = '') => `SELECT count(cost) AS reached, min(cost) AS mn, max(cost) AS mx FROM (SELECT cheapest_path_length(${id}, ${V}, x.rowid, y.rowid)${extra} AS cost FROM (SELECT rowid, id FROM st.node WHERE id IN (${S})) x, st.node y)`;
  await t('same stmt id0', `WITH ${g.csrCte(pj, 0, cexpr)} ${call(0, ' + 0 * csr.temp').replace('FROM (SELECT rowid', 'FROM csr, (SELECT rowid')}`);
  await t('same stmt id0 double cast', `WITH ${g.csrCte(pj, 0, cexpr)} ${call(0, ' + 0.0::DOUBLE * csr.temp').replace('FROM (SELECT rowid', 'FROM csr, (SELECT rowid')}`);
  for (const id of [5, 6]) {
    const build = g.csrCte(pj, id, cexpr).replace(/^csr AS MATERIALIZED \(/, '').replace(/\)$/, '');
    await t('build ' + id, build);
    await t('cheapest ' + id + ' #1', call(id));
    await t('cheapest ' + id + ' #2', call(id));
    await t('delete ' + id, `SELECT delete_csr(${id}) AS d`);
  }
  await g.run('BEGIN TRANSACTION');
  const build = g.csrCte(pj, 9, cexpr).replace(/^csr AS MATERIALIZED \(/, '').replace(/\)$/, '');
  await t('tx build 9', build); await t('tx cheapest 9', call(9)); await t('tx delete 9', 'SELECT delete_csr(9) AS d');
  await g.run('ROLLBACK');
  await t('iterativelength after (same stmt id0)', `WITH ${g.csrCte(pj, 0)} SELECT count(len) AS n FROM (SELECT iterativelength(0, ${V}, x.rowid, y.rowid) + 0 * csr.temp AS len FROM csr, (SELECT rowid, id FROM st.node WHERE id IN (${S})) x, st.node y)`);
  await a.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
