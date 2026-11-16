// Runs every configuration of configs.mjs, each split into parts, every part as its own child process.
//   node run-all.mjs [--only ID,ID] [--wall-min 14] [--out results.json]
// A configuration with a fault budget k is split into its maximal fault-kind multisets (every multiset
// of exactly k faults within the per-kind caps). A run of the full configuration uses some multiset of
// at most k faults, which is contained in one maximal multiset, so the union of the parts is exactly the
// full configuration: a property holds for it iff it holds in every part; the shortest failing trace
// over the parts is its shortest trace. Planned hand-overs are not faults and are the same in every part,
// so a state's ordinary (non-fault) transitions are the same in every part, and the liveness checks,
// which use ordinary transitions only, give the same answer per state.
// Workers: os.availableParallelism() - 2 at once; each gets --max-old-space-size = 60 % of os.freemem()
// divided by the number of workers, and the same budget (less a fixed allowance for the runtime) for its
// own typed arrays (check.mjs counts them and stops a part that would exceed it: that part is BOUNDED).
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CONFIGS } from './configs.mjs';
import { FAULTS } from './model.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const only = opt('--only', null);
const WALL_MS = +opt('--wall-min', 14) * 60000;
const OUT = opt('--out', path.join(HERE, 'results', `run-${new Date().toISOString().replace(/[:.]/g, '-')}.json`));
const T0 = Date.now();

// ---------------------------------------------------------------- parts
function maximalMultisets(bud) {
  const kinds = FAULTS.filter((k) => (bud[k] || 0) > 0);
  const out = [];
  const total = Math.min(bud.k, kinds.reduce((a, k) => a + bud[k], 0));
  const rec = (i, left, cur) => {
    if (left === 0) { out.push({ ...cur }); return; }
    if (i >= kinds.length) return;
    const k = kinds[i];
    for (let c = Math.min(bud[k], left); c >= 0; c--) { if (c) cur[k] = c; else delete cur[k]; rec(i + 1, left - c, cur); }
    delete cur[k];
  };
  rec(0, total, {});
  return out;
}
const partArg = (k, m) => [`k=${k}`, ...Object.entries(m).map(([a, b]) => `${a}=${b}`)].join(',');
// a rough size estimate, used only to start the largest parts first
function weight(cfg, m) {
  const child = (m.cs || 0) + (m.cv || 0) + (m.cd || 0);
  const other = Object.entries(m).filter(([k]) => !k.startsWith('c')).reduce((a, [, v]) => a + v, 0);
  return Math.pow(9, child) * Math.pow(3, other) * Math.pow(20, (cfg.over.FIELDS || 2) - 2) * (cfg.prio || 1);
}

const chosen = CONFIGS.filter((c) => !c.smoke && (!only || only.split(',').includes(c.id)));
const jobs = [];
for (const cfg of chosen) {
  const bud = cfg.over.BUD;
  const parts = cfg.whole ? [null] : maximalMultisets(bud);
  cfg.parts = parts.length;
  for (const m of parts) jobs.push({ cfg, part: m ? partArg(bud.k, m) : null, w: m ? weight(cfg, m) : 1e12, order: cfg.order ?? 0 });
}
jobs.sort((a, b) => a.order - b.order || b.w - a.w);

const WORKERS = Math.max(1, os.availableParallelism() - 2);
const freeMB = os.freemem() / 1048576;
const conc = Math.min(WORKERS, jobs.length);
const perMB = Math.max(64, Math.floor((0.6 * freeMB) / conc));
const RUNTIME_MB = 40; // node's own code and baseline, outside the counted arrays
// A part stopped by its memory share is retried once at the end with RETRY_MB; fewer then run at once,
// because a part starts only while the shares of the running parts stay within TOTAL_MB.
const TOTAL_MB = conc * perMB;
const RETRY_MB = argv.includes('--no-retry') ? 0 : Math.min(TOTAL_MB, 4 * perMB);
let allocated = 0;
for (const j of jobs) j.share = perMB;
process.stderr.write(`run-all: retry share ${RETRY_MB} MB; ${chosen.length} configurations, ${jobs.length} parts; ${os.availableParallelism()} threads -> ${conc} workers; free memory ${Math.round(freeMB)} MB -> ${perMB} MB per worker (--max-old-space-size=${perMB}), ${conc * perMB} MB in all = ${Math.round((100 * conc * perMB) / freeMB)} % of free; wall limit ${WALL_MS / 60000} min\n`);

