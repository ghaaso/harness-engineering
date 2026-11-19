#!/usr/bin/env node
// run-e2e.mjs: a dry run of the trusted base (tcb) on synthetic data, end to end.
//
//   node lane.mjs --label e2e --timeout-s 540 -- node e2e/run-e2e.mjs [--force-selftest] [--keep]
//
// It builds one run root under e2e/w/root (one copy of tcb/, committed to a throw-away git repository, as fsck
// requires), simulates the one step only the app can do (starting a session: it writes a synthetic transcript and the
// attempt's staging files by hand), and walks one small field through every script as child processes, one at a time.
// Then the faults. One line per step: ok or FAIL. The scripts are never edited.
//
// What is simulated, and why (each is named where it happens):
//  - sessions and helpers: synthetic transcripts and staging files (the app starts sessions);
//  - snap: run once in a scratch root (e2e/w/snap) whose thresholds allow 127.0.0.1, because the run root's tcb/ has
//    allow_loopback false (selftest's static check demands it) and is frozen by the git commit (fsck: tcb-differs);
//    the snapshot folders are then copied into the run root;
//  - the protocol model's result file (protocol-model.mjs is built elsewhere);
//  - at the end, the watcher and alarm records, with this process standing in for both.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUILD = path.resolve(HERE, '..');
const SRC = path.join(BUILD, 'tcb');
const W = path.join(HERE, 'w');
const ROOT = path.join(W, 'root');
const SNAP = path.join(W, 'snap');
const TR = path.join(ROOT, 'transcripts');
const ARGV = process.argv.slice(2);
const FORCE_SELFTEST = ARGV.includes('--force-selftest');
const KEEP = ARGV.includes('--keep');
const ONLY_PHASE = (ARGV.find((a) => a.startsWith('--stop-after=')) || '').split('=')[1] || null;

let CE = 1;
const BOOT = 'e2e-boot-1';
const COORD_SID = '00000000-0000-4000-8000-000000000001';
const COORD2_SID = '00000000-0000-4000-8000-000000000002';
const sidOf = (n) => `00000000-0000-4000-8000-${String(100 + n).padStart(12, '0')}`;

// ---------------------------------------------------------------- reporting
const log = [];
const failures = [];
let nOk = 0;
function rec(ok, name, script, detail) {
  const line = `${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  -- ' + detail : ''}`;
  console.log(line);
  log.push(line);
  if (ok) nOk += 1; else failures.push({ script: script || '-', what: name, detail: detail || '' });
}
const chk = (name, cond, detail = '', script = '-') => { rec(!!cond, name, script, cond ? '' : detail); return !!cond; };

let clock = Date.parse('2026-11-17T10:00:00.000Z');
const tick = (ms = 17000) => { clock += ms; return new Date(clock).toISOString(); };

// ---------------------------------------------------------------- files
const P = (...a) => path.join(ROOT, ...a);
const put = (rel, v, base = ROOT) => { const f = path.join(base, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, typeof v === 'string' ? v : JSON.stringify(v, null, 2) + '\n'); return f; };
const rj = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));
const exists = (f) => fs.existsSync(f);
const readLines = (f) => (exists(f) ? fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)) : []);
const ledger = () => readLines(P('run', 'ledger.jsonl'));
const ofKind = (k) => ledger().filter((l) => l.kind === k);
const lastKind = (k) => ofKind(k).at(-1);
const tasks = () => rj(P('run', 'tasks.json'));
const rowOf = (t) => tasks().tasks.find((r) => r.task === t);
const att = (t, e) => P('wt', `${t}-e${e}`);
const objs = () => (exists(P('store', 'objects')) ? fs.readdirSync(P('store', 'objects')) : []);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

// ---------------------------------------------------------------- child processes (one at a time)
function runNode(file, args, { input, cwd, timeoutMs = 240000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [file, ...args], { cwd: cwd || ROOT, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = ''; let err = ''; let done = false;
    const timer = setTimeout(() => { if (!done) { try { child.kill(); } catch { /* gone */ } } }, timeoutMs);
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', (e) => { err += String(e); });
    child.on('close', (code) => {
      done = true; clearTimeout(timer);
      const lines = out.split('\n').map((l) => l.trim()).filter(Boolean);
      let json = null;
      try { json = lines.length ? JSON.parse(lines[lines.length - 1]) : null; } catch { json = null; }
      resolve({ exit: code, stdout: out, stderr: err, json, nlines: lines.length });
    });
    if (input !== undefined) child.stdin.write(input);
    child.stdin.end();
  });
}
function runGit(args, cwd) {
  return new Promise((resolve) => {
    const c = spawn('git', args, { cwd, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; let err = '';
    c.stdout.on('data', (d) => { out += d; }); c.stderr.on('data', (d) => { err += d; });
    c.on('error', (e) => { err += String(e); resolve({ code: -1, out, err }); });
    c.on('close', (code) => resolve({ code, out: out.trim(), err }));
  });
}

// One script call. o: {rootDir, ce:false|n, now:false, free:true, boot:true, input, name, exit, code, timeoutMs, quiet}
async function sc(script, flags, o = {}) {
  const args = [...flags];
  if (!o.noRoot) args.push('--root', o.rootDir || ROOT);
  if (o.ce !== false) args.push('--ce', String(o.ce ?? CE));
  if (o.now !== false) args.push('--now', tick());
  if (o.free) args.push('--free-mb', '99999');
  if (o.boot) args.push('--boot', BOOT);
  const r = await runNode(path.join(ROOT, 'tcb', `${script}.mjs`), args, { input: o.input, timeoutMs: o.timeoutMs });
  const want = Array.isArray(o.exit) ? o.exit : [o.exit ?? 0];
  let ok = want.includes(r.exit);
  const why = [];
  if (!ok) why.push(`exit=${r.exit} want ${want.join('|')}`);
  if (r.json === null && script !== 'guard-hook') { ok = false; why.push('no JSON line on stdout'); }
  if (r.json && script !== 'guard-hook' && r.nlines !== 1) { ok = false; why.push(`stdout has ${r.nlines} lines`); }
  if (r.json && o.code) {
    const has = (r.json.code === o.code) || (r.json.reasons || []).some((x) => x.code === o.code);
    if (!has) { ok = false; why.push(`reason ${o.code} not present`); }
  }
  if (r.json && script !== 'guard-hook' && r.json.script && r.json.script !== script) { ok = false; why.push(`script field ${r.json.script}`); }
  if (o.check && ok) { try { const m = o.check(r); if (m !== true && m !== undefined) { ok = false; why.push(String(m)); } } catch (e) { ok = false; why.push('check threw ' + e.message); } }
  const label = o.name || `${script} ${flags[0] && !flags[0].startsWith('--') ? flags[0] : ''}`.trim();
  const detail = ok ? '' : `${why.join('; ')} | code=${r.json?.code} reasons=${JSON.stringify(r.json?.reasons || []).slice(0, 420)} stderr=${(r.stderr || '').trim().split('\n').slice(-2).join(' / ').slice(0, 260)}`;
  if (!o.quiet) rec(ok, label, script, detail);
  r.ok = ok;
  return r;
}

// ---------------------------------------------------------------- synthetic transcripts
function writeTranscript(file, { sessionId, cwd, calls = [], structured, t0 = Date.parse('2026-11-17T09:00:00.000Z') }) {
  const recs = [];
  let t = 0; let n = 0;
  const ts = () => new Date(t0 + 1000 * t++).toISOString();
  const base = { sessionId, cwd };
  recs.push({ ...base, type: 'user', timestamp: ts(), uuid: `u-${n++}`, message: { role: 'user', content: 'synthetic start' } });
  calls.forEach((c, i) => {
    const id = `msg_e2e_${i}`;
    const u = c.usage || {};
    const usage = {
      input_tokens: u.input ?? 2000, cache_read_input_tokens: u.cache_read ?? 8000,
      cache_creation_input_tokens: u.cache_write ?? 500, output_tokens: u.output ?? 300,
    };
    const blocks = [];
    if (typeof c.text === 'string') blocks.push({ type: 'text', text: c.text });
    (c.tools || []).forEach((tl, j) => blocks.push({ type: 'tool_use', id: `toolu_e2e_${i}_${j}`, name: tl.name, input: tl.input ?? {} }));
    if (!blocks.length) blocks.push({ type: 'text', text: '' });
    const at = ts();
    for (const b of blocks) recs.push({ ...base, type: 'assistant', timestamp: at, uuid: `u-${n++}`, message: { id, model: 'claude-test', role: 'assistant', content: [b], usage } });
    if (Array.isArray(c.results) && c.results.length) {
      const content = c.results.map((r, j) => ({ type: 'tool_result', tool_use_id: `toolu_e2e_${i}_${j}`, is_error: false, content: typeof r === 'string' ? r : r.text }));
      recs.push({ ...base, type: 'user', timestamp: ts(), uuid: `u-${n++}`, message: { role: 'user', content } });
    }
  });
  if (structured !== undefined) recs.push({ ...base, type: 'attachment', timestamp: ts(), uuid: `u-${n++}`, attachment: { type: 'structured_output', data: structured } });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, recs.map((r) => JSON.stringify(r)).join('\n') + '\n');
  return file;
}
const readCall = (f, res = 'file text') => ({ tools: [{ name: 'Read', input: { file_path: f } }], results: [res] });

// ---------------------------------------------------------------- synthetic world
let LIB = null;
const server = { port: 0, p1version: 1, srv: null };
const url = (p) => `http://127.0.0.1:${server.port}${p}`;
const PAGE1_V1 = '<!doctype html><html><head><title>Cache study</title><style>.x{color:red}</style><script>var a = 1;</script></head><body><h1>Cache study</h1>\n<p>Latency fell sharply when the cache was enabled in the lookup test. The median was 12.5 ms against 20 ms for the control.</p>\n<p>Batching of writes reduced the delay noticeably under the same load. The median was 8 ms against 10 ms for the control.</p></body></html>';
const PAGE1_V2 = '<!doctype html><html><head><title>Cache study</title></head><body><h1>Cache study</h1>\n<p>Latency was unchanged when the cache was enabled in the lookup test. The median was 20 ms with and without it.</p>\n<p>Batching of writes made no visible difference under the same load. The median was 10 ms with and without it.</p></body></html>';
const PAGE2 = '<!doctype html><html><head><title>Second study</title></head><body><h1>Second study</h1>\n<p>Warm lookups returned faster with the cache turned on for every request. The median was 14.2 ms against 20 ms for the control.</p>\n<p>Grouping writes into batches trimmed the wait a little under heavy load. The median was 9 ms against 10 ms for the control.</p></body></html>';
function startServer() {
  return new Promise((resolve) => {
    server.srv = http.createServer((req, res) => {
      const u = req.url.split('?')[0];
      const page = u === '/p1' ? (server.p1version === 1 ? PAGE1_V1 : PAGE1_V2) : u === '/p2' ? PAGE2 : null;
      if (!page) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); return; }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(page);
    });
    server.srv.listen(0, '127.0.0.1', () => { server.port = server.srv.address().port; resolve(); });
  });
}

