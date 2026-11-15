'use strict';
// Engine benches of protocol addendum 4, section E (items 16 to 20): the shared driver.
//
// One engine per container (bench/run_all.sh). Inside it, `node bench/<engine>.js run` is the
// orchestrator: it never opens a store itself. Every store open happens in a child process of this
// file (`node bench/<engine>.js child <op> <json>`), so a cold sample is a fresh process with a fresh
// connection, and LadybugDB's native memory (kept by a closed Database inside a live process) never
// accumulates.
//
// What is timed (addendum 4 item 18): per graph, the typed primary (95e990307da3b42b), S1
// (6b70cc1222745385), the 2-hop base (8067b9cf65e59b2f), LadybugDB S2 (f233ae069bdba0ce, ladybug only)
// and, on the frozen commit, the 20 TUNE question lookups (TQ). Graphs and seeds come from
// results/bench/plan.json, written once by bench/prep.js (TUNE tasks only; nothing held-out is read
// beyond what loadTasks('tune') returns, which is nothing held-out).
//
// Per (graph, class, thread setting):
//   warm            one untimed warm-up pass over all seeds, then REPS timed passes (rep-major order);
//                   per seed the median of its REPS samples; reported: median and 95th percentile over
//                   seeds (nearest rank), plus min, max, mean.
//   warm_uncached   process and connection warm, but every cache held or keyed by application code
//                   (adapter.caches, "dropped") is dropped before each call; one sample per seed.
//   breakdown       one instrumented call per seed: time inside the engine client API (statement
//                   execution and result fetch), number of statements, the rest = application code;
//                   plus an estimate of the per-statement client round trip (median time of a no-op
//                   statement through the same client path, times the statement count).
//   cold            a fresh process per sample: client library load, open (fresh connection), first call;
//                   cold = open + first call. Sampled over the first COLD_N seeds.
//   query_text      the distinct statement texts the engine received for the class (numbers and number
//                   lists normalised to "?"), their count, characters and lines.
// Threads: one thread, and the engine's best setting, chosen per (graph, class) on calibration seeds
// that are disjoint from the measured seeds (TQ: the 20 questions themselves), candidates 1, 2, 4 and
// the container's CPU count; best = the fewest threads whose warm median is within 3 % of the lowest.
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { performance } = require('perf_hooks');

const BUILD = path.resolve(__dirname, '..');
process.env.GT_BUILD = process.env.GT_BUILD || BUILD;
const P = require('../arms/common/paths');
const C = require('../arms/common/config');

const now = () => performance.now();
const OUT = process.env.BENCH_OUT || path.join(P.RESULTS, 'bench');
const PLAN_FILE = process.env.BENCH_PLAN || path.join(OUT, 'plan.json');
const STORE_ROOT = process.env.BENCH_STORE || '/benchstore';
const REPS = Number(process.env.BENCH_REPS || 3);
const BUILDS = Number(process.env.BENCH_BUILDS || 3);
const NOOP_N = Number(process.env.BENCH_NOOP_N || 500);

// ---- addendum 4 item 20: the labels that go with every engine number ---------------------------------
const LABELS = [
  "DuckPGQ's k-hop is recursive SQL, not a graph operator (bounded hops: a recursive SQL statement; unbounded: iterativelength() over a CSR built in the statement).",
  "LadybugDB's personalised PageRank runs in application code over a cached adjacency (40 iterations in JavaScript over a transition CSR fetched by one Cypher query and cached per configuration).",
  "SQLite's walk is a recursive common table expression (bounded hops; unbounded hops use a level-wise loop of SQL statements driven by application code).",
  "Where the frozen primary's ranking (degree-normalised spreading, addendum 2 item 20) runs: LadybugDB fetches arcs and out-degrees by Cypher and spreads the activation in application code (JavaScript), so for LadybugDB this ranking is not in the engine; SQLite and DuckPGQ spread it in SQL, one statement per BFS level, the level loop driven by application code; SQLite's unbounded walk is likewise a level loop in application code.",
];

