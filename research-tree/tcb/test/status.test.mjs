// Tests of tcb/scripts/status.mjs, written from spec/status.mjs.md and CONTRACT.md only.
// Each test builds its own run root under tcb-build/tmp, runs the script as a child process
// (process.execPath + the root's own copy of the script) and checks the exit code, the stdout
// line (CONTRACT 1.3) and the files. The synthetic data lives in tcb/fixtures/status/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import cp from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUILD = path.resolve(HERE, '..', '..');
const TCB_SRC = path.join(BUILD, 'tcb');
const TMP = path.join(BUILD, 'tmp');
const FIXDIR = path.join(HERE, '..', 'fixtures', 'status');
const PS_EXE = 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
const DATA = JSON.parse(fs.readFileSync(path.join(FIXDIR, '_testdata.json'), 'utf8'));

const NOW = '2026-11-17T09:30:00.000Z';
const COMMIT = 'ab12'.repeat(10);
const HEX64 = 'c'.repeat(64);
const SLUG = {
  0: 'ok', 1: 'fail', 2: 'not-run', 3: 'tamper', 5: 'ready-wins', 6: 'deferred', 10: 'reopened', 11: 'ready',
  12: 'repair', 13: 'soft-limit', 14: 'checker-batch', 15: 'window-limit', 16: 'drain', 20: 'stall', 21: 'hang',
  22: 'loop', 23: 'hard-limit', 24: 'memory', 25: 'stop-unconfirmed', 26: 'common-cause', 27: 'tamper-seen',
  30: 'alarm', 64: 'stale-ce', 65: 'stale-epoch', 66: 'usage', 67: 'table-corrupt', 70: 'internal', 75: 'lock-busy',
};

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
let _lib;
const getLib = async () => (_lib ??= await import(pathToFileURL(path.join(TCB_SRC, 'lib.mjs')).href));

// ---------------------------------------------------------------- process helpers
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
function makeRoot({ thr = {}, ce = 1, rows = [], coord = {} } = {}) {
  fs.mkdirSync(TMP, { recursive: true });
  const root = fs.mkdtempSync(path.join(TMP, 'st-'));
  for (const d of DIRS) fs.mkdirSync(path.join(root, d), { recursive: true });
  for (const d of ['schemas', 'profiles', 'settings', 'agents', 'briefs']) { // flat layout: no scripts copy
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
  w(path.join(root, 'run', 'tasks.json'), { schema_version: 1, rev: 1, tasks: rows });
  const ctx = { root, sleepers: [], skipLedger: false };
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
    for (let i = 0; i < 20; i++) {
      try { fs.rmSync(ctx.root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); break; } catch { await sleep(300); }
    }
  }
}
function snapshotTree(root) {
  const out = {};
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else out[path.relative(root, p)] = sha(fs.readFileSync(p));
    }
  };
  walk(root);
  return out;
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
const eventLine = (root, key) => addLine(root, { kind: 'event', data: { class: 'stall', code: 20, urgent: true, detail: {}, key } });
const meterLine = (root, pct = 10) => addLine(root, { kind: 'meter', data: { pct, self_reported: true } });

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
const readTasks = (ctx) => J(path.join(ctx.root, 'run', 'tasks.json'));
const projectDirName = (abs) => abs.replace(/[:\\/._ ]/g, '-');
const folderAbs = (ctx, task, e = 1) => path.join(ctx.root, 'wt', `${task}-e${e}`);
let tsN = 0;
const isoTs = () => new Date(Date.UTC(2026, 0, 1) + (++tsN) * 1000).toISOString();
function writeTranscript(file, { sessionId, cwd, calls = 0 }) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const base = { parentUuid: null, isSidechain: false, sessionId, cwd };
  const recs = [{ type: 'user', uuid: crypto.randomUUID(), ...base, timestamp: isoTs(), message: { role: 'user', content: 'synthetic start' } }];
  for (let i = 0; i < calls; i++) {
    recs.push({ type: 'assistant', uuid: crypto.randomUUID(), ...base, timestamp: isoTs(), message: {
      id: 'msg_' + crypto.randomBytes(8).toString('hex'), type: 'message', role: 'assistant', model: 'claude-test-1',
      content: [{ type: 'text', text: 'x' }], stop_reason: null,
      usage: { input_tokens: 10, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 0 } } });
  }
  fs.writeFileSync(file, recs.map((r) => JSON.stringify(r)).join('\n') + '\n');
}
const tpath = (root, sid, proj = 'proj-test') => path.join(root, 'transcripts', proj, sid + '.jsonl');
function fixtureText(name, sid, cwd) {
  return fs.readFileSync(path.join(FIXDIR, name), 'utf8').replaceAll('{{sid}}', sid).replaceAll('{{cwd}}', JSON.stringify(cwd).slice(1, -1));
}
function readyFile(ctx, task, epoch, body) {
  w(path.join(ctx.root, 'wt', `${task}-e${epoch}`, 'staging', 'READY.json'), body ?? { kind: 'ready', task, epoch, step: 'pack' });
}

