// Tests of tcb/guard-hook.mjs (flat build layout), written from spec/guard-hook.mjs.md and CONTRACT.md only.
// One test per numbered behaviour (T1..T14); each test runs the hook as a child process against a
// temporary run root built here, and judges exit code, stdout (always empty), stderr and the files.
// The three needs-app behaviours are skipped tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TCB = path.resolve(HERE, '..');
const BUILD = path.resolve(TCB, '..');
const TMP = path.join(BUILD, 'tmp');
const FIX = path.join(TCB, 'fixtures', 'guard-hook');
const SESSION = '0a1b2c3d-0000-4000-8000-00000000abcd';

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const fwd = (p) => p.replaceAll('\\', '/');
const lines = (s) => s.split(/\r?\n/).filter((l) => l.length > 0);

// ---------------------------------------------------------------------------------------------
// the roles the tests use: role -> default task row
// ---------------------------------------------------------------------------------------------
const ROLES = {
  child: { task: 'f1-research', stage: 'research', field: 'f1', steps: ['pack'] },
  'child-reviewing': { task: 'f1-review', stage: 'review', field: 'f1', steps: ['review'] },
  'fresh-reviewer': { task: 'f1-fresh', stage: 'fresh-review', field: 'f1', steps: ['review'] },
  control: { task: 'f1-control', stage: 'control', field: 'f1', steps: ['pack'] },
  stpa: { task: 'd-stpa', stage: 'design-check', field: null, steps: ['stpa'] },
  fmea: { task: 'd-fmea', stage: 'design-check', field: null, steps: ['fmea'] },
  mapper: { task: 'd-mapper', stage: 'design-check', field: null, steps: ['hazards'] },
  canary: { task: 'f1-canary', stage: 'research', field: 'f1', steps: ['pack'] },
};
// extra child-role tasks used for the fetch cases
const EXTRA_CHILD_TASKS = ['f1-nomr', 'f1-badmr'];
const TASK_ROLES = Object.keys(ROLES);

function row(role, over = {}) {
  const m = ROLES[role] ?? ROLES.child;
  const task = over.task ?? m.task;
  const epoch = over.epoch ?? 1;
  const attempts = Array.from({ length: epoch }, (_, i) => ({
    epoch: i + 1,
    folder: `wt/${task}-e${i + 1}`,
    stop: i + 1 < epoch ? 'confirmed' : 'none',
  }));
  return {
    task,
    field: m.field,
    stage: m.stage,
    role,
    steps: m.steps,
    deps: [],
    question_ids: m.field ? ['f1-a-01'] : [],
    e_task: 100000,
    tier: 'sonnet',
    state: 'active',
    step: 'bound',
    epoch,
    reason: null,
    session: null,
    restarts: 0,
    handovers: 0,
    parks: 0,
    limit: false,
    fails: [],
    attempts,
    commits: {},
    updated_rev: 1,
    ...over,
  };
}

function writeTable(root, rows, rev = 1) {
  fs.writeFileSync(path.join(root, 'run', 'tasks.json'), JSON.stringify({ schema_version: 1, rev, tasks: rows }));
}

// ---------------------------------------------------------------------------------------------
// a temporary run root with a copy of the tcb
// ---------------------------------------------------------------------------------------------
function ensureFile(file, text) {
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
}

function setParam(root, name, value) {
  const f = path.join(root, 'tcb', 'thresholds.json');
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  j.params ??= {};
  if (j.params[name] && typeof j.params[name] === 'object') j.params[name].value = value;
  else j.params[name] = { value, unit: 'tests', source: 'guess', gate: false };
  fs.writeFileSync(f, JSON.stringify(j, null, 2));
}

function editProfile(w, role, fn) {
  const f = path.join(w.root, 'tcb', 'profiles', role + '.json');
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  fn(j);
  fs.writeFileSync(f, JSON.stringify(j, null, 2));
}

function addSnapshot(root, url, kind) {
  const href = new URL(url).href;
  const f = path.join(root, '.snapshots', 'by-url', sha(href) + '.jsonl');
  const raw = sha('raw:' + href);
  const text = sha('text:' + href);
  const bad = { schema_version: 1, raw_sha: null, retrieved_at: '2026-01-01T00:00:00.000Z', source_changed: false, reason: 'timeout' };
  const good = { schema_version: 1, raw_sha: raw, retrieved_at: '2026-01-01T00:00:00.000Z', source_changed: false };
  const meta = { url: href, final_url: href, retrieved_at: '2026-01-01T00:00:00.000Z', http_status: 200, content_type: 'text/html', bytes: 42, raw_sha: raw };
  let out = [];
  if (kind === 'good') {
    out = [good];
    meta.text_sha = text;
    meta.extractor = 'html-v1';
  } else if (kind === 'failed') out = [bad];
  else if (kind === 'retry') {
    out = [bad, good];
    meta.text_sha = text;
    meta.extractor = 'html-v1';
  } else if (kind === 'no-text') {
    out = [good];
    meta.reason = 'empty-text';
  }
  fs.writeFileSync(f, out.map((o) => JSON.stringify(o)).join('\n') + '\n');
  fs.writeFileSync(path.join(root, '.snapshots', 'meta', raw + '.json'), JSON.stringify(meta));
}

function mkAttempt(root, task, e, { mustRead = true } = {}) {
  const a = path.join(root, 'wt', `${task}-e${e}`);
  for (const d of ['in', 'staging', 'view']) fs.mkdirSync(path.join(a, d), { recursive: true });
  fs.writeFileSync(path.join(a, 'in', 'brief.md'), 'synthetic brief\n');
  if (mustRead) fs.copyFileSync(path.join(FIX, 'must_read.json'), path.join(a, 'in', 'must_read.json'));
  return a;
}

function makeWorld({ thr = {}, tasks = true } = {}) {
  fs.mkdirSync(TMP, { recursive: true });
  const root = fs.realpathSync(fs.mkdtempSync(path.join(TMP, 'gh-')));
  for (const d of ['run', 'store/objects', 'store/status', '.snapshots/raw', '.snapshots/text', '.snapshots/meta', '.snapshots/by-url',
    'wt', 'queue', 'sealed/seeds', 'plan/questions', 'plan/notes', 'views', 'completeness', 'transcripts', 'review-in']) {
    fs.mkdirSync(path.join(root, d), { recursive: true });
  }
  // Data files only: the hook under test is the live tcb/guard-hook.mjs (flat layout), run with
  // --root <this root>; no script is copied (no burst of script files per test).
  for (const name of ['schemas', 'profiles', 'settings', 'agents', 'briefs']) {
    const src = path.join(TCB, name);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(root, 'tcb', name), { recursive: true });
  }
  for (const f of ['thresholds.json', 'cost-inputs.json', 'denylist.txt']) {
    const src = path.join(TCB, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(root, 'tcb', f));
  }
  ensureFile(path.join(root, 'tcb', 'thresholds.json'), JSON.stringify({ schema_version: 1, params: {} }));
  ensureFile(path.join(root, 'tcb', 'README.md'), 'synthetic\n');
  setParam(root, 'transcripts_root', fwd(path.join(root, 'transcripts')));
  for (const [k, v] of Object.entries(thr)) setParam(root, k, v);
  fs.writeFileSync(path.join(root, 'run', 'coord.json'), JSON.stringify({ schema_version: 1, ce: 1, started_at: '2026-01-01T00:00:00.000Z', tcb_commit: '0'.repeat(40) }));
  // attempts and the task table
  const rows = [];
  for (const role of TASK_ROLES) {
    rows.push(row(role));
    mkAttempt(root, ROLES[role].task, 1);
  }
  for (const t of EXTRA_CHILD_TASKS) {
    rows.push(row('child', { task: t }));
    mkAttempt(root, t, 1, { mustRead: false });
  }
  fs.writeFileSync(path.join(root, 'wt', 'f1-badmr-e1', 'in', 'must_read.json'), '{ not json');
  fs.mkdirSync(path.join(root, 'wt', 'f1-research-e10', 'in'), { recursive: true });
  if (tasks) writeTable(root, rows);
  // snapshots for the must_read list and one URL that is stored but not listed
  addSnapshot(root, 'https://example.test/paper-a', 'good');
  addSnapshot(root, 'https://example.test/Paper-B', 'good');
  addSnapshot(root, 'https://example.test/failed', 'failed');
  addSnapshot(root, 'https://example.test/no-text', 'no-text');
  addSnapshot(root, 'https://example.test/retry', 'retry');
  addSnapshot(root, 'https://example.test/not-listed', 'good');
  // queue
  fs.mkdirSync(path.join(root, 'queue', 'b1-1'), { recursive: true });
  fs.mkdirSync(path.join(root, 'queue', 'b1-2'), { recursive: true });
  fs.mkdirSync(path.join(root, 'queue', 'b1-3'), { recursive: true });
  fs.writeFileSync(path.join(root, 'queue', 'b1-1', 'batch.json'), '{}');
  fs.writeFileSync(path.join(root, 'queue', 'b1-3', 'batch.json'), '{}');
  for (const b of ['b1-1', 'b1-2', 'b1-3']) fs.writeFileSync(path.join(root, 'queue', b, 'item-i_0123456789abcdef.json'), '{}');
  // a small valid-looking ledger so that "unchanged" means something
  fs.writeFileSync(path.join(root, 'run', 'ledger.jsonl'), '{"seq":1}\n');
  const w = {
    root,
    junctions: [],
    P: (...s) => path.join(root, ...s),
    att: (task, e = 1) => path.join(root, 'wt', `${task}-e${e}`),
    A: (role = 'child', e = 1) => path.join(root, 'wt', `${ROLES[role].task}-e${e}`),
    cleanup() {
      for (const j of w.junctions) {
        try { fs.rmdirSync(j); } catch { /* already gone */ }
      }
      try { fs.rmSync(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 150 }); } catch { /* best effort */ }
    },
  };
  return w;
}

async function withWorld(opts, fn) {
  const w = makeWorld(opts);
  try {
    return await fn(w);
  } finally {
    w.cleanup();
  }
}

// ---------------------------------------------------------------------------------------------
// running the hook
// ---------------------------------------------------------------------------------------------
// The live hook, beside lib.mjs and its sibling scripts (flat layout). It reads its data through
// --root, and finds the scripts the coordinator may name beside its own file (import.meta.url).
function hookScript() {
  return path.join(TCB, 'guard-hook.mjs');
}

function buildInvocation(w, c) {
  const role = c.role ?? 'child';
  const isCoord = role === 'coordinator';
  const task = c.task ?? ROLES[role]?.task;
  const epoch = c.epoch ?? 1;
  const args = c.rawArgs ?? ['--root', w.root, '--role', role, ...(isCoord ? [] : ['--task', task, '--epoch', String(epoch)])];
  const folder = isCoord ? w.root : w.att(task, epoch);
  const stdin =
    c.stdin !== undefined
      ? c.stdin
      : {
        hook_event_name: 'PreToolUse',
        tool_name: c.tool,
        tool_input: c.input,
        cwd: c.cwd ?? folder,
        session_id: SESSION,
        transcript_path: path.join(w.root, 'transcripts', 'x.jsonl'),
        ...(c.agent_type !== undefined ? { agent_type: c.agent_type } : {}),
      };
  return { args, stdin: typeof stdin === 'string' ? stdin : JSON.stringify(stdin) };
}

