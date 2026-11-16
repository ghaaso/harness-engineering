// promote.mjs tests, written from spec/promote.mjs.md and CONTRACT.md only (the script's code was not read).
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
// promote specific helpers
// ---------------------------------------------------------------------------------------------
const SESSION = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const OTHER_SESSION = 'ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee';
const CLASSES = ['J1', 'J2', 'J3', 'J4'];

function writeQual(root, quals = {}) {
  const classes = {};
  for (const c of CLASSES) classes[c] = { qualified: quals[c] ?? true };
  fs.writeFileSync(path.join(root, 'store', 'qualification.json'), JSON.stringify({ schema_version: 1, classes, escape: { n: 0, escaped: 0 } }, null, 2));
}
// a run root with coordinator session, qualification and synthetic cards A, B, C (more with o.tags)
function pw(o = {}) {
  const root = makeRoot({ session: o.session === undefined ? SESSION : o.session, params: o.params });
  if (!o.noQual) writeQual(root, o.quals);
  const cards = {};
  for (const t of o.tags ?? ['A', 'B', 'C']) cards[t] = putObj(root, mkCard({ tag: t }));
  return { root, cards };
}
const itemId = (tag) => 'i_' + sha('item-' + tag).slice(0, 16);
// items: [{tag, card, seed?, node?, sentence?}] in batch order
function makeBatch(root, { batch = 'b1-1', items }) {
  const qdir = path.join(root, 'queue', batch);
  fs.mkdirSync(qdir, { recursive: true });
  const key = {};
  const ids = {};
  for (const it of items) {
    const id = itemId(it.tag);
    ids[it.tag] = id;
    const cardValue = it.seed ? { ...it.card.value, quote: 'seeded quote ' + it.tag } : it.card.value;
    const qi = { item: id, card: cardValue, window: 'synthetic window text for ' + it.tag };
    if (it.sentence) qi.sentence = it.sentence;
    fs.writeFileSync(path.join(qdir, `item-${id}.json`), canon(qi));
    if (it.seed) key[id] = { seed: true, class: 'J1', operator: 'swap-number', from_card: it.card.id, seed_id: 's_' + sha('seed-' + it.tag).slice(0, 16) };
    else {
      key[id] = { seed: false, card_id: it.card.id };
      if (it.node) key[id].node = it.node;
    }
  }
  fs.writeFileSync(path.join(qdir, 'batch.json'), canon({ batch, mode: 'intake', items: items.map((it) => itemId(it.tag)) }));
  fs.writeFileSync(path.join(root, 'sealed', 'seeds', batch + '.json'), canon({ batch, rng_seed: 'rng-test', items: key }));
  return { batch, ids, order: items.map((it) => itemId(it.tag)) };
}
// a synthetic transcript in the CONTRACT 4.8 shape: tool uses with results, structured output attachments
function writeTranscript(file, { session = SESSION, cwd, tools = [], structured = [] }) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const recs = [];
  let t = 0;
  const ts = () => new Date(Date.parse(NOW) + t++ * 1000).toISOString();
  tools.forEach((tl, i) => {
    recs.push({ type: 'assistant', uuid: `u-a${i}`, sessionId: session, cwd, timestamp: ts(), message: { id: `msg_${i}`, type: 'message', role: 'assistant', model: 'claude-test', content: [{ type: 'tool_use', id: `toolu_${i}`, name: tl.name, input: tl.input }], usage: { input_tokens: 10, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 5 } } });
    recs.push({ type: 'user', uuid: `u-r${i}`, sessionId: session, cwd, timestamp: ts(), message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: `toolu_${i}`, content: 'ok', is_error: false }] } });
  });
  structured.forEach((data, i) => recs.push({ type: 'attachment', uuid: `u-s${i}`, sessionId: session, cwd, timestamp: ts(), attachment: { type: 'structured_output', data } }));
  fs.writeFileSync(file, recs.map((r) => JSON.stringify(r)).join('\n') + '\n');
}
const defaultTranscriptPath = (root) => path.join(root, 'transcripts', 'p', SESSION, 'subagents', 'agent-1.jsonl');
// the checker's own transcript: Reads inside queue/<b>/ and its verdicts as a structured result
function checkerTranscript(root, b, verdicts, o = {}) {
  const file = o.file ?? defaultTranscriptPath(root);
  const reads = [{ name: 'Read', input: { file_path: path.join(root, 'queue', b.batch, 'batch.json') } }];
  for (const id of b.order) reads.push({ name: 'Read', input: { file_path: path.join(root, 'queue', b.batch, `item-${id}.json`) } });
  writeTranscript(file, { cwd: path.join(root, 'queue', b.batch), tools: [...reads, ...(o.extraTools ?? [])], structured: o.structured ?? [{ schema_version: 1, verdicts }] });
  return file;
}
const promoteW = (root, extra = []) => run('promote', ['--root', root, '--ce', '1', '--from', 'witness', '--now', NOW, ...extra], root);
const promoteB = (root, batch, transcript, extra = []) => run('promote', ['--root', root, '--ce', '1', '--batch', batch, '--transcript', transcript, '--now', NOW, ...extra], root);
const promoteRevert = (root, cls, extra = []) => run('promote', ['revert', '--root', root, '--ce', '1', '--class', cls, '--now', NOW, ...extra], root);
const promoteLines = (root) => readLedger(root).filter((l) => l.kind === 'promote');
const lineOf = (lines, card) => lines.filter((l) => l.card_id === card.id).at(-1);
function assertNoConfirmed(lines) { assert.ok(!lines.some((l) => l.status === 'confirmed'), 'no confirmation may be written'); }
function assertOnlyIncidentsAfter(root, n) {
  const added = readLedger(root).slice(n);
  assert.ok(added.every((l) => l.kind === 'incident'), 'a tamper exit appends at most an incident line');
  verifyLedger(readLedger(root));
}
// T5 world: three witnessed real cards and one seed, qualification as given
function t5World(quals) {
  const w = pw({ quals });
  const { A, B, C } = w.cards;
  addStatus(w.root, A, 'witnessed', { witness_seq: 1 });
  addStatus(w.root, B, 'witnessed', { witness_seq: 2 });
  addStatus(w.root, C, 'witnessed', { witness_seq: 3 });
  const b = makeBatch(w.root, { items: [{ tag: 'A', card: A }, { tag: 'S', card: A, seed: true }, { tag: 'B', card: B }, { tag: 'C', card: C }] });
  const verdicts = [
    { item: b.ids.A, verdict: 'confirmed' },
    { item: b.ids.S, verdict: 'confirmed' },
    { item: b.ids.B, verdict: 'number_mismatch' },
    { item: b.ids.C, verdict: 'unclear' },
  ];
  const tr = checkerTranscript(w.root, b, verdicts);
  return { ...w, b, tr };
}
// sentence item world: one confirmed card, one sentence item
function sentWorld({ quals, verdict, noNode }) {
  const w = pw({ tags: ['A'], quals });
  confirm(w.root, w.cards.A);
  const b = makeBatch(w.root, { items: [{ tag: 'A', card: w.cards.A, sentence: SENT('s1', [w.cards.A.id]), node: noNode ? undefined : 'r_0123456789abcdef#s1' }] });
  const tr = checkerTranscript(w.root, b, [{ item: b.ids.A, verdict }]);
  return { ...w, b, tr };
}

