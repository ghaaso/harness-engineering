// Tests of tcb/scripts/handover.mjs, written from spec/handover.mjs.md and CONTRACT.md only.
// Each test builds its own run root under tcb-build/tmp, runs the script as a child process
// (process.execPath + the root's own copy of the script) and checks the exit code, the stdout
// line (CONTRACT 1.3) and the files. The synthetic data lives in tcb/fixtures/handover/.
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
const FIXDIR = path.join(HERE, '..', 'fixtures', 'handover');
const PS_EXE = 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
const DATA = JSON.parse(fs.readFileSync(path.join(FIXDIR, '_testdata.json'), 'utf8'));

const NOW = '2026-11-17T09:30:00.000Z';
const COMMIT = 'ab12'.repeat(10);
const OTHER_COMMIT = 'cd34'.repeat(10);
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
const newSid = () => crypto.randomUUID();
const readIf = (p) => (fs.existsSync(p) ? fs.readFileSync(p) : null);
let _lib;
const getLib = async () => (_lib ??= await import(pathToFileURL(path.join(TCB_SRC, 'scripts', 'lib.mjs')).href));

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
const lockRec = (rec, o = {}) => ({
  pid: rec.pid, start_time: rec.start_time, nonce: crypto.randomBytes(16).toString('hex'),
  script: o.script ?? 'test', ce: o.ce ?? 1, acquired_at: '2026-11-17T09:00:00.000Z',
});
const isLive = (s) => s.child.exitCode === null && s.child.signalCode === null;

// ---------------------------------------------------------------- the run root
const DIRS = ['plan/notes', 'plan/questions', 'plan/protocols', 'plan/frozen', 'run/intents', 'run/audit', 'run/stop-sample',
  'store/objects', 'store/commits', 'store/status', 'views', 'queue', 'completeness', 'sealed', '.snapshots', 'wt', 'tmp', 'transcripts'];
// bare: only tcb/ (as the owner leaves it before `init`); otherwise a full run root at the given ce.
function makeRoot({ thr = {}, ce = 1, rows = [], coord = {}, bare = false } = {}) {
  fs.mkdirSync(TMP, { recursive: true });
  const root = fs.mkdtempSync(path.join(TMP, 'ho-'));
  if (!bare) for (const d of DIRS) fs.mkdirSync(path.join(root, d), { recursive: true });
  for (const d of ['scripts', 'schemas', 'profiles', 'settings', 'agents', 'briefs']) {
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
    params[k] = { ...base, value: v };
  }
  w(path.join(root, 'tcb', 'thresholds.json'), { schema_version: 1, params });
  if (!bare) {
    w(path.join(root, 'run', 'coord.json'), { schema_version: 1, ce, session: null, started_at: NOW, tcb_commit: COMMIT, ...coord });
    w(path.join(root, 'run', 'tasks.json'), { schema_version: 1, rev: 1, tasks: rows });
  }
  const ctx = { root, sleepers: [], skipLedger: false, extra: [] };
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
    for (const d of [ctx.root, ...ctx.extra]) {
      for (let i = 0; i < 20; i++) {
        try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); break; } catch { await sleep(300); }
      }
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
  fs.mkdirSync(path.dirname(ledgerFile(root)), { recursive: true });
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
const drainLine = (root, ce = 1) => addLine(root, { kind: 'drain', ce, data: { window: 140000, w_star: 133200 } });

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
    task, field: 'f1', stage: 'research', role: 'child', steps: ['pack'], deps: [], question_ids: ['f1-a-01'], e_task: 1000,
    tier: 'test', state: o.state ?? 'active', step: o.step ?? 'bound', epoch, reason: o.reason ?? null, session: o.session ?? null,
    restarts: 0, handovers: 0, parks: 0, limit: false, fails: [],
    attempts: o.attempts ?? Array.from({ length: epoch }, (_, i) => att(task, i + 1, { session: i + 1 === epoch ? (o.session ?? null) : null })),
    commits: o.commits ?? {}, updated_rev: 1,
  };
}
const setTasks = (ctx, rows) => w(path.join(ctx.root, 'run', 'tasks.json'), { schema_version: 1, rev: 1, tasks: rows });
function writeTranscript(file, { sessionId, cwd }) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const base = { parentUuid: null, isSidechain: false, sessionId, cwd };
  const recs = [
    { type: 'user', uuid: crypto.randomUUID(), ...base, timestamp: '2026-01-01T00:00:01.000Z', message: { role: 'user', content: 'synthetic start' } },
    { type: 'assistant', uuid: crypto.randomUUID(), ...base, timestamp: '2026-01-01T00:00:02.000Z', message: {
      id: 'msg_' + crypto.randomBytes(8).toString('hex'), type: 'message', role: 'assistant', model: 'claude-test-1',
      content: [{ type: 'text', text: 'x' }], stop_reason: null,
      usage: { input_tokens: 10, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 0 } } },
  ];
  fs.writeFileSync(file, recs.map((r) => JSON.stringify(r)).join('\n') + '\n');
}

