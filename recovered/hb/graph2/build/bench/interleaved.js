'use strict';
// Interleaved engine bench for a busy machine (protocol addendum 5, section C; addendum 4 items 16, 18,
// 19, 20). Runs inside ONE graphtest:1 container (bench/run_interleaved.sh starts it).
//   node bench/interleaved.js            -> <BENCH_OUT>/units/p<pass>-<graph>.json, calibration.json,
//                                           blocks.jsonl (every block attempt with its load), progress.json
//
// Design
// - The three engines (SQLite, LadybugDB, DuckDB+DuckPGQ) alternate in short BLOCKS over the same seeds.
//   A round = one seed chunk of one query class; inside a round each engine runs its block in turn, in an
//   order that cycles through all six permutations of the three engines (so every engine is first,
//   second and third equally often, after each other engine equally often). Only one engine works at any
//   moment: the driver awaits the active worker; idle workers wait on their IPC channel.
// - Warm measures: one persistent worker process per engine (opened per pass and graph), thread setting
//   switched at run time between blocks (PRAGMA threads / CALL threads / SET threads, read back each
//   block). A LadybugDB store opened read-write admits one process, so one worker per engine is the
//   only form that is the same for all three.
// - Cold measures: a fresh process per sample (open + first call), also in alternating blocks.
// - Store builds and the one-file update: also alternating blocks, fresh process per build.
// - Host load: a sampler on the Windows host writes <OUT>/host_load.jsonl (bench/hostload_live.ps1:
//   host CPU outside the Docker VM); this driver samples the VM itself every second (/proc/stat minus
//   this container's cgroup = other work inside the VM). Each block's load = time-weighted mean over its
//   window. "Other work" = host outside the VM + VM outside this container. A block whose other work
//   exceeded BENCH_LOAD_FRAC (0.5) of the host's logical CPUs is repeated, up to BENCH_MAX_REPEATS (3)
//   times; the last attempt is then kept and flagged. Every attempt is logged in blocks.jsonl.
// - Restart: a unit (pass, graph) is written to units/ when complete. On restart, complete units are
//   skipped and an incomplete unit is redone from its start (its stores lived in this container and are
//   gone). The thread calibration is kept in calibration.json. run_config.json pins the settings; a
//   restart with different settings is refused.
// Inputs: plan.json (bench/prep.js: TUNE seeds and the frozen-commit graph only). Nothing held-out.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { fork } = require('child_process');
const L = require('./lib');

const OUT = L.OUT;
const ENG = ['relational', 'ladybug', 'duckpgq'];
const PERMS = [[0, 1, 2], [1, 2, 0], [2, 0, 1], [0, 2, 1], [2, 1, 0], [1, 0, 2]];
const plan = L.readPlan();
const env = (k, d) => (process.env[k] != null && process.env[k] !== '' ? Number(process.env[k]) : d);
const PASSES = env('BENCH_PASSES', 5);
const CFG = {
  plan_hash: plan.plan_hash,
  seeds: Math.min(env('BENCH_SEEDS', plan.n_seeds), plan.n_seeds),
  passes: PASSES,
  chunk: env('BENCH_CHUNK', 20),
  reps: env('BENCH_REPS', 1),
  cold_n: env('BENCH_COLD_N', 20),
  cold_chunk: env('BENCH_COLD_CHUNK', 5),
  update_n: env('BENCH_UPDATE_N', 50),
  update_chunk: env('BENCH_UPDATE_CHUNK', 10),
  update_check: env('BENCH_UPDATE_CHECK', 10),
  calib: Math.min(env('BENCH_CALIB', plan.n_calib), plan.n_calib),
  calib_reps: env('BENCH_CALIB_REPS', 3),
  noop_n: env('BENCH_NOOP_N', 50),
  builds_per_pass: env('BENCH_BUILDS_PER_PASS', Math.max(1, Math.ceil(3 / PASSES))),
  max_repeats: env('BENCH_MAX_REPEATS', 3),
  load_frac: env('BENCH_LOAD_FRAC', 0.5),
  host_wait_s: env('BENCH_HOST_WAIT_S', 20),
  best_within: 0.03,
};
const HOST_FILE = process.env.BENCH_HOST_TIMELINE || path.join(OUT, 'host_load.jsonl');
const CLOCK_FILE = path.join(OUT, 'clock.jsonl');
const STORE_ROOT = L.STORE_ROOT;
const SESSION = new Date().toISOString();
const log = (s) => process.stderr.write(`[ibench ${new Date().toISOString().slice(11, 19)}] ${s}\n`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const writeJson = (f, x) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f + '.tmp', JSON.stringify(x)); fs.renameSync(f + '.tmp', f); };
const appendLine = (f, x) => fs.appendFileSync(f, JSON.stringify(x) + '\n');

