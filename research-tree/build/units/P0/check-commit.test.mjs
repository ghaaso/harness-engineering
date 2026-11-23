// Tests of tools/check-commit.mjs and tools/git-hooks/pre-commit through real `git commit` calls (unit P0, 2026-11-19;
// research-tree/build/check/A-hooks.md rows 8, 9 and 13; unit FIX-GUARD added the cases marked F1, CA, CB and CC:
// finding 1 and mutants CA-CC of research-tree/build/refute/P0-GATE.md). Run: node research-tree/build/units/P0/check-commit.test.mjs
//   [--check <check-commit.mjs>] [--hook <pre-commit>]   (defaults: this repository's copies; pass old copies to compare)
// It builds a throwaway repository in a temporary folder: a first commit without tools/ or migration/ (like the old base
// 48660877), a second commit that adds them, core.hooksPath set to the absolute path of its tools/git-hooks, and a
// worktree cut from the first commit. Nothing in this repository is touched; the folder is removed at the end.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, appendFileSync, copyFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? resolve(process.argv[i + 1]) : d; };
const check = arg('--check', join(repo, 'tools', 'check-commit.mjs'));
const hook = arg('--hook', join(repo, 'tools', 'git-hooks', 'pre-commit'));
const ID = ['-c', 'user.name=p0-test', '-c', 'user.email=p0-test@example.invalid'];
let pass = 0, fail = 0;
function expect(name, r, ok, re, notRe) {
  const out = (r.stdout || '') + (r.stderr || '');
  const good = (ok ? r.status === 0 : r.status !== 0) && (!re || re.test(out)) && (!notRe || !notRe.test(out));
  good ? pass++ : fail++;
  console.log(`${good ? 'pass' : 'FAIL'}  ${name}${good ? '' : `  (exit ${r.status}; ${out.replace(/\s+/g, ' ').slice(0, 200)})`}`);
}
const tmp = mkdtempSync(join(tmpdir(), 'p0-commit-test-'));
try {
  const main = join(tmp, 'main'), wt = join(tmp, 'wt-old-base');
  const g = (cwd, ...a) => execFileSync('git', [...ID, ...a], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const commit = (cwd, msg) => spawnSync('git', [...ID, 'commit', '-q', '-m', msg], { cwd, encoding: 'utf8' });
  const put = (root, rel, text) => { mkdirSync(dirname(join(root, rel)), { recursive: true }); writeFileSync(join(root, rel), text); };
  const J = 'library/journal/2026-11-19/r57.jsonl';
  const rec = (id) => JSON.stringify({ id, kind: 'fact', status: 'measured', claim: 'test record' }) + '\n';
  mkdirSync(main);
  g(main, 'init', '-q');
  put(main, 'recovered/a.txt', 'a\n'); put(main, 'docs/program/evidence/x.md', 'x\n'); put(main, J, rec('r57-0001')); put(main, 'notes.md', 'n\n');
  const EV = 'docs/program/evidence/unlisted.md'; // in no manifest (F1)
  put(main, EV, 'u\n');
  g(main, 'add', '-A'); g(main, 'commit', '-q', '--no-verify', '-m', 'base without tools or manifests');
  const base = g(main, 'rev-parse', 'HEAD').trim();
  put(main, 'tools/check-commit.mjs', ''); copyFileSync(check, join(main, 'tools', 'check-commit.mjs'));
  for (const f of ['journal-rules.mjs', 'journal.mjs']) { try { copyFileSync(join(dirname(check), f), join(main, 'tools', f)); } catch {} } // version 3 (T8-JOURNAL)
  put(main, 'tools/git-hooks/pre-commit', ''); copyFileSync(hook, join(main, 'tools', 'git-hooks', 'pre-commit'));
  try { chmodSync(join(main, 'tools', 'git-hooks', 'pre-commit'), 0o755); } catch {}
  put(main, 'migration/source-manifest.json', JSON.stringify([{ path: 'docs/program/evidence/x.md' }]));
  put(main, 'migration/clinic-manifest.json', JSON.stringify({ files: [] }));
  g(main, 'add', '-A'); g(main, 'commit', '-q', '--no-verify', '-m', 'tools and manifests');
  g(main, 'config', 'core.hooksPath', join(main, 'tools', 'git-hooks'));
  g(main, 'worktree', 'add', '-q', '--detach', wt, base);

  // main checkout
  put(main, 'recovered/a.txt', 'changed\n'); g(main, 'add', '-A');
  expect('main: a change of archived evidence is refused by the check', commit(main, 'x'), false, /archived evidence/);
  g(main, 'reset', '-q', '--hard');
  writeFileSync(join(main, 'migration', 'source-manifest.json'), '[{ not json');
  put(main, 'notes-new.md', 'n\n'); g(main, 'add', 'notes-new.md');
  expect('A13 main: with an unreadable manifest the commit is refused (fails closed)', commit(main, 'x'), false, /cannot be read/);
  g(main, 'reset', '-q', '--hard'); g(main, 'clean', '-qfd');
  put(main, 'notes-new.md', 'n\n'); g(main, 'add', 'notes-new.md');
  expect('main: an ordinary new file commits', commit(main, 'new note'), true);

  // FIX-GUARD: each refused case is set back to the commit before it, also when a wrong check lets it through
  const refused = (cwd, name, prep, re) => { const head = g(cwd, 'rev-parse', 'HEAD').trim(); prep(); expect(name, commit(cwd, 'x'), false, re); g(cwd, 'reset', '-q', '--hard', head); };
  refused(main, 'F1 main: a change of a committed file under docs/program/evidence/ in no manifest is refused', () => { put(main, EV, 'changed\n'); g(main, 'add', '-A'); }, /archived evidence/);
  refused(main, 'F1 main: its deletion is refused', () => g(main, 'rm', '-q', EV), /archived evidence/);
  refused(main, 'F1 main: its rename is refused', () => g(main, 'mv', EV, 'docs/program/evidence/renamed.md'), /archived evidence/);
  put(main, 'docs/program/evidence/new-run/state.md', 's\n'); g(main, 'add', '-A');
  expect('F1 main: a new file under docs/program/evidence/ commits', commit(main, 'new evidence'), true);
  refused(main, 'CA main: an added record whose id is already used is refused', () => { appendFileSync(join(main, J), rec('r57-0001')); g(main, 'add', '-A'); }, /used more than once/);
  refused(main, 'CC main: an added line that is not JSON is refused', () => { appendFileSync(join(main, J), 'not json\n'); g(main, 'add', '-A'); }, /not one JSON object/);
  refused(main, 'CB main: deleting a journal file is refused', () => g(main, 'rm', '-q', J), /never deleted or renamed/);
  refused(main, 'CB main: renaming a journal file (same writer, another day) is refused', () => {
    mkdirSync(join(main, 'library', 'journal', '2026-11-20'), { recursive: true }); g(main, 'mv', J, 'library/journal/2026-11-20/r57.jsonl');
  }, /never deleted or renamed/);
  refused(main, 'T8 main: a valid record appended by hand, not through tools/journal.mjs, is refused', () => { appendFileSync(join(main, J), rec('r57-0003')); g(main, 'add', '-A'); }, /not written by node tools.journal.mjs/);
  spawnSync('node', [join(main, 'tools', 'journal.mjs'), '--append', '--date', '2026-11-19', '--prefix', 'r57'], { cwd: main, input: JSON.stringify({ kind: 'fact', status: 'measured', claim: 'test record' }), encoding: 'utf8' }); g(main, 'add', '-A');
  expect('main: a valid journal record appended through tools/journal.mjs commits', commit(main, 'append'), true);

  // worktree cut from the base, which has no tools/ and no migration/
  put(wt, 'recovered/a.txt', 'changed\n'); g(wt, 'add', '-A');
  expect('A9 worktree at an old base: a change of archived evidence is refused by the check, not by a crash', commit(wt, 'x'), false, /archived evidence/, /MODULE_NOT_FOUND|Cannot find module/);
  g(wt, 'reset', '-q', '--hard');
  put(wt, 'docs/program/evidence/x.md', 'changed\n'); g(wt, 'add', '-A');
  expect('A9 worktree with no manifests: a manifest-listed file is refused through the main checkout\'s manifest', commit(wt, 'x'), false, /archived evidence/, /MODULE_NOT_FOUND|Cannot find module/);
  g(wt, 'reset', '-q', '--hard');
  put(wt, J, rec('r57-0009')); g(wt, 'add', '-A');
  expect('A9 worktree: a changed journal line is refused', commit(wt, 'x'), false, /only added to/, /MODULE_NOT_FOUND|Cannot find module/);
  g(wt, 'reset', '-q', '--hard');
  spawnSync('node', [join(main, 'tools', 'journal.mjs'), '--append', '--date', '2026-11-19', '--prefix', 'r57'], { cwd: wt, input: JSON.stringify({ kind: 'fact', status: 'measured', claim: 'test record' }), encoding: 'utf8' }); g(wt, 'add', '-A');
  expect('A9 worktree: a valid journal record appended through tools/journal.mjs commits', commit(wt, 'append'), true);
  put(wt, 'notes2.md', 'n\n'); g(wt, 'add', '-A');
  expect('A9 worktree: an ordinary new file commits', commit(wt, 'new note'), true);
  refused(wt, 'F1 worktree at an old base: a change of a committed file under docs/program/evidence/ is refused (its own HEAD)', () => { put(wt, EV, 'changed\n'); g(wt, 'add', '-A'); }, /archived evidence/);
  put(wt, 'docs/program/evidence/new-run/state.md', 's\n'); g(wt, 'add', '-A');
  expect('F1 worktree: a file only the main checkout committed is new here and commits', commit(wt, 'new evidence in the worktree'), true);
} finally {
  try { rmSync(tmp, { recursive: true, force: true }); } catch {}
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
