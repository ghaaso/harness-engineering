// fsck.mjs tests, written from spec/fsck.mjs.md and CONTRACT.md only (the script's code was not read).
// One test per behaviour, named with its id (T1..T17 of the spec). Each test builds its own run root under
// tcb-build/tmp (with its own git repository where the tcb check needs one), runs `node tcb/scripts/fsck.mjs`
// as a child process and checks the exit code, the one JSON line on stdout, the `fsck` ledger line and the files.
// Fixtures: tcb/fixtures/fsck/_card.json, _agent-reader.md, _settings.json (synthetic).
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_NAME = 'fsck';
const RUN_PREFIX = 'tcbfs-';
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
// fsck specific helpers
// ---------------------------------------------------------------------------------------------
const FIELD_IDS = ['f1-alpha-01', 'f1-alpha-02'];
const sentence = (cites) => ({ sid: 's1', approach_id: 'cache_prefix', measure: 'throughput', kind: 'fact', text: 'A cached prefix raised throughput on refactoring tasks.', cites, applies_to: { task: ['refactor'], model_family: ['synthetic-m'], language: ['python'] } });

// A run root that passes every check: a card, a pack and a review in the store, one commit record with its row, a
// promote-logged status line, a witness-logged witness line, a frozen protocol, a git repository whose commit
// holds tcb/, and one attempt folder whose .claude/ matches its row and manifest.
function baseline(o = {}) {
  const root = makeRoot({ ce: 1, params: o.params });
  const readerBytes = fixtureText('_agent-reader.md');
  fs.mkdirSync(path.join(root, 'tcb', 'agents'), { recursive: true });
  fs.writeFileSync(path.join(root, 'tcb', 'agents', 'reader.md'), readerBytes);
  const card = fixture('_card.json');
  const A = putObj(root, card);
  const pack = { schema_version: 1, kind: 'pack', field: 'f1', questions_sha: sha(canon([...FIELD_IDS].sort())), cards: [A.id], conclusions: [sentence([A.id])], not_covered: [] };
  const P = putObj(root, pack);
  const review = {
    schema_version: 1, kind: 'review', field: 'f1', task: TASK, pack: P.id, sentences: [sentence([A.id])],
    verdicts: [{ approach_id: 'cache_prefix', verdict: 'promising', supports: ['s1'] }], dismissals: [], our_work_findings: [],
  };
  const Rv = putObj(root, review);
  // the attempt folder
  const settings = fixtureText('_settings.json');
  const dirRel = `wt/${TASK}-e1`;
  for (const d of ['.claude/agents', 'staging', 'view']) fs.mkdirSync(rd(root, `${dirRel}/${d}`), { recursive: true });
  fs.writeFileSync(rd(root, `${dirRel}/.claude/settings.json`), settings);
  fs.writeFileSync(rd(root, `${dirRel}/.claude/agents/reader.md`), readerBytes);
  const manifest = putObj(root, mkManifest(TASK, 1, ['pack'], { agents: [{ type: 'reader', sha256: sha(readerBytes) }] }));
  // commit record and row
  const rec = commitRecordOf(TASK, 'pack', 1, manifest.sha, [{ id: A.id, kind: 'card', sha: A.sha }, { id: P.id, kind: 'pack', sha: P.sha }]);
  const recBytes = canon(rec);
  const recSha = sha(recBytes);
  const commitFile = path.join(root, 'store', 'commits', `${TASK}.pack.json`);
  if (o.commitFile !== false) fs.writeFileSync(commitFile, recBytes);
  const rowCommitted = o.commitRow !== false;
  const attempt = mkAttempt(TASK, 1, { session: SESSION, manifest: manifest.id, settingsSha: sha(settings) });
  writeTasks(root, [mkRow({ session: SESSION, attempts: [attempt], state: rowCommitted ? 'committed' : 'active', commits: rowCommitted ? { pack: recSha } : {} })]);
  // status and witness lines
  for (const seq of o.statusSeqs ?? [1]) addStatus(root, A, 'witnessed', { seq, witness_seq: 1 });
  for (const seq of o.witnessSeqs ?? [1]) addWitness(root, A, { seq });
  // ledger: protocol-freeze, intake, witness, promote, commit (five lines by default)
  const fz = freezeProtocol(root, mkProtocol());
  addLedger(root, 'intake', { objects: [{ id: A.id, kind: 'card', origin: 'session' }, { id: P.id, kind: 'pack', origin: 'session' }, { id: Rv.id, kind: 'review', origin: 'session' }], rejected: [], flagged: [] }, { task: TASK, epoch: 1, writer: 'commit' });
  for (const [f, l] of o.witnessRanges ?? [[1, 1]]) addLedger(root, 'witness', { counts: { witnessed: l - f + 1, rejected: 0, unverifiable: 0 }, first_seq: f, last_seq: l }, { writer: 'witness' });
  for (const [f, l] of o.promoteRanges ?? [[1, 1]]) addLedger(root, 'promote', { mode: 'witness', first_seq: f, last_seq: l }, { writer: 'promote' });
  if (o.commitLine !== false) addLedger(root, 'commit', { step: 'pack', outputs_sha: rec.outputs_sha, n: 2, git: null }, { task: TASK, epoch: 1, writer: 'commit' });
  // git: the commit the owner names holds tcb/
  let tcbCommit = 'a'.repeat(40);
  if (o.git !== false) {
    assert.ok(GIT_OK, 'git is needed for this test');
    tcbCommit = gitInitCommit(root, ['tcb']);
  }
  writeJ(path.join(root, 'run', 'coord.json'), { schema_version: 1, ce: 1, started_at: NOW, tcb_commit: tcbCommit });
  const ctx = {
    root, card, A, P, Rv, manifest, rec, recBytes, commitFile, fz, settings, readerBytes, dirRel, tcbCommit,
    attemptDir: rd(root, dirRel),
    run(extra = [], over = {}) {
      return run('fsck', ['--root', root, '--ce', String(over.ce ?? 1), '--now', NOW, ...extra], root);
    },
  };
  return ctx;
}
const go = (ctx, exit, extra = [], over = {}) => shape(ctx.run(extra, over), 'fsck', exit, null);
const lastFsck = (root) => ledgerKind(root, 'fsck').at(-1);
const failingOf = (j) => j.result.failing;
const hasFail = (j, check, code, id) => failingOf(j).some((f) => f.check === check && f.code === code && (id === undefined || f.id === id));
function assertFail(j, check, code, id) {
  assert.ok(hasFail(j, check, code, id), `expected failing {${check}, ${id ?? '*'}, ${code}}, got ${JSON.stringify(failingOf(j))}`);
}
const hasAnomaly = (j, code) => j.result.anomalies.some((a) => a.code === code);
const ledgerBytes = (root) => (exists(ledgerPath(root)) ? fs.readFileSync(ledgerPath(root), 'utf8') : '');
function editLedgerLine(root, seq, fn) {
  const p = ledgerPath(root);
  const lines = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  fn(lines[seq - 1]);
  fs.writeFileSync(p, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
}
const rewriteStatus = (root, fn) => {
  const lines = readJsonl(statusPath(root));
  fn(lines);
  fs.writeFileSync(statusPath(root), lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
};
const readTableFile = (root) => readJ(path.join(root, 'run', 'tasks.json'));
function addCut(root) {
  const bytes = 'synthetic design cut, one line of text\n';
  const h = sha(bytes);
  const rel = `completeness/cut-${h.slice(0, 12)}.md`;
  fs.writeFileSync(rd(root, rel), bytes);
  addLedger(root, 'cut', { sha: h }, { writer: 'gate' });
  return { rel, bytes };
}
function runAsync(argv, root) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(TCB, 'fsck.mjs'), ...argv], { cwd: root, windowsHide: true, shell: false });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('close', (code) => {
      const lines = out.split('\n').filter((l) => l.trim());
      let json = null;
      if (lines.length === 1) { try { json = JSON.parse(lines[0]); } catch { json = null; } }
      resolve({ exit: code, stdout: out, stderr: err, lines, json });
    });
  });
}