function runCase(w, c) {
  const { args, stdin } = buildInvocation(w, c);
  const script = c.script ?? hookScript(w);
  return new Promise((resolve) => {
    const t0 = Date.now();
    const p = spawn(process.execPath, [script, ...args], { cwd: c.procCwd ?? w.root, windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    p.stdout.on('data', (d) => (stdout += d));
    p.stderr.on('data', (d) => (stderr += d));
    p.stdin.on('error', () => {});
    const killer = setTimeout(() => { try { p.kill(); } catch { /* gone */ } }, c.limitMs ?? 30000);
    p.on('close', (status, signal) => {
      clearTimeout(killer);
      resolve({ status, signal, stdout, stderr, ms: Date.now() - t0 });
    });
    p.on('error', (e) => {
      clearTimeout(killer);
      resolve({ status: -1, signal: null, stdout, stderr: String(e), ms: Date.now() - t0 });
    });
    if (c.noEnd) p.stdin.write('');
    else p.stdin.end(stdin);
  });
}

function judge(c, r) {
  if (r.status !== 0 && r.status !== 2) return `exit ${r.status} (signal ${r.signal}), want 0 or 2; stderr=${r.stderr.slice(0, 300)}`;
  if (r.stdout !== '') return `stdout not empty: ${r.stdout.slice(0, 200)}`;
  const m = /^\[guard-hook\] deny ([a-z][a-z0-9-]*)/.exec(r.stderr);
  if (r.status === 2 && !m) return `exit 2 but stderr does not start "[guard-hook] deny <code>": ${r.stderr.slice(0, 300)}`;
  if (r.status === 2 && lines(r.stderr).length !== 1) return `stderr is not one line: ${r.stderr.slice(0, 300)}`;
  if (c.expect === 0) return r.status === 0 ? null : `expected allow, got deny ${m[1]}: ${r.stderr.trim().slice(0, 300)}`;
  if (r.status !== 2) return `expected deny ${[].concat(c.expect).join('|')}, got allow`;
  if (c.expect === 'deny') return null;
  const want = [].concat(c.expect);
  if (!want.includes(m[1])) return `expected deny ${want.join('|')}, got ${m[1]}: ${r.stderr.trim().slice(0, 300)}`;
  // optional: the detail after "<code>: " starts with this text
  if (c.detail !== undefined && !r.stderr.startsWith(`[guard-hook] deny ${m[1]}: ${c.detail}`)) return `expected detail "${c.detail}": ${r.stderr.trim().slice(0, 300)}`;
  return null;
}

// At most two hook processes alive at once (no bursts of short-lived processes).
async function runCases(w, cases, limit = 2) {
  const results = new Array(cases.length);
  let next = 0;
  const worker = async () => {
    while (next < cases.length) {
      const i = next++;
      results[i] = await runCase(w, cases[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, cases.length) }, worker));
  const failures = [];
  cases.forEach((c, i) => {
    const f = judge(c, results[i]);
    if (f) failures.push(`${c.n}: ${f}`);
  });
  return failures;
}

// ---------------------------------------------------------------------------------------------
// a hash of a whole tree (files, folders, links), independent of the library
// ---------------------------------------------------------------------------------------------
function treeHash(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      const rel = fwd(path.relative(dir, p));
      const st = fs.lstatSync(p);
      if (st.isSymbolicLink()) out.push([rel, 'link:' + fs.readlinkSync(p)]);
      else if (st.isDirectory()) {
        out.push([rel + '/', 'dir']);
        walk(p);
      } else out.push([rel, sha(fs.readFileSync(p))]);
    }
  };
  walk(dir);
  out.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return { hash: sha(JSON.stringify(out)), count: out.length, names: out.map((o) => o[0]) };
}

// ---------------------------------------------------------------------------------------------
// the case lists, one function per behaviour so that T13 can mix them
// ---------------------------------------------------------------------------------------------
function casesT1(w) {
  const a = w.A('child');
  const R = (...s) => w.P(...s);
  const co = (n, tool, input, expect, extra = {}) => ({ n, role: 'coordinator', tool, input, expect, ...extra });
  return [
    { n: 'child reads its brief', tool: 'Read', input: { file_path: path.join(a, 'in', 'brief.md') }, expect: 0 },
    { n: 'child reads its brief, forward slashes', tool: 'Read', input: { file_path: fwd(path.join(a, 'in', 'brief.md')) }, expect: 0 },
    { n: 'child reads relative path, cwd = attempt', tool: 'Read', input: { file_path: 'in/brief.md' }, cwd: a, expect: 0 },
    { n: 'child Grep without path, cwd = attempt', tool: 'Grep', input: { pattern: 'brief' }, cwd: a, expect: 0 },
    { n: 'child Grep without path, cwd = root', tool: 'Grep', input: { pattern: 'brief' }, cwd: w.root, expect: 'read-outside-role' },
    { n: 'child Glob in its attempt', tool: 'Glob', input: { pattern: '**/*.md', path: a }, expect: 0 },
    { n: 'child Glob in the store', tool: 'Glob', input: { pattern: '*.json', path: R('store', 'objects') }, expect: 'read-outside-role' },
    { n: 'child reads a stored object', tool: 'Read', input: { file_path: R('store', 'objects', 'c_x.json') }, expect: 'read-outside-role' },
    { n: 'child reads a sealed seed', tool: 'Read', input: { file_path: R('sealed', 'seeds', 'b1-1.json') }, expect: 'read-outside-role' },
    { n: 'child reads a tcb script', tool: 'Read', input: { file_path: R('tcb', 'lib.mjs') }, expect: 'read-outside-role' },
    { n: 'child reads the task table', tool: 'Read', input: { file_path: R('run', 'tasks.json') }, expect: 'read-outside-role' },
    { n: 'child reads a sibling attempt that shares the name prefix (e10 vs e1)', tool: 'Read', input: { file_path: R('wt', 'f1-research-e10', 'in', 'brief.md') }, expect: 'read-outside-role' },
    { n: 'child reads another task attempt', tool: 'Read', input: { file_path: R('wt', 'f1-review-e1', 'in', 'brief.md') }, expect: 'read-outside-role' },
    { n: 'child-reviewing reads its own brief', role: 'child-reviewing', tool: 'Read', input: { file_path: path.join(w.A('child-reviewing'), 'in', 'brief.md') }, expect: 0 },
    { n: 'fresh-reviewer reads store', role: 'fresh-reviewer', tool: 'Read', input: { file_path: R('store', 'objects', 'c_x.json') }, expect: 'read-outside-role' },
    { n: 'mapper reads its own brief', role: 'mapper', tool: 'Read', input: { file_path: path.join(w.A('mapper'), 'in', 'brief.md') }, expect: 0 },
    co('coordinator reads sealed seeds', 'Read', { file_path: R('sealed', 'seeds', 'b1-1.json') }, 'read-outside-role'),
    co('coordinator reads status.json', 'Read', { file_path: R('run', 'status.json') }, 0),
    co('coordinator reads a view', 'Read', { file_path: R('views', 'owner.md') }, 0),
    co('coordinator reads a certificate (x_)', 'Read', { file_path: R('store', 'objects', 'x_0123456789abcdef.json') }, 0),
    co('coordinator reads a card (c_)', 'Read', { file_path: R('store', 'objects', 'c_0123456789abcdef.json') }, 'read-outside-role'),
    co('coordinator reads x_ file in a subfolder', 'Read', { file_path: R('store', 'objects', 'sub', 'x_0123456789abcdef.json') }, 'read-outside-role'),
    co('coordinator reads the gate', 'Read', { file_path: R('completeness', 'gate.json') }, 0),
    co('coordinator reads a cut file', 'Read', { file_path: R('completeness', 'cut-abcdef123456.md') }, 'read-outside-role'),
    co('coordinator reads a question file', 'Read', { file_path: R('plan', 'questions', 'f1.json') }, 0),
    co('coordinator reads a brief of tcb', 'Read', { file_path: R('tcb', 'briefs', 'child.md') }, 0),
    co('coordinator reads tcb README', 'Read', { file_path: R('tcb', 'README.md') }, 0),
    co('coordinator reads a tcb script', 'Read', { file_path: R('tcb', 'lib.mjs') }, 'read-outside-role'),
    co('coordinator reads the task table', 'Read', { file_path: R('run', 'tasks.json') }, 'read-outside-role'),
    co('coordinator reads the ledger', 'Read', { file_path: R('run', 'ledger.jsonl') }, 'read-outside-role'),
    co('coordinator reads an attempt folder', 'Read', { file_path: path.join(w.A('child'), 'staging', 'card1.card.json') }, 'read-outside-role'),
    co('coordinator reads a snapshot', 'Read', { file_path: R('.snapshots', 'raw', 'abc') }, 'read-outside-role'),
    co('coordinator Glob in views', 'Glob', { pattern: '*.md', path: R('views') }, 0),
    co('coordinator Glob in tcb', 'Glob', { pattern: '*.mjs', path: R('tcb') }, 'read-outside-role'),
    co('coordinator Grep in views with glob', 'Grep', { pattern: 'x', path: R('views'), glob: '*.md' }, 0),
    co('coordinator Grep without path, cwd = root', 'Grep', { pattern: 'x' }, 'read-outside-role'),
  ];
}

