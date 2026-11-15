'use strict';
// Runs every lock_check command of results/frozen/PLAN.json exactly as written (89: 85 set runs, 4
// question runs) and expects "allowed" from each. lock-check reads no task and no question. Inside
// graphtest:1 via sealed/grader/dkf.sh:
//   bash sealed/grader/dkf.sh "cd /build && node /build/tmp/grader/plan_lockcheck.js /build/tmp/grader/r2/plan_lockcheck.json"
const { spawnSync } = require('child_process');
const fs = require('fs');
const plan = JSON.parse(fs.readFileSync('/build/results/frozen/PLAN.json', 'utf8'));
const out = [];
let bad = 0;
for (const e of [...plan.runs, ...plan.question_runs]) {
  const env = { ...process.env };
  delete env.LB_COMM_DRAW;
  const r = spawnSync('bash', ['-c', e.lock_check], { cwd: '/build', encoding: 'utf8', env });
  const lines = (r.stdout || '').trim().split('\n');
  const last = lines[lines.length - 1] || '';
  const ok = r.status === 0 && last === 'allowed';
  if (!ok) bad++;
  out.push({ n: e.n, arm: e.arm, role: e.role, set: e.set, draw: e.draw, ok, exit: r.status, verdict: last, stderr: (r.stderr || '').trim().slice(0, 300) });
  console.log((ok ? 'OK   ' : 'FAIL ') + e.n + ' ' + e.arm + ' ' + e.role + ' ' + e.set + (e.draw ? ' draw ' + e.draw : '') + ' -> ' + last.slice(0, 200));
}
const summary = { at: new Date().toISOString(), entries: out.length, allowed: out.filter((x) => x.ok).length, not_allowed: bad };
fs.writeFileSync(process.argv[2] || '/build/tmp/grader/plan_lockcheck.json', JSON.stringify({ summary, entries: out }, null, 1));
console.log(JSON.stringify(summary));
process.exitCode = bad ? 1 : 0;
