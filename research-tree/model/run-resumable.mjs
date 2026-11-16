// Restartable, rate-limited full run of the model. Same configurations and exactly the same parts as
// run-all.mjs; the limit is on how much runs at once, never on how much is explored.
//
//   node run-resumable.mjs [--workers 4] [--mem-mb 1500] [--big-mem-mb 8000] [--floor-mb 4000]
//                          [--only ID,ID*] [--exclude ID,ID*] [--configs full|base] [--results DIR]
//                          [--big-at rank|end|asap] [--rerun-bounded] [--poll-s 5] [--plan] [--plan-parts] [--force-lock]
//                          [--spawn-gap-ms 250] [--batch-max-est 81] [--batch-parts 100]
//
// Gentle starts:
//   --spawn-gap-ms G  at least G ms between two process starts of this runner (default 250), so a pool
//                     never starts its workers in a burst
//   --batch-max-est E a normal part whose estimate (weight x cost factor) is at most E (default 81: at 2
//                     fields every 2-fault part, 3-fault parts with at most one child fault, 4-fault parts
//                     with none; 3,750 of the full matrix's 9,154 parts)
//                     runs in a host process: one long-lived process per worker slot that runs such parts one
//                     after another, each in a fresh worker thread (its own heap of --mem-mb, freed when the
//                     part ends), instead of one process per part. 0 = every part in its own process.
//   --batch-parts N   a host is ended and replaced after N parts (default 100)
//   A host counts as one worker of --mem-mb for --workers and admission, busy or idle. Big parts never run
//   in a host. --plan-parts prints the parts as JSON (config, part, estimate, in a host or not, state).
//
// Order: cheapest first. Configurations by their estimated cost (run-all.mjs's weight() summed over the
// parts, times COST_FACTOR of configs-full.mjs), parts within a configuration smallest first. Big parts
// (--big-at): rank (default) = before the first normal part of a costlier configuration, so every
// configuration finishes completely in that order; end = after all normal parts; asap = at once (drain).
//
// Parts: run-all.mjs splits a configuration into its maximal fault-kind multisets. This file does not
// derive the parts a second way: it reads the source of run-all.mjs and evaluates its own
// maximalMultisets / partArg / weight functions (run-all.mjs runs on import, so it cannot be imported),
// applies run-all's selection (no smoke configs; cfg.whole -> one part) and refuses to start when that
// source text has changed shape. At start it also checks that the parts cover every fault multiset of
// the budget (every multiset of at most k faults within the caps lies in some part).
//
// Rate limits (they slow the run down, they never shrink it):
//   --workers N       at most N check.mjs processes at once (default 4)
//   --mem-mb M        each worker: --max-old-space-size=M and check.mjs --mem-mb M-40, as run-all does
//   --big-mem-mb B    a part that ends bounded at M (BFS stopped by memory, analyses skipped for memory,
//                     or the process died without a result) is queued again and run ALONE with B
//   --floor-mb F      admission: a worker of size S starts only while
//                       os.freemem() - (what running workers may still grow into) - (S + 150 + S/10) > F
//                     otherwise the runner waits --poll-s seconds and looks again
//   A part bounded even at B is BOUNDED in the table and in the exit code; nothing is cut to make it fit.
//   No wall-clock limit: check.mjs gets no --deadline.
//
// Restart: one result file per part, results/<config>/<part>.json, written to a temporary file, flushed
// to disk and renamed when the part finishes. On start a part whose file says "complete" (for the same
// model.mjs, check.mjs and resolved parameters: see fingerprint) is skipped; a part bounded at a size
// below B goes straight to the big queue; a part bounded at B or more is reported, not rerun, unless
// --rerun-bounded or a larger --big-mem-mb; a part that was running at a reset has no file and runs again.
// results/SUMMARY.json and results/SUMMARY.md are rewritten after every finished part.
// Exit code: 0 only when every part is complete; 1 when any part is bounded or failed; 2 on a usage or
// set-up error; 3 when interrupted.
//
// Each check.mjs child also loads a small watchdog (a worker thread) that ends the child when this runner
// is gone, so killing the runner never leaves orphans that would compete with the next run.
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFile } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const has = (k) => argv.includes(k);
const opt = (k, d) => (has(k) ? argv[argv.indexOf(k) + 1] : d);
const num = (k, d) => { const v = Number(opt(k, d)); if (!Number.isFinite(v) || v <= 0) die(`${k} needs a positive number`); return v; };
function die(msg) { process.stderr.write(`run-resumable: ${msg}\n`); process.exit(2); }

const WORKERS = Math.floor(num('--workers', 4));
const MEM = Math.floor(num('--mem-mb', 1500));
const BIG = Math.floor(num('--big-mem-mb', 8000));
const FLOOR = Math.floor(num('--floor-mb', 4000));
const POLL_MS = num('--poll-s', 5) * 1000;
const BIG_AT = opt('--big-at', 'rank');
const CONFIG_SET = opt('--configs', 'full');
const RESULTS = path.resolve(opt('--results', path.join(HERE, 'results')));
const RERUN_BOUNDED = has('--rerun-bounded');
const PLAN_ONLY = has('--plan') || has('--plan-parts');
const nonneg = (k, d) => { const v = Number(opt(k, d)); if (!Number.isFinite(v) || v < 0) die(`${k} needs a number of 0 or more`); return v; };
const SPAWN_GAP_MS = nonneg('--spawn-gap-ms', 250);
const BATCH_EST = nonneg('--batch-max-est', 81);
const BATCH_PARTS = Math.max(1, Math.floor(num('--batch-parts', 100)));
const RUNTIME_MB = 40; // as run-all.mjs: node's own code and baseline, outside the counted arrays
// measured on this PC (26 parts): a child's working set ran 52-134 MB (median 78) above what check.mjs
// reports (node itself, the watchdog thread, heap slack, arrays dropped but not yet collected), so
// admission and the headroom of a running worker count its size + this
const PROC_OVERHEAD_MB = 150;
// The peak working set grows faster than that with the size: a grown typed array is copied while the old
// one is still held until a collection. Measured peaks (process.resourceUsage().maxRSS) of bounded
// A-FENCE-CE parts: 550 MB at --max-old-space-size 400, 1198 MB at 1000, 2254 MB at 2000, i.e. size + 150,
// + 198, + 254. A worker of size S is therefore reserved S + 150 + 10 % of S (590, 1250, 2350 there;
// 8950 for an 8000 MB big part, an extrapolation: nothing above 2000 MB was measured).
const reserveOf = (size) => size + PROC_OVERHEAD_MB + Math.ceil(0.1 * size);
if (!['rank', 'end', 'asap'].includes(BIG_AT)) die('--big-at is rank, end or asap');
if (!['full', 'base'].includes(CONFIG_SET)) die('--configs is full or base');
if (BIG < MEM) die('--big-mem-mb must be at least --mem-mb');
const TOTAL_MB = os.totalmem() / 1048576;
if (reserveOf(MEM) + FLOOR >= TOTAL_MB || reserveOf(BIG) + FLOOR >= TOTAL_MB) die(`--mem-mb ${MEM} / --big-mem-mb ${BIG} plus --floor-mb ${FLOOR} exceed this machine's ${Math.round(TOTAL_MB)} MB: such a worker could never be admitted`);

