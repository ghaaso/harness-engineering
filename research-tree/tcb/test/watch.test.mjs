// Tests of tcb/watch.mjs, written from spec/watch.mjs.md and CONTRACT.md only.
// Each test builds its own run root under tcb-build/tmp, runs the script as a child process
// (process.execPath + tcb-build/tcb/watch.mjs, or the shared stub folder's copy for intake tests) and checks the exit code, the stdout
// line (CONTRACT 1.3) and the files. Everything the tests need is in this file; the synthetic data
// lives in tcb/fixtures/watch/.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as LIB from '../lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUILD = path.resolve(HERE, '..', '..');
const TCB_SRC = path.join(BUILD, 'tcb');
const TMP = path.join(BUILD, 'tmp');
const FIXDIR = path.join(HERE, '..', 'fixtures', 'watch');
const PS_EXE = 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
const TASKLIST = 'C:/Windows/System32/tasklist.exe';
const DATA = JSON.parse(fs.readFileSync(path.join(FIXDIR, '_testdata.json'), 'utf8'));

const NOW = '2026-11-17T09:30:00.000Z';
const COMMIT = 'ab12'.repeat(10);
const SLUG = {
  0: 'ok', 1: 'fail', 2: 'not-run', 3: 'tamper', 5: 'ready-wins', 6: 'deferred', 10: 'reopened', 11: 'ready',
  12: 'repair', 13: 'soft-limit', 14: 'checker-batch', 15: 'window-limit', 16: 'drain', 20: 'stall', 21: 'hang',
  22: 'loop', 23: 'hard-limit', 24: 'memory', 25: 'stop-unconfirmed', 26: 'common-cause', 27: 'tamper-seen',
  30: 'alarm', 64: 'stale-ce', 65: 'stale-epoch', 66: 'usage', 67: 'table-corrupt', 70: 'internal', 75: 'lock-busy',
};
// Exit 17 `act-due` (CONTRACT 1.4, decision 40, M3). The stdout `code` comes from lib.EXIT; until the
// library names 17 (a requested lib change) it prints `internal`, and this table follows the library
// so that the check becomes strict by itself once the slug is there.
SLUG[17] = LIB.EXIT && LIB.EXIT['act-due'] === 17 ? 'act-due' : 'internal';

// ---------------------------------------------------------------- small utilities
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
function canon(v) {
  if (v === null) return 'null';
  if (typeof v === 'string') return JSON.stringify(v.normalize('NFC'));
  if (typeof v === 'number') return Object.is(v, -0) ? '0' : JSON.stringify(v);
  if (typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  const keys = Object.keys(v).filter((k) => v[k] !== undefined).sort();
  return '{' + keys.map((k) => JSON.stringify(k.normalize('NFC')) + ':' + canon(v[k])).join(',') + '}';
}
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
function w(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data, null, 2) + '\n');
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, { timeout = 30000, step = 25 } = {}) {
  const t0 = Date.now();
  for (;;) {
    const v = fn();
    if (v) return v;
    if (Date.now() - t0 > timeout) throw new Error('timed out waiting for a condition');
    await sleep(step);
  }
}
const newSid = () => crypto.randomUUID();

// ---------------------------------------------------------------- process helpers
function pidAlive(pid) {
  const r = cp.spawnSync(TASKLIST, ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], { encoding: 'utf8', windowsHide: true });
  return (r.stdout || '').includes(`"${pid}"`);
}
function psStart(pid) {
  const r = cp.spawnSync(PS_EXE, ['-NoProfile', '-NonInteractive', '-Command',
    `(Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}').CreationDate.ToUniversalTime().ToString('o')`],
  { encoding: 'utf8', windowsHide: true, timeout: 30000 });
  return (r.stdout || '').trim();
}
function spawnSleeper(markers = ['tcb-test-sleeper']) {
  const child = cp.spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)', ...markers], { stdio: 'ignore', windowsHide: true });
  const start_time = psStart(child.pid);
  assert.match(start_time, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{7}Z$/, 'could not read the sleeper start time');
  return { pid: child.pid, start_time, child, kill() { try { child.kill(); } catch { /* already gone */ } } };
}
function deadRecord() {
  const r = cp.spawnSync(process.execPath, ['-e', '0'], { windowsHide: true });
  return { pid: r.pid, start_time: '2020-01-01T00:00:00.0000000Z' };
}
const lockRec = (rec, o = {}) => ({
  pid: rec.pid, start_time: rec.start_time, nonce: crypto.randomBytes(16).toString('hex'),
  script: o.script ?? 'test', ce: o.ce ?? 1, acquired_at: '2026-11-17T09:00:00.000Z',
});

// ---------------------------------------------------------------- the run root
const DIRS = ['plan/notes', 'plan/questions', 'plan/protocols', 'plan/frozen', 'run/intents', 'run/audit', 'run/stop-sample',
  'store/objects', 'store/commits', 'store/status', 'views', 'queue', 'completeness', 'sealed', '.snapshots', 'wt', 'tmp', 'transcripts'];
function makeRoot({ thr = {}, ce = 1, rows = [], coord = {}, noTasks = false } = {}) {
  fs.mkdirSync(TMP, { recursive: true });
  const root = fs.mkdtempSync(path.join(TMP, 'wk-'));
  for (const d of DIRS) fs.mkdirSync(path.join(root, d), { recursive: true });
  // Flat build layout: the scripts are not copied into the root; they run from tcb-build/tcb/
  // (found relative to this test file) and read the root's tcb/ data through --root.
  for (const d of ['schemas', 'profiles', 'settings', 'agents', 'briefs']) {
    const src = path.join(TCB_SRC, d);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(root, 'tcb', d), { recursive: true });
  }
  for (const f of ['cost-inputs.json', 'denylist.txt']) {
    const src = path.join(TCB_SRC, f);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(root, 'tcb', f));
  }
  const params = structuredClone(DATA.params);
  params.transcripts_root.value = path.join(root, 'transcripts').replace(/\\/g, '/');
  for (const [k, v] of Object.entries(thr)) {
    const base = params[k] ?? { unit: 'test value', source: 'guess', gate: true };
    if (v && typeof v === 'object' && !Array.isArray(v) && 'value' in v) params[k] = { ...base, ...v };
    else params[k] = { ...base, value: v };
  }
  w(path.join(root, 'tcb', 'thresholds.json'), { schema_version: 1, params });
  w(path.join(root, 'run', 'coord.json'), { schema_version: 1, ce, started_at: NOW, tcb_commit: COMMIT, ...coord });
  if (!noTasks) w(path.join(root, 'run', 'tasks.json'), { schema_version: 1, rev: 1, tasks: rows });
  const ctx = { root, sleepers: [], pids: [], skipLedger: false };
  ctx.sleeper = (markers) => { const s = spawnSleeper(markers); ctx.sleepers.push(s); return s; };
  return ctx;
}
async function withRoot(opts, fn) {
  const ctx = makeRoot(opts);
  try {
    const out = await fn(ctx);
    if (!ctx.skipLedger) assertLedgerOk(ctx.root);
    return out;
  } finally {
    for (const s of ctx.sleepers) s.kill();
    for (const pid of ctx.pids) { try { await waitFor(() => !pidAlive(pid), { timeout: 30000 }); } catch { /* leave it */ } }
    for (let i = 0; i < 20; i++) {
      try { fs.rmSync(ctx.root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); break; } catch { await sleep(300); }
    }
  }
}

// ---------------------------------------------------------------- the ledger (own implementation)
const ledgerFile = (root) => path.join(root, 'run', 'ledger.jsonl');
function ledgerLines(root, kind) {
  const p = ledgerFile(root);
  if (!fs.existsSync(p)) return [];
  const all = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  return kind ? all.filter((l) => l.kind === kind) : all;
}
function addLine(root, { kind, ce = 1, task, epoch, data = {}, ts = '2026-11-17T09:00:00.000Z' }) {
  const lines = ledgerLines(root);
  const tail = lines[lines.length - 1];
  const line = { seq: tail ? tail.seq + 1 : 1, prev: tail ? tail.hash : '0'.repeat(64), ts, ce, writer: 'test', writer_sha: '0'.repeat(64), kind, data };
  if (task !== undefined) line.task = task;
  if (epoch !== undefined) line.epoch = epoch;
  line.hash = sha(line.prev + canon(line));
  fs.appendFileSync(ledgerFile(root), canon(line) + '\n');
  return line;
}
function assertLedgerOk(root) {
  const p = ledgerFile(root);
  if (!fs.existsSync(p)) return;
  const txt = fs.readFileSync(p, 'utf8');
  assert.ok(txt === '' || txt.endsWith('\n'), 'ledger has a torn tail');
  let prev = '0'.repeat(64);
  txt.split('\n').filter(Boolean).forEach((l, i) => {
    const line = JSON.parse(l);
    const { hash, ...rest } = line;
    assert.equal(line.seq, i + 1, `ledger seq at line ${i + 1}`);
    assert.equal(line.prev, prev, `ledger prev at line ${i + 1}`);
    assert.equal(hash, sha(prev + canon(rest)), `ledger hash at line ${i + 1}`);
    prev = hash;
  });
}
const eventsOf = (root, slug, code) => ledgerLines(root, 'event').filter((l) =>
  [l.data?.class, l.data?.code].some((x) => x === slug || x === code));

// ---------------------------------------------------------------- tasks and transcripts
function att(task, e, o = {}) {
  return {
    epoch: e, folder: `wt/${task}-e${e}`, session: o.session ?? null, bound_at: null, boot: null, manifest: null,
    settings_sha: null, cut: null, spend_at_fence: o.spend_at_fence ?? null, stop: o.stop ?? 'none',
  };
}
function row(task, o = {}) {
  const epoch = o.epoch ?? 1;
  return {
    task, field: o.field === undefined ? 'f1' : o.field, stage: o.stage ?? 'research', role: o.role ?? 'child',
    steps: o.steps ?? ['pack'], deps: [], question_ids: o.question_ids ?? [], e_task: o.e_task ?? 1000, tier: 'test',
    state: o.state ?? 'active', step: o.step ?? 'bound', epoch, reason: o.reason ?? null, session: o.session ?? null,
    restarts: 0, handovers: 0, parks: 0, limit: o.limit ?? false, fails: o.fails ?? [],
    attempts: o.attempts ?? Array.from({ length: epoch }, (_, i) => att(task, i + 1, { session: i + 1 === epoch ? (o.session ?? null) : null })),
    commits: o.commits ?? {}, updated_rev: 1,
  };
}
const setTasks = (ctx, rows, rev = 1) => w(path.join(ctx.root, 'run', 'tasks.json'), { schema_version: 1, rev, tasks: rows });

