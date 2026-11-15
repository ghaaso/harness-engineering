'use strict';
// Pre-flight fix round 1: compare the re-runs with the stored TUNE answers.
//  T1: tmp/lock/preflight1/regress/<arm>/tune/<hash>.T1.jsonl.gz against results/<arm>/tune/<hash>.T1.jsonl.gz
//      (the reference arm's stage-2 primary is not stored under results/reference; it is compared with the
//      relational arm's file, as the lock lane did). Fields set aside: ms, engine_ms, config_name, meta
//      (meta compared separately, keys listed), and `arm` when comparing reference with relational.
//  TQ: tmp/lock/preflight1/tq/tq/<arm>.tune.answers.jsonl against results/tq/<arm>.tune.answers.jsonl;
//      every field but ms must be equal.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const B = path.resolve(__dirname, '..', '..', '..');
const D = path.join(__dirname, 'regress');
const rd = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const rl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const ids = fs.readFileSync(path.join(D, 'ids.txt'), 'utf8').split('\n').filter(Boolean);
const norm = (a, dropArm) => JSON.stringify({ ...a, ms: null, engine_ms: null, config_name: null, meta: null, arm: dropArm ? null : a.arm });
const metaNoMs = (m) => (m ? Object.fromEntries(Object.entries(m).filter(([k]) => !/(^|_)ms$/.test(k))) : m);
const t1 = []; let bad = 0;
for (const arm of fs.readdirSync(D).filter((x) => fs.statSync(path.join(D, x)).isDirectory())) {
  for (const f of fs.readdirSync(path.join(D, arm, 'tune'))) {
    const hash = f.split('.')[0];
    let sf = path.join(B, 'results', arm, 'tune', f); let against = arm;
    if (!fs.existsSync(sf)) { sf = path.join(B, 'results', 'relational', 'tune', f); against = 'relational'; }
    const now = rd(path.join(D, arm, 'tune', f));
    const st = new Map(rd(sf).map((a) => [a.id, a]));
    let same = 0; const diff = []; const metaKeys = {}; let metaDiff = 0;
    for (const a of now) {
      const s = st.get(a.id);
      if (s && norm(a, against !== arm) === norm(s, against !== arm)) same++; else diff.push(a.id);
      const ma = metaNoMs(a.meta) || {}; const ms = (s && metaNoMs(s.meta)) || {};
      if (against === arm && JSON.stringify(ma) !== JSON.stringify(ms)) { metaDiff++; for (const k of new Set([...Object.keys(ma), ...Object.keys(ms)])) if (JSON.stringify(ma[k]) !== JSON.stringify(ms[k])) metaKeys[k] = (metaKeys[k] || 0) + 1; }
    }
    const missing = ids.filter((i) => !now.some((a) => a.id === i));
    if (diff.length || missing.length) bad++;
    t1.push({ arm, hash, against: against + '/' + f, tasks: now.length, identical: same, differ: diff, missing, meta_differs: metaDiff, meta_keys_differing: metaKeys });
  }
}
const tq = []; let tqBad = 0;
const TD = path.join(__dirname, 'tq', 'tq');
for (const f of fs.existsSync(TD) ? fs.readdirSync(TD) : []) {
  const arm = f.split('.')[0];
  const now = rl(path.join(TD, f)); const st = new Map(rl(path.join(B, 'results', 'tq', f)).map((x) => [x.id, x]));
  const diff = []; let errors = 0;
  for (const a of now) { if (a.error) errors++; const s = st.get(a.id); if (!s || JSON.stringify({ ...a, ms: null }) !== JSON.stringify({ ...s, ms: null })) diff.push(a.id); }
  if (diff.length || now.length !== st.size) tqBad++;
  tq.push({ arm, questions: now.length, stored: st.size, identical: now.length - diff.length, differ: diff, errors });
}
const out = { t1_tasks_per_run: ids.length, t1_runs: t1.length, t1_runs_not_identical: bad, tq_arms: tq.length, tq_arms_not_identical: tqBad, t1, tq };
fs.writeFileSync(path.join(__dirname, 'check.json'), JSON.stringify(out, null, 1));
for (const r of t1) console.log('T1', r.arm.padEnd(11), r.hash, 'tasks', r.tasks, 'identical', r.identical, 'differ', r.differ.length, 'missing', r.missing.length, 'meta-differs', r.meta_differs, JSON.stringify(r.meta_keys_differing), 'vs', r.against);
for (const r of tq) console.log('TQ', r.arm.padEnd(11), 'questions', r.questions, 'identical', r.identical, 'differ', JSON.stringify(r.differ), 'errors', r.errors);
console.log(JSON.stringify({ t1_runs: t1.length, t1_runs_not_identical: bad, tq_arms: tq.length, tq_arms_not_identical: tqBad }));
process.exit(bad || tqBad ? 1 : 0);
