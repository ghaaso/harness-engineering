// protocol-freeze.mjs tests, written from spec/protocol-freeze.mjs.md and CONTRACT.md (the script's code was not read while writing).
// One test per behaviour, named with its id. Each test builds its own run root under tcb-build/tmp and removes it afterwards.
// Run with: node --test tcb/test/protocol-freeze.test.mjs (the library must be built first).
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
// protocol-freeze specific helpers
// ---------------------------------------------------------------------------------------------
const SCRIPT = 'protocol-freeze';
const PLAN_LABEL = 'descriptive, n = 1 per arm';
const SEEDS7 = ['sd-aa01', 'sd-bb02', 'sd-cc03', 'sd-dd04', 'sd-ee05', 'sd-ff06', 'sd-gg07'];
const SEEDS12 = [...SEEDS7, 'sd-hh08', 'sd-ii09', 'sd-jj10', 'sd-kk11', 'sd-ll12'];
const QUOTE = 'I approve protocol f1 as drafted today';
const cardVersion = () => {
  try { return JSON.parse(fs.readFileSync(path.join(TCB, 'schemas', 'card.schema.json'), 'utf8'))['x-version'] ?? 1; } catch { return 1; }
};
function mkProtocol(field = 'f1', o = {}) {
  return {
    schema_version: 1, kind: 'protocol', field,
    question_ids: o.qids ?? [`${field}-g1-01`, `${field}-g1-02`],
    criteria: o.criteria ?? { include: [{ code: 'I1', text: 'synthetic include rule' }], exclude: [{ code: 'E1', text: 'synthetic exclude rule' }] },
    routes: ['keyword', 'backward'], card_schema_version: o.cardVersion ?? cardVersion(), certainty_method: 'synthetic method',
    sesoi: o.sesoi ?? { m1: 1, m2: 2 },
    outlist_vocab: { approaches: ['a1', 'a2'], measures: o.measures ?? ['m1', 'm2'], effects: ['improves', 'worsens', 'no-effect', 'mixed'] },
    seeds: o.seeds ?? SEEDS7,
    must_read: o.mustRead ?? [{ url: 'https://example.test/a', why: 'synthetic reason' }],
    fixed_files: o.fixed ?? ['notes/a.md'],
    cross_field: o.cross ?? [],
    approval: { quote: o.quote ?? QUOTE, at: NOW },
  };
}
function mkPlan(o = {}) {
  return {
    schema_version: 1, kind: 'analysis-plan', units: 'questions', primary: 'answered questions', secondary: ['tokens'], delta: 'none',
    decision_rules: o.rules ?? ['report the counts and the label only'], looks: o.looks ?? 1,
    arm_budget: o.budget ?? { T: 1000000, R_same: 500000, R1: 500000, S1: 1000000 },
    arm_tasks: o.armTasks ?? { T: { pack: 'f1-research.pack', review: 'f1-research.review' } },
    predicted_total: o.predicted ?? 3000000, labels: o.labels ?? [PLAN_LABEL],
    approval: { quote: o.quote ?? 'I approve the analysis plan as drafted', at: NOW },
  };
}
const draftPath = (root, field = 'f1') => path.join(root, 'plan', 'protocols', `${field}.json`);
const planPath = (root) => path.join(root, 'plan', 'analysis-plan.json');
const writeJson = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v, null, 2)); };
const FILE = (field = 'f1') => `plan/protocols/${field}.json`;
function approve(root, subject = 'protocol:f1', quote = QUOTE, extra = {}) {
  return addLedger(root, 'owner', { act: extra.act ?? 'approve', subject, quote });
}
// a root with one drafted protocol and the owner's approval line
function world({ draft = mkProtocol(), approved = true, params, tasks } = {}) {
  const root = makeRoot({ params, tasks });
  writeJson(draftPath(root, draft.field), draft);
  if (approved) approve(root, `protocol:${draft.field}`, draft.approval.quote);
  return root;
}
const freeze = (root, extra = [], file = FILE()) => run(SCRIPT, ['freeze', '--root', root, '--ce', '1', '--file', file, '--now', NOW, ...extra], root);
const amend = (root, code = 'criteria', extra = [], file = FILE()) => run(SCRIPT, ['amend', '--root', root, '--ce', '1', '--file', file, '--reason-code', code, '--now', NOW, ...extra], root);
const planRun = (root, extra = []) => run(SCRIPT, ['plan', '--root', root, '--ce', '1', '--file', 'plan/analysis-plan.json', '--now', NOW, ...extra], root);
const frozenFiles = (root) => fs.readdirSync(path.join(root, 'plan', 'frozen')).sort();
const frozenOf = (root, j) => JSON.parse(fs.readFileSync(path.join(root, j.result.path), 'utf8'));
const sealedOf = (root, field = 'f1') => JSON.parse(fs.readFileSync(path.join(root, 'sealed', 'heldout', `${field}.json`), 'utf8'));
const kinds = (root) => readLedger(root).map((l) => l.kind);
// A refused run (exit 1/2/3): nothing frozen, only an incident and a check line were added.
function assertRefused(root, before, { frozenBefore = 0 } = {}) {
  assert.equal(frozenFiles(root).length, frozenBefore, 'no frozen file is written');
  const added = readLedger(root).slice(before);
  assert.equal(added.filter((l) => l.kind === 'incident').length, 1, 'exactly one incident line');
  assert.equal(added.find((l) => l.kind === 'incident').data.class, 'refusal');
  assert.ok(!added.some((l) => ['protocol-freeze', 'protocol-amend', 'plan-freeze', 'seed-split'].includes(l.kind)), 'no freeze line is written');
  verifyLedger(readLedger(root));
}

