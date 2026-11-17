// Tests of tcb/scripts/stop.mjs, written from spec/stop.mjs.md and CONTRACT.md only.
// Transcripts come from helpers.fakeTranscript, processes from helpers.spawnSleeper, and the watcher's
// ticks are moved by the test writing run/watcher.json between two verify calls (no timers).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as lib from '../lib.mjs';
import { spawn as _hSpawn, execFileSync as _hExec } from 'node:child_process';
// CONTRACT 4.11 test helpers. tcb/test/helpers.mjs is used when it exists; until it is written, this
// stand-in (the same one tcb/test/lib.test.mjs carries, made synchronous because 4.11 gives plain
// return values and this file calls the helpers without await) takes its place.
const HELPERS_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'helpers.mjs');
const helpers = fs.existsSync(HELPERS_FILE) ? await import(new URL('./helpers.mjs', import.meta.url).href) : standinHelpers();

function standinHelpers() {
  const HERE_H = path.dirname(fileURLToPath(import.meta.url));
  const TCB = path.resolve(HERE_H, '..');
  const TMPROOT = path.resolve(HERE_H, '..', '..', 'tmp');
  const PS_EXE = 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
  const DIRS = [
    'tcb', 'plan', 'plan/frozen', 'run', 'run/intents', 'run/audit', 'run/stop-sample', 'store', 'store/objects', 'store/commits',
    'store/status', 'views', 'queue', 'review-in', 'completeness', 'sealed', 'sealed/seeds', 'sealed/plants', 'sealed/heldout',
    'sealed/blind', '.snapshots', '.snapshots/raw', '.snapshots/text', '.snapshots/meta', '.snapshots/by-url', 'wt', 'transcripts',
  ];
  const BASE_TS = Date.parse('2026-11-17T10:00:00.000Z');
  const tsOf = (i) => new Date(BASE_TS + i * 1000).toISOString();

  function makeRoot({ thresholds: thr, tasks = [], ce = 1 } = {}) {
    fs.mkdirSync(TMPROOT, { recursive: true });
    const root = fs.mkdtempSync(path.join(TMPROOT, 'tcbrt-'));
    for (const d of DIRS) fs.mkdirSync(path.join(root, ...d.split('/')), { recursive: true });
    for (const d of ['schemas', 'profiles', 'settings', 'agents', 'briefs']) {
      const src = path.join(TCB, d);
      if (fs.existsSync(src)) fs.cpSync(src, path.join(root, 'tcb', d), { recursive: true });
      else fs.mkdirSync(path.join(root, 'tcb', d), { recursive: true });
    }
    const doc = JSON.parse(fs.readFileSync(path.join(TCB, 'thresholds.json'), 'utf8'));
    doc.params = doc.params || {};
    const setParam = (name, v) => {
      if (v && typeof v === 'object' && !Array.isArray(v) && 'value' in v) doc.params[name] = v;
      else doc.params[name] = { ...(doc.params[name] || { unit: 'test', source: 'guess', gate: false }), value: v };
    };
    setParam('transcripts_root', path.join(root, 'transcripts'));
    for (const [k, v] of Object.entries(thr || {})) setParam(k, v);
    fs.writeFileSync(path.join(root, 'tcb', 'thresholds.json'), JSON.stringify(doc, null, 2));
    fs.writeFileSync(path.join(root, 'run', 'coord.json'), JSON.stringify({ schema_version: 1, ce, started_at: '2026-11-17T09:00:00.000Z', tcb_commit: '0'.repeat(40) }));
    fs.writeFileSync(path.join(root, 'run', 'tasks.json'), JSON.stringify({ schema_version: 1, rev: 0, tasks }));
    return { root, cleanup: () => fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }) };
  }

  function fakeTranscript(file, { sessionId, cwd, calls = [], structured } = {}) {
    const recs = [];
    let t = 0;
    let n = 0;
    const base = { sessionId, cwd };
    recs.push({ ...base, type: 'user', timestamp: tsOf(t++), uuid: `u-${n++}`, message: { role: 'user', content: 'synthetic start' } });
    calls.forEach((c, i) => {
      const id = `msg_fake_${i}`;
      const u = c.usage || {};
      const usage = {
        input_tokens: u.input_tokens ?? u.input ?? 0,
        cache_read_input_tokens: u.cache_read_input_tokens ?? u.cache_read ?? 0,
        cache_creation_input_tokens: u.cache_creation_input_tokens ?? u.cache_write ?? 0,
        output_tokens: u.output_tokens ?? u.output ?? 0,
      };
      const blocks = [];
      if (typeof c.text === 'string') blocks.push({ type: 'text', text: c.text });
      (c.tools || []).forEach((tl, j) => blocks.push({ type: 'tool_use', id: `toolu_fake_${i}_${j}`, name: tl.name, input: tl.input ?? {} }));
      if (!blocks.length) blocks.push({ type: 'text', text: '' });
      const ts = tsOf(t++);
      for (const b of blocks) recs.push({ ...base, type: 'assistant', timestamp: ts, uuid: `u-${n++}`, message: { id, model: 'claude-test', role: 'assistant', content: [b], usage } });
      if (Array.isArray(c.results) && c.results.length) {
        const content = c.results.map((r, j) => {
          const o = typeof r === 'string' ? { text: r } : r || {};
          return { type: 'tool_result', tool_use_id: o.toolUseId ?? `toolu_fake_${i}_${j}`, is_error: o.isError === true, content: o.text ?? '' };
        });
        recs.push({ ...base, type: 'user', timestamp: tsOf(t++), uuid: `u-${n++}`, message: { role: 'user', content } });
      }
    });
    if (structured !== undefined) recs.push({ ...base, type: 'attachment', timestamp: tsOf(t++), uuid: `u-${n++}`, attachment: { type: 'structured_output', data: structured } });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, recs.map((r) => JSON.stringify(r)).join('\n') + '\n');
    return file;
  }

  // A `node -e` child this test owns; its start time is read once from PowerShell (the form proc.list() reports).
  function spawnSleeper({ args = [] } = {}) {
    const child = _hSpawn(process.execPath, ['-e', 'setInterval(()=>{},1000)', ...args], { stdio: 'ignore', windowsHide: true });
    const exited = new Promise((res) => child.once('exit', res));
    let start_time = null;
    try {
      const out = _hExec(PS_EXE, ['-NoProfile', '-NonInteractive', '-Command',
        `[Console]::OutputEncoding=[Text.Encoding]::UTF8; $x=Get-CimInstance Win32_Process -Filter 'ProcessId=${child.pid}'; if($x -and $x.CreationDate){$x.CreationDate.ToUniversalTime().ToString('o')}`],
      { encoding: 'utf8', windowsHide: true, timeout: 60000 });
      start_time = String(out).replace(/^\uFEFF/, '').trim() || null;
    } catch {
      start_time = null;
    }
    let killed = false;
    return {
      pid: child.pid,
      start_time,
      kill: () => {
        if (!killed) {
          killed = true;
          try { child.kill(); } catch { /* gone */ }
        }
        return child.exitCode === null && child.signalCode === null ? exited : Promise.resolve();
      },
    };
  }

  function fakeProc(table = []) {
    const rows = Array.isArray(table) ? table : [];
    return {
      list: () => rows.map((r) => ({ ...r })),
      alive: (pid, st) => rows.some((r) => r.pid === pid && (st == null || r.start_time === st)),
      boot: () => '2026-11-17T08:00:00.0000000Z',
    };
  }

  return { makeRoot, fakeTranscript, spawnSleeper, fakeProc };
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, '..', 'stop.mjs');

