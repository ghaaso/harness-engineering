#!/usr/bin/env node
// land.mjs: lands one unit's branch on the build branch (research-tree/BUILD-PLAN.md section 3; ORCHESTRATION.md
// section 7, section 8 row "Two writers", section 13 rows 5-6; brief research-tree/build/briefs/B0b.md, unit S0.6).
//
//   node land.mjs <unit> <test file>... [--main DIR] [--build-wt DIR] [--branch NAME] [--lane FILE] [--landings FILE]
//                 [--shards FILE] [--max-timeout-s N] [--wait-budget-s N]          (--build is the same as --build-wt)
//
// A test file is named relative to research-tree/ (a leading "research-tree/" is dropped): tcb/test/lib.test.mjs.
// Defaults: MAIN is the main checkout of the repository this script sits in; the build worktree is the folder hb
// beside MAIN (here C:/Users/User/Documents/projects/hb) on branch build, made with `git worktree add` if missing;
// never MAIN's own checkout, and never inside a .claude folder (guard-hook.test.mjs fails T2, T3, T4, T11 and T13
// there, measured by S0.4); the lane is MAIN/research-tree/tools/lane.mjs; the record is MAIN/research-tree/build/landings.jsonl, with
// the logs of each landing beside it in landings/; the shards are MAIN/research-tree/build/facts/lane-measure/
// shards.cmds. Git always runs with -c core.longpaths=true. Nothing is pushed. One landing at a time (land.lock).
//
// 1. Re-check first. A merge of a u/* branch on the build branch's first-parent line that has no landings.jsonl line
//    (a lander that ended between merge and record leaves one) has its test files run before anything else: the files
//    its merge message names (Land-Files), or the files given here when it is this unit's own merge. Pass: its line
//    is written. Fail: it is undone when it is the tip (else it is left for `git revert -m 1`), its line, exit 4. A
//    merge that names no files (one made by hand) is reported: exit 3, nothing changed.
// 2. `git merge --no-ff u/<unit>`, the message naming the unit and its files. A textual conflict aborts the merge:
//    a line, exit 2, the unit goes back to its builder.
// 3. The files run in the build worktree's research-tree/ through MAIN's lane, all at once in one lane call, each call
//    under 150 s with its wait: --timeout-s T = 1.5 x the files' last run (landings.jsonl, else alone.txt or
//    shard4.txt beside shards.cmds), at least 30 and at most 140, and 140 when one of them is unknown; --wait-s 145 - T.
//    Exit 75 (no slot) is asked again until about --wait-budget-s (300) of waiting, at least once more. A file named in
//    shards.cmds runs as its shards plus one run of the tests no shard names (--test-skip-pattern). A file or shard
//    that fails, or gets no result, in that call runs once more by itself: a pass then is flaky (end list), a second
//    fail is a fault (section 13 row 6). A file is skipped when a pass is recorded for its key: its path, the git trees
//    of research-tree/tcb, research-tree/tools and its own top folder at the commit tested, node's version and its
//    shards; so it is skipped only when it and every file it can load are unchanged.
// 4. Pass: the merge stays and one line is written. Fail: the build branch goes back to the commit before the merge,
//    then the line names the failing tests. Lane exit 124 (timeout) or 75 after the retries is not a result: the merge
//    is undone, the line says not-run, exit 5.
// The line: {t, unit, merge, pre, files, exit, waited_s, ran_s, kind, tip, undone, failing, flaky, conflicts, calls,
// logs}; each file {file, result: pass | fail | not-run, key, s, n, rerun, shards, cached}.
// Exit: 0 landed; 1 tests failed, merge undone; 2 textual conflict, merge aborted; 3 a merge with no line names no
// files; 4 a merge with no line failed its re-check; 5 no result, merge undone; 6 nothing to merge (u/<unit> is
// already in the build branch); 64 usage or setup, nothing changed; 70 internal error.
// A landing can take longer than 150 s (several lane calls): run it as a background command, or with a long timeout.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const OPTS = ['--main', '--build-wt', '--build', '--branch', '--lane', '--landings', '--shards', '--max-timeout-s', '--wait-budget-s', '--group'];
const MIN_T = 30;     // floor of T, a marked guess: 1.5 x a 2 s file is under the lane's own 5 s minimum
const CAP_T = 140;    // the rule's ceiling of T
const SLOT_S = 145;   // T + W: a lane call and its wait for a slot stay under 150 s
const BUDGET_S = 300; // waiting for a slot before "no result": two turnovers of a slot held to the 150 s rule
const TRAILER = 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>';

