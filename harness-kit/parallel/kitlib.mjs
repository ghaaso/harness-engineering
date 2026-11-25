// kitlib.mjs: what unit.mjs and check.mjs share: the project, its config (<project>/.harness/kit.json), git, the
// list of test files, and running a command through the queue (research-tree/tools/lane.mjs of the clone, with the
// project's own queue folder <project>/.harness/lane).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const KIT = path.dirname(fileURLToPath(import.meta.url));
export const LANE = path.resolve(KIT, '..', '..', 'research-tree', 'tools', 'lane.mjs');
export const CPUS = Math.max(1, typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length);
export const LANE_MAX_S = 1500; // the lane's own ceiling on one command without --max-timeout-s
export const WAIT_S = 3000;     // the longest the lane waits for a slot (its own ceiling)

export class KitError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
export const r1 = (x) => Math.round((Number(x) || 0) * 10) / 10;
export const short = (h) => String(h || '').slice(0, 10);
export const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return !!e && e.code === 'EPERM'; } };
export const canon = (p) => {
  let r = path.resolve(p);
  try { r = fs.realpathSync.native(r); } catch { /* a missing path keeps its resolved form */ }
  r = r.replace(/\\/g, '/').replace(/\/+$/, '');
  return process.platform === 'win32' ? r.toLowerCase() : r;
};
export const inside = (child, parent) => { const c = canon(child), p = canon(parent); return c === p || c.startsWith(p + '/'); };

const GIT_ENV = Object.assign({}, process.env, { GIT_MERGE_AUTOEDIT: 'no', GIT_TERMINAL_PROMPT: '0' });
for (const k of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR']) delete GIT_ENV[k];
// a check runs as a fresh process whoever started us: under a `node --test` parent, NODE_TEST_CONTEXT makes a nested
// `node --test` report to that parent instead of running its files
export const RUN_ENV = Object.assign({}, process.env);
delete RUN_ENV.NODE_TEST_CONTEXT;

export function git(cwd, args, allowFail = false) {
  const r = spawnSync('git', ['-c', 'core.longpaths=true', ...args], { cwd, env: GIT_ENV, encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 28 });
  if (r.error) throw new KitError(64, `git ${args[0]}: ${r.error.message}`);
  if (r.status !== 0 && !allowFail) throw new KitError(64, `git ${args.join(' ')}: exit ${r.status}: ${String(r.stderr || r.stdout || '').trim().split('\n').slice(0, 6).join(' | ')}`);
  return r;
}
export const gitOut = (cwd, args) => git(cwd, args).stdout.trim();
export const gitOk = (cwd, args) => git(cwd, args, true).status === 0;

// Options: `--name value` for names in `values`, `--name` alone for names in `flags`; the rest are positional.
export function parseArgs(argv, values, flags = []) {
  const opt = {}, pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { pos.push(a); continue; }
    const eq = a.indexOf('=');
    const name = eq > 0 ? a.slice(2, eq) : a.slice(2);
    if (flags.includes(name) && eq < 0) { opt[name] = true; continue; }
    if (!values.includes(name)) throw new KitError(64, `unknown option: ${a}`);
    if (eq > 0) opt[name] = a.slice(eq + 1);
    else if (i + 1 < argv.length) opt[name] = argv[++i];
    else throw new KitError(64, `no value for ${a}`);
  }
  return { opt, pos };
}

// The project is the main checkout of the repository that holds `given` (or the folder we are called from): from a
// unit's copy the project is still the checkout the copy was made from, where .harness/ lives.
export function resolveProject(given) {
  const from = path.resolve(given || process.cwd());
  if (!fs.existsSync(from)) throw new KitError(64, `no folder ${from}`);
  const r = git(from, ['rev-parse', '--path-format=absolute', '--git-common-dir'], true);
  if (r.status !== 0) throw new KitError(64, `${from} is not inside a git repository; give --project <folder>`);
  const common = r.stdout.trim();
  if (path.basename(common) !== '.git') throw new KitError(64, `the repository of ${from} has no main checkout (${common}); give --project <folder>`);
  return path.dirname(common);
}
export const harnessDir = (project) => path.join(project, '.harness');

