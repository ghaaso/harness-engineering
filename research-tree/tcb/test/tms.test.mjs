// tms.mjs tests, written from spec/tms.mjs.md and CONTRACT.md only (the script's code was not read).
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
  const r = spawnSync(process.execPath, [path.join(TCB, 'scripts', script + '.mjs'), ...argv], { cwd: root, encoding: 'utf8', windowsHide: true, shell: false, timeout: 180000, maxBuffer: 64 << 20 });
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
// tms specific helpers
// ---------------------------------------------------------------------------------------------
function freezeProtocol(root, { field = 'f1', qids = ['f1-g1-01'], sesoi = { m1: 1.0 } } = {}) {
  const v = {
    schema_version: 1, kind: 'protocol', field, question_ids: qids,
    criteria: { include: [{ code: 'I1', text: 'synthetic include' }], exclude: [{ code: 'E1', text: 'synthetic exclude' }] },
    routes: ['keyword'], card_schema_version: 1, certainty_method: 'synthetic', sesoi,
    outlist_vocab: { approaches: ['a1', 'a2'], measures: ['m1', 'm2'], effects: ['improves', 'worsens'] },
    seeds: [], must_read: [], fixed_files: [], cross_field: [], approval: { quote: 'synthetic approval', at: NOW },
  };
  const bytes = canon(v);
  const h = sha(bytes);
  const rel = `plan/frozen/protocol-${field}-${h.slice(0, 12)}.json`;
  fs.writeFileSync(path.join(root, rel), bytes);
  addLedger(root, 'protocol-freeze', { name: 'protocol-' + field, sha256: h, path: rel });
  return { sha: h, rel };
}
function world(o = {}) {
  const root = makeRoot(o);
  const prot = freezeProtocol(root, o.prot);
  const A = putObj(root, mkCard({ tag: 'A' }));
  return { root, prot, A };
}
const tms = (root, extra = []) => run('tms', ['--root', root, '--ce', '1', '--now', NOW, ...extra], root);
const labelsOf = (root) => JSON.parse(fs.readFileSync(path.join(root, 'views', 'labels.json'), 'utf8'));
const repairOf = (root) => JSON.parse(fs.readFileSync(path.join(root, 'views', 'repair.json'), 'utf8'));
const whyOf = (x) => [].concat(x?.why ?? []);
const tmsChecks = (root) => readLedger(root).filter((l) => l.kind === 'check' && l.data.check === 'tms');
const node = (obj, sid) => `${obj.id}#${sid}`;
function packWith(root, cards, concl, extra = {}) {
  return putObj(root, mkPack({ cards: cards.map((c) => c.id), concl, ...extra }));
}
function commitPack(root, P, cards, task = 'f1-research') {
  addCommit(root, { task, step: 'pack', outputs: [...cards.map((c) => ({ ...c, kind: 'card' })), { ...P, kind: 'pack' }] });
}
function commitReview(root, R, task = 'f1-research') {
  addCommit(root, { task, step: 'review', outputs: [{ ...R, kind: 'review' }] });
}
// the simplest clean world: one confirmed card, one pack with one fact sentence, committed
function cleanWorld(o = {}) {
  const w = world(o);
  confirm(w.root, w.A);
  const P = packWith(w.root, [w.A], [SENT('s1', [w.A.id])]);
  commitPack(w.root, P, [w.A]);
  return { ...w, P };
}
const noViews = (root) => {
  assert.ok(!fs.existsSync(path.join(root, 'views', 'labels.json')), 'views/labels.json must not be written');
  assert.ok(!fs.existsSync(path.join(root, 'views', 'repair.json')), 'views/repair.json must not be written');
};

// ---------------------------------------------------------------------------------------------
// Behaviours (spec/tms.mjs.md "Behaviours")
// ---------------------------------------------------------------------------------------------

