// Tests of tcb/replace.mjs, written from spec/replace.mjs.md and CONTRACT.md only.
// Every test runs the script as a child process against its own temporary run root.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as lib from '../lib.mjs';
import { spawn as _hSpawn, execFileSync as _hExec } from 'node:child_process';
// CONTRACT 4.11 test helpers. tcb/test/helpers.mjs is used when it exists; until it is written, this
// stand-in (the same one tcb/test/lib.test.mjs carries, made synchronous because 4.11 gives plain
// return values and this file calls the helpers without await) takes its place.
const HELPERS_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'helpers.mjs');
const helpers = fs.existsSync(HELPERS_FILE) ? await import(new URL('./helpers.mjs', import.meta.url).href) : standinHelpers();

function standinHelpers() {
  const HERE_H = path.dirname(fileURLToPath(import.meta.url));
  const TCB = path.resolve(HERE_H, '..');
  const TMPROOT = path.resolve(HERE_H, '..', '..', 'tmp');
  const PS_EXE = 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
  const DIRS = [
    'tcb', 'plan', 'plan/frozen', 'run', 'run/intents', 'run/audit', 'run/stop-sample', 'store', 'store/objects', 'store/commits',
    'store/status', 'views', 'queue', 'review-in', 'completeness', 'sealed', 'sealed/seeds', 'sealed/plants', 'sealed/heldout',
    'sealed/blind', '.snapshots', '.snapshots/raw', '.snapshots/text', '.snapshots/meta', '.snapshots/by-url', 'wt', 'transcripts',
  ];
  const BASE_TS = Date.parse('2026-11-17T10:00:00.000Z');
  const tsOf = (i) => new Date(BASE_TS + i * 1000).toISOString();

  function makeRoot({ thresholds: thr, tasks = [], ce = 1 } = {}) {
    fs.mkdirSync(TMPROOT, { recursive: true });
    const root = fs.mkdtempSync(path.join(TMPROOT, 'tcbrt-'));
    for (const d of DIRS) fs.mkdirSync(path.join(root, ...d.split('/')), { recursive: true });
    for (const d of ['schemas', 'profiles', 'settings', 'agents', 'briefs']) {
      const src = path.join(TCB, d);
      if (fs.existsSync(src)) fs.cpSync(src, path.join(root, 'tcb', d), { recursive: true });
      else fs.mkdirSync(path.join(root, 'tcb', d), { recursive: true });
    }
    const doc = JSON.parse(fs.readFileSync(path.join(TCB, 'thresholds.json'), 'utf8'));
    doc.params = doc.params || {};
    const setParam = (name, v) => {
      if (v && typeof v === 'object' && !Array.isArray(v) && 'value' in v) doc.params[name] = v;
      else doc.params[name] = { ...(doc.params[name] || { unit: 'test', source: 'guess', gate: false }), value: v };
    };
    setParam('transcripts_root', path.join(root, 'transcripts'));
    for (const [k, v] of Object.entries(thr || {})) setParam(k, v);
    fs.writeFileSync(path.join(root, 'tcb', 'thresholds.json'), JSON.stringify(doc, null, 2));
    fs.writeFileSync(path.join(root, 'run', 'coord.json'), JSON.stringify({ schema_version: 1, ce, started_at: '2026-11-17T09:00:00.000Z', tcb_commit: '0'.repeat(40) }));
    fs.writeFileSync(path.join(root, 'run', 'tasks.json'), JSON.stringify({ schema_version: 1, rev: 0, tasks }));
    return { root, cleanup: () => fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }) };
  }

  function fakeTranscript(file, { sessionId, cwd, calls = [], structured } = {}) {
    const recs = [];
    let t = 0;
    let n = 0;
    const base = { sessionId, cwd };
    recs.push({ ...base, type: 'user', timestamp: tsOf(t++), uuid: `u-${n++}`, message: { role: 'user', content: 'synthetic start' } });
    calls.forEach((c, i) => {
      const id = `msg_fake_${i}`;
      const u = c.usage || {};
      const usage = {
        input_tokens: u.input_tokens ?? u.input ?? 0,
        cache_read_input_tokens: u.cache_read_input_tokens ?? u.cache_read ?? 0,
        cache_creation_input_tokens: u.cache_creation_input_tokens ?? u.cache_write ?? 0,
        output_tokens: u.output_tokens ?? u.output ?? 0,
      };
      const blocks = [];
      if (typeof c.text === 'string') blocks.push({ type: 'text', text: c.text });
      (c.tools || []).forEach((tl, j) => blocks.push({ type: 'tool_use', id: `toolu_fake_${i}_${j}`, name: tl.name, input: tl.input ?? {} }));
      if (!blocks.length) blocks.push({ type: 'text', text: '' });
      const ts = tsOf(t++);
      for (const b of blocks) recs.push({ ...base, type: 'assistant', timestamp: ts, uuid: `u-${n++}`, message: { id, model: 'claude-test', role: 'assistant', content: [b], usage } });
      if (Array.isArray(c.results) && c.results.length) {
        const content = c.results.map((r, j) => {
          const o = typeof r === 'string' ? { text: r } : r || {};
          return { type: 'tool_result', tool_use_id: o.toolUseId ?? `toolu_fake_${i}_${j}`, is_error: o.isError === true, content: o.text ?? '' };
        });
        recs.push({ ...base, type: 'user', timestamp: tsOf(t++), uuid: `u-${n++}`, message: { role: 'user', content } });
      }
    });
    if (structured !== undefined) recs.push({ ...base, type: 'attachment', timestamp: tsOf(t++), uuid: `u-${n++}`, attachment: { type: 'structured_output', data: structured } });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, recs.map((r) => JSON.stringify(r)).join('\n') + '\n');
    return file;
  }

  // A `node -e` child this test owns; its start time is read once from PowerShell (the form proc.list() reports).
  function spawnSleeper({ args = [] } = {}) {
    const child = _hSpawn(process.execPath, ['-e', 'setInterval(()=>{},1000)', ...args], { stdio: 'ignore', windowsHide: true });
    const exited = new Promise((res) => child.once('exit', res));
    let start_time = null;
    try {
      const out = _hExec(PS_EXE, ['-NoProfile', '-NonInteractive', '-Command',
        `[Console]::OutputEncoding=[Text.Encoding]::UTF8; $x=Get-CimInstance Win32_Process -Filter 'ProcessId=${child.pid}'; if($x -and $x.CreationDate){$x.CreationDate.ToUniversalTime().ToString('o')}`],
      { encoding: 'utf8', windowsHide: true, timeout: 60000 });
      start_time = String(out).replace(/^\uFEFF/, '').trim() || null;
    } catch {
      start_time = null;
    }
    let killed = false;
    return {
      pid: child.pid,
      start_time,
      kill: () => {
        if (!killed) {
          killed = true;
          try { child.kill(); } catch { /* gone */ }
        }
        return child.exitCode === null && child.signalCode === null ? exited : Promise.resolve();
      },
    };
  }

  function fakeProc(table = []) {
    const rows = Array.isArray(table) ? table : [];
    return {
      list: () => rows.map((r) => ({ ...r })),
      alive: (pid, st) => rows.some((r) => r.pid === pid && (st == null || r.start_time === st)),
      boot: () => '2026-11-17T08:00:00.0000000Z',
    };
  }

  return { makeRoot, fakeTranscript, spawnSleeper, fakeProc };
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, '..', 'replace.mjs');
const FIX = path.join(HERE, '..', 'fixtures', 'replace');
const TMP = path.resolve(HERE, '..', '..', 'tmp');
fs.mkdirSync(TMP, { recursive: true });

// ---------------------------------------------------------------- support
const NOW = '2026-11-17T10:00:00.000Z';
const BOOT_A = 'BOOT-A';
const BOOT_B = 'BOOT-B';
const SID1 = '11111111-1111-4111-8111-111111111111';
const SID2 = '22222222-2222-4222-8222-222222222222';
const RES = 'f1-research';
const REV = 'f1-review-r1';
const SLUG = { 0: 'ok', 1: 'fail', 2: 'not-run', 3: 'tamper', 5: 'ready-wins', 6: 'deferred', 64: 'stale-ce', 65: 'stale-epoch', 66: 'usage', 67: 'table-corrupt', 70: 'internal', 75: 'lock-busy' };

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
function canon(v) {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
const at = (root, rel) => path.join(root, ...rel.split('/'));
const has = (root, rel) => fs.existsSync(at(root, rel));
const read = (root, rel) => fs.readFileSync(at(root, rel));
const readJ = (root, rel) => JSON.parse(fs.readFileSync(at(root, rel), 'utf8'));
function put(root, rel, data) {
  const f = at(root, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, data);
  return f;
}
const putJ = (root, rel, v) => put(root, rel, JSON.stringify(v, null, 1));

function walkRel(dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walkRel(f, base, out);
    else if (e.isFile()) out.push(path.relative(base, f).split(path.sep).join('/'));
  }
  return out.sort();
}
const treeHash = (dir) => sha(JSON.stringify(walkRel(dir).map((r) => [r, sha(fs.readFileSync(path.join(dir, ...r.split('/'))))])));

// FX-W3: a start and a fence `first` create work, so they need an armed turn (lib.armedState: run/turn.json
// of the caller's ce, arm confirmed, slots with no exit marker; files only, no process list). A root here
// is a coordinator's armed turn, as the brief's call 2 leaves it, unless `armed: false`.
const SLOT_PT = { pid: 4242, start_time: '2026-11-20T00:00:00.0000000Z' };
const armedTurn = (ce = 1, o = {}) => ({ ce, turn_seq: 1, read_seq: 0, arm: 'confirmed', slots: [{ k: 1, ...SLOT_PT }], unarmed_turns: 0, ...o });
function mk({ armed = true } = {}) {
  const h = helpers.makeRoot({ ce: 1 });
  if (armed) putJ(h.root, 'run/turn.json', armedTurn(1));
  return { root: h.root, cleanup: () => h.cleanup() };
}

function argv(root, mode, o = {}) {
  const a = [mode, '--root', root];
  if (o.ce !== null) a.push('--ce', String(o.ce ?? 1));
  if (o.task) a.push('--task', o.task);
  if (o.epoch !== undefined) a.push('--epoch', String(o.epoch));
  if (o.reason) a.push('--reason', o.reason);
  if (o.ifUnclaimed) a.push('--if-unclaimed');
  if (o.session) a.push('--session', o.session);
  if (o.tick !== undefined) a.push('--tick', String(o.tick));
  if (o.boot) a.push('--boot', o.boot);
  if (o.freeMb !== undefined) a.push('--free-mb', String(o.freeMb));
  a.push('--now', o.now ?? NOW);
  if (o.dry) a.push('--dry-run');
  return a;
}
// Every stdout is one JSON line of CONTRACT 1.3, whatever the exit.
function parse(r) {
  const lines = r.stdout.split('\n').filter((s) => s.length);
  assert.equal(lines.length, 1, `stdout must be one line, got: ${r.stdout}\nstderr: ${r.stderr}`);
  const j = JSON.parse(lines[0]);
  assert.equal(j.script, 'replace');
  assert.equal(typeof j.ok, 'boolean');
  assert.equal(j.exit, r.status, `exit in the line must be the process exit; stderr: ${r.stderr}`);
  assert.equal(j.code, SLUG[j.exit], 'code is the slug of the exit');
  assert.equal(typeof j.dry_run, 'boolean');
  assert.ok(j.result !== null && typeof j.result === 'object');
  assert.ok(Array.isArray(j.reasons));
  assert.ok(Array.isArray(j.ledger_seq));
  for (const x of j.reasons) assert.equal(typeof x.code, 'string');
  return j;
}
function run(root, mode, o = {}) {
  const r = spawnSync(process.execPath, [SCRIPT, ...argv(root, mode, o)], { encoding: 'utf8', cwd: root, windowsHide: true, timeout: 180000 });
  const j = parse(r);
  j.stderr = r.stderr;
  return j;
}
function runAsync(root, mode, o = {}) {
  return new Promise((resolve) => {
    const c = spawn(process.execPath, [SCRIPT, ...argv(root, mode, o)], { cwd: root, windowsHide: true });
    let out = '';
    let err = '';
    c.stdout.on('data', (d) => (out += d));
    c.stderr.on('data', (d) => (err += d));
    c.on('close', (code) => resolve({ status: code, stdout: out, stderr: err }));
  });
}
const codes = (j) => j.reasons.map((x) => x.code);
function expectExit(j, exit, reason) {
  assert.equal(j.exit, exit, `expected exit ${exit}, got ${j.exit}: ${JSON.stringify(j.reasons)}`);
  if (reason) assert.ok(codes(j).includes(reason), `expected reason ${reason}, got ${JSON.stringify(j.reasons)}`);
}

