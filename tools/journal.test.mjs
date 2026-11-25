// Tests of tools/journal.mjs and of the commit check's version-3 rules (unit T8-JOURNAL, 2026-11-24, r57-0056).
// Run: node tools/journal.test.mjs. Each case runs the real tool and real `git commit` in throwaway repositories in a
// temporary folder (removed at the end); nothing in this repository is touched.
import { execFileSync, spawnSync, spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, appendFileSync, copyFileSync, rmSync, chmodSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { today } from './journal-rules.mjs';

const tools = dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
function expect(name, ok, detail = '') { ok ? pass++ : fail++; console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${ok ? '' : '  (' + String(detail).replace(/\s+/g, ' ').slice(0, 300) + ')'}`); }
const tmp = mkdtempSync(join(tmpdir(), 't8-journal-test-'));
const ID = ['-c', 'user.name=t8-test', '-c', 'user.email=t8-test@example.invalid'];
const rec = (o) => JSON.stringify(o);
let n = 0;
function mk() {
  const root = join(tmp, 'r' + (++n));
  const put = (rel, text) => { mkdirSync(dirname(join(root, rel)), { recursive: true }); writeFileSync(join(root, rel), text); };
  const g = (...a) => execFileSync('git', [...ID, ...a], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  mkdirSync(root);
  g('init', '-q');
  put('library/journal/2026-11-18/r57.jsonl', rec({ id: 'r57-0150', kind: 'fact', status: 'measured', claim: 'old', date: '2026-11-18', by: 'r57' }) + '\n');
  put('library/journal/2026-11-19/r57.jsonl', rec({ id: 'r57-0103', kind: 'fact', status: 'measured', claim: 'crlf file', date: '2026-11-19', by: 'r57' }) + '\r\n');
  for (const f of ['journal.mjs', 'journal-rules.mjs', 'check-commit.mjs']) put('tools/' + f, readFileSync(join(tools, f)));
  put('tools/git-hooks/pre-commit', readFileSync(join(tools, 'git-hooks', 'pre-commit')));
  try { chmodSync(join(root, 'tools/git-hooks/pre-commit'), 0o755); } catch {}
  put('migration/source-manifest.json', '[]'); put('migration/clinic-manifest.json', '{"files":[]}'); put('.gitattributes', '* -text\n');
  g('add', '-A'); g('commit', '-q', '--no-verify', '-m', 'base');
  g('config', 'core.hooksPath', join(root, 'tools', 'git-hooks'));
  const tool = (args, input) => spawnSync('node', ['tools/journal.mjs', ...args], { cwd: root, input: input == null ? '' : input, encoding: 'utf8' });
  const commit = () => { g('add', '-A'); return spawnSync('git', [...ID, 'commit', '-q', '-m', 'x'], { cwd: root, encoding: 'utf8' }); };
  const read = (rel) => readFileSync(join(root, rel), 'utf8');
  return { root, put, g, tool, commit, read };
}
const T = `library/journal/${today()}/r57.jsonl`;
const out = (r) => (r.stdout || '') + (r.stderr || '');
try {
  const a = mk();
  // dry run, then append; ids above every date folder; fields in the README's order
  let r = a.tool([], rec({ claim: 'first', status: 'measured', kind: 'fact', by: 'r57' }));
  expect('dry run prints the next free id over all date folders (r57-0151) and writes nothing', r.status === 0 && /r57-0151/.test(r.stdout) && /dry run/.test(r.stdout) && spawnSync('git', ['status', '--porcelain'], { cwd: a.root, encoding: 'utf8' }).stdout.trim() === '', out(r));
  r = a.tool(['--append'], rec({ claim: 'first', status: 'measured', kind: 'fact', by: 'r57' }));
  expect('--append adds it with fields in order, date and by filled', r.status === 0 && a.read(T).startsWith(`{"id":"r57-0151","kind":"fact","status":"measured","claim":"first","date":"${today()}","by":"r57"}\n`), out(r) + a.read(T));
  r = a.tool(['--append', '--prefix', 'r57'], JSON.stringify([{ kind: 'fact', status: 'observed', claim: 'second' }, { kind: 'mistake', status: 'observed', claim: 'third, see {#1}', see: ['{#1}'] }]));
  expect('a batch: next ids per kind range, and {#1} names the first record', r.status === 0 && /"id":"r57-0152"/.test(a.read(T)) && a.read(T).includes('{"id":"r57-0600","kind":"mistake","status":"observed","claim":"third, see r57-0152","see":["r57-0152"]'), out(r));
  r = a.tool(['--append', '--date', '2026-11-19'], rec({ id: 'r57', kind: 'fact', status: 'measured', claim: 'into the CRLF file' }));
  expect('an append to a CRLF file keeps CRLF (requested prefix "id": "r57")', r.status === 0 && a.read('library/journal/2026-11-19/r57.jsonl').endsWith('"claim":"into the CRLF file","date":"2026-11-19","by":"r57"}\r\n'), out(r));
  // refusals, nothing written
  const before = a.read(T);
  for (const [name, input, re] of [
    ['a full id is refused', rec({ id: 'r57-0999', kind: 'fact', status: 'measured', claim: 'x' }), /assigned by this tool/],
    ['a bad kind is refused', rec({ by: 'r57', kind: 'idea', status: 'measured', claim: 'x' }), /kind "idea"/],
    ['a field that is no record field is refused', rec({ by: 'r57', kind: 'fact', status: 'measured', claim: 'x', source: 'y' }), /not a record field/],
    ['a bad status is refused (the commit check\'s rule)', rec({ by: 'r57', kind: 'fact', status: 'guessed', claim: 'x' }), /status "guessed"/],
    ['a supersedes naming no record is refused', rec({ by: 'r57', kind: 'fact', status: 'measured', claim: 'x', supersedes: ['r57-0777'] }), /no record in the journal/],
    ['a record without a claim is refused', rec({ by: 'r57', kind: 'fact', status: 'measured' }), /"claim" is missing/],
    ['evidence that is not a list is refused', rec({ by: 'r57', kind: 'fact', status: 'measured', claim: 'x', evidence: 'a.md' }), /list of strings/],
  ]) { r = a.tool(['--append'], input); expect(name, r.status === 1 && re.test(r.stderr) && a.read(T) === before, out(r)); }
  // two runs at once: distinct ids
  const both = await Promise.all([1, 2].map((k) => new Promise((res) => {
    const p = spawn('node', ['tools/journal.mjs', '--append'], { cwd: a.root }); let o = '';
    p.stdout.on('data', (d) => (o += d)); p.stderr.on('data', (d) => (o += d)); p.on('close', (c) => res({ c, o }));
    p.stdin.end(rec({ by: 'r57', kind: 'fact', status: 'measured', claim: 'parallel ' + k }));
  })));
  const ids = a.read(T).match(/"id":"r57-01\d\d"/g) || [];
  expect('two appends at once get distinct ids, both written', both.every((b) => b.c === 0) && new Set(ids).size === ids.length && ids.length === 4, JSON.stringify(both) + ids);
  r = a.tool(['--check']);
  expect('--check: every file in a state the tool wrote', r.status === 0, out(r));
  r = a.commit();
  expect('commit of the tool\'s lines passes the commit check', r.status === 0, out(r));
  // a line the tool wrote, removed by hand: the tool refuses to append, the commit check refuses
  a.tool(['--append', '--prefix', 'r57'], JSON.stringify([{ kind: 'fact', status: 'measured', claim: 'to be lost' }, { kind: 'fact', status: 'measured', claim: 'kept' }]));
  writeFileSync(join(a.root, T), a.read(T).split('\n').filter((l) => !l.includes('to be lost')).join('\n'));
  r = a.tool(['--append'], rec({ by: 'r57', kind: 'fact', status: 'measured', claim: 'after' }));
  expect('the tool refuses to append to a file changed outside it (t7-0800)', r.status === 1 && /changed outside this tool/.test(r.stderr) && /set back to the last commit|changed/.test(r.stderr), out(r));
  r = a.commit();
  expect('commit check: a line the tool appended since the commit, removed by hand, is refused', r.status !== 0 && /are gone from it/.test(out(r)), out(r));
  a.g('reset', '-q');
  // a hand-written line, and a field moved by hand
  const b = mk();
  appendFileSync(join(b.root, 'library/journal/2026-11-19/r57.jsonl'), rec({ id: 'r57-0104', kind: 'fact', status: 'measured', claim: 'by hand' }) + '\r\n');
  r = b.commit();
  expect('commit check: a valid record appended by hand is refused', r.status !== 0 && /not written by node tools\/journal\.mjs/.test(out(r)), out(r));
  r = b.tool(['--adopt', 'library/journal/2026-11-19/r57.jsonl']);
  expect('--adopt dry run names the line and seals nothing', r.status === 0 && /r57-0104/.test(r.stdout) && /dry run/.test(r.stdout), out(r));
  r = b.tool(['--adopt', 'library/journal/2026-11-19/r57.jsonl', '--apply']);
  b.g('reset', '-q');
  const rc = b.commit();
  expect('--adopt --apply, then the commit passes', r.status === 0 && rc.status === 0, out(r) + out(rc));
  b.tool(['--append'], rec({ by: 'r57', kind: 'fact', status: 'measured', claim: 'moved', date: '2026-11-24' }));
  const t = b.read(T), moved = t.replace('"claim":"moved","date":"2026-11-24"', '"date":"2026-11-24","claim":"moved"').replace(/,"date":"2026-11-24","claim":"moved"/, ',"claim":"moved","date":"2026-11-24"');
  writeFileSync(join(b.root, T), t.replace('{"id":"r57-0151","kind":"fact","status":"measured","claim":"moved"', '{"kind":"fact","id":"r57-0151","status":"measured","claim":"moved"'));
  r = b.commit();
  expect('commit check: a tool line rewritten by hand (field moved, t7-0801) is refused', r.status !== 0 && /changed after it wrote them|not written/.test(out(r)), out(r) + moved.length);
  b.g('reset', '-q');
  const c = mk();
  appendFileSync(join(c.root, 'library/journal/2026-11-18/r57.jsonl'), '  ' + rec({ id: 'r57-0103', kind: 'fact', status: 'measured', claim: 'dup' }) + '\n');
  r = c.commit();
  expect('commit check: a reused id hidden by leading spaces is refused', r.status !== 0 && /used more than once/.test(out(r)), out(r));
  r = c.tool(['--adopt', 'library/journal/2026-11-18/r57.jsonl']);
  expect('--adopt refuses a line with a reused id', r.status === 1 && /used more than once/.test(r.stderr), out(r));
  // fix B4 (unit T8-FIX): a lock left by a crashed run 7 s ago is taken over (stale after 21 holds of 281 ms, t8-0104);
  // the old 60 s stale age made the tool wait 10 s and refuse.
  const d = mk();
  const lk = join(d.root, '.git', 'journal-seal.lock');
  writeFileSync(lk, '99999 crashed\n');
  const old = (Date.now() - 7000) / 1000; utimesSync(lk, old, old);
  const t0 = Date.now();
  r = d.tool(['--append'], rec({ claim: 'after a crash', status: 'measured', kind: 'fact', by: 'r57' }));
  expect('a lock left 7 s ago by a crashed run is taken over', r.status === 0 && d.read(T).includes('"claim":"after a crash"'), out(r) + ` ${Date.now() - t0} ms`);
} finally {
  try { rmSync(tmp, { recursive: true, force: true }); } catch {}
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