// ---------------------------------------------------------------- running the script
function parseOut(r) {
  const out = r.stdout ?? '';
  const lines = out.split('\n').filter((s) => s.trim() !== '');
  let json = null;
  if (lines.length === 1) { try { json = JSON.parse(lines[0]); } catch { /* not json */ } }
  return { exit: r.status, signal: r.signal ?? null, stdout: out, stderr: r.stderr ?? '', lines, json };
}
const scriptPath = (root) => path.join(root, 'tcb', 'scripts', 'handover.mjs');
function runFrom(scriptRoot, args, { timeout = 120000 } = {}) {
  return parseOut(cp.spawnSync(process.execPath, [scriptPath(scriptRoot), ...args],
    { cwd: scriptRoot, encoding: 'utf8', windowsHide: true, timeout, maxBuffer: 64 * 1024 * 1024 }));
}
function assertLine(res, exit) {
  const dbg = `exit=${res.exit} signal=${res.signal}\nstdout=${res.stdout.slice(0, 800)}\nstderr=${res.stderr.slice(0, 800)}`;
  assert.equal(res.exit, exit, `expected exit ${exit}\n${dbg}`);
  assert.equal(res.lines.length, 1, `stdout must be exactly one line\n${dbg}`);
  const j = res.json;
  assert.ok(j, `stdout line is not JSON\n${dbg}`);
  for (const k of ['ok', 'script', 'mode', 'exit', 'code', 'dry_run', 'result', 'reasons', 'ledger_seq']) assert.ok(k in j, `stdout line lacks "${k}"`);
  assert.match(String(j.script), /^handover(\.mjs)?$/);
  assert.equal(j.exit, exit);
  assert.equal(j.code, SLUG[exit]);
  if (exit === 0) assert.equal(j.ok, true);
  assert.ok(Array.isArray(j.reasons));
  assert.ok(Array.isArray(j.ledger_seq));
  return j;
}
const hasReason = (j, code) => (j.reasons ?? []).some((r) => r.code === code) || (j.result?.reasons ?? []).some((r) => r.code === code);
function detailValue(j, key) {
  for (const r of j.reasons ?? []) if (r.detail && typeof r.detail === 'object' && key in r.detail) return r.detail[key];
  if (j.result && typeof j.result === 'object' && key in j.result) return j.result[key];
  for (const v of Object.values(j.result ?? {})) if (v && typeof v === 'object' && !Array.isArray(v) && key in v) return v[key];
  return undefined;
}
const init = (ctx, args = [], o = {}) => runFrom(ctx.root, ['init', '--root', ctx.root, '--tcb-commit', o.commit ?? COMMIT, '--now', NOW, ...args]);
const raise = (ctx, ce = 1, args = []) => runFrom(ctx.root, ['raise', '--root', ctx.root, '--ce', String(ce), '--now', NOW, ...args]);
const bind = (ctx, ce, session, args = []) => runFrom(ctx.root, ['bind', '--root', ctx.root, '--ce', String(ce), '--session', session, '--now', NOW, ...args]);
const coordPath = (ctx) => path.join(ctx.root, 'run', 'coord.json');
const coord = (ctx) => J(coordPath(ctx));
function liveWatcher(ctx) {
  const s = ctx.sleeper();
  w(path.join(ctx.root, 'run', 'watcher.lock'), JSON.stringify(lockRec(s, { script: 'watch' })));
  w(path.join(ctx.root, 'run', 'watcher.json'), {
    schema_version: 1, ce: 1, pid: s.pid, start_time: s.start_time, ticks_total: 3, last_tick_at: NOW, active: {}, pending: [], tasks: {},
  });
  return s;
}
function liveAlarm(ctx) {
  const s = ctx.sleeper();
  w(path.join(ctx.root, 'run', 'alarm.json'), { schema_version: 1, pid: s.pid, start_time: s.start_time, ce: 1, armed_at: NOW, sleep_ms: 1000 });
  return s;
}