// ---------------------------------------------------------------------------------------------
// Behaviours (spec/promote.mjs.md "Behaviours")
// ---------------------------------------------------------------------------------------------

test('T1 --from witness: records (witnessed, unverifiable) give two lines seq 1-2 with witness_seq and one promote line without batch; a rerun writes nothing', () => {
  const w = pw();
  const { A, B } = w.cards;
  addWitness(w.root, A, 'witnessed');
  addWitness(w.root, B, 'unverifiable');
  const j = shape(promoteW(w.root), 'promote', 0);
  const lines = statusLines(w.root);
  assert.equal(lines.length, 2);
  assert.deepEqual([lines[0].seq, lines[0].card_id, lines[0].status, lines[0].witness_seq, lines[0].card_sha, lines[0].at], [1, A.id, 'witnessed', 1, A.sha, NOW]);
  assert.deepEqual([lines[1].seq, lines[1].card_id, lines[1].status, lines[1].witness_seq, lines[1].reason], [2, B.id, 'unverifiable', 2, 'no-snapshot']);
  assert.equal(j.result.mode, 'witness');
  assert.equal(j.result.written.length, 2);
  const pl = promoteLines(w.root);
  assert.equal(pl.length, 1);
  assert.equal(pl[0].data.mode, 'witness');
  assert.equal(pl[0].data.first_seq, 1);
  assert.equal(pl[0].data.last_seq, 2);
  assert.ok(!('batch' in pl[0].data), 'a witness-mode promote line has no batch');
  assert.equal(j.ledger_seq.length, 1);
  verifyLedger(readLedger(w.root));
  const before = snapshot(w.root);
  const j2 = shape(promoteW(w.root), 'promote', 0);
  assert.deepEqual(j2.result.written, []);
  assert.deepEqual(snapshot(w.root), before);
});

