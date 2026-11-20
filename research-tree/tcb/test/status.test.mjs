// Tests of tcb/status.mjs, written from spec/status.mjs.md and CONTRACT.md only.
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
// FX-OUT: a valid READY is also the ready slot the hook records in outcome/ (READY.json is the copy).
function readyFile(ctx, task, epoch, body) {
  const v = body ?? { kind: 'ready', task, epoch, step: 'pack' };
  w(path.join(ctx.root, 'wt', `${task}-e${epoch}`, 'staging', 'READY.json'), v);
  if (v && v.kind === 'ready' && v.task === task && v.epoch === epoch && typeof v.step === 'string') {
    const dir = path.join(ctx.root, 'wt', `${task}-e${epoch}`, 'outcome');
    fs.mkdirSync(dir, { recursive: true });
    const j = fs.readdirSync(dir).filter((n) => /^[0-9]+.json$/.test(n)).length;
    fs.writeFileSync(path.join(dir, `${j}.json`), canon({ kind: 'ready', task, epoch, step: v.step }));
  }
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
// FX-W2: the ensure's slot record run/arm/slot-<k>.json {ce, pid, start_time, nonce}.
const slotPath = (ctx, k = 1) => path.join(ctx.root, 'run', 'arm', `slot-${k}.json`);
const turnPath = (ctx) => path.join(ctx.root, 'run', 'turn.json');
// FX-W3 (A3): endturn checks K against run/turn.json, which the turn's reconcile writes (hold 1: ce, turn_seq,
// read_seq = the ledger head its status showed). A test of endturn's other steps writes the record as that
// reconcile leaves it: arm unconfirmed, no slots (hold 2 confirms; endturn reads only ce and read_seq).
const putTurn = (ctx, readSeq, { ce = 1, turnSeq = 1, arm = 'unconfirmed', slots = [] } = {}) =>
  w(turnPath(ctx), { ce, turn_seq: turnSeq, read_seq: readSeq, arm, slots, unarmed_turns: 0 });
const putSlot = (ctx, rec, { ce = 1, k = 1, nonce = crypto.randomBytes(16).toString('hex') } = {}) => w(slotPath(ctx, k), { ce, pid: rec.pid, start_time: rec.start_time, nonce });
// a live alarm as an ensure registers it (S1): alarm.json and slot 1 name the same sleeper
function liveAlarm(ctx, { ce = 1 } = {}) {
  const s = ctx.sleeper();
  w(path.join(ctx.root, 'run', 'alarm.json'), { schema_version: 1, pid: s.pid, start_time: s.start_time, ce, armed_at: NOW, sleep_ms: 1000 });
  putSlot(ctx, s, { ce });
  return s;
}
// FX-W2 (FIX-wake FX-W2 step 7; M2's alarm-missing is gone): a reconcile that counts fewer live slots
// of this ce than alarm_slots exits 1 arm-unconfirmed, result.arm "unconfirmed"; the rows are
// reconciled and the status is built all the same.
function recUnarmed(res) {
  const j = assertLine(res, 1);
  assert.ok(hasReason(j, 'arm-unconfirmed'), 'reason arm-unconfirmed');
  assert.ok(!hasReason(j, 'alarm-missing'), 'no alarm-missing from reconcile');
  assert.equal(j.result.arm, 'unconfirmed');
  return j;
}
const armDetail = (j) => j.reasons.find((r) => r.code === 'arm-unconfirmed').detail;

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
    const sidS = newSid();
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
      [row('f1-started', { step: 'started', session: sidS, question_ids: q }), 'bind'], // FX-PLAN step 6: its claim (written below)
      [row('f1-startnc', { step: 'started', question_ids: q }), 'owner'], // FX-PLAN rev 4 P2: no claim, no start.json
      [row('f1-comstart', { state: 'committed', step: 'started', session: newSid(), question_ids: q, commits: { pack: HEX64 } }), 'stop-request'], // FX-PLAN step 3 (b)
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
    fs.mkdirSync(path.join(ctx.root, 'wt', 'f1-started-e1'), { recursive: true });
    fs.writeFileSync(path.join(ctx.root, 'wt', 'f1-started-e1', 'claim.json'), JSON.stringify({ kind: 'session', session_id: sidS }));
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
    recUnarmed(reconcile(ctx));
    const r = readTasks(ctx).tasks[0];
    assert.equal(r.step, 'started');
    assert.equal(r.attempts.find((a) => a.epoch === 1).session, sid);
    const started = ledgerLines(ctx.root, 'started');
    assert.equal(started.length, 1);
    assert.equal(started[0].data.session, sid);
    assert.equal(started[0].task, task);
    assert.equal(started[0].epoch, 1);
    assert.ok(fs.existsSync(statusPath(ctx)), 'reconcile ends with a build');
    recUnarmed(reconcile(ctx));
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
    recUnarmed(reconcile(ctx));
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
    recUnarmed(await s.done);
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
    putTurn(ctx, 3);
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
    putTurn(ctx, 2);
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
    putTurn(ctx, 1, { ce: 2 });
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
    putTurn(ctx, 1);
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
    putTurn(ctx, 3);
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

test('S1 FX-CGATE owner closed: the CLI session id only; the owner line and run/close/done/<sid>.json outcome owner; a record already there is kept; a dry run writes nothing', async () => {
  await withRoot({}, async (ctx) => {
    const q = notes(ctx, 'closed.txt', 'that session is gone, I closed it');
    const sid = '0a1b2c3d-0000-4000-8000-0000000000c1';
    const done = (s) => path.join(ctx.root, 'run', 'close', 'done', `${s}.json`);
    const closed = (s, more = []) => owner(ctx, ['--act', 'closed', '--subject', s, '--quote-file', q, ...more]);
    for (const bad of ['self', `local_${sid}`, sid.toUpperCase(), 'f1-research']) assertLine(closed(bad), 66);
    assert.equal(fs.existsSync(path.join(ctx.root, 'run', 'close')), false, 'a refused act writes nothing');
    const dry = assertLine(closed(sid, ['--dry-run']), 0);
    assert.equal(dry.dry_run, true);
    assert.equal(fs.existsSync(done(sid)), false, 'a dry run writes nothing');
    const j = assertLine(closed(sid), 0);
    assert.equal(j.result.done, 'created');
    assert.deepEqual(J(done(sid)), { kind: 'close-done', session: sid, outcome: 'owner', by: null });
    const lines = ledgerLines(ctx.root, 'owner');
    assert.equal(lines.length, 1);
    assert.deepEqual(lines[0].data, { act: 'closed', subject: sid, quote: 'that session is gone, I closed it' });
    // a hook's record already at the name stands
    const other = '0a1b2c3d-0000-4000-8000-0000000000c2';
    w(done(other), { kind: 'close-done', session: other, outcome: 'stopped', by: sid });
    assert.equal(assertLine(closed(other), 0).result.done, 'kept');
    assert.equal(J(done(other)).outcome, 'stopped');
    assert.equal(ledgerLines(ctx.root, 'owner').length, 2);
  });
});

// FX-CLOSE T3 (B1-3 "CLOSE places"; refute/PLAN.md findings 1 and 2): close-session end to end through
// status. A late folder session (a transcript whose first cwd is a stop-confirmed attempt's folder, not
// its holder, no done record) gives `close-session <sid>` on rows that continue (active at stopped,
// admitted at e2, bound) and on an ended one; the owner's `closed` act moves each on. closesMissing of
// a stop-requested row at verify_rounds 3 (the holder, then another folder session of the target
// attempt) and the facts planFacts reads from the files (the log's fenced reason, a tampered log, an
// invalid claim) reach `next` the same way.
test('FX-CLOSE T3 status: close-session on continuing and ended rows, the owner closed moves each on; closesMissing and the planFacts facts reach next', async () => {
  await withRoot({}, async (ctx) => {
    const lib = await getLib();
    const q = ['f1-a-01'];
    const conf = (task, o = {}) => att(task, 1, { stop: 'confirmed', session: newSid(), ...o });
    const sB = newSid();
    const sH = newSid();
    const sF = newSid();
    const rows = [
      row('f1-cont', { step: 'stopped', question_ids: q, attempts: [conf('f1-cont')] }),
      row('f1-adm', { step: 'admitted', epoch: 2, question_ids: q, attempts: [conf('f1-adm'), att('f1-adm', 2)] }),
      row('f1-bound', { step: 'bound', epoch: 2, session: sB, question_ids: q, attempts: [conf('f1-bound'), att('f1-bound', 2, { session: sB })] }),
      row('f1-ended', { state: 'committed', step: 'stopped', question_ids: q, commits: { pack: HEX64 }, attempts: [conf('f1-ended')] }),
      { ...row('f1-sr', { step: 'stop-requested', epoch: 2, reason: 'stall', question_ids: q, attempts: [att('f1-sr', 1, { session: sH, stop: 'unconfirmed' }), att('f1-sr', 2)] }), verify_rounds: 3 },
      row('f1-fenced', { session: sF, question_ids: q, attempts: [att('f1-fenced', 1, { session: sF })] }),
      row('f1-tamper', { session: newSid(), question_ids: q }),
      row('f1-badclaim', { step: 'admitted', question_ids: q }),
    ];
    setTasks(ctx, rows);
    const lateOf = {};
    const lateIn = (task, sid = newSid()) => {
      const dir = folderAbs(ctx, task, 1);
      writeTranscript(path.join(ctx.root, 'transcripts', lib.projectDirName(dir), sid + '.jsonl'), { sessionId: sid, cwd: dir });
      return sid;
    };
    for (const t of ['f1-cont', 'f1-adm', 'f1-bound', 'f1-ended']) lateOf[t] = lateIn(t);
    w(path.join(folderAbs(ctx, 'f1-sr', 1), 'claim.json'), lib.claimRecord(sH));
    const s2 = lateIn('f1-sr');
    w(path.join(folderAbs(ctx, 'f1-fenced', 1), 'claim.json'), lib.claimRecord(sF));
    fs.mkdirSync(path.join(folderAbs(ctx, 'f1-fenced', 1), 'outcome'), { recursive: true });
    lib.outcomeAppend(folderAbs(ctx, 'f1-fenced', 1), { kind: 'fenced', task: 'f1-fenced', epoch: 1, reason: 'stall' }, { row: rows[5] });
    w(path.join(folderAbs(ctx, 'f1-tamper', 1), 'outcome', '0.json'), '{');
    w(path.join(folderAbs(ctx, 'f1-badclaim', 1), 'claim.json'), '{');
    const nexts = () => {
      assertLine(build(ctx), 0);
      const st = statusJson(ctx);
      return Object.fromEntries(rows.map((r) => [r.task, byTask(st, r.task).next]));
    };
    const facts = { 'f1-fenced': 'replace-fence --reason stall', 'f1-tamper': 'owner', 'f1-badclaim': 'owner' };
    assert.deepEqual(nexts(), {
      'f1-cont': `close-session ${lateOf['f1-cont']}`, 'f1-adm': `close-session ${lateOf['f1-adm']}`,
      'f1-bound': `close-session ${lateOf['f1-bound']}`, 'f1-ended': `close-session ${lateOf['f1-ended']}`,
      'f1-sr': 'owner', ...facts,
    }, 'each late session is closed first; the holder\'s close missing at three rounds is the owner\'s');
    const qf = notes(ctx, 'closed.txt', 'I closed those sessions myself');
    const closed = (sid) => assertLine(owner(ctx, ['--act', 'closed', '--subject', sid, '--quote-file', qf]), 0);
    for (const sid of [...Object.values(lateOf), sH]) closed(sid);
    assert.deepEqual(nexts(), {
      'f1-cont': 'replace-start', 'f1-adm': 'start-session', 'f1-bound': 'none', 'f1-ended': 'none',
      'f1-sr': 'owner', ...facts,
    }, 'closed: each row moves on; f1-sr still misses the close of its other folder session');
    closed(s2);
    assert.equal(nexts()['f1-sr'], 'stop-verify', 'every close the verify needs is recorded: the rule ends');
    assert.equal(ledgerLines(ctx.root, 'owner').length, 6);
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
    const dRec = recUnarmed(reconcile(ctx, ['--dry-run']));
    assert.equal(dRec.dry_run, true);
    assert.deepEqual(snapshotTree(ctx.root), before, 'dry-run reconcile changed a file');
    assert.equal(readTasks(ctx).tasks[0].step, 'admitted');
    const rRec = recUnarmed(reconcile(ctx));
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
test('FX-W2 reconcile confirms the arm only by a live slot of this ce: none, a dead one, another ce -> exit 1 arm-unconfirmed; a live one -> exit 0 confirmed', async () => {
  await withRoot({}, async (ctx) => {
    meterLine(ctx.root);
    const j = recUnarmed(reconcile(ctx));
    assert.ok(fs.existsSync(statusPath(ctx)), 'the status is still built and written');
    assert.equal(j.result.written, true);
    assert.deepEqual(armDetail(j), { ce: 1, live: 0, need: 1, slots: [{ k: 1, state: 'absent', pid: null }] });
    assert.deepEqual(J(turnPath(ctx)), { ce: 1, turn_seq: 1, read_seq: j.result.status.ledger.seq, arm: 'unconfirmed', slots: [], unarmed_turns: 1 });
    // a dead slot record and one of another ce both leave the turn unarmed
    const dead = deadRecord();
    putSlot(ctx, dead);
    assert.deepEqual(armDetail(recUnarmed(reconcile(ctx))).slots, [{ k: 1, state: 'dead', pid: dead.pid }]);
    const s = liveAlarm(ctx, { ce: 2 });
    assert.deepEqual(armDetail(recUnarmed(reconcile(ctx))).slots, [{ k: 1, state: 'other-ce', pid: s.pid }]);
    assert.equal(J(turnPath(ctx)).unarmed_turns, 3);
    s.kill();
    const s2 = liveAlarm(ctx);
    const ok = assertLine(reconcile(ctx), 0);
    assert.equal(ok.result.arm, 'confirmed');
    assert.deepEqual(ok.result.slots, [{ k: 1, pid: s2.pid, start_time: s2.start_time }]);
    const turn = J(turnPath(ctx));
    assert.deepEqual([turn.turn_seq, turn.arm, turn.unarmed_turns], [4, 'confirmed', 0]);
    assert.deepEqual(turn.slots, ok.result.slots);
    assert.ok(s2.child.exitCode === null && s2.child.signalCode === null, 'reconcile neither kills nor replaces the alarm');
  });
});

// FX-W2: each --arm-nonces value becomes a file name, run/arm/<nonce>.json (path.join keeps `..`); the hook checks no
// value, so this check is the only guard on those names (W2's blind review, mutation row 17).
test('FX-W2 --arm-nonces refuses a value holding .. or a path separator: exit 66 usage before any write, also when one value of the list is bad', async () => {
  await withRoot({}, async (ctx) => {
    meterLine(ctx.root);
    const ok = crypto.randomBytes(16).toString('hex');
    const bad = ['..', '../x', '..\\x', 'a/b', 'a\\b', `/${ok}`, `../../${ok}`, `..\\..\\${ok}`,
      `${'0'.repeat(30)}..`, `${'0'.repeat(31)}/`, `${'0'.repeat(31)}\\`, `${ok},../${ok}`, `${ok},${'0'.repeat(30)}..`];
    const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f) : null);
    const armDir = path.join(ctx.root, 'run', 'arm');
    const snap = () => ({ status: read(statusPath(ctx)), turn: read(turnPath(ctx)), arm: fs.existsSync(armDir) ? fs.readdirSync(armDir).sort() : [] });
    const was = snap();
    const lines = ledgerLines(ctx.root).length;
    for (const v of bad) {
      const j = assertLine(reconcile(ctx, ['--arm-nonces', v]), 66);
      assert.ok(j.reasons.some((r) => r.code === 'usage' && r.detail && r.detail.flag === 'arm-nonces' && /hex/.test(String(r.detail.expect))),
        `the value check refuses ${JSON.stringify(v)}`);
      assert.deepEqual(snap(), was, `nothing written for ${JSON.stringify(v)}`);
    }
    assert.deepEqual(was.arm, [], 'no nonce file was made');
    for (const f of [path.join(ctx.root, 'x.json'), path.join(ctx.root, 'run', 'x.json'), path.join(ctx.root, `${ok}.json`), path.join(ctx.root, 'run', `${ok}.json`)]) {
      assert.ok(!fs.existsSync(f), `${f} not written`);
    }
    assert.equal(ledgerLines(ctx.root).length, lines, 'no line appended');
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
    putTurn(ctx, 1);
    const j = endturn(ctx, 1);
    assert.ok([0, 1].includes(j.exit), j.stdout);
    assert.ok(!hasReason(j.json, 'alarm-missing'), 'the live alarm is seen');
    const t1 = tokenOf();
    assert.notEqual(t1, t0, 'the token changed');
    assert.ok(before.equals(fs.readFileSync(alarmFile)), 'alarm.json is not rewritten: no new alarm');
    assert.ok(s.child.exitCode === null && s.child.signalCode === null, 'the alarm was not killed');
  });
});

// ------------------------------------------------ FX-W1: tri-state liveness and exit markers
// FIX-wake.md FX-W1 steps 1-4 and FIX-JOIN point 6. The process list is made unavailable (unknown)
// by pointing proc_exe at a missing program. The marker name is CONTRACT 3.9's
// run/arm/exited-<pid>-<start>.json, <start> with every character but [0-9A-Za-z] removed.
const NO_LIST = { proc_exe: 'C:/no-such-dir/no-such-program.exe' };
const armDir = (ctx) => path.join(ctx.root, 'run', 'arm');
const markFile = (ctx, rec) => path.join(armDir(ctx), `exited-${rec.pid}-${String(rec.start_time).replace(/[^0-9A-Za-z]/g, '')}.json`);
const putMarker = (ctx, rec, exit = 30) => w(markFile(ctx, rec), { ce: 1, exit, at: NOW });
// records of this ce for both wake sources, naming processes that do not run
function wakeRecords(ctx, { ce = 1 } = {}) {
  const wr = { pid: 999001, start_time: '2026-11-17T09:00:00.0000000Z' };
  const ar = { pid: 999002, start_time: '2026-11-17T09:01:00.0000000Z' };
  w(path.join(ctx.root, 'run', 'watcher.lock'), JSON.stringify(lockRec(wr, { script: 'watch', ce })));
  w(path.join(ctx.root, 'run', 'watcher.json'), {
    schema_version: 1, ce, pid: wr.pid, start_time: wr.start_time, ticks_total: 1, last_tick_at: NOW, active: {}, pending: [], tasks: {},
  });
  w(path.join(ctx.root, 'run', 'alarm.json'), { schema_version: 1, pid: ar.pid, start_time: ar.start_time, ce, armed_at: NOW, sleep_ms: 1000 });
  return { wr, ar };
}

test('FX-W1 endturn with the list unavailable: unmarked sources are unknown (exit 2); a marked alarm is dead (exit 1 alarm-missing, then proc-unavailable)', async () => {
  await withRoot({ thr: NO_LIST }, async (ctx) => {
    meterLine(ctx.root);
    const { ar } = wakeRecords(ctx);
    putTurn(ctx, 1);
    const j = assertLine(endturn(ctx, 1), 2);
    assert.deepEqual(j.result.sources, { watcher: 'unknown', alarm: 'unknown' });
    assert.equal(j.result.watcher, false);
    assert.equal(j.result.alarm, false);
    assert.deepEqual(j.reasons.map((r) => [r.code, r.detail]), [['proc-unavailable', { unknown: ['watcher', 'alarm'] }]]);
    assert.equal(J(ackedPath(ctx)).acked_seq, 1, 'acked.json is written all the same');
    putMarker(ctx, ar);
    const j2 = assertLine(endturn(ctx, 1), 1);
    assert.deepEqual(j2.result.sources, { watcher: 'unknown', alarm: 'dead' });
    assert.deepEqual(j2.reasons.map((r) => r.code), ['alarm-missing', 'proc-unavailable']);
    assert.deepEqual(j2.reasons[0].detail, { ce: 1, pid: ar.pid, state: 'dead' });
    assert.deepEqual(j2.reasons[1].detail, { unknown: ['watcher'] });
  });
});

test('FX-W1 a corrupt watcher.json or alarm.json is the anomaly state-corrupt (build exit 0) and a dead source to endturn (exit 1), not 67', async () => {
  await withRoot({}, async (ctx) => {
    meterLine(ctx.root);
    w(path.join(ctx.root, 'run', 'watcher.json'), '{"ce": 1,');
    w(path.join(ctx.root, 'run', 'alarm.json'), 'not json');
    assertLine(build(ctx), 0);
    const st = statusJson(ctx);
    assert.deepEqual(st.anomalies.filter((a) => a.code === 'state-corrupt').map((a) => a.detail.file).sort(), ['alarm.json', 'watcher.json']);
    assert.equal(st.watcher.alive, false);
    assert.equal(st.alarm.alive, false);
    putTurn(ctx, 1);
    const j = assertLine(endturn(ctx, 1), 1);
    assert.deepEqual(j.result.sources, { watcher: 'dead', alarm: 'dead' });
    assert.ok(hasReason(j, 'watcher-missing') && hasReason(j, 'alarm-missing'), JSON.stringify(j.reasons));
    recUnarmed(reconcile(ctx));
  });
});

test('FX-W1 reconcile with the list unavailable: an unmarked alarm slot of this ce is unknown and counts (exit 0, alive null); a marked one is dead (exit 1 arm-unconfirmed, anomaly alarm-dead)', async () => {
  await withRoot({ thr: NO_LIST }, async (ctx) => {
    meterLine(ctx.root);
    const { ar } = wakeRecords(ctx);
    putSlot(ctx, ar); // FX-W2: the alarm as registered in slot 1
    const j = assertLine(reconcile(ctx), 0);
    assert.equal(j.result.arm, 'confirmed');
    let st = statusJson(ctx);
    assert.equal(st.alarm.alive, null);
    assert.equal(st.watcher.alive, null);
    assert.ok(!st.anomalies.some((a) => a.code === 'alarm-dead' || a.code === 'watcher-dead'), JSON.stringify(st.anomalies));
    assert.ok(st.anomalies.some((a) => a.code === 'proc-unavailable'));
    putMarker(ctx, ar);
    const j2 = recUnarmed(reconcile(ctx));
    assert.deepEqual(armDetail(j2).slots, [{ k: 1, state: 'exited', pid: ar.pid }]);
    st = statusJson(ctx);
    assert.equal(st.alarm.alive, false);
    assert.ok(st.anomalies.some((a) => a.code === 'alarm-dead'), 'a marked alarm is dead with the list unknown');
    assert.ok(fs.existsSync(markFile(ctx, ar)), 'the marker of the alarm alarm.json names is kept');
  });
});

test('FX-W1 reconcile prunes an exit marker no record names; the markers of alarm.json and of a slot file stay, unarmed-* stays; --dry-run removes nothing', async () => {
  await withRoot({}, async (ctx) => {
    meterLine(ctx.root);
    const named = { pid: 999005, start_time: '2026-11-17T09:05:00.0000000Z' };
    w(path.join(ctx.root, 'run', 'alarm.json'), { schema_version: 1, ...named, ce: 1, armed_at: NOW, sleep_ms: 1000 });
    const slot = { pid: 999003, start_time: '2026-11-17T09:02:00.0000000Z' };
    w(path.join(armDir(ctx), 'slot-1.json'), { ce: 1, ...slot, nonce: 'a'.repeat(32), turn_seq_at_reg: 0 });
    const old = { pid: 999004, start_time: '2026-11-17T08:00:00.0000000Z' };
    for (const r of [named, slot, old]) putMarker(ctx, r);
    const unarmed = path.join(armDir(ctx), 'unarmed-999004-20261117T0800000000000Z.json');
    w(unarmed, { ce: 1, turn_seq: 0 });
    const before = fs.readdirSync(armDir(ctx)).sort();
    assert.equal(before.length, 5);
    recUnarmed(reconcile(ctx, ['--dry-run']));
    assert.deepEqual(fs.readdirSync(armDir(ctx)).sort(), before, '--dry-run removes nothing');
    recUnarmed(reconcile(ctx));
    assert.equal(fs.existsSync(markFile(ctx, old)), false, 'the marker no record names is removed');
    assert.ok(fs.existsSync(markFile(ctx, named)), "alarm.json's marker stays");
    assert.ok(fs.existsSync(markFile(ctx, slot)), "slot-1's marker stays");
    assert.ok(fs.existsSync(unarmed), 'unarmed-* is not touched');
    assert.ok(fs.existsSync(path.join(armDir(ctx), 'slot-1.json')));
  });
});

// FX-W2 (B1.4): hold 2's turn.json write fails (exit 70) through the library's fs seam (lib.setFsSeam,
// preloaded with --import), so the file shows what hold 1 wrote: the second write of a turn record
// (the one with "unarmed_turns") throws.
function turnSeam(ctx) {
  const f = path.join(ctx.root, 'tmp', 'turn-seam.mjs');
  fs.writeFileSync(f, [
    "import fs from 'node:fs';",
    `import * as lib from ${JSON.stringify(pathToFileURL(path.join(TCB_SRC, 'lib.mjs')).href)};`,
    "const needle = Buffer.from('\"unarmed_turns\"');",
    'let n = 0;',
    'lib.setFsSeam({ writeSync(fd, buf, ...rest) {',
    "  if (Buffer.isBuffer(buf) && buf.includes(needle) && ++n === 2) throw new Error('seam: hold 2 does not write turn.json');",
    '  return fs.writeSync(fd, buf, ...rest);',
    '} });',
    '',
  ].join('\n'));
  return pathToFileURL(f).href;
}
const seamReconcile = (ctx, seam, extra = []) => parseOut(cp.spawnSync(process.execPath,
  ['--import', seam, scriptPath(ctx.root, 'status'), '--reconcile', ...common(ctx), '--now', NOW, '--free-mb', '100000', ...extra],
  { cwd: ctx.root, encoding: 'utf8', windowsHide: true, timeout: 120000 }));

test('FX-W2 a second reconcile of a confirmed turn keeps it confirmed in hold 1 (B1.4); given nonces hold 1 starts the turn unconfirmed; hold 2 re-checks the slots all the same', async () => {
  await withRoot({}, async (ctx) => {
    meterLine(ctx.root);
    const seam = turnSeam(ctx);
    const s = liveAlarm(ctx);
    assertLine(reconcile(ctx), 0);
    const t1 = J(turnPath(ctx));
    assert.deepEqual([t1.turn_seq, t1.arm, t1.unarmed_turns], [1, 'confirmed', 0]);
    // the turn's second reconcile, no nonces, hold 2 failing: turn.json is hold 1's record, still confirmed
    const second = seamReconcile(ctx, seam);
    assert.equal(second.exit, 70, `${second.stdout}\n${second.stderr}`);
    assert.deepEqual(J(turnPath(ctx)), { ...t1, turn_seq: 2, read_seq: statusJson(ctx).ledger.seq });
    // given a nonce (the first reconcile of a turn), hold 1 writes the turn unconfirmed with no slots
    const x = crypto.randomBytes(16).toString('hex');
    w(path.join(armDir(ctx), `${x}.json`), { state: 'present', pid: s.pid });
    assert.equal(seamReconcile(ctx, seam, ['--arm-nonces', x]).exit, 70);
    const t3 = J(turnPath(ctx));
    assert.deepEqual([t3.turn_seq, t3.arm, t3.slots, t3.unarmed_turns], [3, 'unconfirmed', [], 0]);
    assert.deepEqual(J(path.join(armDir(ctx), `${x}.json`)), { state: 'present', pid: s.pid }, 'an outcome other than started is kept');
    // hold 2 confirms by the live slot; after the alarm's exit marker hold 1 keeps confirmed and hold 2 unarms
    assertLine(reconcile(ctx), 0);
    assert.equal(J(turnPath(ctx)).arm, 'confirmed');
    putMarker(ctx, s);
    const last = recUnarmed(reconcile(ctx));
    assert.deepEqual(armDetail(last).slots, [{ k: 1, state: 'exited', pid: s.pid }]);
    const t5 = J(turnPath(ctx));
    assert.deepEqual([t5.turn_seq, t5.arm, t5.slots, t5.unarmed_turns], [5, 'unconfirmed', [], 1]);
  });
});

// ------------------------------------------------ cannot be tested without the app
const NEEDS_APP = 'needs the app';
// ------------------------------------------------ FX-W3: endturn step 1 (A3; N2 with E1)
// FIX-wake FX-W3 A3 and FIX-JOIN part 2b row 9: K is checked against run/turn.json of this ce, whose read_seq
// is the head the turn's status showed; absent or of another ce is turn-stale with nothing written. Every
// endturn of this ce spends the turn's arm, a refused K included (between turns nothing is armed); the
// wake sources are reported after a refusal too (N2), so the coordinator acts on them before it ends.
test('FX-W3 endturn: turn-stale writes nothing; K above read_seq is acked-ahead; a refused and a passing K both spend the arm; the same K twice exits alike; the sources are reported after a refusal', async () => {
  await withRoot({}, async (ctx) => {
    meterLine(ctx.root); meterLine(ctx.root); meterLine(ctx.root);
    liveWatcher(ctx);
    const slots = [{ k: 1, pid: 4242, start_time: '2026-11-20T00:00:00.0000000Z' }];
    const codesOf = (j) => j.reasons.map((r) => r.code);
    // no turn.json (no reconcile this turn): turn-stale, nothing written; the missing alarm is reported beside it
    let before = snapshotTree(ctx.root);
    let j = assertLine(endturn(ctx, 3), 1);
    assert.deepEqual(codesOf(j), ['turn-stale', 'alarm-missing']);
    assert.deepEqual(j.reasons[0].detail, { ce: 1, turn_ce: null });
    assert.deepEqual([j.result.acked_seq, j.result.written], [null, false]);
    assert.deepEqual(snapshotTree(ctx.root), before, 'turn-stale writes nothing');
    // a turn of another ce: turn-stale, its turn.json untouched
    putTurn(ctx, 3, { ce: 2, arm: 'confirmed', slots });
    before = snapshotTree(ctx.root);
    j = assertLine(endturn(ctx, 3), 1);
    assert.deepEqual(j.reasons[0], { code: 'turn-stale', detail: { ce: 1, turn_ce: 2 } });
    assert.deepEqual(snapshotTree(ctx.root), before, 'nothing written, the other ce\'s arm kept');
    // this ce's turn showed head 2: K 3 (the head now) is acked-ahead; no acked.json, the arm spent all the same
    putTurn(ctx, 2, { arm: 'confirmed', slots });
    j = assertLine(endturn(ctx, 3), 1);
    assert.deepEqual(codesOf(j), ['acked-ahead', 'alarm-missing']);
    assert.deepEqual(j.reasons[0].detail, { acked_seq: 3, read_seq: 2 });
    assert.equal(fs.existsSync(ackedPath(ctx)), false, 'a refused K writes no acked.json');
    assert.equal(J(turnPath(ctx)).arm, 'spent', 'a refused K spends the arm');
    // K 2: acked.json written and the arm spent; every other field of turn.json kept
    putTurn(ctx, 2, { arm: 'confirmed', slots });
    const a = assertLine(endturn(ctx, 2), 1);
    assert.deepEqual(codesOf(a), ['alarm-missing']);
    assert.deepEqual([a.result.acked_seq, a.result.written, a.result.sources], [2, true, { watcher: 'alive', alarm: 'dead' }]);
    assert.equal(J(ackedPath(ctx)).acked_seq, 2);
    assert.deepEqual(J(turnPath(ctx)), { ce: 1, turn_seq: 1, read_seq: 2, arm: 'spent', slots, unarmed_turns: 0 });
    // the same K again (a retried endturn): the same exit, reasons and result
    const b = assertLine(endturn(ctx, 2), 1);
    assert.deepEqual([b.reasons, b.result], [a.reasons, a.result]);
    // K below the stored value: acked-backwards, acked.json unchanged, the arm spent
    putTurn(ctx, 2, { arm: 'confirmed', slots });
    const ack = fs.readFileSync(ackedPath(ctx));
    j = assertLine(endturn(ctx, 1), 1);
    assert.deepEqual(codesOf(j), ['acked-backwards', 'alarm-missing']);
    assert.ok(ack.equals(fs.readFileSync(ackedPath(ctx))));
    assert.equal(J(turnPath(ctx)).arm, 'spent');
  });
});

// ------------------------------------------------ FX-W4: the dead-man (status --deadman)
// FIX-wake.md FX-W4 steps 1-3, rev 5 N1 (the re-alert every realert_runs runs, branch P1), FIX-JOIN point
// 1.4 (runs_no_watcher) and departures/W4.md. Each call is one run of the scheduled task; the tests call the
// script as the task does and read run/deadman.json, the dead-man's one file. tcb/settings/deadman-task.xml
// is read as text: no test hands it to schtasks or the Task Scheduler.
const dmPath = (ctx) => path.join(ctx.root, 'run', 'deadman.json');
const deadman = (ctx, extra = [], now = NOW) => run(ctx.root, ['--deadman', '--root', ctx.root, '--now', now, ...extra]);
const dmAlerts = (j) => j.reasons.find((r) => r.code === 'deadman-alert')?.detail ?? null;
const watcherPath = (ctx) => path.join(ctx.root, 'run', 'watcher.json');
const setStuck = (ctx, stuck) => w(watcherPath(ctx), { ...J(watcherPath(ctx)), stuck });
const unarmedPath = (ctx, pid, st = '2026-11-17T09:02:00.0000000Z') => path.join(armDir(ctx), `unarmed-${pid}-${st.replace(/[^0-9A-Za-z]/g, '')}.json`);
function setThr(ctx, thr) {
  const p = path.join(ctx.root, 'tcb', 'thresholds.json');
  const doc = J(p);
  for (const [k, v] of Object.entries(thr)) doc.params[k] = { ...(doc.params[k] ?? { unit: 'test value', source: 'guess', gate: true }), value: v };
  w(p, doc);
}
// one run whose exit is 0 or 1: the stdout line checked, the alerts of this run returned ([] at exit 0)
function dmRun(ctx, extra = [], now = NOW) {
  const res = deadman(ctx, extra, now);
  const j = assertLine(res, res.exit === 1 ? 1 : 0);
  return { j, alerts: j.exit === 1 ? dmAlerts(j).alerts : [] };
}

test('FX-W4 dead-man, the list answering: no records count runs_no_alarm and runs_no_watcher, two runs alert both; a live alarm and watcher of the ce clear them; an exit marker or a missing watcher.lock counts; the list down leaves the counts; a new ce restarts them', async () => {
  await withRoot({}, async (ctx) => {
    let j = assertLine(deadman(ctx), 0);
    assert.deepEqual([j.result.list, j.result.alarm, j.result.watcher, j.result.state, j.result.written], ['answered', 'none', 'none', 'fresh', true]);
    let f = J(dmPath(ctx));
    assert.deepEqual([f.ce, f.runs, f.runs_no_alarm, f.runs_no_watcher, f.list_hist, f.alerted, f.at], [1, 1, 1, 1, [false], {}, NOW]);
    assert.equal(typeof f.boot, 'string', 'the boot of the list that answered');
    j = assertLine(deadman(ctx), 1);
    assert.deepEqual(dmAlerts(j), { alerts: ['no-alarm', 'no-watcher'], causes: ['no-alarm', 'no-watcher'] });
    assert.deepEqual(J(dmPath(ctx)).alerted, { 'no-alarm': 0, 'no-watcher': 0 });
    // a live alarm (alarm.json and slot 1 of ce 1) and a live watcher (watcher.json and watcher.lock)
    const a = liveAlarm(ctx);
    liveWatcher(ctx);
    j = assertLine(deadman(ctx), 0);
    assert.deepEqual([j.result.alarm, j.result.watcher, j.result.causes], ['alive', 'alive', []]);
    f = J(dmPath(ctx));
    assert.deepEqual([f.runs_no_alarm, f.runs_no_watcher, f.alerted], [0, 0, {}]);
    // the alarm's exit marker, and watcher.lock gone: both count though both processes live
    putMarker(ctx, a);
    const lockFile = path.join(ctx.root, 'run', 'watcher.lock');
    const lock = fs.readFileSync(lockFile);
    fs.rmSync(lockFile);
    j = assertLine(deadman(ctx), 0);
    assert.deepEqual([j.result.alarm, j.result.watcher, j.result.runs_no_alarm, j.result.runs_no_watcher], ['none', 'none', 1, 1]);
    // the list down, the marker gone, the lock back: both unknown, the counts unchanged
    fs.rmSync(markFile(ctx, a));
    w(lockFile, lock);
    setThr(ctx, NO_LIST);
    j = assertLine(deadman(ctx), 0);
    assert.deepEqual([j.result.list, j.result.alarm, j.result.watcher], ['failed', 'unknown', 'unknown']);
    f = J(dmPath(ctx));
    assert.deepEqual([f.runs_no_alarm, f.runs_no_watcher, f.list_hist], [1, 1, [false, false, false, false, true]]);
    // a new ce (the successor's first run): the records of ce 1 are none and the counts restart (1, no alert)
    w(path.join(ctx.root, 'run', 'coord.json'), { schema_version: 1, ce: 2, started_at: NOW, tcb_commit: COMMIT });
    j = assertLine(deadman(ctx), 0);
    assert.deepEqual([j.result.alarm, j.result.watcher], ['none', 'none']);
    f = J(dmPath(ctx));
    assert.deepEqual([f.ce, f.runs, f.runs_no_alarm, f.runs_no_watcher, f.list_hist], [2, 6, 1, 1, [false, false, false, true, true]]);
  });
});

test('FX-W4 dead-man, the list down: unknown sources leave the counts; 3 of the last 5 runs alert list-failing; stuck, busy_ticks, unarmed_turns and two unarmed records of the current turn_seq alert at their thresholds, not below', async () => {
  await withRoot({ thr: { ...NO_LIST, busy_alert_ticks: 5 } }, async (ctx) => {
    wakeRecords(ctx);
    let j = assertLine(deadman(ctx), 0);
    assert.deepEqual([j.result.list, j.result.alarm, j.result.watcher], ['failed', 'unknown', 'unknown']);
    assert.equal(J(dmPath(ctx)).boot, null, 'no boot without a list or --boot');
    assertLine(deadman(ctx), 0);
    j = assertLine(deadman(ctx), 1);
    assert.deepEqual(dmAlerts(j), { alerts: ['list-failing'], causes: ['list-failing'] });
    let f = J(dmPath(ctx));
    assert.deepEqual([f.runs_no_alarm, f.runs_no_watcher, f.list_hist], [0, 0, [true, true, true]]);
    // the four other causes, each at its threshold (busy_alert_ticks 5 is read from thresholds.json)
    setStuck(ctx, ['act-due:t1']);
    w(path.join(ctx.root, 'run', 'watcher-busy.json'), { ce: 1, busy_ticks: 5 });
    w(turnPath(ctx), { ce: 1, turn_seq: 7, read_seq: 1, arm: 'unconfirmed', slots: [], unarmed_turns: 3 });
    w(unarmedPath(ctx, 999101), { ce: 1, turn_seq: 7 });
    w(unarmedPath(ctx, 999102), { ce: 1, turn_seq: 7 });
    j = assertLine(deadman(ctx), 1);
    assert.deepEqual(dmAlerts(j), {
      alerts: ['stuck', 'run-lock-busy', 'unarmed-turns', 'unarmed-records'],
      causes: ['list-failing', 'stuck', 'run-lock-busy', 'unarmed-turns', 'unarmed-records'],
    });
    assert.deepEqual([j.result.stuck, j.result.busy_ticks, j.result.unarmed_turns, j.result.turn_seq, j.result.unarmed_same_turn], [['act-due:t1'], 5, 3, 7, 2]);
    // one below each: stuck empty, busy 4, unarmed_turns 2, turn_seq 8 with one record of ce 1 and one of ce 2 at it
    setStuck(ctx, []);
    w(path.join(ctx.root, 'run', 'watcher-busy.json'), { ce: 1, busy_ticks: 4 });
    w(turnPath(ctx), { ce: 1, turn_seq: 8, read_seq: 1, arm: 'unconfirmed', slots: [], unarmed_turns: 2 });
    w(unarmedPath(ctx, 999103), { ce: 1, turn_seq: 8 });
    w(unarmedPath(ctx, 999104), { ce: 2, turn_seq: 8 });
    j = assertLine(deadman(ctx), 0);
    assert.deepEqual([j.result.causes, j.result.alerts, j.result.unarmed_same_turn], [['list-failing'], [], 1]);
    f = J(dmPath(ctx));
    assert.deepEqual([f.runs_no_alarm, f.runs_no_watcher, f.list_hist, f.alerted], [0, 0, [true, true, true, true, true], { 'list-failing': 2 }]);
  });
});

test('FX-W4 dead-man re-alert (rev 5 N1, P1): a cause alerts at its onset and again every realert_runs runs while it holds; one run without it ends the onset', async () => {
  await withRoot({ thr: NO_LIST }, async (ctx) => {
    wakeRecords(ctx); // unknown sources: only stuck and list-failing can hold
    setStuck(ctx, ['act-due:t1']);
    const seq = [];
    for (let r = 1; r <= 7; r += 1) seq.push(dmRun(ctx).alerts);
    setStuck(ctx, []); // run 8: stuck cleared for one run
    seq.push(dmRun(ctx).alerts);
    setStuck(ctx, ['act-due:t1']); // run 9: a new onset
    seq.push(dmRun(ctx).alerts);
    assert.deepEqual(seq, [['stuck'], [], ['list-failing'], [], [], [], ['stuck'], [], ['list-failing', 'stuck']]);
    assert.deepEqual(J(dmPath(ctx)).alerted, { 'list-failing': 0, stuck: 0 });
    // realert_runs is read from thresholds.json: at 2, both alert again on the second run
    setThr(ctx, { realert_runs: 2 });
    seq.push(dmRun(ctx).alerts, dmRun(ctx).alerts);
    assert.deepEqual(seq.slice(9), [[], ['list-failing', 'stuck']]);
  });
});

test('FX-W4 status view: deadman-nowake for no record, an unreadable one, one older than 3 periods, or a gap of its runs within one boot; a --dry-run writes nothing; --deadman refuses the coordinator flags; no coord.json exits 2; the task file as text', async () => {
  await withRoot({ thr: NO_LIST }, async (ctx) => {
    const T = (min) => new Date(Date.parse(NOW) + min * 60000).toISOString();
    const nowake = (min) => {
      assertLine(run(ctx.root, [...common(ctx), '--now', T(min), '--free-mb', '100000']), 0);
      return statusJson(ctx).anomalies.filter((a) => a.code === 'deadman-nowake').map((a) => a.detail);
    };
    const at = (min, boot, extra = []) => dmRun(ctx, ['--boot', boot, ...extra], T(min)).j;
    wakeRecords(ctx);
    assert.deepEqual(nowake(0), [{ why: 'no-run' }]);
    w(dmPath(ctx), 'not json');
    assert.deepEqual(nowake(0), [{ why: 'unreadable' }]);
    assert.equal(at(0, 'B1').result.state, 'reset', 'an unreadable record starts the counts again');
    assert.deepEqual([J(dmPath(ctx)).boot, J(dmPath(ctx)).gap], ['B1', null]);
    assert.deepEqual(nowake(4), []);
    assert.deepEqual(nowake(16), [{ why: 'stale', at: T(0) }]);
    // two runs of one boot 20 min apart (more than 2 periods): runs were missed
    assert.deepEqual(at(20, 'B1').result.gap, { from: T(0), to: T(20), ms: 1200000, boot: 'B1', runs_since: 0 });
    assert.deepEqual(nowake(20), [{ why: 'gap', from: T(0), to: T(20), ms: 1200000 }]);
    // flagged while fewer runs followed it than 2 alarm periods hold (alarm_ms 100 here: one run)
    at(25, 'B1');
    assert.deepEqual(nowake(25), []);
    // a jump across a new boot is no gap
    assert.equal(at(60, 'B2').result.gap.runs_since, 2);
    assert.deepEqual(nowake(60), []);
    // a dry run reports the run and writes nothing
    const bytes = fs.readFileSync(dmPath(ctx));
    const d = at(90, 'B2', ['--dry-run']);
    assert.deepEqual([d.dry_run, d.result.written, d.result.gap.ms, d.result.runs], [true, false, 1800000, 5]);
    assert.ok(bytes.equals(fs.readFileSync(dmPath(ctx))), 'deadman.json unchanged');
    // the coordinator's flags are refused with --deadman (66), so is a relative root; no coord.json exits 2
    for (const extra of [['--ce', '1'], ['--reconcile'], ['--endturn', '--acked-seq', '1'], ['--arm-nonces', 'a'.repeat(32)]]) {
      assertLine(deadman(ctx, extra), 66);
    }
    assertLine(run(ctx.root, ['--deadman', '--root', 'run']), 66);
    fs.rmSync(path.join(ctx.root, 'run', 'coord.json'));
    assert.ok(hasReason(assertLine(deadman(ctx), 2), 'no-coordinator'));
    assert.ok(bytes.equals(fs.readFileSync(dmPath(ctx))), 'no record written by a refused run');
  });
  // the task file, read as text (never registered): wake-to-run, every 5 min and at logon, only while the owner
  // is logged on, no battery, idle or network condition, and a toast on any exit but 0
  const xml = fs.readFileSync(path.join(TCB_SRC, 'settings', 'deadman-task.xml'), 'utf8');
  const tag = (name) => [...xml.matchAll(new RegExp(`<${name}>([^<]*)</${name}>`, 'g'))].map((m) => m[1]);
  assert.deepEqual(tag('WakeToRun'), ['true']);
  assert.deepEqual(tag('Interval'), ['PT5M'], 'the period of DM.periodMs');
  assert.match(xml, /<LogonTrigger>/);
  assert.deepEqual([tag('LogonType'), tag('RunLevel')], [['InteractiveToken'], ['LeastPrivilege']]);
  assert.deepEqual([tag('StartWhenAvailable'), tag('MultipleInstancesPolicy'), tag('ExecutionTimeLimit')], [['true'], ['IgnoreNew'], ['PT4M']]);
  for (const n of ['DisallowStartIfOnBatteries', 'StopIfGoingOnBatteries', 'RunOnlyIfNetworkAvailable', 'RunOnlyIfIdle']) assert.deepEqual(tag(n), ['false'], n);
  assert.equal((xml.match(/&(?!(?:amp|lt|gt|quot|apos);)/g) ?? []).length, 0, 'every & is an entity');
  const args = tag('Arguments');
  assert.equal(args.length, 1);
  const cmdText = args[0].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const m = /^-NoProfile -NonInteractive -WindowStyle Hidden -Command "([^"]*)"$/.exec(cmdText);
  assert.ok(m, `the arguments: ${cmdText}`);
  assert.match(m[1], /^\$o = & '\{node\}' '\{root\}\/tcb\/status\.mjs' --deadman --root '\{root\}'; \$x = \$LASTEXITCODE;/, 'the production form only');
  assert.match(m[1], /if \(\$x -ne 0\) \{/);
  assert.match(m[1], /ToastText02/);
  assert.match(m[1], /exit \$x$/);
  // the command parses as PowerShell (parsed only, never run)
  fs.mkdirSync(TMP, { recursive: true });
  const cmdFile = path.join(TMP, `deadman-cmd-${process.pid}.txt`);
  fs.writeFileSync(cmdFile, m[1]);
  try {
    const r = cp.spawnSync(PS_EXE, ['-NoProfile', '-NonInteractive', '-Command',
      `$t = $null; $e = $null; $null = [System.Management.Automation.Language.Parser]::ParseInput((Get-Content -Raw -LiteralPath '${cmdFile}'), [ref]$t, [ref]$e); $e.Count`],
    { encoding: 'utf8', windowsHide: true, timeout: 30000 });
    assert.equal((r.stdout || '').trim(), '0', `PowerShell parse errors: ${r.stdout} ${r.stderr}`);
  } finally {
    fs.rmSync(cmdFile, { force: true });
  }
});

test('NA1 a real session transcript appears in projectDirName(folder) with that cwd soon after start', { skip: `${NEEDS_APP}: item 7, needs a real session` }, () => {});
test('NA2 the watcher and alarm exits reach the coordinator', { skip: `${NEEDS_APP}: item 5, needs the harness's background commands` }, () => {});

// ------------------------------------------------ S2.1: tests that cross fixes
// R5 N2 (FX-W3 + FX-W2 + the coordinator brief): every turn ends with endturn, also after `handover` exit 2 and
// after any exit 75. The brief says so (sections 8 and 9) and endturn does what the brief promises in both turns.
test('S2.1 N2 the brief ends every turn with endturn, also after handover exit 2 and exit 75', () => {
  const brief = fs.readFileSync(path.join(TCB_SRC, 'briefs', 'coordinator.md'), 'utf8').replace(/\s+/g, ' ');
  assert.match(brief, /Every turn's last call, also after `handover` exit 2, after any exit 75 and after an unarmed reconcile: `node <root>\/tcb\/status\.mjs --endturn/);
  assert.match(brief, /A script that exits 75 \(`lock-busy`\): retry nothing\. The turn still ends with endturn/);
  assert.match(brief, /If endturn itself exits 75, end the turn\./);
  assert.match(brief, /when no reconcile of this turn printed a status \(it exited 75\), the `ledger\.seq` of `run\/status\.json`/);
});

test('S2.1 N2 after handover raise exits 2 (proc-unavailable) the turn still ends: nothing was written, endturn acknowledges the reconcile K, spends the arm and reports the sources unknown', async () => {
  await withRoot({}, async (ctx) => {
    meterLine(ctx.root); meterLine(ctx.root);
    liveWatcher(ctx);
    liveAlarm(ctx);
    const rec = reconcile(ctx);
    assert.ok([0, 1].includes(rec.exit), `reconcile: ${rec.stdout}`);
    const k = rec.json.result.status.ledger.seq;
    // the turn's drain line of this ce, then the process list becomes unavailable for the raise (and the endturn)
    addLine(ctx.root, { kind: 'drain', ce: 1, data: { window: 140000, w_star: 133200 } });
    const thrFile = path.join(ctx.root, 'tcb', 'thresholds.json');
    const thr = J(thrFile);
    thr.params.proc_exe = { ...thr.params.proc_exe, value: NO_LIST.proc_exe };
    w(thrFile, thr);
    const before = snapshotTree(ctx.root);
    // a real raise, not a dry run: its own exit 2, proc-unavailable, with the whole tree unchanged
    const h = parseOut(cp.spawnSync(process.execPath, [path.join(TCB_SRC, 'handover.mjs'), 'raise', '--root', ctx.root, '--ce', '1', '--now', NOW],
      { cwd: ctx.root, encoding: 'utf8', windowsHide: true, timeout: 120000 }));
    assert.equal(h.exit, 2, `handover raise exit 2: ${h.stdout}${h.stderr}`);
    assert.ok(h.json && (h.json.reasons ?? []).some((r) => r.code === 'proc-unavailable'), `raise reason: ${h.stdout}`);
    assert.deepEqual(snapshotTree(ctx.root), before, 'raise exit 2 wrote nothing: coord.json is still ce 1, no acked.json, the arm kept');
    assert.equal(J(path.join(ctx.root, 'run', 'coord.json')).ce, 1, 'coord.json still names ce 1');
    assert.equal(fs.existsSync(ackedPath(ctx)), false, 'nothing acknowledged before endturn');
    // the turn's last call is endturn --ce 1: K accepted, the arm spent, the sources unknown (exit 2)
    const j = assertLine(endturn(ctx, k), 2);
    assert.ok(!hasReason(j, 'turn-stale') && !hasReason(j, 'acked-ahead') && !hasReason(j, 'acked-backwards') && !hasReason(j, 'no-coordinator'), JSON.stringify(j.reasons));
    assert.ok(hasReason(j, 'proc-unavailable'), JSON.stringify(j.reasons));
    assert.deepEqual(j.result.sources, { watcher: 'unknown', alarm: 'unknown' });
    assert.equal(J(ackedPath(ctx)).acked_seq, k);
    assert.equal(J(turnPath(ctx)).arm, 'spent');
  });
});

test('S2.1 N2 after exit 75 the turn still ends: K is run/status.json\'s ledger.seq, endturn acknowledges it; endturn itself busy exits 75 and writes nothing', async () => {
  await withRoot({ thr: { lock_retries: 3 } }, async (ctx) => {
    meterLine(ctx.root); meterLine(ctx.root);
    liveWatcher(ctx);
    liveAlarm(ctx);
    assert.ok([0, 1].includes(reconcile(ctx).exit));          // the previous turn left run/status.json and turn.json
    const k = statusJson(ctx).ledger.seq;
    const holder = ctx.sleeper();
    w(path.join(ctx.root, 'run', 'run.lock'), JSON.stringify(lockRec(holder)));
    const r = reconcile(ctx);
    assertLine(r, 75);                                         // this turn's reconcile exits 75: no status printed
    assert.equal(r.json.result?.status, undefined);
    const before = snapshotTree(ctx.root);
    assertLine(endturn(ctx, k), 75);                           // endturn busy too: the turn ends, nothing written
    assert.deepEqual(snapshotTree(ctx.root), before);
    holder.kill();
    fs.rmSync(path.join(ctx.root, 'run', 'run.lock'), { force: true });
    const j = endturn(ctx, k);                                 // lock free: K from status.json is accepted
    assert.ok([0, 1].includes(j.exit), `endturn after 75: ${j.stdout}`);
    assert.ok(!hasReason(j.json, 'acked-ahead') && !hasReason(j.json, 'acked-backwards') && !hasReason(j.json, 'turn-stale'), JSON.stringify(j.json?.reasons));
    assert.equal(J(ackedPath(ctx)).acked_seq, k);
  });
});

// FX-W4 (FIX-wake FX-W4 steps 2-3; this test reads the unarmed-turn counter FX-W3 writes): the dead-man alerts
// when no alarm of the ce is alive for two runs, once per onset, and again after the cause cleared for one run.
// Written against the design; FX-W4 (B1-4, unit W4) had not landed when S2.1 was built, so it is a todo. Whichever
// of W4 and S2.1 lands second drops the `todo` once it passes.
test('S2.1 FX-W4 dead-man: no live alarm for two runs alerts once; an alarm alive for one run clears the onset', { todo: 'FX-W4 (unit W4) not landed: status --deadman is an empty stub' }, async () => {
  await withRoot({}, async (ctx) => {
    meterLine(ctx.root);
    liveWatcher(ctx);
    const dm = () => run(ctx.root, ['--deadman', '--root', ctx.root, '--now', NOW]);
    const file = path.join(ctx.root, 'run', 'deadman.json');
    const first = dm();
    assert.equal(J(file).runs_no_alarm, 1, 'one run with no alarm: counted, no alert yet');
    assert.ok(!/alert/.test(first.stdout) || first.json?.result?.alert === false);
    const second = dm();
    assert.equal(J(file).runs_no_alarm, 2);
    assert.ok(second.json?.result?.alert || (second.json?.reasons ?? []).length > 0, 'two runs: alert');
    const third = dm();
    assert.ok(!third.json?.result?.alert && !(third.json?.reasons ?? []).some((r) => r.code === 'runs-no-alarm'), 'once per onset: no second alert');
    liveAlarm(ctx);
    dm();
    assert.equal(J(file).runs_no_alarm, 0, 'an alarm alive: the count clears');
  });
});
