// commit.mjs tests, written from spec/commit.mjs.md and CONTRACT.md only (the script's code was not read).
// One test per behaviour, named with its id (T1..T25 of the spec). Each test builds its own run root under
// tcb-build/tmp, runs `node tcb/scripts/commit.mjs` as a child process and checks the exit code, the one JSON
// line on stdout and the files. Fixtures: tcb/fixtures/commit/_*.json (synthetic cards).
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_NAME = 'commit';
const RUN_PREFIX = 'tcbcm-';
// ==== COMMON HELPERS BEGIN (identical in the commit, harvest and fsck tests) ====
const HERE = path.dirname(fileURLToPath(import.meta.url));
const TCB = path.resolve(HERE, '..');
const BUILD = path.resolve(TCB, '..');
const TMP = path.join(BUILD, 'tmp');
const NOW = '2026-11-17T10:00:00.000Z';
const ZERO = '0'.repeat(64);
const PS_EXE = 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
const SESSION = '11111111-1111-4111-8111-111111111111';
const SESSION2 = '22222222-2222-4222-8222-222222222222';
const TASK = 'f1-research';
// CONTRACT 1.4: one slug per exit code.
const EXIT_SLUG = { 0: 'ok', 1: 'fail', 2: 'not-run', 3: 'tamper', 5: 'ready-wins', 6: 'deferred', 10: 'reopened', 64: 'stale-ce', 65: 'stale-epoch', 66: 'usage', 67: 'table-corrupt', 70: 'internal', 75: 'lock-busy' };
const PREFIX_OF = { card: 'c', pack: 'p', review: 'r', manifest: 'm', certificate: 'x', stpa: 'd', fmea: 'd', hazards: 'd' };
// CONTRACT 3.22: the kinds each commit step produces.
const KINDS = { pack: ['card', 'pack'], review: ['review'], stpa: ['stpa'], fmea: ['fmea'], hazards: ['hazards'] };

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
// CONTRACT 4.2: keys sorted by code unit, strings NFC, no whitespace, -0 as 0.
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
const objId = (prefix, v) => prefix + '_' + sha(canon(v)).slice(0, 16);
const fwd = (p) => p.split(path.sep).join('/');
const clone = (x) => JSON.parse(JSON.stringify(x));
const exists = (p) => fs.existsSync(p);
const readJ = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const writeJ = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n'); };
const fixture = (name) => readJ(path.join(TCB, 'fixtures', SCRIPT_NAME, name));
const fixtureText = (name) => fs.readFileSync(path.join(TCB, 'fixtures', SCRIPT_NAME, name), 'utf8');
function listFiles(dir) {
  const out = [];
  if (!exists(dir)) return out;
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else out.push(fwd(path.relative(dir, p)));
    }
  })(dir);
  return out.sort();
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
function thresholdsFile(over) {
  const vals = { ...DEFAULT_PARAMS, ...over };
  const params = {};
  for (const [name, value] of Object.entries(vals)) {
    params[name] = { value, unit: 'tests only', source: 'guess', gate: value !== null };
  }
  params.unverifiable_share_max.line = { measure: 'unverifiable_share', op: 'max' };
  params.coverage_floor.line = { measure: 'coverage', op: 'floor' };
  return { schema_version: 1, params };
}

// ---- run roots ----
const ROOTS = [];
const LINKS = [];
function removeRoot(r) {
  for (const l of LINKS) { try { fs.rmdirSync(l); } catch { try { fs.unlinkSync(l); } catch { /* already gone */ } } }
  try { fs.rmSync(r, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); } catch { /* best effort */ }
}
after(() => { for (const r of ROOTS) removeRoot(r); });
const rd = (root, rel) => path.join(root, ...rel.split('/'));
function writeTasks(root, rows, rev = 0) {
  fs.writeFileSync(path.join(root, 'run', 'tasks.json'), JSON.stringify({ schema_version: 1, rev, tasks: rows }, null, 2));
}
const readTable = (root) => readJ(path.join(root, 'run', 'tasks.json'));
function makeRoot({ ce = 1, params = {}, tasks = [], tcbCommit } = {}) {
  fs.mkdirSync(TMP, { recursive: true });
  const root = fs.mkdtempSync(path.join(TMP, RUN_PREFIX));
  ROOTS.push(root);
  for (const d of ['tcb', 'plan/frozen', 'run', 'store/objects', 'store/commits', 'store/status', 'views', 'completeness', 'wt', 'transcripts']) {
    fs.mkdirSync(path.join(root, d), { recursive: true });
  }
  for (const sub of ['schemas', 'profiles', 'settings', 'agents', 'briefs']) {
    const src = path.join(TCB, sub);
    if (exists(src)) fs.cpSync(src, path.join(root, 'tcb', sub), { recursive: true });
  }
  fs.writeFileSync(path.join(root, 'tcb', 'thresholds.json'), JSON.stringify(thresholdsFile({ transcripts_root: fwd(root) + '/transcripts', ...params }), null, 2));
  writeJ(path.join(root, 'run', 'coord.json'), { schema_version: 1, ce, started_at: NOW, tcb_commit: tcbCommit ?? 'a'.repeat(40) });
  writeTasks(root, tasks);
  return root;
}
// A junction (or other link) the test made; removed before the root so nothing behind it is touched.
function makeJunction(target, linkPath) {
  try { fs.symlinkSync(target, linkPath, 'junction'); } catch { return false; }
  LINKS.push(linkPath);
  return true;
}

// ---- jsonl, ledger (hash chain of CONTRACT 3.7) ----
function appendJsonl(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.appendFileSync(p, JSON.stringify(obj) + '\n');
}
function readJsonl(p) {
  if (!exists(p)) return [];
  const out = [];
  for (const l of fs.readFileSync(p, 'utf8').split('\n')) {
    if (!l.trim()) continue;
    try { out.push(JSON.parse(l)); } catch { /* torn or bad line: skipped */ }
  }
  return out;
}
const ledgerPath = (root) => path.join(root, 'run', 'ledger.jsonl');
const readLedger = (root) => readJsonl(ledgerPath(root));
const ledgerKind = (root, kind) => readLedger(root).filter((l) => l.kind === kind);
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
  const line = { seq: lines.length + 1, prev, ts: NOW, ce: 1, writer: 'test-fixture', writer_sha: ZERO, kind };
  for (const [k, v] of Object.entries(extra)) if (v !== undefined) line[k] = v;
  line.data = data;
  line.hash = sha(prev + canon(line)); // the hash covers the line without its own hash field
  appendJsonl(ledgerPath(root), line);
  return line.seq;
}

// ---- store objects, status, witness, commit records ----
function putObj(root, value) {
  const bytes = canon(value);
  const hex = sha(bytes);
  const id = PREFIX_OF[value.kind] + '_' + hex.slice(0, 16);
  fs.writeFileSync(path.join(root, 'store', 'objects', id + '.json'), bytes);
  return { id, sha: hex, value };
}
const objectPath = (root, id) => path.join(root, 'store', 'objects', id + '.json');
const objectFiles = (root) => fs.readdirSync(path.join(root, 'store', 'objects'));
// stored objects other than manifests, as ids
const storedIds = (root) => objectFiles(root).filter((f) => f.endsWith('.json') && !f.startsWith('m_')).map((f) => f.slice(0, -5)).sort();
const statusPath = (root) => path.join(root, 'store', 'status', 'card_status.jsonl');
const statusLines = (root) => readJsonl(statusPath(root));
function addStatus(root, card, status, extra = {}) {
  const seq = extra.seq ?? statusLines(root).length + 1;
  const line = { seq, card_id: card.id, card_sha: extra.sha ?? card.sha, status, reason: extra.reason ?? 'ok', at: NOW };
  if (extra.witness_seq !== undefined) line.witness_seq = extra.witness_seq;
  appendJsonl(statusPath(root), line);
  return seq;
}
const witnessPath = (root) => path.join(root, 'store', 'witness.jsonl');
function addWitness(root, card, o = {}) {
  const seq = o.seq ?? readJsonl(witnessPath(root)).length + 1;
  appendJsonl(witnessPath(root), { seq, card_id: card.id, card_sha: card.sha, result: 'witnessed', number_bound: true, reason: 'ok', source_changed: false, w: 300, at: NOW });
  return seq;
}
function commitRecordOf(task, step, epoch, manifestSha, outputs) {
  const outs = outputs.map((o) => ({ id: o.id, kind: o.kind, sha256: o.sha })).sort((a, b) => (a.id < b.id ? -1 : 1));
  return { schema_version: 1, task, step, epoch, step_key: manifestSha, outputs: outs, outputs_sha: sha(canon(outs)) };
}

