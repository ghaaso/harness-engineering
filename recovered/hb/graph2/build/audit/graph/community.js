'use strict';
// CHECK 4 (community prior). Is the Ladybug arm's stored Louvain community (x_comm) reproducible as
// its builder states ("same store: identical partitions at 1 and 6 threads; separate builds differ")?
// For 2 TUNE parents: 3 fresh builds with the arm's own build(), then Louvain re-run 3 times on the
// first build at threads 1, 6 and 24 (the engine default here), and the builders' stored partition
// (volume gt-ladybug, read-only). Adjusted Rand index between every partition and build 1's. Also the
// k-core numbers and page_rank of the builds (both should be deterministic).
//   node community.js -> results/community.json
const fs = require('fs');
const A = '/build/arms';
const { loadFacts } = require(A + '/common/facts');
const LS = require(A + '/ladybug/store');
const lbug = require('@ladybugdb/core');

function ari(x, y) { // adjusted Rand index of two labelings (Map id -> label)
  const ids = [...x.keys()].filter((i) => y.has(i));
  const n = ids.length; const c2 = (k) => (k * (k - 1)) / 2;
  const ct = new Map(); const ra = new Map(); const rb = new Map();
  for (const i of ids) { const a = x.get(i); const b = y.get(i); const k = a + '|' + b; ct.set(k, (ct.get(k) || 0) + 1); ra.set(a, (ra.get(a) || 0) + 1); rb.set(b, (rb.get(b) || 0) + 1); }
  let s = 0; for (const v of ct.values()) s += c2(v);
  let sa = 0; for (const v of ra.values()) sa += c2(v);
  let sb = 0; for (const v of rb.values()) sb += c2(v);
  const exp = (sa * sb) / c2(n); const max = (sa + sb) / 2;
  return max === exp ? 1 : (s - exp) / (max - exp);
}
function readProps(dir) {
  const db = new lbug.Database(dir, 256 * 1024 * 1024, true, true, 2 ** 32); const c = new lbug.Connection(db);
  const rows = LS.getAll(c.querySync('MATCH (n:N) RETURN n.id AS i, n.comm AS comm, n.core AS core, n.prank AS pr'));
  c.closeSync(); db.closeSync();
  return { comm: new Map(rows.map((r) => [LS.num(r.i), LS.num(r.comm)])), core: new Map(rows.map((r) => [LS.num(r.i), LS.num(r.core)])), pr: new Map(rows.map((r) => [LS.num(r.i), r.pr])) };
}
function rerun(dir, threads) {
  const db = new lbug.Database(dir, 512 * 1024 * 1024, true, false, 2 ** 32); const c = new lbug.Connection(db);
  const run = (q) => LS.getAll(c.querySync(q));
  run('CALL threads=' + threads); run('LOAD EXTENSION algo');
  run(`CALL PROJECT_GRAPH('code2', ['N'], {'A': '${LS.CODE_FILTER}'})`);
  const rows = run("CALL louvain('code2') RETURN node.id AS i, louvain_id AS c");
  run("CALL DROP_PROJECTED_GRAPH('code2')");
  c.closeSync(); db.closeSync();
  return new Map(rows.map((r) => [LS.num(r.i), LS.num(r.c)]));
}
const nComm = (m) => new Set(m.values()).size;

function main() {
  const t = fs.readFileSync('/build/tasks/tasks.jsonl', 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((x) => x.split === 'tune');
  const ps = [...new Set(t.map((x) => x.parent))].sort();
  const parents = [ps[52], ps[26]];
  const out = [];
  for (const p of parents) {
    const G = loadFacts(p);
    const r = { parent: p, nodes: G.nodes.length, edges: G.edges.length, builds: [], reruns: [] };
    const props = [];
    for (let b = 0; b < 3; b++) {
      const dir = '/work/comm/' + p.slice(0, 8) + '-b' + b;
      fs.mkdirSync('/work/comm', { recursive: true });
      const meta = LS.build(G, dir);
      props.push(readProps(dir));
      r.builds.push({ build: b, ms: Math.round(meta.build.total_ms), communities: nComm(props[b].comm), ari_vs_build0: +ari(props[0].comm, props[b].comm).toFixed(4),
        core_equal_build0: [...props[0].core].every(([i, v]) => props[b].core.get(i) === v),
        prank_maxdiff_build0: Math.max(...[...props[0].pr].map(([i, v]) => Math.abs(props[b].pr.get(i) - v))) });
    }
    try { const st = readProps(LS.storeDir(G, '/lbstore/ladybug')); r.builder_store = { communities: nComm(st.comm), ari_vs_build0: +ari(props[0].comm, st.comm).toFixed(4), core_equal_build0: [...props[0].core].every(([i, v]) => st.core.get(i) === v) }; } catch (e) { r.builder_store = 'ERROR ' + e.message; }
    const d0 = '/work/comm/' + p.slice(0, 8) + '-b0';
    for (const th of [1, 6, 24]) for (let k = 0; k < 3; k++) { const m = rerun(d0, th); r.reruns.push({ threads: th, run: k, communities: nComm(m), ari_vs_stored: +ari(props[0].comm, m).toFixed(4) }); }
    out.push(r);
    process.stderr.write(JSON.stringify(r) + '\n');
  }
  fs.writeFileSync('/build/audit/graph/results/community.json', JSON.stringify(out, null, 1));
}
main();
