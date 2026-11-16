// certify.mjs tests, written from spec/certify.mjs.md and CONTRACT.md only (the script's code was not read).
// One test per behaviour, named with its id. Each test builds its own run root under tcb-build/tmp.
// ==== COMMON HELPERS BEGIN (identical in tms, promote and certify tests) ====
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
// CONTRACT 1.4: one slug per exit code.
const EXIT_SLUG = { 0: 'ok', 1: 'fail', 2: 'not-run', 3: 'tamper', 5: 'ready-wins', 6: 'deferred', 10: 'reopened', 64: 'stale-ce', 65: 'stale-epoch', 66: 'usage', 67: 'table-corrupt', 70: 'internal', 75: 'lock-busy' };
const PREFIX = { card: 'c', pack: 'p', review: 'r', manifest: 'm', certificate: 'x' };

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
const fwd = (p) => p.split(path.sep).join('/');

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
  sleep_gap_ms: 600000, lock_retries: 300, allow_loopback: false, transcripts_root: 'C:/Users/User/.claude/projects',
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
after(() => {
  for (const r of ROOTS) {
    try { fs.rmSync(r, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); } catch { /* best effort */ }
  }
});
function writeTasks(root, rows, rev = 0) {
  fs.writeFileSync(path.join(root, 'run', 'tasks.json'), JSON.stringify({ schema_version: 1, rev, tasks: rows }, null, 2));
}
function makeRoot({ ce = 1, session, params = {}, tasks = [] } = {}) {
  fs.mkdirSync(TMP, { recursive: true });
  const root = fs.mkdtempSync(path.join(TMP, 'tst-'));
  ROOTS.push(root);
  for (const d of ['tcb', 'plan/frozen', 'plan/protocols', 'plan/our-work', 'run', 'store/objects', 'store/commits', 'store/status', 'views', 'queue', 'sealed/seeds', 'sealed/plants', 'wt', 'transcripts']) {
    fs.mkdirSync(path.join(root, d), { recursive: true });
  }
  for (const sub of ['schemas', 'profiles', 'settings', 'agents', 'briefs']) {
    const src = path.join(TCB, sub);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(root, 'tcb', sub), { recursive: true });
  }
  fs.writeFileSync(path.join(root, 'tcb', 'thresholds.json'), JSON.stringify(thresholdsFile({ transcripts_root: fwd(root) + '/transcripts', ...params }), null, 2));
  const coord = { schema_version: 1, ce, started_at: NOW, tcb_commit: 'a'.repeat(40) };
  if (session !== undefined) coord.session = session;
  fs.writeFileSync(path.join(root, 'run', 'coord.json'), JSON.stringify(coord, null, 2));
  writeTasks(root, tasks);
  return root;
}

// ---- jsonl, ledger (hash chain of CONTRACT 3.7) ----
function appendJsonl(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.appendFileSync(p, JSON.stringify(obj) + '\n');
}
function readJsonl(p) {
  if (!fs.existsSync(p)) return [];
  const out = [];
  for (const l of fs.readFileSync(p, 'utf8').split('\n')) {
    if (!l.trim()) continue;
    try { out.push(JSON.parse(l)); } catch { /* torn or bad line: skipped */ }
  }
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
  const line = { seq: lines.length + 1, prev, ts: NOW, ce: 1, writer: 'test-fixture', writer_sha: ZERO, kind };
  for (const [k, v] of Object.entries(extra)) if (v !== undefined) line[k] = v;
  line.data = data;
  line.hash = sha(prev + canon(line)); // hash covers the line without its own hash field
  appendJsonl(ledgerPath(root), line);
  return line.seq;
}

