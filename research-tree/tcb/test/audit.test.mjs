// audit.mjs tests, written from spec/audit.mjs.md and CONTRACT.md only (the script's code was not read).
// One test per behaviour, named with its id. Each test builds its own run root under tcb-build/tmp.
import test, { after } from 'node:test';
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
const NOW = '2026-11-17T10:00:00.000Z';
const ZERO = '0'.repeat(64);
const PS_EXE = 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
const EXIT_SLUG = { 0: 'ok', 1: 'fail', 2: 'not-run', 3: 'tamper', 5: 'ready-wins', 6: 'deferred', 10: 'reopened', 64: 'stale-ce', 65: 'stale-epoch', 66: 'usage', 67: 'table-corrupt', 70: 'internal', 75: 'lock-busy' };
const PREFIX = { card: 'c', pack: 'p', review: 'r', manifest: 'm', certificate: 'x' };

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
function canon(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  switch (typeof v) {
    case 'string': return JSON.stringify(v.normalize('NFC'));
    case 'number': return JSON.stringify(Object.is(v, -0) ? 0 : v);
    case 'boolean': return String(v);
    case 'object': return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k.normalize('NFC')) + ':' + canon(v[k])).join(',') + '}';
    default: throw new Error('not canonical: ' + typeof v);
  }
}
const fwd = (p) => p.split(path.sep).join('/');
function scriptFile(name) {
  const a = path.join(TCB, 'scripts', name + '.mjs');
  return fs.existsSync(a) ? a : path.join(TCB, name + '.mjs');
}

// ---- thresholds (CONTRACT 3.20 defaults; the test owns this file in its temp root) ----
const DEFAULT_PARAMS = {
  delta_ms: 60000, coalesce_ticks: 2, stall_calls: 30, hang_ticks: 10, loop_k: 3, W_cc_ticks: 30, R: 1, H_max: 2,
  Z_frac: 0.1, stop_verify_deltas: 2, N_max: 2, N_ceiling: 3, peak_mb: 1200, reserve_mb: 1024, soft_frac: 0.8,
  hard_frac: 0.9, alarm_ms: 3600000, B_tokens: null, r_tokens: null, W_quality: 300000, W_star_coord: 133200,
  coord_over_factor: 1.5, W_star_child: null, lean_baseline_tokens: null, lean_tolerance_tokens: null,
  child_prefix_tokens: 60000, review_reserve_tokens: 75000, w_chars: 300, window_words: 200, d0: 0.8, beta: 0.05,
  plants_k: 3, plants_t: null, unverifiable_share_max: null, coverage_floor: null, unattributed_share_max: 0.1,
  blind_fail_rate: 0.8, batch_size: 12, index_words: 120, f5_given: false, fetch_max_bytes: 10485760,
  fetch_timeout_ms: 30000, fetch_max_redirects: 5, hook_deadline_ms: 5000, selftest_case_ms: 60000,
  sleep_gap_ms: 600000, lock_retries: 3, allow_loopback: false, transcripts_root: 'C:/Users/User/.claude/projects',
  proc_exe: PS_EXE, user_files: [], tcb_paths_protected: ['tcb/', 'sealed/', 'review-in/', '.claude/', 'run/', 'store/', '.git/'],
  weights: { read: 0.05, write: 1.25, out: 5 },
};
function thresholdsFile(over, gates) {
  const vals = { ...DEFAULT_PARAMS, ...over };
  const params = {};
  for (const [name, value] of Object.entries(vals)) params[name] = { value, unit: 'tests only', source: 'guess', gate: value !== null };
  for (const [name, g] of Object.entries(gates ?? {})) params[name].gate = g;
  params.unverifiable_share_max.line = { measure: 'unverifiable_share', op: 'max' };
  params.coverage_floor.line = { measure: 'coverage', op: 'floor' };
  return { schema_version: 1, params };
}

// ---- run roots ----
const ROOTS = [];
const SLEEPERS = [];
after(() => {
  for (const s of SLEEPERS) s.release();
  for (const r of ROOTS) {
    try { fs.rmSync(r, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); } catch { /* best effort */ }
  }
});
function setThresholds(root, over = {}, gates = {}) {
  fs.writeFileSync(path.join(root, 'tcb', 'thresholds.json'), JSON.stringify(thresholdsFile({ transcripts_root: fwd(root) + '/transcripts', ...over }, gates), null, 2));
}
function makeRoot({ ce = 1, params = {}, gates = {}, tasks = [] } = {}) {
  fs.mkdirSync(TMP, { recursive: true });
  const root = fs.mkdtempSync(path.join(TMP, 'aud-'));
  ROOTS.push(root);
  for (const d of ['tcb/profiles', 'plan/frozen', 'run', 'store/objects', 'store/commits', 'store/status', 'views', 'queue', 'sealed', 'wt', 'transcripts']) {
    fs.mkdirSync(path.join(root, d), { recursive: true });
  }
  // the library validates the task table against the schemas it finds under <root>/tcb/
  const schemas = path.join(TCB, 'schemas');
  if (fs.existsSync(schemas)) fs.cpSync(schemas, path.join(root, 'tcb', 'schemas'), { recursive: true });
  setThresholds(root, params, gates);
  fs.writeFileSync(path.join(root, 'run', 'coord.json'), JSON.stringify({ schema_version: 1, ce, started_at: NOW, tcb_commit: 'a'.repeat(40) }, null, 2));
  writeTasks(root, tasks);
  return root;
}
function writeTasks(root, rows, rev = 0) {
  fs.writeFileSync(path.join(root, 'run', 'tasks.json'), JSON.stringify({ schema_version: 1, rev, tasks: rows }, null, 2));
}
let sidCounter = 0;
const newSid = () => `00000000-0000-4000-9000-${String(++sidCounter).padStart(12, '0')}`;

// ---- jsonl, ledger ----
function appendJsonl(p, obj) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.appendFileSync(p, JSON.stringify(obj) + '\n'); }
function readJsonl(p) {
  if (!fs.existsSync(p)) return [];
  const out = [];
  for (const l of fs.readFileSync(p, 'utf8').split('\n')) { if (!l.trim()) continue; try { out.push(JSON.parse(l)); } catch { /* skipped */ } }
  return out;
}
const ledgerPath = (root) => path.join(root, 'run', 'ledger.jsonl');
const readLedger = (root) => readJsonl(ledgerPath(root));
function verifyLedger(lines) {
  let prev = ZERO;
  lines.forEach((l, i) => {
    assert.equal(l.seq, i + 1, 'ledger seq runs 1..n');
    assert.equal(l.prev, prev, 'ledger prev links to the previous hash');
    const { hash, ...rest } = l;
    assert.equal(hash, sha(prev + canon(rest)), 'ledger hash recomputes at seq ' + l.seq);
    prev = hash;
  });
}
function addLedger(root, kind, data, extra = {}) {
  const lines = readLedger(root);
  const prev = lines.length ? lines[lines.length - 1].hash : ZERO;
  const line = { seq: lines.length + 1, prev, ts: extra.ts ?? NOW, ce: 1, writer: 'test-fixture', writer_sha: ZERO, kind };
  for (const k of ['task', 'epoch']) if (extra[k] !== undefined) line[k] = extra[k];
  line.data = data;
  line.hash = sha(prev + canon(line));
  appendJsonl(ledgerPath(root), line);
  return line.seq;
}
function putObj(root, value) {
  const bytes = canon(value);
  const hex = sha(bytes);
  const id = PREFIX[value.kind] + '_' + hex.slice(0, 16);
  fs.writeFileSync(path.join(root, 'store', 'objects', id + '.json'), bytes);
  return { id, sha: hex, value };
}