// =============================================================== the tests
const FOLDERS = [
  'plan/questions', 'plan/protocols', 'plan/frozen', 'plan/plant-candidates', 'plan/our-work', 'plan/notes',
  'run/intents', 'run/audit', 'run/stop-sample', 'store/objects', 'store/commits', 'store/status', 'views/blind', 'queue',
  'review-in', 'completeness', 'sealed/heldout', 'sealed/seeds', 'sealed/plants', 'sealed/blind',
  '.snapshots/raw', '.snapshots/text', '.snapshots/meta', '.snapshots/by-url', 'wt',
];
const GITIGNORE = ['wt/', '.snapshots/', 'sealed/', 'tmp/', 'run/*.lock', 'run/alarm.json', 'run/watcher.json', 'run/*.stale', 'run/*.orphan', '*.tmp'];

test('T1 init on a root with only tcb/: folders, .gitignore, .gitattributes, empty table, coord.json ce 1, one coord-init line', async () => {
  await withRoot({ bare: true }, async (ctx) => {
    const j = assertLine(init(ctx), 0);
    assert.equal(j.mode, 'init');
    for (const d of FOLDERS) assert.ok(fs.statSync(path.join(ctx.root, d)).isDirectory(), `missing folder ${d}`);
    const gi = fs.readFileSync(path.join(ctx.root, '.gitignore'), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const line of GITIGNORE) assert.ok(gi.includes(line), `.gitignore lacks ${line}`);
    assert.equal(fs.readFileSync(path.join(ctx.root, '.gitattributes'), 'utf8').trim(), '* -text');
    const tasks = J(path.join(ctx.root, 'run', 'tasks.json'));
    assert.deepEqual(tasks, { schema_version: 1, rev: 0, tasks: [] });
    await (await getLib()).checkFormat(ctx.root, 'tasks', tasks);
    const c = coord(ctx);
    assert.equal(c.ce, 1);
    assert.equal(c.tcb_commit, COMMIT);
    assert.ok(c.session === undefined || c.session === null);
    assert.equal(Date.parse(c.started_at), Date.parse(NOW));
    const lines = ledgerLines(ctx.root);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].kind, 'coord-init');
    assert.equal(lines[0].seq, 1);
    assert.equal(lines[0].data.tcb_commit, COMMIT);
    assert.deepEqual(j.ledger_seq, [1]);
    assert.ok(ctx.root.length > 40, 'the temp root is longer than 40 characters');
    assert.ok(hasReason(j, 'root-long'), 'a root longer than 40 characters is a warning');
  });
});

test('T1 init with --session records the session in coord.json', async () => {
  await withRoot({ bare: true }, async (ctx) => {
    const sid = newSid();
    assertLine(init(ctx, ['--session', sid]), 0);
    assert.equal(coord(ctx).session, sid);
  });
});

test('T2 init again with the same commit changes nothing; with another commit exits 1 coord-exists', async () => {
  await withRoot({ bare: true }, async (ctx) => {
    assertLine(init(ctx), 0);
    const coordBytes = fs.readFileSync(coordPath(ctx));
    const ledgerBytes = fs.readFileSync(ledgerFile(ctx.root));
    assertLine(init(ctx), 0);
    assert.ok(coordBytes.equals(fs.readFileSync(coordPath(ctx))), 'coord.json byte-identical');
    assert.ok(ledgerBytes.equals(fs.readFileSync(ledgerFile(ctx.root))), 'ledger byte-identical');
    const j = assertLine(init(ctx, [], { commit: OTHER_COMMIT }), 1);
    assert.ok(hasReason(j, 'coord-exists'));
    assert.ok(coordBytes.equals(fs.readFileSync(coordPath(ctx))));
    assert.ok(ledgerBytes.equals(fs.readFileSync(ledgerFile(ctx.root))));
  });
});

test('T2 init never rewrites an existing .gitignore, .gitattributes or tasks.json', async () => {
  await withRoot({ bare: true }, async (ctx) => {
    w(path.join(ctx.root, '.gitignore'), 'custom-ignore\n');
    w(path.join(ctx.root, '.gitattributes'), 'custom-attributes\n');
    w(path.join(ctx.root, 'run', 'tasks.json'), { schema_version: 1, rev: 7, tasks: [] });
    const before = ['.gitignore', '.gitattributes', 'run/tasks.json'].map((f) => fs.readFileSync(path.join(ctx.root, f)));
    assertLine(init(ctx), 0);
    ['.gitignore', '.gitattributes', 'run/tasks.json'].forEach((f, i) => {
      assert.ok(before[i].equals(fs.readFileSync(path.join(ctx.root, f))), `${f} was rewritten`);
    });
    assert.ok(fs.existsSync(coordPath(ctx)));
  });
});

