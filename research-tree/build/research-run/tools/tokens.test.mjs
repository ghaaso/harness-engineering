import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpRun, helper, jsonl, run } from './test-util.mjs';

test('counts once per message id (largest per field), by unit, nested helpers under their own unit', () => {
  const t = tmpRun();
  // m1 appears twice (streaming): counted once, largest fields
  helper(t.folder, 's1', 'a1', 'read: f2 first', [['m1', 1, 100, 1000, 5], ['m1', 1, 100, 1000, 50], ['m2', 2, 0, 2000, 10]]);
  helper(t.folder, 's1', 'a2', 'collect: f2 second', [['m3', 0, 0, 500_000, 0]]);
  helper(t.folder, 's1', 'a3', 'read: closing sample of f4', [['m4', 0, 0, 1_000_000, 0]], { parentAgentId: 'a1', spawnDepth: 2 });
  fs.writeFileSync(path.join(t.folder, 's1.jsonl'), jsonl([['c1', 10, 0, 90, 0]]));
  assert.equal(run('tokens.mjs', ['f2'], t).out, 'f2 3 calls 0.50 M tokens (0.00 M fresh)');
  assert.equal(run('tokens.mjs', ['closing'], t).out, 'closing 1 calls 1.00 M tokens (0.00 M fresh)');
  assert.equal(run('tokens.mjs', ['coordinator'], t).out, 'coordinator 1 calls 0.00 M tokens (0.00 M fresh)');
  assert.match(run('tokens.mjs', ['run'], t).out, /^run 5 calls 1\.50 M tokens/);
  assert.ok(fs.existsSync(path.join(t.root, 'run', 'tokens-f2.txt')));
  assert.match(fs.readFileSync(path.join(t.root, 'run', 'tokens-run.txt'), 'utf8'), /TOTAL/);
});

test('exact numbers: total = input + cache creation + cache read + output; fresh leaves the cache read out', () => {
  const t = tmpRun();
  helper(t.folder, 's1', 'a1', 'build: f9 x', [['m1', 1_000_000, 2_000_000, 3_000_000, 4_000_000]]);
  assert.equal(run('tokens.mjs', ['f9'], t).out, 'f9 1 calls 10.00 M tokens (7.00 M fresh)');
});

test('--root takes the transcript folder, an unknown unit prints zero', () => {
  const t = tmpRun();
  helper(t.folder, 's1', 'a1', 'read: f2 x', [['m1', 0, 0, 1_000_000, 0]]);
  assert.equal(run('tokens.mjs', ['f2', '--root', t.folder], t, { CLAUDE_PROJECTS: '/nonexistent' }).out, 'f2 1 calls 1.00 M tokens (0.00 M fresh)');
  assert.equal(run('tokens.mjs', ['f8'], t).out, 'f8 0 calls 0.00 M tokens (0.00 M fresh)');
});
