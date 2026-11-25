#!/usr/bin/env node
// unit.mjs: several writers in one project: each unit of work in its own copy and branch, landed one at a time, in
// the order called, through the project's own check; a landing whose check fails is undone.
// The steps are those of research-tree/tools/land.mjs (run for real in the harness project's build: 25 landings, 20
// landed, 2 stopped by a conflict, 3 undone by a failing test; harness-kit/parallel/SPEEDUPS.md), carried here for any
// repository, with the check command and paths from <project>/.harness/kit.json (harness-kit/parallel/kit.example.json).
// land.mjs itself is unchanged: its steps are bound to research-tree/, node --test and its TAP counts.
//
//   node <clone>/harness-kit/parallel/unit.mjs start <name>             [--project DIR]
//   node <clone>/harness-kit/parallel/unit.mjs land <name> [test file...] [--project DIR]
//   node <clone>/harness-kit/parallel/unit.mjs list                     [--project DIR] [--json]
//   node <clone>/harness-kit/parallel/unit.mjs report                   [--project DIR] [--json]
//
// The project is the main checkout of the repository the folder belongs to (default: the folder it is called from,
// so a call from a unit's copy finds the same project).
// start <name>: makes the branch <unit_prefix><name> from the tip of the landing branch and a copy of it (a git
//   worktree) at <copies_dir>/<name>; prints the folder. A session or helper for that unit works only there. Called again
//   it prints the same folder. The landing branch is made from the project's HEAD when it does not exist yet (said).
// land <name> [test file...]: one landing at a time (<project>/.harness/land.lock; a second land is refused, exit 64).
//   1. Re-check: a landing merge of unit.mjs on the landing branch that has no line in landings.jsonl (a lander that
//      ended between merge and line leaves one) runs its check first: pass, its line is written; no result, exit 5,
//      nothing undone; fail, it is undone when it is the tip, its line, exit 4.
//   2. `git merge --no-ff` of the unit's branch in the landing copy (<copies_dir>/_landing, made when missing; never the
//      project's own checkout). A textual conflict aborts the merge: a line naming the files, exit 2.
//   3. The check runs in the landing copy through the queue: check_all, or, when test files are named, each with
//      check_one (shards as in kit.json), queue_slots of them at once.
//   4. Pass: the merge stays, one line, exit 0. Fail: the landing branch goes back to the commit before the merge, the
//      line names what failed, exit 1. No result (timeout 124, no slot 75): undone too, exit 5. Nothing is pushed.
// list: the units, each with its branch, its folder and whether it has landed.
// report: from landings.jsonl: units landed, failed and undone, conflicts, and the seconds waited and run.
// The line in <project>/.harness/landings.jsonl: {t, unit, branch, kind: land | recheck, merge, pre, tip, exit, result,
//   check, waited_s, ran_s, undone, failing, conflicts, log}; the check's output is kept in .harness/landings/.
// Exit: 0 done or landed; 1 check failed, merge undone; 2 textual conflict, merge aborted; 4 a merge with no line failed
// its re-check; 5 no result, merge undone; 6 nothing to merge (the unit is already in the landing branch); 64 usage or
// set-up, nothing changed; 70 internal error. The same codes as land.mjs (its 3 cannot arise here: every landing
// merge of unit.mjs names its check).
import fs from 'node:fs';
import path from 'node:path';
import {
  KitError, git, gitOut, gitOk, parseArgs, resolveProject, harnessDir, loadConfig, membersOf, fillAll, queueDir,
  setSlots, laneRun, runPool, stamp, safe, tail, noticeOnce, NOTICE, canon, inside, short, r1, alive, normPath,
} from './kitlib.mjs';

const say = (s) => process.stderr.write(`unit: ${s}\n`);
const UNIT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/;
const USAGE = 'usage: node unit.mjs start <name> | land <name> [test file...] | list | report   [--project DIR] [--json]';

