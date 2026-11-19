// Self-test of the hooks in this folder (2026-11-19). Run: node .claude/hooks/selftest.mjs
// Feeds each hook a made-up input on stdin and checks its exit code (0 allow, 2 refuse) and output.
// It writes nothing in the repository except the hooks' own log lines in .claude/logs (ignored by git).
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const run = (hook, input) => spawnSync('node', [resolve(here, hook)], { input: JSON.stringify(input), encoding: 'utf8' });
let pass = 0, fail = 0;
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
expect('question without a kind is refused', run('record-guard.mjs', pre('AskUserQuestion', { questions: [{ question: 'Which batch size should we use?' }] })), 2, /r57-0001/);
expect('approve: question passes', run('record-guard.mjs', pre('AskUserQuestion', { questions: [{ question: 'approve: may I run the suite once (596 s)?' }] })), 0);
expect('one bad question among good ones is refused', run('record-guard.mjs', pre('AskUserQuestion', { questions: [{ question: 'cap: 2 million tokens?' }, { question: 'Should the reserve be 10 %?' }] })), 2);
expect('fact: question passes', run('record-guard.mjs', pre('AskUserQuestion', { questions: [{ question: 'fact: what reset time does Settings show?' }] })), 0);
expect('edit of archived evidence is refused', run('record-guard.mjs', pre('Edit', { file_path: resolve(repo, archivedFile), old_string: 'a', new_string: 'b' })), 2, /archived/);
expect('write over archived evidence is refused', run('record-guard.mjs', pre('Write', { file_path: resolve(repo, archivedFile), content: 'x' })), 2, /archived/);
expect('a new file under evidence passes', run('record-guard.mjs', pre('Write', { file_path: resolve(repo, 'docs/program/evidence/selftest-new-file.md'), content: 'x' })), 0);
expect('a journal Write that appends passes', run('record-guard.mjs', pre('Write', { file_path: jfile, content: jtext + '{"id":"r57-9999"}\n' })), 0);
expect('a journal Write that drops a line is refused', run('record-guard.mjs', pre('Write', { file_path: jfile, content: lines.slice(1).join('\n') + '\n' })), 2, /only added to/);
expect('a journal Edit that appends at the end passes', run('record-guard.mjs', pre('Edit', { file_path: jfile, old_string: lastLine, new_string: lastLine + '\n{"id":"r57-9999"}' })), 0);
expect('a journal Edit inside a line is refused', run('record-guard.mjs', pre('Edit', { file_path: jfile, old_string: lines[0].slice(0, 40), new_string: lines[0].slice(0, 40) + 'X' })), 2, /only added to/);
expect('an ordinary edit passes', run('record-guard.mjs', pre('Edit', { file_path: resolve(repo, 'CLAUDE.md'), old_string: 'a', new_string: 'b' })), 0);
expect('a path outside the repository passes', run('record-guard.mjs', pre('Write', { file_path: 'C:/Windows/Temp/x.txt', content: 'x' })), 0);
expect('other tools pass', run('record-guard.mjs', pre('Bash', { command: 'ls' })), 0);
expect('unreadable input passes', spawnSync('node', [resolve(here, 'record-guard.mjs')], { input: 'not json', encoding: 'utf8' }), 0);

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
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