// ---- store objects, status, witness, commit records ----
function putObj(root, value) {
  const bytes = canon(value);
  const hex = sha(bytes);
  const id = PREFIX[value.kind] + '_' + hex.slice(0, 16);
  fs.writeFileSync(path.join(root, 'store', 'objects', id + '.json'), bytes);
  return { id, sha: hex, value };
}
const objectFiles = (root) => fs.readdirSync(path.join(root, 'store', 'objects'));
const statusPath = (root) => path.join(root, 'store', 'status', 'card_status.jsonl');
const statusLines = (root) => readJsonl(statusPath(root));
function addStatus(root, card, status, extra = {}) {
  const seq = statusLines(root).length + 1;
  const line = { seq, card_id: card.id, card_sha: card.sha, status, reason: extra.reason ?? 'ok', at: NOW };
  for (const k of ['witness_seq', 'check', 'classes']) if (extra[k] !== undefined) line[k] = extra[k];
  appendJsonl(statusPath(root), line);
  return seq;
}
const J_CARD = ['J1', 'J2', 'J4'];
const J_SENT = ['J1', 'J2', 'J3', 'J4'];
// a card the checker confirmed (witnessed first, then confirmed with a check record)
function confirm(root, card) {
  addStatus(root, card, 'witnessed', { witness_seq: 1 });
  return addStatus(root, card, 'confirmed', { reason: 'ok', check: { batch: 'b1-1', item: 'i_' + card.id.slice(2), verdict: 'confirmed' }, classes: J_CARD });
}
const witnessPath = (root) => path.join(root, 'store', 'witness.jsonl');
function addWitness(root, card, result, o = {}) {
  const seq = o.seq ?? readJsonl(witnessPath(root)).length + 1;
  const reason = o.reason ?? (result === 'witnessed' ? 'ok' : result === 'rejected' ? 'quote-missing' : 'no-snapshot');
  appendJsonl(witnessPath(root), { seq, card_id: card.id, card_sha: o.sha ?? card.sha, result, number_bound: result === 'witnessed', reason, source_changed: false, w: 300, at: NOW });
  return seq;
}
function addCommit(root, { task, step, epoch = 1, stepKey = 'f'.repeat(64), outputs }) {
  const outs = outputs.map((o) => ({ id: o.id, kind: o.kind, sha256: o.sha })).sort((a, b) => (a.id < b.id ? -1 : 1));
  const rec = { schema_version: 1, task, step, epoch, step_key: stepKey, outputs: outs, outputs_sha: sha(canon(outs)) };
  const bytes = canon(rec);
  fs.writeFileSync(path.join(root, 'store', 'commits', `${task}.${step}.json`), bytes);
  return { sha: sha(bytes), record: rec };
}

// ---- synthetic content (never copied from a real source) ----
function mkCard(o = {}) {
  const tag = o.tag ?? 'a';
  const c = {
    schema_version: 1, kind: 'card', field: o.field ?? 'f1', question_ids: o.qids ?? ['f1-g1-01'], route: 'keyword',
    source: { url: 'https://example.test/' + tag, canonical_id: 'doi:10.0/' + tag, primary_id: 'doi:10.0/' + tag, evidence_type: 'controlled' },
    quote: 'synthetic quote ' + tag,
    measured: { approach_id: o.approach ?? 'a1', measure: o.measure ?? 'm1', value: o.value ?? 10, unit: 'pct', baseline: o.baseline ?? 8, baseline_kind: 'control', better: 'higher', effect: o.effect ?? 'improves' },
    conditions: { task: o.task ?? ['repair'], model_family: ['fam'], language: ['py'] },
    what_measured: 'synthetic measurement ' + tag,
  };
  if (o.supersedes) { c.supersedes = o.supersedes; c.supersede_reason = 'wrong-number'; }
  return c;
}
const SENT = (sid, cites, o = {}) => ({ sid, approach_id: o.approach ?? 'a1', measure: o.measure ?? 'm1', kind: o.kind ?? 'fact', text: 'synthetic sentence ' + sid, cites, applies_to: o.applies ?? {} });
const DEFAULT_QSHA = sha(canon(['f1-g1-01']));
function mkPack(o) {
  const p = { schema_version: 1, kind: 'pack', field: o.field ?? 'f1', questions_sha: o.qsha ?? DEFAULT_QSHA, cards: [...new Set(o.cards)].sort(), conclusions: o.concl ?? [], not_covered: o.notCovered ?? [] };
  if (o.parent) p.parent = o.parent;
  return p;
}
function mkReview(o) {
  return { schema_version: 1, kind: 'review', field: o.field ?? 'f1', task: o.task ?? 'f1-research', pack: o.pack, sentences: o.sentences ?? [], verdicts: o.verdicts ?? [], dismissals: o.dismissals ?? [], our_work_findings: o.findings ?? [] };
}