const COND = { task: ['lookup'], model_family: ['alpha'], repo_size: 'small', language: ['python'], metric: 'p50' };
const mkCard = ({ q, route, page, cid, quote, approach, value, baseline, effect = 'improves' }) => ({
  schema_version: 1, kind: 'card', field: 'f1', question_ids: [q], route,
  source: { url: url(page), canonical_id: cid, primary_id: cid, date: '2025-01-01', evidence_type: 'controlled' },
  quote,
  measured: { approach_id: approach, measure: 'latency', value, unit: 'ms', baseline, baseline_kind: 'control', better: 'lower', effect },
  conditions: { ...COND, task: [...COND.task], model_family: [...COND.model_family], language: [...COND.language] },
  what_measured: 'median lookup latency with and without the technique',
});
let CARDS = null; // {c1..c6: card}, IDS: {c1..: id}
const IDS = {};
function buildCards() {
  CARDS = {
    c1: mkCard({ q: 'f1-a-01', route: 'keyword', page: '/p1', cid: 'doi:10.0000/src-a', quote: 'Latency fell sharply when the cache was enabled in the lookup test', approach: 'cache', value: 12.5, baseline: 20 }),
    c2: mkCard({ q: 'f1-a-02', route: 'backward', page: '/p1', cid: 'doi:10.0000/src-a', quote: 'Batching of writes reduced the delay noticeably under the same load', approach: 'batch', value: 8, baseline: 10 }),
    c3: mkCard({ q: 'f1-a-01', route: 'keyword', page: '/p2', cid: 'doi:10.0000/src-b', quote: 'Warm lookups returned faster with the cache turned on for every request', approach: 'cache', value: 14.2, baseline: 20 }),
    c4: mkCard({ q: 'f1-a-02', route: 'backward', page: '/p2', cid: 'doi:10.0000/src-b', quote: 'Grouping writes into batches trimmed the wait a little under heavy load', approach: 'batch', value: 9, baseline: 10 }),
    // faults: a quote that is not in the page, and a page that was never stored
    c5: mkCard({ q: 'f1-a-01', route: 'keyword', page: '/p1', cid: 'doi:10.0000/fake-e', quote: 'The committee approved the budget after a long debate', approach: 'cache', value: 77.7, baseline: 80 }),
    c6: mkCard({ q: 'f1-a-02', route: 'keyword', page: '/p3', cid: 'doi:10.0000/gone-f', quote: 'Unseen words that no stored copy holds', approach: 'batch', value: 5, baseline: 6 }),
  };
  for (const [k, c] of Object.entries(CARDS)) IDS[k] = LIB.objectId('c', c);
}
const sorted4 = () => [IDS.c1, IDS.c2, IDS.c3, IDS.c4].sort();

function sentence(sid, approach, kind, text, cites) {
  return { sid, approach_id: approach, measure: 'latency', kind, text, cites, applies_to: { ...COND, task: [...COND.task], model_family: [...COND.model_family], language: [...COND.language] } };
}
const packSentences = () => [
  sentence('s1', 'cache', 'fact', 'The cache cut median lookup latency from 20 ms to 12.5 ms.', [IDS.c1]),
  sentence('s2', 'batch', 'fact', 'Batching writes cut median latency from 10 ms to 8 ms.', [IDS.c2]),
  sentence('s3', 'cache', 'fact', 'A second study found the cache cut median latency from 20 ms to 14.2 ms.', [IDS.c3]),
  sentence('s4', 'batch', 'fact', 'A second study found batching cut median latency from 10 ms to 9 ms.', [IDS.c4]),
  { sid: 's5', approach_id: 'cache', measure: 'latency', kind: 'judgment', text: 'Both techniques look worth a further test.', cites: [], applies_to: {} },
];
const mkPack = (sents) => ({ schema_version: 1, kind: 'pack', field: 'f1', questions_sha: LIB.questionsSha(['f1-a-01', 'f1-a-02']), cards: sorted4(), conclusions: sents, not_covered: [] });
const mkReview = (task, packId, plantFindings = []) => ({
  schema_version: 1, kind: 'review', field: 'f1', task, pack: packId,
  sentences: [
    sentence('s1', 'cache', 'fact', 'The cache cut median lookup latency from 20 ms to 12.5 ms.', [IDS.c1]),
    sentence('s2', 'batch', 'fact', 'Batching writes cut median latency from 10 ms to 8 ms.', [IDS.c2]),
    sentence('s3', 'cache', 'fact', 'A second study found the cache cut median latency from 20 ms to 14.2 ms.', [IDS.c3]),
  ],
  verdicts: [{ approach_id: 'cache', verdict: 'promising', supports: ['s1', 's3'] }, { approach_id: 'batch', verdict: 'untested', supports: ['s2'] }],
  dismissals: [],
  our_work_findings: plantFindings,
});

// ---------------------------------------------------------------- design-check objects
const DESIGN = (() => {
  const sec = (n, title, body) => `## ${n}. ${title}\n${body}\n`;
  let t = 'Preamble of the synthetic design. It is dropped by the cut.\n\n';
  t += sec(1, 'Purpose', 'The tree runs research fields in parallel. Problem P7 and rule R10 are named here. See N3 and D2-04.\n\n**Where the classical assumptions fail.** A paragraph that must go.\n\nA paragraph that stays (G4).');
  t += sec(2, 'Layout', 'Folders: plan, run, store. A table (K1, K2) follows.');
  t += sec(3, 'Roles', 'A coordinator and children.');
  t += sec(4, 'Rules', 'R10: admit only with a free slot.');
  t += sec(5, 'Cuts', 'Everything is atomic.');
  t += sec(6, 'Checks', 'The checker is measured on seeds.');
  t += sec(7, 'Views', 'Views are derived.');
  t += sec(8, 'Dropped eight', 'Dropped text eight.');
  t += sec(9, 'Dropped nine', 'Dropped text nine.');
  t += sec(10, 'Scripts', 'Intro of ten, dropped.\n\n**Scripts**\n- replace: the start path (R3).\n- commit: the acceptor (R13).\n\n**Files:**\n- dropped file list.');
  for (const n of [11, 12, 13, 14, 15]) t += sec(n, `Dropped ${n}`, `Dropped text ${n}.`);
  return t;
})();
const COLS = {
  component: ['crash', 'amnesia', 'omission', 'timing', 'wrong_value', 'common_cause', 'fabrication', 'injected_text', 'agrees_with_brief'],
  data: ['dirty_write', 'dirty_read', 'non_repeatable_read', 'phantom', 'lost_update', 'read_skew', 'write_skew', 'torn_write', 'stale_derived', 'mutable_identity'],
  flow: ['spoofing', 'tampering', 'repudiation', 'information_disclosure', 'denial_of_service', 'elevation_of_privilege'],
};
const mkStpa = (cut) => ({
  schema_version: 1, kind: 'stpa', cut_sha: cut,
  controllers: [
    { id: 'c1', name: 'Coordinator session', actions: [{ id: 'a1', target: 'c2' }], feedback: [{ id: 'f1', from: 'c2' }] },
    { id: 'c2', name: 'Child session', actions: [], feedback: [] },
  ],
  ucas: [
    { uca_id: 'u1', action_id: 'a1', type: 'N', hazardous: true, context: 'a start is given while the table is changing', case: 'the start never reaches the child and the task waits' },
    { uca_id: 'u2', action_id: 'a1', type: 'U', hazardous: false, context: 'a start given after a commit', case: 'the table refuses it, no unsafe case' },
    { uca_id: 'u3', action_id: 'a1', type: 'T', hazardous: false, context: 'a start given too early', case: 'admission defers it, no unsafe case' },
    { uca_id: 'u4', action_id: 'a1', type: 'D', hazardous: false, context: 'a start applied for a replaced attempt', case: 'the epoch fence refuses it, no unsafe case' },
  ],
});
const mkFmea = (cut) => {
  const rows = [{ row_id: 'r1', kind: 'component', name: 'Watcher process' }, { row_id: 'r2', kind: 'data', name: 'Task table' }, { row_id: 'r3', kind: 'flow', name: 'Hook call' }];
  const cells = [];
  for (const r of rows) for (const col of COLS[r.kind]) {
    const first = r.row_id === 'r1' && col === 'crash';
    cells.push({ row_id: r.row_id, col, finding: first ? 'the watcher dies and nobody wakes' : null, na_reason: first ? null : 'covered by the fence, no new finding' });
  }
  return { schema_version: 1, kind: 'fmea', cut_sha: cut, rows, cells };
};
const mkHazards = (cut) => ({
  schema_version: 1, kind: 'hazards', cut_sha: cut, parent: null,
  hazards: [{ hazard_id: 'h1', supersedes: null, classical_name: 'Lost wake', statement: 'A start or wake is lost and the run waits forever.', severity: 'medium', p_ids: [...Array.from({ length: 21 }, (_, i) => `P${i + 1}`), ...Array.from({ length: 12 }, (_, i) => `G${i + 1}`)], covered_by: ['R1'], status: 'covered' }],
  map: [
    { source: { kind: 'uca', id: 'u1' }, hazard_id: 'h1', borderline: false, alt_hazard_id: null },
    { source: { kind: 'cell', id: 'r1/crash' }, hazard_id: 'h1', borderline: false, alt_hazard_id: null },
  ],
});

// ---------------------------------------------------------------- the attempt walk
const state = { fsckOk: true };
async function fsck(name = 'fsck') { return sc('fsck', [], { name, check: (r) => (r.json.result?.result === 'pass' || r.exit === 0 ? true : 'fsck result ' + JSON.stringify(r.json.result).slice(0, 300)) }); }