// ---------------------------------------------------------------------------------------------
// Behaviours (spec/protocol-freeze.mjs.md "Behaviours")
// ---------------------------------------------------------------------------------------------

test('T1 good protocol with the owner line: frozen file, sealed file, protocol-freeze then seed-split, ledger verifies', () => {
  const root = world();
  const j = shape(freeze(root), SCRIPT, 0);
  assert.equal(j.mode, 'freeze');
  assert.equal(j.result.name, 'protocol-f1');
  assert.equal(j.result.replay, false);
  assert.equal(j.result.amended, false);
  assert.match(j.result.sha256, /^[0-9a-f]{64}$/);
  assert.equal(j.result.sha12, j.result.sha256.slice(0, 12));
  const file = `plan/frozen/protocol-f1-${j.result.sha12}.json`;
  assert.equal(j.result.path, file);
  const bytes = fs.readFileSync(path.join(root, file));
  assert.equal(sha(bytes), j.result.sha256, 'the sha256 is the hash of the frozen bytes');
  assert.equal(bytes.toString('utf8'), canon(JSON.parse(bytes.toString('utf8'))), 'the frozen bytes are canonical JSON');
  assert.ok(fs.existsSync(path.join(root, 'sealed', 'heldout', 'f1.json')));
  const lines = readLedger(root);
  assert.deepEqual(lines.map((l) => l.kind), ['owner', 'protocol-freeze', 'seed-split', 'check']);
  assert.deepEqual(lines[1].data, { name: 'protocol-f1', sha256: j.result.sha256, path: file });
  assert.deepEqual(lines[2].data.field, 'f1');
  assert.deepEqual(lines[3].data, { check: 'protocol-freeze', subject: 'protocol-f1', result: 'pass', reasons: [] });
  assert.deepEqual(j.ledger_seq, [2, 3, 4]);
  verifyLedger(lines);
});

test('T2 a repeat of T1 is a replay: exit 0, nothing new, every byte unchanged', () => {
  const root = world();
  const first = shape(freeze(root), SCRIPT, 0);
  const before = snapshot(root);
  const j = shape(freeze(root), SCRIPT, 0);
  assert.equal(j.result.replay, true);
  assert.equal(j.result.sha256, first.result.sha256);
  assert.deepEqual(snapshot(root), before);
  assert.deepEqual(j.ledger_seq, []);
});

test('T3 a stale --ce exits 64 and writes nothing', () => {
  const root = world();
  const before = snapshot(root);
  const r = run(SCRIPT, ['freeze', '--root', root, '--ce', '2', '--file', FILE(), '--now', NOW], root);
  shape(r, SCRIPT, 64);
  assert.deepEqual(snapshot(root), before);
  assert.equal(frozenFiles(root).length, 0);
  assert.equal(fs.readdirSync(path.join(root, 'sealed', 'heldout')).length, 0);
});

test('T4 run.lock held by a live process: exit 75 after the bounded retry, nothing written', () => {
  const root = world({ params: { lock_retries: 3 } });
  const holder = holdLock(root);
  try {
    const before = snapshot(root);
    const j = shape(freeze(root), SCRIPT, 75);
    assertReason(j, 'lock-busy');
    assert.deepEqual(snapshot(root), before);
  } finally {
    holder.release();
  }
});

