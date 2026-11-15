'use strict';
// Build a throw-away copy of the build tree for the end-to-end lock test (tmp/lock/fakebuild). Its
// "held-out" tasks and questions are TUNE tasks and TUNE questions relabelled, so the whole held-out
// path (freeze, lock, run, output layout, run log, repeat, superseded, SCORING_STARTED, draws) can run
// for real without any held-out input. No real held-out line is copied.
//   node tmp/lock/make_fake.js
const fs = require('fs');
const path = require('path');
const B = path.resolve(__dirname, '..', '..', '..'); // round 2 copy: one folder deeper
const F = path.join(__dirname, 'fakebuild');
fs.rmSync(F, { recursive: true, force: true });
const ARMS = ['common', 'floor-dir', 'floor-co', 'search', 'relational', 'reference', 'ladybug', 'duckpgq'];
for (const a of ARMS) {
  const src = path.join(B, 'arms', a); const dst = path.join(F, 'arms', a);
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f);
    if (fs.statSync(s).isFile() && /\.(js|json|sql|sh)$/.test(f)) fs.copyFileSync(s, path.join(dst, f));
  }
}
fs.cpSync(path.join(B, 'arms', 'ladybug', 'priors'), path.join(F, 'arms', 'ladybug', 'priors'), { recursive: true });

const all = fs.readFileSync(path.join(B, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((t) => t.split === 'tune');
// three T1 tasks of one parent, two T2 tasks, two "T3" tasks (T1 tasks with ARCHITECTURE.md removed), one "T5"
const byParent = new Map();
for (const t of all.filter((x) => x.set === 'T1')) { if (!byParent.has(t.parent)) byParent.set(t.parent, []); byParent.get(t.parent).push(t); }
const [p] = [...byParent].filter(([, ts]) => ts.length >= 3).sort((x, y) => (x[0] < y[0] ? -1 : 1))[0];
const t1 = byParent.get(p).slice(0, 3);
const t2 = all.filter((x) => x.set === 'T2' && x.parent === p).slice(0, 2);
const fake = [];
for (const t of t1) fake.push({ ...t, id: 'F' + t.id, split: 'heldout' });
for (const t of (t2.length ? t2 : all.filter((x) => x.set === 'T2').slice(0, 2))) fake.push({ ...t, id: 'F' + t.id, split: 'heldout' });
for (const t of t1.slice(0, 2)) fake.push({ ...t, id: 'F3-' + t.id, set: 'T3', split: 'heldout', remove_paths: ['ARCHITECTURE.md'] });
fake.push({ id: 'F5-0001', set: 'T5', split: 'heldout', parent: p, seed: { query: 'jobs', tool: 'Grep' } });
// two TUNE T1 tasks stay tune, so the variant loader has something to accept
for (const t of t1.slice(0, 2)) fake.push(t);
fs.mkdirSync(path.join(F, 'tasks'), { recursive: true });
fs.writeFileSync(path.join(F, 'tasks', 'tasks.jsonl'), fake.map((x) => JSON.stringify(x)).join('\n') + '\n');
const qs = fs.readFileSync(path.join(B, 'tasks', 'tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((q) => q.split === 'tune').slice(0, 2).map((q) => ({ ...q, split: 'held_out' }));
fs.writeFileSync(path.join(F, 'tasks', 'tq_questions.jsonl'), qs.map((x) => JSON.stringify(x)).join('\n') + '\n');
fs.mkdirSync(path.join(F, 'results'), { recursive: true });
console.log(JSON.stringify({ fake: F, parent: p, tasks: fake.length, questions: qs.length, ids: fake.map((x) => x.id + ':' + x.set + ':' + x.split) }));