// ---------------------------------------------------------------- load: VM sampler (this container) ----
const VM = { samples: [], prev: null, timer: null };
function readVm() {
  const f = fs.readFileSync('/proc/stat', 'utf8').split('\n')[0].trim().split(/\s+/).slice(1).map(Number);
  // user nice system idle iowait irq softirq steal guest guest_nice (USER_HZ = 100 per second)
  const busy = f[0] + f[1] + f[2] + f[5] + f[6]; const steal = f[7] || 0;
  let own = null; try { own = Number((fs.readFileSync('/sys/fs/cgroup/cpu.stat', 'utf8').match(/usage_usec (\d+)/) || [])[1]); } catch (e) { /* no cgroup v2 */ }
  return { t: Date.now(), busy, steal, own };
}
function vmTick() {
  try {
    const x = readVm(); const p = VM.prev; VM.prev = x;
    if (!p || x.t <= p.t) return;
    const dt = (x.t - p.t) / 1000;
    const busy = (x.busy - p.busy) / 100 / dt; const own = x.own == null || p.own == null ? null : (x.own - p.own) / 1e6 / dt;
    VM.samples.push({ t0: p.t, t1: x.t, busy_cpus: busy, steal_cpus: (x.steal - p.steal) / 100 / dt, own_cpus: own, other_cpus: own == null ? null : Math.max(0, busy - own) });
    const cut = Date.now() - 3 * 3600e3; while (VM.samples.length && VM.samples[0].t1 < cut) VM.samples.shift();
  } catch (e) { /* not linux */ }
}
// ---------------------------------------------------------------- load: host timeline (Windows side) ----
const HOST = { off: 0, rest: '', samples: [], clock: 0, clockInfo: null };
function readHost() {
  try {
    const st = fs.statSync(HOST_FILE);
    if (st.size > HOST.off) {
      const fd = fs.openSync(HOST_FILE, 'r'); const b = Buffer.alloc(st.size - HOST.off); fs.readSync(fd, b, 0, b.length, HOST.off); fs.closeSync(fd);
      HOST.off = st.size;
      const lines = (HOST.rest + b.toString('utf8')).split('\n'); HOST.rest = lines.pop();
      for (let l of lines) {
        l = l.replace(/^﻿/, '').trim(); if (!l) continue;
        try { const o = JSON.parse(l); HOST.samples.push({ t0: Date.parse(o.t0), t1: Date.parse(o.t1), other_cpus: o.other_cpus, vm_cpus: o.vm_cpus, total_cpus: o.total_cpus, ncpu: o.ncpu, top: o.top || null }); } catch (e) { /* partial line */ }
      }
    }
  } catch (e) { /* no timeline yet */ }
  try { // clock offset host - container (bench/run_interleaved.sh writes it every few minutes)
    const ls = fs.readFileSync(CLOCK_FILE, 'utf8').trim().split('\n');
    for (let i = ls.length - 1; i >= 0; i--) { try { const o = JSON.parse(ls[i]); HOST.clock = (o.host_before_ms + o.host_after_ms) / 2 - o.ctr_ms; HOST.clockInfo = o; break; } catch (e) { /* skip */ } }
  } catch (e) { /* none */ }
}
function wavg(samples, a, b, f) {
  if (b - a < 1) b = a + 1;
  let w = 0; let s = 0; let n = 0; let mx = null;
  for (const x of samples) {
    if (x.t1 <= a || x.t0 >= b || x[f] == null) continue;
    const o = Math.min(b, x.t1) - Math.max(a, x.t0); if (o <= 0) continue;
    w += o; s += o * x[f]; n++; mx = mx == null ? x[f] : Math.max(mx, x[f]);
  }
  return w > 0 ? { mean: s / w, max: mx, n } : null;
}
function covered(t1) {
  const h = HOST.samples.length ? HOST.samples[HOST.samples.length - 1].t1 >= t1 + HOST.clock : false;
  const v = VM.samples.length ? VM.samples[VM.samples.length - 1].t1 >= t1 : false;
  return h && v;
}
function judge(t0, t1) {
  const a = t0 + HOST.clock; const b = t1 + HOST.clock;
  const ho = wavg(HOST.samples, a, b, 'other_cpus'); const hv = wavg(HOST.samples, a, b, 'vm_cpus'); const ht = wavg(HOST.samples, a, b, 'total_cpus');
  const vo = wavg(VM.samples, t0, t1, 'other_cpus'); const vb = wavg(VM.samples, t0, t1, 'busy_cpus'); const vs = wavg(VM.samples, t0, t1, 'steal_cpus'); const vown = wavg(VM.samples, t0, t1, 'own_cpus');
  const ncpu = (HOST.samples.length && HOST.samples[HOST.samples.length - 1].ncpu) || env('BENCH_HOST_NCPU', 24);
  const other = (ho ? ho.mean : 0) + (vo ? vo.mean : 0);
  const r = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
  return {
    other_cpus: r(other), limit_cpus: ncpu * CFG.load_frac, flagged: other > ncpu * CFG.load_frac,
    host_other_cpus: r(ho && ho.mean), host_other_max_cpus: r(ho && ho.max), host_vm_cpus: r(hv && hv.mean), host_total_cpus: r(ht && ht.mean), host_samples: ho ? ho.n : 0,
    vm_other_cpus: r(vo && vo.mean), vm_busy_cpus: r(vb && vb.mean), vm_steal_cpus: r(vs && vs.mean), own_cpus: r(vown && vown.mean), vm_samples: vo ? vo.n : 0,
    host_timeline: ho ? 'ok' : 'missing (VM side only)', clock_offset_ms: Math.round(HOST.clock),
  };
}