let tsN = 0;
const isoTs = () => new Date(Date.UTC(2026, 0, 1) + (++tsN) * 1000).toISOString();
const usage = (u = {}) => ({
  input_tokens: u.input ?? 0, cache_read_input_tokens: u.cache_read ?? 0,
  cache_creation_input_tokens: u.cache_write ?? 0, output_tokens: u.output ?? 0,
});
function callRecords({ sessionId, cwd, call }) {
  const id = call.id ?? 'msg_' + crypto.randomBytes(8).toString('hex');
  const blocks = [];
  if (call.text !== undefined) blocks.push({ type: 'text', text: call.text });
  const toolIds = [];
  for (const t of call.tools ?? []) {
    const tid = 'toolu_' + crypto.randomBytes(8).toString('hex');
    toolIds.push(tid);
    blocks.push({ type: 'tool_use', id: tid, name: t.name, input: t.input ?? {} });
  }
  if (!blocks.length) blocks.push({ type: 'text', text: 'x' });
  const base = { parentUuid: null, isSidechain: false, sessionId, cwd };
  const recs = blocks.map((b) => ({
    type: 'assistant', uuid: crypto.randomUUID(), ...base, timestamp: isoTs(),
    message: { id, type: 'message', role: 'assistant', model: 'claude-test-1', content: [b], stop_reason: null, usage: usage(call.usage) },
  }));
  for (const tid of toolIds) {
    recs.push({ type: 'user', uuid: crypto.randomUUID(), ...base, timestamp: isoTs(),
      message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: tid, content: 'done', is_error: false }] } });
  }
  return recs;
}
const startRecord = (sessionId, cwd) => ({ type: 'user', uuid: crypto.randomUUID(), parentUuid: null, isSidechain: false, sessionId, cwd, timestamp: isoTs(), message: { role: 'user', content: 'synthetic start' } });
const tpath = (root, sid, proj = 'proj-test') => path.join(root, 'transcripts', proj, sid + '.jsonl');
function writeTranscript(file, { sessionId, cwd, calls = [] }) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const recs = [startRecord(sessionId, cwd), ...calls.flatMap((call) => callRecords({ sessionId, cwd, call }))];
  fs.writeFileSync(file, recs.map((r) => JSON.stringify(r)).join('\n') + '\n');
}
function appendCalls(file, { sessionId, cwd, calls }) {
  fs.appendFileSync(file, calls.flatMap((call) => callRecords({ sessionId, cwd, call })).map((r) => JSON.stringify(r)).join('\n') + '\n');
}
const CALLS = (n, input = 10, tools) => Array.from({ length: n }, () => ({ usage: { input }, tools }));
function fixtureText(name, sid, cwd) {
  return fs.readFileSync(path.join(FIXDIR, name), 'utf8').replaceAll('{{sid}}', sid).replaceAll('{{cwd}}', JSON.stringify(cwd).slice(1, -1));
}
function singleTask(ctx, { task = 'f1-research', e_task = 1000, qids = ['f1-a-01', 'f1-a-02', 'f1-a-03'], calls = [], step = 'bound', extra = {} } = {}) {
  const session = newSid();
  const cwd = path.join(ctx.root, 'wt', `${task}-e1`);
  const file = tpath(ctx.root, session);
  writeTranscript(file, { sessionId: session, cwd, calls });
  return { task, session, file, cwd, row: row(task, { session, e_task, question_ids: qids, step, ...extra }) };
}
function readyFile(ctx, task, epoch, body) {
  w(path.join(ctx.root, 'wt', `${task}-e${epoch}`, 'staging', 'READY.json'), body ?? { kind: 'ready', task, epoch, step: 'pack' });
}
function putCard(root, { qids, field = 'f1' }) {
  const card = {
    kind: 'card', field, question_ids: qids, route: 'keyword',
    source: { url: 'http://127.0.0.1/a', canonical_id: 'doi:10.0/x', primary_id: 'doi:10.0/x', evidence_type: 'benchmark' },
    quote: 'synthetic quote words here',
    measured: { approach_id: 'a1', measure: 'm1', value: 1, unit: 'u', baseline: 0, baseline_kind: 'none', better: 'higher', effect: 'improves' },
    conditions: { task: ['t'], model_family: ['m'], language: ['l'] }, what_measured: 'synthetic measurement',
  };
  const bytes = canon(card);
  const id = 'c_' + sha(bytes).slice(0, 16);
  w(path.join(root, 'store', 'objects', id + '.json'), bytes);
  return { id, sha: sha(bytes) };
}
function cardStatus(root, card, seq = 1) {
  fs.mkdirSync(path.join(root, 'store', 'status'), { recursive: true });
  fs.appendFileSync(path.join(root, 'store', 'status', 'card_status.jsonl'),
    canon({ seq, card_id: card.id, card_sha: card.sha, status: 'witnessed', reason: 'ok', at: NOW }) + '\n');
}

// ---------------------------------------------------------------- running the script
function parseOut(r) {
  const out = r.stdout ?? '';
  const lines = out.split('\n').filter((s) => s.trim() !== '');
  let json = null;
  if (lines.length === 1) { try { json = JSON.parse(lines[0]); } catch { /* not json */ } }
  return { exit: r.status, signal: r.signal ?? null, stdout: out, stderr: r.stderr ?? '', lines, json };
}
// Flat build layout: a script is tcb-build/tcb/<name>.mjs, found relative to this test file. A root
// whose intake steps are stubbed runs the one shared stub folder's copy of watch.mjs instead, so that
// the watcher's sibling scripts (found relative to its own file) are the stubs.
const STUBBED = new Set();
const scriptPath = (root, name) => (STUBBED.has(root) ? path.join(stubDir(), name + '.mjs') : path.join(TCB_SRC, name + '.mjs'));
function run(root, name, args, { timeout = 120000 } = {}) {
  return parseOut(cp.spawnSync(process.execPath, [scriptPath(root, name), ...args],
    { cwd: root, encoding: 'utf8', windowsHide: true, timeout, maxBuffer: 256 * 1024 * 1024 }));
}
function startScript(root, name, args) {
  const child = cp.spawn(process.execPath, [scriptPath(root, name), ...args], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; let err = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { err += d; });
  const done = new Promise((res) => child.on('close', (code, signal) => res(parseOut({ status: code, signal, stdout: out, stderr: err }))));
  return { child, done };
}
function assertLine(res, exit) {
  const dbg = `exit=${res.exit} signal=${res.signal}\nstdout=${res.stdout.slice(0, 800)}\nstderr=${res.stderr.slice(0, 800)}`;
  assert.equal(res.exit, exit, `expected exit ${exit}\n${dbg}`);
  assert.equal(res.lines.length, 1, `stdout must be exactly one line\n${dbg}`);
  const j = res.json;
  assert.ok(j, `stdout line is not JSON\n${dbg}`);
  for (const k of ['ok', 'script', 'mode', 'exit', 'code', 'dry_run', 'result', 'reasons', 'ledger_seq']) assert.ok(k in j, `stdout line lacks "${k}"`);
  assert.match(String(j.script), /^watch(\.mjs)?$/);
  assert.equal(j.exit, exit);
  assert.equal(j.code, SLUG[exit]);
  if (exit === 0) assert.equal(j.ok, true);
  assert.ok(Array.isArray(j.reasons));
  assert.ok(Array.isArray(j.ledger_seq));
  return j;
}
const baseArgs = (ctx, { ce = 1, now = NOW, free = 100000 } = {}) => ['--root', ctx.root, '--ce', String(ce), '--now', now, '--free-mb', String(free)];
const tick = (ctx, extra = [], o = {}) => run(ctx.root, 'watch', [...baseArgs(ctx, o), '--once', '--no-intake', ...extra]);
const watcherJson = (ctx) => J(path.join(ctx.root, 'run', 'watcher.json'));
const hasWatcherLock = (ctx) => fs.existsSync(path.join(ctx.root, 'run', 'watcher.lock'));
const findFile = (files, suffix) => Object.entries(files ?? {}).find(([k]) => k.replace(/\\/g, '/').endsWith(suffix))?.[1];

