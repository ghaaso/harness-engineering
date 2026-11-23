import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpRun, run } from './test-util.mjs';

function repo() {
  const t = tmpRun(null);
  const g = (...a) => spawnSync('git', ['-C', t.root, ...a], { encoding: 'utf8' });
  g('init', '-q'); g('config', 'user.email', 'a@b'); g('config', 'user.name', 'n'); g('config', 'core.autocrlf', 'false');
  fs.writeFileSync(path.join(t.root, 'base.md'), 'base\n'); g('add', 'base.md'); g('commit', '-qm', 'base');
  return { t, g };
}

test('commits only the named paths', () => {
  const { t, g } = repo();
  fs.writeFileSync(path.join(t.root, 'a.md'), 'a\n');
  fs.writeFileSync(path.join(t.root, 'b.md'), 'b\n');
  const r = run('commit.mjs', ['add a', 'a.md'], t);
  assert.match(r.out, /^committed [0-9a-f]+: 1 path\(s\)$/);
  assert.equal(g('show', '--stat', '--format=', 'HEAD').stdout.trim().split('\n').length, 2); // a.md line + summary
  assert.match(g('status', '--short').stdout, /\?\? b\.md/);
  assert.match(run('commit.mjs', ['again', 'a.md'], t).out, /^nothing to commit/);
});

test('waits for a fresh index.lock, then commits when it goes away', async () => {
  const { t } = repo();
  fs.writeFileSync(path.join(t.root, 'a.md'), 'a\n');
  const lock = path.join(t.root, '.git', 'index.lock');
  fs.writeFileSync(lock, '');
  setTimeout(() => fs.unlinkSync(lock), 1500);
  const { spawn } = await import('node:child_process');
  const { TOOLS } = await import('./test-util.mjs');
  const out = await new Promise(res => {
    let s = '';
    const p = spawn(process.execPath, [path.join(TOOLS, 'commit.mjs'), 'm', 'a.md'], { env: { ...process.env, RUN_ROOT: t.root } });
    p.stdout.on('data', d => s += d);
    p.on('close', () => res(s.trim()));
  });
  assert.match(out, /^committed [0-9a-f]+/);
  assert.doesNotMatch(out, /stale/);
});

test('removes an old lock when no git process runs', () => {
  const { t } = repo();
  fs.writeFileSync(path.join(t.root, 'a.md'), 'a\n');
  const lock = path.join(t.root, '.git', 'index.lock');
  fs.writeFileSync(lock, '');
  const old = new Date(Date.now() - 120000);
  fs.utimesSync(lock, old, old);
  assert.match(run('commit.mjs', ['m', 'a.md'], t).out, /^committed [0-9a-f]+: 1 path\(s\) \(removed a stale index\.lock\)$/);
});