test('T2 --from witness: of two records for one card after the cursor (seq 3 witnessed, seq 5 rejected) only the last gives a line', () => {
  const w = pw();
  const { A } = w.cards;
  addWitness(w.root, A, 'witnessed', { seq: 3 });
  addWitness(w.root, A, 'rejected', { seq: 5, reason: 'quote-missing' });
  const j = shape(promoteW(w.root), 'promote', 0);
  const lines = statusLines(w.root);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].card_id, A.id);
  assert.equal(lines[0].status, 'rejected');
  assert.equal(lines[0].reason, 'quote-missing');
  assert.equal(lines[0].witness_seq, 5);
  assert.equal(j.result.written.length, 1);
});

test('T3 --from witness: witnessed on a confirmed card writes no line; rejected on a confirmed card writes a rejected line', () => {
  const w = pw();
  const { A, B } = w.cards;
  addStatus(w.root, A, 'witnessed', { witness_seq: 1 });
  addStatus(w.root, B, 'witnessed', { witness_seq: 2 });
  addStatus(w.root, A, 'confirmed', { check: { batch: 'b1-1', item: itemId('A'), verdict: 'confirmed' }, classes: J_CARD });
  addStatus(w.root, B, 'confirmed', { check: { batch: 'b1-1', item: itemId('B'), verdict: 'confirmed' }, classes: J_CARD });
  addWitness(w.root, A, 'witnessed', { seq: 1 });
  addWitness(w.root, B, 'witnessed', { seq: 2 });
  addWitness(w.root, A, 'witnessed', { seq: 3 }); // re-witnessed after confirmation
  addWitness(w.root, B, 'rejected', { seq: 4, reason: 'number-missing' });
  const n0 = statusLines(w.root).length;
  const j = shape(promoteW(w.root), 'promote', 0);
  const added = statusLines(w.root).slice(n0);
  assert.equal(added.length, 1);
  assert.equal(added[0].card_id, B.id);
  assert.equal(added[0].status, 'rejected');
  assert.equal(added[0].witness_seq, 4);
  assert.equal(j.result.written.length, 1);
  assert.equal(lineOf(statusLines(w.root), A).status, 'confirmed', 'the confirmation of A stands');
});

test('T4 --from witness: a record whose card_sha differs, a card-changed record, and an s_ record exit 3 and append nothing', () => {
  const scenario = (mk, code) => {
    const w = pw();
    mk(w);
    const n = readLedger(w.root).length;
    const j = shape(promoteW(w.root), 'promote', 3);
    assertReason(j, code);
    assert.ok(!fs.existsSync(statusPath(w.root)) || statusLines(w.root).length === 0, 'nothing appended to card_status');
    assertOnlyIncidentsAfter(w.root, n);
  };
  scenario((w) => addWitness(w.root, w.cards.A, 'witnessed', { sha: 'f'.repeat(64) }), 'card-changed');
  scenario((w) => addWitness(w.root, w.cards.A, 'rejected', { reason: 'card-changed' }), 'card-changed');
  scenario((w) => {
    appendJsonl(witnessPath(w.root), { seq: 1, card_id: 's_0123456789abcdef', card_sha: ZERO, result: 'witnessed', number_bound: true, reason: 'ok', source_changed: false, w: 300, at: NOW });
  }, 'seed-id');
  // an earlier valid record in the same run is not written when a later one breaches (nothing written in this run)
  const w = pw();
  addWitness(w.root, w.cards.A, 'witnessed');
  addWitness(w.root, w.cards.B, 'witnessed', { sha: 'e'.repeat(64) });
  shape(promoteW(w.root), 'promote', 3);
  assert.ok(!fs.existsSync(statusPath(w.root)) || statusLines(w.root).length === 0);
});