// ---------------------------------------------------------------- intake stubs
const STUB = `
import fs from 'node:fs';
import path from 'node:path';
const argv = process.argv.slice(2);
const root = argv[argv.indexOf('--root') + 1];
const name = path.basename(process.argv[1]).replace(/\\.mjs$/, '');
fs.appendFileSync(path.join(root, 'tmp', 'stub-calls.log'), JSON.stringify({ script: name, args: argv }) + '\\n');
let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(path.join(root, 'tmp', 'stub-config.json'), 'utf8')); } catch {}
if (cfg.hold && cfg.hold[name]) {
  const rel = path.join(root, 'tmp', 'release');
  const t0 = Date.now();
  while (!fs.existsSync(rel) && Date.now() - t0 < 30000) await new Promise((r) => setTimeout(r, 50));
}
const code = (cfg.exit && cfg.exit[name]) ?? 0;
process.stdout.write(JSON.stringify({ ok: code === 0, script: name, mode: null, exit: code, code: 'stub', dry_run: false, result: {}, reasons: [], ledger_seq: [] }) + '\\n');
process.exit(code);
`;
// One shared stub folder for the whole run of this file: a copy of watch.mjs and lib.mjs with the
// seven step scripts as stubs beside them. Each stub reads its config from the root it is given.
let STUB_DIR = null;
function stubDir() {
  if (STUB_DIR) return STUB_DIR;
  fs.mkdirSync(TMP, { recursive: true });
  const d = fs.mkdtempSync(path.join(TMP, 'wk-stubs-'));
  for (const f of ['watch.mjs', 'lib.mjs']) fs.copyFileSync(path.join(TCB_SRC, f), path.join(d, f));
  for (const n of ['harvest', 'commit', 'snap', 'witness', 'promote', 'tms', 'status']) w(path.join(d, n + '.mjs'), STUB);
  STUB_DIR = d;
  return d;
}
after(() => {
  if (STUB_DIR) { try { fs.rmSync(STUB_DIR, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* best effort */ } }
});
function installStubs(ctx, config = {}) {
  stubDir();
  STUBBED.add(ctx.root);
  w(path.join(ctx.root, 'tmp', 'stub-config.json'), config);
}
function stubLog(root) {
  const p = path.join(root, 'tmp', 'stub-calls.log');
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
}
const intakeRun = (ctx) => run(ctx.root, 'watch', ['--intake', '--root', ctx.root, '--ce', '1']);

// =============================================================== the tests
test('T1 --once on a quiet root: exit 0, ticks_total 1, ce and pid recorded, watcher.lock gone', async () => {
  await withRoot({}, async (ctx) => {
    const r = tick(ctx);
    const j = assertLine(r, 0);
    assert.equal(j.mode, null);
    const wj = watcherJson(ctx);
    assert.equal(wj.ticks_total, 1);
    assert.equal(wj.ce, 1);
    assert.ok(Number.isInteger(wj.pid) && wj.pid > 0);
    assert.equal(typeof wj.start_time, 'string');
    assert.equal(hasWatcherLock(ctx), false, 'the watcher lock is released on exit');
    const r2 = tick(ctx);
    assertLine(r2, 0);
    assert.equal(watcherJson(ctx).ticks_total, 2, 'a later watcher continues the tick count');
  });
});

test('T2 stall: 3 new calls with V unchanged exit 20 with one stall event line', async () => {
  await withRoot({ thr: { stall_calls: 3 } }, async (ctx) => {
    const t = singleTask(ctx);
    setTasks(ctx, [t.row]);
    assertLine(tick(ctx), 0);
    appendCalls(t.file, { sessionId: t.session, cwd: t.cwd, calls: CALLS(3) });
    const j = assertLine(tick(ctx), 20);
    const ev = eventsOf(ctx.root, 'stall', 20);
    assert.equal(ev.length, 1, 'exactly one stall event line');
    assert.equal(ev[0].data.class, 'stall');
    assert.equal(ev[0].data.urgent, true);
    assert.ok(String(ev[0].data.key).includes(t.task), 'the event key names the task');
    assert.ok(j.ledger_seq.includes(ev[0].seq));
  });
});

test('T2 stall: with V falling during those calls there is no stall', async () => {
  await withRoot({ thr: { stall_calls: 3 } }, async (ctx) => {
    const t = singleTask(ctx);
    setTasks(ctx, [t.row]);
    assertLine(tick(ctx), 0);
    const card = putCard(ctx.root, { qids: ['f1-a-01'] });
    addLine(ctx.root, { kind: 'intake', task: t.task, epoch: 1, data: { objects: [{ id: card.id, kind: 'card', origin: 'session' }], rejected: [], flagged: [] } });
    cardStatus(ctx.root, card);
    appendCalls(t.file, { sessionId: t.session, cwd: t.cwd, calls: CALLS(3) });
    assertLine(tick(ctx), 0);
    const tk = watcherJson(ctx).tasks[t.task];
    assert.equal(tk.V, 2);
    assert.equal(tk.stall_calls, 0);
    assert.equal(eventsOf(ctx.root, 'stall', 20).length, 0);
  });
});

test('T3 hang: after the first tick of the epoch, two --once ticks without a new call exit 21 on the second', async () => {
  await withRoot({ thr: { model_ticks: 2 } }, async (ctx) => {
    const t = singleTask(ctx);
    setTasks(ctx, [t.row]);
    assertLine(tick(ctx), 0);
    assert.equal(watcherJson(ctx).tasks[t.task].hang_ticks, 0, 'FX-W6 step 1: the first tick of an epoch counts nothing');
    assertLine(tick(ctx), 0);
    assert.equal(watcherJson(ctx).tasks[t.task].hang_ticks, 1);
    assertLine(tick(ctx), 21);
    assert.equal(eventsOf(ctx.root, 'hang', 21).length, 1);
  });
});

test('T3 hang: a call in between resets the count', async () => {
  await withRoot({ thr: { model_ticks: 2 } }, async (ctx) => {
    const t = singleTask(ctx);
    setTasks(ctx, [t.row]);
    assertLine(tick(ctx), 0);
    assertLine(tick(ctx), 0);
    assert.equal(watcherJson(ctx).tasks[t.task].hang_ticks, 1);
    appendCalls(t.file, { sessionId: t.session, cwd: t.cwd, calls: CALLS(1) });
    assertLine(tick(ctx), 0);
    assert.equal(watcherJson(ctx).tasks[t.task].hang_ticks, 0);
    assertLine(tick(ctx), 0);
    assert.equal(watcherJson(ctx).tasks[t.task].hang_ticks, 1);
    assertLine(tick(ctx), 21);
  });
});

test('T3 hang: the start evaluation of a default-mode watcher does not count a hang tick', async () => {
  await withRoot({ thr: { model_ticks: 2 } }, async (ctx) => {
    const t = singleTask(ctx);
    setTasks(ctx, [t.row]);
    const r = run(ctx.root, 'watch', [...baseArgs(ctx), '--interval-ms', '50', '--no-intake'], { timeout: 60000 });
    assertLine(r, 21);
    const wj = watcherJson(ctx);
    assert.equal(wj.ticks_total, 2, 'start evaluation (no tick) + tick 1 + tick 2 = hang_ticks 2 at ticks_total 2');
    assert.equal(wj.tasks[t.task].hang_ticks, 2);
    assert.equal(hasWatcherLock(ctx), false);
  });
});

test('T4 counters continue across watchers: tick 1 (A), tick 2 (B), tick 3 (C) reach the threshold together', async () => {
  await withRoot({ thr: { stall_calls: 3 } }, async (ctx) => {
    const t = singleTask(ctx);
    setTasks(ctx, [t.row]);
    assertLine(tick(ctx), 0); // watcher A
    appendCalls(t.file, { sessionId: t.session, cwd: t.cwd, calls: CALLS(2) });
    assertLine(tick(ctx), 0); // watcher B
    assert.equal(watcherJson(ctx).tasks[t.task].stall_calls, 2);
    appendCalls(t.file, { sessionId: t.session, cwd: t.cwd, calls: CALLS(1) });
    assertLine(tick(ctx), 20); // watcher C: 2 + 1 = 3
    assert.equal(watcherJson(ctx).ticks_total, 3);
  });
});

test('T4 counters continue: a new epoch resets that task\'s counters', async () => {
  await withRoot({ thr: { stall_calls: 3 } }, async (ctx) => {
    const t = singleTask(ctx);
    setTasks(ctx, [t.row]);
    assertLine(tick(ctx), 0);
    appendCalls(t.file, { sessionId: t.session, cwd: t.cwd, calls: CALLS(2) });
    assertLine(tick(ctx), 0);
    assert.equal(watcherJson(ctx).tasks[t.task].stall_calls, 2);
    const s2 = newSid();
    const cwd2 = path.join(ctx.root, 'wt', `${t.task}-e2`);
    writeTranscript(tpath(ctx.root, s2), { sessionId: s2, cwd: cwd2, calls: CALLS(1) });
    setTasks(ctx, [row(t.task, {
      epoch: 2, session: s2, question_ids: t.row.question_ids,
      attempts: [att(t.task, 1, { session: t.session, stop: 'confirmed' }), att(t.task, 2, { session: s2 })],
    })], 2);
    assertLine(tick(ctx), 0);
    const tk = watcherJson(ctx).tasks[t.task];
    assert.equal(tk.epoch, 2);
    assert.equal(tk.stall_calls, 0);
    assert.equal(tk.calls, 1);
  });
});

test('T5 loop: three equal tool-use signatures at the end exit 22 with loop.run 3', async () => {
  await withRoot({ thr: { loop_k: 3 } }, async (ctx) => {
    const same = { name: 'Read', input: { file_path: 'a.txt' } };
    const t = singleTask(ctx, { calls: [{ usage: { input: 10 }, tools: [{ name: 'Bash', input: { command: 'ls' } }] }, ...CALLS(3, 10, [same])] });
    setTasks(ctx, [t.row]);
    assertLine(tick(ctx), 22);
    assert.equal(watcherJson(ctx).tasks[t.task].loop.run, 3);
    assert.equal(eventsOf(ctx.root, 'loop', 22).length, 1);
  });
  await withRoot({ thr: { loop_k: 3 } }, async (ctx) => {
    const a = { name: 'Read', input: { file_path: 'a.txt' } };
    const b = { name: 'Read', input: { file_path: 'b.txt' } };
    const t = singleTask(ctx, { calls: [{ usage: { input: 10 }, tools: [a] }, { usage: { input: 10 }, tools: [a] }, { usage: { input: 10 }, tools: [b] }] });
    setTasks(ctx, [t.row]);
    assertLine(tick(ctx), 0);
    assert.equal(watcherJson(ctx).tasks[t.task].loop.run, 1);
  });
});

test('T6 READY of the current epoch voids a stall: exit 11 not 20 (coalesce_ticks 0)', async () => {
  await withRoot({ thr: { stall_calls: 3, coalesce_ticks: 0 } }, async (ctx) => {
    const t = singleTask(ctx);
    setTasks(ctx, [t.row]);
    assertLine(tick(ctx), 0);
    appendCalls(t.file, { sessionId: t.session, cwd: t.cwd, calls: CALLS(3) });
    readyFile(ctx, t.task, 1);
    assertLine(tick(ctx), 11);
    assert.equal(eventsOf(ctx.root, 'stall', 20).length, 0, 'READY voids the stall');
    assert.equal(eventsOf(ctx.root, 'ready', 11).length, 1);
  });
});

test('T6 READY with coalesce_ticks 2: exit 0 at its first tick, pending holds it, exit 11 two ticks later', async () => {
  await withRoot({ thr: { stall_calls: 3, coalesce_ticks: 2 } }, async (ctx) => {
    const t = singleTask(ctx);
    setTasks(ctx, [t.row]);
    assertLine(tick(ctx), 0); // tick 1
    appendCalls(t.file, { sessionId: t.session, cwd: t.cwd, calls: CALLS(3) });
    readyFile(ctx, t.task, 1);
    assertLine(tick(ctx), 0); // tick 2: first sight of READY
    const wj = watcherJson(ctx);
    assert.equal(wj.pending.length, 1);
    assert.equal(wj.pending[0].first_tick, 2);
    assert.equal(wj.pending[0].task, t.task);
    assertLine(tick(ctx), 0); // tick 3: one tick of waiting
    assertLine(tick(ctx), 11); // tick 4: two ticks after first_tick
    assert.equal(eventsOf(ctx.root, 'stall', 20).length, 0);
  });
});

test('T7 READY in an older attempt folder: one zombie-write line, no class 11, none more on a second tick', async () => {
  await withRoot({ thr: { coalesce_ticks: 0 } }, async (ctx) => {
    const task = 'f1-research';
    const s1 = newSid(); const s2 = newSid();
    writeTranscript(tpath(ctx.root, s1), { sessionId: s1, cwd: path.join(ctx.root, 'wt', `${task}-e1`), calls: CALLS(1, 50) });
    writeTranscript(tpath(ctx.root, s2), { sessionId: s2, cwd: path.join(ctx.root, 'wt', `${task}-e2`), calls: [] });
    setTasks(ctx, [row(task, {
      epoch: 2, session: s2, question_ids: ['f1-a-01'],
      attempts: [att(task, 1, { session: s1, stop: 'none', spend_at_fence: 0 }), att(task, 2, { session: s2 })],
    })]);
    readyFile(ctx, task, 1);
    assertLine(tick(ctx), 0);
    let z = ledgerLines(ctx.root, 'zombie-write');
    assert.equal(z.length, 1);
    assert.equal(z[0].data.epoch_seen, 1);
    assert.equal(z[0].data.tokens, 50);
    assert.equal(z[0].task, task);
    assert.equal(eventsOf(ctx.root, 'ready', 11).length, 0, 'a zombie READY is telemetry only');
    assertLine(tick(ctx), 0);
    z = ledgerLines(ctx.root, 'zombie-write');
    assert.equal(z.length, 1, 'a second tick adds no second line');
  });
});

test('T8 soft limit (13) at floor(0.8 e) and hard limit (23) at floor(0.9 e); hard wins by precedence', async () => {
  for (const [input, exit] of [[799, 0], [800, 13], [900, 23]]) {
    await withRoot({ thr: { coalesce_ticks: 0 } }, async (ctx) => {
      const t = singleTask(ctx, { e_task: 1000, calls: [{ usage: { input } }] });
      setTasks(ctx, [t.row]);
      assertLine(tick(ctx), exit);
      assert.equal(watcherJson(ctx).tasks[t.task].spend, input);
    });
  }
});

test('T9 free memory below reserve_mb exits 24', async () => {
  await withRoot({}, async (ctx) => {
    assertLine(tick(ctx, [], { free: 100 }), 24);
    assert.equal(eventsOf(ctx.root, 'memory', 24).length, 1);
  });
  await withRoot({}, async (ctx) => {
    assertLine(tick(ctx, [], { free: 1024 }), 0); // equal to reserve_mb is not below it
  });
});

function failRow(task, fails) {
  return row(task, {
    state: 'active', step: 'stopped', epoch: 2, session: null, fails,
    attempts: [att(task, 1, { stop: 'confirmed' }), att(task, 2)], question_ids: ['f1-a-01'],
  });
}
function forgeWatcher(ctx, ticks_total) {
  const d = deadRecord();
  w(path.join(ctx.root, 'run', 'watcher.json'), {
    schema_version: 1, ce: 1, pid: d.pid, start_time: d.start_time, ticks_total, last_tick_at: NOW, active: {}, pending: [], tasks: {},
  });
}
test('T10 common cause: two non-host fails 5 ticks apart exit 26 and write one halt line', async () => {
  await withRoot({ thr: { W_cc_ticks: 30 } }, async (ctx) => {
    forgeWatcher(ctx, 100);
    setTasks(ctx, [
      failRow('f1-research', [{ epoch: 1, class: 'stall', host: false, tick: 95 }]),
      failRow('f2-research', [{ epoch: 1, class: 'hang', host: false, tick: 100 }]),
    ]);
    assertLine(tick(ctx), 26);
    const halts = ledgerLines(ctx.root, 'halt');
    assert.equal(halts.length, 1);
    assert.equal(halts[0].data.reason, 'common-cause');
    assert.equal(halts[0].data.fails.length, 2);
  });
});

test('T10 common cause: fails 40 ticks apart (W_cc_ticks 30) give nothing', async () => {
  await withRoot({ thr: { W_cc_ticks: 30 } }, async (ctx) => {
    forgeWatcher(ctx, 100);
    setTasks(ctx, [
      failRow('f1-research', [{ epoch: 1, class: 'stall', host: false, tick: 60 }]),
      failRow('f2-research', [{ epoch: 1, class: 'hang', host: false, tick: 100 }]),
    ]);
    // The two stopped rows with a free slot are an act due (17, M3); the point here is that no 26 comes.
    const j = assertLine(tick(ctx), 17);
    assert.ok(!j.result.classes.includes(26), 'no common-cause class');
    assert.equal(eventsOf(ctx.root, 'common-cause', 26).length, 0);
    assert.equal(ledgerLines(ctx.root, 'halt').length, 0);
  });
});

test('T10 common cause: a host fail is not counted', async () => {
  await withRoot({ thr: { W_cc_ticks: 30 } }, async (ctx) => {
    forgeWatcher(ctx, 100);
    setTasks(ctx, [
      failRow('f1-research', [{ epoch: 1, class: 'crash', host: true, tick: 95 }]),
      failRow('f2-research', [{ epoch: 1, class: 'hang', host: false, tick: 100 }]),
    ]);
    // The two stopped rows with a free slot are an act due (17, M3); the point here is that no 26 comes.
    const j = assertLine(tick(ctx), 17);
    assert.ok(!j.result.classes.includes(26), 'no common-cause class');
    assert.equal(eventsOf(ctx.root, 'common-cause', 26).length, 0);
    assert.equal(ledgerLines(ctx.root, 'halt').length, 0);
  });
});

// Review U1-F4: the W_cc window is measured against ticks_total, not only between the fails.
test('T10 common cause: two fails 5 ticks apart but long past (ticks 10 and 15, ticks_total 100) give no 26', async () => {
  await withRoot({ thr: { W_cc_ticks: 30 } }, async (ctx) => {
    forgeWatcher(ctx, 100);
    setTasks(ctx, [
      failRow('f1-research', [{ epoch: 1, class: 'stall', host: false, tick: 10 }]),
      failRow('f2-research', [{ epoch: 1, class: 'hang', host: false, tick: 15 }]),
    ]);
    const j = assertLine(tick(ctx), 17); // the two stopped rows are an act due; no common cause
    assert.ok(!j.result.classes.includes(26), 'no common-cause class');
    assert.equal(eventsOf(ctx.root, 'common-cause', 26).length, 0);
    assert.equal(ledgerLines(ctx.root, 'halt').length, 0);
  });
});

// Review U1-F4: an owner resume takes effect; the same fails do not halt again, a new fail does.
test('T10 common cause: after an owner resume the same fails write no second halt line; a new fail halts again', async () => {
  await withRoot({ thr: { W_cc_ticks: 30 } }, async (ctx) => {
    forgeWatcher(ctx, 100);
    const f1 = { epoch: 1, class: 'stall', host: false, tick: 95 };
    const f2 = { epoch: 1, class: 'hang', host: false, tick: 100 };
    setTasks(ctx, [failRow('f1-research', [f1]), failRow('f2-research', [f2])]);
    assertLine(tick(ctx), 26);
    assert.equal(ledgerLines(ctx.root, 'halt').length, 1);
    addLine(ctx.root, { kind: 'owner', data: { act: 'resume', subject: 'run', quote: 'resume the run' } });
    const r2 = tick(ctx); // ticks_total 102: both fails still inside W_cc_ticks
    assert.ok(r2.json, `one JSON line: ${r2.stdout} ${r2.stderr}`);
    assert.equal(ledgerLines(ctx.root, 'halt').length, 1, 'the resume stands: no second halt for the same fails');
    const r3 = tick(ctx);
    assert.ok(r3.json, `one JSON line: ${r3.stdout} ${r3.stderr}`);
    assert.equal(ledgerLines(ctx.root, 'halt').length, 1, 'still none on a later tick');
    const f3 = { epoch: 1, class: 'loop', host: false, tick: 103 };
    setTasks(ctx, [failRow('f1-research', [f1]), failRow('f2-research', [f2]), failRow('f3-research', [f3])], 2);
    tick(ctx);
    const halts = ledgerLines(ctx.root, 'halt');
    assert.equal(halts.length, 2, 'a fail no halt has named yet halts again');
    assert.ok(halts[1].data.fails.some((f) => f.tick === 103));
  });
});

test('T11 coordinator window above W_star_coord exits 16 with one drain line, a second watcher writes none', async () => {
  const csid = newSid();
  await withRoot({ coord: { session: csid } }, async (ctx) => {
    writeTranscript(tpath(ctx.root, csid), { sessionId: csid, cwd: ctx.root, calls: [{ usage: { input: 140000 } }] });
    assertLine(tick(ctx), 16);
    let d = ledgerLines(ctx.root, 'drain');
    assert.equal(d.length, 1);
    assert.equal(d[0].ce, 1);
    assert.equal(d[0].data.window, 140000);
    assert.equal(d[0].data.w_star, 133200);
    tick(ctx); // a second watcher of the same ce
    d = ledgerLines(ctx.root, 'drain');
    assert.equal(d.length, 1, 'one drain line per ce');
  });
});

test('T12 tamper: an edited middle ledger line exits 27', async () => {
  await withRoot({}, async (ctx) => {
    ctx.skipLedger = true;
    for (const pct of [10, 20, 30]) addLine(ctx.root, { kind: 'meter', data: { pct, self_reported: true } });
    fs.writeFileSync(ledgerFile(ctx.root), fs.readFileSync(ledgerFile(ctx.root), 'utf8').replace('"pct":20', '"pct":21'));
    assertLine(tick(ctx), 27);
  });
});

test('T12 tamper: an incident with detail.tamper above acked_seq exits 27, at or below acked_seq it does not', async () => {
  const tamper = { class: 'refusal', detail: { tamper: true, script: 'commit', code: 'object-mismatch' } };
  await withRoot({}, async (ctx) => {
    addLine(ctx.root, { kind: 'meter', data: { pct: 10, self_reported: true } });
    addLine(ctx.root, { kind: 'incident', data: tamper });
    assertLine(tick(ctx), 27);
  });
  await withRoot({}, async (ctx) => {
    addLine(ctx.root, { kind: 'meter', data: { pct: 10, self_reported: true } });
    addLine(ctx.root, { kind: 'incident', data: tamper });
    w(path.join(ctx.root, 'run', 'acked.json'), { schema_version: 1, ce: 1, acked_seq: 2, at: NOW });
    assertLine(tick(ctx), 0);
  });
});

test('T12 reopened dismissal: a tms check line with a reopened reason above acked_seq is class 10', async () => {
  const reopened = { check: 'tms', subject: 'labels', result: 'pass', reasons: [{ code: 'reopened', detail: ['f1-a-01'] }] };
  await withRoot({}, async (ctx) => {
    addLine(ctx.root, { kind: 'meter', data: { pct: 10, self_reported: true } });
    addLine(ctx.root, { kind: 'check', data: reopened });
    assertLine(tick(ctx), 10);
    assert.equal(eventsOf(ctx.root, 'reopened', 10).length, 1);
  });
  await withRoot({}, async (ctx) => {
    addLine(ctx.root, { kind: 'meter', data: { pct: 10, self_reported: true } });
    addLine(ctx.root, { kind: 'check', data: reopened });
    w(path.join(ctx.root, 'run', 'acked.json'), { schema_version: 1, ce: 1, acked_seq: 2, at: NOW });
    assertLine(tick(ctx), 0);
  });
});

test('T13 precedence: memory and stall together exit 24', async () => {
  await withRoot({ thr: { stall_calls: 3 } }, async (ctx) => {
    const t = singleTask(ctx);
    setTasks(ctx, [t.row]);
    assertLine(tick(ctx), 0);
    appendCalls(t.file, { sessionId: t.session, cwd: t.cwd, calls: CALLS(3) });
    assertLine(tick(ctx, [], { free: 100 }), 24);
  });
});

test('T13 precedence: ready and soft limit together exit 11', async () => {
  await withRoot({ thr: { coalesce_ticks: 0 } }, async (ctx) => {
    const t = singleTask(ctx, { e_task: 1000, calls: [{ usage: { input: 800 } }] });
    setTasks(ctx, [t.row]);
    readyFile(ctx, t.task, 1);
    assertLine(tick(ctx), 11);
  });
});

test('T14 onset keys: an acknowledged condition stays quiet; one that clears and returns raises a new key', async () => {
  await withRoot({}, async (ctx) => {
    assertLine(tick(ctx, [], { free: 100 }), 24); // tick 1
    const first = eventsOf(ctx.root, 'memory', 24);
    assert.equal(first.length, 1);
    w(path.join(ctx.root, 'run', 'acked.json'), { schema_version: 1, ce: 1, acked_seq: first[0].seq, at: NOW });
    assertLine(tick(ctx, [], { free: 100 }), 0); // tick 2: still present, acknowledged
    assert.equal(eventsOf(ctx.root, 'memory', 24).length, 1, 'no new line while the acknowledged condition persists');
    assertLine(tick(ctx, [], { free: 100000 }), 0); // tick 3: absent
    assertLine(tick(ctx, [], { free: 100 }), 24); // tick 4: present again
    const all = eventsOf(ctx.root, 'memory', 24);
    assert.equal(all.length, 2, 'one new event line for the new onset');
    assert.notEqual(all[0].data.key, all[1].data.key);
    const onset = (k) => Number(String(k).split('|').pop());
    assert.ok(onset(all[1].data.key) > onset(all[0].data.key), 'a later onset tick');
  });
});

test('T15 coord ce raised before the tick: exit 64, no ledger line, watcher.json unchanged', async () => {
  await withRoot({ ce: 2 }, async (ctx) => {
    const r = tick(ctx, [], { ce: 1 });
    assertLine(r, 64);
    assert.equal(fs.existsSync(ledgerFile(ctx.root)), false);
    assert.equal(fs.existsSync(path.join(ctx.root, 'run', 'watcher.json')), false);
  });
  await withRoot({ ce: 1 }, async (ctx) => {
    assertLine(tick(ctx), 0);
    const before = fs.readFileSync(path.join(ctx.root, 'run', 'watcher.json'), 'utf8');
    const lines = ledgerLines(ctx.root).length;
    w(path.join(ctx.root, 'run', 'coord.json'), { schema_version: 1, ce: 2, started_at: NOW, tcb_commit: COMMIT });
    assertLine(tick(ctx), 64);
    assert.equal(fs.readFileSync(path.join(ctx.root, 'run', 'watcher.json'), 'utf8'), before);
    assert.equal(ledgerLines(ctx.root).length, lines);
  });
});

// Review U1-F3: a default-mode watcher re-checks the ce at the start of every tick, so the watcher
// of an old ce ends (64) and releases watcher.lock instead of looping on.
test('T15 default-mode watcher: coord ce raised after its first tick -> exit 64, watcher.lock released, no tick after', async () => {
  await withRoot({}, async (ctx) => {
    const wjPath = path.join(ctx.root, 'run', 'watcher.json');
    const { child, done } = startScript(ctx.root, 'watch', [...baseArgs(ctx), '--interval-ms', '50', '--no-intake']);
    let res = null;
    try {
      await waitFor(() => fs.existsSync(wjPath) && (() => { try { return J(wjPath).ticks_total >= 1; } catch { return false; } })(), { timeout: 60000 });
      w(path.join(ctx.root, 'run', 'coord.json'), { schema_version: 1, ce: 2, started_at: NOW, tcb_commit: COMMIT });
      const atRaise = J(wjPath).ticks_total;
      res = await Promise.race([done, sleep(20000).then(() => null)]);
      assert.ok(res, 'the watcher of the old ce did not end within 20 s');
      assertLine(res, 64);
      assert.equal(hasWatcherLock(ctx), false, 'watcher.lock released');
      // A tick already past its ce check when the raise landed may still write once; no later one.
      assert.ok(J(wjPath).ticks_total <= atRaise + 1, `ticks after the raise: ${J(wjPath).ticks_total - atRaise}`);
    } finally {
      if (!res) {
        try { child.kill(); } catch { /* gone */ }
        await done;
      }
    }
  });
});

test('T16 a second watcher while the first holds watcher.lock exits 75', async () => {
  await withRoot({ thr: { lock_retries: 3 } }, async (ctx) => {
    const holder = ctx.sleeper();
    const rec = JSON.stringify(lockRec(holder, { script: 'watch' }));
    w(path.join(ctx.root, 'run', 'watcher.lock'), rec);
    assertLine(tick(ctx), 75);
    assert.equal(fs.readFileSync(path.join(ctx.root, 'run', 'watcher.lock'), 'utf8'), rec, 'the holder\'s lock is untouched');
  });
});

test('T16 a watcher.lock whose holder is dead is broken and the watcher runs', async () => {
  await withRoot({ thr: { lock_retries: 3 } }, async (ctx) => {
    w(path.join(ctx.root, 'run', 'watcher.lock'), JSON.stringify(lockRec(deadRecord(), { script: 'watch' })));
    assertLine(tick(ctx), 0);
    assert.ok(fs.existsSync(path.join(ctx.root, 'run', 'watcher.json')));
    assert.equal(hasWatcherLock(ctx), false);
  });
});

test('T17 unparseable watcher.json exits 67; unparseable tasks.json exits 67', async () => {
  await withRoot({}, async (ctx) => {
    w(path.join(ctx.root, 'run', 'watcher.json'), '{ not json');
    assertLine(tick(ctx), 67);
    assert.equal(hasWatcherLock(ctx), false, 'the lock is released on exit 67');
  });
  await withRoot({}, async (ctx) => {
    w(path.join(ctx.root, 'run', 'tasks.json'), '{ not json');
    assertLine(tick(ctx), 67);
  });
});

test('T18 intake is spawned once and not again while it is alive', async () => {
  await withRoot({}, async (ctx) => {
    installStubs(ctx, { hold: { harvest: true } });
    const t = singleTask(ctx);
    setTasks(ctx, [t.row]);
    const spawnTick = () => run(ctx.root, 'watch', [...baseArgs(ctx), '--once']); // no --no-intake
    try {
      assertLine(spawnTick(), 0);
      const wj = watcherJson(ctx);
      assert.ok(wj.intake && Number.isInteger(wj.intake.pid), 'watcher.json.intake {pid, start_time}');
      assert.equal(typeof wj.intake.start_time, 'string');
      ctx.pids.push(wj.intake.pid);
      await waitFor(() => stubLog(ctx.root).some((c) => c.script === 'harvest'));
      assert.equal(pidAlive(wj.intake.pid), true);
      assertLine(spawnTick(), 0); // a second tick while it is alive
      assert.equal(watcherJson(ctx).intake.pid, wj.intake.pid, 'no second intake');
      assert.equal(stubLog(ctx.root).filter((c) => c.script === 'harvest').length, 1);
      w(path.join(ctx.root, 'tmp', 'release'), '1');
      await waitFor(() => !pidAlive(wj.intake.pid));
      const names = stubLog(ctx.root).map((c) => c.script);
      assert.deepEqual(names, ['harvest', 'commit', 'witness', 'promote', 'tms', 'status'], 'it was an --intake run (steps in order)');
      const h = stubLog(ctx.root)[0].args;
      assert.ok(h.includes('--task') && h.includes(t.task) && h.includes('--epoch') && h.includes('1'));
      assert.ok(h.includes('--root') && h.includes('--ce'));
      // once the intake has ended, a later tick spawns a new one
      assertLine(spawnTick(), 0);
      const again = watcherJson(ctx).intake;
      assert.ok(again && again.pid !== wj.intake.pid);
      ctx.pids.push(again.pid);
    } finally {
      w(path.join(ctx.root, 'tmp', 'release'), '1');
    }
  });
});

async function intakeCase(config, rowOpts = {}, thr = {}) {
  let out;
  await withRoot({ thr }, async (ctx) => {
    installStubs(ctx, config);
    const t = singleTask(ctx, rowOpts);
    setTasks(ctx, [t.row]);
    const r = intakeRun(ctx);
    out = { r, log: stubLog(ctx.root).map((c) => c.script), incidents: ledgerLines(ctx.root, 'incident'), ctx, t, args: stubLog(ctx.root) };
  });
  return out;
}
test('T19 intake: a step exiting 2 gives one incident naming it, intake continues, exit 0', async () => {
  const o = await intakeCase({ exit: { harvest: 0, commit: 2, witness: 0 } });
  const j = assertLine(o.r, 0);
  assert.deepEqual(o.log, ['harvest', 'commit', 'witness', 'promote', 'tms', 'status']);
  assert.equal(o.incidents.length, 1);
  assert.equal(o.incidents[0].data.class, 'not-run');
  assert.match(String(o.incidents[0].data.detail.script), /commit/);
  assert.equal(o.incidents[0].data.detail.exit, 2);
  assert.equal(j.result.steps.length, 6);
  assert.equal(j.result.steps[1].exit, 2);
  assert.match(String(j.result.steps[1].script), /commit/);
});

test('T19 intake: steps exiting 1, 6 and 10 give no incident', async () => {
  const o = await intakeCase({ exit: { harvest: 1, commit: 6, witness: 10 } });
  assertLine(o.r, 0);
  assert.deepEqual(o.log, ['harvest', 'commit', 'witness', 'promote', 'tms', 'status']);
  assert.equal(o.incidents.length, 0);
});

test('T19 intake: a step exiting 70 gives one incident', async () => {
  const o = await intakeCase({ exit: { tms: 70 } });
  assertLine(o.r, 0);
  assert.equal(o.incidents.length, 1);
  assert.match(String(o.incidents[0].data.detail.script), /tms/);
  assert.equal(o.incidents[0].data.detail.exit, 70);
});

test('T19 intake: a step exiting 64 ends the intake with 64', async () => {
  const o = await intakeCase({ exit: { commit: 64 } });
  assertLine(o.r, 64);
  assert.deepEqual(o.log, ['harvest', 'commit']);
});

test('T19 intake: a step exiting 3 ends the intake with 3', async () => {
  const o = await intakeCase({ exit: { witness: 3 } });
  assertLine(o.r, 3);
  assert.deepEqual(o.log, ['harvest', 'commit', 'witness']);
});

// Review U1-F6: a step that never exits is ended by its timeout, counted as exit 70 with one
// not-run incident {script, exit 70, timeout true}, and the intake goes on with the next step.
test('T19 intake: a step that does not exit within intake_step_timeout_ms is ended, one incident, the next steps run', async () => {
  const o = await intakeCase({ hold: { harvest: true } }, {}, { intake_step_timeout_ms: 1500 });
  const j = assertLine(o.r, 0);
  assert.deepEqual(o.log, ['harvest', 'commit', 'witness', 'promote', 'tms', 'status']);
  assert.equal(o.incidents.length, 1);
  assert.equal(o.incidents[0].data.class, 'not-run');
  assert.match(String(o.incidents[0].data.detail.script), /harvest/);
  assert.equal(o.incidents[0].data.detail.exit, 70);
  assert.equal(o.incidents[0].data.detail.timeout, true);
  assert.equal(j.result.steps[0].exit, 70);
  assert.equal(j.result.steps[0].timeout, true);
  assert.equal(j.result.steps[1].timeout, undefined);
});

test('T19 intake: snap --new runs only when f5_given is true', async () => {
  const o = await intakeCase({}, {}, { f5_given: true });
  assertLine(o.r, 0);
  assert.deepEqual(o.log, ['harvest', 'commit', 'snap', 'witness', 'promote', 'tms', 'status']);
  assert.ok(o.args[2].args.includes('--new'));
  const c = o.args[1].args;
  assert.ok(c.includes('intake') && c.includes('--task') && c.includes('--epoch'));
  const p = o.args[4].args;
  assert.ok(p.includes('--from') && p.includes('witness'));
});

const alarmArgs = (ctx, ms, ce = 1) => ['--alarm', '--root', ctx.root, '--ce', String(ce), '--sleep-ms', String(ms), '--now', NOW];
const alarmFile = (ctx) => path.join(ctx.root, 'run', 'alarm.json');
test('T20 alarm: --sleep-ms 100 writes alarm.json and exits 30', async () => {
  await withRoot({}, async (ctx) => {
    const j = assertLine(run(ctx.root, 'watch', alarmArgs(ctx, 100)), 30);
    assert.equal(j.result.run, 'alarm');
    const a = J(alarmFile(ctx));
    assert.ok(Number.isInteger(a.pid) && a.pid > 0);
    assert.equal(a.ce, 1);
    assert.equal(a.sleep_ms, 100);
    assert.equal(typeof a.start_time, 'string');
    assert.equal(typeof a.armed_at, 'string');
  });
});

test('T20 alarm: a coord ce raised during the sleep exits 64', async () => {
  await withRoot({}, async (ctx) => {
    const a = startScript(ctx.root, 'watch', alarmArgs(ctx, 5000));
    await waitFor(() => fs.existsSync(alarmFile(ctx)));
    w(path.join(ctx.root, 'run', 'coord.json'), { schema_version: 1, ce: 2, started_at: NOW, tcb_commit: COMMIT });
    assertLine(await a.done, 64);
  });
});

test('T20 alarm: a second alarm supersedes the first without signalling it', async () => {
  await withRoot({}, async (ctx) => {
    const first = startScript(ctx.root, 'watch', alarmArgs(ctx, 6000));
    await waitFor(() => fs.existsSync(alarmFile(ctx)));
    assert.equal(J(alarmFile(ctx)).pid, first.child.pid);
    const second = startScript(ctx.root, 'watch', alarmArgs(ctx, 2000));
    await waitFor(() => { try { return J(alarmFile(ctx)).pid === second.child.pid; } catch { return false; } });
    const r2 = await second.done;
    const j2 = assertLine(r2, 30);
    assert.ok(JSON.stringify(j2.result.previous ?? null).includes(String(first.child.pid)), 'result.previous records the first alarm');
    assert.equal(first.child.exitCode, null, 'the first alarm was not signalled and still sleeps');
    const r1 = await first.done;
    assertLine(r1, 0);
    assert.ok(r1.stdout.includes('superseded'));
    assert.equal(J(alarmFile(ctx)).pid, second.child.pid, 'alarm.json names the second');
  });
});

test('T21 every exit prints one section-1.3 line, every ledger written verifies', async () => {
  await withRoot({}, async (ctx) => {
    const once = assertLine(tick(ctx), 0);
    assert.equal(once.result.run, 'once');
    assert.equal(once.mode, null);
    const alarm = assertLine(run(ctx.root, 'watch', alarmArgs(ctx, 50)), 30);
    assert.equal(alarm.result.run, 'alarm');
    assertLine(tick(ctx, [], { ce: 9 }), 64);
    assertLine(tick(ctx, [], { free: 10 }), 24);
    installStubs(ctx, {});
    const intake = assertLine(intakeRun(ctx), 0);
    assert.equal(intake.result.run, 'intake');
    assertLedgerOk(ctx.root);
  });
});

test('T22 incremental parse: only the new bytes of a 50 MB transcript are read at tick 2', async () => {
  await withRoot({}, async (ctx) => {
    const sid = newSid();
    const task = 'f1-research';
    const cwd = path.join(ctx.root, 'wt', `${task}-e1`);
    const file = tpath(ctx.root, sid);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const fd = fs.openSync(file, 'w');
    const big = 'a'.repeat(250000);
    fs.writeSync(fd, JSON.stringify(startRecord(sid, cwd)) + '\n');
    for (let i = 0; i < 200; i++) {
      const recs = callRecords({ sessionId: sid, cwd, call: { usage: { input: 5 }, text: big } });
      fs.writeSync(fd, recs.map((r) => JSON.stringify(r)).join('\n') + '\n');
    }
    fs.closeSync(fd);
    const size1 = fs.statSync(file).size;
    assert.ok(size1 > 50_000_000, 'the fake transcript is about 50 MB');
    setTasks(ctx, [row(task, { session: sid, question_ids: ['f1-a-01'], e_task: 100000000 })]);
    assertLine(tick(ctx), 0);
    let tk = watcherJson(ctx).tasks[task];
    assert.equal(tk.calls, 200);
    assert.equal(findFile(tk.files, `${sid}.jsonl`).end_byte, size1);
    // Overwrite the first 2 MB in place (same size): a watcher that re-read from byte 0 would lose calls.
    const wfd = fs.openSync(file, 'r+');
    fs.writeSync(wfd, Buffer.alloc(2_000_000, 0x78), 0, 2_000_000, 0);
    fs.closeSync(wfd);
    appendCalls(file, { sessionId: sid, cwd, calls: CALLS(3, 5) });
    const size2 = fs.statSync(file).size;
    assertLine(tick(ctx), 0);
    tk = watcherJson(ctx).tasks[task];
    assert.equal(tk.calls, 203, 'three new calls counted on top of the stored 200');
    assert.equal(findFile(tk.files, `${sid}.jsonl`).end_byte, size2);
  });
});

test('T22 incremental parse: a call split across the read boundary is counted once with its final usage', async () => {
  await withRoot({}, async (ctx) => {
    const sid = newSid();
    const task = 'f1-research';
    const cwd = path.join(ctx.root, 'wt', `${task}-e1`);
    const file = tpath(ctx.root, sid);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, fixtureText('_split-call-a.jsonl', sid, cwd));
    setTasks(ctx, [row(task, { session: sid, question_ids: ['f1-a-01'] })]);
    assertLine(tick(ctx), 0);
    assert.equal(watcherJson(ctx).tasks[task].calls, 2);
    assert.equal(watcherJson(ctx).tasks[task].spend, 150);
    fs.appendFileSync(file, fixtureText('_split-call-b.jsonl', sid, cwd));
    assertLine(tick(ctx), 0);
    const tk = watcherJson(ctx).tasks[task];
    assert.equal(tk.calls, 2, 'the continued call is not a new call');
    assert.equal(tk.spend, 170, 'its usage replaced the stored usage (100 + 70)');
    assert.equal(findFile(tk.files, `${sid}.jsonl`).end_byte, fs.statSync(file).size);
  });
});

