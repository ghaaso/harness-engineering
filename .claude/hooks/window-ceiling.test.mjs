// Self-tests of window-ceiling.mjs (unit T8-CEIL, 2026-11-24; fixes B1 and B3, unit T8-FIX).
// Run: node .claude/hooks/window-ceiling.test.mjs [hook file, default window-ceiling.mjs]
// Every case feeds real PreToolUse JSON on stdin to the hook as a separate process, against transcripts built here
// in a temporary folder; logs and state go to that folder (WINDOW_CEILING_LOGDIR), never to .claude/logs.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, appendFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const HOOK = join(here, process.argv[2] || 'window-ceiling.mjs');
const ROOT = resolve(here, '..', '..').replace(/\\/g, '/');
const T = mkdtempSync(join(tmpdir(), 'wceil-'));
const LOGDIR = join(T, 'logs');
const SETTINGS = join(T, 'settings.json');
writeFileSync(SETTINGS, JSON.stringify({ modelSettings: { 'claude-opus-5-5': { autoCompactWindow: 400000 } } }));
// The state file that names the test session as coordinating (B3: W* only for such a session).
const BUILD = join(T, 'build');
mkdirSync(BUILD, { recursive: true });
writeFileSync(join(BUILD, 'TESTX-STATE.md'), '# state\n\nSession 11111111 (test), Opus, kind orchestrate. Brief: x.\n');
writeFileSync(join(BUILD, 'OTHER-STATE.md'), '# other\n\nSession 22222222 (test), Opus, kind build-invariant; started by session 11111111, kind orchestrate.\n');
const ENV = { ...process.env, WINDOW_CEILING_LOGDIR: LOGDIR, WINDOW_CEILING_SETTINGS: SETTINGS, WINDOW_CEILING_BUILD: BUILD };
const PROJ = join(T, 'projects', 'proj');
mkdirSync(PROJ, { recursive: true });

let pass = 0, fail = 0;
function ok(cond, name, extra = '') { if (cond) pass++; else { fail++; console.log(`FAIL ${name} ${extra}`); } }

// One call = two content-block lines with the same message id (the second with the larger output), as the app writes.
function callLines(i, ctx, { model = 'claude-opus-5-5', side = false } = {}) {
  const mk = (out) => JSON.stringify({ type: 'assistant', isSidechain: side, uuid: `u${i}-${out}`,
    message: { id: `msg_${i}`, model, usage: { input_tokens: 2, cache_creation_input_tokens: 1000, cache_read_input_tokens: ctx - 1002 - out, output_tokens: out } } });
  return mk(10) + '\n' + mk(300) + '\n' + JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', content: 'x'.repeat(200) }] } }) + '\n';
}
function transcript(file, ctxs, opts = {}) {
  let s = JSON.stringify({ type: 'api-request-blob', blob: 'y'.repeat(5000) }) + '\n';
  ctxs.forEach((c, i) => {
    if (opts.boundaryBefore === i) s += JSON.stringify({ type: 'system', subtype: 'compact_boundary', compactMetadata: { trigger: 'auto' } }) + '\n';
    s += callLines((opts.base || 0) + i, c, opts);
    if (opts.noise && i === 20) { // a sidechain line and a synthetic line: neither is a call of this session
      s += JSON.stringify({ type: 'assistant', isSidechain: true, message: { id: 'side', model: 'claude-opus-5-5', usage: { input_tokens: 999999 } } }) + '\n';
      s += JSON.stringify({ type: 'assistant', message: { id: 'syn', model: '<synthetic>', usage: { input_tokens: 0 } } }) + '\n';
    }
  });
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, s);
}
// Main session: 17 orientation calls 80 K -> 170 K (R = 2.125 M), then work at 2.3 K a call.
// W* = 170 K + sqrt(2 x 2.125 M x 2.3 K) = 268.9 K; hard line = min(W* + 23 K, 368 K - 23 K) = 291.9 K.
const orient = Array.from({ length: 17 }, (_, i) => Math.round(80000 + i * 90000 / 16));
const work = (m, g = 2300, F = 170000) => Array.from({ length: m }, (_, i) => F + g * (i + 1));
const main = (m) => [...orient, ...work(m)];

