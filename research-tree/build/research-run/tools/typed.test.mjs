import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpRun, run } from './test-util.mjs';

const rec = (extra, content, ts = '2026-11-20T10:00:00Z') => JSON.stringify({ type: 'user', timestamp: ts, message: { role: 'user', content }, ...extra });

test('finds a typed turn; not a tool result, notification, peer message, reminder or summary', () => {
  const t = tmpRun();
  const dir = path.join(t.projects, 'C--proj');
  fs.mkdirSync(path.join(dir, 'sess-sub', 'subagents'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'sess1.jsonl'), [
    rec({ turnOrigin: 'human', origin: { kind: 'human' } }, 'First sentence. I want a B+ tree index here. Last sentence.'),
    rec({ turnOrigin: 'human' }, [{ type: 'text', text: '<system-reminder>\nB+ tree in a reminder\n</system-reminder>' }, { type: 'text', text: 'typed after a reminder: b+ TREE again' }], '2026-11-21T10:00:00Z'),
    rec({}, [{ type: 'tool_result', tool_use_id: 'x', content: 'B+ tree in a tool result' }]),
    rec({ turnOrigin: 'task_notification' }, '<task-notification>B+ tree notification</task-notification>'),
    rec({ turnOrigin: 'peer', isMeta: true }, 'Another Claude session sent a message: B+ tree'),
    rec({ turnOrigin: 'host_synthetic' }, '<system-reminder>\nB+ tree reminder only\n</system-reminder>'),
    rec({ turnOrigin: 'human' }, 'This session is being continued from a previous conversation. B+ tree'),
    rec({}, '<command-name>/model</command-name> B+ tree'),
  ].join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'sess-sub', 'subagents', 'agent-a.jsonl'), rec({ turnOrigin: 'human' }, 'B+ tree in a subagent') + '\n');
  const outFile = path.join(t.root, 'o', 'typed.md');
  const r = run('typed.mjs', ['B+ tree', '--out', outFile], t);
  assert.equal(r.out, `typed: 2 turns match "B+ tree" in 1 sessions -> ${outFile}`);
  const txt = fs.readFileSync(outFile, 'utf8');
  assert.match(txt, /I want a B\+ tree index here/);
  assert.match(txt, /First sentence\./);
  assert.match(txt, /Last sentence\./);
  assert.ok(txt.indexOf('2026-11-21') < txt.indexOf('2026-11-20')); // newest first
  assert.doesNotMatch(txt, /tool result|notification|reminder only|in a reminder|session is being|subagent|command-name/);
});

test('comma-separated terms match any; no match prints zero', () => {
  const t = tmpRun();
  const dir = path.join(t.projects, 'C--proj');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 's.jsonl'), rec({ turnOrigin: 'human' }, 'Alpha idea.') + '\n');
  const o = path.join(t.root, 'x.md');
  assert.match(run('typed.mjs', ['zeta, ALPHA', '--out', o], t).out, /^typed: 1 turns match "zeta, ALPHA" in 1 sessions/);
  assert.match(run('typed.mjs', ['nothing', '--out', o], t).out, /^typed: 0 turns/);
});
