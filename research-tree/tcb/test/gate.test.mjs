// gate.mjs tests, written from spec/gate.mjs.md and CONTRACT.md (the script's code was not read while writing).
// One test per behaviour, named with its id. Each test builds its own run root under tcb-build/tmp and removes it afterwards.
// Run with: node --test tcb/test/gate.test.mjs (the library must be built first).
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
// gate specific helpers
// ---------------------------------------------------------------------------------------------
const SCRIPT = 'gate';
const PREFIX = { stpa: 'd', fmea: 'd', hazards: 'd' };
const COLS = {
  component: ['crash', 'amnesia', 'omission', 'timing', 'wrong_value', 'common_cause', 'fabrication', 'injected_text', 'agrees_with_brief'],
  data: ['dirty_write', 'dirty_read', 'non_repeatable_read', 'phantom', 'lost_update', 'read_skew', 'write_skew', 'torn_write', 'stale_derived', 'mutable_identity'],
  flow: ['spoofing', 'tampering', 'repudiation', 'information_disclosure', 'denial_of_service', 'elevation_of_privilege'],
};
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v, null, 2)); };

// ---- a synthetic design document with sections 0 to 15 ----
function designText(o = {}) {
  const sec = (n, title, body) => `## ${n}. ${title}\n\n${body}\n`;
  return [
    'PREAMBLE-MARKER-ZZ text before the first section\n',
    sec(0, 'Zero', 'ZERO-MARKER text'),
    sec(1, 'Layout', 'Layout names an id P3 and a list (P1, R2, K4-02) and a tail (P9).\n\n**Where the classical assumptions fail.** CLASSICAL-MARKER-ONE this paragraph goes.\nIt has a second line.\n\nTHE-PARAGRAPH-AFTER-ONE stays, with a, P5, b in it.'),
    sec(2, 'Roles', 'Role table text TWO-MARKER.'),
    sec(3, 'Three', o.three ?? 'THREE-MARKER text.'),
    sec(4, 'Four', 'FOUR-MARKER text.\n\n**Where the classical assumptions fail.** CLASSICAL-MARKER-TWO goes too.\n\nTHE-PARAGRAPH-AFTER-TWO stays.'),
    ...(o.noFive ? [] : [sec(5, 'Five', 'Rule R10: the rule text of R10 survives the cut, and so does the word N and the letter G.')]),
    sec(6, 'Six', 'SIX-MARKER text.'),
    sec(7, 'Seven', 'SEVEN-MARKER text.'),
    sec(8, 'Eight', o.eight ?? 'EIGHT-MARKER dropped.'),
    sec(9, 'Nine', 'NINE-MARKER dropped.'),
    '## 10. Scripts\n\nINTRO-TEN-MARKER dropped intro line.\n\n**Scripts**\n\n- script-one (D2-01)\n- script-two, G10, and more\n\n**Files:**\n\nFILES-MARKER dropped.\n',
    sec(11, 'Eleven', 'ELEVEN-MARKER dropped.'),
    sec(12, 'Twelve', 'TWELVE-MARKER dropped.'),
    sec(13, 'Thirteen', 'THIRTEEN-MARKER dropped.'),
    sec(14, 'Fourteen', 'FOURTEEN-MARKER dropped.'),
    sec(15, 'Fifteen', 'FIFTEEN-MARKER dropped.'),
  ].join('\n');
}
const DROPPED = ['PREAMBLE-MARKER-ZZ', 'ZERO-MARKER', 'EIGHT-MARKER', 'NINE-MARKER', 'ELEVEN-MARKER', 'TWELVE-MARKER', 'THIRTEEN-MARKER', 'FOURTEEN-MARKER', 'FIFTEEN-MARKER', 'INTRO-TEN-MARKER', 'FILES-MARKER'];
const KEPT = ['TWO-MARKER', 'THREE-MARKER', 'FOUR-MARKER', 'SIX-MARKER', 'SEVEN-MARKER', 'script-one', 'THE-PARAGRAPH-AFTER-ONE', 'THE-PARAGRAPH-AFTER-TWO'];
const designPath = (root) => path.join(root, 'design.md');
const cutRun = (root, extra = [], design = designPath(root)) => run(SCRIPT, ['cut', '--root', root, '--ce', '1', '--design', design, '--now', NOW, ...extra], root);
const check = (root, extra = []) => run(SCRIPT, ['check', '--root', root, '--ce', '1', '--now', NOW, ...extra], root);
const cutFiles = (root) => fs.readdirSync(path.join(root, 'completeness')).filter((f) => f.startsWith('cut-')).sort();
const gateOf = (root) => readJson(path.join(root, 'completeness', 'gate.json'));
const lastCutSha = (root) => readLedger(root).filter((l) => l.kind === 'cut').pop()?.data.sha;

// ---- store objects and commit records ----
function putObj(root, value) {
  const bytes = canon(value);
  const hex = sha(bytes);
  const id = PREFIX[value.kind] + '_' + hex.slice(0, 16);
  fs.writeFileSync(path.join(root, 'store', 'objects', id + '.json'), bytes);
  return { id, sha: hex, value };
}
function addCommit(root, { task, step, epoch = 1, outputs }) {
  const outs = outputs.map((o) => ({ id: o.id, kind: o.kind, sha256: o.sha })).sort((a, b) => (a.id < b.id ? -1 : 1));
  const rec = { schema_version: 1, task, step, epoch, step_key: 'f'.repeat(64), outputs: outs, outputs_sha: sha(canon(outs)) };
  fs.writeFileSync(path.join(root, 'store', 'commits', `${task}.${step}.json`), canon(rec));
  return rec;
}