test('T2 init on a root with only tasks.json.prev writes no new table', async () => {
  await withRoot({ bare: true }, async (ctx) => {
    w(path.join(ctx.root, 'run', 'tasks.json.prev'), { schema_version: 1, rev: 3, tasks: [] });
    assertLine(init(ctx), 0);
    assert.equal(fs.existsSync(path.join(ctx.root, 'run', 'tasks.json')), false);
    assert.ok(fs.existsSync(path.join(ctx.root, 'run', 'tasks.json.prev')));
    assert.ok(fs.existsSync(coordPath(ctx)));
  });
});

test('T3 init with a bad --tcb-commit or --session exits 66, on a root without tcb/ exits 2 missing', async () => {
  await withRoot({ bare: true }, async (ctx) => {
    assertLine(runFrom(ctx.root, ['init', '--root', ctx.root, '--tcb-commit', 'abc']), 66);
    assertLine(runFrom(ctx.root, ['init', '--root', ctx.root, '--tcb-commit', COMMIT.toUpperCase()]), 66);
    assertLine(runFrom(ctx.root, ['init', '--root', ctx.root, '--tcb-commit', COMMIT, '--session', 'not-a-session']), 66);
    assertLine(runFrom(ctx.root, ['init', '--root', ctx.root]), 66);
    assert.equal(fs.existsSync(coordPath(ctx)), false);
    // a root without tcb/: the script runs from another root's copy
    const empty = fs.mkdtempSync(path.join(TMP, 'ho-empty-'));
    ctx.extra.push(empty);
    const j = assertLine(runFrom(ctx.root, ['init', '--root', empty, '--tcb-commit', COMMIT, '--now', NOW]), 2);
    assert.ok(hasReason(j, 'missing'));
    assert.deepEqual(fs.readdirSync(empty), [], 'nothing was created in the root without tcb/');
  });
});

test('T4 raise without a drain line of this ce exits 6 no-drain, coord unchanged, one incident line', async () => {
  await withRoot({}, async (ctx) => {
    const before = fs.readFileSync(coordPath(ctx));
    const j = assertLine(raise(ctx), 6);
    assert.ok(hasReason(j, 'no-drain'));
    assert.ok(before.equals(fs.readFileSync(coordPath(ctx))));
    assert.equal(ledgerLines(ctx.root, 'incident').length, 1);
    assert.equal(ledgerLines(ctx.root, 'ce-raise').length, 0);
  });
  await withRoot({ ce: 2 }, async (ctx) => {
    drainLine(ctx.root, 1); // a drain line of an older ce does not count
    assert.ok(hasReason(assertLine(raise(ctx, 2), 6), 'no-drain'));
  });
});

test('T5 raise with an attempt whose stop is unconfirmed exits 6 not-quiescent with unconfirmed 1', async () => {
  await withRoot({}, async (ctx) => {
    drainLine(ctx.root);
    const t = 'f1-research';
    setTasks(ctx, [row(t, { epoch: 2, step: 'stop-requested', attempts: [att(t, 1, { session: newSid(), stop: 'unconfirmed' }), att(t, 2)] })]);
    const before = fs.readFileSync(coordPath(ctx));
    const j = assertLine(raise(ctx), 6);
    assert.ok(hasReason(j, 'not-quiescent'));
    assert.equal(detailValue(j, 'unconfirmed'), 1);
    assert.ok(before.equals(fs.readFileSync(coordPath(ctx))));
  });
});

test('T5 raise with a bound attempt that has a transcript and no process exits 6 not-quiescent with unknown 1', async () => {
  await withRoot({}, async (ctx) => {
    drainLine(ctx.root);
    const t = 'f1-research';
    const sid = newSid();
    setTasks(ctx, [row(t, { step: 'bound', session: sid })]);
    const folder = path.join(ctx.root, 'wt', `${t}-e1`);
    writeTranscript(path.join(ctx.root, 'transcripts', folder.replace(/[:\\/._ ]/g, '-'), sid + '.jsonl'), { sessionId: sid, cwd: folder });
    const j = assertLine(raise(ctx), 6);
    assert.ok(hasReason(j, 'not-quiescent'));
    assert.equal(detailValue(j, 'unknown'), 1);
    assert.equal(coord(ctx).ce, 1);
  });
});