// ---------------------------------------------------------------- configurations and model
const CHECK = path.join(HERE, 'check.mjs');
const FULL_URL = pathToFileURL(path.join(HERE, 'configs-full.mjs')).href;
if (CONFIG_SET === 'full') await import(FULL_URL);
const { CONFIGS } = await import(pathToFileURL(path.join(HERE, 'configs.mjs')).href);
const { FAULTS, makeParams } = await import(pathToFileURL(path.join(HERE, 'model.mjs')).href);
let COST_FACTOR = {};
if (CONFIG_SET === 'full') COST_FACTOR = (await import(FULL_URL)).COST_FACTOR || {};

// ---------------------------------------------------------------- run-all.mjs's own partition functions
const RUN_ALL_SRC = fs.readFileSync(path.join(HERE, 'run-all.mjs'), 'utf8');
const { maximalMultisets, partArg, weight } = (() => {
  const a = RUN_ALL_SRC.indexOf('function maximalMultisets(bud)');
  const b = RUN_ALL_SRC.indexOf('const chosen = CONFIGS.filter((c) => !c.smoke');
  const sel = 'const parts = cfg.whole ? [null] : maximalMultisets(bud);';
  const part = 'jobs.push({ cfg, part: m ? partArg(bud.k, m) : null';
  if (a < 0 || b < a || !RUN_ALL_SRC.includes(sel) || !RUN_ALL_SRC.includes(part) || !RUN_ALL_SRC.includes('const bud = cfg.over.BUD;'))
    die('run-all.mjs no longer has the partition code this runner evaluates (maximalMultisets, partArg, weight, the selection); refusing to derive parts another way');
  // eslint-disable-next-line no-new-func
  return new Function('FAULTS', `${RUN_ALL_SRC.slice(a, b)}\nreturn { maximalMultisets, partArg, weight };`)(FAULTS);
})();
const partsOf = (cfg) => (cfg.whole ? [null] : maximalMultisets(cfg.over.BUD)); // run-all.mjs line: const parts = ...

// the part's budget exactly as check.mjs resolves it from --bud (fault kinds zeroed, then set; h and d kept)
function partBudget(cfg, partStr) {
  const over = { ...cfg.over, BUD: { ...(cfg.over.BUD || {}) } };
  if (partStr) { for (const k of FAULTS) over.BUD[k] = 0; for (const kv of partStr.split(',')) { const [k, v] = kv.split('='); over.BUD[k] = +v; } }
  return over;
}
// every multiset of at most k faults within the caps must lie inside some part
function checkCover(cfg, parts) {
  if (cfg.whole) return;
  const bud = cfg.over.BUD; const kinds = FAULTS.filter((k) => (bud[k] || 0) > 0);
  for (const m of parts) { let s = 0; for (const [k, v] of Object.entries(m)) { if (v > (bud[k] || 0)) die(`${cfg.id}: part ${partArg(bud.k, m)} exceeds the cap of ${k}`); s += v; } if (s > bud.k) die(`${cfg.id}: part ${partArg(bud.k, m)} exceeds k`); }
  const keys = new Set(parts.map((m) => partArg(bud.k, m)));
  if (keys.size !== parts.length) die(`${cfg.id}: duplicate parts`);
  let bad = null;
  const rec = (i, left, cur) => {
    if (bad) return;
    if (i === kinds.length) { if (!parts.some((m) => kinds.every((k) => (cur[k] || 0) <= (m[k] || 0)))) bad = { ...cur }; return; }
    const k = kinds[i];
    for (let c = 0; c <= Math.min(bud[k], left); c++) { cur[k] = c; rec(i + 1, left - c, cur); }
    delete cur[k];
  };
  rec(0, bud.k, {});
  if (bad) die(`${cfg.id}: the fault multiset ${JSON.stringify(bad)} lies in no part; the partition does not cover the budget`);
}

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const SRC_SHA = sha(fs.readFileSync(path.join(HERE, 'model.mjs')) + '\0' + fs.readFileSync(CHECK));
const sortKeys = (v) => (Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v);
// a result is reused only for the same model.mjs, check.mjs, configuration id, part and resolved parameters
const fingerprint = (cfg, partStr) => sha(`${SRC_SHA}\0${cfg.id}\0${partStr || ''}\0${JSON.stringify(sortKeys(makeParams(partBudget(cfg, partStr))))}`);

