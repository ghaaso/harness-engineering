#!/usr/bin/env node
// harness-kit/check-clone.mjs: the clean-clone check of the kit (Rust hooks; CONTRACT.md section 7). From a clone that
// holds harness-kit/:
//
//   node harness-kit/check-clone.mjs [--keep] [--base <ref>] [--no-overlay] [--repo <path>]
//
// 1. Makes a fresh repository in the operating system's temp folder holding the tip of <ref> (default origin/main):
//    git init, then git fetch --depth 1 of that ref from this repository (no network: a file:// fetch).
// 2. Copies in every file under harness-kit/, .claude/hooks/ and research-tree/tools/ that differs from <ref> in this
//    working tree (changed, new and untracked; deleted ones are deleted), and commits them there (--no-overlay: none).
// 3. Applies the set-up twice, through its wrapper (harness-kit/setup.cmd on Windows, setup.sh elsewhere, which run
//    kit-setup with cargo run): with the clone as the project, and with a second, empty git repository as the project
//    (with --no-usage-tool). The first apply builds the Rust workspace in the clone with the network off
//    (cargo build --release --locked --offline, CARGO_NET_OFFLINE=true, CARGO_BUILD_JOBS=6), into the clone's own target/.
//    setup --status must then say all is wired, built and fresh, for each project; the three settings it adds are checked.
// 4. Runs every kit hook's test file both ways, against the JavaScript hook and (KIT_HOOK_BIN_DIR) against its program,
//    and shows the two counts side by side, skipped cases counted apart from failed ones (the start hook's and the token
//    counter's against their programs only); then the set-up's cargo tests, and the parallel commands' test file
//    against kit-queue, kit-check and kit-unit.
// 5. For each project feeds every wired hook, through the exact command written in its settings file, one call that
//    must pass and one that must be refused (kit-start: it must print the rules and the clone's path).
// 7. Reads harness-kit/COVERAGE.md: every table row has exactly one of the eight marks; a `hook` row names a hook the
//    set-up wires; a `command` row names a file that exists in the clone; no row's last column says `missing`.
//    harness-kit/RULES.md must exist.
// 8. Runs setup --remove for both projects and shows that nothing of the kit is left in either settings file.
// 9. Prints one table and exits 1 if any line failed; removes the temp folder unless --keep.
// A hook whose program is still the placeholder ("not ported yet") fails its lines, and the table says so.
// Each inner call has a timeout (150 s; the first build 900 s, as a fresh release build may take minutes).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, realpathSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The kit hooks as kit-setup wires them (harness-kit/rust/crates/kit-setup/src/wiring.rs), and how an entry is known.
const KIT = [
  { event: 'SessionStart', matcher: null, hook: 'kit-start', program: 'kit-start' },
  { event: 'PreToolUse', matcher: '*', hook: 'window-ceiling', program: 'kit-window-ceiling' },
  { event: 'PreToolUse', matcher: '*', hook: 'tier-hook', program: 'kit-tier-hook' },
  { event: 'PreToolUse', matcher: 'Agent|Task|SendMessage', hook: 'count-gate', program: 'kit-count-gate' },
  { event: 'PreToolUse', matcher: 'Agent|Task', hook: 'fanout-gate', program: 'kit-fanout-gate' },
  { event: 'PreToolUse', matcher: 'Agent|Task', hook: 'creep-gate', program: 'kit-creep-gate' },
];
const isOurs = (h) => !!h && typeof h.command === 'string' && /(?:^|\s)--harness-kit(?=\s|$)/.test(h.command);
function hookOf(command) {
  const m = /^\s*"([^"]+)"/.exec(String(command)) || /^\s*(\S+)/.exec(String(command));
  if (!m) return null;
  const b = m[1].split(/[\\/]/).pop().replace(/\.exe$/i, '');
  const k = KIT.find((x) => x.program === b);
  return k ? k.hook : null;
}

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const KEEP = args.includes('--keep'), OVERLAY = !args.includes('--no-overlay');
const BASE = opt('--base') || 'origin/main';
const KITDIR = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(opt('--repo') || resolve(KITDIR, '..'));
const EXE = process.platform === 'win32' ? '.exe' : '';
const STEP = 150000;
const t0 = Date.now();
const say = (s) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0).padStart(4)} s] ${s}`);

const T = realpathSync(mkdtempSync(join(tmpdir(), 'harness-kit-check-')));
const inRepo = (p) => { const r = relative(REPO, p); return r && !r.startsWith('..') && !isAbsolute(r); };
if (inRepo(T)) { console.error(`check-clone: the temp folder ${T} lies inside the repository; set TMPDIR elsewhere.`); process.exit(1); }
const C = join(T, 'clone'), P = join(T, 'project'), F = join(T, 'fixtures');
const fwd = (p) => p.replace(/\\/g, '/');
const CF = fwd(C), PF = fwd(P);
const rows = [];
const row = (sec, line, js, prog, ok, note = '') => { rows.push({ sec, line, js, prog, ok, note }); return ok; };
function finish() {
  const cols = [['ok', 'verdict'], ['sec', 'part'], ['line', 'line'], ['js', 'JavaScript'], ['prog', 'program / result'], ['note', 'note']];
  const cells = rows.map((r) => ({ ...r, ok: r.ok === null ? 'info' : r.ok ? 'ok' : 'FAIL' }));
  const w = cols.map(([k, t]) => Math.min(70, Math.max(t.length, ...cells.map((r) => String(r[k] ?? '').length))));
  const cut = (v, n) => { const s = String(v ?? ''); return s.length > n ? s.slice(0, n - 1) + '~' : s; };
  const line = (vals) => '| ' + vals.map((v, i) => cut(v, w[i]).padEnd(w[i])).join(' | ') + ' |';
  console.log('');
  console.log(line(cols.map((c) => c[1])));
  console.log('|' + w.map((n) => '-'.repeat(n + 2)).join('|') + '|');
  for (const r of cells) console.log(line(cols.map(([k]) => r[k])));
  const failed = rows.filter((r) => r.ok === false);
  console.log('');
  if (failed.length) {
    console.log(`FAILED: ${failed.length} line(s):`);
    for (const r of failed) console.log(`  ${r.sec}: ${r.line}${r.note ? ' -- ' + r.note : ''}`);
  } else console.log('every line passed.');
  console.log(`(${BASE}${OVERLAY ? ' plus this working tree\'s kit files' : ''}, ${process.platform}, node ${process.versions.node}, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  if (KEEP) console.log(`kept: ${T}`);
  else try { rmSync(T, { recursive: true, force: true, maxRetries: 5 }); } catch (e) { console.log(`could not remove ${T}: ${e.message}`); }
  process.exit(failed.length ? 1 : 0);
}
const git = (cwd, a, o = {}) => spawnSync('git', ['-c', 'core.longpaths=true', ...a], { cwd, encoding: 'utf8', timeout: STEP, maxBuffer: 256 * 1024 * 1024, ...o });

