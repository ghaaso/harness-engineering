// compare.mjs tests, written from spec/compare.mjs.md and CONTRACT.md (the script's code was not read while writing).
// One test per behaviour, named with its id. Each test builds its own run root under tcb-build/tmp and removes it afterwards.
// Run with: node --test tcb/test/compare.test.mjs (the library must be built first).
// ==== COMMON HELPERS BEGIN (same block in the protocol-freeze, compare and gate tests) ====
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
function taskRow(o = {}) {
  return {
    task: o.task ?? 'f1-research', field: o.field === undefined ? 'f1' : o.field, stage: o.stage ?? 'research', role: o.role ?? 'child',
    steps: o.steps ?? ['pack', 'review'], deps: o.deps ?? [], question_ids: o.question_ids ?? [], e_task: 1000, tier: 'sonnet',
    state: o.state ?? 'planned', step: o.step ?? 'none', epoch: o.epoch ?? 0, restarts: 0, handovers: 0, parks: 0, limit: false,
    fails: [], attempts: o.attempts ?? [], commits: {}, updated_rev: o.updated_rev ?? 0,
  };
}
function writeTasks(root, rows, rev = 0) {
  fs.writeFileSync(path.join(root, 'run', 'tasks.json'), JSON.stringify({ schema_version: 1, rev, tasks: rows }, null, 2));
}
function makeRoot({ ce = 1, params = {}, tasks = [] } = {}) {
  fs.mkdirSync(TMP, { recursive: true });
  const root = fs.mkdtempSync(path.join(TMP, 'tst-'));
  ROOTS.push(root);
  for (const d of ['tcb', 'plan/frozen', 'plan/protocols', 'plan/our-work', 'run', 'store/objects', 'store/commits', 'store/status', 'views', 'queue', 'completeness/model', 'sealed/heldout', 'sealed/seeds', 'sealed/plants', 'sealed/blind', 'wt', 'transcripts']) {
    fs.mkdirSync(path.join(root, d), { recursive: true });
  }
  for (const sub of ['schemas', 'profiles', 'settings', 'agents', 'briefs']) {
    const src = path.join(TCB, sub);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(root, 'tcb', sub), { recursive: true });
  }
  fs.writeFileSync(path.join(root, 'tcb', 'thresholds.json'), JSON.stringify(thresholdsFile({ transcripts_root: fwd(root) + '/transcripts', ...params }), null, 2));
  fs.writeFileSync(path.join(root, 'run', 'coord.json'), JSON.stringify({ schema_version: 1, ce, started_at: NOW, tcb_commit: 'a'.repeat(40) }, null, 2));
  writeTasks(root, tasks);
  return root;
}

// ---- jsonl, ledger (hash chain of CONTRACT 3.7) ----
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
  const line = { seq: lines.length + 1, prev, ts: extra.ts ?? NOW, ce: 1, writer: 'test-fixture', writer_sha: ZERO, kind };
  for (const [k, v] of Object.entries(extra)) if (v !== undefined && k !== 'ts') line[k] = v;
  line.data = data;
  line.hash = sha(prev + canon(line)); // the hash covers the line without its own hash field
  fs.mkdirSync(path.dirname(ledgerPath(root)), { recursive: true });
  fs.appendFileSync(ledgerPath(root), JSON.stringify(line) + '\n');
  return line.seq;
}
function rewriteLedger(root, keep) {
  const lines = readLedger(root).slice(0, keep);
  fs.writeFileSync(ledgerPath(root), lines.map((l) => JSON.stringify(l)).join('\n') + (lines.length ? '\n' : ''));
}

// ---- running a script as a child process ----
function findScript(name) {
  const cands = [path.join(TCB, 'scripts', name + '.mjs'), path.join(TCB, name + '.mjs')];
  return cands.find((p) => fs.existsSync(p)) ?? cands[0];
}
function run(script, argv, root, scriptPath) {
  const r = spawnSync(process.execPath, [scriptPath ?? findScript(script), ...argv], { cwd: root, encoding: 'utf8', windowsHide: true, shell: false, timeout: 180000, maxBuffer: 64 << 20 });
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
function snapshot(root) {
  const out = {};
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      const rel = fwd(path.relative(root, p));
      if (rel === 'tcb') continue;
      if (e.isSymbolicLink()) { out[rel] = 'link'; continue; }
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
// compare specific helpers
// ---------------------------------------------------------------------------------------------
const SCRIPT = 'compare';
const LABEL = 'descriptive, n = 1 per arm';
const PREFIX = { card: 'c', pack: 'p', review: 'r', manifest: 'm', certificate: 'x' };
const ARM_NAMES = ['T', 'S1', 'S2', 'R_same', 'R1', 'R2'];
const TASK_NAMES = ['f1-research', 'f1-review-t', 's1-research', 'f1-review-r1', 'f1-review-r2', 's2-research'];
const ARMS4 = {
  T: { pack: 'f1-research.pack', review: 'f1-review-t.review' },
  S1: { pack: 's1-research.pack', review: 's1-research.review' },
  R_same: { review: 'f1-research.review' },
  R1: { review: 'f1-review-r1.review' },
};
const SID1 = '11111111-1111-4111-8111-111111111111';
const SID2 = '22222222-2222-4222-8222-222222222222';
const SIDS = '33333333-3333-4333-8333-333333333333';
const writeJson = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v, null, 2)); };
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