test('T5 --file outside the allowed place is exit 66 file-path and nothing is read or written', () => {
  const root = world();
  const outside = fs.mkdtempSync(path.join(TMP, 'out-'));
  ROOTS.push(outside);
  const junction = path.join(root, 'plan', 'protocols', 'jx');
  fs.symlinkSync(outside, junction, 'junction');
  fs.writeFileSync(path.join(outside, 'x.json'), JSON.stringify(mkProtocol()));
  try {
    const before = snapshot(root);
    const cases = ['wt/x/protocol.json', 'plan/other.json', 'plan/protocols/../../x.json', 'plan/protocols/jx/x.json', fwd(path.join(TMP, 'elsewhere.json')), 'plan/protocols/f1.txt'];
    for (const f of cases) {
      const j = shape(freeze(root, [], f), SCRIPT, 66);
      assertReason(j, 'file-path');
    }
    // the plan file and a protocol file are each refused for the other mode
    assertReason(shape(freeze(root, [], 'plan/analysis-plan.json'), SCRIPT, 66), 'file-path');
    assertReason(shape(run(SCRIPT, ['plan', '--root', root, '--ce', '1', '--file', FILE(), '--now', NOW], root), SCRIPT, 66), 'file-path');
    assert.deepEqual(snapshot(root), before);
  } finally {
    try { fs.rmdirSync(junction); } catch { /* link only */ }
  }
});

test('T6 a missing draft is exit 2 missing, a draft that is not JSON is exit 2 unparseable', () => {
  const root = makeRoot();
  const missing = shape(freeze(root), SCRIPT, 2);
  assertReason(missing, 'missing');
  fs.writeFileSync(draftPath(root), 'this is not json');
  const bad = shape(freeze(root), SCRIPT, 2);
  assertReason(bad, 'unparseable');
  assert.equal(frozenFiles(root).length, 0);
});

test('T7 schema_version 2 is schema-version; an extra property or a status field is schema-invalid naming the path', () => {
  for (const [mutate, code, needle] of [
    [(d) => ({ ...d, schema_version: 2 }), 'schema-version', null],
    [(d) => ({ ...d, extra_thing: 1 }), 'schema-invalid', 'extra_thing'],
    [(d) => ({ ...d, status: 'frozen' }), 'schema-invalid', 'status'],
  ]) {
    const root = world({ draft: mutate(mkProtocol()) });
    const before = readLedger(root).length;
    const j = shape(freeze(root), SCRIPT, 1);
    assertReason(j, code);
    if (needle) assert.ok(JSON.stringify(j.reasons).includes(needle), 'the reason names ' + needle + ': ' + JSON.stringify(j.reasons));
    assertRefused(root, before);
  }
});

test('T8 approval: each of six failures is exit 1 with nothing written but one incident', () => {
  const cases = [
    ['blank quote', (root) => { writeJson(draftPath(root), mkProtocol('f1', { quote: '   ' })); approve(root, 'protocol:f1', '   '); }, 'no-approval'],
    ['no ledger owner line', () => {}, 'approval-unrecorded'],
    ['an owner line with another quote', (root) => approve(root, 'protocol:f1', 'a different quote entirely'), 'approval-unrecorded'],
    ['act accept', (root) => approve(root, 'protocol:f1', QUOTE, { act: 'accept' }), 'approval-unrecorded'],
    ['the subject of another field', (root) => approve(root, 'protocol:f2', QUOTE), 'approval-unrecorded'],
  ];
  for (const [label, setup, code] of cases) {
    const root = world({ approved: false });
    setup(root);
    const before = readLedger(root).length;
    const j = shape(freeze(root), SCRIPT, 1);
    assertReason(j, code);
    assertRefused(root, before);
    assert.ok(label);
  }
  // a line with a lower seq than the last freeze: the old approval cannot approve an amendment
  const root = world();
  shape(freeze(root), SCRIPT, 0);
  const d = mkProtocol();
  d.criteria.include.push({ code: 'I2', text: 'synthetic second include rule' });
  writeJson(draftPath(root), d);
  const before = readLedger(root).length;
  const j = shape(amend(root), SCRIPT, 1);
  assertReason(j, 'approval-unrecorded');
  assertRefused(root, before, { frozenBefore: 1 });
});

