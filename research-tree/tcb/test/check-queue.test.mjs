// check-queue.mjs tests, written from spec/check-queue.mjs.md and CONTRACT.md only (the script's code is
// not consulted for expectations). One test per behaviour, named with its id. Each test builds its own run
// root under tcb-build/tmp and removes it afterwards. Scripts run as child processes; the exit code, the
// one JSON line on stdout and the files are what is asserted. Fixtures are synthetic.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkFormat } from '../lib.mjs';
import { windowAround } from '../check-queue.mjs';
import { CLASSES, OPERATORS } from '../seed.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TCB = path.resolve(HERE, '..');
const BUILD = path.resolve(TCB, '..');
const TMP = path.join(BUILD, 'tmp');
const FIX = path.join(TCB, 'fixtures', 'check-queue');
const NOW = '2026-11-17T10:00:00.000Z';
const ZERO = '0'.repeat(64);
const PS_EXE = 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
const EXIT_SLUG = { 0: 'ok', 1: 'fail', 2: 'not-run', 3: 'tamper', 5: 'ready-wins', 6: 'deferred', 10: 'reopened', 64: 'stale-ce', 65: 'stale-epoch', 66: 'usage', 67: 'table-corrupt', 70: 'internal', 75: 'lock-busy' };
const PREFIX = { card: 'c', pack: 'p', review: 'r', manifest: 'm', certificate: 'x' };

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
const TEXT = fs.readFileSync(path.join(FIX, '_words-600.txt'), 'utf8');
const TEXT_SHA = sha(TEXT);
const at = (word) => TEXT.indexOf(word);

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
function makeRoot({ ce = 1, params = {} } = {}) {
  fs.mkdirSync(TMP, { recursive: true });
  const root = fs.mkdtempSync(path.join(TMP, 'cq-'));
  ROOTS.push(root);
  for (const d of ['tcb', 'plan/frozen', 'run', 'store/objects', 'store/commits', 'store/status', 'views', 'queue', 'sealed/seeds', 'sealed/plants', '.snapshots/text', 'wt', 'transcripts']) {
    fs.mkdirSync(path.join(root, d), { recursive: true });
  }
  for (const sub of ['schemas', 'profiles', 'settings', 'agents', 'briefs']) {
    const src = path.join(TCB, sub);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(root, 'tcb', sub), { recursive: true });
  }
  fs.writeFileSync(path.join(root, 'tcb', 'thresholds.json'), JSON.stringify(thresholdsFile({ transcripts_root: fwd(root) + '/transcripts', ...params }), null, 2));
  fs.writeFileSync(path.join(root, 'run', 'coord.json'), JSON.stringify({ schema_version: 1, ce, started_at: NOW, tcb_commit: 'a'.repeat(40) }, null, 2));
  fs.writeFileSync(path.join(root, 'run', 'tasks.json'), JSON.stringify({ schema_version: 1, rev: 0, tasks: [] }, null, 2));
  fs.writeFileSync(path.join(root, '.snapshots', 'text', TEXT_SHA), TEXT);
  return root;
}

// ---- jsonl and the ledger (hash chain of CONTRACT 3.7) ----
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
  line.hash = sha(prev + canon(line));
  appendJsonl(ledgerPath(root), line);
  return line.seq;
}
const queueLines = (root) => readLedger(root).filter((l) => l.kind === 'queue');

// ---- store ----
function putObj(root, value) {
  const bytes = canon(value);
  const hex = sha(bytes);
  const id = PREFIX[value.kind] + '_' + hex.slice(0, 16);
  fs.writeFileSync(path.join(root, 'store', 'objects', id + '.json'), bytes);
  return { id, sha: hex, value };
}
const statusPath = (root) => path.join(root, 'store', 'status', 'card_status.jsonl');
const witnessPath = (root) => path.join(root, 'store', 'witness.jsonl');
function addStatus(root, card, status, extra = {}) {
  const seq = readJsonl(statusPath(root)).length + 1;
  const line = { seq, card_id: card.id, card_sha: card.sha, status, reason: extra.reason ?? 'ok', at: NOW };
  for (const k of ['witness_seq', 'check', 'classes']) if (extra[k] !== undefined) line[k] = extra[k];
  appendJsonl(statusPath(root), line);
}
function addWitness(root, card, o = {}) {
  const seq = readJsonl(witnessPath(root)).length + 1;
  const rec = {
    seq, card_id: card.id, card_sha: card.sha, raw_sha: sha('raw' + card.id), result: o.result ?? 'witnessed',
    number_bound: true, reason: o.reason ?? 'ok', source_changed: false, w: 300, at: NOW,
  };
  if (o.textSha !== null) rec.text_sha = o.textSha ?? TEXT_SHA;
  if (o.quoteOffset !== undefined) rec.quote_offset = o.quoteOffset;
  if (o.numberOffset !== undefined) rec.number_offset = o.numberOffset;
  appendJsonl(witnessPath(root), rec);
}
function mkCard(o = {}) {
  const tag = o.tag ?? 'a';
  return {
    schema_version: 1, kind: 'card', field: o.field ?? 'f1', question_ids: ['f1-g1-01'], route: 'keyword',
    source: { url: 'https://example.test/' + tag, canonical_id: 'doi:10.0/' + tag, primary_id: 'doi:10.0/' + tag, evidence_type: 'controlled' },
    quote: 'synthetic quote ' + tag,
    measured: { approach_id: o.approach ?? 'a1', measure: o.measure ?? 'm1', value: o.value ?? 10, unit: 'pct', baseline: o.baseline ?? 8, baseline_kind: 'control', better: 'higher', effect: 'improves' },
    conditions: o.conditions ?? { task: ['repair'], model_family: ['fam'], language: ['py'] },
    what_measured: 'synthetic measurement ' + tag,
  };
}
// A card with a witness record (offset at `word`) and the status `witnessed`.
function witnessedCard(root, tag, word = 'w0300', o = {}) {
  const c = putObj(root, mkCard({ tag, ...o }));
  addStatus(root, c, 'witnessed', { witness_seq: 1 });
  addWitness(root, c, { quoteOffset: at(word) });
  return c;
}
const byId = (cards) => [...cards].sort((a, b) => (a.id < b.id ? -1 : 1));

