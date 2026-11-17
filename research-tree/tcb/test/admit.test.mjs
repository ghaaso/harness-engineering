// Tests of tcb/scripts/admit.mjs, written from spec/admit.mjs.md and CONTRACT.md only.
// `decide` tests call the exported pure function with literal facts; `check` tests run the script
// as a child process against their own temporary run root.
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
import { decide } from '../admit.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, '..', 'admit.mjs');

// ---------------------------------------------------------------- support
const NOW = '2026-11-17T10:00:00.000Z';
const SID1 = '11111111-1111-4111-8111-111111111111';
const SID2 = '22222222-2222-4222-8222-222222222222';
const RES = 'f1-research';
const SLUG = { 0: 'ok', 1: 'fail', 2: 'not-run', 3: 'tamper', 5: 'ready-wins', 6: 'deferred', 64: 'stale-ce', 65: 'stale-epoch', 66: 'usage', 67: 'table-corrupt', 70: 'internal', 75: 'lock-busy' };
const M0 = 'm_' + '0'.repeat(16);
const Z64 = '0'.repeat(64);

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
function canon(v) {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
const at = (root, rel) => path.join(root, ...rel.split('/'));
const has = (root, rel) => fs.existsSync(at(root, rel));
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

function parse(r) {
  const lines = r.stdout.split('\n').filter((s) => s.length);
  assert.equal(lines.length, 1, `stdout must be one line, got: ${r.stdout}\nstderr: ${r.stderr}`);
  const j = JSON.parse(lines[0]);
  assert.equal(j.script, 'admit');
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
// `check` is read-only: it takes no --ce and writes nothing.
function check(root, o = {}) {
  const a = ['check', '--root', root];
  if (o.task) a.push('--task', o.task);
  if (o.now !== null) a.push('--now', o.now ?? NOW);
  if (o.freeMb !== undefined) a.push('--free-mb', String(o.freeMb));
  const r = spawnSync(process.execPath, [SCRIPT, ...a], { encoding: 'utf8', cwd: root, windowsHide: true, timeout: 180000 });
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

const row = (task, o = {}) => ({
  task, field: 'f1', stage: 'research', role: 'child', steps: ['pack'], deps: [], question_ids: ['f1-a-01', 'f1-a-02'], e_task: 50000, tier: 'sonnet',
  state: 'planned', step: 'none', epoch: 0, reason: null, session: null, restarts: 0, handovers: 0, parks: 0, limit: false, fails: [], attempts: [], commits: {}, updated_rev: 1, ...o,
});
const att = (task, e, o = {}) => ({ epoch: e, folder: `wt/${task}-e${e}`, stop: 'none', ...o });
const table = (root, rows, rev = 1) => putJ(root, 'run/tasks.json', { schema_version: 1, rev, tasks: rows });
const stoppedRow = (task = RES, o = {}) => row(task, { state: 'active', step: 'stopped', epoch: 1, reason: 'first', attempts: [att(task, 1)], ...o });
const admittedRow = (task) => row(task, { state: 'active', step: 'admitted', epoch: 1, reason: 'first', attempts: [att(task, 1, { manifest: M0, settings_sha: Z64 })] });
const boundRow = (task, o = {}) => row(task, { state: 'active', step: 'bound', epoch: 1, reason: 'first', session: SID1, attempts: [att(task, 1, { session: SID1, bound_at: NOW, boot: 'BOOT-A', manifest: M0, settings_sha: Z64 })], ...o });

function setThr(root, patch) {
  const f = at(root, 'tcb/thresholds.json');
  const t = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : JSON.parse(fs.readFileSync(path.join(HERE, '..', 'thresholds.json'), 'utf8'));
  for (const [k, v] of Object.entries(patch)) t.params[k] = { ...(t.params[k] ?? { unit: 'test', source: 'guess', gate: false }), value: v };
  putJ(root, 'tcb/thresholds.json', t);
}
const u = (i, cr, cw, o) => ({ input: i, cache_read: cr, cache_write: cw, output: o, input_tokens: i, cache_read_input_tokens: cr, cache_creation_input_tokens: cw, output_tokens: o });
function fakeT(root, sid, cwd, usages, rel = `proj/${sid}.jsonl`) {
  const f = path.join(root, 'transcripts', ...rel.split('/'));
  fs.mkdirSync(path.dirname(f), { recursive: true });
  helpers.fakeTranscript(f, { sessionId: sid, cwd, calls: usages.map((usage) => ({ usage, tools: [] })) });
  return f;
}

// A run root every admission fact of which is in order (protocol, cut, gate, selftest, fsck).
const PROTOCOL = {
  schema_version: 1, kind: 'protocol', field: 'f1', question_ids: ['f1-a-01', 'f1-a-02'], criteria: { include: [{ code: 'i1', text: 'in' }], exclude: [{ code: 'x1', text: 'out' }] },
  routes: ['keyword'], card_schema_version: 1, certainty_method: 'plain', sesoi: { m_one: 0.1 }, outlist_vocab: { approaches: ['ap_one'], measures: ['m_one'], effects: ['improves'] },
  seeds: [], must_read: [], fixed_files: [], cross_field: [], approval: { quote: 'synthetic approval', at: '2026-11-01T00:00:00.000Z' },
};
const CUT_TEXT = 'Synthetic design cut, nothing real.\n';
const CUT_SHA = sha(CUT_TEXT);
function world(root) {
  const bytes = canon(PROTOCOL);
  const s = sha(bytes);
  const rel = `plan/frozen/protocol-f1-${s.slice(0, 12)}.json`;
  put(root, rel, bytes);
  led(root, 'protocol-freeze', { data: { name: 'protocol-f1', sha256: s, path: rel } });
  put(root, `completeness/cut-${CUT_SHA.slice(0, 12)}.md`, CUT_TEXT);
  led(root, 'cut', { data: { sha: CUT_SHA } });
  putJ(root, 'completeness/gate.json', { schema_version: 1, cut_sha: CUT_SHA, hazards_sha: null, matrix: { full: true, empty_cells: 0 }, p_ids_missing: [], high_uncovered: [], model: 'pass', action_lines: [], result: 'pass', reasons: [] });
}
async function seal(root) {
  const t = await lib.treeSha(path.join(root, 'tcb'));
  led(root, 'selftest', { data: { tcb_sha: t, result: 'pass', failed: [] } });
  led(root, 'fsck', { data: { result: 'pass', failing: [] } });
}
async function admissibleRoot(rows = [stoppedRow()]) {
  const w = mk();
  world(w.root);
  table(w.root, rows);
  await seal(w.root);
  return w;
}

// ---------------------------------------------------------------- facts for decide()
// The shape of `thresholds` in the facts is only sketched in the spec ("with isGate flags"): plain values,
// plus the gate flags offered as a function-with-properties (`isGate('B_tokens')` and `isGate.B_tokens`)
// and as the maps `gates` and `gate`. Kept in this one place.
function thr(over = {}, gates = {}) {
  const vals = { N_max: 2, N_ceiling: 3, peak_mb: 1200, reserve_mb: 1024, B_tokens: null, r_tokens: null, unverifiable_share_max: null, f5_given: false, ...over };
  const g = { B_tokens: false, r_tokens: false, unverifiable_share_max: false, ...gates };
  const isGate = Object.assign((n) => !!g[n], g);
  const t = { ...vals, isGate, gates: g, gate: g, get: (n) => vals[n] };
  for (const k of Object.keys(vals)) {
    t[`${k}_gate`] = !!g[k];
    t[`${k}_isGate`] = !!g[k];
  }
  return t;
}
const C = 'a'.repeat(64);
const T = 'b'.repeat(64);
function facts(over = {}) {
  const r = over.row ?? stoppedRow();
  return {
    row: r, rows: [r], spentOf: {}, thresholds: thr(), freeMb: 5000, slots: { live: 0, unknown: 0, unconfirmed: 0 }, pending: 0, halted: false, draining: false,
    protocol: { needed: true, frozen: true },
    gate: { needed: true, result: 'pass', cut_sha: C, hazards_sha: null, current_cut_sha: C, current_hazards_sha: null },
    selftest: { result: 'pass', tcb_sha: T, current_tcb_sha: T },
    fsck: { result: 'pass', seq: 10, last_write_seq: 5 },
    gateA: null,
    ...over,
  };
}
const dcodes = (d) => d.reasons.map((x) => x.code);
const reason = (d, code) => d.reasons.find((x) => x.code === code);
function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
}
const designRow = () => row('d-map', { field: null, stage: 'design-check', role: 'mapper', steps: ['hazards'], question_ids: [], state: 'active', step: 'stopped', epoch: 1, reason: 'first', attempts: [att('d-map', 1)] });
const noGate = { needed: false, result: null, cut_sha: null, hazards_sha: null, current_cut_sha: null, current_hazards_sha: null };

// ================================================================ decide (pure)
test('T1 decide: every condition met -> admit true, no reasons, the reservation lib computes', () => {
  const f = facts();
  const d = decide(f);
  assert.equal(d.admit, true);
  assert.deepEqual(d.reasons, []);
  assert.equal(d.reservation, lib.reservation(f.rows, () => 0).reservation);
});

test('T2 decide: two deps, one still active -> dep-not-committed names that dep only', () => {
  const d1 = row('f1-dep1', { state: 'committed', step: 'stopped', epoch: 1, attempts: [att('f1-dep1', 1, { stop: 'confirmed' })] });
  const d2 = row('f1-dep2', { state: 'active', step: 'bound', epoch: 1, attempts: [att('f1-dep2', 1, { session: SID2, manifest: M0, settings_sha: Z64 })] });
  const r = stoppedRow(RES, { deps: ['f1-dep1', 'f1-dep2'] });
  const d = decide(facts({ row: r, rows: [d1, d2, r] }));
  assert.equal(d.admit, false);
  assert.deepEqual(dcodes(d), ['dep-not-committed']);
  assert.deepEqual(reason(d, 'dep-not-committed').detail.deps, ['f1-dep2']);
});

test('T3 decide: no frozen protocol -> no-protocol; a design-check row (field null) is admitted', () => {
  const d = decide(facts({ protocol: { needed: true, frozen: false } }));
  assert.equal(d.admit, false);
  assert.deepEqual(dcodes(d), ['no-protocol']);
  assert.equal(reason(d, 'no-protocol').detail.field, 'f1');
  const dd = decide(facts({ row: designRow(), protocol: { needed: false, frozen: false }, gate: noGate }));
  assert.equal(dd.admit, true, JSON.stringify(dd.reasons));
});

test('T4 decide: gate fail, missing and stale each give their slug; a design-check row with no gate is admitted (R55)', () => {
  const g = (o) => ({ needed: true, result: 'pass', cut_sha: C, hazards_sha: null, current_cut_sha: C, current_hazards_sha: null, ...o });
  assert.deepEqual(dcodes(decide(facts({ gate: g({ result: 'fail' }) }))), ['gate-fail']);
  assert.deepEqual(dcodes(decide(facts({ gate: g({ result: null, cut_sha: null, hazards_sha: null }) }))), ['gate-missing']);
  assert.deepEqual(dcodes(decide(facts({ gate: g({ cut_sha: 'c'.repeat(64) }) }))), ['gate-stale']);
  assert.deepEqual(dcodes(decide(facts({ gate: g({ hazards_sha: 'd'.repeat(64) }) }))), ['gate-stale']);
  const dd = decide(facts({ row: designRow(), protocol: { needed: false, frozen: false }, gate: { ...noGate, result: null } }));
  assert.equal(dd.admit, true, JSON.stringify(dd.reasons));
});

test('T5 decide: a stale selftest or fsck is refused; missing and failing ones have their slugs', () => {
  assert.deepEqual(dcodes(decide(facts({ selftest: { result: 'pass', tcb_sha: 'e'.repeat(64), current_tcb_sha: T } }))), ['selftest-stale']);
  assert.deepEqual(dcodes(decide(facts({ fsck: { result: 'pass', seq: 3, last_write_seq: 5 } }))), ['fsck-stale']);
  assert.deepEqual(dcodes(decide(facts({ selftest: null }))), ['selftest-missing']);
  assert.deepEqual(dcodes(decide(facts({ selftest: { result: 'fail', tcb_sha: T, current_tcb_sha: T } }))), ['selftest-fail']);
  assert.deepEqual(dcodes(decide(facts({ fsck: null }))), ['fsck-missing']);
  assert.deepEqual(dcodes(decide(facts({ fsck: { result: 'fail', seq: 10, last_write_seq: 5 } }))), ['fsck-fail']);
});

test('T6 decide: slots over N_max, unknown slots, and N_max above the ceiling', () => {
  const full = decide(facts({ slots: { live: 1, unknown: 0, unconfirmed: 1 } }));
  assert.deepEqual(dcodes(full), ['slots-full']);
  assert.deepEqual({ ...reason(full, 'slots-full').detail }, { live: 1, unknown: 0, unconfirmed: 1, N_max: 2 });
  assert.equal(decide(facts({ slots: { live: 1, unknown: 0, unconfirmed: 0 } })).admit, true);
  assert.deepEqual(dcodes(decide(facts({ slots: null }))), ['slots-unknown']);
  const ceil = decide(facts({ thresholds: thr({ N_max: 4, N_ceiling: 3 }) }));
  assert.deepEqual(dcodes(ceil), ['ceiling']);
  assert.equal(reason(ceil, 'ceiling').detail.N_max, 4);
  assert.equal(reason(ceil, 'ceiling').detail.N_ceiling, 3);
});

test('T7 decide: memory = free - reserve - peak x pending must reach peak', () => {
  const m = decide(facts({ freeMb: 2000 }));
  assert.deepEqual(dcodes(m), ['memory']);
  assert.deepEqual({ ...reason(m, 'memory').detail }, { free_mb: 2000, reserve_mb: 1024, peak_mb: 1200, pending: 0 });
  assert.equal(decide(facts({ freeMb: 2300 })).admit, true);
  const p = decide(facts({ freeMb: 2300, pending: 1 }));
  assert.deepEqual(dcodes(p), ['memory']);
  assert.equal(reason(p, 'memory').detail.pending, 1);
});

test('T8 decide: the budget check refuses over B, is a reading when B is null or not a gate, and always returns the reservation', () => {
  const done = row('f1-done', { state: 'committed', step: 'stopped', epoch: 1, e_task: 4000, attempts: [att('f1-done', 1, { stop: 'confirmed' })] });
  const bound = boundRow('f1-bound', { e_task: 5000 });
  const spentOf = { 'f1-done:1': 3000, 'f1-bound:1': 1000, 'f1-research:1': 0 };
  const mine = (e) => stoppedRow(RES, { e_task: e });
  const gates = { B_tokens: true, r_tokens: true };
  const f = (e, B, g = gates) => facts({ row: mine(e), rows: [done, bound, mine(e)], spentOf, thresholds: thr({ B_tokens: B, r_tokens: 0 }, g) });
  const over = decide(f(2500, 10000));
  assert.equal(over.admit, false);
  assert.deepEqual(dcodes(over), ['budget']);
  assert.equal(over.reservation, 8000, 'reservation = 3000 + 1000 spent + 4000 open');
  assert.deepEqual({ ...reason(over, 'budget').detail }, { B: 10000, reservation: 8000, r: 0, e_task: 2500 });
  const ok = decide(f(2000, 10500));
  assert.equal(ok.admit, true, JSON.stringify(ok.reasons));
  assert.equal(ok.reservation, 8000);
  const nul = decide(f(2000, null));
  assert.equal(nul.admit, true, 'B null is a reading (R45)');
  assert.equal(nul.reservation, 8000);
  const reading = decide(f(99999, 10000, { B_tokens: false, r_tokens: false }));
  assert.equal(reading.admit, true, 'a value that is not a gate is a reading');
  assert.equal(reading.reservation, 8000);
});

test('T9 decide: halted, draining and memory are all listed together, not only the first', () => {
  const d = decide(facts({ halted: true, draining: true, freeMb: 100 }));
  assert.equal(d.admit, false);
  assert.deepEqual(dcodes(d).sort(), ['draining', 'halted', 'memory']);
});

test('T10 decide gate A: an approved id neither covered nor listed as not covered is refused (review stages only)', async (t) => {
  const rev = (o = {}) => stoppedRow('f1-review-r1', { stage: 'review', role: 'child-reviewing', steps: ['pack', 'review'], ...o });
  await t.test('an uncovered id -> gate-a-uncovered with that id', () => {
    const r = rev();
    const d = decide(facts({ row: r, rows: [r], gateA: { needed: true, uncovered: ['f1-a-01'], unverifiable_share: null } }));
    assert.equal(d.admit, false);
    assert.deepEqual(dcodes(d), ['gate-a-uncovered']);
    assert.deepEqual(reason(d, 'gate-a-uncovered').detail.ids, ['f1-a-01']);
  });
  await t.test('nothing uncovered (an id covered by a committed card while F5 is not given) -> admitted', () => {
    const r = rev();
    const d = decide(facts({ row: r, rows: [r], thresholds: thr({ f5_given: false }), gateA: { needed: true, uncovered: [], unverifiable_share: null } }));
    assert.equal(d.admit, true, JSON.stringify(d.reasons));
  });
  await t.test('unverifiable share above a gated maximum, F5 given -> gate-a-unverifiable; F5 not given -> a reading only', () => {
    const r = rev();
    const g = (f5) => facts({ row: r, rows: [r], thresholds: thr({ unverifiable_share_max: 0.2, f5_given: f5 }, { unverifiable_share_max: true }), gateA: { needed: true, uncovered: [], unverifiable_share: 0.5 } });
    const bad = decide(g(true));
    assert.deepEqual(dcodes(bad), ['gate-a-unverifiable']);
    assert.equal(reason(bad, 'gate-a-unverifiable').detail.share, 0.5);
    assert.equal(reason(bad, 'gate-a-unverifiable').detail.max, 0.2);
    assert.equal(decide(g(false)).admit, true);
  });
});

test('T11 decide is pure: the same facts give deep-equal output twice and the facts are not changed', () => {
  const f = deepFreeze(facts({ freeMb: 100, halted: true }));
  const before = JSON.stringify(f);
  const a = decide(f);
  const b = decide(f);
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(f), before);
});

// ================================================================ check (script)
test('T12 check --task on an admissible root: exit 0, admit true, nothing written, no lock', { concurrency: false }, async (t) => {
  const w = await admissibleRoot();
  t.after(w.cleanup);
  const { root } = w;
  const h = treeHash(root);
  const j = check(root, { task: RES, freeMb: 99999 });
  expectExit(j, 0);
  assert.equal(j.mode, 'check');
  assert.equal(j.result.decisions[0].admit, true, JSON.stringify(j.result.decisions[0].reasons));
  assert.equal(j.result.decisions[0].task, RES);
  assert.equal(treeHash(root), h, 'no file in the root changed');
  assert.equal(has(root, 'run/run.lock'), false);
});

test('T13 check --task with --free-mb 10: exit 6 deferred, first reason memory', { concurrency: false }, async (t) => {
  const w = await admissibleRoot();
  t.after(w.cleanup);
  const j = check(w.root, { task: RES, freeMb: 10 });
  expectExit(j, 6);
  assert.equal(j.code, 'deferred');
  assert.equal(j.reasons[0].code, 'memory');
  assert.equal(j.result.decisions[0].admit, false);
});

test('T13b check on a planned row -> wrong-state; check without --task does not list planned rows', { concurrency: false }, async (t) => {
  const w = await admissibleRoot([row('f1-planned'), stoppedRow(RES)]);
  t.after(w.cleanup);
  const one = check(w.root, { task: 'f1-planned', freeMb: 99999 });
  expectExit(one, 6, 'wrong-state');
  const all = check(w.root, { freeMb: 99999 });
  expectExit(all, 0);
  assert.deepEqual(all.result.decisions.map((d) => d.task), [RES]);
});

test('T14 check with a halt line followed by an owner resume: not halted', { concurrency: false }, async (t) => {
  await t.test('control: a halt line alone refuses', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    world(w.root);
    table(w.root, [stoppedRow()]);
    led(w.root, 'halt', { data: { reason: 'common-cause', fails: [] } });
    await seal(w.root);
    expectExit(check(w.root, { task: RES, freeMb: 99999 }), 6, 'halted');
  });
  await t.test('halt then owner resume admits', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    world(w.root);
    table(w.root, [stoppedRow()]);
    led(w.root, 'halt', { data: { reason: 'common-cause', fails: [] } });
    led(w.root, 'owner', { data: { act: 'resume', subject: 'run', quote: 'resume the run' } });
    await seal(w.root);
    const j = check(w.root, { task: RES, freeMb: 99999 });
    expectExit(j, 0);
    assert.equal(j.result.decisions[0].admit, true);
    assert.ok(!j.result.decisions[0].reasons.some((x) => x.code === 'halted'));
  });
});