test('T1 a pack with one fact citing a confirmed card: node IN, target ok, exit 0, views written, check line pass', () => {
  const { root, A, P } = cleanWorld();
  const j = shape(tms(root), 'tms', 0);
  const L = labelsOf(root);
  assert.equal(L.nodes[node(P, 's1')].label, 'IN');
  assert.equal(L.cards[A.id].label, 'confirmed');
  assert.equal(L.cards[A.id].status_seq, 2);
  assert.deepEqual(L.targets, [{ commit: 'f1-research.pack', ok: true, bad: [] }]);
  assert.ok('schema_version' in L && 'inputs' in L, 'labels.json carries schema_version and inputs');
  const R = repairOf(root);
  assert.deepEqual(R.items, []);
  assert.equal(j.result.cards.confirmed, 1);
  assert.equal(j.result.nodes.IN, 1);
  assert.deepEqual(j.result.bad_targets, []);
  assert.deepEqual(j.result.reopened, []);
  assert.deepEqual(j.result.stale_certificates, []);
  assert.match(j.result.labels_sha, /^[0-9a-f]{64}$/);
  const checks = tmsChecks(root);
  assert.equal(checks.length, 1);
  assert.equal(checks[0].data.result, 'pass');
  assert.equal(checks[0].data.subject, 'labels');
  assert.equal(j.ledger_seq.length, 1);
  verifyLedger(readLedger(root));
});

test('T2 the card last status is witnessed: PENDING support-unchecked, exit 1, repair item', () => {
  const w = world();
  addStatus(w.root, w.A, 'witnessed', { witness_seq: 1 });
  const P = packWith(w.root, [w.A], [SENT('s1', [w.A.id])]);
  commitPack(w.root, P, [w.A]);
  const j = shape(tms(w.root), 'tms', 1);
  const n = labelsOf(w.root).nodes[node(P, 's1')];
  assert.equal(n.label, 'PENDING');
  assert.ok(whyOf(n).includes('support-unchecked'));
  assert.deepEqual(n.causes, [w.A.id]);
  const items = repairOf(w.root).items;
  assert.equal(items.length, 1);
  assert.equal(items[0].node, node(P, 's1'));
  assert.equal(items[0].label, 'PENDING');
  assert.equal(items[0].object, P.id);
  assert.equal(items[0].causes.length, 1);
  assert.equal(items[0].causes[0].card_id, w.A.id);
  assert.equal(typeof items[0].causes[0].code, 'string');
  assert.equal(j.result.bad_targets.length, 1);
  assert.equal(j.result.bad_targets[0].commit, 'f1-research.pack');
  assert.ok(j.result.bad_targets[0].bad.includes(node(P, 's1')));
  verifyLedger(readLedger(w.root));
});

test('T3 JUDGMENT: [confirmed, unverifiable] cites; a judgment-kind sentence; an uncited judgment; all exit 0', () => {
  const w = world();
  const U = putObj(w.root, mkCard({ tag: 'U' }));
  confirm(w.root, w.A);
  addStatus(w.root, U, 'unverifiable', { reason: 'no-snapshot', witness_seq: 2 });
  const P = packWith(w.root, [w.A, U], [
    SENT('s1', [w.A.id, U.id]),
    SENT('s2', [w.A.id], { kind: 'judgment' }),
    SENT('s3', [], { kind: 'judgment' }),
  ]);
  commitPack(w.root, P, [w.A, U]);
  shape(tms(w.root), 'tms', 0);
  const N = labelsOf(w.root).nodes;
  assert.equal(N[node(P, 's1')].label, 'JUDGMENT');
  assert.ok(whyOf(N[node(P, 's1')]).includes('support-unverifiable'));
  assert.equal(N[node(P, 's2')].label, 'JUDGMENT');
  assert.ok(whyOf(N[node(P, 's2')]).includes('judgment-kind'));
  assert.equal(N[node(P, 's3')].label, 'JUDGMENT');
  assert.ok(whyOf(N[node(P, 's3')]).includes('uncited'));
});