test('T8b an owner line that names the approved content (draft_sha256) covers only that content; a line without the field is not bound', () => {
  const contentSha = (d) => { const { approval, ...rest } = d; return sha(canon(rest)); };
  const draft = mkProtocol();
  const edited = mkProtocol();
  edited.criteria.include.push({ code: 'I2', text: 'synthetic rule added after the approval' });
  // approved content differs from the draft being frozen: refused, nothing frozen
  let root = world({ approved: false });
  addLedger(root, 'owner', { act: 'approve', subject: 'protocol:f1', quote: QUOTE, draft_sha256: contentSha(edited) });
  let before = readLedger(root).length;
  const j = shape(freeze(root), SCRIPT, 1);
  assertReason(j, 'approval-unrecorded');
  assertRefused(root, before);
  // approved content equals the draft: frozen
  root = world({ approved: false });
  addLedger(root, 'owner', { act: 'approve', subject: 'protocol:f1', quote: QUOTE, draft_sha256: contentSha(draft) });
  shape(freeze(root), SCRIPT, 0);
  // an older line for other content and a newer one for this content: the newer one covers it
  root = world({ approved: false });
  addLedger(root, 'owner', { act: 'approve', subject: 'protocol:f1', quote: QUOTE, draft_sha256: contentSha(edited) });
  addLedger(root, 'owner', { act: 'approve', subject: 'protocol:f1', quote: QUOTE, draft_sha256: contentSha(draft) });
  shape(freeze(root), SCRIPT, 0);
});

test('T9 keys: format, prefix, duplicate, two owners, no owner, cross-self fail; a valid cross-field entry freezes', () => {
  const f2 = { kind: 'protocol', field: 'f2', question_ids: ['f2-g1-01'] };
  const cases = [
    ['key-format', { qids: ['f1-03'] }, []],
    ['key-prefix', { qids: ['g1-a-01'] }, []],
    ['key-duplicate', { qids: ['f1-g1-01', 'f1-g1-01'] }, []],
    ['key-two-owners', { qids: ['f1-g1-01', 'f1-g1-02'] }, [{ kind: 'protocol', field: 'f2', question_ids: ['f1-g1-02'] }]],
    ['key-no-owner', { cross: [{ question_id: 'f2-g1-09', owner_field: 'f2' }] }, [f2]],
    ['cross-self', { cross: [{ question_id: 'f1-g1-01', owner_field: 'f1' }] }, []],
  ];
  for (const [code, opts, siblings] of cases) {
    const root = world({ draft: mkProtocol('f1', opts) });
    for (const s of siblings) writeJson(draftPath(root, s.field), s);
    const before = readLedger(root).length;
    const j = shape(freeze(root), SCRIPT, 1);
    assertReason(j, code);
    assertRefused(root, before);
  }
  // a valid cross-field entry freezes and the foreign key stays out of the owned list
  const root = world({ draft: mkProtocol('f1', { cross: [{ question_id: 'f2-g1-01', owner_field: 'f2' }] }) });
  writeJson(draftPath(root, 'f2'), f2);
  const j = shape(freeze(root), SCRIPT, 0);
  const frozen = frozenOf(root, j);
  assert.ok(!frozen.question_ids.includes('f2-g1-01'));
  assert.deepEqual(frozen.cross_field, [{ question_id: 'f2-g1-01', owner_field: 'f2' }]);
});

test('T10 a sibling protocol that is not JSON is exit 2 sibling-unreadable', () => {
  const root = world();
  fs.writeFileSync(draftPath(root, 'f2'), '{ not json');
  const before = readLedger(root).length;
  const j = shape(freeze(root), SCRIPT, 2);
  assertReason(j, 'sibling-unreadable');
  assertRefused(root, before);
});

test('T11 content checks: card version, sesoi, criteria, fixed files, must-read urls', () => {
  const cases = [
    ['card-version', { cardVersion: 9 }],
    ['sesoi-missing', { sesoi: { m1: 1 } }],
    ['sesoi-unknown', { sesoi: { m1: 1, m2: 2, m3: 3 } }],
    ['criteria-dup', { criteria: { include: [{ code: 'I1', text: 'synthetic one' }], exclude: [{ code: 'I1', text: 'synthetic two' }] } }],
    ['unsafe-path', { fixed: ['../x'] }],
    ['unsafe-path', { fixed: ['C:/x'] }],
    ['unsafe-path', { fixed: ['tcb/x'] }],
    ['bad-url', { mustRead: [{ url: 'ftp://example.test/a', why: 'synthetic reason' }] }],
  ];
  for (const [code, opts] of cases) {
    const root = world({ draft: mkProtocol('f1', opts) });
    const before = readLedger(root).length;
    const j = shape(freeze(root), SCRIPT, 1);
    assertReason(j, code);
    assertRefused(root, before);
  }
  // every slug is listed, not just the first
  const root = world({ draft: mkProtocol('f1', { cardVersion: 9, fixed: ['tcb/x'], sesoi: { m1: 1 } }) });
  const j = shape(freeze(root), SCRIPT, 1);
  for (const code of ['card-version', 'unsafe-path', 'sesoi-missing']) assertReason(j, code);
});

