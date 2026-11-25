// Self-test of the hooks in this folder (2026-11-19). Run: node .claude/hooks/selftest.mjs [--guard <file in this folder>]
// Feeds each hook a made-up input on stdin and checks its exit code (0 allow, 2 refuse) and output.
// It writes nothing in the repository except the hooks' own log lines in .claude/logs (ignored by git). The cases
// marked A4, A7, A11 and A13 (research-tree/build/check/A-hooks.md rows 4, 7, 11, 13; unit P0) run a copy of the
// record guard in a made-up repository with worktrees in a temporary folder, which is removed at the end. The cases
// marked F1-F5, GA and GB (unit FIX-GUARD) test findings 1-4 and non-breaking item 8 of
// research-tree/build/refute/P0-GATE.md, and its mutants GA and GB (invariants no case guarded before).
// The cases marked T8 (unit T8-JOURNAL, 2026-11-24, r57-0056) test version 3: every write under library/journal/ other
// than through node tools/journal.mjs is refused, appends included; nine cases that expected an append to pass now expect
// a refusal (each fails on version 2).
// --guard names the record guard to test (default record-guard.mjs), so the same cases can be run on an old copy.
import { spawnSync, execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, appendFileSync, copyFileSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { tmpdir, hostname } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const gi = process.argv.indexOf('--guard');
const guard = gi > 0 ? process.argv[gi + 1] : 'record-guard.mjs';
const run = (hook, input) => spawnSync('node', [resolve(here, hook)], { input: JSON.stringify(input), encoding: 'utf8' });
let pass = 0, fail = 0, skip = 0;
function expect(name, r, code, re) {
  const ok = r.status === code && (!re || re.test(r.stdout + r.stderr));
  ok ? pass++ : fail++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${ok ? '' : `  (exit ${r.status}; ${(r.stderr || r.stdout).slice(0, 160)})`}`);
}
const pre = (tool_name, tool_input) => ({ hook_event_name: 'PreToolUse', session_id: 'selftest', cwd: repo, tool_name, tool_input });

// a real journal file and its last line
const jdir = resolve(repo, 'library', 'journal', '2026-11-19');
const jfile = resolve(jdir, readdirSync(jdir).find((f) => f.startsWith('r57')));
const jtext = readFileSync(jfile, 'utf8');
const lines = jtext.split('\n').filter(Boolean);
const lastLine = lines[lines.length - 1];
const archivedFile = JSON.parse(readFileSync(resolve(repo, 'migration', 'source-manifest.json'), 'utf8'))[0].path;

// record guard
expect('question without a kind is refused', run(guard, pre('AskUserQuestion', { questions: [{ question: 'Which batch size should we use?' }] })), 2, /r57-0001/);
expect('approve: question passes', run(guard, pre('AskUserQuestion', { questions: [{ question: 'approve: may I run the suite once (596 s)?' }] })), 0);
expect('one bad question among good ones is refused', run(guard, pre('AskUserQuestion', { questions: [{ question: 'cap: 2 million tokens?' }, { question: 'Should the reserve be 10 %?' }] })), 2);
expect('fact: question passes', run(guard, pre('AskUserQuestion', { questions: [{ question: 'fact: what reset time does Settings show?' }] })), 0);
expect('edit of archived evidence is refused', run(guard, pre('Edit', { file_path: resolve(repo, archivedFile), old_string: 'a', new_string: 'b' })), 2, /archived/);
expect('write over archived evidence is refused', run(guard, pre('Write', { file_path: resolve(repo, archivedFile), content: 'x' })), 2, /archived/);
expect('a new file under evidence passes', run(guard, pre('Write', { file_path: resolve(repo, 'docs/program/evidence/selftest-new-file.md'), content: 'x' })), 0);
expect('T8 a journal Write that appends is refused (only through tools/journal.mjs)', run(guard, pre('Write', { file_path: jfile, content: jtext + '{"id":"r57-9999"}\n' })), 2, /tools\/journal\.mjs/);
expect('a journal Write that drops a line is refused', run(guard, pre('Write', { file_path: jfile, content: lines.slice(1).join('\n') + '\n' })), 2, /only added to/);
expect('T8 a journal Edit that appends at the end is refused', run(guard, pre('Edit', { file_path: jfile, old_string: lastLine, new_string: lastLine + '\n{"id":"r57-9999"}' })), 2, /tools\/journal\.mjs/);
expect('T8 reading the journal with lookup.sh passes', run(guard, pre('Bash', { command: 'bash library/lookup.sh -f r57-0056 | cut -c1-80' })), 0);
expect('T8 running the hooks\' self-test passes', run(guard, pre('Bash', { command: 'node .claude/hooks/selftest.mjs' })), 0);
expect('T8 the journal tool passes, its records naming the journal', run(guard, pre('Bash', { command: "node tools/journal.mjs --append <<'EOF'\n{\"kind\":\"fact\",\"claim\":\"x\",\"evidence\":[\"library/journal/2026-11-23/t7.jsonl\"]}\nEOF" })), 0);
expect('T8 the journal tool by its absolute path passes', run(guard, pre('PowerShell', { command: `node "${resolve(repo, 'tools', 'journal.mjs')}" --check` })), 0);
expect('a journal Edit inside a line is refused', run(guard, pre('Edit', { file_path: jfile, old_string: lines[0].slice(0, 40), new_string: lines[0].slice(0, 40) + 'X' })), 2, /only added to/);
expect('an ordinary edit passes', run(guard, pre('Edit', { file_path: resolve(repo, 'CLAUDE.md'), old_string: 'a', new_string: 'b' })), 0);
expect('a path outside the repository passes', run(guard, pre('Write', { file_path: 'C:/Windows/Temp/x.txt', content: 'x' })), 0);
expect('other tools pass', run(guard, pre('Bash', { command: 'ls' })), 0);
expect('unreadable input passes', spawnSync('node', [resolve(here, guard)], { input: 'not json', encoding: 'utf8' }), 0);
expect('A7 edit of recovered/ in this repository through the \\\\?\\ form is refused',run(guard, pre('Edit', { file_path: '\\\\?\\' + resolve(repo, 'recovered', 'co_count.js'), old_string: 'a', new_string: 'b' })), 2, /archived/);
expect('F1 an Edit of committed evidence that no manifest lists (COORDINATOR-REPORT.md, named by CLAUDE.md) is refused', run(guard, pre('Edit', { file_path: resolve(repo, 'docs/program/evidence/harness-bottlenecks/graph2/embeddings/COORDINATOR-REPORT.md'), old_string: 'a', new_string: 'b' })), 2, /archived/);

// tier hook, the folder check added for r57-0026
expect('session in a folder with no hook is refused', run('tier-hook.mjs', pre('mcp__ccd_session__start_session', { title: 'read: x', model: 'sonnet', cwd: 'C:/Windows/Temp' })), 2, /r57-0026/);
expect('session in the library folder passes', run('tier-hook.mjs', pre('mcp__ccd_session__start_session', { title: 'read: x', model: 'sonnet', cwd: resolve(repo, 'library') })), 0);
expect('session with no cwd passes', run('tier-hook.mjs', pre('mcp__ccd_session__start_session', { title: 'read: x', model: 'sonnet' })), 0);
expect('helper on the wrong model is still refused', run('tier-hook.mjs', pre('Agent', { description: 'refute: x', model: 'sonnet' })), 2);
expect('helper on the right model still passes', run('tier-hook.mjs', pre('Agent', { description: 'read: x', model: 'sonnet' })), 0);

// library start
for (const source of ['startup', 'compact']) {
  const r = run('library-start.mjs', { hook_event_name: 'SessionStart', session_id: 'selftest', source });
  let ctx = '';
  try { ctx = JSON.parse(r.stdout).hookSpecificOutput.additionalContext; } catch {}
  expect(`start hook (${source}) gives the table and the next task`, { status: r.status, stdout: ctx, stderr: '' }, 0, /look this up[\s\S]*r57-0001[\s\S]*Next open task/);
  if (source === 'compact') expect('start hook after compaction says so', { status: 0, stdout: ctx, stderr: '' }, 0, /just compacted/);
  console.log(`      (${ctx.length} characters)`);
}

// A13 (b): every hook script the settings name exists (a moved or renamed folder turns hooks off silently)
const matchers = [];
for (const f of [resolve(repo, '.claude', 'settings.json'), resolve(repo, 'library', '.claude', 'settings.json')]) {
  let s = {};
  try { s = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { expect(`A13 ${f} reads as JSON`, { status: 1, stdout: '', stderr: String(e.message) }, 0); continue; }
  const missing = [];
  for (const entries of Object.values(s.hooks || {})) for (const e of entries) for (const h of e.hooks || []) {
    const m = /node\s+"([^"]+)"/.exec(h.command || '');
    if (m && !existsSync(m[1])) missing.push(m[1]);
    if (/record-guard\.mjs/.test(h.command || '')) matchers.push(e.matcher || '');
  }
  expect(`A13 every hook script named in ${f.slice(repo.length + 1)} exists`, { status: missing.length ? 1 : 0, stdout: missing.join(', '), stderr: '' }, 0);
}
for (const t of ['MultiEdit', 'Bash', 'PowerShell']) {
  if (!matchers.some((m) => m.split('|').includes(t))) console.log(`note  the record guard is not registered for ${t} in the settings yet (research-tree/build/units/P0/result.md gives the entry)`);
}

// ---- made-up repository with worktrees: rows 4, 7, 11 and 13 of A-hooks.md ----
const tmp = mkdtempSync(join(tmpdir(), 'p0-selftest-'));
try {
  const fake = join(tmp, 'p0-selftest-repository');
  const J = 'library/journal/2026-11-19/r57.jsonl';
  const FILES = {
    'recovered/a.js': 'a\n', 'docs/program/evidence/x.md': 'x\n', 'case-studies/clinic/a.py': 'a\n',
    [J]: '{"id":"r57-0001"}\n{"id":"r57-0002"}\n', 'notes.md': 'n\n',
    'docs/program/evidence/unlisted.md': 'u\n', 'docs/program/evidence/run1/state.md': 's\n', // committed, in no manifest (F1)
  };
  const tree = (root) => { for (const [p, t] of Object.entries(FILES)) { mkdirSync(dirname(join(root, p)), { recursive: true }); writeFileSync(join(root, p), t); } };
  const mkRepo = (root, manifestsReadable) => {
    tree(root);
    mkdirSync(join(root, '.claude', 'hooks'), { recursive: true });
    copyFileSync(resolve(here, guard), join(root, '.claude', 'hooks', 'record-guard.mjs'));
    mkdirSync(join(root, 'migration'), { recursive: true });
    writeFileSync(join(root, 'migration', 'source-manifest.json'), manifestsReadable ? JSON.stringify([{ path: 'docs/program/evidence/x.md' }]) : '[{ not json');
    writeFileSync(join(root, 'migration', 'clinic-manifest.json'), JSON.stringify({ files: [{ path: 'case-studies/clinic/a.py' }] }));
    const git = (...a) => execFileSync('git', ['-c', 'user.name=selftest', '-c', 'user.email=selftest@example.invalid', '-c', 'core.hooksPath=', ...a], { cwd: root, stdio: 'ignore' });
    git('init', '-q'); git('add', '-A'); git('commit', '-q', '--no-verify', '-m', 'fixture');
  };
  mkRepo(fake, true);
  appendFileSync(join(fake, ...J.split('/')), '{"id":"r57-0003"}\n'); // a journal line not yet committed
  const worktree =(dir, gitdir) => { tree(dir); if (gitdir) writeFileSync(join(dir, '.git'), `gitdir: ${gitdir}\n`); return dir; };
  const wtIn = worktree(join(fake, '.claude', 'worktrees', 'u1'), join(fake, '.git', 'worktrees', 'u1').replace(/\\/g, '/'));
  const wtBroken = worktree(join(fake, '.claude', 'worktrees', 'u3'), null);
  const wtOut = worktree(join(tmp, 'elsewhere', 'u2'), join(fake, '.git', 'worktrees', 'u2'));
  const copy = worktree(join(tmp, 'plain-copy'), null);
  const other = worktree(join(tmp, 'other-repo-wt'), join(tmp, 'another-repo', '.git', 'worktrees', 'z'));
  const broken = join(tmp, 'unreadable-manifest-repo');
  mkRepo(broken, false);
  const at = (rel, root = fake) => join(root, ...rel.split('/'));
  const G = (root) => (tool_name, tool_input, cwd = root, timeout = 60000) => spawnSync('node', [join(root, '.claude', 'hooks', 'record-guard.mjs')],
    { input: JSON.stringify({ hook_event_name: 'PreToolUse', session_id: 'selftest', cwd, tool_name, tool_input }), encoding: 'utf8', timeout });
  const F = G(fake), B = G(broken);
  const edit = (p) => ({ file_path: p, old_string: 'a', new_string: 'b' });

  // A4: worktrees of this repository, inside .claude/worktrees/ and outside it
  expect('A4 edit of archived evidence in a worktree under .claude/worktrees/ is refused', F('Edit', edit(at('recovered/a.js', wtIn))), 2, /archived/);
  expect('A4 edit in a folder under .claude/worktrees/ with no .git file is refused', F('Edit', edit(at('recovered/a.js', wtBroken))), 2, /archived/);
  expect('A4 write over a manifest-listed file in a worktree outside the repository is refused', F('Write', { file_path: at('docs/program/evidence/x.md', wtOut), content: 'y' }), 2, /archived/);
  expect('A4 edit of a clinic-manifest file in a worktree outside the repository is refused', F('Edit', edit(at('case-studies/clinic/a.py', wtOut))), 2, /clinic-manifest/);
  expect('A4 a journal Write that drops a line in a worktree is refused', F('Write', { file_path: at(J, wtOut), content: '{"id":"r57-0002"}\n' }), 2, /only added to/);
  expect('A4 a journal Edit inside a line in a worktree is refused', F('Edit', { file_path: at(J, wtIn), old_string: '0001', new_string: '0009' }), 2, /only added to/);
  expect('T8 A4 a journal append in a worktree is refused', F('Write', { file_path: at(J, wtIn), content: FILES[J] + '{"id":"r57-0003"}\n' }), 2, /tools\/journal\.mjs/);
  expect('A4 an ordinary edit in a worktree passes', F('Edit', edit(at('notes.md', wtOut))), 0);
  expect('A4 a new file in a worktree passes', F('Write', { file_path: at('recovered/new.js', wtOut), content: 'x' }), 0);
  expect('A4 a copy that is no worktree passes', F('Edit', edit(at('recovered/a.js', copy))), 0);
  expect('A4 a worktree of another repository passes', F('Edit', edit(at('recovered/a.js', other))), 0);

  // A7: path forms
  const ra = at('recovered/a.js');
  const msys = '/' + ra[0].toLowerCase() + ra.slice(2).replace(/\\/g, '/');
  for (const [label, p] of [['\\\\?\\ prefix', '\\\\?\\' + ra], ['//?/ prefix', '//?/' + ra.replace(/\\/g, '/')], ['Git Bash /c/ form', msys],
    ['trailing dot', ra + '.'], ['trailing space', ra + ' '], ['NTFS stream :x', ra + ':x'], ['NTFS stream ::$DATA', ra + '::$DATA'],
    ['lower case and .. segments', at('docs/../recovered/A.JS').toLowerCase()], ['relative path, cwd the repository', 'recovered/a.js']]) {
    expect(`A7 edit of archived evidence by ${label} is refused`, F('Edit', edit(p)), 2, /archived/);
  }
  let short = '';
  try { short = execFileSync('cmd.exe', ['/d', '/s', '/c', `for %I in ("${ra}") do @echo %~sI`], { encoding: 'utf8', windowsVerbatimArguments: true }).trim(); } catch {}
  if (short && short.toLowerCase() !== ra.toLowerCase()) expect(`A7 edit of archived evidence by its 8.3 short name is refused (${short.slice(-40)})`, F('Edit', edit(short)), 2, /archived/);
  else { skip++; console.log('skip  A7 8.3 short name: this volume made no short name for the test folder'); }
  let junction = null;
  try { junction = join(tmp, 'link-to-recovered'); symlinkSync(join(fake, 'recovered'), junction, 'junction'); } catch { junction = null; }
  if (junction) expect('A7 edit of archived evidence through a junction from outside is refused', F('Edit', edit(join(junction, 'a.js'))), 2, /archived/);
  else { skip++; console.log('skip  A7 junction: could not make one'); }

  // A11: MultiEdit
  expect('A11 MultiEdit of archived evidence is refused', F('MultiEdit', { file_path: ra, edits: [{ old_string: 'a', new_string: 'b' }] }), 2, /archived/);
  expect('T8 A11 MultiEdit appending to a journal is refused', F('MultiEdit', { file_path: at(J), edits: [{ old_string: '{"id":"r57-0003"}', new_string: '{"id":"r57-0003"}\n{"id":"r57-0004"}' }] }), 2, /tools\/journal\.mjs/);
  expect('A11 MultiEdit changing a journal line is refused', F('MultiEdit', { file_path: at(J), edits: [{ old_string: '{"id":"r57-0003"}', new_string: '{"id":"r57-0003"}\n{"id":"r57-0004"}' }, { old_string: 'r57-0001', new_string: 'r57-0009' }] }), 2, /only added to/);

  // A11: writes made through Bash and PowerShell (cwd: the made-up repository)
  const bashRefused = [
    'echo x > recovered/a.js', 'echo x >recovered/a.js', 'printf x 1> docs/program/evidence/x.md', "sed -i 's/a/b/' recovered/a.js",
    "sed -i.bak -e 's/a/b/' docs/program/evidence/x.md", 'rm -rf recovered', 'rm docs/program/evidence/*.md', 'mv recovered/a.js recovered/b.js',
    'cp notes.md recovered/a.js', 'cat notes.md | tee docs/program/evidence/x.md', 'truncate -s 0 case-studies/clinic/a.py',
    "echo '{}' > " + J, "sed -i '1d' " + J, 'git checkout HEAD~1 -- recovered/a.js', 'git rm recovered/a.js', 'cd recovered && rm a.js',
    `git -C "${wtOut.replace(/\\/g, '/')}" rm docs/program/evidence/x.md`, `cd "${wtIn.replace(/\\/g, '/')}" && echo x > recovered/a.js`,
    `echo x > ${msys}`, 'S=recovered; rm $S/a.js', `node -e "require('fs').writeFileSync('recovered/a.js','x')"`,
    `python -c "open('docs/program/evidence/x.md','w').write('x')"`, "cat > recovered/a.js <<'EOF'\nx\nEOF",
    "git ls-files recovered | xargs sed -i 's/a/b/'", "find recovered -name '*.js' -delete", "bash -c 'rm recovered/a.js'",
    "perl -pi -e 's/a/b/' recovered/a.js", 'dd if=/dev/zero of=recovered/a.js count=1', "node <<'EOF'\nrequire('fs').unlinkSync('recovered/a.js')\nEOF",
    'cmd //c "del recovered\\a.js"', `git checkout -- ${J}`, 'git reset --hard', 'git checkout -- .',
  ];
  for (const c of bashRefused) expect(`A11 Bash refused: ${c.replace(/\n/g, '\\n').slice(0, 70)}`, F('Bash', { command: c }), 2, /record guard/);
  const bashPassed = [
    'grep -rn a recovered/ 2>/dev/null | head -5', 'cat recovered/a.js > notes2.md', 'cp recovered/a.js "$TEMP/x.js"', 'cp notes.md recovered/',
    'ls recovered; wc -l recovered/a.js', "sed -n '1p' recovered/a.js",
    'git diff -- recovered/a.js; git log --oneline -1 -- recovered', 'git checkout -- recovered/a.js', 'git restore --staged recovered/a.js',
    "cat > newfile.md <<'EOF'\nrm -rf recovered\nsed -i x recovered/a.js > recovered/a.js\nEOF",
    `node -e "console.log(require('fs').readFileSync('recovered/a.js','utf8'))"`,
    `node -e "const s=require('fs').readFileSync('recovered/a.js','utf8'); require('fs').writeFileSync('out.txt', s)"`,
    'rm -rf .claude/worktrees/u1', 'git commit -m "rm recovered/a.js"', 'echo "> recovered/a.js"', 'rm -f notes2.md', 'git status --short 2>&1',
  ];
  for (const c of bashPassed) expect(`A11 Bash passes: ${c.replace(/\n/g, '\\n').slice(0, 70)}`, F('Bash', { command: c }), 0);
  const psRefused = [
    'Set-Content -Path recovered\\a.js -Value x', 'Remove-Item recovered -Recurse -Force', 'Get-ChildItem recovered | Remove-Item',
    "'x' | Out-File docs\\program\\evidence\\x.md", 'Copy-Item notes.md recovered\\a.js', 'Move-Item recovered\\a.js $env:TEMP',
    "[IO.File]::WriteAllText('recovered\\a.js', 'x')", "Set-Content library\\journal\\2026-11-19\\r57.jsonl '{}'", 'Clear-Content recovered\\a.js',
    'Rename-Item recovered\\a.js b.js', 'cmd /c del recovered\\a.js',
  ];
  for (const c of psRefused) expect(`A11 PowerShell refused: ${c.slice(0, 70)}`, F('PowerShell', { command: c }), 2, /record guard/);
  const psPassed = [
    'Get-Content recovered\\a.js | Select-Object -First 3',
    'Copy-Item recovered\\a.js $env:TEMP\\x.js', 'Remove-Item recovered -Recurse -WhatIf', 'Set-Content -Path notes3.md -Value x',
  ];
  for (const c of psPassed) expect(`A11 PowerShell passes: ${c.slice(0, 70)}`, F('PowerShell', { command: c }), 0);

  // A13 (a): a manifest that cannot be read fails closed
  expect('A13 with an unreadable manifest, an edit of an existing file is refused', B('Edit', edit(at('notes.md', broken))), 2, /fails closed/);
  expect('A13 with an unreadable manifest, a write over an existing file through Bash is refused', B('Bash', { command: 'echo x > notes.md' }), 2, /fails closed/);
  expect('A13 with an unreadable manifest, a new file passes', B('Write', { file_path: at('brand-new.md', broken), content: 'x' }), 0);
  expect('A13 with an unreadable manifest, recovered/ is still refused', B('Edit', edit(at('recovered/a.js', broken))), 2, /archived/);
  expect('A11 restoring a journal file with no new lines from git passes', B('Bash', { command: `git checkout -- ${J}` }), 0);

  // ---- FIX-GUARD: findings 1-4 and item 8 of research-tree/build/refute/P0-GATE.md; mutants GA and GB ----
  // F1: a file under docs/program/evidence/ that the checkout's own HEAD holds is archived evidence; an uncommitted one is new work
  const gitIn = (cwd, ...a) => execFileSync('git', ['-c', 'user.name=selftest', '-c', 'user.email=selftest@example.invalid', '-c', 'core.hooksPath=', ...a], { cwd, stdio: 'ignore' });
  const realWt = join(tmp, 'real-worktree'), inWt = (rel) => join(realWt, ...rel.split('/'));
  gitIn(fake, 'worktree', 'add', '-q', '--detach', realWt, 'HEAD');
  writeFileSync(inWt('docs/program/evidence/wt-only.md'), 'w\n'); gitIn(realWt, 'add', '-A'); gitIn(realWt, 'commit', '-q', '--no-verify', '-m', 'only in the worktree');
  writeFileSync(at('docs/program/evidence/main-only.md'), 'm\n'); gitIn(fake, 'add', '--', 'docs/program/evidence/main-only.md'); gitIn(fake, 'commit', '-q', '--no-verify', '-m', 'only in main');
  writeFileSync(at('docs/program/evidence/wt-only.md'), 'w\n'); writeFileSync(inWt('docs/program/evidence/main-only.md'), 'm\n'); // the other's file, uncommitted here
  writeFileSync(at('docs/program/evidence/untracked.md'), 'u\n');
  const ev = 'docs/program/evidence/unlisted.md';
  expect('F1 an Edit of a committed file under docs/program/evidence/ in no manifest is refused', F('Edit', edit(at(ev))), 2, /archived evidence \(committed under docs\/program\/evidence/);
  expect('F1 a Write over it is refused', F('Write', { file_path: at(ev), content: 'y' }), 2, /archived/);
  expect('F1 a MultiEdit of it is refused', F('MultiEdit', { file_path: at(ev), edits: [{ old_string: 'u', new_string: 'v' }] }), 2, /archived/);
  for (const c of [`echo y > ${ev}`, `sed -i 's/u/v/' ${ev}`, `rm ${ev}`, 'rm -rf docs/program/evidence/run1', `git mv ${ev} docs/program/evidence/moved.md`]) {
    expect(`F1 Bash refused: ${c}`, F('Bash', { command: c }), 2, /archived/);
  }
  expect('F1 PowerShell Remove-Item of it is refused', F('PowerShell', { command: `Remove-Item ${ev.replace(/\//g, '\\')}` }), 2, /archived/);
  expect('F1 an Edit of an uncommitted file under docs/program/evidence/ passes', F('Edit', edit(at('docs/program/evidence/untracked.md'))), 0);
  expect('F1 a new file under docs/program/evidence/ passes', F('Write', { file_path: at('docs/program/evidence/brand-new.md'), content: 'x' }), 0);
  expect('F1 restoring it from git passes (the repair)', F('Bash', { command: `git checkout -- ${ev}` }), 0);
  expect('F1 main checkout: a file its HEAD holds is refused', F('Edit', edit(at('docs/program/evidence/main-only.md'))), 2, /archived/);
  expect('F1 main checkout: a file only the worktree\'s HEAD holds is new here and passes', F('Edit', edit(at('docs/program/evidence/wt-only.md'))), 0);
  expect('F1 worktree: a file its own HEAD holds is refused', F('Edit', edit(inWt('docs/program/evidence/wt-only.md'))), 2, /archived/);
  expect('F1 worktree: a file only the main checkout\'s HEAD holds is new there and passes', F('Edit', edit(inWt('docs/program/evidence/main-only.md'))), 0);
  expect('F1 a worktree whose HEAD cannot be read: a file under docs/program/evidence/ is refused (fails closed)', F('Edit', edit(at('docs/program/evidence/run1/state.md', wtOut))), 2, /fails closed/);

  // F2: forms that drop working-tree changes, while the made-up journal has an uncommitted line
  const f2Refused = ['git checkout -f main', 'git checkout --force main', 'git checkout -qf main', 'git checkout -f', 'git checkout -f -b other',
    'git switch -f main', 'git switch --force main', 'git switch --discard-changes main', 'git switch -C other --discard-changes',
    'git stash', 'git stash push', 'git stash -u', 'git stash save wip', 'git stash push -m wip', 'git stash push -- library/journal',
    `git stash push -- ${J}`, 'cd library && git stash push -- .', `git -C "${fake.replace(/\\/g, '/')}" stash`];
  for (const c of f2Refused) expect(`F2 Bash refused while the journal has uncommitted lines: ${c}`, F('Bash', { command: c }), 2, /journal lines/);
  for (const c of ['git stash', 'git switch -f main', 'git checkout -f main']) expect(`F2 PowerShell refused: ${c}`, F('PowerShell', { command: c }), 2, /journal lines/);
  const f2Passed = ['git stash list', 'git stash show -p', 'git stash pop', 'git stash apply', 'git stash drop', 'git switch main', 'git switch -c other',
    'git checkout main', 'git checkout -b other', 'git checkout -f -- notes.md', 'git checkout -f notes.md', 'git stash push -- notes.md', 'git stash push -m wip -- notes.md'];
  for (const c of f2Passed) expect(`F2 Bash passes: ${c}`, F('Bash', { command: c }), 0);
  expect('F2 git stash passes where the journal has no uncommitted lines', B('Bash', { command: 'git stash' }), 0);
  expect('F2 git switch -f passes where the journal has no uncommitted lines', B('Bash', { command: 'git switch -f main' }), 0);

  // F3: a journal Edit adds after the old content, starting on a new line; nothing of the last line changes
  const last = '{"id":"r57-0003"}';
  expect('F3 a journal Edit that adds text onto the last line is refused', F('Edit', { file_path: at(J), old_string: last, new_string: last + ' {"id":"r57-9998"}' }), 2, /only added to/);
  expect('F3 a journal Edit that adds one character to the last line is refused', F('Edit', { file_path: at(J), old_string: last, new_string: last + 'x' }), 2, /only added to/);
  expect('F3 a MultiEdit whose second edit adds onto the new last line is refused', F('MultiEdit', { file_path: at(J), edits: [{ old_string: last, new_string: last + '\n{"id":"r57-0004"}' }, { old_string: '{"id":"r57-0004"}', new_string: '{"id":"r57-0004"},' }] }), 2, /only added to/);
  expect('T8 F3 a journal Edit that adds a line after the last one is refused', F('Edit', { file_path: at(J), old_string: last, new_string: last + '\n{"id":"r57-0004"}' }), 2, /tools\/journal\.mjs/);
  expect('T8 F3 a journal Edit whose old_string ends with the final newline is refused', F('Edit', { file_path: at(J), old_string: last + '\n', new_string: last + '\n{"id":"r57-0004"}\n' }), 2, /tools\/journal\.mjs/);

  // ---- T8: every route into library/journal/ other than tools/journal.mjs ----
  const scriptDir = join(tmp, 'scripts'); mkdirSync(scriptDir, { recursive: true });
  writeFileSync(join(scriptDir, 'appender.mjs'), `require('fs').appendFileSync('${J}', 'x')\n`);
  writeFileSync(join(scriptDir, 'appender.sh'), `echo x >> ${J}\n`);
  writeFileSync(join(scriptDir, 'reader.mjs'), `console.log(require('fs').readFileSync('${J}', 'utf8').length)\n`);
  writeFileSync(join(scriptDir, 'fix.patch'), `--- a/${J}\n+++ b/${J}\n@@ -1 +1 @@\n-x\n+y\n`);
  const sd = scriptDir.replace(/\\/g, '/');
  const t8Refused = [
    `echo '{"id":"r57-0003"}' >> ${J}`, `tee -a ${J} < notes.md`, `printf x | tee -a ${J}`, `cat >> ${J} <<'EOF'\n{}\nEOF`,
    'touch library/journal/2026-11-24/t8.jsonl', 'cp notes.md library/journal/2026-11-24/t8.jsonl', 'mkdir -p library/journal/x && cp notes.md library/journal/x/',
    `node -e "require('fs').appendFileSync('${J}','x')"`,
    `node -e "const p=require('path').join('library','journal',process.argv[1]);require('fs').appendFileSync(p,'x')" 2026-11-19/r57.jsonl`,
    "node - <<'EOF'\nconst fs=require('fs');for (const f of fs.readdirSync('library/journal')) fs.appendFileSync(f,'x')\nEOF",
    `python -c "import sys;open(sys.argv[1],'a').write('x')" ${J}`,
    'for f in library/journal/*/*.jsonl; do echo x >> "$f"; done', 'F=$(ls library/journal/*/r57.jsonl); sed -i 1d "$F"',
    `node -e "require('child_process').execSync('echo x >> ${J}')"`, `node -e "require('child_process').execSync(process.argv[1])" "echo x >> ${J}"`,
    `node ${sd}/appender.mjs`, `bash ${sd}/appender.sh`, 'echo x > .git/journal-seal.json',
  ];
  for (const c of t8Refused) expect(`T8 Bash refused: ${c.replace(/\n/g, '\\n').slice(0, 80)}`, F('Bash', { command: c }), 2, /record guard/);
  const t8PsRefused = [
    "Add-Content library\\journal\\2026-11-19\\r57.jsonl '{\"id\":\"r57-0003\"}'", "'x' | Out-File -Append library\\journal\\2026-11-19\\r57.jsonl",
    'New-Item library\\journal\\2026-11-24\\t8.jsonl -ItemType File', '$p = Join-Path library\\journal x.jsonl; Add-Content $p x',
    "$p = Join-Path library\\journal x.jsonl; [IO.File]::AppendAllText($p, 'x')",
  ];
  for (const c of t8PsRefused) expect(`T8 PowerShell refused: ${c.slice(0, 80)}`, F('PowerShell', { command: c }), 2, /record guard/);
  expect('T8 a new file under library/journal by Write is refused', F('Write', { file_path: at('library/journal/2026-11-24/t8.jsonl'), content: '{}' }), 2, /tools\/journal\.mjs/);
  expect('T8 a Write of the tool\'s seal in the git folder is refused', F('Write', { file_path: join(fake, '.git', 'journal-seal.json'), content: '{}' }), 2, /seal/);
  expect('T8 git revert of a commit that touched the journal is refused', B('Bash', { command: 'git revert --no-edit HEAD' }), 2, /take journal lines out/);
  const t8Passed = [
    `cat ${J}`, `grep -c id ${J}`, `head -1 ${J} | cut -c1-40`, 'git log --oneline -- library/journal', 'mkdir -p library/journal/2026-11-24',
    `node -e "console.log(require('fs').readFileSync('${J}','utf8').length)"`,
    `node -e "const s=require('fs').readFileSync('${J}','utf8'); require('fs').writeFileSync('out.txt', s)"`,
    `node -e "const m=/id/.exec(require('fs').readFileSync('${J}','utf8')); console.log(m)"`,
    `cp ${J} "$TEMP/copy.jsonl"`, 'node tools/journal.mjs --append < recs.json', 'node tools/journal.mjs', `node ${sd}/reader.mjs`,
    'echo x > "$(mktemp)"', 'git revert --abort',
  ];
  for (const c of t8Passed) expect(`T8 Bash passes: ${c.replace(/\n/g, '\\n').slice(0, 80)}`, F('Bash', { command: c }), 0);
  expect('T8 PowerShell reading the journal passes', F('PowerShell', { command: "Get-Content library\\journal\\2026-11-19\\r57.jsonl | Select-String r57" }), 0);
  expect('T8 git apply of a patch passes the guard only when it names no journal file (this one does: refused by the watch after, not here)', F('Bash', { command: `git apply --check ${sd}/fix.patch` }), 0);
  // GA: appendEdit without its startsWith test; new_string replaces the last line, though what follows starts a new line
  expect('GA a journal Edit whose new_string does not start with old_string is refused', F('Edit', { file_path: at(J), old_string: last, new_string: 'X'.repeat(last.length) + '\n{"id":"r57-0004"}' }), 2, /only added to/);
  // GB: holds() without its journal line
  expect('GB rm -rf of a journal folder is refused', F('Bash', { command: 'rm -rf library/journal/2026-11-19' }), 2, /journal files/);

  // F4: admin shares, this PC's names and volume paths are brought to the local path; what cannot be is refused
  const drive = ra.slice(0, 1), afterDrive = ra.slice(2);
  const unc = (h) => '\\\\' + h + '\\' + drive + '$' + afterDrive;
  let volume = null;
  try { volume = (/\\\\\?\\Volume\{[0-9a-f-]+\}\\/i.exec(execFileSync('mountvol', [ra.slice(0, 3), '/L'], { encoding: 'utf8' })) || [])[0] || null; } catch {}
  const f4 = [['\\\\localhost\\c$', unc('localhost')], ['//localhost/c$', unc('localhost').replace(/\\/g, '/')], ['\\\\127.0.0.1\\c$', unc('127.0.0.1')],
    ['\\\\<this PC\'s name>\\c$', unc(hostname())], ['\\\\?\\UNC\\localhost\\c$', '\\\\?\\UNC\\' + unc('localhost').slice(2)]];
  if (volume) f4.push(['\\\\?\\Volume{...}', volume + afterDrive.slice(1)], ['\\\\.\\Volume{...}', volume.replace('\\\\?\\', '\\\\.\\') + afterDrive.slice(1)]);
  else { skip++; console.log('skip  F4 volume forms: mountvol gave no volume name'); }
  for (const [label, p] of f4) expect(`F4 Edit of archived evidence through ${label} is refused`, F('Edit', edit(p)), 2, /archived/);
  expect('F4 Bash > through //localhost/c$ is refused', F('Bash', { command: `echo x > ${unc('localhost').replace(/\\/g, '/')}` }), 2, /archived/);
  expect('F4 PowerShell Set-Content through \\\\127.0.0.1\\c$ is refused', F('PowerShell', { command: `Set-Content -Path '${unc('127.0.0.1')}' -Value x` }), 2, /archived/);
  expect('F4 a path on another share of this PC is refused (it cannot be brought to a local path)', F('Edit', edit('\\\\localhost\\someshare\\recovered\\a.js')), 2, /cannot bring/);
  expect('F4 a volume path the file system cannot resolve is refused', F('Edit', edit('\\\\?\\Volume{00000000-0000-0000-0000-000000000000}\\x.txt')), 2, /cannot bring/);
  expect('F4 an ordinary file through \\\\localhost\\c$ passes', F('Edit', edit(unc('localhost').replace(/recovered\\a\.js$/, 'notes.md'))), 0);
  if (volume) expect('F4 an ordinary file through \\\\?\\Volume{...} passes', F('Edit', edit(volume + at('notes.md').slice(3))), 0);
  expect('F4 a share of another PC passes', F('Write', { file_path: '\\\\nas.example.invalid\\share\\x.txt', content: 'x' }), 0);
  expect('F4 a write to //./nul passes', F('Bash', { command: 'echo x > //./nul' }), 0);

  // F5 (item 8): long runs of spaces are judged in linear time (each case is stopped after 10 s)
  expect('F5 a PowerShell command with Path( and 20,000 spaces is judged at once', F('PowerShell', { command: 'Path(' + ' '.repeat(20000) + 'x' }, fake, 10000), 0);
  expect('F5 a Bash path with 200,000 spaces before its last letter is judged at once', F('Bash', { command: 'echo x > "a' + ' '.repeat(200000) + 'b"' }, fake, 10000), 0);
} finally {
  try { rmSync(tmp, { recursive: true, force: true }); } catch {}
}

console.log(`${pass} passed, ${fail} failed${skip ? `, ${skip} not run` : ''}`);
process.exit(fail ? 1 : 0);
