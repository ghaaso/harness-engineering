'use strict';
// Engine bench: the LadybugDB graph arm (@ladybugdb/core 0.22.3, algo extension). Driver: bench/lib.js.
//   node bench/ladybug.js run
// The arm's own code (arms/ladybug/store.js, lb.js, tq.js) answers every query, unchanged. The bench
// opens the store in its own process (the arm's in-process form, as arms/ladybug/arm.js openInProc),
// so engine time and application code can be told apart without the IPC hop; the harness's default
// child-process form is measured separately (op "ipc": the round trip per ranking).
const fs = require('fs');
const os = require('os');
const path = require('path');
const L = require('./lib');

let M = null;
function load() {
  if (!M) M = { lbug: require('@ladybugdb/core'), S: require('../arms/ladybug/store'), lb: require('../arms/ladybug/lb'), tq: require('../arms/ladybug/tq'), facts: require('../arms/common/facts') };
  return M;
}

const A = {
  name: 'ladybug',
  label: 'LadybugDB (@ladybugdb/core, algo extension), graph arm',
  needsGraph: true, // LbGraph reads the canonical graph (kinds, node files, node count) besides the store
  load,
  version() { const p = path.join(path.dirname(require.resolve('@ladybugdb/core')), 'package.json'); return 'LadybugDB ' + JSON.parse(fs.readFileSync(p, 'utf8')).version + ' (@ladybugdb/core, Node ' + process.version + ')'; },
  threadKnob: 'CALL threads=T on the connection (arms/ladybug/store.js open), read back with CALL current_setting(\'threads\'). The arm runs 1 thread per query by default (LB_THREADS).',
  how: 'In process (as the arm\'s openInProc), synchronous client: one Database (1 GiB buffer pool, maxDBSize 4 GiB) and one Connection; CALL var_length_extend_max_depth=10000. Ranking = arms/ladybug/lb.js LbGraph.rank with pprImpl "app" (the arm default); TQ = arms/ladybug/tq.js answer. Statements = LbGraph.q calls (one Cypher query each, prepared once per constant text, else querySync with literals).',
  caches: [
    { name: 'PageRank transition CSR (cache key tr|...)', where: 'application code (JavaScript arrays in LbGraph.cache), filled by one Cypher query per (direction, classes, co-change weight, hub)', classes: ['S1', 'base', 'S2'], dropped_in_warm_uncached: true },
    { name: 'blocked-node sets (cache key blk|...)', where: 'application code (LbGraph.cache)', classes: [], note: 'no timed class uses a hub cut', dropped_in_warm_uncached: true },
    { name: 'prepared statements (LbGraph.ps, at most 48 texts)', where: 'application code holds the handles; each pins buffer-pool pages in the engine', classes: ['all'], dropped_in_warm_uncached: false, note: 'kept in warm_uncached (dropping them would pin more pool pages per re-prepare); empty only in a cold sample' },
    { name: 'buffer pool (1 GiB)', where: 'engine', classes: ['all'], dropped_in_warm_uncached: false, note: 'engine-internal; empty only in a cold sample' },
    { name: 'stored community prior (N.comm, from arms/ladybug/priors/<canonical hash>.json)', where: 'stored in the database at build time (not a runtime cache)', classes: ['S2'], dropped_in_warm_uncached: false },
  ],
  notComparable: [
    'PageRank (S1, base and the PageRank part of S2) iterates in application code over a transition CSR cached in application code; the engine only supplies the arcs. warm_uncached drops that CSR before every call.',
    'The harness runs this arm in a child process per store; the bench times it in process, and reports the IPC round trip per ranking of the harness form separately (harness_ipc).',
    'The store build includes the native priors (page_rank, k-core, Louvain; the community grouping is then read from the stored prior file) and a CSV export of the canonical graph.',
    'One thread per query is the arm default; small queries were slower with many threads (arms/ladybug/NOTES.md).',
  ],
  async build(G, root) {
    const { S, facts } = load();
    const dir = S.storeDir(G, root);
    // the build must read the community prior of this canonical graph, never compute and write one
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-canon-'));
    let hash;
    try { hash = facts.exportCanon(G, tmp).hash; } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
    if (!fs.existsSync(S.priorFile(hash, 0))) throw new Error('no community prior file for canonical hash ' + hash + ': the bench refuses to write one into arms/ladybug/priors');
    fs.mkdirSync(root, { recursive: true });
    const t = L.now(); const meta = S.build(G, dir); const ms = L.now() - t;
    if (!meta.comm || !/file/.test(String(meta.comm.source || JSON.stringify(meta.comm)))) process.stderr.write('[ladybug] note: community prior info ' + JSON.stringify(meta.comm).slice(0, 200) + '\n');
    return { build_ms: ms, parts: { ...meta.build, comm: meta.comm, canon_hash: meta.canon_hash }, store: dir, build_threads: 'engine default for the build connection (no CALL threads in store.js build)' };
  },
  async open({ G, root, threads }) {
    const { S, lb, tq } = load();
    const st = S.open(G, root, { threads });
    const g = new lb.LbGraph(st, G, { pprImpl: 'app' });
    const I = L.makeInstr();
    const orig = lb.LbGraph.prototype.q;
    g.q = function q(text, params) { return I.sync(() => orig.call(g, text, params), text); };
    return {
      instr: I,
      rank: (ids, cfg, seed) => g.rank(ids, cfg, seed),
      tq: (q) => tq.answer(g, q),
      drop: () => g.dropAppCache(),
      noop: () => g.q('RETURN 1 AS x'),
      // runtime thread switch (bench/interleaved.js keeps one warm worker per engine and graph; a
      // LadybugDB store opened read-write admits one process, so the worker cannot be duplicated per T)
      setThreads(T) { st.conn.querySync('CALL threads=' + T); },
      readback() {
        try { return { threads: S.getAll(st.conn.querySync("CALL current_setting('threads') RETURN *")) }; } catch (e) { return { threads: 'readback failed: ' + String(e.message).slice(0, 120) }; }
      },
      close() { g.ps.clear(); g.cache.clear(); st.conn.closeSync(); st.db.closeSync(); },
    };
  },
  // the harness form (arms/ladybug/arm.js default: one child process per store, IPC per ranking)
  async ipc(a, U) {
    process.env.LB_THREADS = '1'; process.env.LB_PPR = 'app'; delete process.env.LB_INPROC;
    const plan = U.readPlan(); const { G } = U.graphFacts(plan.graphs[a.graph].sha);
    const arm = require('../arms/ladybug/arm');
    const h = await arm.open(G, { store: a.root });
    const out = {};
    for (const cls of U.classesOf(plan, 'ladybug', a.graph).filter((c) => c.kind === 'rank')) {
      const items = U.itemsOf(plan, a.graph, cls, a.n);
      for (const x of items) await h.rank(x.ids, cls.config, x.seed);
      const wall = []; const eng = []; const ipc = [];
      for (const x of items) { const t = L.now(); const r = await h.rank(x.ids, cls.config, x.seed); const w = L.now() - t; wall.push(w); eng.push(r.engine_ms); ipc.push(w - r.engine_ms); }
      out[cls.key] = { harness_wall: U.stats(wall), child_rank_ms: U.stats(eng), ipc_roundtrip: U.stats(ipc) };
    }
    await h.close();
    return { graph: a.graph, threads: 1, note: 'the arm as the harness runs it: rank() in a child process (structured-clone IPC); harness_wall = await rank() in the parent; child_rank_ms = the engine_ms the child measured around LbGraph.rank; ipc_roundtrip = the difference (message, serialisation of the ranked list, event loop)', classes: out };
  },
};

module.exports = A;
if (require.main === module) L.main(A, __filename);