const pats = (s) => (s ? s.split(',').filter(Boolean).map((p) => new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$')) : null);
const ONLY = pats(opt('--only', null)), EXCL = pats(opt('--exclude', null));
const chosen = CONFIGS.filter((c) => !c.smoke && (!ONLY || ONLY.some((r) => r.test(c.id))) && !(EXCL && EXCL.some((r) => r.test(c.id))));
if (!chosen.length) die('no configuration selected');
const costFactor = (cfg) => { let f = cfg.costFactor || 1; for (const [pre, v] of Object.entries(COST_FACTOR)) if (cfg.id === pre || cfg.id.startsWith(pre + '-')) f = v; return f; };

// ---------------------------------------------------------------- parts and their stored results
const fileName = (partStr) => `${partStr || 'whole'}.json`;
const resFile = (cfg, partStr) => path.join(RESULTS, cfg.id, fileName(partStr));
const parts = []; // {cfg, part, w, est, file, fp, rec, state: 'todo'|'big'|'running'|'done'}
const byCfg = new Map();
for (const cfg of chosen) {
  const ms = partsOf(cfg);
  checkCover(cfg, ms.filter(Boolean));
  const list = ms.map((m) => ({ cfg, part: m ? partArg(cfg.over.BUD.k, m) : null, w: m ? weight(cfg, m) : 1e12 }));
  for (const p of list) { p.est = p.w * costFactor(cfg); p.file = resFile(cfg, p.part); p.fp = fingerprint(cfg, p.part); }
  byCfg.set(cfg.id, { cfg, parts: list, est: list.reduce((s, p) => s + p.est, 0) });
  parts.push(...list);
}
// cheapest first: configurations by estimated cost, parts within a configuration by estimated size
const cfgOrder = [...byCfg.values()].sort((a, b) => a.est - b.est || a.cfg.id.localeCompare(b.cfg.id));
cfgOrder.forEach((c, i) => (c.rank = i));
parts.sort((a, b) => byCfg.get(a.cfg.id).rank - byCfg.get(b.cfg.id).rank || a.est - b.est || String(a.part).localeCompare(String(b.part)));

function readJSON(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } }
let stale = 0, reusedComplete = 0, reusedBounded = 0;
for (const p of parts) {
  const r = readJSON(p.file); // a file torn by a reset does not parse: the part simply runs again
  if (!r || r.config !== p.cfg.id || (r.part || null) !== p.part) { p.state = 'todo'; continue; }
  if (r.fingerprint !== p.fp) { stale++; p.state = 'todo'; continue; }
  p.rec = r; // kept for the attempt history; counted in the table only once the part is final
  if (r.status === 'complete') { p.state = 'done'; reusedComplete++; continue; }
  if (r.status === 'bounded') {
    if (r.mem_mb >= BIG && !RERUN_BOUNDED) { p.state = 'done'; reusedBounded++; } // final at this B: reported, not rerun
    else p.state = 'big'; // bounded below B (or a rerun was asked for): straight to the big queue
    continue;
  }
  p.state = r.mem_mb >= BIG ? 'big' : 'todo'; // a failed run is always run again, at the size it failed at
}

// ---------------------------------------------------------------- aggregation, table, summary files
const PROP_ORDER = ['NoStaleAccepted', 'AtMostOneCommit', 'Slots', 'RestartLimit', 'TwoCoordinatorsAct', 'SingleWatcher', 'FailedTaskStopped', 'OneSessionPerAttempt', 'ReadyNotDiscarded', 'NoFalseSuspicion', 'NoDeadlock', 'AlwaysCanResolve', 'NoBusyLoop', 'EventuallyResolves'];
const T0 = Date.now();
// child process -> {kind: 'proc'|'host', ch, p (the part it runs now; null for an idle host), size, big, rss, maxRss,
// started, startedAt, count (parts a host has run), ending}
const running = new Map();
const spawned = { processes_started: 0, part_processes: 0, host_processes: 0, parts_in_hosts: 0 };
const batchable = (p, big) => !big && p.est <= BATCH_EST;
function aggregate(c) {
  const a = { id: c.cfg.id, title: c.cfg.title, base: c.cfg.base || null, parts: c.parts.length, complete: 0, bounded: [], failed: [], pending: 0, running: [], states: 0, transitions: 0, cpu_seconds: 0, peak_mb: 0, max_rss_mb: 0, props: {} };
  for (const p of c.parts) {
    const r = p.state === 'done' ? p.rec : null;
    if (p.state === 'running') a.running.push(p.part || 'whole');
    if (!r) { a.pending++; continue; }
    a.states += r.states || 0; a.transitions += r.transitions || 0; a.cpu_seconds += r.seconds || 0;
    a.peak_mb = Math.max(a.peak_mb, r.peak_mb || 0); a.max_rss_mb = Math.max(a.max_rss_mb, r.max_rss_mb || 0);
    if (r.status === 'complete') a.complete++;
    else if (r.status === 'bounded') a.bounded.push({ part: p.part || 'whole', mem_mb: r.mem_mb, why: r.bounded_why });
    else a.failed.push({ part: p.part || 'whole', mem_mb: r.mem_mb, why: r.error || r.bounded_why });
    for (const [prop, v] of Object.entries(r.props || {})) { // as run-all.mjs absorb(): the shortest failing trace over the parts
      const cur = a.props[prop];
      if (v.holds === false) { if (!cur || cur.holds !== false || v.trace.length < cur.trace.length) a.props[prop] = { holds: false, steps: v.trace.length, part: p.part || 'whole', trace: v.trace }; }
      else if (v.holds === true) { if (!cur) a.props[prop] = { holds: true }; }
      else if (!cur || cur.holds === true) a.props[prop] = { holds: v.holds, part: p.part || 'whole' };
    }
  }
  a.cpu_seconds = Math.round(a.cpu_seconds * 10) / 10;
  a.status = a.complete === a.parts ? 'complete' : a.pending ? `INCOMPLETE ${a.parts - a.pending}/${a.parts} parts run` : a.failed.length ? `FAILED RUNS (${a.failed.length} parts)` : `BOUNDED (${a.bounded.length} parts)`;
  if (!a.pending && a.complete !== a.parts && a.failed.length && a.bounded.length) a.status = `BOUNDED (${a.bounded.length} parts) + FAILED RUNS (${a.failed.length} parts)`;
  // a property holds only when every part is complete; FAIL is final as soon as any part found a trace
  for (const prop of PROP_ORDER) { const v = a.props[prop]; if (v && v.holds === true && a.complete !== a.parts) a.props[prop] = { holds: a.pending ? 'pending' : 'not refuted (bounded)' }; }
  return a;
}
const cell = (v) => (!v ? '-' : v.holds === true ? 'ok' : v.holds === false ? 'FAIL' : v.holds === 'pending' ? '..' : '?');
const AB = PROP_ORDER.map((p) => p.replace(/[a-z]/g, '').slice(0, 4));
function tableText(rows) {
  const out = [];
  out.push(`${'config'.padEnd(26)} ${'parts'.padStart(5)} ${'done'.padStart(5)} ${'states'.padStart(13)} ${'transitions'.padStart(14)} ${'cpu-s'.padStart(8)} ${'peakMB'.padStart(6)}  status; failing properties (trace steps)`);
  for (const a of rows) {
    const fails = PROP_ORDER.filter((p) => a.props[p] && a.props[p].holds === false).map((p) => `${p}(${a.props[p].steps})`);
    out.push(`${a.id.padEnd(26)} ${String(a.parts).padStart(5)} ${String(a.parts - a.pending).padStart(5)} ${String(a.states).padStart(13)} ${String(a.transitions).padStart(14)} ${a.cpu_seconds.toFixed(0).padStart(8)} ${String(Math.max(a.peak_mb, a.max_rss_mb)).padStart(6)}  ${a.status}; fails: ${fails.join(' ') || 'none'}`);
  }
  out.push('');
  out.push(`${'config'.padEnd(26)} ${AB.map((x) => x.padEnd(4)).join(' ')}`);
  for (const a of rows) out.push(`${a.id.padEnd(26)} ${PROP_ORDER.map((p) => cell(a.props[p]).padEnd(4)).join(' ')}`);
  out.push(`ok = holds in every part, all parts complete; FAIL = some part found a trace; ? = not decided (bounded or not checked); .. = parts still to run`);
  out.push(`legend: ${PROP_ORDER.map((p, i) => `${AB[i]}=${p}`).join(', ')}`);
  return out.join('\n');
}
function writeAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  const fd = fs.openSync(tmp, 'w');
  try { fs.writeSync(fd, text); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, file);
}
let interrupted = false;
function summary(final = false) {
  const rows = cfgOrder.map(aggregate);
  const tot = { parts: parts.length, complete: 0, bounded: 0, failed: 0, pending: 0, running: [...running.values()].filter((r) => r.p).length, processes: running.size, states: 0, transitions: 0, cpu_seconds: 0 };
  for (const a of rows) { tot.complete += a.complete; tot.bounded += a.bounded.length; tot.failed += a.failed.length; tot.pending += a.pending; tot.states += a.states; tot.transitions += a.transitions; tot.cpu_seconds += a.cpu_seconds; }
  tot.cpu_seconds = Math.round(tot.cpu_seconds);
  const runner = { pid: process.pid, started_at: new Date(T0).toISOString(), updated_at: new Date().toISOString(), final, interrupted, wall_seconds: Math.round((Date.now() - T0) / 1000), workers: WORKERS, mem_mb: MEM, big_mem_mb: BIG, floor_mb: FLOOR, big_at: BIG_AT, configs: CONFIG_SET, free_mb_now: Math.round(os.freemem() / 1048576), reused_complete: reusedComplete, reused_bounded: reusedBounded, stale_results_rerun: stale, spawn_gap_ms: SPAWN_GAP_MS, batch_max_est: BATCH_EST, batch_parts: BATCH_PARTS, ...spawned };
  const running_parts = [...running.values()].filter((r) => r.p).map((r) => ({ config: r.p.cfg.id, part: r.p.part || 'whole', size_mb: r.size, big: r.big, in_host: r.kind === 'host', rss_mb: r.rss, seconds: Math.round((Date.now() - r.started) / 1000) }));
  writeAtomic(path.join(RESULTS, 'SUMMARY.json'), JSON.stringify({ runner, totals: tot, running: running_parts, order: cfgOrder.map((c) => c.cfg.id), configs: rows }, null, 1));
  const md = [];
  md.push(`# Model run summary${final ? '' : ' (in progress)'}`, '');
  md.push(`Updated ${runner.updated_at}; runner pid ${process.pid}, started ${runner.started_at}, ${runner.wall_seconds} s; ${WORKERS} workers of ${MEM} MB, big parts alone at ${BIG} MB, floor ${FLOOR} MB free.`, '');
  md.push(`Parts: ${tot.complete} complete, ${tot.bounded} BOUNDED, ${tot.failed} failed runs, ${tot.pending} still to run (${tot.running} running) of ${tot.parts}. ${tot.states} states, ${tot.transitions} transitions, ${tot.cpu_seconds} cpu-s.${final ? ` Exit ${exitCode(tot)}.` : ''}`, '');
  if (running_parts.length) md.push(`Running now: ${running_parts.map((r) => `${r.config} ${r.part} (${r.size_mb} MB${r.big ? ', big, alone' : ''}, ${r.seconds} s, rss ${r.rss_mb ?? '?'} MB)`).join('; ')}`, '');
  md.push('```', tableText(rows), '```', '');
  const lim = rows.filter((a) => a.bounded.length || a.failed.length);
  if (lim.length) {
    md.push('## Parts not complete', '');
    for (const a of lim) { for (const b of a.bounded) md.push(`- ${a.id} ${b.part}: BOUNDED at ${b.mem_mb} MB: ${b.why}`); for (const b of a.failed) md.push(`- ${a.id} ${b.part}: FAILED RUN at ${b.mem_mb} MB: ${b.why}`); }
    md.push('');
  }
  md.push('Per-part results: results/<config>/<part>.json (status, budget, states, transitions, failing properties with shortest traces, seconds, memory).');
  writeAtomic(path.join(RESULTS, 'SUMMARY.md'), md.join('\n') + '\n');
  return { rows, tot };
}
const exitCode = (tot) => (interrupted ? 3 : tot.complete === tot.parts ? 0 : 1);

