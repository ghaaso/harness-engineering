// Tests of research-tree/tools/land.mjs (unit S0.6; research-tree/BUILD-PLAN.md section 3; build/briefs/B0b.md).
// Run from research-tree/ through the main checkout's lane: node --test tools/land.test.mjs
// Each test makes a scratch repository in the OS temp folder: a main checkout holding research-tree/tools/lane.mjs (a
// copy of the lane beside this file, so the scratch lane keeps slots and a log of its own), a build branch and u/*
// branches; land.mjs runs with --main pointing at it. This repository, its lane and its landings.jsonl are never
// touched. L1 pass and record; L2 a failing file undoes the merge; L3 conflict; L4 re-check of a merge with no line;
// L5 flaky; L6 shards; L7 no result (124 and 75).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LAND = path.join(HERE, 'land.mjs');
const VAL = 'tcb/test/val.test.mjs';
const valTest = (v) => `import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { v } from '../val.mjs';\ntest('T1 v is ${v}', () => assert.equal(v, ${v}));\n`;
const val = (v) => ({ 'research-tree/tcb/val.mjs': `export const v = ${v};\n`, 'research-tree/tcb/test/val.test.mjs': valTest(v) });
const testFile = (name, body) => `import { test } from 'node:test';\ntest(${JSON.stringify(name)}, ${body});\n`;

function write(dir, files) {
  for (const [p, body] of Object.entries(files)) {
    const f = path.join(dir, p);
    if (body === null) { fs.rmSync(f, { force: true }); continue; }
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, body);
  }
}

