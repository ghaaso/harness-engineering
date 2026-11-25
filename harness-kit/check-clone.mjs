#!/usr/bin/env node
// harness-kit/check-clone.mjs: the clean-clone check. Anyone can run it from a clone that holds harness-kit/:
//
//   node harness-kit/check-clone.mjs [--keep] [--full] [--branch <name>] [--repo <path or URL>]
//
// 1. Clones the branch (default bilal/promote-first, what main will hold) into a fresh temp folder outside the
//    repository: git clone --no-hardlinks --depth 1 --branch <b> file://<repo> <temp>. --depth 1 keeps it fast: the
//    check needs only the files of the branch tip, not its history (--full clones the whole history).
// 2. Copies this working folder's harness-kit/ into it and runs node harness-kit/setup.mjs --apply there.
// 3. Runs each candidate hook's own test file there (tier-hook has none: its cases below stand in for it).
// 4. Feeds each hook PreToolUse input for one call that must pass and one that must be refused, through the exact
//    commands settings.local.json now holds for the kit hooks (run in a shell, as the app runs them).
// 5. Prints one table and exits 1 if anything of a kit hook failed. The two hooks kept out of the kit are run too, to
//    show the reason; their rows do not change the exit code. Removes the temp folder unless --keep.
// Nothing of the owner's PC is present in the clone: no library/, no research-tree/build/, no .claude/settings.json;
// window-ceiling is pointed at a made-up user settings file so the runner's own ~/.claude/settings.json plays no part.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, cpSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const KEEP = args.includes('--keep'), FULL = args.includes('--full');
const BRANCH = opt('--branch') || 'bilal/promote-first';
const KITDIR = dirname(fileURLToPath(import.meta.url));
const REPO = opt('--repo') || resolve(KITDIR, '..');
const SRC = /^[a-z]+:\/\//i.test(REPO) || /^[^/\\]+@[^:]+:/.test(REPO) ? REPO : pathToFileURL(resolve(REPO)).href;

const T = realpathSync(mkdtempSync(join(tmpdir(), 'harness-kit-check-')));
const inRepo = (p) => { const r = relative(resolve(KITDIR, '..'), p); return r && !r.startsWith('..') && !isAbsolute(r); };
if (inRepo(T)) { console.error(`check-clone: the temp folder ${T} lies inside the repository; set TMPDIR elsewhere.`); process.exit(1); }
const C = join(T, 'clone');
const failures = [];
function done(code) {
  if (KEEP) console.log(`kept: ${C}`);
  else try { rmSync(T, { recursive: true, force: true, maxRetries: 5 }); } catch (e) { console.log(`could not remove ${T}: ${e.message}`); }
  process.exit(code);
}

// ---- 1, 2: clone, copy the kit, apply --------------------------------------------------------------------------------
console.log(`cloning ${BRANCH}${FULL ? '' : ' (--depth 1)'} into ${T} ...`);
const cl = spawnSync('git', ['-c', 'core.longpaths=true', 'clone', '-q', '--no-hardlinks', ...(FULL ? [] : ['--depth', '1']), '--branch', BRANCH, SRC, C], { encoding: 'utf8' });
if (cl.status !== 0) { console.error('check-clone: the clone failed: ' + (cl.stderr || cl.error)); done(1); }
for (const p of ['library', 'research-tree/build', '.claude/settings.json', '.claude/settings.local.json']) {
  if (existsSync(join(C, p))) console.log(`note: the clone holds ${p}; the check is then not "nothing of this PC present"`);
}
cpSync(KITDIR, join(C, 'harness-kit'), { recursive: true });
const ap = spawnSync(process.execPath, [join(C, 'harness-kit', 'setup.mjs'), '--apply'], { cwd: C, encoding: 'utf8' });
console.log('setup --apply:\n' + (ap.stdout + ap.stderr).trim().split('\n').map((l) => '  ' + l).join('\n'));
if (ap.status !== 0) { failures.push('setup --apply failed'); console.error('check-clone: setup --apply failed'); done(1); }
const settings = JSON.parse(readFileSync(join(C, '.claude', 'settings.local.json'), 'utf8'));
function commandOf(hook, matcher) {
  for (const g of (settings.hooks && settings.hooks.PreToolUse) || []) {
    if (g.matcher !== matcher) continue;
    for (const h of g.hooks || []) if (h.command.includes(`/.claude/hooks/${hook}.mjs"`)) return h.command;
  }
  return null;
}