// ledger written by the test (hash chain of CONTRACT 3.7)
function led(root, kind, { task, epoch, data = {}, ce = 1 } = {}) {
  const f = at(root, 'run/ledger.jsonl');
  let prev = '0'.repeat(64);
  let seq = 0;
  if (fs.existsSync(f)) {
    const ls = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean);
    if (ls.length) {
      const last = JSON.parse(ls[ls.length - 1]);
      prev = last.hash;
      seq = last.seq;
    }
  }
  const line = { seq: seq + 1, prev, ts: '2026-11-17T09:00:00.000Z', ce, writer: 'test', writer_sha: sha('test'), kind, data };
  if (task !== undefined) line.task = task;
  if (epoch !== undefined) line.epoch = epoch;
  line.hash = sha(prev + canon(line));
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.appendFileSync(f, JSON.stringify(line) + '\n');
  return line.seq;
}
const ledgerLines = (root) => (has(root, 'run/ledger.jsonl') ? read(root, 'run/ledger.jsonl').toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const ofKind = (root, k) => ledgerLines(root).filter((l) => l.kind === k);
async function assertLedgerVerifies(root) {
  const L = await lib.readLedger(root);
  const v = await lib.verifyLedger(L.lines);
  assert.ok(v.ok, 'ledger must verify: ' + JSON.stringify(v));
}

// task table
const row = (task, o = {}) => ({
  task, field: 'f1', stage: 'research', role: 'child', steps: ['pack'], deps: [], question_ids: ['f1-a-01', 'f1-a-02'], e_task: 50000, tier: 'sonnet',
  state: 'planned', step: 'none', epoch: 0, reason: null, session: null, restarts: 0, handovers: 0, parks: 0, limit: false, fails: [], attempts: [], commits: {}, updated_rev: 1, ...o,
});
const att = (task, e, o = {}) => ({ epoch: e, folder: `wt/${task}-e${e}`, stop: 'none', ...o });
const table = (root, rows, rev = 1) => {
  // FX-CLAIM: a bound attempt holds its session's claim (bind requires one)
  for (const r of rows) {
    for (const a of r.attempts ?? []) {
      if (a && a.session && a.bound_at && a.folder && !has(root, `${a.folder}/claim.json`)) putJ(root, `${a.folder}/claim.json`, { kind: 'session', session_id: a.session });
    }
  }
  return putJ(root, 'run/tasks.json', { schema_version: 1, rev, tasks: rows });
};
const getTable = (root) => readJ(root, 'run/tasks.json');
const getRow = (root, task) => getTable(root).tasks.find((r) => r.task === task);
const attemptOf = (r, e) => r.attempts.find((a) => a.epoch === e);
const M0 = 'm_' + '0'.repeat(16);
const Z64 = '0'.repeat(64);
const startRow = (o = {}) => row(RES, { state: 'active', step: 'stopped', epoch: 1, reason: 'first', attempts: [att(RES, 1)], ...o });
const boundRow = (o = {}) =>
  row(RES, { state: 'active', step: 'bound', epoch: 1, reason: 'first', session: SID1, attempts: [att(RES, 1, { session: SID1, bound_at: '2026-11-17T08:00:00.000Z', boot: BOOT_A, manifest: M0, settings_sha: Z64 })], ...o });
// FX-OUT: the READY of attempt e as the hook records it, a ready slot in its outcome log (READY.json is a copy).
const readySlot = (root, task, e, step = 'pack', j = 0) => put(root, `wt/${task}-e${e}/outcome/${j}.json`, lib.outcomeSlotBytes({ kind: 'ready', task, epoch: e, step }));
const folderAbs = (root, task, e) => path.join(root, 'wt', `${task}-e${e}`);

function setThr(root, patch) {
  const f = at(root, 'tcb/thresholds.json');
  const t = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : JSON.parse(fs.readFileSync(path.join(HERE, '..', 'thresholds.json'), 'utf8'));
  for (const [k, v] of Object.entries(patch)) t.params[k] = { ...(t.params[k] ?? { unit: 'test', source: 'guess', gate: false }), value: v };
  putJ(root, 'tcb/thresholds.json', t);
}
const u = (i, cr, cw, o) => ({ input: i, cache_read: cr, cache_write: cw, output: o, input_tokens: i, cache_read_input_tokens: cr, cache_creation_input_tokens: cw, output_tokens: o });
function fakeT(root, sid, cwd, usages, rel = `proj/${sid}.jsonl`) {
  const f = path.join(root, 'transcripts', ...rel.split('/'));
  fs.mkdirSync(path.dirname(f), { recursive: true });
  helpers.fakeTranscript(f, { sessionId: sid, cwd, calls: usages.map((usage) => ({ usage, tools: [] })) });
  return f;
}

// ---- a synthetic run root that admission accepts (roles, protocol, cut, gate, selftest, fsck)
const BRIEF = (role) => `# Synthetic brief ${role}\nTask {{task}} epoch {{epoch}} field {{field}} role {{role}}\nFolder {{folder}}\nTodo {{todo_json}}\nCheckpoint {{checkpoint_json}}\nMust read {{must_read_json}}\nTURN-END {{field}}\n`;
function roleFiles(root, briefs = {}) {
  const prof = (role, types) => ({ role, tools_allow: ['Read', 'Write', 'Edit'], tools_deny: ['Bash'], read_prefixes: ['{attempt}/'], write_prefixes: ['{attempt}/staging/'], agent_types: types, fetch: 'none', bash: 'none' });
  const sets = (role) => ({ hooks: { PreToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: `"{node}" "{root}/tcb/guard-hook.mjs" --root "{root}" --role ${role} --task {task} --epoch {epoch}`, timeout: 30 }] }] } });
  for (const [role, types] of Object.entries({ child: ['reader'], 'fresh-reviewer': [], mapper: [], stpa: [], fmea: [] })) {
    putJ(root, `tcb/profiles/${role}.json`, prof(role, types));
    putJ(root, `tcb/settings/${role}.json`, sets(role));
    put(root, `tcb/briefs/${role}.md`, briefs[role] ?? BRIEF(role));
  }
  put(root, 'tcb/briefs/reader.md', 'Synthetic reader brief for tests.\n');
  put(root, 'tcb/agents/reader.md', '---\nname: reader\ndescription: synthetic reader\ntools: Read\n---\nSynthetic reader brief for tests.\n');
}
const PROTOCOL = (extra = {}) => ({
  schema_version: 1, kind: 'protocol', field: 'f1', question_ids: ['f1-a-01', 'f1-a-02'], criteria: { include: [{ code: 'i1', text: 'in' }], exclude: [{ code: 'x1', text: 'out' }] },
  routes: ['keyword'], card_schema_version: 1, certainty_method: 'plain', sesoi: { m_one: 0.1 }, outlist_vocab: { approaches: ['ap_one'], measures: ['m_one'], effects: ['improves'] },
  seeds: [], must_read: [{ url: 'https://Example.org/Paper', why: 'synthetic' }], fixed_files: [], cross_field: [], approval: { quote: 'synthetic approval', at: '2026-11-01T00:00:00.000Z' }, ...extra,
});
const CUT_TEXT = 'Synthetic design cut, nothing real.\n';
const CUT_SHA = sha(CUT_TEXT);
function world(root, o = {}) {
  roleFiles(root, o.briefs);
  put(root, 'userfile-a.md', 'synthetic user level file\n');
  setThr(root, { user_files: [path.join(root, 'userfile-a.md'), path.join(root, 'userfile-missing.md')], ...(o.thr ?? {}) });
  const w = { cutSha: CUT_SHA };
  if (o.protocol !== false) {
    const bytes = canon(PROTOCOL(o.protocolExtra));
    const s = sha(bytes);
    const rel = `plan/frozen/protocol-f1-${s.slice(0, 12)}.json`;
    put(root, rel, bytes);
    led(root, 'protocol-freeze', { data: { name: 'protocol-f1', sha256: s, path: rel } });
    w.protocolBytes = Buffer.from(bytes);
  }
  if (o.cut !== false) {
    put(root, `completeness/cut-${CUT_SHA.slice(0, 12)}.md`, CUT_TEXT);
    led(root, 'cut', { data: { sha: CUT_SHA } });
    putJ(root, 'completeness/gate.json', { schema_version: 1, cut_sha: CUT_SHA, hazards_sha: null, matrix: { full: true, empty_cells: 0 }, p_ids_missing: [], high_uncovered: [], model: 'pass', action_lines: [], result: 'pass', reasons: [] });
  }
  return w;
}
// the selftest and fsck lines are appended last: fsck must be newer than any intake or commit line
async function seal(root) {
  const t = await lib.treeSha(path.join(root, 'tcb'));
  led(root, 'selftest', { data: { tcb_sha: t, result: 'pass', failed: [] } });
  led(root, 'fsck', { data: { result: 'pass', failing: [] } });
}
const START = { freeMb: 99999 };

// store objects written by the test (canonical bytes, id from the hash)
function putObj(root, prefix, value) {
  const bytes = canon(value);
  const id = prefix + '_' + sha(bytes).slice(0, 16);
  put(root, `store/objects/${id}.json`, bytes);
  return { id, bytes, sha256: sha(bytes) };
}
const CARD = (qid) => ({
  schema_version: 1, kind: 'card', field: 'f1', question_ids: [qid], route: 'keyword',
  source: { url: 'https://example.org/p/' + qid, canonical_id: 'doi:10.0/' + qid, primary_id: 'doi:10.0/' + qid, evidence_type: 'controlled' },
  quote: 'synthetic exact words', measured: { approach_id: 'ap_one', measure: 'm_one', value: 1, unit: 'u', baseline: 0, baseline_kind: 'control', better: 'higher', effect: 'improves' },
  conditions: { task: [], model_family: [], language: [] }, what_measured: 'synthetic measure',
});
const qsha = (ids) => sha(canon([...ids].sort()));
function commitPack(root, task, cards, { epoch = 1, step = 'pack' } = {}) {
  const co = cards.map((c) => putObj(root, 'c', c));
  const pack = putObj(root, 'p', { schema_version: 1, kind: 'pack', field: 'f1', questions_sha: qsha(['f1-a-01', 'f1-a-02']), cards: co.map((c) => c.id).sort(), conclusions: [], not_covered: [] });
  const outputs = [...co.map((c) => ({ id: c.id, kind: 'card', sha256: c.sha256 })), { id: pack.id, kind: 'pack', sha256: pack.sha256 }].sort((a, b) => (a.id < b.id ? -1 : 1));
  const rec = canon({ schema_version: 1, task, step, epoch, step_key: '1'.repeat(64), outputs, outputs_sha: sha(canon(outputs)) });
  put(root, `store/commits/${task}.${step}.json`, rec);
  led(root, 'commit', { task, epoch, data: { step, outputs_sha: sha(canon(outputs)), n: outputs.length, git: null } });
  return { cards: co, pack, recSha: sha(rec), outputs };
}
const committedDep = (task, recSha) => row(task, { state: 'committed', step: 'stopped', epoch: 1, reason: 'first', commits: { pack: recSha }, attempts: [att(task, 1, { session: SID2, boot: BOOT_A, manifest: M0, settings_sha: Z64, stop: 'confirmed' })] });