// ---- 1, 2: the clean clone and the overlay ----------------------------------------------------------------------------
say(`making the clean clone of ${BASE} in ${T}`);
mkdirSync(C, { recursive: true });
let g = git(C, ['init', '-q']);
const baseSha = git(REPO, ['rev-parse', '--verify', BASE + '^{commit}']).stdout.trim();
const fullRef = git(REPO, ['rev-parse', '--symbolic-full-name', BASE]).stdout.trim() || BASE;
if (!baseSha) { row('clone', `${BASE} is not a commit in ${fwd(REPO)}`, '', '', false); finish(); }
g = git(C, ['fetch', '-q', '--depth', '1', pathToFileURL(REPO).href, `${fullRef}:refs/heads/checked`]);
if (g.status !== 0) { row('clone', `fetch of ${BASE}`, '', (g.stderr || String(g.error)).trim().slice(0, 200), false); finish(); }
g = git(C, ['checkout', '-q', 'checked']);
git(C, ['config', 'core.longpaths', 'true']);
if (!row('clone', `clean clone of ${BASE} (${baseSha.slice(0, 8)})`, '', g.status === 0 ? 'checked out' : g.stderr.trim().slice(0, 160), g.status === 0)) finish();
for (const p of ['library', 'research-tree/build', '.claude/settings.json', '.claude/settings.local.json']) {
  if (existsSync(join(C, p))) row('clone', `the clone holds ${p}`, '', 'present', null, 'so the clone is not free of this PC\'s files');
}
if (OVERLAY) {
  const AREAS = ['harness-kit', '.claude/hooks', 'research-tree/tools'];
  const diff = git(REPO, ['diff', '--name-status', '--no-renames', baseSha, '--', ...AREAS]).stdout.trim().split('\n').filter(Boolean)
    .map((l) => l.split('\t')).map(([s, f]) => ({ s, f }));
  const untracked = git(REPO, ['ls-files', '--others', '--exclude-standard', '--', ...AREAS]).stdout.trim().split('\n').filter(Boolean).map((f) => ({ s: '?', f }));
  let copied = 0, deleted = 0;
  for (const { s, f } of [...diff, ...untracked]) {
    const dest = join(C, f);
    if (s === 'D') { rmSync(dest, { force: true }); deleted++; continue; }
    if (!existsSync(join(REPO, f))) continue;
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(join(REPO, f), dest);
    copied++;
  }
  git(C, ['add', '-A']);
  const cm = git(C, ['-c', 'user.name=kit check', '-c', 'user.email=kit-check@invalid', 'commit', '-q', '--no-verify', '-m', 'working tree kit files']);
  row('clone', 'kit files of this working tree copied in', '', `${copied} copied, ${deleted} deleted`, cm.status === 0 || copied + deleted === 0, cm.status === 0 ? '' : cm.stderr.trim().slice(0, 120));
}
mkdirSync(P, { recursive: true });
git(P, ['init', '-q']);

