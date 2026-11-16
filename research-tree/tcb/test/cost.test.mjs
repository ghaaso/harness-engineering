// cost.mjs tests, written from spec/cost.mjs.md and CONTRACT.md. One test per numbered behaviour, named with its id.
// Each test builds its own run root (or scratch folder) under tcb-build/tmp and removes it afterwards.
// Scripts run as child processes; the checks are the exit code, the §1.3 JSON line on stdout and the files.
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
const COST = path.join(TCB, 'cost.mjs');
const NOW = '2026-11-17T10:00:00.000Z';
const ZERO = '0'.repeat(64);
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
const closeTo = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${msg ?? ''} ${a} is not close to ${b}`);

// ---- scratch folders and run roots ----
const MADE = [];
after(() => {
  for (const d of MADE) {
    try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); } catch { /* best effort */ }
  }
});
function scratch(prefix = 'cs-') {
  fs.mkdirSync(TMP, { recursive: true });
  const d = fs.mkdtempSync(path.join(TMP, prefix));
  MADE.push(d);
  return d;
}
const readJ = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const putJ = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v, null, 2)); };
const shipped = () => readJ(path.join(TCB, 'cost-inputs.json'));

// ---- running the script ----
function runCost(args, { cwd, env } = {}) {
  fs.mkdirSync(TMP, { recursive: true });
  const r = spawnSync(process.execPath, [COST, ...args], { encoding: 'utf8', cwd: cwd ?? TMP, env: env ?? process.env, windowsHide: true, shell: false, maxBuffer: 64 * 1024 * 1024 });
  const lines = (r.stdout ?? '').split('\n').filter((l) => l !== '');
  assert.equal(lines.length, 1, `stdout must be exactly one JSON line, got ${lines.length}: ${(r.stdout ?? '').slice(0, 300)} | stderr: ${(r.stderr ?? '').slice(0, 300)}`);
  const json = JSON.parse(lines[0]);
  return { exit: r.status, json, stdout: r.stdout, stderr: r.stderr ?? '' };
}
// the §1.3 line: every key, the slug of the exit, ok, script and mode
function shape(r, { exit, mode }) {
  const j = r.json;
  for (const k of ['ok', 'script', 'mode', 'exit', 'code', 'dry_run', 'result', 'reasons', 'ledger_seq']) assert.ok(k in j, `missing key ${k}`);
  assert.equal(j.script, 'cost');
  assert.equal(j.mode, mode);
  assert.equal(r.exit, exit, `exit ${r.exit}: ${r.stdout.slice(0, 600)} ${r.stderr.slice(0, 300)}`);
  assert.equal(j.exit, exit);
  assert.equal(j.code, EXIT_SLUG[exit]);
  assert.equal(j.ok, exit === 0);
  assert.ok(Array.isArray(j.reasons) && Array.isArray(j.ledger_seq));
}
const reasonCodes = (r) => r.json.reasons.map((x) => x.code);

// ---- thresholds and run roots for from-transcripts ----
function thresholdsFile(root, over = {}) {
  const t = readJ(path.join(TCB, 'thresholds.json'));
  t.params.transcripts_root.value = fwd(root) + '/transcripts';
  for (const [k, v] of Object.entries(over)) t.params[k] = { ...(t.params[k] ?? { unit: 'tests only', source: 'guess', gate: false }), value: v };
  return t;
}
const row = (task, o = {}) => ({
  task, field: 'f1', stage: 'research', role: 'child', steps: ['pack'], deps: [], question_ids: ['f1-a-01', 'f1-a-02'], e_task: 50000, tier: 'synthetic-tier',
  state: 'planned', step: 'none', epoch: 0, reason: null, session: null, restarts: 0, handovers: 0, parks: 0, limit: false, fails: [], attempts: [], commits: {}, updated_rev: 1, ...o,
});
const att = (task, e, o = {}) => ({ epoch: e, folder: `wt/${task}-e${e}`, stop: 'none', ...o });
function makeRoot({ ce = 1, session, params = {}, rows = [] } = {}) {
  const root = scratch('cst-');
  for (const d of ['tcb', 'plan', 'plan/frozen', 'run', 'store/objects', 'store/commits', 'store/status', 'wt', 'transcripts']) fs.mkdirSync(path.join(root, d), { recursive: true });
  fs.cpSync(path.join(TCB, 'schemas'), path.join(root, 'tcb', 'schemas'), { recursive: true }); // flat layout: the run root's own copy of the schemas
  putJ(path.join(root, 'tcb', 'thresholds.json'), thresholdsFile(root, params));
  const coord = { schema_version: 1, ce, started_at: NOW, tcb_commit: 'a'.repeat(40) };
  if (session) coord.session = session;
  putJ(path.join(root, 'run', 'coord.json'), coord);
  putJ(path.join(root, 'run', 'tasks.json'), { schema_version: 1, rev: 1, tasks: rows });
  return root;
}
const sid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const projectDirName = (p) => p.replace(/[:\\/._ ]/g, '-');

// ---- ledger (hash chain of CONTRACT 3.7) ----
const ledgerPath = (root) => path.join(root, 'run', 'ledger.jsonl');
function readLedger(root) {
  if (!fs.existsSync(ledgerPath(root))) return [];
  return fs.readFileSync(ledgerPath(root), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}
function verifyLedger(lines) {
  let prev = ZERO;
  lines.forEach((l, i) => {
    assert.equal(l.seq, i + 1);
    assert.equal(l.prev, prev);
    const { hash, ...rest } = l;
    assert.equal(hash, sha(prev + canon(rest)), 'ledger hash recomputes at seq ' + l.seq);
    prev = hash;
  });
}
function addLedger(root, kind, data, extra = {}) {
  const lines = readLedger(root);
  const prev = lines.length ? lines[lines.length - 1].hash : ZERO;
  const line = { seq: lines.length + 1, prev, ts: NOW, ce: 1, writer: 'test-fixture', writer_sha: ZERO, kind, ...extra, data };
  line.hash = sha(prev + canon(line));
  fs.mkdirSync(path.dirname(ledgerPath(root)), { recursive: true });
  fs.appendFileSync(ledgerPath(root), JSON.stringify(line) + '\n');
}

// ---- synthetic transcripts in the CONTRACT 4.8 shape ----
// call(ctx, ...): a model call whose context (input + cache_read + cache_write) is ctx and whose output is `out`.
const call = (ctx, o = {}) => ({ ctx, out: o.out ?? 200, tools: o.tools ?? [], ts: o.ts, model: o.model });
const usageOf = (c) => ({ input_tokens: 1000, cache_read_input_tokens: c.ctx - 1500, cache_creation_input_tokens: 500, output_tokens: c.out });
const tokensOf = (calls) => calls.reduce((a, c) => a + c.ctx + c.out, 0);
const weightedOf = (calls) => calls.reduce((a, c) => a + 1000 + 0.05 * (c.ctx - 1500) + 1.25 * 500 + 5 * c.out, 0);
const T0 = Date.parse('2026-11-17T08:00:00.000Z');
function writeT(file, { sessionId, cwd, calls, torn = false, synthetic = 0 }) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const recs = [{ type: 'user', uuid: 'u0', sessionId, cwd, timestamp: new Date(T0).toISOString(), message: { role: 'user', content: 'synthetic start' } }];
  calls.forEach((c, i) => {
    const content = [{ type: 'text', text: 'step ' + i }];
    c.tools.forEach((t, j) => content.push({ type: 'tool_use', id: `toolu_${sessionId.slice(-6)}_${i}_${j}`, name: t.name, input: t.input }));
    recs.push({ type: 'assistant', uuid: `ua${i}`, sessionId, cwd, timestamp: c.ts ?? new Date(T0 + (i + 1) * 1000).toISOString(), message: { id: `msg_${sessionId.slice(-8)}_${i}`, type: 'message', role: 'assistant', model: c.model ?? 'claude-test', content, usage: usageOf(c) } });
    c.tools.forEach((t, j) => recs.push({ type: 'user', uuid: `ur${i}_${j}`, sessionId, cwd, timestamp: new Date(T0 + (i + 1) * 1000 + 500).toISOString(), message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: `toolu_${sessionId.slice(-6)}_${i}_${j}`, content: 'ok', is_error: false }] } }));
  });
  for (let i = 0; i < synthetic; i++) {
    recs.push({ type: 'assistant', uuid: `us${i}`, sessionId, cwd, timestamp: new Date(T0 + 900000 + i).toISOString(), message: { id: `msg_synth_${i}`, type: 'message', role: 'assistant', model: '<synthetic>', content: [{ type: 'text', text: 'synthetic' }], usage: { input_tokens: 777, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 9 } } });
  }
  let text = recs.map((r) => JSON.stringify(r)).join('\n') + '\n';
  if (torn) text += '{"type":"assistant","message":{"id":"msg_torn","mod';
  fs.writeFileSync(file, text);
}
const sessionFile = (root, sessionId, proj = 'proj') => path.join(root, 'transcripts', proj, `${sessionId}.jsonl`);
function helperFile(root, sessionId, id, agentType, proj = 'proj') {
  const f = path.join(root, 'transcripts', proj, sessionId, 'subagents', `agent-${id}.jsonl`);
  if (agentType !== undefined) {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f.replace(/\.jsonl$/, '.meta.json'), JSON.stringify({ agentType }));
  }
  return f;
}
const folderOf = (root, task, e) => path.join(root, 'wt', `${task}-e${e}`);
const stepCalls = (first, step, n, o = {}) => Array.from({ length: n }, (_, i) => call(first + step * i, o));

// ---- cards and commit records ----
function putCard(root, qids, tag) {
  const card = {
    schema_version: 1, kind: 'card', field: 'f1', question_ids: qids, route: 'keyword',
    source: { url: 'https://example.test/a/' + tag, canonical_id: 'synthetic-' + tag, primary_id: 'synthetic-' + tag, evidence_type: 'benchmark' },
    quote: 'synthetic quote ' + tag, measured: { approach_id: 'a_one', measure: 'm_one', value: 1, unit: 'x', baseline: 2, baseline_kind: 'control', better: 'lower', effect: 'improves' },
    conditions: { task: ['t'], model_family: ['m'], language: ['l'] }, what_measured: 'synthetic ' + tag,
  };
  const bytes = canon(card);
  const id = 'c_' + sha(bytes).slice(0, 16);
  fs.writeFileSync(path.join(root, 'store', 'objects', id + '.json'), bytes);
  return { id, card, size: Buffer.byteLength(bytes, 'utf8') };
}
function commitCards(root, task, step, cards, epoch = 1) {
  const outputs = cards.map((c) => ({ id: c.id, kind: 'card', sha256: sha(canon(c.card)) })).sort((a, b) => (a.id < b.id ? -1 : 1));
  const rec = { schema_version: 1, task, step, epoch, step_key: ZERO, outputs, outputs_sha: sha(canon(outputs)) };
  fs.writeFileSync(path.join(root, 'store', 'commits', `${task}.${step}.json`), JSON.stringify(rec));
  return sha(canon(rec));
}
function freezeProtocol(root, field, qids) {
  const value = {
    kind: 'protocol', field, question_ids: qids, criteria: { include: [{ code: 'i1', text: 'synthetic' }], exclude: [{ code: 'x1', text: 'synthetic' }] }, routes: ['keyword'],
    card_schema_version: 1, certainty_method: 'synthetic', sesoi: {}, outlist_vocab: { approaches: ['a_one'], measures: ['m_one'], effects: ['improves'] }, seeds: [], must_read: [],
    fixed_files: [], cross_field: [], approval: { quote: 'synthetic approval', at: NOW },
  };
  const bytes = canon(value);
  const h = sha(bytes);
  const rel = `plan/frozen/protocol-${field}-${h.slice(0, 12)}.json`;
  fs.writeFileSync(path.join(root, rel), bytes);
  addLedger(root, 'protocol-freeze', { name: `protocol-${field}`, sha256: h, path: rel });
}

const costFT = (root, extra = []) => runCost(['from-transcripts', '--root', root, '--ce', '1', '--now', NOW, ...extra]);
const unitFile = (root) => path.join(root, 'plan', 'unit-costs.json');
const treeFiles = (dir) => {
  const out = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out[fwd(path.relative(dir, p))] = sha(fs.readFileSync(p));
    }
  };
  walk(dir);
  return out;
};

// The pilot world of T9: a coordinator, a research child with one helper reader, and a fresh reviewer.
function pilotWorld(params = {}) {
  const COORD = sid(1), CHILD = sid(2), REV = sid(3);
  const q = ['f1-a-01', 'f1-a-02'];
  const rows = [
    row('f1-research', { question_ids: q, state: 'committed', step: 'bound', epoch: 1, reason: 'first', session: CHILD, attempts: [att('f1-research', 1, { session: CHILD })] }),
    row('f1-review-r1', { stage: 'fresh-review', role: 'fresh-reviewer', steps: ['review'], deps: ['f1-research'], question_ids: [], state: 'active', step: 'bound', epoch: 1, reason: 'first', session: REV, attempts: [att('f1-review-r1', 1, { session: REV })] }),
  ];
  const root = makeRoot({ session: COORD, rows, params });
  const calls = {
    coord: stepCalls(100000, 3000, 3),
    child: stepCalls(70000, 2800, 6),
    helper: [call(20000, { out: 100 }), call(21000, { out: 100 }), call(22000, { out: 100 })],
    rev: stepCalls(135000, 2800, 5, { out: 300 }),
  };
  writeT(sessionFile(root, COORD), { sessionId: COORD, cwd: root, calls: calls.coord });
  writeT(sessionFile(root, CHILD), { sessionId: CHILD, cwd: folderOf(root, 'f1-research', 1), calls: calls.child });
  writeT(helperFile(root, CHILD, 'h1', 'reader'), { sessionId: CHILD, cwd: folderOf(root, 'f1-research', 1), calls: calls.helper });
  writeT(sessionFile(root, REV), { sessionId: REV, cwd: folderOf(root, 'f1-review-r1', 1), calls: calls.rev });
  const c1 = putCard(root, ['f1-a-01'], 'one');
  commitCards(root, 'f1-research', 'pack', [c1]);
  return { root, calls, ids: { COORD, CHILD, REV } };
}

// ================================================================================================
// compute

test('T1 compute on the shipped inputs: coordinator H0, k*, W*, weighted k*, fan-out rows', () => {
  const r = runCost(['compute']);
  shape(r, { exit: 0, mode: 'compute' });
  assert.equal(r.json.dry_run, false);
  const c = r.json.result.coordinator;
  assert.equal(c.H0, 432400);
  assert.equal(Math.round(c.k_star * 10) / 10, 17.6);
  assert.equal(Math.round(c.W_star / 100) * 100, 133200);
  assert.equal(Math.round(c.weighted.k_star * 10) / 10, 26.1);
  assert.equal(c.fanout_rows, 246);
  assert.equal(Math.round(c.script_status.k_star * 10) / 10, 17.5);
  assert.deepEqual(r.json.ledger_seq, []);
});

test('T2 compute: the research child at g = 2800 and g = 10000', () => {
  const r = runCost(['compute']);
  shape(r, { exit: 0, mode: 'compute' });
  const ch = r.json.result.child;
  assert.deepEqual(ch.map((x) => x.g), [2800, 5000, 10000]);
  const a = ch[0];
  assert.equal(Math.round(a.k_star * 10) / 10, 16.1);
  assert.equal(Math.round(a.W_star / 100) * 100, 115000);
  assert.equal((a.one_session.count / 1e6).toFixed(2), '94.89');
  assert.equal(a.one_session.max_window, 730800);
  assert.equal(a.one_session.over_cap, true);
  assert.equal((a.handover_at_kstar.count / 1e6).toFixed(2), '44.98');
  assert.equal(a.handover_at_kstar.handovers, 14);
  assert.equal(a.n_max, 289);
  assert.equal(a.break_even_n, 29);
  assert.equal(Math.round(a.ratio.count * 100) / 100, 2.11);
  assert.equal(ch[2].n_max, 307);
});

test('T3 compute: review price, packing, concurrency, admission, order', () => {
  const r = runCost(['compute']);
  shape(r, { exit: 0, mode: 'compute' });
  const res = r.json.result;
  const v = res.review[0];
  assert.equal(res.review[0].g, 2800);
  assert.equal((v.same_session.count / 1e6).toFixed(2), '126.42');
  assert.equal((v.research.count / 1e6).toFixed(2), '44.98');
  assert.equal((v.fresh_review.count / 1e6).toFixed(2), '7.58');
  assert.equal(Math.round(v.ratio * 100) / 100, 2.4);
  assert.equal(res.reviewer_capacity, 180000);
  assert.equal(res.packing.leaves.length, 2);
  assert.equal(res.packing.leaves[1].separator, 'F7-C');
  assert.equal(res.packing.lower_bound_leaves, 2);
  assert.equal(res.concurrency.N_mem, 2);
  assert.equal(res.concurrency.N, 2);
  assert.equal(Math.round(res.admission.factor * 100) / 100, 1.82);
  assert.equal(res.admission.max_fields, 3);
  assert.deepEqual(res.order.map((x) => x.field), ['F2', 'F7', 'F6', 'F4', 'F5', 'F3']);
});

test('T4 compute --text: the report is in result.text and on stderr, stdout stays one JSON line', () => {
  const r = runCost(['compute', '--text']);
  shape(r, { exit: 0, mode: 'compute' });
  const text = r.json.result.text;
  assert.ok(text.startsWith('== cost.mjs output, inputs: cost-inputs.json =='), text.slice(0, 80));
  assert.ok(text.includes('[1] Coordinator (count): H0=432.4k k*=17.6 calls  W*=133.2k'));
  assert.ok(text.includes('[8] Order after the pilot'));
  assert.ok(r.stderr.includes(text), 'the same text goes to stderr');
  assert.equal(r.stdout.trim().split('\n').length, 1);
  const without = runCost(['compute']);
  assert.ok(!('text' in without.json.result), 'no text without --text');
});

test('T5 compute: bad inputs are exit 2 input-invalid naming the path; nothing is written; no --root or --ce needed', () => {
  const dir = scratch('cs5-');
  const base = shipped();
  const variants = {
    'child.g_sweep': (i) => { i.child.g_sweep.v = []; return i; },
    weights: (i) => { delete i.weights; return i; },
    'coordinator.g': (i) => { i.coordinator.g.v = -2800; return i; },
    'child.g_sweep#neg': (i) => { i.child.g_sweep.v = [2800, -1]; return i; },
    'packing.questions': (i) => { i.packing.questions.v[0].id = 'not a key'; return i; },
    'coordinator.P.tag': (i) => { i.coordinator.P.tag = 'X'; return i; },
    'concurrency.rss_mb': (i) => { i.concurrency.rss_mb.v = 'NaN'; return i; },
    'review.n_rev': (i) => { i.review.n_rev.v = null; return i; },
  };
  const before = fs.readdirSync(dir);
  for (const [name, mut] of Object.entries(variants)) {
    const f = path.join(dir, 'in.json');
    putJ(f, mut(structuredClone(base)));
    const r = runCost(['compute', '--inputs', f], { cwd: dir });
    shape(r, { exit: 2, mode: 'compute' });
    assert.ok(reasonCodes(r).includes('input-invalid'), name);
    const want = name.split('#')[0];
    assert.ok(JSON.stringify(r.json.reasons).includes(want) || r.stderr.includes(want), `${name}: the path must be named: ${JSON.stringify(r.json.reasons)}`);
  }
  // unparseable files: broken JSON, a bare NaN, empty, a missing file
  for (const text of ['{ not json', '{"coordinator": NaN}', '']) {
    const f = path.join(dir, 'in.json');
    fs.writeFileSync(f, text);
    const r = runCost(['compute', '--inputs', f], { cwd: dir });
    shape(r, { exit: 2, mode: 'compute' });
    assert.ok(reasonCodes(r).includes('input-invalid'));
  }
  const gone = runCost(['compute', '--inputs', path.join(dir, 'nowhere.json')], { cwd: dir });
  shape(gone, { exit: 2, mode: 'compute' });
  assert.ok(reasonCodes(gone).includes('input-invalid'));
  assert.deepEqual(fs.readdirSync(dir).sort(), [...before, 'in.json'].sort(), 'compute writes no file');
  // flags of other modes are a usage error
  shape(runCost(['compute', '--ce', '1']), { exit: 66, mode: 'compute' }); // the mode is known, so it is reported
  shape(runCost(['compute', '--bogus']), { exit: 66, mode: null });
});

test('T6 compute is deterministic and pure; one changed input moves only what depends on it; stand_in follows the tags', () => {
  const a = runCost(['compute']);
  const b = runCost(['compute']);
  assert.equal(a.stdout, b.stdout, 'two runs give identical stdout');
  assert.equal(a.json.result.stand_in, true);

  const dir = scratch('cs6-');
  const i = shipped();
  i.coordinator.w.v = 0;
  putJ(path.join(dir, 'w0.json'), i);
  const c = runCost(['compute', '--inputs', path.join(dir, 'w0.json')], { cwd: dir });
  shape(c, { exit: 0, mode: 'compute' });
  assert.equal(Math.round(c.json.result.coordinator.k_star * 10) / 10, 17.5);
  for (const k of ['child', 'review', 'fanout', 'packing', 'concurrency', 'admission', 'order', 'reviewer_capacity']) {
    assert.deepEqual(c.json.result[k], a.json.result[k], `${k} does not depend on coordinator.w`);
  }

  const allM = shipped();
  const retag = (o) => {
    if (Array.isArray(o)) o.forEach(retag);
    else if (o && typeof o === 'object') {
      if ('tag' in o) o.tag = 'M';
      Object.values(o).forEach(retag);
    }
  };
  retag(allM);
  putJ(path.join(dir, 'm.json'), allM);
  const m = runCost(['compute', '--inputs', path.join(dir, 'm.json')], { cwd: dir });
  shape(m, { exit: 0, mode: 'compute' });
  assert.equal(m.json.result.stand_in, false);
});

// ================================================================================================
// predict

function predictRoot(inputs = shipped()) {
  const root = scratch('cs7-');
  putJ(path.join(root, 'plan', 'cost-inputs.json'), inputs);
  return root;
}

test('T7 predict (form a): arms, total, work ratio, stand-in; --s2; --child-form b', () => {
  const root = predictRoot();
  const r = runCost(['predict', '--root', root]);
  shape(r, { exit: 0, mode: 'predict' });
  const p = r.json.result;
  assert.equal(p.form, 'a');
  assert.equal(p.n_cap, 83);
  assert.equal(p.arms.T, 15338400);
  assert.equal(p.arms.S1, 15338400);
  assert.equal(p.arms.R_same, 14280000);
  assert.equal(p.arms.R1, 7584000);
  assert.equal(p.arms.R2, 7584000);
  assert.ok(!('S2' in p.arms));
  assert.equal(p.total, 60124800);
  assert.equal(Math.round(p.work_ratio.ratio * 100) / 100, 2.4);
  assert.equal(p.stand_in, true);
  assert.equal(p.helpers_modelled, false);
  assert.deepEqual(p.time_speedup.map((x) => x.s), [0.2, 0.4, 0.6]);
  assert.ok(p.time_speedup.every((x) => x.N === 2 && x.speedup > 1));

  const s2 = runCost(['predict', '--root', root, '--s2']);
  shape(s2, { exit: 0, mode: 'predict' });
  assert.equal(s2.json.result.arms.S2, 15338400);
  assert.equal(s2.json.result.total, 60124800 + 15338400);

  const b = runCost(['predict', '--root', root, '--child-form', 'b']);
  shape(b, { exit: 0, mode: 'predict' });
  assert.equal(b.json.result.form, 'b');
  assert.equal(b.json.result.arms.R_same, 0);
  assert.equal((b.json.result.arms.T / 1e6).toFixed(2), '44.98');
  assert.equal(b.json.result.arms.S1, 15338400);
  // predict reads only
  assert.deepEqual(Object.keys(treeFiles(root)), ['plan/cost-inputs.json']);
});

test('T8 predict --actual, --g, and the plan inputs', () => {
  const root = predictRoot();
  const a = runCost(['predict', '--root', root, '--actual', '60124800']);
  shape(a, { exit: 0, mode: 'predict' });
  assert.equal(a.json.result.check.ratio, 1);
  assert.equal(a.json.result.check.within_2x, true);
  const b = runCost(['predict', '--root', root, '--actual', '130000000']);
  shape(b, { exit: 0, mode: 'predict' });
  closeTo(b.json.result.check.ratio, 2.16, 'ratio', 0.005);
  assert.equal(b.json.result.check.within_2x, false);
  assert.ok(!('check' in runCost(['predict', '--root', root]).json.result), 'no check without --actual');

  const g5 = runCost(['predict', '--root', root, '--g', '5000']);
  shape(g5, { exit: 0, mode: 'predict' });
  assert.equal(g5.json.result.g, 5000);
  assert.notEqual(g5.json.result.arms.T, 15338400);
  shape(runCost(['predict', '--root', root, '--g', '7']), { exit: 66, mode: 'predict' });
  shape(runCost(['predict', '--root', root, '--g', 'abc']), { exit: 66, mode: 'predict' });
  shape(runCost(['predict', '--root', root, '--child-form', 'c']), { exit: 66, mode: 'predict' });
  shape(runCost(['predict', '--root', root, '--actual', '-5']), { exit: 66, mode: 'predict' });

  // no plan/cost-inputs.json and no --inputs: exit 2; --inputs names another file and works
  const empty = scratch('cs8-');
  const none = runCost(['predict', '--root', empty]);
  shape(none, { exit: 2, mode: 'predict' });
  assert.ok(reasonCodes(none).includes('input-invalid'));
  const other = path.join(empty, 'other.json');
  putJ(other, shipped());
  shape(runCost(['predict', '--root', empty, '--inputs', other]), { exit: 0, mode: 'predict' });
  // bad plan inputs are input-invalid too
  const bad = predictRoot((() => { const i = shipped(); i.child.g_sweep.v = []; return i; })());
  const rb = runCost(['predict', '--root', bad]);
  shape(rb, { exit: 2, mode: 'predict' });
  assert.ok(reasonCodes(rb).includes('input-invalid'));
});

// ================================================================================================
// from-transcripts

test('T9 from-transcripts: roles, units and the written file for coordinator, child with a helper, and a fresh reviewer', () => {
  const w = pilotWorld();
  const r = costFT(w.root);
  shape(r, { exit: 0, mode: 'from-transcripts' });
  const u = readJ(unitFile(w.root));
  assert.equal(u.schema_version, 1);
  assert.equal(u.trusted, true);
  assert.equal(u.generated_at, NOW);
  assert.equal(u.unattributed_share, 0);
  assert.deepEqual(u.missing, []);
  assert.equal(u.roles.child.P, 70000, 'P = the child first-call context');
  assert.equal(u.roles.child.g, 2800, 'g = the mean positive step');
  assert.equal(u.roles.coord.P, 100000);
  assert.equal(u.roles['fresh-reviewer'].P, 135000);
  assert.ok('helper:reader' in u.roles);
  for (const k of ['hc', 'qf', 'w']) assert.equal(u.roles.child[k], null);
  const hand = tokensOf(w.calls.child) + tokensOf(w.calls.helper);
  assert.equal(u.units['stage:research'].mean, hand, 'stage:research = session plus helper');
  assert.equal(u.units['stage:research'].n, 1);
  assert.equal(u.units['stage:research'].sd, null, 'sd is null with one task');
  closeTo(u.units['stage:research'].weighted_mean, weightedOf(w.calls.child) + weightedOf(w.calls.helper), 'weighted mean');
  assert.equal(u.units['helper_run:reader'].mean, tokensOf(w.calls.helper));
  assert.equal(u.units['stage:fresh-review'].mean, tokensOf(w.calls.rev));
  assert.equal(u.units.card.mean, hand, 'one committed card: all tokens');
  assert.equal(u.meter_self_reported, true);
  assert.equal(u.tokens_per_meter_pct, null);
  assert.equal(u.serial_fraction, null);
  assert.equal(u.rss_mb, null);
  // the result carries the same figures
  assert.equal(r.json.result.trusted, true);
  assert.equal(r.json.result.units['stage:research'].mean, hand);
  assert.equal(r.json.result.dry_run, undefined);
});

test('T9b from-transcripts: an attempt with no session is found by its folder; helpers join their task', () => {
  const T = 'f1-research';
  const CHILD = sid(12);
  const rows = [row(T, { state: 'committed', step: 'bound', epoch: 1, reason: 'first', attempts: [att(T, 1)] })];
  const root = makeRoot({ rows });
  const folder = folderOf(root, T, 1);
  const calls = stepCalls(70000, 2800, 5);
  writeT(path.join(root, 'transcripts', projectDirName(folder), `${CHILD}.jsonl`), { sessionId: CHILD, cwd: folder, calls });
  writeT(path.join(root, 'transcripts', projectDirName(folder), CHILD, 'subagents', 'agent-x.jsonl'), { sessionId: CHILD, cwd: folder, calls: [call(5000)] });
  fs.writeFileSync(path.join(root, 'transcripts', projectDirName(folder), CHILD, 'subagents', 'agent-x.meta.json'), JSON.stringify({ agentType: 'reader' }));
  commitCards(root, T, 'pack', [putCard(root, ['f1-a-01'], 'x')]);
  const r = costFT(root);
  shape(r, { exit: 0, mode: 'from-transcripts' });
  const u = readJ(unitFile(root));
  assert.equal(u.roles.child.P, 70000);
  assert.equal(u.units['stage:research'].mean, tokensOf(calls) + tokensOf([call(5000)]));
  assert.deepEqual(u.missing, []);
});

test('T10 from-transcripts: S0, sigma, o and a fall of context between calls', () => {
  const T = 'f1-research';
  const S = [sid(21), sid(22), sid(23)];
  const rows = [row(T, { state: 'committed', step: 'bound', epoch: 3, reason: 'handover', session: S[2], attempts: S.map((s, i) => att(T, i + 1, { session: s })) })];
  const root = makeRoot({ rows });
  const w = (e, calls) => writeT(sessionFile(root, S[e - 1]), { sessionId: S[e - 1], cwd: folderOf(root, T, e), calls });
  const wr = { name: 'Write', input: { file_path: 'staging/a.card.json', content: 'x' } };
  const rd = { name: 'Read', input: { file_path: 'in/brief.md' } };
  // epoch 1: first context 70000, steps 2800, a compaction fall to 40000 after the third call, a write at call 5 (not a successor)
  const c1 = [call(70000), call(72800), call(75600), call(40000), call(42800), call(45600, { tools: [wr] })];
  // epoch 2: first context 78000, steps 3000, the first write at call index 3
  const c2 = [call(78000, { tools: [rd] }), call(81000, { tools: [rd] }), call(84000), call(87000, { tools: [wr] }), call(90000), call(93000)];
  // epoch 3: first context 87000, steps 3200, the first write at call index 1
  const c3 = [call(87000), call(90200, { tools: [wr] }), call(93400), call(96600), call(99800)];
  w(1, c1); w(2, c2); w(3, c3);
  commitCards(root, T, 'pack', [putCard(root, ['f1-a-01'], 'y')], 3);
  const r = costFT(root);
  shape(r, { exit: 0, mode: 'from-transcripts' });
  const ro = readJ(unitFile(root)).roles.child;
  assert.equal(ro.P, 70000, 'P = the first-call context of the role (successor sessions carry reloaded state and are left out)');
  assert.equal(ro.S0, 78000 - ro.P, 'S0 = the second attempt first-call context minus P');
  assert.equal(ro.sigma, 87000 - 78000, 'sigma = mean difference of successive successors (epochs 2 and 3)');
  assert.equal(ro.o, (3 + 1) / 2, 'o = mean calls before the first Write in a successor session');
  assert.equal(ro.compactions, 1);
  assert.equal(ro.g, 3000, 'g = median over sessions of the mean positive step; the fall is skipped, not averaged');

  // with two epochs there are not two successors: sigma is null
  const T2 = 'f2-research';
  const S2 = [sid(31), sid(32)];
  const rows2 = [row(T2, { field: 'f2', question_ids: ['f2-a-01'], state: 'committed', step: 'bound', epoch: 2, reason: 'handover', session: S2[1], attempts: S2.map((s, i) => att(T2, i + 1, { session: s })) })];
  const root2 = makeRoot({ rows: rows2 });
  writeT(sessionFile(root2, S2[0]), { sessionId: S2[0], cwd: folderOf(root2, T2, 1), calls: stepCalls(70000, 2800, 5) });
  writeT(sessionFile(root2, S2[1]), { sessionId: S2[1], cwd: folderOf(root2, T2, 2), calls: stepCalls(78000, 2800, 5) });
  commitCards(root2, T2, 'pack', [putCard(root2, ['f2-a-01'], 'z')], 2);
  shape(costFT(root2), { exit: 0, mode: 'from-transcripts' });
  const ro2 = readJ(unitFile(root2)).roles.child;
  assert.equal(ro2.sigma, null);
  assert.equal(ro2.P, 70000);
  assert.equal(ro2.S0, 8000);
  assert.equal(ro2.o, null, 'no write in the successor: no figure');
});

test('T11 from-transcripts: t_q and k_q from the card split; no_estimate; the card unit', () => {
  const T = 'f1-research';
  const CHILD = sid(41);
  const rows = [row(T, { question_ids: ['f1-a-01', 'f1-a-02', 'f1-a-03'], state: 'committed', step: 'bound', epoch: 1, reason: 'first', session: CHILD, attempts: [att(T, 1, { session: CHILD })] })];
  const root = makeRoot({ rows });
  const calls = stepCalls(80000, 4000, 8);
  writeT(sessionFile(root, CHILD), { sessionId: CHILD, cwd: folderOf(root, T, 1), calls });
  const A = putCard(root, ['f1-a-01'], 'a');
  const B = putCard(root, ['f1-a-01'], 'bb');
  const C = putCard(root, ['f1-a-01', 'f1-a-02'], 'ccc');
  const D = putCard(root, ['f1-a-02'], 'dddd');
  commitCards(root, T, 'pack', [A, B, C, D]);
  freezeProtocol(root, 'f1', ['f1-a-01', 'f1-a-02', 'f1-a-03']);
  const r = costFT(root);
  shape(r, { exit: 0, mode: 'from-transcripts' });
  const u = readJ(unitFile(root));
  const tok = tokensOf(calls);
  const k = (c) => Math.round(c.size / 4);
  closeTo(u.t_q['f1-a-01'].t, tok / 4 + tok / 4 + tok / 8, 't_q 01');
  closeTo(u.t_q['f1-a-02'].t, tok / 8 + tok / 4, 't_q 02');
  closeTo(u.t_q['f1-a-01'].k, k(A) + k(B) + k(C) / 2, 'k_q 01');
  closeTo(u.t_q['f1-a-02'].k, k(C) / 2 + k(D), 'k_q 02');
  assert.ok(!('f1-a-03' in u.t_q));
  assert.deepEqual(u.no_estimate, ['f1-a-03']);
  assert.equal(u.units.card.mean, tok / 4);
  assert.equal(u.units.card.n, 1);
  assert.equal(u.trusted, true);
});

test('T12 from-transcripts: untrusted (unattributed share), a helper with no meta file, a missing transcript', () => {
  // a research task with transcripts and no committed card holding 30 % of all tokens
  const A = sid(51), B = sid(52);
  const rows = [
    row('f1-research', { state: 'committed', step: 'bound', epoch: 1, reason: 'first', session: A, attempts: [att('f1-research', 1, { session: A })] }),
    row('f2-research', { field: 'f2', question_ids: ['f2-a-01'], state: 'active', step: 'bound', epoch: 1, reason: 'first', session: B, attempts: [att('f2-research', 1, { session: B })] }),
  ];
  const root = makeRoot({ rows });
  writeT(sessionFile(root, A), { sessionId: A, cwd: folderOf(root, 'f1-research', 1), calls: [call(7000000, { out: 0 })] });
  writeT(sessionFile(root, B), { sessionId: B, cwd: folderOf(root, 'f2-research', 1), calls: [call(3000000, { out: 0 })] });
  commitCards(root, 'f1-research', 'pack', [putCard(root, ['f1-a-01'], 'p')]);
  const r = costFT(root);
  shape(r, { exit: 2, mode: 'from-transcripts' });
  assert.ok(reasonCodes(r).includes('untrusted'));
  const u = readJ(unitFile(root));
  assert.equal(u.trusted, false);
  assert.equal(u.unattributed_share, 0.3);
  assert.equal(readLedger(root).filter((l) => l.kind === 'unit-costs').length, 1, 'the file is written and the line appended even when untrusted');
  assert.equal(readLedger(root).at(-1).data.trusted, false);

  // a helper without a meta file counts as helper:unknown (and is unattributed)
  const C = sid(53);
  const rows2 = [row('f1-research', { state: 'committed', step: 'bound', epoch: 1, reason: 'first', session: C, attempts: [att('f1-research', 1, { session: C })] })];
  const root2 = makeRoot({ rows: rows2 });
  writeT(sessionFile(root2, C), { sessionId: C, cwd: folderOf(root2, 'f1-research', 1), calls: [call(8000000, { out: 0 })] });
  writeT(helperFile(root2, C, 'h9', undefined), { sessionId: C, cwd: folderOf(root2, 'f1-research', 1), calls: [call(2000000, { out: 0 })] });
  commitCards(root2, 'f1-research', 'pack', [putCard(root2, ['f1-a-01'], 'q')]);
  const r2 = costFT(root2);
  shape(r2, { exit: 2, mode: 'from-transcripts' });
  const u2 = readJ(unitFile(root2));
  assert.ok('helper_run:unknown' in u2.units);
  assert.ok('helper:unknown' in u2.roles);
  assert.equal(u2.unattributed_share, 0.2);
  assert.equal(u2.trusted, false);

  // a row whose attempt has no transcript: missing lists it, not trusted, exit 2
  const D = sid(54);
  const rows3 = [
    row('f1-research', { state: 'committed', step: 'bound', epoch: 1, reason: 'first', session: D, attempts: [att('f1-research', 1, { session: D })] }),
    row('f2-research', { field: 'f2', question_ids: ['f2-a-01'], state: 'active', step: 'bound', epoch: 1, reason: 'first', attempts: [att('f2-research', 1)] }),
  ];
  const root3 = makeRoot({ rows: rows3 });
  writeT(sessionFile(root3, D), { sessionId: D, cwd: folderOf(root3, 'f1-research', 1), calls: stepCalls(70000, 2800, 5) });
  commitCards(root3, 'f1-research', 'pack', [putCard(root3, ['f1-a-01'], 'r')]);
  const r3 = costFT(root3);
  shape(r3, { exit: 2, mode: 'from-transcripts' });
  const u3 = readJ(unitFile(root3));
  assert.deepEqual(u3.missing, [{ task: 'f2-research', epoch: 1 }]);
  assert.equal(u3.trusted, false);
  assert.equal(u3.unattributed_share, 0);

  // no transcript anywhere: nothing to read, exit 2 and no file
  const root4 = makeRoot({ rows: [row('f1-research', { state: 'active', step: 'bound', epoch: 1, reason: 'first', attempts: [att('f1-research', 1)] })] });
  const r4 = costFT(root4);
  shape(r4, { exit: 2, mode: 'from-transcripts' });
  assert.ok(!fs.existsSync(unitFile(root4)));
});

test('T13 from-transcripts: tokens per meter percent from the meter lines', () => {
  const COORD = sid(61);
  const mk = (pcts) => {
    const root = makeRoot({ session: COORD });
    const at = (m) => new Date(Date.parse('2026-11-17T08:00:00.000Z') + m * 60000).toISOString();
    // calls at minute -60 (before), 0 (the first meter line: excluded), 20, 60 (the last line: included), 120 (after)
    const calls = [call(500000, { out: 0, ts: at(-60) }), call(500000, { out: 0, ts: at(0) }), call(1000000, { out: 0, ts: at(20) }), call(1000000, { out: 0, ts: at(60) }), call(700000, { out: 0, ts: at(120) })];
    writeT(sessionFile(root, COORD), { sessionId: COORD, cwd: root, calls });
    pcts.forEach((pct, i) => addLedger(root, 'meter', { pct, self_reported: true }, { ts: at(i === 0 ? 0 : 60) }));
    return root;
  };
  const root = mk([10, 14]);
  shape(costFT(root), { exit: 0, mode: 'from-transcripts' });
  const u = readJ(unitFile(root));
  assert.equal(u.tokens_per_meter_pct, 500000);
  assert.equal(u.meter_self_reported, true);
  for (const [name, pcts] of [['one line', [10]], ['no rise', [14, 14]], ['a fall', [14, 10]], ['no line', []]]) {
    const rt = mk(pcts);
    shape(costFT(rt), { exit: 0, mode: 'from-transcripts' });
    assert.equal(readJ(unitFile(rt)).tokens_per_meter_pct, null, name);
  }
});

test('T14 from-transcripts: a torn last line is skipped; synthetic calls add nothing', () => {
  const run = (o) => {
    const T = 'f1-research';
    const S = sid(71);
    const root = makeRoot({ rows: [row(T, { state: 'committed', step: 'bound', epoch: 1, reason: 'first', session: S, attempts: [att(T, 1, { session: S })] })] });
    writeT(sessionFile(root, S), { sessionId: S, cwd: folderOf(root, T, 1), calls: stepCalls(70000, 2800, 6), ...o });
    commitCards(root, T, 'pack', [putCard(root, ['f1-a-01'], 'k')]);
    const r = costFT(root);
    shape(r, { exit: 0, mode: 'from-transcripts' });
    const u = readJ(unitFile(root));
    return { u, ledger: readLedger(root) };
  };
  const base = run({}).u;
  const torn = run({ torn: true }).u;
  assert.deepEqual(torn.units, base.units, 'the torn tail changes no total');
  assert.deepEqual(torn.roles, base.roles);
  const syn = run({ synthetic: 3 }).u;
  assert.deepEqual(syn.units, base.units, 'synthetic calls add no call');
  assert.deepEqual(syn.roles, base.roles);
});

test('T15 from-transcripts: stale --ce, --dry-run, a busy lock, identical bytes under the same --now', async () => {
  const w = pilotWorld();
  const stale = runCost(['from-transcripts', '--root', w.root, '--ce', '9', '--now', NOW]);
  shape(stale, { exit: 64, mode: 'from-transcripts' });
  assert.ok(reasonCodes(stale).includes('stale-ce'));
  assert.ok(!fs.existsSync(unitFile(w.root)));
  assert.equal(readLedger(w.root).length, 0);

  const dry = costFT(w.root, ['--dry-run']);
  shape(dry, { exit: 0, mode: 'from-transcripts' });
  assert.equal(dry.json.dry_run, true);
  assert.equal(dry.json.result.trusted, true);
  assert.ok(dry.json.result.units['stage:research']);
  assert.ok(!fs.existsSync(unitFile(w.root)), '--dry-run writes no file');
  assert.equal(readLedger(w.root).length, 0, '--dry-run appends no ledger line');
  assert.ok(!fs.existsSync(path.join(w.root, 'run', 'run.lock')), 'no lock left behind');
  // a stale --ce is checked in a dry run too
  shape(runCost(['from-transcripts', '--root', w.root, '--ce', '9', '--now', NOW, '--dry-run']), { exit: 64, mode: 'from-transcripts' });

  // a busy lock: this process holds run.lock; the script with lock_retries 3 gives up with 75 and writes nothing
  const lib = await import('../lib.mjs');
  const busy = pilotWorld({ lock_retries: 3 });
  const proc = lib.realProc({ exe: readJ(path.join(busy.root, 'tcb', 'thresholds.json')).params.proc_exe.value });
  const handle = await lib.acquireLock(busy.root, 'run.lock', { script: 'test', ce: 1, proc, now: NOW, retries: 1 });
  try {
    const r = costFT(busy.root);
    shape(r, { exit: 75, mode: 'from-transcripts' });
    assert.ok(!fs.existsSync(unitFile(busy.root)));
  } finally {
    handle.release();
  }

  // the same --now: identical bytes, and the second run appends no line
  const a = costFT(w.root);
  shape(a, { exit: 0, mode: 'from-transcripts' });
  const bytes1 = fs.readFileSync(unitFile(w.root));
  const b = costFT(w.root);
  shape(b, { exit: 0, mode: 'from-transcripts' });
  assert.ok(bytes1.equals(fs.readFileSync(unitFile(w.root))), 'two runs with the same --now write identical bytes');
  assert.equal(readLedger(w.root).filter((l) => l.kind === 'unit-costs').length, 1);
});

test('T16 from-transcripts: only plan/unit-costs.json and the ledger change; one unit-costs line with the file sha256; no clock, no environment', () => {
  const w = pilotWorld();
  const before = treeFiles(w.root);
  const r = costFT(w.root, []);
  shape(r, { exit: 0, mode: 'from-transcripts' });
  const after = treeFiles(w.root);
  const changed = Object.keys({ ...before, ...after }).filter((k) => before[k] !== after[k]).sort();
  assert.deepEqual(changed, ['plan/unit-costs.json', 'run/ledger.jsonl']);
  const text = fs.readFileSync(unitFile(w.root), 'utf8');
  assert.ok(!/NaN|Infinity/.test(text));
  JSON.parse(text);
  const lines = readLedger(w.root);
  verifyLedger(lines);
  const uc = lines.filter((l) => l.kind === 'unit-costs');
  assert.equal(uc.length, 1);
  assert.equal(uc[0].data.sha256, sha(fs.readFileSync(unitFile(w.root))));
  assert.equal(uc[0].data.trusted, true);
  assert.equal(uc[0].data.unattributed_share, 0);
  assert.deepEqual(r.json.ledger_seq, [uc[0].seq]);
  assert.equal(readJ(unitFile(w.root)).generated_at, NOW, 'the time is the --now given');

  // a different --now: new bytes, a second line; environment variables do not change the figures
  const again = runCost(['from-transcripts', '--root', w.root, '--ce', '1', '--now', '2026-11-17T11:00:00.000Z'], { env: { ...process.env, TCB_PROBE: 'x', TZ: 'Asia/Karachi' } });
  shape(again, { exit: 0, mode: 'from-transcripts' });
  const l2 = readLedger(w.root);
  verifyLedger(l2);
  assert.equal(l2.filter((l) => l.kind === 'unit-costs').length, 2);
  const u1 = JSON.parse(text);
  const u2 = readJ(unitFile(w.root));
  assert.equal(u2.generated_at, '2026-11-17T11:00:00.000Z');
  assert.deepEqual({ ...u2, generated_at: null }, { ...u1, generated_at: null });
});

test('T17 every outcome prints one JSON line with script cost and the mode', () => {
  shape(runCost(['compute']), { exit: 0, mode: 'compute' });
  shape(runCost(['predict', '--root', predictRoot()]), { exit: 0, mode: 'predict' });
  shape(costFT(pilotWorld().root), { exit: 0, mode: 'from-transcripts' });
  // compute needs no --root and no --ce, whatever folder it runs in
  const dir = scratch('cs17-');
  shape(runCost(['compute'], { cwd: dir }), { exit: 0, mode: 'compute' });
  // errors keep the shape: usage, a mode that is not one, a missing --root, a missing --ce
  const bad = runCost(['bogus']);
  assert.equal(bad.exit, 66);
  assert.equal(bad.json.script, 'cost');
  assert.equal(bad.json.code, 'usage');
  assert.equal(runCost(['predict']).exit, 66);
  assert.equal(runCost(['from-transcripts', '--root', dir]).exit, 66);
  assert.equal(runCost(['from-transcripts', '--root', dir, '--ce', 'x']).exit, 66);
  assert.equal(runCost(['predict', '--root', dir, '--nope']).exit, 66);
});

// The parser reads about 50 MB in 200 ms here, so the transcript is 120 MB to keep the parse window wide; the child needs about 100 ms to start, so a lock got before CHILD_BOOT_MS proves nothing.
const PARSE_BYTES = 120 * 1024 * 1024;
const CHILD_BOOT_MS = 150;
test('T18 from-transcripts: the run lock is not held while a 120 MB transcript is parsed', async () => {
  const lib = await import('../lib.mjs');
  const COORD = sid(81);
  const root = makeRoot({ session: COORD });
  // a 120 MB transcript of about 200,000 synthetic calls, written in blocks
  const file = sessionFile(root, COORD);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fd = fs.openSync(file, 'w');
  const pad = 'x'.repeat(300);
  let written = 0;
  let i = 0;
  while (written < PARSE_BYTES) {
    let block = '';
    for (let j = 0; j < 2000; j++, i++) {
      block += JSON.stringify({ type: 'assistant', uuid: `u${i}`, sessionId: COORD, cwd: root, timestamp: new Date(T0 + i).toISOString(), message: { id: `msg_big_${i}`, type: 'message', role: 'assistant', model: 'claude-test', content: [{ type: 'text', text: pad }], usage: { input_tokens: 10, cache_read_input_tokens: 1000 + i, cache_creation_input_tokens: 0, output_tokens: 5 } } }) + '\n';
    }
    written += fs.writeSync(fd, block);
  }
  fs.closeSync(fd);
  const proc = lib.realProc({ exe: readJ(path.join(root, 'tcb', 'thresholds.json')).params.proc_exe.value });
  await lib.selfInfo(proc); // cached: the test's own acquisitions then cost no PowerShell call
  const child = spawn(process.execPath, [COST, 'from-transcripts', '--root', root, '--ce', '1', '--now', NOW], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', () => {});
  const done = new Promise((res) => child.on('close', (code) => res(code)));
  let exited = false;
  done.then(() => { exited = true; });
  const t0 = Date.now();
  let childMs = null;
  done.then(() => { childMs = Date.now() - t0; });
  let acquiredDuringParse = false;
  while (!exited) {
    await new Promise((r) => setTimeout(r, 15));
    if (exited || Date.now() - t0 < CHILD_BOOT_MS) continue;
    try {
      await lib.withRunLock(root, { script: 'test', ce: 1, proc, now: NOW, retries: 3 }, async () => {
        if (!exited && !fs.existsSync(unitFile(root))) acquiredDuringParse = true;
      });
    } catch { /* busy: the child holds it now */ }
    if (acquiredDuringParse) break;
  }
  const code = await done;
  assert.ok(acquiredDuringParse, `a concurrent writer must get run.lock while the child is still parsing (child ran ${childMs} ms, exit ${await done}, out ${out.slice(0, 400)})`);
  assert.equal(code, 0, out.slice(0, 300));
  assert.ok(fs.existsSync(unitFile(root)));
});

// ================================================================================================
// the files this group owns

test('TH1 thresholds.json: every param has value, unit, source, gate; the two action lines; W_star_coord equals the model', () => {
  const t = readJ(path.join(TCB, 'thresholds.json'));
  assert.equal(t.schema_version, 1);
  for (const [name, p] of Object.entries(t.params)) {
    assert.deepEqual(Object.keys(p).filter((k) => !['value', 'unit', 'source', 'gate', 'line'].includes(k)), [], name);
    for (const k of ['value', 'unit', 'source', 'gate']) assert.ok(k in p, `${name} lacks ${k}`);
    assert.equal(typeof p.gate, 'boolean', name);
    assert.ok(typeof p.unit === 'string' && p.unit !== '', name);
    assert.match(p.source, /^(mapping:[A-Z][0-9]+-[0-9]{2}|owner|guess|measured)$/, name);
    if ('line' in p) assert.ok(['unverifiable_share_max', 'coverage_floor'].includes(name));
  }
  assert.ok(!('audit_coord_turn_factor' in t.params));
  assert.deepEqual(t.params.weights.value, { read: 0.05, write: 1.25, out: 5 });
  const nulls = Object.entries(t.params).filter(([, p]) => p.value === null).map(([n]) => n).sort();
  assert.deepEqual(nulls, ['B_tokens', 'W_star_child', 'coverage_floor', 'lean_baseline_tokens', 'lean_tolerance_tokens', 'plants_t', 'r_tokens', 'unverifiable_share_max']);
  const w = runCost(['compute']).json.result.coordinator.W_star;
  assert.equal(t.params.W_star_coord.value, Math.round(w / 100) * 100);
});

test('TH2 cost-inputs.json: the sections, the tags, the kept figures', () => {
  const i = shipped();
  assert.equal(i.schema_version, 1);
  for (const s of ['coordinator', 'child', 'review', 'weights', 'packing', 'concurrency', 'admission', 'order']) assert.ok(s in i, s);
  const check = (o, p) => {
    if (Array.isArray(o)) o.forEach((x, k) => check(x, `${p}[${k}]`));
    else if (o && typeof o === 'object') {
      if ('v' in o) {
        assert.ok(['M', 'E', 'G', 'I'].includes(o.tag), `${p}.tag`);
        assert.ok(typeof o.src === 'string' && o.src !== '', `${p}.src`);
      } else Object.entries(o).forEach(([k, v]) => check(v, `${p}.${k}`));
    }
  };
  check(i, '');
  assert.equal(i.coordinator.P.v, 79000);
  assert.equal(i.coordinator.P.tag, 'M');
  assert.deepEqual([i.coordinator.g.v, i.coordinator.hc.v, i.coordinator.o.v, i.coordinator.qf.v, i.coordinator.w.v], [2800, 2, 2.6, 0.5, 4000]);
  assert.deepEqual([i.child.P.v, i.child.S0.v, i.child.sigma.v, i.child.n.v, i.child.W_quality.v], [60000, 10000, 8000, 237, 300000]);
  assert.deepEqual(i.child.g_sweep.v, [2800, 5000, 10000]);
  assert.deepEqual([i.review.pack.v, i.review.n_rev.v], [75000, 40]);
  assert.deepEqual([i.weights.read, i.weights.write, i.weights.out], [0.05, 1.25, 5]);
});

// ================================================================================================
// behaviours that need the app

test('NA1 real transcripts have the §4.8 shape and helper meta files (CONTRACT §7 item 7); the hand-over parameters hc, qf, w can be read from them', { skip: 'needs the app' }, () => {});
test('NA2 tokens per meter percent means anything: the meter is read only by a session, in whole percent (CONTRACT §7 item 9)', { skip: 'needs the app' }, () => {});
