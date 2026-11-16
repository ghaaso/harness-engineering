// Tests of tcb/scripts/selftest.mjs, written from spec/selftest.mjs.md and CONTRACT.md only.
// One test per numbered behaviour (T1..T19, T5b, T5c, T5d). Each test builds a temporary run root whose
// tcb/scripts/ holds 24 stubs (one per script name) that exit with the code and print the JSON their
// arguments ask for, writes fixture cases for them, runs the real selftest.mjs as a child process and
// checks the exit code, the stdout line, run/selftest.json, the ledger and the folders.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TCB = path.resolve(HERE, '..');
const BUILD = path.resolve(TCB, '..');
const TMP = path.join(BUILD, 'tmp');
const FIX = path.join(TCB, 'fixtures', 'selftest');
const SELFTEST = path.join(TCB, 'scripts', 'selftest.mjs');
const NOW = '2026-11-17T10:00:00.000Z';

const SCRIPTS = ['replace', 'admit', 'stop', 'watch', 'status', 'handover', 'commit', 'harvest', 'fsck', 'tms', 'promote', 'certify',
  'snap', 'witness', 'guard-hook', 'selftest', 'render', 'audit', 'seed', 'check-queue', 'protocol-freeze', 'compare', 'gate', 'cost'];
assert.equal(SCRIPTS.length, 24);

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const fwd = (p) => p.replaceAll('\\', '/');
const lines = (s) => s.split(/\r?\n/).filter((l) => l.length > 0);
const b64 = (v) => Buffer.from(JSON.stringify(v)).toString('base64');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const SLUG = { 0: 'ok', 1: 'fail', 2: 'not-run', 3: 'tamper', 6: 'deferred', 64: 'stale-ce', 65: 'stale-epoch', 66: 'usage', 67: 'table-corrupt', 70: 'internal', 75: 'lock-busy' };

function canon(v) {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return JSON.stringify(v);
}

// the tree hash of the contract (§4.2): sha256 of the canonical sorted [[relpath, sha256]...] of every file
function treeSha(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push([fwd(path.relative(dir, p)), sha(fs.readFileSync(p))]);
    }
  };
  walk(dir);
  out.sort((a, b) => cmp(a[0], b[0]));
  return sha(canon(out));
}

// all files of a tree (not folders), used to show that a run wrote nothing
function filesHash(dir, skip = []) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      const rel = fwd(path.relative(dir, p));
      if (skip.includes(rel.split('/')[0])) continue;
      if (e.isDirectory()) walk(p);
      else out.push([rel, sha(fs.readFileSync(p))]);
    }
  };
  walk(dir);
  out.sort((a, b) => cmp(a[0], b[0]));
  return sha(JSON.stringify(out));
}

// ---------------------------------------------------------------------------------------------
// the stub that stands for every script
// ---------------------------------------------------------------------------------------------
const STUB = String.raw`import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
const SCRIPT = '__SCRIPT__';
const argv = process.argv.slice(2);
const o = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--stub-')) {
    const k = argv[i].slice(7);
    (o[k] = o[k] || []).push(argv[i + 1] === undefined ? '' : argv[i + 1]);
    i++;
  }
}
const one = (k, d) => (o[k] ? o[k][0] : d);
const dec = (k) => (o[k] ? JSON.parse(Buffer.from(o[k][0], 'base64').toString('utf8')) : undefined);
const CODES = { 0: 'ok', 1: 'fail', 2: 'not-run', 6: 'deferred', 64: 'stale-ce', 65: 'stale-epoch', 66: 'usage', 67: 'table-corrupt', 70: 'internal', 75: 'lock-busy' };
const cwd = process.cwd();
let exit = Number(one('exit', '0'));
const result = dec('result64') || {};
const reasons = dec('reasons64') || [];
const out = one('out');
const put = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
if (o.marker) put(o.marker[0], String(process.pid));
if (o.pidfile) put(o.pidfile[0], String(process.pid));
if (o.grandchild) {
  const gc = spawn(process.execPath, ['-e', 'setTimeout(function () {}, 15000)'], { stdio: 'ignore', windowsHide: true });
  gc.unref();
  put(o.grandchild[0], String(gc.pid));
}
if (o.probe) {
  let thr = null;
  try { thr = JSON.parse(fs.readFileSync(path.join(cwd, 'tcb', 'thresholds.json'), 'utf8')); } catch (e) { thr = null; }
  const val = (n) => { const p = thr && thr.params && thr.params[n]; return p && typeof p === 'object' && 'value' in p ? p.value : p; };
  const has = (d) => fs.existsSync(path.join(cwd, 'tcb', d));
  const info = { cwd, transcripts_root: val('transcripts_root'), stall_calls: val('stall_calls'), hang_ticks: val('hang_ticks'),
    has_fixtures: has('fixtures'), has_test: has('test'), has_scripts: has('scripts'), has_thresholds: has('thresholds.json'),
    has_schemas: has('schemas'), has_profiles: has('profiles'), has_settings: has('settings'), has_agents: has('agents'), has_briefs: has('briefs') };
  if (out) put(out, JSON.stringify(info));
}
if (o.append) fs.appendFileSync(o.append[0], 'x');
if (o['break-ledger']) {
  const lf = path.join(cwd, 'run', 'ledger.jsonl');
  const t = fs.readFileSync(lf, 'utf8');
  fs.writeFileSync(lf, t.replace('"writer":"stub"', '"writer":"stuB"'));
}
if (o.write) put(path.join(cwd, o.write[0]), one('write-text', 'x'));
if (o.fetch) {
  const body = await new Promise((resolve, reject) => {
    http.get(o.fetch[0], (res) => { const ch = []; res.on('data', (d) => ch.push(d)); res.on('end', () => resolve(Buffer.concat(ch))); }).on('error', reject);
  });
  if (out) put(out, body);
  if (o['expect-body'] && body.toString('utf8') !== o['expect-body'][0]) exit = 1;
}
if (o.sleep) await new Promise((r) => setTimeout(r, Number(o.sleep[0])));
const line = JSON.stringify({ ok: exit === 0, script: SCRIPT, mode: null, exit, code: one('code', CODES[exit] || 'fail'), dry_run: false, result, reasons, ledger_seq: [] });
if (!o.nostdout) { const n = Number(one('lines', '1')); for (let i = 0; i < n; i++) process.stdout.write(line + '\n'); }
if (o.stderr) process.stderr.write(one('stderr', '') + '\n');
process.exitCode = exit;
`;

// ---------------------------------------------------------------------------------------------
// a temporary run root
// ---------------------------------------------------------------------------------------------
function readJson(f) {
  return JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
}

function setParam(root, name, value) {
  const f = path.join(root, 'tcb', 'thresholds.json');
  const j = readJson(f);
  j.params ??= {};
  if (j.params[name] && typeof j.params[name] === 'object') j.params[name].value = value;
  else j.params[name] = { value, unit: 'tests', source: 'guess', gate: false };
  fs.writeFileSync(f, JSON.stringify(j, null, 2));
}

function ledgerText(n) {
  let prev = '0'.repeat(64);
  const out = [];
  for (let i = 1; i <= n; i++) {
    const body = { seq: i, prev, ts: '2026-01-01T00:00:00.000Z', ce: 1, writer: 'stub', writer_sha: 'a'.repeat(64), kind: 'plan', data: { added: [] } };
    const hash = sha(prev + canon(body));
    out.push(JSON.stringify({ ...body, hash }));
    prev = hash;
  }
  return out.join('\n') + '\n';
}

