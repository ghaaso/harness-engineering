// Tests of count-gate.mjs (2026-11-24, unit T8-COUNT; fixes B2 and B4 and two message faults, unit T8-FIX).
// Run: node .claude/hooks/count-gate.test.mjs   (another hook file: COUNT_GATE_HOOK=count-gate.next.mjs node ...)
// The Rust program kit-count-gate: KIT_HOOK_BIN_DIR=<folder of built programs> node .claude/hooks/count-gate.test.mjs
// Each case copies the hook into a temporary folder (its own WIDTHS.md and log) and makes a session folder shaped as
// the app writes it (<project>/<session>.jsonl, <project>/<session>/subagents/agent-<id>.meta.json and .jsonl, meta
// fields as in this repository's sessions of 2026-11-19 to 24), sets file times, feeds the hook a PreToolUse input on
// stdin as the app sends it and checks the exit code (0 allow, 2 refuse) and the message. Nothing in the repository
// is written. The case "2026-11-23 replayed" rebuilds the moment the app refused 9 of 16 reviewer starts; the case
// "old hooks" shows the plan gate let the 21st start through.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync, existsSync, utimesSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runHook, hookCommand } from './hook-under-test.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const made = [];
after(() => { for (const d of made) rmSync(d, { recursive: true, force: true }); });
const MIN = 60000;
const env = { ...process.env };
delete env.CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS;