test('T22 incremental parse: a truncated transcript is re-parsed from 0', async () => {
  await withRoot({}, async (ctx) => {
    const t = singleTask(ctx, { calls: CALLS(5, 10), qids: ['f1-a-01'] });
    setTasks(ctx, [t.row]);
    assertLine(tick(ctx), 0);
    assert.equal(findFile(watcherJson(ctx).tasks[t.task].files, `${t.session}.jsonl`).calls, 5);
    writeTranscript(t.file, { sessionId: t.session, cwd: t.cwd, calls: CALLS(2, 10) });
    const size = fs.statSync(t.file).size;
    tick(ctx);
    const f = findFile(watcherJson(ctx).tasks[t.task].files, `${t.session}.jsonl`);
    assert.equal(f.end_byte, size);
    assert.equal(f.calls, 2);
  });
});

// ------------------------------------------------ further behaviours of the Evaluate steps
test('X1 zombie spend past Z_frac of e_task exits 25', async () => {
  await withRoot({ thr: { Z_frac: 0.1 } }, async (ctx) => {
    const task = 'f1-research';
    const s1 = newSid(); const s2 = newSid();
    writeTranscript(tpath(ctx.root, s1), { sessionId: s1, cwd: path.join(ctx.root, 'wt', `${task}-e1`), calls: CALLS(1, 600) });
    writeTranscript(tpath(ctx.root, s2), { sessionId: s2, cwd: path.join(ctx.root, 'wt', `${task}-e2`), calls: [] });
    setTasks(ctx, [row(task, {
      epoch: 2, session: s2, question_ids: ['f1-a-01'], e_task: 1000,
      attempts: [att(task, 1, { session: s1, stop: 'none', spend_at_fence: 100 }), att(task, 2, { session: s2 })],
    })]);
    assertLine(tick(ctx), 25);
  });
});