// ---------------------------------------------------------------- aggregation
const agg = new Map(); // id -> {cfg, done, states, transitions, cpu, complete, boundedParts, timedOut, skipped, props, peakMB, maxRSS}
for (const cfg of chosen) agg.set(cfg.id, { cfg, done: 0, states: 0, transitions: 0, cpu: 0, complete: true, bounded: [], failedRuns: [], skipped: 0, props: {}, peakMB: 0, finishedAt: 0 });
const PROP_ORDER = ['NoStaleAccepted', 'AtMostOneCommit', 'Slots', 'RestartLimit', 'TwoCoordinatorsAct', 'SingleWatcher', 'FailedTaskStopped', 'OneSessionPerAttempt', 'ReadyNotDiscarded', 'NoFalseSuspicion', 'NoDeadlock', 'AlwaysCanResolve', 'NoBusyLoop', 'EventuallyResolves'];
function absorb(a, part, r) {
  a.states += r.states; a.transitions += r.transitions; a.cpu += r.seconds; a.peakMB = Math.max(a.peakMB, r.peak_mb);
  if (!r.complete) { a.complete = false; a.bounded.push(`${part}: ${r.bounded_why}`); }
  for (const [p, v] of Object.entries(r.props)) {
    const cur = a.props[p];
    if (v.holds === false) { if (!cur || cur.holds !== false || v.trace.length < cur.trace.length) a.props[p] = { holds: false, trace: v.trace, part }; }
    else if (v.holds === true) { if (!cur) a.props[p] = { holds: true }; }
    else if (!cur || cur.holds === true) a.props[p] = { holds: v.holds, part };
  }
}
const short = (v) => (v === undefined ? '-' : v.holds === true ? 'ok' : v.holds === false ? 'FAIL' : '?');
function line(a) {
  const fails = PROP_ORDER.filter((p) => a.props[p] && a.props[p].holds === false).map((p) => `${p}(${a.props[p].trace.length})`);
  const unk = PROP_ORDER.filter((p) => a.props[p] && a.props[p].holds !== true && a.props[p].holds !== false);
  const st = a.done < a.cfg.parts ? `INCOMPLETE ${a.done}/${a.cfg.parts} parts run` : a.complete ? 'complete' : `BOUNDED (${a.bounded.length} parts)`;
  return `${a.cfg.id.padEnd(16)} ${String(a.cfg.parts).padStart(4)} parts ${String(a.states).padStart(12)} states ${a.cpu.toFixed(0).padStart(6)} cpu-s  ${st}; fails: ${fails.join(' ') || 'none'}${unk.length ? `; unknown: ${unk.join(' ')}` : ''}`;
}