// ---- transcripts: records in the shape the harness writes (one record per content block) ----
function writeTranscript(file, { sessionId, cwd, calls }) {
  const recs = [];
  let t = Date.parse('2026-11-17T08:00:00.000Z');
  let n = 0;
  const base = (type) => ({ type, uuid: `u${++n}`, sessionId, cwd, isSidechain: false, timestamp: new Date((t += 1000)).toISOString() });
  calls.forEach((call, i) => {
    if (call.userText !== undefined || i === 0) recs.push({ ...base('user'), message: { role: 'user', content: call.userText ?? 'start' } });
    const usage = call.usage ?? { input: 100, cache_read: 0, cache_write: 0, output: 10 };
    const blocks = [];
    if (call.text !== undefined) blocks.push({ type: 'text', text: call.text });
    (call.tools ?? []).forEach((tool, k) => blocks.push({ type: 'tool_use', id: `tu_${i}_${k}`, name: tool.name, input: tool.input }));
    if (blocks.length === 0) blocks.push({ type: 'text', text: '' });
    const message = (b) => ({ id: `msg_${i}`, model: 'claude-test-1', role: 'assistant', content: [b], usage: { input_tokens: usage.input, cache_read_input_tokens: usage.cache_read, cache_creation_input_tokens: usage.cache_write, output_tokens: usage.output } });
    for (const b of blocks) recs.push({ ...base('assistant'), message: message(b) });
    const results = (call.tools ?? []).map((tool, k) => ({ tool, k })).filter((x) => x.tool.result);
    if (results.length) recs.push({ ...base('user'), message: { role: 'user', content: results.map(({ tool, k }) => ({ type: 'tool_result', tool_use_id: `tu_${i}_${k}`, content: tool.result.text ?? '', ...(tool.result.isError ? { is_error: true } : {}) })) } });
  });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, recs.map((r) => JSON.stringify(r)).join('\n') + '\n');
}
const sessionFile = (root, sid) => path.join(root, 'transcripts', 'proj', sid + '.jsonl');
const helperFile = (root, sid, name = 'agent-a1') => path.join(root, 'transcripts', 'proj', sid, 'subagents', name + '.jsonl');
const RD = (p, result) => ({ name: 'Read', input: { file_path: p }, ...(result !== undefined ? { result: { text: result } } : {}) });
const WR = (p) => ({ name: 'Write', input: { file_path: p, content: 'x' } });
const GLOB = (input) => ({ name: 'Glob', input });
const GREP = (input) => ({ name: 'Grep', input });
const SEARCH = (query, result) => ({ name: 'WebSearch', input: { query }, ...(result !== undefined ? { result: { text: result } } : {}) });
const FETCH = (url, prompt = 'summarise', result) => ({ name: 'WebFetch', input: { url, prompt }, ...(result !== undefined ? { result: { text: result } } : {}) });
const BASH = (command) => ({ name: 'Bash', input: { command } });
const AGENT = (type) => ({ name: 'Agent', input: { subagent_type: type, prompt: 'p' } });

// ---- running a script as a child process ----
function run(argv, root, script = 'audit') {
  const r = spawnSync(process.execPath, [scriptFile(script), ...argv], { cwd: root, encoding: 'utf8', windowsHide: true, shell: false, timeout: 180000, maxBuffer: 64 << 20 });
  const lines = (r.stdout ?? '').split('\n').filter((l) => l.trim());
  let json = null;
  if (lines.length === 1) { try { json = JSON.parse(lines[0]); } catch { json = null; } }
  return { exit: r.status, json, stdout: r.stdout ?? '', stderr: r.stderr ?? '', lines };
}
function shape(r, exit) {
  const where = () => `\nexit=${r.exit}\nstdout=${r.stdout.slice(0, 1500)}\nstderr=${r.stderr.slice(0, 1500)}`;
  assert.equal(r.lines.length, 1, 'stdout must be exactly one line' + where());
  const j = r.json;
  assert.ok(j && typeof j === 'object', 'stdout line must be JSON' + where());
  for (const k of ['ok', 'script', 'mode', 'exit', 'code', 'dry_run', 'result', 'reasons', 'ledger_seq']) assert.ok(k in j, 'stdout JSON lacks key ' + k + where());
  assert.ok(j.script === 'audit' || j.script === 'audit.mjs', 'script name' + where());
  assert.equal(j.exit, r.exit, 'JSON exit equals process exit' + where());
  if (exit !== undefined) assert.equal(r.exit, exit, 'expected exit ' + exit + where());
  assert.equal(j.code, EXIT_SLUG[j.exit], 'code is the slug of the exit' + where());
  assert.equal(j.ok, j.exit === 0);
  assert.ok(Array.isArray(j.reasons) && Array.isArray(j.ledger_seq));
  return j;
}
const reasonCodes = (j) => j.reasons.map((x) => x.code);
const assertReason = (j, code) => assert.ok(reasonCodes(j).includes(code), `reasons should name ${code}, got ${JSON.stringify(j.reasons)}`);
const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const readJ = (root, rel) => JSON.parse(read(root, rel));
function snapshot(root) {
  const out = {};
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      const rel = fwd(path.relative(root, p));
      if (rel === 'tcb') continue;
      if (e.isDirectory()) walk(p); else out[rel] = sha(fs.readFileSync(p));
    }
  })(root);
  return out;
}
function holdLock(root) {
  const child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore', windowsHide: true });
  const ps = spawnSync(PS_EXE, ['-NoProfile', '-NonInteractive', '-Command', `[Console]::OutputEncoding=[Text.Encoding]::UTF8; (Get-CimInstance Win32_Process -Filter "ProcessId=${child.pid}").CreationDate.ToUniversalTime().ToString('o')`], { encoding: 'utf8', windowsHide: true, timeout: 60000 });
  const start = (ps.stdout ?? '').trim();
  if (!/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(start)) { try { child.kill(); } catch { /* own child */ } throw new Error('cannot read start time of the test-owned sleeper: ' + start); }
  fs.writeFileSync(path.join(root, 'run', 'run.lock'), JSON.stringify({ pid: child.pid, start_time: start, nonce: 'a'.repeat(32), script: 'test-holder', ce: 1, acquired_at: NOW }));
  const h = { release() { try { child.kill(); } catch { /* own child */ } } };
  SLEEPERS.push(h);
  return h;
}