async function started(root, o = {}) {
  return run(root, 'start', { task: o.task ?? RES, epoch: o.epoch ?? 1, ...START, ...o });
}
function junctionOk() {
  try {
    const a = fs.mkdtempSync(path.join(TMP, 'jt-'));
    const b = path.join(a, 'lnk');
    fs.symlinkSync(a, b, 'junction');
    fs.rmdirSync(b);
    fs.rmSync(a, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

// =================================================================== plan
test('T1 plan: two tasks make two planned rows, one plan line; a repeat changes nothing', async (t) => {
  const w = mk();
  t.after(w.cleanup);
  const { root } = w;
  fs.mkdirSync(at(root, 'plan'), { recursive: true });
  fs.copyFileSync(path.join(FIX, 'good-plan', 'root', 'plan', 'tasks-plan.json'), at(root, 'plan/tasks-plan.json'));
  const plan = readJ(root, 'plan/tasks-plan.json');
  const before = getTable(root);
  const j = run(root, 'plan');
  expectExit(j, 0);
  assert.equal(j.mode, 'plan');
  assert.equal(j.dry_run, false);
  assert.deepEqual([...j.result.added].sort(), plan.tasks.map((x) => x.task).sort());
  const tbl = getTable(root);
  assert.equal(tbl.rev, before.rev + 1);
  assert.equal(tbl.tasks.length, 2);
  for (const e of plan.tasks) {
    const r = tbl.tasks.find((x) => x.task === e.task);
    assert.ok(r, e.task);
    assert.equal(r.state, 'planned');
    assert.equal(r.step, 'none');
    assert.equal(r.epoch, 0);
    assert.equal(r.reason, null);
    assert.equal(r.session, null);
    assert.equal(r.restarts, 0);
    assert.equal(r.handovers, 0);
    assert.equal(r.parks, 0);
    assert.equal(r.limit, false);
    assert.deepEqual(r.fails, []);
    assert.deepEqual(r.attempts, []);
    assert.deepEqual(r.commits, {});
    for (const k of ['field', 'stage', 'role', 'tier', 'steps', 'deps', 'question_ids', 'e_task']) assert.deepEqual(r[k], e[k], `${e.task}.${k}`);
  }
  assert.equal(ofKind(root, 'plan').length, 1);
  assert.deepEqual([...ofKind(root, 'plan')[0].data.added].sort(), plan.tasks.map((x) => x.task).sort());
  assert.deepEqual(j.ledger_seq, [ofKind(root, 'plan')[0].seq]);
  await assertLedgerVerifies(root);

  const bytes = read(root, 'run/tasks.json');
  const n = ledgerLines(root).length;
  const j2 = run(root, 'plan');
  expectExit(j2, 0);
  assert.deepEqual(j2.result.added, []);
  assert.deepEqual([...j2.result.unchanged].sort(), plan.tasks.map((x) => x.task).sort());
  assert.ok(bytes.equals(read(root, 'run/tasks.json')), 'tasks.json byte-identical on a repeat');
  assert.equal(ledgerLines(root).length, n, 'no new ledger line on a repeat');
});

test('T2 plan: a differing entry is refused whole; an unknown dep, a cycle, a missing or invalid plan are refused', async (t) => {
  // T2 says "table and ledger unchanged", but the spec's Writes ("incident {class: refusal} on exits 1,
  // 5, 6") and R58 ("every refusal ... is an incident ledger line") require one incident line. So: the
  // table is byte-identical, the old ledger bytes are an unchanged prefix, and the only line added is
  // that one incident (no plan line).
  await t.test('differing e_task -> exit 1 plan-differs, table unchanged, ledger gains only the refusal incident', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    fs.mkdirSync(at(root, 'plan'), { recursive: true });
    fs.copyFileSync(path.join(FIX, 'good-plan', 'root', 'plan', 'tasks-plan.json'), at(root, 'plan/tasks-plan.json'));
    expectExit(run(root, 'plan'), 0);
    const tb = read(root, 'run/tasks.json');
    const lb = read(root, 'run/ledger.jsonl');
    const plan = readJ(root, 'plan/tasks-plan.json');
    plan.tasks[0].e_task += 10000;
    putJ(root, 'plan/tasks-plan.json', plan);
    const j = run(root, 'plan');
    expectExit(j, 1, 'plan-differs');
    assert.ok(tb.equals(read(root, 'run/tasks.json')));
    const la = read(root, 'run/ledger.jsonl');
    assert.ok(la.subarray(0, lb.length).equals(lb), 'the earlier ledger lines are unchanged');
    const added = la.subarray(lb.length).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    assert.equal(added.length, 1, JSON.stringify(added));
    assert.equal(added[0].kind, 'incident');
    assert.equal(added[0].data.class, 'refusal');
    assert.equal(ofKind(root, 'plan').length, 1, 'no second plan line');
    await assertLedgerVerifies(root);
  });
  const entry = (task, deps) => ({ task, field: 'f1', stage: 'research', role: 'child', tier: 'sonnet', steps: ['pack'], deps, question_ids: ['f1-a-01'], e_task: 1000 });
  for (const [name, tasks] of [
    ['a dep naming no task', [entry('f1-aaa', ['f1-ghost'])]],
    ['a cycle', [entry('f1-aaa', ['f1-bbb']), entry('f1-bbb', ['f1-aaa'])]],
  ]) {
    await t.test(`${name} -> exit 1 plan-invalid, no write`, async (t2) => {
      const w = mk();
      t2.after(w.cleanup);
      const { root } = w;
      putJ(root, 'plan/tasks-plan.json', { schema_version: 1, tasks });
      const tb = read(root, 'run/tasks.json');
      const j = run(root, 'plan');
      expectExit(j, 1, 'plan-invalid');
      assert.ok(tb.equals(read(root, 'run/tasks.json')));
      assert.equal(ofKind(root, 'plan').length, 0);
    });
  }
  await t.test('no plan file -> exit 2 missing', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    expectExit(run(w.root, 'plan'), 2, 'missing');
  });
  await t.test('a plan that fails its schema -> exit 1 schema-invalid', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const bad = entry('f1-aaa', []);
    bad.role = 'no-such-role';
    putJ(w.root, 'plan/tasks-plan.json', { schema_version: 1, tasks: [bad] });
    expectExit(run(w.root, 'plan'), 1, 'schema-invalid');
  });
});

// =================================================================== fence
test('T3 fence first: a planned row gets epoch 1, step stopped, state active, one attempt', async (t) => {
  const w = mk();
  t.after(w.cleanup);
  const { root } = w;
  table(root, [row(RES)]);
  const rev0 = getTable(root).rev;
  const j = run(root, 'fence', { task: RES, epoch: 0, reason: 'first', boot: BOOT_A });
  expectExit(j, 0);
  assert.equal(j.mode, 'fence');
  const r = getRow(root, RES);
  assert.equal(r.epoch, 1);
  assert.equal(r.step, 'stopped');
  assert.equal(r.state, 'active');
  assert.equal(r.reason, 'first');
  assert.equal(r.restarts, 0);
  assert.equal(r.attempts.length, 1);
  assert.equal(attemptOf(r, 1).folder, `wt/${RES}-e1`);
  assert.equal(getTable(root).rev, rev0 + 1);
  const f = ofKind(root, 'fence');
  assert.equal(f.length, 1);
  assert.equal(f[0].data.reason, 'first');
  assert.equal(f[0].data.from, 0);
  assert.equal(f[0].data.to, 1);
  assert.equal(f[0].data.host, false);
  await assertLedgerVerifies(root);
});

test('T4 fence stall on a bound row: epoch 2, fenced, restarts 1, fails record, staging cut, spend at fence', async (t) => {
  const w = mk();
  t.after(w.cleanup);
  const { root } = w;
  table(root, [boundRow()]);
  const A = 'AAAA first staged file\n';
  const B = 'BBBB second staged file, a little longer\n';
  put(root, `wt/${RES}-e1/staging/a.card.json`, A);
  put(root, `wt/${RES}-e1/staging/sub/b.card.json`, B);
  fakeT(root, SID1, folderAbs(root, RES, 1), [u(1000, 500, 200, 100), u(2000, 0, 0, 400)]);
  const j = run(root, 'fence', { task: RES, epoch: 1, reason: 'stall', tick: 7, boot: BOOT_A });
  expectExit(j, 0);
  const r = getRow(root, RES);
  assert.equal(r.epoch, 2);
  assert.equal(r.step, 'fenced');
  assert.equal(r.state, 'active');
  assert.equal(r.reason, 'stall');
  assert.equal(r.restarts, 1);
  assert.deepEqual(r.fails, [{ epoch: 1, class: 'stall', host: false, tick: 7 }]);
  const a1 = attemptOf(r, 1);
  assert.deepEqual(a1.cut.files, { 'a.card.json': { len: Buffer.byteLength(A), sha256: sha(A) }, 'sub/b.card.json': { len: Buffer.byteLength(B), sha256: sha(B) } });
  assert.equal(a1.spend_at_fence, 4200);
  const a2 = attemptOf(r, 2);
  assert.ok(a2, 'the new epoch has its attempt entry');
  assert.equal(a2.folder, `wt/${RES}-e2`);
  const f = ofKind(root, 'fence');
  assert.equal(f.length, 1);
  assert.deepEqual({ ...f[0].data }, { reason: 'stall', from: 1, to: 2, host: false, restart_charged: true, limit: false, cut_files: 2 });
  await assertLedgerVerifies(root);
});

test('T5 fence with a READY of the current epoch: ready-wins for a failure, never over a taint', async (t) => {
  const ready = (epoch) => JSON.stringify({ kind: 'ready', task: RES, epoch, step: 'pack' });
  await t.test('valid READY epoch 1, stall -> exit 5 ready-wins, row byte-identical, one incident refusal', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    table(root, [boundRow()]);
    put(root, `wt/${RES}-e1/staging/READY.json`, ready(1));
    readySlot(root, RES, 1);
    const tb = read(root, 'run/tasks.json');
    const j = run(root, 'fence', { task: RES, epoch: 1, reason: 'stall', tick: 4, boot: BOOT_A });
    expectExit(j, 5, 'ready-wins');
    assert.ok(tb.equals(read(root, 'run/tasks.json')));
    const inc = ofKind(root, 'incident');
    assert.equal(inc.length, 1);
    assert.equal(inc[0].data.class, 'refusal');
    assert.equal(ofKind(root, 'fence').length, 0);
  });
  await t.test('a READY with epoch 0 does not count: the fence applies', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    table(root, [boundRow()]);
    put(root, `wt/${RES}-e1/staging/READY.json`, ready(0));
    expectExit(run(root, 'fence', { task: RES, epoch: 1, reason: 'stall', tick: 4, boot: BOOT_A }), 0);
    assert.equal(getRow(root, RES).epoch, 2);
  });
  // Review U1-F7: a schema-valid READY of another epoch (2) in the epoch-1 folder is not this
  // attempt's READY (R7/M6): the stall fence applies.
  await t.test('a schema-valid READY of another epoch (2) in wt/<task>-e1 does not count: the fence applies', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    table(root, [boundRow()]);
    put(root, `wt/${RES}-e1/staging/READY.json`, ready(2));
    const j = run(root, 'fence', { task: RES, epoch: 1, reason: 'stall', tick: 4, boot: BOOT_A });
    expectExit(j, 0);
    assert.ok(!codes(j).includes('ready-wins'), JSON.stringify(j.reasons));
    assert.equal(getRow(root, RES).epoch, 2);
    assert.equal(ofKind(root, 'fence').length, 1);
  });
  await t.test('a torn READY does not count: the fence applies', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    table(root, [boundRow()]);
    put(root, `wt/${RES}-e1/staging/READY.json`, '{"kind":"ready","task":"f1-res');
    expectExit(run(root, 'fence', { task: RES, epoch: 1, reason: 'stall', tick: 4, boot: BOOT_A }), 0);
    assert.equal(getRow(root, RES).epoch, 2);
  });
  await t.test('fence tainted with the same valid READY is applied (restarts + 1)', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    table(root, [boundRow()]);
    put(root, `wt/${RES}-e1/staging/READY.json`, ready(1));
    readySlot(root, RES, 1);
    const j = run(root, 'fence', { task: RES, epoch: 1, reason: 'tainted', tick: 4, boot: BOOT_A });
    expectExit(j, 0);
    assert.deepEqual(fs.readdirSync(at(root, `wt/${RES}-e1/outcome`)).sort(), ['0.json', '1.json'], 'a tainted fence appends after the ready slot');
    assert.ok(read(root, `wt/${RES}-e1/outcome/1.json`).equals(Buffer.from(lib.outcomeSlotBytes({ kind: 'fenced', task: RES, epoch: 1, reason: 'tainted' }))));
    const r = getRow(root, RES);
    assert.equal(r.epoch, 2);
    assert.equal(r.step, 'fenced');
    assert.equal(r.restarts, 1);
    assert.equal(r.fails[0].class, 'tainted');
    assert.equal(r.fails[0].host, false);
  });
});

