'use strict';
// Preflight check 2: PLAN.json against addendum 4 section B, enumerated here by hand from the addendum
// text (item 4 hashes, item 5 rows, addendum 3 item 5 draws, item 6 questions, item 7 no T5).
// usage: node plancheck.js <build root> <out.json>
const fs = require('fs');
const path = require('path');
const B = process.argv[2];
const plan = JSON.parse(fs.readFileSync(path.join(B, 'results', 'frozen', 'PLAN.json'), 'utf8'));
const SETS = ['T1', 'T1x', 'T2', 'T3', 'T4'];
const COUNTS = { T1: 418, T1x: 82, T2: 237, T3: 25, T4: 8 };
const rows = [
  ['relational', 'primary', '95e990307da3b42b'], ['ladybug', 'primary', '95e990307da3b42b'], ['duckpgq', 'primary', '95e990307da3b42b'],
  ['search', 'primary', 'e70177e5807f0252'], ['floor-dir', 'primary', '714a474060653c1f'], ['floor-co', 'primary', 'c4d2f0a60a3d199c'],
  ['relational', 's1', '6b70cc1222745385'], ['ladybug', 's1', '6b70cc1222745385'], ['duckpgq', 's1', '6b70cc1222745385'],
  ['ladybug', 's2', 'f233ae069bdba0ce'], ['search', 's2', '950c029615d337c1'],
  ['reference', 'crosscheck', '95e990307da3b42b'], ['reference', 'crosscheck', '6b70cc1222745385'],
];
const want = new Map();
for (const [arm, role, hash] of rows) for (const s of SETS) {
  const draws = arm === 'ladybug' && role === 's2' ? [0, 1, 2, 3, 4] : [0];
  for (const d of draws) want.set([arm, role, hash, s, d].join('|'), COUNTS[s]);
}
const got = new Map();
const issues = [];
for (const r of plan.runs) {
  const k = [r.arm, r.role, r.hash, r.set, r.draw].join('|');
  if (got.has(k)) issues.push('duplicate run ' + k);
  got.set(k, r.expected_tasks);
  const dir = r.role === 'crosscheck' ? 'crosscheck-' + r.hash : r.role;
  const expOut = 'results/heldout/' + r.arm + '/' + dir + (r.draw ? '-draw' + r.draw : '') + '/' + r.set + '.jsonl.gz';
  if (r.out !== expOut) issues.push('out path ' + r.n + ': ' + r.out + ' != ' + expOut);
  const expCmd = (r.draw ? 'LB_COMM_DRAW=' + r.draw + ' ' : '') + 'node arms/common/run.js run --arm ' + r.arm + ' --config ' + r.hash + ' --sets ' + r.set + ' --split heldout --allow-heldout --frozen-hash ' + r.hash;
  if (r.command !== expCmd) issues.push('command ' + r.n + ': ' + r.command);
  const expLc = (r.draw ? 'LB_COMM_DRAW=' + r.draw + ' ' : '') + 'node arms/common/run.js lock-check --arm ' + r.arm + ' --config ' + r.hash + ' --sets ' + r.set;
  if (r.lock_check !== expLc) issues.push('lock_check ' + r.n + ': ' + r.lock_check);
  const rec = path.join(B, 'results', 'frozen', r.arm, r.hash + '.json');
  if (!fs.existsSync(rec)) issues.push('no frozen record for ' + k); else {
    const x = JSON.parse(fs.readFileSync(rec, 'utf8'));
    if (x.role !== r.role) issues.push('role mismatch ' + k + ' record ' + x.role);
  }
}
const missing = [...want.keys()].filter((k) => !got.has(k));
const extra = [...got.keys()].filter((k) => !want.has(k));
const badCount = [...want.keys()].filter((k) => got.has(k) && got.get(k) !== want.get(k));
const tqWant = ['relational', 'ladybug', 'duckpgq', 'search'];
const tqGot = plan.question_runs.map((q) => q.arm);
const tqOk = JSON.stringify([...tqGot].sort()) === JSON.stringify([...tqWant].sort()) && plan.question_runs.every((q) => q.expected_questions === 30 && q.command === 'node arms/common/run.js tq --arm ' + q.arm + ' --split heldout --allow-heldout');
// frozen records that the plan does not use
const extraRecords = [];
for (const arm of fs.readdirSync(path.join(B, 'results', 'frozen')).filter((d) => fs.statSync(path.join(B, 'results', 'frozen', d)).isDirectory())) {
  for (const f of fs.readdirSync(path.join(B, 'results', 'frozen', arm))) {
    if (f === 'tq.json') { if (!tqWant.includes(arm)) extraRecords.push(arm + '/' + f); continue; }
    const h = f.replace('.json', '');
    if (!rows.some(([a, , hh]) => a === arm && hh === h)) extraRecords.push(arm + '/' + f);
  }
}
const res = { want: want.size, got: got.size, missing, extra, bad_count: badCount, issues, tq_ok: tqOk, tq_hold: plan.tq_hold && plan.tq_hold.hold, not_run: plan.not_run, extra_frozen_records: extraRecords,
  pass: missing.length === 0 && extra.length === 0 && badCount.length === 0 && issues.length === 0 && tqOk && extraRecords.length === 0 };
fs.writeFileSync(process.argv[3], JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