test('X2 a repair READY exits 12 and voids a stall', async () => {
  await withRoot({ thr: { stall_calls: 3 } }, async (ctx) => {
    const t = singleTask(ctx);
    setTasks(ctx, [t.row]);
    assertLine(tick(ctx), 0);
    appendCalls(t.file, { sessionId: t.session, cwd: t.cwd, calls: CALLS(3) });
    readyFile(ctx, t.task, 1, { kind: 'repair', task: t.task, epoch: 1, question_ids: ['f1-a-01'], missing: 'source' });
    assertLine(tick(ctx), 12);
    assert.equal(eventsOf(ctx.root, 'stall', 20).length, 0);
  });
});

test('X3 a child window at W_star_child exits 15 when W_star_child is a gate', async () => {
  await withRoot({ thr: { W_star_child: { value: 5000, gate: true } } }, async (ctx) => {
    const t = singleTask(ctx, { e_task: 1000000, calls: [{ usage: { input: 6000 } }] });
    setTasks(ctx, [t.row]);
    assertLine(tick(ctx), 15);
  });
  await withRoot({}, async (ctx) => {
    const t = singleTask(ctx, { e_task: 1000000, calls: [{ usage: { input: 6000 } }] });
    setTasks(ctx, [t.row]);
    assertLine(tick(ctx), 0); // W_star_child null: only a reading
  });
});

