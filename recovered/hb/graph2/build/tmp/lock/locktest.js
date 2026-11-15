'use strict';
// End-to-end test of the held-out lock on the throw-away build tmp/lock/fakebuild (make_fake.js), inside
// graphtest:1. Every "held-out" task there is a relabelled TUNE task; no real held-out input exists in it.
//   GT_FACTS_CACHE=/build/facts/cache GT_REPO=/repo GT_STORE=/store GT_SRCSTORE=/store/src GT_TMP=/tmp/gt \
//     node /build/tmp/lock/locktest.js /build/tmp/lock/fakebuild > /build/tmp/lock/locktest.log
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { spawnSync } = require('child_process');
const F = path.resolve(process.argv[2]);
const RUN = path.join(F, 'arms', 'common', 'run.js');
const R = path.join(F, 'results');
const baseEnv = { ...process.env, GT_BUILD: F };
delete baseEnv.GT_RESULTS; delete baseEnv.LB_COMM_DRAW;
const results = []; let fails = 0;

function sh(args, env = {}) {
  const r = spawnSync('node', [RUN, ...args], { env: { ...baseEnv, ...env }, encoding: 'utf8', maxBuffer: 1 << 26 });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}
function step(name, args, expect, { env, match, check } = {}) {
  const r = sh(args, env);
  const refused = /REFUSED|refused:/.test(r.out) || (r.code !== 0 && r.code !== null);
  let ok = expect === 'refused' ? refused : (r.code === 0 && !/REFUSED/.test(r.out));
  if (ok && match && !match.test(r.out)) ok = false;
  let extra = null;
  if (ok && check) { try { extra = check(); if (extra === false) ok = false; } catch (e) { ok = false; extra = 'check threw ' + e.message; } }
  if (!ok) fails++;
  const last = r.out.trim().split('\n').slice(-1)[0];
  results.push({ step: name, expect, pass: ok, exit: r.code, last: last.length > 400 ? last.slice(0, 400) + '...' : last, extra });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + '  [exit ' + r.code + '] ' + (last.length > 300 ? last.slice(0, 300) + '...' : last) + (extra && extra !== true ? '  {' + JSON.stringify(extra) + '}' : ''));
  return r;
}
const runs = () => (fs.existsSync(path.join(R, 'heldout', 'runs.jsonl')) ? fs.readFileSync(path.join(R, 'heldout', 'runs.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse) : []);
const lastRun = () => runs().slice(-1)[0];
const gz = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const exists = (rel) => fs.existsSync(path.join(R, rel));
function touch(f, s) { fs.appendFileSync(f, s); }
function restore(f, orig) { fs.writeFileSync(f, orig); }

const DIR = '714a474060653c1f'; const CO = 'c4d2f0a60a3d199c';
const PRIM = '95e990307da3b42b'; const S1 = '6b70cc1222745385'; const S2 = 'f233ae069bdba0ce'; const SE = 'e70177e5807f0252';
const HO = (arm, cfg, set, more = []) => ['run', '--arm', arm, '--config', cfg, '--sets', set, '--split', 'heldout', '--allow-heldout', '--frozen-hash', cfg, ...more];

// 1. nothing frozen yet
step('lock-check before freeze', ['lock-check', '--arm', 'floor-dir', '--config', DIR], 'refused', { match: /never frozen/ });
step('run without --allow-heldout', ['run', '--arm', 'floor-dir', '--config', DIR, '--sets', 'T1', '--split', 'heldout'], 'refused', { match: /--allow-heldout/, check: () => lastRun().exit === 'refused' || 'refusal not logged' });
step('run before freeze', HO('floor-dir', DIR, 'T1'), 'refused', { match: /never frozen/, check: () => (lastRun().exit === 'refused' && /never frozen/.test(lastRun().refusal)) || 'not logged' });
// 2. freezing
step('freeze without role', ['freeze', '--arm', 'floor-dir', '--config', DIR], 'refused', { match: /--role/ });
step('freeze floor-dir primary', ['freeze', '--arm', 'floor-dir', '--config', DIR, '--role', 'primary'], 'ok', {
  check: () => { const r = JSON.parse(fs.readFileSync(path.join(R, 'frozen', 'floor-dir', DIR + '.json'), 'utf8')); return (r.arm === 'floor-dir' && r.role === 'primary' && /^[0-9a-f]{64}$/.test(r.code_hash) && r.config.pad === 'DIR') || r; } });
step('freeze again is idempotent', ['freeze', '--arm', 'floor-dir', '--config', DIR, '--role', 'primary'], 'ok', { match: /already frozen, unchanged/ });
step('freeze same config with another role', ['freeze', '--arm', 'floor-dir', '--config', DIR, '--role', 's1'], 'refused', { match: /differs/ });
step('second primary for one arm', ['freeze', '--arm', 'floor-dir', '--config', 'gran=file form=paths', '--role', 'primary'], 'refused', { match: /already has role primary/ });
step('reference arm with role primary', ['freeze', '--arm', 'reference', '--config', PRIM, '--role', 'primary'], 'refused', { match: /crosscheck/ });
step('crosscheck role on a scored arm', ['freeze', '--arm', 'relational', '--config', PRIM, '--role', 'crosscheck'], 'refused', { match: /reference arm/ });
step('freeze by unknown hash', ['freeze', '--arm', 'floor-dir', '--config', '0123456789abcdef', '--role', 's1'], 'refused', { match: /no configuration with hash/ });
// 3. lock-check on the frozen configuration
step('lock-check frozen', ['lock-check', '--arm', 'floor-dir', '--config', DIR], 'ok', { match: /^allowed$/m });
step('lock-check T5', ['lock-check', '--arm', 'floor-dir', '--config', DIR, '--sets', 'T1,T5'], 'refused', { match: /T5 is not run/ });
step('lock-check another arm (record missing)', ['lock-check', '--arm', 'floor-co', '--config', CO], 'refused', { match: /never frozen for arm floor-co/ });
fs.mkdirSync(path.join(R, 'frozen', 'floor-co'), { recursive: true });
const forged = JSON.parse(fs.readFileSync(path.join(R, 'frozen', 'floor-dir', DIR + '.json'), 'utf8'));
fs.writeFileSync(path.join(R, 'frozen', 'floor-co', CO + '.json'), JSON.stringify({ ...forged, hash: CO }));
step('record naming another arm', ['lock-check', '--arm', 'floor-co', '--config', CO], 'refused', { match: /names arm floor-dir/ });
fs.unlinkSync(path.join(R, 'frozen', 'floor-co', CO + '.json'));
// 4. run discipline
step('two sets in one run', HO('floor-dir', DIR, 'T1,T2'), 'refused', { match: /exactly one set/ });
step('set T5', HO('floor-dir', DIR, 'T5'), 'refused', { match: /T5 is not run/ });
step('wrong --frozen-hash', ['run', '--arm', 'floor-dir', '--config', DIR, '--sets', 'T1', '--split', 'heldout', '--allow-heldout', '--frozen-hash', CO], 'refused', { match: /does not match/ });
step('held-out with --limit', HO('floor-dir', DIR, 'T1', ['--limit', '1']), 'refused', { match: /--limit/ });
step('held-out with --out', HO('floor-dir', DIR, 'T1', ['--out', '/tmp/x']), 'refused', { match: /--out/ });
step('GT_RESULTS elsewhere', HO('floor-dir', DIR, 'T1'), 'refused', { env: { GT_RESULTS: '/tmp/elsewhere' }, match: /GT_RESULTS/, check: () => !fs.existsSync('/tmp/elsewhere/heldout/runs.jsonl') || 'logged to the override' });
step('held-out T1 run', HO('floor-dir', DIR, 'T1'), 'ok', {
  check: () => { const a = gz(path.join(R, 'heldout', 'floor-dir', 'primary', 'T1.jsonl.gz')); const l = lastRun();
    return (a.length === 3 && a.every((x) => x.split === 'heldout' && x.config_hash === DIR) && l.exit === 'ok' && l.n_tasks === 3 && l.repeat === 0 && l.role === 'primary' && l.set === 'T1' && l.draw === 0 && !fs.readdirSync(path.join(R, 'heldout', '_running')).length) || { a: a.length, l }; } });
step('repeat without --repeat', HO('floor-dir', DIR, 'T1'), 'refused', { match: /answer file exists/ });
step('--repeat without --reason', HO('floor-dir', DIR, 'T1', ['--repeat']), 'refused', { match: /--reason/ });
step('--repeat --reason', HO('floor-dir', DIR, 'T1', ['--repeat', '--reason', 'lock test: repeat path']), 'ok', {
  check: () => { const l = lastRun(); const sup = fs.readdirSync(path.join(R, 'heldout', '_superseded', 'floor-dir', 'primary'));
    return (l.repeat === 1 && l.reason === 'lock test: repeat path' && l.superseded.length === 1 && sup.length === 1 && exists('heldout/floor-dir/primary/T1.jsonl.gz')) || { l, sup }; } });
step('--repeat with nothing to repeat', HO('floor-dir', DIR, 'T2', ['--repeat', '--reason', 'x']), 'refused', { match: /nothing to repeat|no earlier attempt/ });
// a run killed half way: marker and .part left behind, no log line
fs.mkdirSync(path.join(R, 'heldout', '_running'), { recursive: true });
fs.writeFileSync(path.join(R, 'heldout', '_running', 'heldout__floor-dir__primary__T2.jsonl.gz.json'), JSON.stringify({ simulated: 'killed run' }));
fs.mkdirSync(path.join(R, 'heldout', 'floor-dir', 'primary'), { recursive: true });
fs.writeFileSync(path.join(R, 'heldout', 'floor-dir', 'primary', 'T2.jsonl.gz.part'), 'partial');
step('after a killed run', HO('floor-dir', DIR, 'T2'), 'refused', { match: /never finished/ });
step('repeat after a killed run', HO('floor-dir', DIR, 'T2', ['--repeat', '--reason', 'lock test: killed run']), 'ok', {
  check: () => { const l = lastRun(); return (l.repeat === 1 && l.superseded.length === 2 && l.n_tasks === 2) || l; } });
// the removed-document path on a held-out-shaped set
step('held-out T3 (document removed)', HO('floor-dir', DIR, 'T3'), 'ok', {
  check: () => { const a = gz(path.join(R, 'heldout', 'floor-dir', 'primary', 'T3.jsonl.gz')); return (a.length === 2 && a.every((x) => x.items.every((i) => i.path !== 'ARCHITECTURE.md'))) || a.length; } });
// 5. code changes after the freeze
const armF = path.join(F, 'arms', 'floor-dir', 'arm.js'); const armO = fs.readFileSync(armF, 'utf8');
touch(armF, '\n// changed after freeze\n');
step('arm code changed', ['lock-check', '--arm', 'floor-dir', '--config', DIR], 'refused', { match: /changed floor-dir\/arm\.js/ });
step('run with arm code changed', HO('floor-dir', DIR, 'T4'), 'refused', { match: /code changed/ });
restore(armF, armO);
const comF = path.join(F, 'arms', 'common', 'score.js'); const comO = fs.readFileSync(comF, 'utf8');
touch(comF, '\n// changed after freeze\n');
step('common code changed', ['lock-check', '--arm', 'floor-dir', '--config', DIR], 'refused', { match: /changed common\/score\.js/ });
restore(comF, comO);
const newF = path.join(F, 'arms', 'floor-dir', 'extra.js');
fs.writeFileSync(newF, '// new file\n');
step('arm file added', ['lock-check', '--arm', 'floor-dir', '--config', DIR], 'refused', { match: /added floor-dir\/extra\.js/ });
fs.unlinkSync(newF);
step('restored code allowed again', ['lock-check', '--arm', 'floor-dir', '--config', DIR], 'ok', { match: /^allowed$/m });
step('freeze reference crosscheck', ['freeze', '--arm', 'reference', '--config', PRIM, '--role', 'crosscheck'], 'ok');
step('freeze reference second crosscheck', ['freeze', '--arm', 'reference', '--config', S1, '--role', 'crosscheck'], 'ok');
step('reference output paths carry the hash', ['lock-check', '--arm', 'reference', '--config', S1, '--sets', 'T1'], 'ok', { match: /crosscheck-6b70cc1222745385\/T1\.jsonl\.gz/ });
const depF = path.join(F, 'arms', 'relational', 'sweep.js'); const depO = fs.readFileSync(depF, 'utf8');
touch(depF, '\n// changed after freeze\n');
step('required file of another arm changed', ['lock-check', '--arm', 'reference', '--config', PRIM], 'refused', { match: /deps_hash.*changed relational\/sweep\.js/ });
restore(depF, depO);
// 6. questions
step('tq held-out before freeze-tq', ['tq', '--arm', 'search', '--split', 'heldout', '--allow-heldout'], 'refused', { match: /never frozen/ });
step('lock-check --tq before freeze-tq', ['lock-check', '--arm', 'search', '--tq'], 'refused', { match: /never frozen/ });
step('freeze-tq search', ['freeze-tq', '--arm', 'search'], 'ok', { check: () => JSON.parse(fs.readFileSync(path.join(R, 'frozen', 'search', 'tq.json'), 'utf8')).role === 'tq' });
step('tq without --allow-heldout', ['tq', '--arm', 'search', '--split', 'heldout'], 'refused', { match: /--allow-heldout/ });
step('tq held-out', ['tq', '--arm', 'search', '--split', 'heldout', '--allow-heldout'], 'ok', {
  check: () => { const l = lastRun(); const a = fs.readFileSync(path.join(R, 'heldout', 'tq', 'search.answers.jsonl'), 'utf8').split('\n').filter(Boolean); return (a.length === 2 && l.set === 'TQ' && l.exit === 'ok' && l.n_tasks === 2) || { n: a.length, l }; } });
step('tq held-out again', ['tq', '--arm', 'search', '--split', 'heldout', '--allow-heldout'], 'refused', { match: /answer file exists/ });
const tqF = path.join(F, 'arms', 'search', 'tq.js'); const tqO = fs.readFileSync(tqF, 'utf8');
touch(tqF, '\n// changed after freeze\n');
step('tq code changed', ['lock-check', '--arm', 'search', '--tq'], 'refused', { match: /changed search\/tq\.js/ });
restore(tqF, tqO);
step('tq with a draw set', ['lock-check', '--arm', 'search', '--tq'], 'refused', { env: { LB_COMM_DRAW: '1' }, match: /only the ladybug arm/ });
// 7. LadybugDB community draws
step('freeze ladybug primary', ['freeze', '--arm', 'ladybug', '--config', PRIM, '--role', 'primary'], 'ok');
step('freeze ladybug s2', ['freeze', '--arm', 'ladybug', '--config', S2, '--role', 's2'], 'ok');
step('draw on a configuration without x_comm', ['lock-check', '--arm', 'ladybug', '--config', PRIM], 'refused', { env: { LB_COMM_DRAW: '1' }, match: /does not rank with the community prior/ });
step('draw 7', ['lock-check', '--arm', 'ladybug', '--config', S2], 'refused', { env: { LB_COMM_DRAW: '7' }, match: /0 to 4/ });
step('draw on another arm', ['lock-check', '--arm', 'floor-dir', '--config', DIR], 'refused', { env: { LB_COMM_DRAW: '2' }, match: /only the ladybug arm/ });
step('draw 1 path', ['lock-check', '--arm', 'ladybug', '--config', S2, '--sets', 'T1'], 'ok', { env: { LB_COMM_DRAW: '1' }, match: /heldout\/ladybug\/s2-draw1\/T1\.jsonl\.gz/ });
step('ladybug s2 run, draw 0', HO('ladybug', S2, 'T1'), 'ok', { check: () => (exists('heldout/ladybug/s2/T1.jsonl.gz') && lastRun().draw === 0) || lastRun() });
step('ladybug s2 run, draw 1', HO('ladybug', S2, 'T1'), 'ok', { env: { LB_COMM_DRAW: '1' }, check: () => { const l = lastRun(); return (exists('heldout/ladybug/s2-draw1/T1.jsonl.gz') && l.draw === 1 && l.out === 'heldout/ladybug/s2-draw1/T1.jsonl.gz' && l.repeat === 0) || l; } });
step('ladybug s2 draw 1 again', HO('ladybug', S2, 'T1'), 'refused', { env: { LB_COMM_DRAW: '1' }, match: /answer file exists/ });
// 8. TUNE variants file: only remove_paths may be added
const vf = path.join(F, 'variants_bad.jsonl');
const tune = fs.readFileSync(path.join(F, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((t) => t.split === 'tune');
fs.writeFileSync(vf, JSON.stringify({ ...tune[0], seed: { ...tune[0].seed, path: 'x.py' }, remove_paths: ['ARCHITECTURE.md'] }) + '\n');
step('variant with a changed seed', ['run', '--arm', 'floor-dir', '--config', DIR, '--sets', 'T1', '--tasks-jsonl', vf, '--out', '/tmp/v'], 'refused', { match: /differs from its TUNE task/ });
const ho = fs.readFileSync(path.join(F, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).find((t) => t.split === 'heldout');
fs.writeFileSync(vf, JSON.stringify({ ...ho, remove_paths: ['ARCHITECTURE.md'] }) + '\n');
step('variant naming a held-out task', ['run', '--arm', 'floor-dir', '--config', DIR, '--sets', 'T1', '--tasks-jsonl', vf, '--out', '/tmp/v'], 'refused', { match: /not a TUNE task/ });
step('variants file on held-out', ['run', '--arm', 'floor-dir', '--config', DIR, '--sets', 'T1', '--split', 'heldout', '--allow-heldout', '--frozen-hash', DIR, '--tasks-jsonl', vf], 'refused', { match: /--tasks-jsonl/ });
// 9. scoring started
fs.writeFileSync(path.join(R, 'heldout', 'SCORING_STARTED'), 'lock test\n');
step('run after SCORING_STARTED', HO('floor-dir', DIR, 'T4'), 'refused', { match: /SCORING_STARTED/ });
step('repeat after SCORING_STARTED', HO('floor-dir', DIR, 'T1', ['--repeat', '--reason', 'x']), 'refused', { match: /SCORING_STARTED/ });
step('tq after SCORING_STARTED', ['tq', '--arm', 'search', '--split', 'heldout', '--allow-heldout', '--repeat', '--reason', 'x'], 'refused', { match: /SCORING_STARTED/ });
step('freeze after SCORING_STARTED', ['freeze', '--arm', 'floor-co', '--config', CO, '--role', 'primary'], 'refused', { match: /SCORING_STARTED/ });
step('lock-check after SCORING_STARTED', ['lock-check', '--arm', 'floor-dir', '--config', DIR], 'refused', { match: /SCORING_STARTED/ });

const log = runs();
const summary = { steps: results.length, passed: results.length - fails, failed: fails, run_log_lines: log.length,
  run_log_exits: log.reduce((m, r) => { m[r.exit] = (m[r.exit] || 0) + 1; return m; }, {}),
  frozen_files: fs.readdirSync(path.join(R, 'frozen'), { recursive: true }).filter((x) => String(x).endsWith('.json')).sort(),
  heldout_files: fs.readdirSync(path.join(R, 'heldout'), { recursive: true }).map(String).filter((x) => /\.(gz|jsonl)$|\.part$/.test(x)).sort() };
fs.writeFileSync(path.join(path.dirname(F), 'locktest.json'), JSON.stringify({ summary, results }, null, 1));
console.log(JSON.stringify(summary, null, 1));
process.exit(fails ? 1 : 0);