// ---- good design-check outputs for a cut ----
function goodStpa(cut) {
  const ucas = [];
  for (const a of ['act1', 'act2']) {
    for (const t of ['N', 'U', 'T', 'D']) {
      ucas.push({ uca_id: `${a}-${t.toLowerCase()}`, action_id: a, type: t, hazardous: t === 'N', context: 'synthetic context', case: 'synthetic case' });
    }
  }
  return {
    schema_version: 1, kind: 'stpa', cut_sha: cut,
    controllers: [
      { id: 'ctl1', name: 'coordinator session', actions: [{ id: 'act1', target: 'ctl2' }, { id: 'act2', target: 'ctl2' }], feedback: [{ id: 'fb1', from: 'ctl2' }] },
      { id: 'ctl2', name: 'child session', actions: [], feedback: [] },
    ],
    ucas,
  };
}
function goodFmea(cut) {
  const rows = [{ row_id: 'comp1', kind: 'component', name: 'watcher script' }, { row_id: 'data1', kind: 'data', name: 'ledger file' }, { row_id: 'flow1', kind: 'flow', name: 'hook flow' }];
  const cells = [];
  for (const r of rows) {
    for (const col of COLS[r.kind]) {
      const finding = (r.row_id === 'comp1' && col === 'crash') || (r.row_id === 'data1' && col === 'lost_update');
      cells.push({ row_id: r.row_id, col, finding: finding ? 'synthetic finding text' : null, na_reason: finding ? null : 'not applicable here' });
    }
  }
  return { schema_version: 1, kind: 'fmea', cut_sha: cut, rows, cells };
}
function goodHazards(cut, parent = null) {
  const ps = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => `P${a + i}`);
  return {
    schema_version: 1, kind: 'hazards', cut_sha: cut, parent,
    hazards: [
      { hazard_id: 'h1', supersedes: null, classical_name: 'lost update', statement: 'a synthetic high hazard statement', severity: 'high', p_ids: ps(1, 10), covered_by: ['R1'], status: 'covered' },
      { hazard_id: 'h2', supersedes: null, classical_name: 'stale read', statement: 'a synthetic medium hazard statement', severity: 'medium', p_ids: [...ps(11, 21), ...Array.from({ length: 12 }, (_, i) => `G${i + 1}`)], covered_by: ['R2'], status: 'partial' },
    ],
    map: [
      { source: { kind: 'uca', id: 'act1-n' }, hazard_id: 'h1', borderline: false, alt_hazard_id: null },
      { source: { kind: 'uca', id: 'act2-n' }, hazard_id: 'h1', borderline: true, alt_hazard_id: 'h2' },
      { source: { kind: 'cell', id: 'comp1/crash' }, hazard_id: 'h2', borderline: false, alt_hazard_id: null },
      { source: { kind: 'cell', id: 'data1/lost_update' }, hazard_id: 'h1', borderline: false, alt_hazard_id: null },
    ],
  };
}
const designRow = (task, role, step, o = {}) => taskRow({ task, field: null, stage: 'design-check', role, steps: [step], state: 'committed', step: 'bound', epoch: 1, ...o });

// A run root with a cut and a committed, audited, passing set of design-check outputs. Every part can be changed.
function gateWorld(o = {}) {
  const root = makeRoot({ params: o.params });
  fs.writeFileSync(designPath(root), designText());
  const cutResult = shape(cutRun(root), SCRIPT, 0);
  const cut = cutResult.result.cut_sha;
  const w = { root, cut, rows: [], objs: {} };
  const add = (role, step, task, value, { audit = 'clean', rev = 0, epoch = 1 } = {}) => {
    const obj = putObj(root, value);
    addCommit(root, { task, step, epoch, outputs: [{ ...obj, kind: step }] });
    addLedger(root, 'commit', { step, outputs_sha: ZERO, n: 1, git: null }, { task, epoch });
    if (audit && role !== 'mapper') addLedger(root, 'audit', { label: audit, undeclared: [], protected_writes: [], first_context: 0, notes_bad: false }, { task, epoch });
    w.rows.push(designRow(task, role, step, { updated_rev: rev, epoch }));
    w.objs[task] = obj;
    return obj;
  };
  w.add = add;
  const mut = (f, v) => (f ? f(v) ?? v : v);
  if (!o.noStpa) add('stpa', 'stpa', 'stpa-a', mut(o.stpa, goodStpa(o.stpaCut ?? cut)), { audit: o.auditStpa === undefined ? 'clean' : o.auditStpa });
  if (!o.noFmea) add('fmea', 'fmea', 'fmea-a', mut(o.fmea, goodFmea(o.fmeaCut ?? cut)), { audit: o.auditFmea === undefined ? 'clean' : o.auditFmea });
  if (!o.noMapper) add('mapper', 'hazards', 'mapper-a', mut(o.haz, goodHazards(o.hazCut ?? cut)));
  writeTasks(root, w.rows);
  if (o.model !== null) writeJson(path.join(root, 'completeness', 'model', 'result.json'), o.model ?? { result: 'pass', sha: 'a'.repeat(64) });
  return w;
}
const setParam = (root, name, param) => {
  const f = path.join(root, 'tcb', 'thresholds.json');
  const t = readJson(f);
  t.params[name] = { unit: 'tests only', source: 'owner', ...param };
  writeJson(f, t);
};
const setMeasures = (root, values) => writeJson(path.join(root, 'views', 'measures.json'), { schema_version: 1, values });
const libOf = async () => import(pathToFileUrlOf(path.join(path.dirname(findScript(SCRIPT)), 'lib.mjs')));
const pathToFileUrlOf = (p) => new URL('file:///' + p.replace(/\\/g, '/')).href;

// ---------------------------------------------------------------------------------------------
// Behaviours (spec/gate.mjs.md "Behaviours")
// ---------------------------------------------------------------------------------------------