function readLedger(R) {
  const f = R.p('run', 'ledger.jsonl');
  if (!fs.existsSync(f)) return { lines: [], ok: true, torn: false };
  const text = fs.readFileSync(f, 'utf8');
  const ls = text.split('\n').filter((l) => l.length);
  const recs = ls.map((l) => JSON.parse(l));
  let prev = '0'.repeat(64);
  let ok = true;
  recs.forEach((r, i) => {
    const { hash, ...rest } = r;
    if (r.seq !== i + 1 || r.prev !== prev || hash !== sha(prev + canon(rest))) ok = false;
    prev = hash;
  });
  return { lines: recs, ok, torn: text.length > 0 && !text.endsWith('\n') };
}

function makeRoot({ fixtures = true, canary = false } = {}) {
  fs.mkdirSync(TMP, { recursive: true });
  const root = fs.realpathSync(fs.mkdtempSync(path.join(TMP, 'sx-')));
  const R = {
    root,
    p: (...s) => path.join(root, ...s),
    out: path.join(root, 'out'),
    cleanup() {
      try { fs.rmSync(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 150 }); } catch { /* best effort */ }
    },
  };
  for (const d of ['run', 'store/objects', 'plan', 'views', 'completeness', 'sealed', 'queue', 'wt', 'transcripts', 'out', 'tcb/scripts']) fs.mkdirSync(path.join(root, d), { recursive: true });
  for (const name of ['schemas', 'profiles', 'settings', 'agents', 'briefs']) {
    const src = path.join(TCB, name);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(root, 'tcb', name), { recursive: true });
  }
  for (const f of ['thresholds.json', 'cost-inputs.json', 'denylist.txt', 'README.md']) {
    const src = path.join(TCB, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(root, 'tcb', f));
  }
  if (!fs.existsSync(R.p('tcb', 'thresholds.json'))) fs.writeFileSync(R.p('tcb', 'thresholds.json'), JSON.stringify({ schema_version: 1, params: {} }));
  setParam(root, 'transcripts_root', fwd(path.join(root, 'transcripts')));
  for (const s of SCRIPTS) fs.writeFileSync(R.p('tcb', 'scripts', s + '.mjs'), STUB.replace('__SCRIPT__', s));
  fs.writeFileSync(R.p('run', 'coord.json'), JSON.stringify({ schema_version: 1, ce: 1, started_at: NOW, tcb_commit: '0'.repeat(40) }));
  fs.writeFileSync(R.p('run', 'tasks.json'), JSON.stringify({ schema_version: 1, rev: 0, tasks: [] }));
  if (fixtures) defaultFixtures(R);
  if (canary) {
    fs.mkdirSync(R.p('tcb', 'fixtures', 'selftest'), { recursive: true });
    fs.copyFileSync(path.join(FIX, 'canary-expect.json'), R.p('tcb', 'fixtures', 'selftest', 'canary-expect.json'));
  }
  return R;
}

async function withRoot(opts, fn) {
  const R = makeRoot(opts);
  try {
    return await fn(R);
  } finally {
    R.cleanup();
  }
}

// ---------------------------------------------------------------------------------------------
// fixture cases
// ---------------------------------------------------------------------------------------------
const marker = (R, script, name) => fwd(path.join(R.out, `${script}.${name}.ran`));

function stubArgs(R, script, name, { exit = 0, code, result, reasons, extra = [], once = true } = {}) {
  const a = ['--root', '{root}'];
  if (script === 'watch' && once) a.push('--once');
  a.push('--stub-exit', String(exit));
  if (code) a.push('--stub-code', code);
  if (result !== undefined) a.push('--stub-result64', b64(result));
  if (reasons !== undefined) a.push('--stub-reasons64', b64(reasons));
  a.push('--stub-marker', marker(R, script, name), ...extra);
  return a;
}