test('T12 seed split of 7: 3 held out and 4 in the brief, disjoint, reproducible, order-independent; --rng-seed is recorded', () => {
  const root = world();
  const j = shape(freeze(root), SCRIPT, 0);
  const sealed = sealedOf(root);
  assert.equal(j.result.seed_split.n_heldout, 3);
  assert.equal(j.result.seed_split.n_brief, 4);
  const brief = frozenOf(root, j).seeds;
  assert.equal(sealed.heldout.length, 3);
  assert.equal(brief.length, 4);
  assert.deepEqual(brief.filter((s) => sealed.heldout.includes(s)), [], 'the halves are disjoint');
  assert.deepEqual([...brief, ...sealed.heldout].sort(), [...SEEDS7].sort(), 'the union is the draft list');
  assert.deepEqual(sealed.heldout, [...sealed.heldout].sort(), 'heldout is sorted');
  assert.equal(sealed.field, 'f1');
  assert.equal(sealed.protocol_sha256, j.result.sha256);
  assert.equal(sealed.seeds_sha256, sha(canon([...SEEDS7].sort())));
  // the same split when the draft lists the seeds in another order
  const root2 = world({ draft: mkProtocol('f1', { seeds: [...SEEDS7].reverse() }) });
  const j2 = shape(freeze(root2), SCRIPT, 0);
  assert.deepEqual(sealedOf(root2).heldout, sealed.heldout);
  assert.equal(j2.result.sha256, j.result.sha256);
  // --rng-seed is recorded in the ledger and in the sealed file; different seeds give different splits
  const splits = [];
  for (const rs of ['seed-one', 'seed-two', 'seed-three']) {
    const r = world({ draft: mkProtocol('f1', { seeds: SEEDS12 }) });
    const jr = shape(freeze(r, ['--rng-seed', rs]), SCRIPT, 0);
    assert.equal(jr.result.seed_split.rng_seed, rs);
    assert.equal(sealedOf(r).rng_seed, rs);
    assert.equal(readLedger(r).find((l) => l.kind === 'seed-split').data.rng_seed, rs);
    assert.deepEqual(readLedger(r).find((l) => l.kind === 'seed-split').data, { field: 'f1', n_brief: 6, n_heldout: 6, rng_seed: rs });
    splits.push(sealedOf(r).heldout.join(','));
  }
  assert.ok(new Set(splits).size >= 2, 'two different rng seeds give different splits');
});

test('T13 the held-out ids occur nowhere outside sealed/ and plan/protocols/; 1 seed and 0 seeds still write the seed-split line', () => {
  const root = world();
  shape(freeze(root), SCRIPT, 0);
  const held = sealedOf(root).heldout;
  assert.equal(held.length, 3);
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      const rel = fwd(path.relative(root, p));
      if (rel === 'tcb' || rel === 'sealed' || rel === 'plan/protocols') continue;
      if (e.isDirectory()) { walk(p); continue; }
      const text = fs.readFileSync(p, 'utf8');
      for (const id of held) assert.ok(!text.includes(id), `held-out id ${id} leaked into ${rel}`);
    }
  })(root);
  for (const [seeds, nBrief, nHeld] of [[['sd-only1'], 1, 0], [[], 0, 0]]) {
    const r = world({ draft: mkProtocol('f1', { seeds }) });
    const j = shape(freeze(r), SCRIPT, 0);
    assert.deepEqual(j.result.seed_split.n_brief, nBrief);
    assert.deepEqual(j.result.seed_split.n_heldout, nHeld);
    assert.ok(kinds(r).includes('seed-split'));
    assert.deepEqual(sealedOf(r).heldout.length, 0);
  }
});

test('T14 the analysis plan: frozen file, plan-freeze line, no sealed file', () => {
  const root = makeRoot({ tasks: [taskRow({ task: 'f1-research', steps: ['pack', 'review'] })] });
  writeJson(planPath(root), mkPlan());
  approve(root, 'analysis-plan', mkPlan().approval.quote);
  const j = shape(planRun(root), SCRIPT, 0);
  assert.equal(j.mode, 'plan');
  assert.equal(j.result.name, 'analysis-plan');
  assert.equal(j.result.path, `plan/frozen/analysis-plan-${j.result.sha12}.json`);
  assert.equal(sha(fs.readFileSync(path.join(root, j.result.path))), j.result.sha256);
  assert.equal(j.result.seed_split, null);
  assert.deepEqual(kinds(root), ['owner', 'plan-freeze', 'check']);
  assert.equal(readLedger(root)[1].data.name, 'analysis-plan');
  assert.equal(fs.readdirSync(path.join(root, 'sealed', 'heldout')).length, 0);
  verifyLedger(readLedger(root));
});