// ---------------------------------------------------------------- running the script
function parseOut(r) {
  const out = r.stdout ?? '';
  const lines = out.split('\n').filter((s) => s.trim() !== '');
  let json = null;
  if (lines.length === 1) { try { json = JSON.parse(lines[0]); } catch { /* not json */ } }
  return { exit: r.status, signal: r.signal ?? null, stdout: out, stderr: r.stderr ?? '', lines, json };
}
// Flat build layout: the script is tcb-build/tcb/<name>.mjs, found relative to this test file.
const scriptPath = (_root, name) => path.join(TCB_SRC, name + '.mjs');
function run(root, args, { timeout = 120000 } = {}) {
  return parseOut(cp.spawnSync(process.execPath, [scriptPath(root, 'status'), ...args],
    { cwd: root, encoding: 'utf8', windowsHide: true, timeout, maxBuffer: 64 * 1024 * 1024 }));
}
function startScript(root, args) {
  const child = cp.spawn(process.execPath, [scriptPath(root, 'status'), ...args], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
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
  assert.match(String(j.script), /^status(\.mjs)?$/);
  assert.equal(j.exit, exit);
  assert.equal(j.code, SLUG[exit]);
  if (exit === 0) assert.equal(j.ok, true);
  assert.ok(Array.isArray(j.reasons));
  assert.ok(Array.isArray(j.ledger_seq));
  return j;
}
const hasReason = (j, code) => (j.reasons ?? []).some((r) => r.code === code);
const common = (ctx, { ce = 1 } = {}) => ['--root', ctx.root, '--ce', String(ce)];
const build = (ctx, extra = [], o = {}) => run(ctx.root, [...common(ctx, o), '--now', NOW, '--free-mb', '100000', ...extra]);
const reconcile = (ctx, extra = [], o = {}) => run(ctx.root, ['--reconcile', ...common(ctx, o), '--now', NOW, '--free-mb', '100000', ...extra]);
const endturn = (ctx, k, extra = [], o = {}) => run(ctx.root, ['--endturn', '--acked-seq', String(k), ...common(ctx, o), '--now', NOW, ...extra]);
const statusJson = (ctx) => J(path.join(ctx.root, 'run', 'status.json'));
const statusPath = (ctx) => path.join(ctx.root, 'run', 'status.json');
const ackedPath = (ctx) => path.join(ctx.root, 'run', 'acked.json');
const byTask = (st, task) => st.tasks.find((t) => t.task === task);
const notes = (ctx, name, text) => { const p = path.join(ctx.root, 'plan', 'notes', name); w(p, text); return p; };
function liveWatcher(ctx, { ce = 1, recCe = ce } = {}) {
  const s = ctx.sleeper();
  w(path.join(ctx.root, 'run', 'watcher.lock'), JSON.stringify(lockRec(s, { script: 'watch', ce: recCe })));
  w(path.join(ctx.root, 'run', 'watcher.json'), {
    schema_version: 1, ce: recCe, pid: s.pid, start_time: s.start_time, ticks_total: 7, last_tick_at: NOW, active: {}, pending: [], tasks: {},
  });
  return s;
}
function liveAlarm(ctx, { ce = 1 } = {}) {
  const s = ctx.sleeper();
  w(path.join(ctx.root, 'run', 'alarm.json'), { schema_version: 1, pid: s.pid, start_time: s.start_time, ce, armed_at: NOW, sleep_ms: 1000 });
  return s;
}
// M2 (CONTRACT decision 40): a reconcile on a root with no live alarm of this ce asks for one: exit 1
// alarm-missing, result.arm "alarm"; the rows are reconciled and the status is built all the same.
function recNoAlarm(res) {
  const j = assertLine(res, 1);
  assert.ok(hasReason(j, 'alarm-missing'), 'reason alarm-missing');
  assert.equal(j.result.arm, 'alarm');
  return j;
}

// =============================================================== the tests
test('T1 build: status.json validates, spent and next per row, deterministic for one --now', async () => {
  await withRoot({}, async (ctx) => {
    const sid = newSid();
    const task = 'f1-research';
    fs.mkdirSync(path.dirname(tpath(ctx.root, sid)), { recursive: true });
    fs.writeFileSync(tpath(ctx.root, sid), fixtureText('_three-calls.jsonl', sid, folderAbs(ctx, task)));
    setTasks(ctx, [
      row('f1-plan', { state: 'planned', step: 'none', epoch: 0, question_ids: ['f1-a-01'] }),
      row(task, { session: sid, e_task: 5000, question_ids: ['f1-a-01', 'f1-a-02', 'f1-a-03'] }),
    ], 4);
    const j = assertLine(build(ctx), 0);
    assert.equal(j.mode, null);
    const st = statusJson(ctx);
    await (await getLib()).checkFormat(ctx.root, 'status', st);
    assert.equal(st.ce, 1);
    assert.equal(st.rev, 4);
    assert.equal(st.tasks.length, 2);
    assert.equal(st.tasks[0].task, 'f1-plan');
    assert.equal(st.tasks[0].next, 'replace-fence');
    assert.equal(st.tasks[1].spent, 1200);
    assert.equal(st.tasks[1].next, 'none');
    assert.equal(st.tasks[1].e_task, 5000);
    assert.equal(st.tasks[1].soft, 4000);
    assert.equal(st.tasks[1].hard, 4500);
    assert.equal(st.tasks[1].window, 400);
    assert.equal(st.tasks[1].V, 3);
    assert.equal(st.tasks[1].epoch, 1);
    assert.equal(st.tasks[1].step, 'bound');
    assert.equal(st.budget.spent_total, 1200);
    assert.equal(st.memory.free_mb, 100000);
    assert.equal(st.memory.reserve_mb, 1024);
    assert.equal(st.memory.peak_mb, 1200);
    assert.equal(st.slots.max, 2);
    assert.equal(st.tcb_commit, COMMIT);
    assert.equal(st.acked_seq, 0);
    assert.deepEqual(st.events_pending, []);
    const first = fs.readFileSync(statusPath(ctx));
    assertLine(build(ctx), 0);
    assert.ok(first.equals(fs.readFileSync(statusPath(ctx))), 'the same inputs and --now give a byte-identical status.json');
  });
});

test('T2 events_pending lists exactly the event seqs above acked_seq', async () => {
  await withRoot({}, async (ctx) => {
    eventLine(ctx.root, 'stall|f1-research|1|1'); // 1
    meterLine(ctx.root); // 2
    eventLine(ctx.root, 'hang|f1-research|1|2'); // 3
    const last = eventLine(ctx.root, 'loop|f1-research|1|3'); // 4
    assertLine(build(ctx), 0);
    let st = statusJson(ctx);
    assert.equal(st.acked_seq, 0, 'no acked.json: acked_seq is 0');
    assert.deepEqual(st.events_pending, [1, 3, 4]);
    assert.equal(st.ledger.seq, 4);
    assert.equal(st.ledger.head, last.hash);
    w(ackedPath(ctx), { schema_version: 1, ce: 1, acked_seq: 1, at: NOW });
    assertLine(build(ctx), 0);
    st = statusJson(ctx);
    assert.equal(st.acked_seq, 1);
    assert.deepEqual(st.events_pending, [3, 4]);
  });
});

test('T3 next for each step of the machine', async () => {
  await withRoot({}, async (ctx) => {
    const sidA = newSid();
    const q = ['f1-a-01'];
    const stuck = (task, stop, extra = {}) => row(task, {
      epoch: 2, step: 'stop-requested', question_ids: q,
      attempts: [att(task, 1, { session: sidA, stop }), att(task, 2)], ...extra,
    });
    const rows = [
      [row('f1-plan', { state: 'planned', step: 'none', epoch: 0, question_ids: q }), 'replace-fence'],
      [row('f1-stopped', { step: 'stopped', question_ids: q, attempts: [att('f1-stopped', 1, { stop: 'confirmed' })] }), 'replace-start'],
      [row('f1-parked', { state: 'parked', step: 'stopped', question_ids: q, attempts: [att('f1-parked', 1, { stop: 'confirmed' })] }), 'replace-start'],
      [row('f1-fenced', { epoch: 2, step: 'fenced', reason: 'stall', question_ids: q, attempts: [att('f1-fenced', 1, { session: sidA }), att('f1-fenced', 2)] }), 'stop-request'],
      [stuck('f1-stopreq', 'requested'), 'stop-session'],
      [stuck('f1-stopnone', 'none'), 'stop-session'],
      [stuck('f1-stopunc', 'unconfirmed'), 'stop-verify'],
      [stuck('f1-stopsample', 'requested'), 'stop-verify'],
      [row('f1-admitted', { step: 'admitted', question_ids: q }), 'start-session'],
      [row('f1-started', { step: 'started', session: newSid(), question_ids: q }), 'bind'],
      [row('f1-plain', { step: 'bound', session: newSid(), question_ids: q }), 'none'],
      [row('f1-audit', { step: 'bound', session: newSid(), question_ids: q }), 'audit'],
      [row('f1-commit', { step: 'bound', session: newSid(), question_ids: q }), 'commit'],
      [row('f1-committed', { state: 'committed', step: 'bound', session: newSid(), question_ids: q, commits: { pack: HEX64 } }), 'stop-request'],
      [row('f1-limit', { epoch: 2, step: 'fenced', limit: true, question_ids: q, attempts: [att('f1-limit', 1, { session: sidA }), att('f1-limit', 2)] }), 'owner'],
      [row('f1-failed', { state: 'failed', epoch: 2, step: 'stopped', question_ids: q, attempts: [att('f1-failed', 1, { stop: 'confirmed' }), att('f1-failed', 2)] }), 'owner'],
    ];
    setTasks(ctx, rows.map((r) => r[0]));
    // stop.mjs names the sample by the target attempt k (here e - 1 = 1), CONTRACT 3.22 / spec/stop.mjs.md.
    w(path.join(ctx.root, 'run', 'stop-sample', 'f1-stopsample-e1.json'), { schema_version: 1, task: 'f1-stopsample', epoch: 1, target: 1, tick: 0, sizes: {} });
    readyFile(ctx, 'f1-audit', 1);
    readyFile(ctx, 'f1-commit', 1);
    addLine(ctx.root, { kind: 'intake', task: 'f1-commit', epoch: 1, data: { objects: [], rejected: [], flagged: [] } });
    addLine(ctx.root, { kind: 'audit', task: 'f1-commit', epoch: 1, data: { label: 'clean', undeclared: [], protected_writes: [], first_context: 0, notes_bad: false } });
    assertLine(build(ctx), 0);
    const st = statusJson(ctx);
    for (const [r, next] of rows) assert.equal(byTask(st, r.task).next, next, `next of ${r.task}`);
    assert.equal(st.halted, false);
    assert.equal(st.draining, false);
  });
});

test('T3 next: a halt line makes planned and stopped rows none and halted true; owner resume reverses it', async () => {
  await withRoot({}, async (ctx) => {
    const q = ['f1-a-01'];
    setTasks(ctx, [
      row('f1-plan', { state: 'planned', step: 'none', epoch: 0, question_ids: q }),
      row('f1-stopped', { step: 'stopped', question_ids: q, attempts: [att('f1-stopped', 1, { stop: 'confirmed' })] }),
    ]);
    addLine(ctx.root, { kind: 'halt', data: { reason: 'common-cause', fails: [] } });
    assertLine(build(ctx), 0);
    let st = statusJson(ctx);
    assert.equal(st.halted, true);
    assert.equal(byTask(st, 'f1-plan').next, 'none');
    assert.equal(byTask(st, 'f1-stopped').next, 'none');
    addLine(ctx.root, { kind: 'owner', data: { act: 'resume', subject: 'run', quote: 'carry on' } });
    assertLine(build(ctx), 0);
    st = statusJson(ctx);
    assert.equal(st.halted, false);
    assert.equal(byTask(st, 'f1-plan').next, 'replace-fence');
    assert.equal(byTask(st, 'f1-stopped').next, 'replace-start');
  });
});

test('T3 next: a drain line of this ce makes draining true and planned rows none', async () => {
  await withRoot({}, async (ctx) => {
    setTasks(ctx, [row('f1-plan', { state: 'planned', step: 'none', epoch: 0, question_ids: ['f1-a-01'] })]);
    addLine(ctx.root, { kind: 'drain', data: { window: 140000, w_star: 133200 } });
    assertLine(build(ctx), 0);
    const st = statusJson(ctx);
    assert.equal(st.draining, true);
    assert.equal(byTask(st, 'f1-plan').next, 'none');
  });
});

test('T4 watcher.alive is false for a finished child (anomaly watcher-dead) and true for a live sleeper', async () => {
  await withRoot({}, async (ctx) => {
    const dead = deadRecord();
    w(path.join(ctx.root, 'run', 'watcher.json'), {
      schema_version: 1, ce: 1, pid: dead.pid, start_time: dead.start_time, ticks_total: 5, last_tick_at: '2026-11-17T09:00:00.000Z', active: {}, pending: [], tasks: {},
    });
    assertLine(build(ctx), 0);
    let st = statusJson(ctx);
    assert.equal(st.watcher.alive, false);
    assert.equal(st.watcher.ce, 1);
    assert.equal(st.watcher.ticks_total, 5);
    assert.equal(st.watcher.last_tick_at, '2026-11-17T09:00:00.000Z');
    assert.ok(st.anomalies.some((a) => a.code === 'watcher-dead'));
    liveWatcher(ctx);
    assertLine(build(ctx), 0);
    st = statusJson(ctx);
    assert.equal(st.watcher.alive, true);
    assert.ok(!st.anomalies.some((a) => a.code === 'watcher-dead'));
  });
});

test('T5 not_run lists a (check, subject) whose last check line is not_run, not one later passed', async () => {
  await withRoot({}, async (ctx) => {
    const check = (c, s, result) => addLine(ctx.root, { kind: 'check', data: { check: c, subject: s, result, reasons: [] } });
    check('witness', 'witness', 'not_run');
    check('tms', 'labels', 'not_run');
    check('tms', 'labels', 'pass');
    addLine(ctx.root, { kind: 'fsck', data: { result: 'not_run', failing: [] } });
    assertLine(build(ctx), 0);
    const got = statusJson(ctx).not_run.map((x) => `${x.check}|${x.subject}`).sort();
    assert.deepEqual(got, ['fsck|store', 'witness|witness']);
  });
});

test('T6 tasks.json corrupt exits 67 and leaves status.json; no coord.json exits 2; stale --ce exits 64', async () => {
  await withRoot({}, async (ctx) => {
    assertLine(build(ctx), 0);
    const before = fs.readFileSync(statusPath(ctx));
    w(path.join(ctx.root, 'run', 'tasks.json'), '{ not json');
    assertLine(build(ctx), 67);
    assert.ok(before.equals(fs.readFileSync(statusPath(ctx))), 'status.json unchanged');
  });
  await withRoot({}, async (ctx) => {
    fs.rmSync(path.join(ctx.root, 'run', 'coord.json'));
    const j = assertLine(build(ctx), 2);
    assert.ok(hasReason(j, 'no-coordinator'));
    assert.equal(fs.existsSync(statusPath(ctx)), false);
  });
  await withRoot({}, async (ctx) => {
    assertLine(build(ctx, [], { ce: 9 }), 64);
    assert.equal(fs.existsSync(statusPath(ctx)), false, 'nothing written');
    assert.equal(fs.existsSync(ledgerFile(ctx.root)), false);
  });
});

function admittedRow(task, q = ['f1-a-01']) {
  return row(task, { step: 'admitted', question_ids: q });
}
test('T7 reconcile: an admitted row with one folder transcript becomes started, once', async () => {
  await withRoot({}, async (ctx) => {
    const task = 'f1-research';
    const sid = newSid();
    setTasks(ctx, [admittedRow(task)]);
    writeTranscript(tpath(ctx.root, sid, projectDirName(folderAbs(ctx, task))), { sessionId: sid, cwd: folderAbs(ctx, task), calls: 1 });
    recNoAlarm(reconcile(ctx));
    const r = readTasks(ctx).tasks[0];
    assert.equal(r.step, 'started');
    assert.equal(r.attempts.find((a) => a.epoch === 1).session, sid);
    const started = ledgerLines(ctx.root, 'started');
    assert.equal(started.length, 1);
    assert.equal(started[0].data.session, sid);
    assert.equal(started[0].task, task);
    assert.equal(started[0].epoch, 1);
    assert.ok(fs.existsSync(statusPath(ctx)), 'reconcile ends with a build');
    recNoAlarm(reconcile(ctx));
    assert.equal(ledgerLines(ctx.root, 'started').length, 1, 'a repeat adds no line');
  });
});

test('T8 reconcile: transcripts of two sessions for one folder change nothing and raise several-sessions', async () => {
  await withRoot({}, async (ctx) => {
    const task = 'f1-research';
    setTasks(ctx, [admittedRow(task)]);
    for (const sid of [newSid(), newSid()]) {
      writeTranscript(tpath(ctx.root, sid, projectDirName(folderAbs(ctx, task))), { sessionId: sid, cwd: folderAbs(ctx, task), calls: 1 });
    }
    const j = reconcile(ctx);
    assert.ok([0, 1].includes(j.exit), `unexpected exit ${j.exit}\n${j.stderr}`);
    assert.equal(readTasks(ctx).tasks[0].step, 'admitted');
    assert.equal(ledgerLines(ctx.root, 'started').length, 0);
    assert.ok(statusJson(ctx).anomalies.some((a) => a.code === 'several-sessions'));
  });
});

test('T8 reconcile: a transcript whose cwd is another folder is ignored', async () => {
  await withRoot({}, async (ctx) => {
    const task = 'f1-research';
    const mine = newSid(); const other = newSid();
    setTasks(ctx, [admittedRow(task)]);
    const proj = projectDirName(folderAbs(ctx, task));
    writeTranscript(tpath(ctx.root, mine, proj), { sessionId: mine, cwd: folderAbs(ctx, task), calls: 1 });
    writeTranscript(tpath(ctx.root, other, proj), { sessionId: other, cwd: folderAbs(ctx, 'f2-other'), calls: 1 });
    recNoAlarm(reconcile(ctx));
    const r = readTasks(ctx).tasks[0];
    assert.equal(r.step, 'started');
    assert.equal(r.attempts.find((a) => a.epoch === 1).session, mine);
    assert.ok(!statusJson(ctx).anomalies.some((a) => a.code === 'several-sessions'));
  });
});

test('T9 reconcile: a row fenced meanwhile (epoch moved) is skipped, others are reconciled, exit 0', async () => {
  await withRoot({}, async (ctx) => {
    const [a, b] = ['f1-a', 'f1-b'];
    setTasks(ctx, [admittedRow(a), admittedRow(b)]);
    const sids = {};
    for (const t of [a, b]) {
      sids[t] = newSid();
      writeTranscript(tpath(ctx.root, sids[t], projectDirName(folderAbs(ctx, t))), { sessionId: sids[t], cwd: folderAbs(ctx, t), calls: 1 });
    }
    // Hold run.lock as a live holder so the reconcile reads the table, then waits for the lock.
    const me = { pid: process.pid, start_time: psStart(process.pid) };
    const lockFile = path.join(ctx.root, 'run', 'run.lock');
    w(lockFile, JSON.stringify(lockRec(me)));
    const s = startScript(ctx.root, ['--reconcile', ...common(ctx), '--now', NOW, '--free-mb', '100000']);
    try {
      await sleep(4000); // best effort: the script has read the table and waits for the lock
      const fenced = row(a, { epoch: 2, step: 'fenced', reason: 'stall', question_ids: ['f1-a-01'], attempts: [att(a, 1), att(a, 2)] });
      setTasks(ctx, [fenced, admittedRow(b)], 2);
    } finally {
      fs.rmSync(lockFile, { force: true });
    }
    recNoAlarm(await s.done);
    const rows = readTasks(ctx).tasks;
    const ra = rows.find((r) => r.task === a); const rb = rows.find((r) => r.task === b);
    assert.equal(ra.epoch, 2);
    assert.equal(ra.step, 'fenced', 'the fenced row was skipped');
    assert.equal(rb.step, 'started', 'the other row was reconciled');
    const started = ledgerLines(ctx.root, 'started');
    assert.equal(started.length, 1);
    assert.equal(started[0].task, b);
  });
});

test('T10 endturn: K equal to the ledger head with a live watcher and a live alarm writes acked.json, exit 0', async () => {
  await withRoot({}, async (ctx) => {
    meterLine(ctx.root, 10); meterLine(ctx.root, 20); meterLine(ctx.root, 30);
    liveWatcher(ctx);
    liveAlarm(ctx);
    assertLine(endturn(ctx, 3), 0);
    const a = J(ackedPath(ctx));
    assert.equal(a.acked_seq, 3);
    assert.equal(a.ce, 1);
    assert.equal(Date.parse(a.at), Date.parse(NOW));
  });
});

test('T11 endturn without an alarm exits 1 alarm-missing and still writes acked.json', async () => {
  await withRoot({}, async (ctx) => {
    meterLine(ctx.root); meterLine(ctx.root);
    liveWatcher(ctx);
    const j = assertLine(endturn(ctx, 2), 1);
    assert.ok(hasReason(j, 'alarm-missing'));
    assert.ok(!hasReason(j, 'watcher-missing'));
    assert.equal(J(ackedPath(ctx)).acked_seq, 2);
  });
});

test('T11 endturn with a watcher record of an older ce exits 1 watcher-missing', async () => {
  await withRoot({ ce: 2 }, async (ctx) => {
    addLine(ctx.root, { kind: 'meter', ce: 2, data: { pct: 10, self_reported: true } });
    liveWatcher(ctx, { ce: 2, recCe: 1 });
    liveAlarm(ctx, { ce: 2 });
    const j = assertLine(endturn(ctx, 1, [], { ce: 2 }), 1);
    assert.ok(hasReason(j, 'watcher-missing'));
    assert.ok(!hasReason(j, 'alarm-missing'));
    assert.equal(J(ackedPath(ctx)).acked_seq, 1);
  });
});

// Review U1-F9: watcher.json alone is not a running watcher; watcher.lock must hold the pid and
// start time that watcher.json records.
test('T11 endturn with a live watcher.json but watcher.lock absent, or naming another process, exits 1 watcher-missing', async () => {
  await withRoot({}, async (ctx) => {
    meterLine(ctx.root);
    liveWatcher(ctx);
    const alarm = liveAlarm(ctx);
    const lockFile = path.join(ctx.root, 'run', 'watcher.lock');
    fs.rmSync(lockFile, { force: true });
    const j1 = assertLine(endturn(ctx, 1), 1);
    assert.ok(hasReason(j1, 'watcher-missing'), JSON.stringify(j1.reasons));
    assert.ok(!hasReason(j1, 'alarm-missing'));
    w(lockFile, JSON.stringify(lockRec(alarm, { script: 'watch', ce: 1 }))); // a live process, not the watcher.json one
    const j2 = assertLine(endturn(ctx, 1), 1);
    assert.ok(hasReason(j2, 'watcher-missing'), JSON.stringify(j2.reasons));
    assert.ok(!hasReason(j2, 'alarm-missing'));
  });
});

test('T12 endturn: K above the head exits 1 acked-ahead; K below the stored value exits 1 acked-backwards; file unchanged', async () => {
  await withRoot({}, async (ctx) => {
    meterLine(ctx.root); meterLine(ctx.root); meterLine(ctx.root);
    w(ackedPath(ctx), { schema_version: 1, ce: 1, acked_seq: 2, at: NOW });
    const before = fs.readFileSync(ackedPath(ctx));
    const ahead = assertLine(endturn(ctx, 5), 1);
    assert.ok(hasReason(ahead, 'acked-ahead'));
    assert.ok(before.equals(fs.readFileSync(ackedPath(ctx))));
    const back = assertLine(endturn(ctx, 1), 1);
    assert.ok(hasReason(back, 'acked-backwards'));
    assert.ok(before.equals(fs.readFileSync(ackedPath(ctx))));
  });
});

const intentFile = (ctx, key, ext = 'json') => path.join(ctx.root, 'run', 'intents', `${key}.${ext}`);
const intent = (ctx, sub, args) => run(ctx.root, ['intent', sub, ...args, ...common(ctx)]);
test('T13 intent open twice with one subject is exit 0 and one line; another subject is exit 1 intent-differs', async () => {
  await withRoot({}, async (ctx) => {
    assertLine(intent(ctx, 'open', ['--key', 'k1', '--subject', 's1']), 0);
    const i = J(intentFile(ctx, 'k1'));
    assert.equal(i.key, 'k1');
    assert.equal(i.subject, 's1');
    assert.equal(i.ce, 1);
    assert.equal(i.text_sha, sha(''));
    assert.equal(typeof i.created_at, 'string');
    assertLine(intent(ctx, 'open', ['--key', 'k1', '--subject', 's1']), 0);
    assert.equal(ledgerLines(ctx.root, 'intent-open').length, 1);
    assert.equal(ledgerLines(ctx.root, 'intent-open')[0].data.key, 'k1');
    const j = assertLine(intent(ctx, 'open', ['--key', 'k1', '--subject', 's2']), 1);
    assert.ok(hasReason(j, 'intent-differs'));
    assert.equal(J(intentFile(ctx, 'k1')).subject, 's1');
    assert.equal(ledgerLines(ctx.root, 'intent-open').length, 1);
  });
});

test('T13 intent open with a text file records the sha256 of its text', async () => {
  await withRoot({}, async (ctx) => {
    const p = notes(ctx, 'intent.txt', 'open question about caching');
    assertLine(intent(ctx, 'open', ['--key', 'k2', '--subject', 's1', '--text-file', p]), 0);
    assert.equal(J(intentFile(ctx, 'k2')).text_sha, sha('open question about caching'));
    const bad = assertLine(intent(ctx, 'open', ['--key', 'k3', '--subject', 's1', '--text-file', path.join(ctx.root, 'tmp', 'x.txt')]), 66);
    assert.ok(hasReason(bad, 'path-outside-root'));
  });
});

test('T13 intent done before open exits 2 missing; open then done writes .done, once, and open_intents follows', async () => {
  await withRoot({}, async (ctx) => {
    const miss = assertLine(intent(ctx, 'done', ['--key', 'nokey']), 2);
    assert.ok(hasReason(miss, 'missing'));
    assertLine(intent(ctx, 'open', ['--key', 'k1', '--subject', 's1']), 0);
    assertLine(build(ctx), 0);
    assert.deepEqual(statusJson(ctx).open_intents, ['k1']);
    assertLine(intent(ctx, 'done', ['--key', 'k1']), 0);
    const d = J(intentFile(ctx, 'k1', 'done'));
    assert.equal(d.key, 'k1');
    assert.equal(typeof d.done_at, 'string');
    assertLine(intent(ctx, 'done', ['--key', 'k1']), 0);
    assert.equal(ledgerLines(ctx.root, 'intent-done').length, 1);
    assertLine(build(ctx), 0);
    assert.deepEqual(statusJson(ctx).open_intents, []);
  });
});

const owner = (ctx, args) => run(ctx.root, ['owner', ...args, ...common(ctx)]);
test('T14 owner drop with a quote file under plan/notes writes an owner line with the quote', async () => {
  await withRoot({ rows: [row('f1-research', { question_ids: ['f1-a-01'] })] }, async (ctx) => {
    const q = notes(ctx, 'q.txt', 'drop this field, the owner said so');
    const j = assertLine(owner(ctx, ['--act', 'drop', '--subject', 'f1-research', '--quote-file', q]), 0);
    const lines = ledgerLines(ctx.root, 'owner');
    assert.equal(lines.length, 1);
    assert.deepEqual(lines[0].data, { act: 'drop', subject: 'f1-research', quote: 'drop this field, the owner said so' });
    assert.deepEqual(j.ledger_seq, [lines[0].seq]);
  });
});

test('T14 owner: a quote of 501 characters or none exits 66, one of 500 is accepted', async () => {
  await withRoot({}, async (ctx) => {
    const args = (p) => ['--act', 'ruling', '--subject', 'free text', '--quote-file', p];
    assert.ok(hasReason(assertLine(owner(ctx, args(notes(ctx, 'long.txt', 'x'.repeat(501)))), 66), 'quote-length'));
    assert.ok(hasReason(assertLine(owner(ctx, args(notes(ctx, 'empty.txt', ''))), 66), 'quote-length'));
    assert.equal(ledgerLines(ctx.root, 'owner').length, 0);
    assertLine(owner(ctx, args(notes(ctx, 'ok.txt', 'y'.repeat(500)))), 0);
    assert.equal(ledgerLines(ctx.root, 'owner')[0].data.quote.length, 500);
  });
});

test('T14 owner: a quote file outside plan/notes exits 66 path-outside-root', async () => {
  await withRoot({}, async (ctx) => {
    const p = path.join(ctx.root, 'tmp', 'q.txt');
    w(p, 'a quote');
    const j = assertLine(owner(ctx, ['--act', 'ruling', '--subject', 'free text', '--quote-file', p]), 66);
    assert.ok(hasReason(j, 'path-outside-root'));
    assert.equal(ledgerLines(ctx.root, 'owner').length, 0);
  });
});

test('T14 owner: drop of an unknown task exits 1 no-task', async () => {
  await withRoot({ rows: [row('f1-research', { question_ids: ['f1-a-01'] })] }, async (ctx) => {
    const q = notes(ctx, 'q.txt', 'drop it');
    const j = assertLine(owner(ctx, ['--act', 'drop', '--subject', 'zz-nothing', '--quote-file', q]), 1);
    assert.ok(hasReason(j, 'no-task'));
    assert.equal(ledgerLines(ctx.root, 'owner').length, 0);
  });
});

test('T14 owner: a UTF-8 BOM at the start of the quote file is not part of the quote', async () => {
  await withRoot({}, async (ctx) => {
    const p = path.join(ctx.root, 'plan', 'notes', 'bom.txt');
    w(p, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('approved as written')]));
    assertLine(owner(ctx, ['--act', 'approve', '--subject', 'analysis-plan', '--quote-file', p]), 0);
    assert.equal(ledgerLines(ctx.root, 'owner')[0].data.quote, 'approved as written');
  });
});