// ---- the audit world ----
const FULL_TOOLS = ['Read', 'Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'Bash', 'PowerShell', 'Agent', 'Task', 'StructuredOutput'];
function profileFile(role, over = {}) {
  return { role, tools_allow: FULL_TOOLS, tools_deny: [], read_prefixes: [], write_prefixes: ['{attempt}/staging/'], agent_types: ['reader'], fetch: 'any', bash: 'tcb-node', ...over };
}
function aRow(o) {
  const attempts = o.attempts ?? (o.sessions ?? []).map((s, i) => ({ epoch: i + 1, folder: `wt/${o.task}-e${i + 1}`, session: s, stop: 'none', ...(o.manifests?.[i] ? { manifest: o.manifests[i] } : {}) }));
  return {
    task: o.task, field: o.field === undefined ? 'f1' : o.field, stage: o.stage ?? 'research', role: o.role ?? 'child', steps: ['pack'], deps: [], question_ids: [], e_task: 100000,
    tier: 'sonnet', state: 'active', step: 'bound', epoch: attempts.length, reason: null, session: attempts.length ? attempts[attempts.length - 1].session ?? null : null, restarts: 0, handovers: 0, parks: 0, limit: false, fails: [], attempts, commits: {}, updated_rev: 0,
  };
}
const TURN = (field) => ({ text: `TURN-END ${field}` });
// A world with one task at epoch 1, its manifest, profile, attempt folder and a main transcript.
function auditWorld(o = {}) {
  const task = o.task ?? 'f1-research';
  const field = o.field === undefined ? 'f1' : o.field;
  const role = o.role ?? 'child';
  const root = makeRoot({ params: o.params, gates: o.gates });
  const S = newSid();
  const F = path.join(root, 'wt', `${task}-e1`);
  for (const d of ['in', 'staging', 'view']) fs.mkdirSync(path.join(F, d), { recursive: true });
  fs.writeFileSync(path.join(F, 'in', 'brief.md'), 'synthetic brief');
  fs.writeFileSync(path.join(F, 'in', 'manifest.json'), '{}');
  const inputs = (o.inputs ?? []).slice().sort();
  for (const n of inputs) { fs.mkdirSync(path.dirname(path.join(F, 'in', n)), { recursive: true }); fs.writeFileSync(path.join(F, 'in', n), 'synthetic input'); }
  const M = putObj(root, {
    kind: 'manifest', task, epoch: 1, role, brief_sha: ZERO, schema_shas: {}, tier: 'sonnet', tools: [], inputs: inputs.map((name) => ({ name, sha256: ZERO })),
    agents: o.agents ?? [], user_files: o.userFiles ?? [], outputs: [{ step: 'pack', kinds: ['card', 'pack'] }],
  });
  const attempt = { epoch: 1, folder: `wt/${task}-e1`, stop: 'none' };
  if (!o.noSession) attempt.session = S;
  if (!o.noManifest) attempt.manifest = M.id;
  writeTasks(root, [aRow({ task, field, role, stage: o.stage, attempts: [attempt] })]);
  fs.writeFileSync(path.join(root, 'tcb', 'profiles', `${role}.json`), JSON.stringify(profileFile(role, o.profile)));
  const calls = o.calls ?? [{ tools: [RD(path.join(F, 'in', 'brief.md'), 'ok')] }, TURN(field ?? task)];
  if (!o.noTranscript) writeTranscript(sessionFile(root, S), { sessionId: S, cwd: F, calls });
  (o.helpers ?? []).forEach((hc, i) => writeTranscript(helperFile(root, S, 'agent-h' + (i + 1)), { sessionId: S, cwd: F, calls: hc }));
  addLedger(root, 'bind', { session: S, boot: 'b' }, { task, epoch: 1 });
  return { root, F, S, task, field, M, inF: (...p) => path.join(F, 'in', ...p), stF: (...p) => path.join(F, 'staging', ...p) };
}
const audit = (w, extra = [], { epoch = '1', ce = '1' } = {}) => run(['--root', w.root, '--ce', ce, '--task', w.task, '--epoch', epoch, '--now', NOW, ...extra], w.root);
const auditFile = (w) => readJ(w.root, `run/audit/${w.task}-e1.json`);
const auditLines = (root) => readLedger(root).filter((l) => l.kind === 'audit');
const checkLines = (root) => readLedger(root).filter((l) => l.kind === 'check' && l.data.check === 'audit');

// ---------------------------------------------------------------------------------------------
// Behaviours (spec/audit.mjs.md "Behaviours")
// ---------------------------------------------------------------------------------------------

test('T1 a clean attempt: exit 0, label clean, undeclared empty, audit file, audit line and check pass', () => {
  const w = auditWorld({ inputs: ['protocol.json'] });
  const calls = [
    { tools: [RD(w.inF('brief.md'), 'ok'), RD(w.inF('protocol.json'), 'ok'), WR(w.stF('a.card.json')), RD(w.stF('a.card.json'), 'ok')] },
    TURN('f1'),
  ];
  writeTranscript(sessionFile(w.root, w.S), { sessionId: w.S, cwd: w.F, calls });
  const j = shape(audit(w), 0);
  assert.equal(j.result.label, 'clean');
  assert.deepEqual(j.result.undeclared, []);
  const f = auditFile(w);
  assert.equal(f.schema_version, 1);
  assert.equal(f.label, 'clean');
  assert.deepEqual(f.undeclared, []);
  assert.deepEqual(f.protected_writes, []);
  assert.equal(f.task, 'f1-research');
  assert.equal(f.epoch, 1);
  assert.equal(f.session, w.S);
  assert.equal(f.at, NOW);
  assert.ok(fs.existsSync(path.join(w.root, 'run', 'audit', 'search-f1-research-e1.jsonl')), 'the search log exists (empty)');
  const lines = readLedger(w.root);
  verifyLedger(lines);
  const a = lines.filter((l) => l.kind === 'audit');
  assert.equal(a.length, 1);
  assert.equal(a[0].task, 'f1-research');
  assert.equal(a[0].epoch, 1);
  assert.equal(a[0].data.label, 'clean');
  assert.deepEqual(a[0].data.undeclared, []);
  const c = checkLines(w.root);
  assert.equal(c.length, 1);
  assert.equal(c[0].data.subject, 'f1-research-e1');
  assert.equal(c[0].data.result, 'pass');
  assert.deepEqual(j.ledger_seq, [a[0].seq, c[0].seq]);
});

test('T2 a read of the store or of a CLAUDE.md outside the attempt: exit 1 tainted, the path is in undeclared', () => {
  const w = auditWorld();
  const outside = path.join(path.dirname(w.root), 'CLAUDE.md');
  writeTranscript(sessionFile(w.root, w.S), { sessionId: w.S, cwd: w.F, calls: [{ tools: [RD(path.join(w.root, 'store', 'objects', 'x'), 'ok'), RD(outside, 'ok')] }, TURN('f1')] });
  const j = shape(audit(w), 1);
  assert.equal(j.reasons[0].code, 'tainted');
  const f = auditFile(w);
  assert.equal(f.label, 'tainted');
  assert.ok(f.undeclared.includes('store/objects/x'), JSON.stringify(f.undeclared));
  assert.ok(f.undeclared.includes(fwd(outside)), JSON.stringify(f.undeclared));
  assert.equal(auditLines(w.root)[0].data.label, 'tainted');
  assert.equal(checkLines(w.root)[0].data.result, 'fail');
});

test('T3 an in/ file not in the manifest is undeclared; listed it is declared; brief.md is always declared', () => {
  const w = auditWorld();
  fs.writeFileSync(w.inF('extra.json'), '{}');
  writeTranscript(sessionFile(w.root, w.S), { sessionId: w.S, cwd: w.F, calls: [{ tools: [RD(w.inF('brief.md'), 'ok'), RD(w.inF('extra.json'), 'ok')] }, TURN('f1')] });
  shape(audit(w), 1);
  assert.deepEqual(auditFile(w).undeclared, ['wt/f1-research-e1/in/extra.json']);
  const w2 = auditWorld({ inputs: ['extra.json'] });
  writeTranscript(sessionFile(w2.root, w2.S), { sessionId: w2.S, cwd: w2.F, calls: [{ tools: [RD(w2.inF('brief.md'), 'ok'), RD(w2.inF('extra.json'), 'ok')] }, TURN('f1')] });
  shape(audit(w2), 0);
  assert.deepEqual(auditFile(w2).undeclared, []);
});

test('T4 case and slash variants of an allowed path are allowed; .. out of the attempt and a junction to outside are undeclared', (t) => {
  const w = auditWorld();
  fs.writeFileSync(w.stF('a.json'), '{}');
  const upper = (w.stF('A.JSON')).toUpperCase();
  const back = w.inF('brief.md').replaceAll('/', '\\');
  const mixed = fwd(w.F) + '/IN\\Brief.md';
  writeTranscript(sessionFile(w.root, w.S), { sessionId: w.S, cwd: w.F, calls: [{ tools: [RD(upper), RD(back), RD(mixed), RD('staging/a.json')] }, TURN('f1')] });
  shape(audit(w), 0);
  assert.deepEqual(auditFile(w).undeclared, [], 'case, slash and relative variants are one path');
  // leaving the attempt with ..
  writeTranscript(sessionFile(w.root, w.S), { sessionId: w.S, cwd: w.F, calls: [{ tools: [RD(w.stF() + '/../../other-e1/x.json')] }, TURN('f1')] });
  shape(audit(w), 1);
  assert.deepEqual(auditFile(w).undeclared, ['wt/other-e1/x.json']);
  // a junction inside staging/ pointing outside
  const outside = path.join(w.root, 'outside');
  fs.mkdirSync(outside, { recursive: true });
  fs.writeFileSync(path.join(outside, 'secret.txt'), 'x');
  try {
    fs.symlinkSync(outside, w.stF('link'), 'junction');
  } catch {
    t.diagnostic('a junction cannot be made here: that part is skipped');
    return;
  }
  writeTranscript(sessionFile(w.root, w.S), { sessionId: w.S, cwd: w.F, calls: [{ tools: [RD(w.stF('link', 'secret.txt'))] }, TURN('f1')] });
  shape(audit(w), 1);
  assert.deepEqual(auditFile(w).undeclared, ['wt/f1-research-e1/staging/link/secret.txt'], 'the path as the session wrote it, not its target');
  fs.rmSync(w.stF('link'), { force: true });
});

test('T5 a helper read outside the roots taints the session; a helper read of an allowed root does not', () => {
  const w = auditWorld();
  const root = w.root;
  writeTranscript(helperFile(root, w.S, 'agent-h1'), { sessionId: w.S, cwd: w.F, calls: [{ tools: [RD(path.join(root, 'run', 'tasks.json'), 'ok')] }, TURN('f1')] });
  const j = shape(audit(w), 1);
  assert.equal(j.reasons[0].code, 'tainted');
  assert.deepEqual(auditFile(w).undeclared, ['run/tasks.json']);
  assert.equal(auditFile(w).transcripts.helpers.length, 1);
  writeTranscript(helperFile(root, w.S, 'agent-h1'), { sessionId: w.S, cwd: w.F, calls: [{ tools: [RD(w.inF('brief.md'), 'ok'), RD(w.stF('a.json'), 'ok')] }, TURN('f1')] });
  shape(audit(w), 0);
  assert.deepEqual(auditFile(w).undeclared, []);
});

test('T6 Glob and Grep without a path count as the attempt folder; with a path under run/ they are undeclared', () => {
  const w = auditWorld();
  writeTranscript(sessionFile(w.root, w.S), { sessionId: w.S, cwd: w.F, calls: [{ tools: [GLOB({ pattern: '*.json' }), GREP({ pattern: 'x' })] }, TURN('f1')] });
  shape(audit(w), 0);
  assert.deepEqual(auditFile(w).undeclared, []);
  writeTranscript(sessionFile(w.root, w.S), { sessionId: w.S, cwd: w.F, calls: [{ tools: [GLOB({ pattern: '*.json' }), GREP({ pattern: 'x', path: path.join(w.root, 'run') })] }, TURN('f1')] });
  shape(audit(w), 1);
  assert.deepEqual(auditFile(w).undeclared, ['run']);
});

test('T7 a write into a protected path: exit 3 protect-write, each path listed, tainted, audit file, lines and a tamper incident', () => {
  const w = auditWorld();
  const r = w.root;
  const targets = [
    [path.join(r, 'tcb', 'scripts', 'x.mjs'), 'tcb/scripts/x.mjs'],
    [path.join(r, 'sealed', 'a'), 'sealed/a'],
    [path.join(r, 'review-in', 't', 'a'), 'review-in/t/a'],
    [path.join(r, 'run', 'tasks.json'), 'run/tasks.json'],
    [path.join(r, 'store', 'a'), 'store/a'],
    [path.join(r, '.git', 'config'), '.git/config'],
    [w.stF('harvested', 'x.json'), 'wt/f1-research-e1/staging/harvested/x.json'],
    [path.join(w.F, '.claude', 'settings.json'), 'wt/f1-research-e1/.claude/settings.json'],
    [w.stF('.Claude.', 'x'), 'wt/f1-research-e1/staging/.Claude./x'],
    [w.stF('CLAUDE.md.'), 'wt/f1-research-e1/staging/CLAUDE.md.'],
  ];
  const calls = [{ tools: [...targets.map(([p]) => WR(p)), WR(w.stF('fine.json'))] }, TURN('f1')];
  writeTranscript(sessionFile(w.root, w.S), { sessionId: w.S, cwd: w.F, calls });
  const j = shape(audit(w), 3);
  assertReason(j, 'protected-write');
  const f = auditFile(w);
  for (const [, rel] of targets) assert.ok(f.protected_writes.includes(rel), `${rel} in ${JSON.stringify(f.protected_writes)}`);
  assert.ok(!f.protected_writes.some((p) => p.endsWith('fine.json')), 'a write in staging/ is not protected');
  assert.equal(f.protected_writes.length, targets.length);
  assert.equal(f.label, 'tainted');
  const lines = readLedger(w.root);
  verifyLedger(lines);
  assert.equal(lines.filter((l) => l.kind === 'audit').length, 1);
  assert.equal(lines.filter((l) => l.kind === 'check' && l.data.check === 'audit').length, 1);
  const inc = lines.filter((l) => l.kind === 'incident');
  assert.equal(inc.length, 1);
  assert.equal(inc[0].data.class, 'refusal');
  assert.equal(inc[0].data.detail.tamper, true);
  assert.equal(inc[0].data.detail.script, 'audit');
  assert.equal(inc[0].data.detail.code, 'protected-write');
  assert.equal(lines.filter((l) => l.kind === 'audit')[0].data.label, 'tainted');
});

test('T8 the search log: three lines in order, repeatable false, result URLs counted, truncation at 2,000 characters, discovered fetch addresses', () => {
  const w = auditWorld();
  const calls = [
    { tools: [SEARCH('first query', 'x'.repeat(2500)), SEARCH('second query', 'short result'), FETCH('https://source.test/page', 'read it', 'see https://a.test/x and https://b.test/y, also https://a.test/x')] },
    TURN('f1'),
  ];
  writeTranscript(sessionFile(w.root, w.S), { sessionId: w.S, cwd: w.F, calls });
  shape(audit(w), 0);
  const lines = read(w.root, 'run/audit/search-f1-research-e1.jsonl').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  assert.equal(lines.length, 3);
  assert.deepEqual(lines.map((l) => l.n), [1, 2, 3]);
  assert.deepEqual(lines.map((l) => l.tool), ['WebSearch', 'WebSearch', 'WebFetch']);
  assert.deepEqual(lines.map((l) => l.source), ['main', 'main', 'main']);
  assert.deepEqual(lines.map((l) => l.repeatable), [false, false, false]);
  assert.equal(lines[0].query, 'first query');
  assert.equal(lines[0].truncated, true);
  assert.equal(lines[1].truncated, false);
  assert.equal(lines[0].result_chars, 2000);
  assert.equal(lines[2].url, 'https://source.test/page');
  assert.equal(lines[2].result_urls, 2, 'distinct addresses in the result text');
  assert.equal(lines[2].is_error, false);
  const f = auditFile(w);
  assert.deepEqual(f.discovered_urls, ['https://source.test/page']);
  assert.equal(f.n_search, 2);
  assert.equal(f.n_fetch, 1);
  // a helper's search is in the log with the helper's file name
  const w2 = auditWorld({ helpers: [[{ tools: [SEARCH('helper query', 'r')] }, TURN('f1')]] });
  shape(audit(w2), 0);
  const l2 = read(w2.root, 'run/audit/search-f1-research-e1.jsonl').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  assert.equal(l2.length, 1);
  assert.match(l2[0].source, /agent-h1/);
});

test('T9 denylist: a listed term in another case taints; comments and blank lines are ignored; a missing file is empty; BOM and CRLF are handled', () => {
  const w = auditWorld();
  // the first term is preceded by a BOM; the file has CRLF line ends, a comment and a blank line
  fs.writeFileSync(path.join(w.root, 'tcb', 'denylist.txt'), '\uFEFFSecretProject\r\n# a comment line\r\n\r\nsecond term\r\n');
  writeTranscript(sessionFile(w.root, w.S), { sessionId: w.S, cwd: w.F, calls: [{ tools: [SEARCH('what is SECRETPROJECT about'), FETCH('https://x.test/secretproject/page', 'p'), FETCH('https://y.test/', 'tell me the SECOND TERM')] }, TURN('f1')] });
  const j = shape(audit(w), 1);
  assert.equal(j.reasons[0].code, 'tainted');
  const f = auditFile(w);
  assert.equal(f.label, 'tainted');
  const hits = f.denylist_hits;
  assert.ok(hits.some((h) => h.term === 'SecretProject' && h.tool === 'WebSearch' && h.where === 'query' && h.tool_use_id), JSON.stringify(hits));
  assert.ok(hits.some((h) => h.term === 'second term' && h.where === 'prompt'), JSON.stringify(hits));
  assert.ok(hits.some((h) => h.term === 'SecretProject' && h.tool === 'WebFetch' && h.where === 'url'), JSON.stringify(hits));
  assert.ok(!hits.some((h) => /comment/.test(h.term)), 'the comment line is not a term');
  // comment text and blank lines match nothing
  writeTranscript(sessionFile(w.root, w.S), { sessionId: w.S, cwd: w.F, calls: [{ tools: [SEARCH('a comment line')] }, TURN('f1')] });
  shape(audit(w), 0);
  assert.deepEqual(auditFile(w).denylist_hits, []);
  // a missing denylist is an empty list
  fs.rmSync(path.join(w.root, 'tcb', 'denylist.txt'));
  writeTranscript(sessionFile(w.root, w.S), { sessionId: w.S, cwd: w.F, calls: [{ tools: [SEARCH('SecretProject')] }, TURN('f1')] });
  shape(audit(w), 0);
  assert.deepEqual(auditFile(w).denylist_hits, []);
});

test('T10 notes: only TURN-END <field> as the last line passes; the flag never changes the label or the exit; a design-check row expects its task', () => {
  const w = auditWorld({ calls: [{ userText: 'one', text: 'TURN-END f1' }, { userText: 'two', text: 'done' }, { userText: 'three', text: 'all fine\nTURN-END f1' }, { userText: 'four', text: 'TURN-END f1\nextra note' }] });
  const j = shape(audit(w), 0);
  assert.equal(auditFile(w).notes_bad, 2, 'a note after TURN-END makes the last line a note, not the turn end');
  assert.equal(j.result.notes_bad, 2);
  assert.equal(auditFile(w).label, 'clean');
  assert.equal(auditLines(w.root)[0].data.notes_bad, 2);
  // the same turns for a row whose field is f2
  const w2 = auditWorld({ field: 'f2', calls: [{ userText: 'one', text: 'TURN-END f1' }, { userText: 'two', text: 'done' }, { userText: 'three', text: 'all fine\nTURN-END f1' }, { userText: 'four', text: 'TURN-END f1\nextra note' }] });
  shape(audit(w2), 0);
  assert.equal(auditFile(w2).notes_bad, 4);
  assert.equal(auditFile(w2).label, 'clean');
  // a design-check row (field null) ends with TURN-END <its task>
  const w3 = auditWorld({ task: 'stpa-one', field: null, role: 'stpa', stage: 'design-check', calls: [{ userText: 'go', text: 'TURN-END stpa-one' }] });
  shape(audit(w3), 0);
  assert.equal(auditFile(w3).notes_bad, 0);
  const w4 = auditWorld({ task: 'stpa-two', field: null, role: 'stpa', stage: 'design-check', calls: [{ userText: 'go', text: 'TURN-END f1' }] });
  shape(audit(w4), 0);
  assert.equal(auditFile(w4).notes_bad, 1);
});

test('T11 first-call context: over baseline plus tolerance taints when both are gates; a null baseline is a reading; a control task never flags', () => {
  const calls = (input, read, write) => [{ usage: { input, cache_read: read, cache_write: write, output: 5 }, tools: [] , text: 'TURN-END f1' }];
  const gates = { params: { lean_baseline_tokens: 1000, lean_tolerance_tokens: 500 } };
  const w = auditWorld({ ...gates, calls: calls(300, 1000, 500) });
  const j = shape(audit(w), 1);
  assert.equal(j.reasons[0].code, 'tainted');
  assert.equal(auditFile(w).first_context, 1800);
  assert.equal(auditFile(w).first_context_over, true);
  assert.equal(auditFile(w).label, 'tainted');
  assert.equal(auditLines(w.root)[0].data.first_context, 1800);
  const w2 = auditWorld({ ...gates, calls: calls(100, 1000, 300) });
  shape(audit(w2), 0);
  assert.equal(auditFile(w2).first_context, 1400);
  assert.equal(auditFile(w2).first_context_over, false);
  assert.equal(auditFile(w2).label, 'clean');
  const w3 = auditWorld({ calls: calls(300, 1000, 500) });
  shape(audit(w3), 0);
  assert.equal(auditFile(w3).first_context, 1800, 'still recorded');
  assert.equal(auditFile(w3).first_context_over, null, 'a reading, never a taint');
  assert.equal(auditFile(w3).label, 'clean');
  const w4 = auditWorld({ ...gates, role: 'control', field: null, task: 'ctl-one', stage: 'control', calls: [{ usage: { input: 300, cache_read: 1000, cache_write: 500, output: 5 }, text: 'TURN-END ctl-one' }] });
  shape(audit(w4), 0);
  assert.equal(auditFile(w4).first_context, 1800);
  assert.notEqual(auditFile(w4).first_context_over, true, 'a control task records and never flags');
  assert.equal(auditFile(w4).label, 'clean');
});

test('T12 profile reading: Bash under bash none, an Agent of another type, a fetch under fetch none are listed and change neither exit nor label', () => {
  const w = auditWorld({ profile: { bash: 'none', fetch: 'none', agent_types: ['reader'] } });
  writeTranscript(sessionFile(w.root, w.S), { sessionId: w.S, cwd: w.F, calls: [{ tools: [RD(w.inF('brief.md'), 'ok'), BASH('echo hi'), AGENT('checker'), AGENT('reader'), FETCH('https://x.test/a')] }, TURN('f1')] });
  const j = shape(audit(w), 0);
  assert.equal(j.result.label, 'clean');
  const o = auditFile(w).out_of_profile;
  assert.deepEqual(o.map((x) => x.kind).sort(), ['agent', 'bash', 'fetch']);
  for (const x of o) assert.ok(x.tool_use_id && 'detail' in x);
  assert.equal(auditFile(w).label, 'clean');
  // bash tcb-node: only node tcb/scripts/ passes
  const w2 = auditWorld({ profile: { bash: 'tcb-node' } });
  writeTranscript(sessionFile(w2.root, w2.S), { sessionId: w2.S, cwd: w2.F, calls: [{ tools: [BASH('node tcb/scripts/status.mjs --root x'), BASH('git status')] }, TURN('f1')] });
  shape(audit(w2), 0);
  assert.deepEqual(auditFile(w2).out_of_profile.map((x) => x.kind), ['bash']);
  // fetch witnessed: the address must be in in/must_read.json
  const w3 = auditWorld({ profile: { fetch: 'witnessed' }, inputs: ['must_read.json'] });
  fs.writeFileSync(w3.inF('must_read.json'), JSON.stringify({ schema_version: 1, urls: [{ url: 'https://listed.test/a', href: 'https://listed.test/a' }] }));
  writeTranscript(sessionFile(w3.root, w3.S), { sessionId: w3.S, cwd: w3.F, calls: [{ tools: [FETCH('https://listed.test/a'), FETCH('https://other.test/b')] }, TURN('f1')] });
  shape(audit(w3), 0);
  const o3 = auditFile(w3).out_of_profile;
  assert.equal(o3.length, 1);
  assert.equal(o3[0].kind, 'fetch');
  assert.match(o3[0].detail, /other\.test/);
  // a tool outside tools_allow, a write outside write_prefixes
  const w4 = auditWorld({ profile: { tools_allow: ['Read', 'Write'], write_prefixes: ['{attempt}/staging/'] } });
  writeTranscript(sessionFile(w4.root, w4.S), { sessionId: w4.S, cwd: w4.F, calls: [{ tools: [GLOB({ pattern: '*' }), WR(w4.F + '/view/x.json')] }, TURN('f1')] });
  shape(audit(w4), 0);
  assert.deepEqual(auditFile(w4).out_of_profile.map((x) => x.kind).sort(), ['tool', 'write']);
});

test('T13 a design-check role that reads a path outside in/ (the full design) is tainted', () => {
  const w = auditWorld({ task: 'stpa-one', field: null, role: 'stpa', stage: 'design-check', calls: [TURN('stpa-one')] });
  writeTranscript(sessionFile(w.root, w.S), { sessionId: w.S, cwd: w.F, calls: [{ tools: [RD(w.inF('brief.md'), 'ok'), RD(path.join(w.root, 'plan', 'design.md'), 'ok')] }, TURN('stpa-one')] });
  const j = shape(audit(w), 1);
  assert.equal(j.reasons[0].code, 'tainted');
  assert.deepEqual(auditFile(w).undeclared, ['plan/design.md']);
  assert.equal(auditFile(w).label, 'tainted');
});

function coordWorld(calls, { profile, params, gates } = {}) {
  const root = makeRoot({ params, gates });
  const S = newSid();
  fs.writeFileSync(path.join(root, 'tcb', 'profiles', 'coordinator.json'), JSON.stringify({ role: 'coordinator', tools_allow: FULL_TOOLS, tools_deny: [], read_prefixes: ['{root}/'], write_prefixes: ['{root}/plan/'], agent_types: [], fetch: 'none', bash: 'tcb-node', ...profile }));
  writeTranscript(sessionFile(root, S), { sessionId: S, cwd: root, calls });
  addLedger(root, 'coord-init', { tcb_commit: 'a'.repeat(40) });
  return { root, S };
}
const audC = (c, extra = [], ce = '1') => run(['--root', c.root, '--ce', ce, '--coordinator', '--session', c.S, '--now', NOW, ...extra], c.root);
const U = (n) => ({ input: n, cache_read: 0, cache_write: 0, output: 10 });

test('T14 coordinator form: calls above 1.5 times W* are listed (exit 1 over-window only when W* is a gate); a write to tcb/ exits 3; Bash outside node tcb/scripts/ is out of profile', () => {
  const c = coordWorld([{ usage: U(150000), text: 'a' }, { usage: U(250000), text: 'b' }]);
  const j = shape(audC(c), 1);
  assert.equal(j.reasons[0].code, 'over-window');
  const f = readJ(c.root, 'run/audit/coordinator-ce1.json');
  assert.equal(f.calls_over.length, 1);
  assert.equal(f.calls_over[0].context, 250000);
  assert.ok(f.calls_over[0].id && 'ts' in f.calls_over[0]);
  assert.equal(f.peak_context, 250000);
  const lines = readLedger(c.root);
  verifyLedger(lines);
  assert.equal(lines.filter((l) => l.kind === 'audit').length, 0, 'the coordinator form writes no audit line');
  const chk = lines.filter((l) => l.kind === 'check');
  assert.equal(chk.length, 1);
  assert.equal(chk[0].data.subject, 'coordinator-ce1');
  assert.equal(chk[0].data.result, 'fail');
  // the same calls as a reading when W* is not a gate
  const c2 = coordWorld([{ usage: U(150000), text: 'a' }, { usage: U(250000), text: 'b' }], { gates: { W_star_coord: false } });
  shape(audC(c2), 0);
  assert.equal(readJ(c2.root, 'run/audit/coordinator-ce1.json').calls_over.length, 1);
  assert.equal(readLedger(c2.root).filter((l) => l.kind === 'check')[0].data.result, 'pass');
  // below the limit: nothing
  const c3 = coordWorld([{ usage: U(150000), text: 'a' }, { usage: U(199800), text: 'b' }]);
  shape(audC(c3), 0);
  assert.deepEqual(readJ(c3.root, 'run/audit/coordinator-ce1.json').calls_over, []);
  // a write to tcb/
  const c4 = coordWorld([{ usage: U(1000), text: 'a' }]);
  writeTranscript(sessionFile(c4.root, c4.S), { sessionId: c4.S, cwd: c4.root, calls: [{ usage: U(1000), tools: [WR(path.join(c4.root, 'tcb', 'thresholds.json'))] }, { text: 'done' }] });
  const k = shape(audC(c4), 3);
  assertReason(k, 'protected-write');
  assert.deepEqual(readJ(c4.root, 'run/audit/coordinator-ce1.json').protected_writes, ['tcb/thresholds.json']);
  assert.equal(readLedger(c4.root).filter((l) => l.kind === 'incident').length, 1);
  // Bash
  const c5 = coordWorld([{ usage: U(1000), tools: [BASH('git status'), BASH('node tcb/scripts/status.mjs --root x')], text: 'a' }]);
  shape(audC(c5), 0);
  const o = readJ(c5.root, 'run/audit/coordinator-ce1.json').out_of_profile;
  assert.equal(o.length, 1);
  assert.equal(o[0].kind, 'bash');
  assert.match(o[0].detail, /git status/);
  // reads of an attempt's staging are untrusted-data reads
  const c6 = coordWorld([{ usage: U(1000), text: 'a' }]);
  writeTranscript(sessionFile(c6.root, c6.S), { sessionId: c6.S, cwd: c6.root, calls: [{ usage: U(1000), tools: [RD(path.join(c6.root, 'wt', 'f1-research-e1', 'staging', 'a.json')), RD(path.join(c6.root, 'plan', 'p.json'))] }, { text: 'done' }] });
  shape(audC(c6), 0);
  assert.deepEqual(readJ(c6.root, 'run/audit/coordinator-ce1.json').udi_reads, ['wt/f1-research-e1/staging/a.json']);
});

test('T15 an older --epoch exits 65 and writes nothing; a stale --ce exits 64; a busy lock exits 75; an unknown task exits 1', () => {
  const w = auditWorld();
  // the row moves to epoch 2
  const S2 = newSid();
  const tbl = readJ(w.root, 'run/tasks.json');
  tbl.tasks[0].epoch = 2;
  tbl.tasks[0].attempts.push({ epoch: 2, folder: 'wt/f1-research-e2', session: S2, stop: 'none', manifest: w.M.id });
  fs.writeFileSync(path.join(w.root, 'run', 'tasks.json'), JSON.stringify(tbl));
  const before = snapshot(w.root);
  const a = shape(audit(w, [], { epoch: '1' }), 65);
  assert.equal(a.reasons[0].code, 'stale-epoch');
  assert.deepEqual(snapshot(w.root), before);
  const b = shape(audit(w, [], { ce: '2', epoch: '2' }), 64);
  assert.equal(b.reasons[0].code, 'stale-ce');
  assert.deepEqual(snapshot(w.root), before);
  const u = run(['--root', w.root, '--ce', '1', '--task', 'no-such-task', '--epoch', '1', '--now', NOW], w.root);
  const ju = shape(u, 1);
  assert.equal(ju.reasons[0].code, 'no-task');
  assert.deepEqual(snapshot(w.root), before);
  // busy lock (a fresh world at epoch 1)
  const w2 = auditWorld();
  const lock = holdLock(w2.root);
  const l = shape(audit(w2), 75);
  assert.equal(l.reasons[0].code, 'lock-busy');
  lock.release();
  assert.ok(!fs.existsSync(path.join(w2.root, 'run', 'audit', 'f1-research-e1.json')));
});

test('T16 no bound session, a missing transcript, a garbage transcript: exit 2, no audit file, a not_run check line and an incident line', () => {
  const check = (w, code) => {
    const j = shape(audit(w), 2);
    assert.equal(j.code, 'not-run');
    assertReason(j, code);
    assert.ok(!fs.existsSync(path.join(w.root, 'run', 'audit', 'f1-research-e1.json')), 'no audit file');
    const lines = readLedger(w.root);
    verifyLedger(lines);
    const tail = lines.slice(-2);
    assert.equal(tail[0].kind, 'check');
    assert.equal(tail[0].data.check, 'audit');
    assert.equal(tail[0].data.subject, 'f1-research-e1');
    assert.equal(tail[0].data.result, 'not_run');
    assert.equal(tail[1].kind, 'incident');
    assert.equal(tail[1].data.class, 'not-run');
    assert.equal(lines.filter((l) => l.kind === 'audit').length, 0, 'no audit line');
  };
  check(auditWorld({ noSession: true, noTranscript: true }), 'no-session');
  check(auditWorld({ noTranscript: true }), 'transcript-not-found');
  const g = auditWorld({ noTranscript: true });
  fs.mkdirSync(path.dirname(sessionFile(g.root, g.S)), { recursive: true });
  fs.writeFileSync(sessionFile(g.root, g.S), 'garbage line one\nnot json either\n{broken\n');
  check(g, 'format-unknown');
  // a manifest that is not in the store
  const m = auditWorld();
  fs.rmSync(path.join(m.root, 'store', 'objects', m.M.id + '.json'));
  check(m, 'missing');
});

test('T17 --dry-run: dry_run true and the label in the result, no file, no lines, the same exit code', () => {
  const w = auditWorld();
  writeTranscript(sessionFile(w.root, w.S), { sessionId: w.S, cwd: w.F, calls: [{ tools: [RD(path.join(w.root, 'store', 'objects', 'x'), 'ok')] }, TURN('f1')] });
  const before = snapshot(w.root);
  const j = shape(audit(w, ['--dry-run']), 1);
  assert.equal(j.dry_run === true || j.result.dry_run === true, true);
  assert.equal(j.result.label, 'tainted');
  assert.deepEqual(j.ledger_seq, []);
  assert.deepEqual(snapshot(w.root), before);
  const w2 = auditWorld();
  const k = shape(audit(w2, ['--dry-run']), 0);
  assert.equal(k.result.label, 'clean');
  assert.ok(!fs.existsSync(path.join(w2.root, 'run', 'audit')) || fs.readdirSync(path.join(w2.root, 'run', 'audit')).length === 0);
});

test('T18 a rerun on unchanged transcripts rewrites a byte-identical audit file and appends new lines; the ledger stays valid; no .tmp remains', () => {
  const w = auditWorld({ calls: [{ tools: [SEARCH('q', 'r')] }, TURN('f1')] });
  shape(audit(w), 0);
  const first = read(w.root, 'run/audit/f1-research-e1.json');
  const firstLog = read(w.root, 'run/audit/search-f1-research-e1.jsonl');
  const n1 = readLedger(w.root).length;
  shape(audit(w), 0);
  assert.equal(read(w.root, 'run/audit/f1-research-e1.json'), first);
  assert.equal(read(w.root, 'run/audit/search-f1-research-e1.jsonl'), firstLog);
  const lines = readLedger(w.root);
  verifyLedger(lines);
  assert.equal(lines.length, n1 + 2, 'an audit line and a check line again');
  const all = [];
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else all.push(p); } })(w.root);
  assert.deepEqual(all.filter((p) => p.endsWith('.tmp')), []);
});

