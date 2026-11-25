// Tests of owner-guard.mjs (2026-11-25, brief docs/program/repo-organisation-2026-11-25/briefs/GUARD.md, ruling r58-0005).
// Run: node .claude/hooks/owner-guard.test.mjs   (another hook file: OWNER_GUARD_HOOK=owner-guard.next.mjs node ...)
// Each case makes a temporary repository (git init, branch bilal/build, one commit holding Eashah's files), copies the hook
// and this repository's OWNERS.json into it, feeds the hook a PreToolUse input on stdin as the app sends it and checks the
// exit code (0 pass, 2 refuse) and the message. Pull request authors come from OWNER_GUARD_PR_AUTHOR. Nothing in this
// repository is written.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const made = [];
after(() => { for (const d of made) rmSync(d, { recursive: true, force: true }); });
const env = { ...process.env, GIT_CONFIG_NOSYSTEM: '1' };
delete env.OWNER_GUARD_PR_AUTHOR;
// Her folder, put into the cases that call file functions in inline code by a ${...} the hook cannot resolve: the
// hook judges the source of a script that node runs (readScript), and the case text in this file's source must not read
// as a write by this file itself (the way selftest.mjs keeps its journal cases unresolvable).
const HER = 'work';
const PRS = JSON.stringify({ 3: 'eashah-uwu', 5: 'ghaaso', '': 'ghaaso' });