test('T1 cut on a design with sections 0 to 15 keeps sections 1 to 7 and the Scripts block, writes cut-<sha12>.md and a cut line', () => {
  const root = makeRoot();
  fs.writeFileSync(designPath(root), designText());
  const j = shape(cutRun(root), SCRIPT, 0);
  assert.equal(j.mode, 'cut');
  assert.match(j.result.cut_sha, /^[0-9a-f]{64}$/);
  assert.equal(j.result.path, `completeness/cut-${j.result.cut_sha.slice(0, 12)}.md`);
  const bytes = fs.readFileSync(path.join(root, j.result.path));
  assert.equal(sha(bytes), j.result.cut_sha, 'the file holds the bytes that were hashed');
  assert.equal(j.result.bytes, bytes.length);
  const text = bytes.toString('utf8');
  assert.ok(text.startsWith('# Design cut (layout, role table, script lists, rule texts)\n\n'));
  assert.ok(text.endsWith('\n') && !text.endsWith('\n\n'), 'one trailing newline');
  assert.ok(!text.includes('\r'), 'LF newlines');
  for (const n of [1, 2, 3, 4, 5, 6, 7, 10]) assert.ok(new RegExp(`^## ${n}\\. `, 'm').test(text), `section ${n} heading is kept`);
  for (const n of [0, 8, 9, 11, 12, 13, 14, 15]) assert.ok(!new RegExp(`^## ${n}\\. `, 'm').test(text), `section ${n} heading is dropped`);
  for (const m of DROPPED) assert.ok(!text.includes(m), m + ' is dropped');
  for (const m of KEPT) assert.ok(text.includes(m), m + ' is kept');
  assert.deepEqual(readLedger(root).filter((l) => l.kind === 'cut').map((l) => l.data), [{ sha: j.result.cut_sha }]);
  verifyLedger(readLedger(root));
});

test('T2 the cut has no problem or decision id, no ( ), [ ] or ", ,"; the R10 rule text survives; the classical-assumption paragraphs go and the next paragraph stays; section 10 stops before Files', () => {
  const root = makeRoot();
  fs.writeFileSync(designPath(root), designText());
  const j = shape(cutRun(root), SCRIPT, 0);
  const text = fs.readFileSync(path.join(root, j.result.path), 'utf8');
  assert.ok(!/\b[PNGDK][0-9]{1,2}(-[0-9]{1,2})?\b/.test(text), 'an id is left');
  assert.ok(!/\(\s*\)/.test(text) && !/\[\s*\]/.test(text) && !/,\s*,/.test(text), 'an empty mark is left');
  assert.ok(!/,\s*[.)\]]/.test(text), 'a comma before a closing mark is left');
  assert.ok(text.includes('Rule R10: the rule text of R10 survives the cut'));
  assert.ok(text.includes('the word N and the letter G'), 'single letters are not ids');
  assert.ok(!text.includes('CLASSICAL-MARKER-ONE') && !text.includes('CLASSICAL-MARKER-TWO') && !text.includes('second line'));
  assert.ok(text.includes('THE-PARAGRAPH-AFTER-ONE stays, with a, b in it.'));
  assert.ok(text.includes('THE-PARAGRAPH-AFTER-TWO stays.'));
  assert.ok(text.includes('script-one') && text.includes('script-two'));
  assert.ok(!text.includes('FILES-MARKER') && !text.includes('**Files:**'));
  assert.ok(text.includes('**Scripts**'));
  assert.ok(j.result.ids_removed >= 7, 'the removed ids are counted: ' + j.result.ids_removed);
  assert.deepEqual(j.result.sections_kept, [1, 2, 3, 4, 5, 6, 7, 10]);
});

test('T3 cut twice: no second line; an edit in a dropped section keeps the sha; an edit in a kept section gives a new sha and file; a tampered cut file is exit 3', () => {
  const root = makeRoot();
  fs.writeFileSync(designPath(root), designText());
  const a = shape(cutRun(root), SCRIPT, 0);
  const snap = snapshot(root);
  const again = shape(cutRun(root), SCRIPT, 0);
  assert.equal(again.result.cut_sha, a.result.cut_sha);
  assert.deepEqual(snapshot(root), snap);
  assert.deepEqual(again.ledger_seq, []);
  fs.writeFileSync(designPath(root), designText({ eight: 'EIGHT-MARKER edited, still dropped.' }));
  const b = shape(cutRun(root), SCRIPT, 0);
  assert.equal(b.result.cut_sha, a.result.cut_sha);
  assert.equal(readLedger(root).filter((l) => l.kind === 'cut').length, 1);
  fs.writeFileSync(designPath(root), designText({ three: 'THREE-MARKER edited in a kept section.' }));
  const c = shape(cutRun(root), SCRIPT, 0);
  assert.notEqual(c.result.cut_sha, a.result.cut_sha);
  assert.equal(cutFiles(root).length, 2);
  assert.equal(readLedger(root).filter((l) => l.kind === 'cut').length, 2);
  // an existing file of that name with other bytes
  const root2 = makeRoot();
  fs.writeFileSync(designPath(root2), designText());
  const dry = shape(cutRun(root2, ['--dry-run']), SCRIPT, 0);
  fs.writeFileSync(path.join(root2, dry.result.path), 'other bytes');
  const j = shape(cutRun(root2), SCRIPT, 3);
  assertReason(j, 'cut-tampered');
  assert.equal(fs.readFileSync(path.join(root2, dry.result.path), 'utf8'), 'other bytes');
  assert.ok(!readLedger(root2).some((l) => l.kind === 'cut'));
});