function casesT2(w) {
  const a = w.A('child');
  const R = (...s) => w.P(...s);
  const claude = 'write-claude';
  const co = (n, tool, input, expect) => ({ n, role: 'coordinator', tool, input, expect });
  return [
    { n: 'child writes a card in staging', tool: 'Write', input: { file_path: path.join(a, 'staging', 'card1.card.json'), content: '{}' }, expect: 0 },
    { n: 'child writes in a staging subfolder', tool: 'Write', input: { file_path: path.join(a, 'staging', 'sub', 'x.json'), content: '{}' }, expect: 0 },
    { n: 'fresh-reviewer writes in staging', role: 'fresh-reviewer', tool: 'Write', input: { file_path: path.join(w.A('fresh-reviewer'), 'staging', 'review.json'), content: '{}' }, expect: 0 },
    { n: 'child writes to view/', tool: 'Write', input: { file_path: path.join(a, 'view', 'todo.json'), content: '{}' }, expect: 'write-outside-role' },
    { n: 'child writes to in/', tool: 'Write', input: { file_path: path.join(a, 'in', 'brief.md'), content: 'x' }, expect: 'write-outside-role' },
    { n: 'child writes into staging/harvested', tool: 'Write', input: { file_path: path.join(a, 'staging', 'harvested', 'x'), content: 'x' }, expect: ['write-protected', 'write-outside-role'] },
    { n: 'child writes into .claude', tool: 'Write', input: { file_path: path.join(a, '.claude', 'settings.json'), content: '{}' }, expect: claude },
    { n: 'child writes into staging/.CLAUDE', tool: 'Write', input: { file_path: path.join(a, 'staging', '.CLAUDE', 'x'), content: 'x' }, expect: claude },
    { n: 'child writes into staging/.claude. (trailing dot)', tool: 'Write', input: { file_path: path.join(a, 'staging', '.claude.', 'x'), content: 'x' }, expect: claude },
    { n: 'child writes staging/Claude.MD', tool: 'Write', input: { file_path: path.join(a, 'staging', 'Claude.MD'), content: 'x' }, expect: claude },
    { n: 'child writes staging/CLAUDE.md. (trailing dot)', tool: 'Write', input: { file_path: path.join(a, 'staging', 'CLAUDE.md.'), content: 'x' }, expect: claude },
    { n: 'child writes staging/CLAUDE.md (trailing space)', tool: 'Write', input: { file_path: path.join(a, 'staging', 'CLAUDE.md '), content: 'x' }, expect: claude },
    { n: 'child writes staging/CLAUDE.local.md', tool: 'Write', input: { file_path: path.join(a, 'staging', 'CLAUDE.local.md'), content: 'x' }, expect: claude },
    { n: 'child writes .claude at depth', tool: 'Write', input: { file_path: path.join(a, 'staging', 'a', 'b', '.claude', 'x'), content: 'x' }, expect: claude },
    { n: 'child writes claude.md.txt (not a CLAUDE file)', tool: 'Write', input: { file_path: path.join(a, 'staging', 'claude.md.txt'), content: 'x' }, expect: 0 },
    { n: 'child writes claudex.md (not a CLAUDE file)', tool: 'Write', input: { file_path: path.join(a, 'staging', 'claudex.md'), content: 'x' }, expect: 0 },
    { n: 'child writes outside the root', tool: 'Write', input: { file_path: fwd(path.dirname(w.root)) + '/elsewhere-gh.txt', content: 'x' }, expect: ['write-outside-role', 'write-protected'] },
    { n: 'child writes into tcb', tool: 'Write', input: { file_path: R('tcb', 'x.mjs'), content: 'x' }, expect: 'write-protected' },
    { n: 'child writes into run', tool: 'Write', input: { file_path: R('run', 'ledger.jsonl'), content: 'x' }, expect: 'write-protected' },
    co('coordinator writes .git/config', 'Write', { file_path: R('.git', 'config'), content: 'x' }, 'write-protected'),
    co('coordinator writes plan/notes', 'Write', { file_path: R('plan', 'notes', 'q1.txt'), content: 'x' }, 0),
    co('coordinator writes plan/questions', 'Write', { file_path: R('plan', 'questions', 'f1.json'), content: '{}' }, 0),
    co('coordinator writes plan/approaches.json', 'Write', { file_path: R('plan', 'approaches.json'), content: '{}' }, 0),
    co('coordinator writes plan/protocols', 'Write', { file_path: R('plan', 'protocols', 'f1.json'), content: '{}' }, 0),
    co('coordinator writes plan/analysis-plan.json', 'Write', { file_path: R('plan', 'analysis-plan.json'), content: '{}' }, 0),
    co('coordinator writes plan/cost-inputs.json', 'Write', { file_path: R('plan', 'cost-inputs.json'), content: '{}' }, 0),
    co('coordinator writes plan/tasks-plan.json', 'Write', { file_path: R('plan', 'tasks-plan.json'), content: '{}' }, 0),
    co('coordinator writes plan/plant-candidates', 'Write', { file_path: R('plan', 'plant-candidates', 'f1.json'), content: '{}' }, 0),
    co('coordinator writes plan/our-work', 'Write', { file_path: R('plan', 'our-work', 'a', 'b.md'), content: 'x' }, 0),
    co('coordinator writes plan/frozen', 'Write', { file_path: R('plan', 'frozen', 'x.json'), content: '{}' }, 'write-outside-role'),
    co('coordinator writes plan/unit-costs.json', 'Write', { file_path: R('plan', 'unit-costs.json'), content: '{}' }, 'write-outside-role'),
    co('coordinator writes a view', 'Write', { file_path: R('views', 'owner.md'), content: 'x' }, 'write-outside-role'),
    co('coordinator writes into tcb', 'Write', { file_path: R('tcb', 'briefs', 'child.md'), content: 'x' }, 'write-protected'),
    co('coordinator writes run/status.json', 'Write', { file_path: R('run', 'status.json'), content: '{}' }, 'write-protected'),
    co('coordinator writes sealed', 'Write', { file_path: R('sealed', 'x.json'), content: '{}' }, 'write-protected'),
    co('coordinator writes store', 'Write', { file_path: R('store', 'objects', 'x.json'), content: '{}' }, 'write-protected'),
    co('coordinator writes review-in', 'Write', { file_path: R('review-in', 'x', 'pack.json'), content: '{}' }, 'write-protected'),
    co('coordinator writes CLAUDE.md in plan/notes', 'Write', { file_path: R('plan', 'notes', 'CLAUDE.md'), content: 'x' }, claude),
    co('coordinator writes plan/.claude/x', 'Write', { file_path: R('plan', '.claude', 'x'), content: 'x' }, claude),
  ];
}

function casesT4(w) {
  const a = w.A('child');
  const R = (...s) => w.P(...s);
  return [
    { n: 'child Edit in staging', tool: 'Edit', input: { file_path: path.join(a, 'staging', 'x.json'), old_string: 'a', new_string: 'b' }, expect: 0 },
    { n: 'child Edit in view', tool: 'Edit', input: { file_path: path.join(a, 'view', 'todo.json'), old_string: 'a', new_string: 'b' }, expect: 'write-outside-role' },
    { n: 'child Edit in tcb', tool: 'Edit', input: { file_path: R('tcb', 'x.mjs'), old_string: 'a', new_string: 'b' }, expect: 'write-protected' },
    { n: 'child Edit in .claude', tool: 'Edit', input: { file_path: path.join(a, '.claude', 'settings.json'), old_string: 'a', new_string: 'b' }, expect: 'write-claude' },
    { n: 'child MultiEdit (allowed path)', tool: 'MultiEdit', input: { file_path: path.join(a, 'staging', 'x.json'), edits: [] }, expect: 'tool-denied' },
    { n: 'child MultiEdit (forbidden path)', tool: 'MultiEdit', input: { file_path: R('tcb', 'x.mjs'), edits: [] }, expect: 'tool-denied' },
    { n: 'child NotebookEdit (allowed path)', tool: 'NotebookEdit', input: { notebook_path: path.join(a, 'staging', 'n.ipynb'), new_source: 'x' }, expect: 'tool-denied' },
    { n: 'child NotebookEdit (forbidden path)', tool: 'NotebookEdit', input: { notebook_path: R('run', 'n.ipynb'), new_source: 'x' }, expect: 'tool-denied' },
    { n: 'coordinator Edit in plan/notes', role: 'coordinator', tool: 'Edit', input: { file_path: R('plan', 'notes', 'x.md'), old_string: 'a', new_string: 'b' }, expect: 0 },
    { n: 'coordinator Edit in tcb', role: 'coordinator', tool: 'Edit', input: { file_path: R('tcb', 'x.md'), old_string: 'a', new_string: 'b' }, expect: 'write-protected' },
    { n: 'coordinator Edit CLAUDE.md in plan/notes', role: 'coordinator', tool: 'Edit', input: { file_path: R('plan', 'notes', 'CLAUDE.md'), old_string: 'a', new_string: 'b' }, expect: 'write-claude' },
    { n: 'coordinator MultiEdit', role: 'coordinator', tool: 'MultiEdit', input: { file_path: R('plan', 'notes', 'x.md'), edits: [] }, expect: 'tool-denied' },
    { n: 'coordinator NotebookEdit', role: 'coordinator', tool: 'NotebookEdit', input: { notebook_path: R('plan', 'notes', 'n.ipynb'), new_source: 'x' }, expect: 'tool-denied' },
    { n: 'fresh-reviewer Edit (not in its tools)', role: 'fresh-reviewer', tool: 'Edit', input: { file_path: path.join(w.A('fresh-reviewer'), 'staging', 'x'), old_string: 'a', new_string: 'b' }, expect: 'tool-not-allowed' },
  ];
}

function casesT5(w) {
  const co = (n, tool, command, expect, extra = {}) => ({ n, role: 'coordinator', tool, input: { command }, expect, ...extra });
  const rootF = fwd(w.root);
  const sm = 'node tcb/status.mjs';
  const list = [
    { n: 'child Bash', tool: 'Bash', input: { command: sm + ' --root C:/r --ce 1' }, expect: 'tool-denied' },
    { n: 'child PowerShell', tool: 'PowerShell', input: { command: 'Get-ChildItem' }, expect: 'tool-denied' },
    { n: 'fresh-reviewer Bash', role: 'fresh-reviewer', tool: 'Bash', input: { command: 'echo x' }, expect: 'tool-denied' },
    co('coordinator relative form, cwd = root', 'Bash', sm + ' --root C:/r --ce 1', 0),
    co('coordinator relative form with surrounding blanks', 'Bash', '  ' + sm + ' --ce 1  ', 0),
    co('coordinator absolute quoted form', 'Bash', `node "${rootF}/tcb/status.mjs" --root C:/r --ce 1`, 0),
    co('coordinator absolute quoted form, cwd = plan', 'Bash', `node "${rootF}/tcb/status.mjs" --root C:/r --ce 1`, 0, { cwd: w.P('plan') }),
    co('coordinator absolute unquoted form', 'Bash', `node ${rootF}/tcb/status.mjs --ce 1`, 0),
    co('coordinator hyphenated script name', 'Bash', 'node tcb/check-queue.mjs --root C:/r --ce 1 --mode intake', 0),
    co('coordinator quoted argument with space and backslash', 'Bash', sm + ' --root "C:\\my dir\\x" --ce 1', 0),
    co('coordinator key=value and colon arguments', 'Bash', sm + ' intent open --key a-b_c --subject=x:y', 0),
    co('coordinator PowerShell with the allowed form', 'PowerShell', sm + ' --ce 1', 0),
    co('relative form from another cwd', 'Bash', sm + ' --ce 1', 'bash-pattern', { cwd: w.P('plan') }),
    co('absolute form of another root', 'Bash', 'node C:/other-root/tcb/status.mjs --ce 1', 'bash-pattern'),
    co('node -e', 'Bash', 'node -e 1', 'bash-pattern'),
    co('semicolon chain', 'Bash', 'node tcb/x.mjs; del y', 'bash-pattern'),
    co('parent segment in the path', 'Bash', 'node tcb/../../a.mjs', 'bash-pattern'),
    co('lib.mjs', 'Bash', 'node tcb/lib.mjs', 'bash-pattern'),
    co('script that does not exist', 'Bash', 'node tcb/nosuch.mjs', 'bash-pattern'),
    co('upper-case script name', 'Bash', 'node tcb/Status.mjs', 'bash-pattern'),
    // the contract's old layout tcb/scripts/<n>.mjs is not this build's grammar (flat layout)
    co('old layout tcb/scripts/<n>.mjs', 'Bash', 'node tcb/scripts/status.mjs --ce 1', 'bash-pattern'),
    co('old layout, absolute', 'Bash', `node "${rootF}/tcb/scripts/status.mjs" --ce 1`, 'bash-pattern'),
    co('command substitution', 'Bash', '$(x)', 'bash-pattern'),
    co('plain non-node command', 'Bash', 'del y', 'bash-pattern'),
    co('newline between two commands', 'Bash', sm + ' --ce 1\ndel y', 'bash-pattern'),
    co('metacharacter inside double quotes', 'Bash', sm + ' --x "a;b"', 'bash-pattern'),
    co('PowerShell cmdlet', 'PowerShell', 'Remove-Item x', 'bash-pattern'),
  ];
  for (const ch of [';', '&', '|', '<', '>', '$', "'", '(', ')', '{', '}', '*', '?', '!', '%', '^', '@', ',', '`']) {
    list.push(co(`metacharacter ${JSON.stringify(ch)} in an argument`, 'Bash', `${sm} --x a${ch}b`, 'bash-pattern'));
  }
  return list;
}