// ---- store objects, status, commit records ----
function putObj(root, value) {
  const bytes = canon(value);
  const hex = sha(bytes);
  const id = PREFIX[value.kind] + '_' + hex.slice(0, 16);
  fs.writeFileSync(path.join(root, 'store', 'objects', id + '.json'), bytes);
  return { id, sha: hex, value };
}
const statusPath = (root) => path.join(root, 'store', 'status', 'card_status.jsonl');
function addStatus(root, card, status) {
  const seq = readJsonl(statusPath(root)).length + 1;
  fs.mkdirSync(path.dirname(statusPath(root)), { recursive: true });
  fs.appendFileSync(statusPath(root), JSON.stringify({ seq, card_id: card.id, card_sha: card.sha, status, reason: 'ok', at: NOW }) + '\n');
}
function confirm(root, card) {
  addStatus(root, card, 'witnessed');
  addStatus(root, card, 'confirmed');
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
    schema_version: 1, kind: 'card', field: 'f1', question_ids: o.qids ?? ['f1-g1-01'], route: 'keyword',
    source: { url: 'https://example.test/' + tag, canonical_id: 'doi:10.0/' + tag, primary_id: 'doi:10.0/' + tag, date: '2026-01-02', evidence_type: 'controlled' },
    quote: 'synthetic quote ' + tag,
    measured: { approach_id: 'a1', measure: 'm1', value: 10, unit: 'pct', baseline: 8, baseline_kind: 'control', better: 'higher', effect: 'improves' },
    conditions: o.conditions ?? { task: ['repair'], model_family: ['fam'], language: ['py'] },
    what_measured: 'synthetic measurement ' + tag,
  };
}
const SENT = (sid, cites, o = {}) => ({ sid, approach_id: 'a1', measure: 'm1', kind: o.kind ?? 'fact', text: o.text ?? 'synthetic sentence ' + sid, cites, applies_to: o.applies ?? {} });
const qshaOf = (qids) => sha(canon([...qids].sort()));
function mkPack(o) {
  return { schema_version: 1, kind: 'pack', field: 'f1', questions_sha: qshaOf(o.qids ?? ['f1-g1-01', 'f1-g1-02']), cards: [...new Set(o.cards)].sort(), conclusions: [], not_covered: [] };
}
function mkReview(o) {
  return { schema_version: 1, kind: 'review', field: 'f1', task: o.task, pack: o.pack, sentences: o.sentences ?? [], verdicts: [], dismissals: [], our_work_findings: [] };
}
// A pack and a review committed under the named tasks; `packTask` null means no pack step (a review-only arm).
function commitArm(root, { packTask = null, reviewTask, cards, packCards, sentences, qids }) {
  const P = putObj(root, mkPack({ cards: (packCards ?? cards).map((c) => c.id), qids }));
  const R = putObj(root, mkReview({ task: reviewTask, pack: P.id, sentences }));
  if (packTask) addCommit(root, { task: packTask, step: 'pack', outputs: [...cards.map((c) => ({ ...c, kind: 'card' })), { ...P, kind: 'pack' }] });
  addCommit(root, { task: reviewTask, step: 'review', outputs: [{ ...R, kind: 'review' }] });
  return { P, R };
}
function freezeProtocol(root, qids = ['f1-g1-01', 'f1-g1-02']) {
  const v = {
    schema_version: 1, kind: 'protocol', field: 'f1', question_ids: qids,
    criteria: { include: [{ code: 'I1', text: 'synthetic include' }], exclude: [{ code: 'E1', text: 'synthetic exclude' }] },
    routes: ['keyword'], card_schema_version: 1, certainty_method: 'synthetic', sesoi: { m1: 1 },
    outlist_vocab: { approaches: ['a1'], measures: ['m1'], effects: ['improves'] },
    seeds: [], must_read: [], fixed_files: [], cross_field: [], approval: { quote: 'synthetic approval', at: NOW },
  };
  const bytes = canon(v);
  const h = sha(bytes);
  const rel = `plan/frozen/protocol-f1-${h.slice(0, 12)}.json`;
  fs.writeFileSync(path.join(root, rel), bytes);
  addLedger(root, 'protocol-freeze', { name: 'protocol-f1', sha256: h, path: rel });
}
function mkPlan(armTasks, o = {}) {
  return {
    schema_version: 1, kind: 'analysis-plan', units: 'questions', primary: 'answered questions', secondary: ['tokens'], delta: 'none',
    decision_rules: ['report counts only'], looks: 1, arm_budget: { T: 1, R_same: 1, R1: 1, S1: 1 }, arm_tasks: armTasks,
    predicted_total: o.predicted ?? 1000000, labels: [LABEL], approval: { quote: 'synthetic plan approval', at: NOW },
  };
}
// the draft is always written; the frozen copy and its ledger line only when frozen
function setPlan(root, armTasks, o = {}) {
  const plan = mkPlan(armTasks, o);
  writeJson(path.join(root, 'plan', 'analysis-plan.json'), plan);
  const bytes = canon(plan);
  const h = sha(bytes);
  const rel = `plan/frozen/analysis-plan-${h.slice(0, 12)}.json`;
  if (o.frozen !== false) {
    fs.writeFileSync(path.join(root, rel), bytes);
    addLedger(root, 'plan-freeze', { name: 'analysis-plan', sha256: h, path: rel });
  }
  return { plan, sha: h, rel };
}
const ROWS = (attempts = {}) => TASK_NAMES.map((t) => taskRow({ task: t, steps: t === 'f1-research' || t === 's1-research' || t === 's2-research' ? ['pack', 'review'] : ['review'], state: 'committed', step: 'bound', epoch: attempts[t] ? 1 : 0, attempts: attempts[t] ?? [] }));
// cards A (q1) and B (q2), both confirmed
function baseRoot(o = {}) {
  const root = makeRoot({ params: o.params });
  writeTasks(root, o.rows ?? ROWS());
  freezeProtocol(root, o.qids);
  const A = putObj(root, mkCard({ tag: 'A', qids: ['f1-g1-01'] }));
  const B = putObj(root, mkCard({ tag: 'B', qids: ['f1-g1-02'] }));
  confirm(root, A);
  confirm(root, B);
  return { root, A, B };
}
// the default world: four committed arms, a frozen plan
function fourArms(o = {}) {
  const w = baseRoot(o);
  const { root, A, B } = w;
  const s = (tag, extra = {}) => [SENT('s1', [A.id], { text: extra.text ?? `synthetic finding ${tag}` }), SENT('s2', [B.id], { text: `synthetic second finding ${tag}`, kind: 'judgment' })];
  const arms = {
    T: commitArm(root, { packTask: 'f1-research', reviewTask: 'f1-review-t', cards: [A, B], sentences: s('alpha', { text: o.textT }) }),
    S1: commitArm(root, { packTask: 's1-research', reviewTask: 's1-research', cards: [A, B], sentences: s('beta') }),
    R_same: commitArm(root, { reviewTask: 'f1-research', cards: [A, B], sentences: s('gamma') }),
    R1: commitArm(root, { reviewTask: 'f1-review-r1', cards: [A, B], sentences: s('delta') }),
  };
  const plan = setPlan(root, ARMS4, { predicted: o.predicted, frozen: o.frozen });
  return { ...w, arms, plan };
}
const anon = (root, extra = []) => run(SCRIPT, ['anon', '--root', root, '--ce', '1', '--now', NOW, ...extra], root);
const score = (root, extra = []) => run(SCRIPT, ['score', '--root', root, '--ce', '1', '--now', NOW, ...extra], root);
const cmpOf = (root) => readJson(path.join(root, 'views', 'comparison.json'));
const compareChecks = (root) => readLedger(root).filter((l) => l.kind === 'check' && l.data.check === 'compare');
const blindFiles = (root) => fs.readdirSync(path.join(root, 'views', 'blind')).sort();
const keyOf = (root, planSha) => readJson(path.join(root, 'sealed', 'blind', planSha.slice(0, 12) + '.json'));

