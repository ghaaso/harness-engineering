// harvest.mjs tests, written from spec/harvest.mjs.md and CONTRACT.md only (the script's code was not read).
// One test per behaviour, named with its id (T1..T15 of the spec). Each test builds its own run root under
// tcb-build/tmp, runs `node tcb/scripts/harvest.mjs` as a child process and checks the exit code, the one JSON
// line on stdout and the files. Fixtures: tcb/fixtures/harvest/_card-<n>.json (synthetic cards).
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_NAME = 'harvest';
const RUN_PREFIX = 'tcbhv-';
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
  const r = spawnSync(process.execPath, [path.join(TCB, script + '.mjs'), ...argv], { cwd: root, encoding: 'utf8', windowsHide: true, shell: false, timeout: 180000, maxBuffer: 64 << 20 });
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
// harvest specific helpers
// ---------------------------------------------------------------------------------------------
const SIX = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen'; // 16 words
const cardN = (n) => fixture(`_card-${n}.json`);

// A run root with an active attempt of TASK bound to SESSION (session: null = a row with no session).
function setupH(o = {}) {
  const epoch = o.epoch ?? 1;
  const ce = o.ce ?? 1;
  const root = makeRoot({ ce: o.coordCe ?? ce });
  const session = o.session === undefined ? SESSION : o.session;
  const attempts = o.twoEpochs
    ? [mkAttempt(TASK, 1, { session: SESSION, stop: 'confirmed' }), mkAttempt(TASK, 2, { session: SESSION2 })]
    : [mkAttempt(TASK, epoch, { session: session ?? undefined })];
  const rowSession = o.twoEpochs ? SESSION2 : session ?? undefined;
  writeTasks(root, [mkRow({ epoch, session: rowSession, attempts, step: session === null ? 'admitted' : 'bound' })]);
  for (const a of attempts) fs.mkdirSync(rd(root, `${a.folder}/staging`), { recursive: true });
  const dir = (e = epoch) => rd(root, `wt/${TASK}-e${e}`);
  const ctx = {
    root, epoch, ce, dir, session: session ?? SESSION,
    harvested: (e = epoch) => path.join(dir(e), 'staging', 'harvested'),
    // the session's own transcript; fn(builder) adds records
    main(fn = (b) => b.call({ text: 'nothing to report' }), sessionId = ctx.session) {
      const b = transcript(sessionId, dir());
      fn(b);
      b.write(mainTranscriptPath(root, sessionId));
      return b;
    },
    helper(name, fn, sessionId = ctx.session, wopts) {
      const b = transcript(sessionId, dir(), { sidechain: true });
      fn(b);
      b.write(helperTranscriptPath(root, sessionId, name), wopts);
      return b;
    },
    run(extra = [], over = {}) {
      return run('harvest', ['--root', root, '--ce', String(over.ce ?? ce), '--task', TASK, '--epoch', String(over.epoch ?? epoch), '--now', NOW, ...extra], root);
    },
  };
  return ctx;
}
const go = (ctx, exit, extra = [], over = {}) => shape(ctx.run(extra, over), 'harvest', exit, null);
const cardFiles = (ctx, e) => listFiles(ctx.harvested(e)).filter((f) => f.endsWith('.card.json'));
const harvestedBytes = (ctx, id) => fs.readFileSync(path.join(ctx.harvested(), `${id}.card.json`), 'utf8');
const idOf = (c) => objId('c', c);

// ---------------------------------------------------------------------------------------------
// Behaviours (spec/harvest.mjs.md "Behaviours")
// ---------------------------------------------------------------------------------------------

test('T1 a helper structured_output attachment holding a valid card: harvested/<c_id>.card.json holds the canonical bytes, exit 0, written has the id', () => {
  const ctx = setupH();
  const c = cardN(1);
  ctx.main();
  ctx.helper('h1', (b) => { b.call({ text: 'done' }); b.structured(c); });
  const j = go(ctx, 0);
  const id = idOf(c);
  assert.match(id, /^c_[0-9a-f]{16}$/);
  assert.deepEqual(j.result.written, [id]);
  assert.equal(j.result.session, SESSION);
  assert.deepEqual(cardFiles(ctx), [`${id}.card.json`]);
  assert.equal(harvestedBytes(ctx, id), canon(c), 'the file holds the canonical bytes of the card');
  assert.deepEqual(j.ledger_seq, []);
  assert.ok(!exists(ledgerPath(ctx.root)) || readLedger(ctx.root).length === 0, 'harvest appends no ledger line');
});