test('T15 the analysis plan checks: each failure is exit 1', () => {
  const cases = [
    ['looks 2', mkPlan({ looks: 2 }), true],
    ['no label', mkPlan({ labels: ['something else'] }), true],
    ['unknown arm key', mkPlan({ budget: { T: 1, R_same: 1, R1: 1, S1: 1, X9: 1 } }), true],
    ['no S1 budget', mkPlan({ budget: { T: 1, R_same: 1, R1: 1 }, armTasks: { T: { pack: 'f1-research.pack' } } }), true],
    ['predicted 0', mkPlan({ predicted: 0 }), true],
    ['empty decision rules', mkPlan({ rules: [] }), true],
    ['no recorded approval', mkPlan(), false],
  ];
  for (const [label, plan, approved] of cases) {
    const root = makeRoot({ tasks: [taskRow({ steps: ['pack', 'review'] })] });
    writeJson(planPath(root), plan);
    if (approved) approve(root, 'analysis-plan', plan.approval.quote);
    const before = readLedger(root).length;
    const j = shape(planRun(root), SCRIPT, 1);
    assert.ok(j.reasons.length > 0, label);
    assertRefused(root, before);
  }
  const root = makeRoot({ tasks: [taskRow({ steps: ['pack', 'review'] })] });
  writeJson(planPath(root), mkPlan());
  assertReason(shape(planRun(root), SCRIPT, 1), 'approval-unrecorded');
});

test('T15b plan arm_tasks must name a planned task and one of its steps', () => {
  const good = shape(planRunWith({ T: { pack: 'f1-research.pack', review: 'f1-research.review' } }), SCRIPT, 0);
  assert.equal(good.result.name, 'analysis-plan');
  for (const armTasks of [
    { T: { pack: 'f1-research.pack' }, R9: { review: 'f1-research.review' } },
    { T: { pack: 'nosuch-task.pack' } },
    { T: { pack: 'f1-research.stpa' } },
    { T: { pack: 'f1-research:pack', review: 'f1-research:review' } },
  ]) {
    const j = shape(planRunWith(armTasks), SCRIPT, 1);
    assertReason(j, 'arm-tasks');
  }
  function planRunWith(armTasks) {
    const root = makeRoot({ tasks: [taskRow({ task: 'f1-research', steps: ['pack', 'review'] })] });
    const plan = mkPlan({ armTasks });
    writeJson(planPath(root), plan);
    approve(root, 'analysis-plan', plan.approval.quote);
    return planRun(root);
  }
});

test('T16 freezing again after editing the draft, without an amend, is exit 1 already-frozen', () => {
  const root = world();
  shape(freeze(root), SCRIPT, 0);
  const d = mkProtocol();
  d.certainty_method = 'a changed synthetic method';
  writeJson(draftPath(root), d);
  approve(root, 'protocol:f1', QUOTE);
  const files = frozenFiles(root);
  const j = shape(freeze(root), SCRIPT, 1);
  assertReason(j, 'already-frozen');
  assert.deepEqual(frozenFiles(root), files);
});

test('T17 amend: new frozen file, protocol-amend with old_sha, old file and heldout file untouched, same brief half', () => {
  const root = world();
  const first = shape(freeze(root), SCRIPT, 0);
  const oldBytes = fs.readFileSync(path.join(root, first.result.path));
  const heldBefore = fs.readFileSync(path.join(root, 'sealed', 'heldout', 'f1.json'));
  const d = mkProtocol('f1', { quote: 'I approve the amended protocol f1' });
  d.criteria.include.push({ code: 'I2', text: 'synthetic second include rule' });
  writeJson(draftPath(root), d);
  approve(root, 'protocol:f1', 'I approve the amended protocol f1');
  const j = shape(amend(root, 'criteria'), SCRIPT, 0);
  assert.equal(j.mode, 'amend');
  assert.equal(j.result.amended, true);
  assert.equal(j.result.replay, false);
  assert.notEqual(j.result.sha256, first.result.sha256);
  assert.equal(frozenFiles(root).length, 2);
  assert.ok(oldBytes.equals(fs.readFileSync(path.join(root, first.result.path))), 'the old frozen file is untouched');
  assert.ok(heldBefore.equals(fs.readFileSync(path.join(root, 'sealed', 'heldout', 'f1.json'))), 'the heldout file is untouched');
  const line = readLedger(root).find((l) => l.kind === 'protocol-amend');
  assert.deepEqual(line.data, { name: 'protocol-f1', sha256: j.result.sha256, path: j.result.path, old_sha: first.result.sha256, reason_code: 'criteria' });
  assert.deepEqual(frozenOf(root, j).seeds, JSON.parse(oldBytes.toString('utf8')).seeds, 'the brief half is the earlier one');
  assert.equal(frozenOf(root, j).criteria.include.length, 2);
  verifyLedger(readLedger(root));
});

