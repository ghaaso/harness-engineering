// Tests of tcb/lib.mjs, written from spec/lib.md and CONTRACT.md sections 3 and 4 only
// (the library's own source was not read). One test per numbered behaviour, named with its id.
// Run: node --test tcb/test/lib.test.mjs
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import cp from 'node:child_process';
import { spawnSync, spawn } from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { fileURLToPath } from 'node:url';
// Flat build layout: the library is tcb/lib.mjs, beside the scripts (not tcb/scripts/lib.mjs).
import * as lib from '../lib.mjs';

// ------------------------------------------------------------------ support
const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIB_URL = new URL('../lib.mjs', import.meta.url).href;

// CONTRACT 4.11 test helpers. tcb/test/helpers.mjs is used when it exists; until it is written,
// this stand-in (built from CONTRACT 4.11 and 4.8 only) takes its place so the library's tests run.
// T97 and T98 then exercise the stand-in; they must be rerun against helpers.mjs once it exists.
const HELPERS_FILE = path.join(HERE, 'helpers.mjs');
const HELPERS_IS_STANDIN = !fs.existsSync(HELPERS_FILE);
const helpers = HELPERS_IS_STANDIN ? standinHelpers() : await import(new URL('./helpers.mjs', import.meta.url).href);

function standinHelpers() {
  const TCB = path.resolve(HERE, '..');
  const TMPROOT = path.resolve(HERE, '..', '..', 'tmp');
  const PS_EXE = 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
  const DIRS = [
    'tcb', 'plan', 'plan/frozen', 'run', 'run/intents', 'run/audit', 'run/stop-sample', 'store', 'store/objects', 'store/commits',
    'store/status', 'views', 'queue', 'review-in', 'completeness', 'sealed', 'sealed/seeds', 'sealed/plants', 'sealed/heldout',
    'sealed/blind', '.snapshots', '.snapshots/raw', '.snapshots/text', '.snapshots/meta', '.snapshots/by-url', 'wt', 'transcripts',
  ];
  const BASE_TS = Date.parse('2026-11-17T10:00:00.000Z');
  const tsOf = (i) => new Date(BASE_TS + i * 1000).toISOString();

  async function makeRoot({ thresholds: thr, tasks = [], ce = 1 } = {}) {
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
    return { root, cleanup: async () => fs.rmSync(root, { recursive: true, force: true }) };
  }

  function runScript(name, args = [], { root } = {}) {
    const r = spawnSync(process.execPath, ['--max-old-space-size=1024', path.join(TCB, `${name}.mjs`), ...args, ...(root ? ['--root', root] : [])], {
      encoding: 'utf8', windowsHide: true,
    });
    let json = null;
    try { json = r.stdout && r.stdout.trim() ? JSON.parse(r.stdout) : null; } catch { json = null; }
    return { exit: r.status, json, stderr: r.stderr };
  }

  async function fakeTranscript(file, { sessionId, cwd, calls = [], structured } = {}) {
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
      const tools = c.tools || [];
      tools.forEach((tl, j) => blocks.push({ type: 'tool_use', id: `toolu_fake_${i}_${j}`, name: tl.name, input: tl.input ?? {} }));
      if (!blocks.length) blocks.push({ type: 'text', text: '' });
      const ts = tsOf(t++);
      for (const b of blocks) {
        recs.push({ ...base, type: 'assistant', timestamp: ts, uuid: `u-${n++}`, message: { id, model: 'claude-test', role: 'assistant', content: [b], usage } });
      }
      if (Array.isArray(c.results) && c.results.length) {
        const content = c.results.map((r, j) => {
          const o = typeof r === 'string' ? { text: r } : r || {};
          return { type: 'tool_result', tool_use_id: o.toolUseId ?? `toolu_fake_${i}_${j}`, is_error: o.isError === true, content: o.text ?? '' };
        });
        recs.push({ ...base, type: 'user', timestamp: tsOf(t++), uuid: `u-${n++}`, message: { role: 'user', content } });
      }
    });
    if (structured !== undefined) {
      recs.push({ ...base, type: 'attachment', timestamp: tsOf(t++), uuid: `u-${n++}`, attachment: { type: 'structured_output', data: structured } });
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, recs.map((r) => JSON.stringify(r)).join('\n') + '\n');
    return file;
  }

  async function spawnSleeper({ args = [] } = {}) {
    const child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)', ...args], { stdio: 'ignore', windowsHide: true });
    const exited = new Promise((res) => child.once('exit', res));
    let start_time = null;
    try {
      const out = cp.execFileSync(PS_EXE, ['-NoProfile', '-NonInteractive', '-Command',
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
      kill: async () => {
        if (!killed) {
          killed = true;
          try { child.kill(); } catch { /* gone */ }
        }
        if (child.exitCode === null && child.signalCode === null) await exited;
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

  return { makeRoot, runScript, fakeTranscript, spawnSleeper, fakeProc };
}
const FIX = path.join(HERE, '..', 'fixtures', 'lib');
const TMP = path.resolve(HERE, '..', '..', 'tmp');
const NOW = '2026-11-17T10:00:00.000Z';
const Z64 = '0'.repeat(64);
const SID = '11111111-1111-4111-8111-111111111111';
const SELF_START = '2026-11-17T09:00:00.0000000Z';
// This process's own start time as the library records it (own clock, computed once, no provider).
const OWN_START = () => lib.selfInfo(null).start_time;
const ISO7 =/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{7}Z$/;

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const P = (root, ...s) => path.join(root, ...s);
const rdj = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const wj = (f, v) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(v));
};
const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));
const asList = (x) => (Array.isArray(x) ? x : Object.values(x));
const countOf = (x) => (Array.isArray(x) ? x.length : x);
const norm = (p) => path.resolve(p).replace(/\\/g, '/').toLowerCase();

const TMPDIRS = [];
function tmpDir(prefix = 'lt-') {
  fs.mkdirSync(TMP, { recursive: true });
  const d = fs.mkdtempSync(path.join(TMP, prefix));
  TMPDIRS.push(d);
  return d;
}
after(() => {
  for (const d of TMPDIRS) {
    try {
      fs.rmSync(d, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
});

async function tcbErr(fn) {
  try {
    await fn();
  } catch (e) {
    return e;
  }
  return assert.fail('expected a TcbError but nothing was thrown');
}
async function throwsTcb(fn, code, exit) {
  const e = await tcbErr(fn);
  assert.equal(typeof e.code, 'string', `not a TcbError: ${e && e.stack}`);
  if (code !== undefined) assert.equal(e.code, code, `code was ${e.code} (${e.message})`);
  if (exit !== undefined) assert.equal(e.exit, exit, `exit was ${e.exit} (${e.code})`);
  return e;
}

// A fresh run root per test, removed afterwards.
function rt(name, fn, rootOpts = {}, testOpts = {}) {
  test(name, testOpts, async (t) => {
    const h = await helpers.makeRoot(rootOpts);
    try {
      await fn(h.root, t, h);
    } finally {
      try {
        await h.cleanup();
      } catch {
        /* best effort */
      }
    }
  });
}
// A plain temporary folder (no run root).
function dt(name, fn, testOpts = {}) {
  test(name, testOpts, async (t) => {
    await fn(tmpDir(), t);
  });
}

// Fake process provider; own process is always in the list.
function fproc(o = {}) {
  const calls = { list: 0, alive: [] };
  return {
    calls,
    list() {
      calls.list++;
      return [
        { pid: process.pid, ppid: 0, name: 'node.exe', exe: process.execPath, cmdline: 'node test', start_time: SELF_START },
        ...(o.extra || []),
      ];
    },
    alive(pid, st) {
      calls.alive.push([pid, st]);
      return o.alive ? o.alive(pid, st) : true;
    },
    boot() {
      return o.boot === undefined ? '2026-11-17T08:00:00.0000000Z' : o.boot;
    },
  };
}

// Locks and the ledger.
const lockFile = (root, name = 'run.lock') => P(root, 'run', name);
const lo = (o = {}) => ({ script: 'test', ce: 1, proc: fproc(), now: NOW, retries: 2, retryMs: 1, ...o });
const mkRec = (o = {}) => ({
  pid: 999001,
  start_time: '2020-01-01T00:00:00.0000000Z',
  nonce: crypto.randomBytes(16).toString('hex'),
  script: 'other',
  ce: 1,
  acquired_at: NOW,
  ...o,
});
const putLock = (root, rec, name = 'run.lock') => {
  wj(lockFile(root, name), rec);
  return rec;
};
const withLock = (root, fn, o = {}) =>
  lib.withRunLock(root, { script: 'test', proc: fproc(), now: NOW, retries: 50, retryMs: 5, ...o }, fn);
const CTX = () => ({ script: 'test', writerSha: '1'.repeat(64), ledgerSeq: [] });
const ap = (root, h, o = {}) =>
  lib.appendLedger(root, h, { ctx: CTX(), ce: 1, kind: 'plan', data: { added: [] }, now: NOW, ...o });
async function ledger(root) {
  return (await lib.readLedger(root)).lines;
}
const ledgerPath = (root) => P(root, 'run', 'ledger.jsonl');
async function appendMany(root, specs) {
  return withLock(root, async (h) => {
    const out = [];
    for (const s of specs) out.push(await ap(root, h, s));
    return out;
  });
}

// Task rows. A row's nullable fields are written as null, or left out when the schema wants that.
let STRIP_NULLS = null;
const att = (task, e, o = {}) => ({ epoch: e, folder: `C:/tcbtest/wt/${task}-e${e}`, stop: 'none', ...o });
function mkRow(o = {}) {
  return {
    task: 'f1-research',
    field: 'f1',
    stage: 'research',
    role: 'child',
    steps: ['pack'],
    deps: [],
    question_ids: ['f1-g-01', 'f1-g-02'],
    e_task: 1000,
    tier: 'sonnet',
    state: 'planned',
    step: 'none',
    epoch: 0,
    reason: null,
    session: null,
    restarts: 0,
    handovers: 0,
    parks: 0,
    limit: false,
    fails: [],
    attempts: [],
    commits: {},
    updated_rev: 0,
    ...o,
  };
}
const boundRow = (task = 'f1-research', o = {}) =>
  mkRow({
    task,
    state: 'active',
    step: 'bound',
    epoch: 1,
    reason: 'first',
    session: SID,
    attempts: [att(task, 1, { session: SID, bound_at: NOW, boot: 'BOOT-A' })],
    ...o,
  });
const stoppedRow = (task = 'f1-research', o = {}) =>
  mkRow({ task, state: 'active', step: 'stopped', epoch: 1, reason: 'first', attempts: [att(task, 1)], ...o });
const strip = (r, on) => {
  const c = { ...r };
  if (on) for (const k of ['reason', 'session']) if (c[k] === null) delete c[k];
  return c;
};
async function seedRows(root, rows) {
  const write = async (on) => {
    const cur = await lib.readTasks(root);
    await withLock(root, (h) =>
      lib.writeTasks(root, h, { schema_version: 1, rev: cur.rev, tasks: rows.map((r) => strip(r, on)) }, { expectRev: cur.rev }),
    );
  };
  if (STRIP_NULLS === null) {
    try {
      await write(false);
      STRIP_NULLS = false;
      return;
    } catch (e) {
      if (e.code !== 'schema-invalid') throw e;
    }
    await write(true);
    STRIP_NULLS = true;
    return;
  }
  await write(STRIP_NULLS);
}
const tasksFile = (root) => P(root, 'run', 'tasks.json');
async function rowOf(root, task = 'f1-research') {
  return (await lib.readTasks(root)).tasks.find((r) => r.task === task);
}
const fargs = (o = {}) => ({
  task: 'f1-research',
  expectEpoch: 1,
  reason: 'stall',
  host: false,
  tick: 7,
  readyCheck: () => false,
  cut: { files: {}, ledger_seq: 0 },
  spendAtFence: 0,
  R: 1,
  Hmax: 2,
  ...o,
});
const doFence = (root, o) => withLock(root, (h) => lib.fence(root, h, fargs(o)));

// Links (skipped where a machine will not make them).
function tryJunction(target, link) {
  try {
    fs.symlinkSync(target, link, 'junction');
    return true;
  } catch {
    return false;
  }
}
function trySymlink(target, link) {
  try {
    fs.symlinkSync(target, link, 'file');
    return true;
  } catch {
    return false;
  }
}
function tryHard(target, link) {
  try {
    fs.linkSync(target, link);
    return true;
  } catch {
    return false;
  }
}
function rmLink(p) {
  try {
    fs.unlinkSync(p);
  } catch {
    try {
      fs.rmdirSync(p);
    } catch {
      /* gone */
    }
  }
}

// Seam: replace a property of a built-in module for a while (the library calls fs through the module).
function patch(obj, name, make) {
  const orig = obj[name];
  obj[name] = make(orig);
  syncBuiltinESMExports();
  return () => {
    obj[name] = orig;
    syncBuiltinESMExports();
  };
}
const winErr = (code, syscall) =>
  Object.assign(new Error(`${code}: simulated sharing violation, ${syscall}`), { code, syscall, errno: -4048 });
// Fails the first `codes.length` calls (then every call when `forever`) whose arguments satisfy `match`.
function failing(name, match, codes, { forever = false } = {}) {
  const state = { matched: 0, failed: 0 };
  const restore = patch(fs, name, (orig) =>
    function (...args) {
      if (match(args)) {
        state.matched++;
        if (forever || state.failed < codes.length) {
          const code = codes[Math.min(state.failed, codes.length - 1)];
          state.failed++;
          throw winErr(code, name);
        }
      }
      return orig.apply(this, args);
    },
  );
  return { state, restore };
}
const argHas = (frag) => (args) => args.some((a) => typeof a === 'string' && a.replace(/\\/g, '/').toLowerCase().includes(frag.toLowerCase()));

// Transcripts: synthetic records in the harness shape (see CONTRACT 4.8).
const tsOf = (n) => new Date(Date.UTC(2026, 10, 17, 10, 0, 0) + n * 1000).toISOString();
const US = (input, output, cacheRead, cacheWrite) => ({
  input_tokens: input,
  cache_read_input_tokens: cacheRead,
  cache_creation_input_tokens: cacheWrite,
  output_tokens: output,
});
let UUID = 0;
const base = (type, o = {}) => ({
  type,
  uuid: `u-${++UUID}`,
  timestamp: o.ts || tsOf(UUID),
  sessionId: o.sid || SID,
  cwd: o.cwd === undefined ? 'C:\\tcbtest\\wt\\f1-research-e1' : o.cwd,
  isSidechain: !!o.side,
});
const asst = (id, block, usage, o = {}) => ({
  ...base('assistant', o),
  message: { id, type: 'message', role: 'assistant', model: o.model || 'claude-test', content: [block], usage },
});
const textB = (t) => ({ type: 'text', text: t });
const toolB = (id, name, input) => ({ type: 'tool_use', id, name, input });
const resultRec = (toolUseId, content, isError = false, o = {}) => ({
  ...base('user', o),
  message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUseId, content, is_error: isError }] },
});
const userRec = (text, o = {}) => ({ ...base('user', o), message: { role: 'user', content: text } });
const writeLines = (file, recs, tail = '') => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, recs.map((r) => (typeof r === 'string' ? r : JSON.stringify(r))).join('\n') + '\n' + tail);
};

// ================================================================== CLI and output (4.1)
test('T0 the exported constants carry the names the contract lists', () => {
  assert.equal(lib.EXIT.ok, 0);
  assert.equal(lib.EXIT['stale-ce'], 64);
  assert.equal(lib.EXIT['stale-epoch'], 65);
  assert.equal(lib.EXIT.usage, 66);
  assert.equal(lib.EXIT['table-corrupt'], 67);
  assert.equal(lib.EXIT['lock-busy'], 75);
  assert.equal(lib.EXIT.tamper, 3);
  assert.equal(lib.EXIT['not-run'], 2);
  assert.equal(lib.EXIT['ready-wins'], 5);
  assert.equal(lib.EXIT.deferred, 6);
  assert.equal(lib.EXIT.internal, 70);
  for (const s of ['planned', 'active', 'parked', 'committed', 'cut', 'failed', 'dropped']) assert.ok(asList(lib.STATES).includes(s), s);
  for (const s of ['none', 'fenced', 'stop-requested', 'stopped', 'admitted', 'started', 'bound']) assert.ok(asList(lib.STEPS).includes(s), s);
  for (const s of ['first', 'stall', 'hang', 'loop', 'crash', 'tainted', 'memory', 'handover', 'cut', 'drop']) assert.ok(asList(lib.REASONS).includes(s), s);
  for (const k of [
    'plan', 'fence', 'stop-request', 'stop', 'admit', 'bind', 'started', 'intake', 'commit', 'zombie-write', 'event', 'drain', 'halt',
    'overflow', 'check', 'witness', 'promote', 'audit', 'fsck', 'selftest', 'protocol-freeze', 'protocol-amend', 'plan-freeze',
    'seed-split', 'queue', 'certificate', 'cut', 'gate', 'unit-costs', 'coord-init', 'ce-raise', 'coord-bind', 'owner',
    'intent-open', 'intent-done', 'meter', 'lock-break', 'torn-tail', 'incident',
  ])
    assert.ok(asList(lib.LEDGER_KINDS).includes(k), `LEDGER_KINDS lacks ${k}`);
  const want = { card: 'c', pack: 'p', review: 'r', manifest: 'm', certificate: 'x', stpa: 'd', fmea: 'd', hazards: 'd' };
  for (const [k, v] of Object.entries(want)) assert.equal(lib.PREFIX[k], v, `PREFIX.${k}`);
});

// CONTRACT 1.1: --root is an absolute path (a relative one is a malformed value, 66).
const AROOT = path.resolve(TMP, 'R');
const ASPEC = {
  modes: ['start', 'stop'],
  flags: {
    root: { type: 'string', required: true },
    task: { type: 'string', required: ['start'] },
    epoch: { type: 'int' },
    'dry-run': { type: 'bool' },
    card: { type: 'list' },
  },
};
test('T1 parseArgs returns the mode and typed flags', async () => {
  const r = await lib.parseArgs(['start', '--root', AROOT, '--task', 'f1-research', '--epoch', '2', '--dry-run'], ASPEC);
  assert.equal(r.mode, 'start');
  assert.equal(r.flags.task, 'f1-research');
  assert.strictEqual(r.flags.epoch, 2);
  assert.strictEqual(r.flags['dry-run'], true);
});
test('T2 parseArgs refuses unknown flags, missing required flags, unknown modes, bad ints and DOS device names with usage 66', async () => {
  const bad = async (argv) => throwsTcb(() => lib.parseArgs(argv, ASPEC), 'usage', 66);
  await bad(['start', '--root', AROOT, '--task', 'f1-research', '--bogus', 'x']);
  await bad(['start', '--task', 'f1-research']); // --root missing
  await bad(['start', '--root', AROOT]); // --task required in start
  await bad(['frobnicate', '--root', AROOT]);
  await bad(['stop', '--root', 'R']); // 1.1: --root must be absolute
  await bad(['start', '--root', AROOT, '--task', 'f1-research', '--epoch', 'two']);
  // a flag required only in another mode is not required here
  const ok = await lib.parseArgs(['stop', '--root', AROOT], ASPEC);
  assert.equal(ok.mode, 'stop');
  // 1.5: DOS device names are not tasks
  for (const t of ['nul', 'com1', 'con', 'prn', 'aux', 'lpt9']) await bad(['start', '--root', AROOT, '--task', t]);
  // CONTRACT 1.5's task pattern only refuses a device name that is the whole name (or followed by a dot);
  // the spec's "con-research" example is accepted by that pattern, so the contract is followed here.
  const ok2 = await lib.parseArgs(['start', '--root', AROOT, '--task', 'con-research'], ASPEC);
  assert.equal(ok2.flags.task, 'con-research');
});
test('T3 a repeated list flag gives an array in order', async () => {
  const r = await lib.parseArgs(['start', '--root', AROOT, '--task', 'f1-research', '--card', 'a', '--card', 'b'], ASPEC);
  assert.deepEqual(r.flags.card, ['a', 'b']);
  const one = await lib.parseArgs(['start', '--root', AROOT, '--task', 'f1-research', '--card', 'a'], ASPEC);
  assert.deepEqual(one.flags.card, ['a']);
});

