// Tests of plan-gate.mjs (2026-11-19, unit GATE). Run: node --test .claude/hooks/plan-gate.test.mjs
// Each case copies the hook into a temporary folder with its own git repository, plan.json (the real one unless a
// case says otherwise) and log, feeds it made-up hook inputs on stdin and checks its exit code (0 allow, 2 refuse)
// and message. Nothing in the repository is written. One failing case for each refusal, one passing case for each
// allowed start; then the real plan.json is checked against the tier routes and its own references.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync, existsSync, appendFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const REAL = JSON.parse(readFileSync(resolve(repo, 'research-tree', 'build', 'plan.json'), 'utf8'));
const ROUTES = JSON.parse(readFileSync(resolve(here, 'tier-routes.json'), 'utf8'));
const made = [];
after(() => { for (const d of made) rmSync(d, { recursive: true, force: true }); });

function git(dir, ...args) {
  const r = spawnSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}
function fixture(plan = REAL) {
  const dir = mkdtempSync(join(tmpdir(), 'plan-gate-'));
  made.push(dir);
  mkdirSync(join(dir, '.claude', 'hooks'), { recursive: true });
  copyFileSync(resolve(here, 'plan-gate.mjs'), join(dir, '.claude', 'hooks', 'plan-gate.mjs'));
  mkdirSync(join(dir, 'research-tree', 'build'), { recursive: true });
  if (plan !== null) writeFileSync(planPath(dir), typeof plan === 'string' ? plan : JSON.stringify(plan, null, 1));
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'commit', '-q', '--allow-empty', '-m', 'base');
  git(dir, 'branch', 'build');
  return dir;
}
const planPath = (dir) => join(dir, 'research-tree', 'build', 'plan.json');
const logPath = (dir) => join(dir, '.claude', 'logs', 'plan-gate.jsonl');
const logLines = (dir) => (existsSync(logPath(dir)) ? readFileSync(logPath(dir), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const touch = (dir, rel) => { mkdirSync(dirname(join(dir, rel)), { recursive: true }); writeFileSync(join(dir, rel), 'x\n'); };
const land = (dir, branch) => git(dir, 'branch', '-f', branch, 'build'); // at the build tip: an ancestor of build
function unmerged(dir, branch) { // a commit that build does not contain
  const sha = git(dir, 'commit-tree', 'build^{tree}', '-p', 'build', '-m', branch);
  git(dir, 'branch', '-f', branch, sha);
}
function finish(dir, batch, plan = REAL) { // every unit of the batch shown done
  for (const u of plan.units) {
    if (u.batch !== batch || !u.done) continue;
    if (u.done.merged) land(dir, u.done.merged); else touch(dir, u.done.file);
  }
}

let seq = 0;
const pre = (description, model) => ({ hook_event_name: 'PreToolUse', session_id: 'plan-gate-test', tool_name: 'Agent',
  tool_use_id: `toolu_test${++seq}`, tool_input: { description, prompt: 'x', subagent_type: 'general-purpose', ...(model ? { model } : {}) } });
const post = (input, agent, status = 'async_launched') => ({ hook_event_name: 'PostToolUse', session_id: 'plan-gate-test', tool_name: 'Agent',
  tool_use_id: input.tool_use_id, tool_input: input.tool_input, tool_response: { isAsync: status === 'async_launched', status, agentId: agent } });
const stop = (agent) => ({ hook_event_name: 'SubagentStop', session_id: 'plan-gate-test', agent_id: agent, agent_type: 'general-purpose', stop_hook_active: false });
const run = (dir, input, args = []) => spawnSync(process.execPath, [join(dir, '.claude', 'hooks', 'plan-gate.mjs'), ...args],
  { input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8' });
function runAsync(dir, input) {
  return new Promise((res) => {
    const c = spawn(process.execPath, [join(dir, '.claude', 'hooks', 'plan-gate.mjs')]);
    let err = '';
    c.stderr.on('data', (d) => { err += d; });
    c.on('close', (code) => res({ status: code, stderr: err }));
    c.stdin.end(JSON.stringify(input));
  });
}
function allows(r) { assert.equal(r.status, 0, `expected an allow, got exit ${r.status}: ${r.stderr}`); }
function refuses(r, re) {
  assert.equal(r.status, 2, `expected a refusal, got exit ${r.status}: ${r.stderr}`);
  assert.match(r.stderr, /^plan gate: /);
  assert.equal(r.stderr.trim().split('\n').length, 1, 'one line');
  if (re) assert.match(r.stderr, re);
}
// started: an allowed start whose Agent call returned (a background helper with this agent id)
function started(dir, description, model, agent) {
  const i = pre(description, model);
  allows(run(dir, i));
  assert.equal(run(dir, post(i, agent)).status, 0);
  return i;
}
function readyForB11(dir) { finish(dir, 'B0a'); finish(dir, 'PROBE'); finish(dir, 'B0b'); }

// ---- inactive, and descriptions naming no planned unit ----

test('no plan.json: every start passes and nothing is logged', () => {
  const dir = fixture(null);
  allows(run(dir, pre('build-invariant: W1 fence', 'sonnet')));
  allows(run(dir, post(pre('build-invariant: W1', 'opus'), 'a1')));
  allows(run(dir, stop('a1')));
  assert.equal(existsSync(logPath(dir)), false);
});

test('a description naming no planned unit is left to the tier hook', () => {
  const dir = fixture();
  allows(run(dir, pre('test: gate live check', 'haiku')));
  allows(run(dir, pre('build-invariant: P0 hook and lane fixes', 'opus')));
  allows(run(dir, pre('read: plan of the week', 'sonnet'))); // "plan" is not the unit PLAN
  allows(run(dir, pre('no kind at all', 'opus')));
  assert.ok(logLines(dir).some((o) => o.ev === 'near'), 'a case-only near miss is logged');
});

// ---- refusal 1: the kind or the model differs from the unit's row ----

test('refused: the kind differs from the row', () => {
  const dir = fixture(); readyForB11(dir);
  refuses(run(dir, pre('build: W1 liveness', 'sonnet')), /W1 is not started as build on sonnet; the plan: "build-invariant: W1 \.\.\." on opus, batch B1-1/);
});
test('refused: the model differs from the row, or is missing', () => {
  const dir = fixture(); readyForB11(dir);
  refuses(run(dir, pre('build-invariant: W1 liveness', 'sonnet')), /on opus/);
  refuses(run(dir, pre('build-invariant: W1 liveness')), /no model/);
  refuses(run(dir, pre('extract: S0.1a facts', 'sonnet')), /"extract: S0\.1a \.\.\." on haiku/);
});
test('refused: a refuter for a unit reviewed only in the combined review, or several units in one helper', () => {
  const dir = fixture();
  refuses(run(dir, pre('refute: W6 parseTranscript', 'opus')), /reviewed in "refute: W4 \.\.\." \(covers W6, REDO, CLOSE, W4\)/);
  refuses(run(dir, pre('build-invariant: W1+OUT together', 'opus')), /one planned unit/);
  refuses(run(dir, pre('refute: S0.1a facts', 'opus')), /no refuter in the plan/);
});
test('allowed: kind and model as the row says (an alias names the same unit)', () => {
  const dir = fixture(); readyForB11(dir);
  allows(run(dir, pre('build-invariant: W1 liveness', 'opus')));
  allows(run(dir, pre('build-invariant: FX-OUT, the outcome log', 'claude-opus-5-5')));
  allows(run(dir, pre('extract: S0.1a facts', 'haiku')));
  const units = logLines(dir).filter((o) => o.ev === 'allow').map((o) => o.unit);
  assert.deepEqual(units, ['W1', 'OUT', 'S0.1a']);
});

// ---- refusal 2: a unit it depends on is not done ----

test('refused: a dependency has not landed (S0.5 needs S0.4); allowed once it has', () => {
  const dir = fixture(); finish(dir, 'B0a');
  refuses(run(dir, pre('build-invariant: S0.5 skeleton', 'opus')), /S0\.5 \(batch B0b\) waits for S0\.4 \(not landed: u\/S0\.4 is not merged into build\)/);
  unmerged(dir, 'u/S0.4'); // built but not merged
  refuses(run(dir, pre('build-invariant: S0.5 skeleton', 'opus')), /S0\.4 \(not landed/);
  land(dir, 'u/S0.4');
  allows(run(dir, pre('build-invariant: S0.5 skeleton', 'opus')));
});
test('refused: a batch it comes after is not done (B1-1 after B0b and PROBE); allowed once both are', () => {
  const dir = fixture(); finish(dir, 'B0a');
  refuses(run(dir, pre('build-invariant: W1 liveness', 'opus')), /waits for S0\.4 of batch B0b .*and \d+ more/);
  finish(dir, 'B0b');
  refuses(run(dir, pre('build-invariant: W1 liveness', 'opus')), /PROBE of batch PROBE \(no research-tree\/build\/facts\/nesting\.md\)/);
  finish(dir, 'PROBE');
  allows(run(dir, pre('build-invariant: W1 liveness', 'opus')));
});
test('refused: a fact file it reads is missing (S0.3 after S0.1a-d); allowed once all four exist', () => {
  const dir = fixture();
  touch(dir, 'research-tree/build/facts/FP1b-FP2.md');
  refuses(run(dir, pre('analyse: S0.3 branches', 'opus')), /S0\.1b \(no research-tree\/build\/facts\/FP12\.md\)/);
  finish(dir, 'B0a', { units: REAL.units.filter((u) => u.id.startsWith('S0.1')) });
  allows(run(dir, pre('analyse: S0.3 branches', 'opus')));
});
test('refused: a refuter before its builder result exists; allowed with the result in the unit worktree', () => {
  const dir = fixture(); readyForB11(dir);
  refuses(run(dir, pre('refute: W1 liveness', 'opus')), /the review of W1 \(batch B1-1\) waits for W1's builder result/);
  touch(dir, '.claude/worktrees/W1/research-tree/build/units/W1/result.md');
  allows(run(dir, pre('refute: W1 liveness', 'opus')));
});
test('allowed: the combined review once W6, REDO and CLOSE landed and W4 has its result', () => {
  const dir = fixture();
  refuses(run(dir, pre('refute: W6+REDO+CLOSE+W4', 'opus')), /the review of W6\+REDO\+CLOSE\+W4 \(batch B1-4\) waits for W6/);
  for (const b of ['u/W6', 'u/REDO', 'u/CLOSE', 'u/W3']) land(dir, b);
  touch(dir, 'research-tree/build/refute/W3.md');
  touch(dir, 'research-tree/build/units/W4/result.md');
  allows(run(dir, pre('refute: W6+REDO+CLOSE+W4', 'opus')));
  refuses(run(dir, pre('refute: W4 with W6, REDO, CLOSE', 'opus')), /the review of W6\+REDO\+CLOSE\+W4 is still running/); // the same row
});
test('refused, failing closed: a done form the gate cannot check', () => {
  const plan = structuredClone(REAL);
  plan.units.find((u) => u.id === 'S0.4' && u.role === 'unit').done = { weird: 1 };
  const dir = fixture(plan); finish(dir, 'B0a', plan);
  refuses(run(dir, pre('build-invariant: S0.5 skeleton', 'opus')), /could not check what S0\.5 depends on \(unknown done form/);
});

// ---- refusal 3: a helper for the same unit and role is still running ----

test('refused: a second builder while the first runs; allowed once it has ended (a LIMIT successor)', () => {
  const dir = fixture(); readyForB11(dir);
  started(dir, 'build-invariant: W1 liveness', 'opus', 'aw1first');
  refuses(run(dir, pre('build-invariant: W1 again', 'opus')), /a helper for W1 is still running \(agent aw1first.*--end aw1first/);
  allows(run(dir, stop('aw1first')));
  allows(run(dir, pre('build-invariant: W1 successor from checkpoint', 'opus')));
});
test('refused: a start whose Agent call has not returned yet; allowed once that is older than pending_s', () => {
  const dir = fixture(); readyForB11(dir);
  allows(run(dir, pre('build-invariant: W1 liveness', 'opus')));
  refuses(run(dir, pre('build-invariant: W1 again', 'opus')), /its Agent call has not returned/);
  const lines = logLines(dir).map((o) => (o.ev === 'allow' ? { ...o, t: o.t - 1000 * (REAL.gate.pending_s + 1) } : o));
  writeFileSync(logPath(dir), lines.map((o) => JSON.stringify(o)).join('\n') + '\n');
  allows(run(dir, pre('build-invariant: W1 again', 'opus')));
});
test('allowed: a call that returned with its helper finished (foreground) is not running', () => {
  const dir = fixture(); readyForB11(dir);
  const i = pre('build-invariant: W1 liveness', 'opus');
  allows(run(dir, i));
  allows(run(dir, post(i, 'aw1fg', 'completed')));
  allows(run(dir, pre('build-invariant: W1 next', 'opus')));
});
test('allowed: the refuter beside its running builder (another role); a second refuter is refused', () => {
  const dir = fixture(); readyForB11(dir);
  started(dir, 'build-invariant: W1 liveness', 'opus', 'aw1b');
  touch(dir, 'research-tree/build/units/W1/result.md');
  started(dir, 'refute: W1 liveness', 'opus', 'aw1r');
  refuses(run(dir, pre('refute: W1 again', 'opus')), /a helper for the review of W1 is still running/);
});
test('allowed: after the root logs a dead helper as ended (--end)', () => {
  const dir = fixture(); readyForB11(dir);
  started(dir, 'build-invariant: W1 liveness', 'opus', 'aw1dead');
  refuses(run(dir, pre('build-invariant: W1 again', 'opus')), /still running/);
  const r = spawnSync(process.execPath, [join(dir, '.claude', 'hooks', 'plan-gate.mjs'), '--end', 'aw1dead', 'app restart killed it'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  allows(run(dir, pre('build-invariant: W1 again', 'opus')));
  const r2 = spawnSync(process.execPath, [join(dir, '.claude', 'hooks', 'plan-gate.mjs'), '--end', 'x'], { encoding: 'utf8' });
  assert.equal(r2.status, 1, 'a reason is required');
});

// ---- refusal 4: the batch would run more units than its width ----

test('refused: a fourth builder in B1-1 (width 3); allowed when one returns', () => {
  const dir = fixture(); readyForB11(dir);
  started(dir, 'build-invariant: W1 a', 'opus', 'ab1');
  started(dir, 'build-invariant: OUT b', 'opus', 'ab2');
  started(dir, 'build-invariant: CLAIM c', 'opus', 'ab3');
  refuses(run(dir, pre('build-invariant: CGATE d', 'opus')), /batch B1-1 already runs 3 of its width 3 \(W1, OUT, CLAIM; plan\.json width 3\)/);
  allows(run(dir, stop('ab2')));
  allows(run(dir, pre('build-invariant: CGATE d', 'opus')));
});
test('allowed: refuters do not count against the width', () => {
  const dir = fixture(); readyForB11(dir);
  touch(dir, 'research-tree/build/units/W1/result.md');
  touch(dir, 'research-tree/build/units/OUT/result.md');
  started(dir, 'build-invariant: CLAIM a', 'opus', 'ac1');
  started(dir, 'build-invariant: CGATE b', 'opus', 'ac2');
  started(dir, 'refute: W1 x', 'opus', 'ac3');
  started(dir, 'refute: OUT y', 'opus', 'ac4');
  allows(run(dir, pre('build-invariant: W5 c', 'opus')));
});
test('width: a STATE.md line naming its measurement changes it; other lines are ignored', () => {
  const dir = fixture(); readyForB11(dir);
  for (const [u, a] of [['W1', 'ad1'], ['OUT', 'ad2'], ['CLAIM', 'ad3']]) started(dir, `build-invariant: ${u} x`, 'opus', a);
  const state = join(dir, 'research-tree', 'build', 'STATE.md');
  writeFileSync(state, '# STATE\nwidth B1-1 4: because\nwidth B1-1 9: u_b 0.31, u_r 0.30 from lane log\n');
  refuses(run(dir, pre('build-invariant: CGATE d', 'opus')), /width 3 .*STATE\.md width line was ignored/);
  appendFileSync(state, '- width B1-1 4: u_b 0.31, u_r 0.30, T_r 12 min from the lane log of P0 and B0b\n');
  allows(run(dir, pre('build-invariant: CGATE d', 'opus')));
  refuses(run(dir, pre('build-invariant: W5 e', 'opus')), /runs 4 of its width 4 .*STATE\.md: width B1-1 4: u_b 0\.31/);
});
test('refused at once: four starts of B1-1 in one message give three allows (the lock and pending starts)', async () => {
  const dir = fixture(); readyForB11(dir);
  const rs = await Promise.all(['W1', 'OUT', 'CLAIM', 'CGATE'].map((u) => runAsync(dir, pre(`build-invariant: ${u} x`, 'opus'))));
  assert.deepEqual(rs.map((r) => r.status).sort(), [0, 0, 0, 2], rs.map((r) => r.stderr).join(' | '));
  const two = await Promise.all([1, 2].map(() => runAsync(dir, pre('refute: S0.3 again', 'opus'))));
  assert.equal(two.filter((r) => r.status === 0).length, 1, 'two starts of one unit at once: one allowed');
});
test('the lock: a check waits while another holds it, and breaks a lock left by a crashed check', async () => {
  const dir = fixture(); readyForB11(dir);
  const lockDir = join(dir, '.claude', 'logs', 'plan-gate.lock');
  mkdirSync(lockDir, { recursive: true });
  const t0 = Date.now();
  const p = runAsync(dir, pre('build-invariant: W1 x', 'opus'));
  setTimeout(() => rmSync(lockDir, { recursive: true, force: true }), 900);
  const r = await p;
  assert.equal(r.status, 0, r.stderr);
  assert.ok(Date.now() - t0 >= 850, 'it waited for the lock');
  mkdirSync(lockDir);
  const old = (Date.now() - 60000) / 1000;
  utimesSync(lockDir, old, old);
  const t1 = Date.now();
  allows(run(dir, pre('build-invariant: OUT y', 'opus')));
  assert.ok(Date.now() - t1 < 4000, 'a stale lock is broken at once');
  assert.equal(existsSync(lockDir), false, 'the lock is released');
});
test('count_running false (SubagentStop not seen): checks 3 and 4 are off, 1 and 2 stay', () => {
  const plan = structuredClone(REAL); plan.gate.count_running = false;
  const dir = fixture(plan); readyForB11(dir);
  started(dir, 'build-invariant: W1 x', 'opus', 'ae1');
  allows(run(dir, pre('build-invariant: W1 y', 'opus')));
  refuses(run(dir, pre('build-invariant: W2 y', 'opus')), /waits for W1/);
});

// ---- plan.json present but unreadable: fail closed for the build, open for everything else ----

test('unreadable plan: a planned id is refused, other helpers pass', () => {
  const dir = fixture(JSON.stringify(REAL).slice(0, -40));
  refuses(run(dir, pre('build-invariant: W1 x', 'opus')), /plan\.json exists but cannot be read .* planned unit W1/);
  refuses(run(dir, pre('extract: S0.1a x', 'haiku')), /cannot be read/);
  allows(run(dir, pre('read: library index', 'sonnet')));
  allows(run(dir, pre('test: gate check', 'haiku')));
});
test('unreadable plan with no ids in it: the id forms decide', () => {
  const dir = fixture('{ "units": [');
  refuses(run(dir, pre('build-invariant: CGATE x', 'opus')), /cannot be read/);
  allows(run(dir, pre('read: README files', 'sonnet')));
});

// ---- the start and end hooks never block and log what the running count needs ----

test('PostToolUse and SubagentStop always exit 0 silently and log start and end', () => {
  const dir = fixture();
  const i = pre('test: gate check', 'haiku');
  for (const input of [post(i, 'agent-a0123456789abcdef'), stop('a0123456789abcdef'), 'not json',
    { hook_event_name: 'PostToolUse', tool_name: 'Agent', tool_response: 'agentId: aStringShape77' },
    { hook_event_name: 'SubagentStop' }, { hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_response: {} }]) {
    const r = run(dir, input);
    assert.equal(r.status, 0); assert.equal(r.stdout, ''); assert.equal(r.stderr, '');
  }
  const l = logLines(dir);
  assert.equal(l.filter((o) => o.ev === 'start').length, 2);
  assert.equal(l[0].agent, 'a0123456789abcdef');
  assert.equal(l[0].tu, i.tool_use_id);
  assert.equal(l.find((o) => o.ev === 'start' && o.agent === 'aStringShape77') !== undefined, true);
  assert.equal(l.filter((o) => o.ev === 'end')[0].agent, 'a0123456789abcdef');
});

// ---- the real plan ----

test('plan.json: ids, batches, dependencies and done forms hold together and agree with the tier routes', () => {
  const p = REAL;
  const batches = new Map(p.batches.map((b) => [b.id, b]));
  const keys = new Set();
  for (const u of p.units) {
    const where = `${u.id} (${u.role})`;
    assert.ok(u.id.length <= 7, `${where}: id of at most 7 characters`);
    assert.ok(!keys.has(`${u.id}|${u.role}`), `${where}: one row per unit and role`); keys.add(`${u.id}|${u.role}`);
    assert.ok(batches.has(u.batch), `${where}: batch ${u.batch} exists`);
    const route = ROUTES.kinds[u.kind];
    assert.ok(route, `${where}: kind ${u.kind} is a tier route`);
    assert.ok(route.models.includes(u.model), `${where}: ${u.model} is allowed for ${u.kind}`);
    assert.ok(u.expected_m > 0 && u.expected_m <= u.limit_m, `${where}: expected at most the limit`);
    for (const d of u.deps) assert.ok(p.units.some((x) => x.id === d && x.role !== 'refute'), `${where}: dependency ${d} is a planned unit`);
    if (u.role === 'refute') {
      assert.ok(u.needs && u.needs.file && u.done && u.done.file, `${where}: a refuter has its builder's result and a verdict file`);
      assert.ok(p.units.some((x) => x.id === u.id && x.role === 'unit'), `${where}: reviews a planned unit`);
    } else if (u.role === 'unit') {
      if (u.kind.startsWith('build')) assert.deepEqual(u.done, { merged: `u/${u.id}` }, `${where}: a build unit is done when landed`);
      else assert.ok(u.done && u.done.file, `${where}: a reading, running or analysing unit is done when its fact file exists`);
    }
  }
  for (const b of p.batches) {
    assert.ok(b.width >= 1 && b.width <= b.max, `${b.id}: width within 1..max`);
    for (const a of b.after) assert.ok(batches.has(a), `${b.id}: after ${a} exists`);
  }
  const seen = new Set(), visiting = new Set(); // the batch order has no cycle
  const visit = (id) => { assert.ok(!visiting.has(id), `cycle at ${id}`); if (seen.has(id)) return; visiting.add(id); for (const a of batches.get(id).after) visit(a); visiting.delete(id); seen.add(id); };
  for (const b of p.batches) visit(b.id);
  const count = (f) => p.units.filter(f).length;
  assert.equal(count((u) => u.role === 'refute'), 15, 'refuter runs: 16 in ORCHESTRATION section 3, less P0\'s');
  assert.equal(count((u) => u.role === 'unit' && u.kind === 'build-invariant'), 17, '16 builders (17 less P0) and S2.2');
  assert.equal(batches.get('B1-1').width, 3);
  assert.equal(batches.get('B0a').width, 4);
  assert.ok(!p.units.some((u) => ['P0', 'GATE'].includes(u.id)), 'P0 and GATE are not in it');
});
