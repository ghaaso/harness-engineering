'use strict';
// Native-prior diagnostics over the TUNE parents' stores (written before any score; it reads only the
// graphs): the core-number distribution (to fix the x_core cuts), and the spread of the engine's
// Louvain over 5 runs (louvain() takes no seed, so the stored community is one run of several
// possible ones). Spread = number of communities, modularity-free agreement as the adjusted Rand index
// of each run against the stored run, and the share of nodes whose seed-community membership flips.
//   node arms/ladybug/priors.js [--parents N] [--threads N] [--out file]
const fs = require('fs');
const path = require('path');
const H = require('../common/harness');
const P = require('../common/paths');
const { graphFor } = require('../common/arms');
const S = require('./store');

function ari(a, b) {
  const n = a.length; const ct = new Map(); const ra = new Map(); const rb = new Map();
  for (let i = 0; i < n; i++) {
    const k = a[i] + '|' + b[i];
    ct.set(k, (ct.get(k) || 0) + 1); ra.set(a[i], (ra.get(a[i]) || 0) + 1); rb.set(b[i], (rb.get(b[i]) || 0) + 1);
  }
  const c2 = (x) => (x * (x - 1)) / 2;
  let s = 0; for (const v of ct.values()) s += c2(v);
  let sa = 0; for (const v of ra.values()) sa += c2(v);
  let sb = 0; for (const v of rb.values()) sb += c2(v);
  const e = (sa * sb) / c2(n); const m = (sa + sb) / 2;
  return m === e ? 1 : (s - e) / (m - e);
}

function main() {
  const a = process.argv.slice(2);
  let nPar = 5; let out = path.join(P.RESULTS, 'ladybug', 'priors.json'); let threads = 1;
  for (let i = 0; i < a.length; i++) { if (a[i] === '--parents') nPar = Number(a[++i]); else if (a[i] === '--threads') threads = Number(a[++i]); else if (a[i] === '--out') out = a[++i]; else throw new Error('unknown argument ' + a[i]); }
  const tasks = H.loadTasks(['T1', 'T2'], 'tune');
  const parents = [...new Set(tasks.map((t) => t.parent))].sort().slice(0, nPar);
  const res = [];
  for (const parent of parents) {
    const G = graphFor(parent);
    const st = S.open(G, P.storeFor('ladybug'), { threads });
    const c = st.conn; const run = (q) => S.getAll(c.querySync(q));
    const core = run('MATCH (n:N) RETURN n.core AS k, count(*) AS n ORDER BY k').map((r) => [S.num(r.k), S.num(r.n)]);
    const total = core.reduce((x, y) => x + y[1], 0);
    const above = (k) => core.filter((r) => r[0] > k).reduce((x, y) => x + y[1], 0) / total;
    run('LOAD EXTENSION algo');
    const ids = run('MATCH (n:N) RETURN n.id AS i, n.comm AS c ORDER BY n.id');
    const stored = ids.map((r) => S.num(r.c));
    const runs = [];
    let gname = 'pr' + Date.now();
    run(`CALL PROJECT_GRAPH('${gname}', ['N'], {'A': '${S.CODE_FILTER.replace(/'/g, "\\'")}'})`);
    for (let k = 0; k < 5; k++) {
      const t = Date.now();
      const m = new Map(run(`CALL louvain('${gname}') RETURN node.id AS i, louvain_id AS c`).map((r) => [S.num(r.i), S.num(r.c)]));
      const lab = ids.map((r) => m.get(S.num(r.i)));
      runs.push({ ms: Date.now() - t, communities: new Set(lab).size, ari_vs_stored: +ari(stored, lab).toFixed(4) });
    }
    res.push({ parent, nodes: total, core_hist: core, share_above: Object.fromEntries([1, 2, 3, 4, 5, 6, 8, 10, 12].map((k) => [k, +above(k).toFixed(4)])), stored_communities: new Set(stored).size, louvain_runs: runs });
    st.conn.closeSync(); st.db.closeSync();
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res.map((r) => ({ parent: r.parent.slice(0, 8), nodes: r.nodes, share_above: r.share_above, stored: r.stored_communities, runs: r.louvain_runs.map((x) => [x.communities, x.ari_vs_stored, x.ms]) }))));
}
main();