// runMain scripts run as child processes, from a copy of the script text written into the test's own root.
function runDemo(root, body, { under = 'tcb/scripts', args = [] } = {}) {
  const dir = P(root, ...under.split('/'));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'demo.mjs');
  fs.writeFileSync(
    file,
    `import * as lib from ${JSON.stringify(LIB_URL)};\nlib.runMain(import.meta.url, 'demo', async (ctx) => { ${body} });\n`,
  );
  const r = spawnSync(process.execPath, [file, '--root', root, ...args], { encoding: 'utf8' });
  const lines = r.stdout.split('\n').filter((l) => l.length);
  return { code: r.status, out: r.stdout, lines, json: lines.length ? JSON.parse(lines[lines.length - 1]) : null, err: r.stderr };
}
rt('T4 runMain prints exactly one JSON line with every 1.3 key and exits with the returned code', (root) => {
  const r = runDemo(root, `ctx.ledgerSeq.push(7); return { exit: 1, result: { a: 1 }, reasons: [{ code: 'nope', detail: null }] };`);
  assert.equal(r.code, 1);
  assert.equal(r.lines.length, 1, `stdout was ${JSON.stringify(r.out)}`);
  assert.ok(r.out.endsWith('\n'));
  for (const k of ['ok', 'script', 'mode', 'exit', 'code', 'dry_run', 'result', 'reasons', 'ledger_seq']) assert.ok(k in r.json, `key ${k}`);
  assert.equal(r.json.ok, false);
  assert.equal(r.json.script, 'demo');
  assert.equal(r.json.exit, 1);
  assert.equal(r.json.code, 'fail');
  assert.deepEqual(r.json.result, { a: 1 });
  assert.equal(r.json.reasons[0].code, 'nope');
  assert.deepEqual(r.json.ledger_seq, [7]);
  const ok = runDemo(root, `return { result: { fine: true } };`);
  assert.equal(ok.code, 0);
  assert.equal(ok.json.ok, true);
  assert.equal(ok.json.code, 'ok');
  assert.equal(ok.lines.length, 1);
});
rt('T5 runMain maps a thrown TcbError, a returned deferral and a plain Error to the 1.4 table', (root) => {
  const imp = `const { TcbError } = lib;`;
  const a = runDemo(root, `${imp} throw new TcbError('stale-ce', 64, { want: 2 });`);
  assert.equal(a.code, 64);
  assert.equal(a.json.ok, false);
  assert.equal(a.json.exit, 64);
  assert.equal(a.json.code, 'stale-ce');
  assert.equal(a.json.reasons[0].code, 'stale-ce');
  assert.deepEqual(a.json.reasons[0].detail, { want: 2 });
  const b = runDemo(root, `${imp} throw new TcbError('no-ready', 2);`);
  assert.equal(b.code, 2);
  assert.equal(b.json.code, 'not-run');
  assert.equal(b.json.reasons[0].code, 'no-ready');
  const c = runDemo(root, `return { exit: 6, reasons: [{ code: 'memory' }] };`);
  assert.equal(c.code, 6);
  assert.equal(c.json.code, 'deferred');
  assert.equal(c.json.reasons[0].code, 'memory');
  const d = runDemo(root, `throw new Error('boom-marker');`);
  assert.equal(d.code, 70);
  assert.equal(d.json.exit, 70);
  assert.equal(d.json.code, 'internal');
  assert.equal(d.json.ok, false);
  assert.ok(d.err.includes('boom-marker'), 'stderr carries the message');
  assert.equal(d.lines.length, 1);
});
rt('T6 runMain refuses a script file that lies under <root>/wt/ with exit 3 run-from-attempt', (root) => {
  const r = runDemo(root, `return { result: { ran: true } };`, { under: 'wt/f1-research-e1' });
  assert.equal(r.code, 3);
  assert.equal(r.json.exit, 3);
  assert.equal(r.json.code, 'tamper');
  assert.equal(r.json.reasons[0].code, 'run-from-attempt');
  assert.notEqual(r.json.result && r.json.result.ran, true);
});
test('T7 edgeFacts uses --now, --free-mb and --boot when given, and the real values only then', async () => {
  const given = await lib.edgeFacts({ now: NOW, 'free-mb': 512, freeMb: 512, boot: 'BOOT-X' }, fproc({ boot: 'BOOT-Y' }));
  assert.equal(given.now, NOW);
  assert.equal(given.freeMb, 512);
  assert.equal(given.boot, 'BOOT-X');
  const real = await lib.edgeFacts({}, fproc({ boot: 'BOOT-Y' }));
  assert.ok(!Number.isNaN(Date.parse(real.now)));
  assert.ok(Math.abs(Date.parse(real.now) - Date.now()) < 60000);
  const osMb = os.freemem() / 1048576;
  assert.ok(Math.abs(real.freeMb - osMb) < Math.max(1024, osMb * 0.5), `freeMb ${real.freeMb} vs os ${osMb}`);
  assert.equal(real.boot, 'BOOT-Y');
  assert.equal((await lib.edgeFacts({}, null)).boot, null);
  assert.equal((await lib.edgeFacts({})).boot, null);
  assert.equal((await lib.edgeFacts({}, fproc({ boot: null }))).boot, null);
  const throwing = { list: () => [], alive: () => true, boot: () => { throw new Error('powershell failed'); } };
  assert.equal((await lib.edgeFacts({}, throwing)).boot, null);
});
rt('T7b recordIncident with the tamper form appends one incident line; thresholds(root).line(name) gives the line or null', async (root) => {
  await withLock(root, async (h) => {
    const ctx = CTX();
    await lib.recordIncident(root, h, { ctx, ce: 1, cls: 'refusal', detail: { tamper: true, script: 'commit', code: 'object-mismatch' }, now: NOW });
    assert.equal(ctx.ledgerSeq.length, 1);
  });
  const lines = await ledger(root);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].kind, 'incident');
  assert.equal(lines[0].data.class, 'refusal');
  assert.deepEqual(lines[0].data.detail, { tamper: true, script: 'commit', code: 'object-mismatch' });
  wj(P(root, 'tcb', 'thresholds.json'), {
    schema_version: 1,
    params: {
      unverifiable_share_max: { value: null, unit: 'share', source: 'owner', gate: true, line: { measure: 'unverifiable_share', op: 'max' } },
      R: { value: 1, unit: 'count', source: 'guess', gate: true },
    },
  });
  const th = await lib.thresholds(root);
  assert.deepEqual(th.line('unverifiable_share_max'), { measure: 'unverifiable_share', op: 'max' });
  assert.equal(th.line('R'), null);
});
rt('T8 thresholds get returns the value, an absent name is param-missing 2, isGate is false for a null value or gate false', async (root) => {
  wj(P(root, 'tcb', 'thresholds.json'), {
    schema_version: 1,
    params: {
      R: { value: 1, unit: 'count', source: 'guess', gate: true },
      B_tokens: { value: null, unit: 'tokens', source: 'owner', gate: true },
      reading: { value: 5, unit: 'x', source: 'guess', gate: false },
      list_one: { value: ['a', 'b'], unit: 'x', source: 'guess', gate: true },
    },
  });
  const th = await lib.thresholds(root);
  assert.equal(th.get('R'), 1);
  assert.deepEqual(th.get('list_one'), ['a', 'b']);
  assert.equal(th.get('B_tokens'), null);
  await throwsTcb(() => th.get('not_a_param'), 'param-missing', 2);
  assert.equal(th.isGate('R'), true);
  assert.equal(th.isGate('B_tokens'), false);
  assert.equal(th.isGate('reading'), false);
  assert.ok('all' in th);
});

// ================================================================== Canonical JSON, hashes, objects (4.2)
test('T9 canonicalize sorts keys at every depth, drops whitespace and keeps array order', () => {
  assert.equal(lib.canonicalize({ b: 1, a: [2, 1] }), '{"a":[2,1],"b":1}');
  assert.equal(lib.canonicalize({ z: { y: 1, x: [{ d: 1, c: 2 }] }, a: null }), '{"a":null,"z":{"x":[{"c":2,"d":1}],"y":1}}');
  // keys sort by code unit, not by locale
  assert.equal(lib.canonicalize({ '\u00e9': 1, z: 2, B: 3, a: 4 }), '{"B":3,"a":4,"z":2,"\u00e9":1}');
  assert.equal(lib.canonicalize('a"b\n'), JSON.stringify('a"b\n'));
  assert.equal(lib.canonicalize([true, false, null]), '[true,false,null]');
});
test('T10 canonicalize normalises strings to NFC', () => {
  assert.equal(lib.canonicalize({ a: 'e\u0301' }), lib.canonicalize({ a: '\u00e9' }));
  assert.equal(lib.canonicalize({ a: 'e\u0301' }), '{"a":"\u00e9"}');
});
test('T11 canonicalize writes numbers in shortest JS form and refuses what has no canonical form', async () => {
  assert.equal(lib.canonicalize(-0), '0');
  assert.equal(lib.canonicalize({ a: -0 }), '{"a":0}');
  assert.equal(lib.canonicalize(1.0), '1');
  assert.equal(lib.canonicalize(1e21), '1e+21');
  assert.equal(lib.canonicalize(0.1), '0.1');
  assert.equal(lib.canonicalize(1e-7), '1e-7');
  assert.equal(lib.canonicalize([1.5, -2]), '[1.5,-2]');
  class Thing {}
  const refused = [undefined, { a: undefined }, NaN, Infinity, -Infinity, 10n, new Date(0), new Map(), new Set(), () => 1, new Thing()];
  for (const v of refused) await throwsTcb(() => lib.canonicalize(v), 'not-canonical', 1);
});
test('T12 sha256hex gives the known digest and treats a Buffer like its UTF-8 string', () => {
  assert.equal(lib.sha256hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(lib.sha256hex(Buffer.from('h\u00e9llo')), lib.sha256hex('h\u00e9llo'));
  assert.equal(lib.sha256hex('h\u00e9llo'), sha(Buffer.from('h\u00e9llo', 'utf8')));
});
test('T13 objectId is the prefix plus the first 16 hex of the canonical hash, whatever the key order', () => {
  const v = { kind: 'card', a: 1, b: [1, 2] };
  const id = lib.objectId('c', v);
  assert.match(id, /^c_[0-9a-f]{16}$/);
  assert.equal(id, 'c_' + lib.sha256hex(lib.canonicalize(v)).slice(0, 16));
  assert.equal(lib.objectId('c', { b: [1, 2], a: 1, kind: 'card' }), id);
  assert.notEqual(lib.objectId('c', { ...v, a: 2 }), id);
});
rt('T14 putObject writes the canonical bytes once and a repeat creates nothing', async (root) => {
  const v = { kind: 'card', field: 'f1', n: 1 };
  const r = await lib.putObject(root, v);
  const file = P(root, 'store', 'objects', `${r.id}.json`);
  assert.equal(r.id, lib.objectId('c', v));
  assert.equal(r.created, true);
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.toString('utf8'), lib.canonicalize(v));
  assert.equal(r.sha256, sha(bytes));
  const m1 = fs.statSync(file).mtimeMs;
  const r2 = await lib.putObject(root, { n: 1, field: 'f1', kind: 'card' });
  assert.equal(r2.id, r.id);
  assert.equal(r2.created, false);
  assert.deepEqual(fs.readFileSync(file), bytes);
  assert.equal(fs.statSync(file).mtimeMs, m1);
});
rt('T15 putObject throws id-collision 3 when the file of that id holds other bytes', async (root) => {
  const v = { kind: 'card', field: 'f1', n: 2 };
  const id = lib.objectId('c', v);
  fs.mkdirSync(P(root, 'store', 'objects'), { recursive: true });
  const file = P(root, 'store', 'objects', `${id}.json`);
  fs.writeFileSync(file, '{"kind":"card","other":true}');
  await throwsTcb(() => lib.putObject(root, v), 'id-collision', 3);
  assert.equal(fs.readFileSync(file, 'utf8'), '{"kind":"card","other":true}');
});
rt('T16 putObject refuses a seed id unless allowSeed', async (root) => {
  const found = Object.entries(lib.PREFIX).find(([, p]) => p === 's');
  const kind = found ? found[0] : 'seed';
  const v = { kind, n: 1 };
  await throwsTcb(() => lib.putObject(root, v), 'seed-id', 3);
  assert.deepEqual(fs.readdirSync(P(root, 'store', 'objects')), []);
  const r = await lib.putObject(root, v, { allowSeed: true });
  assert.match(r.id, /^s_[0-9a-f]{16}$/);
});
rt('T17 getObject returns the value, a missing id is missing 2, edited bytes are object-mismatch 3', async (root) => {
  const v = { kind: 'pack', field: 'f1', cards: ['c_0123456789abcdef'], n: 1 };
  const { id } = await lib.putObject(root, v);
  assert.deepEqual(await lib.getObject(root, id), v);
  await throwsTcb(() => lib.getObject(root, 'c_ffffffffffffffff'), 'missing', 2);
  const file = P(root, 'store', 'objects', `${id}.json`);
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('"n":1', '"n":2'));
  await throwsTcb(() => lib.getObject(root, id), 'object-mismatch', 3);
});
test('T18 treeSha is stable under creation order and changes with a byte, an added file or a rename', async () => {
  const mk = (files) => {
    const d = tmpDir();
    for (const [rel, data] of files) {
      fs.mkdirSync(path.dirname(path.join(d, rel)), { recursive: true });
      fs.writeFileSync(path.join(d, rel), data);
    }
    return d;
  };
  const files = [['a.txt', 'A'], ['b/c.txt', 'C'], ['d.txt', 'D']];
  const d1 = mk(files);
  const d2 = mk([...files].reverse());
  const t1 = await lib.treeSha(d1);
  assert.equal(await lib.treeSha(d2), t1);
  assert.equal(t1, sha(lib.canonicalize([['a.txt', sha('A')], ['b/c.txt', sha('C')], ['d.txt', sha('D')]])));
  assert.notEqual(await lib.treeSha(mk([['a.txt', 'A'], ['b/c.txt', 'X'], ['d.txt', 'D']])), t1, 'one byte');
  assert.notEqual(await lib.treeSha(mk([...files, ['e.txt', '']])), t1, 'added file');
  assert.notEqual(await lib.treeSha(mk([['a.txt', 'A'], ['b/c.txt', 'C'], ['z.txt', 'D']])), t1, 'renamed file');
});

// ================================================================== Files (4.3)
test('T19 tempName holds the pid and an 8-hex nonce, and two calls differ', async () => {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const a = await lib.tempName('C:/x/y.json');
  const b = await lib.tempName('C:/x/y.json');
  assert.match(a, new RegExp(`^${esc('C:/x/y.json')}\\.${process.pid}\\.[0-9a-f]{8}\\.tmp$`));
  assert.notEqual(a, b);
});
dt('T20 writeAtomic makes missing parents, leaves no temp file and returns the sha256 of the bytes', async (d) => {
  const f = path.join(d, 'a', 'b', 'c.txt');
  const r = await lib.writeAtomic(f, 'h\u00e9llo');
  assert.equal(r, sha(Buffer.from('h\u00e9llo', 'utf8')));
  assert.equal(fs.readFileSync(f, 'utf8'), 'h\u00e9llo');
  const buf = Buffer.from([1, 2, 3, 255]);
  assert.equal(await lib.writeAtomic(f, buf), sha(buf));
  assert.deepEqual(fs.readFileSync(f), buf);
  assert.deepEqual(fs.readdirSync(path.dirname(f)), ['c.txt']);
});
test('T21 writeAtomic replaces a file whole: a reader in another process never sees a partial file or a sharing error', { timeout: 180000 }, async () => {
  const d = tmpDir();
  const target = path.join(d, 'big.json');
  const stop = path.join(d, 'stop');
  const mk = (c) => JSON.stringify({ v: c.repeat(1000000) });
  await lib.writeAtomic(target, mk('A'));
  const child = spawn(process.execPath, [path.join(FIX, 'rw-reader.mjs'), LIB_URL, target, stop], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  let err = '';
  child.stderr.on('data', (x) => (err += x));
  const ready = new Promise((res) => child.stdout.on('data', (x) => { out += x; if (out.includes('ready')) res(); }));
  const closed = new Promise((res) => child.on('close', res));
  // The reader ends on every path (LR-6): a writeAtomic that throws must not leave it running.
  try {
    await Promise.race([ready, closed]);
    for (let i = 0; i < 200; i++) await lib.writeAtomic(target, mk(i % 2 ? 'A' : 'B'));
  } finally {
    fs.writeFileSync(stop, '1');
    let timer;
    const done = await Promise.race([closed.then(() => true), new Promise((r) => { timer = setTimeout(() => r(false), 10000); })]);
    clearTimeout(timer);
    if (!done && child.exitCode === null && child.signalCode === null) {
      child.kill();
      await closed;
    }
  }
  const last = out.trim().split('\n').pop();
  const sum = JSON.parse(last);
  assert.equal(sum.bad, 0, `partial reads: ${err}`);
  assert.deepEqual(sum.errors, [], 'a sharing error surfaced to the reader');
  assert.ok(sum.reads > 0);
  assert.deepEqual(fs.readdirSync(d).filter((n) => n.endsWith('.tmp')), []);
});
dt('T21 writeAtomic fsyncs the file and opens no directory handle', async (d) => {
  const f = path.join(d, 'x.txt');
  const opened = [];
  let fsyncs = 0;
  const r1 = patch(fs, 'openSync', (orig) => function (...a) { opened.push(String(a[0])); return orig.apply(this, a); });
  const r2 = patch(fs, 'fsyncSync', (orig) => function (...a) { fsyncs++; return orig.apply(this, a); });
  try {
    await lib.writeAtomic(f, 'data');
  } finally {
    r2();
    r1();
  }
  assert.ok(fsyncs >= 1, 'the file is fsynced');
  assert.ok(!opened.some((p) => norm(p) === norm(d)), `a directory was opened: ${opened.join(', ')}`);
});
dt('T21b writeAtomic retries a rename that fails with EPERM, EACCES, EBUSY and gives up after the retry budget', async (d) => {
  const f = path.join(d, 'x.txt');
  await lib.writeAtomic(f, 'old');
  const a = failing('renameSync', argHas(norm(d)), ['EPERM', 'EACCES', 'EBUSY']);
  try {
    await lib.writeAtomic(f, 'new');
  } finally {
    a.restore();
  }
  assert.equal(a.state.failed, 3);
  assert.equal(fs.readFileSync(f, 'utf8'), 'new');
  assert.deepEqual(fs.readdirSync(d).filter((n) => n.endsWith('.tmp')), []);
  const b = failing('renameSync', argHas(norm(d)), ['EPERM'], { forever: true });
  let err;
  try {
    err = await tcbErr(() => lib.writeAtomic(f, 'newer'));
  } finally {
    b.restore();
  }
  assert.ok(err, 'throws after the retry budget');
  assert.ok(b.state.failed >= 10, `retried ${b.state.failed} times`);
  assert.equal(fs.readFileSync(f, 'utf8'), 'new', 'the old file stays');
  assert.deepEqual(fs.readdirSync(d).filter((n) => n.endsWith('.tmp')), [], 'no temp file is left');
}, { timeout: 60000 });
dt('T22 createExclusive creates, accepts identical bytes and refuses different bytes with exists-different 1', async (d) => {
  const f = path.join(d, 'x.json');
  assert.equal(await lib.createExclusive(f, 'one'), 'created');
  assert.equal(await lib.createExclusive(f, 'one'), 'identical');
  await throwsTcb(() => lib.createExclusive(f, 'two'), 'exists-different', 1);
  assert.equal(fs.readFileSync(f, 'utf8'), 'one');
});
dt('T22b createExclusive strict (0b): no folder made (no-parent 2), no fallback without hard links (no-hardlink 3), a spent budget makes nothing (budget-spent 2)', async (d) => {
  const tmps = () => fs.readdirSync(d).filter((n) => n.endsWith('.tmp'));
  const f = path.join(d, 'x.json');
  assert.equal(lib.createExclusive(f, 'one', { strict: true }), 'created');
  assert.equal(lib.createExclusive(f, 'one', { strict: true }), 'identical');
  await throwsTcb(() => lib.createExclusive(f, 'two', { strict: true }), 'exists-different', 1);
  assert.equal(fs.readFileSync(f, 'utf8'), 'one');
  const g = path.join(d, 'no', 'such', 'y.json');
  await throwsTcb(() => lib.createExclusive(g, 'y', { strict: true }), 'no-parent', 2);
  assert.equal(fs.existsSync(path.join(d, 'no')), false, 'strict makes no folder');
  assert.equal(lib.createExclusive(g, 'y'), 'created', 'without strict the parent is made, as before');
  for (const code of ['ENOTSUP', 'EINVAL', 'EXDEV', 'ENOSYS', 'EMLINK']) {
    const h = path.join(d, `h-${code}.json`);
    const a = failing('linkSync', argHas(norm(d)), [code], { forever: true });
    try {
      const e = await throwsTcb(() => lib.createExclusive(h, 'z', { strict: true, budget: 5000 }), 'no-hardlink', 3);
      assert.equal(e.detail.code, code);
      assert.equal(fs.existsSync(h), false, `${code}: nothing at the name`);
      assert.deepEqual(tmps(), [], `${code}: no temp file left`);
      assert.equal(lib.createExclusive(h, 'z'), 'created', `${code}: without strict the wx fallback still creates it`);
    } finally {
      a.restore();
    }
    assert.equal(fs.readFileSync(h, 'utf8'), 'z');
  }
  const before = fs.readdirSync(d).sort();
  const k = path.join(d, 'k.json');
  await throwsTcb(() => lib.createExclusive(k, 'k', { strict: true, budget: 0 }), 'budget-spent', 2);
  await throwsTcb(() => lib.createExclusive(k, 'k', { strict: true, budget: -5 }), 'budget-spent', 2);
  assert.deepEqual(fs.readdirSync(d).sort(), before, 'a spent budget touches no file');
  const o = failing('openSync', (args) => argHas(norm(d))(args) && String(args[0]).endsWith('.tmp'), ['EPERM'], { forever: true });
  let ms;
  try {
    const t0 = performance.now();
    const e = await throwsTcb(() => lib.createExclusive(k, 'k', { strict: true, budget: 150 }), 'budget-spent', 2);
    ms = performance.now() - t0;
    assert.equal(e.detail.code, 'EPERM');
  } finally {
    o.restore();
  }
  assert.ok(o.state.failed >= 2 && o.state.failed <= 40, `tries ${o.state.failed}`);
  assert.ok(ms < 700, `the create gave up after ${Math.round(ms)} ms, not inside its 150 ms budget`);
  assert.deepEqual(fs.readdirSync(d).sort(), before, 'nothing made');
});
test('T22c fsRetry(op, budget) (0b): one try at budget 0, retries that stop inside the budget, a non-sharing error at once, a bad budget is bad-budget 70', async () => {
  const eperm = () => Object.assign(new Error('EPERM: simulated sharing violation'), { code: 'EPERM', syscall: 'open' });
  let n = 0;
  let e = await throwsTcb(() => lib.fsRetry(() => { n++; throw eperm(); }, 0), 'budget-spent', 2);
  assert.equal(n, 1, 'budget 0: one try, no retry');
  assert.deepEqual([e.detail.code, e.detail.tries], ['EPERM', 1]);
  n = 0;
  const t0 = performance.now();
  e = await throwsTcb(() => lib.fsRetry(() => { n++; throw eperm(); }, 150), 'budget-spent', 2);
  const ms = performance.now() - t0;
  assert.ok(n >= 2 && n <= 40, `tries ${n}`);
  assert.equal(e.detail.tries, n);
  assert.ok(ms <= 150 + 100, `gave up after ${Math.round(ms)} ms with a 150 ms budget`);
  n = 0;
  assert.equal(lib.fsRetry(() => { if (++n <= 3) throw eperm(); return 'v'; }, 5000), 'v');
  assert.equal(n, 4);
  n = 0;
  const raw = await tcbErr(() => lib.fsRetry(() => { n++; throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); }, 5000));
  assert.deepEqual([raw.code, n], ['ENOENT', 1]);
  for (const bad of ['5', Number.NaN, {}]) await throwsTcb(() => lib.fsRetry(() => 1, bad), 'bad-budget', 70);
  assert.equal(lib.fsRetry(() => 'u', undefined), 'u');
});
dt('T23 readJson of a missing file is missing 2, of a bad file unparseable 2', async (d) => {
  await throwsTcb(() => lib.readJson(path.join(d, 'none.json')), 'missing', 2);
  const f = path.join(d, 'bad.json');
  fs.writeFileSync(f, '{"a":');
  await throwsTcb(() => lib.readJson(f), 'unparseable', 2);
  fs.writeFileSync(f, '{"a":1}');
  assert.deepEqual(await lib.readJson(f), { a: 1 });
});
dt('T23b readJson strips a UTF-8 BOM and refuses UTF-16 with detail utf16', async (d) => {
  const f = path.join(d, 'bom.json');
  fs.writeFileSync(f, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('{"a":1}')]));
  assert.deepEqual(await lib.readJson(f), { a: 1 });
  const g = path.join(d, 'u16.json');
  fs.writeFileSync(g, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('{"a":1}', 'utf16le')]));
  const e = await throwsTcb(() => lib.readJson(g), 'unparseable', 2);
  assert.ok(e.detail === 'utf16' || JSON.stringify(e.detail).includes('utf16'), `detail was ${JSON.stringify(e.detail)}`);
  const h = path.join(d, 'u16be.json');
  fs.writeFileSync(h, Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from('\u0000{\u0000}', 'utf16le')]));
  await throwsTcb(() => lib.readJson(h), 'unparseable', 2);
});
dt('T24 readJsonl returns the records, the torn tail bytes and the bad complete lines', async (d) => {
  const f = path.join(d, 'a.jsonl');
  fs.writeFileSync(f, '{"a":1}\n{"b":2}\n{"x":');
  const r = await lib.readJsonl(f);
  assert.deepEqual(r.records, [{ a: 1 }, { b: 2 }]);
  assert.ok(Buffer.isBuffer(r.torn));
  assert.equal(r.torn.toString(), '{"x":');
  assert.deepEqual(r.badLines, []);
  const g = path.join(d, 'b.jsonl');
  fs.writeFileSync(g, '{"a":1}\nnot json\n{"b":2}\n');
  const s = await lib.readJsonl(g);
  assert.deepEqual(s.records, [{ a: 1 }, { b: 2 }]);
  assert.equal(s.torn, null);
  assert.equal(s.badLines.length, 1);
  assert.ok([1, 2].includes(s.badLines[0]), `badLines ${JSON.stringify(s.badLines)}`);
});
rt('T25 appendJsonl with the lock held moves a torn tail to <file>.corrupt and appends the new line', async (root) => {
  const f = P(root, 'run', 'x.jsonl');
  fs.writeFileSync(f, '{"a":1}\n{"x":');
  fs.writeFileSync(f + '.corrupt', 'old\n');
  const h = await lib.acquireLock(root, 'run.lock', lo());
  try {
    await lib.appendJsonl(f, { new: 1 }, h);
  } finally {
    await h.release();
  }
  assert.equal(fs.readFileSync(f, 'utf8'), '{"a":1}\n{"new":1}\n');
  const c = fs.readFileSync(f + '.corrupt', 'utf8');
  assert.ok(c.startsWith('old\n'), 'the corrupt file is appended to');
  assert.ok(c.includes('{"x":'));
  const r = await lib.readJsonl(f);
  assert.equal(r.torn, null);
  assert.deepEqual(r.records, [{ a: 1 }, { new: 1 }]);
});
rt('T25b an unlink that fails with EPERM twice is retried and never surfaces; one failing every time throws', async (root) => {
  const h = await lib.acquireLock(root, 'run.lock', lo());
  const a = failing('unlinkSync', argHas('/run/run.lock'), ['EPERM', 'EPERM']);
  try {
    await h.release();
  } finally {
    a.restore();
  }
  assert.equal(a.state.failed, 2);
  assert.equal(fs.existsSync(lockFile(root)), false, 'released after the retries');
  const h2 = await lib.acquireLock(root, 'run.lock', lo());
  const b = failing('unlinkSync', argHas('/run/run.lock'), ['EPERM'], { forever: true });
  try {
    await tcbErr(() => h2.release());
  } finally {
    b.restore();
  }
  assert.ok(b.state.failed >= 10, `retried ${b.state.failed} times`);
  await h2.release();
}, {}, { timeout: 60000 });
rt('T25c a wx create of the lock that keeps failing with EPERM counts as busy', async (root) => {
  const isLockCreate = (args) => argHas('/run/run.lock')(args) && JSON.stringify(args.slice(1)).includes('wx');
  const r1 = failing('openSync', isLockCreate, ['EPERM'], { forever: true });
  const r2 = failing('writeFileSync', isLockCreate, ['EPERM'], { forever: true });
  try {
    await throwsTcb(() => lib.acquireLock(root, 'run.lock', lo({ retries: 2 })), 'lock-busy', 75);
  } finally {
    r2.restore();
    r1.restore();
  }
  assert.equal(fs.existsSync(lockFile(root)), false);
}, {}, { timeout: 120000 });
rt('T26 appendJsonl without a held lock throws lock-lost 75 and writes nothing', async (root) => {
  const f = P(root, 'run', 'y.jsonl');
  const h = await lib.acquireLock(root, 'run.lock', lo());
  await h.release();
  await throwsTcb(() => lib.appendJsonl(f, { a: 1 }, h), 'lock-lost', 75);
  assert.equal(fs.existsSync(f), false);
});
dt('T27 isUnder resolves ..., folds case and slashes and does not trust a prefix or a junction', async (d, t) => {
  const root = path.join(d, 'r');
  fs.mkdirSync(path.join(root, 'wt', 'a'), { recursive: true });
  assert.equal(await lib.isUnder(path.join(root, 'wt', 'a'), root), true);
  assert.equal(await lib.isUnder(path.join(root, '..', 'x'), root), false);
  assert.equal(await lib.isUnder(root + '2', root), false);
  assert.equal(await lib.isUnder(path.join(root, 'wt', 'a'), root.replace(/\\/g, '/').toUpperCase()), true);
  assert.equal(await lib.isUnder('C:\\R\\wt\\a', 'c:/r/wt/'), true);
  assert.equal(await lib.isUnder('C:\\R\\wt', 'c:/r/wt/'), true);
  assert.equal(await lib.isUnder('c:/R/WT/../x', 'C:\\r\\wt'), false);
  const outside = path.join(d, 'outside');
  fs.mkdirSync(outside);
  const link = path.join(root, 'junc');
  if (!tryJunction(outside, link)) return t.skip('cannot create a junction on this machine');
  try {
    assert.equal(await lib.isUnder(path.join(link, 'x.txt'), root), false);
    assert.equal(await lib.isUnder(path.join(link, 'sub', 'y'), root), false);
  } finally {
    rmLink(link);
  }
});
dt('T27b walkFiles lists plain files and puts junctions, symbolic links and hard-linked files in links; removeTree refuses a tree with a link', async (d, t) => {
  const dir = path.join(d, 'tree');
  const outside = path.join(d, 'outside');
  fs.mkdirSync(path.join(dir, 'sub'), { recursive: true });
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'secret.txt'), 'secret');
  fs.writeFileSync(path.join(outside, 'target.txt'), 'target');
  fs.writeFileSync(path.join(dir, 'a.txt'), 'a');
  fs.writeFileSync(path.join(dir, 'sub', 'b.txt'), 'b');
  const expectLinks = [];
  const made = [];
  if (tryJunction(outside, path.join(dir, 'j'))) { expectLinks.push('j'); made.push(path.join(dir, 'j')); } else return t.skip('cannot create a junction on this machine');
  if (trySymlink(path.join(outside, 'target.txt'), path.join(dir, 'sl'))) { expectLinks.push('sl'); made.push(path.join(dir, 'sl')); }
  if (tryHard(path.join(outside, 'target.txt'), path.join(dir, 'hl.txt'))) expectLinks.push('hl.txt');
  try {
    const w = await lib.walkFiles(dir);
    assert.deepEqual([...w.files].sort(), ['a.txt', 'sub/b.txt']);
    assert.deepEqual([...w.links].sort(), expectLinks.sort());
    await throwsTcb(() => lib.removeTree(dir), 'untrusted-path', 3);
    assert.ok(fs.existsSync(path.join(dir, 'a.txt')), 'nothing was removed');
    assert.ok(fs.existsSync(path.join(outside, 'secret.txt')), 'the junction target is untouched');
  } finally {
    for (const l of made) rmLink(l);
  }
  const plain = path.join(d, 'plain');
  fs.mkdirSync(path.join(plain, 'x', 'y'), { recursive: true });
  fs.writeFileSync(path.join(plain, 'x', 'y', 'z.txt'), 'z');
  fs.writeFileSync(path.join(plain, 'q.txt'), 'q');
  await lib.removeTree(plain);
  assert.equal(fs.existsSync(plain), false);
});
test('T27c segmentName strips trailing dots and spaces and folds case', async () => {
  assert.equal(await lib.segmentName('.claude.'), '.claude');
  assert.equal(await lib.segmentName('CLAUDE.md '), 'claude.md');
  assert.equal(await lib.segmentName('Claude.Local.MD..'), 'claude.local.md');
  assert.equal(await lib.segmentName('a.b'), 'a.b');
  assert.equal(await lib.segmentName('A.B . '), 'a.b');
});