test('T18 amend refused: not frozen, old approval, field or seeds changed, bad reason code; an unchanged draft is a no-op', () => {
  // before any freeze
  let root = world();
  let before = readLedger(root).length;
  let j = shape(amend(root), SCRIPT, 1);
  assertReason(j, 'not-frozen');
  assertRefused(root, before);
  // with the old approval
  root = world();
  shape(freeze(root), SCRIPT, 0);
  const d = mkProtocol();
  d.routes = ['keyword'];
  writeJson(draftPath(root), d);
  before = readLedger(root).length;
  assertReason(shape(amend(root, 'routes'), SCRIPT, 1), 'approval-unrecorded');
  // the seed list changed
  const d2 = mkProtocol('f1', { seeds: SEEDS7.slice(1) });
  writeJson(draftPath(root), d2);
  approve(root, 'protocol:f1', QUOTE);
  assertReason(shape(amend(root, 'other'), SCRIPT, 1), 'seeds-changed');
  // the field changed
  writeJson(draftPath(root), { ...mkProtocol(), field: 'f2' });
  j = shape(amend(root, 'other'), SCRIPT, 1);
  assertReason(j, 'field-changed');
  // a bogus reason code is a usage error
  writeJson(draftPath(root), mkProtocol());
  shape(amend(root, 'bogus'), SCRIPT, 66);
  // an unchanged draft is a replay: exit 0, nothing written
  const snap = snapshot(root);
  j = shape(amend(root, 'other'), SCRIPT, 0);
  assert.equal(j.result.replay, true);
  assert.equal(j.result.amended, false);
  assert.deepEqual(snapshot(root), snap);
});

test('T19 amending the analysis plan writes protocol-amend with the name analysis-plan', () => {
  const root = makeRoot({ tasks: [taskRow({ steps: ['pack', 'review'] })] });
  writeJson(planPath(root), mkPlan());
  approve(root, 'analysis-plan', mkPlan().approval.quote);
  const first = shape(planRun(root), SCRIPT, 0);
  const next = mkPlan({ predicted: 4000000, quote: 'I approve the amended analysis plan' });
  writeJson(planPath(root), next);
  approve(root, 'analysis-plan', next.approval.quote);
  const j = shape(run(SCRIPT, ['amend', '--root', root, '--ce', '1', '--file', 'plan/analysis-plan.json', '--reason-code', 'other', '--now', NOW], root), SCRIPT, 0);
  const line = readLedger(root).find((l) => l.kind === 'protocol-amend');
  assert.equal(line.data.name, 'analysis-plan');
  assert.equal(line.data.old_sha, first.result.sha256);
  assert.equal(line.data.sha256, j.result.sha256);
  assert.match(j.result.path, /^plan\/frozen\/analysis-plan-[0-9a-f]{12}\.json$/);
});

test('T20 interrupted run: the rerun appends exactly the missing lines; a frozen file with other bytes is exit 3 frozen-tampered', () => {
  const root = world();
  const first = shape(freeze(root), SCRIPT, 0);
  rewriteLedger(root, 1); // only the owner line survives: the files exist, the ledger lacks its lines
  const filesBefore = snapshot(root);
  const j = shape(freeze(root), SCRIPT, 0);
  assert.equal(j.result.sha256, first.result.sha256);
  assert.deepEqual(kinds(root), ['owner', 'protocol-freeze', 'seed-split', 'check']);
  const after = snapshot(root);
  for (const k of Object.keys(filesBefore)) if (!k.startsWith('run/')) assert.equal(after[k], filesBefore[k], k + ' is unchanged');
  verifyLedger(readLedger(root));
  // a frozen file name present with other bytes
  const root2 = world();
  const f2 = shape(freeze(root2), SCRIPT, 0);
  rewriteLedger(root2, 1);
  fs.appendFileSync(path.join(root2, f2.result.path), ' ');
  const t = shape(freeze(root2), SCRIPT, 3);
  assertReason(t, 'frozen-tampered');
  const inc = readLedger(root2).find((l) => l.kind === 'incident');
  assert.equal(inc.data.class, 'refusal');
  assert.equal(inc.data.detail.tamper, true);
  assert.ok(!kinds(root2).includes('protocol-freeze'));
});