function casesT6(w) {
  const list = [];
  for (const role of ['child', 'child-reviewing', 'canary']) {
    list.push({ n: `${role} Agent reader`, role, tool: 'Agent', input: { subagent_type: 'reader', prompt: 'x' }, expect: 0 });
    list.push({ n: `${role} Agent general-purpose`, role, tool: 'Agent', input: { subagent_type: 'general-purpose', prompt: 'x' }, expect: 'agent-type' });
    list.push({ n: `${role} Agent without subagent_type`, role, tool: 'Agent', input: { prompt: 'x' }, expect: 'agent-type' });
    list.push({ n: `${role} Agent with empty subagent_type`, role, tool: 'Agent', input: { subagent_type: '', prompt: 'x' }, expect: 'agent-type' });
    list.push({ n: `${role} Agent checker (not its type)`, role, tool: 'Agent', input: { subagent_type: 'checker', prompt: 'x' }, expect: 'agent-type' });
    list.push({ n: `${role} Task tool`, role, tool: 'Task', input: { subagent_type: 'reader', prompt: 'x' }, expect: 'tool-denied' });
  }
  for (const role of ['fresh-reviewer', 'control', 'stpa', 'fmea', 'mapper']) {
    list.push({ n: `${role} Agent reader (Agent not in its tools)`, role, tool: 'Agent', input: { subagent_type: 'reader', prompt: 'x' }, expect: 'tool-not-allowed' });
  }
  list.push({ n: 'coordinator Agent checker', role: 'coordinator', tool: 'Agent', input: { subagent_type: 'checker', prompt: 'x' }, expect: 0 });
  list.push({ n: 'coordinator Agent mapper', role: 'coordinator', tool: 'Agent', input: { subagent_type: 'mapper', prompt: 'x' }, expect: 0 });
  list.push({ n: 'coordinator Agent reader', role: 'coordinator', tool: 'Agent', input: { subagent_type: 'reader', prompt: 'x' }, expect: 'agent-type' });
  list.push({ n: 'coordinator Agent without type', role: 'coordinator', tool: 'Agent', input: { prompt: 'x' }, expect: 'agent-type' });
  return list;
}

function casesT7(w) {
  const a = w.A('child');
  return [
    { n: 'reader helper WebFetch of any URL', tool: 'WebFetch', input: { url: 'http://example.test/anything', prompt: 'p' }, agent_type: 'reader', expect: 0 },
    { n: 'reader helper WebSearch', tool: 'WebSearch', input: { query: 'q' }, agent_type: 'reader', expect: 0 },
    { n: 'reader helper StructuredOutput', tool: 'StructuredOutput', input: { cards: [], skipped: [] }, agent_type: 'reader', expect: 0 },
    { n: 'reader helper Read of the brief', tool: 'Read', input: { file_path: path.join(a, 'in', 'brief.md') }, agent_type: 'reader', expect: 'tool-not-allowed' },
    { n: 'reader helper Write', tool: 'Write', input: { file_path: path.join(a, 'staging', 'x'), content: 'x' }, agent_type: 'reader', expect: 'tool-not-allowed' },
    { n: 'reader helper Bash', tool: 'Bash', input: { command: 'echo x' }, agent_type: 'reader', expect: 'tool-denied' },
    { n: 'checker helper in a child folder', tool: 'Read', input: { file_path: path.join(a, 'in', 'brief.md') }, agent_type: 'checker', expect: 'helper-type' },
    { n: 'unknown helper type in a child folder', tool: 'Read', input: { file_path: path.join(a, 'in', 'brief.md') }, agent_type: 'general-purpose', expect: 'helper-type' },
    { n: 'empty agent_type means the folder role', tool: 'Read', input: { file_path: path.join(a, 'in', 'brief.md') }, agent_type: '', expect: 0 },
    { n: 'reader helper in a child-reviewing folder', role: 'child-reviewing', tool: 'WebFetch', input: { url: 'http://example.test/x', prompt: 'p' }, agent_type: 'reader', expect: 0 },
    { n: 'reader helper in a fresh-reviewer folder', role: 'fresh-reviewer', tool: 'WebFetch', input: { url: 'http://example.test/x', prompt: 'p' }, agent_type: 'reader', expect: 'helper-type' },
    { n: 'the child itself WebSearch', tool: 'WebSearch', input: { query: 'q' }, expect: 'tool-denied' },
  ];
}

function casesT8(w) {
  const R = (...s) => w.P(...s);
  const ck = (n, tool, input, expect, extra = {}) => ({ n, role: 'coordinator', agent_type: 'checker', tool, input, expect, ...extra });
  return [
    ck('checker reads an item of a batch with batch.json', 'Read', { file_path: R('queue', 'b1-1', 'item-i_0123456789abcdef.json') }, 0),
    ck('checker reads batch.json itself', 'Read', { file_path: R('queue', 'b1-1', 'batch.json') }, 0),
    ck('checker reads an item of another batch with batch.json', 'Read', { file_path: R('queue', 'b1-3', 'item-i_0123456789abcdef.json') }, 0),
    ck('checker reads an item of a batch folder without batch.json', 'Read', { file_path: R('queue', 'b1-2', 'item-i_0123456789abcdef.json') }, 'read-outside-role'),
    ck('checker reads a sealed seed', 'Read', { file_path: R('sealed', 'seeds', 'b1-1.json') }, 'read-outside-role'),
    ck('checker reads a file beside the batch folders', 'Read', { file_path: R('queue', 'notes.txt') }, 'read-outside-role'),
    ck('checker reaches a batch folder without batch.json by ..', 'Read', { file_path: R('queue', 'b1-1', '..', 'b1-2', 'item-i_0123456789abcdef.json') }, 'read-outside-role'),
    ck('checker reads the store', 'Read', { file_path: R('store', 'objects', 'c_x.json') }, 'read-outside-role'),
    ck('checker Write', 'Write', { file_path: R('queue', 'b1-1', 'x.json'), content: '{}' }, 'tool-not-allowed'),
    ck('checker Glob', 'Glob', { pattern: '*', path: R('queue', 'b1-1') }, 'tool-not-allowed'),
    ck('checker WebFetch', 'WebFetch', { url: 'https://example.test/x', prompt: 'p' }, 'tool-not-allowed'),
    ck('checker StructuredOutput', 'StructuredOutput', { verdicts: [] }, 0),
    { n: 'the coordinator itself reads a queue item', role: 'coordinator', tool: 'Read', input: { file_path: R('queue', 'b1-1', 'item-i_0123456789abcdef.json') }, expect: 'read-outside-role' },
  ];
}

function casesT9(w) {
  const wf = (n, url, expect, extra = {}) => ({ n, tool: 'WebFetch', input: { url, prompt: 'p' }, expect, ...extra });
  return [
    wf('child fetches a witnessed URL', 'https://example.test/paper-a', 0),
    wf('child fetches the second witnessed URL (listed in mixed case)', 'https://example.test/Paper-B', 0),
    wf('child fetches it with host and scheme in capitals (same href)', 'HTTPS://EXAMPLE.test/Paper-B', 0),
    wf('child fetches a URL whose first retrieval failed and second worked', 'https://example.test/retry', 0),
    wf('child fetches a listed URL with only a failed by-url line', 'https://example.test/failed', 'fetch-not-witnessed'),
    wf('child fetches a listed URL whose meta has no text_sha', 'https://example.test/no-text', 'fetch-not-witnessed'),
    wf('child fetches a listed URL with no snapshot at all', 'https://example.test/no-snapshot', 'fetch-not-witnessed'),
    wf('child fetches a stored URL that is not listed', 'https://example.test/not-listed', 'fetch-not-witnessed'),
    wf('child fetches a URL that is not listed and not stored', 'https://example.test/other', 'fetch-not-witnessed'),
    wf('child fetches something that is not a URL', 'not a url', 'deny'),
    wf('child-reviewing fetches a witnessed URL', 'https://example.test/paper-a', 0, { role: 'child-reviewing' }),
    wf('canary fetches a witnessed URL', 'https://example.test/paper-a', 0, { role: 'canary' }),
    wf('child-reviewing fetches an unwitnessed URL', 'https://example.test/other', 'fetch-not-witnessed', { role: 'child-reviewing' }),
    wf('child without must_read.json', 'https://example.test/paper-a', 'fetch-not-witnessed', { task: 'f1-nomr' }),
    wf('child with an unparseable must_read.json', 'https://example.test/paper-a', 'fetch-not-witnessed', { task: 'f1-badmr' }),
    wf('fresh-reviewer fetches', 'https://example.test/paper-a', ['tool-not-allowed', 'fetch-none'], { role: 'fresh-reviewer' }),
    wf('control fetches', 'https://example.test/paper-a', ['tool-not-allowed', 'fetch-none'], { role: 'control' }),
    wf('coordinator fetches', 'https://example.test/paper-a', ['tool-not-allowed', 'fetch-none'], { role: 'coordinator' }),
  ];
}

// ---------------------------------------------------------------------------------------------
// tests
// ---------------------------------------------------------------------------------------------
test('T1 role read paths: the child, the coordinator and the sealed folder', async () => {
  await withWorld({}, async (w) => {
    assert.deepEqual(await runCases(w, casesT1(w)), []);
  });
});

test('T1b the sealed folder is refused by its own step, not only by the prefixes: a profile that reads all of {root} still cannot read sealed/ or search a folder that holds it', async () => {
  await withWorld({}, async (w) => {
    editProfile(w, 'coordinator', (p) => { p.read_prefixes = ['{root}/']; });
    const co = (n, tool, input, expect, extra = {}) => ({ n, role: 'coordinator', tool, input, expect, ...extra });
    const cases = [
      co('broad profile: a view is readable', 'Read', { file_path: w.P('views', 'owner.md') }, 0),
      co('broad profile: the task table is readable', 'Read', { file_path: w.P('run', 'tasks.json') }, 0),
      co('broad profile: Read of sealed/x', 'Read', { file_path: w.P('sealed', 'x') }, 'read-outside-role', { detail: 'sealed:' }),
      co('broad profile: Read of a sealed seed', 'Read', { file_path: w.P('sealed', 'seeds', 'b1-1.json') }, 'read-outside-role', { detail: 'sealed:' }),
      co('broad profile: Read of the sealed folder itself', 'Read', { file_path: w.P('sealed') }, 'read-outside-role', { detail: 'sealed:' }),
      co('broad profile: Grep with path {root} (holds sealed/)', 'Grep', { pattern: 'x', path: w.root }, 'read-outside-role', { detail: 'sealed:' }),
      co('broad profile: Glob with path {root} (holds sealed/)', 'Glob', { pattern: '**/*.json', path: w.root }, 'read-outside-role', { detail: 'sealed:' }),
      co('broad profile: Grep in views (no sealed/ below it)', 'Grep', { pattern: 'x', path: w.P('views') }, 0),
    ];
    assert.deepEqual(await runCases(w, cases), []);
  });
});

test('T2 write paths: staging only, .claude and CLAUDE files, protected paths, the coordinator\'s plan paths', async () => {
  await withWorld({}, async (w) => {
    assert.deepEqual(await runCases(w, casesT2(w)), []);
  });
});