// ---- the config ----------------------------------------------------------------------------------------------------
function dropNotes(v) {
  if (Array.isArray(v)) return v.map(dropNotes);
  if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) if (!k.startsWith('//')) o[k] = dropNotes(x); return o; }
  return v;
}
// a command is an array of words (no shell); a string is split on spaces, keeping "quoted words" whole
export function words(cmd, key) {
  if (Array.isArray(cmd) && cmd.length && cmd.every((w) => typeof w === 'string')) return cmd.slice();
  if (typeof cmd === 'string' && cmd.trim()) {
    const out = [];
    for (const m of cmd.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)) out.push(m[1] ?? m[2] ?? m[3]);
    return out;
  }
  throw new KitError(64, `kit.json: ${key} must be a list of words, e.g. ["python3", "-m", "pytest", "{file}"]`);
}
function int(v, lo, hi, key) {
  if (!Number.isInteger(v) || v < lo || v > hi) throw new KitError(64, `kit.json: ${key} must be a whole number from ${lo} to ${hi}`);
  return v;
}
export function loadConfig(project) {
  const file = path.join(harnessDir(project), 'kit.json');
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); } catch {
    throw new KitError(64, `no config at ${file}; the set-up copies it there, or copy ${path.join(KIT, 'kit.example.json')} and edit it`);
  }
  let j;
  try { j = dropNotes(JSON.parse(raw)); } catch (e) { throw new KitError(64, `kit.json is not valid JSON: ${e.message}`); }
  const c = { file, project };
  if (!Array.isArray(j.test_files) || !j.test_files.length || !j.test_files.every((s) => typeof s === 'string' && s)) throw new KitError(64, 'kit.json: test_files must be a list of patterns, e.g. ["**/test_*.py"]');
  c.test_files = j.test_files;
  c.check_one = words(j.check_one, 'check_one');
  if (!c.check_one.some((w) => w.includes('{file}'))) throw new KitError(64, 'kit.json: check_one must hold {file}');
  c.check_all = words(j.check_all, 'check_all');
  c.check_one_timeout_s = int(j.check_one_timeout_s, 5, 7 * 24 * 3600, 'check_one_timeout_s');
  c.check_all_timeout_s = int(j.check_all_timeout_s, 5, 7 * 24 * 3600, 'check_all_timeout_s');
  c.landing_branch = String(j.landing_branch || '');
  if (!/^[\w][\w./-]*$/.test(c.landing_branch) || /\.\.|\/\/|\.lock$|\/$/.test(c.landing_branch)) throw new KitError(64, `kit.json: landing_branch is not a branch name: ${j.landing_branch}`);
  c.unit_prefix = typeof j.unit_prefix === 'string' ? j.unit_prefix : 'u/';
  if (!/^[\w][\w./-]*$/.test(c.unit_prefix) && c.unit_prefix !== '') throw new KitError(64, `kit.json: unit_prefix is not a branch prefix: ${j.unit_prefix}`);
  if (typeof j.copies_dir !== 'string' || !j.copies_dir.trim()) throw new KitError(64, 'kit.json: copies_dir must name a folder, e.g. "../{project}-units"');
  c.copies_dir = path.resolve(project, j.copies_dir.replace(/\{project\}/g, path.basename(project)));
  if (inside(c.copies_dir, project)) throw new KitError(64, `kit.json: copies_dir ${c.copies_dir} lies inside the project; it must lie outside it`);
  if (canon(c.copies_dir).split('/').includes('.claude')) throw new KitError(64, `kit.json: copies_dir ${c.copies_dir} lies inside a .claude folder; it must not`);
  c.queue_slots = int(j.queue_slots, 1, 1024, 'queue_slots');
  if (c.queue_slots > CPUS) c.queue_slots = CPUS; // the lane allows at most the processor count
  c.shards = {};
  for (const [f, list] of Object.entries(j.shards || {})) {
    if (!Array.isArray(list) || !list.length || !list.every((a) => Array.isArray(a) && a.every((w) => typeof w === 'string'))) throw new KitError(64, `kit.json: shards.${f} must be a list of shards, each a list of extra words`);
    c.shards[normPath(f)] = list;
  }
  return c;
}
export const normPath = (f) => String(f).replace(/\\/g, '/').replace(/^(\.\/)+/, '');