test('T4 cut: a missing design is exit 2; a design without section 5 is exit 2 section-missing; --design under wt/ is exit 66; a stale ce is exit 64 with nothing written', () => {
  const root = makeRoot();
  const snap = snapshot(root);
  assertReason(shape(cutRun(root), SCRIPT, 2), 'missing');
  fs.writeFileSync(designPath(root), designText({ noFive: true }));
  assertReason(shape(cutRun(root), SCRIPT, 2), 'section-missing');
  fs.writeFileSync(designPath(root), designText().replace('**Scripts**', '**Other**'));
  assertReason(shape(cutRun(root), SCRIPT, 2), 'section-missing');
  assert.equal(cutFiles(root).length, 0);
  fs.mkdirSync(path.join(root, 'wt', 'x'), { recursive: true });
  fs.writeFileSync(path.join(root, 'wt', 'x', 'design.md'), designText());
  assertReason(shape(cutRun(root, [], path.join(root, 'wt', 'x', 'design.md')), SCRIPT, 66), 'file-path');
  fs.writeFileSync(designPath(root), designText());
  const before = snapshot(root);
  shape(run(SCRIPT, ['cut', '--root', root, '--ce', '2', '--design', designPath(root), '--now', NOW], root), SCRIPT, 64);
  assert.deepEqual(snapshot(root), before);
  assert.ok(snap);
});

test('T5 complete fixtures: check exits 0, gate.json is pass with the cut and hazards hashes, a check line and a gate line', () => {
  const w = gateWorld();
  const j = shape(check(w.root), SCRIPT, 0);
  assert.equal(j.mode, 'check');
  const g = gateOf(w.root);
  assert.equal(g.result, 'pass');
  assert.equal(g.schema_version, 1);
  assert.equal(g.cut_sha, w.cut);
  assert.equal(g.hazards_sha, sha(canon(goodHazards(w.cut))));
  assert.equal(g.model, 'pass');
  assert.equal(g.model_result_sha, 'a'.repeat(64));
  assert.deepEqual(g.matrix, { full: true, empty_cells: 0 });
  assert.deepEqual(g.p_ids_missing, []);
  assert.deepEqual(g.high_uncovered, []);
  assert.deepEqual(g.reasons, []);
  assert.ok(g.action_lines.every((a) => a.result === 'reading'));
  assert.deepEqual(j.result.result, 'pass');
  const lines = readLedger(w.root);
  const check1 = lines.find((l) => l.kind === 'check' && l.data.check === 'gate');
  assert.equal(check1.data.subject, w.cut.slice(0, 12));
  assert.equal(check1.data.result, 'pass');
  assert.deepEqual(lines.find((l) => l.kind === 'gate').data, { result: 'pass', cut_sha: w.cut, hazards_sha: g.hazards_sha });
  assert.ok(!lines.some((l) => l.kind === 'incident'), 'a pass leaves no incident');
  verifyLedger(lines);
});

test('T6 the matrix: a missing STPA entry type, a missing FMEA cell, a cell with both fields, an unknown column and a kind with no row each fail', () => {
  const cases = [
    ['stpa-type-missing', { stpa: (s) => { s.ucas = s.ucas.filter((u) => u.uca_id !== 'act1-t'); } }, 1],
    ['fmea-cell-empty', { fmea: (f) => { f.cells = f.cells.filter((c) => !(c.row_id === 'comp1' && c.col === 'timing')); } }, 1],
    ['fmea-cell-empty', { fmea: (f) => { f.cells.find((c) => c.col === 'amnesia').na_reason = null; } }, 1],
    ['fmea-cell-both', { fmea: (f) => { Object.assign(f.cells.find((c) => c.col === 'amnesia'), { finding: 'both given', na_reason: 'both given too' }); } }, 0],
    ['fmea-column-unknown', { fmea: (f) => { f.cells.push({ row_id: 'comp1', col: 'nonsense', finding: null, na_reason: 'no such column' }); } }, 0],
    ['fmea-kind-missing', { fmea: (f) => { f.rows = f.rows.filter((r) => r.kind !== 'flow'); f.cells = f.cells.filter((c) => c.row_id !== 'flow1'); } }, 0],
  ];
  for (const [code, o, empty] of cases) {
    const w = gateWorld(o);
    const j = shape(check(w.root), SCRIPT, 1);
    assertReason(j, code);
    const g = gateOf(w.root);
    assert.equal(g.result, 'fail');
    assert.equal(g.matrix.full, false, code);
    assert.equal(g.matrix.empty_cells, empty, code + ' empty_cells');
  }
});

test('T7 a hazardous uca or a finding cell missing from the map is unmapped-findings; a map entry naming h99 is map-hazard-missing', () => {
  let w = gateWorld({ haz: (h) => { h.map = h.map.filter((m) => m.source.id !== 'act1-n'); } });
  assertReason(shape(check(w.root), SCRIPT, 1), 'unmapped-findings');
  w = gateWorld({ haz: (h) => { h.map = h.map.filter((m) => m.source.id !== 'comp1/crash'); } });
  assertReason(shape(check(w.root), SCRIPT, 1), 'unmapped-findings');
  w = gateWorld({ haz: (h) => { h.map[0].hazard_id = 'h99'; } });
  assertReason(shape(check(w.root), SCRIPT, 1), 'map-hazard-missing');
  w = gateWorld({ haz: (h) => { h.map[1].alt_hazard_id = 'h99'; } });
  assertReason(shape(check(w.root), SCRIPT, 1), 'map-hazard-missing');
});

