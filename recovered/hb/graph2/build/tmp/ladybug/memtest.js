// RSS across many arm open/close cycles (does a closed store release its memory?)
const H = require('/build/arms/common/harness');
const C = require('/build/arms/common/config');
const { graphFor, openArm } = require('/build/arms/common/arms');
const LS = require('/build/arms/ladybug/sweep');
(async () => {
  const tasks = H.loadTasks(['T1', 'T2'], 'tune');
  const parents = [...new Set(tasks.map((t) => t.parent))].sort().slice(0, Number(process.env.NP || 20));
  const cfgs = LS.STAGE1.slice(0, 12).map((c) => C.normalise(c));
  for (const p of parents) {
    const G = graphFor(p); const a = await openArm('ladybug', G);
    for (const t of tasks.filter((x) => x.parent === p).slice(0, 5)) { const sm = H.mapSeed(G, t.seed); if (sm.ids.length) for (const c of cfgs) await a.rank(sm.ids, c, t.seed); }
    await a.close();
    if (global.gc && process.env.GC) global.gc();
    const m = process.memoryUsage();
    console.log(p.slice(0, 8), 'rss', Math.round(m.rss / 1048576), 'heap', Math.round(m.heapUsed / 1048576), 'ext', Math.round(m.external / 1048576));
  }
})();