test('X4 checker batch: a candidate alone exits 14 while no row is running; with a row it waits for batch_size', async () => {
  await withRoot({}, async (ctx) => {
    const card = putCard(ctx.root, { qids: ['f1-a-01'] });
    cardStatus(ctx.root, card);
    assertLine(tick(ctx), 14);
  });
  await withRoot({}, async (ctx) => {
    const card = putCard(ctx.root, { qids: ['f1-a-01'] });
    cardStatus(ctx.root, card);
    const t = singleTask(ctx);
    setTasks(ctx, [t.row]);
    assertLine(tick(ctx), 0);
  });
  await withRoot({ thr: { batch_size: 1 } }, async (ctx) => {
    const card = putCard(ctx.root, { qids: ['f1-a-01'] });
    cardStatus(ctx.root, card);
    const t = singleTask(ctx);
    setTasks(ctx, [t.row]);
    assertLine(tick(ctx), 14);
  });
});

test('X5 usage: --once with --alarm, an unknown flag and a missing --ce exit 66', async () => {
  await withRoot({}, async (ctx) => {
    assert.equal(run(ctx.root, 'watch', [...baseArgs(ctx), '--once', '--alarm']).exit, 66);
    assert.equal(run(ctx.root, 'watch', [...baseArgs(ctx), '--once', '--no-such-flag']).exit, 66);
    assert.equal(run(ctx.root, 'watch', ['--root', ctx.root, '--once']).exit, 66);
    assert.equal(fs.existsSync(ledgerFile(ctx.root)), false);
  });
});

test('X6 intake with a stale ce exits 64 and runs no step', async () => {
  await withRoot({ ce: 2 }, async (ctx) => {
    installStubs(ctx, {});
    setTasks(ctx, [row('f1-research', { session: newSid(), question_ids: ['f1-a-01'] })]);
    assertLine(run(ctx.root, 'watch', ['--intake', '--root', ctx.root, '--ce', '1']), 64);
    assert.equal(stubLog(ctx.root).length, 0);
  });
});

test('X7 a design-check task (V null) has no stall counter, so new calls never exit 20', async () => {
  await withRoot({ thr: { stall_calls: 3 } }, async (ctx) => {
    const task = 'f1-dcheck';
    const session = newSid();
    const cwd = path.join(ctx.root, 'wt', `${task}-e1`);
    const file = tpath(ctx.root, session);
    writeTranscript(file, { sessionId: session, cwd, calls: [] });
    setTasks(ctx, [row(task, { session, field: null, stage: 'design-check', role: 'mapper', steps: ['hazards'], question_ids: [] })]);
    assertLine(tick(ctx), 0);
    appendCalls(file, { sessionId: session, cwd, calls: CALLS(4) });
    assertLine(tick(ctx), 0);
    assert.equal(eventsOf(ctx.root, 'stall', 20).length, 0);
  });
});

test('X8 coordinator window at W_quality exits 15 (before 16), with the drain line written', async () => {
  const csid = newSid();
  await withRoot({ coord: { session: csid } }, async (ctx) => {
    writeTranscript(tpath(ctx.root, csid), { sessionId: csid, cwd: ctx.root, calls: [{ usage: { input: 310000 } }] });
    assertLine(tick(ctx), 15);
    assert.equal(ledgerLines(ctx.root, 'drain').length, 1);
  });
});

// ------------------------------------------------ cannot be tested without the app
const NEEDS_APP = 'needs the app';
// =============================================================== second model check (CONTRACT decision 40)
const ackUpTo = (ctx, seq) => w(path.join(ctx.root, 'run', 'acked.json'), { schema_version: 1, ce: 1, acked_seq: seq, at: NOW });
const actEvents = (ctx, act) => eventsOf(ctx.root, 'act-due', 17).filter((l) => act === undefined || l.data?.detail?.act === act);
const actsOf = (j) => (j.reasons ?? []).filter((x) => x.code === 'act-due').map((x) => x.detail?.act);

test('M1 alarm: an endturn during the sleep re-arms the running alarm by its token; nothing is killed or replaced', async () => {
  await withRoot({}, async (ctx) => {
    // 8 s: room for the endturn (node start and one PowerShell call) to land inside the first sleep.
    const a = startScript(ctx.root, 'watch', alarmArgs(ctx, 8000));
    await waitFor(() => fs.existsSync(alarmFile(ctx)));
    const before = fs.readFileSync(alarmFile(ctx));
    // The real endturn: it rewrites acked.json (the arm token) and starts or kills nothing.
    const e = run(ctx.root, 'status', ['--endturn', '--acked-seq', '0', '--root', ctx.root, '--ce', '1', '--now', NOW]);
    assert.ok(e.json && [0, 1].includes(e.exit), `endturn ran: ${e.stdout} ${e.stderr}`);
    assert.ok(fs.existsSync(path.join(ctx.root, 'run', 'acked.json')), 'endturn wrote the token');
    assert.equal(a.child.exitCode, null, 'endturn did not end the alarm');
    const r = await a.done;
    const j = assertLine(r, 30);
    assert.equal(j.result.rearms, 1, 'the alarm slept one more period after the token changed (without M1: 0)');
    assert.equal(j.result.superseded, false);
    assert.ok(before.equals(fs.readFileSync(alarmFile(ctx))), 'alarm.json still names the same alarm, unchanged');
  });
});

test('M1 alarm: with no endturn during the sleep it fires after one period (rearms 0)', async () => {
  await withRoot({}, async (ctx) => {
    ackUpTo(ctx, 0);
    const j = assertLine(run(ctx.root, 'watch', alarmArgs(ctx, 200)), 30);
    assert.equal(j.result.rearms, 0);
  });
});