// ---- synthetic transcripts in the shape of CONTRACT 4.8 ----
function writeTranscript(file, { sessionId, cwd, calls = [], structured = null }) {
  const recs = calls.map((c, i) => ({
    type: 'assistant', sessionId, cwd, timestamp: c.ts, isSidechain: false, uuid: `u-${sessionId.slice(0, 4)}-${i}`,
    message: { id: c.id, role: 'assistant', model: 'claude-sonnet-5-5', content: [{ type: 'text', text: 'x' }], usage: { input_tokens: c.input ?? 0, cache_read_input_tokens: c.cache_read ?? 0, cache_creation_input_tokens: c.cache_write ?? 0, output_tokens: c.output ?? 0 } },
  }));
  if (structured) {
    recs.push({
      type: 'assistant', sessionId, cwd, timestamp: NOW, uuid: 'u-struct',
      message: { id: 'm-struct', role: 'assistant', model: 'claude-sonnet-5-5', content: [{ type: 'tool_use', id: 'tu-struct', name: 'StructuredOutput', input: structured }], usage: { input_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 1 } },
    });
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, recs.map((r) => JSON.stringify(r)).join('\n') + '\n');
}
const sessionFile = (root, sid) => path.join(root, 'transcripts', 'proj-a', `${sid}.jsonl`);
const helperFile = (root, sid, n) => path.join(root, 'transcripts', 'proj-a', sid, 'subagents', `agent-${n}.jsonl`);
const attempt = (task, sid) => [{ epoch: 1, folder: `wt/${task}-e1`, session: sid, stop: 'confirmed' }];
const W = { read: 0.05, write: 1.25, out: 5 };
const weightedOf = (c) => (c.input ?? 0) + W.read * (c.cache_read ?? 0) + W.write * (c.cache_write ?? 0) + W.out * (c.output ?? 0);
const countOf = (c) => (c.input ?? 0) + (c.cache_read ?? 0) + (c.cache_write ?? 0) + (c.output ?? 0);

// ---------------------------------------------------------------------------------------------
// Behaviours (spec/compare.mjs.md "Behaviours")
// ---------------------------------------------------------------------------------------------

test('T1 anon with a frozen plan and four committed arms: four blinded items, an index and a key that maps each item to one arm', () => {
  const w = fourArms();
  const j = shape(anon(w.root), SCRIPT, 0);
  assert.equal(j.mode, 'anon');
  assert.deepEqual(blindFiles(w.root), ['index.json', 'item-b1.md', 'item-b2.md', 'item-b3.md', 'item-b4.md']);
  const index = readJson(path.join(w.root, 'views', 'blind', 'index.json'));
  assert.deepEqual(index.items, ['b1', 'b2', 'b3', 'b4']);
  assert.deepEqual(index.arm_names, ['R1', 'R_same', 'S1', 'T']);
  const key = keyOf(w.root, w.plan.sha);
  assert.equal(key.plan_sha256, w.plan.sha);
  assert.deepEqual(Object.keys(key.items).sort(), ['b1', 'b2', 'b3', 'b4']);
  assert.deepEqual(Object.values(key.items).map((x) => x.arm).sort(), ['R1', 'R_same', 'S1', 'T']);
  for (const v of Object.values(key.items)) assert.deepEqual(Object.keys(v), ['arm']);
  assert.ok(!JSON.stringify(j.result).includes('"arm"'), 'the printed result does not give the mapping away');
  const checks = compareChecks(w.root);
  assert.equal(checks.length, 1);
  assert.equal(checks[0].data.subject, 'anon');
  assert.equal(checks[0].data.result, 'pass');
});