// ---- small statistics -------------------------------------------------------------------------------
const sorted = (a) => [...a].sort((x, y) => x - y);
function median(a) { if (!a.length) return null; const s = sorted(a); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function pctile(a, q) { if (!a.length) return null; const s = sorted(a); return s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))]; }
const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
function stats(a) {
  if (!a.length) return { n: 0 };
  return { n: a.length, median_ms: r3(median(a)), p95_ms: r3(pctile(a, 0.95)), min_ms: r3(Math.min(...a)), max_ms: r3(Math.max(...a)), mean_ms: r3(a.reduce((x, y) => x + y, 0) / a.length) };
}
function statsPlain(a) {
  if (!a.length) return { n: 0 };
  return { n: a.length, median: r3(median(a)), p95: r3(pctile(a, 0.95)), min: r3(Math.min(...a)), max: r3(Math.max(...a)) };
}

// ---- deterministic draws ----------------------------------------------------------------------------
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(arr, seed) { const r = mulberry32(seed); const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---- hashes of answers (for the equivalence check across engines, bench/check.js) ---------------------
const sha = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);
function rankedHashes(ranked) {
  return {
    n: ranked.length,
    order: sha(JSON.stringify(ranked.map((r) => [r.i, r.hop]))),
    score9: sha(JSON.stringify(ranked.map((r) => [r.i, r.hop, r.score == null ? null : Math.round(r.score * 1e9)]))),
    exact: sha(JSON.stringify(ranked.map((r) => [r.i, r.hop, r.score]))),
  };
}
function tqHash(ans) { const a = ans && typeof ans === 'object' && !Array.isArray(ans) && 'answer' in ans ? ans.answer : ans; return { exact: sha(JSON.stringify(a)) }; }

// ---- query text ---------------------------------------------------------------------------------------
// numbers and comma-separated number lists become "?", so a text that differs per seed only in its
// literals counts once
function normText(t) { return String(t).replace(/-?\b\d+(\.\d+)?(e-?\d+)?(\s*,\s*-?\d+(\.\d+)?(e-?\d+)?)*\b/g, '?').replace(/[ \t]+$/gm, ''); }
function textStats(texts) {
  const d = [...new Set(texts.map(normText))];
  return { distinct_texts: d.length, chars: d.reduce((a, t) => a + t.length, 0), lines: d.reduce((a, t) => a + t.split('\n').length, 0) };
}

// ---- instrumentation (each adapter calls I.wrap around every engine client call) -------------------------
function makeInstr() {
  const I = {
    on: false, api_ms: 0, statements: 0, texts: [],
    reset() { I.api_ms = 0; I.statements = 0; I.texts = []; },
    // sync engine call: f() returns the result
    sync(f, text, nStmts = 1) {
      if (!I.on) return f();
      const t = now();
      try { return f(); } finally { I.api_ms += now() - t; I.statements += nStmts; if (text != null) I.texts.push(text); }
    },
    // async engine call: f() returns a promise
    async async(f, text, nStmts = 1) {
      if (!I.on) return f();
      const t = now();
      try { return await f(); } finally { I.api_ms += now() - t; I.statements += nStmts; if (text != null) I.texts.push(text); }
    },
  };
  return I;
}
// statements in a multi-statement string (no semicolons inside literals in the arm SQL)
const countStmts = (sql) => String(sql).split(';').map((x) => x.trim()).filter(Boolean).length;

// call a possibly-async function; a sync result is timed without an await (no microtask tick)
async function timed(fn) {
  const t = now();
  let r = fn();
  if (r && typeof r.then === 'function') r = await r;
  return [now() - t, r];
}
const asRanked = (r) => (Array.isArray(r) ? r : r && Array.isArray(r.ranked) ? r.ranked : (() => { throw new Error('rank result has no ranked list'); })());