// ---------------------------------------------------------------------------------------------
// Behaviours (spec/fsck.mjs.md "Behaviours")
// ---------------------------------------------------------------------------------------------

test('T1 a complete root with a git repository holding tcb/: exit 0, the fsck line says pass', (t) => {
  if (!GIT_OK) return t.skip('git is not installed');
  const ctx = baseline();
  const before = readLedger(ctx.root).length;
  const j = go(ctx, 0);
  assert.deepEqual(failingOf(j), []);
  assert.deepEqual(j.result.anomalies, []);
  for (const k of ['objects', 'commits', 'ledger', 'fk', 'status', 'tcb', 'claude', 'frozen']) assert.ok(k in j.result.checks, `result.checks.${k}`);
  assert.equal(typeof j.result.head_checked.seq, 'number');
  const lines = readLedger(ctx.root);
  assert.equal(lines.length, before + 1, 'one line appended');
  const last = lines.at(-1);
  assert.equal(last.kind, 'fsck');
  assert.equal(last.data.result, 'pass');
  assert.deepEqual(last.data.failing, []);
  assert.deepEqual(j.ledger_seq, [last.seq]);
  verifyLedger(lines);
});

test('T2 one object byte changed (still parseable), or non-canonical whitespace: exit 3 object-mismatch, fsck line fail', (t) => {
  if (!GIT_OK) return t.skip('git is not installed');
  const edited = baseline();
  fs.writeFileSync(objectPath(edited.root, edited.A.id), canon({ ...edited.card, quote: 'a different quote of the card' }));
  const j1 = go(edited, 3);
  assert.equal(j1.code, 'tamper');
  assertFail(j1, 'objects', 'object-mismatch', edited.A.id);
  assert.equal(lastFsck(edited.root).data.result, 'fail');
  assert.ok(lastFsck(edited.root).data.failing.some((f) => f.code === 'object-mismatch'));
  verifyLedger(readLedger(edited.root));

  const spaced = baseline();
  fs.writeFileSync(objectPath(spaced.root, spaced.P.id), JSON.stringify(readJ(objectPath(spaced.root, spaced.P.id)), null, 2));
  const j2 = go(spaced, 3);
  assertFail(j2, 'objects', 'object-mismatch', spaced.P.id);
  assert.equal(lastFsck(spaced.root).data.result, 'fail');
});