// ---- test files ------------------------------------------------------------------------------------------------------
export function globRe(g) {
  let re = '';
  const s = normPath(g);
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '*' && s[i + 1] === '*') { if (s[i + 2] === '/') { re += '(?:.*/)?'; i += 2; } else { re += '.*'; i += 1; } }
    else if (ch === '*') re += '[^/]*';
    else if (ch === '?') re += '[^/]';
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + re + '$');
}
// tracked files and new ones git does not ignore, matched against the patterns, sorted
export function listTests(dir, patterns) {
  const res = patterns.map(globRe);
  const out = git(dir, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']).stdout.split('\0').filter(Boolean).map(normPath);
  return [...new Set(out.filter((f) => res.some((r) => r.test(f)) && fs.existsSync(path.join(dir, f))))].sort();
}
// the runs of a file: one, or one per shard ("plus nothing else": the shards must cover the file's tests)
export function membersOf(cfg, files) {
  const fill = (file, extra) => {
    const out = [];
    let used = false;
    for (const w of cfg.check_one) {
      if (w === '{args}') { out.push(...extra); used = true; } else out.push(w.split('{file}').join(file));
    }
    if (!used) out.push(...extra);
    return out;
  };
  const ms = [];
  for (const f of files) {
    const sh = cfg.shards[normPath(f)];
    if (sh) sh.forEach((extra, i) => ms.push({ id: `${f}#${i + 1}`, file: f, shard: i + 1, argv: fill(f, extra) }));
    else ms.push({ id: f, file: f, shard: null, argv: fill(f, []) });
  }
  return ms;
}
export const fillAll = (cfg) => cfg.check_all.filter((w) => w !== '{args}');

// ---- the queue -------------------------------------------------------------------------------------------------------
export const queueDir = (project, name = 'lane') => path.join(harnessDir(project), name);
export function setSlots(dir, n) {
  const r = spawnSync(process.execPath, [LANE, '--dir', dir, '--capacity', String(n)], { encoding: 'utf8', windowsHide: true });
  if (r.status !== 0) throw new KitError(64, `cannot set the queue's slots in ${dir}: ${String(r.stderr || r.error || '').trim()}`);
  return Number(r.stdout.trim());
}
function laneTimes(dir, pid, label) {
  let t = '';
  try {
    const f = path.join(dir, 'log.jsonl');
    const fd = fs.openSync(f, 'r');
    const size = fs.fstatSync(fd).size, n = Math.min(size, 1 << 20), b = Buffer.alloc(n);
    fs.readSync(fd, b, 0, n, size - n);
    fs.closeSync(fd);
    t = b.toString('utf8');
  } catch { return {}; }
  const evs = [];
  for (const s of t.split('\n')) { try { evs.push(JSON.parse(s)); } catch { /* the cut first line */ } }
  let i = evs.length - 1;
  while (i >= 0 && !(evs[i] && evs[i].ev === 'start' && evs[i].pid === pid && evs[i].label === label)) i--;
  if (i < 0) return {};
  const out = { waited: evs[i].waited_ms / 1000 };
  for (let k = i + 1; k < evs.length; k++) if (evs[k] && evs[k].ev === 'end' && evs[k].label === label) { out.ran = evs[k].ms / 1000; break; }
  return out;
}
// One command through the queue: resolves {exit, result: pass | fail | none, waited, ran, wall, log}.
// Lane exit 124 (timeout), 75 (no slot) and a command that could not start are "none": not a result.
export function laneRun({ dir, label, argv, cwd, timeoutS, log }) {
  return new Promise((resolve) => {
    fs.mkdirSync(path.dirname(log), { recursive: true });
    const fd = fs.openSync(log, 'w');
    const args = [LANE, '--dir', dir, '--label', label, '--timeout-s', String(timeoutS), '--wait-s', String(WAIT_S)];
    if (timeoutS > LANE_MAX_S) args.push('--max-timeout-s', String(timeoutS));
    const t0 = Date.now();
    let ch;
    const done = (exit) => {
      try { fs.closeSync(fd); } catch { /* closed */ }
      const wall = (Date.now() - t0) / 1000;
      const lt = ch && Number.isInteger(ch.pid) ? laneTimes(dir, ch.pid, label) : {};
      const ran = lt.ran ?? Math.max(0, wall - (lt.waited || 0));
      const result = exit === 0 ? 'pass' : (exit === 124 || exit === 75 || exit === 127 || exit === null) ? 'none' : 'fail';
      resolve({ exit, result, waited: lt.waited ?? Math.max(0, wall - ran), ran, wall, log });
    };
    try {
      ch = spawn(process.execPath, [...args, '--', ...argv], { cwd, env: RUN_ENV, stdio: ['ignore', fd, fd], windowsHide: true });
      ch.on('error', () => done(127));
      ch.on('exit', (code) => done(code));
    } catch { done(127); }
  });
}
// runs `members` with at most `at` at once; calls onDone(member, result) as each ends
export async function runPool(members, at, runOne, onDone) {
  let next = 0;
  const worker = async () => {
    while (next < members.length) {
      const m = members[next++];
      m.res = await runOne(m);
      if (onDone) onDone(m, m.res);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(at, members.length)) }, worker));
  return members;
}
export const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
export const safe = (s) => String(s).replace(/[^\w.-]+/g, '_').slice(0, 120);
export function tail(file, n = 15) {
  try { return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.trim()).slice(-n).join('\n'); } catch { return ''; }
}

// the first run in a project prints one line saying what has and has not run for real (a file remembers)
export function noticeOnce(project, name, text) {
  const f = path.join(harnessDir(project), `notice-${name}.txt`);
  if (fs.existsSync(f)) return;
  try { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text + '\n'); } catch { /* the notice is a courtesy */ }
  process.stderr.write(text + '\n');
}
export const NOTICE = 'harness-kit: these steps (own copies, landings one at a time through the tests, files side by side through the queue) '
  + 'ran for real in the harness project\'s build through research-tree/tools/land.mjs; unit.mjs and check.mjs themselves have run only '
  + 'in their tests (toy repositories with node --test, on Windows). The pytest defaults and macOS were not run. (Shown once per project.)';