test('T3 path tricks: .. segments, relative paths, case variants, junction, ~, UNC, Glob patterns, empty paths', async () => {
  await withWorld({}, async (w) => {
    const a = w.A('child');
    const brief = path.join(a, 'in', 'brief.md');
    const cases = [
      { n: 'staging/../../../tcb/x.mjs', tool: 'Write', input: { file_path: fwd(a) + '/staging/../../../tcb/x.mjs', content: 'x' }, expect: ['write-protected', 'write-outside-role'] },
      { n: 'relative ..\\..\\run\\tasks.json with cwd = attempt (Read)', tool: 'Read', input: { file_path: '..\\..\\run\\tasks.json' }, cwd: a, expect: 'read-outside-role' },
      { n: 'relative ..\\..\\run\\tasks.json with cwd = attempt (Write)', tool: 'Write', input: { file_path: '..\\..\\run\\tasks.json', content: 'x' }, cwd: a, expect: ['write-protected', 'write-outside-role'] },
      { n: '.. that stays inside the attempt', tool: 'Read', input: { file_path: fwd(a) + '/in/../in/brief.md' }, expect: 0 },
      { n: 'tilde path', tool: 'Read', input: { file_path: '~/x' }, expect: 'path-unresolvable' },
      { n: 'bare tilde', tool: 'Read', input: { file_path: '~' }, expect: 'path-unresolvable' },
      { n: 'UNC path with backslashes', tool: 'Read', input: { file_path: '\\\\server\\share\\x.txt' }, expect: 'path-unresolvable' },
      { n: 'UNC path with slashes', tool: 'Read', input: { file_path: '//server/share/x.txt' }, expect: 'path-unresolvable' },
      { n: 'extended-length path', tool: 'Read', input: { file_path: '\\\\?\\' + brief }, expect: 'path-unresolvable' },
      { n: 'UNC write', tool: 'Write', input: { file_path: '\\\\server\\share\\x.txt', content: 'x' }, expect: 'path-unresolvable' },
      { n: 'empty path', tool: 'Read', input: { file_path: '' }, expect: 'path-unresolvable' },
      { n: 'non-string path', tool: 'Read', input: { file_path: 42 }, expect: 'path-unresolvable' },
      { n: 'Glob pattern ../**', tool: 'Glob', input: { pattern: '../**', path: a }, expect: 'path-unresolvable' },
      { n: 'Glob pattern with a .. segment in the middle', tool: 'Glob', input: { pattern: 'in/../../*.json', path: a }, expect: 'path-unresolvable' },
      { n: 'Glob absolute pattern', tool: 'Glob', input: { pattern: fwd(w.root) + '/**', path: a }, expect: 'path-unresolvable' },
      { n: 'Grep glob with ..', tool: 'Grep', input: { pattern: 'x', path: a, glob: '../x' }, expect: 'path-unresolvable' },
      { n: 'Grep absolute glob', tool: 'Grep', input: { pattern: 'x', path: a, glob: fwd(w.root) + '/*.json' }, expect: 'path-unresolvable' },
      { n: 'Glob pattern inside the attempt', tool: 'Glob', input: { pattern: 'in/*.md', path: a }, expect: 0 },
    ];
    if (process.platform === 'win32') {
      const low = brief[0].toLowerCase() + brief.slice(1);
      const up = brief[0].toUpperCase() + brief.slice(1);
      cases.push(
        { n: 'case variant: upper drive, forward slashes', tool: 'Read', input: { file_path: fwd(up) }, expect: 0 },
        { n: 'case variant: lower drive, backslashes', tool: 'Read', input: { file_path: low }, expect: 0 },
        { n: 'case variant: all lower case', tool: 'Read', input: { file_path: brief.toLowerCase() }, expect: 0 },
        { n: 'case variant: all upper case', tool: 'Read', input: { file_path: fwd(brief).toUpperCase() }, expect: 0 },
        { n: 'case variant of a forbidden path stays forbidden', tool: 'Read', input: { file_path: w.P('STORE', 'objects', 'c_x.json').toLowerCase() }, expect: 'read-outside-role' },
      );
    }
    // a junction inside staging that points at the run folder (skipped where junctions cannot be made)
    const jn = path.join(a, 'staging', 'jn');
    let junction = false;
    try {
      fs.symlinkSync(w.P('run'), jn, 'junction');
      w.junctions.push(jn);
      junction = true;
    } catch { /* cannot make a junction here */ }
    if (junction) {
      cases.push(
        { n: 'write through a junction to run/', tool: 'Write', input: { file_path: path.join(jn, 'x.txt'), content: 'x' }, expect: ['write-protected', 'write-outside-role'] },
        { n: 'read through a junction to run/', tool: 'Read', input: { file_path: path.join(jn, 'tasks.json') }, expect: 'read-outside-role' },
      );
    }
    assert.deepEqual(await runCases(w, cases), []);
    assert.ok(fs.existsSync(path.join(w.P('run'), 'tasks.json')), 'run/tasks.json must still exist');
  });
});

test('T4 Edit, MultiEdit and NotebookEdit: target fields are checked; MultiEdit and NotebookEdit are tool-denied', async () => {
  await withWorld({}, async (w) => {
    assert.deepEqual(await runCases(w, casesT4(w)), []);
  });
});

test('T5 Bash: tool-denied for a child; the coordinator only runs node tcb/<name>.mjs without shell metacharacters', async () => {
  await withWorld({}, async (w) => {
    assert.deepEqual(await runCases(w, casesT5(w)), []);
  });
  // the bash: none branch of a profile that (wrongly) allows Bash is bash-refused
  await withWorld({}, async (w) => {
    editProfile(w, 'fmea', (p) => {
      p.tools_allow = [...new Set([...p.tools_allow, 'Bash'])];
      p.tools_deny = p.tools_deny.filter((t) => t !== 'Bash');
      p.bash = 'none';
    });
    const f = await runCases(w, [{ n: 'Bash under a profile with bash none', role: 'fmea', tool: 'Bash', input: { command: 'echo x' }, expect: 'bash-refused' }]);
    assert.deepEqual(f, []);
  });
});

test('T6 Agent: only the profile\'s agent types; absent or other types are agent-type', async () => {
  await withWorld({}, async (w) => {
    assert.deepEqual(await runCases(w, casesT6(w)), []);
  });
});

test('T7 helper calls: the helper\'s own profile applies; a helper type the folder role does not list is helper-type', async () => {
  await withWorld({}, async (w) => {
    assert.deepEqual(await runCases(w, casesT7(w)), []);
  });
});

test('T8 checker reads: only a queue batch folder that holds batch.json', async () => {
  await withWorld({}, async (w) => {
    assert.deepEqual(await runCases(w, casesT8(w)), []);
  });
});

test('T9 witnessed fetch: must_read.json plus a stored text snapshot; the hook does not read the ledger', async () => {
  await withWorld({}, async (w) => {
    assert.deepEqual(await runCases(w, casesT9(w)), []);
  });
  // fetch none and fetch any, through profiles edited in a copy
  await withWorld({}, async (w) => {
    editProfile(w, 'control', (p) => { p.tools_allow = [...p.tools_allow, 'WebFetch']; p.fetch = 'none'; });
    editProfile(w, 'child-reviewing', (p) => { p.fetch = 'any'; });
    const f = await runCases(w, [
      { n: 'fetch none profile', role: 'control', tool: 'WebFetch', input: { url: 'https://example.test/paper-a', prompt: 'p' }, expect: 'fetch-none' },
      { n: 'fetch any profile, unlisted URL', role: 'child-reviewing', tool: 'WebFetch', input: { url: 'https://example.test/anything-else', prompt: 'p' }, expect: 0 },
    ]);
    assert.deepEqual(f, []);
  });
  // a 50 MB ledger must not matter
  await withWorld({ thr: { hook_deadline_ms: 3000 } }, async (w) => {
    const fd = fs.openSync(w.P('run', 'ledger.jsonl'), 'w');
    const chunk = Buffer.alloc(1 << 20, '{"seq":1,"kind":"x"}\n');
    for (let i = 0; i < 50; i++) fs.writeSync(fd, chunk);
    fs.closeSync(fd);
    assert.ok(fs.statSync(w.P('run', 'ledger.jsonl')).size >= 50 * (1 << 20));
    const c = { n: 'allowed fetch with a 50 MB ledger', tool: 'WebFetch', input: { url: 'https://example.test/paper-a', prompt: 'p' }, expect: 0 };
    const r = await runCase(w, c);
    assert.equal(judge(c, r), null, 'the allowed call must still be allowed');
    assert.ok(r.ms < 10000, `the call took ${r.ms} ms`);
  });
});

test('T10 stale epoch: every tool is stale-epoch for a fenced or replaced attempt; an unreadable table is table-unreadable', async () => {
  await withWorld({ tasks: false }, async (w) => {
    const rows = [];
    const mk = (task, over) => {
      rows.push(row('child', { task, ...over }));
      for (let e = 1; e <= 4; e++) mkAttempt(w.root, task, e);
    };
    mk('e-stale', { epoch: 3 });
    mk('e-fenced', { epoch: 2, step: 'fenced' });
    mk('e-ok', { epoch: 2 });
    mk('e-next', { epoch: 4 });
    for (const step of ['none', 'stop-requested', 'stopped', 'admitted', 'started', 'bound']) mk(`e-step-${step}`, { epoch: 1, step });
    for (const state of ['planned', 'parked', 'committed', 'cut', 'failed', 'dropped']) mk(`e-state-${state}`, { epoch: 1, state, step: 'bound' });
    writeTable(w.root, rows);

    const tools = (task, e) => {
      const a = w.att(task, e);
      return [
        { tool: 'Read', input: { file_path: path.join(a, 'in', 'brief.md') } },
        { tool: 'Write', input: { file_path: path.join(a, 'staging', 'x.json'), content: '{}' } },
        { tool: 'Glob', input: { pattern: '*', path: a } },
        { tool: 'Grep', input: { pattern: 'x', path: a } },
        { tool: 'WebFetch', input: { url: 'https://example.test/paper-a', prompt: 'p' } },
        { tool: 'Agent', input: { subagent_type: 'reader', prompt: 'x' } },
        { tool: 'Bash', input: { command: 'echo x' } },
        { tool: 'MultiEdit', input: { file_path: path.join(a, 'staging', 'x.json'), edits: [] } },
        { tool: 'Read', input: { file_path: w.P('store', 'objects', 'c_x.json') } },
      ];
    };
    const cases = [];
    for (const t of tools('e-stale', 2)) cases.push({ n: `row epoch 3, hook epoch 2: ${t.tool}`, task: 'e-stale', epoch: 2, ...t, expect: 'stale-epoch' });
    for (const t of tools('e-next', 3)) cases.push({ n: `row epoch 4, hook epoch 3: ${t.tool}`, task: 'e-next', epoch: 3, ...t, expect: 'stale-epoch' });
    for (const t of tools('e-fenced', 2)) cases.push({ n: `row at step fenced, equal epoch: ${t.tool}`, task: 'e-fenced', epoch: 2, ...t, expect: 'stale-epoch' });
    for (const t of tools('no-such-task', 1)) cases.push({ n: `no such row: ${t.tool}`, task: 'no-such-task', epoch: 1, ...t, expect: 'stale-epoch' });
    cases.push({ n: 'current epoch, active, bound: Read', task: 'e-ok', epoch: 2, tool: 'Read', input: { file_path: path.join(w.att('e-ok', 2), 'in', 'brief.md') }, expect: 0 });
    for (const step of ['none', 'stop-requested', 'stopped']) {
      cases.push({ n: `step ${step} is stale-epoch`, task: `e-step-${step}`, epoch: 1, tool: 'Read', input: { file_path: path.join(w.att(`e-step-${step}`, 1), 'in', 'brief.md') }, expect: 'stale-epoch' });
    }
    for (const step of ['admitted', 'started', 'bound']) {
      cases.push({ n: `step ${step} is allowed`, task: `e-step-${step}`, epoch: 1, tool: 'Read', input: { file_path: path.join(w.att(`e-step-${step}`, 1), 'in', 'brief.md') }, expect: 0 });
    }
    for (const state of ['planned', 'parked', 'committed', 'cut', 'failed', 'dropped']) {
      cases.push({ n: `state ${state} is stale-epoch`, task: `e-state-${state}`, epoch: 1, tool: 'Read', input: { file_path: path.join(w.att(`e-state-${state}`, 1), 'in', 'brief.md') }, expect: 'stale-epoch' });
    }
    assert.deepEqual(await runCases(w, cases), []);

    const probe = { task: 'e-ok', epoch: 2, tool: 'Read', input: { file_path: path.join(w.att('e-ok', 2), 'in', 'brief.md') }, expect: 'table-unreadable' };
    fs.writeFileSync(w.P('run', 'tasks.json'), '{ this is not json');
    assert.deepEqual(await runCases(w, [{ n: 'corrupt tasks.json', ...probe }]), []);
    fs.writeFileSync(w.P('run', 'tasks.json'), JSON.stringify({ schema_version: 1, rev: 1 }));
    assert.deepEqual(await runCases(w, [{ n: 'schema-invalid tasks.json', ...probe }]), []);
    fs.rmSync(w.P('run', 'tasks.json'));
    assert.deepEqual(await runCases(w, [{ n: 'missing tasks.json', ...probe }]), []);
  });
});