// ---- rows, attempts, manifests (CONTRACT 3.5, 3.6) ----
function mkAttempt(task, epoch, o = {}) {
  const a = { epoch, folder: `wt/${task}-e${epoch}`, stop: o.stop ?? 'none' };
  if (o.session) a.session = o.session;
  if (o.manifest) a.manifest = o.manifest;
  if (o.settingsSha) a.settings_sha = o.settingsSha;
  return a;
}
function mkRow(o = {}) {
  const task = o.task ?? TASK;
  const epoch = o.epoch ?? 1;
  const row = {
    task, field: o.field ?? 'f1', stage: 'research', role: 'child', steps: o.steps ?? ['pack'], deps: [],
    question_ids: o.qids ?? ['f1-alpha-01', 'f1-alpha-02'], e_task: 200000, tier: 'synthetic-tier',
    state: o.state ?? 'active', step: o.step ?? 'bound', epoch, restarts: 0, handovers: 0, parks: 0, limit: false,
    fails: [], attempts: o.attempts ?? [mkAttempt(task, epoch, { session: o.session })], commits: o.commits ?? {}, updated_rev: 0,
  };
  if (o.session) row.session = o.session;
  return row;
}
function mkManifest(task, epoch, steps, o = {}) {
  return {
    schema_version: 1, kind: 'manifest', task, epoch, role: 'child', brief_sha: 'b'.repeat(64), schema_shas: {},
    tier: 'synthetic-tier', tools: [], inputs: [], agents: o.agents ?? [], user_files: [],
    outputs: steps.map((s) => ({ step: s, kinds: KINDS[s] })),
  };
}
function mkProtocol(o = {}) {
  return {
    schema_version: 1, kind: 'protocol', field: o.field ?? 'f1', question_ids: o.qids ?? ['f1-alpha-01', 'f1-alpha-02'],
    criteria: { include: [{ code: 'I1', text: 'synthetic include' }], exclude: [{ code: 'E1', text: 'synthetic exclude' }] },
    routes: ['keyword', 'backward', 'forward', 'contrary', 'seed'], card_schema_version: 1, certainty_method: 'synthetic',
    sesoi: { throughput: 5 }, outlist_vocab: { approaches: ['cache_prefix'], measures: ['throughput', 'latency'], effects: ['improves', 'worsens', 'no-effect', 'mixed'] },
    seeds: [], must_read: [], fixed_files: [], cross_field: [], approval: { quote: 'synthetic approval', at: NOW },
  };
}
// Writes the frozen file plus its protocol-freeze ledger line (CONTRACT 3.18); returns the questions_sha packs carry.
function freezeProtocol(root, proto = mkProtocol()) {
  const bytes = canon(proto);
  const h = sha(bytes);
  const rel = `plan/frozen/protocol-${proto.field}-${h.slice(0, 12)}.json`;
  fs.writeFileSync(rd(root, rel), bytes);
  addLedger(root, 'protocol-freeze', { name: 'protocol-' + proto.field, sha256: h, path: rel }, { writer: 'protocol-freeze' });
  return { sha: h, rel, qsha: sha(canon([...proto.question_ids].sort())) };
}

// ---- synthetic transcripts in the shape of CONTRACT 4.8 ----
let UID = 0;
function transcript(sessionId, cwd, { sidechain = false } = {}) {
  const recs = [];
  let n = 0;
  const base = (type, extra) => {
    UID += 1;
    return { type, uuid: 'u-' + UID, sessionId, cwd, isSidechain: sidechain, timestamp: new Date(Date.parse(NOW) + UID * 1000).toISOString(), ...extra };
  };
  const api = {
    // one model call: one assistant record holding the text and tool_use blocks; returns the tool_use ids
    call({ text, tools = [], usage = {} } = {}) {
      n += 1;
      const id = `msg_${sessionId.slice(0, 4)}_${UID}_${n}`;
      const content = [];
      if (text) content.push({ type: 'text', text });
      const ids = tools.map((t, i) => t.id ?? `toolu_${sessionId.slice(0, 4)}_${UID}_${n}_${i}`);
      tools.forEach((t, i) => content.push({ type: 'tool_use', id: ids[i], name: t.name, input: t.input ?? {} }));
      recs.push(base('assistant', { message: { id, type: 'message', role: 'assistant', model: 'synthetic-model', content, usage: { input_tokens: usage.input ?? 10, cache_read_input_tokens: usage.cache_read ?? 0, cache_creation_input_tokens: usage.cache_write ?? 0, output_tokens: usage.output ?? 5 } } }));
      return ids;
    },
    result(toolUseId, text, isError = false) {
      recs.push(base('user', { message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUseId, content: text, is_error: isError }] } }));
    },
    structured(data) {
      recs.push(base('attachment', { attachment: { type: 'structured_output', data } }));
    },
    // writes the file; `torn` is a final line without its newline
    write(file, { torn } = {}) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, recs.map((r) => JSON.stringify(r) + '\n').join('') + (torn ?? ''));
    },
  };
  return api;
}
const mainTranscriptPath = (root, session) => path.join(root, 'transcripts', 'proj-a', session + '.jsonl');
const helperTranscriptPath = (root, session, name) => path.join(root, 'transcripts', 'proj-a', session, 'subagents', `agent-${name}.jsonl`);

