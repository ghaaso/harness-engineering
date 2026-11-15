// Prototype: build the store at the frozen commit, check derived properties against the reference
// arm, and time the candidate query shapes.
const S = require('/build/arms/ladybug/store');
const { loadFacts } = require('/build/arms/common/facts');
const { RefGraph } = require('/build/arms/reference/ref');
const { CLASSES } = require('/build/arms/common/edgeclasses');
const P = require('/build/arms/common/paths');
const now = () => Number(process.hrtime.bigint()) / 1e6;
const G = loadFacts(P.FROZEN);
const st = S.open(G, '/store/ladybug-proto');
console.log('built', JSON.stringify(st.built && st.built.build), st.meta.bytes);
const c = st.conn;
const all = (s, p) => { const r = p ? c.executeSync(c.prepareSync(s), p) : c.querySync(s); return S.getAll(r); };
// dl check
const ref = new RefGraph(G);
let bad = 0;
const dl = new Map(all('MATCH (n:N) RETURN n.id AS i, n.dl AS dl, n.transport AS t, n.pi_3 AS p3, n.pi_10 AS p10').map((r) => [S.num(r.i), r]));
const tr = ref.transport();
for (const n of G.nodes) {
  const toks = n.text ? n.text.split(' ').length : 0;
  const r = dl.get(n.i);
  if (S.num(r.dl) !== toks) { if (bad++ < 3) console.log('dl', n.i, n.text, r.dl, toks); }
  if (!!r.t !== !!tr[n.i]) { if (bad++ < 6) console.log('transport', n.i); }
}
// pi check for calls(3) and history(10)
const hd = new Map();
for (const e of G.edges) {
  for (const ci of [3, 10]) {
    if (e.c !== ci) continue;
    const k = ci + '|';
    if (!G.nodes[e.s - 1].is_test) hd.set(k + e.d, (hd.get(k + e.d) || 0) + 1);
    if (e.sym && !G.nodes[e.d - 1].is_test) hd.set(k + e.s, (hd.get(k + e.s) || 0) + 1);
  }
}
for (const [i, r] of dl) { if ((hd.get('3|' + i) || 0) !== S.num(r.p3) || (hd.get('10|' + i) || 0) !== S.num(r.p10)) { if (bad++ < 9) console.log('pi', i, r.p3, r.p10, hd.get('3|' + i), hd.get('10|' + i)); } }
console.log('derived mismatches', bad);
console.log('terms', all('MATCH (t:T) RETURN count(*) AS n'), all('MATCH ()-[h:HAS]->() RETURN count(*) AS n'));
console.log('prank/core/comm', all('MATCH (n:N) RETURN max(n.prank) AS pr, max(n.core) AS core, count(DISTINCT n.comm) AS comms'));
// timing: base khop 2 both code+history
const types = st.meta.types;
const CODE = ['structure', 'imports', 'calls', 'http', 'tests', 'data', 'config', 'history'].map((x) => CLASSES.indexOf(x));
const lab = [];
for (const x of types) if (CODE.includes(x.cls)) { lab.push('f_' + x.t); if (!x.sym) lab.push('r_' + x.t); }
console.log('labels', lab.length);
const seeds = G.nodes.filter((n) => n.kind === 'function' && !n.is_test).filter((_, i) => i % 40 === 0).slice(0, 20).map((n) => [n.file, n.i]);
for (const H of [1, 2, 3, 6, 10000]) {
  const qs = `MATCH (s:N)-[p:${lab.join('|')}* SHORTEST 1..${H} (r, n | WHERE r.w >= 0.5)]->(v:N) WHERE s.id IN $S RETURN v.id AS v, min(length(p)) AS h`;
  const ps = c.prepareSync(qs);
  const ts = []; let sz = 0;
  for (const s of seeds) { const t = now(); const r = S.getAll(c.executeSync(ps, { S: s })); ts.push(now() - t); sz += r.length; }
  ts.sort((a, b) => a - b);
  // compare with reference reach
  let diff = 0;
  for (const s of seeds.slice(0, 5)) {
    const cfg = { direction: 'both', classes: CODE.map((i) => CLASSES[i]), minConf: 0.5, traversal: { mode: 'khop', hops: H === 10000 ? null : H }, hub: { mode: 'none' }, rank: { mode: 'bfs' } };
    const a = ref.rank(s, cfg, null); const b = new Map(S.getAll(c.executeSync(ps, { S: s })).map((r) => [S.num(r.v), S.num(r.h)]));
    for (const x of s) b.delete(x);
    if (a.length !== b.size || a.some((x) => b.get(x.i) !== x.hop)) diff++;
  }
  console.log('khop H', H, 'p50', ts[10].toFixed(2), 'max', ts[19].toFixed(2), 'avg reach', sz / 20, 'reach diffs vs ref', diff);
}
// arcs out of a frontier
const fq = c.prepareSync(`UNWIND $F AS f MATCH (u:N {id: f[1]})-[r:${lab.join('|')}]->(v:N) WHERE r.w >= 0.5 RETURN f[2] AS hu, u.id AS u, v.id AS v, r.kid AS k, r.o AS o`);
const F = all('MATCH (n:N) RETURN n.id AS i LIMIT 600').map((r) => [S.num(r.i), 1]);
let t = now(); const ar = S.getAll(c.executeSync(fq, { F })); console.log('frontier 600 arcs', ar.length, (now() - t).toFixed(2), 'ms');
t = now(); const ar2 = S.getAll(c.executeSync(fq, { F: F.slice(0, 30) })); console.log('frontier 30 arcs', ar2.length, (now() - t).toFixed(2), 'ms');
// PPR mat-vec
const pq = c.prepareSync(`UNWIND $P AS x MATCH (u:N {id: x[1]})-[r:${lab.join('|')}]->(v:N) RETURN v.id AS v, sum(x[2] * r.w) AS s`);
const Pv = all('MATCH (n:N) RETURN n.id AS i').map((r) => [S.num(r.i), 0.0001]);
t = now(); for (let k = 0; k < 40; k++) S.getAll(c.executeSync(pq, { P: Pv })); console.log('40 full mat-vecs', (now() - t).toFixed(1), 'ms');
t = now(); for (let k = 0; k < 40; k++) S.getAll(c.executeSync(pq, { P: Pv.slice(0, 500) })); console.log('40 mat-vecs (500 nz)', (now() - t).toFixed(1), 'ms');
// GDS_PPR on a projected graph
all('LOAD EXTENSION algo');
console.log(all(`CALL PROJECT_GRAPH('pg', ['N'], {'E': 'r.cls IN [${CODE.join(',')}]'})`));
t = now(); const g1 = all(`CALL GDS_PPR('pg', [${seeds[0].map((x) => x - 1).join(',')}], dampingFactor := 0.7) RETURN node.id AS i, rank`); console.log('gds_ppr', g1.length, (now() - t).toFixed(1), 'ms', g1.filter((r) => r.rank > 0).length);
t = now(); const g2 = all(`CALL page_rank('pg', dampingFactor := 0.7, maxIterations := 40) RETURN node.id AS i, rank`); console.log('page_rank', g2.length, (now() - t).toFixed(1), 'ms');
process.exit(0);