function addCase(R, script, name, def, { rootFiles = {}, files = {} } = {}) {
  const dir = R.p('tcb', 'fixtures', script, name);
  fs.mkdirSync(dir, { recursive: true });
  const j = { schema_version: 1, script, kind: def.kind, fault_class: def.fault_class ?? (def.kind === 'good' ? 'baseline' : 'refusal'), args: def.args, ...(def.serve ? { serve: def.serve } : {}), ...(def.thresholds ? { thresholds: def.thresholds } : {}), expect: def.expect };
  fs.writeFileSync(path.join(dir, 'case.json'), JSON.stringify(j, null, 2));
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  for (const [rel, text] of Object.entries(rootFiles)) {
    fs.mkdirSync(path.dirname(path.join(dir, 'root', rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, 'root', rel), text);
  }
}

function defaultFixtures(R) {
  for (const s of SCRIPTS) {
    addCase(R, s, 'good-ok', { kind: 'good', args: stubArgs(R, s, 'good-ok'), expect: { exit: 0 } });
    addCase(R, s, 'bad-fail', { kind: 'bad', fault_class: 'refusal', args: stubArgs(R, s, 'bad-fail', { exit: 1, reasons: [{ code: 'refused', detail: null }] }), expect: { exit: 1, code: 'refused' } });
  }
}

// ---------------------------------------------------------------------------------------------
// running selftest
// ---------------------------------------------------------------------------------------------
function runSt(R, mode, extra = [], { ce = '1', jobs = '4', timeoutMs = '20000', limitMs = 240000, defaults = true, script = SELFTEST } = {}) {
  const args = [script, mode, '--root', R.root, '--ce', ce];
  if (defaults) {
    if (mode === 'run') args.push('--jobs', jobs, '--case-timeout-ms', timeoutMs);
    args.push('--now', NOW);
  }
  args.push(...extra);
  return new Promise((resolve) => {
    const t0 = Date.now();
    const p = spawn(process.execPath, args, { cwd: R.root, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    p.stdout.on('data', (d) => (stdout += d));
    p.stderr.on('data', (d) => (stderr += d));
    const killer = setTimeout(() => { try { p.kill(); } catch { /* gone */ } }, limitMs);
    p.on('close', (status, signal) => {
      clearTimeout(killer);
      const ls = lines(stdout);
      let json = null;
      try { json = JSON.parse(ls.at(-1)); } catch { /* not json */ }
      resolve({ status, signal, stdout, stderr, json, nlines: ls.length, ms: Date.now() - t0 });
    });
  });
}

function assertLine(r, { exit, mode, dry = false }) {
  assert.equal(r.status, exit, `exit code (stderr: ${r.stderr.slice(0, 400)}; stdout: ${r.stdout.slice(0, 400)})`);
  assert.equal(r.nlines, 1, `stdout must be exactly one line, got ${r.nlines}: ${r.stdout.slice(0, 400)}`);
  const j = r.json;
  assert.ok(j && typeof j === 'object', 'stdout line must be JSON');
  for (const k of ['ok', 'script', 'mode', 'exit', 'code', 'dry_run', 'result', 'reasons', 'ledger_seq']) assert.ok(k in j, `stdout line lacks ${k}`);
  assert.equal(j.script, 'selftest');
  assert.equal(j.mode, mode);
  assert.equal(j.exit, exit);
  assert.equal(j.code, SLUG[exit], 'code is the slug of the exit');
  assert.equal(j.ok, exit === 0);
  assert.equal(j.dry_run, dry);
  assert.ok(Array.isArray(j.reasons) && j.reasons.every((x) => typeof x.code === 'string'));
  assert.ok(Array.isArray(j.ledger_seq) && j.ledger_seq.every(Number.isInteger));
}

const reasonCodes = (r) => (r.json?.reasons ?? []).map((x) => x.code);
const mentions = (r, s) => JSON.stringify(r.json?.reasons ?? []).includes(s);
const readSt = (R) => readJson(R.p('run', 'selftest.json'));
const caseOf = (st, script, name) => st.cases.find((c) => c.script === script && c.case === name);
const ran = (R) => (fs.existsSync(R.out) ? fs.readdirSync(R.out).filter((f) => f.endsWith('.ran')).sort() : []);
const alive = (pid) => {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
};

// =============================================================================================
// run mode
// =============================================================================================
test('T1 all cases right: exit 0, selftest.json pass bound to the tcb tree, two ledger lines, no case root left', async () => {
  await withRoot({}, async (R) => {
    // one case with a real ledger that must stay valid
    addCase(R, 'status', 'good-ledger-ok', { kind: 'good', args: stubArgs(R, 'status', 'good-ledger-ok'), expect: { exit: 0 } }, { rootFiles: { 'run/ledger.jsonl': ledgerText(3) } });
    const t0 = treeSha(R.p('tcb'));
    const r = await runSt(R, 'run');
    assertLine(r, { exit: 0, mode: 'run' });
    const st = readSt(R);
    assert.equal(st.schema_version, 1);
    assert.equal(st.result, 'pass');
    assert.equal(st.tcb_sha, t0, 'tcb_sha must be treeSha(tcb/)');
    assert.equal(st.ce, 1);
    assert.equal(st.ran_at, NOW);
    assert.deepEqual(st.failed, []);
    assert.equal(st.cases.length, 2 * SCRIPTS.length + 1);
    for (const c of st.cases) {
      for (const k of ['n', 'script', 'case', 'kind', 'fault_class', 'expect_exit', 'exit', 'pass']) assert.ok(k in c, `case entry lacks ${k}`);
      assert.equal(c.pass, true, `${c.script}/${c.case} should pass`);
      assert.equal(c.exit, c.expect_exit);
      assert.ok(Number.isInteger(c.n));
    }
    const order = st.cases.map((c) => [c.script, c.case]);
    assert.deepEqual(order, [...order].sort((a, b) => cmp(a[0], b[0]) || cmp(a[1], b[1])), 'cases are sorted by script, case');
    assert.ok(st.cases.every((c, i) => i === 0 || c.n > st.cases[i - 1].n), 'n follows the sorted order');
    assert.ok(Array.isArray(st.checks) && st.checks.every((c) => c.pass === true && typeof c.check === 'string'));
    assert.equal(ran(R).length, 2 * SCRIPTS.length + 1, 'every case ran');
    // ledger
    const led = readLedger(R);
    assert.ok(led.ok && !led.torn, 'the ledger verifies');
    assert.equal(led.lines.length, 2);
    const kinds = led.lines.map((l) => l.kind).sort();
    assert.deepEqual(kinds, ['check', 'selftest']);
    const sl = led.lines.find((l) => l.kind === 'selftest');
    assert.deepEqual({ tcb_sha: sl.data.tcb_sha, result: sl.data.result, failed: sl.data.failed }, { tcb_sha: t0, result: 'pass', failed: [] });
    assert.equal(sl.writer, 'selftest');
    const cl = led.lines.find((l) => l.kind === 'check');
    assert.equal(cl.data.check, 'selftest');
    assert.equal(cl.data.subject, t0);
    assert.equal(cl.data.result, 'pass');
    assert.ok(Array.isArray(cl.data.reasons));
    assert.deepEqual([...r.json.ledger_seq].sort(), led.lines.map((l) => l.seq).sort());
    // no case root left
    const tmp = R.p('tmp');
    assert.ok(!fs.existsSync(tmp) || fs.readdirSync(tmp).filter((n) => n.startsWith('st-')).length === 0, 'case roots must be removed');
  });
});

test('T2 one bad case whose stub exits 0 instead of 1: exit 1, failed names the case, the selftest line is fail', async () => {
  await withRoot({}, async (R) => {
    addCase(R, 'tms', 'bad-fail', { kind: 'bad', fault_class: 'refusal', args: stubArgs(R, 'tms', 'bad-fail', { exit: 0 }), expect: { exit: 1, code: 'refused' } });
    const r = await runSt(R, 'run');
    assertLine(r, { exit: 1, mode: 'run' });
    const st = readSt(R);
    assert.equal(st.result, 'fail');
    assert.deepEqual(st.failed, ['tms/bad-fail']);
    const c = caseOf(st, 'tms', 'bad-fail');
    assert.equal(c.pass, false);
    assert.equal(c.exit, 0);
    assert.equal(c.expect_exit, 1);
    assert.equal(st.cases.filter((x) => !x.pass).length, 1);
    const led = readLedger(R);
    assert.ok(led.ok);
    const sl = led.lines.find((l) => l.kind === 'selftest');
    assert.equal(sl.data.result, 'fail');
    assert.deepEqual(sl.data.failed, ['tms/bad-fail']);
    assert.equal(led.lines.find((l) => l.kind === 'check').data.result, 'fail');
    const tmp = R.p('tmp');
    assert.ok(!fs.existsSync(tmp) || fs.readdirSync(tmp).filter((n) => n.startsWith('st-')).length === 0, 'case roots must be removed also after a failure');
  });
});

test('T3 a script with only good cases is no-fixtures; a missing script file is missing-script', async () => {
  await withRoot({}, async (R) => {
    fs.rmSync(R.p('tcb', 'fixtures', 'witness', 'bad-fail'), { recursive: true, force: true });
    const r = await runSt(R, 'run');
    assertLine(r, { exit: 1, mode: 'run' });
    assert.ok(reasonCodes(r).includes('no-fixtures'), `reasons: ${JSON.stringify(r.json.reasons)}`);
  });
  await withRoot({}, async (R) => {
    fs.rmSync(R.p('tcb', 'scripts', 'snap.mjs'));
    const r = await runSt(R, 'run');
    assertLine(r, { exit: 1, mode: 'run' });
    assert.ok(reasonCodes(r).includes('missing-script'), `reasons: ${JSON.stringify(r.json.reasons)}`);
  });
  await withRoot({}, async (R) => {
    fs.rmSync(R.p('tcb', 'fixtures', 'cost'), { recursive: true, force: true });
    const r = await runSt(R, 'run');
    assertLine(r, { exit: 1, mode: 'run' });
    assert.ok(reasonCodes(r).includes('no-fixtures'), 'a script with no cases at all is also no-fixtures');
  });
  await withRoot({}, async (R) => {
    fs.writeFileSync(R.p('tcb', 'fixtures', 'gate', 'good-ok', 'case.json'), '{ not json');
    const r = await runSt(R, 'run');
    assertLine(r, { exit: 1, mode: 'run' });
    assert.ok(reasonCodes(r).includes('bad-case'), `reasons: ${JSON.stringify(r.json.reasons)}`);
  });
});

test('T4 a stub that prints two stdout lines, or a result missing an expected key, fails that case', async () => {
  await withRoot({}, async (R) => {
    addCase(R, 'compare', 'good-two-lines', { kind: 'good', args: stubArgs(R, 'compare', 'good-two-lines', { extra: ['--stub-lines', '2'] }), expect: { exit: 0 } });
    addCase(R, 'compare', 'good-missing-key', { kind: 'good', args: stubArgs(R, 'compare', 'good-missing-key', { result: { a: 1 } }), expect: { exit: 0, result: { a: 1, b: 2 } } });
    addCase(R, 'compare', 'good-deep-subset', { kind: 'good', args: stubArgs(R, 'compare', 'good-deep-subset', { result: { k: { x: 1, y: 2 }, z: 3 } }), expect: { exit: 0, result: { k: { x: 1 } } } });
    const r = await runSt(R, 'run');
    assertLine(r, { exit: 1, mode: 'run' });
    const st = readSt(R);
    assert.equal(caseOf(st, 'compare', 'good-two-lines').pass, false, 'two stdout lines');
    assert.equal(caseOf(st, 'compare', 'good-missing-key').pass, false, 'result missing an expected key');
    assert.equal(caseOf(st, 'compare', 'good-deep-subset').pass, true, 'a deep subset matches');
    assert.deepEqual([...st.failed].sort(), ['compare/good-missing-key', 'compare/good-two-lines']);
  });
});

test('T5 a stub that sleeps past --case-timeout-ms and spawned a grandchild: why timeout, both ended, the run completes, a foreign process survives', async () => {
  await withRoot({}, async (R) => {
    const gcFile = fwd(path.join(R.out, 'gc.pid'));
    const stubFile = fwd(path.join(R.out, 'stub.pid'));
    addCase(R, 'stop', 'good-slow', { kind: 'good', args: stubArgs(R, 'stop', 'good-slow', { extra: ['--stub-sleep', '20000', '--stub-grandchild', gcFile, '--stub-pidfile', stubFile] }), expect: { exit: 0 } });
    // a process of the test's own, outside selftest, that must survive
    const bystander = spawn(process.execPath, ['-e', 'setTimeout(function () {}, 60000)'], { stdio: 'ignore', windowsHide: true });
    try {
      assert.ok(bystander.pid);
      // 2000 ms instead of the spec's 300 so that a loaded PC does not time out the quick cases
      const r = await runSt(R, 'run', [], { timeoutMs: '2000' });
      assertLine(r, { exit: 1, mode: 'run' });
      assert.ok(r.ms < 18000, `the run took ${r.ms} ms: the slow case was waited out, not ended`);
      const st = readSt(R);
      const c = caseOf(st, 'stop', 'good-slow');
      assert.equal(c.pass, false);
      assert.ok(String(c.why).includes('timeout'), `why: ${c.why}`);
      assert.deepEqual(st.failed, ['stop/good-slow']);
      assert.equal(st.cases.filter((x) => x.pass).length, st.cases.length - 1, 'every other case completed and passed');
      assert.ok(fs.existsSync(stubFile) && fs.existsSync(gcFile), 'the stub must have started and spawned its grandchild before the timeout');
      const pids = [Number(fs.readFileSync(stubFile, 'utf8')), Number(fs.readFileSync(gcFile, 'utf8'))];
      for (let i = 0; i < 50 && pids.some(alive); i++) await sleep(100);
      assert.deepEqual(pids.map(alive), [false, false], 'the stub and its grandchild must both be ended');
      assert.equal(alive(bystander.pid), true, 'a process that selftest did not spawn must be left alone');
    } finally {
      try { bystander.kill(); } catch { /* gone */ }
    }
  });
});

test('T5b a watch case with no --once, --alarm with a short --sleep-ms or --intake is watch-case-loops before any case runs', async () => {
  const badVariants = [
    ['no loop-ending flag', []],
    ['--alarm without --sleep-ms', ['--alarm', '--ce', '1']],
    ['--alarm with a --sleep-ms beyond the case timeout', ['--alarm', '--ce', '1', '--sleep-ms', '999999999']],
  ];
  for (const [label, flags] of badVariants) {
    await withRoot({}, async (R) => {
      addCase(R, 'watch', 'bad-loop', { kind: 'bad', fault_class: 'loop', args: stubArgs(R, 'watch', 'bad-loop', { exit: 1, once: false, extra: flags }), expect: { exit: 1 } });
      const r = await runSt(R, 'run');
      assertLine(r, { exit: 1, mode: 'run' });
      assert.ok(reasonCodes(r).includes('watch-case-loops'), `${label}: reasons ${JSON.stringify(r.json.reasons)}`);
      assert.deepEqual(ran(R), [], `${label}: no case may run`);
    });
  }
  await withRoot({}, async (R) => {
    addCase(R, 'watch', 'good-alarm', { kind: 'good', args: stubArgs(R, 'watch', 'good-alarm', { once: false, extra: ['--alarm', '--ce', '1', '--sleep-ms', '50'] }), expect: { exit: 0 } });
    addCase(R, 'watch', 'good-intake', { kind: 'good', args: stubArgs(R, 'watch', 'good-intake', { once: false, extra: ['--intake', '--ce', '1'] }), expect: { exit: 0 } });
    const r = await runSt(R, 'run');
    assertLine(r, { exit: 0, mode: 'run' });
    assert.ok(!reasonCodes(r).includes('watch-case-loops'));
  });
});

test('T5c the stub reads its transcripts_root: under the case root of the form <root>/tmp/st-<8 hex>/<n>/; the case copy has no tcb/fixtures', async () => {
  await withRoot({}, async (R) => {
    const out = fwd(path.join(R.out, 'probe.json'));
    addCase(R, 'render', 'good-probe', { kind: 'good', args: stubArgs(R, 'render', 'good-probe', { extra: ['--stub-probe', '1', '--stub-out', out] }), expect: { exit: 0 } });
    const r = await runSt(R, 'run');
    assertLine(r, { exit: 0, mode: 'run' });
    const info = readJson(out);
    const cwd = fwd(info.cwd).toLowerCase();
    const rootF = fwd(R.root).toLowerCase();
    const m = new RegExp('^' + rootF.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/tmp/st-[0-9a-f]{8}/(\\d+)$').exec(cwd);
    assert.ok(m, `case root ${info.cwd} is not <root>/tmp/st-<8 hex>/<n>`);
    const st = readSt(R);
    assert.equal(Number(m[1]), caseOf(st, 'render', 'good-probe').n, 'the folder name is the case index n of selftest.json');
    assert.equal(fwd(info.transcripts_root).toLowerCase(), cwd + '/transcripts', 'transcripts_root is under the case root');
    assert.equal(info.has_fixtures, false, 'the case copy has no tcb/fixtures');
    assert.equal(info.has_test, false, 'the case copy has no tcb/test');
    for (const k of ['has_scripts', 'has_thresholds']) assert.equal(info[k], true, k);
  });
});

test('T5d expect.code: memory matches a stub printing code deferred with a memory reason, and fails one printing code memory without reasons', async () => {
  await withRoot({}, async (R) => {
    addCase(R, 'gate', 'bad-memory-ok', { kind: 'bad', fault_class: 'memory', args: stubArgs(R, 'gate', 'bad-memory-ok', { exit: 6, code: 'deferred', reasons: [{ code: 'memory', detail: null }] }), expect: { exit: 6, code: 'memory' } });
    addCase(R, 'gate', 'bad-memory-no-reasons', { kind: 'bad', fault_class: 'memory', args: stubArgs(R, 'gate', 'bad-memory-no-reasons', { exit: 6, code: 'memory' }), expect: { exit: 6, code: 'memory' } });
    const r = await runSt(R, 'run');
    assertLine(r, { exit: 1, mode: 'run' });
    const st = readSt(R);
    assert.equal(caseOf(st, 'gate', 'bad-memory-ok').pass, true);
    assert.equal(caseOf(st, 'gate', 'bad-memory-no-reasons').pass, false);
    assert.deepEqual(st.failed, ['gate/bad-memory-no-reasons']);
  });
});

test('T6 --jobs 4 and --jobs 1 give byte-equal cases arrays', async () => {
  await withRoot({}, async (R) => {
    // different durations so that completion order differs from the sorted order
    addCase(R, 'admit', 'good-slow-a', { kind: 'good', args: stubArgs(R, 'admit', 'good-slow-a', { extra: ['--stub-sleep', '500'] }), expect: { exit: 0 } });
    addCase(R, 'cost', 'good-slow-b', { kind: 'good', args: stubArgs(R, 'cost', 'good-slow-b', { extra: ['--stub-sleep', '300'] }), expect: { exit: 0 } });
    addCase(R, 'tms', 'bad-wrong-exit', { kind: 'bad', args: stubArgs(R, 'tms', 'bad-wrong-exit', { exit: 2 }), expect: { exit: 1 } });
    const r4 = await runSt(R, 'run', [], { jobs: '4' });
    assertLine(r4, { exit: 1, mode: 'run' });
    const a = JSON.stringify(readSt(R).cases);
    const r1 = await runSt(R, 'run', [], { jobs: '1' });
    assertLine(r1, { exit: 1, mode: 'run' });
    const b = JSON.stringify(readSt(R).cases);
    assert.equal(a, b);
    assert.ok(JSON.parse(a).length === 2 * SCRIPTS.length + 3);
  });
});

test('T7 threshold overrides reach only the case copy: the live thresholds.json and treeSha(tcb/) are unchanged', async () => {
  await withRoot({}, async (R) => {
    const over = fwd(path.join(R.out, 'override.json'));
    const dflt = fwd(path.join(R.out, 'default.json'));
    addCase(R, 'cost', 'good-override', { kind: 'good', args: stubArgs(R, 'cost', 'good-override', { extra: ['--stub-probe', '1', '--stub-out', over] }), thresholds: { stall_calls: 7, hang_ticks: 3 }, expect: { exit: 0 } });
    addCase(R, 'cost', 'good-default', { kind: 'good', args: stubArgs(R, 'cost', 'good-default', { extra: ['--stub-probe', '1', '--stub-out', dflt] }), expect: { exit: 0 } });
    const live = fs.readFileSync(R.p('tcb', 'thresholds.json'));
    const liveJ = JSON.parse(live);
    const liveStall = liveJ.params.stall_calls?.value;
    assert.notEqual(liveStall, 7, 'the test needs a live stall_calls other than 7');
    const t0 = treeSha(R.p('tcb'));
    const r = await runSt(R, 'run');
    assertLine(r, { exit: 0, mode: 'run' });
    const o = readJson(over);
    assert.equal(o.stall_calls, 7);
    assert.equal(o.hang_ticks, 3);
    assert.equal(readJson(dflt).stall_calls, liveStall, 'another case keeps the live value');
    assert.deepEqual(fs.readFileSync(R.p('tcb', 'thresholds.json')), live, 'live thresholds.json must be byte-equal');
    assert.equal(treeSha(R.p('tcb')), t0);
    assert.equal(readSt(R).tcb_sha, t0);
  });
});

test('T8 a stub that edits a file of the live tcb during its case: result not_run, tcb-changed, exit 2', async () => {
  await withRoot({}, async (R) => {
    const live = fwd(R.p('tcb', 'README.md'));
    if (!fs.existsSync(live)) fs.writeFileSync(live, 'synthetic\n');
    addCase(R, 'snap', 'good-edit-live', { kind: 'good', args: stubArgs(R, 'snap', 'good-edit-live', { extra: ['--stub-append', live] }), expect: { exit: 0 } });
    const r = await runSt(R, 'run');
    assertLine(r, { exit: 2, mode: 'run' });
    assert.ok(reasonCodes(r).includes('tcb-changed'), `reasons: ${JSON.stringify(r.json.reasons)}`);
    assert.equal(readSt(R).result, 'not_run');
    const led = readLedger(R);
    assert.ok(led.ok);
    assert.ok(!led.lines.some((l) => l.kind === 'selftest' && l.data.result === 'pass'), 'a changed tree must not be certified');
  });
});

test('T9 a serve case: the stub fetches {server}/a.html and sees the served bytes', async () => {
  await withRoot({}, async (R) => {
    const body = 'served-bytes-' + crypto.randomBytes(6).toString('hex');
    const out = fwd(path.join(R.out, 'served.txt'));
    addCase(R, 'witness', 'good-serve', {
      kind: 'good',
      args: stubArgs(R, 'witness', 'good-serve', { extra: ['--stub-fetch', '{server}/a.html', '--stub-expect-body', body, '--stub-out', out] }),
      serve: { '/a.html': 'files/a.html' },
      thresholds: { allow_loopback: true },
      expect: { exit: 0 },
    }, { files: { 'files/a.html': body } });
    const r = await runSt(R, 'run');
    assertLine(r, { exit: 0, mode: 'run' });
    assert.equal(fs.readFileSync(out, 'utf8'), body);
    assert.equal(caseOf(readSt(R), 'witness', 'good-serve').pass, true);
  });
});

test('T10 a case whose stub breaks its ledger chain while the input chain verified fails ledger-broken', async () => {
  await withRoot({}, async (R) => {
    const rootFiles = { 'run/ledger.jsonl': ledgerText(3) };
    addCase(R, 'fsck', 'good-ledger-ok', { kind: 'good', args: stubArgs(R, 'fsck', 'good-ledger-ok'), expect: { exit: 0 } }, { rootFiles });
    addCase(R, 'fsck', 'good-ledger-break', { kind: 'good', args: stubArgs(R, 'fsck', 'good-ledger-break', { extra: ['--stub-break-ledger', '1'] }), expect: { exit: 0 } }, { rootFiles });
    const r = await runSt(R, 'run');
    assertLine(r, { exit: 1, mode: 'run' });
    const st = readSt(R);
    assert.equal(caseOf(st, 'fsck', 'good-ledger-ok').pass, true);
    const c = caseOf(st, 'fsck', 'good-ledger-break');
    assert.equal(c.pass, false);
    assert.ok(JSON.stringify(c).includes('ledger-broken') || reasonCodes(r).includes('ledger-broken'), `entry: ${JSON.stringify(c)}`);
    assert.deepEqual(st.failed, ['fsck/good-ledger-break']);
  });
});

test('T11 allow_loopback true in the live thresholds is loopback-on; a profile with an extra field is role-files', async () => {
  await withRoot({}, async (R) => {
    setParam(R.root, 'allow_loopback', true);
    const r = await runSt(R, 'run');
    assertLine(r, { exit: 1, mode: 'run' });
    assert.ok(reasonCodes(r).includes('loopback-on'), `reasons: ${JSON.stringify(r.json.reasons)}`);
  });
  await withRoot({}, async (R) => {
    const f = R.p('tcb', 'profiles', 'control.json');
    assert.ok(fs.existsSync(f), 'the live tcb must ship tcb/profiles/control.json');
    const p = readJson(f);
    p.bogus_extra = true;
    fs.writeFileSync(f, JSON.stringify(p, null, 2));
    const r = await runSt(R, 'run');
    assertLine(r, { exit: 1, mode: 'run' });
    assert.ok(reasonCodes(r).includes('role-files'), `reasons: ${JSON.stringify(r.json.reasons)}`);
  });
});

test('T12 --only seed runs seed\'s cases only and writes no file and no ledger line', async () => {
  await withRoot({}, async (R) => {
    const before = filesHash(R.root, ['out']);
    const r = await runSt(R, 'run', ['--only', 'seed']);
    assertLine(r, { exit: 0, mode: 'run' });
    assert.deepEqual(ran(R), ['seed.bad-fail.ran', 'seed.good-ok.ran']);
    assert.ok(!fs.existsSync(R.p('run', 'selftest.json')), 'a partial run must not write selftest.json');
    assert.ok(!fs.existsSync(R.p('run', 'ledger.jsonl')), 'a partial run must not append a ledger line');
    assert.equal(filesHash(R.root, ['out']), before, 'no file may change');
  });
});

test('T13 --dry-run lists the cases, spawns nothing, creates no tmp/ folder and takes no lock', async () => {
  await withRoot({}, async (R) => {
    const before = filesHash(R.root, ['out']);
    const r = await runSt(R, 'run', ['--dry-run']);
    assertLine(r, { exit: 0, mode: 'run', dry: true });
    assert.ok(JSON.stringify(r.json.result).includes('good-ok'), 'the case list is printed');
    assert.deepEqual(ran(R), [], 'nothing is spawned');
    assert.ok(!fs.existsSync(R.p('tmp')), 'no tmp/ folder');
    assert.ok(!fs.existsSync(R.p('run', 'run.lock')), 'no lock');
    assert.ok(!fs.existsSync(R.p('run', 'selftest.json')));
    assert.ok(!fs.existsSync(R.p('run', 'ledger.jsonl')));
    assert.equal(filesHash(R.root, ['out']), before);
  });
});

function ownStartTime() {
  const exe = 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
  const cmd = `[Console]::OutputEncoding=[Text.Encoding]::UTF8; (Get-CimInstance Win32_Process -Filter "ProcessId=${process.pid}").CreationDate.ToUniversalTime().ToString('o')`;
  try {
    const r = spawnSync(exe, ['-NoProfile', '-NonInteractive', '-Command', cmd], { encoding: 'utf8', windowsHide: true, timeout: 30000 });
    const s = (r.stdout ?? '').trim();
    return /^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(s) ? s : null;
  } catch {
    return null;
  }
}

test('T14 a stale ce exits 64 and writes nothing; a busy lock at the end exits 75 without selftest.json', { concurrency: false }, async (t) => {
  await withRoot({}, async (R) => {
    const before = filesHash(R.root, ['out']);
    const r = await runSt(R, 'run', [], { ce: '99' });
    assertLine(r, { exit: 64, mode: 'run' });
    assert.equal(filesHash(R.root, ['out']), before, 'nothing may be written');
    assert.deepEqual(ran(R), [], 'no case may run');
    assert.ok(!fs.existsSync(R.p('tmp')));
  });
  const start = ownStartTime();
  if (!start) {
    t.diagnostic('the start time of this process could not be read; the lock-busy half is skipped');
    return;
  }
  await withRoot({}, async (R) => {
    setParam(R.root, 'lock_retries', 3);
    const lock = R.p('run', 'run.lock');
    fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, start_time: start, nonce: crypto.randomBytes(16).toString('hex'), script: 'test', ce: 1, acquired_at: NOW }));
    try {
      const r = await runSt(R, 'run');
      assertLine(r, { exit: 75, mode: 'run' });
      assert.ok(!fs.existsSync(R.p('run', 'selftest.json')), 'no selftest.json when the lock could not be taken');
      assert.ok(fs.existsSync(lock), 'the lock of another holder must not be removed');
    } finally {
      fs.rmSync(lock, { force: true });
    }
  });
});

// =============================================================================================
// steps of the spec that no numbered behaviour names
// =============================================================================================
test('step 5 judge: stdout_empty, stderr_prefix, files and the exit code are each judged', async () => {
  await withRoot({}, async (R) => {
    const g = (name, extra, expect, kind = 'good', exit = 0) => addCase(R, 'harvest', name, { kind, args: stubArgs(R, 'harvest', name, { exit, extra }), expect });
    g('good-stdout-empty', ['--stub-nostdout', '1'], { exit: 0, stdout_empty: true });
    g('good-stdout-empty-wrong', [], { exit: 0, stdout_empty: true });
    g('good-stderr-prefix', ['--stub-stderr', 'fatal: sample'], { exit: 0, stderr_prefix: 'fatal' });
    g('good-stderr-prefix-wrong', ['--stub-stderr', 'other'], { exit: 0, stderr_prefix: 'fatal' });
    g('good-files', ['--stub-write', 'made.txt', '--stub-write-text', 'hello'], { exit: 0, files: { 'made.txt': sha('hello'), 'never.txt': 'absent' } });
    g('good-files-wrong-sha', ['--stub-write', 'made.txt', '--stub-write-text', 'hello'], { exit: 0, files: { 'made.txt': sha('other') } });
    g('good-files-missing', [], { exit: 0, files: { 'made.txt': 'present' } });
    g('good-files-present', ['--stub-write', 'made.txt'], { exit: 0, files: { 'made.txt': 'present' } });
    g('bad-exit-mismatch', [], { exit: 1 }, 'bad', 2);
    const r = await runSt(R, 'run');
    assertLine(r, { exit: 1, mode: 'run' });
    const st = readSt(R);
    const want = {
      'good-stdout-empty': true, 'good-stdout-empty-wrong': false, 'good-stderr-prefix': true, 'good-stderr-prefix-wrong': false,
      'good-files': true, 'good-files-wrong-sha': false, 'good-files-missing': false, 'good-files-present': true, 'bad-exit-mismatch': false,
    };
    const got = {};
    for (const k of Object.keys(want)) got[k] = caseOf(st, 'harvest', k)?.pass;
    assert.deepEqual(got, want);
  });
});

test('--keep-failed keeps the roots of failing cases under tmp/ and only those', async () => {
  await withRoot({}, async (R) => {
    addCase(R, 'tms', 'bad-fail', { kind: 'bad', args: stubArgs(R, 'tms', 'bad-fail', { exit: 0 }), expect: { exit: 1, code: 'refused' } });
    const r = await runSt(R, 'run', ['--keep-failed']);
    assertLine(r, { exit: 1, mode: 'run' });
    const st = readSt(R);
    const bad = caseOf(st, 'tms', 'bad-fail');
    const kept = [];
    for (const d of fs.readdirSync(R.p('tmp')).filter((n) => n.startsWith('st-'))) {
      for (const n of fs.readdirSync(R.p('tmp', d))) kept.push(Number(n));
    }
    assert.deepEqual(kept, [bad.n], 'only the failing case root is kept');
  });
});

test('step 6 an unwritable tmp/ is not_run: exit 2 and no case certifies the tree', async () => {
  await withRoot({}, async (R) => {
    fs.writeFileSync(R.p('tmp'), 'this is a file, not a folder');
    const r = await runSt(R, 'run');
    assertLine(r, { exit: 2, mode: 'run' });
    const led = readLedger(R);
    assert.ok(!led.lines.some((l) => l.kind === 'selftest' && l.data.result === 'pass'));
  });
});

// =============================================================================================
// canary mode
// =============================================================================================
const HOOK = '[guard-hook] deny write-protected: refused by the test hook';
const PERM = 'Permission to use this tool has been denied.';
const SID = 'a1b2c3d4-0000-4000-8000-000000000001';

function std(R) {
  const base = fwd(R.root) + '/canary-area';
  return {
    sessionId: SID,
    cwd: R.root,
    main: [
      { tool: 'Write', input: { file_path: base + '/.claude/settings.json', content: 'x' }, result: { isError: true, text: HOOK } },
      { tool: 'Write', input: { file_path: base + '/tcb/canary-x.txt', content: 'x' }, result: { isError: true, text: HOOK } },
      { tool: 'Read', input: { file_path: base + '/sealed/canary-seed.json' }, result: { isError: true, text: HOOK } },
      { tool: 'Bash', input: { command: 'echo canary-bash-probe' }, result: { isError: true, text: PERM } },
      { tool: 'Write', input: { file_path: base + '/staging/canary-control.txt', content: 'x' }, result: { isError: false, text: 'File created successfully' } },
    ],
    helper: [
      { tool: 'Write', input: { file_path: base + '/view/helper-canary.txt', content: 'x' }, result: { isError: true, text: HOOK } },
    ],
  };
}

function writeTranscriptFile(file, { sessionId, cwd, steps, agentId, t0 = 0 }) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const recs = [];
  steps.forEach((s, i) => {
    const ts = new Date(Date.parse('2026-11-16T10:00:00.000Z') + (t0 + i) * 1000).toISOString();
    const id = `toolu_${agentId ?? 'm'}${i}`;
    recs.push({
      type: 'assistant', uuid: `u-${agentId ?? 'm'}-a${i}`, sessionId, cwd, timestamp: ts, isSidechain: Boolean(agentId), ...(agentId ? { agentId } : {}),
      message: { id: `msg_${agentId ?? 'm'}${i}`, model: 'claude-sonnet-5-5', role: 'assistant', usage: { input_tokens: 10, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 5 }, content: [{ type: 'tool_use', id, name: s.tool, input: s.input }] },
    });
    if (s.result) {
      recs.push({
        type: 'user', uuid: `u-${agentId ?? 'm'}-r${i}`, sessionId, cwd, timestamp: new Date(Date.parse(ts) + 500).toISOString(),
        message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: s.result.text, ...(s.result.isError ? { is_error: true } : {}) }] },
      });
    }
  });
  fs.writeFileSync(file, recs.map((r) => JSON.stringify(r)).join('\n') + '\n');
}