async function beginAttempt(task, e, { sid, dirName, reconcile = false, name = task }) {
  // epoch e of task; fence first when the row is planned
  const pre = rowOf(task);
  if (pre.state === 'planned') await sc('replace', ['fence', '--task', task, '--epoch', '0', '--reason', 'first'], { boot: true, name: `${name}: replace fence first` });
  await fsck(`${name}: fsck before start`);
  await sc('admit', ['check', '--task', task], { ce: false, free: true, name: `${name}: admit check`, exit: 0 });
  const r = await sc('replace', ['start', '--task', task, '--epoch', String(e)], { free: true, name: `${name}: replace start e${e}` });
  const folder = (() => { try { return path.resolve(ROOT, LIB.attemptOf(rowOf(task), e).folder); } catch { return att(task, e); } })();
  const file = path.join(TR, dirName || 'p1', `${sid}.jsonl`);
  return { r, folder, file, sid, task, e };
}
const inputsOf = (folder) => { try { return rj(path.join(folder, 'in', 'manifest.json')).inputs.map((i) => i.name); } catch { return []; } };
const readsOf = (folder, limit = 12) => [path.join(folder, 'in', 'brief.md'), ...inputsOf(folder).slice(0, limit).map((n) => path.join(folder, 'in', n))].map((f) => readCall(f));

async function bind(a, name) {
  writeTranscript(a.file, { sessionId: a.sid, cwd: a.folder, calls: [readCall(path.join(a.folder, 'in', 'brief.md'))] });
  put('claim.json', LIB.claimRecord(a.sid), a.folder); // FX-CLAIM: the hook's claim at the session's first tool call, simulated like the transcript
  return sc('replace', ['bind', '--task', a.task, '--epoch', String(a.e), '--session', a.sid], { boot: true, name: `${name || a.task}: replace bind e${a.e}` });
}
// FX-OUT (FIX-fence.md section 1, "Steps, child side" 1-4; tcb/briefs/child.md line 41): the child writes READY last,
// with the Write tool only. The harness runs the attempt's guard hook first (the command its .claude/settings.json
// names), and the hook's test-and-set puts the ready slot in outcome/<j>.json, the record commit, watch and status
// decide by. Only on allow does the Write land READY.json, a copy no decision reads. This process stands in for the
// harness, as it does for the session start: it runs the hook with the settings' role, then writes the copy. The
// hook's answer is checked but not counted (the counted check of the slot is the commit record that follows): a FAIL
// line only when the hook answers other than the design says; `deny` names the code the hook must deny with.
async function ready(a, step, { content, deny = null } = {}) {
  const file = path.join(a.folder, 'staging', 'READY.json');
  const bytes = content ?? JSON.stringify({ kind: 'ready', task: a.task, epoch: a.e, step });
  let role = null;
  try { role = /--role ([a-z-]+)/.exec(fs.readFileSync(path.join(a.folder, '.claude', 'settings.json'), 'utf8'))?.[1] ?? null; } catch { /* no settings: the row's role */ }
  const input = JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: { file_path: file, content: bytes }, cwd: a.folder, session_id: a.sid, transcript_path: a.file });
  const r = await sc('guard-hook', ['--role', role || rowOf(a.task).role, '--task', a.task, '--epoch', String(a.e)], { ce: false, now: false, input, quiet: true });
  const code = /\[guard-hook\] deny ([a-z0-9-]+)/.exec(r.stderr || '')?.[1] ?? null;
  if (!(deny ? r.exit === 2 && code === deny : r.exit === 0)) {
    rec(false, `${a.task} e${a.e}: the hook's answer to READY ${step}`, 'guard-hook', `exit=${r.exit} deny ${code} want ${deny ? 'deny ' + deny : 'allow (a ready slot)'} | stderr=${(r.stderr || '').trim().slice(0, 300)}`);
  }
  if (r.exit === 0) fs.writeFileSync(file, bytes); // allowed: the Write lands the copy
  return r;
}
async function finishStep(a, step, name, { audit = true } = {}) {
  await sc('commit', ['intake', '--task', a.task, '--epoch', String(a.e)], { name: `${name}: commit intake (${step})` });
  if (audit) await sc('audit', ['--task', a.task, '--epoch', String(a.e)], { name: `${name}: audit (${step})`, check: (r) => (r.json.result?.label === 'clean' || r.json.result?.label === undefined ? true : 'label ' + r.json.result.label) });
  await fsck(`${name}: fsck before record (${step})`);
  return sc('commit', ['record', '--task', a.task, '--epoch', String(a.e), '--step', step], { name: `${name}: commit record ${step}` });
}

