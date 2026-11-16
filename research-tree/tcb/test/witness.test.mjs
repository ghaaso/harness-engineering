// Tests of tcb/scripts/witness.mjs, written from spec/witness.mjs.md and CONTRACT.md only.
// Every test runs the script as a child process against a temporary run root the test builds:
// invented cards in store/objects, invented snapshots in .snapshots with correct hashes.
// The expected results of the text-matching behaviours (T2-T7, T21) live as data in
// tcb/fixtures/witness/<group>/cases.json and are run together as one corpus.
// Run: node --test tcb/test/witness.test.mjs
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const HERE = import.meta.dirname; // .../tcb-build/tcb/test
const TCB = path.resolve(HERE, '..');
const BUILD = path.resolve(TCB, '..');
const TMP = path.join(BUILD, 'tmp');
const SCRIPT = path.join(TCB, 'witness.mjs'); // flat build layout
const FIX = path.join(TCB, 'fixtures', 'witness');
const NOW = '2026-11-16T10:00:00.000Z';
const PS_EXE = 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';

// ---------------------------------------------------------------- small helpers

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const urlKey = (u) => sha256(new URL(u).href);

function canon(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (typeof v === 'object') {
    return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k.normalize('NFC')) + ':' + canon(v[k])).join(',') + '}';
  }
  if (typeof v === 'string') return JSON.stringify(v.normalize('NFC'));
  if (Object.is(v, -0)) return '0';
  return JSON.stringify(v);
}

const SLUG = { 0: 'ok', 1: 'fail', 2: 'not-run', 3: 'tamper', 64: 'stale-ce', 65: 'stale-epoch', 66: 'usage', 67: 'table-corrupt', 70: 'internal', 75: 'lock-busy' };

const BASE_THRESHOLDS = {
  delta_ms: 60000, coalesce_ticks: 2, stall_calls: 30, hang_ticks: 10, loop_k: 3, W_cc_ticks: 30, R: 1, H_max: 2,
  Z_frac: 0.1, stop_verify_deltas: 2, N_max: 2, N_ceiling: 3, peak_mb: 1200, reserve_mb: 1024, soft_frac: 0.8,
  hard_frac: 0.9, alarm_ms: 3600000, B_tokens: null, r_tokens: null, W_quality: 300000, W_star_coord: 133200,
  coord_over_factor: 1.5, W_star_child: null, lean_baseline_tokens: null, lean_tolerance_tokens: null,
  child_prefix_tokens: 60000, review_reserve_tokens: 75000, w_chars: 300, window_words: 200, d0: 0.8, beta: 0.05,
  plants_k: 3, plants_t: null, unverifiable_share_max: null, coverage_floor: null, unattributed_share_max: 0.1,
  blind_fail_rate: 0.8, batch_size: 12, index_words: 120, f5_given: false, fetch_max_bytes: 10485760,
  fetch_timeout_ms: 30000, fetch_max_redirects: 5, hook_deadline_ms: 5000, selftest_case_ms: 60000,
  sleep_gap_ms: 600000, lock_retries: 20, allow_loopback: false, proc_exe: PS_EXE, user_files: [],
  tcb_paths_protected: ['tcb/', 'sealed/', 'review-in/', '.claude/', 'run/', 'store/', '.git/'],
  weights: { read: 0.05, write: 1.25, out: 5 },
};

function writeThresholds(root, overrides = {}) {
  const params = {};
  const all = { ...BASE_THRESHOLDS, transcripts_root: path.join(root, 'transcripts').replace(/\\/g, '/'), ...overrides };
  for (const [name, value] of Object.entries(all)) {
    if (value === undefined) continue; // an override of undefined removes the parameter
    params[name] = { value, unit: 'test', source: 'guess', gate: false };
  }
  fs.mkdirSync(path.join(root, 'tcb'), { recursive: true });
  fs.writeFileSync(path.join(root, 'tcb', 'thresholds.json'), JSON.stringify({ schema_version: 1, params }));
}

function mkRoot({ thr = {}, ce = 1 } = {}) {
  fs.mkdirSync(TMP, { recursive: true });
  const root = fs.mkdtempSync(path.join(TMP, 'wit-'));
  for (const d of ['tcb', 'run', 'store/objects', 'store/status', 'plan', 'views', 'transcripts', '.snapshots/raw', '.snapshots/text', '.snapshots/meta', '.snapshots/by-url']) {
    fs.mkdirSync(path.join(root, d), { recursive: true });
  }
  const schemas = path.join(TCB, 'schemas');
  if (fs.existsSync(schemas)) fs.cpSync(schemas, path.join(root, 'tcb', 'schemas'), { recursive: true });
  writeThresholds(root, thr);
  if (ce !== null) {
    fs.writeFileSync(path.join(root, 'run', 'coord.json'), JSON.stringify({ schema_version: 1, ce, started_at: NOW, tcb_commit: '0'.repeat(40) }));
  }
  return root;
}

