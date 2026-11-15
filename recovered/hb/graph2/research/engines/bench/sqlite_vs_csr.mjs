// Synthetic benchmark: strongest SQLite relational designs vs an in-memory CSR, same edges, same query.
// No install needed: node:sqlite is built into Node 24. Writes only to os.tmpdir().
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const N = +process.argv[2] || 100000, DEG = +process.argv[3] || 5, E = N * DEG;
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const src = new Int32Array(E), dst = new Int32Array(E);
for (let i = 0; i < E; i++) { src[i] = Math.floor(rnd() * N); dst[i] = Math.floor(N * rnd() * rnd()); } // skewed targets: hub-heavy like imports
// CSR (forward)
const off = new Int32Array(N + 1); for (let i = 0; i < E; i++) off[src[i] + 1]++; for (let i = 0; i < N; i++) off[i + 1] += off[i];
const adj = new Int32Array(E), pos = off.slice(0, N); for (let i = 0; i < E; i++) adj[pos[src[i]]++] = dst[i];
const csrBytes = off.byteLength + adj.byteLength;
function csrBfs(s, k) { const seen = new Int32Array(N).fill(-1); seen[s] = 0; let fr = [s]; for (let d = 1; d <= k && fr.length; d++) { const nx = []; for (const u of fr) for (let j = off[u]; j < off[u + 1]; j++) { const v = adj[j]; if (seen[v] < 0) { seen[v] = d; nx.push(v); } } fr = nx; } let c = 0; for (let i = 0; i < N; i++) if (seen[i] >= 0 && i !== s) c++; return c; }
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gb-')); const f = path.join(dir, 'g.db'); const db = new DatabaseSync(f);
db.exec('PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF;');
// Design A: WITHOUT ROWID, PK (src,dst) = covering forward index, one structure only
db.exec('CREATE TABLE edge(src INTEGER NOT NULL, dst INTEGER NOT NULL, PRIMARY KEY(src,dst)) WITHOUT ROWID;');
db.exec('BEGIN'); const ins = db.prepare('INSERT OR IGNORE INTO edge VALUES(?,?)'); for (let i = 0; i < E; i++) ins.run(src[i], dst[i]); db.exec('COMMIT');
const sizeA = fs.statSync(f).size; const distinctE = db.prepare('SELECT count(*) c FROM edge').get().c;
const recursive = db.prepare(`WITH RECURSIVE r(n,d) AS (SELECT ?,0 UNION SELECT e.dst, r.d+1 FROM r JOIN edge e ON e.src=r.n WHERE r.d<?) SELECT count(DISTINCT n) c FROM r WHERE n<>?`);
const levelStmt = (m) => db.prepare(`SELECT DISTINCT dst FROM edge WHERE src IN (${Array(m).fill('?').join(',')})`);
function sqlLevels(s, k) { const seen = new Set([s]); let fr = [s]; for (let d = 1; d <= k && fr.length; d++) { const nx = new Set(); for (let i = 0; i < fr.length; i += 500) { const ch = fr.slice(i, i + 500); const rows = levelStmt(ch.length).all(...ch); for (const r of rows) if (!seen.has(r.dst)) { seen.add(r.dst); nx.add(r.dst); } } fr = [...nx]; } return seen.size - 1; }
const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
const srcs = []; for (let i = 0; i < 30; i++) srcs.push(Math.floor(rnd() * N));
console.log(JSON.stringify({ N, E_generated: E, E_distinct: distinctE, sqlite_withoutrowid_bytes: sizeA, csr_bytes: csrBytes, edges_raw_int32_pairs_bytes: distinctE * 8 }));
for (const k of [1, 2, 3, 4, 6]) {
  const t = { csr: [], cte: [], levels: [] }; let ok = true, cnt = [];
  for (const s of srcs) {
    let t0 = performance.now(); const a = csrBfs(s, k); t.csr.push(performance.now() - t0);
    t0 = performance.now(); const b = recursive.get(s, k, s).c; t.cte.push(performance.now() - t0);
    t0 = performance.now(); const c = sqlLevels(s, k); t.levels.push(performance.now() - t0);
    if (a !== b || a !== c) ok = false; cnt.push(a);
  }
  console.log(JSON.stringify({ hops: k, median_reached: med(cnt), csr_ms: +med(t.csr).toFixed(3), sqlite_recursive_cte_ms: +med(t.cte).toFixed(3), sqlite_levelwise_ms: +med(t.levels).toFixed(3), answers_identical: ok }));
}
db.close(); fs.rmSync(dir, { recursive: true, force: true });
