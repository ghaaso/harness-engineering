'use strict';
// Worker process of the interleaved engine bench (bench/interleaved.js; protocol addendum 5, section C).
// Forked by the driver; talks over the Node IPC channel ({id, op, ...} in, {id, ok, r | error} out).
// One worker serves one engine. Between blocks it waits on the channel and uses no CPU, so only the
// engine whose block is running does work. The arm's own code answers every query (through the bench
// adapters bench/relational.js, ladybug.js, duckpgq.js); nothing in arms/ is changed.
//
// Ops (persistent worker):   open, block, close                  (warm measures and thread calibration)
//                            uopen, uchunk, ufinish                (one-file update)
// Ops (one-shot, then exit):  build, cold, ipc
// Every timed call is measured in wall time (performance.now) and in CPU time of this process
// (process.cpuUsage: user + system of every thread of the process, so DuckDB's and LadybugDB's engine
// threads are included). The arm's LadybugDB harness form runs the store in a child process; op "ipc"
// measures that child's CPU from /proc.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const L = require('./lib');

const ADAPTERS = { relational: () => require('./relational'), ladybug: () => require('./ladybug'), duckpgq: () => require('./duckpgq') };
const now = L.now;
const cpuMs = () => { const u = process.cpuUsage(); return (u.user + u.system) / 1000; };
const sha = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);
const r3 = L.r3;

async function timedC(fn) {
  const c = cpuMs(); const t = now();
  let r = fn();
  if (r && typeof r.then === 'function') r = await r;
  const w = now() - t; const cc = cpuMs() - c;
  return [w, cc, r];
}

let plan = null;
const W = { A: null, h: null, G: null, engine: null, graph: null, T: null, warmed: new Set(), U: null, uh: null, store: null, root: null };

function itemsFor(graph, cls, calib) {
  if (cls.kind === 'tq') return plan.tq;
  return calib ? plan.graphs[graph].calib : plan.graphs[graph].seeds;
}
function callerOf(h, cls) { return cls.kind === 'tq' ? (x) => h.tq(x) : (x) => h.rank(x.ids, cls.config, x.seed); }
function hashOf(cls, r) { return cls.kind === 'tq' ? L.tqHash(r) : L.rankedHashes(L.asRanked(r)); }
function sizeOf(cls, r) { return cls.kind === 'tq' ? JSON.stringify(r && r.answer !== undefined ? r.answer : r).length : L.asRanked(r).length; }

// time inside the engine client calls, in wall and in CPU (the adapters call I.sync / I.async around
// every engine call; replacing the methods on the shared object adds CPU accounting without editing them)
function addCpuInstr(I) {
  I.api_cpu = 0;
  const reset0 = I.reset; I.reset = () => { reset0(); I.api_cpu = 0; };
  I.sync = (f, text, nStmts = 1) => {
    if (!I.on) return f();
    const c = cpuMs(); const t = now();
    try { return f(); } finally { I.api_ms += now() - t; I.api_cpu += cpuMs() - c; I.statements += nStmts; if (text != null) I.texts.push(text); }
  };
  I.async = async (f, text, nStmts = 1) => {
    if (!I.on) return f();
    const c = cpuMs(); const t = now();
    try { return await f(); } finally { I.api_ms += now() - t; I.api_cpu += cpuMs() - c; I.statements += nStmts; if (text != null) I.texts.push(text); }
  };
}

async function openHandle(A, a) {
  const t0 = now(); const c0 = cpuMs(); A.load(); const loadMs = now() - t0; const loadCpu = cpuMs() - c0;
  let G = null; let factsMs = 0;
  if (A.needsGraph) { const f = L.graphFacts(plan.graphs[a.graph].sha); G = f.G; factsMs = f.ms; }
  const c1 = cpuMs(); const t1 = now();
  const h = await A.open({ G, store: a.store, root: a.root, threads: a.threads });
  const openMs = now() - t1; const openCpu = cpuMs() - c1;
  addCpuInstr(h.instr);
  return { h, G, client_load_ms: loadMs, client_load_cpu_ms: loadCpu, facts_load_ms: factsMs, open_ms: openMs, open_cpu_ms: openCpu };
}