// ---- plan ------------------------------------------------------------------------------------------------
function readPlan() { return JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8')); }
function graphFacts(shaFull) {
  // loadFacts reads the shared source store; refuse to create a tree there (rule: write only bench folders)
  const tf = path.join(P.SRCSTORE, 'trees', shaFull + '.json');
  if (!fs.existsSync(tf)) throw new Error('source tree missing for ' + shaFull + ' (bench never writes the shared source store)');
  const { loadFacts } = require('../arms/common/facts');
  const t = now(); const G = loadFacts(shaFull); return { G, ms: now() - t };
}
function classesOf(plan, engine, graph) {
  return plan.classes.filter((c) => (!c.engines || c.engines.includes(engine)) && c.graphs.includes(graph));
}
function itemsOf(plan, graph, cls, n, calib = false) {
  if (cls.kind === 'tq') return plan.tq.slice(0, n);
  const g = plan.graphs[graph];
  return (calib ? g.calib : g.seeds).slice(0, n);
}
function callerOf(h, cls) {
  if (cls.kind === 'tq') return (x) => h.tq(x);
  const cfg = cls.config;
  return (x) => h.rank(x.ids, cfg, x.seed);
}
function storeFiles(storePath) {
  const dir = path.dirname(storePath); const base = path.basename(storePath);
  const out = [];
  const walk = (p) => { const st = fs.statSync(p); if (st.isDirectory()) { for (const f of fs.readdirSync(p)) walk(path.join(p, f)); } else out.push({ file: path.relative(dir, p), bytes: st.size }); };
  if (!fs.existsSync(dir)) return { bytes: 0, files: [] };
  for (const f of fs.readdirSync(dir)) if (f === base || f.startsWith(base + '.') || f.startsWith(base + '-')) walk(path.join(dir, f));
  return { bytes: out.reduce((a, x) => a + x.bytes, 0), files: out };
}
function hostInfo() {
  let cpus = null; let load = null;
  try { cpus = (fs.readFileSync('/proc/self/status', 'utf8').match(/Cpus_allowed_list:\s*(\S+)/) || [])[1] || null; } catch (e) { /* not linux */ }
  try { load = fs.readFileSync('/proc/loadavg', 'utf8').trim(); } catch (e) { /* not linux */ }
  return { cpus_allowed_list: cpus, available_parallelism: os.availableParallelism ? os.availableParallelism() : os.cpus().length, loadavg: load, node: process.version, platform: process.platform };
}

// ---- children ------------------------------------------------------------------------------------------
function child(file, op, args) {
  const t = now();
  const out = execFileSync(process.execPath, ['--expose-gc', file, 'child', op, JSON.stringify(args)], { maxBuffer: 256 << 20, stdio: ['ignore', 'pipe', 'inherit'], env: process.env }).toString().trim().split('\n').pop();
  const r = JSON.parse(out); r._spawn_wall_ms = now() - t;
  return r;
}

async function childMain(A, op, args) {
  const T0 = now(); // ms since this process's time origin (process start)
  let res;
  if (op === 'build') res = await opBuild(A, args);
  else if (op === 'calib') res = await opCalib(A, args, T0);
  else if (op === 'warm') res = await opWarm(A, args, T0);
  else if (op === 'cold') res = await opCold(A, args, T0);
  else if (op === 'ipc') res = await A.ipc(args, { readPlan, itemsOf, classesOf, graphFacts, stats, timed, asRanked, REPS });
  else throw new Error('unknown op ' + op);
  process.stdout.write('\n' + JSON.stringify(res) + '\n');
}

async function opBuild(A, a) {
  const plan = readPlan(); const g = plan.graphs[a.graph];
  const t0 = now(); A.load(); const loadMs = now() - t0;
  const { G, ms } = graphFacts(g.sha);
  const b = await A.build(G, path.join(STORE_ROOT, A.name, a.graph));
  return { graph: a.graph, facts_load_ms: r3(ms), client_load_ms: r3(loadMs), build_ms: r3(b.build_ms), parts: b.parts, store: b.store, build_threads: b.build_threads || null, nodes: G.nodes.length, edges: G.edges.length };
}

async function openFor(A, a, plan) {
  const g = plan.graphs[a.graph];
  const t0 = now(); A.load(); const loadMs = now() - t0;
  let G = null; let factsMs = 0;
  if (A.needsGraph) { const f = graphFacts(g.sha); G = f.G; factsMs = f.ms; }
  const t1 = now();
  const h = await A.open({ G, store: a.store, root: path.join(STORE_ROOT, A.name, a.graph), threads: a.threads });
  const openMs = now() - t1;
  return { h, client_load_ms: loadMs, facts_load_ms: factsMs, open_ms: openMs };
}

async function opCalib(A, a) {
  const plan = readPlan(); const o = await openFor(A, a, plan);
  const out = { graph: a.graph, threads: a.threads, readback: await o.h.readback(), classes: {} };
  for (const cls of classesOf(plan, A.name, a.graph)) {
    const items = itemsOf(plan, a.graph, cls, a.n, true);
    const call = callerOf(o.h, cls);
    for (const x of items) await timed(() => call(x));
    const samples = [];
    for (let r = 0; r < REPS; r++) for (const x of items) samples.push((await timed(() => call(x)))[0]);
    out.classes[cls.key] = { median_ms: r3(median(samples)), n: samples.length, items: items.length };
  }
  await o.h.close();
  return out;
}

async function opWarm(A, a) {
  const plan = readPlan(); const cls = plan.classes.find((c) => c.key === a.cls);
  const o = await openFor(A, a, plan); const h = o.h;
  const items = itemsOf(plan, a.graph, cls, a.n);
  const call = callerOf(h, cls);
  const hashOf = cls.kind === 'tq' ? tqHash : (r) => rankedHashes(asRanked(r));
  // warm-up: one untimed pass
  const tw = now(); const sizes = []; const hashes = [];
  for (const x of items) { const [, r] = await timed(() => call(x)); sizes.push(cls.kind === 'tq' ? JSON.stringify(r && r.answer !== undefined ? r.answer : r).length : asRanked(r).length); hashes.push(hashOf(r)); }
  const warmupMs = now() - tw;
  // timed passes, rep-major
  const per = items.map(() => []);
  for (let r = 0; r < REPS; r++) for (let i = 0; i < items.length; i++) per[i].push((await timed(() => call(items[i])))[0]);
  const warm = per.map((s) => median(s));
  // caches held or keyed by application code dropped before every call
  const unc = [];
  for (const x of items) { await h.drop(); unc.push((await timed(() => call(x)))[0]); }
  // re-warm (the drop pass left the caches of the last call only), then the instrumented pass
  for (const x of items) await timed(() => call(x));
  const bd = { total: [], api: [], app: [], stmts: [], chars: [] }; const allTexts = [];
  for (const x of items) {
    h.instr.reset(); h.instr.on = true;
    const [ms] = await timed(() => call(x));
    h.instr.on = false;
    bd.total.push(ms); bd.api.push(h.instr.api_ms); bd.app.push(ms - h.instr.api_ms); bd.stmts.push(h.instr.statements);
    bd.chars.push(h.instr.texts.reduce((s, t) => s + String(t).length, 0)); allTexts.push(...h.instr.texts);
  }
  // per-statement client round trip: a no-op statement through the same client path
  for (let k = 0; k < 20; k++) await timed(() => h.noop());
  const noop = []; for (let k = 0; k < NOOP_N; k++) noop.push((await timed(() => h.noop()))[0]);
  const noopMed = median(noop);
  const rtt = bd.stmts.map((n) => n * noopMed);
  if (global.gc) global.gc();
  const res = {
    graph: a.graph, cls: a.cls, threads: a.threads, readback: await h.readback(), items: items.length,
    open: { client_load_ms: r3(o.client_load_ms), facts_load_ms: r3(o.facts_load_ms), open_ms: r3(o.open_ms) },
    warmup_pass_ms: r3(warmupMs),
    warm: stats(warm), warm_all_samples: stats(per.flat()),
    warm_uncached: stats(unc),
    breakdown: {
      total: stats(bd.total), engine_api: stats(bd.api), app_code: stats(bd.app), statements: statsPlain(bd.stmts),
      roundtrip_estimate: stats(rtt), engine_api_minus_roundtrip: stats(bd.api.map((x, i) => x - rtt[i])),
      executed_text_chars: statsPlain(bd.chars),
      note: 'one instrumented call per seed; engine_api = time inside the engine client calls (statement execution plus result fetch into JavaScript); app_code = the rest of the call; roundtrip_estimate = statements x the median no-op statement time',
    },
    noop_statement: stats(noop),
    query_text: textStats(allTexts),
    result_size: statsPlain(sizes),
    rss_mb: r3(process.memoryUsage().rss / 1048576),
    hashes,
  };
  await h.close();
  return res;
}

async function opCold(A, a, T0) {
  const plan = readPlan(); const cls = plan.classes.find((c) => c.key === a.cls);
  const o = await openFor(A, a, plan);
  const x = itemsOf(plan, a.graph, cls, a.index + 1)[a.index];
  const [first, r] = await timed(() => callerOf(o.h, cls)(x));
  const hash = cls.kind === 'tq' ? tqHash(r) : rankedHashes(asRanked(r));
  await o.h.close();
  return { process_start_to_main_ms: r3(T0), client_load_ms: r3(o.client_load_ms), facts_load_ms: r3(o.facts_load_ms), open_ms: r3(o.open_ms), first_call_ms: r3(first), cold_ms: r3(o.open_ms + first), hash };
}

// ---- orchestrator ----------------------------------------------------------------------------------------
async function orchestrate(A, file) {
  const plan = readPlan();
  const n = Number(process.env.BENCH_SEEDS || plan.n_seeds);
  const nCal = Math.min(Number(process.env.BENCH_CALIB || plan.n_calib), n);
  const coldN = Math.min(Number(process.env.BENCH_COLD_N || n), n);
  const ncpu = os.availableParallelism ? os.availableParallelism() : os.cpus().length;
  const cand = [...new Set([1, 2, 4, ncpu].filter((t) => t <= ncpu))].sort((x, y) => x - y);
  const res = {
    engine: A.name, engine_label: A.label, version: A.version(), generated_at: new Date().toISOString(),
    run: { seeds: n, calibration_seeds: nCal, cold_samples: coldN, reps: REPS, builds: BUILDS, noop_samples: NOOP_N, thread_candidates: cand, smoke: n < plan.n_seeds, store_root: STORE_ROOT, plan_file: PLAN_FILE, plan_hash: plan.plan_hash },
    host_start: hostInfo(), labels: LABELS, thread_knob: A.threadKnob, caches: A.caches, how: A.how, not_comparable: A.notComparable || [],
    graphs: {}, classes: {},
  };
  process.stderr.write(`[${A.name}] ${res.version}; seeds ${n}, cold ${coldN}, threads ${cand.join(',')}\n` + LABELS.map((l) => `[${A.name}] label: ${l}\n`).join(''));
  const save = (name) => { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, name), JSON.stringify(res, null, 1)); };
  for (const graph of ['tune', 'frozen']) {
    const g = plan.graphs[graph]; const gr = { sha: g.sha, nodes: g.nodes, edges: g.edges, builds: [] };
    res.graphs[graph] = gr;
    let store = null;
    for (let b = 0; b < BUILDS; b++) { const x = child(file, 'build', { graph }); gr.builds.push(x); store = x.store; process.stderr.write(`[${A.name}] build ${graph} ${b + 1}/${BUILDS}: ${Math.round(x.build_ms)} ms\n`); }
    gr.build_ms = stats(gr.builds.map((x) => x.build_ms));
    gr.facts_load_ms = stats(gr.builds.map((x) => x.facts_load_ms));
    gr.store = store; gr.store_size = storeFiles(store);
    // thread calibration on seeds disjoint from the measured ones (TQ: the questions themselves)
    gr.calibration = {};
    for (const t of cand) { const x = child(file, 'calib', { graph, store, threads: t, n: nCal }); gr.calibration[t] = x; process.stderr.write(`[${A.name}] calib ${graph} threads=${t}: ${JSON.stringify(Object.fromEntries(Object.entries(x.classes).map(([k, v]) => [k, v.median_ms])))}\n`); }
    gr.best_threads = {};
    for (const cls of classesOf(plan, A.name, graph)) {
      const m = cand.map((t) => [t, gr.calibration[t].classes[cls.key].median_ms]);
      const lo = Math.min(...m.map((x) => x[1]));
      gr.best_threads[cls.key] = m.find((x) => x[1] <= lo * 1.03)[0];
    }
    save(A.name + '.partial.json');
    for (const cls of classesOf(plan, A.name, graph)) {
      const key = graph + '/' + cls.key;
      const settings = [...new Set([1, gr.best_threads[cls.key]])];
      const c = { graph, cls: cls.key, kind: cls.kind, config_hash: cls.config_hash || null, role: cls.role, best_threads: gr.best_threads[cls.key], by_threads: {} };
      res.classes[key] = c;
      for (const t of settings) {
        const w = child(file, 'warm', { graph, cls: cls.key, store, threads: t, n });
        process.stderr.write(`[${A.name}] ${key} threads=${t} warm ${w.warm.median_ms}/${w.warm.p95_ms} ms, uncached ${w.warm_uncached.median_ms}, stmts ${w.breakdown.statements.median}\n`);
        const cold = [];
        for (let i = 0; i < coldN && i < w.items; i++) cold.push(child(file, 'cold', { graph, cls: cls.key, store, threads: t, index: i }));
        const coldOut = {
          n: cold.length,
          cold: stats(cold.map((x) => x.cold_ms)), open: stats(cold.map((x) => x.open_ms)), first_call: stats(cold.map((x) => x.first_call_ms)),
          client_load: stats(cold.map((x) => x.client_load_ms)), facts_load_not_counted: stats(cold.map((x) => x.facts_load_ms)),
          process_start_to_main: stats(cold.map((x) => x.process_start_to_main_ms)), process_spawn_to_exit: stats(cold.map((x) => x._spawn_wall_ms)),
          hashes_equal_warm: cold.every((x, i) => JSON.stringify(x.hash) === JSON.stringify(w.hashes[i])),
        };
        process.stderr.write(`[${A.name}] ${key} threads=${t} cold ${coldOut.cold.median_ms}/${coldOut.cold.p95_ms} ms over ${cold.length}\n`);
        c.by_threads[t] = { ...w, cold: coldOut };
      }
      save(A.name + '.partial.json');
    }
  }
  if (A.ipc) {
    res.harness_ipc = {};
    for (const graph of ['tune', 'frozen']) res.harness_ipc[graph] = child(file, 'ipc', { graph, n, root: path.join(STORE_ROOT, A.name, graph) });
  }
  res.host_end = hostInfo();
  save(A.name + '.json');
  try { fs.rmSync(path.join(OUT, A.name + '.partial.json')); } catch (e) { /* none */ }
  process.stderr.write(`[${A.name}] wrote ${path.join(OUT, A.name + '.json')}\n`);
}

async function main(A, file) {
  const [mode, op, json] = process.argv.slice(2);
  try {
    if (mode === 'child') await childMain(A, op, JSON.parse(json || '{}'));
    else if (mode === 'run') await orchestrate(A, file);
    else throw new Error('usage: node bench/' + A.name + '.js run   (children: child <op> <json>)');
  } catch (e) { console.error(e && e.stack ? e.stack : e); process.exit(1); }
}

module.exports = { main, makeInstr, countStmts, timed, asRanked, stats, statsPlain, median, pctile, r3, now, mulberry32, shuffle, rankedHashes, tqHash, normText, textStats, storeFiles, hostInfo, readPlan, graphFacts, LABELS, BUILD, OUT, PLAN_FILE, STORE_ROOT, REPS, P, C };