// ---- 3: the set-up, twice -----------------------------------------------------------------------------------------------
const SETUP_ENV = { ...process.env, CARGO_NET_OFFLINE: 'true', CARGO_BUILD_JOBS: '6' };
delete SETUP_ENV.CARGO_TARGET_DIR; delete SETUP_ENV.KIT_HOOK_BIN_DIR; delete SETUP_ENV.HARNESS_KIT_CARGO;
// Through the wrapper she runs. On Windows a .cmd file runs only through cmd.exe, so the call is one quoted line.
const setup = (a, timeout = STEP) => (process.platform === 'win32'
  ? spawnSync([join(C, 'harness-kit', 'setup.cmd'), ...a].map((x) => `"${x}"`).join(' '), { shell: true, cwd: C, encoding: 'utf8', env: SETUP_ENV, timeout })
  : spawnSync('sh', [join(C, 'harness-kit', 'setup.sh'), ...a], { cwd: C, encoding: 'utf8', env: SETUP_ENV, timeout }));
const lastLines = (r, n = 3) => ((r.stderr || '') + (r.stdout || '')).trim().split('\n').slice(-n).join(' / ');
const PROJECTS = [{ name: 'clone', dir: C, D: CF, args: [] }, { name: 'empty repo', dir: P, D: PF, args: ['--project', P, '--no-usage-tool'] }];
say('setup --apply with the clone as the project (builds the Rust workspace, network off)');
for (const pr of PROJECTS) {
  const t = Date.now();
  const r = setup(['--apply', ...pr.args], pr === PROJECTS[0] ? 900000 : STEP);
  pr.applied = r.status === 0;
  row('set-up', `--apply, project = ${pr.name}${pr.args.includes('--no-usage-tool') ? ' (--no-usage-tool)' : ''}`, '', `exit ${r.status ?? 'timeout'} in ${((Date.now() - t) / 1000).toFixed(0)} s`, pr.applied, pr.applied ? '' : lastLines(r));
  console.log((r.stdout + r.stderr).trim().split('\n').map((l) => '    ' + l).join('\n'));
  if (!pr.applied) continue;
  const st = setup(['--status', ...pr.args.filter((x) => x !== '--no-usage-tool')]);
  row('set-up', `--status, project = ${pr.name}`, '', `exit ${st.status}`, st.status === 0, st.status === 0 ? '' : st.stdout.split('\n').filter((l) => /NOT|MISSING|OLDER|WRONG|runs /.test(l)).join(' / ').slice(0, 200));
  pr.settings = JSON.parse(readFileSync(join(pr.dir, '.claude', 'settings.local.json'), 'utf8'));
  const made = ['.harness/kit.json', '.harness/WIDTHS.md', '.harness/briefs'].filter((f) => existsSync(join(pr.dir, f)));
  row('set-up', `.harness/ made in project = ${pr.name}`, '', made.length === 3 ? 'kit.json, WIDTHS.md, briefs/' : `only ${made.join(', ')}`, made.length === 3);
}
const OFF = PROJECTS[0].settings ? (JSON.parse((PROJECTS[0].settings.env || {}).HARNESS_KIT_OFF || '{"skills":[],"deny":[]}')) : { skills: [], deny: [] };
if (PROJECTS[0].settings) row('set-up', 'FixFlow switched off in the clone (none lean-*)', '', `${OFF.skills.length} skills, ${OFF.deny.length} agents`, OFF.skills.length > 0 && OFF.deny.length > 0 && ![...OFF.skills, ...OFF.deny].some((x) => /lean-/.test(x)));
const OFF1 = PROJECTS[1].settings ? JSON.parse((PROJECTS[1].settings.env || {}).HARNESS_KIT_OFF || '{"skills":[],"deny":[]}') : null;
if (OFF1) row('set-up', 'no FixFlow switch in the empty repo', '', `${OFF1.skills.length} skills, ${OFF1.deny.length} agents`, !OFF1.skills.length && !OFF1.deny.length && !PROJECTS[1].settings.skillOverrides && !PROJECTS[1].settings.permissions);
for (const pr of PROJECTS) {
  const s = pr.settings;
  if (!s) continue;
  const fork = (s.env || {}).CLAUDE_CODE_FORK_SUBAGENT === '0';
  const win = ((s.modelSettings || {})['claude-opus-5-5'] || {}).autoCompactWindow === 400000;
  const listing = pr === PROJECTS[0] ? s.skillListingMaxDescChars === 1 : s.skillListingMaxDescChars === undefined;
  row('set-up', `the three settings in project = ${pr.name}`, '', `fork ${fork ? 'off' : '-'}, Opus window ${win ? '400 K' : '-'}, listing ${s.skillListingMaxDescChars ?? 'not set'}`, fork && win && listing);
}
const BIN = join(C, 'harness-kit', 'rust', 'target', 'release');
const built = existsSync(join(BIN, 'kit-tier-hook' + EXE));