function setup(opt) {
  const project = resolveProject(opt.project);
  const cfg = loadConfig(project);
  const H = harnessDir(project);
  return { project, cfg, H, landings: path.join(H, 'landings.jsonl'), landingCopy: path.join(cfg.copies_dir, '_landing'), prefix: cfg.unit_prefix, branch: cfg.landing_branch };
}
const unitBranch = (c, name) => `${c.prefix}${name}`;
const hasBranch = (c, b) => gitOk(c.project, ['rev-parse', '-q', '--verify', `refs/heads/${b}^{commit}`]);
function worktrees(c) { // branch -> folder
  const map = new Map();
  let cur = null;
  for (const l of git(c.project, ['worktree', 'list', '--porcelain']).stdout.split(/\r?\n/)) {
    if (l.startsWith('worktree ')) cur = l.slice(9);
    else if (l.startsWith('branch ') && cur) map.set(l.slice(7).replace(/^refs\/heads\//, ''), cur);
  }
  return map;
}
function ensureLandingBranch(c) {
  if (hasBranch(c, c.branch)) return;
  git(c.project, ['branch', c.branch, 'HEAD']);
  say(`made the landing branch ${c.branch} at the project's HEAD (${short(gitOut(c.project, ['rev-parse', 'HEAD']))})`);
}

// ---- start -------------------------------------------------------------------------------------------------------------
function start(c, name) {
  if (!name || !UNIT_RE.test(name)) throw new KitError(64, `not a unit name (letters, digits, . _ -, at most 40): ${name || ''}`);
  ensureLandingBranch(c);
  const b = unitBranch(c, name), folder = path.join(c.cfg.copies_dir, name);
  const wt = worktrees(c);
  if (wt.has(b)) { process.stdout.write(wt.get(b) + '\n'); return 0; }
  if (fs.existsSync(folder)) throw new KitError(64, `${folder} exists and is not the copy of ${b}; move it away first`);
  fs.mkdirSync(c.cfg.copies_dir, { recursive: true });
  if (hasBranch(c, b)) { git(c.project, ['worktree', 'add', folder, b]); say(`the branch ${b} existed; its copy is made again`); }
  else git(c.project, ['worktree', 'add', '-b', b, folder, c.branch]);
  process.stdout.write(folder + '\n');
  return 0;
}

// ---- the record --------------------------------------------------------------------------------------------------------
function readLines(file) {
  let txt = '';
  try { txt = fs.readFileSync(file, 'utf8'); } catch (e) { if (!e || e.code !== 'ENOENT') throw new KitError(64, `cannot read ${file}: ${e && e.message}`); }
  const out = [];
  for (const s of txt.split(/\r?\n/)) { if (!s.trim()) continue; try { const j = JSON.parse(s); if (j && typeof j === 'object' && !Array.isArray(j)) out.push(j); } catch { /* skipped */ } }
  return out;
}
function appendLine(c, o) {
  const line = JSON.stringify(o);
  let lead = '';
  try {
    const st = fs.statSync(c.landings);
    if (st.size > 0) { const fd = fs.openSync(c.landings, 'r'); const b = Buffer.alloc(1); fs.readSync(fd, b, 0, 1, st.size - 1); fs.closeSync(fd); if (b[0] !== 0x0a) lead = '\n'; }
  } catch { /* a new file */ }
  const fd = fs.openSync(c.landings, 'a');
  fs.writeSync(fd, lead + line + '\n');
  fs.fsyncSync(fd);
  fs.closeSync(fd);
  c.lines.push(o);
  process.stdout.write(line + '\n');
}
function record(c, base, exit, r, extra = {}) {
  const o = { t: new Date().toISOString(), unit: base.unit, branch: c.branch, kind: base.kind, merge: base.merge, pre: base.pre, tip: base.tip, exit,
    result: r ? r.result : 'not-run', check: base.check, waited_s: r1(r ? r.waited : 0), ran_s: r1(r ? r.ran : 0), ...extra };
  if (r && r.failing && r.failing.length) o.failing = r.failing;
  if (c.logs) o.log = path.relative(c.H, c.logs).replace(/\\/g, '/');
  appendLine(c, o);
}

// ---- lock and landing copy -----------------------------------------------------------------------------------------------
function lock(c) {
  fs.mkdirSync(c.H, { recursive: true });
  const L = path.join(c.H, 'land.lock'), O = path.join(L, 'owner.json');
  const maxAge = Math.max(3 * 3600, c.cfg.check_all_timeout_s + 3000 + 600) * 1000;
  for (let i = 0; i < 2; i++) {
    try {
      fs.mkdirSync(L);
      fs.writeFileSync(O, JSON.stringify({ pid: process.pid, unit: c.unit, t: new Date().toISOString() }));
      process.on('exit', () => { try { if (JSON.parse(fs.readFileSync(O, 'utf8')).pid === process.pid) fs.rmSync(L, { recursive: true, force: true }); } catch { /* gone */ } });
      return;
    } catch (e) {
      if (!e || e.code !== 'EEXIST') throw e;
      let stale, who = '';
      try { const o = JSON.parse(fs.readFileSync(O, 'utf8')); who = ` (unit ${o.unit}, process ${o.pid})`; stale = !alive(o.pid) || Date.now() - Date.parse(o.t) > maxAge; } catch { try { stale = Date.now() - fs.statSync(L).mtimeMs > 15000; } catch { stale = true; } }
      if (!stale) throw new KitError(64, `another landing is running${who}; one landing at a time: land again when it has ended`);
      fs.rmSync(L, { recursive: true, force: true });
      say('broke a stale landing lock (its lander has ended); the re-check covers what it left');
    }
  }
  throw new KitError(64, `cannot take the landing lock ${L}`);
}
function ensureLandingCopy(c) {
  const d = c.landingCopy;
  if (canon(d).split('/').includes('.claude')) throw new KitError(64, `${d} lies inside a .claude folder; the landing copy must not`);
  if (inside(d, c.project)) throw new KitError(64, `${d} lies inside the project; the landing copy must lie outside it`);
  ensureLandingBranch(c);
  if (!fs.existsSync(d)) {
    const wt = worktrees(c);
    if (wt.has(c.branch)) throw new KitError(64, `the landing branch ${c.branch} is checked out in ${wt.get(c.branch)}; landings happen in a copy of their own: switch that checkout to another branch, or set landing_branch in kit.json to a branch nobody works on`);
    fs.mkdirSync(path.dirname(d), { recursive: true });
    git(c.project, ['worktree', 'add', d, c.branch]);
    say(`made the landing copy ${d} on ${c.branch}`);
  }
  const top = gitOut(d, ['rev-parse', '--show-toplevel']);
  if (canon(top) !== canon(d)) throw new KitError(64, `${d} is not the top of a copy (git says ${top})`);
  const common = (x) => canon(gitOut(x, ['rev-parse', '--path-format=absolute', '--git-common-dir']));
  if (common(d) !== common(c.project)) throw new KitError(64, `${d} is not a copy of the repository at ${c.project}`);
  const head = git(d, ['symbolic-ref', '-q', '--short', 'HEAD'], true).stdout.trim();
  if (head !== c.branch) throw new KitError(64, `the landing copy is on ${head || 'a detached HEAD'}, not ${c.branch}`);
  if (gitOk(d, ['rev-parse', '-q', '--verify', 'MERGE_HEAD'])) throw new KitError(64, `a merge is in progress in ${d}; nothing done (git merge --abort there, then land again)`);
  const dirty = gitOut(d, ['status', '--porcelain', '--untracked-files=no']);
  if (dirty) throw new KitError(64, `the landing copy has uncommitted changes; nothing done: ${dirty.split('\n').slice(0, 5).join('; ')}`);
}
function logsDir(c) {
  if (!c.logs) { c.logs = path.join(c.H, 'landings', `${stamp()}-${c.unit}-${process.pid}`); fs.mkdirSync(c.logs, { recursive: true }); }
  return c.logs;
}

// ---- the check -----------------------------------------------------------------------------------------------------------
// files null: check_all once; else each file with check_one, queue_slots at once. -> {result, failing, waited, ran}
async function runCheck(c, who, files) {
  const dir = queueDir(c.project), logs = logsDir(c);
  setSlots(dir, c.cfg.queue_slots);
  const acc = { waited: 0, ran: 0, failing: [] };
  let results;
  if (!files) {
    const r = await laneRun({ dir, label: `land-${who}-${process.pid}`, argv: fillAll(c.cfg), cwd: c.landingCopy, timeoutS: c.cfg.check_all_timeout_s, log: path.join(logs, 'check_all.log') });
    results = [{ id: 'check_all', res: r }];
  } else {
    const ms = membersOf(c.cfg, files);
    await runPool(ms, c.cfg.queue_slots, (m) => laneRun({ dir, label: `land-${who}-${safe(m.id)}-${process.pid}`, argv: m.argv, cwd: c.landingCopy, timeoutS: c.cfg.check_one_timeout_s, log: path.join(logs, safe(m.id) + '.log') }));
    results = ms;
  }
  for (const m of results) {
    acc.waited += m.res.waited; acc.ran += m.res.ran;
    if (m.res.result !== 'pass') acc.failing.push({ what: m.id, result: m.res.result, exit: m.res.exit, end: tail(m.res.log, 8).slice(-600) });
  }
  acc.result = results.some((m) => m.res.result === 'fail') ? 'fail' : results.every((m) => m.res.result === 'pass') ? 'pass' : 'none';
  return acc;
}
const failText = (r) => r.failing.map((f) => `${f.what} (${f.result === 'none' ? 'no result' : `exit ${f.exit}`})`).join(', ');

// ---- the steps -------------------------------------------------------------------------------------------------------------
function undo(c, merge, pre) {
  const now = gitOut(c.landingCopy, ['rev-parse', 'HEAD']);
  if (now !== merge) throw new KitError(64, `${c.branch} moved during the landing (at ${short(now)}, not the merge ${short(merge)}); not undone, look at ${c.landingCopy} by hand`);
  git(c.landingCopy, ['reset', '-q', '--hard', pre]);
  if (gitOut(c.landingCopy, ['rev-parse', 'HEAD']) !== pre) throw new KitError(64, `the undo did not bring ${c.branch} back to ${short(pre)}; look at ${c.landingCopy} by hand`);
}
const recordedBy = (c, sha) => c.lines.find((l) => typeof l.merge === 'string' && l.merge === sha && l.exit !== 5);
function unrecorded(c) {
  const raw = git(c.landingCopy, ['log', '--first-parent', '--merges', '-n', '200', '--format=%H%x1f%P%x1f%B%x1e', 'HEAD']).stdout;
  const out = [];
  for (const rec of raw.split('\x1e')) {
    const s = rec.replace(/^[\r\n]+/, '');
    if (!s.trim()) continue;
    const [sha, parents = '', body = ''] = s.split('\x1f');
    if (!/^Land-Kit: *unit\.mjs *\r?$/m.test(body)) continue; // only merges this script made
    const u = /^Land-Unit: *(\S+) *\r?$/m.exec(body);
    if (!u || recordedBy(c, sha)) continue;
    let files = null;
    const fm = /^Land-Check: *(\[.*\]) *\r?$/m.exec(body);
    if (fm) { try { const a = JSON.parse(fm[1]); if (Array.isArray(a) && a.length) files = a.map(normPath); } catch { files = null; } }
    const [pre, tip] = parents.trim().split(/\s+/);
    out.push({ sha, pre, tip, unit: u[1], files });
  }
  return out.reverse();
}
async function recheck(c) {
  for (const m of unrecorded(c)) {
    say(`merge ${short(m.sha)} of ${m.unit} has no line in landings.jsonl; its check runs first`);
    const head = gitOut(c.landingCopy, ['rev-parse', 'HEAD']);
    const r = await runCheck(c, `recheck-${m.unit}`, m.files);
    const base = { unit: m.unit, kind: 'recheck', merge: m.sha, pre: m.pre, tip: m.tip, check: m.files || 'all' };
    if (r.result === 'pass') { record(c, base, 0, r, { undone: false }); continue; }
    if (r.result === 'none') { record(c, base, 5, r, { undone: false }); throw new KitError(5, `the re-check of merge ${short(m.sha)} (${m.unit}) got no result; nothing undone, it is checked again at the next landing`); }
    const atTip = head === m.sha;
    if (atTip) undo(c, m.sha, m.pre);
    record(c, base, 4, r, { undone: atTip });
    throw new KitError(4, `the re-check of merge ${short(m.sha)} (${m.unit}) failed: ${failText(r)}; ` + (atTip
      ? `undone, ${c.branch} is back at ${short(m.pre)}` : `later commits sit on it, so it stays: undo it with git revert -m 1 ${m.sha}`));
  }
}
async function land(c, name, files) {
  if (!name || !UNIT_RE.test(name)) throw new KitError(64, `not a unit name: ${name || ''}`);
  c.unit = name;
  const b = unitBranch(c, name);
  lock(c);
  ensureLandingCopy(c);
  c.lines = readLines(c.landings);
  const tip = git(c.landingCopy, ['rev-parse', '-q', '--verify', `refs/heads/${b}^{commit}`], true).stdout.trim();
  if (!tip) throw new KitError(64, `there is no branch ${b} (make it with: unit.mjs start ${name})`);
  if (files) for (const f of files) if (!gitOk(c.landingCopy, ['cat-file', '-e', `${tip}:${f}`])) throw new KitError(64, `${b} has no file ${f}`);
  await recheck(c);
  if (gitOk(c.landingCopy, ['merge-base', '--is-ancestor', tip, 'HEAD'])) throw new KitError(6, `${b} (${short(tip)}) is already in ${c.branch}; nothing merged, no line written`);
  const pre = gitOut(c.landingCopy, ['rev-parse', 'HEAD']);
  const msg = path.join(logsDir(c), 'merge-message.txt');
  fs.writeFileSync(msg, `land: merge ${b} into ${c.branch}\n\nLand-Unit: ${name}\nLand-Check: ${files ? JSON.stringify(files) : 'all'}\nLand-Kit: unit.mjs\n`);
  const mr = git(c.landingCopy, ['merge', '--no-ff', '--no-edit', '--no-log', '-F', msg, `refs/heads/${b}`], true);
  const base = { unit: name, kind: 'land', pre, tip, check: files || 'all' };
  if (mr.status !== 0) {
    const unmerged = git(c.landingCopy, ['diff', '--name-only', '--diff-filter=U'], true).stdout.split('\n').map((s) => s.trim()).filter(Boolean);
    if (gitOk(c.landingCopy, ['rev-parse', '-q', '--verify', 'MERGE_HEAD'])) git(c.landingCopy, ['merge', '--abort']);
    if (gitOut(c.landingCopy, ['rev-parse', 'HEAD']) !== pre || gitOut(c.landingCopy, ['status', '--porcelain', '--untracked-files=no'])) throw new KitError(64, `git merge ${b} failed and the landing copy is not back at ${short(pre)}; look at ${c.landingCopy} by hand`);
    if (!unmerged.length) throw new KitError(64, `git merge ${b} failed without a conflict; nothing changed: ${String(mr.stderr || mr.stdout).trim().split('\n').slice(0, 4).join(' | ')}`);
    record(c, { ...base, merge: null }, 2, null, { aborted: true, conflicts: unmerged });
    throw new KitError(2, `textual conflict merging ${b} (${unmerged.join(', ')}); the merge is aborted, ${c.branch} unchanged at ${short(pre)}; the unit goes back to its builder (merge ${c.branch} into ${b} in its copy, then land again)`);
  }
  const merge = gitOut(c.landingCopy, ['rev-parse', 'HEAD']);
  const parents = gitOut(c.landingCopy, ['rev-list', '--parents', '-n', '1', merge]).split(/\s+/).slice(1);
  if (parents.length !== 2 || parents[0] !== pre || parents[1] !== tip) throw new KitError(70, `the merge ${short(merge)} does not have the parents ${short(pre)} and ${short(tip)}; left for the next landing's re-check`);
  say(`merged ${b} (${short(tip)}) into ${c.branch} at ${short(merge)}; running the check (${files ? files.length + ' file(s)' : 'check_all'})`);
  const r = await runCheck(c, name, files);
  base.merge = merge;
  if (r.result === 'pass') {
    const changed = git(c.landingCopy, ['status', '--porcelain', '--untracked-files=no']).stdout.split('\n').filter((l) => l.trim()).map((l) => l.slice(3));
    if (changed.length) { git(c.landingCopy, ['reset', '-q', '--hard', 'HEAD']); say(`the check changed tracked files in the landing copy; put back: ${changed.join(', ')}`); }
    record(c, base, 0, r, { undone: false, ...(changed.length ? { dirtied: changed } : {}) });
    say(`${b} landed on ${c.branch} at ${short(merge)} (pre ${short(pre)}); waited ${r1(r.waited)} s, ran ${r1(r.ran)} s`);
    return 0;
  }
  undo(c, merge, pre); // undone before its line: a stop between the two leaves no failing merge on the branch
  const code = r.result === 'fail' ? 1 : 5;
  record(c, base, code, r, { undone: true });
  throw new KitError(code, code === 1
    ? `${b} failed the check: ${failText(r)}; the merge is undone (${c.branch} back at ${short(pre)}); the unit goes back to its builder (logs: ${c.logs})`
    : `no result for ${b} (timeout, or no queue slot): ${failText(r)}; the merge is undone (${c.branch} back at ${short(pre)}); land it again later`);
}

// ---- list and report -----------------------------------------------------------------------------------------------------
function list(c, json) {
  const wt = worktrees(c);
  const lines = readLines(c.landings);
  const rows = [];
  const refs = git(c.project, ['for-each-ref', '--format=%(refname) %(objectname)', 'refs/heads/']).stdout.split('\n').filter(Boolean);
  const hasLanding = hasBranch(c, c.branch);
  for (const l of refs) {
    const [ref, sha] = l.trim().split(' ');
    const b = ref.replace(/^refs\/heads\//, '');
    if (!b.startsWith(c.prefix) || b === c.branch || b.length === c.prefix.length) continue;
    const name = b.slice(c.prefix.length);
    const landed = hasLanding && gitOk(c.project, ['merge-base', '--is-ancestor', sha, c.branch]);
    const last = [...lines].reverse().find((x) => x.unit === name && x.kind === 'land');
    const state = landed ? 'landed' : !last ? 'not landed' : last.exit === 2 ? 'not landed (conflict)' : last.exit === 1 ? 'not landed (check failed, undone)' : last.exit === 5 ? 'not landed (no result, undone)' : 'not landed';
    rows.push({ unit: name, branch: b, folder: wt.get(b) || null, landed, state });
  }
  if (json) { process.stdout.write(JSON.stringify(rows, null, 1) + '\n'); return 0; }
  if (!rows.length) { process.stdout.write(`no units (branches ${c.prefix}*)\n`); return 0; }
  const w = Math.max(4, ...rows.map((r) => r.unit.length));
  for (const r of rows) process.stdout.write(`${r.unit.padEnd(w)}  ${r.state.padEnd(34)}  ${r.branch}  ${r.folder || '(no copy)'}\n`);
  return 0;
}
function report(c, json) {
  const lines = readLines(c.landings);
  const of = (f) => lines.filter(f);
  const units = (ls) => [...new Set(ls.map((l) => l.unit))];
  const s = {
    lines: lines.length,
    landed: units(of((l) => l.exit === 0)),
    failed_undone: units(of((l) => (l.exit === 1 || l.exit === 4) && l.undone)),
    failed_left: units(of((l) => l.exit === 4 && !l.undone)),
    no_result_undone: units(of((l) => l.exit === 5 && l.undone)),
    conflicts: of((l) => l.exit === 2).map((l) => ({ unit: l.unit, files: l.conflicts || [] })),
    rechecks: of((l) => l.kind === 'recheck').length,
    waited_s: r1(lines.reduce((a, l) => a + (Number(l.waited_s) || 0), 0)),
    ran_s: r1(lines.reduce((a, l) => a + (Number(l.ran_s) || 0), 0)),
  };
  if (json) { process.stdout.write(JSON.stringify(s, null, 1) + '\n'); return 0; }
  const n = (a) => `${a.length}${a.length ? ': ' + a.join(', ') : ''}`;
  process.stdout.write([
    `landings recorded: ${s.lines} (${c.landings})`,
    `landed: ${n(s.landed)}`,
    `check failed, undone: ${n(s.failed_undone)}`,
    ...(s.failed_left.length ? [`check failed, left in place (git revert -m 1): ${n(s.failed_left)}`] : []),
    `no result, undone: ${n(s.no_result_undone)}`,
    `conflicts (merge aborted): ${s.conflicts.length}${s.conflicts.length ? ': ' + s.conflicts.map((x) => `${x.unit} (${x.files.join(', ')})`).join('; ') : ''}`,
    `re-checks: ${s.rechecks}`,
    `seconds waited for the queue: ${s.waited_s}; seconds the checks ran: ${s.ran_s}`,
  ].join('\n') + '\n');
  return 0;
}

async function main() {
  const { opt, pos } = parseArgs(process.argv.slice(2), ['project'], ['json']);
  const verb = pos[0];
  if (!['start', 'land', 'list', 'report'].includes(verb)) throw new KitError(64, USAGE);
  const c = setup(opt);
  noticeOnce(c.project, 'unit', NOTICE);
  if (verb === 'start') { if (pos.length !== 2) throw new KitError(64, USAGE); return start(c, pos[1]); }
  if (verb === 'land') {
    const files = pos.length > 2 ? [...new Set(pos.slice(2).map(normPath))] : null;
    if (files) for (const f of files) if (!f || path.isAbsolute(f) || f.split('/').includes('..')) throw new KitError(64, `a test file is a path inside the project, relative to its top: ${f}`);
    return land(c, pos[1], files);
  }
  if (pos.length !== 1) throw new KitError(64, USAGE);
  return verb === 'list' ? list(c, opt.json) : report(c, opt.json);
}

// exitCode, not exit(): output to a pipe is written in full before the process ends (asynchronous on some systems)
main().then((code) => { process.exitCode = code || 0; }, (e) => {
  if (e instanceof KitError) { say(e.message); process.exitCode = e.code; return; }
  say(`internal error: ${e && e.stack ? e.stack : e}`);
  process.exitCode = 70;
});