test('T3 s_0123456789abcdef.json in store/objects: exit 3 seed-id', (t) => {
  if (!GIT_OK) return t.skip('git is not installed');
  const ctx = baseline();
  fs.writeFileSync(path.join(ctx.root, 'store', 'objects', 's_0123456789abcdef.json'), '{}');
  const j = go(ctx, 3);
  assertFail(j, 'objects', 'seed-id', 's_0123456789abcdef');
  assert.equal(lastFsck(ctx.root).data.result, 'fail');
});

test('T4 a leftover c_x.json.123.abcd1234.tmp: exit 0, anomaly stray-file', (t) => {
  if (!GIT_OK) return t.skip('git is not installed');
  const ctx = baseline();
  fs.writeFileSync(path.join(ctx.root, 'store', 'objects', 'c_x.json.123.abcd1234.tmp'), '{"half":');
  const j = go(ctx, 0);
  assert.ok(hasAnomaly(j, 'stray-file'), JSON.stringify(j.result.anomalies));
  assert.deepEqual(failingOf(j), []);
  assert.equal(lastFsck(ctx.root).data.result, 'pass');
});

test('T5 a commit record naming an output whose bytes differ: exit 3 commit-mismatch; a record file with no row entry and no commit line: exit 0, anomaly commit-torn', (t) => {
  if (!GIT_OK) return t.skip('git is not installed');
  const bad = baseline();
  const rec = JSON.parse(bad.recBytes);
  rec.outputs[0].sha256 = 'f'.repeat(64);
  rec.outputs_sha = sha(canon(rec.outputs)); // the record stays self-consistent; only the output bytes disagree
  const bytes = canon(rec);
  fs.writeFileSync(bad.commitFile, bytes);
  const table = readTableFile(bad.root);
  table.tasks[0].commits.pack = sha(bytes);
  fs.writeFileSync(path.join(bad.root, 'run', 'tasks.json'), JSON.stringify(table, null, 2));
  const j1 = go(bad, 3);
  assertFail(j1, 'commits', 'commit-mismatch');
  assert.equal(lastFsck(bad.root).data.result, 'fail');

  const torn = baseline({ commitRow: false, commitLine: false });
  const j2 = go(torn, 0);
  assert.ok(hasAnomaly(j2, 'commit-torn'), JSON.stringify(j2.result.anomalies));
  assert.deepEqual(failingOf(j2), []);
  assert.equal(lastFsck(torn.root).data.result, 'pass');
});