test('T19 line data: undeclared sorted and unique, first_context and notes_bad integers; both forms or neither exit 66', () => {
  const w = auditWorld();
  const r = w.root;
  writeTranscript(sessionFile(r, w.S), { sessionId: w.S, cwd: w.F, calls: [{ tools: [RD(path.join(r, 'run', 'b.json')), RD(path.join(r, 'run', 'a.json')), RD(path.join(r, 'run', 'a.json')), RD(path.join(r, 'store', 'z'))] }, TURN('f1')] });
  shape(audit(w), 1);
  const d = auditLines(r)[0].data;
  assert.deepEqual(d.undeclared, ['run/a.json', 'run/b.json', 'store/z']);
  assert.ok(Number.isInteger(d.first_context));
  assert.ok(Number.isInteger(d.notes_bad));
  assert.deepEqual(Object.keys(d).sort(), ['first_context', 'label', 'notes_bad', 'protected_writes', 'undeclared']);
  const before = snapshot(r);
  const both = run(['--root', r, '--ce', '1', '--task', w.task, '--epoch', '1', '--coordinator', '--session', w.S], r);
  assert.equal(both.exit, 66, both.stdout + both.stderr);
  const neither = run(['--root', r, '--ce', '1'], r);
  assert.equal(neither.exit, 66);
  assert.equal(run(['--root', r, '--ce', '1', '--task', w.task], r).exit, 66, '--task needs --epoch');
  assert.equal(run(['--root', r, '--ce', '1', '--coordinator'], r).exit, 66, '--coordinator needs --session');
  assert.equal(run(['--root', r, '--ce', '1', '--task', w.task, '--epoch', '1', '--bogus'], r).exit, 66);
  assert.equal(run(['--root', r, '--task', w.task, '--epoch', '1'], r).exit, 66, '--ce is required');
  assert.deepEqual(snapshot(r), before);
});

