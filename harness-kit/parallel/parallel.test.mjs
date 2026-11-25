// Tests of the kit's parallel commands: the programs kit-unit (start, land, list, report) and kit-check, in toy git
// repositories made in the OS temp folder, with node --test as the project's check (kit.node.example.json). Each toy
// project has its own queue folder (<project>/.harness/lane), so no other queue on the machine is touched.
// The programs are taken from KIT_HOOK_BIN_DIR when it is set, else from harness-kit/rust/target/release (build them
// with: cargo build --release --locked -p kit-unit -p kit-check in harness-kit/rust).
// Run: node --test harness-kit/parallel/parallel.test.mjs
// P1 two units changing different files both land, in the order asked; list and report; the first-run notice
// P2 a unit whose change fails the check is undone: the landing branch's tip is what it was (check_all and named files)
// P3 two units changing the same lines: the second landing exits 2 and nothing changes
// P4 a second land while one runs is refused and never interleaves
// P5 kit-check runs files side by side (their runs overlap), a failing file is exit 1, shards replace their file
// P6 kit-check --measure prints its table and writes check-measure.json, and changes no setting
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.resolve(process.env.KIT_HOOK_BIN_DIR || path.join(HERE, '..', 'rust', 'target', 'release'));
const exe = (name) => path.join(BIN, name + (process.platform === 'win32' ? '.exe' : ''));
const UNIT = exe('kit-unit');
const CHECK = exe('kit-check');
for (const p of [UNIT, CHECK]) if (!fs.existsSync(p)) throw new Error(`no program ${p}: build it, or set KIT_HOOK_BIN_DIR to the folder of the built programs`);
const ENV = Object.assign({}, process.env);
delete ENV.NODE_TEST_CONTEXT;

const valTest = (name, v) => `import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { ${name} } from './${name}.mjs';\ntest('${name} is ${v}', () => assert.equal(${name}, ${v}));\n`;

function write(dir, files) {
  for (const [p, body] of Object.entries(files)) {
    const f = path.join(dir, p);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, body);
  }
}

