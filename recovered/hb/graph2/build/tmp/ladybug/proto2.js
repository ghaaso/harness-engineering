// Prototype 2: query-shape alternatives on the frozen store (label count, frontier lookups, PPR mat-vec).
const S = require('/build/arms/ladybug/store');
const { loadFacts } = require('/build/arms/common/facts');
const { CLASSES } = require('/build/arms/common/edgeclasses');
const P = require('/build/arms/common/paths');
const now = () => Number(process.hrtime.bigint()) / 1e6;
const G = loadFacts(P.FROZEN);
const st = S.open(G, '/store/ladybug-proto', { threads: Number(process.env.TH || 0) || undefined });
const c = st.conn;
const ex = (ps, p) => S.getAll(c.executeSync(ps, p));
const all = (s) => S.getAll(c.querySync(s));
const types = st.meta.types;
const CODE = ['structure', 'imports', 'calls', 'http', 'tests', 'data', 'config', 'history'].map((x) => CLASSES.indexOf(x));
const lab = [];
for (const x of types) if (CODE.includes(x.cls)) { lab.push('f_' + x.t); if (!x.sym) lab.push('r_' + x.t); }
const L = lab.join('|');
const seeds = G.nodes.filter((n) => n.kind === 'function' && !n.is_test).filter((_, i) => i % 40 === 0).slice(0, 20).map((n) => [n.file, n.i]);
const time = (name, ps, args, reps = 1) => {
  const ts = []; let sz = 0;
  for (const a of args) { for (let k = 0; k < reps; k++) { const t = now(); const r = ex(ps, a); ts.push(now() - t); sz = r.length; } }
  ts.sort((a, b) => a - b);
  console.log(name.padEnd(48), 'p50', ts[Math.floor(ts.length / 2)].toFixed(2), 'max', ts[ts.length - 1].toFixed(2), 'rows(last)', sz);
};
console.log('threads', all("CALL current_setting('threads') RETURN *"));
// hop query: kind tables vs E table
for (const H of [2, 6]) {
  time('kind tables SHORTEST H' + H, c.prepareSync(`MATCH (s:N)-[p:${L}* SHORTEST 1..${H} (r, n | WHERE r.w >= 0.5)]->(v:N) WHERE s.id IN $S RETURN v.id AS v, min(length(p)) AS h`), seeds.map((s) => ({ S: s })));
  time('E table undirected SHORTEST H' + H, c.prepareSync(`MATCH (s:N)-[p:E* SHORTEST 1..${H} (r, n | WHERE r.w >= 0.5 AND r.cls IN [${CODE.join(',')}])]-(v:N) WHERE s.id IN $S RETURN v.id AS v, min(length(p)) AS h`), seeds.map((s) => ({ S: s })));
  time('kind tables SHORTEST H' + H + ' one source', c.prepareSync(`MATCH (s:N)-[p:${L}* SHORTEST 1..${H} (r, n | WHERE r.w >= 0.5)]->(v:N) WHERE s.id = $s RETURN v.id AS v, length(p) AS h`), seeds.map((s) => ({ s: s[1] })));
  time('kind tables SHORTEST H' + H + ' no filter', c.prepareSync(`MATCH (s:N)-[p:${L}* SHORTEST 1..${H}]->(v:N) WHERE s.id IN $S RETURN v.id AS v, min(length(p)) AS h`), seeds.map((s) => ({ S: s })));
}
time('unbounded kind tables', c.prepareSync(`MATCH (s:N)-[p:${L}* SHORTEST 1..10000 (r, n | WHERE r.w >= 0.5)]->(v:N) WHERE s.id IN $S RETURN v.id AS v, min(length(p)) AS h`), seeds.slice(0, 5).map((s) => ({ S: s })));
time('unbounded kind tables 1..30', c.prepareSync(`MATCH (s:N)-[p:${L}* SHORTEST 1..30 (r, n | WHERE r.w >= 0.5)]->(v:N) WHERE s.id IN $S RETURN v.id AS v, min(length(p)) AS h`), seeds.slice(0, 5).map((s) => ({ S: s })));
time('unbounded E', c.prepareSync(`MATCH (s:N)-[p:E* SHORTEST 1..10000 (r, n | WHERE r.w >= 0.5 AND r.cls IN [${CODE.join(',')}])]-(v:N) WHERE s.id IN $S RETURN v.id AS v, min(length(p)) AS h`), seeds.slice(0, 5).map((s) => ({ S: s })));
// frontier arcs
const ids = all('MATCH (n:N) RETURN n.id AS i LIMIT 600').map((r) => S.num(r.i));
for (const n of [30, 600]) {
  time('frontier UNWIND pk ' + n, c.prepareSync(`UNWIND $F AS f MATCH (u:N {id: f})-[r:${L}]->(v:N) WHERE r.w >= 0.5 RETURN u.id AS u, v.id AS v, r.kid AS k, r.o AS o`), [{ F: ids.slice(0, n) }], 5);
  time('frontier IN list ' + n, c.prepareSync(`MATCH (u:N)-[r:${L}]->(v:N) WHERE u.id IN $F AND r.w >= 0.5 RETURN u.id AS u, v.id AS v, r.kid AS k, r.o AS o`), [{ F: ids.slice(0, n) }], 5);
  time('frontier E undirected IN list ' + n, c.prepareSync(`MATCH (u:N)-[r:E]-(v:N) WHERE u.id IN $F AND r.w >= 0.5 AND r.cls IN [${CODE.join(',')}] RETURN u.id AS u, v.id AS v, r.kid AS k`), [{ F: ids.slice(0, n) }], 5);
}
// PPR mat-vec with structs
const Pv = all('MATCH (n:N) RETURN n.id AS i').map((r) => ({ i: S.num(r.i), p: 0.0001 }));
const pq = c.prepareSync(`UNWIND $P AS x MATCH (u:N {id: x.i})-[r:${L}]->(v:N) RETURN v.id AS v, sum(x.p * r.w) AS s`);
time('PPR mat-vec full (struct)', pq, [{ P: Pv }], 5);
time('PPR mat-vec 500', pq, [{ P: Pv.slice(0, 500) }], 5);
const pq2 = c.prepareSync(`MATCH (u:N)-[r:${L}]->(v:N) WHERE u.id IN $I RETURN u.id AS u, v.id AS v, r.w AS w`);
time('arcs of all nodes (IN)', pq2, [{ I: Pv.map((x) => x.i) }], 3);
const pq3 = c.prepareSync(`MATCH (u:N)-[r:${L}]->(v:N) RETURN u.id AS u, v.id AS v, r.w AS w, r.cls AS c`);
time('all arcs (no filter)', pq3, [{}], 3);
// GDS
all('LOAD EXTENSION algo');
all(`CALL PROJECT_GRAPH('pg', ['N'], {'E': 'r.cls IN [${CODE.join(',')}]'})`);
const gq = (s) => `CALL GDS_PPR('pg', [${s.map((x) => x - 1).join(',')}], dampingFactor := 0.7) RETURN node.id AS i, rank`;
let t = now(); const g1 = all(gq(seeds[0])); console.log('gds_ppr ms', (now() - t).toFixed(1), 'nonzero', g1.filter((r) => r.rank > 0).length);
t = now(); all(gq(seeds[1])); console.log('gds_ppr ms (2nd)', (now() - t).toFixed(1));
t = now(); const g2 = all("CALL page_rank('pg', dampingFactor := 0.7, maxIterations := 40) RETURN node.id AS i, rank"); console.log('page_rank ms', (now() - t).toFixed(1), g2.length);
t = now(); const g3 = all("CALL louvain('pg') RETURN node.id AS i, louvain_id"); console.log('louvain ms', (now() - t).toFixed(1), new Set(g3.map((r) => S.num(r.louvain_id))).size);
process.exit(0);