// ---- running a script as a child process ----
const scriptFile = (name) => [path.join(TCB, 'scripts', name + '.mjs'), path.join(TCB, name + '.mjs')].find((f) => fs.existsSync(f));
function run(script, argv, root) {
  const r = spawnSync(process.execPath, [scriptFile(script), ...argv], { cwd: root, encoding: 'utf8', windowsHide: true, shell: false, timeout: 180000, maxBuffer: 64 << 20 });
  const lines = (r.stdout ?? '').split('\n').filter((l) => l.trim());
  let json = null;
  if (lines.length === 1) { try { json = JSON.parse(lines[0]); } catch { json = null; } }
  return { exit: r.status, json, stdout: r.stdout ?? '', stderr: r.stderr ?? '', lines };
}
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
      if (e.isDirectory()) walk(p); else out[rel] = sha(fs.readFileSync(p));
    }
  })(root);
  return out;
}
function holdLock(root) {
  const child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore', windowsHide: true });
  const ps = spawnSync(PS_EXE, ['-NoProfile', '-NonInteractive', '-Command', `[Console]::OutputEncoding=[Text.Encoding]::UTF8; (Get-CimInstance Win32_Process -Filter "ProcessId=${child.pid}").CreationDate.ToUniversalTime().ToString('o')`], { encoding: 'utf8', windowsHide: true, timeout: 60000 });
  const start = (ps.stdout ?? '').trim();
  if (!/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(start)) { try { child.kill(); } catch { /* own child */ } throw new Error('cannot read start time of the test-owned sleeper: ' + start); }
  fs.writeFileSync(path.join(root, 'run', 'run.lock'), JSON.stringify({ pid: child.pid, start_time: start, nonce: 'a'.repeat(32), script: 'test-holder', ce: 1, acquired_at: NOW }));
  return { release() { try { child.kill(); } catch { /* own child */ } } };
}
const cq = (root, mode, extra = []) => run('check-queue', ['--root', root, '--ce', '1', '--now', NOW, ...(mode ? ['--mode', mode] : []), ...extra], root);

// ---- reading a written batch ----
const readJ = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const batchDir = (root, b) => path.join(root, 'queue', b);
const readBatch = (root, b) => readJ(path.join(batchDir(root, b), 'batch.json'));
const readKey = (root, b) => readJ(path.join(root, 'sealed', 'seeds', b + '.json'));
const readItem = (root, b, id) => readJ(path.join(batchDir(root, b), `item-${id}.json`));
const itemFiles = (root, b) => fs.readdirSync(batchDir(root, b)).filter((f) => f.startsWith('item-'));
const realIds = (root, b) => Object.entries(readKey(root, b).items).filter(([, e]) => !e.seed).map(([id]) => id);
const cardOfItem = (root, b, id) => readKey(root, b).items[id].card_id;
const wordsIn = (s) => s.split(/\s+/).filter(Boolean);

// ---- worlds ----
function intakeWorld(n = 3, o = {}) {
  const root = makeRoot(o);
  const cards = [];
  for (let i = 0; i < n; i += 1) {
    const word = 'w' + String(100 + i * 120).padStart(4, '0');
    cards.push(witnessedCard(root, 'I' + i, word, { value: 10 + i, baseline: 5 + i, approach: i % 2 ? 'a2' : 'a1', measure: i % 3 ? 'm2' : 'm1' }));
  }
  return { root, cards, sorted: byId(cards) };
}
function commitObjects(root, { task, step, objs }) {
  const outs = objs.map((o) => ({ id: o.id, kind: o.value.kind, sha256: o.sha })).sort((a, b) => (a.id < b.id ? -1 : 1));
  const rec = { schema_version: 1, task, step, epoch: 1, step_key: 'f'.repeat(64), outputs: outs, outputs_sha: sha(canon(outs)) };
  fs.writeFileSync(path.join(root, 'store', 'commits', `${task}.${step}.json`), canon(rec));
  return addLedger(root, 'commit', { step, outputs_sha: rec.outputs_sha, n: outs.length, git: null }, { task, epoch: 1 });
}
const SENT = (sid, cites, o = {}) => ({ sid, approach_id: 'a1', measure: 'm1', kind: o.kind ?? 'fact', text: 'synthetic sentence ' + sid, cites, applies_to: o.applies ?? { task: ['repair'] } });
function mkPack(root, o) {
  const p = putObj(root, { schema_version: 1, kind: 'pack', field: o.field ?? 'f1', questions_sha: sha('q'), cards: byId(o.cards).map((c) => c.id), conclusions: o.concl, not_covered: [] });
  commitObjects(root, { task: o.task ?? 'f1-research', step: 'pack', objs: [p, ...o.cards] });
  return p;
}
function mkReview(root, o) {
  const r = putObj(root, { schema_version: 1, kind: 'review', field: o.field ?? 'f1', task: o.task ?? 'f1-research', pack: o.pack, sentences: o.sentences, verdicts: [], dismissals: [], our_work_findings: [] });
  commitObjects(root, { task: o.task ?? 'f1-research', step: 'review', objs: [r] });
  return r;
}
// A frozen-pack world: two cited cards (the real items), `nPool` more witnessed cards for the seeds.
function freezeWorld(o = {}) {
  const root = makeRoot();
  const cards = [];
  const n = 2 + (o.nPool ?? 8);
  for (let i = 0; i < n; i += 1) {
    cards.push(witnessedCard(root, 'K' + i, 'w' + String(60 + i * 50).padStart(4, '0'), {
      value: 10 + i, baseline: o.noBaseline ? 'not stated' : 5 + i, approach: i % 2 ? 'a2' : 'a1', measure: i % 3 ? 'm2' : 'm1',
      conditions: { task: ['repair'], model_family: ['fam' + (i % 2)], language: ['py'] },
    }));
  }
  const cited = cards.slice(0, 2);
  const pack = mkPack(root, { cards, concl: [SENT('s1', cited.map((c) => c.id))] });
  return { root, cards, cited, pack };
}
const REAL = (root, b) => realIds(root, b);