function rmRoot(root) {
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

function bareRoot() {
  fs.mkdirSync(TMP, { recursive: true });
  return fs.mkdtempSync(path.join(TMP, 'wib-'));
}

async function withRoot(opts, fn) {
  const root = mkRoot(opts);
  try {
    return await fn(root);
  } finally {
    rmRoot(root);
  }
}

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const readLines = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const witnessFile = (root) => path.join(root, 'store', 'witness.jsonl');
const ledgerFile = (root) => path.join(root, 'run', 'ledger.jsonl');
const witnessRecords = (root) => readLines(witnessFile(root));
const ledgerLines = (root) => readLines(ledgerFile(root));
const bytesOf = (p) => (fs.existsSync(p) ? fs.readFileSync(p) : null);

function verifyLedger(lines) {
  let prev = '0'.repeat(64);
  lines.forEach((l, i) => {
    assert.equal(l.seq, i + 1, 'ledger seq runs 1..n');
    assert.equal(l.prev, prev, 'ledger prev links');
    const { hash, ...rest } = l;
    assert.equal(sha256(prev + canon(rest)), hash, 'ledger hash recomputes at seq ' + l.seq);
    prev = hash;
  });
}

function makeCard({ url, quote, value = 'not stated', unit = 'n/a' }) {
  return {
    schema_version: 1, kind: 'card', field: 'f1', question_ids: ['f1-ab-01'], route: 'keyword',
    source: { url, canonical_id: 'invented:one', primary_id: 'invented:one', date: '2024-01-01', evidence_type: 'controlled' },
    quote,
    measured: { approach_id: 'ap1', measure: 'repair_time', value, unit, baseline: 'not stated', baseline_kind: 'none', better: 'lower', effect: 'improves' },
    conditions: { task: ['repair'], model_family: ['m1'], repo_size: 'n/a', language: ['en'], metric: 'minutes', other: 'invented' },
    what_measured: 'an invented measure',
  };
}

function addCard(root, spec) {
  const card = makeCard(spec);
  const bytes = canon(card);
  const full = sha256(bytes);
  const id = 'c_' + full.slice(0, 16);
  const file = path.join(root, 'store', 'objects', id + '.json');
  fs.writeFileSync(file, bytes);
  return { id, file, card, sha: full };
}

// A text snapshot with correct hashes and a by-url line (appended: a later call is a later retrieval).
function addTextSnapshot(root, url, text, { source_changed = false, tag = '' } = {}) {
  const textBytes = Buffer.from(text, 'utf8');
  const textSha = sha256(textBytes);
  const raw = Buffer.from(`raw bytes of ${url} ${tag} ${textSha}`, 'utf8');
  const rawSha = sha256(raw);
  const snap = path.join(root, '.snapshots');
  for (const d of ['raw', 'text', 'meta', 'by-url']) fs.mkdirSync(path.join(snap, d), { recursive: true });
  fs.writeFileSync(path.join(snap, 'raw', rawSha), raw);
  fs.writeFileSync(path.join(snap, 'text', textSha), textBytes);
  fs.writeFileSync(path.join(snap, 'meta', rawSha + '.json'), JSON.stringify({
    schema_version: 1, url, final_url: url, retrieved_at: NOW, http_status: 200, content_type: 'text/html', bytes: raw.length,
    raw_sha: rawSha, text_sha: textSha, extractor: 'html-v1',
  }));
  appendByUrl(root, url, { schema_version: 1, raw_sha: rawSha, retrieved_at: NOW, source_changed });
  return { rawSha, textSha, textFile: path.join(snap, 'text', textSha) };
}

// A snapshot whose bytes were stored but that has no text: reason pdf or empty-text.
function addNoTextSnapshot(root, url, reason) {
  const raw = Buffer.from(`raw ${reason} bytes of ${url}`, 'utf8');
  const rawSha = sha256(raw);
  const snap = path.join(root, '.snapshots');
  fs.mkdirSync(path.join(snap, 'raw'), { recursive: true });
  fs.mkdirSync(path.join(snap, 'meta'), { recursive: true });
  fs.writeFileSync(path.join(snap, 'raw', rawSha), raw);
  fs.writeFileSync(path.join(snap, 'meta', rawSha + '.json'), JSON.stringify({
    schema_version: 1, url, final_url: url, retrieved_at: NOW, http_status: 200,
    content_type: reason === 'pdf' ? 'application/pdf' : 'text/html', bytes: raw.length, raw_sha: rawSha, reason,
  }));
  appendByUrl(root, url, { schema_version: 1, raw_sha: rawSha, retrieved_at: NOW, source_changed: false });
  return { rawSha };
}

function appendByUrl(root, url, line) {
  const dir = path.join(root, '.snapshots', 'by-url');
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, urlKey(url) + '.jsonl'), JSON.stringify(line) + '\n');
}

const QUOTE = 'the pilot queue stayed short all week';
const GOOD_TEXT = `Notes from the pilot. ${QUOTE}, said the panel, with 12.5% fewer waits.`;