test('T6 ledger line 3 of 5 edited: exit 3 ledger-broken at 3, the fsck line is appended after line 5; a tail line edited: exit 3, no line appended', (t) => {
  if (!GIT_OK) return t.skip('git is not installed');
  const mid = baseline();
  assert.equal(readLedger(mid.root).length, 5);
  editLedgerLine(mid.root, 3, (l) => { l.data.counts.witnessed = 99; }); // hash not recomputed
  const j1 = go(mid, 3);
  assert.ok(failingOf(j1).some((f) => f.check === 'ledger' && f.code === 'ledger-broken' && String(f.id) === '3'), JSON.stringify(failingOf(j1)));
  const lines = readLedger(mid.root);
  assert.equal(lines.length, 6, 'the fsck line is appended');
  assert.equal(lines[5].kind, 'fsck');
  assert.equal(lines[5].prev, lines[4].hash, 'appended after line 5');
  const { hash, ...rest } = lines[5];
  assert.equal(hash, sha(lines[5].prev + canon(rest)));
  assert.equal(lines[5].data.result, 'fail');

  const tail = baseline();
  editLedgerLine(tail.root, 5, (l) => { l.data.n = 3; });
  const before = ledgerBytes(tail.root);
  const j2 = go(tail, 3);
  assert.ok(JSON.stringify(j2).includes('ledger-broken'), 'the broken tail is named');
  assert.equal(ledgerBytes(tail.root), before, 'no line appended');
  assert.deepEqual(j2.ledger_seq, []);
});

test('T7 a review naming a pack that is not stored, or a status line for an absent card: exit 3 fk-missing', (t) => {
  if (!GIT_OK) return t.skip('git is not installed');
  const rev = baseline();
  const orphan = putObj(rev.root, { ...readJ(objectPath(rev.root, rev.Rv.id)), pack: 'p_00000000000000ff' });
  const j1 = go(rev, 3);
  assertFail(j1, 'fk', 'fk-missing');
  assert.ok(JSON.stringify(failingOf(j1)).includes(orphan.id) || failingOf(j1).some((f) => f.code === 'fk-missing'));

  const st = baseline({ statusSeqs: [1, 2], promoteRanges: [[1, 2]] });
  rewriteStatus(st.root, (lines) => { lines[1].card_id = 'c_00000000000000ff'; });
  const j2 = go(st, 3);
  assertFail(j2, 'fk', 'fk-missing');
  assert.equal(lastFsck(st.root).data.result, 'fail');
});

test('T8 status line 4 with promote lines covering 1-3, a seq gap, and a card_sha differing from the object: exit 3', (t) => {
  if (!GIT_OK) return t.skip('git is not installed');
  const unlogged = baseline({ statusSeqs: [1, 2, 3, 4], promoteRanges: [[1, 3]] });
  assertFail(go(unlogged, 3), 'status', 'status-unlogged');

  const gap = baseline({ statusSeqs: [1, 2, 4], promoteRanges: [[1, 4]] });
  assertFail(go(gap, 3), 'status', 'status-unlogged');

  const changed = baseline();
  rewriteStatus(changed.root, (lines) => { lines[0].card_sha = 'e'.repeat(64); });
  assertFail(go(changed, 3), 'status', 'card-changed');
});

test('T9 a card object named by no intake line: exit 0, anomaly object-unlogged', (t) => {
  if (!GIT_OK) return t.skip('git is not installed');
  const ctx = baseline();
  const extra = putObj(ctx.root, { ...ctx.card, quote: 'an extra card that no intake line names' });
  const j = go(ctx, 0);
  assert.ok(j.result.anomalies.some((a) => a.code === 'object-unlogged'), JSON.stringify(j.result.anomalies));
  assert.ok(JSON.stringify(j.result.anomalies).includes(extra.id));
  assert.deepEqual(failingOf(j), []);
  assert.equal(lastFsck(ctx.root).data.result, 'pass');
});

test('T10 an untracked file under tcb/, a tracked tcb file edited, or a commit absent from the repo: exit 3 tcb-differs / tcb-commit-unknown', (t) => {
  if (!GIT_OK) return t.skip('git is not installed');
  const added = baseline();
  fs.writeFileSync(path.join(added.root, 'tcb', 'extra-file.txt'), 'planted after the owner commit');
  const j1 = go(added, 3);
  assertFail(j1, 'tcb', 'tcb-differs');
  assert.ok(JSON.stringify(j1.result).includes('extra-file.txt'), 'the path is named');

  const edited = baseline();
  fs.appendFileSync(path.join(edited.root, 'tcb', 'thresholds.json'), '\n');
  assertFail(go(edited, 3), 'tcb', 'tcb-differs');

  const unknown = baseline();
  writeJ(path.join(unknown.root, 'run', 'coord.json'), { schema_version: 1, ce: 1, started_at: NOW, tcb_commit: 'b'.repeat(40) });
  assertFail(go(unknown, 3), 'tcb', 'tcb-commit-unknown');
});

