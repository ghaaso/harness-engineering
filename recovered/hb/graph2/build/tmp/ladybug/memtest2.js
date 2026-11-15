// Is a closed Database's memory released? MODE=query (querySync only) | prep (prepared statements)
const H = require('/build/arms/common/harness');
const P = require('/build/arms/common/paths');
const S = require('/build/arms/ladybug/store');
const { graphFor } = require('/build/arms/common/arms');
const mode = process.env.MODE || 'query';
const tasks = H.loadTasks(['T1', 'T2'], 'tune');
const parents = [...new Set(tasks.map((t) => t.parent))].sort().slice(0, 15);
const Q = 'MATCH (s:N)-[p:A* SHORTEST 1..6 (r, n | WHERE r.w >= 0.5)]-(v:N) WHERE s.id IN [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] RETURN v.id AS v, min(length(p)) AS h';
for (const p of parents) {
  const G = graphFor(p);
  const st = S.open(G, P.storeFor('ladybug'), { threads: 1, bufferPool: Number(process.env.BP || 1024) * 1048576 });
  for (let k = 0; k < 30; k++) {
    if (mode === 'prep') { const ps = st.conn.prepareSync(Q.replace('1..6', '1..' + (2 + (k % 5)))); S.getAll(st.conn.executeSync(ps, {})); }
    else S.getAll(st.conn.querySync(Q));
  }
  st.conn.closeSync(); st.db.closeSync();
  if (global.gc) global.gc();
  console.log(mode, p.slice(0, 8), 'rss', Math.round(process.memoryUsage().rss / 1048576));
}