// ================================================================== Locks (4.4)
const isLockSrc = (p) => String(p).replace(/\\/g, '/').toLowerCase().endsWith('/run/run.lock');
const staleLeftovers = (root) => fs.readdirSync(P(root, 'run')).filter((n) => /\.(stale|orphan)$/.test(n));

rt('T28 acquireLock creates the lock file holding the lock record, release deletes it, a second release does nothing', async (root) => {
  const h = await lib.acquireLock(root, 'run.lock', lo());
  const r = rdj(lockFile(root));
  assert.equal(r.pid, process.pid);
  // The own start time comes from the own clock (now minus process.uptime()), never from the provider.
  assert.equal(r.start_time, OWN_START());
  assert.match(r.start_time, ISO7);
  assert.ok(Math.abs(Date.parse(r.start_time.replace(/(\.\d{3})\d+Z$/, '$1Z')) - (Date.now() - process.uptime() * 1000)) < 1000, 'within a second of now minus uptime');
  assert.match(r.nonce, /^[0-9a-f]{32}$/);
  assert.equal(r.script, 'test');
  assert.equal(r.ce, 1);
  assert.equal(r.acquired_at, NOW);
  await h.release();
  assert.equal(fs.existsSync(lockFile(root)), false);
  await h.release();
  const w = await lib.acquireLock(root, 'watcher.lock', lo());
  assert.ok(fs.existsSync(lockFile(root, 'watcher.lock')));
  await w.release();
});
rt('T29 a lock held by a live process is retried, then lock-busy 75 with the file unchanged and one process listing', async (root) => {
  const s = await helpers.spawnSleeper({});
  try {
    putLock(root, mkRec({ pid: s.pid, start_time: s.start_time }));
    const before = fs.readFileSync(lockFile(root));
    const p = fproc({ alive: (pid) => pid === s.pid });
    // Count the wx creates of run.lock (a pass-through spy): the first try plus three retries.
    const isLockCreate = (args) => argHas('/run/run.lock')(args) && JSON.stringify(args.slice(1)).includes('wx');
    const spy = failing('openSync', isLockCreate, []);
    try {
      await throwsTcb(() => lib.acquireLock(root, 'run.lock', lo({ proc: p, retries: 3, retryMs: 5 })), 'lock-busy', 75);
    } finally {
      spy.restore();
    }
    assert.equal(spy.state.matched, 4, 'one create and three retries');
    assert.deepEqual(fs.readFileSync(lockFile(root)), before);
    assert.equal(p.calls.list, 0, `proc.list was called ${p.calls.list} times (the own start time needs no listing)`);
    // CONTRACT 4.4 keeps PowerShell out of the retry loop: the holder is judged (at least once) and
    // found alive; the library may judge one holder once rather than per retry.
    assert.ok(p.calls.alive.length >= 1 && p.calls.alive.length <= 4, `alive consulted ${p.calls.alive.length} times`);
    assert.ok(p.calls.alive.every(([pid]) => pid === s.pid), 'only the holder is judged');
  } finally {
    await s.kill();
  }
}, {}, { concurrency: false });
rt('T30 a lock whose holder is dead is broken, no .stale file is left and a lock-break line holds the stale record', async (root) => {
  const stale = putLock(root, mkRec());
  const p = fproc({ alive: (pid) => pid === process.pid });
  const h = await lib.acquireLock(root, 'run.lock', lo({ proc: p }));
  try {
    const now = rdj(lockFile(root));
    assert.notEqual(now.nonce, stale.nonce);
    assert.match(now.nonce, /^[0-9a-f]{32}$/);
    assert.equal(now.pid, process.pid);
    assert.deepEqual(staleLeftovers(root), []);
    const lb = (await ledger(root)).filter((l) => l.kind === 'lock-break');
    assert.equal(lb.length, 1);
    const st = lb[0].data.stale || lb[0].data;
    assert.equal(st.pid, stale.pid);
    assert.equal(st.nonce, stale.nonce);
  } finally {
    await h.release();
  }
  // run.lock only: breaking a stale watcher.lock appends no ledger line
  const n = (await ledger(root)).length;
  putLock(root, mkRec(), 'watcher.lock');
  const w = await lib.acquireLock(root, 'watcher.lock', lo({ proc: p }));
  await w.release();
  assert.equal((await ledger(root)).length, n);
});
rt('T31 a lock whose pid is alive with another start time is stale and is broken', async (root) => {
  const stale = putLock(root, mkRec({ pid: process.pid, start_time: '2000-01-01T00:00:00.0000000Z' }));
  const p = fproc({ alive: (pid, st) => pid === process.pid && lib.sameStartTime(st, OWN_START()) });
  const h = await lib.acquireLock(root, 'run.lock', lo({ proc: p }));
  try {
    const now = rdj(lockFile(root));
    assert.notEqual(now.nonce, stale.nonce);
    assert.equal(now.start_time, OWN_START());
    assert.deepEqual(staleLeftovers(root), []);
    assert.equal((await ledger(root)).filter((l) => l.kind === 'lock-break').length, 1);
  } finally {
    await h.release();
  }
});
rt('T32 an unknown liveness (alive null) counts as alive: busy, never broken', async (root) => {
  putLock(root, mkRec());
  const before = fs.readFileSync(lockFile(root));
  await throwsTcb(() => lib.acquireLock(root, 'run.lock', lo({ proc: fproc({ alive: () => null }) })), 'lock-busy', 75);
  assert.deepEqual(fs.readFileSync(lockFile(root)), before);
  assert.deepEqual(staleLeftovers(root), []);
  assert.equal((await ledger(root)).length, 0);
});
rt('T33 a breaker that renamed a lock another breaker had just made restores it with a link and the other keeps run.lock', async (root) => {
  const A = await lib.acquireLock(root, 'run.lock', lo());
  const recA = fs.readFileSync(lockFile(root)); // breaker A's fresh lock
  const stale = mkRec();
  fs.writeFileSync(lockFile(root), JSON.stringify(stale)); // what breaker B read: a dead holder
  let hooked = 0;
  const restore = patch(fs, 'renameSync', (orig) =>
    function (...a) {
      if (isLockSrc(a[0]) && String(a[1]).endsWith('.stale') && hooked++ === 0) fs.writeFileSync(lockFile(root), recA); // A got in first
      return orig.apply(this, a);
    },
  );
  try {
    const p = fproc({ alive: (pid) => pid !== stale.pid });
    await throwsTcb(() => lib.acquireLock(root, 'run.lock', lo({ proc: p })), 'lock-busy', 75);
  } finally {
    restore();
  }
  assert.ok(hooked >= 1, 'the breaker renamed the lock');
  assert.deepEqual(fs.readFileSync(lockFile(root)), recA, 'run.lock is A\'s lock again, byte for byte');
  assert.deepEqual(staleLeftovers(root), []);
  await A.assertHeld();
  await A.release();
});
rt('T34 restoring when a third lock already sits at run.lock keeps the renamed file as .orphan and logs an incident at the next acquisition', async (root) => {
  const A = await lib.acquireLock(root, 'run.lock', lo());
  const recA = fs.readFileSync(lockFile(root));
  fs.writeFileSync(lockFile(root), JSON.stringify(mkRec()));
  const recC = Buffer.from(JSON.stringify(mkRec({ pid: process.pid, script: 'third' })));
  let hooked = 0;
  const restore = patch(fs, 'renameSync', (orig) =>
    function (...a) {
      if (isLockSrc(a[0]) && String(a[1]).endsWith('.stale') && hooked++ === 0) {
        fs.writeFileSync(lockFile(root), recA);
        const r = orig.apply(this, a);
        fs.writeFileSync(lockFile(root), recC, { flag: 'wx' }); // a third process takes run.lock
        return r;
      }
      return orig.apply(this, a);
    },
  );
  const stale = rdj(lockFile(root));
  try {
    const p = fproc({ alive: (pid) => pid !== stale.pid });
    await throwsTcb(() => lib.acquireLock(root, 'run.lock', lo({ proc: p })), 'lock-busy', 75);
  } finally {
    restore();
  }
  assert.deepEqual(fs.readFileSync(lockFile(root)), recC, 'run.lock is not overwritten');
  const orphans = fs.readdirSync(P(root, 'run')).filter((n) => n.endsWith('.orphan'));
  assert.equal(orphans.length, 1, `orphans: ${orphans}`);
  assert.ok(orphans[0].startsWith('run.lock.'));
  assert.deepEqual(fs.readFileSync(P(root, 'run', orphans[0])), recA, 'the renamed lock is kept');
  assert.deepEqual(fs.readdirSync(P(root, 'run')).filter((n) => n.endsWith('.stale')), []);
  // the third process is done; the next acquisition logs the incident
  fs.unlinkSync(lockFile(root));
  const h = await lib.acquireLock(root, 'run.lock', lo());
  try {
    assert.ok((await ledger(root)).some((l) => l.kind === 'incident'), 'an incident line was appended');
  } finally {
    await h.release();
  }
  void A;
});
rt('T35 assertHeld throws lock-lost 75 after another record replaced run.lock', async (root) => {
  const h = await lib.acquireLock(root, 'run.lock', lo());
  await h.assertHeld();
  putLock(root, mkRec({ pid: process.pid }));
  await throwsTcb(() => h.assertHeld(), 'lock-lost', 75);
});
rt('T36 release does not delete a lock file holding another nonce', async (root) => {
  const h = await lib.acquireLock(root, 'run.lock', lo());
  putLock(root, mkRec({ pid: process.pid }));
  const before = fs.readFileSync(lockFile(root));
  await h.release();
  assert.ok(fs.existsSync(lockFile(root)));
  assert.deepEqual(fs.readFileSync(lockFile(root)), before);
});