test('T8 a problem id in no hazard is p-id-missing and is listed', () => {
  const w = gateWorld({ haz: (h) => { h.hazards[0].p_ids = h.hazards[0].p_ids.filter((p) => p !== 'P7'); } });
  const j = shape(check(w.root), SCRIPT, 1);
  assertReason(j, 'p-id-missing');
  assert.deepEqual(gateOf(w.root).p_ids_missing, ['P7']);
  // U5-GT-1: the gaps G1-G12 are problem rows too; a mapper that leaves one out does not pass
  const g = gateWorld({ haz: (h) => { h.hazards[1].p_ids = h.hazards[1].p_ids.filter((p) => p !== 'G5' && p !== 'G12'); } });
  assertReason(shape(check(g.root), SCRIPT, 1), 'p-id-missing');
  assert.deepEqual(gateOf(g.root).p_ids_missing, ['G5', 'G12']);
});

test('T9 a high hazard that is a gap, partial or covered without covered_by fails; an owner accept line for it passes; others do not; a medium gap does not fail', () => {
  const variants = [
    (h) => { h.hazards[0].status = 'gap'; },
    (h) => { h.hazards[0].status = 'partial'; },
    (h) => { h.hazards[0].covered_by = []; },
  ];
  for (const v of variants) {
    const w = gateWorld({ haz: (h) => { v(h); } });
    assertReason(shape(check(w.root), SCRIPT, 1), 'high-uncovered');
    assert.deepEqual(gateOf(w.root).high_uncovered, ['h1']);
    // the owner's accept line for it: pass
    addLedger(w.root, 'owner', { act: 'accept', subject: 'hazard:h1', quote: 'I accept the residual risk of hazard h1' });
    shape(check(w.root), SCRIPT, 0);
    assert.deepEqual(gateOf(w.root).high_uncovered, []);
  }
  const w = gateWorld({ haz: (h) => { h.hazards[0].status = 'gap'; } });
  addLedger(w.root, 'owner', { act: 'accept', subject: 'hazard:h2', quote: 'accept another hazard' });
  addLedger(w.root, 'owner', { act: 'ruling', subject: 'hazard:h1', quote: 'a ruling is not an acceptance' });
  shape(check(w.root), SCRIPT, 1);
  assert.deepEqual(gateOf(w.root).high_uncovered, ['h1']);
  const m = gateWorld({ haz: (h) => { h.hazards[1].status = 'gap'; } });
  shape(check(m.root), SCRIPT, 0);
});

test('T10 a child hazards object that drops a parent id is hazards-not-append-only; keeping it with a superseding replacement passes', () => {
  // the child drops h2
  const w = gateWorld({ noMapper: true });
  const parent = putObj(w.root, goodHazards(w.cut)); // stored, not committed
  const child = goodHazards(w.cut, parent.id);
  child.hazards = child.hazards.filter((h) => h.hazard_id !== 'h2');
  w.add('mapper', 'hazards', 'mapper-a', child);
  writeTasks(w.root, w.rows);
  assertReason(shape(check(w.root), SCRIPT, 1), 'hazards-not-append-only');
  // the child keeps every parent id and adds a superseding hazard
  const ok = gateWorld({ noMapper: true });
  const p2 = putObj(ok.root, goodHazards(ok.cut));
  const c2 = goodHazards(ok.cut, p2.id);
  c2.hazards.push({ hazard_id: 'h3', supersedes: 'h2', classical_name: 'stale read again', statement: 'a synthetic replacement statement', severity: 'medium', p_ids: ['P11'], covered_by: ['R2'], status: 'covered' });
  ok.add('mapper', 'hazards', 'mapper-a', c2);
  writeTasks(ok.root, ok.rows);
  shape(check(ok.root), SCRIPT, 0);
  // U5-GT-2: an id keeps its meaning. A child that rewrites the statement, the name or the severity under the old id
  // is not an append; changing only status, covered_by or p_ids is.
  const rewrites = [
    ['statement', (h) => { h.statement = 'a synthetic statement rewritten under the old id'; }],
    ['classical_name', (h) => { h.classical_name = 'a renamed failure class'; }],
    ['severity', (h) => { h.severity = 'low'; }],
  ];
  for (const [what, edit] of rewrites) {
    const rw = gateWorld({ noMapper: true });
    const par = putObj(rw.root, goodHazards(rw.cut));
    const ch = goodHazards(rw.cut, par.id);
    edit(ch.hazards.find((h) => h.hazard_id === 'h1'));
    rw.add('mapper', 'hazards', 'mapper-a', ch);
    writeTasks(rw.root, rw.rows);
    const jr = shape(check(rw.root), SCRIPT, 1);
    assertReason(jr, 'hazards-not-append-only');
    assert.ok(JSON.stringify(jr).includes('h1'), what + ': the rewritten id is named');
  }
  const same = gateWorld({ noMapper: true });
  const sp = putObj(same.root, goodHazards(same.cut));
  const sc = goodHazards(same.cut, sp.id);
  sc.hazards[1].status = 'covered';
  sc.hazards[1].covered_by = ['R2', 'R3'];
  same.add('mapper', 'hazards', 'mapper-a', sc);
  writeTasks(same.root, same.rows);
  shape(check(same.root), SCRIPT, 0);
});

test('T11 a role with no committed task is exit 2 <role>-missing; committed for another cut is <role>-stale; gate.json is still written with null shas where absent', () => {
  for (const [role, opt, staleOpt] of [['stpa', { noStpa: true }, { stpaCut: 'b'.repeat(64) }], ['fmea', { noFmea: true }, { fmeaCut: 'b'.repeat(64) }], ['mapper', { noMapper: true }, { hazCut: 'b'.repeat(64) }]]) {
    let w = gateWorld(opt);
    const j = shape(check(w.root), SCRIPT, 2);
    assertReason(j, `${role}-missing`);
    const g = gateOf(w.root);
    assert.equal(g.result, 'not_run');
    if (role === 'mapper') assert.equal(g.hazards_sha, null);
    w = gateWorld(staleOpt);
    assertReason(shape(check(w.root), SCRIPT, 2), `${role}-stale`);
  }
  const root = makeRoot();
  fs.writeFileSync(designPath(root), designText());
  const j = shape(check(root), SCRIPT, 2);
  assertReason(j, 'cut-missing');
  assertReason(j, 'stpa-missing');
  assertReason(j, 'fmea-missing');
  assertReason(j, 'mapper-missing');
  const g = gateOf(root);
  assert.equal(g.result, 'not_run');
  assert.equal(g.cut_sha, null);
  assert.equal(g.hazards_sha, null);
  const incidents = readLedger(root).filter((l) => l.kind === 'incident');
  assert.equal(incidents.length, 1);
  assert.equal(incidents[0].data.class, 'not-run');
});