// ---- running a script as a child process ----
function run(script, argv, root) {
  const r = spawnSync(process.execPath, [path.join(TCB, script + '.mjs'), ...argv], { cwd: root, encoding: 'utf8', windowsHide: true, shell: false, timeout: 180000, maxBuffer: 64 << 20 });
  const lines = (r.stdout ?? '').split('\n').filter((l) => l.trim());
  let json = null;
  if (lines.length === 1) { try { json = JSON.parse(lines[0]); } catch { json = null; } }
  return { exit: r.status, json, stdout: r.stdout ?? '', stderr: r.stderr ?? '', lines };
}
// CONTRACT 1.3 shape, asserted on every run.
function shape(r, script, exit) {
  const where = () => `\nexit=${r.exit}\nstdout=${r.stdout.slice(0, 800)}\nstderr=${r.stderr.slice(0, 800)}`;
  assert.equal(r.lines.length, 1, 'stdout must be exactly one line' + where());
  const j = r.json;
  assert.ok(j && typeof j === 'object', 'stdout line must be JSON' + where());
  for (const k of ['ok', 'script', 'mode', 'exit', 'code', 'dry_run', 'result', 'reasons', 'ledger_seq']) assert.ok(k in j, 'stdout JSON lacks key ' + k + where());
  assert.ok(j.script === script || j.script === script + '.mjs', 'script name' + where());
  assert.equal(j.exit, r.exit, 'JSON exit equals process exit' + where());
  if (exit !== undefined) assert.equal(r.exit, exit, 'expected exit ' + exit + where());
  assert.equal(j.code, EXIT_SLUG[j.exit], 'code is the slug of the exit' + where());
  assert.equal(j.ok, j.exit === 0);
  assert.ok(Array.isArray(j.reasons) && Array.isArray(j.ledger_seq));
  return j;
}
const reasonCodes = (j) => j.reasons.map((x) => x.code);
function assertReason(j, code) { assert.ok(reasonCodes(j).includes(code), `reasons should name ${code}, got ${JSON.stringify(j.reasons)}`); }
function usageExit(r) {
  assert.equal(r.exit, 66, 'bad command line exits 66\n' + r.stdout + r.stderr);
  if (r.json) assert.equal(r.json.code, 'usage');
}
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
// A run.lock held by a live process this test spawned itself (and ends itself).
function holdLock(root) {
  const child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore', windowsHide: true });
  const ps = spawnSync(PS_EXE, ['-NoProfile', '-NonInteractive', '-Command', `[Console]::OutputEncoding=[Text.Encoding]::UTF8; (Get-CimInstance Win32_Process -Filter "ProcessId=${child.pid}").CreationDate.ToUniversalTime().ToString('o')`], { encoding: 'utf8', windowsHide: true, timeout: 60000 });
  const start = (ps.stdout ?? '').trim();
  if (!/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(start)) { try { child.kill(); } catch { /* own child */ } throw new Error('cannot read start time of the test-owned sleeper: ' + start); }
  fs.writeFileSync(path.join(root, 'run', 'run.lock'), JSON.stringify({ pid: child.pid, start_time: start, nonce: 'a'.repeat(32), script: 'test-holder', ce: 1, acquired_at: NOW }));
  return { release() { try { child.kill(); } catch { /* own child */ } } };
}
// ==== COMMON HELPERS END ====

// ---------------------------------------------------------------------------------------------
// certify specific helpers
// ---------------------------------------------------------------------------------------------
const TASK = 'f1-research';
const QID = 'f1-g1-01';