test('T20 a script run from wt/ exits 3 run-from-attempt and writes nothing', () => {
  const w = auditWorld();
  const dir = path.join(w.F, 'copy');
  fs.mkdirSync(dir, { recursive: true });
  const src = scriptFile('audit');
  fs.copyFileSync(src, path.join(dir, 'audit.mjs'));
  fs.copyFileSync(path.join(path.dirname(src), 'lib.mjs'), path.join(dir, 'lib.mjs'));
  const before = snapshot(w.root);
  const r = spawnSync(process.execPath, [path.join(dir, 'audit.mjs'), '--root', w.root, '--ce', '1', '--task', w.task, '--epoch', '1', '--now', NOW], { cwd: w.root, encoding: 'utf8', windowsHide: true });
  assert.equal(r.status, 3, r.stdout + r.stderr);
  assert.ok(JSON.stringify(JSON.parse(r.stdout.trim().split('\n').pop()).reasons).includes('run-from-attempt'));
  assert.deepEqual(snapshot(w.root), before);
});

// ---------------------------------------------------------------------------------------------
// Added after the review of U4
// ---------------------------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function runAsync(argv, root, script = 'audit') {
  return new Promise((resolve) => {
    const c = spawn(process.execPath, [scriptFile(script), ...argv], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; let err = '';
    c.stdout.on('data', (d) => { out += d; });
    c.stderr.on('data', (d) => { err += d; });
    c.on('close', (code) => {
      const lines = out.split('\n').filter((l) => l.trim());
      let json = null;
      if (lines.length === 1) { try { json = JSON.parse(lines[0]); } catch { json = null; } }
      resolve({ exit: code, json, stdout: out, stderr: err, lines });
    });
  });
}