// ---- fixtures: transcripts in the temp folder -------------------------------------------------------------------------
const F = join(T, 'fixtures');
mkdirSync(F, { recursive: true });
const SESS = 'abcd1234-0000-4000-8000-000000000000';
const wl = (file, objs) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, objs.map((o) => JSON.stringify(o)).join('\n') + '\n'); return file; };
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
// window-ceiling: Opus with a 400 K window (A = 368 K); under 17 calls g is the recorded 3.8 K, so the line is 330 K
const USERSET = join(F, 'user-settings.json');
writeFileSync(USERSET, JSON.stringify({ modelSettings: { 'claude-opus-5-5': { autoCompactWindow: 400000 } } }));
const calls = (ctxs) => ctxs.flatMap((ctx, i) => [
  { type: 'assistant', timestamp: ago(30 - i), message: { id: `msg_${i}`, model: 'claude-opus-5-5', usage: { input_tokens: 2, cache_creation_input_tokens: 1000, cache_read_input_tokens: ctx - 1302, output_tokens: 300 } } },
  { type: 'user', timestamp: ago(30 - i), message: { content: [{ type: 'tool_result', tool_use_id: `t${i}`, content: 'x' }] } },
]);
const wcLow = wl(join(F, 'wc-low', SESS + '.jsonl'), calls([40000, 60000, 80000, 100000, 120000]));
const wcHigh = wl(join(F, 'wc-high', SESS + '.jsonl'), calls([200000, 260000, 300000, 330000, 360000]));
// creep-gate and fanout-gate: a session that has done one ordinary turn and started nothing yet
const plain = wl(join(F, 'plain', SESS + '.jsonl'), [{ type: 'user', timestamp: ago(20), message: { content: 'build the page' } },
  { type: 'assistant', timestamp: ago(19), message: { id: 'm1', usage: { input_tokens: 1000, output_tokens: 10 }, content: [{ type: 'text', text: 'ok' }] } }]);

const pre = (tool_name, tool_input, tp = plain) => ({ session_id: SESS, transcript_path: tp, cwd: C, hook_event_name: 'PreToolUse', tool_name, tool_use_id: 'toolu_cur', tool_input });
const ENV = { ...process.env, WINDOW_CEILING_SETTINGS: USERSET };
function feed(cmd, input) {
  const r = spawnSync(cmd, { shell: true, cwd: C, input: typeof input === 'string' ? input : JSON.stringify(input), env: ENV, encoding: 'utf8', timeout: 60000 });
  return { code: r.status, msg: (r.stderr || r.stdout || '').trim().split('\n')[0].slice(0, 110) };
}
const direct = (hook) => `node "${C.replace(/\\/g, '/')}/.claude/hooks/${hook}.mjs"`;

