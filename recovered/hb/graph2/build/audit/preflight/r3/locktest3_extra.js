'use strict';
// Re-audit 3, check 1 (additions to r2/locktest2.js). Runs on the SAME throw-away copy <fake>.
// Tests what fix round 2 changed: the question hold now enforced by tqLockTest; edits to
// common/harness.js and ladybug/tq.js refuse; a wrong role / reference tq; every declared S2 draw.
// usage (inside graphtest:1): node locktest3_extra.js <fake root> <out.json>
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const FAKE = process.argv[2];
const OUTF = process.argv[3];
const RUN = path.join(FAKE, 'arms', 'common', 'run.js');
const baseEnv = { ...process.env, GT_BUILD: FAKE };
delete baseEnv.GT_RESULTS; delete baseEnv.LB_COMM_DRAW;
const PLANF = path.join(FAKE, 'results', 'frozen', 'PLAN.json');
const PLAN = JSON.parse(fs.readFileSync(PLANF, 'utf8'));
function lc(args, env = {}) {
  const r = spawnSync('node', [RUN, ...args], { env: { ...baseEnv, ...env }, encoding: 'utf8', timeout: 120000 });
  const lines = (r.stdout || '').trim().split('\n');
  return { code: r.status, last: lines[lines.length - 1] || '', err: (r.stderr || '').trim().slice(0, 300) };
}
const res = { tests: [] };
const t = (name, args, want, env = {}, re = null) => {
  const o = lc(args, env);
  const refused = o.code !== 0 && /refused|REFUSED/.test(o.last + ' ' + o.err);
  const allowed = o.code === 0 && o.last === 'allowed';
  let ok = want === 'refused' ? refused : allowed;
  if (ok && re && !re.test(o.last + ' ' + o.err)) ok = false;
  res.tests.push({ name, want, ok, code: o.code, out: (o.last + ' ' + o.err).slice(0, 260) });
};
// A. question hold: hold true refuses all four tq lock-checks (and the tq run command itself)
const planOrig = fs.readFileSync(PLANF);
const held = JSON.parse(planOrig); held.tq_hold.hold = true; fs.writeFileSync(PLANF, JSON.stringify(held));
for (const q of PLAN.question_runs) t('hold=true refuses tq lock-check ' + q.arm, ['lock-check', '--arm', q.arm, '--tq'], 'refused', {}, /tq_hold/);
t('hold=true refuses tq run command (relational)', ['tq', '--arm', 'relational', '--split', 'heldout', '--allow-heldout'], 'refused', {}, /tq_hold/);
t('hold=true: set run lock-check (relational primary T1) - recorded, NOT enforced by design', ['lock-check', '--arm', 'relational', '--config', '95e990307da3b42b', '--sets', 'T1'], 'allowed');
// hold as the string "true" (not boolean) - does it hold?
const held2 = JSON.parse(planOrig); held2.tq_hold.hold = 'true'; fs.writeFileSync(PLANF, JSON.stringify(held2));
t('hold="true" (string) on tq relational - recorded', ['lock-check', '--arm', 'relational', '--tq'], 'allowed');
fs.writeFileSync(PLANF, planOrig);
for (const q of PLAN.question_runs) t('hold=false allows tq lock-check ' + q.arm, ['lock-check', '--arm', q.arm, '--tq'], 'allowed');
// B. code edits fix round 2 touched
const probe = (rel, tests) => { const f = path.join(FAKE, 'arms', rel); const o = fs.readFileSync(f); fs.appendFileSync(f, '\n// probe\n'); for (const x of tests) t(...x); fs.writeFileSync(f, o); };
probe('common/harness.js', [['edit common/harness.js refuses floor-dir primary', ['lock-check', '--arm', 'floor-dir', '--config', '714a474060653c1f', '--sets', 'T1'], 'refused', {}, /harness\.js/], ['edit common/harness.js refuses duckpgq tq', ['lock-check', '--arm', 'duckpgq', '--tq'], 'refused', {}, /harness\.js/]]);
probe('ladybug/tq.js', [['edit ladybug/tq.js refuses ladybug tq', ['lock-check', '--arm', 'ladybug', '--tq'], 'refused', {}, /ladybug\/tq\.js/], ['edit ladybug/tq.js refuses ladybug s2 set run', ['lock-check', '--arm', 'ladybug', '--config', 'f233ae069bdba0ce', '--sets', 'T1'], 'refused', {}, /ladybug\/tq\.js/], ['edit ladybug/tq.js does not refuse relational primary', ['lock-check', '--arm', 'relational', '--config', '95e990307da3b42b', '--sets', 'T1'], 'allowed']]);
probe('relational/sweep.js', [['edit relational/sweep.js refuses ladybug primary (deps)', ['lock-check', '--arm', 'ladybug', '--config', '95e990307da3b42b', '--sets', 'T1'], 'refused']]);
// C. role and arm rules
t('freeze reference with role primary refused', ['freeze', '--arm', 'reference', '--config', '95e990307da3b42b', '--role', 'primary', '--refreeze', '--reason', 'probe'], 'refused');
t('freeze relational role crosscheck refused', ['freeze', '--arm', 'relational', '--config', '95e990307da3b42b', '--role', 'crosscheck', '--refreeze', '--reason', 'probe'], 'refused');
t('freeze second s1 for ladybug (hops=2 base) refused', ['freeze', '--arm', 'ladybug', '--config', '8067b9cf65e59b2f', '--role', 's1'], 'refused');
t('search S1 6b70cc1222745385 refused (not in its list / not frozen)', ['lock-check', '--arm', 'search', '--config', '6b70cc1222745385', '--sets', 'T1'], 'refused');
t('T5 on ladybug s2 draw 2 refused', ['lock-check', '--arm', 'ladybug', '--config', 'f233ae069bdba0ce', '--sets', 'T5'], 'refused', { LB_COMM_DRAW: '2' });
t('two sets in one heldout run refused', ['run', '--arm', 'floor-co', '--config', 'c4d2f0a60a3d199c', '--sets', 'T1,T2', '--split', 'heldout', '--allow-heldout', '--frozen-hash', 'c4d2f0a60a3d199c'], 'refused');
t('--tasks on heldout run refused', ['run', '--arm', 'floor-co', '--config', 'c4d2f0a60a3d199c', '--sets', 'T1', '--split', 'heldout', '--allow-heldout', '--frozen-hash', 'c4d2f0a60a3d199c', '--tasks', 'x'], 'refused');
t('--tasks-jsonl with a heldout split refused', ['run', '--arm', 'floor-co', '--config', 'c4d2f0a60a3d199c', '--sets', 'T1', '--split', 'heldout', '--allow-heldout', '--frozen-hash', 'c4d2f0a60a3d199c', '--tasks-jsonl', '/dev/null'], 'refused');
t('wrong --frozen-hash refused', ['run', '--arm', 'floor-co', '--config', 'c4d2f0a60a3d199c', '--sets', 'T1', '--split', 'heldout', '--allow-heldout', '--frozen-hash', '714a474060653c1f'], 'refused');
// D. heldout runs log file of the fake after these refusals
const rf = path.join(FAKE, 'results', 'heldout', 'runs.jsonl');
res.fake_runs_lines = fs.existsSync(rf) ? fs.readFileSync(rf, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).exit) : [];
res.summary = { tests: res.tests.length, ok: res.tests.filter((x) => x.ok).length };
fs.writeFileSync(OUTF, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res.summary), 'fake runs.jsonl exits', JSON.stringify(res.fake_runs_lines));
for (const x of res.tests) console.log(x.ok ? 'OK ' : 'BAD', x.name, '|', x.out.slice(0, 200));
