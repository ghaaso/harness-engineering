// Tests of the graph-of-thoughts reminder. Run: node --test .claude/hooks/got-reminder.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK = resolve(dirname(fileURLToPath(import.meta.url)), 'got-reminder.mjs');
const run = (prompt, raw) => spawnSync(process.execPath, [HOOK], { input: raw ?? JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 's', prompt }), encoding: 'utf8' });

test('a message naming the method gets the rule as context', () => {
  for (const p of ['run the model as a real Graph of Thought please', 'do graph-of-thoughts on it', 'GRAPH THINKING, not a drawing',
    'try a tree of thoughts', 'a forest_of_thoughts would do']) {
    const r = run(p);
    assert.equal(r.status, 0, p);
    const o = JSON.parse(r.stdout);
    assert.equal(o.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
    const note = o.hookSpecificOutput.additionalContext;
    assert.match(note, /RESEARCH-METHOD-RULES-2026-11-25\.md/);
    assert.match(note, /check-got\.mjs/);
    assert.ok(note.split('\n').length <= 12, 'at most twelve lines');
  }
});
test('any other message, or input that is not JSON, adds nothing', () => {
  for (const p of ['plot the graph of the losses', 'my thoughts on the tree model', 'a knowledge graph thought through']) {
    const r = run(p); assert.equal(r.status, 0, p); assert.equal(r.stdout, '', p);
  }
  const r = run(null, '{not json'); assert.equal(r.status, 0); assert.equal(r.stdout, '');
});