const git = (cwd, ...a) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'core.autocrlf=false', ...a], { cwd, encoding: 'utf8' });
// owners: the OWNERS.json text (default: this repository's); null: none
function fixture({ owners, head } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'owner-guard-'));
  made.push(dir);
  const r = join(dir, 'repo');
  mkdirSync(join(r, '.claude', 'hooks'), { recursive: true });
  copyFileSync(resolve(here, process.env.OWNER_GUARD_HOOK || 'owner-guard.mjs'), join(r, '.claude', 'hooks', 'owner-guard.mjs'));
  git(dir, 'init', '-q', '-b', 'bilal/build', 'repo');
  const files = { 'work/README.md': 'w\n', 'work/board/check.mjs': 'x\n', 'tools/run_checks.sh': 'echo\n', 'tools/journal.mjs': '// j\n',
    '.github/workflows/claude-files-check.yml': 'on: push\n', 'research-tree/build/NOTES.md': 'n\n', 'library/journal/2026-11-25/r58.jsonl': '{}\n' };
  for (const [f, t] of Object.entries(files)) { mkdirSync(dirname(join(r, f)), { recursive: true }); writeFileSync(join(r, f), t); }
  git(r, 'add', '-A'); git(r, 'commit', '-q', '-m', 'start');
  if (owners !== null) writeFileSync(join(r, 'OWNERS.json'), owners ?? readFileSync(join(repo, 'OWNERS.json'), 'utf8'));
  if (head) writeFileSync(join(r, '.git', 'HEAD'), `ref: refs/heads/${head}\n`);
  return { dir, r, hook: join(r, '.claude', 'hooks', 'owner-guard.mjs'), log: join(r, '.claude', 'logs', 'owner-guard.jsonl') };
}
function run(fx, tool, tool_input, { cwd = fx.r, e = env } = {}) {
  const input = typeof tool === 'string' && tool_input === undefined ? tool
    : JSON.stringify({ session_id: 'ccccdddd-1111', cwd, hook_event_name: 'PreToolUse', tool_name: tool, tool_input });
  const r = spawnSync(process.execPath, [fx.hook], { input, encoding: 'utf8', env: e, timeout: 30000 });
  return { code: r.status, err: r.stderr || '' };
}
const sh = (fx, command, o) => run(fx, 'Bash', { command }, o);
const ps = (fx, command, o) => run(fx, 'PowerShell', { command }, o);
const logLines = (fx) => (existsSync(fx.log) ? readFileSync(fx.log, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
function refused(r, rule, what) {
  assert.equal(r.code, 2, `expected a refusal of ${what}; stderr: ${r.err}`);
  assert.match(r.err, new RegExp(`^owner guard \\(r58-0005, rule ${rule}\\)`), what);
  assert.equal(r.err.trim().split('\n').length, 1, what);
}
const passes = (r, what) => assert.equal(r.code, 0, `expected ${what} to pass; stderr: ${r.err}`);

test('rule a: Write, Edit, MultiEdit, NotebookEdit on Eashah\'s paths are refused, naming her and r58-0005', () => {
  const fx = fixture();
  const w = run(fx, 'Write', { file_path: join(fx.r, 'work', 'new.md'), content: 'x' });
  refused(w, 'a', 'Write work/new.md');
  assert.match(w.err, /work\/new\.md, which is Eashah's \(OWNERS\.json: paths "work\/\*\*"\).*leave it.*tell the owner/);
  refused(run(fx, 'Edit', { file_path: join(fx.r, 'tools', 'run_checks.sh'), old_string: 'a', new_string: 'b' }), 'a', 'Edit tools/run_checks.sh');
  refused(run(fx, 'MultiEdit', { file_path: join(fx.r, '.github', 'workflows', 'claude-files-check.yml'), edits: [] }), 'a', 'MultiEdit the workflow');
  refused(run(fx, 'NotebookEdit', { notebook_path: join(fx.r, 'work', 'n.ipynb'), new_source: 'x' }), 'a', 'NotebookEdit work/n.ipynb');
  refused(run(fx, 'Write', { file_path: 'work/board/check.mjs', content: 'x' }), 'a', 'a relative path');
  refused(run(fx, 'Write', { file_path: join(fx.r, 'WORK', 'x.md'), content: 'x' }), 'a', 'another letter case');
  assert.equal(logLines(fx).filter((l) => l.decision === 'deny').length, 6);
});

test('rule a in a worktree: the path is judged from the worktree\'s root; OWNERS.json comes from the main checkout', () => {
  const fx = fixture();
  const wt = join(fx.r, '.claude', 'worktrees', 'wt1');
  mkdirSync(join(wt, 'work'), { recursive: true });
  refused(run(fx, 'Write', { file_path: join(wt, 'work', 'a.md'), content: 'x' }, { cwd: wt }), 'a', 'Write in a worktree');
  passes(run(fx, 'Write', { file_path: join(wt, 'research-tree', 'a.md'), content: 'x' }, { cwd: wt }), 'own path in a worktree');
});

test('passes: the file tools on this PC\'s own paths (everything not listed under Eashah)', () => {
  const fx = fixture();
  for (const f of ['research-tree/build/NOTES.md', 'research-tree/build/new.md', 'OWNERS.json', 'tools/other.mjs', 'worker/x.md', 'docs/work/x.md', '.github/other.yml']) {
    passes(run(fx, 'Write', { file_path: join(fx.r, f), content: 'x' }), `Write ${f}`);
    passes(run(fx, 'Edit', { file_path: join(fx.r, f), old_string: 'a', new_string: 'b' }), `Edit ${f}`);
  }
  passes(run(fx, 'Write', { file_path: join(fx.dir, 'outside', 'work', 'x.md'), content: 'x' }), 'a path outside every checkout');
});

test('rule b, Bash: redirection, rm, mv, cp onto, sed -i, tee, touch, git rm, git mv, git checkout --, git restore', () => {
  const fx = fixture();
  const cases = ['echo x > work/a.md', 'echo x >> work/README.md', 'rm work/README.md', 'rm -rf work', 'mv work/README.md old.md', 'mv notes.md work/',
    'cp a.md work/README.md', 'cp a.md tools/run_checks.sh', "sed -i 's/a/b/' tools/run_checks.sh", 'echo x | tee work/a.md', 'echo x | tee -a work/README.md',
    'touch work/new', 'git rm work/README.md', 'git mv work/README.md work2.md', 'git checkout -- work/README.md', 'git restore work/README.md',
    'git checkout HEAD~1 -- tools/run_checks.sh', 'cd work && rm README.md', 'rm -rf tools', 'rm work/*.md', 'find work -delete',
    `node -e "require('fs').writeFileSync('${HER}/x.md', 'x')"`, 'bash -c "rm -rf work"', 'git -C work rm README.md',
    `rm "${join(fx.r, 'work', 'README.md').replace(/\\/g, '/')}"`];
  for (const c of cases) refused(sh(fx, c), 'b', c);
  assert.match(sh(fx, 'rm -rf tools').err, /holds tools\/run_checks\.sh, Eashah's/);
});

test('rule b, PowerShell: Set-Content, Add-Content, Out-File, Remove-Item, Move-Item, Copy-Item, .NET calls, git restore', () => {
  const fx = fixture();
  const cases = ['Set-Content -Path work/a.md -Value x', 'Add-Content tools/run_checks.sh x', '"x" | Out-File work/a.md', 'Remove-Item work -Recurse -Force',
    'Move-Item work/README.md old.md', 'Copy-Item a.md -Destination work/README.md', 'New-Item work/n.md', `[IO.File]::WriteAllText("${HER}/a.md", "x")`,
    'git restore work/README.md', 'Rename-Item work/README.md R.md'];
  for (const c of cases) refused(ps(fx, c), 'b', c);
});

test('rule b: a whole-tree reset is refused only while Eashah\'s paths have local changes', () => {
  const fx = fixture();
  for (const c of ['git stash', 'git reset --hard', 'git checkout -f', 'git stash -u', 'git restore .']) passes(sh(fx, c), `${c} (her files clean)`);
  writeFileSync(join(fx.r, 'work', 'README.md'), 'changed\n');
  for (const c of ['git stash', 'git reset --hard', 'git checkout -f', 'git restore .']) {
    const r = sh(fx, c);
    refused(r, 'b', `${c} (her files changed)`);
    assert.match(r.err, /with local changes/);
  }
  passes(sh(fx, 'git stash -- research-tree'), 'a stash of own paths');
});

test('passes: commands that only read or name Eashah\'s paths', () => {
  const fx = fixture();
  for (const c of ['cat work/README.md', 'grep -r x work > out.txt', 'cp work/README.md notes.md', 'ls work tools', 'git diff -- work', 'git log -- work/README.md',
    'git show HEAD:work/README.md > /tmp/x.md', 'node -e "console.log(require(\'fs\').readFileSync(\'work/README.md\',\'utf8\'))"', 'wc -l tools/run_checks.sh']) passes(sh(fx, c), c);
  for (const c of ['Get-Content work/README.md', 'Get-ChildItem work', 'Copy-Item work/README.md notes.md']) passes(ps(fx, c), c);
});

test('rule c: a push to Eashah\'s branches (every form) is refused', () => {
  const fx = fixture();
  const cases = ['git push origin work/x', 'git push origin :work/x', 'git push origin --delete work/x', 'git push -d origin eashah/y',
    'git push origin +bilal/build:work/x', 'git push --force origin work/2026-11-20-board-checker-simple-split', 'git push -f origin HEAD:work/x',
    'git push --force-with-lease origin HEAD:eashah/y', 'git push --force-with-lease=work/x origin bilal/build', 'git push origin refs/heads/work/x',
    'git push origin bilal/build:refs/heads/eashah/z', 'git -C . push origin work/x', 'git push origin "$BRANCH"'];
  for (const c of cases) refused(sh(fx, c), 'c', c);
  assert.match(sh(fx, 'git push origin :work/x').err, /the branch work\/x, which is Eashah's \(OWNERS\.json: branches "work\/\*"\)/);
  for (const c of ['git push --mirror origin', 'git push --all origin', 'git push --prune origin bilal/build', 'git push origin :', "git push origin 'refs/heads/*:refs/heads/*'"]) refused(sh(fx, c), 'c', c);
  refused(ps(fx, 'git push origin --delete work/x'), 'c', 'PowerShell push --delete');
});

test('rule c: a local change of Eashah\'s branches is refused (branch -d/-D/-m/-M/-f/-C, checkout -B, switch -C, update-ref)', () => {
  const fx = fixture();
  const cases = ['git branch -d work/x', 'git branch -D work/x', 'git branch --delete eashah/y', 'git branch -m work/x mine', 'git branch -M mine work/x',
    'git branch -f work/x HEAD', 'git branch --force eashah/y', 'git branch -C bilal/build work/x', 'git branch -r -d origin/work/x',
    'git checkout -B work/x', 'git switch -C eashah/y', 'git update-ref refs/heads/work/x HEAD', 'git update-ref -d refs/heads/eashah/y',
    'git update-ref refs/remotes/origin/work/x HEAD'];
  for (const c of cases) refused(sh(fx, c), 'c', c);
  const fx2 = fixture({ head: 'work/x' });
  refused(sh(fx2, 'git branch -m mine'), 'c', 'renaming the current branch when it is hers');
});

test('rule d: a direct push to main is refused; a fetch into main passes', () => {
  const fx = fixture();
  for (const c of ['git push origin main', 'git push origin refs/heads/main', 'git push origin bilal/build:main', 'git push origin HEAD:refs/heads/main', 'git push -u origin main']) {
    const r = sh(fx, c);
    refused(r, 'd', c);
    assert.match(r.err, /main is shared and changes only by pull request.*Push to a bilal\/\.\.\. branch/);
  }
  refused(ps(fx, 'git push origin main'), 'd', 'PowerShell push to main');
  const fx2 = fixture({ head: 'main' });
  refused(sh(fx2, 'git push origin HEAD'), 'd', 'HEAD while on main');
  refused(sh(fx2, 'git push'), 'd', 'a bare push while on main');
  refused(sh(fx2, 'git push origin'), 'd', 'a push without a refspec while on main');
  for (const c of ['git fetch origin main:main', 'git fetch origin', 'git pull origin main', 'git merge origin/main', 'git checkout main']) passes(sh(fx, c), c);
});

test('rule d and c: the upstream of the current branch is judged for a bare push', () => {
  const fx = fixture();
  git(fx.r, 'config', 'branch.bilal/build.merge', 'refs/heads/main');
  refused(sh(fx, 'git push'), 'd', 'bilal/build tracking main');
  git(fx.r, 'config', 'branch.bilal/build.merge', 'refs/heads/work/x');
  refused(sh(fx, 'git push'), 'c', 'bilal/build tracking work/x');
  git(fx.r, 'config', 'branch.bilal/build.merge', 'refs/heads/bilal/build');
  passes(sh(fx, 'git push'), 'bilal/build tracking itself');
});

test('passes: own branches and tags, reading and fetching any branch', () => {
  const fx = fixture();
  const cases = ['git push origin bilal/build', 'git push -u origin bilal/feature-x', 'git push origin --tags', 'git push origin history/2026-11-25',
    'git push origin HEAD', 'git push', 'git push --force-with-lease origin bilal/build', 'git push origin --delete bilal/old', 'git push --dry-run origin main',
    'git branch -d bilal/old', 'git branch -D u/unit1', 'git branch -D build', 'git branch -m bilal/a bilal/b', 'git branch bilal/new', 'git branch work/copy-to-read',
    'git checkout -B bilal/x', 'git switch -C bilal/y', 'git update-ref refs/heads/bilal/x HEAD', 'git log origin/work/x', 'git diff main...origin/work/x',
    'git fetch origin work/x', 'git checkout work/x', 'git switch work/x', 'git show origin/work/x:work/README.md', 'git branch -a', 'git branch -u origin/work/x',
    'git status', 'git add -A', 'git commit -m "x"', 'git tag history/x'];
  for (const c of cases) passes(sh(fx, c), c);
});

test('rule e: gh pr merge|close|edit|reopen|ready on Eashah\'s pull request is refused; on his own it passes', () => {
  const fx = fixture();
  const e = { ...env, OWNER_GUARD_PR_AUTHOR: PRS };
  for (const s of ['merge 3 --squash', 'close 3', 'edit 3 --title x', 'reopen 3', 'ready 3', 'merge 3 -m', 'edit -m v1 3', 'merge --repo o/r 3']) {
    const r = sh(fx, `gh pr ${s}`, { e });
    refused(r, 'e', `gh pr ${s}`);
    assert.match(r.err, /opened by Eashah \(eashah-uwu\), not Bilal \(ghaaso\)/);
  }
  refused(ps(fx, 'gh pr merge 3', { e }), 'e', 'PowerShell gh pr merge');
  for (const s of ['merge 5 --squash', 'close 5', 'edit 5 --title x', 'ready 5', 'merge']) passes(sh(fx, `gh pr ${s}`, { e }), `gh pr ${s} (his own)`);
  const other = sh(fx, 'gh pr merge 7', { e: { ...env, OWNER_GUARD_PR_AUTHOR: 'someone-else' } });
  refused(other, 'e', 'a pull request of a third user');
  assert.match(other.err, /the GitHub user someone-else/);
});

test('rule e: when the author cannot be told, refused; gh pr create, view and list pass without a lookup', () => {
  const fx = fixture();
  const r = sh(fx, 'gh pr merge 9', { e: { ...env, OWNER_GUARD_PR_AUTHOR: PRS } });
  refused(r, 'e', 'no author for 9');
  assert.match(r.err, /cannot be told/);
  refused(sh(fx, 'gh pr close 9', { e: { ...env, OWNER_GUARD_PR_AUTHOR: '' } }), 'e', 'an empty answer');
  refused(sh(fx, 'gh pr merge "$N"', { e: { ...env, OWNER_GUARD_PR_AUTHOR: PRS } }), 'e', 'a number the guard cannot read');
  const none = { ...env, OWNER_GUARD_PR_AUTHOR: '' };
  for (const c of ['gh pr create --title x --body y', 'gh pr view 3', 'gh pr list', 'gh pr view 3 --json author', 'gh pr checks 3', 'gh pr diff 3', 'gh issue close 3']) passes(sh(fx, c, { e: none }), c);
});

test('fails open: no OWNERS.json in the checkout or the main checkout, or one that does not parse: passes and is logged', () => {
  for (const owners of [null, 'not json', '{"people": {}}']) {
    const fx = fixture({ owners });
    passes(sh(fx, 'rm -rf work && git push origin main'), `OWNERS.json ${owners}`);
    passes(run(fx, 'Write', { file_path: join(fx.r, 'work', 'a.md'), content: 'x' }), `Write with OWNERS.json ${owners}`);
    assert.match(logLines(fx).at(-1).note, /^OWNERS\.json unreadable \(fails open\)/);
  }
});

test('an error inside the guard: logged, the call passes; odd input passes at once', () => {
  const fx = fixture({ owners: JSON.stringify({ this_pc: 'bilal', people: { bilal: { github: 'ghaaso' }, eashah: { name: 'Eashah', paths: 5 } } }) });
  passes(sh(fx, 'rm -rf work'), 'a broken paths field');
  assert.match(logLines(fx).at(-1).note, /^guard error: TypeError/);
  const fx2 = fixture();
  for (const s of ['', 'not json', '[]', 'null']) passes(run(fx2, s), JSON.stringify(s));
  passes(run(fx2, JSON.stringify({ hook_event_name: 'PostToolUse', tool_name: 'Bash', cwd: fx2.r, tool_input: { command: 'rm -rf work' } })), 'PostToolUse');
  passes(run(fx2, 'Read', { file_path: join(fx2.r, 'work', 'README.md') }), 'Read');
  passes(run(fx2, 'AskUserQuestion', { questions: [{ question: 'which?' }] }), 'another tool');
});

test('this repository\'s ordinary calls pass: journal append, build notes, status, add, commit, push of bilal/build', () => {
  const fx = fixture();
  for (const c of ["node tools/journal.mjs --append '{\"kind\":\"fact\"}'", 'echo x >> research-tree/build/NOTES.md', 'git add research-tree OWNERS.json',
    'git commit -F msg.txt', 'git push origin bilal/build', 'git fetch origin && git status']) passes(sh(fx, c), c);
});