test('M3 act due: a planned row with a free slot exits 17 replace-fence; once acknowledged it stays quiet', async () => {
  await withRoot({ thr: { coalesce_ticks: 0 } }, async (ctx) => {
    setTasks(ctx, [row('f1-research', { state: 'planned', step: 'none', epoch: 0, attempts: [] })]);
    const j = assertLine(tick(ctx), 17);
    assert.deepEqual(actsOf(j), ['replace-fence']);
    const ev = actEvents(ctx, 'replace-fence');
    assert.equal(ev.length, 1);
    assert.equal(ev[0].data.urgent, false);
    assert.match(ev[0].data.key, /^17\|f1-research:replace-fence\|0\|\d+$/);
    ackUpTo(ctx, ev[0].seq);
    assertLine(tick(ctx), 0);
    assert.equal(actEvents(ctx).length, 1, 'no new line while the acknowledged act persists');
  });
});

test('M3 act due: with every slot used a planned row raises nothing; a third slot makes it due', async () => {
  const rows = () => [row('f1-research'), row('f2-research'), row('f3-research', { state: 'planned', step: 'none', epoch: 0, attempts: [] })];
  await withRoot({ thr: { coalesce_ticks: 0, N_max: 2 } }, async (ctx) => {
    setTasks(ctx, rows());
    assertLine(tick(ctx), 0);
    assert.equal(actEvents(ctx).length, 0, 'two bound rows fill N_max 2');
  });
  await withRoot({ thr: { coalesce_ticks: 0, N_max: 3 } }, async (ctx) => {
    setTasks(ctx, rows());
    assert.deepEqual(actsOf(assertLine(tick(ctx), 17)), ['replace-fence']);
  });
});

test('M3 act due: a fenced row is stop-request; failed and limit rows raise no row act', async () => {
  await withRoot({ thr: { coalesce_ticks: 0 } }, async (ctx) => {
    setTasks(ctx, [row('f1-research', { step: 'fenced', epoch: 2 })]);
    assert.deepEqual(actsOf(assertLine(tick(ctx), 17)), ['stop-request']);
  });
  await withRoot({ thr: { coalesce_ticks: 0 } }, async (ctx) => {
    setTasks(ctx, [row('f1-research', { step: 'fenced', epoch: 2, limit: true })]);
    assertLine(tick(ctx), 0);
    assert.equal(actEvents(ctx).length, 0, 'a limit row is the owner\'s');
  });
  await withRoot({ thr: { coalesce_ticks: 0 } }, async (ctx) => {
    setTasks(ctx, [row('f1-research', { state: 'failed', step: 'stopped', epoch: 2 })]);
    const j = assertLine(tick(ctx), 17);
    assert.deepEqual(actsOf(j), ['run-terminal'], 'only the run-level act: every row terminal');
    assert.equal(actEvents(ctx).filter((l) => l.task === 'f1-research').length, 0);
  });
});

test('M3 act due: stop-verify only once the sample is stop_verify_deltas ticks old', async () => {
  await withRoot({ thr: { coalesce_ticks: 0, stop_verify_deltas: 2 } }, async (ctx) => {
    const task = 'f1-research';
    forgeWatcher(ctx, 100);
    setTasks(ctx, [row(task, { step: 'stop-requested', epoch: 2, attempts: [att(task, 1, { stop: 'requested' }), att(task, 2)] })]);
    w(path.join(ctx.root, 'run', 'stop-sample', `${task}-e1.json`), { schema_version: 1, task, epoch: 1, target: 1, tick: 100, sizes: {} });
    assertLine(tick(ctx), 0); // tick 101: the verify could only defer
    assert.equal(actEvents(ctx).length, 0);
    const j = assertLine(tick(ctx), 17); // tick 102
    assert.deepEqual(actsOf(j), ['stop-verify@100']);
  });
  await withRoot({ thr: { coalesce_ticks: 0 } }, async (ctx) => {
    const task = 'f1-research';
    setTasks(ctx, [row(task, { step: 'stop-requested', epoch: 2, attempts: [att(task, 1, { stop: 'requested' }), att(task, 2)] })]);
    assert.deepEqual(actsOf(assertLine(tick(ctx), 17)), ['stop-session'], 'no sample yet: the session is to be stopped');
  });
});

test('M3 act due: an admitted row is start-session, and bind once its folder has a transcript (a new key)', async () => {
  await withRoot({ thr: { coalesce_ticks: 0 } }, async (ctx) => {
    const task = 'f1-research';
    setTasks(ctx, [row(task, { step: 'admitted', epoch: 1 })]);
    const j1 = assertLine(tick(ctx), 17);
    assert.deepEqual(actsOf(j1), ['start-session']);
    ackUpTo(ctx, actEvents(ctx, 'start-session')[0].seq);
    assertLine(tick(ctx), 0);
    const folder = path.join(ctx.root, 'wt', `${task}-e1`);
    const sid = newSid();
    writeTranscript(path.join(ctx.root, 'transcripts', LIB.projectDirName(folder), sid + '.jsonl'), { sessionId: sid, cwd: folder, calls: CALLS(1) });
    const j2 = assertLine(tick(ctx), 17);
    assert.deepEqual(actsOf(j2), ['bind']);
    assert.equal(actEvents(ctx, 'bind').length, 1);
  });
});

test('M3 act due: a drain of this ce with no slot used is handover', async () => {
  await withRoot({ thr: { coalesce_ticks: 0 } }, async (ctx) => {
    addLine(ctx.root, { kind: 'drain', data: { window: 1, w_star: 1 } });
    ackUpTo(ctx, 1);
    assert.deepEqual(actsOf(assertLine(tick(ctx), 17)), ['handover']);
  });
});

test('M3 act due: an event line above acked_seq whose condition has cleared wakes as events', async () => {
  await withRoot({ thr: { coalesce_ticks: 0 } }, async (ctx) => {
    assertLine(tick(ctx, [], { free: 100 }), 24); // a memory event, never acknowledged
    const mem = eventsOf(ctx.root, 'memory', 24);
    assert.equal(mem.length, 1);
    const j = assertLine(tick(ctx), 17); // memory is back: the condition cleared, its line is unacked
    assert.deepEqual(actsOf(j), ['events']);
    assert.deepEqual(j.reasons[0].detail.seqs, [mem[0].seq]);
    ackUpTo(ctx, ledgerLines(ctx.root).at(-1).seq);
    assertLine(tick(ctx), 0);
  });
});

// FX-W5 (FIX-wake.md FX-W5 steps 2-3, branch R1): raised again while the condition holds; `stuck`.
// jumpTo(ctx, n): the next --once tick is tick n (watcher.json's ticks_total forged to n - 1).
const jumpTo = (ctx, n) => w(path.join(ctx.root, 'run', 'watcher.json'), { ...watcherJson(ctx), ticks_total: n - 1 });
const keyTick = (l) => Number(String(l.data.key).split('|').pop());

test('W5 re-raise: an acknowledged act-due still due is raised again after 15, 30, 60 and 60 ticks, never while unacknowledged', async () => {
  await withRoot({ thr: { coalesce_ticks: 0, stuck_raises: 1 } }, async (ctx) => {
    setTasks(ctx, [row('f1-research', { state: 'planned', step: 'none', epoch: 0, attempts: [] })]);
    const ident = '17|f1-research:replace-fence|0';
    assertLine(tick(ctx), 17); // tick 1: the onset
    ackUpTo(ctx, actEvents(ctx).at(-1).seq);
    assertLine(tick(ctx), 0); // tick 2: acknowledged, inside the interval
    let at = 1;
    for (const [i, gap] of [15, 30, 60, 60].entries()) {
      jumpTo(ctx, at + gap - 1);
      assertLine(tick(ctx), 0);
      assert.equal(actEvents(ctx).length, i + 1, `raise ${i + 1} not before ${gap} ticks`);
      const j = assertLine(tick(ctx), 17);
      at += gap;
      const ev = actEvents(ctx);
      assert.equal(ev.length, i + 2, `raise ${i + 1} at ${gap} ticks`);
      assert.equal(keyTick(ev.at(-1)), at, 'a new key at the tick of the raise');
      assert.equal(ev.at(-1).data.detail.reraise, i + 1);
      assert.equal(j.reasons[0].detail.reraise, i + 1);
      const wj = watcherJson(ctx);
      assert.equal(wj.reraise[ident], i + 1);
      assert.deepEqual(wj.stuck, i + 1 >= 4 ? [ident] : [], 'stuck_raises 1: the first raise after the cap (the 4th) counts');
      if (i < 3) ackUpTo(ctx, ev.at(-1).seq);
    }
    jumpTo(ctx, at + 60); // raise 4 left unacknowledged: due, so exit 17, but nothing is raised again
    assertLine(tick(ctx), 17);
    assert.equal(actEvents(ctx).length, 5);
  });
});

test('W5 stuck: an acknowledged hang is raised again at once; the 6th raise, 285 ticks after the onset, is stuck; a new call clears both', async () => {
  await withRoot({ thr: { model_ticks: 2, stuck_raises: 3 } }, async (ctx) => {
    const t = singleTask(ctx);
    setTasks(ctx, [t.row]);
    const ident = `21|${t.task}|1`;
    assertLine(tick(ctx), 0); // tick 1: the epoch's first tick counts nothing (FX-W6 step 1)
    assertLine(tick(ctx), 0);
    assertLine(tick(ctx), 21); // tick 3: the onset (a model-kind hang, model_ticks 2)
    let at = 3;
    for (const [i, gap] of [15, 30, 60, 60, 60, 60].entries()) {
      ackUpTo(ctx, eventsOf(ctx.root, 'hang', 21).at(-1).seq);
      jumpTo(ctx, at + gap - 1);
      assertLine(tick(ctx), 0);
      assertLine(tick(ctx), 21); // urgent: exits at the tick of the raise
      at += gap;
      const ev = eventsOf(ctx.root, 'hang', 21);
      assert.equal(ev.length, i + 2);
      assert.equal(ev.at(-1).data.urgent, true);
      assert.equal(ev.at(-1).data.detail.reraise, i + 1);
      assert.equal(keyTick(ev.at(-1)), at);
      assert.deepEqual(watcherJson(ctx).stuck, i + 1 >= 6 ? [ident] : [], `raise ${i + 1}`);
    }
    assert.equal(at - 3, 285, 'stuck 285 ticks after the onset (FIX-wake.md:54)');
    ackUpTo(ctx, eventsOf(ctx.root, 'hang', 21).at(-1).seq);
    appendCalls(t.file, { sessionId: t.session, cwd: t.cwd, calls: CALLS(1) });
    assertLine(tick(ctx), 0); // the hang clears: the ident leaves the active set
    const wj = watcherJson(ctx);
    assert.deepEqual(wj.stuck, []);
    assert.deepEqual(wj.reraise, {});
  });
});

