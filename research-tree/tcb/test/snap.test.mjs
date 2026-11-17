// Tests of tcb/snap.mjs, written from spec/snap.mjs.md and CONTRACT.md only.
// Every test runs the script as a child process against its own temporary run root and, where it
// needs a web server, its own http.createServer on 127.0.0.1 (thresholds allow_loopback true).
// Run: node --test tcb/test/snap.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const HERE = import.meta.dirname; // .../tcb-build/tcb/test
const TCB = path.resolve(HERE, '..');
const BUILD = path.resolve(TCB, '..');
const TMP = path.join(BUILD, 'tmp');
const SCRIPT = path.join(TCB, 'snap.mjs'); // flat build layout
const FIX = path.join(TCB, 'fixtures', 'snap');
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
  blind_fail_rate: 0.8, batch_size: 12, index_words: 120, f5_given: true, fetch_max_bytes: 10485760,
  fetch_timeout_ms: 10000, fetch_max_redirects: 5, hook_deadline_ms: 5000, selftest_case_ms: 60000,
  sleep_gap_ms: 600000, lock_retries: 20, allow_loopback: true, proc_exe: PS_EXE, user_files: [],
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
  const root = fs.mkdtempSync(path.join(TMP, 'snp-'));
  for (const d of ['tcb', 'run', 'store/objects', 'store/status', 'plan', 'views', 'transcripts']) {
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
  return fs.mkdtempSync(path.join(TMP, 'snb-'));
}

function addCard(root, { url, quote = 'an invented quote of a few words' }) {
  const card = {
    schema_version: 1, kind: 'card', field: 'f1', question_ids: ['f1-ab-01'], route: 'keyword',
    source: { url, canonical_id: 'invented:one', primary_id: 'invented:one', date: '2024-01-01', evidence_type: 'controlled' },
    quote,
    measured: { approach_id: 'ap1', measure: 'repair_time', value: 12.5, unit: '%', baseline: 'not stated', baseline_kind: 'none', better: 'lower', effect: 'improves' },
    conditions: { task: ['repair'], model_family: ['m1'], repo_size: 'n/a', language: ['en'], metric: 'minutes', other: 'invented' },
    what_measured: 'an invented measure',
  };
  const bytes = canon(card);
  const id = 'c_' + sha256(bytes).slice(0, 16);
  const file = path.join(root, 'store', 'objects', id + '.json');
  fs.writeFileSync(file, bytes);
  return { id, file, card };
}

function ls(dir) {
  try {
    return fs.readdirSync(dir).sort();
  } catch {
    return [];
  }
}

function allFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of ls(d)) {
      const p = path.join(d, e);
      if (fs.statSync(p).isDirectory()) walk(p);
      else out.push(path.relative(dir, p).replace(/\\/g, '/'));
    }
  };
  walk(dir);
  return out;
}

const snapDir = (root, sub = '') => path.join(root, '.snapshots', sub);
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const readLines = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const byUrlFile = (root, url) => path.join(snapDir(root, 'by-url'), urlKey(url) + '.jsonl');
const byUrlLines = (root, url) => (fs.existsSync(byUrlFile(root, url)) ? readLines(byUrlFile(root, url)) : null);

function run(root, args, { env = {}, execArgv = [], timeoutMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...execArgv, SCRIPT, ...args], {
      cwd: root ?? TMP, windowsHide: true, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'],
    });
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

const snap = (root, extra, opts, { ce = '1' } = {}) => run(root, ['--root', root, '--ce', ce, ...extra, '--now', NOW], opts);