// ---------------------------------------------------------------------------------------------

test('T1 intake, 3 witnessed cards, --batch-size 2: b1-1 has the first two by id, files match batch.json, the key and the ledger line agree', () => {
  const { root, sorted } = intakeWorld(3);
  const j = shape(cq(root, 'intake', ['--batch-size', '2', '--no-seeds']), 'check-queue', 0);
  assert.equal(j.result.batch, 'b1-1');
  assert.equal(j.result.n, 2);
  assert.equal(j.result.n_seeds, 0);
  const b = readBatch(root, 'b1-1');
  assert.equal(b.batch, 'b1-1');
  assert.equal(b.mode, 'intake');
  assert.equal(b.items.length, 2);
  assert.deepEqual(itemFiles(root, 'b1-1').sort(), b.items.map((id) => `item-${id}.json`).sort());
  const key = readKey(root, 'b1-1');
  assert.equal(key.batch, 'b1-1');
  assert.deepEqual(Object.keys(key.items).sort(), [...b.items].sort());
  for (const id of b.items) {
    assert.equal(key.items[id].seed, false);
    assert.ok(!('node' in key.items[id]), 'an intake item has no node');
  }
  assert.deepEqual(b.items.map((id) => key.items[id].card_id).sort(), [sorted[0].id, sorted[1].id].sort(), 'cards 1 and 2 by id order');
  const q = queueLines(root);
  assert.equal(q.length, 1);
  assert.equal(q[0].data.n, 2);
  assert.equal(q[0].data.n_seeds, 0);
  assert.equal(q[0].data.batch, 'b1-1');
  assert.deepEqual(j.ledger_seq, [q[0].seq]);
  verifyLedger(readLedger(root));
});

test('T2 an intake item file has exactly item, card, window; the card has no id and no status; the window holds the quote and about 200 words', () => {
  const { root, cards } = intakeWorld(3);
  shape(cq(root, 'intake', ['--no-seeds']), 'check-queue', 0);
  const b = readBatch(root, 'b1-1');
  for (const id of b.items) {
    const item = readItem(root, 'b1-1', id);
    assert.deepEqual(Object.keys(item).sort(), ['card', 'item', 'window']);
    assert.equal(item.item, id);
    const stored = cards.find((c) => c.id === cardOfItem(root, 'b1-1', id));
    assert.deepEqual(item.card, stored.value, 'the stored card object');
    assert.ok(!('id' in item.card) && !('status' in item.card));
    assert.ok(TEXT.includes(item.window), 'a substring of the stored text');
    const i = cards.indexOf(stored);
    assert.ok(item.window.includes('w' + String(100 + i * 120).padStart(4, '0')), 'holds the word at the offset');
    assert.ok(Math.abs(wordsIn(item.window).length - 200) <= 1, 'about window_words words: ' + wordsIn(item.window).length);
  }
});

test('T3 window clamping: the start of the text, the end, and a text shorter than the window', () => {
  assert.equal(windowAround('one two three', 5, 200), 'one two three');
  assert.equal(windowAround('  one two three  \n', 0, 200), 'one two three', 'from the first word start to the last word end');
  const w0 = windowAround(TEXT, 0, 200);
  assert.ok(w0.startsWith('w0001') && w0.endsWith('w0200'), 'first word: starts at word 0');
  const wEnd = windowAround(TEXT, at('w0600'), 200);
  assert.ok(wEnd.endsWith('w0600') && wEnd.startsWith('w0401'), 'last word: ends at the last word');
  const wMid = windowAround(TEXT, at('w0300'), 200);
  assert.equal(wordsIn(wMid).length, 200);
  assert.ok(wMid.includes('w0300') && wMid.startsWith('w0200') && wMid.endsWith('w0399'), 'centred: ' + wMid.slice(0, 12));
  const near = windowAround(TEXT, at('w0598'), 200);
  assert.ok(near.endsWith('w0600'));
  // offset inside a word, original text kept as is (line breaks included)
  assert.equal(windowAround('aa bb\ncc dd', 7, 2), 'bb\ncc');
  const root = makeRoot();
  const first = witnessedCard(root, 'first', 'w0001');
  const last = witnessedCard(root, 'last', 'w0600');
  const penult = witnessedCard(root, 'penult', 'w0599');
  shape(cq(root, 'intake', ['--no-seeds']), 'check-queue', 0);
  const by = {};
  for (const id of readBatch(root, 'b1-1').items) by[cardOfItem(root, 'b1-1', id)] = readItem(root, 'b1-1', id).window;
  assert.ok(by[first.id].startsWith('w0001') && by[first.id].endsWith('w0200'));
  assert.ok(by[last.id].endsWith('w0600') && by[last.id].startsWith('w0401'));
  assert.ok(by[penult.id].endsWith('w0600') && by[penult.id].startsWith('w0401'));
});

test('T4 seeds in freeze: at most one per class, each with class, operator, from_card outside the real items, s_ id; n_seeds equals the key; a failing precondition is skipped with its reason', () => {
  const { root, cited } = freezeWorld();
  const j = shape(cq(root, 'freeze'), 'check-queue', 0);
  const key = readKey(root, j.result.batch);
  const seeds = Object.values(key.items).filter((e) => e.seed);
  const realCards = Object.values(key.items).filter((e) => !e.seed).map((e) => e.card_id).sort();
  assert.deepEqual(realCards, byId(cited).map((c) => c.id), 'one real item per (fact sentence, cited card)');
  assert.equal(seeds.length, 8, 'every class is seedable here');
  assert.deepEqual(seeds.map((s) => s.class).sort(), [...CLASSES].sort(), 'one per class');
  for (const s of seeds) {
    assert.ok(OPERATORS[s.class].includes(s.operator), s.operator);
    assert.match(s.seed_id, /^s_[0-9a-f]{16}$/);
    assert.match(s.from_card, /^c_[0-9a-f]{16}$/);
    assert.ok(!realCards.includes(s.from_card), 'a seed is never made from a real item of its batch');
  }
  assert.equal(queueLines(root).at(-1).data.n_seeds, seeds.length);
  assert.equal(j.result.n_seeds, seeds.length);
  assert.equal(j.result.n, 10);
  assert.deepEqual(j.result.skipped, []);
  // no baseline anywhere: J1 is skipped with a reason
  const w = freezeWorld({ noBaseline: true });
  const j2 = shape(cq(w.root, 'freeze'), 'check-queue', 0);
  assert.ok(j2.result.skipped.some((s) => s.class === 'J1' && typeof s.reason === 'string' && s.reason.length > 0), JSON.stringify(j2.result.skipped));
  assert.ok(!Object.values(readKey(w.root, j2.result.batch).items).some((e) => e.seed && e.class === 'J1'));
});