// Builds a run root holding a committed pack + review of task f1-research (epoch 1), its manifest, task row,
// card statuses, an audit line and (optionally) plants. Everything is synthetic.
function build(o = {}) {
  const root = makeRoot({ params: o.params });
  const cardOpts = (tag, extra = {}) => ({ tag, qids: o.cardQids?.[tag] ?? [QID], ...extra });
  const A = putObj(root, mkCard(cardOpts('A')));
  const B = putObj(root, mkCard(cardOpts('B', o.bSupersedesA ? { supersedes: A.id } : {})));
  const D = putObj(root, mkCard(cardOpts('D')));
  const byKey = { A, B, D };
  const status = { A: 'confirmed', B: 'confirmed', D: 'none', ...(o.status ?? {}) };
  for (const [k, st] of Object.entries(status)) {
    if (st === 'confirmed') confirm(root, byKey[k]);
    else if (st !== 'none') addStatus(root, byKey[k], st, { witness_seq: 1 });
  }
  const packCards = o.packCards ?? ['A', 'B', ...(o.withD ? ['D'] : [])];
  const P = putObj(root, mkPack({ cards: packCards.map((k) => byKey[k].id), concl: [], notCovered: o.notCovered ?? [] }));
  const sentences = o.sentences ? o.sentences(byKey) : [SENT('s1', [A.id]), SENT('s2', [A.id, B.id])];
  const R = putObj(root, mkReview({ pack: P.id, sentences, findings: o.findings ?? [] }));
  const M = putObj(root, {
    schema_version: 1, kind: 'manifest', task: TASK, epoch: 1, role: 'child-reviewing', brief_sha: sha('synthetic brief'), schema_shas: {},
    tier: 'synthetic-tier', tools: [], inputs: [], agents: [], user_files: [], outputs: [{ step: 'pack', kinds: ['card', 'pack'] }, { step: 'review', kinds: ['review'] }],
  });
  const stepKey = o.stepKey ?? M.sha;
  const cp = addCommit(root, { task: TASK, step: 'pack', epoch: 1, stepKey, outputs: [...packCards.map((k) => ({ ...byKey[k], kind: 'card' })), { ...P, kind: 'pack' }] });
  const commits = { pack: cp.sha };
  if (o.commitReview !== false) commits.review = addCommit(root, { task: TASK, step: 'review', epoch: o.commitEpoch ?? 1, stepKey, outputs: [{ ...R, kind: 'review' }] }).sha;
  writeTasks(root, [{
    task: TASK, field: 'f1', stage: 'research', role: 'child-reviewing', steps: ['pack', 'review'], deps: [], question_ids: o.qids ?? [QID],
    e_task: 1000, tier: 'synthetic-tier', state: o.commitReview === false ? 'active' : 'committed', step: 'bound', epoch: 1, restarts: 0, handovers: 0, parks: 0,
    limit: false, fails: [], attempts: [{ epoch: 1, folder: 'wt/f1-research-e1', manifest: M.id, stop: 'none' }], commits, updated_rev: 0,
  }]);
  // ledger: audit (label as asked), then optional intake flag
  const audit = o.audit === undefined ? ['clean'] : o.audit === null ? [] : [].concat(o.audit);
  for (const label of audit) {
    addLedger(root, 'audit', { label, undeclared: label === 'clean' ? [] : ['synthetic-undeclared'], protected_writes: [], first_context: 0, notes_bad: [] }, { task: TASK, epoch: 1 });
  }
  if (o.flag) addLedger(root, 'intake', { objects: [{ id: R.id, kind: 'review', origin: 'session' }], rejected: [], flagged: [{ id: R.id, sid: o.flag.sid, code: o.flag.code }] }, { task: TASK, epoch: 1 });
  // plants: [{key, file, locator, against}] with card taken from byKey
  if (o.plants) {
    const plants = o.plants.map((p, i) => ({
      plant_id: 'pl_' + String(i + 1).padStart(16, '0'), file: p.file, locator: p.locator, card_id: (p.card ?? A).id ?? A.id, against_hope: !!p.against,
      original_sha: sha('orig' + i), planted_sha: sha('planted' + i),
    }));
    fs.writeFileSync(path.join(root, 'sealed', 'plants', TASK + '.json'), canon({ task: TASK, k: plants.length, plants }));
  }
  return { root, A, B, D, P, R, M, byKey };
}
const finding = (file, locator) => ({ file, locator, reason: 'wrong-number', text: 'synthetic finding' });
const certify = (root, extra = [], over = {}) => run('certify', ['--root', root, '--ce', String(over.ce ?? 1), '--task', TASK, '--epoch', String(over.epoch ?? 1), '--now', NOW, ...extra], root);
const xFiles = (root) => objectFiles(root).filter((n) => n.startsWith('x_'));
const xObj = (root, id) => JSON.parse(fs.readFileSync(path.join(root, 'store', 'objects', id + '.json'), 'utf8'));
const certLines = (root) => readLedger(root).filter((l) => l.kind === 'certificate');
const certChecks = (root) => readLedger(root).filter((l) => l.kind === 'check' && l.data.check === 'certify');
function expectedReadSet(root, cardIds) {
  const lines = statusLines(root);
  return [...new Set(cardIds)].sort().map((id) => ({ card_id: id, status_seq: lines.filter((l) => l.card_id === id).at(-1)?.seq ?? 0 }));
}
const THREE_PLANTS = [
  { file: 'a.txt', locator: 'line 3', against: true },
  { file: 'b.txt', locator: 'line 7' },
  { file: 'c.txt', locator: 'line 2' },
];