// The normal path of a script start makes no process query (CONTRACT 4.4): a reader that throws on
// every call must never be reached while a free lock is taken, written under and released.
const throwingProc = () => {
  const calls = { n: 0 };
  const boom = (what) => () => {
    calls.n++;
    throw new Error(`process reader called: ${what}`);
  };
  return { calls, list: boom('list'), alive: boom('alive'), boot: boom('boot') };
};
rt('T36c a free lock is taken, written under and released with a process reader that throws on every call', async (root) => {
  const p = throwingProc();
  const h = await lib.acquireLock(root, 'run.lock', lo({ proc: p }));
  await ap(root, h);
  await h.release();
  await lib.withRunLock(root, { script: 'test', ce: 1, proc: p, now: NOW, retries: 2, retryMs: 1 }, async (h2) => {
    await ap(root, h2);
  });
  const w = await lib.acquireLock(root, 'watcher.lock', lo({ proc: p }));
  await w.release();
  assert.equal(p.calls.n, 0, 'the process reader was never called');
  assert.equal(fs.existsSync(lockFile(root)), false);
  assert.equal(fs.existsSync(lockFile(root, 'watcher.lock')), false);
  assert.deepEqual((await ledger(root)).map((l) => l.seq), [1, 2]);
  assert.equal(lib.selfInfo(p).start_time, OWN_START(), 'selfInfo ignores the provider');
});
rt('T36d with the real provider, a free lock taken, written under and released starts no subprocess', async (root) => {
  const seen = [];
  const restores = [];
  for (const name of ['spawn', 'spawnSync', 'execFile', 'execFileSync', 'exec', 'execSync', 'fork']) {
    restores.push(patch(cp, name, (orig) => function (...a) {
      seen.push(name);
      return orig.apply(this, a);
    }));
  }
  try {
    const proc = lib.realProc({ exe: lib.PROC_EXE });
    await lib.withRunLock(root, { script: 'test', ce: 1, proc, now: NOW, retries: 2, retryMs: 1 }, async (h) => {
      await ap(root, h);
    });
  } finally {
    restores.reverse().forEach((r) => r());
  }
  assert.deepEqual(seen, [], 'no PowerShell (or any other subprocess) on the normal path');
  assert.equal(fs.existsSync(lockFile(root)), false);
});
rt('T36e a stale lock whose holder is gone is broken only after the provider judged it dead; unjudged or unknown it stays', async (root) => {
  const stale = putLock(root, mkRec());
  const events = [];
  const p = {
    list() { throw new Error('no listing on this path'); },
    boot() { throw new Error('no boot on this path'); },
    alive(pid, st) {
      events.push(['alive', pid, st]);
      return false; // gone
    },
  };
  const restore = patch(fs, 'renameSync', (orig) => function (...a) {
    if (isLockSrc(a[0])) events.push(['rename']);
    return orig.apply(this, a);
  });
  let h;
  try {
    h = await lib.acquireLock(root, 'run.lock', lo({ proc: p }));
  } finally {
    restore();
  }
  try {
    assert.deepEqual(events[0], ['alive', stale.pid, stale.start_time], 'the holder is judged first, by its recorded pid and start time');
    const at = events.findIndex((e) => e[0] === 'rename');
    assert.ok(at > 0, `the break (rename) comes after the judgement: ${JSON.stringify(events)}`);
    assert.notEqual(rdj(lockFile(root)).nonce, stale.nonce);
    assert.equal((await ledger(root)).filter((l) => l.kind === 'lock-break').length, 1);
  } finally {
    await h.release();
  }
  // The same dead holder with nothing to judge it, or a judgement that fails, is never broken.
  putLock(root, stale);
  await throwsTcb(() => lib.acquireLock(root, 'run.lock', lo({ proc: null })), 'lock-busy', 75);
  await throwsTcb(() => lib.acquireLock(root, 'run.lock', lo({ proc: { alive: () => { throw new Error('PowerShell failed'); } } })), 'lock-busy', 75);
  assert.equal(rdj(lockFile(root)).nonce, stale.nonce);
  assert.deepEqual(staleLeftovers(root), []);
});
rt('T36f a stale lock of a real process that has ended is broken after one real verification', async (root) => {
  const child = spawn(process.execPath, ['-e', 'setTimeout(()=>{},60000)'], { stdio: 'ignore', windowsHide: true });
  const exited = new Promise((res) => child.once('exit', res));
  const pid = child.pid;
  child.kill();
  await exited;
  const stale = putLock(root, mkRec({ pid, start_time: OWN_START() }));
  const h = await lib.acquireLock(root, 'run.lock', lo({ proc: lib.realProc({ exe: lib.PROC_EXE }) }));
  try {
    assert.notEqual(rdj(lockFile(root)).nonce, stale.nonce);
    const lb = (await ledger(root)).filter((l) => l.kind === 'lock-break');
    assert.equal(lb.length, 1);
    assert.equal((lb[0].data.stale || lb[0].data).pid, pid);
  } finally {
    await h.release();
  }
}, {}, { concurrency: false, timeout: 120000 });
// LR-3: a holder is judged only after its lock stayed unchanged for LOCK_JUDGE_AFTER retries (capped
// at the caller's retries), so ordinary contention starts no process query.
const isLockCreate = (a) => isLockSrc(a[0]) && JSON.stringify(a.slice(1)).includes('wx');
rt('T36g a holder is judged once, and only after LOCK_JUDGE_AFTER unchanged sightings', async (root) => {
  assert.equal(lib.LOCK_JUDGE_AFTER, 50);
  putLock(root, mkRec());
  let creates = 0;
  let createsAtJudge = null;
  const p = fproc({ alive: () => { if (createsAtJudge === null) createsAtJudge = creates; return true; } });
  const restore = patch(fs, 'openSync', (orig) => function (...a) {
    if (isLockCreate(a)) creates++;
    return orig.apply(this, a);
  });
  try {
    await throwsTcb(() => lib.acquireLock(root, 'run.lock', lo({ proc: p, retries: 60, retryMs: 1 })), 'lock-busy', 75);
  } finally {
    restore();
  }
  assert.equal(p.calls.alive.length, 1, 'one judgement for one unchanged holder');
  assert.equal(createsAtJudge, lib.LOCK_JUDGE_AFTER + 1, `judged at sighting ${createsAtJudge}`);
});
rt('T36h a lock whose bytes change between sightings (ordinary contention) is never judged', async (root) => {
  putLock(root, mkRec());
  const restore = patch(fs, 'readFileSync', (orig) => function (...a) {
    if (isLockSrc(a[0])) fs.writeFileSync(lockFile(root), JSON.stringify(mkRec())); // a new holder each time
    return orig.apply(this, a);
  });
  const p = fproc({ alive: () => false });
  try {
    await throwsTcb(() => lib.acquireLock(root, 'run.lock', lo({ proc: p, retries: 5, retryMs: 1 })), 'lock-busy', 75);
  } finally {
    restore();
  }
  assert.equal(p.calls.alive.length, 0, 'no process query while the holder keeps changing');
  assert.deepEqual(staleLeftovers(root), []);
});
rt('T36i a lock that changed after its holder was judged dead is not renamed', async (root) => {
  const stale = putLock(root, mkRec());
  const fresh = Buffer.from(JSON.stringify(mkRec({ pid: process.pid, script: 'fresh' })));
  let renames = 0;
  const p = fproc({
    alive: (pid) => {
      if (pid !== stale.pid) return true;
      fs.writeFileSync(lockFile(root), fresh); // the dead holder's lock was replaced meanwhile
      return false;
    },
  });
  const restore = patch(fs, 'renameSync', (orig) => function (...a) {
    if (isLockSrc(a[0])) renames++;
    return orig.apply(this, a);
  });
  try {
    await throwsTcb(() => lib.acquireLock(root, 'run.lock', lo({ proc: p, retries: 2, retryMs: 1 })), 'lock-busy', 75);
  } finally {
    restore();
  }
  assert.equal(renames, 0, 'the fresh lock was never renamed');
  assert.deepEqual(fs.readFileSync(lockFile(root)), fresh);
  assert.equal((await ledger(root)).filter((l) => l.kind === 'lock-break').length, 0);
});
// LR-4: an unreadable lock (empty after a crash between create and write) is broken once it stayed
// unchanged for a whole retry budget of at least LOCK_UNREADABLE_MIN_RETRIES; a short budget leaves it.
rt('T36j an empty or corrupt run.lock unchanged for the whole retry budget is broken with a lock-break line', async (root) => {
  assert.equal(lib.LOCK_UNREADABLE_MIN_RETRIES, 50);
  for (const bad of ['', '{"pid":12']) {
    fs.mkdirSync(P(root, 'run'), { recursive: true });
    fs.writeFileSync(lockFile(root), bad);
    // a short budget leaves it in place
    await throwsTcb(() => lib.acquireLock(root, 'run.lock', lo({ proc: fproc({ alive: () => false }), retries: 3 })), 'lock-busy', 75);
    assert.equal(fs.readFileSync(lockFile(root), 'utf8'), bad);
    const p = throwingProc();
    const h = await lib.acquireLock(root, 'run.lock', lo({ proc: p, retries: 50, retryMs: 1 }));
    try {
      assert.equal(rdj(lockFile(root)).nonce, h.nonce);
      assert.equal(p.calls.n, 0, 'no process query for a lock with no record');
      assert.deepEqual(staleLeftovers(root), []);
      const lb = (await ledger(root)).filter((l) => l.kind === 'lock-break').pop();
      assert.ok(lb, 'a lock-break line');
      assert.deepEqual(lb.data.stale, { pid: null, start_time: null, nonce: null, script: null });
      assert.equal(lb.data.unreadable.bytes, Buffer.byteLength(bad));
      assert.equal(lb.data.unreadable.sha256, sha(Buffer.from(bad)));
    } finally {
      await h.release();
    }
  }
});
rt('T36k an unreadable lock that changes during the budget (a holder finishing its write) is not broken', async (root) => {
  fs.mkdirSync(P(root, 'run'), { recursive: true });
  fs.writeFileSync(lockFile(root), '');
  let reads = 0;
  const live = Buffer.from(JSON.stringify(mkRec({ pid: process.pid, script: 'slow-writer' })));
  const restore = patch(fs, 'readFileSync', (orig) => function (...a) {
    if (isLockSrc(a[0]) && ++reads === 10) fs.writeFileSync(lockFile(root), live); // the write lands
    return orig.apply(this, a);
  });
  try {
    await throwsTcb(() => lib.acquireLock(root, 'run.lock', lo({ proc: fproc(), retries: 50, retryMs: 1 })), 'lock-busy', 75);
  } finally {
    restore();
  }
  assert.deepEqual(fs.readFileSync(lockFile(root)), live);
  assert.deepEqual(staleLeftovers(root), []);
});
// LR-2: the recorded start time comes from the holder's own clock, after Windows created it.
test('T36l aliveFromQuery: a creation before the recorded start is the holder; a later one (pid reuse) is not', () => {
  const rec = '2026-11-17T10:00:10.0000000Z';
  assert.equal(lib.aliveFromQuery('NONE', rec), false);
  assert.equal(lib.aliveFromQuery('2026-11-17T10:00:10.0000000Z', rec), true);
  assert.equal(lib.aliveFromQuery('2026-11-17T10:00:09.0000000Z', rec), true, 'one second of start-up');
  assert.equal(lib.aliveFromQuery('2026-11-17T09:59:58.0000000Z', rec), true, 'twelve seconds of start-up (slow, below-normal priority)');
  assert.equal(lib.aliveFromQuery('2026-11-17T10:00:11.5000000Z', rec), true, 'within the tolerance after');
  assert.equal(lib.aliveFromQuery('2026-11-17T10:00:12.5000000Z', rec), false, 'created after the holder started: pid reuse');
  assert.equal(lib.aliveFromQuery('2026-11-17T15:00:00.0000000Z', rec), false);
  assert.equal(lib.aliveFromQuery('2026-11-17T10:00:09.0000000Z', 'not-a-time'), false);
  assert.equal(lib.aliveFromQuery('NOSTART', null), true);
  assert.equal(lib.aliveFromQuery('NOSTART', rec), null);
  assert.equal(lib.aliveFromQuery('2026-11-17T10:00:09.0000000Z', null), true);
  for (const junk of ['', 'WARNING: something', 'Get-CimInstance : failed', undefined]) {
    assert.equal(lib.aliveFromQuery(junk, rec), null, `unknown for ${JSON.stringify(junk)}`);
  }
});
// LR-1: every PowerShell text stops on a failed query, so the provider answers unknown, never dead.
test('T36m every realProc PowerShell text starts with $ErrorActionPreference=Stop', () => {
  const texts = [lib.PS_SCRIPTS.list, lib.PS_SCRIPTS.boot, lib.PS_SCRIPTS.one(1234)];
  for (const t of texts) assert.ok(t.startsWith("$ErrorActionPreference='Stop';"), t.slice(0, 60));
  assert.ok(lib.PS_SCRIPTS.one(1234).includes("'ProcessId=1234'"));
});
// LR-5: the lock is re-checked right before each write, after the reads that precede it.
rt('T42b appendLedger re-checks the lock after reading the tail: lost there, it is lock-lost 75 and writes nothing', async (root) => {
  await appendMany(root, [{ data: { added: ['a'] } }]);
  const before = fs.readFileSync(ledgerPath(root));
  const h = await lib.acquireLock(root, 'run.lock', lo());
  let fired = 0;
  const restore = patch(fs, 'openSync', (orig) => function (...a) {
    if (String(a[0]).endsWith('ledger.jsonl') && a[1] === 'r' && fired++ === 0) {
      fs.writeFileSync(lockFile(root), JSON.stringify(mkRec({ pid: process.pid }))); // another holder took over
    }
    return orig.apply(this, a);
  });
  try {
    await throwsTcb(() => ap(root, h), 'lock-lost', 75);
  } finally {
    restore();
  }
  assert.equal(fired >= 1, true, 'the tail was read');
  assert.deepEqual(fs.readFileSync(ledgerPath(root)), before, 'the ledger is unchanged');
  await h.release();
});
rt('T50b writeTasks re-checks the lock after reading the rev: lost there, it is lock-lost 75 and writes nothing', async (root) => {
  await seedRows(root, [mkRow()]);
  const cur = await lib.readTasks(root);
  const before = fs.readFileSync(tasksFile(root));
  const prevBefore = fs.existsSync(tasksFile(root) + '.prev') ? fs.readFileSync(tasksFile(root) + '.prev') : null;
  const h = await lib.acquireLock(root, 'run.lock', lo());
  let fired = 0;
  const restore = patch(fs, 'readFileSync', (orig) => function (...a) {
    if (String(a[0]).endsWith('tasks.json') && fired++ === 0) {
      fs.writeFileSync(lockFile(root), JSON.stringify(mkRec({ pid: process.pid })));
    }
    return orig.apply(this, a);
  });
  try {
    await throwsTcb(() => lib.writeTasks(root, h, { schema_version: 1, rev: cur.rev, tasks: [] }, { expectRev: cur.rev }), 'lock-lost', 75);
  } finally {
    restore();
  }
  assert.equal(fired >= 1, true, 'the rev was read');
  assert.deepEqual(fs.readFileSync(tasksFile(root)), before);
  const prevAfter = fs.existsSync(tasksFile(root) + '.prev') ? fs.readFileSync(tasksFile(root) + '.prev') : null;
  assert.deepEqual(prevAfter, prevBefore);
  await h.release();
});
rt('T37 withRunLock runs fn under the lock for the current ce, refuses another ce without calling fn, and always releases', async (root) => {
  let called = 0;
  await lib.withRunLock(root, { script: 'test', ce: 2, proc: fproc(), now: NOW }, async (h) => {
    called++;
    assert.ok(fs.existsSync(lockFile(root)));
    await h.assertHeld();
  });
  assert.equal(called, 1);
  assert.equal(fs.existsSync(lockFile(root)), false);
  await throwsTcb(
    () => lib.withRunLock(root, { script: 'test', ce: 3, proc: fproc(), now: NOW }, () => { called++; }),
    'stale-ce',
    64,
  );
  assert.equal(called, 1, 'fn was not called');
  assert.equal(fs.existsSync(lockFile(root)), false, 'released after the refusal');
  const e = await tcbErr(() => lib.withRunLock(root, { script: 'test', ce: 2, proc: fproc(), now: NOW }, () => { throw new Error('inner-marker'); }));
  assert.ok(String(e.message).includes('inner-marker'));
  assert.equal(fs.existsSync(lockFile(root)), false, 'released after fn threw');
}, { ce: 2 });
rt('T38 checkCe: a missing coord.json is no-coordinator 2, an unparseable one table-corrupt 67, another ce stale-ce 64', async (root) => {
  await lib.checkCe(root, 1);
  await throwsTcb(() => lib.checkCe(root, 2), 'stale-ce', 64);
  fs.writeFileSync(P(root, 'run', 'coord.json'), 'not json {');
  await throwsTcb(() => lib.checkCe(root, 1), 'table-corrupt', 67);
  fs.rmSync(P(root, 'run', 'coord.json'));
  await throwsTcb(() => lib.checkCe(root, 1), 'no-coordinator', 2);
});

// ================================================================== Ledger (4.5)
rt('T39 the first ledger line has seq 1 and prev 64 zeros, the second links to it, and each hash recomputes', async (root) => {
  const { l1, l2 } = await withLock(root, async (h) => ({
    l1: await ap(root, h, { kind: 'plan', data: { added: ['a'] }, task: undefined, epoch: undefined }),
    l2: await ap(root, h, { kind: 'plan', data: { added: ['b'] }, task: 'f1-research', epoch: 1 }),
  }));
  assert.equal(l1.seq, 1);
  assert.equal(l1.prev, Z64);
  assert.equal(l2.seq, 2);
  assert.equal(l2.prev, l1.hash);
  for (const l of [l1, l2]) {
    const { hash, ...rest } = l;
    assert.equal(hash, sha(l.prev + lib.canonicalize(rest)));
  }
  assert.deepEqual(await ledger(root), JSON.parse(JSON.stringify([l1, l2])));
  assert.equal((await lib.verifyLedger(await ledger(root))).ok, true);
});
rt('T40 each append pushes its seq to ctx.ledgerSeq and carries writer, writer_sha, ts, ce, kind, task, epoch and data', async (root) => {
  const ctx = { script: 'my-script', writerSha: 'a'.repeat(64), ledgerSeq: [] };
  await withLock(root, async (h) => {
    await ap(root, h, { ctx, ce: 4, kind: 'event', task: 'f1-research', epoch: 2, data: { class: 'x' }, now: '2026-11-17T11:11:11.000Z' });
    await ap(root, h, { ctx, ce: 4, kind: 'plan' });
  });
  assert.deepEqual(ctx.ledgerSeq, [1, 2]);
  const [l] = await ledger(root);
  assert.equal(l.writer, 'my-script');
  assert.equal(l.writer_sha, 'a'.repeat(64));
  assert.equal(l.ts, '2026-11-17T11:11:11.000Z');
  assert.equal(l.ce, 4);
  assert.equal(l.kind, 'event');
  assert.equal(l.task, 'f1-research');
  assert.equal(l.epoch, 2);
  assert.deepEqual(l.data, { class: 'x' });
});
rt('T41 a ledger kind outside LEDGER_KINDS is usage 66 and writes nothing', async (root) => {
  await withLock(root, async (h) => {
    await throwsTcb(() => ap(root, h, { kind: 'not-a-kind' }), 'usage', 66);
  });
  assert.equal(fs.existsSync(ledgerPath(root)) ? fs.readFileSync(ledgerPath(root)).length : 0, 0);
});
rt('T42 appending without holding the lock is lock-lost 75', async (root) => {
  const h = await lib.acquireLock(root, 'run.lock', lo());
  await h.release();
  await throwsTcb(() => ap(root, h), 'lock-lost', 75);
  assert.equal(fs.existsSync(ledgerPath(root)) ? fs.readFileSync(ledgerPath(root)).length : 0, 0);
});
rt('T43 a torn last line goes to ledger.jsonl.corrupt, a torn-tail line comes first, then the requested line, and the chain verifies', async (root) => {
  await appendMany(root, [{ data: { added: ['a'] } }, { data: { added: ['b'] } }]);
  fs.appendFileSync(ledgerPath(root), '{"seq":3,"pr');
  await appendMany(root, [{ kind: 'plan', data: { added: ['c'] } }]);
  const r = await lib.readLedger(root);
  assert.equal(r.torn, null);
  assert.equal(r.lines.length, 4);
  assert.equal(r.lines[2].kind, 'torn-tail');
  assert.ok('bytes' in r.lines[2].data);
  assert.equal(r.lines[3].kind, 'plan');
  assert.equal(r.lines[3].seq, 4);
  assert.equal((await lib.verifyLedger(r.lines)).ok, true);
  assert.ok(fs.readFileSync(ledgerPath(root) + '.corrupt', 'utf8').includes('{"seq":3,"pr'));
});
rt('T44 a tail line whose hash does not recompute makes append throw ledger-broken 3 and leaves the file unchanged', async (root) => {
  await appendMany(root, [{ data: { added: ['a'] } }, { data: { added: ['zzmarker'] } }]);
  const text = fs.readFileSync(ledgerPath(root), 'utf8');
  assert.ok(text.includes('zzmarker'));
  fs.writeFileSync(ledgerPath(root), text.replace('zzmarker', 'zzmarkeX'));
  const before = fs.readFileSync(ledgerPath(root));
  await withLock(root, async (h) => {
    await throwsTcb(() => ap(root, h), 'ledger-broken', 3);
  });
  assert.deepEqual(fs.readFileSync(ledgerPath(root)), before);
});
function chain(n) {
  const lines = [];
  let prev = Z64;
  for (let i = 1; i <= n; i++) {
    const body = { seq: i, prev, ts: NOW, ce: 1, writer: 'test', writer_sha: '1'.repeat(64), kind: 'plan', data: { added: [`t${i}`] } };
    const hash = sha(prev + lib.canonicalize(body));
    lines.push({ ...body, hash });
    prev = hash;
  }
  return lines;
}
function rehash(lines, from) {
  for (let i = from; i < lines.length; i++) {
    lines[i].prev = i ? lines[i - 1].hash : Z64;
    const { hash, ...body } = lines[i];
    lines[i].hash = sha(lines[i].prev + lib.canonicalize(body));
  }
}
test('T45 verifyLedger reports ok false with brokenAt for an edit, a deletion, a swap and a relink; a fully recomputed chain passes', async () => {
  assert.equal((await lib.verifyLedger(chain(5))).ok, true);
  const edited = chain(5);
  edited[2].data.added = ['tampered'];
  const a = await lib.verifyLedger(edited);
  assert.equal(a.ok, false);
  assert.ok([2, 3].includes(a.brokenAt), `brokenAt ${a.brokenAt}`);
  const deleted = chain(5);
  deleted.splice(2, 1);
  assert.equal((await lib.verifyLedger(deleted)).ok, false);
  const swapped = chain(5);
  [swapped[1], swapped[2]] = [swapped[2], swapped[1]];
  assert.equal((await lib.verifyLedger(swapped)).ok, false);
  const relinked = chain(5);
  relinked[2].data.added = ['rewritten'];
  // recompute line 3's own hash only: line 4's prev no longer matches
  const { hash: _h, ...body } = relinked[2];
  relinked[2].hash = sha(body.prev + lib.canonicalize(body));
  const c = await lib.verifyLedger(relinked);
  assert.equal(c.ok, false);
  assert.ok([3, 4].includes(c.brokenAt), `brokenAt ${c.brokenAt}`);
  const full = chain(5);
  full[2].data.added = ['rewritten'];
  rehash(full, 2);
  assert.equal((await lib.verifyLedger(full)).ok, true, 'tamper-evident only against a noted head (R31)');
});
// spec/lib.md T46 names 8 processes of 50 lines; the machine limit (at most four Node processes: the
// runner, this file and two workers) makes it 2 processes of 200 lines, the same 400 contended lines.
rt('T46 two processes each append 200 lines through withRunLock: 400 lines, seq 1..400, no gap or duplicate', async (root) => {
  const go = P(root, 'go');
  const kids = [];
  for (let i = 0; i < 2; i++) {
    const c = spawn(process.execPath, [path.join(FIX, 'append-worker.mjs'), LIB_URL, root, String(i), '200', go], { stdio: ['ignore', 'pipe', 'pipe'] });
    const k = { out: '', err: '' };
    c.stdout.on('data', (x) => (k.out += x));
    c.stderr.on('data', (x) => (k.err += x));
    k.closed = new Promise((res) => c.on('close', (code) => res(code)));
    kids.push(k);
  }
  fs.writeFileSync(go, '1');
  const codes = await Promise.all(kids.map((k) => k.closed));
  codes.forEach((c, i) => assert.equal(c, 0, `worker ${i}: ${kids[i].err}`));
  const lines = await ledger(root);
  assert.equal(lines.length, 400);
  lines.forEach((l, i) => assert.equal(l.seq, i + 1));
  assert.equal((await lib.verifyLedger(lines)).ok, true);
  const per = {};
  for (const l of lines) per[l.data.worker] = (per[l.data.worker] || 0) + 1;
  assert.deepEqual(Object.values(per), Array(2).fill(200));
  const seen = kids.flatMap((k) => JSON.parse(k.out.trim().split('\n').pop()).seqs);
  assert.deepEqual([...seen].sort((a, b) => a - b), lines.map((l) => l.seq));
}, {}, { timeout: 280000 });
rt('T47 ledgerHead of an empty or absent ledger is seq 0 and 64 zeros, otherwise the last line', async (root) => {
  assert.deepEqual(await lib.ledgerHead(root), { seq: 0, hash: Z64 });
  fs.writeFileSync(ledgerPath(root), '');
  assert.deepEqual(await lib.ledgerHead(root), { seq: 0, hash: Z64 });
  const [, l2] = await appendMany(root, [{}, {}]);
  assert.deepEqual(await lib.ledgerHead(root), { seq: 2, hash: l2.hash });
});
test('T48 scriptSha equals the sha256 of the file bytes', async () => {
  assert.equal(await lib.scriptSha(import.meta.url), sha(fs.readFileSync(fileURLToPath(import.meta.url))));
});