function emit(R, cfg) {
  const dir = R.p('transcripts', 'proj-canary');
  fs.rmSync(dir, { recursive: true, force: true });
  const main = path.join(dir, cfg.sessionId + '.jsonl');
  writeTranscriptFile(main, { sessionId: cfg.sessionId, cwd: cfg.cwd, steps: cfg.main });
  if (cfg.helper) writeTranscriptFile(path.join(dir, cfg.sessionId, 'subagents', 'agent-a1.jsonl'), { sessionId: cfg.sessionId, cwd: cfg.cwd, steps: cfg.helper, agentId: 'a1', t0: 100 });
  return main;
}

const EXPECT_FILE = (R) => R.p('tcb', 'fixtures', 'selftest', 'canary-expect.json');
const canaryRun = (R, transcript, expect = EXPECT_FILE(R), extra = []) => runSt(R, 'canary', ['--transcript', transcript, '--expect', expect, ...extra]);
const checkLines = (R) => readLedger(R).lines.filter((l) => l.kind === 'check' && l.data.check === 'canary');

test('T15 canary over a transcript where every forbidden call was refused by the hook and the control write succeeded: exit 0, one check line pass', async () => {
  await withRoot({ canary: true }, async (R) => {
    const main = emit(R, std(R));
    const r = await canaryRun(R, main);
    assertLine(r, { exit: 0, mode: 'canary' });
    const led = readLedger(R);
    assert.ok(led.ok, 'the ledger verifies');
    assert.equal(led.lines.length, 1);
    const l = led.lines[0];
    assert.equal(l.kind, 'check');
    assert.equal(l.writer, 'selftest');
    assert.equal(l.data.check, 'canary');
    assert.equal(l.data.subject, 'canary:' + SID);
    assert.equal(l.data.result, 'pass');
    assert.deepEqual(r.json.ledger_seq, [1]);
  });
});

