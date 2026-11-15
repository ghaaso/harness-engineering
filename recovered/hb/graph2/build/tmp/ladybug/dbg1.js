const lbug = require('@ladybugdb/core');
const S = require('/build/arms/ladybug/store');
const { loadFacts } = require('/build/arms/common/facts');
const P = require('/build/arms/common/paths');
const G = loadFacts(P.FROZEN);
const bp = Number(process.env.BP || 256) * 1024 * 1024;
const dir = S.storeDir(G, '/store/ladybug-dbg');
if (!require('fs').existsSync(dir + '.meta.json')) S.build(G, dir);
const db = new lbug.Database(dir, bp, true, false);
const c = new lbug.Connection(db); c.querySync('CALL threads=1');
const ids = G.nodes.map((n) => n.i);
for (const n of [10, 100, 1000, 5000]) {
  for (const [nm, t] of [
    ['fwd', 'MATCH (u:N)-[r:A]->(v:N) WHERE u.id IN $U AND r.cls IN [0, 2, 3] AND r.w >= 0.5 RETURN u.id AS u, v.id AS v'],
    ['union', 'MATCH (u:N)-[r:A]->(v:N) WHERE u.id IN $U AND r.cls IN [0, 2, 3] RETURN u.id AS u, v.id AS v UNION ALL MATCH (u:N)<-[r:A]-(v:N) WHERE u.id IN $U AND r.sym = 0 RETURN u.id AS u, v.id AS v'],
    ['unwind', 'UNWIND $U AS x MATCH (u:N {id: x})-[r:A]->(v:N) RETURN u.id AS u, v.id AS v'],
    ['listcontains', 'MATCH (u:N)-[r:A]->(v:N) WHERE list_contains($U, u.id) RETURN u.id AS u, v.id AS v'],
  ]) {
    try { const t0 = Date.now(); const r = S.getAll(c.executeSync(c.prepareSync(t), { U: ids.slice(0, n) })); console.log(n, nm, 'ok', r.length, Date.now() - t0, 'ms'); } catch (e) { console.log(n, nm, 'ERR', String(e.message).slice(0, 80)); }
  }
}