// ================================================================== Task table and fence (4.6)
rt('T49 readTasks throws table-corrupt 67 on a missing file, bad JSON and a row violating the schema', async (root) => {
  await seedRows(root, [mkRow()]);
  assert.equal((await lib.readTasks(root)).tasks.length, 1);
  fs.rmSync(tasksFile(root));
  await throwsTcb(() => lib.readTasks(root), 'table-corrupt', 67);
  fs.writeFileSync(tasksFile(root), '{not json');
  await throwsTcb(() => lib.readTasks(root), 'table-corrupt', 67);
  wj(tasksFile(root), { schema_version: 1, rev: 3, tasks: [{ ...strip(mkRow(), STRIP_NULLS), step: 'running' }] });
  await throwsTcb(() => lib.readTasks(root), 'table-corrupt', 67);
});
rt('T50 writeTasks with the current rev writes rev + 1, keeps the old file as .prev, and refuses an invalid table', async (root) => {
  await seedRows(root, [mkRow()]);
  const before = fs.readFileSync(tasksFile(root));
  const cur = await lib.readTasks(root);
  const next = { schema_version: 1, rev: cur.rev, tasks: [...cur.tasks, strip(mkRow({ task: 'f1-other' }), STRIP_NULLS)] };
  const rev = await withLock(root, (h) => lib.writeTasks(root, h, next, { expectRev: cur.rev }));
  assert.equal(rev, cur.rev + 1);
  const now = await lib.readTasks(root);
  assert.equal(now.rev, cur.rev + 1);
  assert.equal(now.tasks.length, 2);
  assert.deepEqual(fs.readFileSync(tasksFile(root) + '.prev'), before);
  const snap = fs.readFileSync(tasksFile(root));
  const snapPrev = fs.readFileSync(tasksFile(root) + '.prev');
  const bad = { schema_version: 1, rev: rev, tasks: [{ ...strip(mkRow(), STRIP_NULLS), step: 'running' }] };
  await throwsTcb(() => withLock(root, (h) => lib.writeTasks(root, h, bad, { expectRev: rev })), 'schema-invalid', 1);
  assert.deepEqual(fs.readFileSync(tasksFile(root)), snap);
  assert.deepEqual(fs.readFileSync(tasksFile(root) + '.prev'), snapPrev);
});
rt('T51 writeTasks with a stale expectRev throws rev-moved 65 and writes nothing', async (root) => {
  await seedRows(root, [mkRow()]);
  const cur = await lib.readTasks(root);
  const before = fs.readFileSync(tasksFile(root));
  await throwsTcb(
    () => withLock(root, (h) => lib.writeTasks(root, h, { schema_version: 1, rev: cur.rev, tasks: [] }, { expectRev: cur.rev - 1 })),
    'rev-moved',
    65,
  );
  assert.deepEqual(fs.readFileSync(tasksFile(root)), before);
});
rt('T52 updateRow refuses an unknown task (no-task 1), a wrong epoch (65) and a step outside steps (wrong-step 65), changing nothing', async (root) => {
  await seedRows(root, [stoppedRow()]);
  const before = fs.readFileSync(tasksFile(root));
  const same = (r) => r;
  await throwsTcb(() => withLock(root, (h) => lib.updateRow(root, h, { task: 'nope' }, same)), 'no-task', 1);
  await throwsTcb(() => withLock(root, (h) => lib.updateRow(root, h, { task: 'f1-research', epoch: 9 }, (r) => ({ ...r, e_task: 5 }))), undefined, 65);
  const e = await throwsTcb(() => withLock(root, (h) => lib.updateRow(root, h, { task: 'f1-research', epoch: 1, steps: ['bound'] }, (r) => ({ ...r, e_task: 5 }))), 'wrong-step', 65);
  assert.equal(e.exit, 65);
  await throwsTcb(() => withLock(root, (h) => lib.updateRow(root, h, { task: 'f1-research', states: ['parked'] }, (r) => ({ ...r, e_task: 5 }))), 'wrong-step', 65);
  assert.deepEqual(fs.readFileSync(tasksFile(root)), before);
});
rt('T52b updateRow writes rev + 1 through mutate and stamps the row with that rev', async (root) => {
  await seedRows(root, [stoppedRow()]);
  const cur = await lib.readTasks(root);
  const r = await withLock(root, (h) => lib.updateRow(root, h, { task: 'f1-research', epoch: 1, steps: ['stopped'] }, (row) => ({ ...row, e_task: 2222 })));
  assert.equal(r.changed, true);
  assert.equal(r.rev, cur.rev + 1);
  assert.equal(r.row.e_task, 2222);
  assert.equal(r.row.updated_rev, r.rev);
  const now = await rowOf(root);
  assert.equal(now.e_task, 2222);
  assert.equal((await lib.readTasks(root)).rev, cur.rev + 1);
});
rt('T53 updateRow whose mutate returns an equal row writes nothing and returns changed false', async (root) => {
  await seedRows(root, [stoppedRow()]);
  const before = fs.readFileSync(tasksFile(root));
  const cur = await lib.readTasks(root);
  const r = await withLock(root, (h) => lib.updateRow(root, h, { task: 'f1-research' }, (row) => JSON.parse(JSON.stringify(row))));
  assert.equal(r.changed, false);
  assert.equal(r.rev, cur.rev);
  assert.deepEqual(fs.readFileSync(tasksFile(root)), before);
});
test('T53b attemptOf returns the entry of that epoch whatever its position, and an absent epoch is no-attempt 2', async () => {
  const row = mkRow({ epoch: 2, attempts: [att('f1-research', 2, { folder: 'two' }), att('f1-research', 1, { folder: 'one' })] });
  assert.equal((await lib.attemptOf(row, 2)).folder, 'two');
  assert.equal((await lib.attemptOf(row, 1)).folder, 'one');
  await throwsTcb(() => lib.attemptOf(row, 5), 'no-attempt', 2);
});
rt('T54 fence first on a planned row gives epoch 1, step stopped, state active, restarts 0 and a new attempt', async (root) => {
  await seedRows(root, [mkRow()]);
  const r = await doFence(root, { reason: 'first', expectEpoch: 0 });
  for (const row of [r.row, await rowOf(root)]) {
    assert.equal(row.epoch, 1);
    assert.equal(row.step, 'stopped');
    assert.equal(row.state, 'active');
    assert.equal(row.restarts, 0);
    assert.equal(row.reason, 'first');
    assert.equal(row.attempts.length, 1);
    assert.equal(row.attempts[0].epoch, 1);
  }
  assert.ok(!r.restartCharged);
});
rt('T54b fence cut or drop takes the no-attempt row; tainted is applied without readyCheck and counts like a stall', async (root) => {
  await seedRows(root, [
    mkRow({ task: 'f1-a' }),
    mkRow({ task: 'f1-b' }),
    stoppedRow('f1-c'),
    boundRow('f1-d'),
  ]);
  await doFence(root, { task: 'f1-a', reason: 'cut', expectEpoch: 0 });
  await doFence(root, { task: 'f1-b', reason: 'drop', expectEpoch: 0 });
  await doFence(root, { task: 'f1-c', reason: 'cut', expectEpoch: 1 });
  const a = await rowOf(root, 'f1-a');
  const b = await rowOf(root, 'f1-b');
  const c = await rowOf(root, 'f1-c');
  assert.equal(a.state, 'cut');
  assert.equal(a.epoch, 0);
  assert.equal(a.attempts.length, 0);
  assert.equal(a.step, 'stopped');
  assert.equal(b.state, 'dropped');
  assert.equal(b.epoch, 0);
  assert.equal(b.attempts.length, 0);
  assert.equal(c.state, 'cut');
  assert.equal(c.epoch, 1);
  assert.equal(c.attempts.length, 1);
  let called = 0;
  await doFence(root, { task: 'f1-d', reason: 'tainted', expectEpoch: 1, readyCheck: () => { called++; return true; } });
  assert.equal(called, 0, 'readyCheck is not called for tainted');
  const d = await rowOf(root, 'f1-d');
  assert.equal(d.epoch, 2);
  assert.equal(d.step, 'fenced');
  assert.equal(d.restarts, 1);
  assert.equal(d.fails[d.fails.length - 1].class, 'tainted');
});
rt('T55 two processes fencing the same epoch: one ends at e+1, the other gets 65', async (root) => {
  await seedRows(root, [boundRow()]);
  const go = P(root, 'go');
  const kids = [0, 1].map(() => {
    const c = spawn(process.execPath, [path.join(FIX, 'fence-worker.mjs'), LIB_URL, root, 'f1-research', '1', 'stall', go], { stdio: ['ignore', 'pipe', 'pipe'] });
    const k = { out: '', err: '' };
    c.stdout.on('data', (x) => (k.out += x));
    c.stderr.on('data', (x) => (k.err += x));
    k.closed = new Promise((res) => c.on('close', res));
    return k;
  });
  fs.writeFileSync(go, '1');
  await Promise.all(kids.map((k) => k.closed));
  const res = kids.map((k) => JSON.parse(k.out.trim().split('\n').pop()));
  assert.equal(res.filter((r) => r.ok).length, 1, JSON.stringify(res) + kids.map((k) => k.err).join(''));
  const lost = res.find((r) => !r.ok);
  assert.equal(lost.exit, 65);
  assert.equal((await rowOf(root)).epoch, 2);
}, {}, { timeout: 120000 });
rt('T55 a fence with the wrong expectEpoch throws 65 and changes nothing', async (root) => {
  await seedRows(root, [boundRow()]);
  const before = fs.readFileSync(tasksFile(root));
  await throwsTcb(() => doFence(root, { expectEpoch: 7 }), undefined, 65);
  assert.deepEqual(fs.readFileSync(tasksFile(root)), before);
});
rt('T56 a failure fence with readyCheck true throws ready-wins 5 and leaves the row unchanged', async (root) => {
  await seedRows(root, [boundRow()]);
  const before = fs.readFileSync(tasksFile(root));
  let called = 0;
  for (const reason of ['stall', 'hang', 'loop', 'crash']) {
    await throwsTcb(() => doFence(root, { reason, readyCheck: () => { called++; return true; } }), 'ready-wins', 5);
  }
  assert.equal(called, 4);
  assert.deepEqual(fs.readFileSync(tasksFile(root)), before);
});
rt('T57 a stall fence with restarts 0, R 1 and not host: epoch e+1, step fenced, restarts 1, a fails entry and restartCharged', async (root) => {
  await seedRows(root, [boundRow()]);
  const r = await doFence(root, { reason: 'stall', tick: 42 });
  const row = await rowOf(root);
  assert.equal(row.epoch, 2);
  assert.equal(row.step, 'fenced');
  assert.equal(row.reason, 'stall');
  assert.equal(row.restarts, 1);
  assert.equal(row.fails.length, 1);
  assert.equal(row.fails[0].class, 'stall');
  assert.equal(row.fails[0].host, false);
  assert.equal(row.fails[0].tick, 42);
  assert.equal(r.restartCharged, true);
  assert.ok(!r.limit);
});
rt('T58 a crash fence with host true does not charge a restart', async (root) => {
  await seedRows(root, [boundRow()]);
  const r = await doFence(root, { reason: 'crash', host: true, tick: 5 });
  const row = await rowOf(root);
  assert.equal(row.epoch, 2);
  assert.equal(row.restarts, 0);
  assert.equal(row.fails[0].host, true);
  assert.equal(row.fails[0].class, 'crash');
  assert.equal(r.restartCharged, false);
});
rt('T59 a failure fence at restarts = R is applied with limit true and restarts unchanged', async (root) => {
  await seedRows(root, [boundRow('f1-research', { restarts: 1 })]);
  const r = await doFence(root, { reason: 'stall', R: 1 });
  const row = await rowOf(root);
  assert.equal(row.epoch, 2);
  assert.equal(row.step, 'fenced');
  assert.equal(row.limit, true);
  assert.equal(r.limit, true);
  assert.equal(r.row.limit, true);
  assert.equal(row.restarts, 1);
});
rt('T60 handover and memory fences count toward Hmax: at the cap they throw hmax 1, below it the matching counter rises', async (root) => {
  await seedRows(root, [boundRow('f1-a', { handovers: 1, parks: 1 }), boundRow('f1-b', { handovers: 1, parks: 1 }), boundRow('f1-c'), boundRow('f1-d')]);
  const before = fs.readFileSync(tasksFile(root));
  await throwsTcb(() => doFence(root, { task: 'f1-a', reason: 'handover', Hmax: 2 }), 'hmax', 1);
  await throwsTcb(() => doFence(root, { task: 'f1-b', reason: 'memory', Hmax: 2 }), 'hmax', 1);
  assert.deepEqual(fs.readFileSync(tasksFile(root)), before);
  await doFence(root, { task: 'f1-c', reason: 'handover', Hmax: 2 });
  await doFence(root, { task: 'f1-d', reason: 'memory', Hmax: 2 });
  const c = await rowOf(root, 'f1-c');
  const d = await rowOf(root, 'f1-d');
  assert.equal(c.handovers, 1);
  assert.equal(c.parks, 0);
  assert.equal(c.epoch, 2);
  assert.equal(c.step, 'fenced');
  assert.equal(c.restarts, 0);
  assert.equal(d.parks, 1);
  assert.equal(d.handovers, 0);
});
rt('T61 fence records cut and spendAtFence in the fenced attempt', async (root) => {
  await seedRows(root, [boundRow()]);
  const cut = { files: { 'a.card.json': { len: 3, sha256: sha('abc') } }, ledger_seq: 4 };
  await doFence(root, { reason: 'stall', cut, spendAtFence: 777 });
  const a = await lib.attemptOf(await rowOf(root), 1);
  assert.deepEqual(a.cut, cut);
  assert.equal(a.spend_at_fence, 777);
});