test('T12 a tainted audit line for the stpa task is exit 1 analysis-tainted; no audit line is exit 2 audit-missing; the mapper needs none', () => {
  let w = gateWorld({ auditStpa: 'tainted' });
  assertReason(shape(check(w.root), SCRIPT, 1), 'analysis-tainted');
  w = gateWorld({ auditFmea: null });
  assertReason(shape(check(w.root), SCRIPT, 2), 'audit-missing');
  w = gateWorld();
  shape(check(w.root), SCRIPT, 0);
  assert.ok(!readLedger(w.root).some((l) => l.kind === 'audit' && l.task === 'mapper-a'), 'no audit line exists for the mapper');
  // U5-GT-3: the audit must be of the committed epoch; an audit of another epoch of the same task is no audit
  const auditLine = (root, label, epoch) => addLedger(root, 'audit', { label, undeclared: [], protected_writes: [], first_context: 0, notes_bad: false }, { task: 'stpa-a', epoch });
  w = gateWorld({ noStpa: true });
  w.add('stpa', 'stpa', 'stpa-a', goodStpa(w.cut), { audit: null, epoch: 2 });
  writeTasks(w.root, w.rows);
  auditLine(w.root, 'clean', 1);
  assertReason(shape(check(w.root), SCRIPT, 2), 'audit-missing');
  // a clean audit of the old epoch after a tainted audit of the committed epoch does not clear it
  w = gateWorld({ noStpa: true });
  w.add('stpa', 'stpa', 'stpa-a', goodStpa(w.cut), { audit: null, epoch: 2 });
  writeTasks(w.root, w.rows);
  auditLine(w.root, 'tainted', 2);
  auditLine(w.root, 'clean', 1);
  assertReason(shape(check(w.root), SCRIPT, 1), 'analysis-tainted');
  // and the committed epoch's own clean audit passes
  w = gateWorld({ noStpa: true });
  w.add('stpa', 'stpa', 'stpa-a', goodStpa(w.cut), { audit: null, epoch: 2 });
  writeTasks(w.root, w.rows);
  auditLine(w.root, 'clean', 2);
  shape(check(w.root), SCRIPT, 0);
});

test('T13 the protocol model result: missing and not_run are exit 2, fail is exit 1, garbage JSON is exit 2', () => {
  let w = gateWorld({ model: null });
  assertReason(shape(check(w.root), SCRIPT, 2), 'model-missing');
  assert.equal(gateOf(w.root).model, 'not_run');
  w = gateWorld({ model: { result: 'not_run', sha: 'c'.repeat(64) } });
  assertReason(shape(check(w.root), SCRIPT, 2), 'model-not-run');
  w = gateWorld({ model: { result: 'fail', sha: 'c'.repeat(64) } });
  assertReason(shape(check(w.root), SCRIPT, 1), 'model-fail');
  assert.equal(gateOf(w.root).model, 'fail');
  w = gateWorld({ model: null });
  fs.writeFileSync(path.join(w.root, 'completeness', 'model', 'result.json'), '{ this is not json');
  shape(check(w.root), SCRIPT, 2);
});

test('T14 the cut file edited after cut is exit 1 cut-mismatch; the cut file deleted is exit 2 cut-missing', () => {
  let w = gateWorld();
  fs.appendFileSync(path.join(w.root, 'completeness', `cut-${w.cut.slice(0, 12)}.md`), 'tail');
  assertReason(shape(check(w.root), SCRIPT, 1), 'cut-mismatch');
  w = gateWorld();
  fs.rmSync(path.join(w.root, 'completeness', `cut-${w.cut.slice(0, 12)}.md`));
  assertReason(shape(check(w.root), SCRIPT, 2), 'cut-missing');
});

test('T15 edited object bytes, an s_ id in an output list and a broken ledger are each exit 3', () => {
  let w = gateWorld();
  const obj = w.objs['stpa-a'];
  const file = path.join(w.root, 'store', 'objects', obj.id + '.json');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('synthetic context', 'edited context'));
  assertReason(shape(check(w.root), SCRIPT, 3), 'object-mismatch');
  assert.ok(!fs.existsSync(path.join(w.root, 'completeness', 'gate.json')));
  w = gateWorld();
  const rec = path.join(w.root, 'store', 'commits', 'fmea-a.fmea.json');
  const r = readJson(rec);
  r.outputs.push({ id: 's_0123456789abcdef', kind: 'fmea', sha256: 'd'.repeat(64) });
  fs.writeFileSync(rec, canon(r));
  assertReason(shape(check(w.root), SCRIPT, 3), 'seed-id');
  w = gateWorld();
  const lines = readLedger(w.root);
  lines[1].hash = 'e'.repeat(64);
  fs.writeFileSync(ledgerPath(w.root), lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
  const before = snapshot(w.root);
  assertReason(shape(check(w.root), SCRIPT, 3), 'ledger-broken');
  assert.deepEqual(snapshot(w.root), before);
});