// ---------------------------------------------------------------- support
const NOW = '2026-11-17T10:00:00.000Z';
const SID1 = '11111111-1111-4111-8111-111111111111';
const SID2 = '22222222-2222-4222-8222-222222222222';
const T = 'f1-research';
const SLUG = { 0: 'ok', 1: 'fail', 2: 'not-run', 3: 'tamper', 5: 'ready-wins', 6: 'deferred', 64: 'stale-ce', 65: 'stale-epoch', 66: 'usage', 67: 'table-corrupt', 70: 'internal', 75: 'lock-busy' };
const M0 = 'm_' + '0'.repeat(16);
const Z64 = '0'.repeat(64);
const SAMPLE = `run/stop-sample/${T}-e1.json`;

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
function canon(v) {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
const at = (root, rel) => path.join(root, ...rel.split('/'));
const has = (root, rel) => fs.existsSync(at(root, rel));
const read = (root, rel) => fs.readFileSync(at(root, rel));
const readJ = (root, rel) => JSON.parse(fs.readFileSync(at(root, rel), 'utf8'));
function put(root, rel, data) {
  const f = at(root, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, data);
  return f;
}
const putJ = (root, rel, v) => put(root, rel, JSON.stringify(v, null, 1));
function walkRel(dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walkRel(f, base, out);
    else if (e.isFile()) out.push(path.relative(base, f).split(path.sep).join('/'));
  }
  return out.sort();
}
const treeHash = (dir) => sha(JSON.stringify(walkRel(dir).map((r) => [r, sha(fs.readFileSync(path.join(dir, ...r.split('/'))))])));
function mk() {
  const h = helpers.makeRoot({ ce: 1 });
  return { root: h.root, cleanup: () => h.cleanup() };
}