test('T4 a cited card last line becomes rejected: STALE support-fell with its cause, exit 1; a confirmed supersessor makes the old card superseded', () => {
  {
    const w = world();
    addStatus(w.root, w.A, 'witnessed', { witness_seq: 1 });
    addStatus(w.root, w.A, 'confirmed', { check: { batch: 'b1-1', item: 'i_1', verdict: 'confirmed' }, classes: J_CARD });
    addStatus(w.root, w.A, 'rejected', { reason: 'quote-missing', witness_seq: 3 });
    const P = packWith(w.root, [w.A], [SENT('s1', [w.A.id])]);
    commitPack(w.root, P, [w.A]);
    shape(tms(w.root), 'tms', 1);
    const L = labelsOf(w.root);
    assert.equal(L.cards[w.A.id].label, 'rejected');
    assert.equal(L.nodes[node(P, 's1')].label, 'STALE');
    assert.ok(whyOf(L.nodes[node(P, 's1')]).includes('support-fell'));
    assert.deepEqual(L.nodes[node(P, 's1')].causes, [w.A.id]);
  }
  {
    const w = world();
    const B = putObj(w.root, mkCard({ tag: 'B', supersedes: w.A.id }));
    confirm(w.root, w.A);
    confirm(w.root, B);
    const P = packWith(w.root, [w.A, B], [SENT('s1', [w.A.id]), SENT('s2', [B.id])]);
    commitPack(w.root, P, [w.A, B]);
    shape(tms(w.root), 'tms', 1);
    const L = labelsOf(w.root);
    assert.equal(L.cards[w.A.id].label, 'superseded');
    assert.equal(L.cards[B.id].label, 'confirmed');
    assert.equal(L.nodes[node(P, 's1')].label, 'STALE');
    assert.equal(L.nodes[node(P, 's2')].label, 'IN');
  }
});

test('T5 precedence: [rejected, pending] is STALE; [pending, unverifiable] is PENDING', () => {
  const w = world();
  const Rj = putObj(w.root, mkCard({ tag: 'R' }));
  const Pn = putObj(w.root, mkCard({ tag: 'N' }));
  const U = putObj(w.root, mkCard({ tag: 'U' }));
  addStatus(w.root, Rj, 'rejected', { reason: 'number-missing', witness_seq: 1 });
  addStatus(w.root, U, 'unverifiable', { reason: 'pdf', witness_seq: 2 });
  const P = packWith(w.root, [Rj, Pn, U], [SENT('s1', [Rj.id, Pn.id]), SENT('s2', [Pn.id, U.id])]);
  commitPack(w.root, P, [Rj, Pn, U]);
  shape(tms(w.root), 'tms', 1);
  const L = labelsOf(w.root);
  assert.equal(L.cards[Pn.id].label, 'pending');
  assert.equal(L.nodes[node(P, 's1')].label, 'STALE');
  assert.equal(L.nodes[node(P, 's2')].label, 'PENDING');
});

test('T6 an open scope-outside flag keeps the node PENDING; a sentence-check from a batch queued after the flag clears it; one queued before does not', () => {
  const setup = () => {
    const w = world();
    confirm(w.root, w.A);
    const P = packWith(w.root, [w.A], [SENT('s1', [w.A.id])]);
    commitPack(w.root, P, [w.A]);
    return { ...w, P };
  };
  const flag = (w) => addLedger(w.root, 'intake', { objects: [{ id: w.P.id, kind: 'pack', origin: 'session' }], rejected: [], flagged: [{ id: w.P.id, sid: 's1', code: 'scope-outside' }] }, { task: 'f1-research', epoch: 1 });
  const queue = (w) => addLedger(w.root, 'queue', { batch: 'b1-2', n: 1, n_seeds: 0, rng_seed: 'rng' });
  const sentenceCheck = (w) => addStatus(w.root, w.A, 'confirmed', { reason: 'sentence-check', check: { batch: 'b1-2', item: 'i_2', verdict: 'confirmed', node: node(w.P, 's1') }, classes: J_SENT });
  // open flag
  const w1 = setup();
  flag(w1);
  shape(tms(w1.root), 'tms', 1);
  let n = labelsOf(w1.root).nodes[node(w1.P, 's1')];
  assert.equal(n.label, 'PENDING');
  assert.ok(whyOf(n).includes('flag-open'));
  // cleared by a batch queued after the flag
  queue(w1);
  sentenceCheck(w1);
  shape(tms(w1.root), 'tms', 0);
  assert.equal(labelsOf(w1.root).nodes[node(w1.P, 's1')].label, 'IN');
  // the same line from a batch queued before the flag: still open
  const w2 = setup();
  queue(w2);
  flag(w2);
  sentenceCheck(w2);
  shape(tms(w2.root), 'tms', 1);
  n = labelsOf(w2.root).nodes[node(w2.P, 's1')];
  assert.equal(n.label, 'PENDING');
  assert.ok(whyOf(n).includes('flag-open'));
});

