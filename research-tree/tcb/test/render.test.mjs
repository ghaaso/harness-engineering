// render.mjs tests, written from spec/render.mjs.md and CONTRACT.md only (the script's code was not read).
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
const PREFIX = { card: 'c', pack: 'p', review: 'r', manifest: 'm', certificate: 'x', hazards: 'd', stpa: 'd', fmea: 'd' };

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

// The script lives in tcb/scripts/ (CONTRACT) or, while being built, in tcb/ itself.
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
  blind_fail_rate: 0.8, batch_size: 12, index_words: 120, f5_given: true, fetch_max_bytes: 10485760,
  fetch_timeout_ms: 30000, fetch_max_redirects: 5, hook_deadline_ms: 5000, selftest_case_ms: 60000,
  sleep_gap_ms: 600000, lock_retries: 3, allow_loopback: false, transcripts_root: 'C:/Users/User/.claude/projects',
  proc_exe: PS_EXE, user_files: [], tcb_paths_protected: ['tcb/', 'sealed/', 'review-in/', '.claude/', 'run/', 'store/', '.git/'],
  weights: { read: 0.05, write: 1.25, out: 5 },
};
function thresholdsFile(over, gates) {
  const vals = { ...DEFAULT_PARAMS, ...over };
  const params = {};
  for (const [name, value] of Object.entries(vals)) {
    params[name] = { value, unit: 'tests only', source: 'guess', gate: value !== null };
  }
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
  const root = fs.mkdtempSync(path.join(TMP, 'rnd-'));
  ROOTS.push(root);
  for (const d of ['tcb', 'plan/frozen', 'plan/protocols', 'plan/our-work', 'run', 'store/objects', 'store/commits', 'store/status', 'views', 'queue', 'sealed/seeds', 'sealed/plants', 'sealed/heldout', 'wt', 'transcripts']) {
    fs.mkdirSync(path.join(root, d), { recursive: true });
  }
  for (const sub of ['schemas', 'profiles', 'settings', 'agents', 'briefs']) {
    const src = path.join(TCB, sub);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(root, 'tcb', sub), { recursive: true });
  }
  setThresholds(root, params, gates);
  fs.writeFileSync(path.join(root, 'run', 'coord.json'), JSON.stringify({ schema_version: 1, ce, started_at: NOW, tcb_commit: 'a'.repeat(40) }, null, 2));
  writeTasks(root, tasks);
  return root;
}
function writeTasks(root, rows, rev = 0) {
  fs.writeFileSync(path.join(root, 'run', 'tasks.json'), JSON.stringify({ schema_version: 1, rev, tasks: rows }, null, 2));
}
let sidCounter = 0;
const newSid = () => `00000000-0000-4000-8000-${String(++sidCounter).padStart(12, '0')}`;
function row(o) {
  const attempts = (o.sessions ?? []).map((s, i) => ({ epoch: i + 1, folder: `wt/${o.task}-e${i + 1}`, session: s, stop: 'none' }));
  return {
    task: o.task, field: o.field ?? null, stage: o.stage ?? 'research', role: o.role ?? 'child', steps: o.steps ?? ['pack'], deps: o.deps ?? [],
    question_ids: o.qids ?? [], e_task: 100000, tier: 'sonnet', state: o.state ?? 'committed', step: o.step ?? 'bound', epoch: attempts.length, reason: null, session: attempts.length ? attempts[attempts.length - 1].session : null,
    restarts: 0, handovers: 0, parks: 0, limit: false, fails: [], attempts, commits: {}, updated_rev: 0,
  };
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
    try { out.push(JSON.parse(l)); } catch { /* skipped */ }
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
  const line = { seq: lines.length + 1, prev, ts: extra.ts ?? NOW, ce: 1, writer: 'test-fixture', writer_sha: ZERO, kind };
  for (const k of ['task', 'epoch']) if (extra[k] !== undefined) line[k] = extra[k];
  line.data = data;
  line.hash = sha(prev + canon(line));
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
const statusPath = (root) => path.join(root, 'store', 'status', 'card_status.jsonl');
const statusLines = (root) => readJsonl(statusPath(root));
function addStatus(root, card, status, extra = {}) {
  const seq = statusLines(root).length + 1;
  const line = { seq, card_id: card.id, card_sha: card.sha, status, reason: extra.reason ?? 'ok', at: NOW };
  for (const k of ['witness_seq', 'check', 'classes']) if (extra[k] !== undefined) line[k] = extra[k];
  appendJsonl(statusPath(root), line);
  return seq;
}
const confirm = (root, card) => { addStatus(root, card, 'witnessed', { witness_seq: 1 }); return addStatus(root, card, 'confirmed', { check: { batch: 'b1-1', item: 'i_' + card.id.slice(2), verdict: 'confirmed' }, classes: ['J1', 'J2', 'J4'] }); };
const witnessPath = (root) => path.join(root, 'store', 'witness.jsonl');
function addWitness(root, card, result) {
  const seq = readJsonl(witnessPath(root)).length + 1;
  appendJsonl(witnessPath(root), { seq, card_id: card.id, card_sha: card.sha, result, number_bound: result === 'witnessed', reason: result === 'witnessed' ? 'ok' : 'quote-missing', source_changed: false, w: 300, at: NOW });
}
function addCommit(root, { task, step, epoch = 1, outputs }) {
  const outs = outputs.map((o) => ({ id: o.id, kind: o.kind, sha256: o.sha })).sort((a, b) => (a.id < b.id ? -1 : 1));
  const rec = { schema_version: 1, task, step, epoch, step_key: 'f'.repeat(64), outputs: outs, outputs_sha: sha(canon(outs)) };
  fs.writeFileSync(path.join(root, 'store', 'commits', `${task}.${step}.json`), canon(rec));
  return rec;
}

// ---- synthetic content (never copied from a real source) ----
function mkCard(o = {}) {
  const tag = o.tag ?? 'a';
  return {
    schema_version: 1, kind: 'card', field: o.field ?? 'f1', question_ids: o.qids ?? ['f1-g1-01'], route: o.route ?? 'keyword',
    source: { url: 'https://example.test/' + tag, canonical_id: o.canonical ?? 'doi:10.0/' + tag, primary_id: o.primary ?? 'doi:10.0/' + tag, evidence_type: 'controlled' },
    quote: 'synthetic quote ' + tag,
    measured: { approach_id: o.approach ?? 'a1', measure: o.measure ?? 'm1', value: o.value ?? 10, unit: 'pct', baseline: o.baseline ?? 8, baseline_kind: 'control', better: 'higher', effect: o.effect ?? 'improves' },
    conditions: { task: o.task ?? ['repair'], model_family: ['fam'], language: o.language ?? ['py'] },
    what_measured: 'synthetic measurement ' + tag,
  };
}
const SENT = (sid, cites, o = {}) => ({ sid, approach_id: o.approach ?? 'a1', measure: o.measure ?? 'm1', kind: o.kind ?? 'fact', text: o.text ?? 'synthetic sentence ' + sid, cites, applies_to: o.applies ?? {} });
const QSHA = sha(canon(['f1-g1-01']));
const mkPack = (o) => ({ schema_version: 1, kind: 'pack', field: o.field ?? 'f1', questions_sha: QSHA, cards: [...new Set(o.cards)].sort(), conclusions: o.concl ?? [], not_covered: o.notCovered ?? [], ...(o.index ? { index: o.index } : {}) });
const mkReview = (o) => ({ schema_version: 1, kind: 'review', field: o.field ?? 'f1', task: o.task ?? 'f1-review', pack: o.pack, sentences: o.sentences ?? [], verdicts: o.verdicts ?? [], dismissals: o.dismissals ?? [], our_work_findings: o.findings ?? [] });
function mkCert(review, o = {}) {
  return {
    schema_version: 1, kind: 'certificate', task: o.task ?? 'f1-review', subject: review.id, pack: review.value.pack, step_key: 'f'.repeat(64), read_set: [], read_set_sha: sha(canon([])),
    session_label: o.session ?? 'clean', coverage: { approved: 1, covered: 1, not_covered: [] }, cited: { n: 1, confirmed: 1, failing: [] }, plants: { k: 0, found: 0, contra_found: 0 },
    result: o.result ?? 'certified', reasons: [],
  };
}

function freezeProtocol(root, { field = 'f1', qids = ['f1-g1-01'], cross = [], heldout } = {}) {
  const v = {
    schema_version: 1, kind: 'protocol', field, question_ids: qids,
    criteria: { include: [{ code: 'I1', text: 'synthetic include' }], exclude: [{ code: 'E1', text: 'synthetic exclude' }] },
    routes: ['keyword'], card_schema_version: 1, certainty_method: 'synthetic', sesoi: { m1: 1.0 },
    outlist_vocab: { approaches: ['a1', 'a2'], measures: ['m1'], effects: ['improves', 'worsens'] },
    seeds: [], must_read: [], fixed_files: [], cross_field: cross, approval: { quote: 'synthetic approval', at: NOW },
  };
  const bytes = canon(v);
  const h = sha(bytes);
  const rel = `plan/frozen/protocol-${field}-${h.slice(0, 12)}.json`;
  fs.writeFileSync(path.join(root, rel), bytes);
  addLedger(root, 'protocol-freeze', { name: 'protocol-' + field, sha256: h, path: rel }, { ts: '2026-11-17T00:00:00.000Z' });
  if (heldout) fs.writeFileSync(path.join(root, 'sealed', 'heldout', `${field}.json`), JSON.stringify({ schema_version: 1, field, protocol_sha256: h, rng_seed: 'x', seeds_sha256: ZERO, heldout: [...heldout].sort() }));
  return { sha: h, rel };
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
const U = (input, cache_read, cache_write, output) => ({ input, cache_read, cache_write, output });

// ---- running a script as a child process ----
function run(argv, root, script = 'render') {
  const r = spawnSync(process.execPath, [scriptFile(script), ...argv], { cwd: root, encoding: 'utf8', windowsHide: true, shell: false, timeout: 180000, maxBuffer: 64 << 20 });
  const lines = (r.stdout ?? '').split('\n').filter((l) => l.trim());
  let json = null;
  if (lines.length === 1) { try { json = JSON.parse(lines[0]); } catch { json = null; } }
  return { exit: r.status, json, stdout: r.stdout ?? '', stderr: r.stderr ?? '', lines };
}
function shape(r, exit) {
  const where = () => `\nexit=${r.exit}\nstdout=${r.stdout.slice(0, 1200)}\nstderr=${r.stderr.slice(0, 1200)}`;
  assert.equal(r.lines.length, 1, 'stdout must be exactly one line' + where());
  const j = r.json;
  assert.ok(j && typeof j === 'object', 'stdout line must be JSON' + where());
  for (const k of ['ok', 'script', 'mode', 'exit', 'code', 'dry_run', 'result', 'reasons', 'ledger_seq']) assert.ok(k in j, 'stdout JSON lacks key ' + k + where());
  assert.ok(j.script === 'render' || j.script === 'render.mjs', 'script name' + where());
  assert.equal(j.exit, r.exit, 'JSON exit equals process exit' + where());
  if (exit !== undefined) assert.equal(r.exit, exit, 'expected exit ' + exit + where());
  assert.equal(j.code, EXIT_SLUG[j.exit], 'code is the slug of the exit' + where());
  assert.equal(j.ok, j.exit === 0);
  assert.ok(Array.isArray(j.reasons) && Array.isArray(j.ledger_seq));
  return j;
}
const reasonCodes = (j) => j.reasons.map((x) => x.code);
const assertReason = (j, code) => assert.ok(reasonCodes(j).includes(code), `reasons should name ${code}, got ${JSON.stringify(j.reasons)}`);
const render = (root, extra = [], ce = '1') => run(['--root', root, '--ce', ce, '--now', NOW, ...extra], root);
const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const readJ = (root, rel) => JSON.parse(read(root, rel));
const viewFiles = (root) => fs.readdirSync(path.join(root, 'views')).sort();
const snapshot = (root) => {
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
};
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

// ---- worlds ----
// W = {root, cards: [obj], packs: [obj], reviews: [obj], certs: [obj]}; labels are written from it.
function writeLabels(W, over = {}) {
  const st = new Map();
  let maxSeq = 0;
  for (const l of statusLines(W.root)) { st.set(l.card_id, l); maxSeq = Math.max(maxSeq, l.seq); }
  const labels = { schema_version: 1, inputs: { status_seq: maxSeq, objects: 0, commits: 0, flags: 0 }, cards: {}, nodes: {}, verdicts: {}, dismissals: {}, certificates: {}, targets: [] };
  for (const c of W.cards) labels.cards[c.id] = { label: st.get(c.id)?.status ?? 'pending', status_seq: st.get(c.id)?.seq ?? 0 };
  for (const p of W.packs) for (const s of p.value.conclusions) labels.nodes[`${p.id}#${s.sid}`] = { label: 'IN', why: [], causes: [] };
  for (const r of W.reviews) {
    for (const s of r.value.sentences) labels.nodes[`${r.id}#${s.sid}`] = { label: 'IN', why: [], causes: [] };
    for (const v of r.value.verdicts) labels.verdicts[`${r.id}#${v.approach_id}`] = { label: 'IN', why: 'supported' };
    for (const d of r.value.dismissals) labels.dismissals[`${r.id}#${d.sid}`] = { label: 'standing', why: 'bound', matched: [] };
  }
  for (const x of W.certs) labels.certificates[x.id] = 'VALID';
  for (const [section, entries] of Object.entries(over)) {
    if (section === 'inputs') { Object.assign(labels.inputs, entries); continue; }
    for (const [k, v] of Object.entries(entries)) { if (v === null) delete labels[section][k]; else labels[section][k] = v; }
  }
  fs.writeFileSync(path.join(W.root, 'views', 'labels.json'), JSON.stringify(labels, null, 2));
  return labels;
}
const labelsOf = (root) => readJ(root, 'views/labels.json');
function newWorld(o = {}) {
  return { root: makeRoot(o), cards: [], packs: [], reviews: [], certs: [] };
}
function addCard(W, o) {
  const c = putObj(W.root, mkCard(o));
  W.cards.push(c);
  return c;
}
function addPack(W, task, cards, concl, extra = {}) {
  const P = putObj(W.root, mkPack({ cards: cards.map((c) => c.id), concl, field: extra.field, index: extra.index, notCovered: extra.notCovered }));
  W.packs.push(P);
  addCommit(W.root, { task, step: 'pack', outputs: [...cards.map((c) => ({ ...c, kind: 'card' })), { ...P, kind: 'pack' }] });
  return P;
}
function addReview(W, task, P, o = {}) {
  const R = putObj(W.root, mkReview({ task, pack: P.id, ...o }));
  W.reviews.push(R);
  addCommit(W.root, { task, step: 'review', outputs: [{ ...R, kind: 'review' }] });
  return R;
}
function addCert(W, R, o) {
  const X = putObj(W.root, mkCert(R, o));
  W.certs.push(X);
  return X;
}

// The standard world: two fields, three tasks, five cards, a pack and a review per field 1, labels.
function stdWorld(o = {}) {
  const W = newWorld({ params: o.params, gates: o.gates });
  const S1 = newSid(); const S2 = newSid(); const S3 = newSid();
  writeTasks(W.root, [
    row({ task: 'f1-research', field: 'f1', stage: 'research', qids: ['f1-g1-01', 'f1-g1-02', 'f1-g1-03'], sessions: [S1] }),
    row({ task: 'f1-review', field: 'f1', stage: 'review', role: 'child-reviewing', steps: ['review'], deps: ['f1-research'], sessions: [S2] }),
    row({ task: 'f2-research', field: 'f2', stage: 'research', qids: ['f2-g1-01', 'f2-g1-02'], sessions: [S3] }),
  ]);
  W.sessions = { S1, S2, S3 };
  freezeProtocol(W.root, { field: 'f1', qids: ['f1-g1-01', 'f1-g1-02', 'f1-g1-03'] });
  freezeProtocol(W.root, { field: 'f2', qids: ['f2-g1-01', 'f2-g1-02'] });
  W.A = addCard(W, { tag: 'A', field: 'f1', qids: ['f1-g1-01'] });
  W.B = addCard(W, { tag: 'B', field: 'f1', qids: ['f1-g1-02'] });
  W.C = addCard(W, { tag: 'C', field: 'f2', qids: ['f2-g1-01'] });
  W.D = addCard(W, { tag: 'D', field: 'f2', qids: ['f2-g1-02'] });
  W.E = addCard(W, { tag: 'E', field: 'f2', qids: ['f2-g1-02'], measure: 'm2' });
  confirm(W.root, W.A); addStatus(W.root, W.B, 'witnessed', { witness_seq: 1 }); confirm(W.root, W.C); addStatus(W.root, W.E, 'unverifiable', { reason: 'no-snapshot' });
  W.P1 = addPack(W, 'f1-research', [W.A, W.B], [SENT('s1', [W.A.id]), SENT('s2', [W.B.id], { approach: 'a2' })]);
  W.P2 = addPack(W, 'f2-research', [W.C, W.D, W.E], [SENT('s1', [W.C.id])], { field: 'f2' });
  W.R1 = addReview(W, 'f1-review', W.P1, {
    sentences: [SENT('s1', [W.A.id]), SENT('s2', [W.B.id], { approach: 'a2' })],
    verdicts: [{ approach_id: 'a1', verdict: 'promising', supports: ['s1'] }],
    dismissals: [{ sid: 's2', verdict: 'wrong-form', supports: [W.A.id], outlist: [{ approach_id: 'a2', measure: 'm1', effect: 'worsens' }] }],
    findings: [{ file: 'notes.md', locator: 'line 3', reason: 'wrong-number', text: 'synthetic finding text' }],
  });
  W.X1 = addCert(W, W.R1);
  addLedger(W.root, 'bind', { session: S1, boot: 'b' }, { task: 'f1-research', epoch: 1, ts: '2026-11-17T08:00:00.000Z' });
  addLedger(W.root, 'bind', { session: S2, boot: 'b' }, { task: 'f1-review', epoch: 1, ts: '2026-11-17T08:30:00.000Z' });
  addLedger(W.root, 'bind', { session: S3, boot: 'b' }, { task: 'f2-research', epoch: 1, ts: '2026-11-17T08:40:00.000Z' });
  if (!o.noLabels) writeLabels(W);
  return W;
}

// ---------------------------------------------------------------------------------------------
// Behaviours (spec/render.mjs.md "Behaviours")
// ---------------------------------------------------------------------------------------------

test('T1 fixture world: exit 0, the six file kinds exist, every .md starts with the ledger_seq header, check line pass, ledger verifies', () => {
  const W = stdWorld();
  const before = readLedger(W.root);
  const j = shape(render(W.root), 0);
  for (const f of ['pack-f1-research.md', 'pack-f2-research.md', 'review-f1-review.md', 'synthesis.md', 'owner.md', 'coverage.json', 'measures.json']) {
    assert.ok(fs.existsSync(path.join(W.root, 'views', f)), 'missing views/' + f);
  }
  const head = before[before.length - 1];
  for (const f of viewFiles(W.root).filter((x) => x.endsWith('.md'))) {
    const first = read(W.root, 'views/' + f).split('\n')[0];
    assert.match(first, /^<!-- render ledger_seq=\d+ head=[0-9a-f]{12} -->$/, f);
    assert.equal(first, `<!-- render ledger_seq=${head.seq} head=${head.hash.slice(0, 12)} -->`, 'header names the ledger the page was built from');
  }
  for (const f of ['coverage.json', 'measures.json']) {
    const v = readJ(W.root, 'views/' + f);
    assert.equal(v.built_from.ledger_seq, head.seq);
    assert.equal(v.built_from.ledger_head, head.hash);
    assert.equal(v.generated_at, NOW);
  }
  const lines = readLedger(W.root);
  verifyLedger(lines);
  const last = lines[lines.length - 1];
  assert.equal(last.kind, 'check');
  assert.equal(last.data.check, 'render');
  assert.equal(last.data.subject, 'views');
  assert.equal(last.data.result, 'pass');
  assert.equal(lines.length, before.length + 1);
  assert.deepEqual(j.ledger_seq, [last.seq]);
});

test('T2 join: conditions come from the card, the sentence text keeps its own words', () => {
  const W = stdWorld({ noLabels: true });
  const A2 = addCard(W, { tag: 'J', qids: ['f1-g1-03'], language: ['python'] });
  const P = addPack(W, 'f1-research', [A2], [SENT('s1', [A2.id], { text: 'this works well on Java builds', applies: { language: ['python'] } })]);
  W.packs = [P];
  W.cards = [A2];
  W.reviews = []; W.certs = [];
  fs.rmSync(path.join(W.root, 'store', 'commits', 'f2-research.pack.json'));
  fs.rmSync(path.join(W.root, 'store', 'commits', 'f1-review.review.json'));
  writeLabels(W);
  shape(render(W.root), 0);
  const page = read(W.root, 'views/pack-f1-research.md');
  assert.ok(page.includes('language=python'), 'the card line shows language=python');
  assert.ok(page.includes('scope: language=python'), 'the declared scope is shown on its own line');
  const lower = page.toLowerCase();
  assert.equal(lower.split('java').length - 1, 1, 'java appears once, inside the sentence text');
  assert.ok(page.includes('this works well on Java builds'));
});

test('T3 the labels shown are those of labels.json; changing one label changes only that line', () => {
  const W = stdWorld({ noLabels: true });
  const L = writeLabels(W, { nodes: { [`${W.P1.id}#s1`]: { label: 'PENDING', why: ['support-unchecked'], causes: [] }, [`${W.P1.id}#s2`]: { label: 'JUDGMENT', why: [], causes: [] } } });
  shape(render(W.root), 0);
  const a = read(W.root, 'views/pack-f1-research.md').split('\n');
  assert.ok(a.some((l) => l.startsWith('- [s1] (PENDING)')), 'PENDING shown');
  assert.ok(a.some((l) => l.startsWith('- [s2] (JUDGMENT)')), 'JUDGMENT shown');
  L.nodes[`${W.P1.id}#s1`].label = 'STALE';
  fs.writeFileSync(path.join(W.root, 'views', 'labels.json'), JSON.stringify(L));
  shape(render(W.root), 0);
  const b = read(W.root, 'views/pack-f1-research.md').split('\n');
  assert.equal(a.length, b.length);
  const diff = a.map((l, i) => [l, b[i]]).filter(([x, y]) => x !== y);
  assert.equal(diff.length, 1, 'exactly one line differs: ' + JSON.stringify(diff));
  assert.ok(diff[0][0].startsWith('- [s1] (PENDING)') && diff[0][1].startsWith('- [s1] (STALE)'));
  assert.ok(b.some((l) => l.startsWith('- [s1] (STALE)')), 'STALE is shown, not hidden');
});

test('T4 a sentence node without a label: exit 1 missing-label naming it, no file written', () => {
  const W = stdWorld({ noLabels: true });
  const key = `${W.P1.id}#s2`;
  writeLabels(W, { nodes: { [key]: null } });
  const viewsBefore = viewFiles(W.root);
  const j = shape(render(W.root), 1);
  assertReason(j, 'missing-label');
  assert.ok(JSON.stringify(j.reasons).includes(key), 'the missing node is named');
  assert.deepEqual(viewFiles(W.root), viewsBefore, 'views/ unchanged');
  const lines = readLedger(W.root);
  verifyLedger(lines);
  const tail = lines.slice(-2);
  assert.equal(tail[0].kind, 'check');
  assert.equal(tail[0].data.result, 'fail');
  assert.equal(tail[1].kind, 'incident');
  assert.equal(tail[1].data.class, 'refusal');
  // the other kinds of node: a card, a verdict, a dismissal, a certificate
  for (const [section, k] of [['cards', W.A.id], ['verdicts', `${W.R1.id}#a1`], ['dismissals', `${W.R1.id}#s2`], ['certificates', W.X1.id]]) {
    writeLabels(W, { [section]: { [k]: null } });
    const r = shape(render(W.root), 1);
    assertReason(r, 'missing-label');
    assert.ok(JSON.stringify(r.reasons).includes(k), section + ' key named');
  }
});

test('T5 a cite to a card absent from the store, and a pack card missing: exit 1 dangling-reference', () => {
  const W = stdWorld({ noLabels: true });
  const ghost = 'c_0123456789abcdef';
  const P = putObj(W.root, mkPack({ cards: [W.A.id], concl: [SENT('s1', [W.A.id]), SENT('s2', [ghost], { approach: 'a2' })] }));
  addCommit(W.root, { task: 'f1-research', step: 'pack', outputs: [{ ...W.A, kind: 'card' }, { ...P, kind: 'pack' }] });
  W.packs = [P]; W.cards = [W.A]; W.reviews = []; W.certs = [];
  fs.rmSync(path.join(W.root, 'store', 'commits', 'f2-research.pack.json'));
  fs.rmSync(path.join(W.root, 'store', 'commits', 'f1-review.review.json'));
  writeLabels(W);
  const j = shape(render(W.root), 1);
  assertReason(j, 'dangling-reference');
  assert.ok(JSON.stringify(j.reasons).includes(ghost), 'the absent id is listed');
  assert.ok(!fs.existsSync(path.join(W.root, 'views', 'pack-f1-research.md')));
  // a pack card missing
  const P2 = putObj(W.root, mkPack({ cards: [W.A.id, ghost], concl: [SENT('s1', [W.A.id])] }));
  addCommit(W.root, { task: 'f1-research', step: 'pack', outputs: [{ ...W.A, kind: 'card' }, { ...P2, kind: 'pack' }] });
  W.packs = [P2];
  writeLabels(W);
  const k = shape(render(W.root), 1);
  assertReason(k, 'dangling-reference');
  assert.ok(JSON.stringify(k.reasons).includes(ghost));
});

test('T6 labels.json older than the status file: exit 1 labels-stale; labels file absent: exit 2', () => {
  const W = stdWorld({ noLabels: true });
  writeLabels(W, { inputs: { status_seq: 1 } });
  const before = viewFiles(W.root);
  const j = shape(render(W.root), 1);
  assertReason(j, 'labels-stale');
  assert.deepEqual(viewFiles(W.root), before);
  fs.rmSync(path.join(W.root, 'views', 'labels.json'));
  const k = shape(render(W.root), 2);
  assert.equal(k.code, 'not-run');
  assert.deepEqual(viewFiles(W.root), []);
  const last = readLedger(W.root).filter((l) => l.kind === 'check').pop();
  assert.equal(last.data.result, 'not_run');
});

test('T7 an output whose object bytes were edited: exit 3 object-mismatch; a cite of a seed id: exit 3 seed-id; nothing written', () => {
  const W = stdWorld();
  const file = path.join(W.root, 'store', 'objects', W.B.id + '.json');
  const good = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, good.replace('synthetic quote B', 'synthetic quote X'));
  const viewsBefore = viewFiles(W.root);
  const j = shape(render(W.root), 3);
  assertReason(j, 'object-mismatch');
  assert.deepEqual(viewFiles(W.root), viewsBefore);
  const incident = readLedger(W.root).filter((l) => l.kind === 'incident').pop();
  assert.deepEqual(incident.data.detail, { tamper: true, script: 'render', code: 'object-mismatch' });
  fs.writeFileSync(file, good);
  // seed id inside a committed review
  const W2 = stdWorld({ noLabels: true });
  const seeded = 's_0123456789abcdef';
  const R = addReview(W2, 'f1-review', W2.P1, { sentences: [SENT('s1', [W2.A.id, seeded])] });
  W2.reviews = [R]; W2.certs = [];
  writeLabels(W2);
  const s = shape(render(W2.root), 3);
  assertReason(s, 'seed-id');
  assert.ok(!fs.existsSync(path.join(W2.root, 'views', 'owner.md')));
  assert.ok(!JSON.stringify(s).includes(seeded), 'the seed id is never echoed');
});

function twoReviewWorld({ effectB = 'improves' } = {}) {
  const W = stdWorld({ noLabels: true });
  const A2 = addCard(W, { tag: 'A2', field: 'f1', qids: ['f1-g1-03'], effect: effectB });
  const P = addPack(W, 'f1-research', [W.A, A2], [SENT('s1', [W.A.id])]);
  W.packs = [P, W.P2];
  fs.rmSync(path.join(W.root, 'store', 'commits', 'f1-review.review.json'));
  W.reviews = []; W.certs = [];
  confirm(W.root, A2);
  const RA = addReview(W, 'f1-review-a', P, { sentences: [SENT('s1', [W.A.id])] });
  const RB = addReview(W, 'f1-review-b', P, { sentences: [SENT('s1', [A2.id]), SENT('s2', [A2.id]), SENT('s3', [W.A.id])] });
  W.RA = RA; W.RB = RB; W.A2 = A2;
  return W;
}

test('T8 synthesis: a key cited in two reviews is one row, one label, no count; disagreeing effects are weak', () => {
  const W = twoReviewWorld({ effectB: 'improves' });
  addCert(W, W.RA, { task: 'f1-review-a' });
  addCert(W, W.RB, { task: 'f1-review-b' });
  writeLabels(W);
  shape(render(W.root), 0);
  let syn = read(W.root, 'views/synthesis.md');
  const rows = syn.split('\n').filter((l) => l.startsWith('| a1 | m1 |'));
  assert.equal(rows.length, 1, 'one row for the key');
  assert.ok(rows[0].includes(W.RA.id) && rows[0].includes(W.RB.id), 'both reviews named in that row');
  assert.ok(rows[0].includes('| IN |'), 'the same label');
  assert.ok(!rows[0].includes('weak'), 'agreeing cards are not weak');
  const header = syn.split('\n').find((l) => l.startsWith('| approach'));
  assert.ok(!/count|number|agree|n=/i.test(header), 'no count column: ' + header);
  assert.ok(!/\b(agreeing|agreement)\b/i.test(syn.replace(/R37/g, '')), 'no agreement figure anywhere');
  // improves vs worsens
  const W2 = twoReviewWorld({ effectB: 'worsens' });
  addCert(W2, W2.RA, { task: 'f1-review-a' });
  addCert(W2, W2.RB, { task: 'f1-review-b' });
  writeLabels(W2);
  shape(render(W2.root), 0);
  syn = read(W2.root, 'views/synthesis.md');
  const row2 = syn.split('\n').find((l) => l.startsWith('| a1 | m1 |'));
  assert.ok(row2.includes('weak: disagreement'), row2);
  assert.ok(row2.includes('improves') && row2.includes('worsens'));
});

test('T9 synthesis lists only certified reviews with a VALID certificate; others are listed with their reason; a tainted one shows tainted', () => {
  const W = stdWorld({ noLabels: true });
  const P = W.P1;
  fs.rmSync(path.join(W.root, 'store', 'commits', 'f1-review.review.json'));
  W.reviews = []; W.certs = [];
  const mk = (task, approach) => addReview(W, task, P, { sentences: [SENT('s1', [W.A.id], { approach })] });
  const R0 = mk('f1-review-n', 'ap0');
  const R1 = mk('f1-review-c', 'ap1');
  const R2 = mk('f1-review-s', 'ap2');
  const R3 = mk('f1-review-t', 'ap3');
  addCert(W, R1, { task: 'f1-review-c', result: 'not_certified' });
  const X2 = addCert(W, R2, { task: 'f1-review-s' });
  addCert(W, R3, { task: 'f1-review-t', session: 'tainted' });
  writeLabels(W, { certificates: { [X2.id]: 'STALE' } });
  shape(render(W.root), 0);
  const syn = read(W.root, 'views/synthesis.md');
  const table = syn.slice(syn.indexOf('## Table'));
  for (const a of ['ap0', 'ap1', 'ap2']) assert.ok(!table.includes(`| ${a} |`), a + ' must not be in the table');
  assert.ok(table.includes('| ap3 |'), 'the certified, tainted review is in the table');
  const notIncluded = syn.slice(syn.indexOf('## Reviews not included'), syn.indexOf('## Table'));
  assert.match(notIncluded, new RegExp(`${R0.id}[^\\n]*no-certificate`));
  assert.match(notIncluded, new RegExp(`${R1.id}[^\\n]*not-certified`));
  assert.match(notIncluded, new RegExp(`${R2.id}[^\\n]*stale-certificate`));
  assert.ok(table.split('\n').find((l) => l.startsWith('| ap3 |')).includes('tainted'), 'tainted is shown in the row');
  assert.ok(syn.includes('tainted'));
});

test('T10 an untrusted card (rejected) appears only under Excluded, with its label', () => {
  const W = stdWorld({ noLabels: true });
  const Bad = addCard(W, { tag: 'Bad', field: 'f1', qids: ['f1-g1-03'] });
  addStatus(W.root, Bad, 'rejected', { reason: 'quote-missing' });
  const P = addPack(W, 'f1-research', [W.A, Bad], [SENT('s1', [W.A.id]), SENT('s2', [Bad.id], { approach: 'a2' })]);
  W.packs = [P, W.P2];
  fs.rmSync(path.join(W.root, 'store', 'commits', 'f1-review.review.json'));
  W.reviews = []; W.certs = [];
  writeLabels(W);
  shape(render(W.root), 0);
  const page = read(W.root, 'views/pack-f1-research.md');
  const at = page.indexOf('## Excluded');
  assert.ok(at > 0);
  const first = page.indexOf(Bad.id);
  assert.ok(first > at, 'the rejected card first appears under Excluded');
  assert.ok(page.slice(at).split('\n').some((l) => l.includes(Bad.id) && l.includes('rejected')), 'with its label');
  assert.ok(!page.slice(0, at).includes(Bad.id));
  assert.ok(page.slice(0, at).includes(W.A.id), 'the trusted card stays above');
  const owner = read(W.root, 'views/owner.md');
  assert.ok(owner.slice(owner.indexOf('## Excluded')).includes(Bad.id));
});

test('T11 coverage: held-out seed recall with its interval and the upper-bound text; committed basis without F5', () => {
  const W = stdWorld({ noLabels: true, params: { f5_given: true } });
  const ids = ['doi:10.0/s1', 'doi:10.0/s2', 'doi:10.0/s3', 'doi:10.0/s4'];
  fs.writeFileSync(path.join(W.root, 'sealed', 'heldout', 'f1.json'), JSON.stringify({ schema_version: 1, field: 'f1', protocol_sha256: ZERO, rng_seed: 'x', seeds_sha256: ZERO, heldout: ids }));
  const c1 = addCard(W, { tag: 'k1', field: 'f1', qids: ['f1-g1-03'], canonical: ids[0], primary: 'p-k1' });
  const c2 = addCard(W, { tag: 'k2', field: 'f1', qids: ['f1-g1-03'], canonical: 'x-other', primary: ids[1] });
  const c3 = addCard(W, { tag: 'k3', field: 'f1', qids: ['f1-g1-03'], canonical: ids[2], primary: 'p-k3' });
  const c4 = addCard(W, { tag: 'k4', field: 'f1', qids: ['f1-g1-03'], canonical: ids[3], primary: 'p-k4' });
  for (const c of [c1, c2, c3]) confirm(W.root, c);
  const P = addPack(W, 'f1-research', [c1, c2, c3, c4], [SENT('s1', [c1.id])]);
  W.packs = [P, W.P2];
  fs.rmSync(path.join(W.root, 'store', 'commits', 'f1-review.review.json'));
  W.reviews = []; W.certs = [];
  writeLabels(W);
  shape(render(W.root), 0);
  const cov = readJ(W.root, 'views/coverage.json');
  const h = cov.fields.f1.heldout;
  assert.equal(h.n, 4);
  assert.equal(h.found, 3);
  assert.equal(h.recall, 0.75);
  assert.ok(Math.abs(h.lower - 0.1941) < 1e-3, 'lower ' + h.lower);
  assert.ok(Math.abs(h.upper - 0.9937) < 1e-3, 'upper ' + h.upper);
  assert.match(JSON.stringify(cov), /upper bound/);
  assert.match(read(W.root, 'views/owner.md'), /upper bound/);
  assert.equal(cov.fields.f1.basis, 'witnessed-or-confirmed');
  assert.ok(!JSON.stringify(cov).includes('doi:10.0/s3'), 'held-out ids are never written');
  // F5 not given: committed cards count, and the basis says so
  setThresholds(W.root, { f5_given: false });
  shape(render(W.root), 0);
  const cov2 = readJ(W.root, 'views/coverage.json');
  assert.equal(cov2.fields.f1.basis, 'committed');
  assert.equal(cov2.fields.f1.heldout.found, 4, 'the committed-only card counts when F5 is not given');
  assert.equal(cov2.basis, 'committed');
  // a field without a held-out file
  assert.equal(cov2.fields.f2.heldout, null);
});

test('T12 Chapman on primary ids: n1, n2, m, N_hat; no overlap gives null; seed-route cards count in neither group', () => {
  const mk = (keyword, back, seed = []) => {
    const W = stdWorld({ noLabels: true, params: { f5_given: false } });
    const cards = [];
    keyword.forEach((p, i) => cards.push(addCard(W, { tag: 'kw' + i, field: 'f1', qids: ['f1-g1-03'], primary: p, route: 'keyword' })));
    back.forEach((p, i) => cards.push(addCard(W, { tag: 'bw' + i, field: 'f1', qids: ['f1-g1-03'], primary: p, route: 'backward' })));
    seed.forEach((p, i) => cards.push(addCard(W, { tag: 'sd' + i, field: 'f1', qids: ['f1-g1-03'], primary: p, route: 'seed' })));
    const P = addPack(W, 'f1-research', cards, [SENT('s1', [cards[0].id])]);
    W.packs = [P, W.P2];
    fs.rmSync(path.join(W.root, 'store', 'commits', 'f1-review.review.json'));
    W.reviews = []; W.certs = [];
    writeLabels(W);
    shape(render(W.root), 0);
    return readJ(W.root, 'views/coverage.json').fields.f1.chapman;
  };
  const c = mk(['a', 'b', 'c'], ['b', 'c', 'd'], ['e']);
  assert.equal(c.n1, 3);
  assert.equal(c.n2, 3);
  assert.equal(c.m, 2);
  assert.ok(Math.abs(c.N_hat - 13 / 3) < 1e-9, 'N_hat ' + c.N_hat);
  assert.equal(c.observed, 4, 'the seed-route primary is in neither group');
  assert.ok(Math.abs(c.coverage_ub - 4 / (13 / 3)) < 1e-9);
  assert.ok(Math.abs(c.m_expected - 9 / (13 / 3)) < 1e-9);
  const n = mk(['a', 'b'], ['c', 'd']);
  assert.equal(n.N_hat, null);
  assert.equal(n.reason, 'no-overlap');
  const z = mk(['a', 'b'], []);
  assert.equal(z.N_hat, null);
  assert.equal(z.reason, 'no-captures');
});

test('T13 union counts an id covered in another field once; a cross-field id uncovered everywhere is in not_covered', () => {
  const W = newWorld({ params: { f5_given: true } });
  const S = newSid();
  writeTasks(W.root, [row({ task: 'f1-research', field: 'f1', qids: ['f1-g1-01', 'f1-g1-02'], sessions: [S] }), row({ task: 'f2-research', field: 'f2', qids: ['f2-g1-01'], sessions: [newSid()] })]);
  freezeProtocol(W.root, { field: 'f1', qids: ['f1-g1-01', 'f1-g1-02'] });
  freezeProtocol(W.root, { field: 'f2', qids: ['f2-g1-01'], cross: [{ question_id: 'f1-g1-02', owner_field: 'f1' }] });
  const X = addCard(W, { tag: 'X', field: 'f2', qids: ['f1-g1-01', 'f2-g1-01'] });
  confirm(W.root, X);
  addPack(W, 'f2-research', [X], [SENT('s1', [X.id])], { field: 'f2' });
  writeLabels(W);
  shape(render(W.root), 0);
  const cov = readJ(W.root, 'views/coverage.json');
  assert.deepEqual(cov.fields.f1.covered, ['f1-g1-01']);
  assert.deepEqual(cov.fields.f1.not_covered, ['f1-g1-02']);
  assert.deepEqual(cov.fields.f2.approved, ['f1-g1-02', 'f2-g1-01']);
  assert.deepEqual(cov.fields.f2.covered, ['f2-g1-01']);
  assert.deepEqual(cov.fields.f2.not_covered, ['f1-g1-02']);
  assert.equal(cov.union.approved, 3);
  assert.equal(cov.union.covered, 2);
  assert.deepEqual(cov.union.not_covered, ['f1-g1-02']);
});

function miniWorld({ params } = {}) {
  const W = newWorld({ params });
  const S = newSid();
  writeTasks(W.root, [row({ task: 'f1-research', field: 'f1', qids: ['f1-g1-01', 'f1-g1-02', 'f1-g1-03'], sessions: [S] })]);
  freezeProtocol(W.root, { field: 'f1', qids: ['f1-g1-01', 'f1-g1-02', 'f1-g1-03'] });
  W.S = S;
  W.cardsQ = ['f1-g1-01', 'f1-g1-02', 'f1-g1-03'].map((q, i) => addCard(W, { tag: 'm' + i, field: 'f1', qids: [q] }));
  return W;
}
const commitMini = (W) => { W.P = addPack(W, 'f1-research', W.cardsQ, [SENT('s1', [W.cardsQ[0].id])]); writeLabels(W); };

test('T14 measures: tokens from the session and its helper, the weighted token cost; a missing transcript is incomplete and renders', () => {
  const W = miniWorld();
  for (const c of W.cardsQ) confirm(W.root, c);
  commitMini(W);
  writeTranscript(sessionFile(W.root, W.S), { sessionId: W.S, cwd: path.join(W.root, 'wt', 'f1-research-e1'), calls: [{ usage: U(600, 2000, 100, 300), text: 'x' }] });
  writeTranscript(helperFile(W.root, W.S), { sessionId: W.S, cwd: path.join(W.root, 'wt', 'f1-research-e1'), calls: [{ usage: U(400, 2000, 100, 200), text: 'y' }] });
  shape(render(W.root), 0);
  const m = readJ(W.root, 'views/measures.json');
  const t = m.by_task['f1-research'].tokens;
  assert.deepEqual({ input: t.input, cache_read: t.cache_read, cache_write: t.cache_write, output: t.output, total: t.total, calls: t.calls, complete: t.complete }, { input: 1000, cache_read: 4000, cache_write: 200, output: 500, total: 5700, calls: 2, complete: true });
  assert.ok(Math.abs(m.by_task['f1-research'].token_cost - 3950) < 1e-9, 'token_cost ' + m.by_task['f1-research'].token_cost);
  assert.equal(m.by_field.f1.tokens.total, 5700);
  assert.ok(Math.abs(m.by_field.f1.token_cost - 3950) < 1e-9);
  // the transcript of the session goes missing: incomplete, still renders
  fs.rmSync(sessionFile(W.root, W.S));
  shape(render(W.root), 0);
  const m2 = readJ(W.root, 'views/measures.json');
  assert.equal(m2.by_task['f1-research'].tokens.complete, false);
  assert.equal(m2.by_task['f1-research'].tokens.total, 0);
});

const T0 = Date.parse('2026-11-17T06:00:00.000Z');
const at = (min) => new Date(T0 + min * 60000).toISOString();

test('T15 throughput per active hour; a quiet gap is shown apart and excluded; no bind line gives time null', () => {
  const W = miniWorld();
  for (const c of W.cardsQ) confirm(W.root, c);
  commitMini(W);
  // 12 lines 10 minutes apart: two hours, no gap above the threshold
  addLedger(W.root, 'bind', { session: W.S, boot: 'b' }, { task: 'f1-research', epoch: 1, ts: at(0) });
  for (let i = 1; i <= 12; i++) addLedger(W.root, 'intake', { objects: [], rejected: [], flagged: [] }, { task: 'f1-research', epoch: 1, ts: at(i * 10) });
  shape(render(W.root), 0);
  let t = readJ(W.root, 'views/measures.json').by_task['f1-research'];
  assert.equal(t.time.wall_s, 7200);
  assert.equal(t.time.active_s, 7200);
  assert.deepEqual(t.time.quiet_gaps, []);
  assert.equal(t.throughput_per_h, 1.5);
  // a gap of an hour in the middle
  const W2 = miniWorld();
  for (const c of W2.cardsQ) confirm(W2.root, c);
  commitMini(W2);
  addLedger(W2.root, 'bind', { session: W2.S, boot: 'b' }, { task: 'f1-research', epoch: 1, ts: at(0) });
  addLedger(W2.root, 'intake', { objects: [], rejected: [], flagged: [] }, { task: 'f1-research', epoch: 1, ts: at(10) });
  addLedger(W2.root, 'intake', { objects: [], rejected: [], flagged: [] }, { task: 'f1-research', epoch: 1, ts: at(70) });
  addLedger(W2.root, 'intake', { objects: [], rejected: [], flagged: [] }, { task: 'f1-research', epoch: 1, ts: at(80) });
  shape(render(W2.root), 0);
  t = readJ(W2.root, 'views/measures.json').by_task['f1-research'];
  assert.equal(t.time.wall_s, 4800);
  assert.equal(t.time.quiet_gaps.length, 1);
  assert.equal(t.time.quiet_gaps[0].gap_s, 3600);
  assert.equal(t.time.quiet_s, 3600);
  assert.equal(t.time.active_s, 1200);
  assert.ok(Math.abs(t.throughput_per_h - 9) < 1e-9, '3 ids in a third of an hour: ' + t.throughput_per_h);
  // no bind line
  const W3 = miniWorld();
  for (const c of W3.cardsQ) confirm(W3.root, c);
  commitMini(W3);
  shape(render(W3.root), 0);
  t = readJ(W3.root, 'views/measures.json').by_task['f1-research'];
  assert.equal(t.time, null);
  assert.equal(t.throughput_per_h, null);
});

test('T16 efficiency per million tokens counts only ids covered by a confirmed card; zero tokens gives null', () => {
  const W = miniWorld();
  confirm(W.root, W.cardsQ[0]);
  addStatus(W.root, W.cardsQ[1], 'witnessed', { witness_seq: 1 });
  addStatus(W.root, W.cardsQ[2], 'witnessed', { witness_seq: 1 });
  commitMini(W);
  let m = (() => { shape(render(W.root), 0); return readJ(W.root, 'views/measures.json'); })();
  assert.equal(m.by_task['f1-research'].efficiency_per_mtok, null, 'no transcript, zero tokens');
  writeTranscript(sessionFile(W.root, W.S), { sessionId: W.S, cwd: W.root, calls: [{ usage: U(1000, 4000, 200, 500), text: 'x' }] });
  shape(render(W.root), 0);
  m = readJ(W.root, 'views/measures.json');
  assert.ok(Math.abs(m.by_task['f1-research'].efficiency_per_mtok - 1 / 0.0057) < 1e-6, 'one confirmed id per 5,700 tokens: ' + m.by_task['f1-research'].efficiency_per_mtok);
  assert.equal(m.by_field.f1.efficiency_per_mtok, m.by_task['f1-research'].efficiency_per_mtok);
});

test('T17 hallucination figures: witness rejections, checker rejections, unclear, citation failures', () => {
  const W = miniWorld();
  const [c0, c1, c2] = W.cardsQ;
  confirm(W.root, c0);
  addWitness(W.root, c1, 'rejected');
  addStatus(W.root, c1, 'rejected', { reason: 'quote-missing' });
  addWitness(W.root, c2, 'rejected');
  addStatus(W.root, c2, 'witnessed', { witness_seq: 2, check: { batch: 'b1-1', item: 'i_1', verdict: 'unclear' } });
  addWitness(W.root, c0, 'witnessed');
  addStatus(W.root, c0, 'rejected', { reason: 'checker', check: { batch: 'b1-2', item: 'i_2', verdict: 'number_mismatch' } });
  addLedger(W.root, 'intake', {
    objects: [], flagged: [{ id: c0.id, sid: 's1', code: 'scope-outside' }],
    rejected: [{ file: 'staging/a.json', code: 'cite-outside-pack' }, { file: 'staging/b.json', code: 'unparseable' }],
  }, { task: 'f1-research', epoch: 1 });
  commitMini(W);
  shape(render(W.root), 0);
  const h = readJ(W.root, 'views/measures.json').by_task['f1-research'].hallucinations;
  assert.deepEqual(h, { witness_rejections: 2, checker_rejections: 1, checker_unclear: 1, citation_failures: 2 });
  assert.deepEqual(readJ(W.root, 'views/measures.json').totals.hallucinations, h);
});

test('T18 unverifiable_share per field and over all fields; values.coverage is the lowest field coverage; escape copied from qualification', () => {
  const W = stdWorld({ noLabels: true });
  // f1: A, B, U1 (unverifiable), U2, H1 -> 1 of 5 ; f2: C, D, E (unverifiable), H3, H4 -> 1 of 5
  const U1 = addCard(W, { tag: 'U1', field: 'f1', qids: ['f1-g1-03'] });
  addStatus(W.root, U1, 'unverifiable', { reason: 'no-snapshot' });
  const U2 = addCard(W, { tag: 'U2', field: 'f1', qids: ['f1-g1-03'] });
  const P = addPack(W, 'f1-research', [W.A, W.B, U1, U2], [SENT('s1', [W.A.id])]);
  W.packs = [P, W.P2];
  fs.rmSync(path.join(W.root, 'store', 'commits', 'f1-review.review.json'));
  W.reviews = []; W.certs = [];
  fs.writeFileSync(path.join(W.root, 'sealed', 'heldout', 'f1.json'), JSON.stringify({ heldout: ['h1', 'h2'] }));
  fs.writeFileSync(path.join(W.root, 'sealed', 'heldout', 'f2.json'), JSON.stringify({ heldout: ['h3', 'h4'] }));
  // f1 finds one of two (0.5), f2 finds both (1)
  const H1 = addCard(W, { tag: 'H1', field: 'f1', qids: ['f1-g1-03'], canonical: 'h1', primary: 'ph1' });
  const H3 = addCard(W, { tag: 'H3', field: 'f2', qids: ['f2-g1-02'], canonical: 'h3', primary: 'ph3' });
  const H4 = addCard(W, { tag: 'H4', field: 'f2', qids: ['f2-g1-02'], canonical: 'h4', primary: 'ph4' });
  for (const c of [H1, H3, H4]) confirm(W.root, c);
  const Pa = addPack(W, 'f1-research', [W.A, W.B, U1, U2, H1], [SENT('s1', [W.A.id])]);
  const Pb = addPack(W, 'f2-research', [W.C, W.D, W.E, H3, H4], [SENT('s1', [W.C.id])], { field: 'f2' });
  W.packs = [Pa, Pb];
  writeLabels(W);
  fs.writeFileSync(path.join(W.root, 'store', 'qualification.json'), JSON.stringify({ schema_version: 1, classes: { J1: { calls: 14, detected: 14, d_hat: 1, lower: 0.8074, qualified: true, status: 'qualified' } }, escape: { n: 20, escaped: 3, rate: 0.15, upper: 0.3 }, result: 'pass' }));
  shape(render(W.root), 0);
  const m = readJ(W.root, 'views/measures.json');
  assert.ok(Math.abs(m.by_field.f1.unverifiable_share - 1 / 5) < 1e-9, 'f1: 1 of 5 ' + m.by_field.f1.unverifiable_share);
  assert.equal(m.by_field.f1.cards.n, 5);
  assert.equal(m.by_field.f1.cards.unverifiable, 1);
  assert.equal(m.by_field.f1.cards.confirmed, 2);
  assert.ok(Math.abs(m.by_field.f2.unverifiable_share - 1 / 5) < 1e-9);
  assert.ok(Math.abs(m.values.unverifiable_share - 2 / 10) < 1e-9, 'over all fields ' + m.values.unverifiable_share);
  assert.equal(m.values.coverage, 0.5, 'the lowest field coverage');
  assert.deepEqual(m.seeded_escape_rate, { n: 20, escaped: 3, rate: 0.15, upper: 0.3 });
  // no qualification file, no cards at all
  const E = newWorld();
  writeTasks(E.root, [row({ task: 'f1-research', field: 'f1', qids: ['f1-g1-01'], sessions: [newSid()] })]);
  freezeProtocol(E.root, { field: 'f1', qids: ['f1-g1-01'] });
  writeLabels(E);
  shape(render(E.root), 0);
  const m2 = readJ(E.root, 'views/measures.json');
  assert.equal(m2.values.unverifiable_share, null);
  assert.equal(m2.values.coverage, null);
  assert.equal(m2.by_field.f1.unverifiable_share, null);
  assert.equal(m2.seeded_escape_rate, null);
});

test('T19 by_arm from the analysis plan, a task named twice counted once; no plan gives null; quality is comparison.arms verbatim', () => {
  const W = stdWorld();
  writeTranscript(sessionFile(W.root, W.sessions.S1), { sessionId: W.sessions.S1, cwd: W.root, calls: [{ usage: U(1000, 4000, 200, 500), text: 'x' }] });
  writeTranscript(sessionFile(W.root, W.sessions.S2), { sessionId: W.sessions.S2, cwd: W.root, calls: [{ usage: U(100, 0, 0, 50), text: 'y' }] });
  shape(render(W.root), 0);
  let m = readJ(W.root, 'views/measures.json');
  assert.equal(m.by_arm, null, 'no plan');
  assert.equal(m.quality, null, 'no comparison file');
  fs.writeFileSync(path.join(W.root, 'plan', 'analysis-plan.json'), JSON.stringify({ kind: 'analysis-plan', arm_budget: { T: 1, R1: 1 }, arm_tasks: { T: { pack: 'f1-research.pack', review: 'f1-research.review' }, R1: { review: 'f1-review.review' } } }));
  const arms = { T: { status: 'committed', answered: 2 }, R1: { status: 'committed', answered: 1 } };
  fs.writeFileSync(path.join(W.root, 'views', 'comparison.json'), JSON.stringify({ schema_version: 1, arms, comparison1: {} }));
  shape(render(W.root), 0);
  m = readJ(W.root, 'views/measures.json');
  assert.equal(m.by_arm.T.tokens.total, 5700, 'the task named by pack and review counts once');
  assert.equal(m.by_arm.R1.tokens.total, 150);
  assert.deepEqual(m.quality, arms);
});

function hazardWorld(map, { withObject = true } = {}) {
  const W = stdWorld();
  if (!withObject) return W;
  const CUT = 'c'.repeat(64);
  const hz = putObj(W.root, { schema_version: 1, kind: 'hazards', cut_sha: CUT, parent: null, hazards: ['h1', 'h2', 'h3', 'h4'].map((id) => ({ hazard_id: id })), map });
  const rec = addCommit(W.root, { task: 'map-one', step: 'hazards', outputs: [{ ...hz, kind: 'hazards' }] });
  const rows = readJ(W.root, 'run/tasks.json');
  rows.tasks.push({ ...row({ task: 'map-one', stage: 'design-check', role: 'mapper', steps: ['hazards'], sessions: [] }), field: null, commits: { hazards: sha(canon(rec)) } });
  fs.writeFileSync(path.join(W.root, 'run', 'tasks.json'), JSON.stringify(rows));
  addLedger(W.root, 'cut', { sha: CUT, result: 'ok', cut_sha: CUT, hazards_sha: null });
  addLedger(W.root, 'commit', { step: 'hazards', outputs_sha: rec.outputs_sha, n: 1, git: null }, { task: 'map-one', epoch: 1 });
  return W;
}
const entry = (kind, id, hazard, borderline = false, alt = null) => ({ source: { kind, id }, hazard_id: hazard, borderline, alt_hazard_id: alt });

test('T20 residual readings: Chapman and Chao2 by hand, a borderline range, the bias-corrected form, not_run without hazards', () => {
  const W = hazardWorld([
    entry('uca', 'u1', 'h1'), entry('uca', 'u2', 'h2'), entry('uca', 'u3', 'h3'),
    entry('cell', 'r1/c1', 'h2'), entry('cell', 'r1/c2', 'h3'), entry('cell', 'r2/c1', 'h4', true, 'h1'),
  ]);
  shape(render(W.root), 0);
  const r = readJ(W.root, 'views/measures.json').readings;
  assert.equal(r.state, 'run');
  assert.equal(r.chapman.n1, 3);
  assert.equal(r.chapman.n2, 3);
  assert.equal(r.chapman.m, 2);
  assert.ok(Math.abs(r.chapman.N_hat - 13 / 3) < 1e-9);
  assert.ok(Math.abs(r.chapman.range.low - 3) < 1e-9, 'the borderline entry moved to h1 gives N 3: ' + JSON.stringify(r.chapman.range));
  assert.ok(Math.abs(r.chapman.range.high - 13 / 3) < 1e-9);
  assert.equal(r.chao2.S_obs, 4);
  assert.equal(r.chao2.Q1, 2);
  assert.equal(r.chao2.Q2, 2);
  assert.ok(Math.abs(r.chao2.estimate - 5) < 1e-9, '4 + 2^2/(2*2) = 5');
  assert.ok(Math.abs(r.chao2.range.low - 3) < 1e-9 && Math.abs(r.chao2.range.high - 5) < 1e-9, JSON.stringify(r.chao2.range));
  // Q2 = 0: the bias-corrected form Q1(Q1-1)/(2(Q2+1)); Chapman has no overlap
  const W2 = hazardWorld([entry('uca', 'u1', 'h1'), entry('uca', 'u2', 'h2'), entry('cell', 'r1/c1', 'h3')]);
  shape(render(W2.root), 0);
  const r2 = readJ(W2.root, 'views/measures.json').readings;
  assert.equal(r2.chapman.state, 'not_estimable');
  assert.equal(r2.chao2.Q2, 0);
  assert.equal(r2.chao2.S_obs, 3);
  assert.ok(Math.abs(r2.chao2.estimate - 6) < 1e-9, '3 + 3*2/(2*1) = 6');
  // no hazards object
  const W3 = hazardWorld([], { withObject: false });
  shape(render(W3.root), 0);
  assert.deepEqual(readJ(W3.root, 'views/measures.json').readings, { state: 'not_run' });
});

test('T21 owner.md has its eight sections in order, shows tcb_commit and reading for a null threshold', () => {
  const W = stdWorld();
  shape(render(W.root), 0);
  const owner = read(W.root, 'views/owner.md');
  const order = ['## Trusted base', '## Seven measures', '## Coverage', '## Hallucination figures', '## Qualification', '## Not run and stale', '## Residual readings', '## Excluded'];
  let at = -1;
  for (const h of order) {
    const i = owner.indexOf(h);
    assert.ok(i > at, `${h} after the previous section`);
    at = i;
  }
  assert.equal([...owner.matchAll(/^## /gm)].length, 8, 'exactly eight sections');
  assert.ok(owner.includes('a'.repeat(40)), 'tcb_commit from coord.json');
  const measures = owner.slice(owner.indexOf('## Seven measures'), owner.indexOf('## Coverage'));
  assert.match(measures, /unverifiable_share_max[^\n]*reading|reading[^\n]*unverifiable_share_max/);
  assert.match(owner.slice(owner.indexOf('## Qualification'), owner.indexOf('## Not run')), /not measured/);
  // a gate with a value is shown as a line
  setThresholds(W.root, { unverifiable_share_max: 0.3 });
  shape(render(W.root), 0);
  const o2 = read(W.root, 'views/owner.md');
  assert.match(o2.slice(o2.indexOf('## Seven measures'), o2.indexOf('## Coverage')), /0\.3/);
});

test('T22 determinism: the same inputs and --now give byte-identical files; another --now changes only generated_at', () => {
  const W = stdWorld();
  writeTranscript(sessionFile(W.root, W.sessions.S1), { sessionId: W.sessions.S1, cwd: W.root, calls: [{ usage: U(10, 20, 30, 40), text: 'x' }] });
  shape(render(W.root), 0);
  const files = viewFiles(W.root).filter((f) => f !== 'labels.json');
  const first = Object.fromEntries(files.map((f) => [f, read(W.root, 'views/' + f)]));
  shape(render(W.root), 0);
  for (const f of files) assert.equal(read(W.root, 'views/' + f), first[f], f + ' is byte-identical');
  const later = '2026-11-18T01:02:03.000Z';
  shape(run(['--root', W.root, '--ce', '1', '--now', later], W.root), 0);
  for (const f of files) {
    if (f.endsWith('.md')) assert.equal(read(W.root, 'views/' + f), first[f], f + ' does not carry the time');
    else {
      const a = JSON.parse(first[f]);
      const b = readJ(W.root, 'views/' + f);
      assert.equal(a.generated_at, NOW);
      assert.equal(b.generated_at, later);
      delete a.generated_at; delete b.generated_at;
      assert.deepEqual(b, a, f + ' differs only in generated_at');
    }
  }
});

test('T23 stale --ce exits 64 and writes nothing; a busy lock exits 75; --dry-run writes nothing; a script run from wt/ exits 3', () => {
  const W = stdWorld();
  const before = snapshot(W.root);
  const s = shape(render(W.root, [], '2'), 64);
  assert.equal(s.reasons[0].code, 'stale-ce');
  assert.deepEqual(snapshot(W.root), before);
  const d = shape(render(W.root, ['--dry-run']), 0);
  assert.equal(d.dry_run === true || d.result.dry_run === true, true);
  assert.ok(Array.isArray(d.result.would_write) && d.result.would_write.includes('views/owner.md'), 'the dry run names the files');
  assert.deepEqual(snapshot(W.root), before, 'a dry run writes nothing, not even a ledger line');
  const lock = holdLock(W.root);
  const b = shape(render(W.root), 75);
  assert.equal(b.reasons[0].code, 'lock-busy');
  lock.release();
  fs.rmSync(path.join(W.root, 'run', 'run.lock'), { force: true });
  // from an attempt folder
  const dir = path.join(W.root, 'wt', 'f1-research-e1', 'copy');
  fs.mkdirSync(dir, { recursive: true });
  const src = scriptFile('render');
  fs.copyFileSync(src, path.join(dir, 'render.mjs'));
  fs.copyFileSync(path.join(path.dirname(src), 'lib.mjs'), path.join(dir, 'lib.mjs'));
  const snap2 = snapshot(W.root);
  const r = spawnSync(process.execPath, [path.join(dir, 'render.mjs'), '--root', W.root, '--ce', '1', '--now', NOW], { cwd: W.root, encoding: 'utf8', windowsHide: true });
  assert.equal(r.status, 3, r.stdout + r.stderr);
  assert.ok(JSON.stringify(JSON.parse(r.stdout.trim().split('\n').pop()).reasons).includes('run-from-attempt'));
  assert.deepEqual(snapshot(W.root), snap2);
});

test('T24 no .tmp file remains; every .json parses and carries schema_version 1', () => {
  const W = stdWorld();
  shape(render(W.root), 0);
  const all = [];
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else all.push(p); } })(W.root);
  assert.deepEqual(all.filter((p) => p.endsWith('.tmp')), []);
  for (const f of viewFiles(W.root).filter((x) => x.endsWith('.json'))) assert.equal(readJ(W.root, 'views/' + f).schema_version, 1, f);
});

test('T26 usage: an unknown flag, a missing --ce and a relative --root exit 66 before anything is read', () => {
  const W = stdWorld();
  const before = snapshot(W.root);
  assert.equal(run(['--root', W.root, '--ce', '1', '--bogus'], W.root).exit, 66);
  assert.equal(run(['--root', W.root], W.root).exit, 66);
  assert.equal(run(['--root', 'relative/dir', '--ce', '1'], W.root).exit, 66);
  assert.equal(run(['--root', W.root, '--ce', 'one'], W.root).exit, 66);
  assert.deepEqual(snapshot(W.root), before);
});

test('T27 store or ledger missing, or a ledger whose chain is broken: exit 2 / 3, no view written', () => {
  const W = stdWorld();
  fs.rmSync(path.join(W.root, 'run', 'ledger.jsonl'));
  assert.equal(shape(render(W.root), 2).code, 'not-run');
  assert.ok(!fs.existsSync(path.join(W.root, 'views', 'owner.md')));
  const W2 = stdWorld();
  const lines = readLedger(W2.root);
  lines[1].data = { session: 'edited' };
  fs.writeFileSync(ledgerPath(W2.root), lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
  assert.equal(shape(render(W2.root), 3).reasons[0].code, 'ledger-broken');
  assert.ok(!fs.existsSync(path.join(W2.root, 'views', 'owner.md')));
});

test('T25a needs-app: real token fields and helper linking (tokens.complete on real transcripts)', { skip: 'needs the app: CONTRACT section 7 item 7' }, () => {});
test('T25b needs-app: whether quiet_gaps separate real PC sleep from idle time', { skip: 'needs the app: CONTRACT section 7 items 6 and 8, the pilot induces sleep' }, () => {});
test('T25c needs-app: whether the owner page reads well on the owner screen', { skip: 'needs the app: a person looks at the page' }, () => {});