// ---------------------------------------------------------------------------------------------
// Behaviours (spec/certify.mjs.md "Behaviours")
// ---------------------------------------------------------------------------------------------

test('T1 a review citing two confirmed cards, a clean audit, 3 plants all found (incl. the contra one), plants_t 2: certified, x_ object stored, certificate and check pass lines, exit 0', () => {
  const w = build({
    params: { plants_t: 2 }, plants: THREE_PLANTS,
    findings: [finding('a.txt', 'line 3'), finding('b.txt', 'line 7'), finding('c.txt', 'line 2')],
  });
  const j = shape(certify(w.root), 'certify', 0);
  assert.equal(j.result.result, 'certified');
  assert.deepEqual(j.result.reasons, []);
  assert.match(j.result.certificate, /^x_[0-9a-f]{16}$/);
  assert.equal(j.result.created, true);
  assert.deepEqual(j.result.cited, { n: 2, confirmed: 2 });
  assert.deepEqual(j.result.plants, { k: 3, found: 3, contra_found: 1 });
  // the stored object: canonical bytes whose hash names it
  const file = path.join(w.root, 'store', 'objects', j.result.certificate + '.json');
  const bytes = fs.readFileSync(file, 'utf8');
  const x = JSON.parse(bytes);
  assert.equal(bytes, canon(x), 'stored in canonical form');
  assert.equal('x_' + sha(bytes).slice(0, 16), j.result.certificate, 'the id is the first 16 hex of the content hash');
  assert.equal(x.kind, 'certificate');
  assert.equal(x.task, TASK);
  assert.equal(x.subject, w.R.id);
  assert.equal(x.pack, w.P.id);
  assert.equal(x.step_key, w.M.sha);
  assert.equal(x.session_label, 'clean');
  assert.equal(x.result, 'certified');
  assert.deepEqual(x.reasons, []);
  assert.deepEqual(x.cited.failing, []);
  assert.deepEqual(x.read_set, expectedReadSet(w.root, [w.A.id, w.B.id]));
  assert.equal(x.read_set_sha, j.result.read_set_sha);
  // ledger lines
  const cl = certLines(w.root);
  assert.equal(cl.length, 1);
  assert.deepEqual(cl[0].data, { id: j.result.certificate, result: 'certified' });
  const ck = certChecks(w.root);
  assert.equal(ck.length, 1);
  assert.equal(ck[0].data.subject, w.R.id);
  assert.equal(ck[0].data.result, 'pass');
  assert.equal(j.ledger_seq.length, 2);
  verifyLedger(readLedger(w.root));
});

test('T1b the certificate copies seed_escape {n, escaped} from qualification.json when it exists and omits it otherwise', () => {
  {
    const w = build({});
    const j = shape(certify(w.root), 'certify', 0);
    assert.ok(!('seed_escape' in xObj(w.root, j.result.certificate)));
  }
  {
    const w = build({});
    fs.writeFileSync(path.join(w.root, 'store', 'qualification.json'), JSON.stringify({ schema_version: 1, classes: {}, escape: { n: 14, escaped: 0 } }));
    const j = shape(certify(w.root), 'certify', 0);
    assert.deepEqual(xObj(w.root, j.result.certificate).seed_escape, { n: 14, escaped: 0 });
  }
});