// ---------------------------------------------------------------- plan only
if (PLAN_ONLY) {
  if (has('--plan-parts')) {
    process.stdout.write(JSON.stringify(parts.map((p) => ({ config: p.cfg.id, part: p.part, est: p.est, in_host: batchable(p, p.state === 'big'), state: p.state, mem_mb: p.state === 'big' ? BIG : MEM }))) + '\n');
    process.exit(0);
  }
  const counts = { todo: 0, big: 0, done: 0 };
  for (const p of parts) counts[p.state]++;
  process.stdout.write(`plan: ${chosen.length} configurations, ${parts.length} parts (${counts.done} already final, ${counts.big} waiting for the big size, ${counts.todo} to run; ${stale} stale results to rerun)\n`);
  for (const c of cfgOrder) process.stdout.write(`${String(c.rank + 1).padStart(3)}. ${c.cfg.id.padEnd(26)} ${String(c.parts.length).padStart(5)} parts  est ${c.est.toExponential(2)}  ${c.parts.filter((p) => p.state === 'done').length} final\n`);
  process.exit(0);
}

// ---------------------------------------------------------------- lock: one runner per results directory
const LOCK = path.join(RESULTS, '.run-resumable.lock');
fs.mkdirSync(RESULTS, { recursive: true });
function pidAlive(pid) { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } }
{
  const l = readJSON(LOCK);
  if (l && l.pid && l.pid !== process.pid && pidAlive(l.pid) && !has('--force-lock')) {
    const isNode = await new Promise((res) => (process.platform === 'win32' ? execFile('tasklist', ['/FO', 'CSV', '/NH', '/FI', `PID eq ${l.pid}`], (e, out) => res(!e && /node\.exe/i.test(out))) : res(true)));
    if (isNode) die(`another runner (pid ${l.pid}, started ${l.started_at}) holds ${LOCK}; stop it first, or pass --force-lock if that pid is not a runner`);
  }
  writeAtomic(LOCK, JSON.stringify({ pid: process.pid, started_at: new Date(T0).toISOString(), argv }));
  // temporary files left by a reset in the middle of a write (only this runner's own pattern)
  for (const c of cfgOrder) { const d = path.join(RESULTS, c.cfg.id); try { for (const f of fs.readdirSync(d)) if (/\.json\.tmp-\d+$/.test(f)) fs.rmSync(path.join(d, f), { force: true }); } catch { /* no directory yet */ } }
}

