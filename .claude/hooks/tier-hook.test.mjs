// Self-tests of tier-hook.mjs (2026-11-25, harness kit; brief docs/program/harness-kit-2026-11-25/briefs/HOOKS.md item 3).
// Run: node .claude/hooks/tier-hook.test.mjs [hook file in this folder, default tier-hook.mjs]
// Needs nothing outside .claude/hooks/: the hook, tier-routes.json and kit-mode.mjs are copied into a temporary folder
// shaped as a clone (<tmp>/clone/.claude/hooks/), so every log line goes there and nothing in the repository is written.
// The cases: the five of selftest.mjs that are about this hook, the ten sample calls of harness-kit/check-clone.mjs, and
// kit mode (--harness-kit "--project=<folder>").
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const T = mkdtempSync(join(tmpdir(), 'tier-hook-'));
const C = join(T, 'clone');
const H = join(C, '.claude', 'hooks');
mkdirSync(H, { recursive: true });
copyFileSync(resolve(here, process.argv[2] || 'tier-hook.mjs'), join(H, 'tier-hook.mjs'));
copyFileSync(resolve(here, 'tier-routes.json'), join(H, 'tier-routes.json'));
if (existsSync(resolve(here, 'kit-mode.mjs'))) copyFileSync(resolve(here, 'kit-mode.mjs'), join(H, 'kit-mode.mjs'));
const HOOK = join(H, 'tier-hook.mjs');
// A folder that carries the hook (its .claude/settings.json names tier-hook.mjs) and one that does not.
const WIRED = join(T, 'wired');
mkdirSync(join(WIRED, '.claude'), { recursive: true });
writeFileSync(join(WIRED, '.claude', 'settings.json'), JSON.stringify({ hooks: { PreToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: `node "${HOOK.replace(/\\/g, '/')}"` }] }] } }));
const LOCAL = join(T, 'wired-local');
mkdirSync(join(LOCAL, '.claude'), { recursive: true });
writeFileSync(join(LOCAL, '.claude', 'settings.local.json'), JSON.stringify({ hooks: { PreToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: `node "${HOOK.replace(/\\/g, '/')}" --harness-kit` }] }] } }));
const BARE = join(T, 'no-hooks-folder');
mkdirSync(BARE, { recursive: true });