test('T15 check with two rows whose attempts have stop unconfirmed and N_max 2: every candidate refused slots-full, exit 6', { concurrency: false }, async (t) => {
  const mkRow = (task) => stoppedRow(task, { epoch: 2, reason: 'stall', restarts: 1, fails: [{ epoch: 1, class: 'stall', host: false, tick: 3 }], attempts: [att(task, 1, { session: SID1, boot: 'BOOT-A', manifest: M0, settings_sha: Z64, stop: 'unconfirmed' }), att(task, 2)] });
  const w = await admissibleRoot([mkRow(RES), mkRow('f1-research-b')]);
  t.after(w.cleanup);
  const j = check(w.root, { freeMb: 99999 });
  expectExit(j, 6);
  assert.equal(j.result.decisions.length, 2);
  for (const d of j.result.decisions) {
    assert.equal(d.admit, false);
    assert.ok(d.reasons.some((x) => x.code === 'slots-full'), d.task);
  }
  assert.equal(j.result.slots.unconfirmed, 2);
});

test('T6b slotCount through check: two admitted rows with no process and no transcript count as unknown, so a third is refused slots-full', { concurrency: false }, async (t) => {
  const w = await admissibleRoot([admittedRow('f1-research-x'), admittedRow('f1-research-y'), stoppedRow('f1-research-z')]);
  t.after(w.cleanup);
  const j = check(w.root, { task: 'f1-research-z', freeMb: 99999 });
  expectExit(j, 6, 'slots-full');
  assert.equal(j.result.slots.unknown, 2);
  assert.equal(j.result.slots.live, 0);
  const sf = j.reasons.find((x) => x.code === 'slots-full');
  assert.equal(sf.detail.unknown, 2);
});