test('T2 no blinded file holds an object id, a task name, an arm name, wt/, an epoch marker or a url; each cited card appears once as [n]', () => {
  const tricky = `see ${'c_0123456789abcdef'} at https://example.test/path in f1-research epoch 3 for S1 and R_same via wt/f1-research-e1/staging done`;
  const w = fourArms({ textT: tricky });
  shape(anon(w.root), SCRIPT, 0);
  for (const f of blindFiles(w.root).filter((n) => n.startsWith('item-'))) {
    const text = fs.readFileSync(path.join(w.root, 'views', 'blind', f), 'utf8');
    assert.ok(!/[cprmxds]_[0-9a-f]{16}/.test(text), f + ' has an object id');
    for (const t of TASK_NAMES) assert.ok(!text.includes(t), f + ' names the task ' + t);
    assert.ok(!/\b(T|S1|S2|R_same|R1|R2)\b/.test(text), f + ' names an arm');
    assert.ok(!text.includes('wt/'), f + ' has a wt/ path');
    assert.ok(!/epoch\s*\d|-e\d+\b/i.test(text), f + ' has an epoch marker');
    assert.ok(!/https?:\/\//.test(text), f + ' has a url');
    const nums = [...text.matchAll(/^\[(\d+)\]$/gm)].map((m) => Number(m[1]));
    assert.deepEqual(nums, [...new Set(nums)].sort((a, b) => a - b), f + ': every cited card is listed once, in order of first citation');
    assert.ok(nums.length >= 2 && nums[0] === 1);
  }
});

test('T3 anon twice: byte-identical files and no new ledger line; the order depends only on the plan hash', () => {
  const w = fourArms();
  shape(anon(w.root), SCRIPT, 0);
  const snap = snapshot(w.root);
  const n = readLedger(w.root).length;
  const j = shape(anon(w.root), SCRIPT, 0);
  assert.deepEqual(snapshot(w.root), snap);
  assert.equal(readLedger(w.root).length, n);
  assert.deepEqual(j.ledger_seq, []);
  // another plan hash gives a permutation of the same items
  const w2 = fourArms({ predicted: 2000000 });
  shape(anon(w2.root), SCRIPT, 0);
  const k1 = keyOf(w.root, w.plan.sha);
  const k2 = keyOf(w2.root, w2.plan.sha);
  assert.notEqual(w.plan.sha, w2.plan.sha);
  assert.deepEqual(Object.values(k2.items).map((x) => x.arm).sort(), Object.values(k1.items).map((x) => x.arm).sort());
  assert.deepEqual(Object.keys(k2.items), Object.keys(k1.items));
});

test('T4 anon without a frozen plan, or with the frozen file edited, is exit 2 plan-not-frozen and writes nothing', () => {
  const w = fourArms({ frozen: false });
  const snap = snapshot(w.root);
  const j = shape(anon(w.root), SCRIPT, 2);
  assertReason(j, 'plan-not-frozen');
  assert.deepEqual(snapshot(w.root), snap);
  assert.ok(!fs.existsSync(path.join(w.root, 'views', 'blind')));
  const w2 = fourArms();
  fs.appendFileSync(path.join(w2.root, w2.plan.rel), ' ');
  const snap2 = snapshot(w2.root);
  assertReason(shape(anon(w2.root), SCRIPT, 2), 'plan-not-frozen');
  assert.deepEqual(snapshot(w2.root), snap2);
});

test('T5 the key lies under sealed/ only; the blinded item files hold no arm name', () => {
  const w = fourArms();
  shape(anon(w.root), SCRIPT, 0);
  const sealed = fs.readdirSync(path.join(w.root, 'sealed', 'blind'));
  assert.deepEqual(sealed, [w.plan.sha.slice(0, 12) + '.json']);
  for (const f of blindFiles(w.root).filter((n) => n.startsWith('item-'))) {
    const text = fs.readFileSync(path.join(w.root, 'views', 'blind', f), 'utf8');
    for (const arm of ARM_NAMES) assert.ok(!new RegExp(`\\b${arm}\\b`).test(text), `${f} names ${arm}`);
  }
  const index = fs.readFileSync(path.join(w.root, 'views', 'blind', 'index.json'), 'utf8');
  assert.ok(!/"arm"/.test(index), 'the index holds no item-to-arm mapping');
});

test('T6 Y follows the definition: confirmed, in the pack, tagged to the question, cited by a fact, within the conditions', () => {
  const q1 = 'f1-g1-01';
  const cases = [
    ['a confirmed card', {}, 1],
    ['conditions compared case-folded, a subset of the card', { applies: { language: ['PY'], model_family: ['FAM'] } }, 1],
    ['the same card only witnessed', { status: 'witnessed' }, 0],
    ['the card is not in the pack', { inPack: false }, 0],
    ['the card is tagged to another question', { qids: ['f1-g1-02'] }, 0],
    ['cited only by a judgment sentence', { kind: 'judgment' }, 0],
    ['applies_to has an extra language', { applies: { language: ['py', 'rust'] } }, 0],
    ['applies_to names a model family the card lacks', { applies: { model_family: ['other-family'] } }, 0],
  ];
  for (const [label, o, want] of cases) {
    const root = makeRoot();
    writeTasks(root, ROWS());
    freezeProtocol(root);
    const A = putObj(root, mkCard({ tag: 'A', qids: o.qids ?? [q1] }));
    if ((o.status ?? 'confirmed') === 'confirmed') confirm(root, A);
    else addStatus(root, A, o.status);
    commitArm(root, { reviewTask: 'f1-review-r1', cards: [A], packCards: o.inPack === false ? [] : [A], sentences: [SENT('s1', [A.id], { kind: o.kind, applies: o.applies })] });
    setPlan(root, { R1: { review: 'f1-review-r1.review' } });
    shape(score(root), SCRIPT, 0);
    const c = cmpOf(root);
    assert.equal(c.arms.R1.Y[q1], want, label);
    assert.equal(c.arms.R1.answered, Object.values(c.arms.R1.Y).reduce((a, b) => a + b, 0), label);
  }
  // outside_conditions counts the fact sentences whose cited card fails the within-conditions test
  const root = makeRoot();
  writeTasks(root, ROWS());
  freezeProtocol(root);
  const A = putObj(root, mkCard({ tag: 'A' }));
  confirm(root, A);
  commitArm(root, { reviewTask: 'f1-review-r1', cards: [A], sentences: [SENT('s1', [A.id], { applies: { language: ['rust'] } }), SENT('s2', [A.id]), SENT('s3', [A.id], { kind: 'judgment' })] });
  setPlan(root, { R1: { review: 'f1-review-r1.review' } });
  shape(score(root), SCRIPT, 0);
  const c = cmpOf(root);
  assert.equal(c.arms.R1.outside_conditions, 1);
  assert.equal(c.arms.R1.judgment_share, 1 / 3);
});

// two arms answering chosen question sets over four questions
function twoArms(tAns, sAns, { withS2 = null } = {}) {
  const qids = ['f1-g1-01', 'f1-g1-02', 'f1-g1-03', 'f1-g1-04', 'f1-g1-05'];
  const root = makeRoot();
  writeTasks(root, ROWS());
  freezeProtocol(root, qids);
  const cards = qids.map((q, i) => putObj(root, mkCard({ tag: 'Q' + i, qids: [q] })));
  for (const c of cards) confirm(root, c);
  const sent = (idxs) => idxs.map((i, n) => SENT('s' + (n + 1), [cards[i].id]));
  commitArm(root, { packTask: 'f1-research', reviewTask: 'f1-review-t', cards, sentences: sent(tAns), qids });
  commitArm(root, { packTask: 's1-research', reviewTask: 's1-research', cards, sentences: sent(sAns), qids });
  const arms = { T: ARMS4.T, S1: ARMS4.S1 };
  if (withS2 !== null) {
    commitArm(root, { packTask: 's2-research', reviewTask: 's2-research', cards, sentences: sent(withS2), qids });
    arms.S2 = { pack: 's2-research.pack', review: 's2-research.review' };
  }
  setPlan(root, arms);
  return root;
}

test('T7 McNemar: b, c and the exact two-sided p; conditional_on_run is true', () => {
  // T answers q1..q3, S1 answers q3..q4: b = 2 (q1, q2), c = 1 (q4), p = 1
  let root = twoArms([0, 1, 2], [2, 3]);
  shape(score(root), SCRIPT, 0);
  let m = cmpOf(root).comparison1.mcnemar;
  assert.deepEqual([m.b, m.c, m.p, m.conditional_on_run], [2, 1, 1, true]);
  // five discordant on one side: p = 2 x 1/32
  root = twoArms([0, 1, 2, 3, 4], []);
  shape(score(root), SCRIPT, 0);
  m = cmpOf(root).comparison1.mcnemar;
  assert.deepEqual([m.b, m.c], [5, 0]);
  assert.equal(m.p, 0.0625);
  // all concordant
  root = twoArms([0, 1], [0, 1]);
  shape(score(root), SCRIPT, 0);
  m = cmpOf(root).comparison1.mcnemar;
  assert.deepEqual([m.b, m.c, m.p], [0, 0, 1]);
  assert.deepEqual(cmpOf(root).comparison1.answered, { T: 2, S1: 2 });
});

test('T8 spread: above_spread only when |T - S1| exceeds |S1 - S2|; otherwise no_difference_shown; without S2 the spread is null', () => {
  // |T - S1| = 3 > |S1 - S2| = 1
  let root = twoArms([0, 1, 2], [], { withS2: [0] });
  shape(score(root), SCRIPT, 0);
  let c1 = cmpOf(root).comparison1;
  assert.equal(c1.spread, 1);
  assert.equal(c1.reading, 'above_spread');
  // equal gap: |T - S1| = 1 = |S1 - S2|
  root = twoArms([0], [], { withS2: [0, 1] });
  shape(score(root), SCRIPT, 0);
  c1 = cmpOf(root).comparison1;
  assert.equal(c1.spread, 2);
  assert.equal(c1.reading, 'no_difference_shown');
  root = twoArms([0, 1], [], { withS2: [0, 1] });
  shape(score(root), SCRIPT, 0);
  c1 = cmpOf(root).comparison1;
  assert.equal(c1.spread, 2);
  assert.equal(c1.reading, 'no_difference_shown');
  // without S2
  root = twoArms([0, 1, 2], []);
  shape(score(root), SCRIPT, 0);
  c1 = cmpOf(root).comparison1;
  assert.equal(c1.spread, null);
  assert.equal(c1.reading, 'no_difference_shown');
});

function addCertificate(root, review, plants, extra = {}) {
  const x = putObj(root, {
    schema_version: 1, kind: 'certificate', task: extra.task ?? 'f1-review-r1', subject: review.id, pack: review.value.pack, step_key: 'f'.repeat(64),
    read_set: [], read_set_sha: sha(canon([])), session_label: 'clean', coverage: { approved: 2, covered: 2, not_covered: [] },
    cited: { n: 4, confirmed: 3, failing: [{ card_id: 'c_0000000000000001', code: 'number-mismatch' }] }, plants, result: 'certified', reasons: [],
  });
  addLedger(root, 'certificate', { id: x.id, result: 'certified' });
  return x;
}

test('T9 comparison 2: plants copied from the certificates, spread |R1 - R2|, reading by the rule; a review without a certificate has plants null', () => {
  const w = baseRoot();
  const { root, A, B } = w;
  const mk = (task) => commitArm(root, { reviewTask: task, cards: [A, B], sentences: [SENT('s1', [A.id], { text: 'synthetic finding for ' + task.length })] }).R;
  const rSame = mk('f1-research');
  const r1 = mk('f1-review-r1');
  const r2 = mk('f1-review-r2');
  addCertificate(root, rSame, { k: 3, found: 3, contra_found: 0 }, { task: 'f1-research' });
  addCertificate(root, r1, { k: 3, found: 1, contra_found: 0 });
  addCertificate(root, r2, { k: 3, found: 2, contra_found: 1 }, { task: 'f1-review-r2' });
  setPlan(root, { R_same: { review: 'f1-research.review' }, R1: { review: 'f1-review-r1.review' }, R2: { review: 'f1-review-r2.review' } });
  shape(score(root), SCRIPT, 0);
  const c = cmpOf(root);
  assert.deepEqual(c.arms.R_same.plants, { k: 3, found: 3, contra_found: 0 });
  assert.deepEqual(c.arms.R1.plants, { k: 3, found: 1, contra_found: 0 });
  assert.deepEqual(c.arms.R2.plants, { k: 3, found: 2, contra_found: 1 });
  assert.equal(c.comparison2.spread, 1);
  assert.equal(c.comparison2.reading, 'above_spread'); // |R_same - R1| = 2 > 1
  assert.deepEqual(c.arms.R_same.citation_failures, { n: 4, failing: 1, rate: 0.25 });
  // R2 without a certificate: plants null, exit code unchanged
  const w2 = baseRoot();
  const mk2 = (task) => commitArm(w2.root, { reviewTask: task, cards: [w2.A, w2.B], sentences: [SENT('s1', [w2.A.id], { text: 'synthetic finding for ' + task.length })] }).R;
  const a = mk2('f1-research');
  const b = mk2('f1-review-r1');
  mk2('f1-review-r2');
  addCertificate(w2.root, a, { k: 3, found: 3, contra_found: 0 }, { task: 'f1-research' });
  addCertificate(w2.root, b, { k: 3, found: 1, contra_found: 0 });
  setPlan(w2.root, { R_same: { review: 'f1-research.review' }, R1: { review: 'f1-review-r1.review' }, R2: { review: 'f1-review-r2.review' } });
  shape(score(w2.root), SCRIPT, 0);
  const c2 = cmpOf(w2.root);
  assert.equal(c2.arms.R2.plants, null);
  assert.equal(c2.arms.R2.citation_failures, null);
  assert.equal(c2.comparison2.spread, null);
  assert.equal(c2.comparison2.reading, 'no_difference_shown');
});

test('T10 plan binding: a frozen matching plan is labelled; a draft only is exploratory; an edited frozen file is a hash mismatch; no plan is exit 2', () => {
  const w = fourArms();
  shape(score(w.root), SCRIPT, 0);
  let c = cmpOf(w.root);
  assert.equal(c.label, LABEL);
  assert.equal(c.plan_sha256, w.plan.sha);
  assert.equal(c.plan_amended, 0);
  assert.equal(c.field, 'f1');
  assert.equal(c.n_questions, 2);
  assert.ok(!c.reasons.includes('plan-not-frozen'));
  // a draft only
  const d = fourArms({ frozen: false });
  shape(score(d.root), SCRIPT, 0);
  c = cmpOf(d.root);
  assert.equal(c.label, 'exploratory');
  assert.equal(c.plan_sha256, null);
  assert.ok(c.reasons.includes('plan-not-frozen'));
  // the frozen file edited
  const e = fourArms();
  fs.appendFileSync(path.join(e.root, e.plan.rel), ' ');
  const je = shape(score(e.root), SCRIPT, 0);
  c = cmpOf(e.root);
  assert.equal(c.label, 'exploratory');
  assert.equal(c.plan_sha256, null);
  assert.ok(c.reasons.includes('plan-hash-mismatch'));
  assert.equal(je.result.label, 'exploratory');
  // neither a frozen plan nor a draft
  const n = fourArms({ frozen: false });
  fs.rmSync(path.join(n.root, 'plan', 'analysis-plan.json'));
  const snap = snapshot(n.root);
  shape(score(n.root), SCRIPT, 2);
  assert.deepEqual(snapshot(n.root), snap);
});

test('T11 tokens: count and weighted equal the hand sum over a session and its helpers; R_same takes the calls after the pack commit; a missing transcript gives null', () => {
  const T = (m) => `2026-11-17T10:${m}:00.000Z`;
  const c1 = { id: 'm1', ts: T('01'), input: 100, cache_read: 1000, cache_write: 200, output: 50 };
  const c2 = { id: 'm2', ts: T('04'), input: 10, cache_read: 2000, cache_write: 0, output: 20 };
  const c3 = { id: 'm3', ts: T('06'), input: 7, cache_read: 500, cache_write: 40, output: 9 };
  const c4 = { id: 'm4', ts: T('07'), input: 3, cache_read: 100, cache_write: 0, output: 5 };
  const h1 = { id: 'h1', ts: T('02'), input: 5, cache_read: 50, cache_write: 8, output: 2 };
  const h2 = { id: 'h2', ts: T('08'), input: 4, cache_read: 40, cache_write: 6, output: 1 };
  const t1 = { id: 't1', ts: T('09'), input: 11, cache_read: 0, cache_write: 0, output: 13 };
  const w = fourArms({ rows: ROWS({ 'f1-research': attempt('f1-research', SID1), 'f1-review-t': attempt('f1-review-t', SID2) }) });
  writeTranscript(sessionFile(w.root, SID1), { sessionId: SID1, cwd: path.join(w.root, 'wt', 'f1-research-e1'), calls: [c1, c2, c3, c4] });
  writeTranscript(helperFile(w.root, SID1, 'h1'), { sessionId: SID1, cwd: path.join(w.root, 'wt', 'f1-research-e1'), calls: [h1, h2] });
  writeTranscript(sessionFile(w.root, SID2), { sessionId: SID2, cwd: path.join(w.root, 'wt', 'f1-review-t-e1'), calls: [t1] });
  // the pack step of f1-research was committed at 10:05
  addLedger(w.root, 'commit', { step: 'pack', outputs_sha: ZERO, n: 3, git: null }, { task: 'f1-research', epoch: 1, ts: T('05') });
  shape(score(w.root), SCRIPT, 0);
  const c = cmpOf(w.root);
  const before = [c1, c2, h1, t1];
  const after = [c3, c4, h2];
  assert.equal(c.arms.T.tokens.count, before.reduce((n, x) => n + countOf(x), 0));
  assert.ok(Math.abs(c.arms.T.tokens.weighted - before.reduce((n, x) => n + weightedOf(x), 0)) < 1e-6);
  assert.equal(c.arms.T.tokens.calls, 4);
  assert.equal(c.arms.R_same.tokens.count, after.reduce((n, x) => n + countOf(x), 0));
  assert.ok(Math.abs(c.arms.R_same.tokens.weighted - after.reduce((n, x) => n + weightedOf(x), 0)) < 1e-6);
  assert.equal(c.arms.R_same.tokens.calls, 3);
  assert.equal(c.arms.R_same.tokens.boundary, 'ledger-ts');
  // the whole task is counted once in the prediction
  assert.equal(c.prediction.actual, [c1, c2, c3, c4, h1, h2, t1].reduce((n, x) => n + countOf(x), 0));
  // a missing transcript: tokens null and a reason naming the task
  const m = fourArms({ rows: ROWS({ 's1-research': attempt('s1-research', SIDS) }) });
  shape(score(m.root), SCRIPT, 0);
  const cm = cmpOf(m.root);
  assert.equal(cm.arms.S1.tokens, null);
  assert.ok(cm.reasons.includes('transcript-missing:s1-research'));
  assert.notEqual(cm.arms.T.tokens, null);
});

test('T12 confirmed_per_extra_million_tokens for a positive token difference only; prediction ratio and within_2x', () => {
  const world = (tTokens, sTokens, predicted) => {
    const w = twoArms([0, 1], [0]);
    // twoArms made the root; give the two research tasks one big call each and the plan its prediction
    writeTasks(w, ROWS({ 'f1-research': attempt('f1-research', SID1), 's1-research': attempt('s1-research', SID2) }));
    const T = '2026-11-17T10:01:00.000Z';
    writeTranscript(sessionFile(w, SID1), { sessionId: SID1, cwd: path.join(w, 'wt', 'f1-research-e1'), calls: [{ id: 'a', ts: T, input: tTokens }] });
    writeTranscript(sessionFile(w, SID2), { sessionId: SID2, cwd: path.join(w, 'wt', 's1-research-e1'), calls: [{ id: 'b', ts: T, input: sTokens }] });
    const plan = mkPlan({ T: ARMS4.T, S1: ARMS4.S1 }, { predicted });
    fs.writeFileSync(path.join(w, 'plan', 'analysis-plan.json'), JSON.stringify(plan));
    const bytes = canon(plan);
    const rel = `plan/frozen/analysis-plan-${sha(bytes).slice(0, 12)}.json`;
    fs.writeFileSync(path.join(w, rel), bytes);
    addLedger(w, 'plan-freeze', { name: 'analysis-plan', sha256: sha(bytes), path: rel });
    shape(score(w), SCRIPT, 0);
    return cmpOf(w);
  };
  // T answers 2, S1 answers 1; T costs 2.8 M, S1 1 M tokens: the difference is 1.8 M
  let c = world(2800000, 1000000, 2000000);
  assert.ok(Math.abs(c.comparison1.confirmed_per_extra_million_tokens - 1 / 1.8) < 1e-9);
  assert.ok(Math.abs(c.prediction.ratio - 1.9) < 1e-9);
  assert.equal(c.prediction.within_2x, true);
  assert.equal(c.prediction.predicted, 2000000);
  assert.equal(c.prediction.actual, 3800000);
  c = world(3200000, 1000000, 2000000);
  assert.ok(Math.abs(c.prediction.ratio - 2.1) < 1e-9);
  assert.equal(c.prediction.within_2x, false);
  // zero and negative differences
  assert.equal(world(1000000, 1000000, 2000000).comparison1.confirmed_per_extra_million_tokens, null);
  assert.equal(world(500000, 1000000, 2000000).comparison1.confirmed_per_extra_million_tokens, null);
});

// the scorer's blinded answers, built from the key of a real anon run
function scorerWorld() {
  const w = fourArms();
  shape(anon(w.root), SCRIPT, 0);
  const key = keyOf(w.root, w.plan.sha);
  return { ...w, key };
}
function scorerFile(w, scores, name = 'scorer.jsonl') {
  const file = path.join(w.root, 'transcripts', 'proj-a', name);
  writeTranscript(file, { sessionId: SIDS, cwd: w.root, structured: { scores } });
  return file;
}
const rub = (a, b, c, d) => ({ specificity: a, support: b, scope: c, calibration: d });

test('T13 scorer transcript: the guess rate against the threshold, rubric totals per arm; a bad score gives not_run scores-invalid', () => {
  const w = scorerWorld();
  const items = Object.keys(w.key.items).sort();
  const right = (id) => w.key.items[id].arm;
  const wrong = (id) => ['T', 'S1', 'R_same', 'R1'].find((a) => a !== right(id));
  const scores3 = items.map((id, i) => ({ item: id, rubric: rub(i, i, 1, 2), guess_arm: i < 3 ? right(id) : wrong(id) }));
  shape(score(w.root, ['--scorer-transcript', scorerFile(w, scores3)]), SCRIPT, 0);
  let c = cmpOf(w.root);
  assert.equal(c.blinding.n_items, 4);
  assert.equal(c.blinding.n_guessed_right, 3);
  assert.equal(c.blinding.rate, 0.75);
  assert.equal(c.blinding.threshold, 0.8);
  assert.equal(c.blinding.failed, false);
  items.forEach((id, i) => assert.equal(c.arms[right(id)].rubric_total, i + i + 1 + 2, 'rubric total of ' + right(id)));
  // all four right
  const scores4 = items.map((id, i) => ({ item: id, rubric: rub(4, 4, 4, 4), guess_arm: right(id) }));
  shape(score(w.root, ['--scorer-transcript', scorerFile(w, scores4, 'scorer2.jsonl')]), SCRIPT, 0);
  c = cmpOf(w.root);
  assert.equal(c.blinding.rate, 1);
  assert.equal(c.blinding.failed, true);
  // invalid: an item not in the key, a score of 5, a missing criterion
  const bad = [
    items.map((id, i) => ({ item: i === 0 ? 'b9' : id, rubric: rub(1, 1, 1, 1), guess_arm: right(id) })),
    items.map((id, i) => ({ item: id, rubric: rub(i === 0 ? 5 : 1, 1, 1, 1), guess_arm: right(id) })),
    items.map((id, i) => ({ item: id, rubric: i === 0 ? { specificity: 1, support: 1, scope: 1 } : rub(1, 1, 1, 1), guess_arm: right(id) })),
  ];
  bad.forEach((scores, n) => {
    shape(score(w.root, ['--scorer-transcript', scorerFile(w, scores, `bad${n}.jsonl`)]), SCRIPT, 0);
    c = cmpOf(w.root);
    assert.equal(c.blinding.status, 'not_run');
    assert.ok(c.reasons.includes('scores-invalid'));
  });
});

test('T14 without --scorer-transcript blinding and rubric are not_run and the check line is not_run; a missing file is exit 2; a file outside transcripts_root is exit 66', () => {
  const w = fourArms();
  shape(score(w.root), SCRIPT, 0);
  const c = cmpOf(w.root);
  assert.equal(c.blinding.status, 'not_run');
  assert.equal(c.arms.T.rubric_total.status, 'not_run');
  const checks = compareChecks(w.root);
  assert.equal(checks[checks.length - 1].data.subject, 'score');
  assert.equal(checks[checks.length - 1].data.result, 'not_run');
  const snap = snapshot(w.root);
  shape(score(w.root, ['--scorer-transcript', path.join(w.root, 'transcripts', 'proj-a', 'absent.jsonl')]), SCRIPT, 2);
  const outside = path.join(TMP, 'not-in-transcripts.jsonl');
  shape(score(w.root, ['--scorer-transcript', outside]), SCRIPT, 66);
  assert.deepEqual(snapshot(w.root), snap);
});

test('T15 an arm named in the plan but not committed is not_run, the others are computed; no committed arm is exit 2', () => {
  const w = fourArms();
  setPlan(w.root, { ...ARMS4, S2: { pack: 's2-research.pack', review: 's2-research.review' } });
  shape(score(w.root), SCRIPT, 0);
  const c = cmpOf(w.root);
  assert.equal(c.arms.S2.status, 'not_run');
  assert.ok(!('answered' in c.arms.S2));
  assert.equal(typeof c.arms.T.answered, 'number');
  assert.equal(c.comparison1.spread, null, 'an uncommitted S2 gives no spread');
  // nothing committed at all
  const root = makeRoot();
  writeTasks(root, ROWS());
  freezeProtocol(root);
  setPlan(root, ARMS4);
  const snap = snapshot(root);
  shape(score(root), SCRIPT, 2);
  shape(anon(root), SCRIPT, 2);
  assert.deepEqual(snapshot(root), snap);
});

test('T16 a cite with an s_ id, or an object whose bytes were edited, is exit 3 and nothing is written', () => {
  const w = baseRoot();
  const seeded = SENT('s1', ['s_0123456789abcdef']);
  commitArm(w.root, { reviewTask: 'f1-review-r1', cards: [w.A], sentences: [seeded] });
  setPlan(w.root, { R1: { review: 'f1-review-r1.review' } });
  const j = shape(score(w.root), SCRIPT, 3);
  assertReason(j, 'seed-id');
  assert.ok(!fs.existsSync(path.join(w.root, 'views', 'comparison.json')));
  const w2 = baseRoot();
  const arm = commitArm(w2.root, { reviewTask: 'f1-review-r1', cards: [w2.A], sentences: [SENT('s1', [w2.A.id])] });
  setPlan(w2.root, { R1: { review: 'f1-review-r1.review' } });
  const file = path.join(w2.root, 'store', 'objects', arm.R.id + '.json');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('synthetic sentence s1', 'an edited sentence'));
  const j2 = shape(score(w2.root), SCRIPT, 3);
  assertReason(j2, 'object-mismatch');
  assert.ok(!fs.existsSync(path.join(w2.root, 'views', 'comparison.json')));
  assertReason(shape(anon(w2.root), SCRIPT, 3), 'object-mismatch');
  assert.ok(!fs.existsSync(path.join(w2.root, 'views', 'blind')));
});