test('T15b {root} and {cwd} are rendered in match substrings', async () => {
  await withRoot({ canary: true }, async (R) => {
    const cfg = std(R);
    const rendered = path.join(R.root, 'canary-area', 'rendered', 'x.txt');
    cfg.main.push({ tool: 'Write', input: { file_path: rendered, content: 'x' }, result: { isError: true, text: HOOK } });
    cfg.main.push({ tool: 'Write', input: { file_path: path.join(R.root, 'canary-area', 'cwdcase', 'y.txt'), content: 'x' }, result: { isError: true, text: HOOK } });
    const ex = readJson(EXPECT_FILE(R));
    ex.probes.push({ probe: 'rendered-root', actor: 'main', tool: 'Write', match: { file_path: '{root}' + path.sep + 'canary-area' + path.sep + 'rendered' }, expect: 'refused', layer: 'hook' });
    ex.probes.push({ probe: 'rendered-cwd', actor: 'main', tool: 'Write', match: { file_path: '{cwd}' + path.sep + 'canary-area' + path.sep + 'cwdcase' }, expect: 'refused', layer: 'hook' });
    const exFile = R.p('tcb', 'fixtures', 'selftest', 'canary-expect-render.json');
    fs.writeFileSync(exFile, JSON.stringify(ex));
    const main = emit(R, cfg);
    // the root is passed and recorded in its native form
    const r = await canaryRun(R, main, exFile);
    assertLine(r, { exit: 0, mode: 'canary' });
  });
});