test('T15 meter --pct 42 writes a meter line; --pct 101 exits 66', async () => {
  await withRoot({}, async (ctx) => {
    assertLine(run(ctx.root, ['meter', '--pct', '42', ...common(ctx)]), 0);
    const m = ledgerLines(ctx.root, 'meter');
    assert.equal(m.length, 1);
    assert.deepEqual(m[0].data, { pct: 42, self_reported: true });
    assertLine(run(ctx.root, ['meter', '--pct', '101', ...common(ctx)]), 66);
    assertLine(run(ctx.root, ['meter', '--pct', 'abc', ...common(ctx)]), 66);
    assertLine(run(ctx.root, ['meter', '--pct', '-1', ...common(ctx)]), 66);
    assert.equal(ledgerLines(ctx.root, 'meter').length, 1);
  });
});

test('T16 --dry-run of build, reconcile and endturn: the result of the real run, no file changed', async () => {
  await withRoot({}, async (ctx) => {
    const task = 'f1-research';
    const sid = newSid();
    setTasks(ctx, [admittedRow(task)]);
    writeTranscript(tpath(ctx.root, sid, projectDirName(folderAbs(ctx, task))), { sessionId: sid, cwd: folderAbs(ctx, task), calls: 1 });
    meterLine(ctx.root); meterLine(ctx.root);
    const keys = (j) => Object.keys(j.result ?? {}).sort();

    let before = snapshotTree(ctx.root);
    const dBuild = assertLine(build(ctx, ['--dry-run']), 0);
    assert.equal(dBuild.dry_run, true);
    assert.deepEqual(snapshotTree(ctx.root), before, 'dry-run build changed a file');
    const rBuild = assertLine(build(ctx), 0);
    assert.equal(rBuild.dry_run, false);
    assert.deepEqual(keys(dBuild), keys(rBuild));
    fs.rmSync(statusPath(ctx));

    before = snapshotTree(ctx.root);
    const dRec = recNoAlarm(reconcile(ctx, ['--dry-run']));
    assert.equal(dRec.dry_run, true);
    assert.deepEqual(snapshotTree(ctx.root), before, 'dry-run reconcile changed a file');
    assert.equal(readTasks(ctx).tasks[0].step, 'admitted');
    const rRec = recNoAlarm(reconcile(ctx));
    assert.deepEqual(keys(dRec), keys(rRec));
    assert.equal(readTasks(ctx).tasks[0].step, 'started');

    before = snapshotTree(ctx.root);
    const dEnd = endturn(ctx, 2, ['--dry-run']);
    assert.equal(dEnd.json.dry_run, true);
    assert.deepEqual(snapshotTree(ctx.root), before, 'dry-run endturn changed a file');
    assert.equal(fs.existsSync(ackedPath(ctx)), false);
    const rEnd = endturn(ctx, 2);
    assert.equal(rEnd.exit, dEnd.exit, 'the dry run gives the exit code of the real run');
    assert.deepEqual(keys(dEnd), keys(rEnd));
    assert.ok(fs.existsSync(ackedPath(ctx)));
  });
});