// placeholders: a program that still says "not ported yet"
const placeholder = {};
for (const p of [...KIT.map((k) => k.program), 'kit-tokens', 'kit-queue', 'kit-check', 'kit-unit']) {
  const f = join(BIN, p + EXE);
  if (!existsSync(f)) { placeholder[p] = 'not built'; continue; }
  const r = spawnSync(f, [], { cwd: T, input: '{}', encoding: 'utf8', timeout: 20000 });
  if (/not ported yet/.test(r.stderr || '')) placeholder[p] = 'placeholder: not ported yet';
}

// ---- 4: the test files ---------------------------------------------------------------------------------------------------
function counts(out) {
  let m, passed = 0, failed = 0, skipped = 0;
  if ((m = /ℹ tests (\d+)/.exec(out))) {
    const num = (k) => { const x = new RegExp(`ℹ ${k} (\\d+)`).exec(out); return x ? +x[1] : 0; };
    passed = num('pass'); failed = num('fail') + num('cancelled'); skipped = num('skipped') + num('todo');
  } else if ((m = /(\d+) passed, (\d+) failed(?:, (\d+) skipped)?/.exec(out))) {
    passed = +m[1]; failed = +m[2]; skipped = m[3] ? +m[3] : (out.match(/^skip\b/gm) || []).length;
  } else {
    passed = (out.match(/^ok\b/gm) || []).length; failed = (out.match(/^(FAIL|not ok)\b/gm) || []).length; skipped = (out.match(/^skip\b/gm) || []).length;
  }
  return { passed, failed, skipped };
}
function runTest(file, rust) {
  const env = { ...process.env };
  delete env.KIT_HOOK_BIN_DIR;
  if (rust) env.KIT_HOOK_BIN_DIR = BIN;
  const r = spawnSync(process.execPath, [join(C, file)], { cwd: C, encoding: 'utf8', env, timeout: STEP, maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  const c = counts(out);
  const ok = r.status === 0 && c.failed === 0 && c.passed > 0;
  const text = `${c.passed} passed, ${c.failed} failed${c.skipped ? `, ${c.skipped} skipped` : ''}${r.status === 0 ? '' : r.error ? ` (${r.error.code === 'ETIMEDOUT' ? 'timed out' : r.error.code})` : ` (exit ${r.status})`}`;
  const firstFail = (out.match(/^(FAIL|not ok)\b.*$/m) || [''])[0].slice(0, 120);
  return { ok, text, firstFail };
}
const HOOK_TESTS = [
  { hook: 'window-ceiling', file: '.claude/hooks/window-ceiling.test.mjs', program: 'kit-window-ceiling' },
  { hook: 'tier-hook', file: '.claude/hooks/tier-hook.test.mjs', program: 'kit-tier-hook' },
  { hook: 'creep-gate', file: '.claude/hooks/creep-gate.test.mjs', program: 'kit-creep-gate' },
  { hook: 'count-gate', file: '.claude/hooks/count-gate.test.mjs', program: 'kit-count-gate' },
  { hook: 'fanout-gate', file: '.claude/hooks/fanout-gate.test.mjs', program: 'kit-fanout-gate' },
  { hook: 'kit-start', file: 'harness-kit/hooks/kit-start.test.mjs', program: 'kit-start', only: true },
  { hook: 'tokens (command)', file: 'harness-kit/tokens.test.mjs', program: 'kit-tokens', only: true },
];
say('running the test files both ways');
for (const h of HOOK_TESTS) {
  if (!existsSync(join(C, h.file))) { row('test file', h.file, '', 'missing', false); continue; }
  const js = h.only ? { ok: true, text: 'program only', firstFail: '' } : runTest(h.file, false);
  const switched = /hook-under-test/.test(readFileSync(join(C, h.file), 'utf8'));
  let pr = { ok: false, text: '-', firstFail: '' }, note = '';
  if (!built) note = 'the programs were not built';
  else if (!switched) { pr.text = 'not run'; note = 'its test file does not use hook-under-test.mjs, so KIT_HOOK_BIN_DIR would still run the JavaScript'; }
  else { pr = runTest(h.file, true); if (!pr.ok) note = (placeholder[h.program] ? `${h.program}: ${placeholder[h.program]}; ` : '') + pr.firstFail; }
  row('test file', h.file, js.text, pr.text, js.ok && pr.ok, [js.ok ? '' : 'JavaScript: ' + js.firstFail, note].filter(Boolean).join('; '));
  say(`  ${h.file}: JavaScript ${js.text}; program ${pr.text}`);
}
{
  const t = Date.now();
  const r = spawnSync('cargo', ['test', '--offline', '--locked', '-j', '6', '-p', 'kit-setup'], { cwd: join(C, 'harness-kit', 'rust'), encoding: 'utf8', timeout: STEP, maxBuffer: 64 * 1024 * 1024,
    env: { ...SETUP_ENV, CARGO_TARGET_DIR: join(C, 'harness-kit', 'rust', 'target') } });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = /test result: \w+\. (\d+) passed; (\d+) failed/.exec(out);
  const ok = r.status === 0 && !!m && +m[2] === 0;
  row('test file', 'cargo test -p kit-setup (the set-up)', '', m ? `${m[1]} passed, ${m[2]} failed in ${((Date.now() - t) / 1000).toFixed(0)} s` : `exit ${r.status ?? 'timeout'}`, ok, ok ? '' : (out.match(/^FAIL .*$/m) || out.match(/^error.*$/m) || [''])[0].slice(0, 120));
  say(`  cargo test -p kit-setup: ${ok ? 'passed' : 'FAILED'}`);
}
for (const [f, rust, progs] of [['harness-kit/parallel/parallel.test.mjs', true, ['kit-queue', 'kit-check', 'kit-unit']], ['research-tree/tools/land.test.mjs', false, []]]) {
  if (!existsSync(join(C, f))) { row('test file', f, 'missing', '', false); continue; }
  const r = runTest(f, rust);
  const ph = progs.filter((p) => placeholder[p]).map((p) => `${p}: ${placeholder[p]}`).join('; ');
  row('test file', f, rust ? '' : r.text, rust ? r.text : 'JavaScript only (stays JavaScript)', r.ok, r.ok ? '' : [ph, r.firstFail].filter(Boolean).join('; '));
  say(`  ${f}: ${r.text}`);
}

// ---- 5: the wired commands, fed one passing and one refused call each -------------------------------------------------
mkdirSync(F, { recursive: true });
const SESS = 'abcd1234-0000-4000-8000-000000000000';
const wl = (file, objs) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, objs.map((o) => JSON.stringify(o)).join('\n') + '\n'); return file; };
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
// window-ceiling: Opus with a 400 K window (A = 368 K); a helper that is not a coordinator writes its checkpoint at 330 K
const USERSET = join(F, 'user-settings.json');
writeFileSync(USERSET, JSON.stringify({ modelSettings: { 'claude-opus-5-5': { autoCompactWindow: 400000 } } }));
const calls = (ctxs) => ctxs.flatMap((ctx, i) => [
  { type: 'assistant', timestamp: ago(30 - i), message: { id: `msg_${i}`, model: 'claude-opus-5-5', usage: { input_tokens: 2, cache_creation_input_tokens: 1000, cache_read_input_tokens: ctx - 1302, output_tokens: 300 } } },
  { type: 'user', timestamp: ago(30 - i), message: { content: [{ type: 'tool_result', tool_use_id: `t${i}`, content: 'x' }] } },
]);
const wcLow = wl(join(F, 'wc-low', SESS + '.jsonl'), calls([40000, 60000, 80000, 100000, 120000]));
const wcHigh = wl(join(F, 'wc-high', SESS + '.jsonl'), calls([200000, 260000, 300000, 330000, 360000]));
const plain = wl(join(F, 'plain', SESS + '.jsonl'), [{ type: 'user', timestamp: ago(20), message: { content: 'build the page' } },
  { type: 'assistant', timestamp: ago(19), message: { id: 'm1', usage: { input_tokens: 1000, output_tokens: 10 }, content: [{ type: 'text', text: 'ok' }] } }]);
