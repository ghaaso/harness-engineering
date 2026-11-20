// Self-test of the hooks in this folder (2026-11-19). Run: node .claude/hooks/selftest.mjs [--guard <file in this folder>]
// Feeds each hook a made-up input on stdin and checks its exit code (0 allow, 2 refuse) and output.
// It writes nothing in the repository except the hooks' own log lines in .claude/logs (ignored by git). The cases
// marked A4, A7, A11 and A13 (research-tree/build/check/A-hooks.md rows 4, 7, 11, 13; unit P0) run a copy of the
// record guard in a made-up repository with worktrees in a temporary folder, which is removed at the end.
// --guard names the record guard to test (default record-guard.mjs), so the same cases can be run on an old copy.
import { spawnSync, execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, appendFileSync, copyFileSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

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
expect('a journal Write that appends passes', run(guard, pre('Write', { file_path: jfile, content: jtext + '{"id":"r57-9999"}\n' })), 0);
expect('a journal Write that drops a line is refused', run(guard, pre('Write', { file_path: jfile, content: lines.slice(1).join('\n') + '\n' })), 2, /only added to/);
expect('a journal Edit that appends at the end passes', run(guard, pre('Edit', { file_path: jfile, old_string: lastLine, new_string: lastLine + '\n{"id":"r57-9999"}' })), 0);
expect('a journal Edit inside a line is refused', run(guard, pre('Edit', { file_path: jfile, old_string: lines[0].slice(0, 40), new_string: lines[0].slice(0, 40) + 'X' })), 2, /only added to/);
expect('an ordinary edit passes', run(guard, pre('Edit', { file_path: resolve(repo, 'CLAUDE.md'), old_string: 'a', new_string: 'b' })), 0);
expect('a path outside the repository passes', run(guard, pre('Write', { file_path: 'C:/Windows/Temp/x.txt', content: 'x' })), 0);
expect('other tools pass', run(guard, pre('Bash', { command: 'ls' })), 0);
expect('unreadable input passes', spawnSync('node', [resolve(here, guard)], { input: 'not json', encoding: 'utf8' }), 0);
expect('A7 edit of recovered/ in this repository through the \\\\?\\ form is refused',run(guard, pre('Edit', { file_path: '\\\\?\\' + resolve(repo, 'recovered', 'co_count.js'), old_string: 'a', new_string: 'b' })), 2, /archived/);

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
  const G = (root) => (tool_name, tool_input, cwd = root) => spawnSync('node', [join(root, '.claude', 'hooks', 'record-guard.mjs')],
    { input: JSON.stringify({ hook_event_name: 'PreToolUse', session_id: 'selftest', cwd, tool_name, tool_input }), encoding: 'utf8' });
  const F = G(fake), B = G(broken);
  const edit = (p) => ({ file_path: p, old_string: 'a', new_string: 'b' });

  // A4: worktrees of this repository, inside .claude/worktrees/ and outside it
  expect('A4 edit of archived evidence in a worktree under .claude/worktrees/ is refused', F('Edit', edit(at('recovered/a.js', wtIn))), 2, /archived/);
  expect('A4 edit in a folder under .claude/worktrees/ with no .git file is refused', F('Edit', edit(at('recovered/a.js', wtBroken))), 2, /archived/);
  expect('A4 write over a manifest-listed file in a worktree outside the repository is refused', F('Write', { file_path: at('docs/program/evidence/x.md', wtOut), content: 'y' }), 2, /archived/);
  expect('A4 edit of a clinic-manifest file in a worktree outside the repository is refused', F('Edit', edit(at('case-studies/clinic/a.py', wtOut))), 2, /clinic-manifest/);
  expect('A4 a journal Write that drops a line in a worktree is refused', F('Write', { file_path: at(J, wtOut), content: '{"id":"r57-0002"}\n' }), 2, /only added to/);
  expect('A4 a journal Edit inside a line in a worktree is refused', F('Edit', { file_path: at(J, wtIn), old_string: '0001', new_string: '0009' }), 2, /only added to/);
  expect('A4 a journal append in a worktree passes', F('Write', { file_path: at(J, wtIn), content: FILES[J] + '{"id":"r57-0003"}\n' }), 0);
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
  expect('A11 MultiEdit appending to a journal passes', F('MultiEdit', { file_path: at(J), edits: [{ old_string: '{"id":"r57-0003"}', new_string: '{"id":"r57-0003"}\n{"id":"r57-0004"}' }] }), 0);
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
    'ls recovered; wc -l recovered/a.js', "sed -n '1p' recovered/a.js", `echo '{"id":"r57-0003"}' >> ${J}`, `tee -a ${J} < notes.md`,
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
    'Get-Content recovered\\a.js | Select-Object -First 3', "Add-Content library\\journal\\2026-11-19\\r57.jsonl '{\"id\":\"r57-0003\"}'",
    'Copy-Item recovered\\a.js $env:TEMP\\x.js', 'Remove-Item recovered -Recurse -WhatIf', 'Set-Content -Path notes3.md -Value x',
  ];
  for (const c of psPassed) expect(`A11 PowerShell passes: ${c.slice(0, 70)}`, F('PowerShell', { command: c }), 0);

  // A13 (a): a manifest that cannot be read fails closed
  expect('A13 with an unreadable manifest, an edit of an existing file is refused', B('Edit', edit(at('notes.md', broken))), 2, /fails closed/);
  expect('A13 with an unreadable manifest, a write over an existing file through Bash is refused', B('Bash', { command: 'echo x > notes.md' }), 2, /fails closed/);
  expect('A13 with an unreadable manifest, a new file passes', B('Write', { file_path: at('brand-new.md', broken), content: 'x' }), 0);
  expect('A13 with an unreadable manifest, recovered/ is still refused', B('Edit', edit(at('recovered/a.js', broken))), 2, /archived/);
  expect('A11 restoring a journal file with no new lines from git passes', B('Bash', { command: `git checkout -- ${J}` }), 0);
} finally {
  try { rmSync(tmp, { recursive: true, force: true }); } catch {}
}

console.log(`${pass} passed, ${fail} failed${skip ? `, ${skip} not run` : ''}`);
process.exit(fail ? 1 : 0);