test('T5 --batch: three real items and a seed give confirmed, rejected number_mismatch and witnessed unclear lines, none for the seed, seeds_dropped 1', () => {
  const w = t5World({});
  const n0 = statusLines(w.root).length;
  const j = shape(promoteB(w.root, w.b.batch, w.tr), 'promote', 0);
  const added = statusLines(w.root).slice(n0);
  assert.equal(added.length, 3, 'no line for the seed');
  const [la, lb, lc] = added; // batch order: A, (seed), B, C
  assert.equal(la.card_id, w.cards.A.id);
  assert.equal(la.status, 'confirmed');
  assert.deepEqual(la.check, { batch: 'b1-1', item: w.b.ids.A, verdict: 'confirmed' });
  assert.deepEqual(la.classes, ['J1', 'J2', 'J4']);
  assert.equal(lb.card_id, w.cards.B.id);
  assert.equal(lb.status, 'rejected');
  assert.equal(lb.reason, 'number_mismatch');
  assert.equal(lb.check.verdict, 'number_mismatch');
  assert.equal(lc.card_id, w.cards.C.id);
  assert.equal(lc.status, 'witnessed');
  assert.equal(lc.reason, 'unclear');
  assert.equal(j.result.seeds_dropped, 1);
  assert.equal(j.result.written.length, 3);
  assert.deepEqual(j.result.written.map((x) => x.status), ['confirmed', 'rejected', 'witnessed']);
  for (const x of j.result.written) assert.ok('seq' in x && 'card_id' in x && 'reason' in x);
  verifyLedger(readLedger(w.root));
});

test('T6 --batch with J2 unqualified: the confirmed item gets status witnessed, reason unqualified', () => {
  const w = t5World({ J2: false });
  const n0 = statusLines(w.root).length;
  const j = shape(promoteB(w.root, w.b.batch, w.tr), 'promote', 0);
  const added = statusLines(w.root).slice(n0);
  assertNoConfirmed(added);
  const la = lineOf(added, w.cards.A);
  assert.equal(la.status, 'witnessed');
  assert.equal(la.reason, 'unqualified');
  assert.equal(la.check.verdict, 'confirmed');
  assert.equal(lineOf(added, w.cards.B).status, 'rejected', 'a rejection does not depend on qualification');
  assert.equal(j.result.seeds_dropped, 1);
});

test('T7 an off-enum verdict "approved" and an item with no verdict are both unclear, exit 1', () => {
  const w = pw({ tags: ['A', 'B'] });
  addStatus(w.root, w.cards.A, 'witnessed', { witness_seq: 1 });
  addStatus(w.root, w.cards.B, 'witnessed', { witness_seq: 2 });
  const b = makeBatch(w.root, { items: [{ tag: 'A', card: w.cards.A }, { tag: 'B', card: w.cards.B }] });
  const tr = checkerTranscript(w.root, b, [{ item: b.ids.A, verdict: 'approved' }]);
  const n0 = statusLines(w.root).length;
  const j = shape(promoteB(w.root, b.batch, tr), 'promote', 1);
  const un = Object.fromEntries(j.result.unclear.map((x) => [x.item, x.reason]));
  assert.equal(un[b.ids.A], 'verdict-off-enum');
  assert.equal(un[b.ids.B], 'verdict-missing');
  assertNoConfirmed(statusLines(w.root).slice(n0));
});

