'use strict';
// Audit check 5b: recompute, from the raw node files, where each question's anchors exist, and the
// longest run of consecutive main-chain snapshots holding an anchor; compare with k0's questions.json.
const fs = require('fs');
const path = require('path');
const { FACTS } = require('./myload');
const K0 = path.resolve(__dirname, '..', 'k0');
const QS = JSON.parse(fs.readFileSync(path.join(K0, 'data', 'questions.json'), 'utf8')).questions;
const { mine, onMain } = JSON.parse(fs.readFileSync(path.join(__dirname, 'mytree.json'), 'utf8'));
const want = new Set(QS.flatMap((q) => q.anchors));
const has = new Map(); // sha -> Set of wanted anchors present
for (const s of Object.keys(mine)) {
  const set = new Set();
  for (const l of fs.readFileSync(path.join(FACTS, s, 'nodes.jsonl'), 'utf8').split('\n')) { if (!l) continue; const id = JSON.parse(l).id; if (want.has(id)) set.add(id); }
  has.set(s, set);
}
let sameExists = 0; let sameRun = 0; const diff = [];
for (const q of QS) {
  const ex = Object.keys(mine).filter((s) => q.anchors.some((a) => has.get(s).has(a))).sort();
  const k0 = q.exists_at.slice().sort();
  if (JSON.stringify(ex) === JSON.stringify(k0)) sameExists++; else diff.push({ q: q.qid, mine: ex.length, k0: k0.length });
  const run = Math.max(...q.anchors.map((a) => { let best = 0; let cur = 0; for (const s of onMain) { if (has.get(s).has(a)) { cur++; best = Math.max(best, cur); } else cur = 0; } return best; }));
  if (run === q.max_run_main) sameRun++; else if (diff.length < 20) diff.push({ q: q.qid, run_mine: run, run_k0: q.max_run_main });
}
const out = { questions: QS.length, exists_at_agree: sameExists, max_run_main_agree: sameRun, diffs: diff.slice(0, 20) };
fs.writeFileSync(path.join(__dirname, 'a5b_exists.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