test('T21 --dry-run: same exit and reasons as the real run, dry_run true, no file, no ledger line, no lock file', () => {
  const root = world();
  const snap = snapshot(root);
  const d = shape(freeze(root, ['--dry-run']), SCRIPT, 0);
  assert.equal(d.dry_run, true);
  assert.deepEqual(snapshot(root), snap);
  assert.ok(!fs.existsSync(path.join(root, 'run', 'run.lock')));
  const real = shape(freeze(root), SCRIPT, 0);
  assert.equal(real.dry_run, false);
  assert.equal(real.result.sha256, d.result.sha256);
  // a refused input
  const root2 = world({ approved: false });
  const snap2 = snapshot(root2);
  const d2 = shape(freeze(root2, ['--dry-run']), SCRIPT, 1);
  assert.equal(d2.dry_run, true);
  assert.deepEqual(snapshot(root2), snap2);
  const r2 = shape(freeze(root2), SCRIPT, 1);
  assert.deepEqual(reasonCodes(d2), reasonCodes(r2));
});

test('T22 a ledger with a broken hash is exit 3 ledger-broken and nothing is written', () => {
  const root = world();
  const lines = readLedger(root);
  lines[0].hash = 'f'.repeat(64);
  fs.writeFileSync(ledgerPath(root), lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
  const snap = snapshot(root);
  const j = shape(freeze(root), SCRIPT, 3);
  assertReason(j, 'ledger-broken');
  assert.deepEqual(snapshot(root), snap);
});

test('T23 the script copied under <root>/wt/ is exit 3 run-from-attempt', () => {
  const root = world();
  const dir = path.join(root, 'wt', 'x');
  fs.mkdirSync(dir, { recursive: true });
  const src = findScript(SCRIPT);
  fs.copyFileSync(src, path.join(dir, SCRIPT + '.mjs'));
  const libSrc = path.join(path.dirname(src), 'lib.mjs');
  if (fs.existsSync(libSrc)) fs.copyFileSync(libSrc, path.join(dir, 'lib.mjs'));
  const snap = snapshot(root);
  const r = run(SCRIPT, ['freeze', '--root', root, '--ce', '1', '--file', FILE(), '--now', NOW], root, path.join(dir, SCRIPT + '.mjs'));
  const j = shape(r, SCRIPT, 3);
  assertReason(j, 'run-from-attempt');
  const after = snapshot(root);
  delete snap['wt/x/protocol-freeze.mjs'];
  for (const k of Object.keys(after)) if (!k.startsWith('wt/')) assert.equal(after[k], snap[k], k + ' is unchanged');
});

test('T24 every outcome prints one JSON line; a refusal after the ce check appends one incident, a 64 or a 66 none', () => {
  const root = world({ approved: false });
  const before = readLedger(root).length;
  const refused = shape(freeze(root), SCRIPT, 1);
  assert.equal(refused.script, SCRIPT);
  assert.equal(readLedger(root).slice(before).filter((l) => l.kind === 'incident').length, 1);
  const n = readLedger(root).length;
  shape(run(SCRIPT, ['freeze', '--root', root, '--ce', '9', '--file', FILE(), '--now', NOW], root), SCRIPT, 64);
  shape(freeze(root, [], 'wt/x/p.json'), SCRIPT, 66);
  shape(run(SCRIPT, ['freeze', '--root', root, '--ce', '1', '--file', FILE(), '--bogus-flag'], root), SCRIPT, 66);
  assert.equal(readLedger(root).length, n, 'a 64 and a 66 append no line');
  verifyLedger(readLedger(root));
});

test('T25 questions_sha is the sha256 of the canonical sorted question_ids, whatever their order in the draft', () => {
  const a = world({ draft: mkProtocol('f1', { qids: ['f1-g1-01', 'f1-g1-02', 'f1-g2-03'] }) });
  const b = world({ draft: mkProtocol('f1', { qids: ['f1-g2-03', 'f1-g1-02', 'f1-g1-01'] }) });
  const ja = shape(freeze(a), SCRIPT, 0);
  const jb = shape(freeze(b), SCRIPT, 0);
  const want = sha(canon(['f1-g1-01', 'f1-g1-02', 'f1-g2-03']));
  assert.equal(ja.result.questions_sha, want);
  assert.equal(jb.result.questions_sha, want);
});

// ---------------------------------------------------------------------------------------------
// Needs the app
// ---------------------------------------------------------------------------------------------
test('NA1 the owner line quotes the owner\'s chat words (status.mjs writes it from the coordinator\'s message)', { skip: 'needs the app' }, () => {});
test('NA2 a child session cannot read plan/protocols/ or sealed/ (the harness enforces the role profile, CONTRACT 7 items 1-3)', { skip: 'needs the app' }, () => {});
