// Louvain spread on the frozen store: 5 runs at the given thread count
const P = require('/build/arms/common/paths');
const S = require('/build/arms/ladybug/store');
const { loadFacts } = require('/build/arms/common/facts');
const G = loadFacts(P.FROZEN);
const st = S.open(G, P.storeFor('ladybug'), { threads: Number(process.env.TH || 1) });
const run = (q) => S.getAll(st.conn.querySync(q));
run('LOAD EXTENSION algo');
run(`CALL PROJECT_GRAPH('lv', ['N'], {'A': '${S.CODE_FILTER}'})`);
const ids = run('MATCH (n:N) RETURN n.id AS i, n.comm AS c ORDER BY n.id');
const stored = ids.map((r) => String(r.c));
const ari = (a, b) => { const n = a.length; const ct = new Map(); const ra = new Map(); const rb = new Map(); for (let i = 0; i < n; i++) { const k = a[i] + '|' + b[i]; ct.set(k, (ct.get(k) || 0) + 1); ra.set(a[i], (ra.get(a[i]) || 0) + 1); rb.set(b[i], (rb.get(b[i]) || 0) + 1); } const c2 = (x) => x * (x - 1) / 2; const sm = (m) => [...m.values()].reduce((x, v) => x + c2(v), 0); const s = sm(ct); const sa = sm(ra); const sb = sm(rb); const e = sa * sb / c2(n); const m = (sa + sb) / 2; return (s - e) / (m - e); };
const out = [];
for (let k = 0; k < 5; k++) {
  const m = new Map(run("CALL louvain('lv') RETURN node.id AS i, louvain_id AS c").map((r) => [S.num(r.i), String(r.c)]));
  const lab = ids.map((r) => m.get(S.num(r.i)));
  out.push(new Set(lab).size + ' communities, ARI vs stored ' + ari(stored, lab).toFixed(4));
}
console.log('threads', process.env.TH || 1, 'stored', new Set(stored).size, '|', out.join(' | '));
st.conn.closeSync(); st.db.closeSync();