let pass = 0, fail = 0;
function run(input, args = [], hook = HOOK) {
  const r = spawnSync(process.execPath, [hook, ...args], { input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8' });
  return { code: r.status, err: r.stderr || '', out: r.stdout || '' };
}
function expect(name, r, code, re) {
  const ok = r.code === code && (!re || re.test(r.err + r.out));
  ok ? pass++ : fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `  (exit ${r.code}; ${(r.err || r.out).slice(0, 160)})`}`);
}
const pre = (tool_name, tool_input, cwd = C) => ({ hook_event_name: 'PreToolUse', session_id: 'abcd1234-0000-4000-8000-000000000000', cwd, tool_name, tool_use_id: 'toolu_x', tool_input });
const start = 'mcp__ccd_session__start_session';
const logOf = (dir) => { try { return readFileSync(join(dir, 'tier-hook.jsonl'), 'utf8'); } catch { return ''; } };

// ---- the five cases of selftest.mjs ----
expect('session in a folder with no hook is refused', run(pre(start, { title: 'read: x', model: 'sonnet', cwd: BARE })), 2, /r57-0026/);
expect('session in a folder whose settings carry the hook passes', run(pre(start, { title: 'read: x', model: 'sonnet', cwd: WIRED })), 0);
expect('session with no cwd passes', run(pre(start, { title: 'read: x', model: 'sonnet' })), 0);
expect('helper on the wrong model is still refused', run(pre('Agent', { description: 'refute: x', model: 'sonnet' })), 2);
expect('helper on the right model still passes', run(pre('Agent', { description: 'read: x', model: 'sonnet' })), 0);

// ---- the ten sample calls of harness-kit/check-clone.mjs ----
expect('Agent "read: x" on sonnet passes', run(pre('Agent', { description: 'read: x', model: 'sonnet', prompt: 'x' })), 0);
expect('Agent "read: x" on opus is refused', run(pre('Agent', { description: 'read: x', model: 'opus', prompt: 'x' })), 2, /"read" runs on/);
expect('Agent with no kind is refused', run(pre('Agent', { description: 'look at x', model: 'sonnet' })), 2, /kind of job and a colon/);
expect('Agent with no model is refused', run(pre('Agent', { description: 'build: x' })), 2, /pass the model explicitly/);
expect('build-invariant on opus passes', run(pre('Agent', { description: 'build-invariant: lock', model: 'claude-opus-5-5' })), 0);
expect('mythos is refused', run(pre('Agent', { description: 'analyse: x', model: 'mythos' })), 2);
expect('a Bash call is not its business', run(pre('Bash', { command: 'ls' })), 0);
expect('unreadable input passes', run('not json'), 0);
expect('child session in a folder whose settings.local.json carries the hook passes', run(pre(start, { title: 'read: x', model: 'sonnet', cwd: LOCAL })), 0);
expect('child session in a folder without the hook is refused', run(pre(start, { title: 'read: x', model: 'sonnet', cwd: BARE })), 2);
const plainLog = join(C, '.claude', 'logs');
expect('without --harness-kit the log is beside the hooks (<clone>/.claude/logs)', { code: logOf(plainLog).includes('"decision"') ? 0 : 1, err: '', out: '' }, 0);

// ---- kit mode ----
const P = join(T, 'her-project');
mkdirSync(P, { recursive: true });
const KA = ['--harness-kit', `--project=${P}`];
const before = logOf(plainLog).length;
expect('kit: Agent "build: x" on sonnet passes', run(pre('Agent', { description: 'build: x', model: 'sonnet' }, P), KA), 0);
expect('kit: Agent "refute: x" on sonnet is refused (routes beside the hook)', run(pre('Agent', { description: 'refute: x', model: 'sonnet' }, P), KA), 2, /"refute" runs on/);
expect('kit: the log is under <project>/.claude/logs, not the clone\'s', { code: logOf(join(P, '.claude', 'logs')).split('\n').filter(Boolean).length === 2 && logOf(plainLog).length === before ? 0 : 1, err: '', out: '' }, 0);
expect('kit: a child session in a folder without the kit\'s hooks is told to run the set-up there', run(pre(start, { title: 'read: x', model: 'sonnet', cwd: BARE }, P), KA), 2, /harness-kit\/setup\.mjs" --apply --project/);
expect('kit: --project given as two arguments works the same', run(pre('Agent', { description: 'read: x', model: 'opus' }, P), ['--harness-kit', '--project', P]), 2);
expect('kit: --no-usage-tool changes nothing here', run(pre('Agent', { description: 'extract: x', model: 'haiku' }, P), [...KA, '--no-usage-tool']), 0);
// A hook whose kit-mode.mjs is missing behaves as without the argument (log beside the hook, its own refusals).
const C2 = join(T, 'clone-without-kit-mode', '.claude', 'hooks');
mkdirSync(C2, { recursive: true });
copyFileSync(HOOK, join(C2, 'tier-hook.mjs'));
copyFileSync(join(H, 'tier-routes.json'), join(C2, 'tier-routes.json'));
expect('kit-mode.mjs missing: --harness-kit is ignored, a wrong model is still refused', run(pre('Agent', { description: 'read: x', model: 'opus' }, P), KA, join(C2, 'tier-hook.mjs')), 2);
expect('kit-mode.mjs missing: the log stays beside the hook', { code: logOf(join(C2, '..', 'logs')).includes('"deny"') ? 0 : 1, err: '', out: '' }, 0);

console.log(`tier-hook: ${pass} passed, ${fail} failed (${pass + fail} cases)`);
try { rmSync(T, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