test('T5b (M6) a READY of the current epoch wins over every reason but first and tainted, a planned hand-over included', async (t) => {
  const ready = JSON.stringify({ kind: 'ready', task: RES, epoch: 1, step: 'pack' });
  const owner = (root) => led(root, 'owner', { data: { act: 'drop', subject: RES, quote: 'drop this task' } });
  for (const reason of ['handover', 'memory', 'cut', 'drop']) {
    await t.test(`${reason} with a valid READY of epoch 1 -> exit 5 ready-wins, row byte-identical, one incident, no fence line`, async (t2) => {
      const w = mk();
      t2.after(w.cleanup);
      const { root } = w;
      table(root, [boundRow()]);
      if (reason === 'drop') owner(root);
      put(root, `wt/${RES}-e1/staging/READY.json`, ready);
      readySlot(root, RES, 1);
      const tb = read(root, 'run/tasks.json');
      const j = run(root, 'fence', { task: RES, epoch: 1, reason, boot: BOOT_A });
      expectExit(j, 5, 'ready-wins');
      assert.ok(tb.equals(read(root, 'run/tasks.json')), 'the row is unchanged');
      const inc = ofKind(root, 'incident');
      assert.equal(inc.length, 1);
      assert.equal(inc[0].data.class, 'refusal');
      assert.equal(ofKind(root, 'fence').length, 0);
    });
  }
  await t.test('handover --dry-run with the READY predicts exit 5', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    table(root, [boundRow()]);
    put(root, `wt/${RES}-e1/staging/READY.json`, ready);
    readySlot(root, RES, 1);
    const h = treeHash(root);
    const j = run(root, 'fence', { task: RES, epoch: 1, reason: 'handover', boot: BOOT_A, dry: true });
    expectExit(j, 5, 'ready-wins');
    assert.equal(treeHash(root), h);
  });
  await t.test('handover without a READY is applied: epoch 2, handovers 1', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    table(root, [boundRow()]);
    expectExit(run(root, 'fence', { task: RES, epoch: 1, reason: 'handover', boot: BOOT_A }), 0);
    const r = getRow(root, RES);
    assert.equal(r.epoch, 2);
    assert.equal(r.step, 'fenced');
    assert.equal(r.handovers, 1);
  });
});

// FX-OUT (FIX-fence.md section 1, fence side): every refusal before the one write (N1), the fenced slot,
// the retry path, and no slot for an attempt that was never admitted (rev 4 H1, schedule F1).
const outcomeOf = (root, task, e) => (has(root, `wt/${task}-e${e}/outcome`) ? fs.readdirSync(at(root, `wt/${task}-e${e}/outcome`)).sort() : null);
const fencedSlot = (task, e, reason) => lib.outcomeSlotBytes({ kind: 'fenced', task, epoch: e, reason });

test('FX-OUT 3: a refused fence (stale-epoch, wrong-step, hmax) writes no slot; a fence writes one fenced slot; a torn fence is retried with its own reason only', async (t) => {
  const world = (t2, rows) => {
    const w = mk();
    t2.after(w.cleanup);
    table(w.root, rows);
    setThr(w.root, { H_max: 2 });
    fs.mkdirSync(at(w.root, `wt/${RES}-e1/outcome`), { recursive: true });
    return w.root;
  };
  const att1 = att(RES, 1, { session: SID1, boot: BOOT_A, manifest: M0, settings_sha: Z64 });
  await t.test('refusals: exit 65 stale-epoch, 65 wrong-step, 1 hmax; no slot, the row unchanged', async (t2) => {
    for (const [name, rows, o, exit, code] of [
      ['stale-epoch', [boundRow({ epoch: 2, step: 'fenced', session: null, attempts: [att1, att(RES, 2)] })], { reason: 'stall', tick: 4 }, 65, 'stale-epoch'],
      ['wrong-step', [boundRow({ step: 'stopped', session: null })], { reason: 'stall', tick: 4 }, 65, 'wrong-step'],
      ['hmax', [boundRow({ handovers: 1, parks: 1 })], { reason: 'handover' }, 1, 'hmax'],
    ]) {
      const root = world(t2, rows);
      const tb = read(root, 'run/tasks.json');
      expectExit(run(root, 'fence', { task: RES, epoch: 1, boot: BOOT_A, ...o }), exit, code);
      assert.deepEqual(outcomeOf(root, RES, 1), [], `${name}: no slot`);
      assert.ok(tb.equals(read(root, 'run/tasks.json')), `${name}: the row is unchanged`);
    }
  });
  await t.test('a fence of a running attempt writes one fenced slot, then the CAS; with its line lost, another reason gets 65 and the same reason is the FX-REDO repeat: no second slot', async (t2) => {
    const root = world(t2, [boundRow()]);
    expectExit(run(root, 'fence', { task: RES, epoch: 1, reason: 'stall', tick: 4, boot: BOOT_A }), 0);
    assert.deepEqual(outcomeOf(root, RES, 1), ['0.json']);
    assert.ok(read(root, `wt/${RES}-e1/outcome/0.json`).equals(Buffer.from(fencedSlot(RES, 1, 'stall'))));
    assert.equal(getRow(root, RES).epoch, 2);
    // a death after the CAS, before the fence line: the row at the post-state, the fenced slot, no line
    const lines = read(root, 'run/ledger.jsonl').toString('utf8').split('\n').filter(Boolean);
    assert.equal(JSON.parse(lines[lines.length - 1]).kind, 'fence');
    fs.writeFileSync(at(root, 'run/ledger.jsonl'), lines.slice(0, -1).map((l) => l + '\n').join(''));
    // another reason is not the exact post-state: it loses with 65 (the log's own reason) and writes nothing
    const before = treeHash(root);
    const lost = run(root, 'fence', { task: RES, epoch: 1, reason: 'hang', tick: 5, boot: BOOT_A });
    expectExit(lost, 65, 'fence-pending');
    assert.equal(lost.reasons.find((x) => x.code === 'fence-pending').detail.reason, 'stall');
    assert.equal(treeHash(root), before, 'the losing fence writes nothing');
    // the same fence (a later tick) is FX-REDO's repeat at the exact post-state: exit 0, the line completed once
    const rep = run(root, 'fence', { task: RES, epoch: 1, reason: 'stall', tick: 5, boot: BOOT_A });
    expectExit(rep, 0);
    assert.deepEqual([rep.result.repeat, rep.result.redo], [true, true]);
    assert.deepEqual(ofKind(root, 'fence').map((l) => [l.epoch, l.data.from, l.data.reason, l.data.redo]), [[2, 1, 'stall', true]]);
    assert.deepEqual(outcomeOf(root, RES, 1), ['0.json'], 'nothing after the fenced slot');
    await assertLedgerVerifies(root);
  });
  await t.test('a torn fence (its slot, no CAS): another reason exits 65 fence-pending; its own reason completes it with no second slot', async (t2) => {
    const root = world(t2, [boundRow()]);
    put(root, `wt/${RES}-e1/outcome/0.json`, fencedSlot(RES, 1, 'hang'));
    const tb = read(root, 'run/tasks.json');
    const j = run(root, 'fence', { task: RES, epoch: 1, reason: 'stall', tick: 4, boot: BOOT_A });
    expectExit(j, 65, 'fence-pending');
    assert.equal(j.reasons.find((x) => x.code === 'fence-pending').detail.reason, 'hang');
    assert.ok(tb.equals(read(root, 'run/tasks.json')));
    expectExit(run(root, 'fence', { task: RES, epoch: 1, reason: 'hang', tick: 4, boot: BOOT_A }), 0);
    const r = getRow(root, RES);
    assert.deepEqual([r.epoch, r.step, r.reason], [2, 'fenced', 'hang']);
    assert.deepEqual(outcomeOf(root, RES, 1), ['0.json']);
  });
});

test('FX-OUT 4 (schedule F1): a fence of a parked row, whose attempt was never admitted, writes no slot and no tombstone and makes no folder', async () => {
  const w = mk();
  try {
    const { root } = w;
    const a1 = att(RES, 1, { session: SID1, boot: BOOT_A, manifest: M0, settings_sha: Z64, stop: 'confirmed', spend_at_fence: 0 });
    table(root, [row(RES, { state: 'parked', step: 'stopped', epoch: 2, reason: 'memory', parks: 1, attempts: [a1, att(RES, 2)] })]);
    const j = run(root, 'fence', { task: RES, epoch: 2, reason: 'cut', boot: BOOT_A });
    expectExit(j, 0);
    const r = getRow(root, RES);
    assert.deepEqual([r.epoch, r.step, r.reason], [3, 'fenced', 'cut']);
    assert.equal(has(root, `wt/${RES}-e2`), false, 'no folder, no outcome slot, no claim.json for attempt 2');
  } finally {
    w.cleanup();
  }
});

test('T6 fence crash: host only when the recorded boot differs from the current one', async (t) => {
  const cases = [
    ['recorded A, current B -> host, restarts unchanged, not charged', BOOT_A, BOOT_B, true, 0, false],
    ['recorded A, current A -> not host, charged', BOOT_A, BOOT_A, false, 1, true],
    ['no recorded boot, current B -> not host, charged', null, BOOT_B, false, 1, true],
  ];
  for (const [name, recorded, current, host, restarts, charged] of cases) {
    await t.test(name, async (t2) => {
      const w = mk();
      t2.after(w.cleanup);
      const { root } = w;
      const b = boundRow();
      if (recorded === null) delete b.attempts[0].boot;
      else b.attempts[0].boot = recorded;
      table(root, [b]);
      const j = run(root, 'fence', { task: RES, epoch: 1, reason: 'crash', tick: 3, boot: current });
      expectExit(j, 0);
      const r = getRow(root, RES);
      assert.equal(r.restarts, restarts);
      assert.equal(r.fails[0].class, 'crash');
      assert.equal(r.fails[0].host, host);
      const f = ofKind(root, 'fence')[0];
      assert.equal(f.data.host, host);
      assert.equal(f.data.restart_charged, charged);
    });
  }
});

test('T7 fence stall at restarts = R: fence applied, limit true, exit 1 limit, fence line written', async (t) => {
  const w = mk();
  t.after(w.cleanup);
  const { root } = w;
  table(root, [boundRow({ restarts: 1 })]);
  const j = run(root, 'fence', { task: RES, epoch: 1, reason: 'stall', tick: 9, boot: BOOT_A });
  expectExit(j, 1, 'limit');
  const r = getRow(root, RES);
  assert.equal(r.epoch, 2);
  assert.equal(r.step, 'fenced');
  assert.equal(r.limit, true);
  const f = ofKind(root, 'fence');
  assert.equal(f.length, 1);
  assert.equal(f[0].data.limit, true);
  await assertLedgerVerifies(root);
});

// FX-CLAIM: an admitted attempt (a manifest, its folder) and one fence of it, in a world of its own
const admittedAt = (o = {}) => row(RES, { state: 'active', step: 'admitted', epoch: 1, reason: 'first', attempts: [att(RES, 1, { manifest: M0, settings_sha: Z64 })], ...o });
function fenceOnce(t, rowObj, reason, claim, o = {}) {
  const w = mk();
  t.after(w.cleanup);
  const { root } = w;
  table(root, [rowObj]);
  fs.mkdirSync(folderAbs(root, RES, 1), { recursive: true });
  if (claim) putJ(root, `wt/${RES}-e1/claim.json`, claim);
  const before = { tasks: read(root, 'run/tasks.json'), files: fs.readdirSync(folderAbs(root, RES, 1)).sort(), lines: ledgerLines(root).length };
  const j = run(root, 'fence', { task: RES, epoch: 1, reason, tick: 9, boot: BOOT_A, ...o });
  const c = has(root, `wt/${RES}-e1/claim.json`) ? readJ(root, `wt/${RES}-e1/claim.json`) : null;
  return { root, j, before, r: getRow(root, RES), claim: c, f: ofKind(root, 'fence')[0] ?? null };
}