function argv(root, mode, o = {}) {
  const a = [mode, '--root', root, '--ce', String(o.ce ?? 1), '--task', o.task ?? T, '--epoch', String(o.epoch ?? 2), '--now', NOW];
  if (o.dry) a.push('--dry-run');
  return a;
}
function parse(r) {
  const lines = r.stdout.split('\n').filter((s) => s.length);
  assert.equal(lines.length, 1, `stdout must be one line, got: ${r.stdout}\nstderr: ${r.stderr}`);
  const j = JSON.parse(lines[0]);
  assert.equal(j.script, 'stop');
  assert.equal(typeof j.ok, 'boolean');
  assert.equal(j.exit, r.status, `exit in the line must be the process exit; stderr: ${r.stderr}`);
  assert.equal(j.code, SLUG[j.exit], 'code is the slug of the exit');
  assert.equal(typeof j.dry_run, 'boolean');
  assert.ok(j.result !== null && typeof j.result === 'object');
  assert.ok(Array.isArray(j.reasons));
  assert.ok(Array.isArray(j.ledger_seq));
  for (const x of j.reasons) assert.equal(typeof x.code, 'string');
  return j;
}
function run(root, mode, o = {}) {
  const r = spawnSync(process.execPath, [SCRIPT, ...argv(root, mode, o)], { encoding: 'utf8', cwd: root, windowsHide: true, timeout: 180000 });
  const j = parse(r);
  j.stderr = r.stderr;
  return j;
}
const codes = (j) => j.reasons.map((x) => x.code);
function expectExit(j, exit, reason) {
  assert.equal(j.exit, exit, `expected exit ${exit}, got ${j.exit}: ${JSON.stringify(j.reasons)} ${j.stderr ?? ''}`);
  if (reason) assert.ok(codes(j).includes(reason), `expected reason ${reason}, got ${JSON.stringify(j.reasons)}`);
}