test('T5 positions are random but reproducible: the same --rng-seed on a copy gives the same order, another seed another order; the seed is in the key and the ledger line', () => {
  const { root } = freezeWorld();
  const copy = fs.mkdtempSync(path.join(TMP, 'cq-copy-'));
  ROOTS.push(copy);
  fs.cpSync(root, copy, { recursive: true });
  const third = fs.mkdtempSync(path.join(TMP, 'cq-copy-'));
  ROOTS.push(third);
  fs.cpSync(root, third, { recursive: true });
  const a = shape(cq(root, 'freeze', ['--rng-seed', 'fixed-one']), 'check-queue', 0);
  shape(cq(copy, 'freeze', ['--rng-seed', 'fixed-one']), 'check-queue', 0);
  shape(cq(third, 'freeze', ['--rng-seed', 'fixed-two']), 'check-queue', 0);
  const A = readBatch(root, 'b1-1');
  assert.ok(fs.readFileSync(path.join(batchDir(root, 'b1-1'), 'batch.json')).equals(fs.readFileSync(path.join(batchDir(copy, 'b1-1'), 'batch.json'))), 'same seed, same batch.json');
  assert.notDeepEqual(readBatch(third, 'b1-1').items, A.items, 'another seed changes the order');
  assert.equal(readKey(root, 'b1-1').rng_seed, 'fixed-one');
  assert.equal(queueLines(root).at(-1).data.rng_seed, 'fixed-one');
  assert.equal(a.result.rng_seed, 'fixed-one');
  // the derived seed: <batch>:<first 16 hex of the ledger head hash>
  const { root: r2 } = freezeWorld();
  const head = readLedger(r2).at(-1).hash;
  shape(cq(r2, 'freeze'), 'check-queue', 0);
  assert.equal(readKey(r2, 'b1-1').rng_seed, 'b1-1:' + head.slice(0, 16));
});

test('T5b R42: the seeds sit at random positions among the real items, not after all of them', () => {
  const { root } = freezeWorld();
  let early = 0;
  const firstSeedAt = [];
  for (const [name, more] of [['one', []], ['two', ['--requeue']]]) {
    const j = shape(cq(root, 'freeze', ['--rng-seed', 'pos-' + name, ...more]), 'check-queue', 0);
    const key = readKey(root, j.result.batch);
    const order = readBatch(root, j.result.batch).items;
    assert.equal(order.length, 10);
    const isSeed = order.map((id) => key.items[id].seed);
    assert.equal(isSeed.filter(Boolean).length, 8);
    const lastReal = isSeed.lastIndexOf(false);
    firstSeedAt.push(isSeed.indexOf(true));
    if (isSeed.indexOf(true) < lastReal) early += 1;
  }
  assert.ok(early >= 1, 'with the shuffle gone every seed follows every real item; first seed positions: ' + firstSeedAt);
});

test('T6b R42/R43: the seeded items of one batch do not all carry one sentence: no single text or sid marks them', () => {
  const { root } = freezeWorld();
  const j = shape(cq(root, 'freeze', ['--rng-seed', 'sent-a']), 'check-queue', 0);
  const key = readKey(root, j.result.batch);
  const seeded = Object.entries(key.items).filter(([, e]) => e.seed).map(([id]) => readItem(root, j.result.batch, id).sentence);
  assert.equal(seeded.length, 8);
  assert.ok(new Set(seeded.map((x) => x.text)).size >= 3, 'phrasings in one batch: ' + new Set(seeded.map((x) => x.text)).size);
  assert.ok(new Set(seeded.map((x) => x.sid)).size >= 2, 'sids in one batch');
});

test('T6 opacity: no item file shows an s_ id, the word seed, a class or an operator name; real and seeded items have the same keys; sentences all or none', () => {
  const forbidden = [/s_[0-9a-f]{16}/, /seed/i, ...CLASSES.map((c) => new RegExp('\\b' + c + '\\b')), ...Object.values(OPERATORS).flat().map((o) => new RegExp(o))];
  const { root } = freezeWorld();
  const j = shape(cq(root, 'freeze'), 'check-queue', 0);
  const check = (batch, withSentence) => {
    const keySets = new Set();
    for (const f of itemFiles(root, batch)) {
      const text = fs.readFileSync(path.join(batchDir(root, batch), f), 'utf8');
      for (const re of forbidden) assert.doesNotMatch(text, re, `${f} shows ${re}`);
      const item = JSON.parse(text);
      keySets.add(Object.keys(item).sort().join(','));
      assert.equal('sentence' in item, withSentence, 'all items carry a sentence or none does');
      if (withSentence) assert.deepEqual(item.sentence.cites, []);
    }
    assert.equal(keySets.size, 1, 'one key set for real and seeded items: ' + [...keySets]);
    for (const txt of [fs.readFileSync(path.join(batchDir(root, batch), 'batch.json'), 'utf8')]) for (const re of forbidden.slice(0, 2)) assert.doesNotMatch(txt, re);
  };
  check(j.result.batch, true);
  const { root: ri } = intakeWorld(5);
  const ji = shape(cq(ri, 'intake', ['--batch-size', '1']), 'check-queue', 0);
  assert.ok(ji.result.skipped.some((s) => s.class === 'S4') && ji.result.skipped.some((s) => s.class === 'J3'), 'S4 and J3 are not seeded in intake: ' + JSON.stringify(ji.result.skipped));
  const keySets = new Set();
  for (const f of itemFiles(ri, ji.result.batch)) {
    const text = fs.readFileSync(path.join(batchDir(ri, ji.result.batch), f), 'utf8');
    for (const re of forbidden) assert.doesNotMatch(text, re, `${f} shows ${re}`);
    const item = JSON.parse(text);
    assert.ok(!('sentence' in item));
    keySets.add(Object.keys(item).sort().join(','));
  }
  assert.equal(keySets.size, 1);
  assert.ok(itemFiles(ri, ji.result.batch).length > 1, 'seeds were mixed in');
});