test('T2 the same card as a StructuredOutput tool-use input in the helper and as an Agent result JSON text in the parent: one file, candidates 2', () => {
  const ctx = setupH();
  const c = cardN(1);
  ctx.main((b) => {
    const [tid] = b.call({ tools: [{ name: 'Agent', input: { subagent_type: 'reader', description: 'read sources', prompt: 'read the sources' } }] });
    b.result(tid, JSON.stringify(c));
  });
  ctx.helper('h1', (b) => { b.call({ tools: [{ name: 'StructuredOutput', input: c }] }); });
  const j = go(ctx, 0);
  const id = idOf(c);
  assert.equal(j.result.candidates, 2);
  assert.equal(j.result.written.length, 1);
  assert.deepEqual(j.result.written, [id]);
  assert.deepEqual(cardFiles(ctx), [`${id}.card.json`]);
});

test('T3 a reader result {cards: [a, b]}: two files', () => {
  const ctx = setupH();
  const a = cardN(1);
  const b = cardN(2);
  ctx.main();
  ctx.helper('h1', (x) => { x.call({ text: 'done' }); x.structured({ schema_version: 1, cards: [a, b], skipped: [] }); });
  const j = go(ctx, 0);
  assert.deepEqual([...j.result.written].sort(), [idOf(a), idOf(b)].sort());
  assert.deepEqual(cardFiles(ctx), [`${idOf(a)}.card.json`, `${idOf(b)}.card.json`].sort());
  assert.equal(harvestedBytes(ctx, idOf(a)), canon(a));
  assert.equal(harvestedBytes(ctx, idOf(b)), canon(b));
});

test('T4 a rerun with nothing new: no file changed, already 1, exit 0', () => {
  const ctx = setupH();
  const c = cardN(1);
  ctx.main();
  ctx.helper('h1', (b) => { b.call({ text: 'done' }); b.structured(c); });
  go(ctx, 0);
  const file = path.join(ctx.harvested(), `${idOf(c)}.card.json`);
  const before = { bytes: fs.readFileSync(file, 'utf8'), mtime: fs.statSync(file).mtimeMs };
  const j = go(ctx, 0);
  assert.equal(j.result.already, 1);
  assert.deepEqual(j.result.written, []);
  assert.equal(fs.readFileSync(file, 'utf8'), before.bytes);
  assert.equal(fs.statSync(file).mtimeMs, before.mtime, 'the file was not touched');
  assert.deepEqual(cardFiles(ctx), [`${idOf(c)}.card.json`]);
});

test('T5 a 16-word quote, a string measured.value and a status field are invalid and not written; a valid fourth card is written; exit 1', () => {
  const ctx = setupH();
  const longQuote = { ...cardN(1), quote: SIX };
  const strValue = { ...cardN(2), measured: { ...cardN(2).measured, value: '12' } };
  const withStatus = { ...cardN(3), status: 'confirmed' };
  const good = cardN(4);
  ctx.main();
  ctx.helper('h1', (b) => {
    b.call({ text: 'done' });
    for (const c of [longQuote, strValue, withStatus, good]) b.structured(c);
  });
  const j = go(ctx, 1);
  assert.equal(j.code, 'fail');
  assert.equal(j.result.invalid.length, 3);
  for (const x of j.result.invalid) {
    assert.ok(Array.isArray(x.errors) && x.errors.length > 0, 'each invalid card lists its schema errors');
    assert.ok(x.source && 'file' in x.source && 'line' in x.source, 'each invalid card names its source');
  }
  assert.deepEqual(j.result.written, [idOf(good)]);
  assert.deepEqual(cardFiles(ctx), [`${idOf(good)}.card.json`]);
});

test('T6 an Agent result whose text is not JSON and a structured result that is an array of numbers: unparseable 2, exit 1', () => {
  const ctx = setupH();
  ctx.main((b) => {
    const [tid] = b.call({ tools: [{ name: 'Agent', input: { subagent_type: 'reader', description: 'read', prompt: 'read' } }] });
    b.result(tid, 'these are plain words and not json at all');
  });
  ctx.helper('h1', (b) => { b.call({ text: 'done' }); b.structured([1, 2, 3]); });
  const j = go(ctx, 1);
  assert.equal(j.result.unparseable, 2);
  assert.deepEqual(j.result.written, []);
  assert.deepEqual(cardFiles(ctx), []);
});