test('T11 no .git: exit 2 not_run with failing empty and an fsck line not_run; no .git and a broken object: exit 3', () => {
  const ctx = baseline({ git: false });
  assert.ok(!exists(path.join(ctx.root, '.git')));
  const j = go(ctx, 2);
  assert.equal(j.code, 'not-run');
  assert.deepEqual(failingOf(j), []);
  assertReason(j, 'no-git');
  const last = lastFsck(ctx.root);
  assert.equal(last.data.result, 'not_run');
  assert.deepEqual(last.data.failing, []);
  verifyLedger(readLedger(ctx.root));

  const broken = baseline({ git: false });
  fs.writeFileSync(objectPath(broken.root, broken.A.id), canon({ ...broken.card, quote: 'a different quote of the card' }));
  const j2 = go(broken, 3);
  assertFail(j2, 'objects', 'object-mismatch', broken.A.id);
  assert.equal(lastFsck(broken.root).data.result, 'fail');
});

test('T12 .claude/ and auto-loaded files of an attempt folder: extra files, edited settings or agents, CLAUDE.md in any case, agents not in the manifest', (t) => {
  if (!GIT_OK) return t.skip('git is not installed');
  const ctx = baseline();
  const d = ctx.attemptDir;
  const w = (rel, text = 'planted') => { const p = path.join(d, ...rel.split('/')); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); return p; };
  const base = go(ctx, 0);
  assert.deepEqual(failingOf(base), [], 'agents/reader.md equal to tcb/agents/reader.md and listed in the manifest passes');
  const cases = [
    ['settings.local.json present', () => w('.claude/settings.local.json'), 'claude-extra'],
    ['settings.json edited', () => w('.claude/settings.json', '{"edited":true}'), 'settings-differs', () => w('.claude/settings.json', ctx.settings)],
    ['settings.json missing', () => fs.rmSync(path.join(d, '.claude', 'settings.json')), 'settings-missing', () => w('.claude/settings.json', ctx.settings)],
    ['staging/CLAUDE.md', () => w('staging/CLAUDE.md'), 'claude-extra'],
    ['staging/sub/claude.md', () => w('staging/sub/claude.md'), 'claude-extra'],
    ['staging/sub2/Claude.MD', () => w('staging/sub2/Claude.MD'), 'claude-extra'],
    ['agents/reader.md edited', () => w('.claude/agents/reader.md', 'edited agent'), 'agents-differs', () => w('.claude/agents/reader.md', ctx.readerBytes)],
    ['agents/other.md not in the manifest', () => w('.claude/agents/other.md'), 'claude-extra'],
    ['nested .claude folder', () => w('staging/deep/.claude/x.json', '{}'), 'claude-extra'],
  ];
  for (const [name, apply, code, restore] of cases) {
    apply();
    const j = go(ctx, 3);
    assert.ok(hasFail(j, 'claude', code), `${name}: expected claude/${code}, got ${JSON.stringify(failingOf(j))}`);
    if (restore) restore();
    // remove what the case planted so the next one starts from the baseline
    for (const rel of ['.claude/settings.local.json', 'staging/CLAUDE.md', 'staging/sub', 'staging/sub2', 'staging/deep', '.claude/agents/other.md']) {
      fs.rmSync(path.join(d, ...rel.split('/')), { recursive: true, force: true });
    }
  }
  assert.deepEqual(failingOf(go(ctx, 0)), [], 'after cleaning up, the folder passes again');
});

