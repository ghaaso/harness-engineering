'use strict';
// Pre-flight fix round 2: tqLockTest (arms/common/harness.js) refuses question runs while
// results/frozen/PLAN.json has tq_hold.hold = true. Uses throw-away results roots under GT_TMP; reads no
// task, no question, nothing under sealed/ or audit/. The real tree is only read (PLAN.json, records).
//   node tmp/lock/preflight2/hold_test.js  -> tmp/lock/preflight2/hold_test.json
const fs = require('fs');
const os = require('os');
const path = require('path');
const B = process.env.GT_BUILD || path.resolve(__dirname, '..', '..', '..');
const H = require(path.join(B, 'arms/common/harness'));
const tmp = fs.mkdtempSync(path.join(process.env.GT_TMP || os.tmpdir(), 'hold-'));
const cases = [];
const run = (name, plan, want) => {
  const root = path.join(tmp, name); fs.mkdirSync(path.join(root, 'frozen'), { recursive: true });
  if (plan !== undefined) fs.writeFileSync(path.join(root, 'frozen', 'PLAN.json'), typeof plan === 'string' ? plan : JSON.stringify(plan));
  const r = H.tqLockTest('relational', { root });
  const holdRefusal = !r.allowed && /tq_hold\.hold = true/.test(r.reason || '');
  const ok = holdRefusal === want;
  cases.push({ name, allowed: r.allowed, reason: r.reason, hold_refusal: holdRefusal, expected_hold_refusal: want, pass: ok });
};
run('hold-true', { tq_hold: { hold: true } }, true);
run('hold-false', { tq_hold: { hold: false } }, false);
run('no-tq_hold', { title: 'x' }, false);
run('no-plan', undefined, false);
run('invalid-json', '{not json', false);
const real = H.tqLockTest('relational');
const out = { cases, pass: cases.filter((c) => c.pass).length, of: cases.length, real_tree: { allowed: real.allowed, reason: real.reason } };
fs.writeFileSync(path.join(__dirname, 'hold_test.json'), JSON.stringify(out, null, 1));
fs.rmSync(tmp, { recursive: true, force: true });
for (const c of cases) console.log(c.pass ? 'PASS' : 'FAIL', c.name, c.allowed ? 'allowed' : 'refused: ' + c.reason);
console.log('real tree:', real.allowed ? 'allowed' : 'refused: ' + real.reason);
process.exit(out.pass === out.of ? 0 : 1);