// The script waits for a lock a test-owned process holds; what the test changes meanwhile must be seen
// again inside the lock (CONTRACT 1.1): the epoch compare-and-set and the --ce check.
async function waitedLockCase(change) {
  const w = auditWorld({ params: { lock_retries: 200 } });
  const lock = holdLock(w.root);
  const p = runAsync(['--root', w.root, '--ce', '1', '--task', w.task, '--epoch', '1', '--now', NOW], w.root);
  await sleep(3000);
  change(w);
  const before = snapshot(w.root);
  delete before['run/run.lock']; // the test's own holder, gone before the script runs on
  lock.release();
  fs.rmSync(path.join(w.root, 'run', 'run.lock'), { force: true });
  const r = await p;
  return { w, r, before };
}

test('T15b the epoch is compared again inside the lock: a row fenced while the script waits for the lock gets exit 65 and no audit file', async () => {
  const { w, r, before } = await waitedLockCase((x) => {
    const tbl = readJ(x.root, 'run/tasks.json');
    tbl.tasks[0].epoch = 2;
    tbl.tasks[0].attempts.push({ epoch: 2, folder: 'wt/f1-research-e2', session: newSid(), stop: 'none', manifest: x.M.id });
    fs.writeFileSync(path.join(x.root, 'run', 'tasks.json'), JSON.stringify(tbl));
  });
  assert.equal(r.exit, 65, r.stdout + r.stderr);
  assert.equal(JSON.parse(r.stdout.trim().split('\n').pop()).reasons[0].code, 'stale-epoch');
  assert.ok(!fs.existsSync(path.join(w.root, 'run', 'audit', 'f1-research-e1.json')), 'no audit file');
  assert.deepEqual(snapshot(w.root), before, 'nothing written');
});