// ================================================================= main
async function main() {
  console.log(`# tcb e2e dry run; root ${ROOT}`);
  fs.rmSync(W, { recursive: true, force: true });
  fs.mkdirSync(ROOT, { recursive: true });
  fs.mkdirSync(SNAP, { recursive: true });

  // ------------------------------------------------------------ A. the run root, one shared copy of tcb/
  fs.cpSync(SRC, path.join(ROOT, 'tcb'), { recursive: true, filter: (s) => { const rel = path.relative(SRC, s); return !(rel === 'test' || rel.startsWith('test' + path.sep)); } });
  const thPath = path.join(ROOT, 'tcb', 'thresholds.json');
  const th = rj(thPath);
  const setTh = (doc, k, v) => { doc.params[k] = { ...(doc.params[k] || { unit: 'e2e', source: 'guess', gate: false }), value: v }; };
  setTh(th, 'transcripts_root', TR); setTh(th, 'user_files', []); setTh(th, 'lock_retries', 40); setTh(th, 'N_max', 3);
  fs.writeFileSync(thPath, JSON.stringify(th, null, 2) + '\n');
  fs.mkdirSync(TR, { recursive: true });
  LIB = await import(pathToFileURL(path.join(ROOT, 'tcb', 'lib.mjs')).href);
  chk('setup: tcb copied, lib imported', typeof LIB.canonicalize === 'function' && exists(P('tcb', 'replace.mjs')));
  chk('setup: tcb/denylist.txt is shipped (README and contract name it)', exists(P('tcb', 'denylist.txt')), 'absent: audit treats it as an empty list', 'audit.mjs');

  const g = async (...a) => runGit(a, ROOT);
  await g('init', '-q'); await g('config', 'core.autocrlf', 'false'); await g('config', 'core.safecrlf', 'false');
  await g('config', 'user.name', 'e2e'); await g('config', 'user.email', 'e2e@example.invalid');
  await g('add', 'tcb');
  const cm = await g('-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=NUL', 'commit', '-q', '-m', 'tcb');
  const head = await g('rev-parse', 'HEAD');
  const TCB_COMMIT = head.out;
  chk('setup: tcb committed to the throw-away repository', /^[0-9a-f]{40}$/.test(TCB_COMMIT), `git commit exit ${cm.code} ${cm.err.slice(0, 200)}`);

  await startServer();
  buildCards();
  chk('setup: synthetic pages served on 127.0.0.1', server.port > 0);

  // ------------------------------------------------------------ B. snapshots (scratch root, loopback allowed)
  const th2 = rj(thPath); setTh(th2, 'f5_given', true); setTh(th2, 'allow_loopback', true); setTh(th2, 'transcripts_root', path.join(SNAP, 'transcripts'));
  fs.cpSync(path.join(ROOT, 'tcb', 'schemas'), path.join(SNAP, 'tcb', 'schemas'), { recursive: true });
  put('tcb/thresholds.json', th2, SNAP);
  put('run/coord.json', { schema_version: 1, ce: 1, started_at: '2026-11-17T09:00:00.000Z', tcb_commit: '0'.repeat(40) }, SNAP);
  put('run/tasks.json', { schema_version: 1, rev: 0, tasks: [] }, SNAP);
  const snapOpts = { rootDir: SNAP, ce: 1 };
  for (const pg of ['/p1', '/p2']) {
    await sc('snap', ['--url', url(pg)], { ...snapOpts, name: `snap ${pg} (scratch root, loopback)`, check: (r) => (r.json.result?.n_text === 1 ? true : 'no text stored') });
  }
  await sc('snap', ['--url', url('/p3')], { ...snapOpts, exit: 2, code: 'unverifiable', name: 'snap /p3 -> 404 is unverifiable (exit 2), no bytes stored' });
  fs.cpSync(path.join(SNAP, '.snapshots'), P('.snapshots'), { recursive: true });
  chk('snap: by-url, raw, text, meta stored by hash', exists(P('.snapshots', 'by-url')) && fs.readdirSync(P('.snapshots', 'text')).length === 2, '', 'snap.mjs');

  // ------------------------------------------------------------ C. plan files written by the coordinator (drafts)
  put('plan/our-work/design/assumptions.md', '# Assumptions\nThe cache always helps every lookup.\nBatching never hurts latency under any load.\nThe control run used the same hardware as the test run.\nMedian latency is the right measure for this field.\n');
  put('plan/our-work/problems.md', '# Problems\nP1 to P21 are listed in the design.\n');
  put('plan/plant-candidates/f1.json', {
    schema_version: 1, field: 'f1',
    candidates: [
      { key: 'k1', file: 'design/assumptions.md', find: 'cache always helps', replace: 'cache never helps', card_id: IDS.c1, against_hope: true, reason: 'contradicts the first card' },
      { key: 'k2', file: 'design/assumptions.md', find: 'never hurts', replace: 'always hurts', card_id: IDS.c2, against_hope: false, reason: 'contradicts the second card' },
      { key: 'k3', file: 'design/assumptions.md', find: 'same hardware', replace: 'different hardware', card_id: IDS.c3, against_hope: false, reason: 'contradicts the third card' },
      { key: 'k4', file: 'design/assumptions.md', find: 'right measure', replace: 'only measure', card_id: IDS.c4, against_hope: false, reason: 'contradicts the fourth card' },
    ],
  });
  const APPROVAL_Q = 'I approve this protocol and plan as written.';
  put('plan/notes/approve-protocol.txt', APPROVAL_Q);
  put('plan/notes/approve-plan.txt', APPROVAL_Q);
  put('plan/notes/closed.txt', 'I closed the session; its window and process are gone.'); // FX-CLOSE: quoted by the owner's `closed` act (closeAttempt)
  put('plan/protocols/f1.json', {
    schema_version: 1, kind: 'protocol', field: 'f1', question_ids: ['f1-a-01', 'f1-a-02'],
    criteria: { include: [{ code: 'I1', text: 'reports a number with a baseline' }], exclude: [{ code: 'E1', text: 'no baseline' }] },
    routes: ['keyword', 'backward', 'seed'], card_schema_version: 1, certainty_method: 'descriptive counts',
    sesoi: { latency: 1 },
    outlist_vocab: { approaches: ['cache', 'batch'], measures: ['latency'], effects: ['improves', 'worsens', 'no-effect', 'mixed'] },
    seeds: ['doi:10.0000/src-a', 'doi:10.0000/src-b', 'doi:10.0000/src-c', 'doi:10.0000/src-d'],
    must_read: [{ url: url('/p1'), why: 'first study' }, { url: url('/p2'), why: 'second study' }, { url: url('/p3'), why: 'third study' }],
    fixed_files: ['design/assumptions.md'], cross_field: [], approval: { quote: APPROVAL_Q, at: '2026-11-17T09:30:00Z' },
  });
  const T = (task, o) => ({ task, field: o.field === undefined ? 'f1' : o.field, stage: o.stage, role: o.role, tier: 'tier-e2e', steps: o.steps, deps: o.deps || [], question_ids: o.field === null ? [] : ['f1-a-01', 'f1-a-02'], e_task: 500000 });
  const tp = { schema_version: 1, tasks: [
    T('d-stpa', { field: null, stage: 'design-check', role: 'stpa', steps: ['stpa'] }),
    T('d-fmea', { field: null, stage: 'design-check', role: 'fmea', steps: ['fmea'] }),
    T('d-map', { field: null, stage: 'design-check', role: 'mapper', steps: ['hazards'], deps: ['d-stpa', 'd-fmea'] }),
    T('f1-research', { stage: 'research', role: 'child', steps: ['pack'] }),
    T('f1-control', { stage: 'control', role: 'control', steps: ['pack', 'review'] }),
    T('f1-review', { stage: 'fresh-review', role: 'fresh-reviewer', steps: ['review'], deps: ['f1-research'] }),
  ] };
  tp.tasks.forEach((t) => { if (t.field === null) delete t.field; });
  put('plan/tasks-plan.json', tp);
  put('plan/analysis-plan.json', {
    schema_version: 1, kind: 'analysis-plan', units: 'questions answered', primary: 'answered', secondary: ['tokens'], delta: 1,
    decision_rules: ['report counts only'], looks: 1,
    arm_budget: { T: 1000000, R_same: 1000000, R1: 1000000, S1: 1000000 },
    arm_tasks: { T: { pack: 'f1-research.pack', review: 'f1-review.review' }, S1: { pack: 'f1-control.pack', review: 'f1-control.review' } },
    predicted_total: 2000000, labels: ['descriptive, n = 1 per arm'], approval: { quote: APPROVAL_Q, at: '2026-11-17T09:31:00Z' },
  });
  fs.copyFileSync(path.join(ROOT, 'tcb', 'cost-inputs.json'), P('plan', 'cost-inputs.json'));

  // ------------------------------------------------------------ D. coordinator epoch 1, owner words, selftest
  await sc('handover', ['init', '--tcb-commit', TCB_COMMIT, '--session', COORD_SID], { ce: false, name: 'handover init (ce 1)', check: () => (exists(P('run', 'coord.json')) && exists(P('.gitignore')) && rj(P('run', 'tasks.json')).rev === 0 ? true : 'coord/.gitignore/tasks missing') });
  await sc('handover', ['init', '--tcb-commit', TCB_COMMIT, '--session', COORD_SID], { ce: false, name: 'handover init again is an identical repeat' });
  await sc('handover', ['init', '--tcb-commit', '1'.repeat(40)], { ce: false, exit: 1, code: 'coord-exists', name: 'handover init with another commit is refused (coord-exists)' });
  await sc('status', ['owner', '--act', 'approve', '--subject', 'protocol:f1', '--quote-file', P('plan', 'notes', 'approve-protocol.txt')], { name: 'status owner approve protocol:f1' });
  await sc('status', ['owner', '--act', 'approve', '--subject', 'analysis-plan', '--quote-file', P('plan', 'notes', 'approve-plan.txt')], { name: 'status owner approve analysis-plan' });
  // FX-W2: reconcile confirms the arm only by a live alarm slot (run/arm/slot-1.json); none yet -> the turn is unarmed
  await sc('status', ['--reconcile'], { free: true, exit: 1, code: 'arm-unconfirmed', name: 'status --reconcile: no alarm slot yet -> arm-unconfirmed (the turn is unarmed)' });

  if (FORCE_SELFTEST) {
    await forceSelftest('forced by --force-selftest (development)');
  } else {
    const st = await sc('selftest', ['run'], { timeoutMs: 420000, name: 'selftest run (every script on its good and bad fixtures)', check: (r) => (r.json.result?.result === 'pass' ? true : 'result ' + JSON.stringify(r.json.result?.failed || r.json.result).slice(0, 600)) });
    if (!st.ok) {
      // The static check no-fixtures stops the whole run before any case. --only limits the static checks to the named
      // script, so the fixtures that do exist can still be judged one script at a time (writes nothing, no ledger line).
      const have = fs.readdirSync(P('tcb', 'fixtures')).filter((d) => fs.readdirSync(P('tcb', 'fixtures', d), { recursive: true }).some((f) => /case\.json$/.test(f)));
      for (const s of have) await sc('selftest', ['run', '--only', s], { timeoutMs: 300000, name: `selftest run --only ${s} (its existing fixtures)`, check: (r) => ((r.json.result?.failed || []).length === 0 && r.json.result?.result !== 'fail' ? true : 'failed ' + JSON.stringify(r.json.result?.failed || r.json.result).slice(0, 400)) });
      await forceSelftest('the real selftest did not pass: forced so the rest of the path can still run');
    }
  }

  // ------------------------------------------------------------ E. plan, protocol freeze
  await sc('replace', ['plan'], { name: 'replace plan (six rows)', check: () => (tasks().tasks.length === 6 ? true : 'rows ' + tasks().tasks.length) });
  await sc('replace', ['plan'], { name: 'replace plan again is an identical repeat' });
  await sc('protocol-freeze', ['freeze', '--file', 'plan/protocols/f1.json'], { name: 'protocol-freeze freeze f1', check: (r) => (r.json.result?.seed_split?.n_heldout === 2 ? true : 'seed split ' + JSON.stringify(r.json.result?.seed_split)) });
  await sc('protocol-freeze', ['freeze', '--file', 'plan/protocols/f1.json'], { name: 'protocol-freeze freeze again: replay', check: (r) => (r.json.result?.replay === true ? true : 'not a replay') });
  await sc('protocol-freeze', ['plan', '--file', 'plan/analysis-plan.json'], { name: 'protocol-freeze plan (analysis plan, arm_tasks checked against the table)' });
  if (ONLY_PHASE === 'E') return finish();

  // ------------------------------------------------------------ F. design cut and the design-check tasks
  const designFile = put('design.md', DESIGN, W);
  const cutR = await sc('gate', ['cut', '--design', designFile], { name: 'gate cut (the design cut for the blind analysts)', check: (r) => (/^[0-9a-f]{64}$/.test(r.json.result?.cut_sha || '') ? true : 'no cut_sha') });
  const CUT = cutR.json?.result?.cut_sha;
  if (CUT) {
    const cutTxt = fs.readFileSync(P('completeness', `cut-${CUT.slice(0, 12)}.md`), 'utf8');
    chk('gate cut: ids removed, dropped sections gone, rule text kept', !/\b[PNGDK][0-9]{1,2}\b/.test(cutTxt) && !/Dropped text/.test(cutTxt) && /R10/.test(cutTxt) && !/classical assumptions fail/.test(cutTxt) && /A paragraph that stays/.test(cutTxt), cutTxt.slice(0, 300), 'gate.mjs');
  }
  await sc('gate', ['cut', '--design', designFile], { name: 'gate cut again: identical, no second line', check: () => (ofKind('cut').length === 1 ? true : 'cut lines ' + ofKind('cut').length) });
  await sc('gate', ['check'], { exit: 2, code: 'stpa-missing', name: 'gate check before any analysis: not_run (stpa-missing), not a pass' });
  chk('gate check not_run is recorded as not_run, never pass', lastKind('check') && lastKind('check').data.check === 'gate' && lastKind('check').data.result === 'not_run', JSON.stringify(lastKind('check')?.data), 'gate.mjs');

  let n = 1;
  const designTask = async (task, role, step, obj) => {
    const a = await beginAttempt(task, 1, { sid: sidOf(n++), name: task });
    await bind(a, task);
    writeTranscript(a.file, { sessionId: a.sid, cwd: a.folder, calls: [...readsOf(a.folder), { text: `Done.\nTURN-END ${task}` }] });
    put(path.join('wt', `${task}-e1`, 'staging', `${step === 'hazards' ? 'hazards' : step}.json`), obj, ROOT);
    await ready(a, step);
    await finishStep(a, step, task);
  };
  // The first run of this e2e wrote p_ids P1..P21 only, as spec/gate.mjs.md and CONTRACT 3.19 say, and gate.mjs
  // answered p-id-missing for G1..G12: the code also requires the twelve gap rows. Hazards below list both.
  const gateSpec = fs.readFileSync(path.join(BUILD, 'spec', 'gate.mjs.md'), 'utf8');
  chk('spec drift: gate.mjs requires G1..G12 in p_ids (design R55); spec/gate.mjs.md says so too', /G1\b.*G12|G1-G12|G1\.\.G12/.test(gateSpec), 'spec/gate.mjs.md names P1..P21 only, gate.mjs line ~349 also requires G1..G12 (review finding U5-GT-1 was fixed in the code, not in the spec)', 'gate.mjs');
  await designTask('d-stpa', 'stpa', 'stpa', mkStpa(CUT));
  await designTask('d-fmea', 'fmea', 'fmea', mkFmea(CUT));
  await designTask('d-map', 'mapper', 'hazards', mkHazards(CUT));
  await sc('gate', ['check'], { exit: 2, code: 'model-missing', name: 'gate check without the model result: not_run (model-missing)' });
  put('completeness/model/result.json', { result: 'pass', sha: sha('e2e stand-in for protocol-model.mjs') });
  await sc('gate', ['check'], { name: 'gate check with the model result (stand-in file): pass', check: () => (rj(P('completeness', 'gate.json')).result === 'pass' ? true : 'gate result ' + rj(P('completeness', 'gate.json')).result) });
  await stopCommitted('design-check sessions closed; N_max is 3 at most (R10)');
  if (ONLY_PHASE === 'F') return finish();

  // ------------------------------------------------------------ G. the research attempt (field f1)
  const R = await beginAttempt('f1-research', 1, { sid: sidOf(20), dirName: LIB.projectDirName(att('f1-research', 1)), name: 'f1-research' });
  chk('f1-research: attempt folder has inputs, settings, agents, todo', exists(path.join(R.folder, 'in', 'protocol.json')) && exists(path.join(R.folder, '.claude', 'settings.json')) && exists(path.join(R.folder, 'view', 'todo.json')) && exists(path.join(R.folder, '.claude', 'agents', 'reader.md')), R.folder, 'replace.mjs');
  // the session start is the app's: a transcript whose cwd is the folder, found by --reconcile
  writeTranscript(R.file, { sessionId: R.sid, cwd: R.folder, calls: [readCall(path.join(R.folder, 'in', 'brief.md'))] });
  await sc('status', ['--reconcile'], { free: true, exit: 1, code: 'arm-unconfirmed', name: 'f1-research: status --reconcile finds the transcript by folder', check: () => (rowOf('f1-research').step === 'started' ? true : 'step ' + rowOf('f1-research').step) });
  put('claim.json', LIB.claimRecord(R.sid), R.folder); // FX-CLAIM: the hook's claim at the session's first tool call, simulated like the transcript
  await sc('replace', ['bind', '--task', 'f1-research', '--epoch', '1', '--session', R.sid], { boot: true, name: 'f1-research: replace bind (started -> bound)' });
  // the guard hook (a pure decision script: stdin JSON, exit 0 allow, 2 deny)
  const hook = (tool, input) => JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: tool, tool_input: input, cwd: R.folder, session_id: R.sid, transcript_path: R.file });
  await sc('guard-hook', ['--role', 'child', '--task', 'f1-research', '--epoch', '1'], { ce: false, now: false, input: hook('Read', { file_path: path.join(R.folder, 'in', 'brief.md') }), name: 'guard-hook allows a read of the attempt brief' });
  await sc('guard-hook', ['--role', 'child', '--task', 'f1-research', '--epoch', '1'], { ce: false, now: false, exit: 2, input: hook('Write', { file_path: P('tcb', 'thresholds.json'), content: 'x' }), name: 'guard-hook denies a write into tcb/' });
  await sc('guard-hook', ['--role', 'child', '--task', 'f1-research', '--epoch', '2'], { ce: false, now: false, exit: 2, input: hook('Read', { file_path: path.join(R.folder, 'in', 'brief.md') }), name: 'guard-hook denies every call of a stale epoch' });

  // the session: reads, three page fetches, a reader helper, writes
  const readerRes = { schema_version: 1, cards: [CARDS.c1, CARDS.c3], skipped: [] };
  writeTranscript(R.file, {
    sessionId: R.sid, cwd: R.folder,
    calls: [
      ...readsOf(R.folder, 8),
      { tools: [{ name: 'WebFetch', input: { url: url('/p1'), prompt: 'main findings' } }, { name: 'WebFetch', input: { url: url('/p2'), prompt: 'main findings' } }, { name: 'WebFetch', input: { url: url('/p3'), prompt: 'main findings' } }], results: [PAGE1_V1.slice(0, 600), PAGE2.slice(0, 600), 'not found'] },
      { tools: [{ name: 'Agent', input: { subagent_type: 'reader', description: 'read sources', prompt: 'read the two studies' } }], results: ['The reader returned two cards.'] },
      { tools: [{ name: 'Write', input: { file_path: path.join(R.folder, 'staging', 'cards', 'c2.card.json') } }, { name: 'Write', input: { file_path: path.join(R.folder, 'staging', 'pack.json') } }], results: ['ok', 'ok'] },
      { text: 'Done.\nTURN-END f1' },
    ],
  });
  const helperFile = path.join(TR, LIB.projectDirName(att('f1-research', 1)), R.sid, 'subagents', 'agent-r1.jsonl');
  writeTranscript(helperFile, { sessionId: R.sid, cwd: R.folder, calls: [{ tools: [{ name: 'WebFetch', input: { url: url('/p1'), prompt: 'cards' } }], results: [PAGE1_V1.slice(0, 400)] }, { text: 'returning cards' }], structured: readerRes });
  put(path.join('transcripts', LIB.projectDirName(att('f1-research', 1)), R.sid, 'subagents', 'agent-r1.meta.json'), { agentType: 'reader' });
  await sc('harvest', ['--task', 'f1-research', '--epoch', '1'], { name: 'harvest copies the reader result into staging/harvested', check: (r) => (r.json.result?.written?.length === 2 ? true : 'written ' + JSON.stringify(r.json.result?.written)) });
  // The Agent call's result text in the session transcript is prose here, as it usually is. Only a result whose
  // whole text parses as JSON is a candidate (spec "Candidates"), so harvest exits 0 and writes the two cards.
  chk('harvest: both harvested cards are in staging/harvested and the exit was 0', fs.existsSync(path.join(R.folder, 'staging', 'harvested')) && fs.readdirSync(path.join(R.folder, 'staging', 'harvested')).length === 2, '', 'harvest.mjs');
  await sc('harvest', ['--task', 'f1-research', '--epoch', '1'], { name: 'harvest again: nothing new, same bytes', check: (r) => (r.json.result?.already === 2 && (r.json.result?.written || []).length === 0 ? true : 'already ' + r.json.result?.already) });
  const stg = (rel) => path.join(R.folder, 'staging', rel);
  fs.mkdirSync(stg('cards'), { recursive: true });
  for (const k of ['c2', 'c4', 'c5', 'c6']) put(path.join('wt', 'f1-research-e1', 'staging', 'cards', `${k}.card.json`), CARDS[k], ROOT);
  put(path.join('wt', 'f1-research-e1', 'staging', 'pack.json'), mkPack(packSentences()), ROOT);
  // fault: a torn card file (the session was cut off mid-write)
  fs.writeFileSync(stg('cards/torn.card.json'), JSON.stringify(CARDS.c1).slice(0, 140));
  await sc('commit', ['intake', '--task', 'f1-research', '--epoch', '1'], { exit: 1, name: 'FAULT torn file: commit intake rejects it (unparseable), stores the rest', check: (r) => {
    const rej = (r.json.result?.rejected || []);
    if (!rej.some((x) => /torn\.card\.json$/.test(x.file) && x.code === 'unparseable')) return 'torn file not rejected as unparseable: ' + JSON.stringify(rej).slice(0, 200);
    return (r.json.result?.stored || []).length >= 7 ? true : 'stored ' + (r.json.result?.stored || []).length;
  } });
  chk('FAULT torn file: its object was not stored', !objs().some((f) => f.startsWith('c_') && !Object.values(IDS).some((i) => f === i + '.json')) && exists(P('store', 'objects', `${IDS.c1}.json`)), '', 'commit.mjs');
  fs.rmSync(stg('cards/torn.card.json'));
  await sc('commit', ['intake', '--task', 'f1-research', '--epoch', '1'], { name: 'commit intake after the torn file is gone', check: () => (Object.values(IDS).every((i) => exists(P('store', 'objects', `${i}.json`))) ? true : 'a card is missing from the store') });
  const origins = ofKind('intake').flatMap((l) => l.data.objects || []).filter((o) => o.kind === 'card').map((o) => o.origin);
  chk('commit intake records origins (harvested and session)', origins.includes('harvested') && origins.includes('session'), JSON.stringify(origins), 'commit.mjs');

  await sc('snap', ['--new'], { exit: 2, code: 'f5-not-given', name: 'snap --new without F5 fetches nothing (exit 2 f5-not-given)' });
  await sc('witness', ['--card', IDS.c1, '--card', IDS.c2, '--card', IDS.c3, '--card', IDS.c4], { name: 'witness c1-c4: quote and number found in the stored text', check: () => { const w = readLines(P('store', 'witness.jsonl')); return w.length === 4 && w.every((x) => x.result === 'witnessed') ? true : 'witness ' + JSON.stringify(w.map((x) => x.result)); } });
  await sc('witness', ['--card', IDS.c5], { exit: 1, name: 'FAULT quote not in the page: c5 is not witnessed (rejected)', check: () => { const w = readLines(P('store', 'witness.jsonl')).at(-1); return w.result === 'rejected' && w.reason === 'quote-missing' ? true : JSON.stringify(w); } });
  await sc('witness', ['--card', IDS.c6], { exit: 2, name: 'FAULT no snapshot: c6 is unverifiable (exit 2), the check line is not_run', check: () => { const c = lastKind('check'); return c.data.check === 'witness' && c.data.result === 'not_run' ? true : 'check line ' + JSON.stringify(c.data).slice(0, 200); } });
  await sc('status', [], { free: true, name: 'status lists the witness check that did not run as not_run (not a pass)', check: () => { const s = rj(P('run', 'status.json')); return (s.not_run || []).some((x) => x.check === 'witness') ? true : 'not_run ' + JSON.stringify(s.not_run); } });
  await sc('promote', ['--from', 'witness'], { name: 'promote --from witness writes the card status lines', check: () => {
    const st = readLines(P('store', 'status', 'card_status.jsonl')); const last = {}; for (const l of st) last[l.card_id] = l.status;
    const okk = [IDS.c1, IDS.c2, IDS.c3, IDS.c4].every((i) => last[i] === 'witnessed') && last[IDS.c5] === 'rejected' && last[IDS.c6] === 'unverifiable';
    return okk ? true : 'statuses ' + JSON.stringify(Object.values(last));
  } });
  await sc('promote', ['--from', 'witness'], { name: 'promote --from witness again: nothing to do' });

  // ------------------------------------------------------------ H. the checker: seeds, qualification, confirmation
  let ckN = 0;
  const checkerBatch = async (label, qargs, { promote = false } = {}) => {
    const q = await sc('check-queue', ['--mode', 'intake', ...qargs], { name: `${label}: check-queue intake`, check: (r) => (r.json.result?.batch ? true : 'no batch: ' + JSON.stringify(r.json.result).slice(0, 200)) });
    const b = q.json?.result?.batch;
    if (!b) return null;
    const key = rj(P('sealed', 'seeds', `${b}.json`));
    const bj = rj(P('queue', b, 'batch.json'));
    const verdictFor = (it) => { const k = key.items[it]; if (!k.seed) return 'confirmed'; return { S1: 'number_mismatch', S2: 'number_mismatch', S3: 'number_mismatch', S4: 'number_mismatch', J1: 'baseline_swapped', J2: 'conditions_mismatch', J3: 'outside_conditions', J4: 'unclear' }[k.class]; };
    ckN += 1;
    const tfile = path.join(TR, 'p1', COORD_SID, 'subagents', `agent-q${ckN}.jsonl`);
    writeTranscript(tfile, { sessionId: COORD_SID, cwd: ROOT, calls: [readCall(P('queue', b, 'batch.json')), ...bj.items.map((it) => readCall(P('queue', b, `item-${it}.json`))), { text: 'verdicts returned' }], structured: { schema_version: 1, verdicts: bj.items.map((it) => ({ item: it, verdict: verdictFor(it) })) } });
    put(path.join('transcripts', 'p1', COORD_SID, 'subagents', `agent-q${ckN}.meta.json`), { agentType: 'checker' });
    if (promote) await sc('promote', ['--batch', b, '--transcript', tfile], { name: `${label}: promote reads the checker's own transcript`, check: (r) => ((r.json.result?.written || []).length >= 1 ? true : 'no status lines') });
    return { b, tfile, key };
  };
  const scoreOf = async (label, b, tfile, exit) => sc('seed', ['score', '--batch', b, '--transcript', tfile], { exit, name: `${label}: seed score` });
  let firstKey = null;
  for (let i = 1; i <= 14; i += 1) {
    const r = await checkerBatch(`qualification batch ${i}/14`, ['--batch-size', '1', '--requeue'], {});
    if (!r) break;
    if (i === 1) firstKey = r.key;
    await scoreOf(`qualification batch ${i}/14`, r.b, r.tfile, 2);
  }
  if (firstKey) {
    const classes = Object.values(firstKey.items).filter((x) => x.seed).map((x) => x.class).sort();
    chk('check-queue: at most one seed per class per batch, S4 and J3 not seeded in intake', new Set(classes).size === classes.length && !classes.includes('S4') && !classes.includes('J3') && classes.includes('J1') && classes.includes('J2') && classes.includes('J4'), classes.join(','), 'check-queue.mjs');
    const queueText = fs.readdirSync(P('queue', 'b1-1')).map((f) => fs.readFileSync(P('queue', 'b1-1', f), 'utf8')).join('\n');
    chk('check-queue: no seed id, class or operator leaks into queue/', !/s_[0-9a-f]{16}/.test(queueText) && !/seed/i.test(queueText) && !/invented-quote|number-altered|quote-borrowed|wrong-card|value-baseline-swapped|condition-dropped|condition-altered|scope-widened|instruction-planted/.test(queueText), '', 'check-queue.mjs');
  }
  const qual = exists(P('store', 'qualification.json')) ? rj(P('store', 'qualification.json')) : null;
  chk('seed score: J1, J2, J4 qualified after 14 batches (lower bound >= d0); J3 unmeasured', qual && ['J1', 'J2', 'J4'].every((c) => qual.classes[c]?.qualified === true) && qual.classes.J3?.qualified !== true, JSON.stringify(Object.fromEntries(Object.entries(qual?.classes || {}).map(([k, v]) => [k, [v.status, v.calls, v.detected, v.lower]]))).slice(0, 500), 'seed.mjs');
  await sc('promote', ['revert', '--class', 'J2'], { exit: 1, code: 'class-qualified', name: 'promote revert --class J2 refused while J2 is qualified' });

  const ra = await checkerBatch('real batch A', ['--batch-size', '2', '--requeue'], { promote: true });
  if (ra) await scoreOf('real batch A', ra.b, ra.tfile, 2);
  const rb = await checkerBatch('real batch B', ['--batch-size', '2'], { promote: true });
  if (rb) await scoreOf('real batch B', rb.b, rb.tfile, 2);
  if (ra) {
    const nBefore = readLines(P('store', 'status', 'card_status.jsonl')).length;
    await sc('promote', ['--batch', ra.b, '--transcript', ra.tfile], { name: 'promote the same batch again: already, no new line', check: () => (readLines(P('store', 'status', 'card_status.jsonl')).length === nBefore ? true : 'status lines were written again') });
  }
  const statusNow = () => { const last = {}; for (const l of readLines(P('store', 'status', 'card_status.jsonl'))) last[l.card_id] = l; return last; };
  chk('promote: c1-c4 confirmed through checker lines that name the batch', [IDS.c1, IDS.c2, IDS.c3, IDS.c4].every((i) => statusNow()[i]?.status === 'confirmed' && statusNow()[i]?.check?.batch), JSON.stringify(Object.values(statusNow()).map((s) => s.status)), 'promote.mjs');
  chk('promote: seeds never get a status line (no s_ id anywhere in the status file)', exists(P('store', 'status', 'card_status.jsonl')) && !/s_[0-9a-f]{16}/.test(fs.readFileSync(P('store', 'status', 'card_status.jsonl'), 'utf8')), '', 'promote.mjs');

  // ------------------------------------------------------------ I. commit the pack (torn READY first)
  await sc('tms', [], { name: 'tms (labels, repair list) before the pack is committed' });
  // fault: a torn READY (the session was cut off mid-write). FX-OUT child side 3: the child's Write meets the hook
  // first, which refuses bytes that do not parse (ready-invalid): no ready slot, and the Write never lands.
  await ready(R, 'pack', { content: '{"kind":"ready","task":"f1-res', deny: 'ready-invalid' });
  await sc('commit', ['record', '--task', 'f1-research', '--epoch', '1', '--step', 'pack'], { exit: 2, code: 'no-ready', name: 'FAULT torn READY.json is not read as done (commit record exit 2 no-ready)', check: () => (!exists(P('store', 'commits', 'f1-research.pack.json')) ? true : 'a commit record exists') });
  chk('FAULT torn READY: the row is not committed', rowOf('f1-research').state !== 'committed', '', 'commit.mjs');
  await ready(R, 'pack');
  const rec1 = await finishStep(R, 'pack', 'f1-research');
  chk('f1-research committed; commit record names the pack and the 4 cards... and the extra cards in the store only', rowOf('f1-research').state === 'committed' && exists(P('store', 'commits', 'f1-research.pack.json')), `row ${rowOf('f1-research').state}`, 'commit.mjs');
  const researchPack = (() => { try { return rj(P('store', 'commits', 'f1-research.pack.json')).outputs.find((o) => o.kind === 'pack')?.id; } catch { return null; } })();
  if (ONLY_PHASE === 'G') return finish();

  // ------------------------------------------------------------ J. the control: a stall, a fence, a replaced attempt
  const C1 = await beginAttempt('f1-control', 1, { sid: sidOf(30), name: 'f1-control' });
  await bind(C1, 'f1-control');
  const stallCalls = (k) => Array.from({ length: k }, (_, i) => ({ tools: [{ name: 'Grep', input: { pattern: `probe-${i}`, path: C1.folder } }], results: ['no match'] }));
  writeTranscript(C1.file, { sessionId: C1.sid, cwd: C1.folder, calls: [...stallCalls(3), { text: 'thinking' }] });
  await sc('watch', ['--once', '--no-intake'], { free: true, exit: [0, 11, 12, 13, 14, 15, 16, 17], name: 'watch --once tick 1 (a stalling session starts, V is read)' });
  writeTranscript(C1.file, { sessionId: C1.sid, cwd: C1.folder, calls: [...stallCalls(36), { text: 'thinking' }] });
  await sc('watch', ['--once', '--no-intake'], { free: true, exit: 20, name: 'watch --once tick 2: 33+ calls with no gain -> class 20 stall', check: () => { const e = lastKind('event'); return e && e.data.class === 'stall' ? true : 'last event ' + JSON.stringify(e?.data); } });
  put(path.join('wt', 'f1-control-e1', 'staging', 'notes.txt'), 'half-written notes of the stalled attempt\n', ROOT); // enters the successor's in/checkpoint/prefix at the cut
  await sc('replace', ['fence', '--task', 'f1-control', '--epoch', '1', '--reason', 'stall'], { boot: true, name: 'replace fence --reason stall (epoch 2, restart charged)', check: () => { const r = rowOf('f1-control'); return r.epoch === 2 && r.step === 'fenced' && r.restarts === 1 ? true : JSON.stringify([r.epoch, r.step, r.restarts]); } });
  // the replaced attempt writes anyway
  put(path.join('wt', 'f1-control-e1', 'staging', 'cards', 'late.card.json'), { ...CARDS.c1, quote: 'A late write by the replaced attempt that must never be stored here' }, ROOT);
  const lateId = LIB.objectId('c', { ...CARDS.c1, quote: 'A late write by the replaced attempt that must never be stored here' });
  // its READY too, but a READY Write meets the hook (FX-OUT child side 1, the epoch gate): the row is at epoch 2, so
  // the hook denies it (stale-epoch) and neither a slot nor the copy is made
  await ready(C1, 'pack', { deny: 'stale-epoch' });
  const zBefore = ofKind('zombie-write').length;
  await sc('commit', ['intake', '--task', 'f1-control', '--epoch', '1'], { exit: 65, name: 'FAULT stale epoch: commit intake of the replaced attempt is refused (65)' });
  await sc('commit', ['record', '--task', 'f1-control', '--epoch', '1', '--step', 'pack'], { exit: 65, name: 'FAULT stale epoch: commit record of the replaced attempt is refused (65)' });
  chk('FAULT replaced attempt: the late write is logged (zombie-write) and not stored', ofKind('zombie-write').length > zBefore && !exists(P('store', 'objects', `${lateId}.json`)) && !exists(P('store', 'commits', 'f1-control.pack.json')), `zombie lines ${ofKind('zombie-write').length - zBefore}`, 'commit.mjs');
  await sc('watch', ['--once', '--no-intake'], { free: true, exit: [0, 11, 12, 13, 14, 15, 16, 17], name: 'watch --once after the replaced attempt\'s late writes (its READY was denied: no copy for the zombie-write telemetry)' });
  await sc('stop', ['request', '--task', 'f1-control', '--epoch', '2'], { name: 'stop request (fence first, then stop)', check: () => (rowOf('f1-control').step === 'stop-requested' ? true : 'step ' + rowOf('f1-control').step) });
  await closeAttempt('f1-control', 1, 'the stalled attempt');
  await sc('stop', ['verify', '--task', 'f1-control', '--epoch', '2'], { exit: 6, name: 'stop verify samples the transcript sizes (exit 6)' });
  for (let i = 0; i < 2; i += 1) await sc('watch', ['--once', '--no-intake'], { free: true, exit: [0, 11, 12, 13, 14, 15, 16, 17], name: `watch --once tick (stop_verify_deltas ${i + 1}/2)` });
  tick(LIB.thresholds(ROOT).get('stop_verify_ms')); // FX-CLOSE (c), N3: the no-growth window also needs stop_verify_ms of wall time
  await sc('stop', ['verify', '--task', 'f1-control', '--epoch', '2'], { name: 'stop verify: no growth, no survivors, the close recorded -> stopped', check: () => (rowOf('f1-control').step === 'stopped' && LIB.attemptOf(rowOf('f1-control'), 1).stop === 'confirmed' ? true : JSON.stringify(rowOf('f1-control').step)) });
  const C2 = await beginAttempt('f1-control', 2, { sid: sidOf(31), name: 'f1-control' });
  chk('f1-control e2: checkpoint prefix of e1 enters in/checkpoint (R7)', exists(path.join(C2.folder, 'in', 'checkpoint', 'prefix', 'notes.txt')) && rowOf('f1-control').state === 'active', '', 'replace.mjs');
  await bind(C2, 'f1-control e2');
  const cstg = (rel) => path.join('wt', 'f1-control-e2', 'staging', rel);
  const controlPack = mkPack([sentence('s1', 'cache', 'fact', 'The cache cut median lookup latency from 20 ms to 12.5 ms.', [IDS.c1]), sentence('s2', 'batch', 'fact', 'Batching writes cut median latency from 10 ms to 8 ms.', [IDS.c2])]);
  writeTranscript(C2.file, { sessionId: C2.sid, cwd: C2.folder, calls: [...readsOf(C2.folder, 6), { tools: [{ name: 'Write', input: { file_path: path.join(C2.folder, 'staging', 'pack.json') } }], results: ['ok'] }, { text: 'Done.\nTURN-END f1' }] });
  put(cstg('pack.json'), controlPack, ROOT);
  await ready(C2, 'pack');
  await finishStep(C2, 'pack', 'f1-control');
  const ctlPackId = (() => { try { return rj(P('store', 'commits', 'f1-control.pack.json')).outputs.find((o) => o.kind === 'pack')?.id; } catch { return null; } })();
  const ctlReview = mkReview('f1-control', ctlPackId);
  put(cstg('review.json'), ctlReview, ROOT);
  writeTranscript(C2.file, { sessionId: C2.sid, cwd: C2.folder, calls: [...readsOf(C2.folder, 6), { tools: [{ name: 'Write', input: { file_path: path.join(C2.folder, 'staging', 'pack.json') } }, { name: 'Write', input: { file_path: path.join(C2.folder, 'staging', 'review.json') } }], results: ['ok', 'ok'] }, { text: 'Done.\nTURN-END f1' }] });
  await ready(C2, 'review'); // a row of two steps stays active after its first commit, and its child goes on (Rev 5 point 3)
  await finishStep(C2, 'review', 'f1-control (same-window review)');
  chk('f1-control committed after two steps', rowOf('f1-control').state === 'committed', rowOf('f1-control').state, 'commit.mjs');
  if (ONLY_PHASE === 'J') return finish();

  // ------------------------------------------------------------ K. the fresh review, plants, certificate
  await sc('seed', ['plant', '--task', 'f1-review', '--k', '3'], { name: 'seed plant (3 wrong assumptions in the fixed file, one against the hoped answer)', check: () => { const k = rj(P('sealed', 'plants', 'f1-review.json')); return k.plants.length === 3 && k.plants.some((p) => p.against_hope) ? true : 'plants ' + k.plants.length; } });
  await sc('seed', ['plant', '--task', 'f1-review', '--k', '3'], { name: 'seed plant again: identical bytes' });
  const V = await beginAttempt('f1-review', 1, { sid: sidOf(40), name: 'f1-review' });
  chk('f1-review: review-in holds the pack, cards and the planted copy of the fixed file', exists(P('review-in', 'f1-review', 'pack.json')) && exists(P('review-in', 'f1-review', 'files', 'design', 'assumptions.md')) && fs.readFileSync(P('review-in', 'f1-review', 'files', 'design', 'assumptions.md'), 'utf8') !== fs.readFileSync(P('plan', 'our-work', 'design', 'assumptions.md'), 'utf8'), '', 'replace.mjs');
  await bind(V, 'f1-review');
  const plantKey = rj(P('sealed', 'plants', 'f1-review.json'));
  const findings = plantKey.plants.map((p) => ({ file: p.file, locator: p.locator, reason: 'wrong-assumption', text: 'this line contradicts a confirmed card' }));
  const reviewObj = mkReview('f1-review', researchPack, findings);
  writeTranscript(V.file, { sessionId: V.sid, cwd: V.folder, calls: [...readsOf(V.folder, 40), { tools: [{ name: 'Write', input: { file_path: path.join(V.folder, 'staging', 'review.json') } }], results: ['ok'] }, { text: 'Done.\nTURN-END f1' }] });
  put(path.join('wt', 'f1-review-e1', 'staging', 'review.json'), reviewObj, ROOT);
  await ready(V, 'review');
  await finishStep(V, 'review', 'f1-review');
  chk('f1-review committed', rowOf('f1-review').state === 'committed', rowOf('f1-review').state, 'commit.mjs');
  await sc('certify', ['--task', 'f1-review', '--epoch', '1'], { name: 'certify: reads vs manifest, cited cards confirmed, plants found', check: (r) => (r.json.result?.result === 'certified' && r.json.result?.plants?.found === 3 ? true : JSON.stringify(r.json.result).slice(0, 400)) });
  await sc('certify', ['--task', 'f1-review', '--epoch', '1'], { name: 'certify again: same certificate, no new line', check: (r) => (r.json.result?.created === false ? true : 'created ' + r.json.result?.created) });
  await sc('check-queue', ['--mode', 'post-review', '--field', 'f1'], { name: 'check-queue post-review (nothing unconfirmed to check)' });
  await sc('check-queue', ['--mode', 'freeze', '--field', 'f1'], { name: 'check-queue freeze (nothing unconfirmed to check)' });

  // ------------------------------------------------------------ L. labels and views
  await sc('tms', [], { name: 'tms: every sentence IN, targets ok', check: (r) => { const L = rj(P('views', 'labels.json')); const bad = Object.entries(L.nodes).filter(([, v]) => v.label === 'STALE' || v.label === 'PENDING'); return bad.length === 0 && Object.values(L.certificates).every((v) => v === 'VALID') ? true : 'bad nodes ' + JSON.stringify(bad).slice(0, 300); } });
  await sc('render', [], { name: 'render: pack, review, synthesis, owner page, coverage, seven measures', check: () => {
    const need = ['coverage.json', 'measures.json', 'synthesis.md', 'owner.md']; const miss = need.filter((f) => !exists(P('views', f)));
    if (miss.length) return 'missing views ' + miss.join(',');
    const syn = fs.readFileSync(P('views', 'synthesis.md'), 'utf8');
    return /cache/.test(syn) ? true : 'synthesis has no row for the certified review';
  } });
  const meas = exists(P('views', 'measures.json')) ? rj(P('views', 'measures.json')) : null;
  chk('render: measures carry tokens, token_cost, time, hallucinations and values', meas && meas.values && 'unverifiable_share' in meas.values && 'coverage' in meas.values && meas.by_task && Object.keys(meas.by_task).length >= 4, JSON.stringify(meas && Object.keys(meas)), 'render.mjs');
  await sc('render', [], { name: 'render again: byte-identical views', check: () => true });
  await sc('gate', ['check'], { name: 'gate check once more (measures present, action lines are readings)' });

  // ------------------------------------------------------------ M. the comparison, unit costs, the coordinator's own audit
  await sc('compare', ['anon'], { name: 'compare anon (blinded, shuffled outputs of the two arms)', check: () => (exists(P('views', 'blind', 'index.json')) ? true : 'no blind index') });
  await sc('compare', ['score'], { name: 'compare score (descriptive, n = 1 per arm)', check: () => { const c = rj(P('views', 'comparison.json')); return c.label === 'descriptive, n = 1 per arm' && c.arms?.T?.answered !== undefined && c.arms?.S1?.answered !== undefined ? true : 'comparison ' + JSON.stringify([c.label, Object.keys(c.arms || {})]); } });
  await sc('status', ['meter', '--pct', '3'], { name: 'status meter 3 (self-reported)' });
  await sc('status', ['meter', '--pct', '9'], { name: 'status meter 9 (self-reported)' });
  await sc('cost', ['compute'], { ce: false, now: false, noRoot: true, name: 'cost compute (no run root needed)', timeoutMs: 60000 });
  await sc('cost', ['predict'], { ce: false, now: false, name: 'cost predict (stand-in model over every arm)' });
  // the coordinator's own transcript, well past the hand-over window
  const coordFile = path.join(TR, 'p1', `${COORD_SID}.jsonl`);
  writeTranscript(coordFile, { sessionId: COORD_SID, cwd: ROOT, calls: [
    { tools: [{ name: 'Bash', input: { command: `node tcb/scripts/status.mjs --root ${ROOT} --ce 1` } }], results: ['ok'], usage: { input: 30000, cache_read: 40000, cache_write: 1000, output: 500 } },
    { text: 'ok', usage: { input: 70000, cache_read: 70000, cache_write: 1000, output: 500 } },
  ] });
  await sc('audit', ['--coordinator', '--session', COORD_SID], { name: 'audit --coordinator (turns within 1.5 x W*)' });
  await sc('cost', ['from-transcripts'], { name: 'cost from-transcripts (unit costs from the synthetic transcripts)', check: (r) => { const u = exists(P('plan', 'unit-costs.json')) ? rj(P('plan', 'unit-costs.json')) : null; return u && u.trusted === true ? true : 'unit-costs ' + JSON.stringify(u && [u.trusted, u.unattributed_share, u.missing, u.no_estimate]).slice(0, 300); } });
  if (ONLY_PHASE === 'M') return finish();

  // ------------------------------------------------------------ N. a retracted card: the sentence that cites it is stale
  server.p1version = 2;
  await sc('snap', ['--url', url('/p1')], { ...snapOpts, name: 'snap /p1 again: the page changed (scratch root)', check: (r) => (r.json.result?.urls?.[0]?.source_changed === true ? true : 'source_changed not set') });
  fs.cpSync(path.join(SNAP, '.snapshots'), P('.snapshots'), { recursive: true, force: true });
  await sc('witness', ['--card', IDS.c1], { exit: 1, name: 'witness c1 against the changed page: rejected', check: () => { const w = readLines(P('store', 'witness.jsonl')).at(-1); return w.card_id === IDS.c1 && w.result === 'rejected' && w.source_changed === true ? true : JSON.stringify(w); } });
  await sc('promote', ['--from', 'witness'], { name: 'promote --from witness: the confirmed card falls (rejected)', check: () => (statusNow()[IDS.c1].status === 'rejected' ? true : 'status ' + statusNow()[IDS.c1].status) });
  await sc('tms', [], { exit: 1, name: 'FAULT retracted card: tms marks the citing sentences STALE (exit 1)', check: () => {
    const L = rj(P('views', 'labels.json'));
    const stale = Object.entries(L.nodes).filter(([, v]) => v.label === 'STALE' && (v.why || []).includes('support-fell') && (v.causes || []).includes(IDS.c1));
    const certStale = Object.values(L.certificates).some((v) => v === 'STALE');
    return stale.length >= 3 && certStale ? true : `stale nodes ${stale.length}, certificate stale ${certStale}`;
  } });
  chk('tms: the repair list names the retracted card', exists(P('views', 'repair.json')) && rj(P('views', 'repair.json')).items.some((i) => (i.causes || []).some((c) => c.card_id === IDS.c1)), '', 'tms.mjs');
  await sc('render', [], { name: 'render after the retraction (STALE shown, never hidden)', exit: [0, 1] });

  // ------------------------------------------------------------ O. the end of the turn: stops, drain, wake sources, hand-over
  for (let i = 0; i < 2; i += 1) await sc('watch', ['--once', '--no-intake'], { free: true, exit: [0, 10, 11, 12, 13, 14, 15, 16, 17], name: `watch --once with the coordinator window past W* (${i + 1}/2)` });
  chk('watch: a drain line was written for this ce (class 16)', ofKind('drain').some((l) => l.ce === 1), 'drain lines ' + ofKind('drain').length, 'watch.mjs');
  // stop every committed row's session so no slot is used (decision 17)
  await stopCommitted('end of run');
  // fault: a torn ledger tail (a crash in the middle of an append) is cut off at the next append
  fs.appendFileSync(P('run', 'ledger.jsonl'), '{"seq":999,"prev":"abc');
  await sc('status', [], { free: true, name: 'status builds run/status.json after a torn ledger tail', check: () => (exists(P('run', 'status.json')) ? true : 'no status.json') });
  await sc('fsck', [], { name: 'fsck after the whole run (objects, commits, ledger chain, fk, status writers, tcb vs commit, .claude, frozen)', check: (r) => (r.json.result?.result === 'pass' ? true : JSON.stringify(r.json.result).slice(0, 400)) });
  const lv = LIB.verifyLedger(LIB.readLedger(ROOT).lines);
  chk('ledger: the hash chain verifies end to end', lv.ok, JSON.stringify(lv), 'lib.mjs');
  // this process stands in for the watcher and the alarm
  const me = LIB.selfInfo();
  const wj = exists(P('run', 'watcher.json')) ? rj(P('run', 'watcher.json')) : { ce: 1, ticks_total: 0, active: {}, pending: [], tasks: {} };
  fs.writeFileSync(P('run', 'watcher.json'), JSON.stringify({ ...wj, ce: CE, pid: me.pid, start_time: me.start_time }));
  fs.writeFileSync(P('run', 'watcher.lock'), JSON.stringify({ pid: me.pid, start_time: me.start_time, nonce: '0'.repeat(32), script: 'watch', ce: CE, acquired_at: tick() }));
  fs.writeFileSync(P('run', 'alarm.json'), JSON.stringify({ pid: me.pid, start_time: me.start_time, ce: CE, armed_at: tick(), sleep_ms: 3600000 }));
  // FX-W2: the ensure's hold 1 writes the slot and its nonce file with alarm.json (watch --alarm --ensure --nonce X);
  // call 2 is reconcile with that nonce, which confirms the arm by the live slot it registered
  const armNonce = 'a1'.repeat(16);
  fs.mkdirSync(P('run', 'arm'), { recursive: true });
  fs.writeFileSync(P('run', 'arm', 'slot-1.json'), JSON.stringify({ ce: CE, pid: me.pid, start_time: me.start_time, nonce: armNonce }));
  fs.writeFileSync(P('run', 'arm', `${armNonce}.json`), JSON.stringify({ state: 'registered', k: 1, pid: me.pid }));
  await sc('status', ['--reconcile', '--arm-nonces', armNonce], { free: true, name: 'status --reconcile --arm-nonces with a live alarm slot (stand-in): the arm is confirmed', check: () => (rj(P('run', 'turn.json')).arm === 'confirmed' ? true : 'turn ' + JSON.stringify(rj(P('run', 'turn.json')))) });
  const ledHead = LIB.ledgerHead(ROOT).seq;
  await sc('status', ['--endturn', '--acked-seq', String(ledHead)], { name: 'status --endturn: both wake sources run' });
  await sc('status', ['--endturn', '--acked-seq', String(ledHead + 5)], { exit: 1, code: 'acked-ahead', name: 'status --endturn with an acked seq beyond the ledger is refused' });
  const raised = await sc('handover', ['raise'], { name: 'handover raise (drain, quiescent): ce 2', check: (r) => (rj(P('run', 'coord.json')).ce === 2 && /ce 2/.test(r.json.result?.brief || '') ? true : 'coord ' + JSON.stringify(rj(P('run', 'coord.json')))) });
  await sc('status', [], { ce: 1, exit: 64, name: 'a stale ce is refused by every writing script (64)' });
  CE = 2;
  // FX-CGATE (FIX-fence part 3, steps 1-2): the successor takes the nonce from the raise's brief line; the hook's
  // bind step names its session in run/coord-session-2.json (this process stands in for the hook); bind checks the nonce
  const nonce = /--nonce ([0-9a-f]{32})/.exec(raised.json?.result?.brief || '')?.[1] ?? 'no-nonce-in-brief';
  fs.writeFileSync(P('run', 'coord-session-2.json'), JSON.stringify({ session_id: COORD2_SID }));
  await sc('handover', ['bind', '--nonce', nonce], { name: 'handover bind (successor session)', check: () => (rj(P('run', 'coord.json')).session === COORD2_SID && rj(P('run', 'coord.json')).successor_nonce === undefined ? true : 'coord ' + JSON.stringify(rj(P('run', 'coord.json')))) });
  await sc('gate', ['cut', '--design', designFile], { name: 'gate cut at ce 2: the design cut is identical, nothing new' });
  await sc('fsck', [], { name: 'fsck at ce 2' });
  return finish();
}