// ---------------------------------------------------------------- workers ----
function spawnWorker(tag) {
  const ch = fork(path.join(__dirname, 'iworker.js'), [], { serialization: 'advanced', stdio: ['ignore', 'inherit', 'inherit', 'ipc'], execArgv: ['--expose-gc'] });
  let seq = 0; const wait = new Map();
  ch.on('message', (m) => { const w = wait.get(m.id); if (!w) return; wait.delete(m.id); if (m.ok) w.res(m.r); else w.rej(new Error(tag + ': ' + m.error)); });
  ch.on('exit', (code) => { for (const w of wait.values()) w.rej(new Error(tag + ' worker exited with ' + code)); wait.clear(); });
  const call = (op, args, oneshot = false) => new Promise((res, rej) => { const id = ++seq; wait.set(id, { res, rej }); ch.send({ id, op, args, oneshot }); });
  const exited = new Promise((r) => ch.once('exit', r));
  return { ch, call, exited, async kill() { if (ch.exitCode == null && ch.signalCode == null) { ch.kill(); await exited; } } };
}
async function oneshot(tag, op, args) {
  const w = spawnWorker(tag); const t = L.now();
  try { const r = await w.call(op, args, true); await w.exited; r.spawn_to_exit_ms = L.r3(L.now() - t); return r; } finally { await w.kill(); }
}

// ---------------------------------------------------------------- blocks, judgement, repeats ----
function blockRunner(unitId, sink) {
  const pending = [];
  let rounds = 0;
  const R = {
    perm() { return PERMS[(rounds++) % 6]; },
    async run(spec, exec) {
      const res = await exec(spec);
      try { fs.writeFileSync(path.join(OUT, '.heartbeat'), new Date().toISOString()); } catch (e) { /* ignore */ }
      pending.push({ spec, exec, attempt: 0, res, loads: [] });
    },
    async settle(wait) {
      const start = Date.now();
      for (;;) {
        readHost();
        for (const p of [...pending]) {
          const late = Date.now() - p.res.t1 > CFG.host_wait_s * 1000;
          if (!covered(p.res.t1) && !late) continue;
          const load = judge(p.res.t0, p.res.t1);
          p.loads.push(load);
          const repeat = load.flagged && p.attempt < CFG.max_repeats;
          appendLine(path.join(OUT, 'blocks.jsonl'), { session: SESSION, unit: unitId, key: p.spec.key, type: p.spec.type, engine: p.spec.engine || null, cls: p.spec.cls || null, T: p.spec.T || null, attempt: p.attempt, t0: p.res.t0, t1: p.res.t1, wall_s: (p.res.t1 - p.res.t0) / 1000, load, action: repeat ? 'repeat' : (load.flagged ? 'kept_flagged' : 'kept') });
          if (repeat) {
            log(`${unitId} ${p.spec.key}: other work ${load.other_cpus} CPUs > ${load.limit_cpus}; repeat ${p.attempt + 1}`);
            p.attempt++; p.res = await p.exec(p.spec);
          } else {
            pending.splice(pending.indexOf(p), 1);
            sink({ key: p.spec.key, spec: Object.fromEntries(Object.entries(p.spec).filter(([k]) => k !== 'exec')), attempts: p.attempt + 1, flagged: load.flagged, load, loads: p.loads, res: p.res });
          }
        }
        if (!wait || !pending.length) return;
        if (Date.now() - start > 30 * 60e3) throw new Error('settle waited 30 minutes');
        await sleep(300);
      }
    },
  };
  return R;
}