function led(root, kind, { task, epoch, data = {}, ce = 1 } = {}) {
  const f = at(root, 'run/ledger.jsonl');
  let prev = '0'.repeat(64);
  let seq = 0;
  if (fs.existsSync(f)) {
    const ls = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean);
    if (ls.length) {
      const last = JSON.parse(ls[ls.length - 1]);
      prev = last.hash;
      seq = last.seq;
    }
  }
  const line = { seq: seq + 1, prev, ts: '2026-11-17T09:00:00.000Z', ce, writer: 'test', writer_sha: sha('test'), kind, data };
  if (task !== undefined) line.task = task;
  if (epoch !== undefined) line.epoch = epoch;
  line.hash = sha(prev + canon(line));
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.appendFileSync(f, JSON.stringify(line) + '\n');
  return line.seq;
}
const ledgerLines = (root) => (has(root, 'run/ledger.jsonl') ? read(root, 'run/ledger.jsonl').toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const ofKind = (root, k) => ledgerLines(root).filter((l) => l.kind === k);
async function assertLedgerVerifies(root) {
  const L = await lib.readLedger(root);
  const v = await lib.verifyLedger(L.lines);
  assert.ok(v.ok, 'ledger must verify: ' + JSON.stringify(v));
}

const row = (task, o = {}) => ({
  task, field: 'f1', stage: 'research', role: 'child', steps: ['pack'], deps: [], question_ids: ['f1-a-01', 'f1-a-02'], e_task: 50000, tier: 'sonnet',
  state: 'planned', step: 'none', epoch: 0, reason: null, session: null, restarts: 0, handovers: 0, parks: 0, limit: false, fails: [], attempts: [], commits: {}, updated_rev: 1, ...o,
});
const att = (task, e, o = {}) => ({ epoch: e, folder: `wt/${task}-e${e}`, stop: 'none', ...o });
const table = (root, rows, rev = 1) => putJ(root, 'run/tasks.json', { schema_version: 1, rev, tasks: rows });
const getTable = (root) => readJ(root, 'run/tasks.json');
const getRow = (root, task = T) => getTable(root).tasks.find((r) => r.task === task);
const attemptOf = (r, e) => r.attempts.find((a) => a.epoch === e);
const folderAbs = (root, task, e) => path.join(root, 'wt', `${task}-e${e}`);

// a row fenced at epoch 2 (attempt 1 is the target); `a1` overrides the target attempt
const fencedRow = (o = {}, a1 = {}) =>
  row(T, {
    state: 'active', step: 'fenced', epoch: 2, reason: 'stall', restarts: 1, fails: [{ epoch: 1, class: 'stall', host: false, tick: 3 }],
    attempts: [att(T, 1, { session: SID1, boot: 'BOOT-A', manifest: M0, settings_sha: Z64, cut: { files: {}, ledger_seq: 1 }, spend_at_fence: 1000, ...a1 }), att(T, 2)], ...o,
  });
const noSession = (o = {}) => {
  const r = fencedRow(o);
  delete r.attempts[0].session;
  return r;
};
// review U1-F5: a target attempt that was never admitted (no manifest, no boot, no session)
const neverAdmitted = (o = {}) => {
  const r = noSession(o);
  for (const k of ['manifest', 'settings_sha', 'boot']) delete r.attempts[0][k];
  return r;
};
const reqRow = (o = {}, a1 = {}) => fencedRow({ step: 'stop-requested', ...o }, { stop: 'requested', ...a1 });

function setThr(root, patch) {
  const f = at(root, 'tcb/thresholds.json');
  const t = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : JSON.parse(fs.readFileSync(path.join(HERE, '..', 'thresholds.json'), 'utf8'));
  for (const [k, v] of Object.entries(patch)) t.params[k] = { ...(t.params[k] ?? { unit: 'test', source: 'guess', gate: false }), value: v };
  putJ(root, 'tcb/thresholds.json', t);
}
const setTicks = (root, n) => putJ(root, 'run/watcher.json', { schema_version: 1, ce: 1, pid: 1, start_time: 'x', ticks_total: n, last_tick_at: NOW, active: {}, pending: [], tasks: {} });
const u = (i, cr, cw, o) => ({ input: i, cache_read: cr, cache_write: cw, output: o, input_tokens: i, cache_read_input_tokens: cr, cache_creation_input_tokens: cw, output_tokens: o });
function fakeT(root, sid, cwd, usages, rel = `proj/${sid}.jsonl`) {
  const f = path.join(root, 'transcripts', ...rel.split('/'));
  fs.mkdirSync(path.dirname(f), { recursive: true });
  helpers.fakeTranscript(f, { sessionId: sid, cwd, calls: usages.map((usage) => ({ usage, tools: [] })) });
  return f;
}
const MAIN_REL = `proj/${SID1}.jsonl`;
const MAIN_USAGE = [u(600, 200, 100, 100)]; // total 1000 = spend_at_fence

// a verify setup: stop-requested row, main transcript at the fence-time spend, ticks at 10
function verifyWorld(o = {}) {
  const w = mk();
  table(w.root, [o.row ?? reqRow()]);
  const main = fakeT(w.root, SID1, folderAbs(w.root, T, 1), MAIN_USAGE);
  setTicks(w.root, 10);
  return { ...w, main };
}
const sampling = (root) => expectExit(run(root, 'verify'), 6, 'sampling');
// sample, raise the ticks by stop_verify_deltas (2), compare
function sampleThenCompare(root, ticks = 10) {
  setTicks(root, ticks);
  sampling(root);
  setTicks(root, ticks + 2);
  return run(root, 'verify');
}

// ================================================================ request
test('T1 request on a fenced row whose attempt has a session: stop-requested, one stop-request line; a repeat writes nothing', async (t) => {
  const w = mk();
  t.after(w.cleanup);
  const { root } = w;
  table(root, [fencedRow()]);
  const j = run(root, 'request');
  expectExit(j, 0);
  assert.equal(j.mode, 'request');
  const r = getRow(root);
  assert.equal(r.step, 'stop-requested');
  assert.equal(attemptOf(r, 1).stop, 'requested');
  const l = ofKind(root, 'stop-request');
  assert.equal(l.length, 1);
  assert.equal(l[0].data.session, SID1);
  await assertLedgerVerifies(root);
  const h = treeHash(root);
  const j2 = run(root, 'request');
  expectExit(j2, 0);
  assert.equal(treeHash(root), h, 'a repeat changes nothing');
  assert.equal(ofKind(root, 'stop-request').length, 1);
});

test('T2 request on a fenced row whose attempt was never admitted (no manifest, no session, no transcript): stopped, confirmed, state active', async (t) => {
  const w = mk();
  t.after(w.cleanup);
  const { root } = w;
  table(root, [neverAdmitted()]);
  const j = run(root, 'request');
  expectExit(j, 0);
  const r = getRow(root);
  assert.equal(r.step, 'stopped');
  assert.equal(attemptOf(r, 1).stop, 'confirmed');
  assert.equal(r.state, 'active');
  const l = ofKind(root, 'stop');
  assert.equal(l.length, 1);
  assert.equal(l[0].data.session, null);
  assert.equal(l[0].data.confirmed, true);
  assert.deepEqual(l[0].data.grew, []);
  assert.deepEqual(l[0].data.survivors, []);
  assert.equal(l[0].data.zombie_tokens, 0);
  await assertLedgerVerifies(root);
});

// Review U1-F5 (R9, R10): an admitted attempt may already run a session whose transcript is not
// visible yet, so its stop is never confirmed without observation over stop_verify_deltas ticks.
test('T2b request on a fenced row whose attempt was admitted but shows no session and no transcript: stop-requested (session null); verify confirms only after the deltas, and a live process naming the folder blocks it', { concurrency: false }, async (t) => {
  await t.test('nothing appears: sampling, then confirmed once the ticks have passed', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    table(root, [noSession({ reason: 'memory' })]);
    const j = run(root, 'request');
    expectExit(j, 0);
    let r = getRow(root);
    assert.equal(r.step, 'stop-requested', 'not confirmed without observation');
    assert.equal(attemptOf(r, 1).stop, 'requested');
    assert.equal(r.state, 'active');
    assert.equal(ofKind(root, 'stop').length, 0);
    const l = ofKind(root, 'stop-request');
    assert.equal(l.length, 1);
    assert.equal(l[0].data.session, null);
    expectExit(sampleThenCompare(root), 0);
    r = getRow(root);
    assert.equal(r.step, 'stopped');
    assert.equal(r.state, 'parked');
    assert.equal(attemptOf(r, 1).stop, 'confirmed');
    await assertLedgerVerifies(root);
  });
  await t.test('a process naming the attempt folder is a survivor: unconfirmed', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    table(root, [noSession({ reason: 'memory' })]);
    expectExit(run(root, 'request'), 0);
    fs.mkdirSync(folderAbs(root, T, 1), { recursive: true });
    const s = await helpers.spawnSleeper({ args: [folderAbs(root, T, 1)] });
    try {
      const j = sampleThenCompare(root);
      expectExit(j, 1, 'stop-unconfirmed');
      const r = getRow(root);
      assert.equal(r.step, 'stop-requested');
      assert.equal(attemptOf(r, 1).stop, 'unconfirmed');
      assert.ok(ofKind(root, 'stop')[0].data.survivors.some((p) => p.pid === s.pid));
    } finally {
      await s.kill();
    }
  });
});