test('T7 a card without schema_version is invalid (nothing added); a card with extra whitespace in the quote is written as given', () => {
  const noVersion = setupH();
  const c = cardN(1);
  delete c.schema_version;
  noVersion.main();
  noVersion.helper('h1', (b) => { b.call({ text: 'done' }); b.structured(c); });
  const j1 = go(noVersion, 1);
  assert.equal(j1.result.invalid.length, 1);
  assert.deepEqual(cardFiles(noVersion), []);

  const spaced = setupH();
  const q = '  throughput   rose  by   12.5 percent  ';
  const w = { ...cardN(2), quote: q };
  spaced.main();
  spaced.helper('h1', (b) => { b.call({ text: 'done' }); b.structured(w); });
  const j2 = go(spaced, 0);
  const id = idOf(w);
  assert.deepEqual(j2.result.written, [id]);
  assert.equal(JSON.parse(harvestedBytes(spaced, id)).quote, q, 'no trimming');
  assert.equal(harvestedBytes(spaced, id), canon(w));
});

test('T8 a row with no session for the epoch exits 2 no-session, nothing written; a session with no transcript exits 2 transcript-missing', () => {
  const noSession = setupH({ session: null });
  const before = snapshot(noSession.root);
  const j1 = go(noSession, 2);
  assert.equal(j1.code, 'not-run');
  assertFirstReason(j1, 'no-session');
  assert.deepEqual(snapshot(noSession.root), before);
  assert.ok(!exists(noSession.harvested()));

  const noTranscript = setupH();
  const before2 = snapshot(noTranscript.root);
  const j2 = go(noTranscript, 2);
  assertFirstReason(j2, 'transcript-missing');
  assert.deepEqual(snapshot(noTranscript.root), before2);
  assert.ok(!exists(noTranscript.harvested()));
});

test('T9 a transcript with a torn last line: the complete lines are harvested, exit 0', () => {
  const ctx = setupH();
  const c = cardN(1);
  ctx.main();
  ctx.helper('h1', (b) => { b.call({ text: 'done' }); b.structured(c); }, SESSION, { torn: '{"type":"attachment","attachment":{"type":"structured_ou' });
  const j = go(ctx, 0);
  assert.deepEqual(j.result.written, [idOf(c)]);
  assert.deepEqual(cardFiles(ctx), [`${idOf(c)}.card.json`]);
});

test('T10 --epoch 1 with the row at 2 exits 65; a stale --ce exits 64; a held run.lock exits 75; an unparseable tasks.json exits 67; nothing written', () => {
  const card = cardN(1);
  const withCard = (ctx, session) => {
    ctx.main(undefined, session);
    ctx.helper('h1', (b) => { b.call({ text: 'done' }); b.structured(card); }, session);
  };
  // 65: the row is at epoch 2
  const e = setupH({ epoch: 2, twoEpochs: true });
  withCard(e, SESSION);
  withCard(e, SESSION2);
  const beforeE = snapshot(e.root);
  const j1 = go(e, 65, [], { epoch: 1 });
  assert.equal(j1.code, 'stale-epoch');
  assert.deepEqual(snapshot(e.root), beforeE);
  assert.deepEqual(readLedger(e.root).filter((l) => l.kind === 'zombie-write'), [], 'harvest writes no zombie-write line');
  // 64
  const c = setupH({ coordCe: 2 });
  withCard(c);
  const beforeC = snapshot(c.root);
  const j2 = go(c, 64);
  assert.equal(j2.code, 'stale-ce');
  assert.deepEqual(snapshot(c.root), beforeC);
  assert.ok(!exists(c.harvested()));
  // 75
  const l = setupH();
  withCard(l);
  const lock = holdLock(l.root);
  try {
    const beforeL = snapshot(l.root);
    const j3 = go(l, 75);
    assert.equal(j3.code, 'lock-busy');
    assert.deepEqual(snapshot(l.root), beforeL);
    assert.ok(!exists(l.harvested()));
  } finally { lock.release(); }
  // 67
  const t = setupH();
  withCard(t);
  fs.writeFileSync(path.join(t.root, 'run', 'tasks.json'), '{ not json');
  const beforeT = snapshot(t.root);
  const j4 = go(t, 67);
  assert.equal(j4.code, 'table-corrupt');
  assert.deepEqual(snapshot(t.root), beforeT);
  assert.ok(!exists(t.harvested()));
});