// ---------------------------------------------------------------- helpers ----
const classesFor = (graph) => plan.classes.filter((c) => c.graphs.includes(graph));
const enginesOf = (cls) => ENG.filter((e) => !cls.engines || cls.engines.includes(e));
function chunks(n, size) { const o = []; for (let a = 0; a < n; a += size) o.push([a, Math.min(n, a + size)]); return o; }
function itemCount(graph, cls, calib) { return cls.kind === 'tq' ? plan.tq.length : calib ? Math.min(CFG.calib, plan.graphs[graph].calib.length) : CFG.seeds; }
function rmStores(pattern) { for (const e of ENG) { const d = path.join(STORE_ROOT, e); if (!fs.existsSync(d)) continue; for (const g of fs.readdirSync(d)) for (const x of fs.readdirSync(path.join(d, g))) if (pattern.test(g + '/' + x)) fs.rmSync(path.join(d, g, x), { recursive: true, force: true }); } }
function sameFp(a, b) {
  const diff = [];
  const walk = (x, y, p) => {
    if (typeof x === 'number' && typeof y === 'number') { if (!(x === y || Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x), Math.abs(y)))) diff.push(p + ': ' + x + ' vs ' + y); return; }
    if (x && y && typeof x === 'object' && typeof y === 'object') { for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) walk(x[k], y[k], p + '.' + k); return; }
    if (x !== y) diff.push(p + ': ' + JSON.stringify(x) + ' vs ' + JSON.stringify(y));
  };
  walk(a, b, '');
  return diff;
}
// bench/update.js KNOWN: LadybugDB page_rank counts deleted node slots; no timed class reads that column
const KNOWN_FP = { ladybug: new Set(['.N.pr']) };

let buildSeq = 0;
function makeExec(ctx) {
  return async (spec) => {
    if (spec.type === 'build') {
      const root = path.join(STORE_ROOT, spec.engine, ctx.graph, `${ctx.tag}b${spec.b}n${++buildSeq}`);
      const r = await oneshot(spec.engine + ' build', 'build', { engine: spec.engine, graph: ctx.graph, root });
      r.root = root; return r;
    }
    if (spec.type === 'warm') {
      const w = ctx.workers[spec.engine];
      return w.call('block', { cls: spec.cls, T: spec.T, from: spec.from, to: spec.to, n: spec.n, calib: !!spec.calib, reps: spec.reps, uncached: !!spec.uncached, instr: !!spec.instr, noopN: CFG.noop_n });
    }
    if (spec.type === 'cold') {
      const t0 = Date.now(); const rows = [];
      for (let i = spec.from; i < spec.to; i++) {
        const st = ctx.stores[spec.engine];
        rows.push(await oneshot(spec.engine + ' cold', 'cold', { engine: spec.engine, graph: ctx.graph, cls: spec.cls, store: st.store, root: st.root, threads: spec.T, index: i }));
      }
      return { t0, t1: Date.now(), rows };
    }
    if (spec.type === 'ipc') return oneshot('ladybug ipc', 'ipc', { graph: ctx.graph, cls: spec.cls, root: ctx.stores.ladybug.root, n: CFG.seeds });
    if (spec.type === 'update') return ctx.workers[spec.engine].call('uchunk', { files: spec.files });
    throw new Error('unknown block type ' + spec.type);
  };
}