test('T17 u for R_same counts fact sentences with no cite in the pack', () => {
  const w = baseRoot();
  const other = putObj(w.root, mkCard({ tag: 'other', qids: ['f1-g1-02'] }));
  commitArm(w.root, { reviewTask: 'f1-research', cards: [w.A, other], packCards: [w.A], sentences: [SENT('s1', [w.A.id]), SENT('s2', [other.id]), SENT('s3', [], { kind: 'judgment' })] });
  setPlan(w.root, { R_same: { review: 'f1-research.review' } });
  shape(score(w.root), SCRIPT, 0);
  const u = cmpOf(w.root).arms.R_same.u;
  assert.equal(u.fact_sentences, 2);
  assert.equal(u.fact_citing_nothing_in_pack, 1);
  assert.equal(u.share, 0.5);
  assert.equal(u.checked_sample, null);
});

test('T18 a stale --ce is exit 64 with no file changed; a busy lock is exit 75', () => {
  const w = fourArms({ params: { lock_retries: 3 } });
  const snap = snapshot(w.root);
  shape(run(SCRIPT, ['score', '--root', w.root, '--ce', '2', '--now', NOW], w.root), SCRIPT, 64);
  shape(run(SCRIPT, ['anon', '--root', w.root, '--ce', '2', '--now', NOW], w.root), SCRIPT, 64);
  assert.deepEqual(snapshot(w.root), snap);
  const holder = holdLock(w.root);
  try {
    const before = snapshot(w.root);
    assertReason(shape(score(w.root), SCRIPT, 75), 'lock-busy');
    assertReason(shape(anon(w.root), SCRIPT, 75), 'lock-busy');
    assert.deepEqual(snapshot(w.root), before);
  } finally {
    holder.release();
  }
});