test('T16 fail beats not_run: a failing rule and a missing model result give exit 1 with both slugs', () => {
  const w = gateWorld({ stpa: (s) => { s.ucas = s.ucas.filter((u) => u.uca_id !== 'act2-d'); }, model: null });
  const j = shape(check(w.root), SCRIPT, 1);
  assertReason(j, 'stpa-type-missing');
  assertReason(j, 'model-missing');
  assert.equal(gateOf(w.root).result, 'fail');
  assert.deepEqual(gateOf(w.root).reasons, [...gateOf(w.root).reasons].sort(), 'reasons are sorted');
});

test('T17 action lines: only params carrying line; null is a reading; max and floor compare as stated; no measure is not_run', () => {
  const line = { measure: 'unverifiable_share', op: 'max' };
  // null: a reading
  let w = gateWorld();
  shape(check(w.root), SCRIPT, 0);
  assert.deepEqual(gateOf(w.root).action_lines.find((a) => a.measure === 'unverifiable_share'), { measure: 'unverifiable_share', line: null, result: 'reading' });
  // set with gate true: pass at 0.2, fail at 0.5
  w = gateWorld();
  setParam(w.root, 'unverifiable_share_max', { value: 0.3, gate: true, line });
  setMeasures(w.root, { unverifiable_share: 0.2, coverage: 0.9 });
  shape(check(w.root), SCRIPT, 0);
  assert.equal(gateOf(w.root).action_lines.find((a) => a.measure === 'unverifiable_share').result, 'pass');
  setMeasures(w.root, { unverifiable_share: 0.5, coverage: 0.9 });
  assertReason(shape(check(w.root), SCRIPT, 1), 'action-line-fail');
  assert.equal(gateOf(w.root).action_lines.find((a) => a.measure === 'unverifiable_share').result, 'fail');
  // no measures file
  w = gateWorld();
  setParam(w.root, 'unverifiable_share_max', { value: 0.3, gate: true, line });
  assertReason(shape(check(w.root), SCRIPT, 2), 'measure-missing');
  // gate false: a reading whatever the value
  w = gateWorld();
  setParam(w.root, 'unverifiable_share_max', { value: 0.3, gate: false, line });
  setMeasures(w.root, { unverifiable_share: 0.9, coverage: 0.9 });
  shape(check(w.root), SCRIPT, 0);
  assert.equal(gateOf(w.root).action_lines.find((a) => a.measure === 'unverifiable_share').result, 'reading');
  // the coverage floor compares with >=
  w = gateWorld();
  setParam(w.root, 'coverage_floor', { value: 0.4, gate: true, line: { measure: 'coverage', op: 'floor' } });
  setMeasures(w.root, { unverifiable_share: 0.1, coverage: 0.4 });
  shape(check(w.root), SCRIPT, 0);
  assert.equal(gateOf(w.root).action_lines.find((a) => a.measure === 'coverage').result, 'pass');
  setMeasures(w.root, { unverifiable_share: 0.1, coverage: 0.39 });
  assertReason(shape(check(w.root), SCRIPT, 1), 'action-line-fail');
  // a param named x_max without line is never an action line
  assert.ok(!gateOf(w.root).action_lines.some((a) => /unattributed/.test(a.measure)));
  assert.equal(gateOf(w.root).action_lines.length, 2);
});

test('T18 two identical check runs give the same exit and bytes and the second appends no line; a changed input appends new lines', () => {
  const w = gateWorld();
  shape(check(w.root), SCRIPT, 0);
  const bytes = fs.readFileSync(path.join(w.root, 'completeness', 'gate.json'));
  const n = readLedger(w.root).length;
  const j = shape(check(w.root), SCRIPT, 0);
  assert.ok(bytes.equals(fs.readFileSync(path.join(w.root, 'completeness', 'gate.json'))));
  assert.equal(readLedger(w.root).length, n);
  assert.deepEqual(j.ledger_seq, []);
  writeJson(path.join(w.root, 'completeness', 'model', 'result.json'), { result: 'fail', sha: 'a'.repeat(64) });
  const k = shape(check(w.root), SCRIPT, 1);
  assert.ok(k.ledger_seq.length >= 3, 'a check line, a gate line and an incident');
  const kinds = readLedger(w.root).slice(n).map((l) => l.kind);
  assert.deepEqual(kinds, ['check', 'gate', 'incident']);
  assert.equal(readLedger(w.root).slice(n).find((l) => l.kind === 'incident').data.class, 'refusal');
  verifyLedger(readLedger(w.root));
});

test('T19 --dry-run on both modes: same exit and reasons as real, dry_run true, no file, no ledger line, no lock file', () => {
  const root = makeRoot();
  fs.writeFileSync(designPath(root), designText());
  const snap = snapshot(root);
  const d = shape(cutRun(root, ['--dry-run']), SCRIPT, 0);
  assert.equal(d.dry_run, true);
  assert.deepEqual(snapshot(root), snap);
  const real = shape(cutRun(root), SCRIPT, 0);
  assert.equal(real.result.cut_sha, d.result.cut_sha);
  const w = gateWorld({ model: null });
  const before = snapshot(w.root);
  const dc = shape(check(w.root, ['--dry-run']), SCRIPT, 2);
  assert.equal(dc.dry_run, true);
  assert.deepEqual(snapshot(w.root), before);
  assert.ok(!fs.existsSync(path.join(w.root, 'run', 'run.lock')));
  const rc = shape(check(w.root), SCRIPT, 2);
  assert.deepEqual(reasonCodes(dc), reasonCodes(rc));
});