function fixture(widths) {
  const dir = mkdtempSync(join(tmpdir(), 'count-gate-'));
  made.push(dir);
  const r = join(dir, 'repo');
  mkdirSync(join(r, '.claude', 'hooks'), { recursive: true });
  copyFileSync(resolve(here, process.env.COUNT_GATE_HOOK || 'count-gate.mjs'), join(r, '.claude', 'hooks', 'count-gate.mjs'));
  if (existsSync(resolve(here, 'kit-mode.mjs'))) copyFileSync(resolve(here, 'kit-mode.mjs'), join(r, '.claude', 'hooks', 'kit-mode.mjs'));
  mkdirSync(join(r, 'research-tree', 'build'), { recursive: true });
  if (widths != null) writeFileSync(join(r, 'research-tree', 'build', 'WIDTHS.md'), widths);
  const sid = 'aaaabbbb-1111-2222-3333-444455556666';
  const proj = join(dir, 'proj');
  const sub = join(proj, sid, 'subagents');
  mkdirSync(sub, { recursive: true });
  writeFileSync(join(proj, `${sid}.jsonl`), '{}\n');
  return { dir, r, sid, proj, sub, hook: join(r, '.claude', 'hooks', 'count-gate.mjs'), log: join(r, '.claude', 'logs', 'count-gate.jsonl'), seq: 0 };
}
// One helper as the app records it. ago: minutes since its transcript was last written; metaAgo: since its meta was
// (default: written when it started, 1 min before its last transcript write unless finished, then with it).
function helper(fx, id, { desc = `analyse: unit ${id}`, finished = false, parent = null, depth = parent ? 2 : 1, ago = 0.2, metaAgo, tu } = {}) {
  const now = Date.now();
  const meta = { agentType: 'general-purpose', isBuiltIn: true, description: desc, toolUseId: tu || `toolu_h_${id}`,
    ...(parent ? { parentAgentId: parent } : {}), spawnDepth: depth, requestShape: 'background', model: 'opus', ...(finished ? { finished: true } : {}) };
  const mp = join(fx.sub, `agent-${id}.meta.json`), tp = join(fx.sub, `agent-${id}.jsonl`);
  writeFileSync(mp, JSON.stringify(meta));
  writeFileSync(tp, JSON.stringify({ agentId: id, type: 'user', message: { role: 'user', content: 'x' } }) + '\n');
  const tT = (now - ago * MIN) / 1000;
  const mT = metaAgo != null ? (now - metaAgo * MIN) / 1000 : finished ? tT : tT - 60;
  utimesSync(tp, tT, tT);
  utimesSync(mp, mT, mT);
}
function input(fx, description, extra = {}) {
  return { session_id: fx.sid, transcript_path: join(fx.proj, `${fx.sid}.jsonl`), cwd: fx.r, permission_mode: 'default',
    hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: `toolu_t${++fx.seq}_${Date.now()}`,
    tool_input: { description, prompt: 'x', subagent_type: 'general-purpose', model: 'opus', run_in_background: true }, ...extra };
}
function run(fx, obj, e = env) {
  const r = runHook(fx.hook, [], { input: typeof obj === 'string' ? obj : JSON.stringify(obj), encoding: 'utf8', env: e, timeout: 20000 });
  return { code: r.status, err: r.stderr || '', out: r.stdout || '' };
}
// Starts the hook at once but sends its input only when `go` resolves, so a batch reaches the count together.
function runAsync(fx, obj, go = Promise.resolve()) {
  return new Promise((res) => {
    const c = hookCommand(fx.hook);
    const p = spawn(c.cmd, c.args, { env });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => res({ code, err }));
    go.then(() => p.stdin.end(JSON.stringify(obj)));
  });
}
const logLines = (fx) => (existsSync(fx.log) ? readFileSync(fx.log, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
function many(fx, n, opts = {}) { for (let k = 0; k < n; k++) helper(fx, `a${String(k).padStart(15, '0')}`, opts); }

test('nothing running: a start passes and is logged with the count', () => {
  const fx = fixture();
  const r = run(fx, input(fx, 'analyse: one'));
  assert.equal(r.code, 0, r.err);
  const l = logLines(fx).at(-1);
  assert.equal(l.ev, 'allow'); assert.equal(l.n, 0); assert.equal(l.limit, 20);
});

test('count: running helpers and their helpers count; finished ones do not', () => {
  const fx = fixture();
  helper(fx, 'p1'); helper(fx, 'p2');
  helper(fx, 'c1', { parent: 'p1' }); helper(fx, 'c2', { parent: 'p1', finished: true });
  helper(fx, 'f1', { finished: true });
  assert.equal(run(fx, input(fx, 'analyse: x')).code, 0);
  assert.equal(logLines(fx).at(-1).n, 3);
});

test('limit: 20 running (5 helpers and 15 of their helpers) refuses the 21st; 19 lets it through', () => {
  const fx = fixture();
  for (let k = 0; k < 5; k++) helper(fx, `p${k}`);
  for (let k = 0; k < 15; k++) helper(fx, `c${k}`, { parent: `p${k % 5}` });
  const r = run(fx, input(fx, 'orchestrate: wave2 f4c memory'));
  assert.equal(r.code, 2);
  assert.match(r.err, /^count gate: 20 helpers run in this session now \(15 of them started by helpers\).*allows 20 at once.*number 21/);
  assert.equal(r.err.trim().split('\n').length, 1);
  const fx2 = fixture();
  many(fx2, 19);
  assert.equal(run(fx2, input(fx2, 'analyse: x')).code, 0);
});

test('the limit follows CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS when it is set', () => {
  const fx = fixture();
  many(fx, 5);
  assert.equal(run(fx, input(fx, 'analyse: x'), { ...env, CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: '5' }).code, 2);
  assert.equal(run(fx, input(fx, 'analyse: x'), { ...env, CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: '6' }).code, 0);
  assert.equal(run(fx, input(fx, 'analyse: x'), { ...env, CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: 'many' }).code, 0); // not a number: 20
});

test('stale: a helper silent past 10.8 min with no writing helper below it expires; at 10 min it still counts', () => {
  const fx = fixture();
  many(fx, 19);
  helper(fx, 'dead', { ago: 11 }); // killed by an app restart: no "finished", silent 11 min
  assert.equal(run(fx, input(fx, 'analyse: x')).code, 0);
  const fx2 = fixture();
  many(fx2, 19);
  helper(fx2, 'slow', { ago: 10 }); // a long model response: still running
  const r = run(fx2, input(fx2, 'analyse: x'));
  assert.equal(r.code, 2);
  // T8-FIX: no running helper is named for --end (each one counted wrote within 10.8 min); the command is given bare
  assert.doesNotMatch(r.err, /--end slow/);
  assert.match(r.err, /drops out after 10\.8 min silent; to end one at once: node \.claude\/hooks\/count-gate\.mjs --end <id> "<why>" \(ids and silences: --status aaaabbbb\)\.$/m);
});

test('a silent helper whose own helper wrote recently still counts', () => {
  const fx = fixture();
  many(fx, 18);
  helper(fx, 'boss', { ago: 15, desc: 'orchestrate: wave2 f2e graphs' });
  helper(fx, 'kid', { parent: 'boss', ago: 1 });
  assert.equal(run(fx, input(fx, 'analyse: x')).code, 2);
});

test('revived: a finished helper written again after its meta counts; one written with its meta does not', () => {
  const fx = fixture();
  many(fx, 19);
  helper(fx, 'back', { finished: true, ago: 0.1, metaAgo: 3 }); // revived by a notice or a message 3 min after it stopped
  assert.equal(run(fx, input(fx, 'analyse: x')).code, 2);
  const fx2 = fixture();
  many(fx2, 19);
  helper(fx2, 'done', { finished: true, ago: 3 });
  assert.equal(run(fx2, input(fx2, 'analyse: x')).code, 0);
});

test('pending: a start admitted seconds ago counts until its meta shows, and not after 16.7 s', () => {
  const fx = fixture();
  many(fx, 18);
  const a = input(fx, 'analyse: first');
  assert.equal(run(fx, a).code, 0); // 19th: admitted, no meta yet
  assert.equal(run(fx, input(fx, 'analyse: second')).code, 0); // 20th
  assert.equal(run(fx, input(fx, 'analyse: third')).code, 2); // would be 21st
  // the first one's meta shows: counted once, not twice
  helper(fx, 'first0000000000', { tu: a.tool_use_id });
  const r = run(fx, input(fx, 'analyse: fourth'));
  assert.equal(r.code, 2);
  assert.match(r.err, /19 helpers run in this session now.*1 were just admitted/);
  // an admission older than 16.7 s whose helper never showed (another hook refused it) no longer counts
  const fx2 = fixture();
  many(fx2, 19);
  mkdirSync(dirname(fx2.log), { recursive: true });
  appendFileSync(fx2.log, JSON.stringify({ t: Date.now() - 17000, ev: 'allow', sess: fx2.sid, tu: 'toolu_old', desc: 'x', n: 19, limit: 20 }) + '\n');
  assert.equal(run(fx2, input(fx2, 'analyse: x')).code, 0);
});

test('2026-11-23 replayed: 13 running and a batch of 16 at once: 7 pass, 9 are refused, as the app did', async () => {
  const fx = fixture();
  for (let k = 0; k < 4; k++) helper(fx, `top${k}`, { desc: `analyse: replay-L${k} x` });
  for (let k = 0; k < 9; k++) helper(fx, `rev${k}`, { parent: 'top0', desc: `refute: replay-L6 c0${k}-A` });
  const by = 'top0';
  const batch = [];
  for (let k = 0; k < 16; k++) batch.push(input(fx, `refute: replay-L6 c1${k}-B`, { agent_id: by, agent_type: 'general-purpose', transcript_path: join(fx.sub, `agent-${by}.jsonl`) }));
  const go = new Promise((res) => setTimeout(res, 1500)); // every process started and waiting on its input
  const rs = await Promise.all(batch.map((b) => runAsync(fx, b, go)));
  assert.equal(rs.filter((r) => r.code === 0).length, 7, rs.map((r) => r.code).join(','));
  assert.equal(rs.filter((r) => r.code === 2).length, 9);
  for (const r of rs.filter((x) => x.code === 2)) assert.match(r.err, /number 21/);
});

// The two cases that read this PC's research-tree/build/plan.json and WIDTHS.md skip, saying so, in a clone without them.
const PLAN = resolve(repo, 'research-tree', 'build', 'plan.json'), REAL_WIDTHS = resolve(repo, 'research-tree', 'build', 'WIDTHS.md');
const noPlan = !existsSync(PLAN) && 'research-tree/build/plan.json (the owner\'s plan) is not in this clone';
const noWidths = !existsSync(REAL_WIDTHS) && 'research-tree/build/WIDTHS.md (the owner\'s widths) is not in this clone';

test('old hooks: the plan gate lets the 21st start through (nothing counted before this gate)', { skip: noPlan }, () => {
  const fx = fixture();
  many(fx, 20);
  const pg = join(fx.r, '.claude', 'hooks', 'plan-gate.mjs');
  copyFileSync(resolve(here, 'plan-gate.mjs'), pg);
  copyFileSync(PLAN, join(fx.r, 'research-tree', 'build', 'plan.json'));
  const old = spawnSync(process.execPath, [pg], { input: JSON.stringify(input(fx, 'orchestrate: wave2 f4c memory')), encoding: 'utf8' });
  assert.equal(old.status, 0);
  assert.equal(run(fx, input(fx, 'orchestrate: wave2 f4c memory')).code, 2);
});

const HOLD = '# Widths\nProse lines are ignored, including the word width "in quotes" mid-line.\n' +
  '- hold "orchestrate: wave2 *" while "*replay-*": RUN:run/WAVE2.md section 2 says "start no part while the replays run" (2026-11-23)\n';

test('declared hold: no part while a replay runs (the 2026-11-23 break); other helpers pass; lifted when the replays end', () => {
  const fx = fixture(HOLD);
  helper(fx, 'r1', { desc: 'analyse: replay-L8 type checker and lint gate' });
  const r = run(fx, input(fx, 'orchestrate: wave2 f4c memory'));
  assert.equal(r.code, 2);
  assert.match(r.err, /held while "\*replay-\*" runs \(WIDTHS\.md line 3: .*running: r1 "analyse: replay-L8/);
  assert.equal(run(fx, input(fx, 'analyse: judge the replays')).code, 0);
  const fx2 = fixture(HOLD);
  helper(fx2, 'r1', { desc: 'analyse: replay-L8 type checker and lint gate', finished: true, ago: 1 });
  assert.equal(run(fx2, input(fx2, 'orchestrate: wave2 f4c memory')).code, 0);
});

test('declared width: three parts at once; the fourth waits; a nested reader with another description is not a part', () => {
  const fx = fixture('width "orchestrate: wave2 f*" 3: WIDEN.md D7, 20 helpers a session / a part\'s peak of 6\n');
  for (const p of ['f2e', 'f3c', 'f4c']) helper(fx, `p${p}`, { desc: `orchestrate: wave2 ${p} x` });
  helper(fx, 'reader', { parent: 'pf2e', desc: 'collect: f2e incremental-graphrag' });
  const r = run(fx, input(fx, 'orchestrate: wave2 f3d encoders'));
  assert.equal(r.code, 2);
  assert.match(r.err, /declared width 3 \(WIDTHS\.md line 1: .*3 run now \(pf2e, pf3c, pf4c\)/);
  assert.equal(run(fx, input(fx, 'collect: f3c learned-fusion', { agent_id: 'pf3c' })).code, 0);
});

test('a declaration that does not parse refuses every start, naming its line', () => {
  for (const bad of ['width "analyse: *" 2: the plan says so\n', 'hold "a*" "b*": RUN plan line 12\n', 'width "analyse: *": RUN plan line 12\n', 'hold "" while "b": RUN plan line 12\n']) {
    const fx = fixture('ok\n' + bad);
    const r = run(fx, input(fx, 'extract: anything'));
    assert.equal(r.code, 2, bad);
    assert.match(r.err, /WIDTHS\.md line 2 is not a declaration/);
  }
});

test('--end: a stale entry is ended by hand and counts again only if it writes after', () => {
  const fx = fixture();
  many(fx, 19);
  helper(fx, 'ghost', { ago: 2 });
  assert.equal(run(fx, input(fx, 'analyse: x')).code, 2);
  const e = runHook(fx.hook, ['--end', 'agent-ghost', 'killed by the app restart at 10:00'], { encoding: 'utf8' });
  assert.equal(e.status, 0, e.stderr);
  assert.equal(run(fx, input(fx, 'analyse: y')).code, 0);
  const fx2 = fixture();
  many(fx2, 19);
  helper(fx2, 'ghost', { ago: 2 });
  runHook(fx2.hook, ['--end', 'ghost', 'thought dead'], { encoding: 'utf8' });
  const tp = join(fx2.sub, 'agent-ghost.jsonl'); const t = Date.now() / 1000 + 2; utimesSync(tp, t, t); // it writes again
  assert.equal(run(fx2, input(fx2, 'analyse: y')).code, 2);
  assert.equal(runHook(fx2.hook, ['--end', 'ghost'], { encoding: 'utf8' }).status, 1); // a reason is required
});

test('SendMessage: to a running helper passes; reviving an ended one at the limit is refused; a name passes', () => {
  const fx = fixture();
  many(fx, 19);
  helper(fx, 'live');
  helper(fx, 'gone', { finished: true, ago: 5, desc: 'analyse: replay-L6 reviewer' });
  const send = (to) => input(fx, '', { tool_name: 'SendMessage', tool_input: { to, message: 'go on' } });
  assert.equal(run(fx, send('live')).code, 0);
  const r = run(fx, send('agent-gone'));
  assert.equal(r.code, 2);
  assert.match(r.err, /reviving gone would be number 21/);
  assert.equal(run(fx, send('main')).code, 0);
  assert.equal(run(fx, send('../../etc')).code, 0);
});

test('inside a helper: the input may name the helper\'s own transcript; the session is counted the same', () => {
  const fx = fixture();
  many(fx, 20);
  const r = run(fx, input(fx, 'collect: x', { agent_id: 'a000000000000000000', transcript_path: join(fx.sub, 'agent-a000000000000000000.jsonl') }));
  assert.equal(r.code, 2);
});

test('odd input passes at once: empty, not JSON, other events and tools, no transcript_path, a huge pattern', () => {
  const fx = fixture();
  many(fx, 20);
  for (const s of ['', 'not json', '[]', 'null']) assert.equal(run(fx, s).code, 0);
  assert.equal(run(fx, { ...input(fx, 'analyse: x'), hook_event_name: 'PostToolUse' }).code, 0);
  assert.equal(run(fx, { ...input(fx, 'analyse: x'), tool_name: 'Bash' }).code, 0);
  const noTp = input(fx, 'analyse: x'); delete noTp.transcript_path;
  assert.equal(run(fx, noTp).code, 0);
  assert.equal(logLines(fx).at(-1).ev, 'error');
  const fx2 = fixture(`width "${'*a'.repeat(400)}" 1: a pattern of 800 characters, line 1\n`);
  const t0 = Date.now();
  const r = run(fx2, input(fx2, 'a'.repeat(5000) + 'b'));
  assert.equal(r.code, 0);
  assert.ok(Date.now() - t0 < 5000, `took ${Date.now() - t0} ms`);
});

test('the repository\'s WIDTHS.md declares nothing yet; its indented and fenced examples are not declarations', { skip: noWidths }, () => {
  const real = readFileSync(REAL_WIDTHS, 'utf8');
  const fx = fixture(real + '\n```\nwidth "x" 0: an example in a fence, line 9\n```\n    hold "a" while "b": indented example\n');
  many(fx, 2);
  assert.equal(run(fx, input(fx, 'x')).code, 0);
  const s = runHook(fx.hook, ['--status', join(fx.proj, fx.sid)], { encoding: 'utf8' });
  assert.doesNotMatch(s.stdout, /BAD|WIDTHS\.md line/);
});

test('--status prints the count for a session folder', () => {
  const fx = fixture();
  many(fx, 2);
  const r = runHook(fx.hook, ['--status', join(fx.proj, fx.sid)], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /2 helpers running, 0 pending, 0 admitted and then refused; limit 20/);
});

// ---- unit T8-FIX ----
// The session's transcript as the app writes it: the start's tool_use line, then its result (an error when a later
// hook refused it).
function startLine(id, msg) {
  return JSON.stringify({ parentUuid: 'p', type: 'assistant', timestamp: new Date().toISOString(), message: { id: msg, role: 'assistant', content: [{ type: 'tool_use', id, name: 'Agent', input: { description: 'x' } }] } });
}
function resultLine(id, error) {
  return JSON.stringify({ parentUuid: 'p', type: 'user', timestamp: new Date().toISOString(), message: { role: 'user', content: [{ tool_use_id: id, type: 'tool_result', content: error ? 'PreToolUse:Agent hook error: fanout gate: no request has gone out since the meter reading' : 'started', ...(error ? { is_error: true } : {}) }] } });
}
// B2 (research-tree/build/refute/TOP8.md): a wave of 12 starts, each refused once by the fan-out gate after this gate
// admitted it, then retried; 8 of the retries have started. The 9th retry would be number 9, not 21.
function waveFixture(refusedInTranscript) {
  const fx = fixture();
  const now = Date.now();
  mkdirSync(dirname(fx.log), { recursive: true });
  let tr = '';
  for (let i = 0; i < 12; i++) {
    appendFileSync(fx.log, JSON.stringify({ t: now - 3000, ev: 'allow', sess: fx.sid, by: null, tu: 'toolu_first' + i, desc: 'read: part ' + i, n: i, limit: 20 }) + '\n');
    tr += startLine('toolu_first' + i, 'msg_1') + '\n';
  }
  for (let i = 0; i < 12; i++) if (refusedInTranscript) tr += resultLine('toolu_first' + i, true) + '\n';
  for (let i = 0; i < 8; i++) {
    helper(fx, 'r' + i, { desc: 'read: part ' + i, tu: 'toolu_retry' + i });
    appendFileSync(fx.log, JSON.stringify({ t: now - 1000, ev: 'allow', sess: fx.sid, by: null, tu: 'toolu_retry' + i, desc: 'read: part ' + i, n: 12 + i, limit: 20 }) + '\n');
    tr += startLine('toolu_retry' + i, 'msg_2') + '\n';
  }
  writeFileSync(join(fx.proj, fx.sid + '.jsonl'), tr);
  return fx;
}
test('B2: starts admitted here and then refused by a later hook are not pending; the retried wave goes on', () => {
  const fx = waveFixture(true);
  const r = run(fx, input(fx, 'read: part 8'));
  assert.equal(r.code, 0, r.err); // the old gate: "8 helpers run ... and 12 were just admitted ... number 21"
  assert.equal(logLines(fx).at(-1).n, 8);
});
test('B2: an admitted start with no error result still counts as pending (only a refusal drops it)', () => {
  const fx = waveFixture(false);
  const r = run(fx, input(fx, 'read: part 8'));
  assert.equal(r.code, 2);
  assert.match(r.err, /8 helpers run in this session now.*12 were just admitted.*number 21/);
});
test('B2: a start made by a helper is looked up in that helper\'s own transcript', () => {
  const fx = fixture();
  many(fx, 19);
  helper(fx, 'boss1', { desc: 'orchestrate: x' });
  mkdirSync(dirname(fx.log), { recursive: true });
  appendFileSync(fx.log, JSON.stringify({ t: Date.now() - 2000, ev: 'allow', sess: fx.sid, by: 'boss1', tu: 'toolu_kid', desc: 'read: kid', n: 19, limit: 20 }) + '\n');
  // 20 running and the kid's start pending: refused; once the boss's transcript holds the kid's refusal, 20 running: still refused at 21
  assert.equal(run(fx, input(fx, 'analyse: y')).code, 2);
  const fx2 = fixture();
  many(fx2, 18);
  helper(fx2, 'boss1', { desc: 'orchestrate: x' });
  mkdirSync(dirname(fx2.log), { recursive: true });
  appendFileSync(fx2.log, JSON.stringify({ t: Date.now() - 2000, ev: 'allow', sess: fx2.sid, by: 'boss1', tu: 'toolu_kid', desc: 'read: kid', n: 19, limit: 20 }) + '\n');
  appendFileSync(join(fx2.sub, 'agent-boss1.jsonl'), startLine('toolu_kid', 'msg_k') + '\n' + resultLine('toolu_kid', true) + '\n');
  assert.equal(run(fx2, input(fx2, 'analyse: y')).code, 0); // 19 running, the kid refused: this is number 20
  const fx3 = fixture();
  many(fx3, 18);
  helper(fx3, 'boss1', { desc: 'orchestrate: x' });
  mkdirSync(dirname(fx3.log), { recursive: true });
  appendFileSync(fx3.log, JSON.stringify({ t: Date.now() - 2000, ev: 'allow', sess: fx3.sid, by: 'boss1', tu: 'toolu_kid', desc: 'read: kid', n: 19, limit: 20 }) + '\n');
  appendFileSync(join(fx3.sub, 'agent-boss1.jsonl'), startLine('toolu_kid', 'msg_k') + '\n' + resultLine('toolu_kid', false) + '\n');
  assert.equal(run(fx3, input(fx3, 'analyse: y')).code, 2); // the kid started (no error): pending, this would be 21
});
test('a declared reason is shown whole, not cut inside its last word', () => {
  const reason = 'live check of the count gate on 2026-11-24, plan line TOP8-STATE live checks, 0 helpers';
  const fx = fixture(`width "extract: count-probe*" 0: ${reason}\n`);
  const r = run(fx, input(fx, 'extract: count-probe a'));
  assert.equal(r.code, 2);
  assert.ok(r.err.includes(reason + ')'), r.err); // the old gate cut it at 80 characters: "... live checks, 0 )"
});
test('B4: a lock left 1 s ago by a crashed check is taken over and the start is counted', () => {
  const fx = fixture();
  many(fx, 3);
  const lk = join(fx.r, '.claude', 'logs', 'count-gate.lock');
  mkdirSync(lk, { recursive: true });
  const old = (Date.now() - 1000) / 1000; utimesSync(lk, old, old);
  const r = run(fx, input(fx, 'analyse: after a crash'));
  assert.equal(r.code, 0, r.err);
  const l = logLines(fx).at(-1);
  assert.equal(l.ev, 'allow', JSON.stringify(l)); // the old gate (stale after 5 s, wait 4 s): "lock not taken in time: not counted"
  assert.equal(l.n, 3);
  assert.ok(Number.isFinite(l.hold) && Number.isFinite(l.wait), 'the log carries the lock wait and hold');
});
test('B4: a finished helper whose transcript was written 0.5 s after its meta was revived (0.1 s, t8-0101)', () => {
  const fx = fixture();
  many(fx, 19);
  const now = Date.now();
  helper(fx, 'quick', { finished: true, ago: 0.1 });
  const mp = join(fx.sub, 'agent-quick.meta.json'), tp = join(fx.sub, 'agent-quick.jsonl');
  utimesSync(mp, (now - 6500) / 1000, (now - 6500) / 1000);
  utimesSync(tp, (now - 6000) / 1000, (now - 6000) / 1000);
  assert.equal(run(fx, input(fx, 'analyse: x')).code, 2); // the old gate (1 s) did not count it: 20 would run
});

// ---- kit mode (harness kit, 2026-11-25): --harness-kit "--project=<folder>" ----
// Widths and holds from <project>/.harness/WIDTHS.md; log and lock under <project>/.claude/logs.
function kitFixture(widths) {
  const fx = fixture();
  fx.P = join(fx.dir, 'her-project');
  mkdirSync(join(fx.P, '.harness'), { recursive: true });
  if (widths != null) writeFileSync(join(fx.P, '.harness', 'WIDTHS.md'), widths);
  fx.args = ['--harness-kit', `--project=${fx.P}`];
  fx.kitLog = join(fx.P, '.claude', 'logs', 'count-gate.jsonl');
  return fx;
}
const kitRun = (fx, obj, extra = []) => {
  const r = runHook(fx.hook, [...fx.args, ...extra], { input: JSON.stringify(obj), encoding: 'utf8', env, timeout: 20000 });
  return { code: r.status, err: r.stderr || '' };
};
const W1 = 'width "build: *" 1: one builder at a time, the project has 1 test database\n';

test('kit: a width in <project>/.harness/WIDTHS.md refuses the second builder; a reader passes; the log is under the project', () => {
  const fx = kitFixture(W1);
  helper(fx, 'b1', { desc: 'build: first part' });
  const r = kitRun(fx, input(fx, 'build: second part'));
  assert.equal(r.code, 2);
  assert.match(r.err, /declared width 1 \(WIDTHS\.md line 1: one builder at a time/);
  assert.equal(kitRun(fx, input(fx, 'read: the schema')).code, 0);
  assert.ok(existsSync(fx.kitLog), 'log under <project>/.claude/logs');
  assert.ok(!existsSync(fx.log), 'nothing in the clone\'s log');
  assert.ok(!existsSync(join(fx.P, '.claude', 'logs', 'count-gate.lock')), 'the lock is released');
});

test('kit: without --harness-kit the project\'s WIDTHS.md is not read (the start passes)', () => {
  const fx = kitFixture(W1);
  helper(fx, 'b1', { desc: 'build: first part' });
  assert.equal(run(fx, input(fx, 'build: second part')).code, 0);
});

test('kit: a declaration that does not parse names .harness/WIDTHS.md; the app limit of 20 holds as before', () => {
  const fx = kitFixture('width "build: *" 1: no number here\n');
  const r = kitRun(fx, input(fx, 'read: x'));
  assert.equal(r.code, 2);
  assert.match(r.err, /count gate: \.harness\/WIDTHS\.md line 1 is not a declaration/);
  const fx2 = kitFixture();
  many(fx2, 20);
  assert.match(kitRun(fx2, input(fx2, 'read: x')).err, /number 21/);
});

test('kit: the refusal names --end and --status with the kit arguments and this machine\'s paths (repair F2)', () => {
  const fx = kitFixture();
  many(fx, 19);
  helper(fx, 'slow', { ago: 10 });
  const r = kitRun(fx, input(fx, 'analyse: x'));
  assert.equal(r.code, 2);
  const sl = (x) => x.replace(/\\/g, '/');
  const args = ` --harness-kit "--clone=${sl(fx.r)}" "--project=${sl(fx.P)}"`;
  const tail = ` --end <helper id> "<why>"${args} (ids and silences: `;
  const i = r.err.indexOf(tail);
  assert.ok(i > 0, r.err);
  assert.match(r.err.slice(0, i), /to end one at once: .*count-gate[.a-z]*"$/);
  assert.match(r.err.slice(i + tail.length), /count-gate[.a-z]*" --status aaaabbbb /);
  assert.ok(r.err.trim().endsWith(`--status aaaabbbb${args}).`), r.err);
});

test('kit: --end writes to the project\'s log, without the kit\'s arguments in its reason', () => {
  const fx = kitFixture();
  const e = runHook(fx.hook, ['--end', 'ghost', 'killed', 'by', 'a', 'restart', ...fx.args, '--no-usage-tool'], { encoding: 'utf8' });
  assert.equal(e.status, 0, e.stderr);
  const last = JSON.parse(readFileSync(fx.kitLog, 'utf8').trim().split('\n').pop());
  assert.equal(last.why, 'killed by a restart');
});