test('T10b FX-CLAIM step 1: the first session claims the attempt; the same session goes on, another is attempt-claimed, a tombstone is attempt-cancelled, a malformed session_id is bad-input', async () => {
  await withWorld({ tasks: false }, async (w) => {
    const rows = [row('child', { task: 'c-claim', epoch: 1 }), row('child', { task: 'c-tomb', epoch: 1 }), row('child', { task: 'c-stale', epoch: 2 })];
    for (const t of ['c-claim', 'c-tomb', 'c-stale']) mkAttempt(w.root, t, 1);
    writeTable(w.root, rows);
    const OTHER = '0a1b2c3d-0000-4000-8000-00000000ffff';
    const call = (task, sid, extra = {}) => {
      const a = w.att(task, 1);
      const input = { file_path: path.join(a, 'in', 'brief.md') };
      const stdin = { hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: input, cwd: a, transcript_path: w.P('transcripts', 'x.jsonl') };
      if (sid !== undefined) stdin.session_id = sid;
      return { task, epoch: 1, tool: 'Read', input, stdin, ...extra };
    };
    const claim = (task) => path.join(w.att(task, 1), 'claim.json');
    // a malformed or missing session_id, and a stale epoch: denied, and nothing is claimed
    assert.deepEqual(await runCases(w, [
      { n: 'malformed session_id', ...call('c-claim', 's'), expect: 'bad-input' },
      { n: 'no session_id', ...call('c-claim', undefined), expect: 'bad-input' },
      { n: 'stale epoch first', ...call('c-stale', SESSION), expect: 'stale-epoch' },
    ]), []);
    assert.equal(fs.existsSync(claim('c-claim')), false);
    assert.equal(fs.existsSync(claim('c-stale')), false);
    // the first call claims; the same session goes on; another session is denied; the claim is unchanged
    assert.deepEqual(await runCases(w, [{ n: 'first call claims', ...call('c-claim', SESSION), expect: 0 }]), []);
    assert.deepEqual(JSON.parse(fs.readFileSync(claim('c-claim'), 'utf8')), { kind: 'session', session_id: SESSION });
    const bytes = fs.readFileSync(claim('c-claim'));
    assert.deepEqual(await runCases(w, [
      { n: 'the same session again', ...call('c-claim', SESSION), expect: 0 },
      { n: 'another session', ...call('c-claim', OTHER), expect: 'attempt-claimed' },
    ]), []);
    assert.ok(bytes.equals(fs.readFileSync(claim('c-claim'))), 'the claim is made once and kept');
    // a tombstone (the fence cancelled the attempt before any claim): every session is denied
    fs.writeFileSync(claim('c-tomb'), JSON.stringify({ kind: 'tombstone', task: 'c-tomb', epoch: 1 }));
    const tomb = fs.readFileSync(claim('c-tomb'));
    assert.deepEqual(await runCases(w, [
      { n: 'tombstone, this session', ...call('c-tomb', SESSION), expect: 'attempt-cancelled' },
      { n: 'tombstone, another session', ...call('c-tomb', OTHER), expect: 'attempt-cancelled' },
    ]), []);
    assert.ok(tomb.equals(fs.readFileSync(claim('c-tomb'))));
    // a claim that does not parse is tamper: denied
    fs.writeFileSync(claim('c-tomb'), '{ not json');
    assert.deepEqual(await runCases(w, [{ n: 'unparseable claim', ...call('c-tomb', SESSION), expect: 'claim-invalid' }]), []);
  });
});

test('T11 fail-safe: every kind of bad invocation or bad input is exit 2', async () => {
  await withWorld({}, async (w) => {
    const a = w.A('child');
    const okTool = { tool: 'Read', input: { file_path: path.join(a, 'in', 'brief.md') } };
    // a copy of the hook below wt/ (the hook and the library it imports: two files)
    const copy = w.P('wt', 'x');
    fs.mkdirSync(copy, { recursive: true });
    for (const f of ['guard-hook.mjs', 'lib.mjs']) fs.copyFileSync(path.join(TCB, f), path.join(copy, f));
    // a junction to the live tcb/: node gets a script path that is not the hook's realpath
    const jn = w.P('jn-tcb');
    fs.symlinkSync(TCB, jn, 'junction');
    w.junctions.push(jn);
    editProfile(w, 'control', (p) => { p.bogus_extra = true; });
    editProfile(w, 'stpa', (p) => { delete p.fetch; });
    fs.writeFileSync(w.P('tcb', 'profiles', 'canary.json'), '{ not json');
    fs.rmSync(w.P('tcb', 'profiles', 'fmea.json'));
    const cases = [
      { n: 'no --role', rawArgs: ['--root', w.root, '--task', 'f1-research', '--epoch', '1'], ...okTool, expect: 'deny' },
      { n: 'unknown role', rawArgs: ['--root', w.root, '--role', 'wizard', '--task', 'f1-research', '--epoch', '1'], ...okTool, expect: 'deny' },
      { n: 'no --root', rawArgs: ['--role', 'child', '--task', 'f1-research', '--epoch', '1'], ...okTool, expect: 'deny' },
      { n: 'unknown flag', rawArgs: ['--root', w.root, '--role', 'child', '--task', 'f1-research', '--epoch', '1', '--bogus', '1'], ...okTool, expect: 'deny' },
      { n: 'child without --task and --epoch', rawArgs: ['--root', w.root, '--role', 'child'], ...okTool, expect: 'usage' },
      { n: 'child without --epoch', rawArgs: ['--root', w.root, '--role', 'child', '--task', 'f1-research'], ...okTool, expect: 'usage' },
      { n: 'child with a non-numeric --epoch', rawArgs: ['--root', w.root, '--role', 'child', '--task', 'f1-research', '--epoch', 'abc'], ...okTool, expect: 'deny' },
      { n: 'coordinator with --task', rawArgs: ['--root', w.root, '--role', 'coordinator', '--task', 'f1-research', '--epoch', '1'], role: 'coordinator', tool: 'Read', input: { file_path: w.P('run', 'status.json') }, expect: 'usage' },
      { n: 'profile file missing', role: 'fmea', ...okTool, input: { file_path: path.join(w.A('fmea'), 'in', 'brief.md') }, expect: 'profile-missing' },
      { n: 'profile with an extra field', role: 'control', tool: 'Read', input: { file_path: path.join(w.A('control'), 'in', 'brief.md') }, expect: 'profile-invalid' },
      { n: 'profile with a missing field', role: 'stpa', tool: 'Read', input: { file_path: path.join(w.A('stpa'), 'in', 'brief.md') }, expect: 'profile-invalid' },
      { n: 'profile that is not JSON', role: 'canary', tool: 'Read', input: { file_path: path.join(w.A('canary'), 'in', 'brief.md') }, expect: ['profile-invalid', 'profile-missing'] },
      { n: 'stdin is not JSON', stdin: 'this is not json', expect: 'bad-input' },
      { n: 'stdin is empty', stdin: '', expect: 'bad-input' },
      { n: 'stdin is a JSON array', stdin: '[]', expect: 'bad-input' },
      { n: 'stdin is JSON null', stdin: 'null', expect: 'bad-input' },
      { n: 'stdin without tool_name', stdin: { hook_event_name: 'PreToolUse', tool_input: {}, cwd: a }, expect: 'bad-input' },
      { n: 'hook_event_name PostToolUse', stdin: { hook_event_name: 'PostToolUse', tool_name: 'Read', tool_input: { file_path: path.join(a, 'in', 'brief.md') }, cwd: a }, expect: 'bad-input' },
      { n: 'hook_event_name missing', stdin: { tool_name: 'Read', tool_input: { file_path: path.join(a, 'in', 'brief.md') }, cwd: a }, expect: 'bad-input' },
      { n: 'a hook copy run from wt/x', script: path.join(copy, 'guard-hook.mjs'), ...okTool, expect: 'run-from-attempt' },
      { n: 'control case: the same call through the real hook', ...okTool, expect: 0 },
      // started through a junction the hook still decides: a lexical argv[1] check would skip main()
      // and exit 0 with nothing on stdout or stderr (fail open)
      { n: 'the hook run through a junction still denies', script: path.join(jn, 'guard-hook.mjs'), role: 'coordinator', tool: 'Write', input: { file_path: w.P('tcb', 'evil.mjs'), content: 'x' }, expect: 'write-protected' },
      { n: 'the hook run through a junction still allows', script: path.join(jn, 'guard-hook.mjs'), ...okTool, expect: 0 },
    ];
    assert.deepEqual(await runCases(w, cases), []);
  });
});