test('T6c (M4) the model trace: a zombie of a planned hand-over plus an admitted-not-started row fill N_max 2, so a third is refused', { concurrency: false }, async (t) => {
  const A = 'f1-research-x';
  const zombieThenAdmitted = row(A, {
    state: 'active', step: 'admitted', epoch: 2, reason: 'handover', handovers: 1,
    attempts: [att(A, 1, { session: SID1, boot: 'BOOT-A', manifest: M0, settings_sha: Z64, stop: 'unconfirmed' }), att(A, 2, { manifest: M0, settings_sha: Z64 })],
  });
  const w = await admissibleRoot([zombieThenAdmitted, stoppedRow('f1-research-z')]);
  t.after(w.cleanup);
  const j = check(w.root, { task: 'f1-research-z', freeMb: 99999 });
  // Counting live and unconfirmed only would give 1 < 2 and admit: three sessions once both start.
  expectExit(j, 6, 'slots-full');
  const sf = j.reasons.find((x) => x.code === 'slots-full');
  assert.equal(sf.detail.unconfirmed, 1, 'the zombie of attempt 1');
  assert.equal(sf.detail.unknown, 1, 'the admitted attempt 2 is a reservation');
});

test('T16 check: a bound attempt with a transcript but no matching process is counted unknown', { concurrency: false }, async (t) => {
  const w = await admissibleRoot([boundRow(RES), stoppedRow('f1-research-b')]);
  t.after(w.cleanup);
  fakeT(w.root, SID1, path.join(w.root, 'wt', `${RES}-e1`), [u(100, 0, 0, 10)]);
  const j = check(w.root, { task: 'f1-research-b', freeMb: 99999 });
  expectExit(j, 0);
  assert.equal(j.result.slots.unknown, 1);
  assert.equal(j.result.slots.live, 0);
  assert.equal(j.result.slots.unconfirmed, 0);
});

