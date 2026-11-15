'use strict';
const L = require('./lib.js');
const { DatabaseSync } = require('node:sqlite');
const B = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/audit/facts/frozenA';
const snap = L.loadSnap(B); const n = snap.nodes.length;
const g = L.csr(n, L.pairsOf(snap, null, 'und'));
const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE e(src INTEGER, dst INTEGER, PRIMARY KEY(src,dst)) WITHOUT ROWID');
const ins = db.prepare('INSERT INTO e VALUES (?,?)');
db.exec('BEGIN'); for (let u = 0; u < n; u++) for (let i = g.off[u]; i < g.off[u+1]; i++) ins.run(u, g.adj[i]); db.exec('COMMIT');
const stmts = {};
for (const K of [1,2,3,4,6]) stmts[K] = db.prepare(`WITH RECURSIVE r(id, d) AS (SELECT ?, 0 UNION SELECT e.dst, r.d+1 FROM r JOIN e ON e.src = r.id WHERE r.d < ${K}) SELECT COUNT(DISTINCT id) FROM r`);
const files = []; snap.nodes.forEach((x, i) => { if (x.kind === 'file') files.push(i); });
const bfs = L.makeBfs(n);
for (const K of [1,2,3,4,6]) {
  const ts = [], tc = []; let bad = 0;
  for (const s of files.slice(0, 40)) stmts[K].get(s);
  for (const s of files) { let a = L.now(); const r = stmts[K].get(s); ts.push((L.now() - a) * 1000); const c = Object.values(r)[0]; a = L.now(); const x = bfs(g, s, K, null); tc.push((L.now() - a) * 1000); if (c !== x) bad++; }
  console.log('k=' + K, 'SQLite recursive CTE us median', L.median(ts).toFixed(0), 'p90', L.pct(ts, 0.9).toFixed(0), '| typed-array CSR us median', L.median(tc).toFixed(1), '| ratio', (L.median(ts) / L.median(tc)).toFixed(0) + 'x', '| answer mismatches', bad);
}
// level-wise one statement per hop, application-driven (what the engine bench called level-wise)
const nb = db.prepare('SELECT dst FROM e WHERE src = ?');
function levelwise(s, K) { const seen = new Set([s]); let fr = [s]; for (let d = 0; d < K; d++) { const nx = []; for (const u of fr) for (const r of nb.all(u)) if (!seen.has(r.dst)) { seen.add(r.dst); nx.push(r.dst); } fr = nx; } return seen.size; }
for (const K of [2, 4]) { const ts = []; for (const s of files.slice(0, 100)) { const a = L.now(); levelwise(s, K); ts.push((L.now() - a) * 1000); } console.log('k=' + K, 'one prepared statement per visited node (N+1 style) us median', L.median(ts).toFixed(0)); }