test('T3 request on a fenced row with no session but a folder transcript: stop-requested with that session, row session untouched, verify samples it', { concurrency: false }, async (t) => {
  const w = mk();
  t.after(w.cleanup);
  const { root } = w;
  table(root, [noSession()]);
  const dirName = lib.projectDirName(folderAbs(root, T, 1));
  const rel = `${dirName}/${SID2}.jsonl`;
  fakeT(root, SID2, folderAbs(root, T, 1), [u(100, 0, 0, 10)], rel);
  expectExit(run(root, 'request'), 0);
  const r = getRow(root);
  assert.equal(r.step, 'stop-requested');
  assert.ok(!attemptOf(r, 1).session, 'attempts[].session is not written by stop');
  assert.equal(ofKind(root, 'stop-request')[0].data.session, SID2);
  setTicks(root, 10);
  expectExit(run(root, 'verify'), 6, 'sampling');
  const sample = readJ(root, SAMPLE);
  assert.ok(Object.keys(sample.sizes).includes(rel), `the sample covers the folder transcript: ${JSON.stringify(sample.sizes)}`);
});

test('T4 request on a row at step bound that is not committed -> exit 65, nothing written', async (t) => {
  const w = mk();
  t.after(w.cleanup);
  const { root } = w;
  table(root, [row(T, { state: 'active', step: 'bound', epoch: 1, reason: 'first', session: SID1, attempts: [att(T, 1, { session: SID1, bound_at: NOW, boot: 'BOOT-A', manifest: M0, settings_sha: Z64 })] })]);
  const h = treeHash(root);
  expectExit(run(root, 'request', { epoch: 1 }), 65);
  assert.equal(treeHash(root), h);
});

// ================================================================ verify
test('T5 verify twice: sample, wait, then confirm after stop_verify_deltas ticks without growth', { concurrency: false }, async (t) => {
  const w = verifyWorld();
  t.after(w.cleanup);
  const { root } = w;
  const tb = read(root, 'run/tasks.json');
  const a = run(root, 'verify');
  expectExit(a, 6, 'sampling');
  assert.equal(a.code, 'deferred');
  assert.ok(a.stderr.includes('[stop] sample-a'), a.stderr);
  const sample = readJ(root, SAMPLE);
  assert.equal(sample.tick, 10);
  assert.equal(sample.task, T);
  assert.ok(tb.equals(read(root, 'run/tasks.json')), 'sampling does not change the row');
  const h = treeHash(root);
  const b = run(root, 'verify');
  expectExit(b, 6, 'waiting');
  assert.equal(treeHash(root), h, 'waiting writes nothing');
  setTicks(root, 12);
  const c = run(root, 'verify');
  expectExit(c, 0);
  const r = getRow(root);
  assert.equal(r.step, 'stopped');
  assert.equal(attemptOf(r, 1).stop, 'confirmed');
  assert.equal(r.state, 'active');
  const l = ofKind(root, 'stop');
  assert.equal(l.length, 1);
  assert.equal(l[0].data.confirmed, true);
  assert.deepEqual(l[0].data.grew, []);
  assert.deepEqual(l[0].data.survivors, []);
  assert.equal(has(root, SAMPLE), false, 'the sample is removed');
  await assertLedgerVerifies(root);
  // a verify on a stopped row of this epoch is an idempotent success
  const h2 = treeHash(root);
  expectExit(run(root, 'verify'), 0);
  assert.equal(treeHash(root), h2);
});

test('T6 verify where the main transcript grows between the sampling and the comparing call: unconfirmed, then confirmed', { concurrency: false }, async (t) => {
  const w = verifyWorld();
  t.after(w.cleanup);
  const { root, main } = w;
  setTicks(root, 10);
  sampling(root);
  fs.appendFileSync(main, JSON.stringify({ type: 'system', note: 'one more line' }) + '\n');
  setTicks(root, 12);
  const a = run(root, 'verify');
  expectExit(a, 1, 'stop-unconfirmed');
  const r = getRow(root);
  assert.equal(r.step, 'stop-requested', 'step unchanged');
  assert.equal(attemptOf(r, 1).stop, 'unconfirmed');
  const l = ofKind(root, 'stop');
  assert.equal(l.length, 1);
  assert.equal(l[0].data.confirmed, false);
  assert.deepEqual(l[0].data.grew, [MAIN_REL]);
  assert.equal(readJ(root, SAMPLE).tick, 12, 'the sample is replaced by the current sizes and tick');
  setTicks(root, 14);
  const b = run(root, 'verify');
  expectExit(b, 0);
  assert.equal(getRow(root).step, 'stopped');
  assert.equal(attemptOf(getRow(root), 1).stop, 'confirmed');
  await assertLedgerVerifies(root);
});