test('T12 decide(input, args, io) is exported without side effects; an io that throws is deny internal; an unparseable thresholds.json and a stdin never closed are exit 2', async () => {
  // (a) the export, in a child process of its own
  await withWorld({}, async (w) => {
    fs.mkdirSync(w.P('driver'), { recursive: true });
    const driver = w.P('driver', 'driver.mjs');
    fs.writeFileSync(driver, [
      'const [,, url, root] = process.argv;',
      'const m = await import(url);',
      "const io = new Proxy(function () {}, { get() { return () => { throw new Error('io boom'); }; }, apply() { throw new Error('io boom'); } });",
      "const input = { hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: { file_path: root + '/plan/questions/f1.json' }, cwd: root, session_id: 's' };",
      'let res = null; let threw = null;',
      "try { res = await m.decide(input, { root, role: 'coordinator' }, io); } catch (e) { threw = String(e && e.message); }",
      "console.log(JSON.stringify({ type: typeof m.decide, res, threw }));",
    ].join('\n'));
    const before = treeHash(w.root);
    const r = spawnSync(process.execPath, [driver, pathToFileURL(hookScript(w)).href, w.root], { cwd: w.root, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: 20000, windowsHide: true });
    assert.equal(r.status, 0, `driver failed: ${r.stderr}`);
    assert.ok(!/\[guard-hook\]/.test(r.stderr), 'importing the module must not run the hook');
    const out = JSON.parse(lines(r.stdout).at(-1));
    assert.equal(out.type, 'function', 'the module must export decide');
    assert.equal(out.threw, null, 'decide must return a deny, not throw, when io throws');
    const s = JSON.stringify(out.res);
    assert.ok(s.includes('internal'), `the result must name the code internal: ${s}`);
    assert.ok(!/"(allow|ok|allowed)":true/.test(s), `the result must not allow: ${s}`);
    assert.equal(treeHash(w.root).hash, before.hash, 'importing and calling decide must write nothing');
  });
  // (b) an unparseable thresholds.json
  await withWorld({}, async (w) => {
    fs.writeFileSync(w.P('tcb', 'thresholds.json'), '{ this is not json');
    const a = w.A('child');
    const f = await runCases(w, [
      { n: 'unparseable thresholds.json, allowed call', tool: 'Read', input: { file_path: path.join(a, 'in', 'brief.md') }, expect: 'deny' },
      { n: 'unparseable thresholds.json, coordinator', role: 'coordinator', tool: 'Read', input: { file_path: w.P('run', 'status.json') }, expect: 'deny' },
    ]);
    assert.deepEqual(f, []);
  });
  // (c) stdin never closed, deadline 200 ms
  await withWorld({ thr: { hook_deadline_ms: 200 } }, async (w) => {
    const c = { n: 'stdin never closed', tool: 'Read', input: { file_path: path.join(w.A('child'), 'in', 'brief.md') }, noEnd: true, limitMs: 15000, expect: 'internal' };
    const r = await runCase(w, c);
    assert.equal(judge(c, r), null);
    assert.ok(r.ms < 8000, `the hook took ${r.ms} ms to give up`);
  });
});

test('T13 the hook writes nothing: the tree, the lock folder and the ledger are the same after 50 mixed calls', async () => {
  await withWorld({}, async (w) => {
    const all = [...casesT1(w), ...casesT2(w), ...casesT4(w), ...casesT5(w), ...casesT6(w), ...casesT7(w), ...casesT8(w), ...casesT9(w)];
    const step = Math.max(1, Math.floor(all.length / 50));
    const picked = [];
    for (let i = 0; picked.length < 50; i++) picked.push(all[(i * step) % all.length]);
    assert.ok(picked.some((c) => c.expect === 0) && picked.some((c) => c.expect !== 0), 'the mix must hold allowed and denied calls');
    // FX-CLAIM step 1: a session's first task-role call claims its attempt (the hook's one write, 0b);
    // this session's claims are made before the count, so the calls below write nothing
    for (const d of fs.readdirSync(w.P('wt'))) {
      if (fs.statSync(w.P('wt', d)).isDirectory()) fs.writeFileSync(w.P('wt', d, 'claim.json'), JSON.stringify({ kind: 'session', session_id: SESSION }));
    }
    const ledgerBefore = fs.readFileSync(w.P('run', 'ledger.jsonl'));
    const before = treeHash(w.root);
    assert.deepEqual(await runCases(w, picked), []);
    const after = treeHash(w.root);
    assert.equal(after.hash, before.hash, 'the root changed during the hook calls');
    assert.equal(after.count, before.count);
    assert.ok(!after.names.some((n) => /\.lock$|\.tmp$|\.stale$|\.orphan$/.test(n)), 'a lock or temp file appeared');
    assert.ok(!fs.existsSync(w.P('run', 'run.lock')));
    assert.deepEqual(fs.readFileSync(w.P('run', 'ledger.jsonl')), ledgerBefore);
  });
});

test('T15 the hook\'s one write (0b): a strict exclusive create inside its budget; a spent budget, a missing parent or no hard link is a deny that made nothing', async () => {
  const m = await import(pathToFileURL(hookScript()).href);
  assert.equal(typeof m.hookWrite, 'function', 'the module exports hookWrite');
  await withWorld({}, async (w) => {
    const dir = w.P('wt', 'f1-research-e1', 'outcome');
    fs.mkdirSync(dir);
    const names = () => fs.readdirSync(dir).sort();
    const deny = (r, code) => {
      assert.equal(r.allow, false, JSON.stringify(r));
      assert.deepEqual([r.exit, r.code, r.result], [2, code, null], JSON.stringify(r));
    };
    const f = path.join(dir, '1.json');
    let r = m.hookWrite(f, 'one', {});
    assert.deepEqual([r.allow, r.exit, r.result], [true, 0, 'created']);
    assert.equal(m.hookWrite(f, 'one', {}).result, 'identical');
    r = m.hookWrite(f, 'two', {});
    assert.deepEqual([r.allow, r.result], [true, 'different'], 'another writer\'s bytes are a result, not a deny');
    assert.equal(fs.readFileSync(f, 'utf8'), 'one');
    // the budget is spent before the create
    deny(m.hookWrite(path.join(dir, '2.json'), 'x', { budgetMs: () => 0 }), 'budget-spent');
    deny(m.hookWrite(path.join(dir, '2.json'), 'x', { budgetMs: () => -1 }), 'budget-spent');
    assert.deepEqual(names(), ['1.json']);
    // no folder is made
    deny(m.hookWrite(path.join(dir, 'none', '3.json'), 'x', {}), 'no-parent');
    assert.equal(fs.existsSync(path.join(dir, 'none')), false);
    // no hard links: no fallback
    const origLink = fs.linkSync;
    fs.linkSync = function (a, b) {
      if (String(b).includes('4.json')) throw Object.assign(new Error('ENOTSUP: simulated, link'), { code: 'ENOTSUP', syscall: 'link' });
      return origLink.apply(this, arguments);
    };
    try {
      deny(m.hookWrite(path.join(dir, '4.json'), 'x', {}), 'no-hardlink');
    } finally {
      fs.linkSync = origLink;
    }
    assert.deepEqual(names(), ['1.json'], 'nothing at the name, no temp file');
    // the budget runs out during the retries of a sharing error
    const origOpen = fs.openSync;
    let tries = 0;
    fs.openSync = function (p, ...rest) {
      if (String(p).includes('5.json') && String(p).endsWith('.tmp')) {
        tries++;
        throw Object.assign(new Error('EPERM: simulated sharing violation, open'), { code: 'EPERM', syscall: 'open' });
      }
      return origOpen.call(this, p, ...rest);
    };
    let ms;
    try {
      const t0 = performance.now();
      r = m.hookWrite(path.join(dir, '5.json'), 'x', { budgetMs: () => 150 });
      ms = performance.now() - t0;
    } finally {
      fs.openSync = origOpen;
    }
    deny(r, 'budget-spent');
    assert.ok(tries >= 2 && tries <= 40, `tries ${tries}`);
    assert.ok(ms < 700, `denied after ${Math.round(ms)} ms, not inside the 150 ms left (40 retries take 1 s or more)`);
    assert.deepEqual(names(), ['1.json']);
    // any other failure is a deny too
    deny(m.hookWrite(path.join(dir, '6.json'), 'x', { create: () => { throw new Error('boom'); } }), 'write-failed');
    deny(m.hookWrite(path.join(dir, '6.json'), 'x', { create: () => 'maybe' }), 'internal');
  });
});

// ---------------------------------------------------------------------------------------------
// T14: the shipped role files
// ---------------------------------------------------------------------------------------------
const CHILDLIKE = { tools_allow: ['Read', 'Glob', 'Grep', 'Write', 'Edit', 'Agent', 'WebFetch', 'ToolSearch'], read_prefixes: ['{attempt}/'], write_prefixes: ['{attempt}/staging/'], agent_types: ['reader'], fetch: 'witnessed', bash: 'none' };
const FRESHLIKE = { tools_allow: ['Read', 'Glob', 'Grep', 'Write'], read_prefixes: ['{attempt}/'], write_prefixes: ['{attempt}/staging/'], agent_types: [], fetch: 'none', bash: 'none' };
const COORD = {
  tools_allow: ['Read', 'Glob', 'Grep', 'Write', 'Edit', 'Agent', 'Bash', 'PowerShell', 'ToolSearch'],
  read_prefixes: ['{root}/run/status.json', '{root}/views/', '{root}/store/objects/x_', '{root}/completeness/gate.json', '{root}/plan/', '{root}/tcb/briefs/', '{root}/tcb/README.md'],
  write_prefixes: ['{root}/plan/questions/', '{root}/plan/approaches.json', '{root}/plan/protocols/', '{root}/plan/analysis-plan.json', '{root}/plan/cost-inputs.json', '{root}/plan/tasks-plan.json', '{root}/plan/plant-candidates/', '{root}/plan/our-work/', '{root}/plan/notes/'],
  agent_types: ['checker', 'mapper'],
  fetch: 'none',
  bash: 'tcb-node',
};
const EXPECT = {
  child: CHILDLIKE,
  'child-reviewing': CHILDLIKE,
  canary: CHILDLIKE,
  'fresh-reviewer': FRESHLIKE,
  control: FRESHLIKE,
  stpa: FRESHLIKE,
  fmea: FRESHLIKE,
  mapper: FRESHLIKE,
  coordinator: COORD,
  reader: { tools_allow: ['WebSearch', 'WebFetch', 'ToolSearch', 'StructuredOutput'], read_prefixes: [], write_prefixes: [], agent_types: [], fetch: 'any', bash: 'none' },
  checker: { tools_allow: ['Read', 'StructuredOutput'], read_prefixes: ['{root}/queue/{batch}/'], write_prefixes: [], agent_types: [], fetch: 'none', bash: 'none' },
};
const sorted = (a) => [...a].sort();
const matchTool = (name, list) => list.some((e) => (e.endsWith('*') ? name.startsWith(e.slice(0, -1)) : e === name));
const subst = (s) => s.replaceAll('{root}', 'C:/x/run1').replaceAll('{attempt}', 'C:/x/run1/wt/t1-e1').replaceAll('{task}', 't1').replaceAll('{epoch}', '1').replaceAll('{node}', 'C:/nodejs/node.exe');

function frontMatter(text) {
  const t = text.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n');
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(t);
  assert.ok(m, 'agent file must start with a --- front matter block');
  const fm = {};
  for (const l of m[1].split('\n')) {
    const i = l.indexOf(':');
    if (i > 0) fm[l.slice(0, i).trim()] = l.slice(i + 1).trim();
  }
  return { fm, body: m[2] };
}

