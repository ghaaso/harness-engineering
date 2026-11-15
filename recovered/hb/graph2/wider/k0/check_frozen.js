'use strict';
// Check 1: the JS question programs give, at the frozen commit, exactly the answers the finished test's
// relational (SQL) arm wrote for the 50 questions (tune and held-out answer files, read only).
const fs = require('fs');
const path = require('path');
const C = require('./conf');
const { Snap } = require('./load');
const { Rec } = require('./rec');
const { P } = require('./programs');
const tqt = require('./lib/common/tqtarget');

const rd = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const qs = rd(path.join(C.TASKS, 'tq_questions.jsonl'));
const ans = new Map();
for (const f of [path.join(C.BUILD_RESULTS, 'tq', 'relational.tune.answers.jsonl'), path.join(C.BUILD_RESULTS, 'heldout', 'tq', 'relational.answers.jsonl')]) for (const a of rd(f)) ans.set(a.id, a.answer);
const t0 = Date.now();
const S = new Snap(C.FROZEN);
console.log('load ms', Date.now() - t0, 'nodes', S.G.nodes.length, 'edges', S.G.edges.length);
const have = new Set(S.G.nodes.map((n) => n.sid));
let same = 0; const diff = [];
for (const q of qs) {
  let tg = tqt.parse(q);
  if (tg.sid != null && tg.sid.startsWith('sym:')) tg = tqt.nearest(tg.sid, have);
  const a = P[q.kind](new Rec(S), tg);
  const ref = ans.get(q.id);
  if (JSON.stringify(a) === JSON.stringify(ref)) same++; else diff.push({ id: q.id, kind: q.kind, mine: a, sql: ref });
}
console.log('same', same, 'of', qs.length);
for (const d of diff) console.log(JSON.stringify(d).slice(0, 1500));
fs.mkdirSync(C.OUT, { recursive: true });
fs.writeFileSync(path.join(C.OUT, 'check_frozen.json'), JSON.stringify({ same, total: qs.length, diff }, null, 1));