test('T15c --ce is compared again inside the lock: a ce raised while the script waits for the lock gets exit 64 and no audit file', async () => {
  const { w, r, before } = await waitedLockCase((x) => {
    fs.writeFileSync(path.join(x.root, 'run', 'coord.json'), JSON.stringify({ schema_version: 1, ce: 2, started_at: NOW, tcb_commit: 'a'.repeat(40) }, null, 2));
  });
  assert.equal(r.exit, 64, r.stdout + r.stderr);
  assert.equal(JSON.parse(r.stdout.trim().split('\n').pop()).reasons[0].code, 'stale-ce');
  assert.ok(!fs.existsSync(path.join(w.root, 'run', 'audit', 'f1-research-e1.json')), 'no audit file');
  assert.deepEqual(snapshot(w.root), before, 'nothing written');
});

function batchFiles(root, names = ['b1-1', 'b1-2']) {
  for (const b of names) {
    fs.mkdirSync(path.join(root, 'queue', b), { recursive: true });
    fs.writeFileSync(path.join(root, 'queue', b, 'batch.json'), '{}');
    fs.writeFileSync(path.join(root, 'queue', b, 'i_1.json'), '{}');
  }
  fs.mkdirSync(path.join(root, 'sealed', 'seeds'), { recursive: true });
  fs.writeFileSync(path.join(root, 'sealed', 'seeds', 'b1-1.json'), '{}');
}

