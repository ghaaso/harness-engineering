// Prototype 3: arc table A (direction modes vs reference), PPR inside the engine, GDS_PPR semantics.
const S = require('/build/arms/ladybug/store');
const { loadFacts } = require('/build/arms/common/facts');
const { RefGraph } = require('/build/arms/reference/ref');
const { CLASSES } = require('/build/arms/common/edgeclasses');
const C = require('/build/arms/common/config');
const P = require('/build/arms/common/paths');
const now = () => Number(process.hrtime.bigint()) / 1e6;
const G = loadFacts(P.FROZEN);
const st = S.open(G, '/store/ladybug-proto', { threads: 1 });
console.log('built', st.built && JSON.stringify(st.built.build), st.meta.bytes);
const c = st.conn;
const ex = (s, p) => S.getAll(p ? c.executeSync(c.prepareSync(s), p) : c.querySync(s));
const ref = new RefGraph(G);
const CODE = ['structure', 'imports', 'calls', 'http', 'tests', 'data', 'config', 'history'];
const M = CODE.map((x) => CLASSES.indexOf(x));
const seeds = G.nodes.filter((n) => n.kind === 'function' && !n.is_test).filter((_, i) => i % 40 === 0).slice(0, 10).map((n) => [n.file, n.i]);
const pat = { dependencies: ['-', '->', ''], dependents: ['<-', '-', ''], both: ['-', '-', ' AND (r.sym = 0 OR r.prim = 1)'] };
for (const dir of ['dependencies', 'dependents', 'both']) {
  const [a, b, x] = pat[dir];
  for (const H of [2, 4, null]) {
    const q = `MATCH (s:N)${a}[p:A* SHORTEST 1..${H || 10000} (r, n | WHERE r.w >= 0.5 AND r.cls IN [${M.join(',')}]${x})]${b}(v:N) WHERE s.id IN $S RETURN v.id AS v, min(length(p)) AS h`;
    let diff = 0; const ts = [];
    for (const s of seeds) {
      const t = now(); const rows = ex(q, { S: s }); ts.push(now() - t);
      const m = new Map(rows.map((r) => [S.num(r.v), S.num(r.h)])); for (const y of s) m.delete(y);
      const cfg = C.normalise({ granularity: 'file', form: 'paths', direction: dir, classes: CODE, traversal: { mode: 'khop', hops: H }, hub: { mode: 'none' }, rank: { mode: 'bfs' } });
      const R = ref.rank(s, cfg, null);
      if (R.length !== m.size || R.some((y) => m.get(y.i) !== y.hop)) diff++;
    }
    ts.sort((p, q2) => p - q2);
    console.log(dir, 'H', H, 'diffs', diff, 'p50 ms', ts[5].toFixed(2));
  }
}
// PPR inside the engine: node properties p, q, W, written per iteration
try { ex('ALTER TABLE N ADD p DOUBLE DEFAULT 0'); ex('ALTER TABLE N ADD q DOUBLE DEFAULT 0'); ex('ALTER TABLE N ADD W DOUBLE DEFAULT 0'); } catch (e) { console.log(String(e.message)); }
const F = `r.cls IN [${M.join(',')}]`;
const s0 = seeds[0];
let t = now();
ex('MATCH (n:N) SET n.W = 0.0, n.p = 0.0, n.q = 0.0');
ex(`MATCH (u:N)-[r:A]->(v:N) WHERE ${F} WITH u, sum(r.w) AS W SET u.W = W`);
ex(`MATCH (u:N)<-[r:A]-(v:N) WHERE ${F} AND r.sym = 0 WITH u, sum(r.w) AS W SET u.W = u.W + W`);
ex(`MATCH (n:N) WHERE n.id IN [${s0.join(',')}] SET n.p = ${1 / s0.length}`);
const tW = now() - t; t = now();
const a = 0.3;
for (let it = 0; it < 40; it++) {
  const dm = S.num(ex('MATCH (n:N) WHERE n.p > 0 AND n.W = 0 RETURN coalesce(sum(n.p), 0.0) AS dm')[0].dm);
  ex('MATCH (n:N) WHERE n.q <> 0 SET n.q = 0.0');
  ex(`MATCH (u:N)-[r:A]->(v:N) WHERE u.p > 0 AND u.W > 0 AND ${F} WITH v, sum(u.p * r.w / u.W) AS s SET v.q = s`);
  ex(`MATCH (u:N)<-[r:A]-(v:N) WHERE u.p > 0 AND u.W > 0 AND ${F} AND r.sym = 0 WITH v, sum(u.p * r.w / u.W) AS s SET v.q = v.q + s`);
  ex(`MATCH (n:N) WHERE n.q <> 0 OR n.p <> 0 OR n.id IN [${s0.join(',')}] SET n.p = ${1 - a} * n.q + CASE WHEN n.id IN [${s0.join(',')}] THEN ${(a)} / ${s0.length} + ${(1 - a)} * ${'$dm'} / ${s0.length} ELSE 0.0 END`.replace('$dm', String(dm)));
}
const tI = now() - t;
const pr = new Map(ex('MATCH (n:N) WHERE n.p > 0 RETURN n.id AS i, n.p AS p').map((r) => [S.num(r.i), r.p]));
const cfg = C.normalise({ granularity: 'file', form: 'paths', direction: 'both', classes: CODE, traversal: { mode: 'khop', hops: null }, hub: { mode: 'none' }, rank: { mode: 'ppr', restart: 0.3, cochange_w: 1 } });
const R = ref.rank(s0, cfg, null); let mx = 0;
for (const y of R) mx = Math.max(mx, Math.abs((pr.get(y.i) || 0) - y.score));
console.log('in-engine PPR: W', tW.toFixed(1), 'ms, 40 iterations', tI.toFixed(1), 'ms, max |diff| vs reference', mx);
// GDS_PPR semantics on a tiny directed graph inside the same engine
ex('CREATE NODE TABLE X(id INT64, PRIMARY KEY(id))'); ex('CREATE REL TABLE XE(FROM X TO X, w DOUBLE)');
for (let i = 0; i < 4; i++) ex(`CREATE (:X {id: ${i}})`);
for (const [u, v, w] of [[0, 1, 1], [1, 2, 5], [1, 3, 1]]) ex(`MATCH (a:X {id:${u}}), (b:X {id:${v}}) CREATE (a)-[:XE {w: ${w}}]->(b)`);
ex('LOAD EXTENSION algo'); ex("CALL PROJECT_GRAPH('xg', ['X'], ['XE'])");
console.log('GDS_PPR from 0 on 0->1, 1->2 (w5), 1->3 (w1):', JSON.stringify(ex("CALL GDS_PPR('xg', [0], dampingFactor := 0.7) RETURN node.id AS i, rank").map((r) => [S.num(r.i), +r.rank.toFixed(4)])));
console.log('GDS_PPR from 2:', JSON.stringify(ex("CALL GDS_PPR('xg', [2], dampingFactor := 0.7) RETURN node.id AS i, rank").map((r) => [S.num(r.i), +r.rank.toFixed(4)])));
console.log('page_rank:', JSON.stringify(ex("CALL page_rank('xg', dampingFactor := 0.7) RETURN node.id AS i, rank").map((r) => [S.num(r.i), +r.rank.toFixed(4)])));
for (const o of ['normalized := true', 'sinkHandling := 1', 'distributeSinks := true', 'weight := true', 'weighted := true', 'directed := true', 'norm := 1', 'maxIterations := 40', 'tolerance := 0.000001'])
  { try { console.log('GDS_PPR', o, JSON.stringify(ex(`CALL GDS_PPR('xg', [0], ${o}) RETURN node.id AS i, rank`).map((r) => +r.rank.toFixed(4)))); } catch (e) { console.log('GDS_PPR', o, String(e.message).slice(0, 120)); } }
process.exit(0);