test('T7b FX-CLAIM no-start fences (N7): a tombstone is uncharged while nostart < H_nostart and is no R8 fail; past the cap it is charged; a session claim resets nostart; a planned reason leaves nostart', async (t) => {
  let x = fenceOnce(t, admittedAt(), 'crash');
  expectExit(x.j, 0);
  assert.deepEqual(x.claim, { kind: 'tombstone', task: RES, epoch: 1 }, 'the fence tombstones an attempt no session claimed');
  assert.deepEqual([x.r.epoch, x.r.step, x.r.restarts, x.r.nostart, x.r.fails.length], [2, 'fenced', 0, 1, 0]);
  assert.equal(x.f.data.restart_charged, false);
  x = fenceOnce(t, admittedAt({ nostart: 1 }), 'stall');
  assert.deepEqual([x.r.restarts, x.r.nostart, x.r.fails.length], [0, 2, 0]);
  x = fenceOnce(t, admittedAt({ nostart: 2, restarts: 0 }), 'crash');
  assert.deepEqual([x.r.restarts, x.r.nostart, x.r.fails.length, x.f.data.restart_charged], [1, 2, 1, true], 'past H_nostart: charged like a failure');
  x = fenceOnce(t, admittedAt({ nostart: 1 }), 'handover');
  assert.deepEqual([x.r.restarts, x.r.nostart, x.r.handovers], [0, 1, 1], 'a planned hand-over: uncharged, nostart untouched');
  x = fenceOnce(t, admittedAt({ nostart: 2 }), 'crash', { kind: 'session', session_id: SID1 });
  assert.deepEqual([x.r.restarts, x.r.nostart, x.r.fails.length], [1, 0, 1], 'a session claim: charged, nostart reset');
  assert.deepEqual(x.claim, { kind: 'session', session_id: SID1 }, 'the session claim is kept');
});

test('T7c FX-CLAIM --if-unclaimed (the lease act): a session claim -> exit 5 claimed-late with nothing written; no claim -> the fence goes on; another mode -> usage', async (t) => {
  let x = fenceOnce(t, admittedAt(), 'crash', { kind: 'session', session_id: SID1 }, { ifUnclaimed: true });
  expectExit(x.j, 5, 'claimed-late');
  assert.ok(x.before.tasks.equals(read(x.root, 'run/tasks.json')), 'the row is unchanged');
  assert.deepEqual(fs.readdirSync(folderAbs(x.root, RES, 1)).sort(), x.before.files, 'no slot and no tombstone');
  assert.equal(x.f, null, 'no fence line');
  assert.equal(ledgerLines(x.root).filter((l) => l.kind !== 'incident').length, x.before.lines);
  x = fenceOnce(t, admittedAt(), 'crash', null, { ifUnclaimed: true });
  expectExit(x.j, 0);
  assert.deepEqual([x.r.epoch, x.r.restarts, x.r.nostart], [2, 0, 1]);
  assert.equal(x.claim.kind, 'tombstone');
  expectExit(run(x.root, 'bind', { task: RES, epoch: 1, session: SID1, boot: BOOT_B, ifUnclaimed: true }), 66);
});

test('T8 fence handover at handovers + parks = H_max: exit 1 hmax, row unchanged, incident line', async (t) => {
  const w = mk();
  t.after(w.cleanup);
  const { root } = w;
  table(root, [boundRow({ handovers: 1, parks: 1 })]);
  const tb = read(root, 'run/tasks.json');
  const j = run(root, 'fence', { task: RES, epoch: 1, reason: 'handover', boot: BOOT_A });
  expectExit(j, 1, 'hmax');
  assert.ok(tb.equals(read(root, 'run/tasks.json')));
  assert.equal(ofKind(root, 'incident').length, 1);
  assert.equal(ofKind(root, 'fence').length, 0);
});

test('T9 fence with a stale epoch is refused; two concurrent fences: one wins, one gets 65', async (t) => {
  await t.test('--epoch one below the row\'s -> exit 65, nothing written', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    table(root, [boundRow({ epoch: 2, attempts: [att(RES, 1, { stop: 'confirmed' }), att(RES, 2, { session: SID1, bound_at: NOW, boot: BOOT_A, manifest: M0, settings_sha: Z64 })] })]);
    const h = treeHash(root);
    const j = run(root, 'fence', { task: RES, epoch: 1, reason: 'stall', tick: 2, boot: BOOT_A });
    expectExit(j, 65);
    assert.equal(treeHash(root), h);
  });
  await t.test('two child processes fence epoch 1 at once', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    table(root, [boundRow()]);
    const [a, b] = await Promise.all([runAsync(root, 'fence', { task: RES, epoch: 1, reason: 'stall', tick: 5, boot: BOOT_A }), runAsync(root, 'fence', { task: RES, epoch: 1, reason: 'hang', tick: 5, boot: BOOT_A })]);
    assert.deepEqual([a.status, b.status].sort((x, y) => x - y), [0, 65]);
    parse(a);
    parse(b);
    assert.equal(getRow(root, RES).epoch, 2);
    assert.equal(ofKind(root, 'fence').length, 1);
    await assertLedgerVerifies(root);
  });
});

test('T10 fence drop needs an owner drop line; planned row goes straight to dropped', async (t) => {
  const owner = (root) => led(root, 'owner', { data: { act: 'drop', subject: RES, quote: 'drop this task' } });
  await t.test('no owner line -> exit 1 no-owner-drop, nothing written', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    table(root, [boundRow()]);
    const tb = read(root, 'run/tasks.json');
    expectExit(run(root, 'fence', { task: RES, epoch: 1, reason: 'drop', boot: BOOT_A }), 1, 'no-owner-drop');
    assert.ok(tb.equals(read(root, 'run/tasks.json')));
  });
  await t.test('with an owner line on a bound row -> applied, step fenced', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    table(root, [boundRow()]);
    owner(root);
    expectExit(run(root, 'fence', { task: RES, epoch: 1, reason: 'drop', boot: BOOT_A }), 0);
    const r = getRow(root, RES);
    assert.equal(r.step, 'fenced');
    assert.equal(r.epoch, 2);
    assert.equal(r.reason, 'drop');
  });
  await t.test('with an owner line on a planned row -> state dropped, step stopped, epoch 0', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    table(root, [row(RES)]);
    owner(root);
    expectExit(run(root, 'fence', { task: RES, epoch: 0, reason: 'drop', boot: BOOT_A }), 0);
    const r = getRow(root, RES);
    assert.equal(r.state, 'dropped');
    assert.equal(r.step, 'stopped');
    assert.equal(r.epoch, 0);
    assert.equal(r.attempts.length, 0);
  });
});

test('T10b fence cut on an active/stopped row: state cut, epoch unchanged, no new attempt, overflow line', async (t) => {
  const w = mk();
  t.after(w.cleanup);
  const { root } = w;
  table(root, [startRow()]);
  const j = run(root, 'fence', { task: RES, epoch: 1, reason: 'cut', boot: BOOT_A });
  expectExit(j, 0);
  const r = getRow(root, RES);
  assert.equal(r.state, 'cut');
  assert.equal(r.epoch, 1);
  assert.equal(r.attempts.length, 1);
  const ov = ofKind(root, 'overflow');
  assert.equal(ov.length, 1);
  assert.deepEqual([...ov[0].data.ids].sort(), ['f1-a-01', 'f1-a-02']);
  assert.equal(ov[0].data.reason, 'cut');
  assert.equal(ov[0].data.tokens, 0);
  assert.equal(ofKind(root, 'fence').length, 1);
  await assertLedgerVerifies(root);
});

test('T11 fence stall without --tick and without watcher.json -> exit 2 no-tick, no write', async (t) => {
  await t.test('no tick anywhere', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    table(root, [boundRow()]);
    assert.equal(has(root, 'run/watcher.json'), false);
    const h = treeHash(root);
    expectExit(run(root, 'fence', { task: RES, epoch: 1, reason: 'stall', boot: BOOT_A }), 2, 'no-tick');
    assert.equal(treeHash(root), h);
  });
  await t.test('control: watcher.json ticks_total is used when --tick is absent', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    table(root, [boundRow()]);
    putJ(root, 'run/watcher.json', { schema_version: 1, ce: 1, pid: 1, start_time: 'x', ticks_total: 41, last_tick_at: NOW, active: {}, pending: [], tasks: {} });
    expectExit(run(root, 'fence', { task: RES, epoch: 1, reason: 'stall', boot: BOOT_A }), 0);
    assert.equal(getRow(root, RES).fails[0].tick, 41);
  });
});

test('T12 fence with a stale --ce writes nothing; --dry-run reports the same exit and writes nothing', async (t) => {
  await t.test('--ce differs from coord -> exit 64', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    table(root, [boundRow()]);
    const h = treeHash(root);
    expectExit(run(root, 'fence', { ce: 9, task: RES, epoch: 1, reason: 'stall', tick: 1, boot: BOOT_A }), 64);
    assert.equal(treeHash(root), h);
  });
  await t.test('--dry-run: exit as the real run, dry_run true, no file changed, no lock left', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    table(root, [boundRow()]);
    const h = treeHash(root);
    const j = run(root, 'fence', { task: RES, epoch: 1, reason: 'stall', tick: 1, boot: BOOT_A, dry: true });
    expectExit(j, 0);
    assert.equal(j.dry_run, true);
    assert.equal(treeHash(root), h);
    assert.equal(has(root, 'run/run.lock'), false);
  });
});

// =================================================================== start
test('T13b (review U5-B-1) start of a control row: the brief (the child brief, by fallback) shows the neutral label solo, never the word control', async (t) => {
  const w = mk();
  t.after(w.cleanup);
  const { root } = w;
  world(root);
  const prof = readJ(root, 'tcb/profiles/child.json');
  putJ(root, 'tcb/profiles/control.json', { ...prof, role: 'control', agent_types: [] });
  const sets = read(root, 'tcb/settings/child.json').toString('utf8').split('--role child').join('--role control');
  put(root, 'tcb/settings/control.json', sets);
  table(root, [startRow({ role: 'control' })]);
  await seal(root);
  const j = await started(root);
  expectExit(j, 0);
  const brief = read(root, `wt/${RES}-e1/in/brief.md`).toString('utf8');
  assert.ok(brief.includes('role solo'), 'the rendered {{role}} is the neutral label');
  assert.ok(!/\bcontrol\b/i.test(brief), 'the brief never names the control role');
  assert.equal(readJ(root, `wt/${RES}-e1/in/manifest.json`).role, 'control', 'the manifest keeps the real role');
});