// U1-F1 (M4): gatherFacts counts an admitted-not-started row with no process as pending memory.
test('T16b (M4) check: an admitted row with no process reserves one peak of memory; without it the same --free-mb admits', { concurrency: false }, async (t) => {
  // free 2300 - reserve 1024 - peak 1200 x pending 1 = 76 < 1200 -> memory; pending 0 gives 1276 >= 1200.
  await t.test('with the admitted row: exit 6, memory with pending 1', async (t2) => {
    const w = await admissibleRoot([admittedRow('f1-research-x'), stoppedRow('f1-research-z')]);
    t2.after(w.cleanup);
    setThr(w.root, { reserve_mb: 1024, peak_mb: 1200, N_max: 2 });
    await seal(w.root);
    const j = check(w.root, { task: 'f1-research-z', freeMb: 2300 });
    expectExit(j, 6, 'memory');
    const m = j.reasons.find((x) => x.code === 'memory');
    assert.equal(m.detail.pending, 1);
    assert.ok(!codes(j).includes('slots-full'), JSON.stringify(j.reasons));
  });
  await t.test('control, no admitted row: admitted at the same --free-mb', async (t2) => {
    const w = await admissibleRoot([stoppedRow('f1-research-z')]);
    t2.after(w.cleanup);
    setThr(w.root, { reserve_mb: 1024, peak_mb: 1200, N_max: 2 });
    await seal(w.root);
    const j = check(w.root, { task: 'f1-research-z', freeMb: 2300 });
    expectExit(j, 0);
    assert.equal(j.result.decisions[0].admit, true, JSON.stringify(j.result.decisions[0].reasons));
  });
});