// ---- running a script as a child process ----
function run(script, argv, root) {
  const r = spawnSync(process.execPath, [path.join(TCB, 'scripts', script + '.mjs'), ...argv], { cwd: root, encoding: 'utf8', windowsHide: true, shell: false, timeout: 180000, maxBuffer: 64 << 20 });
  const lines = (r.stdout ?? '').split('\n').filter((l) => l.trim());
  let json = null;
  if (lines.length === 1) { try { json = JSON.parse(lines[0]); } catch { json = null; } }
  return { exit: r.status, json, stdout: r.stdout ?? '', stderr: r.stderr ?? '', lines };
}
// CONTRACT 1.3 shape, asserted on every run.
function shape(r, script, exit, mode = null) {
  const where = () => `\nexit=${r.exit}\nstdout=${r.stdout.slice(0, 1200)}\nstderr=${r.stderr.slice(0, 1200)}`;
  assert.equal(r.lines.length, 1, 'stdout must be exactly one line' + where());
  const j = r.json;
  assert.ok(j && typeof j === 'object', 'stdout line must be JSON' + where());
  for (const k of ['ok', 'script', 'mode', 'exit', 'code', 'dry_run', 'result', 'reasons', 'ledger_seq']) assert.ok(k in j, 'stdout JSON lacks key ' + k + where());
  assert.ok(j.script === script || j.script === script + '.mjs', 'script name' + where());
  assert.equal(j.mode, mode, 'mode' + where());
  assert.equal(j.exit, r.exit, 'JSON exit equals process exit' + where());
  if (exit !== undefined) assert.equal(r.exit, exit, 'expected exit ' + exit + where());
  assert.equal(j.code, EXIT_SLUG[j.exit], 'code is the slug of the exit' + where());
  assert.equal(j.ok, j.exit === 0);
  assert.equal(typeof j.dry_run, 'boolean');
  assert.ok(Array.isArray(j.reasons) && Array.isArray(j.ledger_seq));
  return j;
}
const reasonCodes = (j) => j.reasons.map((x) => x.code);
function assertReason(j, code) { assert.ok(reasonCodes(j).includes(code), `reasons should name ${code}, got ${JSON.stringify(j.reasons)}`); }
function assertFirstReason(j, code) { assert.equal(j.reasons[0]?.code, code, `reasons[0] should be ${code}, got ${JSON.stringify(j.reasons)}`); }
function snapshot(root) {
  const out = {};
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      const rel = fwd(path.relative(root, p));
      if (rel === 'tcb' || rel === '.git') continue;
      if (e.isDirectory()) walk(p); else out[rel] = sha(fs.readFileSync(p));
    }
  })(root);
  return out;
}
// A run.lock held by a live process this test spawned itself (and ends itself).
function holdLock(root) {
  const child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore', windowsHide: true });
  const ps = spawnSync(PS_EXE, ['-NoProfile', '-NonInteractive', '-Command', `[Console]::OutputEncoding=[Text.Encoding]::UTF8; (Get-CimInstance Win32_Process -Filter "ProcessId=${child.pid}").CreationDate.ToUniversalTime().ToString('o')`], { encoding: 'utf8', windowsHide: true, timeout: 60000 });
  const start = (ps.stdout ?? '').trim();
  if (!/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(start)) { try { child.kill(); } catch { /* own child */ } throw new Error('cannot read start time of the test-owned sleeper: ' + start); }
  fs.writeFileSync(path.join(root, 'run', 'run.lock'), JSON.stringify({ pid: child.pid, start_time: start, nonce: 'a'.repeat(32), script: 'test-holder', ce: 1, acquired_at: NOW }));
  return { release() { try { child.kill(); } catch { /* own child */ } } };
}

// ---- git inside a temp root (read and write, the test's own repository only) ----
const GIT_FLAGS = ['-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=NUL', '-c', 'core.longpaths=true', '-c', 'core.autocrlf=false'];
const GIT_OK = spawnSync('git', ['--version'], { encoding: 'utf8', windowsHide: true }).status === 0;
function git(root, args) {
  return spawnSync('git', [...GIT_FLAGS, '-c', 'user.name=tcb-test', '-c', 'user.email=tcb-test@example.invalid', '-c', 'commit.gpgsign=false', '-C', root, ...args], { encoding: 'utf8', windowsHide: true, shell: false, timeout: 60000 });
}
// git init, commit `paths` (relative to the root), return the full commit id
function gitInitCommit(root, paths) {
  fs.writeFileSync(path.join(root, '.gitattributes'), '* -text\n');
  assert.equal(git(root, ['init', '-q']).status, 0, 'git init');
  assert.equal(git(root, ['add', '.gitattributes', ...paths]).status, 0, 'git add');
  assert.equal(git(root, ['commit', '-q', '-m', 'synthetic base']).status, 0, 'git commit');
  const head = git(root, ['rev-parse', 'HEAD']).stdout.trim();
  assert.match(head, /^[0-9a-f]{40}$/);
  return head;
}
// ==== COMMON HELPERS END ====

// ---------------------------------------------------------------------------------------------
// commit specific helpers
// ---------------------------------------------------------------------------------------------
const A_URL = 'https://example.test/paper-a';
const B_URL = 'https://example.test/paper-b';
const C_URL = 'https://example.test/paper-c';
const SIX = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen'; // 16 words

// A run root with a bound attempt of TASK: row, manifest, frozen protocol, a main transcript that fetched the
// given urls, and the attempt folder.
function setup(o = {}) {
  const epoch = o.epoch ?? 1;
  const ce = o.ce ?? 1;
  const steps = o.steps ?? ['pack'];
  const root = makeRoot({ ce: o.coordCe ?? ce, params: o.params });
  const manifest = putObj(root, mkManifest(TASK, epoch, steps));
  const session = o.twoEpochs ? SESSION2 : SESSION;
  const attempts = o.twoEpochs
    ? [mkAttempt(TASK, 1, { session: SESSION, stop: 'confirmed' }), mkAttempt(TASK, 2, { session: SESSION2, manifest: manifest.id })]
    : [mkAttempt(TASK, epoch, { session, manifest: manifest.id })];
  writeTasks(root, [mkRow({ epoch, steps, session, attempts })]);
  for (const a of attempts) for (const d of ['staging', 'in/checkpoint', 'view']) fs.mkdirSync(rd(root, `${a.folder}/${d}`), { recursive: true });
  if (o.freeze !== false) freezeProtocol(root, mkProtocol());
  const urls = o.urls ?? [A_URL, B_URL];
  if (o.transcript !== false) {
    for (const a of attempts) {
      const t = transcript(a.session, path.join(root, a.folder));
      if (a.session === session) t.call({ tools: urls.map((u) => ({ name: 'WebFetch', input: { url: u, prompt: 'read the page' } })) });
      else t.call({ usage: { input: 100, cache_read: 50, cache_write: 20, output: 30 } }); // total 200
      t.write(mainTranscriptPath(root, a.session));
    }
  }
  const dir = (e = epoch) => rd(root, `wt/${TASK}-e${e}`);
  const ctx = {
    root, epoch, ce, steps, manifest, dir, session,
    qsha: sha(canon(['f1-alpha-01', 'f1-alpha-02'])),
    stage(rel, value) {
      const p = path.join(dir(), 'staging', ...rel.split('/'));
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, typeof value === 'string' ? value : JSON.stringify(value, null, 2));
      return p;
    },
    intake(extra = [], over = {}) {
      return run('commit', ['intake', '--root', root, '--ce', String(over.ce ?? ce), '--task', TASK, '--epoch', String(over.epoch ?? epoch), '--now', NOW, ...extra], root);
    },
    record(step = 'pack', extra = [], over = {}) {
      return run('commit', ['record', '--root', root, '--ce', String(over.ce ?? ce), '--task', TASK, '--epoch', String(over.epoch ?? epoch), '--step', step, '--now', NOW, ...extra], root);
    },
  };
  return ctx;
}
const ledgerOk = (root) => verifyLedger(readLedger(root));
const rejectedOf = (ctx) => readJ(path.join(ctx.dir(), 'view', 'rejected.json')).rejected.map((x) => `${x.file}|${x.code}`).sort();
const committedOf = (ctx) => readJ(path.join(ctx.dir(), 'view', 'committed.json'));
const lineRejected = (line) => line.data.rejected.map((x) => `${x.file}|${x.code}`).sort();
const objRef = (root, id) => ({ id, sha: sha(fs.readFileSync(objectPath(root, id))) });
const card = (name, mods = {}) => ({ ...fixture(name), ...mods });
const cardWith = (name, f) => { const c = fixture(name); f(c); return c; };