async function buildPhase(ctx, R, nBuilds) {
  for (let b = 0; b < nBuilds; b++) {
    for (const ei of R.perm()) { const e = ENG[ei]; await R.run({ key: `build|${e}|b${b}`, type: 'build', engine: e, b }, ctx.exec); log(`${ctx.unit} build ${e} b${b}`); }
    await R.settle(false);
  }
  await R.settle(true);
  // the store the queries use: the kept build of the last build round
  for (const e of ENG) {
    const k = ctx.unitData.blocks.filter((x) => x.spec.type === 'build' && x.spec.engine === e).sort((x, y) => y.spec.b - x.spec.b)[0];
    ctx.stores[e] = { store: k.res.store, root: k.res.root };
  }
}
async function openWorkers(ctx, perm, kind) {
  ctx.workers = {}; const opened = {};
  for (const ei of perm) {
    const e = ENG[ei]; const w = spawnWorker(e + ' ' + kind); ctx.workers[e] = w;
    opened[e] = kind === 'warm' ? await w.call('open', { engine: e, graph: ctx.graph, store: ctx.stores[e].store, root: ctx.stores[e].root, threads: 1 })
      : await w.call('uopen', { engine: e, graph: ctx.graph, store: ctx.stores[e].store, root: ctx.stores[e].root });
  }
  return opened;
}
async function closeWorkers(ctx) {
  for (const w of Object.values(ctx.workers || {})) { try { await w.call('close', {}); } catch (e) { /* exiting */ } await w.kill(); }
  ctx.workers = {};
}

// ---------------------------------------------------------------- calibration ----
async function calibrate() {
  const f = path.join(OUT, 'calibration.json');
  if (fs.existsSync(f)) { const c = JSON.parse(fs.readFileSync(f, 'utf8')); if (c.complete) { log('calibration: reusing ' + f); return c; } }
  const ncpu = os.availableParallelism ? os.availableParallelism() : os.cpus().length;
  const cand = [...new Set([1, 2, 4, ncpu].filter((t) => t <= ncpu))].sort((x, y) => x - y);
  const cal = { complete: false, started: new Date().toISOString(), candidates: cand, rule: `fewest threads whose median warm wall time over the calibration items x ${CFG.calib_reps} repetitions is within ${CFG.best_within * 100} % of the lowest`, graphs: {}, best: {} };
  for (const graph of ['tune', 'frozen']) {
    const unitData = { blocks: [] };
    const ctx = { unit: 'calib-' + graph, tag: 'cal', graph, stores: {}, workers: {}, unitData };
    ctx.exec = makeExec(ctx);
    const R = blockRunner(ctx.unit, (x) => unitData.blocks.push(x));
    await buildPhase(ctx, R, 1);
    const opened = await openWorkers(ctx, R.perm(), 'warm');
    for (const cls of classesFor(graph)) {
      const n = itemCount(graph, cls, true);
      const perm = R.perm();
      for (const ei of perm) {
        const e = ENG[ei]; if (!enginesOf(cls).includes(e)) continue;
        const order = (perm[0] % 2 ? [...cand].reverse() : cand);
        for (const T of order) await R.run({ key: `calib|${e}|${cls.key}|T${T}`, type: 'warm', engine: e, cls: cls.key, T, from: 0, to: n, n, calib: true, reps: CFG.calib_reps }, ctx.exec);
        log(`calib ${graph} ${cls.key} ${e} done`);
      }
      await R.settle(false);
    }
    await R.settle(true);
    await closeWorkers(ctx);
    rmStores(new RegExp('^' + graph + '/cal'));
    const g = { opened, by: {} };
    for (const b of unitData.blocks.filter((x) => x.spec.type === 'warm')) {
      const s = b.res.items.flatMap((x) => x.warm_ms); const sc = b.res.items.flatMap((x) => x.warm_cpu_ms);
      ((g.by[b.spec.engine] = g.by[b.spec.engine] || {})[b.spec.cls] = g.by[b.spec.engine][b.spec.cls] || {})[b.spec.T] = { median_ms: L.r3(L.median(s)), median_cpu_ms: L.r3(L.median(sc)), n: s.length, flagged: b.flagged, attempts: b.attempts, other_cpus: b.load.other_cpus };
    }
    for (const [e, byCls] of Object.entries(g.by)) for (const [k, byT] of Object.entries(byCls)) {
      const m = cand.map((t) => [t, byT[t].median_ms]); const lo = Math.min(...m.map((x) => x[1]));
      ((cal.best[e] = cal.best[e] || {})[graph] = cal.best[e][graph] || {})[k] = m.find((x) => x[1] <= lo * (1 + CFG.best_within))[0];
    }
    g.builds = unitData.blocks.filter((x) => x.spec.type === 'build').map((x) => ({ engine: x.spec.engine, build_ms: x.res.build_ms, build_cpu_ms: x.res.build_cpu_ms, flagged: x.flagged }));
    cal.graphs[graph] = g;
    writeJson(f, cal);
  }
  cal.complete = true; cal.finished = new Date().toISOString();
  writeJson(f, cal);
  log('calibration: best threads ' + JSON.stringify(cal.best));
  return cal;
}