test('T13 an intake line appended by another writer while fsck runs, naming a corrupted object: exit 3 reports it', async (t) => {
  if (!GIT_OK) return t.skip('git is not installed');
  // The test plays the other writer: it holds run.lock (so fsck waits at phase 2), appends an intake line that names a
  // corrupted object, then releases. The outcome does not depend on whether the line lands before or after phase 1 read the
  // head (a fast phase 1 meets it in phase 2, a slow one in phase 1), so the delay below only raises the odds of overlap.
  const ctx = baseline({ params: { lock_retries: 400 } });
  const lock = holdLock(ctx.root);
  let r;
  try {
    const pending = runAsync(['--root', ctx.root, '--ce', '1', '--now', NOW], ctx.root);
    await new Promise((resolve) => setTimeout(resolve, 4000));
    const bad = { ...ctx.card, quote: 'a card that another writer corrupted' };
    const id = objId('c', bad);
    fs.writeFileSync(objectPath(ctx.root, id), JSON.stringify(bad, null, 2)); // parseable, not canonical
    addLedger(ctx.root, 'intake', { objects: [{ id, kind: 'card', origin: 'session' }], rejected: [], flagged: [] }, { task: TASK, epoch: 1, writer: 'commit' });
    fs.rmSync(path.join(ctx.root, 'run', 'run.lock'), { force: true });
    lock.release();
    r = await pending;
    const j = shape(r, 'fsck', 3, null);
    assertFail(j, 'objects', 'object-mismatch', id);
    assert.equal(lastFsck(ctx.root).data.result, 'fail');
    verifyLedger(readLedger(ctx.root));
  } finally { lock.release(); }
});

test('T14 a stale --ce exits 64 and no line; a busy lock exits 75; a corrupt tasks.json exits 67; --dry-run prints the result and appends no line', (t) => {
  if (!GIT_OK) return t.skip('git is not installed');
  const ctx = baseline();
  const before = ledgerBytes(ctx.root);
  // --dry-run on a passing root
  const jd = go(ctx, 0, ['--dry-run']);
  assert.equal(jd.dry_run, true);
  assert.ok('checks' in jd.result);
  assert.equal(ledgerBytes(ctx.root), before, 'no ledger line');
  // 75
  const lock = holdLock(ctx.root);
  try {
    const j = go(ctx, 75);
    assert.equal(j.code, 'lock-busy');
    assert.equal(ledgerBytes(ctx.root), before);
  } finally { lock.release(); fs.rmSync(path.join(ctx.root, 'run', 'run.lock'), { force: true }); }
  // 64
  writeJ(path.join(ctx.root, 'run', 'coord.json'), { schema_version: 1, ce: 2, started_at: NOW, tcb_commit: ctx.tcbCommit });
  const j64 = go(ctx, 64);
  assert.equal(j64.code, 'stale-ce');
  assert.equal(ledgerBytes(ctx.root), before);
  writeJ(path.join(ctx.root, 'run', 'coord.json'), { schema_version: 1, ce: 1, started_at: NOW, tcb_commit: ctx.tcbCommit });
  // 67
  fs.writeFileSync(path.join(ctx.root, 'run', 'tasks.json'), '{ not json');
  const j67 = go(ctx, 67);
  assert.equal(j67.code, 'table-corrupt');
  assert.equal(ledgerBytes(ctx.root), before);
});

test('T15 witness.jsonl seqs 1-4 with one witness ledger line covering 1-3: exit 3 status-unlogged', (t) => {
  if (!GIT_OK) return t.skip('git is not installed');
  const ctx = baseline({ witnessSeqs: [1, 2, 3, 4], witnessRanges: [[1, 3]] });
  const j = go(ctx, 3);
  assertFail(j, 'status', 'status-unlogged');
  assert.equal(lastFsck(ctx.root).data.result, 'fail');
});

test('T16 a byte changed in a frozen protocol or a cut file: exit 3 frozen-mismatch; a frozen file or cut named by a ledger line deleted: exit 3 frozen-missing', (t) => {
  if (!GIT_OK) return t.skip('git is not installed');
  const ctx = baseline();
  const cut = addCut(ctx.root);
  const protoPath = rd(ctx.root, ctx.fz.rel);
  const cutPath = rd(ctx.root, cut.rel);
  assert.deepEqual(failingOf(go(ctx, 0)), [], 'a consistent frozen file and cut pass');
  const protoBytes = fs.readFileSync(protoPath);
  const cutBytes = fs.readFileSync(cutPath);

  fs.writeFileSync(protoPath, Buffer.concat([protoBytes, Buffer.from(' ')]));
  assertFail(go(ctx, 3), 'frozen', 'frozen-mismatch');
  fs.writeFileSync(protoPath, protoBytes);

  fs.writeFileSync(cutPath, Buffer.concat([cutBytes, Buffer.from('x')]));
  assertFail(go(ctx, 3), 'frozen', 'frozen-mismatch');
  fs.writeFileSync(cutPath, cutBytes);

  fs.rmSync(protoPath);
  assertFail(go(ctx, 3), 'frozen', 'frozen-missing');
  fs.writeFileSync(protoPath, protoBytes);

  fs.rmSync(cutPath);
  assertFail(go(ctx, 3), 'frozen', 'frozen-missing');
  fs.writeFileSync(cutPath, cutBytes);

  assert.deepEqual(failingOf(go(ctx, 0)), []);
  verifyLedger(readLedger(ctx.root));
});