function sent(sid, cites, over = {}) {
  return {
    sid, approach_id: 'cache_prefix', measure: 'throughput', kind: 'fact', text: 'A cached prefix raised throughput on refactoring tasks.',
    cites, applies_to: { task: ['refactor'], model_family: ['synthetic-m'], language: ['python'] }, ...over,
  };
}
function mkPackFor(ctx, cards, concl, over = {}) {
  return { schema_version: 1, kind: 'pack', field: 'f1', questions_sha: ctx.qsha, cards: [...cards].sort(), conclusions: concl, not_covered: [], ...over };
}
function mkReviewFor(packId, cites, over = {}) {
  return {
    schema_version: 1, kind: 'review', field: 'f1', task: TASK, pack: packId, sentences: [sent('s1', cites)],
    verdicts: [{ approach_id: 'cache_prefix', verdict: 'promising', supports: ['s1'] }], dismissals: [], our_work_findings: [], ...over,
  };
}
// stages card a, a pack citing it and (optionally) a review of that pack
function std(ctx, o = {}) {
  const a = fixture('_card-a.json');
  const A = objId('c', a);
  ctx.stage('cards/a.card.json', a);
  const pack = o.pack ? o.pack(ctx, A) : mkPackFor(ctx, [A], [sent('s1', [A])]);
  const P = objId('p', pack);
  ctx.stage('pack.json', pack);
  const out = { a, A, pack, P };
  if (o.review) {
    out.review = mkReviewFor(P, [A]);
    out.R = objId('r', out.review);
    ctx.stage('review.json', out.review);
  }
  return out;
}
const addFsck = (ctx, result = 'pass') => addLedger(ctx.root, 'fsck', { result, failing: result === 'pass' ? [] : [{ check: 'objects', id: 'c_0000000000000000', code: 'object-mismatch' }] }, { writer: 'fsck' });
const addAudit = (ctx, label = 'clean') => addLedger(ctx.root, 'audit', { label, undeclared: label === 'clean' ? [] : ['x'], protected_writes: [], first_context: 0, notes_bad: [] }, { task: TASK, epoch: ctx.epoch, writer: 'audit' });
const writeReady = (ctx, step = 'pack', over = {}) => ctx.stage('READY.json', { schema_version: 1, kind: 'ready', task: TASK, epoch: ctx.epoch, step, ...over });
function statuses(ctx, ids, status = 'witnessed') {
  for (const id of ids) addStatus(ctx.root, objRef(ctx.root, id), status, { witness_seq: 1 });
}
// Every precondition of `commit record` after a clean intake: intake run, statuses, fsck line, audit line, READY.
function prepared(o = {}) {
  const ctx = setup(o.setup);
  if (o.auditFirst) addAudit(ctx);
  if (o.fsckFirst) addFsck(ctx);
  const s = std(ctx, o);
  assert.equal(ctx.intake().exit, 0, 'prepared: the intake of the standard files must pass');
  if (o.extra) o.extra(ctx, s);
  if (!o.skipStatus) statuses(ctx, [s.A]);
  if (!o.skipFsck && !o.fsckFirst) addFsck(ctx);
  if (!o.skipAudit && !o.auditFirst) addAudit(ctx, o.auditLabel ?? 'clean');
  if (!o.skipReady) writeReady(ctx, o.readyStep ?? 'pack', o.readyOver ?? {});
  return { ctx, s };
}
const doRecord = (ctx, exit, step = 'pack', extra = [], over = {}) => shape(ctx.record(step, extra, over), 'commit', exit, 'record');
const doIntake = (ctx, exit, extra = [], over = {}) => shape(ctx.intake(extra, over), 'commit', exit, 'intake');
const commitPath = (root, step = 'pack') => path.join(root, 'store', 'commits', `${TASK}.${step}.json`);

// ---------------------------------------------------------------------------------------------
// Behaviours (spec/commit.mjs.md "Behaviours")
// ---------------------------------------------------------------------------------------------

test('T1 intake of a valid card, pack and review: three objects stored by canonical bytes, intake line with origins, exit 0, rejected.json empty', () => {
  const ctx = setup();
  const s = std(ctx, { review: true });
  const j = doIntake(ctx, 0);
  const values = { [s.A]: s.a, [s.P]: s.pack, [s.R]: s.review };
  const kinds = { [s.A]: 'card', [s.P]: 'pack', [s.R]: 'review' };
  assert.deepEqual(j.result.stored.map((x) => x.id).sort(), Object.keys(values).sort());
  for (const x of j.result.stored) {
    assert.equal(x.origin, 'session');
    assert.equal(x.kind, kinds[x.id]);
    assert.equal(x.created, true);
  }
  assert.deepEqual(storedIds(ctx.root), Object.keys(values).sort());
  for (const [id, v] of Object.entries(values)) {
    assert.equal(fs.readFileSync(objectPath(ctx.root, id), 'utf8'), canon(v), `object ${id} holds the canonical bytes`);
  }
  const lines = ledgerKind(ctx.root, 'intake');
  assert.equal(lines.length, 1);
  assert.deepEqual(lines[0].data.objects.map((x) => `${x.id}|${x.kind}|${x.origin}`).sort(), Object.keys(values).map((id) => `${id}|${kinds[id]}|session`).sort());
  assert.deepEqual(lines[0].data.rejected, []);
  assert.deepEqual(lines[0].data.flagged, []);
  assert.deepEqual(j.ledger_seq, [lines[0].seq]);
  assert.deepEqual(readJ(path.join(ctx.dir(), 'view', 'rejected.json')).rejected, []);
  ledgerOk(ctx.root);
});

test('T2 intake twice with nothing changed: the second run stores nothing, appends no line, exit 0', () => {
  const ctx = setup();
  std(ctx, { review: true });
  doIntake(ctx, 0);
  const ledgerBefore = fs.readFileSync(ledgerPath(ctx.root), 'utf8');
  const idsBefore = storedIds(ctx.root);
  const j = doIntake(ctx, 0);
  assert.equal(j.result.stored.filter((x) => x.created).length, 0, 'nothing newly created');
  assert.deepEqual(storedIds(ctx.root), idsBefore);
  assert.equal(fs.readFileSync(ledgerPath(ctx.root), 'utf8'), ledgerBefore, 'no ledger line appended');
  assert.deepEqual(j.ledger_seq, []);
  ledgerOk(ctx.root);
});

test('T3 a card with a status field, a 16-word quote, schema_version 2 and truncated JSON are rejected with their codes; the valid file is stored; exit 1', () => {
  const ctx = setup();
  const a = fixture('_card-a.json');
  ctx.stage('cards/ok.card.json', a);
  ctx.stage('cards/status.card.json', { ...fixture('_card-b.json'), status: 'confirmed' });
  ctx.stage('cards/long.card.json', { ...fixture('_card-b.json'), quote: SIX });
  ctx.stage('cards/v2.card.json', { ...fixture('_card-b.json'), schema_version: 2 });
  ctx.stage('cards/trunc.card.json', '{"schema_version":1,"kind":"card","fie');
  const j = doIntake(ctx, 1);
  const want = [
    'staging/cards/long.card.json|schema-invalid',
    'staging/cards/status.card.json|schema-invalid',
    'staging/cards/trunc.card.json|unparseable',
    'staging/cards/v2.card.json|schema-version',
  ];
  assert.deepEqual(rejectedOf(ctx), want);
  assert.deepEqual(storedIds(ctx.root), [objId('c', a)], 'only the valid card is stored');
  const lines = ledgerKind(ctx.root, 'intake');
  assert.equal(lines.length, 1);
  assert.deepEqual(lineRejected(lines[0]), want);
  assert.equal(j.result.stored.length, 1);
  ledgerOk(ctx.root);
});

test('T4 uncited fact, cite outside the pack, unsorted cards and a review of an unknown pack are rejected; nothing stored for them', () => {
  const ctx = setup();
  const a = fixture('_card-a.json');
  const b = fixture('_card-b.json');
  const A = objId('c', a);
  const B = objId('c', b);
  ctx.stage('cards/a.card.json', a);
  ctx.stage('cards/b.card.json', b);
  ctx.stage('packs/uncited.json', mkPackFor(ctx, [A], [sent('s1', [])]));
  ctx.stage('packs/outside.json', mkPackFor(ctx, [A], [sent('s1', [B])]));
  const unsorted = mkPackFor(ctx, [A, B], []);
  unsorted.cards = [A, B].sort().reverse();
  ctx.stage('packs/unsorted.json', unsorted);
  ctx.stage('review.json', mkReviewFor('p_0123456789abcdef', [A]));
  doIntake(ctx, 1);
  assert.deepEqual(rejectedOf(ctx), [
    'staging/packs/outside.json|cite-outside-pack',
    'staging/packs/uncited.json|uncited-fact',
    'staging/packs/unsorted.json|not-sorted',
    'staging/review.json|fk-pack',
  ]);
  assert.deepEqual(storedIds(ctx.root), [A, B].sort(), 'only the two cards are stored');
  ledgerOk(ctx.root);
});