// ---------------------------------------------------------------- memory of running workers
// working set of our own children (tasklist on Windows, /proc elsewhere); null when unreadable
function sampleRss() {
  const pids = [...running.keys()].map((ch) => ch.pid).filter(Boolean);
  if (!pids.length) return Promise.resolve();
  const apply = (m) => { for (const [ch, r] of running) { const v = m.get(ch.pid); r.rss = v ?? null; if (v != null) r.maxRss = Math.max(r.maxRss || 0, v); } };
  if (process.platform !== 'win32') {
    const m = new Map();
    for (const pid of pids) { try { const s = fs.readFileSync(`/proc/${pid}/status`, 'utf8'); const x = /VmRSS:\s+(\d+)/.exec(s); if (x) m.set(pid, Math.round(+x[1] / 1024)); } catch { /* gone */ } }
    apply(m); return Promise.resolve();
  }
  return new Promise((res) => execFile('tasklist', ['/FO', 'CSV', '/NH', '/FI', 'IMAGENAME eq node.exe'], { windowsHide: true, timeout: 15000 }, (e, out) => {
    const m = new Map();
    if (!e) for (const line of out.split(/\r?\n/)) { const f = line.match(/"([^"]*)"/g); if (!f || f.length < 5) continue; const pid = +f[1].replace(/\D/g, ''); const kb = +f[4].replace(/\D/g, ''); if (pid) m.set(pid, Math.round(kb / 1024)); }
    apply(m); res();
  }));
}
// what the running workers may still grow into: their size less what they hold now (all of it if unknown)
const headroomOfRunning = () => [...running.values()].reduce((s, r) => s + Math.max(0, reserveOf(r.size) - (r.rss ?? 0)), 0);
let lastWaitLog = 0;
function admit(size) {
  const free = os.freemem() / 1048576;
  const reserve = headroomOfRunning();
  const ok = free - reserve - reserveOf(size) > FLOOR;
  if (!ok && Date.now() - lastWaitLog > 60000) {
    lastWaitLog = Date.now();
    process.stderr.write(`run-resumable: waiting for memory: free ${Math.round(free)} MB, running workers may still take ${Math.round(reserve)} MB, next part needs ${reserveOf(size)} MB (size ${size}), floor ${FLOOR} MB (${running.size} running)\n`);
  }
  return ok;
}

// ---------------------------------------------------------------- children
const WATCHDOG = 'data:text/javascript,' + encodeURIComponent(
  "import { Worker } from 'node:worker_threads';" +
  'const pp = Number(process.env.RUN_RESUMABLE_PARENT);' +
  "if (pp) { const w = new Worker(`const pp = ${pp}; setInterval(() => { try { process.kill(pp, 0); } catch (e) { if (e.code === 'ESRCH') process.kill(process.pid, 'SIGKILL'); } }, 3000);`, { eval: true }); w.unref(); }");

function classify(r, code, sig, errTail, size) {
  // -> {status, why}; 'retry' means: bounded or died at a size below BIG
  if (!r) {
    const oom = /heap out of memory|Reached heap limit|Allocation failed|Array buffer allocation failed|ERR_MEMORY_ALLOCATION_FAILED|Invalid typed array length|RangeError: Array buffer/i.test(errTail);
    return { status: oom ? 'bounded' : 'failed', why: `${oom ? 'memory: ' : ''}process ended without a result (exit ${code}${sig ? ' ' + sig : ''}): ${errTail.split('\n').filter(Boolean).slice(-3).join(' | ')}` };
  }
  // check.mjs stores record offsets in a Uint32Array and edge starts in an Int32Array: beyond these the
  // state store is silently wrong, so such a result is never accepted
  if ((r.avg_record + 0.5) * r.states >= 2 ** 32 || r.transitions >= 2 ** 31 - 1)
    return { status: 'failed', why: `unsound: ${r.states} states x ${r.avg_record} bytes per record (or ${r.transitions} transitions) exceeds check.mjs's 32-bit offsets` };
  if (!r.complete) return { status: 'bounded', why: r.bounded_why || 'bounded' };
  const undecided = Object.entries(r.props || {}).filter(([, v]) => v.holds !== true && v.holds !== false);
  if (undecided.length) return { status: 'bounded', why: `memory: BFS complete, but ${undecided.map(([p]) => p).join(', ')} not decided: ${String(undecided[0][1].holds)}` };
  return { status: 'complete', why: null };
}

