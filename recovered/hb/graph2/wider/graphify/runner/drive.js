'use strict';
// Held-out driver for the frozen graphify configuration (protocol addendum 7, section D).
// Runs the UNCHANGED adapter (G/adapter/run.js) step by step under the frozen lock (G/FROZEN.json),
// keeps a progress file (runner/progress.json) and never repeats a finished step. A step that was
// started but not finished (interruption) is repeated once and the repeat is logged with its reason.
//
//   node drive.js            run every unfinished step in order
//   node drive.js status     print progress
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const RUNNER = __dirname;
const G = path.resolve(RUNNER, '..');
const OUT = path.join(G, 'answers', 'heldout');
const LOCK = path.join(G, 'FROZEN.json');
const PROG = path.join(RUNNER, 'progress.json');
const LOG = path.join(RUNNER, 'drive.log');
const SETS = 'T1,T1x,T2,T3,T4';
const L = ['--split', 'heldout', '--allow-heldout', '--lock', LOCK, '--out', OUT];
const STEPS = [
  { name: 'hash-check', argv: ['node', path.join(RUNNER, 'verify_hash.js'), path.join(RUNNER, 'hash_check.before.json')] },
  { name: 'graphs', argv: ['node', path.join(G, 'adapter', 'run.js'), 'graphs', ...L, '--sets', SETS] },
  { name: 'calls', argv: ['node', path.join(G, 'adapter', 'run.js'), 'calls', ...L, '--sets', SETS] },
  { name: 'pack', argv: ['node', path.join(G, 'adapter', 'run.js'), 'pack', ...L, '--sets', SETS] },
  { name: 'tq', argv: ['node', path.join(G, 'adapter', 'run.js'), 'tq', ...L] },
  { name: 'check', argv: ['node', path.join(G, 'adapter', 'run.js'), 'check', ...L, '--sets', SETS] },
  { name: 'hash-check-after', argv: ['node', path.join(RUNNER, 'verify_hash.js'), path.join(RUNNER, 'hash_check.after.json')] },
  { name: 'own-checks', argv: ['node', path.join(RUNNER, 'checks.js')] },
];

const now = () => new Date().toISOString();
const log = (m) => { fs.appendFileSync(LOG, now() + ' ' + m + '\n'); console.log(m); };
const load = () => (fs.existsSync(PROG) ? JSON.parse(fs.readFileSync(PROG, 'utf8')) : { steps: {}, repeats: [] });
const save = (p) => { fs.writeFileSync(PROG + '.part', JSON.stringify(p, null, 1)); fs.renameSync(PROG + '.part', PROG); };

function main() {
  const p = load();
  if (process.argv[2] === 'status') return console.log(JSON.stringify(p, null, 1));
  for (const s of STEPS) {
    const st = p.steps[s.name];
    if (st && st.status === 'done') { log('skip ' + s.name + ' (done at ' + st.ended + ')'); continue; }
    if (st && st.status !== 'done') {
      const reason = st.status === 'started' ? 'interrupted before it finished (no exit recorded)' : 'previous attempt exited ' + st.exit;
      p.repeats.push({ step: s.name, at: now(), reason, previous: st });
      log('REPEAT ' + s.name + ': ' + reason);
      if (st.status === 'failed') { save(p); log('stop: ' + s.name + ' failed before; a failed step is not retried automatically'); process.exit(3); }
    }
    p.steps[s.name] = { status: 'started', started: now(), argv: s.argv.map((x) => x.replace(G, '<G>')) };
    save(p);
    log('start ' + s.name);
    const r = spawnSync(s.argv[0], s.argv.slice(1), { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28, env: { ...process.env, MSYS_NO_PATHCONV: '1' } });
    const tail = (String(r.stdout || '') + '\n' + String(r.stderr || '')).trim().slice(-3000);
    fs.appendFileSync(LOG, '--- ' + s.name + ' output tail ---\n' + tail + '\n');
    p.steps[s.name] = { ...p.steps[s.name], status: r.status === 0 ? 'done' : 'failed', exit: r.status, ended: now() };
    save(p);
    log((r.status === 0 ? 'done ' : 'FAILED ') + s.name + ' (exit ' + r.status + ')');
    if (r.status !== 0) process.exit(2);
  }
  log('all steps done');
}
main();
