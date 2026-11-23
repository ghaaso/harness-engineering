// Tests of the journal watch (unit T8-JOURNAL, 2026-11-24, r57-0056). Run: node .claude/hooks/journal-watch.test.mjs [hook file]
// Each case feeds the hook a real PostToolUse input on stdin, in throwaway repositories (removed at the end) holding
// copies of the hook, tools/journal.mjs and tools/journal-rules.mjs. Prints the fast path's time (no journal change).
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, appendFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..');
let pass = 0, fail = 0;
const expect = (name, r, code, re) => { const o = (r.stdout || '') + (r.stderr || ''); const ok = r.status === code && (!re || re.test(o)); ok ? pass++ : fail++; console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${ok ? '' : `  (exit ${r.status}; ${o.replace(/\s+/g, ' ').slice(0, 240)})`}`); };
const tmp = mkdtempSync(join(tmpdir(), 't8-watch-test-'));
const ID = ['-c', 'user.name=t8', '-c', 'user.email=t8@example.invalid', '-c', 'core.hooksPath='];
const J = 'library/journal/2026-11-19/r57.jsonl';
let n = 0;
function mk() {
  const root = join(tmp, 'r' + (++n));
  const put = (rel, t) => { mkdirSync(dirname(join(root, rel)), { recursive: true }); writeFileSync(join(root, rel), t); };
  const g = (...a) => execFileSync('git', [...ID, ...a], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  mkdirSync(root); g('init', '-q');
  put(J, '{"id":"r57-0103","kind":"fact","status":"measured","claim":"base"}\n'); put('.gitattributes', '* -text\n');
  for (const f of ['journal.mjs', 'journal-rules.mjs']) put('tools/' + f, readFileSync(join(repo, 'tools', f)));
  put('.claude/hooks/journal-watch.mjs', readFileSync(join(here, process.argv[2] || 'journal-watch.mjs'))); // another file: node journal-watch.test.mjs journal-watch.next.mjs
  g('add', '-A'); g('commit', '-q', '--no-verify', '-m', 'base');
  const watch = (input) => spawnSync('node', [join(root, '.claude', 'hooks', 'journal-watch.mjs')], { input: input ?? JSON.stringify({ hook_event_name: 'PostToolUse', session_id: 'test', cwd: root, tool_name: 'Bash', tool_input: { command: 'x' }, tool_response: {} }), encoding: 'utf8' });
  const tool = (recs) => spawnSync('node', ['tools/journal.mjs', '--append', '--date', '2026-11-19', '--prefix', 'r57'], { cwd: root, input: JSON.stringify(recs), encoding: 'utf8' });
  return { root, put, g, watch, tool, file: join(root, J) };
}
const r = (o) => ({ kind: 'fact', status: 'measured', claim: o });
try {
  const a = mk();
  expect('a clean checkout passes (first run)', a.watch(), 0);
  expect('an append through the tool passes', (a.tool([r('one')]), a.watch()), 0);
  const times = [];
  for (let k = 0; k < 5; k++) { const t0 = process.hrtime.bigint(); a.watch(); times.push(Number(process.hrtime.bigint() - t0) / 1e6); }
  times.sort((x, y) => x - y);
  console.log(`      fast path (nothing changed): median ${times[2].toFixed(0)} ms of 5 runs, node start included`);
  appendFileSync(a.file, '{"id":"r57-0199","kind":"fact","status":"measured","claim":"by hand"}\n');
  expect('an append by another route is reported (exit 2) with its id', a.watch(), 2, /outside node tools\/journal\.mjs[\s\S]*r57-0199/);
  expect('the same state is reported once only', a.watch(), 0);
  expect('the tool then refuses to append', { status: a.tool([r('after')]).status }, 1);
  const b = mk();
  b.tool([r('first'), r('second')]);
  writeFileSync(b.file, readFileSync(b.file, 'utf8').split('\n').filter((l) => !l.includes('"first"')).join('\n'));
  expect('a line the tool wrote, removed, is reported with its id', b.watch(), 2, /gone or changed \(r57-0104\)/);
  const c = mk();
  c.tool([r('moved')]);
  writeFileSync(c.file, readFileSync(c.file, 'utf8').replace('{"id":"r57-0104","kind":"fact"', '{"kind":"fact","id":"r57-0104"'));
  expect('a field moved by hand (same size) is reported', c.watch(), 2, /changed outside/);
  const d = mk();
  d.g('checkout', '-q', '-b', 'other');
  appendFileSync(d.file, '{"id":"r57-0105","kind":"fact","status":"measured","claim":"other branch"}\n');
  d.g('commit', '-q', '-a', '--no-verify', '-m', 'other');
  d.g('checkout', '-q', 'master');
  expect('after a branch switch back, files equal to HEAD pass', d.watch(), 0);
  d.g('checkout', '-q', 'other');
  expect('a branch switch to a branch with more journal lines passes', d.watch(), 0);
  d.put('library/journal/2026-11-24/t9.jsonl', '{"id":"t9-0100","kind":"fact","status":"measured","claim":"new file"}\n');
  expect('a journal file made by another route is reported', d.watch(), 2, /t9\.jsonl[\s\S]*t9-0100/);
  expect('another event passes', d.watch(JSON.stringify({ hook_event_name: 'PreToolUse', cwd: d.root })), 0);
  expect('an unreadable input passes', d.watch('not json'), 0);
} finally {
  try { rmSync(tmp, { recursive: true, force: true }); } catch {}
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