test('T11 staging/harvested a junction out of the attempt, a junction inside it, or a hard link inside it: exit 3 untrusted-path, nothing written', (t) => {
  const card = cardN(1);
  const prep = () => {
    const ctx = setupH();
    ctx.main();
    ctx.helper('h1', (b) => { b.call({ text: 'done' }); b.structured(card); });
    const outside = path.join(ctx.root, 'outside');
    fs.mkdirSync(outside, { recursive: true });
    return { ctx, outside };
  };
  // `planted` = the card files the test itself put there (the hard link of case c); nothing beyond them may appear
  const refused = (ctx, planted = []) => {
    const j = go(ctx, 3);
    assert.equal(j.code, 'tamper');
    assertFirstReason(j, 'untrusted-path');
    assert.deepEqual(cardFiles(ctx), planted);
    const inc = ledgerKind(ctx.root, 'incident');
    assert.equal(inc.length, 1, 'the tamper incident line');
    assert.equal(inc[0].data.detail.tamper, true);
    assert.equal(inc[0].data.detail.code, 'untrusted-path');
    verifyLedger(readLedger(ctx.root));
  };
  // (a) harvested itself is a junction to a folder outside the attempt
  const a = prep();
  if (!makeJunction(a.outside, path.join(a.ctx.dir(), 'staging', 'harvested'))) return t.skip('cannot create a junction on this machine');
  refused(a.ctx);
  assert.deepEqual(listFiles(a.outside), [], 'nothing was written behind the junction');
  // (b) a junction inside harvested
  const b = prep();
  fs.mkdirSync(b.ctx.harvested(), { recursive: true });
  assert.ok(makeJunction(b.outside, path.join(b.ctx.harvested(), 'j')));
  refused(b.ctx);
  assert.deepEqual(listFiles(b.outside), []);
  // (c) a hard-linked file inside harvested
  const c = prep();
  fs.mkdirSync(c.ctx.harvested(), { recursive: true });
  fs.writeFileSync(path.join(c.outside, 'x.json'), '{"synthetic":true}');
  fs.linkSync(path.join(c.outside, 'x.json'), path.join(c.ctx.harvested(), 'x.card.json'));
  refused(c.ctx, ['x.card.json']);
  assert.equal(fs.readFileSync(path.join(c.outside, 'x.json'), 'utf8'), '{"synthetic":true}', 'the hard-linked file is untouched');
});

test('T12 a file already at harvested/<c_id>.card.json with other bytes: exit 3 harvested-differs', () => {
  const ctx = setupH();
  const c = cardN(1);
  ctx.main();
  ctx.helper('h1', (b) => { b.call({ text: 'done' }); b.structured(c); });
  fs.mkdirSync(ctx.harvested(), { recursive: true });
  const target = path.join(ctx.harvested(), `${idOf(c)}.card.json`);
  const other = canon({ ...c, quote: 'another quote of five words' });
  fs.writeFileSync(target, other);
  const j = go(ctx, 3);
  assert.equal(j.code, 'tamper');
  assertFirstReason(j, 'harvested-differs');
  assert.equal(fs.readFileSync(target, 'utf8'), other, 'the foreign file is left as it was');
});

test('T13 --dry-run: the result lists what would be written, dry_run true, no folder or file created', () => {
  const ctx = setupH();
  const c = cardN(1);
  ctx.main();
  ctx.helper('h1', (b) => { b.call({ text: 'done' }); b.structured(c); });
  const before = snapshot(ctx.root);
  const j = go(ctx, 0, ['--dry-run']);
  assert.equal(j.dry_run, true);
  assert.deepEqual(j.result.written, [idOf(c)]);
  assert.ok(!exists(ctx.harvested()), 'no harvested folder');
  assert.deepEqual(snapshot(ctx.root), before);
});