test('T13 start: an admitted attempt gets its folder, inputs, todo, settings, agents, brief and manifest', async (t) => {
  const w = mk();
  t.after(w.cleanup);
  const { root } = w;
  const wd = world(root);
  table(root, [startRow()]);
  await seal(root);
  const j = await started(root);
  expectExit(j, 0);
  assert.equal(j.mode, 'start');
  const r = getRow(root, RES);
  assert.equal(r.step, 'admitted');
  assert.equal(r.state, 'active');
  const dir = `wt/${RES}-e1`;
  const brief = read(root, `${dir}/in/brief.md`).toString('utf8');
  assert.ok(!brief.includes('{{'), 'no placeholder left in the brief');
  assert.ok(brief.includes(RES));
  assert.ok(has(root, `${dir}/in/manifest.json`));
  assert.ok(wd.protocolBytes.equals(read(root, `${dir}/in/protocol.json`)), 'protocol.json equals the frozen bytes');
  assert.equal(read(root, `${dir}/in/questions_sha.txt`).toString('utf8').trim(), qsha(['f1-a-01', 'f1-a-02']));
  const mr = readJ(root, `${dir}/in/must_read.json`);
  assert.equal(mr.schema_version, 1);
  assert.deepEqual(mr.urls, [{ url: 'https://Example.org/Paper', href: new URL('https://Example.org/Paper').href }]);
  assert.ok(read(root, 'tcb/briefs/reader.md').equals(read(root, `${dir}/in/reader-brief.md`)));
  const todo = readJ(root, `${dir}/view/todo.json`);
  assert.equal(todo.schema_version, 1);
  assert.equal(todo.task, RES);
  assert.equal(todo.epoch, 1);
  assert.deepEqual([...todo.todo].sort(), ['f1-a-01', 'f1-a-02']);
  assert.deepEqual(todo.covered, []);
  assert.deepEqual(walkRel(at(root, `${dir}/staging`)), []);
  assert.ok(fs.statSync(at(root, `${dir}/staging`)).isDirectory());
  const st = readJ(root, `${dir}/.claude/settings.json`);
  const cmd = st.hooks.PreToolUse[0].hooks[0].command;
  assert.ok(cmd.startsWith(`"${process.execPath}"`), 'hook command starts with the quoted absolute node path');
  assert.ok(cmd.includes(`--task ${RES} --epoch 1`));
  assert.ok(!/\{(root|attempt|task|epoch|node)\}/.test(cmd));
  assert.ok(read(root, 'tcb/agents/reader.md').equals(read(root, `${dir}/.claude/agents/reader.md`)));
  // manifest object
  const objs = fs.readdirSync(at(root, 'store/objects')).filter((n) => /^m_[0-9a-f]{16}\.json$/.test(n));
  assert.equal(objs.length, 1);
  const mbytes = read(root, `store/objects/${objs[0]}`);
  assert.equal(sha(mbytes).slice(0, 16), objs[0].slice(2, 18), 'the manifest name is the hash of its bytes');
  assert.ok(mbytes.equals(read(root, `${dir}/in/manifest.json`)));
  const m = JSON.parse(mbytes);
  assert.equal(m.kind, 'manifest');
  assert.equal(m.task, RES);
  assert.equal(m.epoch, 1);
  assert.equal(m.role, 'child');
  assert.equal(m.tier, 'sonnet');
  assert.deepEqual(m.tools, ['Read', 'Write', 'Edit']);
  assert.deepEqual(m.outputs, [{ step: 'pack', kinds: ['card', 'pack'] }]);
  assert.deepEqual(m.agents, [{ type: 'reader', sha256: sha(read(root, 'tcb/agents/reader.md')) }]);
  const names = m.inputs.map((x) => x.name);
  assert.deepEqual(names, [...names].sort(), 'inputs sorted');
  for (const rel of walkRel(at(root, `${dir}/in`))) {
    if (rel === 'manifest.json') continue;
    const e = m.inputs.find((x) => x.name === rel);
    assert.ok(e, `manifest lists in/${rel}`);
    assert.equal(e.sha256, sha(read(root, `${dir}/in/${rel}`)));
  }
  assert.ok(m.user_files.some((x) => x.sha256 === sha('synthetic user level file\n')), 'user file hashed');
  const a1 = attemptOf(r, 1);
  assert.equal(a1.manifest, objs[0].slice(0, -5));
  assert.equal(a1.settings_sha, sha(read(root, `${dir}/.claude/settings.json`)));
  assert.equal(a1.folder, dir);
  const ad = ofKind(root, 'admit');
  assert.equal(ad.length, 1);
  assert.equal(ad[0].data.e_task, 50000);
  assert.equal(ad[0].data.free_mb, 99999);
  await assertLedgerVerifies(root);
});

test('T14 start of a restart: the checkpoint prefix holds the first len bytes of the fenced cut, nothing newer', async (t) => {
  const w = mk();
  t.after(w.cleanup);
  const { root } = w;
  world(root);
  const P100 = 'A'.repeat(100);
  const full = P100 + 'B'.repeat(80);
  const oldC = 'C'.repeat(50);
  const a1 = att(RES, 1, { session: SID1, boot: BOOT_A, manifest: M0, settings_sha: Z64, stop: 'confirmed', spend_at_fence: 0, cut: { files: { 'a.card.json': { len: 100, sha256: sha(P100) }, 'c.card.json': { len: 50, sha256: sha(oldC) } }, ledger_seq: 1 } });
  table(root, [startRow({ epoch: 2, reason: 'stall', restarts: 1, fails: [{ epoch: 1, class: 'stall', host: false, tick: 7 }], attempts: [a1, att(RES, 2)] })]);
  put(root, `wt/${RES}-e1/staging/a.card.json`, full);
  put(root, `wt/${RES}-e1/staging/b.card.json`, 'new file after the fence');
  put(root, `wt/${RES}-e1/staging/c.card.json`, 'D'.repeat(50));
  await seal(root);
  const j = await started(root, { epoch: 2 });
  expectExit(j, 0);
  const pre = `wt/${RES}-e2/in/checkpoint/prefix`;
  assert.equal(read(root, `${pre}/a.card.json`).toString('utf8'), P100);
  assert.equal(has(root, `${pre}/b.card.json`), false, 'a file added after the fence is absent');
  assert.equal(has(root, `${pre}/c.card.json`), false, 'a rewritten file is never copied');
  const mm = j.result.checkpoint.mismatched;
  assert.ok(mm.some((p) => String(p).endsWith('c.card.json')), 'the rewritten file is reported as mismatched: ' + JSON.stringify(mm));
});

test('T15 start copies every committed output; an edited stored object -> exit 3 object-mismatch', async (t) => {
  await t.test('every committed output is copied to in/checkpoint/committed/', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    world(root);
    const c = commitPack(root, RES, [CARD('f1-a-01')]);
    const a1 = att(RES, 1, { session: SID1, boot: BOOT_A, manifest: M0, settings_sha: Z64, stop: 'confirmed' });
    table(root, [startRow({ steps: ['pack', 'review'], epoch: 2, reason: 'stall', restarts: 1, fails: [{ epoch: 1, class: 'stall', host: false, tick: 7 }], commits: { pack: c.recSha }, attempts: [a1, att(RES, 2)] })]);
    await seal(root);
    expectExit(await started(root, { epoch: 2 }), 0);
    for (const o of c.outputs) {
      const f = `wt/${RES}-e2/in/checkpoint/committed/${o.id}.json`;
      assert.ok(has(root, f), o.id);
      assert.equal(sha(read(root, f)), o.sha256);
    }
  });
  await t.test('a stored object edited after commit -> exit 3, row stays stopped, no folder', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    world(root);
    const c = commitPack(root, RES, [CARD('f1-a-01')]);
    const a1 = att(RES, 1, { session: SID1, boot: BOOT_A, manifest: M0, settings_sha: Z64, stop: 'confirmed' });
    table(root, [startRow({ steps: ['pack', 'review'], epoch: 2, reason: 'stall', restarts: 1, fails: [{ epoch: 1, class: 'stall', host: false, tick: 7 }], commits: { pack: c.recSha }, attempts: [a1, att(RES, 2)] })]);
    await seal(root);
    fs.appendFileSync(at(root, `store/objects/${c.pack.id}.json`), ' ');
    const tb = read(root, 'run/tasks.json');
    const j = await started(root, { epoch: 2 });
    expectExit(j, 3, 'object-mismatch');
    assert.ok(tb.equals(read(root, 'run/tasks.json')));
    assert.equal(getRow(root, RES).step, 'stopped');
    assert.equal(has(root, `wt/${RES}-e2`), false);
    assert.equal(ofKind(root, 'admit').length, 0);
  });
  // Review U1 mutation R4: the commit record's own sha256 of an output is re-checked against the
  // stored bytes (spec start step 5). Here the object is intact (getObject passes) and only the
  // record names another sha256, with outputs_sha recomputed so nothing else in the record is off.
  await t.test('a commit record whose sha256 for an intact object differs -> exit 3, row stays stopped, no folder', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    world(root);
    const c = commitPack(root, RES, [CARD('f1-a-01')]);
    const recRel = `store/commits/${RES}.pack.json`;
    const rec = readJ(root, recRel);
    const po = rec.outputs.find((o) => o.id === c.pack.id);
    po.sha256 = po.sha256 === 'a'.repeat(64) ? 'b'.repeat(64) : 'a'.repeat(64);
    rec.outputs_sha = sha(canon(rec.outputs));
    const recText = canon(rec);
    put(root, recRel, recText);
    const a1 = att(RES, 1, { session: SID1, boot: BOOT_A, manifest: M0, settings_sha: Z64, stop: 'confirmed' });
    table(root, [startRow({ steps: ['pack', 'review'], epoch: 2, reason: 'stall', restarts: 1, fails: [{ epoch: 1, class: 'stall', host: false, tick: 7 }], commits: { pack: sha(recText) }, attempts: [a1, att(RES, 2)] })]);
    await seal(root);
    const tb = read(root, 'run/tasks.json');
    const j = await started(root, { epoch: 2 });
    expectExit(j, 3, 'object-mismatch');
    assert.ok(tb.equals(read(root, 'run/tasks.json')));
    assert.equal(getRow(root, RES).step, 'stopped');
    assert.equal(has(root, `wt/${RES}-e2`), false);
    assert.equal(ofKind(root, 'admit').length, 0);
  });
});

test('T16 start refused: exit 6 deferred with the slug, row unchanged, no folder, one incident line', async (t) => {
  const cases = [
    ['memory (free memory below reserve + peak)', 'memory', async () => ({ rows: [startRow()], opts: { freeMb: 100 } })],
    ['a dep that is not committed', 'dep-not-committed', async () => ({ rows: [row('f1-dep'), startRow({ deps: ['f1-dep'] })], opts: {} })],
    ['a halt line with no owner resume', 'halted', async (root) => (led(root, 'halt', { data: { reason: 'common-cause', fails: [] } }), { rows: [startRow()], opts: {} })],
    ['a drain line of this ce', 'draining', async (root) => (led(root, 'drain', { data: { window: 30, w_star: 1 } }), { rows: [startRow()], opts: {} })],
  ];
  for (const [name, slug, build] of cases) {
    await t.test(name, async (t2) => {
      const w = mk();
      t2.after(w.cleanup);
      const { root } = w;
      world(root);
      const b = await build(root);
      table(root, b.rows);
      await seal(root);
      const tb = read(root, 'run/tasks.json');
      const j = await started(root, b.opts);
      expectExit(j, 6, slug);
      assert.equal(j.code, 'deferred');
      assert.ok(tb.equals(read(root, 'run/tasks.json')), 'row unchanged');
      assert.equal(has(root, `wt/${RES}-e1`), false);
      const inc = ofKind(root, 'incident');
      assert.equal(inc.length, 1);
      assert.equal(inc[0].data.class, 'refusal');
      assert.equal(ofKind(root, 'admit').length, 0);
    });
  }
});

test('T17 start repeated at step admitted: exit 0, no new ledger line, folder unchanged', async (t) => {
  const w = mk();
  t.after(w.cleanup);
  const { root } = w;
  world(root);
  table(root, [startRow()]);
  await seal(root);
  expectExit(await started(root), 0);
  const n = ledgerLines(root).length;
  const h = treeHash(at(root, `wt/${RES}-e1`));
  const tb = read(root, 'run/tasks.json');
  const j = await started(root);
  expectExit(j, 0);
  assert.equal(ledgerLines(root).length, n);
  assert.equal(treeHash(at(root, `wt/${RES}-e1`)), h);
  assert.ok(tb.equals(read(root, 'run/tasks.json')));
});

test('T18 start with a torn folder rebuilds it; an unknown brief placeholder -> exit 2 brief-placeholder', async (t) => {
  await t.test('a torn folder at step stopped is removed and rebuilt', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    world(root);
    table(root, [startRow()]);
    put(root, `wt/${RES}-e1/junk.txt`, 'left by a torn start');
    put(root, `wt/${RES}-e1/staging/old.txt`, 'old');
    await seal(root);
    expectExit(await started(root), 0);
    assert.equal(has(root, `wt/${RES}-e1/junk.txt`), false);
    assert.equal(has(root, `wt/${RES}-e1/staging/old.txt`), false);
    assert.ok(has(root, `wt/${RES}-e1/in/brief.md`));
    assert.equal(getRow(root, RES).step, 'admitted');
  });
  await t.test('a brief with {{x}} -> exit 2, no folder left, row at stopped', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    world(root, { briefs: { child: BRIEF('child') + 'and an unknown {{x}} here\n' } });
    table(root, [startRow()]);
    await seal(root);
    const tb = read(root, 'run/tasks.json');
    const j = await started(root);
    expectExit(j, 2, 'brief-placeholder');
    assert.equal(has(root, `wt/${RES}-e1`), false);
    assert.ok(tb.equals(read(root, 'run/tasks.json')));
  });
});