function scratch(t) { // <root>/main is the main checkout; land.mjs makes the build worktree <root>/hb (its default)
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'land-test-'));
  t.after(() => { try { fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch { /* best effort */ } });
  const dir = path.join(root, 'main');
  fs.mkdirSync(dir);
  const g = (args, cwd = dir) => {
    const r = spawnSync('git', ['-c', 'core.longpaths=true', ...args], { cwd, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
    return r.stdout.trim();
  };
  g(['init', '-q', '-b', 'main']);
  for (const [k, v] of [['user.name', 'land test'], ['user.email', 'land-test@example.invalid'], ['core.autocrlf', 'false'], ['commit.gpgsign', 'false']]) g(['config', k, v]);
  write(dir, { '.gitignore': '.claude/\nresearch-tree/lane/\nresearch-tree/build/\nresearch-tree/tmp/\n', 'research-tree/tools/lane.mjs': fs.readFileSync(path.join(HERE, 'lane.mjs'), 'utf8'), ...val(1) });
  g(['add', '-A']);
  g(['commit', '-q', '-m', 'base']);
  g(['branch', 'build']);
  const r = { dir, g, build: path.join(root, 'hb'), landings: path.join(dir, 'research-tree', 'build', 'landings.jsonl') };
  r.unit = (name, files) => { // a unit branch cut from the build branch's tip, one commit
    g(['checkout', '-q', '-b', `u/${name}`, 'build']);
    write(dir, files);
    g(['add', '-A', '--', ...Object.keys(files)]);
    g(['commit', '-q', '-m', `${name}: change`]);
    g(['checkout', '-q', 'main']);
    return g(['rev-parse', `u/${name}`]);
  };
  r.handMerge = (name, message) => { // a merge on build made without land.mjs (message null: git's own message)
    const f = path.join(dir, 'research-tree', 'tmp', 'msg.txt');
    write(dir, { 'research-tree/tmp/msg.txt': message || '' });
    g(['merge', '--no-ff', '-q', ...(message ? ['-F', f] : ['--no-edit']), `u/${name}`], r.build);
    return r.head();
  };
  r.land = (...args) => spawnSync(process.execPath, [LAND, ...args, '--main', dir], { encoding: 'utf8', timeout: 120000 });
  r.lines = () => (fs.existsSync(r.landings) ? fs.readFileSync(r.landings, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
  r.head = () => g(['rev-parse', 'build']);
  r.inBuild = (sha) => spawnSync('git', ['merge-base', '--is-ancestor', sha, 'build'], { cwd: dir }).status === 0;
  r.clean = () => g(['status', '--porcelain', '--untracked-files=no'], r.build) === '' && spawnSync('git', ['rev-parse', '-q', '--verify', 'MERGE_HEAD'], { cwd: r.build }).status !== 0;
  return r;
}

test('L1 a unit whose files pass lands: the --no-ff merge stays, one line; build worktree made when missing; main checkout and .claude refused; one landing at a time; nothing to merge is exit 6; an unchanged file is not run again', (t) => {
  const r = scratch(t);
  let x = r.land('good', VAL, '--build-wt', r.dir);
  assert.equal(x.status, 64, x.stderr);
  assert.match(x.stderr, /main checkout/);
  x = r.land('good', VAL, '--build-wt', path.join(r.dir, '.claude', 'worktrees', 'build'));
  assert.equal(x.status, 64, x.stderr);
  assert.match(x.stderr, /\.claude folder/);
  assert.ok(!fs.existsSync(path.join(r.dir, '.claude')));
  const tip = r.unit('good', val(2));
  const pre = r.head();
  const lockDir = path.join(r.dir, 'research-tree', 'build', 'land.lock');
  write(lockDir, { 'owner.json': JSON.stringify({ pid: process.pid, unit: 'other', t: new Date().toISOString() }) });
  x = r.land('good', VAL);
  assert.equal(x.status, 64, x.stderr);
  assert.match(x.stderr, /one landing at a time/);
  assert.equal(r.head(), pre);
  fs.rmSync(lockDir, { recursive: true, force: true });

  x = r.land('good', VAL);
  assert.equal(x.status, 0, x.stderr);
  assert.ok(fs.existsSync(path.join(r.build, '.git')), 'the build worktree was made');
  const merge = r.head();
  assert.deepEqual(r.g(['rev-list', '--parents', '-n', '1', merge]).split(' ').slice(1), [pre, tip]);
  assert.match(r.g(['log', '-1', '--format=%B', merge]), /^Land-Files: \["tcb\/test\/val\.test\.mjs"\]$/m);
  assert.ok(r.clean());
  let ls = r.lines();
  assert.equal(ls.length, 1);
  const l = ls[0];
  assert.deepEqual(Object.keys(l).slice(0, 8), ['t', 'unit', 'merge', 'pre', 'files', 'exit', 'waited_s', 'ran_s']);
  assert.deepEqual([l.unit, l.merge, l.pre, l.exit, l.kind, l.tip, l.undone, l.calls], ['good', merge, pre, 0, 'land', tip, false, 1]);
  assert.equal(l.files.length, 1);
  assert.deepEqual([l.files[0].file, l.files[0].result, l.files[0].n.pass, l.files[0].n.fail], [VAL, 'pass', 1, 0]);
  assert.match(l.files[0].key, /^[0-9a-f]{24}$/);
  assert.ok(typeof l.waited_s === 'number' && l.waited_s >= 0 && l.ran_s > 0, JSON.stringify(l));

  x = r.land('good', VAL);
  assert.equal(x.status, 6, x.stderr);
  assert.equal(r.lines().length, 1);
  assert.equal(r.head(), merge);

  r.unit('doc', { 'research-tree/notes.md': 'a note\n' }); // nothing under tcb/ or tools/: the file's key is unchanged
  x = r.land('doc', VAL);
  assert.equal(x.status, 0, x.stderr);
  ls = r.lines();
  assert.equal(ls.length, 2);
  assert.deepEqual([ls[1].files[0].result, ls[1].files[0].key, ls[1].files[0].cached, ls[1].calls], ['pass', l.files[0].key, merge.slice(0, 10), 0]);
});

test('L2 a failing test file undoes the merge: build goes back to the commit before it, the line names the failing test, exit 1', (t) => {
  const r = scratch(t);
  const tip = r.unit('bad', { 'research-tree/tcb/val.mjs': 'export const v = 3;\n' });
  const pre = r.head();
  const x = r.land('bad', VAL);
  assert.equal(x.status, 1, x.stderr);
  assert.equal(r.head(), pre);
  assert.ok(!r.inBuild(tip));
  assert.ok(r.clean());
  const ls = r.lines();
  assert.equal(ls.length, 1);
  const l = ls[0];
  assert.deepEqual([l.unit, l.pre, l.exit, l.undone, l.calls], ['bad', pre, 1, true, 2]);
  assert.ok(l.merge && l.merge !== pre && !r.inBuild(l.merge));
  assert.deepEqual([l.files[0].result, l.files[0].rerun], ['fail', 'fail']);
  assert.deepEqual(l.failing, [{ file: VAL, tests: ['T1 v is 1'] }]);
});

test('L3 a textual conflict aborts the merge and returns the unit: exit 2, build unchanged, a line naming the files', (t) => {
  const r = scratch(t);
  r.unit('c1', val(5));
  const tip2 = r.unit('c2', val(6)); // cut from the same tip as c1
  assert.equal(r.land('c1', VAL).status, 0);
  const pre = r.head();
  const x = r.land('c2', VAL);
  assert.equal(x.status, 2, x.stderr);
  assert.equal(r.head(), pre);
  assert.ok(r.clean());
  assert.ok(!r.inBuild(tip2));
  const l = r.lines()[1];
  assert.deepEqual([l.unit, l.merge, l.pre, l.exit, l.aborted], ['c2', null, pre, 2, true]);
  assert.deepEqual([...l.conflicts].sort(), ['research-tree/tcb/test/val.test.mjs', 'research-tree/tcb/val.mjs']);
  assert.deepEqual(l.files, [{ file: VAL, result: 'not-run' }]);
});

test('L4 a merge on build with no line is checked first, by the files its message names or those given for its own unit; one naming none is exit 3; a failing one at the tip is undone, exit 4', (t) => {
  const r = scratch(t);
  r.unit('a', val(7));
  assert.equal(r.land('a', VAL).status, 0);
  r.unit('x', val(8)); // as a lander that ended between merge and record leaves it
  const xm = r.handMerge('x', `land: merge u/x into build\n\nLand-Unit: x\nLand-Files: ["${VAL}"]\n`);
  r.unit('y', { 'research-tree/tcb/y.mjs': 'export const y = 1;\n' });
  let x = r.land('y', VAL);
  assert.equal(x.status, 0, x.stderr);
  let ls = r.lines();
  assert.equal(ls.length, 3);
  assert.deepEqual([ls[1].kind, ls[1].unit, ls[1].merge, ls[1].exit, ls[1].files[0].result, ls[1].files[0].cached], ['recheck', 'x', xm, 0, 'pass', undefined]);
  assert.deepEqual([ls[2].kind, ls[2].unit, ls[2].pre, ls[2].exit, ls[2].files[0].cached], ['land', 'y', xm, 0, undefined]);

  r.unit('z', { 'research-tree/tcb/z.mjs': 'export const z = 1;\n' });
  const zm = r.handMerge('z', null);
  r.unit('w', { 'research-tree/tcb/w.mjs': 'export const w = 1;\n' });
  x = r.land('w', VAL);
  assert.equal(x.status, 3, x.stderr);
  assert.equal(r.head(), zm);
  assert.equal(r.lines().length, 3);
  x = r.land('z', VAL);
  assert.equal(x.status, 0, x.stderr);
  ls = r.lines();
  assert.equal(ls.length, 4);
  assert.deepEqual([ls[3].kind, ls[3].unit, ls[3].merge, ls[3].exit], ['recheck', 'z', zm, 0]);

  r.unit('q', { 'research-tree/tcb/val.mjs': 'export const v = 9;\n' });
  const qm = r.handMerge('q', `land: merge u/q into build\n\nLand-Unit: q\nLand-Files: ["${VAL}"]\n`);
  x = r.land('w', VAL);
  assert.equal(x.status, 4, x.stderr);
  assert.equal(r.head(), zm);
  assert.ok(r.clean());
  ls = r.lines();
  assert.equal(ls.length, 5);
  assert.deepEqual([ls[4].kind, ls[4].unit, ls[4].merge, ls[4].exit, ls[4].undone, ls[4].failing[0].file], ['recheck', 'q', qm, 4, true, VAL]);
});

const FLAKY = `import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const mark = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'tmp', 'flaky.mark');
test('F1 fails on its first run only', () => {
  if (fs.existsSync(mark)) return;
  fs.mkdirSync(path.dirname(mark), { recursive: true });
  fs.writeFileSync(mark, '1');
  throw new Error('first run');
});
`;
test('L5 a file that fails beside others and passes by itself is flaky: the landing passes and the line names it', (t) => {
  const r = scratch(t);
  r.unit('fl', { 'research-tree/tcb/test/flaky.test.mjs': FLAKY });
  const x = r.land('fl', VAL, 'tcb/test/flaky.test.mjs');
  assert.equal(x.status, 0, x.stderr);
  const [l] = r.lines();
  assert.deepEqual(l.flaky, ['tcb/test/flaky.test.mjs']);
  assert.deepEqual(l.files.map((e) => [e.file, e.result, e.rerun]), [[VAL, 'pass', undefined], ['tcb/test/flaky.test.mjs', 'pass', 'fail']]);
  assert.equal(l.calls, 2);
});

test('L6 a file named in shards.cmds runs as its shards plus the tests no shard names, in one lane call', (t) => {
  const r = scratch(t);
  write(r.dir, { 'research-tree/build/facts/lane-measure/shards.cmds': 'node --test --test-reporter=tap --test-name-pattern="^S1 " tcb/test/sh.test.mjs > a.log 2>&1\nnode --test --test-reporter=tap --test-name-pattern="^S2 " tcb/test/sh.test.mjs > b.log 2>&1\n' });
  r.unit('sh', { 'research-tree/tcb/test/sh.test.mjs': `import { test } from 'node:test';\ntest('S1 first shard', () => {});\ntest('S2 second shard', () => {});\ntest('S3 in no shard', () => { throw new Error('S3'); });\n` });
  const pre = r.head();
  const x = r.land('sh', 'tcb/test/sh.test.mjs');
  assert.equal(x.status, 1, x.stderr);
  assert.equal(r.head(), pre);
  const [l] = r.lines();
  assert.deepEqual(l.files[0].shards.map((s) => [s.shard, s.result, s.n && s.n.tests]), [[1, 'pass', 1], [2, 'pass', 1], ['rest', 'fail', 1]]);
  assert.deepEqual(l.failing, [{ file: 'tcb/test/sh.test.mjs', tests: ['S3 in no shard'] }]);
  assert.equal(l.calls, 2); // all three at once, then the failing rest once more by itself
});

test('L7 no result is not a pass: a lane timeout (124) and no free slot (75, asked again) undo the merge, exit 5, files not-run', (t) => {
  const r = scratch(t);
  r.unit('slow', { 'research-tree/tcb/test/slow.test.mjs': testFile('Z1 takes a minute', '() => new Promise((ok) => setTimeout(ok, 60000))') });
  const pre = r.head();
  let x = r.land('slow', 'tcb/test/slow.test.mjs', '--max-timeout-s', '5');
  assert.equal(x.status, 5, x.stderr);
  assert.equal(r.head(), pre);
  assert.ok(r.clean());
  let l = r.lines()[0];
  assert.deepEqual([l.exit, l.undone, l.files[0].result, l.files[0].rerun, l.calls], [5, true, 'not-run', 'not-run', 2]);
  assert.ok(l.ran_s >= 8, JSON.stringify(l));

  const slot = path.join(r.dir, 'research-tree', 'lane', 'slot-0'); // the scratch lane's one slot, held by this live test
  fs.rmSync(slot, { recursive: true, force: true });
  write(slot, { 'owner.json': JSON.stringify({ pid: process.pid, label: 'held', t: new Date().toISOString() }) });
  r.unit('busy', { 'research-tree/tcb/test/busy.test.mjs': testFile('B1 passes', '() => {}') });
  x = r.land('busy', 'tcb/test/busy.test.mjs', '--max-timeout-s', '144', '--wait-budget-s', '0');
  assert.equal(x.status, 5, x.stderr);
  assert.match(x.stderr, /no lane slot/);
  assert.equal(r.head(), pre);
  l = r.lines()[1];
  assert.deepEqual([l.unit, l.exit, l.undone, l.files[0].result, l.calls], ['busy', 5, true, 'not-run', 2]);
  assert.ok(l.waited_s >= 2, JSON.stringify(l));
});