test('T7b two different verdicts for one item are unclear verdict-conflict, exit 1', () => {
  const w = pw({ tags: ['A'] });
  addStatus(w.root, w.cards.A, 'witnessed', { witness_seq: 1 });
  const b = makeBatch(w.root, { items: [{ tag: 'A', card: w.cards.A }] });
  const tr = checkerTranscript(w.root, b, [{ item: b.ids.A, verdict: 'confirmed' }, { item: b.ids.A, verdict: 'number_mismatch' }]);
  const n0 = statusLines(w.root).length;
  const j = shape(promoteB(w.root, b.batch, tr), 'promote', 1);
  assert.deepEqual(j.result.unclear.map((x) => [x.item, x.reason]), [[b.ids.A, 'verdict-conflict']]);
  assertNoConfirmed(statusLines(w.root).slice(n0));
});

test('T7c a verdict for an id that is not in the batch is ignored and reported as unknown_items', () => {
  const w = pw({ tags: ['A'] });
  addStatus(w.root, w.cards.A, 'witnessed', { witness_seq: 1 });
  const b = makeBatch(w.root, { items: [{ tag: 'A', card: w.cards.A }] });
  const stray = 'i_ffffffffffffffff';
  const tr = checkerTranscript(w.root, b, [{ item: b.ids.A, verdict: 'confirmed' }, { item: stray, verdict: 'confirmed' }]);
  const n0 = statusLines(w.root).length;
  const j = shape(promoteB(w.root, b.batch, tr), 'promote', 0);
  const u = j.result.unknown_items;
  assert.ok(Array.isArray(u) ? u.includes(stray) : u >= 1, 'unknown_items names or counts the stray verdict');
  assert.equal(statusLines(w.root).length, n0 + 1, 'only the real item got a line');
});

test('T8 a checker transcript that Reads outside queue/<b>/ or uses WebFetch makes every item unclear checker-out-of-role, exit 1, no confirmation', () => {
  for (const extra of [
    (root) => ({ name: 'Read', input: { file_path: path.join(root, 'store', 'objects', 'c_0000000000000000.json') } }),
    () => ({ name: 'WebFetch', input: { url: 'https://example.test/page' } }),
  ]) {
    const w = pw({ tags: ['A', 'B'] });
    addStatus(w.root, w.cards.A, 'witnessed', { witness_seq: 1 });
    addStatus(w.root, w.cards.B, 'witnessed', { witness_seq: 2 });
    const b = makeBatch(w.root, { items: [{ tag: 'A', card: w.cards.A }, { tag: 'B', card: w.cards.B }] });
    const tr = checkerTranscript(w.root, b, [{ item: b.ids.A, verdict: 'confirmed' }, { item: b.ids.B, verdict: 'confirmed' }], { extraTools: [extra(w.root)] });
    const n0 = statusLines(w.root).length;
    const j = shape(promoteB(w.root, b.batch, tr), 'promote', 1);
    const un = Object.fromEntries(j.result.unclear.map((x) => [x.item, x.reason]));
    assert.equal(un[b.ids.A], 'checker-out-of-role');
    assert.equal(un[b.ids.B], 'checker-out-of-role');
    assertNoConfirmed(statusLines(w.root).slice(n0));
  }
});

test('T9 a transcript inside wt/ or in another session folder is exit 1 transcript-outside; an absent path is 2 transcript-missing; a missing key is 2 no-key', () => {
  const w = t5World({});
  const n0 = statusLines(w.root).length;
  // inside an attempt folder
  const inWt = path.join(w.root, 'wt', 'f1-research-e1', 'agent-1.jsonl');
  checkerTranscript(w.root, w.b, [], { file: inWt });
  let j = shape(promoteB(w.root, w.b.batch, inWt), 'promote', 1);
  assertReason(j, 'transcript-outside');
  // another session's folder
  const other = path.join(w.root, 'transcripts', 'p', OTHER_SESSION, 'subagents', 'agent-1.jsonl');
  checkerTranscript(w.root, w.b, [], { file: other });
  j = shape(promoteB(w.root, w.b.batch, other), 'promote', 1);
  assertReason(j, 'transcript-outside');
  assert.equal(statusLines(w.root).length, n0, 'nothing written by either refusal');
  // right place, no file
  j = shape(promoteB(w.root, w.b.batch, path.join(w.root, 'transcripts', 'p', SESSION, 'subagents', 'agent-9.jsonl')), 'promote', 2);
  assertReason(j, 'transcript-missing');
  // key absent
  fs.rmSync(path.join(w.root, 'sealed', 'seeds', w.b.batch + '.json'));
  j = shape(promoteB(w.root, w.b.batch, w.tr), 'promote', 2);
  assertReason(j, 'no-key');
  assert.equal(statusLines(w.root).length, n0);
});