test('T17 run.lock busy exits 75 for every mode, one line each, ledger still verifies', async () => {
  await withRoot({ thr: { lock_retries: 3 } }, async (ctx) => {
    meterLine(ctx.root);
    w(intentFile(ctx, 'k1'), { key: 'k1', ce: 1, subject: 's1', text_sha: sha(''), created_at: NOW });
    const q = notes(ctx, 'q.txt', 'a ruling');
    const holder = ctx.sleeper();
    w(path.join(ctx.root, 'run', 'run.lock'), JSON.stringify(lockRec(holder)));
    assertLine(build(ctx), 75);
    assertLine(reconcile(ctx), 75);
    assertLine(endturn(ctx, 0), 75);
    assertLine(intent(ctx, 'open', ['--key', 'k9', '--subject', 's']), 75);
    assertLine(intent(ctx, 'done', ['--key', 'k1']), 75);
    assertLine(owner(ctx, ['--act', 'ruling', '--subject', 'free text', '--quote-file', q]), 75);
    assertLine(run(ctx.root, ['meter', '--pct', '5', ...common(ctx)]), 75);
    assert.equal(ledgerLines(ctx.root).length, 1, 'nothing was appended');
  });
});

// ------------------------------------------------ second model check (CONTRACT decision 40)
test('M2 reconcile asks for the alarm at turn start: none -> exit 1 alarm-missing; a live one of this ce -> exit 0', async () => {
  await withRoot({}, async (ctx) => {
    meterLine(ctx.root);
    const j = recNoAlarm(reconcile(ctx));
    assert.ok(fs.existsSync(statusPath(ctx)), 'the status is still built and written');
    assert.equal(j.result.written, true);
    // a dead alarm record and one of another ce both count as missing
    w(path.join(ctx.root, 'run', 'alarm.json'), { schema_version: 1, ...deadRecord(), ce: 1, armed_at: NOW, sleep_ms: 1000 });
    assert.equal(recNoAlarm(reconcile(ctx)).reasons[0].detail.alive, false);
    const s = liveAlarm(ctx, { ce: 2 });
    recNoAlarm(reconcile(ctx));
    s.kill();
    const s2 = liveAlarm(ctx);
    const ok = assertLine(reconcile(ctx), 0);
    assert.equal(ok.result.arm, undefined);
    assert.ok(s2.child.exitCode === null && s2.child.signalCode === null, 'reconcile neither kills nor replaces the alarm');
  });
});