test('T20 a stale ce is exit 64, a busy lock exit 75, the script under wt/ exit 3; every outcome is one line with script gate; the ledger verifies', () => {
  const w = gateWorld({ params: { lock_retries: 3 } });
  const before = snapshot(w.root);
  shape(run(SCRIPT, ['check', '--root', w.root, '--ce', '2', '--now', NOW], w.root), SCRIPT, 64);
  assert.deepEqual(snapshot(w.root), before);
  const holder = holdLock(w.root);
  try {
    const held = snapshot(w.root);
    assertReason(shape(check(w.root), SCRIPT, 75), 'lock-busy');
    assert.deepEqual(snapshot(w.root), held);
  } finally {
    holder.release();
    fs.rmSync(path.join(w.root, 'run', 'run.lock'), { force: true });
  }
  const dir = path.join(w.root, 'wt', 'x');
  fs.mkdirSync(dir, { recursive: true });
  const src = findScript(SCRIPT);
  fs.copyFileSync(src, path.join(dir, SCRIPT + '.mjs'));
  const libSrc = path.join(path.dirname(src), 'lib.mjs');
  if (fs.existsSync(libSrc)) fs.copyFileSync(libSrc, path.join(dir, 'lib.mjs'));
  assertReason(shape(run(SCRIPT, ['check', '--root', w.root, '--ce', '1', '--now', NOW], w.root, path.join(dir, SCRIPT + '.mjs')), SCRIPT, 3), 'run-from-attempt');
  shape(run(SCRIPT, ['check', '--root', w.root, '--ce', '1', '--bogus'], w.root), SCRIPT, 66);
  shape(check(w.root), SCRIPT, 0);
  verifyLedger(readLedger(w.root));
});

test('T21 the design-check schemas: a valid stpa, fmea and hazards object pass checkFormat; extras, bad values and long texts fail schema-invalid', async () => {
  const lib = await libOf();
  const root = makeRoot();
  const cut = 'a'.repeat(64);
  const fmt = async (name, v) => {
    try {
      await lib.checkFormat(root, name, v);
      return null;
    } catch (e) {
      return e;
    }
  };
  for (const [name, v] of [['stpa', goodStpa(cut)], ['fmea', goodFmea(cut)], ['hazards', goodHazards(cut)]]) {
    assert.equal(await fmt(name, v), null, name + ' is valid');
    assert.equal((await fmt(name, { ...v, schema_version: 2 }))?.code, 'schema-version', name + ' version');
    assert.equal((await fmt(name, { ...v, surprise: 1 }))?.code, 'schema-invalid', name + ' extra key');
    assert.equal((await fmt(name, { ...v, kind: name === 'stpa' ? 'fmea' : 'stpa' }))?.code, 'schema-invalid', name + ' kind');
  }
  const stpa = goodStpa(cut);
  stpa.ucas[0].type = 'X';
  assert.equal((await fmt('stpa', stpa))?.code, 'schema-invalid', 'a type of X');
  const stpa2 = goodStpa(cut);
  stpa2.controllers[0].name = 'one two three four five six seven eight nine';
  assert.equal((await fmt('stpa', stpa2))?.code, 'schema-invalid', 'a nine-word name');
  const bothNull = goodFmea(cut);
  bothNull.cells[0].finding = null;
  bothNull.cells[0].na_reason = null;
  assert.equal((await fmt('fmea', bothNull))?.code, 'schema-invalid', 'a cell with neither field');
  const both = goodFmea(cut);
  both.cells[0].finding = 'something';
  both.cells[0].na_reason = 'something else';
  assert.equal((await fmt('fmea', both))?.code, 'schema-invalid', 'a cell with both fields');
  const accepted = goodHazards(cut);
  accepted.hazards[0].status = 'accepted';
  assert.equal((await fmt('hazards', accepted))?.code, 'schema-invalid', 'status accepted');
  const named = goodHazards(cut);
  named.hazards[0].hazard_id = 'hazard1';
  assert.equal((await fmt('hazards', named))?.code, 'schema-invalid', 'hazard id hazard1');
  const long = goodHazards(cut);
  long.hazards[0].statement = Array.from({ length: 41 }, (_, i) => 'w' + i).join(' ');
  assert.equal((await fmt('hazards', long))?.code, 'schema-invalid', 'a 41-word statement');
  const owner = goodHazards(cut);
  owner.owner_quote = 'granted by the mapper';
  assert.equal((await fmt('hazards', owner))?.code, 'schema-invalid', 'an owner_quote field');
});

test('T22 several committed rows of one role for the cut: the one whose commit line has the highest seq is used, even when the earlier row has the higher updated_rev', async () => {
  const w = gateWorld({ noMapper: true });
  // mapper-a commits first and has a defect (an unmapped finding) but the higher updated_rev
  const bad = goodHazards(w.cut);
  bad.map = bad.map.filter((m) => m.source.id !== 'act1-n');
  w.add('mapper', 'hazards', 'mapper-a', bad, { rev: 9 });
  const good = goodHazards(w.cut);
  w.add('mapper', 'hazards', 'mapper-b', good, { rev: 1 });
  writeTasks(w.root, w.rows);
  shape(check(w.root), SCRIPT, 0);
  const g = gateOf(w.root);
  assert.equal(g.result, 'pass');
  assert.equal(g.hazards_sha, sha(canon(good)));
  const lib = await libOf();
  const cd = await lib.currentDesign(w.root);
  assert.equal(g.hazards_sha, cd.hazards_sha);
});

// ---------------------------------------------------------------------------------------------
// Needs the app
// ---------------------------------------------------------------------------------------------
test('NA1 two real blind sessions read only the cut (audit.mjs labels them from real transcripts, CONTRACT 7 item 7) and the mapper\'s output is useful', { skip: 'needs the app' }, () => {});
test('NA2 the model result\'s sha binds to a real protocol-model run (built elsewhere)', { skip: 'needs the app' }, () => {});