// ---- the candidates ---------------------------------------------------------------------------------------------------
const emptyDir = join(F, 'no-hooks-folder'); mkdirSync(emptyDir, { recursive: true });
const HOOKS = [
  { hook: 'window-ceiling', matcher: '*', kit: true, test: 'window-ceiling.test.mjs',
    cases: [
      ['pass', 'Bash ls at 120 K of a 330 K line', pre('Bash', { command: 'ls' }, wcLow), 0],
      ['refuse', 'Bash ls at 360 K, past the 330 K line', pre('Bash', { command: 'ls' }, wcHigh), 2],
      ['extra', 'at 360 K: writing the hand-over research-tree/build/KIT-STATE.md passes', pre('Write', { file_path: join(C, 'research-tree', 'build', 'KIT-STATE.md'), content: 'x' }, wcHigh), 0],
    ] },
  { hook: 'tier-hook', matcher: '*', kit: true, test: null,
    cases: [
      ['pass', 'Agent "read: x" on sonnet', pre('Agent', { description: 'read: x', model: 'sonnet', prompt: 'x' }), 0],
      ['refuse', 'Agent "read: x" on opus', pre('Agent', { description: 'read: x', model: 'opus', prompt: 'x' }), 2],
      ['extra', 'Agent with no kind refused', pre('Agent', { description: 'look at x', model: 'sonnet' }), 2],
      ['extra', 'Agent with no model refused', pre('Agent', { description: 'build: x' }), 2],
      ['extra', 'build-invariant on opus passes', pre('Agent', { description: 'build-invariant: lock', model: 'claude-opus-5-5' }), 0],
      ['extra', 'mythos refused', pre('Agent', { description: 'analyse: x', model: 'mythos' }), 2],
      ['extra', 'a Bash call is not its business', pre('Bash', { command: 'ls' }), 0],
      ['extra', 'unreadable input passes', 'not json', 0],
      ['extra', 'child session in this clone (settings.local.json carries the hook) passes', pre('mcp__ccd_session__start_session', { title: 'read: x', model: 'sonnet', cwd: C }), 0],
      ['extra', 'child session in a folder without the hook refused', pre('mcp__ccd_session__start_session', { title: 'read: x', model: 'sonnet', cwd: emptyDir }), 2],
    ] },
  { hook: 'creep-gate', matcher: 'Agent|Task', kit: true, test: 'creep-gate.test.mjs',
    cases: [
      ['pass', 'Agent "build: page" naming docs/x/b.md', pre('Agent', { description: 'build: page', model: 'sonnet', prompt: 'Build docs/x/b.md.' }), 0],
      ['refuse', 'Agent "audit:" of a refute file (review of a review)', pre('Agent', { description: 'audit: the refute', model: 'opus', prompt: 'Audit research-tree/build/refute/LOCKS.md.' }), 2],
    ] },
  { hook: 'count-gate', matcher: 'Agent|Task|SendMessage', kit: false, test: 'count-gate.test.mjs',
    why: 'its test file fails here: 2 of its cases read research-tree/build/WIDTHS.md and plan.json of the owner\'s PC',
    cases: [] },
  { hook: 'fanout-gate', matcher: 'Agent|Task', kit: false, test: 'fanout-gate.test.mjs',
    why: 'refuses ordinary starts: every start needs a get_usage meter reading (desktop app only), every stated limit a record in library/journal',
    cases: [
      ['info', 'ordinary Agent start, no meter reading in the transcript', pre('Agent', { description: 'build: page', model: 'sonnet', prompt: 'Build docs/x/b.md.' }), 2],
      ['info', 'start with a limit line citing a record', pre('Agent', { description: 'build: page', model: 'sonnet', prompt: 'token limit 2 M (expected about 1 M, basis r00-0001)\nBuild it.' }), 2],
    ] },
];

function runTest(file) {
  const r = spawnSync(process.execPath, [join(C, '.claude', 'hooks', file)], { cwd: C, encoding: 'utf8', timeout: 300000 });
  const out = (r.stdout || '') + (r.stderr || '');
  let total = null, passed = null, m;
  if ((m = /(\d+) passed, (\d+) failed/.exec(out))) { passed = +m[1]; total = +m[1] + +m[2]; }
  else if ((m = /ℹ tests (\d+)[\s\S]*?ℹ pass (\d+)/.exec(out))) { total = +m[1]; passed = +m[2]; }
  else { const ok = (out.match(/^ok\b/gm) || []).length, bad = (out.match(/^(FAIL|not ok)\b/gm) || []).length; total = ok + bad; passed = ok; }
  return { ok: r.status === 0, text: `${passed}/${total}${r.status === 0 ? '' : ' FAIL'}` };
}