mkdirSync(join(F, 'plain', SESS, 'subagents'), { recursive: true });
// fan-out gate: a meter reading in one message, the start in the next
const GU = 'mcp__ccd_session_mgmt__get_usage';
const LIMIT = 'token limit 2 M (expected about 1 M, basis r58-0104)';
const BADLIMIT = 'token limit 1 M (expected about 1 M, basis r58-0104)';
const meterThen = (prompt) => [
  { parentUuid: 'p', type: 'assistant', timestamp: ago(2), message: { id: 'm1', role: 'assistant', content: [{ type: 'tool_use', id: 'tu_u', name: GU, input: {} }] } },
  { parentUuid: 'p', type: 'user', timestamp: ago(2), message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tu_u', content: [{ type: 'text', text: JSON.stringify({ plan: { status: 'ok', windows: [{ label: 'Weekly · all models', percentUsed: 30 }, { label: 'Weekly · Fable', percentUsed: 10 }] } }) }] }] } },
  { parentUuid: 'p', type: 'assistant', timestamp: ago(1), message: { id: 'm2', role: 'assistant', content: [{ type: 'tool_use', id: 'toolu_cur', name: 'Agent', input: { description: 'build: page', model: 'sonnet', prompt } }] } },
];
const fanGood = wl(join(F, 'fan-good', SESS + '.jsonl'), meterThen(LIMIT));
const fanBad = wl(join(F, 'fan-bad', SESS + '.jsonl'), meterThen(BADLIMIT));
const emptyDir = join(F, 'no-hooks-folder'); mkdirSync(emptyDir, { recursive: true });

const pre = (D, tool_name, tool_input, tp = plain) => ({ session_id: SESS, transcript_path: tp, cwd: D, hook_event_name: 'PreToolUse', tool_name, tool_use_id: 'toolu_cur', tool_input });
const CASES = {
  'kit-start': (pr) => [['pass', 'SessionStart: prints the kit\'s place and the rules', { hook_event_name: 'SessionStart', session_id: SESS, source: 'startup', cwd: pr.dir }, 0, 'start']],
  'window-ceiling': (pr) => [
    ['pass', 'Bash ls at 120 K of a 330 K line', pre(pr.dir, 'Bash', { command: 'ls' }, wcLow), 0],
    ['refuse', 'Bash ls at 360 K, past the 330 K line', pre(pr.dir, 'Bash', { command: 'ls' }, wcHigh), 2],
    ['extra', 'at 360 K the hand-over .harness/KIT-STATE.md may be written', pre(pr.dir, 'Write', { file_path: join(pr.dir, '.harness', 'KIT-STATE.md'), content: 'x' }, wcHigh), 0],
  ],
  'tier-hook': (pr) => [
    ['pass', 'Agent "read: x" on sonnet at effort medium', pre(pr.dir, 'Agent', { description: 'read: x', model: 'sonnet', effort: 'medium', prompt: 'x' }), 0],
    ['refuse', 'Agent "read: x" on opus', pre(pr.dir, 'Agent', { description: 'read: x', model: 'opus', effort: 'medium', prompt: 'x' }), 2],
    ['extra', 'Agent "read: x" on sonnet with no effort is refused (the effort check, on trial)', pre(pr.dir, 'Agent', { description: 'read: x', model: 'sonnet', prompt: 'x' }), 2],
    ['extra', 'child session in the project (its settings wire kit-tier-hook) passes', pre(pr.dir, 'mcp__ccd_session__start_session', { title: 'read: x', model: 'sonnet', cwd: pr.dir }), 0],
    ['extra', 'child session in a folder without the hook is refused', pre(pr.dir, 'mcp__ccd_session__start_session', { title: 'read: x', model: 'sonnet', cwd: emptyDir }), 2],
  ],
  'count-gate': (pr) => [
    ['pass', 'Agent start with no helper running', pre(pr.dir, 'Agent', { description: 'build: page', model: 'sonnet', prompt: 'Build docs/x/b.md.' }), 0],
    ['refuse', 'Agent start past a width of 0 declared in .harness/WIDTHS.md', pre(pr.dir, 'Agent', { description: 'build: page', model: 'sonnet', prompt: 'Build docs/x/b.md.' }), 2, 'widths'],
  ],
  'fanout-gate': (pr) => (pr.args.includes('--no-usage-tool') ? [
    ['pass', 'start with a measured basis, no meter reading (--no-usage-tool)', pre(pr.dir, 'Agent', { description: 'build: page', model: 'sonnet', prompt: LIMIT }), 0],
    ['refuse', 'a limit not above its expected figure', pre(pr.dir, 'Agent', { description: 'build: page', model: 'sonnet', prompt: BADLIMIT }), 2],
  ] : [
    ['pass', 'meter read, then a start with a measured basis (r58-0104)', pre(pr.dir, 'Agent', { description: 'build: page', model: 'sonnet', prompt: LIMIT }, fanGood), 0],
    ['refuse', 'a limit not above its expected figure', pre(pr.dir, 'Agent', { description: 'build: page', model: 'sonnet', prompt: BADLIMIT }, fanBad), 2],
  ]),
  'creep-gate': (pr) => [
    ['pass', 'Agent "build: page" naming docs/x/b.md', pre(pr.dir, 'Agent', { description: 'build: page', model: 'sonnet', prompt: 'Build docs/x/b.md.' }), 0],
    ['refuse', 'a repair round on findings ("Fold the findings into ...")', pre(pr.dir, 'Agent', { description: 'build: fold', model: 'sonnet', prompt: 'Fold the findings into docs/x/a.md.' }), 2],
  ],
};
const ENV = { ...process.env, WINDOW_CEILING_SETTINGS: USERSET };
for (const k of ['KIT_HOOK_BIN_DIR', 'FANOUT_GATE_ROOT', 'FANOUT_GATE_NOW', 'CREEP_GATE_ROOT']) delete ENV[k];
// The shell the app runs a hook command in: sh off Windows; Git Bash on Windows when it is where Git puts it.
const GITBASH = ['C:/Program Files/Git/bin/bash.exe', 'C:/Program Files (x86)/Git/bin/bash.exe'].find((p) => existsSync(p));
const SHELL = process.platform === 'win32' ? (GITBASH || true) : '/bin/sh';
function feed(cmd, input, cwd) {
  const r = spawnSync(cmd, { shell: SHELL, cwd, input: typeof input === 'string' ? input : JSON.stringify(input), env: ENV, encoding: 'utf8', timeout: 60000 });
  return { code: r.status, out: r.stdout || '', err: r.stderr || '', msg: (r.stderr || r.stdout || '').trim().split('\n')[0].slice(0, 110) };
}
const RULES = join(C, 'harness-kit', 'RULES.md');
const rulesLine = existsSync(RULES) ? readFileSync(RULES, 'utf8').replace(/\r\n/g, '\n').split('\n').map((l) => l.trim()).find((l) => l) : null;
say(`feeding the wired commands (shell: ${SHELL === true ? 'the default' : SHELL})`);
for (const pr of PROJECTS) {
  if (!pr.settings) { row('wired', `project = ${pr.name}`, '', 'not applied', false); continue; }
  const ents = Object.entries(pr.settings.hooks || {}).flatMap(([ev, gs]) => gs.flatMap((g) => (g.hooks || []).filter(isOurs).map((h) => ({ ev, matcher: g.matcher ?? null, command: h.command, hook: hookOf(h.command) }))));
  for (const k of KIT) {
    const e = ents.filter((x) => x.hook === k.hook);
    if (e.length !== 1) { row('wired', `${pr.name}: ${k.hook}`, '', `${e.length} entries`, false); continue; }
    const cmd = e[0].command;
    for (const [role, name, input, want, special] of CASES[k.hook](pr)) {
      const widths = join(pr.dir, '.harness', 'WIDTHS.md');
      const keep = special === 'widths' && existsSync(widths) ? readFileSync(widths, 'utf8') : null;
      if (special === 'widths') writeFileSync(widths, (keep || '') + '\nwidth "build:*" 0: no builder at once, check line 1 of the kit check\n');
      const r = feed(cmd, input, pr.dir);
      if (special === 'widths') { if (keep === null) rmSync(widths, { force: true }); else writeFileSync(widths, keep); }
      let ok = r.code === want, note = ok ? '' : r.msg;
      if (special === 'start') {
        let ctx = '';
        try { ctx = JSON.parse(r.out).hookSpecificOutput.additionalContext || ''; } catch {}
        const where = ctx.includes(`the kit is at ${CF}`);
        const rules = rulesLine ? ctx.includes(rulesLine) : false;
        ok = ok && where && rules;
        note = [where ? '' : 'the clone\'s path is not in its output', rulesLine ? (rules ? '' : 'the rules are not in its output') : 'harness-kit/RULES.md is missing in the clone (writer not done)', r.code === want ? '' : r.msg].filter(Boolean).join('; ');
      }
      if (!ok && placeholder[k.program]) note = `${k.program}: ${placeholder[k.program]}` + (note ? '; ' + note : '');
      row('wired', `${pr.name}: ${k.hook} ${role}: ${name}`, '', `exit ${r.code}, wanted ${want}`, ok, note);
    }
  }
}

// ---- 7: COVERAGE.md and RULES.md --------------------------------------------------------------------------------------------
{
  row('documents', 'harness-kit/RULES.md exists', '', existsSync(RULES) ? 'there' : 'missing', existsSync(RULES), existsSync(RULES) ? '' : 'the writer is not done');
  const covFile = join(C, 'harness-kit', 'COVERAGE.md');
  if (!existsSync(covFile)) row('documents', 'harness-kit/COVERAGE.md exists', '', 'missing', false);
  else {
    const MARKS = ['hook', 'loaded', 'command', 'trial', "owner's own", 'cannot', 'design', 'result'];
    const HOOKNAMES = KIT.flatMap((k) => [k.hook, k.program]);
    const split = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    let head = null, n = 0;
    const bad = { mark: [], hook: [], command: [], missing: [] };
    for (const l of readFileSync(covFile, 'utf8').split(/\r?\n/)) {
      if (!/^\s*\|/.test(l)) { head = /^\s*$/.test(l) ? head : null; continue; }
      const cells = split(l);
      if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
      if (!head) { head = cells.map((c) => c.toLowerCase()); continue; }
      const iMark = head.indexOf('mark'), iBy = head.indexOf('by what'), iToday = head.length - 1;
      if (iMark < 0) continue;
      n++;
      const id = cells[0];
      const mark = (cells[iMark] || '').replace(/`/g, '').trim();
      const by = cells[iBy] || '';
      if (!MARKS.includes(mark)) bad.mark.push(`${id} "${mark}"`);
      if (mark === 'hook' && !HOOKNAMES.some((h) => new RegExp(`(^|[^\\w-])${h.replace(/[-]/g, '\\-')}([^\\w-]|$)`).test(by))) bad.hook.push(id);
      if (mark === 'command') {
        const paths = [...by.matchAll(/`([^`]+)`/g)].flatMap((m) => m[1].split(/\s+/)).filter((t) => /\//.test(t) || /\.\w{1,4}$/.test(t));
        if (!paths.some((t) => existsSync(join(C, t)))) bad.command.push(id);
      }
      if (/^missing\b/i.test((cells[iToday] || '').trim())) bad.missing.push(id);
    }
    const list = (xs) => (xs.length > 12 ? xs.slice(0, 12).join(', ') + ` and ${xs.length - 12} more` : xs.join(', '));
    row('documents', `COVERAGE.md: ${n} rows, each with exactly one of the eight marks`, '', `${bad.mark.length} rows wrong`, n > 0 && !bad.mark.length, list(bad.mark));
    row('documents', 'COVERAGE.md: each `hook` row names a hook the set-up wires', '', `${bad.hook.length} rows wrong`, !bad.hook.length, list(bad.hook));
    row('documents', 'COVERAGE.md: each `command` row names a file in the clone', '', `${bad.command.length} rows wrong`, !bad.command.length, list(bad.command));
    row('documents', 'COVERAGE.md: no row still says `missing`', '', `${bad.missing.length} rows say missing`, !bad.missing.length, bad.missing.length ? 'the writer is not done: ' + list(bad.missing) : '');
  }
}

// ---- 8: --remove ---------------------------------------------------------------------------------------------------------------
for (const pr of PROJECTS) {
  if (!pr.applied) continue;
  const r = setup(['--remove', ...pr.args.filter((x) => x !== '--no-usage-tool')]);
  const f = join(pr.dir, '.claude', 'settings.local.json');
  const left = existsSync(f) ? readFileSync(f, 'utf8') : '';
  const kitLeft = /--harness-kit|HARNESS_KIT_OFF|CLAUDE_CODE_FORK_SUBAGENT|autoCompactWindow|skillListingMaxDescChars|kit-[a-z-]+(\.exe)?"/.test(left);
  row('remove', `--remove, project = ${pr.name}: nothing of the kit left`, '', `exit ${r.status}${existsSync(f) ? '' : ', file deleted'}`, r.status === 0 && !kitLeft, kitLeft ? 'kit entries left' : '');
  row('remove', `--remove leaves .harness/ in project = ${pr.name}`, '', existsSync(join(pr.dir, '.harness', 'kit.json')) ? 'left' : 'gone', existsSync(join(pr.dir, '.harness', 'kit.json')));
}
finish();