test('T7 item ids are i_ + 16 hex, distinct, equal on a re-created root, and not the seed id\'s text', () => {
  const a = freezeWorld();
  const b = freezeWorld();
  const ja = shape(cq(a.root, 'freeze', ['--rng-seed', 'same']), 'check-queue', 0);
  const jb = shape(cq(b.root, 'freeze', ['--rng-seed', 'same']), 'check-queue', 0);
  const ids = readBatch(a.root, ja.result.batch).items;
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^i_[0-9a-f]{16}$/);
  assert.deepEqual([...REAL(a.root, 'b1-1')].sort(), [...REAL(b.root, jb.result.batch)].sort(), 'the same batch and card give the same real item ids');
  assert.deepEqual(readBatch(a.root, 'b1-1'), readBatch(b.root, 'b1-1'));
  const key = readKey(a.root, 'b1-1');
  for (const [id, e] of Object.entries(key.items)) if (e.seed) assert.notEqual(id, 'i_' + e.seed_id.slice(2), 'not derived from the seed id text');
});

test('T8 post-review: unconfirmed witnessed pairs are queued, a rejected card is untrusted, a flagged sentence is queued for its confirmed card too, cites are [], nodes name the sentence', () => {
  const build = (flagged) => {
    const root = makeRoot();
    const A = witnessedCard(root, 'A', 'w0100');
    const B = witnessedCard(root, 'B', 'w0200');
    const C = witnessedCard(root, 'C', 'w0300');
    addStatus(root, B, 'confirmed', { reason: 'ok', check: { batch: 'b0-1', item: 'i_' + '1'.repeat(16), verdict: 'confirmed' }, classes: ['J1', 'J2', 'J4'] });
    addStatus(root, C, 'rejected', { reason: 'number_mismatch' });
    const pack = mkPack(root, { cards: [A, B, C], concl: [SENT('s1', [A.id])] });
    const review = mkReview(root, { pack: pack.id, sentences: [SENT('s1', [A.id, B.id]), SENT('s2', [B.id, C.id]), SENT('s3', [A.id], { kind: 'judgment' })] });
    if (flagged) addLedger(root, 'intake', { objects: [{ id: review.id, kind: 'review', origin: 'session' }], rejected: [], flagged: [{ id: review.id, sid: 's1', code: 'scope-outside' }] }, { task: 'f1-research', epoch: 1 });
    return { root, A, B, C, review };
  };
  {
    const { root, A, C, review } = build(false);
    const j = shape(cq(root, 'post-review', ['--no-seeds']), 'check-queue', 0);
    assert.equal(j.result.n, 1, 'only (s1, A) is a witnessed pair that is not confirmed');
    const key = readKey(root, j.result.batch);
    const [[id, e]] = Object.entries(key.items);
    assert.equal(e.card_id, A.id);
    assert.equal(e.node, `${review.id}#s1`);
    assert.deepEqual(readItem(root, j.result.batch, id).sentence.cites, []);
    assert.equal(readItem(root, j.result.batch, id).sentence.sid, 's1');
    assert.ok(JSON.stringify(j.result.untrusted).includes(C.id), 'the rejected card is listed untrusted: ' + JSON.stringify(j.result.untrusted));
    assert.ok(!Object.values(key.items).some((x) => x.card_id === C.id));
  }
  {
    const { root, A, B, review } = build(true);
    const j = shape(cq(root, 'post-review', ['--no-seeds']), 'check-queue', 0);
    const key = readKey(root, j.result.batch);
    const pairs = Object.values(key.items).map((e) => `${e.card_id}|${e.node}`).sort();
    assert.deepEqual(pairs, [`${A.id}|${review.id}#s1`, `${B.id}|${review.id}#s1`].sort(), 'the flagged sentence is queued for its confirmed card too');
    for (const id of Object.keys(key.items)) assert.deepEqual(readItem(root, j.result.batch, id).sentence.cites, []);
  }
  {
    const { root } = intakeWorld(2);
    shape(cq(root, 'intake', ['--no-seeds']), 'check-queue', 0);
    for (const e of Object.values(readKey(root, 'b1-1').items)) assert.ok(!('node' in e), 'intake items have no node');
  }
});