test('T2 a rerun on unchanged inputs gives the same id, created false, no new lines, exit 0', () => {
  const w = build({});
  const first = shape(certify(w.root), 'certify', 0);
  const n = readLedger(w.root).length;
  const before = snapshot(w.root);
  const second = shape(certify(w.root), 'certify', 0);
  assert.equal(second.result.certificate, first.result.certificate);
  assert.equal(second.result.created, false);
  assert.deepEqual(second.ledger_seq, []);
  assert.equal(readLedger(w.root).length, n);
  assert.deepEqual(snapshot(w.root), before);
});

test('T3 one cited card only witnessed: not_certified, failing [{card_id, not-confirmed}], exit 1', () => {
  const w = build({ status: { B: 'witnessed' } });
  const j = shape(certify(w.root), 'certify', 1);
  assert.equal(j.result.result, 'not_certified');
  assert.deepEqual(j.result.reasons, ['cited-failing']);
  assert.deepEqual(j.result.cited, { n: 2, confirmed: 1 });
  const x = xObj(w.root, j.result.certificate);
  assert.deepEqual(x.cited.failing, [{ card_id: w.B.id, code: 'not-confirmed' }]);
  assert.equal(certLines(w.root)[0].data.result, 'not_certified');
  assert.equal(certChecks(w.root)[0].data.result, 'fail');
  verifyLedger(readLedger(w.root));
});

test('T4 a cited card superseded by a confirmed card is failing with code superseded', () => {
  const w = build({ bSupersedesA: true, sentences: (c) => [SENT('s1', [c.A.id])] });
  const j = shape(certify(w.root), 'certify', 1);
  assert.equal(j.result.result, 'not_certified');
  assert.deepEqual(j.result.reasons, ['cited-failing']);
  assert.deepEqual(xObj(w.root, j.result.certificate).cited.failing, [{ card_id: w.A.id, code: 'superseded' }]);
  assert.equal(j.result.cited.confirmed, 0);
});

test('T5 an open number-uncited flag on a review sentence is r18-flag, exit 1; after a sentence-check confirmation from a batch queued after the flag it is certified', () => {
  const w = build({ flag: { sid: 's1', code: 'number-uncited' } });
  let j = shape(certify(w.root), 'certify', 1);
  assert.equal(j.result.result, 'not_certified');
  assert.deepEqual(xObj(w.root, j.result.certificate).cited.failing, [{ card_id: w.A.id, code: 'r18-flag' }]);
  assert.ok(j.result.reasons.includes('cited-failing'));
  // the batch is queued after the flag, then the checker confirms the sentence
  addLedger(w.root, 'queue', { batch: 'b1-2', n: 1, n_seeds: 0, rng_seed: 'rng' });
  addStatus(w.root, w.A, 'confirmed', { reason: 'sentence-check', check: { batch: 'b1-2', item: 'i_2', verdict: 'confirmed', node: `${w.R.id}#s1` }, classes: J_SENT });
  j = shape(certify(w.root), 'certify', 0);
  assert.equal(j.result.result, 'certified');
  assert.deepEqual(xObj(w.root, j.result.certificate).cited.failing, []);
  verifyLedger(readLedger(w.root));
});

test('T6 a tainted last audit line is not_certified tainted; no audit line is not_run audit-missing with the certificate still stored', () => {
  {
    const w = build({ audit: ['clean', 'tainted'] });
    const j = shape(certify(w.root), 'certify', 1);
    assert.equal(j.result.result, 'not_certified');
    assert.deepEqual(j.result.reasons, ['tainted']);
    assert.equal(xObj(w.root, j.result.certificate).session_label, 'tainted');
  }
  {
    const w = build({ audit: null });
    const j = shape(certify(w.root), 'certify', 2);
    assert.equal(j.result.result, 'not_run');
    assert.ok(j.result.reasons.includes('audit-missing'));
    assert.ok(fs.existsSync(path.join(w.root, 'store', 'objects', j.result.certificate + '.json')), 'the certificate is still stored');
    const ck = certChecks(w.root);
    assert.equal(ck.length, 1);
    assert.equal(ck[0].data.result, 'not_run');
    assert.ok(ck[0].data.reasons.some((r) => r.code === 'audit-missing'));
    verifyLedger(readLedger(w.root));
  }
});