function shape(r, exit) {
  assert.equal(r.lines.length, 1, 'exactly one stdout line, got: ' + JSON.stringify(r.stdout) + ' stderr: ' + r.stderr);
  const j = r.json;
  assert.ok(j && typeof j === 'object', 'stdout is JSON');
  assert.equal(r.exit, exit, `exit code (stderr: ${r.stderr.slice(0, 400)}) stdout: ${r.stdout.slice(0, 600)}`);
  assert.equal(j.script, 'snap');
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
const urlRow = (r, url) => r.json.result.urls.find((u) => u.url_key === urlKey(url));

async function startServer(handler) {
  const requests = [];
  const sockets = new Set();
  const server = http.createServer((req, res) => {
    requests.push({ method: req.method, url: req.url, headers: req.headers });
    handler(req, res, requests.length);
  });
  server.on('connection', (s) => {
    sockets.add(s);
    s.on('close', () => sockets.delete(s));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  return {
    port, base: `http://127.0.0.1:${port}`, requests,
    close: () => new Promise((resolve) => {
      for (const s of sockets) s.destroy();
      server.close(() => resolve());
    }),
  };
}

const okText = (body = 'ok text from the invented server', type = 'text/plain') => (q, s) => {
  s.writeHead(200, { 'Content-Type': type });
  s.end(body);
};

async function scenario({ handler = okText(), thr = {}, ce = 1 } = {}, fn) {
  const srv = await startServer(handler);
  const root = mkRoot({ thr, ce });
  try {
    return await fn({ srv, root, base: srv.base });
  } finally {
    await srv.close();
    rmRoot(root);
  }
}

async function withRoot(opts, fn) {
  const root = mkRoot(opts);
  try {
    return await fn(root);
  } finally {
    rmRoot(root);
  }
}

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

function lockRecord(sleeper) {
  return { pid: sleeper.pid, start_time: sleeper.start_time, nonce: crypto.randomBytes(16).toString('hex'), script: 'test-sleeper', ce: 1, acquired_at: NOW };
}

const fixture = (name) => fs.readFileSync(path.join(FIX, name));

// ---------------------------------------------------------------- tests

describe('snap.mjs', { concurrency: 1 }, () => {
  it('T1 f5_given false: exit 2 f5-not-given, no request, .snapshots empty, urls listed', async () => {
    await scenario({ thr: { f5_given: false } }, async ({ srv, root, base }) => {
      const url = base + '/p';
      const r = await snap(root, ['--url', url]);
      shape(r, 2);
      assert.ok(hasReason(r, 'f5-not-given'), JSON.stringify(r.json.reasons));
      assert.equal(srv.requests.length, 0);
      assert.deepEqual(allFiles(snapDir(root)), []);
      assert.ok(Array.isArray(r.json.result.urls));
      assert.ok(urlRow(r, url), 'result.urls lists what would have been fetched');
    });
  });

  it('T2 html with script and style: raw equals served bytes, text holds visible words only, meta, one by-url line', async () => {
    const body = fixture('page-basic.html');
    await scenario({ handler: (q, s) => { s.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); s.end(body); } }, async ({ srv, root, base }) => {
      const url = base + '/page';
      const r = await snap(root, ['--url', url]);
      shape(r, 0);
      const rawSha = sha256(body);
      const row = urlRow(r, url);
      assert.ok(row, 'a result row for the url');
      assert.equal(row.raw_sha, rawSha);
      assert.equal(row.http_status, 200);
      assert.equal(row.created, true);
      assert.equal(row.source_changed, false);
      assert.deepEqual([r.json.result.n, r.json.result.n_text, r.json.result.n_unverifiable], [1, 1, 0]);
      assert.deepEqual(fs.readFileSync(path.join(snapDir(root, 'raw'), rawSha)), body);
      const textBytes = fs.readFileSync(path.join(snapDir(root, 'text'), row.text_sha));
      assert.equal(sha256(textBytes), row.text_sha, 'the text file is named by its sha256');
      const text = textBytes.toString('utf8');
      for (const w of ['Pilot notes', 'visible words only']) assert.ok(text.includes(w), 'text holds: ' + w);
      for (const w of ['secretscriptword', 'secretscripttitle', 'anotherscriptword', 'secretstyleword', 'hiddencommentword', 'noscriptword', 'templateword', 'svgword']) {
        assert.ok(!text.includes(w), 'text must not hold: ' + w);
      }
      const meta = readJson(path.join(snapDir(root, 'meta'), rawSha + '.json'));
      assert.equal(meta.http_status, 200);
      assert.equal(meta.extractor, 'html-v1');
      assert.equal(meta.bytes, body.length);
      assert.equal(meta.raw_sha, rawSha);
      assert.equal(meta.text_sha, row.text_sha);
      assert.equal(meta.url, url);
      assert.equal(meta.retrieved_at, NOW);
      assert.match(meta.content_type, /text\/html/);
      const lines = byUrlLines(root, url);
      assert.equal(lines.length, 1);
      assert.equal(lines[0].source_changed, false);
      assert.equal(lines[0].raw_sha, rawSha);
      assert.equal(lines[0].schema_version, 1);
      assert.equal(lines[0].retrieved_at, NOW);
      assert.ok(!fs.existsSync(path.join(root, 'run', 'ledger.jsonl')), 'snap writes no ledger line');
      assert.deepEqual(r.json.ledger_seq, []);
      const q = srv.requests[0];
      assert.equal(srv.requests.length, 1);
      assert.equal(q.method, 'GET');
      assert.equal(q.headers['user-agent'], 'tcb-snap/1');
      assert.ok(q.headers['accept'] && q.headers['accept-encoding'], 'Accept and Accept-Encoding are sent');
      assert.equal(q.headers['cookie'], undefined);
    });
  });

  it('T2b content decoding: raw is the body after gzip, deflate and br decoding', async () => {
    const html = (tag) => Buffer.from(`<html><body><p>decoded ${tag} body words</p></body></html>`);
    const enc = {
      '/gz': ['gzip', (b) => zlib.gzipSync(b)],
      '/df': ['deflate', (b) => zlib.deflateSync(b)],
      '/br': ['br', (b) => zlib.brotliCompressSync(b)],
    };
    await scenario({
      handler: (q, s) => {
        const [name, f] = enc[q.url];
        s.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Encoding': name });
        s.end(f(html(name)));
      },
    }, async ({ base }) => {
      for (const p of Object.keys(enc)) {
        await withRoot({}, async (root) => {
          const url = base + p;
          const r = await snap(root, ['--url', url]);
          shape(r, 0);
          const decoded = html(enc[p][0]);
          assert.deepEqual(fs.readFileSync(path.join(snapDir(root, 'raw'), sha256(decoded))), decoded, enc[p][0]);
          const text = fs.readFileSync(path.join(snapDir(root, 'text'), urlRow(r, url).text_sha), 'utf8');
          assert.ok(text.includes('decoded ' + enc[p][0] + ' body words'));
        });
      }
    });
  });

  it('T3 extraction: cells separated by a space, inline tags removed, entities decoded', async () => {
    const body = fixture('page-structure.html');
    await scenario({ handler: (q, s) => { s.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); s.end(body); } }, async ({ root, base }) => {
      const url = base + '/s';
      const r = await snap(root, ['--url', url]);
      shape(r, 0);
      const text = fs.readFileSync(path.join(snapDir(root, 'text'), urlRow(r, url).text_sha), 'utf8');
      assert.ok(text.includes('cellone celltwo'), JSON.stringify(text));
      assert.ok(text.includes('premidpost'), JSON.stringify(text));
      assert.ok(text.includes('amp & dash \u2013 em \u2014 end'), JSON.stringify(text));
      assert.ok(!/[ \t]{2,}/.test(text), 'runs of spaces and tabs are collapsed: ' + JSON.stringify(text));
      assert.ok(/first\s+second/.test(text), 'block tags separate words');
    });
  });

  it('T3b charset: header windows-1252, meta charset, and the UTF-8 default', async () => {
    const w1252 = Buffer.concat([Buffer.from('<html><body><p>start '), Buffer.from([0x93]), Buffer.from('quoted'), Buffer.from([0x94]), Buffer.from(' end</p></body></html>')]);
    const metaCs = Buffer.concat([Buffer.from('<html><head><meta charset="windows-1252"></head><body><p>start '), Buffer.from([0x93]), Buffer.from('quoted'), Buffer.from([0x94]), Buffer.from(' end</p></body></html>')]);
    const utf8 = Buffer.from('<html><body><p>caf\u00e9 au lait</p></body></html>', 'utf8');
    const pages = {
      '/h': [{ 'Content-Type': 'text/html; charset=windows-1252' }, w1252],
      '/m': [{ 'Content-Type': 'text/html' }, metaCs],
      '/u': [{ 'Content-Type': 'text/html' }, utf8],
    };
    await scenario({ handler: (q, s) => { const [h, b] = pages[q.url]; s.writeHead(200, h); s.end(b); } }, async ({ base }) => {
      const textOf = async (p) => withRoot({}, async (root) => {
        const url = base + p;
        const r = await snap(root, ['--url', url]);
        shape(r, 0);
        return fs.readFileSync(path.join(snapDir(root, 'text'), urlRow(r, url).text_sha), 'utf8');
      });
      assert.ok((await textOf('/h')).includes('\u201cquoted\u201d'), 'header charset windows-1252: 0x93 is a left double quote');
      assert.ok((await textOf('/m')).includes('\u201cquoted\u201d'), 'meta charset windows-1252');
      assert.ok((await textOf('/u')).includes('caf\u00e9 au lait'), 'UTF-8 default');
    });
  });

  it('T4 same url, same bytes twice: second run created false, no new files, source_changed false', async () => {
    await scenario({ handler: okText('<html><body><p>stable page words</p></body></html>', 'text/html') }, async ({ root, base }) => {
      const url = base + '/same';
      const r1 = await snap(root, ['--url', url]);
      shape(r1, 0);
      assert.equal(urlRow(r1, url).created, true);
      const before = allFiles(snapDir(root)).filter((f) => !f.startsWith('by-url/'));
      const r2 = await snap(root, ['--url', url]);
      shape(r2, 0);
      assert.equal(urlRow(r2, url).created, false);
      assert.equal(urlRow(r2, url).source_changed, false);
      assert.deepEqual(allFiles(snapDir(root)).filter((f) => !f.startsWith('by-url/')), before, 'no new raw, text or meta file');
      assert.equal(ls(snapDir(root, 'raw')).length, 1);
      assert.equal(ls(snapDir(root, 'text')).length, 1);
      const lines = byUrlLines(root, url);
      assert.equal(lines.length, 2);
      assert.equal(lines[1].source_changed, false);
      assert.equal(lines[0].raw_sha, lines[1].raw_sha);
    });
  });

  it('T5 same url, different bytes on the second fetch: two raw files, source_changed true, exit 0', async () => {
    await scenario({ handler: (q, s, n) => { s.writeHead(200, { 'Content-Type': 'text/html' }); s.end(`<html><body><p>version ${n} of the page</p></body></html>`); } }, async ({ root, base }) => {
      const url = base + '/moving';
      shape(await snap(root, ['--url', url]), 0);
      const r2 = await snap(root, ['--url', url]);
      shape(r2, 0);
      assert.equal(urlRow(r2, url).source_changed, true);
      assert.equal(ls(snapDir(root, 'raw')).length, 2);
      const lines = byUrlLines(root, url);
      assert.equal(lines.length, 2);
      assert.equal(lines[0].source_changed, false);
      assert.equal(lines[1].source_changed, true);
      assert.notEqual(lines[0].raw_sha, lines[1].raw_sha);
    });
  });

  it('T6 two urls serving identical bytes: one raw, one meta (the first url\'s), two by-url files', async () => {
    await scenario({ handler: okText('<html><body><p>shared body words</p></body></html>', 'text/html') }, async ({ root, base }) => {
      const u1 = base + '/one';
      const u2 = base + '/two';
      shape(await snap(root, ['--url', u1]), 0);
      shape(await snap(root, ['--url', u2]), 0);
      assert.equal(ls(snapDir(root, 'raw')).length, 1);
      assert.equal(ls(snapDir(root, 'meta')).length, 1);
      assert.equal(ls(snapDir(root, 'text')).length, 1);
      assert.equal(readJson(path.join(snapDir(root, 'meta'), ls(snapDir(root, 'meta'))[0])).url, u1);
      assert.equal(ls(snapDir(root, 'by-url')).length, 2);
      assert.equal(byUrlLines(root, u1).length, 1);
      assert.equal(byUrlLines(root, u2).length, 1);
      assert.equal(byUrlLines(root, u2)[0].source_changed, false);
    });
  });

  it('T7 pdf (application/pdf, and a %PDF- body sent as octet-stream): raw stored, reason pdf, no text, exit 2', async () => {
    const pdf = (tag) => Buffer.from(`%PDF-1.4\n% invented ${tag}\n1 0 obj\n<< >>\nendobj\n%%EOF\n`);
    await scenario({
      handler: (q, s) => {
        s.writeHead(200, { 'Content-Type': q.url === '/pdf' ? 'application/pdf' : 'application/octet-stream' });
        s.end(pdf(q.url));
      },
    }, async ({ base }) => {
      for (const p of ['/pdf', '/octet']) {
        await withRoot({}, async (root) => {
          const url = base + p;
          const r = await snap(root, ['--url', url]);
          shape(r, 2);
          assert.ok(hasReason(r, 'unverifiable'), JSON.stringify(r.json.reasons));
          const rawSha = sha256(pdf(p));
          assert.ok(fs.existsSync(path.join(snapDir(root, 'raw'), rawSha)), 'raw stored: ' + p);
          assert.equal(readJson(path.join(snapDir(root, 'meta'), rawSha + '.json')).reason, 'pdf');
          assert.equal(urlRow(r, url).reason, 'pdf');
          assert.deepEqual(ls(snapDir(root, 'text')), [], 'no text file');
          assert.equal(r.json.result.n_unverifiable, 1);
        });
      }
    });
  });

  it('T8 html of only tags and whitespace (and whitespace-only text/plain): reason empty-text, no text file, exit 2', async () => {
    const empty = fixture('page-empty.html');
    await scenario({
      handler: (q, s) => {
        if (q.url === '/plain') { s.writeHead(200, { 'Content-Type': 'text/plain' }); s.end('   \n\t  \n'); return; }
        s.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        s.end(empty);
      },
    }, async ({ base }) => {
      for (const p of ['/html', '/plain']) {
        await withRoot({}, async (root) => {
          const url = base + p;
          const r = await snap(root, ['--url', url]);
          shape(r, 2);
          assert.equal(urlRow(r, url).reason, 'empty-text');
          assert.deepEqual(ls(snapDir(root, 'text')), [], 'no text file');
          const metas = ls(snapDir(root, 'meta'));
          assert.equal(metas.length, 1, 'raw bytes and their meta are kept');
          const meta = readJson(path.join(snapDir(root, 'meta'), metas[0]));
          assert.equal(meta.reason, 'empty-text');
          assert.equal(meta.text_sha, undefined);
        });
      }
    });
  });

  it('T9 blocked (401 403 407 429 451) and http-error (404 500 503): no raw file, by-url line with raw_sha null and the reason, exit 2', async () => {
    const table = [[401, 'blocked'], [403, 'blocked'], [407, 'blocked'], [429, 'blocked'], [451, 'blocked'], [404, 'http-error'], [500, 'http-error'], [503, 'http-error']];
    await scenario({
      handler: (q, s) => {
        const code = Number(q.url.split('/').pop());
        s.writeHead(code, { 'Content-Type': 'text/html' });
        s.end('<html><body>an invented refusal page with words</body></html>');
      },
    }, async ({ base }) => {
      await Promise.all(table.map(([code, reason]) => withRoot({}, async (root) => {
        const url = base + '/status/' + code;
        const r = await snap(root, ['--url', url]);
        shape(r, 2);
        assert.equal(urlRow(r, url).reason, reason, 'status ' + code);
        assert.equal(urlRow(r, url).http_status, code);
        assert.deepEqual(ls(snapDir(root, 'raw')), [], 'no raw file for ' + code);
        assert.deepEqual(ls(snapDir(root, 'text')), []);
        const lines = byUrlLines(root, url);
        assert.equal(lines.length, 1);
        assert.equal(lines[0].raw_sha, null);
        assert.equal(lines[0].reason, reason);
      })));
    });
  });

  it('T10 a body above fetch_max_bytes (1024) and a gzip body inflating past it: too-large, nothing stored, exit 2', async () => {
    const exact = ('word '.repeat(210)).slice(0, 1024);
    await scenario({
      thr: { fetch_max_bytes: 1024 },
      handler: (q, s) => {
        if (q.url === '/big') { s.writeHead(200, { 'Content-Type': 'text/plain' }); s.end('abcdefgh '.repeat(600)); return; }
        if (q.url === '/gz') { s.writeHead(200, { 'Content-Type': 'text/plain', 'Content-Encoding': 'gzip' }); s.end(zlib.gzipSync(Buffer.from('a'.repeat(200000)))); return; }
        s.writeHead(200, { 'Content-Type': 'text/plain' });
        s.end(exact);
      },
    }, async ({ base }) => {
      for (const p of ['/big', '/gz']) {
        await withRoot({ thr: { fetch_max_bytes: 1024 } }, async (root) => {
          const url = base + p;
          const r = await snap(root, ['--url', url]);
          shape(r, 2);
          assert.equal(urlRow(r, url).reason, 'too-large', p);
          assert.deepEqual(allFiles(snapDir(root)).filter((f) => !f.startsWith('by-url/')), [], 'nothing stored: ' + p);
          const lines = byUrlLines(root, url);
          assert.equal(lines[0].raw_sha, null);
          assert.equal(lines[0].reason, 'too-large');
        });
      }
      await withRoot({ thr: { fetch_max_bytes: 1024 } }, async (root) => {
        const r = await snap(root, ['--url', base + '/exact']);
        shape(r, 0); // exactly the cap is not above it
      });
    });
  });

  it('T11 a server that never answers, fetch_timeout_ms 200: timeout, exit 2, the run ends promptly', async () => {
    await scenario({ thr: { fetch_timeout_ms: 200 }, handler: () => { /* never answers */ } }, async ({ root, base }) => {
      const url = base + '/hang';
      const t0 = Date.now();
      const r = await snap(root, ['--url', url]);
      shape(r, 2);
      assert.equal(urlRow(r, url).reason, 'timeout');
      assert.ok(Date.now() - t0 < 30000, 'ended promptly');
      assert.deepEqual(allFiles(snapDir(root)).filter((f) => !f.startsWith('by-url/')), []);
    });
  });

  it('T11b one deadline covers the body: headers sent, body never finished: timeout', async () => {
    await scenario({
      thr: { fetch_timeout_ms: 300 },
      handler: (q, s) => { s.writeHead(200, { 'Content-Type': 'text/plain' }); s.write('partial body words '); /* never ends */ },
    }, async ({ root, base }) => {
      const url = base + '/slow';
      const r = await snap(root, ['--url', url]);
      shape(r, 2);
      assert.equal(urlRow(r, url).reason, 'timeout');
      assert.deepEqual(ls(snapDir(root, 'raw')), []);
    });
  });

  it('T12 six chained redirects with fetch_max_redirects 5: too-many-redirects, exit 2; five are followed', async () => {
    let total = 6;
    await scenario({
      thr: { fetch_max_redirects: 5 },
      handler: (q, s) => {
        const k = Number(q.url.slice(2));
        if (k < total) {
          s.writeHead(302, { Location: `http://${q.headers.host}/r${k + 1}` });
          s.end();
          return;
        }
        s.writeHead(200, { 'Content-Type': 'text/plain' });
        s.end('arrived at the end of the chain');
      },
    }, async ({ root, base }) => {
      total = 6;
      const r = await snap(root, ['--url', base + '/r0']);
      shape(r, 2);
      assert.equal(urlRow(r, base + '/r0').reason, 'too-many-redirects');
      assert.deepEqual(ls(snapDir(root, 'raw')), []);
      total = 5;
      await withRoot({}, async (root2) => {
        const r2 = await snap(root2, ['--url', base + '/r0']);
        shape(r2, 0);
        assert.equal(r2.json.result.urls[0].http_status, 200);
        assert.equal(readJson(path.join(snapDir(root2, 'meta'), ls(snapDir(root2, 'meta'))[0])).final_url, base + '/r5');
      });
    });
  });

  it('T13 allow_loopback false and a url on 127.0.0.1 (or localhost): private-address, the server gets no request', async () => {
    await scenario({ thr: { allow_loopback: false } }, async ({ srv, root, base }) => {
      const r = await snap(root, ['--url', base + '/x']);
      shape(r, 2);
      assert.equal(urlRow(r, base + '/x').reason, 'private-address');
      const lh = `http://localhost:${srv.port}/x`;
      const r2 = await snap(root, ['--url', lh]);
      shape(r2, 2);
      assert.equal(urlRow(r2, lh).reason, 'private-address');
      assert.equal(srv.requests.length, 0);
      assert.deepEqual(allFiles(snapDir(root)).filter((f) => !f.startsWith('by-url/')), []);
    });
  });

  it('T14 a redirect to http://10.0.0.1/: private-address, no further request from the test server; mapped loopback refused when loopback is off', async () => {
    await scenario({ handler: (q, s) => { s.writeHead(302, { Location: 'http://10.0.0.1/' }); s.end(); } }, async ({ srv, root, base }) => {
      const t0 = Date.now();
      const r = await snap(root, ['--url', base + '/go']);
      shape(r, 2);
      assert.equal(urlRow(r, base + '/go').reason, 'private-address');
      assert.equal(srv.requests.length, 1);
      assert.ok(Date.now() - t0 < 30000, 'refused at once, not after a connect timeout');
    });
    await scenario({ thr: { allow_loopback: false } }, async ({ srv, root }) => {
      const url = `http://[::ffff:127.0.0.1]:${srv.port}/mapped`;
      const r = await snap(root, ['--url', url]);
      shape(r, 2);
      assert.equal(urlRow(r, url).reason, 'private-address');
      assert.equal(srv.requests.length, 0);
    });
  });

  it('T14 address filter table: every listed range is refused as private-address, with no request', async () => {
    const refused = [
      'http://10.1.2.3/', 'http://100.64.0.1/', 'http://198.18.0.1/', 'http://0.0.0.0/', 'http://255.255.255.255/',
      'http://[::ffff:10.0.0.1]/', 'http://[64:ff9b::a00:1]/', 'http://[2002:a00:1::]/', 'http://[fd00::1]/', 'http://[fe80::1]/',
      // more members of the listed ranges
      'http://169.254.169.254/', 'http://192.168.1.1/', 'http://172.16.0.1/', 'http://172.31.255.255/', 'http://192.0.2.7/',
      'http://203.0.113.9/', 'http://224.0.0.1/', 'http://[::]/', 'http://[ff02::1]/', 'http://[2001:db8::1]/',
      'http://[::ffff:192.168.0.1]/', 'http://[2002:c0a8:1::]/', 'http://[64:ff9b::c0a8:1]/',
    ];
    await withRoot({ thr: { allow_loopback: true, fetch_timeout_ms: 3000 } }, async (root) => {
      for (const u of refused) addCard(root, { url: u, quote: 'quote for ' + u });
      const r = await snap(root, ['--new']);
      shape(r, 2);
      assert.equal(r.json.result.urls.length, refused.length);
      for (const u of refused) {
        const row = urlRow(r, u);
        assert.ok(row, 'a row for ' + u);
        assert.equal(row.reason, 'private-address', u);
        assert.equal(row.raw_sha, undefined);
      }
      assert.deepEqual(ls(snapDir(root, 'raw')), []);
    });
  });

  // The spec asks for this half "with no network": it calls the exported filter (addressAllowed,
  // named in the builder's notes) directly; importing snap.mjs runs nothing.
  it('T14 allowed addresses 93.184.216.34 and [2606:2800:220:1::] pass the filter (direct call, no network)', async () => {
    const mod = await import(pathToFileURL(SCRIPT).href);
    assert.equal(typeof mod.addressAllowed, 'function', 'snap.mjs exports addressAllowed');
    for (const a of ['93.184.216.34', '[2606:2800:220:1::]', '2606:2800:220:1::']) {
      assert.equal(mod.addressAllowed(a, { allowLoopback: false }), true, a + ' is allowed');
    }
    for (const a of ['10.1.2.3', '100.64.0.1', '198.18.0.1', '0.0.0.0', '255.255.255.255', '[::ffff:10.0.0.1]',
      '[64:ff9b::a00:1]', '[2002:a00:1::]', '[fd00::1]', '[fe80::1]', '127.0.0.1', '[::1]', '[::ffff:127.0.0.1]']) {
      assert.equal(mod.addressAllowed(a, { allowLoopback: false }), false, a + ' is refused');
    }
    for (const a of ['127.0.0.1', '[::1]', '[::ffff:127.0.0.1]']) {
      assert.equal(mod.addressAllowed(a, { allowLoopback: true }), true, a + ' is allowed only with allow_loopback');
    }
    assert.equal(mod.addressAllowed('10.1.2.3', { allowLoopback: true }), false, 'allow_loopback opens loopback only');
  });

  it('T14b every request has its own http.Agent (not the global agent, keepAlive false) whose lookup answers only the checked address', async () => {
    await scenario({
      handler: (q, s) => {
        if (q.url === '/start') { s.writeHead(302, { Location: `http://${q.headers.host}/final` }); s.end(); return; }
        s.writeHead(200, { 'Content-Type': 'text/plain' });
        s.end('the final page words');
      },
    }, async ({ srv, root, base }) => {
      const out = path.join(root, 'spy.jsonl');
      const r = await snap(root, ['--url', base + '/start'], {
        execArgv: ['--import', pathToFileURL(path.join(FIX, 'spy-net.mjs')).href],
        env: { SNAP_SPY_OUT: out },
      });
      shape(r, 0);
      assert.equal(srv.requests.length, 2);
      await new Promise((resolve) => setTimeout(resolve, 200));
      const spy = readLines(out);
      const reqs = spy.filter((x) => x.kind === 'request');
      assert.ok(reqs.length >= 2, 'a request call per hop');
      assert.equal(spy.filter((x) => x.kind === 'fetch').length, 0, 'no global fetch');
      const seen = new Set();
      for (const q of reqs) {
        assert.equal(q.agentPresent, true, 'each request names an agent');
        assert.equal(q.agentIsGlobal, false, 'not the global agent');
        assert.equal(q.agentIsInstance, true);
        assert.equal(q.keepAlive, false);
        assert.equal(q.hasLookup, true, 'the agent carries its own lookup');
        seen.add(q.req);
      }
      const answers = spy.filter((x) => x.kind === 'lookup-answer');
      assert.ok(answers.length >= 2 * reqs.length, 'the lookup of each agent was probed');
      for (const a of answers) {
        assert.equal(a.err, null);
        const addrs = Array.isArray(a.address) ? a.address.map((x) => x.address) : [a.address];
        assert.deepEqual(addrs, ['127.0.0.1'], 'lookup answers only the checked address, whatever it is asked');
      }
    });
  });

  it('T15 --url ftp://x/ and file:///c:/x: bad-scheme, no network use, exit 2', async () => {
    await withRoot({}, async (root) => {
      for (const url of ['ftp://x/', 'file:///c:/x']) {
        const out = path.join(root, 'spy-' + sha256(url).slice(0, 6) + '.jsonl');
        const r = await snap(root, ['--url', url], { execArgv: ['--import', pathToFileURL(path.join(FIX, 'spy-net.mjs')).href], env: { SNAP_SPY_OUT: out } });
        shape(r, 2);
        assert.equal(urlRow(r, url).reason, 'bad-scheme', url);
        const spy = fs.existsSync(out) ? readLines(out) : [];
        assert.deepEqual(spy.filter((x) => ['request', 'dns', 'fetch'].includes(x.kind)), [], 'no request, lookup or fetch for ' + url);
        const lines = byUrlLines(root, url);
        assert.equal(lines.length, 1);
        assert.equal(lines[0].raw_sha, null);
        assert.equal(lines[0].reason, 'bad-scheme');
      }
      assert.deepEqual(ls(snapDir(root, 'raw')), []);
    });
  });

  it('T16 no Cookie is sent: not on the redirect hop after a Set-Cookie, not on a later run', async () => {
    await scenario({
      handler: (q, s) => {
        if (q.url === '/a') { s.writeHead(302, { Location: `http://${q.headers.host}/b`, 'Set-Cookie': 'sid=abc123; Path=/' }); s.end(); return; }
        s.writeHead(200, { 'Content-Type': 'text/plain', 'Set-Cookie': 'sid=def456; Path=/' });
        s.end('page body words after the cookie');
      },
    }, async ({ srv, root, base }) => {
      shape(await snap(root, ['--url', base + '/a']), 0);
      assert.equal(srv.requests.length, 2);
      assert.equal(srv.requests[1].url, '/b');
      assert.equal(srv.requests[1].headers['cookie'], undefined, 'second hop');
      shape(await snap(root, ['--url', base + '/b']), 0);
      shape(await snap(root, ['--url', base + '/b']), 0);
      for (const q of srv.requests) assert.equal(q.headers['cookie'], undefined, q.url);
    });
  });

  it('T17 --new: two cards citing one url, one card citing another that already has a by-url file: one request, for the untried url', async () => {
    await scenario({}, async ({ srv, root, base }) => {
      const a = base + '/untried';
      const b = base + '/tried';
      addCard(root, { url: a, quote: 'first quote citing the untried page' });
      addCard(root, { url: a, quote: 'second quote citing the untried page' });
      addCard(root, { url: b, quote: 'quote citing the page already tried' });
      fs.mkdirSync(snapDir(root, 'by-url'), { recursive: true });
      fs.writeFileSync(byUrlFile(root, b), JSON.stringify({ schema_version: 1, raw_sha: null, retrieved_at: NOW, source_changed: false, reason: 'timeout' }) + '\n');
      const r = await snap(root, ['--new']);
      shape(r, 0);
      assert.equal(srv.requests.length, 1);
      assert.equal(srv.requests[0].url, '/untried');
      assert.equal(r.json.result.n, 1);
      assert.ok(urlRow(r, a));
      assert.equal(urlRow(r, b), undefined);
      assert.equal(byUrlLines(root, b).length, 1, 'the tried url\'s file is untouched');
    });
  });

  it('T18 --new when a c_ object file was edited: exit 3 object-mismatch, no request made', async () => {
    await scenario({}, async ({ srv, root, base }) => {
      addCard(root, { url: base + '/one', quote: 'quote for the page one' });
      const bad = addCard(root, { url: base + '/two', quote: 'quote for the page two' });
      fs.appendFileSync(bad.file, ' ');
      const r = await snap(root, ['--new']);
      shape(r, 3);
      assert.ok(hasReason(r, 'object-mismatch'), JSON.stringify(r.json.reasons));
      assert.equal(srv.requests.length, 0);
      assert.deepEqual(allFiles(snapDir(root)), []);
    });
  });

  it('T19 --ce 2 with coord.json ce 1: exit 64, no request, nothing written', async () => {
    await scenario({}, async ({ srv, root, base }) => {
      const r = await snap(root, ['--url', base + '/x'], {}, { ce: '2' });
      shape(r, 64);
      assert.equal(srv.requests.length, 0);
      assert.deepEqual(allFiles(snapDir(root)), []);
      assert.ok(!fs.existsSync(path.join(root, 'run', 'ledger.jsonl')));
      assert.ok(!fs.existsSync(path.join(root, 'run', 'run.lock')));
    });
  });

  it('T20 run.lock held by a live process the test spawned: exit 75, no raw, text, meta or by-url file written', async (t) => {
    const sleeper = spawnSleeper();
    try {
      if (!sleeper.start_time) { t.skip('could not read the start time of the spawned process'); return; }
      await scenario({ thr: { lock_retries: 3 } }, async ({ root, base }) => {
        const lockFile = path.join(root, 'run', 'run.lock');
        fs.writeFileSync(lockFile, JSON.stringify(lockRecord(sleeper)));
        const before = fs.readFileSync(lockFile, 'utf8');
        const url = base + '/locked';
        const r = await snap(root, ['--url', url]);
        shape(r, 75);
        assert.ok(hasReason(r, 'lock-busy'), JSON.stringify(r.json.reasons));
        assert.deepEqual(allFiles(snapDir(root)), [], 'every write is inside the lock');
        assert.equal(fs.readFileSync(lockFile, 'utf8'), before, 'the live holder\'s lock is left alone');
      });
    } finally {
      sleeper.kill();
    }
  });

  it('T21 a torn last line in the by-url file moves to .corrupt and the new line is appended whole', async () => {
    await scenario({ handler: okText('<html><body><p>fresh words of the page</p></body></html>', 'text/html') }, async ({ root, base }) => {
      const url = base + '/torn';
      const file = byUrlFile(root, url);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const old = { schema_version: 1, raw_sha: 'a'.repeat(64), retrieved_at: '2026-11-01T00:00:00.000Z', source_changed: false };
      fs.writeFileSync(file, JSON.stringify(old) + '\n{"schema_ver');
      const r = await snap(root, ['--url', url]);
      shape(r, 0);
      assert.equal(fs.readFileSync(file + '.corrupt', 'utf8'), '{"schema_ver');
      const raw = fs.readFileSync(file, 'utf8');
      assert.ok(raw.endsWith('\n'));
      const lines = raw.split('\n').filter(Boolean).map((l) => JSON.parse(l));
      assert.equal(lines.length, 2);
      assert.deepEqual(lines[0], old);
      assert.equal(lines[1].raw_sha, urlRow(r, url).raw_sha);
      assert.equal(lines[1].source_changed, true, 'an earlier non-null raw_sha differs');
    });
  });

  it('T22 --dry-run --new: lists the urls sorted by url key, dry_run true, no request, no file, no lock file', async () => {
    await scenario({}, async ({ srv, root, base }) => {
      const urls = [base + '/d1', base + '/d2', base + '/d3'];
      urls.forEach((u, i) => addCard(root, { url: u, quote: 'quote number ' + i + ' for a dry run' }));
      addCard(root, { url: urls[0], quote: 'another quote citing the first url' });
      const r = await snap(root, ['--new', '--dry-run']);
      shape(r, 0);
      assert.equal(r.json.dry_run, true);
      assert.equal(r.json.result.urls.length, 3);
      const keys = r.json.result.urls.map((u) => u.url_key);
      assert.deepEqual(keys, urls.map(urlKey).sort());
      assert.equal(srv.requests.length, 0);
      assert.deepEqual(allFiles(snapDir(root)), []);
      assert.ok(!fs.existsSync(path.join(root, 'run', 'run.lock')));
      assert.ok(!fs.existsSync(path.join(root, 'run', 'ledger.jsonl')));
    });
  });

  it('T23 --url with --new, neither, an unknown flag, a malformed --now, a missing --ce or --root: exit 66 before any read', async () => {
    await scenario({}, async ({ srv, base }) => {
      const url = base + '/x';
      const cases = [
        (r) => ['--root', r, '--ce', '1', '--url', url, '--new'],
        (r) => ['--root', r, '--ce', '1'],
        (r) => ['--root', r, '--ce', '1', '--url', url, '--bogus'],
        (r) => ['--root', r, '--ce', '1', '--url', url, '--now', 'not-a-date'],
        (r) => ['--root', r, '--url', url],
        (r) => ['--ce', '1', '--url', url],
      ];
      for (const [i, mk] of cases.entries()) {
        const root = bareRoot(); // empty: nothing may be read, or created
        try {
          const r = await run(root, mk(root));
          shape(r, 66);
          assert.ok(hasReason(r, 'usage'), `case ${i}: ` + JSON.stringify(r.json.reasons));
          assert.deepEqual(ls(root), [], `case ${i}: nothing created in the root`);
        } finally {
          rmRoot(root);
        }
      }
      assert.equal(srv.requests.length, 0);
    });
  });

  it('T24 one stdout JSON line of the 1.3 shape; url_key is sha256 of new URL(u).href, so differently spelled urls share a key', async () => {
    await scenario({ handler: okText('<html><body><p>one page words</p></body></html>', 'text/html') }, async ({ root, srv }) => {
      const spelled = `HTTP://127.0.0.1:${srv.port}`;
      const plain = `http://127.0.0.1:${srv.port}/`;
      const r1 = await snap(root, ['--url', spelled]);
      shape(r1, 0);
      const r2 = await snap(root, ['--url', plain]);
      shape(r2, 0);
      const expectKey = sha256(new URL(plain).href);
      assert.equal(r1.json.result.urls[0].url_key, expectKey);
      assert.equal(r2.json.result.urls[0].url_key, expectKey);
      assert.deepEqual(ls(snapDir(root, 'by-url')), [expectKey + '.jsonl']);
      assert.equal(readLines(path.join(snapDir(root, 'by-url'), expectKey + '.jsonl')).length, 2);
      assert.equal(r1.json.mode ?? null, null);
    });
  });

  it('needs the app: real web pages (extraction quality, paywalls, challenge pages answering 200, real PDFs)', { skip: 'needs the app' }, () => {});
  it('needs the app: a real run has allow_loopback false (selftest\'s threshold check)', { skip: 'needs the app' }, () => {});
});