test('T14b CONTRACT 3.21: a helper that read a batch may read that one batch only; a second batch, the seed key or any other read is listed and exits 1', () => {
  const q = (c, ...p) => path.join(c.root, ...p);
  const withHelper = (reads) => {
    const c = coordWorld([{ usage: U(1000), text: 'a' }]);
    batchFiles(c.root);
    writeTranscript(helperFile(c.root, c.S, 'agent-h1'), { sessionId: c.S, cwd: c.root, calls: [{ tools: reads(c).map((p) => RD(p, 'ok')) }, { text: 'done' }] });
    return c;
  };
  // one batch, its batch file and an item: clean
  let c = withHelper((x) => [q(x, 'queue', 'b1-1', 'batch.json'), q(x, 'queue', 'b1-1', 'i_1.json'), q(x, 'queue', 'b1-1')]);
  shape(audC(c), 0);
  assert.deepEqual(readJ(c.root, 'run/audit/coordinator-ce1.json').checker_reads, []);
  // a second batch
  c = withHelper((x) => [q(x, 'queue', 'b1-1', 'batch.json'), q(x, 'queue', 'b1-2', 'batch.json')]);
  let j = shape(audC(c), 1);
  assert.equal(j.reasons[0].code, 'tainted');
  assert.deepEqual(readJ(c.root, 'run/audit/coordinator-ce1.json').checker_reads.map((x) => x.path), ['queue/b1-2/batch.json']);
  assert.deepEqual(j.reasons[0].detail.checker_reads.map((x) => x.path), ['queue/b1-2/batch.json']);
  // the seed key
  c = withHelper((x) => [q(x, 'queue', 'b1-1', 'batch.json'), q(x, 'sealed', 'seeds', 'b1-1.json')]);
  shape(audC(c), 1);
  assert.deepEqual(readJ(c.root, 'run/audit/coordinator-ce1.json').checker_reads.map((x) => x.path), ['sealed/seeds/b1-1.json']);
  // a read of anything else besides the batch
  c = withHelper((x) => [q(x, 'queue', 'b1-1', 'batch.json'), q(x, 'plan', 'p.json')]);
  shape(audC(c), 1);
  assert.deepEqual(readJ(c.root, 'run/audit/coordinator-ce1.json').checker_reads.map((x) => x.path), ['plan/p.json']);
  // the key alone, with no batch read first, is still a read of sealed/
  c = withHelper((x) => [q(x, 'sealed', 'seeds', 'b1-1.json')]);
  shape(audC(c), 1);
  assert.deepEqual(readJ(c.root, 'run/audit/coordinator-ce1.json').checker_reads.map((x) => x.path), ['sealed/seeds/b1-1.json']);
  // a helper that never touched a batch or sealed/ is not a checker and is not flagged
  c = withHelper((x) => [q(x, 'plan', 'p.json')]);
  shape(audC(c), 0);
  assert.deepEqual(readJ(c.root, 'run/audit/coordinator-ce1.json').checker_reads, []);
});

test('T3b CONTRACT 3.21: a {batch} prefix allows one batch per transcript; reads of a second batch are undeclared', () => {
  const w = auditWorld({ profile: { read_prefixes: ['{root}/queue/{batch}/'] } });
  batchFiles(w.root);
  const rd = (...p) => RD(path.join(w.root, ...p), 'ok');
  writeTranscript(sessionFile(w.root, w.S), { sessionId: w.S, cwd: w.F, calls: [{ tools: [rd('queue', 'b1-1', 'batch.json'), rd('queue', 'b1-1', 'i_1.json')] }, TURN('f1')] });
  shape(audit(w), 0);
  assert.deepEqual(auditFile(w).undeclared, []);
  writeTranscript(sessionFile(w.root, w.S), { sessionId: w.S, cwd: w.F, calls: [{ tools: [rd('queue', 'b1-1', 'batch.json'), rd('queue', 'b1-2', 'batch.json')] }, TURN('f1')] });
  const j = shape(audit(w), 1);
  assert.equal(j.reasons[0].code, 'tainted');
  assert.deepEqual(auditFile(w).undeclared, ['queue/b1-2/batch.json']);
});

test('T21a needs-app: real transcripts hold the fields assumed (helper linking, tool-result text, turn-end text)', { skip: 'needs the app: CONTRACT section 7 item 7' }, () => {});
test('T21b needs-app: the lean first-call baseline and its tolerance are measured on a real control session', { skip: 'needs the app: CONTRACT section 7 item 11' }, () => {});
test('T21c needs-app: the harness runs guard-hook.mjs and honours its refusal (audit is the detective layer behind it)', { skip: 'needs the app: CONTRACT section 7 items 1 to 3' }, () => {});
test('T21d needs-app: what the coordinator is actually shown of a child turn end (the first 400 characters)', { skip: 'needs the app: design R30' }, () => {});