test('T7 plants_t 2: found 1 is plants-short; found 2 with none against hope is plant-contra-missed; plants_t null is a reading and certifies with found 0', () => {
  {
    const w = build({ params: { plants_t: 2 }, plants: THREE_PLANTS, findings: [finding('a.txt', 'line 3')] });
    const j = shape(certify(w.root), 'certify', 1);
    assert.equal(j.result.result, 'not_certified');
    assert.deepEqual(j.result.reasons, ['plants-short']);
    assert.deepEqual(j.result.plants, { k: 3, found: 1, contra_found: 1 });
  }
  {
    const w = build({ params: { plants_t: 2 }, plants: THREE_PLANTS, findings: [finding('b.txt', 'line 7'), finding('c.txt', 'line 2')] });
    const j = shape(certify(w.root), 'certify', 1);
    assert.deepEqual(j.result.reasons, ['plant-contra-missed']);
    assert.deepEqual(j.result.plants, { k: 3, found: 2, contra_found: 0 });
  }
  {
    const w = build({ params: { plants_t: null }, plants: THREE_PLANTS, findings: [] });
    const j = shape(certify(w.root), 'certify', 0);
    assert.equal(j.result.result, 'certified');
    assert.deepEqual(j.result.reasons, []);
    assert.deepEqual(j.result.plants, { k: 3, found: 0, contra_found: 0 });
  }
});

test('T8 no plant file while plants_t is a gate is not_run plants-missing, exit 2', () => {
  const w = build({ params: { plants_t: 2 } });
  const j = shape(certify(w.root), 'certify', 2);
  assert.equal(j.result.result, 'not_run');
  assert.ok(j.result.reasons.includes('plants-missing'));
  assert.equal(certChecks(w.root)[0].data.result, 'not_run');
});

test('T8b a plant whose card_id is not stored is exit 2 dangling', () => {
  const w = build({ plants: [{ file: 'a.txt', locator: 'line 3', card: { id: 'c_00000000deadbeef' } }] });
  const j = shape(certify(w.root), 'certify', 2);
  assertReason(j, 'dangling');
  assert.equal(xFiles(w.root).length, 0);
});

test('T9 plant locator matching ignores case and outer spaces; a different file does not match', () => {
  const w = build({
    plants: [{ file: 'a.txt', locator: 'line 3' }, { file: 'b.txt', locator: 'line 4' }, { file: 'c.txt', locator: 'line 5' }],
    findings: [finding('a.txt', '  LINE 3  '), finding('x/b.txt', 'line 4')],
  });
  const j = shape(certify(w.root), 'certify', 0);
  assert.deepEqual(j.result.plants, { k: 3, found: 1, contra_found: 0 });
});

test('T10 coverage: approved [a, b, c], a confirmed card answers a, the pack lists b in not_covered: covered 2, not_covered [c], result unaffected', () => {
  const ids = ['f1-g1-01', 'f1-g1-02', 'f1-g1-03'];
  const w = build({ qids: ids, notCovered: [{ question_id: 'f1-g1-02', reason: 'no-source' }] });
  const j = shape(certify(w.root), 'certify', 0);
  assert.equal(j.result.result, 'certified');
  assert.deepEqual(xObj(w.root, j.result.certificate).coverage, { approved: 3, covered: 2, not_covered: ['f1-g1-03'] });
});

test('T11 read_set_sha is sha256hex(canonicalize(read_set)); a new status line for a pack card gives a new certificate id', () => {
  const w = build({ withD: true }); // D is a pack card that nothing cites and nothing has judged
  const first = shape(certify(w.root), 'certify', 0);
  const x1 = xObj(w.root, first.result.certificate);
  assert.deepEqual(x1.read_set, expectedReadSet(w.root, [w.A.id, w.B.id, w.D.id]));
  assert.equal(x1.read_set.find((e) => e.card_id === w.D.id).status_seq, 0, 'a card with no status line has status_seq 0');
  assert.equal(x1.read_set_sha, sha(canon(x1.read_set)));
  assert.equal(first.result.read_set_sha, x1.read_set_sha);
  addStatus(w.root, w.D, 'witnessed', { witness_seq: 9 });
  const second = shape(certify(w.root), 'certify', 0);
  assert.notEqual(second.result.certificate, first.result.certificate);
  assert.equal(second.result.created, true);
  const x2 = xObj(w.root, second.result.certificate);
  assert.deepEqual(x2.read_set, expectedReadSet(w.root, [w.A.id, w.B.id, w.D.id]));
  assert.ok(x2.read_set.find((e) => e.card_id === w.D.id).status_seq > 0);
  assert.equal(x2.read_set_sha, sha(canon(x2.read_set)));
  assert.notEqual(x2.read_set_sha, x1.read_set_sha);
  assert.equal(certLines(w.root).length, 2);
  verifyLedger(readLedger(w.root));
});