const OPS = {
  async open(a) {
    plan = L.readPlan();
    W.engine = a.engine; W.graph = a.graph; W.A = ADAPTERS[a.engine]();
    const o = await openHandle(W.A, a);
    W.h = o.h; W.G = o.G; W.T = a.threads; W.warmed = new Set();
    return { version: W.A.version(), client_load_ms: r3(o.client_load_ms), facts_load_ms: r3(o.facts_load_ms), open_ms: r3(o.open_ms), open_cpu_ms: r3(o.open_cpu_ms), readback: await W.h.readback(), pid: process.pid };
  },

  // one block: the same seed range for one (class, thread setting); measures chosen by the driver
  async block(a) {
    const cls = plan.classes.find((c) => c.key === a.cls);
    const h = W.h; const call = callerOf(h, cls);
    const all = itemsFor(W.graph, cls, a.calib).slice(0, a.n);
    let readback = null;
    if (a.T !== W.T) { await h.setThreads(a.T); W.T = a.T; }
    readback = await h.readback();
    // untimed warm-up: the first time this worker sees the class, one pass over every item of it
    const wk = cls.key + (a.calib ? '#calib' : '');
    let warmupMs = null;
    if (!W.warmed.has(wk)) { const t = now(); for (const x of all) await timedC(() => call(x)); warmupMs = now() - t; W.warmed.add(wk); }
    const items = all.slice(a.from, a.to);
    // untimed re-warm: an "uncached" pass of an earlier block dropped the caches keyed by configuration
    await timedC(() => call(items[0]));
    const t0 = Date.now(); const T0 = now();
    const out = items.map((x, k) => ({ i: a.from + k, warm_ms: [], warm_cpu_ms: [] }));
    for (let r = 0; r < a.reps; r++) {
      for (let k = 0; k < items.length; k++) {
        const [w, c, res] = await timedC(() => call(items[k]));
        out[k].warm_ms.push(r3(w)); out[k].warm_cpu_ms.push(r3(c));
        if (r === 0) { out[k].hash = hashOf(cls, res); out[k].size = sizeOf(cls, res); }
      }
    }
    let noop = null; const texts = new Map();
    if (a.uncached) {
      for (let k = 0; k < items.length; k++) { await h.drop(); const [w, c] = await timedC(() => call(items[k])); out[k].unc_ms = r3(w); out[k].unc_cpu_ms = r3(c); }
    }
    if (a.instr) {
      for (let k = 0; k < items.length; k++) {
        h.instr.reset(); h.instr.on = true;
        let w; let c;
        try { [w, c] = await timedC(() => call(items[k])); } finally { h.instr.on = false; }
        const I = h.instr;
        out[k].bd = { total_ms: r3(w), total_cpu_ms: r3(c), api_ms: r3(I.api_ms), api_cpu_ms: r3(I.api_cpu), app_ms: r3(w - I.api_ms), app_cpu_ms: r3(c - I.api_cpu), stmts: I.statements, chars: I.texts.reduce((s, t) => s + String(t).length, 0) };
        for (const t of I.texts) { const n = L.normText(t); const k2 = sha(n); if (!texts.has(k2)) texts.set(k2, [n.length, n.split('\n').length]); }
      }
      // per-statement client round trip: a no-op statement through the same client path
      for (let k = 0; k < 10; k++) await timedC(() => h.noop());
      const s = []; const sc = [];
      for (let k = 0; k < a.noopN; k++) { const [w, c] = await timedC(() => h.noop()); s.push(w); sc.push(c); }
      noop = { median_ms: r3(L.median(s)), median_cpu_ms: r3(L.median(sc)), n: s.length };
    }
    const t1 = Date.now();
    return { t0, t1, busy_ms: r3(now() - T0), warmup_ms: warmupMs == null ? null : r3(warmupMs), readback, items: out, noop, texts: [...texts.entries()], rss_mb: r3(process.memoryUsage().rss / 1048576) };
  },

  async close() { if (W.h) { await W.h.close(); W.h = null; } return { closed: true }; },

  // ---- one-shot ops --------------------------------------------------------------------------------
  async build(a) {
    plan = L.readPlan();
    const A = ADAPTERS[a.engine]();
    A.load();
    const { G, ms } = L.graphFacts(plan.graphs[a.graph].sha);
    const t0 = Date.now(); const c = cpuMs(); const t = now();
    const b = await A.build(G, a.root);
    const w = now() - t; const cc = cpuMs() - c; const t1 = Date.now();
    const size = L.storeFiles(b.store);
    return { t0, t1, build_ms: r3(w), build_cpu_ms: r3(cc), engine_reported_build_ms: r3(b.build_ms), facts_load_ms: r3(ms), parts: b.parts, store: b.store, bytes: size.bytes, files: size.files.length, build_threads: b.build_threads || null, nodes: G.nodes.length, edges: G.edges.length };
  },

  // cold = a fresh process and a fresh connection: open + first call (client library load and facts load
  // are reported apart and not counted)
  async cold(a) {
    const cStart = cpuMs();
    plan = L.readPlan();
    const A = ADAPTERS[a.engine]();
    const cls = plan.classes.find((c) => c.key === a.cls);
    const t0 = Date.now();
    const o = await openHandle(A, a);
    const x = itemsFor(a.graph, cls, false)[a.index];
    const [first, firstCpu, r] = await timedC(() => callerOf(o.h, cls)(x));
    const t1 = Date.now();
    const hash = hashOf(cls, r);
    await o.h.close();
    return { t0, t1, i: a.index, client_load_ms: r3(o.client_load_ms), client_load_cpu_ms: r3(o.client_load_cpu_ms), facts_load_ms: r3(o.facts_load_ms), open_ms: r3(o.open_ms), open_cpu_ms: r3(o.open_cpu_ms), first_ms: r3(first), first_cpu_ms: r3(firstCpu), cold_ms: r3(o.open_ms + first), cold_cpu_ms: r3(o.open_cpu_ms + firstCpu), process_cpu_ms: r3(cpuMs() - cStart), hash };
  },

  // LadybugDB as the harness runs it (arms/ladybug/arm.js default): the store in a child process, one IPC
  // round trip per ranking. CPU of that child from /proc (sum over its threads of schedstat run time).
  async ipc(a) {
    process.env.LB_THREADS = '1'; process.env.LB_PPR = 'app'; delete process.env.LB_INPROC;
    plan = L.readPlan();
    const cls = plan.classes.find((c) => c.key === a.cls);
    const { G } = L.graphFacts(plan.graphs[a.graph].sha);
    const arm = require('../arms/ladybug/arm');
    const h = await arm.open(G, { store: a.root });
    const pid = h.child.pid;
    const childCpu = () => { let s = 0; try { for (const t of fs.readdirSync('/proc/' + pid + '/task')) s += Number(fs.readFileSync('/proc/' + pid + '/task/' + t + '/schedstat', 'utf8').split(' ')[0]); } catch (e) { return null; } return s / 1e6; };
    const items = plan.graphs[a.graph].seeds.slice(0, a.n);
    for (const x of items) await h.rank(x.ids, cls.config, x.seed);
    const t0 = Date.now(); const rows = [];
    for (let k = 0; k < items.length; k++) {
      const x = items[k]; const pc = cpuMs(); const cc = childCpu(); const t = now();
      const r = await h.rank(x.ids, cls.config, x.seed);
      const w = now() - t; const cc2 = childCpu();
      rows.push({ i: k, harness_wall_ms: r3(w), child_rank_ms: r3(r.engine_ms), ipc_ms: r3(w - r.engine_ms), child_cpu_ms: cc == null || cc2 == null ? null : r3(cc2 - cc), parent_cpu_ms: r3(cpuMs() - pc) });
    }
    const t1 = Date.now();
    await h.close();
    return { t0, t1, cls: a.cls, rows, note: 'harness form: rank() in the arm\'s child process (structured-clone IPC), 1 thread; child_cpu_ms = CPU of that child (sum of /proc/<pid>/task/*/schedstat run time; threads that exited during the call are not counted)' };
  },

  // ---- one-file update (bench/update.js does the work; its steps are unchanged) ----------------------------
  async uopen(a) {
    plan = L.readPlan();
    W.engine = a.engine; W.graph = a.graph; W.A = ADAPTERS[a.engine](); W.store = a.store; W.root = a.root;
    W.U = require('./update').UPD[a.engine];
    W.G = L.graphFacts(plan.graphs[a.graph].sha).G;
    W.uh = await W.U.open(W.G, a.store, a.root);
    const fp0 = await W.U.fingerprint(W.uh);
    return { fp0, threads: W.U.threads };
  },
  async uchunk(a) {
    const { selection } = require('./update');
    const t0 = Date.now(); const rows = [];
    for (const F of a.files) {
      const sel = selection(W.G, F);
      const [w, c, parts] = await timedC(() => W.U.update(W.uh, W.G, sel));
      rows.push({ file: F, nodes: sel.X.length, edges: sel.E.length, total_ms: r3(w), total_cpu_ms: r3(c), parts: Object.fromEntries(Object.entries(parts).map(([k, x]) => [k, typeof x === 'number' && /_ms$/.test(k) ? r3(x) : x])) });
    }
    return { t0, t1: Date.now(), rows };
  },
  async ufinish(a) {
    const fp1 = await W.U.fingerprint(W.uh);
    await W.U.close(W.uh); W.uh = null;
    // answers after the updates, one thread, through the bench adapter (compared by the driver with the
    // answers this pass's warm blocks gave before the updates)
    const o = await openHandle(W.A, { graph: W.graph, store: W.store, root: W.root, threads: 1 });
    const ans = {};
    for (const cls of plan.classes.filter((c) => (!c.engines || c.engines.includes(W.engine)) && c.graphs.includes(W.graph))) {
      const items = cls.kind === 'tq' ? plan.tq : plan.graphs[W.graph].seeds.slice(0, a.checkN);
      ans[cls.key] = [];
      for (const x of items) { const [, , r] = await timedC(() => callerOf(o.h, cls)(x)); ans[cls.key].push(hashOf(cls, r)); }
    }
    await o.h.close();
    return { fp1, answers: ans };
  },
};

process.on('message', async (m) => {
  try {
    const r = await OPS[m.op](m.args || {});
    process.send({ id: m.id, ok: true, r }, () => { if (m.oneshot) process.exit(0); });
  } catch (e) {
    process.send({ id: m.id, ok: false, error: String(e && e.stack ? e.stack : e).slice(0, 4000) }, () => { if (m.oneshot) process.exit(1); });
  }
});
process.on('disconnect', () => process.exit(0));
void path;