// FX-W4's dead-man reads watcher.json.stuck at its own times (FIX-wake.md:284-288), so a stuck ident stays
// listed at every evaluation until it leaves the active set (FIX-wake.md:318), not only at a raise (refute/W5.md M18).
test('W5 stuck stays: at quiet ticks between raises a stuck act-due stays in watcher.json.stuck', async () => {
  await withRoot({ thr: { coalesce_ticks: 0, stuck_raises: 1 } }, async (ctx) => {
    setTasks(ctx, [row('f1-research', { state: 'planned', step: 'none', epoch: 0, attempts: [] })]);
    const ident = '17|f1-research:replace-fence|0';
    assertLine(tick(ctx), 17); // tick 1: the onset
    let at = 1;
    for (const gap of [15, 30, 60, 60]) {
      ackUpTo(ctx, actEvents(ctx).at(-1).seq);
      jumpTo(ctx, at + gap);
      assertLine(tick(ctx), 17);
      at += gap;
    }
    assert.deepEqual(watcherJson(ctx).stuck, [ident], 'stuck_raises 1: stuck at the 4th raise');
    ackUpTo(ctx, actEvents(ctx).at(-1).seq);
    for (const q of [1, 59]) { // acknowledged, inside the 60-tick interval: no raise
      jumpTo(ctx, at + q);
      assertLine(tick(ctx), 0);
      const wj = watcherJson(ctx);
      assert.deepEqual(wj.stuck, [ident], `still stuck ${q} ticks after the raise`);
      assert.equal(wj.reraise[ident], 4);
    }
    assert.equal(actEvents(ctx).length, 5, 'the quiet ticks raised nothing');
  });
});

test('M5 pause discount: a tick more than 2 delta after the last one does not count toward hang', async () => {
  await withRoot({ thr: { model_ticks: 2, delta_ms: 60000 } }, async (ctx) => {
    const t = singleTask(ctx);
    setTasks(ctx, [t.row]);
    const T0 = Date.parse(NOW);
    const at = (min) => new Date(T0 + min * 60000).toISOString();
    assertLine(tick(ctx, [], { now: at(-1) }), 0); // the first tick of the epoch counts nothing (FX-W6)
    assertLine(tick(ctx, [], { now: at(0) }), 0);
    assert.equal(watcherJson(ctx).tasks[t.task].hang_ticks, 1);
    const j = assertLine(tick(ctx, [], { now: at(10) }), 0); // the PC slept: without M5 this exits 21
    assert.equal(j.result.paused, true);
    assert.equal(watcherJson(ctx).tasks[t.task].hang_ticks, 1, 'a paused tick leaves the count');
    assert.equal(watcherJson(ctx).ticks_total, 3, 'it still is a tick');
    const j3 = assertLine(tick(ctx, [], { now: at(11) }), 21); // one delta later: counted
    assert.equal(j3.result.paused, false);
  });
});

test('M5 pause discount is one-sided: a clock that went back counts the tick', async () => {
  await withRoot({ thr: { model_ticks: 2, delta_ms: 60000 } }, async (ctx) => {
    const t = singleTask(ctx);
    setTasks(ctx, [t.row]);
    const T0 = Date.parse(NOW);
    assertLine(tick(ctx, [], { now: new Date(T0 - 60000).toISOString() }), 0); // the first tick of the epoch counts nothing (FX-W6)
    assertLine(tick(ctx, [], { now: new Date(T0).toISOString() }), 0);
    const j = assertLine(tick(ctx, [], { now: new Date(T0 - 3600000).toISOString() }), 21);
    assert.equal(j.result.paused, false);
  });
});

// ---------------------------------------------------------------- FX-W6: hang by per-kind deadlines in ticks
// Records shaped as the harness writes them (build/facts/WH5-Wturn.md; stop_reason, toolUseResult and the
// task notification as measured over the local transcripts, departures/W6.md).
const rec6 = (t, type, extra) => ({ type, uuid: crypto.randomUUID(), parentUuid: null, isSidechain: false, sessionId: t.session, cwd: t.cwd, timestamp: isoTs(), ...extra });
const asst6 = (t, id, blocks, stop) => rec6(t, 'assistant', { message: { id, type: 'message', role: 'assistant', model: 'claude-test-1', content: blocks, stop_reason: stop, usage: usage({ input: 10 }) } });
const user6 = (t, content, extra = {}) => rec6(t, 'user', { message: { role: 'user', content }, ...extra });
const put6 = (file, recs) => fs.appendFileSync(file, recs.map((r) => JSON.stringify(r)).join('\n') + '\n');

test('FX-W6 per-kind deadline: a pending tool call waits its declared timeout + slack; the tail kinds as parsed', async () => {
  await withRoot({ thr: { model_ticks: 2, tool_slack_ticks: 1, delta_ms: 60000 } }, async (ctx) => {
    const t = singleTask(ctx);
    setTasks(ctx, [t.row]);
    put6(t.file, [asst6(t, 'msg_tool', [{ type: 'tool_use', id: 'toolu_slow', name: 'Bash', input: { command: 'x', timeout: 120000 } }], 'tool_use')]);
    assertLine(tick(ctx), 0);
    const ts0 = watcherJson(ctx).tasks[t.task];
    assert.deepEqual([ts0.kind, ts0.deadline, ts0.hang_ticks], ['tool', 3, 0], 'tool: 2 ticks of timeout + 1; the first tick counts nothing');
    assertLine(tick(ctx), 0);
    assertLine(tick(ctx), 0); // 2 ticks: a model call (model_ticks 2) would be a hang here
    const j = assertLine(tick(ctx), 21);
    const r = j.reasons.find((x) => x.code === 'hang');
    assert.deepEqual([r.detail.kind, r.detail.deadline, r.detail.hang_ticks], ['tool', 3, 3]);
    put6(t.file, [user6(t, [{ type: 'tool_result', tool_use_id: 'toolu_slow', content: 'ok' }])]);
    tick(ctx); // the result is a new record: the count restarts, the model is now called
    const ts1 = watcherJson(ctx).tasks[t.task];
    assert.deepEqual([ts1.kind, ts1.deadline, ts1.hang_ticks], ['model', 2, 0]);

    // The kinds of lib.parseTranscript, in process; neutral record types change nothing.
    const f = path.join(ctx.root, 'kinds.jsonl');
    const kind = () => LIB.parseTranscript(f).kind;
    put6(f, [user6(t, 'go')]);
    assert.equal(kind(), 'model');
    put6(f, [asst6(t, 'm1', [{ type: 'text', text: 'streaming' }], null)]);
    assert.equal(kind(), 'model', 'a call whose stop_reason is still null');
    put6(f, [asst6(t, 'm1', [{ type: 'tool_use', id: 'toolu_bg', name: 'Bash', input: { command: 's', run_in_background: true } }], 'tool_use')]);
    assert.equal(kind(), 'tool');
    put6(f, [user6(t, [{ type: 'tool_result', tool_use_id: 'toolu_bg', content: 'started' }], { toolUseResult: { backgroundTaskId: 'b1' } })]);
    put6(f, [asst6(t, 'm2', [{ type: 'text', text: 'waiting' }], 'end_turn'), { type: 'system', subtype: 'stop_hook_summary' }, { type: 'api-request' }]);
    assert.equal(kind(), 'bg-wait');
    const mid = LIB.parseTranscript(f);
    put6(f, [user6(t, '<task-notification>\n<task-id>b1</task-id>\n<tool-use-id>toolu_bg</tool-use-id>\n<status>completed</status>\n</task-notification>')]);
    assert.equal(kind(), 'model');
    put6(f, [asst6(t, 'm3', [{ type: 'text', text: 'done' }], 'end_turn')]);
    assert.equal(kind(), 'idle');
    const inc = LIB.parseTranscript(f, { fromByte: mid.endByte, tail: mid.tail });
    assert.equal(inc.kind, 'idle', 'an incremental parse carries the tail');
    assert.deepEqual(inc.tail, LIB.parseTranscript(f).tail);
    assert.ok(!('tail' in JSON.parse(JSON.stringify(inc))), 'tail is non-enumerable');
    put6(f, [asst6(t, 'm4', [{ type: 'tool_use', id: 'toolu_mon', name: 'Monitor', input: { command: 'w', timeout_ms: 600000 } }], 'tool_use'),
      user6(t, [{ type: 'tool_result', tool_use_id: 'toolu_mon', content: 'started' }], { toolUseResult: { taskId: 'mon1', timeoutMs: 600000 } }),
      asst6(t, 'm5', [{ type: 'tool_use', id: 'toolu_stop', name: 'TaskStop', input: { task_id: 'mon1' } }], 'tool_use'),
      user6(t, [{ type: 'tool_result', tool_use_id: 'toolu_stop', content: 'stopped' }]),
      asst6(t, 'm6', [{ type: 'text', text: 'ok' }], 'end_turn')]);
    assert.equal(kind(), 'idle', 'a TaskStop naming the task id ends it');
    put6(f, [user6(t, 'next'), user6(t, [{ type: 'text', text: '[Request interrupted by user]' }])]);
    assert.equal(kind(), 'idle', 'an interrupt ends the turn');
  });
});

test('FX-W6 idle child: act-due idle-child at idle_ticks, never a charged hang; an answer clears it', async () => {
  await withRoot({ thr: { model_ticks: 1, idle_ticks: 2, coalesce_ticks: 0 } }, async (ctx) => {
    const t = singleTask(ctx);
    setTasks(ctx, [t.row]);
    put6(t.file, [asst6(t, 'msg_q', [{ type: 'text', text: 'A question for the coordinator.' }], 'end_turn')]);
    assertLine(tick(ctx), 0);
    assertLine(tick(ctx), 0); // idle 1: a model call (model_ticks 1) would be a hang here
    const j = assertLine(tick(ctx), 17);
    assert.ok(j.reasons.some((x) => x.code === 'act-due' && x.detail.act === 'idle-child' && x.detail.task === t.task && x.detail.idle_ticks === 2));
    assert.equal(eventsOf(ctx.root, 'hang', 21).length, 0);
    put6(t.file, [user6(t, 'The answer.')]);
    tick(ctx);
    const ts = watcherJson(ctx).tasks[t.task];
    assert.deepEqual([ts.kind, ts.hang_ticks], ['model', 0]);
    assert.ok(!Object.keys(watcherJson(ctx).active).some((k) => k.includes(':idle-child|')));
    assert.equal(eventsOf(ctx.root, 'hang', 21).length, 0);
  });
});

test('FX-W6 age cap: act-due age-cap at attempt_max_ticks, uncharged; acknowledged, it re-arms for another cap', async () => {
  await withRoot({ thr: { attempt_max_ticks: 2, coalesce_ticks: 0 } }, async (ctx) => {
    const t = singleTask(ctx);
    setTasks(ctx, [t.row]);
    assertLine(tick(ctx), 0);
    assertLine(tick(ctx), 0);
    const j = assertLine(tick(ctx), 17);
    assert.ok(j.reasons.some((x) => x.detail.act === 'age-cap' && x.detail.age_ticks === 2));
    const caps = () => ledgerLines(ctx.root, 'event').filter((l) => l.data.detail && l.data.detail.act === 'age-cap');
    assert.equal(caps().length, 1);
    w(path.join(ctx.root, 'run', 'acked.json'), { schema_version: 1, ce: 1, acked_seq: caps()[0].seq, at: NOW });
    assertLine(tick(ctx), 0); // the acknowledgement lets the attempt continue: re-armed
    assert.equal(watcherJson(ctx).tasks[t.task].age_base, 3);
    assertLine(tick(ctx), 0);
    assertLine(tick(ctx), 17); // another attempt_max_ticks: asked again with a new event line
    assert.equal(caps().length, 2);
    assert.equal(eventsOf(ctx.root, 'hang', 21).length, 0, 'never a charged hang');
  });
});

test('NA1 a background command exit reaches the coordinator turn, also during sleep or after a ce change', { skip: `${NEEDS_APP}: item 5, the harness delivers a background command's exit` }, () => {});
test('NA2 Node timers and the PC across suspend: one sleep of Delta is one tick', { skip: `${NEEDS_APP}: item 6, needs a real suspend of the PC` }, () => {});
test('NA3 real transcripts match the parser', { skip: `${NEEDS_APP}: item 7, needs real session transcripts` }, () => {});
test('NA4 a real session window appears in its transcript', { skip: `${NEEDS_APP}: item 7, the last_context of a real session` }, () => {});