test('T8b a flag cleared by confirming sentence checks is not queued again; a witnessed pair in flight is skipped until --requeue or until its status line carries the batch', () => {
  {
    const root = makeRoot();
    const A = witnessedCard(root, 'A', 'w0100');
    const B = witnessedCard(root, 'B', 'w0200');
    const conf = (c) => addStatus(root, c, 'confirmed', { reason: 'ok', check: { batch: 'b0-1', item: 'i_' + sha(c.id).slice(0, 16), verdict: 'confirmed' }, classes: ['J1', 'J2', 'J4'] });
    conf(A);
    conf(B);
    const pack = mkPack(root, { cards: [A, B], concl: [SENT('s1', [A.id])] });
    const review = mkReview(root, { pack: pack.id, sentences: [SENT('s1', [A.id, B.id])] });
    addLedger(root, 'intake', { objects: [{ id: review.id, kind: 'review', origin: 'session' }], rejected: [], flagged: [{ id: review.id, sid: 's1', code: 'scope-dropped' }] }, { task: 'f1-research', epoch: 1 });
    const first = shape(cq(root, 'post-review', ['--no-seeds']), 'check-queue', 0);
    assert.equal(first.result.n, 2, 'the open flag queues both confirmed cards');
    const key = readKey(root, 'b1-1');
    for (const c of [A, B]) {
      const item = Object.entries(key.items).find(([, e]) => e.card_id === c.id)[0];
      addStatus(root, c, 'confirmed', { reason: 'sentence-check', check: { batch: 'b1-1', item, verdict: 'confirmed', node: `${review.id}#s1` }, classes: ['J1', 'J2', 'J3', 'J4'] });
    }
    const second = shape(cq(root, 'post-review', ['--no-seeds']), 'check-queue', 0);
    assert.equal(second.result.batch, null, 'the flag is cleared: ' + JSON.stringify(second.result));
    assert.equal(second.result.reason, 'nothing-to-check');
  }
  {
    const root = makeRoot();
    const A = witnessedCard(root, 'A', 'w0100');
    const pack = mkPack(root, { cards: [A], concl: [SENT('s1', [A.id])] });
    mkReview(root, { pack: pack.id, sentences: [SENT('s1', [A.id])] });
    const first = shape(cq(root, 'post-review', ['--no-seeds']), 'check-queue', 0);
    assert.equal(first.result.batch, 'b1-1');
    const none = shape(cq(root, 'post-review', ['--no-seeds']), 'check-queue', 0);
    assert.equal(none.result.batch, null, 'in flight');
    const again = shape(cq(root, 'post-review', ['--no-seeds', '--requeue']), 'check-queue', 0);
    assert.equal(again.result.batch, 'b1-2');
    assert.deepEqual(Object.values(readKey(root, 'b1-2').items).map((e) => e.card_id), [A.id]);
    const id = Object.keys(readKey(root, 'b1-1').items)[0];
    const node = Object.values(readKey(root, 'b1-1').items)[0].node;
    addStatus(root, A, 'witnessed', { reason: 'unclear', check: { batch: 'b1-1', item: id, verdict: 'unclear', node } });
    addStatus(root, A, 'witnessed', { reason: 'unclear', check: { batch: 'b1-2', item: id, verdict: 'unclear', node } });
    const later = shape(cq(root, 'post-review', ['--no-seeds']), 'check-queue', 0);
    assert.equal(later.result.batch, 'b1-3', 'answered and still unconfirmed: queued again');
  }
});

test('T9 freeze reads the pack of the latest commit line of the field, not an older one; --field excludes another field', () => {
  const root = makeRoot();
  const X = witnessedCard(root, 'X', 'w0100');
  const Y = witnessedCard(root, 'Y', 'w0200');
  const Z = witnessedCard(root, 'Z', 'w0300', { field: 'f2' });
  mkPack(root, { task: 'f1-research', cards: [X], concl: [SENT('s1', [X.id])] });
  mkPack(root, { task: 'f1-research-b', cards: [Y], concl: [SENT('s1', [Y.id])] });
  mkPack(root, { task: 'f2-research', field: 'f2', cards: [Z], concl: [SENT('s1', [Z.id])] });
  const j = shape(cq(root, 'freeze', ['--no-seeds', '--field', 'f1']), 'check-queue', 0);
  assert.deepEqual(Object.values(readKey(root, j.result.batch).items).map((e) => e.card_id), [Y.id], 'the pack of the highest commit seq, only field f1');
  const all = shape(cq(root, 'freeze', ['--no-seeds', '--requeue']), 'check-queue', 0);
  assert.deepEqual(Object.values(readKey(root, all.result.batch).items).map((e) => e.card_id).sort(), [Y.id, Z.id].sort(), 'without --field both fields; X (old pack) never');
  const f2 = shape(cq(root, 'freeze', ['--no-seeds', '--requeue', '--field', 'f2']), 'check-queue', 0);
  assert.deepEqual(Object.values(readKey(root, f2.result.batch).items).map((e) => e.card_id), [Z.id]);
});

test('T10 in flight: a second run skips the queued cards, a third finds nothing, --requeue includes them, a status line with check.batch removes them for good', () => {
  const { root, sorted } = intakeWorld(3);
  const j1 = shape(cq(root, 'intake', ['--batch-size', '2', '--no-seeds']), 'check-queue', 0);
  assert.equal(j1.result.batch, 'b1-1');
  const j2 = shape(cq(root, 'intake', ['--batch-size', '2', '--no-seeds']), 'check-queue', 0);
  assert.equal(j2.result.batch, 'b1-2');
  assert.deepEqual(Object.values(readKey(root, 'b1-2').items).map((e) => e.card_id), [sorted[2].id], 'only the card not yet queued');
  const j3 = shape(cq(root, 'intake', ['--no-seeds']), 'check-queue', 0);
  assert.equal(j3.result.batch, null);
  assert.equal(j3.result.reason, 'nothing-to-check');
  const j4 = shape(cq(root, 'intake', ['--no-seeds', '--requeue']), 'check-queue', 0);
  assert.equal(j4.result.batch, 'b1-3');
  assert.equal(j4.result.n, 3, 'everything in flight is queued again');
  for (const c of sorted) {
    addStatus(root, c, 'witnessed', { reason: 'unclear', check: { batch: 'b1-3', item: 'i_' + sha(c.id).slice(0, 16), verdict: 'unclear' } });
  }
  const j5 = shape(cq(root, 'intake', ['--no-seeds', '--requeue']), 'check-queue', 0);
  assert.equal(j5.result.batch, null, 'a status line carrying check.batch removes the card from the candidates');
  verifyLedger(readLedger(root));
});