// ---------------------------------------------------------------- one unit = (pass, graph) ----
async function runUnit(p, graph, best) {
  const unitId = `p${p}-${graph}`;
  const unitData = { unit: unitId, pass: p, graph, sha: plan.graphs[graph].sha, session: SESSION, started: new Date().toISOString(), config: CFG, best_threads: {}, blocks: [] };
  const ctx = { unit: unitId, tag: 'p' + p, graph, stores: {}, workers: {}, unitData };
  ctx.exec = makeExec(ctx);
  const R = blockRunner(unitId, (x) => unitData.blocks.push(x));
  const progress = (phase) => writeJson(path.join(OUT, 'progress.json'), { session: SESSION, unit: unitId, phase, at: new Date().toISOString(), config: CFG });
  const settings = (e, cls) => [...new Set([1, best[e][graph][cls.key]])];
  for (const e of ENG) unitData.best_threads[e] = best[e][graph];
  const rot = (a, k) => a.map((_, i) => a[(i + k) % a.length]);
  const classes = rot(classesFor(graph), p % classesFor(graph).length);

  progress('build'); await buildPhase(ctx, R, CFG.builds_per_pass);

  progress('warm');
  unitData.opened = await openWorkers(ctx, R.perm(), 'warm');
  for (const cls of classes) {
    const n = itemCount(graph, cls, false);
    for (const [from, to] of chunks(n, cls.kind === 'tq' ? n : CFG.chunk)) {
      const perm = R.perm();
      for (const ei of perm) {
        const e = ENG[ei]; if (!enginesOf(cls).includes(e)) continue;
        const ts = settings(e, cls); if (perm[0] % 2) ts.reverse();
        for (const T of ts) await R.run({ key: `warm|${e}|${cls.key}|T${T}|${from}`, type: 'warm', engine: e, cls: cls.key, T, from, to, n, reps: CFG.reps, uncached: true, instr: true }, ctx.exec);
      }
      await R.settle(false);
    }
    log(`${unitId} warm ${cls.key} done`);
  }
  await R.settle(true);
  await closeWorkers(ctx);

  progress('ipc');
  for (const cls of classes.filter((c) => c.kind === 'rank')) { await R.run({ key: `ipc|ladybug|${cls.key}`, type: 'ipc', engine: 'ladybug', cls: cls.key, T: 1 }, ctx.exec); await R.settle(false); }
  await R.settle(true);
  log(`${unitId} ipc done`);

  progress('cold');
  for (const cls of classes) {
    const n = Math.min(CFG.cold_n, itemCount(graph, cls, false));
    for (const [from, to] of chunks(n, CFG.cold_chunk)) {
      const perm = R.perm();
      for (const ei of perm) {
        const e = ENG[ei]; if (!enginesOf(cls).includes(e)) continue;
        const ts = settings(e, cls); if (perm[0] % 2) ts.reverse();
        for (const T of ts) await R.run({ key: `cold|${e}|${cls.key}|T${T}|${from}`, type: 'cold', engine: e, cls: cls.key, T, from, to }, ctx.exec);
      }
      await R.settle(false);
    }
    log(`${unitId} cold ${cls.key} done`);
  }
  await R.settle(true);

  progress('update');
  const uo = await openWorkers(ctx, R.perm(), 'update');
  const g = plan.graphs[graph];
  const files = [...new Set(g.seeds.map((x) => x.seed.path))].slice(0, CFG.update_n);
  unitData.update = { files: files.length, threads: Object.fromEntries(ENG.map((e) => [e, uo[e].threads])), fp0: Object.fromEntries(ENG.map((e) => [e, uo[e].fp0])) };
  for (const [from, to] of chunks(files.length, CFG.update_chunk)) {
    for (const ei of R.perm()) { const e = ENG[ei]; await R.run({ key: `update|${e}|${from}`, type: 'update', engine: e, from, files: files.slice(from, to) }, ctx.exec); }
    await R.settle(false);
  }
  await R.settle(true);
  unitData.update.check = {};
  for (const e of ENG) {
    const fin = await ctx.workers[e].call('ufinish', { checkN: Math.min(CFG.update_check, CFG.seeds) });
    const diffs = sameFp(unitData.update.fp0[e], fin.fp1);
    const known = KNOWN_FP[e] || new Set();
    const ansDiff = [];
    for (const [k, hs] of Object.entries(fin.answers)) {
      hs.forEach((h, i) => {
        const b = unitData.blocks.find((x) => x.spec.type === 'warm' && x.spec.engine === e && x.spec.cls === k && x.spec.T === 1 && i >= x.spec.from && i < x.spec.to);
        const before = b && b.res.items.find((it) => it.i === i);
        if (!before) return;
        if (JSON.stringify(before.hash) !== JSON.stringify(h)) ansDiff.push({ cls: k, i, before: before.hash, after: h });
      });
    }
    unitData.update.check[e] = { fingerprint_differences: diffs.filter((d) => !known.has(d.split(':')[0])), known_engine_effects: diffs.filter((d) => known.has(d.split(':')[0])), answers_compared: Object.fromEntries(Object.entries(fin.answers).map(([k, x]) => [k, x.length])), answers_differing: ansDiff };
  }
  await closeWorkers(ctx);

  rmStores(new RegExp('^' + graph + '/p' + p + 'b'));
  unitData.finished = new Date().toISOString();
  writeJson(path.join(OUT, 'units', unitId + '.json'), unitData);
  log(`${unitId} complete: ${unitData.blocks.length} blocks, ${unitData.blocks.filter((x) => x.flagged).length} kept flagged, ${unitData.blocks.reduce((a, x) => a + x.attempts - 1, 0)} repeats`);
}