test('T19 start refuses a junction: wt/ pointing outside -> path-escape; a link in a torn folder -> untrusted-path', async (t) => {
  const ok = junctionOk();
  await t.test('wt/ is a junction to a folder outside the root -> exit 3 path-escape', { skip: ok ? false : 'a junction cannot be created here' }, async (t2) => {
    const w = mk();
    const outside = fs.mkdtempSync(path.join(TMP, 'out-'));
    const wt = at(w.root, 'wt');
    t2.after(() => {
      try { fs.rmdirSync(wt); } catch { /* already gone */ }
      fs.rmSync(outside, { recursive: true, force: true });
      return w.cleanup();
    });
    const { root } = w;
    world(root);
    table(root, [startRow()]);
    await seal(root);
    fs.rmSync(wt, { recursive: true, force: true });
    fs.symlinkSync(outside, wt, 'junction');
    const j = await started(root);
    expectExit(j, 3, 'path-escape');
    assert.deepEqual(fs.readdirSync(outside), [], 'nothing was written outside the root');
    assert.equal(getRow(root, RES).step, 'stopped');
  });
  await t.test('a torn folder holding a junction -> exit 3 untrusted-path, the target is never touched', { skip: ok ? false : 'a junction cannot be created here' }, async (t2) => {
    const w = mk();
    const outside = fs.mkdtempSync(path.join(TMP, 'out-'));
    const link = at(w.root, `wt/${RES}-e1/staging/link`);
    t2.after(() => {
      try { fs.rmdirSync(link); } catch { /* already gone */ }
      fs.rmSync(outside, { recursive: true, force: true });
      return w.cleanup();
    });
    const { root } = w;
    world(root);
    table(root, [startRow()]);
    put(outside, 'sentinel.txt', 'sentinel stays');
    put(root, `wt/${RES}-e1/keep.txt`, 'folder left as it is');
    fs.mkdirSync(at(root, `wt/${RES}-e1/staging`), { recursive: true });
    fs.symlinkSync(outside, link, 'junction');
    await seal(root);
    const j = await started(root);
    expectExit(j, 3, 'untrusted-path');
    assert.equal(fs.readFileSync(path.join(outside, 'sentinel.txt'), 'utf8'), 'sentinel stays');
    assert.ok(has(root, `wt/${RES}-e1/keep.txt`), 'the torn folder was left as it is');
    assert.equal(getRow(root, RES).step, 'stopped');
  });
});

test('T20 start of a fresh-review task builds review-in/<task>/ once and copies it into in/', async (t) => {
  const w = mk();
  t.after(w.cleanup);
  const { root } = w;
  world(root, { protocolExtra: { fixed_files: ['notes/plan.md', 'notes/other.md'] } });
  put(root, 'plan/our-work/notes/plan.md', 'ORIGINAL plan text\n');
  put(root, 'plan/our-work/notes/other.md', 'ORIGINAL other text\n');
  put(root, `sealed/plants/${REV}/notes/plan.md`, 'PLANTED plan text\n');
  const c = commitPack(root, RES, [CARD('f1-a-01'), CARD('f1-a-02')]);
  const [cA, cB] = c.cards;
  const S1 = 'first snapshot text, not the last one\n';
  const S2 = 'second snapshot text, the last witnessed one\n';
  put(root, `.snapshots/text/${sha(S1)}`, S1);
  put(root, `.snapshots/text/${sha(S2)}`, S2);
  const wit = (seq, card, ts) => JSON.stringify({ seq, card_id: card.id, card_sha: card.sha256, raw_sha: sha('raw' + seq), text_sha: sha(ts), result: 'witnessed', number_bound: true, reason: 'ok', source_changed: false, w: 1, at: NOW });
  put(root, 'store/witness.jsonl', wit(1, cA, S1) + '\n' + wit(2, cA, S2) + '\n');
  table(root, [committedDep(RES, c.recSha), row(REV, { field: 'f1', stage: 'fresh-review', role: 'fresh-reviewer', steps: ['review'], deps: [RES], tier: 'opus', e_task: 30000, state: 'active', step: 'stopped', epoch: 1, reason: 'first', attempts: [att(REV, 1)] })]);
  await seal(root);
  const j = await started(root, { task: REV, epoch: 1 });
  expectExit(j, 0);
  const ri = `review-in/${REV}`;
  const pack = JSON.parse(read(root, `store/objects/${c.pack.id}.json`));
  assert.deepEqual(readJ(root, `${ri}/pack.json`), pack);
  assert.deepEqual(readJ(root, `${ri}/cards/${cA.id}.json`), JSON.parse(cA.bytes));
  assert.deepEqual(readJ(root, `${ri}/cards/${cB.id}.json`), JSON.parse(cB.bytes));
  assert.equal(read(root, `${ri}/files/notes/plan.md`).toString('utf8'), 'PLANTED plan text\n', 'a planted copy replaces its original');
  assert.equal(read(root, `${ri}/files/notes/other.md`).toString('utf8'), 'ORIGINAL other text\n');
  assert.equal(read(root, `${ri}/snapshots/${sha(S2)}.txt`).toString('utf8'), S2, 'the last witness record names the snapshot');
  assert.equal(has(root, `${ri}/snapshots/${sha(S1)}.txt`), false);
  // copied into in/ and listed in the manifest
  const dir = `wt/${REV}-e1`;
  const m = readJ(root, `${dir}/in/manifest.json`);
  const wanted = [['pack.json', read(root, `${ri}/pack.json`)], [`cards/${cA.id}.json`, read(root, `${ri}/cards/${cA.id}.json`)], ['files/notes/plan.md', read(root, `${ri}/files/notes/plan.md`)], [`snapshots/${sha(S2)}.txt`, read(root, `${ri}/snapshots/${sha(S2)}.txt`)]];
  for (const [suffix, bytes] of wanted) {
    const e = m.inputs.find((x) => x.name === suffix || x.name.endsWith('/' + suffix));
    assert.ok(e, `manifest lists a review-in file ending ${suffix}`);
    assert.equal(e.sha256, sha(bytes));
    assert.ok(read(root, `${dir}/in/${e.name}`).equals(bytes), `in/${e.name} is a copy`);
  }
  // built once: a later start (epoch 2) reuses it although the source changed
  const hash1 = treeHash(at(root, ri));
  put(root, 'plan/our-work/notes/other.md', 'CHANGED after the first build\n');
  const t2 = getTable(root);
  const rr = t2.tasks.find((x) => x.task === REV);
  rr.epoch = 2;
  rr.step = 'stopped';
  rr.reason = 'stall';
  rr.restarts = 1;
  rr.fails = [{ epoch: 1, class: 'stall', host: false, tick: 3 }];
  rr.attempts[0].stop = 'confirmed';
  rr.attempts.push(att(REV, 2));
  t2.rev += 1;
  putJ(root, 'run/tasks.json', t2);
  expectExit(await started(root, { task: REV, epoch: 2 }), 0);
  assert.equal(treeHash(at(root, ri)), hash1, 'review-in/<task>/ is byte-identical after a second start');
  const m2 = readJ(root, `wt/${REV}-e2/in/manifest.json`);
  const e2 = m2.inputs.find((x) => x.name.endsWith('files/notes/other.md'));
  assert.ok(e2);
  assert.equal(read(root, `wt/${REV}-e2/in/${e2.name}`).toString('utf8'), 'ORIGINAL other text\n');
});

test('T20b start of a design-check task of role mapper: cut, cut sha, stpa, fmea, problems and hazards inputs; no cut -> exit 2 missing', async (t) => {
  const DM = 'd-map';
  const build = async (root, withCut) => {
    world(root, { protocol: false, cut: withCut });
    put(root, 'plan/our-work/problems.md', 'Synthetic problem list.\n');
    const rows = [];
    const outs = {};
    if (withCut) {
      for (const [task, role, kind, body] of [
        ['d-stpa', 'stpa', 'stpa', { controllers: [{ id: 'c1', name: 'Coordinator', actions: [{ id: 'a1', target: 'c1' }], feedback: [{ id: 'fb1', from: 'c1' }] }], ucas: [{ uca_id: 'u1', action_id: 'a1', type: 'N', hazardous: false, context: 'ctx', case: 'case' }] }],
        ['d-fmea', 'fmea', 'fmea', { rows: [{ row_id: 'r1', kind: 'component', name: 'Store' }], cells: [{ row_id: 'r1', col: 'x', finding: 'f', na_reason: null }] }],
        ['d-map0', 'mapper', 'hazards', { parent: null, hazards: [], map: [] }],
      ]) {
        const o = putObj(root, 'd', { schema_version: 1, kind, cut_sha: CUT_SHA, ...body });
        const outputs = [{ id: o.id, kind, sha256: o.sha256 }];
        const rec = canon({ schema_version: 1, task, step: kind, epoch: 1, step_key: '2'.repeat(64), outputs, outputs_sha: sha(canon(outputs)) });
        put(root, `store/commits/${task}.${kind}.json`, rec);
        led(root, 'commit', { task, epoch: 1, data: { step: kind, outputs_sha: sha(canon(outputs)), n: 1, git: null } });
        outs[kind] = o;
        rows.push(row(task, { field: null, stage: 'design-check', role, steps: [kind], question_ids: [], state: 'committed', step: 'stopped', epoch: 1, reason: 'first', commits: { [kind]: sha(rec) }, attempts: [att(task, 1, { session: SID2, boot: BOOT_A, manifest: M0, settings_sha: Z64, stop: 'confirmed' })] }));
      }
    }
    rows.push(row(DM, { field: null, stage: 'design-check', role: 'mapper', steps: ['hazards'], deps: withCut ? ['d-stpa', 'd-fmea'] : [], question_ids: [], state: 'active', step: 'stopped', epoch: 1, reason: 'first', attempts: [att(DM, 1)] }));
    table(root, rows);
    await seal(root);
    return outs;
  };
  await t.test('with a cut, stpa, fmea and a hazards object', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    const outs = await build(root, true);
    const j = await started(root, { task: DM, epoch: 1 });
    expectExit(j, 0);
    const dir = `wt/${DM}-e1/in`;
    assert.equal(read(root, `${dir}/cut.md`).toString('utf8'), CUT_TEXT);
    assert.equal(read(root, `${dir}/cut_sha.txt`).toString('utf8').trim(), CUT_SHA);
    assert.ok(Buffer.from(outs.stpa.bytes).equals(read(root, `${dir}/stpa.json`)));
    assert.ok(Buffer.from(outs.fmea.bytes).equals(read(root, `${dir}/fmea.json`)));
    assert.equal(read(root, `${dir}/problems.md`).toString('utf8'), 'Synthetic problem list.\n');
    assert.ok(Buffer.from(outs.hazards.bytes).equals(read(root, `${dir}/hazards.json`)));
    assert.equal(has(root, `${dir}/protocol.json`), false, 'a design-check task has no field, so no protocol');
  });
  await t.test('with no cut line -> exit 2 missing, no folder', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    await build(root, false);
    const j = await started(root, { task: DM, epoch: 1 });
    expectExit(j, 2, 'missing');
    assert.equal(has(root, `wt/${DM}-e1`), false);
  });
});

// =================================================================== bind
const admittedRow = (o = {}) => startRow({ step: 'admitted', attempts: [att(RES, 1, { manifest: M0, settings_sha: Z64 })], ...o });

test('T21 bind: admitted -> bound with session, bound_at and boot; a repeat is idempotent; another session -> session-differs', async (t) => {
  const w = mk();
  t.after(w.cleanup);
  const { root } = w;
  table(root, [admittedRow()]);
  fs.mkdirSync(folderAbs(root, RES, 1), { recursive: true });
  putJ(root, `wt/${RES}-e1/claim.json`, { kind: 'session', session_id: SID1 }); // FX-CLAIM: the session's first tool call claimed
  const j = run(root, 'bind', { task: RES, epoch: 1, session: SID1, boot: BOOT_B });
  expectExit(j, 0);
  assert.equal(j.mode, 'bind');
  const r = getRow(root, RES);
  assert.equal(r.step, 'bound');
  assert.equal(r.session, SID1);
  const a = attemptOf(r, 1);
  assert.equal(a.session, SID1);
  assert.equal(a.bound_at, NOW);
  assert.equal(a.boot, BOOT_B);
  const b = ofKind(root, 'bind');
  assert.equal(b.length, 1);
  assert.equal(b[0].data.session, SID1);
  assert.equal(b[0].data.boot, BOOT_B);
  await assertLedgerVerifies(root);
  const tb = read(root, 'run/tasks.json');
  const n = ledgerLines(root).length;
  expectExit(run(root, 'bind', { task: RES, epoch: 1, session: SID1, boot: BOOT_B }), 0);
  assert.equal(ledgerLines(root).length, n);
  assert.ok(tb.equals(read(root, 'run/tasks.json')));
  expectExit(run(root, 'bind', { task: RES, epoch: 1, session: SID2, boot: BOOT_B }), 1, 'session-differs');
  assert.ok(tb.equals(read(root, 'run/tasks.json')));
});