test('T9b a missing batch.json is 2 no-batch; a coordinator with no session is 2 no-coordinator-session', () => {
  {
    const w = t5World({});
    fs.rmSync(path.join(w.root, 'queue', w.b.batch, 'batch.json'));
    const j = shape(promoteB(w.root, w.b.batch, w.tr), 'promote', 2);
    assertReason(j, 'no-batch');
  }
  {
    const w = pw({ session: null });
    addStatus(w.root, w.cards.A, 'witnessed', { witness_seq: 1 });
    const b = makeBatch(w.root, { items: [{ tag: 'A', card: w.cards.A }] });
    const tr = checkerTranscript(w.root, b, [{ item: b.ids.A, verdict: 'confirmed' }]);
    const n0 = statusLines(w.root).length;
    const j = shape(promoteB(w.root, b.batch, tr), 'promote', 2);
    assertReason(j, 'no-coordinator-session');
    assert.equal(statusLines(w.root).length, n0);
  }
});

test('T10 a second run for the same batch exits 0 already and writes nothing', () => {
  const w = t5World({});
  shape(promoteB(w.root, w.b.batch, w.tr), 'promote', 0);
  const before = snapshot(w.root);
  const j = shape(promoteB(w.root, w.b.batch, w.tr), 'promote', 0);
  assert.ok(JSON.stringify([j.reasons, j.result]).includes('already'), 'the answer says already');
  assert.deepEqual(snapshot(w.root), before);
});

test('T11 a queue item whose card differs from the stored card exits 3 card-changed and writes no status line', () => {
  const w = t5World({});
  const n0 = statusLines(w.root).length;
  const nl = readLedger(w.root).length;
  const f = path.join(w.root, 'queue', w.b.batch, `item-${w.b.ids.B}.json`);
  const qi = JSON.parse(fs.readFileSync(f, 'utf8'));
  qi.card.quote = 'a quote that was edited after storing';
  fs.writeFileSync(f, canon(qi));
  const j = shape(promoteB(w.root, w.b.batch, w.tr), 'promote', 3);
  assertReason(j, 'card-changed');
  assert.equal(statusLines(w.root).length, n0);
  assertOnlyIncidentsAfter(w.root, nl);
});

test('T12 revert --class J2: two checker-confirmed cards fall back to witnessed unqualified-revert, a card confirmed by no check stays; rerun is a no-op; a qualified class is exit 1; J3 reverts nothing', () => {
  const w = pw({ quals: { J1: true, J2: false, J3: false, J4: true } });
  const { A, B, C } = w.cards;
  for (const [i, c] of [A, B, C].entries()) addStatus(w.root, c, 'witnessed', { witness_seq: i + 1 });
  addStatus(w.root, A, 'confirmed', { check: { batch: 'b1-1', item: itemId('A'), verdict: 'confirmed' }, classes: J_CARD });
  addStatus(w.root, B, 'confirmed', { check: { batch: 'b1-1', item: itemId('B'), verdict: 'confirmed' }, classes: J_CARD });
  addStatus(w.root, C, 'confirmed', { reason: 'manual' });
  const n0 = statusLines(w.root).length;
  // J3: no confirmation relies on it
  let j = shape(promoteRevert(w.root, 'J3'), 'promote', 0);
  assert.equal(statusLines(w.root).length, n0);
  assert.equal(promoteLines(w.root).length, 0);
  // J2
  j = shape(promoteRevert(w.root, 'J2'), 'promote', 0);
  assert.equal(j.result.mode, 'revert');
  const added = statusLines(w.root).slice(n0);
  assert.equal(added.length, 2);
  assert.deepEqual(added.map((l) => l.card_id).sort(), [A.id, B.id].sort());
  for (const l of added) {
    assert.equal(l.status, 'witnessed');
    assert.equal(l.reason, 'unqualified-revert');
    assert.deepEqual(l.classes, ['J2']);
  }
  assert.equal(lineOf(statusLines(w.root), C).status, 'confirmed', 'a card confirmed by no check is not reverted');
  const pl = promoteLines(w.root);
  assert.equal(pl.length, 1);
  assert.equal(pl[0].data.mode, 'revert');
  assert.equal(pl[0].data.class, 'J2');
  assert.equal(pl[0].data.first_seq, n0 + 1);
  assert.equal(pl[0].data.last_seq, n0 + 2);
  verifyLedger(readLedger(w.root));
  // rerun
  const before = snapshot(w.root);
  shape(promoteRevert(w.root, 'J2'), 'promote', 0);
  assert.deepEqual(snapshot(w.root), before);
  // J2 qualified: refused
  writeQual(w.root, { J1: true, J2: true, J3: false, J4: true });
  j = shape(promoteRevert(w.root, 'J2'), 'promote', 1);
  assertReason(j, 'class-qualified');
});