test('T14 shipped profiles, settings and agent files agree with each other and with the briefs', () => {
  const dir = path.join(TCB, 'profiles');
  assert.ok(fs.existsSync(dir), 'tcb/profiles/ must exist');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
  assert.deepEqual(files, Object.keys(EXPECT).sort(), 'profiles exist for exactly the roles of the spec');
  const profiles = {};
  const problems = [];
  for (const role of files) {
    const p = JSON.parse(fs.readFileSync(path.join(dir, role + '.json'), 'utf8'));
    profiles[role] = p;
    const keys = Object.keys(p).sort();
    const want = ['agent_types', 'bash', 'fetch', 'read_prefixes', 'role', 'tools_allow', 'tools_deny', 'write_prefixes'];
    const extra = keys.filter((k) => !want.includes(k) && k !== 'schema_version');
    const missing = want.filter((k) => !keys.includes(k));
    if (extra.length || missing.length) problems.push(`${role}: extra ${extra} missing ${missing}`);
    if ('schema_version' in p && p.schema_version !== 1) problems.push(`${role}: schema_version ${p.schema_version}`);
    if (p.role !== role) problems.push(`${role}: role field is ${p.role}`);
    for (const k of ['tools_allow', 'tools_deny', 'read_prefixes', 'write_prefixes', 'agent_types']) {
      if (!Array.isArray(p[k]) || !p[k].every((x) => typeof x === 'string')) problems.push(`${role}: ${k} is not a string array`);
    }
    if (!['none', 'witnessed', 'any'].includes(p.fetch)) problems.push(`${role}: fetch ${p.fetch}`);
    if (!['none', 'tcb-node'].includes(p.bash)) problems.push(`${role}: bash ${p.bash}`);
    const e = EXPECT[role];
    if (role === 'coordinator') {
      const missingTools = e.tools_allow.filter((t) => !p.tools_allow.includes(t));
      const extras = p.tools_allow.filter((t) => !e.tools_allow.includes(t));
      if (missingTools.length) problems.push(`coordinator: tools_allow lacks ${missingTools}`);
      if (extras.some((t) => !t.endsWith('*'))) problems.push(`coordinator: extra non-prefix tools ${extras.filter((t) => !t.endsWith('*'))}`);
    } else if (JSON.stringify(sorted(p.tools_allow)) !== JSON.stringify(sorted(e.tools_allow))) problems.push(`${role}: tools_allow ${p.tools_allow}`);
    for (const k of ['read_prefixes', 'write_prefixes', 'agent_types']) {
      if (JSON.stringify(sorted(p[k])) !== JSON.stringify(sorted(e[k]))) problems.push(`${role}: ${k} is ${JSON.stringify(p[k])}`);
    }
    if (p.fetch !== e.fetch) problems.push(`${role}: fetch ${p.fetch}, want ${e.fetch}`);
    if (p.bash !== e.bash) problems.push(`${role}: bash ${p.bash}, want ${e.bash}`);
    let deny = ['Bash', 'PowerShell', 'NotebookEdit', 'MultiEdit', 'WebSearch', 'Task'];
    if (role === 'coordinator') deny = deny.filter((t) => t !== 'Bash' && t !== 'PowerShell');
    if (role === 'reader') deny = deny.filter((t) => t !== 'WebSearch');
    if (JSON.stringify(sorted(p.tools_deny)) !== JSON.stringify(sorted(deny))) problems.push(`${role}: tools_deny ${JSON.stringify(p.tools_deny)}, want ${JSON.stringify(deny)}`);
    const both = p.tools_allow.filter((t) => matchTool(t, p.tools_deny));
    if (both.length) problems.push(`${role}: allowed and denied: ${both}`);
  }
  assert.deepEqual(problems, [], 'profile problems');

  // settings
  const sdir = path.join(TCB, 'settings');
  const settingsRoles = [...TASK_ROLES, 'coordinator'];
  const sproblems = [];
  for (const role of settingsRoles) {
    const f = path.join(sdir, role + '.json');
    if (!fs.existsSync(f)) { sproblems.push(`${role}: settings file missing`); continue; }
    let s;
    try { s = JSON.parse(subst(fs.readFileSync(f, 'utf8'))); } catch (err) { sproblems.push(`${role}: does not parse after substitution: ${err.message}`); continue; }
    const p = profiles[role];
    const pre = s.hooks?.PreToolUse;
    if (!Array.isArray(pre) || pre.length !== 1 || pre[0].matcher !== '*' || !Array.isArray(pre[0].hooks) || pre[0].hooks.length !== 1) { sproblems.push(`${role}: hooks.PreToolUse shape`); continue; }
    const h = pre[0].hooks[0];
    const want = role === 'coordinator'
      ? '"C:/nodejs/node.exe" "C:/x/run1/tcb/guard-hook.mjs" --root "C:/x/run1" --role coordinator'
      : `"C:/nodejs/node.exe" "C:/x/run1/tcb/guard-hook.mjs" --root "C:/x/run1" --role ${role} --task t1 --epoch 1`;
    if (h.type !== 'command') sproblems.push(`${role}: hook type ${h.type}`);
    if (h.command !== want) sproblems.push(`${role}: hook command is\n  ${h.command}\nwant\n  ${want}`);
    if (h.timeout !== 30) sproblems.push(`${role}: hook timeout ${h.timeout}`);
    const allow = s.permissions?.allow;
    const deny = s.permissions?.deny;
    if (!Array.isArray(allow) || !Array.isArray(deny)) { sproblems.push(`${role}: permissions.allow/deny missing`); continue; }
    const toolOf = (e) => e.replace(/\(.*$/s, '');
    for (const e of allow) if (!matchTool(toolOf(e), p.tools_allow)) sproblems.push(`${role}: allow entry ${e} is not in the profile's tools_allow`);
    for (const t of p.tools_deny) if (!deny.some((e) => toolOf(e) === t)) sproblems.push(`${role}: tools_deny entry ${t} is not denied`);
    for (const e of allow) if (/^(Read|Write|Edit)$/.test(e)) sproblems.push(`${role}: allow entry ${e} is not scoped to a path`);
    for (const folder of ['tcb', 'run', 'store', 'sealed', 'review-in', '.git']) {
      for (const tool of ['Edit', 'Write']) {
        if (!deny.some((e) => e.startsWith(tool + '(') && e.includes(`/${folder}/`))) sproblems.push(`${role}: no ${tool} deny on ${folder}/`);
      }
    }
    if (role === 'coordinator') {
      if (!allow.includes('Bash(node tcb/*)')) sproblems.push('coordinator: allow lacks Bash(node tcb/*)');
    } else {
      if (p.tools_allow.includes('Read') && !allow.includes('Read(//C:/x/run1/wt/t1-e1/**)')) sproblems.push(`${role}: allow lacks Read(//{attempt}/**)`);
      if (p.tools_allow.includes('Edit') && !allow.includes('Edit(//C:/x/run1/wt/t1-e1/staging/**)')) sproblems.push(`${role}: allow lacks Edit(//{attempt}/staging/**)`);
      if (p.tools_allow.includes('Write') && !allow.some((e) => e.startsWith('Write(') && e.includes('/wt/t1-e1/staging/'))) sproblems.push(`${role}: allow lacks a Write scoped to staging`);
      if (p.agent_types.includes('reader') && !allow.includes('Agent(reader)')) sproblems.push(`${role}: allow lacks Agent(reader)`);
      if (!deny.some((e) => (e.startsWith('Edit(') || e.startsWith('Write(')) && e.includes('/wt/t1-e1/.claude/**'))) sproblems.push(`${role}: no deny on the attempt's .claude/**`);
    }
  }
  assert.deepEqual(sproblems, [], 'settings problems');

  // user-deny.json
  const ud = path.join(sdir, 'user-deny.json');
  assert.ok(fs.existsSync(ud), 'user-deny.json must exist');
  const udText = subst(fs.readFileSync(ud, 'utf8'));
  const strings = [];
  const collect = (v) => { if (typeof v === 'string') strings.push(v); else if (Array.isArray(v)) v.forEach(collect); else if (v && typeof v === 'object') Object.values(v).forEach(collect); };
  collect(JSON.parse(udText));
  const uproblems = [];
  for (const sfx of ['tcb/**', 'run/**', 'store/**', 'sealed/**', 'review-in/**', 'wt/*/.claude/**']) {
    for (const tool of ['Write', 'Edit']) {
      if (!strings.some((e) => e.startsWith(tool + '(') && e.includes('/' + sfx))) uproblems.push(`no ${tool} deny on ${sfx}`);
    }
  }
  for (const bad of ['plan/', 'views/', 'completeness/', 'queue/']) {
    if (strings.some((e) => e.includes('/' + bad))) uproblems.push(`user-level deny touches ${bad} (research paths only)`);
  }
  assert.deepEqual(uproblems, [], 'user-deny problems');

  // agent files
  const aproblems = [];
  for (const [name, toolsWant] of [['reader', ['WebSearch', 'WebFetch']], ['checker', ['Read']]]) {
    const f = path.join(TCB, 'agents', name + '.md');
    if (!fs.existsSync(f)) { aproblems.push(`${name}.md missing`); continue; }
    const { fm, body } = frontMatter(fs.readFileSync(f, 'utf8'));
    if (fm.name !== name) aproblems.push(`${name}.md: name is ${fm.name}`);
    if (!fm.description) aproblems.push(`${name}.md: no description`);
    const tools = (fm.tools ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    if (JSON.stringify(sorted(tools)) !== JSON.stringify(sorted(toolsWant))) aproblems.push(`${name}.md: tools are ${tools}`);
    const brief = fs.readFileSync(path.join(TCB, 'briefs', name + '.md'), 'utf8').replace(/^\uFEFF/, '').replaceAll('\r\n', '\n');
    if (body.trim() !== brief.trim()) aproblems.push(`${name}.md: body differs from tcb/briefs/${name}.md`);
  }
  assert.deepEqual(aproblems, [], 'agent file problems');
});

// ---------------------------------------------------------------------------------------------
// one more step of the spec that no numbered behaviour names: step 5's prefix entries
// ---------------------------------------------------------------------------------------------
test('step 5: a tools_allow entry ending in * admits every tool with that prefix and nothing else', async () => {
  await withWorld({}, async (w) => {
    editProfile(w, 'coordinator', (p) => { p.tools_allow = [...new Set([...p.tools_allow, 'mcp__ccd_session__*'])]; });
    const f = await runCases(w, [
      { n: 'tool under the prefix', role: 'coordinator', tool: 'mcp__ccd_session__list_sessions', input: {}, expect: 0 },
      { n: 'tool under another prefix', role: 'coordinator', tool: 'mcp__other__list', input: {}, expect: 'tool-not-allowed' },
      { n: 'ToolSearch', role: 'coordinator', tool: 'ToolSearch', input: { query: 'x', max_results: 1 }, expect: 0 },
      { n: 'tool denied wins', role: 'coordinator', tool: 'NotebookEdit', input: { notebook_path: w.P('plan', 'notes', 'n.ipynb') }, expect: 'tool-denied' },
    ]);
    assert.deepEqual(f, []);
  });
});

// ---------------------------------------------------------------------------------------------
// needs the app
// ---------------------------------------------------------------------------------------------
test('needs-app 1: the harness runs the hook before every tool call (helpers too), passes the hook fields and honours exit 2; a timeout or a node that fails to start fails open', (t) => {
  t.skip('needs-app: needs the app (the harness must call the hook, with agent_type for helpers, and honour exit 2)');
});
test('needs-app 2: user-level denies bind every session and the // absolute form works on Windows', (t) => {
  t.skip('needs-app: needs the app (user-level permission rules are applied by the harness)');
});
test('needs-app 3: a session started in wt/<task>-e<e>/ obeys that folder\'s settings and agent files and no ancestor\'s', (t) => {
  t.skip('needs-app: needs the app (which settings files a session reads is decided by the harness)');
});