// A card that will be witnessed: its quote and number are in its snapshot.
function plantGood(root, name, { value = 12.5, unit = '%', text = GOOD_TEXT } = {}) {
  const url = `http://fixtures.test/${name}`;
  const card = addCard(root, { url, quote: QUOTE, value, unit });
  const snap = addTextSnapshot(root, url, text);
  return { ...card, url, ...snap };
}

function run(root, args, { timeoutMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], { cwd: root ?? TMP, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    const timer = setTimeout(() => child.kill(), timeoutMs); // our own child only
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timer);
      const lines = out.split(/\r?\n/).filter(Boolean);
      let json = null;
      try {
        json = JSON.parse(lines[lines.length - 1]);
      } catch { /* json stays null */ }
      resolve({ exit: code, json, stdout: out, stderr: err, lines });
    });
  });
}

const wit = (root, extra = [], opts, { ce = '1' } = {}) => run(root, ['--root', root, '--ce', ce, ...extra, '--now', NOW], opts);

function shape(r, exit) {
  assert.equal(r.lines.length, 1, 'exactly one stdout line, got: ' + JSON.stringify(r.stdout) + ' stderr: ' + r.stderr);
  const j = r.json;
  assert.ok(j && typeof j === 'object', 'stdout is JSON');
  assert.equal(r.exit, exit, `exit code (stderr: ${r.stderr.slice(0, 400)}) stdout: ${r.stdout.slice(0, 600)}`);
  assert.equal(j.script, 'witness');
  assert.equal(j.exit, exit);
  assert.equal(j.ok, exit === 0);
  assert.equal(j.code, SLUG[exit]);
  assert.equal(typeof j.dry_run, 'boolean');
  assert.ok(j.result && typeof j.result === 'object' && !Array.isArray(j.result), 'result is an object');
  assert.ok(Array.isArray(j.reasons), 'reasons is an array');
  for (const x of j.reasons) assert.equal(typeof x.code, 'string');
  assert.ok(Array.isArray(j.ledger_seq), 'ledger_seq is an array');
}

const hasReason = (r, code) => r.json.reasons.some((x) => x.code === code);
const recOf = (r, id) => r.json.result.records.find((x) => x.card_id === id);

function startTime(pid) {
  const r = spawnSync(PS_EXE, ['-NoProfile', '-NonInteractive', '-Command',
    `[Console]::OutputEncoding=[Text.Encoding]::UTF8; (Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CreationDate.ToUniversalTime().ToString('o')`],
  { encoding: 'utf8', windowsHide: true, shell: false, timeout: 30000 });
  const t = (r.stdout || '').trim();
  return /^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(t) ? t : null;
}

function spawnSleeper() {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore', windowsHide: true });
  return { pid: child.pid, start_time: startTime(child.pid), kill: () => child.kill() };
}

// ---------------------------------------------------------------- the data-driven corpus (T2-T7, T21)

function buildText(c) {
  return c.text_parts.map((p) => (typeof p === 'string' ? p : p.repeat.repeat(p.n))).join('');
}

function loadCases() {
  const cases = [];
  for (const group of ['basic', 'normalization']) {
    for (const c of readJson(path.join(FIX, group, 'cases.json')).cases) {
      cases.push({ group, name: c.name, text: buildText(c), quote: c.quote, value: c.value ?? 'not stated', unit: c.unit ?? 'n/a', expect: c.expect });
    }
  }
  const nv = readJson(path.join(FIX, 'number-variants', 'cases.json'));
  for (const c of nv.cases) {
    cases.push({ group: 'number-variants', name: c.name, text: nv.template.replace('{token}', c.token), quote: nv.quote, value: c.value, unit: c.unit, expect: c.expect });
  }
  return cases;
}

const idOf = (c) => (c.group === 'normalization' ? 'T4' : 'T' + c.name.match(/^t(\d+)/)[1]);

function nthIndex(text, needle, n = 0) {
  let at = -1;
  for (let i = 0; i <= n; i++) {
    at = text.indexOf(needle, at + 1);
    assert.notEqual(at, -1, 'fixture bug: ' + JSON.stringify(needle) + ' occurrence ' + n);
  }
  return at;
}

const CASES = loadCases();

// ---------------------------------------------------------------- tests