test('T19 --dry-run prints the figures, writes no file and no ledger line', () => {
  const w = fourArms();
  const snap = snapshot(w.root);
  const j = shape(score(w.root, ['--dry-run']), SCRIPT, 0);
  assert.equal(j.dry_run, true);
  assert.equal(j.result.comparison.arms.T.status, 'committed');
  assert.deepEqual(snapshot(w.root), snap);
  const a = shape(anon(w.root, ['--dry-run']), SCRIPT, 0);
  assert.equal(a.dry_run, true);
  assert.deepEqual(snapshot(w.root), snap);
  assert.ok(!fs.existsSync(path.join(w.root, 'run', 'run.lock')));
});

test('T20 the ledger after anon and score verifies; the check lines name compare; a second identical score appends nothing', () => {
  const w = fourArms();
  shape(anon(w.root), SCRIPT, 0);
  const first = shape(score(w.root), SCRIPT, 0);
  assert.equal(first.ledger_seq.length, 1);
  const n = readLedger(w.root).length;
  const again = shape(score(w.root), SCRIPT, 0);
  assert.deepEqual(again.ledger_seq, []);
  assert.equal(readLedger(w.root).length, n);
  const checks = compareChecks(w.root);
  assert.deepEqual(checks.map((l) => l.data.subject), ['anon', 'score']);
  verifyLedger(readLedger(w.root));
});