test('T22 bind where a transcript of the session has another cwd -> exit 1 wrong-folder, row unchanged', async (t) => {
  await t.test('cwd of another folder', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    table(root, [admittedRow()]);
    fs.mkdirSync(folderAbs(root, RES, 1), { recursive: true });
    putJ(root, `wt/${RES}-e1/claim.json`, { kind: 'session', session_id: SID1 });
    fakeT(root, SID1, folderAbs(root, 'other-task', 1), [u(10, 0, 0, 5)]);
    const tb = read(root, 'run/tasks.json');
    const j = run(root, 'bind', { task: RES, epoch: 1, session: SID1, boot: BOOT_B });
    expectExit(j, 1, 'wrong-folder');
    assert.ok(tb.equals(read(root, 'run/tasks.json')));
  });
  await t.test('control: cwd equal to the attempt folder binds', async (t2) => {
    const w = mk();
    t2.after(w.cleanup);
    const { root } = w;
    table(root, [admittedRow()]);
    fs.mkdirSync(folderAbs(root, RES, 1), { recursive: true });
    putJ(root, `wt/${RES}-e1/claim.json`, { kind: 'session', session_id: SID1 });
    fakeT(root, SID1, folderAbs(root, RES, 1), [u(10, 0, 0, 5)]);
    expectExit(run(root, 'bind', { task: RES, epoch: 1, session: SID1, boot: BOOT_B }), 0);
    assert.equal(getRow(root, RES).step, 'bound');
  });
});

test('T22b FX-CLAIM bind by claim: no claim -> exit 6 not-claimed; another session or a tombstone -> exit 1 not-claim-holder; the holder binds a started row whose recorded session differs', async (t) => {
  const w = mk();
  t.after(w.cleanup);
  const { root } = w;
  table(root, [admittedRow()]);
  fs.mkdirSync(folderAbs(root, RES, 1), { recursive: true });
  const tb = read(root, 'run/tasks.json');
  expectExit(run(root, 'bind', { task: RES, epoch: 1, session: SID1, boot: BOOT_B }), 6, 'not-claimed');
  putJ(root, `wt/${RES}-e1/claim.json`, { kind: 'session', session_id: SID2 });
  expectExit(run(root, 'bind', { task: RES, epoch: 1, session: SID1, boot: BOOT_B }), 1, 'not-claim-holder');
  putJ(root, `wt/${RES}-e1/claim.json`, { kind: 'tombstone', task: RES, epoch: 1 });
  expectExit(run(root, 'bind', { task: RES, epoch: 1, session: SID1, boot: BOOT_B }), 1, 'not-claim-holder');
  assert.ok(tb.equals(read(root, 'run/tasks.json')), 'a refused bind changes nothing');
  assert.equal(ofKind(root, 'bind').length, 0);
  // a started row whose recorded session came from a transcript (the second source): the claim decides
  table(root, [admittedRow({ step: 'started', attempts: [att(RES, 1, { manifest: M0, settings_sha: Z64, session: SID2 })] })], 2);
  putJ(root, `wt/${RES}-e1/claim.json`, { kind: 'session', session_id: SID1 });
  expectExit(run(root, 'bind', { task: RES, epoch: 1, session: SID2, boot: BOOT_B }), 1, 'not-claim-holder');
  expectExit(run(root, 'bind', { task: RES, epoch: 1, session: SID1, boot: BOOT_B }), 0);
  assert.deepEqual([getRow(root, RES).step, getRow(root, RES).session], ['bound', SID1]);
});

// =================================================================== any mode
test('T23 any mode with tasks.json unparseable -> exit 67, tasks.json.prev untouched', async (t) => {
  const modes = [
    ['plan', {}],
    ['fence', { task: RES, epoch: 1, reason: 'handover', boot: BOOT_A }],
    ['start', { task: RES, epoch: 1, ...START }],
    ['bind', { task: RES, epoch: 1, session: SID1, boot: BOOT_A }],
  ];
  for (const [mode, o] of modes) {
    await t.test(mode, async (t2) => {
      const w = mk();
      t2.after(w.cleanup);
      const { root } = w;
      fs.mkdirSync(at(root, 'plan'), { recursive: true });
      fs.copyFileSync(path.join(FIX, 'good-plan', 'root', 'plan', 'tasks-plan.json'), at(root, 'plan/tasks-plan.json'));
      setThr(root, { user_files: [path.join(root, 'userfile-a.md')] });
      put(root, 'run/tasks.json', '{"schema_version":1,"rev":3,"tasks":[{"task":');
      put(root, 'run/tasks.json.prev', '{"previous":"kept"}');
      const cur = read(root, 'run/tasks.json');
      const prev = read(root, 'run/tasks.json.prev');
      const j = run(root, mode, o);
      expectExit(j, 67);
      assert.ok(cur.equals(read(root, 'run/tasks.json')));
      assert.ok(prev.equals(read(root, 'run/tasks.json.prev')));
    });
  }
});

test('T24 any writing mode while another process holds run.lock -> exit 75 after the retries', { concurrency: false }, async (t) => {
  const modes = [
    ['plan', {}, []],
    ['fence', { task: RES, epoch: 1, reason: 'handover', boot: BOOT_A }, [boundRow()]],
    ['start', { task: RES, epoch: 1, ...START }, [startRow()]],
    ['bind', { task: RES, epoch: 1, session: SID1, boot: BOOT_A }, [admittedRow()]],
  ];
  for (const [mode, o, rows] of modes) {
    await t.test(mode, async (t2) => {
      const w = mk();
      const sl = helpers.spawnSleeper();
      t2.after(() => {
        sl.kill();
        return w.cleanup();
      });
      const { root } = w;
      fs.mkdirSync(at(root, 'plan'), { recursive: true });
      fs.copyFileSync(path.join(FIX, 'good-plan', 'root', 'plan', 'tasks-plan.json'), at(root, 'plan/tasks-plan.json'));
      setThr(root, { lock_retries: 3, user_files: [path.join(root, 'userfile-a.md')] });
      if (rows.length) table(root, rows);
      putJ(root, 'run/run.lock', { pid: sl.pid, start_time: sl.start_time, nonce: 'f'.repeat(32), script: 'other.mjs', ce: 1, acquired_at: NOW });
      const lockBytes = read(root, 'run/run.lock');
      const tb = read(root, 'run/tasks.json');
      const j = run(root, mode, o);
      expectExit(j, 75);
      assert.ok(lockBytes.equals(read(root, 'run/run.lock')), 'the lock of the other process is untouched');
      assert.ok(tb.equals(read(root, 'run/tasks.json')));
      assert.deepEqual(j.ledger_seq, []);
    });
  }
});

// =================================================================== FX-W3: armed
// FIX-wake FX-W3: an act that creates work (start, fence first) needs an armed turn; otherwise exit 6
// not-armed, thrown in the hold before the act (withRunLock's requireArmed), so nothing is written: no
// ledger line, no incident, no row change, no folder. A dry run checks the same files and gives the same 6.
test('FX-W3 not-armed: start and fence first exit 6 not-armed, nothing written, for no turn.json, an unconfirmed or spent arm, another ce, an exited slot; a dry run gives the same 6; armed, both pass', async (t) => {
  const w = mk({ armed: false });
  t.after(w.cleanup);
  const { root } = w;
  world(root);
  const FIRST = 'f1-second';
  table(root, [startRow(), row(FIRST)]);
  await seal(root);
  const marker = `run/arm/exited-${lib.markerKey(SLOT_PT.pid, SLOT_PT.start_time)}.json`;
  const states = [
    ['no turn.json', null, { why: 'no-turn' }],
    ['arm unconfirmed', armedTurn(1, { arm: 'unconfirmed', slots: [] }), { why: 'arm', arm: 'unconfirmed' }],
    ['arm spent (after endturn)', armedTurn(1, { arm: 'spent' }), { why: 'arm', arm: 'spent' }],
    ['a turn of another ce', armedTurn(2), { why: 'other-ce', turn_ce: 2 }],
    ['the slot\'s alarm exited', armedTurn(1), { why: 'slot-exited', pid: SLOT_PT.pid }, true],
  ];
  const calls = [
    ['start', 'start', { task: RES, epoch: 1, ...START }],
    ['fence first', 'fence', { task: FIRST, epoch: 0, reason: 'first', boot: BOOT_A }],
  ];
  for (const [name, turn, detail, mark] of states) {
    fs.rmSync(at(root, 'run/turn.json'), { force: true });
    if (turn) putJ(root, 'run/turn.json', turn);
    if (mark) putJ(root, marker, { ce: 1, exit: 30, at: NOW });
    const tb = read(root, 'run/tasks.json');
    const n = ledgerLines(root).length;
    for (const [what, mode, o] of calls) {
      for (const dry of [false, true]) {
        const k = `${name}, ${what}${dry ? ', dry run' : ''}`;
        const j = run(root, mode, { ...o, dry });
        expectExit(j, 6, 'not-armed');
        assert.equal(j.code, 'deferred');
        assert.deepEqual(j.reasons.find((r) => r.code === 'not-armed').detail, { ce: 1, ...detail }, k);
        assert.ok(tb.equals(read(root, 'run/tasks.json')), `${k}: row unchanged`);
        assert.equal(ledgerLines(root).length, n, `${k}: no ledger line, no incident`);
        assert.equal(has(root, `wt/${RES}-e1`), false, `${k}: no folder`);
        assert.equal(has(root, `wt/${FIRST}-e1`), false, `${k}: no folder`);
      }
    }
  }
  // armed (call 2 of the turn exited 0): the same calls pass
  fs.rmSync(at(root, marker));
  putJ(root, 'run/turn.json', armedTurn(1));
  expectExit(run(root, 'start', calls[0][2]), 0);
  assert.ok(has(root, `wt/${RES}-e1`), 'the start made its folder');
  expectExit(run(root, 'fence', calls[1][2]), 0);
  assert.equal(getRow(root, FIRST).epoch, 1);
});

// FIX-wake FX-W3 (RevocationNeverGated): every other fence reason and the stop revoke work and are never
// gated by the arm: with no turn.json they act as before.
const STOP_SCRIPT = path.join(HERE, '..', 'stop.mjs');
test('FX-W3 revocation never gated: with no turn.json, fence hang, crash and handover act, and stop request after each', async (t) => {
  for (const reason of ['hang', 'crash', 'handover']) {
    await t.test(reason, async (t2) => {
      const w = mk({ armed: false });
      t2.after(w.cleanup);
      const { root } = w;
      table(root, [boundRow()]);
      const j = run(root, 'fence', { task: RES, epoch: 1, reason, boot: BOOT_A, ...(reason === 'handover' ? {} : { tick: 3 }) });
      expectExit(j, 0);
      assert.equal(getRow(root, RES).epoch, 2);
      const r = spawnSync(process.execPath, [STOP_SCRIPT, 'request', '--root', root, '--ce', '1', '--task', RES, '--epoch', '2', '--now', NOW], { encoding: 'utf8', cwd: root, windowsHide: true, timeout: 180000 });
      const s = JSON.parse(r.stdout.trim().split('\n').pop());
      assert.equal(s.exit, 0, r.stdout + r.stderr);
      assert.ok(!s.reasons.some((x) => x.code === 'not-armed'));
      assert.equal(getRow(root, RES).step, 'stop-requested');
      assert.equal(has(root, 'run/turn.json'), false, 'nothing armed the turn');
    });
  }
});

// =================================================================== needs the app
test('NA1 the rendered settings and agent files bind a session started in the folder', { skip: 'needs the app: which settings files a session started in an attempt folder obeys (CONTRACT 7 item 3)' }, () => {});
test('NA2 a real session\'s transcript cwd equals the folder named in bind', { skip: 'needs the app: real transcripts match 4.8 (CONTRACT 7 item 7)' }, () => {});