test('T11 paraphrase: a card rejected number-without-quote is queued in intake with a window around number_offset; quote-missing is not', () => {
  const root = makeRoot();
  const P = putObj(root, mkCard({ tag: 'para' }));
  addStatus(root, P, 'rejected', { reason: 'number-without-quote' });
  addWitness(root, P, { result: 'rejected', reason: 'number-without-quote', numberOffset: at('w0450') });
  const Q = putObj(root, mkCard({ tag: 'miss' }));
  addStatus(root, Q, 'rejected', { reason: 'quote-missing' });
  addWitness(root, Q, { result: 'rejected', reason: 'quote-missing' });
  const j = shape(cq(root, 'intake', ['--no-seeds']), 'check-queue', 0);
  assert.equal(j.result.n, 1);
  const [[id, e]] = Object.entries(readKey(root, 'b1-1').items);
  assert.equal(e.card_id, P.id);
  const item = readItem(root, 'b1-1', id);
  assert.ok(item.window.includes('w0450'), 'window around number_offset');
  assert.ok(Math.abs(wordsIn(item.window).length - 200) <= 1);
});

test('T12 no candidates: exit 0, batch null, nothing-to-check, no queue folder, no ledger line, and the next real run is still batch 1', () => {
  const root = makeRoot();
  const before = snapshot(root);
  const j = shape(cq(root, 'intake'), 'check-queue', 0);
  assert.equal(j.result.batch, null);
  assert.equal(j.result.n, 0);
  assert.equal(j.result.reason, 'nothing-to-check');
  assert.deepEqual(snapshot(root), before);
  assert.deepEqual(fs.readdirSync(path.join(root, 'queue')), []);
  assert.deepEqual(j.ledger_seq, []);
  assert.equal(queueLines(root).length, 0);
  const c = witnessedCard(root, 'late', 'w0100');
  const next = shape(cq(root, 'intake', ['--no-seeds']), 'check-queue', 0);
  assert.equal(next.result.batch, 'b1-1');
  assert.ok(c);
});

test('T13 candidates without a readable window: exit 2 inputs-missing listing the card ids, nothing written', () => {
  {
    const root = makeRoot();
    const c = witnessedCard(root, 'gone', 'w0100');
    fs.rmSync(path.join(root, '.snapshots', 'text', TEXT_SHA));
    const before = snapshot(root);
    const j = shape(cq(root, 'intake', ['--no-seeds']), 'check-queue', 2);
    assertReason(j, 'inputs-missing');
    assert.ok(JSON.stringify(j.reasons).includes(c.id) || JSON.stringify(j.result).includes(c.id), 'the card id is listed');
    assert.deepEqual(snapshot(root), before);
  }
  {
    const root = makeRoot();
    const c = putObj(root, mkCard({ tag: 'nooffset' }));
    addStatus(root, c, 'witnessed');
    addWitness(root, c, {}); // a witness record without an offset
    const before = snapshot(root);
    const j = shape(cq(root, 'intake', ['--no-seeds']), 'check-queue', 2);
    assertReason(j, 'inputs-missing');
    assert.ok(JSON.stringify(j).includes(c.id));
    assert.deepEqual(snapshot(root), before);
  }
});

test('T14 crash safety: a batch without batch.json is ignored; the next run takes the next number and its cards are not in flight', () => {
  const { root, sorted } = intakeWorld(3);
  shape(cq(root, 'intake', ['--batch-size', '2', '--no-seeds']), 'check-queue', 0);
  fs.rmSync(path.join(batchDir(root, 'b1-1'), 'batch.json'));
  const j = shape(cq(root, 'intake', ['--batch-size', '2', '--no-seeds']), 'check-queue', 0);
  assert.equal(j.result.batch, 'b1-2', 'the next number');
  assert.deepEqual(Object.values(readKey(root, 'b1-2').items).map((e) => e.card_id).sort(), [sorted[0].id, sorted[1].id].sort(), 'the half-batch is not counted in flight');
  assert.ok(fs.existsSync(path.join(root, 'queue', 'b1-2', 'batch.json')));
});

test('T15 --dry-run: the same decisions with dry_run true, the planned batch, n and n_seeds; no file and no ledger line', () => {
  const { root } = freezeWorld();
  const before = snapshot(root);
  const j = shape(cq(root, 'freeze', ['--dry-run']), 'check-queue', 0);
  assert.equal(j.dry_run, true);
  assert.equal(j.result.dry_run, true);
  assert.equal(j.result.batch, 'b1-1');
  assert.equal(j.result.n, 10);
  assert.equal(j.result.n_seeds, 8);
  assert.deepEqual(j.ledger_seq, []);
  assert.deepEqual(snapshot(root), before);
  const real = shape(cq(root, 'freeze'), 'check-queue', 0);
  assert.equal(real.result.n, j.result.n);
  assert.equal(real.result.n_seeds, j.result.n_seeds);
});

test('T16 a stale --ce is 64, a busy lock is 75, nothing written; a bad or missing --mode, --batch-size abc: 66', { concurrency: false }, () => {
  {
    const { root } = intakeWorld(2);
    const before = snapshot(root);
    const j = shape(run('check-queue', ['--root', root, '--ce', '2', '--now', NOW, '--mode', 'intake'], root), 'check-queue', 64);
    assertReason(j, 'stale-ce');
    assert.deepEqual(snapshot(root), before);
  }
  {
    const { root } = intakeWorld(2, { params: { lock_retries: 3 } });
    const lock = holdLock(root);
    const before = snapshot(root);
    try {
      const j = shape(cq(root, 'intake'), 'check-queue', 75);
      assertReason(j, 'lock-busy');
    } finally { lock.release(); }
    assert.deepEqual(snapshot(root), before);
  }
  const { root } = intakeWorld(2);
  const before = snapshot(root);
  for (const argv of [
    ['--mode', 'sample'], [], ['--mode', 'intake', '--batch-size', 'abc'], ['--mode', 'intake', '--bogus', 'x'],
    ['--mode', 'intake', '--batch-size', '0'],
  ]) {
    const r = run('check-queue', ['--root', root, '--ce', '1', '--now', NOW, ...argv], root);
    assert.equal(r.exit, 66, argv.join(' ') + '\n' + r.stdout + r.stderr);
    if (r.json) assert.equal(r.json.code, 'usage');
  }
  assert.deepEqual(snapshot(root), before);
});