// U1-F2 (R44): gate A as read from the committed cards, card status and the latest pack (gateAFacts).
test('T10b check gate A from files: a committed card covers a, the pack lists b as not covered; F5 counts only witnessed cards', { concurrency: false }, async (t) => {
  const REV = 'f1-review-r1';
  const revRow = () => stoppedRow(REV, { stage: 'review', role: 'child-reviewing', steps: ['pack', 'review'] });
  const A = 'f1-a-01';
  const B = 'f1-a-02';
  const card = { kind: 'card', field: 'f1', question_ids: [A], claim: 'synthetic card' };
  let seq = 0;
  function commitRec(root, task, step, values) {
    const outputs = values.map((v) => {
      const p = lib.putObject(root, v);
      return { kind: v.kind, id: p.id, sha256: p.sha256 };
    });
    seq += 1;
    putJ(root, `store/commits/${task}-${step}-${seq}.json`, { schema_version: 1, task, epoch: 1, step, outputs });
    led(root, 'commit', { task, epoch: 1, data: { step } });
    return outputs;
  }
  async function rootWith({ pack = true, f5 = false, status = null } = {}) {
    const w = await admissibleRoot([revRow()]);
    const [c] = commitRec(w.root, 'f1-research', 'card', [card]);
    if (pack) commitRec(w.root, 'f1-research', 'pack', [{ kind: 'pack', field: 'f1', cards: [c.id], not_covered: [{ question_id: B, why: 'synthetic' }] }]);
    if (status) put(w.root, 'store/status/card_status.jsonl', JSON.stringify({ card_id: c.id, status, seq: 1 }) + '\n');
    setThr(w.root, { f5_given: f5 });
    await seal(w.root); // fsck newer than the commits, selftest over the patched tcb
    return w;
  }
  await t.test('F5 not given: the card (status pending) covers a, the pack covers b -> admitted', async (t2) => {
    const w = await rootWith();
    t2.after(w.cleanup);
    const j = check(w.root, { task: REV, freeMb: 99999 });
    expectExit(j, 0);
    assert.equal(j.result.decisions[0].admit, true, JSON.stringify(j.result.decisions[0].reasons));
  });
  await t.test('no pack -> gate-a-uncovered [b]', async (t2) => {
    const w = await rootWith({ pack: false });
    t2.after(w.cleanup);
    const j = check(w.root, { task: REV, freeMb: 99999 });
    expectExit(j, 6, 'gate-a-uncovered');
    assert.deepEqual(j.reasons.find((x) => x.code === 'gate-a-uncovered').detail.ids, [B]);
  });
  await t.test('F5 given, card still pending, no pack -> gate-a-uncovered [a, b]', async (t2) => {
    const w = await rootWith({ pack: false, f5: true });
    t2.after(w.cleanup);
    const j = check(w.root, { task: REV, freeMb: 99999 });
    expectExit(j, 6, 'gate-a-uncovered');
    assert.deepEqual(j.reasons.find((x) => x.code === 'gate-a-uncovered').detail.ids, [A, B]);
  });
  await t.test('F5 given, card witnessed, pack present -> admitted', async (t2) => {
    const w = await rootWith({ f5: true, status: 'witnessed' });
    t2.after(w.cleanup);
    const j = check(w.root, { task: REV, freeMb: 99999 });
    expectExit(j, 0);
  });
});