async function main() {
  fs.mkdirSync(path.join(OUT, 'units'), { recursive: true });
  const cfgFile = path.join(OUT, 'run_config.json');
  if (fs.existsSync(cfgFile)) {
    const old = JSON.parse(fs.readFileSync(cfgFile, 'utf8')).config;
    if (JSON.stringify(old) !== JSON.stringify(CFG)) throw new Error('REFUSED: this run folder was started with other settings ' + JSON.stringify(old) + '; now ' + JSON.stringify(CFG) + '. Use the same settings to resume, or a new run name.');
  } else writeJson(cfgFile, { config: CFG, first_session: SESSION, container: L.hostInfo(), labels: L.LABELS });
  appendLine(path.join(OUT, 'sessions.jsonl'), { session: SESSION, container: L.hostInfo(), cgroup_cpu_max: (() => { try { return fs.readFileSync('/sys/fs/cgroup/cpu.max', 'utf8').trim(); } catch (e) { return null; } })(), cgroup_memory_max: (() => { try { return fs.readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim(); } catch (e) { return null; } })() });
  VM.timer = setInterval(vmTick, 1000); vmTick();
  readHost();
  log(`settings ${JSON.stringify(CFG)}; host timeline ${HOST.samples.length ? HOST.samples.length + ' samples' : 'not yet present'}; clock offset ${Math.round(HOST.clock)} ms`);
  for (const l of L.LABELS) log('label: ' + l);
  const cal = await calibrate();
  for (let p = 1; p <= CFG.passes; p++) {
    for (const graph of p % 2 ? ['tune', 'frozen'] : ['frozen', 'tune']) {
      const f = path.join(OUT, 'units', `p${p}-${graph}.json`);
      if (fs.existsSync(f)) { log(`p${p}-${graph}: complete, skipped`); continue; }
      log(`p${p}-${graph}: start`);
      await runUnit(p, graph, cal.best);
    }
  }
  clearInterval(VM.timer);
  writeJson(path.join(OUT, 'progress.json'), { session: SESSION, phase: 'all passes complete', at: new Date().toISOString(), config: CFG });
  log('all passes complete');
}

main().catch((e) => { console.error(e && e.stack ? e.stack : e); process.exit(1); });