test('T17 a real candidate with an s_ id is a tamper: exit 3 seed-id, no batch written', () => {
  const root = makeRoot();
  const fake = { id: 's_' + 'ab12'.repeat(4), sha: sha('x') };
  addStatus(root, fake, 'witnessed');
  addWitness(root, fake, { quoteOffset: at('w0100') });
  witnessedCard(root, 'real', 'w0200');
  const j = shape(cq(root, 'intake', ['--no-seeds']), 'check-queue', 3);
  assertReason(j, 'seed-id');
  assert.deepEqual(fs.readdirSync(path.join(root, 'queue')), []);
  assert.deepEqual(fs.readdirSync(path.join(root, 'sealed', 'seeds')), []);
  const lines = readLedger(root);
  assert.equal(lines.filter((l) => l.kind === 'queue').length, 0);
  assert.ok(lines.every((l) => l.kind === 'incident'), 'at most the tamper incident line');
  for (const l of lines) assert.equal(l.data.detail.tamper, true);
  verifyLedger(lines);
});

test('T18 the ledger the script writes verifies, and its queue data is exactly batch, n, n_seeds, rng_seed', () => {
  const { root } = freezeWorld();
  shape(cq(root, 'freeze'), 'check-queue', 0);
  const lines = readLedger(root);
  verifyLedger(lines);
  const q = lines.filter((l) => l.kind === 'queue');
  assert.equal(q.length, 1);
  assert.deepEqual(Object.keys(q[0].data).sort(), ['batch', 'n', 'n_seeds', 'rng_seed']);
  assert.equal(q[0].writer, 'check-queue');
  assert.equal(q[0].ce, 1);
  assert.equal(q[0].ts, NOW);
});

test('T19 items are valid queue-item objects; a real item\'s card equals the stored card; a seed\'s card differs from its from_card only where its operator mutates', async () => {
  const { root, cards } = freezeWorld();
  const j = shape(cq(root, 'freeze'), 'check-queue', 0);
  const key = readKey(root, j.result.batch);
  const strip = {
    S1: (c) => ({ ...c, quote: '' }),
    S2: (c) => ({ ...c, measured: { ...c.measured, value: 0 } }),
    S3: (c) => ({ ...c, quote: '' }),
    J1: (c) => ({ ...c, measured: { ...c.measured, value: 0, baseline: 0 } }),
    J2: (c) => ({ ...c, conditions: {} }),
    J3: (c) => c,
    J4: (c) => ({ ...c, measured: { ...c.measured, value: 0 }, what_measured: '' }),
  };
  for (const [id, e] of Object.entries(key.items)) {
    const item = readItem(root, j.result.batch, id);
    await assert.doesNotReject(async () => checkFormat(root, 'queue-item', item), 'valid queue-item ' + id);
    if (!e.seed) {
      assert.deepEqual(item.card, cards.find((c) => c.id === e.card_id).value);
    } else if (e.class !== 'S4') {
      const from = cards.find((c) => c.id === e.from_card).value;
      assert.deepEqual(strip[e.class](item.card), strip[e.class](from), `${e.class} touches only its own fields`);
      if (e.class !== 'J3') assert.notDeepEqual(item.card, from, `${e.class} did change the card`);
    }
  }
});

test('T20 --classes J1 --classes J2 seeds only those; an unknown class is 66', () => {
  const { root } = freezeWorld();
  const j = shape(cq(root, 'freeze', ['--classes', 'J1', '--classes', 'J2']), 'check-queue', 0);
  const seeds = Object.values(readKey(root, j.result.batch).items).filter((e) => e.seed);
  assert.deepEqual(seeds.map((s) => s.class).sort(), ['J1', 'J2']);
  assert.equal(j.result.n_seeds, 2);
  const r = run('check-queue', ['--root', root, '--ce', '1', '--now', NOW, '--mode', 'freeze', '--classes', 'X9'], root);
  assert.equal(r.exit, 66, r.stdout + r.stderr);
});

test('T21 intake re-queue: a card reverted as unqualified is a candidate only once J1, J2 and J4 are all qualified', () => {
  const root = makeRoot();
  const c = witnessedCard(root, 'rev', 'w0100');
  addStatus(root, c, 'confirmed', { reason: 'ok', check: { batch: 'b0-1', item: 'i_' + '2'.repeat(16), verdict: 'confirmed' }, classes: ['J1', 'J2', 'J4'] });
  addStatus(root, c, 'witnessed', { reason: 'unqualified-revert', check: { batch: 'b0-1', item: 'i_' + '2'.repeat(16), verdict: 'confirmed' }, classes: ['J1'] });
  const qual = (j1) => fs.writeFileSync(path.join(root, 'store', 'qualification.json'), canon({
    schema_version: 1, updated_at: NOW, d0: 0.8, beta: 0.05, n_required: 14, batches: {},
    classes: { J1: { qualified: j1 }, J2: { qualified: true }, J3: { qualified: true }, J4: { qualified: true } }, result: 'not_run',
  }) + '\n');
  qual(false);
  const none = shape(cq(root, 'intake', ['--no-seeds']), 'check-queue', 0);
  assert.equal(none.result.batch, null, 'J1 is still unqualified');
  qual(true);
  const yes = shape(cq(root, 'intake', ['--no-seeds']), 'check-queue', 0);
  assert.equal(yes.result.batch, 'b1-1');
  assert.deepEqual(Object.values(readKey(root, 'b1-1').items).map((e) => e.card_id), [c.id]);
});

// ---------------------------------------------------------------------------------------------
// Needs the app (CONTRACT section 7): written and skipped, never faked
// ---------------------------------------------------------------------------------------------

test('needs the app: a checker started with Read only can read nothing but its batch folder', { skip: 'needs the app: harness permissions and hooks are not testable here (CONTRACT section 7 items 1 and 2)' }, () => {});
test('needs the app: real witness offsets and stored texts from real pages give sensible windows', { skip: 'needs the app: real pages and real witness offsets (CONTRACT section 7 items 7 and 10)' }, () => {});
test('needs the app: a real checker\'s detection varies with batch size', { skip: 'needs the app: a pilot parameter measured with real checker sessions, not a unit test' }, () => {});