const rows = [];
for (const h of HOOKS) {
  const cmd = h.kit ? commandOf(h.hook, h.matcher) : direct(h.hook);
  if (h.kit && !cmd) failures.push(`${h.hook}: no entry with matcher "${h.matcher}" in settings.local.json`);
  const t = h.test ? runTest(h.test) : null;
  if (h.kit && t && !t.ok) failures.push(`${h.hook}: its test file failed`);
  const res = { pass: '-', refuse: '-', extra: [] };
  let caseOk = 0, caseN = 0;
  for (const [role, name, input, want] of h.cases) {
    const r = cmd ? feed(cmd, input) : { code: null, msg: 'no command' };
    const ok = r.code === want;
    if (h.kit) { caseN++; if (ok) caseOk++; if (!ok) failures.push(`${h.hook}: ${name}: exit ${r.code}, wanted ${want} (${r.msg})`); }
    const cell = `${ok ? 'ok' : 'WRONG'} (exit ${r.code})`;
    if (role === 'pass') res.pass = cell;
    else if (role === 'refuse') res.refuse = cell;
    else res.extra.push(`${ok ? 'ok' : 'WRONG'} exit ${r.code}: ${name}${role === 'info' ? ' -- ' + r.msg : ''}`);
  }
  rows.push({ hook: h.hook, kit: h.kit ? 'in' : 'out', tests: t ? t.text : `none; ${caseOk}/${caseN} cases here`, pass: res.pass, refuse: res.refuse, extra: res.extra, why: h.why });
}

// ---- the table ----------------------------------------------------------------------------------------------------------
const cols = [['hook', 'hook'], ['kit', 'kit'], ['tests', 'own test file (passed/total)'], ['pass', 'pass case'], ['refuse', 'refuse case']];
const w = cols.map(([k, t]) => Math.max(t.length, ...rows.map((r) => String(r[k]).length)));
const line = (vals) => '| ' + vals.map((v, i) => String(v).padEnd(w[i])).join(' | ') + ' |';
console.log('');
console.log(line(cols.map((c) => c[1])));
console.log('|' + w.map((n) => '-'.repeat(n + 2)).join('|') + '|');
for (const r of rows) console.log(line(cols.map(([k]) => r[k])));
console.log('');
for (const r of rows) {
  if (r.why) console.log(`${r.hook} out: ${r.why}`);
  for (const x of r.extra) console.log(`  ${r.hook}: ${x}`);
}
// ---- the FixFlow switch-off, and --remove ---------------------------------------------------------------------------------
{
  const offS = Object.entries(settings.skillOverrides || {}).filter(([, v]) => v === 'off').map(([k]) => k);
  const offA = ((settings.permissions || {}).deny || []).filter((d) => /^Agent\(/.test(d));
  const lean = [...offS, ...offA].filter((x) => /lean-/.test(x));
  const rm = spawnSync(process.execPath, [join(C, 'harness-kit', 'setup.mjs'), '--remove'], { cwd: C, encoding: 'utf8' });
  const f = join(C, '.claude', 'settings.local.json');
  const left = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
  const still = [...offS.filter((k) => (left.skillOverrides || {})[k] !== undefined), ...offA.filter((d) => ((left.permissions || {}).deny || []).includes(d))];
  const hooksLeft = JSON.stringify(left.hooks || {}).includes('--harness-kit');
  const ok = rm.status === 0 && offS.length > 0 && offA.length > 0 && !lean.length && !still.length && !hooksLeft;
  if (!ok) failures.push(`FixFlow switch-off: ${offS.length} skills, ${offA.length} agents, ${lean.length} lean-* off, ${still.length} left after --remove, kit hooks left ${hooksLeft}`);
  console.log(`\nFixFlow: ${offS.length} skills and ${offA.length} agents switched off in the clone; --remove left ${still.length} of them${hooksLeft ? ' and kit hooks' : ''}${existsSync(f) ? '' : ' (file deleted)'}: ${ok ? 'ok' : 'WRONG'}`);
}

console.log('');
if (failures.length) { console.log('FAILED:\n' + failures.map((f) => '  ' + f).join('\n')); done(1); }
console.log(`all kit checks passed (${BRANCH}${FULL ? '' : ', --depth 1'}, ${process.platform}, node ${process.versions.node})`);
done(0);