test('T12b revert with no qualification.json is exit 2 no-qualification', () => {
  const w = pw({ noQual: true });
  addStatus(w.root, w.cards.A, 'confirmed', { check: { batch: 'b1-1', item: itemId('A'), verdict: 'confirmed' }, classes: J_CARD });
  const j = shape(promoteRevert(w.root, 'J2'), 'promote', 2);
  assertReason(j, 'no-qualification');
  assert.equal(statusLines(w.root).length, 1);
});

test('T13 a torn last line in card_status.jsonl is moved to .corrupt and the new seq follows the last complete line; the ledger verifies', () => {
  const w = pw();
  const { A, B } = w.cards;
  addStatus(w.root, A, 'witnessed', { witness_seq: 1 });
  fs.appendFileSync(statusPath(w.root), '{"seq":2,"card');
  addWitness(w.root, A, 'witnessed', { seq: 1 });
  addWitness(w.root, B, 'witnessed', { seq: 2 });
  shape(promoteW(w.root), 'promote', 0);
  const lines = statusLines(w.root);
  assert.equal(lines.length, 2);
  assert.equal(lines[1].seq, 2);
  assert.equal(lines[1].card_id, B.id);
  assert.ok(fs.readFileSync(statusPath(w.root), 'utf8').endsWith('\n'), 'no torn bytes left in the file');
  const corrupt = statusPath(w.root) + '.corrupt';
  assert.ok(fs.existsSync(corrupt), 'the torn tail was kept in .corrupt');
  assert.ok(fs.readFileSync(corrupt, 'utf8').includes('{"seq":2,"card'));
  verifyLedger(readLedger(w.root));
  assert.equal(promoteLines(w.root).length, 1);
});

test('T14 stale --ce is 64 and writes nothing; lock busy is 75; --from witness with --batch is 66; --class J5 is 66; --dry-run lists lines and changes nothing', { concurrency: false }, () => {
  const mk = (params) => {
    const w = pw({ params });
    addWitness(w.root, w.cards.A, 'witnessed');
    addWitness(w.root, w.cards.B, 'unverifiable');
    return w;
  };
  {
    const w = mk();
    const before = snapshot(w.root);
    const r = run('promote', ['--root', w.root, '--ce', '9', '--from', 'witness', '--now', NOW], w.root);
    shape(r, 'promote', 64);
    assertReason(r.json, 'stale-ce');
    assert.deepEqual(snapshot(w.root), before);
  }
  {
    const w = mk({ lock_retries: 3 });
    const before = snapshot(w.root);
    const lock = holdLock(w.root);
    try {
      const r = promoteW(w.root);
      shape(r, 'promote', 75);
      assertReason(r.json, 'lock-busy');
    } finally { lock.release(); }
    assert.deepEqual(snapshot(w.root), before);
  }
  {
    const w = mk();
    const before = snapshot(w.root);
    usageExit(run('promote', ['--root', w.root, '--ce', '1', '--from', 'witness', '--batch', 'b1-1', '--transcript', path.join(w.root, 'x.jsonl')], w.root));
    usageExit(run('promote', ['--root', w.root, '--ce', '1'], w.root));
    usageExit(promoteRevert(w.root, 'J5'));
    assert.deepEqual(snapshot(w.root), before);
  }
  {
    const w = mk();
    const before = snapshot(w.root);
    const j = shape(promoteW(w.root, ['--dry-run']), 'promote', 0);
    assert.equal(j.dry_run, true);
    assert.equal(j.result.written.length, 2);
    assert.deepEqual(j.ledger_seq, []);
    assert.deepEqual(snapshot(w.root), before);
    assert.ok(!fs.existsSync(statusPath(w.root)));
  }
});