test('T7 a new helper transcript appearing between the two calls counts as growth', { concurrency: false }, async (t) => {
  const w = verifyWorld();
  t.after(w.cleanup);
  const { root } = w;
  setTicks(root, 10);
  sampling(root);
  const helperRel = `proj/${SID1}/subagents/agent-x.jsonl`;
  fakeT(root, SID1, folderAbs(root, T, 1), [u(10, 0, 0, 5)], helperRel);
  setTicks(root, 12);
  const a = run(root, 'verify');
  expectExit(a, 1, 'stop-unconfirmed');
  assert.ok(ofKind(root, 'stop')[0].data.grew.includes(helperRel), JSON.stringify(ofKind(root, 'stop')[0].data.grew));
});

test('T8 a process whose command line names the attempt folder is reported, never killed; wt/<task>-e10 is not the folder of e1', { concurrency: false }, async (t) => {
  await t.test('a sleeper naming the folder is a survivor and stays alive', async (t2) => {
    const w = verifyWorld();
    const { root } = w;
    const sl = helpers.spawnSleeper({ args: [folderAbs(root, T, 1)] });
    t2.after(() => {
      sl.kill();
      return w.cleanup();
    });
    const j = sampleThenCompare(root);
    expectExit(j, 1, 'stop-unconfirmed');
    assert.ok(codes(j).includes('survivors'), JSON.stringify(j.reasons));
    const l = ofKind(root, 'stop')[0];
    assert.equal(l.data.confirmed, false);
    assert.ok(l.data.survivors.some((s) => s.pid === sl.pid), JSON.stringify(l.data.survivors));
    for (const s of l.data.survivors) {
      assert.equal(typeof s.pid, 'number');
      assert.equal(typeof s.start_time, 'string');
      assert.equal(typeof s.name, 'string');
    }
    assert.doesNotThrow(() => process.kill(sl.pid, 0), 'the sleeper is still alive');
    assert.equal(attemptOf(getRow(root), 1).stop, 'unconfirmed');
  });
  await t.test('a sleeper naming wt/<task>-e10 is not a survivor of e1', async (t2) => {
    const w = verifyWorld();
    const { root } = w;
    const sl = helpers.spawnSleeper({ args: [folderAbs(root, T, 10)] });
    t2.after(() => {
      sl.kill();
      return w.cleanup();
    });
    const j = sampleThenCompare(root);
    expectExit(j, 0);
    assert.deepEqual(ofKind(root, 'stop')[0].data.survivors, []);
  });
});

test('T9 zombie spend: growth after the fence is counted, and over Z_frac x e_task it is flagged', { concurrency: false }, async (t) => {
  const grow = (root) => fakeT(root, SID1, folderAbs(root, T, 1), [u(600, 200, 100, 100), u(300, 200, 0, 100)]); // 1000 + 600
  await t.test('e_task 5000, Z_frac 0.1: 600 > 500 -> zombie-over-z', async (t2) => {
    const w = verifyWorld({ row: reqRow({ e_task: 5000 }) });
    t2.after(w.cleanup);
    const { root } = w;
    setTicks(root, 10);
    sampling(root);
    grow(root);
    setTicks(root, 12);
    const j = run(root, 'verify');
    expectExit(j, 1, 'stop-unconfirmed');
    assert.ok(codes(j).includes('zombie-over-z'), JSON.stringify(j.reasons));
    assert.equal(ofKind(root, 'stop')[0].data.zombie_tokens, 600);
  });
  await t.test('e_task 50000: 600 is under Z, so no zombie-over-z', async (t2) => {
    const w = verifyWorld({ row: reqRow({ e_task: 50000 }) });
    t2.after(w.cleanup);
    const { root } = w;
    setTicks(root, 10);
    sampling(root);
    grow(root);
    setTicks(root, 12);
    const j = run(root, 'verify');
    expectExit(j, 1, 'stop-unconfirmed');
    assert.ok(!codes(j).includes('zombie-over-z'));
    assert.equal(ofKind(root, 'stop')[0].data.zombie_tokens, 600);
  });
});