test('T6 raise, quiescent, with a live watcher and a live alarm: ce 2, both still alive and listed, one-line brief', async () => {
  await withRoot({}, async (ctx) => {
    drainLine(ctx.root);
    const watcher = liveWatcher(ctx);
    const alarm = liveAlarm(ctx);
    const j = assertLine(raise(ctx), 0);
    assert.equal(j.mode, 'raise');
    const c = coord(ctx);
    assert.equal(c.ce, 2);
    assert.equal(c.tcb_commit, COMMIT);
    assert.equal(c.session, null);
    assert.equal(Date.parse(c.started_at), Date.parse(NOW));
    const r = ledgerLines(ctx.root, 'ce-raise');
    assert.equal(r.length, 1);
    assert.deepEqual(r[0].data, { from: 1, to: 2 });
    assert.equal(r[0].ce, 1, 'the ce-raise line carries the old ce');
    assert.equal(j.result.from, 1);
    assert.equal(j.result.to, 2);
    const brief = j.result.brief;
    assert.equal(typeof brief, 'string');
    assert.ok(!brief.includes('\n'), 'the brief is one line');
    assert.ok(brief.includes(path.basename(ctx.root)));
    assert.match(brief, new RegExp(`^Coordinator ce 2 for run .+, tcb ${COMMIT}: run node .+status\\.mjs --root .+ --ce 2 and act on run/status\\.json\\.$`));
    const stale = j.result.stale_wake_sources;
    assert.ok(stale.length >= 2 && stale.every((x) => ['watcher', 'alarm'].includes(x.which)));
    const sw = stale.find((s) => s.which === 'watcher');
    const sa = stale.find((s) => s.which === 'alarm');
    assert.equal(sw.pid, watcher.pid);
    assert.equal(sw.start_time, watcher.start_time);
    assert.equal(sa.pid, alarm.pid);
    assert.equal(sa.start_time, alarm.start_time);
    assert.ok(isLive(watcher) && isLive(alarm), 'nothing was killed');
    assert.ok(psStart(watcher.pid) !== '' && psStart(alarm.pid) !== '', 'both wake sources are still running');
  });
});

test('T7 raise with an admitted row that has no process and no transcript exits 6 not-quiescent with unknown 1', async () => {
  await withRoot({}, async (ctx) => {
    drainLine(ctx.root);
    setTasks(ctx, [row('f1-research', { step: 'admitted' })]);
    const j = assertLine(raise(ctx), 6);
    assert.ok(hasReason(j, 'not-quiescent'));
    assert.equal(detailValue(j, 'unknown'), 1);
    assert.equal(coord(ctx).ce, 1);
  });
});

test('T9 raise --ce 1 when coord is already at 2 exits 64 and writes nothing', async () => {
  await withRoot({ ce: 2 }, async (ctx) => {
    drainLine(ctx.root, 2);
    const before = fs.readFileSync(coordPath(ctx));
    const lines = ledgerLines(ctx.root).length;
    assertLine(raise(ctx, 1), 64);
    assert.ok(before.equals(fs.readFileSync(coordPath(ctx))));
    assert.equal(ledgerLines(ctx.root).length, lines);
  });
});

test('T9 a second raise right after a successful one with --ce 1 exits 64', async () => {
  await withRoot({}, async (ctx) => {
    drainLine(ctx.root);
    assertLine(raise(ctx, 1), 0);
    const after = fs.readFileSync(coordPath(ctx));
    assertLine(raise(ctx, 1), 64);
    assert.ok(after.equals(fs.readFileSync(coordPath(ctx))));
    assert.equal(coord(ctx).ce, 2);
    assert.equal(ledgerLines(ctx.root, 'ce-raise').length, 1);
  });
});

test('T10 raise --dry-run reports to 2 and changes nothing', async () => {
  await withRoot({}, async (ctx) => {
    drainLine(ctx.root);
    const before = fs.readFileSync(coordPath(ctx));
    const lines = fs.readFileSync(ledgerFile(ctx.root));
    const j = assertLine(raise(ctx, 1, ['--dry-run']), 0);
    assert.equal(j.dry_run, true);
    assert.equal(j.result.to, 2);
    assert.ok(before.equals(fs.readFileSync(coordPath(ctx))));
    assert.ok(lines.equals(fs.readFileSync(ledgerFile(ctx.root))));
  });
});