test('T5 scope-outside, scope-dropped, a number matching the card (no flag) and number-uncited: flags on stored objects', () => {
  const ctx = setup();
  const a = fixture('_card-a.json');
  const A = objId('c', a);
  ctx.stage('cards/a.card.json', a);
  const full = { task: ['refactor'], model_family: ['synthetic-m'], language: ['python'] };
  const pA = mkPackFor(ctx, [A], [sent('s1', [A], { applies_to: { ...full, language: ['go'] } })]);
  const pB = mkPackFor(ctx, [A], [sent('s1', [A], { applies_to: { task: ['refactor'], language: ['python'] } })]);
  const pC = mkPackFor(ctx, [A], [sent('s1', [A], { text: 'Throughput rose 12.5% on refactoring tasks.' })]);
  const pD = mkPackFor(ctx, [A], [sent('s1', [A], { text: 'Throughput rose 14% on refactoring tasks.' })]);
  ctx.stage('packs/a.json', pA);
  ctx.stage('packs/b.json', pB);
  ctx.stage('packs/c.json', pC);
  ctx.stage('packs/d.json', pD);
  const j = doIntake(ctx, 0);
  const ids = [A, ...[pA, pB, pC, pD].map((p) => objId('p', p))].sort();
  assert.deepEqual(storedIds(ctx.root), ids, 'flagged objects are still stored');
  const lines = ledgerKind(ctx.root, 'intake');
  assert.equal(lines.length, 1);
  const flags = lines[0].data.flagged.map((x) => `${x.id}|${x.sid}|${x.code}`).sort();
  assert.deepEqual(flags, [
    `${objId('p', pA)}|s1|scope-outside`,
    `${objId('p', pB)}|s1|scope-dropped`,
    `${objId('p', pD)}|s1|number-uncited`,
  ].sort());
  assert.equal(j.result.flagged.length, 3);
  assert.deepEqual(lines[0].data.rejected, []);
  ledgerOk(ctx.root);
});

test('T6 a session card whose url is in no transcript is rejected; the url inside a helper tool result is accepted (origin session); a harvested file has origin harvested', () => {
  const ctx = setup({ urls: [A_URL] });
  const a = fixture('_card-a.json');
  const b = fixture('_card-b.json');
  const c = fixture('_card-c.json');
  const A = objId('c', a);
  const B = objId('c', b);
  const C = objId('c', c);
  ctx.stage('cards/a.card.json', a);
  ctx.stage('cards/b.card.json', b);
  // 1. b's url is in no transcript
  const j1 = doIntake(ctx, 1);
  assert.deepEqual(rejectedOf(ctx), ['staging/cards/b.card.json|url-not-in-transcript']);
  assert.deepEqual(storedIds(ctx.root), [A]);
  assert.equal(j1.result.stored[0].origin, 'session');
  // 2. the same url inside a helper's tool result
  const h = transcript(SESSION, ctx.dir(), { sidechain: true });
  const [tid] = h.call({ tools: [{ name: 'WebFetch', input: { url: 'https://example.test/other', prompt: 'read' } }] });
  h.result(tid, 'fetched page that links to ' + B_URL + ' for more detail');
  h.write(helperTranscriptPath(ctx.root, SESSION, 'h1'));
  const j2 = doIntake(ctx, 0);
  assert.deepEqual(storedIds(ctx.root), [A, B].sort());
  assert.equal(j2.result.stored.find((x) => x.id === B).origin, 'session');
  // 3. a file under staging/harvested has origin harvested (its url is in no transcript and is not checked)
  ctx.stage(`harvested/${C}.card.json`, canon(c));
  const j3 = doIntake(ctx, 0);
  assert.equal(j3.result.stored.find((x) => x.id === C).origin, 'harvested');
  assert.deepEqual(storedIds(ctx.root), [A, B, C].sort());
  const lines = ledgerKind(ctx.root, 'intake');
  assert.equal(lines.length, 3);
  assert.deepEqual(lines[0].data.objects.map((x) => `${x.id}|${x.origin}`), [`${A}|session`]);
  assert.deepEqual(lines[1].data.objects.map((x) => `${x.id}|${x.origin}`), [`${B}|session`], 'only ids not listed before');
  assert.deepEqual(lines[2].data.objects.map((x) => `${x.id}|${x.origin}`), [`${C}|harvested`]);
  assert.ok(C_URL && !fs.readFileSync(mainTranscriptPath(ctx.root, SESSION), 'utf8').includes(C_URL));
  ledgerOk(ctx.root);
});

test('T7 supersedes without a reason, a reason without supersedes, and a missing target are rejected; a resolvable supersession is accepted', () => {
  const ctx = setup();
  const a = fixture('_card-a.json');
  const A = objId('c', a);
  const mk = (mods) => ({ ...fixture('_card-b.json'), ...mods });
  const noReason = mk({ supersedes: A });
  const missing = mk({ measured: { ...fixture('_card-b.json').measured, value: 31 }, supersedes: 'c_00000000000000aa', supersede_reason: 'wrong-number' });
  const reasonOnly = mk({ measured: { ...fixture('_card-b.json').measured, value: 33 }, supersede_reason: 'wrong-number' });
  const good = mk({ measured: { ...fixture('_card-b.json').measured, value: 32 }, supersedes: A, supersede_reason: 'wrong-number' });
  ctx.stage('cards/a.card.json', a);
  ctx.stage('cards/noreason.card.json', noReason);
  ctx.stage('cards/missing.card.json', missing);
  ctx.stage('cards/reasononly.card.json', reasonOnly);
  ctx.stage('cards/good.card.json', good);
  doIntake(ctx, 1);
  assert.deepEqual(rejectedOf(ctx), [
    'staging/cards/missing.card.json|supersedes-missing',
    'staging/cards/noreason.card.json|supersede-reason',
    'staging/cards/reasononly.card.json|supersede-reason',
  ]);
  assert.deepEqual(storedIds(ctx.root), [A, objId('c', good)].sort());
  ledgerOk(ctx.root);
});

test('T8 a cite s_0123456789abcdef: exit 3 seed-id, nothing stored, incident line', () => {
  const ctx = setup();
  const a = fixture('_card-a.json');
  const A = objId('c', a);
  ctx.stage('cards/a.card.json', a);
  ctx.stage('pack.json', mkPackFor(ctx, [A], [sent('s1', ['s_0123456789abcdef'])]));
  const j = doIntake(ctx, 3);
  assertFirstReason(j, 'seed-id');
  assert.deepEqual(storedIds(ctx.root), [], 'nothing is stored, the valid card included');
  const inc = ledgerKind(ctx.root, 'incident');
  assert.equal(inc.length, 1, 'one incident line');
  assert.equal(inc[0].data.class, 'refusal');
  assert.equal(inc[0].data.detail.tamper, true);
  assert.equal(inc[0].data.detail.code, 'seed-id');
  assert.ok(['commit', 'commit.mjs'].includes(inc[0].data.detail.script));
  ledgerOk(ctx.root);
});

