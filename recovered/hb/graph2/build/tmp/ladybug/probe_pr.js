'use strict';
// Probe of LadybugDB page_rank semantics on toy graphs: directed or not, dangling mass, parameters.
const fs = require('fs');
const lbug = require('@ladybugdb/core');
const dir = '/tmp/probe_pr_db';
for (const s of ['', '.wal', '.shadow']) fs.rmSync(dir + s, { recursive: true, force: true });
const db = new lbug.Database(dir, 256 * 1024 * 1024, true, false, 2 ** 32);
const c = new lbug.Connection(db);
const run = (q) => { const r = c.querySync(q); const rows = r.getAllSync(); r.close(); return rows; };
run('CREATE NODE TABLE N(id INT64, PRIMARY KEY(id))');
run('CREATE REL TABLE A(FROM N TO N, k INT64)');
for (let i = 1; i <= 5; i++) run(`CREATE (:N {id: ${i}})`);
// 1->2, 2->3, 3->1, 1->4 ; node 4 dangling; node 5 isolated; k=1 edges; plus k=2 edge 2->1 (reverse twin)
for (const [a, b, k] of [[1, 2, 1], [2, 3, 1], [3, 1, 1], [1, 4, 1], [2, 1, 2]]) run(`MATCH (a:N {id: ${a}}), (b:N {id: ${b}}) CREATE (a)-[:A {k: ${k}}]->(b)`);
run('LOAD EXTENSION algo');
run("CALL PROJECT_GRAPH('g1', ['N'], {'A': 'r.k = 1'})");
run("CALL PROJECT_GRAPH('g2', ['N'], {'A': 'r.k >= 1'})");
const pr = (g, extra = '') => Object.fromEntries(run(`CALL page_rank('${g}'${extra}) RETURN node.id AS i, rank ORDER BY i`).map((r) => [Number(r.i), r.rank]));
const out = {};
out.g1_default = pr('g1');
out.g2_default = pr('g2');
for (const extra of [', dampingFactor := 0.85, maxIterations := 200, tolerance := 0.0000000001', ', normalizeInitial := false', ', maxIterations := 1']) {
  try { out['g1' + extra] = pr('g1', extra); } catch (e) { out['g1' + extra] = 'ERR ' + e.message.slice(0, 200); }
}
// reference computations on g1 (N = 5, d = 0.85)
function ref(edges, mode, iters = 200) {
  const N = 5; const d = 0.85; let p = Array(N + 1).fill(1 / N); p[0] = 0;
  const out = {}; for (const [a] of edges) out[a] = (out[a] || 0) + 1;
  for (let it = 0; it < iters; it++) {
    const q = Array(N + 1).fill(0);
    let dm = 0; for (let v = 1; v <= N; v++) if (!out[v]) dm += p[v];
    for (const [a, b] of edges) q[b] += d * p[a] / out[a];
    for (let v = 1; v <= N; v++) q[v] += (1 - d) / N + (mode === 'redistribute' ? d * dm / N : 0);
    p = q;
  }
  return Object.fromEntries(p.slice(1).map((x, i) => [i + 1, +x.toFixed(9)]));
}
const E1 = [[1, 2], [2, 3], [3, 1], [1, 4]];
out.ref_directed_dangling_lost = ref(E1, 'lost');
out.ref_directed_dangling_redistributed = ref(E1, 'redistribute');
out.ref_undirected_dangling_lost = ref([...E1, ...E1.map(([a, b]) => [b, a])], 'lost');
out.ref_reverse_dangling_lost = ref(E1.map(([a, b]) => [b, a]), 'lost');
out.sum_g1_default = Object.values(out.g1_default).reduce((a, b) => a + b, 0);
console.log(JSON.stringify(out, null, 1));
c.closeSync(); db.closeSync();
