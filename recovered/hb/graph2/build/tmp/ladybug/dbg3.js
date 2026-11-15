// Which query shape leaks buffer-pool memory? MODE: same | distinct | query | flat | ckpt
const S = require('/build/arms/ladybug/store');
const { loadFacts } = require('/build/arms/common/facts');
const H = require('/build/arms/common/harness');
const tasks = H.loadTasks(['T1'], 'tune').slice(0, 1);
const G = loadFacts(tasks[0].parent);
const st = S.open(G, '/store/ladybug', { threads: 1 });
const c = st.conn;
const mode = process.env.MODE || 'same';
const N = Number(process.env.N || 1000);
let same = null;
for (let i = 0; i < N; i++) {
  const lit = mode === 'same' ? 100000 : i + 100000;
  const text = mode === 'flat'
    ? `MATCH (s:N)-[r:A]-(v:N) WHERE s.id IN $S AND NOT v.id IN [${lit}] RETURN v.id AS v`
    : `MATCH (s:N)-[p:A* SHORTEST 1..3 (r, n | WHERE r.w >= 0.5 AND NOT n.id IN [${lit}])]-(v:N) WHERE s.id IN $S RETURN v.id AS v, min(length(p)) AS h`;
  try {
    if (mode === 'query') { S.getAll(c.querySync(text.replace('$S', '[10, 20]'))); }
    else {
      const ps = mode === 'same' ? (same = same || c.prepareSync(text)) : c.prepareSync(text);
      S.getAll(c.executeSync(ps, { S: [10, 20] }));
    }
    if (mode === 'ckpt' && i % 50 === 49) S.getAll(c.querySync('CHECKPOINT'));
    if (mode === 'gc' && i % 20 === 19) global.gc();
  } catch (e) { console.log(mode, 'failed at', i, String(e.message).slice(0, 60)); process.exit(0); }
}
console.log(mode, 'all', N, 'ok');
process.exit(0);