function toy(t, kit = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-parallel-'));
  t.after(() => { try { fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch { /* best effort */ } });
  const dir = path.join(root, 'proj');
  fs.mkdirSync(dir);
  const g = (args, cwd = dir) => {
    const r = spawnSync('git', ['-c', 'core.longpaths=true', ...args], { cwd, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
    return r.stdout.trim();
  };
  g(['init', '-q', '-b', 'main']);
  for (const [k, v] of [['user.name', 'kit test'], ['user.email', 'kit-test@example.invalid'], ['core.autocrlf', 'false'], ['commit.gpgsign', 'false']]) g(['config', k, v]);
  write(dir, {
    '.gitignore': '.harness/\n',
    'a.mjs': 'export const a = 1;\n', 'a.test.mjs': valTest('a', 1),
    'b.mjs': 'export const b = 1;\n', 'b.test.mjs': valTest('b', 1),
  });
  g(['add', '-A']);
  g(['commit', '-q', '-m', 'base']);
  const cfg = JSON.parse(fs.readFileSync(path.join(HERE, 'kit.node.example.json'), 'utf8'));
  Object.assign(cfg, kit);
  write(dir, { '.harness/kit.json': JSON.stringify(cfg, null, 1) });
  const r = { root, dir, g, copies: path.join(root, 'proj-units'), landings: path.join(dir, '.harness', 'landings.jsonl') };
  r.run = (program, args, cwd = dir) => spawnSync(program, args, { cwd, env: ENV, encoding: 'utf8', timeout: 120000 });
  r.unit = (...args) => r.run(UNIT, args);
  r.check = (...args) => r.run(CHECK, args);
  r.make = (name, files, msg = `${name}: change`) => { // a unit through kit-unit start, one commit in its copy
    const x = r.unit('start', name);
    assert.equal(x.status, 0, x.stderr);
    const folder = x.stdout.trim();
    write(folder, files);
    g(['add', '-A'], folder);
    g(['commit', '-q', '-m', msg], folder);
    return folder;
  };
  r.tip = () => g(['rev-parse', 'build']);
  r.lines = () => (fs.existsSync(r.landings) ? fs.readFileSync(r.landings, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
  r.landingClean = () => g(['status', '--porcelain', '--untracked-files=no'], path.join(r.copies, '_landing')) === ''
    && spawnSync('git', ['rev-parse', '-q', '--verify', 'MERGE_HEAD'], { cwd: path.join(r.copies, '_landing') }).status !== 0;
  return r;
}

test('P1 two units changing different files both land, in the order asked; list, report; the notice is shown once', (t) => {
  const r = toy(t);
  const fa = r.make('alpha', { 'a.mjs': 'export const a = 2;\n', 'a.test.mjs': valTest('a', 2) });
  assert.equal(fs.realpathSync(fa), fs.realpathSync(path.join(r.copies, 'alpha')));
  let x = r.unit('start', 'alpha');
  assert.equal(x.status, 0, x.stderr);
  assert.equal(fs.realpathSync(x.stdout.trim()), fs.realpathSync(fa), 'start again prints the same folder');
  assert.doesNotMatch(x.stderr, /Shown once/, 'the notice is shown once per project');
  r.make('beta', { 'b.mjs': 'export const b = 2;\n', 'b.test.mjs': valTest('b', 2) });
  const before = r.tip();
  x = r.unit('land', 'beta');
  assert.equal(x.status, 0, x.stderr);
  x = r.unit('land', 'alpha', 'a.test.mjs');
  assert.equal(x.status, 0, x.stderr);
  const lines = r.lines();
  assert.deepEqual(lines.map((l) => [l.unit, l.exit, l.kind, l.result]), [['beta', 0, 'land', 'pass'], ['alpha', 0, 'land', 'pass']]);
  assert.deepEqual(lines[1].check, ['a.test.mjs']);
  assert.equal(lines[0].check, 'all');
  // the landing branch: two --no-ff merges, beta first, then alpha, on top of what was there
  const fp = r.g(['log', '--first-parent', '--format=%H %P', 'build']).split('\n').map((l) => l.split(' '));
  assert.equal(fp[0][0], lines[1].merge);
  assert.equal(fp[1][0], lines[0].merge);
  assert.equal(fp[2][0], before);
  assert.equal(fp[0].length, 3);
  assert.equal(r.g(['show', 'build:a.mjs']), 'export const a = 2;');
  assert.equal(r.g(['show', 'build:b.mjs']), 'export const b = 2;');
  assert.equal(r.g(['rev-parse', '--abbrev-ref', 'HEAD']), 'main', 'the project checkout is never switched');
  x = r.unit('land', 'alpha');
  assert.equal(x.status, 6, x.stderr);
  x = r.unit('list', '--json');
  assert.equal(x.status, 0, x.stderr);
  const rows = JSON.parse(x.stdout);
  assert.deepEqual(rows.map((u) => [u.unit, u.branch, u.landed]).sort(), [['alpha', 'u/alpha', true], ['beta', 'u/beta', true]]);
  assert.ok(rows.every((u) => u.folder && fs.existsSync(u.folder)));
  x = r.unit('report');
  assert.equal(x.status, 0, x.stderr);
  assert.match(x.stdout, /landed: 2: beta, alpha/);
  assert.match(x.stdout, /seconds waited for the queue: [\d.]+; seconds the checks ran: [\d.]+/);
  assert.ok(fs.existsSync(path.join(r.dir, '.harness', 'notice-unit.txt')));
  // from a unit's copy the project is still found
  x = r.run(UNIT, ['list'], fa);
  assert.equal(x.status, 0, x.stderr);
  assert.match(x.stdout, /alpha\s+landed/);
});

test('P2 a unit whose change fails the check is undone: the tip is what it was; the line names what failed', (t) => {
  const r = toy(t);
  r.make('bad', { 'a.mjs': 'export const a = 3;\n' });
  r.make('bad2', { 'b.mjs': 'export const b = 3;\n' });
  r.unit('start', 'noop'); // make the landing branch exist
  const before = r.tip();
  let x = r.unit('land', 'bad');
  assert.equal(x.status, 1, x.stderr);
  assert.match(x.stderr, /failed the check: check_all \(exit 1\)/);
  assert.equal(r.tip(), before);
  assert.ok(r.landingClean());
  x = r.unit('land', 'bad2', 'b.test.mjs', 'a.test.mjs');
  assert.equal(x.status, 1, x.stderr);
  assert.equal(r.tip(), before);
  const [l1, l2] = r.lines();
  assert.deepEqual([l1.unit, l1.exit, l1.undone, l1.pre, l1.result], ['bad', 1, true, before, 'fail']);
  assert.equal(l1.failing[0].what, 'check_all');
  assert.deepEqual(l2.failing.map((f) => f.what), ['b.test.mjs'], 'only the failing file is named');
  assert.ok(fs.existsSync(path.join(r.dir, '.harness', l2.log, 'b.test.mjs.log')));
  x = r.unit('report', '--json');
  assert.deepEqual(JSON.parse(x.stdout).failed_undone, ['bad', 'bad2']);
  x = r.unit('list');
  assert.match(x.stdout, /bad\s+not landed \(check failed, undone\)/);
  // a timeout is no result: undone, exit 5
  const s = toy(t, { check_all_timeout_s: 5 });
  s.make('slow', { 'slow.test.mjs': "import { test } from 'node:test';\ntest('slow', () => new Promise((ok) => setTimeout(ok, 20000)));\n" });
  s.unit('start', 'noop');
  const b2 = s.tip();
  x = s.unit('land', 'slow');
  assert.equal(x.status, 5, x.stderr);
  assert.equal(s.tip(), b2);
  assert.deepEqual([s.lines()[0].exit, s.lines()[0].undone, s.lines()[0].result], [5, true, 'none']);
});

test('P3 two units changing the same lines: the second landing exits 2 and nothing changes', (t) => {
  const r = toy(t);
  r.make('c1', { 'b.mjs': 'export const b = 1; // c1\n' });
  r.make('c2', { 'b.mjs': 'export const b = 1; // c2\n' });
  let x = r.unit('land', 'c1');
  assert.equal(x.status, 0, x.stderr);
  const after1 = r.tip();
  x = r.unit('land', 'c2');
  assert.equal(x.status, 2, x.stderr);
  assert.match(x.stderr, /textual conflict merging u\/c2 \(b\.mjs\)/);
  assert.equal(r.tip(), after1);
  assert.ok(r.landingClean());
  const l = r.lines()[1];
  assert.deepEqual([l.unit, l.exit, l.merge, l.aborted, l.conflicts], ['c2', 2, null, true, ['b.mjs']]);
  assert.match(r.unit('report').stdout, /conflicts \(merge aborted\): 1: c2 \(b\.mjs\)/);
});

test('P4 a second land while one runs is refused and never interleaves', async (t) => {
  const r = toy(t);
  r.make('slow', { 'slow.test.mjs': "import { test } from 'node:test';\ntest('slow', () => new Promise((ok) => setTimeout(ok, 6000)));\n" });
  r.make('quick', { 'b.mjs': 'export const b = 2;\n', 'b.test.mjs': valTest('b', 2) });
  r.unit('start', 'noop');
  const before = r.tip();
  const first = spawn(UNIT, ['land', 'slow'], { cwd: r.dir, env: ENV, stdio: 'ignore' });
  const ended = new Promise((ok) => first.on('exit', ok));
  const lockDir = path.join(r.dir, '.harness', 'land.lock');
  const t0 = Date.now();
  while (!fs.existsSync(path.join(lockDir, 'owner.json')) && Date.now() - t0 < 20000) await new Promise((ok) => setTimeout(ok, 100));
  const x = r.unit('land', 'quick');
  assert.equal(x.status, 64, x.stderr);
  assert.match(x.stderr, /another landing is running \(unit slow/);
  assert.equal(await ended, 0);
  const lines = r.lines();
  assert.deepEqual(lines.map((l) => l.unit), ['slow']);
  assert.equal(r.g(['rev-parse', 'build^1']), before);
  assert.ok(!fs.existsSync(lockDir), 'the lock is gone after the landing');
  const y = r.unit('land', 'quick');
  assert.equal(y.status, 0, y.stderr);
});

test('P5 kit-check runs files side by side; a failing file is exit 1; shards replace their file', (t) => {
  const r = toy(t);
  const stamps = path.join(r.root, 'stamps').replace(/\\/g, '/');
  const timed = (n) => `import { test } from 'node:test';\nimport fs from 'node:fs';\ntest('t${n}', async () => { fs.appendFileSync('${stamps}', 's ${n} ' + Date.now() + '\\n'); await new Promise((ok) => setTimeout(ok, 1500)); fs.appendFileSync('${stamps}', 'e ${n} ' + Date.now() + '\\n'); });\n`;
  write(r.dir, { 't/x1.test.mjs': timed(1), 't/x2.test.mjs': timed(2), 't/x3.test.mjs': timed(3) });
  let x = r.check('t/x1.test.mjs', 't/x2.test.mjs', 't/x3.test.mjs', '--at', '3');
  assert.equal(x.status, 0, x.stderr + x.stdout);
  assert.equal((x.stdout.match(/^pass /gm) || []).length, 3);
  assert.match(x.stdout, /3 passed, 0 failed, 0 no result; 3 file\(s\) in 3 run\(s\), 3 at once/);
  const ev = fs.readFileSync(stamps, 'utf8').trim().split('\n').map((l) => l.split(' '));
  const starts = ev.filter((e) => e[0] === 's').map((e) => Number(e[2])), ends = ev.filter((e) => e[0] === 'e').map((e) => Number(e[2]));
  assert.ok(Math.max(...starts) < Math.min(...ends), 'the three runs overlapped');
  assert.match(x.stderr, /ran only in their tests|have run only/, 'the first run says what has been run');
  // every listed file (test_files), one failing
  write(r.dir, { 'a.mjs': 'export const a = 9;\n' });
  x = r.check();
  assert.equal(x.status, 1);
  assert.match(x.stdout, /^fail .* a\.test\.mjs/m);
  assert.match(x.stdout, /^pass .* b\.test\.mjs/m);
  assert.match(x.stdout, /\d+ passed, 1 failed/);
  // shards: the file runs as its shards and nothing else
  const s = toy(t, { shards: { 'sh.test.mjs': [['--test-name-pattern=^A '], ['--test-skip-pattern=^A ']] } });
  write(s.dir, { 'sh.test.mjs': "import { test } from 'node:test';\ntest('A one', () => {});\ntest('B two', () => {});\n" });
  x = s.check('sh.test.mjs');
  assert.equal(x.status, 0, x.stderr + x.stdout);
  assert.match(x.stdout, /pass .* sh\.test\.mjs#1/);
  assert.match(x.stdout, /pass .* sh\.test\.mjs#2/);
  assert.doesNotMatch(x.stdout, /sh\.test\.mjs$/m);
  assert.match(x.stdout, /1 file\(s\) in 2 run\(s\)/);
});

test('P6 kit-check --measure prints the seconds at 1, 2, 4, 8 at once (never above the processor count) and writes them', (t) => {
  const r = toy(t);
  const cpus = typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length;
  const kitBefore = fs.readFileSync(path.join(r.dir, '.harness', 'kit.json'), 'utf8');
  const x = r.check('--measure');
  assert.equal(x.status, 0, x.stderr + x.stdout);
  const levels = [1, 2, 4, 8].filter((n) => n <= cpus);
  for (const n of levels) assert.match(x.stdout, new RegExp(`^at +${n} at once: +[\\d.]+ s +2 passed, 0 failed, 0 no result$`, 'm'));
  assert.match(x.stdout, /^fastest: \d+ at once, [\d.]+ s/m);
  const j = JSON.parse(fs.readFileSync(path.join(r.dir, '.harness', 'check-measure.json'), 'utf8'));
  assert.deepEqual(j.levels.map((l) => l.at), levels);
  assert.equal(j.files, 2);
  assert.equal(fs.readFileSync(path.join(r.dir, '.harness', 'kit.json'), 'utf8'), kitBefore, 'no setting changed');
  assert.ok(!fs.existsSync(path.join(r.dir, '.harness', 'lane', 'capacity.txt')), "--measure uses a queue of its own, not the project's");
  assert.ok(fs.existsSync(path.join(r.dir, '.harness', 'lane-measure', 'capacity.txt')));
});