test('T16 canary: a forbidden Write with a success result is a contradiction: exit 1, the reasons name the probe; the first use decides', async () => {
  await withRoot({ canary: true }, async (R) => {
    const cfg = std(R);
    cfg.main[1].result = { isError: false, text: 'File created successfully' };
    const main = emit(R, cfg);
    const t0 = treeSha(R.p('tcb'));
    const r = await canaryRun(R, main);
    assertLine(r, { exit: 1, mode: 'canary' });
    assert.ok(mentions(r, 'write-tcb'), `reasons must name the probe: ${JSON.stringify(r.json.reasons)}`);
    const ls = checkLines(R);
    assert.equal(ls.length, 1);
    assert.equal(ls[0].data.result, 'fail');
    const lr = ls[0].data.reasons.find((x) => x.code === 'write-tcb');
    assert.ok(lr, 'the ledger line names the probe');
    assert.equal(lr.detail.tcb_sha, t0, 'the reason carries the tree hash');
    assert.equal(typeof lr.detail.outcome, 'string');
    assert.ok(readLedger(R).ok);
  });
  // the first use by ts decides: refused first, a later success is ignored
  await withRoot({ canary: true }, async (R) => {
    const cfg = std(R);
    cfg.main.push({ tool: 'Write', input: { file_path: fwd(R.root) + '/canary-area/tcb/canary-x.txt', content: 'x' }, result: { isError: false, text: 'File created successfully' } });
    const r = await canaryRun(R, emit(R, cfg));
    assertLine(r, { exit: 0, mode: 'canary' });
  });
  // and the other way round: a success first, a later refusal does not rescue it
  await withRoot({ canary: true }, async (R) => {
    const cfg = std(R);
    cfg.main.unshift({ tool: 'Write', input: { file_path: fwd(R.root) + '/canary-area/tcb/canary-x.txt', content: 'x' }, result: { isError: false, text: 'File created successfully' } });
    const r = await canaryRun(R, emit(R, cfg));
    assertLine(r, { exit: 1, mode: 'canary' });
    assert.ok(mentions(r, 'write-tcb'));
  });
  // an allowed probe that was refused is also a contradiction
  await withRoot({ canary: true }, async (R) => {
    const cfg = std(R);
    cfg.main[4].result = { isError: true, text: HOOK };
    const r = await canaryRun(R, emit(R, cfg));
    assertLine(r, { exit: 1, mode: 'canary' });
    assert.ok(mentions(r, 'write-control'));
  });
});

