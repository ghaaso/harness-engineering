// Time the pattern-variant metapath on the frozen store for a few bench seeds
const P = require('/build/arms/common/paths');
const C = require('/build/arms/common/config');
const { loadFacts } = require('/build/arms/common/facts');
const LS = require('/build/arms/ladybug/sweep');
const { openInProc } = require('/build/arms/ladybug/arm');
const G = loadFacts(P.FROZEN);
const a = openInProc(G, { store: P.storeFor('ladybug') });
const defs = G.nodes.filter((n) => ['function', 'method', 'component'].includes(n.kind) && !n.is_test && n.file);
const k = Math.floor(defs.length / 30);
const cfg = C.normalise({ ...LS.BASE, traversal: { ...LS.METAPATH, variant: 'pattern' }, rank: { mode: 'bfs' } });
const cfg2 = C.normalise({ ...LS.BASE, traversal: LS.METAPATH, rank: { mode: 'bfs' } });
for (let j = 0; j < 30; j += 5) {
  const n = defs[j * k]; const ids = [n.file, n.i].sort((x, y) => x - y);
  let t = Date.now(); const r = a.rank(ids, cfg2, null); const t1 = Date.now() - t;
  t = Date.now(); const r2 = a.rank(ids, cfg, null); const t2 = Date.now() - t;
  console.log(j, 'spec', t1, 'ms', r.ranked.length, 'pattern', t2, 'ms', r2.ranked.length, 'queries', r2.meta.queries);
}
a.close();