test('T14 stdout is one JSON line per 1.3 on every exit (0, 1, 2, 64, 65); stderr is only for people', () => {
  const c = cardN(1);
  const valid = (ctx, session) => {
    ctx.main(undefined, session);
    ctx.helper('h1', (b) => { b.call({ text: 'done' }); b.structured(c); }, session);
  };
  const ok = setupH();
  valid(ok);
  const r0 = ok.run();
  shape(r0, 'harvest', 0, null);
  const bad = setupH();
  bad.main();
  bad.helper('h1', (b) => { b.call({ text: 'done' }); b.structured([1]); });
  shape(bad.run(), 'harvest', 1, null);
  shape(setupH({ session: null }).run(), 'harvest', 2, null);
  const stale = setupH({ coordCe: 2 });
  valid(stale);
  shape(stale.run(), 'harvest', 64, null);
  const epoch = setupH({ epoch: 2, twoEpochs: true });
  valid(epoch, SESSION);
  valid(epoch, SESSION2);
  const r65 = epoch.run([], { epoch: 1 });
  shape(r65, 'harvest', 65, null);
  for (const r of [r0, r65]) {
    for (const line of r.stderr.split('\n').filter((l) => l.trim())) {
      let machine = false;
      try { const v = JSON.parse(line); machine = !!v && typeof v === 'object' && 'exit' in v && 'script' in v; } catch { /* free text for people */ }
      assert.ok(!machine, 'the machine line belongs on stdout, not stderr');
    }
  }
});

test('T15 a reader result with skipped is accepted; an object with cards but no schema_version is unparseable', () => {
  const ok = setupH();
  const a = cardN(1);
  ok.main();
  ok.helper('h1', (b) => { b.call({ text: 'done' }); b.structured({ schema_version: 1, cards: [a], skipped: [{ url: 'https://example.test/blocked', reason: 'blocked' }] }); });
  const j1 = go(ok, 0);
  assert.deepEqual(j1.result.written, [idOf(a)]);
  assert.deepEqual(cardFiles(ok), [`${idOf(a)}.card.json`]);

  const bad = setupH();
  bad.main();
  bad.helper('h1', (b) => { b.call({ text: 'done' }); b.structured({ cards: [cardN(2)] }); });
  const j2 = go(bad, 1);
  assert.equal(j2.result.unparseable, 1);
  assert.deepEqual(j2.result.written, []);
  assert.deepEqual(cardFiles(bad), []);
});

// ---- result fields the spec lists that no numbered behaviour covers ----

test('X1 zero candidates exits 0; a foreign file in harvested is reported in result.foreign and never removed', () => {
  const ctx = setupH();
  ctx.main();
  ctx.helper('h1', (b) => { b.call({ text: 'nothing structured here' }); });
  fs.mkdirSync(ctx.harvested(), { recursive: true });
  fs.writeFileSync(path.join(ctx.harvested(), 'junk.txt'), 'not a card');
  const j = go(ctx, 0);
  assert.deepEqual(j.result.written, []);
  assert.ok(j.result.foreign.includes('junk.txt'));
  assert.equal(fs.readFileSync(path.join(ctx.harvested(), 'junk.txt'), 'utf8'), 'not a card');
});

// ---- needs the app ----

test('N1 a real reader schema-checked result is a StructuredOutput input or a structured_output attachment in its helper transcript below <session>/subagents/', { skip: 'needs the app: CONTRACT 7 item 7, real transcripts' }, () => {});
test('N2 the harness schema retry of a helper result', { skip: 'needs the app: CONTRACT 7 item 8' }, () => {});

// Review U2-F2: commit does not check the URL of a harvested card (R34), so the session's own structured
// output (its own claim) must never become a harvested card; a helper's result still does.
test('X2 the session own StructuredOutput input and own structured_output attachment are no candidates; a helper result is still harvested', () => {
  const ctx = setupH();
  const own = cardN(1);
  const helperCard = cardN(2);
  ctx.main((b) => {
    b.call({ tools: [{ name: 'StructuredOutput', input: own }] });
    b.structured({ schema_version: 1, cards: [own], skipped: [] });
  });
  ctx.helper('h1', (b) => { b.call({ text: 'done' }); b.structured(helperCard); });
  const j = go(ctx, 0);
  assert.deepEqual(j.result.written, [idOf(helperCard)]);
  assert.equal(j.result.candidates, 1, 'only the helper result is a candidate');
  assert.deepEqual(cardFiles(ctx), [`${idOf(helperCard)}.card.json`]);
});