test('T15 sentence items: a confirmed J1-J4 verdict gives a sentence-check line with classes and the status unchanged; J3 unqualified gives sentence-unqualified; outside_conditions keeps its verdict; a missing node is 2 no-key', () => {
  const node1 = 'r_0123456789abcdef#s1';
  {
    const w = sentWorld({ verdict: 'confirmed' });
    const n0 = statusLines(w.root).length;
    shape(promoteB(w.root, w.b.batch, w.tr), 'promote', 0);
    const added = statusLines(w.root).slice(n0);
    assert.equal(added.length, 1);
    assert.equal(added[0].status, 'confirmed', 'status unchanged');
    assert.equal(added[0].reason, 'sentence-check');
    assert.deepEqual(added[0].check, { batch: 'b1-1', item: w.b.ids.A, verdict: 'confirmed', node: node1 });
    assert.deepEqual(added[0].classes, ['J1', 'J2', 'J3', 'J4']);
  }
  {
    const w = sentWorld({ verdict: 'confirmed', quals: { J3: false } });
    const n0 = statusLines(w.root).length;
    shape(promoteB(w.root, w.b.batch, w.tr), 'promote', 0);
    const added = statusLines(w.root).slice(n0);
    assert.equal(added.length, 1);
    assert.equal(added[0].status, 'confirmed');
    assert.equal(added[0].reason, 'sentence-unqualified');
    assert.equal(added[0].check.node, node1);
  }
  {
    const w = sentWorld({ verdict: 'outside_conditions' });
    const n0 = statusLines(w.root).length;
    shape(promoteB(w.root, w.b.batch, w.tr), 'promote', 0);
    const added = statusLines(w.root).slice(n0);
    assert.equal(added.length, 1);
    assert.equal(added[0].status, 'confirmed', 'no status change');
    assert.equal(added[0].reason, 'sentence-check');
    assert.equal(added[0].check.verdict, 'outside_conditions');
    assert.equal(added[0].check.node, node1);
  }
  {
    const w = sentWorld({ verdict: 'confirmed', noNode: true });
    const n0 = statusLines(w.root).length;
    const j = shape(promoteB(w.root, w.b.batch, w.tr), 'promote', 2);
    assertReason(j, 'no-key');
    assert.equal(statusLines(w.root).length, n0, 'an incomplete key writes nothing');
  }
});

test('T16 the promote line of a checker run is {mode: checker, batch, first_seq, last_seq}', () => {
  const w = t5World({});
  const n0 = statusLines(w.root).length;
  const j = shape(promoteB(w.root, w.b.batch, w.tr), 'promote', 0);
  const pl = promoteLines(w.root);
  assert.equal(pl.length, 1);
  assert.deepEqual(pl[0].data, { mode: 'checker', batch: 'b1-1', first_seq: n0 + 1, last_seq: n0 + 3 });
  assert.equal(j.ledger_seq.length, 1);
  verifyLedger(readLedger(w.root));
});

// ---------------------------------------------------------------------------------------------
// Needs the app (spec/promote.mjs.md "Needs the app"; CONTRACT 7 items 7 and 1)
// ---------------------------------------------------------------------------------------------

test('needs-app 7: a real checker verdict appears in its own helper transcript as a structured result, and checker helper transcripts lie under the coordinator subagents folder', { skip: 'needs the app' }, () => {});

test('needs-app 1: the checker could only Read its batch (promote detects an out-of-role tool use, it does not prevent one)', { skip: 'needs the app' }, () => {});