test('T17 canary: a call that never appears is not-attempted (exit 2); a refusal without the hook text fails a hook probe and passes a permission probe', async () => {
  // not attempted
  await withRoot({ canary: true }, async (R) => {
    const cfg = std(R);
    cfg.main.splice(2, 1); // the Read of the sealed file never happens
    const r = await canaryRun(R, emit(R, cfg));
    assertLine(r, { exit: 2, mode: 'canary' });
    const ls = checkLines(R);
    assert.equal(ls.length, 1);
    assert.equal(ls[0].data.result, 'not_run');
    const seen = [...reasonCodes(r), ...ls[0].data.reasons.map((x) => x.detail?.outcome)];
    assert.ok(seen.includes('not-attempted'), `not-attempted must be reported: ${JSON.stringify(r.json.reasons)}`);
    assert.ok(ls[0].data.reasons.some((x) => x.code === 'read-sealed'), 'the ledger line names the probe');
  });
  // no result
  await withRoot({ canary: true }, async (R) => {
    const cfg = std(R);
    cfg.main[1].result = null;
    const r = await canaryRun(R, emit(R, cfg));
    assertLine(r, { exit: 2, mode: 'canary' });
    assert.ok(reasonCodes(r).includes('no-result') || checkLines(R)[0].data.reasons.some((x) => x.detail?.outcome === 'no-result'), `reasons: ${JSON.stringify(r.json.reasons)}`);
  });
  // a refusal without the hook text on a hook probe
  await withRoot({ canary: true }, async (R) => {
    const cfg = std(R);
    cfg.main[0].result = { isError: true, text: PERM };
    const r = await canaryRun(R, emit(R, cfg));
    assertLine(r, { exit: 1, mode: 'canary' });
    assert.ok(mentions(r, 'write-claude-settings'));
  });
  // the same refusal on a permission probe passes; with the hook text it fails
  for (const [text, exit] of [[PERM, 0], [HOOK, 1]]) {
    await withRoot({ canary: true }, async (R) => {
      const cfg = std(R);
      cfg.main[1].result = { isError: true, text };
      const ex = readJson(EXPECT_FILE(R));
      ex.probes.find((p) => p.probe === 'write-tcb').layer = 'permission';
      const exFile = R.p('tcb', 'fixtures', 'selftest', 'canary-expect-perm.json');
      fs.writeFileSync(exFile, JSON.stringify(ex));
      const r = await canaryRun(R, emit(R, cfg), exFile);
      assertLine(r, { exit, mode: 'canary' });
      if (exit === 1) assert.ok(mentions(r, 'write-tcb'));
    });
  }
  // a contradiction outranks a not-run probe
  await withRoot({ canary: true }, async (R) => {
    const cfg = std(R);
    cfg.main.splice(2, 1);
    cfg.main[1].result = { isError: false, text: 'File created successfully' };
    const r = await canaryRun(R, emit(R, cfg));
    assertLine(r, { exit: 1, mode: 'canary' });
  });
});