test('T7 a committed pack P2 whose parent is P1: review sentences on P1 are STALE pack-repaired', () => {
  const w = world();
  confirm(w.root, w.A);
  const P1 = packWith(w.root, [w.A], [SENT('s1', [w.A.id])]);
  const R1 = putObj(w.root, mkReview({ pack: P1.id, sentences: [SENT('s1', [w.A.id])] }));
  const P2 = packWith(w.root, [w.A], [SENT('s1', [w.A.id]), SENT('s2', [w.A.id])], { parent: P1.id });
  commitPack(w.root, P1, [w.A], 'f1-research');
  commitReview(w.root, R1, 'f1-research');
  addCommit(w.root, { task: 'f1-repair', step: 'pack', outputs: [{ ...w.A, kind: 'card' }, { ...P2, kind: 'pack' }] });
  shape(tms(w.root), 'tms', 1);
  const N = labelsOf(w.root).nodes;
  assert.equal(N[node(R1, 's1')].label, 'STALE');
  assert.ok(whyOf(N[node(R1, 's1')]).includes('pack-repaired'));
  assert.equal(N[node(P2, 's1')].label, 'IN');
  assert.equal(N[node(P2, 's2')].label, 'IN');
});

test('T8 a verdict supported by an IN and a PENDING sentence is PENDING; a verdict with no supports is JUDGMENT', () => {
  const w = world();
  const B = putObj(w.root, mkCard({ tag: 'B' }));
  confirm(w.root, w.A);
  addStatus(w.root, B, 'witnessed', { witness_seq: 3 });
  const P = packWith(w.root, [w.A, B], []);
  const R = putObj(w.root, mkReview({
    pack: P.id,
    sentences: [SENT('s1', [w.A.id]), SENT('s2', [B.id])],
    verdicts: [{ approach_id: 'a1', verdict: 'promising', supports: ['s1', 's2'] }, { approach_id: 'a2', verdict: 'untested', supports: [] }],
  }));
  commitPack(w.root, P, [w.A, B]);
  commitReview(w.root, R);
  shape(tms(w.root), 'tms', 1);
  const V = labelsOf(w.root).verdicts;
  assert.equal(V[`${R.id}#a1`].label, 'PENDING');
  assert.equal(V[`${R.id}#a2`].label, 'JUDGMENT');
  assert.ok(whyOf(V[`${R.id}#a2`]).includes('unsupported'));
});

test('T9 dismissal bar: |value-baseline| 0.5 < sesoi 1.0 is standing; 1.5 is untested no-bound; a measure absent from sesoi is untested no-sesoi', () => {
  const scenario = ({ value, baseline, sesoi }) => {
    const w = world({ prot: { sesoi } });
    const C = putObj(w.root, mkCard({ tag: 'C', value, baseline, approach: 'a1', measure: 'm1' }));
    confirm(w.root, C);
    const P = packWith(w.root, [C], []);
    const R = putObj(w.root, mkReview({
      pack: P.id,
      sentences: [SENT('s1', [C.id], { approach: 'a1', measure: 'm1', applies: { task: ['repair'] } })],
      dismissals: [{ sid: 's1', verdict: 'wrong-form', supports: [C.id], outlist: [] }],
    }));
    commitPack(w.root, P, [C]);
    commitReview(w.root, R);
    shape(tms(w.root), 'tms', 0);
    return labelsOf(w.root).dismissals[`${R.id}#s1`];
  };
  assert.equal(scenario({ value: 10.5, baseline: 10, sesoi: { m1: 1.0 } }).label, 'standing');
  const wide = scenario({ value: 11.5, baseline: 10, sesoi: { m1: 1.0 } });
  assert.equal(wide.label, 'untested');
  assert.ok(whyOf(wide).includes('no-bound'));
  const nosesoi = scenario({ value: 10.5, baseline: 10, sesoi: { other: 1.0 } });
  assert.equal(nosesoi.label, 'untested');
  assert.ok(whyOf(nosesoi).includes('no-sesoi'));
});