test('T9 staging replaced by a junction to a folder outside the attempt: exit 3 untrusted-path, nothing stored', (t) => {
  const ctx = setup();
  const outside = path.join(ctx.root, 'outside-staging');
  fs.mkdirSync(path.join(outside, 'cards'), { recursive: true });
  fs.writeFileSync(path.join(outside, 'cards', 'a.card.json'), JSON.stringify(fixture('_card-a.json')));
  fs.rmSync(path.join(ctx.dir(), 'staging'), { recursive: true, force: true });
  if (!makeJunction(outside, path.join(ctx.dir(), 'staging'))) return t.skip('cannot create a junction on this machine');
  const j = doIntake(ctx, 3);
  assertFirstReason(j, 'untrusted-path');
  assert.deepEqual(storedIds(ctx.root), []);
  assert.deepEqual(listFiles(outside), ['cards/a.card.json'], 'nothing was written behind the junction');
  if (exists(ledgerPath(ctx.root))) ledgerOk(ctx.root);
});

test('T10 --epoch 1 when the row is at 2: exit 65, zombie-write line with the old attempt tokens, no object stored', () => {
  const ctx = setup({ epoch: 2, twoEpochs: true });
  const a = fixture('_card-a.json');
  // staging of the stale attempt (epoch 1), as a zombie session would have left it
  fs.mkdirSync(path.join(ctx.dir(1), 'staging', 'cards'), { recursive: true });
  fs.writeFileSync(path.join(ctx.dir(1), 'staging', 'cards', 'a.card.json'), JSON.stringify(a));
  const j = doIntake(ctx, 65, [], { epoch: 1 });
  assert.equal(j.code, 'stale-epoch');
  assert.deepEqual(storedIds(ctx.root), []);
  const z = ledgerKind(ctx.root, 'zombie-write');
  assert.equal(z.length, 1);
  assert.equal(z[0].data.epoch_seen, 1);
  assert.equal(z[0].data.tokens, 200, 'the stale attempt transcript total: 100 + 50 + 20 + 30');
  ledgerOk(ctx.root);
});

test('T11 stale --ce exits 64 and writes nothing; a held run.lock exits 75; an unparseable tasks.json exits 67 and leaves tasks.json.prev alone', () => {
  // (a) --ce 1 with coord.json at ce 2
  const a1 = setup({ ce: 1, coordCe: 2 });
  std(a1);
  const before1 = snapshot(a1.root);
  const j1 = doIntake(a1, 64);
  assert.equal(j1.code, 'stale-ce');
  assert.deepEqual(snapshot(a1.root), before1, 'nothing written');
  // (b) run.lock held by a live process
  const b = setup();
  std(b);
  const lock = holdLock(b.root);
  try {
    const before = snapshot(b.root);
    const j = doIntake(b, 75);
    assert.equal(j.code, 'lock-busy');
    assert.deepEqual(snapshot(b.root), before, 'nothing written, the lock file untouched');
  } finally { lock.release(); }
  // (c) tasks.json unparseable
  const c = setup();
  std(c);
  fs.writeFileSync(path.join(c.root, 'run', 'tasks.json'), '{ this is not json');
  fs.writeFileSync(path.join(c.root, 'run', 'tasks.json.prev'), '{"schema_version":1,"rev":0,"tasks":[]}');
  const before3 = snapshot(c.root);
  const j3 = doIntake(c, 67);
  assert.equal(j3.code, 'table-corrupt');
  assert.deepEqual(snapshot(c.root), before3, 'tasks.json and tasks.json.prev untouched, nothing else written');
});

test('T12 --dry-run: the result of T1 with dry_run true, no object, no ledger line, no rejected.json', () => {
  const ctx = setup();
  const s = std(ctx, { review: true });
  const before = snapshot(ctx.root);
  const j = doIntake(ctx, 0, ['--dry-run']);
  assert.equal(j.dry_run, true);
  assert.deepEqual(j.result.stored.map((x) => x.id).sort(), [s.A, s.P, s.R].sort());
  assert.deepEqual(snapshot(ctx.root), before, 'no file written at all');
  assert.ok(!exists(ledgerPath(ctx.root)));
  assert.ok(!exists(path.join(ctx.dir(), 'view', 'rejected.json')));
  assert.deepEqual(storedIds(ctx.root), []);
});

test('T13 record after intake, a passing fsck line and a clean audit line: commit record as 3.11, row commits.pack, commit line, row committed, exit 0', () => {
  const { ctx, s } = prepared();
  const j = doRecord(ctx, 0);
  const bytes = fs.readFileSync(commitPath(ctx.root));
  const rec = JSON.parse(bytes);
  const outputs = [{ id: s.A, kind: 'card', sha256: sha(canon(s.a)) }, { id: s.P, kind: 'pack', sha256: sha(canon(s.pack)) }].sort((x, y) => (x.id < y.id ? -1 : 1));
  assert.deepEqual(rec, { schema_version: 1, task: TASK, step: 'pack', epoch: 1, step_key: ctx.manifest.sha, outputs, outputs_sha: sha(canon(outputs)) });
  const row = readTable(ctx.root).tasks[0];
  assert.equal(row.commits.pack, sha(bytes));
  assert.equal(row.state, 'committed');
  const lines = ledgerKind(ctx.root, 'commit');
  assert.equal(lines.length, 1);
  assert.equal(lines[0].data.step, 'pack');
  assert.equal(lines[0].data.outputs_sha, rec.outputs_sha);
  assert.equal(lines[0].data.n, 2);
  assert.equal(lines[0].data.git, null);
  assert.equal(j.result.n, 2);
  assert.equal(j.result.outputs_sha, rec.outputs_sha);
  assert.equal(j.result.state, 'committed');
  assert.equal(j.result.git, null);
  assert.equal(j.result.record_sha, sha(bytes));
  assert.deepEqual(j.ledger_seq, [lines[0].seq]);
  ledgerOk(ctx.root);
});

test('T14 record repeated: exit 0, no second commit line; a torn commit is completed; different outputs for an existing record exit 1 commit-differs', () => {
  const { ctx } = prepared();
  doRecord(ctx, 0);
  const recBytes = fs.readFileSync(commitPath(ctx.root), 'utf8');
  const rowSha = readTable(ctx.root).tasks[0].commits.pack;
  // repeat
  doRecord(ctx, 0);
  assert.equal(ledgerKind(ctx.root, 'commit').length, 1, 'no second commit line');
  assert.equal(fs.readFileSync(commitPath(ctx.root), 'utf8'), recBytes);
  // torn commit: the record file is there, the row entry and the commit line are not
  const dropCommit = () => {
    const lines = fs.readFileSync(ledgerPath(ctx.root), 'utf8').split('\n').filter(Boolean);
    assert.equal(JSON.parse(lines[lines.length - 1]).kind, 'commit', 'the commit line is the last line');
    fs.writeFileSync(ledgerPath(ctx.root), lines.slice(0, -1).join('\n') + '\n');
    const t = readTable(ctx.root);
    t.tasks[0].commits = {};
    t.tasks[0].state = 'active';
    fs.writeFileSync(path.join(ctx.root, 'run', 'tasks.json'), JSON.stringify(t, null, 2));
  };
  dropCommit();
  assert.equal(ledgerKind(ctx.root, 'commit').length, 0);
  doRecord(ctx, 0);
  const row = readTable(ctx.root).tasks[0];
  assert.equal(row.commits.pack, rowSha, 'the row entry is set again');
  assert.equal(row.state, 'committed');
  assert.equal(ledgerKind(ctx.root, 'commit').length, 1, 'the commit line is set again');
  // different outputs for an existing record
  dropCommit();
  const rec = JSON.parse(recBytes);
  const fewer = { ...rec, outputs: [rec.outputs[0]], outputs_sha: sha(canon([rec.outputs[0]])) };
  fs.writeFileSync(commitPath(ctx.root), canon(fewer));
  const j = doRecord(ctx, 1);
  assertFirstReason(j, 'commit-differs');
  assert.equal(ledgerKind(ctx.root, 'commit').length, 0);
  assert.deepEqual(readTable(ctx.root).tasks[0].commits, {});
  ledgerOk(ctx.root);
});