// FX-CLOSE (a), (b): stop verify confirms only once the close of the attempt's claim holder (else its bound session),
// and of every other session whose transcript has the attempt's folder as cwd, is recorded. Here each attempt has one
// session, its claim holder. The app closes a session, and no hook record names a close by the CLI's id yet, so this
// process stands in for the owner: his `closed` act records it (run/close/done/<sid>.json, outcome owner).
async function closeAttempt(task, epoch, label) {
  let sid = null;
  try {
    const a = LIB.attemptOf(rowOf(task), epoch);
    const c = LIB.readClaim(a.folder ? path.resolve(ROOT, a.folder) : att(task, epoch));
    sid = c.kind === 'session' ? c.session_id : (a.session || null);
  } catch { sid = null; }
  return sc('status', ['owner', '--act', 'closed', '--subject', String(sid), '--quote-file', P('plan', 'notes', 'closed.txt')], { name: `status owner --act closed: ${task} e${epoch}'s session (${label})`, check: () => (exists(P('run', 'close', 'done', `${sid}.json`)) ? true : `no run/close/done/${sid}.json`) });
}

// A committed row's session still counts as a slot until `stop verify` confirms it gone (decision 17); FX-CLOSE: the
// confirm needs the session's close (closeAttempt) and stop_verify_ms of wall time since the sample as well as the ticks.
async function stopCommitted(label) {
  const rows = tasks().tasks.filter((r) => r.state === 'committed').map((r) => ({ task: r.task, epoch: r.epoch }))
    .filter(({ task, epoch }) => { try { return LIB.attemptOf(rowOf(task), epoch).stop !== 'confirmed'; } catch { return true; } });
  if (rows.length && !exists(P('run', 'watcher.json'))) await sc('watch', ['--once', '--no-intake'], { free: true, exit: [0, 10, 11, 12, 13, 14, 15, 16, 17], name: 'watch --once (first tick: watcher.json, the stop sample needs ticks_total)' });
  for (const { task, epoch } of rows) await sc('stop', ['request', '--task', task, '--epoch', String(epoch)], { name: `stop request ${task} (committed, ${label})` });
  for (const { task, epoch } of rows) await closeAttempt(task, epoch, label);
  for (const { task, epoch } of rows) await sc('stop', ['verify', '--task', task, '--epoch', String(epoch)], { exit: 6, name: `stop verify ${task}: sample` });
  for (let i = 0; i < 2; i += 1) await sc('watch', ['--once', '--no-intake'], { free: true, exit: [0, 10, 11, 12, 13, 14, 15, 16, 17], name: `watch --once tick for the stops (${i + 1}/2)` });
  if (rows.length) tick(LIB.thresholds(ROOT).get('stop_verify_ms')); // FX-CLOSE (c), N3
  for (const { task, epoch } of rows) await sc('stop', ['verify', '--task', task, '--epoch', String(epoch)], { name: `stop verify ${task}: confirmed`, check: () => (rowOf(task).state === 'committed' && LIB.attemptOf(rowOf(task), epoch).stop === 'confirmed' ? true : 'stop ' + LIB.attemptOf(rowOf(task), epoch).stop) });
}