test('M1 endturn re-arms a live alarm by writing the token (acked.json); alarm.json untouched, the alarm alive', async () => {
  await withRoot({}, async (ctx) => {
    meterLine(ctx.root);
    const s = liveAlarm(ctx);
    const alarmFile = path.join(ctx.root, 'run', 'alarm.json');
    const before = fs.readFileSync(alarmFile);
    const tokenOf = () => (fs.existsSync(ackedPath(ctx)) ? sha(fs.readFileSync(ackedPath(ctx))) : null);
    const t0 = tokenOf();
    const j = endturn(ctx, 1);
    assert.ok([0, 1].includes(j.exit), j.stdout);
    assert.ok(!hasReason(j.json, 'alarm-missing'), 'the live alarm is seen');
    const t1 = tokenOf();
    assert.notEqual(t1, t0, 'the token changed');
    assert.ok(before.equals(fs.readFileSync(alarmFile)), 'alarm.json is not rewritten: no new alarm');
    assert.ok(s.child.exitCode === null && s.child.signalCode === null, 'the alarm was not killed');
  });
});

// ------------------------------------------------ cannot be tested without the app
const NEEDS_APP = 'needs the app';
test('NA1 a real session transcript appears in projectDirName(folder) with that cwd soon after start', { skip: `${NEEDS_APP}: item 7, needs a real session` }, () => {});
test('NA2 the watcher and alarm exits reach the coordinator', { skip: `${NEEDS_APP}: item 5, needs the harness's background commands` }, () => {});