test('T10 a confirmed stop sets the disposition: limit -> failed, memory -> parked, drop -> dropped, handover -> active', async (t) => {
  const cases = [
    ['limit true -> failed', { limit: true }, 'failed'],
    ['reason memory -> parked', { reason: 'memory' }, 'parked'],
    ['reason drop -> dropped', { reason: 'drop' }, 'dropped'],
    ['reason handover -> active', { reason: 'handover' }, 'active'],
  ];
  for (const [name, o, state] of cases) {
    await t.test(name, async (t2) => {
      const w = mk();
      t2.after(w.cleanup);
      table(w.root, [neverAdmitted(o)]);
      expectExit(run(w.root, 'request'), 0);
      const r = getRow(w.root);
      assert.equal(r.step, 'stopped');
      assert.equal(r.state, state);
      assert.equal(attemptOf(r, 1).stop, 'confirmed');
    });
  }
});

test('T11 a confirmed stop of a row fenced with reason cut: state cut and an overflow line of the uncovered ids and the row\'s tokens', { concurrency: false }, async (t) => {
  const w = verifyWorld({ row: reqRow({ reason: 'cut', question_ids: ['f1-a-01', 'f1-a-02', 'f1-a-03'] }) });
  t.after(w.cleanup);
  const { root } = w;
  // a stored, witnessed card of this task covers f1-a-02
  const card = { schema_version: 1, kind: 'card', field: 'f1', question_ids: ['f1-a-02'], route: 'keyword', source: { url: 'https://example.org/p', canonical_id: 'doi:10.0/x', primary_id: 'doi:10.0/x', evidence_type: 'controlled' }, quote: 'synthetic exact words', measured: { approach_id: 'ap_one', measure: 'm_one', value: 1, unit: 'u', baseline: 0, baseline_kind: 'control', better: 'higher', effect: 'improves' }, conditions: { task: [], model_family: [], language: [] }, what_measured: 'synthetic' };
  const bytes = canon(card);
  const id = 'c_' + sha(bytes).slice(0, 16);
  put(root, `store/objects/${id}.json`, bytes);
  led(root, 'intake', { task: T, epoch: 1, data: { objects: [{ id, kind: 'card', origin: 'session' }], rejected: [], flagged: [] } });
  put(root, 'store/status/card_status.jsonl', JSON.stringify({ seq: 1, card_id: id, card_sha: sha(bytes), status: 'witnessed', reason: 'ok', witness_seq: 1, at: NOW }) + '\n');
  const j = sampleThenCompare(root);
  expectExit(j, 0);
  const r = getRow(root);
  assert.equal(r.state, 'cut');
  assert.equal(r.step, 'stopped');
  const ov = ofKind(root, 'overflow');
  assert.equal(ov.length, 1);
  assert.deepEqual([...ov[0].data.ids].sort(), ['f1-a-01', 'f1-a-03']);
  assert.equal(ov[0].data.reason, 'cut');
  assert.equal(ov[0].data.tokens, 1000);
  await assertLedgerVerifies(root);
});

test('T12 verify with a stale --epoch is refused; a row fenced again between the two calls -> 65 and no stop line', { concurrency: false }, async (t) => {
  await t.test('--epoch differs from the row\'s -> 65', async (t2) => {
    const w = verifyWorld();
    t2.after(w.cleanup);
    const h = treeHash(w.root);
    expectExit(run(w.root, 'verify', { epoch: 3 }), 65);
    assert.equal(treeHash(w.root), h);
  });
  await t.test('the row is fenced again after the sampling call', async (t2) => {
    const w = verifyWorld();
    t2.after(w.cleanup);
    const { root } = w;
    setTicks(root, 10);
    sampling(root);
    const tb = getTable(root);
    const r = tb.tasks.find((x) => x.task === T);
    r.epoch = 3;
    r.step = 'fenced';
    r.reason = 'stall';
    r.attempts[0].stop = 'confirmed';
    r.attempts[1].stop = 'none';
    r.attempts.push(att(T, 3));
    tb.rev += 1;
    putJ(root, 'run/tasks.json', tb);
    setTicks(root, 12);
    expectExit(run(root, 'verify', { epoch: 2 }), 65);
    assert.equal(ofKind(root, 'stop').length, 0);
  });
});

test('T13 verify with a failing process list -> exit 2 proc-unavailable with an incident not-run line; no watcher.json -> exit 2 no-watcher', { concurrency: false }, async (t) => {
  await t.test('process list fails', async (t2) => {
    const w = verifyWorld();
    t2.after(w.cleanup);
    const { root } = w;
    setTicks(root, 10);
    sampling(root);
    setThr(root, { proc_exe: path.join(root, 'no-such-powershell.exe') });
    setTicks(root, 12);
    const tb = read(root, 'run/tasks.json');
    const j = run(root, 'verify');
    expectExit(j, 2, 'proc-unavailable');
    assert.ok(tb.equals(read(root, 'run/tasks.json')), 'row unchanged');
    const inc = ofKind(root, 'incident');
    assert.equal(inc.length, 1);
    assert.equal(inc[0].data.class, 'not-run');
  });
  await t.test('no watcher.json', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    table(root, [reqRow()]);
    fakeT(root, SID1, folderAbs(root, T, 1), MAIN_USAGE);
    const h = treeHash(root);
    expectExit(run(root, 'verify'), 2, 'no-watcher');
    assert.equal(treeHash(root), h, 'nothing written');
  });
});

