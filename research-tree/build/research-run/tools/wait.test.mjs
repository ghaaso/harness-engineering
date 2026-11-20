import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpRun, helper, run } from './test-util.mjs';

test('refuses a time over 150 s', () => {
  const r = run('wait.mjs', ['f2', '151', 'x.md'], tmpRun());
  assert.equal(r.code, 2);
  assert.match(r.out, /^REFUSED f2: 151 s is over 150 s/);
});

test('times out with the missing file named, and carries the token count and limit', () => {
  const t = tmpRun();
  helper(t.folder, 's1', 'a1', 'read: f2 paper', [['m1', 1000, 0, 0, 500]]);
  const r = run('wait.mjs', ['f2', '1', 'a.md', 'b.md'], t, { WAIT_POLL_MS: '200' });
  assert.equal(r.out, 'f2 done 0/2 missing: a.md, b.md | tokens 0.00 M of limit 90 M');
});

test('returns at once when every file exists', () => {
  const t = tmpRun();
  fs.writeFileSync(path.join(t.root, 'a.md'), 'x');
  const t0 = Date.now();
  const r = run('wait.mjs', ['f2', '100', 'a.md'], t, { WAIT_POLL_MS: '200' });
  assert.match(r.out, /^f2 done 1\/1 \| tokens 0\.00 M of limit 90 M$/);
  assert.ok(Date.now() - t0 < 20000);
});

test('returns when the file appears during the wait', async () => {
  const t = tmpRun();
  setTimeout(() => fs.writeFileSync(path.join(t.root, 'late.md'), 'x'), 500);
  const { spawn } = await import('node:child_process');
  const { TOOLS } = await import('./test-util.mjs');
  const out = await new Promise(res => {
    let s = '';
    const p = spawn(process.execPath, [path.join(TOOLS, 'wait.mjs'), 'f2', '20', 'late.md'], { env: { ...process.env, RUN_ROOT: t.root, CLAUDE_PROJECTS: t.projects, WAIT_POLL_MS: '200' } });
    p.stdout.on('data', d => s += d);
    p.on('close', () => res(s.trim()));
  });
  assert.match(out, /^f2 done 1\/1 \|/);
});