test('T17 check with a tasks.json row at step "running" -> exit 67', { concurrency: false }, async (t) => {
  const w = mk();
  t.after(w.cleanup);
  table(w.root, [stoppedRow(RES, { step: 'running' })]);
  const j = check(w.root, { task: RES, freeMb: 99999 });
  expectExit(j, 67);
  assert.equal(j.code, 'table-corrupt');
});

test('T18 check --task nosuch -> exit 1 no-task; --task Bad_Id -> exit 66', { concurrency: false }, async (t) => {
  const w = await admissibleRoot();
  t.after(w.cleanup);
  expectExit(check(w.root, { task: 'nosuch', freeMb: 99999 }), 1, 'no-task');
  const bad = check(w.root, { task: 'Bad_Id', freeMb: 99999 });
  expectExit(bad, 66);
  assert.equal(bad.code, 'usage');
});

test('T19 check with an unparseable gate.json: reason gate-missing and exit 2 for that task', { concurrency: false }, async (t) => {
  const w = await admissibleRoot();
  t.after(w.cleanup);
  put(w.root, 'completeness/gate.json', '{ this is not json');
  const j = check(w.root, { task: RES, freeMb: 99999 });
  expectExit(j, 2);
  assert.equal(j.code, 'not-run');
  const all = [...j.reasons, ...j.result.decisions.flatMap((d) => d.reasons)].map((x) => x.code);
  assert.ok(all.includes('gate-missing'), JSON.stringify(all));
});

test('T20 every check stdout is one line with mode check, dry_run false, ledger_seq []', { concurrency: false }, async (t) => {
  const w = await admissibleRoot();
  t.after(w.cleanup);
  const runs = [check(w.root, { task: RES, freeMb: 99999 }), check(w.root, { task: RES, freeMb: 10 }), check(w.root, { task: 'nosuch', freeMb: 99999 }), check(w.root, { freeMb: 99999 })];
  put(w.root, 'run/tasks.json', '{"broken"');
  runs.push(check(w.root, { task: RES, freeMb: 99999 }));
  assert.deepEqual(runs.map((j) => j.exit), [0, 6, 1, 0, 67]);
  for (const j of runs) {
    assert.equal(j.mode, 'check');
    assert.equal(j.dry_run, false);
    assert.deepEqual(j.ledger_seq, []);
  }
});

// ================================================================ needs the app
test('NA1 attemptProcesses finds a real session\'s processes so live counts real children', { skip: 'needs the app: a real claude.exe command line names its folder or session id (CONTRACT 7 item 4)' }, () => {});
test('NA2 peak_mb matches the memory a real session takes', { skip: 'needs the app: real memory peaks per session; peak_mb is a guess until measured' }, () => {});