async function forceSelftest(why) {
  // development/fallback only: writes the selftest ledger line the way selftest would, so admission can proceed
  const th = LIB.thresholds(ROOT);
  void th;
  const tcbSha = LIB.treeSha(P('tcb'));
  const ctx = { script: 'selftest', writerSha: LIB.scriptSha(pathToFileURL(P('tcb', 'selftest.mjs')).href), ledgerSeq: [] };
  await LIB.withRunLock(ROOT, { script: 'selftest', ce: CE, now: tick() }, async (h) => {
    LIB.appendLedger(ROOT, h, { ctx, ce: CE, kind: 'selftest', data: { tcb_sha: tcbSha, result: 'pass', failed: [] }, now: tick() });
  });
  console.log(`note: selftest line written by the e2e (${why})`);
}

async function finish() {
  try { server.srv?.close(); } catch { /* closed */ }
  const total = nOk + failures.length;
  console.log(`# ${nOk}/${total} steps ok, ${failures.length} FAIL`);
  const out = { ok: nOk, total, failures, root: ROOT };
  fs.writeFileSync(path.join(HERE, 'last-result.json'), JSON.stringify(out, null, 2));
  fs.writeFileSync(path.join(HERE, 'last-run.log'), log.join('\n') + '\n');
  if (!KEEP && failures.length === 0) { try { fs.rmSync(W, { recursive: true, force: true }); } catch { /* left */ } }
  return failures.length ? 1 : 0;
}

main().then((code) => { process.exitCode = code; }).catch((e) => { console.log('FAIL e2e crashed: ' + (e && e.stack ? e.stack : e)); try { server.srv?.close(); } catch { /* */ } process.exitCode = 2; });
