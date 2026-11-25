// Tests of tools/promote.mjs, in a throwaway repository (node --test tools/promote.test.mjs).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'promote.mjs');
const base = mkdtempSync(join(tmpdir(), 'promote-test-'));
const repo = join(base, 'repo');
const g = (...a) => execFileSync('git', a, { cwd: repo, encoding: 'utf8' }).trim();
const put = (rel, text) => { const p = join(repo, ...rel.split('/')); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); };

before(() => {
  mkdirSync(repo);
  g('init', '-q', '-b', 'main');
  g('config', 'user.email', 't@example.com'); g('config', 'user.name', 'T');
  g('config', 'core.autocrlf', 'false');
  put('README.md', 'base\n');
  put('same.txt', 'same\n');
  put('changed.txt', 'old\n');
  put('migration/source-manifest.json', JSON.stringify([{ path: 'arch/listed.txt' }]));
  put('migration/clinic-manifest.json', JSON.stringify({ files: [] }));
  put('OWNERS.json', JSON.stringify({ this_pc: 'me', people: { me: { branches: ['me/*'], paths: ['everything not listed'] }, you: { branches: ['you/*'], paths: ['work/**', 'tools/theirs.sh'] } } }));
  g('add', '-A'); g('commit', '-q', '-m', 'base');
  g('branch', '-f', 'origin-main-src'); // a fake origin/main: a ref under refs/remotes
  g('update-ref', 'refs/remotes/origin/main', 'HEAD');
  g('checkout', '-q', '-b', 'me/build');
  put('same.txt', 'same\n');
  put('changed.txt', 'new\n');
  put('good/a.txt', 'a\n'); put('good/b.txt', 'b\n'); put('other/c.txt', 'c\n');
  put('work/x.txt', 'x\n'); put('tools/theirs.sh', 'echo\n');
  put('recovered/r.txt', 'r\n'); put('docs/program/evidence/e.txt', 'e\n'); put('arch/listed.txt', 'l\n');
  put('library/journal/2026-11-25/t.jsonl',
    JSON.stringify({ id: 't-0001', kind: 'fact', status: 'measured', claim: 'x' }) + '\n' +
    JSON.stringify({ id: 't-0002', kind: 'fact', status: 'open', claim: 'y' }) + '\n');
  g('add', '-A'); g('commit', '-q', '-m', 'work');
});
after(() => rmSync(base, { recursive: true, force: true }));

let n = 0;
const entry = (o = {}) => ({ name: 'Piece', what: 'w', number: '1', measure: 'time taken', gain: 'g', records: ['t-0001'], paths: ['good'], ...o });
function go(doc, apply = false) {
  const f = join(base, `e${n++}.json`);
  writeFileSync(f, JSON.stringify({ branch: 'me/promote-a', from: 'me/build', entries: [entry()], ...doc }));
  const r = spawnSync('node', [SCRIPT, f, ...(apply ? ['--apply'] : [])], { cwd: repo, encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
const refused = (r, re) => { assert.equal(r.code, 1, r.out + r.err); assert.match(r.err, re); assert.equal(g('branch', '--list', 'me/promote-*'), ''); };

test('a: an unknown record is refused', () => refused(go({ entries: [entry({ records: ['t-9999'] })] }), /not in library\/journal: t-9999/));
test('a: no measured or observed record is refused', () => refused(go({ entries: [entry({ records: ['t-0002'] })] }), /none of its records/));
test('b: a branch of another person is refused', () => refused(go({ branch: 'you/promote-a' }), /does not start with a branch pattern/));
test('b: a branch that exists is refused', () => { const r = go({ branch: 'me/build' }); assert.equal(r.code, 1); assert.match(r.err, /exists already/); });
test('c: a file of another person is refused', () => refused(go({ entries: [entry({ paths: ['work', 'tools/theirs.sh'] })] }), /belong to another person/));
test('c: archived evidence is refused', () => {
  for (const p of ['recovered', 'docs/program/evidence', 'arch/listed.txt']) refused(go({ entries: [entry({ paths: [p] })] }), /archived evidence/);
});
test('c: a changed file already on origin/main is refused, and allowed with replaces', () => {
  refused(go({ entries: [entry({ paths: ['changed.txt'] })] }), /different content/);
  const r = go({ entries: [entry({ paths: ['changed.txt'], replaces: true })] });
  assert.equal(r.code, 0, r.err);
});
test('c: an empty file list is refused', () => refused(go({ entries: [entry({ paths: ['nothing-here'] })] }), /no file/));
test('dry run changes nothing', () => {
  const r = go({ entries: [entry({ paths: ['good'] })] });
  assert.equal(r.code, 0, r.err); assert.match(r.out, /dry run/);
  assert.equal(g('branch', '--list', 'me/promote-*'), '');
});

test('apply: the branch holds exactly the named files plus PROVEN.md, nothing pushed', () => {
  const before = g('rev-parse', 'refs/remotes/origin/main');
  const head = g('rev-parse', 'me/build');
  const r = go({ entries: [entry({ paths: ['good', 'same.txt', ':(exclude)good/b.txt'] })] }, true);
  assert.equal(r.code, 0, r.err + r.out);
  assert.match(r.out, /git push -u origin me\/promote-a/);
  const files = g('diff', '--name-only', 'refs/remotes/origin/main', 'me/promote-a').split('\n').sort();
  assert.deepEqual(files, ['PROVEN.md', 'good/a.txt']);
  const proven = g('show', 'me/promote-a:PROVEN.md');
  assert.match(proven, /\| Piece \| w \| 1 \| time taken \| g \| t-0001 \|/);
  assert.equal(g('rev-parse', 'refs/remotes/origin/main'), before);
  assert.equal(g('rev-parse', 'me/build'), head);
  assert.equal(g('remote'), '');
  assert.equal(g('worktree', 'list').split('\n').length, 1);
  assert.match(g('log', '-1', '--format=%B', 'me/promote-a'), /Piece: t-0001/);
});
test('apply: a second run on a new branch replaces the row of the same piece and adds others', () => {
  g('update-ref', 'refs/remotes/origin/main', 'me/promote-a');
  const r = go({ branch: 'me/promote-b', entries: [entry({ gain: 'g2', paths: ['good/b.txt'] }), entry({ name: 'Second', paths: ['other'] })] }, true);
  assert.equal(r.code, 0, r.err + r.out);
  const rows = g('show', 'me/promote-b:PROVEN.md').split('\n').filter((l) => l.startsWith('| ') && !/^\| (piece|---)/.test(l));
  assert.equal(rows.length, 2);
  assert.match(rows[0], /^\| Piece \| w \| 1 \| time taken \| g2 \|/);
  assert.match(rows[1], /^\| Second /);
});