class LandError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const say = (s) => process.stderr.write(`land: ${s}\n`);
const short = (h) => String(h || '').slice(0, 10);
const r1 = (x) => Math.round((Number(x) || 0) * 10) / 10;
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return !!e && e.code === 'EPERM'; } };
const canon = (p) => {
  let r = path.resolve(p);
  try { r = fs.realpathSync.native(r); } catch { /* a missing path keeps its resolved form */ }
  r = r.replace(/\\/g, '/').replace(/\/+$/, '');
  return process.platform === 'win32' ? r.toLowerCase() : r;
};

const ENV = Object.assign({}, process.env, { GIT_MERGE_AUTOEDIT: 'no', GIT_TERMINAL_PROMPT: '0' });
for (const k of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR']) delete ENV[k];
// the files run as a fresh test runner whoever started land.mjs: under a `node --test` parent, NODE_TEST_CONTEXT makes
// a nested `node --test` report to that parent instead of running its files (it exits 0 with no TAP)
const RUN_ENV = Object.assign({}, process.env);
delete RUN_ENV.NODE_TEST_CONTEXT;
function git(cwd, args, allowFail = false) {
  const r = spawnSync('git', ['-c', 'core.longpaths=true', ...args], { cwd, env: ENV, encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 28 });
  if (r.error) throw new LandError(64, `git ${args[0]}: ${r.error.message}`);
  if (r.status !== 0 && !allowFail) throw new LandError(64, `git ${args.join(' ')}: exit ${r.status}: ${String(r.stderr || r.stdout || '').trim().split('\n').slice(0, 6).join(' | ')}`);
  return r;
}
const gitOut = (cwd, args) => git(cwd, args).stdout.trim();
const gitOk = (cwd, args) => git(cwd, args, true).status === 0;

function normFile(f) {
  let s = String(f).replace(/\\/g, '/').replace(/^(\.\/)+/, '');
  if (s.startsWith('research-tree/')) s = s.slice('research-tree/'.length);
  if (!s || path.isAbsolute(s) || /^[A-Za-z]:/.test(s) || s.split('/').some((x) => x === '' || x === '.' || x === '..')) {
    throw new LandError(64, `a test file is a path inside research-tree/, given relative to it: ${f}`);
  }
  return s;
}

// ---- the group runner: the one command of a lane call; runs its members at once, one result line each ----------
function runGroup(specPath) {
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const t0 = Date.now();
  const note = (o) => { const fd = fs.openSync(spec.results, 'a'); fs.writeSync(fd, JSON.stringify(o) + '\n'); fs.fsyncSync(fd); fs.closeSync(fd); };
  let left = spec.members.length, bad = 0;
  const end = () => { note({ done: true, s: (Date.now() - t0) / 1000 }); process.exit(bad ? 1 : 0); };
  if (!left) end();
  for (const m of spec.members) {
    const s0 = Date.now();
    let fin = false;
    const finish = (exit) => { if (fin) return; fin = true; note({ id: m.id, exit, s: (Date.now() - s0) / 1000 }); if (exit !== 0) bad++; if (--left === 0) end(); };
    let fd;
    try {
      fd = fs.openSync(m.log, 'w');
      const ch = spawn(process.execPath, m.args, { cwd: spec.cwd, env: RUN_ENV, stdio: ['ignore', fd, fd], windowsHide: true });
      ch.on('error', () => finish(127));
      ch.on('exit', (code) => finish(code === null ? 1 : code));
    } catch { finish(127); } finally { if (fd !== undefined) { try { fs.closeSync(fd); } catch { /* the child holds its own copy */ } } }
  }
}

// ---- setup -------------------------------------------------------------------------------------------------------
function intOpt(v, lo, hi, dflt, name) {
  if (v === undefined) return dflt;
  const n = Number(v);
  if (!Number.isInteger(n) || n < lo || n > hi) throw new LandError(64, `--${name} takes a whole number from ${lo} to ${hi}`);
  return n;
}
function readText(f) { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } }
function setup(opt, unit, files) {
  let MAIN = opt.main;
  if (!MAIN) {
    const r = spawnSync('git', ['-c', 'core.longpaths=true', 'rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: path.dirname(SELF), env: ENV, encoding: 'utf8', windowsHide: true });
    if (r.status !== 0) throw new LandError(64, `cannot find the main checkout from ${path.dirname(SELF)}; give --main`);
    MAIN = path.dirname(r.stdout.trim());
  }
  const c = { unit, files, MAIN: path.resolve(MAIN), BRANCH: opt.branch || 'build', callNo: 0, lines: [] };
  c.BUILD = path.resolve(opt['build-wt'] || opt.build || path.join(path.dirname(c.MAIN), 'hb'));
  c.LANE = path.resolve(opt.lane || path.join(c.MAIN, 'research-tree', 'tools', 'lane.mjs'));
  c.LANE_LOG = path.join(path.dirname(c.LANE), '..', 'lane', 'log.jsonl');
  c.LANDINGS = path.resolve(opt.landings || path.join(c.MAIN, 'research-tree', 'build', 'landings.jsonl'));
  c.SHARDS = path.resolve(opt.shards || path.join(c.MAIN, 'research-tree', 'build', 'facts', 'lane-measure', 'shards.cmds'));
  c.MAX_T = intOpt(opt['max-timeout-s'], 5, SLOT_S - 1, CAP_T, 'max-timeout-s');
  c.BUDGET = intOpt(opt['wait-budget-s'], 0, 3600, BUDGET_S, 'wait-budget-s');
  if (!/^[\w./-]+$/.test(c.BRANCH)) throw new LandError(64, `not a branch name: ${c.BRANCH}`);
  if (!fs.existsSync(c.LANE)) throw new LandError(64, `no lane script at ${c.LANE}`);
  // times alone (third column) and the shards' times at once, both measured beside shards.cmds
  c.alone = new Map();
  for (const l of readText(path.join(path.dirname(c.SHARDS), 'alone.txt')).split(/\r?\n/)) {
    const [f, , s] = l.trim().split(/\s+/);
    if (f && Number(s) > 0) { try { c.alone.set(normFile(f), Number(s)); } catch { /* not a file line */ } }
  }
  c.shardAlone = new Map();
  for (const l of readText(path.join(path.dirname(c.SHARDS), 'shard4.txt')).split(/\r?\n/)) {
    const m = /^shard(\d+)\s+\S+\s+([\d.]+)/.exec(l.trim());
    if (m) c.shardAlone.set(Number(m[1]), Number(m[2]));
  }
  // shards.cmds: each line one shard, its --test-name-pattern values and its test file
  c.shardSpec = new Map();
  for (const l of readText(c.SHARDS).split(/\r?\n/)) {
    const pats = [...l.matchAll(/--test-name-pattern="([^"]*)"/g)].map((m) => m[1]);
    const fm = /(?:^|\s)((?:[\w.-]+\/)*[\w.-]+\.test\.m?js)(?=\s|$)/.exec(l);
    if (!pats.length || !fm) continue;
    let f;
    try { f = normFile(fm[1]); } catch { continue; }
    if (!c.shardSpec.has(f)) c.shardSpec.set(f, []);
    c.shardSpec.get(f).push(pats);
  }
  return c;
}

function lock(c) {
  const dir = path.dirname(c.LANDINGS);
  fs.mkdirSync(dir, { recursive: true });
  const L = path.join(dir, 'land.lock'), O = path.join(L, 'owner.json');
  for (let i = 0; i < 2; i++) {
    try {
      fs.mkdirSync(L);
      fs.writeFileSync(O, JSON.stringify({ pid: process.pid, unit: c.unit, t: new Date().toISOString() }));
      process.on('exit', () => { try { if (JSON.parse(fs.readFileSync(O, 'utf8')).pid === process.pid) fs.rmSync(L, { recursive: true, force: true }); } catch { /* gone */ } });
      return;
    } catch (e) {
      if (!e || e.code !== 'EEXIST') throw e;
      let stale;
      try { const o = JSON.parse(fs.readFileSync(O, 'utf8')); stale = !alive(o.pid) || Date.now() - Date.parse(o.t) > 3 * 3600 * 1000; } catch { try { stale = Date.now() - fs.statSync(L).mtimeMs > 15000; } catch { stale = true; } }
      if (!stale) throw new LandError(64, `another landing is running (${L}); one landing at a time`);
      fs.rmSync(L, { recursive: true, force: true });
      say('broke a stale landing lock (its lander has ended); the re-check covers what it left');
    }
  }
  throw new LandError(64, `cannot take the landing lock ${L}`);
}

function ensureBuild(c) {
  if (canon(c.BUILD).split('/').includes('.claude')) throw new LandError(64, `${c.BUILD} lies inside a .claude folder, where guard-hook.test.mjs fails; the build worktree must lie outside one`);
  if (!fs.existsSync(c.BUILD)) {
    git(c.MAIN, ['worktree', 'add', c.BUILD, c.BRANCH]);
    say(`made the build worktree ${c.BUILD} on ${c.BRANCH}`);
  }
  const top = gitOut(c.BUILD, ['rev-parse', '--show-toplevel']);
  if (canon(top) === canon(gitOut(c.MAIN, ['rev-parse', '--show-toplevel']))) throw new LandError(64, `${c.BUILD} is the main checkout; land.mjs works only in a build worktree`);
  if (canon(top) !== canon(c.BUILD)) throw new LandError(64, `${c.BUILD} is not the top of a worktree (git says ${top})`);
  const common = (d) => canon(gitOut(d, ['rev-parse', '--path-format=absolute', '--git-common-dir']));
  if (common(c.BUILD) !== common(c.MAIN)) throw new LandError(64, `${c.BUILD} is not a worktree of the repository at ${c.MAIN}`);
  const head = git(c.BUILD, ['symbolic-ref', '-q', '--short', 'HEAD'], true).stdout.trim();
  if (head !== c.BRANCH) throw new LandError(64, `the build worktree is on ${head || 'a detached HEAD'}, not ${c.BRANCH}`);
  if (gitOk(c.BUILD, ['rev-parse', '-q', '--verify', 'MERGE_HEAD'])) throw new LandError(64, `a merge is in progress in ${c.BUILD}; nothing done (git merge --abort there, then land again)`);
  const dirty = gitOut(c.BUILD, ['status', '--porcelain', '--untracked-files=no']);
  if (dirty) throw new LandError(64, `the build worktree has uncommitted changes; nothing done: ${dirty.split('\n').slice(0, 5).join('; ')}`);
  c.RT = path.join(c.BUILD, 'research-tree');
  if (!fs.existsSync(c.RT)) throw new LandError(64, `no research-tree folder in ${c.BUILD}`);
}

// ---- the record ----------------------------------------------------------------------------------------------------
function readLines(c) {
  let txt = '';
  try { txt = fs.readFileSync(c.LANDINGS, 'utf8'); } catch (e) { if (!e || e.code !== 'ENOENT') throw new LandError(64, `cannot read ${c.LANDINGS}: ${e && e.message}`); }
  const out = [];
  let bad = 0;
  for (const s of txt.split(/\r?\n/)) {
    if (!s.trim()) continue;
    try { const j = JSON.parse(s); if (j && typeof j === 'object' && !Array.isArray(j)) out.push(j); else bad++; } catch { bad++; }
  }
  if (bad) say(`${bad} unreadable line(s) of landings.jsonl skipped`);
  return out;
}
function appendLine(c, o) {
  const line = JSON.stringify(o);
  let lead = '';
  try {
    const st = fs.statSync(c.LANDINGS);
    if (st.size > 0) { const fd = fs.openSync(c.LANDINGS, 'r'); const b = Buffer.alloc(1); fs.readSync(fd, b, 0, 1, st.size - 1); fs.closeSync(fd); if (b[0] !== 0x0a) lead = '\n'; }
  } catch { /* a new file */ }
  const fd = fs.openSync(c.LANDINGS, 'a');
  fs.writeSync(fd, lead + line + '\n');
  fs.fsyncSync(fd);
  fs.closeSync(fd);
  c.lines.push(o);
  process.stdout.write(line + '\n');
}
function record(c, base, exit, r, extra) {
  const o = { t: new Date().toISOString(), unit: base.unit, merge: base.merge, pre: base.pre, files: base.files, exit, waited_s: r1(r.waited), ran_s: r1(r.ran), ...extra };
  if (r.failing && r.failing.length) o.failing = r.failing;
  if (r.flaky && r.flaky.length) o.flaky = r.flaky;
  o.calls = r.calls || 0;
  if (c.logs) o.logs = path.relative(path.dirname(c.LANDINGS), c.logs).replace(/\\/g, '/');
  appendLine(c, o);
}
const hashOf = (l) => [l.merge, l.commit].find((h) => typeof h === 'string' && /^[0-9a-f]{7,64}$/i.test(h));
// a merge counts as recorded by any line naming it (merge or commit, full or at least 7 characters), except a line
// that says it got no result (exit 5), which leaves it to be checked again
const recordedBy = (c, sha) => c.lines.find((l) => { const h = hashOf(l); return h && sha.toLowerCase().startsWith(h.toLowerCase()) && l.exit !== 5; });

function unrecorded(c) {
  const tips = new Map();
  for (const l of git(c.BUILD, ['for-each-ref', '--format=%(objectname) %(refname)', 'refs/heads/u/']).stdout.split('\n')) {
    const [sha, ref] = l.trim().split(' ');
    if (sha && ref) tips.set(sha, ref.replace(/^refs\/heads\/u\//, ''));
  }
  const raw = git(c.BUILD, ['log', '--first-parent', '--merges', '--format=%H%x1f%P%x1f%B%x1e', 'HEAD']).stdout;
  const out = [];
  for (const rec of raw.split('\x1e')) {
    const s = rec.replace(/^[\r\n]+/, '');
    if (!s.trim()) continue;
    const [sha, parents = '', body = ''] = s.split('\x1f');
    const [pre, tip] = parents.trim().split(/\s+/);
    const unitT = /^Land-Unit: *(\S+) *\r?$/m.exec(body);
    const dflt = /^Merge branch '(?:refs\/heads\/)?u\/([^']+)'/.exec(body);
    const u = unitT ? unitT[1] : dflt ? dflt[1] : tips.get(tip);
    if (!u || recordedBy(c, sha)) continue;
    let files = null;
    const filesT = /^Land-Files: *(\[.*\]) *\r?$/m.exec(body);
    if (filesT) { try { const a = JSON.parse(filesT[1]); if (Array.isArray(a) && a.length) files = [...new Set(a.map(normFile))]; } catch { files = null; } }
    out.push({ sha, pre, tip, unit: u, files });
  }
  return out.reverse();
}

// ---- running test files through the lane -------------------------------------------------------------------------
function logsDir(c) {
  if (!c.logs) {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    c.logs = path.join(path.dirname(c.LANDINGS), 'landings', `${stamp}-${c.unit}-${process.pid}`);
    fs.mkdirSync(c.logs, { recursive: true });
    c.RUNNER = path.join(c.logs, 'land-runner.mjs'); // a copy, so a merge that changes land.mjs cannot change the runner
    fs.copyFileSync(SELF, c.RUNNER);
  }
  return c.logs;
}
function keyOf(c, f, head) {
  const dirs = [...new Set(['research-tree/tcb', 'research-tree/tools', f.includes('/') ? `research-tree/${f.split('/')[0]}` : 'research-tree'])].sort();
  const trees = {};
  for (const d of dirs) { const r = git(c.BUILD, ['rev-parse', '-q', '--verify', `${head}:${d}`], true); trees[d] = r.status === 0 ? r.stdout.trim() : null; }
  const payload = JSON.stringify({ v: 1, file: f, trees, node: process.version, shards: c.shardSpec.get(f) || null });
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 24);
}
function findPass(c, f, key) {
  for (let i = c.lines.length - 1; i >= 0; i--) {
    for (const e of c.lines[i].files || []) {
      if (e && e.file === f && e.key === key && e.result === 'pass') return e.cached || short(c.lines[i].merge) || c.lines[i].t;
    }
  }
  return null;
}
function estimate(c, m) {
  for (let i = c.lines.length - 1; i >= 0; i--) {
    for (const e of c.lines[i].files || []) {
      if (!e || e.file !== m.file || e.cached) continue;
      if (m.shard === null) { if (!e.shards && e.s > 0) return e.s; } else { const x = (e.shards || []).find((y) => y.shard === m.shard); if (x && x.s > 0) return x.s; }
    }
  }
  return m.shard === null ? c.alone.get(m.file) : c.shardAlone.get(m.shard);
}
function laneTimes(c, pid, label) {
  let t = '';
  try {
    const fd = fs.openSync(c.LANE_LOG, 'r');
    const size = fs.fstatSync(fd).size, n = Math.min(size, 262144), b = Buffer.alloc(n);
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
function tap(log) {
  const t = readText(log);
  const last = (k) => { let v = null; for (const m of t.matchAll(new RegExp(`^# ${k} (\\d+)\\s*$`, 'gm'))) v = Number(m[1]); return v; };
  const n = { tests: last('tests'), pass: last('pass'), fail: last('fail'), skipped: last('skipped') };
  const failing = [];
  for (const m of t.matchAll(/^not ok \d+ - (.*?)\r?$/gm)) if (!/#\s*TODO\b/i.test(m[1])) failing.push(m[1].trim().slice(0, 160));
  return { n: n.tests === null ? null : n, failing: failing.slice(0, 20) };
}
// One lane call running `members` at once; exit 75 is asked again until the wait budget is spent (at least once more).
function callGroup(c, members, label, acc) {
  const dir = logsDir(c), n = ++c.callNo;
  const timed = members.length > 1 ? members.filter((m) => m.shard !== 'rest') : members; // the rest run's time is unknown until it ran
  const ests = timed.map((m) => estimate(c, m));
  const T = !ests.length || ests.some((x) => !(x > 0)) ? c.MAX_T : Math.min(c.MAX_T, Math.max(MIN_T, Math.ceil(1.5 * Math.max(...ests))));
  const W = Math.max(1, SLOT_S - T);
  const tries = Math.max(2, Math.ceil(c.BUDGET / W));
  const spec = { cwd: c.RT, results: path.join(dir, `${n}-results.jsonl`), members: members.map((m) => ({ id: m.id, args: m.args, log: path.join(dir, `${n}-${m.id.replace(/[^\w.-]+/g, '_')}.log`) })) };
  const specPath = path.join(dir, `${n}-spec.json`);
  fs.writeFileSync(specPath, JSON.stringify(spec, null, 1));
  for (let a = 1; a <= tries; a++) {
    fs.rmSync(spec.results, { force: true });
    const t0 = Date.now();
    const r = spawnSync(process.execPath, [c.LANE, '--label', label, '--timeout-s', String(T), '--wait-s', String(W), '--', process.execPath, c.RUNNER, '--group', specPath],
      { cwd: c.RT, env: RUN_ENV, encoding: 'utf8', windowsHide: true, timeout: (T + W + 120) * 1000 });
    const wall = (Date.now() - t0) / 1000;
    acc.calls++;
    if (r.status === 75) { acc.waited += wall; say(`${label}: no lane slot within ${W} s (try ${a} of ${tries})`); continue; }
    const lt = laneTimes(c, r.pid, label);
    const recs = readText(spec.results).split('\n').map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
    const done = recs.find((x) => x.done);
    const ran = lt.ran ?? (done ? done.s : r.status === 124 ? T : Math.max(0, wall - (lt.waited || 0)));
    acc.waited += lt.waited ?? Math.max(0, wall - ran);
    acc.ran += ran;
    if (r.status === 124) say(`${label}: timed out at ${T} s (exit 124, not a result)`);
    else if (r.status !== 0 && r.status !== 1) say(`${label}: the lane call ended with ${r.status}${r.error ? ` (${r.error.message})` : ''}`);
    const res = new Map();
    for (const m of spec.members) { const x = recs.find((y) => y.id === m.id); if (x) res.set(m.id, { exit: x.exit, s: x.s, ...tap(m.log) }); }
    return { busy: false, res };
  }
  say(`${label}: no lane slot after ${tries} tries; not a result`);
  return { busy: true, res: new Map() };
}
// Runs `files` at the commit `head` (checked out in the build worktree): {result: pass | fail | none, entries, ...}.
function check(c, who, files, head) {
  const acc = { waited: 0, ran: 0, calls: 0 };
  const entries = [], members = [];
  const base = ['--test', '--test-reporter=tap'];
  for (const f of files) {
    const key = keyOf(c, f, head);
    const was = findPass(c, f, key);
    if (was) { entries.push({ file: f, result: 'pass', key, cached: was }); continue; }
    const e = { file: f, result: 'not-run', key };
    entries.push(e);
    const sh = c.shardSpec.get(f);
    if (sh) {
      sh.forEach((pats, i) => members.push({ id: `${f}#${i + 1}`, file: f, shard: i + 1, entry: e, args: [...base, ...pats.map((p) => `--test-name-pattern=${p}`), f] }));
      members.push({ id: `${f}#rest`, file: f, shard: 'rest', entry: e, args: [...base, ...sh.flat().map((p) => `--test-skip-pattern=${p}`), f] });
    } else members.push({ id: f, file: f, shard: null, entry: e, args: [...base, f] });
  }
  if (members.length) {
    const g = callGroup(c, members, `land-${who}`, acc);
    for (const m of members) m.first = g.res.get(m.id) || null;
    let jam = g.busy;
    for (const m of members) {
      if (jam || (m.first && m.first.exit === 0 && m.first.n)) continue;
      const a = callGroup(c, [m], `land-${who}-alone`, acc); // once more by itself (section 13 row 6)
      m.second = a.res.get(m.id) || null;
      jam = a.busy;
    }
  }
  const failing = [], flaky = [];
  for (const m of members) {
    const fin = m.second !== undefined ? m.second : m.first;
    m.result = !fin ? 'not-run' : fin.exit !== 0 ? 'fail' : fin.n ? 'pass' : 'not-run'; // exit 0 with no TAP summary ran nothing
    if (m.second !== undefined) m.rerun = m.first ? 'fail' : 'not-run';
    m.s = r1((m.first && m.first.s) || (fin && fin.s) || 0) || undefined;
    m.n = fin ? fin.n : m.first ? m.first.n : null;
    if (m.result === 'pass' && m.rerun === 'fail') flaky.push(m.id);
  }
  const part = (m) => ({ result: m.result, s: m.s, n: m.n, ...(m.rerun ? { rerun: m.rerun } : {}) });
  for (const e of entries) {
    if (e.cached) continue;
    const ms = members.filter((m) => m.entry === e);
    if (ms.length === 1 && ms[0].shard === null) Object.assign(e, part(ms[0]));
    else {
      e.shards = ms.map((m) => ({ shard: m.shard, ...part(m) }));
      e.result = ms.every((m) => m.result === 'pass') ? 'pass' : ms.some((m) => m.result === 'fail') ? 'fail' : 'not-run';
    }
    if (e.result === 'fail') failing.push({ file: e.file, tests: ms.filter((m) => m.result === 'fail').flatMap((m) => (m.second || m.first).failing).slice(0, 20) });
  }
  const result = entries.some((e) => e.result === 'fail') ? 'fail' : entries.every((e) => e.result === 'pass') ? 'pass' : 'none';
  return { result, entries, failing, flaky, ...acc };
}
const failText = (r) => r.failing.map((f) => `${f.file}${f.tests.length ? ` (${f.tests.slice(0, 3).join('; ')})` : ''}`).join(', ') || 'see the logs';
const doneText = (r) => {
  const cached = r.entries.filter((e) => e.cached).length;
  return `${r.entries.length - cached} file(s) run, ${cached} unchanged since a pass${r.flaky.length ? `, flaky: ${r.flaky.join(', ')}` : ''}; waited ${r1(r.waited)} s, ran ${r1(r.ran)} s in ${r.calls} lane call(s)`;
};

// ---- the steps -------------------------------------------------------------------------------------------------------
function undo(c, merge, pre) {
  const now = gitOut(c.BUILD, ['rev-parse', 'HEAD']);
  if (now !== merge) throw new LandError(64, `${c.BRANCH} moved during the landing (at ${short(now)}, not the merge ${short(merge)}); not undone, look at ${c.BUILD} by hand`);
  git(c.BUILD, ['reset', '-q', '--hard', pre]);
  if (gitOut(c.BUILD, ['rev-parse', 'HEAD']) !== pre) throw new LandError(64, `the undo did not bring ${c.BRANCH} back to ${short(pre)}; look at ${c.BUILD} by hand`);
}
function recheck(c) {
  const done = new Set();
  for (const m of unrecorded(c)) {
    const files = m.files || (m.unit === c.unit ? c.files : null);
    if (!files) throw new LandError(3, `merge ${short(m.sha)} of u/${m.unit} on ${c.BRANCH} has no landings.jsonl line and its message names no test files; nothing done. Check it first: node land.mjs ${m.unit} <its test files>`);
    say(`merge ${short(m.sha)} of u/${m.unit} has no landings.jsonl line; its files run first`);
    const head = gitOut(c.BUILD, ['rev-parse', 'HEAD']);
    const r = check(c, m.unit, files, head);
    const base = { unit: m.unit, merge: m.sha, pre: m.pre, files: r.entries };
    if (r.result === 'pass') { record(c, base, 0, r, { kind: 'recheck', tip: m.tip, undone: false }); done.add(m.unit); say(`re-check of u/${m.unit} passed: ${doneText(r)}`); continue; }
    if (r.result === 'none') {
      record(c, base, 5, r, { kind: 'recheck', tip: m.tip, undone: false });
      throw new LandError(5, `the re-check of merge ${short(m.sha)} (u/${m.unit}) got no result; nothing undone, it is checked again at the next landing`);
    }
    const atTip = head === m.sha;
    if (atTip) undo(c, m.sha, m.pre); // undone before its line, so a stop between the two leaves no failing merge in place
    record(c, base, 4, r, { kind: 'recheck', tip: m.tip, undone: atTip });
    throw new LandError(4, `the re-check of merge ${short(m.sha)} (u/${m.unit}) failed: ${failText(r)}; ` + (atTip
      ? `undone, ${c.BRANCH} is back at ${short(m.pre)}; u/${m.unit} goes back to its builder`
      : `later commits sit on it, so it stays: undo it with git revert -m 1 ${m.sha}`));
  }
  return done;
}
function landUnit(c, tip) {
  const pre = gitOut(c.BUILD, ['rev-parse', 'HEAD']);
  const msg = path.join(logsDir(c), 'merge-message.txt');
  fs.writeFileSync(msg, `land: merge u/${c.unit} into ${c.BRANCH}\n\nLand-Unit: ${c.unit}\nLand-Files: ${JSON.stringify(c.files)}\n${TRAILER}\n`);
  const mr = git(c.BUILD, ['merge', '--no-ff', '--no-edit', '--no-log', '-F', msg, `refs/heads/u/${c.unit}`], true);
  if (mr.status !== 0) {
    const unmerged = git(c.BUILD, ['diff', '--name-only', '--diff-filter=U'], true).stdout.split('\n').map((s) => s.trim()).filter(Boolean);
    if (gitOk(c.BUILD, ['rev-parse', '-q', '--verify', 'MERGE_HEAD'])) git(c.BUILD, ['merge', '--abort']);
    if (gitOut(c.BUILD, ['rev-parse', 'HEAD']) !== pre || gitOut(c.BUILD, ['status', '--porcelain', '--untracked-files=no'])) {
      throw new LandError(64, `git merge u/${c.unit} failed and the build worktree is not back at ${short(pre)}; look at ${c.BUILD} by hand`);
    }
    if (!unmerged.length) throw new LandError(64, `git merge u/${c.unit} failed without a conflict; nothing changed: ${String(mr.stderr || mr.stdout).trim().split('\n').slice(0, 4).join(' | ')}`);
    record(c, { unit: c.unit, merge: null, pre, files: c.files.map((f) => ({ file: f, result: 'not-run' })) }, 2, { waited: 0, ran: 0, calls: 0 }, { kind: 'land', tip, aborted: true, conflicts: unmerged });
    throw new LandError(2, `textual conflict merging u/${c.unit} (${unmerged.join(', ')}); the merge is aborted, ${c.BRANCH} unchanged at ${short(pre)}; the unit goes back to its builder`);
  }
  const merge = gitOut(c.BUILD, ['rev-parse', 'HEAD']);
  const parents = gitOut(c.BUILD, ['rev-list', '--parents', '-n', '1', merge]).split(/\s+/).slice(1);
  if (parents.length !== 2 || parents[0] !== pre || parents[1] !== tip) throw new LandError(70, `the merge ${short(merge)} does not have the parents ${short(pre)} and ${short(tip)}; left for the next landing's re-check`);
  say(`merged u/${c.unit} (${short(tip)}) into ${c.BRANCH} at ${short(merge)}; running ${c.files.length} file(s)`);
  const r = check(c, c.unit, c.files, merge);
  const base = { unit: c.unit, merge, pre, files: r.entries };
  if (r.result === 'pass') {
    // a test that changed a tracked file of the build worktree: put back, and named in the line
    const changed = git(c.BUILD, ['status', '--porcelain', '--untracked-files=no']).stdout.split('\n').filter((l) => l.trim()).map((l) => l.slice(3));
    if (changed.length) { git(c.BUILD, ['reset', '-q', '--hard', 'HEAD']); say(`the tests changed tracked files in the build worktree; put back: ${changed.join(', ')}`); }
    record(c, base, 0, r, { kind: 'land', tip, undone: false, ...(changed.length ? { dirtied: changed } : {}) });
    say(`u/${c.unit} landed on ${c.BRANCH} at ${short(merge)} (pre ${short(pre)}): ${doneText(r)}`);
    return 0;
  }
  undo(c, merge, pre); // undone before its line: a stop between the two leaves no failing merge on the branch
  const code = r.result === 'fail' ? 1 : 5;
  record(c, base, code, r, { kind: 'land', tip, undone: true });
  throw new LandError(code, code === 1
    ? `u/${c.unit} failed: ${failText(r)}; the merge is undone (${c.BRANCH} back at ${short(pre)}); the unit goes back to its builder`
    : `no result for u/${c.unit} (lane timeout 124, or no slot after the retries); the merge is undone (${c.BRANCH} back at ${short(pre)}); land it again later`);
}
function run(opt, pos) {
  const unit = pos[0];
  if (!unit || pos.length < 2) throw new LandError(64, 'usage: node land.mjs <unit> <test file>... [--main DIR] [--build-wt DIR] [--branch NAME] [--lane FILE] [--landings FILE] [--shards FILE] [--max-timeout-s N] [--wait-budget-s N]');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/.test(unit)) throw new LandError(64, `not a unit id: ${unit}`);
  const c = setup(opt, unit, [...new Set(pos.slice(1).map(normFile))]);
  lock(c);
  ensureBuild(c);
  c.lines = readLines(c);
  const tip = git(c.BUILD, ['rev-parse', '-q', '--verify', `refs/heads/u/${unit}^{commit}`], true).stdout.trim();
  if (!tip) throw new LandError(64, `there is no branch u/${unit}`);
  for (const f of c.files) if (!gitOk(c.BUILD, ['cat-file', '-e', `${tip}:research-tree/${f}`])) throw new LandError(64, `u/${unit} has no research-tree/${f}`);
  const rechecked = recheck(c);
  if (gitOk(c.BUILD, ['merge-base', '--is-ancestor', tip, 'HEAD'])) {
    if (rechecked.has(unit)) { say(`u/${unit} has landed: its merge had no line, was checked now and recorded`); return 0; }
    throw new LandError(6, `u/${unit} (${short(tip)}) is already in ${c.BRANCH}; nothing merged, no line written`);
  }
  return landUnit(c, tip);
}

let parsed;
try {
  const argv = process.argv.slice(2), opt = {}, pos = [];
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) { pos.push(argv[i]); continue; }
    if (!OPTS.includes(argv[i]) || i + 1 >= argv.length) throw new LandError(64, `unknown option, or no value: ${argv[i]}`);
    opt[argv[i].slice(2)] = argv[++i];
  }
  parsed = { opt, pos };
} catch (e) { say(e.message); process.exit(64); }
if (parsed.opt.group) runGroup(parsed.opt.group);
else {
  let code;
  try { code = run(parsed.opt, parsed.pos); } catch (e) {
    if (e instanceof LandError) { say(e.message); code = e.code; } else { say(`internal error: ${e && e.stack ? e.stack : e}`); code = 70; }
  }
  process.exit(code);
}