// Staging cut
const keyIn = (obj, rel) => Object.keys(obj).find((k) => k === rel || k === `staging/${rel}`);
const put = (dir, rel, data) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), data);
};
dt('T62 stagingCut lists every file under staging with its length and sha256, sorted, without READY.json', async (d) => {
  const att1 = path.join(d, 'att');
  put(att1, 'staging/a.card.json', '{"x":1}');
  put(att1, 'staging/harvested/h1.card.json', 'héh');
  put(att1, 'staging/sub/dir/x.txt', 'xxx');
  put(att1, 'staging/zz.txt', '');
  put(att1, 'staging/READY.json', '{"kind":"ready"}');
  put(att1, 'in/brief.md', 'not staging');
  const cut = await lib.stagingCut(att1);
  const want = { 'a.card.json': '{"x":1}', 'harvested/h1.card.json': 'héh', 'sub/dir/x.txt': 'xxx', 'zz.txt': '' };
  assert.equal(Object.keys(cut.files).length, 4, Object.keys(cut.files).join(','));
  for (const [rel, data] of Object.entries(want)) {
    const k = keyIn(cut.files, rel);
    assert.ok(k, `${rel} is listed`);
    assert.equal(cut.files[k].len, Buffer.byteLength(data));
    assert.equal(cut.files[k].sha256, sha(Buffer.from(data)));
  }
  assert.ok(!Object.keys(cut.files).some((k) => k.endsWith('READY.json')));
  assert.deepEqual(Object.keys(cut.files), [...Object.keys(cut.files)].sort());
  assert.deepEqual(cut.links, []);
  const empty = path.join(d, 'att2');
  fs.mkdirSync(path.join(empty, 'staging'), { recursive: true });
  assert.deepEqual(await lib.stagingCut(empty), { files: {}, links: [] });
});
dt('T62b stagingCut puts a junction and a hard-linked file in links and reads nothing behind them', async (d, t) => {
  const a = path.join(d, 'att');
  const outside = path.join(d, 'outside');
  put(a, 'staging/plain.txt', 'plain');
  put(outside, 'inner/secret.txt', 'secret');
  put(outside, 'target.txt', 'target');
  if (!tryJunction(outside, path.join(a, 'staging', 'junc'))) return t.skip('cannot create a junction on this machine');
  const hard = tryHard(path.join(outside, 'target.txt'), path.join(a, 'staging', 'hl.txt'));
  try {
    const cut = await lib.stagingCut(a);
    assert.deepEqual(Object.keys(cut.files).map((k) => k.replace(/^staging\//, '')), ['plain.txt']);
    const links = cut.links.map((k) => k.replace(/^staging\//, '')).sort();
    assert.deepEqual(links, hard ? ['hl.txt', 'junc'] : ['junc']);
  } finally {
    rmLink(path.join(a, 'staging', 'junc'));
  }
});
dt('T63 readCutPrefix returns the first len bytes of appended files and lists rewritten, truncated or link-replaced files as mismatched', async (d, t) => {
  const a = path.join(d, 'att');
  const outside = path.join(d, 'outside.txt');
  put(a, 'staging/same.txt', 'unchanged');
  put(a, 'staging/grow.txt', 'hello world');
  put(a, 'staging/rewrite.txt', 'abcdef');
  put(a, 'staging/trunc.txt', 'longcontent');
  put(a, 'staging/linked.txt', 'linkedfile');
  fs.writeFileSync(outside, 'linkedfile');
  const cut = await lib.stagingCut(a);
  fs.appendFileSync(path.join(a, 'staging', 'grow.txt'), ' and more');
  fs.writeFileSync(path.join(a, 'staging', 'rewrite.txt'), 'abXdef');
  fs.writeFileSync(path.join(a, 'staging', 'trunc.txt'), 'long');
  fs.rmSync(path.join(a, 'staging', 'linked.txt'));
  const linked = tryHard(outside, path.join(a, 'staging', 'linked.txt'));
  const r = await lib.readCutPrefix(a, cut);
  const k = (rel) => keyIn(cut.files, rel);
  assert.equal(r.files[k('same.txt')].toString(), 'unchanged');
  assert.equal(r.files[k('grow.txt')].toString(), 'hello world');
  const mism = r.mismatched.map((x) => x.replace(/^staging\//, '')).sort();
  assert.deepEqual(mism, linked ? ['linked.txt', 'rewrite.txt', 'trunc.txt'] : ['rewrite.txt', 'trunc.txt']);
  for (const rel of ['rewrite.txt', 'trunc.txt']) assert.equal(r.files[k(rel)], undefined, `${rel} is not returned`);
  if (!linked) t.diagnostic('a hard link could not be made: the link-replaced case was not exercised');
  else assert.equal(r.files[k('linked.txt')], undefined);
});
dt('T64 readCutPrefix drops the partial last line of a .jsonl prefix', async (d) => {
  const a = path.join(d, 'att');
  put(a, 'staging/log.jsonl', '{"a":1}\n{"b');
  put(a, 'staging/whole.jsonl', '{"a":1}\n{"b":2}\n');
  const cut = await lib.stagingCut(a);
  fs.appendFileSync(path.join(a, 'staging', 'log.jsonl'), '":2}\n{"c":3}\n');
  fs.appendFileSync(path.join(a, 'staging', 'whole.jsonl'), '{"c":3}\n');
  const r = await lib.readCutPrefix(a, cut);
  const k = (rel) => keyIn(cut.files, rel);
  assert.equal(r.files[k('log.jsonl')].toString(), '{"a":1}\n');
  assert.equal(r.files[k('whole.jsonl')].toString(), '{"a":1}\n{"b":2}\n');
  assert.deepEqual(r.mismatched, []);
});

// ================================================================== Validator (4.7)
const ROOT_PATH = [''];
const VROWS = [
  ['type string', { type: 'string' }, 'a', 5, ['type'], ROOT_PATH],
  ['type integer', { type: 'integer' }, 3, 3.5, ['type'], ROOT_PATH],
  ['type list', { type: ['string', 'null'] }, null, 5, ['type'], ROOT_PATH],
  ['type object', { type: 'object' }, {}, [], ['type'], ROOT_PATH],
  ['enum', { enum: ['a', 'b'] }, 'a', 'c', ['enum'], ROOT_PATH],
  ['const', { const: 1 }, 1, 2, ['const'], ROOT_PATH],
  ['properties', { properties: { a: { type: 'string' } } }, { a: 'x' }, { a: 5 }, ['type'], ['/a']],
  ['required', { required: ['a'] }, { a: 1 }, {}, ['required'], ['', '/a']],
  ['additionalProperties false', { properties: { a: {} }, additionalProperties: false }, { a: 1 }, { a: 1, b: 2 }, ['additionalProperties'], ['', '/b']],
  ['additionalProperties schema', { additionalProperties: { type: 'integer' } }, { x: 1 }, { x: 's' }, ['type', 'additionalProperties'], ['/x']],
  ['patternProperties', { patternProperties: { '^x_': { type: 'integer' } } }, { x_a: 1, y: 's' }, { x_a: 's' }, ['type', 'patternProperties'], ['/x_a']],
  ['items', { items: { type: 'integer' } }, [1, 2], [1, 'a'], ['type', 'items'], ['/1']],
  ['minItems', { minItems: 2 }, [1, 2], [1], ['minItems'], ROOT_PATH],
  ['maxItems', { maxItems: 1 }, [1], [1, 2], ['maxItems'], ROOT_PATH],
  ['uniqueItems', { uniqueItems: true }, [{ a: 1, b: 2 }, { b: 3, a: 1 }], [{ a: 1, b: 2 }, { b: 2, a: 1 }], ['uniqueItems'], ROOT_PATH],
  ['minLength counts code points', { minLength: 2 }, '\u{1F600}\u{1F600}', '\u{1F600}', ['minLength'], ROOT_PATH],
  ['maxLength counts code points', { maxLength: 2 }, '\u{1F600}\u{1F600}', 'abc', ['maxLength'], ROOT_PATH],
  ['pattern with the u flag', { pattern: '^\\p{L}+$' }, '\u00e9', '1', ['pattern'], ROOT_PATH],
  ['minimum', { minimum: 1 }, 1, 0, ['minimum'], ROOT_PATH],
  ['maximum', { maximum: 5 }, 5, 6, ['maximum'], ROOT_PATH],
  ['exclusiveMinimum', { exclusiveMinimum: 0 }, 1, 0, ['exclusiveMinimum'], ROOT_PATH],
  ['anyOf', { anyOf: [{ type: 'string' }, { type: 'integer' }] }, 5, true, ['anyOf'], ROOT_PATH],
  ['oneOf (two matches fail)', { oneOf: [{ type: 'integer' }, { minimum: 0 }] }, -1, 5, ['oneOf'], ROOT_PATH],
  ['allOf', { allOf: [{ type: 'integer' }, { minimum: 3 }] }, 4, 2, ['allOf', 'minimum'], ROOT_PATH],
  ['$ref to #/$defs', { $defs: { pos: { type: 'integer', minimum: 1 } }, properties: { n: { $ref: '#/$defs/pos' } } }, { n: 2 }, { n: 0 }, ['minimum', '$ref'], ['/n']],
];
for (const [name, schema, good, bad, kws, paths] of VROWS) {
  test(`T65 keyword ${name} accepts a conforming value and rejects a violating one with its pointer and keyword`, async () => {
    const g = await lib.validate(schema, good, {});
    assert.equal(g.ok, true, JSON.stringify(g.errors));
    assert.deepEqual(g.errors, []);
    const b = await lib.validate(schema, bad, {});
    assert.equal(b.ok, false);
    assert.ok(b.errors.length >= 1);
    assert.ok(b.errors.some((e) => kws.includes(e.keyword) && paths.includes(e.path)), `errors: ${JSON.stringify(b.errors)}`);
    assert.ok(b.errors.every((e) => typeof e.message === 'string' && typeof e.path === 'string' && typeof e.keyword === 'string'));
  });
}
rt('T66 a $ref to <name>.schema.json#/$defs/x resolves from tcb/schemas; a missing file or def is an error, not a crash', async (root) => {
  const dir = P(root, 'tcb', 'schemas');
  wj(P(dir, 'zz-a.schema.json'), {
    'x-version': 1,
    type: 'object',
    properties: { schema_version: { type: 'integer' }, s: { $ref: 'zz-b.schema.json#/$defs/x' } },
    required: ['schema_version'],
  });
  wj(P(dir, 'zz-b.schema.json'), { 'x-version': 1, $defs: { x: { type: 'string', minLength: 1 } } });
  wj(P(dir, 'zz-c.schema.json'), { 'x-version': 1, type: 'object', properties: { s: { $ref: 'zz-missing.schema.json#/$defs/x' } } });
  wj(P(dir, 'zz-d.schema.json'), { 'x-version': 1, type: 'object', properties: { s: { $ref: 'zz-b.schema.json#/$defs/nope' } } });
  assert.equal((await lib.loadSchema(root, 'zz-b'))['x-version'], 1);
  await lib.checkFormat(root, 'zz-a', { schema_version: 1, s: 'ok' });
  const e = await throwsTcb(() => lib.checkFormat(root, 'zz-a', { schema_version: 1, s: 5 }), 'schema-invalid', 1);
  const errs = Array.isArray(e.detail) ? e.detail : e.detail && e.detail.errors;
  assert.ok(Array.isArray(errs) && errs.some((x) => x.path === '/s'), JSON.stringify(e.detail));
  for (const name of ['zz-c', 'zz-d']) {
    const err = await tcbErr(() => lib.checkFormat(root, name, { schema_version: 1, s: 'x' }));
    assert.ok(!(err instanceof TypeError), `${name}: crashed with ${err.stack}`);
    assert.equal(err.code, 'schema-invalid', `${name}: ${err.code} ${err.message}`);
  }
});
test('T67 x-maxWords accepts 15 words and rejects 16, splitting on whitespace runs and ignoring the ends', async () => {
  const schema = { type: 'string', 'x-maxWords': 15 };
  const words = (n, sep = ' ') => Array.from({ length: n }, (_, i) => `w${i}`).join(sep);
  assert.equal((await lib.validate(schema, words(15), {})).ok, true);
  const b = await lib.validate(schema, words(16), {});
  assert.equal(b.ok, false);
  assert.ok(b.errors.some((e) => e.keyword === 'x-maxWords'), JSON.stringify(b.errors));
  assert.equal((await lib.validate(schema, `  ${words(15, ' \n\t  ')}  `, {})).ok, true);
  assert.equal((await lib.validate(schema, `  ${words(16, '   ')}\n`, {})).ok, false);
  assert.equal((await lib.validate(schema, '', {})).ok, true);
});
test('T67b x-maxWords is not bypassed by invisible separators, unspaced scripts or one endless token (LR-7)', async () => {
  const schema = { type: 'string', 'x-maxWords': 15 };
  const bad = async (v, why) => {
    const r = await lib.validate(schema, v, {});
    assert.equal(r.ok, false, why);
    assert.ok(r.errors.some((e) => e.keyword === 'x-maxWords'), `${why}: ${JSON.stringify(r.errors)}`);
  };
  const toks = (n, sep) => Array.from({ length: n }, (_, i) => `t${i}`).join(sep);
  await bad(toks(500, '​'), 'words joined by U+200B');
  await bad(toks(500, '⁠'), 'words joined by U+2060');
  assert.equal(lib.wordCount(toks(16, '​')), 16);
  await bad('漢'.repeat(16), 'sixteen Han characters');
  await bad('あ'.repeat(16), 'sixteen Hiragana characters');
  assert.equal(lib.wordCount('漢字 ok'), 3);
  assert.equal((await lib.validate(schema, '漢'.repeat(15), {})).ok, true);
  await bad('x'.repeat(15 * lib.MAX_CODEPOINTS_PER_WORD + 1), 'one token longer than the bound');
  assert.equal((await lib.validate(schema, 'x'.repeat(15 * lib.MAX_CODEPOINTS_PER_WORD), {})).ok, true);
  // ordinary text keeps its count
  assert.equal(lib.wordCount('  the  quick\tbrown\nfox  '), 4);
  assert.equal(lib.wordCount(''), 0);
});
test('T68 an unknown keyword throws schema-keyword 70; the ignored keywords do not', async () => {
  await throwsTcb(() => lib.validate({ type: 'string', format: 'email' }, 'a', {}), 'schema-keyword', 70);
  await throwsTcb(() => lib.validate({ dependentRequired: { a: ['b'] } }, { a: 1 }, {}), 'schema-keyword', 70);
  const r = await lib.validate({ $schema: 'x', $id: 'y', title: 't', description: 'd', 'x-version': 1, type: 'string' }, 'a', {});
  assert.equal(r.ok, true);
});
rt('T69 checkFormat throws schema-version 1 for another schema_version and schema-invalid 1 with the errors otherwise', async (root) => {
  const dir = P(root, 'tcb', 'schemas');
  wj(P(dir, 'zz-a.schema.json'), {
    'x-version': 1,
    type: 'object',
    properties: { schema_version: { type: 'integer' }, n: { type: 'integer' } },
    required: ['schema_version', 'n'],
    additionalProperties: false,
  });
  await lib.checkFormat(root, 'zz-a', { schema_version: 1, n: 1 });
  await throwsTcb(() => lib.checkFormat(root, 'zz-a', { schema_version: 2, n: 1 }), 'schema-version', 1);
  const e = await throwsTcb(() => lib.checkFormat(root, 'zz-a', { schema_version: 1, n: 'x' }), 'schema-invalid', 1);
  const errs = Array.isArray(e.detail) ? e.detail : e.detail && e.detail.errors;
  assert.ok(Array.isArray(errs) && errs.length >= 1, JSON.stringify(e.detail));
  await throwsTcb(() => lib.checkFormat(root, 'zz-a', { schema_version: 1 }), 'schema-invalid', 1);
});
rt('T70 every schema the library writes validates its example and rejects it with one extra property', async (root, t) => {
  const EX = JSON.parse(fs.readFileSync(path.join(FIX, 'schema-examples.json'), 'utf8'));
  EX['reader-result'] = { schema_version: 1, cards: [EX.card], skipped: [{ url: 'https://example.org/b', reason: 'blocked' }] };
  await seedRows(root, [mkRow()]);
  EX.tasks = rdj(tasksFile(root));
  for (const [name, fx] of Object.entries(EX)) {
    await t.test(`schema ${name}`, async () => {
      assert.ok(fs.existsSync(P(root, 'tcb', 'schemas', `${name}.schema.json`)), `tcb/schemas/${name}.schema.json is missing`);
      await lib.checkFormat(root, name, fx);
      const e = await throwsTcb(() => lib.checkFormat(root, name, { ...fx, status: 'extra' }), 'schema-invalid', 1);
      assert.ok(e.detail !== undefined);
    });
  }
});

// ================================================================== Transcript parser (4.8)
const parsed = async (dir, recs, tail = '', opts = {}) => {
  const f = path.join(dir, `t${++UUID}.jsonl`);
  writeLines(f, recs, tail);
  return { f, p: await lib.parseTranscript(f, opts) };
};
dt('T71 records sharing one message.id are one model call with that usage; another id is another call', async (d) => {
  const U1 = US(10, 5, 100, 20);
  const { p } = await parsed(d, [
    asst('msg_1', { type: 'thinking', thinking: 'hm' }, U1),
    asst('msg_1', textB('answer'), U1),
    asst('msg_1', toolB('toolu_1', 'Read', { file_path: '/x' }), U1),
    resultRec('toolu_1', 'file contents'),
    asst('msg_2', textB('second'), US(1, 2, 3, 4)),
  ]);
  assert.equal(p.calls.length, 2);
  assert.equal(p.calls[0].id, 'msg_1');
  assert.deepEqual(p.calls[0].usage, { input: 10, cache_read: 100, cache_write: 20, output: 5 });
  assert.equal(p.calls[0].context, 130);
  assert.equal(p.calls[0].total, 135);
  assert.equal(p.calls[0].model, 'claude-test');
  assert.ok(Array.isArray(p.calls[0].tools) && p.calls[0].tools.length === 1);
  assert.equal(p.calls[1].id, 'msg_2');
  assert.deepEqual(p.calls[1].usage, { input: 1, cache_read: 3, cache_write: 4, output: 2 });
  assert.equal(p.toolUses.length, 1);
  assert.equal(p.sessionId, SID);
  assert.equal(p.cwd, 'C:\\tcbtest\\wt\\f1-research-e1');
  // the usage is taken from the last record of the id
  const grow = await parsed(d, [
    asst('msg_9', { type: 'thinking', thinking: 'h' }, US(10, 1, 100, 20)),
    asst('msg_9', textB('t'), US(10, 9, 100, 20)),
  ]);
  assert.equal(grow.p.calls.length, 1);
  assert.equal(grow.p.calls[0].usage.output, 9);
});
dt('T72 synthetic records are not calls but their tool uses are listed', async (d) => {
  const { p } = await parsed(d, [
    asst('msg_s', toolB('toolu_s', 'Bash', { command: 'echo hi' }), US(0, 0, 0, 0), { model: '<synthetic>' }),
    asst('msg_r', textB('real'), US(5, 5, 5, 5)),
  ]);
  assert.equal(p.calls.length, 1);
  assert.equal(p.calls[0].id, 'msg_r');
  assert.ok(p.toolUses.some((u) => u.id === 'toolu_s' && u.name === 'Bash'));
});
dt('T73 usage fields map to input, cache_read, cache_write, output; context and total add up; a missing field is 0 and marks the call partial', async (d) => {
  const { p } = await parsed(d, [
    asst('m_full', textB('a'), US(7, 3, 11, 13)),
    asst('m_part', textB('b'), { input_tokens: 7, output_tokens: 3 }),
  ]);
  const [full, part] = p.calls;
  assert.deepEqual(full.usage, { input: 7, cache_read: 11, cache_write: 13, output: 3 });
  assert.equal(full.context, 31);
  assert.equal(full.total, 34);
  assert.ok(!full.partial);
  assert.deepEqual(part.usage, { input: 7, cache_read: 0, cache_write: 0, output: 3 });
  assert.equal(part.context, 7);
  assert.equal(part.total, 10);
  assert.equal(!!part.partial, true);
});
dt('T74 a tool use carries sig = name:first 16 hex of sha256(canonical input), equal whatever the key order', async (d) => {
  const { p } = await parsed(d, [
    asst('m1', toolB('t1', 'Read', { file_path: '/a', limit: 5 }), US(1, 1, 1, 1)),
    asst('m2', toolB('t2', 'Read', { limit: 5, file_path: '/a' }), US(1, 1, 1, 1)),
    asst('m3', toolB('t3', 'Read', { file_path: '/b', limit: 5 }), US(1, 1, 1, 1)),
  ]);
  const [a, b, c] = p.toolUses;
  assert.equal(a.sig, `Read:${sha(lib.canonicalize({ file_path: '/a', limit: 5 })).slice(0, 16)}`);
  assert.equal(a.sig, b.sig);
  assert.notEqual(a.sig, c.sig);
  assert.equal(a.name, 'Read');
  assert.equal(a.id, 't1');
  assert.deepEqual(a.input, { file_path: '/a', limit: 5 });
  assert.ok(a.access && a.access.kind === 'read');
});
test('T75 toolAccess gives the kind and fields for every tool name', async () => {
  const acc = (n, i) => lib.toolAccess(n, i);
  const cases = [
    ['Read', { file_path: 'C:/a.txt' }, { kind: 'read', paths: ['C:/a.txt'] }],
    ['Glob', { pattern: '*.js' }, { kind: 'read', paths: ['.'] }],
    ['Glob', { pattern: '*.js', path: 'C:/src' }, { kind: 'read', paths: ['C:/src'] }],
    ['Grep', { pattern: 'x' }, { kind: 'read', paths: ['.'] }],
    ['Grep', { pattern: 'x', path: 'C:/src' }, { kind: 'read', paths: ['C:/src'] }],
    ['Write', { file_path: 'C:/w.txt', content: 'x' }, { kind: 'write', paths: ['C:/w.txt'] }],
    ['Edit', { file_path: 'C:/e.txt' }, { kind: 'write', paths: ['C:/e.txt'] }],
    ['MultiEdit', { file_path: 'C:/m.txt' }, { kind: 'write', paths: ['C:/m.txt'] }],
    ['NotebookEdit', { notebook_path: 'C:/n.ipynb' }, { kind: 'write', paths: ['C:/n.ipynb'] }],
    ['WebFetch', { url: 'https://example.org/x' }, { kind: 'fetch', urls: ['https://example.org/x'] }],
    ['WebSearch', { query: 'a query' }, { kind: 'search', query: 'a query' }],
    ['Bash', { command: 'echo 1' }, { kind: 'exec', command: 'echo 1' }],
    ['PowerShell', { command: 'Get-Date' }, { kind: 'exec', command: 'Get-Date' }],
    ['Agent', { subagent_type: 'reader', prompt: 'p' }, { kind: 'agent', agentType: 'reader' }],
    ['Task', { subagent_type: 'checker', prompt: 'p' }, { kind: 'agent', agentType: 'checker' }],
    ['SomethingElse', { a: 1 }, { kind: 'other' }],
    ['Read', { file_path: 5 }, { kind: 'read', paths: [] }],
    ['Read', {}, { kind: 'read', paths: [] }],
    ['Write', { file_path: { x: 1 } }, { kind: 'write', paths: [] }],
  ];
  for (const [name, input, want] of cases) {
    const a = await acc(name, input);
    for (const [k, v] of Object.entries(want)) assert.deepEqual(a[k], v, `${name} ${JSON.stringify(input)}: ${k}`);
  }
});
dt('T76 tool results pair with their tool use by id, carry is_error, and their text is cut at 2000 characters', async (d) => {
  const { p } = await parsed(d, [
    asst('m1', toolB('toolu_a', 'Bash', { command: 'x' }), US(1, 1, 1, 1)),
    resultRec('toolu_a', 'x'.repeat(5000), true),
    asst('m2', toolB('toolu_b', 'Bash', { command: 'y' }), US(1, 1, 1, 1)),
    resultRec('toolu_b', [{ type: 'text', text: 'hello' }], false),
  ]);
  assert.equal(p.toolResults.length, 2);
  const a = p.toolResults.find((r) => r.toolUseId === 'toolu_a');
  const b = p.toolResults.find((r) => r.toolUseId === 'toolu_b');
  assert.equal(a.isError, true);
  assert.equal(a.text.length, 2000);
  assert.equal(b.isError, false);
  assert.equal(b.text, 'hello');
  assert.ok(p.toolUses.some((u) => u.id === a.toolUseId));
});
dt('T76b (fix-U2) a tool result carries the URLs of its full text as non-enumerable urls, also past the 2000-character cut', async (d) => {
  const late = 'https://late.test/a?b=1';
  const { p } = await parsed(d, [
    asst('m1', toolB('toolu_w', 'WebFetch', { url: 'https://early.test/', prompt: 'p' }), US(1, 1, 1, 1)),
    resultRec('toolu_w', 'see https://early.test/x then ' + 'y'.repeat(3000) + ` and ${late} twice ${late}.`, false),
  ]);
  const r = p.toolResults[0];
  assert.equal(r.text.length, 2000);
  assert.ok(!r.text.includes(late), 'the late URL lies past the cut');
  assert.deepEqual(r.urls, ['https://early.test/x', late], 'distinct, in order, trailing punctuation dropped');
  assert.equal(Object.keys(r).includes('urls'), false, 'urls is not enumerable');
});
dt('T77 structured holds the StructuredOutput tool-use input and the data of a structured_output attachment', async (d) => {
  const att1 = { ...base('attachment'), attachment: { type: 'structured_output', data: { b: 2 } } };
  const { p } = await parsed(d, [
    asst('m1', toolB('toolu_so', 'StructuredOutput', { a: 1 }), US(1, 1, 1, 1)),
    att1,
  ]);
  assert.equal(p.structured.length, 2);
  assert.deepEqual(p.structured[0].data, { a: 1 });
  assert.equal(p.structured[0].toolUseId, 'toolu_so');
  assert.deepEqual(p.structured[1].data, { b: 2 });
});
dt('T78 a torn last line is skipped with torn true, a bad middle line is counted and unknown record types are skipped', async (d) => {
  const recs = [
    asst('m1', textB('a'), US(1, 1, 1, 1)),
    'this is not json at all',
    { type: 'queue-operation', operation: 'enqueue', timestamp: tsOf(2), sessionId: SID },
    asst('m2', textB('b'), US(2, 2, 2, 2)),
  ];
  const tail = '{"type":"assistant","mess';
  const { f, p } = await parsed(d, recs, tail);
  assert.equal(p.torn, true);
  assert.equal(p.calls.length, 2);
  assert.equal(countOf(p.badLines), 1);
  const complete = fs.statSync(f).size - Buffer.byteLength(tail);
  assert.equal(p.endByte, complete);
  const clean = await parsed(d, [asst('m1', textB('a'), US(1, 1, 1, 1))]);
  assert.ok(!clean.p.torn);
  assert.equal(countOf(clean.p.badLines), 0);
});
dt('T78b turnEnds gives one entry per turn with the text of its last assistant record; a tool result does not end a turn', async (d) => {
  const { p } = await parsed(d, [
    asst('m1', toolB('t1', 'Read', { file_path: '/a' }), US(1, 1, 1, 1)),
    resultRec('t1', 'ok'),
    asst('m2', textB('one'), US(1, 1, 1, 1)),
    userRec('next please'),
    asst('m3', textB('two'), US(1, 1, 1, 1)),
  ]);
  assert.equal(p.turnEnds.length, 2);
  assert.equal(p.turnEnds[0].text, 'one');
  assert.equal(p.turnEnds[1].text, 'two');
  assert.ok(typeof p.turnEnds[0].ts === 'string');
});
const sumTotal = (calls) => calls.reduce((s, c) => s + c.total, 0);
dt('T79 parsing from a previous endByte returns only later calls; a call straddling it is returned again as continued with the full usage', async (d) => {
  const f = path.join(d, 'two.jsonl');
  const UA = US(5, 1, 10, 2);
  const UB = US(5, 9, 10, 2);
  writeLines(f, [asst('m1', textB('a'), US(1, 1, 1, 1)), asst('m2', { type: 'thinking', thinking: 'x' }, UA)]);
  const p1 = await lib.parseTranscript(f, {});
  assert.equal(p1.calls.length, 2);
  fs.appendFileSync(f, [asst('m2', textB('b'), UB), asst('m3', textB('c'), US(3, 3, 3, 3))].map((r) => JSON.stringify(r)).join('\n') + '\n');
  const p2 = await lib.parseTranscript(f, { fromByte: p1.endByte, lastCall: { id: 'm2', usage: p1.calls[1].usage } });
  assert.equal(p2.calls.length, 2);
  assert.equal(p2.calls[0].id, 'm2');
  assert.equal(p2.calls[0].continued, true);
  assert.deepEqual(p2.calls[0].usage, { input: 5, cache_read: 10, cache_write: 2, output: 9 });
  assert.equal(p2.calls[1].id, 'm3');
  assert.ok(!p2.calls[1].continued);
  const whole = await lib.parseTranscript(f, {});
  assert.deepEqual(whole.calls.map((c) => c.id), ['m1', 'm2', 'm3']);
  const twoPart = sumTotal(p1.calls) - p1.calls[1].total + sumTotal(p2.calls);
  assert.equal(twoPart, sumTotal(whole.calls));
  // a split on a call boundary: the next part's first call is new
  const g = path.join(d, 'boundary.jsonl');
  writeLines(g, [asst('a1', textB('a'), US(1, 1, 1, 1))]);
  const q1 = await lib.parseTranscript(g, {});
  fs.appendFileSync(g, JSON.stringify(asst('a2', textB('b'), US(2, 2, 2, 2))) + '\n');
  const q2 = await lib.parseTranscript(g, { fromByte: q1.endByte, lastCall: { id: 'a1', usage: q1.calls[0].usage } });
  assert.equal(q2.calls.length, 1);
  assert.equal(q2.calls[0].id, 'a2');
  assert.ok(!q2.calls[0].continued);
});
dt('T79b a 50 MB transcript parses in chunks under a small heap and a multi-byte character split at a chunk boundary is decoded intact', async (d) => {
  const f = path.join(d, 'big.jsonl');
  const BOUND = 48 * 1048576;
  const fd = fs.openSync(f, 'w');
  let off = 0;
  const wr = (s) => {
    const b = Buffer.from(s);
    fs.writeSync(fd, b);
    off += b.length;
  };
  const bulkText = 'x'.repeat(400000);
  let i = 0;
  while (off < BOUND - 2000000) wr(JSON.stringify(asst(`mb${i}`, textB(bulkText), US(1, 1, 1, 1), { ts: tsOf(i++) })) + '\n');
  const euroText = 'a' + '\u20ac'.repeat(200);
  const euro = JSON.stringify(asst('meuro', textB(euroText), US(2, 2, 2, 2), { ts: tsOf(i + 1) })) + '\n';
  const idx = Buffer.byteLength(euro.slice(0, euro.indexOf('\u20ac')));
  const padBase = '{"type":"queue-operation","pad":"';
  const padEnd = '"}\n';
  const L = BOUND - 1 - 300 - idx - off - Buffer.byteLength(padBase + padEnd);
  assert.ok(L > 0, 'the generator itself is sound');
  wr(padBase + 'p'.repeat(L) + padEnd);
  wr(euro);
  fs.closeSync(fd);
  assert.ok(fs.statSync(f).size > 50000000);
  const r = spawnSync(process.execPath, ['--max-old-space-size=64', path.join(FIX, 'parse-worker.mjs'), LIB_URL, f], { encoding: 'utf8', timeout: 240000 });
  assert.equal(r.status, 0, `the parse died under a 64 MB heap: ${r.stderr.slice(0, 500)}`);
  const out = JSON.parse(r.stdout.trim().split('\n').pop());
  assert.equal(out.calls, i + 1);
  assert.equal(out.last, euroText, 'the character split at the chunk boundary came out intact');
  assert.equal(out.torn, false);
  fs.rmSync(f);
}, { timeout: 280000 });
dt('T80 spendOf sums a session and its helpers; peak_context is the largest context, last_context the last main call by timestamp', async (d) => {
  const main = await parsed(d, [
    asst('c1', textB('a'), US(100, 10, 0, 0), { ts: tsOf(1) }),
    asst('c2', textB('b'), US(300, 10, 0, 0), { ts: tsOf(3) }),
    asst('c3', textB('c'), US(200, 10, 0, 0), { ts: tsOf(2) }),
  ]);
  const h1 = await parsed(d, [asst('h1', textB('x'), US(500, 10, 0, 0), { ts: tsOf(10), side: true })]);
  const h2 = await parsed(d, [asst('h2', textB('y'), { input_tokens: 50, output_tokens: 10 }, { ts: tsOf(11), side: true })]);
  const s = await lib.spendOf([main.p, h1.p, h2.p]);
  assert.equal(s.calls, 5);
  assert.equal(s.input, 100 + 300 + 200 + 500 + 50);
  assert.equal(s.output, 50);
  assert.equal(s.cache_read, 0);
  assert.equal(s.cache_write, 0);
  assert.equal(s.total, 1200);
  assert.equal(s.peak_context, 500);
  assert.equal(s.last_context, 300);
  assert.ok(s.partial, 'a helper call with missing fields makes the spend partial');
  const alone = await lib.spendOf([main.p]);
  assert.equal(alone.calls, 3);
  assert.ok(!alone.partial);
});
test('T81 loopRun gives the length of the trailing run of equal signatures', async () => {
  const u = (...s) => s.map((sig) => ({ sig }));
  assert.deepEqual(await lib.loopRun(u('a', 'b', 'b', 'b')), { sig: 'b', run: 3 });
  assert.deepEqual(await lib.loopRun(u('b', 'b', 'b', 'c')), { sig: 'c', run: 1 });
  assert.deepEqual(await lib.loopRun(u('a')), { sig: 'a', run: 1 });
});
test('T82 projectDirName turns : \\ / . _ and space into -', async () => {
  assert.equal(await lib.projectDirName('C:\\Users\\U\\runs\\wt\\f1-e2'), 'C--Users-U-runs-wt-f1-e2');
  assert.equal(await lib.projectDirName('C:/a_b c.d/e'), 'C--a-b-c-d-e');
});
test('T82 the harness names its project folders this way', { skip: 'needs the app: the real harness must be shown to name folders by this rule' }, () => {});
dt('T83 sessionTranscripts finds the main file in any project folder and every agent-*.jsonl below <id>/subagents/, sorted', async (d) => {
  const sid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const mk = (rel, body = '{}') => put(d, rel, body + '\n');
  mk(`projA/${sid}.jsonl`);
  mk(`projB/${sid}/subagents/agent-b.jsonl`);
  mk(`projB/${sid}/subagents/nested/deep/agent-a.jsonl`);
  mk(`projB/${sid}/subagents/other.jsonl`);
  mk(`projB/${sid}/subagents/agent-note.txt`);
  mk('projA/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jsonl');
  mk('projB/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/subagents/agent-z.jsonl');
  const r = await lib.sessionTranscripts(d, sid);
  assert.equal(norm(r.main), norm(path.join(d, 'projA', `${sid}.jsonl`)));
  const want = [path.join(d, 'projB', sid, 'subagents', 'agent-b.jsonl'), path.join(d, 'projB', sid, 'subagents', 'nested', 'deep', 'agent-a.jsonl')];
  assert.deepEqual(r.helpers.map(norm).sort(), want.map(norm).sort());
  assert.deepEqual([...r.helpers], [...r.helpers].sort(), 'helpers are sorted');
  assert.deepEqual(await lib.sessionTranscripts(d, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'), { main: null, helpers: [] });
});
dt('T84 transcriptsForFolder returns only files whose first cwd record names the folder, and scans shortened folder names', async (d) => {
  const folder = 'C:\\tcbtest\\wt\\f1-research-e1';
  const dir = await lib.projectDirName(folder);
  const w = (rel, recs) => writeLines(path.join(d, rel), recs);
  w(`${dir}/s1.jsonl`, [asst('m', textB('a'), US(1, 1, 1, 1), { cwd: 'C:\\TCBTEST\\WT\\F1-RESEARCH-E1', sid: 's1' })]);
  w(`${dir}/s2.jsonl`, [asst('m', textB('a'), US(1, 1, 1, 1), { cwd: 'C:\\tcbtest\\wt\\f1-research-e10', sid: 's2' })]);
  w(`${dir}/s3.jsonl`, [{ type: 'queue-operation', operation: 'enqueue', timestamp: tsOf(1), sessionId: 's3' }, asst('m', textB('a'), US(1, 1, 1, 1), { cwd: folder, sid: 's3' })]);
  const r = await lib.transcriptsForFolder(d, folder);
  assert.deepEqual(r.map((x) => x.sessionId).sort(), ['s1', 's3']);
  assert.ok(r.every((x) => fs.existsSync(x.path)));
  // a long folder: the exact project folder is absent, a folder starting with the first 100 characters is scanned
  const long = 'C:\\tcbtest\\wt\\' + 'segment-'.repeat(20) + 'end';
  const full = await lib.projectDirName(long);
  assert.ok(full.length > 100);
  w(`${full.slice(0, 100)}-hash123/L1.jsonl`, [asst('m', textB('a'), US(1, 1, 1, 1), { cwd: long, sid: 'L1' })]);
  w('zzz-other/L2.jsonl', [asst('m', textB('a'), US(1, 1, 1, 1), { cwd: long, sid: 'L2' })]);
  const r2 = await lib.transcriptsForFolder(d, long);
  assert.deepEqual(r2.map((x) => x.sessionId), ['L1']);
});
test('T84b urlKey is the sha256 of the normalised href', async () => {
  assert.equal(await lib.urlKey('HTTPS://Example.com/a'), sha('https://example.com/a'));
  assert.equal(await lib.urlKey('https://example.com'), sha('https://example.com/'));
});

// ================================================================== Process information (4.9)
const PS = 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
const SERIAL = { concurrency: false, timeout: 180000 };
async function waitDead(proc, pid, start, tries = 30) {
  for (let i = 0; i < tries; i++) {
    if ((await proc.alive(pid, start)) === false) return true;
    await sleepMs(300);
  }
  return false;
}
test('T85 realProc lists the test process with an exact-form start time and its command line; alive and boot behave', SERIAL, async () => {
  const proc = lib.realProc({ exe: PS });
  const list = await proc.list();
  assert.ok(Array.isArray(list));
  const me = list.find((x) => x.pid === process.pid);
  assert.ok(me, 'the test process is in the list');
  assert.match(me.start_time, ISO7);
  assert.match(me.cmdline, /node/i);
  assert.equal(typeof me.ppid, 'number');
  assert.equal(await proc.alive(process.pid, me.start_time), true);
  assert.equal(await proc.alive(process.pid, '2000-01-01T00:00:00.0000000Z'), false);
  // The own start time from the own clock lies within the two-second tolerance of what Windows
  // reports, and alive compares with that tolerance: one second off matches, five seconds do not.
  assert.ok(lib.sameStartTime(me.start_time, OWN_START()), `own clock ${OWN_START()} vs PowerShell ${me.start_time}`);
  assert.equal(await proc.alive(process.pid, OWN_START()), true);
  const shift = (s, sec) => new Date(Date.parse(s.slice(0, 23) + 'Z') + sec * 1000).toISOString().slice(0, 23) + s.slice(23);
  assert.equal(await proc.alive(process.pid, shift(me.start_time, 1)), true, 'one second apart matches');
  assert.equal(await proc.alive(process.pid, shift(me.start_time, -5)), false, 'five seconds apart does not');
  const b1 = await proc.boot();
  const b2 = await proc.boot();
  assert.match(b1, ISO7);
  assert.equal(b1, b2);
});
test('T85b a command line with a non-ASCII marker comes back intact', SERIAL, async () => {
  const s = await helpers.spawnSleeper({ args: ['\u00e9-marker-\u00e9'] });
  try {
    const list = await lib.realProc({ exe: PS }).list();
    const e = list.find((x) => x.pid === s.pid);
    assert.ok(e, 'the sleeper is listed');
    assert.ok(e.cmdline.includes('\u00e9-marker-\u00e9'), `cmdline was ${e.cmdline}`);
  } finally {
    await s.kill();
  }
});
test('T86 alive is true for a sleeper and false after it is killed', SERIAL, async () => {
  const proc = lib.realProc({ exe: PS });
  const s = await helpers.spawnSleeper({});
  try {
    assert.equal(await proc.alive(s.pid, s.start_time), true);
    await s.kill();
    assert.equal(await waitDead(proc, s.pid, s.start_time), true, 'the sleeper is gone');
  } finally {
    await s.kill();
  }
});
async function mkTree() {
  const code = `const {spawn}=require('node:child_process');const g=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});console.log(g.pid);setInterval(()=>{},1000)`;
  const child = spawn(process.execPath, ['-e', code], { stdio: ['ignore', 'pipe', 'ignore'] });
  const gpid = await new Promise((res) => child.stdout.once('data', (d) => res(Number(String(d).trim()))));
  const proc = lib.realProc({ exe: PS });
  const list = await proc.list();
  const c = list.find((x) => x.pid === child.pid);
  const g = list.find((x) => x.pid === gpid);
  assert.ok(c && g, 'both processes are listed');
  return {
    proc,
    cinfo: { pid: c.pid, start_time: c.start_time },
    ginfo: { pid: g.pid, start_time: g.start_time },
    cleanup: () => {
      try { process.kill(gpid); } catch { /* gone */ }
      try { child.kill(); } catch { /* gone */ }
    },
  };
}
test('T87 killOwnTree ends the grandchild and the child by verified start time and kills nothing for a wrong start time', SERIAL, async () => {
  const tree = await mkTree();
  try {
    await lib.killOwnTree(tree.proc, { pid: tree.cinfo.pid, start_time: '2000-01-01T00:00:00.0000000Z' });
    assert.equal(await tree.proc.alive(tree.cinfo.pid, tree.cinfo.start_time), true, 'the child lives');
    assert.equal(await tree.proc.alive(tree.ginfo.pid, tree.ginfo.start_time), true, 'the grandchild lives');
    await lib.killOwnTree(tree.proc, tree.cinfo);
    assert.equal(await waitDead(tree.proc, tree.ginfo.pid, tree.ginfo.start_time), true, 'the grandchild is gone');
    assert.equal(await waitDead(tree.proc, tree.cinfo.pid, tree.cinfo.start_time), true, 'the child is gone');
  } finally {
    tree.cleanup();
  }
});
test('T88 killOwnTree spawns taskkill by its absolute path, kills the grandchild first and never passes /T', SERIAL, async () => {
  const tree = await mkTree();
  const seen = [];
  const restores = [];
  for (const name of ['spawn', 'spawnSync', 'execFile', 'execFileSync', 'exec', 'execSync']) {
    restores.push(patch(cp, name, (orig) => function (...a) { seen.push({ name, args: a }); return orig.apply(this, a); }));
  }
  try {
    await lib.killOwnTree(tree.proc, tree.cinfo);
  } finally {
    restores.reverse().forEach((r) => r());
    tree.cleanup();
  }
  const kills = [];
  for (const s of seen) {
    const first = String(s.args[0]);
    const argv = Array.isArray(s.args[1]) ? s.args[1].map(String) : [];
    const flat = [first, ...argv].join(' ');
    if (!/taskkill/i.test(flat)) continue;
    const file = first.replace(/^"|"$/g, '').split(/"\s|\s\//)[0].replace(/\\/g, '/');
    assert.equal(file.toLowerCase(), 'c:/windows/system32/taskkill.exe', `taskkill was started as ${first}`);
    assert.ok(path.isAbsolute(file));
    assert.ok(!/(^|\s)\/T(\s|$)/i.test(flat), `/T was passed: ${flat}`);
    assert.ok(/\/F/i.test(flat), 'taskkill /F');
    const m = /\/PID\s+(\d+)/i.exec(flat);
    assert.ok(m, `no /PID in ${flat}`);
    kills.push(Number(m[1]));
  }
  assert.ok(kills.length >= 2, `taskkill calls: ${kills}`);
  assert.ok(kills.indexOf(tree.ginfo.pid) >= 0 && kills.indexOf(tree.ginfo.pid) < kills.indexOf(tree.cinfo.pid), `order was ${kills}`);
});
test('T89 realProc with an unrunnable PowerShell makes list throw proc-unavailable 2 and alive and boot return null', SERIAL, async () => {
  const proc = lib.realProc({ exe: 'no-such.exe' });
  await throwsTcb(() => proc.list(), 'proc-unavailable', 2);
  assert.equal(await proc.alive(process.pid, SELF_START), null);
  assert.equal(await proc.boot(), null);
});
test('T89b a failed CIM query makes the alive and list texts exit non-zero, never print NONE or an empty list (LR-1)', SERIAL, async (t) => {
  if (!fs.existsSync(PS)) return t.skip('no Windows PowerShell here');
  // Shadow Get-CimInstance with a function that writes a non-terminating error, as a failed query does.
  const shadow = "function Get-CimInstance { Write-Error 'probe: query failed' }; ";
  for (const [what, text] of [['alive', lib.PS_SCRIPTS.one(process.pid)], ['list', lib.PS_SCRIPTS.list]]) {
    const r = spawnSync(PS, ['-NoProfile', '-NonInteractive', '-Command', shadow + text], {
      encoding: 'utf8', timeout: 60000, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
    assert.equal(r.error, undefined, `${what}: ${r.error}`);
    assert.notEqual(r.status, 0, `${what}: exited 0 with stdout ${JSON.stringify(r.stdout)}`);
    assert.notEqual(String(r.stdout).trim(), 'NONE', `${what}: a failed query read as "no such process"`);
  }
});
const t7 = (n) => `2026-11-17T10:00:${String(n).padStart(2, '0')}.0000000Z`;
const pr = (pid, ppid, cmdline, start) => ({ pid, ppid, name: 'x.exe', exe: 'x', cmdline, start_time: start });
const pidsOf = (m) => m.map((x) => (typeof x === 'object' ? x.pid : x)).sort((a, b) => a - b);
test('T90 attemptProcesses matches the folder (either slash style, any case, whole name) or the session id, with descendants', async () => {
  const list = [
    pr(1, 0, 'explorer', t7(0)),
    pr(100, 1, '"C:\\x\\claude.exe" --cwd C:\\R\\wt\\f1-e1\\in', t7(1)),
    pr(101, 100, 'node child', t7(2)),
    pr(103, 101, 'node grandchild', t7(3)),
    pr(102, 100, 'node reused parent pid', t7(0)),
    pr(150, 1, 'node x "C:\\R\\wt\\f1-e1"', t7(1)),
    pr(160, 1, 'node x C:\\R\\wt\\f1-e1', t7(1)),
    pr(170, 1, 'node x C:\\R\\wt\\f1-e1 --flag', t7(1)),
    pr(175, 1, 'node x C:/r/WT/F1-E1/in', t7(1)),
    pr(180, 1, 'node x C:\\R\\wt\\f1-e12\\in', t7(1)),
    pr(190, 1, 'node x C:\\R\\wt\\f1-e1x', t7(1)),
    pr(200, 1, 'claude.exe C:/r/wt/f1-e10/in', t7(1)),
    pr(300, 1, `claude.exe --resume ${SID}`, t7(1)),
    pr(301, 300, 'node under session', t7(2)),
    pr(400, 1, 'unrelated', t7(1)),
  ];
  const r = await lib.attemptProcesses(list, { folder: 'C:/R/wt/f1-e1', sessionId: SID });
  assert.deepEqual(pidsOf(r.matched), [100, 101, 103, 150, 160, 170, 175, 300, 301]);
  const none = await lib.attemptProcesses(list, { folder: 'C:/R/wt/nothing-here', sessionId: '99999999-9999-4999-8999-999999999999' });
  assert.deepEqual(pidsOf(none.matched), []);
  const d = (await lib.descendants(list, 100)).filter((p) => p !== 100).sort((a, b) => a - b);
  assert.deepEqual(d, [101, 103]);
});
test('T90b descendants ignores a child that started before its parent (a reused parent pid)', async () => {
  const list = [pr(500, 1, 'parent', t7(5)), pr(501, 500, 'older child', t7(4)), pr(502, 500, 'child', t7(6)), pr(503, 502, 'grandchild', t7(7))];
  const d = (await lib.descendants(list, 500)).filter((p) => p !== 500).sort((a, b) => a - b);
  assert.deepEqual(d, [502, 503]);
});
test('T90c start times one second apart match and five seconds apart do not (sameStartTime, killOwnTree)', async () => {
  const base = '2026-11-17T10:00:00.0000000Z';
  const plus = (s) => new Date(Date.parse('2026-11-17T10:00:00.000Z') + s * 1000).toISOString().replace(/Z$/, '0000Z');
  assert.equal(lib.START_TOLERANCE_MS, 2000);
  assert.equal(lib.sameStartTime(base, base), true);
  assert.equal(lib.sameStartTime(base, plus(1)), true);
  assert.equal(lib.sameStartTime(plus(1), base), true);
  assert.equal(lib.sameStartTime(base, plus(-1)), true);
  assert.equal(lib.sameStartTime(base, plus(5)), false);
  assert.equal(lib.sameStartTime(base, plus(-5)), false);
  assert.equal(lib.sameStartTime(base, '2026-11-17T10:00:02.0000000Z'), true, 'exactly two seconds still matches');
  assert.equal(lib.sameStartTime(base, '2026-11-17T10:00:02.0010000Z'), false);
  assert.equal(lib.sameStartTime(base, '2026-11-17T10:00:01.123Z'), true, 'precision of the fraction does not matter');
  assert.equal(lib.sameStartTime(base, '2026-11-17T15:00:01.0000000+05:00'), true, 'an offset is honoured');
  assert.equal(lib.sameStartTime(base, null), false);
  assert.equal(lib.sameStartTime(null, null), false);
  assert.equal(lib.sameStartTime('garbage', 'garbage'), true, 'equal strings match');
  assert.equal(lib.sameStartTime('garbage', base), false);
  // killOwnTree: a recorded start one second off the listed one is the same child; five seconds off is not.
  const list = [pr(700, 1, 'child', plus(1)), pr(701, 700, 'grandchild', plus(2))];
  const fake = {
    list: () => list.map((x) => ({ ...x })),
    alive: (pid, st) => {
      const p = list.find((x) => x.pid === pid);
      return !!p && lib.sameStartTime(p.start_time, st);
    },
    boot: () => null,
  };
  const killed = [];
  const exec = (file, args) => {
    killed.push(Number(args[1]));
  };
  const far = await lib.killOwnTree(fake, { pid: 700, start_time: plus(6) }, { exec });
  assert.equal(far.reason, 'start-mismatch');
  assert.deepEqual(killed, []);
  await lib.killOwnTree(fake, { pid: 700, start_time: base }, { exec });
  assert.deepEqual(killed, [701, 700], 'grandchild first, then the child');
});
test('T92 a real session claude.exe command line names its folder or session id', { skip: 'needs the app: only a real session shows its command line' }, () => {});

// ================================================================== Numerics (4.10)
test('T93 rng is deterministic per seed, int stays in range and shuffle returns a permutation without touching its input', async () => {
  const a = lib.rng('s');
  const b = lib.rng('s');
  const c = lib.rng('t');
  const sa = Array.from({ length: 20 }, () => a.next());
  assert.deepEqual(sa, Array.from({ length: 20 }, () => b.next()));
  assert.notDeepEqual(sa, Array.from({ length: 20 }, () => c.next()));
  assert.ok(sa.every((x) => x >= 0 && x < 1));
  // CONTRACT 4.10: the first 4 bytes of sha256(seed + ':' + counter) / 2^32 (byte order and first counter taken from the data)
  const f = (seed, n, be) => {
    const d = crypto.createHash('sha256').update(`${seed}:${n}`).digest();
    return (be ? d.readUInt32BE(0) : d.readUInt32LE(0)) / 2 ** 32;
  };
  const variants = [];
  for (const be of [true, false]) for (const c0 of [0, 1]) if (f('s', c0, be) === sa[0]) variants.push([be, c0]);
  assert.ok(variants.length >= 1, 'the first draw is a sha256 of "s:<counter>"');
  assert.ok(variants.some(([be, c0]) => sa.every((x, i) => x === f('s', c0 + i, be))), 'the counter runs on by one per draw');
  const r = lib.rng('ints');
  const draws = Array.from({ length: 300 }, () => r.int(10));
  assert.ok(draws.every((x) => Number.isInteger(x) && x >= 0 && x < 10));
  assert.ok(new Set(draws).size >= 5);
  assert.ok(Array.from({ length: 20 }, () => r.int(1)).every((x) => x === 0));
  const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const copy = [...input];
  const s1 = lib.rng('sh').shuffle(input);
  assert.deepEqual(input, copy, 'the input is unchanged');
  assert.deepEqual([...s1].sort((x, y) => x - y), copy);
  assert.deepEqual(lib.rng('sh').shuffle(input), s1, 'same seed, same shuffle');
  assert.ok(Array.from({ length: 5 }, (_, i) => lib.rng(`sh${i}`).shuffle(input)).some((x) => x.join() !== copy.join()));
});
test('T94 clopperPearson gives the exact two-sided interval', async () => {
  const near = (x, y, tol = 1e-4) => assert.ok(Math.abs(x - y) <= tol, `${x} vs ${y}`);
  const z = await lib.clopperPearson(0, 14);
  assert.equal(z.lower, 0);
  near(z.upper, 0.2316);
  const f = await lib.clopperPearson(14, 14);
  near(f.lower, 0.7684);
  assert.equal(f.upper, 1);
  const h = await lib.clopperPearson(5, 10);
  near(h.lower, 0.1871);
  near(h.upper, 0.8129);
  assert.deepEqual(await lib.clopperPearson(0, 0), { lower: 0, upper: 1 });
  near((await lib.clopperPearson(0, 14, 0.9)).upper, 1 - Math.pow(0.05, 1 / 14), 1e-6);
});
test('T95 reservation sums every attempt spent and the open part of rows in progress', async () => {
  const sp = (m) => (task, e) => m[`${task}#${e}`] ?? 0;
  const done = (task) => mkRow({ task, state: 'committed', step: 'stopped', epoch: 1, attempts: [att(task, 1, { stop: 'confirmed' })] });
  const r1 = await lib.reservation([done('f1-a'), done('f1-b'), boundRow('f1-c', { e_task: 1000 })], sp({ 'f1-a#1': 100, 'f1-b#1': 50, 'f1-c#1': 300 }));
  assert.equal(r1.reservation, 1150);
  assert.equal(r1.spentTotal, 450);
  const fenced = mkRow({ task: 'f1-d', state: 'active', step: 'fenced', epoch: 2, e_task: 5000, attempts: [att('f1-d', 1)] });
  const r2 = await lib.reservation([fenced], sp({ 'f1-d#1': 40 }));
  assert.equal(r2.reservation, 40);
  assert.equal(r2.spentTotal, 40);
  const r3 = await lib.reservation([boundRow('f1-e', { e_task: 100 })], sp({ 'f1-e#1': 300 }));
  assert.equal(r3.reservation, 300);
  const two = boundRow('f1-f', { e_task: 100, epoch: 2, attempts: [att('f1-f', 1), att('f1-f', 2, { session: SID })] });
  const r4 = await lib.reservation([two], sp({ 'f1-f#1': 10, 'f1-f#2': 20 }));
  assert.equal(r4.reservation, 110);
  assert.equal(r4.spentTotal, 30);
  for (const step of ['admitted', 'started']) {
    const r5 = await lib.reservation([mkRow({ task: 'f1-g', state: 'active', step, epoch: 1, e_task: 500, attempts: [att('f1-g', 1)] })], sp({}));
    assert.equal(r5.reservation, 500, step);
  }
});
dt('T96 slotCount counts live, unknown and unconfirmed attempts, each once', async (troot) => {
  const folder = (t, e = 1) => `C:/tcbtest/wt/${t}-e${e}`;
  const proc = (t, extra = []) => [
    pr(1, 0, 'explorer', t7(0)),
    pr(100, 1, `"C:\\x\\claude.exe" --cwd C:\\tcbtest\\wt\\${t}-e1\\in`, t7(1)),
    ...extra,
  ];
  const sc = async (rows, list = proc('nothing')) => {
    const r = await lib.slotCount(rows, list, troot);
    return { live: r.live, unknown: r.unknown, unconfirmed: r.unconfirmed };
  };
  const Z = { live: 0, unknown: 0, unconfirmed: 0 };
  const live = boundRow('f1-live');
  assert.deepEqual(await sc([live], proc('f1-live')), { live: 1, unknown: 0, unconfirmed: 0 });
  assert.deepEqual(await sc([live], proc('f1-live', [pr(101, 100, 'node child', t7(2))])), { live: 1, unknown: 0, unconfirmed: 0 }, 'one attempt is never counted twice');
  // no process, but a transcript: unknown
  const S2 = '22222222-2222-4222-8222-222222222222';
  const tr = mkRow({ task: 'f1-tr', state: 'active', step: 'fenced', epoch: 2, reason: 'stall', attempts: [att('f1-tr', 1, { session: S2 })] });
  assert.deepEqual(await sc([tr]), Z, 'no transcript yet: nothing');
  writeLines(path.join(troot, await lib.projectDirName(folder('f1-tr')), `${S2}.jsonl`), [asst('m', textB('a'), US(1, 1, 1, 1), { cwd: folder('f1-tr'), sid: S2 })]);
  assert.deepEqual(await sc([tr]), { live: 0, unknown: 1, unconfirmed: 0 });
  // unconfirmed, confirmed, planned
  const unc = mkRow({ task: 'f1-unc', state: 'active', step: 'stopped', epoch: 1, attempts: [att('f1-unc', 1, { stop: 'unconfirmed' })] });
  assert.deepEqual(await sc([unc]), { live: 0, unknown: 0, unconfirmed: 1 });
  const conf = mkRow({ task: 'f1-conf', state: 'active', step: 'stopped', epoch: 1, attempts: [att('f1-conf', 1, { stop: 'confirmed' })] });
  assert.deepEqual(await sc([conf]), Z);
  assert.deepEqual(await sc([mkRow({ task: 'f1-plan' })]), Z);
  // the current attempt of a row at admitted, and the last attempt of a committed row, count one slot with nothing seen
  const adm = mkRow({ task: 'f1-adm', state: 'active', step: 'admitted', epoch: 1, attempts: [att('f1-adm', 1)] });
  assert.deepEqual(await sc([adm]), { live: 0, unknown: 1, unconfirmed: 0 });
  const com = mkRow({ task: 'f1-com', state: 'committed', step: 'bound', epoch: 1, attempts: [att('f1-com', 1)] });
  assert.deepEqual(await sc([com]), { live: 0, unknown: 1, unconfirmed: 0 });
  const comDone = mkRow({ task: 'f1-cod', state: 'committed', step: 'stopped', epoch: 1, attempts: [att('f1-cod', 1, { stop: 'confirmed' })] });
  assert.deepEqual(await sc([comDone]), Z);
  // a failed PowerShell listing makes an attempt that would be live unknown
  assert.deepEqual(await sc([live], null), { live: 0, unknown: 1, unconfirmed: 0 });
  // all together
  assert.deepEqual(await sc([live, tr, unc, conf, adm, com, comDone, mkRow({ task: 'f1-plan' })], proc('f1-live')), { live: 1, unknown: 3, unconfirmed: 1 });
});

// Stored cards, statuses and the ledger for the shared computations.
const statusFile = (root) => P(root, 'store', 'status', 'card_status.jsonl');
let SSEQ = 0;
let CN = 0;
const st = (card_id, status, o = {}) => ({ seq: ++SSEQ, card_id, card_sha: 'a'.repeat(64), status, reason: 'ok', at: NOW, ...o });
function addStatus(root, recs) {
  fs.mkdirSync(path.dirname(statusFile(root)), { recursive: true });
  fs.appendFileSync(statusFile(root), recs.map((r) => JSON.stringify(r)).join('\n') + '\n');
}
const putCard = (root, qids) => lib.putObject(root, { schema_version: 1, kind: 'card', field: 'f1', question_ids: qids, n: ++CN });
async function withRoot(fn) {
  const h = await helpers.makeRoot({});
  try {
    return await fn(h.root);
  } finally {
    try { await h.cleanup(); } catch { /* best effort */ }
  }
}
const sameSet = (a, b) => assert.deepEqual([...a].sort(), [...b].sort());

rt('T96b variant counts the research questions covered by witnessed or confirmed cards; a design-check row has no V', async (root) => {
  const [QA, QB, QC] = ['f1-g-01', 'f1-g-02', 'f1-g-03'];
  const c1 = await putCard(root, [QA]);
  const c2 = await putCard(root, [QB]);
  const c3 = await putCard(root, [QC]);
  addStatus(root, [st(c1.id, 'witnessed'), st(c2.id, 'witnessed')]); // c3 stays pending
  await withLock(root, (h) =>
    ap(root, h, {
      kind: 'intake',
      task: 'f1-research',
      epoch: 1,
      data: { objects: [{ id: c1.id, kind: 'card', origin: 'session' }, { id: c3.id, kind: 'card', origin: 'session' }], rejected: [], flagged: [] },
    }),
  );
  const row = boundRow('f1-research', { question_ids: [QA, QB, QC] });
  const v1 = await lib.variant(root, row, { f5Given: true });
  assert.equal(v1.V, 2);
  sameSet(v1.covered, [QA]);
  sameSet(v1.uncovered, [QB, QC]);
  const v2 = await lib.variant(root, row, { f5Given: false });
  assert.equal(v2.V, 1);
  sameSet(v2.covered, [QA, QB]);
  sameSet(v2.uncovered, [QC]);
  const design = mkRow({ task: 'f1-map', field: null, stage: 'design-check', role: 'mapper', question_ids: [], steps: ['hazards'] });
  assert.equal((await lib.variant(root, design, { f5Given: false })).V, null);
});

const CUT = 'c'.repeat(64);
rt('T96c currentDesign takes the hazards of the committed mapper whose commit line has the highest seq, for the current cut only', async (root) => {
  assert.deepEqual(await lib.currentDesign(root), { cut_sha: null, hazards_id: null, hazards_sha: null });
  await withLock(root, (h) => ap(root, h, { kind: 'cut', data: { sha: CUT } }));
  const mk = async (task, cutSha, label, rev) => {
    const o = await lib.putObject(root, { schema_version: 1, kind: 'hazards', cut_sha: cutSha, label });
    const outputs = [{ id: o.id, kind: 'hazards', sha256: o.sha256 }];
    const recBytes = lib.canonicalize({ schema_version: 1, task, step: 'hazards', epoch: 1, step_key: '1'.repeat(64), outputs, outputs_sha: sha(lib.canonicalize(outputs)) });
    fs.mkdirSync(P(root, 'store', 'commits'), { recursive: true });
    fs.writeFileSync(P(root, 'store', 'commits', `${task}.hazards.json`), recBytes);
    await withLock(root, (h) => ap(root, h, { kind: 'commit', task, epoch: 1, data: { step: 'hazards', outputs_sha: sha(lib.canonicalize(outputs)), n: 1, git: null } }));
    return {
      o,
      row: mkRow({ task, field: null, stage: 'design-check', role: 'mapper', steps: ['hazards'], question_ids: [], state: 'committed', step: 'bound', epoch: 1, session: SID, attempts: [att(task, 1, { session: SID })], commits: { hazards: sha(recBytes) }, updated_rev: rev }),
    };
  };
  const m1 = await mk('f1-map1', CUT, 'first', 9); // committed first, higher updated_rev
  const m2 = await mk('f1-map2', CUT, 'second', 3); // committed later: wins
  const m3 = await mk('f1-map3', 'd'.repeat(64), 'other cut', 4); // later still, but another cut
  await seedRows(root, [m1.row, m2.row, m3.row]);
  const r = await lib.currentDesign(root);
  assert.equal(r.cut_sha, CUT);
  assert.equal(r.hazards_id, m2.o.id);
  assert.equal(r.hazards_sha, m2.o.sha256);
  assert.equal(r.hazards_sha, sha(lib.canonicalize({ schema_version: 1, kind: 'hazards', cut_sha: CUT, label: 'second' })));
});
test('T96d runFlags: a halt is lifted only by an owner resume; a drain counts for its own ce', async () => {
  const L = (kind, ce, data = {}) => ({ kind, ce, data });
  assert.equal((await lib.runFlags([L('halt', 1, { reason: 'x', fails: [] })], 1)).halted, true);
  assert.equal((await lib.runFlags([L('halt', 1), L('owner', 1, { act: 'resume', subject: 'run' })], 1)).halted, false);
  assert.equal((await lib.runFlags([L('halt', 1), L('owner', 1, { act: 'approve', subject: 'analysis-plan' })], 1)).halted, true);
  assert.equal((await lib.runFlags([L('owner', 1, { act: 'resume', subject: 'run' }), L('halt', 1)], 1)).halted, true, 'a resume before the halt does not lift it');
  assert.equal((await lib.runFlags([], 1)).halted, false);
  assert.equal((await lib.runFlags([L('drain', 2, { window: 3, w_star: 1 })], 2)).draining, true);
  assert.equal((await lib.runFlags([L('drain', 2, { window: 3, w_star: 1 })], 3)).draining, false);
  assert.equal((await lib.runFlags([], 2)).draining, false);
});
rt('T96e intakeCandidates lists witnessed cards without a check, re-admits reverted cards once J1, J2 and J4 qualify, and marks in-flight ones', async (root) => {
  const A = (await putCard(root, ['f1-g-01'])).id;
  const B = (await putCard(root, ['f1-g-02'])).id;
  const C = (await putCard(root, ['f1-g-03'])).id;
  const D = (await putCard(root, ['f1-g-04'])).id;
  const E = (await putCard(root, ['f1-g-05'])).id;
  const F = (await putCard(root, ['f1-g-06'])).id;
  const check = (batch) => ({ batch, item: 'i_0123456789abcdef', verdict: 'confirmed' });
  addStatus(root, [
    st(A, 'witnessed'),
    st(B, 'witnessed'),
    st(B, 'confirmed', { reason: 'ok', check: check('b0-1'), classes: ['J1', 'J2', 'J4'] }),
    st(B, 'witnessed', { reason: 'unqualified-revert', classes: ['J1'] }),
    st(C, 'witnessed'),
    st(D, 'witnessed'),
    st(D, 'confirmed', { check: check('b0-1'), classes: ['J1', 'J2', 'J4'] }),
    st(E, 'rejected', { reason: 'number-without-quote' }),
    st(F, 'rejected', { reason: 'quote-missing' }),
  ]);
  wj(P(root, 'sealed', 'seeds', 'b1-1.json'), {
    batch: 'b1-1',
    rng_seed: 'x',
    items: {
      i_aaaaaaaaaaaaaaaa: { seed: false, card_id: C },
      i_bbbbbbbbbbbbbbbb: { seed: true, class: 'S1', operator: 'op', from_card: A, seed_id: 's_0123456789abcdef' },
    },
  });
  const qual = (j1) => ({ schema_version: 1, classes: { J1: { qualified: j1 }, J2: { qualified: true }, J3: { qualified: false }, J4: { qualified: true } }, escape: { n: 0, escaped: 0 } });
  const byId = async () => Object.fromEntries((await lib.intakeCandidates(root)).map((c) => [c.card_id, c.in_flight]));
  wj(P(root, 'store', 'qualification.json'), qual(false));
  assert.deepEqual(await byId(), { [A]: false, [C]: true, [E]: false });
  wj(P(root, 'store', 'qualification.json'), qual(true));
  assert.deepEqual(await byId(), { [A]: false, [B]: false, [C]: true, [E]: false });
});

// R18 flags, checker verdicts, read sets and protocols
async function flagScenario(root, { queueBeforeFlag = false, cards = 1, confirm = [0], verdict = 'confirmed', node, revert = null }) {
  const cs = [];
  for (let i = 0; i < cards; i++) cs.push((await putCard(root, [`f1-g-0${i + 1}`])).id);
  const rev = await lib.putObject(root, {
    schema_version: 1,
    kind: 'review',
    field: 'f1',
    task: 'f1-review',
    pack: 'p_0123456789abcdef',
    sentences: [{ sid: 's1', approach_id: 'approach_one', measure: 'measure_one', kind: 'fact', text: 'a claim', cites: cs, applies_to: {} }],
    verdicts: [],
    dismissals: [],
    our_work_findings: [],
  });
  let seqI;
  await withLock(root, async (h) => {
    if (queueBeforeFlag) await ap(root, h, { kind: 'queue', data: { batch: 'b0-1', n: 1, n_seeds: 0, rng_seed: 'x' } });
    const i = await ap(root, h, {
      kind: 'intake',
      task: 'f1-review',
      epoch: 1,
      data: { objects: [{ id: rev.id, kind: 'review', origin: 'session' }], rejected: [], flagged: [{ id: rev.id, sid: 's1', code: 'number-uncited' }] },
    });
    seqI = i.seq;
    if (!queueBeforeFlag) await ap(root, h, { kind: 'queue', data: { batch: 'b1-1', n: 1, n_seeds: 0, rng_seed: 'x' } });
  });
  const batch = queueBeforeFlag ? 'b0-1' : 'b1-1';
  const lines = confirm.map((i) =>
    st(cs[i], verdict === 'confirmed' ? 'confirmed' : 'witnessed', {
      reason: 'sentence-check',
      check: { batch, item: 'i_0123456789abcdef', verdict, node: node || `${rev.id}#s1` },
      classes: ['J1', 'J2', 'J3', 'J4'],
    }),
  );
  if (revert) lines.push(st(cs[0], 'witnessed', { reason: 'unqualified-revert', classes: [revert] }));
  if (lines.length) addStatus(root, lines);
  const flag = { id: rev.id, object: rev.id, o: rev.id, sid: 's1', code: 'number-uncited', seq: seqI, intake_seq: seqI, intakeSeq: seqI };
  return lib.flagCleared(root, flag);
}
test('T96f flagCleared clears a sentence flag only through a confirmed sentence check queued after the flag, and a later revert reopens it', async (t) => {
  const cases = [
    ['a confirmed check queued after the flag clears it', {}, true],
    ['no status line leaves it open', { confirm: [] }, false],
    ['a check queued before the flag does not clear it', { queueBeforeFlag: true }, false],
    ['a later unqualified-revert of one of its classes reopens it', { revert: 'J2' }, false],
    ['a check on another sentence does not clear it', { node: 'r_ffffffffffffffff#s9' }, false],
    ['a verdict other than confirmed does not clear it', { verdict: 'number_mismatch' }, false],
    ['one of two cited cards confirmed leaves it open', { cards: 2, confirm: [0] }, false],
    ['both cited cards confirmed clears it', { cards: 2, confirm: [0, 1] }, true],
  ];
  for (const [name, o, want] of cases) await t.test(name, () => withRoot(async (root) => assert.equal(await flagScenario(root, o), want)));
});
test('T96f checkerVerdicts takes one result or a bare verdict, marks off-enum, missing and conflicting items unclear, and counts repeats', async () => {
  const S = (data) => ({ structured: [{ data }] });
  const items = ['i_1', 'i_2', 'i_3', 'i_4'];
  const r = await lib.checkerVerdicts(
    [S({ verdicts: [{ item: 'i_1', verdict: 'confirmed' }, { item: 'i_2', verdict: 'bogus' }, { item: 'i_9', verdict: 'confirmed' }] })],
    items,
  );
  assert.equal(r.verdicts.i_1, 'confirmed');
  assert.equal(r.verdicts.i_2, 'unclear');
  assert.equal(r.reasons.i_2, 'verdict-off-enum');
  assert.equal(r.verdicts.i_3, 'unclear');
  assert.equal(r.reasons.i_3, 'verdict-missing');
  assert.equal(r.verdicts.i_4, 'unclear');
  assert.equal(countOf(r.unknown_items), 1);
  assert.ok(!('i_9' in r.verdicts));
  const bare = await lib.checkerVerdicts([S({ item: 'i_2', verdict: 'baseline_swapped' })], ['i_2']);
  assert.equal(bare.verdicts.i_2, 'baseline_swapped');
  const conflict = await lib.checkerVerdicts(
    [S({ verdicts: [{ item: 'i_1', verdict: 'confirmed' }] }), S({ verdicts: [{ item: 'i_1', verdict: 'number_mismatch' }] })],
    ['i_1'],
  );
  assert.equal(conflict.verdicts.i_1, 'unclear');
  assert.equal(conflict.reasons.i_1, 'verdict-conflict');
  const same = await lib.checkerVerdicts(
    [S({ verdicts: [{ item: 'i_1', verdict: 'confirmed' }] }), S({ verdicts: [{ item: 'i_1', verdict: 'confirmed' }] })],
    ['i_1'],
  );
  assert.equal(same.verdicts.i_1, 'confirmed');
  assert.equal(countOf(same.duplicates), 1);
});
test('T96f readSetSha equals the sha256 of the canonical read set, and questionsSha does not depend on order', async () => {
  const rs = [{ card_id: 'c_0123456789abcdef', status_seq: 3 }, { card_id: 'c_fedcba9876543210', status_seq: 0 }];
  assert.equal(await lib.readSetSha(rs), sha(lib.canonicalize(rs)));
  assert.equal(await lib.questionsSha(['f1-g-02', 'f1-g-01']), await lib.questionsSha(['f1-g-01', 'f1-g-02']));
  assert.equal(await lib.questionsSha(['f1-g-02', 'f1-g-01']), sha(lib.canonicalize(['f1-g-01', 'f1-g-02'])));
  assert.notEqual(await lib.questionsSha(['f1-g-01']), await lib.questionsSha(['f1-g-01', 'f1-g-02']));
});
rt('T96f currentProtocol returns the frozen file of the last protocol-freeze or protocol-amend line of the field, re-checking its bytes', async (root) => {
  assert.equal(await lib.currentProtocol(root, 'f1'), null);
  const freeze = (value) => {
    const bytes = lib.canonicalize(value);
    const s = sha(bytes);
    const rel = `plan/frozen/protocol-${value.field}-${s.slice(0, 12)}.json`;
    fs.mkdirSync(P(root, 'plan', 'frozen'), { recursive: true });
    fs.writeFileSync(P(root, ...rel.split('/')), bytes);
    return { s, rel };
  };
  const v1 = { kind: 'protocol', field: 'f1', question_ids: ['f1-g-01'], v: 1 };
  const v2 = { kind: 'protocol', field: 'f1', question_ids: ['f1-g-01', 'f1-g-02'], v: 2 };
  const o1 = { kind: 'protocol', field: 'f2', question_ids: ['f2-g-01'], v: 1 };
  const a = freeze(v1);
  const b = freeze(v2);
  const c = freeze(o1);
  await withLock(root, async (h) => {
    await ap(root, h, { kind: 'protocol-freeze', data: { name: 'protocol-f1', sha256: a.s, path: a.rel } });
    await ap(root, h, { kind: 'protocol-freeze', data: { name: 'protocol-f2', sha256: c.s, path: c.rel } });
  });
  let cur = await lib.currentProtocol(root, 'f1');
  assert.equal(cur.name, 'protocol-f1');
  assert.equal(cur.sha256, a.s);
  assert.deepEqual(cur.value, v1);
  assert.ok(norm(cur.path).endsWith(a.rel.toLowerCase()), cur.path);
  await withLock(root, (h) => ap(root, h, { kind: 'protocol-amend', data: { name: 'protocol-f1', sha256: b.s, path: b.rel, old_sha: a.s, reason_code: 'fix' } }));
  cur = await lib.currentProtocol(root, 'f1');
  assert.equal(cur.sha256, b.s);
  assert.deepEqual(cur.value, v2);
  assert.deepEqual((await lib.currentProtocol(root, 'f2')).value, o1);
  assert.equal(await lib.currentProtocol(root, 'f3'), null);
  fs.writeFileSync(P(root, ...b.rel.split('/')), lib.canonicalize({ ...v2, v: 3 }));
  const e = await tcbErr(() => lib.currentProtocol(root, 'f1'));
  assert.equal(typeof e.exit, 'number', 'a frozen file whose bytes changed is refused');
});

// ================================================================== Test helpers (4.11)
test('T97 makeRoot creates every run-root folder, the tcb copies, coord.json, an empty task table and thresholds pointing at its own transcripts; cleanup removes it', async () => {
  const h = await helpers.makeRoot({ ce: 3 });
  const root = h.root;
  try {
    assert.equal(norm(path.dirname(root)), norm(TMP));
    assert.equal(path.basename(root).length, 12, 'a 6-character prefix plus the 6 random characters');
    for (const d of [
      'tcb', 'plan', 'plan/frozen', 'run', 'run/intents', 'run/audit', 'run/stop-sample', 'store', 'store/objects', 'store/commits', 'store/status',
      'views', 'queue', 'review-in', 'completeness', 'sealed', 'sealed/seeds', 'sealed/plants', 'sealed/heldout', 'sealed/blind', '.snapshots',
      '.snapshots/raw', '.snapshots/text', '.snapshots/meta', '.snapshots/by-url', 'wt', 'transcripts',
    ])
      assert.ok(fs.statSync(P(root, ...d.split('/'))).isDirectory(), `${d} exists`);
    for (const d of ['schemas', 'profiles', 'settings', 'agents', 'briefs']) assert.ok(fs.statSync(P(root, 'tcb', d)).isDirectory(), `tcb/${d} exists`);
    assert.equal(rdj(P(root, 'run', 'coord.json')).ce, 3);
    await lib.checkCe(root, 3);
    const table = await lib.readTasks(root);
    assert.deepEqual(table.tasks, []);
    assert.equal(norm(await (await lib.thresholds(root)).get('transcripts_root')), norm(P(root, 'transcripts')));
    assert.deepEqual(fs.readdirSync(P(root, 'transcripts')), []);
  } finally {
    await h.cleanup();
  }
  assert.equal(fs.existsSync(root), false);
});
dt('T98 fakeTranscript output parses into exactly the calls and tool uses given', async (d) => {
  const f = path.join(d, 'ft.jsonl');
  const u = (i, cr, cw, o) => ({ input: i, cache_read: cr, cache_write: cw, output: o, input_tokens: i, cache_read_input_tokens: cr, cache_creation_input_tokens: cw, output_tokens: o });
  const cwd = 'C:\\tcbtest\\wt\\f1-research-e1';
  await helpers.fakeTranscript(f, {
    sessionId: SID,
    cwd,
    calls: [
      { usage: u(5, 6, 7, 8), tools: [{ name: 'Read', input: { file_path: '/a' } }], text: 'first' },
      { usage: u(1, 2, 3, 4), tools: [{ name: 'Bash', input: { command: 'x' } }, { name: 'Grep', input: { pattern: 'p' } }], text: 'second' },
      { usage: u(2, 2, 2, 2), tools: [] },
    ],
  });
  const p = await lib.parseTranscript(f, {});
  assert.equal(p.sessionId, SID);
  assert.equal(p.cwd, cwd);
  assert.equal(p.calls.length, 3);
  assert.deepEqual(p.calls.map((c) => c.usage), [
    { input: 5, cache_read: 6, cache_write: 7, output: 8 },
    { input: 1, cache_read: 2, cache_write: 3, output: 4 },
    { input: 2, cache_read: 2, cache_write: 2, output: 2 },
  ]);
  assert.deepEqual(p.toolUses.map((x) => x.name), ['Read', 'Bash', 'Grep']);
  assert.deepEqual(p.toolUses[0].input, { file_path: '/a' });
  assert.deepEqual(p.toolUses[2].input, { pattern: 'p' });
  assert.ok(!p.torn);
  assert.equal(countOf(p.badLines), 0);
});

// ------------------------------------------------------------------ S0.5: the round-3 skeleton
// spec/lib.md "Round-3 skeleton": the 17 threshold keys of the round-3 fixes exist, non-null, each
// marked a guess; the API stubs keep their fixed signatures and throw not-built (exit 70) until their
// fix fills them; the runtime file table, its path helpers and the transcript kind are in place.
test('S0.5 round-3 skeleton: threshold keys marked guesses, stub signatures, not-built, formats', () => {
  const th = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'thresholds.json'), 'utf8').replace(/^\uFEFF/, ''));
  const keys = ['H_nostart', 'start_lease_ticks', 'start_lease_ms', 'stop_verify_ms', 'ensure_query_ms', 'release_ms',
    'arm_confirm_ms', 'alarm_slots', 'realert_runs', 'stuck_raises', 'idle_ticks', 'attempt_max_ticks',
    'tool_slack_ticks', 'bg_wait_ticks', 'model_ticks', 'watcher_lock_try_ms', 'busy_alert_ticks'];
  for (const k of keys) {
    const p = th.params[k];
    assert.ok(p, `${k} exists`);
    assert.equal(p.source, 'guess', `${k} is marked a guess`);
    assert.ok(Number.isInteger(p.value), `${k} has an integer value`);
    assert.match(p.unit, /guess/, `${k}'s unit says it is a guess`);
  }
  const stubs = { outcomeState: 2, outcomeAppend: 3, readClaim: 1, claimRecord: 1, tombstoneRecord: 2, planAct: 2 };
  for (const [name, n] of Object.entries(stubs)) {
    assert.equal(typeof lib[name], 'function', name);
    assert.equal(lib[name].length, n, `${name} takes ${n} arguments`);
    assert.throws(() => lib[name](), (e) => e instanceof lib.TcbError && e.code === 'not-built' && e.exit === 70 && e.detail.fn === name);
  }
  assert.equal(lib.RUNTIME_FILES.length, 13);
  assert.deepEqual(lib.TRANSCRIPT_KINDS, ['tool', 'bg-wait', 'model', 'idle']);
  assert.equal(new Set(lib.TRANSCRIPT_RECORD_TYPES).size, 27);
  const P = lib.paths(path.join(os.tmpdir(), 's05-root'));
  for (const f of lib.RUNTIME_FILES) assert.equal(typeof P[f.helper], f.path.includes('<') ? 'function' : 'string', f.helper);
  assert.doesNotMatch(path.basename(P.armExited(12, '2026-11-19T10:00:00.1234567Z')), /:/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's05-'));
  try {
    const f = path.join(dir, 't.jsonl');
    fs.writeFileSync(f, JSON.stringify({ type: 'user', message: { content: 'hi' } }) + '\n');
    const res = lib.parseTranscript(f);
    const d = Object.getOwnPropertyDescriptor(res, 'kind');
    assert.ok(d && d.enumerable === false && d.value === null, 'kind: non-enumerable, null until FX-W6');
    assert.ok(!('kind' in JSON.parse(JSON.stringify(res))));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// FX-W1 (FIX-wake.md FX-W1 step 1, spec/lib.md "liveness"): an exit marker beats any answer of the
// list; otherwise the list's true/false/null is alive/dead/unknown; a list that throws or has no
// alive() is unknown; a record that is not an object is dead. exitMarkers reads only exited-*.json.
test('FX-W1 liveness: tri-state with exit markers; exitMarkers reads only the exit markers', () => {
  const rec = { pid: 4242, start_time: '2026-11-19T10:00:00.1234567Z' };
  const key = lib.markerKey(rec.pid, rec.start_time);
  const says = (v) => ({ alive: () => v });
  assert.equal(lib.liveness(rec, says(true), new Set()), 'alive');
  assert.equal(lib.liveness(rec, says(false), new Set()), 'dead');
  assert.equal(lib.liveness(rec, says(null), new Set()), 'unknown');
  assert.equal(lib.liveness(rec, says(undefined), []), 'unknown');
  assert.equal(lib.liveness(rec, says(true), new Set([key])), 'dead', 'a marker beats alive');
  assert.equal(lib.liveness(rec, says(null), [key]), 'dead', 'a marker beats unknown (array form)');
  assert.equal(lib.liveness(rec, says(true), new Set([lib.markerKey(rec.pid, 'other')])), 'alive', 'another start time is another process');
  assert.equal(lib.liveness(rec, { alive: () => { throw new Error('boom'); } }, null), 'unknown');
  assert.equal(lib.liveness(rec, {}, null), 'unknown');
  assert.equal(lib.liveness(rec, null, undefined), 'unknown');
  assert.equal(lib.liveness(null, says(true), new Set()), 'dead');
  assert.equal(lib.liveness('x', says(true), new Set()), 'dead');
  let seen = null;
  lib.liveness({ pid: '77', start_time: 's' }, { alive: (p, s) => { seen = [p, s]; return true; } }, []);
  assert.deepEqual(seen, [77, 's'], 'alive() gets the pid as a number and the start time');
  assert.equal(lib.liveness.length, 3);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fxw1-'));
  try {
    assert.deepEqual([...lib.exitMarkers(root)], [], 'no run/arm folder: empty');
    const P = lib.paths(root);
    fs.mkdirSync(path.dirname(P.armExited(1, 'a')), { recursive: true });
    fs.writeFileSync(P.armExited(rec.pid, rec.start_time), '{}');
    fs.writeFileSync(P.armUnarmed(5, 'b'), '{}');
    fs.writeFileSync(path.join(path.dirname(P.armExited(1, 'a')), 'slot-1.json'), '{}');
    fs.writeFileSync(P.armExited(9, 'c') + '.tmp', '{}');
    assert.deepEqual([...lib.exitMarkers(root)], [key]);
    assert.equal(lib.liveness(rec, says(true), lib.exitMarkers(root)), 'dead');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
