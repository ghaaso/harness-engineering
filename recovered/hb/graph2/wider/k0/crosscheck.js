'use strict';
// Check 2: at a spread of snapshots (main chain and side branches), every question of kinds 1-8 that is
// live there is answered by the JS port (programs.js) and by the finished test's SQL program
// (lib/relational/tq.js over a SQLite store built by lib/relational/db.js from the same graph), and
// the two answers must be byte-identical. Stores go to k0/store (deleted after use).
const fs = require('fs');
const path = require('path');
const C = require('./conf');
const { Snap } = require('./load');
const { Rec } = require('./rec');
const { P } = require('./programs');
const { buildDb, openDb } = require('./lib/relational/db');
const tq = require('./lib/relational/tq');

const tree = JSON.parse(fs.readFileSync(path.join(C.DATA, 'tree.json'), 'utf8'));
const Q = JSON.parse(fs.readFileSync(path.join(C.DATA, 'questions.json'), 'utf8')).questions.filter((q) => q.kind !== 'completion');
const order = tree.order;
const pick = process.argv[2] ? Number(process.argv[2]) : 12;
const shas = [];
for (let i = 0; i < pick; i++) shas.push(order[Math.min(order.length - 1, Math.round((i * (order.length - 1)) / (pick - 1)))]);
const store = path.join(C.K0, 'store'); fs.mkdirSync(store, { recursive: true });
let same = 0; let n = 0; const diffs = []; const per = [];
for (const sha of [...new Set(shas)]) {
  const S = new Snap(sha);
  const f = path.join(store, sha.slice(0, 12) + '.sqlite');
  buildDb(S.G, f);
  const db = openDb(f);
  let s1 = 0; let n1 = 0;
  for (const q of Q) {
    if (!q.exists_at.includes(sha)) continue;
    const mine = P[q.kind](new Rec(S), q.target);
    let sql; try { sql = tq.answer(db, q, q.target); } catch (e) { sql = 'ERR ' + e.message; }
    n++; n1++;
    if (JSON.stringify(mine) === JSON.stringify(sql)) { same++; s1++; } else diffs.push({ sha, qid: q.qid, kind: q.kind, mine, sql });
  }
  db.close();
  for (const x of [f, f + '-wal', f + '-shm']) if (fs.existsSync(x)) fs.rmSync(x);
  per.push({ sha, tree_depth: tree.nodes[sha].depth_fp, on_main: tree.nodes[sha].on_main_fp, compared: n1, identical: s1 });
  console.log(sha.slice(0, 8), 'compared', n1, 'identical', s1);
}
console.log('TOTAL compared', n, 'identical', same, 'differ', diffs.length);
for (const d of diffs.slice(0, 10)) console.log(JSON.stringify(d).slice(0, 1200));
fs.mkdirSync(C.OUT, { recursive: true });
fs.writeFileSync(path.join(C.OUT, 'crosscheck.json'), JSON.stringify({ snapshots: per, compared: n, identical: same, diffs }, null, 1));