test('T11 bind sets the session once; the same session again is exit 0; another exits 1 session-differs; a stale ce exits 64', async () => {
  await withRoot({ ce: 2 }, async (ctx) => {
    const sid = newSid();
    assertLine(bind(ctx, 2, sid), 0);
    assert.equal(coord(ctx).session, sid);
    assert.equal(coord(ctx).ce, 2);
    const binds = ledgerLines(ctx.root, 'coord-bind');
    assert.equal(binds.length, 1);
    assert.equal(binds[0].data.session, sid);
    const after = fs.readFileSync(coordPath(ctx));
    assertLine(bind(ctx, 2, sid), 0);
    assert.equal(ledgerLines(ctx.root, 'coord-bind').length, 1, 'no second line');
    const j = assertLine(bind(ctx, 2, newSid()), 1);
    assert.ok(hasReason(j, 'session-differs'));
    assert.ok(after.equals(fs.readFileSync(coordPath(ctx))));
    assertLine(bind(ctx, 1, newSid()), 64);
    assert.ok(after.equals(fs.readFileSync(coordPath(ctx))));
    assert.equal(ledgerLines(ctx.root, 'coord-bind').length, 1);
  });
});

test('T12 coord.json unparseable: raise and bind exit 67, init exits 67', async () => {
  await withRoot({}, async (ctx) => {
    w(coordPath(ctx), '{ not json');
    assertLine(raise(ctx), 67);
    assertLine(bind(ctx, 1, newSid()), 67);
    assertLine(init(ctx), 67);
    assert.equal(fs.readFileSync(coordPath(ctx), 'utf8'), '{ not json', 'the corrupt file is left alone');
  });
});

test('T13 run.lock held by a live process exits 75 for init, raise and bind', async () => {
  await withRoot({ bare: true, thr: { lock_retries: 3 } }, async (ctx) => {
    const holder = ctx.sleeper();
    w(path.join(ctx.root, 'run', 'run.lock'), JSON.stringify(lockRec(holder, { script: 'test' })));
    assertLine(init(ctx), 75);
    assert.equal(fs.existsSync(coordPath(ctx)), false, 'init wrote no coord.json');
  });
  await withRoot({ thr: { lock_retries: 3 } }, async (ctx) => {
    drainLine(ctx.root);
    const holder = ctx.sleeper();
    w(path.join(ctx.root, 'run', 'run.lock'), JSON.stringify(lockRec(holder, { script: 'test' })));
    const before = fs.readFileSync(coordPath(ctx));
    assertLine(raise(ctx), 75);
    assertLine(bind(ctx, 1, newSid()), 75);
    assert.ok(before.equals(fs.readFileSync(coordPath(ctx))));
    assert.equal(ledgerLines(ctx.root).length, 1, 'nothing was appended');
  });
});

test('X1 usage: init takes no --ce; raise needs --ce; bind needs a 36-character session; unknown flag', async () => {
  await withRoot({ bare: true }, async (ctx) => {
    assertLine(runFrom(ctx.root, ['init', '--root', ctx.root, '--tcb-commit', COMMIT, '--ce', '1']), 66);
    assertLine(runFrom(ctx.root, ['init', '--root', ctx.root, '--tcb-commit', COMMIT, '--no-such-flag']), 66);
    assert.equal(fs.existsSync(coordPath(ctx)), false);
  });
  await withRoot({}, async (ctx) => {
    assertLine(runFrom(ctx.root, ['raise', '--root', ctx.root]), 66);
    assertLine(runFrom(ctx.root, ['bind', '--root', ctx.root, '--ce', '1']), 66);
    assertLine(runFrom(ctx.root, ['bind', '--root', ctx.root, '--ce', '1', '--session', 'short']), 66);
    assertLine(runFrom(ctx.root, ['--root', ctx.root]), 66);
  });
});

// ------------------------------------------------ cannot be tested without the app
const NEEDS_APP = 'needs the app';
test('NA1 the old coordinator, woken by a late exit after the raise, is refused by every writing script and ends its turn', { skip: `${NEEDS_APP}: item 5, needs the harness's background command delivery` }, () => {});
test('NA2 the owner starts the successor from the brief', { skip: `${NEEDS_APP}: the owner's step in a real session` }, () => {});
test('NA3 the old watcher and alarm, left alive, reach their next ce check and exit 64', { skip: `${NEEDS_APP}: needs a real watcher and alarm running across a raise (item 5)` }, () => {});
test('NA4 a row that reaches admitted, started or bound between the pre-check and the lock is refused inside the lock', { skip: `${NEEDS_APP}: a race between two real sessions cannot be ordered from a test` }, () => {});