test('T15 record with no READY exits 2 no-ready; a READY of epoch 1 in the epoch-2 folder exits 1 ready-mismatch; READY step review with --step pack is accepted', () => {
  const noReady = prepared({ skipReady: true });
  assertFirstReason(doRecord(noReady.ctx, 2), 'no-ready');
  assert.ok(!exists(commitPath(noReady.ctx.root)));

  const wrongEpoch = prepared({ setup: { epoch: 2, twoEpochs: true }, readyOver: { epoch: 1 } });
  assertFirstReason(doRecord(wrongEpoch.ctx, 1), 'ready-mismatch');
  assert.ok(!exists(commitPath(wrongEpoch.ctx.root)));

  const later = prepared({ setup: { steps: ['pack', 'review'] }, review: true, readyStep: 'review' });
  doRecord(later.ctx, 0, 'pack');
  assert.ok(exists(commitPath(later.ctx.root, 'pack')));
  ledgerOk(later.ctx.root);
});

test('T16 record --step review before pack is recorded: exit 1 step-order', () => {
  const { ctx } = prepared({ setup: { steps: ['pack', 'review'] }, review: true, readyStep: 'review' });
  const j = doRecord(ctx, 1, 'review');
  assertFirstReason(j, 'step-order');
  assert.ok(!exists(commitPath(ctx.root, 'review')));
  assert.deepEqual(readTable(ctx.root).tasks[0].commits, {});
});

test('T17 no fsck line after the last intake, or a later failing one, exits 6 fsck-stale; a new staging file exits 6 intake-new and appends an intake line', () => {
  const none = prepared({ skipFsck: true });
  const j1 = doRecord(none.ctx, 6);
  assert.equal(j1.code, 'deferred');
  assertFirstReason(j1, 'fsck-stale');

  const old = prepared({ fsckFirst: true });
  assertFirstReason(doRecord(old.ctx, 6), 'fsck-stale');

  const failing = prepared();
  addFsck(failing.ctx, 'fail');
  assertFirstReason(doRecord(failing.ctx, 6), 'fsck-stale');
  assert.ok(!exists(commitPath(failing.ctx.root)));

  const fresh = prepared();
  const b = fixture('_card-b.json');
  const B = objId('c', b);
  fresh.ctx.stage('cards/b.card.json', b);
  const linesBefore = ledgerKind(fresh.ctx.root, 'intake').length;
  const j4 = doRecord(fresh.ctx, 6);
  assertFirstReason(j4, 'intake-new');
  const lines = ledgerKind(fresh.ctx.root, 'intake');
  assert.equal(lines.length, linesBefore + 1, 'the record call ran the intake pass and logged it');
  assert.deepEqual(lines[lines.length - 1].data.objects.map((x) => x.id), [B]);
  assert.ok(!exists(commitPath(fresh.ctx.root)));
  ledgerOk(fresh.ctx.root);
});

test('T18 a pack card with no status exits 6 cards-pending; with status rejected exits 1 untrusted-cards (id listed); an unverifiable card is accepted', () => {
  const { ctx, s } = prepared({ skipStatus: true });
  assertFirstReason(doRecord(ctx, 6), 'cards-pending');
  addStatus(ctx.root, objRef(ctx.root, s.A), 'rejected', { reason: 'quote-missing' });
  const j = doRecord(ctx, 1);
  assertFirstReason(j, 'untrusted-cards');
  assert.ok(JSON.stringify(j.reasons).includes(s.A), 'the rejected card id is listed');
  assert.ok(!exists(commitPath(ctx.root)));
  addStatus(ctx.root, objRef(ctx.root, s.A), 'unverifiable', { reason: 'no-snapshot' });
  doRecord(ctx, 0);
  assert.ok(exists(commitPath(ctx.root)));
  ledgerOk(ctx.root);
});

test('T19 a stored object whose bytes were altered on disk before record: exit 3 object-mismatch', () => {
  const { ctx, s } = prepared();
  // the staging files are gone, so the intake pass of record has nothing to re-store
  fs.rmSync(path.join(ctx.dir(), 'staging', 'cards', 'a.card.json'));
  fs.rmSync(path.join(ctx.dir(), 'staging', 'pack.json'));
  fs.writeFileSync(objectPath(ctx.root, s.A), canon({ ...s.a, quote: 'altered quote of the card' }));
  const j = doRecord(ctx, 3);
  assert.equal(j.code, 'tamper');
  assertFirstReason(j, 'object-mismatch');
  assert.ok(!exists(commitPath(ctx.root)));
  assert.equal(ledgerKind(ctx.root, 'commit').length, 0);
});

test('T20 with git init in the root: record exits 0, the commit line has git null, no new git commit; the ledger verifies', (t) => {
  if (!GIT_OK) return t.skip('git is not installed');
  const { ctx } = prepared();
  const head = gitInitCommit(ctx.root, ['tcb']);
  const count = () => git(ctx.root, ['rev-list', '--count', 'HEAD']).stdout.trim();
  assert.equal(count(), '1');
  doRecord(ctx, 0);
  const lines = ledgerKind(ctx.root, 'commit');
  assert.equal(lines.length, 1);
  assert.equal(lines[0].data.git, null);
  assert.equal(git(ctx.root, ['rev-parse', 'HEAD']).stdout.trim(), head, 'HEAD did not move');
  assert.equal(count(), '1', 'no commit was made');
  ledgerOk(ctx.root);
});

test('T21 no audit line, or one older than the last intake line, exits 6 audit-missing; a tainted one exits 1 tainted; a clean one passes', () => {
  const none = prepared({ skipAudit: true });
  const j1 = doRecord(none.ctx, 6);
  assert.equal(j1.code, 'deferred');
  assertFirstReason(j1, 'audit-missing');
  addAudit(none.ctx, 'clean');
  doRecord(none.ctx, 0);
  assert.ok(exists(commitPath(none.ctx.root)), 'a clean audit passes this step');

  const old = prepared({ auditFirst: true });
  addFsck(old.ctx); // fresh fsck; the only audit line is older than the intake
  assertFirstReason(doRecord(old.ctx, 6), 'audit-missing');

  const tainted = prepared({ auditLabel: 'tainted' });
  const j3 = doRecord(tainted.ctx, 1);
  assertFirstReason(j3, 'tainted');
  assert.ok(!exists(commitPath(tainted.ctx.root)));
  ledgerOk(tainted.ctx.root);
});