// ---------------------------------------------------------------- the pool
let next = 0, running = 0, stopStarting = false;
const live = new Set();
function startOne() {
  if (stopStarting || next >= jobs.length) return false;
  if (allocated + jobs[next].share > TOTAL_MB) return false;
  const job = jobs[next++];
  running++; allocated += job.share;
  const args = [`--max-old-space-size=${job.share}`, path.join(HERE, 'check.mjs'), job.cfg.id, '--mem-mb', String(job.share - RUNTIME_MB)];
  if (job.part) args.push('--bud', job.part);
  args.push('--deadline', String(T0 + WALL_MS - 100000)); // a part stops exploring itself and reports BOUNDED (time)
  let ch;
  try { ch = spawn(process.execPath, args, { cwd: HERE, stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { running--; allocated -= job.share; const a = agg.get(job.cfg.id); a.done++; a.complete = false; a.failedRuns.push(`${job.part}: spawn failed: ${e.code || e.message}`); return true; }
  ch.on('error', (e) => { const a = agg.get(job.cfg.id); a.failedRuns.push(`${job.part}: ${e.syscall || ''} ${e.code || e.message}`); });
  live.add(ch);
  let out = '', err = '';
  ch.stdout.on('data', (d) => (out += d));
  ch.stderr.on('data', (d) => { err += d; if (err.length > 20000) err = err.slice(-10000); });
  ch.on('close', (code, sig) => {
    live.delete(ch); running--; allocated -= job.share;
    const a = agg.get(job.cfg.id);
    let r = null; try { r = JSON.parse(out.trim().split('\n').pop()); } catch { r = null; }
    if (r && !r.complete && /^memory/.test(r.bounded_why || '') && !job.retry && RETRY_MB > job.share) {
      jobs.push({ ...job, share: RETRY_MB, retry: true, first: r }); a.retried = (a.retried || 0) + 1;
    } else {
      a.done++;
      if (!r && job.first) r = job.first;
      if (r) absorb(a, job.part + (job.retry ? ` (retried with ${job.share} MB)` : ''), r);
      else { a.complete = false; a.failedRuns.push(`${job.part}: exit ${code}${sig ? ' ' + sig : ''} ${err.split('\n').filter(Boolean).slice(-2).join(' | ')}`); }
    }
    if (a.done === a.cfg.parts && !a.finishedAt) { a.finishedAt = Date.now(); process.stdout.write(`[${((Date.now() - T0) / 1000).toFixed(0).padStart(4)} s] ${line(a)}\n`); }
    try { while (running < conc && startOne()); } catch (e) { process.stderr.write(`run-all: could not start a part: ${e.code || e.message}
`); }
    if (running === 0 && (next >= jobs.length || stopStarting)) finish();
  });
  return true;
}
const guard = setInterval(() => {
  const t = Date.now() - T0;
  if (t > WALL_MS - 90000 && !stopStarting) { stopStarting = true; process.stderr.write(`run-all: ${(t / 60000).toFixed(1)} min: no new parts start (${jobs.length - next} not started)\n`); }
  if (t > WALL_MS) for (const ch of live) { // only parts this script spawned
    if (!ch.killed) ch.kill();
    else if (ch.pid && t > WALL_MS + 10000) spawnSync('taskkill', ['/PID', String(ch.pid), '/F'], { stdio: 'ignore' });
  }
}, 2000);
for (let i = 0; i < conc; i++) startOne();
if (running === 0) finish();

let finished = false;
function finish() {
  if (finished) return; finished = true; clearInterval(guard);
  const wall = (Date.now() - T0) / 1000;
  const notStarted = jobs.slice(next).filter((j) => !j.retry);
  for (const j of notStarted) agg.get(j.cfg.id).skipped++;
  for (const j of jobs.slice(next).filter((x) => x.retry)) { const a = agg.get(j.cfg.id); a.done++; absorb(a, j.part + ' (retry not started: wall limit)', j.first); }
  const rows = [...agg.values()];
  for (const a of rows) if (a.done < a.cfg.parts && !a.finishedAt) process.stdout.write(`[${wall.toFixed(0).padStart(4)} s] ${line(a)}\n`);
  // property table
  const ab = PROP_ORDER.map((p) => p.replace(/[a-z]/g, '').slice(0, 4).padEnd(4));
  process.stdout.write(`\nProperty table (ok = holds in every part; FAIL = a part found a trace; ? = not decided):\n`);
  process.stdout.write(`${'config'.padEnd(16)} ${PROP_ORDER.map((p, i) => ab[i]).join(' ')}\n`);
  for (const a of rows) process.stdout.write(`${a.cfg.id.padEnd(16)} ${PROP_ORDER.map((p) => short(a.props[p]).padEnd(4)).join(' ')}\n`);
  process.stdout.write(`legend: ${PROP_ORDER.map((p, i) => `${ab[i].trim()}=${p}`).join(', ')}\n`);
  const total = rows.reduce((s, a) => s + a.states, 0);
  process.stdout.write(`\nTotal: ${total} states in ${rows.reduce((s, a) => s + a.done, 0)} parts of ${rows.length} configurations; ${rows.reduce((s, a) => s + a.cpu, 0).toFixed(0)} cpu-s; wall ${wall.toFixed(0)} s on ${conc} workers of ${perMB} MB${notStarted.length ? `; ${notStarted.length} parts NOT started (wall limit)` : ''}\n`);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ wall_seconds: wall, workers: conc, heap_mb_per_worker: perMB, free_mb_at_start: Math.round(freeMB), total_states: total, configs: rows.map((a) => ({ id: a.cfg.id, title: a.cfg.title, base: a.cfg.base || null, parts: a.cfg.parts, parts_run: a.done, parts_not_started: a.skipped, parts_retried: a.retried || 0, states: a.states, transitions: a.transitions, cpu_seconds: Math.round(a.cpu), complete: a.complete && a.done === a.cfg.parts, bounded: a.bounded, failed_runs: a.failedRuns, peak_mb: a.peakMB, props: a.props })) }, null, 1));
  process.stderr.write(`run-all: results written to ${OUT}\n`);
}