test('T21 comparison.json holds no wall-clock figure; two scores of the same inputs give identical bytes', () => {
  const w = fourArms();
  shape(score(w.root), SCRIPT, 0);
  const file = path.join(w.root, 'views', 'comparison.json');
  const a = fs.readFileSync(file);
  shape(score(w.root), SCRIPT, 0);
  assert.ok(a.equals(fs.readFileSync(file)));
  const text = a.toString('utf8');
  assert.ok(!/generated|written_at|"now"|\bnow\b/i.test(text), 'no generation time in the figures');
  const c = JSON.parse(text);
  assert.deepEqual(Object.keys(c).sort(), ['arms', 'blinding', 'comparison1', 'comparison2', 'field', 'label', 'n_questions', 'plan_amended', 'plan_sha256', 'prediction', 'reasons', 'schema_version']);
});

test('T22 the script copied under <root>/wt/ is exit 3; every outcome prints one JSON line with script compare', () => {
  const w = fourArms();
  const dir = path.join(w.root, 'wt', 'x');
  fs.mkdirSync(dir, { recursive: true });
  const src = findScript(SCRIPT);
  fs.copyFileSync(src, path.join(dir, SCRIPT + '.mjs'));
  const libSrc = path.join(path.dirname(src), 'lib.mjs');
  if (fs.existsSync(libSrc)) fs.copyFileSync(libSrc, path.join(dir, 'lib.mjs'));
  const j = shape(run(SCRIPT, ['score', '--root', w.root, '--ce', '1', '--now', NOW], w.root, path.join(dir, SCRIPT + '.mjs')), SCRIPT, 3);
  assertReason(j, 'run-from-attempt');
  assert.ok(!fs.existsSync(path.join(w.root, 'views', 'comparison.json')));
  shape(run(SCRIPT, ['score', '--root', w.root, '--ce', '1', '--nonsense'], w.root), SCRIPT, 66);
  shape(run(SCRIPT, ['nonsense', '--root', w.root, '--ce', '1'], w.root), SCRIPT, 66);
});

// ---------------------------------------------------------------------------------------------
// Needs the app
// ---------------------------------------------------------------------------------------------
test('NA1 a real scorer helper\'s result is extractable from its transcript (structured shape, CONTRACT 7 item 7) and its guess_arm is honest', { skip: 'needs the app' }, () => {});
test('NA2 the scorer cannot read sealed/ (role profile enforcement, CONTRACT 7 items 1-3)', { skip: 'needs the app' }, () => {});