test('T22 a pack over the capacity without an index exits 1 pack-over-capacity; with an index it is accepted; a confirmed card cut from the pack exits 1 confirmed-card-cut', () => {
  const params = { W_quality: 1000, child_prefix_tokens: 100, review_reserve_tokens: 100 }; // cap = 800
  const longPack = (index) => (ctx, A) => {
    const text = Array.from({ length: 15 }, () => 'alpha beta gamma delta').join(' '); // 60 words
    const sentences = Array.from({ length: 12 }, (_, i) => sent('s' + (i + 1), [A], { text }));
    return mkPackFor(ctx, [A], sentences, index ? { index: [{ mechanism: 'cache_prefix', summary: 'a cached prefix helps', cards: [A] }] } : {});
  };
  const over = prepared({ setup: { params }, pack: longPack(false) });
  const j = doRecord(over.ctx, 1);
  assertFirstReason(j, 'pack-over-capacity');
  const expected = Math.ceil((Buffer.byteLength(canon(over.s.pack)) + Buffer.byteLength(canon(over.s.a))) / 4);
  const detail = j.reasons.find((x) => x.code === 'pack-over-capacity').detail;
  assert.equal(detail.cap, 800);
  assert.equal(detail.tokens, expected);
  assert.ok(detail.tokens > detail.cap);
  assert.ok(!exists(commitPath(over.ctx.root)));

  const indexed = prepared({ setup: { params }, pack: longPack(true) });
  doRecord(indexed.ctx, 0);
  assert.ok(exists(commitPath(indexed.ctx.root)), 'the same pack with an index is accepted');

  // a confirmed card of the field that the pack leaves out
  const cut = prepared({
    extra: (ctx) => { ctx.stage('cards/b.card.json', fixture('_card-b.json')); assert.equal(ctx.intake().exit, 0); },
  });
  const B = objId('c', fixture('_card-b.json'));
  addStatus(cut.ctx.root, objRef(cut.ctx.root, B), 'confirmed', { reason: 'ok', witness_seq: 1 });
  addFsck(cut.ctx);
  addAudit(cut.ctx);
  const jc = doRecord(cut.ctx, 1);
  assertFirstReason(jc, 'confirmed-card-cut');
  assert.ok(JSON.stringify(jc.reasons).includes(B), 'the cut card id is listed');
  assert.ok(!exists(commitPath(cut.ctx.root)));

  // the same card superseded by a card that is in the pack is not cut
  const sup = setup();
  const a = fixture('_card-a.json');
  const b = fixture('_card-b.json');
  const c2 = { ...fixture('_card-b.json'), measured: { ...fixture('_card-b.json').measured, value: 28 }, supersedes: objId('c', b), supersede_reason: 'wrong-number' };
  const A = objId('c', a);
  const B2 = objId('c', b);
  const C2 = objId('c', c2);
  sup.stage('cards/a.card.json', a);
  sup.stage('cards/b.card.json', b);
  sup.stage('cards/c.card.json', c2);
  sup.stage('pack.json', mkPackFor(sup, [A, C2], [sent('s1', [A])]));
  assert.equal(sup.intake().exit, 0);
  addStatus(sup.root, objRef(sup.root, A), 'witnessed', { witness_seq: 1 });
  addStatus(sup.root, objRef(sup.root, B2), 'confirmed', { reason: 'ok', witness_seq: 1 });
  addStatus(sup.root, objRef(sup.root, C2), 'witnessed', { witness_seq: 1 });
  addFsck(sup);
  addAudit(sup);
  writeReady(sup);
  doRecord(sup, 0);
  assert.ok(exists(commitPath(sup.root)));
});

test('T23 a pack whose questions_sha differs from the frozen protocol is rejected questions-sha at intake (also with no frozen protocol)', () => {
  const ctx = setup();
  const a = fixture('_card-a.json');
  const A = objId('c', a);
  ctx.stage('cards/a.card.json', a);
  ctx.stage('pack.json', mkPackFor(ctx, [A], [sent('s1', [A])], { questions_sha: sha(canon(['f1-alpha-01'])) }));
  doIntake(ctx, 1);
  assert.deepEqual(rejectedOf(ctx), ['staging/pack.json|questions-sha']);
  assert.deepEqual(storedIds(ctx.root), [A]);

  const bare = setup({ freeze: false });
  bare.stage('cards/a.card.json', a);
  bare.stage('pack.json', mkPackFor(bare, [A], [sent('s1', [A])]));
  doIntake(bare, 1);
  assert.deepEqual(rejectedOf(bare), ['staging/pack.json|questions-sha']);
  ledgerOk(ctx.root);
});

test('T24 intake writes view/committed.json with every accepted id, kind and file; a second intake adding one object lists both', () => {
  const ctx = setup();
  const a = fixture('_card-a.json');
  const b = fixture('_card-b.json');
  const A = objId('c', a);
  const B = objId('c', b);
  ctx.stage('cards/a.card.json', a);
  doIntake(ctx, 0);
  const one = committedOf(ctx);
  assert.equal(one.task, TASK);
  assert.equal(one.epoch, 1);
  assert.deepEqual(one.committed, [{ id: A, kind: 'card', file: 'staging/cards/a.card.json' }]);
  ctx.stage('cards/b.card.json', b);
  doIntake(ctx, 0);
  const two = committedOf(ctx).committed.slice().sort((x, y) => (x.id < y.id ? -1 : 1));
  assert.deepEqual(two, [{ id: A, kind: 'card', file: 'staging/cards/a.card.json' }, { id: B, kind: 'card', file: 'staging/cards/b.card.json' }].sort((x, y) => (x.id < y.id ? -1 : 1)));
  ledgerOk(ctx.root);
});

test('T25 a junction and a hard-linked file inside staging/cards are rejected untrusted-path and never read', (t) => {
  const ctx = setup();
  const a = fixture('_card-a.json');
  const A = objId('c', a);
  ctx.stage('cards/a.card.json', a);
  const outside = path.join(ctx.root, 'outside');
  fs.mkdirSync(path.join(outside, 'dir'), { recursive: true });
  fs.writeFileSync(path.join(outside, 'dir', 'c.card.json'), JSON.stringify(fixture('_card-c.json')));
  fs.writeFileSync(path.join(outside, 'b.json'), JSON.stringify(fixture('_card-b.json')));
  fs.linkSync(path.join(outside, 'b.json'), path.join(ctx.dir(), 'staging', 'cards', 'hl.card.json'));
  if (!makeJunction(path.join(outside, 'dir'), path.join(ctx.dir(), 'staging', 'cards', 'linkdir'))) return t.skip('cannot create a junction on this machine');
  doIntake(ctx, 1);
  const bad = rejectedOf(ctx);
  assert.equal(bad.length, 2, 'two rejections: ' + JSON.stringify(bad));
  assert.ok(bad.some((x) => x.includes('linkdir') && x.endsWith('|untrusted-path')), 'junction rejected');
  assert.ok(bad.some((x) => x.includes('hl.card.json') && x.endsWith('|untrusted-path')), 'hard link rejected');
  assert.deepEqual(storedIds(ctx.root), [A], 'nothing behind a link was read or stored');
  ledgerOk(ctx.root);
});

// ---- exit codes named in the spec that no numbered behaviour covers ----

test('X1 a card whose url cannot be checked because no transcript exists: exit 2, the card is left unstored, result.not_run', () => {
  const ctx = setup({ transcript: false });
  std(ctx);
  const j = doIntake(ctx, 2);
  assert.equal(j.code, 'not-run');
  assert.ok(!storedIds(ctx.root).includes(objId('c', fixture('_card-a.json'))), 'the unverifiable card is not stored');
  assert.ok(j.result.not_run, 'result.not_run lists the cards left unstored');
});

test('X2 record --step for a step the row does not list: exit 1 step-not-listed', () => {
  const { ctx } = prepared();
  assertFirstReason(doRecord(ctx, 1, 'review'), 'step-not-listed');
  assert.ok(!exists(commitPath(ctx.root, 'review')));
});

test('X3 two packs in the outputs of a pack step: exit 1 pack-count', () => {
  const { ctx, s } = prepared({
    extra: (c, std1) => {
      c.stage('packs/second.json', mkPackFor(c, [std1.A], [sent('s1', [std1.A], { text: 'A cached prefix is the second pack of the same cards.' })]));
      assert.equal(c.intake().exit, 0);
    },
  });
  assert.ok(s.P);
  addFsck(ctx);
  addAudit(ctx);
  assertFirstReason(doRecord(ctx, 1), 'pack-count');
  assert.ok(!exists(commitPath(ctx.root)));
});

test('X4 a review step with no review object among the intake outputs: exit 1 no-outputs', () => {
  const { ctx } = prepared({ setup: { steps: ['pack', 'review'] }, readyStep: 'review' });
  doRecord(ctx, 0, 'pack');
  assertFirstReason(doRecord(ctx, 1, 'review'), 'no-outputs');
  assert.ok(!exists(commitPath(ctx.root, 'review')));
  ledgerOk(ctx.root);
});

// ---- needs the app ----

test('N1 a real reader url appears in the child or helper transcript in the 4.8 shape', { skip: 'needs the app: CONTRACT 7 item 7, real transcripts' }, () => {});
