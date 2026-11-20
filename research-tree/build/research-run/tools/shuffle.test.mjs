import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpRun, run } from './test-util.mjs';

const A = `---
arm: R_same
---
# Review by the refuter (same-window arm)
Reviewer: writer session
| row | finding |
|---|---|
| 1 | The fresh read shows the cache key is wrong |
| 2 | Edge case in the arm of the parser |
Plain row that stays.
`;
const B = `# fresh arm review
Produced by: fresh helper
| 1 | The same-window run missed the key |
| 2 | R_same agrees |
Plain row B.
`;

test('no arm word is left, review rows stay, order is hidden in a key', () => {
  const t = tmpRun();
  fs.mkdirSync(path.join(t.root, 'fields', '4-memory'), { recursive: true });
  fs.writeFileSync(path.join(t.root, 'a_same.md'), A);
  fs.writeFileSync(path.join(t.root, 'b_fresh.md'), B);
  const r = run('shuffle.mjs', ['f4', 'a_same.md', 'b_fresh.md'], t);
  assert.match(r.out, /^f4 shuffled/);
  assert.doesNotMatch(r.out, /a_same|b_fresh|swap|order/);
  const dir = path.join(t.root, 'fields', '4-memory', 'score-in');
  const texts = ['review-1.md', 'review-2.md'].map(n => fs.readFileSync(path.join(dir, n), 'utf8'));
  for (const x of texts) {
    assert.doesNotMatch(x, /R_same|same[- ]window|refuter|writer|fresh|\barm\b|a_same|b_fresh/i);
    assert.match(x, /Plain row/);
  }
  assert.ok(texts.some(x => x.includes('cache key is wrong')) && texts.some(x => x.includes('| 2 |')));
  const key = JSON.parse(fs.readFileSync(path.join(t.root, 'sealed', 'f4-arms.json'), 'utf8'));
  assert.deepEqual([key['review-1.md'].argument, key['review-2.md'].argument].sort(), [1, 2]);
  const placed = texts[key['review-1.md'].argument - 1] ? true : false;
  assert.ok(placed);
  assert.match(texts[0], key['review-1.md'].argument === 1 ? /Plain row that stays/ : /Plain row B/);
});

test('both orders occur over repeated runs (random, not fixed)', () => {
  const t = tmpRun();
  fs.mkdirSync(path.join(t.root, 'fields', '4-memory'), { recursive: true });
  fs.writeFileSync(path.join(t.root, 'a.md'), 'row A\n');
  fs.writeFileSync(path.join(t.root, 'b.md'), 'row B\n');
  const seen = new Set();
  for (let i = 0; i < 24 && seen.size < 2; i++) {
    fs.rmSync(path.join(t.root, 'sealed'), { recursive: true, force: true });
    run('shuffle.mjs', ['f4', 'a.md', 'b.md'], t);
    seen.add(fs.readFileSync(path.join(t.root, 'fields', '4-memory', 'score-in', 'review-1.md'), 'utf8'));
  }
  assert.equal(seen.size, 2);
});

test('refuses without exactly one field folder', () => {
  const t = tmpRun();
  fs.writeFileSync(path.join(t.root, 'a.md'), 'x');
  assert.match(run('shuffle.mjs', ['f4', 'a.md', 'a.md'], t).out, /^REFUSED f4/);
});

import { scrub } from './shuffle.mjs';

test('arm words are masked only as whole words', () => {
  const o = scrub('| W1 | harm and refresh and firearm and swarm | the Fresh read, an ARM, R_same |\n');
  assert.match(o, /harm and refresh and firearm and swarm/);
  assert.match(o, /the \[x\] read, an \[x\], \[x\]/);
});

test('a row carrying a source, model or file keeps it', () => {
  const row = '| W2 | planted/a.md:12 | "x" | other | fact | source: RUN:papers/f4/x/paper.txt line 9: "model file" | model: gpt, file: a.md | token count |';
  assert.ok(scrub('# Review of field f4\n\n' + row + '\n').includes(row));
});

test('a review in the form: arm-naming header and metadata go, every row stays', () => {
  const form = ['# Review of field f4 (fresh arm)', 'Writer: x', 'Model: y', 'Session: z',
    '## 1. Claims', '| Id | Our place | Source with its place (quoted) |', '|---|---|---|',
    '| W1 | planted/a:1 | RUN:papers/f4/a/paper.txt line 3 |', '| W2 | planted/b:2 | planted/b:2 |',
    '## 2. Our approaches', '| A1 | x | untested |', '## 3. Counts', '| N1 | 2 | 2 |'].join('\n') + '\n';
  const o = scrub(form);
  assert.doesNotMatch(o, /fresh|Writer|Model:|Session:/i);
  for (const id of ['W1', 'W2', 'A1', 'N1']) assert.ok(o.includes(`| ${id} |`));
  assert.ok(o.includes('| Id | Our place | Source with its place (quoted) |'));
});

test('a repeat reuses the sealed order and never makes a new key', () => {
  const t = tmpRun();
  fs.mkdirSync(path.join(t.root, 'fields', '4-memory'), { recursive: true });
  fs.writeFileSync(path.join(t.root, 'a.md'), 'row A\n');
  fs.writeFileSync(path.join(t.root, 'b.md'), 'row B\n');
  run('shuffle.mjs', ['f4', 'a.md', 'b.md'], t);
  const keyFile = path.join(t.root, 'sealed', 'f4-arms.json');
  const key = fs.readFileSync(keyFile, 'utf8');
  const first = fs.readFileSync(path.join(t.root, 'fields', '4-memory', 'score-in', 'review-1.md'), 'utf8');
  for (let i = 0; i < 12; i++) {
    fs.rmSync(path.join(t.root, 'fields', '4-memory', 'score-in'), { recursive: true });
    run('shuffle.mjs', ['f4', 'a.md', 'b.md'], t);
    assert.equal(fs.readFileSync(path.join(t.root, 'fields', '4-memory', 'score-in', 'review-1.md'), 'utf8'), first);
    assert.equal(fs.readFileSync(keyFile, 'utf8'), key);
  }
});