function run(input, extraEnv = {}) {
  const r = spawnSync(process.execPath, [HOOK], { input: typeof input === 'string' ? input : JSON.stringify(input), env: { ...ENV, ...extraEnv }, encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
function show(file, kind) {
  const r = spawnSync(process.execPath, [HOOK, '--show', file, ...(kind === true ? ['helper'] : kind ? [kind] : [])], { env: ENV, encoding: 'utf8' });
  return JSON.parse(r.stdout);
}
const SESS = '11111111-2222-3333-4444-555555555555';
function pre(tp, tool, input = {}, more = {}) {
  return { session_id: SESS, transcript_path: tp, cwd: ROOT, scratchpad_dir: join(T, 'scratch'), permission_mode: 'default',
    hook_event_name: 'PreToolUse', tool_name: tool, tool_input: input, tool_use_id: 'toolu_x', ...more };
}
const near = (a, b, tol = 600) => Math.abs(a - b) <= tol;

// ---- the formula ----
const tpMain = join(PROJ, 'm1.jsonl');
transcript(tpMain, main(30), { noise: true });
let s = show(tpMain, 'coordinator');
ok(near(s.F, 170000) && near(s.R, 2125000, 20) && near(s.g, 2300, 1), 'F, R and g read from the transcript', JSON.stringify(s));
ok(near(s.Wstar, 268900), 'W* = F + sqrt(2 R g)', s.WstarK);
ok(near(s.hard, 291900) && near(s.warn, 268900), 'hard line W* + 10 g, warning at W*', `${s.hardK} ${s.warnK}`);
ok(s.calls === 47, 'two content blocks of one call, a sidechain line and a synthetic line are not calls', String(s.calls));
// r57-0171: F 169 K, R 2.33 M, g 1.3-2.3 K give W* 247-273 K.
for (const [g, w] of [[1300, 246800], [2300, 272500]]) {
  const f = join(PROJ, `r171-${g}.jsonl`);
  const o = [...Array(16).fill(Math.round((2330000 - 169000) / 16)), 169000];
  transcript(f, [...o, ...work(10, g, 169000)]);
  const x = show(f, 'coordinator');
  ok(near(x.Wstar, w, 1000), `r57-0171 reproduced at g ${g}`, x.WstarK);
}
// Fable: no setting, the 1M family window, so the compaction cap does not bind.
const tpFable = join(PROJ, 'fable.jsonl');
transcript(tpFable, main(30), { model: 'claude-fable-1' });
s = show(tpFable, 'coordinator');
ok(s.window === 1000000 && near(s.hard, 291900), 'Fable: 1M window, hard line from W*', JSON.stringify({ w: s.window, h: s.hardK }));
// Unknown model: no compaction cap, W* still applies.
const tpUnk = join(PROJ, 'unk.jsonl');
transcript(tpUnk, main(30), { model: 'claude-other-9' });
s = show(tpUnk, 'coordinator');
ok(s.window === null && near(s.hard, 291900), 'unknown window: W* only', JSON.stringify({ w: s.window, h: s.hardK }));
// Compaction cap binds when W* is far: orientation to 300 K, then slow growth.
const tpCap = join(PROJ, 'cap.jsonl');
transcript(tpCap, [...Array.from({ length: 17 }, (_, i) => 100000 + i * 12500), ...work(20, 2000, 300000)]);
s = show(tpCap, 'coordinator');
ok(near(s.hard, 368000 - 20000, 50) && near(s.warn, 368000 - 40000, 50), 'line held 10 calls under the 368 K compaction', `${s.hardK} ${s.warnK}`);

// ---- decisions of the main session ----
let r = run(pre(tpMain, 'Agent', { description: 'x', prompt: 'y', model: 'opus' }));
ok(r.code === 0 && r.out === '', 'below the warning line: passes silently', JSON.stringify(r));
const tpNotice = join(PROJ, 'm2.jsonl');
transcript(tpNotice, main(45)); // 273.5 K
r = run(pre(tpNotice, 'Bash', { command: 'npm test' }));
let ctxNote = ''; try { ctxNote = JSON.parse(r.out).hookSpecificOutput.additionalContext; } catch {}
ok(r.code === 0 && /Window ceiling: context 274 K/.test(ctxNote) && /hard line 292 K/.test(ctxNote), 'between the lines: passes with a notice', r.out);
const tpOver = join(PROJ, 'm3.jsonl');
transcript(tpOver, main(60)); // 308 K
r = run(pre(tpOver, 'Agent', { description: 'build: x', prompt: 'y', model: 'opus' }));
ok(r.code === 2 && /window ceiling/.test(r.err) && /line of 292 K/.test(r.err) && r.err.trim().split('\n').length === 1, 'above the line: a new helper is refused in one line', r.err);

const allowed = [
  ['Write', { file_path: 'research-tree/build/TOP-STATE.md', content: 'x' }],
  ['Write', { file_path: ROOT.replace(/\//g, '\\') + '\\research-tree\\build\\STATE.md', content: 'x' }],
  ['Edit', { file_path: ROOT + '/research-tree/build/TOP8-STATE.md', old_string: 'a', new_string: 'b' }],
  ['Write', { file_path: ROOT + '/research-tree/build/briefs/TOP9.md', content: 'x' }],
  ['Write', { file_path: ROOT + '/research-tree/build/units/T8-CEIL/result.md', content: 'x' }],
  ['Write', { file_path: 'C:\\Users\\User\\AppData\\Local\\Claude-Data\\claude_x\\side-session-notes\\local_y\\note.md', content: 'x' }],
  ['Write', { file_path: join(T, 'scratch', 'msg.txt'), content: 'x' }],
  ['Read', { file_path: ROOT + '/research-tree/build/TOP-STATE.md' }],
  ['Bash', { command: 'git status' }],
  ['Bash', { command: `cd ${ROOT} && git add research-tree/build/TOP-STATE.md && git commit -F msg.txt` }],
  ['Bash', { command: "git -c core.longpaths=true commit -F - <<'EOF'\nTop session 8: hand-over; it's done > here\n\nCo-Authored-By: x\nEOF" }],
  ['Bash', { command: 'node tools/journal.mjs add --dry-run 2>&1' }],
  ['Bash', { command: 'git log --oneline -3 | head -3' }],
  ['Bash', { command: 'date -u' }],
  ['PowerShell', { command: "git commit -m @'\nhand-over\n'@" }],
  ['mcp__ccd_session__start_session', { title: 'orchestrate: top session 9' }],
  ['mcp__ccd_session__hand_off_to_session', { title: 'x', remaining_plan: 'y' }],
  ['mcp__ccd_turn__wrap_up', { recap: 'x' }],
  ['mcp__ccd_turn__update_plan', { advance: true }],
  ['SubagentHandback', { message: 'x' }],
  ['TaskStop', { task_id: 'x' }],
  ['Bash', { command: 'node .claude/hooks/window-ceiling.mjs --test-off' }],
  ['Bash', { command: `node "${ROOT}/.claude/hooks/window-ceiling.mjs" --show "C:/x/y.jsonl"` }],
  ['ToolSearch', { query: 'select:mcp__ccd_session__start_session' }],
  ['AskUserQuestion', { questions: [] }],
  ['SendMessage', { to: 'a1', message: 'Stop at a quiet point and write your checkpoint.' }],
];
for (const [tool, input] of allowed) {
  r = run(pre(tpOver, tool, input));
  ok(r.code === 0, `above the line passes: ${tool} ${JSON.stringify(input).slice(0, 70)}`, r.err);
}
const refused = [
  ['Task', { description: 'x', prompt: 'y' }],
  ['Grep', { pattern: 'x' }],
  ['Glob', { pattern: '*' }],
  ['WebFetch', { url: 'https://example.com', prompt: 'x' }],
  ['Skill', { skill: 'x' }],
  ['mcp__ccd_session__mark_chapter', { title: 'x' }],
  ['Read', { file_path: ROOT + '/library/INDEX.md' }],
  ['Write', { file_path: ROOT + '/.claude/hooks/x.mjs', content: 'x' }],
  ['Write', { file_path: ROOT + '/research-tree/build/NEXT-STEP.md', content: 'x' }],
  ['Write', { file_path: ROOT + '/research-tree/build/briefs/sub/x.md', content: 'x' }],
  ['Edit', { file_path: ROOT + '/library/journal/2026-11-24/r57.jsonl', old_string: 'a', new_string: 'b' }],
  ['Bash', { command: 'npm test' }],
  ['Bash', { command: 'git status; rm -rf x' }],
  ['Bash', { command: 'git commit -m "$(cat x)"' }],
  ['Bash', { command: 'git commit -m `cat x`' }],
  ['Bash', { command: 'cat foo > research-tree/build/STATE.md' }],
  ['Bash', { command: "cat <<'EOF' > research-tree/build/STATE.md\nx\nEOF" }],
  ['Bash', { command: 'node -e "1"' }],
  ['Bash', { command: 'node .claude/hooks/window-ceiling.mjs --test x 0.9 600' }],
  ['Bash', { command: 'git push' }],
  ['Bash', { command: 'git log | head file.txt' }],
  ['Bash', { command: 'git status && node tools/other.mjs' }],
  ['PowerShell', { command: 'Get-Content library/INDEX.md' }],
  ['SendMessage', { to: 'a1', message: 'Also build the next part.' }],
];
for (const [tool, input] of refused) {
  r = run(pre(tpOver, tool, input));
  ok(r.code === 2 && /window ceiling/.test(r.err), `above the line refused: ${tool} ${JSON.stringify(input).slice(0, 70)}`, `${r.code} ${r.err}`);
}

// ---- helpers: judged by their own transcript, not the parent's ----
const parentSmall = join(PROJ, `${SESS}.jsonl`);
transcript(parentSmall, main(5));
const AG = 'a90398e8cb7dc7006';
const own = join(PROJ, SESS, 'subagents', `agent-${AG}.jsonl`);
const helperCtx = (n) => Array.from({ length: n }, (_, i) => 60000 + 3800 * i); // checkpoint 368 - 38 = 330 K
transcript(own, helperCtx(75), { side: true }); // 341.2 K
s = show(own, true);
ok(near(s.hard, 330000, 50) && near(s.warn, 292000, 50), 'helper: checkpoint 330 K at 3.8 K a call (section 5)', `${s.hardK} ${s.warnK}`);
r = run(pre(parentSmall, 'Agent', { description: 'x', prompt: 'y', model: 'haiku' }, { agent_id: AG, agent_type: 'general-purpose' }));
ok(r.code === 2 && /helper's line of 330 K/.test(r.err), 'helper above its own line, parent below: refused', r.err);
r = run(pre(parentSmall, 'Write', { file_path: ROOT + '/research-tree/build/units/X/result.md', content: 'x' }, { agent_id: AG }));
ok(r.code === 0, 'helper above its line may write its result', r.err);
r = run(pre(parentSmall, 'SubagentHandback', { message: 'LIMIT' }, { agent_id: AG }));
ok(r.code === 0, 'helper above its line may hand back', r.err);
r = run(pre(own, 'Agent', { description: 'x' }, { agent_id: AG })); // transcript_path already the helper's own file
ok(r.code === 2, 'helper whose transcript_path is its own file: judged by it', r.err);
const parentBig = join(PROJ, '99999999-2222-3333-4444-555555555555.jsonl');
transcript(parentBig, main(60));
const own2 = join(PROJ, '99999999-2222-3333-4444-555555555555', 'subagents', 'agent-abc123.jsonl');
transcript(own2, helperCtx(10), { side: true });
r = run(pre(parentBig, 'Bash', { command: 'npm test' }, { agent_id: 'abc123' }));
ok(r.code === 0 && r.out === '', 'parent above its line, helper small: the helper works on', r.err);
r = run(pre(parentBig, 'Bash', { command: 'npm test' }, { agent_id: 'nofile1' }));
ok(r.code === 0, 'helper with no transcript of its own: passes (logged src none)', r.err);
const logTxt = () => readFileSync(join(LOGDIR, 'window-ceiling.jsonl'), 'utf8');
ok(/"src":"none"/.test(logTxt()) && /"src":"derived"/.test(logTxt()), 'log names where the helper transcript came from');

// ---- compaction: a new segment ----
const tpComp = join(PROJ, 'comp.jsonl');
transcript(tpComp, [...main(60), ...Array.from({ length: 5 }, (_, i) => 100000 + 2000 * i)], { boundaryBefore: 77 });
s = show(tpComp);
ok(s.seg === 1 && s.ctx === 108000 && s.hard > s.ctx, 'after a compaction the session is judged from its new segment', JSON.stringify({ seg: s.seg, ctx: s.ctx, hard: s.hardK }));
r = run(pre(tpComp, 'Agent', { description: 'x' }));
ok(r.code === 0, 'after a compaction a call below the line passes', r.err);

// ---- never blocks by accident ----
ok(run('not json').code === 0, 'unreadable input passes');
ok(run(pre(join(PROJ, 'missing.jsonl'), 'Agent', {})).code === 0, 'missing transcript passes');
ok(run({ ...pre(tpOver, 'Agent', {}), hook_event_name: 'PostToolUse' }).code === 0, 'other events pass');
ok(run({ ...pre(tpOver, 'Agent', {}), transcript_path: undefined }).code === 0, 'no transcript_path passes');
const tpEmpty = join(PROJ, 'empty.jsonl'); writeFileSync(tpEmpty, '{"type":"user"}\n');
ok(run(pre(tpEmpty, 'Agent', {})).code === 0, 'a transcript with no call yet passes');

// ---- incremental reading gives what a full reading gives ----
const tpInc = join(PROJ, 'inc.jsonl');
transcript(tpInc, main(30));
ok(run(pre(tpInc, 'Agent', {})).code === 0, 'incremental: first reading below the line');
appendFileSync(tpInc, work(30).slice(29).length ? [...work(60)].slice(30).map((c, i) => callLines(47 + i, c)).join('') : '');
appendFileSync(tpInc, '{"type":"assistant","message":{"id":"msg_partial"'); // a line still being written
r = run(pre(tpInc, 'Agent', {}));
const full = show(tpInc, 'coordinator');
const last = logTxt().trim().split('\n').map((l) => JSON.parse(l)).filter((x) => x.ctx).pop();
ok(r.code === 2 && last.ctx === full.ctx && last.line === Math.round(full.hard), 'incremental reading equals a full reading', JSON.stringify({ last, full: full.hard }));

// ---- the test scale: only for the named session, only while it lasts, only lower ----
const testFile = join(LOGDIR, 'window-ceiling-test.json');
const future = new Date(Date.now() + 600000).toISOString(), past = new Date(Date.now() - 1000).toISOString();
writeFileSync(testFile, JSON.stringify({ session: SESS, scale: 0.5, expires: future }));
r = run(pre(tpMain, 'Agent', {}));
ok(r.code === 2 && /test scale 0.5/.test(r.err), 'test scale for this session lowers the line', r.err);
ok(/"test":0.5/.test(logTxt()), 'a use of the test scale is logged');
r = run({ ...pre(tpMain, 'Agent', {}), session_id: 'aaaaaaaa-other' });
ok(r.code === 0, 'test scale does not touch another session', r.err);
r = run(pre(parentSmall, 'Agent', {}, { agent_id: AG }));
ok(r.code === 0 || !/test scale/.test(r.err), 'test scale for the main session does not touch its helpers', r.err);
writeFileSync(testFile, JSON.stringify({ session: SESS, scale: 0.5, expires: past }));
ok(run(pre(tpMain, 'Agent', {})).code === 0, 'an expired test scale is ignored');
writeFileSync(testFile, JSON.stringify({ scale: 0.5, expires: future }));
ok(run(pre(tpMain, 'Agent', {})).code === 0, 'a test scale naming no session is ignored');
writeFileSync(testFile, JSON.stringify({ session: SESS, scale: 3, expires: future }));
r = run(pre(tpOver, 'Agent', {}));
ok(r.code === 2, 'a scale above 1 is ignored: it cannot raise the line', r.err);
const cli = (args) => spawnSync(process.execPath, [HOOK, ...args], { env: ENV, encoding: 'utf8' });
ok(cli(['--test', SESS, '0.4', '5']).status === 0 && JSON.parse(readFileSync(testFile, 'utf8')).scale === 0.4, '--test writes the file with its expiry');
ok(cli(['--test', SESS, '1.5', '5']).status === 1, '--test refuses a scale that would raise the line');
ok(cli(['--test-off']).status === 0 && !existsSync(testFile), '--test-off removes it');

// ---- T8-FIX, B1: one early large result does not put the line below the context ----
// research-tree/build/refute/TOP8.md B1: a helper at 30 K then 75 K got the line -82 K and was told to return LIMIT.
const AGB = 'b1b1b1b1b1b1b1b1b';
const ownB1 = join(PROJ, SESS, 'subagents', `agent-${AGB}.jsonl`);
transcript(ownB1, [30000, 75000], { side: true });
r = run(pre(parentSmall, 'Read', { file_path: ROOT + '/CLAUDE.md' }, { agent_id: AGB }));
s = show(ownB1, true);
ok(r.code === 0 && r.out === '' && near(s.hard, 330000, 50) && s.gFrom === 'recorded', 'B1: a helper jumping 30 K -> 75 K at call 2 works on (line 330 K at the recorded 3.8 K)', `${r.code} ${r.err} ${s.hardK}`);
const tpB1 = join(PROJ, 'b1-main.jsonl');
transcript(tpB1, [30000, 70000]);
r = run(pre(tpB1, 'Read', { file_path: ROOT + '/CLAUDE.md' }));
ok(r.code === 0 && r.out === '', 'B1: a coordinator jumping 30 K -> 70 K at call 2 works on', `${r.code} ${r.err}`);
const tpB1c = join(PROJ, 'b1-after-orient.jsonl');
transcript(tpB1c, [...orient, 230000]); // a 60 K helper result at the first work call
r = run(pre(tpB1c, 'Agent', { description: 'x', prompt: 'y' }));
s = show(tpB1c, 'coordinator');
ok(r.code === 0 && s.hard > s.ctx, 'B1: a coordinator taking a 60 K result at its first work call works on', `${r.code} ${r.err} ${s.hardK}`);
const tpB1comp = join(PROJ, 'b1-comp.jsonl');
transcript(tpB1comp, [...main(60), 141000, 160000, 230000], { boundaryBefore: 77 }); // re-reads right after a compaction
r = run(pre(tpB1comp, 'Grep', { pattern: 'x' }));
ok(r.code === 0, 'B1: the re-reads after a compaction (141 K -> 230 K in 3 calls) do not refuse', `${r.code} ${r.err}`);
// The mechanism still acts: after 17 calls of its own, a helper growing 13 K a call is stopped 10 calls short of 368 K.
const AGF = 'f1f1f1f1f1f1f1f1f';
const ownF = join(PROJ, SESS, 'subagents', `agent-${AGF}.jsonl`);
transcript(ownF, Array.from({ length: 20 }, (_, i) => 60000 + 13000 * i), { side: true }); // 307 K
s = show(ownF, true);
r = run(pre(parentSmall, 'Bash', { command: 'npm test' }, { agent_id: AGF }));
ok(r.code === 2 && s.gFrom === 'own' && near(s.g, 13000, 1) && near(s.hard, 238000, 50) && /helper's line of 238 K/.test(r.err), 'B1: after 17 own calls the helper\'s own growth sets the line (368 - 10 x 13 K)', `${r.code} ${s.hardK} ${r.err}`);

// ---- T8-FIX, B3: W* only for a session a state file names as coordinating ----
const OTHER = '33333333-2222-3333-4444-555555555555';
r = run({ ...pre(tpOver, 'Agent', { description: 'build: x', prompt: 'y' }), session_id: OTHER });
ok(r.code === 0, 'B3: a session no state file names (the owner\'s own, a child) is not held to the coordinator\'s 292 K', `${r.code} ${r.err}`);
const tpB3 = join(PROJ, 'b3.jsonl');
transcript(tpB3, [...orient, ...work(43, 3800)]); // 333 K at 3.8 K a call
r = run({ ...pre(tpB3, 'Agent', { description: 'build: x', prompt: 'y' }), session_id: OTHER });
ok(r.code === 2 && /session's line of 330 K/.test(r.err) && /checkpoint/.test(r.err), 'B3: such a session gets the checkpoint, 330 K', r.err);
r = run({ ...pre(tpOver, 'Agent', { description: 'build: x', prompt: 'y' }), session_id: '22222222-2222-3333-4444-555555555555' });
ok(r.code === 0, 'B3: "kind orchestrate" on a line that does not name the session as "Session <id>" with it does not count', `${r.code} ${r.err}`);
writeFileSync(join(BUILD, 'ROOT-STATE.md'), 'Root session 44444444-2222-3333-4444-555555555555 (Opus, kind orchestrate), main checkout.\n');
r = run({ ...pre(tpOver, 'Agent', { description: 'build: x', prompt: 'y' }), session_id: '44444444-2222-3333-4444-555555555555' });
ok(r.code === 2 && /coordinator's line of 292 K/.test(r.err), 'B3: a root named with its full id is a coordinator (STATE.md form)', r.err);
ok(/"kind":"coordinator","by":"ROOT-STATE.md"/.test(logTxt()) && /"kind":"session"/.test(logTxt()), 'B3: the log says which form judged the call and which file named a coordinator');

console.log(`window-ceiling: ${pass} passed, ${fail} failed (${pass + fail} cases)`);
try { rmSync(T, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