test('T14 request and verify on a committed row at step bound: stopped, state stays committed, confirmed, no overflow, zombie_tokens 0', { concurrency: false }, async (t) => {
  const w = mk();
  t.after(w.cleanup);
  const { root } = w;
  table(root, [row(T, { state: 'committed', step: 'bound', epoch: 1, reason: 'first', session: SID1, commits: { pack: '1'.repeat(64) }, attempts: [att(T, 1, { session: SID1, bound_at: NOW, boot: 'BOOT-A', manifest: M0, settings_sha: Z64 })] })]);
  fakeT(root, SID1, folderAbs(root, T, 1), MAIN_USAGE);
  setTicks(root, 10);
  expectExit(run(root, 'request', { epoch: 1 }), 0);
  assert.equal(getRow(root).step, 'stop-requested');
  assert.equal(attemptOf(getRow(root), 1).stop, 'requested');
  expectExit(run(root, 'verify', { epoch: 1 }), 6, 'sampling');
  setTicks(root, 12);
  expectExit(run(root, 'verify', { epoch: 1 }), 0);
  const r = getRow(root);
  assert.equal(r.step, 'stopped');
  assert.equal(r.state, 'committed');
  assert.equal(attemptOf(r, 1).stop, 'confirmed');
  assert.equal(ofKind(root, 'overflow').length, 0);
  assert.equal(ofKind(root, 'stop')[0].data.zombie_tokens, 0);
  await assertLedgerVerifies(root);
});

test('T15 both modes: stale --ce -> 64, --dry-run writes nothing, corrupt tasks.json -> 67, busy run.lock -> 75', { concurrency: false }, async (t) => {
  await t.test('stale --ce writes nothing', async (t2) => {
    const w = verifyWorld({ row: fencedRow() });
    t2.after(w.cleanup);
    const h = treeHash(w.root);
    expectExit(run(w.root, 'request', { ce: 9 }), 64);
    expectExit(run(w.root, 'verify', { ce: 9 }), 64);
    assert.equal(treeHash(w.root), h);
  });
  await t.test('--dry-run: request gives its real exit and writes nothing', async (t2) => {
    const w = verifyWorld({ row: fencedRow() });
    t2.after(w.cleanup);
    const h = treeHash(w.root);
    const j = run(w.root, 'request', { dry: true });
    expectExit(j, 0);
    assert.equal(j.dry_run, true);
    assert.equal(treeHash(w.root), h);
    assert.equal(has(w.root, 'run/run.lock'), false);
  });
  await t.test('--dry-run: verify (which would sample) exits 6 and writes no sample', async (t2) => {
    const w = verifyWorld();
    t2.after(w.cleanup);
    const h = treeHash(w.root);
    const j = run(w.root, 'verify', { dry: true });
    expectExit(j, 6);
    assert.equal(j.dry_run, true);
    assert.equal(treeHash(w.root), h);
    assert.equal(has(w.root, SAMPLE), false);
  });
  await t.test('corrupt tasks.json -> 67 in both modes', async (t2) => {
    const w = verifyWorld({ row: fencedRow() });
    t2.after(w.cleanup);
    put(w.root, 'run/tasks.json', '{"schema_version":1,"rev":2,"tasks":[{"task":');
    const cur = read(w.root, 'run/tasks.json');
    expectExit(run(w.root, 'request'), 67);
    expectExit(run(w.root, 'verify'), 67);
    assert.ok(cur.equals(read(w.root, 'run/tasks.json')));
  });
  for (const [mode, build] of [['request', () => fencedRow()], ['verify', () => reqRow()]]) {
    await t.test(`busy run.lock -> 75 (${mode})`, async (t2) => {
      const w = verifyWorld({ row: build() });
      const sl = helpers.spawnSleeper();
      t2.after(() => {
        sl.kill();
        return w.cleanup();
      });
      const { root } = w;
      setThr(root, { lock_retries: 3 });
      putJ(root, 'run/run.lock', { pid: sl.pid, start_time: sl.start_time, nonce: 'f'.repeat(32), script: 'other.mjs', ce: 1, acquired_at: NOW });
      const lockBytes = read(root, 'run/run.lock');
      const tb = read(root, 'run/tasks.json');
      const j = run(root, mode);
      expectExit(j, 75);
      assert.deepEqual(j.ledger_seq, []);
      assert.ok(lockBytes.equals(read(root, 'run/run.lock')));
      assert.ok(tb.equals(read(root, 'run/tasks.json')));
    });
  }
});

// ================================================================ needs the app
test('NA1 the coordinator\'s stop ends a real session\'s turn and its helpers', { skip: 'needs the app: whether the coordinator\'s stop ends a real session and its helpers' }, () => {});
test('NA2 a real claude.exe command line names its folder or session id', { skip: 'needs the app: attemptProcesses on a real session (CONTRACT 7 item 4)' }, () => {});
test('NA3 transcript flush timing within stop_verify_deltas ticks', { skip: 'needs the app: real transcript flush timing' }, () => {});