test('T12 a review step that is not committed is exit 2 not-committed and no object is written', () => {
  const w = build({ commitReview: false });
  const before = objectFiles(w.root).length;
  const j = shape(certify(w.root), 'certify', 2);
  assertReason(j, 'not-committed');
  assert.equal(xFiles(w.root).length, 0);
  assert.equal(objectFiles(w.root).length, before);
  assert.equal(certLines(w.root).length, 0);
});

test('T13 an edited manifest object is exit 3 object-mismatch; a record step_key that differs from the manifest is exit 3 step-key-mismatch', () => {
  {
    const w = build({});
    fs.writeFileSync(path.join(w.root, 'store', 'objects', w.M.id + '.json'), canon({ ...w.M.value, tier: 'edited-after-the-fact' }));
    const j = shape(certify(w.root), 'certify', 3);
    assertReason(j, 'object-mismatch');
    assert.equal(xFiles(w.root).length, 0);
  }
  {
    const w = build({ stepKey: 'b'.repeat(64) });
    const j = shape(certify(w.root), 'certify', 3);
    assertReason(j, 'step-key-mismatch');
    assert.equal(xFiles(w.root).length, 0);
  }
});

test('T14 stale --epoch is 65; stale --ce is 64 and writes nothing; lock busy is 75; a corrupt table is 67; --dry-run prints the result and writes nothing', { concurrency: false }, () => {
  {
    const w = build({});
    const before = snapshot(w.root);
    const r = certify(w.root, [], { epoch: 2 });
    shape(r, 'certify', 65);
    assertReason(r.json, 'stale-epoch');
    assert.deepEqual(snapshot(w.root), before);
  }
  {
    const w = build({});
    const before = snapshot(w.root);
    const r = certify(w.root, [], { ce: 7 });
    shape(r, 'certify', 64);
    assertReason(r.json, 'stale-ce');
    assert.deepEqual(snapshot(w.root), before);
  }
  {
    const w = build({ params: { lock_retries: 3 } });
    // the test itself writes run.lock, so the snapshot is taken after the lock is held
    const lock = holdLock(w.root);
    const before = snapshot(w.root);
    try {
      const r = certify(w.root);
      shape(r, 'certify', 75);
      assertReason(r.json, 'lock-busy');
    } finally { lock.release(); }
    assert.deepEqual(snapshot(w.root), before);
  }
  {
    const w = build({});
    fs.writeFileSync(path.join(w.root, 'run', 'tasks.json'), '{ this is not json');
    const r = certify(w.root);
    shape(r, 'certify', 67);
    assertReason(r.json, 'table-corrupt');
    assert.equal(xFiles(w.root).length, 0);
  }
  {
    const w = build({});
    const before = snapshot(w.root);
    const j = shape(certify(w.root, ['--dry-run']), 'certify', 0);
    assert.equal(j.dry_run, true);
    assert.equal(j.result.result, 'certified');
    assert.match(j.result.certificate, /^x_[0-9a-f]{16}$/);
    assert.deepEqual(j.ledger_seq, []);
    assert.deepEqual(snapshot(w.root), before);
    assert.equal(xFiles(w.root).length, 0);
  }
});

test('T14b an unknown task is exit 1 no-task; a commit record of another epoch is 65', () => {
  {
    const w = build({});
    const r = run('certify', ['--root', w.root, '--ce', '1', '--task', 'f9-nothing', '--epoch', '1', '--now', NOW], w.root);
    shape(r, 'certify', 1);
    assertReason(r.json, 'no-task');
    assert.equal(xFiles(w.root).length, 0);
  }
  {
    const w = build({ commitEpoch: 2 });
    const r = certify(w.root);
    shape(r, 'certify', 65);
    assert.equal(xFiles(w.root).length, 0);
  }
});