test('T17 a repository whose config sets core.hooksPath and core.fsmonitor to a script that writes a marker: fsck runs and the marker is never created', (t) => {
  if (!GIT_OK) return t.skip('git is not installed');
  const ctx = baseline();
  const marker = path.join(ctx.root, 'zz-marker.txt');
  const body = `#!/bin/sh\nprintf hit > "${fwd(marker)}"\nexit 0\n`;
  const hooks = path.join(ctx.root, 'zz-hooks');
  fs.mkdirSync(hooks, { recursive: true });
  for (const h of ['post-index-change', 'fsmonitor-watchman', 'pre-commit', 'reference-transaction', 'post-checkout', 'post-merge']) fs.writeFileSync(path.join(hooks, h), body);
  const fsmon = path.join(ctx.root, 'zz-fsmon.sh');
  fs.writeFileSync(fsmon, body);
  assert.equal(git(ctx.root, ['config', 'core.fsmonitor', fwd(fsmon)]).status, 0);
  assert.equal(git(ctx.root, ['config', 'core.hooksPath', fwd(hooks)]).status, 0);
  // Is the hazard live on this git? Run the same kind of read-only command without the hardening flags.
  spawnSync('git', ['-C', ctx.root, 'diff', '--quiet', ctx.tcbCommit, '--', 'tcb'], { encoding: 'utf8', windowsHide: true, timeout: 60000 });
  spawnSync('git', ['-C', ctx.root, 'status', '--porcelain'], { encoding: 'utf8', windowsHide: true, timeout: 60000 });
  t.diagnostic(`hazard live without hardening: ${exists(marker)}`);
  fs.rmSync(marker, { force: true });
  const j = go(ctx, 0);
  assert.deepEqual(failingOf(j), []);
  assert.ok(!exists(marker), 'the hook or fsmonitor script ran: the marker file exists');
});

// ---- spec steps that no numbered behaviour covers ----

test('X1 no coord.json: exit 2 no-coordinator and no ledger line', () => {
  const root = makeRoot({ ce: 1 });
  fs.rmSync(path.join(root, 'run', 'coord.json'));
  const j = shape(run('fsck', ['--root', root, '--ce', '1', '--now', NOW], root), 'fsck', 2, null);
  assert.equal(j.code, 'not-run');
  assertReason(j, 'no-coordinator');
  assert.ok(!exists(ledgerPath(root)) || readLedger(root).length === 0);
});

// Review U2-F7: promote appends its status lines and then its promote ledger line under the lock. A
// fsck whose phase 1 read the ledger before that line and the status file after the status lines must not
// report status-unlogged (a spurious tamper exit 3): phase 2 reads the status files again under the lock.
// The test plays promote: it holds run.lock, has a status line not yet covered, lets fsck run phase 1 and
// wait, appends the covering promote line, then releases.
test('X2 a promote line appended while fsck waits for the lock covers the status line phase 1 saw uncovered: exit 0 pass', async (t) => {
  if (!GIT_OK) return t.skip('git is not installed');
  const ctx = baseline({ statusSeqs: [1, 2], promoteRanges: [[1, 1]], params: { lock_retries: 400 } });
  const lock = holdLock(ctx.root);
  try {
    const pending = runAsync(['--root', ctx.root, '--ce', '1', '--now', NOW], ctx.root);
    await new Promise((resolve) => setTimeout(resolve, 4000));
    addLedger(ctx.root, 'promote', { mode: 'witness', first_seq: 2, last_seq: 2 }, { writer: 'promote' });
    fs.rmSync(path.join(ctx.root, 'run', 'run.lock'), { force: true });
    lock.release();
    const r = await pending;
    const j = shape(r, 'fsck', 0, null);
    assert.ok(!hasFail(j, 'status', 'status-unlogged'), JSON.stringify(failingOf(j)));
    assert.equal(lastFsck(ctx.root).data.result, 'pass');
    verifyLedger(readLedger(ctx.root));
  } finally { lock.release(); }
});