test('T10 a confirmed card matching an outlist entry reopens the dismissal: exit 10, a check line with reason reopened; unchanged rerun exits 0 with no new line', () => {
  const w = world();
  const C = putObj(w.root, mkCard({ tag: 'C' }));
  const D = putObj(w.root, mkCard({ tag: 'D', approach: 'a2', measure: 'm2', effect: 'worsens' }));
  confirm(w.root, C);
  confirm(w.root, D);
  const P = packWith(w.root, [C], [SENT('s1', [C.id])]);
  const R = putObj(w.root, mkReview({
    pack: P.id,
    sentences: [SENT('s1', [C.id])],
    dismissals: [{ sid: 's1', verdict: 'not-worth-testing', supports: [C.id], outlist: [{ approach_id: 'a2', measure: 'm2', effect: 'worsens' }] }],
  }));
  commitPack(w.root, P, [C]);
  commitReview(w.root, R);
  const key = `${R.id}#s1`;
  const j = shape(tms(w.root), 'tms', 10);
  assert.deepEqual(j.result.reopened, [key]);
  const d = labelsOf(w.root).dismissals[key];
  assert.equal(d.label, 'reopened');
  assert.ok(whyOf(d).includes('outlist-match'));
  assert.ok(d.matched.includes(D.id));
  let checks = tmsChecks(w.root);
  assert.equal(checks.length, 1);
  const reopened = checks[0].data.reasons.find((x) => x.code === 'reopened');
  assert.ok(reopened, 'the check line carries a reopened reason');
  assert.deepEqual(reopened.detail, [key]);
  // unchanged rerun: not newly reopened
  const j2 = shape(tms(w.root), 'tms', 0);
  assert.deepEqual(j2.result.reopened, []);
  assert.equal(labelsOf(w.root).dismissals[key].label, 'reopened');
  checks = tmsChecks(w.root);
  assert.equal(checks.length, 1, 'no new check line on the unchanged rerun');
  verifyLedger(readLedger(w.root));
});

test('T11 a certificate whose read-set card gains a status line is STALE; unchanged it is VALID', () => {
  const w = world();
  confirm(w.root, w.A);
  const P = packWith(w.root, [w.A], [SENT('s1', [w.A.id])]);
  const R = putObj(w.root, mkReview({ pack: P.id, sentences: [SENT('s1', [w.A.id])] }));
  commitPack(w.root, P, [w.A]);
  commitReview(w.root, R);
  const readSet = [{ card_id: w.A.id, status_seq: 2 }];
  const X = putObj(w.root, {
    schema_version: 1, kind: 'certificate', task: 'f1-research', subject: R.id, pack: P.id, step_key: 'a'.repeat(64),
    read_set: readSet, read_set_sha: sha(canon(readSet)), session_label: 'clean',
    coverage: { approved: 1, covered: 1, not_covered: [] }, cited: { n: 1, confirmed: 1, failing: [] },
    plants: { k: 0, found: 0, contra_found: 0 }, result: 'certified', reasons: [],
  });
  let j = shape(tms(w.root), 'tms', 0);
  assert.equal(labelsOf(w.root).certificates[X.id], 'VALID');
  assert.deepEqual(j.result.stale_certificates, []);
  addStatus(w.root, w.A, 'confirmed', { reason: 'recheck', check: { batch: 'b1-3', item: 'i_3', verdict: 'confirmed' }, classes: J_CARD });
  j = shape(tms(w.root), 'tms', 0);
  assert.equal(labelsOf(w.root).certificates[X.id], 'STALE');
  assert.deepEqual(j.result.stale_certificates, [X.id]);
});

test('T12 --target f1-research.pack while only the review holds PENDING: exit 0', () => {
  const w = world();
  const B = putObj(w.root, mkCard({ tag: 'B' }));
  confirm(w.root, w.A);
  addStatus(w.root, B, 'witnessed', { witness_seq: 3 });
  const P = packWith(w.root, [w.A, B], [SENT('s1', [w.A.id])]);
  const R = putObj(w.root, mkReview({ pack: P.id, sentences: [SENT('s1', [B.id])] }));
  commitPack(w.root, P, [w.A, B]);
  commitReview(w.root, R);
  shape(tms(w.root), 'tms', 1); // no --target: every commit record counts
  const j = shape(tms(w.root, ['--target', 'f1-research.pack']), 'tms', 0);
  assert.deepEqual(j.result.bad_targets, []);
  assert.equal(labelsOf(w.root).nodes[node(R, 's1')].label, 'PENDING');
  const j2 = shape(tms(w.root, ['--target', 'f1-research.review']), 'tms', 1);
  assert.equal(j2.result.bad_targets.length, 1);
  assert.equal(j2.result.bad_targets[0].commit, 'f1-research.review');
});