const CHECK_URL = pathToFileURL(CHECK).href;
const checkArgs = (p, size) => [p.cfg.id, '--mem-mb', String(size - RUNTIME_MB), ...(p.part ? ['--bud', p.part] : [])];
const childEnv = () => ({ ...process.env, RUN_RESUMABLE_PARENT: String(process.pid) });
let lastSpawn = 0;
const gapLeft = () => Math.max(0, lastSpawn + SPAWN_GAP_MS - Date.now());

// one part in its own check.mjs process (every big part, and normal parts above --batch-max-est)
function startPart(p, big) {
  const size = big ? BIG : MEM;
  const args = [`--max-old-space-size=${size}`, '--import', WATCHDOG];
  if (CONFIG_SET === 'full') args.push('--import', FULL_URL);
  args.push(CHECK, ...checkArgs(p, size));
  let ch;
  lastSpawn = Date.now();
  try { ch = spawn(process.execPath, args, { cwd: HERE, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, env: childEnv() }); }
  catch (e) { process.stderr.write(`run-resumable: could not start ${p.cfg.id} ${p.part}: ${e.code || e.message}\n`); return false; }
  spawned.processes_started++; spawned.part_processes++;
  const info = { kind: 'proc', ch, p, size, big, rss: null, maxRss: 0, started: Date.now(), startedAt: new Date().toISOString() };
  running.set(ch, info); p.state = 'running';
  try { os.setPriority(ch.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* not allowed: run at normal priority */ }
  let out = '', err = '';
  ch.stdout.on('data', (d) => (out += d));
  ch.stderr.on('data', (d) => { err += d; if (err.length > 20000) err = err.slice(-10000); });
  ch.on('error', (e) => { err += `\nspawn error: ${e.code || e.message}`; });
  ch.on('close', (code, sig) => {
    running.delete(ch);
    if (interrupted) return;
    settle(info, p, out, err, code, sig);
    schedule();
  });
  return true;
}

// A host: one process that runs small parts one after another, each in a fresh worker thread with its own
// heap limit (resourceLimits = --mem-mb, as --max-old-space-size for a process) and check.mjs's own
// --mem-mb budget. The thread sets process.argv as check.mjs expects, imports configs-full.mjs (full) and
// check.mjs, and its stdout/stderr come back to the host, which sends them to the runner over IPC. A thread
// that dies (heap limit, allocation failure, exit code) is reported like a process that died. The host
// ends when the runner disconnects or dies (IPC 'disconnect', and the watchdog).
const THREAD_CODE = [
  "const { workerData } = require('node:worker_threads');",
  'process.argv = [process.execPath, workerData.check, ...workerData.args];',
  '(async () => { for (const u of workerData.imports) await import(u); })().catch((e) => { process.stderr.write(String((e && e.stack) || e) + "\\n"); process.exitCode = 70; });',
].join('\n');
const HOST_CODE = [
  "const { Worker } = require('node:worker_threads');",
  `const THREAD_CODE = ${JSON.stringify(THREAD_CODE)};`,
  'let busy = false;',
  "process.on('disconnect', () => process.exit(0));",
  "process.on('message', (m) => {",
  "  if (m && m.cmd === 'end' && !busy) process.exit(0);",
  "  if (!m || m.cmd !== 'run' || busy) return;",
  '  busy = true;',
  "  let out = '', err = '', code = null, left = 3, sent = false;",
  "  const send = () => { if (sent) return; sent = true; busy = false; try { process.send({ cmd: 'done', id: m.id, out, err, code }); } catch { process.exit(0); } };",
  '  const step = () => { if (--left === 0) send(); };',
  '  let w;',
  "  try { w = new Worker(THREAD_CODE, { eval: true, workerData: m.data, execArgv: [], stdout: true, stderr: true, resourceLimits: { maxOldGenerationSizeMb: m.heap } }); }",
  "  catch (e) { err = 'thread start failed: ' + ((e && e.message) || e); code = -1; send(); return; }",
  "  w.stdout.on('data', (d) => { out += d; }); w.stdout.on('end', step);",
  "  w.stderr.on('data', (d) => { err += d; if (err.length > 20000) err = err.slice(-10000); }); w.stderr.on('end', step);",
  "  w.on('error', (e) => { err += '\\nthread error: ' + ((e && (e.code ? e.code + ' ' : '') + (e.message || '')) || e); });",
  "  w.on('exit', (c) => { code = c; step(); setTimeout(send, 5000).unref(); });",
  '});',
].join('\n');

function startHost() {
  let ch;
  lastSpawn = Date.now();
  try { ch = spawn(process.execPath, ['--max-old-space-size=256', '--import', WATCHDOG, '-e', HOST_CODE], { cwd: HERE, stdio: ['ignore', 'pipe', 'pipe', 'ipc'], windowsHide: true, env: childEnv() }); }
  catch (e) { process.stderr.write(`run-resumable: could not start a host: ${e.code || e.message}\n`); return null; }
  spawned.processes_started++; spawned.host_processes++;
  const info = { kind: 'host', ch, p: null, size: MEM, big: false, rss: null, maxRss: 0, started: Date.now(), startedAt: null, count: 0, seq: 0, ending: false, err: '' };
  running.set(ch, info);
  try { os.setPriority(ch.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* not allowed: run at normal priority */ }
  ch.stdout.on('data', () => {});
  ch.stderr.on('data', (d) => { info.err += d; if (info.err.length > 20000) info.err = info.err.slice(-10000); });
  ch.on('error', (e) => { info.err += `\nspawn error: ${e.code || e.message}`; });
  ch.on('message', (m) => {
    if (!m || m.cmd !== 'done' || !info.p || m.id !== info.seq) return;
    const p = info.p; info.p = null; info.count++;
    if (interrupted) return;
    settle(info, p, String(m.out || ''), String(m.err || ''), m.code, null);
    if (info.count >= BATCH_PARTS) endHost(info);
    schedule();
  });
  // 'close' does not always follow 'exit' for a child with an IPC channel (seen on Node 24/Windows after a
  // disconnect), so the host is gone at whichever comes first; after 'exit' its stderr gets 300 ms to drain
  let gone = false;
  const onGone = (code, sig) => {
    if (gone) return; gone = true;
    running.delete(ch);
    if (interrupted) return;
    if (info.p) { const p = info.p; info.p = null; settle(info, p, '', `${info.err}\nhost process ended during the part (exit ${code}${sig ? ' ' + sig : ''})`, code, sig); }
    schedule();
  };
  ch.on('exit', (code, sig) => { info.exited = true; setTimeout(() => onGone(code, sig), 300); });
  ch.on('close', onGone);
  return info;
}
function dispatch(info, p) {
  const data = { check: CHECK, args: checkArgs(p, MEM), imports: [...(CONFIG_SET === 'full' ? [FULL_URL] : []), CHECK_URL] };
  let ok = false;
  if (!info.exited && info.ch.connected) { try { ok = info.ch.send({ cmd: 'run', id: info.seq + 1, heap: MEM, data }) !== false || info.ch.connected; } catch { ok = false; } }
  if (!ok) { endHost(info); return false; } // the host is gone or deaf: the part stays to do and waits for another
  info.seq++; info.p = p; p.state = 'running';
  info.started = Date.now(); info.startedAt = new Date().toISOString(); info.maxRss = 0;
  spawned.parts_in_hosts++;
  return true;
}
function endHost(info) {
  if (info.kind !== 'host' || info.ending) return;
  info.ending = true;
  // the host ends itself on this message (an idle host has no part to lose); kill only when it cannot hear
  try { if (info.ch.connected) info.ch.send({ cmd: 'end' }); else info.ch.kill(); } catch { try { info.ch.kill(); } catch { /* gone */ } }
}

// a finished part (process closed, or a host's thread ended): classify, write its result file atomically
function settle(info, p, out, err, code, sig) {
  const size = info.size, big = info.big;
  {
    let r = null; try { r = JSON.parse(out.trim().split('\n').pop()); } catch { r = null; }
    // a result that names another configuration or part is not this part's result
    if (r && (r.id !== p.cfg.id || (r.part || null) !== p.part)) { err += `\nthe result names ${r.id} ${r.part}, not ${p.cfg.id} ${p.part}`; r = null; }
    const startedAt = info.startedAt;
    const c = classify(r, code, sig, err, size);
    const rec = {
      schema: 1, config: p.cfg.id, part: p.part, title: p.cfg.title, base: p.cfg.base || null,
      status: c.status, mem_mb: size, big, budget: partBudget(p.cfg, p.part).BUD,
      states: r ? r.states : 0, transitions: r ? r.transitions : 0, bfs_complete: r ? r.complete : false, bounded_why: c.status === 'bounded' ? c.why : null, error: c.status === 'failed' ? c.why : null,
      failed_properties: r ? Object.entries(r.props).filter(([, v]) => v.holds === false).map(([prop, v]) => ({ property: prop, steps: v.trace.length, trace: v.trace })) : [],
      props: r ? r.props : {},
      seconds: r ? r.seconds : Math.round((Date.now() - info.started) / 100) / 10, wall_seconds: Math.round((Date.now() - info.started) / 100) / 10,
      peak_mb: r ? r.peak_mb : null, max_rss_mb: info.maxRss || null, heap_limit_mb: size, check_mem_mb: size - RUNTIME_MB,
      bytes_per_state: r ? r.bytes_per_state : null, avg_record: r ? r.avg_record : null,
      attempts: [...(p.rec && p.rec.fingerprint === p.fp ? p.rec.attempts || [] : []), { mem_mb: size, status: c.status, why: c.why, states: r ? r.states : 0, seconds: r ? r.seconds : null, finished_at: new Date().toISOString() }],
      started_at: startedAt, finished_at: new Date().toISOString(), fingerprint: p.fp, node: process.version, host: os.hostname(),
      stderr_tail: c.status === 'complete' ? undefined : err.split('\n').filter(Boolean).slice(-6),
    };
    try { writeAtomic(p.file, JSON.stringify(rec, null, 1)); } catch (e) { process.stderr.write(`run-resumable: could not write ${p.file}: ${e.code || e.message}\n`); }
    p.rec = rec;
    p.state = c.status !== 'complete' && !big && BIG > size ? 'big' : 'done';
    const t = ((Date.now() - T0) / 1000).toFixed(0).padStart(6);
    process.stdout.write(`[${t} s] ${p.cfg.id} ${p.part || 'whole'}: ${c.status.toUpperCase()} at ${size} MB, ${rec.states} states, ${rec.seconds} s, peak ${rec.peak_mb ?? '?'} MB, rss ${rec.max_rss_mb ?? '?'} MB${rec.failed_properties.length ? `; fails ${rec.failed_properties.map((f) => `${f.property}(${f.steps})`).join(' ')}` : ''}${p.state === 'big' ? `; queued again for ${BIG} MB alone` : c.status !== 'complete' ? `; ${c.why}` : ''}\n`);
    const agg = byCfg.get(p.cfg.id);
    try {
      const { rows } = summary(false);
      if (agg.parts.every((q) => q.state === 'done')) { const a = rows.find((x) => x.id === p.cfg.id); process.stdout.write(`[${t} s] == ${a.id}: ${a.status}; ${a.states} states, ${a.cpu_seconds.toFixed(0)} cpu-s\n`); }
    } catch (e) { process.stderr.write(`run-resumable: could not write the summary: ${e.code || e.message}\n`); }
  }
}

// ---------------------------------------------------------------- the pool
// pollTimer: every --poll-s, sample the workers' memory and look again (admission waits on this);
// gapTimer: when only --spawn-gap-ms holds a start back, look again as soon as the gap has passed
let pollTimer = null, gapTimer = null, finished = false;
function schedule() {
  if (finished || interrupted) return;
  const todo = parts.filter((p) => p.state === 'todo');
  const bigQ = parts.filter((p) => p.state === 'big');
  const infos = [...running.values()];
  const bigRunning = infos.some((r) => r.big);
  if (!todo.length && !bigQ.length && !infos.some((r) => r.p)) { for (const r of infos) endHost(r); return finish(); }
  // rank (default): a big part runs before any normal part of a costlier configuration starts, so each
  // configuration is finished, big parts included, in the cheapest-first order
  const rankOf = (p) => byCfg.get(p.cfg.id).rank;
  const bigNow = bigQ.length && (BIG_AT === 'asap' || !todo.length || (BIG_AT === 'rank' && rankOf(todo[0]) > rankOf(bigQ[0])));
  let started = 0, gapBlocked = false;
  const idleHost = () => [...running.values()].find((r) => r.kind === 'host' && !r.p && !r.ending && !r.exited);
  if (bigNow) {
    for (const r of infos) if (r.kind === 'host' && !r.p) endHost(r); // alone: nothing else runs beside it, idle hosts included
    if (!running.size) { if (gapLeft() > 0) gapBlocked = true; else if (admit(BIG) && startPart(bigQ[0], true)) started++; }
  } else if (!bigRunning) {
    for (const p of todo) { // strictly in order: a part that cannot start holds back the parts behind it
      if (batchable(p, false)) {
        const h = idleHost(); // an admitted host is already counted as a worker of --mem-mb
        if (h) { if (!dispatch(h, p)) break; started++; continue; }
        if (running.size >= WORKERS) break;
        if (gapLeft() > 0) { gapBlocked = true; break; }
        if (!admit(MEM)) break;
        const nh = startHost(); if (!nh || !dispatch(nh, p)) break;
        started++; continue;
      }
      if (running.size >= WORKERS) break;
      if (gapLeft() > 0) { gapBlocked = true; break; }
      if (!admit(MEM) || !startPart(p, false)) break;
      started++;
    }
    // a host left idle here has no part it may take now: end it so its slot and memory go to the next part
    for (const r of [...running.values()]) if (r.kind === 'host' && !r.p) endHost(r);
  }
  if (started) { try { summary(false); } catch { /* written again after the next part */ } }
  if (gapBlocked && !gapTimer) gapTimer = setTimeout(() => { gapTimer = null; schedule(); }, gapLeft() + 5);
  if (!pollTimer) pollTimer = setTimeout(() => sampleRss().then(() => { pollTimer = null; schedule(); }), POLL_MS);
}
function finish() {
  if (finished) return; finished = true; clearTimeout(pollTimer); clearTimeout(gapTimer);
  for (const r of running.values()) endHost(r);
  const { rows, tot } = summary(true);
  process.stdout.write(`\n${tableText(rows)}\n\nTotal: ${tot.states} states, ${tot.transitions} transitions in ${tot.parts} parts of ${rows.length} configurations: ${tot.complete} complete, ${tot.bounded} BOUNDED, ${tot.failed} failed runs; ${tot.cpu_seconds} cpu-s; wall ${((Date.now() - T0) / 1000).toFixed(0)} s (${reusedComplete} parts reused from earlier runs)\n`);
  for (const a of rows) { for (const b of a.bounded) process.stdout.write(`BOUNDED ${a.id} ${b.part} at ${b.mem_mb} MB: ${b.why}\n`); for (const b of a.failed) process.stdout.write(`FAILED RUN ${a.id} ${b.part} at ${b.mem_mb} MB: ${b.why}\n`); }
  try { fs.rmSync(LOCK, { force: true }); } catch { /* ignore */ }
  process.exitCode = exitCode(tot);
}
function stopAll(sig) {
  if (interrupted) return; interrupted = true; clearTimeout(pollTimer); clearTimeout(gapTimer);
  process.stderr.write(`run-resumable: ${sig}: stopping ${running.size} worker processes (their running parts have no result file and run again next time)\n`);
  for (const ch of running.keys()) { try { ch.kill('SIGKILL'); } catch { /* gone */ } }
  try { summary(false); } catch { /* ignore */ }
  try { fs.rmSync(LOCK, { force: true }); } catch { /* ignore */ }
  process.exit(3);
}
for (const s of ['SIGINT', 'SIGTERM', 'SIGBREAK', 'SIGHUP']) { try { process.on(s, () => stopAll(s)); } catch { /* not on this platform */ } }
process.on('exit', () => { for (const ch of running.keys()) { try { ch.kill('SIGKILL'); } catch { /* gone */ } } });

{
  const counts = { todo: 0, big: 0, done: 0 };
  for (const p of parts) counts[p.state]++;
  process.stderr.write(`run-resumable: ${chosen.length} configurations, ${parts.length} parts: ${counts.done} final from earlier runs (${reusedComplete} complete, ${reusedBounded} bounded at >= ${BIG} MB), ${counts.big} for ${BIG} MB alone, ${counts.todo} to run${stale ? `, ${stale} stale results rerun` : ''}; ${WORKERS} workers of ${MEM} MB, floor ${FLOOR} MB, ${SPAWN_GAP_MS} ms between process starts, ${parts.filter((p) => p.state === 'todo' && batchable(p, false)).length} parts in hosts (estimate <= ${BATCH_EST}, ${BATCH_PARTS} per host), free now ${Math.round(os.freemem() / 1048576)} MB of ${Math.round(TOTAL_MB)} MB; results in ${RESULTS}\n`);
}
summary(false);
schedule();
