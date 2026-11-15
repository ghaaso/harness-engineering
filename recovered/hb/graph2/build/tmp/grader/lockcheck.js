'use strict';
// Grader lock-check (protocol addendum 4, after the re-freeze). Runs `run.js lock-check` for every
// declared held-out run and every question arm (all must be allowed), and for undeclared pairs (all
// must be refused). lock-check reads no task and no question. Inside graphtest:1 via sealed/grader/dkf.sh:
//   bash sealed/grader/dkf.sh "node /build/tmp/grader/lockcheck.js"
// Writes /build/tmp/grader/lockcheck.json; exit 1 if any expectation fails.
const { spawnSync } = require('child_process');
const fs = require('fs');
const SETS = 'T1,T1x,T2,T3,T4';
const checks = [];
const add = (expect, label, args, env = {}) => checks.push({ expect, label, args, env });
// declared runs (addendum 4 item 5)
for (const [arm, hash, role] of [
  ['relational', '95e990307da3b42b', 'primary'], ['ladybug', '95e990307da3b42b', 'primary'], ['duckpgq', '95e990307da3b42b', 'primary'],
  ['search', 'e70177e5807f0252', 'primary'], ['floor-dir', '714a474060653c1f', 'primary'], ['floor-co', 'c4d2f0a60a3d199c', 'primary'],
  ['relational', '6b70cc1222745385', 's1'], ['ladybug', '6b70cc1222745385', 's1'], ['duckpgq', '6b70cc1222745385', 's1'],
  ['ladybug', 'f233ae069bdba0ce', 's2'], ['search', '950c029615d337c1', 's2'],
  ['reference', '95e990307da3b42b', 'crosscheck'], ['reference', '6b70cc1222745385', 'crosscheck'],
]) add('allowed', `declared ${arm} ${role} ${hash}`, ['--arm', arm, '--config', hash, '--sets', SETS]);
for (const d of [1, 2, 3, 4]) add('allowed', `declared ladybug s2 f233ae069bdba0ce draw ${d}`, ['--arm', 'ladybug', '--config', 'f233ae069bdba0ce', '--sets', SETS], { LB_COMM_DRAW: String(d) });
for (const arm of ['relational', 'ladybug', 'duckpgq', 'search']) add('allowed', `declared questions ${arm}`, ['--arm', arm, '--tq']);
// undeclared (arm, configuration) pairs: each is a real entry of that arm's own lists, never frozen
add('refused', 'undeclared relational 6c04453d37f7468a (s2: hops=null hub=transport, TUNE rank 2)', ['--arm', 'relational', '--config', '6c04453d37f7468a', '--sets', 'T1']);
add('refused', 'undeclared search 4845d22b82a9d562 (pad=CO rounds=1, TUNE rank 2)', ['--arm', 'search', '--config', '4845d22b82a9d562', '--sets', 'T1']);
add('refused', 'undeclared floor-co 11176512128c7819 (gran=symbol form=signature)', ['--arm', 'floor-co', '--config', '11176512128c7819', '--sets', 'T1']);
// further refusals worth knowing (not required by the step)
add('refused', 'extra: ladybug primary with LB_COMM_DRAW=1 (no community prior)', ['--arm', 'ladybug', '--config', '95e990307da3b42b', '--sets', 'T1'], { LB_COMM_DRAW: '1' });
add('refused', 'extra: questions for floor-dir (no frozen question code)', ['--arm', 'floor-dir', '--tq']);
add('refused', 'extra: relational primary on set T5', ['--arm', 'relational', '--config', '95e990307da3b42b', '--sets', 'T5']);
const out = [];
let bad = 0;
for (const c of checks) {
  const env = { ...process.env };
  delete env.LB_COMM_DRAW;
  Object.assign(env, c.env);
  const r = spawnSync('node', ['arms/common/run.js', 'lock-check', ...c.args], { cwd: '/build', env, encoding: 'utf8' });
  const lines = (r.stdout || '').trim().split('\n');
  const last = lines[lines.length - 1] || '';
  let json = null; try { json = JSON.parse(lines[0]); } catch (e) { /* not json */ }
  const got = r.status === 0 && last === 'allowed' ? 'allowed' : r.status === 3 && last.startsWith('refused') ? 'refused' : 'error';
  const ok = got === c.expect;
  if (!ok) bad++;
  out.push({ label: c.label, expect: c.expect, got, ok, exit: r.status, env: c.env, args: c.args, verdict: last, reason: json && json.reason, sets: json && json.sets, record: json && json.record, code_hash: json && json.code_hash, stderr: (r.stderr || '').trim().slice(0, 500) });
  console.log((ok ? 'OK   ' : 'FAIL ') + c.label + ' -> ' + got + (got !== 'allowed' ? ': ' + String(last || r.stderr).slice(0, 220) : ''));
}
const summary = { at: new Date().toISOString(), checks: out.length, failures: bad, allowed: out.filter((x) => x.got === 'allowed').length, refused: out.filter((x) => x.got === 'refused').length, errors: out.filter((x) => x.got === 'error').length };
fs.writeFileSync(process.argv[2] || '/build/tmp/grader/lockcheck.json',JSON.stringify({ summary, checks: out }, null, 1));
console.log(JSON.stringify(summary));
process.exitCode = bad ? 1 : 0;