test('T13 a cite to an absent card exits 2 dangling and writes no view; a torn last status line is ignored', () => {
  {
    const w = world();
    confirm(w.root, w.A);
    const P = packWith(w.root, [w.A], [SENT('s1', ['c_0000000000000000'])]);
    commitPack(w.root, P, [w.A]);
    const j = shape(tms(w.root), 'tms', 2);
    assertReason(j, 'dangling');
    noViews(w.root);
  }
  {
    const w = cleanWorld();
    const before = fs.readFileSync(statusPath(w.root));
    fs.appendFileSync(statusPath(w.root), '{"seq":3,"card_id":"c_');
    const torn = fs.readFileSync(statusPath(w.root));
    shape(tms(w.root), 'tms', 0);
    assert.equal(labelsOf(w.root).nodes[node(w.P, 's1')].label, 'IN');
    assert.equal(labelsOf(w.root).cards[w.A.id].status_seq, 2);
    assert.deepEqual(fs.readFileSync(statusPath(w.root)), torn, 'tms never rewrites the status file');
    assert.ok(torn.length > before.length);
  }
});

test('T13b an unparseable complete status line is 2 status-unreadable; a frozen protocol that no longer hashes is 2 protocol-unreadable; --target naming no commit record is 2 no-target', () => {
  {
    const w = cleanWorld();
    fs.appendFileSync(statusPath(w.root), 'this is not json\n');
    const j = shape(tms(w.root), 'tms', 2);
    assertReason(j, 'status-unreadable');
    noViews(w.root);
  }
  {
    const w = cleanWorld();
    fs.appendFileSync(path.join(w.root, w.prot.rel), ' ');
    const j = shape(tms(w.root), 'tms', 2);
    assertReason(j, 'protocol-unreadable');
    noViews(w.root);
  }
  {
    const w = cleanWorld();
    const j = shape(tms(w.root, ['--target', 'f9-nothing.pack']), 'tms', 2);
    assertReason(j, 'no-target');
    noViews(w.root);
  }
});

test('T14 two runs on equal inputs give identical labels.json bytes and one check line', () => {
  const { root } = cleanWorld();
  shape(tms(root), 'tms', 0);
  const first = fs.readFileSync(path.join(root, 'views', 'labels.json'));
  const firstRepair = fs.readFileSync(path.join(root, 'views', 'repair.json'));
  shape(tms(root), 'tms', 0);
  assert.deepEqual(fs.readFileSync(path.join(root, 'views', 'labels.json')), first);
  assert.deepEqual(fs.readFileSync(path.join(root, 'views', 'repair.json')), firstRepair);
  assert.equal(tmsChecks(root).length, 1);
  verifyLedger(readLedger(root));
});

test('T15 stale --ce is 64 and writes nothing; lock busy is 75; --dry-run writes no view and no line', { concurrency: false }, () => {
  {
    const { root } = cleanWorld();
    const before = snapshot(root);
    const r = run('tms', ['--root', root, '--ce', '2', '--now', NOW], root);
    shape(r, 'tms', 64);
    assertReason(r.json, 'stale-ce');
    assert.deepEqual(snapshot(root), before);
  }
  {
    const { root } = cleanWorld({ params: { lock_retries: 3 } });
    const before = snapshot(root);
    const lock = holdLock(root);
    try {
      const r = tms(root);
      shape(r, 'tms', 75);
      assertReason(r.json, 'lock-busy');
    } finally { lock.release(); }
    assert.deepEqual(snapshot(root), before);
  }
  {
    const { root } = cleanWorld();
    const before = snapshot(root);
    const j = shape(tms(root, ['--dry-run']), 'tms', 0);
    assert.equal(j.dry_run, true);
    assert.deepEqual(j.ledger_seq, []);
    assert.deepEqual(snapshot(root), before);
    noViews(root);
  }
});