describe('witness.mjs: the corpus of invented texts', { concurrency: 1 }, () => {
  let C = null;
  before(async () => {
    const root = mkRoot();
    const byName = new Map();
    for (const c of CASES) {
      const url = `http://fixtures.test/${c.name}`;
      const card = addCard(root, { url, quote: c.quote, value: c.value, unit: c.unit });
      addTextSnapshot(root, url, c.text);
      byName.set(c.name, { c, card });
    }
    const r = await wit(root);
    C = { root, r, byName, stored: witnessRecords(root) };
  });
  after(() => { if (C) rmRoot(C.root); });

  it('T2 corpus run: some cards rejected, so exit 1 (precedence 1 over 0), one JSON line, one record per card', () => {
    shape(C.r, 1);
    assert.equal(C.r.json.result.records.length, CASES.length);
    assert.equal(C.stored.length, CASES.length);
    const expectRejected = CASES.filter((c) => c.expect.result === 'rejected').length;
    assert.equal(C.r.json.result.counts.rejected, expectRejected);
    assert.equal(C.r.json.result.counts.witnessed, CASES.length - expectRejected);
    assert.equal(C.r.json.result.counts.unverifiable, 0);
    verifyLedger(ledgerLines(C.root));
  });

  for (const c of CASES) {
    it(`${idOf(c)} ${c.name}: ${c.expect.result} / ${c.expect.reason}`, () => {
      const { card } = C.byName.get(c.name);
      const rec = C.stored.filter((x) => x.card_id === card.id).pop();
      assert.ok(rec, 'a witness record for the card');
      const fromRun = recOf(C.r, card.id);
      assert.equal(fromRun.result, c.expect.result);
      assert.equal(fromRun.reason, c.expect.reason);
      assert.equal(rec.result, c.expect.result);
      assert.equal(rec.reason, c.expect.reason);
      if ('number_bound' in c.expect) assert.equal(rec.number_bound, c.expect.number_bound);
      if (c.expect.quote_at !== undefined) {
        const want = nthIndex(c.text, c.expect.quote_at, c.expect.quote_at_nth ?? 0);
        assert.equal(rec.quote_offset, want, 'quote_offset is a UTF-16 index in the stored text');
      }
      if (c.expect.number_at !== undefined) {
        const nth = c.expect.number_at_nth ?? 0;
        assert.equal(rec.number_offset, nthIndex(c.text, c.expect.number_at, nth), 'number_offset is a UTF-16 index in the stored text');
      }
      if (c.expect.result === 'witnessed') assert.equal(rec.card_sha, card.sha);
    });
  }
});

describe('witness.mjs: one card, ledger and record shape', { concurrency: 1 }, () => {
  let S = null;
  before(async () => {
    const root = mkRoot();
    const c = CASES.find((x) => x.name === 't1-number-near');
    const url = 'http://fixtures.test/' + c.name;
    const card = addCard(root, { url, quote: c.quote, value: c.value, unit: c.unit });
    const snap = addTextSnapshot(root, url, c.text);
    const r = await wit(root);
    S = { root, r, c, card, snap };
  });
  after(() => { if (S) rmRoot(S.root); });

  it('T1 quote and 12.5% found: witnessed, ok, number_bound, offsets, exit 0, one witness and one check (pass) ledger line, ledger verifies', () => {
    const { r, root, c, card, snap } = S;
    shape(r, 0);
    assert.deepEqual(r.json.result.counts, { witnessed: 1, rejected: 0, unverifiable: 0 });
    assert.equal(r.json.result.skipped, 0);
    assert.equal(r.json.result.records.length, 1);
    assert.deepEqual([r.json.result.records[0].card_id, r.json.result.records[0].result, r.json.result.records[0].reason, r.json.result.records[0].seq], [card.id, 'witnessed', 'ok', 1]);
    const recs = witnessRecords(root);
    assert.equal(recs.length, 1);
    const rec = recs[0];
    assert.equal(rec.seq, 1);
    assert.equal(rec.card_id, card.id);
    assert.equal(rec.card_sha, card.sha, 'card_sha is the sha256 of the card\'s canonical bytes');
    assert.equal(rec.raw_sha, snap.rawSha);
    assert.equal(rec.text_sha, snap.textSha);
    assert.equal(rec.result, 'witnessed');
    assert.equal(rec.reason, 'ok');
    assert.equal(rec.number_bound, true);
    assert.equal(rec.source_changed, false);
    assert.equal(rec.w, 300);
    assert.equal(rec.at, NOW);
    assert.equal(rec.quote_offset, c.text.indexOf('The median repair'));
    assert.equal(rec.number_offset, c.text.indexOf('12.5%'));
    assert.ok(c.text.slice(rec.quote_offset).startsWith(c.quote));
    const lines = ledgerLines(root);
    verifyLedger(lines);
    assert.deepEqual(lines.map((l) => l.kind), ['witness', 'check']);
    assert.deepEqual(r.json.ledger_seq, [1, 2]);
    assert.equal(lines[0].writer, 'witness');
    assert.deepEqual(lines[0].data, { counts: { witnessed: 1, rejected: 0, unverifiable: 0 }, first_seq: 1, last_seq: 1 });
    assert.equal(lines[1].data.check, 'witness');
    assert.equal(lines[1].data.result, 'pass');
    assert.equal(lines[1].data.reasons.length, 1);
    assert.equal(lines[1].ce, 1);
  });

  it('T22 the check line\'s subject is "witness" and its first reason is range with the run\'s first and last seq, equal to the witness line\'s', () => {
    const lines = ledgerLines(S.root);
    const w = lines.find((l) => l.kind === 'witness');
    const c = lines.find((l) => l.kind === 'check');
    assert.equal(c.data.subject, 'witness');
    assert.equal(c.data.reasons[0].code, 'range');
    assert.deepEqual(c.data.reasons[0].detail, { cards: 1, first_seq: w.data.first_seq, last_seq: w.data.last_seq });
    assert.deepEqual([w.data.first_seq, w.data.last_seq], [1, 1]);
  });
});