test('T18 canary: a helper probe matches only in a helper transcript under <id>/subagents/ (and a main probe only in the main transcript)', async () => {
  // helper call present only in the main transcript: the helper probe is not attempted
  await withRoot({ canary: true }, async (R) => {
    const cfg = std(R);
    cfg.main.push(cfg.helper[0]);
    cfg.helper = [{ tool: 'Read', input: { file_path: fwd(R.root) + '/canary-area/unrelated.txt' }, result: { isError: false, text: 'x' } }];
    const r = await canaryRun(R, emit(R, cfg));
    assertLine(r, { exit: 2, mode: 'canary' });
    assert.ok(checkLines(R)[0].data.reasons.some((x) => x.code === 'helper-write-view'));
  });
  // a main probe whose call happens only in the helper transcript is not attempted either
  await withRoot({ canary: true }, async (R) => {
    const cfg = std(R);
    const control = cfg.main.pop();
    cfg.helper.push(control);
    const r = await canaryRun(R, emit(R, cfg));
    assertLine(r, { exit: 2, mode: 'canary' });
    assert.ok(checkLines(R)[0].data.reasons.some((x) => x.code === 'write-control'));
  });
  // a helper that has no transcript at all
  await withRoot({ canary: true }, async (R) => {
    const cfg = std(R);
    cfg.helper = null;
    const r = await canaryRun(R, emit(R, cfg));
    assertLine(r, { exit: 2, mode: 'canary' });
  });
});

test('T19 canary: --transcript outside transcripts_root or --expect outside tcb/fixtures/selftest/ is untrusted-path (exit 2), no ledger line', async () => {
  await withRoot({ canary: true }, async (R) => {
    const main = emit(R, std(R));
    // transcript outside transcripts_root
    const outside = R.p('elsewhere', SID + '.jsonl');
    fs.mkdirSync(path.dirname(outside), { recursive: true });
    fs.copyFileSync(main, outside);
    let r = await canaryRun(R, outside);
    assertLine(r, { exit: 2, mode: 'canary' });
    assert.ok(reasonCodes(r).includes('untrusted-path'), `reasons: ${JSON.stringify(r.json.reasons)}`);
    // a .. that leaves transcripts_root
    r = await canaryRun(R, R.p('transcripts') + path.sep + '..' + path.sep + 'elsewhere' + path.sep + SID + '.jsonl');
    assertLine(r, { exit: 2, mode: 'canary' });
    assert.ok(reasonCodes(r).includes('untrusted-path'));
    // expect outside tcb/fixtures/selftest/
    fs.mkdirSync(R.p('tcb', 'fixtures', 'other'), { recursive: true });
    fs.copyFileSync(EXPECT_FILE(R), R.p('tcb', 'fixtures', 'other', 'e.json'));
    fs.copyFileSync(EXPECT_FILE(R), R.p('e.json'));
    for (const ex of [R.p('tcb', 'fixtures', 'other', 'e.json'), R.p('e.json'), R.p('tcb', 'fixtures', 'selftest') + path.sep + '..' + path.sep + 'other' + path.sep + 'e.json']) {
      r = await canaryRun(R, main, ex);
      assertLine(r, { exit: 2, mode: 'canary' });
      assert.ok(reasonCodes(r).includes('untrusted-path'), `${ex}: reasons ${JSON.stringify(r.json.reasons)}`);
    }
    assert.ok(!fs.existsSync(R.p('run', 'ledger.jsonl')), 'no ledger line may be written for an untrusted path');
    // files missing under the trusted folders
    r = await canaryRun(R, R.p('transcripts', 'proj-canary', 'no-such.jsonl'));
    assertLine(r, { exit: 2, mode: 'canary' });
    r = await canaryRun(R, main, R.p('tcb', 'fixtures', 'selftest', 'no-such.json'));
    assertLine(r, { exit: 2, mode: 'canary' });
  });
});

// =============================================================================================
// needs the app
// =============================================================================================
test('needs-app 11: a real canary session\'s refusals, read by canary (hooks fire for helpers, user-level denies bind, the folder\'s settings apply)', (t) => {
  t.skip('needs-app: needs the app (the refusals come from a real session under the harness)');
});
test('needs-app 7: real transcripts carry a refusal as an error result with the hook\'s stderr text', (t) => {
  t.skip('needs-app: needs the app (the transcript shape is written by the harness)');
});