describe('witness.mjs: behaviours with their own runs', { concurrency: 1 }, () => {
  it('T8 no by-url file: unverifiable no-snapshot; meta reason pdf: pdf; meta reason empty-text: empty-text; exit 2, check not_run', async () => {
    await withRoot({}, async (root) => {
      const none = addCard(root, { url: 'http://fixtures.test/none', quote: QUOTE, value: 12.5, unit: '%' });
      const pdfU = 'http://fixtures.test/pdf';
      const pdf = addCard(root, { url: pdfU, quote: QUOTE, value: 12.5, unit: '%' });
      addNoTextSnapshot(root, pdfU, 'pdf');
      const emptyU = 'http://fixtures.test/empty';
      const empty = addCard(root, { url: emptyU, quote: QUOTE, value: 12.5, unit: '%' });
      addNoTextSnapshot(root, emptyU, 'empty-text');
      const r = await wit(root);
      shape(r, 2);
      for (const [card, reason] of [[none, 'no-snapshot'], [pdf, 'pdf'], [empty, 'empty-text']]) {
        const rec = recOf(r, card.id);
        assert.equal(rec.result, 'unverifiable', reason);
        assert.equal(rec.reason, reason);
      }
      assert.deepEqual(r.json.result.counts, { witnessed: 0, rejected: 0, unverifiable: 3 });
      const lines = ledgerLines(root);
      verifyLedger(lines);
      assert.equal(lines.find((l) => l.kind === 'check').data.result, 'not_run');
      assert.deepEqual(lines.find((l) => l.kind === 'witness').data.counts, { witnessed: 0, rejected: 0, unverifiable: 3 });
      assert.equal(witnessRecords(root).length, 3);
    });
  });

  it('T8b other no-snapshot cases (only failed retrievals, meta or text file missing); the latest by-url line with bytes is used', async () => {
    await withRoot({}, async (root) => {
      const blockedU = 'http://fixtures.test/blocked';
      const blocked = addCard(root, { url: blockedU, quote: QUOTE, value: 12.5, unit: '%' });
      appendByUrl(root, blockedU, { schema_version: 1, raw_sha: null, retrieved_at: NOW, source_changed: false, reason: 'blocked' });
      const noMetaU = 'http://fixtures.test/nometa';
      const noMeta = addCard(root, { url: noMetaU, quote: QUOTE, value: 12.5, unit: '%' });
      const a = addTextSnapshot(root, noMetaU, GOOD_TEXT);
      fs.rmSync(path.join(root, '.snapshots', 'meta', a.rawSha + '.json'));
      const noTextU = 'http://fixtures.test/notext';
      const noText = addCard(root, { url: noTextU, quote: QUOTE, value: 12.5, unit: '%' });
      // A text of its own: GOOD_TEXT's text file is shared by sha with the later-failed card below,
      // whose snapshot would write the removed file back.
      const b = addTextSnapshot(root, noTextU, GOOD_TEXT + ' Copy without its text file.');
      fs.rmSync(b.textFile);
      const laterU = 'http://fixtures.test/later-failed';
      const later = addCard(root, { url: laterU, quote: QUOTE, value: 12.5, unit: '%' });
      addTextSnapshot(root, laterU, GOOD_TEXT);
      appendByUrl(root, laterU, { schema_version: 1, raw_sha: null, retrieved_at: NOW, source_changed: false, reason: 'blocked' });
      const r = await wit(root);
      shape(r, 2);
      for (const card of [blocked, noMeta, noText]) {
        assert.equal(recOf(r, card.id).result, 'unverifiable');
        assert.equal(recOf(r, card.id).reason, 'no-snapshot');
      }
      assert.equal(recOf(r, later.id).result, 'witnessed', 'a later failed retrieval does not hide the earlier stored text');
    });
  });

  it('T9 one rejected and one unverifiable card: exit 1, check line fail, reasons carry the slugs with their card ids', async () => {
    await withRoot({}, async (root) => {
      const rej = plantGood(root, 'rej', { value: 125 });
      const unv = addCard(root, { url: 'http://fixtures.test/unv', quote: QUOTE, value: 12.5, unit: '%' });
      const r = await wit(root);
      shape(r, 1);
      assert.equal(recOf(r, rej.id).reason, 'number-missing');
      assert.equal(recOf(r, unv.id).reason, 'no-snapshot');
      assert.deepEqual(r.json.result.counts, { witnessed: 0, rejected: 1, unverifiable: 1 });
      const lines = ledgerLines(root);
      verifyLedger(lines);
      const check = lines.find((l) => l.kind === 'check');
      assert.equal(check.data.result, 'fail');
      assert.equal(check.data.reasons[0].code, 'range');
      const codes = check.data.reasons.map((x) => x.code);
      assert.ok(codes.includes('number-missing') && codes.includes('no-snapshot'), JSON.stringify(codes));
      assert.ok(JSON.stringify(check.data.reasons.find((x) => x.code === 'number-missing').detail).includes(rej.id));
      assert.ok(JSON.stringify(check.data.reasons.find((x) => x.code === 'no-snapshot').detail).includes(unv.id));
    });
  });

  it('T10 default run twice with nothing changed: the second appends nothing, exit 0, skipped equals the card count; a new by-url line with new text witnesses that card again with source_changed true', async () => {
    await withRoot({}, async (root) => {
      const a = plantGood(root, 'a');
      const b = plantGood(root, 'b');
      shape(await wit(root), 0);
      assert.equal(witnessRecords(root).length, 2);
      const w1 = bytesOf(witnessFile(root));
      const l1 = bytesOf(ledgerFile(root));
      const r2 = await wit(root);
      shape(r2, 0);
      assert.equal(r2.json.result.skipped, 2);
      assert.deepEqual(r2.json.result.records, []);
      assert.deepEqual(r2.json.ledger_seq, []);
      assert.deepEqual(bytesOf(witnessFile(root)), w1, 'witness.jsonl unchanged');
      assert.deepEqual(bytesOf(ledgerFile(root)), l1, 'ledger unchanged');
      // a new retrieval with new text (the by-url line itself does not say the source changed)
      const fresh = addTextSnapshot(root, a.url, GOOD_TEXT + ' An extra sentence was added later.', { tag: 'second', source_changed: false });
      const r3 = await wit(root);
      shape(r3, 0);
      assert.equal(r3.json.result.skipped, 1);
      assert.equal(r3.json.result.records.length, 1);
      assert.equal(r3.json.result.records[0].card_id, a.id);
      const recs = witnessRecords(root);
      assert.equal(recs.length, 3);
      assert.equal(recs[2].card_id, a.id);
      assert.equal(recs[2].text_sha, fresh.textSha);
      assert.equal(recs[2].raw_sha, fresh.rawSha);
      assert.equal(recs[2].source_changed, true, 'the previous record named another text_sha');
      assert.equal(recs.filter((x) => x.card_id === b.id).length, 1);
      verifyLedger(ledgerLines(root));
    });
  });

  it('T10b the chosen by-url line saying source_changed makes the record say so', async () => {
    await withRoot({}, async (root) => {
      const a = plantGood(root, 'flagged');
      addTextSnapshot(root, a.url, GOOD_TEXT + ' More words here.', { tag: 'newer', source_changed: true });
      const r = await wit(root);
      shape(r, 0);
      assert.equal(witnessRecords(root)[0].source_changed, true);
      assert.equal(witnessRecords(root)[0].text_sha, sha256(Buffer.from(GOOD_TEXT + ' More words here.')), 'the latest line with bytes is chosen');
    });
  });

  it('T11 --card c_x --card c_x: one record; running it again appends a second record; ids are sorted', async () => {
    await withRoot({}, async (root) => {
      const a = plantGood(root, 'a');
      const b = plantGood(root, 'b');
      const r1 = await wit(root, ['--card', a.id, '--card', a.id]);
      shape(r1, 0);
      assert.equal(r1.json.result.records.length, 1);
      assert.equal(witnessRecords(root).length, 1);
      const r2 = await wit(root, ['--card', a.id]);
      shape(r2, 0);
      assert.equal(r2.json.result.skipped, 0);
      const recs = witnessRecords(root);
      assert.equal(recs.length, 2, 'an explicit run always records');
      assert.deepEqual(recs.map((x) => x.seq), [1, 2]);
      const [lo, hi] = [a.id, b.id].sort();
      const r3 = await wit(root, ['--card', hi, '--card', lo]);
      shape(r3, 0);
      assert.deepEqual(r3.json.result.records.map((x) => x.card_id), [lo, hi]);
      assert.deepEqual(witnessRecords(root).map((x) => x.seq), [1, 2, 3, 4]);
      verifyLedger(ledgerLines(root));
    });
  });

  it('T12 --card s_0123456789abcdef and --card nothex: exit 66 usage, nothing read or created', async () => {
    for (const bad of ['s_0123456789abcdef', 'nothex', 'c_0123456789abcde', 'c_0123456789ABCDEF']) {
      const root = bareRoot(); // empty: no coord.json, no thresholds: a read would fail differently
      try {
        const r = await run(root, ['--root', root, '--ce', '1', '--card', bad, '--now', NOW]);
        shape(r, 66);
        assert.ok(hasReason(r, 'usage'), bad + ' ' + JSON.stringify(r.json.reasons));
        assert.deepEqual(fs.readdirSync(root), [], bad);
      } finally {
        rmRoot(root);
      }
    }
  });

  it('T12b other bad command lines: unknown flag, malformed --now, missing --ce, missing --root: exit 66', async () => {
    for (const args of [
      (r) => ['--root', r, '--ce', '1', '--bogus'],
      (r) => ['--root', r, '--ce', '1', '--now', 'not-a-date'],
      (r) => ['--root', r],
      () => ['--ce', '1'],
    ]) {
      const root = bareRoot();
      try {
        const r = await run(root, args(root));
        shape(r, 66);
        assert.deepEqual(fs.readdirSync(root), []);
      } finally {
        rmRoot(root);
      }
    }
  });

  it('T-missing --card with a well-formed id that has no object: exit 2 missing, nothing written', async () => {
    await withRoot({}, async (root) => {
      const r = await wit(root, ['--card', 'c_0123456789abcdef']);
      shape(r, 2);
      assert.ok(hasReason(r, 'missing'), JSON.stringify(r.json.reasons));
      assert.ok(!fs.existsSync(witnessFile(root)));
      assert.ok(!fs.existsSync(ledgerFile(root)));
    });
  });

  it('T-param-missing thresholds without w_chars: exit 2 param-missing, nothing written', async () => {
    await withRoot({ thr: { w_chars: undefined } }, async (root) => {
      plantGood(root, 'a');
      const r = await wit(root);
      shape(r, 2);
      assert.ok(hasReason(r, 'param-missing'), JSON.stringify(r.json.reasons));
      assert.ok(!fs.existsSync(witnessFile(root)));
      assert.ok(!fs.existsSync(ledgerFile(root)));
    });
  });

  it('T13 a text file edited after storing (bytes no longer hash to its name): exit 3 snapshot-mismatch, no record written', async () => {
    await withRoot({}, async (root) => {
      const a = plantGood(root, 'a');
      fs.appendFileSync(a.textFile, ' edited afterwards');
      const r = await wit(root);
      shape(r, 3);
      assert.ok(hasReason(r, 'snapshot-mismatch'), JSON.stringify(r.json.reasons));
      assert.ok(!fs.existsSync(witnessFile(root)));
      assert.deepEqual(ledgerLines(root).filter((l) => l.kind === 'witness' || l.kind === 'check'), []);
    });
  });

  it('T14 a c_ object file edited: exit 3 object-mismatch, nothing written', async () => {
    await withRoot({}, async (root) => {
      const a = plantGood(root, 'a');
      plantGood(root, 'b');
      fs.appendFileSync(a.file, ' ');
      for (const extra of [[], ['--card', a.id]]) {
        const r = await wit(root, extra);
        shape(r, 3);
        assert.ok(hasReason(r, 'object-mismatch'), JSON.stringify(r.json.reasons));
      }
      assert.ok(!fs.existsSync(witnessFile(root)));
      assert.deepEqual(ledgerLines(root).filter((l) => l.kind === 'witness' || l.kind === 'check'), []);
    });
  });

  it('T15 a last witness record whose card_sha was altered: the new record is rejected card-changed, a tamper incident is appended, exit 3', async () => {
    await withRoot({}, async (root) => {
      const a = plantGood(root, 'a');
      shape(await wit(root, ['--card', a.id]), 0);
      const recs = witnessRecords(root);
      assert.equal(recs.length, 1);
      recs[0].card_sha = 'f'.repeat(64);
      fs.writeFileSync(witnessFile(root), recs.map((x) => JSON.stringify(x)).join('\n') + '\n');
      const r = await wit(root, ['--card', a.id]);
      shape(r, 3);
      assert.ok(hasReason(r, 'card-changed'), JSON.stringify(r.json.reasons));
      assert.equal(recOf(r, a.id).result, 'rejected');
      assert.equal(recOf(r, a.id).reason, 'card-changed');
      const after = witnessRecords(root);
      assert.equal(after.length, 2, 'the exit follows the write');
      assert.equal(after[1].result, 'rejected');
      assert.equal(after[1].reason, 'card-changed');
      assert.equal(after[1].card_sha, a.sha);
      assert.equal(after[1].seq, 2);
      const lines = ledgerLines(root);
      verifyLedger(lines);
      const inc = lines.filter((l) => l.kind === 'incident');
      assert.equal(inc.length, 1);
      assert.equal(inc[0].data.class, 'refusal');
      assert.deepEqual(inc[0].data.detail, { tamper: true, script: 'witness', code: 'card-changed' });
    });
  });

  it('T16 stale ce (--ce 2, coord ce 1): exit 64, witness.jsonl and the ledger unchanged', async () => {
    await withRoot({}, async (root) => {
      const a = plantGood(root, 'a');
      plantGood(root, 'b');
      shape(await wit(root, ['--card', a.id]), 0);
      const w = bytesOf(witnessFile(root));
      const l = bytesOf(ledgerFile(root));
      const r = await wit(root, [], {}, { ce: '2' });
      shape(r, 64);
      assert.deepEqual(bytesOf(witnessFile(root)), w);
      assert.deepEqual(bytesOf(ledgerFile(root)), l);
    });
  });

  it('T17 run.lock held by a live process the test spawned: exit 75, nothing appended', async (t) => {
    const sleeper = spawnSleeper();
    try {
      if (!sleeper.start_time) { t.skip('could not read the start time of the spawned process'); return; }
      await withRoot({ thr: { lock_retries: 3 } }, async (root) => {
        plantGood(root, 'a');
        const lockFile = path.join(root, 'run', 'run.lock');
        fs.writeFileSync(lockFile, JSON.stringify({ pid: sleeper.pid, start_time: sleeper.start_time, nonce: crypto.randomBytes(16).toString('hex'), script: 'test-sleeper', ce: 1, acquired_at: NOW }));
        const before = fs.readFileSync(lockFile, 'utf8');
        const r = await wit(root);
        shape(r, 75);
        assert.ok(hasReason(r, 'lock-busy'), JSON.stringify(r.json.reasons));
        assert.ok(!fs.existsSync(witnessFile(root)));
        assert.ok(!fs.existsSync(ledgerFile(root)));
        assert.equal(fs.readFileSync(lockFile, 'utf8'), before);
      });
    } finally {
      sleeper.kill();
    }
  });

  it('T18 witness.jsonl with a torn tail: the tail moves to .corrupt, seq continues from the last whole record; an unparseable tasks.json does not matter', async () => {
    await withRoot({}, async (root) => {
      const a = plantGood(root, 'a');
      const b = plantGood(root, 'b');
      shape(await wit(root, ['--card', a.id]), 0);
      const torn = '{"seq":2,"card_id":"c_12';
      fs.appendFileSync(witnessFile(root), torn);
      fs.writeFileSync(path.join(root, 'run', 'tasks.json'), 'this is not json at all');
      const r = await wit(root, ['--card', b.id]);
      shape(r, 0);
      assert.equal(fs.readFileSync(witnessFile(root) + '.corrupt', 'utf8'), torn);
      const raw = fs.readFileSync(witnessFile(root), 'utf8');
      assert.ok(raw.endsWith('\n'));
      const recs = raw.split('\n').filter(Boolean).map((l) => JSON.parse(l));
      assert.deepEqual(recs.map((x) => [x.seq, x.card_id]), [[1, a.id], [2, b.id]]);
      verifyLedger(ledgerLines(root));
    });
  });

  it('T19 run/coord.json corrupt: exit 67; missing: exit 2 no-coordinator', async () => {
    await withRoot({}, async (root) => {
      plantGood(root, 'a');
      fs.writeFileSync(path.join(root, 'run', 'coord.json'), '{not json');
      const r = await wit(root);
      shape(r, 67);
      assert.ok(!fs.existsSync(witnessFile(root)));
      fs.rmSync(path.join(root, 'run', 'coord.json'));
      const r2 = await wit(root);
      shape(r2, 2);
      assert.ok(hasReason(r2, 'no-coordinator'), JSON.stringify(r2.json.reasons));
      assert.ok(!fs.existsSync(witnessFile(root)));
      assert.ok(!fs.existsSync(ledgerFile(root)));
    });
  });

  it('T20 --dry-run: records printed with dry_run true, nothing written, no lock file', async () => {
    await withRoot({}, async (root) => {
      const a = plantGood(root, 'a');
      plantGood(root, 'b', { value: 125 });
      const r = await wit(root, ['--dry-run']);
      shape(r, 1); // the exit is the real run's: one card would be rejected
      assert.equal(r.json.dry_run, true);
      assert.equal(r.json.result.records.length, 2);
      assert.equal(recOf(r, a.id).result, 'witnessed');
      assert.ok(!fs.existsSync(witnessFile(root)));
      assert.ok(!fs.existsSync(ledgerFile(root)));
      assert.ok(!fs.existsSync(path.join(root, 'run', 'run.lock')));
      assert.deepEqual(r.json.ledger_seq, []);
    });
  });

  it('T-import the module can be imported without side effects and exports normalize, numberTokens and witnessCard', async () => {
    const root = bareRoot();
    try {
      const url = pathToFileURL(SCRIPT).href;
      const r = spawnSync(process.execPath, ['--input-type=module', '-e',
        `const m = await import(${JSON.stringify(url)}); console.log(JSON.stringify(['normalize', 'numberTokens', 'witnessCard'].map((n) => typeof m[n])));`],
      { cwd: root, encoding: 'utf8', windowsHide: true, shell: false, timeout: 60000 });
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stdout.trim(), '["function","function","function"]', 'nothing else printed on import');
      assert.deepEqual(fs.readdirSync(root), [], 'nothing written on import');
    } finally {
      rmRoot(root);
    }
  });

  it('needs the app: the share of honest cards whose reader saw only a fetch summary and whose quote is a paraphrase (G7), measured in the pilot', { skip: 'needs the app' }, () => {});
  it('needs the app: witnessing quotes from real pages', { skip: 'needs the app' }, () => {});
});
